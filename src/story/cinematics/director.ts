import * as THREE from 'three';
import { audio, type SfxId } from '../../audio/audio';
import type { TrackId } from '../../audio/music';
import type { BiomeId } from '../../core/gameState';
import type { SolidFn } from '../../core/physics';
import { createRng } from '../../core/rng';
import { formatText } from '../../core/text';
import { animateWalk, CubeModel } from '../../entities/cubeModel';
import { animateCape } from '../../entities/heroModel';
import { MODELS, type ModelId } from '../../entities/models';
import type { Sparks } from '../../entities/sparks';
import { el } from '../../ui/dom';
import type { VoxelWorld } from '../../world/voxelWorld';
import { readingSeconds } from './captions';

/**
 * Metteur en scène des cinématiques (SPEC.md § 9.4) : joue un scénario de plans dans la scène
 * du biome, avec ses propres acteurs en cubes, une caméra scénarisée, le ciel du moment
 * et les sous-titres. Aucun fichier vidéo.
 */

export type SkyPreset = 'day' | 'dusk' | 'night' | 'morning' | 'ember';
/** Décors construits pour une cinématique (en dehors du biome). */
export type SetId = 'volcano' | 'foret' | 'desert';

/** Un décor de cinématique : son monde de blocs et son rendu (libéré à la fin). */
export interface CinematicSet {
  world: VoxelWorld;
  group: THREE.Object3D;
  dispose(): void;
}
export type Vec3 = [number, number, number];

/** Position et point visé de la caméra. */
export interface CameraKey {
  pos: Vec3;
  look: Vec3;
}

export interface Shot {
  /** Nombre de phrases du texte racontées pendant ce plan. */
  sentences: number;
  /** Mise en place : décor, acteurs, caméra (les acteurs du plan précédent sont retirés). */
  setup(ctx: ShotContext): void;
  /** Animation du plan, t = secondes depuis le début du plan. */
  update?(ctx: ShotContext, t: number, dt: number): void;
}

export interface CinematicScript {
  id: string;
  /** Biome où se joue la cinématique (Prairie par défaut). */
  biome?: BiomeId;
  shots: Shot[];
}

interface SkyLook {
  background: number;
  hemiSky: number;
  hemiGround: number;
  hemi: number;
  sun: number;
  sunColor: number;
  stars: number;
}

const SKIES: Record<SkyPreset, SkyLook> = {
  day: { background: 0x9fd8ff, hemiSky: 0xeaf6ff, hemiGround: 0x7a6a50, hemi: 1.9, sun: 1.6, sunColor: 0xfff4e0, stars: 0 },
  morning: { background: 0xc4e4ff, hemiSky: 0xfff0e0, hemiGround: 0x7a6a50, hemi: 1.7, sun: 1.4, sunColor: 0xffe6c0, stars: 0 },
  dusk: { background: 0xf0a878, hemiSky: 0xffd0a8, hemiGround: 0x5a4058, hemi: 1.25, sun: 0.9, sunColor: 0xff9a60, stars: 0.25 },
  night: { background: 0x141a3c, hemiSky: 0x6070b0, hemiGround: 0x1c1c2c, hemi: 0.75, sun: 0.35, sunColor: 0x8c9cff, stars: 1 },
  // Ciel du volcan : rouge sombre, lueur de lave par en dessous.
  ember: { background: 0x8a3a34, hemiSky: 0xffb08a, hemiGround: 0x8a3020, hemi: 1.8, sun: 0.9, sunColor: 0xff7a48, stars: 0 },
};

const STAR_COUNT = 420;
const STAR_RADIUS = 70;

/** Un personnage ou un objet de la cinématique. */
export class Actor {
  readonly model: CubeModel;
  x: number;
  y: number;
  z: number;
  facing: number;
  /** Suit le sol pendant qu'il marche. */
  grounded = true;
  private path: [number, number][] = [];
  private speed = 0;
  private walkPhase = 0;
  private time = 0;
  moving = false;

