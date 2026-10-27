import { createAdaptiveLevel, type AdaptiveLevel } from '../questions/difficulty';
import type { ReadingStats } from '../questions/readingLoop';
import { createRiddleMemory, type RiddleMemory } from '../questions/riddleBank';

export const SAVE_VERSION = 1;

/** État de la partie, sérialisable (base du schéma de sauvegarde de la sous-étape 1.5). */
export interface GameState {
  version: number;
  playerName: string;
  chapter: number;
  /** Textes d'histoire dont la boucle de lecture est réussie. */
  storiesRead: string[];
  levels: { calc: AdaptiveLevel; riddle: AdaptiveLevel };
  riddles: RiddleMemory;
  readingStats: Record<string, ReadingStats>;
}

export function createGameState(): GameState {
  return {
    version: SAVE_VERSION,
    playerName: '',
    chapter: 1,
    storiesRead: [],
    levels: { calc: createAdaptiveLevel('calc'), riddle: createAdaptiveLevel('riddle') },
    riddles: createRiddleMemory(),
    readingStats: {},
  };
}
