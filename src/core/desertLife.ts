import type * as THREE from 'three';
import { OBJECTIVE_DESERT_DONE, P3_REMINDER, P3_REQUEST, P3_TASK, P3_TITLE } from '../data/bossQuest';
import { OBJECTIVE_GO_DESERT_ARENA, TEXT_CRYSTAL_FOUND, TEXT_PICK_UP, type QuestNpc } from '../data/quests';
import type { HeroState } from '../entities/heroController';
import { PORTRAITS } from '../entities/models';
import { questLine } from '../quests/villageQuests';
import { NPC_NAMES, OBJECTIVE_FIND_EGG } from '../story/dialogues';
import { SCORPIONS_CAMP, type DesertLayout } from '../world/desert';
import type { Point3 } from '../world/layout';
import { audio } from '../audio/audio';
import { ArenaLife } from './arenaLife';
import { DesertBossLife } from './desertBossLife';
import { DesertQuestLife } from './desertQuestLife';
import { itemTip } from './evolution';
import { markSeen, progress, type GameState } from './gameState';
import type { Interactions } from './interactions';
import type { SolidFn } from './physics';
import type { Rng } from './rng';
import type { SanctuaryHooks } from './sanctuaryLife';
import { TempleLife } from './templeLife';
import { SEEN_RADIUS, WorldLife, type FightSetup, type Objective, type WorldHooks } from './worldLife';

/** Objectif du Désert quand les quêtes attendent (texte nouveau, à valider). */
export const OBJECTIVE_EXPLORE_DESERT = 'Explore le Désert des Sables Chantants';
const CRYSTAL_ID = 'desert-cristal';

export interface DesertHooks extends WorldHooks {
  onFight: () => void;
  onBossFight: () => void;
  shake: () => void;
  sanctuary: Omit<SanctuaryHooks, 'dialog' | 'toast' | 'burst'>;
}

/**
 * Le Désert des Sables Chantants (chapitre 3) : le temple ensablé, les quêtes de Palmebloc, l'arène,
 * les tambours des dunes et le Grand Ver, le Cristal de puissance caché.
 */
export class DesertLife extends WorldLife {
  declare readonly layout: DesertLayout;
  readonly temple: TempleLife;
  readonly quests: DesertQuestLife;
  readonly arena: ArenaLife;
  readonly boss: DesertBossLife;

