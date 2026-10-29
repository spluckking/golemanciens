import type * as THREE from 'three';
import { OBJECTIVE_STAR_TRIAL, P5_REMINDER, P5_REQUEST, P5_TASK, P5_TITLE } from '../data/bossQuest';
import { OBJECTIVE_GO_CIEL_ARENA, TEXT_FALL_BACK, type QuestNpc } from '../data/quests';
import type { HeroState } from '../entities/heroController';
import { PORTRAITS } from '../entities/models';
import { questLine } from '../quests/villageQuests';
import { NPC_NAMES, OBJECTIVE_FIND_EGG } from '../story/dialogues';
import { CIEL_FALL_Y, HARPIES_CAMP, type CielLayout } from '../world/ciel';
import type { Point3 } from '../world/layout';
import { audio } from '../audio/audio';
import { ArenaLife } from './arenaLife';
import { CielBossLife } from './cielBossLife';
import { CielQuestLife } from './cielQuestLife';
import type { FrostSanctuaryHooks } from './frostSanctuaryLife';
import { markSeen, progress, type GameState } from './gameState';
import type { Interactions } from './interactions';
import type { SolidFn } from './physics';
import type { Rng } from './rng';
import { SkySanctuaryLife } from './skySanctuaryLife';
import { SEEN_RADIUS, WorldLife, type FightSetup, type Objective, type WorldHooks } from './worldLife';

/** Objectif de l'Île Céleste quand les quêtes attendent (texte nouveau, à valider). */
export const OBJECTIVE_EXPLORE_CIEL = 'Explore l’Île Céleste';

export interface CielHooks extends WorldHooks {
  onFight: () => void;
  onBossFight: () => void;
  /** Le héros est tombé des îles : on le replace là où il se tenait (sans tourner la caméra). */
  moveHero: (x: number, z: number) => void;
  sanctuary: Omit<FrostSanctuaryHooks, 'dialog' | 'toast' | 'burst'>;
}

/**
 * L'Île Céleste (chapitre 5) : le sanctuaire des Vents, les quêtes du Village des Nuages, l'arène,
 * les plumes noires et le Griffon d'Ombre. Une chute ramène sur la dernière île où l'on se tenait,
 * sans dégâts ; les golems et les monstres qui tombent reviennent aussi.
 */
export class CielLife extends WorldLife {
  declare readonly layout: CielLayout;
  readonly sanctuary: SkySanctuaryLife;
  readonly quests: CielQuestLife;
  readonly arena: ArenaLife;
  readonly boss: CielBossLife;
  private safe: { x: number; z: number };

  constructor(layout: CielLayout, state: GameState, atlas: THREE.Texture, solid: SolidFn, rng: Rng, interactions: Interactions, private readonly cielHooks: CielHooks) {
    super(layout, state, atlas, solid, rng, interactions, cielHooks);
    const hooks = cielHooks;
    this.safe = { x: layout.arrival.x, z: layout.arrival.z };
    const burst = (x: number, y: number, z: number, color: number, count?: number): void => hooks.sparks.burst(x, y, z, color, count ?? 12);
    this.sanctuary = new SkySanctuaryLife(layout.sanctuary, layout.world, this.group, state, interactions, rng, hooks.labels, {
      ...hooks.sanctuary,
      dialog: hooks.dialog,
      toast: hooks.toast,
      burst,
      onProgress: hooks.onProgress,
    });
    this.quests = new CielQuestLife(layout, this.group, state, interactions, () => this.sim.monsters.filter((m) => m.campId === HARPIES_CAMP), {
      dialog: hooks.dialog,
      toast: hooks.toast,
      labels: hooks.labels,
      burst,
      gainFood: (amount, x, y, z) => this.gainFood(amount, x, y, z),
      onProgress: hooks.onProgress,
      bossTalk: () => this.bossTalk(),
      bossOffer: () => this.arena.finished && progress(state).bossQuest === 'locked',
    });
    this.arena = new ArenaLife(layout.arena, layout.world, this.group, state, interactions, () => this.quests.book.mandatoryDone, {
      rebuild: hooks.sanctuary.rebuild,
      burst,
      toast: hooks.toast,
      onFight: hooks.onFight,
    });
    this.boss = new CielBossLife(layout, this.group, state, interactions, { onBossFight: hooks.onBossFight, toast: hooks.toast, burst, rebuild: hooks.sanctuary.rebuild, onProgress: hooks.onProgress });
  }

  /** Le Capitaine Azur donne la quête du boss (P5) une fois l'arène terminée. */
  private bossTalk(): boolean {
    const p = progress(this.state);
    if (!this.arena.finished || p.bossQuest === 'defeated') return false;
    const say = (text: string): void => this.hooks.dialog.show({ speaker: NPC_NAMES.azur, portrait: PORTRAITS.azur, text });
    if (p.bossQuest === 'locked') {
      p.bossQuest = 'active';
      say(P5_REQUEST);
    } else say(P5_REMINDER);
    this.hooks.onProgress();
    return true;
  }

  protected override talk(npcId: string): boolean {
    return this.quests.talk(npcId);
  }

