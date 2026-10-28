/**
 * Quêtes villageoises de la phase 1 (CONTENU.md § E, Ferme-des-Blocs). Les titres et les objectifs
 * viennent de CONTENU.md (un test le vérifie). Les répliques de demande et de remerciement sont
 * des textes nouveaux, écrits « dans ce ton » comme le demande CONTENU.md : à valider par le parent.
 */

export type QuestId = 'R1' | 'R2' | 'R3' | 'O1' | 'O2';
export type QuestNpc = 'mereBrique' | 'paquerette' | 'gaston';

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
