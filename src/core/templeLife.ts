import * as THREE from 'three';
import { CONTENT } from '../data/content';
import {
  S3_EGG_CHOICES,
  S3_MIRROR_HINT,
  S3_PUSH_HINT,
  TEMPLE_HINT_AFTER,
  TEXT_DOOR_OPEN,
  BOARD_MIRRORS,
  BOARD_PUSH,
  BOARD_SYMBOLS,
  TEXT_SOLVE,
  TEXT_MIRRORS_DONE,
  TEXT_PUSH_DONE,
  TEXT_PUSH_STUCK,
  TEXT_READ_STONE,
  TEXT_STONE_WRONG,
  TEXT_SYMBOL_RIGHT,
  TEXT_SYMBOL_WRONG,
  TEXT_SYMBOLS_DONE,
  TEXT_TOUCH_EGG,
} from '../data/sanctuaries';
import { CubeModel } from '../entities/cubeModel';
import { MODELS, type ModelId } from '../entities/models';
import { presentRiddle } from '../questions/present';
import { RiddleStone, S3_STEPS, advance } from '../quests/sanctuary';
import { MIRROR_ROOM, MirrorPuzzle, PUSH_ROOM, PushPuzzle, SYMBOL_WALLS, traceRay, type Dir } from '../quests/templePuzzles';
import { openMirrorBoard, openPushBoard, openSymbolBoard } from '../ui/puzzleBoards';
import type { WorldLabels } from '../ui/worldLabels';
import type { TemplePlan } from '../world/desert';
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

const STONE_LEVEL = 3;
const FACING: Record<Dir, number> = { N: 0, E: -Math.PI / 2, S: Math.PI, W: Math.PI / 2 };

/**
 * Temple ensablé en jeu (CONTENU.md, S3) : le bloc de grès à pousser sur la dalle, les miroirs
 * du soleil (le rayon se voit), les dalles-symboles (deux suites), la pierre-énigme de niveau 3,
 * puis l'œuf et le choix entre Sable et Cuivre.
 */
export class TempleLife {
  private readonly group = new THREE.Group();
  private readonly block: CubeModel;
  private readonly mirrors: CubeModel[];
  private readonly rays: CubeModel[] = [];
  private readonly crystal: CubeModel;
  private readonly crystalLit: CubeModel;
  private readonly stone: CubeModel;
  private readonly egg: CubeModel;
  private readonly push = new PushPuzzle();
  private readonly mirror = new MirrorPuzzle();
  private readonly riddle: RiddleStone;
  private readonly blockTalk: Interactable;
  private readonly mirrorTalks: Interactable[];
  private readonly symbolTalk: Interactable;
  private readonly stoneTalk: Interactable;
  private readonly eggTalk: Interactable;
  private wall = 0;
  private busy = false;
  private wobble = 0;
  private synced: string | undefined;
  private time = 0;

  constructor(
    private readonly plan: TemplePlan,
    private readonly world: VoxelWorld,
    parent: THREE.Group,
    private readonly state: GameState,
    private readonly interactions: Interactions,
    private readonly rng: Rng,
    private readonly labels: WorldLabels,
    private readonly hooks: SanctuaryHooks,
  ) {
    parent.add(this.group);
    const sanct = progress(state).sanctuary;
    if (sanct.step === 'stone') sanct.step = 'push';
    this.riddle = new RiddleStone(CONTENT.riddles, state.riddles, STONE_LEVEL, rng);
    const y = plan.floorY;

    // Salle du bloc : la dalle-pression et le bloc de grès.
    const cell = (o: { x: number; z: number }, gx: number, gy: number): { x: number; z: number } => ({ x: o.x + gx, z: o.z + gy });
    const plate = cell(plan.pushOrigin, ...PUSH_ROOM.plate);
    this.place('pressurePlate', plate.x, plate.z, 0);
    this.block = this.place('sandstoneBlock', 0, 0, 0);
    this.blockTalk = { id: 's3-block', x: plan.pushOrigin.x + 2, y, z: plan.pushOrigin.z + 2, radius: 3.6, label: TEXT_SOLVE, action: () => void this.openPush() };

    // Salle des miroirs : deux miroirs, le cristal de la porte, le rayon.
    this.mirrors = MIRROR_ROOM.mirrors.map((m) => {
      const p = cell(plan.mirrorOrigin, m.x, m.y);
      return this.place('mirror', p.x, p.z, 0);
    });
    this.mirrorTalks = MIRROR_ROOM.mirrors.map((m, i) => {
      const p = cell(plan.mirrorOrigin, m.x, m.y);
      return { id: `s3-mirror-${i}`, x: p.x, y, z: p.z, radius: 2.2, label: TEXT_SOLVE, action: () => void this.openMirrors() };
    });
    const cp = cell(plan.mirrorOrigin, ...MIRROR_ROOM.crystal);
    this.crystal = this.place('doorCrystal', cp.x, cp.z, 0);
    this.crystalLit = this.place('doorCrystalLit', cp.x, cp.z, 0);
    for (let i = 0; i < 12; i++) this.rays.push(this.place('sunRay', 0, 0, 0));

    // Dernière salle : les dalles de la suite, la pierre-énigme, le nid.
    for (const t of plan.symbolTiles) this.place('symbolNumber', t.x, t.z, 0);
    this.symbolTalk = { id: 's3-symbols', ...plan.symbolTiles[1], y, radius: 3, label: TEXT_SOLVE, action: () => void this.openSymbols() };
    this.stone = this.place('riddleStone', plan.stone.x, plan.stone.z, -Math.PI / 2);
    this.stoneTalk = { id: 's3-stone', ...plan.stone, y, radius: 2.4, label: TEXT_READ_STONE, action: () => void this.readStone() };
    this.place('nest', plan.nest.x, plan.nest.z, 0);
    this.egg = this.place('eggDesert', plan.nest.x, plan.nest.z, Math.PI / 2);
    this.egg.root.position.y = y + 0.15;
    this.egg.root.scale.setScalar(1.3);
    this.eggTalk = { id: 's3-egg', ...plan.nest, y, radius: 2.4, label: TEXT_TOUCH_EGG, action: () => void this.hatch() };
    this.syncWorld();
  }

