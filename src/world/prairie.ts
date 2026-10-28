import { createRng, randInt } from '../core/rng';
import { Block, Tile, type TileId } from './blocks';
import type { Camp, Decoration, Point2, WorldLayout } from './layout';
import { Noise2D } from './noise';
import { buildAcademy, buildArena, buildMarsh, buildSanctuary, buildTree, buildVillage, type ArenaPlan, type MarshPlan, type SanctuaryPlan, type VillagePlan } from './structures';
import { VoxelWorld, WORLD_HEIGHT } from './voxelWorld';

export const PRAIRIE_SIZE = 128;
export const PRAIRIE_SEED = 20261027;
const WATER_LEVEL = 9;
const ACADEMY_FLOOR = 16;

export type { Camp, Decoration, Point2 } from './layout';

export type LandmarkId = 'academy' | 'village' | 'arena' | 'sanctuary' | 'bossLair';

/** La Prairie de Cubeterre : le biome commun, plus l'Académie, la ferme, la maison et les lieux du chapitre 1. */
export interface PrairieLayout extends WorldLayout {
  id: 'prairie';
  /** Point autour duquel tourne la caméra de l'écran titre : devant l'Académie. */
  titleSpot: { x: number; y: number; z: number };
  /** Emplacements réservés : les structures seront construites aux sous-étapes 1.3 et 1.4. */
  landmarks: Record<LandmarkId, Point2>;
  academyDoor: { x: number; y: number; z: number };
  village: VillagePlan;
  sanctuary: SanctuaryPlan;
  arena: ArenaPlan;
  marsh: MarshPlan;
  /** Flaques vertes de la piste gluante (quête P1), du village au marais. */
  slimeTrail: Point2[];
  /** Position de Lumibloc au chapitre 1 : devant la maison du joueur. */
  lumibloc: { x: number; z: number; facing: number };
  /** Emplacements des objets des quêtes du village (sur l'herbe, dégagés). */
  questSpots: { chickens: Point2[]; keyCrate: Point2; flowers: Point2[] };
}

interface Pad extends Point2 {
  r: number;
}

const ACADEMY: Pad = { x: 64, z: 26, r: 13 };
const PADS: Record<Exclude<LandmarkId, 'academy'>, Pad> = {
  village: { x: 36, z: 86, r: 14 },
  arena: { x: 24, z: 42, r: 9 },
  sanctuary: { x: 113, z: 100, r: 7 },
  bossLair: { x: 18, z: 114, r: 9 },
};
const BRIDGE_Z = 100;
/** Arche des éclats : sur la place de l'Académie, à l'est du chemin (SPEC.md § 1.3). */
const ARCH = { x: 73.5, z: 40.5, facing: -Math.PI / 2 };
const SKY_COLOR = 0x9fd8ff;

/** Camps de monstres de la phase 1 (1 ou 2 monstres chacun). Le camp des slimes est près du champ de blé. */
const CAMPS: Omit<Camp, 'chest'>[] = [
  { id: 'slimes', x: 13, z: 80, monsters: ['slime', 'slime'] },
  { id: 'zombies', x: 60, z: 108, monsters: ['zombie'] },
  { id: 'spiders', x: 86, z: 40, monsters: ['spider', 'spider'] },
  { id: 'mixed', x: 76, z: 90, monsters: ['zombie', 'slime'] },
];
const LANTERN_SPOTS: Record<string, Point2> = {
  sanctuary: { x: 103.5, z: 104.5 },
  bossLair: { x: 25.5, z: 107.5 },
};
const CRATE_COUNT = 20;

