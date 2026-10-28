import * as THREE from 'three';
import type { MonsterAgent } from '../combat/realtime/worldSim';
import {
  TEXT_ARENA_OPEN,
  TEXT_CATCH_CHICKEN,
  TEXT_CHICKEN_HOME,
  TEXT_FLOWER_PICKED,
  TEXT_KEY_FOUND,
  TEXT_PICK_FLOWER,
  TEXT_QUEST_DONE_TOAST,
  type QuestNpc,
} from '../data/quests';
import { animateWalk, CubeModel } from '../entities/cubeModel';
import { MODELS, PORTRAITS, type ModelId } from '../entities/models';
import { QuestBook } from '../quests/villageQuests';
import { NPC_NAMES } from '../story/dialogues';
import type { DialogBubble } from '../ui/dialog';
import type { WorldLabels } from '../ui/worldLabels';
import type { BiomeLayout } from '../world/prairie';
import type { GameState } from './gameState';
import type { Interactable, Interactions } from './interactions';

const CATCH_RADIUS = 1.8;
const FLOWER_RADIUS = 1.6;
const CHICKEN_SPEED = 5.5;
const SLIMES_CAMP = 'slimes';

export interface QuestHooks {
  dialog: DialogBubble;
  toast: (text: string) => void;
  labels: WorldLabels;
  burst: (x: number, y: number, z: number, color: number, count?: number) => void;
  gainFood: (amount: number, x: number, y: number, z: number) => void;
}

type ChickenMode = 'loose' | 'following' | 'home';

interface Chicken {
  model: CubeModel;
  x: number;
  z: number;
  facing: number;
  mode: ChickenMode;
  phase: number;
  /** Petite balade autour de sa place. */
  wander: { x: number; z: number };
  wanderTimer: number;
  talk: Interactable;
}

interface Flower {
  model: CubeModel;
  x: number;
  z: number;
  picked: boolean;
  talk: Interactable;
}

/**
 * Quêtes du village dans le monde (CONTENU.md § E, phase 1) : poules à ramener dans l'enclos,
 * panier à porter, camp des slimes à vider, caisse de la clé, fleurs jaunes. Les dialogues
 * passent par les villageois ; les marqueurs « ! » indiquent qui a une quête.
 */
export class QuestLife {
  readonly book: QuestBook;
  private readonly group = new THREE.Group();
  private readonly chickens: Chicken[] = [];
  private readonly flowers: Flower[] = [];
  private readonly keyCrate: CubeModel;
  private readonly basket: CubeModel;
  private readonly npcSpots: Record<QuestNpc, { x: number; y: number; z: number }>;
  private time = 0;
  private arenaAnnounced: boolean;

