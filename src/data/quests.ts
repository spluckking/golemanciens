/**
 * Quêtes villageoises de la phase 1 (CONTENU.md § E, Ferme-des-Blocs). Les titres et les objectifs
 * viennent de CONTENU.md (un test le vérifie). Les répliques de demande et de remerciement sont
 * des textes nouveaux, écrits « dans ce ton » comme le demande CONTENU.md : à valider par le parent.
 */

export type QuestId = 'R1' | 'R2' | 'R3' | 'O1' | 'O2';
export type QuestNpc = 'mereBrique' | 'paquerette' | 'gaston' | 'noisette' | 'pip' | 'tilleul' | 'oasia' | 'zephir' | 'flocon';

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

/**
 * Quêtes de la phase 3 (CONTENU.md § E, Oasis de Palmebloc). Titres et objectifs : CONTENU.md.
 * Qui donne chaque quête, et les répliques : nouveaux, à valider par le parent.
 */
export const QUESTS_P3: readonly QuestDef[] = [
  {
    id: 'R1',
    title: 'L’eau de l’oasis',
    mandatory: true,
    giver: 'oasia',
    turnIn: 'oasia',
    goal: 3,
    task: 'Remplir un seau à la source et le vider dans l’abreuvoir ({n}/{goal})',
    request: 'Les bêtes de l’oasis ont soif ! Remplis un seau à la source et vide-le dans l’abreuvoir, trois fois.',
    thanks: 'L’abreuvoir est plein ! Les chameaux te disent merci, {prenom}.',
  },
  {
    id: 'R2',
    title: 'La charrette ensablée',
    mandatory: true,
    giver: 'zephir',
    turnIn: 'zephir',
    goal: 3,
    task: 'Casser les caisses qui bloquent la charrette ({n}/{goal})',
    request: 'Ma charrette est coincée par des caisses tombées dans le sable. Tu peux les casser d’un coup de baguette ?',
    thanks: 'Ma charrette roule à nouveau ! Merci, {prenom}, voici des pommes du marché.',
  },
  {
    id: 'R3',
    title: 'Les scorpions du puits',
    mandatory: true,
    giver: 'oasia',
    turnIn: 'oasia',
    goal: 3,
    task: 'Vaincre les scorpions du vieux puits ({n}/{goal})',
    request: 'Des scorpions se cachent autour du vieux puits. Tes golems peuvent les chasser ?',
    thanks: 'Le puits est tranquille maintenant. Tu es courageux, {prenom} !',
  },
  {
    id: 'O1',
    title: 'La carte déchirée',
    mandatory: false,
    giver: 'zephir',
    turnIn: 'zephir',
    goal: 3,
    task: 'Retrouver les morceaux de la carte ({n}/{goal})',
    request: 'Le vent a déchiré ma carte en trois morceaux ! Ils sont quelque part dans les dunes.',
    thanks: 'Ma carte est entière ! Je ne me perdrai plus dans les dunes.',
  },
  {
    id: 'O2',
    title: 'Le chameau têtu',
    mandatory: false,
    giver: 'oasia',
    turnIn: 'oasia',
    goal: 1,
    task: 'Ramener le chameau Caramel à l’enclos (il veut d’abord une 🍎)',
    request: 'Caramel, notre chameau, s’est sauvé dans les dunes. Il ne suit personne… sauf contre une pomme !',
    thanks: 'Caramel est rentré ! Il a l’air content, et moi aussi.',
  },
];

/** Textes d'interface nouveaux (à valider). */
export const TEXT_FILL = 'Remplir le seau';
export const TEXT_EMPTY = 'Vider le seau';
export const TEXT_BUCKET = 'Seau d’eau : {n}/{goal}';
export const TEXT_CART_CRATE = 'Caisse cassée : {n}/{goal}';
export const TEXT_MAP_PIECE = 'Morceau de carte : {n}/{goal}';
export const TEXT_FEED_CAMEL = 'Donner 1 🍎';
export const TEXT_CAMEL_NO_FOOD = 'Il te faut une 🍎 pour Caramel.';
export const TEXT_CAMEL_FOLLOWS = 'Caramel te suit !';
export const TEXT_CAMEL_HOME = 'Caramel est rentré à l’enclos !';
export const TEXT_DESERT_ARENA_OPEN = 'L’arène du Désert est ouverte !';
export const OBJECTIVE_GO_DESERT_ARENA = 'Aller à l’arène du Désert';
export const TEXT_CRYSTAL_FOUND = 'Tu as trouvé un Cristal de puissance !';

