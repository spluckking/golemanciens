import { createRng, randInt } from '../core/rng';
import type { MonsterSpecies } from '../data/creatures';
import { MIRROR_ROOM, PUSH_ROOM } from '../quests/templePuzzles';
import { Block, Tile } from './blocks';
import type { Camp, Decoration, NpcSpot, Point2, Spot, WorldLayout } from './layout';
import { Noise2D } from './noise';
import { buildArena, type ArenaPlan, type Cell, type FightStage } from './structures';
import { VoxelWorld, WORLD_HEIGHT } from './voxelWorld';

/**
 * Désert des Sables Chantants (chapitre 3) : dunes, palmiers et cactus, l'oasis de Palmebloc,
 * le temple ensablé (sanctuaire S3), l'arène et la fosse du Grand Ver des Sables.
 */

export const DESERT_SIZE = 128;
export const DESERT_SEED = 20261103;
const SKY_COLOR = 0xf2dcae;
const ARCH = { x: 64.5, z: 114.5, facing: 0 };
const BASE_Y = 10;

type DesertLandmark = 'village' | 'sanctuary' | 'arena' | 'bossLair';
const PADS: Record<DesertLandmark, Point2 & { r: number }> = {
  village: { x: 40, z: 62, r: 15 },
  sanctuary: { x: 104, z: 30, r: 12 },
  arena: { x: 98, z: 92, r: 9 },
  bossLair: { x: 24, z: 22, r: 11 },
};

/** Le camp des scorpions, près du vieux puits (quête R3). */
export const SCORPIONS_CAMP = 'desert-scorpions';
const CAMP_SPOTS: { id: string; x: number; z: number; monsters: MonsterSpecies[] }[] = [
  { id: SCORPIONS_CAMP, x: 64, z: 80, monsters: ['scorpion', 'scorpion', 'scorpion'] },
  { id: 'desert-momies', x: 84, z: 48, monsters: ['mummy', 'mummy'] },
  { id: 'desert-vautours', x: 18, z: 90, monsters: ['vulture', 'vulture'] },
  { id: 'desert-mixte', x: 112, z: 62, monsters: ['mummy', 'scorpion', 'vulture'] },
];
const CRATE_COUNT = 20;

/** Plan du temple ensablé (S3) : les trois salles et leurs portes. */
export interface TemplePlan {
  floorY: number;
  entrance: Point2;
  /** Salle du bloc de grès : centre de la case (0, 0) de la grille 5 × 5. */
  pushOrigin: Point2;
  /** Salle des miroirs : centre de la case (0, 0). */
  mirrorOrigin: Point2;
  /** Porte entre la salle du bloc et celle des miroirs ; porte entre les miroirs et la dernière salle. */
  doorA: Cell[];
  doorB: Cell[];
  /** Dernière salle : le mur de la suite logique, les 3 dalles, la pierre-énigme, le nid. */
  symbolWall: { x: number; y: number; z: number };
  symbolTiles: Point2[];
  stone: Point2;
  nest: Point2;
  restartPush: Point2;
  restartMirrors: Point2;
}

export interface DesertVillagePlan {
  npcs: NpcSpot[];
  guardians: Spot[];
  lantern: Point2;
  /** Source où l'on remplit les seaux, abreuvoir où on les vide (R1). */
  spring: Point2;
  trough: Point2;
  /** Charrette de Zéphir et les caisses qui la bloquent (R2). */
  cart: Point2;
  cartCrates: Point2[];
  /** Enclos où ramener le chameau Caramel (O2). */
  pen: Point2 & { r: number };
}

export interface DesertLayout extends WorldLayout {
  id: 'desert';
  landmarks: Record<DesertLandmark, Point2>;
  village: DesertVillagePlan;
  temple: TemplePlan;
  arena: ArenaPlan;
  pit: FightStage & { boss: Point2 };
  /** Cristal de puissance caché (SPEC § 4.3) : derrière les cactus du sud-ouest. */
  crystal: Point2;
  /** Morceaux de la carte déchirée (O1), départ du chameau (O2), tambours (P3), vieux puits. */
  mapPieces: Point2[];
  camel: Point2;
  drums: Point2[];
  well: Point2;
}

