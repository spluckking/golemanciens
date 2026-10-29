import { describe, expect, it } from 'vitest';
import { generateGivre } from '../../src/world/givre';
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


describe('Pics de Givre', () => {
  const g = generateGivre();
  const w = g.world;
  const start = { x: Math.floor(g.arrival.x), y: w.standY(Math.floor(g.arrival.x), Math.floor(g.arrival.z)), z: Math.floor(g.arrival.z) };
  const zone = reachable(w, start);
  const columns = new Set([...zone].map((k) => k.split(',').filter((_, i) => i !== 1).join(',')));
  const reaches = (x: number, z: number): boolean => {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (columns.has(`${Math.floor(x) + dx},${Math.floor(z) + dz}`)) return true;
    return false;
  };

  it('le hall du sanctuaire, le village, les PNJ et les objets de quête sont accessibles', () => {
    const s = g.sanctuary;
    const targets = [
      s.entrance,
      s.stone,
      ...g.npcs,
      g.village.woodPile,
      ...g.village.fishingHoles,
      ...g.village.bells,
      ...g.logs,
      g.nilou,
      ...g.braziers,
      g.heart,
      { x: g.arena.gate[0].x + 2.5, z: g.arena.gate[0].z + 0.5 },
      g.summit.center,
      ...g.lanterns,
    ];
    for (const p of targets) expect(reaches(p.x, p.z), `${p.x}, ${p.z}`).toBe(true);
  });

  it('les portes de glace sont fermées au départ (la salle de glace n’est pas encore accessible)', () => {
    const o = g.sanctuary.slideOrigin;
    expect(reaches(o.x + 2, o.z + 2)).toBe(false);
    expect(reaches(g.sanctuary.nest.x, g.sanctuary.nest.z)).toBe(false);
    for (const c of [...g.sanctuary.doorA, ...g.sanctuary.doorB, ...g.sanctuary.doorC]) expect(w.solidAt(c.x, c.y, c.z)).toBe(true);
  });

  it('la salle de glace reproduit la glissade : sol de glace, rochers, ouverture nord', () => {
    const o = g.sanctuary.slideOrigin;
    const y = g.sanctuary.floorY;
    expect(w.get(Math.floor(o.x), y - 1, Math.floor(o.z))).toBe(22);
    expect(w.solidAt(Math.floor(o.x) + 1, y, Math.floor(o.z) + 1)).toBe(true);
    expect(w.solidAt(Math.floor(o.x) + 4, y, Math.floor(o.z) - 1)).toBe(false);
  });
});
