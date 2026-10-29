import * as THREE from 'three';
import { createHero, stepHero, type HeroState } from '../entities/heroController';
import { HeroModel } from '../entities/heroModel';
import { Sparks } from '../entities/sparks';
import { CONTENT } from '../data/content';
import { CINEMATICS, OUTRO_CINEMATICS, outroCaptions, storyCaptions } from '../story/cinematics';
import { TEXT_TROPHY } from '../data/bossQuest';
import { CinematicDirector, type CinematicScript } from '../story/cinematics/director';
import { JOURNAL_NO_DONE } from '../story/dialogues';
import { askNickname, chooseGolem } from '../ui/hatching';
import { askChoice, askQuestion, revealAnswer } from '../ui/screens';
import { DebugOverlay } from '../ui/debugOverlay';
import { DialogBubble } from '../ui/dialog';
import { el } from '../ui/dom';
import { Hud } from '../ui/hud';
import { openEncyclopedia } from '../ui/encyclopediaScreen';
import { openGolems } from '../ui/golemsScreen';
import { openJournal } from '../ui/journal';
import { openPause } from '../ui/pauseScreen';
import { showCredits } from '../ui/credits';
import { TouchControls } from '../ui/touchControls';
import { WorldLabels } from '../ui/worldLabels';
import { paintAtlas } from '../world/atlas';
import { BiomeScene } from '../world/biomeScene';
import { Block } from '../world/blocks';
import { BIOME_MUSIC, BIOME_NAMES, buildLayout, pendingStory, unlockedBiomes } from '../world/biomes';
import type { WorldLayout } from '../world/layout';
import type { PrairieLayout } from '../world/prairie';
import type { ForestLayout } from '../world/forest';
import type { DesertLayout } from '../world/desert';
import { DesertLife } from './desertLife';
import type { GivreLayout } from '../world/givre';
import { GivreLife } from './givreLife';
import type { CielLayout } from '../world/ciel';
import { CielLife } from './cielLife';
import { runStarCeremony, TEXT_STAR_TRIAL } from './starCeremony';
import { OBJECTIVE_GAME_DONE, OBJECTIVE_STAR_TRIAL, TEXT_GAME_DONE } from '../data/bossQuest';
import type { VolcanLayout } from '../world/volcan';
import { VolcanLife } from './volcanLife';
import type { Cell } from '../world/structures';
import type { QuestionView } from '../questions/present';
import type { GolemSpecies } from '../data/creatures';
import { buildVolcanoSet } from '../world/volcanoSet';
import { createAtlasTexture } from '../world/voxelMaterial';
import { ArenaFight } from './arenaFight';
import { itemTip } from './evolution';
import { ForestLife } from './forestLife';
import { PrairieLife } from './prairieLife';
import type { Objective, WorldHooks, WorldLife } from './worldLife';
import { saveGame } from '../save/store';
import { audio } from '../audio/audio';
import { CameraRig } from './cameraRig';
import { compassRotation } from './compass';
import type { BiomeId, GameState } from './gameState';
import { InputState, attachKeyboard } from './input';
import { Interactions } from './interactions';
import type { SolidFn } from './physics';
import type { Rng } from './rng';

const MAX_PIXEL_RATIO = 1.5;
const FOG_NEAR = 30;
const FOG_FAR = 64;
const LOOK_YAW_PER_PX = 0.006;
const LOOK_PITCH_PER_PX = 0.004;
const ATTACK_COOLDOWN = 0.35;
const TITLE_ORBIT_SPEED = 0.08;
const KO_FADE_MS = 1400;
/** Le joueur pousse le joystick sans avancer pendant 3 s : on propose « Me débloquer » pendant 6 s. */
const STUCK_HELP_S = 3;
const UNSTUCK_OFFER_S = 6;
const SAFE_SPOT_EVERY_S = 0.5;
const TEXT_UNSTUCK = 'Me débloquer';
/** Textes nouveaux (à valider par le parent). */
const TEXT_SLEPT = 'Tu as bien dormi !';
const TEXT_SLEPT_GOLEMS = 'Tu as bien dormi ! Tes golems sont en pleine forme.';
const SLEEP_FADE_MS = 1800;
/** Pause demandée avec le bouton (texte nouveau, à valider). */
const TEXT_PAUSE = 'Le jeu est en pause. Tes golems t’attendent !';
/** Rappel de pause : « Continuer » après 10 s (SPEC.md § 11). */
const PAUSE_WAIT_S = 10;
const TEXT_SAVED = 'Bonne nuit ! Partie enregistrée.';
/** Enregistrement automatique hors combat (SPEC.md § 13). */
const AUTOSAVE_EVERY_S = 60;
/** L'outro de la fin du jeu, suivie du générique. */
const FINAL_OUTRO = 'O6';
/** Un bruit de pas tous les 1,7 bloc parcourus au sol. */
const STEP_EVERY = 1.7;
/** Voyage par une arche (textes nouveaux, à valider par le parent). */
const TEXT_ARCH_ASLEEP = 'L’arche dort encore. Lumibloc te dira quand elle s’éveillera.';
const TEXT_ARCH_WHERE = 'Où veux-tu aller ?';
const TEXT_ARCH_STAY = 'Rester ici';
const TRAVEL_FADE_MS = 900;

