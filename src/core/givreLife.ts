import * as THREE from 'three';
import { OBJECTIVE_GIVRE_DONE, P4_REMINDER, P4_REQUEST, P4_TASK, P4_TITLE } from '../data/bossQuest';
import { OBJECTIVE_GO_GIVRE_ARENA, TEXT_HEART_FOUND, TEXT_PICK_UP, type QuestNpc } from '../data/quests';
import type { HeroState } from '../entities/heroController';
import { PORTRAITS } from '../entities/models';
import { questLine } from '../quests/villageQuests';
import { NPC_NAMES, OBJECTIVE_FIND_EGG } from '../story/dialogues';
import { YETIS_CAMP, type GivreLayout } from '../world/givre';
import type { Point3 } from '../world/layout';
import { audio } from '../audio/audio';
import { ArenaLife } from './arenaLife';
import { itemTip } from './evolution';
import { FrostSanctuaryLife, type FrostSanctuaryHooks } from './frostSanctuaryLife';
import { markSeen, progress, type GameState } from './gameState';
import { GivreBossLife } from './givreBossLife';
import { GivreQuestLife } from './givreQuestLife';
import type { Interactions } from './interactions';
import type { SolidFn } from './physics';
import type { Rng } from './rng';
import { SEEN_RADIUS, WorldLife, type FightSetup, type Objective, type WorldHooks } from './worldLife';

/** Objectif des Pics de Givre quand les quêtes attendent (texte nouveau, à valider). */
export const OBJECTIVE_EXPLORE_GIVRE = 'Explore les Pics de Givre';
const HEART_ID = 'givre-coeur';
/** Flocons de neige (InstancedMesh, un seul appel de dessin) : autour du héros, et la tempête du sommet. */
const SNOW_FLAKES = 700;
const SNOW_CALM = 220;
const SNOW_BOX = 22;
const STORM_RADIUS = 34;

export interface GivreHooks extends WorldHooks {
  onFight: () => void;
  onBossFight: () => void;
  sanctuary: Omit<FrostSanctuaryHooks, 'dialog' | 'toast' | 'burst'>;
}

/**
 * Les Pics de Givre (chapitre 4) : le sanctuaire gelé, les quêtes des Igloos du Col, l'arène,
 * le sentier du blizzard et la Sorcière, le Cœur ancestral caché, la neige qui tombe.
 */
export class GivreLife extends WorldLife {
  declare readonly layout: GivreLayout;
  readonly sanctuary: FrostSanctuaryLife;
  readonly quests: GivreQuestLife;
  readonly arena: ArenaLife;
  readonly boss: GivreBossLife;
  private readonly snow: THREE.InstancedMesh;
  private readonly flakes: Float32Array;
  private readonly matrix = new THREE.Matrix4();

