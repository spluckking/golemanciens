import * as THREE from 'three';
import { TEXT_BRAZIER, TEXT_FACE_BOSS, TEXT_LIGHT_BRAZIER, TEXT_PATH_LIT } from '../data/bossQuest';
import { CubeModel } from '../entities/cubeModel';
import { MODELS } from '../entities/models';
import type { GivreLayout } from '../world/givre';
import type { Point2 } from '../world/layout';
import { audio } from '../audio/audio';
import { progress, type GameState } from './gameState';
import type { Interactable, Interactions } from './interactions';

export interface GivreBossHooks {
  onBossFight: () => void;
  toast: (text: string) => void;
  burst: (x: number, y: number, z: number, color: number, count?: number) => void;
  onProgress: () => void;
}

export const BRAZIER_COUNT = 3;

/**
 * Sentier du blizzard (CONTENU.md, P4) : trois braseros à allumer, dans n'importe quel ordre ;
 * leur lumière montre le chemin dans la tempête, et la Sorcière du Blizzard apparaît au sommet.
 */
export class GivreBossLife {
  private readonly group = new THREE.Group();
  private readonly braziers: CubeModel[] = [];
  private readonly brazierTalks: Interactable[] = [];
  private readonly witch: CubeModel;
  private readonly talk: Interactable;
  private lit: boolean[];
  private appear = 0;
  private time = 0;

  constructor(
    private readonly layout: GivreLayout,
    parent: THREE.Group,
    private readonly state: GameState,
    private readonly interactions: Interactions,
    private readonly hooks: GivreBossHooks,
  ) {
    parent.add(this.group);
    const ground = (p: Point2): number => layout.world.standY(Math.floor(p.x), Math.floor(p.z));
    // Les braseros allumés sont notés par bit dans bossSteps (ordre libre).
    const mask = progress(state).bossSteps;
    this.lit = layout.braziers.map((_, i) => (mask & (1 << i)) !== 0);
    layout.braziers.forEach((b, i) => {
      const m = new CubeModel(MODELS.brazier, 1.1);
      m.root.position.set(b.x, ground(b), b.z);
      this.group.add(m.root);
      this.braziers.push(m);
      this.brazierTalks.push({ id: `p4-brazier-${i}`, ...b, y: ground(b), radius: 1.8, label: TEXT_LIGHT_BRAZIER, action: () => this.light(i) });
    });
    const { summit } = layout;
    this.witch = new CubeModel(MODELS.sorciere);
    this.witch.root.position.set(summit.boss.x, summit.floorY, summit.boss.z);
    this.group.add(this.witch.root);
    this.talk = { id: 'boss-sorciere', x: summit.boss.x, y: summit.floorY, z: summit.boss.z + 3, radius: 3.6, label: TEXT_FACE_BOSS, action: hooks.onBossFight };
    this.appear = this.allLit ? 1 : 0;
    this.sync();
  }

  get count(): number {
    return this.lit.filter(Boolean).length;
  }

  get allLit(): boolean {
    return this.count >= BRAZIER_COUNT;
  }

  private sync(): void {
    const step = progress(this.state).bossQuest;
    const set = (it: Interactable, on: boolean): void => {
      this.interactions.remove(it.id);
      if (on) this.interactions.add(it);
    };
    this.brazierTalks.forEach((t, i) => set(t, step === 'active' && !this.lit[i]));
    set(this.talk, step === 'active' && this.allLit);
    this.witch.root.visible = step !== 'defeated' && (this.allLit || this.appear > 0);
    this.braziers.forEach((m, i) => {
      const flame = m.part('flame');
      if (flame) flame.visible = this.lit[i] || step === 'defeated';
    });
  }

  private light(i: number): void {
    if (progress(this.state).bossQuest !== 'active' || this.lit[i]) return;
    this.lit[i] = true;
    progress(this.state).bossSteps |= 1 << i;
    const b = this.braziers[i].root.position;
    this.hooks.burst(b.x, b.y + 1.4, b.z, 0xffa040, 20);
    audio.sfx('fire');
    if (this.allLit) {
      this.hooks.toast(TEXT_PATH_LIT);
      audio.sfx('rumble');
    } else this.hooks.toast(TEXT_BRAZIER.replace('{n}', String(this.count)));
    this.sync();
    this.hooks.onProgress();
  }

  /** Prochain brasero (boussole), puis le sommet. */
  trailTarget(hero: Point2): Point2 {
    let best: Point2 | null = null;
    let bestD = Infinity;
    this.layout.braziers.forEach((b, i) => {
      if (this.lit[i]) return;
      const d = Math.hypot(b.x - hero.x, b.z - hero.z);
      if (d < bestD) {
        best = b;
        bestD = d;
      }
    });
    return best ?? this.layout.summit.boss;
  }

  /** Avancement de la tempête (0 au départ, 1 quand les trois braseros brillent). */
  get calm(): number {
    return progress(this.state).bossQuest === 'defeated' ? 1 : this.count / BRAZIER_COUNT;
  }

  update(dt: number): void {
    this.time += dt;
    // La Sorcière apparaît dans un tourbillon, puis flotte en agitant son bâton.
    if (this.allLit && progress(this.state).bossQuest === 'active' && this.appear < 1) {
      this.appear = Math.min(1, this.appear + dt * 0.7);
      if (Math.floor(this.time * 10) !== Math.floor((this.time - dt) * 10)) {
        const p = this.witch.root.position;
        this.hooks.burst(p.x + (Math.random() - 0.5) * 2, p.y + 1 + Math.random() * 2, p.z + (Math.random() - 0.5) * 2, 0xffffff, 6);
      }
    }
    const s = this.layout.summit;
    this.witch.root.position.y = s.floorY + 0.3 + Math.sin(this.time * 1.4) * 0.15;
    this.witch.root.scale.setScalar(Math.max(0.01, this.appear));
    this.witch.swing('armR', -0.6 + Math.sin(this.time * 2) * 0.3);
    for (const m of this.braziers) {
      const flame = m.part('flame');
      if (flame?.visible) flame.scale.y = 1 + Math.sin(this.time * 9 + m.root.position.x) * 0.12;
    }
    this.sync();
  }

  snapshot(): { braziers: (Point2 & { lit: boolean })[]; witch: Point2 } {
    return { braziers: this.layout.braziers.map((b, i) => ({ ...b, lit: this.lit[i] })), witch: this.layout.summit.boss };
  }
}
