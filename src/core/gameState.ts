import { golemBaseStats } from '../data/balance';
import { GOLEMS, type GolemSpecies } from '../data/creatures';
import { createAdaptiveLevel, type AdaptiveLevel } from '../questions/difficulty';
import type { ReadingStats } from '../questions/readingLoop';
import { createRiddleMemory, type RiddleMemory } from '../questions/riddleBank';
import { createSanctuaryProgress, type SanctuaryProgress } from '../quests/sanctuary';

export const SAVE_VERSION = 1;

/** Golem possédé (enregistré). */
export interface GolemData {
  id: string;
  species: GolemSpecies;
  nickname: string;
  stage: number;
  maxHp: number;
  atk: number;
  hp: number;
}

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
  golems: GolemData[];
  food: number;
  shards: number;
  brokenCrates: string[];
  openedChests: string[];
  litLanterns: string[];
  /** Dernière lanterne allumée : point de retour si tous les golems sont K.O. */
  lastLantern: string | null;
  /** Bulles de tutoriel déjà vues. */
  tutorialsSeen: string[];
  /** Boss vaincus : leurs statuettes sont sur l'étagère de la maison. */
  trophies: string[];
  /** Quête de l'œuf du biome en cours (sanctuaire S1). */
  sanctuary: SanctuaryProgress;
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
    golems: [],
    food: 0,
    shards: 0,
    brokenCrates: [],
    openedChests: [],
    litLanterns: [],
    lastLantern: null,
    tutorialsSeen: [],
    trophies: [],
    sanctuary: createSanctuaryProgress(),
  };
}

/** Crée un golem au stade 1, avec les stats de sa phase. */
export function createGolem(species: GolemSpecies, nickname = ''): GolemData {
  const { hp, atk } = golemBaseStats(GOLEMS[species].phase);
  return { id: species, species, nickname, stage: 1, maxHp: hp, atk, hp };
}
