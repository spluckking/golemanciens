import * as THREE from 'three';
import { CONTENT } from '../data/content';
import { GOLEMS, type GolemSpecies } from '../data/creatures';
import {
  S1_EGG_CHOICES,
  S1_HINT,
  TEXT_READ_STONE,
  TEXT_RESTART,
  TEXT_STONE_SOLVED,
  TEXT_STONE_WRONG,
  TEXT_TILES_DONE,
  TEXT_TILES_WRONG,
  TEXT_TOUCH_EGG,
  TEXT_WELCOME_GOLEM,
} from '../data/sanctuaries';
import { CubeModel } from '../entities/cubeModel';
import { MODELS, PORTRAITS, type ModelId } from '../entities/models';
import { presentRiddle, type QuestionView } from '../questions/present';
import { RiddleStone, TilePuzzle, advance, type TileColor } from '../quests/sanctuary';
import { lumiblocLine, NPC_NAMES } from '../story/dialogues';
import type { DialogBubble } from '../ui/dialog';
import type { Cell, SanctuaryPlan } from '../world/structures';
import type { VoxelWorld } from '../world/voxelWorld';
import { Block } from '../world/blocks';
import { createGolem, markSeen, type GameState } from './gameState';
import type { Interactable, Interactions } from './interactions';
import type { Rng } from './rng';

/** Niveau des pierres-énigmes du sanctuaire de la phase 1 (SPEC.md § 10.1). */
const STONE_LEVEL = 1;
const STONE_RADIUS = 2.4;
const EGG_RADIUS = 2.4;

const TILE_MODELS: Record<TileColor, [ModelId, ModelId]> = {
  red: ['tileRed', 'tileRedLit'],
  yellow: ['tileYellow', 'tileYellowLit'],
  blue: ['tileBlue', 'tileBlueLit'],
  white: ['tileWhite', 'tileWhiteLit'],
  violet: ['tileViolet', 'tileVioletLit'],
};
const TILE_BURST: Record<TileColor, number> = { red: 0xe0453a, yellow: 0xf2c43c, blue: 0x3f7fe0, white: 0xf4f2ea, violet: 0x9a5ad0 };

export interface SanctuaryHooks {
  dialog: DialogBubble;
  toast: (text: string) => void;
  burst: (x: number, y: number, z: number, color: number, count?: number) => void;
  /** Le monde a changé (porte ouverte) : reconstruire ces cases. */
  rebuild: (cells: Cell[]) => void;
  /** Interface : poser une question (index affiché du choix), puis montrer la bonne réponse. */
  ask: (view: QuestionView) => Promise<number>;
  reveal: (view: QuestionView, chosen: number) => Promise<void>;
  /** Interface de l'éclosion : choix du golem, puis surnom (facultatif). */
  chooseGolem: (choices: readonly GolemSpecies[]) => Promise<GolemSpecies>;
  askNickname: (species: GolemSpecies) => Promise<string>;
  /** Début et fin d'une séquence où le héros ne bouge plus (énigme, éclosion). */
  lock: (locked: boolean) => void;
  /** Place le héros (pour bien voir l'éclosion). */
  placeHero: (x: number, z: number, facing: number) => void;
  /** Un progrès à enregistrer (porte ouverte, golem éclos). */
  onProgress: () => void;
}

interface Tile {
  color: TileColor;
  x: number;
  z: number;
  off: CubeModel;
  on: CubeModel;
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Sanctuaire des Fleurs en jeu (CONTENU.md, S1) : pierre-énigme qui ouvre la porte de lianes,
 * dalles fleuries qui ouvrent la porte du temple, puis l'œuf qui éclot et le choix du golem.
 */
export class SanctuaryLife {
  private readonly stone: CubeModel;
  private readonly egg: CubeModel;
  private readonly tiles: Tile[] = [];
  private readonly puzzle = new TilePuzzle();
  private readonly riddle: RiddleStone;
  private readonly group = new THREE.Group();
  private readonly floorY: number;
  private readonly stoneTalk: Interactable;
  private readonly restartTalk: Interactable;
  private readonly eggTalk: Interactable;
  private lastCell = '';
  private shake = 0;
  private wobble = 0;
  private hintShownAt = 0;
  private busy = false;
  /** Étape déjà accordée au monde (pour enregistrer à chaque changement). */
  private synced: string | undefined;
  private time = 0;

