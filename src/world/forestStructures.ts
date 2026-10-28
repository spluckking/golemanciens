import { Block } from './blocks';
import type { NpcSpot, Point2, Spot } from './layout';
import type { Cell, FightStage } from './structures';
import type { VoxelWorld } from './voxelWorld';

/**
 * Constructions de la Forêt Murmurante (chapitre 2) : le village perché des Cabanes des Cimes,
 * les ponts du ruisseau, le repaire de la Reine Araignée et les ruines du sanctuaire de Mousse.
 */

/** Plateforme dans les arbres : centre et hauteur où l'on se tient. */
export interface Platform {
  x: number;
  z: number;
  /** Hauteur des pieds sur la plateforme. */
  y: number;
  half: number;
}

export interface TreeVillagePlan {
  npcs: NpcSpot[];
  guardians: Spot[];
  lantern: Point2;
  platforms: Platform[];
  /** La cabane la plus haute (quête « La lettre du hibou »). */
  highCabin: { x: number; y: number; z: number };
  /** Là où la lanterne de Pip est tombée (quête R1). */
  pipLantern: Point2;
}

/** Pont de planches cassé du ruisseau (quête « Le pont cassé ») : les cases manquantes. */
export interface BrokenBridge {
  gap: Cell[];
  x: number;
  z: number;
}

export interface LairPlan extends FightStage {
  /** Où attend la Reine Araignée, sous sa toile. */
  boss: { x: number; z: number };
}

/** Pose une plateforme carrée de planches (surface à y − 1) et dégage l'air au-dessus. */
function platform(world: VoxelWorld, cx: number, cz: number, y: number, half: number): void {
  for (let dx = -half; dx <= half; dx++)
    for (let dz = -half; dz <= half; dz++) {
      const x = cx + dx;
      const z = cz + dz;
      if (world.get(x, y - 1, z) !== Block.Log) world.set(x, y - 1, z, Block.Plank);
      for (let h = 0; h < 3; h++) if (world.get(x, y + h, z) === Block.Leaves) world.set(x, y + h, z, Block.Air);
    }
}

/** Passerelle de planches de 2 de large entre deux points, à la hauteur y (pieds). */
function walkway(world: VoxelWorld, a: Point2, b: Point2, y: number): void {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) * 2);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const px = Math.round(a.x + (b.x - a.x) * t);
    const pz = Math.round(a.z + (b.z - a.z) * t);
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const x = px + dx;
      const z = pz + dz;
      if (world.get(x, y - 1, z) !== Block.Log) world.set(x, y - 1, z, Block.Plank);
      for (let h = 0; h < 3; h++) if (world.get(x, y + h, z) === Block.Leaves) world.set(x, y + h, z, Block.Air);
    }
  }
}

/**
 * Escalier droit de 2 de large : part de (x0, z0) au sol (pieds à fromY) et monte d'un bloc par
 * case dans la direction (dx, dz) jusqu'à toY. Le héros monte les marches tout seul.
 */
function stairs(world: VoxelWorld, x0: number, z0: number, dx: number, dz: number, fromY: number, toY: number): void {
  const n = toY - fromY;
  for (let k = 1; k <= n; k++) {
    const x = x0 + dx * k;
    const z = z0 + dz * k;
    for (const w of [0, 1]) {
      const sx = x + (dz !== 0 ? w : 0);
      const sz = z + (dx !== 0 ? w : 0);
      for (let y = fromY - 1; y < fromY + k; y++) world.set(sx, y, sz, y === fromY + k - 1 ? Block.Plank : Block.Log);
      for (let h = 0; h < 3; h++) world.set(sx, fromY + k + h, sz, Block.Air);
    }
  }
}

/** Grand tronc de 2×2 jusqu'à la hauteur donnée, avec sa couronne de feuilles au-dessus. */
function trunk(world: VoxelWorld, x: number, groundY: number, z: number, height: number, crown: number): void {
  for (let y = groundY; y < groundY + height; y++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) world.set(x + dx, y, z + dz, Block.Log);
  const top = groundY + height;
  for (let dy = 0; dy < 3; dy++) {
    const r = crown - dy;
    for (let dx = -r; dx <= r + 1; dx++)
      for (let dz = -r; dz <= r + 1; dz++) {
        if ((dx - 0.5) ** 2 + (dz - 0.5) ** 2 > (r + 0.6) ** 2) continue;
        if (world.get(x + dx, top + dy, z + dz) === Block.Air) world.set(x + dx, top + dy, z + dz, Block.Leaves);
      }
  }
}

