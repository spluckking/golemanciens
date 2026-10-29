import { createRng, randInt } from '../core/rng';
import type { MonsterSpecies } from '../data/creatures';
import { SLIDE_ROOM } from '../quests/frostPuzzles';
import { Block, Tile } from './blocks';
import type { Camp, Decoration, NpcSpot, Point2, Spot, WorldLayout } from './layout';
import { Noise2D } from './noise';
import { buildArena, type ArenaPlan, type Cell, type FightStage } from './structures';
import { VoxelWorld, WORLD_HEIGHT } from './voxelWorld';

/**
 * Pics de Givre (chapitre 4) : montagnes enneigées, sapins, le lac gelé et le village des Igloos du
 * Col, le sanctuaire gelé (S4), l'arène et le sommet où attend la Sorcière du Blizzard.
 */

export const GIVRE_SIZE = 128;
export const GIVRE_SEED = 20261104;
const SKY_COLOR = 0xc8d8ea;
const ARCH = { x: 64.5, z: 114.5, facing: 0 };
const BASE_Y = 10;

type GivreLandmark = 'village' | 'sanctuary' | 'arena' | 'bossLair';
const PADS: Record<GivreLandmark, Point2 & { r: number }> = {
  village: { x: 44, z: 70, r: 14 },
  sanctuary: { x: 100, z: 38, r: 13 },
  arena: { x: 98, z: 94, r: 9 },
  bossLair: { x: 24, z: 22, r: 11 },
};
const LAKE = { x: 64, z: 60, r: 8 };

/** Le camp des yétis, sur le col (quête R3). */
export const YETIS_CAMP = 'givre-yetis';
const CAMP_SPOTS: { id: string; x: number; z: number; monsters: MonsterSpecies[] }[] = [
  { id: YETIS_CAMP, x: 72, z: 88, monsters: ['yeti', 'yeti', 'yeti'] },
  { id: 'givre-chauves-souris', x: 20, z: 84, monsters: ['iceBat', 'iceBat'] },
  { id: 'givre-fantomes', x: 80, z: 30, monsters: ['frostGhost', 'frostGhost'] },
  { id: 'givre-mixte', x: 114, z: 64, monsters: ['yeti', 'iceBat', 'frostGhost'] },
];
const CRATE_COUNT = 20;

/**
 * Plan du sanctuaire gelé (S4) : une enfilade de salles du sud au nord. Le hall (première pierre),
 * la salle de glace 6 × 6 (glissade), la salle de la mémoire de glace, celle du moulin gelé, puis
 * la dernière salle (seconde pierre et nid). Les portes sont des murs de glace qui fondent.
 */
export interface FrostSanctuaryPlan {
  floorY: number;
  entrance: Point2;
  stone: Point2;
  /** Centre de la case (0, 0) de la salle de glace. */
  slideOrigin: Point2;
  /** Où le héros réapparaît s'il veut recommencer la glissade (devant la case de départ). */
  slideRestart: Point2;
  /** Les 4 dalles de la mémoire de glace, et la stèle qui rejoue la séquence. */
  memoryTiles: Point2[];
  memoryStele: Point2;
  /** Moulin gelé : la manivelle, les axes L, M, R, le moulin, et l'endroit où l'on règle les roues. */
  crank: Point2;
  axles: Point2[];
  mill: Point2;
  millPanel: Point2;
  stone4: Point2;
  nest: Point2;
  doorA: Cell[];
  doorB: Cell[];
  doorC: Cell[];
}

export interface GivreVillagePlan {
  npcs: NpcSpot[];
  guardians: Spot[];
  lantern: Point2;
  /** Tas de bois où déposer les bûches (R1), trous de pêche (O1), cloches de glace (O2). */
  woodPile: Point2;
  fishingHoles: Point2[];
  /** Cloches dans l'ordre où elles sont posées : leur taille (0 = la plus petite). */
  bells: (Point2 & { size: number })[];
  /** Où ramener Nilou (R2). */
  home: Point2 & { r: number };
}