  constructor(
    model: ModelId,
    x: number,
    y: number,
    z: number,
    facing: number,
    scale: number,
    private readonly ground: (x: number, z: number) => number,
  ) {
    this.model = new CubeModel(MODELS[model], scale);
    this.x = x;
    this.y = y;
    this.z = z;
    this.facing = facing;
  }

  get root(): THREE.Group {
    return this.model.root;
  }

  /** Marche le long des points (x, z), à la vitesse donnée (blocs par seconde). */
  walk(points: [number, number][], speed = 2.6): void {
    this.path = points.slice();
    this.speed = speed;
  }

  get walking(): boolean {
    return this.path.length > 0;
  }

  update(dt: number): void {
    this.time += dt;
    this.moving = false;
    if (this.path.length > 0) {
      const [tx, tz] = this.path[0];
      const dx = tx - this.x;
      const dz = tz - this.z;
      const d = Math.hypot(dx, dz);
      const step = this.speed * dt;
      if (d <= step) {
        this.x = tx;
        this.z = tz;
        this.path.shift();
      } else {
        this.x += (dx / d) * step;
        this.z += (dz / d) * step;
        this.facing = Math.atan2(-dx, -dz);
      }
      this.moving = true;
      if (this.grounded) this.y = this.ground(this.x, this.z);
    }
    if (this.moving) this.walkPhase += dt * this.speed * 2.2;
    else this.walkPhase *= Math.max(0, 1 - dt * 8);
    animateWalk(this.model, this.walkPhase, this.moving ? 1 : 0.4);
    animateCape(this.model, this.moving ? this.speed : 0, false, this.time);
  }

  /** Reporte la position et le cap sur le modèle (après les poses du plan). */
  sync(): void {
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.facing;
  }
}

/** Ce qu'un plan peut faire : acteurs, caméra, ciel, effets. */
export interface ShotContext {
  readonly world: VoxelWorld;
  readonly playerName: string;
  /** Décor du plan : un décor construit pour la cinématique, ou null pour le biome. */
  set(id: SetId | null): void;
  /** Musique du plan (sinon, elle suit le ciel). */
  music(id: TrackId): void;
  ground(x: number, z: number): number;
  actor(id: string, model: ModelId, x: number, z: number, facing: number, opts?: { y?: number; scale?: number }): Actor;
  get(id: string): Actor;
  remove(id: string): void;
  camera(from: CameraKey, to?: CameraKey, seconds?: number): void;
  sky(preset: SkyPreset, seconds?: number): void;
  shake(strength: number, seconds: number): void;
  flash(seconds?: number): void;
  burst(x: number, y: number, z: number, color: number, count?: number, power?: number): void;
  sound(id: SfxId): void;
}

export interface DirectorHost {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  world: VoxelWorld;
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
  sparks: Sparks;
  solid: SolidFn;
  uiLayer: HTMLElement;
  /** Construit un décor de cinématique (dans la même scène, le biome étant caché). */
  buildSet(id: SetId): CinematicSet;
  /** Affiche ou cache le biome (pendant un décor de cinématique). */
  showWorld(visible: boolean): void;
}

export interface PlayOptions {
  playerName: string;
  /** Un sous-titre par plan. */
  captions: string[];
  /** « Passer » visible (cinématique déjà vue). */
  skippable: boolean;
  /** Mode test : raccourcit le temps de lecture avant ▶. */
  timeScale: number;
  /** Mode test : commence à ce plan (0 par défaut). */
  startShot?: number;
}

function smooth(t: number): number {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
}

