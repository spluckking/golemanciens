import { describe, expect, it } from 'vitest';
import { raycastVoxels } from '../../src/core/physics';
import { createHero, stepHero, HERO_SPEED } from '../../src/entities/heroController';
import { Block } from '../../src/world/blocks';
import { VoxelWorld } from '../../src/world/voxelWorld';

function flatWorld(): VoxelWorld {
  const w = new VoxelWorld(32, 32, 32);
  w.fill(0, 0, 0, 31, 4, 31, Block.Stone);
  return w;
}

const still = { moveX: 0, moveZ: 0, jump: false };

function run(w: VoxelWorld, hero: ReturnType<typeof createHero>, intent: typeof still, seconds: number): void {
  const solid = (x: number, y: number, z: number): boolean => w.solidAt(x, y, z);
  for (let t = 0; t < seconds; t += 1 / 60) stepHero(hero, intent, 1 / 60, solid, false);
}

describe('collisions du héros', () => {
  it('tombe et se pose sur le sol', () => {
    const w = flatWorld();
    const hero = createHero(10.5, 12, 10.5, 0);
    run(w, hero, still, 2);
    expect(hero.y).toBeCloseTo(5, 5);
    expect(hero.onGround).toBe(true);
  });

  it('avance à la bonne vitesse sur du plat', () => {
    const w = flatWorld();
    const hero = createHero(10.5, 5, 20.5, 0);
    run(w, hero, still, 0.2);
    const z0 = hero.z;
    run(w, hero, { moveX: 0, moveZ: -1, jump: false }, 1);
    expect(z0 - hero.z).toBeGreaterThan(HERO_SPEED * 0.9);
    expect(z0 - hero.z).toBeLessThan(HERO_SPEED * 1.1);
  });

  it('est arrêté par un mur de 2 blocs', () => {
    const w = flatWorld();
    w.fill(0, 5, 15, 31, 6, 15, Block.Stone);
    const hero = createHero(10.5, 5, 20.5, 0);
    run(w, hero, { moveX: 0, moveZ: -1, jump: false }, 3);
    expect(hero.z).toBeGreaterThan(16.2);
    expect(hero.z).toBeLessThan(16.4);
  });

  it('monte tout seul une marche d’un bloc', () => {
    const w = flatWorld();
    w.fill(0, 5, 0, 31, 5, 15, Block.Stone);
    const hero = createHero(10.5, 5, 20.5, 0);
    run(w, hero, { moveX: 0, moveZ: -1, jump: false }, 2);
    expect(hero.z).toBeLessThan(15);
    expect(hero.y).toBeCloseTo(6, 5);
  });

  it('saute plus haut qu’un bloc', () => {
    const w = flatWorld();
    const hero = createHero(10.5, 5, 10.5, 0);
    run(w, hero, still, 0.2);
    run(w, hero, { moveX: 0, moveZ: 0, jump: true }, 0.25);
    expect(hero.y).toBeGreaterThan(6.2);
  });

  it('ne sort pas de la carte', () => {
    const w = flatWorld();
    const hero = createHero(2.5, 5, 10.5, 0);
    run(w, hero, { moveX: -1, moveZ: 0, jump: false }, 2);
    expect(hero.x).toBeGreaterThanOrEqual(0.3);
  });
});

describe('lancer de rayon voxel', () => {
  it('trouve la distance du premier bloc', () => {
    const w = flatWorld();
    w.set(10, 8, 5, Block.Stone);
    const solid = (x: number, y: number, z: number): boolean => w.solidAt(x, y, z);
    const d = raycastVoxels(solid, 10.5, 8.5, 10.5, 0, 0, -1, 20);
    expect(d).toBeCloseTo(4.5, 5);
  });

  it('retourne null si rien n’est touché', () => {
    const w = flatWorld();
    const solid = (x: number, y: number, z: number): boolean => w.solidAt(x, y, z);
    expect(raycastVoxels(solid, 10.5, 8.5, 10.5, 0, 1, 0, 10)).toBeNull();
  });
});