/**
 * Quêtes de la phase 4 (CONTENU.md § E, Igloos du Col). Titres et objectifs : CONTENU.md.
 * Grand-mère Flocon donne toutes les quêtes ; les répliques sont nouvelles, à valider par le parent.
 */
export const QUESTS_P4: readonly QuestDef[] = [
  {
    id: 'R1',
    title: 'Du bois pour le feu',
    mandatory: true,
    giver: 'flocon',
    turnIn: 'flocon',
    goal: 5,
    task: 'Rapporter des bûches pour le feu ({n}/{goal})',
    request: 'Brr ! Le feu du village va s’éteindre. Tu peux me rapporter cinq bûches ? Elles sont tombées près des sapins.',
    thanks: 'Quel bon feu ! Viens te réchauffer les mains, {prenom}.',
  },
  {
    id: 'R2',
    title: 'Le petit perdu',
    mandatory: true,
    giver: 'flocon',
    turnIn: 'flocon',
    goal: 1,
    task: 'Retrouver Nilou dans la tempête et le ramener au village',
    request: 'Mon petit-fils Nilou est parti voir la neige vers l’est, et il ne revient pas ! Tu peux le ramener ?',
    thanks: 'Nilou ! Te voilà ! Merci, {prenom}, tu as un cœur grand comme la montagne.',
  },
  {
    id: 'R3',
    title: 'Les yétis du col',
    mandatory: true,
    giver: 'flocon',
    turnIn: 'flocon',
    goal: 3,
    task: 'Vaincre les yétis du col ({n}/{goal})',
    request: 'Des yétis bloquent le col et lancent des boules de neige sur les voyageurs. Tes golems peuvent les chasser ?',
    thanks: 'Le col est libre ! Les voyageurs vont pouvoir passer.',
  },
  {
    id: 'O1',
    title: 'Le poisson du lac',
    mandatory: false,
    giver: 'flocon',
    turnIn: 'flocon',
    goal: 3,
    task: 'Pêcher des poissons aux trous du lac gelé ({n}/{goal})',
    request: 'J’ai une envie de soupe de poisson ! Va pêcher trois poissons aux trous du lac gelé.',
    thanks: 'Trois beaux poissons ! Ce soir, soupe pour tout le village.',
  },
  {
    id: 'O2',
    title: 'Les cloches de glace',
    mandatory: false,
    giver: 'flocon',
    turnIn: 'flocon',
    goal: 3,
    task: 'Faire sonner les cloches de glace, de la plus petite à la plus grande ({n}/{goal})',
    request: 'Les trois cloches de glace jouent une jolie musique… si on les fait sonner de la plus petite à la plus grande !',
    thanks: 'Quelle belle musique ! On l’entend jusqu’en haut de la montagne.',
  },
];

/** Textes d'interface nouveaux (à valider). */
export const TEXT_LOG = 'Bûche : {n}/{goal}';
export const TEXT_FISH = 'Pêcher';
export const TEXT_FISH_CAUGHT = 'Un poisson ! ({n}/{goal})';
export const TEXT_RING_BELL = 'Faire sonner';
export const TEXT_BELL_RIGHT = 'Ding ! ({n}/3)';
export const TEXT_BELL_WRONG = 'Ce n’est pas le bon ordre. On recommence, de la plus petite à la plus grande !';
export const TEXT_CALL_NILOU = 'Viens avec moi !';
export const TEXT_NILOU_FOLLOWS = 'Nilou te suit !';
export const TEXT_NILOU_HOME = 'Nilou est rentré au village !';
export const TEXT_GIVRE_ARENA_OPEN = 'L’arène des Pics de Givre est ouverte !';
export const OBJECTIVE_GO_GIVRE_ARENA = 'Aller à l’arène des Pics de Givre';
export const TEXT_HEART_FOUND = 'Tu as trouvé un Cœur ancestral !';
