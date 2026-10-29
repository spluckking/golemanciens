import { createRng, randInt } from '../core/rng';
import type { MonsterSpecies } from '../data/creatures';
import { Block, Tile, type TileId } from './blocks';
import { buildBridge, buildLair, buildMossRuins, buildTreeVillage, type BrokenBridge, type LairPlan, type MossPlan, type TreeVillagePlan } from './forestStructures';
import type { Camp, Decoration, Point2, WorldLayout } from './layout';
import { Noise2D } from './noise';
import { buildArena, type ArenaPlan } from './structures';
import { VoxelWorld, WORLD_HEIGHT } from './voxelWorld';

/**
 * Forêt Murmurante (chapitre 2) : très grands arbres, lumière filtrée, ruisseau, Cabanes des
 * Cimes reliées par des passerelles, sanctuaire de Mousse, arène et repaire de la Reine Araignée.
 */

export const FOREST_SIZE = 128;
export const FOREST_SEED = 20261102;
const SKY_COLOR = 0x8ec4a6;
/** Arche de retour vers l'Académie : au sud de la forêt, tournée vers le nord. */
const ARCH = { x: 64.5, z: 114.5, facing: 0 };
const BASE_Y = 10;

type ForestLandmark = 'village' | 'sanctuary' | 'arena' | 'bossLair';
const PADS: Record<ForestLandmark, Point2 & { r: number }> = {
  village: { x: 40, z: 60, r: 16 },
  sanctuary: { x: 104, z: 30, r: 10 },
  arena: { x: 98, z: 92, r: 9 },
  bossLair: { x: 24, z: 20, r: 11 },
};

/** Camps de la phase 2 (1 ou 2 monstres) : les loups près du ruisseau sont ceux de la quête R3. */
export const WOLVES_CAMP = 'foret-loups';
const CAMP_SPOTS: { id: string; x: number; z: number; monsters: MonsterSpecies[] }[] = [
  { id: WOLVES_CAMP, x: 70, z: 74, monsters: ['wolf', 'wolf'] },
  { id: 'foret-squelettes', x: 84, z: 50, monsters: ['skeleton', 'skeleton'] },
  { id: 'foret-champignons', x: 18, z: 92, monsters: ['hopper', 'hopper'] },
  { id: 'foret-mixte', x: 112, z: 64, monsters: ['wolf', 'skeleton'] },
];
const CRATE_COUNT = 20;

export interface ForestLayout extends WorldLayout {
  id: 'foret';
  landmarks: Record<ForestLandmark, Point2>;
  village: TreeVillagePlan;
  /** Pont du chemin principal, intact, et pont cassé de Tilleul (quête R2). */
  brokenBridge: BrokenBridge;
  arena: ArenaPlan;
  lair: LairPlan;
  sanctuary: MossPlan & { center: Point2 };
  /** Rune d'éveil cachée (SPEC § 4.3) : dans un creux entre les racines, au fond de la forêt. */
  rune: Point2;
  /** Champignons de la quête O1 : les bleus comptent, les rouges non. */
  mushrooms: { blue: Point2[]; red: Point2[] };
  /** Toiles qui barrent le sentier du repaire (quête P2). */
  webs: Point2[];
  /** Vieilles caisses de la quête « Le pont cassé » : chacune cache une planche. */
  plankCrates: Point2[];
}

/** Grand arbre : tronc de 2×2, large feuillage étagé. */
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

/** Le ruisseau traverse la forêt d'ouest en est, en serpentant. */
export function streamZ(x: number): number {
  return 84 + 4 * Math.sin(x / 14);
}

