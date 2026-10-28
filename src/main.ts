import './style.css';
import './ui/theme.css';
import { App, type ScreenId } from './core/app';
import { Game } from './core/game';
import { BIOME_IDS, createGameState, createGolem, progress, type BiomeId, type GameState } from './core/gameState';
import { createRng } from './core/rng';
import { CONTENT } from './data/content';
import { GOLEMS, type GolemSpecies } from './data/creatures';
import { CINEMATICS, OUTRO_CINEMATICS, storyCaptions } from './story/cinematics';
import { S2_STEPS, SANCTUARY_STEPS, type SanctuaryStep } from './quests/sanctuary';
import { shownQuestion } from './ui/screens';
import { checkpointState } from './core/checkpoints';
import { applyBlockTheme } from './ui/theme';
import { loadGame } from './save/store';
import { audio } from './audio/audio';
import type { ArenaFight } from './core/arenaFight';
import type { PrairieLife } from './core/prairieLife';
import { ForestLife } from './core/forestLife';

declare global {
  interface Window {
    /** Accès réservé aux tests de bout en bout (?test). */
    __game?: {
      ready: boolean;
      hero: () => { x: number; y: number; z: number; onGround: boolean; facing: number };
      frames: () => number;
      screen: () => ScreenId;
      state: () => GameState;
      /** Vie du biome chargé (les champs de la Prairie n'existent que dans la Prairie). */
      life: () => ReturnType<PrairieLife['snapshot']>;
      teleport: (x: number, z: number, facing?: number) => void;
      drawCalls: () => number;
      sanctuary: () => ReturnType<PrairieLife['sanctuary']['snapshot']>;
      forestSanctuary: () => ReturnType<ForestLife['sanctuary']['snapshot']>;
      quests: () => ReturnType<PrairieLife['quests']['snapshot']>;
      interactables: () => string[];
      answer: () => number;
      fight: () => ReturnType<ArenaFight['snapshot']> | null;
      save: () => Promise<boolean>;
      audio: () => { state: string; track: string | null };
      travel: (biome: BiomeId) => Promise<void>;
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

// Le son ne peut démarrer qu'après un geste du joueur (règle des navigateurs).
for (const type of ['pointerdown', 'keydown'] as const) window.addEventListener(type, () => audio.unlock(), { capture: true });

async function boot(root: HTMLElement, layer: HTMLElement): Promise<void> {
  const isTest = params.has('test');
  // La partie est enregistrée dans la tablette ; en mode test, seulement avec « &save ».
  const persist = !isTest || params.has('save');
  const state = (persist ? await loadGame() : null) ?? createGameState();
  // Mode test : « ?test&sanctuary=tiles|open|hatched » avance la quête de l'œuf de la Prairie ;
  // « &forestSanctuary=levers|canals|stone2|open|hatched » celle de la Forêt (avant la construction du monde).
  const step = params.get('sanctuary');
  if (isTest && step && SANCTUARY_STEPS.includes(step as SanctuaryStep)) progress(state, 'prairie').sanctuary.step = step as SanctuaryStep;
  const forestStep = params.get('forestSanctuary');
  if (isTest && forestStep && S2_STEPS.includes(forestStep as SanctuaryStep)) progress(state, 'foret').sanctuary.step = forestStep as SanctuaryStep;
  // Mode test : graine fixe, pour des tirages reproductibles.
  const rng = createRng(isTest ? 12345 : (Date.now() ^ 0x9e3779b9) >>> 0);
  // Mode test : « ?test&fast » divise les attentes par 2,5.
  const timeScale = isTest && params.has('fast') ? 0.4 : 1;
  // Mode test : « ?test&arena=open » termine l'œuf et les 3 quêtes obligatoires ; « &arenaWins=2 », « &lesson=done ».
  if (isTest && params.get('arena') === 'open') {
    progress(state).sanctuary.step = 'hatched';
    for (const id of ['R1', 'R2', 'R3', 'O1', 'O2'] as const) progress(state).quests[id].status = id.startsWith('R') ? 'done' : 'available';
  }
  if (isTest && params.has('arenaWins')) progress(state).arena.wins = Number(params.get('arenaWins'));
  if (isTest && params.get('lesson') === 'done') state.lessonDone = true;
  // « ?test&arena=open&boss=active » : arène terminée et quête du boss acceptée.
  if (isTest && params.get('boss') === 'active') {
    progress(state).arena.wins = 3;
    progress(state).bossQuest = 'active';
  }
  // « ?test&chapter=2 » : le Roi Slime est vaincu, l'Arche des éclats attend la lecture de T2.
  if (isTest && params.get('chapter') === '2') Object.assign(state, checkpointState(state, 'chapter2'));
  // « ?test&unlock=foret » débloque la Forêt (comme si T2 était lu) ; « &biome=foret » y commence la partie.
  const unlock = params.get('unlock') ?? params.get('biome');
  if (isTest && unlock === 'foret' && !state.storiesRead.includes('T2')) state.storiesRead.push('T2');
  const biome = params.get('biome');
  if (isTest && biome && BIOME_IDS.includes(biome as BiomeId)) state.biome = biome as BiomeId;
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
      if (!state.storiesRead.includes('T1')) state.storiesRead.push('T1');
      state.tutorialsSeen.push('move');
      const startShot = Number(params.get('shot') ?? 0);
      // Les outros passent par le jeu (le générique suit O6).
      const played = story ? game.playCinematic(script, storyCaptions(story, script), { skippable: true, timeScale, startShot }) : game.playOutro(outro!.id, startShot);
      void played.then(() => app.play());
    } else if (params.get('start') === 'play') {
      state.playerName = 'Testeur';
      if (!state.storiesRead.includes('T1')) state.storiesRead.push('T1');
      if (!params.has('tutorial')) state.tutorialsSeen.push('move');
      app.play();
    } else {
      void app.start();
    }
    const prairie = (): PrairieLife => {
      if (!game.prairie) throw new Error('Le héros n’est pas dans la Prairie');
      return game.prairie;
    };
    window.__game = {
      ready: true,
      hero: () => ({ x: game.hero.x, y: game.hero.y, z: game.hero.z, onGround: game.hero.onGround, facing: game.hero.facing }),
      frames: () => game.frameCount,
      screen: () => app.screen,
      state: () => state,
      life: () => game.life.snapshot() as ReturnType<PrairieLife['snapshot']>,
      teleport: (x, z, facing) => game.teleport(x, z, facing),
      drawCalls: () => game.drawCalls,
      sanctuary: () => prairie().sanctuary.snapshot(),
      forestSanctuary: () => {
        if (!(game.life instanceof ForestLife)) throw new Error('Le héros n’est pas dans la Forêt');
        return game.life.sanctuary.snapshot();
      },
      quests: () => prairie().quests.snapshot(),
      interactables: () => game.interactions.ids(),
      answer: () => shownQuestion()?.correctIndex ?? -1,
      fight: () => game.fight?.snapshot() ?? null,
      save: () => game.save(),
      audio: () => ({ state: audio.state, track: audio.track }),
      travel: (biome) => game.travel(biome),
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
