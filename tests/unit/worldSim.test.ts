import { describe, expect, it } from 'vitest';
import { WorldSim, golemWorldDamage, monsterWorldDamage, type HeroPose } from '../../src/combat/realtime/worldSim';
import { compassRotation } from '../../src/core/compass';
import { createGolem } from '../../src/core/gameState';
import { createRng } from '../../src/core/rng';
import { KO_SLEEP_S, MONSTER_RESPAWN_S } from '../../src/data/balance';
import { Block } from '../../src/world/blocks';
import { VoxelWorld } from '../../src/world/voxelWorld';

/** Terrain plat de 64×64, sol en y = 5. */
function flat(): { world: VoxelWorld; solid: (x: number, y: number, z: number) => boolean } {
  const world = new VoxelWorld(64, 32, 64);
  world.fill(0, 0, 0, 63, 4, 63, Block.Stone);
  return { world, solid: (x, y, z) => world.solidAt(x, y, z) };
}

function run(sim: WorldSim, hero: HeroPose, seconds: number, step = 1 / 30): ReturnType<WorldSim['update']> {
  const all: ReturnType<WorldSim['update']> = [];
  for (let t = 0; t < seconds; t += step) all.push(...sim.update(step, hero));
  return all;
}

describe('dégâts dans le monde', () => {
  it('golem : ATQ × 0,5, doublé si la faiblesse correspond', () => {
    expect(golemWorldDamage(8, ['rock'], 'plant')).toEqual({ amount: 4, superEffective: false });
    expect(golemWorldDamage(8, ['plant', 'sun'], 'sun')).toEqual({ amount: 6, superEffective: true });
    expect(monsterWorldDamage(5)).toBe(2.5);
  });
});

describe('golems qui suivent le héros', () => {
  it('rejoignent leur place derrière le héros', () => {
    const { solid } = flat();
    const sim = new WorldSim(solid, createRng(1));
    const g = sim.addGolem(createGolem('pierre'), 10, 5, 10);
    const hero = { x: 20, y: 5, z: 20, facing: 0 };
    run(sim, hero, 4);
    expect(Math.hypot(g.body.x - hero.x, g.body.z - hero.z)).toBeLessThan(3.5);
    // Derrière le héros (il regarde vers −Z, donc derrière = +Z).
    expect(g.body.z).toBeGreaterThan(hero.z);
  });

  it('sont téléportés près du héros s’il est trop loin', () => {
    const { solid } = flat();
    const sim = new WorldSim(solid, createRng(1));
    const g = sim.addGolem(createGolem('mousse'), 5, 5, 5);
    run(sim, { x: 50, y: 5, z: 50, facing: 0 }, 0.1);
    expect(Math.hypot(g.body.x - 50, g.body.z - 50)).toBeLessThan(4);
  });

  it('sont téléportés s’ils restent bloqués derrière un mur', () => {
    const { world, solid } = flat();
    world.fill(0, 5, 30, 63, 9, 30, Block.Stone);
    const sim = new WorldSim(solid, createRng(1));
    const g = sim.addGolem(createGolem('pierre'), 20, 5, 34);
    const hero = { x: 20, y: 5, z: 25, facing: Math.PI };
    run(sim, hero, 3);
    expect(g.body.z).toBeLessThan(30);
  });
});

