/**
 * Quête du boss de la phase 1 (CONTENU.md § F, P1 « La piste gluante ») et fin du chapitre.
 * Le titre et l'objectif viennent de CONTENU.md ; les répliques et messages sont des textes
 * nouveaux, à valider par le parent.
 */

export const P1_TITLE = 'La piste gluante';
export const P1_TASK = 'Suivre les flaques vertes jusqu’au marais';
export const P1_REQUEST = 'Des flaques vertes partent du village… C’est sûrement le Roi Slime ! Suis la piste gluante jusqu’au marais, {prenom}.';
export const P1_REMINDER = 'Suis les flaques vertes : elles mènent au marais du Roi Slime.';
export const TEXT_FACE_BOSS = 'Affronter';
export const TEXT_BOSS_SPLITS = 'Le Roi Slime se divise !';
export const TEXT_BOSS_VICTORY = 'Victoire ! Le Roi Slime est vaincu !';
export const TEXT_RETRY_QUESTION = 'On réessaie tout de suite ?';
export const TEXT_RETRY = 'Réessayer';
export const TEXT_LATER = 'Plus tard';
export const TEXT_TROPHY = 'Un trophée t’attend sur l’étagère de ta maison !';
export const OBJECTIVE_CHAPTER_DONE = 'Premier éclat retrouvé ! La suite de l’aventure arrive bientôt.';

/** Récompense du boss (SPEC.md § 4.4). */
export const FOOD_BOSS = 6;

/** Avancement de la quête du boss : proposée après l'arène, puis le combat. */
export type BossQuestStep = 'locked' | 'active' | 'defeated';
