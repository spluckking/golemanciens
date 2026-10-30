import * as THREE from 'three';

/** Taille du quad d'ombre par rapport à l'ancien disque (le dégradé s'estompe vers le bord). */
export const SOFT_SHADOW_SIZE = 1.25;

let texture: THREE.CanvasTexture | null = null;

/** Dégradé radial : sombre au centre, nul au bord (une seule petite texture partagée). */
function shadowTexture(): THREE.CanvasTexture {
  if (texture) return texture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.75)');
    g.addColorStop(0.8, 'rgba(0,0,0,0.22)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Ombre douce sous les personnages : un quad au sol avec un dégradé radial (pas d'ombre en temps
 * réel, CLAUDE.md). La texture est partagée ; chaque matériau est libéré par son propriétaire.
 */
export function softShadowMaterial(opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: 0x000000, map: shadowTexture(), transparent: true, opacity, depthWrite: false });
}

/** Le quad d'ombre, à plat, de diamètre `size`. */
export function softShadowGeometry(size: number): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(size * SOFT_SHADOW_SIZE, size * SOFT_SHADOW_SIZE).rotateX(-Math.PI / 2);
}
