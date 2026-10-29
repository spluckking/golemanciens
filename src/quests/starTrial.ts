import type { GameState, GolemData } from '../core/gameState';
import type { Rng } from '../core/rng';
import { EVOLUTION_MULT, GALAXY_MULT } from '../data/balance';
import type { Riddle } from '../data/types';
import { ITEMS, type EvolutionItem } from '../data/items';
import { generateCalc, generateChallengeCalc } from '../questions/calc';
import { presentCalc, presentRiddle, type QuestionView } from '../questions/present';
import { RiddleStone } from './sanctuary';

/**
 * Épreuve des Étoiles (SPEC.md § 4.3, révision 1.7) : 12 étoiles, une par bonne réponse. 6 calculs du
 * niveau 7 « défi », 3 du niveau 6 et 3 énigmes du niveau 5, en alternance, sans adaptation. Une erreur
 * ne fait rien perdre : on montre l'explication et on propose une autre question du même genre.
 */

export type StarKind = 'calc7' | 'calc6' | 'riddle5';
export const STAR_PATTERN: readonly StarKind[] = ['calc7', 'riddle5', 'calc7', 'calc6', 'calc7', 'riddle5', 'calc7', 'calc6', 'calc7', 'riddle5', 'calc7', 'calc6'];
export const STAR_COUNT = STAR_PATTERN.length;
/** Étoiles après lesquelles Lumibloc encourage (CONTENU.md, section G). */
export const STAR_CHEERS: Readonly<Record<number, 'stars4' | 'stars8'>> = { 4: 'stars4', 8: 'stars8' };

export interface StarTrialProgress {
  /** Étoiles allumées (enregistrées : on peut partir et revenir). */
  lit: number;
}

export function createStarTrial(): StarTrialProgress {
  return { lit: 0 };
}

export class StarTrial {
  private readonly stone: RiddleStone;
  view: QuestionView;

  constructor(
    private readonly progress: StarTrialProgress,
    state: Pick<GameState, 'riddles'>,
    riddles: readonly Riddle[],
    private readonly rng: Rng,
  ) {
    this.stone = new RiddleStone(riddles, state.riddles, 5, rng);
    this.view = this.draw();
  }

  get lit(): number {
    return this.progress.lit;
  }

  get done(): boolean {
    return this.progress.lit >= STAR_COUNT;
  }

  get kind(): StarKind {
    return STAR_PATTERN[Math.min(this.progress.lit, STAR_COUNT - 1)];
  }

  /** Une question du genre de l'étoile à allumer. */
  private draw(): QuestionView {
    const k = this.kind;
    if (k === 'riddle5') return presentRiddle(this.stone.current, this.rng);
    return presentCalc(k === 'calc7' ? generateChallengeCalc(this.rng) : generateCalc(6, this.rng), this.rng);
  }

  /** Réponse au choix affiché : juste, l'étoile s'allume ; sinon une autre question du même genre. */
  answer(chosen: number): { correct: boolean; previous: QuestionView; cheer?: 'stars4' | 'stars8' } {
    const previous = this.view;
    const correct = chosen === previous.correctIndex;
    if (this.kind === 'riddle5') this.stone.answer(previous.sourceIndex[chosen]);
    if (correct) this.progress.lit++;
    const cheer = correct ? STAR_CHEERS[this.progress.lit] : undefined;
    if (!this.done) this.view = this.draw();
    return { correct, previous, cheer };
  }
}

// ---------- La Poussière d'étoile et le Golem Galaxie ----------

/** Golems qui peuvent devenir Galaxie : au stade 4 (et pas déjà Galaxie). */
export function galaxyCandidates(state: Pick<GameState, 'golems'>): GolemData[] {
  return state.golems.filter((g) => g.stage >= 4 && g.species !== 'galaxie');
}

/**
 * Garantie (SPEC.md § 4.3) : si aucun golem n'est au stade 4 quand la Poussière d'étoile est prête,
 * Lumibloc donne les objets qui manquent au golem le plus avancé, et il évolue jusqu'au stade 4.
 * Renvoie le golem et les objets donnés (vide si un golem était déjà prêt).
 */
export function guaranteeStage4(state: Pick<GameState, 'golems' | 'items'>): { golem: GolemData | null; given: EvolutionItem[] } {
  if (state.golems.some((g) => g.stage >= 4)) return { golem: null, given: [] };
  const best = [...state.golems].sort((a, b) => b.stage - a.stage || b.atk - a.atk)[0];
  if (!best) return { golem: null, given: [] };
  const given: EvolutionItem[] = [];
  const byStage = Object.fromEntries((Object.keys(ITEMS) as EvolutionItem[]).map((i) => [ITEMS[i].fromStage, i])) as Record<number, EvolutionItem>;
  while (best.stage < 4) {
    const item = byStage[best.stage];
    given.push(item);
    // L'objet est donné et utilisé tout de suite (les objets déjà en réserve restent au joueur).
    best.stage++;
    best.maxHp = Math.round(best.maxHp * EVOLUTION_MULT);
    best.atk = Math.round(best.atk * EVOLUTION_MULT);
    best.hp = best.maxHp;
    best.meals = 0;
  }
  return { golem: best, given };
}

/** La Poussière d'étoile transforme un golem du stade 4 en Galaxie : ×1,4, attaques ✨. */
export function makeGalaxy(state: Pick<GameState, 'golems'>, golemId: string): boolean {
  const g = state.golems.find((k) => k.id === golemId);
  if (!g || g.stage < 4 || g.species === 'galaxie') return false;
  g.species = 'galaxie';
  g.maxHp = Math.round(g.maxHp * GALAXY_MULT);
  g.atk = Math.round(g.atk * GALAXY_MULT);
  g.hp = g.maxHp;
  return true;
}