/** Cabane de planches sur une plateforme : murs bas, porte au sud, toit de feuillage. */
function cabin(world: VoxelWorld, cx: number, cz: number, y: number): void {
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++) {
      const edge = Math.abs(dx) === 1 || Math.abs(dz) === 1;
      const door = dx === 0 && dz === 1;
      for (let h = 0; h < 2; h++) world.set(cx + dx, y + h, cz + dz, edge && !door ? (Math.abs(dx) === 1 && Math.abs(dz) === 1 ? Block.Log : Block.Plank) : Block.Air);
      world.set(cx + dx, y + 2, cz + dz, Block.Leaves);
    }
}

/**
 * Cabanes des Cimes : une place au sol (chef Sage Noisette), un grand chêne central avec sa
 * plateforme, deux cabanes reliées par des passerelles et la cabane la plus haute, au-dessus.
 * (cx, cz) = centre de la place, floorY = sol.
 */
export function buildTreeVillage(world: VoxelWorld, cx: number, cz: number, floorY: number): TreeVillagePlan {
  for (let dx = -6; dx <= 6; dx++)
    for (let dz = -6; dz <= 6; dz++) {
      if (dx * dx + dz * dz > 30) continue;
      world.set(cx + dx, floorY - 1, cz + dz, Block.Path);
      for (let y = floorY; y < floorY + 4; y++) if (world.get(cx + dx, y, cz + dz) !== Block.Log) world.set(cx + dx, y, cz + dz, Block.Air);
    }
  const P = floorY + 6;
  const central = { x: cx + 1, z: cz - 9 };
  const west = { x: cx - 10, z: cz - 12 };
  const east = { x: cx + 12, z: cz - 6 };
  const high = { x: cx - 2, z: cz - 21 };
  trunk(world, central.x, floorY, central.z, 14, 5);
  trunk(world, west.x, floorY, west.z, 12, 4);
  trunk(world, east.x, floorY, east.z, 12, 4);
  trunk(world, high.x, floorY, high.z, 17, 4);
  platform(world, central.x, central.z, P, 3);
  platform(world, west.x, west.z, P, 3);
  platform(world, east.x, east.z, P, 3);
  platform(world, high.x, high.z, P + 4, 3);
  walkway(world, central, west, P);
  walkway(world, central, east, P);
  // Escalier depuis la place jusqu'à la plateforme centrale (côté sud), puis vers la cabane haute.
  stairs(world, central.x, central.z + 9, 0, -1, floorY, P);
  stairs(world, central.x - 1, central.z - 3, 0, -1, P, P + 4);
  walkway(world, { x: central.x - 1, z: central.z - 8 }, { x: high.x, z: high.z + 2 }, P + 4);
  // Les cabanes se posent à côté du tronc, au nord-ouest de chaque plateforme, porte au sud.
  cabin(world, west.x - 2, west.z - 2, P);
  cabin(world, east.x - 2, east.z - 2, P);
  cabin(world, high.x - 2, high.z - 2, P + 4);

  const platforms: Platform[] = [
    { ...central, y: P, half: 3 },
    { ...west, y: P, half: 3 },
    { ...east, y: P, half: 3 },
    { ...high, y: P + 4, half: 3 },
  ];
  return {
    npcs: [
      { id: 'noisette', x: cx + 0.5, z: cz + 2.5, facing: 0 },
      { id: 'pip', x: cx - 3.5, z: cz + 3.5, facing: 0.5 },
    ],
    guardians: [
      { x: cx - 6.5, z: cz + 5.5, facing: 0 },
      { x: cx + 7.5, z: cz + 5.5, facing: 0 },
    ],
    lantern: { x: cx + 4.5, z: cz + 3.5 },
    platforms,
    highCabin: { x: high.x - 1.5, y: P + 4, z: high.z - 1.5 },
    pipLantern: { x: cx + 18.5, z: cz - 22.5 },
  };
}

