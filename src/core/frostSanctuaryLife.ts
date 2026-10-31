import * as THREE from 'three';
import { CONTENT } from '../data/content';
import {
  MILL_HINT_AFTER,
  S4_EGG_CHOICES,
  S4_MILL_HINT,
  S4_MILL_RULE,
  TEXT_DOOR_OPEN,
  TEXT_ICE_MELTS,
  TEXT_MEMORY_DONE,
  TEXT_MEMORY_EASIER,
  TEXT_MEMORY_GO,
  TEXT_MEMORY_WATCH,
  TEXT_MEMORY_WRONG,
  TEXT_MILL_GAP,
  TEXT_MILL_JAM,
  TEXT_MILL_RIGHT,
  TEXT_MILL_WRONG,
  TEXT_READ_STONE,
  TEXT_SLIDE_DONE,
  TEXT_SLIDE_HINT,
  TEXT_STONE_WRONG,
  TEXT_TOUCH_EGG,
  BOARD_MEMORY,
  BOARD_MILL,
  BOARD_SLIDE,
  TEXT_SLIDE_FIRST,
  TEXT_SOLVE,
} from '../data/sanctuaries';
import { CubeModel } from '../entities/cubeModel';
import { MODELS, PORTRAITS, type ModelId } from '../entities/models';
import { presentRiddle } from '../questions/present';
import { GEAR_PIECES, GEAR_SLOTS, IceMemory, MEMORY_EASY_AFTER, SLIDE_ROOM, SlidePuzzle, slide, type GearSize, type GearSlot } from '../quests/frostPuzzles';
import { RiddleStone, S4_STEPS, advance } from '../quests/sanctuary';
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
import { openMemoryBoard, openMillBoard, openSlideBoard } from '../ui/puzzleBoards';

