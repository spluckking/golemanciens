import * as THREE from 'three';
import type { MonsterAgent } from '../combat/realtime/worldSim';
import {
  QUESTS_P3,
  TEXT_BUCKET,
  TEXT_CAMEL_FOLLOWS,
  TEXT_CAMEL_HOME,
  TEXT_CAMEL_NO_FOOD,
  TEXT_CART_CRATE,
  TEXT_DESERT_ARENA_OPEN,
  TEXT_EMPTY,
  TEXT_FEED_CAMEL,
  TEXT_FILL,
  TEXT_MAP_PIECE,
  TEXT_PICK_UP,
  TEXT_QUEST_DONE_TOAST,
  type QuestNpc,
} from '../data/quests';
import { animateWalk, CubeModel } from '../entities/cubeModel';
import { MODELS, PORTRAITS, type ModelId } from '../entities/models';
import type { HeroState } from '../entities/heroController';
import { QuestBook } from '../quests/villageQuests';
import { NPC_NAMES } from '../story/dialogues';
import type { DialogBubble } from '../ui/dialog';
import type { WorldLabels } from '../ui/worldLabels';
import { SCORPIONS_CAMP, type DesertLayout } from '../world/desert';
import type { Point2, Point3 } from '../world/layout';
import { audio } from '../audio/audio';
import { progress, type GameState } from './gameState';
import type { Interactable, Interactions } from './interactions';

const NPCS: readonly QuestNpc[] = ['oasia', 'zephir'];
const CAMEL_SPEED = 3.4;

export interface DesertQuestHooks {
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
  talk: Interactable | null;
  taken: boolean;
}

/**
 * Quêtes de l'oasis de Palmebloc (CONTENU.md § E, phase 3) : l'eau de l'oasis (seaux à porter),
 * la charrette ensablée (caisses à casser), les scorpions du puits, la carte déchirée (3 morceaux)
 * et le chameau Caramel (il suit le héros après une 🍎).
 */
export class DesertQuestLife {
  readonly book: QuestBook;
  private readonly group = new THREE.Group();
  private readonly npcSpots: Record<string, Point3>;
  private readonly bucket: CubeModel;
  private readonly troughWater: THREE.Object3D | undefined;
  private readonly fillTalk: Interactable;
  private readonly emptyTalk: Interactable;
  private readonly crates: Item[];
  private readonly pieces: Item[];
  private readonly camel: CubeModel;
  private readonly camelTalk: Interactable;
  private camelMode: 'wild' | 'following' | 'home';
  private camelPos: Point2;
  private camelPhase = 0;
  private full = false;
  private arenaAnnounced: boolean;
  private time = 0;

