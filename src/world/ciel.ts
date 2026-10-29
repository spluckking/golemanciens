import { createRng, randInt } from '../core/rng';
import type { MonsterSpecies } from '../data/creatures';
import { CLOUD_GRID, type CloudColor } from '../quests/skyPuzzles';
import { Block, Tile, type BlockId } from './blocks';
import type { Camp, Decoration, NpcSpot, Point2, Spot, WorldLayout } from './layout';
import { Noise2D } from './noise';
import { buildArena, type ArenaPlan, type Cell, type FightStage } from './structures';
import { VoxelWorld, WORLD_HEIGHT } from './voxelWorld';

/**
 * Île Céleste (chapitre 5) : des îles qui flottent au-dessus d'une mer de nuages, reliées par des
 * ponts arc-en-ciel. Le Village des Nuages, le sanctuaire des Vents (S5), l'arène, le phare, le
 * jardin des nuages, la plus haute tour et la tour noire du Griffon d'Ombre.
 */

export const CIEL_SIZE = 128;
export const CIEL_SEED = 20261105;
const SKY_COLOR = 0xa8d8ff;
const ARCH = { x: 64.5, z: 114.5, facing: 0 };
/** Hauteur du sol des îles (on s'y tient à SURFACE) ; en dessous de FALL_Y, on est tombé. */
export const CIEL_SURFACE = 16;
export const CIEL_FALL_Y = 10;

type CielLandmark = 'village' | 'sanctuary' | 'arena' | 'bossLair';

interface Island extends Point2 {
  r: number;
  top: BlockId;
}

const ISLANDS: Record<string, Island> = {
  arrival: { x: 64, z: 110, r: 10, top: Block.Grass },
  village: { x: 44, z: 72, r: 14, top: Block.Grass },
  sanctuary: { x: 100, z: 36, r: 20, top: Block.Marble },
  arena: { x: 98, z: 94, r: 11, top: Block.Grass },
  bossLair: { x: 24, z: 24, r: 12, top: Block.Grass },
  lighthouse: { x: 82, z: 64, r: 7, top: Block.Grass },
  garden: { x: 66, z: 44, r: 7, top: Block.Grass },
  tower: { x: 18, z: 70, r: 6, top: Block.Grass },
  harpies: { x: 74, z: 86, r: 7, top: Block.Grass },
  knights: { x: 40, z: 44, r: 7, top: Block.Grass },
  mixed: { x: 112, z: 66, r: 6, top: Block.Grass },
};

/** Ponts arc-en-ciel (3 de large) entre les îles. */
const BRIDGES: [string, string][] = [
  ['arrival', 'village'],
  ['village', 'knights'],
  ['knights', 'bossLair'],
  ['village', 'tower'],
  ['village', 'garden'],
  ['garden', 'sanctuary'],
  ['village', 'lighthouse'],
  ['lighthouse', 'mixed'],
  ['lighthouse', 'harpies'],
  ['harpies', 'arena'],
  ['arrival', 'harpies'],
];

/** Le camp des harpies (quête R3). */
export const HARPIES_CAMP = 'ciel-harpies';
const CAMP_SPOTS: { id: string; island: string; monsters: MonsterSpecies[] }[] = [
  { id: HARPIES_CAMP, island: 'harpies', monsters: ['harpy', 'harpy', 'harpy'] },
  { id: 'ciel-chevaliers', island: 'knights', monsters: ['darkKnight', 'darkKnight'] },
  { id: 'ciel-meduses', island: 'mixed', monsters: ['jellyfish', 'jellyfish'] },
  { id: 'ciel-mixte', island: 'arrival', monsters: ['harpy', 'jellyfish', 'darkKnight'] },
];
const CRATE_COUNT = 16;
const CLOUD_BLOCK: Record<CloudColor, BlockId> = {
  red: Block.CloudRed,
  orange: Block.CloudOrange,
  yellow: Block.CloudYellow,
  green: Block.CloudGreen,
  blue: Block.CloudBlue,
  violet: Block.CloudViolet,
};

/**
 * Plan du sanctuaire des Vents (S5), du sud au nord : le hall (première pierre), la salle des nuages
 * (six nuages de couleur au-dessus du vide, entre une plateforme de départ et une d'arrivée), la salle
 * de la balance à contrepoids (la herse), puis la dernière salle (seconde pierre et nid).
 */
