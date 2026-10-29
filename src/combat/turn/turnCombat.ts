import type { GolemData } from '../../core/gameState';
import { pick, randInt, type Rng } from '../../core/rng';
import {
  ALL_ROUND_MULTIPLIER,
  ARENA_MONSTER_DAMAGE_FACTOR,
  ATTACK_POWER,
  BLIND_MISS_CHANCE,
  BOSS_DAMAGE_FACTOR,
  GOLEM_DAMAGE_VARIANCE,
  MONSTER_DAMAGE_MAX,
  MONSTER_DAMAGE_MIN,
  MONSTER_MISS_CHANCE,
  SHIELD_DAMAGE_TAKEN,
  SHIELD_REFLECT,
  SLEEP_MAX_TURNS,
  SLEEP_MIN_TURNS,
  WEAKNESS_MULTIPLIER,
  bossStats,
  monsterStats,
  type AttackSlot,
} from '../../data/balance';
import {
  BOSSES,
  GOLEMS,
  MONSTERS,
  unlockedAttacks,
  type AttackEffect,
  type AttackInfo,
  type AttackType,
  type BossId,
  type BossStage,
  type MonsterSpecies,
} from '../../data/creatures';
import type { QuestionCategory } from '../../questions/difficulty';

/**
 * Combat au tour par tour (SPEC.md § 7.1), sans rendu ni interface.
 * Le golem actif joue (attaque après une question, ou changement), puis le monstre actif.
 */

export type CombatKind = 'arena' | 'boss';
/** player : choix du joueur ; monster : le monstre va jouer ; switch : golem actif K.O., changement gratuit. */
export type CombatPhase = 'player' | 'monster' | 'switch' | 'won' | 'lost';

export interface CombatGolem {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  atk: number;
  attacks: AttackInfo[];
  ultimateUsed: boolean;
  /** Bouclier : le prochain coup reçu est réduit de moitié et renvoyé en partie. */
  shield: boolean;
  /** Arc-en-ciel : bonus permanent sur toutes ses attaques. */
  allRound: boolean;
  /** Pris dans une toile (Reine Araignée) : il passe son prochain tour. */
  stunned: number;
  /** Vient de se dégager d'une toile : la suivante ne le reprend pas avant qu'il ait rejoué. */
  freed: boolean;
}

export interface CombatMonster {
  id: string;
  name: string;
  /** Espèce ou boss : sert à choisir le modèle 3D. */
  model: string;
  /** PV max d'une étape : chaque étape repart à ce total. */
  maxHp: number;
  hp: number;
  atk: number;
  stages: readonly BossStage[];
  stage: number;
  /** Tours à passer (Étourdi). */
  stunned: number;
  /** Tours à passer endormi (réveillé s'il est touché). */
  asleep: number;
  blind: boolean;
}

export type CombatEvent =
  | { type: 'attack'; golemId: string; attack: AttackInfo; hit: boolean }
  | { type: 'damage'; target: 'monster' | 'golem'; id: string; amount: number; superEffective: boolean; armor: boolean }
  | { type: 'effect'; id: string; effect: AttackEffect }
  | { type: 'wake'; id: string }
  | { type: 'skip'; id: string; reason: 'stun' | 'sleep' }
  /** Le golem actif est pris dans une toile, puis passe son tour. */
  | { type: 'golemStunned'; id: string }
  | { type: 'golemSkip'; id: string }
  | { type: 'monsterAttack'; monsterId: string; targetId: string; attack: string; hit: boolean }
  | { type: 'reflect'; id: string; amount: number }
  | { type: 'stage'; id: string; stage: number }
  | { type: 'ko'; target: 'monster' | 'golem'; id: string }
  | { type: 'nextMonster'; id: string }
  | { type: 'switch'; id: string; free: boolean }
  | { type: 'end'; result: 'won' | 'lost' };

