import * as THREE from 'three';
import { CONTENT } from '../data/content';
import {
  BALANCE_HINT_AFTER,
  S5_BALANCE_HINT,
  S5_EGG_CHOICES,
  TEXT_BALANCE_CHOOSE,
  TEXT_BALANCE_DONE,
  TEXT_BALANCE_HEAVY,
  TEXT_BALANCE_LIGHT,
  TEXT_BALANCE_PANEL,
  TEXT_CLOSE,
  TEXT_CLOUD_FALL,
  TEXT_CLOUD_RIGHT,
  TEXT_CLOUD_WRONG,
  TEXT_CLOUDS_DONE,
  TEXT_CLOUDS_HINT,
  TEXT_DOOR_OPEN,
  TEXT_READ_STONE,
  TEXT_STONE_WRONG,
  TEXT_TOUCH_EGG,
  TEXT_WEIGHT_OFF,
  TEXT_WEIGHT_ON,
} from '../data/sanctuaries';
import { CubeModel } from '../entities/cubeModel';
import { MODELS, PORTRAITS, type ModelId } from '../entities/models';
import { presentRiddle } from '../questions/present';
import { RiddleStone, S5_STEPS, advance } from '../quests/sanctuary';
import { BALANCE_WEIGHTS, Balance, CloudPath, RAINBOW_ORDER, type CloudColor } from '../quests/skyPuzzles';
import { NPC_NAMES } from '../story/dialogues';
import type { WorldLabels } from '../ui/worldLabels';
import type { SkySanctuaryPlan } from '../world/ciel';
import type { Cell } from '../world/structures';
import type { VoxelWorld } from '../world/voxelWorld';
import { Block } from '../world/blocks';
import { audio } from '../audio/audio';
import { hatchEgg } from './eggHatch';
import type { FrostSanctuaryHooks } from './frostSanctuaryLife';
import { progress, type GameState } from './gameState';
import type { Interactable, Interactions } from './interactions';
import type { Rng } from './rng';
import { recordRiddle } from './stats';

const STONE_LEVEL = 5;
const CLOUD_COLORS: Record<CloudColor, number> = { red: 0xe84a4a, orange: 0xf0943c, yellow: 0xf4d83c, green: 0x5ac85a, blue: 0x4a8ae8, violet: 0x9a5ad8 };
const BEAM_HALF = 1.5;
const GATE_RISE = 2.4;

/**
 * Sanctuaire des Vents en jeu (CONTENU.md, S5) : la pierre de niveau 5, les nuages arc-en-ciel à
 * franchir dans l'ordre (une chute ramène au départ), la balance à contrepoids et sa herse, la
 * seconde pierre, puis l'œuf et le choix entre Nuage et Arc-en-ciel.
 */
export class SkySanctuaryLife {
  private readonly group = new THREE.Group();
  private readonly riddle: RiddleStone;
  private readonly stones: CubeModel[] = [];
  private readonly egg: CubeModel;
  private readonly path = new CloudPath();
  private readonly scale = new Balance();
  private readonly balance: CubeModel;
  private readonly pans: CubeModel[];
  private readonly weights: CubeModel[];
  private readonly gate: CubeModel;
  private readonly talks: Record<'stone' | 'stone5' | 'egg' | 'balance', Interactable>;
  private lastCloud: CloudColor | null = null;
  private gateLevel = 0;
  private toggles = 0;
  private hinted = false;
  private busy = false;
  private wobble = 0;
  private synced: string | undefined;
  private time = 0;

  constructor(
    private readonly plan: SkySanctuaryPlan,
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
    for (const p of [plan.stone, plan.stone5]) this.stones.push(this.place('riddleStone', p.x, p.z, -Math.PI / 2));
    this.place('stainedGlass', plan.stainedGlass.x, plan.stainedGlass.z, 0);

    // La balance : le fléau, deux plateaux, le poids de 8 à gauche ; les poids 1, 2, 3, 5 sur la table.
    this.balance = this.place('balance', plan.balance.x, plan.balance.z, 0);
    this.pans = [this.place('pan', 0, 0, 0), this.place('pan', 0, 0, 0)];
    this.place('weight8', 0, 0, 0).root.name = 'weight8';
    this.weights = BALANCE_WEIGHTS.map((w) => this.place(`weight${w}` as ModelId, 0, 0, 0));
    this.gate = this.place('portcullis', plan.gate.x, plan.gate.z, 0);

    this.place('nest', plan.nest.x, plan.nest.z, 0);
    this.egg = this.place('eggCiel', plan.nest.x, plan.nest.z, Math.PI / 2);
    this.egg.root.position.y = y + 0.15;
    this.egg.root.scale.setScalar(1.3);
    this.talks = {
      stone: { id: 's5-stone', ...plan.stone, y, radius: 2.4, label: TEXT_READ_STONE, action: () => void this.readStone('stone') },
      stone5: { id: 's5-stone5', ...plan.stone5, y, radius: 2.4, label: TEXT_READ_STONE, action: () => void this.readStone('stone5') },
      egg: { id: 's5-egg', ...plan.nest, y, radius: 2.4, label: TEXT_TOUCH_EGG, action: () => void this.hatch() },
      balance: { id: 's5-balance', ...plan.balancePanel, y, radius: 2, label: TEXT_BALANCE_PANEL, action: () => void this.balancePanel() },
    };
    this.syncWorld();
    this.layoutBalance(0);
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
    return S5_STEPS.indexOf(step as (typeof S5_STEPS)[number]);
  }