  constructor(
    private readonly plan: SanctuaryPlan,
    private readonly world: VoxelWorld,
    parent: THREE.Group,
    private readonly state: GameState,
    private readonly interactions: Interactions,
    private readonly rng: Rng,
    private readonly hooks: SanctuaryHooks,
  ) {
    parent.add(this.group);
    this.floorY = plan.floorY;
    this.riddle = new RiddleStone(CONTENT.riddles, state.riddles, STONE_LEVEL, rng);

    this.stone = this.place('riddleStone', plan.stone.x, plan.stone.z, -Math.PI / 2);
    const f = plan.fresco;
    this.place('fresco', f.x, f.z, f.facing).root.position.y = f.y;
    this.place('nest', plan.nest.x, plan.nest.z, 0);
    this.egg = this.place('eggPrairie', plan.nest.x, plan.nest.z, Math.PI / 2);
    this.egg.root.position.y = this.floorY + 0.15;
    this.egg.root.scale.setScalar(1.3);
    for (const t of plan.tiles) {
      const [offId, onId] = TILE_MODELS[t.color];
      const tile: Tile = { ...t, off: this.place(offId, t.x + 0.5, t.z + 0.5, 0), on: this.place(onId, t.x + 0.5, t.z + 0.5, 0) };
      this.tiles.push(tile);
    }

    this.stoneTalk = { id: 'sanct-stone', x: plan.stone.x, y: this.floorY, z: plan.stone.z, radius: STONE_RADIUS, label: TEXT_READ_STONE, action: () => void this.readStone() };
    const door = plan.door[0];
    this.restartTalk = { id: 'sanct-restart', x: door.x - 1, y: this.floorY, z: plan.nest.z, radius: 1.6, label: TEXT_RESTART, action: () => this.restartTiles() };
    this.eggTalk = { id: 'sanct-egg', x: plan.nest.x, y: this.floorY, z: plan.nest.z, radius: EGG_RADIUS, label: TEXT_TOUCH_EGG, action: () => void this.hatch() };
    this.syncWorld();
  }

  private place(id: ModelId, x: number, z: number, facing: number): CubeModel {
    const m = new CubeModel(MODELS[id]);
    m.root.position.set(x, this.floorY, z);
    m.root.rotation.y = facing;
    this.group.add(m.root);
    return m;
  }

  private get step(): string {
    return this.state.sanctuary.step;
  }

  /** Accorde les portes, les dalles et les interactions avec l'avancement enregistré. */
  private syncWorld(): void {
    const s = this.step;
    if (this.synced !== undefined && this.synced !== s) this.hooks.onProgress();
    this.synced = s;
    const open = (cells: Cell[]): void => {
      if (cells.every((c) => this.world.get(c.x, c.y, c.z) === Block.Air)) return;
      for (const c of cells) this.world.set(c.x, c.y, c.z, Block.Air);
      this.hooks.rebuild(cells);
    };
    if (s !== 'stone') open(this.plan.gate);
    if (s === 'open' || s === 'hatched') open(this.plan.door);
    this.toggle(this.stoneTalk, s === 'stone');
    this.toggle(this.restartTalk, s === 'tiles');
    this.toggle(this.eggTalk, s === 'open');
    this.egg.root.visible = s !== 'hatched';
    const solved = s === 'open' || s === 'hatched';
    for (const t of this.tiles) this.lightTile(t, solved && t.color !== 'white' && t.color !== 'violet');
  }

  private toggle(it: Interactable, on: boolean): void {
    this.interactions.remove(it.id);
    if (on) this.interactions.add(it);
  }

  private lightTile(t: Tile, on: boolean): void {
    t.on.root.visible = on;
    t.off.root.visible = !on;
  }

  // ---------- Pierre-énigme ----------

  /** Une énigme de niveau 1 ; en cas d'erreur, la pierre tremble, l'explication s'affiche et une autre énigme suit. */
  private async readStone(): Promise<void> {
    if (this.busy || this.step !== 'stone') return;
    this.busy = true;
    this.hooks.lock(true);
    for (;;) {
      const view = presentRiddle(this.riddle.current, this.rng);
      const chosen = await this.hooks.ask(view);
      const res = this.riddle.answer(view.sourceIndex[chosen]);
      if (res.correct) {
        this.hooks.burst(this.plan.stone.x, this.floorY + 1.2, this.plan.stone.z, 0x9ff0ff, 24);
        advance(this.state.sanctuary);
        this.syncWorld();
        for (const c of this.plan.gate) this.hooks.burst(c.x + 0.5, c.y + 0.5, c.z + 0.5, 0x6fae52, 6);
        this.hooks.toast(TEXT_STONE_SOLVED);
        break;
      }
      this.shake = 0.8;
      await this.hooks.reveal(view, chosen);
      this.hooks.toast(TEXT_STONE_WRONG);
    }
    this.hooks.lock(false);
    this.busy = false;
  }

  // ---------- Dalles fleuries ----------

  private stepOn(t: Tile): void {
    const res = this.puzzle.step(t.color);
    if (res === 'ignored') return;
    if (res === 'wrong') {
      for (const tile of this.tiles) this.lightTile(tile, false);
      this.hooks.burst(t.x + 0.5, this.floorY + 0.3, t.z + 0.5, 0x888888, 10);
      this.hooks.toast(TEXT_TILES_WRONG);
      if (this.puzzle.needsHint && this.hintShownAt !== this.puzzle.fails) {
        this.hintShownAt = this.puzzle.fails;
        this.hooks.dialog.show({ speaker: NPC_NAMES.lumibloc, portrait: PORTRAITS.lumibloc, text: S1_HINT });
      }
      return;
    }
    this.lightTile(t, true);
    this.hooks.burst(t.x + 0.5, this.floorY + 0.4, t.z + 0.5, TILE_BURST[t.color], 12);
    if (res === 'done') {
      advance(this.state.sanctuary);
      this.syncWorld();
      for (const c of this.plan.door) this.hooks.burst(c.x + 0.5, c.y + 0.5, c.z + 0.5, 0xffe27a, 6);
      this.hooks.toast(TEXT_TILES_DONE);
    }
  }