export class CinematicDirector implements ShotContext {
  playerName = '';
  private readonly sets = new Map<SetId, CinematicSet>();
  private currentSet: CinematicSet | null = null;
  private readonly group = new THREE.Group();
  private readonly actors = new Map<string, Actor>();
  private readonly stars: THREE.Points;
  private readonly moon: THREE.Mesh;
  private camFrom: CameraKey = { pos: [0, 0, 0], look: [0, 0, 1] };
  private camTo: CameraKey = this.camFrom;
  private camDuration = 0;
  private camTime = 0;
  private skyFrom: SkyLook = SKIES.day;
  private skyTo: SkyLook = SKIES.day;
  private skyDuration = 0;
  private skyTime = 0;
  private shakeStrength = 0;
  private shakeTime = 0;
  private shotTime = 0;
  private shot: Shot | null = null;
  private running = false;
  private readonly tmpColor = new THREE.Color();
  private readonly look = new THREE.Vector3();
  private saved: { background: THREE.Color; fog: THREE.Color } | null = null;

  constructor(private readonly host: DirectorHost) {
    const positions = new Float32Array(STAR_COUNT * 3);
    const rng = createRng(0x57a2);
    for (let i = 0; i < STAR_COUNT; i++) {
      // Points répartis sur la moitié haute d'une sphère (tirage fixe).
      const u = rng() * Math.PI * 2;
      const v = 0.08 + rng() * 0.9;
      const r = Math.sqrt(1 - v * v);
      positions.set([Math.cos(u) * r * STAR_RADIUS, v * STAR_RADIUS, Math.sin(u) * r * STAR_RADIUS], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, depthWrite: false }),
    );
    this.moon = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ color: 0xf6f0d0, fog: false, transparent: true }));
    this.group.add(this.stars, this.moon);
  }

  get active(): boolean {
    return this.running;
  }

  // ---------- API des plans ----------

  get world(): VoxelWorld {
    return this.currentSet?.world ?? this.host.world;
  }

  set(id: SetId | null): void {
    const next = id ? (this.sets.get(id) ?? this.buildSet(id)) : null;
    if (next === this.currentSet) return;
    if (this.currentSet) this.currentSet.group.visible = false;
    this.currentSet = next;
    if (next) next.group.visible = true;
    this.host.showWorld(!next);
  }

  private buildSet(id: SetId): CinematicSet {
    const set = this.host.buildSet(id);
    this.sets.set(id, set);
    this.host.scene.add(set.group);
    return set;
  }

  music(id: TrackId): void {
    audio.music(id);
  }

  /** Sol où l'on peut se tenir : le premier vide de 2 blocs en partant du bas (ignore les avancées de toit). */
  ground(x: number, z: number): number {
    return this.world.standY(Math.floor(x), Math.floor(z));
  }

  actor(id: string, model: ModelId, x: number, z: number, facing: number, opts: { y?: number; scale?: number } = {}): Actor {
    this.remove(id);
    const a = new Actor(model, x, opts.y ?? this.ground(x, z), z, facing, opts.scale ?? 1, (ax, az) => this.ground(ax, az));
    if (opts.y !== undefined) a.grounded = false;
    this.actors.set(id, a);
    this.group.add(a.root);
    a.update(0);
    a.sync();
    return a;
  }

  get(id: string): Actor {
    const a = this.actors.get(id);
    if (!a) throw new Error(`Acteur inconnu : ${id}`);
    return a;
  }

  remove(id: string): void {
    const a = this.actors.get(id);
    if (!a) return;
    a.root.removeFromParent();
    this.actors.delete(id);
  }

  camera(from: CameraKey, to: CameraKey = from, seconds = 0): void {
    this.camFrom = from;
    this.camTo = to;
    this.camDuration = seconds;
    this.camTime = 0;
  }

  sky(preset: SkyPreset, seconds = 0): void {
    this.skyFrom = this.currentSky();
    this.skyTo = SKIES[preset];
    this.skyDuration = seconds;
    this.skyTime = 0;
    if (seconds === 0) this.applySky(this.skyTo);
    // La musique suit le ciel : calme le jour, inquiétante la nuit, joyeuse au matin.
    audio.music(preset === 'night' ? 'storyNight' : preset === 'morning' ? 'storyMorning' : 'storyDay');
  }

  shake(strength: number, seconds: number): void {
    this.shakeStrength = strength;
    this.shakeTime = seconds;
  }

  flash(seconds = 0.5): void {
    const node = el('div', { className: 'cine-flash' });
    node.style.animationDuration = `${seconds}s`;
    this.host.uiLayer.appendChild(node);
    setTimeout(() => node.remove(), seconds * 1000);
  }

  burst(x: number, y: number, z: number, color: number, count = 12, power = 1): void {
    this.host.sparks.burst(x, y, z, color, count, power);
  }

  sound(id: SfxId): void {
    audio.sfx(id);
  }

  // ---------- Lecture ----------

  /** Joue le scénario plan par plan ; résout quand le dernier plan est terminé (ou passé). */
  play(script: CinematicScript, opts: PlayOptions): Promise<void> {
    if (opts.captions.length !== script.shots.length) throw new Error(`${script.id} : ${opts.captions.length} sous-titres pour ${script.shots.length} plans`);
    this.playerName = opts.playerName;
    this.begin();
    return new Promise((resolve) => {
      const caption = el('p', { className: 'cine-caption-text', testId: 'cinematic-caption' });
      const next = el('button', { className: 'cine-next hidden', text: '▶', aria: 'Suite', testId: 'cinematic-next' });
      next.type = 'button';
      const card = el('div', { className: 'cine-caption' }, [caption, next]);
      const root = el('div', { className: 'cinematic', testId: 'cinematic' }, [el('div', { className: 'cine-bar cine-bar-top' }), el('div', { className: 'cine-bar cine-bar-bottom' }), card]);
      if (opts.skippable) {
        const skip = el('button', { className: 'cine-skip', text: 'Passer', testId: 'cinematic-skip' });
        skip.type = 'button';
        skip.addEventListener('click', () => finish());
        root.appendChild(skip);
      }
      this.host.uiLayer.appendChild(root);

      let index = -1;
      let timer = 0;
      const show = (i: number): void => {
        index = i;
        this.startShot(script.shots[i]);
        caption.textContent = formatText(opts.captions[i], opts.playerName);
        card.classList.remove('appear');
        void card.offsetWidth;
        card.classList.add('appear');
        next.classList.add('hidden');
        clearTimeout(timer);
        timer = window.setTimeout(() => next.classList.remove('hidden'), readingSeconds(opts.captions[i]) * opts.timeScale * 1000);
      };
      const finish = (): void => {
        clearTimeout(timer);
        root.remove();
        this.end();
        resolve();
      };
      next.addEventListener('click', () => {
        if (next.classList.contains('hidden')) return;
        if (index + 1 < script.shots.length) show(index + 1);
        else finish();
      });
      show(Math.min(Math.max(0, opts.startShot ?? 0), script.shots.length - 1));
    });
  }

  private startShot(shot: Shot): void {
    for (const id of [...this.actors.keys()]) this.remove(id);
    this.shot = shot;
    this.shotTime = 0;
    this.shakeTime = 0;
    shot.setup(this);
    this.update(0);
  }

  private begin(): void {
    const { scene } = this.host;
    this.saved = { background: (scene.background as THREE.Color).clone(), fog: (scene.fog as THREE.Fog).color.clone() };
    scene.add(this.group);
    this.running = true;
  }

  private end(): void {
    for (const id of [...this.actors.keys()]) this.remove(id);
    this.group.removeFromParent();
    this.running = false;
    this.shot = null;
    // Décors libérés : un seul monde en mémoire hors cinématique.
    this.set(null);
    for (const s of this.sets.values()) s.dispose();
    this.sets.clear();
    this.applySky(SKIES.day);
    if (this.saved) {
      (this.host.scene.background as THREE.Color).copy(this.saved.background);
      (this.host.scene.fog as THREE.Fog).color.copy(this.saved.fog);
    }
  }

  /** Appelée à chaque image par la boucle de jeu pendant la cinématique. */
  update(dt: number): void {
    if (!this.shot) return;
    this.shotTime += dt;
    // Marche et animation de base d'abord, puis les poses propres au plan.
    for (const a of this.actors.values()) a.update(dt);
    this.shot.update?.(this, this.shotTime, dt);
    for (const a of this.actors.values()) a.sync();
    const world = this.world;
    this.host.sparks.update(dt, world === this.host.world ? this.host.solid : (x, y, z) => world.solidAt(x, y, z), () => false);

    // Ciel : transition douce entre deux ambiances.
    if (this.skyDuration > 0 && this.skyTime < this.skyDuration) {
      this.skyTime += dt;
      this.applySky(this.mixSky(this.skyFrom, this.skyTo, smooth(this.skyTime / this.skyDuration)));
    }

    // Caméra : trajet adouci, puis léger balancement pour que l'image reste vivante.
    this.camTime += dt;
    const k = this.camDuration > 0 ? smooth(this.camTime / this.camDuration) : 1;
    const cam = this.host.camera;
    const lerp = (a: Vec3, b: Vec3, i: number): number => a[i] + (b[i] - a[i]) * k;
    const sway = Math.sin(this.shotTime * 0.6) * 0.12;
    cam.position.set(lerp(this.camFrom.pos, this.camTo.pos, 0) + sway, lerp(this.camFrom.pos, this.camTo.pos, 1) + sway * 0.4, lerp(this.camFrom.pos, this.camTo.pos, 2));
    this.look.set(lerp(this.camFrom.look, this.camTo.look, 0), lerp(this.camFrom.look, this.camTo.look, 1), lerp(this.camFrom.look, this.camTo.look, 2));
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const s = this.shakeStrength * Math.min(1, this.shakeTime * 3);
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
    }
    cam.lookAt(this.look);

    // Étoiles et lune autour de la caméra.
    this.stars.position.copy(cam.position);
    this.moon.position.set(cam.position.x + 30, cam.position.y + 48, cam.position.z - 40);
    this.moon.lookAt(cam.position);
  }

  private currentSky(): SkyLook {
    const { hemi, sun, scene } = this.host;
    return {
      background: (scene.background as THREE.Color).getHex(),
      hemiSky: hemi.color.getHex(),
      hemiGround: hemi.groundColor.getHex(),
      hemi: hemi.intensity,
      sun: sun.intensity,
      sunColor: sun.color.getHex(),
      stars: (this.stars.material as THREE.PointsMaterial).opacity,
    };
  }

  private mixSky(a: SkyLook, b: SkyLook, k: number): SkyLook {
    const mixColor = (x: number, y: number): number => this.tmpColor.setHex(x).lerp(new THREE.Color(y), k).getHex();
    return {
      background: mixColor(a.background, b.background),
      hemiSky: mixColor(a.hemiSky, b.hemiSky),
      hemiGround: mixColor(a.hemiGround, b.hemiGround),
      hemi: a.hemi + (b.hemi - a.hemi) * k,
      sun: a.sun + (b.sun - a.sun) * k,
      sunColor: mixColor(a.sunColor, b.sunColor),
      stars: a.stars + (b.stars - a.stars) * k,
    };
  }

  private applySky(s: SkyLook): void {
    const { scene, hemi, sun } = this.host;
    (scene.background as THREE.Color).setHex(s.background);
    (scene.fog as THREE.Fog).color.setHex(s.background);
    hemi.color.setHex(s.hemiSky);
    hemi.groundColor.setHex(s.hemiGround);
    hemi.intensity = s.hemi;
    sun.color.setHex(s.sunColor);
    sun.intensity = s.sun;
    (this.stars.material as THREE.PointsMaterial).opacity = s.stars;
    (this.moon.material as THREE.MeshBasicMaterial).opacity = s.stars;
    this.stars.visible = this.moon.visible = s.stars > 0.01;
  }
}
