import { describe, expect, it } from 'vitest';
import {
  TurnCombat,
  arenaMonster,
  arenaOpponents,
  bossMonster,
  combatGolem,
  golemAttackDamage,
  healAfterCombat,
  questionCategory,
  type CombatMonster,
} from '../../src/combat/turn/turnCombat';
import { createGolem, type GolemData } from '../../src/core/gameState';
import { createRng, type Rng } from '../../src/core/rng';
import { ARENA_MONSTER_DAMAGE_FACTOR, BOSS_DAMAGE_FACTOR, bossStats, monsterStats } from '../../src/data/balance';
import { BOSSES, GOLEMS, MONSTERS, unlockedAttacks, type AttackInfo } from '../../src/data/creatures';

/** Hasard figé au milieu : variance ×1, le monstre touche, dégâts ×1. */
const mid: Rng = () => 0.5;

function arena(golems: GolemData[], monsters: CombatMonster[], rng: Rng = mid): TurnCombat {
  return new TurnCombat({ kind: 'arena', golems, monsters }, rng);
}

describe('attaques et types', () => {
  it('au stade 1, un golem a A1 (calcul) et A2 (énigme), de types différents', () => {
    for (const species of ['pierre', 'mousse'] as const) {
      const attacks = unlockedAttacks(species, 1);
      expect(attacks.map((a) => a.slot)).toEqual(['a1', 'a2']);
      expect(questionCategory(attacks[0])).toBe('calc');
      expect(questionCategory(attacks[1])).toBe('riddle');
      expect(attacks[0].type).not.toBe(attacks[1].type);
    }
    expect(unlockedAttacks('pierre', 2).map((a) => a.slot)).toEqual(['a1', 'a2', 'a3']);
    expect(unlockedAttacks('pierre', 3).map((a) => a.slot)).toEqual(['a1', 'a2', 'a3', 'ultimate']);
  });

  // Règle de conception (§ 4.1) : à chaque phase, chacun des 2 golems vise, dès l'éclosion, la faiblesse du boss
  // (le Galaxie n'éclot pas d'un œuf : c'est lui, et lui seul, qui entame l'armure du Dragon).
  for (const boss of Object.values(BOSSES).filter((b) => b.phase <= 5)) {
    it(`les golems de la phase ${boss.phase} visent dès le stade 1 la faiblesse de ${boss.name}`, () => {
      const species = (Object.keys(GOLEMS) as (keyof typeof GOLEMS)[]).filter((s) => GOLEMS[s].phase === boss.phase && s !== 'galaxie');
      expect(species).toHaveLength(2);
      for (const s of species) expect(unlockedAttacks(s, 1).some((a) => a.type === boss.stages[0].weakness)).toBe(true);
    });
  }

  it('Dragon d’Ombre en 3 étapes : armure, puis ✨ fait double dégât, puis la colère frappe plus fort', () => {
    const [s1, s2, s3] = BOSSES.dragon.stages;
    const star: AttackInfo = { slot: 'a1', name: 'Étoile filante', kind: 'force', type: 'star' };
    const rock: AttackInfo = { slot: 'a1', name: 'Coup de poing', kind: 'force', type: 'rock' };
    const g = { atk: 20, allRound: false };
    expect(golemAttackDamage(g, rock, s1, () => 0.5).amount).toBe(0);
    expect(golemAttackDamage(g, star, s1, () => 0.5).amount).toBe(30);
    expect(golemAttackDamage(g, rock, s2, () => 0.5).amount).toBe(20);
    expect(golemAttackDamage(g, star, s2, () => 0.5).amount).toBe(40);
    expect(golemAttackDamage(g, star, s3, () => 0.5).amount).toBe(40);
    expect(s3.power).toBeGreaterThan(1);
    // La colère : à tirage égal, l'étape 3 frappe plus fort que l'étape 2.
    const hit = (stage: number): number => {
      const golem = createGolem('pierre');
      const c = new TurnCombat({ kind: 'boss', golems: [golem], monsters: [bossMonster('dragon')] }, () => 0.5);
      c.monster.stage = stage;
      c.attack('a1', false);
      const before = c.golem.hp;
      c.monsterTurn();
      return before - c.golem.hp;
    };
    expect(hit(2)).toBeGreaterThan(hit(1));
  });

  it('Dragon d’Ombre : armure ✨ à l’étape 1 ; seul le Galaxie a des attaques ✨', () => {
    expect(BOSSES.dragon.stages).toHaveLength(3);
    expect(BOSSES.dragon.stages[0].armorOnly).toBe('star');
    const starred = (Object.keys(GOLEMS) as (keyof typeof GOLEMS)[]).filter((s) => GOLEMS[s].attacks.some((a) => a.type === 'star'));
    expect(starred).toEqual(['galaxie']);
  });

  it('chaque monstre a une faiblesse visée par au moins un golem de sa phase ou d’avant', () => {
    for (const m of Object.values(MONSTERS)) {
      const types = new Set(
        (Object.keys(GOLEMS) as (keyof typeof GOLEMS)[]).filter((s) => GOLEMS[s].phase <= m.phase).flatMap((s) => unlockedAttacks(s, 1).map((a) => a.type)),
      );
      expect(types.has(m.weakness), m.name).toBe(true);
    }
  });
});

