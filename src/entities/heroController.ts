import { moveBody, type Body, type BodyShape, type SolidFn } from '../core/physics';

export const HERO_SHAPE: BodyShape = { halfWidth: 0.3, height: 1.7, autoStep: true };
export const HERO_SPEED = 5.5;
export const GRAVITY = 30;
export const JUMP_SPEED = 9.5;
const WATER_SLOWDOWN = 0.6;

export interface HeroState extends Body {
  /** Orientation du personnage (radians, 0 = regarde vers -Z). */
  facing: number;
  /** Vitesse horizontale effective, pour l'animation de marche. */
  speed: number;
}

export interface HeroIntent {
  /** Direction voulue dans le monde (longueur 0 à 1). */
  moveX: number;
  moveZ: number;
  jump: boolean;
}

export function createHero(x: number, y: number, z: number, facing: number): HeroState {
  return { x, y, z, vy: 0, onGround: false, facing, speed: 0 };
}

/** Un pas de simulation du héros. */
export function stepHero(hero: HeroState, intent: HeroIntent, dt: number, solid: SolidFn, inWater: boolean): void {
  const len = Math.min(1, Math.hypot(intent.moveX, intent.moveZ));
  const speed = HERO_SPEED * len * (inWater ? WATER_SLOWDOWN : 1);
  let vx = 0;
  let vz = 0;
  if (len > 0.01) {
    const nx = intent.moveX / Math.hypot(intent.moveX, intent.moveZ);
    const nz = intent.moveZ / Math.hypot(intent.moveX, intent.moveZ);
    vx = nx * speed;
    vz = nz * speed;
    hero.facing = turnToward(hero.facing, Math.atan2(-nx, -nz), dt * 12);
  }
  if (intent.jump && hero.onGround) {
    hero.vy = JUMP_SPEED;
    hero.onGround = false;
  }
  hero.vy = Math.max(hero.vy - GRAVITY * dt, -30);
  const x0 = hero.x;
  const z0 = hero.z;
  moveBody(solid, hero, vx * dt, hero.vy * dt, vz * dt, HERO_SHAPE);
  if (hero.onGround && hero.vy < 0) hero.vy = 0;
  hero.speed = dt > 0 ? Math.hypot(hero.x - x0, hero.z - z0) / dt : 0;
}

function turnToward(current: number, target: number, maxStep: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}
