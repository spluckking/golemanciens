import type { HeroState } from '../entities/heroController';
import { WorldLife, type Objective } from './worldLife';

/** Objectif de la Forêt avant son chapitre (texte nouveau, à valider par le parent). */
export const OBJECTIVE_EXPLORE_FOREST = 'Explore la Forêt Murmurante';

/**
 * La Forêt Murmurante (chapitre 2). Sous-étape 2.1 : le monde commun (golems, lanternes, arche) ;
 * le sanctuaire, les quêtes, l'arène et la Reine Araignée arrivent aux sous-étapes suivantes.
 */
export class ForestLife extends WorldLife {
  objective(_hero: HeroState): Objective {
    const center = { x: 64, z: 64 };
    return { text: OBJECTIVE_EXPLORE_FOREST, target: center, current: [{ text: OBJECTIVE_EXPLORE_FOREST, active: true }], done: [] };
  }
}