  private next(): void {
    advance(progress(this.state).sanctuary, S5_STEPS);
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
    if (i > this.index('clouds')) open(this.plan.doorB);
    if (i > this.index('balance')) {
      open(this.plan.doorC);
      // Partie rechargée : la balance reste équilibrée (5 + 3).
      if (!this.scale.solved) for (const w of [3, 5]) this.scale.toggle(BALANCE_WEIGHTS.indexOf(w));
      this.path.lit = RAINBOW_ORDER.length;
    }
    if (i > this.index('clouds')) this.path.lit = RAINBOW_ORDER.length;
    const set = (it: Interactable, on: boolean): void => {
      this.interactions.remove(it.id);
      if (on) this.interactions.add(it);
    };
    set(this.talks.stone, s === 'stone');
    set(this.talks.balance, s === 'balance');
    set(this.talks.stone5, s === 'stone5');
    set(this.talks.egg, s === 'open');
    this.egg.root.visible = s !== 'hatched';
  }

  // ---------- Pierres-énigmes (niveau 5) ----------

  private async readStone(which: 'stone' | 'stone5'): Promise<void> {
    if (this.busy || this.step !== which) return;
    this.busy = true;
    this.hooks.lock(true);
    const p = which === 'stone' ? this.plan.stone : this.plan.stone5;
    for (;;) {
      const view = presentRiddle(this.riddle.current, this.rng);
      const chosen = await this.hooks.ask(view);
      const level = this.riddle.current.level;
      const res = this.riddle.answer(view.sourceIndex[chosen]);
      recordRiddle(this.state.stats, level, res.correct);
      if (res.correct) {
        this.hooks.burst(p.x, this.plan.floorY + 1.2, p.z, 0x9ff0ff, 24);
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
    if (which === 'stone') this.hooks.dialog.show({ speaker: NPC_NAMES.lumibloc, portrait: PORTRAITS.lumibloc, text: TEXT_CLOUDS_HINT });
  }

  // ---------- Les nuages arc-en-ciel ----------

  private cloudUnder(x: number, y: number, z: number): CloudColor | null {
    if (Math.abs(y - this.plan.floorY) > 0.3) return null;
    const c = this.plan.clouds.find((k) => x >= k.x0 && x < k.x0 + 2 && z >= k.z0 && z < k.z0 + 2);
    return c ? c.color : null;
  }

  private updateClouds(hero: { x: number; y: number; z: number }, playing: boolean): void {
    if (this.step !== 'clouds' || !playing) return;
    const p = this.plan;
    const inRoom = hero.x > p.clouds[0].x0 - 2 && hero.x < p.clouds[0].x0 + 9 && hero.z > p.cloudEnd.z - 1 && hero.z < p.cloudStart.z + 2;
    // Une chute ramène au départ, sans rien perdre.
    if (inRoom && hero.y < p.floorY - 2) {
      this.hooks.moveHero(p.cloudStart.x, p.cloudStart.z);
      this.hooks.toast(TEXT_CLOUD_FALL);
      audio.sfx('wings');
      this.lastCloud = null;
      return;
    }
    const color = this.cloudUnder(hero.x, hero.y, hero.z);
    if (color === this.lastCloud) return;
    this.lastCloud = color;
    if (!color) return;
    const res = this.path.step(color);
    const cloud = p.clouds.find((k) => k.color === color)!;
    if (res === 'wrong') {
      audio.sfx('wrong');
      this.hooks.toast(TEXT_CLOUD_WRONG);
    } else if (res === 'ok' || res === 'done') {
      this.hooks.burst(cloud.x0 + 1, p.floorY + 0.4, cloud.z0 + 1, CLOUD_COLORS[color], 18);
      audio.sfx('chime');
      if (res === 'done') {
        audio.sfx('door');
        this.hooks.toast(TEXT_CLOUDS_DONE);
        this.next();
      } else this.hooks.toast(TEXT_CLOUD_RIGHT.replace('{n}', String(this.path.lit)));
    }
  }

  // ---------- La balance à contrepoids ----------

  /** Place le fléau, les plateaux, les poids et la herse (ratio : 0 à 1, l'avancement de l'animation). */
  private layoutBalance(dt: number): void {
    const b = this.plan.balance;
    const beam = this.balance.part('beam');
    const target = -this.scale.tilt;
    if (beam) beam.rotation.z += (target - beam.rotation.z) * Math.min(1, dt * 4 || 1);
    const theta = beam?.rotation.z ?? 0;
    const pivotY = this.plan.floorY + 1.85;
    const ends = [-1, 1].map((side) => ({ x: b.x + side * BEAM_HALF * Math.cos(theta), y: pivotY + side * BEAM_HALF * Math.sin(theta) }));
    this.pans.forEach((pan, i) => pan.root.position.set(ends[i].x, ends[i].y, b.z));
    const panTop = (i: number): number => ends[i].y - 0.8;
    const w8 = this.group.getObjectByName('weight8');
    if (w8) w8.position.set(ends[0].x, panTop(0), b.z);
    let stack = 0;
    this.weights.forEach((m, i) => {
      if (this.scale.placed.has(i)) {
        m.root.position.set(ends[1].x - 0.25 + (stack % 2) * 0.5, panTop(1) + Math.floor(stack / 2) * 0.45, b.z + (stack % 2 ? 0.2 : -0.2));
        stack++;
      } else m.root.position.set(this.plan.weightsTable.x + i * 0.55, this.plan.floorY, this.plan.weightsTable.z);
    });
    const want = this.index() > this.index('balance') ? 1 : this.scale.gate;
    this.gateLevel += (want - this.gateLevel) * Math.min(1, dt * 3 || 1);
    this.gate.root.position.y = this.plan.floorY + this.gateLevel * GATE_RISE;
  }

  private async balancePanel(): Promise<void> {
    if (this.busy || this.step !== 'balance') return;
    this.busy = true;
    this.hooks.lock(true);
    for (;;) {
      const labels = BALANCE_WEIGHTS.map((w, i) => (this.scale.placed.has(i) ? TEXT_WEIGHT_ON : TEXT_WEIGHT_OFF).replace('{n}', String(w)));
      const k = await this.hooks.choose(TEXT_BALANCE_CHOOSE, [...labels, TEXT_CLOSE], 'balance-weight');
      if (k >= BALANCE_WEIGHTS.length) break;
      this.scale.toggle(k);
      this.toggles++;
      audio.sfx('knock');
      if (this.scale.solved) {
        this.hooks.toast(TEXT_BALANCE_DONE);
        audio.sfx('door');
        this.hooks.burst(this.plan.gate.x, this.plan.floorY + 2, this.plan.gate.z, 0xfff3a0, 24);
        this.next();
        break;
      }
      this.hooks.toast(this.scale.diff < 0 ? TEXT_BALANCE_LIGHT : TEXT_BALANCE_HEAVY);
      if (!this.hinted && this.toggles >= BALANCE_HINT_AFTER) {
        this.hinted = true;
        this.hooks.lock(false);
        this.busy = false;
        this.hooks.dialog.show({ speaker: NPC_NAMES.lumibloc, portrait: PORTRAITS.lumibloc, text: S5_BALANCE_HINT });
        return;
      }
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
        choices: S5_EGG_CHOICES,
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

  update(dt: number, hero: { x: number; y: number; z: number }, playing: boolean): void {
    this.time += dt;
    this.stones.forEach((st, i) => {
      const rune = st.part('rune');
      const mine = i === 0 ? 'stone' : 'stone5';
      if (rune) rune.visible = this.step === mine ? Math.sin(this.time * 3) > -0.6 : this.index() > this.index(mine);
    });
    this.wobble = Math.max(0, this.wobble - dt);
    this.egg.root.rotation.z = this.wobble > 0 ? Math.sin(this.time * 25) * 0.15 * Math.min(1, this.wobble) : Math.sin(this.time * 1.5) * 0.03;
    this.updateClouds(hero, playing);
    this.layoutBalance(dt);
    // Une étoile au-dessus de chaque nuage déjà allumé.
    if (this.index() <= this.index('clouds') && Math.hypot(hero.x - this.plan.cloudStart.x, hero.z - this.plan.cloudStart.z) < 14)
      for (let k = 0; k < this.path.lit; k++) {
        const c = this.plan.clouds.find((cl) => cl.color === RAINBOW_ORDER[k])!;
        this.labels.text(`s5-cloud-${k}`, '⭐', c.x0 + 1, this.plan.floorY + 0.8, c.z0 + 1, 'symbol-tile');
      }
  }

  snapshot(): { step: string; lit: number; right: number; placed: number[]; gate: number; plan: SkySanctuaryPlan } {
    return { step: this.step, lit: this.path.lit, right: this.scale.right, placed: [...this.scale.placed], gate: this.gateLevel, plan: this.plan };
  }
}