describe('dégâts', () => {
  const pierre = createGolem('pierre');
  const [punch, pebbles] = unlockedAttacks('pierre', 1);
  const zombie = { weakness: 'rock' as const, attack: '' };
  const spider = { weakness: 'plant' as const, attack: '' };

  it('ATQ × puissance, ×1,5 si le type de l’attaque est la faiblesse, ±10 %', () => {
    const g = { atk: pierre.atk, allRound: false };
    expect(golemAttackDamage(g, punch, spider, mid)).toEqual({ amount: 8, superEffective: false, armor: false });
    expect(golemAttackDamage(g, punch, zombie, mid)).toEqual({ amount: 12, superEffective: true, armor: false });
    expect(golemAttackDamage(g, pebbles, spider, mid).amount).toBe(10); // 8 × 1,2 = 9,6
    expect(golemAttackDamage(g, punch, spider, () => 0).amount).toBe(7); // 8 × 0,9 = 7,2
    expect(golemAttackDamage(g, punch, spider, () => 0.9999).amount).toBe(9); // 8 × 1,1 = 8,8
  });

  it('l’Arc-en-ciel a un bonus permanent, remplacé par celui de la faiblesse', () => {
    expect(golemAttackDamage({ atk: 8, allRound: true }, punch, spider, mid).amount).toBe(10);
    expect(golemAttackDamage({ atk: 8, allRound: true }, punch, zombie, mid).amount).toBe(12);
  });

  it('armure du dragon : seule une attaque ✨ l’entame à l’étape 1', () => {
    const star: AttackInfo = { slot: 'a1', name: 'Étoile filante', kind: 'force', type: 'star' };
    const armored = { weakness: 'star' as const, armorOnly: 'star' as const, attack: '' };
    expect(golemAttackDamage({ atk: 20, allRound: false }, punch, armored, mid)).toEqual({ amount: 0, superEffective: false, armor: true });
    expect(golemAttackDamage({ atk: 20, allRound: false }, star, armored, mid).amount).toBe(30);
    // Étapes 2 et 3 : tout le monde fait des dégâts normaux, ✨ fait plus.
    const stage2 = { weakness: 'star' as const, attack: '' };
    expect(golemAttackDamage({ atk: 20, allRound: false }, punch, stage2, mid).amount).toBe(20);
    expect(golemAttackDamage({ atk: 20, allRound: false }, star, stage2, mid).amount).toBe(30);
  });
});