export interface GivreLayout extends WorldLayout {
  id: 'givre';
  landmarks: Record<GivreLandmark, Point2>;
  village: GivreVillagePlan;
  sanctuary: FrostSanctuaryPlan;
  arena: ArenaPlan;
  summit: FightStage & { boss: Point2 };
  /** Cœur ancestral caché (SPEC § 4.3) : entre les sapins du sud-est. */
  heart: Point2;
  /** Les 5 bûches (R1), Nilou perdu dans la tempête (R2), les 3 braseros du sentier (P4). */
  logs: Point2[];
  nilou: Point2;
  braziers: Point2[];
  lake: Point2 & { r: number };
}

function dist(a: Point2, x: number, z: number): number {
  return Math.hypot(x - a.x, z - a.z);
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Sapin enneigé : tronc, étages de branches de plus en plus petits, neige sur le dessus. */
function buildPine(world: VoxelWorld, x: number, y0: number, z: number, h: number): void {
  for (let y = 0; y < h; y++) world.set(x, y0 + y, z, Block.Log);
  for (let layer = 0; layer < 3; layer++) {
    const y = y0 + 2 + layer * 2;
    const r = 2 - Math.floor(layer * 0.7);
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) + Math.abs(dz) > r + (layer === 0 ? 1 : 0) || (dx === 0 && dz === 0)) continue;
        if (world.get(x + dx, y, z + dz) === Block.Air) world.set(x + dx, y, z + dz, Block.Leaves);
        if (world.get(x + dx, y + 1, z + dz) === Block.Air && Math.abs(dx) + Math.abs(dz) === r) world.set(x + dx, y + 1, z + dz, Block.Snow);
      }
  }
  world.set(x, y0 + h, z, Block.Leaves);
  world.set(x, y0 + h + 1, z, Block.Snow);
}

/** Igloo : un dôme de briques de glace, entrée vers le sud. */
function buildIgloo(world: VoxelWorld, cx: number, cz: number, y: number, r: number): void {
  for (let dx = -r; dx <= r; dx++)
    for (let dz = -r; dz <= r; dz++)
      for (let h = 0; h <= r; h++) {
        const d = Math.hypot(dx, dz, h * 1.15);
        const shell = d <= r + 0.5 && d > r - 0.6;
        const door = dz > 0 && Math.abs(dx) <= 0 && h < 2;
        world.set(cx + dx, y + h, cz + dz, shell && !door ? Block.IceBrick : Block.Air);
      }
}