/** Pont de planches au ras de l'eau, de part et d'autre du ruisseau ; sans le milieu s'il est cassé. */
export function buildBridge(world: VoxelWorld, x: number, z0: number, z1: number, waterY: number, broken: boolean): Cell[] {
  const gap: Cell[] = [];
  const mid = Math.round((z0 + z1) / 2);
  for (let z = z0; z <= z1; z++)
    for (let dx = 0; dx <= 1; dx++) {
      const missing = broken && Math.abs(z - mid) <= 1;
      if (missing) gap.push({ x: x + dx, y: waterY, z });
      else world.set(x + dx, waterY, z, Block.Plank);
    }
  return gap;
}

/**
 * Repaire de la Reine Araignée : une clairière sombre au cœur de la forêt, sol de terre et de
 * mousse, entourée de troncs. La toile géante (modèle) est posée par la vie du biome.
 */
export function buildLair(world: VoxelWorld, cx: number, cz: number, floorY: number): LairPlan {
  for (let dz = -9; dz <= 9; dz++)
    for (let dx = -9; dx <= 9; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > 9) continue;
      for (let y = floorY; y < floorY + 7; y++) world.set(cx + dx, y, cz + dz, Block.Air);
      world.set(cx + dx, floorY - 1, cz + dz, d < 5 ? Block.Dirt : Block.Grass);
    }
  // Troncs morts autour de la clairière (sauf l'entrée, au sud-est).
  for (let a = 0; a < 10; a++) {
    const ang = (a / 10) * Math.PI * 2;
    if (ang > 0.2 && ang < 1.3) continue;
    const x = Math.round(cx + Math.cos(ang) * 10);
    const z = Math.round(cz + Math.sin(ang) * 10);
    for (let y = floorY; y < floorY + 6; y++) world.set(x, y, z, Block.Log);
  }
  return {
    boss: { x: cx + 0.5, z: cz - 2.5 },
    golemSpot: { x: cx + 3.5, z: cz + 0.5 },
    monsterSpot: { x: cx - 2.5, z: cz + 0.5 },
    center: { x: cx + 0.5, z: cz + 0.5 },
    floorY,
    view: 1,
  };
}

/**
 * Ruines du sanctuaire de Mousse : un enclos de pierre moussue de 15 × 13, ouvert à l'ouest,
 * et un petit temple au fond. Les énigmes (leviers, canaux, pierres) sont posées à la sous-étape 2.4.
 */
export function buildMossRuins(world: VoxelWorld, cx: number, cz: number, floorY: number): { entrance: Point2; nest: Point2 } {
  for (let dx = -7; dx <= 7; dx++)
    for (let dz = -6; dz <= 6; dz++) {
      const x = cx + dx;
      const z = cz + dz;
      for (let y = floorY; y < floorY + 6; y++) world.set(x, y, z, Block.Air);
      world.set(x, floorY - 1, z, Block.MossStone);
      const wall = Math.abs(dx) === 7 || Math.abs(dz) === 6;
      const entrance = dx === -7 && Math.abs(dz) <= 1;
      // Murs en ruine : hauteur irrégulière.
      if (wall && !entrance) for (let y = floorY; y < floorY + 2 + ((dx * 3 + dz * 5) & 1); y++) world.set(x, y, z, Block.MossStone);
    }
  // Temple du fond : 5 × 5, toit de pierre moussue, porte vers l'ouest.
  for (let dx = 3; dx <= 7; dx++)
    for (let dz = -2; dz <= 2; dz++) {
      const edge = dx === 3 || dx === 7 || Math.abs(dz) === 2;
      const door = dx === 3 && dz === 0;
      for (let y = floorY; y < floorY + 3; y++) world.set(cx + dx, y, cz + dz, edge && !door ? Block.MossStone : Block.Air);
      world.set(cx + dx, floorY + 3, cz + dz, Block.MossStone);
    }
  return { entrance: { x: cx - 8.5, z: cz + 0.5 }, nest: { x: cx + 5.5, z: cz + 0.5 } };
}