  constructor(
    private readonly layout: BiomeLayout,
    parent: THREE.Group,
    private readonly state: GameState,
    private readonly interactions: Interactions,
    private readonly slimes: () => MonsterAgent[],
    private readonly hooks: QuestHooks,
  ) {
    parent.add(this.group);
    this.book = new QuestBook(state.quests);
    this.arenaAnnounced = this.book.mandatoryDone;
    const world = layout.world;
    const ground = (x: number, z: number): number => world.standY(Math.floor(x), Math.floor(z));
    const spot = (id: QuestNpc): { x: number; y: number; z: number } => {
      const n = layout.village.npcs.find((v) => v.id === id)!;
      return { x: n.x, y: ground(n.x, n.z), z: n.z };
    };
    this.npcSpots = { mereBrique: spot('mereBrique'), paquerette: spot('paquerette'), gaston: spot('gaston') };
    const place = (id: ModelId, x: number, z: number, facing = 0): CubeModel => {
      const m = new CubeModel(MODELS[id]);
      m.root.position.set(x, ground(x, z), z);
      m.root.rotation.y = facing;
      this.group.add(m.root);
      return m;
    };

    // Poules : déjà rentrées selon l'avancement enregistré.
    const home = this.book.state('R1').status === 'done' ? 3 : this.book.state('R1').progress;
    layout.questSpots.chickens.forEach((p, i) => {
      const inPen = i < home;
      const pos = inPen ? this.penSpot(i) : p;
      const chicken: Chicken = {
        model: place('chicken', pos.x, pos.z, i),
        x: pos.x,
        z: pos.z,
        facing: i,
        mode: inPen ? 'home' : 'loose',
        phase: i,
        wander: { ...pos },
        wanderTimer: i,
        talk: { id: `chicken-${i}`, x: pos.x, y: ground(pos.x, pos.z), z: pos.z, radius: CATCH_RADIUS, label: TEXT_CATCH_CHICKEN, action: () => this.catchChicken(chicken) },
      };
      this.chickens.push(chicken);
    });

    // Caisse de la clé, fleurs jaunes, panier porté par le héros.
    const kc = layout.questSpots.keyCrate;
    this.keyCrate = place('keyCrate', kc.x, kc.z, 0.3);
    layout.questSpots.flowers.forEach((p, i) => {
      const flower: Flower = {
        model: place('goldFlower', p.x, p.z, i),
        x: p.x,
        z: p.z,
        picked: i < this.book.state('O2').progress || this.book.state('O2').status === 'done',
        talk: { id: `flower-${i}`, x: p.x, y: ground(p.x, p.z), z: p.z, radius: FLOWER_RADIUS, label: TEXT_PICK_FLOWER, action: () => this.pickFlower(flower) },
      };
      this.flowers.push(flower);
    });
    this.basket = new CubeModel(MODELS.basket);
    this.group.add(this.basket.root);

    // Le camp des slimes vidé pour la quête reste vide.
    if (this.book.state('R3').status === 'done' || this.book.state('R3').status === 'ready') {
      for (const m of this.slimes()) {
        m.mode = 'dead';
        m.hp = 0;
        m.cleared = true;
      }
    }
    this.syncInteractions();
  }

  /** Une place dans l'enclos pour la i-ème poule rentrée. */
  private penSpot(i: number): { x: number; z: number } {
    const pen = this.layout.village.pen;
    return { x: pen.x0 + 2 + i * 1.6, z: pen.z0 + 2.5 + (i % 2) * 1.2 };
  }

  private inPen(x: number, z: number): boolean {
    const pen = this.layout.village.pen;
    return x > pen.x0 + 0.6 && x < pen.x1 - 0.2 && z > pen.z0 + 0.6 && z < pen.z1 - 0.6;
  }

  /** Les interactions n'existent que pendant la quête correspondante. */
  private syncInteractions(): void {
    const set = (it: Interactable, on: boolean): void => {
      this.interactions.remove(it.id);
      if (on) this.interactions.add(it);
    };
    for (const c of this.chickens) set(c.talk, this.book.isActive('R1') && c.mode === 'loose');
    for (const f of this.flowers) {
      set(f.talk, this.book.isActive('O2') && !f.picked);
      f.model.root.visible = this.book.isActive('O2') && !f.picked;
    }
    this.keyCrate.root.visible = this.book.isActive('O1');
  }

  // ---------- Dialogues ----------

  /** On parle à un villageois : quête proposée, rappelée ou rendue. Retourne false s'il n'a rien à dire sur les quêtes. */
  talk(npc: string): boolean {
    if (npc !== 'mereBrique' && npc !== 'paquerette' && npc !== 'gaston') return false;
    const res = this.book.talk(npc);
    if (res.kind === 'none') return false;
    const line = (text: string): void => this.hooks.dialog.show({ speaker: NPC_NAMES[npc], portrait: PORTRAITS[npc], text });
    if (res.kind === 'thanks') {
      line(res.quest.thanks);
      const p = this.npcSpots[npc];
      this.hooks.gainFood(res.reward, p.x, p.y + 2.2, p.z);
      this.hooks.toast(TEXT_QUEST_DONE_TOAST.replace('{titre}', res.quest.title));
      this.hooks.burst(p.x, p.y + 1.6, p.z, 0xffe27a, 20);
    } else {
      line(res.quest.request);
      if (res.kind === 'request' && res.quest.id === 'R3') this.countSlimes();
    }
    this.syncInteractions();
    return true;
  }

  // ---------- Actions dans le monde ----------

  private catchChicken(c: Chicken): void {
    if (c.mode !== 'loose') return;
    c.mode = 'following';
    this.interactions.remove(c.talk.id);
    this.hooks.burst(c.x, c.talk.y + 0.5, c.z, 0xffffff, 8);
  }

