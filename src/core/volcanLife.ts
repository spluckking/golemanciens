import * as THREE from 'three';
import { FINALE_FACE, FINALE_TASK, FINALE_TITLE, OBJECTIVE_GAME_DONE, TEXT_FACE_BOSS, TEXT_LAVA, TEXT_PATH_FREE, TEXT_PATH_GUARDS } from '../data/bossQuest';
import { CubeModel } from '../entities/cubeModel';
import type { HeroState } from '../entities/heroController';
import { MODELS } from '../entities/models';
import { VOLCAN_CAMPS, type VolcanLayout } from '../world/volcan';
import { Block } from '../world/blocks';
import type { Point3 } from '../world/layout';
import { audio } from '../audio/audio';
import { markSeen, type GameState } from './gameState';
import type { Interactable, Interactions } from './interactions';
import type { SolidFn } from './physics';
import type { Rng } from './rng';
import { SEEN_RADIUS, WorldLife, type FightSetup, type Objective, type WorldHooks } from './worldLife';

const SMOKE_COUNT = 260;
const SMOKE_BOX = 24;
const LAVA_COOLDOWN_S = 1.5;

export interface VolcanHooks extends WorldHooks {
  onBossFight: () => void;
  /** La lave fait reculer : on replace le héros (sans tourner la caméra). */
  moveHero: (x: number, z: number) => void;
}

/**
 * Le Volcan d'Ombre (finale) : traverser la plaine en battant les trois groupes de gardiens,
 * franchir le pont de pierre noire, puis affronter le Dragon d'Ombre au fond du cratère.
 * La lave n'abîme rien : elle fait reculer. De la fumée et des braises montent partout.
 */
export class VolcanLife extends WorldLife {
  declare readonly layout: VolcanLayout;
  private readonly dragon: CubeModel;
  private readonly dragonTalk: Interactable;
  private readonly smoke: THREE.InstancedMesh;
  private readonly flakes: Float32Array;
  private readonly matrix = new THREE.Matrix4();
  private safe: { x: number; z: number };
  private lavaCooldown = 0;
  private announced: boolean;
  private clock = 0;

  constructor(layout: VolcanLayout, state: GameState, atlas: THREE.Texture, solid: SolidFn, rng: Rng, interactions: Interactions, private readonly volcanHooks: VolcanHooks) {
    super(layout, state, atlas, solid, rng, interactions, volcanHooks);
    this.safe = { x: layout.arrival.x, z: layout.arrival.z };
    const c = layout.crater;
    this.dragon = new CubeModel(MODELS.dragon, 1.1);
    this.dragon.root.position.set(c.boss.x, c.floorY + 2.4, c.boss.z);
    this.group.add(this.dragon.root);
    this.dragonTalk = { id: 'boss-dragon', x: c.boss.x, y: c.floorY, z: c.boss.z + 5, radius: 4.2, label: TEXT_FACE_BOSS, action: volcanHooks.onBossFight };
    this.announced = this.guardsLeft === 0;

    // Fumée et braises : de petits cubes qui montent autour du héros (un seul appel de dessin).
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({ color: 0x6a5a64, fog: true });
    this.smoke = new THREE.InstancedMesh(geo, mat, SMOKE_COUNT);
    this.smoke.frustumCulled = false;
    this.flakes = new Float32Array(SMOKE_COUNT * 3);
    for (let i = 0; i < SMOKE_COUNT; i++) {
      this.flakes[i * 3] = (rng() - 0.5) * SMOKE_BOX;
      this.flakes[i * 3 + 1] = rng() * 12;
      this.flakes[i * 3 + 2] = (rng() - 0.5) * SMOKE_BOX;
    }
    const ember = new THREE.Color(0xff7a2a);
    for (let i = 0; i < SMOKE_COUNT; i += 5) this.smoke.setColorAt(i, ember);
    this.group.add(this.smoke);
  }

  override dispose(): void {
    super.dispose();
    this.smoke.geometry.dispose();
    (this.smoke.material as THREE.Material).dispose();
  }

  private get defeated(): boolean {
    return this.state.trophies.includes('dragon');
  }

  /** Gardiens du chemin encore debout (ils ne reviennent pas une fois vaincus). */
  get guardsLeft(): number {
    return this.sim.monsters.filter((m) => VOLCAN_CAMPS.some((c) => c.id === m.campId) && !(m.mode === 'dead' || m.cleared)).length;
  }

  get guardsTotal(): number {
    return VOLCAN_CAMPS.reduce((n, c) => n + c.monsters.length, 0);
  }

  protected override aimTarget(): Point3 | null {
    return null;
  }

