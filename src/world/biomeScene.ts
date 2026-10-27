import * as THREE from 'three';
import { ATLAS_COLS, ATLAS_ROWS, type TileId } from './blocks';
import { meshChunk, type MeshData } from './mesher';
import type { BiomeLayout } from './prairie';
import { createVoxelMaterial } from './voxelMaterial';

/** Rendu Three.js d'un biome : chunks opaques, eau et végétation instanciée. */
export class BiomeScene {
  readonly group = new THREE.Group();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor(layout: BiomeLayout, atlas: THREE.Texture) {
    const opaqueMat = createVoxelMaterial(atlas);
    const waterMat = createVoxelMaterial(atlas, { transparent: true, opacity: 0.78, depthWrite: false });
    this.materials.push(opaqueMat, waterMat);

    const { world } = layout;
    for (let cz = 0; cz < world.chunksZ; cz++) {
      for (let cx = 0; cx < world.chunksX; cx++) {
        const chunk = meshChunk(world, cx, cz);
        this.addMesh(chunk.opaque, opaqueMat, `chunk-${cx}-${cz}`);
        const water = this.addMesh(chunk.water, waterMat, `water-${cx}-${cz}`);
        if (water) water.renderOrder = 1;
      }
    }
    this.addDecorations(layout, atlas);
  }

  private addMesh(data: MeshData, material: THREE.Material, name: string): THREE.Mesh | null {
    if (data.quadCount === 0) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
    geo.setAttribute('tileIndex', new THREE.BufferAttribute(data.tiles, 1));
    geo.setIndex(new THREE.BufferAttribute(data.indices, 1));
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = name;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.geometries.push(geo);
    this.group.add(mesh);
    return mesh;
  }

  /** Herbes et fleurs : 2 quads croisés, un InstancedMesh par type de tuile. */
  private addDecorations(layout: BiomeLayout, atlas: THREE.Texture): void {
    const byTile = new Map<TileId, typeof layout.decorations>();
    for (const d of layout.decorations) {
      const list = byTile.get(d.tile) ?? [];
      list.push(d);
      byTile.set(d.tile, list);
    }
    const mat = new THREE.MeshLambertMaterial({ map: atlas, alphaTest: 0.5, side: THREE.DoubleSide });
    this.materials.push(mat);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    for (const [tile, list] of byTile) {
      const geo = crossedQuad(tile);
      this.geometries.push(geo);
      const inst = new THREE.InstancedMesh(geo, mat, list.length);
      inst.name = `deco-${tile}`;
      list.forEach((d, i) => {
        const k = 0.75 + ((i * 7919) % 100) / 400;
        q.setFromAxisAngle(up, ((i * 2654435761) % 628) / 100);
        p.set(d.x, d.y, d.z);
        s.set(k, k, k);
        inst.setMatrixAt(i, m.compose(p, q, s));
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
      this.group.add(inst);
    }
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const mat of this.materials) mat.dispose();
    this.group.removeFromParent();
  }
}

function crossedQuad(tile: TileId): THREE.BufferGeometry {
  const tx = tile % ATLAS_COLS;
  const ty = Math.floor(tile / ATLAS_COLS);
  const u0 = tx / ATLAS_COLS;
  const u1 = (tx + 1) / ATLAS_COLS;
  const v1 = 1 - ty / ATLAS_ROWS;
  const v0 = 1 - (ty + 1) / ATLAS_ROWS;
  const h = 0.45;
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (const [ax, az] of [[1, 1], [1, -1]]) {
    const base = positions.length / 3;
    const dx = ax * h * 0.7071;
    const dz = az * h * 0.7071;
    positions.push(-dx, 0, -dz, dx, 0, dz, dx, 0.9, dz, -dx, 0.9, -dz);
    uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);
    // Normales vers le haut : la végétation est éclairée comme le sol.
    for (let k = 0; k < 4; k++) normals.push(0, 1, 0);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}
