import type { TrackId } from '../audio/music';
import type { BiomeId, GameState } from '../core/gameState';
import { generateForest } from './forest';
import type { WorldLayout } from './layout';
import { generatePrairie } from './prairie';

/** Les biomes du jeu : nom, musique, génération (SPEC.md § 1.3 et § 2). */

export const BIOME_NAMES: Record<BiomeId, string> = {
  prairie: 'Prairie de Cubeterre',
  foret: 'Forêt Murmurante',
};

/** Musique de chaque biome. */
export const BIOME_MUSIC: Record<BiomeId, TrackId> = {
  prairie: 'prairie',
  foret: 'foret',
};

/** Texte d'histoire qui ouvre chaque biome : une fois lu, l'Arche des éclats y mène. */
const OPENING_STORY: Record<BiomeId, string | null> = {
  prairie: null,
  foret: 'T2',
};

/**
 * Prochain texte d'histoire à lire pour ouvrir un nouveau biome : celui du chapitre en cours
 * (« T2 » quand le chapitre 2 commence), s'il n'est pas encore lu et qu'un biome l'attend.
 */
export function pendingStory(state: Pick<GameState, 'storiesRead' | 'chapter'>): { story: string; biome: BiomeId } | null {
  const story = `T${state.chapter}`;
  const biome = (Object.keys(OPENING_STORY) as BiomeId[]).find((id) => OPENING_STORY[id] === story);
  if (!biome || state.storiesRead.includes(story)) return null;
  return { story, biome };
}

/** Biomes où l'on peut aller : la Prairie, puis chaque biome dont le texte d'ouverture est lu. */
export function unlockedBiomes(state: Pick<GameState, 'storiesRead'>): BiomeId[] {
  return (Object.keys(OPENING_STORY) as BiomeId[]).filter((id) => {
    const story = OPENING_STORY[id];
    return story === null || state.storiesRead.includes(story);
  });
}

/** Génère le monde d'un biome (graine fixe : toujours le même). */
export function buildLayout(id: BiomeId): WorldLayout {
  return id === 'prairie' ? generatePrairie() : generateForest();
}
