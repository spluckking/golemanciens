// Simulation d'équilibrage (SPEC.md § 15) : un enfant qui répond juste au hasard
// avec un taux donné, et qui choisit l'attaque la plus efficace.

import { TurnCombat, arenaOpponents, bossMonster, golemAttackDamage, type CombatMonster } from '../../src/combat/turn/turnCombat';
import { createGolem, type GolemData } from '../../src/core/gameState';
import type { Rng } from '../../src/core/rng';
import type { BossId, GolemSpecies } from '../../src/data/creatures';
import type { AttackInfo } from '../../src/data/creatures';

export interface FightResult {
  won: boolean;
  /** Questions posées (une par attaque lancée). */
  questions: number;
}

/** Attaque au meilleur dégât moyen contre l'étape en cours (ce que la leçon des faiblesses apprend). */
export function bestAttack(c: TurnCombat): AttackInfo {
  const mean: Rng = () => 0.5;
  let best = c.availableAttacks()[0];
  let bestDamage = -1;
  for (const a of c.availableAttacks()) {
    const d = golemAttackDamage(c.golem, a, c.monsterStage, mean).amount;
    if (d > bestDamage) {
      best = a;
      bestDamage = d;
    }
  }
  return best;
}

/** Joue un combat jusqu'au bout ; changement forcé vers le premier golem debout. */
export function playFight(c: TurnCombat, accuracy: number, rng: Rng, choose: (c: TurnCombat) => AttackInfo = bestAttack): FightResult {
  let questions = 0;
  for (let guard = 0; guard < 500; guard++) {
    if (c.phase === 'won' || c.phase === 'lost') return { won: c.phase === 'won', questions };
    if (c.phase === 'switch') c.switchTo(c.benchGolems()[0].id);
    else if (c.phase === 'monster') c.monsterTurn();
    else {
      questions++;
      c.attack(choose(c).slot, rng() < accuracy);
    }
  }
  throw new Error('Combat sans fin');
}

export function team(species: readonly GolemSpecies[]): GolemData[] {
  return species.map((s) => createGolem(s));
}

export function arenaFight(golems: GolemData[], rng: Rng, accuracy: number, monsters?: CombatMonster[]): FightResult {
  const c = new TurnCombat({ kind: 'arena', golems, monsters: monsters ?? arenaOpponents(1, golems.length, rng) }, rng);
  return playFight(c, accuracy, rng);
}

export function bossFight(golems: GolemData[], boss: BossId, rng: Rng, accuracy: number): FightResult {
  const c = new TurnCombat({ kind: 'boss', golems, monsters: [bossMonster(boss)] }, rng);
  return playFight(c, accuracy, rng);
}
