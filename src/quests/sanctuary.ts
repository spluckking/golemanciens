import type { Rng } from '../core/rng';
import type { Riddle } from '../data/types';
import { drawRiddle, type RiddleMemory } from '../questions/riddleBank';

/**
 * Quête de l'œuf (SPEC.md § 10.1, CONTENU.md § D), sans rendu : pierres-énigmes, énigmes du monde
 * et avancement du sanctuaire. Rien ne bloque : une erreur propose une autre énigme ou remet
 * l'énigme du monde à zéro.
 */

/** Étapes du sanctuaire S1 : la pierre, puis les dalles, puis la porte ouverte, puis l'éclosion. */
export type SanctuaryStep = 'stone' | 'tiles' | 'open' | 'hatched';
export const SANCTUARY_STEPS: readonly SanctuaryStep[] = ['stone', 'tiles', 'open', 'hatched'];

/** Avancement enregistré dans la sauvegarde. */
export interface SanctuaryProgress {
  step: SanctuaryStep;
  /** Échecs aux dalles (l'aide de Lumibloc arrive au 3e). */
  tileFails: number;
}

export function createSanctuaryProgress(): SanctuaryProgress {
  return { step: 'stone', tileFails: 0 };
}

export function advance(progress: SanctuaryProgress): void {
  const i = SANCTUARY_STEPS.indexOf(progress.step);
  if (i < SANCTUARY_STEPS.length - 1) progress.step = SANCTUARY_STEPS[i + 1];
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
export class TilePuzzle {
  /** Dalles allumées, dans l'ordre. */
  lit: TileColor[] = [];
  fails = 0;
  solved = false;

  constructor(readonly sequence: readonly TileColor[] = S1_FRESCO) {}

  step(color: TileColor): TileResult {
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