describe('déroulé d’un tour', () => {
  it('une bonne réponse touche, une mauvaise rate ; puis c’est au monstre', () => {
    const c = arena([createGolem('pierre')], [arenaMonster('spider', 'm')]);
    const miss = c.attack('a1', false);
    expect(miss).toEqual([expect.objectContaining({ type: 'attack', hit: false })]);
    expect(c.monster.hp).toBe(24);
    expect(c.phase).toBe('monster');
    // Juste après s'être dégagé, il ne peut pas être repris : il rejoue forcément.
    expect(c.monsterTurn()).not.toContainEqual({ type: 'golemStunned', id: 'champignon' });
    expect(c.golemStunned).toBe(false);
    expect(c.phase).toBe('player');
    c.attack('a1', true);
    expect(c.monster.hp).toBe(16);
  });

  it('le monstre frappe le golem actif : ATQ × coefficient × (0,8 à 1,2)', () => {
    const c = arena([createGolem('pierre')], [arenaMonster('spider', 'm')]);
    c.attack('a1', false);
    const events = c.monsterTurn();
    const expected = Math.round(monsterStats(1).atk * ARENA_MONSTER_DAMAGE_FACTOR);
    expect(events).toContainEqual(expect.objectContaining({ type: 'monsterAttack', attack: 'Morsure', hit: true }));
    expect(c.golem.hp).toBe(40 - expected);
  });

  it('le monstre rate 15 % de ses attaques, 50 % s’il est aveuglé', () => {
    const rate = (blind: boolean): number => {
      const rng = createRng(7);
      let misses = 0;
      for (let i = 0; i < 4000; i++) {
        const c = arena([createGolem('pierre')], [arenaMonster('spider', 'm')], rng);
        c.monster.blind = blind;
        c.attack('a1', false);
        if (c.monsterTurn().some((e) => e.type === 'monsterAttack' && !e.hit)) misses++;
      }
      return misses / 4000;
    };
    expect(rate(false)).toBeCloseTo(0.15, 1);
    expect(rate(true)).toBeCloseTo(0.5, 1);
  });
});

describe('effets', () => {
  const stunner: AttackInfo = { slot: 'a3', name: 'Rocher roulant', kind: 'force', type: 'rock', effect: 'stun' };

  function withAttack(attack: AttackInfo, rng: Rng = mid): TurnCombat {
    const c = arena([createGolem('pierre')], [arenaMonster('spider', 'm')], rng);
    c.golem.attacks.push(attack);
    return c;
  }

  it('Étourdi : le monstre passe son prochain tour', () => {
    const c = withAttack(stunner);
    c.attack('a3', true);
    expect(c.monsterTurn()).toEqual([{ type: 'skip', id: 'm', reason: 'stun' }]);
    expect(c.golem.hp).toBe(40);
    c.attack('a1', false);
    expect(c.monsterTurn()[0].type).toBe('monsterAttack');
  });

  it('Endormi : passe 1 ou 2 tours, mais se réveille s’il est touché', () => {
    const c = withAttack({ slot: 'a3', name: 'Spores dodo', kind: 'magic', type: 'plant', effect: 'sleep' }, () => 0.99);
    c.attack('a3', true);
    expect(c.monster.asleep).toBe(2);
    expect(c.monsterTurn()).toEqual([{ type: 'skip', id: 'm', reason: 'sleep' }]);
    const events = c.attack('a1', true);
    expect(events).toContainEqual({ type: 'wake', id: 'm' });
    expect(c.monster.asleep).toBe(0);
  });

  it('Bouclier : le golem ne subit que 50 % du coup suivant et en renvoie 50 %', () => {
    const c = withAttack({ slot: 'a3', name: 'Bouclier miroir', kind: 'magic', type: 'rock', effect: 'shield' });
    c.attack('a3', true);
    const hpAfterHit = c.monster.hp;
    const full = Math.round(monsterStats(1).atk * ARENA_MONSTER_DAMAGE_FACTOR);
    const events = c.monsterTurn();
    expect(events).toContainEqual({ type: 'reflect', id: 'm', amount: Math.round(full / 2) });
    expect(c.golem.hp).toBe(40 - Math.round(full / 2));
    expect(c.monster.hp).toBe(hpAfterHit - Math.round(full / 2));
    expect(c.golem.shield).toBe(false);
  });
});

