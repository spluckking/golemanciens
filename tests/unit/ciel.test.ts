import { describe, expect, it } from 'vitest';
import { CIEL_FALL_Y, generateCiel } from '../../src/world/ciel';
import type { VoxelWorld } from '../../src/world/voxelWorld';

function canStand(w: VoxelWorld, x: number, y: number, z: number): boolean {
  return y > CIEL_FALL_Y && w.solidAt(x, y - 1, z) && !w.solidAt(x, y, z) && !w.solidAt(x, y + 1, z);
}

/** Parcours en largeur des cases où l'on se tient (monter d'un bloc, descendre de quatre, sauter un bloc de vide). */
function reachable(w: VoxelWorld, start: { x: number; y: number; z: number }): Set<string> {
  const key = (x: number, y: number, z: number): string => `${x},${y},${z}`;
  const seen = new Set([key(start.x, start.y, start.z)]);
  const queue = [start];
  const push = (x: number, y: number, z: number): void => {
    if (seen.has(key(x, y, z))) return;
    seen.add(key(x, y, z));
    queue.push({ x, y, z });
  };
  while (queue.length) {
    const p = queue.shift()!;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let stepped = false;
      for (let dy = 1; dy >= -4; dy--) {
        if (dy === 1 && w.solidAt(p.x, p.y + 2, p.z)) continue;
        if (!canStand(w, p.x + dx, p.y + dy, p.z + dz)) continue;
        push(p.x + dx, p.y + dy, p.z + dz);
        stepped = true;
        break;
      }
      // Saut par-dessus un bloc de vide, au même niveau.
      if (!stepped && !w.solidAt(p.x + dx, p.y - 1, p.z + dz) && canStand(w, p.x + 2 * dx, p.y, p.z + 2 * dz)) push(p.x + 2 * dx, p.y, p.z + 2 * dz);
    }
  }
  return seen;
}

describe('Île Céleste', () => {
  const c = generateCiel();
  const w = c.world;
  const start = { x: Math.floor(c.arrival.x), y: w.standY(Math.floor(c.arrival.x), Math.floor(c.arrival.z)), z: Math.floor(c.arrival.z) };
  const zone = reachable(w, start);
  const columns = new Set([...zone].map((k) => k.split(',').filter((_, i) => i !== 1).join(',')));
  const reaches = (x: number, z: number): boolean => {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (columns.has(`${Math.floor(x) + dx},${Math.floor(z) + dz}`)) return true;
    return false;
  };

  it('les ponts arc-en-ciel relient toutes les îles ; PNJ, objets de quête et lieux sont accessibles', () => {
    const s = c.sanctuary;
    const targets = [
      s.entrance,
      s.stone,
      ...c.npcs,
      ...c.windCrystals,
      ...c.lighthouseBraziers,
      ...c.flowers,
      ...c.feathers,
      c.guardian,
      { x: c.arena.gate[0].x + 2.5, z: c.arena.gate[0].z + 0.5 },
      { x: c.lairDoor[0].x + 0.5, z: c.lairDoor[0].z + 2 },
      ...c.camps,
      ...c.lanterns,
      ...c.crates,
    ];
    for (const p of targets) expect(reaches(p.x, p.z), `${p.x}, ${p.z}`).toBe(true);
    // Le gardien est tout en haut de la plus haute tour : on y monte par l'escalier.
    expect(zone.has(`${Math.floor(c.guardian.x)},${c.guardian.y},${Math.floor(c.guardian.z)}`)).toBe(true);
  });

  it('les portes sont fermées au départ : salle des nuages et cour du Griffon inaccessibles', () => {
    expect(reaches(c.sanctuary.cloudStart.x, c.sanctuary.cloudStart.z)).toBe(false);
    expect(reaches(c.lair.center.x, c.lair.center.z)).toBe(false);
    for (const cell of [...c.sanctuary.doorA, ...c.sanctuary.doorB, ...c.sanctuary.doorC, ...c.lairDoor]) expect(w.solidAt(cell.x, cell.y, cell.z)).toBe(true);
  });

  it('dans la salle des nuages, on saute de nuage en nuage dans l’ordre, au-dessus du vide', () => {
    const s = c.sanctuary;
    const y = s.floorY;
    const from = { x: Math.floor(s.cloudStart.x), y, z: Math.floor(s.cloudStart.z) };
    const inside = reachable(w, from);
    for (const cl of s.clouds) expect(inside.has(`${cl.x0},${y},${cl.z0}`), cl.color).toBe(true);
    expect(inside.has(`${Math.floor(s.cloudEnd.x)},${y},${Math.floor(s.cloudEnd.z)}`)).toBe(true);
    // Entre les nuages, c'est le vide (jusqu'à la mer de nuages).
    expect(w.solidAt(s.clouds[0].x0 + 2, y - 1, s.clouds[0].z0)).toBe(false);
  });
});
