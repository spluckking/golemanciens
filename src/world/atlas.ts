import { createRng, type Rng } from '../core/rng';
import { ATLAS_COLS, ATLAS_ROWS, TILE_PX, Tile, type TileId } from './blocks';

type Rgb = [number, number, number];

/** Peint l'atlas de tuiles 16×16 en pixel art procédural (aucune image externe). */
export function paintAtlas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * TILE_PX;
  canvas.height = ATLAS_ROWS * TILE_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponible');
  const rng = createRng(1337);

  for (const tile of Object.values(Tile)) {
    const img = ctx.createImageData(TILE_PX, TILE_PX);
    painters[tile](new PixelTile(img.data), rng);
    const tx = (tile % ATLAS_COLS) * TILE_PX;
    const ty = Math.floor(tile / ATLAS_COLS) * TILE_PX;
    ctx.putImageData(img, tx, ty);
  }
  return canvas;
}

class PixelTile {
  constructor(private readonly px: Uint8ClampedArray) {}

  set(x: number, y: number, c: Rgb, a = 255): void {
    if (x < 0 || y < 0 || x >= TILE_PX || y >= TILE_PX) return;
    const i = (y * TILE_PX + x) * 4;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
    this.px[i + 3] = a;
  }

  /** Remplit avec une couleur de base et un léger grain. */
  noise(rng: Rng, base: Rgb, amount: number): void {
    for (let y = 0; y < TILE_PX; y++)
      for (let x = 0; x < TILE_PX; x++) this.set(x, y, jitter(base, rng, amount));
  }
}

