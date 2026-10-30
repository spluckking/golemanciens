import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Cube d'un modèle : taille [l, h, p], centre [x, y, z] relatif au pivot de la pièce, couleur. */
export type Cube = [w: number, h: number, d: number, x: number, y: number, z: number, color: number];

/** Pièce articulée : tous ses cubes sont fusionnés en un seul maillage (1 appel de dessin). */
export interface PartDef {
  name: string;
  pivot: [number, number, number];
  cubes: Cube[];
  parent?: string;
  /** Rotation de repos (radians). */
  rest?: [number, number, number];
  /** Pièce lumineuse (gemme, yeux, cristal) : non éclairée, elle brille même la nuit. */
  glow?: boolean;
}

export type ModelDef = PartDef[];

/** Matériaux partagés par tous les modèles en cubes (couleurs par sommet). */
/** Intensité des pièces lumineuses (HDR, avant le tone mapping). */
const GLOW_GAIN = 1.35;
let sharedMaterial: THREE.MeshLambertMaterial | null = null;
let glowMaterial: THREE.MeshBasicMaterial | null = null;
function material(glow: boolean): THREE.Material {
  // Pièces lumineuses (runes, cristaux, flammes, auras) : au-dessus de 1 en HDR, elles font briller le bloom.
  if (glow) return (glowMaterial ??= new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(GLOW_GAIN, GLOW_GAIN, GLOW_GAIN) }));
  return (sharedMaterial ??= new THREE.MeshLambertMaterial({ vertexColors: true }));
}

const geometryCache = new Map<PartDef, THREE.BufferGeometry>();
const tmpColor = new THREE.Color();

function partGeometry(part: PartDef): THREE.BufferGeometry {
  const cached = geometryCache.get(part);
  if (cached) return cached;
  const boxes = part.cubes.map(([w, h, d, x, y, z, color]) => {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    g.translate(x, y, z);
    tmpColor.setHex(color, THREE.SRGBColorSpace);
    const n = g.getAttribute('position').count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      // Léger assombrissement des faces latérales et du dessous, pour lire les volumes.
      const ny = g.getAttribute('normal').getY(i);
      const k = part.glow ? 1 : ny > 0.5 ? 1 : ny < -0.5 ? 0.7 : 0.88;
      colors[i * 3] = tmpColor.r * k;
      colors[i * 3 + 1] = tmpColor.g * k;
      colors[i * 3 + 2] = tmpColor.b * k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.deleteAttribute('uv');
    return g;
  });
  const merged = mergeGeometries(boxes, false);
  for (const b of boxes) b.dispose();
  if (!merged) throw new Error(`Pièce de modèle vide : ${part.name}`);
  merged.computeBoundingSphere();
  geometryCache.set(part, merged);
  return merged;
}

/** Instance d'un modèle : une racine et ses pièces articulées. */
export class CubeModel {
  readonly root = new THREE.Group();
  readonly parts = new Map<string, THREE.Group>();

  constructor(def: ModelDef, scale = 1) {
    for (const part of def) {
      const pivot = new THREE.Group();
      pivot.name = part.name;
      pivot.position.set(...part.pivot);
      if (part.rest) pivot.rotation.set(...part.rest);
      pivot.userData.rest = part.rest ?? [0, 0, 0];
      pivot.add(new THREE.Mesh(partGeometry(part), material(part.glow ?? false)));
      this.parts.set(part.name, pivot);
      const parent = part.parent ? this.parts.get(part.parent) : null;
      (parent ?? this.root).add(pivot);
    }
    this.root.scale.setScalar(scale);
  }

  part(name: string): THREE.Group | undefined {
    return this.parts.get(name);
  }

  /** Rotation X d'une pièce, ajoutée à sa rotation de repos. */
  swing(name: string, angle: number, axis: 'x' | 'z' = 'x'): void {
    const p = this.parts.get(name);
    if (!p) return;
    const rest = p.userData.rest as [number, number, number];
    if (axis === 'x') p.rotation.x = rest[0] + angle;
    else p.rotation.z = rest[2] + angle;
  }
}

/** Animation de marche générique : jambes et bras qui se balancent, petit rebond. */
export function animateWalk(model: CubeModel, phase: number, amount: number): void {
  const s = Math.sin(phase) * 0.7 * amount;
  model.swing('legL', s);
  model.swing('legR', -s);
  model.swing('armL', -s * 0.8);
  model.swing('armR', s * 0.8);
  const body = model.part('body');
  if (body) body.position.y = (body.userData.baseY ??= body.position.y) + Math.abs(Math.sin(phase)) * 0.05 * amount;
}
