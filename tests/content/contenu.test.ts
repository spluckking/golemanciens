import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseContenu } from '../../scripts/parseContenu.ts';
import { CONTENT } from '../../src/data/content';

const markdown = readFileSync(join(__dirname, '..', '..', 'CONTENU.md'), 'utf8');

describe('CONTENU.md et src/data', () => {
  it('les données correspondent exactement au fichier (sinon : npm run content)', () => {
    expect(CONTENT).toEqual(parseContenu(markdown));
  });

  it('il y a 6 textes, 6 outros, 60 énigmes et toutes les répliques de Lumibloc', () => {
    expect(CONTENT.stories.map((s) => s.id)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6']);
    expect(CONTENT.outros.map((o) => o.id)).toEqual(['O1', 'O2', 'O3', 'O4', 'O5', 'O6']);
    expect(CONTENT.riddles).toHaveLength(60);
    expect(Object.keys(CONTENT.lumibloc)).toHaveLength(11);
  });
});

describe('textes et questions de lecture', () => {
  for (const story of CONTENT.stories) {
    describe(story.id, () => {
      it('a au moins un paragraphe et 8 questions', () => {
        expect(story.paragraphs.length).toBeGreaterThan(0);
        expect(story.questions).toHaveLength(8);
      });

      it('chaque question a 3 choix distincts et exactement 1 bonne réponse', () => {
        for (const q of story.questions) {
          expect(q.choices, q.text).toHaveLength(3);
          expect(new Set(q.choices).size, q.text).toBe(3);
          expect(q.answer, q.text).toBeGreaterThanOrEqual(0);
          expect(q.answer, q.text).toBeLessThan(3);
        }
      });

      it("aucune question n'est en double", () => {
        expect(new Set(story.questions.map((q) => q.text)).size).toBe(8);
      });
    });
  }
});

describe("banque d'énigmes", () => {
  it('12 énigmes par niveau, de 1 à 5', () => {
    for (let level = 1; level <= 5; level++) {
      expect(CONTENT.riddles.filter((r) => r.level === level)).toHaveLength(12);
    }
  });

  it('identifiants et énoncés uniques', () => {
    expect(new Set(CONTENT.riddles.map((r) => r.id)).size).toBe(60);
    expect(new Set(CONTENT.riddles.map((r) => r.text)).size).toBe(60);
  });

  it('3 choix distincts, 1 bonne réponse et une explication', () => {
    for (const r of CONTENT.riddles) {
      expect(r.choices, r.id).toHaveLength(3);
      expect(new Set(r.choices).size, r.id).toBe(3);
      expect(r.answer, r.id).toBeGreaterThanOrEqual(0);
      expect(r.answer, r.id).toBeLessThan(3);
      expect(r.explanation.length, r.id).toBeGreaterThan(5);
      expect(r.id.startsWith(`E${r.level}-`), r.id).toBe(true);
    }
  });
});

describe('outros', () => {
  it('chaque outro a un texte', () => {
    for (const o of CONTENT.outros) expect(o.text.length, o.id).toBeGreaterThan(40);
  });
});
