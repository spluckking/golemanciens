import * as THREE from 'three';
import { TEXT_FACE_BOSS, TEXT_FEATHER, TEXT_TOWER_OPEN } from '../data/bossQuest';
import { TEXT_PICK_UP } from '../data/quests';
import { CubeModel } from '../entities/cubeModel';
import { MODELS } from '../entities/models';
import type { CielLayout } from '../world/ciel';
import type { Point2 } from '../world/layout';
import type { Cell } from '../world/structures';
import { Block } from '../world/blocks';
import { audio } from '../audio/audio';
import { progress, type GameState } from './gameState';
import type { Interactable, Interactions } from './interactions';

export interface CielBossHooks {
  onBossFight: () => void;
  toast: (text: string) => void;
  burst: (x: number, y: number, z: number, color: number, count?: number) => void;
  rebuild: (cells: Cell[]) => void;
  onProgress: () => void;
}

export const FEATHER_COUNT = 3;

/**
 * Les plumes noires (CONTENU.md, P5) : trois plumes du Griffon, perdues sur les îles, à ramasser dans
 * n'importe quel ordre ; elles ouvrent la porte de la tour noire où attend le Griffon d'Ombre.
 */
export class CielBossLife {
  private readonly group = new THREE.Group();
  private readonly feathers: CubeModel[] = [];
  private readonly featherTalks: Interactable[] = [];
  private readonly griffon: CubeModel;
  private readonly talk: Interactable;
  private taken: boolean[];
  private time = 0;

  constructor(
    private readonly layout: CielLayout,
    parent: THREE.Group,
    private readonly state: GameState,
    private readonly interactions: Interactions,
    private readonly hooks: CielBossHooks,
  ) {
    parent.add(this.group);
    const ground = (p: Point2): number => layout.world.standY(Math.floor(p.x), Math.floor(p.z));
    // Les plumes ramassées sont notées par bit dans bossSteps (ordre libre).
    const mask = progress(state).bossSteps;
    this.taken = layout.feathers.map((_, i) => (mask & (1 << i)) !== 0);
    layout.feathers.forEach((f, i) => {
      const m = new CubeModel(MODELS.blackFeather, 1.4);
      m.root.position.set(f.x, ground(f), f.z);
      this.group.add(m.root);
      this.feathers.push(m);
      this.featherTalks.push({ id: `p5-feather-${i}`, ...f, y: ground(f), radius: 1.6, label: TEXT_PICK_UP, action: () => this.pick(i) });
    });
    const { lair } = layout;
    this.griffon = new CubeModel(MODELS.griffon);
    this.griffon.root.position.set(lair.boss.x, lair.floorY, lair.boss.z);
    this.group.add(this.griffon.root);
    this.talk = { id: 'boss-griffon', x: lair.boss.x, y: lair.floorY, z: lair.boss.z + 3.5, radius: 3.8, label: TEXT_FACE_BOSS, action: hooks.onBossFight };
    this.sync();
  }

  get count(): number {
    return this.taken.filter(Boolean).length;
  }

  get allTaken(): boolean {
    return this.count >= FEATHER_COUNT;
  }

  private sync(): void {
    const step = progress(this.state).bossQuest;
    const set = (it: Interactable, on: boolean): void => {
      this.interactions.remove(it.id);
      if (on) this.interactions.add(it);
    };
    this.featherTalks.forEach((t, i) => set(t, step === 'active' && !this.taken[i]));
    this.feathers.forEach((m, i) => (m.root.visible = step === 'active' && !this.taken[i]));
    set(this.talk, step === 'active' && this.allTaken);
    this.griffon.root.visible = step !== 'defeated';
    // La porte de la tour s'ouvre avec les trois plumes (et reste ouverte).
    const door = this.layout.lairDoor;
    if ((this.allTaken || step === 'defeated') && door.some((c) => this.layout.world.get(c.x, c.y, c.z) !== Block.Air)) {
      for (const c of door) this.layout.world.set(c.x, c.y, c.z, Block.Air);
      this.hooks.rebuild(door);
    }
  }

  private pick(i: number): void {
    if (progress(this.state).bossQuest !== 'active' || this.taken[i]) return;
    this.taken[i] = true;
    progress(this.state).bossSteps |= 1 << i;
    const f = this.feathers[i].root.position;
    this.hooks.burst(f.x, f.y + 0.6, f.z, 0x9a7ad8, 16);
    audio.sfx('pop');
    if (this.allTaken) {
      this.hooks.toast(TEXT_TOWER_OPEN);
      audio.sfx('door');
    } else this.hooks.toast(TEXT_FEATHER.replace('{n}', String(this.count)));
    this.sync();
    this.hooks.onProgress();
  }

  /** Prochaine plume (boussole), puis la tour. */
  trailTarget(hero: Point2): Point2 {
    let best: Point2 | null = null;
    let bestD = Infinity;
    this.layout.feathers.forEach((f, i) => {
      if (this.taken[i]) return;
      const d = Math.hypot(f.x - hero.x, f.z - hero.z);
      if (d < bestD) {
        best = f;
        bestD = d;
      }
    });
    return best ?? this.layout.lair.boss;
  }

  update(dt: number): void {
    this.time += dt;
    // Le Griffon bat des ailes, perché au milieu de la cour ; les plumes tournent doucement.
    const flap = Math.sin(this.time * 2.2) * 0.25;
    this.griffon.swing('wingL', flap, 'z');
    this.griffon.swing('wingR', -flap, 'z');
    for (const m of this.feathers) m.root.rotation.y += dt;
    this.sync();
  }

  snapshot(): { feathers: (Point2 & { taken: boolean })[]; griffon: Point2 } {
    return { feathers: this.layout.feathers.map((f, i) => ({ ...f, taken: this.taken[i] })), griffon: this.layout.lair.boss };
  }
}
