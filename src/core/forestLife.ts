import type * as THREE from 'three';
import { OBJECTIVE_FOREST_DONE, P2_REMINDER, P2_REQUEST, P2_TASK, P2_TITLE } from '../data/bossQuest';
import { OBJECTIVE_GO_FOREST_ARENA, TEXT_PICK_UP, TEXT_RUNE_FOUND, type QuestNpc } from '../data/quests';
import { audio } from '../audio/audio';
import { itemTip } from './evolution';
import { PORTRAITS } from '../entities/models';
import type { HeroState } from '../entities/heroController';
import { questLine } from '../quests/villageQuests';
import { NPC_NAMES, OBJECTIVE_FIND_EGG } from '../story/dialogues';
import { WOLVES_CAMP, type ForestLayout } from '../world/forest';
import type { Point3 } from '../world/layout';
import { ArenaLife } from './arenaLife';
import { ForestBossLife, WEB_COUNT } from './forestBossLife';
import { ForestQuestLife } from './forestQuestLife';
import { ForestSanctuaryLife } from './forestSanctuaryLife';
import { markSeen, progress, type GameState } from './gameState';
import type { Interactions } from './interactions';
import type { SolidFn } from './physics';
import type { Rng } from './rng';
import type { SanctuaryHooks } from './sanctuaryLife';
import { SEEN_RADIUS, WorldLife, type FightSetup, type Objective, type WorldHooks } from './worldLife';

/** Identifiant de la Rune cachée de la Forêt (objets déjà ramassés). */
const RUNE_ID = 'foret-rune';

/** Objectif quand tout est fait dans la Forêt, en attendant la Reine Araignée (texte nouveau, à valider). */
export const OBJECTIVE_EXPLORE_FOREST = 'Explore la Forêt Murmurante';

export interface ForestHooks extends WorldHooks {
  /** Le gong de l'arène a sonné. */
  onFight: () => void;
  /** Le héros affronte le boss du biome. */
  onBossFight: () => void;
  /** Interface et monde pour le sanctuaire (énigmes, éclosion, portes). */
  sanctuary: Omit<SanctuaryHooks, 'dialog' | 'toast' | 'burst'>;
}

/**
 * La Forêt Murmurante (chapitre 2) : le sanctuaire de Mousse, les quêtes des Cabanes des Cimes,
 * l'arène ; la quête de la Reine Araignée arrive à la sous-étape 2.6.
 */
export class ForestLife extends WorldLife {
  declare readonly layout: ForestLayout;
  readonly sanctuary: ForestSanctuaryLife;
  readonly quests: ForestQuestLife;
  readonly arena: ArenaLife;
  readonly boss: ForestBossLife;

