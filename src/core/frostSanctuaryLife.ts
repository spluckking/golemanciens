import * as THREE from 'three';
import { CONTENT } from '../data/content';
import {
  MILL_HINT_AFTER,
  S4_EGG_CHOICES,
  S4_MILL_HINT,
  S4_MILL_RULE,
  TEXT_AXLES,
  TEXT_BACK,
  TEXT_BIG_GEAR,
  TEXT_CLOSE,
  TEXT_DOOR_OPEN,
  TEXT_ICE_MELTS,
  TEXT_MEMORY_DONE,
  TEXT_MEMORY_EASIER,
  TEXT_MEMORY_GO,
  TEXT_MEMORY_REPLAY,
  TEXT_MEMORY_WATCH,
  TEXT_MEMORY_WRONG,
  TEXT_MILL_CHOOSE_AXLE,
  TEXT_MILL_CHOOSE_GEAR,
  TEXT_MILL_GAP,
  TEXT_MILL_JAM,
  TEXT_MILL_PANEL,
  TEXT_MILL_RIGHT,
  TEXT_MILL_WRONG,
  TEXT_READ_STONE,
  TEXT_REMOVE_GEAR,
  TEXT_SLIDE_DONE,
  TEXT_SLIDE_HINT,
  TEXT_SMALL_GEAR,
  TEXT_STONE_WRONG,
  TEXT_TOUCH_EGG,
  TEXT_TURN_CRANK,
} from '../data/sanctuaries';
import { CubeModel } from '../entities/cubeModel';
import { MODELS, PORTRAITS, type ModelId } from '../entities/models';
import { presentRiddle } from '../questions/present';
import { GEAR_PIECES, GEAR_SLOTS, IceMemory, MEMORY_EASY_AFTER, SLIDE_ROOM, SlidePuzzle, gearTrain, slide, type GearResult, type GearSize, type GearSlot, type Spin } from '../quests/frostPuzzles';
import { RiddleStone, S4_STEPS, advance } from '../quests/sanctuary';
import type { Dir } from '../quests/templePuzzles';
import { NPC_NAMES } from '../story/dialogues';
import type { WorldLabels } from '../ui/worldLabels';
import type { FrostSanctuaryPlan } from '../world/givre';
import type { Cell } from '../world/structures';
import type { VoxelWorld } from '../world/voxelWorld';
import { Block } from '../world/blocks';
import { audio } from '../audio/audio';
import { hatchEgg } from './eggHatch';
import { progress, type GameState } from './gameState';
import type { Interactable, Interactions } from './interactions';
import type { Rng } from './rng';
import type { SanctuaryHooks } from './sanctuaryLife';
import { recordRiddle } from './stats';

const STONE_LEVEL = 4;
/** Vitesse d'une glissade (cases par seconde) et décalage du centre de la case qui la déclenche. */
const SLIDE_SPEED = 8;
const SLIDE_TRIGGER = 0.3;
const MEMORY_COLORS = ['Blue', 'Green', 'Pink', 'Yellow'] as const;
const MEMORY_STEP_S = 0.75;
const CRANK_SPIN_S = 2.6;
/** Hauteur des axes (le milieu est un peu plus haut) et de la manivelle, au-dessus du sol. */
const AXLE_Y: Record<GearSlot, number> = { L: 1.2, M: 2.1, R: 1.2 };
const MECH_Y = 1.2;

export interface FrostSanctuaryHooks extends SanctuaryHooks {
  /** Un choix parmi des boutons (index choisi). */
  choose: (text: string, labels: string[], testId: string) => Promise<number>;
  /** Déplace le héros sans tourner la caméra (glissade). */
  moveHero: (x: number, z: number) => void;
}

/**
 * Sanctuaire gelé en jeu (CONTENU.md, S4) : la pierre de niveau 4, la glissade dans la salle de
 * glace, la mémoire de glace, le moulin gelé (roues dentées, sens de rotation visibles), la seconde
 * pierre, puis l'œuf et le choix entre Glace et Cristal.
 */
