import { createRng, randInt } from '../core/rng';
import { Block, Tile, type TileId } from './blocks';
import { Noise2D } from './noise';
import { buildAcademy, buildTree } from './structures';
import { VoxelWorld, WORLD_HEIGHT } from './voxelWorld';

export const PRAIRIE_SIZE = 128;
export const PRAIRIE_SEED = 20261027;
const WATER_LEVEL = 9;
const ACADEMY_FLOOR = 16;

export interface Point2 {
  x: number;
  z: number;
}

export interface Decoration {
  x: number;
  y: number;
  z: number;
  tile: TileId;
}

export type LandmarkId = 'academy' | 'village' | 'arena' | 'sanctuary' | 'bossLair';

export interface BiomeLayout {
  world: VoxelWorld;
  spawn: { x: number; y: number; z: number };
  /** Angle de départ de la caméra (radians, 0 = regarde vers -Z). */
  spawnYaw: number;
  /** Emplacements réservés : les structures seront construites aux sous-étapes 1.3 et 1.4. */
  landmarks: Record<LandmarkId, Point2>;
  decorations: Decoration[];
  academyDoor: { x: number; y: number; z: number };
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
export function generatePrairie(seed = PRAIRIE_SEED): BiomeLayout {
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

  // Arbres, hors des zones réservées, des chemins et de la rivière.
  const clearZones: Pad[] = [{ ...ACADEMY, r: ACADEMY.r + 4 }, ...Object.values(PADS).map((p) => ({ ...p, r: p.r + 3 }))];
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

  const spawnX = ACADEMY.x;
  const spawnZ = door.doorZ + 5;
  return {
    world,
    spawn: { x: spawnX + 0.5, y: world.surfaceY(spawnX, spawnZ), z: spawnZ + 0.5 },
    spawnYaw: 0,
    landmarks: {
      academy: { x: ACADEMY.x, z: ACADEMY.z },
      village: { x: PADS.village.x, z: PADS.village.z },
      arena: { x: PADS.arena.x, z: PADS.arena.z },
      sanctuary: { x: PADS.sanctuary.x, z: PADS.sanctuary.z },
      bossLair: { x: PADS.bossLair.x, z: PADS.bossLair.z },
    },
    decorations,
    academyDoor: { x: door.doorX + 0.5, y: ACADEMY_FLOOR, z: door.doorZ + 0.5 },
  };
}
