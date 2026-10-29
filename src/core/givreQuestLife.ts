import * as THREE from 'three';
import type { MonsterAgent } from '../combat/realtime/worldSim';
import {
  QUESTS_P4,
  TEXT_BELL_RIGHT,
  TEXT_BELL_WRONG,
  TEXT_CALL_NILOU,
  TEXT_FISH,
  TEXT_FISH_CAUGHT,
  TEXT_GIVRE_ARENA_OPEN,
  TEXT_LOG,
  TEXT_NILOU_FOLLOWS,
  TEXT_NILOU_HOME,
  TEXT_PICK_UP,
  TEXT_QUEST_DONE_TOAST,
  TEXT_RING_BELL,
  type QuestNpc,
} from '../data/quests';
import { animateWalk, CubeModel } from '../entities/cubeModel';
import { MODELS, PORTRAITS, type ModelId } from '../entities/models';
import type { HeroState } from '../entities/heroController';
import { QuestBook } from '../quests/villageQuests';
import { NPC_NAMES } from '../story/dialogues';
import type { DialogBubble } from '../ui/dialog';
import type { WorldLabels } from '../ui/worldLabels';
import { YETIS_CAMP, type GivreLayout } from '../world/givre';
import type { Point2, Point3 } from '../world/layout';
import { audio } from '../audio/audio';
import { progress, type GameState } from './gameState';
import type { Interactable, Interactions } from './interactions';

const NPCS: readonly QuestNpc[] = ['flocon'];
const NILOU_SPEED = 3.6;
const BELL_MODELS: ModelId[] = ['bellSmall', 'bellMid', 'bellBig'];

export interface GivreQuestHooks {
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
  taken: boolean;
}

/**
 * Quêtes des Igloos du Col (CONTENU.md § E, phase 4) : du bois pour le feu (5 bûches), le petit
 * Nilou perdu (il suit le héros), les yétis du col, les poissons du lac gelé et les cloches de
 * glace à faire sonner de la plus petite à la plus grande.
 */
export class GivreQuestLife {
  readonly book: QuestBook;
  private readonly group = new THREE.Group();
  private readonly npcSpots: Record<string, Point3>;
  private readonly logs: Item[];
  private readonly holes: Item[];
  private readonly bells: { model: CubeModel; talk: Interactable; size: number; swing: number }[];
  private readonly fire: CubeModel;
  private readonly nilou: CubeModel;
  private readonly nilouTalk: Interactable;
  private nilouMode: 'lost' | 'following' | 'home';
  private nilouPos: Point2;
  private nilouPhase = 0;
  private rung = 0;
  private jumpingFish: { model: CubeModel; t: number } | null = null;
  private arenaAnnounced: boolean;
  private time = 0;

  constructor(
    private readonly layout: GivreLayout,
    parent: THREE.Group,
    private readonly state: GameState,
    private readonly interactions: Interactions,
    private readonly yetis: () => MonsterAgent[],
    private readonly hooks: GivreQuestHooks,
  ) {
    parent.add(this.group);
    this.book = new QuestBook(progress(state, 'givre').quests, QUESTS_P4);
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
    // Le feu du village : un brasero, allumé quand on a rapporté le bois.
    this.fire = place('brazier', v.woodPile);
    this.logs = layout.logs.map((p, i) => {
      const it: Item = { model: place('logItem', p, i * 1.3), talk: { id: `q4-log-${i}`, ...p, y: ground(p), radius: 1.6, label: TEXT_PICK_UP, action: () => this.pickLog(it) }, taken: false };
      return it;
    });
    this.holes = v.fishingHoles.map((p, i) => {
      const it: Item = { model: place('fishingHole', p), talk: { id: `q4-hole-${i}`, ...p, y: ground(p), radius: 1.7, label: TEXT_FISH, action: () => this.fish(it) }, taken: false };
      return it;
    });
    this.bells = v.bells.map((b, i) => {
      const bell = { model: place(BELL_MODELS[b.size], b), talk: { id: `q4-bell-${i}`, ...b, y: ground(b), radius: 1.4, label: TEXT_RING_BELL, action: () => this.ring(i) }, size: b.size, swing: 0 };
      return bell;
    });
    const r2 = this.book.state('R2').status;
    this.nilouMode = r2 === 'ready' || r2 === 'done' ? 'home' : 'lost';
    this.nilouPos = this.nilouMode === 'home' ? { x: v.home.x + 1.5, z: v.home.z } : { ...layout.nilou };
    this.nilou = place('nilou', this.nilouPos, 0);
    this.nilouTalk = { id: 'q4-nilou', x: 0, y: 0, z: 0, radius: 2.2, label: TEXT_CALL_NILOU, action: () => this.callNilou() };

    // Avancement enregistré.
    const r1 = this.book.state('R1');
    this.logs.forEach((l, i) => (l.taken = r1.status === 'done' || r1.status === 'ready' || i < r1.progress));
    const o1 = this.book.state('O1');
    this.holes.forEach((h, i) => (h.taken = o1.status === 'done' || o1.status === 'ready' || i < o1.progress));
    if (this.book.state('R3').status === 'done' || this.book.state('R3').status === 'ready')
      for (const m of this.yetis()) {
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
    for (const l of this.logs) {
      l.model.root.visible = this.book.isActive('R1') && !l.taken;
      set(l.talk, this.book.isActive('R1') && !l.taken);
    }
    const flame = this.fire.part('flame');
    if (flame) flame.visible = this.book.state('R1').status === 'done';
    for (const h of this.holes) set(h.talk, this.book.isActive('O1') && !h.taken);
    for (const b of this.bells) set(b.talk, this.book.isActive('O2'));
    set(this.nilouTalk, this.book.isActive('R2') && this.nilouMode === 'lost');
    this.nilou.root.visible = this.book.state('R2').status !== 'locked';
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
      if (res.quest.id === 'R1') audio.sfx('fire');
    } else {
      line(res.quest.request);
      if (res.kind === 'request' && res.quest.id === 'R3') this.countYetis();
    }
    this.sync();
    this.hooks.onProgress();
    return true;
  }