/** Une attaque Force pose un calcul, une attaque Magie une énigme. */
export function questionCategory(attack: AttackInfo): QuestionCategory {
  return attack.kind === 'force' ? 'calc' : 'riddle';
}

/** L'attaque vise-t-elle la faiblesse de cette étape ? */
export function isSuperEffective(type: AttackType, stage: BossStage): boolean {
  return type === stage.weakness;
}

/**
 * Dégâts d'une attaque de golem qui touche : ATQ × puissance × (1,5 si faiblesse) × (±10 %).
 * Une armure (dragon, étape 1) n'est entamée que par son type.
 */
export function golemAttackDamage(
  golem: Pick<CombatGolem, 'atk' | 'allRound'>,
  attack: AttackInfo,
  stage: BossStage,
  rng: Rng,
): { amount: number; superEffective: boolean; armor: boolean } {
  if (stage.armorOnly && attack.type !== stage.armorOnly) return { amount: 0, superEffective: false, armor: true };
  const superEffective = isSuperEffective(attack.type, stage);
  const allRound = golem.allRound ? ALL_ROUND_MULTIPLIER : 1;
  const variance = 1 - GOLEM_DAMAGE_VARIANCE + rng() * 2 * GOLEM_DAMAGE_VARIANCE;
  const raw = golem.atk * ATTACK_POWER[attack.slot] * (superEffective ? WEAKNESS_MULTIPLIER : allRound) * variance;
  return { amount: Math.max(1, Math.round(raw)), superEffective, armor: false };
}

export function combatGolem(data: GolemData, startHp: number): CombatGolem {
  return {
    id: data.id,
    name: data.nickname || GOLEMS[data.species].name,
    maxHp: data.maxHp,
    hp: startHp,
    atk: data.atk,
    attacks: unlockedAttacks(data.species, data.stage),
    ultimateUsed: false,
    shield: false,
    allRound: false,
    stunned: 0,
    freed: false,
  };
}

export function arenaMonster(species: MonsterSpecies, id: string): CombatMonster {
  const info = MONSTERS[species];
  const { hp, atk } = monsterStats(info.phase);
  return {
    id,
    name: info.name,
    model: species,
    maxHp: hp,
    hp,
    atk,
    stages: [{ weakness: info.weakness, attack: info.attack }],
    stage: 0,
    stunned: 0,
    asleep: 0,
    blind: false,
  };
}

export function bossMonster(boss: BossId): CombatMonster {
  const info = BOSSES[boss];
  const { hp, atk } = bossStats(info.phase);
  return { id: boss, name: info.name, model: boss, maxHp: hp, hp, atk, stages: info.stages, stage: 0, stunned: 0, asleep: 0, blind: false };
}

/** N adversaires tirés au hasard parmi les monstres de la phase de l'arène (§ 7.1). */
export function arenaOpponents(phase: number, count: number, rng: Rng): CombatMonster[] {
  const species = (Object.keys(MONSTERS) as MonsterSpecies[]).filter((s) => MONSTERS[s].phase === phase);
  return Array.from({ length: count }, (_, i) => arenaMonster(pick(rng, species), `${phase}-${i}`));
}

export interface CombatSetup {
  kind: CombatKind;
  golems: readonly GolemData[];
  monsters: CombatMonster[];
}

export class TurnCombat {
  readonly kind: CombatKind;
  readonly golems: CombatGolem[];
  readonly monsters: CombatMonster[];
  phase: CombatPhase = 'player';
  activeGolem = 0;
  activeMonster = 0;

  constructor(
    setup: CombatSetup,
    private readonly rng: Rng,
  ) {
    this.kind = setup.kind;
    // Boss et dragon : les golems sont soignés au début du combat (§ 4.5).
    this.golems = setup.golems.map((g) => combatGolem(g, setup.kind === 'boss' ? g.maxHp : g.hp));
    this.monsters = setup.monsters;
    const first = this.golems.findIndex((g) => g.hp > 0);
    if (first < 0) throw new Error('Aucun golem en état de combattre');
    this.activeGolem = first;
  }