export interface SkySanctuaryPlan {
  floorY: number;
  entrance: Point2;
  stone: Point2;
  /** Départ de la salle des nuages (on y revient après une chute) et plateforme d'arrivée. */
  cloudStart: Point2;
  cloudEnd: Point2;
  /** Nuages : couleur et cases (2 × 2) qu'ils couvrent. */
  clouds: { color: CloudColor; x0: number; z0: number }[];
  stainedGlass: Point2;
  balance: Point2;
  balancePanel: Point2;
  weightsTable: Point2;
  gate: Point2;
  stone5: Point2;
  nest: Point2;
  doorA: Cell[];
  doorB: Cell[];
  doorC: Cell[];
}

export interface CielVillagePlan {
  npcs: NpcSpot[];
  guardians: Spot[];
  lantern: Point2;
  home: Point2;
}

export interface CielLayout extends WorldLayout {
  id: 'ciel';
  landmarks: Record<CielLandmark, Point2>;
  village: CielVillagePlan;
  sanctuary: SkySanctuaryPlan;
  arena: ArenaPlan;
  lair: FightStage & { boss: Point2 };
  /** Porte de la tour noire du Griffon (s'ouvre avec 3 plumes noires). */
  lairDoor: Cell[];
  /** Les 4 cristaux de vent sur des îlots (R1), les 3 braseros du phare (R2), les 5 fleurs célestes (O1). */
  windCrystals: Point2[];
  lighthouseBraziers: Point2[];
  flowers: Point2[];
  /** Le gardien en haut de la plus haute tour (O2), et les 3 plumes noires (P5). */
  guardian: Point2 & { y: number };
  feathers: Point2[];
  islands: (Point2 & { r: number })[];
}

function dist(a: Point2, x: number, z: number): number {
  return Math.hypot(x - a.x, z - a.z);
}

/** Petite maison de marbre au toit de nuage, porte vers le sud. */
function buildHouse(world: VoxelWorld, x0: number, z0: number, y: number, w: number, d: number): void {
  for (let dx = 0; dx < w; dx++)
    for (let dz = 0; dz < d; dz++) {
      const edge = dx === 0 || dz === 0 || dx === w - 1 || dz === d - 1;
      const door = dz === d - 1 && dx === Math.floor(w / 2);
      for (let h = 0; h < 3; h++) world.set(x0 + dx, y + h, z0 + dz, edge && !(door && h < 2) ? (h === 1 && !door && dx === 1 && dz === 0 ? Block.Window : Block.Marble) : Block.Air);
      world.set(x0 + dx, y + 3, z0 + dz, Block.Cloud);
    }
}

