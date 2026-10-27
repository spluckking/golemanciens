/** Logo « Les Golémanciens de Cubeterre » en blocs, avec une police pixel 5×7 définie ici. */

const GLYPHS: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
};
/** Accent aigu : 2 lignes au-dessus de la lettre. */
const ACUTE = ['...#.', '..#..'];

interface Line {
  text: string;
  color: [number, number, number];
}

const LINES: Line[] = [
  { text: 'LES GOLÉMANCIENS', color: [240, 196, 60] },
  { text: 'DE CUBETERRE', color: [111, 240, 255] },
];

function shade(c: [number, number, number], k: number): string {
  return `rgb(${Math.min(255, Math.round(c[0] * k))}, ${Math.min(255, Math.round(c[1] * k))}, ${Math.min(255, Math.round(c[2] * k))})`;
}

export function createLogo(cell = 10): HTMLCanvasElement {
  const rows = LINES.map((line) => {
    const cells: { x: number; y: number }[] = [];
    let x = 0;
    for (const ch of line.text) {
      const base = ch === 'É' ? 'E' : ch;
      const glyph = GLYPHS[base];
      if (!glyph) throw new Error(`Lettre absente de la police du logo : ${ch}`);
      glyph.forEach((row, y) => [...row].forEach((p, dx) => p === '#' && cells.push({ x: x + dx, y: y + 2 })));
      if (ch === 'É') ACUTE.forEach((row, y) => [...row].forEach((p, dx) => p === '#' && cells.push({ x: x + dx, y })));
      x += glyph[0].length + 1;
    }
    return { cells, width: x - 1, color: line.color };
  });

  const lineHeight = 10;
  const widthCells = Math.max(...rows.map((r) => r.width));
  const canvas = document.createElement('canvas');
  canvas.width = (widthCells + 1) * cell;
  canvas.height = (rows.length * lineHeight + 1) * cell;
  canvas.className = 'logo';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Les Golémanciens de Cubeterre');
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  rows.forEach((row, li) => {
    const ox = Math.floor((widthCells - row.width) / 2) * cell;
    const oy = li * lineHeight * cell;
    // Ombre portée, puis blocs biseautés (dessus clair, côté sombre).
    for (const pass of ['shadow', 'block'] as const) {
      for (const { x, y } of row.cells) {
        const px = ox + x * cell;
        const py = oy + y * cell;
        if (pass === 'shadow') {
          ctx.fillStyle = 'rgba(10, 16, 40, 0.55)';
          ctx.fillRect(px + cell * 0.3, py + cell * 0.3, cell, cell);
          continue;
        }
        const b = Math.max(1, Math.round(cell * 0.18));
        ctx.fillStyle = shade(row.color, 0.62);
        ctx.fillRect(px, py, cell, cell);
        ctx.fillStyle = shade(row.color, 1);
        ctx.fillRect(px, py, cell - b, cell - b);
        ctx.fillStyle = shade(row.color, 1.25);
        ctx.fillRect(px, py, cell - b, b);
      }
    }
  });
  return canvas;
}
