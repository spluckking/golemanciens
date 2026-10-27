import './style.css';
import { Game } from './core/game';

declare global {
  interface Window {
    /** Accès réservé aux tests de bout en bout (?test). */
    __game?: {
      ready: boolean;
      hero: () => { x: number; y: number; z: number; onGround: boolean };
      frames: () => number;
    };
  }
}

const params = new URLSearchParams(window.location.search);
const app = document.getElementById('app');
const ui = document.getElementById('ui');
const loading = document.getElementById('loading');
if (!app || !ui) throw new Error('Structure de page incomplète');

// Pas de menu contextuel ni de zoom au double appui sur tablette.
window.addEventListener('contextmenu', (e) => e.preventDefault());

function boot(container: HTMLElement, layer: HTMLElement): void {
  const game = new Game(container, layer, { debug: params.has('debug') || params.has('test') });
  game.start();
  loading?.remove();

  if (params.has('test')) {
    window.__game = {
      ready: true,
      hero: () => ({ x: game.hero.x, y: game.hero.y, z: game.hero.z, onGround: game.hero.onGround }),
      frames: () => game.frameCount,
    };
  }
}

// Laisse le navigateur afficher « Chargement… » avant de générer le monde.
requestAnimationFrame(() => setTimeout(() => boot(app, ui), 0));

if (import.meta.env.PROD && !params.has('test')) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}