export class FrostSanctuaryLife {
  private readonly group = new THREE.Group();
  private readonly riddle: RiddleStone;
  private readonly stones: CubeModel[] = [];
  private readonly egg: CubeModel;
  private readonly slide = new SlidePuzzle();
  private readonly memory = new IceMemory();
  private readonly tilesOff: CubeModel[] = [];
  private readonly tilesOn: CubeModel[] = [];
  private readonly gears: { size: GearSize; model: CubeModel; slot: GearSlot | null; rest: THREE.Vector3 }[] = [];
  private readonly crank: CubeModel;
  private readonly mill: CubeModel;
  private readonly talks: Record<'stone' | 'stone4' | 'egg' | 'replay' | 'mill', Interactable>;
  private sliding: { from: THREE.Vector2; to: THREE.Vector2; t: number; duration: number; exit: boolean } | null = null;
  private playback: { index: number; t: number } | null = null;
  private memoryShown = false;
  private lastTile = -1;
  private spinning: { t: number; result: GearResult } | null = null;
  private millTries = 0;
  private busy = false;
  private wobble = 0;
  private synced: string | undefined;
  private time = 0;

  constructor(
    private readonly plan: FrostSanctuaryPlan,
    private readonly world: VoxelWorld,
    parent: THREE.Group,
    private readonly state: GameState,
    private readonly interactions: Interactions,
    private readonly rng: Rng,
    private readonly labels: WorldLabels,
    private readonly hooks: FrostSanctuaryHooks,
  ) {
    parent.add(this.group);
    this.riddle = new RiddleStone(CONTENT.riddles, state.riddles, STONE_LEVEL, rng);
    const y = plan.floorY;
    for (const p of [plan.stone, plan.stone4]) this.stones.push(this.place('riddleStone', p.x, p.z, -Math.PI / 2));

    // Mémoire de glace : 4 dalles, éteintes et allumées.
    plan.memoryTiles.forEach((t, i) => {
      this.tilesOff.push(this.place(`memory${MEMORY_COLORS[i]}` as ModelId, t.x, t.z, 0));
      const on = this.place(`memory${MEMORY_COLORS[i]}Lit` as ModelId, t.x, t.z, 0);
      on.root.visible = false;
      this.tilesOn.push(on);
    });
    this.place('stele', plan.memoryStele.x, plan.memoryStele.z, 0);

    // Moulin gelé : la manivelle, trois axes, le moulin ; les roues attendent sur une table.
    this.crank = this.place('crank', plan.crank.x, plan.crank.z, 0, MECH_Y);
    plan.axles.forEach((a, i) => this.place('gearAxle', a.x, a.z, 0, AXLE_Y[GEAR_SLOTS[i]]));
    this.mill = this.place('frozenMill', plan.mill.x, plan.mill.z, 0, MECH_Y);
    GEAR_PIECES.forEach((size, i) => {
      const rest = new THREE.Vector3(plan.millPanel.x - 1.2 + i * 1.2, y + 0.6, plan.millPanel.z + 1.4);
      const model = this.place(size === 'big' ? 'gearBig' : 'gearSmall', rest.x, rest.z, 0, 0.6);
      model.root.rotation.x = -Math.PI / 2;
      this.gears.push({ size, model, slot: null, rest });
    });

    this.place('nest', plan.nest.x, plan.nest.z, 0);
    this.egg = this.place('eggGivre', plan.nest.x, plan.nest.z, Math.PI / 2);
    this.egg.root.position.y = y + 0.15;
    this.egg.root.scale.setScalar(1.3);
    this.talks = {
      stone: { id: 's4-stone', ...plan.stone, y, radius: 2.4, label: TEXT_READ_STONE, action: () => void this.readStone('stone') },
      stone4: { id: 's4-stone4', ...plan.stone4, y, radius: 2.4, label: TEXT_READ_STONE, action: () => void this.readStone('stone4') },
      egg: { id: 's4-egg', ...plan.nest, y, radius: 2.4, label: TEXT_TOUCH_EGG, action: () => void this.hatch() },
      replay: { id: 's4-replay', ...plan.memoryStele, y, radius: 1.6, label: TEXT_MEMORY_REPLAY, action: () => this.play() },
      mill: { id: 's4-mill', ...plan.millPanel, y, radius: 2, label: TEXT_MILL_PANEL, action: () => void this.millPanel() },
    };
    this.syncWorld();
  }