  constructor(layout: DesertLayout, state: GameState, atlas: THREE.Texture, solid: SolidFn, rng: Rng, interactions: Interactions, hooks: DesertHooks) {
    super(layout, state, atlas, solid, rng, interactions, hooks);
    const burst = (x: number, y: number, z: number, color: number, count?: number): void => hooks.sparks.burst(x, y, z, color, count ?? 12);
    this.temple = new TempleLife(layout.temple, layout.world, this.group, state, interactions, rng, hooks.labels, {
      ...hooks.sanctuary,
      dialog: hooks.dialog,
      toast: hooks.toast,
      burst,
      onProgress: hooks.onProgress,
    });
    this.quests = new DesertQuestLife(layout, this.group, state, interactions, () => this.sim.monsters.filter((m) => m.campId === SCORPIONS_CAMP), {
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
    this.boss = new DesertBossLife(layout, this.group, state, interactions, { onBossFight: hooks.onBossFight, toast: hooks.toast, burst, shake: hooks.shake, onProgress: hooks.onProgress });

    // Cristal de puissance caché (SPEC.md § 4.3) : au sud-ouest, derrière les cactus.
    if (!state.itemsFound.includes(CRYSTAL_ID)) {
      const gem = this.spawnStatic('crystalItem', layout.crystal.x, layout.crystal.z, 0);
      const y = layout.world.standY(Math.floor(layout.crystal.x), Math.floor(layout.crystal.z));
      interactions.add({
        id: CRYSTAL_ID,
        ...layout.crystal,
        y,
        radius: 1.8,
        label: TEXT_PICK_UP,
        action: () => {
          state.items.crystal = (state.items.crystal ?? 0) + 1;
          state.itemsFound.push(CRYSTAL_ID);
          interactions.remove(CRYSTAL_ID);
          gem.root.visible = false;
          burst(layout.crystal.x, y + 1, layout.crystal.z, 0xffa030, 30);
          audio.sfx('star');
          hooks.toast(TEXT_CRYSTAL_FOUND);
          itemTip(state, hooks.dialog);
          hooks.onProgress();
        },
      });
    }
  }

  /** Dame Oasia donne la quête du boss (P3) une fois l'arène terminée. */
  private bossTalk(): boolean {
    const p = progress(this.state);
    if (!this.arena.finished || p.bossQuest === 'defeated') return false;
    const say = (text: string): void => this.hooks.dialog.show({ speaker: NPC_NAMES.oasia, portrait: PORTRAITS.oasia, text });
    if (p.bossQuest === 'locked') {
      p.bossQuest = 'active';
      say(P3_REQUEST);
    } else say(P3_REMINDER);
    this.hooks.onProgress();
    return true;
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

  protected override updateChapter(dt: number, hero: HeroState, playing: boolean): void {
    this.temple.update(dt, hero, playing);
    if (!playing) return;
    this.quests.update(dt, hero, playing);
    this.arena.update(dt);
    this.boss.update(dt);
    const pit = this.layout.pit.boss;
    if (progress(this.state).bossQuest !== 'locked' && Math.hypot(pit.x - hero.x, pit.z - hero.z) < SEEN_RADIUS + 6) markSeen(this.state, 'grandVer');
  }

  override fightSetup(kind: 'arena' | 'boss'): FightSetup {
    const { arena, pit } = this.layout;
    if (kind === 'arena') return { plan: arena, phase: 3, back: { x: arena.gong.x, z: arena.gong.z + 2.5 } };
    return { plan: pit, phase: 3, boss: 'grandVer', outro: 'O3', nextChapter: 4, back: { x: pit.center.x + 4, z: pit.center.z + 7 } };
  }

  objective(hero: HeroState): Objective {
    const p = progress(this.state);
    const { landmarks } = this.layout;
    if (p.sanctuary.step !== 'hatched') {
      return { text: OBJECTIVE_FIND_EGG, target: this.layout.temple.entrance, current: [{ text: OBJECTIVE_FIND_EGG, active: true }], done: [] };
    }
    const book = this.quests.book;
    const name = (id: QuestNpc): string => NPC_NAMES[id];
    const goal = book.objective();
    let text = OBJECTIVE_EXPLORE_DESERT;
    let target: { x: number; z: number } = landmarks.village;
    if (goal.kind === 'npc') {
      text = questLine(goal.quest, book.state(goal.quest.id), name);
      target = this.quests.npcSpot(goal.npc);
    } else if (goal.kind === 'task') {
      text = questLine(goal.quest, book.state(goal.quest.id), name);
      target = this.quests.taskTarget(goal.quest.id, hero);
    } else if (goal.kind === 'arena' && !this.arena.finished) {
      text = OBJECTIVE_GO_DESERT_ARENA;
      target = landmarks.arena;
    }
    if (goal.kind === 'arena' && this.arena.finished) {
      if (p.bossQuest === 'locked') {
        text = `${NPC_NAMES.oasia} a besoin d’aide`;
        target = this.quests.npcSpot('oasia');
      } else if (p.bossQuest === 'active') {
        text = `${P3_TITLE} : ${P3_TASK.replace('{n}', String(this.boss.count))}`;
        target = this.boss.trailTarget(hero);
      } else {
        text = OBJECTIVE_DESERT_DONE;
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
    if (p.bossQuest === 'defeated') done.push(P3_TITLE);
    return { text, target, current, done };
  }

  override snapshot(): ReturnType<WorldLife['snapshot']> & {
    temple: ReturnType<TempleLife['snapshot']>;
    desertQuests: ReturnType<DesertQuestLife['snapshot']>;
    desertBoss: ReturnType<DesertBossLife['snapshot']>;
    crystal: { x: number; z: number; found: boolean };
  } {
    return {
      ...super.snapshot(),
      temple: this.temple.snapshot(),
      desertQuests: this.quests.snapshot(),
      desertBoss: this.boss.snapshot(),
      crystal: { ...this.layout.crystal, found: this.state.itemsFound.includes(CRYSTAL_ID) },
    };
  }
}
