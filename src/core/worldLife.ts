import * as THREE from 'three';
import { WorldSim, groundY, type GolemAgent, type MonsterAgent, type WorldEvent } from '../combat/realtime/worldSim';
import { FOOD_CHEST, FOOD_CRATE, FOOD_CRATE_CHANCE } from '../data/balance';
import { animateWalk, CubeModel } from '../entities/cubeModel';
import type { HeroState } from '../entities/heroController';
import { MODELS, golemModel, golemScale, type ModelId } from '../entities/models';
import type { Sparks } from '../entities/sparks';
import { greeting, lumiblocLine } from '../story/dialogues';
import type { DialogBubble } from '../ui/dialog';
import type { WorldLabels } from '../ui/worldLabels';
import { ATLAS_COLS, ATLAS_ROWS, Tile } from '../world/blocks';
import type { Point2, Point3, WorldLayout } from '../world/layout';
import type { FightStage } from '../world/structures';
import type { BossId } from '../data/creatures';
import { audio } from '../audio/audio';
import { markSeen, type GameState } from './gameState';
import type { Interactions } from './interactions';
import type { SolidFn } from './physics';
import type { Rng } from './rng';

/** Textes d'interface nouveaux (à valider par le parent). */
const TEXT_LANTERN_LIT = 'Lanterne allumée';
const TEXT_CHEST_GUARDED = 'Des monstres gardent ce coffre.';
const TEXT_TRAVEL = 'Voyager';

const VIEW_DISTANCE = 50;
/** Distance à laquelle un monstre compte comme rencontré (encyclopédie). */
export const SEEN_RADIUS = 12;
const NPC_TALK_RADIUS = 2.6;
const CHEST_RADIUS = 2.2;
const LANTERN_RADIUS = 3;
const ARCH_RADIUS = 3;
const AIM_RANGE = 9;
const AIM_CONE = Math.cos((40 * Math.PI) / 180);
const MONSTER_COLORS: Record<MonsterAgent['species'], number> = { slime: 0x6ed46e, zombie: 0x7fae6a, spider: 0x6b4a2e, skeleton: 0xeeeae0, wolf: 0x3e3e4c, hopper: 0x8a4ac8, mummy: 0xe0d0a8, scorpion: 0xc8743c, vulture: 0x8a5a32 };

/** Ce que le jeu fournit à la vie d'un biome. */
export interface WorldHooks {
  toast: (text: string) => void;
  dialog: DialogBubble;
  labels: WorldLabels;
  sparks: Sparks;
  onAllKO: () => void;
  /** Un progrès à enregistrer (quête, sanctuaire, lanterne, coffre…). */
  onProgress: () => void;
  /** Le héros touche l'arche du biome (voyage). */
  onArch: () => void;
}

/** Un combat au tour par tour du biome : où il se joue, contre quels monstres, et où l'on revient. */
export interface FightSetup {
  plan: FightStage;
  /** Phase des monstres de l'arène. */
  phase: number;
  /** Combat de boss : son identité, l'outro qui suit la victoire et le chapitre qui s'ouvre. */
  boss?: BossId;
  outro?: string;
  nextChapter?: number;
  /** Où le héros revient après le combat. */
  back: Point2;
}

/** Objectif actif (boussole) et lignes du journal. */
export interface Objective {
  text: string;
  target: Point2;
  current: { text: string; active: boolean }[];
  done: string[];
}

interface CreatureView {
  model: CubeModel;
  phase: number;
  /** Stade affiché (golems) : quand il change, le golem évolue sous nos yeux. */
  stage?: number;
  /** Animation d'évolution en cours (secondes restantes) et rotation ajoutée. */
  evolving?: number;
  spin?: number;
}

/** Durée de l'animation d'évolution (SPEC.md § 4.3 : moins de 4 s). */
const EVOLVE_S = 2.4;

interface Npc {
  id: string;
  model: CubeModel;
  x: number;
  y: number;
  z: number;
  baseFacing: number;
}

interface Crate {
  id: string;
  index: number;
  x: number;
  y: number;
  z: number;
  broken: boolean;
}

interface Chest {
  campId: string;
  model: CubeModel;
  x: number;
  y: number;
  z: number;
  opened: boolean;
}

