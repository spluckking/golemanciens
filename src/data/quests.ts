/**
 * Quêtes villageoises de la phase 1 (CONTENU.md § E, Ferme-des-Blocs). Les titres et les objectifs
 * viennent de CONTENU.md (un test le vérifie). Les répliques de demande et de remerciement sont
 * des textes nouveaux, écrits « dans ce ton » comme le demande CONTENU.md : à valider par le parent.
 */

export type QuestId = 'R1' | 'R2' | 'R3' | 'O1' | 'O2';
export type QuestNpc = 'mereBrique' | 'paquerette' | 'gaston' | 'noisette' | 'pip' | 'tilleul';

export interface QuestDef {
  id: QuestId;
  title: string;
  mandatory: boolean;
  /** Qui donne la quête. */
  giver: QuestNpc;
  /** À qui on la rend. */
  turnIn: QuestNpc;
  /** Nombre d'étapes à accomplir (poules, slimes, fleurs…). */
  goal: number;
  /** Objectif du journal ; {n} = avancement, {goal} = total. */
  task: string;
  request: string;
  thanks: string;
  /** Livraison : la quête est prête à rendre dès qu'on l'accepte (on porte l'objet). */
  delivery?: boolean;
}

export const QUEST_REWARD = { mandatory: 5, optional: 3 } as const;

export const QUESTS_P1: readonly QuestDef[] = [
  {
    id: 'R1',
    title: 'Les poules envolées',
    mandatory: true,
    giver: 'mereBrique',
    turnIn: 'mereBrique',
    goal: 3,
    task: 'Ramener les poules dans l’enclos ({n}/{goal})',
    request: 'Oh là là ! Mes trois poules se sont envolées de l’enclos. Tu peux me les ramener ?',
    thanks: 'Mes poules sont rentrées ! Merci, {prenom}, voici des pommes pour toi.',
  },
  {
    id: 'R2',
    title: 'Le panier du meunier',
    mandatory: true,
    giver: 'paquerette',
    turnIn: 'gaston',
    goal: 1,
    delivery: true,
    task: 'Porter le panier de Pâquerette à Gaston, au moulin',
    request: 'Mon pain est tout chaud ! Tu peux porter ce panier à Gaston, au moulin ?',
    thanks: 'Ah, le bon pain de Pâquerette ! Merci, {prenom}. Prends ces pommes.',
  },
  {
    id: 'R3',
    title: 'Le camp des slimes',
    mandatory: true,
    giver: 'mereBrique',
    turnIn: 'mereBrique',
    goal: 2,
    task: 'Vaincre les slimes près du champ de blé ({n}/{goal})',
    request: 'Des slimes se sont installés près de mon champ de blé. Tes golems peuvent les chasser ?',
    thanks: 'Plus un seul slime dans mon blé ! Tu es un vrai golémancien.',
  },
  {
    id: 'O1',
    title: 'La clé du puits',
    mandatory: false,
    giver: 'gaston',
    turnIn: 'gaston',
    goal: 1,
    task: 'Trouver la clé dans une caisse près de la rivière',
    request: 'J’ai perdu la clé du puits ! Je crois qu’elle est tombée dans une caisse, près de la rivière.',
    thanks: 'Ma clé ! Je vais pouvoir remonter de l’eau fraîche. Merci beaucoup !',
  },
  {
    id: 'O2',
    title: 'Un bouquet pour Mère Brique',
    mandatory: false,
    giver: 'paquerette',
    turnIn: 'mereBrique',
    goal: 5,
    task: 'Cueillir des fleurs jaunes ({n}/{goal}) et les offrir à Mère Brique',
    request: 'Faisons une surprise à Mère Brique ! Tu peux cueillir 5 fleurs jaunes pour son bouquet ?',
    thanks: 'Un bouquet pour moi ? Comme c’est gentil ! Merci, {prenom}.',
  },
];

/**
 * Quêtes de la phase 2 (CONTENU.md § E, Cabanes des Cimes). Titres et objectifs : CONTENU.md.
 * Qui donne chaque quête, et les répliques : nouveaux, à valider par le parent.
 */
