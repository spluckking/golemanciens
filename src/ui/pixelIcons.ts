/**
 * Icônes de l'interface en pixel art (16 × 16), dessinées sur canvas : aucun fichier image.
 * Chaque icône a un contour sombre, pour rester lisible sur la pierre comme sur l'ardoise.
 */

export type PixelIconId = 'wand' | 'journal' | 'golems' | 'encyclopedia' | 'pause';

const K = '#15161c';

type Px = (x: number, y: number, w: number, h: number, color: string) => void;

/** Rectangle avec un contour de 1 pixel. */
function boxed(px: Px, x: number, y: number, w: number, h: number, color: string): void {
  px(x - 1, y - 1, w + 2, h + 2, K);
  px(x, y, w, h, color);
}

const DRAW: Record<PixelIconId, (px: Px) => void> = {
  // Baguette en diagonale, bague dorée, pointe qui brille et petites étincelles.
  wand(px) {
    const pts: [number, number][] = [];
    for (let t = 0; t <= 8; t++) pts.push([2 + t, 12 - t]);
    for (const [x, y] of pts) px(x - 1, y - 1, 4, 4, K);
    pts.forEach(([x, y], i) => px(x, y, 2, 2, i < 3 ? '#3a2416' : i === 3 ? '#f0c43c' : '#7a4a26'));
    px(11, 2, 3, 3, K);
    px(11, 3, 2, 2, '#e8ffff');
    px(13, 0, 1, 1, '#ffe27a');
    px(14, 4, 1, 1, '#ffe27a');
    px(15, 2, 1, 1, '#ffffff');
    px(9, 1, 1, 1, '#6ff0ff');
  },
  // Parchemin roulé, avec des lignes d'écriture.
  journal(px) {
    boxed(px, 3, 3, 10, 10, '#f1e3bf');
    boxed(px, 2, 2, 12, 2, '#a8703c');
    boxed(px, 2, 12, 12, 2, '#a8703c');
    for (const y of [5, 7, 9]) px(5, y, y === 9 ? 4 : 6, 1, '#8a6a4a');
    px(10, 9, 2, 2, '#c0392b');
  },
  // Tête de golem en pierre, yeux lumineux.
  golems(px) {
    boxed(px, 2, 3, 12, 11, '#8d8f9c');
    px(2, 3, 12, 2, '#a9abb8');
    px(3, 6, 10, 1, '#5f6170');
    px(4, 8, 3, 2, '#6ff0ff');
    px(9, 8, 3, 2, '#6ff0ff');
    px(6, 11, 4, 1, '#5f6170');
    px(5, 1, 6, 2, K);
    px(6, 2, 4, 1, '#5aa04a');
  },
  // Livre ouvert : deux pages, couverture rouge.
  encyclopedia(px) {
    boxed(px, 1, 4, 14, 10, '#b03040');
    px(2, 4, 6, 9, '#f4f2ea');
    px(8, 4, 6, 9, '#ebe6d8');
    px(7, 4, 2, 10, K);
    for (const y of [6, 8, 10]) {
      px(3, y, 4, 1, '#8a8a9a');
      px(9, y, 4, 1, '#8a8a9a');
    }
    px(11, 2, 2, 4, '#f0c43c');
  },
  // Deux barres verticales.
  pause(px) {
    boxed(px, 3, 3, 3, 10, '#ffffff');
    boxed(px, 10, 3, 3, 10, '#ffffff');
  },
};

/** Canvas 16 × 16 de l'icône, à afficher agrandi (CSS : image-rendering: pixelated). */
export function pixelIcon(id: PixelIconId): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  canvas.className = `pixel-icon pixel-icon-${id}`;
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const px: Px = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };
    DRAW[id](px);
  }
  return canvas;
}
