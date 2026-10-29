import { describe, expect, it } from 'vitest';
import { generateDesert } from '../../src/world/desert';
import type { VoxelWorld } from '../../src/world/voxelWorld';

function canStand(w: VoxelWorld, x: number, y: number, z: number): boolean {
  return w.solidAt(x, y - 1, z) && !w.solidAt(x, y, z) && !w.solidAt(x, y + 1, z);
}

/** Parcours en largeur des cases où l'on se tient (monter d'un bloc, descendre de quatre). */
function reachable(w: VoxelWorld, start: { x: number; y: number; z: number }): Set<string> {
  const key = (x: number, y: number, z: number): string => `${x},${y},${z}`;
  const seen = new Set([key(start.x, start.y, start.z)]);
  const queue = [start];
  while (queue.length) {
    const p = queue.shift()!;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let dy = 1; dy >= -4; dy--) {
        const x = p.x + dx;
        const y = p.y + dy;
        const z = p.z + dz;
        if (dy === 1 && w.solidAt(p.x, p.y + 2, p.z)) continue;
        if (!canStand(w, x, y, z)) continue;
        if (!seen.has(key(x, y, z))) {
          seen.add(key(x, y, z));
          queue.push({ x, y, z });
        }
        break;
      }
    }
  }
  return seen;
}

describe('Désert des Sables Chantants', () => {
  const d = generateDesert();
  const w = d.world;
  const start = { x: Math.floor(d.arrival.x), y: w.standY(Math.floor(d.arrival.x), Math.floor(d.arrival.z)), z: Math.floor(d.arrival.z) };
  const zone = reachable(w, start);
  const columns = new Set([...zone].map((k) => k.split(',').filter((_, i) => i !== 1).join(',')));
  const reaches = (x: number, z: number): boolean => {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (columns.has(`${Math.floor(x) + dx},${Math.floor(z) + dz}`)) return true;
    return false;
  };

  it('l’entrée du temple, la salle du bloc, l’oasis, les PNJ et les objets de quête sont accessibles', () => {
    const t = d.temple;
    const targets = [
      t.entrance,
      { x: t.pushOrigin.x + 2, z: t.pushOrigin.z + 4 },
      ...d.npcs,
      d.village.spring,
      d.village.trough,
      ...d.village.cartCrates,
      ...d.mapPieces,
      d.camel,
      ...d.drums,
      d.crystal,
      { x: d.arena.gate[0].x + 2.5, z: d.arena.gate[0].z + 0.5 },
      d.pit.center,
      ...d.lanterns,
    ];
    for (const p of targets) expect(reaches(p.x, p.z), `${p.x}, ${p.z}`).toBe(true);
  });

  it('les portes du temple sont fermées au départ (la salle des miroirs n’est pas encore accessible)', () => {
    const m = d.temple.mirrorOrigin;
    expect(reaches(m.x + 2, m.z + 2)).toBe(false);
    for (const c of [...d.temple.doorA, ...d.temple.doorB]) expect(w.solidAt(c.x, c.y, c.z)).toBe(true);
  });
});