  get golem(): CombatGolem {
    return this.golems[this.activeGolem];
  }

  get monster(): CombatMonster {
    return this.monsters[this.activeMonster];
  }

  get monsterStage(): BossStage {
    return this.monster.stages[this.monster.stage];
  }

  /** Attaques que le golem actif peut lancer (l'Ultime disparaît une fois réussie). */
  availableAttacks(): AttackInfo[] {
    const g = this.golem;
    return g.attacks.filter((a) => a.slot !== 'ultimate' || !g.ultimateUsed);
  }

  attackInfo(slot: AttackSlot): AttackInfo {
    const attack = this.availableAttacks().find((a) => a.slot === slot);
    if (!attack) throw new Error(`Attaque indisponible : ${slot}`);
    return attack;
  }

  /** Golems qui peuvent entrer en jeu à la place du golem actif. */
  benchGolems(): CombatGolem[] {
    return this.golems.filter((g, i) => i !== this.activeGolem && g.hp > 0);
  }

  /** Le joueur a répondu à la question de l'attaque : elle touche si la réponse est juste. */
  attack(slot: AttackSlot, correct: boolean): CombatEvent[] {
    this.expect('player');
    const golem = this.golem;
    const attack = this.attackInfo(slot);
    const events: CombatEvent[] = [{ type: 'attack', golemId: golem.id, attack, hit: correct }];
    golem.freed = false;
    if (correct) {
      if (attack.slot === 'ultimate') golem.ultimateUsed = true;
      this.hitMonster(golem, attack, events);
    }
    if (this.phase === 'player') this.phase = 'monster';
    return events;
  }

  /** Le golem actif est pris dans une toile : il passe son tour (le monstre rejoue). */
  get golemStunned(): boolean {
    return this.phase === 'player' && this.golem.stunned > 0;
  }

  skipStunned(): CombatEvent[] {
    this.expect('player');
    this.golem.stunned = 0;
    this.golem.freed = true;
    this.phase = 'monster';
    return [{ type: 'golemSkip', id: this.golem.id }];
  }

  /** Changement de golem : il coûte le tour, sauf quand le golem actif est K.O. */
  switchTo(golemId: string): CombatEvent[] {
    if (this.phase !== 'player' && this.phase !== 'switch') throw new Error(`Changement impossible en phase ${this.phase}`);
    const index = this.golems.findIndex((g) => g.id === golemId);
    if (index < 0 || index === this.activeGolem || this.golems[index].hp <= 0) throw new Error(`Golem indisponible : ${golemId}`);
    const free = this.phase === 'switch';
    // Le golem qui sort se dégage de la toile.
    this.golem.stunned = 0;
    this.activeGolem = index;
    this.phase = free ? 'player' : 'monster';
    return [{ type: 'switch', id: golemId, free }];
  }

