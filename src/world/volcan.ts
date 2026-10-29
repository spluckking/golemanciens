import { createRng, randInt } from '../core/rng';
import type { MonsterSpecies } from '../data/creatures';
import { Block, Tile } from './blocks';
import type { Camp, Decoration, Point2, WorldLayout } from './layout';
import { Noise2D } from './noise';
import type { FightStage } from './structures';
import { VoxelWorld, WORLD_HEIGHT } from './voxelWorld';

/**
 * Volcan d'Ombre (finale) : une plaine de cendre traversée de rivières de lave, trois groupes de
 * gardiens sur le chemin, un lac de lave franchi par le pont de pierre noire, et le cratère où
 * attend le Dragon d'Ombre. La lave ne blesse pas : elle fait reculer.
 */

export const VOLCAN_SIZE = 96;
export const VOLCAN_SEED = 20261106;
const SKY_COLOR = 0x5a3a44;
const ARCH = { x: 48.5, z: 88.5, facing: 0 };
const BASE_Y = 10;
const CRATER = { x: 48, z: 22, r: 12 };
const LAKE = { z0: 36, z1: 45 };

/** Les trois groupes de gardiens du chemin (monstres de la phase 5, renforcés). */
export const VOLCAN_CAMPS: { id: string; x: number; z: number; monsters: MonsterSpecies[] }[] = [
  { id: 'volcan-gardiens-1', x: 48, z: 72, monsters: ['darkKnight', 'harpy'] },
  { id: 'volcan-gardiens-2', x: 40, z: 60, monsters: ['jellyfish', 'darkKnight', 'harpy'] },
  { id: 'volcan-gardiens-3', x: 54, z: 50, monsters: ['darkKnight', 'darkKnight', 'jellyfish'] },
];
/** Les gardiens du volcan sont plus forts que ceux de l'Île Céleste (PV et ATQ). */
export const VOLCAN_STRENGTH = 1.25;

export interface VolcanLayout extends WorldLayout {
  id: 'volcan';
  crater: FightStage & { boss: Point2; r: number };
  /** Le pont de pierre noire, du bord sud du lac de lave à la porte du cratère. */
  bridge: { x: number; z0: number; z1: number };
  path: Point2[];
}

function dist(a: Point2, x: number, z: number): number {
  return Math.hypot(x - a.x, z - a.z);
}

