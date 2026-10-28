import * as THREE from 'three';
import { BOSSES, type BossId } from '../data/creatures';
import { animateWalk, CubeModel } from '../entities/cubeModel';
import { MODELS, SHELF_SLOTS, type ModelId } from '../entities/models';
import { greeting } from '../story/dialogues';
import type { DialogBubble } from '../ui/dialog';
import type { HomePlan } from '../world/structures';
import type { VoxelWorld } from '../world/voxelWorld';
import type { GameState } from './gameState';
import type { Interactions, Interactable } from './interactions';

/** Textes d'interface nouveaux (à valider par le parent). */
const TEXT_SLEEP = 'Dormir';
const TEXT_LOOK = 'Regarder';
export const TEXT_SHELF_EMPTY = 'Ici, tu poseras un trophée après chaque boss vaincu.';
export const TEXT_SHELF_LIST = 'Tes trophées : ';

const BED_RADIUS = 2;
const SHELF_RADIUS = 2.2;
const RIVET_RADIUS = 1.8;
const RIVET_SPEED = 0.9;
const RIVET_PAUSE_S = 2.5;

/** Statuette de chaque boss pour l'étagère (les autres arrivent avec leur jalon). */
const TROPHY_MODELS: Partial<Record<BossId, ModelId>> = { roiSlime: 'trophyRoiSlime' };

export interface HomeHooks {
  dialog: DialogBubble;
  toast: (text: string) => void;
  onSleep: () => void;
}

/**
 * Maison du joueur (SPEC.md § 18) : le lit (dormir = golems soignés et point de retour),
 * l'étagère à trophées et Rivet, le golem de maison qui balaie.
 */
export class HomeLife {
  private readonly shelf: CubeModel;
  private readonly trophyGroup = new THREE.Group();
  private readonly rivet: CubeModel;
  private readonly rivetTalk: Interactable;
  private readonly floorY: number;
  private rivetX: number;
  private rivetZ: number;
  private rivetFacing = 0;
  private rivetTarget = 0;
  private rivetPause = 1;
  private walkPhase = 0;
  private time = 0;
  private shownTrophies = '';

  constructor(
    private readonly plan: HomePlan,
    world: VoxelWorld,
    group: THREE.Group,
    private readonly state: GameState,
    interactions: Interactions,
    hooks: HomeHooks,
  ) {
    this.floorY = world.standY(Math.floor(plan.wake.x), Math.floor(plan.wake.z));
    const place = (id: ModelId, x: number, z: number, facing: number): CubeModel => {
      const m = new CubeModel(MODELS[id]);
      m.root.position.set(x, this.floorY, z);
      m.root.rotation.y = facing;
      group.add(m.root);
      return m;
    };

    place('bed', plan.bed.x, plan.bed.z, plan.bed.facing);
    this.shelf = place('trophyShelf', plan.shelf.x, plan.shelf.z, plan.shelf.facing);
    this.shelf.root.add(this.trophyGroup);
    this.refreshTrophies();

    const [sx, sz] = plan.golemPath[0];
    this.rivetX = sx;
    this.rivetZ = sz;
    this.rivet = place('rivet', sx, sz, 0);

    interactions.add({ id: 'home-bed', x: plan.bed.x + 0.8, y: this.floorY, z: plan.bed.z, radius: BED_RADIUS, label: TEXT_SLEEP, action: hooks.onSleep });
    interactions.add({
      id: 'home-shelf',
      x: plan.shelf.x - 0.8,
      y: this.floorY,
      z: plan.shelf.z,
      radius: SHELF_RADIUS,
      label: TEXT_LOOK,
      action: () => hooks.toast(this.shelfText()),
    });
    this.rivetTalk = {
      id: 'npc-rivet',
      x: sx,
      y: this.floorY,
      z: sz,
      radius: RIVET_RADIUS,
      label: 'Parler',
      action: () => {
        this.rivetPause = 4;
        hooks.dialog.show(greeting('rivet'));
      },
    };
    interactions.add(this.rivetTalk);
  }

  /** Texte de l'étagère : la liste des trophées, ou ce qu'elle attend. */
  shelfText(): string {
    const names = this.state.trophies.map((id) => BOSSES[id as BossId]?.name).filter(Boolean);
    return names.length ? `${TEXT_SHELF_LIST}${names.join(', ')}.` : TEXT_SHELF_EMPTY;
  }

  /** Pose sur l'étagère les statuettes des boss vaincus. */
  refreshTrophies(): void {
    const key = this.state.trophies.join(',');
    if (key === this.shownTrophies) return;
    this.shownTrophies = key;
    this.trophyGroup.clear();
    this.state.trophies.forEach((id, i) => {
      const model = TROPHY_MODELS[id as BossId];
      const slot = SHELF_SLOTS[i];
      if (!model || !slot) return;
      const t = new CubeModel(MODELS[model], 1.4);
      t.root.position.set(...slot);
      this.trophyGroup.add(t.root);
    });
  }

  /** Rivet fait sa ronde dans la maison, s'arrête et balaie ; il se tourne vers le héros quand on lui parle. */
  update(dt: number, hero: { x: number; z: number }): void {
    this.time += dt;
    this.refreshTrophies();
    let moving = false;
    let sweep = 0;
    if (this.rivetPause > 0) {
      this.rivetPause -= dt;
      const near = Math.hypot(hero.x - this.rivetX, hero.z - this.rivetZ) < 2.5;
      if (near) this.rivetFacing = Math.atan2(-(hero.x - this.rivetX), -(hero.z - this.rivetZ));
      else sweep = Math.sin(this.time * 7) * 0.35;
      if (this.rivetPause <= 0) this.rivetTarget = (this.rivetTarget + 1) % this.plan.golemPath.length;
    } else {
      const [tx, tz] = this.plan.golemPath[this.rivetTarget];
      const dx = tx - this.rivetX;
      const dz = tz - this.rivetZ;
      const d = Math.hypot(dx, dz);
      const step = RIVET_SPEED * dt;
      if (d <= step) {
        this.rivetX = tx;
        this.rivetZ = tz;
        this.rivetPause = RIVET_PAUSE_S;
      } else {
        this.rivetX += (dx / d) * step;
        this.rivetZ += (dz / d) * step;
        this.rivetFacing = Math.atan2(-dx, -dz);
        moving = true;
      }
    }
    this.walkPhase = moving ? this.walkPhase + dt * 5 : this.walkPhase * Math.max(0, 1 - dt * 8);
    animateWalk(this.rivet, this.walkPhase, moving ? 1 : 0.3);
    if (sweep !== 0) this.rivet.swing('armR', sweep, 'z');
    this.rivet.root.position.set(this.rivetX, this.floorY, this.rivetZ);
    this.rivet.root.rotation.y = this.rivetFacing;
    this.rivetTalk.x = this.rivetX;
    this.rivetTalk.z = this.rivetZ;
  }

  /** Où l'on se réveille après avoir dormi (point de retour). */
  wakePoint(): { x: number; y: number; z: number } {
    return { x: this.plan.wake.x, y: this.floorY, z: this.plan.wake.z };
  }

  snapshot(): { rivet: { x: number; z: number }; bed: { x: number; z: number }; shelf: { x: number; z: number }; trophies: number } {
    return {
      rivet: { x: this.rivetX, z: this.rivetZ },
      bed: { x: this.plan.bed.x, z: this.plan.bed.z },
      shelf: { x: this.plan.shelf.x, z: this.plan.shelf.z },
      trophies: this.trophyGroup.children.length,
    };
  }
}
