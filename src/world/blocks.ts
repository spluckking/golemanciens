/** Identifiants des blocs (un octet par voxel). */
export const Block = {
  Air: 0,
  Grass: 1,
  Dirt: 2,
  Stone: 3,
  Sand: 4,
  Water: 5,
  Log: 6,
  Leaves: 7,
  Plank: 8,
  Brick: 9,
  Roof: 10,
  Window: 11,
  Path: 12,
  Gold: 13,
  Door: 14,
  /** Volcan (finale) : roche noire, lave, cendre. */
  Basalt: 15,
  Lava: 16,
  Ash: 17,
  /** Forêt : pierre couverte de mousse (sanctuaire). */
  MossStone: 18,
  /** Désert : grès (temple, maisons) et cactus. */
  Sandstone: 19,
  Cactus: 20,
  /** Pics de Givre : neige, glace (lac, sanctuaire), briques de glace (igloos). */
  Snow: 21,
  Ice: 22,
  IceBrick: 23,
} as const;
export type BlockId = (typeof Block)[keyof typeof Block];

/** Tuiles de l'atlas (index = position dans une grille de ATLAS_COLS colonnes). */
export const Tile = {
  GrassTop: 0,
  GrassSide: 1,
  Dirt: 2,
  Stone: 3,
  Sand: 4,
  Water: 5,
  LogSide: 6,
  LogTop: 7,
  Leaves: 8,
  Plank: 9,
  Brick: 10,
  Roof: 11,
  Window: 12,
  Path: 13,
  Gold: 14,
  Door: 15,
  FlowerRed: 16,
  FlowerYellow: 17,
  FlowerBlue: 18,
  FlowerWhite: 19,
  GrassTuft: 20,
  Crate: 21,
  Chest: 22,
  Wheat: 23,
  Basalt: 24,
  Lava: 25,
  Ash: 26,
  MossStone: 27,
  Fern: 28,
  MushroomRed: 29,
  MushroomBlue: 30,
  Web: 31,
  Sandstone: 32,
  SandstoneTop: 33,
  CactusSide: 34,
  CactusTop: 35,
  DeadBush: 36,
  Snow: 37,
  SnowSide: 38,
  Ice: 39,
  IceBrick: 40,
  FrostGrass: 41,
} as const;
export type TileId = (typeof Tile)[keyof typeof Tile];

export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 8;
export const TILE_PX = 16;

/** Face d'un cube : 0 = +X, 1 = -X, 2 = +Y, 3 = -Y, 4 = +Z, 5 = -Z. */
export type Face = 0 | 1 | 2 | 3 | 4 | 5;

interface BlockDef {
  top: TileId;
  side: TileId;
  bottom: TileId;
}

const defs: Record<number, BlockDef> = {
  [Block.Grass]: { top: Tile.GrassTop, side: Tile.GrassSide, bottom: Tile.Dirt },
  [Block.Dirt]: uniform(Tile.Dirt),
  [Block.Stone]: uniform(Tile.Stone),
  [Block.Sand]: uniform(Tile.Sand),
  [Block.Water]: uniform(Tile.Water),
  [Block.Log]: { top: Tile.LogTop, side: Tile.LogSide, bottom: Tile.LogTop },
  [Block.Leaves]: uniform(Tile.Leaves),
  [Block.Plank]: uniform(Tile.Plank),
  [Block.Brick]: uniform(Tile.Brick),
  [Block.Roof]: uniform(Tile.Roof),
  [Block.Window]: uniform(Tile.Window),
  [Block.Path]: uniform(Tile.Path),
  [Block.Gold]: uniform(Tile.Gold),
  [Block.Door]: uniform(Tile.Door),
  [Block.Basalt]: uniform(Tile.Basalt),
  [Block.Lava]: uniform(Tile.Lava),
  [Block.Ash]: { top: Tile.Ash, side: Tile.Basalt, bottom: Tile.Basalt },
  [Block.MossStone]: { top: Tile.MossStone, side: Tile.MossStone, bottom: Tile.Stone },
  [Block.Sandstone]: { top: Tile.SandstoneTop, side: Tile.Sandstone, bottom: Tile.SandstoneTop },
  [Block.Cactus]: { top: Tile.CactusTop, side: Tile.CactusSide, bottom: Tile.CactusTop },
  [Block.Snow]: { top: Tile.Snow, side: Tile.SnowSide, bottom: Tile.Dirt },
  [Block.Ice]: uniform(Tile.Ice),
  [Block.IceBrick]: uniform(Tile.IceBrick),
};

function uniform(t: TileId): BlockDef {
  return { top: t, side: t, bottom: t };
}

export function tileFor(block: number, face: Face): TileId {
  const d = defs[block];
  if (!d) return Tile.Stone;
  if (face === 2) return d.top;
  if (face === 3) return d.bottom;
  return d.side;
}

/** Bloc qui cache complètement ses voisins et arrête le héros. */
export function isOpaque(block: number): boolean {
  return block !== Block.Air && block !== Block.Water;
}

export function isSolid(block: number): boolean {
  return block !== Block.Air && block !== Block.Water;
}
