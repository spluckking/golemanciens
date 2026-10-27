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
