import { describe, expect, it } from 'vitest';
import { generateForest } from '../../src/world/forest';
import type { VoxelWorld } from '../../src/world/voxelWorld';

/** Cases où le héros peut se tenir : (x, z, pieds). */
function canStand(w: VoxelWorld, x: number, y: number, z: number): boolean {
  return w.solidAt(x, y - 1, z) && !w.solidAt(x, y, z) && !w.solidAt(x, y + 1, z);
}

/** Parcours en largeur : on monte d'un bloc au plus (marche automatique), on peut descendre de 4. */
function reachable(w: VoxelWorld, start: { x: number; y: number; z: number }): Set<string> {
  const key = (x: number, y: number, z: number): string => `${x},${y},${z}`;
  const seen = new Set<string>([key(start.x, start.y, start.z)]);
  const queue = [start];
  while (queue.length) {
    const p = queue.shift()!;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = p.x + dx;
      const z = p.z + dz;
      for (let dy = 1; dy >= -4; dy--) {
        const y = p.y + dy;
        // Pour monter, il faut de la place au-dessus de la tête au départ.
        if (dy === 1 && w.solidAt(p.x, p.y + 2, p.z)) continue;
        if (!canStand(w, x, y, z)) continue;
        const k = key(x, y, z);
        if (!seen.has(k)) {
          seen.add(k);
          queue.push({ x, y, z });
        }
        break;
      }
    }
  }
  return seen;
}

describe('Forêt Murmurante', () => {
  const f = generateForest();
  const w = f.world;
  const start = { x: Math.floor(f.arrival.x), y: w.standY(Math.floor(f.arrival.x), Math.floor(f.arrival.z)), z: Math.floor(f.arrival.z) };
  const zone = reachable(w, start);
  const reaches = (x: number, z: number, y?: number): boolean => {
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        for (const k of zone) {
          const [kx, ky, kz] = k.split(',').map(Number);
          if (kx === Math.floor(x) + dx && kz === Math.floor(z) + dz && (y === undefined || ky === y)) return true;
        }
    return false;
  };

  it('on marche de l’arche jusqu’à la cabane la plus haute, par les escaliers et les passerelles', () => {
    const h = f.village.highCabin;
    // Bien plus haut que le sol de la forêt (où l'on arrive par l'arche).
    expect(h.y).toBeGreaterThanOrEqual(start.y + 8);
    expect(reaches(h.x, h.z, h.y)).toBe(true);
    for (const p of f.village.platforms) expect(reaches(p.x, p.z, p.y)).toBe(true);
  });

  it('le sanctuaire, l’arène, le repaire, les PNJ, la rune et les objets de quête sont accessibles', () => {
    const targets = [
      f.sanctuary.entrance,
      // L'arène est fermée par sa barrière : on vérifie qu'on arrive devant.
      { x: f.arena.gate[0].x + 2.5, z: f.arena.gate[0].z + 0.5 },
      f.lair.center,
      f.rune,
      f.village.pipLantern,
      ...f.npcs,
      ...f.mushrooms.blue,
      ...f.mushrooms.red,
      ...f.webs,
      ...f.lanterns,
    ];
    for (const t of targets) expect(reaches(t.x, t.z), `${t.x}, ${t.z}`).toBe(true);
  });

  it('20 caisses, 4 lanternes, 4 champignons bleus et 4 rouges, 3 toiles, le pont cassé à réparer', () => {
    expect(f.crates).toHaveLength(20);
    expect(f.lanterns).toHaveLength(4);
    expect(f.mushrooms.blue).toHaveLength(4);
    expect(f.mushrooms.red).toHaveLength(4);
    expect(f.webs).toHaveLength(3);
    expect(f.brokenBridge.gap.length).toBeGreaterThan(0);
  });
});
