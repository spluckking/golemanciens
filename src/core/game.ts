import * as THREE from 'three';
import { createHero, stepHero, type HeroState } from '../entities/heroController';
import { HeroModel } from '../entities/heroModel';
import { Sparks } from '../entities/sparks';
import { CONTENT } from '../data/content';
import { CINEMATICS, storyCaptions } from '../story/cinematics';
import { CinematicDirector, type CinematicScript } from '../story/cinematics/director';
import { JOURNAL_NO_DONE, OBJECTIVE_FIND_EGG } from '../story/dialogues';
import { DebugOverlay } from '../ui/debugOverlay';
import { DialogBubble } from '../ui/dialog';
import { el } from '../ui/dom';
import { Hud } from '../ui/hud';
import { openJournal } from '../ui/journal';
import { TouchControls } from '../ui/touchControls';
import { WorldLabels } from '../ui/worldLabels';
import { paintAtlas } from '../world/atlas';
import { BiomeScene } from '../world/biomeScene';
import { Block } from '../world/blocks';
import { generatePrairie, type BiomeLayout } from '../world/prairie';
import { createAtlasTexture } from '../world/voxelMaterial';
import { BiomeLife } from './biomeLife';
import { CameraRig } from './cameraRig';
import { compassRotation } from './compass';
import type { GameState } from './gameState';
import { InputState, attachKeyboard } from './input';
import { Interactions } from './interactions';
import type { SolidFn } from './physics';
import type { Rng } from './rng';

const MAX_PIXEL_RATIO = 1.5;
const SKY_COLOR = 0x9fd8ff;
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

export type GameMode = 'title' | 'play' | 'cinematic';

export interface GameOptions {
  debug: boolean;
}

