import './style.css';
import { App, type ScreenId } from './core/app';
import { Game } from './core/game';
import { createGameState, createGolem, type GameState } from './core/gameState';
import { createRng } from './core/rng';
import { CONTENT } from './data/content';
import { GOLEMS, type GolemSpecies } from './data/creatures';
import { CINEMATICS, storyCaptions } from './story/cinematics';

declare global {
  interface Window {
    /** Accès réservé aux tests de bout en bout (?test). */
    __game?: {
      ready: boolean;
      hero: () => { x: number; y: number; z: number; onGround: boolean; facing: number };
      frames: () => number;
      screen: () => ScreenId;
      state: () => GameState;
      life: () => ReturnType<Game['life']['snapshot']>;
      teleport: (x: number, z: number, facing?: number) => void;
      drawCalls: () => number;
    };
  }
}

const params = new URLSearchParams(window.location.search);
const container = document.getElementById('app');
const ui = document.getElementById('ui');
const loading = document.getElementById('loading');
if (!container || !ui) throw new Error('Structure de page incomplète');

// Pas de menu contextuel ni de zoom au double appui sur tablette.
window.addEventListener('contextmenu', (e) => e.preventDefault());

function boot(root: HTMLElement, layer: HTMLElement): void {
  const isTest = params.has('test');
  const state = createGameState();
  // Mode test : graine fixe, pour des tirages reproductibles.
  const rng = createRng(isTest ? 12345 : (Date.now() ^ 0x9e3779b9) >>> 0);
  const game = new Game(root, layer, state, rng, { debug: params.has('debug') || isTest });
  // Mode test : « ?test&fast » divise les attentes de lecture par 2,5.
  const timeScale = isTest && params.has('fast') ? 0.4 : 1;
  const app = new App(game, layer, state, rng, timeScale);
  game.start();
  loading?.remove();

  if (isTest) {
    // « ?test&golems=pierre,mousse » donne des golems (l'œuf n'arrive qu'à la sous-étape 1.4).
    for (const id of (params.get('golems') ?? '').split(',')) {
      if (id in GOLEMS) state.golems.push(createGolem(id as GolemSpecies));
    }
    // « ?test&trophies=roiSlime » pose des trophées sur l'étagère de la maison.
    for (const id of (params.get('trophies') ?? '').split(',')) if (id) state.trophies.push(id);
    // « ?test&start=play » saute l'introduction (prénom fictif, tutoriel de déplacement déjà vu).
    // « ?test&cine=T1&shot=4 » joue une cinématique (à partir d'un plan), puis lance la partie.
    const cine = params.get('cine');
    const story = CONTENT.stories.find((s) => s.id === cine);
    if (cine && story && CINEMATICS[cine]) {
      state.playerName = 'Testeur';
      state.storiesRead.push('T1');
      state.tutorialsSeen.push('move');
      const script = CINEMATICS[cine];
      void game
        .playCinematic(script, storyCaptions(story, script), { skippable: true, timeScale, startShot: Number(params.get('shot') ?? 0) })
        .then(() => app.play());
    } else if (params.get('start') === 'play') {
      state.playerName = 'Testeur';
      state.storiesRead.push('T1');
      if (!params.has('tutorial')) state.tutorialsSeen.push('move');
      app.play();
    } else {
      void app.start();
    }
    window.__game = {
      ready: true,
      hero: () => ({ x: game.hero.x, y: game.hero.y, z: game.hero.z, onGround: game.hero.onGround, facing: game.hero.facing }),
      frames: () => game.frameCount,
      screen: () => app.screen,
      state: () => state,
      life: () => game.life.snapshot(),
      teleport: (x, z, facing) => game.teleport(x, z, facing),
      drawCalls: () => game.drawCalls,
    };
  } else {
    void app.start();
  }
}

// Laisse le navigateur afficher « Chargement… » avant de générer le monde.
requestAnimationFrame(() => setTimeout(() => boot(container, ui), 0));

if (import.meta.env.PROD && !params.has('test')) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}
