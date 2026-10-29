import * as THREE from 'three';
import type { MonsterAgent } from '../combat/realtime/worldSim';
import {
  QUESTS_P5,
  TEXT_CIEL_ARENA_OPEN,
  TEXT_FLOWER_WATERED,
  TEXT_GIVE_LETTER,
  TEXT_GUARDIAN_HELLO,
  TEXT_LETTER_GIVEN,
  TEXT_LIGHTHOUSE_BRAZIER,
  TEXT_PICK_UP,
  TEXT_QUEST_DONE_TOAST,
  TEXT_WATER,
  TEXT_WIND_CRYSTAL,
  type QuestNpc,
} from '../data/quests';
import { TEXT_LIGHT_BRAZIER } from '../data/bossQuest';
import { CubeModel } from '../entities/cubeModel';
import { MODELS, PORTRAITS, type ModelId } from '../entities/models';
import type { HeroState } from '../entities/heroController';
import { QuestBook } from '../quests/villageQuests';
import { NPC_NAMES } from '../story/dialogues';
import type { DialogBubble } from '../ui/dialog';
import type { WorldLabels } from '../ui/worldLabels';
import { HARPIES_CAMP, type CielLayout } from '../world/ciel';
import type { Point2, Point3 } from '../world/layout';
import { audio } from '../audio/audio';
import { progress, type GameState } from './gameState';
import type { Interactable, Interactions } from './interactions';

const NPCS: readonly QuestNpc[] = ['azur'];

export interface CielQuestHooks {
  dialog: DialogBubble;
  toast: (text: string) => void;
  labels: WorldLabels;
  burst: (x: number, y: number, z: number, color: number, count?: number) => void;
  gainFood: (amount: number, x: number, y: number, z: number) => void;
  onProgress: () => void;
  bossTalk: () => boolean;
  bossOffer: () => boolean;
}

interface Item {
  model: CubeModel;
  talk: Interactable;
  done: boolean;
}

/**
 * Quêtes du Village des Nuages (CONTENU.md § E, phase 5) : les cristaux de vent sur les îlots (on y
 * saute), les braseros du phare, les harpies du pont, les fleurs célestes à arroser et la lettre au
 * gardien de la plus haute tour.
 */
export class CielQuestLife {
  readonly book: QuestBook;
  private readonly group = new THREE.Group();
  private readonly npcSpots: Record<string, Point3>;
  private readonly crystals: Item[];
  private readonly braziers: Item[];
  private readonly flowers: Item[];
  private readonly guardianTalk: Interactable;
  private arenaAnnounced: boolean;
  private time = 0;

  constructor(
    private readonly layout: CielLayout,
    parent: THREE.Group,
    private readonly state: GameState,
    private readonly interactions: Interactions,
    private readonly harpies: () => MonsterAgent[],
    private readonly hooks: CielQuestHooks,
  ) {
    parent.add(this.group);
    this.book = new QuestBook(progress(state, 'ciel').quests, QUESTS_P5);
    this.arenaAnnounced = this.book.mandatoryDone;
    const ground = (p: Point2): number => layout.world.standY(Math.floor(p.x), Math.floor(p.z));
    this.npcSpots = Object.fromEntries(layout.npcs.map((n) => [n.id, { x: n.x, y: ground(n), z: n.z }]));
    const place = (id: ModelId, p: Point2, facing = 0): CubeModel => {
      const m = new CubeModel(MODELS[id]);
      m.root.position.set(p.x, ground(p), p.z);
      m.root.rotation.y = facing;
      this.group.add(m.root);
      return m;
    };
    const items = (id: ModelId, points: Point2[], prefix: string, label: string, act: (it: Item) => void): Item[] =>
      points.map((p, i) => {
        const it: Item = { model: place(id, p, i), talk: { id: `${prefix}-${i}`, ...p, y: ground(p), radius: 1.6, label, action: () => act(it) }, done: false };
        return it;
      });
    this.crystals = items('windCrystal', layout.windCrystals, 'q5-crystal', TEXT_PICK_UP, (it) => this.pickCrystal(it));
    this.braziers = items('brazier', layout.lighthouseBraziers, 'q5-brazier', TEXT_LIGHT_BRAZIER, (it) => this.lightBrazier(it));
    this.flowers = items('skyFlower', layout.flowers, 'q5-flower', TEXT_WATER, (it) => this.water(it));
    // Le gardien, tout en haut de la plus haute tour.
    const g = layout.guardian;
    const guardian = new CubeModel(MODELS.gardien);
    guardian.root.position.set(g.x, g.y, g.z);
    guardian.root.rotation.y = Math.PI;
    this.group.add(guardian.root);
    this.guardianTalk = { id: 'q5-guardian', x: g.x, y: g.y, z: g.z, radius: 2, label: TEXT_GIVE_LETTER, action: () => this.giveLetter() };

    // Avancement enregistré.
    const restore = (list: Item[], id: 'R1' | 'R2' | 'O1'): void => {
      const st = this.book.state(id);
      list.forEach((it, i) => (it.done = st.status === 'done' || st.status === 'ready' || i < st.progress));
    };
    restore(this.crystals, 'R1');
    restore(this.braziers, 'R2');
    restore(this.flowers, 'O1');
    if (this.book.state('R3').status === 'done' || this.book.state('R3').status === 'ready')
      for (const m of this.harpies()) {
        m.mode = 'dead';
        m.hp = 0;
        m.cleared = true;
      }
    this.sync();
  }

