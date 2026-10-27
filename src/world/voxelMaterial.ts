import * as THREE from 'three';
import { ATLAS_COLS, ATLAS_ROWS, TILE_PX } from './blocks';

/** Texture d'atlas en pixels nets, sans mipmaps (évite les débordements entre tuiles). */
export function createAtlasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Matériau Lambert dont la texture est choisie par l'attribut « tileIndex » et répétée
 * par fract() : une face fusionnée de 5×3 blocs affiche 15 tuiles.
 */
export function createVoxelMaterial(
  atlas: THREE.Texture,
  options: THREE.MeshLambertMaterialParameters = {},
): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({ map: atlas, ...options });
  const inset = (0.5 / TILE_PX).toFixed(5);
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float tileIndex;\nvarying float vTile;\nvarying vec2 vLocalUv;',
      )
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvTile = tileIndex;\nvLocalUv = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vTile;\nvarying vec2 vLocalUv;')
      .replace(
        '#include <map_fragment>',
        `
        {
          float tx = mod(vTile, ${ATLAS_COLS.toFixed(1)});
          float ty = floor(vTile / ${ATLAS_COLS.toFixed(1)});
          vec2 f = clamp(fract(vLocalUv), ${inset}, 1.0 - ${inset});
          vec2 atlasUv = vec2((tx + f.x) / ${ATLAS_COLS.toFixed(1)}, 1.0 - (ty + 1.0 - f.y) / ${ATLAS_ROWS.toFixed(1)});
          vec4 sampledDiffuseColor = texture2D(map, atlasUv);
          diffuseColor *= sampledDiffuseColor;
        }
        `,
      );
  };
  mat.customProgramCacheKey = () => 'voxel-atlas';
  return mat;
}
