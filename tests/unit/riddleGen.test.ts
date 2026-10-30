import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { generateCalc } from '../../src/questions/calc';
import { freshCalc, generateRiddle, tellCalc } from '../../src/questions/riddleGen';

describe('énigmes générées', () => {
  it('3 choix distincts, la bonne réponse en premier, une explication, pour chaque niveau et chaque phase', () => {
    const rng = createRng(7);
    for (let phase = 1; phase <= 6; phase++)
      for (let level = 1; level <= 5; level++)
        for (let i = 0; i < 400; i++) {
          const r = generateRiddle(level, phase, [], rng);
          expect(r.level).toBe(level);
          expect(new Set(r.choices).size, r.text).toBe(3);
          expect(r.answer).toBe(0);
          expect(r.text.length).toBeGreaterThan(10);
          expect(r.explanation.length).toBeGreaterThan(5);
          expect(r.text + r.explanation + r.choices.join()).not.toMatch(/undefined|NaN|-\d/);
        }
  });

  it('les réponses chiffrées sont justes : pattes, partage et suites restent cohérents', () => {
    const rng = createRng(11);
    for (let i = 0; i < 3000; i++) {
      const r = generateRiddle(5, 3, [], rng);
      const seq = /après : (\d+), (\d+), (\d+), (\d+)… \?/.exec(r.text);
      if (seq) {
        const [a, b, c, d] = seq.slice(1).map(Number);
        if (b - a === c - b) expect(Number(r.choices[0])).toBe(d + (d - c));
        else expect(Number(r.choices[0])).toBe((d * b) / a);
      }
    }
  });

  it('300 combats de suite sans jamais reposer la même question', () => {
    const rng = createRng(3);
    const asked: string[] = [];
    for (const level of [1, 3, 5]) {
      const seen = new Set<string>();
      for (let i = 0; i < 300; i++) seen.add(generateRiddle(level, 2, asked, rng).text);
      expect(seen.size).toBe(300);
    }
  });

  it('chaque phase a ses propres questions', () => {
    const texts = (phase: number): Set<string> => {
      const rng = createRng(5);
      return new Set(Array.from({ length: 300 }, () => generateRiddle(3, phase, [], rng).text));
    };
    const a = texts(1);
    const shared = [...texts(4)].filter((x) => a.has(x)).length;
    expect(shared).toBeLessThan(30);
  });
});

describe('calculs des combats', () => {
  it('un calcul raconté garde sa réponse et ses choix', () => {
    const rng = createRng(9);
    let told = 0;
    for (let i = 0; i < 1000; i++) {
      const q = generateCalc(2, rng);
      const t = tellCalc(q, 3, rng);
      expect(t.answer).toBe(q.answer);
      expect(t.labels).toEqual(q.labels);
      if (t.prompt !== q.prompt) {
        told++;
        expect(t.prompt).not.toMatch(/undefined|NaN/);
      }
    }
    expect(told).toBeGreaterThan(50);
  });

  it('pas de calcul identique tant que le niveau offre assez de combinaisons', () => {
    const rng = createRng(2);
    const asked: string[] = [];
    const prompts = Array.from({ length: 40 }, () => freshCalc(() => generateCalc(3, rng), 1, asked, () => 1).prompt);
    expect(new Set(prompts).size).toBe(40);
  });
});