export type GameMode = 'title' | 'play' | 'cinematic' | 'combat';

export interface GameOptions {
  debug: boolean;
  /** Mode test : raccourcit les attentes (1 = temps normal). */
  timeScale?: number;
  /** Mode test : part des PV des boss (combats plus courts). */
  bossHpScale?: number;
  /** Enregistrer la partie dans IndexedDB (désactivé par défaut en mode test). */
  persist?: boolean;
}

/** Boucle de jeu : rendu, héros, caméra, commandes, vie du biome. */
export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly input = new InputState();
  readonly hero: HeroState;
  /** Biome chargé (un seul en mémoire). */
  layout: WorldLayout;
  readonly interactions = new Interactions();
  life: WorldLife;
  private readonly rig: CameraRig;
  private readonly heroModel = new HeroModel();
  private readonly shadow: THREE.Mesh;
  private biome: BiomeScene;
  private readonly sparks: Sparks;
  private readonly controls: TouchControls;
  private readonly hud: Hud;
  private readonly labels: WorldLabels;
  private readonly dialog: DialogBubble;
  private readonly fade = el('div', { className: 'soft-fade hidden', testId: 'ko-fade' });
  private readonly sleepFade = el('div', { className: 'sleep-fade hidden', testId: 'sleep-fade' }, [el('span', { className: 'sleep-zzz', text: 'Zzz…' })]);
  private readonly debug: DebugOverlay;
  private readonly forceDebug: boolean;
  /** Temps de jeu depuis la dernière pause (rappel de pause, SPEC.md § 11). */
  private sincePause = 0;
  private readonly solid: SolidFn;
  private readonly hemi: THREE.HemisphereLight;
  private readonly sun: THREE.DirectionalLight;
  private readonly director: CinematicDirector;
  private readonly atlas: THREE.Texture;
  private lastTime = 0;
  private attackCooldown = 0;
  private mode: GameMode = 'play';
  /** Le héros a été placé dans sa maison (première entrée en jeu). */
  private entered = false;
  /** Énigme ou éclosion en cours : le héros ne bouge plus. */
  private locked = false;
  /** Le monde est à l'écran (ni cinématique, ni combat). */
  private inWorld = true;
  /** Lecture d'un texte d'histoire (cinématique et questions), fournie par l'application. */
  onStory: ((id: string) => Promise<void>) | null = null;
  /** Combat d'arène en cours. */
  fight: ArenaFight | null = null;
  private readonly timeScale: number;
  private readonly bossHpScale: number | undefined;
  private readonly persist: boolean;
  /** Temps depuis le dernier enregistrement automatique. */
  private sinceSave = 0;
  private saving = false;
  private saveAgain = false;
  /** Menu ouvert (journal) ou transition : le monde ne bouge plus. */
  private paused = false;
  private readonly tipWorld = new THREE.Vector3();
  private stuckTime = 0;
  private unstuckOffer = 0;
  private safeTimer = 0;
  /** Dernier endroit où le héros marchait librement (retour pour « Me débloquer »). */
  private lastSafe: { x: number; z: number } | null = null;
  /** Secousse de l'écran en cours (le Grand Ver surgit…), en secondes. */
  private shakeTime = 0;
  /** Distance parcourue depuis le dernier bruit de pas. */
  private stride = 0;
  frameCount = 0;

  constructor(
    container: HTMLElement,
    private readonly uiLayer: HTMLElement,
    readonly state: GameState,
    private readonly rng: Rng,
    options: GameOptions,
  ) {
    this.timeScale = options.timeScale ?? 1;
    this.bossHpScale = options.bossHpScale;
    this.persist = options.persist ?? false;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color();
    this.scene.fog = new THREE.Fog(0xffffff, FOG_NEAR, FOG_FAR);
    this.hemi = new THREE.HemisphereLight(0xeaf6ff, 0x7a6a50, 1.9);
    this.sun = new THREE.DirectionalLight(0xfff4e0, 1.6);
    this.sun.position.set(0.5, 1, 0.35);
    this.scene.add(this.hemi, this.sun);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, FOG_FAR + 20);

    this.layout = buildLayout(state.biome);
    this.solid = (x, y, z) => this.layout.world.solidAt(x, y, z);
    this.atlas = createAtlasTexture(paintAtlas());
    this.biome = new BiomeScene(this.layout, this.atlas);
    this.scene.add(this.biome.group);
    this.applySky();

    // Le héros attend devant l'Académie (écran titre), puis se réveille chez lui au début de la partie.
    const titleSpot = this.layout.id === 'prairie' ? (this.layout as PrairieLayout).titleSpot : this.layout.spawn;
    const spawnYaw = this.layout.spawnYaw;
    this.hero = createHero(titleSpot.x, titleSpot.y, titleSpot.z, spawnYaw);
    this.scene.add(this.heroModel.root);
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 16).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
    );
    this.scene.add(this.shadow);
    this.rig = new CameraRig(this.camera, spawnYaw);

    this.sparks = new Sparks();
    this.scene.add(this.sparks.group);

    // Interface : étiquettes du monde, commandes, HUD, dialogues.
    this.labels = new WorldLabels(this.camera);
    this.controls = new TouchControls(this.input);
    this.hud = new Hud({
      journal: () => void this.showJournal(),
      golems: () => void this.showGolems(),
      encyclopedia: () => void this.showEncyclopedia(),
      pause: () => void this.showPause(false),
    });
    this.dialog = new DialogBubble(() => this.state.playerName);
    uiLayer.append(this.labels.root, this.controls.root, this.hud.root, this.dialog.root, this.fade, this.sleepFade);
    // Compteur de FPS : toujours présent, affiché en mode test ou si le parent l'active.
    this.forceDebug = options.debug;
    this.debug = new DebugOverlay();
    uiLayer.appendChild(this.debug.root);
    attachKeyboard(this.input, window);

    this.life = this.createLife(this.layout);
    this.scene.add(this.life.group);
    this.syncStarTrial();

    // Le metteur en scène suit le biome chargé (monde et collisions).
    const game = this;
    this.director = new CinematicDirector({
      scene: this.scene,
      camera: this.camera,
      get world() {
        return game.layout.world;
      },
      hemi: this.hemi,
      sun: this.sun,
      sparks: this.sparks,
      solid: this.solid,
      uiLayer,
      buildSet: (id) => {
        // Décors de cinématique : le Volcan d'Ombre (O6), ou un autre biome le temps d'un plan (T2…).
        const layout = id === 'volcano' ? { world: buildVolcanoSet().world, decorations: [] } : buildLayout(id);
        const scene = new BiomeScene(layout, this.atlas);
        return { world: layout.world, group: scene.group, dispose: () => scene.dispose() };
      },
      showWorld: (visible) => {
        this.biome.group.visible = visible;
      },
    });

    window.addEventListener('resize', () => this.resize());
    // Appli fermée ou mise en arrière-plan : on enregistre tout de suite.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void this.save();
    });
    window.addEventListener('pagehide', () => void this.save());
  }

  get fps(): number {
    return this.debug?.fps ?? 0;
  }

  get drawCalls(): number {
    return this.renderer.info.render.calls;
  }

  start(): void {
    this.lastTime = performance.now();
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  /**
   * « title » : la caméra tourne lentement, commandes masquées. « play » : le joueur contrôle le héros.
   * « cinematic » : le metteur en scène prend la caméra ; le héros et la vie du biome sont cachés.
   */
  setMode(mode: GameMode): void {
    this.mode = mode;
    const playing = mode === 'play';
    for (const node of [this.controls.root, this.hud.root, this.labels.root]) node.classList.toggle('hidden', !playing);
    if (playing && !this.entered) {
      // Première entrée en jeu : à la maison, ou au dernier point de retour d'une partie enregistrée.
      this.entered = true;
      const p = this.life.respawnPoint();
      this.teleport(p.x, p.z, this.layout.spawnYaw);
    }
    if (mode === 'title') audio.music('storyDay');
    else if (playing) audio.music(BIOME_MUSIC[this.layout.id]);
    this.life.setArchOpen(this.travelChoices().length > 0 || pendingStory(this.state) !== null);
    const inWorld = mode !== 'cinematic' && mode !== 'combat';
    // Le compteur de FPS (mode test) ne doit pas cacher les sous-titres.
    this.inWorld = inWorld;
    this.applySettings();
    for (const obj of [this.heroModel.root, this.shadow, this.life.group]) obj.visible = inWorld;
    if (!playing) this.dialog.close();
    this.input.stickX = this.input.stickY = 0;
    this.input.jumpHeld = false;
  }

  /** Combat d'arène : la caméra passe de côté dans l'arène, puis on revient devant le gong. */
  /**
   * Enregistre la partie (SPEC.md § 13). Les demandes rapprochées sont regroupées : une seule
   * écriture à la fois, et une dernière si l'état a encore changé entre-temps.
   */
  save(): Promise<boolean> {
    this.sinceSave = 0;
    if (!this.persist) return Promise.resolve(false);
    if (this.saving) {
      this.saveAgain = true;
      return Promise.resolve(true);
    }
    this.saving = true;
    return saveGame(this.state).then((ok) => {
      this.saving = false;
      if (this.saveAgain) {
        this.saveAgain = false;
        void this.save();
      }
      return ok;
    });
  }

  /**
   * Combat au tour par tour, à l'arène (gong) ou contre le Roi Slime (marais). Contre le boss,
   * on peut réessayer tout de suite ; la victoire lance l'outro O1 et pose le trophée.
   */
  private async startFight(kind: 'arena' | 'boss'): Promise<void> {
    const setup = this.life.fightSetup(kind);
    if (this.fight || this.paused || !setup) return;
    this.dialog.close();
    this.setMode('combat');
    audio.music(kind === 'boss' ? (setup.boss === 'dragon' ? 'dragon' : 'boss') : 'arena');
    let result: 'won' | 'lost' | 'retry';
    do {
      this.fight = new ArenaFight({
        scene: this.scene,
        camera: this.camera,
        uiLayer: this.uiLayer,
        state: this.state,
        rng: this.rng,
        sparks: this.sparks,
        plan: setup.plan,
        kind,
        phase: setup.phase,
        boss: setup.boss,
        timeScale: this.timeScale,
        bossHpScale: this.bossHpScale,
      });
      result = await this.fight.run();
      this.fight.dispose();
      this.fight = null;
    } while (result === 'retry');
    void this.save();

    if (kind === 'boss' && result === 'won') {
      if (setup.outro) await this.playOutro(setup.outro);
      if (setup.nextChapter) this.state.chapter = Math.max(this.state.chapter, setup.nextChapter);
      // Fin du jeu (après O6 et le générique) : retour à la Prairie, tout reste ouvert.
      if (setup.boss === 'dragon') {
        await this.travel('prairie');
        this.setMode('play');
        this.hud.showToast(TEXT_GAME_DONE, 6);
        void this.save();
        return;
      }
      // Dans la Prairie, on se réveille chez soi ; ailleurs, on revient près du repaire.
      const home = this.prairie ? this.prairie.home.wakePoint() : { ...setup.back, y: 0 };
      this.teleport(home.x, home.z, this.layout.spawnYaw);
      this.life.sim.recoverAt(this.hero.x, this.hero.y, this.hero.z);
      this.setMode('play');
      this.hud.showToast(TEXT_TROPHY, 4);
      if (Object.values(this.state.items).some((n) => n > 0)) itemTip(this.state, this.dialog);
      void this.save();
      return;
    }
    this.teleport(setup.back.x, setup.back.z, 0);
    this.life.sim.recoverAt(this.hero.x, this.hero.y, this.hero.z);
    this.setMode('play');
  }

  /**
   * Outro de fin de phase (cinématique, sans questions) ; elle rejoint « Revoir l'histoire ».
   * L'outro finale O6 est suivie du générique. record = false : aperçu du menu parent, hors journal.
   */
  async playOutro(id: string, startShot = 0, record = true): Promise<void> {
    const outro = CONTENT.outros.find((o) => o.id === id);
    const script = OUTRO_CINEMATICS[id];
    if (!outro || !script) return;
    await this.playCinematic(script, outroCaptions(outro, script), { skippable: true, timeScale: this.timeScale, startShot });
    if (record && !this.state.storiesRead.includes(id)) this.state.storiesRead.push(id);
    if (id === FINAL_OUTRO) {
      audio.music('finale');
      await showCredits(this.uiLayer, this.state, this.timeScale);
    }
  }

  /** Joue une cinématique, puis revient au mode précédent. */
  async playCinematic(script: CinematicScript, captions: string[], options: { skippable: boolean; timeScale: number; startShot?: number }): Promise<void> {
    const previous = this.mode;
    // La cinématique se joue dans son biome : on le charge le temps de la regarder (un seul biome en mémoire).
    const here = this.layout.id;
    const there = script.biome ?? 'prairie';
    if (there !== here) this.loadBiome(there);
    this.setMode('cinematic');
    await this.director.play(script, { captions, playerName: this.state.playerName, ...options });
    if (there !== here) this.loadBiome(here);
    this.setMode(previous);
  }

  /** La vie de la Prairie, si c'est le biome chargé. */
  get prairie(): PrairieLife | null {
    return this.life instanceof PrairieLife ? this.life : null;
  }

  // ---------- Biomes ----------

  private createLife(layout: WorldLayout): WorldLife {
    const hooks: WorldHooks = {
      toast: (t) => this.hud.showToast(t),
      dialog: this.dialog,
      labels: this.labels,
      sparks: this.sparks,
      onAllKO: () => this.recoverFromKO(),
      onProgress: () => void this.save(),
      onArch: () => void this.useArch(),
    };
    // Énigmes, éclosion et portes des sanctuaires (communs à tous les biomes).
    const sanctuary = {
      rebuild: (cells: Cell[]) => this.biome.rebuildCells(cells),
      ask: (view: QuestionView) => askQuestion(this.uiLayer, view, this.state.playerName),
      reveal: (view: QuestionView, chosen: number) => revealAnswer(this.uiLayer, view, chosen, this.state.playerName),
      chooseGolem: (choices: readonly GolemSpecies[]) => chooseGolem(this.uiLayer, choices),
      askNickname: (species: GolemSpecies) => askNickname(this.uiLayer, species),
      lock: (locked: boolean) => this.lock(locked),
      placeHero: (x: number, z: number, facing: number) => this.teleport(x, z, facing),
      moveHero: (x: number, z: number) => this.teleport(x, z),
      choose: (text: string, labels: string[], testId: string) => askChoice(this.uiLayer, text, labels, this.state.playerName, testId),
      onProgress: () => void this.save(),
    };
    const fights = { onFight: () => void this.startFight('arena'), onBossFight: () => void this.startFight('boss') };
    if (layout.id === 'foret') return new ForestLife(layout as ForestLayout, this.state, this.atlas, this.solid, this.rng, this.interactions, { ...hooks, ...fights, sanctuary });
    if (layout.id === 'volcan') return new VolcanLife(layout as VolcanLayout, this.state, this.atlas, this.solid, this.rng, this.interactions, { ...hooks, onBossFight: fights.onBossFight, moveHero: (x: number, z: number) => this.teleport(x, z) });
    if (layout.id === 'ciel') return new CielLife(layout as CielLayout, this.state, this.atlas, this.solid, this.rng, this.interactions, { ...hooks, ...fights, sanctuary, moveHero: (x: number, z: number) => this.teleport(x, z) });
    if (layout.id === 'givre') return new GivreLife(layout as GivreLayout, this.state, this.atlas, this.solid, this.rng, this.interactions, { ...hooks, ...fights, sanctuary });
    if (layout.id === 'desert') return new DesertLife(layout as DesertLayout, this.state, this.atlas, this.solid, this.rng, this.interactions, { ...hooks, ...fights, sanctuary, shake: () => (this.shakeTime = 1.2) });
    return new PrairieLife(layout as PrairieLayout, this.state, this.atlas, this.solid, this.rng, this.interactions, {
      ...hooks,
      onSleep: () => this.sleep(),
      onFight: () => void this.startFight('arena'),
      onBossFight: () => void this.startFight('boss'),
      sanctuary,
    });
  }

  /** Remplace le biome chargé : l'ancien est libéré (SPEC § 2, un seul biome en mémoire). */
  private loadBiome(id: BiomeId): void {
    if (this.layout.id === id) return;
    this.dialog.close();
    this.life.dispose();
    this.biome.dispose();
    this.interactions.clear();
    this.layout = buildLayout(id);
    this.biome = new BiomeScene(this.layout, this.atlas);
    this.scene.add(this.biome.group);
    this.life = this.createLife(this.layout);
    this.scene.add(this.life.group);
    this.syncStarTrial();
    this.applySky();
    this.lastSafe = null;
  }

  private applySky(): void {
    (this.scene.background as THREE.Color).setHex(this.layout.sky);
    (this.scene.fog as THREE.Fog).color.setHex(this.layout.sky);
  }

  /** Biomes où l'arche peut mener depuis ici. */
  private travelChoices(): BiomeId[] {
    return unlockedBiomes(this.state).filter((id) => id !== this.layout.id);
  }

  /** L'arche : choisir une destination parmi les biomes débloqués. */
  private async useArch(): Promise<void> {
    if (this.paused) return;
    // Nouveau chapitre : l'arche s'éveille en racontant l'histoire du biome (lecture et questions), puis y mène.
    const next = pendingStory(this.state);
    if (next && this.onStory) {
      this.paused = true;
      this.input.stickX = this.input.stickY = 0;
      await this.onStory(next.story);
      this.paused = false;
      if (this.state.storiesRead.includes(next.story)) await this.travel(next.biome);
      return;
    }
    const choices = this.travelChoices();
    if (!choices.length) {
      this.hud.showToast(TEXT_ARCH_ASLEEP, 3);
      return;
    }
    this.paused = true;
    this.input.stickX = this.input.stickY = 0;
    const pick = await askChoice(this.uiLayer, TEXT_ARCH_WHERE, [...choices.map((id) => BIOME_NAMES[id]), TEXT_ARCH_STAY], this.state.playerName, 'arch-choice');
    this.paused = false;
    if (pick < choices.length) await this.travel(choices[pick]);
  }

  /** Voyage : fondu, nouveau biome, arrivée devant son arche ; la partie est enregistrée. */
  async travel(to: BiomeId): Promise<void> {
    this.paused = true;
    this.fade.classList.remove('hidden');
    audio.sfx('door');
    await new Promise((r) => setTimeout(r, TRAVEL_FADE_MS * this.timeScale));
    this.loadBiome(to);
    this.state.biome = to;
    const a = this.layout.arrival;
    this.teleport(a.x, a.z, a.facing);
    this.life.sim.recoverAt(this.hero.x, this.hero.y, this.hero.z);
    this.setMode('play');
    this.fade.classList.add('hidden');
    this.paused = false;
    void this.save();
  }

  /** Mode test : place le héros à une hauteur donnée (plateformes des arbres). */
  teleportAt(x: number, y: number, z: number): void {
    this.hero.x = x;
    this.hero.y = y;
    this.hero.z = z;
    this.hero.vy = 0;
  }

  /** Mode test : place le héros (et ses golems suivront). */
  teleport(x: number, z: number, facing?: number): void {
    this.hero.x = x;
    this.hero.z = z;
    this.hero.y = this.layout.world.standY(Math.floor(x), Math.floor(z));
    this.hero.vy = 0;
    if (facing !== undefined) {
      this.hero.facing = facing;
      this.rig.yaw = facing;
    }
  }

  /**
   * Séquence où le héros ne bouge plus (énigme, éclosion) : commandes masquées, le monde continue
   * de s'animer.
   */
  private lock(locked: boolean): void {
    this.locked = locked;
    this.input.stickX = this.input.stickY = 0;
    this.input.jumpHeld = false;
    this.controls.root.classList.toggle('hidden', locked || this.mode !== 'play');
  }

  /** Objectif actif du journal et de la boussole : chaque biome le donne. */
  private objective(): Objective {
    const goal = this.life.objective(this.hero);
    // Aventure terminée : on va où l'on veut.
    if (this.state.trophies.includes('dragon') && this.layout.id !== 'volcan') return { ...goal, text: OBJECTIVE_GAME_DONE, target: this.layout.arch, current: [{ text: OBJECTIVE_GAME_DONE, active: true }] };
    // Les cinq éclats sont réunis : l'Épreuve des Étoiles attend au sommet de l'Académie.
    if (this.starTrialPending) {
      const target = this.prairie ? (this.layout as PrairieLayout).academyDoor : this.layout.arch;
      return { ...goal, text: OBJECTIVE_STAR_TRIAL, target, current: [{ text: OBJECTIVE_STAR_TRIAL, active: true }, ...goal.current.filter((c) => c.text !== OBJECTIVE_STAR_TRIAL).map((c) => ({ ...c, active: false }))] };
    }
    return goal;
  }

  /** L'Épreuve des Étoiles attend : les cinq éclats sont là, et aucun golem n'est encore Galaxie. */
  get starTrialPending(): boolean {
    return this.state.shards >= 5 && !this.state.golems.some((g) => g.species === 'galaxie');
  }

  /** Dans la Prairie, la Pierre-Étoile de l'Épreuve devant la porte de l'Académie. */
  private syncStarTrial(): void {
    this.interactions.remove('star-trial');
    if (this.layout.id !== 'prairie' || !this.starTrialPending) return;
    const door = (this.layout as PrairieLayout).academyDoor;
    this.interactions.add({ id: 'star-trial', x: door.x, y: door.y, z: door.z + 3, radius: 2.6, label: TEXT_STAR_TRIAL, action: () => void this.starTrial() });
  }

  /** L'Épreuve des Étoiles, puis la cérémonie de la Poussière d'étoile (O5) et le Golem Galaxie. */
  private async starTrial(): Promise<void> {
    if (this.paused || this.fight) return;
    this.paused = true;
    this.input.stickX = this.input.stickY = 0;
    this.dialog.close();
    audio.duck(true);
    const born = await runStarCeremony({
      layer: this.uiLayer,
      state: this.state,
      rng: this.rng,
      playOutro: (id) => this.playOutro(id),
      toast: (text) => this.hud.showToast(text, 4),
      save: () => void this.save(),
    });
    audio.duck(false);
    this.paused = false;
    if (born) this.syncStarTrial();
  }

  /** Réglages du menu parent : affichage des FPS, volumes. */
  applySettings(): void {
    this.debug.root.classList.toggle('hidden', !this.inWorld || !(this.forceDebug || this.state.settings.showFps));
    audio.setVolumes(this.state.settings.musicVolume, this.state.settings.sfxVolume);
  }

  /**
   * Pause : par le bouton (on reprend tout de suite), ou rappel de Lumibloc après X minutes de jeu,
   * au premier moment calme (« Continuer » après 10 s).
   */
  private async showPause(reminder: boolean): Promise<void> {
    if (this.paused) return;
    this.paused = true;
    this.input.stickX = this.input.stickY = 0;
    this.dialog.close();
    const text = reminder ? CONTENT.lumibloc.pause : TEXT_PAUSE;
    audio.duck(true);
    await openPause(this.uiLayer, text, this.state.playerName, reminder ? PAUSE_WAIT_S * this.timeScale : 0, reminder ? 'pause-reminder' : 'pause');
    this.sincePause = 0;
    audio.duck(false);
    this.paused = false;
  }

  /** Écran Golems : stats, attaques, repas. La réplique « Repas » de Lumibloc s'affiche la première fois. */
  private async showGolems(): Promise<void> {
    if (this.paused) return;
    this.paused = true;
    this.input.stickX = this.input.stickY = 0;
    const seen = this.state.tutorialsSeen;
    const tip = seen.includes('meal') || !this.state.golems.length ? undefined : CONTENT.lumibloc.meal;
    if (tip) seen.push('meal');
    audio.duck(true);
    await openGolems(this.uiLayer, this.state, () => void this.save(), tip, () => void this.save());
    audio.duck(false);
    this.paused = false;
  }

  private async showEncyclopedia(): Promise<void> {
    if (this.paused) return;
    this.paused = true;
    this.input.stickX = this.input.stickY = 0;
    audio.duck(true);
    await openEncyclopedia(this.uiLayer, this.state);
    audio.duck(false);
    this.paused = false;
  }

  private async showJournal(): Promise<void> {
    if (this.paused) return;
    this.paused = true;
    this.input.stickX = this.input.stickY = 0;
    const seen = (id: string): boolean => this.state.storiesRead.includes(id);
    const replays = [
      ...CONTENT.stories.filter((s) => seen(s.id) && CINEMATICS[s.id]).map((s) => ({ id: s.id, title: s.title })),
      ...CONTENT.outros.filter((o) => seen(o.id) && OUTRO_CINEMATICS[o.id]).map((o) => ({ id: o.id, title: o.when.charAt(0).toUpperCase() + o.when.slice(1) })),
    ];
    const goal = this.objective();
    audio.duck(true);
    const replay = await openJournal(this.uiLayer, goal.current, goal.done, JOURNAL_NO_DONE, this.state.playerName, replays);
    audio.duck(false);
    const story = CONTENT.stories.find((s) => s.id === replay);
    if (story) {
      // Histoire déjà vue : on peut la passer.
      const script = CINEMATICS[story.id];
      await this.playCinematic(script, storyCaptions(story, script), { skippable: true, timeScale: 1 });
    } else if (replay) await this.playOutro(replay);
    this.paused = false;
  }

  /** Le héros dort : écran de nuit, golems soignés, la maison devient le point de retour. */
  private sleep(): void {
    const prairie = this.prairie;
    if (this.paused || !prairie) return;
    this.paused = true;
    this.input.stickX = this.input.stickY = 0;
    this.sleepFade.classList.remove('hidden');
    audio.music(null);
    setTimeout(() => {
      audio.music('prairie');
      audio.sfx('chime');
      const p = prairie.home.wakePoint();
      this.teleport(p.x, p.z, this.layout.spawnYaw);
      this.life.sim.recoverAt(p.x, p.y, p.z);
      this.state.lastLantern = 'home';
      this.sleepFade.classList.add('hidden');
      this.paused = false;
      // Dormir enregistre la partie (SPEC.md § 18).
      void this.save().then((ok) => this.hud.showToast(ok ? TEXT_SAVED : this.state.golems.length ? TEXT_SLEPT_GOLEMS : TEXT_SLEPT, 3));
    }, SLEEP_FADE_MS);
  }

  /** Tous les golems sont K.O. : écran doux, retour à la dernière lanterne, golems soignés. */
  private recoverFromKO(): void {
    this.paused = true;
    this.fade.classList.remove('hidden');
    audio.sfx('defeat');
    setTimeout(() => {
      const p = this.life.respawnPoint();
      this.teleport(p.x, p.z);
      this.life.sim.recoverAt(this.hero.x, this.hero.y, this.hero.z);
      this.fade.classList.add('hidden');
      this.paused = false;
    }, KO_FADE_MS);
  }

  private resize(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  private frame(time: number): void {
    const dt = Math.min(0.05, Math.max(0, (time - this.lastTime) / 1000));
    this.lastTime = time;
    this.labels.begin();
    if (this.director.active) this.director.update(dt);
    else if (this.fight) this.fight.update(dt);
    else this.update(this.paused ? 0 : dt);
    this.renderer.render(this.scene, this.camera);
    this.labels.end(dt);
    this.debug?.update(dt, this.renderer);
    this.frameCount++;
  }

  private update(dt: number): void {
    const playing = this.mode === 'play' && !this.paused && !this.locked;
    if (this.mode === 'play' && dt > 0) {
      this.state.playTimeS += dt;
      this.sinceSave += dt;
      this.sincePause += dt;
      if (this.sinceSave >= AUTOSAVE_EVERY_S && !this.fight) void this.save();
      // Rappel de pause au premier moment calme : pas de combat, de question ni de cinématique.
      const s = this.state.settings;
      if (s.pauseReminder && this.sincePause >= s.pauseMinutes * 60 && !this.locked && !this.fight && !this.dialog.isOpen) void this.showPause(true);
    }
    const look = this.input.consumeLook();
    if (playing) this.rig.rotate(-look.dx * LOOK_YAW_PER_PX, look.dy * LOOK_PITCH_PER_PX);
    else if (this.mode === 'title') this.rig.rotate(dt * TITLE_ORBIT_SPEED, 0);

    const move = playing ? this.input.move() : { x: 0, y: 0 };
    const f = this.rig.forward();
    // Droite = avant tourné de 90° dans le sens horaire vu du dessus.
    const intent = {
      moveX: f.x * move.y - f.z * move.x,
      moveZ: f.z * move.y + f.x * move.x,
      jump: playing && this.input.jumpHeld,
    };
    const world = this.layout.world;
    const h = this.hero;
    const inWater = world.get(Math.floor(h.x), Math.floor(h.y + 0.3), Math.floor(h.z)) === Block.Water;
    const wasOnGround = h.onGround;
    stepHero(h, intent, dt, this.solid, inWater);
    if (h.onGround && !inWater) {
      this.stride += h.speed * dt;
      if (this.stride >= STEP_EVERY || !wasOnGround) {
        this.stride = 0;
        audio.sfx('step');
      }
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.input.consumeAttack() && playing && this.attackCooldown === 0) this.castSpark();

    this.heroModel.root.position.set(h.x, h.y, h.z);
    this.heroModel.root.rotation.y = h.facing;
    this.heroModel.update(dt, h.speed, h.onGround);
    this.updateShadow();
    this.sparks.update(dt, this.solid, (x, y, z) => this.life.hitTest(x, y, z));

    this.life.update(dt, h, this.camera, this.mode === 'play' && dt > 0, playing);

    this.watchStuck(dt, playing, Math.hypot(move.x, move.y), inWater);
    const near = playing ? this.interactions.nearest(h.x, h.y, h.z) : null;
    const offerUnstuck = playing && !near && this.unstuckOffer > 0;
    this.controls.setInteract(near ? near.label : offerUnstuck ? TEXT_UNSTUCK : null);
    if (this.input.consumeInteract()) {
      if (near) near.action();
      else if (offerUnstuck) this.unstuck();
    }

    this.hud.setStats(this.state.food, this.state.shards);
    this.hud.setGolems(this.state.golems, (id) => this.life.isGolemKo(id));
    const { target } = this.objective();
    this.hud.setCompass(compassRotation(this.rig.yaw, h.x, h.z, target.x, target.z));
    this.hud.update(dt);
    this.rig.update(dt, h.x, h.y, h.z, this.solid);
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      const k = 0.25 * Math.min(1, this.shakeTime * 2);
      this.camera.position.x += (Math.random() - 0.5) * k;
      this.camera.position.y += (Math.random() - 0.5) * k;
    }
  }

  /**
   * Filet de sécurité : mémorise les endroits où le héros marche librement, et propose
   * « Me débloquer » s'il pousse le joystick sans avancer pendant quelques secondes.
   */
  private watchStuck(dt: number, playing: boolean, push: number, inWater: boolean): void {
    if (!playing) return;
    const h = this.hero;
    if (h.onGround && !inWater && h.speed > 2) {
      this.safeTimer += dt;
      if (this.safeTimer >= SAFE_SPOT_EVERY_S) {
        this.safeTimer = 0;
        this.lastSafe = { x: h.x, z: h.z };
      }
    }
    if (push > 0.5 && h.speed < 0.3) this.stuckTime += dt;
    else if (h.speed > 1) this.stuckTime = 0;
    if (this.stuckTime > STUCK_HELP_S) {
      this.unstuckOffer = UNSTUCK_OFFER_S;
      this.stuckTime = 0;
    }
    this.unstuckOffer = Math.max(0, this.unstuckOffer - dt);
  }

  private unstuck(): void {
    const p = this.lastSafe ?? this.layout.spawn;
    this.teleport(p.x, p.z);
    this.sparks.burst(this.hero.x, this.hero.y + 1, this.hero.z, 0x8ff0ff, 16);
    audio.sfx('pop');
    this.unstuckOffer = 0;
    this.stuckTime = 0;
  }

  /** Coup de baguette : étincelle vers la cible la plus proche devant le héros (aide à la visée). */
  private castSpark(): void {
    const h = this.hero;
    this.attackCooldown = ATTACK_COOLDOWN;
    const target = this.life.aim(h);
    if (target) h.facing = Math.atan2(-(target.x - h.x), -(target.z - h.z));
    this.heroModel.root.rotation.y = h.facing;
    this.heroModel.playAttack();
    audio.sfx('spark');
    this.heroModel.root.updateMatrixWorld(true);
    this.heroModel.wandTip.getWorldPosition(this.tipWorld);
    const tip = this.tipWorld;
    const ox = h.x - Math.sin(h.facing) * 0.5;
    const oz = h.z - Math.cos(h.facing) * 0.5;
    if (target) this.sparks.fire(ox, tip.y, oz, target.x - ox, target.y - tip.y, target.z - oz);
    else this.sparks.fire(ox, tip.y, oz, -Math.sin(h.facing), -0.05, -Math.cos(h.facing));
  }

  private updateShadow(): void {
    const h = this.hero;
    let y = Math.floor(h.y + 0.01);
    while (y > 0 && !this.solid(Math.floor(h.x), y - 1, Math.floor(h.z))) y--;
    this.shadow.position.set(h.x, y + 0.02, h.z);
    const k = Math.max(0.4, 1 - (h.y - y) * 0.15);
    this.shadow.scale.set(k, 1, k);
  }
}
