import * as THREE from 'three';
import { LESSON_LINES, LessonQuiz, lessonQuiz } from '../combat/turn/lesson';
import { TurnCombat, arenaOpponents, bossMonster, healAfterCombat, questionCategory, type CombatEvent } from '../combat/turn/turnCombat';
import { ARENA_WINS_TO_FINISH, FOOD_ARENA_WIN, MONSTER_TURN_DELAY_S } from '../data/balance';
import { CONTENT } from '../data/content';
import { FOOD_BOSS, TEXT_BOSS_SPLITS, TEXT_BOSS_VICTORY, TEXT_LATER, TEXT_RETRY, TEXT_RETRY_QUESTION } from '../data/bossQuest';
import type { AttackInfo, AttackType, BossId } from '../data/creatures';
import { animateWalk, CubeModel } from '../entities/cubeModel';
import { MODELS, type ModelId } from '../entities/models';
import type { Sparks } from '../entities/sparks';
import { generateCalc } from '../questions/calc';
import { levelForAttack, recordAnswer } from '../questions/difficulty';
import { presentCalc, presentRiddle, type QuestionView } from '../questions/present';
import { drawRiddle } from '../questions/riddleBank';
import { CombatHud } from '../ui/combatHud';
import { askChoice, askQuestion, revealAnswer, showMessage } from '../ui/screens';
import type { FightStage } from '../world/structures';
import { markSeen, type GameState } from './gameState';
import { recordCalc, recordRiddle } from './stats';
import type { Rng } from './rng';

/** Textes nouveaux (à valider par le parent). */
const TEXT_SUPER = 'Super efficace !';
const TEXT_MONSTER_ATTACKS = '{monstre} attaque : {attaque} !';
const TEXT_DODGE = '{golem} esquive !';
const TEXT_SKIP_STUN = '{monstre} est étourdi.';
const TEXT_SKIP_SLEEP = '{monstre} dort.';
const TEXT_ARMOR = 'L’armure résiste !';
const TEXT_VICTORY = 'Victoire ! Tes golems ont gagné.';
const TEXT_VICTORY_BUTTON = 'Continuer';
const TEXT_ARENA_DONE = 'Bravo, {prenom} ! Tu as gagné les 3 combats de l’arène.';
const TEXT_DEFEAT_BUTTON = 'D’accord';

const TYPE_COLORS: Record<AttackType, number> = { rock: 0xa9abb8, plant: 0x6fae52, sun: 0xffc040, star: 0xfff3a0 };

export interface FightHost {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  uiLayer: HTMLElement;
  state: GameState;
  rng: Rng;
  sparks: Sparks;
  /** Lieu du combat : l'arène, ou le repaire du boss. */
  plan: FightStage;
  kind: 'arena' | 'boss';
  /** Boss affronté (combat de boss). */
  boss?: BossId;
  /** Mode test : raccourcit les attentes. */
  timeScale: number;
}

interface Tween {
  t: number;
  duration: number;
  apply: (k: number) => void;
  done: () => void;
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Un combat au tour par tour (SPEC.md § 7), à l'arène ou contre un boss : caméra de côté,
 * golem actif à gauche, adversaire à droite ; chaque attaque passe par une question.
 */
export class ArenaFight {
  private readonly group = new THREE.Group();
  private readonly golemModels = new Map<string, CubeModel>();
  private readonly monsterModels = new Map<string, CubeModel>();
  private readonly tweens: Tween[] = [];
  private readonly combat: TurnCombat;
  private readonly hud: CombatHud;
  private readonly floorY: number;
  /** Sens golem → adversaire sur l'axe X (+1 : l'adversaire est à l'est). */
  private readonly dir: number;
  private readonly monsterScale: number;
  /** Petits slimes qui apparaissent quand le Roi Slime se divise. */
  private readonly minis: CubeModel[] = [];
  private time = 0;

  constructor(private readonly host: FightHost) {
    const { state, plan, rng } = host;
    this.floorY = plan.floorY;
    this.dir = Math.sign(plan.monsterSpot.x - plan.golemSpot.x) || 1;
    this.monsterScale = host.kind === 'boss' ? 1 : 1.25;
    const fighters = state.golems.filter((g) => g.hp > 0).length > 0 ? state.golems : state.golems.map((g) => ({ ...g, hp: g.maxHp }));
    const monsters = host.kind === 'boss' && host.boss ? [bossMonster(host.boss)] : arenaOpponents(1, state.golems.length, rng);
    this.combat = new TurnCombat({ kind: host.kind, golems: fighters, monsters }, rng);
    for (const g of state.golems) {
      const m = new CubeModel(MODELS[g.species]);
      m.root.visible = false;
      this.golemModels.set(g.id, m);
      this.group.add(m.root);
    }
    for (const mon of this.combat.monsters) {
      const m = new CubeModel(MODELS[mon.model as ModelId], this.monsterScale);
      m.root.visible = false;
      this.monsterModels.set(mon.id, m);
      this.group.add(m.root);
    }
    host.scene.add(this.group);
    for (const mon of this.combat.monsters) markSeen(state, mon.model);
    this.hud = new CombatHud(host.uiLayer, state.playerName, state.arena.lessonDone);
    this.placeActive();
  }

