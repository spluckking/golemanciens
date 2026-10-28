import { MEAL_ATK, MEAL_COST, MEAL_HP, MEALS_PER_STAGE } from '../data/balance';
import type { GameState } from './gameState';

/**
 * Repas des golems (SPEC.md § 4.4) : 3 🍎 pour +4 PV max ou +1 ATQ, de façon permanente.
 * Au plus 4 repas par stade (le compteur repart à zéro à chaque évolution). La nourriture ne soigne pas :
 * +4 PV max ajoute aussi 4 PV, pour que la barre ne recule pas.
 */

export type MealChoice = 'hp' | 'atk';
export type MealResult = 'ok' | 'noFood' | 'full' | 'unknown';

export function canFeed(state: GameState, golemId: string): MealResult {
  const g = state.golems.find((x) => x.id === golemId);
  if (!g) return 'unknown';
  if (g.meals >= MEALS_PER_STAGE) return 'full';
  if (state.food < MEAL_COST) return 'noFood';
  return 'ok';
}

export function feedGolem(state: GameState, golemId: string, choice: MealChoice): MealResult {
  const res = canFeed(state, golemId);
  if (res !== 'ok') return res;
  const g = state.golems.find((x) => x.id === golemId)!;
  state.food -= MEAL_COST;
  g.meals++;
  if (choice === 'hp') {
    g.maxHp += MEAL_HP;
    g.hp = Math.min(g.maxHp, g.hp + MEAL_HP);
  } else g.atk += MEAL_ATK;
  return 'ok';
}
