import * as THREE from 'three';
import { OBJECTIVE_CHAPTER_DONE, P1_TASK, P1_TITLE } from '../data/bossQuest';
import { OBJECTIVE_GO_ARENA, type QuestNpc } from '../data/quests';
import { OBJECTIVE_BACK_TO_VILLAGE } from '../data/sanctuaries';
import type { HeroState } from '../entities/heroController';
import { questLine } from '../quests/villageQuests';
import { NPC_NAMES, OBJECTIVE_FIND_EGG } from '../story/dialogues';
import type { Point3 } from '../world/layout';
import type { PrairieLayout } from '../world/prairie';
import { ArenaLife } from './arenaLife';
import { BossLife } from './bossLife';
import { markSeen, progress, type GameState } from './gameState';
import { HomeLife } from './home';
import type { Interactions } from './interactions';
import type { SolidFn } from './physics';
import { QuestLife } from './questLife';
import type { Rng } from './rng';
import { SanctuaryLife, type SanctuaryHooks } from './sanctuaryLife';
import { SEEN_RADIUS, WorldLife, type Objective, type WorldHooks } from './worldLife';

export interface PrairieHooks extends WorldHooks {
  /** Le héros se couche dans son lit. */
  onSleep: () => void;
  /** Le gong de l'arène a sonné. */
  onFight: () => void;
  /** Le héros affronte le boss du biome. */
  onBossFight: () => void;
  /** Interface et monde pour le sanctuaire (énigmes, éclosion, portes). */
  sanctuary: Omit<SanctuaryHooks, 'dialog' | 'toast' | 'burst'>;
}

/** La Prairie (chapitre 1) : maison du joueur, sanctuaire des Fleurs, quêtes de Ferme-des-Blocs, arène, Roi Slime. */
export class PrairieLife extends WorldLife {
  declare readonly layout: PrairieLayout;
  readonly home: HomeLife;
  readonly sanctuary: SanctuaryLife;
  readonly quests: QuestLife;
  readonly arena: ArenaLife;
  readonly boss: BossLife;

  constructor(layout: PrairieLayout, state: GameState, atlas: THREE.Texture, solid: SolidFn, rng: Rng, interactions: Interactions, hooks: PrairieHooks) {
    super(layout, state, atlas, solid, rng, interactions, hooks);
    const burst = (x: number, y: number, z: number, color: number, count?: number): void => hooks.sparks.burst(x, y, z, color, count ?? 12);

    // Maison du joueur : lit, étagère à trophées, golem de maison.
    this.home = new HomeLife(layout.village.home, layout.world, this.group, state, interactions, {
      dialog: hooks.dialog,
      toast: hooks.toast,
      onSleep: hooks.onSleep,
    });

    // Sanctuaire des Fleurs : pierre-énigme, dalles, œuf.
    this.sanctuary = new SanctuaryLife(layout.sanctuary, layout.world, this.group, state, interactions, rng, {
      ...hooks.sanctuary,
      dialog: hooks.dialog,
      toast: hooks.toast,
      burst,
      onProgress: hooks.onProgress,
    });

    // Quêtes du village : poules, panier, camp des slimes, clé, fleurs.
    this.quests = new QuestLife(layout, this.group, state, interactions, () => this.sim.monsters.filter((m) => m.campId === 'slimes'), () => this.arena.finished, {
      dialog: hooks.dialog,
      toast: hooks.toast,
      labels: hooks.labels,
      burst,
      gainFood: (amount, x, y, z) => this.gainFood(amount, x, y, z),
      onProgress: hooks.onProgress,
    });

    // Arène : ouverte quand les 3 quêtes obligatoires sont faites.
    this.arena = new ArenaLife(layout.arena, layout.world, this.group, state, interactions, () => this.quests.book.mandatoryDone, {
      rebuild: hooks.sanctuary.rebuild,
      burst,
      toast: hooks.toast,
      onFight: hooks.onFight,
    });

    // Marais du Roi Slime : piste gluante et boss (quête P1).
    this.boss = new BossLife(layout, this.group, state, interactions, { onBossFight: hooks.onBossFight });
  }

