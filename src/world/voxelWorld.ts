import { Block, isSolid } from './blocks';

export const CHUNK_SIZE = 16;
export const WORLD_HEIGHT = 32;

/** Grille de voxels d'un biome (sans dépendance au rendu). */
export class VoxelWorld {
  readonly data: Uint8Array;

  constructor(
    readonly sizeX: number,
    readonly sizeY: number,
    readonly sizeZ: number,
  ) {
    this.data = new Uint8Array(sizeX * sizeY * sizeZ);
  }

  inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && y >= 0 && z >= 0 && x < this.sizeX && y < this.sizeY && z < this.sizeZ;
  }

  private index(x: number, y: number, z: number): number {
    return (y * this.sizeZ + z) * this.sizeX + x;
  }

  get(x: number, y: number, z: number): number {
    if (!this.inBounds(x, y, z)) return Block.Air;
    return this.data[this.index(x, y, z)];
  }

  set(x: number, y: number, z: number, block: number): void {
    if (!this.inBounds(x, y, z)) return;
    this.data[this.index(x, y, z)] = block;
  }

  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, block: number): void {
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++) this.set(x, y, z, block);
  }

  /** Collision : hors de la carte, les bords sont des murs, le dessous est plein, le ciel est vide. */
  solidAt(x: number, y: number, z: number): boolean {
    if (y < 0) return true;
    if (y >= this.sizeY) return false;
    if (x < 0 || z < 0 || x >= this.sizeX || z >= this.sizeZ) return true;
    return isSolid(this.data[this.index(x, y, z)]);
  }

  /** Hauteur du premier bloc vide au-dessus du sol plein le plus haut. */
  surfaceY(x: number, z: number): number {
    for (let y = this.sizeY - 1; y >= 0; y--) {
      if (isSolid(this.get(x, y, z))) return y + 1;
    }
    return 0;
  }

  get chunksX(): number {
    return Math.ceil(this.sizeX / CHUNK_SIZE);
  }

  get chunksZ(): number {
    return Math.ceil(this.sizeZ / CHUNK_SIZE);
  }
}
