import './style.css';
import './ui/theme.css';
import { App, type ScreenId } from './core/app';
import { Game } from './core/game';
import { createGameState, createGolem, type GameState } from './core/gameState';
import { createRng } from './core/rng';
import { CONTENT } from './data/content';
import { GOLEMS, type GolemSpecies } from './data/creatures';
import { CINEMATICS, OUTRO_CINEMATICS, outroCaptions, storyCaptions } from './story/cinematics';
import { SANCTUARY_STEPS, type SanctuaryStep } from './quests/sanctuary';
import { shownQuestion } from './ui/screens';
import { applyBlockTheme } from './ui/theme';
import { loadGame } from './save/store';
import type { ArenaFight } from './core/arenaFight';

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
      sanctuary: () => ReturnType<Game['life']['sanctuary']['snapshot']>;
      quests: () => ReturnType<Game['life']['quests']['snapshot']>;
      interactables: () => string[];
      answer: () => number;
      fight: () => ReturnType<ArenaFight['snapshot']> | null;
      save: () => Promise<boolean>;
    };
  }
}

const params = new URLSearchParams(window.location.search);
const container = document.getElementById('app');
const ui = document.getElementById('ui');
const loading = document.getElementById('loading');
if (!container || !ui) throw new Error('Structure de page incomplète');

// Thème « blocs » : textures en pixels de l'interface, peintes au démarrage.
applyBlockTheme();

// Pas de menu contextuel ni de zoom au double appui sur tablette.
window.addEventListener('contextmenu', (e) => e.preventDefault());

async function boot(root: HTMLElement, layer: HTMLElement): Promise<void> {
  const isTest = params.has('test');
  // La partie est enregistrée dans la tablette ; en mode test, seulement avec « &save ».
  const persist = !isTest || params.has('save');
  const state = (persist ? await loadGame() : null) ?? createGameState();
  // Mode test : « ?test&sanctuary=tiles|open|hatched » avance la quête de l'œuf (avant la construction du monde).
  const step = params.get('sanctuary');
  if (isTest && step && SANCTUARY_STEPS.includes(step as SanctuaryStep)) state.sanctuary.step = step as SanctuaryStep;
  // Mode test : graine fixe, pour des tirages reproductibles.
  const rng = createRng(isTest ? 12345 : (Date.now() ^ 0x9e3779b9) >>> 0);
  // Mode test : « ?test&fast » divise les attentes par 2,5.
  const timeScale = isTest && params.has('fast') ? 0.4 : 1;
  // Mode test : « ?test&arena=open » termine l'œuf et les 3 quêtes obligatoires ; « &arenaWins=2 », « &lesson=done ».
  if (isTest && params.get('arena') === 'open') {
    state.sanctuary.step = 'hatched';
    for (const id of ['R1', 'R2', 'R3', 'O1', 'O2'] as const) state.quests[id].status = id.startsWith('R') ? 'done' : 'available';
  }
  if (isTest && params.has('arenaWins')) state.arena.wins = Number(params.get('arenaWins'));
  if (isTest && params.get('lesson') === 'done') state.arena.lessonDone = true;
  // « ?test&arena=open&boss=active » : arène terminée et quête du boss acceptée.
  if (isTest && params.get('boss') === 'active') {
    state.arena.wins = 3;
    state.bossQuest = 'active';
  }
  const game = new Game(root, layer, state, rng, { debug: params.has('debug') || isTest, timeScale, persist });
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
    const outro = CONTENT.outros.find((o) => o.id === cine);
    const script = cine ? (CINEMATICS[cine] ?? OUTRO_CINEMATICS[cine]) : undefined;
    if (cine && script && (story || outro)) {
      state.playerName = 'Testeur';
      state.storiesRead.push('T1');
      state.tutorialsSeen.push('move');
      const captions = story ? storyCaptions(story, script) : outroCaptions(outro!, script);
      void game.playCinematic(script, captions, { skippable: true, timeScale, startShot: Number(params.get('shot') ?? 0) }).then(() => app.play());
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
      sanctuary: () => game.life.sanctuary.snapshot(),
      quests: () => game.life.quests.snapshot(),
      interactables: () => game.interactions.ids(),
      answer: () => shownQuestion()?.correctIndex ?? -1,
      fight: () => game.fight?.snapshot() ?? null,
      save: () => game.save(),
    };
  } else {
    void app.start();
  }
}

// Laisse le navigateur afficher « Chargement… » avant de générer le monde.
requestAnimationFrame(() => setTimeout(() => void boot(container, ui), 0));

if (import.meta.env.PROD && !params.has('test')) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}
