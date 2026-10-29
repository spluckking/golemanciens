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
  ecorce: ['Brindille', 'Noyer', 'Bouleau'],
  champignon: ['Cèpe', 'Pois', 'Bolet'],
  sable: ['Dune', 'Grain', 'Mirage'],
  cuivre: ['Étincelle', 'Zap', 'Volt'],
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

// ---------- S2 : sanctuaire de Mousse (Forêt) ----------

/** Golems proposés par l'œuf de la phase 2 (SPEC.md § 1.1). */
export const S2_EGG_CHOICES: readonly GolemSpecies[] = ['ecorce', 'champignon'];
/** Inscription de la stèle et aides de Lumibloc (CONTENU.md, S2, mot pour mot). */
export const S2_INSCRIPTION = "D'abord ce qui brille le jour, puis ce qui éclaire la nuit, enfin ce qui scintille.";
export const S2_LEVER_HINT = "Le jour, c'est le soleil qui brille…";
export const S2_CANAL_HINT = "L'eau suit les rigoles comme un chemin. Regarde où elle s'arrête !";
/** Textes d'interface nouveaux (à valider). */
export const TEXT_STELE = 'Inscription';
export const TEXT_PULL_LEVER = 'Abaisser';
export const TEXT_TURN_PIECE = 'Tourner';
export const TEXT_LEVERS_WRONG = 'Les leviers remontent. Relis l’inscription !';
export const TEXT_LEVERS_DONE = 'Les branches s’écartent : un passage s’ouvre !';
export const TEXT_CANALS_DONE = 'L’eau fait tourner la roue du moulin !';
export const TEXT_DOOR_OPEN = 'La porte du temple s’ouvre !';
/** Nombre de rotations sans succès avant l'aide de Lumibloc pour les canaux. */
export const CANAL_HINT_AFTER = 12;

// ---------- S3 : temple ensablé (Désert) ----------

export const S3_EGG_CHOICES: readonly GolemSpecies[] = ['sable', 'cuivre'];
/** Aides de Lumibloc (CONTENU.md, S3, mot pour mot). */
export const S3_PUSH_HINT = 'Place-toi derrière le bloc pour le pousser dans la bonne direction.';
export const S3_MIRROR_HINT = 'Un miroir renvoie la lumière comme un ballon qui rebondit contre un mur.';
/** Textes d'interface nouveaux (à valider). */
export const TEXT_PUSH = 'Pousser';
export const TEXT_PUSH_STUCK = 'Le bloc ne bouge pas : quelque chose le bloque.';
export const TEXT_PUSH_DONE = 'Le bloc est sur la dalle : une porte s’ouvre !';
export const TEXT_MIRROR = 'Tourner le miroir';
export const TEXT_MIRRORS_DONE = 'Le rayon touche le cristal : la porte s’ouvre !';
export const TEXT_SYMBOL_WRONG = 'Ce n’est pas ça. Regarde bien la suite !';
export const TEXT_SYMBOL_RIGHT = 'Bravo ! Voici une autre suite.';
export const TEXT_SYMBOLS_DONE = 'Les deux suites sont trouvées !';
/** Poussées ou rotations sans succès avant l'aide de Lumibloc. */
export const TEMPLE_HINT_AFTER = 10;
