import type { GolemData } from '../../core/gameState';
import { collides, moveBody, type Body, type BodyShape, type SolidFn } from '../../core/physics';
import type { Rng } from '../../core/rng';
import {
  KO_SLEEP_S,
  KO_WAKE_HP,
  MONSTER_CHASE_GIVE_UP_S,
  MONSTER_LEASH_BLOCKS,
  MONSTER_RESPAWN_S,
  REGEN_DELAY_S,
  REGEN_PER_S,
  WORLD_DAMAGE_FACTOR,
  WORLD_GOLEM_ATTACK_INTERVAL_S,
  WORLD_MONSTER_ATTACK_INTERVAL_S,
  WEAKNESS_MULTIPLIER,
  monsterStats,
} from '../../data/balance';
import { MONSTERS, unlockedAttacks, type AttackType, type MonsterSpecies } from '../../data/creatures';

/**
 * Simulation du monde (sans rendu) : golems qui suivent le héros, monstres neutres,
 * combat en temps réel, K.O. et soins. SPEC.md § 4.5, § 5.2 et § 6.
 */

const GRAVITY = 30;
const GOLEM_SHAPE: BodyShape = { halfWidth: 0.35, height: 1.4, autoStep: true };
const MONSTER_SHAPE: BodyShape = { halfWidth: 0.35, height: 0.9, autoStep: true };
const GOLEM_SPEED = 6;
const GOLEM_RANGE = 1.6;
const MONSTER_RANGE = 1.5;
const MONSTER_SPEED = 3.4;
const MONSTER_WANDER_SPEED = 1.2;
const MONSTER_WANDER_RADIUS = 4;
const TELEPORT_DISTANCE = 12;
const STUCK_TIME_S = 2;
const TARGET_SEARCH_RADIUS = 16;

export interface Agent {
  body: Body;
  facing: number;
  /** Vitesse horizontale effective, pour l'animation. */
  speed: number;
}

export interface GolemAgent extends Agent {
  data: GolemData;
  /** Types de ses attaques débloquées : il utilise tout seul la plus efficace. */
  types: AttackType[];
  slot: number;
  ko: boolean;
  sleepTimer: number;
  sinceHit: number;
  attackTimer: number;
  target: MonsterAgent | null;
  stuckTimer: number;
  lastGoalDist: number;
}

export type MonsterMode = 'idle' | 'engaged' | 'returning' | 'dead';

export interface MonsterAgent extends Agent {
  id: string;
  species: MonsterSpecies;
  campId: string;
  home: { x: number; y: number; z: number };
  hp: number;
  maxHp: number;
  atk: number;
  weakness: AttackType;
  mode: MonsterMode;
  target: GolemAgent | null;
  attackTimer: number;
  chaseTimer: number;
  respawnTimer: number;
  wanderTimer: number;
  wanderTo: { x: number; z: number } | null;
  /** Le groupe a été vidé pour une quête : il ne réapparaît plus. */
  cleared: boolean;
}

export type WorldEvent =
  | { type: 'damage'; target: 'golem' | 'monster'; amount: number; superEffective: boolean; x: number; y: number; z: number }
  | { type: 'monsterDefeated'; monster: MonsterAgent }
  | { type: 'golemKO'; golem: GolemAgent }
  | { type: 'golemWake'; golem: GolemAgent }
  | { type: 'allKO' };

export interface SafeZone {
  x: number;
  z: number;
  r: number;
}

export interface HeroPose {
  x: number;
  y: number;
  z: number;
  facing: number;
}

/** Dégâts d'un golem dans le monde : ATQ × 0,5, ×1,5 si l'une de ses attaques a le type de la faiblesse. */
export function golemWorldDamage(atk: number, types: readonly AttackType[], weakness: AttackType): { amount: number; superEffective: boolean } {
  const superEffective = types.includes(weakness);
  return { amount: atk * WORLD_DAMAGE_FACTOR * (superEffective ? WEAKNESS_MULTIPLIER : 1), superEffective };
}