  private get golemModel(): CubeModel {
    return this.golemModels.get(this.combat.golem.id)!;
  }

  private get monsterModel(): CubeModel {
    return this.monsterModels.get(this.combat.monster.id)!;
  }

  /** Seuls le golem actif et le monstre actif sont dans l'arène. */
  private placeActive(): void {
    const { golemSpot, monsterSpot } = this.host.plan;
    // Les deux combattants se font face.
    const toMonster = Math.atan2(-(monsterSpot.x - golemSpot.x), -(monsterSpot.z - golemSpot.z));
    for (const [id, m] of this.golemModels) {
      m.root.visible = id === this.combat.golem.id;
      m.root.scale.setScalar(1);
      m.root.position.set(golemSpot.x, this.floorY, golemSpot.z);
      m.root.rotation.set(0, toMonster, 0);
    }
    for (const [id, m] of this.monsterModels) {
      m.root.visible = id === this.combat.monster.id;
      m.root.scale.setScalar(this.monsterScale);
      m.root.position.set(monsterSpot.x, this.floorY, monsterSpot.z);
      m.root.rotation.set(0, toMonster + Math.PI, 0);
    }
    this.refreshHud();
  }

  private refreshHud(): void {
    const c = this.combat;
    this.hud.setMonster(c.monster, c.monsterStage, c.monsters.filter((m) => m.hp > 0).length, c.monsters.length);
    this.hud.setGolem(c.golem, c.golems.filter((g) => g.hp > 0).length, c.golems.length);
    this.hud.setSheet(c.golems, c.monsterStage, c.monster.name);
  }

  // ---------- Animations ----------

  private tween(duration: number, apply: (k: number) => void): Promise<void> {
    return new Promise((done) => this.tweens.push({ t: 0, duration, apply, done }));
  }

  /** Bond vers l'adversaire et retour. */
  private lunge(model: CubeModel, toward: number): Promise<void> {
    const x0 = model.root.position.x;
    return this.tween(0.5, (k) => {
      model.root.position.x = x0 + Math.sin(k * Math.PI) * 1.6 * toward;
    });
  }

  private shake(model: CubeModel): Promise<void> {
    const x0 = model.root.position.x;
    return this.tween(0.35, (k) => {
      model.root.position.x = x0 + Math.sin(k * 40) * 0.12 * (1 - k);
    });
  }

  private vanish(model: CubeModel, color: number): Promise<void> {
    const p = model.root.position;
    this.host.sparks.burst(p.x, p.y + 0.8, p.z, color, 26, 1.3);
    const s0 = model.root.scale.x;
    return this.tween(0.45, (k) => model.root.scale.setScalar(Math.max(0.001, s0 * (1 - k)))).then(() => {
      model.root.visible = false;
    });
  }

  private ms(seconds: number): number {
    return seconds * 1000 * this.host.timeScale;
  }

  // ---------- Questions ----------

  /** Question de l'attaque ; record() note la réponse dans les statistiques du menu parent. */
  private question(attack: AttackInfo): { view: QuestionView; category: 'calc' | 'riddle'; record: (correct: boolean) => void } {
    const { state, rng } = this.host;
    const category = questionCategory(attack);
    if (category === 'calc') {
      const q = generateCalc(levelForAttack('calc', state.levels.calc, attack.slot), rng);
      return { view: presentCalc(q, rng), category, record: (ok) => recordCalc(state.stats, q, ok) };
    }
    const r = drawRiddle(CONTENT.riddles, state.riddles, levelForAttack('riddle', state.levels.riddle, attack.slot), rng);
    return { view: presentRiddle(r, rng), category, record: (ok) => recordRiddle(state.stats, r.level, ok) };
  }

  /** Bulle de Lumibloc (section G de CONTENU.md) la première fois seulement. */
  private async tutorial(key: 'firstArena' | 'weakness' | 'combatMistake'): Promise<void> {
    const seen = this.host.state.tutorialsSeen;
    if (seen.includes(key)) return;
    seen.push(key);
    await this.hud.lumibloc(CONTENT.lumibloc[key]);
  }

  // ---------- Déroulé ----------