  private place(id: ModelId, x: number, z: number, facing: number): CubeModel {
    const m = new CubeModel(MODELS[id]);
    m.root.position.set(x, this.plan.floorY, z);
    m.root.rotation.y = facing;
    this.group.add(m.root);
    return m;
  }

  get step(): string {
    return progress(this.state).sanctuary.step;
  }

  private index(step = this.step): number {
    return S3_STEPS.indexOf(step as (typeof S3_STEPS)[number]);
  }

  private next(): void {
    advance(progress(this.state).sanctuary, S3_STEPS);
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
    if (i > this.index('push')) open(this.plan.doorA);
    if (i > this.index('mirrors')) open(this.plan.doorB);
    // Énigmes déjà réussies (partie rechargée) : on remet le bloc et les miroirs dans leur solution.
    if (i > this.index('push') && !this.push.solved) for (const d of ['S', 'S', 'E', 'E'] as const) this.push.push(d);
    if (i > this.index('mirrors') && !this.mirror.solved) {
      this.mirror.facing = ['N', 'E'];
    }
    const set = (it: Interactable, on: boolean): void => {
      this.interactions.remove(it.id);
      if (on) this.interactions.add(it);
    };
    set(this.blockTalk, s === 'push');
    set(this.symbolTalk, s === 'symbols');
    for (const t of this.mirrorTalks) set(t, s === 'mirrors');
    set(this.stoneTalk, s === 'stone3');
    set(this.eggTalk, s === 'open');
    this.egg.root.visible = s !== 'hatched';
    if (i > this.index('symbols')) this.wall = SYMBOL_WALLS.length;
    this.refresh();
  }

  /** Place le bloc, oriente les miroirs et trace le rayon. */
  private refresh(): void {
    const o = this.plan.pushOrigin;
    this.block.root.position.set(o.x + this.push.block[0], this.plan.floorY, o.z + this.push.block[1]);
    this.mirror.facing.forEach((d, i) => (this.mirrors[i].root.rotation.y = FACING[d]));
    const { path, lit } = traceRay(this.mirror.facing);
    const m = this.plan.mirrorOrigin;
    this.rays.forEach((r, k) => {
      const a = path[k];
      const b = path[k + 1];
      r.root.visible = this.index() >= this.index('mirrors') && a !== undefined && b !== undefined;
      if (!r.root.visible) return;
      r.root.position.set(m.x + (a[0] + b[0]) / 2, this.plan.floorY + 1.1, m.z + (a[1] + b[1]) / 2);
      r.root.rotation.y = a[1] === b[1] ? Math.PI / 2 : 0;
    });
    // Le rayon entre par la porte de la salle du bloc, dès qu'elle est ouverte.
    this.crystalLit.root.visible = lit;
    this.crystal.root.visible = !lit;
  }

  // ---------- Bloc de grès ----------

  /** Le bloc se pousse sur un plateau 2D, vu de dessus ; celui du décor suit. */
  private async openPush(): Promise<void> {
    if (this.busy || this.step !== 'push') return;
    this.busy = true;
    this.hooks.lock(true);
    const solved = await openPushBoard(this.hooks.uiLayer, {
      puzzle: this.push,
      ...BOARD_PUSH,
      hint: S3_PUSH_HINT,
      hintAfter: TEMPLE_HINT_AFTER,
      stuckText: TEXT_PUSH_STUCK,
      timeScale: this.hooks.timeScale,
      onChange: () => this.refresh(),
      onPush: (moved) => audio.sfx(moved ? 'crate' : 'knock'),
    });
    this.hooks.lock(false);
    this.busy = false;
    if (!solved) return;
    const b = this.block.root.position;
    this.hooks.burst(b.x, this.plan.floorY + 1, b.z, 0xffe27a, 20);
    audio.sfx('door');
    this.hooks.toast(TEXT_PUSH_DONE);
    this.next();
  }