/** Sanctuaire gelé (voir FrostSanctuaryPlan) ; SX, SZ = coin nord-ouest de la salle de glace. */
function buildSanctuary(world: VoxelWorld, cx: number, cz: number, y: number): FrostSanctuaryPlan {
  const SX = cx - 3;
  const SZ = cz - 1;
  const x0 = SX - 3;
  const x1 = SX + 8;
  const z0 = SZ - 19;
  const z1 = SZ + 12;
  for (let x = x0 - 1; x <= x1 + 1; x++)
    for (let z = z0 - 1; z <= z1 + 1; z++) {
      for (let h = 0; h < 7; h++) world.set(x, y + h, z, Block.Air);
      world.set(x, y - 1, z, Block.IceBrick);
    }
  const wall = (x: number, z: number): void => {
    for (let h = 0; h < 3; h++) world.set(x, y + h, z, Block.IceBrick);
  };
  for (let x = x0; x <= x1; x++) for (const z of [z0, z1, SZ + 6, SZ - 1, SZ - 7, SZ - 13]) wall(x, z);
  for (let z = z0; z <= z1; z++) {
    wall(x0, z);
    wall(x1, z);
  }
  // La salle de glace : 6 × 6 cases au sol de glace, murs pleins de chaque côté.
  for (let z = SZ; z <= SZ + 5; z++) for (let x = x0; x <= x1; x++) if (x < SX || x > SX + 5) wall(x, z);
  for (let gz = 0; gz < SLIDE_ROOM.size; gz++) for (let gx = 0; gx < SLIDE_ROOM.size; gx++) world.set(SX + gx, y - 1, SZ + gz, Block.Ice);
  for (const [rx, rz] of SLIDE_ROOM.rocks) for (let h = 0; h < 2; h++) world.set(SX + rx, y + h, SZ + rz, Block.IceBrick);
  // L'ouverture nord de la salle de glace (la sortie), et l'entrée du sanctuaire au sud.
  for (let h = 0; h < 3; h++) world.set(SX + SLIDE_ROOM.exit, y + h, SZ - 1, Block.Air);
  for (const x of [SX + 2, SX + 3]) for (let h = 0; h < 2; h++) world.set(x, y + h, z1, Block.Air);
  // Portes de glace : hall → salle de glace (au-dessus de la case de départ), mémoire → moulin, moulin → nid.
  const door = (x: number, z: number): Cell[] => [0, 1].map((h) => ({ x, y: y + h, z }));
  const doorA = door(SX + SLIDE_ROOM.start[0], SZ + 6);
  const doorB = door(SX + 2, SZ - 7);
  const doorC = door(SX + 2, SZ - 13);
  for (const c of [...doorA, ...doorB, ...doorC]) world.set(c.x, c.y, c.z, Block.Ice);
  return {
    floorY: y,
    entrance: { x: SX + 3, z: z1 + 2.5 },
    stone: { x: SX + 4.5, z: SZ + 9.5 },
    slideOrigin: { x: SX + 0.5, z: SZ + 0.5 },
    slideRestart: { x: SX + 0.5, z: SZ + 7.5 },
    memoryTiles: [-0.5, 1.5, 3.5, 5.5].map((dx) => ({ x: SX + dx, z: SZ - 3.5 })),
    memoryStele: { x: SX + 2.5, z: SZ - 5.5 },
    crank: { x: SX + 0.5, z: SZ - 11.6 },
    axles: [
      { x: SX + 1.5, z: SZ - 11.6 },
      { x: SX + 2.0, z: SZ - 11.6 },
      { x: SX + 2.5, z: SZ - 11.6 },
    ],
    mill: { x: SX + 3.5, z: SZ - 11.6 },
    millPanel: { x: SX + 2.0, z: SZ - 9.5 },
    stone4: { x: SX + 0.5, z: SZ - 16.5 },
    nest: { x: SX + 4.5, z: SZ - 16.5 },
    doorA,
    doorB,
    doorC,
  };
}

/** Sommet de la Sorcière : un plateau de neige cerné de pics de glace. */
function buildSummit(world: VoxelWorld, cx: number, cz: number, y: number): FightStage & { boss: Point2 } {
  for (let dz = -10; dz <= 10; dz++)
    for (let dx = -10; dx <= 10; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > 10) continue;
      for (let h = 0; h < 8; h++) world.set(cx + dx, y + h, cz + dz, Block.Air);
      world.set(cx + dx, y - 1, cz + dz, d < 4 ? Block.Ice : Block.Snow);
      if (d > 8.6 && (dx * 5 + dz * 3) % 7 === 0) for (let h = 0; h < 3 + (Math.abs(dx + dz) % 2); h++) world.set(cx + dx, y + h, cz + dz, Block.Ice);
    }
  return {
    boss: { x: cx + 0.5, z: cz - 1.5 },
    golemSpot: { x: cx + 3.5, z: cz + 0.5 },
    monsterSpot: { x: cx - 2.5, z: cz + 0.5 },
    center: { x: cx + 0.5, z: cz + 0.5 },
    floorY: y,
    view: 1,
  };
}

