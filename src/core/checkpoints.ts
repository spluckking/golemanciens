import { createGameState, createGolem, type GameState } from './gameState';

/**
 * Mode test du menu parent (SPEC.md § 14) : aller à un moment du chapitre 1 avec un état
 * cohérent (golems, quêtes, arène). Le prénom, les réglages et les statistiques sont gardés.
 */

export type CheckpointId = 'start' | 'hatched' | 'arena' | 'boss';

export const CHECKPOINTS: { id: CheckpointId; label: string }[] = [
  { id: 'start', label: 'Début (après la lecture de T1)' },
  { id: 'hatched', label: 'Après l’éclosion' },
  { id: 'arena', label: 'Arène ouverte' },
  { id: 'boss', label: 'Avant le Roi Slime' },
];

export function checkpointState(current: GameState, id: CheckpointId): GameState {
  const s = createGameState();
  s.playerName = current.playerName || 'Joueur';
  s.settings = { ...current.settings };
  s.stats = current.stats;
  s.readingStats = current.readingStats;
  s.playTimeS = current.playTimeS;
  s.storiesRead = ['T1'];
  s.tutorialsSeen = ['move', 'crate'];
  if (id === 'start') return s;

  s.sanctuary = { step: 'hatched', tileFails: 0 };
  s.golems = [current.golems[0] ? { ...current.golems[0], hp: current.golems[0].maxHp } : createGolem('pierre')];
  s.seen = ['pierre', 'mousse'];
  s.food = 6;
  for (const q of Object.values(s.quests)) q.status = 'available';
  if (id === 'hatched') return s;

  for (const q of ['R1', 'R2', 'R3'] as const) s.quests[q] = { status: 'done', progress: q === 'R1' ? 3 : q === 'R3' ? 2 : 1 };
  s.food = 20;
  if (id === 'arena') return s;

  s.arena = { wins: 3, lessonDone: true };
  s.bossQuest = 'active';
  s.food = 32;
  s.seen.push('slime', 'zombie', 'spider');
  return s;
}
