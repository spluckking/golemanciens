import * as THREE from 'three';
import { TEXT_DRUM, TEXT_FACE_BOSS, TEXT_STRIKE_DRUM, TEXT_WORM_RISES } from '../data/bossQuest';
import { CubeModel } from '../entities/cubeModel';
import { MODELS } from '../entities/models';
import type { DesertLayout } from '../world/desert';
import type { Point2 } from '../world/layout';
import { audio } from '../audio/audio';
import { progress, type GameState } from './gameState';
import type { Interactable, Interactions } from './interactions';

export interface DesertBossHooks {
  onBossFight: () => void;
  toast: (text: string) => void;
  burst: (x: number, y: number, z: number, color: number, count?: number) => void;
  shake: () => void;
  onProgress: () => void;
}

export const DRUM_COUNT = 3;

/**
 * Fosse du Grand Ver (CONTENU.md, P3 « Les tambours des dunes ») : trois tambours anciens à frapper,
 * dans n'importe quel ordre ; au troisième, le sol tremble et le Grand Ver surgit de la fosse.
 */
export class DesertBossLife {
  private readonly group = new THREE.Group();
  private readonly drums: CubeModel[] = [];
  private readonly drumTalks: Interactable[] = [];
  private readonly worm: CubeModel;
  private readonly talk: Interactable;
  private struck: boolean[];
  private rise = 0;
  private time = 0;

  constructor(
    private readonly layout: DesertLayout,
    parent: THREE.Group,
    private readonly state: GameState,
    private readonly interactions: Interactions,
    private readonly hooks: DesertBossHooks,
  ) {
    parent.add(this.group);
    const ground = (p: Point2): number => layout.world.standY(Math.floor(p.x), Math.floor(p.z));
    // Les tambours frappés sont notés par bit dans bossSteps (ordre libre).
    const mask = progress(state).bossSteps;
    this.struck = layout.drums.map((_, i) => (mask & (1 << i)) !== 0);
    layout.drums.forEach((d, i) => {
      const m = new CubeModel(MODELS.drum, 1.2);
      m.root.position.set(d.x, ground(d), d.z);
      this.group.add(m.root);
      this.drums.push(m);
      this.drumTalks.push({ id: `p3-drum-${i}`, ...d, y: ground(d), radius: 1.8, label: TEXT_STRIKE_DRUM, action: () => this.strike(i) });
    });
    const { pit } = layout;
    this.worm = new CubeModel(MODELS.grandVer, 1.2);
    this.worm.root.position.set(pit.boss.x, pit.floorY, pit.boss.z);
    this.worm.root.rotation.y = Math.PI;
    this.group.add(this.worm.root);
    this.talk = { id: 'boss-grandVer', x: pit.boss.x, y: pit.floorY, z: pit.boss.z + 3, radius: 3.6, label: TEXT_FACE_BOSS, action: hooks.onBossFight };
    this.rise = this.allStruck ? 1 : 0;
    this.sync();
  }

  get count(): number {
    return this.struck.filter(Boolean).length;
  }

  private get allStruck(): boolean {
    return this.count >= DRUM_COUNT;
  }

  private sync(): void {
    const step = progress(this.state).bossQuest;
    const set = (it: Interactable, on: boolean): void => {
      this.interactions.remove(it.id);
      if (on) this.interactions.add(it);
    };
    this.drumTalks.forEach((t, i) => set(t, step === 'active' && !this.struck[i]));
    set(this.talk, step === 'active' && this.allStruck);
    this.worm.root.visible = step !== 'defeated' && (this.allStruck || this.rise > 0);
  }

  private strike(i: number): void {
    if (progress(this.state).bossQuest !== 'active' || this.struck[i]) return;
    this.struck[i] = true;
    progress(this.state).bossSteps |= 1 << i;
    const d = this.drums[i].root.position;
    this.hooks.burst(d.x, d.y + 1, d.z, 0xffe27a, 16);
    audio.sfx('gong');
    if (this.allStruck) {
      this.hooks.toast(TEXT_WORM_RISES);
      audio.sfx('rumble');
      this.hooks.shake();
    } else this.hooks.toast(TEXT_DRUM.replace('{n}', String(this.count)));
    this.sync();
    this.hooks.onProgress();
  }

  /** Prochain tambour (boussole), puis la fosse. */
  trailTarget(hero: Point2): Point2 {
    let best: Point2 | null = null;
    let bestD = Infinity;
    this.layout.drums.forEach((d, i) => {
      if (this.struck[i]) return;
      const dd = Math.hypot(d.x - hero.x, d.z - hero.z);
      if (dd < bestD) {
        best = d;
        bestD = dd;
      }
    });
    return best ?? this.layout.pit.boss;
  }

  update(dt: number): void {
    this.time += dt;
    // Le Grand Ver monte de la fosse, puis ondule.
    if (this.allStruck && progress(this.state).bossQuest === 'active') this.rise = Math.min(1, this.rise + dt * 0.6);
    this.worm.root.position.y = this.layout.pit.floorY - (1 - this.rise) * 4;
    const head = this.worm.part('head');
    if (head) head.rotation.z = Math.sin(this.time * 1.5) * 0.12;
    for (const [i, m] of this.drums.entries()) {
      const glow = m.part('glow');
      if (glow) glow.visible = !this.struck[i];
    }
    this.sync();
  }

  snapshot(): { drums: (Point2 & { struck: boolean })[]; worm: Point2 } {
    return { drums: this.layout.drums.map((d, i) => ({ ...d, struck: this.struck[i] })), worm: this.layout.pit.boss };
  }
}
