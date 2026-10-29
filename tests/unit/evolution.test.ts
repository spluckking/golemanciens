import { describe, expect, it } from 'vitest';
import { canEvolve, evolve, usableItems } from '../../src/core/evolution';
import { createGameState, createGolem } from '../../src/core/gameState';
import { unlockedAttacks } from '../../src/data/creatures';

describe('évolution (SPEC § 4.3)', () => {
  it('une Rune d’éveil fait passer un golem du stade 1 au stade 2 : ×1,35, PV pleins, repas remis à zéro, A3', () => {
    const s = createGameState();
    s.golems.push({ ...createGolem('pierre'), hp: 10, meals: 4 });
    expect(canEvolve(s, 'pierre', 'rune')).toBe('noItem');
    s.items.rune = 1;
    expect(usableItems(s, 'pierre')).toEqual(['rune']);
    expect(evolve(s, 'pierre', 'rune')).toBe('ok');
    const g = s.golems[0];
    expect(g).toMatchObject({ stage: 2, maxHp: 54, atk: 11, hp: 54, meals: 0 });
    expect(s.items.rune).toBe(0);
    expect(unlockedAttacks('pierre', g.stage).map((a) => a.slot)).toEqual(['a1', 'a2', 'a3']);
  });

  it('un objet ne s’applique qu’au bon stade', () => {
    const s = createGameState();
    s.golems.push({ ...createGolem('mousse'), stage: 2 });
    s.items.rune = 1;
    expect(canEvolve(s, 'mousse', 'rune')).toBe('wrongStage');
    expect(evolve(s, 'mousse', 'rune')).toBe('wrongStage');
    expect(s.items.rune).toBe(1);
    expect(canEvolve(s, 'inconnu', 'rune')).toBe('unknown');
  });
});
