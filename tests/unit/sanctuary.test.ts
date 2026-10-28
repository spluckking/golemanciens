import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { CONTENT } from '../../src/data/content';
import { createRiddleMemory } from '../../src/questions/riddleBank';
import { RiddleStone, TilePuzzle, advance, createSanctuaryProgress } from '../../src/quests/sanctuary';

describe('pierre-énigme', () => {
  it('tire une énigme du niveau 1 ; une erreur en propose une autre, du même niveau', () => {
    const memory = createRiddleMemory();
    const stone = new RiddleStone(CONTENT.riddles, memory, 1, createRng(1));
    const first = stone.current;
    expect(first.level).toBe(1);
    const wrong = (first.answer + 1) % first.choices.length;
    const res = stone.answer(wrong);
    expect(res.correct).toBe(false);
    expect(res.explanation).toBe(first.explanation);
    expect(stone.current.id).not.toBe(first.id);
    expect(stone.current.level).toBe(1);
    expect(stone.answer(stone.current.answer).correct).toBe(true);
    expect(memory.seen.length).toBe(2);
  });

  it('ne bloque jamais : 40 erreurs de suite proposent toujours une énigme de niveau 1', () => {
    const stone = new RiddleStone(CONTENT.riddles, createRiddleMemory(), 1, createRng(2));
    for (let i = 0; i < 40; i++) {
      stone.answer((stone.current.answer + 1) % 3);
      expect(stone.current.level).toBe(1);
    }
  });
});

describe('dalles fleuries', () => {
  it('rouge, jaune, bleue dans l’ordre de la fresque', () => {
    const p = new TilePuzzle();
    expect(p.step('red')).toBe('progress');
    expect(p.step('red')).toBe('ignored');
    expect(p.step('yellow')).toBe('progress');
    expect(p.step('blue')).toBe('done');
    expect(p.solved).toBe(true);
    expect(p.step('violet')).toBe('ignored');
  });

  it('une erreur éteint toutes les dalles ; l’aide de Lumibloc arrive au 3e échec', () => {
    const p = new TilePuzzle();
    p.step('red');
    expect(p.step('blue')).toBe('wrong');
    expect(p.lit).toEqual([]);
    expect(p.step('white')).toBe('wrong');
    expect(p.needsHint).toBe(false);
    expect(p.step('yellow')).toBe('wrong');
    expect(p.needsHint).toBe(true);
    expect(p.fails).toBe(3);
  });

  it('« Recommencer » éteint les dalles sans compter d’échec', () => {
    const p = new TilePuzzle();
    p.step('red');
    p.step('yellow');
    p.reset();
    expect(p.lit).toEqual([]);
    expect(p.fails).toBe(0);
    expect(p.step('red')).toBe('progress');
  });
});

describe('avancement du sanctuaire', () => {
  it('pierre → dalles → porte ouverte → éclosion', () => {
    const s = createSanctuaryProgress();
    const steps = [s.step];
    for (let i = 0; i < 4; i++) {
      advance(s);
      steps.push(s.step);
    }
    expect(steps).toEqual(['stone', 'tiles', 'open', 'hatched', 'hatched']);
  });
});

describe('contenu du sanctuaire S1', () => {
  it('l’aide des dalles vient de CONTENU.md', async () => {
    const { readFileSync } = await import('node:fs');
    const md = readFileSync('CONTENU.md', 'utf8');
    const { S1_HINT } = await import('../../src/data/sanctuaries');
    expect(md).toContain(S1_HINT);
    expect(md).toContain('rouge, jaune, bleue');
  });
});
