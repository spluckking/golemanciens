import { describe, expect, it } from 'vitest';
import { Block } from '../../src/world/blocks';
import { meshChunk } from '../../src/world/mesher';
import { generatePrairie } from '../../src/world/prairie';

function hash(data: Uint8Array): number {
  let h = 2166136261;
  for (let i = 0; i < data.length; i++) h = Math.imul(h ^ data[i], 16777619);
  return h >>> 0;
}

describe('Prairie de Cubeterre', () => {
  const layout = generatePrairie();
  const { world } = layout;

  it('le relief est identique à graine égale', () => {
    const again = generatePrairie();
    expect(hash(again.world.data)).toBe(hash(world.data));
    expect(again.decorations.length).toBe(layout.decorations.length);
  });

  it('une autre graine donne un autre relief', () => {
    expect(hash(generatePrairie(42).world.data)).not.toBe(hash(world.data));
  });

  it('le héros apparaît debout sur un sol, dans le vide', () => {
    const { x, y, z } = layout.spawn;
    expect(world.solidAt(Math.floor(x), y - 1, Math.floor(z))).toBe(true);
    expect(world.solidAt(Math.floor(x), y, Math.floor(z))).toBe(false);
    expect(world.solidAt(Math.floor(x), y + 1, Math.floor(z))).toBe(false);
  });

  it("l'Académie est construite et tient sous le plafond du monde", () => {
    const { x, z } = layout.landmarks.academy;
    let bricks = 0;
    let gold = 0;
    for (let y = 0; y < world.sizeY; y++)
      for (let dz = -10; dz <= 10; dz++)
        for (let dx = -12; dx <= 12; dx++) {
          const b = world.get(x + dx, y, z + dz);
          if (b === Block.Brick) bricks++;
          if (b === Block.Gold) gold++;
        }
    expect(bricks).toBeGreaterThan(300);
    expect(gold).toBeGreaterThan(0);
  });

  it('la porte de l’Académie est ouverte', () => {
    const d = layout.academyDoor;
    expect(world.solidAt(Math.floor(d.x), d.y, Math.floor(d.z) - 1)).toBe(false);
    expect(world.solidAt(Math.floor(d.x), d.y + 1, Math.floor(d.z) - 1)).toBe(false);
  });

  it('une rivière traverse la carte', () => {
    let water = 0;
    for (let i = 0; i < world.data.length; i++) if (world.data[i] === Block.Water) water++;
    expect(water).toBeGreaterThan(200);
  });

  it('les emplacements réservés sont dans la carte', () => {
    for (const p of Object.values(layout.landmarks)) {
      expect(p.x).toBeGreaterThan(8);
      expect(p.z).toBeGreaterThan(8);
      expect(p.x).toBeLessThan(world.sizeX - 8);
      expect(p.z).toBeLessThan(world.sizeZ - 8);
    }
  });

  it('le budget de triangles du terrain reste sous 300 000', () => {
    let triangles = 0;
    for (let cz = 0; cz < world.chunksZ; cz++)
      for (let cx = 0; cx < world.chunksX; cx++) {
        const m = meshChunk(world, cx, cz);
        triangles += (m.opaque.indices.length + m.water.indices.length) / 3;
      }
    const decoTriangles = layout.decorations.length * 4;
    expect(triangles + decoTriangles).toBeLessThan(300_000);
  });
});
