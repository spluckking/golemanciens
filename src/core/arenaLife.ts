import * as THREE from 'three';
import { ARENA_WINS_TO_FINISH } from '../data/balance';
import { audio } from '../audio/audio';
import { CubeModel } from '../entities/cubeModel';
import { MODELS } from '../entities/models';
import { Block } from '../world/blocks';
import type { ArenaPlan, Cell } from '../world/structures';
import type { VoxelWorld } from '../world/voxelWorld';
import { progress, type GameState } from './gameState';
import type { Interactable, Interactions } from './interactions';

/** Textes nouveaux (à valider par le parent). */
const TEXT_FIGHT = 'Combattre';
export const TEXT_ARENA_FINISHED = 'Tu as gagné les 3 combats de l’arène !';

export interface ArenaHooks {
  rebuild: (cells: Cell[]) => void;
  burst: (x: number, y: number, z: number, color: number, count?: number) => void;
  toast: (text: string) => void;
  /** Le gong a sonné : lancer un combat. */
  onFight: () => void;
}

/**
 * Arène dans le monde : la barrière de l'entrée s'ouvre quand les quêtes obligatoires sont faites ;
 * le gong lance un combat (3 victoires pour terminer l'arène).
 */
export class ArenaLife {
  private readonly gong: CubeModel;
  private readonly gongTalk: Interactable;
  private open = false;
  private ring = 0;
  private time = 0;

  constructor(
    private readonly plan: ArenaPlan,
    private readonly world: VoxelWorld,
    parent: THREE.Group,
    private readonly state: GameState,
    private readonly interactions: Interactions,
    private readonly isOpen: () => boolean,
    private readonly hooks: ArenaHooks,
  ) {
    this.gong = new CubeModel(MODELS.gong);
    this.gong.root.position.set(plan.gong.x, plan.floorY, plan.gong.z);
    this.gong.root.rotation.y = plan.gong.facing;
    parent.add(this.gong.root);
    this.gongTalk = {
      id: 'arena-gong',
      x: plan.gong.x,
      y: plan.floorY,
      z: plan.gong.z + 1.2,
      radius: 2.4,
      label: TEXT_FIGHT,
      action: () => this.strike(),
    };
    this.sync();
  }

  get finished(): boolean {
    return progress(this.state).arena.wins >= ARENA_WINS_TO_FINISH;
  }

  private strike(): void {
    if (this.finished) {
      this.hooks.toast(TEXT_ARENA_FINISHED);
      return;
    }
    this.ring = 1.2;
    audio.sfx('gong');
    this.hooks.burst(this.plan.gong.x, this.plan.floorY + 1.4, this.plan.gong.z, 0xffe27a, 20);
    this.hooks.onFight();
  }

  /** Ouvre la barrière une fois l'arène débloquée, et propose le gong. */
  private sync(): void {
    const open = this.isOpen();
    if (open && !this.open) {
      this.open = true;
      const cells = this.plan.gate.filter((c) => this.world.get(c.x, c.y, c.z) !== Block.Air);
      if (cells.length) {
        for (const c of cells) {
          this.world.set(c.x, c.y, c.z, Block.Air);
          this.hooks.burst(c.x + 0.5, c.y + 0.5, c.z + 0.5, 0xc4965c, 4);
        }
        this.hooks.rebuild(cells);
      }
      this.interactions.add(this.gongTalk);
    }
  }

  update(dt: number): void {
    this.time += dt;
    this.sync();
    // Le disque du gong vibre quand on le frappe.
    this.ring = Math.max(0, this.ring - dt);
    const disc = this.gong.part('disc');
    if (disc) disc.rotation.x = this.ring > 0 ? Math.sin(this.time * 30) * 0.12 * this.ring : 0;
  }
}
