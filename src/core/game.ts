import * as THREE from 'three';
import { createHero, stepHero, type HeroState } from '../entities/heroController';
import { HeroModel } from '../entities/heroModel';
import { Sparks } from '../entities/sparks';
import { DebugOverlay } from '../ui/debugOverlay';
import { Hud } from '../ui/hud';
import { TouchControls } from '../ui/touchControls';
import { paintAtlas } from '../world/atlas';
import { BiomeScene } from '../world/biomeScene';
import { Block } from '../world/blocks';
import { generatePrairie, type BiomeLayout } from '../world/prairie';
import { createAtlasTexture } from '../world/voxelMaterial';
import { CameraRig } from './cameraRig';
import { InputState, attachKeyboard } from './input';
import { Interactions } from './interactions';
import type { SolidFn } from './physics';

const MAX_PIXEL_RATIO = 1.5;
const SKY_COLOR = 0x9fd8ff;
const FOG_NEAR = 30;
const FOG_FAR = 64;
const LOOK_YAW_PER_PX = 0.006;
const LOOK_PITCH_PER_PX = 0.004;
const ATTACK_COOLDOWN = 0.35;

export interface GameOptions {
  debug: boolean;
}

/** Boucle de jeu : rendu, héros, caméra, commandes. */
export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly input = new InputState();
  readonly hero: HeroState;
  readonly layout: BiomeLayout;
  readonly interactions = new Interactions();
  private readonly rig: CameraRig;
  private readonly heroModel = new HeroModel();
  private readonly shadow: THREE.Mesh;
  private readonly biome: BiomeScene;
  private readonly sparks: Sparks;
  private readonly controls: TouchControls;
  private readonly hud = new Hud();
  private readonly debug: DebugOverlay | null;
  private readonly solid: SolidFn;
  private lastTime = 0;
  private attackCooldown = 0;
  private readonly tipWorld = new THREE.Vector3();
  frameCount = 0;

  constructor(container: HTMLElement, uiLayer: HTMLElement, options: GameOptions) {
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

    this.controls = new TouchControls(this.input);
    uiLayer.appendChild(this.controls.root);
    uiLayer.appendChild(this.hud.root);
    this.debug = options.debug ? new DebugOverlay() : null;
    if (this.debug) uiLayer.appendChild(this.debug.root);
    attachKeyboard(this.input, window);

    const door = this.layout.academyDoor;
    this.interactions.add({
      id: 'academy-door',
      x: door.x,
      y: door.y,
      z: door.z,
      radius: 3,
      label: 'Lire',
      action: () => this.hud.showToast('Académie des Golémanciens'),
    });

    window.addEventListener('resize', () => this.resize());
  }

  get fps(): number {
    return this.debug?.fps ?? 0;
  }

  start(): void {
    this.lastTime = performance.now();
    this.renderer.setAnimationLoop((t) => this.frame(t));
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
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.debug?.update(dt, this.renderer);
    this.frameCount++;
  }

  private update(dt: number): void {
    const look = this.input.consumeLook();
    this.rig.rotate(-look.dx * LOOK_YAW_PER_PX, look.dy * LOOK_PITCH_PER_PX);

    const move = this.input.move();
    const f = this.rig.forward();
    // Droite = avant tourné de 90° dans le sens horaire vu du dessus.
    const intent = {
      moveX: f.x * move.y - f.z * move.x,
      moveZ: f.z * move.y + f.x * move.x,
      jump: this.input.jumpHeld,
    };
    const world = this.layout.world;
    const h = this.hero;
    const inWater = world.get(Math.floor(h.x), Math.floor(h.y + 0.3), Math.floor(h.z)) === Block.Water;
    stepHero(h, intent, dt, this.solid, inWater);

    this.heroModel.root.position.set(h.x, h.y, h.z);
    this.heroModel.root.rotation.y = h.facing;
    this.heroModel.update(dt, h.speed, h.onGround);
    this.updateShadow();

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.input.consumeAttack() && this.attackCooldown === 0) {
      this.attackCooldown = ATTACK_COOLDOWN;
      this.heroModel.playAttack();
      this.heroModel.root.updateMatrixWorld(true);
      this.heroModel.staffTip.getWorldPosition(this.tipWorld);
      const tip = this.tipWorld;
      this.sparks.fire(tip.x - Math.sin(h.facing) * 0.3, tip.y, tip.z - Math.cos(h.facing) * 0.3, h.facing);
    }
    this.sparks.update(dt, this.solid);

    const near = this.interactions.nearest(h.x, h.y, h.z);
    this.controls.setInteract(near ? near.label : null);
    if (this.input.consumeInteract() && near) near.action();

    this.hud.update(dt);
    this.rig.update(dt, h.x, h.y, h.z, this.solid);
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
