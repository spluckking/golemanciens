import type { BiomeId } from '../core/gameState';

/**
 * Ambiance lumineuse de chaque biome : le soleil (couleur, force, direction), la lumière
 * d'ambiance ciel/sol, et le ciel en dégradé (zénith → horizon). Le brouillard prend la couleur
 * de l'horizon, pour que le décor se fonde dans le ciel au bout de la vue.
 */
export interface LightRig {
  /** Couleur du ciel au zénith et à l'horizon (le brouillard prend celle de l'horizon). */
  zenith: number;
  horizon: number;
  /** Lumière d'ambiance : couleur venant du ciel, couleur renvoyée par le sol, force. */
  hemiSky: number;
  hemiGround: number;
  hemi: number;
  /** Soleil : couleur, force et direction (vers le soleil). */
  sunColor: number;
  sun: number;
  sunDir: [number, number, number];
}

export const BIOME_LIGHT: Record<BiomeId, LightRig> = {
  // Prairie : matin clair et doux, soleil chaud un peu bas.
  prairie: { zenith: 0x4d9be6, horizon: 0xbfe4ff, hemiSky: 0xe6f4ff, hemiGround: 0x8a7a52, hemi: 1.45, sunColor: 0xfff0d2, sun: 1.7, sunDir: [0.55, 0.85, 0.35] },
  // Forêt : lumière verte filtrée par les feuilles, ambiance plus fraîche.
  foret: { zenith: 0x3f8a7a, horizon: 0xa8d8bc, hemiSky: 0xd6f0dc, hemiGround: 0x5e5a36, hemi: 1.6, sunColor: 0xfff2c4, sun: 1.7, sunDir: [0.4, 0.9, 0.3] },
  // Désert : soleil haut, chaud et fort ; ciel pâle et doré à l'horizon.
  desert: { zenith: 0x5aa6e8, horizon: 0xf6dfb0, hemiSky: 0xfff0d8, hemiGround: 0xc49a5c, hemi: 1.6, sunColor: 0xffe2a8, sun: 2.3, sunDir: [0.3, 1, 0.2] },
  // Pics de Givre : lumière froide et bleutée, soleil bas et blanc.
  givre: { zenith: 0x6c9cd0, horizon: 0xdce8f4, hemiSky: 0xe4f0ff, hemiGround: 0x7a8aa8, hemi: 1.25, sunColor: 0xfff2e0, sun: 1.35, sunDir: [-0.5, 0.6, 0.45] },
  // Île Céleste : ciel profond au-dessus, nuages lumineux à l'horizon.
  ciel: { zenith: 0x3a7ee0, horizon: 0xcfe8ff, hemiSky: 0xf0f6ff, hemiGround: 0xa0b0d0, hemi: 1.8, sunColor: 0xfff6e4, sun: 1.8, sunDir: [0.45, 0.9, -0.3] },
  // Volcan d'Ombre : ciel de cendre, lueur de braise par en dessous.
  volcan: { zenith: 0x2a1c2c, horizon: 0x6a3a40, hemiSky: 0xd88a70, hemiGround: 0x7a3020, hemi: 1.3, sunColor: 0xff9a68, sun: 1.1, sunDir: [-0.3, 0.7, 0.5] },
};