  private pickFlower(f: Flower): void {
    if (f.picked || !this.book.isActive('O2')) return;
    f.picked = true;
    this.hooks.burst(f.x, f.talk.y + 0.6, f.z, 0xffd23a, 12);
    this.book.increment('O2');
    const st = this.book.state('O2');
    this.hooks.toast(TEXT_FLOWER_PICKED.replace('{n}', String(st.progress)).replace('{goal}', '5'));
    this.syncInteractions();
  }

  /** La caisse de la clé peut être cassée d'un coup de baguette pendant la quête. */
  hitTest(x: number, y: number, z: number): boolean {
    if (!this.book.isActive('O1')) return false;
    const p = this.keyCrate.root.position;
    if (Math.hypot(p.x - x, p.z - z) > 0.7 || y < p.y - 0.2 || y > p.y + 1.1) return false;
    this.hooks.burst(p.x, p.y + 0.4, p.z, 0xc4965c, 14);
    this.hooks.burst(p.x, p.y + 0.8, p.z, 0xffe27a, 10);
    this.book.setProgress('O1', 1);
    this.hooks.toast(TEXT_KEY_FOUND);
    this.syncInteractions();
    return true;
  }

  /** Cible de l'aide à la visée (la caisse de la clé). */
  aimTarget(): { x: number; y: number; z: number } | null {
    if (!this.book.isActive('O1')) return null;
    const p = this.keyCrate.root.position;
    return { x: p.x, y: p.y + 0.4, z: p.z };
  }

  /** Slimes du camp vaincus pendant la quête : ils ne reviennent plus. */
  private countSlimes(): void {
    if (!this.book.isActive('R3')) return;
    const slimes = this.slimes();
    const dead = slimes.filter((m) => m.mode === 'dead');
    for (const m of dead) m.cleared = true;
    this.book.setProgress('R3', dead.length);
  }

  // ---------- Mise à jour ----------

  update(dt: number, hero: { x: number; y: number; z: number; facing: number }, playing: boolean): void {
    this.time += dt;
    if (this.state.sanctuary.step === 'hatched' && !this.book.unlocked) this.book.unlockAll();
    if (playing) {
      this.countSlimes();
      this.updateChickens(dt, hero);
    }
    if (!this.arenaAnnounced && this.book.mandatoryDone) {
      this.arenaAnnounced = true;
      this.hooks.toast(TEXT_ARENA_OPEN);
    }

    // Panier : porté à la main gauche tant que la livraison n'est pas faite.
    const carrying = this.book.state('R2').status === 'ready';
    this.basket.root.visible = carrying;
    if (carrying) {
      const side = hero.facing + Math.PI / 2;
      this.basket.root.position.set(hero.x + Math.sin(side) * 0.45, hero.y + 0.45, hero.z + Math.cos(side) * 0.45);
      this.basket.root.rotation.y = hero.facing;
    }
    this.keyCrate.part('glint')?.rotation.set(0, Math.sin(this.time * 2) * 0.2, 0);
    for (const f of this.flowers) if (!f.picked) f.model.part('head')?.rotation.set(0, this.time, 0);

    // Marqueurs « ! » au-dessus des villageois.
    for (const npc of ['mereBrique', 'paquerette', 'gaston'] as const) {
      const mark = this.book.marker(npc);
      if (!mark) continue;
      const p = this.npcSpots[npc];
      this.hooks.labels.text(`quest-${npc}`, '!', p.x, p.y + 2.9 + Math.sin(this.time * 3) * 0.05, p.z, mark === 'return' ? 'quest-mark return' : 'quest-mark');
    }
  }