  constructor(layout: GivreLayout, state: GameState, atlas: THREE.Texture, solid: SolidFn, rng: Rng, interactions: Interactions, hooks: GivreHooks) {
    super(layout, state, atlas, solid, rng, interactions, hooks);
    const burst = (x: number, y: number, z: number, color: number, count?: number): void => hooks.sparks.burst(x, y, z, color, count ?? 12);
    this.sanctuary = new FrostSanctuaryLife(layout.sanctuary, layout.world, this.group, state, interactions, rng, hooks.labels, {
      ...hooks.sanctuary,
      dialog: hooks.dialog,
      toast: hooks.toast,
      burst,
      onProgress: hooks.onProgress,
    });
    this.quests = new GivreQuestLife(layout, this.group, state, interactions, () => this.sim.monsters.filter((m) => m.campId === YETIS_CAMP), {
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
    this.boss = new GivreBossLife(layout, this.group, state, interactions, { onBossFight: hooks.onBossFight, toast: hooks.toast, burst, onProgress: hooks.onProgress });

    // Cœur ancestral caché (SPEC.md § 4.3) : entre les sapins du sud-est.
    if (!state.itemsFound.includes(HEART_ID)) {
      const gem = this.spawnStatic('heartItem', layout.heart.x, layout.heart.z, 0);
      const y = layout.world.standY(Math.floor(layout.heart.x), Math.floor(layout.heart.z));
      interactions.add({
        id: HEART_ID,
        ...layout.heart,
        y,
        radius: 1.8,
        label: TEXT_PICK_UP,
        action: () => {
          state.items.heart = (state.items.heart ?? 0) + 1;
          state.itemsFound.push(HEART_ID);
          interactions.remove(HEART_ID);
          gem.root.visible = false;
          burst(layout.heart.x, y + 1, layout.heart.z, 0xff6aa8, 30);
          audio.sfx('star');
          hooks.toast(TEXT_HEART_FOUND);
          itemTip(state, hooks.dialog);
          hooks.onProgress();
        },
      });
    }

    // La neige : de petits cubes blancs qui tombent autour du héros, sans ombre ni éclairage.
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
    this.snow = new THREE.InstancedMesh(geo, mat, SNOW_FLAKES);
    this.snow.frustumCulled = false;
    this.flakes = new Float32Array(SNOW_FLAKES * 3);
    for (let i = 0; i < SNOW_FLAKES; i++) {
      this.flakes[i * 3] = (rng() - 0.5) * SNOW_BOX;
      this.flakes[i * 3 + 1] = rng() * 14;
      this.flakes[i * 3 + 2] = (rng() - 0.5) * SNOW_BOX;
    }
    this.group.add(this.snow);
  }

  override dispose(): void {
    super.dispose();
    this.snow.geometry.dispose();
    (this.snow.material as THREE.Material).dispose();
  }

  /** Grand-mère Flocon donne la quête du boss (P4) une fois l'arène terminée. */
  private bossTalk(): boolean {
    const p = progress(this.state);
    if (!this.arena.finished || p.bossQuest === 'defeated') return false;
    const say = (text: string): void => this.hooks.dialog.show({ speaker: NPC_NAMES.flocon, portrait: PORTRAITS.flocon, text });
    if (p.bossQuest === 'locked') {
      p.bossQuest = 'active';
      say(P4_REQUEST);
    } else say(P4_REMINDER);
    this.hooks.onProgress();
    return true;
  }

  protected override talk(npcId: string): boolean {
    return this.quests.talk(npcId);
  }

  protected override aimTarget(): Point3 | null {
    return null;
  }

  private updateSnow(dt: number, hero: HeroState): void {
    // La tempête du sommet : beaucoup plus de flocons près du repaire, tant que les braseros n'ont pas tout éclairé.
    const s = this.layout.summit.center;
    const nearStorm = Math.max(0, 1 - Math.hypot(hero.x - s.x, hero.z - s.z) / STORM_RADIUS);
    const storm = nearStorm * (1 - this.boss.calm);
    const count = Math.round(SNOW_CALM + (SNOW_FLAKES - SNOW_CALM) * storm);
    this.snow.count = count;
    const wind = 0.6 + storm * 4;
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      this.flakes[k] += dt * wind;
      this.flakes[k + 1] -= dt * (1.2 + (i % 5) * 0.15);
      if (this.flakes[k + 1] < 0) this.flakes[k + 1] += 14;
      if (this.flakes[k] > SNOW_BOX / 2) this.flakes[k] -= SNOW_BOX;
      // Les flocons restent dans une boîte qui suit le héros (coordonnées repliées).
      const wx = hero.x + wrap(this.flakes[k] - hero.x, SNOW_BOX);
      const wz = hero.z + wrap(this.flakes[k + 2] - hero.z, SNOW_BOX);
      this.matrix.makeTranslation(wx, hero.y - 2 + this.flakes[k + 1], wz);
      this.snow.setMatrixAt(i, this.matrix);
    }
    this.snow.instanceMatrix.needsUpdate = true;
  }

  protected override updateChapter(dt: number, hero: HeroState, playing: boolean): void {
    this.sanctuary.update(dt, hero, playing);
    this.updateSnow(dt, hero);
    if (!playing) return;
    this.quests.update(dt, hero, playing);
    this.arena.update(dt);
    this.boss.update(dt);
    const s = this.layout.summit.boss;
    if (progress(this.state).bossQuest !== 'locked' && Math.hypot(s.x - hero.x, s.z - hero.z) < SEEN_RADIUS + 6) markSeen(this.state, 'sorciere');
  }

  override fightSetup(kind: 'arena' | 'boss'): FightSetup {
    const { arena, summit } = this.layout;
    if (kind === 'arena') return { plan: arena, phase: 4, back: { x: arena.gong.x, z: arena.gong.z + 2.5 } };
    return { plan: summit, phase: 4, boss: 'sorciere', outro: 'O4', nextChapter: 5, back: { x: summit.center.x + 4, z: summit.center.z + 7 } };
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
    let text = OBJECTIVE_EXPLORE_GIVRE;
    let target: { x: number; z: number } = landmarks.village;
    if (goal.kind === 'npc') {
      text = questLine(goal.quest, book.state(goal.quest.id), name);
      target = this.quests.npcSpot(goal.npc);
    } else if (goal.kind === 'task') {
      text = questLine(goal.quest, book.state(goal.quest.id), name);
      target = this.quests.taskTarget(goal.quest.id, hero);
    } else if (goal.kind === 'arena' && !this.arena.finished) {
      text = OBJECTIVE_GO_GIVRE_ARENA;
      target = landmarks.arena;
    }
    if (goal.kind === 'arena' && this.arena.finished) {
      if (p.bossQuest === 'locked') {
        text = `${NPC_NAMES.flocon} a besoin d’aide`;
        target = this.quests.npcSpot('flocon');
      } else if (p.bossQuest === 'active') {
        text = `${P4_TITLE} : ${P4_TASK.replace('{n}', String(this.boss.count))}`;
        target = this.boss.trailTarget(hero);
      } else {
        text = OBJECTIVE_GIVRE_DONE;
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
    if (p.bossQuest === 'defeated') done.push(P4_TITLE);
    return { text, target, current, done };
  }

  override snapshot(): ReturnType<WorldLife['snapshot']> & {
    frost: ReturnType<FrostSanctuaryLife['snapshot']>;
    givreQuests: ReturnType<GivreQuestLife['snapshot']>;
    givreBoss: ReturnType<GivreBossLife['snapshot']>;
    heart: { x: number; z: number; found: boolean };
    snow: number;
  } {
    return {
      ...super.snapshot(),
      frost: this.sanctuary.snapshot(),
      givreQuests: this.quests.snapshot(),
      givreBoss: this.boss.snapshot(),
      heart: { ...this.layout.heart, found: this.state.itemsFound.includes(HEART_ID) },
      snow: this.snow.count,
    };
  }
}

/** Ramène v dans [−size/2, size/2[. */
function wrap(v: number, size: number): number {
  return ((((v + size / 2) % size) + size) % size) - size / 2;
}