  private place(id: ModelId, x: number, z: number, facing: number, dy = 0): CubeModel {
    const m = new CubeModel(MODELS[id]);
    m.root.position.set(x, this.plan.floorY + dy, z);
    m.root.rotation.y = facing;
    this.group.add(m.root);
    return m;
  }

  get step(): string {
    return progress(this.state).sanctuary.step;
  }

  private index(step = this.step): number {
    return S4_STEPS.indexOf(step as (typeof S4_STEPS)[number]);
  }

  private next(): void {
    advance(progress(this.state).sanctuary, S4_STEPS);
    this.syncWorld();
  }

  private syncWorld(): void {
    const s = this.step;
    if (this.synced !== undefined && this.synced !== s) this.hooks.onProgress();
    this.synced = s;
    const i = this.index();
    const open = (cells: Cell[]): void => {
      if (cells.every((c) => this.world.get(c.x, c.y, c.z) === Block.Air)) return;
      for (const c of cells) this.world.set(c.x, c.y, c.z, Block.Air);
      this.hooks.rebuild(cells);
    };
    if (i > this.index('stone')) open(this.plan.doorA);
    if (i > this.index('memory')) open(this.plan.doorB);
    if (i > this.index('mill')) open(this.plan.doorC);
    // Partie rechargée après le moulin : les petites roues restent sur leurs axes.
    if (i > this.index('mill') && !this.gears.some((g) => g.slot)) {
      const smalls = this.gears.filter((g) => g.size === 'small');
      this.mount(smalls[0], 'L');
      this.mount(smalls[1], 'R');
    }
    const set = (it: Interactable, on: boolean): void => {
      this.interactions.remove(it.id);
      if (on) this.interactions.add(it);
    };
    set(this.talks.stone, s === 'stone');
    set(this.talks.replay, s === 'memory');
    set(this.talks.mill, s === 'mill');
    set(this.talks.stone4, s === 'stone4');
    set(this.talks.egg, s === 'open');
    this.egg.root.visible = s !== 'hatched';
  }

  // ---------- Pierres-énigmes (niveau 4) ----------

  private async readStone(which: 'stone' | 'stone4'): Promise<void> {
    if (this.busy || this.step !== which) return;
    this.busy = true;
    this.hooks.lock(true);
    const p = which === 'stone' ? this.plan.stone : this.plan.stone4;
    for (;;) {
      const view = presentRiddle(this.riddle.current, this.rng);
      const chosen = await this.hooks.ask(view);
      const level = this.riddle.current.level;
      const res = this.riddle.answer(view.sourceIndex[chosen]);
      recordRiddle(this.state.stats, level, res.correct);
      if (res.correct) {
        this.hooks.burst(p.x, this.plan.floorY + 1.2, p.z, 0x9ff0ff, 24);
        audio.sfx('door');
        this.hooks.toast(which === 'stone' ? TEXT_ICE_MELTS : TEXT_DOOR_OPEN);
        this.next();
        break;
      }
      await this.hooks.reveal(view, chosen);
      this.hooks.toast(TEXT_STONE_WRONG);
    }
    this.hooks.lock(false);
    this.busy = false;
    if (which === 'stone') this.hooks.dialog.show({ speaker: NPC_NAMES.lumibloc, portrait: PORTRAITS.lumibloc, text: TEXT_SLIDE_HINT });
  }

  // ---------- La glissade ----------

  /** Case de la salle de glace où se trouve le héros, ou null. */
  private slideCell(x: number, z: number): [number, number] | null {
    const gx = Math.floor(x - this.plan.slideOrigin.x + 0.5);
    const gz = Math.floor(z - this.plan.slideOrigin.z + 0.5);
    if (gx < 0 || gz < 0 || gx >= SLIDE_ROOM.size || gz >= SLIDE_ROOM.size) return null;
    return [gx, gz];
  }

  private cellCenter(c: [number, number]): THREE.Vector2 {
    return new THREE.Vector2(this.plan.slideOrigin.x + c[0], this.plan.slideOrigin.z + c[1]);
  }