function jitter(c: Rgb, rng: Rng, amount: number): Rgb {
  const k = 1 + (rng() * 2 - 1) * amount;
  return [clamp(c[0] * k), clamp(c[1] * k), clamp(c[2] * k)];
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

const GRASS: Rgb = [110, 190, 80];
const DIRT: Rgb = [140, 98, 62];

const painters: Record<TileId, (t: PixelTile, rng: Rng) => void> = {
  [Tile.GrassTop]: (t, rng) => {
    t.noise(rng, GRASS, 0.1);
    for (let k = 0; k < 10; k++) t.set(Math.floor(rng() * 16), Math.floor(rng() * 16), [140, 210, 100]);
  },
  [Tile.GrassSide]: (t, rng) => {
    t.noise(rng, DIRT, 0.12);
    for (let x = 0; x < 16; x++) {
      const depth = 3 + Math.floor(rng() * 3);
      for (let y = 0; y < depth; y++) t.set(x, y, jitter(GRASS, rng, 0.1));
    }
  },
  [Tile.Dirt]: (t, rng) => {
    t.noise(rng, DIRT, 0.14);
    for (let k = 0; k < 6; k++) t.set(Math.floor(rng() * 16), Math.floor(rng() * 16), [110, 78, 50]);
  },
  [Tile.Stone]: (t, rng) => {
    t.noise(rng, [138, 138, 145], 0.1);
    for (let k = 0; k < 8; k++) {
      const x = Math.floor(rng() * 15);
      const y = Math.floor(rng() * 16);
      t.set(x, y, [105, 105, 112]);
      t.set(x + 1, y, [105, 105, 112]);
    }
  },
  [Tile.Sand]: (t, rng) => t.noise(rng, [226, 208, 146], 0.06),
  [Tile.Water]: (t, rng) => {
    t.noise(rng, [64, 130, 220], 0.05);
    for (let y = 2; y < 16; y += 5)
      for (let x = 0; x < 16; x++) if ((x + y) % 7 < 3) t.set(x, y, [120, 180, 245]);
  },
  [Tile.LogSide]: (t, rng) => {
    for (let x = 0; x < 16; x++) {
      const stripe: Rgb = x % 4 === 0 ? [92, 64, 40] : [122, 86, 54];
      for (let y = 0; y < 16; y++) t.set(x, y, jitter(stripe, rng, 0.06));
    }
  },
  [Tile.LogTop]: (t, rng) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const r = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
        const c: Rgb = r > 6.5 ? [92, 64, 40] : Math.floor(r) % 2 === 0 ? [176, 136, 88] : [150, 112, 70];
        t.set(x, y, jitter(c, rng, 0.04));
      }
  },
  [Tile.Leaves]: (t, rng) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const r = rng();
        const c: Rgb = r < 0.15 ? [46, 110, 46] : r < 0.3 ? [100, 175, 70] : [70, 145, 60];
        t.set(x, y, c);
      }
  },
  [Tile.Plank]: (t, rng) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const seam = y % 4 === 3 || (x === ((Math.floor(y / 4) * 5) % 16));
        t.set(x, y, seam ? [120, 84, 48] : jitter([184, 140, 88], rng, 0.05));
      }
  },
  [Tile.Brick]: (t, rng) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const row = Math.floor(y / 4);
        const off = row % 2 === 0 ? 0 : 4;
        const mortar = y % 4 === 3 || (x + off) % 8 === 7;
        t.set(x, y, mortar ? [190, 184, 170] : jitter([232, 226, 210], rng, 0.04));
      }
  },
  [Tile.Roof]: (t, rng) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const edge = y % 4 === 3;
        const off = Math.floor(y / 4) % 2 === 0 ? 0 : 2;
        const c: Rgb = edge || (x + off) % 4 === 3 ? [40, 70, 140] : [70, 110, 200];
        t.set(x, y, jitter(c, rng, 0.04));
      }
  },
  [Tile.Window]: (t, rng) => {
    t.noise(rng, [232, 226, 210], 0.03);
    for (let y = 2; y < 15; y++)
      for (let x = 3; x < 13; x++) {
        const frame = x === 3 || x === 12 || y === 2 || x === 7 || x === 8 || y === 8;
        t.set(x, y, frame ? [120, 90, 60] : [255, 214, 110]);
      }
  },
  [Tile.Path]: (t, rng) => {
    t.noise(rng, [176, 160, 128], 0.1);
    for (let k = 0; k < 12; k++) t.set(Math.floor(rng() * 16), Math.floor(rng() * 16), [140, 128, 104]);
  },
  [Tile.Gold]: (t, rng) => {
    t.noise(rng, [240, 196, 60], 0.06);
    for (let k = 0; k < 6; k++) t.set(Math.floor(rng() * 16), Math.floor(rng() * 16), [255, 240, 160]);
  },
  [Tile.Door]: (t, rng) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const frame = x < 2 || x > 13 || y < 2;
        t.set(x, y, frame ? [90, 60, 36] : jitter([150, 100, 58], rng, 0.05));
      }
    t.set(11, 9, [240, 196, 60]);
    t.set(11, 10, [240, 196, 60]);
  },
  [Tile.Basalt]: (t, rng) => {
    t.noise(rng, [52, 46, 58], 0.12);
    // Petites fissures plus sombres et quelques reflets violets.
    for (let k = 0; k < 7; k++) {
      const x = Math.floor(rng() * 14);
      const y = Math.floor(rng() * 16);
      t.set(x, y, [32, 28, 38]);
      t.set(x + 1, y, [32, 28, 38]);
      t.set(x + 2, y + (rng() < 0.5 ? 1 : 0), [32, 28, 38]);
    }
    for (let k = 0; k < 5; k++) t.set(Math.floor(rng() * 16), Math.floor(rng() * 16), [92, 70, 110]);
  },
  [Tile.Lava]: (t, rng) => {
    t.noise(rng, [255, 120, 30], 0.08);
    // Veines jaunes et croûtes rouge sombre.
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const v = Math.sin(x * 0.9 + y * 0.5) + Math.sin(y * 1.3 - x * 0.4);
        if (v > 1.2) t.set(x, y, [255, 226, 90]);
        else if (v < -1.4) t.set(x, y, jitter([170, 40, 20], rng, 0.1));
      }
  },
  [Tile.Ash]: (t, rng) => {
    t.noise(rng, [84, 78, 82], 0.1);
    for (let k = 0; k < 10; k++) t.set(Math.floor(rng() * 16), Math.floor(rng() * 16), [120, 112, 114]);
    for (let k = 0; k < 3; k++) t.set(Math.floor(rng() * 16), Math.floor(rng() * 16), [230, 110, 40]);
  },
  [Tile.FlowerRed]: (t) => flower(t, [230, 60, 60], [255, 220, 80]),
  [Tile.FlowerYellow]: (t) => flower(t, [250, 215, 50], [200, 120, 30]),
  [Tile.FlowerBlue]: (t) => flower(t, [80, 130, 240], [255, 255, 255]),
  [Tile.FlowerWhite]: (t) => flower(t, [250, 250, 250], [250, 200, 60]),
  [Tile.Crate]: (t, rng) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const frame = x < 2 || y < 2 || x > 13 || y > 13;
        const cross = Math.abs(x - y) < 2 || Math.abs(x + y - 15) < 2;
        const c: Rgb = frame ? [110, 72, 38] : cross ? [140, 96, 52] : y % 5 === 4 ? [150, 108, 62] : [196, 150, 92];
        t.set(x, y, jitter(c, rng, 0.05));
      }
  },
  [Tile.Chest]: (t, rng) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const band = y === 5 || y === 6 || x < 1 || x > 14 || y < 1 || y > 14;
        t.set(x, y, band ? [90, 60, 32] : jitter([168, 112, 60], rng, 0.05));
      }
    for (let y = 4; y <= 8; y++) for (let x = 6; x <= 9; x++) t.set(x, y, [240, 196, 60]);
    t.set(7, 7, [60, 40, 20]);
    t.set(8, 7, [60, 40, 20]);
  },
  [Tile.Wheat]: (t, rng) => {
    for (let k = 0; k < 6; k++) {
      const x = 1 + k * 2 + Math.floor(rng() * 2);
      const top = 2 + Math.floor(rng() * 3);
      for (let y = top + 3; y < 16; y++) t.set(x, y, [176, 160, 70]);
      for (let y = top; y < top + 4; y++) {
        t.set(x, y, [236, 200, 90]);
        t.set(x + 1, y, [222, 184, 74]);
      }
    }
  },
  [Tile.GrassTuft]: (t, rng) => {
    for (let k = 0; k < 7; k++) {
      const x = 1 + Math.floor(rng() * 14);
      const hgt = 5 + Math.floor(rng() * 8);
      for (let y = 0; y < hgt; y++) t.set(x, 15 - y, jitter([96, 176, 70], rng, 0.12));
    }
  },
};

/** Fleur sur fond transparent : tige, feuilles, pétales en croix et cœur. */
function flower(t: PixelTile, petal: Rgb, heart: Rgb): void {
  const stem: Rgb = [60, 140, 50];
  for (let y = 7; y < 16; y++) t.set(7, y, stem);
  t.set(6, 12, stem);
  t.set(5, 11, stem);
  t.set(8, 10, stem);
  t.set(9, 9, stem);
  for (let y = 2; y <= 6; y++)
    for (let x = 5; x <= 9; x++) {
      const dx = Math.abs(x - 7);
      const dy = Math.abs(y - 4);
      if (dx + dy <= 3) t.set(x, y, petal);
    }
  t.set(7, 4, heart);
}