/** Sanctuaire des Vents (voir SkySanctuaryPlan) ; SX, SZ = coin nord-ouest de la grille des nuages. */
function buildSanctuary(world: VoxelWorld, cx: number, cz: number, y: number): SkySanctuaryPlan {
  const SX = cx - 4;
  const SZ = cz + 2;
  const x0 = SX - 2;
  const x1 = SX + 9;
  const z0 = SZ - 17;
  const z1 = SZ + 14;
  for (let x = x0 - 1; x <= x1 + 1; x++)
    for (let z = z0 - 1; z <= z1 + 1; z++) {
      for (let h = 0; h < 8; h++) world.set(x, y + h, z, Block.Air);
      world.set(x, y - 1, z, Block.Marble);
    }
  const wall = (x: number, z: number): void => {
    for (let h = 0; h < 3; h++) world.set(x, y + h, z, Block.Marble);
  };
  for (let x = x0; x <= x1; x++) for (const z of [z0, z1, SZ + 8, SZ - 4, SZ - 11]) wall(x, z);
  for (let z = z0; z <= z1; z++) {
    wall(x0, z);
    wall(x1, z);
  }
  // La salle des nuages : du vide (jusqu'à la mer de nuages), sauf les plateformes et les six nuages.
  for (let x = SX - 1; x <= SX + 8; x++)
    for (let z = SZ - 1; z <= SZ + 5; z++) for (let h = -12; h < 0; h++) world.set(x, y + h, z, Block.Air);
  const clouds = CLOUD_GRID.map((c) => ({ color: c.color, x0: SX + c.col * 3, z0: SZ + c.row * 3 }));
  for (const c of clouds) for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) world.set(c.x0 + dx, y - 1, c.z0 + dz, CLOUD_BLOCK[c.color]);
  // L'entrée du sanctuaire, au sud du hall.
  for (const x of [SX + 3, SX + 4]) for (let h = 0; h < 2; h++) world.set(x, y + h, z1, Block.Air);
  const door = (x: number, z: number): Cell[] => [0, 1].map((h) => ({ x, y: y + h, z }));
  const doorA = door(SX + 3, SZ + 8);
  const doorB = door(SX + 3, SZ - 4);
  const doorC = door(SX + 3, SZ - 11);
  for (const c of [...doorA, ...doorB, ...doorC]) world.set(c.x, c.y, c.z, Block.Marble);
  return {
    floorY: y,
    entrance: { x: SX + 4, z: z1 + 2.5 },
    stone: { x: SX + 6.5, z: SZ + 11.5 },
    cloudStart: { x: SX + 3.5, z: SZ + 6.5 },
    cloudEnd: { x: SX + 3.5, z: SZ - 2.5 },
    clouds,
    stainedGlass: { x: SX + 6.5, z: SZ - 3.4 },
    balance: { x: SX + 3.5, z: SZ - 8.5 },
    balancePanel: { x: SX + 3.5, z: SZ - 6 },
    weightsTable: { x: SX + 0.5, z: SZ - 6.5 },
    gate: { x: SX + 3.5, z: SZ - 11 + 0.5 },
    stone5: { x: SX + 0.5, z: SZ - 14.5 },
    nest: { x: SX + 6.5, z: SZ - 14.5 },
    doorA,
    doorB,
    doorC,
  };
}

/** La tour noire du Griffon : une cour fermée par un mur de basalte, porte au sud. */
function buildLair(world: VoxelWorld, cx: number, cz: number, y: number): { stage: FightStage & { boss: Point2 }; door: Cell[] } {
  for (let dz = -10; dz <= 10; dz++)
    for (let dx = -10; dx <= 10; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > 10) continue;
      for (let h = 0; h < 8; h++) world.set(cx + dx, y + h, cz + dz, Block.Air);
      world.set(cx + dx, y - 1, cz + dz, d < 3 ? Block.Basalt : Block.Grass);
      if (d > 8.4 && d <= 9.4) for (let h = 0; h < 4; h++) world.set(cx + dx, y + h, cz + dz, Block.Basalt);
    }
  // Quatre tourelles.
  for (const [dx, dz] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) for (let h = 0; h < 6; h++) for (const [ox, oz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) world.set(cx + dx + ox, y + h, cz + dz + oz, Block.Basalt);
  const door: Cell[] = [];
  for (const x of [cx, cx + 1]) for (let h = 0; h < 3; h++) door.push({ x, y: y + h, z: cz + 9 });
  for (const x of [cx, cx + 1]) for (let h = 0; h < 3; h++) world.set(x, y + h, cz + 8, Block.Air);
  for (const c of door) world.set(c.x, c.y, c.z, Block.Basalt);
  return {
    stage: { boss: { x: cx + 0.5, z: cz - 1.5 }, golemSpot: { x: cx + 3.5, z: cz + 0.5 }, monsterSpot: { x: cx - 2.5, z: cz + 0.5 }, center: { x: cx + 0.5, z: cz + 0.5 }, floorY: y, view: 1 },
    door,
  };
}

/** La plus haute tour : un pilier de marbre et un escalier qui tourne autour jusqu'au sommet. */
function buildTower(world: VoxelWorld, cx: number, cz: number, y: number): Point2 & { y: number } {
  const height = 12;
  for (let h = 0; h < height; h++) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) world.set(cx + dx, y + h, cz + dz, Block.Marble);
  // L'anneau de 16 cases autour du pilier, en montant d'une marche à la fois (sens des aiguilles).
  const ring: [number, number][] = [];
  for (let dx = -2; dx <= 2; dx++) ring.push([dx, 2]);
  for (let dz = 1; dz >= -2; dz--) ring.push([2, dz]);
  for (let dx = 1; dx >= -2; dx--) ring.push([dx, -2]);
  for (let dz = -1; dz <= 1; dz++) ring.push([-2, dz]);
  ring.forEach(([dx, dz], k) => {
    const top = Math.round((k * height) / (ring.length - 1));
    for (let h = 0; h < top; h++) world.set(cx + dx, y + h, cz + dz, Block.Marble);
  });
  return { x: cx + 0.5, y: y + height, z: cz + 0.5 };
}

