import { pick, type Rng } from '../core/rng';
import { RIDDLE_MAX_LEVEL, RIDDLE_MIN_LEVEL, RIDDLE_RECENT_EXCLUDED } from '../data/balance';
import type { Riddle } from '../data/types';

/** Mémoire des énigmes (enregistrée dans la sauvegarde). */
export interface RiddleMemory {
  /** Identifiants des énigmes déjà vues depuis la dernière réinitialisation de leur niveau. */
  seen: string[];
  /** Dernières énigmes tirées, la plus récente en dernier. */
  recent: string[];
}

export function createRiddleMemory(): RiddleMemory {
  return { seen: [], recent: [] };
}

/**
 * Tirage sans répétition (SPEC.md § 8.2) : une énigme non vue du niveau demandé ;
 * sinon une non vue d'un niveau voisin (le plus facile d'abord) ;
 * sinon le niveau est réinitialisé, en excluant les 5 dernières tirées.
 * Avec sameLevel (pierres-énigmes des sanctuaires, § 10.1), on ne passe jamais au niveau voisin.
 */
export function drawRiddle(riddles: readonly Riddle[], memory: RiddleMemory, level: number, rng: Rng, sameLevel = false): Riddle {
  const lv = Math.max(RIDDLE_MIN_LEVEL, Math.min(RIDDLE_MAX_LEVEL, level));
  const seen = new Set(memory.seen);
  const unseenAt = (l: number): Riddle[] => riddles.filter((r) => r.level === l && !seen.has(r.id));

  let pool = unseenAt(lv);
  if (pool.length === 0 && !sameLevel) pool = unseenAt(lv - 1);
  if (pool.length === 0 && !sameLevel) pool = unseenAt(lv + 1);
  if (pool.length === 0) {
    const levelIds = new Set(riddles.filter((r) => r.level === lv).map((r) => r.id));
    memory.seen = memory.seen.filter((id) => !levelIds.has(id));
    const recent = new Set(memory.recent.slice(-RIDDLE_RECENT_EXCLUDED));
    pool = riddles.filter((r) => r.level === lv && !recent.has(r.id));
    if (pool.length === 0) pool = riddles.filter((r) => r.level === lv);
  }

  const riddle = pick(rng, pool);
  if (!memory.seen.includes(riddle.id)) memory.seen.push(riddle.id);
  memory.recent.push(riddle.id);
  if (memory.recent.length > RIDDLE_RECENT_EXCLUDED) memory.recent.splice(0, memory.recent.length - RIDDLE_RECENT_EXCLUDED);
  return riddle;
}
