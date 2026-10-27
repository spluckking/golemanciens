import './style.css';
import { App, type ScreenId } from './core/app';
import { Game } from './core/game';
import { createGameState, type GameState } from './core/gameState';
import { createRng } from './core/rng';

declare global {
  interface Window {
    /** Accès réservé aux tests de bout en bout (?test). */
    __game?: {
      ready: boolean;
      hero: () => { x: number; y: number; z: number; onGround: boolean };
      frames: () => number;
      screen: () => ScreenId;
      state: () => GameState;
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
  const game = new Game(root, layer, { debug: params.has('debug') || isTest });
  const state = createGameState();
  // Mode test : « ?test&fast » divise les attentes de lecture par 5.
  const timeScale = isTest && params.has('fast') ? 0.2 : 1;
  const app = new App(game, layer, state, createRng((Date.now() ^ 0x9e3779b9) >>> 0), timeScale);
  game.start();
  loading?.remove();

  // Mode test : « ?test&start=play » saute l'introduction (prénom fictif).
  if (isTest && params.get('start') === 'play') {
    state.playerName = 'Testeur';
    state.storiesRead.push('T1');
    app.play();
  } else {
    void app.start();
  }

  if (isTest) {
    window.__game = {
      ready: true,
      hero: () => ({ x: game.hero.x, y: game.hero.y, z: game.hero.z, onGround: game.hero.onGround }),
      frames: () => game.frameCount,
      screen: () => app.screen,
      state: () => state,
    };
  }
}

// Laisse le navigateur afficher « Chargement… » avant de générer le monde.
requestAnimationFrame(() => setTimeout(() => boot(container, ui), 0));

if (import.meta.env.PROD && !params.has('test')) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}
