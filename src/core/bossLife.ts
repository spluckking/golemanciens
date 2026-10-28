import * as THREE from 'three';
import { TEXT_FACE_BOSS } from '../data/bossQuest';
import { CubeModel } from '../entities/cubeModel';
import { MODELS } from '../entities/models';
import type { BiomeLayout } from '../world/prairie';
import type { GameState } from './gameState';
import type { Interactable, Interactions } from './interactions';

export interface BossHooks {
  /** Le héros affronte le Roi Slime. */
  onBossFight: () => void;
}

/**
 * Marais du Roi Slime : la piste de flaques vertes (visible pendant la quête P1)
 * et le boss qui attend au centre ; « Affronter » lance le combat.
 */
export class BossLife {
  private readonly group = new THREE.Group();
  private readonly puddles: CubeModel[] = [];
  private readonly boss: CubeModel;
  private readonly talk: Interactable;
  private time = 0;
  private offered = false;

  constructor(
    private readonly layout: BiomeLayout,
    parent: THREE.Group,
    private readonly state: GameState,
    private readonly interactions: Interactions,
    hooks: BossHooks,
  ) {
    parent.add(this.group);
    const world = layout.world;
    for (const [i, p] of layout.slimeTrail.entries()) {
      const m = new CubeModel(MODELS.puddle);
      m.root.position.set(p.x, world.standY(Math.floor(p.x), Math.floor(p.z)) + 0.01, p.z);
      m.root.rotation.y = i * 1.3;
      this.group.add(m.root);
      this.puddles.push(m);
    }
    const { marsh } = layout;
    this.boss = new CubeModel(MODELS.roiSlime);
    this.boss.root.position.set(marsh.boss.x, marsh.floorY, marsh.boss.z);
    // Il regarde vers le nord-est, d'où arrive la piste.
    this.boss.root.rotation.y = Math.atan2(-6, 10);
    this.group.add(this.boss.root);
    this.talk = { id: 'boss-roiSlime', x: marsh.boss.x, y: marsh.floorY, z: marsh.boss.z, radius: 3.4, label: TEXT_FACE_BOSS, action: hooks.onBossFight };
    this.sync();
  }

  private sync(): void {
    const step = this.state.bossQuest;
    for (const p of this.puddles) p.root.visible = step === 'active';
    this.boss.root.visible = step !== 'defeated';
    const offer = step === 'active';
    if (offer !== this.offered) {
      this.offered = offer;
      if (offer) this.interactions.add(this.talk);
      else this.interactions.remove(this.talk.id);
    }
  }

  update(dt: number): void {
    this.time += dt;
    this.sync();
    if (!this.boss.root.visible) return;
    // Le Roi Slime rebondit doucement sur place.
    const body = this.boss.part('body');
    if (body) {
      const hop = Math.abs(Math.sin(this.time * 1.6));
      body.position.y = hop * 0.25;
      body.scale.set(1 + (1 - hop) * 0.06, 1 - (1 - hop) * 0.08, 1 + (1 - hop) * 0.06);
    }
  }

  /** Premières flaques encore à suivre (cible de la boussole) : la plus proche du marais n'est pas utile. */
  trailTarget(hero: { x: number; z: number }): { x: number; z: number } {
    const trail = this.layout.slimeTrail;
    // On vise la flaque suivante après la plus proche du héros ; au bout, le marais.
    let nearest = 0;
    let best = Infinity;
    trail.forEach((p, i) => {
      const d = Math.hypot(p.x - hero.x, p.z - hero.z);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    return trail[nearest + 1] ?? this.layout.marsh.boss;
  }
}
