import * as THREE from 'three';
import { ATLAS_COLS, ATLAS_ROWS, TILE_PX, Tile } from './blocks';

/**
 * Atlas avec marges : chaque tuile de 16 px est posée au centre d'une case de 32 px, entourée de
 * copies d'elle-même (8 px de chaque côté). Les mipmaps peuvent alors moyenner une tuile sans
 * déborder sur sa voisine, jusqu'au niveau où la case fait 4 px : plus de scintillement au loin.
 */
export const ATLAS_PAD = 8;
const CELL = TILE_PX + 2 * ATLAS_PAD;
const ATLAS_W = ATLAS_COLS * CELL;
const ATLAS_H = ATLAS_ROWS * CELL;

/** Coordonnées de texture de la tuile (sans ses marges) dans l'atlas, v vers le haut. */
export function atlasTileRect(tile: number): { u0: number; u1: number; v0: number; v1: number } {
  const tx = tile % ATLAS_COLS;
  const ty = Math.floor(tile / ATLAS_COLS);
  const x0 = tx * CELL + ATLAS_PAD;
  const y0 = ty * CELL + ATLAS_PAD;
  return { u0: x0 / ATLAS_W, u1: (x0 + TILE_PX) / ATLAS_W, v1: 1 - y0 / ATLAS_H, v0: 1 - (y0 + TILE_PX) / ATLAS_H };
}

/** Recopie chaque tuile au centre de sa case, entourée d'elle-même (répétition sans couture). */
function padAtlas(source: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = ATLAS_W;
  out.height = ATLAS_H;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponible');
  ctx.imageSmoothingEnabled = false;
  for (let ty = 0; ty < ATLAS_ROWS; ty++)
    for (let tx = 0; tx < ATLAS_COLS; tx++) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(tx * CELL, ty * CELL, CELL, CELL);
      ctx.clip();
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          ctx.drawImage(source, tx * TILE_PX, ty * TILE_PX, TILE_PX, TILE_PX, tx * CELL + ATLAS_PAD + dx * TILE_PX, ty * CELL + ATLAS_PAD + dy * TILE_PX, TILE_PX, TILE_PX);
      ctx.restore();
    }
  return out;
}

/** Chaîne de mipmaps : chaque niveau est la moitié du précédent, moyenné. */
function mipChain(level0: HTMLCanvasElement): HTMLCanvasElement[] {
  const levels = [level0];
  let prev = level0;
  while (prev.width > 1 || prev.height > 1) {
    const next = document.createElement('canvas');
    next.width = Math.max(1, prev.width >> 1);
    next.height = Math.max(1, prev.height >> 1);
    const ctx = next.getContext('2d');
    if (!ctx) break;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(prev, 0, 0, next.width, next.height);
    levels.push(next);
    prev = next;
  }
  return levels;
}

/**
 * Texture d'atlas : pixels nets de près (NearestFilter), mipmaps à marges de loin
 * (NearestMipmapLinear : le niveau est fondu, les texels restent nets).
 */
export function createAtlasTexture(canvas: HTMLCanvasElement): THREE.Texture {
  const padded = padAtlas(canvas);
  const tex = new THREE.Texture(padded);
  tex.mipmaps = mipChain(padded);
  tex.generateMipmaps = false;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Mipmaps sans couture aux bords des tuiles (textureGrad) : profil « Haut » seulement. */
let seamlessMips = true;
export function setSeamlessMips(on: boolean): void {
  seamlessMips = on;
}

/** Ombre la plus sombre de l'occlusion ambiante (coin fermé sur deux côtés). */
const AO_DARK = 0.52;
/** Lave : elle éclaire d'elle-même, assez pour dépasser 1 en HDR et faire briller le bloom. */
const LAVA_GLOW = 0.9;

/**
 * Matériau Lambert des blocs : la tuile est choisie par l'attribut « tileIndex » et répétée par
 * fract() (une face fusionnée de 5×3 blocs affiche 15 tuiles), avec des dérivées continues pour
 * les mipmaps ; l'attribut « ao » assombrit les coins (occlusion ambiante calculée au maillage).
 */
export function createVoxelMaterial(
  atlas: THREE.Texture,
  options: THREE.MeshLambertMaterialParameters = {},
): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({ map: atlas, ...options });
  const f = (n: number): string => n.toFixed(5);
  const grad = seamlessMips;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float tileIndex;\nattribute float ao;\nvarying float vTile;\nvarying float vAo;\nvarying vec2 vLocalUv;',
      )
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvTile = tileIndex;\nvAo = ao / 3.0;\nvLocalUv = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vTile;\nvarying float vAo;\nvarying vec2 vLocalUv;')
      .replace(
        '#include <map_fragment>',
        `
        {
          float tx = mod(vTile, ${ATLAS_COLS.toFixed(1)});
          float ty = floor(vTile / ${ATLAS_COLS.toFixed(1)});
          vec2 fr = fract(vLocalUv);
          vec2 atlasUv = vec2(
            (tx * ${CELL.toFixed(1)} + ${ATLAS_PAD.toFixed(1)} + fr.x * ${TILE_PX.toFixed(1)}) / ${ATLAS_W.toFixed(1)},
            1.0 - (ty * ${CELL.toFixed(1)} + ${ATLAS_PAD.toFixed(1)} + (1.0 - fr.y) * ${TILE_PX.toFixed(1)}) / ${ATLAS_H.toFixed(1)}
          );
          // Dérivées des coordonnées non répétées : pas de couture de mipmap à chaque bord de tuile.
          vec2 gx = dFdx(vLocalUv) * vec2(${f(TILE_PX / ATLAS_W)}, ${f(TILE_PX / ATLAS_H)});
          vec2 gy = dFdy(vLocalUv) * vec2(${f(TILE_PX / ATLAS_W)}, ${f(TILE_PX / ATLAS_H)});
          vec4 sampledDiffuseColor = ${grad ? 'textureGrad(map, atlasUv, gx, gy)' : 'texture2D(map, atlasUv)'};
          diffuseColor *= sampledDiffuseColor;
          diffuseColor.rgb *= mix(${f(AO_DARK)}, 1.0, vAo);
          if (abs(vTile - ${Tile.Lava.toFixed(1)}) < 0.5) totalEmissiveRadiance += sampledDiffuseColor.rgb * ${f(LAVA_GLOW)};
        }
        `,
      );
  };
  mat.customProgramCacheKey = () => (grad ? 'voxel-atlas-ao-grad' : 'voxel-atlas-ao');
  return mat;
}
