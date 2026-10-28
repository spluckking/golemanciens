import { describe, expect, it } from 'vitest';
import { createGameState, createGolem } from '../../src/core/gameState';
import { canFeed, feedGolem } from '../../src/core/meals';

function state(food: number) {
  const s = createGameState();
  s.golems.push(createGolem('pierre'));
  s.food = food;
  return s;
}

describe('repas', () => {
  it('3 🍎 : +4 PV max (et +4 PV) ou +1 ATQ, pour toujours', () => {
    const s = state(10);
    s.golems[0].hp = 30;
    expect(feedGolem(s, 'pierre', 'hp')).toBe('ok');
    expect(s.golems[0]).toMatchObject({ maxHp: 44, hp: 34, atk: 8, meals: 1 });
    expect(feedGolem(s, 'pierre', 'atk')).toBe('ok');
    expect(s.golems[0]).toMatchObject({ maxHp: 44, atk: 9, meals: 2 });
    expect(s.food).toBe(4);
  });

  it('pas assez de pommes : rien ne change', () => {
    const s = state(2);
    expect(canFeed(s, 'pierre')).toBe('noFood');
    expect(feedGolem(s, 'pierre', 'atk')).toBe('noFood');
    expect(s.golems[0].atk).toBe(8);
    expect(s.food).toBe(2);
  });

  it('au plus 4 repas par stade', () => {
    const s = state(100);
    for (let i = 0; i < 4; i++) expect(feedGolem(s, 'pierre', 'atk')).toBe('ok');
    expect(feedGolem(s, 'pierre', 'hp')).toBe('full');
    expect(s.golems[0]).toMatchObject({ atk: 12, maxHp: 40, meals: 4 });
    expect(s.food).toBe(88);
    expect(canFeed(s, 'inconnu')).toBe('unknown');
  });
});