  private sync(): void {
    const set = (it: Interactable, on: boolean): void => {
      this.interactions.remove(it.id);
      if (on) this.interactions.add(it);
    };
    for (const c of this.crystals) {
      c.model.root.visible = this.book.isActive('R1') && !c.done;
      set(c.talk, this.book.isActive('R1') && !c.done);
    }
    const r2 = this.book.state('R2').status;
    for (const b of this.braziers) {
      set(b.talk, this.book.isActive('R2') && !b.done);
      const flame = b.model.part('flame');
      if (flame) flame.visible = b.done || r2 === 'done';
    }
    for (const f of this.flowers) {
      set(f.talk, this.book.isActive('O1') && !f.done);
      const bloom = f.model.part('watered');
      const bud = f.model.part('bud');
      if (bloom) bloom.visible = f.done;
      if (bud) bud.visible = !f.done;
    }
    // Hors de la quête, le gardien dit simplement bonjour.
    this.guardianTalk.label = this.book.isActive('O2') ? TEXT_GIVE_LETTER : '…';
    set(this.guardianTalk, this.book.isActive('O2'));
  }

  talk(npc: string): boolean {
    if (!NPCS.includes(npc as QuestNpc)) return false;
    const id = npc as QuestNpc;
    const res = this.book.talk(id);
    const line = (text: string): void => this.hooks.dialog.show({ speaker: NPC_NAMES[id], portrait: PORTRAITS[id], text });
    if (res.kind === 'none') return this.hooks.bossTalk();
    if (res.kind === 'thanks') {
      line(res.quest.thanks);
      const p = this.npcSpots[id];
      this.hooks.gainFood(res.reward, p.x, p.y + 2.2, p.z);
      this.hooks.toast(TEXT_QUEST_DONE_TOAST.replace('{titre}', res.quest.title));
      this.hooks.burst(p.x, p.y + 1.6, p.z, 0xffe27a, 20);
      audio.sfx('quest');
    } else {
      line(res.quest.request);
      if (res.kind === 'request' && res.quest.id === 'R3') this.countHarpies();
    }
    this.sync();
    this.hooks.onProgress();
    return true;
  }

  private tick(it: Item, id: 'R1' | 'R2' | 'O1', text: string, color: number, sfx: Parameters<typeof audio.sfx>[0]): void {
    if (!this.book.isActive(id) || it.done) return;
    it.done = true;
    const p = it.model.root.position;
    this.hooks.burst(p.x, p.y + 0.6, p.z, color, 14);
    audio.sfx(sfx);
    this.book.increment(id);
    const goal = QUESTS_P5.find((q) => q.id === id)!.goal;
    this.hooks.toast(text.replace('{n}', String(this.book.state(id).progress)).replace('{goal}', String(goal)));
    this.sync();
    this.hooks.onProgress();
  }

  private pickCrystal(it: Item): void {
    this.tick(it, 'R1', TEXT_WIND_CRYSTAL, 0x9ad8ff, 'chime');
  }

  private lightBrazier(it: Item): void {
    this.tick(it, 'R2', TEXT_LIGHTHOUSE_BRAZIER, 0xffa040, 'fire');
  }