/** Boucle de jeu : rendu, héros, caméra, commandes, vie du biome. */
export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly input = new InputState();
  readonly hero: HeroState;
  readonly layout: BiomeLayout;
  readonly interactions = new Interactions();
  readonly life: BiomeLife;
  private readonly rig: CameraRig;
  private readonly heroModel = new HeroModel();
  private readonly shadow: THREE.Mesh;
  private readonly biome: BiomeScene;
  private readonly sparks: Sparks;
  private readonly controls: TouchControls;
  private readonly hud: Hud;
  private readonly labels: WorldLabels;
  private readonly dialog: DialogBubble;
  private readonly fade = el('div', { className: 'soft-fade hidden', testId: 'ko-fade' });
  private readonly debug: DebugOverlay | null;
  private readonly solid: SolidFn;
  private readonly hemi: THREE.HemisphereLight;
  private readonly sun: THREE.DirectionalLight;
  private readonly director: CinematicDirector;
  private lastTime = 0;
  private attackCooldown = 0;
  private mode: GameMode = 'play';
  /** Menu ouvert (journal) ou transition : le monde ne bouge plus. */
  private paused = false;
  private readonly tipWorld = new THREE.Vector3();
  private stuckTime = 0;
  private unstuckOffer = 0;
  private safeTimer = 0;
  /** Dernier endroit où le héros marchait librement (retour pour « Me débloquer »). */
  private lastSafe: { x: number; z: number } | null = null;
  frameCount = 0;

  constructor(
    container: HTMLElement,
    private readonly uiLayer: HTMLElement,
    readonly state: GameState,
    rng: Rng,
    options: GameOptions,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(SKY_COLOR);
    this.scene.fog = new THREE.Fog(SKY_COLOR, FOG_NEAR, FOG_FAR);
    this.hemi = new THREE.HemisphereLight(0xeaf6ff, 0x7a6a50, 1.9);
    this.sun = new THREE.DirectionalLight(0xfff4e0, 1.6);
    this.sun.position.set(0.5, 1, 0.35);
    this.scene.add(this.hemi, this.sun);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, FOG_FAR + 20);

    this.layout = generatePrairie();
    const world = this.layout.world;
    this.solid = (x, y, z) => world.solidAt(x, y, z);
    const atlas = createAtlasTexture(paintAtlas());
    this.biome = new BiomeScene(this.layout, atlas);
    this.scene.add(this.biome.group);

    const { spawn, spawnYaw } = this.layout;
    this.hero = createHero(spawn.x, spawn.y, spawn.z, spawnYaw);
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
    this.hud = new Hud(() => void this.showJournal());
    this.dialog = new DialogBubble(() => this.state.playerName);
    uiLayer.append(this.labels.root, this.controls.root, this.hud.root, this.dialog.root, this.fade);
    this.debug = options.debug ? new DebugOverlay() : null;
    if (this.debug) uiLayer.appendChild(this.debug.root);
    attachKeyboard(this.input, window);

    this.life = new BiomeLife(this.layout, state, atlas, this.solid, rng, this.interactions, {
      toast: (t) => this.hud.showToast(t),
      dialog: this.dialog,
      labels: this.labels,
      sparks: this.sparks,
      onAllKO: () => this.recoverFromKO(),
    });
    this.scene.add(this.life.group);

    this.director = new CinematicDirector({
      scene: this.scene,
      camera: this.camera,
      world,
      hemi: this.hemi,
      sun: this.sun,
      sparks: this.sparks,
      solid: this.solid,
      uiLayer,
    });

    window.addEventListener('resize', () => this.resize());
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
    const inWorld = mode !== 'cinematic';
    for (const obj of [this.heroModel.root, this.shadow, this.life.group]) obj.visible = inWorld;
    if (!playing) this.dialog.close();
    this.input.stickX = this.input.stickY = 0;
    this.input.jumpHeld = false;
  }

  /** Joue une cinématique, puis revient au mode précédent. */
  async playCinematic(script: CinematicScript, captions: string[], options: { skippable: boolean; timeScale: number; startShot?: number }): Promise<void> {
    const previous = this.mode;
    this.setMode('cinematic');
    await this.director.play(script, { captions, playerName: this.state.playerName, ...options });
    this.setMode(previous);
  }

  /** Mode test : place le héros (et ses golems suivront). */
  teleport(x: number, z: number, facing?: number): void {
    this.hero.x = x;
    this.hero.z = z;
    this.hero.y = this.layout.world.surfaceY(Math.floor(x), Math.floor(z));
    this.hero.vy = 0;
    if (facing !== undefined) {
      this.hero.facing = facing;
      this.rig.yaw = facing;
    }
  }

  private async showJournal(): Promise<void> {
    if (this.paused) return;
    this.paused = true;
    this.input.stickX = this.input.stickY = 0;
    const replays = CONTENT.stories.filter((s) => this.state.storiesRead.includes(s.id) && CINEMATICS[s.id]).map((s) => ({ id: s.id, title: s.title }));
    const replay = await openJournal(this.uiLayer, [{ text: OBJECTIVE_FIND_EGG, active: true }], [], JOURNAL_NO_DONE, this.state.playerName, replays);
    const story = CONTENT.stories.find((s) => s.id === replay);
    if (story) {
      // Histoire déjà vue : on peut la passer.
      const script = CINEMATICS[story.id];
      await this.playCinematic(script, storyCaptions(story, script), { skippable: true, timeScale: 1 });
    }
    this.paused = false;
  }

  /** Tous les golems sont K.O. : écran doux, retour à la dernière lanterne, golems soignés. */
  private recoverFromKO(): void {
    this.paused = true;
    this.fade.classList.remove('hidden');
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
    else this.update(this.paused ? 0 : dt);
    this.renderer.render(this.scene, this.camera);
    this.labels.end(dt);
    this.debug?.update(dt, this.renderer);
    this.frameCount++;
  }

  private update(dt: number): void {
    const playing = this.mode === 'play' && !this.paused;
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
    stepHero(h, intent, dt, this.solid, inWater);

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.input.consumeAttack() && playing && this.attackCooldown === 0) this.castSpark();

    this.heroModel.root.position.set(h.x, h.y, h.z);
    this.heroModel.root.rotation.y = h.facing;
    this.heroModel.update(dt, h.speed, h.onGround);
    this.updateShadow();
    this.sparks.update(dt, this.solid, (x, y, z) => this.life.hitTest(x, y, z));

    this.life.update(dt, h, this.camera, this.mode === 'play' && dt > 0);

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
    const target = this.layout.landmarks.sanctuary;
    this.hud.setCompass(compassRotation(this.rig.yaw, h.x, h.z, target.x, target.z));
    this.hud.update(dt);
    this.rig.update(dt, h.x, h.y, h.z, this.solid);
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
    this.unstuckOffer = 0;
    this.stuckTime = 0;
  }

  /** Coup de bâton : étincelle vers la cible la plus proche devant le héros (aide à la visée). */
  private castSpark(): void {
    const h = this.hero;
    this.attackCooldown = ATTACK_COOLDOWN;
    const target = this.life.aim(h);
    if (target) h.facing = Math.atan2(-(target.x - h.x), -(target.z - h.z));
    this.heroModel.root.rotation.y = h.facing;
    this.heroModel.playAttack();
    this.heroModel.root.updateMatrixWorld(true);
    this.heroModel.staffTip.getWorldPosition(this.tipWorld);
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