function dist(a: Point2, x: number, z: number): number {
  return Math.hypot(x - a.x, z - a.z);
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Palmier : tronc un peu penché, couronne de palmes. */
function buildPalm(world: VoxelWorld, x: number, y0: number, z: number, h: number): void {
  for (let y = 0; y < h; y++) world.set(x + (y > h - 3 ? 1 : 0), y0 + y, z, Block.Log);
  const tx = x + 1;
  const ty = y0 + h;
  world.set(tx, ty, z, Block.Leaves);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    const droop = Math.abs(dx) + Math.abs(dz) > 1 ? -1 : 0;
    if (world.get(tx + dx, ty + droop, z + dz) === Block.Air) world.set(tx + dx, ty + droop, z + dz, Block.Leaves);
  }
}

/** Petite maison de grès à toit plat, porte vers le sud. */
function buildHut(world: VoxelWorld, x0: number, z0: number, y: number, w: number, d: number): void {
  for (let dx = 0; dx < w; dx++)
    for (let dz = 0; dz < d; dz++) {
      const edge = dx === 0 || dz === 0 || dx === w - 1 || dz === d - 1;
      const door = dz === d - 1 && dx === Math.floor(w / 2);
      for (let h = 0; h < 3; h++) world.set(x0 + dx, y + h, z0 + dz, edge && !(door && h < 2) ? (h === 1 && edge && !door && dx === 1 && dz === 0 ? Block.Window : Block.Sandstone) : Block.Air);
      world.set(x0 + dx, y + 3, z0 + dz, Block.Sandstone);
    }
}

/**
 * Temple ensablé : trois salles de grès en enfilade (bloc, miroirs, suite logique et nid),
 * à ciel ouvert pour que la caméra voie bien. On entre par le sud de la première salle.
 */
function buildTemple(world: VoxelWorld, cx: number, cz: number, y: number): TemplePlan {
  const x0 = cx - 9;
  const x1 = cx + 9;
  const z0 = cz - 6;
  const z1 = cz + 6;
  for (let x = x0 - 1; x <= x1 + 1; x++)
    for (let z = z0 - 1; z <= z1 + 1; z++) {
      for (let h = 0; h < 6; h++) world.set(x, y + h, z, Block.Air);
      world.set(x, y - 1, z, Block.Sandstone);
    }
  const wall = (x: number, z: number): void => {
    for (let h = 0; h < 3; h++) world.set(x, y + h, z, Block.Sandstone);
  };
  for (let x = x0; x <= x1; x++) {
    wall(x, z0);
    wall(x, z1);
  }
  for (let z = z0; z <= z1; z++) {
    wall(x0, z);
    wall(x1, z);
  }
  // Salle du bloc (5 × 5) : murs intérieurs ; entrée au sud.
  const pushX = cx - 8;
  const pushZ = cz - 2;
  for (let x = pushX - 1; x <= pushX + 5; x++) {
    wall(x, pushZ - 1);
    wall(x, pushZ + 5);
  }
  for (let z = pushZ - 1; z <= pushZ + 5; z++) wall(pushX + 5, z);
  for (let h = 0; h < 2; h++) world.set(pushX + 2, y + h, pushZ + 5, Block.Air);
  // La colonne de la salle du bloc (un seul obstacle).
  for (let h = 0; h < 2; h++) world.set(pushX + PUSH_ROOM.column[0], y + h, pushZ + PUSH_ROOM.column[1], Block.Sandstone);
  // Ouverture de l'entrée du temple, en face de l'entrée de la salle.
  for (let z = pushZ + 6; z <= z1; z++) for (let h = 0; h < 2; h++) world.set(pushX + 2, y + h, z, Block.Air);
  const doorA: Cell[] = [0, 1].map((h) => ({ x: pushX + 5, y: y + h, z: pushZ + MIRROR_ROOM.entryRow }));
  // Salle des miroirs (5 × 5) puis dernière salle ; la porte B est dans le mur est des miroirs.
  const mirX = cx - 2;
  const mirZ = cz - 2;
  for (let x = mirX; x <= mirX + 5; x++) {
    wall(x, mirZ - 1);
    wall(x, mirZ + 5);
  }
  for (let z = mirZ - 1; z <= mirZ + 5; z++) wall(mirX + 5, z);
  const doorB: Cell[] = [0, 1].map((h) => ({ x: mirX + 5, y: y + h, z: mirZ + MIRROR_ROOM.entryRow }));
  for (const c of [...doorA, ...doorB]) world.set(c.x, c.y, c.z, Block.Sandstone);
  return {
    floorY: y,
    entrance: { x: pushX + 2.5, z: z1 + 2.5 },
    pushOrigin: { x: pushX + 0.5, z: pushZ + 0.5 },
    mirrorOrigin: { x: mirX + 0.5, z: mirZ + 0.5 },
    doorA,
    doorB,
    symbolWall: { x: cx + 6.5, y: y + 2.4, z: z0 + 1.2 },
    symbolTiles: [{ x: cx + 5.5, z: cz - 3.5 }, { x: cx + 6.5, z: cz - 3.5 }, { x: cx + 7.5, z: cz - 3.5 }],
    stone: { x: cx + 6.5, z: cz + 0.5 },
    nest: { x: cx + 7.5, z: cz + 4.5 },
    restartPush: { x: pushX + 0.5, z: pushZ + 4.5 },
    restartMirrors: { x: mirX + 0.5, z: mirZ + 4.5 },
  };
}

