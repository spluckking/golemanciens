/** Golems, attaques, monstres et boss (SPEC.md § 4.1, § 5.1). Seuls ceux du jalon en cours sont listés. */

import type { AttackSlot } from './balance';

/**
 * Type d'une attaque (révision 1.4) : la faiblesse d'un monstre se compare au type de l'attaque.
 * C'est l'élément du golem par défaut ; certaines attaques ont un autre type (☀️ Soleil).
 */
export type AttackType = 'rock' | 'plant' | 'sun' | 'star';

/** Élément d'un golem : le type de ses attaques par défaut. */
export type Element = AttackType;

export const TYPE_ICON: Record<AttackType, string> = {
  rock: '🪨',
  plant: '🌿',
  sun: '☀️',
  star: '✨',
};

export const TYPE_NAME: Record<AttackType, string> = {
  rock: 'Roche',
  plant: 'Plante',
  sun: 'Soleil',
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

export type GolemSpecies = 'pierre' | 'mousse';

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
};

/** Attaques débloquées par stade (§ 4.3, révision 1.4) : A1 et A2 au stade 1, A3 au stade 2, Ultime au stade 3. */
export const UNLOCK_STAGE: Record<AttackSlot, number> = { a1: 1, a2: 1, a3: 2, ultimate: 3 };

export function unlockedAttacks(species: GolemSpecies, stage: number): AttackInfo[] {
  return GOLEMS[species].attacks.filter((a) => stage >= UNLOCK_STAGE[a.slot]);
}

export type MonsterSpecies = 'slime' | 'zombie' | 'spider';

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
};

export type BossId = 'roiSlime';

/** Une étape d'un boss : faiblesse, attaque, et éventuelle armure (seul un type l'entame). */
export interface BossStage {
  weakness: AttackType;
  attack: string;
  armorOnly?: AttackType;
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
};
