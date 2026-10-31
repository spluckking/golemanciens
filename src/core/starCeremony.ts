import { CONTENT } from '../data/content';
import { GOLEMS } from '../data/creatures';
import { CanalPuzzle, GRAND_CANAL_ROW, grandGrid } from '../quests/canals';
import { GRAND_SLIDE_ROOM, SlidePuzzle } from '../quests/frostPuzzles';
import { STAR_COUNT, StarTrial, galaxyCandidates, guaranteeStage4, makeGalaxy, pendingBoard, type GrandBoard } from '../quests/starTrial';
import { GRAND_MIRROR_ROOM, MirrorPuzzle } from '../quests/templePuzzles';
import { openCanalBoard, openMirrorBoard, openSlideBoard } from '../ui/puzzleBoards';
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
export const TEXT_BOARD_INTRO = 'Une grande énigme garde la suite de la constellation. Prêt ?';
export const TEXT_BOARD_GO = 'Résoudre l’énigme';
const TEXT_BOARD_CANALS = 'Le grand canal des étoiles';
const TEXT_BOARD_CANALS_HELP = 'Touche les rigoles pour les tourner : l’eau doit traverser toute la grille.';
const TEXT_BOARD_MIRRORS = 'Les trois miroirs';
const TEXT_BOARD_MIRRORS_HELP = 'Trois miroirs, cette fois ! Envoie le rayon jusqu’au cristal.';
const TEXT_BOARD_SLIDE = 'La grande glissade';
const TEXT_BOARD_SLIDE_HELP = 'Tu glisses tout droit jusqu’au prochain bloc. Trouve le chemin vers la porte.';
const TEXT_BOARD_HINT = 'Prends ton temps : regarde jusqu’où va le chemin, et d’où il faudrait partir.';
const BOARD_HINT_AFTER = 20;
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
  /** Mode test : raccourcit les attentes. */
  timeScale: number;
}

/** Une grande énigme de l'épreuve ; une sortie par « Retour » laisse tout en place. */
function grandBoard(host: CeremonyHost, board: GrandBoard): Promise<boolean> {
  const { layer, timeScale } = host;
  const onTurn = (): void => audio.sfx('tile');
  if (board === 'canals') return openCanalBoard(layer, { puzzle: new CanalPuzzle(() => grandGrid(), GRAND_CANAL_ROW, GRAND_CANAL_ROW), title: TEXT_BOARD_CANALS, help: TEXT_BOARD_CANALS_HELP, hint: TEXT_BOARD_HINT, hintAfter: BOARD_HINT_AFTER, timeScale, onTurn });
  if (board === 'mirrors') return openMirrorBoard(layer, { puzzle: new MirrorPuzzle(GRAND_MIRROR_ROOM), title: TEXT_BOARD_MIRRORS, help: TEXT_BOARD_MIRRORS_HELP, hint: TEXT_BOARD_HINT, hintAfter: BOARD_HINT_AFTER, timeScale, onTurn, onChange: () => undefined });
  return openSlideBoard(layer, { puzzle: new SlidePuzzle(GRAND_SLIDE_ROOM), title: TEXT_BOARD_SLIDE, help: TEXT_BOARD_SLIDE_HELP, timeScale, onSlide: () => audio.sfx('slide') });
}

/** Propose la grande énigme en attente. Renvoie false si le joueur la remet à plus tard. */
async function clearBoards(host: CeremonyHost): Promise<boolean> {
  const { layer, state } = host;
  for (let board = pendingBoard(state.starTrial); board; board = pendingBoard(state.starTrial)) {
    const go = await askChoice(layer, TEXT_BOARD_INTRO, [TEXT_BOARD_GO, CONTENT.lumibloc.starsLater], state.playerName, 'stars-board');
    if (go !== 0 || !(await grandBoard(host, board))) return false;
    state.starTrial.boards = (state.starTrial.boards ?? 0) + 1;
    audio.sfx('star');
    host.save();
  }
  return true;
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
  const trial = new StarTrial(state.starTrial, state, rng);
  if (trial.lit === 0) await showMessage(layer, lumi.starsStart, TEXT_STAR_START, name, 'stars-start');
  while (!trial.done || pendingBoard(state.starTrial)) {
    if (!(await clearBoards(host))) {
      host.save();
      return false;
    }
    if (trial.done) break;
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
        if (trial.done || pendingBoard(state.starTrial)) break;
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