export function generateVolcan(seed = VOLCAN_SEED): VolcanLayout {
  const size = VOLCAN_SIZE;
  const world = new VoxelWorld(size, WORLD_HEIGHT, size);
  const noise = new Noise2D(seed);
  const rng = createRng(seed ^ 0x5eed);

  // Plaine de cendre, plus haute sur les bords ; le cône du volcan au nord, autour du cratère.
  for (let z = 0; z < size; z++)
    for (let x = 0; x < size; x++) {
      let h = BASE_Y + noise.fbm(x / 18, z / 18, 2) * 1.2;
      const edge = Math.min(x, z, size - 1 - x, size - 1 - z);
      if (edge < 8) h += (8 - edge) * 1.8;
      const dc = dist(CRATER, x, z);
      if (dc < CRATER.r + 10 && dc >= CRATER.r) h = Math.max(h, BASE_Y + (CRATER.r + 10 - dc) * 1.3);
      const top = Math.round(h);
      for (let y = 0; y < top; y++) world.set(x, y, z, y === top - 1 ? Block.Ash : Block.Basalt);
    }

  // Le cratère : un fond plat de roche noire, cerclé d'une muraille ; la porte au sud.
  for (let dz = -CRATER.r; dz <= CRATER.r; dz++)
    for (let dx = -CRATER.r; dx <= CRATER.r; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > CRATER.r) continue;
      const x = CRATER.x + dx;
      const z = CRATER.z + dz;
      for (let y = BASE_Y; y < WORLD_HEIGHT; y++) world.set(x, y, z, Block.Air);
      world.set(x, BASE_Y - 1, z, d < 3 ? Block.Lava : Block.Basalt);
      if (d > CRATER.r - 1.2) for (let h = 0; h < 6; h++) world.set(x, BASE_Y + h, z, Block.Basalt);
    }
  // La porte du cratère, en face du pont.
  for (let dx = -1; dx <= 1; dx++)
    for (let z = CRATER.z + CRATER.r - 2; z <= CRATER.z + CRATER.r + 10; z++)
      for (let h = 0; h < 4; h++) world.set(CRATER.x + dx, BASE_Y + h, z, Block.Air);
  for (let dx = -1; dx <= 1; dx++) for (let z = CRATER.z + CRATER.r - 2; z <= CRATER.z + CRATER.r + 10; z++) world.set(CRATER.x + dx, BASE_Y - 1, z, Block.Basalt);

  // Le lac de lave, d'un bord à l'autre, et le pont de pierre noire qui le traverse.
  for (let z = LAKE.z0; z <= LAKE.z1; z++)
    for (let x = 8; x < size - 8; x++) {
      for (let h = 0; h < 6; h++) world.set(x, BASE_Y + h, z, Block.Air);
      world.set(x, BASE_Y - 1, z, Block.Lava);
      world.set(x, BASE_Y - 2, z, Block.Basalt);
    }
  const bridge = { x: CRATER.x, z0: LAKE.z0 - 1, z1: LAKE.z1 + 1 };
  for (let z = bridge.z0; z <= bridge.z1; z++)
    for (let dx = -1; dx <= 1; dx++) {
      world.set(CRATER.x + dx, BASE_Y - 1, z, Block.Basalt);
      // Un petit muret de chaque côté, tous les deux blocs.
      if (Math.abs(dx) === 1 && z % 2 === 0) world.set(CRATER.x + dx * 2, BASE_Y - 1, z, Block.Basalt);
    }

  // Le chemin de cendre tassée, de l'arche aux trois camps puis au pont.
  const path: Point2[] = [{ x: ARCH.x, z: ARCH.z - 4 }, ...VOLCAN_CAMPS.map((c) => ({ x: c.x, z: c.z })), { x: CRATER.x, z: LAKE.z1 + 2 }];
  const onPath = new Uint8Array(size * size);
  for (let k = 0; k < path.length - 1; k++) {
    const a = path[k];
    const b = path[k + 1];
    const steps = Math.ceil(dist(a, b.x, b.z) * 2);
    for (let s = 0; s <= steps; s++) {
      const px = Math.round(a.x + ((b.x - a.x) * s) / steps);
      const pz = Math.round(a.z + ((b.z - a.z) * s) / steps);
      for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [-1, 0]]) {
        const x = px + dx;
        const z = pz + dz;
        onPath[z * size + x] = 1;
        const top = world.surfaceY(x, z) - 1;
        if (world.get(x, top, z) === Block.Ash) world.set(x, top, z, Block.Path);
      }
    }
  }

  // Deux rivières de lave qui coupent la plaine (on les saute ou on les contourne par le chemin).
  for (const [x0, slope] of [[20, 0.35], [70, -0.3]] as const)
    for (let z = LAKE.z1 + 3; z < size - 10; z++) {
      const x = Math.round(x0 + (z - 60) * slope + Math.sin(z / 5) * 2);
      for (const dx of [0, 1]) {
        if (onPath[z * size + x + dx]) continue;
        const top = world.surfaceY(x + dx, z) - 1;
        if (top <= BASE_Y + 1) world.set(x + dx, top, z, Block.Lava);
      }
    }

  // Rochers noirs et touffes d'herbe brûlée.
  const decorations: Decoration[] = [];
  const keep = (x: number, z: number): boolean =>
    dist({ x: ARCH.x, z: ARCH.z - 4 }, x, z) < 8 || VOLCAN_CAMPS.some((c) => dist(c, x, z) < 5) || onPath[z * size + x] === 1 || (z >= LAKE.z0 - 2 && z <= LAKE.z1 + 2) || dist(CRATER, x, z) < CRATER.r + 2;
  for (let n = 0, attempt = 0; attempt < 600 && n < 40; attempt++) {
    const x = randInt(rng, 6, size - 7);
    const z = randInt(rng, 6, size - 7);
    if (keep(x, z)) continue;
    const y = world.surfaceY(x, z);
    if (world.get(x, y - 1, z) !== Block.Ash) continue;
    for (let h = 0; h < randInt(rng, 1, 3); h++) world.set(x, y + h, z, Block.Basalt);
    n++;
  }
  for (let attempt = 0; attempt < 800; attempt++) {
    const x = randInt(rng, 2, size - 3);
    const z = randInt(rng, 2, size - 3);
    if (keep(x, z)) continue;
    const y = world.surfaceY(x, z);
    if (world.get(x, y - 1, z) !== Block.Ash || world.get(x, y, z) !== Block.Air) continue;
    decorations.push({ x: x + 0.5, y, z: z + 0.5, tile: Tile.DeadBush });
  }

  const at = (p: Point2): { x: number; y: number; z: number } => ({ x: p.x, y: world.surfaceY(Math.floor(p.x), Math.floor(p.z)), z: p.z });
  const arrival = { x: ARCH.x, z: ARCH.z - 8, facing: 0 };
  const camps: Camp[] = VOLCAN_CAMPS.map((c) => ({ ...c, chest: { x: c.x + 3.5, z: c.z - 2.5 }, strength: VOLCAN_STRENGTH }));
  const crater = {
    boss: { x: CRATER.x + 0.5, z: CRATER.z - 1.5 },
    golemSpot: { x: CRATER.x + 3.5, z: CRATER.z + 2.5 },
    monsterSpot: { x: CRATER.x - 2.5, z: CRATER.z + 2.5 },
    center: { x: CRATER.x + 0.5, z: CRATER.z + 2.5 },
    floorY: BASE_Y,
    view: 1 as const,
    r: CRATER.r,
  };
  return {
    id: 'volcan',
    world,
    sky: SKY_COLOR,
    spawn: at(arrival),
    spawnYaw: 0,
    decorations,
    safeZones: [],
    npcs: [],
    guardians: [],
    camps,
    crates: [],
    lanterns: [
      { id: 'volcan-arche', ...at({ x: ARCH.x + 3.5, z: ARCH.z - 1.5 }) },
      { id: 'volcan-pont', ...at({ x: CRATER.x + 3.5, z: LAKE.z1 + 3.5 }) },
    ],
    arch: ARCH,
    arrival,
    crater,
    bridge,
    path,
  };
}
