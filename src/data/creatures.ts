/** Golems, attaques, monstres et boss (SPEC.md § 4.1, § 5.1). Seuls ceux du jalon en cours sont listés. */

import type { AttackSlot } from './balance';

/**
 * Type d'une attaque (révision 1.4) : la faiblesse d'un monstre se compare au type de l'attaque.
 * C'est l'élément du golem par défaut ; certaines attaques ont un autre type (☀️ Soleil).
 */
export type AttackType = 'rock' | 'plant' | 'sun' | 'spore' | 'sand' | 'thunder' | 'ice' | 'crystal' | 'wind' | 'rainbow' | 'star';

/** Élément d'un golem : le type de ses attaques par défaut. */
export type Element = AttackType;

export const TYPE_ICON: Record<AttackType, string> = {
  rock: '🪨',
  plant: '🌿',
  sun: '☀️',
  spore: '🍄',
  sand: '🏜️',
  thunder: '⚡',
  ice: '❄️',
  crystal: '💎',
  wind: '☁️',
  rainbow: '🌈',
  star: '✨',
};

export const TYPE_NAME: Record<AttackType, string> = {
  rock: 'Roche',
  plant: 'Plante',
  sun: 'Soleil',
  spore: 'Spore',
  sand: 'Sable',
  thunder: 'Foudre',
  ice: 'Glace',
  crystal: 'Cristal',
  wind: 'Vent',
  rainbow: 'Arc-en-ciel',
  star: 'Étoile',
};

/** F = Force (question de calcul), M = Magie (énigme). */
export type AttackKind = 'force' | 'magic';

/** Effets d'attaque (§ 7.1). */
export type AttackEffect = 'stun' | 'sleep' | 'blind' | 'shield';

export interface AttackInfo {
  slot: AttackSlot;
  name: string;
  kind: AttackKind;
  type: AttackType;
  effect?: AttackEffect;
}

export type GolemSpecies = 'pierre' | 'mousse' | 'ecorce' | 'champignon' | 'sable' | 'cuivre' | 'glace' | 'cristal' | 'nuage' | 'arcEnCiel' | 'galaxie';

export interface GolemInfo {
  name: string;
  element: Element;
  phase: number;
  /** A1, A2, A3, Ultime, dans cet ordre. */
  attacks: readonly AttackInfo[];
}

