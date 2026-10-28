import type * as THREE from 'three';
import type { HeroState } from '../entities/heroController';
import { OBJECTIVE_FIND_EGG } from '../story/dialogues';
import type { ForestLayout } from '../world/forest';
import { ForestSanctuaryLife } from './forestSanctuaryLife';
import { progress, type GameState } from './gameState';
import type { Interactions } from './interactions';
import type { SolidFn } from './physics';
import type { Rng } from './rng';
import type { SanctuaryHooks } from './sanctuaryLife';
import { WorldLife, type Objective, type WorldHooks } from './worldLife';

/** Objectif de la Forêt une fois l'œuf éclos, en attendant les quêtes (texte nouveau, à valider). */
export const OBJECTIVE_EXPLORE_FOREST = 'Explore la Forêt Murmurante';

export interface ForestHooks extends WorldHooks {
  /** Interface et monde pour le sanctuaire (énigmes, éclosion, portes). */
  sanctuary: Omit<SanctuaryHooks, 'dialog' | 'toast' | 'burst'>;
}

/**
 * La Forêt Murmurante (chapitre 2) : le monde commun, le sanctuaire de Mousse ; les quêtes des
 * Cabanes des Cimes, l'arène et la Reine Araignée arrivent aux sous-étapes suivantes.
 */
export class ForestLife extends WorldLife {
  declare readonly layout: ForestLayout;
  readonly sanctuary: ForestSanctuaryLife;

  constructor(layout: ForestLayout, state: GameState, atlas: THREE.Texture, solid: SolidFn, rng: Rng, interactions: Interactions, hooks: ForestHooks) {
    super(layout, state, atlas, solid, rng, interactions, hooks);
    this.sanctuary = new ForestSanctuaryLife(layout.sanctuary, layout.world, this.group, state, interactions, rng, {
      ...hooks.sanctuary,
      dialog: hooks.dialog,
      toast: hooks.toast,
      burst: (x, y, z, color, count) => hooks.sparks.burst(x, y, z, color, count ?? 12),
      onProgress: hooks.onProgress,
    });
  }

  protected override updateChapter(dt: number): void {
    this.sanctuary.update(dt);
  }

  objective(_hero: HeroState): Objective {
    if (progress(this.state).sanctuary.step !== 'hatched') {
      return { text: OBJECTIVE_FIND_EGG, target: this.layout.sanctuary.entrance, current: [{ text: OBJECTIVE_FIND_EGG, active: true }], done: [] };
    }
    const center = this.layout.landmarks.village;
    return { text: OBJECTIVE_EXPLORE_FOREST, target: center, current: [{ text: OBJECTIVE_EXPLORE_FOREST, active: true }], done: [OBJECTIVE_FIND_EGG] };
  }

  override snapshot(): ReturnType<WorldLife['snapshot']> & { forestSanctuary: ReturnType<ForestSanctuaryLife['snapshot']> } {
    return { ...super.snapshot(), forestSanctuary: this.sanctuary.snapshot() };
  }
}
