import type { BiomeId } from '../core/gameState';
import type { MonsterSpecies } from '../data/creatures';
import type { TileId } from './blocks';
import type { VoxelWorld } from './voxelWorld';

/**
 * Ce que tout biome fournit au jeu : le monde de blocs, la végétation, les camps, les caisses,
 * les lanternes, les PNJ et l'arche (Arche des éclats dans la Prairie, arche de retour ailleurs).
 * Chaque biome y ajoute ses propres lieux (village, sanctuaire, arène, repaire du boss…).
 */

export interface Point2 {
  x: number;
  z: number;
}

export interface Point3 extends Point2 {
  y: number;
}

/** Un point avec un cap (radians, 0 = regarde vers −Z). */
export interface Spot extends Point2 {
  facing: number;
}

export interface Decoration {
  x: number;
  y: number;
  z: number;
  tile: TileId;
}

export interface Camp {
  id: string;
  x: number;
  z: number;
  monsters: MonsterSpecies[];
  chest: { x: number; z: number };
  /** Monstres renforcés (PV et ATQ multipliés) : les gardiens du Volcan d'Ombre. */
  strength?: number;
}

export interface NpcSpot extends Spot {
  id: string;
}

export interface WorldLayout {
  id: BiomeId;
  world: VoxelWorld;
  /** Départ quand on arrive pour la première fois sans point de retour. */
  spawn: Point3;
  /** Angle de départ de la caméra. */
  spawnYaw: number;
  /** Couleur du ciel et du brouillard. */
  sky: number;
  decorations: Decoration[];
  /** Zones sûres (villages) : les monstres n'y entrent pas. */
  safeZones: (Point2 & { r: number })[];
  npcs: NpcSpot[];
  /** Golems gardiens décoratifs du village. */
  guardians: Spot[];
  camps: Camp[];
  crates: { id: string; x: number; y: number; z: number }[];
  lanterns: { id: string; x: number; y: number; z: number }[];
  /** L'arche du biome, et l'endroit où l'on apparaît en la traversant. */
  arch: Spot;
  arrival: Spot;
}
