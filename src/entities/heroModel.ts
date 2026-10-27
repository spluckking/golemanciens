import * as THREE from 'three';

/** Pièce de modèle en cubes : une boîte décalée dans un pivot (pour les articulations). */
function part(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  offset: [number, number, number],
  geometries: THREE.BufferGeometry[],
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  geometries.push(geo);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(offset[0], offset[1], offset[2]);
  return mesh;
}

/**
 * Apprenti golémancien : uniforme bleu nuit, cape violette, bâton à gemme.
 * L'origine du groupe est entre les pieds ; il regarde vers -Z.
 */
export class HeroModel {
  readonly root = new THREE.Group();
  private readonly leftArm = new THREE.Group();
  private readonly rightArm = new THREE.Group();
  private readonly leftLeg = new THREE.Group();
  private readonly rightLeg = new THREE.Group();
  private readonly cape: THREE.Mesh;
  private readonly body = new THREE.Group();
  readonly staffTip = new THREE.Object3D();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private walkPhase = 0;
  private attackTime = 0;

  constructor() {
    const mat = (color: number, emissive = 0): THREE.MeshLambertMaterial => {
      const m = new THREE.MeshLambertMaterial({ color, emissive });
      this.materials.push(m);
      return m;
    };
    const skin = mat(0xf2c6a0);
    const hair = mat(0x5a3a22);
    const robe = mat(0x2d3a8c);
    const trim = mat(0xf0c43c);
    const capeMat = mat(0x7b2d8b);
    const boots = mat(0x3a2a1e);
    const wood = mat(0x8a5a32);
    const gem = mat(0x6ff0ff, 0x2aa8c0);
    const eye = mat(0x1d1d2b);
    const g = this.geometries;

    // Jambes (pivot à la hanche).
    for (const [leg, x] of [[this.leftLeg, -0.13], [this.rightLeg, 0.13]] as const) {
      leg.position.set(x, 0.62, 0);
      leg.add(part(0.22, 0.48, 0.24, robe, [0, -0.26, 0], g));
      leg.add(part(0.24, 0.14, 0.28, boots, [0, -0.55, -0.02], g));
      this.body.add(leg);
    }
    // Tronc, ceinture, tête.
    this.body.add(part(0.52, 0.56, 0.3, robe, [0, 0.9, 0], g));
    this.body.add(part(0.54, 0.08, 0.32, trim, [0, 0.66, 0], g));
    this.body.add(part(0.12, 0.12, 0.04, trim, [0.12, 1.06, -0.16], g));
    this.body.add(part(0.44, 0.42, 0.42, skin, [0, 1.4, 0], g));
    this.body.add(part(0.46, 0.14, 0.44, hair, [0, 1.62, 0.01], g));
    this.body.add(part(0.46, 0.26, 0.1, hair, [0, 1.48, 0.18], g));
    this.body.add(part(0.07, 0.07, 0.02, eye, [-0.1, 1.42, -0.215], g));
    this.body.add(part(0.07, 0.07, 0.02, eye, [0.1, 1.42, -0.215], g));
    // Cape (accrochée aux épaules).
    this.cape = part(0.56, 0.86, 0.05, capeMat, [0, -0.43, 0], g);
    const capePivot = new THREE.Group();
    capePivot.position.set(0, 1.17, 0.18);
    capePivot.add(this.cape);
    this.body.add(capePivot);
    // Bras (pivot à l'épaule) ; le bâton est dans la main droite.
    for (const [arm, x] of [[this.leftArm, -0.34], [this.rightArm, 0.34]] as const) {
      arm.position.set(x, 1.12, 0);
      arm.add(part(0.16, 0.5, 0.2, robe, [0, -0.22, 0], g));
      arm.add(part(0.16, 0.1, 0.18, skin, [0, -0.5, 0], g));
      this.body.add(arm);
    }
    const staff = new THREE.Group();
    staff.position.set(0, -0.5, -0.06);
    staff.add(part(0.07, 1.25, 0.07, wood, [0, 0.15, 0], g));
    staff.add(part(0.16, 0.16, 0.16, gem, [0, 0.82, 0], g));
    this.staffTip.position.set(0, 0.82, 0);
    staff.add(this.staffTip);
    this.rightArm.add(staff);

    this.root.add(this.body);
  }

  /** Lance l'animation de coup de bâton. */
  playAttack(): void {
    this.attackTime = 0.3;
  }

  update(dt: number, speed: number, onGround: boolean): void {
    const moving = speed > 0.3 && onGround;
    if (moving) this.walkPhase += dt * speed * 2.2;
    else this.walkPhase *= Math.max(0, 1 - dt * 10);
    const swing = moving ? Math.sin(this.walkPhase) * 0.7 : Math.sin(this.walkPhase) * 0.7 * 0.5;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
    this.leftArm.rotation.x = -swing * 0.8;
    this.body.position.y = moving ? Math.abs(Math.sin(this.walkPhase)) * 0.06 : 0;
    this.cape.parent!.rotation.x = 0.1 + Math.min(speed / 5.5, 1) * 0.35 + (onGround ? 0 : 0.3);

    if (this.attackTime > 0) {
      this.attackTime = Math.max(0, this.attackTime - dt);
      const t = 1 - this.attackTime / 0.3;
      this.rightArm.rotation.x = -Math.sin(t * Math.PI) * 1.6;
    } else {
      this.rightArm.rotation.x = swing * 0.8 * 0.5 - 0.25;
    }
    if (!onGround) {
      this.leftLeg.rotation.x = 0.4;
      this.rightLeg.rotation.x = -0.2;
    }
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
  }
}
