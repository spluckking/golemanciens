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
} as const;
export type TileId = (typeof Tile)[keyof typeof Tile];

export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 4;
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
