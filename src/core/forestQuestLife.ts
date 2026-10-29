import * as THREE from 'three';
import type { MonsterAgent } from '../combat/realtime/worldSim';
import {
  QUESTS_P2,
  TEXT_BRIDGE_FIXED,
  TEXT_DROP_LETTER,
  TEXT_LANTERN_FOUND,
  TEXT_LETTER_DROPPED,
  TEXT_MUSHROOM_BLUE,
  TEXT_MUSHROOM_RED,
  TEXT_PICK_FLOWER,
  TEXT_PICK_UP,
  TEXT_PLANK_FOUND,
  TEXT_QUEST_DONE_TOAST,
  TEXT_FOREST_ARENA_OPEN,
  type QuestNpc,
} from '../data/quests';
import { CubeModel } from '../entities/cubeModel';
import { MODELS, PORTRAITS, type ModelId } from '../entities/models';
import { QuestBook } from '../quests/villageQuests';
import { NPC_NAMES } from '../story/dialogues';
import type { DialogBubble } from '../ui/dialog';
import type { WorldLabels } from '../ui/worldLabels';
import { Block } from '../world/blocks';
import { WOLVES_CAMP, type ForestLayout } from '../world/forest';
import type { Point2, Point3 } from '../world/layout';
import type { Cell } from '../world/structures';
import { audio } from '../audio/audio';
import { progress, type GameState } from './gameState';
import type { Interactable, Interactions } from './interactions';

const NPCS: readonly QuestNpc[] = ['noisette', 'pip', 'tilleul'];
const ITEM_RADIUS = 1.6;

export interface ForestQuestHooks {
  dialog: DialogBubble;
  toast: (text: string, seconds?: number) => void;
  labels: WorldLabels;
  burst: (x: number, y: number, z: number, color: number, count?: number) => void;
  gainFood: (amount: number, x: number, y: number, z: number) => void;
  rebuild: (cells: Cell[]) => void;
  onProgress: () => void;
  /** Quête du boss (P2), donnée par Sage Noisette après l'arène : true si elle a parlé. */
  bossTalk: () => boolean;
  /** Une quête du boss est à proposer (marqueur « ! » au-dessus de Sage Noisette). */
  bossOffer: () => boolean;
}

interface Item {
  id: string;
  model: CubeModel;
  talk: Interactable;
  taken: boolean;
}

/**
 * Quêtes des Cabanes des Cimes (CONTENU.md § E, phase 2) dans le monde : la lanterne de Pip,
 * les planches du pont (vieilles caisses à casser), les loups du ruisseau, les champignons bleus
 * (les rouges ne comptent pas) et la lettre à porter à la cabane la plus haute.
 */
export class ForestQuestLife {
  readonly book: QuestBook;
  private readonly group = new THREE.Group();
  private readonly npcSpots: Record<string, Point3>;
  private readonly lantern: Item;
  private readonly planks: Item[];
  private readonly blue: Item[];
  private readonly red: Item[];
  private readonly letterTalk: Interactable;
  private arenaAnnounced: boolean;
  private time = 0;

  constructor(
    private readonly layout: ForestLayout,
    parent: THREE.Group,
    private readonly state: GameState,
    private readonly interactions: Interactions,
    private readonly wolves: () => MonsterAgent[],
    private readonly hooks: ForestQuestHooks,
  ) {
    parent.add(this.group);
    this.book = new QuestBook(progress(state, 'foret').quests, QUESTS_P2);
    this.arenaAnnounced = this.book.mandatoryDone;
    const ground = (x: number, z: number): number => layout.world.standY(Math.floor(x), Math.floor(z));
    this.npcSpots = Object.fromEntries(layout.npcs.map((n) => [n.id, { x: n.x, y: ground(n.x, n.z), z: n.z }]));

    const item = (id: string, model: ModelId, p: Point2, label: string, action: () => void, scale = 1): Item => {
      const m = new CubeModel(MODELS[model], scale);
      m.root.position.set(p.x, ground(p.x, p.z), p.z);
      this.group.add(m.root);
      return { id, model: m, taken: false, talk: { id, x: p.x, y: ground(p.x, p.z), z: p.z, radius: ITEM_RADIUS, label, action } };
    };
    this.lantern = item('q2-lantern', 'lanternUnlit', layout.village.pipLantern, TEXT_PICK_UP, () => this.takeLantern(), 0.6);
    this.planks = layout.plankCrates.map((p, i) => item(`q2-plank-${i}`, 'keyCrate', p, '', () => undefined));
    this.blue = layout.mushrooms.blue.map((p, i) => item(`q2-blue-${i}`, 'mushroomBlue', p, TEXT_PICK_FLOWER, () => this.pickBlue(i), 1.6));
    this.red = layout.mushrooms.red.map((p, i) => item(`q2-red-${i}`, 'mushroomRed', p, TEXT_PICK_FLOWER, () => this.pickRed(i), 1.6));
    const h = layout.village.highCabin;
    this.letterTalk = { id: 'q2-letter', x: h.x, y: h.y, z: h.z, radius: 2.2, label: TEXT_DROP_LETTER, action: () => this.dropLetter() };

    // Avancement enregistré : objets déjà trouvés, pont déjà réparé, loups déjà chassés.
    const st = (id: 'R1' | 'R2' | 'R3' | 'O1' | 'O2'): string => this.book.state(id).status;
    this.lantern.taken = st('R1') === 'ready' || st('R1') === 'done';
    const planks = this.book.state('R2').progress;
    this.planks.forEach((p, i) => (p.taken = st('R2') === 'done' || i < planks));
    const blues = this.book.state('O1').progress;
    this.blue.forEach((b, i) => (b.taken = st('O1') === 'done' || i < blues));
    if (st('R2') === 'done') this.fixBridge(false);
    if (st('R3') === 'done' || st('R3') === 'ready')
      for (const m of this.wolves()) {
        m.mode = 'dead';
        m.hp = 0;
        m.cleared = true;
      }
    this.sync();
  }

