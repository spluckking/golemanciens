import * as THREE from 'three';
import { animateWalk, CubeModel } from './cubeModel';
import { HERO_WAND_TIP, MODELS } from './models';

/**
 * Cape en deux pans : elle se soulève vers l'arrière avec la vitesse et ondule doucement.
 * Les angles restent toujours négatifs (vers +Z, le dos) : la cape ne passe jamais dans le corps
 * ni devant, et s'écarte assez pour laisser passer les jambes en marchant.
 */
export function animateCape(model: CubeModel, speed: number, airborne: boolean, time: number): void {
  const lift = 0.06 + Math.min(speed / 5.5, 1) * 0.5 + (airborne ? 0.3 : 0);
  const flutter = Math.abs(Math.sin(time * (2.5 + speed * 0.8))) * (0.03 + lift * 0.12);
  model.swing('cape', -(lift + flutter * 0.4));
  model.swing('capeLow', -(lift * 0.35 + flutter));
}

/**
 * Apprenti golémancien : uniforme bleu nuit, cape violette en deux pans, baguette magique à pointe lumineuse.
 * 10 pièces, donc 10 appels de dessin. L'origine est entre les pieds ; il regarde vers -Z.
 */
export class HeroModel {
  private readonly model = new CubeModel(MODELS.hero);
  readonly root = this.model.root;
  readonly wandTip = new THREE.Object3D();
  private walkPhase = 0;
  private attackTime = 0;
  private time = 0;

  constructor() {
    this.wandTip.position.set(...HERO_WAND_TIP);
    this.model.part('wand')?.add(this.wandTip);
  }

  /** Lance l'animation de coup de baguette. */
  playAttack(): void {
    this.attackTime = 0.3;
  }

  update(dt: number, speed: number, onGround: boolean): void {
    this.time += dt;
    const moving = speed > 0.3 && onGround;
    if (moving) this.walkPhase += dt * speed * 2.2;
    else this.walkPhase *= Math.max(0, 1 - dt * 10);
    animateWalk(this.model, this.walkPhase, moving ? 1 : 0.5);
    animateCape(this.model, speed, !onGround, this.time);

    if (this.attackTime > 0) {
      this.attackTime = Math.max(0, this.attackTime - dt);
      const t = 1 - this.attackTime / 0.3;
      this.model.swing('armR', -Math.sin(t * Math.PI) * 1.4);
    }
    if (!onGround) {
      this.model.swing('legL', 0.4);
      this.model.swing('legR', -0.2);
    }
  }

  dispose(): void {
    this.root.removeFromParent();
  }
}