describe('monstres et combat', () => {
  function campScene(species: 'slime' | 'zombie') {
    const { solid } = flat();
    const sim = new WorldSim(solid, createRng(7));
    const a = sim.addMonster('m0', species, 'camp', 30, 5, 30);
    const b = sim.addMonster('m1', species, 'camp', 31, 5, 31);
    const hero = { x: 33, y: 5, z: 33, facing: 0 };
    return { sim, a, b, hero };
  }

  it('les monstres sont neutres tant qu’on ne les attaque pas', () => {
    const { sim, a, b, hero } = campScene('slime');
    sim.addGolem(createGolem('pierre'), 33, 5, 34);
    const events = run(sim, hero, 10);
    expect(a.mode).toBe('idle');
    expect(b.mode).toBe('idle');
    expect(events.filter((e) => e.type === 'damage')).toHaveLength(0);
  });

  it('sans golem éveillé, l’étincelle n’engage pas les monstres', () => {
    const { sim, a } = campScene('slime');
    expect(sim.engage(a)).toBe(false);
    expect(a.mode).toBe('idle');
  });

  it('toucher un monstre engage tout son groupe', () => {
    const { sim, a, b } = campScene('slime');
    sim.addGolem(createGolem('pierre'), 33, 5, 34);
    expect(sim.engage(a)).toBe(true);
    expect(a.mode).toBe('engaged');
    expect(b.mode).toBe('engaged');
    expect(sim.heroTarget).toBe(a);
  });

  it('un golem au niveau de la phase bat un groupe de 2 en 10 à 20 s (sans faiblesse), sans être K.O.', () => {
    const { sim, a, b, hero } = campScene('slime');
    const g = sim.addGolem(createGolem('pierre'), 33, 5, 34);
    sim.engage(a);
    let t = 0;
    const step = 1 / 30;
    while ((a.mode !== 'dead' || b.mode !== 'dead') && t < 60) {
      sim.update(step, hero);
      t += step;
    }
    expect(a.mode).toBe('dead');
    expect(b.mode).toBe('dead');
    expect(t).toBeGreaterThanOrEqual(10);
    expect(t).toBeLessThanOrEqual(20);
    expect(g.ko).toBe(false);
  });

  it('la faiblesse accélère le combat (Mousse contre des slimes)', () => {
    const { sim, a, b, hero } = campScene('slime');
    sim.addGolem(createGolem('mousse'), 33, 5, 34);
    sim.engage(a);
    run(sim, hero, 13);
    expect(a.mode).toBe('dead');
    expect(b.mode).toBe('dead');
  });

  it('un monstre vaincu réapparaît au bout de 3 minutes dans son camp', () => {
    const { sim, a, b, hero } = campScene('zombie');
    sim.addGolem(createGolem('pierre'), 33, 5, 34);
    sim.engage(a);
    run(sim, hero, 40);
    expect(a.mode).toBe('dead');
    run(sim, hero, MONSTER_RESPAWN_S, 0.25);
    expect(a.mode).toBe('idle');
    expect(a.hp).toBe(a.maxHp);
    expect(Math.hypot(a.body.x - a.home.x, a.body.z - a.home.z)).toBeLessThan(5);
    expect(b.mode).toBe('idle');
  });

  it('abandonne la poursuite à plus de 8 blocs de son camp, rentre et se soigne', () => {
    const { solid } = flat();
    const sim = new WorldSim(solid, createRng(3));
    const m = sim.addMonster('m', 'zombie', 'camp', 20, 5, 20);
    const g = sim.addGolem(createGolem('pierre'), 22, 5, 20);
    sim.engage(m);
    m.hp = 10;
    // Le héros s'enfuit loin : le golem le suit, le monstre finit par abandonner.
    const hero = { x: 45, y: 5, z: 20, facing: Math.PI / 2 };
    sim.heroTarget = null;
    g.target = null;
    let gaveUp = false;
    for (let t = 0; t < 10; t += 1 / 30) {
      sim.update(1 / 30, hero);
      if (m.mode === 'returning' || m.mode === 'idle') gaveUp = true;
      expect(Math.hypot(m.body.x - m.home.x, m.body.z - m.home.z)).toBeLessThan(9.5);
    }
    expect(gaveUp).toBe(true);
    run(sim, hero, 10);
    expect(m.mode).toBe('idle');
    expect(m.hp).toBe(m.maxHp);
  });

  it('abandonne après 5 s de poursuite sans pouvoir frapper', () => {
    const { world, solid } = flat();
    // Un mur sépare le monstre du golem : il ne peut pas l'atteindre.
    world.fill(0, 5, 25, 63, 8, 25, Block.Stone);
    const sim = new WorldSim(solid, createRng(3));
    const m = sim.addMonster('m', 'slime', 'camp', 20, 5, 22);
    sim.addGolem(createGolem('pierre'), 20, 5, 28);
    sim.engage(m);
    run(sim, { x: 20, y: 5, z: 30, facing: 0 }, 6);
    expect(m.mode === 'returning' || m.mode === 'idle').toBe(true);
  });

  it('les monstres n’entrent pas dans le village', () => {
    const { solid } = flat();
    const sim = new WorldSim(solid, createRng(5), [{ x: 40, z: 20, r: 10 }]);
    const m = sim.addMonster('m', 'zombie', 'camp', 27, 5, 20);
    const g = sim.addGolem(createGolem('pierre'), 34, 5, 20);
    sim.engage(m);
    for (let t = 0; t < 6; t += 1 / 30) {
      g.body.x = 34;
      g.body.z = 20;
      sim.update(1 / 30, { x: 36, y: 5, z: 20, facing: Math.PI / 2 });
      expect(Math.hypot(m.body.x - 40, m.body.z - 20)).toBeGreaterThanOrEqual(9.9);
    }
  });
});