function dist(a: Point2, x: number, z: number): number {
  return Math.hypot(x - a.x, z - a.z);
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function generateForest(seed = FOREST_SEED): ForestLayout {
  const size = FOREST_SIZE;
  const world = new VoxelWorld(size, WORLD_HEIGHT, size);
  const noise = new Noise2D(seed);
  const rng = createRng(seed ^ 0x5eed);

  // Relief doux, aplani autour des lieux importants ; le ruisseau creuse un bloc.
  const flat: (Point2 & { r: number })[] = [...Object.values(PADS), { x: ARCH.x, z: ARCH.z - 4, r: 9 }];
  const heights = new Int32Array(size * size);
  for (let z = 0; z < size; z++)
    for (let x = 0; x < size; x++) {
      let h = BASE_Y + noise.fbm(x / 36, z / 36, 3) * 3;
      const edge = Math.min(x, z, size - 1 - x, size - 1 - z);
      if (edge < 7) h += (7 - edge) * 1.2;
      for (const p of flat) h = h + (BASE_Y - h) * (1 - smoothstep(p.r, p.r + 8, dist(p, x, z)));
      let hi = Math.round(h);
      if (Math.abs(z - streamZ(x)) < 1.6) hi = BASE_Y - 1;
      heights[z * size + x] = hi;
    }
  for (let z = 0; z < size; z++)
    for (let x = 0; x < size; x++) {
      const h = heights[z * size + x];
      const inStream = Math.abs(z - streamZ(x)) < 1.6;
      for (let y = 0; y < h; y++) world.set(x, y, z, y === h - 1 ? (inStream ? Block.Sand : Block.Grass) : y >= h - 3 ? Block.Dirt : Block.Stone);
      // Ruisseau peu profond : un bloc d'eau, on le traverse à pied.
      if (inStream) world.set(x, h, z, Block.Water);
    }

  // Chemins de terre battue entre l'arche, le village et les autres lieux.
  const pathLines: Point2[][] = [
    [{ x: ARCH.x, z: ARCH.z - 4 }, { x: 56, z: 92 }, { x: 44, z: 72 }, { x: PADS.village.x, z: PADS.village.z }],
    [{ x: PADS.village.x, z: PADS.village.z }, { x: 70, z: 44 }, { x: PADS.sanctuary.x - 9, z: PADS.sanctuary.z }],
    [{ x: 70, z: 44 }, { x: 90, z: 70 }, { x: PADS.arena.x - 2, z: PADS.arena.z - 9 }],
    [{ x: PADS.village.x - 4, z: PADS.village.z - 6 }, { x: 30, z: 36 }, { x: PADS.bossLair.x + 6, z: PADS.bossLair.z + 7 }],
  ];
  const onPath = new Uint8Array(size * size);
  for (const line of pathLines)
    for (let k = 0; k < line.length - 1; k++) {
      const a = line[k];
      const b = line[k + 1];
      const steps = Math.ceil(dist(a, b.x, b.z) * 2);
      for (let s = 0; s <= steps; s++) {
        const px = a.x + ((b.x - a.x) * s) / steps;
        const pz = a.z + ((b.z - a.z) * s) / steps;
        for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) {
          const x = Math.round(px) + dx;
          const z = Math.round(pz) + dz;
          if (x < 1 || z < 1 || x >= size - 1 || z >= size - 1) continue;
          onPath[z * size + x] = 1;
          const top = heights[z * size + x] - 1;
          if (world.get(x, top, z) === Block.Grass) world.set(x, top, z, Block.Path);
        }
      }
    }

  // Ponts : celui du chemin principal, et le pont cassé de Tilleul plus à l'ouest.
  const bridgeAt = (x: number): { z0: number; z1: number } => {
    const zc = Math.round(streamZ(x));
    return { z0: zc - 2, z1: zc + 2 };
  };
  const main = bridgeAt(50);
  buildBridge(world, 50, main.z0, main.z1, BASE_Y - 1, false);
  const tx = 26;
  const tb = bridgeAt(tx);
  const gap = buildBridge(world, tx, tb.z0, tb.z1, BASE_Y - 1, true);
  const brokenBridge: BrokenBridge = { gap, x: tx + 1, z: (tb.z0 + tb.z1) / 2 + 0.5 };

  // Lieux.
  const village = buildTreeVillage(world, PADS.village.x, PADS.village.z, BASE_Y);
  village.npcs.push({ id: 'tilleul', x: tx - 1.5, z: tb.z0 - 1.5, facing: Math.PI });
  const arena = buildArena(world, PADS.arena.x, PADS.arena.z, BASE_Y);
  const lair = buildLair(world, PADS.bossLair.x, PADS.bossLair.z, BASE_Y);
  const ruins = buildMossRuins(world, PADS.sanctuary.x, PADS.sanctuary.z, BASE_Y);

  // Camps : sol piétiné.
  for (const c of CAMP_SPOTS)
    for (let dx = -3; dx <= 3; dx++)
      for (let dz = -3; dz <= 3; dz++) {
        if (dx * dx + dz * dz > 10) continue;
        const top = heights[(c.z + dz) * size + (c.x + dx)] - 1;
        if (world.get(c.x + dx, top, c.z + dz) === Block.Grass) world.set(c.x + dx, top, c.z + dz, Block.Dirt);
      }

  // Grands arbres, espacés, hors des lieux, des chemins, du ruisseau et des camps.
  const keepClear: (Point2 & { r: number })[] = [
    ...Object.values(PADS).map((p) => ({ ...p, r: p.r + 3 })),
    ...CAMP_SPOTS.map((c) => ({ x: c.x, z: c.z, r: 6 })),
    { x: ARCH.x, z: ARCH.z - 4, r: 12 },
    { x: tx, z: tb.z0, r: 6 },
  ];
  const isClear = (x: number, z: number): boolean => {
    if (x < 5 || z < 5 || x > size - 7 || z > size - 7) return false;
    if (Math.abs(z - streamZ(x)) < 5) return false;
    for (const c of keepClear) if (dist(c, x, z) < c.r) return false;
    for (let dx = -3; dx <= 4; dx++) for (let dz = -3; dz <= 4; dz++) if (onPath[(z + dz) * size + (x + dx)]) return false;
    return true;
  };
  const trees: Point2[] = [];
  for (let attempt = 0; attempt < 900 && trees.length < 55; attempt++) {
    const x = randInt(rng, 5, size - 7);
    const z = randInt(rng, 5, size - 7);
    if (!isClear(x, z)) continue;
    if (trees.some((t) => Math.abs(t.x - x) < 8 && Math.abs(t.z - z) < 8)) continue;
    buildGiantTree(world, x, world.surfaceY(x, z), z, randInt(rng, 9, 13));
    trees.push({ x, z });
  }

  // Herbe, fougères et petits champignons décoratifs (instances).
  const decorations: Decoration[] = [];
  const decoTiles: TileId[] = [Tile.GrassTuft, Tile.GrassTuft, Tile.Fern, Tile.Fern, Tile.MushroomRed];
  for (let attempt = 0; attempt < 5000; attempt++) {
    const x = randInt(rng, 2, size - 3);
    const z = randInt(rng, 2, size - 3);
    if (onPath[z * size + x] || dist(PADS.village, x, z) < 7) continue;
    const y = world.surfaceY(x, z);
    if (world.get(x, y - 1, z) !== Block.Grass || world.get(x, y, z) !== Block.Air) continue;
    decorations.push({ x: x + 0.2 + rng() * 0.6, y, z: z + 0.2 + rng() * 0.6, tile: decoTiles[randInt(rng, 0, decoTiles.length - 1)] });
  }

  // Cases d'herbe libres pour les objets (caisses, champignons de quête, toiles, rune).
  const taken: Point2[] = [];
  const free = (x: number, z: number): boolean => {
    if (x < 3 || z < 3 || x > size - 4 || z > size - 4) return false;
    const y = world.surfaceY(x, z);
    const below = world.get(x, y - 1, z);
    if ((below !== Block.Grass && below !== Block.Path && below !== Block.Dirt) || world.get(x, y, z) !== Block.Air || world.get(x, y + 1, z) !== Block.Air) return false;
    return !taken.some((t) => Math.abs(t.x - x - 0.5) < 2 && Math.abs(t.z - z - 0.5) < 2);
  };
  const near = (wx: number, wz: number): Point2 => {
    for (let r = 0; r < 14; r++)
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          if (!free(wx + dx, wz + dz)) continue;
          const p = { x: wx + dx + 0.5, z: wz + dz + 0.5 };
          taken.push(p);
          return p;
        }
    throw new Error(`Pas de place libre près de (${wx}, ${wz})`);
  };

  const crates: ForestLayout['crates'] = [];
  for (let attempt = 0; attempt < 3000 && crates.length < CRATE_COUNT; attempt++) {
    const x = randInt(rng, 8, size - 9);
    const z = randInt(rng, 8, size - 9);
    if (onPath[z * size + x] || Math.abs(z - streamZ(x)) < 4 || !free(x, z)) continue;
    if (Object.values(PADS).some((p) => dist(p, x, z) < p.r + 2) || CAMP_SPOTS.some((c) => dist(c, x, z) < 5)) continue;
    if (crates.some((c) => dist(c, x, z) < 7)) continue;
    taken.push({ x: x + 0.5, z: z + 0.5 });
    crates.push({ id: `foret-caisse-${crates.length}`, x: x + 0.5, y: world.surfaceY(x, z), z: z + 0.5 });
  }

  const mushrooms = {
    blue: [near(58, 52), near(30, 70), near(76, 30), near(12, 52)],
    red: [near(50, 46), near(24, 64), near(66, 24), near(16, 44)],
  };
  const webs = [near(31, 39), near(29, 33), near(30, 27)];
  const rune = near(118, 112);
  village.pipLantern = near(Math.floor(village.pipLantern.x), Math.floor(village.pipLantern.z));

  const at = (p: Point2): { x: number; y: number; z: number } => ({ x: p.x, y: world.surfaceY(Math.floor(p.x), Math.floor(p.z)), z: p.z });
  // On sort de l'arche face à la forêt, assez loin pour que la caméra ne soit pas derrière elle.
  const arrival = { x: ARCH.x, z: ARCH.z - 8, facing: 0 };
  const camps: Camp[] = CAMP_SPOTS.map((c) => ({ ...c, chest: { x: c.x + 0.5, z: c.z - 2.5 } }));
  const plankCrates = [near(34, 74), near(60, 100), near(80, 40)];

  return {
    id: 'foret',
    world,
    sky: SKY_COLOR,
    spawn: at(arrival),
    spawnYaw: 0,
    decorations,
    safeZones: [{ x: PADS.village.x, z: PADS.village.z, r: PADS.village.r }],
    npcs: village.npcs,
    guardians: village.guardians,
    camps,
    plankCrates,
    crates,
    lanterns: [
      { id: 'foret-village', ...at(village.lantern) },
      { id: 'foret-sanctuaire', ...at({ x: ruins.entrance.x - 2, z: ruins.entrance.z + 2 }) },
      { id: 'foret-repaire', ...at({ x: PADS.bossLair.x + 9.5, z: PADS.bossLair.z + 12.5 }) },
      { id: 'foret-arche', ...at({ x: ARCH.x + 3.5, z: ARCH.z - 1.5 }) },
    ],
    arch: ARCH,
    arrival,
    landmarks: { village: PADS.village, sanctuary: PADS.sanctuary, arena: PADS.arena, bossLair: PADS.bossLair },
    village,
    brokenBridge,
    arena,
    lair,
    sanctuary: { center: PADS.sanctuary, ...ruins },
    rune,
    mushrooms,
    webs,
  };
}