  // ---------- Du bois pour le feu ----------

  private pickLog(l: Item): void {
    if (!this.book.isActive('R1') || l.taken) return;
    l.taken = true;
    const p = l.model.root.position;
    this.hooks.burst(p.x, p.y + 0.4, p.z, 0xc4965c, 12);
    audio.sfx('pop');
    this.book.increment('R1');
    this.hooks.toast(TEXT_LOG.replace('{n}', String(this.book.state('R1').progress)).replace('{goal}', '5'));
    this.sync();
    this.hooks.onProgress();
  }

  // ---------- Le petit perdu ----------

  private callNilou(): void {
    if (!this.book.isActive('R2') || this.nilouMode !== 'lost') return;
    this.nilouMode = 'following';
    audio.sfx('pop');
    this.hooks.toast(TEXT_NILOU_FOLLOWS);
    this.sync();
  }

  private updateNilou(dt: number, hero: HeroState): void {
    let moving = false;
    if (this.nilouMode === 'following') {
      const dx = hero.x - this.nilouPos.x;
      const dz = hero.z - this.nilouPos.z;
      const d = Math.hypot(dx, dz);
      if (d > 1.8) {
        const step = Math.min(d - 1.8, NILOU_SPEED * dt);
        this.nilouPos.x += (dx / d) * step;
        this.nilouPos.z += (dz / d) * step;
        this.nilou.root.rotation.y = Math.atan2(-dx, -dz);
        moving = true;
      }
      // Trop loin (le héros a couru) : Nilou le rejoint.
      if (d > 20) this.nilouPos = { x: hero.x + 1.5, z: hero.z + 1.5 };
      const home = this.layout.village.home;
      if (Math.hypot(this.nilouPos.x - home.x, this.nilouPos.z - home.z) < home.r && this.book.isActive('R2')) {
        this.nilouMode = 'home';
        this.book.setProgress('R2', 1);
        this.hooks.burst(this.nilouPos.x, hero.y + 1.5, this.nilouPos.z, 0xffe27a, 16);
        audio.sfx('tile');
        this.hooks.toast(TEXT_NILOU_HOME);
        this.hooks.onProgress();
      }
    }
    const p = this.nilouPos;
    this.nilou.root.position.set(p.x, this.layout.world.standY(Math.floor(p.x), Math.floor(p.z)), p.z);
    this.nilouPhase += dt * (moving ? 6 : 0);
    animateWalk(this.nilou, this.nilouPhase, moving ? 1 : 0);
    this.nilouTalk.x = p.x;
    this.nilouTalk.y = this.nilou.root.position.y;
    this.nilouTalk.z = p.z;
  }

  // ---------- Le poisson du lac ----------