export function generateGivre(seed = GIVRE_SEED): GivreLayout {
  const size = GIVRE_SIZE;
  const world = new VoxelWorld(size, WORLD_HEIGHT, size);
  const noise = new Noise2D(seed);
  const rng = createRng(seed ^ 0x5eed);
  const flat: (Point2 & { r: number })[] = [...Object.values(PADS), { ...LAKE, r: LAKE.r + 2 }, { x: ARCH.x, z: ARCH.z - 4, r: 9 }];
  const heights = new Int32Array(size * size);

  // Collines enneigées, de plus en plus hautes vers le nord ; aplanies autour des lieux.
  for (let z = 0; z < size; z++)
    for (let x = 0; x < size; x++) {
      let h = BASE_Y + noise.fbm(x / 26, z / 26, 3) * 4 + Math.max(0, (60 - z) / 60) * 3;
      const edge = Math.min(x, z, size - 1 - x, size - 1 - z);
      if (edge < 8) h += (8 - edge) * 1.6;
      for (const p of flat) h = h + (BASE_Y - h) * (1 - smoothstep(p.r, p.r + 7, dist(p, x, z)));
      heights[z * size + x] = Math.round(h);
    }
  for (let z = 0; z < size; z++)
    for (let x = 0; x < size; x++) {
      const h = heights[z * size + x];
      for (let y = 0; y < h; y++) world.set(x, y, z, y === h - 1 ? Block.Snow : y >= h - 3 ? Block.Dirt : Block.Stone);
    }

  // Le lac gelé : de la glace sur l'eau, bordée de neige.
  for (let dz = -LAKE.r - 1; dz <= LAKE.r + 1; dz++)
    for (let dx = -LAKE.r - 1; dx <= LAKE.r + 1; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > LAKE.r) continue;
      for (let h = 0; h < 4; h++) world.set(LAKE.x + dx, BASE_Y + h, LAKE.z + dz, Block.Air);
      world.set(LAKE.x + dx, BASE_Y - 1, LAKE.z + dz, Block.Ice);
      world.set(LAKE.x + dx, BASE_Y - 2, LAKE.z + dz, Block.Water);
    }

  // Sentiers de neige tassée entre l'arche, le village et les autres lieux.
  const lines: Point2[][] = [
    [{ x: ARCH.x, z: ARCH.z - 4 }, { x: 56, z: 92 }, { x: PADS.village.x, z: PADS.village.z }],
    [{ x: PADS.village.x, z: PADS.village.z }, { x: 76, z: 50 }, { x: PADS.sanctuary.x - 1, z: PADS.sanctuary.z + 15 }],
    [{ x: 76, z: 50 }, { x: 92, z: 74 }, { x: PADS.arena.x - 2, z: PADS.arena.z - 9 }],
    [{ x: PADS.village.x - 4, z: PADS.village.z - 6 }, { x: 32, z: 42 }, { x: PADS.bossLair.x + 6, z: PADS.bossLair.z + 8 }],
  ];
  const onPath = new Uint8Array(size * size);
  for (const line of lines)
    for (let k = 0; k < line.length - 1; k++) {
      const a = line[k];
      const b = line[k + 1];
      const steps = Math.ceil(dist(a, b.x, b.z) * 2);
      for (let s = 0; s <= steps; s++) {
        const px = Math.round(a.x + ((b.x - a.x) * s) / steps);
        const pz = Math.round(a.z + ((b.z - a.z) * s) / steps);
        for (const [dx, dz] of [[0, 0], [1, 0], [0, 1]]) {
          const x = px + dx;
          const z = pz + dz;
          if (x < 1 || z < 1 || x >= size - 1 || z >= size - 1) continue;
          onPath[z * size + x] = 1;
          const top = world.surfaceY(x, z) - 1;
          if (world.get(x, top, z) === Block.Snow) world.set(x, top, z, Block.Path);
        }
      }
    }

  // Les Igloos du Col : quatre igloos autour d'une place, le tas de bois, les cloches de glace.
  const v = PADS.village;
  for (let dz = -9; dz <= 9; dz++)
    for (let dx = -9; dx <= 9; dx++) {
      if (Math.hypot(dx, dz) > 9) continue;
      for (let h = 0; h < 5; h++) world.set(v.x + dx, BASE_Y + h, v.z + dz, Block.Air);
      world.set(v.x + dx, BASE_Y - 1, v.z + dz, Block.Snow);
    }
  buildIgloo(world, v.x - 10, v.z - 8, BASE_Y, 3);
  buildIgloo(world, v.x + 9, v.z - 9, BASE_Y, 3);
  buildIgloo(world, v.x - 11, v.z + 5, BASE_Y, 2);
  buildIgloo(world, v.x + 10, v.z + 6, BASE_Y, 2);
  const village: GivreVillagePlan = {
    npcs: [{ id: 'flocon', x: v.x + 0.5, z: v.z + 4.5, facing: 0 }],
    guardians: [
      { x: v.x - 6.5, z: v.z + 9.5, facing: 0 },
      { x: v.x + 7.5, z: v.z + 9.5, facing: 0 },
    ],
    lantern: { x: v.x - 4.5, z: v.z + 5.5 },
    woodPile: { x: v.x + 4.5, z: v.z + 1.5 },
    fishingHoles: [
      { x: LAKE.x - 3.5, z: LAKE.z + 2.5 },
      { x: LAKE.x + 2.5, z: LAKE.z - 3.5 },
      { x: LAKE.x + 4.5, z: LAKE.z + 3.5 },
    ],
    // Posées dans le désordre : moyenne, grande, petite.
    bells: [
      { x: v.x - 5.5, z: v.z - 3.5, size: 1 },
      { x: v.x - 2.5, z: v.z - 5.5, size: 2 },
      { x: v.x + 1.5, z: v.z - 5.5, size: 0 },
    ],
    home: { x: v.x + 0.5, z: v.z + 2, r: 3 },
  };

  const sanctuary = buildSanctuary(world, PADS.sanctuary.x, PADS.sanctuary.z, BASE_Y);
  const arena = buildArena(world, PADS.arena.x, PADS.arena.z, BASE_Y);
  const summit = buildSummit(world, PADS.bossLair.x, PADS.bossLair.z, BASE_Y);

  // Sapins hors des lieux, des sentiers et des camps ; touffes d'herbe givrée.
  const keepClear: (Point2 & { r: number })[] = [
    ...Object.values(PADS).map((p) => ({ ...p, r: p.r + 4 })),
    { x: PADS.sanctuary.x - 3, z: PADS.sanctuary.z - 4, r: 22 },
    ...CAMP_SPOTS.map((c) => ({ x: c.x, z: c.z, r: 6 })),
    { ...LAKE, r: LAKE.r + 3 },
    { x: ARCH.x, z: ARCH.z - 4, r: 12 },
  ];
  const clear = (x: number, z: number): boolean => {
    if (x < 5 || z < 5 || x > size - 7 || z > size - 7) return false;
    for (const c of keepClear) if (dist(c, x, z) < c.r) return false;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (onPath[(z + dz) * size + (x + dx)]) return false;
    return true;
  };
  for (let n = 0, attempt = 0; attempt < 900 && n < 60; attempt++) {
    const x = randInt(rng, 5, size - 7);
    const z = randInt(rng, 5, size - 7);
    if (!clear(x, z)) continue;
    buildPine(world, x, world.surfaceY(x, z), z, randInt(rng, 5, 7));
    n++;
  }
  // Quelques sapins entourent la cachette du Cœur ancestral.
  const heartSpot = { x: 112, z: 110 };
  for (const [dx, dz] of [[-3, 0], [3, 1], [0, -3], [-2, 3], [2, -3]]) {
    const x = heartSpot.x + dx;
    const z = heartSpot.z + dz;
    buildPine(world, x, world.surfaceY(x, z), z, 6);
  }
  const decorations: Decoration[] = [];
  for (let attempt = 0; attempt < 1200; attempt++) {
    const x = randInt(rng, 2, size - 3);
    const z = randInt(rng, 2, size - 3);
    if (onPath[z * size + x] || dist(v, x, z) < 10) continue;
    const y = world.surfaceY(x, z);
    if (world.get(x, y - 1, z) !== Block.Snow || world.get(x, y, z) !== Block.Air) continue;
    decorations.push({ x: x + 0.5, y, z: z + 0.5, tile: Tile.FrostGrass });
  }

  // Objets posés sur des cases libres.
  const taken: Point2[] = [];
  const free = (x: number, z: number): boolean => {
    if (x < 3 || z < 3 || x > size - 4 || z > size - 4) return false;
    const y = world.surfaceY(x, z);
    const below = world.get(x, y - 1, z);
    if ((below !== Block.Snow && below !== Block.Path) || world.get(x, y, z) !== Block.Air || world.get(x, y + 1, z) !== Block.Air) return false;
    return !taken.some((t) => Math.abs(t.x - x - 0.5) < 2 && Math.abs(t.z - z - 0.5) < 2);
  };
  const near = (wx: number, wz: number): Point2 => {
    for (let r = 0; r < 14; r++)
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r || !free(wx + dx, wz + dz)) continue;
          const p = { x: wx + dx + 0.5, z: wz + dz + 0.5 };
          taken.push(p);
          return p;
        }
    throw new Error(`Pas de place libre près de (${wx}, ${wz})`);
  };
  for (const p of [village.woodPile, ...village.bells, village.lantern]) taken.push(p);
  const crates: GivreLayout['crates'] = [];
  for (let attempt = 0; attempt < 3000 && crates.length < CRATE_COUNT; attempt++) {
    const x = randInt(rng, 8, size - 9);
    const z = randInt(rng, 8, size - 9);
    if (onPath[z * size + x] || !free(x, z)) continue;
    if (Object.values(PADS).some((p) => dist(p, x, z) < p.r + 2) || CAMP_SPOTS.some((c) => dist(c, x, z) < 5) || crates.some((c) => dist(c, x, z) < 7)) continue;
    taken.push({ x: x + 0.5, z: z + 0.5 });
    crates.push({ id: `givre-caisse-${crates.length}`, x: x + 0.5, y: world.surfaceY(x, z), z: z + 0.5 });
  }
  const logs = [near(30, 96), near(18, 60), near(56, 40), near(86, 70), near(104, 112)];
  const nilou = near(116, 84);
  const braziers = [near(34, 52), near(30, 40), near(31, 32)];
  const heart = near(heartSpot.x, heartSpot.z);

  const at = (p: Point2): { x: number; y: number; z: number } => ({ x: p.x, y: world.surfaceY(Math.floor(p.x), Math.floor(p.z)), z: p.z });
  const arrival = { x: ARCH.x, z: ARCH.z - 8, facing: 0 };
  const camps: Camp[] = CAMP_SPOTS.map((c) => ({ ...c, chest: { x: c.x + 0.5, z: c.z - 2.5 } }));
  return {
    id: 'givre',
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
      { id: 'givre-village', ...at(village.lantern) },
      { id: 'givre-sanctuaire', ...at({ x: sanctuary.entrance.x + 3, z: sanctuary.entrance.z + 1 }) },
      { id: 'givre-sommet', ...at({ x: PADS.bossLair.x + 10.5, z: PADS.bossLair.z + 13.5 }) },
      { id: 'givre-arche', ...at({ x: ARCH.x + 3.5, z: ARCH.z - 1.5 }) },
    ],
    arch: ARCH,
    arrival,
    landmarks: { village: v, sanctuary: PADS.sanctuary, arena: PADS.arena, bossLair: PADS.bossLair },
    village,
    sanctuary,
    arena,
    summit,
    heart,
    logs,
    nilou,
    braziers,
    lake: LAKE,
  };
}
