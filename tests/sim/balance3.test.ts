import { describe, expect, it } from 'vitest';
import { TurnCombat, arenaMonster, arenaOpponents } from '../../src/combat/turn/turnCombat';
import { createGolem, type GolemData } from '../../src/core/gameState';
import { createRng } from '../../src/core/rng';
import { MONSTERS, type GolemSpecies, type MonsterSpecies } from '../../src/data/creatures';
import { bestAttack, bossFight, playFight } from './simulate';
import { golemAttackDamage, combatGolem } from '../../src/combat/turn/turnCombat';
import { EVOLUTION_MULT } from '../../src/data/balance';

/** Dégât moyen de la meilleure attaque d'un golem contre ce monstre. */
function strength(g: GolemData, monster: MonsterSpecies): number {
  const cg = combatGolem(g, g.maxHp);
  const stage = { weakness: MONSTERS[monster].weakness, attack: '' };
  return Math.max(...cg.attacks.map((a) => golemAttackDamage(cg, a, stage, () => 0.5).amount));
}

/**
 * Objectifs de SPEC.md § 15 pour la phase 3. L'équipe attendue, chaque golem à son plafond de
 * 4 repas (environ 38 🍎 gagnées dans le Désert avant l'arène, 12 repas) : le golem de la phase 1
 * éveillé par la Rune de la Forêt (stade 2), ceux des phases 2 et 3 au stade 1. Le Cristal du
 * Désert est un bonus, non compté ici.
 */

const RUNS = 1500;
const ACCURACY = 0.7;
const PHASE1: GolemSpecies[] = ['pierre', 'mousse'];
const PHASE2: GolemSpecies[] = ['ecorce', 'champignon'];
const PHASE3: GolemSpecies[] = ['sable', 'cuivre'];
const TEAMS = PHASE1.flatMap((a) => PHASE2.flatMap((b) => PHASE3.map((c) => [a, b, c] as GolemSpecies[])));
const MONSTER_SPECIES = (Object.keys(MONSTERS) as MonsterSpecies[]).filter((m) => MONSTERS[m].phase === 3);

const mean = (v: number[]): number => v.reduce((a, b) => a + b, 0) / v.length;

/** Golem nourri : les repas alternent ATQ et PV max. */
function fed(species: GolemSpecies, meals: number): GolemData {
  const g = createGolem(species);
  for (let i = 0; i < meals; i++) {
    if (i % 2 === 0) g.atk += 1;
    else g.maxHp += 4;
  }
  g.hp = g.maxHp;
  return g;
}

/** Golem éveillé (stade 2) puis nourri. */
function awakened(species: GolemSpecies, meals: number): GolemData {
  const g = createGolem(species);
  g.stage = 2;
  g.maxHp = Math.round(g.maxHp * EVOLUTION_MULT);
  g.atk = Math.round(g.atk * EVOLUTION_MULT);
  const out = fed(species, 0);
  Object.assign(out, g);
  for (let i = 0; i < meals; i++) {
    if (i % 2 === 0) out.atk += 1;
    else out.maxHp += 4;
  }
  out.hp = out.maxHp;
  return out;
}

const expectedTeam = (t: GolemSpecies[]): GolemData[] => [awakened(t[0], 4), fed(t[1], 4), fed(t[2], 4)];

describe('équilibrage de la phase 3 (70 % de bonnes réponses)', () => {
  it('un monstre d’arène tombe en 2 à 3 bonnes réponses, avec le golem de l’équipe qui vise sa faiblesse', () => {
    const rng = createRng(31);
    for (const t of TEAMS)
      for (const monster of MONSTER_SPECIES) {
        const hits: number[] = [];
        // Le golem de l'équipe le plus efficace contre ce monstre (ce que la leçon des faiblesses apprend).
        const best = expectedTeam(t).sort((a, b) => strength(b, monster) - strength(a, monster))[0];
        const species = best.species;
        for (let i = 0; i < 300; i++) {
          const c = new TurnCombat({ kind: 'arena', golems: [{ ...best }], monsters: [arenaMonster(monster, 'm')] }, rng);
          let n = 0;
          while (c.phase !== 'won') {
            c.attack(bestAttack(c).slot, true);
            n++;
            if (c.phase === 'monster') c.phase = 'player';
          }
          hits.push(n);
        }
        const m = mean(hits);
        expect(m, `${species} contre ${monster}`).toBeGreaterThanOrEqual(2);
        // 3 coups au plus ; 3,5 quand aucun golem de l'équipe n'a d'attaque du type de sa faiblesse
        // (le Vautour, faible au sable, quand on a choisi Cuivre).
        const weakness = MONSTERS[monster].weakness;
        const covered = expectedTeam(t).some((g) => combatGolem(g, g.maxHp).attacks.some((a) => a.type === weakness));
        expect(m, `${species} contre ${monster}`).toBeLessThanOrEqual(covered ? 3 : 3.5);
      }
  });

  it('un combat d’arène (3 contre 3) est gagné au moins 8 fois sur 10, pour chaque équipe', () => {
    const rng = createRng(32);
    for (const t of TEAMS) {
      let wins = 0;
      for (let i = 0; i < RUNS; i++) {
        const c = new TurnCombat({ kind: 'arena', golems: expectedTeam(t), monsters: arenaOpponents(3, 3, rng) }, rng);
        if (playFight(c, ACCURACY, rng).won) wins++;
      }
      expect(wins / RUNS, t.join('+')).toBeGreaterThanOrEqual(0.8);
    }
  });

  it('le Grand Ver des Sables demande 8 à 15 questions et se gagne au moins 8 fois sur 10, pour chaque équipe', () => {
    const rng = createRng(33);
    for (const t of TEAMS) {
      const fights = Array.from({ length: RUNS }, () => bossFight(expectedTeam(t), 'grandVer', rng, ACCURACY));
      const won = fights.filter((f) => f.won);
      const q = mean(won.map((f) => f.questions));
      expect(q, t.join('+')).toBeGreaterThanOrEqual(8);
      expect(q, t.join('+')).toBeLessThanOrEqual(15);
      expect(won.length / RUNS, t.join('+')).toBeGreaterThanOrEqual(0.8);
    }
  });
});
