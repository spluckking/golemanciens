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

  it('aucun trou piège : de chaque endroit où l’on peut se tenir, on peut sortir', () => {
    const s = (x: number, y: number, z: number): boolean => world.solidAt(x, y, z);
    const traps: string[] = [];
    for (let z = 0; z < world.sizeZ; z++)
      for (let x = 0; x < world.sizeX; x++)
        for (let y = 1; y < world.sizeY - 2; y++) {
          // Endroit où le héros (2 blocs de haut) peut se tenir debout.
          if (s(x, y, z) || s(x, y + 1, z) || !s(x, y - 1, z)) continue;
          const canLeave = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].some(([dx, dz]) => {
            const nx = x + dx;
            const nz = z + dz;
            // Passage de plain-pied (ou chute de l'autre côté), ou marche d'un bloc.
            if (!s(nx, y, nz) && !s(nx, y + 1, nz)) return true;
            return !s(nx, y + 1, nz) && !s(nx, y + 2, nz) && !s(x, y + 2, z);
          });
          if (!canLeave) traps.push(`(${x}, ${y}, ${z})`);
        }
    expect(traps).toEqual([]);
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

  it('la maison du joueur : on se réveille dedans, la porte est ouverte, les meubles sont à l’intérieur', () => {
    const { home } = layout.village;
    const { world } = layout;
    const inside = (p: { x: number; z: number }): boolean => p.x > home.x0 + 1 && p.x < home.x1 && p.z > home.z0 + 1 && p.z < home.z1;
    for (const p of [home.wake, home.bed, home.shelf]) expect(inside(p)).toBe(true);
    for (const [x, z] of home.golemPath) expect(inside({ x, z })).toBe(true);
    expect(layout.spawn.x).toBe(home.wake.x);
    expect(layout.spawn.z).toBe(home.wake.z);
    const y = layout.spawn.y;
    expect(world.solidAt(Math.floor(home.wake.x), y - 1, Math.floor(home.wake.z))).toBe(true);
    // Porte de 2 blocs de haut dans le mur nord, et un toit au-dessus de la pièce.
    const doorX = Math.floor(home.door.x);
    expect(world.solidAt(doorX, y, home.z0)).toBe(false);
    expect(world.solidAt(doorX, y + 1, home.z0)).toBe(false);
    expect(world.standY(doorX, home.z0 - 1)).toBe(y);
    expect(world.surfaceY(Math.floor(home.wake.x), Math.floor(home.wake.z))).toBeGreaterThan(y + 3);
  });
});
