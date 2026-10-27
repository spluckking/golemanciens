import { describe, expect, it } from 'vitest';
import { normalizePlayerName } from '../../src/core/playerName';
import { createRng } from '../../src/core/rng';
import { formatText, NBSP, NNBSP } from '../../src/core/text';
import { CONTENT } from '../../src/data/content';
import { createAdaptiveLevel, levelForAttack, recordAnswer } from '../../src/questions/difficulty';
import { presentRiddle } from '../../src/questions/present';
import { createReadingStats, ReadingLoop } from '../../src/questions/readingLoop';
import { createRiddleMemory, drawRiddle } from '../../src/questions/riddleBank';

describe('banque d’énigmes', () => {
  it('pas de répétition tant qu’il reste des énigmes au niveau demandé', () => {
    const mem = createRiddleMemory();
    const rng = createRng(1);
    const ids = Array.from({ length: 12 }, () => drawRiddle(CONTENT.riddles, mem, 2, rng));
    expect(ids.every((r) => r.level === 2)).toBe(true);
    expect(new Set(ids.map((r) => r.id)).size).toBe(12);
  });

  it('puis tire au niveau voisin, le plus facile d’abord', () => {
    const mem = createRiddleMemory();
    const rng = createRng(2);
    for (let i = 0; i < 12; i++) drawRiddle(CONTENT.riddles, mem, 3, rng);
    expect(drawRiddle(CONTENT.riddles, mem, 3, rng).level).toBe(2);
    for (let i = 0; i < 11; i++) drawRiddle(CONTENT.riddles, mem, 3, rng);
    expect(drawRiddle(CONTENT.riddles, mem, 3, rng).level).toBe(4);
  });

  it('réinitialise le niveau en excluant les 5 dernières', () => {
    const mem = createRiddleMemory();
    const rng = createRng(3);
    // Niveau 1 : seul voisin, le niveau 2.
    for (let i = 0; i < 24; i++) drawRiddle(CONTENT.riddles, mem, 1, rng);
    const lastFive = mem.recent.slice(-5);
    const next = drawRiddle(CONTENT.riddles, mem, 1, rng);
    expect(next.level).toBe(1);
    expect(lastFive).not.toContain(next.id);
  });

  it('le mélange des choix garde la bonne réponse', () => {
    const rng = createRng(4);
    for (const r of CONTENT.riddles) {
      const v = presentRiddle(r, rng);
      expect(v.choices[v.correctIndex]).toBe(r.choices[r.answer]);
      expect(v.sourceIndex[v.correctIndex]).toBe(r.answer);
    }
  });
});

describe('difficulté adaptative', () => {
  it('+1 après 3 réussites d’affilée, −1 après 2 erreurs d’affilée', () => {
    const s = createAdaptiveLevel('calc');
    recordAnswer('calc', s, true);
    recordAnswer('calc', s, true);
    expect(s.level).toBe(1);
    recordAnswer('calc', s, true);
    expect(s.level).toBe(2);
    recordAnswer('calc', s, false);
    expect(s.level).toBe(2);
    recordAnswer('calc', s, false);
    expect(s.level).toBe(1);
  });

  it('une erreur coupe la série de réussites', () => {
    const s = createAdaptiveLevel('riddle');
    for (const ok of [true, true, false, true, true]) recordAnswer('riddle', s, ok);
    expect(s.level).toBe(1);
  });

  it('reste dans les bornes (calcul 1 à 6, énigmes 1 à 5)', () => {
    const c = createAdaptiveLevel('calc', 6);
    for (let i = 0; i < 6; i++) recordAnswer('calc', c, true);
    expect(c.level).toBe(6);
    const r = createAdaptiveLevel('riddle', 1);
    for (let i = 0; i < 6; i++) recordAnswer('riddle', r, false);
    expect(r.level).toBe(1);
    expect(createAdaptiveLevel('riddle', 9).level).toBe(5);
  });

  it('décalages par attaque : A1 et A2 +0, A3 +1, Ultime +2, bornés', () => {
    const s = createAdaptiveLevel('calc', 3);
    expect(levelForAttack('calc', s, 'a1')).toBe(3);
    expect(levelForAttack('calc', s, 'a2')).toBe(3);
    expect(levelForAttack('calc', s, 'a3')).toBe(4);
    expect(levelForAttack('calc', s, 'ultimate')).toBe(5);
    const high = createAdaptiveLevel('riddle', 5);
    expect(levelForAttack('riddle', high, 'ultimate')).toBe(5);
  });
});