interface Lantern {
  id: string;
  lit: CubeModel;
  unlit: CubeModel;
  x: number;
  y: number;
  z: number;
}

/**
 * Ce qui vit dans tout biome : golems, monstres des camps, PNJ, caisses, coffres, lanternes,
 * et l'arche. Chaque biome en hérite et y ajoute son chapitre (sanctuaire, quêtes, arène, boss).
 */
export abstract class WorldLife {
  readonly group = new THREE.Group();
  readonly sim: WorldSim;
  private readonly golemViews = new Map<GolemAgent, CreatureView>();
  private readonly monsterViews = new Map<MonsterAgent, CreatureView>();
  private readonly npcs: Npc[] = [];
  private readonly statics: CubeModel[] = [];
  private readonly crates: Crate[] = [];
  private readonly crateMesh: THREE.InstancedMesh;
  private readonly crateGeo: THREE.BufferGeometry;
  private readonly crateMat: THREE.MeshLambertMaterial;
  private readonly chests: Chest[] = [];
  private readonly lanterns: Lantern[] = [];
  private readonly shadows: THREE.InstancedMesh;
  private readonly arch: CubeModel;
  private readonly tmpM = new THREE.Matrix4();
  private dialogNpc: Npc | null = null;
  protected time = 0;

  constructor(
    readonly layout: WorldLayout,
    protected readonly state: GameState,
    atlas: THREE.Texture,
    protected readonly solid: SolidFn,
    protected readonly rng: Rng,
    protected readonly interactions: Interactions,
    protected readonly hooks: WorldHooks,
  ) {
    this.sim = new WorldSim(solid, rng, layout.safeZones);
    const surface = (x: number, z: number): number => layout.world.standY(Math.floor(x), Math.floor(z));

    // Monstres des camps.
    for (const camp of layout.camps) {
      camp.monsters.forEach((species, i) => {
        const a = (i / camp.monsters.length) * Math.PI * 2;
        const x = camp.x + 0.5 + Math.cos(a) * 1.5;
        const z = camp.z + 0.5 + Math.sin(a) * 1.5;
        const m = this.sim.addMonster(`${camp.id}-${i}`, species, camp.id, x, surface(x, z), z);
        this.addView(this.monsterViews, m, species);
      });
      const chest = this.spawnStatic('chest', camp.chest.x, camp.chest.z, 0);
      const opened = state.openedChests.includes(camp.id);
      if (opened) chest.swing('lid', -1.9);
      this.chests.push({ campId: camp.id, model: chest, x: camp.chest.x, y: surface(camp.chest.x, camp.chest.z), z: camp.chest.z, opened });
    }

    // PNJ : les villageois parlent d'abord de leurs quêtes, sinon ils saluent.
    for (const n of layout.npcs) {
      const model = this.spawnStatic(n.id as ModelId, n.x, n.z, n.facing);
      const npc: Npc = { id: n.id, model, x: n.x, y: surface(n.x, n.z), z: n.z, baseFacing: n.facing };
      this.npcs.push(npc);
      interactions.add({
        id: `npc-${n.id}`,
        x: npc.x,
        y: npc.y,
        z: npc.z,
        radius: NPC_TALK_RADIUS,
        label: 'Parler',
        action: () => {
          this.dialogNpc = npc;
          if (this.talk(n.id)) return;
          hooks.dialog.show(greeting(n.id), () => (this.dialogNpc = null));
        },
      });
    }
    for (const g of layout.guardians) this.spawnStatic('guardian', g.x, g.z, g.facing, 1.4);

    // L'arche : « Voyager » (son portail ne brille que si un voyage est possible).
    this.arch = this.spawnStatic('arch', layout.arch.x, layout.arch.z, layout.arch.facing);
    interactions.add({
      id: 'arch',
      x: layout.arch.x,
      y: surface(layout.arch.x, layout.arch.z),
      z: layout.arch.z,
      radius: ARCH_RADIUS,
      label: TEXT_TRAVEL,
      action: () => hooks.onArch(),
    });

    // Lanternes.
    for (const l of layout.lanterns) {
      const lit = this.spawnStatic('lanternLit', l.x, l.z, 0);
      const unlit = this.spawnStatic('lanternUnlit', l.x, l.z, 0);
      this.lanterns.push({ id: l.id, lit, unlit, x: l.x, y: l.y, z: l.z });
    }
    this.refreshLanterns();

    // Coffres : interaction « Ouvrir ».
    for (const c of this.chests) {
      interactions.add({
        id: `chest-${c.campId}`,
        x: c.x,
        y: c.y,
        z: c.z,
        radius: CHEST_RADIUS,
        label: 'Ouvrir',
        action: () => this.openChest(c),
      });
      if (c.opened) interactions.remove(`chest-${c.campId}`);
    }

    // Caisses (une seule instance de maillage).
    this.crateGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    mapBoxToTile(this.crateGeo, Tile.Crate);
    this.crateMat = new THREE.MeshLambertMaterial({ map: atlas });
    this.crateMesh = new THREE.InstancedMesh(this.crateGeo, this.crateMat, Math.max(1, layout.crates.length));
    this.crateMesh.count = layout.crates.length;
    layout.crates.forEach((c, index) => {
      const crate: Crate = { ...c, index, broken: state.brokenCrates.includes(c.id) };
      this.crates.push(crate);
      this.placeCrate(crate);
    });
    this.crateMesh.instanceMatrix.needsUpdate = true;
    this.crateMesh.computeBoundingSphere();
    this.group.add(this.crateMesh);

    // Ombres en disque sous les personnages (un seul appel de dessin).
    const disc = new THREE.CircleGeometry(0.5, 12).rotateX(-Math.PI / 2);
    this.shadows = new THREE.InstancedMesh(disc, new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.25, depthWrite: false }), 64);
    this.shadows.frustumCulled = false;
    this.group.add(this.shadows);
  }

  // ---------- Ce que chaque biome précise ----------

  /** Objectif actif (boussole) et journal. */
  abstract objective(hero: HeroState): Objective;

  /** Un PNJ a une réplique de quête : true si elle a été dite. */
  protected talk(_npcId: string): boolean {
    return false;
  }

  /** Cible de quête pour l'aide à la visée (caisse à clé…). */
  protected aimTarget(): Point3 | null {
    return null;
  }

  /** L'étincelle touche-t-elle un objet de quête ? */
  protected questHit(_x: number, _y: number, _z: number): boolean {
    return false;
  }

  /** Chapitre du biome : appelé à chaque image (playing : le monde avance). */
  protected updateChapter(_dt: number, _hero: HeroState, _playing: boolean, _controllable: boolean): void {}

  /** Combats du biome (arène, boss) ; null si le biome n'en a pas. */
  fightSetup(_kind: 'arena' | 'boss'): FightSetup | null {
    return null;
  }

  /** Point sûr du biome (maison dans la Prairie, arrivée par l'arche ailleurs). */
  homePoint(): Point3 {
    const a = this.layout.arrival;
    return { x: a.x, y: this.layout.world.standY(Math.floor(a.x), Math.floor(a.z)), z: a.z };
  }

  /** Le portail de l'arche brille quand un voyage est possible. */
  setArchOpen(open: boolean): void {
    const portal = this.arch.part('portal');
    if (portal) portal.visible = open;
  }

  // ---------- Golems ----------

  /** Crée les agents et modèles des golems de l'équipe, près du héros. */
  syncGolems(hero: HeroState): void {
    for (const data of this.state.golems) {
      if (this.sim.golems.some((g) => g.data === data)) continue;
      const g = this.sim.addGolem(data, hero.x + 1, hero.y, hero.z + 2);
      g.body.y = groundY(this.solid, g.body.x, g.body.z, hero.y + 2);
      const model = new CubeModel(golemModel(data.species, data.stage), golemScale(data.stage));
      this.group.add(model.root);
      this.golemViews.set(g, { model, phase: 0, stage: data.stage });
    }
  }

  isGolemKo(id: string): boolean {
    return this.sim.golems.some((g) => g.data.id === id && g.ko);
  }

  // ---------- Étincelle ----------

  /** Aide à la visée : monstre ou caisse le plus proche devant le héros. */
  aim(hero: HeroState): Point3 | null {
    const fx = -Math.sin(hero.facing);
    const fz = -Math.cos(hero.facing);
    let best: Point3 | null = null;
    let bestD = AIM_RANGE;
    const consider = (x: number, y: number, z: number): void => {
      const dx = x - hero.x;
      const dz = z - hero.z;
      const d = Math.hypot(dx, dz);
      if (d > bestD || d < 0.01) return;
      if ((dx * fx + dz * fz) / d < AIM_CONE) return;
      best = { x, y, z };
      bestD = d;
    };
    if (this.sim.hasAwakeGolem()) for (const m of this.sim.monsters) if (m.mode !== 'dead') consider(m.body.x, m.body.y + 0.5, m.body.z);
    for (const c of this.crates) if (!c.broken) consider(c.x, c.y + 0.4, c.z);
    const quest = this.aimTarget();
    if (quest) consider(quest.x, quest.y, quest.z);
    return best;
  }

  /** L'étincelle touche-t-elle un monstre (engagement) ou une caisse (cassée) ? */
  hitTest(x: number, y: number, z: number): boolean {
    if (this.sim.hasAwakeGolem()) {
      for (const m of this.sim.monsters) {
        if (m.mode === 'dead') continue;
        if (Math.hypot(m.body.x - x, m.body.z - z) < 0.8 && y > m.body.y - 0.2 && y < m.body.y + 1.4) {
          this.sim.engage(m);
          return true;
        }
      }
    }
    if (this.questHit(x, y, z)) return true;
    for (const c of this.crates) {
      if (c.broken) continue;
      if (Math.hypot(c.x - x, c.z - z) < 0.65 && y > c.y - 0.2 && y < c.y + 1.0) {
        this.breakCrate(c);
        return true;
      }
    }
    return false;
  }

  private breakCrate(c: Crate): void {
    c.broken = true;
    this.state.brokenCrates.push(c.id);
    this.placeCrate(c);
    this.crateMesh.instanceMatrix.needsUpdate = true;
    this.hooks.sparks.burst(c.x, c.y + 0.4, c.z, 0xc4965c, 14);
    audio.sfx('crate');
    if (this.rng() < FOOD_CRATE_CHANCE) this.gainFood(FOOD_CRATE, c.x, c.y + 1, c.z);
  }

  protected gainFood(amount: number, x: number, y: number, z: number): void {
    this.state.food += amount;
    audio.sfx('food');
    this.hooks.labels.float(`+${amount} 🍎`, x, y, z, 'food');
  }

  private openChest(c: Chest): void {
    const guarded = this.sim.monsters.some((m) => m.campId === c.campId && m.mode !== 'dead');
    if (guarded) {
      this.hooks.toast(TEXT_CHEST_GUARDED);
      return;
    }
    c.opened = true;
    this.state.openedChests.push(c.campId);
    c.model.swing('lid', -1.9);
    audio.sfx('chest');
    this.interactions.remove(`chest-${c.campId}`);
    this.gainFood(FOOD_CHEST, c.x, c.y + 1.2, c.z);
    this.hooks.onProgress();
  }

  // ---------- Mise à jour ----------

  update(dt: number, hero: HeroState, camera: THREE.Camera, playing: boolean, controllable = playing): void {
    this.time += dt;
    if (playing) {
      this.syncGolems(hero);
      const events = this.sim.update(dt, hero);
      for (const e of events) this.handle(e);
      this.updateLanterns(hero);
      this.updateTutorials(hero);
      // Encyclopédie : les monstres croisés de près sont « rencontrés ».
      for (const m of this.sim.monsters) if (m.mode !== 'dead' && Math.hypot(m.body.x - hero.x, m.body.z - hero.z) < SEEN_RADIUS) markSeen(this.state, m.species);
    }
    this.updateChapter(dt, hero, playing, controllable);
    if (playing && this.dialogNpc && Math.hypot(this.dialogNpc.x - hero.x, this.dialogNpc.z - hero.z) > 6) this.hooks.dialog.close();
    this.render(dt, hero, camera);
  }

  private handle(e: WorldEvent): void {
    const { labels, sparks } = this.hooks;
    switch (e.type) {
      case 'damage':
        labels.float(`−${Math.round(e.amount)}`, e.x, e.y, e.z, e.target === 'golem' ? 'dmg-golem' : e.superEffective ? 'dmg-super' : 'dmg');
        if (e.superEffective) labels.float('Super efficace !', e.x, e.y + 0.5, e.z, 'super');
        sparks.burst(e.x, e.y - 0.4, e.z, e.target === 'golem' ? 0xff8080 : 0xffffff, 5, 0.6);
        audio.sfx(e.target === 'golem' ? 'monsterHit' : e.superEffective ? 'super' : 'hitRock');
        break;
      case 'monsterDefeated': {
        const m = e.monster;
        sparks.burst(m.body.x, m.body.y + 0.5, m.body.z, MONSTER_COLORS[m.species], 26, 1.3);
        audio.sfx('poof');
        break;
      }
      case 'golemKO':
        sparks.burst(e.golem.body.x, e.golem.body.y + 0.8, e.golem.body.z, 0xdddddd, 10, 0.7);
        break;
      case 'golemWake':
        break;
      case 'allKO':
        this.hooks.onAllKO();
    }
  }

  private updateLanterns(hero: HeroState): void {
    for (const l of this.lanterns) {
      if (this.state.litLanterns.includes(l.id)) continue;
      if (Math.hypot(l.x - hero.x, l.z - hero.z) < LANTERN_RADIUS) {
        this.state.litLanterns.push(l.id);
        this.state.lastLantern = l.id;
        this.refreshLanterns();
        this.hooks.onProgress();
        this.hooks.sparks.burst(l.x, l.y + 1.9, l.z, 0xffe27a, 16);
        audio.sfx('lantern');
        this.hooks.toast(TEXT_LANTERN_LIT);
      }
    }
  }

  /** Point de retour après un K.O. général : la dernière lanterne allumée de ce biome, sinon le point sûr du biome. */
  respawnPoint(): Point3 {
    const l = this.lanterns.find((x) => x.id === this.state.lastLantern);
    if (l) return { x: l.x + 1.5, y: l.y, z: l.z + 1.5 };
    return this.homePoint();
  }

  private updateTutorials(hero: HeroState): void {
    const seen = this.state.tutorialsSeen;
    if (this.hooks.dialog.isOpen) return;
    if (!seen.includes('move')) {
      seen.push('move');
      this.hooks.dialog.show(lumiblocLine('tutorialMove'));
      return;
    }
    const first = this.crates[0];
    if (!seen.includes('crate') && first && !first.broken && Math.hypot(first.x - hero.x, first.z - hero.z) < 4) {
      seen.push('crate');
      this.hooks.dialog.show(lumiblocLine('tutorialCrate'));
    }
  }

  // ---------- Rendu ----------

  private render(dt: number, hero: HeroState, camera: THREE.Camera): void {
    const cam = camera.position;
    const near = (x: number, z: number): boolean => Math.hypot(x - cam.x, z - cam.z) < VIEW_DISTANCE;
    const labels = this.hooks.labels;
    let shadowCount = 0;
    const shadow = (x: number, y: number, z: number, size: number): void => {
      if (shadowCount >= 64) return;
      this.tmpM.makeScale(size, 1, size).setPosition(x, y + 0.03, z);
      this.shadows.setMatrixAt(shadowCount++, this.tmpM);
    };

    for (const [g, view] of this.golemViews) {
      this.animateEvolution(g, view, dt);
      const r = view.model.root;
      r.visible = near(g.body.x, g.body.z);
      r.position.set(g.body.x, g.body.y, g.body.z);
      r.rotation.y = g.facing + (view.spin ?? 0);
      if (g.ko) {
        r.rotation.z = Math.PI / 2;
        r.position.y += 0.45;
        labels.text(`zzz-${g.data.id}`, 'Zzz', g.body.x, g.body.y + 1.3 + Math.sin(this.time * 2) * 0.1, g.body.z);
      } else {
        r.rotation.z = 0;
        view.phase += dt * g.speed * 2;
        animateWalk(view.model, view.phase, g.speed > 0.3 ? 1 : 0);
        if (g.target || g.data.hp < g.data.maxHp) labels.bar(`hp-${g.data.id}`, g.data.hp / g.data.maxHp, g.body.x, g.body.y + 2.1, g.body.z, 'golem');
      }
      if (r.visible) shadow(g.body.x, g.body.y, g.body.z, 1.2);
    }

    for (const [m, view] of this.monsterViews) {
      const r = view.model.root;
      r.visible = m.mode !== 'dead' && near(m.body.x, m.body.z);
      if (!r.visible) continue;
      r.position.set(m.body.x, m.body.y, m.body.z);
      r.rotation.y = m.facing;
      view.phase += dt * (2 + m.speed * 2);
      animateMonster(m, view);
      if (m.mode === 'engaged') labels.bar(`hp-${m.id}`, m.hp / m.maxHp, m.body.x, m.body.y + 1.5, m.body.z, 'monster');
      shadow(m.body.x, m.body.y, m.body.z, m.species === 'spider' ? 1.4 : 1);
    }

    for (const n of this.npcs) {
      const r = n.model.root;
      r.visible = near(n.x, n.z);
      if (!r.visible) continue;
      // Les PNJ se tournent vers le héros quand il approche.
      const d = Math.hypot(hero.x - n.x, hero.z - n.z);
      const want = d < 6 ? Math.atan2(-(hero.x - n.x), -(hero.z - n.z)) : n.baseFacing;
      let diff = want - r.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      r.rotation.y += diff * Math.min(1, dt * 5);
      const body = n.model.part('body');
      if (body) body.position.y = Math.sin(this.time * 2 + n.x) * 0.02;
      shadow(n.x, n.y, n.z, 0.9);
    }
    for (const s of this.statics) if (!this.npcs.some((n) => n.model === s)) s.root.visible = near(s.root.position.x, s.root.position.z);
    // Le portail de l'arche tourne doucement.
    const portal = this.arch.part('portal');
    if (portal) portal.rotation.z = this.time * 0.8;

    this.shadows.count = shadowCount;
    this.shadows.instanceMatrix.needsUpdate = true;
  }

  /**
   * Évolution sous nos yeux : le golem tourne de plus en plus vite dans les étincelles, un éclair,
   * puis il réapparaît plus grand avec son nouveau modèle (son ascendant).
   */
  private animateEvolution(g: GolemAgent, view: CreatureView, dt: number): void {
    if (view.stage !== undefined && view.stage !== g.data.stage && view.evolving === undefined) {
      view.evolving = EVOLVE_S;
      audio.sfx('evolve');
    }
    if (view.evolving === undefined) return;
    const before = view.evolving;
    view.evolving -= dt;
    const t = EVOLVE_S - view.evolving;
    view.spin = (view.spin ?? 0) + dt * (4 + t * 10);
    if (Math.floor(t * 10) !== Math.floor((t - dt) * 10)) this.hooks.sparks.burst(g.body.x, g.body.y + 1, g.body.z, 0x9ff0ff, 4, 0.8);
    // À mi-chemin : éclair et nouveau modèle.
    if (before > EVOLVE_S / 2 && view.evolving <= EVOLVE_S / 2) {
      view.model.root.removeFromParent();
      view.model = new CubeModel(golemModel(g.data.species, g.data.stage), golemScale(g.data.stage));
      this.group.add(view.model.root);
      view.stage = g.data.stage;
      this.hooks.sparks.burst(g.body.x, g.body.y + 1.2, g.body.z, 0xfff3a0, 40, 1.8);
    }
    if (view.evolving <= 0) {
      view.evolving = undefined;
      view.spin = 0;
    }
  }

  private addView<T>(views: Map<T, CreatureView>, agent: T, id: ModelId): void {
    const model = new CubeModel(MODELS[id]);
    this.group.add(model.root);
    views.set(agent, { model, phase: Math.random() * 6 });
  }

  protected spawnStatic(id: ModelId, x: number, z: number, facing: number, scale = 1): CubeModel {
    const model = new CubeModel(MODELS[id], scale);
    model.root.position.set(x, this.layout.world.standY(Math.floor(x), Math.floor(z)), z);
    model.root.rotation.y = facing;
    this.group.add(model.root);
    this.statics.push(model);
    return model;
  }

  private refreshLanterns(): void {
    for (const l of this.lanterns) {
      const lit = this.state.litLanterns.includes(l.id);
      l.lit.root.visible = lit;
      l.unlit.root.visible = !lit;
    }
    // Les lanternes ne passent pas par le tri de distance (quelques objets, toujours utiles comme repères).
    for (const l of this.lanterns) {
      const i1 = this.statics.indexOf(l.lit);
      if (i1 >= 0) this.statics.splice(i1, 1);
      const i2 = this.statics.indexOf(l.unlit);
      if (i2 >= 0) this.statics.splice(i2, 1);
    }
  }

  private placeCrate(c: Crate): void {
    if (c.broken) this.tmpM.makeScale(0, 0, 0);
    else this.tmpM.makeTranslation(c.x, c.y + 0.4, c.z);
    this.crateMesh.setMatrixAt(c.index, this.tmpM);
  }

  /** Libère ce biome (changement de biome : un seul en mémoire). */
  dispose(): void {
    this.group.removeFromParent();
    this.crateGeo.dispose();
    this.crateMat.dispose();
    this.shadows.geometry.dispose();
    (this.shadows.material as THREE.Material).dispose();
  }

  /** Résumé pour les tests de bout en bout. */
  snapshot(): {
    biome: string;
    monsters: { id: string; species: string; mode: string; hp: number; x: number; z: number }[];
    golems: { id: string; hp: number; ko: boolean; x: number; z: number }[];
    crates: { id: string; broken: boolean; x: number; z: number }[];
    chests: { campId: string; opened: boolean; x: number; z: number }[];
    npcs: { id: string; x: number; z: number }[];
    arch: { x: number; z: number; open: boolean };
  } {
    return {
      biome: this.layout.id,
      monsters: this.sim.monsters.map((m) => ({ id: m.id, species: m.species, mode: m.mode, hp: m.hp, x: m.body.x, z: m.body.z })),
      golems: this.sim.golems.map((g) => ({ id: g.data.id, hp: g.data.hp, ko: g.ko, x: g.body.x, z: g.body.z })),
      crates: this.crates.map((c) => ({ id: c.id, broken: c.broken, x: c.x, z: c.z })),
      chests: this.chests.map((c) => ({ campId: c.campId, opened: c.opened, x: c.x, z: c.z })),
      npcs: this.npcs.map((n) => ({ id: n.id, x: n.x, z: n.z })),
      arch: { x: this.layout.arch.x, z: this.layout.arch.z, open: this.arch.part('portal')?.visible ?? false },
    };
  }
}

