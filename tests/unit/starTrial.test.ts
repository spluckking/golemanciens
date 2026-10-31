import { describe, expect, it } from 'vitest';
import { createGameState, createGolem } from '../../src/core/gameState';
import { createRng } from '../../src/core/rng';
import { GALAXY_MULT } from '../../src/data/balance';
import { GOLEMS, unlockedAttacks } from '../../src/data/creatures';
import { STAR_COUNT, STAR_PATTERN, StarTrial, galaxyCandidates, guaranteeStage4, makeGalaxy } from '../../src/quests/starTrial';

describe('Épreuve des Étoiles (révision 1.7)', () => {
  it('12 étoiles : 6 calculs niveau 7, 3 calculs niveau 6, 3 énigmes niveau 5, en alternance', () => {
    expect(STAR_COUNT).toBe(12);
    expect(STAR_PATTERN.filter((k) => k === 'calc7')).toHaveLength(6);
    expect(STAR_PATTERN.filter((k) => k === 'calc6')).toHaveLength(3);
    expect(STAR_PATTERN.filter((k) => k === 'riddle5')).toHaveLength(3);
    for (let i = 1; i < STAR_PATTERN.length; i++) expect(STAR_PATTERN[i] === 'calc6' && STAR_PATTERN[i - 1] === 'calc6').toBe(false);
  });

  it('une erreur n’éteint rien et propose une autre question du même genre ; Lumibloc encourage à 4 et 8', () => {
    const state = createGameState();
    const trial = new StarTrial(state.starTrial, state, createRng(3));
    const cheers: string[] = [];
    let mistakes = 0;
    for (let step = 0; !trial.done && step < 100; step++) {
      const kind = trial.kind;
      const v = trial.view;
      expect(v.badge).toBe(kind === 'riddle5' ? 'riddle' : 'calc');
      // Une erreur sur deux, au début de chaque étoile.
      const wrong = step % 3 === 0;
      const res = trial.answer(wrong ? (v.correctIndex + 1) % v.choices.length : v.correctIndex);
      if (!res.correct) {
        mistakes++;
        expect(trial.kind).toBe(kind);
        expect(trial.view).not.toBe(v);
      }
      if (res.cheer) cheers.push(res.cheer);
    }
    expect(trial.done).toBe(true);
    expect(state.starTrial.lit).toBe(12);
    expect(mistakes).toBeGreaterThan(0);
    expect(cheers).toEqual(['stars4', 'stars8']);
  });

  it('les étoiles allumées sont enregistrées : on reprend où l’on s’était arrêté', () => {
    const state = createGameState();
    const a = new StarTrial(state.starTrial, state, createRng(1));
    for (let i = 0; i < 5; i++) a.answer(a.view.correctIndex);
    const b = new StarTrial(state.starTrial, state, createRng(2));
    expect(b.lit).toBe(5);
    expect(b.kind).toBe(STAR_PATTERN[5]);
  });
});

describe('Galaxie et garantie (SPEC.md § 4.3)', () => {
  it('seul un golem au stade 4 peut devenir Galaxie : ×1,4 et toutes ses attaques ✨', () => {
    const state = createGameState();
    const g = createGolem('pierre');
    g.stage = 4;
    const other = createGolem('mousse');
    state.golems.push(g, other);
    expect(galaxyCandidates(state).map((k) => k.id)).toEqual(['pierre']);
    expect(makeGalaxy(state, 'mousse')).toBe(false);
    const atk = g.atk;
    expect(makeGalaxy(state, 'pierre')).toBe(true);
    expect(g.species).toBe('galaxie');
    expect(g.atk).toBe(Math.round(atk * GALAXY_MULT));
    expect(unlockedAttacks(g.species, g.stage).every((a) => a.type === 'star')).toBe(true);
    expect(unlockedAttacks(g.species, g.stage)).toHaveLength(4);
    expect(GOLEMS.galaxie.attacks.map((a) => a.name)).toEqual(['Étoile filante', 'Pluie de météores', 'Trou noir', 'Supernova']);
    expect(galaxyCandidates(state)).toHaveLength(0);
  });

  it('garantie : sans golem au stade 4, le plus avancé reçoit les objets qui manquent et y arrive', () => {
    const state = createGameState();
    const a = createGolem('pierre');
    a.stage = 2;
    const b = createGolem('nuage');
    state.golems.push(a, b);
    const res = guaranteeStage4(state);
    expect(res.golem?.id).toBe('pierre');
    expect(res.given).toEqual(['crystal', 'heart']);
    expect(a.stage).toBe(4);
    expect(galaxyCandidates(state).map((k) => k.id)).toEqual(['pierre']);
    // Rien à donner quand un golem est déjà prêt.
    expect(guaranteeStage4(state)).toEqual({ golem: null, given: [] });
  });
});