export function monsterWorldDamage(atk: number): number {
  return atk * WORLD_DAMAGE_FACTOR;
}

function dist2(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz);
}

/** Hauteur du sol sous (x, z), en descendant depuis fromY. */
export function groundY(solid: SolidFn, x: number, z: number, fromY: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  let y = Math.floor(fromY);
  while (y > 0 && solid(xi, y, zi)) y++;
  while (y > 0 && !solid(xi, y - 1, zi)) y--;
  return y;
}

export class WorldSim {
  readonly golems: GolemAgent[] = [];
  readonly monsters: MonsterAgent[] = [];
  /** Monstre visé par le héros (les golems l'attaquent en priorité). */
  heroTarget: MonsterAgent | null = null;
  private allKoSent = false;

  constructor(
    private readonly solid: SolidFn,
    private readonly rng: Rng,
    private readonly safeZones: SafeZone[] = [],
  ) {}

  addGolem(data: GolemData, x: number, y: number, z: number): GolemAgent {
    const g: GolemAgent = {
      data,
      types: unlockedAttacks(data.species, data.stage).map((a) => a.type),
      slot: this.golems.length,
      body: { x, y, z, vy: 0, onGround: false },
      facing: 0,
      speed: 0,
      ko: data.hp <= 0,
      sleepTimer: data.hp <= 0 ? KO_SLEEP_S : 0,
      sinceHit: REGEN_DELAY_S,
      attackTimer: 0.5,
      target: null,
      stuckTimer: 0,
      lastGoalDist: Infinity,
    };
    this.golems.push(g);
    return g;
  }

  addMonster(id: string, species: MonsterSpecies, campId: string, x: number, y: number, z: number): MonsterAgent {
    const info = MONSTERS[species];
    const { hp, atk } = monsterStats(info.phase);
    const m: MonsterAgent = {
      id,
      species,
      campId,
      home: { x, y, z },
      body: { x, y, z, vy: 0, onGround: false },
      facing: 0,
      speed: 0,
      hp,
      maxHp: hp,
      atk,
      weakness: info.weakness,
      mode: 'idle',
      target: null,
      attackTimer: 1,
      chaseTimer: 0,
      respawnTimer: 0,
      wanderTimer: this.rng() * 3,
      wanderTo: null,
      cleared: false,
    };
    this.monsters.push(m);
    return m;
  }

  hasAwakeGolem(): boolean {
    return this.golems.some((g) => !g.ko);
  }

  /** Le héros touche un monstre avec l'étincelle : tout son groupe est engagé (s'il y a un golem éveillé). */
  engage(monster: MonsterAgent): boolean {
    if (monster.mode === 'dead' || !this.hasAwakeGolem()) return false;
    for (const m of this.monsters) {
      if (m.campId === monster.campId && (m.mode === 'idle' || m.mode === 'engaged')) {
        if (m.mode === 'idle') {
          m.mode = 'engaged';
          m.chaseTimer = 0;
          m.attackTimer = 1;
        }
      }
    }
    this.heroTarget = monster;
    return true;
  }

  update(dt: number, hero: HeroPose): WorldEvent[] {
    const events: WorldEvent[] = [];
    for (const g of this.golems) this.updateGolem(g, dt, hero, events);
    for (const m of this.monsters) this.updateMonster(m, dt, events);
    if (this.heroTarget && this.heroTarget.mode !== 'engaged') this.heroTarget = null;

    if (this.golems.length > 0 && this.golems.every((g) => g.ko)) {
      if (!this.allKoSent) {
        this.allKoSent = true;
        events.push({ type: 'allKO' });
      }
    } else {
      this.allKoSent = false;
    }
    return events;
  }

  /** Après un K.O. général : golems soignés près du point de retour, monstres rentrés et soignés. */
  recoverAt(x: number, y: number, z: number): void {
    this.golems.forEach((g, i) => {
      g.data.hp = g.data.maxHp;
      g.ko = false;
      g.sleepTimer = 0;
      g.target = null;
      g.body.x = x + (i % 2 === 0 ? -1.2 : 1.2);
      g.body.z = z + 1.5 + Math.floor(i / 2);
      g.body.y = groundY(this.solid, g.body.x, g.body.z, y + 2);
      g.body.vy = 0;
    });
    for (const m of this.monsters) {
      if (m.mode === 'dead') continue;
      this.sendHome(m, true);
    }
    this.heroTarget = null;
    this.allKoSent = false;
  }