/** Fosse du Grand Ver : un creux de sable entouré de rochers. */
function buildPit(world: VoxelWorld, cx: number, cz: number, y: number): FightStage & { boss: Point2 } {
  for (let dz = -9; dz <= 9; dz++)
    for (let dx = -9; dx <= 9; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > 9) continue;
      for (let h = 0; h < 7; h++) world.set(cx + dx, y + h, cz + dz, Block.Air);
      world.set(cx + dx, y - 1, cz + dz, Block.Sand);
      if (d > 8.2 && (dx * 3 + dz) % 4 === 0) for (let h = 0; h < 2; h++) world.set(cx + dx, y + h, cz + dz, Block.Sandstone);
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

export function generateDesert(seed = DESERT_SEED): DesertLayout {
  const size = DESERT_SIZE;
  const world = new VoxelWorld(size, WORLD_HEIGHT, size);
  const noise = new Noise2D(seed);
  const rng = createRng(seed ^ 0x5eed);
  const flat: (Point2 & { r: number })[] = [...Object.values(PADS), { x: ARCH.x, z: ARCH.z - 4, r: 9 }];
  const heights = new Int32Array(size * size);

  // Dunes : ondulations douces, aplanies autour des lieux.
  for (let z = 0; z < size; z++)
    for (let x = 0; x < size; x++) {
      let h = BASE_Y + 1.8 * Math.sin(x / 9 + noise.fbm(x / 40, z / 40, 2)) * Math.cos(z / 11) + noise.fbm(x / 30, z / 30, 2) * 1.5;
      const edge = Math.min(x, z, size - 1 - x, size - 1 - z);
      if (edge < 7) h += (7 - edge) * 1.2;
      for (const p of flat) h = h + (BASE_Y - h) * (1 - smoothstep(p.r, p.r + 8, dist(p, x, z)));
      heights[z * size + x] = Math.round(h);
    }
  for (let z = 0; z < size; z++)
    for (let x = 0; x < size; x++) {
      const h = heights[z * size + x];
      for (let y = 0; y < h; y++) world.set(x, y, z, y >= h - 3 ? Block.Sand : Block.Sandstone);
    }

  // Chemins de grès entre l'arche, l'oasis et les autres lieux.
  const lines: Point2[][] = [
    [{ x: ARCH.x, z: ARCH.z - 4 }, { x: 54, z: 90 }, { x: PADS.village.x, z: PADS.village.z }],
    [{ x: PADS.village.x, z: PADS.village.z }, { x: 74, z: 44 }, { x: PADS.sanctuary.x - 6, z: PADS.sanctuary.z + 9 }],
    [{ x: 74, z: 44 }, { x: 90, z: 72 }, { x: PADS.arena.x - 2, z: PADS.arena.z - 9 }],
    [{ x: PADS.village.x - 4, z: PADS.village.z - 6 }, { x: 30, z: 38 }, { x: PADS.bossLair.x + 6, z: PADS.bossLair.z + 8 }],
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
          if (world.get(x, top, z) === Block.Sand) world.set(x, top, z, Block.Path);
        }
      }
    }

  // Oasis de Palmebloc : un étang, trois maisons de grès, l'abreuvoir et la source.
  const v = PADS.village;
  for (let dz = -7; dz <= 7; dz++)
    for (let dx = -7; dx <= 7; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > 7) continue;
      for (let h = 0; h < 5; h++) world.set(v.x + dx, BASE_Y + h, v.z + dz, Block.Air);
      world.set(v.x + dx, BASE_Y - 1, v.z + dz, d < 3.2 ? Block.Water : d < 4.4 ? Block.Grass : Block.Sand);
      if (d < 3.2) world.set(v.x + dx, BASE_Y - 2, v.z + dz, Block.Sand);
    }
  buildHut(world, v.x - 13, v.z - 9, BASE_Y, 5, 5);
  buildHut(world, v.x + 8, v.z - 10, BASE_Y, 6, 5);
  buildHut(world, v.x - 12, v.z + 6, BASE_Y, 5, 4);
  const village: DesertVillagePlan = {
    npcs: [
      { id: 'oasia', x: v.x + 0.5, z: v.z + 5.5, facing: 0 },
      { id: 'zephir', x: v.x + 7.5, z: v.z + 2.5, facing: -Math.PI / 2 },
    ],
    guardians: [
      { x: v.x - 6.5, z: v.z + 9.5, facing: 0 },
      { x: v.x + 7.5, z: v.z + 9.5, facing: 0 },
    ],
    lantern: { x: v.x - 4.5, z: v.z + 5.5 },
    spring: { x: v.x - 4.5, z: v.z - 1.5 },
    trough: { x: v.x + 4.5, z: v.z - 5.5 },
    cart: { x: v.x + 12.5, z: v.z + 4.5 },
    cartCrates: [{ x: v.x + 11.5, z: v.z + 6.5 }, { x: v.x + 13.5, z: v.z + 6.5 }, { x: v.x + 12.5, z: v.z + 2.5 }],
    pen: { x: v.x - 8, z: v.z + 1, r: 3 },
  };
  for (const [dx, dz] of [[-5, -5], [5, 5], [-5, 4], [6, -3]]) buildPalm(world, v.x + dx, BASE_Y, v.z + dz, randInt(rng, 5, 6));

  const temple = buildTemple(world, PADS.sanctuary.x, PADS.sanctuary.z, BASE_Y);
  const arena = buildArena(world, PADS.arena.x, PADS.arena.z, BASE_Y);
  const pit = buildPit(world, PADS.bossLair.x, PADS.bossLair.z, BASE_Y);
  // Le vieux puits du camp des scorpions.
  const well = { x: CAMP_SPOTS[0].x - 3.5, z: CAMP_SPOTS[0].z - 2.5 };
  for (const [dx, dz] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
    const x = Math.floor(well.x) + dx;
    const z = Math.floor(well.z) + dz;
    world.set(x, world.surfaceY(x, z), z, Block.Sandstone);
  }

  // Palmiers et cactus dans les dunes, hors des lieux, des chemins et des camps.
  const keepClear: (Point2 & { r: number })[] = [
    ...Object.values(PADS).map((p) => ({ ...p, r: p.r + 4 })),
    ...CAMP_SPOTS.map((c) => ({ x: c.x, z: c.z, r: 6 })),
    { x: ARCH.x, z: ARCH.z - 4, r: 12 },
  ];
  const clear = (x: number, z: number): boolean => {
    if (x < 5 || z < 5 || x > size - 7 || z > size - 7) return false;
    for (const c of keepClear) if (dist(c, x, z) < c.r) return false;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (onPath[(z + dz) * size + (x + dx)]) return false;
    return true;
  };
  for (let n = 0, attempt = 0; attempt < 900 && n < 70; attempt++) {
    const x = randInt(rng, 5, size - 7);
    const z = randInt(rng, 5, size - 7);
    if (!clear(x, z)) continue;
    const y = world.surfaceY(x, z);
    if (rng() < 0.35) buildPalm(world, x, y, z, randInt(rng, 5, 7));
    else for (let h = 0; h < randInt(rng, 2, 3); h++) world.set(x, y + h, z, Block.Cactus);
    n++;
  }
  const decorations: Decoration[] = [];
  for (let attempt = 0; attempt < 1500; attempt++) {
    const x = randInt(rng, 2, size - 3);
    const z = randInt(rng, 2, size - 3);
    if (onPath[z * size + x] || dist(v, x, z) < 8) continue;
    const y = world.surfaceY(x, z);
    if (world.get(x, y - 1, z) !== Block.Sand || world.get(x, y, z) !== Block.Air) continue;
    decorations.push({ x: x + 0.5, y, z: z + 0.5, tile: Tile.DeadBush });
  }

  // Objets posés sur des cases libres.
  const taken: Point2[] = [];
  const free = (x: number, z: number): boolean => {
    if (x < 3 || z < 3 || x > size - 4 || z > size - 4) return false;
    const y = world.surfaceY(x, z);
    const below = world.get(x, y - 1, z);
    if ((below !== Block.Sand && below !== Block.Path && below !== Block.Grass) || world.get(x, y, z) !== Block.Air || world.get(x, y + 1, z) !== Block.Air) return false;
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
  const crates: DesertLayout['crates'] = [];
  for (let attempt = 0; attempt < 3000 && crates.length < CRATE_COUNT; attempt++) {
    const x = randInt(rng, 8, size - 9);
    const z = randInt(rng, 8, size - 9);
    if (onPath[z * size + x] || !free(x, z)) continue;
    if (Object.values(PADS).some((p) => dist(p, x, z) < p.r + 2) || CAMP_SPOTS.some((c) => dist(c, x, z) < 5) || crates.some((c) => dist(c, x, z) < 7)) continue;
    taken.push({ x: x + 0.5, z: z + 0.5 });
    crates.push({ id: `desert-caisse-${crates.length}`, x: x + 0.5, y: world.surfaceY(x, z), z: z + 0.5 });
  }
  const mapPieces = [near(86, 30), near(30, 104), near(110, 108)];
  const camel = near(80, 100);
  const drums = [near(32, 40), near(30, 34), near(29, 28)];
  const crystal = near(12, 114);

  const at = (p: Point2): { x: number; y: number; z: number } => ({ x: p.x, y: world.surfaceY(Math.floor(p.x), Math.floor(p.z)), z: p.z });
  const arrival = { x: ARCH.x, z: ARCH.z - 8, facing: 0 };
  const camps: Camp[] = CAMP_SPOTS.map((c) => ({ ...c, chest: { x: c.x + 0.5, z: c.z - 2.5 } }));
  return {
    id: 'desert',
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
      { id: 'desert-village', ...at(village.lantern) },
      { id: 'desert-temple', ...at({ x: temple.entrance.x + 2, z: temple.entrance.z + 1 }) },
      { id: 'desert-fosse', ...at({ x: PADS.bossLair.x + 9.5, z: PADS.bossLair.z + 12.5 }) },
      { id: 'desert-arche', ...at({ x: ARCH.x + 3.5, z: ARCH.z - 1.5 }) },
    ],
    arch: ARCH,
    arrival,
    landmarks: { village: v, sanctuary: PADS.sanctuary, arena: PADS.arena, bossLair: PADS.bossLair },
    village,
    temple,
    arena,
    pit,
    crystal,
    mapPieces,
    camel,
    drums,
    well,
  };
}
