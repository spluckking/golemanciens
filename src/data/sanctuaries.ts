import type { GolemSpecies } from './creatures';

/**
 * Textes des sanctuaires. L'aide des dalles vient de CONTENU.md (§ D, S1) ; un test vérifie
 * qu'elle y figure mot pour mot. Les autres textes sont nouveaux (à valider par le parent).
 */

/** Aide de Lumibloc après 3 échecs aux dalles fleuries (CONTENU.md, S1). */
export const S1_HINT = 'Regarde bien la fresque, de gauche à droite !';

/** Golems proposés par l'œuf de la phase 1 (SPEC.md § 1.1). */
export const S1_EGG_CHOICES: readonly GolemSpecies[] = ['pierre', 'mousse'];

/** Suggestions de surnoms (textes nouveaux, à valider). */
export const NICKNAME_SUGGESTIONS: Record<GolemSpecies, string[]> = {
  pierre: ['Caillou', 'Galet', 'Rocco'],
  mousse: ['Pousse', 'Trèfle', 'Lichen'],
};

/** Textes d'interface nouveaux (à valider). */
export const TEXT_READ_STONE = 'Lire';
export const TEXT_STONE_SOLVED = 'La pierre s’illumine : le passage s’ouvre !';
export const TEXT_STONE_WRONG = 'La pierre tremble… Essaie cette autre énigme.';
export const TEXT_TILES_WRONG = 'Les dalles s’éteignent. On recommence !';
export const TEXT_TILES_DONE = 'Les fleurs brillent : la porte du sanctuaire s’ouvre !';
export const TEXT_RESTART = 'Recommencer';
export const TEXT_TOUCH_EGG = 'Toucher l’œuf';
export const TEXT_CHOOSE_GOLEM = 'Choisis ton golem';
export const TEXT_NICKNAME_QUESTION = 'Veux-tu lui donner un surnom ?';
export const TEXT_NO_NICKNAME = 'Garder « {nom} »';
export const TEXT_WELCOME_GOLEM = '{nom} te suit maintenant partout !';
export const OBJECTIVE_BACK_TO_VILLAGE = 'Retourner au village de Ferme-des-Blocs.';
