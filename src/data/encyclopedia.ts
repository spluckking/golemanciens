/**
 * Encyclopédie (SPEC.md § 11, CONTENU.md § H) : les golems, les monstres et les boss du jeu,
 * dévoilés à mesure qu'on les rencontre. Noms et types : SPEC.md § 4.1 et § 5.1.
 * Les descriptions (15 mots au plus) sont écrites jalon par jalon ; celles du chapitre 1
 * sont des textes nouveaux, à valider par le parent.
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
  { id: 'ecorce', kind: 'golem', name: 'Écorce', phase: 2, icon: '🌿', color: '#8a5a32' },
  { id: 'champignon', kind: 'golem', name: 'Champignon', phase: 2, icon: '🍄', color: '#b05aa0' },
  { id: 'sable', kind: 'golem', name: 'Sable', phase: 3, icon: '🏜️', color: '#e0c080' },
  { id: 'cuivre', kind: 'golem', name: 'Cuivre', phase: 3, icon: '⚡', color: '#c8743c' },
  { id: 'glace', kind: 'golem', name: 'Glace', phase: 4, icon: '❄️', color: '#9fd8ff' },
  { id: 'cristal', kind: 'golem', name: 'Cristal', phase: 4, icon: '💎', color: '#b48aff' },
  { id: 'nuage', kind: 'golem', name: 'Nuage', phase: 5, icon: '☁️', color: '#e8eef8' },
  { id: 'arcEnCiel', kind: 'golem', name: 'Arc-en-ciel', phase: 5, icon: '🌈', color: '#f08ac0' },
  { id: 'galaxie', kind: 'golem', name: 'Galaxie', phase: 5, icon: '✨', color: '#2a2a6a' },
  // Monstres (SPEC § 5.1) ; icône = faiblesse (révision 1.4 pour le slime).
  { id: 'slime', kind: 'monster', name: 'Slime', phase: 1, icon: '☀️', color: '#6ed46e', description: 'Un cube de gelée verte qui rebondit partout. Le soleil le dessèche.' },
  { id: 'zombie', kind: 'monster', name: 'Zombie', phase: 1, icon: '🪨', color: '#7fae6a', description: 'Il marche tout lentement, les bras tendus. Les cailloux le font tomber !' },
  { id: 'spider', kind: 'monster', name: 'Araignée', phase: 1, icon: '🌿', color: '#6b4a2e', description: 'Huit pattes et quatre yeux rouges ! Les lianes l’empêchent de filer.' },
  { id: 'skeleton', kind: 'monster', name: 'Squelette archer', phase: 2, icon: '🪨', color: '#e8e4d8' },
  { id: 'wolf', kind: 'monster', name: 'Loup d’ombre', phase: 2, icon: '🍄', color: '#4a4a5a' },
  { id: 'hopper', kind: 'monster', name: 'Champignon sauteur', phase: 2, icon: '🌿', color: '#9a5ad0' },
  { id: 'mummy', kind: 'monster', name: 'Momie', phase: 3, icon: '⚡', color: '#e0d0a8' },
  { id: 'scorpion', kind: 'monster', name: 'Scorpion', phase: 3, icon: '🪨', color: '#c8743c' },
  { id: 'vulture', kind: 'monster', name: 'Vautour', phase: 3, icon: '🏜️', color: '#8a5a32' },
  { id: 'yeti', kind: 'monster', name: 'Yéti', phase: 4, icon: '🪨', color: '#f4f4f4' },
  { id: 'iceBat', kind: 'monster', name: 'Chauve-souris de glace', phase: 4, icon: '⚡', color: '#9fd8ff' },
  { id: 'frostGhost', kind: 'monster', name: 'Fantôme gelé', phase: 4, icon: '💎', color: '#e8f4ff' },
  { id: 'harpy', kind: 'monster', name: 'Harpie', phase: 5, icon: '❄️', color: '#9a9aa8' },
  { id: 'jellyfish', kind: 'monster', name: 'Méduse céleste', phase: 5, icon: '⚡', color: '#f0a0d0' },
  { id: 'darkKnight', kind: 'monster', name: 'Chevalier d’ombre', phase: 5, icon: '🌈', color: '#2a2238' },
  // Boss (SPEC § 5.1).
  { id: 'roiSlime', kind: 'boss', name: 'Roi Slime', phase: 1, icon: '☀️', color: '#5ec45e', description: 'Le plus gros slime du marais, avec une couronne d’or. Il peut se diviser !' },
  { id: 'reineAraignee', kind: 'boss', name: 'Reine Araignée', phase: 2, icon: '🍄', color: '#4a321e' },
  { id: 'grandVer', kind: 'boss', name: 'Grand Ver des Sables', phase: 3, icon: '⚡', color: '#c8a060' },
  { id: 'sorciere', kind: 'boss', name: 'Sorcière du Blizzard', phase: 4, icon: '💎', color: '#7ec8f0' },
  { id: 'griffon', kind: 'boss', name: 'Griffon d’Ombre', phase: 5, icon: '☁️', color: '#3d2f55' },
  { id: 'dragon', kind: 'boss', name: 'Dragon d’Ombre', phase: 6, icon: '✨', color: '#2a2238' },
];

/** Textes d'interface nouveaux (à valider). */
export const TEXT_ENCYCLOPEDIA = '📖 Encyclopédie';
export const TEXT_SECTIONS: Record<EntryKind, string> = { golem: 'Golems', monster: 'Monstres', boss: 'Boss' };
export const TEXT_UNKNOWN = '???';
export const TEXT_NOT_CHOSEN = 'Pas choisi';
export const TEXT_ELEMENT = 'Élément';
export const TEXT_WEAKNESS = 'Faible contre';
