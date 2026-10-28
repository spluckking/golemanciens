import { describe, expect, it } from 'vitest';
import { createGameState, progress } from '../../src/core/gameState';
import { BIOME_NAMES, buildLayout, unlockedBiomes } from '../../src/world/biomes';
import type { WorldLayout } from '../../src/world/layout';

/** Hauteur de sol (premier vide de 2 blocs) au centre d'une case. */
function ground(l: WorldLayout, x: number, z: number): number {
  return l.world.standY(Math.floor(x), Math.floor(z));
}

describe('biomes et voyages', () => {
  it('la Prairie est toujours ouverte ; la Forêt s’ouvre quand T2 est lu', () => {
    const s = createGameState();
    expect(unlockedBiomes(s)).toEqual(['prairie']);
    s.storiesRead.push('T1', 'O1');
    expect(unlockedBiomes(s)).toEqual(['prairie']);
    s.storiesRead.push('T2');
    expect(unlockedBiomes(s)).toEqual(['prairie', 'foret']);
    expect(BIOME_NAMES.foret).toBe('Forêt Murmurante');
  });

  it('chaque biome a son avancement, la partie commence dans la Prairie', () => {
    const s = createGameState();
    expect(s.biome).toBe('prairie');
    progress(s).arena.wins = 2;
    expect(progress(s, 'foret').arena.wins).toBe(0);
    s.biome = 'foret';
    expect(progress(s).arena.wins).toBe(0);
  });

  for (const id of ['prairie', 'foret'] as const) {
    it(`${id} : l’arche et le point d’arrivée sont sur un sol libre, à 8 blocs l’un de l’autre`, () => {
      const l = buildLayout(id);
      expect(l.id).toBe(id);
      const { arch, arrival } = l;
      expect(Math.hypot(arch.x - arrival.x, arch.z - arrival.z)).toBeCloseTo(8);
      for (const p of [arch, arrival]) {
        const y = ground(l, p.x, p.z);
        expect(y).toBeGreaterThan(0);
        expect(l.world.solidAt(Math.floor(p.x), y, Math.floor(p.z))).toBe(false);
      }
      // Entre les deux, on peut marcher (pas de marche de plus d'un bloc).
      for (let k = 1; k <= 8; k++) {
        const t = k / 8;
        const a = ground(l, arch.x + (arrival.x - arch.x) * (t - 1 / 8), arch.z + (arrival.z - arch.z) * (t - 1 / 8));
        const b = ground(l, arch.x + (arrival.x - arch.x) * t, arch.z + (arrival.z - arch.z) * t);
        expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
      }
    });
  }

  it('les identifiants de lanternes et de caisses ne se croisent pas entre biomes', () => {
    const ids = (l: WorldLayout): string[] => [...l.lanterns.map((x) => x.id), ...l.crates.map((x) => x.id), ...l.camps.map((x) => x.id)];
    const prairie = ids(buildLayout('prairie'));
    for (const id of ids(buildLayout('foret'))) expect(prairie).not.toContain(id);
  });
});
