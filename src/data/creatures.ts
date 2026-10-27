/** Golems et monstres (SPEC.md § 4.1 et § 5.1). Seuls ceux du jalon en cours sont listés. */

export type Element = 'rock' | 'plant';

export const ELEMENT_ICON: Record<Element, string> = {
  rock: '🪨',
  plant: '🌿',
};

export type GolemSpecies = 'pierre' | 'mousse';

export interface GolemInfo {
  name: string;
  element: Element;
  phase: number;
}

export const GOLEMS: Record<GolemSpecies, GolemInfo> = {
  pierre: { name: 'Pierre', element: 'rock', phase: 1 },
  mousse: { name: 'Mousse', element: 'plant', phase: 1 },
};

export type MonsterSpecies = 'slime' | 'zombie' | 'spider';

export interface MonsterInfo {
  name: string;
  weakness: Element;
  phase: number;
}

export const MONSTERS: Record<MonsterSpecies, MonsterInfo> = {
  slime: { name: 'Slime', weakness: 'plant', phase: 1 },
  zombie: { name: 'Zombie', weakness: 'rock', phase: 1 },
  spider: { name: 'Araignée', weakness: 'plant', phase: 1 },
};
