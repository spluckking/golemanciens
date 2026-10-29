import { EVOLUTION_MULT } from '../data/balance';
import { ITEMS, type EvolutionItem } from '../data/items';
import { lumiblocLine } from '../story/dialogues';
import type { DialogBubble } from '../ui/dialog';
import type { GameState } from './gameState';

/**
 * Évolution des golems (SPEC.md § 4.3) : un objet du bon stade fait passer le golem au stade
 * suivant (PV max et ATQ × 1,35, PV pleins, compteur de repas remis à zéro, attaque débloquée).
 */

export type EvolveResult = 'ok' | 'noItem' | 'wrongStage' | 'unknown';

export function canEvolve(state: GameState, golemId: string, item: EvolutionItem): EvolveResult {
  const g = state.golems.find((x) => x.id === golemId);
  if (!g) return 'unknown';
  if (g.stage !== ITEMS[item].fromStage) return 'wrongStage';
  if ((state.items[item] ?? 0) <= 0) return 'noItem';
  return 'ok';
}

export function evolve(state: GameState, golemId: string, item: EvolutionItem): EvolveResult {
  const res = canEvolve(state, golemId, item);
  if (res !== 'ok') return res;
  const g = state.golems.find((x) => x.id === golemId)!;
  state.items[item]--;
  g.stage++;
  g.maxHp = Math.round(g.maxHp * EVOLUTION_MULT);
  g.atk = Math.round(g.atk * EVOLUTION_MULT);
  g.hp = g.maxHp;
  g.meals = 0;
  return 'ok';
}

/** Objets que ce golem peut recevoir maintenant (pour l'écran Golems). */
export function usableItems(state: GameState, golemId: string): EvolutionItem[] {
  return (Object.keys(ITEMS) as EvolutionItem[]).filter((i) => canEvolve(state, golemId, i) === 'ok');
}

/** Premier objet d'évolution : Lumibloc explique où le donner (CONTENU.md, section G), une seule fois. */
export function itemTip(state: GameState, dialog: DialogBubble): void {
  if (state.tutorialsSeen.includes('evolutionItem')) return;
  state.tutorialsSeen.push('evolutionItem');
  dialog.show(lumiblocLine('firstEvolutionItem'));
}
