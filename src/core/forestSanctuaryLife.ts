import * as THREE from 'three';
import { CONTENT } from '../data/content';
import {
  CANAL_HINT_AFTER,
  S2_CANAL_HINT,
  S2_EGG_CHOICES,
  S2_INSCRIPTION,
  S2_LEVER_HINT,
  TEXT_CANALS_DONE,
  TEXT_DOOR_OPEN,
  TEXT_LEVERS_DONE,
  TEXT_LEVERS_WRONG,
  TEXT_PULL_LEVER,
  TEXT_READ_STONE,
  TEXT_RESTART,
  TEXT_STELE,
  TEXT_STONE_SOLVED,
  TEXT_STONE_WRONG,
  TEXT_TOUCH_EGG,
  TEXT_TURN_PIECE,
} from '../data/sanctuaries';
import { CubeModel } from '../entities/cubeModel';
import { MODELS, PORTRAITS, type ModelId } from '../entities/models';
import { presentRiddle } from '../questions/present';
import { CANAL_COLS, CANAL_ROWS, CanalPuzzle, flow } from '../quests/canals';
import { RiddleStone, S2_LEVER_ORDER, S2_STEPS, TilePuzzle, advance, type LeverSymbol } from '../quests/sanctuary';
import { NPC_NAMES } from '../story/dialogues';
import type { Cell } from '../world/structures';
import type { MossPlan } from '../world/forestStructures';
import type { VoxelWorld } from '../world/voxelWorld';
import { Block } from '../world/blocks';
import { audio } from '../audio/audio';
import { hatchEgg } from './eggHatch';
import { progress, type GameState } from './gameState';
import type { Interactable, Interactions } from './interactions';
import type { Rng } from './rng';
import type { SanctuaryHooks } from './sanctuaryLife';
import { recordRiddle } from './stats';

/** Niveau des pierres-énigmes de la phase 2 (SPEC.md § 10.1). */
const STONE_LEVEL = 2;
const STONE_RADIUS = 2.4;
const LEVER_RADIUS = 1.2;
const PIECE_RADIUS = 0.85;

const LEVER_MODELS: Record<LeverSymbol, ModelId> = { sun: 'leverSun', moon: 'leverMoon', star: 'leverStar' };

interface Lever {
  symbol: LeverSymbol;
  model: CubeModel;
  talk: Interactable;
}

interface Piece {
  gx: number;
  gy: number;
  model: CubeModel;
  talk: Interactable;
}

/**
 * Sanctuaire de Mousse en jeu (CONTENU.md, S2) : première pierre (niveau 2), stèle et trois leviers
 * (la haie de branches s'écarte), canaux d'eau (la roue du moulin tourne), deuxième pierre (la porte
 * du temple s'ouvre), puis l'œuf et le choix entre Écorce et Champignon.
 */
export class ForestSanctuaryLife {
  private readonly group = new THREE.Group();
  private readonly stones: CubeModel[] = [];
  private readonly egg: CubeModel;
  private readonly mill: CubeModel;
  private readonly levers: Lever[] = [];
  private readonly pieces: Piece[] = [];
  private readonly leverPuzzle = new TilePuzzle<LeverSymbol>(S2_LEVER_ORDER);
  private readonly canals = new CanalPuzzle();
  private readonly riddle: RiddleStone;
  private readonly stoneTalks: Interactable[];
  private readonly steleTalk: Interactable;
  private readonly restartTalk: Interactable;
  private readonly eggTalk: Interactable;
  private shake = 0;
  private wobble = 0;
  private busy = false;
  private turnsSinceHint = 0;
  private synced: string | undefined;
  private time = 0;

