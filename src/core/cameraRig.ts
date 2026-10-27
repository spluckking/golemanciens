import * as THREE from 'three';
import { raycastVoxels, type SolidFn } from './physics';

const DISTANCE = 8;
const MIN_PITCH = 0.12;
const MAX_PITCH = 1.15;
const TARGET_HEIGHT = 1.5;

/** Caméra à la 3e personne : derrière et au-dessus du héros, rapprochée si un mur gêne. */
export class CameraRig {
  yaw: number;
  pitch = 0.42;
  private currentDistance = DISTANCE;
  private readonly target = new THREE.Vector3();
  private initialized = false;

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    yaw: number,
  ) {
    this.yaw = yaw;
  }

  rotate(deltaYaw: number, deltaPitch: number): void {
    this.yaw += deltaYaw;
    this.pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, this.pitch + deltaPitch));
  }

  /** Vecteurs « avant » et « droite » au sol, pour orienter le déplacement du joystick. */
  forward(): { x: number; z: number } {
    return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
  }

  update(dt: number, heroX: number, heroY: number, heroZ: number, solid: SolidFn): void {
    const tx = heroX;
    const ty = heroY + TARGET_HEIGHT;
    const tz = heroZ;
    if (!this.initialized) {
      this.target.set(tx, ty, tz);
      this.initialized = true;
    } else {
      // Lissage vertical (marches, sauts) ; l'horizontale suit directement.
      this.target.x = tx;
      this.target.z = tz;
      this.target.y += (ty - this.target.y) * Math.min(1, dt * 10);
    }
    const cp = Math.cos(this.pitch);
    const dx = Math.sin(this.yaw) * cp;
    const dy = Math.sin(this.pitch);
    const dz = Math.cos(this.yaw) * cp;
    const hit = raycastVoxels(solid, this.target.x, this.target.y, this.target.z, dx, dy, dz, DISTANCE);
    const wanted = hit === null ? DISTANCE : Math.max(1.2, hit - 0.4);
    // Rapprochement immédiat, éloignement en douceur.
    this.currentDistance = wanted < this.currentDistance ? wanted : this.currentDistance + (wanted - this.currentDistance) * Math.min(1, dt * 4);
    const d = this.currentDistance;
    this.camera.position.set(this.target.x + dx * d, this.target.y + dy * d, this.target.z + dz * d);
    this.camera.lookAt(this.target);
  }
}
