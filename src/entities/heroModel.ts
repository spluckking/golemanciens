import * as THREE from 'three';
import { animateWalk, CubeModel } from './cubeModel';
import { HERO_STAFF_TIP, MODELS } from './models';

/**
 * Apprenti golémancien : uniforme bleu nuit, cape violette, bâton à gemme.
 * 6 pièces, donc 6 appels de dessin. L'origine est entre les pieds ; il regarde vers -Z.
 */
export class HeroModel {
  private readonly model = new CubeModel(MODELS.hero);
  readonly root = this.model.root;
  readonly staffTip = new THREE.Object3D();
  private walkPhase = 0;
  private attackTime = 0;

  constructor() {
    this.staffTip.position.set(...HERO_STAFF_TIP);
    this.model.part('armR')?.add(this.staffTip);
  }

  /** Lance l'animation de coup de bâton. */
  playAttack(): void {
    this.attackTime = 0.3;
  }

  update(dt: number, speed: number, onGround: boolean): void {
    const moving = speed > 0.3 && onGround;
    if (moving) this.walkPhase += dt * speed * 2.2;
    else this.walkPhase *= Math.max(0, 1 - dt * 10);
    animateWalk(this.model, this.walkPhase, moving ? 1 : 0.5);
    this.model.swing('cape', Math.min(speed / 5.5, 1) * 0.35 + (onGround ? 0 : 0.3));

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