  constructor(
    private readonly layout: DesertLayout,
    parent: THREE.Group,
    private readonly state: GameState,
    private readonly interactions: Interactions,
    private readonly scorpions: () => MonsterAgent[],
    private readonly hooks: DesertQuestHooks,
  ) {
    parent.add(this.group);
    this.book = new QuestBook(progress(state, 'desert').quests, QUESTS_P3);
    this.arenaAnnounced = this.book.mandatoryDone;
    const ground = (p: Point2): number => layout.world.standY(Math.floor(p.x), Math.floor(p.z));
    this.npcSpots = Object.fromEntries(layout.npcs.map((n) => [n.id, { x: n.x, y: ground(n), z: n.z }]));
    const place = (id: ModelId, p: Point2, facing = 0, scale = 1): CubeModel => {
      const m = new CubeModel(MODELS[id], scale);
      m.root.position.set(p.x, ground(p), p.z);
      m.root.rotation.y = facing;
      this.group.add(m.root);
      return m;
    };
    const v = layout.village;
    place('cart', v.cart, Math.PI / 2);
    const trough = place('trough', v.trough);
    this.troughWater = trough.part('water');
    this.bucket = place('bucket', v.spring);
    this.fillTalk = { id: 'q3-fill', ...v.spring, y: ground(v.spring), radius: 2, label: TEXT_FILL, action: () => this.fill() };
    this.emptyTalk = { id: 'q3-empty', ...v.trough, y: ground(v.trough), radius: 2, label: TEXT_EMPTY, action: () => this.empty() };
    this.crates = v.cartCrates.map((p) => ({ model: place('keyCrate', p), talk: null, taken: false }));
    this.pieces = layout.mapPieces.map((p, i) => {
      const it: Item = { model: place('mapPiece', p, i), talk: null, taken: false };
      it.talk = { id: `q3-map-${i}`, ...p, y: ground(p), radius: 1.6, label: TEXT_PICK_UP, action: () => this.pickPiece(it) };
      return it;
    });
    const o2 = this.book.state('O2').status;
    this.camelMode = o2 === 'ready' || o2 === 'done' ? 'home' : 'wild';
    this.camelPos = this.camelMode === 'home' ? { x: v.pen.x, z: v.pen.z } : { ...layout.camel };
    this.camel = place('camel', this.camelPos, 0);
    this.camelTalk = { id: 'q3-camel', x: 0, y: 0, z: 0, radius: 2.2, label: TEXT_FEED_CAMEL, action: () => this.feedCamel() };

    // Avancement enregistré.
    const r2 = this.book.state('R2');
    this.crates.forEach((c, i) => (c.taken = r2.status === 'done' || i < r2.progress));
    const o1 = this.book.state('O1');
    this.pieces.forEach((p, i) => (p.taken = o1.status === 'done' || i < o1.progress));
    if (this.book.state('R3').status === 'done' || this.book.state('R3').status === 'ready')
      for (const m of this.scorpions()) {
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
    const r1 = this.book.isActive('R1');
    set(this.fillTalk, r1 && !this.full);
    set(this.emptyTalk, r1 && this.full);
    this.bucket.root.visible = r1;
    const water = this.bucket.part('water');
    if (water) water.visible = this.full;
    if (this.troughWater) this.troughWater.visible = this.book.state('R1').status === 'done' || this.book.state('R1').progress > 0;
    for (const c of this.crates) c.model.root.visible = this.book.isActive('R2') && !c.taken;
    for (const p of this.pieces) {
      p.model.root.visible = this.book.isActive('O1') && !p.taken;
      if (p.talk) set(p.talk, this.book.isActive('O1') && !p.taken);
    }
    set(this.camelTalk, this.book.isActive('O2') && this.camelMode === 'wild');
  }

  talk(npc: string): boolean {
    if (!NPCS.includes(npc as QuestNpc)) return false;
    const id = npc as QuestNpc;
    const res = this.book.talk(id);
    const line = (text: string): void => this.hooks.dialog.show({ speaker: NPC_NAMES[id], portrait: PORTRAITS[id], text });
    if (res.kind === 'none') return id === 'oasia' && this.hooks.bossTalk();
    if (res.kind === 'thanks') {
      line(res.quest.thanks);
      const p = this.npcSpots[id];
      this.hooks.gainFood(res.reward, p.x, p.y + 2.2, p.z);
      this.hooks.toast(TEXT_QUEST_DONE_TOAST.replace('{titre}', res.quest.title));
      this.hooks.burst(p.x, p.y + 1.6, p.z, 0xffe27a, 20);
      audio.sfx('quest');
    } else {
      line(res.quest.request);
      if (res.kind === 'request' && res.quest.id === 'R3') this.countScorpions();
    }
    this.sync();
    this.hooks.onProgress();
    return true;
  }

  // ---------- L'eau de l'oasis ----------

  private fill(): void {
    if (!this.book.isActive('R1') || this.full) return;
    this.full = true;
    audio.sfx('pop');
    this.sync();
  }

  private empty(): void {
    if (!this.book.isActive('R1') || !this.full) return;
    this.full = false;
    const t = this.layout.village.trough;
    this.hooks.burst(t.x, this.layout.world.standY(Math.floor(t.x), Math.floor(t.z)) + 0.6, t.z, 0x4a9ae8, 14);
    audio.sfx('tile');
    this.book.increment('R1');
    this.hooks.toast(TEXT_BUCKET.replace('{n}', String(this.book.state('R1').progress)).replace('{goal}', '3'));
    this.sync();
    this.hooks.onProgress();
  }

  // ---------- La carte déchirée ----------

  private pickPiece(p: Item): void {
    if (!this.book.isActive('O1') || p.taken) return;
    p.taken = true;
    const pos = p.model.root.position;
    this.hooks.burst(pos.x, pos.y + 0.4, pos.z, 0xfff3c0, 12);
    audio.sfx('pop');
    this.book.increment('O1');
    this.hooks.toast(TEXT_MAP_PIECE.replace('{n}', String(this.book.state('O1').progress)).replace('{goal}', '3'));
    this.sync();
    this.hooks.onProgress();
  }

  // ---------- Le chameau têtu ----------

  private feedCamel(): void {
    if (!this.book.isActive('O2') || this.camelMode !== 'wild') return;
    if (this.state.food < 1) {
      this.hooks.toast(TEXT_CAMEL_NO_FOOD);
      return;
    }
    this.state.food -= 1;
    this.camelMode = 'following';
    audio.sfx('food');
    this.hooks.toast(TEXT_CAMEL_FOLLOWS);
    this.sync();
  }

  private updateCamel(dt: number, hero: HeroState): void {
    let moving = false;
    if (this.camelMode === 'following') {
      const dx = hero.x - this.camelPos.x;
      const dz = hero.z - this.camelPos.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.4) {
        const step = Math.min(d - 2.4, CAMEL_SPEED * dt);
        this.camelPos.x += (dx / d) * step;
        this.camelPos.z += (dz / d) * step;
        this.camel.root.rotation.y = Math.atan2(-dx, -dz);
        moving = true;
      }
      // Trop loin (le héros a voyagé ou couru) : Caramel le rejoint.
      if (d > 20) this.camelPos = { x: hero.x + 2, z: hero.z + 2 };
      const pen = this.layout.village.pen;
      if (Math.hypot(this.camelPos.x - pen.x, this.camelPos.z - pen.z) < pen.r && this.book.isActive('O2')) {
        this.camelMode = 'home';
        this.book.setProgress('O2', 1);
        this.hooks.burst(this.camelPos.x, hero.y + 1.5, this.camelPos.z, 0xffe27a, 16);
        audio.sfx('tile');
        this.hooks.toast(TEXT_CAMEL_HOME);
        this.hooks.onProgress();
      }
    }
    const p = this.camelPos;
    this.camel.root.position.set(p.x, this.layout.world.standY(Math.floor(p.x), Math.floor(p.z)), p.z);
    this.camelPhase += dt * (moving ? 5 : 0);
    animateWalk(this.camel, this.camelPhase, moving ? 1 : 0);
    this.camelTalk.x = p.x;
    this.camelTalk.y = this.camel.root.position.y;
    this.camelTalk.z = p.z;
  }

