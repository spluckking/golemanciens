import * as THREE from 'three';
import type { AttackType } from '../data/creatures';

const MAX_PIECES = 240;
/** Durée d'un effet d'attaque, en secondes (Ultime : plus long et plus riche). */
const FX_SECONDS = 0.75;
const ULTIMATE_SCALE = 1.5;

export interface FxPoint {
  x: number;
  y: number;
  z: number;
}

/** Un cube de l'effet : sa position et sa taille sont des fonctions de k (0 → 1 pendant sa vie). */
interface Piece {
  delay: number;
  life: number;
  age: number;
  color: number;
  at: (k: number, out: THREE.Vector3) => void;
  size: (k: number, out: THREE.Vector3) => void;
}

type Add = (delay: number, life: number, color: number, at: Piece['at'], size?: Piece['size']) => void;
type Recipe = (add: Add, from: FxPoint, to: FxPoint, n: number) => void;

const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const cube = (s: number): Piece['size'] => (_k, out) => out.setScalar(s);
/** Cube qui rétrécit à la fin de sa vie. */
const fading = (s: number): Piece['size'] => (k, out) => out.setScalar(s * Math.min(1, (1 - k) * 3));

/** Spirale autour de la cible : herbes, sable, vent. */
function spiral(add: Add, to: FxPoint, n: number, colors: readonly number[], turns: number, height: number, radius: (k: number) => number, size: number): void {
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    add((i / n) * 0.3, 0.55, colors[i % colors.length], (k, out) => {
      const a = a0 + k * turns * Math.PI * 2;
      const r = radius(k);
      out.set(to.x + Math.cos(a) * r, to.y + 0.1 + k * height + (i % 3) * 0.2, to.z + Math.sin(a) * r);
    }, fading(size));
  }
}

const RECIPES: Record<AttackType, Recipe> = {
  // Des blocs de pierre tombent du ciel.
  rock(add, _from, to, n) {
    for (let i = 0; i < n / 3; i++) {
      const x = to.x + rand(-0.9, 0.9);
      const z = to.z + rand(-0.8, 0.8);
      const y0 = to.y + rand(5, 7);
      const s = rand(0.35, 0.7);
      add(i * 0.05, 0.5, i % 2 ? 0x8f93a3 : 0xb4b7c4, (k, out) => out.set(x, Math.max(to.y + s / 2, y0 - (y0 - to.y) * k * k * 1.2), z), fading(s));
    }
  },
  // Des lianes jaillissent du sol et s'enroulent.
  plant(add, _from, to, n) {
    spiral(add, to, n, [0x4fa83c, 0x6fce52, 0x2f7a2a], 1.5, 2.2, (k) => 1 - k * 0.45, 0.22);
  },
  // Un rayon de lumière dorée descend sur la cible.
  sun(add, _from, to, n) {
    for (let i = 0; i < n; i++) {
      const dx = rand(-0.35, 0.35);
      const dz = rand(-0.35, 0.35);
      add((i / n) * 0.35, 0.3, i % 2 ? 0xffe27a : 0xfff6c8, (k, out) => out.set(to.x + dx, to.y + 7 * (1 - k) + 0.2, to.z + dz), cube(rand(0.16, 0.34)));
    }
  },
  // Un nuage violet enveloppe la cible.
  spore(add, _from, to, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const r = rand(0.5, 1.5);
      const h = rand(0.1, 2);
      add(rand(0, 0.25), 0.55, i % 3 ? 0xb07ae0 : 0xe0c8ff, (k, out) => out.set(to.x + Math.cos(a + k) * r * (0.4 + k), to.y + h + k * 0.4, to.z + Math.sin(a + k) * r * (0.4 + k)), (k, out) => out.setScalar(0.3 * Math.sin(k * Math.PI)));
    }
  },
  // Une tornade de sable.
  sand(add, _from, to, n) {
    spiral(add, to, n, [0xe0c080, 0xc8a05c, 0xf0dcac], 3, 2.8, (k) => 0.4 + k * 0.9, 0.17);
  },
  // Un éclair en zigzag, très bref.
  thunder(add, _from, to, n) {
    const bolts = Math.max(1, Math.round(n / 12));
    for (let b = 0; b < bolts; b++) {
      let x = to.x + rand(-0.3, 0.3);
      let z = to.z;
      for (let i = 0; i < 12; i++) {
        const px = x;
        const pz = z;
        const py = to.y + 7 - i * 0.6;
        add(b * 0.14 + i * 0.008, 0.26, i % 2 ? 0xfff060 : 0xffffff, (_k, out) => out.set(px, py, pz), (k, out) => out.set(0.2, 0.7, 0.2).multiplyScalar(1 - k * 0.6));
        x += rand(-0.45, 0.45);
        z += rand(-0.2, 0.2);
      }
    }
  },
  // Des pics de glace surgissent autour de la cible.
  ice(add, _from, to, n) {
    for (let i = 0; i < n / 2; i++) {
      const a = (i / (n / 2)) * Math.PI * 2;
      const r = rand(0.55, 1.1);
      const h = rand(1, 2.2);
      const x = to.x + Math.cos(a) * r;
      const z = to.z + Math.sin(a) * r;
      add(i * 0.012, 0.6, i % 2 ? 0x9fd8ff : 0xe4f6ff, (k, out) => out.set(x, to.y + (Math.min(1, k * 3) * h) / 2, z), (k, out) => {
        const grow = Math.min(1, k * 3);
        out.set(0.26, h * grow + 0.01, 0.26).multiplyScalar(k > 0.8 ? (1 - k) * 5 : 1);
      });
    }
  },
  // Des éclats de cristal filent vers la cible.
  crystal(add, from, to, n) {
    for (let i = 0; i < n / 2; i++) {
      const dy = rand(0.6, 1.8);
      const dz = rand(-0.6, 0.6);
      add(i * 0.03, 0.3, i % 2 ? 0xd8b0ff : 0xf4e8ff, (k, out) => out.set(from.x + (to.x - from.x) * k, from.y + dy, from.z + dz * (1 - k) + (to.z - from.z) * k), (_k, out) => out.set(0.5, 0.14, 0.14));
    }
  },
  // Une rafale de plumes et de feuilles traverse l'arène.
  wind(add, from, to, n) {
    for (let i = 0; i < n; i++) {
      const h = rand(0.3, 2.4);
      const dz = rand(-1, 1);
      const w = rand(0, 6);
      add((i / n) * 0.3, 0.42, i % 4 === 0 ? 0x8fd06c : 0xf0f6ff, (k, out) => out.set(from.x + (to.x - from.x) * k * 1.3, from.y + h + Math.sin(w + k * 8) * 0.25, from.z + dz + (to.z - from.z) * k), cube(0.13));
    }
  },
  // Un arc de cubes aux couleurs de l'arc-en-ciel.
  rainbow(add, from, to, n) {
    const colors = [0xe0453a, 0xff9a3c, 0xffe25a, 0x5ac45e, 0x4f8fe6, 0x9a5ad0];
    for (let i = 0; i < n; i++) {
      const band = i % colors.length;
      add((i / n) * 0.4, 0.34, colors[band], (k, out) => out.set(from.x + (to.x - from.x) * k, from.y + 1 + Math.sin(k * Math.PI) * (3 - band * 0.28), from.z + (to.z - from.z) * k), cube(0.24));
    }
  },
  // Une pluie d'étoiles filantes.
  star(add, _from, to, n) {
    for (let i = 0; i < n / 2; i++) {
      const x0 = to.x + rand(-1, 3);
      const z = to.z + rand(-1, 1);
      const y0 = to.y + rand(5, 8);
      add(rand(0, 0.35), 0.38, i % 2 ? 0xfff3a0 : 0xffffff, (k, out) => out.set(x0 - k * 2.4, Math.max(to.y + 0.2, y0 - (y0 - to.y) * k), z), (k, out) => out.setScalar(0.24 * (0.7 + 0.3 * Math.sin(k * 30))));
    }
  },
};

