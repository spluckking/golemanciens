import { Block, Tile, isOpaque, tileFor, type Face } from './blocks';
import { CHUNK_SIZE, type VoxelWorld } from './voxelWorld';

/** Géométrie brute d'un chunk, indépendante de Three.js. */
export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  /** Coordonnées locales en blocs : la tuile se répète grâce au shader (fract). */
  uvs: Float32Array;
  /** Index de tuile de l'atlas, par sommet. */
  tiles: Float32Array;
  /** Occlusion ambiante par sommet, de 0 (coin très fermé) à 3 (à l'air libre). */
  ao: Float32Array;
  indices: Uint32Array;
  quadCount: number;
}

export interface ChunkMesh {
  opaque: MeshData;
  water: MeshData;
}

class MeshBuilder {
  private pos: number[] = [];
  private nor: number[] = [];
  private uv: number[] = [];
  private tile: number[] = [];
  private occ: number[] = [];
  private idx: number[] = [];
  quads = 0;

  quad(corners: number[][], normal: number[], uvs: number[][], tile: number, flip: boolean, ao: readonly number[] = FULL_AO): void {
    const base = this.pos.length / 3;
    for (let k = 0; k < 4; k++) {
      this.pos.push(corners[k][0], corners[k][1], corners[k][2]);
      this.nor.push(normal[0], normal[1], normal[2]);
      this.uv.push(uvs[k][0], uvs[k][1]);
      this.tile.push(tile);
      this.occ.push(ao[k]);
    }
    // On coupe le quad selon la diagonale la plus claire : l'ombre des coins reste symétrique.
    const tris = ao[0] + ao[2] >= ao[1] + ao[3] ? [0, 1, 2, 0, 2, 3] : [1, 2, 3, 1, 3, 0];
    for (let t = 0; t < 6; t += 3) {
      if (flip) this.idx.push(base + tris[t], base + tris[t + 2], base + tris[t + 1]);
      else this.idx.push(base + tris[t], base + tris[t + 1], base + tris[t + 2]);
    }
    this.quads++;
  }

  build(): MeshData {
    return {
      positions: new Float32Array(this.pos),
      normals: new Float32Array(this.nor),
      uvs: new Float32Array(this.uv),
      tiles: new Float32Array(this.tile),
      ao: new Float32Array(this.occ),
      indices: new Uint32Array(this.idx),
      quadCount: this.quads,
    };
  }
}

const FULL_AO = [3, 3, 3, 3];

/**
 * Occlusion ambiante d'un coin de face (méthode classique des mondes en blocs) : on regarde, dans la
 * couche d'air devant la face, les deux blocs voisins du coin et le bloc en diagonale.
 */
function cornerAo(side1: boolean, side2: boolean, corner: boolean): number {
  if (side1 && side2) return 0;
  return 3 - (side1 ? 1 : 0) - (side2 ? 1 : 0) - (corner ? 1 : 0);
}

/** Voisin vu par le mesher : les bords de la carte et le dessous sont cachés, le ciel est vide. */
function neighborBlock(world: VoxelWorld, x: number, y: number, z: number): number {
  if (y < 0) return Block.Stone;
  if (y >= world.sizeY) return Block.Air;
  if (x < 0 || z < 0 || x >= world.sizeX || z >= world.sizeZ) return Block.Stone;
  return world.get(x, y, z);
}

/**
 * Meshing glouton d'un chunk : les faces visibles de même tuile sont fusionnées
 * en rectangles, tranche par tranche, pour chacune des 6 directions.
 */