  private fish(h: Item): void {
    if (!this.book.isActive('O1') || h.taken) return;
    h.taken = true;
    const p = h.model.root.position;
    const fish = new CubeModel(MODELS.fish);
    fish.root.position.set(p.x, p.y, p.z);
    this.group.add(fish.root);
    this.jumpingFish = { model: fish, t: 0 };
    this.hooks.burst(p.x, p.y + 0.3, p.z, 0x9fd8ff, 14);
    audio.sfx('pop');
    this.book.increment('O1');
    this.hooks.toast(TEXT_FISH_CAUGHT.replace('{n}', String(this.book.state('O1').progress)).replace('{goal}', '3'));
    this.sync();
    this.hooks.onProgress();
  }

  // ---------- Les cloches de glace ----------

  private ring(i: number): void {
    if (!this.book.isActive('O2')) return;
    const b = this.bells[i];
    b.swing = 1;
    audio.sfx('bell');
    if (b.size !== this.rung) {
      this.rung = 0;
      this.book.setProgress('O2', 0);
      audio.sfx('wrong');
      this.hooks.toast(TEXT_BELL_WRONG);
      return;
    }
    this.rung++;
    this.book.setProgress('O2', this.rung);
    const p = b.model.root.position;
    this.hooks.burst(p.x, p.y + 1.5, p.z, 0xbfe8ff, 10);
    this.hooks.toast(TEXT_BELL_RIGHT.replace('{n}', String(this.rung)));
    if (this.rung >= 3) {
      this.rung = 0;
      this.sync();
      this.hooks.onProgress();
    }
  }

  private countYetis(): void {
    if (!this.book.isActive('R3')) return;
    const dead = this.yetis().filter((m) => m.mode === 'dead');
    for (const m of dead) m.cleared = true;
    this.book.setProgress('R3', dead.length);
  }

  update(dt: number, hero: HeroState, playing: boolean): void {
    this.time += dt;
    if (progress(this.state, 'givre').sanctuary.step === 'hatched' && !this.book.unlocked) {
      this.book.unlockAll();
      this.sync();
    }
    if (playing) {
      this.countYetis();
      this.updateNilou(dt, hero);
    }
    if (!this.arenaAnnounced && this.book.mandatoryDone) {
      this.arenaAnnounced = true;
      this.hooks.toast(TEXT_GIVRE_ARENA_OPEN);
    }
    for (const l of this.logs) if (!l.taken) l.model.root.rotation.y += dt * 0.5;
    for (const b of this.bells) {
      b.swing = Math.max(0, b.swing - dt * 0.8);
      const bell = b.model.part('bell');
      if (bell) bell.rotation.z = Math.sin(this.time * 12) * 0.35 * b.swing;
    }
    if (this.jumpingFish) {
      const f = this.jumpingFish;
      f.t += dt;
      f.model.root.position.y += dt * (2.5 - f.t * 5);
      f.model.root.rotation.x += dt * 6;
      if (f.t > 1) {
        this.group.remove(f.model.root);
        this.jumpingFish = null;
      }
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
    const v = this.layout.village;
    if (id === 'R1') return nearest(this.logs.filter((l) => !l.taken)) ?? this.npcSpot('flocon');
    if (id === 'R2') return this.nilouMode === 'following' ? v.home : this.nilouPos;
    if (id === 'R3') return this.layout.camps.find((c) => c.id === YETIS_CAMP) ?? this.layout.landmarks.village;
    if (id === 'O1') return nearest(this.holes.filter((h) => !h.taken)) ?? this.npcSpot('flocon');
    if (id === 'O2') return v.bells[this.bells.findIndex((b) => b.size === this.rung)] ?? v.bells[0];
    return this.layout.landmarks.village;
  }

  snapshot(): {
    log: GivreQuestLife['book']['log'];
    logs: (Point2 & { taken: boolean })[];
    holes: (Point2 & { taken: boolean })[];
    bells: (Point2 & { size: number })[];
    nilou: Point2 & { mode: string };
    home: Point2;
  } {
    const at = (i: Item): Point2 & { taken: boolean } => ({ x: i.model.root.position.x, z: i.model.root.position.z, taken: i.taken });
    return {
      log: this.book.log,
      logs: this.logs.map(at),
      holes: this.holes.map(at),
      bells: this.layout.village.bells,
      nilou: { ...this.nilouPos, mode: this.nilouMode },
      home: { x: this.layout.village.home.x, z: this.layout.village.home.z },
    };
  }
}