/**
 * Effets des combats au tour par tour : un seul InstancedMesh de petits cubes, donc un seul appel de
 * dessin. Chaque type d'attaque a sa propre mise en scène, décrite par des trajets calculés d'avance.
 */
export class AttackFx {
  readonly mesh: THREE.InstancedMesh;
  private readonly pieces: Piece[] = [];
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly scale = new THREE.Vector3();
  private readonly rotation = new THREE.Quaternion();
  private readonly color = new THREE.Color();

  constructor() {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_PIECES);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, this.color.setHex(0xffffff));
  }

  private readonly add: Add = (delay, life, color, at, size = cube(0.2)) => {
    if (this.pieces.length < MAX_PIECES) this.pieces.push({ delay, life, age: 0, color, at, size });
  };

  /** Lance l'effet d'une attaque ; retourne sa durée en secondes. */
  play(type: AttackType, from: FxPoint, to: FxPoint, ultimate = false): number {
    RECIPES[type](this.add, from, to, ultimate ? 60 : 36);
    return ultimate ? FX_SECONDS * ULTIMATE_SCALE : FX_SECONDS;
  }

  /** Pluie de cubes colorés de la victoire. */
  confetti(center: FxPoint, seconds: number): void {
    const colors = [0xffd25e, 0xe2604a, 0x67c95a, 0x7fe3ff, 0xc08ae8];
    for (let i = 0; i < 90; i++) {
      const x = center.x + rand(-5, 5);
      const z = center.z + rand(-3, 3);
      const y0 = center.y + rand(4, 7);
      const w = rand(0, 6);
      this.add(rand(0, seconds * 0.6), rand(1, 1.6), colors[i % colors.length], (k, out) => out.set(x + Math.sin(w + k * 6) * 0.4, y0 - k * y0, z), cube(0.16));
    }
  }

  update(dt: number): void {
    let count = 0;
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      p.age += dt;
      if (p.age < p.delay) continue;
      const k = (p.age - p.delay) / p.life;
      if (k >= 1) {
        this.pieces.splice(i, 1);
        continue;
      }
      p.at(k, this.position);
      p.size(k, this.scale);
      this.matrix.compose(this.position, this.rotation, this.scale);
      this.mesh.setMatrixAt(count, this.matrix);
      this.mesh.setColorAt(count, this.color.setHex(p.color));
      count++;
    }
    this.mesh.count = count;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  get active(): number {
    return this.pieces.length;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.dispose();
  }
}
