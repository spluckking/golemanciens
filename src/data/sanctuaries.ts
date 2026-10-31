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
  glace: ['Givre', 'Glaçon', 'Frimas'],
  cristal: ['Prisme', 'Quartz', 'Améthyste'],
  nuage: ['Cumulus', 'Brise', 'Plume'],
  arcEnCiel: ['Iris', 'Prisma', 'Aurore'],
  galaxie: ['Comète', 'Nova', 'Orion'],
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
export const TEXT_SOLVE = 'Résoudre';
export const TEXT_MIRRORS_DONE = 'Le rayon touche le cristal : la porte s’ouvre !';
export const TEXT_SYMBOL_WRONG = 'Ce n’est pas ça. Regarde bien la suite !';
export const TEXT_SYMBOL_RIGHT = 'Bravo ! Voici une autre suite.';
export const TEXT_SYMBOLS_DONE = 'Les deux suites sont trouvées !';
/** Poussées ou rotations sans succès avant l'aide de Lumibloc. */
export const TEMPLE_HINT_AFTER = 10;

// ---------- S4 : sanctuaire gelé (Pics de Givre) ----------

export const S4_EGG_CHOICES: readonly GolemSpecies[] = ['glace', 'cristal'];
/** Plaque du moulin et aide de Lumibloc (CONTENU.md, S4, mot pour mot). */
export const S4_MILL_RULE = "Chaque roue tourne dans l'autre sens que sa voisine.";
export const S4_MILL_HINT = 'Si la première roue tourne à droite, la suivante tourne à gauche.';
/** Textes d'interface nouveaux (à valider). */
export const TEXT_SLIDE_DONE = 'Tu es sorti de la salle de glace !';
export const TEXT_SLIDE_HINT = 'Le sol glisse ! Touche une flèche : tu iras tout droit jusqu’au prochain bloc.';
export const TEXT_MEMORY_WATCH = 'Regarde bien l’ordre des dalles…';
export const TEXT_MEMORY_GO = 'À toi ! Touche les dalles dans le même ordre.';
export const TEXT_MEMORY_WRONG = 'Oups ! Regarde encore une fois.';
export const TEXT_MEMORY_EASIER = 'On essaie avec 3 dalles seulement.';
export const TEXT_MEMORY_DONE = 'Bravo, tu t’en es souvenu ! La glace fond.';
export const TEXT_MEMORY_REPLAY = 'Revoir l’ordre';
export const TEXT_MILL_PANEL = 'Régler les roues';
export const TEXT_MILL_CHOOSE_AXLE = 'Choisis un axe pour y poser une roue, puis tourne la manivelle. La flèche montre le bon sens du moulin.';
export const TEXT_MILL_CHOOSE_GEAR = 'Quelle roue poses-tu sur cet axe ?';
export const TEXT_AXLES = ['Axe de gauche', 'Axe du milieu (en haut)', 'Axe de droite'];
export const TEXT_SMALL_GEAR = 'Une petite roue';
export const TEXT_BIG_GEAR = 'La grande roue';
export const TEXT_REMOVE_GEAR = 'Enlever la roue';
export const TEXT_TURN_CRANK = '⚙️ Tourner la manivelle';
export const TEXT_CLOSE = 'Fermer';
export const TEXT_BACK = 'Retour';
export const TEXT_MILL_RIGHT = 'Le moulin tourne dans le bon sens : la glace fond !';
export const TEXT_MILL_WRONG = 'Le moulin tourne… mais dans le mauvais sens ! Regarde la flèche.';
export const TEXT_MILL_GAP = 'Une roue ne touche pas sa voisine : rien ne tourne.';
export const TEXT_MILL_JAM = 'Trop de roues se touchent : tout se bloque !';
export const TEXT_ICE_MELTS = 'Le mur de glace fond !';
/** Essais du moulin sans succès avant l'aide de Lumibloc. */
export const MILL_HINT_AFTER = 3;

// ---------- S5 : sanctuaire des Vents (Île Céleste) ----------

export const S5_EGG_CHOICES: readonly GolemSpecies[] = ['nuage', 'arcEnCiel'];
/** Aide de Lumibloc pour la balance (CONTENU.md, S5, mot pour mot). */
export const S5_BALANCE_HINT = 'Compte : il faut arriver à 8 de chaque côté.';
/** Textes d'interface nouveaux (à valider). */
export const TEXT_CLOUDS_HINT = 'Saute sur les nuages dans l’ordre de l’arc-en-ciel. Le vitrail te le rappelle !';
export const TEXT_CLOUD_RIGHT = 'Le nuage s’allume ! ({n}/6)';
export const TEXT_CLOUD_WRONG = 'Pas celui-là ! Regarde le vitrail et recommence par le rouge.';
export const TEXT_CLOUD_FALL = 'Hop ! Un coup de vent te ramène au départ.';
export const TEXT_CLOUDS_DONE = 'Les six nuages brillent : la porte s’ouvre !';
export const TEXT_BALANCE_PANEL = 'Poser les poids';
export const TEXT_BALANCE_CHOOSE = 'Le plateau de gauche porte 8. Pose des poids sur le plateau de droite pour équilibrer la balance.';
export const TEXT_WEIGHT_ON = 'Retirer le poids {n}';
export const TEXT_WEIGHT_OFF = 'Poser le poids {n}';
export const TEXT_BALANCE_LIGHT = 'Pas assez lourd : la herse reste basse.';
export const TEXT_BALANCE_HEAVY = 'Trop lourd ! La balance penche de l’autre côté.';
export const TEXT_BALANCE_DONE = 'La balance est droite : la herse se lève !';
/** Poses de poids sans succès avant l'aide de Lumibloc. */
export const BALANCE_HINT_AFTER = 6;

/** Plateaux 2D des énigmes : titres et consignes (à valider par le parent). */
export const BOARD_TILES = { title: 'Les dalles fleuries', help: 'Touche les dalles dans l’ordre de la fresque.' };
export const BOARD_LEVERS = { title: 'Les trois leviers', help: 'Abaisse les leviers dans l’ordre de l’inscription.' };
export const BOARD_CANALS = { title: 'Les canaux d’eau', help: 'Touche les rigoles pour les tourner : l’eau doit aller jusqu’à la roue.' };
export const BOARD_PUSH = { title: 'Le bloc de grès', help: 'Pousse le bloc avec les flèches jusque sur la dalle dorée.' };
export const BOARD_MIRRORS = { title: 'Les miroirs du soleil', help: 'Touche un miroir pour le faire tourner. Envoie le rayon sur le cristal !' };
export const BOARD_SYMBOLS = { title: 'Les dalles-symboles', help: 'Trouve ce qui remplace le point d’interrogation.' };
export const BOARD_SLIDE = { title: 'La glissade', help: 'Touche une flèche : tu glisses tout droit jusqu’au prochain bloc. Atteins la porte !' };
export const BOARD_MEMORY = { title: 'La mémoire de glace', help: 'Regarde l’ordre des dalles, puis touche-les dans le même ordre.' };
export const BOARD_MILL = { title: 'Le moulin gelé', help: 'Touche un axe pour y poser une roue, puis tourne la manivelle.' };
export const BOARD_BALANCE = { title: 'La balance', help: 'Le plateau de gauche porte 8. Touche les poids pour équilibrer la balance.' };
export const TEXT_SLIDE_FIRST = 'Essaie d’abord vers la droite.';
