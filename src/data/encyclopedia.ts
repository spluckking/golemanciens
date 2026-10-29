/**
 * Encyclopédie (SPEC.md § 11, CONTENU.md § H) : les golems, les monstres et les boss du jeu,
 * dévoilés à mesure qu'on les rencontre. Noms et types : SPEC.md § 4.1 et § 5.1.
 * Les descriptions (15 mots au plus) sont écrites jalon par jalon ; ce sont des textes nouveaux,
 * à valider par le parent.
 */

export type EntryKind = 'golem' | 'monster' | 'boss';

export interface EncyclopediaEntry {
  id: string;
  kind: EntryKind;
  name: string;
  phase: number;
  /** Golem : son élément ; monstre ou boss : sa faiblesse. */
  icon: string;
  /** Couleur de la vignette. */
  color: string;
  description?: string;
}

export const ENCYCLOPEDIA: readonly EncyclopediaEntry[] = [
  // Golems (SPEC § 4.1).
  { id: 'pierre', kind: 'golem', name: 'Pierre', phase: 1, icon: '🪨', color: '#8d8f9c', description: 'Un golem de roche costaud. Son coup de poing fait trembler le sol !' },
  { id: 'mousse', kind: 'golem', name: 'Mousse', phase: 1, icon: '🌿', color: '#5aa04a', description: 'Un golem couvert de mousse et de fleurs. Ses lianes attrapent tout.' },
  { id: 'ecorce', kind: 'golem', name: 'Écorce', phase: 2, icon: '🌿', color: '#8a5a32', description: 'Un golem d’écorce aux épaules feuillues. Ses racines retiennent les monstres.' },
  { id: 'champignon', kind: 'golem', name: 'Champignon', phase: 2, icon: '🍄', color: '#b05aa0', description: 'Un golem champignon au grand chapeau rouge. Ses spores endorment tout le monde.' },
  { id: 'sable', kind: 'golem', name: 'Sable', phase: 3, icon: '🏜️', color: '#e0c080', description: 'Un golem de sable doré qui change de forme. Son sable crépite d’éclairs !' },
  { id: 'cuivre', kind: 'golem', name: 'Cuivre', phase: 3, icon: '⚡', color: '#c8743c', description: 'Un golem de cuivre brillant, plein d’étincelles. Ses éclairs foudroient les momies.' },
  { id: 'glace', kind: 'golem', name: 'Glace', phase: 4, icon: '❄️', color: '#9fd8ff', description: 'Un golem de glace bleu pâle, couvert de pointes de givre. Son souffle gèle tout !' },
  { id: 'cristal', kind: 'golem', name: 'Cristal', phase: 4, icon: '💎', color: '#b48aff', description: 'Un golem de quartz violet qui brille au soleil. Son bouclier renvoie les coups.' },
  { id: 'nuage', kind: 'golem', name: 'Nuage', phase: 5, icon: '☁️', color: '#e8eef8', description: 'Un golem tout rond et doux comme un nuage. Ses rafales font tout voler !' },
  { id: 'arcEnCiel', kind: 'golem', name: 'Arc-en-ciel', phase: 5, icon: '🌈', color: '#f08ac0', description: 'Un golem aux six couleurs. Toutes ses attaques brillent un peu plus fort.' },
  { id: 'galaxie', kind: 'golem', name: 'Galaxie', phase: 5, icon: '✨', color: '#2a2a6a', description: 'Né de la Poussière d’étoile, il brille de mille étoiles. Il perce l’armure du dragon !' },
  // Monstres (SPEC § 5.1) ; icône = faiblesse (révision 1.4 pour le slime).
  { id: 'slime', kind: 'monster', name: 'Slime', phase: 1, icon: '☀️', color: '#6ed46e', description: 'Un cube de gelée verte qui rebondit partout. Le soleil le dessèche.' },
  { id: 'zombie', kind: 'monster', name: 'Zombie', phase: 1, icon: '🪨', color: '#7fae6a', description: 'Il marche tout lentement, les bras tendus. Les cailloux le font tomber !' },
  { id: 'spider', kind: 'monster', name: 'Araignée', phase: 1, icon: '🌿', color: '#6b4a2e', description: 'Huit pattes et quatre yeux rouges ! Les lianes l’empêchent de filer.' },
  { id: 'skeleton', kind: 'monster', name: 'Squelette archer', phase: 2, icon: '🪨', color: '#e8e4d8', description: 'Un archer tout en os qui tire entre les troncs. Les cailloux le démontent !' },
  { id: 'wolf', kind: 'monster', name: 'Loup d’ombre', phase: 2, icon: '🍄', color: '#4a4a5a', description: 'Un loup gris aux yeux violets qui rôde près du ruisseau. Les spores le calment.' },
  { id: 'hopper', kind: 'monster', name: 'Champignon sauteur', phase: 2, icon: '🌿', color: '#9a5ad0', description: 'Un petit champignon violet qui saute partout. Les lianes l’attrapent en plein vol.' },
  { id: 'mummy', kind: 'monster', name: 'Momie', phase: 3, icon: '⚡', color: '#e0d0a8', description: 'Elle sort du sable au coucher du soleil, bras tendus. Les éclairs la font fuir !' },
  { id: 'scorpion', kind: 'monster', name: 'Scorpion', phase: 3, icon: '🪨', color: '#c8743c', description: 'Il se cache sous le sable, la queue levée. Les cailloux cognent sa carapace.' },
  { id: 'vulture', kind: 'monster', name: 'Vautour', phase: 3, icon: '🏜️', color: '#8a5a32', description: 'Il tourne en rond au-dessus des dunes. Le sable dans ses plumes le fait tomber.' },
  { id: 'yeti', kind: 'monster', name: 'Yéti', phase: 4, icon: '🪨', color: '#f4f4f4', description: 'Grand et tout blanc, il lance des boules de neige. Les cailloux le font reculer !' },
  { id: 'iceBat', kind: 'monster', name: 'Chauve-souris de glace', phase: 4, icon: '⚡', color: '#9fd8ff', description: 'Elle vole dans les grottes avec ses ailes transparentes. Les éclairs l’éblouissent.' },
  { id: 'frostGhost', kind: 'monster', name: 'Fantôme gelé', phase: 4, icon: '💎', color: '#e8f4ff', description: 'Un drap blanc qui flotte et fait frissonner. Les cristaux le font disparaître !' },
  { id: 'harpy', kind: 'monster', name: 'Harpie', phase: 5, icon: '❄️', color: '#9a9aa8', description: 'Une femme-oiseau aux plumes grises qui tourne autour des tours. La glace la ralentit.' },
  { id: 'jellyfish', kind: 'monster', name: 'Méduse céleste', phase: 5, icon: '⚡', color: '#f0a0d0', description: 'Elle flotte dans le ciel comme dans la mer. Les éclairs la font fuir !' },
  { id: 'darkKnight', kind: 'monster', name: 'Chevalier d’ombre', phase: 5, icon: '🌈', color: '#2a2238', description: 'Une armure noire aux yeux violets qui garde les ponts. Les arcs-en-ciel l’éblouissent.' },
  // Boss (SPEC § 5.1).
  { id: 'roiSlime', kind: 'boss', name: 'Roi Slime', phase: 1, icon: '☀️', color: '#5ec45e', description: 'Le plus gros slime du marais, avec une couronne d’or. Il peut se diviser !' },
  { id: 'reineAraignee', kind: 'boss', name: 'Reine Araignée', phase: 2, icon: '🍄', color: '#4a321e', description: 'La reine de la forêt, couronnée d’or. Sa toile d’argent attrape les golems !' },
  { id: 'grandVer', kind: 'boss', name: 'Grand Ver des Sables', phase: 3, icon: '⚡', color: '#c8a060', description: 'Un ver géant qui nage dans les dunes. Les éclairs le font replonger !' },
  { id: 'sorciere', kind: 'boss', name: 'Sorcière du Blizzard', phase: 4, icon: '💎', color: '#7ec8f0', description: 'Elle a apporté la tempête sur la montagne. Les cristaux brisent sa magie !' },
  { id: 'griffon', kind: 'boss', name: 'Griffon d’Ombre', phase: 5, icon: '☁️', color: '#3d2f55', description: 'Le serviteur du dragon, mi-lion mi-aigle. Le vent le fait tomber du ciel !' },
  { id: 'dragon', kind: 'boss', name: 'Dragon d’Ombre', phase: 6, icon: '✨', color: '#2a2238' },
];

/** Textes d'interface nouveaux (à valider). */
export const TEXT_ENCYCLOPEDIA = '📖 Encyclopédie';
export const TEXT_SECTIONS: Record<EntryKind, string> = { golem: 'Golems', monster: 'Monstres', boss: 'Boss' };
export const TEXT_UNKNOWN = '???';
export const TEXT_NOT_CHOSEN = 'Pas choisi';
export const TEXT_ELEMENT = 'Élément';
export const TEXT_WEAKNESS = 'Faible contre';