  protected override aimTarget(): Point3 | null {
    return null;
  }

  /** Chutes sans dégâts (SPEC § 2) : le héros, ses golems et les monstres reviennent sur les îles. */
  private catchFalls(hero: HeroState): void {
    const w = this.layout.world;
    if (hero.onGround && hero.y > CIEL_FALL_Y + 2 && w.solidAt(Math.floor(hero.x), Math.floor(hero.y) - 1, Math.floor(hero.z))) this.safe = { x: hero.x, z: hero.z };
    if (hero.y < CIEL_FALL_Y) {
      this.cielHooks.moveHero(this.safe.x, this.safe.z);
      this.hooks.toast(TEXT_FALL_BACK);
      audio.sfx('wings');
    }
    for (const g of this.sim.golems)
      if (g.body.y < CIEL_FALL_Y) {
        g.body.x = this.safe.x + 1;
        g.body.z = this.safe.z + 1;
        g.body.y = w.standY(Math.floor(g.body.x), Math.floor(g.body.z));
        g.body.vy = 0;
      }
    for (const m of this.sim.monsters)
      if (m.body.y < CIEL_FALL_Y && m.mode !== 'dead') {
        m.body.x = m.home.x;
        m.body.y = m.home.y;
        m.body.z = m.home.z;
        m.body.vy = 0;
      }
  }

  protected override updateChapter(dt: number, hero: HeroState, playing: boolean): void {
    this.sanctuary.update(dt, hero, playing);
    if (!playing) return;
    this.catchFalls(hero);
    this.quests.update(dt, hero, playing);
    this.arena.update(dt);
    this.boss.update(dt);
    const b = this.layout.lair.boss;
    if (progress(this.state).bossQuest !== 'locked' && Math.hypot(b.x - hero.x, b.z - hero.z) < SEEN_RADIUS + 6) markSeen(this.state, 'griffon');
  }

  override fightSetup(kind: 'arena' | 'boss'): FightSetup {
    const { arena, lair } = this.layout;
    if (kind === 'arena') return { plan: arena, phase: 5, back: { x: arena.gong.x, z: arena.gong.z + 2.5 } };
    // Pas d'outro ici : l'Épreuve des Étoiles attend à l'Académie, puis O5 raconte la naissance du Galaxie.
    return { plan: lair, phase: 5, boss: 'griffon', back: { x: lair.center.x, z: lair.center.z + 12 } };
  }

  objective(hero: HeroState): Objective {
    const p = progress(this.state);
    const { landmarks } = this.layout;
    if (p.sanctuary.step !== 'hatched') {
      return { text: OBJECTIVE_FIND_EGG, target: this.layout.sanctuary.entrance, current: [{ text: OBJECTIVE_FIND_EGG, active: true }], done: [] };
    }
    const book = this.quests.book;
    const name = (id: QuestNpc): string => NPC_NAMES[id];
    const goal = book.objective();
    let text = OBJECTIVE_EXPLORE_CIEL;
    let target: { x: number; z: number } = landmarks.village;
    if (goal.kind === 'npc') {
      text = questLine(goal.quest, book.state(goal.quest.id), name);
      target = this.quests.npcSpot(goal.npc);
    } else if (goal.kind === 'task') {
      text = questLine(goal.quest, book.state(goal.quest.id), name);
      target = this.quests.taskTarget(goal.quest.id, hero);
    } else if (goal.kind === 'arena' && !this.arena.finished) {
      text = OBJECTIVE_GO_CIEL_ARENA;
      target = landmarks.arena;
    }
    if (goal.kind === 'arena' && this.arena.finished) {
      if (p.bossQuest === 'locked') {
        text = `${NPC_NAMES.azur} a besoin d’aide`;
        target = this.quests.npcSpot('azur');
      } else if (p.bossQuest === 'active') {
        text = `${P5_TITLE} : ${P5_TASK.replace('{n}', String(this.boss.count))}`;
        target = this.boss.trailTarget(hero);
      } else {
        text = OBJECTIVE_STAR_TRIAL;
        target = this.layout.arch;
      }
    }
    const current = [{ text, active: true }];
    for (const d of book.defs) {
      const st = book.state(d.id);
      if (st.status === 'locked' || st.status === 'done') continue;
      const line = questLine(d, st, name);
      if (line !== text && !current.some((c) => c.text === line)) current.push({ text: line, active: false });
    }
    const done = [OBJECTIVE_FIND_EGG, ...book.defs.filter((d) => book.state(d.id).status === 'done').map((d) => d.title)];
    if (p.bossQuest === 'defeated') done.push(P5_TITLE);
    return { text, target, current, done };
  }

  override snapshot(): ReturnType<WorldLife['snapshot']> & {
    sky: ReturnType<SkySanctuaryLife['snapshot']>;
    cielQuests: ReturnType<CielQuestLife['snapshot']>;
    cielBoss: ReturnType<CielBossLife['snapshot']>;
    safe: { x: number; z: number };
  } {
    return { ...super.snapshot(), sky: this.sanctuary.snapshot(), cielQuests: this.quests.snapshot(), cielBoss: this.boss.snapshot(), safe: this.safe };
  }
}