  /** Joue le combat jusqu'au bout, puis la victoire ou la défaite (et la leçon la première fois). */
  async run(): Promise<'won' | 'lost' | 'retry'> {
    const c = this.combat;
    const name = this.host.state.playerName;
    await wait(this.ms(0.6));
    await this.tutorial('firstArena');
    await this.tutorial('weakness');

    while (c.phase !== 'won' && c.phase !== 'lost') {
      this.refreshHud();
      if (c.phase === 'monster') {
        await wait(this.ms(MONSTER_TURN_DELAY_S));
        await this.play(c.monsterTurn());
        continue;
      }
      const choice = await this.hud.choose(c.availableAttacks(), c.monsterStage, c.benchGolems(), c.phase === 'switch');
      if (choice.kind === 'switch') {
        await this.play(c.switchTo(choice.golemId));
        continue;
      }
      const { view, category, record } = this.question(choice.attack);
      const chosen = await askQuestion(this.host.uiLayer, view, name);
      const correct = chosen === view.correctIndex;
      recordAnswer(category, this.host.state.levels[category], correct);
      record(correct);
      if (!correct) {
        await revealAnswer(this.host.uiLayer, view, chosen, name);
        await this.tutorial('combatMistake');
      }
      await this.play(c.attack(choice.attack.slot, correct));
    }
    this.refreshHud();
    const won = c.phase === 'won';
    await wait(this.ms(0.6));
    return this.finish(won);
  }

  private async finish(won: boolean): Promise<'won' | 'lost' | 'retry'> {
    const { state, uiLayer } = this.host;
    healAfterCombat(state.golems);
    if (this.host.kind === 'boss') return this.finishBoss(won);
    if (won) {
      state.food += FOOD_ARENA_WIN;
      state.arena.wins = Math.min(ARENA_WINS_TO_FINISH, state.arena.wins + 1);
      await showMessage(uiLayer, `${TEXT_VICTORY} +${FOOD_ARENA_WIN} 🍎`, TEXT_VICTORY_BUTTON, state.playerName, 'combat-victory');
      if (state.arena.wins === ARENA_WINS_TO_FINISH) await showMessage(uiLayer, TEXT_ARENA_DONE, TEXT_VICTORY_BUTTON, state.playerName, 'arena-done');
      return 'won';
    }
    await showMessage(uiLayer, CONTENT.lumibloc.defeat, TEXT_DEFEAT_BUTTON, state.playerName, 'combat-defeat');
    if (!state.arena.lessonDone) await this.lesson();
    return 'lost';
  }

  /** Boss vaincu : éclat, 🍎, trophée. Défaite : on peut réessayer tout de suite (SPEC § 7.1). */
  private async finishBoss(won: boolean): Promise<'won' | 'lost' | 'retry'> {
    const { state, uiLayer } = this.host;
    if (won) {
      state.bossQuest = 'defeated';
      state.food += FOOD_BOSS;
      state.shards = Math.max(state.shards, 1);
      if (this.host.boss && !state.trophies.includes(this.host.boss)) state.trophies.push(this.host.boss);
      await showMessage(uiLayer, `${TEXT_BOSS_VICTORY} +${FOOD_BOSS} 🍎`, TEXT_VICTORY_BUTTON, state.playerName, 'combat-victory');
      return 'won';
    }
    await showMessage(uiLayer, CONTENT.lumibloc.defeat, TEXT_DEFEAT_BUTTON, state.playerName, 'combat-defeat');
    if (!state.arena.lessonDone) await this.lesson();
    const again = await askChoice(uiLayer, TEXT_RETRY_QUESTION, [TEXT_RETRY, TEXT_LATER], state.playerName, 'boss-retry');
    return again === 0 ? 'retry' : 'lost';
  }

  /** Première défaite : Lumibloc explique les faiblesses, puis un quiz à réussir entièrement. */
  private async lesson(): Promise<void> {
    const { state, uiLayer, rng } = this.host;
    for (const line of LESSON_LINES) await this.hud.lumibloc(line);
    const quiz = new LessonQuiz(lessonQuiz(state.golems.map((g) => g.species), 1, rng));
    for (let q = quiz.current; q; q = quiz.current) {
      const view: QuestionView = { badge: 'riddle', prompt: q.prompt, choices: q.choices, correctIndex: q.answer, sourceIndex: [0, 1, 2], explanation: q.explanation };
      const chosen = await askQuestion(uiLayer, view, state.playerName);
      if (!quiz.answer(chosen)) await revealAnswer(uiLayer, view, chosen, state.playerName);
    }
    state.arena.lessonDone = true;
    this.hud.showSheetButton();
  }