  // ---------- Golems ----------

  private slotPosition(g: GolemAgent, hero: HeroPose): { x: number; z: number } {
    const side = g.slot % 2 === 0 ? -1 : 1;
    const back = 1.8 + Math.floor(g.slot / 2) * 1.3;
    const lateral = side * 1.3;
    const fx = -Math.sin(hero.facing);
    const fz = -Math.cos(hero.facing);
    // Derrière le héros (−avant) et sur le côté (droite = (−fz, fx)).
    return { x: hero.x - fx * back - fz * lateral, z: hero.z - fz * back + fx * lateral };
  }

  private teleportNear(g: GolemAgent, hero: HeroPose): void {
    const p = this.slotPosition(g, hero);
    g.body.x = p.x;
    g.body.z = p.z;
    g.body.y = groundY(this.solid, p.x, p.z, hero.y + 2);
    if (collides(this.solid, g.body.x, g.body.y, g.body.z, GOLEM_SHAPE)) {
      g.body.x = hero.x;
      g.body.z = hero.z;
      g.body.y = hero.y;
    }
    g.body.vy = 0;
    g.stuckTimer = 0;
    g.lastGoalDist = Infinity;
  }

  private updateGolem(g: GolemAgent, dt: number, hero: HeroPose, events: WorldEvent[]): void {
    const heroDist = dist2(g.body.x, g.body.z, hero.x, hero.z);
    if (g.ko) {
      g.speed = 0;
      if (heroDist > TELEPORT_DISTANCE) this.teleportNear(g, hero);
      this.fall(g.body, dt, GOLEM_SHAPE);
      g.sleepTimer -= dt;
      if (g.sleepTimer <= 0) {
        g.ko = false;
        g.data.hp = Math.max(1, Math.round(g.data.maxHp * KO_WAKE_HP));
        g.sinceHit = 0;
        events.push({ type: 'golemWake', golem: g });
      }
      return;
    }

    g.sinceHit += dt;
    if (g.sinceHit >= REGEN_DELAY_S && g.data.hp < g.data.maxHp) {
      g.data.hp = Math.min(g.data.maxHp, g.data.hp + g.data.maxHp * REGEN_PER_S * dt);
    }

    g.target = this.chooseTarget(g);
    if (g.target) {
      const t = g.target;
      const d = dist2(g.body.x, g.body.z, t.body.x, t.body.z);
      if (d > GOLEM_RANGE) {
        this.moveToward(g, t.body.x, t.body.z, GOLEM_SPEED, dt, GOLEM_SHAPE);
      } else {
        g.speed = 0;
        this.fall(g.body, dt, GOLEM_SHAPE);
        g.facing = Math.atan2(-(t.body.x - g.body.x), -(t.body.z - g.body.z));
      }
      g.attackTimer -= dt;
      if (d <= GOLEM_RANGE && g.attackTimer <= 0) {
        g.attackTimer = WORLD_GOLEM_ATTACK_INTERVAL_S;
        const { amount, superEffective } = golemWorldDamage(g.data.atk, g.types, t.weakness);
        t.hp -= amount;
        t.chaseTimer = 0;
        events.push({ type: 'damage', target: 'monster', amount, superEffective, x: t.body.x, y: t.body.y + 1.1, z: t.body.z });
        if (t.hp <= 0) this.defeat(t, events);
      }
      if (heroDist > TELEPORT_DISTANCE + 6) this.teleportNear(g, hero);
      return;
    }

    // Suivre le héros en formation souple.
    g.attackTimer = Math.min(g.attackTimer, 0.6);
    if (heroDist > TELEPORT_DISTANCE) {
      this.teleportNear(g, hero);
      return;
    }
    const slot = this.slotPosition(g, hero);
    const d = dist2(g.body.x, g.body.z, slot.x, slot.z);
    if (d > 0.7) {
      this.moveToward(g, slot.x, slot.z, Math.min(GOLEM_SPEED + 1, 1.5 + d * 2.2), dt, GOLEM_SHAPE);
      // Bloqué : aucun progrès pendant 2 s alors qu'on est encore loin.
      if (d > 3 && d >= g.lastGoalDist - 0.01) g.stuckTimer += dt;
      else g.stuckTimer = 0;
      g.lastGoalDist = d;
      if (g.stuckTimer > STUCK_TIME_S) this.teleportNear(g, hero);
    } else {
      g.speed = 0;
      g.stuckTimer = 0;
      this.fall(g.body, dt, GOLEM_SHAPE);
    }
  }