  /** Les objets et interactions n'existent que pendant leur quête. */
  private sync(): void {
    const set = (it: Interactable, on: boolean): void => {
      this.interactions.remove(it.id);
      if (on) this.interactions.add(it);
    };
    const show = (i: Item, on: boolean): void => {
      i.model.root.visible = on;
      if (i.talk.label) set(i.talk, on);
    };
    show(this.lantern, this.book.isActive('R1') && !this.lantern.taken);
    for (const p of this.planks) p.model.root.visible = this.book.isActive('R2') && !p.taken;
    for (const b of this.blue) show(b, this.book.isActive('O1') && !b.taken);
    for (const r of this.red) show(r, this.book.isActive('O1'));
    set(this.letterTalk, this.book.isActive('O2'));
  }

  // ---------- Dialogues ----------

  talk(npc: string): boolean {
    if (!NPCS.includes(npc as QuestNpc)) return false;
    const id = npc as QuestNpc;
    const res = this.book.talk(id);
    const line = (text: string): void => this.hooks.dialog.show({ speaker: NPC_NAMES[id], portrait: PORTRAITS[id], text });
    if (res.kind === 'none') return id === 'noisette' && this.hooks.bossTalk();
    if (res.kind === 'thanks') {
      line(res.quest.thanks);
      const p = this.npcSpots[id];
      this.hooks.gainFood(res.reward, p.x, p.y + 2.2, p.z);
      this.hooks.toast(TEXT_QUEST_DONE_TOAST.replace('{titre}', res.quest.title));
      this.hooks.burst(p.x, p.y + 1.6, p.z, 0xffe27a, 20);
      audio.sfx('quest');
      if (res.quest.id === 'R2') this.fixBridge(true);
    } else {
      line(res.quest.request);
      if (res.kind === 'request' && res.quest.id === 'R3') this.countWolves();
    }
    this.sync();
    this.hooks.onProgress();
    return true;
  }

  // ---------- Actions dans le monde ----------

  private takeLantern(): void {
    if (!this.book.isActive('R1') || this.lantern.taken) return;
    this.lantern.taken = true;
    const p = this.lantern.model.root.position;
    this.hooks.burst(p.x, p.y + 0.6, p.z, 0xffe27a, 12);
    audio.sfx('pop');
    this.book.setProgress('R1', 1);
    this.hooks.toast(TEXT_LANTERN_FOUND);
    this.sync();
    this.hooks.onProgress();
  }

  private pickBlue(i: number): void {
    const b = this.blue[i];
    if (!this.book.isActive('O1') || b.taken) return;
    b.taken = true;
    const p = b.model.root.position;
    this.hooks.burst(p.x, p.y + 0.5, p.z, 0x4a7ae8, 12);
    audio.sfx('pop');
    this.book.increment('O1');
    const st = this.book.state('O1');
    this.hooks.toast(TEXT_MUSHROOM_BLUE.replace('{n}', String(st.progress)).replace('{goal}', String(this.book.def('O1').goal)));
    this.sync();
    this.hooks.onProgress();
  }

  /** Un champignon rouge : il ne compte pas, sans rien perdre. */
  private pickRed(i: number): void {
    if (!this.book.isActive('O1')) return;
    const p = this.red[i].model.root.position;
    this.hooks.burst(p.x, p.y + 0.5, p.z, 0xd83a3a, 6);
    this.hooks.toast(TEXT_MUSHROOM_RED);
  }

  private dropLetter(): void {
    if (!this.book.isActive('O2')) return;
    const h = this.layout.village.highCabin;
    this.hooks.burst(h.x, h.y + 1, h.z, 0xfff3c0, 16);
    audio.sfx('chime');
    this.book.setProgress('O2', 1);
    this.hooks.toast(TEXT_LETTER_DROPPED);
    this.sync();
    this.hooks.onProgress();
  }

