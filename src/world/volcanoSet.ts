import { Block } from './blocks';
import { VoxelWorld, WORLD_HEIGHT } from './voxelWorld';

/**
 * Décor de cinématique : le Volcan d'Ombre (outro finale O6). Un petit monde à part, construit
 * pour la cinématique puis libéré : un cône de roche noire, un cratère de lave, trois rivières
 * de lave sur les pentes et une plaine de cendre semée de rochers.
 */
export interface VolcanoSet {
  world: VoxelWorld;
  /** Centre du cratère (x, z) et hauteur du bord. */
  crater: { x: number; z: number; rimY: number; lavaY: number };
}

export const VOLCANO_SIZE = 64;
const CENTER = { x: 32, z: 30 };
const PLAIN_Y = 4;
const CRATER_R = 5;
const BASE_R = 24;
const RIM_Y = 22;
const LAVA_Y = 17;
/** Directions des rivières de lave (radians, 0 = +X). */
const RIVERS = [0.6, 1.9, 2.9];

/** Petit relief déterministe (sans aléatoire : le décor est toujours le même). */
function bump(x: number, z: number): number {
  return Math.sin(x * 0.7 + z * 0.3) * 0.6 + Math.sin(z * 0.9 - x * 0.4) * 0.5;
}

/** Hauteur du sol (premier bloc vide) à la distance d du centre. */
export function volcanoHeight(x: number, z: number): number {
  const d = Math.hypot(x + 0.5 - CENTER.x, z + 0.5 - CENTER.z);
  if (d < CRATER_R) return LAVA_Y;
  if (d > BASE_R) return PLAIN_Y + (bump(x, z) > 0.8 ? 1 : 0);
  const k = 1 - (d - CRATER_R) / (BASE_R - CRATER_R);
  return Math.round(PLAIN_Y + (RIM_Y - PLAIN_Y) * Math.pow(k, 1.3) + bump(x, z) * 0.8);
}

function onRiver(x: number, z: number): boolean {
  const dx = x + 0.5 - CENTER.x;
  const dz = z + 0.5 - CENTER.z;
  const d = Math.hypot(dx, dz);
  if (d < CRATER_R + 0.5 || d > BASE_R + 4) return false;
  const a = Math.atan2(dz, dx);
  return RIVERS.some((r) => {
    // La rivière serpente un peu en descendant.
    const wiggle = Math.sin(d * 0.45 + r * 3) * 0.12;
    let diff = a - (r + wiggle);
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) * d < 1.1;
  });
}

export function buildVolcanoSet(): VolcanoSet {
  const world = new VoxelWorld(VOLCANO_SIZE, WORLD_HEIGHT, VOLCANO_SIZE);
  for (let z = 0; z < VOLCANO_SIZE; z++)
    for (let x = 0; x < VOLCANO_SIZE; x++) {
      const h = volcanoHeight(x, z);
      const d = Math.hypot(x + 0.5 - CENTER.x, z + 0.5 - CENTER.z);
      world.fill(x, 0, z, x, h - 2, z, Block.Basalt);
      let top: number = d > BASE_R - 2 ? Block.Ash : Block.Basalt;
      if (d < CRATER_R || onRiver(x, z)) top = Block.Lava;
      world.set(x, h - 1, z, top);
    }
  // Rochers noirs dans la plaine de cendre.
  for (let i = 0; i < 18; i++) {
    const a = i * 2.39996;
    const r = BASE_R + 3 + ((i * 37) % 6);
    const x = Math.round(CENTER.x + Math.cos(a) * r);
    const z = Math.round(CENTER.z + Math.sin(a) * r);
    if (!world.inBounds(x, 0, z)) continue;
    const y = volcanoHeight(x, z);
    const tall = 1 + (i % 3);
    world.fill(x, y, z, x, y + tall - 1, z, Block.Basalt);
    if (i % 2 === 0) world.set(x + 1, y, z, Block.Basalt);
  }
  return { world, crater: { x: CENTER.x + 0.5, z: CENTER.z + 0.5, rimY: RIM_Y, lavaY: LAVA_Y } };
}
