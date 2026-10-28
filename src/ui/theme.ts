import { createRng } from '../core/rng';

/**
 * Thème « blocs » de l'interface : petites textures en pixels (16 × 16) peintes sur canvas
 * au démarrage, puis données au CSS sous forme de variables (--tex-…). Aucun fichier image.
 */

type Painter = (px: (x: number, y: number, rgb: [number, number, number]) => void, rnd: () => number) => void;

function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function shade([r, g, b]: [number, number, number], k: number): [number, number, number] {
  return [Math.min(255, Math.max(0, r + k)), Math.min(255, Math.max(0, g + k)), Math.min(255, Math.max(0, b + k))];
}

/** Grain de pixels autour d'une couleur, avec quelques taches plus sombres. */
function noise(base: number, jitter: number, specks = 0): Painter {
  const c = hexToRgb(base);
  return (px, rnd) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const speck = rnd() < specks ? -jitter * 1.6 : 0;
        px(x, y, shade(c, Math.round((rnd() - 0.5) * 2 * jitter + speck)));
      }
  };
}

/** Planches : bandes horizontales séparées par une rainure, grain du bois. */
function planks(base: number): Painter {
  const c = hexToRgb(base);
  return (px, rnd) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const groove = y % 4 === 3;
        const seam = (x + (Math.floor(y / 4) % 2) * 8) % 16 === 0;
        px(x, y, shade(c, groove || seam ? -38 : Math.round((rnd() - 0.5) * 14)));
      }
  };
}

const TEXTURES: Record<string, Painter> = {
  stone: noise(0x8b8b8b, 12, 0.08),
  panel: noise(0xc9c6c0, 5),
  slate: noise(0x262a36, 6),
  grass: noise(0x5a9e3c, 10, 0.05),
  plank: planks(0xa8763e),
  paper: noise(0xf1e3bf, 5),
};

function paint(painter: Painter, seed: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'none';
  const rnd = createRng(seed);
  painter((x, y, [r, g, b]) => {
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, 1, 1);
  }, rnd);
  return `url(${canvas.toDataURL()})`;
}

/** Peint les textures et les déclare au CSS (à appeler une fois au démarrage). */
export function applyBlockTheme(root: HTMLElement = document.documentElement): void {
  let seed = 7;
  for (const [name, painter] of Object.entries(TEXTURES)) root.style.setProperty(`--tex-${name}`, paint(painter, seed++));
}