export const QUESTS_P2: readonly QuestDef[] = [
  {
    id: 'R1',
    title: 'La lanterne perdue',
    mandatory: true,
    giver: 'pip',
    turnIn: 'pip',
    goal: 1,
    task: 'Retrouver la lanterne de Pip, au pied d’un grand arbre',
    request: 'Ma lanterne est tombée de la passerelle ! Elle doit être au pied d’un grand arbre, vers le nord-est. Tu peux la retrouver ?',
    thanks: 'Ma lanterne ! Ce soir, je pourrai encore lire mes histoires. Merci, {prenom} !',
  },
  {
    id: 'R2',
    title: 'Le pont cassé',
    mandatory: true,
    giver: 'tilleul',
    turnIn: 'tilleul',
    goal: 3,
    task: 'Trouver des planches dans les vieilles caisses ({n}/{goal})',
    request: 'Le pont du ruisseau est cassé. Il me faut 3 planches : il y en a dans les vieilles caisses de la forêt.',
    thanks: 'Trois belles planches ! Regarde, le pont est réparé. Merci, {prenom} !',
  },
  {
    id: 'R3',
    title: 'Les loups du ruisseau',
    mandatory: true,
    giver: 'noisette',
    turnIn: 'noisette',
    goal: 2,
    task: 'Vaincre les loups d’ombre près du ruisseau ({n}/{goal})',
    request: 'Des loups d’ombre rôdent près du ruisseau. Tes golems peuvent les faire fuir ?',
    thanks: 'Le ruisseau est calme à nouveau. Les Cabanes des Cimes te remercient !',
  },
  {
    id: 'O1',
    title: 'Les champignons bleus',
    mandatory: false,
    giver: 'noisette',
    turnIn: 'noisette',
    goal: 4,
    task: 'Cueillir des champignons bleus ({n}/{goal}), pas les rouges',
    request: 'Pour ma tisane du soir, il me faut 4 champignons bleus. Attention : les rouges ne comptent pas !',
    thanks: 'Quatre champignons bien bleus ! Tu as l’œil, {prenom}.',
  },
  {
    id: 'O2',
    title: 'La lettre du hibou',
    mandatory: false,
    giver: 'pip',
    turnIn: 'pip',
    goal: 1,
    task: 'Porter la lettre à la cabane la plus haute',
    request: 'Un hibou a laissé tomber une lettre ! Elle est pour la cabane la plus haute. Tu peux la porter là-haut ?',
    thanks: 'La lettre est arrivée là-haut ? Le hibou sera content. Merci !',
  },
];

/** Textes d'interface nouveaux (à valider). */
export const TEXT_PICK_UP = 'Ramasser';
export const TEXT_RUNE_FOUND = 'Tu as trouvé une Rune d’éveil !';
export const TEXT_DROP_LETTER = 'Déposer la lettre';
export const TEXT_LANTERN_FOUND = 'Tu as retrouvé la lanterne de Pip !';
export const TEXT_PLANK_FOUND = 'Une planche ! ({n}/{goal})';
export const TEXT_MUSHROOM_BLUE = 'Champignon bleu : {n}/{goal}';
export const TEXT_MUSHROOM_RED = 'Celui-ci est rouge : il ne compte pas !';
export const TEXT_LETTER_DROPPED = 'La lettre est arrivée à la cabane la plus haute !';
export const TEXT_BRIDGE_FIXED = 'Le pont du ruisseau est réparé !';
export const TEXT_FOREST_ARENA_OPEN = 'L’arène de la Forêt est ouverte !';
export const OBJECTIVE_GO_FOREST_ARENA = 'Aller à l’arène de la Forêt';

/** Textes d'interface nouveaux (à valider). */
export const TEXT_QUEST_TALK_TO = '{npc} a besoin d’aide';
export const TEXT_QUEST_RETURN = '{titre} : retourne voir {npc}';
export const TEXT_QUEST_DONE_TOAST = 'Quête terminée : {titre} !';
export const TEXT_ARENA_OPEN = 'L’arène de la Prairie est ouverte !';
export const OBJECTIVE_GO_ARENA = 'Aller à l’arène de la Prairie';
export const TEXT_CATCH_CHICKEN = 'Attraper';
export const TEXT_PICK_FLOWER = 'Cueillir';
export const TEXT_KEY_FOUND = 'Tu as trouvé la clé du puits !';
export const TEXT_FLOWER_PICKED = 'Fleur jaune : {n}/{goal}';
export const TEXT_CHICKEN_HOME = 'Poule dans l’enclos : {n}/{goal}';
