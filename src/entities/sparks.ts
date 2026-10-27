import * as THREE from 'three';
import type { SolidFn } from '../core/physics';

const SPARK_SPEED = 16;
const SPARK_LIFE = 0.45;
const MAX_SPARKS = 6;
const MAX_PARTICLES = 96;

interface Spark {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

/** Étincelles du bâton et éclats de cubes (InstancedMesh). */
export class Sparks {
  readonly group = new THREE.Group();
  private readonly sparks: Spark[] = [];
  private readonly particles: Particle[] = [];
  private readonly burst: THREE.InstancedMesh;
  private readonly sparkGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
  private readonly particleGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  private readonly sparkMat = new THREE.MeshBasicMaterial({ color: 0xbff8ff });
  private readonly particleMat = new THREE.MeshBasicMaterial({ color: 0x8ff0ff });
  private readonly tmp = new THREE.Matrix4();
  private readonly onImpact: (x: number, y: number, z: number) => void;

  constructor(onImpact: (x: number, y: number, z: number) => void = () => {}) {
    this.onImpact = onImpact;
    for (let i = 0; i < MAX_SPARKS; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, this.sparkMat);
      mesh.visible = false;
      this.group.add(mesh);
      this.sparks.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0 });
    }
    this.burst = new THREE.InstancedMesh(this.particleGeo, this.particleMat, MAX_PARTICLES);
    this.burst.count = 0;
    this.burst.frustumCulled = false;
    this.group.add(this.burst);
  }

  /** Lance une étincelle depuis (x, y, z) dans la direction horizontale de l'angle facing. */
  fire(x: number, y: number, z: number, facing: number): void {
    const s = this.sparks.find((sp) => sp.life <= 0);
    if (!s) return;
    s.mesh.position.set(x, y, z);
    s.mesh.visible = true;
    s.vx = -Math.sin(facing) * SPARK_SPEED;
    s.vy = -0.8;
    s.vz = -Math.cos(facing) * SPARK_SPEED;
    s.life = SPARK_LIFE;
  }

  private explode(x: number, y: number, z: number): void {
    for (let i = 0; i < 10 && this.particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 2.5;
      this.particles.push({ x, y, z, vx: Math.cos(a) * sp, vy: 1 + Math.random() * 3, vz: Math.sin(a) * sp, life: 0.5 });
    }
    this.onImpact(x, y, z);
  }

  update(dt: number, solid: SolidFn): void {
    for (const s of this.sparks) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const p = s.mesh.position;
      p.x += s.vx * dt;
      p.y += s.vy * dt;
      p.z += s.vz * dt;
      s.mesh.rotation.x += dt * 12;
      s.mesh.rotation.y += dt * 9;
      if (solid(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)) || s.life <= 0) {
        s.life = 0;
        s.mesh.visible = false;
        this.explode(p.x, p.y, p.z);
      }
    }
    let n = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= 12 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const k = p.life / 0.5;
      this.tmp.makeScale(k, k, k).setPosition(p.x, p.y, p.z);
      this.burst.setMatrixAt(n++, this.tmp);
    }
    this.burst.count = n;
    this.burst.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.sparkGeo.dispose();
    this.particleGeo.dispose();
    this.sparkMat.dispose();
    this.particleMat.dispose();
  }
}
