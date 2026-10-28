import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../src/data/content';
import { CINEMATICS, OUTRO_CINEMATICS, outroCaptions, storyCaptions } from '../../src/story/cinematics';
import { groupCaptions, readingSeconds, splitSentences } from '../../src/story/cinematics/captions';

const normalize = (s: string): string => s.replace(/\s+/g, ' ').trim();

describe('découpage en phrases', () => {
  it('coupe après . ! ? …, en gardant le guillemet fermant avec sa phrase', () => {
    expect(splitSentences('Il pleut. Tu viens ? Oui ! « Bravo. Tu es prêt ? » Fin…')).toEqual([
      'Il pleut.',
      'Tu viens ?',
      'Oui !',
      '« Bravo.',
      'Tu es prêt ? »',
      'Fin…',
    ]);
  });

  it('garde un reste sans ponctuation finale', () => {
    expect(splitSentences('Une phrase. Et la suite')).toEqual(['Une phrase.', 'Et la suite']);
  });

  it('regroupe les phrases plan par plan, et refuse un scénario qui ne couvre pas tout le texte', () => {
    expect(groupCaptions(['A.', 'B.', 'C.'], [2, 1])).toEqual(['A. B.', 'C.']);
    expect(() => groupCaptions(['A.', 'B.'], [1])).toThrow();
    expect(() => groupCaptions(['A.'], [1, 0])).toThrow();
  });

  it('laisse au moins 2,5 s de lecture, et environ 3 mots par seconde', () => {
    expect(readingSeconds('Oui !')).toBe(2.5);
    expect(readingSeconds('un deux trois quatre cinq six sept huit neuf dix onze douze')).toBe(4);
  });
});

describe('cinématiques des textes d’histoire', () => {
  for (const [id, script] of Object.entries(CINEMATICS)) {
    const story = CONTENT.stories.find((s) => s.id === id)!;

    it(`${id} : les sous-titres reprennent le texte mot pour mot, plan par plan`, () => {
      const captions = storyCaptions(story, script);
      expect(captions).toHaveLength(script.shots.length);
      expect(normalize(captions.join(' '))).toBe(normalize(story.paragraphs.join(' ')));
      for (const c of captions) expect(readingSeconds(c)).toBeLessThan(12);
    });

    it(`${id} : chaque plan a 1 à 3 phrases`, () => {
      for (const shot of script.shots) {
        expect(shot.sentences).toBeGreaterThanOrEqual(1);
        expect(shot.sentences).toBeLessThanOrEqual(3);
      }
    });
  }

  it('T1 est raconté en 11 plans', () => {
    expect(CINEMATICS.T1.shots).toHaveLength(11);
  });
});

describe('cinématiques des outros', () => {
  for (const [id, script] of Object.entries(OUTRO_CINEMATICS)) {
    const outro = CONTENT.outros.find((o) => o.id === id)!;
    it(`${id} : les sous-titres reprennent l'outro mot pour mot`, () => {
      const captions = outroCaptions(outro, script);
      expect(captions).toHaveLength(script.shots.length);
      expect(normalize(captions.join(' '))).toBe(normalize(outro.text));
    });
  }
});
