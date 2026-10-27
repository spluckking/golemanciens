import { shuffled, type Rng } from '../core/rng';
import { READING_FIRST_WAIT_S, READING_QUESTIONS_PER_ROUND, READING_REREAD_WAIT_S } from '../data/balance';
import type { ReadingQuestion, StoryText } from '../data/types';

/** Statistiques de lecture d'un texte (menu parent). */
export interface ReadingStats {
  reads: number;
  asked: number;
  correct: number;
  completed: boolean;
}

export function createReadingStats(): ReadingStats {
  return { reads: 0, asked: 0, correct: 0, completed: false };
}

export type ReadingPhase = 'reading' | 'questions' | 'retry' | 'success';

/**
 * Boucle de lecture (SPEC.md § 9.1) : lire, répondre à 2 questions, relire en cas d'erreur
 * avec 2 nouvelles questions jamais posées dans ce cycle, jusqu'à la réussite.
 */
export class ReadingLoop {
  phase: ReadingPhase = 'reading';
  private round: number[] = [];
  private results: boolean[] = [];
  private readonly asked = new Set<number>();
  private lastRound: number[] = [];
  private firstRead = true;

  constructor(
    readonly story: StoryText,
    private readonly rng: Rng,
    readonly stats: ReadingStats,
  ) {
    stats.reads++;
  }

  /** Attente avant que « J'ai lu ! » s'active (20 s la première fois, 10 s ensuite). */
  get waitSeconds(): number {
    return this.firstRead ? READING_FIRST_WAIT_S : READING_REREAD_WAIT_S;
  }

  /** Le joueur a lu : on tire les questions du tour. */
  finishReading(): void {
    if (this.phase !== 'reading') return;
    this.firstRead = false;
    this.round = this.drawRound();
    this.results = [];
    this.phase = 'questions';
  }

  /** Indices (dans la banque du texte) des questions du tour en cours. */
  get roundIndices(): readonly number[] {
    return this.round;
  }

  get questionNumber(): number {
    return this.results.length;
  }

  currentQuestion(): ReadingQuestion | null {
    if (this.phase !== 'questions') return null;
    return this.story.questions[this.round[this.results.length]] ?? null;
  }

  /** Réponse à la question courante (index dans l'ordre du fichier). Retourne vrai si c'est juste. */
  answer(choiceIndex: number): boolean {
    const q = this.currentQuestion();
    if (!q) throw new Error('Pas de question en cours');
    const correct = choiceIndex === q.answer;
    this.results.push(correct);
    this.stats.asked++;
    if (correct) this.stats.correct++;
    if (this.results.length === this.round.length) {
      if (this.results.every(Boolean)) {
        this.phase = 'success';
        this.stats.completed = true;
      } else {
        this.phase = 'retry';
      }
    }
    return correct;
  }

  /** Après une erreur : retour au texte. */
  reread(): void {
    if (this.phase !== 'retry') return;
    this.phase = 'reading';
    this.stats.reads++;
  }

  private drawRound(): number[] {
    const n = READING_QUESTIONS_PER_ROUND;
    const all = this.story.questions.map((_, i) => i);
    let available = all.filter((i) => !this.asked.has(i));
    if (available.length < n) {
      // Banque épuisée : nouveau cycle, en excluant les 2 dernières questions posées.
      this.asked.clear();
      for (const i of this.lastRound) this.asked.add(i);
      available = all.filter((i) => !this.asked.has(i));
    }
    const round = shuffled(this.rng, available).slice(0, n);
    for (const i of round) this.asked.add(i);
    this.lastRound = round;
    return round;
  }
}