export const GOLEMS: Record<GolemSpecies, GolemInfo> = {
  pierre: {
    name: 'Pierre',
    element: 'rock',
    phase: 1,
    attacks: [
      { slot: 'a1', name: 'Coup de poing', kind: 'force', type: 'rock' },
      { slot: 'a2', name: 'Galets brûlants', kind: 'magic', type: 'sun' },
      { slot: 'a3', name: 'Rocher roulant', kind: 'force', type: 'rock', effect: 'stun' },
      { slot: 'ultimate', name: 'Avalanche', kind: 'magic', type: 'rock' },
    ],
  },
  mousse: {
    name: 'Mousse',
    element: 'plant',
    phase: 1,
    attacks: [
      { slot: 'a1', name: 'Fouet de lianes', kind: 'force', type: 'plant' },
      { slot: 'a2', name: 'Tournesol brûlant', kind: 'magic', type: 'sun' },
      { slot: 'a3', name: 'Liane-piège', kind: 'force', type: 'plant', effect: 'stun' },
      { slot: 'ultimate', name: 'Jardin géant', kind: 'magic', type: 'plant' },
    ],
  },
  // Phase 2. Règle de conception (§ 4.1) : chacun a, dès l'éclosion, une attaque 🍄 (faiblesse de la Reine Araignée).
  // Écorce : A2 « Spores de mousse » (🍄) remplace « Pluie de feuilles » (décision du jalon 2, à valider).
  ecorce: {
    name: 'Écorce',
    element: 'plant',
    phase: 2,
    attacks: [
      { slot: 'a1', name: 'Coup de branche', kind: 'force', type: 'plant' },
      { slot: 'a2', name: 'Spores de mousse', kind: 'magic', type: 'spore' },
      { slot: 'a3', name: 'Racines', kind: 'force', type: 'plant', effect: 'stun' },
      { slot: 'ultimate', name: 'Forêt vivante', kind: 'magic', type: 'plant' },
    ],
  },
  champignon: {
    name: 'Champignon',
    element: 'spore',
    phase: 2,
    attacks: [
      { slot: 'a1', name: 'Coup de chapeau', kind: 'force', type: 'spore' },
      { slot: 'a2', name: 'Nuage de spores', kind: 'magic', type: 'spore' },
      { slot: 'a3', name: 'Spores dodo', kind: 'magic', type: 'spore', effect: 'sleep' },
      { slot: 'ultimate', name: 'Champignon géant', kind: 'force', type: 'spore' },
    ],
  },
  // Phase 3 : chacun a, dès l'éclosion, une attaque ⚡ (faiblesse du Grand Ver des Sables).
  // Sable : A2 « Sable électrique » (⚡) remplace « Tourbillon » (décision du jalon 3, à valider).
  sable: {
    name: 'Sable',
    element: 'sand',
    phase: 3,
    attacks: [
      { slot: 'a1', name: 'Poing de sable', kind: 'force', type: 'sand' },
      { slot: 'a2', name: 'Sable électrique', kind: 'magic', type: 'thunder' },
      { slot: 'a3', name: 'Tempête aveuglante', kind: 'magic', type: 'sand', effect: 'blind' },
      { slot: 'ultimate', name: 'Dune géante', kind: 'force', type: 'sand' },
    ],
  },
  cuivre: {
    name: 'Cuivre',
    element: 'thunder',
    phase: 3,
    attacks: [
      { slot: 'a1', name: 'Éclair rapide', kind: 'force', type: 'thunder' },
      { slot: 'a2', name: 'Boule électrique', kind: 'magic', type: 'thunder' },
      { slot: 'a3', name: 'Choc', kind: 'force', type: 'thunder', effect: 'stun' },
      { slot: 'ultimate', name: 'Orage', kind: 'magic', type: 'thunder' },
    ],
  },
  // Phase 4 : chacun a, dès l'éclosion, une attaque 💎 (faiblesse de la Sorcière du Blizzard).
  // Glace : A2 « Souffle glacé » est de type 💎, un souffle plein d'éclats de givre (décision du jalon 4, à valider).
  glace: {
    name: 'Glace',
    element: 'ice',
    phase: 4,
    attacks: [
      { slot: 'a1', name: 'Poing gelé', kind: 'force', type: 'ice' },
      { slot: 'a2', name: 'Souffle glacé', kind: 'magic', type: 'crystal' },
      { slot: 'a3', name: 'Prison de glace', kind: 'magic', type: 'ice', effect: 'stun' },
      { slot: 'ultimate', name: 'Blizzard', kind: 'force', type: 'ice' },
    ],
  },
  cristal: {
    name: 'Cristal',
    element: 'crystal',
    phase: 4,
    attacks: [
      { slot: 'a1', name: 'Éclat tranchant', kind: 'force', type: 'crystal' },
      { slot: 'a2', name: 'Rayon prisme', kind: 'magic', type: 'crystal' },
      { slot: 'a3', name: 'Bouclier miroir', kind: 'magic', type: 'crystal', effect: 'shield' },
      { slot: 'ultimate', name: 'Pluie de cristaux', kind: 'force', type: 'crystal' },
    ],
  },
  // Phase 5 : chacun a, dès l'éclosion, une attaque ☁️ (faiblesse du Griffon d'Ombre).
  // Arc-en-ciel : A2 « Rayon bleu » est de type ☁️, un rayon couleur de ciel (décision du jalon 5, à valider) ;
  // il garde son bonus ×1,25 sur toutes ses attaques (×1,5 contre une faiblesse 🌈).
  nuage: {
    name: 'Nuage',
    element: 'wind',
    phase: 5,
    attacks: [
      { slot: 'a1', name: 'Rafale', kind: 'force', type: 'wind' },
      { slot: 'a2', name: 'Brume', kind: 'magic', type: 'wind' },
      { slot: 'a3', name: 'Tornade', kind: 'force', type: 'wind', effect: 'blind' },
      { slot: 'ultimate', name: 'Ouragan', kind: 'magic', type: 'wind' },
    ],
  },
  arcEnCiel: {
    name: 'Arc-en-ciel',
    element: 'rainbow',
    phase: 5,
    attacks: [
      { slot: 'a1', name: 'Rayon rouge', kind: 'force', type: 'rainbow' },
      { slot: 'a2', name: 'Rayon bleu', kind: 'magic', type: 'wind' },
      { slot: 'a3', name: 'Arc lumineux', kind: 'magic', type: 'rainbow', effect: 'blind' },
      { slot: 'ultimate', name: 'Prisme total', kind: 'force', type: 'rainbow' },
    ],
  },
  // Galaxie (SPEC § 4.3) : un golem au stade 4 transformé par la Poussière d'étoile ; toutes ses attaques sont ✨.
  galaxie: {
    name: 'Galaxie',
    element: 'star',
    phase: 5,
    attacks: [
      { slot: 'a1', name: 'Étoile filante', kind: 'force', type: 'star' },
      { slot: 'a2', name: 'Pluie de météores', kind: 'magic', type: 'star' },
      { slot: 'a3', name: 'Trou noir', kind: 'magic', type: 'star', effect: 'stun' },
      { slot: 'ultimate', name: 'Supernova', kind: 'force', type: 'star' },
    ],
  },
};

