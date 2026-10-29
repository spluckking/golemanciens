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
/** Changement d'étape et victoire, par boss (textes nouveaux, à valider). */
export const TEXT_BOSS_STAGE: Record<string, string> = {
  roiSlime: TEXT_BOSS_SPLITS,
  reineAraignee: 'La Reine Araignée tisse une toile d’argent !',
  grandVer: 'Le Grand Ver plonge sous le sable… et surgit !',
  sorciere: 'La Sorcière du Blizzard lève les bras : la tempête se déchaîne !',
  griffon: 'Le Griffon d’Ombre monte très haut… et plonge en piqué !',
  dragon: 'Le Dragon d’Ombre perd son armure et s’envole !',
};
export const TEXT_BOSS_VICTORY = 'Victoire ! Le Roi Slime est vaincu !';
export const TEXT_BOSS_VICTORIES: Record<string, string> = {
  roiSlime: TEXT_BOSS_VICTORY,
  reineAraignee: 'Victoire ! La Reine Araignée est vaincue !',
  grandVer: 'Victoire ! Le Grand Ver des Sables est vaincu !',
  sorciere: 'Victoire ! La Sorcière du Blizzard est vaincue !',
  griffon: 'Victoire ! Le Griffon d’Ombre est vaincu !',
  dragon: 'Victoire ! Le Dragon d’Ombre est vaincu !',
};
export const TEXT_RETRY_QUESTION = 'On réessaie tout de suite ?';
export const TEXT_RETRY = 'Réessayer';
export const TEXT_LATER = 'Plus tard';
export const TEXT_TROPHY = 'Un trophée t’attend sur l’étagère de ta maison !';
export const OBJECTIVE_CHAPTER_DONE = 'Va à l’Arche des éclats, à côté de l’Académie';

/** Récompense du boss (SPEC.md § 4.4). */
export const FOOD_BOSS = 6;

/** Avancement de la quête du boss : proposée après l'arène, puis le combat. */
export type BossQuestStep = 'locked' | 'active' | 'defeated';

/**
 * Quête du boss de la phase 2 (CONTENU.md § F, P2 « Les fils d'argent ») : couper les 3 toiles qui
 * barrent le sentier, puis affronter la Reine Araignée. Titre : CONTENU.md ; répliques nouvelles, à valider.
 */
export const P2_TITLE = 'Les fils d’argent';
export const P2_TASK = 'Couper les toiles du sentier ({n}/3), puis affronter la Reine Araignée';
export const P2_REQUEST = 'Des toiles d’argent barrent le sentier du nord-ouest. Coupe-les d’un coup de baguette : la Reine Araignée t’attend au bout.';
export const P2_REMINDER = 'Les toiles barrent toujours le sentier du nord-ouest. Un coup de baguette suffit !';
export const TEXT_WEB_CUT = 'Toile coupée : {n}/3';
export const TEXT_WEBS_DONE = 'Le sentier est libre : la Reine Araignée t’attend !';
export const OBJECTIVE_FOREST_DONE = 'Deuxième éclat retrouvé ! La suite de l’aventure arrive bientôt.';

/** Quête du boss de la phase 3 (CONTENU.md § F, P3 « Les tambours des dunes »). Répliques nouvelles, à valider. */
export const P3_TITLE = 'Les tambours des dunes';
export const P3_TASK = 'Frapper les tambours anciens ({n}/3) pour faire surgir le Grand Ver';
export const P3_REQUEST = 'Trois tambours anciens dorment près de la fosse, au nord-ouest. Frappe-les tous : le Grand Ver sortira du sable !';
export const P3_REMINDER = 'Les tambours anciens sont au nord-ouest, près de la fosse. Frappe-les tous les trois !';
export const TEXT_STRIKE_DRUM = 'Frapper';
export const TEXT_DRUM = 'Tambour : {n}/3';
export const TEXT_WORM_RISES = 'Le sol tremble… Le Grand Ver surgit de la fosse !';
export const OBJECTIVE_DESERT_DONE = 'Troisième éclat retrouvé ! La suite de l’aventure arrive bientôt.';

/** Quête du boss de la phase 4 (CONTENU.md § F, P4 « Le sentier du blizzard »). Répliques nouvelles, à valider. */
export const P4_TITLE = 'Le sentier du blizzard';
export const P4_TASK = 'Allumer les braseros du sentier ({n}/3) jusqu’à la Sorcière du Blizzard';
export const P4_REQUEST = 'La tempête cache le sentier du sommet. Allume les trois braseros : leur lumière te montrera le chemin jusqu’à la Sorcière.';
export const P4_REMINDER = 'Les braseros du sentier attendent leur flamme. Allume-les tous les trois pour voir le chemin !';
export const TEXT_LIGHT_BRAZIER = 'Allumer';
export const TEXT_BRAZIER = 'Brasero : {n}/3';
export const TEXT_PATH_LIT = 'Le chemin brille dans la tempête : la Sorcière t’attend au sommet !';
export const OBJECTIVE_GIVRE_DONE = 'Quatrième éclat retrouvé ! La suite de l’aventure arrive bientôt.';

/** Quête du boss de la phase 5 (CONTENU.md § F, P5 « Les plumes noires »). Répliques nouvelles, à valider. */
export const P5_TITLE = 'Les plumes noires';
export const P5_TASK = 'Ramasser les plumes noires ({n}/3) pour ouvrir la tour du Griffon d’Ombre';
export const P5_REQUEST = 'Le Griffon d’Ombre s’est enfermé dans la tour noire. Sa porte s’ouvre avec trois plumes noires, perdues sur les îles. Trouve-les !';
export const P5_REMINDER = 'Il te faut les trois plumes noires du Griffon pour ouvrir la porte de sa tour.';
export const TEXT_FEATHER = 'Plume noire : {n}/3';
export const TEXT_TOWER_OPEN = 'Les trois plumes brillent : la porte de la tour s’ouvre !';
/** Après le Griffon : l'Épreuve des Étoiles attend au sommet de l'Académie (texte nouveau, à valider). */
/** Finale (CONTENU.md § F, « Le pont de pierre noire »). Textes nouveaux, à valider. */
export const FINALE_TITLE = 'Le pont de pierre noire';
export const FINALE_TASK = 'Traverser le volcan : vaincre les gardiens du chemin ({n}/{goal})';
export const FINALE_FACE = 'Traverser le pont jusqu’au cratère et affronter le Dragon d’Ombre';
export const TEXT_DRAGON_STAGE3 = 'Le Dragon d’Ombre se met en colère !';
export const TEXT_LAVA = 'Aïe, c’est chaud ! Tu recules d’un pas.';
export const TEXT_PATH_GUARDS = 'Gardiens du chemin vaincus : {n}/{goal}';
export const TEXT_PATH_FREE = 'Le chemin est libre : le Dragon t’attend au fond du cratère !';
export const TEXT_GAME_DONE = 'Bravo ! Tu as terminé l’aventure. Les biomes et les arènes t’attendent toujours.';
export const OBJECTIVE_GAME_DONE = 'Aventure terminée ! Va où tu veux : les arènes et les biomes sont ouverts.';
export const OBJECTIVE_STAR_TRIAL = 'Les cinq éclats sont réunis ! Monte au sommet de l’Académie pour l’Épreuve des Étoiles';
