import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { CHALLENGE_LEVEL, generateCalc, generateChallengeCalc, type CalcKind } from '../../src/questions/calc';

const DRAWS = 1000;

describe('générateur de calcul', () => {
  for (let level = 1; level <= 7; level++) {
    it(`niveau ${level} : ${DRAWS} tirages corrects`, () => {
      const rng = createRng(1000 + level);
      for (let i = 0; i < DRAWS; i++) {
        const q = level === CHALLENGE_LEVEL ? generateChallengeCalc(rng) : generateCalc(level, rng);
        const ctx = `${q.prompt} → ${q.values.join(', ')}`;
        expect(q.level).toBe(level);
        expect(q.values[0], ctx).toBe(q.answer);
        expect(q.values, ctx).toHaveLength(4);
        expect(new Set(q.values).size, ctx).toBe(4);
        expect(new Set(q.labels).size, ctx).toBe(4);
        for (const v of q.values) {
          expect(Number.isInteger(v), ctx).toBe(true);
          expect(v, ctx).toBeGreaterThan(0);
        }
        // L'explication donne la bonne réponse.
        expect(q.explanation, ctx).toContain(q.labels[0]);
        expect(q.prompt.length, ctx).toBeGreaterThan(4);
      }
    });
  }

  it('les réponses sont justes (recalcul indépendant des opérations simples)', () => {
    const rng = createRng(7);
    for (let level = 1; level <= 6; level++) {
      for (let i = 0; i < 300; i++) {
        const q = generateCalc(level, rng);
        const m = /^(\d+) ([+−×]) (\d+) = \?$/.exec(q.prompt);
        if (!m) continue;
        const a = Number(m[1]);
        const b = Number(m[3]);
        const expected = m[2] === '+' ? a + b : m[2] === '−' ? a - b : a * b;
        expect(q.answer, q.prompt).toBe(expected);
      }
    }
  });

  it('respecte les bornes de chaque niveau', () => {
    const rng = createRng(99);
    for (let i = 0; i < 2000; i++) {
      const q1 = generateCalc(1, rng);
      if (q1.kind === 'add' || q1.kind === 'sub') expect(q1.answer).toBeLessThanOrEqual(20);
      if (q1.kind === 'mul') expect([1, 2, 5, 10]).toContain(q1.tables[0]);
      const q2 = generateCalc(2, rng);
      if (q2.kind === 'add' || q2.kind === 'sub') {
        const [a, b] = q2.prompt.match(/\d+/g)!.map(Number);
        expect((a % 10) + (q2.kind === 'add' ? b % 10 : 0)).toBeLessThan(q2.kind === 'add' ? 10 : 100);
        if (q2.kind === 'sub') expect(a % 10).toBeGreaterThanOrEqual(b % 10);
        expect(Math.max(a, b, q2.answer)).toBeLessThanOrEqual(100);
      }
      const q3 = generateCalc(3, rng);
      if (q3.kind === 'add') {
        const [a, b] = q3.prompt.match(/\d+/g)!.map(Number);
        expect((a % 10) + (b % 10)).toBeGreaterThanOrEqual(10);
        expect(q3.answer).toBeLessThanOrEqual(100);
      }
      const q5 = generateCalc(5, rng);
      if (q5.kind === 'add') expect(q5.answer).toBeLessThanOrEqual(1000);
      if (q5.kind === 'time') for (const l of q5.labels) expect(l).toMatch(/^(1[0-2]|[1-9]) h( \d\d)?$/);
    }
  });

  it('toutes les tables de 1 à 10 apparaissent sur l’ensemble des niveaux', () => {
    const rng = createRng(2026);
    const seen = new Set<number>();
    for (let level = 1; level <= 6; level++) {
      for (let i = 0; i < DRAWS; i++) for (const t of generateCalc(level, rng).tables) seen.add(t);
    }
    for (let t = 1; t <= 10; t++) expect(seen.has(t), `table de ${t}`).toBe(true);
  });

  it('niveau 7 « défi » : 2 chiffres × 1 chiffre jusqu’à 49 × 9, partages jusqu’à 100, résultats jusqu’à 1000', () => {
    const rng = createRng(77);
    const kinds = new Set<CalcKind>();
    for (let i = 0; i < DRAWS; i++) {
      const q = generateChallengeCalc(rng);
      kinds.add(q.kind);
      expect(q.answer, q.prompt).toBeLessThanOrEqual(1000);
      if (q.kind === 'mul') {
        const [a, b] = q.prompt.match(/\d+/g)!.map(Number);
        expect(a).toBeGreaterThanOrEqual(11);
        expect(a).toBeLessThanOrEqual(49);
        expect(b).toBeLessThanOrEqual(9);
        expect(q.answer).toBe(a * b);
      }
      if (q.kind === 'div') {
        const [total, groups] = q.prompt.match(/\d+/g)!.map(Number);
        expect(total).toBeLessThanOrEqual(100);
        expect(groups).toBeGreaterThanOrEqual(2);
        expect(groups).toBeLessThanOrEqual(9);
        expect(q.answer * groups).toBe(total);
      }
    }
    expect([...kinds].sort()).toEqual(['div', 'mul', 'twoStep']);
    // L'adaptation ne dépasse jamais le niveau 6 (même avec le décalage de l'Ultime).
    expect(generateCalc(8, rng).level).toBe(6);
  });

  it('chaque niveau propose les types de questions prévus', () => {
    const expected: Record<number, CalcKind[]> = {
      1: ['add', 'sub', 'mul'],
      2: ['add', 'sub', 'mul', 'double'],
      3: ['add', 'sub', 'mul', 'half'],
      4: ['add', 'sub', 'mul', 'complement'],
      5: ['add', 'mul', 'money', 'time'],
      6: ['twoStep', 'times10', 'div'],
    };
    const rng = createRng(5);
    for (let level = 1; level <= 6; level++) {
      const kinds = new Set<CalcKind>();
      for (let i = 0; i < 500; i++) kinds.add(generateCalc(level, rng).kind);
      expect([...kinds].sort()).toEqual([...expected[level]].sort());
    }
  });
});
