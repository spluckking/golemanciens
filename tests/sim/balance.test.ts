import { describe, expect, it } from 'vitest';
import { TurnCombat, arenaMonster } from '../../src/combat/turn/turnCombat';
import { createGolem } from '../../src/core/gameState';
import { createRng } from '../../src/core/rng';
import { MONSTERS, type GolemSpecies, type MonsterSpecies } from '../../src/data/creatures';
import { arenaFight, bestAttack, bossFight, team } from './simulate';

/** Objectifs de SPEC.md § 15 pour la phase 1 : l'équipe attendue est un seul golem, au stade 1. */

const RUNS = 2000;
const ACCURACY = 0.7;
const SPECIES: GolemSpecies[] = ['pierre', 'mousse'];
const MONSTER_SPECIES = (Object.keys(MONSTERS) as MonsterSpecies[]).filter((m) => MONSTERS[m].phase === 1);

function share(values: number[], ok: (v: number) => boolean): number {
  return values.filter(ok).length / values.length;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

describe('équilibrage de la phase 1 (70 % de bonnes réponses)', () => {
  it('un monstre d’arène tombe en 2 à 3 bonnes réponses', () => {
    const rng = createRng(1);
    for (const species of SPECIES) {
      for (const monster of MONSTER_SPECIES) {
        const hits: number[] = [];
        for (let i = 0; i < RUNS; i++) {
          const c = new TurnCombat({ kind: 'arena', golems: [createGolem(species)], monsters: [arenaMonster(monster, 'm')] }, rng);
          let n = 0;
          while (c.phase !== 'won') {
            c.attack(bestAttack(c).slot, true);
            n++;
            if (c.phase === 'monster') c.phase = 'player';
          }
          hits.push(n);
        }
        expect(share(hits, (h) => h >= 2 && h <= 3), `${species} contre ${monster}`).toBeGreaterThanOrEqual(0.95);
      }
    }
  });

  it('un golem encaisse 4 à 6 attaques d’un monstre de sa phase', () => {
    const rng = createRng(2);
    for (const monster of MONSTER_SPECIES) {
      const hits: number[] = [];
      for (let i = 0; i < RUNS; i++) {
        const c = new TurnCombat({ kind: 'arena', golems: [createGolem('pierre')], monsters: [arenaMonster(monster, 'm')] }, rng);
        let n = 0;
        while (c.phase !== 'lost') {
          c.attack('a1', false);
          if (c.monsterTurn().some((e) => e.type === 'damage')) n++;
        }
        hits.push(n);
      }
      expect(mean(hits)).toBeGreaterThanOrEqual(4);
      expect(mean(hits)).toBeLessThanOrEqual(6);
      expect(share(hits, (h) => h >= 4 && h <= 6), monster).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('un combat d’arène est gagné au moins 8 fois sur 10', () => {
    const rng = createRng(3);
    for (const species of SPECIES) {
      const wins = Array.from({ length: RUNS }, () => arenaFight(team([species]), rng, ACCURACY).won);
      expect(share(wins.map(Number), (w) => w === 1), species).toBeGreaterThanOrEqual(0.8);
    }
  });

  it('le Roi Slime demande 8 à 15 questions, avec Pierre comme avec Mousse, et se gagne au moins 8 fois sur 10', () => {
    const rng = createRng(4);
    for (const species of SPECIES) {
      const fights = Array.from({ length: RUNS }, () => bossFight(team([species]), 'roiSlime', rng, ACCURACY));
      const won = fights.filter((f) => f.won);
      const questions = mean(won.map((f) => f.questions));
      expect(questions, species).toBeGreaterThanOrEqual(8);
      expect(questions, species).toBeLessThanOrEqual(15);
      expect(won.length / RUNS, species).toBeGreaterThanOrEqual(0.8);
    }
  });
});