function animateMonster(m: MonsterAgent, view: CreatureView): void {
  const model = view.model;
  if (m.species === 'slime' || m.species === 'hopper') {
    const hop = Math.abs(Math.sin(view.phase * 1.4));
    const body = model.part('body');
    if (body) {
      body.position.y = hop * (m.speed > 0.2 ? 0.45 : 0.12);
      body.scale.set(1 + (1 - hop) * 0.12, 1 - (1 - hop) * 0.15, 1 + (1 - hop) * 0.12);
    }
  } else if (m.species === 'vulture') {
    const flap = Math.sin(view.phase * 3) * 0.5;
    model.swing('wingL', flap, 'z');
    model.swing('wingR', -flap, 'z');
    const body = model.part('body');
    if (body) body.position.y = 0.6 + Math.sin(view.phase) * 0.15;
  } else if (m.species === 'spider' || m.species === 'scorpion') {
    const s = Math.sin(view.phase * 2) * (m.speed > 0.2 ? 0.35 : 0.08);
    model.swing('legsL', s, 'z');
    model.swing('legsR', -s, 'z');
  } else {
    animateWalk(model, view.phase, m.speed > 0.2 ? 1 : 0.15);
  }
}

/** Plaque une tuile de l'atlas sur les 6 faces d'une boîte. */
function mapBoxToTile(geo: THREE.BufferGeometry, tile: number): void {
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  const tx = tile % ATLAS_COLS;
  const ty = Math.floor(tile / ATLAS_COLS);
  for (let i = 0; i < uv.count; i++) {
    const u = (tx + uv.getX(i)) / ATLAS_COLS;
    const v = 1 - (ty + 1 - uv.getY(i)) / ATLAS_ROWS;
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
}
