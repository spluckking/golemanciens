import { describe, expect, it } from 'vitest';
import { createGolem, type GolemData } from '../../src/core/gameState';
import { createRng } from '../../src/core/rng';
import { EVOLUTION_MULT, GALAXY_MULT } from '../../src/data/balance';
import type { GolemSpecies } from '../../src/data/creatures';
import { bossFight } from './simulate';

/**
 * Objectifs de SPEC.md § 15 pour la finale : le Dragon d'Ombre demande 15 à 25 questions et se gagne
 * au moins 8 fois sur 10 à 70 % de bonnes réponses. L'équipe attendue : le golem de la phase 1 devenu
 * Galaxie (stade 4, × 1,4), celui de la phase 2 au stade 4, ceux des phases 3 à 5 au stade 1, tous au
 * plafond de repas. Le Galaxie commence (lui seul entame l'armure de l'étape 1).
 */

const RUNS = 1500;
const ACCURACY = 0.7;
const mean = (v: number[]): number => v.reduce((a, b) => a + b, 0) / v.length;

function golem(species: GolemSpecies, stage: number, meals = 4): GolemData {
  const g = createGolem(species);
  for (let s = 1; s < stage; s++) {
    g.stage++;
    g.maxHp = Math.round(g.maxHp * EVOLUTION_MULT);
    g.atk = Math.round(g.atk * EVOLUTION_MULT);
  }
  for (let i = 0; i < meals; i++) {
    if (i % 2 === 0) g.atk += 1;
    else g.maxHp += 4;
  }
  g.hp = g.maxHp;
  return g;
}

function galaxy(from: GolemSpecies): GolemData {
  const g = golem(from, 4);
  g.species = 'galaxie';
  g.maxHp = Math.round(g.maxHp * GALAXY_MULT);
  g.atk = Math.round(g.atk * GALAXY_MULT);
  g.hp = g.maxHp;
  return g;
}

const TEAMS: GolemSpecies[][] = [
  ['pierre', 'ecorce', 'sable', 'glace', 'nuage'],
  ['mousse', 'champignon', 'cuivre', 'cristal', 'arcEnCiel'],
  ['pierre', 'champignon', 'cuivre', 'glace', 'arcEnCiel'],
  ['mousse', 'ecorce', 'sable', 'cristal', 'nuage'],
];
const expectedTeam = (t: GolemSpecies[]): GolemData[] => [galaxy(t[0]), golem(t[1], 4), golem(t[2], 1), golem(t[3], 1), golem(t[4], 1)];

describe('équilibrage de la finale (70 % de bonnes réponses)', () => {
  it('le Dragon d’Ombre demande 15 à 25 questions et se gagne au moins 8 fois sur 10, pour chaque équipe', () => {
    const rng = createRng(61);
    for (const t of TEAMS) {
      const fights = Array.from({ length: RUNS }, () => bossFight(expectedTeam(t), 'dragon', rng, ACCURACY));
      const won = fights.filter((f) => f.won);
      const q = mean(won.map((f) => f.questions));
      expect(q, t.join('+')).toBeGreaterThanOrEqual(15);
      expect(q, t.join('+')).toBeLessThanOrEqual(25);
      expect(won.length / RUNS, t.join('+')).toBeGreaterThanOrEqual(0.8);
    }
  });
});