/** Attaques débloquées par stade (§ 4.3, révision 1.4) : A1 et A2 au stade 1, A3 au stade 2, Ultime au stade 3. */
export const UNLOCK_STAGE: Record<AttackSlot, number> = { a1: 1, a2: 1, a3: 2, ultimate: 3 };

export function unlockedAttacks(species: GolemSpecies, stage: number): AttackInfo[] {
  return GOLEMS[species].attacks.filter((a) => stage >= UNLOCK_STAGE[a.slot]);
}

export type MonsterSpecies = 'slime' | 'zombie' | 'spider' | 'skeleton' | 'wolf' | 'hopper' | 'mummy' | 'scorpion' | 'vulture' | 'yeti' | 'iceBat' | 'frostGhost' | 'harpy' | 'jellyfish' | 'darkKnight';

export interface MonsterInfo {
  name: string;
  weakness: AttackType;
  phase: number;
  /** Nom de son attaque, annoncé au tour par tour. */
  attack: string;
}

export const MONSTERS: Record<MonsterSpecies, MonsterInfo> = {
  slime: { name: 'Slime', weakness: 'sun', phase: 1, attack: 'Rebond gluant' },
  zombie: { name: 'Zombie', weakness: 'rock', phase: 1, attack: 'Bras tendus' },
  spider: { name: 'Araignée', weakness: 'plant', phase: 1, attack: 'Morsure' },
  // Phase 2 (noms d'attaques nouveaux, à valider).
  skeleton: { name: 'Squelette archer', weakness: 'rock', phase: 2, attack: 'Flèche' },
  wolf: { name: 'Loup d’ombre', weakness: 'spore', phase: 2, attack: 'Morsure d’ombre' },
  hopper: { name: 'Champignon sauteur', weakness: 'plant', phase: 2, attack: 'Saut piquant' },
  // Phase 3 (noms d'attaques nouveaux, à valider).
  mummy: { name: 'Momie', weakness: 'thunder', phase: 3, attack: 'Bandelettes' },
  scorpion: { name: 'Scorpion', weakness: 'rock', phase: 3, attack: 'Piqûre' },
  vulture: { name: 'Vautour', weakness: 'sand', phase: 3, attack: 'Plongeon' },
  // Phase 4 (noms d'attaques nouveaux, à valider).
  yeti: { name: 'Yéti', weakness: 'rock', phase: 4, attack: 'Boule de neige' },
  iceBat: { name: 'Chauve-souris de glace', weakness: 'thunder', phase: 4, attack: 'Cri glacé' },
  frostGhost: { name: 'Fantôme gelé', weakness: 'crystal', phase: 4, attack: 'Frisson' },
  // Phase 5 (noms d'attaques nouveaux, à valider).
  harpy: { name: 'Harpie', weakness: 'ice', phase: 5, attack: 'Plumes coupantes' },
  jellyfish: { name: 'Méduse céleste', weakness: 'thunder', phase: 5, attack: 'Filaments' },
  darkKnight: { name: 'Chevalier d’ombre', weakness: 'rainbow', phase: 5, attack: 'Épée d’ombre' },
};