export function riverX(z: number): number {
  return 101 + 5 * Math.sin(z / 17);
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function dist(a: Point2, x: number, z: number): number {
  return Math.hypot(x - a.x, z - a.z);
}

/** Génère la Prairie de Cubeterre (graine fixe : le relief est toujours le même). */
export function generatePrairie(seed = PRAIRIE_SEED): PrairieLayout {
  const size = PRAIRIE_SIZE;
  const world = new VoxelWorld(size, WORLD_HEIGHT, size);
  const noise = new Noise2D(seed);
  const rng = createRng(seed ^ 0x5eed);

  const natural = (x: number, z: number): number => {
    let h = 11 + noise.fbm(x / 42, z / 42, 3) * 3;
    const edge = Math.min(x, z, size - 1 - x, size - 1 - z);
    if (edge < 7) h += (7 - edge) * 1.1;
    return Math.max(WATER_LEVEL, h);
  };

  const pads = Object.values(PADS).map((p) => ({ ...p, target: Math.round(natural(p.x, p.z)) }));
  const heights = new Int32Array(size * size);

  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      let h = natural(x, z);
      const dA = dist(ACADEMY, x, z);
      h = h + (ACADEMY_FLOOR - h) * (1 - smoothstep(ACADEMY.r, ACADEMY.r + 14, dA));
      for (const p of pads) {
        const d = dist(p, x, z);
        h = h + (p.target - h) * (1 - smoothstep(p.r, p.r + 6, d));
      }
      let hi = Math.round(h);
      const dr = Math.abs(x - riverX(z));
      if (dr < 2.6) hi = WATER_LEVEL - 1;
      else if (dr < 7) hi = Math.max(WATER_LEVEL, Math.min(hi, WATER_LEVEL + Math.floor(dr - 2.6)));
      heights[z * size + x] = Math.min(hi, WORLD_HEIGHT - 6);
    }
  }

  // Remplissage : pierre, terre, herbe (ou sable près de la rivière), puis l'eau.
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const h = heights[z * size + x];
      const sandy = Math.abs(x - riverX(z)) < 4.5;
      for (let y = 0; y < h; y++) {
        let b: number = Block.Stone;
        if (y === h - 1) b = sandy ? Block.Sand : Block.Grass;
        else if (y >= h - 3) b = sandy ? Block.Sand : Block.Dirt;
        world.set(x, y, z, b);
      }
      for (let y = h; y < WATER_LEVEL; y++) world.set(x, y, z, Block.Water);
    }
  }

  // Chemins de terre battue.
  const pathPoints: Point2[][] = [
    [{ x: 64, z: 34 }, { x: 64, z: 46 }, { x: 50, z: 66 }, { x: 36, z: 86 }],
    [{ x: 64, z: 46 }, { x: 40, z: 44 }, { x: 24, z: 42 }],
    [{ x: 64, z: 46 }, { x: 82, z: 70 }, { x: 92, z: BRIDGE_Z }, { x: 113, z: BRIDGE_Z }],
    [{ x: 36, z: 86 }, { x: 24, z: 104 }, { x: 18, z: 114 }],
  ];
  const onPath = new Uint8Array(size * size);
  for (const line of pathPoints) {
    for (let k = 0; k < line.length - 1; k++) {
      const a = line[k];
      const b = line[k + 1];
      const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) * 2);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = a.x + (b.x - a.x) * t;
        const pz = a.z + (b.z - a.z) * t;
        for (let dx = -1; dx <= 1; dx++)
          for (let dz = -1; dz <= 1; dz++) {
            const x = Math.round(px + dx);
            const z = Math.round(pz + dz);
            if (x < 0 || z < 0 || x >= size || z >= size) continue;
            onPath[z * size + x] = 1;
            const top = world.surfaceY(x, z) - 1;
            if (world.get(x, top, z) === Block.Grass) world.set(x, top, z, Block.Path);
          }
      }
    }
  }

  // Pont de planches sur la rivière.
  const rx = Math.round(riverX(BRIDGE_Z));
  for (let x = rx - 5; x <= rx + 5; x++) {
    for (let z = BRIDGE_Z - 1; z <= BRIDGE_Z + 1; z++) {
      if (world.get(x, WATER_LEVEL - 1, z) === Block.Water) world.set(x, WATER_LEVEL - 1, z, Block.Plank);
    }
  }

  const door = buildAcademy(world, ACADEMY.x, ACADEMY.z, ACADEMY_FLOOR);
  const villageFloor = world.surfaceY(PADS.village.x, PADS.village.z);
  const village = buildVillage(world, PADS.village.x, PADS.village.z, villageFloor);
  const sanctuaryFloor = world.surfaceY(PADS.sanctuary.x - 4, PADS.sanctuary.z);
  const sanctuary = buildSanctuary(world, PADS.sanctuary.x, PADS.sanctuary.z, sanctuaryFloor);
  const arena = buildArena(world, PADS.arena.x, PADS.arena.z, world.surfaceY(PADS.arena.x, PADS.arena.z));
  const marsh = buildMarsh(world, PADS.bossLair.x, PADS.bossLair.z, world.surfaceY(PADS.bossLair.x, PADS.bossLair.z));

  // Camps : sol piétiné, coffre au bord du camp.
  const camps: Camp[] = CAMPS.map((c) => {
    for (let dx = -3; dx <= 3; dx++)
      for (let dz = -3; dz <= 3; dz++) {
        if (dx * dx + dz * dz > 10) continue;
        const top = world.surfaceY(c.x + dx, c.z + dz) - 1;
        if (world.get(c.x + dx, top, c.z + dz) === Block.Grass) world.set(c.x + dx, top, c.z + dz, Block.Dirt);
      }
    return { ...c, chest: { x: c.x + 0.5, z: c.z - 2.5 } };
  });

  // Arbres, hors des zones réservées, des camps, des chemins et de la rivière.
  const clearZones: Pad[] = [
    { ...ACADEMY, r: ACADEMY.r + 4 },
    ...Object.values(PADS).map((p) => ({ ...p, r: p.r + 3 })),
    ...CAMPS.map((c) => ({ x: c.x, z: c.z, r: 5 })),
    { x: PADS.village.x - 17, z: PADS.village.z - 1, r: 7 },
    { x: ARCH.x, z: ARCH.z, r: 5 },
  ];
  const isClear = (x: number, z: number, margin: number): boolean => {
    if (x < 3 || z < 3 || x > size - 4 || z > size - 4) return false;
    if (Math.abs(x - riverX(z)) < 6) return false;
    for (const c of clearZones) if (dist(c, x, z) < c.r + margin) return false;
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++) if (onPath[(z + dz) * size + (x + dx)]) return false;
    return true;
  };
  const trees: Point2[] = [];
  for (let attempt = 0; attempt < 400 && trees.length < 75; attempt++) {
    const x = randInt(rng, 3, size - 4);
    const z = randInt(rng, 3, size - 4);
    if (!isClear(x, z, 1)) continue;
    if (trees.some((t) => Math.abs(t.x - x) < 5 && Math.abs(t.z - z) < 5)) continue;
    const ground = world.surfaceY(x, z);
    if (world.get(x, ground - 1, z) !== Block.Grass) continue;
    buildTree(world, x, ground, z, randInt(rng, 4, 5));
    trees.push({ x, z });
  }

  // Herbes hautes et fleurs (rendues en instances, pas en voxels).
  const decorations: Decoration[] = [];
  const flowerTiles: TileId[] = [Tile.FlowerRed, Tile.FlowerYellow, Tile.FlowerBlue, Tile.FlowerWhite];
  for (let attempt = 0; attempt < 6000; attempt++) {
    const x = randInt(rng, 2, size - 3);
    const z = randInt(rng, 2, size - 3);
    if (onPath[z * size + x]) continue;
    if (dist(ACADEMY, x, z) < ACADEMY.r - 1) continue;
    if (dist(PADS.village, x, z) < PADS.village.r - 1) continue;
    const y = world.surfaceY(x, z);
    if (world.get(x, y - 1, z) !== Block.Grass || world.get(x, y, z) !== Block.Air) continue;
    const flower = rng() < 0.2;
    decorations.push({
      x: x + 0.2 + rng() * 0.6,
      y,
      z: z + 0.2 + rng() * 0.6,
      tile: flower ? flowerTiles[randInt(rng, 0, flowerTiles.length - 1)] : Tile.GrassTuft,
    });
  }

  // Épis de blé du champ.
  const { wheat } = village;
  for (let x = wheat.x0; x <= wheat.x1; x++)
    for (let z = wheat.z0; z <= wheat.z1; z++) {
      const y = world.surfaceY(x, z);
      if (world.get(x, y - 1, z) !== Block.Dirt) continue;
      for (const [ox, oz] of [[0.3, 0.3], [0.7, 0.7]]) decorations.push({ x: x + ox, y, z: z + oz, tile: Tile.Wheat });
    }

  const titleX = ACADEMY.x;
  const titleZ = door.doorZ + 5;
  const { home } = village;

  // Caisses : la première juste devant la maison (tutoriel), les autres dispersées.
  const crates: PrairieLayout['crates'] = [];
  const crateSpots: Point2[] = [{ x: Math.floor(home.door.x) - 3, z: Math.floor(home.door.z) - 2 }];
  for (let attempt = 0; attempt < 2000 && crateSpots.length < CRATE_COUNT; attempt++) {
    const x = randInt(rng, 6, size - 7);
    const z = randInt(rng, 6, size - 7);
    if (onPath[z * size + x] || Math.abs(x - riverX(z)) < 5) continue;
    if (dist(ACADEMY, x, z) < ACADEMY.r + 2 || dist(PADS.village, x, z) < 9) continue;
    if (CAMPS.some((c) => dist(c, x, z) < 5) || crateSpots.some((c) => dist(c, x, z) < 7)) continue;
    const y = world.surfaceY(x, z);
    const below = world.get(x, y - 1, z);
    if ((below !== Block.Grass && below !== Block.Dirt) || world.get(x, y, z) !== Block.Air || world.get(x, y + 1, z) !== Block.Air) continue;
    crateSpots.push({ x, z });
  }
  crateSpots.forEach((c, i) => crates.push({ id: `crate-${i}`, x: c.x + 0.5, y: world.surfaceY(c.x, c.z), z: c.z + 0.5 }));

  // Objets de quêtes : la case d'herbe libre la plus proche de chaque point voulu.
  const taken: Point2[] = [];
  const clearSpot = (wx: number, wz: number, ground: number[] = [Block.Grass]): Point2 => {
    for (let r = 0; r < 12; r++)
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const x = wx + dx;
          const z = wz + dz;
          const y = world.surfaceY(x, z);
          if (!ground.includes(world.get(x, y - 1, z)) || world.get(x, y, z) !== Block.Air || world.get(x, y + 1, z) !== Block.Air) continue;
          if (onPath[z * size + x] || taken.some((t) => Math.abs(t.x - x - 0.5) < 2 && Math.abs(t.z - z - 0.5) < 2)) continue;
          if (crates.some((c) => Math.abs(c.x - x - 0.5) < 2 && Math.abs(c.z - z - 0.5) < 2)) continue;
          const p = { x: x + 0.5, z: z + 0.5 };
          taken.push(p);
          return p;
        }
    throw new Error(`Pas de place libre près de (${wx}, ${wz})`);
  };
  const questSpots = {
    chickens: [clearSpot(47, 74), clearSpot(53, 93), clearSpot(27, 104)],
    keyCrate: clearSpot(94, 60, [Block.Grass, Block.Sand]),
    flowers: [clearSpot(40, 66), clearSpot(46, 62), clearSpot(34, 62), clearSpot(52, 69), clearSpot(28, 68)],
  };

  // Piste gluante : des flaques le long du chemin, du village au marais (un peu de côté, en zigzag).
  const trailLine: Point2[] = [{ x: 31, z: 94 }, { x: 24, z: 104 }, { x: 20.5, z: 109.5 }];
  const slimeTrail: Point2[] = [];
  for (let k = 0; k < trailLine.length - 1; k++) {
    const a = trailLine[k];
    const b = trailLine[k + 1];
    const steps = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 3.2));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const side = (slimeTrail.length % 2 === 0 ? 1 : -1) * 0.8;
      slimeTrail.push({ x: a.x + (b.x - a.x) * t + side, z: a.z + (b.z - a.z) * t + side * 0.5 });
    }
  }

  const at = (p: Point2): { x: number; y: number; z: number } => ({ x: p.x, y: world.surfaceY(Math.floor(p.x), Math.floor(p.z)), z: p.z });
  const lanterns = [
    { id: 'village', ...at(village.lantern) },
    ...Object.entries(LANTERN_SPOTS).map(([id, p]) => ({ id, ...at(p) })),
  ];

  const lumibloc = { x: home.door.x + 2, z: home.door.z - 1.2, facing: Math.PI * 0.8 };
  // On arrive par l'arche en sortant devant elle, vers l'ouest (l'Académie).
  const arrival = { x: ARCH.x - 8, z: ARCH.z, facing: Math.PI / 2 };

  return {
    id: 'prairie',
    world,
    sky: SKY_COLOR,
    safeZones: [{ x: PADS.village.x, z: PADS.village.z, r: 14 }],
    npcs: [{ id: 'lumibloc', ...lumibloc }, ...village.npcs],
    guardians: village.guardians,
    arch: ARCH,
    arrival,
    spawn: { x: home.wake.x, y: villageFloor, z: home.wake.z },
    spawnYaw: home.wake.facing,
    titleSpot: { x: titleX + 0.5, y: world.surfaceY(titleX, titleZ), z: titleZ + 0.5 },
    landmarks: {
      academy: { x: ACADEMY.x, z: ACADEMY.z },
      village: { x: PADS.village.x, z: PADS.village.z },
      arena: { x: PADS.arena.x, z: PADS.arena.z },
      sanctuary: { x: PADS.sanctuary.x, z: PADS.sanctuary.z },
      bossLair: { x: PADS.bossLair.x, z: PADS.bossLair.z },
    },
    decorations,
    academyDoor: { x: door.doorX + 0.5, y: ACADEMY_FLOOR, z: door.doorZ + 0.5 },
    village,
    sanctuary,
    arena,
    marsh,
    slimeTrail,
    lumibloc,
    camps,
    crates,
    lanterns,
    questSpots,
  };
}