  private water(it: Item): void {
    this.tick(it, 'O1', TEXT_FLOWER_WATERED, 0x4a9ae8, 'pop');
  }

  private giveLetter(): void {
    if (!this.book.isActive('O2')) {
      this.hooks.dialog.show({ speaker: NPC_NAMES.gardien, portrait: PORTRAITS.gardien, text: TEXT_GUARDIAN_HELLO });
      return;
    }
    this.book.setProgress('O2', 1);
    const g = this.layout.guardian;
    this.hooks.burst(g.x, g.y + 1.6, g.z, 0xfff3c0, 16);
    audio.sfx('quest');
    this.hooks.dialog.show({ speaker: NPC_NAMES.gardien, portrait: PORTRAITS.gardien, text: TEXT_LETTER_GIVEN });
    this.sync();
    this.hooks.onProgress();
  }

  private countHarpies(): void {
    if (!this.book.isActive('R3')) return;
    const dead = this.harpies().filter((m) => m.mode === 'dead');
    for (const m of dead) m.cleared = true;
    this.book.setProgress('R3', dead.length);
  }

  update(dt: number, _hero: HeroState, playing: boolean): void {
    this.time += dt;
    if (progress(this.state, 'ciel').sanctuary.step === 'hatched' && !this.book.unlocked) {
      this.book.unlockAll();
      this.sync();
    }
    if (playing) this.countHarpies();
    if (!this.arenaAnnounced && this.book.mandatoryDone) {
      this.arenaAnnounced = true;
      this.hooks.toast(TEXT_CIEL_ARENA_OPEN);
    }
    for (const c of this.crystals) {
      c.model.root.rotation.y += dt * 1.5;
      const body = c.model.part('body');
      if (body) body.position.y = 0.5 + Math.sin(this.time * 2 + c.talk.x) * 0.12;
    }
    for (const b of this.braziers) {
      const flame = b.model.part('flame');
      if (flame?.visible) flame.scale.y = 1 + Math.sin(this.time * 9 + b.talk.x) * 0.12;
    }
    for (const npc of NPCS) {
      const mark = this.book.marker(npc) ?? (this.hooks.bossOffer() ? 'give' : null);
      if (!mark) continue;
      const p = this.npcSpots[npc];
      this.hooks.labels.text(`quest-${npc}`, '!', p.x, p.y + 2.9 + Math.sin(this.time * 3) * 0.05, p.z, mark === 'return' ? 'quest-mark return' : 'quest-mark');
    }
  }

  npcSpot(npc: QuestNpc): Point2 {
    return this.npcSpots[npc] ?? this.layout.landmarks.village;
  }

  taskTarget(id: string, hero: Point2): Point2 {
    const nearest = (items: Item[]): Point2 | null => {
      let best: Point2 | null = null;
      let bestD = Infinity;
      for (const it of items) {
        const p = it.model.root.position;
        const d = Math.hypot(p.x - hero.x, p.z - hero.z);
        if (d < bestD) {
          best = { x: p.x, z: p.z };
          bestD = d;
        }
      }
      return best;
    };
    if (id === 'R1') return nearest(this.crystals.filter((c) => !c.done)) ?? this.npcSpot('azur');
    if (id === 'R2') return nearest(this.braziers.filter((b) => !b.done)) ?? this.npcSpot('azur');
    if (id === 'R3') return this.layout.camps.find((c) => c.id === HARPIES_CAMP) ?? this.layout.landmarks.village;
    if (id === 'O1') return nearest(this.flowers.filter((f) => !f.done)) ?? this.npcSpot('azur');
    if (id === 'O2') return this.layout.guardian;
    return this.layout.landmarks.village;
  }

  snapshot(): {
    log: CielQuestLife['book']['log'];
    crystals: (Point2 & { done: boolean })[];
    braziers: (Point2 & { done: boolean })[];
    flowers: (Point2 & { done: boolean })[];
    guardian: Point3;
  } {
    const at = (i: Item): Point2 & { done: boolean } => ({ x: i.talk.x, z: i.talk.z, done: i.done });
    return { log: this.book.log, crystals: this.crystals.map(at), braziers: this.braziers.map(at), flowers: this.flowers.map(at), guardian: this.layout.guardian };
  }
}