describe('PV, K.O. et soins', () => {
  it('les PV remontent de 2 % par seconde après 4 s sans être touché', () => {
    const { solid } = flat();
    const sim = new WorldSim(solid, createRng(1));
    const data = createGolem('pierre');
    const g = sim.addGolem(data, 20, 5, 22);
    const hero = { x: 20, y: 5, z: 20, facing: 0 };
    data.hp = 20;
    g.sinceHit = 0;
    run(sim, hero, 3.9);
    expect(data.hp).toBe(20);
    run(sim, hero, 5.1);
    // ≈ 5 s de soin à 0,8 PV/s.
    expect(data.hp).toBeGreaterThan(23);
    expect(data.hp).toBeLessThan(25);
  });

  it('un golem K.O. dort 20 s, puis se réveille avec 30 % de ses PV', () => {
    const { solid } = flat();
    const sim = new WorldSim(solid, createRng(1));
    const data = createGolem('pierre');
    const g = sim.addGolem(data, 20, 5, 22);
    const other = sim.addGolem(createGolem('mousse'), 21, 5, 22);
    const m = sim.addMonster('m', 'zombie', 'camp', 20, 5, 23);
    sim.engage(m);
    data.hp = 1;
    m.target = g;
    m.attackTimer = 0;
    const hero = { x: 20, y: 5, z: 20, facing: 0 };
    const events = run(sim, hero, 0.2);
    expect(events.some((e) => e.type === 'golemKO')).toBe(true);
    expect(g.ko).toBe(true);
    expect(other.ko).toBe(false);
    m.mode = 'dead';
    m.cleared = true;
    run(sim, hero, KO_SLEEP_S - 1);
    expect(g.ko).toBe(true);
    const wake = run(sim, hero, 1.5);
    expect(wake.some((e) => e.type === 'golemWake')).toBe(true);
    expect(g.ko).toBe(false);
    expect(data.hp).toBeGreaterThanOrEqual(Math.round(data.maxHp * 0.3));
  });

  it('si tous les golems sont K.O. : un seul événement, puis tout le monde est soigné au point de retour', () => {
    const { solid } = flat();
    const sim = new WorldSim(solid, createRng(1));
    const data = createGolem('pierre');
    const g = sim.addGolem(data, 20, 5, 22);
    const m = sim.addMonster('m', 'zombie', 'camp', 20, 5, 23);
    sim.engage(m);
    data.hp = 1;
    m.attackTimer = 0;
    const hero = { x: 20, y: 5, z: 20, facing: 0 };
    const events = run(sim, hero, 1);
    expect(events.filter((e) => e.type === 'allKO')).toHaveLength(1);
    sim.recoverAt(40, 5, 40);
    expect(g.ko).toBe(false);
    expect(data.hp).toBe(data.maxHp);
    expect(Math.hypot(g.body.x - 40, g.body.z - 41.5)).toBeLessThan(2);
    expect(m.mode).toBe('idle');
    expect(m.hp).toBe(m.maxHp);
  });
});

describe('boussole', () => {
  it('pointe droit devant, à droite, à gauche et derrière', () => {
    // Caméra vers −Z (yaw 0), héros en (0, 0).
    expect(compassRotation(0, 0, 0, 0, -10)).toBeCloseTo(0);
    expect(compassRotation(0, 0, 0, 10, 0)).toBeCloseTo(90);
    expect(compassRotation(0, 0, 0, -10, 0)).toBeCloseTo(-90);
    expect(Math.abs(compassRotation(0, 0, 0, 0, 10))).toBeCloseTo(180);
    // Caméra tournée vers +X (yaw −π/2) : une cible à l'est est droit devant.
    expect(compassRotation(-Math.PI / 2, 0, 0, 10, 0)).toBeCloseTo(0);
  });
});