  constructor(
    private readonly plan: MossPlan,
    private readonly world: VoxelWorld,
    parent: THREE.Group,
    private readonly state: GameState,
    private readonly interactions: Interactions,
    private readonly rng: Rng,
    private readonly hooks: SanctuaryHooks,
  ) {
    parent.add(this.group);
    this.riddle = new RiddleStone(CONTENT.riddles, state.riddles, STONE_LEVEL, rng);
    const y = plan.floorY;

    this.stones = [this.place('riddleStone', plan.stone1.x, plan.stone1.z, -Math.PI / 2), this.place('riddleStone', plan.stone2.x, plan.stone2.z, -Math.PI / 2)];
    this.stoneTalks = [plan.stone1, plan.stone2].map((p, i) => ({
      id: `s2-stone-${i + 1}`,
      x: p.x,
      y,
      z: p.z,
      radius: STONE_RADIUS,
      label: TEXT_READ_STONE,
      action: () => void this.readStone(),
    }));

    // La stèle se lit à tout moment.
    this.place('stele', plan.stele.x, plan.stele.z, Math.PI);
    this.steleTalk = { id: 's2-stele', x: plan.stele.x, y, z: plan.stele.z + 1, radius: 1.6, label: TEXT_STELE, action: () => this.readStele() };
    this.interactions.add(this.steleTalk);

    for (const l of plan.levers) {
      const lever: Lever = {
        symbol: l.symbol,
        model: this.place(LEVER_MODELS[l.symbol], l.x, l.z, Math.PI),
        talk: { id: `s2-lever-${l.symbol}`, x: l.x, y, z: l.z + 0.8, radius: LEVER_RADIUS, label: TEXT_PULL_LEVER, action: () => this.pull(lever) },
      };
      this.levers.push(lever);
    }

    // Canaux : chaque morceau se tourne quand on se tient dessus.
    const { x0, z0, step } = plan.canal;
    for (let gy = 0; gy < CANAL_ROWS; gy++)
      for (let gx = 0; gx < CANAL_COLS; gx++) {
        const kind = this.canals.grid[gy][gx].kind;
        const px = x0 + gx * step;
        const pz = z0 + gy * step;
        const piece: Piece = {
          gx,
          gy,
          model: this.place(kind === 'straight' ? 'canalStraight' : 'canalCorner', px, pz, 0),
          talk: { id: `s2-canal-${gx}-${gy}`, x: px, y, z: pz, radius: PIECE_RADIUS, label: TEXT_TURN_PIECE, action: () => this.turn(piece) },
        };
        piece.model.root.scale.setScalar(step / 1.5);
        this.pieces.push(piece);
      }
    this.place('spring', plan.spring.x, plan.spring.z, 0);
    this.mill = this.place('millWheel', plan.mill.x, plan.mill.z, 0);
    this.restartTalk = { id: 's2-restart', x: plan.restart.x, y, z: plan.restart.z, radius: 1.3, label: TEXT_RESTART, action: () => this.restartCanals() };

    this.place('nest', plan.nest.x, plan.nest.z, 0);
    this.egg = this.place('eggForet', plan.nest.x, plan.nest.z, Math.PI / 2);
    this.egg.root.position.y = y + 0.15;
    this.egg.root.scale.setScalar(1.3);
    this.eggTalk = { id: 's2-egg', x: plan.nest.x, y, z: plan.nest.z, radius: 2.4, label: TEXT_TOUCH_EGG, action: () => void this.hatch() };
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

  private stepIndex(step = this.step): number {
    return S2_STEPS.indexOf(step as (typeof S2_STEPS)[number]);
  }

  /** Accorde la haie, la porte, les leviers, les canaux et les interactions avec l'avancement. */
  private syncWorld(): void {
    const s = this.step;
    if (this.synced !== undefined && this.synced !== s) this.hooks.onProgress();
    this.synced = s;
    const i = this.stepIndex();
    const open = (cells: Cell[]): void => {
      if (cells.every((c) => this.world.get(c.x, c.y, c.z) === Block.Air)) return;
      for (const c of cells) this.world.set(c.x, c.y, c.z, Block.Air);
      this.hooks.rebuild(cells);
    };
    if (i > this.stepIndex('levers')) open(this.plan.hedgeGap);
    if (i >= this.stepIndex('open')) open(this.plan.door);
    this.toggle(this.stoneTalks[0], s === 'stone');
    this.toggle(this.stoneTalks[1], s === 'stone2');
    for (const l of this.levers) {
      this.toggle(l.talk, s === 'levers');
      const down = i > this.stepIndex('levers') || this.leverPuzzle.lit.includes(l.symbol);
      l.model.swing('handle', down ? 1.2 : 0);
    }
    // Énigme des canaux déjà réussie (partie rechargée) : on remet la grille dans sa solution.
    if (i > this.stepIndex('canals') && !this.canals.solved) for (const [x, y] of [[0, 1], [1, 1], [1, 0], [2, 0], [3, 0], [3, 1]]) this.canals.rotate(x, y);
    for (const p of this.pieces) this.toggle(p.talk, s === 'canals');
    this.toggle(this.restartTalk, s === 'canals');
    this.refreshCanals();
    this.toggle(this.eggTalk, s === 'open');
    this.egg.root.visible = s !== 'hatched';
  }

  private toggle(it: Interactable, on: boolean): void {
    this.interactions.remove(it.id);
    if (on) this.interactions.add(it);
  }

  private lumibloc(text: string): void {
    this.hooks.dialog.show({ speaker: NPC_NAMES.lumibloc, portrait: PORTRAITS.lumibloc, text });
  }

  // ---------- Pierres-énigmes (niveau 2) ----------

  private async readStone(): Promise<void> {
    if (this.busy || (this.step !== 'stone' && this.step !== 'stone2')) return;
    this.busy = true;
    this.hooks.lock(true);
    const stone = this.step === 'stone' ? this.plan.stone1 : this.plan.stone2;
    for (;;) {
      const view = presentRiddle(this.riddle.current, this.rng);
      const chosen = await this.hooks.ask(view);
      const level = this.riddle.current.level;
      const res = this.riddle.answer(view.sourceIndex[chosen]);
      recordRiddle(this.state.stats, level, res.correct);
      if (res.correct) {
        this.hooks.burst(stone.x, this.plan.floorY + 1.2, stone.z, 0x9ff0ff, 24);
        const wasSecond = this.step === 'stone2';
        advance(progress(this.state).sanctuary, S2_STEPS);
        this.syncWorld();
        audio.sfx('door');
        this.hooks.toast(wasSecond ? TEXT_DOOR_OPEN : TEXT_STONE_SOLVED);
        break;
      }
      this.shake = 0.8;
      await this.hooks.reveal(view, chosen);
      this.hooks.toast(TEXT_STONE_WRONG);
    }
    this.hooks.lock(false);
    this.busy = false;
  }

  // ---------- Stèle et leviers ----------

  private readStele(): void {
    this.hooks.dialog.show({ speaker: TEXT_STELE, portrait: PORTRAITS.lumibloc, text: `« ${S2_INSCRIPTION} »` });
  }

  private pull(lever: Lever): void {
    if (this.step !== 'levers') return;
    const res = this.leverPuzzle.step(lever.symbol);
    if (res === 'ignored') return;
    lever.model.swing('handle', 1.2);
    audio.sfx('knock');
    if (res === 'wrong') {
      // Les leviers remontent ; après 3 erreurs, Lumibloc aide.
      for (const l of this.levers) l.model.swing('handle', 0);
      audio.sfx('wrong');
      this.hooks.toast(TEXT_LEVERS_WRONG);
      const sanct = progress(this.state).sanctuary;
      sanct.tileFails++;
      if (sanct.tileFails % 3 === 0) this.lumibloc(S2_LEVER_HINT);
      return;
    }
    this.hooks.burst(lever.model.root.position.x, this.plan.floorY + 1.4, lever.model.root.position.z, 0xfff3a0, 10);
    if (res === 'done') {
      advance(progress(this.state).sanctuary, S2_STEPS);
      this.syncWorld();
      for (const c of this.plan.hedgeGap) this.hooks.burst(c.x + 0.5, c.y + 0.5, c.z + 0.5, 0x6fae52, 6);
      audio.sfx('door');
      this.hooks.toast(TEXT_LEVERS_DONE);
    }
  }

  // ---------- Canaux d'eau ----------

  private turn(piece: Piece): void {
    if (this.step !== 'canals') return;
    const solved = this.canals.rotate(piece.gx, piece.gy);
    audio.sfx('tile');
    this.refreshCanals();
    if (solved) {
      advance(progress(this.state).sanctuary, S2_STEPS);
      this.syncWorld();
      audio.sfx('quest');
      this.hooks.burst(this.plan.mill.x, this.plan.floorY + 1.2, this.plan.mill.z, 0x7ac0ff, 20);
      this.hooks.toast(TEXT_CANALS_DONE);
      return;
    }
    if (++this.turnsSinceHint >= CANAL_HINT_AFTER) {
      this.turnsSinceHint = 0;
      this.lumibloc(S2_CANAL_HINT);
    }
  }

  private restartCanals(): void {
    this.canals.reset();
    this.refreshCanals();
  }

  /** Oriente chaque morceau et montre l'eau là où elle passe. */
  private refreshCanals(): void {
    const wet = flow(this.canals.grid).wet;
    for (const p of this.pieces) {
      p.model.root.rotation.y = (-this.canals.grid[p.gy][p.gx].rot * Math.PI) / 2;
      const water = p.model.part('water');
      if (water) water.visible = wet.some(([x, y]) => x === p.gx && y === p.gy);
    }
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
        choices: S2_EGG_CHOICES,
        place: (id, x, z, facing) => this.place(id, x, z, facing),
        wobble: (seconds) => (this.wobble = seconds),
      },
      this.state,
      this.hooks,
    );
    advance(progress(this.state).sanctuary, S2_STEPS);
    this.syncWorld();
    this.hooks.lock(false);
    this.busy = false;
  }

  // ---------- Mise à jour ----------

  update(dt: number): void {
    this.time += dt;
    const active = this.step === 'stone' ? 0 : this.step === 'stone2' ? 1 : -1;
    this.stones.forEach((stone, i) => {
      const rune = stone.part('rune');
      if (rune) rune.visible = i === active ? Math.sin(this.time * 3) > -0.6 : i < active || this.stepIndex() > this.stepIndex('stone2') || (i === 0 && active === -1);
    });
    this.shake = Math.max(0, this.shake - dt);
    const shaking = active >= 0 ? this.stones[active] : null;
    if (shaking) shaking.root.position.x = (active === 0 ? this.plan.stone1.x : this.plan.stone2.x) + (this.shake > 0 ? Math.sin(this.time * 60) * 0.06 : 0);
    this.wobble = Math.max(0, this.wobble - dt);
    this.egg.root.rotation.z = this.wobble > 0 ? Math.sin(this.time * 25) * 0.15 * Math.min(1, this.wobble) : Math.sin(this.time * 1.5) * 0.03;
    // La roue tourne dès que l'eau arrive.
    const wheel = this.mill.part('wheel');
    if (wheel && this.stepIndex() > this.stepIndex('canals')) wheel.rotation.x -= dt * 1.5;
  }

  snapshot(): {
    step: string;
    stones: { x: number; z: number }[];
    levers: { symbol: string; x: number; z: number }[];
    pieces: { gx: number; gy: number; x: number; z: number; rot: number }[];
    wet: number;
    nest: { x: number; z: number };
    fails: number;
  } {
    return {
      step: this.step,
      stones: [this.plan.stone1, this.plan.stone2],
      levers: this.plan.levers.map((l) => ({ symbol: l.symbol, x: l.x, z: l.z + 0.8 })),
      pieces: this.pieces.map((p) => ({ gx: p.gx, gy: p.gy, x: p.talk.x, z: p.talk.z, rot: this.canals.grid[p.gy][p.gx].rot })),
      wet: flow(this.canals.grid).wet.length,
      nest: this.plan.nest,
      fails: progress(this.state).sanctuary.tileFails,
    };
  }
}