  // ---------- Miroirs ----------

  /** L'énigme se joue sur un plateau 2D, à l'abri de la caméra et des golems. */
  private async openMirrors(): Promise<void> {
    if (this.busy || this.step !== 'mirrors') return;
    this.busy = true;
    this.hooks.lock(true);
    const solved = await openMirrorBoard(this.hooks.uiLayer, {
      puzzle: this.mirror,
      ...BOARD_MIRRORS,
      hint: S3_MIRROR_HINT,
      hintAfter: TEMPLE_HINT_AFTER,
      onChange: () => this.refresh(),
      onTurn: () => audio.sfx('tile'),
      timeScale: this.hooks.timeScale,
    });
    this.hooks.lock(false);
    this.busy = false;
    if (!solved) return;
    const c = this.crystalLit.root.position;
    this.hooks.burst(c.x, this.plan.floorY + 1, c.z, 0xffe060, 30);
    audio.sfx('chime');
    this.hooks.toast(TEXT_MIRRORS_DONE);
    this.next();
  }

  // ---------- Dalles-symboles ----------

  private async openSymbols(): Promise<void> {
    if (this.busy || this.step !== 'symbols') return;
    this.busy = true;
    this.hooks.lock(true);
    const solved = await openSymbolBoard(this.hooks.uiLayer, {
      ...BOARD_SYMBOLS,
      timeScale: this.hooks.timeScale,
      wall: this.wall,
      wrongText: TEXT_SYMBOL_WRONG,
      rightText: TEXT_SYMBOL_RIGHT,
      onWrong: () => audio.sfx('wrong'),
      onRight: () => {
        audio.sfx('correct');
        this.wall++;
      },
    });
    this.hooks.lock(false);
    this.busy = false;
    if (!solved) return;
    this.hooks.toast(TEXT_SYMBOLS_DONE);
    this.next();
  }

  // ---------- Pierre-énigme (niveau 3) ----------

  private async readStone(): Promise<void> {
    if (this.busy || this.step !== 'stone3') return;
    this.busy = true;
    this.hooks.lock(true);
    for (;;) {
      const view = presentRiddle(this.riddle.current, this.rng);
      const chosen = await this.hooks.ask(view);
      const level = this.riddle.current.level;
      const res = this.riddle.answer(view.sourceIndex[chosen]);
      recordRiddle(this.state.stats, level, res.correct);
      if (res.correct) {
        this.hooks.burst(this.plan.stone.x, this.plan.floorY + 1.2, this.plan.stone.z, 0x9ff0ff, 24);
        audio.sfx('door');
        this.hooks.toast(TEXT_DOOR_OPEN);
        this.next();
        break;
      }
      await this.hooks.reveal(view, chosen);
      this.hooks.toast(TEXT_STONE_WRONG);
    }
    this.hooks.lock(false);
    this.busy = false;
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
        choices: S3_EGG_CHOICES,
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

  update(dt: number): void {
    this.time += dt;
    const rune = this.stone.part('rune');
    if (rune) rune.visible = this.step === 'stone3' ? Math.sin(this.time * 3) > -0.6 : this.index() > this.index('stone3');
    this.wobble = Math.max(0, this.wobble - dt);
    this.egg.root.rotation.z = this.wobble > 0 ? Math.sin(this.time * 25) * 0.15 * Math.min(1, this.wobble) : Math.sin(this.time * 1.5) * 0.03;
    // Le mur de la suite logique et les dalles (chiffres ou symboles, écrits au-dessus).
    const w = SYMBOL_WALLS[this.wall];
    if (this.index() <= this.index('symbols')) {
      const p = this.plan.symbolWall;
      this.labels.text('s3-wall', w ? w.sequence : SYMBOL_WALLS[SYMBOL_WALLS.length - 1].sequence.replace('❓', '7'), p.x, p.y, p.z, 'symbol-wall');
      if (w) this.plan.symbolTiles.forEach((t, i) => this.labels.text(`s3-tile-${i}`, w.tiles[i], t.x, this.plan.floorY + 0.6, t.z, 'symbol-tile'));
    }
  }

  snapshot(): { step: string; block: number[]; mirrors: string[]; lit: boolean; wall: number; tiles: { x: number; z: number }[]; stone: { x: number; z: number }; nest: { x: number; z: number }; blockPos: { x: number; z: number }; mirrorPos: { x: number; z: number }[] } {
    const o = this.plan.mirrorOrigin;
    return {
      step: this.step,
      block: [...this.push.block],
      mirrors: [...this.mirror.facing],
      lit: traceRay(this.mirror.facing).lit,
      wall: this.wall,
      tiles: this.plan.symbolTiles,
      stone: this.plan.stone,
      nest: this.plan.nest,
      blockPos: { x: this.block.root.position.x, z: this.block.root.position.z },
      mirrorPos: MIRROR_ROOM.mirrors.map((m) => ({ x: o.x + m.x, z: o.z + m.y })),
    };
  }
}
