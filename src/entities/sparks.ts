import * as THREE from 'three';
import type { SolidFn } from '../core/physics';

const SPARK_SPEED = 16;
const SPARK_LIFE = 0.6;
const MAX_SPARKS = 6;
const MAX_PARTICLES = 160;

interface Spark {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

/** Touche-t-on quelque chose en (x, y, z) ? Vrai = l'étincelle éclate. */
export type SparkHitTest = (x: number, y: number, z: number) => boolean;

/** Étincelles de la baguette et éclats de cubes (InstancedMesh). */
export class Sparks {
  readonly group = new THREE.Group();
  private readonly sparks: Spark[] = [];
  private readonly particles: Particle[] = [];
  private readonly burstMesh: THREE.InstancedMesh;
  private readonly sparkGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
  private readonly particleGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  private readonly sparkMat = new THREE.MeshBasicMaterial({ color: 0xbff8ff });
  private readonly particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  private readonly tmp = new THREE.Matrix4();
  private readonly color = new THREE.Color();

  constructor() {
    for (let i = 0; i < MAX_SPARKS; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, this.sparkMat);
      mesh.visible = false;
      this.group.add(mesh);
      this.sparks.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0 });
    }
    this.burstMesh = new THREE.InstancedMesh(this.particleGeo, this.particleMat, MAX_PARTICLES);
    this.burstMesh.count = 0;
    this.burstMesh.frustumCulled = false;
    this.group.add(this.burstMesh);
  }

  /** Lance une étincelle depuis (x, y, z) selon la direction (dx, dy, dz). */
  fire(x: number, y: number, z: number, dx: number, dy: number, dz: number): void {
    const s = this.sparks.find((sp) => sp.life <= 0);
    if (!s) return;
    const len = Math.hypot(dx, dy, dz) || 1;
    s.mesh.position.set(x, y, z);
    s.mesh.visible = true;
    s.vx = (dx / len) * SPARK_SPEED;
    s.vy = (dy / len) * SPARK_SPEED;
    s.vz = (dz / len) * SPARK_SPEED;
    s.life = SPARK_LIFE;
  }

  /** Nuage de petits cubes (impact, monstre vaincu, caisse cassée). */
  burst(x: number, y: number, z: number, color: number, count = 10, power = 1): void {
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (1.5 + Math.random() * 2.5) * power;
      const life = 0.45 + Math.random() * 0.25;
      this.particles.push({ x, y, z, vx: Math.cos(a) * sp, vy: (1 + Math.random() * 3) * power, vz: Math.sin(a) * sp, life, maxLife: life });
      const idx = this.particles.length - 1;
      this.burstMesh.setColorAt(idx, this.color.setHex(color));
    }
    if (this.burstMesh.instanceColor) this.burstMesh.instanceColor.needsUpdate = true;
  }

  update(dt: number, solid: SolidFn, hit: SparkHitTest): void {
    for (const s of this.sparks) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const p = s.mesh.position;
      p.x += s.vx * dt;
      p.y += s.vy * dt;
      p.z += s.vz * dt;
      s.mesh.rotation.x += dt * 12;
      s.mesh.rotation.y += dt * 9;
      if (hit(p.x, p.y, p.z) || solid(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)) || s.life <= 0) {
        s.life = 0;
        s.mesh.visible = false;
        this.burst(p.x, p.y, p.z, 0x8ff0ff, 8);
      }
    }
    let n = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy -= 12 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const k = p.life / p.maxLife;
      this.tmp.makeScale(k, k, k).setPosition(p.x, p.y, p.z);
      // Compacte : les particules vivantes restent en tête (avec leur couleur).
      if (n !== i) {
        this.particles[n] = p;
        this.burstMesh.getColorAt(i, this.color);
        this.burstMesh.setColorAt(n, this.color);
      }
      this.burstMesh.setMatrixAt(n++, this.tmp);
    }
    this.particles.length = n;
    this.burstMesh.count = n;
    this.burstMesh.instanceMatrix.needsUpdate = true;
    if (this.burstMesh.instanceColor) this.burstMesh.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    this.sparkGeo.dispose();
    this.particleGeo.dispose();
    this.sparkMat.dispose();
    this.particleMat.dispose();
  }
}
