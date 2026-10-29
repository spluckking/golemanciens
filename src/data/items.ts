/**
 * Objets d'évolution (SPEC.md § 4.3) : un exemplaire caché dans le biome de leur phase, un autre
 * donné par son boss. Un objet ne s'applique qu'à un golem du bon stade.
 */

export type EvolutionItem = 'rune' | 'crystal' | 'heart';

export interface ItemInfo {
  name: string;
  icon: string;
  /** Stade du golem qui peut le recevoir (il passe au stade suivant). */
  fromStage: number;
  /** Phase où on le trouve. */
  phase: number;
}

export const ITEMS: Record<EvolutionItem, ItemInfo> = {
  rune: { name: 'Rune d’éveil', icon: '🔷', fromStage: 1, phase: 2 },
  crystal: { name: 'Cristal de puissance', icon: '🔶', fromStage: 2, phase: 3 },
  heart: { name: 'Cœur ancestral', icon: '💖', fromStage: 3, phase: 4 },
};

/** Objet donné par le boss de chaque phase (le Roi Slime n'en donne pas). */
export const BOSS_ITEM: Partial<Record<number, EvolutionItem>> = { 2: 'rune', 3: 'crystal', 4: 'heart' };
