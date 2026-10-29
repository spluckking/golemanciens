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

/**
 * Correction des PV des monstres par phase, réglée par la simulation (§ 15) : les PV de la formule
 * grandissent plus vite que l'ATQ des golems (tests/sim/balance3.test.ts).
 */
export const MONSTER_HP_PHASE_FACTOR: Readonly<Record<number, number>> = { 3: 0.9 };

/** Monstres (§ 5.3). */
export function monsterStats(phase: number): { hp: number; atk: number } {
  const hp = 24 + 14 * (phase - 1);
  return { hp: Math.round(hp * (MONSTER_HP_PHASE_FACTOR[phase] ?? 1)), atk: 5 + 2 * (phase - 1) };
}

/** Combat dans le monde (§ 6) et soins (§ 4.5). */
export const WORLD_GOLEM_ATTACK_INTERVAL_S = 1.5;
export const WORLD_MONSTER_ATTACK_INTERVAL_S = 2;
export const WORLD_DAMAGE_FACTOR = 0.5;

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
/** Victoire d'arène (§ 4.4) ; combats pour terminer l'arène (§ 1.2). */
export const FOOD_ARENA_WIN = 4;
/** Combat libre dans une arène terminée (SPEC.md § 4.4). */
export const FOOD_ARENA_FREE = 2;
export const ARENA_WINS_TO_FINISH = 3;
/** Pause avant l'attaque du monstre, pour qu'on la voie venir (§ 7.1). */
export const MONSTER_TURN_DELAY_S = 0.8;

/** Faiblesses (révision 1.4) : bonus quand le type de l'attaque est la faiblesse de la cible. */
export const WEAKNESS_MULTIPLIER = 1.5;
/** Dragon, étapes 2 et 3 : ✨ fait double dégât (SPEC.md § 5.1). */
export const STAGE_DOUBLE_MULTIPLIER = 2;
/** Arc-en-ciel : bonus permanent sur toutes ses attaques (§ 7.1). */
export const ALL_ROUND_MULTIPLIER = 1.25;

/** Combat au tour par tour (§ 7.1). */
export const ATTACK_POWER: Record<AttackSlot, number> = { a1: 1, a2: 1.2, a3: 1, ultimate: 2.5 };
export const GOLEM_DAMAGE_VARIANCE = 0.1;
export const MONSTER_DAMAGE_MIN = 0.8;
export const MONSTER_DAMAGE_MAX = 1.2;
export const MONSTER_MISS_CHANCE = 0.15;
export const BLIND_MISS_CHANCE = 0.5;
/**
 * Golem aveuglé par la « Tempête » de la Sorcière : sa prochaine attaque juste touche quand même,
 * à moitié de sa force (rien de punitif : une bonne réponse n'est jamais perdue).
 */
export const BLINDED_GOLEM_DAMAGE = 0.5;
export const SLEEP_MIN_TURNS = 1;
export const SLEEP_MAX_TURNS = 2;
export const SHIELD_DAMAGE_TAKEN = 0.5;
export const SHIELD_REFLECT = 0.5;
/** Coefficient des dégâts des monstres au tour par tour (réglé par la simulation, § 15). */
export const ARENA_MONSTER_DAMAGE_FACTOR = 1.6;
export const BOSS_DAMAGE_FACTOR = 0.5;

/** Boss et dragon (§ 5.3) : PV par étape et ATQ, à partir d'un monstre de leur phase (boss : 2,5 → 2,25, révision 1.4). */
export const BOSS_HP_FACTOR = 2.25;
/**
 * À partir de la phase 2, l'équipe compte plusieurs golems : le boss a un peu moins de PV par étape
 * pour rester entre 8 et 15 questions (réglé par la simulation, tests/sim/balance2.test.ts).
 */
export const BOSS_HP_FACTOR_TEAM = 1.5;
/** Réglage par phase quand l'équipe grandit encore (tests/sim/balance4.test.ts). */
export const BOSS_HP_PHASE_FACTOR: Readonly<Record<number, number>> = { 4: 1.3 };
export const BOSS_ATK_FACTOR = 1.3;
export const DRAGON_HP_FACTOR = 3;

export function bossStats(phase: number): { hp: number; atk: number } {
  const m = monsterStats(phase);
  const hpFactor = phase >= 6 ? DRAGON_HP_FACTOR : (BOSS_HP_PHASE_FACTOR[phase] ?? (phase >= 2 ? BOSS_HP_FACTOR_TEAM : BOSS_HP_FACTOR));
  return { hp: Math.round(m.hp * hpFactor), atk: m.atk * BOSS_ATK_FACTOR };
}

/** Repas (§ 4.4) : 3 🍎 pour +4 PV max ou +1 ATQ, 4 repas au plus par stade. */
export const MEAL_COST = 3;
export const MEAL_HP = 4;
export const MEAL_ATK = 1;
export const MEALS_PER_STAGE = 4;

/** Évolution (SPEC.md § 4.3) : chaque stade multiplie les PV max et l'ATQ. */
export const EVOLUTION_MULT = 1.35;
/** Galaxie (SPEC.md § 4.3) : la Poussière d'étoile multiplie PV max et ATQ. */
export const GALAXY_MULT = 1.4;