  private updateChickens(dt: number, hero: { x: number; z: number }): void {
    const ground = (x: number, z: number): number => this.layout.world.standY(Math.floor(x), Math.floor(z));
    let following = 0;
    for (const c of this.chickens) {
      let moving = false;
      if (c.mode === 'following') {
        // Elles suivent le héros en file, un peu en arrière.
        const k = ++following;
        const dx = hero.x - c.x;
        const dz = hero.z - c.z;
        const d = Math.hypot(dx, dz);
        const keep = 1.2 + k * 0.7;
        if (d > keep) {
          const step = Math.min(d - keep, CHICKEN_SPEED * dt);
          c.x += (dx / d) * step;
          c.z += (dz / d) * step;
          c.facing = Math.atan2(-dx, -dz);
          moving = true;
        }
        if (this.inPen(c.x, c.z) && this.book.isActive('R1')) {
          c.mode = 'home';
          c.wander = { x: c.x, z: c.z };
          this.book.increment('R1');
          const st = this.book.state('R1');
          this.hooks.burst(c.x, ground(c.x, c.z) + 0.6, c.z, 0xffe27a, 12);
          this.hooks.toast(TEXT_CHICKEN_HOME.replace('{n}', String(st.progress)).replace('{goal}', '3'));
        }
      } else {
        // En liberté ou dans l'enclos : petits pas autour de sa place.
        c.wanderTimer -= dt;
        if (c.wanderTimer <= 0) {
          c.wanderTimer = 2 + ((c.phase * 7) % 3);
          const a = this.time * 1.7 + c.phase * 2.1;
          const base = c.mode === 'home' ? c.wander : (this.layout.questSpots.chickens[this.chickens.indexOf(c)] ?? c.wander);
          const tx = base.x + Math.cos(a) * 0.9;
          const tz = base.z + Math.sin(a) * 0.9;
          c.wander = c.mode === 'home' && !this.inPen(tx, tz) ? c.wander : { x: tx, z: tz };
        }
        const dx = c.wander.x - c.x;
        const dz = c.wander.z - c.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.05) {
          const step = Math.min(d, 1.2 * dt);
          c.x += (dx / d) * step;
          c.z += (dz / d) * step;
          c.facing = Math.atan2(-dx, -dz);
          moving = true;
        }
      }
      c.phase += dt * (moving ? 14 : 2);
      animateWalk(c.model, c.phase, moving ? 1 : 0.2);
      c.model.swing('armL', moving ? Math.abs(Math.sin(c.phase)) * 0.4 : 0, 'z');
      c.model.swing('armR', moving ? -Math.abs(Math.sin(c.phase)) * 0.4 : 0, 'z');
      c.model.root.position.set(c.x, ground(c.x, c.z), c.z);
      c.model.root.rotation.y = c.facing;
      c.talk.x = c.x;
      c.talk.z = c.z;
    }
  }

  /** Cible de la boussole pour une tâche en cours. */
  taskTarget(id: string, hero: { x: number; z: number }): { x: number; z: number } {
    if (id === 'R1') {
      if (this.chickens.some((c) => c.mode === 'following')) return { x: this.layout.village.pen.x1 + 0.5, z: this.layout.village.pen.z0 + 3.5 };
      return nearest(this.chickens.filter((c) => c.mode === 'loose'), hero) ?? this.layout.landmarks.village;
    }
    if (id === 'R3') return this.layout.camps.find((c) => c.id === SLIMES_CAMP) ?? this.layout.landmarks.village;
    if (id === 'O1') return this.layout.questSpots.keyCrate;
    if (id === 'O2') return nearest(this.flowers.filter((f) => !f.picked), hero) ?? this.npcSpots.mereBrique;
    return this.layout.landmarks.village;
  }

  npcSpot(npc: QuestNpc): { x: number; z: number } {
    return this.npcSpots[npc];
  }

  snapshot(): {
    log: GameState['quests'];
    chickens: { x: number; z: number; mode: ChickenMode }[];
    flowers: { x: number; z: number; picked: boolean }[];
    keyCrate: { x: number; z: number };
    pen: { x0: number; z0: number; x1: number; z1: number };
  } {
    return {
      log: this.state.quests,
      chickens: this.chickens.map((c) => ({ x: c.x, z: c.z, mode: c.mode })),
      flowers: this.flowers.map((f) => ({ x: f.x, z: f.z, picked: f.picked })),
      keyCrate: this.layout.questSpots.keyCrate,
      pen: this.layout.village.pen,
    };
  }
}

function nearest<T extends { x: number; z: number }>(items: T[], from: { x: number; z: number }): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const it of items) {
    const d = Math.hypot(it.x - from.x, it.z - from.z);
    if (d < bestD) {
      best = it;
      bestD = d;
    }
  }
  return best;
}
