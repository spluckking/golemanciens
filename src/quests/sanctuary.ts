import type { Rng } from '../core/rng';
import type { Riddle } from '../data/types';
import { drawRiddle, type RiddleMemory } from '../questions/riddleBank';

/**
 * Quête de l'œuf (SPEC.md § 10.1, CONTENU.md § D), sans rendu : pierres-énigmes, énigmes du monde
 * et avancement du sanctuaire. Rien ne bloque : une erreur propose une autre énigme ou remet
 * l'énigme du monde à zéro.
 */

/** Étapes des sanctuaires : pierres-énigmes, énigmes du monde, porte ouverte, éclosion. */
export type SanctuaryStep =
  | 'stone'
  | 'tiles'
  | 'levers'
  | 'canals'
  | 'stone2'
  | 'push'
  | 'mirrors'
  | 'symbols'
  | 'stone3'
  | 'slide'
  | 'memory'
  | 'mill'
  | 'stone4'
  | 'open'
  | 'hatched';
/** S1 (Prairie) : la pierre, puis les dalles, puis la porte ouverte, puis l'éclosion. */
export const SANCTUARY_STEPS: readonly SanctuaryStep[] = ['stone', 'tiles', 'open', 'hatched'];
/** S2 (Forêt) : pierre, trois leviers, canaux d'eau, deuxième pierre, porte ouverte, éclosion. */
export const S2_STEPS: readonly SanctuaryStep[] = ['stone', 'levers', 'canals', 'stone2', 'open', 'hatched'];
/** S3 (Désert) : bloc de grès, miroirs du soleil, dalles-symboles, pierre-énigme, porte ouverte, éclosion. */
export const S3_STEPS: readonly SanctuaryStep[] = ['push', 'mirrors', 'symbols', 'stone3', 'open', 'hatched'];
/** S4 (Pics de Givre) : pierre, glissade, mémoire de glace, moulin gelé, seconde pierre, porte ouverte, éclosion. */
export const S4_STEPS: readonly SanctuaryStep[] = ['stone', 'slide', 'memory', 'mill', 'stone4', 'open', 'hatched'];

/** Avancement enregistré dans la sauvegarde. */
export interface SanctuaryProgress {
  step: SanctuaryStep;
  /** Échecs aux dalles (l'aide de Lumibloc arrive au 3e). */
  tileFails: number;
}

export function createSanctuaryProgress(): SanctuaryProgress {
  return { step: 'stone', tileFails: 0 };
}

/** Passe à l'étape suivante ; les échecs de l'énigme du monde repartent de zéro. */
export function advance(progress: SanctuaryProgress, steps: readonly SanctuaryStep[] = SANCTUARY_STEPS): void {
  const i = steps.indexOf(progress.step);
  if (i < steps.length - 1) {
    progress.step = steps[i + 1];
    if (steps !== SANCTUARY_STEPS) progress.tileFails = 0;
  }
}

/** Pierre-énigme : énigme de la banque au niveau fixé par la phase, sans adaptation. */
export class RiddleStone {
  current: Riddle;

  constructor(
    private readonly riddles: readonly Riddle[],
    private readonly memory: RiddleMemory,
    readonly level: number,
    private readonly rng: Rng,
  ) {
    this.current = drawRiddle(riddles, memory, level, rng, true);
  }

  /** Réponse (index dans l'ordre du fichier). En cas d'erreur, une autre énigme du même niveau est tirée. */
  answer(choiceIndex: number): { correct: boolean; explanation: string; previous: Riddle } {
    const previous = this.current;
    const correct = choiceIndex === previous.answer;
    if (!correct) this.current = drawRiddle(this.riddles, this.memory, this.level, this.rng, true);
    return { correct, explanation: previous.explanation, previous };
  }
}

export type TileColor = 'red' | 'yellow' | 'blue' | 'white' | 'violet';
export type TileResult = 'progress' | 'wrong' | 'done' | 'ignored';

/** Couleurs des dalles fleuries et ordre de la fresque (CONTENU.md, S1). */
export const S1_TILES: readonly TileColor[] = ['red', 'yellow', 'blue', 'white', 'violet'];
export const S1_FRESCO: readonly TileColor[] = ['red', 'yellow', 'blue'];
export const HINT_AFTER_FAILS = 3;

/**
 * Dalles fleuries : marcher sur les dalles dans l'ordre de la fresque. Une erreur éteint
 * toutes les dalles et il faut recommencer. Remarcher sur la dalle déjà allumée ne compte pas.
 */
export class TilePuzzle<T extends string = TileColor> {
  /** Dalles allumées (ou leviers abaissés), dans l'ordre. */
  lit: T[] = [];
  fails = 0;
  solved = false;

  constructor(readonly sequence: readonly T[] = S1_FRESCO as unknown as readonly T[]) {}

  step(color: T): TileResult {
    if (this.solved) return 'ignored';
    if (this.lit.length > 0 && this.lit[this.lit.length - 1] === color) return 'ignored';
    if (color !== this.sequence[this.lit.length]) {
      this.lit = [];
      this.fails++;
      return 'wrong';
    }
    this.lit.push(color);
    if (this.lit.length === this.sequence.length) {
      this.solved = true;
      return 'done';
    }
    return 'progress';
  }

  /** L'aide de Lumibloc s'affiche à partir du 3e échec. */
  get needsHint(): boolean {
    return this.fails >= HINT_AFTER_FAILS;
  }

  /** Bouton « Recommencer » : toutes les dalles s'éteignent, sans compter d'échec. */
  reset(): void {
    if (!this.solved) this.lit = [];
  }
}

/** Les trois leviers de S2 (CONTENU.md) : ce qui brille le jour, puis la nuit, puis ce qui scintille. */
export type LeverSymbol = 'sun' | 'moon' | 'star';
export const S2_LEVER_ORDER: readonly LeverSymbol[] = ['sun', 'moon', 'star'];