  private chooseTarget(g: GolemAgent): MonsterAgent | null {
    const h = this.heroTarget;
    if (h && h.mode === 'engaged') return h;
    if (g.target && g.target.mode === 'engaged') return g.target;
    let best: MonsterAgent | null = null;
    let bestD = TARGET_SEARCH_RADIUS;
    for (const m of this.monsters) {
      if (m.mode !== 'engaged') continue;
      const d = dist2(g.body.x, g.body.z, m.body.x, m.body.z);
      if (d < bestD) {
        best = m;
        bestD = d;
      }
    }
    return best;
  }

  // ---------- Monstres ----------

  private updateMonster(m: MonsterAgent, dt: number, events: WorldEvent[]): void {
    switch (m.mode) {
      case 'dead':
        m.speed = 0;
        if (m.cleared) return;
        m.respawnTimer -= dt;
        if (m.respawnTimer <= 0) {
          m.mode = 'idle';
          m.hp = m.maxHp;
          m.body.x = m.home.x;
          m.body.y = m.home.y;
          m.body.z = m.home.z;
          m.body.vy = 0;
        }
        return;
      case 'idle':
        this.wander(m, dt);
        return;
      case 'returning': {
        const d = dist2(m.body.x, m.body.z, m.home.x, m.home.z);
        if (d < 1) {
          m.mode = 'idle';
          m.hp = m.maxHp;
          m.speed = 0;
          this.fall(m.body, dt, MONSTER_SHAPE);
        } else {
          this.moveToward(m, m.home.x, m.home.z, MONSTER_SPEED, dt, MONSTER_SHAPE);
          if (d < 3) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * dt);
        }
        return;
      }
      case 'engaged':
        this.fight(m, dt, events);
    }
  }

  private wander(m: MonsterAgent, dt: number): void {
    m.wanderTimer -= dt;
    if (m.wanderTimer <= 0) {
      m.wanderTimer = 3 + this.rng() * 3;
      if (this.rng() < 0.6) {
        const a = this.rng() * Math.PI * 2;
        const r = this.rng() * MONSTER_WANDER_RADIUS;
        m.wanderTo = { x: m.home.x + Math.cos(a) * r, z: m.home.z + Math.sin(a) * r };
      } else {
        m.wanderTo = null;
      }
    }
    if (m.wanderTo && dist2(m.body.x, m.body.z, m.wanderTo.x, m.wanderTo.z) > 0.3) {
      this.moveToward(m, m.wanderTo.x, m.wanderTo.z, MONSTER_WANDER_SPEED, dt, MONSTER_SHAPE);
    } else {
      m.speed = 0;
      this.fall(m.body, dt, MONSTER_SHAPE);
    }
  }

  private fight(m: MonsterAgent, dt: number, events: WorldEvent[]): void {
    if (!m.target || m.target.ko) m.target = this.nearestAwakeGolem(m);
    const t = m.target;
    if (!t) {
      this.sendHome(m, false);
      return;
    }
    const d = dist2(m.body.x, m.body.z, t.body.x, t.body.z);
    if (d > MONSTER_RANGE) {
      this.moveToward(m, t.body.x, t.body.z, MONSTER_SPEED, dt, MONSTER_SHAPE);
      m.chaseTimer += dt;
    } else {
      m.speed = 0;
      m.chaseTimer = 0;
      this.fall(m.body, dt, MONSTER_SHAPE);
      m.facing = Math.atan2(-(t.body.x - m.body.x), -(t.body.z - m.body.z));
      m.attackTimer -= dt;
      if (m.attackTimer <= 0) {
        m.attackTimer = WORLD_MONSTER_ATTACK_INTERVAL_S;
        const amount = monsterWorldDamage(m.atk);
        t.data.hp -= amount;
        t.sinceHit = 0;
        events.push({ type: 'damage', target: 'golem', amount, superEffective: false, x: t.body.x, y: t.body.y + 1.6, z: t.body.z });
        if (t.data.hp <= 0) {
          t.data.hp = 0;
          t.ko = true;
          t.sleepTimer = KO_SLEEP_S;
          t.target = null;
          events.push({ type: 'golemKO', golem: t });
        }
      }
    }
    // Abandon : trop loin du camp, ou poursuite trop longue sans pouvoir frapper.
    const fromHome = dist2(m.body.x, m.body.z, m.home.x, m.home.z);
    if (fromHome > MONSTER_LEASH_BLOCKS || m.chaseTimer > MONSTER_CHASE_GIVE_UP_S) this.sendHome(m, false);
  }

  private nearestAwakeGolem(m: MonsterAgent): GolemAgent | null {
    let best: GolemAgent | null = null;
    let bestD = Infinity;
    for (const g of this.golems) {
      if (g.ko) continue;
      const d = dist2(m.body.x, m.body.z, g.body.x, g.body.z);
      if (d < bestD) {
        best = g;
        bestD = d;
      }
    }
    return best;
  }

  private sendHome(m: MonsterAgent, instant: boolean): void {
    m.mode = 'returning';
    m.target = null;
    m.chaseTimer = 0;
    if (instant) {
      m.body.x = m.home.x;
      m.body.y = m.home.y;
      m.body.z = m.home.z;
      m.body.vy = 0;
      m.hp = m.maxHp;
      m.mode = 'idle';
    }
  }

  private defeat(m: MonsterAgent, events: WorldEvent[]): void {
    m.hp = 0;
    m.mode = 'dead';
    m.target = null;
    m.respawnTimer = MONSTER_RESPAWN_S;
    if (this.heroTarget === m) this.heroTarget = null;
    for (const g of this.golems) if (g.target === m) g.target = null;
    events.push({ type: 'monsterDefeated', monster: m });
  }

  // ---------- Déplacements ----------

  private fall(body: Body, dt: number, shape: BodyShape): void {
    body.vy = Math.max(body.vy - GRAVITY * dt, -30);
    moveBody(this.solid, body, 0, body.vy * dt, 0, shape);
    if (body.onGround && body.vy < 0) body.vy = 0;
  }

  private moveToward(a: Agent, tx: number, tz: number, speed: number, dt: number, shape: BodyShape): void {
    const dx = tx - a.body.x;
    const dz = tz - a.body.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-4) return;
    const step = Math.min(len, speed * dt);
    const x0 = a.body.x;
    const z0 = a.body.z;
    a.body.vy = Math.max(a.body.vy - GRAVITY * dt, -30);
    moveBody(this.solid, a.body, (dx / len) * step, a.body.vy * dt, (dz / len) * step, shape);
    if (a.body.onGround && a.body.vy < 0) a.body.vy = 0;
    // Les monstres n'entrent pas dans les zones sûres (villages).
    if (shape === MONSTER_SHAPE) {
      for (const zone of this.safeZones) {
        if (dist2(a.body.x, a.body.z, zone.x, zone.z) < zone.r) {
          a.body.x = x0;
          a.body.z = z0;
        }
      }
    }
    a.facing = Math.atan2(-dx, -dz);
    a.speed = dt > 0 ? Math.hypot(a.body.x - x0, a.body.z - z0) / dt : 0;
  }
}