  /** Le pont de Tilleul : les planches comblent le trou. */
  private fixBridge(announce: boolean): void {
    const gap = this.layout.brokenBridge.gap;
    if (gap.every((c) => this.layout.world.get(c.x, c.y, c.z) === Block.Plank)) return;
    for (const c of gap) this.layout.world.set(c.x, c.y, c.z, Block.Plank);
    this.hooks.rebuild(gap);
    if (announce) {
      for (const c of gap) this.hooks.burst(c.x + 0.5, c.y + 0.6, c.z + 0.5, 0xc4965c, 6);
      this.hooks.toast(TEXT_BRIDGE_FIXED, 3);
    }
  }

  /** Une vieille caisse à planche, cassée d'un coup de baguette pendant la quête. */
  hitTest(x: number, y: number, z: number): boolean {
    if (!this.book.isActive('R2')) return false;
    const crate = this.planks.find((p) => !p.taken && Math.hypot(p.model.root.position.x - x, p.model.root.position.z - z) < 0.7 && y > p.model.root.position.y - 0.2 && y < p.model.root.position.y + 1.1);
    if (!crate) return false;
    crate.taken = true;
    const p = crate.model.root.position;
    this.hooks.burst(p.x, p.y + 0.4, p.z, 0xc4965c, 14);
    audio.sfx('crate');
    this.book.increment('R2');
    this.hooks.toast(TEXT_PLANK_FOUND.replace('{n}', String(this.book.state('R2').progress)).replace('{goal}', String(this.book.def('R2').goal)));
    this.sync();
    this.hooks.onProgress();
    return true;
  }

  aimTarget(): Point3 | null {
    if (!this.book.isActive('R2')) return null;
    const c = this.planks.find((p) => !p.taken);
    if (!c) return null;
    const p = c.model.root.position;
    return { x: p.x, y: p.y + 0.4, z: p.z };
  }

  /** Loups du camp vaincus pendant la quête : ils ne reviennent plus. */
  private countWolves(): void {
    if (!this.book.isActive('R3')) return;
    const dead = this.wolves().filter((m) => m.mode === 'dead');
    for (const m of dead) m.cleared = true;
    this.book.setProgress('R3', dead.length);
    if (this.book.state('R3').status === 'ready') this.hooks.onProgress();
  }

  // ---------- Mise à jour ----------

  update(dt: number, playing: boolean): void {
    this.time += dt;
    if (progress(this.state, 'foret').sanctuary.step === 'hatched' && !this.book.unlocked) {
      this.book.unlockAll();
      this.sync();
    }
    if (playing) this.countWolves();
    if (!this.arenaAnnounced && this.book.mandatoryDone) {
      this.arenaAnnounced = true;
      this.hooks.toast(TEXT_FOREST_ARENA_OPEN, 3);
    }
    // La lanterne et les champignons bleus brillent un peu, pour être vus.
    for (const b of this.blue) b.model.root.rotation.y = Math.sin(this.time * 2 + b.model.root.position.x) * 0.2;
    // Marqueurs « ! » au-dessus des villageois.
    for (const npc of NPCS) {
      const mark = this.book.marker(npc) ?? (npc === 'noisette' && this.hooks.bossOffer() ? 'give' : null);
      if (!mark) continue;
      const p = this.npcSpots[npc];
      this.hooks.labels.text(`quest-${npc}`, '!', p.x, p.y + 2.9 + Math.sin(this.time * 3) * 0.05, p.z, mark === 'return' ? 'quest-mark return' : 'quest-mark');
    }
  }

  npcSpot(npc: QuestNpc): Point2 {
    return this.npcSpots[npc] ?? this.layout.landmarks.village;
  }

  /** Où pointe la boussole pour une quête en cours. */
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
    if (id === 'R1') return this.layout.village.pipLantern;
    if (id === 'R2') return nearest(this.planks.filter((p) => !p.taken)) ?? this.npcSpot('tilleul');
    if (id === 'R3') return this.layout.camps.find((c) => c.id === WOLVES_CAMP) ?? this.layout.landmarks.village;
    if (id === 'O1') return nearest(this.blue.filter((b) => !b.taken)) ?? this.npcSpot('noisette');
    if (id === 'O2') return this.layout.village.highCabin;
    return this.layout.landmarks.village;
  }

  snapshot(): {
    log: ForestQuestLife['book']['log'];
    lantern: Point2;
    planks: (Point2 & { taken: boolean })[];
    blue: (Point2 & { taken: boolean })[];
    red: Point2[];
    highCabin: Point3;
  } {
    const at = (i: Item): Point2 => ({ x: i.model.root.position.x, z: i.model.root.position.z });
    return {
      log: this.book.log,
      lantern: at(this.lantern),
      planks: this.planks.map((p) => ({ ...at(p), taken: p.taken })),
      blue: this.blue.map((b) => ({ ...at(b), taken: b.taken })),
      red: this.red.map(at),
      highCabin: this.layout.village.highCabin,
    };
  }
}

