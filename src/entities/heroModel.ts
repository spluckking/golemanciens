import * as THREE from 'three';
import { animateWalk, CubeModel } from './cubeModel';
import { HERO_STAFF_TIP, MODELS } from './models';

/** Cape en deux pans : elle se soulève avec la vitesse et ondule doucement. */
export function animateCape(model: CubeModel, speed: number, airborne: boolean, time: number): void {
  const lift = Math.min(speed / 5.5, 1) * 0.35 + (airborne ? 0.3 : 0);
  const flutter = Math.sin(time * (3 + speed)) * (0.04 + lift * 0.15);
  model.swing('cape', lift + flutter * 0.5);
  model.swing('capeLow', lift * 0.6 + flutter);
}

/**
 * Apprenti golémancien : uniforme bleu nuit, cape violette en deux pans, bâton à crosse et gemme lumineuse.
 * 9 pièces, donc 9 appels de dessin. L'origine est entre les pieds ; il regarde vers -Z.
 */
export class HeroModel {
  private readonly model = new CubeModel(MODELS.hero);
  readonly root = this.model.root;
  readonly staffTip = new THREE.Object3D();
  private walkPhase = 0;
  private attackTime = 0;
  private time = 0;

  constructor() {
    this.staffTip.position.set(...HERO_STAFF_TIP);
    this.model.part('armR')?.add(this.staffTip);
  }

  /** Lance l'animation de coup de bâton. */
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