  /** Tour du monstre actif : il attaque le golem actif. */
  monsterTurn(): CombatEvent[] {
    this.expect('monster');
    const m = this.monster;
    const target = this.golem;
    const events: CombatEvent[] = [];
    this.phase = 'player';
    if (m.asleep > 0) {
      m.asleep--;
      events.push({ type: 'skip', id: m.id, reason: 'sleep' });
      return events;
    }
    if (m.stunned > 0) {
      m.stunned--;
      events.push({ type: 'skip', id: m.id, reason: 'stun' });
      return events;
    }
    const missChance = m.blind ? BLIND_MISS_CHANCE : MONSTER_MISS_CHANCE;
    m.blind = false;
    const hit = this.rng() >= missChance;
    events.push({ type: 'monsterAttack', monsterId: m.id, targetId: target.id, attack: this.monsterStage.attack, hit });
    if (!hit) return events;

    const factor = this.kind === 'boss' ? BOSS_DAMAGE_FACTOR : ARENA_MONSTER_DAMAGE_FACTOR;
    let amount = Math.max(1, Math.round(m.atk * factor * (MONSTER_DAMAGE_MIN + this.rng() * (MONSTER_DAMAGE_MAX - MONSTER_DAMAGE_MIN))));
    if (target.shield) {
      target.shield = false;
      const reflected = Math.max(1, Math.round(amount * SHIELD_REFLECT));
      amount = Math.max(1, Math.round(amount * SHIELD_DAMAGE_TAKEN));
      m.hp -= reflected;
      events.push({ type: 'reflect', id: m.id, amount: reflected });
    }
    target.hp = Math.max(0, target.hp - amount);
    events.push({ type: 'damage', target: 'golem', id: target.id, amount, superEffective: false, armor: false });
    // « Toile » : le golem touché passe son prochain tour (s'il est encore debout).
    if (this.monsterStage.stuns && target.hp > 0 && !target.freed) {
      target.stunned = 1;
      events.push({ type: 'golemStunned', id: target.id });
    }
    if (target.hp <= 0) {
      events.push({ type: 'ko', target: 'golem', id: target.id });
      if (this.golems.every((g) => g.hp <= 0)) this.finish('lost', events);
      else this.phase = 'switch';
    }
    // Le renvoi du bouclier peut mettre le monstre K.O.
    if (m.hp <= 0 && (this.phase as CombatPhase) !== 'lost') this.monsterDown(events);
    return events;
  }

  private hitMonster(golem: CombatGolem, attack: AttackInfo, events: CombatEvent[]): void {
    const m = this.monster;
    const dmg = golemAttackDamage(golem, attack, this.monsterStage, this.rng);
    m.hp -= dmg.amount;
    events.push({ type: 'damage', target: 'monster', id: m.id, ...dmg });
    if (m.asleep > 0 && dmg.amount > 0) {
      m.asleep = 0;
      events.push({ type: 'wake', id: m.id });
    }
    if (m.hp <= 0) {
      this.monsterDown(events);
      return;
    }
    if (attack.effect) this.applyEffect(golem, m, attack.effect, events);
  }

  private applyEffect(golem: CombatGolem, m: CombatMonster, effect: AttackEffect, events: CombatEvent[]): void {
    if (effect === 'stun') m.stunned = 1;
    else if (effect === 'sleep') m.asleep = randInt(this.rng, SLEEP_MIN_TURNS, SLEEP_MAX_TURNS);
    else if (effect === 'blind') m.blind = true;
    else golem.shield = true;
    events.push({ type: 'effect', id: effect === 'shield' ? golem.id : m.id, effect });
  }

  /** PV à zéro : étape suivante du boss, monstre suivant, ou victoire. */
  private monsterDown(events: CombatEvent[]): void {
    const m = this.monster;
    if (m.stage < m.stages.length - 1) {
      m.stage++;
      m.hp = m.maxHp;
      m.stunned = 0;
      m.asleep = 0;
      m.blind = false;
      events.push({ type: 'stage', id: m.id, stage: m.stage });
      return;
    }
    m.hp = 0;
    events.push({ type: 'ko', target: 'monster', id: m.id });
    const next = this.monsters.findIndex((x) => x.hp > 0);
    if (next < 0) {
      this.finish('won', events);
      return;
    }
    this.activeMonster = next;
    events.push({ type: 'nextMonster', id: this.monster.id });
  }

  private finish(result: 'won' | 'lost', events: CombatEvent[]): void {
    this.phase = result;
    events.push({ type: 'end', result });
  }

  private expect(phase: CombatPhase): void {
    if (this.phase !== phase) throw new Error(`Action attendue en phase ${phase}, pas ${this.phase}`);
  }
}

/** Fin d'un combat d'arène (gagné ou perdu) ou de boss : tous les golems sont soignés (§ 4.5, § 7.1). */
export function healAfterCombat(golems: GolemData[]): void {
  for (const g of golems) g.hp = g.maxHp;
}
