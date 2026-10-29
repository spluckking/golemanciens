import { CONTENT } from '../data/content';
import { GOLEMS } from '../data/creatures';
import { STAR_COUNT, StarTrial, galaxyCandidates, guaranteeStage4, makeGalaxy } from '../quests/starTrial';
import { askChoice, askQuestion, revealAnswer, showMessage } from '../ui/screens';
import { audio } from '../audio/audio';
import type { GameState } from './gameState';
import type { Rng } from './rng';
import { recordRiddle } from './stats';

/** Textes nouveaux (à valider). */
export const TEXT_STAR_TRIAL = 'L’Épreuve des Étoiles';
export const TEXT_STAR_GO = '✨ Allumer une étoile';
export const TEXT_STAR_START = 'C’est parti !';
export const TEXT_STAR_OK = 'D’accord';
export const TEXT_GUARANTEE = 'Aucun de tes golems n’est encore au stade 4. Tiens, voici les objets qui manquent à {golem} : il est prêt pour la Poussière d’étoile !';
export const TEXT_GALAXY_BORN = '{golem} est devenu un Golem Galaxie !';
const LIT = '⭐';
const UNLIT = '✩';

/** La constellation : les étoiles allumées, puis celles qui attendent. */
export function constellation(lit: number): string {
  return LIT.repeat(lit) + UNLIT.repeat(Math.max(0, STAR_COUNT - lit));
}

export interface CeremonyHost {
  layer: HTMLElement;
  state: GameState;
  rng: Rng;
  /** L'outro O5 (cinématique) : la naissance du Galaxie. */
  playOutro: (id: string) => Promise<void>;
  toast: (text: string) => void;
  save: () => void;
}

/**
 * Épreuve des Étoiles au sommet de l'Académie (SPEC.md § 4.3, révision 1.7), puis la cérémonie :
 * garantie, choix du golem au stade 4, outro O5 et transformation en Galaxie. Renvoie true si le
 * Galaxie est né, false si le joueur est parti (« Revenir plus tard » : ses étoiles restent allumées).
 */
export async function runStarCeremony(host: CeremonyHost): Promise<boolean> {
  const { layer, state, rng } = host;
  const name = state.playerName;
  const lumi = CONTENT.lumibloc;
  const trial = new StarTrial(state.starTrial, state, CONTENT.riddles, rng);
  if (trial.lit === 0) await showMessage(layer, lumi.starsStart, TEXT_STAR_START, name, 'stars-start');
  while (!trial.done) {
    const go = await askChoice(layer, `${constellation(trial.lit)} (${trial.lit}/${STAR_COUNT})`, [TEXT_STAR_GO, lumi.starsLater], name, 'stars-menu');
    if (go !== 0) {
      host.save();
      return false;
    }
    // On répond aux questions à la suite, jusqu'à ce que le joueur veuille faire une pause.
    for (;;) {
      const view = trial.view;
      const kind = trial.kind;
      const chosen = await askQuestion(layer, view, name, constellation(trial.lit));
      const res = trial.answer(chosen);
      if (kind === 'riddle5') recordRiddle(state.stats, 5, res.correct);
      if (res.correct) {
        audio.sfx('star');
        host.save();
        if (res.cheer) await showMessage(layer, lumi[res.cheer], TEXT_STAR_OK, name, 'stars-cheer');
        if (trial.done) break;
        continue;
      }
      await revealAnswer(layer, res.previous, chosen, name);
      await showMessage(layer, lumi.starsMistake, TEXT_STAR_OK, name, 'stars-mistake');
      break;
    }
  }
  audio.sfx('victory');
  await showMessage(layer, lumi.starsEnd, TEXT_STAR_OK, name, 'stars-end');

  // Garantie : un golem au moins doit être au stade 4.
  const g = guaranteeStage4(state);
  if (g.golem) await showMessage(layer, TEXT_GUARANTEE.replace('{golem}', g.golem.nickname || GOLEMS[g.golem.species].name), TEXT_STAR_OK, name, 'stars-guarantee');
  const candidates = galaxyCandidates(state);
  const pick = await askChoice(layer, lumi.galaxy, candidates.map((c) => c.nickname || GOLEMS[c.species].name), name, 'galaxy-choice');
  const chosen = candidates[pick] ?? candidates[0];
  const label = chosen.nickname || GOLEMS[chosen.species].name;
  await host.playOutro('O5');
  makeGalaxy(state, chosen.id);
  state.chapter = Math.max(state.chapter, 6);
  audio.sfx('evolve');
  host.toast(TEXT_GALAXY_BORN.replace('{golem}', label));
  host.save();
  return true;
}