  constructor(layout: ForestLayout, state: GameState, atlas: THREE.Texture, solid: SolidFn, rng: Rng, interactions: Interactions, hooks: ForestHooks) {
    super(layout, state, atlas, solid, rng, interactions, hooks);
    const burst = (x: number, y: number, z: number, color: number, count?: number): void => hooks.sparks.burst(x, y, z, color, count ?? 12);
    this.sanctuary = new ForestSanctuaryLife(layout.sanctuary, layout.world, this.group, state, interactions, rng, {
      ...hooks.sanctuary,
      dialog: hooks.dialog,
      toast: hooks.toast,
      burst,
      onProgress: hooks.onProgress,
    });
    this.quests = new ForestQuestLife(layout, this.group, state, interactions, () => this.sim.monsters.filter((m) => m.campId === WOLVES_CAMP), {
      dialog: hooks.dialog,
      toast: hooks.toast,
      labels: hooks.labels,
      burst,
      gainFood: (amount, x, y, z) => this.gainFood(amount, x, y, z),
      rebuild: hooks.sanctuary.rebuild,
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
    this.boss = new ForestBossLife(layout, this.group, state, interactions, { onBossFight: hooks.onBossFight, toast: hooks.toast, burst, onProgress: hooks.onProgress });

    // Rune d'éveil cachée (SPEC.md § 4.3) : au fond de la forêt, entre les racines.
    if (!state.itemsFound.includes(RUNE_ID)) {
      const rune = this.spawnStatic('runeItem', layout.rune.x, layout.rune.z, 0);
      const y = layout.world.standY(Math.floor(layout.rune.x), Math.floor(layout.rune.z));
      interactions.add({
        id: RUNE_ID,
        x: layout.rune.x,
        y,
        z: layout.rune.z,
        radius: 1.8,
        label: TEXT_PICK_UP,
        action: () => {
          state.items.rune = (state.items.rune ?? 0) + 1;
          state.itemsFound.push(RUNE_ID);
          interactions.remove(RUNE_ID);
          rune.root.visible = false;
          burst(layout.rune.x, y + 1, layout.rune.z, 0x7ac0ff, 30);
          audio.sfx('star');
          hooks.toast(TEXT_RUNE_FOUND);
          itemTip(state, hooks.dialog);
          hooks.onProgress();
        },
      });
    }
  }

  /** Sage Noisette donne la quête du boss (P2) une fois l'arène terminée. */
  private bossTalk(): boolean {
    const p = progress(this.state);
    if (!this.arena.finished || p.bossQuest === 'defeated') return false;
    const say = (text: string): void => this.hooks.dialog.show({ speaker: NPC_NAMES.noisette, portrait: PORTRAITS.noisette, text });
    if (p.bossQuest === 'locked') {
      p.bossQuest = 'active';
      say(P2_REQUEST);
    } else say(P2_REMINDER);
    this.hooks.onProgress();
    return true;
  }

  protected override talk(npcId: string): boolean {
    return this.quests.talk(npcId);
  }

  protected override aimTarget(): Point3 | null {
    return this.quests.aimTarget() ?? this.boss.aimTarget();
  }

  protected override questHit(x: number, y: number, z: number): boolean {
    return this.quests.hitTest(x, y, z) || this.boss.hitTest(x, y, z);
  }

  protected override updateChapter(dt: number, hero: HeroState, playing: boolean): void {
    this.sanctuary.update(dt);
    if (!playing) return;
    this.quests.update(dt, playing);
    this.arena.update(dt);
    this.boss.update(dt);
    const lair = this.layout.lair.boss;
    if (progress(this.state).bossQuest !== 'locked' && Math.hypot(lair.x - hero.x, lair.z - hero.z) < SEEN_RADIUS + 6) markSeen(this.state, 'reineAraignee');
  }

  override fightSetup(kind: 'arena' | 'boss'): FightSetup | null {
    const { arena, lair } = this.layout;
    if (kind === 'arena') return { plan: arena, phase: 2, back: { x: arena.gong.x, z: arena.gong.z + 2.5 } };
    return { plan: lair, phase: 2, boss: 'reineAraignee', outro: 'O2', nextChapter: 3, back: { x: lair.center.x + 4, z: lair.center.z + 6 } };
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
    let text = OBJECTIVE_EXPLORE_FOREST;
    let target: { x: number; z: number } = landmarks.village;
    if (goal.kind === 'npc') {
      text = questLine(goal.quest, book.state(goal.quest.id), name);
      target = this.quests.npcSpot(goal.npc);
    } else if (goal.kind === 'task') {
      text = questLine(goal.quest, book.state(goal.quest.id), name);
      target = this.quests.taskTarget(goal.quest.id, hero);
    } else if (goal.kind === 'arena' && !this.arena.finished) {
      text = OBJECTIVE_GO_FOREST_ARENA;
      target = landmarks.arena;
    }
    // Après l'arène : la quête de la Reine Araignée (P2), puis la fin du chapitre.
    if (goal.kind === 'arena' && this.arena.finished) {
      const step = progress(this.state).bossQuest;
      if (step === 'locked') {
        text = `${NPC_NAMES.noisette} a besoin d’aide`;
        target = this.quests.npcSpot('noisette');
      } else if (step === 'active') {
        text = `${P2_TITLE} : ${P2_TASK.replace('{n}', String(Math.min(WEB_COUNT, progress(this.state).bossSteps)))}`;
        target = this.boss.trailTarget();
      } else {
        text = OBJECTIVE_FOREST_DONE;
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
    if (progress(this.state).bossQuest === 'defeated') done.push(P2_TITLE);
    return { text, target, current, done };
  }

  override snapshot(): ReturnType<WorldLife['snapshot']> & {
    forestSanctuary: ReturnType<ForestSanctuaryLife['snapshot']>;
    forestQuests: ReturnType<ForestQuestLife['snapshot']>;
    forestBoss: ReturnType<ForestBossLife['snapshot']>;
    rune: { x: number; z: number; found: boolean };
  } {
    const rune = { ...this.layout.rune, found: this.state.itemsFound.includes(RUNE_ID) };
    return { ...super.snapshot(), forestSanctuary: this.sanctuary.snapshot(), forestQuests: this.quests.snapshot(), forestBoss: this.boss.snapshot(), rune };
  }
}