  // ---------- La charrette ensablée ----------

  hitTest(x: number, y: number, z: number): boolean {
    if (!this.book.isActive('R2')) return false;
    const c = this.crates.find((k) => !k.taken && Math.hypot(k.model.root.position.x - x, k.model.root.position.z - z) < 0.7 && y > k.model.root.position.y - 0.2 && y < k.model.root.position.y + 1.1);
    if (!c) return false;
    c.taken = true;
    const p = c.model.root.position;
    this.hooks.burst(p.x, p.y + 0.4, p.z, 0xc4965c, 14);
    audio.sfx('crate');
    this.book.increment('R2');
    this.hooks.toast(TEXT_CART_CRATE.replace('{n}', String(this.book.state('R2').progress)).replace('{goal}', '3'));
    this.sync();
    this.hooks.onProgress();
    return true;
  }

  aimTarget(): Point3 | null {
    if (!this.book.isActive('R2')) return null;
    const c = this.crates.find((k) => !k.taken);
    if (!c) return null;
    const p = c.model.root.position;
    return { x: p.x, y: p.y + 0.4, z: p.z };
  }

  private countScorpions(): void {
    if (!this.book.isActive('R3')) return;
    const dead = this.scorpions().filter((m) => m.mode === 'dead');
    for (const m of dead) m.cleared = true;
    this.book.setProgress('R3', dead.length);
  }

  update(dt: number, hero: HeroState, playing: boolean): void {
    this.time += dt;
    if (progress(this.state, 'desert').sanctuary.step === 'hatched' && !this.book.unlocked) {
      this.book.unlockAll();
      this.sync();
    }
    if (playing) {
      this.countScorpions();
      this.updateCamel(dt, hero);
    }
    if (!this.arenaAnnounced && this.book.mandatoryDone) {
      this.arenaAnnounced = true;
      this.hooks.toast(TEXT_DESERT_ARENA_OPEN);
    }
    // Le seau suit le héros pendant la quête de l'eau.
    if (this.book.isActive('R1')) this.bucket.root.position.set(hero.x + 0.6, hero.y + (this.full ? 0.9 : 0), hero.z);
    for (const p of this.pieces) p.model.root.rotation.y += dt;
    for (const npc of NPCS) {
      const mark = this.book.marker(npc) ?? (npc === 'oasia' && this.hooks.bossOffer() ? 'give' : null);
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
    const v = this.layout.village;
    if (id === 'R1') return this.full ? v.trough : v.spring;
    if (id === 'R2') return nearest(this.crates.filter((c) => !c.taken)) ?? this.npcSpot('zephir');
    if (id === 'R3') return this.layout.camps.find((c) => c.id === SCORPIONS_CAMP) ?? this.layout.landmarks.village;
    if (id === 'O1') return nearest(this.pieces.filter((p) => !p.taken)) ?? this.npcSpot('zephir');
    if (id === 'O2') return this.camelMode === 'following' ? v.pen : this.camelPos;
    return this.layout.landmarks.village;
  }

  snapshot(): { log: DesertQuestLife['book']['log']; full: boolean; crates: (Point2 & { taken: boolean })[]; pieces: (Point2 & { taken: boolean })[]; camel: Point2 & { mode: string } } {
    const at = (i: Item): Point2 & { taken: boolean } => ({ x: i.model.root.position.x, z: i.model.root.position.z, taken: i.taken });
    return { log: this.book.log, full: this.full, crates: this.crates.map(at), pieces: this.pieces.map(at), camel: { ...this.camelPos, mode: this.camelMode } };
  }
}
