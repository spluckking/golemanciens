/** Équilibrage et réglages chiffrés du jeu (SPEC.md § 4 à 9 et § 15). */

/** Questions : niveaux et règles adaptatives (§ 8.3). */
export const CALC_MIN_LEVEL = 1;
export const CALC_MAX_LEVEL = 6;
export const RIDDLE_MIN_LEVEL = 1;
export const RIDDLE_MAX_LEVEL = 5;
export const LEVEL_UP_STREAK = 3;
export const LEVEL_DOWN_STREAK = 2;
/** Décalage de difficulté par attaque : A1 et A2 +0, A3 +1, Ultime +2. */
export const ATTACK_LEVEL_OFFSET = { a1: 0, a2: 0, a3: 1, ultimate: 2 } as const;
export type AttackSlot = keyof typeof ATTACK_LEVEL_OFFSET;
/** Énigmes récentes exclues quand la banque d'un niveau est réinitialisée (§ 8.2). */
export const RIDDLE_RECENT_EXCLUDED = 5;

/** Boucle de lecture (§ 9.1). */
export const READING_FIRST_WAIT_S = 20;
export const READING_REREAD_WAIT_S = 10;
export const READING_QUESTIONS_PER_ROUND = 2;

/** Golems (§ 4.2) : stats de base multipliées par 1 + 0,25 × (phase − 1). */
export const GOLEM_BASE_HP = 40;
export const GOLEM_BASE_ATK = 8;
export const GOLEM_PHASE_BONUS = 0.25;

export function golemBaseStats(phase: number): { hp: number; atk: number } {
  const k = 1 + GOLEM_PHASE_BONUS * (phase - 1);
  return { hp: Math.round(GOLEM_BASE_HP * k), atk: Math.round(GOLEM_BASE_ATK * k) };
}

/** Monstres (§ 5.3). */
export function monsterStats(phase: number): { hp: number; atk: number } {
  return { hp: 24 + 14 * (phase - 1), atk: 5 + 2 * (phase - 1) };
}

/** Combat dans le monde (§ 6) et soins (§ 4.5). */
export const WORLD_GOLEM_ATTACK_INTERVAL_S = 1.5;
export const WORLD_MONSTER_ATTACK_INTERVAL_S = 2;
export const WORLD_DAMAGE_FACTOR = 0.5;
export const WORLD_WEAKNESS_MULTIPLIER = 2;
export const REGEN_DELAY_S = 4;
export const REGEN_PER_S = 0.02;
export const KO_SLEEP_S = 20;
export const KO_WAKE_HP = 0.3;

/** Monstres dans le monde (§ 5.2). */
export const MONSTER_LEASH_BLOCKS = 8;
export const MONSTER_CHASE_GIVE_UP_S = 5;
export const MONSTER_RESPAWN_S = 180;

/** Nourriture (§ 4.4). */
export const FOOD_CRATE_CHANCE = 0.5;
export const FOOD_CRATE = 1;
export const FOOD_CHEST = 3;