  protected override talk(npcId: string): boolean {
    return this.quests.talk(npcId);
  }

  protected override aimTarget(): Point3 | null {
    return this.quests.aimTarget();
  }

  protected override questHit(x: number, y: number, z: number): boolean {
    return this.quests.hitTest(x, y, z);
  }

  protected override updateChapter(dt: number, hero: HeroState, playing: boolean, controllable: boolean): void {
    this.sanctuary.update(dt, hero, controllable);
    if (!playing) return;
    this.home.update(dt, hero);
    const boss = this.layout.marsh.boss;
    if (progress(this.state).bossQuest !== 'locked' && Math.hypot(boss.x - hero.x, boss.z - hero.z) < SEEN_RADIUS + 6) markSeen(this.state, 'roiSlime');
    this.quests.update(dt, hero, controllable);
    this.arena.update(dt);
    this.boss.update(dt);
  }

  /** Dans la Prairie, le point sûr est la maison. */
  override homePoint(): Point3 {
    return this.home.wakePoint();
  }

  /** La maison si l'on y a dormi en dernier, sinon la dernière lanterne, sinon la maison. */
  override respawnPoint(): Point3 {
    if (this.state.lastLantern === 'home') return this.home.wakePoint();
    return super.respawnPoint();
  }

  /** Objectif actif du journal et de la boussole, selon l'avancement du chapitre 1. */
  objective(hero: HeroState): Objective {
    const p = progress(this.state);
    const { landmarks } = this.layout;
    if (p.sanctuary.step !== 'hatched') {
      return { text: OBJECTIVE_FIND_EGG, target: landmarks.sanctuary, current: [{ text: OBJECTIVE_FIND_EGG, active: true }], done: [] };
    }
    const quests = this.quests;
    const book = quests.book;
    const name = (id: QuestNpc): string => NPC_NAMES[id];
    const goal = book.objective();
    let text = OBJECTIVE_BACK_TO_VILLAGE;
    let target: { x: number; z: number } = landmarks.village;
    if (goal.kind === 'npc') {
      text = questLine(goal.quest, book.state(goal.quest.id), name);
      target = quests.npcSpot(goal.npc);
    } else if (goal.kind === 'task') {
      text = questLine(goal.quest, book.state(goal.quest.id), name);
      target = quests.taskTarget(goal.quest.id, hero);
    } else if (goal.kind === 'arena') {
      text = OBJECTIVE_GO_ARENA;
      target = landmarks.arena;
    }
    // Après l'arène : la quête du boss (P1), puis la fin du chapitre.
    if (goal.kind === 'arena' && this.arena.finished) {
      if (p.bossQuest === 'locked') {
        text = `${NPC_NAMES.mereBrique} a besoin d’aide`;
        target = quests.npcSpot('mereBrique');
      } else if (p.bossQuest === 'active') {
        text = `${P1_TITLE} : ${P1_TASK}`;
        target = this.boss.trailTarget(hero);
      } else {
        text = OBJECTIVE_CHAPTER_DONE;
        target = landmarks.academy;
      }
    }
    // Journal : l'objectif mis en avant, puis les autres quêtes en cours ; les quêtes terminées.
    const current = [{ text, active: true }];
    for (const d of book.defs) {
      const st = book.state(d.id);
      if (st.status === 'locked' || st.status === 'done') continue;
      const line = questLine(d, st, name);
      if (line !== text && !current.some((c) => c.text === line)) current.push({ text: line, active: false });
    }
    const done = [OBJECTIVE_FIND_EGG, ...book.defs.filter((d) => book.state(d.id).status === 'done').map((d) => d.title)];
    if (p.bossQuest === 'defeated') done.push(P1_TITLE);
    return { text, target, current, done };
  }

  override snapshot(): ReturnType<WorldLife['snapshot']> & {
    home: ReturnType<HomeLife['snapshot']>;
    sanctuary: ReturnType<SanctuaryLife['snapshot']>;
    quests: ReturnType<QuestLife['snapshot']>;
  } {
    return { ...super.snapshot(), home: this.home.snapshot(), sanctuary: this.sanctuary.snapshot(), quests: this.quests.snapshot() };
  }
}
