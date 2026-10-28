import { golemBaseStats } from '../data/balance';
import type { BossQuestStep } from '../data/bossQuest';
import { GOLEMS, type GolemSpecies } from '../data/creatures';
import { createAdaptiveLevel, type AdaptiveLevel } from '../questions/difficulty';
import type { ReadingStats } from '../questions/readingLoop';
import { createRiddleMemory, type RiddleMemory } from '../questions/riddleBank';
import { createSanctuaryProgress, type SanctuaryProgress } from '../quests/sanctuary';
import { createQuestLog, type QuestLog } from '../quests/villageQuests';

/** Version du schéma de sauvegarde (voir save/saveFile.ts pour les migrations). */
export const SAVE_VERSION = 2;

/** Golem possédé (enregistré). */
export interface GolemData {
  id: string;
  species: GolemSpecies;
  nickname: string;
  stage: number;
  maxHp: number;
  atk: number;
  hp: number;
  /** Repas pris au stade en cours (4 au plus, remis à zéro à chaque évolution). */
  meals: number;
}

/** Réponses données : posées et justes. */
export interface Tally {
  asked: number;
  correct: number;
}

/** Statistiques pour le menu parent (SPEC.md § 14). */
export interface PlayStats {
  /** Calcul, par niveau (1 à 6). */
  calcLevels: Record<string, Tally>;
  /** Calcul, par type d'opération (addition, table, monnaie…). */
  calcKinds: Record<string, Tally>;
  /** Tables de multiplication (2 à 10), pour repérer les plus ratées. */
  tables: Record<string, Tally>;
  /** Énigmes, par niveau (1 à 5). */
  riddleLevels: Record<string, Tally>;
}

/** Réglages du menu parent (SPEC.md § 14). */
export interface Settings {
  calcStart: number;
  riddleStart: number;
  pauseReminder: boolean;
  pauseMinutes: number;
  musicVolume: number;
  sfxVolume: number;
  parentCode: string;
  showFps: boolean;
}

/** État de la partie, enregistré tel quel (SPEC.md § 13). */
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
  /** Quêtes du village du biome en cours. */
  quests: QuestLog;
  /** Arène du biome : victoires (3 pour la terminer) et leçon des faiblesses déjà vue. */
  arena: { wins: number; lessonDone: boolean };
  /** Quête du boss du biome (P1) : proposée après l'arène, puis le combat. */
  bossQuest: BossQuestStep;
  stats: PlayStats;
  settings: Settings;
  /** Temps de jeu total, en secondes. */
  playTimeS: number;
  /** Golems, monstres et boss déjà rencontrés (encyclopédie). */
  seen: string[];
}

/** Note une rencontre pour l'encyclopédie. */
export function markSeen(state: GameState, id: string): void {
  if (!state.seen.includes(id)) state.seen.push(id);
}

export function createSettings(): Settings {
  return { calcStart: 1, riddleStart: 1, pauseReminder: true, pauseMinutes: 40, musicVolume: 0.6, sfxVolume: 0.8, parentCode: '1234', showFps: false };
}

export function createStats(): PlayStats {
  return { calcLevels: {}, calcKinds: {}, tables: {}, riddleLevels: {} };
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
    quests: createQuestLog(),
    arena: { wins: 0, lessonDone: false },
    bossQuest: 'locked',
    stats: createStats(),
    settings: createSettings(),
    playTimeS: 0,
    seen: [],
  };
}

/** Crée un golem au stade 1, avec les stats de sa phase. */
export function createGolem(species: GolemSpecies, nickname = ''): GolemData {
  const { hp, atk } = golemBaseStats(GOLEMS[species].phase);
  return { id: species, species, nickname, stage: 1, maxHp: hp, atk, hp, meals: 0 };
}