  /** Anime les événements d'un tour, dans l'ordre. */
  private async play(events: CombatEvent[]): Promise<void> {
    const c = this.combat;
    const fill = (t: string): string => t.replace('{monstre}', c.monster.name).replace('{golem}', c.golem.name);
    for (const e of events) {
      switch (e.type) {
        case 'attack': {
          await this.lunge(this.golemModel, this.dir);
          if (e.hit) {
            const p = this.monsterModel.root.position;
            this.host.sparks.burst(p.x, p.y + 0.8, p.z, TYPE_COLORS[e.attack.type], 18, 1);
          }
          break;
        }
        case 'damage':
          if (e.target === 'monster') {
            if (e.armor) this.hud.announce(TEXT_ARMOR);
            else {
              this.hud.float('monster', `−${e.amount}`, e.superEffective ? 'super' : '');
              if (e.superEffective) this.hud.announce(TEXT_SUPER, 1.4, 'super');
            }
            this.refreshHud();
            await this.shake(this.monsterModel);
          } else {
            this.hud.float('golem', `−${e.amount}`);
            this.refreshHud();
            await this.shake(this.golemModel);
          }
          break;
        case 'monsterAttack':
          this.hud.announce(TEXT_MONSTER_ATTACKS.replace('{monstre}', c.monster.name).replace('{attaque}', e.attack));
          await this.lunge(this.monsterModel, -this.dir);
          if (!e.hit) this.hud.announce(fill(TEXT_DODGE));
          break;
        case 'skip':
          this.hud.announce(fill(e.reason === 'stun' ? TEXT_SKIP_STUN : TEXT_SKIP_SLEEP));
          await wait(this.ms(0.8));
          break;
        case 'ko':
          if (e.target === 'monster') await this.vanish(this.monsterModels.get(e.id)!, 0x9a8ad0);
          else await this.vanish(this.golemModels.get(e.id)!, 0xdddddd);
          break;
        case 'stage':
          this.placeActive();
          this.split();
          this.hud.announce(TEXT_BOSS_SPLITS, 1.8, 'super');
          await wait(this.ms(0.9));
          break;
        case 'nextMonster':
        case 'switch':
          this.placeActive();
          await wait(this.ms(0.4));
          break;
        default:
          break;
      }
    }
    this.refreshHud();
  }

  /** Étape 2 du Roi Slime : il rapetisse un peu et deux petits slimes jaillissent à ses côtés. */
  private split(): void {
    const model = this.monsterModel;
    const p = model.root.position;
    this.host.sparks.burst(p.x, p.y + 1, p.z, 0x5ec45e, 30, 1.4);
    model.root.scale.setScalar(this.monsterScale * 0.8);
    for (const side of [-1, 1]) {
      const mini = new CubeModel(MODELS.slime, 0.8);
      mini.root.position.set(p.x - this.dir * 0.6, this.floorY, p.z + side * 1.7);
      mini.root.rotation.y = model.root.rotation.y;
      this.group.add(mini.root);
      this.minis.push(mini);
    }
  }

  /** Appelée à chaque image : caméra de côté, petites animations d'attente. */
  update(dt: number): void {
    this.time += dt;
    const { center } = this.host.plan;
    const cam = this.host.camera;
    // De côté, à l'intérieur du muret : le golem à gauche, le monstre à droite.
    const view = this.host.plan.view;
    // Le boss est grand : la caméra recule et monte un peu.
    const far = this.host.kind === 'boss' ? 1.45 : 1;
    cam.position.set(center.x + 0.5, this.floorY + 2.6 * far, center.z + 5.6 * view * far);
    cam.lookAt(center.x + 0.5, this.floorY + 1.4, center.z - 0.5 * view);
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.duration);
      tw.apply(k);
      if (k >= 1) {
        this.tweens.splice(i, 1);
        tw.done();
      }
    }
    if (this.combat.phase !== 'won' && this.combat.phase !== 'lost') {
      animateWalk(this.golemModel, this.time * 2, 0.15);
      const body = this.monsterModel.part('body');
      if ((this.combat.monster.model === 'slime' || this.combat.monster.model === 'roiSlime') && body) body.position.y = Math.abs(Math.sin(this.time * 3)) * 0.12;
      this.minis.forEach((m, i) => (m.root.position.y = this.floorY + Math.abs(Math.sin(this.time * 4 + i)) * 0.3));
    }
    this.host.sparks.update(dt, () => false, () => false);
    this.hud.update(dt);
  }

  dispose(): void {
    this.group.removeFromParent();
    this.hud.dispose();
  }

  snapshot(): { phase: string; golem: { id: string; hp: number }; monster: { name: string; hp: number; weakness: string } } {
    const c = this.combat;
    return { phase: c.phase, golem: { id: c.golem.id, hp: c.golem.hp }, monster: { name: c.monster.name, hp: c.monster.hp, weakness: c.monsterStage.weakness } };
  }
}
