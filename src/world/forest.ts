import { createRng, randInt } from '../core/rng';
import { Block } from './blocks';
import type { Point2, WorldLayout } from './layout';
import { Noise2D } from './noise';
import { VoxelWorld, WORLD_HEIGHT } from './voxelWorld';

/**
 * Forêt Murmurante (chapitre 2). Sous-étape 2.1 : le relief, les grands arbres et l'arche de
 * retour ; le village perché, le sanctuaire, l'arène et le repaire arrivent à la sous-étape 2.2.
 */

export const FOREST_SIZE = 128;
export const FOREST_SEED = 20261102;
const SKY_COLOR = 0x8ec4a6;
/** Arche de retour vers l'Académie : au sud de la forêt, tournée vers le nord. */
const ARCH = { x: 64.5, z: 114.5, facing: 0 };

export interface ForestLayout extends WorldLayout {
  id: 'foret';
}

/** Grand arbre : tronc de 2×2, branches et large feuillage étagé. */
export function buildGiantTree(world: VoxelWorld, x: number, groundY: number, z: number, height: number): void {
  for (let y = 0; y < height; y++)
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) world.set(x + dx, groundY + y, z + dz, Block.Log);
  const top = groundY + height;
  const layers: [number, number][] = [[-3, 4], [-2, 4], [-1, 3], [0, 3], [1, 2]];
  for (const [dy, r] of layers) {
    const y = top + dy;
    if (y >= WORLD_HEIGHT) continue;
    for (let dx = -r; dx <= r + 1; dx++)
      for (let dz = -r; dz <= r + 1; dz++) {
        const cx = dx - 0.5;
        const cz = dz - 0.5;
        if (cx * cx + cz * cz > (r + 0.6) * (r + 0.6)) continue;
        if (world.get(x + dx, y, z + dz) === Block.Air) world.set(x + dx, y, z + dz, Block.Leaves);
      }
  }
}

function dist(a: Point2, x: number, z: number): number {
  return Math.hypot(x - a.x, z - a.z);
}

export function generateForest(seed = FOREST_SEED): ForestLayout {
  const size = FOREST_SIZE;
  const world = new VoxelWorld(size, WORLD_HEIGHT, size);
  const noise = new Noise2D(seed);
  const rng = createRng(seed ^ 0x5eed);

  for (let z = 0; z < size; z++)
    for (let x = 0; x < size; x++) {
      let h = 10 + noise.fbm(x / 36, z / 36, 3) * 3;
      const edge = Math.min(x, z, size - 1 - x, size - 1 - z);
      if (edge < 7) h += (7 - edge) * 1.2;
      // Une clairière plate autour de l'arche.
      const d = dist(ARCH, x, z);
      if (d < 12) h = h + (10 - h) * (1 - Math.max(0, d - 6) / 6);
      const hi = Math.round(h);
      for (let y = 0; y < hi; y++) world.set(x, y, z, y === hi - 1 ? Block.Grass : y >= hi - 3 ? Block.Dirt : Block.Stone);
    }

  // Grands arbres, espacés, hors de la clairière.
  const trees: Point2[] = [];
  for (let attempt = 0; attempt < 600 && trees.length < 45; attempt++) {
    const x = randInt(rng, 6, size - 8);
    const z = randInt(rng, 6, size - 8);
    if (dist(ARCH, x, z) < 14) continue;
    if (trees.some((t) => Math.abs(t.x - x) < 9 && Math.abs(t.z - z) < 9)) continue;
    buildGiantTree(world, x, world.surfaceY(x, z), z, randInt(rng, 9, 12));
    trees.push({ x, z });
  }

  // On sort de l'arche face à la forêt, assez loin pour que la caméra ne soit pas derrière elle.
  const arrival = { x: ARCH.x, z: ARCH.z - 8, facing: 0 };
  const at = (p: Point2): { x: number; y: number; z: number } => ({ x: p.x, y: world.surfaceY(Math.floor(p.x), Math.floor(p.z)), z: p.z });
  return {
    id: 'foret',
    world,
    sky: SKY_COLOR,
    spawn: at(arrival),
    spawnYaw: 0,
    decorations: [],
    safeZones: [],
    npcs: [],
    guardians: [],
    camps: [],
    crates: [],
    lanterns: [{ id: 'foret-arche', ...at({ x: ARCH.x + 3.5, z: ARCH.z - 1.5 }) }],
    arch: ARCH,
    arrival,
  };
}
