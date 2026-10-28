import { describe, expect, it } from 'vitest';
import { createStats } from '../../src/core/gameState';
import { createRng } from '../../src/core/rng';
import { formatPlayTime, mostMissedTables, rate, recordCalc, recordRiddle } from '../../src/core/stats';
import { generateCalc } from '../../src/questions/calc';

describe('statistiques du menu parent', () => {
  it('compte les réponses par niveau, par type d’opération et par table', () => {
    const s = createStats();
    const rng = createRng(3);
    let q = generateCalc(1, rng);
    while (q.kind !== 'mul') q = generateCalc(1, rng);
    recordCalc(s, q, false);
    recordCalc(s, q, true);
    expect(s.calcLevels['1']).toEqual({ asked: 2, correct: 1 });
    expect(s.calcKinds.mul).toEqual({ asked: 2, correct: 1 });
    expect(s.tables[String(q.tables[0])]).toEqual({ asked: 2, correct: 1 });
    recordRiddle(s, 2, true);
    expect(s.riddleLevels['2']).toEqual({ asked: 1, correct: 1 });
  });

  it('les tables les plus ratées d’abord ; les tables jamais ratées ne sont pas citées', () => {
    const s = createStats();
    s.tables = { '7': { asked: 10, correct: 6 }, '8': { asked: 4, correct: 2 }, '2': { asked: 9, correct: 9 }, '9': { asked: 3, correct: 1 } };
    expect(mostMissedTables(s).map((t) => t.table)).toEqual([7, 9, 8]);
    expect(mostMissedTables(s, 1)).toEqual([{ table: 7, missed: 4, asked: 10 }]);
  });

  it('taux et temps de jeu lisibles', () => {
    expect(rate({ asked: 3, correct: 2 })).toBe(67);
    expect(rate(undefined)).toBeNull();
    expect(formatPlayTime(59)).toBe('0 min');
    expect(formatPlayTime(725)).toBe('12 min');
    expect(formatPlayTime(3900)).toBe('1 h 05 min');
  });
});
