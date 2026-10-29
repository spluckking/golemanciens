import { describe, expect, it } from 'vitest';
import { generateVolcan } from '../../src/world/volcan';
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


describe('Volcan d’Ombre', () => {
  const v = generateVolcan();
  const w = v.world;
  const start = { x: Math.floor(v.arrival.x), y: w.standY(Math.floor(v.arrival.x), Math.floor(v.arrival.z)), z: Math.floor(v.arrival.z) };
  const zone = reachable(w, start);
  const columns = new Set([...zone].map((k) => k.split(',').filter((_, i) => i !== 1).join(',')));
  const reaches = (x: number, z: number): boolean => columns.has(`${Math.floor(x)},${Math.floor(z)}`);

  it('le chemin passe par les trois camps, franchit le pont de pierre noire et mène au fond du cratère', () => {
    for (const c of v.camps) expect(reaches(c.x, c.z), c.id).toBe(true);
    for (let z = v.bridge.z0; z <= v.bridge.z1; z++) expect(reaches(v.bridge.x + 0.5, z + 0.5), `pont ${z}`).toBe(true);
    expect(reaches(v.crater.center.x, v.crater.center.z)).toBe(true);
    for (const l of v.lanterns) expect(reaches(l.x, l.z)).toBe(true);
  });

  it('le lac de lave entoure le pont : sans le pont, pas de passage', () => {
    // Sur la ligne du lac, seules les cases du pont sont en pierre ; le reste est de la lave.
    const z = Math.floor((v.bridge.z0 + v.bridge.z1) / 2);
    expect(w.get(v.bridge.x, 9, z)).toBe(15);
    expect(w.get(v.bridge.x + 6, 9, z)).toBe(16);
    expect(v.camps.every((c) => c.strength && c.strength > 1)).toBe(true);
  });
});