describe('Ultime', () => {
  it('utilisable une seule fois par combat (une Ultime ratée reste disponible)', () => {
    const pierre = createGolem('pierre');
    pierre.stage = 3;
    const c = arena([pierre], [arenaMonster('spider', 'a'), arenaMonster('spider', 'b')]);
    expect(c.availableAttacks().map((a) => a.slot)).toContain('ultimate');
    c.attack('ultimate', false);
    c.monsterTurn();
    expect(c.availableAttacks().map((a) => a.slot)).toContain('ultimate');
    c.attack('ultimate', true);
    expect(c.availableAttacks().map((a) => a.slot)).not.toContain('ultimate');
    expect(() => c.attack('ultimate', true)).toThrow();
  });
});

describe('changement de golem', () => {
  it('un changement volontaire ne coûte pas le tour : le monstre n’attaque pas', () => {
    const c = arena([createGolem('pierre'), createGolem('mousse')], [arenaMonster('spider', 'm')]);
    expect(c.switchTo('mousse')).toEqual([{ type: 'switch', id: 'mousse', free: false }]);
    expect(c.phase).toBe('player');
    expect(c.golems[1].hp).toBe(40);
    expect(c.golems[0].hp).toBe(40);
  });

  it('il est gratuit quand le golem actif est K.O. ; tous K.O. = défaite', () => {
    const pierre = createGolem('pierre');
    pierre.hp = 1;
    const mousse = createGolem('mousse');
    mousse.hp = 1;
    const c = arena([pierre, mousse], [arenaMonster('spider', 'm')]);
    c.attack('a1', false);
    expect(c.monsterTurn()).toContainEqual({ type: 'ko', target: 'golem', id: 'pierre' });
    expect(c.phase).toBe('switch');
    expect(() => c.attack('a1', true)).toThrow();
    expect(c.switchTo('mousse')).toEqual([{ type: 'switch', id: 'mousse', free: true }]);
    expect(c.phase).toBe('player');
    c.attack('a1', false);
    expect(c.monsterTurn()).toContainEqual({ type: 'end', result: 'lost' });
    expect(c.phase).toBe('lost');
  });

  it('un golem K.O. ne peut pas revenir, ni commencer le combat', () => {
    const pierre = createGolem('pierre');
    pierre.hp = 0;
    const c = arena([pierre, createGolem('mousse')], [arenaMonster('spider', 'm')]);
    expect(c.golem.id).toBe('mousse');
    expect(() => c.switchTo('pierre')).toThrow();
  });
});

describe('N contre N et victoire', () => {
  it('les adversaires sont tirés parmi les monstres de la phase ; le suivant entre quand l’actif tombe', () => {
    const rng = createRng(3);
    const ops = arenaOpponents(1, 2, rng);
    expect(ops).toHaveLength(2);
    for (const m of ops) expect(['Slime', 'Zombie', 'Araignée']).toContain(m.name);

    const c = arena([createGolem('pierre'), createGolem('mousse')], [arenaMonster('zombie', 'a'), arenaMonster('zombie', 'b')]);
    c.attack('a1', true);
    c.monsterTurn();
    const events = c.attack('a1', true); // 12 + 12 = 24 : K.O.
    expect(events).toContainEqual({ type: 'ko', target: 'monster', id: 'a' });
    expect(events).toContainEqual({ type: 'nextMonster', id: 'b' });
    expect(c.monster.id).toBe('b');
    c.monsterTurn();
    c.attack('a1', true);
    c.monsterTurn();
    expect(c.attack('a1', true)).toContainEqual({ type: 'end', result: 'won' });
    expect(c.phase).toBe('won');
  });

  it('à la fin d’un combat d’arène, gagné ou perdu, les golems sont entièrement soignés', () => {
    const golems = [createGolem('pierre'), createGolem('mousse')];
    golems[0].hp = 0;
    golems[1].hp = 7;
    healAfterCombat(golems);
    expect(golems.map((g) => g.hp)).toEqual([40, 40]);
  });
});

