import * as THREE from 'three';
import { TEXT_FACE_BOSS, TEXT_WEB_CUT, TEXT_WEBS_DONE } from '../data/bossQuest';
import { CubeModel } from '../entities/cubeModel';
import { MODELS } from '../entities/models';
import type { ForestLayout } from '../world/forest';
import type { Point2, Point3 } from '../world/layout';
import { audio } from '../audio/audio';
import { progress, type GameState } from './gameState';
import type { Interactable, Interactions } from './interactions';

export interface ForestBossHooks {
  onBossFight: () => void;
  toast: (text: string) => void;
  burst: (x: number, y: number, z: number, color: number, count?: number) => void;
  onProgress: () => void;
}

/** Nombre de toiles qui barrent le sentier (CONTENU.md, P2). */
export const WEB_COUNT = 3;

/**
 * Repaire de la Reine Araignée (CONTENU.md, P2 « Les fils d'argent ») : trois toiles barrent le
 * sentier pendant la quête ; on les coupe d'un coup de baguette. La Reine attend sous sa toile
 * géante ; « Affronter » lance le combat une fois le sentier libre.
 */
export class ForestBossLife {
  private readonly group = new THREE.Group();
  private readonly webs: CubeModel[] = [];
  private readonly queen: CubeModel;
  private readonly giantWeb: CubeModel;
  private readonly talk: Interactable;
  private offered = false;
  private time = 0;

  constructor(
    private readonly layout: ForestLayout,
    parent: THREE.Group,
    private readonly state: GameState,
    private readonly interactions: Interactions,
    private readonly hooks: ForestBossHooks,
  ) {
    parent.add(this.group);
    const ground = (p: Point2): number => layout.world.standY(Math.floor(p.x), Math.floor(p.z));
    // Les toiles se tendent en travers du sentier (qui monte vers le nord-ouest).
    for (const w of layout.webs) {
      const m = new CubeModel(MODELS.pathWeb);
      m.root.position.set(w.x, ground(w), w.z);
      m.root.rotation.y = 0.3;
      this.group.add(m.root);
      this.webs.push(m);
    }
    const { lair } = layout;
    this.giantWeb = new CubeModel(MODELS.giantWeb, 1.3);
    this.giantWeb.root.position.set(lair.boss.x, lair.floorY, lair.boss.z - 1.8);
    this.group.add(this.giantWeb.root);
    this.queen = new CubeModel(MODELS.spiderQueen, 1.4);
    this.queen.root.position.set(lair.boss.x, lair.floorY + 0.3, lair.boss.z);
    this.queen.root.rotation.y = Math.PI;
    this.group.add(this.queen.root);
    this.talk = { id: 'boss-reineAraignee', x: lair.boss.x, y: lair.floorY, z: lair.boss.z + 2, radius: 3.4, label: TEXT_FACE_BOSS, action: hooks.onBossFight };
    this.sync();
  }

  private get cut(): number {
    return progress(this.state).bossSteps;
  }

  private sync(): void {
    const step = progress(this.state).bossQuest;
    this.webs.forEach((w, i) => (w.root.visible = step === 'active' && i >= this.cut));
    this.queen.root.visible = step !== 'defeated';
    this.giantWeb.root.visible = step !== 'defeated';
    const offer = step === 'active' && this.cut >= WEB_COUNT;
    if (offer !== this.offered) {
      this.offered = offer;
      if (offer) this.interactions.add(this.talk);
      else this.interactions.remove(this.talk.id);
    }
  }

  /** Prochaine toile à couper (aide à la visée). */
  aimTarget(): Point3 | null {
    if (progress(this.state).bossQuest !== 'active' || this.cut >= WEB_COUNT) return null;
    const p = this.webs[this.cut].root.position;
    return { x: p.x, y: p.y + 1.2, z: p.z };
  }

  /** L'étincelle coupe une toile (dans l'ordre du sentier). */
  hitTest(x: number, y: number, z: number): boolean {
    if (progress(this.state).bossQuest !== 'active') return false;
    const i = this.webs.findIndex((w, k) => k >= this.cut && w.root.visible && Math.hypot(w.root.position.x - x, w.root.position.z - z) < 1.5 && y > w.root.position.y && y < w.root.position.y + 2.6);
    if (i < 0) return false;
    const w = this.webs[i];
    progress(this.state).bossSteps = Math.max(this.cut, i + 1);
    this.hooks.burst(w.root.position.x, w.root.position.y + 1.2, w.root.position.z, 0xe8ecf8, 24);
    audio.sfx('hitPlant');
    this.hooks.toast(this.cut >= WEB_COUNT ? TEXT_WEBS_DONE : TEXT_WEB_CUT.replace('{n}', String(this.cut)));
    this.sync();
    this.hooks.onProgress();
    return true;
  }

  /** Où pointe la boussole pendant la quête : la toile suivante, puis la Reine. */
  trailTarget(): Point2 {
    if (this.cut < WEB_COUNT) {
      const p = this.webs[this.cut].root.position;
      return { x: p.x, z: p.z };
    }
    return this.layout.lair.boss;
  }

  update(dt: number): void {
    this.time += dt;
    this.sync();
    // La Reine se balance doucement sous sa toile.
    this.queen.root.position.y = this.layout.lair.floorY + 0.3 + Math.sin(this.time * 1.5) * 0.08;
    this.queen.swing('legsL', Math.sin(this.time * 2) * 0.08, 'z');
    this.queen.swing('legsR', -Math.sin(this.time * 2) * 0.08, 'z');
  }

  snapshot(): { webs: (Point2 & { cut: boolean })[]; queen: Point2 } {
    return { webs: this.webs.map((w, i) => ({ x: w.root.position.x, z: w.root.position.z, cut: i < this.cut })), queen: this.layout.lair.boss };
  }
}