const STONE_LEVEL = 4;
/** Vitesse d'une glissade (cases par seconde) et décalage du centre de la case qui la déclenche. */
const MEMORY_COLORS = ['Blue', 'Green', 'Pink', 'Yellow'] as const;
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
  private readonly talks: Record<'stone' | 'stone4' | 'egg' | 'slide' | 'replay' | 'mill', Interactable>;
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
      slide: { id: 's4-slide', x: plan.slideOrigin.x + SLIDE_ROOM.start[0], z: plan.slideOrigin.z + SLIDE_ROOM.start[1], y, radius: 3, label: TEXT_SOLVE, action: () => void this.openSlide() },
      replay: { id: 's4-memory', ...plan.memoryStele, y, radius: 3, label: TEXT_SOLVE, action: () => void this.openMemory() },
      mill: { id: 's4-mill', ...plan.millPanel, y, radius: 2.4, label: TEXT_SOLVE, action: () => void this.openMill() },
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
    set(this.talks.slide, s === 'slide');
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

  private cellCenter(c: [number, number]): THREE.Vector2 {
    return new THREE.Vector2(this.plan.slideOrigin.x + c[0], this.plan.slideOrigin.z + c[1]);
  }

  /** La salle de glace se joue sur un plateau 2D ; le héros sort par l'ouverture nord une fois résolue. */
  private async openSlide(): Promise<void> {
    if (this.busy || this.step !== 'slide') return;
    this.busy = true;
    this.hooks.lock(true);
    const solved = await openSlideBoard(this.hooks.uiLayer, {
      puzzle: this.slide,
      ...BOARD_SLIDE,
      firstMove: TEXT_SLIDE_FIRST,
      timeScale: this.hooks.timeScale,
      onSlide: () => audio.sfx('slide'),
    });
    this.hooks.lock(false);
    this.busy = false;
    if (!solved) return;
    const out = this.cellCenter([SLIDE_ROOM.exit, -2]);
    this.hooks.moveHero(out.x, out.y);
    audio.sfx('chime');
    this.hooks.toast(TEXT_SLIDE_DONE);
    this.next();
  }

  // ---------- La mémoire de glace ----------

  private light(tile: number, on: boolean): void {
    this.tilesOn[tile].root.visible = on;
    this.tilesOff[tile].root.visible = !on;
  }

  private async openMemory(): Promise<void> {
    if (this.busy || this.step !== 'memory') return;
    this.busy = true;
    this.hooks.lock(true);
    const solved = await openMemoryBoard(this.hooks.uiLayer, {
      puzzle: this.memory,
      ...BOARD_MEMORY,
      timeScale: this.hooks.timeScale,
      watchText: TEXT_MEMORY_WATCH,
      goText: TEXT_MEMORY_GO,
      wrongText: TEXT_MEMORY_WRONG,
      easierText: TEXT_MEMORY_EASIER,
      easyAfter: MEMORY_EASY_AFTER,
      onPress: (_tile, res) => audio.sfx(res === 'wrong' ? 'wrong' : res === 'done' ? 'door' : 'correct'),
    });
    this.hooks.lock(false);
    this.busy = false;
    if (!solved) return;
    for (let k = 0; k < 4; k++) this.light(k, true);
    const t = this.plan.memoryTiles[1];
    this.hooks.burst(t.x + 1, this.plan.floorY + 0.6, t.z, 0x9fd8ff, 26);
    this.hooks.toast(TEXT_MEMORY_DONE);
    this.next();
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

  /** Les roues se posent sur un plateau 2D ; celles du décor suivent. */
  private async openMill(): Promise<void> {
    if (this.busy || this.step !== 'mill') return;
    this.busy = true;
    this.hooks.lock(true);
    const solved = await openMillBoard(this.hooks.uiLayer, {
      ...BOARD_MILL,
      hint: S4_MILL_HINT,
      hintAfter: MILL_HINT_AFTER,
      timeScale: this.hooks.timeScale,
      gapText: TEXT_MILL_GAP,
      jamText: TEXT_MILL_JAM,
      wrongText: TEXT_MILL_WRONG,
      onCrank: () => audio.sfx('crate'),
      onPlaced: (placed) => {
        audio.sfx('tile');
        for (const g of this.gears) this.mount(g, null);
        for (const slot of GEAR_SLOTS) {
          const size = placed[slot];
          const gear = this.gears.find((g) => g.size === size && g.slot === null);
          if (gear) this.mount(gear, slot);
        }
      },
    });
    this.hooks.lock(false);
    this.busy = false;
    if (!solved) return;
    this.hooks.burst(this.plan.mill.x, this.plan.floorY + 1.5, this.plan.mill.z, 0x9fd8ff, 30);
    audio.sfx('door');
    this.hooks.toast(TEXT_MILL_RIGHT);
    this.next();
  }

  /** Le moulin réparé continue de tourner dans le bon sens. */
  private updateMill(dt: number): void {
    const crankWheel = this.crank.part('wheel');
    const millWheel = this.mill.part('wheel');
    if (this.index() <= this.index('mill') || !millWheel) return;
    millWheel.rotation.z += dt * 1.5;
    if (crankWheel) crankWheel.rotation.z -= dt * 1.5;
    for (const g of this.gears) if (g.slot) g.model.part('wheel')!.rotation.z += dt * (g.slot === 'L' ? 3 : -3);
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

  update(dt: number, hero: { x: number; z: number }): void {
    this.time += dt;
    this.stones.forEach((st, i) => {
      const rune = st.part('rune');
      const mine = i === 0 ? 'stone' : 'stone4';
      if (rune) rune.visible = this.step === mine ? Math.sin(this.time * 3) > -0.6 : this.index() > this.index(mine);
    });
    this.wobble = Math.max(0, this.wobble - dt);
    this.egg.root.rotation.z = this.wobble > 0 ? Math.sin(this.time * 25) * 0.15 * Math.min(1, this.wobble) : Math.sin(this.time * 1.5) * 0.03;
    this.updateMill(dt);
    // La plaque du moulin.
    const y = this.plan.floorY;
    const nearMill = Math.hypot(hero.x - this.plan.millPanel.x, hero.z - this.plan.millPanel.z) < 9;
    if (nearMill && this.index() <= this.index('mill')) this.labels.text('s4-rule', S4_MILL_RULE, this.plan.mill.x - 1.5, y + 3.2, this.plan.mill.z, 'tag-label');
  }

  snapshot(): {
    step: string;
    slideCell: [number, number];
    slides: number;
    memory: { input: number; failures: number; sequence: readonly number[] };
    gears: Partial<Record<GearSlot, GearSize>>;
    plan: FrostSanctuaryPlan;
  } {
    return {
      step: this.step,
      slideCell: [...this.slide.pos],
      slides: this.slide.slides,
      memory: { input: this.memory.input.length, failures: this.memory.failures, sequence: this.memory.sequence },
      gears: this.placed(),
      plan: this.plan,
    };
  }
}

/** Glissade vue de l'extérieur (tests) : la case d'arrivée depuis une case, dans une direction. */
export const slideFrom = slide;