  /** La lave n'abîme rien : elle fait reculer jusqu'au dernier sol sûr. */
  private checkLava(dt: number, hero: HeroState): void {
    this.lavaCooldown = Math.max(0, this.lavaCooldown - dt);
    const w = this.layout.world;
    const below = w.get(Math.floor(hero.x), Math.floor(hero.y) - 1, Math.floor(hero.z));
    if (hero.onGround && below !== Block.Lava && below !== Block.Air) this.safe = { x: hero.x, z: hero.z };
    if (below === Block.Lava && hero.onGround) {
      this.volcanHooks.moveHero(this.safe.x, this.safe.z);
      this.hooks.sparks.burst(hero.x, hero.y + 0.3, hero.z, 0xff7a2a, 12);
      if (this.lavaCooldown === 0) {
        this.hooks.toast(TEXT_LAVA);
        audio.sfx('knock');
        this.lavaCooldown = LAVA_COOLDOWN_S;
      }
    }
  }

  private updateSmoke(dt: number, hero: HeroState): void {
    for (let i = 0; i < SMOKE_COUNT; i++) {
      const k = i * 3;
      this.flakes[k + 1] += dt * (0.6 + (i % 4) * 0.2);
      this.flakes[k] += Math.sin(this.clock * 0.7 + i) * dt * 0.3;
      if (this.flakes[k + 1] > 12) this.flakes[k + 1] -= 12;
      const wx = hero.x + wrap(this.flakes[k] - hero.x, SMOKE_BOX);
      const wz = hero.z + wrap(this.flakes[k + 2] - hero.z, SMOKE_BOX);
      this.matrix.makeTranslation(wx, hero.y - 1 + this.flakes[k + 1], wz);
      this.smoke.setMatrixAt(i, this.matrix);
    }
    this.smoke.instanceMatrix.needsUpdate = true;
  }

  protected override updateChapter(dt: number, hero: HeroState, playing: boolean): void {
    this.clock += dt;
    this.updateSmoke(dt, hero);
    // Le Dragon flotte au-dessus du cratère en battant des ailes.
    const c = this.layout.crater;
    this.dragon.root.visible = !this.defeated;
    this.dragon.root.position.y = c.floorY + 2.4 + Math.sin(this.clock * 1.2) * 0.3;
    this.dragon.swing('wingL', Math.sin(this.clock * 2) * 0.3, 'z');
    this.dragon.swing('wingR', -Math.sin(this.clock * 2) * 0.3, 'z');
    if (!playing) return;
    this.checkLava(dt, hero);
    // Les gardiens vaincus ne reviennent pas ; le chemin s'ouvre quand ils sont tous tombés.
    for (const m of this.sim.monsters) if (m.mode === 'dead') m.cleared = true;
    const left = this.guardsLeft;
    if (!this.announced && left === 0) {
      this.announced = true;
      this.hooks.toast(TEXT_PATH_FREE);
      audio.sfx('rumble');
      this.hooks.onProgress();
    }
    this.interactions.remove(this.dragonTalk.id);
    if (left === 0 && !this.defeated) this.interactions.add(this.dragonTalk);
    if (Math.hypot(c.boss.x - hero.x, c.boss.z - hero.z) < SEEN_RADIUS + 10) markSeen(this.state, 'dragon');
  }

  override fightSetup(kind: 'arena' | 'boss'): FightSetup | null {
    if (kind === 'arena') return null;
    const c = this.layout.crater;
    return { plan: c, phase: 6, boss: 'dragon', outro: 'O6', nextChapter: 7, back: { x: c.center.x, z: c.center.z + 8 } };
  }

  objective(): Objective {
    const left = this.guardsLeft;
    const done: string[] = [];
    let text: string;
    let target: { x: number; z: number };
    if (this.defeated) {
      text = OBJECTIVE_GAME_DONE;
      target = this.layout.arch;
      done.push(FINALE_TITLE);
    } else if (left > 0) {
      text = `${FINALE_TITLE} : ${FINALE_TASK.replace('{n}', String(this.guardsTotal - left)).replace('{goal}', String(this.guardsTotal))}`;
      const next = VOLCAN_CAMPS.find((camp) => this.sim.monsters.some((m) => m.campId === camp.id && !(m.mode === 'dead' || m.cleared)));
      target = next ?? this.layout.crater.boss;
    } else {
      text = `${FINALE_TITLE} : ${FINALE_FACE}`;
      target = this.layout.crater.boss;
    }
    return { text, target, current: [{ text, active: true }], done };
  }

  override snapshot(): ReturnType<WorldLife['snapshot']> & { guardsLeft: number; dragon: { x: number; z: number }; safe: { x: number; z: number }; bridge: VolcanLayout['bridge'] } {
    return { ...super.snapshot(), guardsLeft: this.guardsLeft, dragon: this.layout.crater.boss, safe: this.safe, bridge: this.layout.bridge };
  }
}

/** Ramène v dans [−size/2, size/2[. */
function wrap(v: number, size: number): number {
  return ((((v + size / 2) % size) + size) % size) - size / 2;
}

/** Libellé de la progression des gardiens (toast). */
export function guardsToast(n: number, goal: number): string {
  return TEXT_PATH_GUARDS.replace('{n}', String(n)).replace('{goal}', String(goal));
}