describe('boss', () => {
  it('golems soignés au début ; 2 étapes, la seconde avec « Pluie de gouttes »', () => {
    const pierre = createGolem('pierre');
    pierre.hp = 3;
    const c = new TurnCombat({ kind: 'boss', golems: [pierre], monsters: [bossMonster('roiSlime')] }, mid);
    expect(c.golem.hp).toBe(40);
    const { hp, atk } = bossStats(1);
    expect(c.monster.maxHp).toBe(hp);
    expect(c.monsterStage.weakness).toBe('sun');

    c.monster.hp = 1;
    expect(c.attack('a2', true)).toContainEqual({ type: 'stage', id: 'roiSlime', stage: 1 });
    expect(c.monster.hp).toBe(hp);
    const events = c.monsterTurn();
    expect(events).toContainEqual(expect.objectContaining({ type: 'monsterAttack', attack: 'Pluie de gouttes' }));
    expect(c.golem.hp).toBe(40 - Math.round(atk * BOSS_DAMAGE_FACTOR));

    c.monster.hp = 1;
    expect(c.attack('a2', true)).toContainEqual({ type: 'end', result: 'won' });
  });

  it('Reine Araignée : faible contre 🍄 ; à l’étape 2, « Toile » fait passer un tour au golem touché', () => {
    const champignon = createGolem('champignon');
    const ecorce = createGolem('ecorce');
    const c = new TurnCombat({ kind: 'boss', golems: [champignon, ecorce], monsters: [bossMonster('reineAraignee')] }, mid);
    expect(c.monsterStage.weakness).toBe('spore');
    c.monster.hp = 1;
    c.attack('a1', true);
    expect(c.monster.stage).toBe(1);
    // Étape 2 : la toile prend le golem actif.
    const events = c.monsterTurn();
    expect(events).toContainEqual(expect.objectContaining({ type: 'monsterAttack', attack: 'Toile' }));
    expect(events).toContainEqual({ type: 'golemStunned', id: 'champignon' });
    expect(c.golemStunned).toBe(true);
    expect(c.skipStunned()).toEqual([{ type: 'golemSkip', id: 'champignon' }]);
    expect(c.phase).toBe('monster');
    c.monsterTurn();
    // Changer de golem le dégage de la toile (le changement coûte le tour, comme d'habitude).
    c.switchTo('ecorce');
    expect(c.golems[0].stunned).toBe(0);
  });

  it('Sorcière du Blizzard : faible contre 💎 ; à l’étape 2, « Tempête » aveugle : la prochaine attaque juste touche à moitié', () => {
    const cristal = createGolem('cristal');
    const glace = createGolem('glace');
    const c = new TurnCombat({ kind: 'boss', golems: [cristal, glace], monsters: [bossMonster('sorciere')] }, mid);
    expect(c.monsterStage.weakness).toBe('crystal');
    c.monster.hp = 1;
    c.attack('a1', true);
    expect(c.monster.stage).toBe(1);
    const events = c.monsterTurn();
    expect(events).toContainEqual(expect.objectContaining({ type: 'monsterAttack', attack: 'Tempête' }));
    expect(events).toContainEqual({ type: 'golemBlinded', id: 'cristal' });
    // L'attaque suivante touche quand même (rien n'est perdu), à moitié de sa force.
    const full = golemAttackDamage(c.golem, c.attackInfo('a1'), c.monsterStage, () => 0.5).amount;
    const hp = c.monster.hp;
    const hit = c.attack('a1', true);
    expect(hit).toContainEqual({ type: 'blindHit', id: 'cristal' });
    expect(hp - c.monster.hp).toBe(Math.max(1, Math.round(full * 0.5)));
    expect(c.golems[0].blinded).toBe(false);
    // Changer de golem rend la vue.
    c.monsterTurn();
    expect(c.golems[0].blinded).toBe(true);
    c.switchTo('glace');
    expect(c.golems[0].blinded).toBe(false);
  });

  it('Glace et Cristal ont chacun une attaque 💎 dès l’éclosion ; le Bouclier miroir protège au stade 2', () => {
    for (const s of ['glace', 'cristal'] as const) expect(combatGolem(createGolem(s), 1).attacks.some((a) => a.type === 'crystal')).toBe(true);
    const g = createGolem('cristal');
    g.stage = 2;
    expect(combatGolem(g, g.maxHp).attacks.find((a) => a.slot === 'a3')?.effect).toBe('shield');
  });
});
