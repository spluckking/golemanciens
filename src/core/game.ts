import * as THREE from 'three';
import { createHero, stepHero, type HeroState } from '../entities/heroController';
import { HeroModel } from '../entities/heroModel';
import { Sparks } from '../entities/sparks';
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

export type GameMode = 'title' | 'play';

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
  private lastTime = 0;
  private attackCooldown = 0;
  private mode: GameMode = 'play';
  /** Menu ouvert (journal) ou transition : le monde ne bouge plus. */
  private paused = false;
  private readonly tipWorld = new THREE.Vector3();
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
    this.scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x7a6a50, 1.9));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.6);
    sun.position.set(0.5, 1, 0.35);
    this.scene.add(sun);

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

  /** « title » : la caméra tourne lentement, commandes masquées. « play » : le joueur contrôle le héros. */
  setMode(mode: GameMode): void {
    this.mode = mode;
    const playing = mode === 'play';
    for (const node of [this.controls.root, this.hud.root, this.labels.root]) node.classList.toggle('hidden', !playing);
    if (!playing) this.dialog.close();
    this.input.stickX = this.input.stickY = 0;
    this.input.jumpHeld = false;
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
    await openJournal(this.uiLayer, [{ text: OBJECTIVE_FIND_EGG, active: true }], [], JOURNAL_NO_DONE, this.state.playerName);
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
    this.update(this.paused ? 0 : dt);
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

    const near = playing ? this.interactions.nearest(h.x, h.y, h.z) : null;
    this.controls.setInteract(near ? near.label : null);
    if (this.input.consumeInteract() && near) near.action();

    this.hud.setStats(this.state.food, this.state.shards);
    this.hud.setGolems(this.state.golems, (id) => this.life.isGolemKo(id));
    const target = this.layout.landmarks.sanctuary;
    this.hud.setCompass(compassRotation(this.rig.yaw, h.x, h.z, target.x, target.z));
    this.hud.update(dt);
    this.rig.update(dt, h.x, h.y, h.z, this.solid);
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