  private restartTiles(): void {
    this.puzzle.reset();
    for (const t of this.tiles) this.lightTile(t, false);
    this.lastCell = '';
  }

  // ---------- Éclosion ----------

  /** L'œuf tremble et éclot ; deux silhouettes apparaissent ; le joueur choisit, puis donne un surnom s'il veut. */
  private async hatch(): Promise<void> {
    if (this.busy || this.step !== 'open') return;
    this.busy = true;
    this.hooks.lock(true);
    const { x, z } = this.plan.nest;
    const y = this.floorY;
    // Le héros recule un peu : la caméra voit le nid et les deux silhouettes.
    this.hooks.placeHero(x - 3.4, z, -Math.PI / 2);
    this.hooks.dialog.show(lumiblocLine('hatching'));
    this.wobble = 1.6;
    await wait(1600);
    this.egg.root.visible = false;
    this.hooks.burst(x, y + 0.8, z, 0xf6efdc, 30);

    // Silhouettes : à gauche et à droite du nid, vues depuis la porte (gauche = nord).
    const shadows = S1_EGG_CHOICES.map((species, i) => {
      const m = this.place(species === 'pierre' ? 'shadowPierre' : 'shadowMousse', x - 0.6, z + (i === 0 ? -1.6 : 1.6), Math.PI / 2);
      this.hooks.burst(m.root.position.x, y + 1, m.root.position.z, 0x9a8ad0, 14);
      return { species, model: m };
    });
    for (const s of S1_EGG_CHOICES) markSeen(this.state, s);
    await wait(1400);
    this.hooks.dialog.close();
    const species = await this.hooks.chooseGolem(S1_EGG_CHOICES);

    // La silhouette choisie prend ses couleurs, l'autre s'efface.
    for (const s of shadows) {
      s.model.root.removeFromParent();
      if (s.species !== species) this.hooks.burst(s.model.root.position.x, y + 1, s.model.root.position.z, 0x9a8ad0, 10);
    }
    const chosen = shadows.find((s) => s.species === species)!;
    const golem = this.place(species, chosen.model.root.position.x, chosen.model.root.position.z, Math.PI / 2);
    this.hooks.burst(golem.root.position.x, y + 1, golem.root.position.z, 0xffe27a, 30);
    await wait(500);
    const nickname = await this.hooks.askNickname(species);
    golem.root.removeFromParent();

    this.state.golems.push(createGolem(species, nickname));
    advance(this.state.sanctuary);
    this.syncWorld();
    this.hooks.toast(TEXT_WELCOME_GOLEM.replace('{nom}', nickname || GOLEMS[species].name));
    this.hooks.lock(false);
    this.busy = false;
  }

  // ---------- Mise à jour ----------

  update(dt: number, hero: { x: number; z: number }, playing: boolean): void {
    this.time += dt;
    // La rune de la pierre pulse tant que l'énigme n'est pas résolue ; elle tremble après une erreur.
    const rune = this.stone.part('rune');
    if (rune) rune.visible = this.step === 'stone' ? Math.sin(this.time * 3) > -0.6 : true;
    this.shake = Math.max(0, this.shake - dt);
    this.stone.root.position.x = this.plan.stone.x + (this.shake > 0 ? Math.sin(this.time * 60) * 0.06 : 0);
    this.wobble = Math.max(0, this.wobble - dt);
    this.egg.root.rotation.z = this.wobble > 0 ? Math.sin(this.time * 25) * 0.15 * Math.min(1, this.wobble) : Math.sin(this.time * 1.5) * 0.03;

    if (!playing || this.step !== 'tiles') return;
    const cx = Math.floor(hero.x);
    const cz = Math.floor(hero.z);
    const key = `${cx},${cz}`;
    if (key === this.lastCell) return;
    this.lastCell = key;
    const tile = this.tiles.find((t) => t.x === cx && t.z === cz);
    if (tile) this.stepOn(tile);
  }

  snapshot(): {
    step: string;
    riddle: string;
    stone: { x: number; z: number };
    tiles: { color: string; x: number; z: number; lit: boolean }[];
    nest: { x: number; z: number };
    fails: number;
  } {
    return {
      step: this.step,
      riddle: this.riddle.current.id,
      stone: this.plan.stone,
      tiles: this.tiles.map((t) => ({ color: t.color, x: t.x + 0.5, z: t.z + 0.5, lit: t.on.root.visible })),
      nest: this.plan.nest,
      fails: this.puzzle.fails,
    };
  }
}