describe('boucle de lecture', () => {
  const story = CONTENT.stories[0];

  function answerRound(loop: ReadingLoop, correct: boolean[]): number[] {
    const asked = [...loop.roundIndices];
    for (const ok of correct) {
      const q = loop.currentQuestion()!;
      loop.answer(ok ? q.answer : (q.answer + 1) % 3);
    }
    return asked;
  }

  it('2 bonnes réponses font passer', () => {
    const stats = createReadingStats();
    const loop = new ReadingLoop(story, createRng(1), stats);
    expect(loop.waitSeconds).toBe(20);
    loop.finishReading();
    answerRound(loop, [true, true]);
    expect(loop.phase).toBe('success');
    expect(stats).toEqual({ reads: 1, asked: 2, correct: 2, completed: true });
  });

  it('une erreur renvoie au texte (10 s) avec 2 nouvelles questions', () => {
    const stats = createReadingStats();
    const loop = new ReadingLoop(story, createRng(2), stats);
    loop.finishReading();
    const first = answerRound(loop, [true, false]);
    expect(loop.phase).toBe('retry');
    loop.reread();
    expect(loop.phase).toBe('reading');
    expect(loop.waitSeconds).toBe(10);
    loop.finishReading();
    const second = [...loop.roundIndices];
    expect(second.some((i) => first.includes(i))).toBe(false);
    expect(stats.reads).toBe(2);
    expect(stats.completed).toBe(false);
  });

  it('les 8 questions sont posées avant toute répétition, puis la banque repart sans les 2 dernières', () => {
    const loop = new ReadingLoop(story, createRng(3), createReadingStats());
    const rounds: number[][] = [];
    for (let r = 0; r < 4; r++) {
      loop.finishReading();
      rounds.push(answerRound(loop, [false, false]));
      loop.reread();
    }
    expect(new Set(rounds.flat()).size).toBe(8);
    loop.finishReading();
    const fifth = [...loop.roundIndices];
    expect(fifth.some((i) => rounds[3].includes(i))).toBe(false);
    expect(new Set(fifth).size).toBe(2);
  });
});

describe('textes affichés', () => {
  it('remplace {prenom} et applique les espaces insécables', () => {
    const t = formatText('« Tu es prêt ? » dit Lumibloc à {prenom} : bravo !', 'Léo');
    expect(t).toBe(`«${NBSP}Tu es prêt${NNBSP}?${NBSP}» dit Lumibloc à Léo${NBSP}: bravo${NNBSP}!`);
  });

  it('aucun texte du contenu ne garde une espace ordinaire avant ? ! : ni dans « »', () => {
    const all = [
      ...CONTENT.stories.flatMap((s) => [...s.paragraphs, ...s.questions.flatMap((q) => [q.text, ...q.choices])]),
      ...CONTENT.riddles.flatMap((r) => [r.text, r.explanation, ...r.choices]),
      ...CONTENT.outros.map((o) => o.text),
    ].map((t) => formatText(t, 'Léo'));
    for (const t of all) expect(t, t).not.toMatch(/ [?!:»]|« /);
  });
});

describe('prénom', () => {
  it('nettoie et met une majuscule', () => {
    expect(normalizePlayerName('  léo ')).toBe('Léo');
    expect(normalizePlayerName('jean-marc')).toBe('Jean-marc');
    expect(normalizePlayerName('Zoé')).toBe('Zoé');
  });

  it('refuse les prénoms vides, trop longs ou avec des chiffres', () => {
    expect(normalizePlayerName('   ')).toBeNull();
    expect(normalizePlayerName('Abcdefghijklmnop')).toBeNull();
    expect(normalizePlayerName('Léo2')).toBeNull();
    expect(normalizePlayerName('<b>')).toBeNull();
  });
});