export type BossId = 'roiSlime' | 'reineAraignee' | 'grandVer' | 'sorciere' | 'griffon' | 'dragon';

/** Une étape d'un boss : faiblesse, attaque, et éventuelle armure (seul un type l'entame). */
export interface BossStage {
  weakness: AttackType;
  attack: string;
  armorOnly?: AttackType;
  /** Son attaque étourdit le golem actif (il passe son prochain tour). */
  stuns?: boolean;
  /** Son attaque aveugle le golem actif : sa prochaine attaque est moins forte. */
  blinds?: boolean;
  /** Ce type fait double dégât (dragon, étapes 2 et 3), au lieu du bonus de faiblesse. */
  doubleType?: AttackType;
  /** Ses attaques frappent plus fort (dragon en colère, étape 3). */
  power?: number;
}

export interface BossInfo {
  name: string;
  phase: number;
  stages: readonly BossStage[];
}

export const BOSSES: Record<BossId, BossInfo> = {
  roiSlime: {
    name: 'Roi Slime',
    phase: 1,
    stages: [
      { weakness: 'sun', attack: 'Écrasement gluant' },
      { weakness: 'sun', attack: 'Pluie de gouttes' },
    ],
  },
  // Étape 2 : « Toile », qui étourdit un tour (SPEC § 5.1).
  reineAraignee: {
    name: 'Reine Araignée',
    phase: 2,
    stages: [
      { weakness: 'spore', attack: 'Crochets d’argent' },
      { weakness: 'spore', attack: 'Toile', stuns: true },
    ],
  },
  // Étape 2 : il plonge sous le sable, puis « Surgissement » (SPEC § 5.1).
  grandVer: {
    name: 'Grand Ver des Sables',
    phase: 3,
    stages: [
      { weakness: 'thunder', attack: 'Morsure des sables' },
      { weakness: 'thunder', attack: 'Surgissement' },
    ],
  },
  // Étape 2 : « Tempête », qui aveugle (SPEC § 5.1).
  sorciere: {
    name: 'Sorcière du Blizzard',
    phase: 4,
    stages: [
      { weakness: 'crystal', attack: 'Flocons tranchants' },
      { weakness: 'crystal', attack: 'Tempête', blinds: true },
    ],
  },
  // Étape 2 : « Piqué » (SPEC § 5.1), un plongeon depuis le ciel.
  griffon: {
    name: 'Griffon d’Ombre',
    phase: 5,
    stages: [
      { weakness: 'wind', attack: 'Coups de griffes' },
      { weakness: 'wind', attack: 'Piqué' },
    ],
  },
  // Dragon d'Ombre (SPEC § 5.1) : (1) armure que seul ✨ entame, (2) vol et souffle d'ombre,
  // (3) colère, avec des attaques plus fortes ; aux étapes 2 et 3, tout le monde le touche et ✨ fait double dégât.
  dragon: {
    name: 'Dragon d’Ombre',
    phase: 6,
    stages: [
      { weakness: 'star', attack: 'Coup de queue', armorOnly: 'star' },
      { weakness: 'star', attack: 'Souffle d’ombre', doubleType: 'star' },
      { weakness: 'star', attack: 'Colère du dragon', doubleType: 'star', power: 1.3 },
    ],
  },
};