export function meshChunk(world: VoxelWorld, cx: number, cz: number): ChunkMesh {
  const origin = [cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE];
  const dims = [
    Math.min(CHUNK_SIZE, world.sizeX - origin[0]),
    world.sizeY,
    Math.min(CHUNK_SIZE, world.sizeZ - origin[2]),
  ];
  const opaque = new MeshBuilder();
  const water = new MeshBuilder();
  const p = [0, 0, 0];
  const step = [0, 0, 0];
  const q = [0, 0, 0];
  // Pour l'occlusion, le dehors de la carte ne fait pas d'ombre (sinon les bords seraient assombris).
  const occluder = (base: number[], du: number[], dv: number[], su: number, sv: number): boolean => {
    const x = base[0] + du[0] * su + dv[0] * sv;
    const y = base[1] + du[1] * su + dv[1] * sv;
    const z = base[2] + du[2] * su + dv[2] * sv;
    if (x < 0 || y < 0 || z < 0 || x >= world.sizeX || y >= world.sizeY || z >= world.sizeZ) return false;
    return isOpaque(world.get(x, y, z));
  };

  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3;
    const v = (d + 2) % 3;
    const mask = new Int32Array(dims[u] * dims[v]);
    const eu = [0, 0, 0];
    const ev = [0, 0, 0];
    eu[u] = 1;
    ev[v] = 1;
    const waterMask = new Int32Array(dims[u] * dims[v]);

    for (const s of [1, -1]) {
      const face = (d * 2 + (s > 0 ? 0 : 1)) as Face;
      step[0] = step[1] = step[2] = 0;
      step[d] = s;

      for (let slice = 0; slice < dims[d]; slice++) {
        let n = 0;
        for (let j = 0; j < dims[v]; j++) {
          for (let i = 0; i < dims[u]; i++) {
            p[d] = slice;
            p[u] = i;
            p[v] = j;
            const wx = origin[0] + p[0];
            const wy = origin[1] + p[1];
            const wz = origin[2] + p[2];
            const b = world.get(wx, wy, wz);
            const nb = neighborBlock(world, wx + step[0], wy + step[1], wz + step[2]);
            if (isOpaque(b) && !isOpaque(nb)) {
              // Coins dans l'ordre du quad : (−u,−v), (+u,−v), (+u,+v), (−u,+v), 2 bits chacun.
              q[0] = wx + step[0];
              q[1] = wy + step[1];
              q[2] = wz + step[2];
              let packed = 0;
              let k = 0;
              for (const [su, sv] of AO_CORNERS) {
                const a = cornerAo(occluder(q, eu, ev, su, 0), occluder(q, eu, ev, 0, sv), occluder(q, eu, ev, su, sv));
                packed |= a << (k * 2);
                k++;
              }
              mask[n] = tileFor(b, face) + 1 + (packed << 8);
            } else mask[n] = 0;
            waterMask[n] = b === Block.Water && nb === Block.Air ? Tile.Water + 1 : 0;
            n++;
          }
        }
        const sliceInfo = { d, u, v, s, slice, face, origin, du: dims[u], dv: dims[v] };
        greedy(mask, sliceInfo, opaque);
        greedy(waterMask, sliceInfo, water);
      }
    }
  }

  return { opaque: opaque.build(), water: water.build() };
}

/** Les 4 coins d'une face, dans l'ordre des sommets du quad (axes u et v de la tranche). */
const AO_CORNERS: readonly [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

interface SliceInfo {
  d: number;
  u: number;
  v: number;
  s: number;
  slice: number;
  face: Face;
  origin: number[];
  du: number;
  dv: number;
}

function greedy(mask: Int32Array, info: SliceInfo, out: MeshBuilder): void {
  const { d, u, v, s, slice, origin, du, dv } = info;
  for (let j = 0; j < dv; j++) {
    for (let i = 0; i < du; ) {
      const key = mask[j * du + i];
      if (key === 0) {
        i++;
        continue;
      }
      let w = 1;
      while (i + w < du && mask[j * du + i + w] === key) w++;
      let h = 1;
      grow: while (j + h < dv) {
        for (let t = 0; t < w; t++) {
          if (mask[(j + h) * du + i + t] !== key) break grow;
        }
        h++;
      }

      const base = [0, 0, 0];
      base[d] = origin[d] + slice + (s > 0 ? 1 : 0);
      base[u] = origin[u] + i;
      base[v] = origin[v] + j;
      const eu = [0, 0, 0];
      const ev = [0, 0, 0];
      eu[u] = w;
      ev[v] = h;
      const corners = [
        base,
        [base[0] + eu[0], base[1] + eu[1], base[2] + eu[2]],
        [base[0] + eu[0] + ev[0], base[1] + eu[1] + ev[1], base[2] + eu[2] + ev[2]],
        [base[0] + ev[0], base[1] + ev[1], base[2] + ev[2]],
      ];
      // Axes de texture : sur les côtés, la tuile est toujours « debout » (v vers le haut).
      const ha = d === 0 ? 2 : 0;
      const va = d === 1 ? 2 : 1;
      const uvs = corners.map((c) => [c[ha] - base[ha], c[va] - base[va]]);
      const normal = [0, 0, 0];
      normal[d] = s;
      const ao = [0, 1, 2, 3].map((k) => (key >> (8 + k * 2)) & 3);
      out.quad(corners, normal, uvs, (key & 0xff) - 1, s < 0, ao);

      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mask[(j + y) * du + i + x] = 0;
      i += w;
    }
  }
}
