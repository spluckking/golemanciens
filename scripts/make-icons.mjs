// Génère les icônes PNG de la PWA à partir d'un dessin en pixel art défini ici
// (aucune image externe). Sortie : public/icons/.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

// Tête de golem en pierre, yeux lumineux, touffe de mousse. 16×16.
const ART = [
  '................',
  '.....mmmmmm.....',
  '....mMmmMmmm....',
  '...gggggggggg...',
  '..gGGGGGGGGGGg..',
  '..gGGGGGGGGGGg..',
  '..gGEEGGGGEEGg..',
  '..gGEEGGGGEEGg..',
  '..gGGGGddGGGGg..',
  '..gGGGGddGGGGg..',
  '..gGGGGGGGGGGg..',
  '..gGGdddddDGGg..',
  '..gGGGGGGGGGGg..',
  '...gggggggggg...',
  '................',
  '................',
];
const PALETTE = {
  '.': null,
  g: [70, 72, 90],
  G: [150, 152, 168],
  d: [100, 102, 118],
  D: [100, 102, 118],
  E: [111, 240, 255],
  m: [90, 170, 70],
  M: [130, 210, 90],
};
const BG = [29, 43, 83];
const RING = [240, 196, 60];

function render(size, artScale, rounded) {
  const px = Buffer.alloc(size * size * 4);
  const artSize = 16 * artScale;
  const off = Math.floor((size - artSize) / 2);
  const r = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let c = BG;
      let a = 255;
      const dx = x + 0.5 - r;
      const dy = y + 0.5 - r;
      const d = Math.hypot(dx, dy);
      if (rounded) {
        if (d > r) a = 0;
        else if (d > r * 0.93) c = RING;
      }
      const ax = Math.floor((x - off) / artScale);
      const ay = Math.floor((y - off) / artScale);
      if (ax >= 0 && ay >= 0 && ax < 16 && ay < 16) {
        const p = PALETTE[ART[ay][ax]];
        if (p) c = p;
      }
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      px[i + 3] = a;
    }
  }
  return encodePng(size, size, px);
}

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'icon-192.png'), render(192, 10, true));
writeFileSync(join(outDir, 'icon-512.png'), render(512, 26, true));
// Icône « maskable » : fond plein, dessin dans la zone sûre centrale.
writeFileSync(join(outDir, 'icon-512-maskable.png'), render(512, 20, false));
console.log('Icônes générées dans public/icons/');