/** Un phare de marbre rayé, coiffé d'une lanterne. */
function buildLighthouse(world: VoxelWorld, cx: number, cz: number, y: number): void {
  for (let h = 0; h < 9; h++) for (let dx = 0; dx <= 1; dx++) for (let dz = 0; dz <= 1; dz++) world.set(cx + dx, y + h, cz + dz, h % 3 === 2 ? Block.Brick : Block.Marble);
  for (let dx = 0; dx <= 1; dx++) for (let dz = 0; dz <= 1; dz++) world.set(cx + dx, y + 9, cz + dz, Block.Gold);
}

export function generateCiel(seed = CIEL_SEED): CielLayout {
  const size = CIEL_SIZE;
  const world = new VoxelWorld(size, WORLD_HEIGHT, size);
  world.standFrom = CIEL_FALL_Y;
  const noise = new Noise2D(seed);
  const rng = createRng(seed ^ 0x5eed);
  const y = CIEL_SURFACE;

  // La mer de nuages, tout en bas : rien ne tombe à l'infini.
  for (let z = 0; z < size; z++)
    for (let x = 0; x < size; x++) {
      world.set(x, 0, z, Block.Cloud);
      if (noise.fbm(x / 9, z / 9, 2) > 0.1) world.set(x, 1, z, Block.Cloud);
    }

  // Les îles : un dessus plat, une base en cône de terre et de pierre, une frange de nuage.
  const onIsland = new Uint8Array(size * size);
  for (const isl of Object.values(ISLANDS))
    for (let dz = -isl.r; dz <= isl.r; dz++)
      for (let dx = -isl.r; dx <= isl.r; dx++) {
        const x = isl.x + dx;
        const z = isl.z + dz;
        if (x < 1 || z < 1 || x >= size - 1 || z >= size - 1) continue;
        const d = Math.hypot(dx, dz);
        const edge = isl.r + noise.fbm(x / 6, z / 6, 2) * 1.5;
        if (d > edge) continue;
        onIsland[z * size + x] = 1;
        const depth = Math.max(2, Math.round((1 - d / (edge + 1)) * 8));
        for (let k = 1; k <= depth; k++) world.set(x, y - k, z, k === 1 ? isl.top : k < 4 ? Block.Dirt : Block.Stone);
        if (d > edge - 1.2) world.set(x, y - depth - 1, z, Block.Cloud);
      }

  // Les ponts arc-en-ciel.
  const onBridge = new Uint8Array(size * size);
  for (const [a, b] of BRIDGES) {
    const A = ISLANDS[a];
    const B = ISLANDS[b];
    const steps = Math.ceil(dist(A, B.x, B.z) * 2);
    for (let s = 0; s <= steps; s++) {
      const px = A.x + ((B.x - A.x) * s) / steps;
      const pz = A.z + ((B.z - A.z) * s) / steps;
      for (let ox = -1; ox <= 1; ox++)
        for (let oz = -1; oz <= 1; oz++) {
          const x = Math.round(px) + ox;
          const z = Math.round(pz) + oz;
          if (x < 1 || z < 1 || x >= size - 1 || z >= size - 1 || onIsland[z * size + x]) continue;
          world.set(x, y - 1, z, Block.Rainbow);
          onBridge[z * size + x] = 1;
        }
    }
  }

  // Le Village des Nuages : quatre maisons de marbre autour de la place.
  const v = ISLANDS.village;
  buildHouse(world, v.x - 10, v.z - 8, y, 5, 5);
  buildHouse(world, v.x + 6, v.z - 9, y, 6, 5);
  buildHouse(world, v.x - 11, v.z + 4, y, 5, 4);
  buildHouse(world, v.x + 7, v.z + 5, y, 5, 4);
  const village: CielVillagePlan = {
    npcs: [{ id: 'azur', x: v.x + 0.5, z: v.z + 3.5, facing: 0 }],
    guardians: [
      { x: v.x - 4.5, z: v.z + 10.5, facing: 0 },
      { x: v.x + 5.5, z: v.z + 10.5, facing: 0 },
    ],
    lantern: { x: v.x - 3.5, z: v.z + 5.5 },
    home: { x: v.x, z: v.z },
  };

  const sanctuary = buildSanctuary(world, ISLANDS.sanctuary.x, ISLANDS.sanctuary.z, y);
  const arena = buildArena(world, ISLANDS.arena.x, ISLANDS.arena.z, y);
  const lair = buildLair(world, ISLANDS.bossLair.x, ISLANDS.bossLair.z, y);
  const guardian = buildTower(world, ISLANDS.tower.x, ISLANDS.tower.z, y);
  const lh = ISLANDS.lighthouse;
  buildLighthouse(world, lh.x, lh.z, y);
  const lighthouseBraziers = [
    { x: lh.x - 3.5, z: lh.z + 3.5 },
    { x: lh.x + 4.5, z: lh.z + 3.5 },
    { x: lh.x + 0.5, z: lh.z - 3.5 },
  ];

  // Les îlots des cristaux de vent (R1) : on y saute depuis le village, par des marches de nuage.
  const islets = [
    { x: v.x - 20, z: v.z - 4, dx: 1 },
    { x: v.x + 20, z: v.z + 4, dx: -1 },
    { x: v.x - 6, z: v.z + 20, dz: -1 },
    { x: v.x + 6, z: v.z - 20, dz: 1 },
  ];
  const windCrystals: Point2[] = [];
  for (const it of islets) {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) world.set(it.x + dx, y - 1, it.z + dz, Block.Cloud);
    // Deux marches de nuage (1 bloc de vide entre chacune) vers l'île du village.
    const sx = it.dx ?? 0;
    const sz = it.dz ?? 0;
    for (let k = 1; k <= 3; k++) {
      const bx = it.x + sx * (1 + k * 2);
      const bz = it.z + sz * (1 + k * 2);
      if (onIsland[bz * size + bx]) break;
      world.set(bx, y - 1, bz, Block.Cloud);
      if (sx) world.set(bx, y - 1, bz + 1, Block.Cloud);
      else world.set(bx + 1, y - 1, bz, Block.Cloud);
    }
    windCrystals.push({ x: it.x + 0.5, z: it.z + 0.5 });
  }

  // Végétation : quelques fleurs et petits arbres sur les îles herbeuses.
  const decorations: Decoration[] = [];
  const keepClear: (Point2 & { r: number })[] = [
    { x: v.x, z: v.z, r: 11 },
    { x: ISLANDS.sanctuary.x, z: ISLANDS.sanctuary.z, r: 22 },
    { x: ISLANDS.arena.x, z: ISLANDS.arena.z, r: 11 },
    { x: ISLANDS.bossLair.x, z: ISLANDS.bossLair.z, r: 12 },
    { x: ISLANDS.tower.x, z: ISLANDS.tower.z, r: 4 },
    { x: lh.x, z: lh.z, r: 6 },
    { x: ISLANDS.garden.x, z: ISLANDS.garden.z, r: 5 },
    { x: ARCH.x, z: ARCH.z - 4, r: 7 },
  ];
  for (let attempt = 0; attempt < 1500; attempt++) {
    const x = randInt(rng, 2, size - 3);
    const z = randInt(rng, 2, size - 3);
    if (!onIsland[z * size + x] || keepClear.some((c) => dist(c, x, z) < c.r)) continue;
    if (world.get(x, y - 1, z) !== Block.Grass || world.get(x, y, z) !== Block.Air) continue;
    if (rng() < 0.04) {
      for (let h = 0; h < 3; h++) world.set(x, y + h, z, Block.Log);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let h = 3; h < 5; h++) if (world.get(x + dx, y + h, z + dz) === Block.Air) world.set(x + dx, y + h, z + dz, h === 4 && (dx || dz) ? Block.Cloud : Block.Leaves);
      continue;
    }
    decorations.push({ x: x + 0.5, y, z: z + 0.5, tile: rng() < 0.5 ? Tile.SkyFlower : Tile.GrassTuft });
  }

  // Objets posés sur des cases libres des îles.
  const taken: Point2[] = [...lighthouseBraziers, ...windCrystals, village.lantern];
  const free = (x: number, z: number): boolean => {
    if (x < 3 || z < 3 || x > size - 4 || z > size - 4 || !onIsland[z * size + x]) return false;
    if (world.get(x, y - 1, z) === Block.Air || world.get(x, y, z) !== Block.Air || world.get(x, y + 1, z) !== Block.Air) return false;
    return !taken.some((t) => Math.abs(t.x - x - 0.5) < 2 && Math.abs(t.z - z - 0.5) < 2);
  };
  const near = (wx: number, wz: number): Point2 => {
    for (let r = 0; r < 10; r++)
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r || !free(wx + dx, wz + dz)) continue;
          const p = { x: wx + dx + 0.5, z: wz + dz + 0.5 };
          taken.push(p);
          return p;
        }
    throw new Error(`Pas de place libre près de (${wx}, ${wz})`);
  };
  const g = ISLANDS.garden;
  const flowers = [near(g.x - 3, g.z), near(g.x + 3, g.z), near(g.x, g.z - 3), near(g.x - 2, g.z + 3), near(g.x + 2, g.z + 3)];
  const feathers = [near(lh.x - 4, lh.z - 3), near(ISLANDS.knights.x + 3, ISLANDS.knights.z - 3), near(ISLANDS.arrival.x - 5, ISLANDS.arrival.z - 3)];
  const crates: CielLayout['crates'] = [];
  for (let attempt = 0; attempt < 3000 && crates.length < CRATE_COUNT; attempt++) {
    const x = randInt(rng, 4, size - 5);
    const z = randInt(rng, 4, size - 5);
    if (!free(x, z) || keepClear.some((c) => dist(c, x, z) < c.r) || crates.some((c) => dist(c, x, z) < 6)) continue;
    taken.push({ x: x + 0.5, z: z + 0.5 });
    crates.push({ id: `ciel-caisse-${crates.length}`, x: x + 0.5, y, z: z + 0.5 });
  }

  const at = (p: Point2): { x: number; y: number; z: number } => ({ x: p.x, y: world.surfaceY(Math.floor(p.x), Math.floor(p.z)), z: p.z });
  const arrival = { x: ARCH.x, z: ARCH.z - 8, facing: 0 };
  const camps: Camp[] = CAMP_SPOTS.map((c) => {
    const isl = ISLANDS[c.island];
    const p = c.island === 'arrival' ? { x: isl.x + 6, z: isl.z - 4 } : { x: isl.x, z: isl.z };
    return { id: c.id, monsters: c.monsters, x: p.x, z: p.z, chest: { x: p.x + 0.5, z: p.z - 2.5 } };
  });
  return {
    id: 'ciel',
    world,
    sky: SKY_COLOR,
    spawn: at(arrival),
    spawnYaw: 0,
    decorations,
    safeZones: [{ x: v.x, z: v.z, r: v.r }],
    npcs: village.npcs,
    guardians: village.guardians,
    camps,
    crates,
    lanterns: [
      { id: 'ciel-village', ...at(village.lantern) },
      { id: 'ciel-sanctuaire', ...at({ x: sanctuary.entrance.x + 3, z: sanctuary.entrance.z }) },
      { id: 'ciel-tour-noire', ...at({ x: ISLANDS.bossLair.x + 5.5, z: ISLANDS.bossLair.z + 11.5 }) },
      { id: 'ciel-arche', ...at({ x: ARCH.x + 3.5, z: ARCH.z - 1.5 }) },
    ],
    arch: ARCH,
    arrival,
    landmarks: { village: v, sanctuary: ISLANDS.sanctuary, arena: ISLANDS.arena, bossLair: ISLANDS.bossLair },
    village,
    sanctuary,
    arena,
    lair: lair.stage,
    lairDoor: lair.door,
    windCrystals,
    lighthouseBraziers,
    flowers,
    guardian,
    feathers,
    islands: Object.values(ISLANDS).map((i) => ({ x: i.x, z: i.z, r: i.r })),
  };
}