  private updateSlide(dt: number, hero: { x: number; z: number }, playing: boolean): void {
    if (this.sliding) {
      const s = this.sliding;
      s.t = Math.min(s.duration, s.t + dt);
      const p = s.from.clone().lerp(s.to, s.duration > 0 ? s.t / s.duration : 1);
      this.hooks.moveHero(p.x, p.y);
      if (s.t >= s.duration) {
        this.sliding = null;
        this.hooks.lock(false);
        if (s.exit) {
          audio.sfx('chime');
          this.hooks.toast(TEXT_SLIDE_DONE);
          this.next();
        }
      }
      return;
    }
    if (!playing || this.step !== 'slide') return;
    const cell = this.slideCell(hero.x, hero.z);
    if (!cell) return;
    const c = this.cellCenter(cell);
    const dx = hero.x - c.x;
    const dz = hero.z - c.y;
    if (Math.max(Math.abs(dx), Math.abs(dz)) < SLIDE_TRIGGER) return;
    const dir: Dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'E' : 'W') : dz > 0 ? 'S' : 'N';
    this.slide.pos = cell;
    const to = this.slide.move(dir);
    const exit = to === 'exit';
    // On sort par l'ouverture nord jusque dans la salle suivante.
    const target = exit ? this.cellCenter([SLIDE_ROOM.exit, -2]) : this.cellCenter(to);
    const from = new THREE.Vector2(hero.x, hero.z);
    const duration = from.distanceTo(target) / SLIDE_SPEED;
    if (duration < 0.05) {
      this.hooks.moveHero(target.x, target.y);
      return;
    }
    audio.sfx('slide');
    this.hooks.lock(true);
    this.sliding = { from, to: target, t: 0, duration, exit };
  }

  // ---------- La mémoire de glace ----------

  private play(): void {
    if (this.step !== 'memory' || this.playback) return;
    this.memory.input = [];
    this.playback = { index: -1, t: 0.6 };
    this.hooks.toast(TEXT_MEMORY_WATCH);
  }

  private light(tile: number, on: boolean): void {
    this.tilesOn[tile].root.visible = on;
    this.tilesOff[tile].root.visible = !on;
  }

  private updateMemory(dt: number, hero: { x: number; z: number }, playing: boolean): void {
    if (this.step !== 'memory') return;
    // La séquence se joue d'elle-même quand on entre dans la salle.
    if (!this.memoryShown && hero.z < this.plan.slideOrigin.z - 1.5) {
      this.memoryShown = true;
      this.play();
    }
    if (this.playback) {
      const pb = this.playback;
      pb.t -= dt;
      if (pb.t > 0) return;
      if (pb.index >= 0) this.light(this.memory.sequence[pb.index], false);
      pb.index++;
      if (pb.index >= this.memory.sequence.length) {
        this.playback = null;
        this.hooks.toast(TEXT_MEMORY_GO);
        return;
      }
      const tile = this.memory.sequence[pb.index];
      this.light(tile, true);
      audio.sfx('tile');
      pb.t = MEMORY_STEP_S;
      return;
    }
    if (!playing) return;
    const i = this.plan.memoryTiles.findIndex((t) => Math.abs(t.x - hero.x) < 0.6 && Math.abs(t.z - hero.z) < 0.6);
    if (i === this.lastTile) return;
    this.lastTile = i;
    if (i < 0) return;
    const res = this.memory.press(i);
    this.light(i, true);
    setTimeout(() => this.step === 'memory' && this.light(i, false), 400);
    if (res === 'wrong') {
      audio.sfx('wrong');
      this.hooks.toast(this.memory.failures === MEMORY_EASY_AFTER ? TEXT_MEMORY_EASIER : TEXT_MEMORY_WRONG);
      this.playback = { index: -1, t: 1.2 };
    } else if (res === 'done') {
      for (let k = 0; k < 4; k++) this.light(k, true);
      const t = this.plan.memoryTiles[1];
      this.hooks.burst(t.x + 1, this.plan.floorY + 0.6, t.z, 0x9fd8ff, 26);
      audio.sfx('door');
      this.hooks.toast(TEXT_MEMORY_DONE);
      this.next();
    } else audio.sfx('correct');
  }

  // ---------- Le moulin gelé ----------

  private mount(gear: (typeof this.gears)[number], slot: GearSlot | null): void {
    gear.slot = slot;
    const m = gear.model.root;
    if (slot === null) {
      m.position.copy(gear.rest);
      m.rotation.set(-Math.PI / 2, 0, 0);
      return;
    }
    const a = this.plan.axles[GEAR_SLOTS.indexOf(slot)];
    m.position.set(a.x, this.plan.floorY + AXLE_Y[slot], a.z + 0.15);
    m.rotation.set(0, 0, 0);
  }

  private placed(): Partial<Record<GearSlot, GearSize>> {
    const out: Partial<Record<GearSlot, GearSize>> = {};
    for (const g of this.gears) if (g.slot) out[g.slot] = g.size;
    return out;
  }

  private async millPanel(): Promise<void> {
    if (this.busy || this.spinning || this.step !== 'mill') return;
    this.busy = true;
    this.hooks.lock(true);
    for (;;) {
      const slot = await this.hooks.choose(TEXT_MILL_CHOOSE_AXLE, [...TEXT_AXLES, TEXT_TURN_CRANK, TEXT_CLOSE], 'mill-axle');
      if (slot === 3) {
        this.turnCrank();
        break;
      }
      if (slot > 3) break;
      const s = GEAR_SLOTS[slot];
      const here = this.gears.find((g) => g.slot === s);
      const small = this.gears.find((g) => g.size === 'small' && g.slot === null);
      const big = this.gears.find((g) => g.size === 'big' && g.slot === null);
      const options: { label: string; pick: () => void }[] = [];
      if (small) options.push({ label: TEXT_SMALL_GEAR, pick: () => (here && this.mount(here, null), this.mount(small, s)) });
      if (big) options.push({ label: TEXT_BIG_GEAR, pick: () => (here && this.mount(here, null), this.mount(big, s)) });
      if (here) options.push({ label: TEXT_REMOVE_GEAR, pick: () => this.mount(here, null) });
      const k = await this.hooks.choose(TEXT_MILL_CHOOSE_GEAR, [...options.map((o) => o.label), TEXT_BACK], 'mill-gear');
      if (k < options.length) {
        options[k].pick();
        audio.sfx('tile');
      }
    }
    this.hooks.lock(false);
    this.busy = false;
  }

  private turnCrank(): void {
    const result = gearTrain(this.placed());
    this.spinning = { t: 0, result };
    audio.sfx('crate');
  }

  private updateMill(dt: number): void {
    const sp = this.spinning;
    const crankWheel = this.crank.part('wheel');
    const millWheel = this.mill.part('wheel');
    if (!sp) {
      // Le moulin réparé continue de tourner dans le bon sens.
      if (this.index() > this.index('mill') && millWheel) {
        millWheel.rotation.z += dt * 1.5;
        if (crankWheel) crankWheel.rotation.z -= dt * 1.5;
        for (const g of this.gears) if (g.slot) g.model.part('wheel')!.rotation.z += dt * (g.slot === 'L' ? 3 : -3);
      }
      return;
    }
    sp.t += dt;
    const r = sp.result;
    const spinSign = (s: Spin): number => (s === 'cw' ? -1 : 1);
    const turning = r.kind !== 'jam';
    // La manivelle tourne toujours (sauf blocage : elle tremble).
    if (crankWheel) crankWheel.rotation.z += turning ? -dt * 2 : Math.sin(sp.t * 40) * 0.02;
    if (r.kind === 'turns') {
      r.chain.forEach((slot, i) => {
        const g = this.gears.find((k) => k.slot === slot);
        const wheel = g?.model.part('wheel');
        if (wheel) wheel.rotation.z += dt * 2 * spinSign(r.spins[i]) * (g!.size === 'big' ? 0.6 : 1.2);
      });
      if (millWheel) millWheel.rotation.z += dt * 1.6 * spinSign(r.mill);
    } else if (r.kind === 'gap') {
      // Seule la roue accrochée à la manivelle tourne.
      const g = r.after === 'L' ? this.gears.find((k) => k.slot === 'L') : undefined;
      const wheel = g?.model.part('wheel');
      if (wheel) wheel.rotation.z += dt * 2.4;
    }
    if (sp.t < CRANK_SPIN_S) return;
    this.spinning = null;
    if (r.kind === 'turns' && r.right) {
      this.hooks.burst(this.plan.mill.x, this.plan.floorY + 1.5, this.plan.mill.z, 0x9fd8ff, 30);
      audio.sfx('door');
      this.hooks.toast(TEXT_MILL_RIGHT);
      this.next();
      return;
    }
    audio.sfx('wrong');
    this.hooks.toast(r.kind === 'turns' ? TEXT_MILL_WRONG : r.kind === 'gap' ? TEXT_MILL_GAP : TEXT_MILL_JAM);
    if (++this.millTries % MILL_HINT_AFTER === 0) this.hooks.dialog.show({ speaker: NPC_NAMES.lumibloc, portrait: PORTRAITS.lumibloc, text: S4_MILL_HINT });
  }

  // ---------- Éclosion ----------

  private async hatch(): Promise<void> {
    if (this.busy || this.step !== 'open') return;
    this.busy = true;
    this.hooks.lock(true);
    await hatchEgg(
      {
        egg: this.egg,
        nest: this.plan.nest,
        floorY: this.plan.floorY,
        choices: S4_EGG_CHOICES,
        place: (id, x, z, facing) => this.place(id, x, z, facing),
        wobble: (seconds) => (this.wobble = seconds),
      },
      this.state,
      this.hooks,
    );
    this.next();
    this.hooks.lock(false);
    this.busy = false;
  }

  // ---------- Mise à jour ----------

  update(dt: number, hero: { x: number; z: number }, playing: boolean): void {
    this.time += dt;
    this.stones.forEach((st, i) => {
      const rune = st.part('rune');
      const mine = i === 0 ? 'stone' : 'stone4';
      if (rune) rune.visible = this.step === mine ? Math.sin(this.time * 3) > -0.6 : this.index() > this.index(mine);
    });
    this.wobble = Math.max(0, this.wobble - dt);
    this.egg.root.rotation.z = this.wobble > 0 ? Math.sin(this.time * 25) * 0.15 * Math.min(1, this.wobble) : Math.sin(this.time * 1.5) * 0.03;
    this.updateSlide(dt, hero, playing);
    this.updateMemory(dt, hero, playing);
    this.updateMill(dt);
    // La flèche d'aide de la glissade (sur la case de départ) et la plaque du moulin.
    const y = this.plan.floorY;
    if (this.step === 'slide') {
      const start = this.cellCenter(SLIDE_ROOM.start);
      const arrow = { N: '⬆️', E: '➡️', S: '⬇️', W: '⬅️' }[SLIDE_ROOM.hint];
      this.labels.text('s4-arrow', arrow, start.x, y + 0.4, start.y, 'symbol-tile');
    }
    const nearMill = Math.hypot(hero.x - this.plan.millPanel.x, hero.z - this.plan.millPanel.z) < 9;
    if (nearMill && this.index() <= this.index('mill')) this.labels.text('s4-rule', S4_MILL_RULE, this.plan.mill.x - 1.5, y + 3.2, this.plan.mill.z, 'tag-label');
  }

  snapshot(): {
    step: string;
    slideCell: [number, number];
    slides: number;
    memory: { input: number; failures: number; playing: boolean; sequence: readonly number[] };
    gears: Partial<Record<GearSlot, GearSize>>;
    plan: FrostSanctuaryPlan;
  } {
    return {
      step: this.step,
      slideCell: [...this.slide.pos],
      slides: this.slide.slides,
      memory: { input: this.memory.input.length, failures: this.memory.failures, playing: this.playback !== null, sequence: this.memory.sequence },
      gears: this.placed(),
      plan: this.plan,
    };
  }
}

/** Glissade vue de l'extérieur (tests) : la case d'arrivée depuis une case, dans une direction. */
export const slideFrom = slide;
