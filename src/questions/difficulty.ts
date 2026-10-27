import {
  ATTACK_LEVEL_OFFSET,
  CALC_MAX_LEVEL,
  CALC_MIN_LEVEL,
  LEVEL_DOWN_STREAK,
  LEVEL_UP_STREAK,
  RIDDLE_MAX_LEVEL,
  RIDDLE_MIN_LEVEL,
  type AttackSlot,
} from '../data/balance';

export type QuestionCategory = 'calc' | 'riddle';

/** Niveau adaptatif d'une catégorie (enregistré dans la sauvegarde). */
export interface AdaptiveLevel {
  level: number;
  /** Réussites d'affilée. */
  wins: number;
  /** Erreurs d'affilée. */
  losses: number;
}

const BOUNDS: Record<QuestionCategory, [number, number]> = {
  calc: [CALC_MIN_LEVEL, CALC_MAX_LEVEL],
  riddle: [RIDDLE_MIN_LEVEL, RIDDLE_MAX_LEVEL],
};

function clamp(category: QuestionCategory, level: number): number {
  const [min, max] = BOUNDS[category];
  return Math.max(min, Math.min(max, level));
}

export function createAdaptiveLevel(category: QuestionCategory, start = 1): AdaptiveLevel {
  return { level: clamp(category, start), wins: 0, losses: 0 };
}

/** Enregistre une réponse : +1 après 3 réussites d'affilée, −1 après 2 erreurs d'affilée. */
export function recordAnswer(category: QuestionCategory, state: AdaptiveLevel, correct: boolean): void {
  if (correct) {
    state.wins++;
    state.losses = 0;
    if (state.wins >= LEVEL_UP_STREAK) {
      state.level = clamp(category, state.level + 1);
      state.wins = 0;
    }
  } else {
    state.losses++;
    state.wins = 0;
    if (state.losses >= LEVEL_DOWN_STREAK) {
      state.level = clamp(category, state.level - 1);
      state.losses = 0;
    }
  }
}

/** Niveau de la question pour une attaque, avec le décalage (A3 +1, Ultime +2), dans les bornes. */
export function levelForAttack(category: QuestionCategory, state: AdaptiveLevel, slot: AttackSlot): number {
  return clamp(category, state.level + ATTACK_LEVEL_OFFSET[slot]);
}
