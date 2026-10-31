import type { Piece, Side } from '../quests/canals';
import { CanalPuzzle, flow, openings } from '../quests/canals';
import type { IceMemory, GearSize, GearSlot, SlidePuzzle, Spin } from '../quests/frostPuzzles';
import { CRANK_SPIN, GEAR_PIECES, GEAR_SLOTS, gearTrain, MILL_ARROW, type GearResult, type SlideRoom } from '../quests/frostPuzzles';
import type { Balance } from '../quests/skyPuzzles';
import { BALANCE_LEFT, BALANCE_WEIGHTS } from '../quests/skyPuzzles';
import type { TilePuzzle } from '../quests/sanctuary';
import type { Dir, MirrorPuzzle, MirrorRoom, PushPuzzle } from '../quests/templePuzzles';
import { PUSH_ROOM, SYMBOL_WALLS, traceRay } from '../quests/templePuzzles';
import { frenchTypography } from '../core/text';
import { el } from './dom';
import { uiIcon } from './icons';

/** Textes nouveaux (à valider par le parent). */
const TEXT_RESTART = 'Recommencer';
const TEXT_BACK = 'Retour';
const TEXT_REPLAY = 'Revoir l’ordre';
const TEXT_CRANK = 'Tourner la manivelle';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Le temps de voir la réussite avant de fermer le plateau. */
const SOLVED_PAUSE_MS = 900;
const MEMORY_STEP_MS = 750;
const ANGLE: Record<Dir, number> = { E: 0, S: 90, W: 180, N: 270 };

export interface BoardApi {
  /** Message sous la consigne : effet du dernier essai. */
  say: (text: string) => void;
  /** Aide de Lumibloc, affichée jusqu'à la fin du plateau. */
  hint: (text: string) => void;
  /** Énigme résolue : le plateau se ferme après un instant. */
  win: () => void;
  get finished(): boolean;
}

export interface BoardSpec {
  id: string;
  title: string;
  help: string;
  timeScale: number;
  /** Bouton « Recommencer » (absent si l'énigme n'en a pas besoin). */
  restart?: () => void;
  build: (api: BoardApi) => { board: HTMLElement; side?: HTMLElement[] };
}

/**
 * Cadre commun des énigmes en 2D, vues de dessus : ni caméra ni golem ne gênent. Résout true quand
 * l'énigme est résolue, false si l'on revient au sanctuaire pour reprendre plus tard.
 */
export function openBoard(layer: HTMLElement, spec: BoardSpec): Promise<boolean> {
  return new Promise((resolve) => {
    let finished = false;
    const message = el('p', { className: 'board-message', testId: `${spec.id}-message` });
    const hint = el('p', { className: 'board-hint hidden', testId: `${spec.id}-hint` });
    const finish = (value: boolean): void => {
      root.remove();
      resolve(value);
    };
    const api: BoardApi = {
      say: (text) => (message.textContent = frenchTypography(text)),
      hint: (text) => {
        hint.textContent = frenchTypography(text);
        hint.classList.remove('hidden');
      },
      win: () => {
        finished = true;
        setTimeout(() => finish(true), SOLVED_PAUSE_MS * spec.timeScale);
      },
      get finished() {
        return finished;
      },
    };
    const { board, side = [] } = spec.build(api);
    const buttons: HTMLElement[] = [];
    if (spec.restart) {
      const restart = el('button', { className: 'btn-big btn-secondary', text: TEXT_RESTART, testId: `${spec.id}-restart` });
      restart.type = 'button';
      restart.addEventListener('click', () => {
        if (finished) return;
        message.textContent = '';
        spec.restart?.();
      });
      buttons.push(restart);
    }
    const back = el('button', { className: 'btn-big btn-secondary', text: TEXT_BACK, testId: `${spec.id}-back` });
    back.type = 'button';
    back.addEventListener('click', () => {
      if (!finished) finish(false);
    });
    buttons.push(back);
    const panel = el('div', { className: 'board-side' }, [
      el('h2', { className: 'card-title', text: frenchTypography(spec.title) }),
      el('p', { className: 'board-help', text: frenchTypography(spec.help) }),
      ...side,
      message,
      hint,
      ...buttons,
    ]);
    const root = el('div', { className: 'screen screen-question', testId: `${spec.id}-board` }, [el('div', { className: 'card board-card' }, [board, panel])]);
    layer.appendChild(root);
  });
}

/** Grille carrée de cases ; les pièces y sont posées en position absolue. */
function grid(size: number): { node: HTMLElement; place: <T extends HTMLElement>(child: T, x: number, y: number) => T } {
  const node = el('div', { className: 'board-grid' });
  node.style.setProperty('--cells', String(size));
  for (let i = 0; i < size * size; i++) node.appendChild(el('span', { className: 'board-cell' }));
  const unit = 100 / size;
  return {
    node,
    place: (child, x, y) => {
      child.style.left = `${x * unit}%`;
      child.style.top = `${y * unit}%`;
      node.appendChild(child);
      return child;
    },
  };
}

/** Croix de quatre flèches, pour pousser ou glisser. */
function dpad(onMove: (dir: Dir) => void): HTMLElement {
  const pad = el('div', { className: 'board-dpad' });
  for (const dir of ['N', 'W', 'E', 'S'] as const) {
    const arrow = uiIcon('next');
    arrow.style.transform = `rotate(${ANGLE[dir]}deg)`;
    const b = el('button', { className: `dpad-btn dpad-${dir}`, aria: dir, testId: `dpad-${dir}` }, [arrow]);
    b.type = 'button';
    b.addEventListener('click', () => onMove(dir));
    pad.appendChild(b);
  }
  return pad;
}

// ---------- Dalles et leviers : toucher dans le bon ordre ----------

export interface OrderItem<T extends string> {
  id: T;
  label: string;
  color?: string;
}

export interface OrderBoardOptions<T extends string> {
  id: string;
  title: string;
  help: string;
  timeScale: number;
  items: readonly OrderItem<T>[];
  /** Rappel de l'ordre : la fresque, ou l'inscription. */
  clue: HTMLElement;
  puzzle: TilePuzzle<T>;
  wrongText: string;
  /** Aide à montrer après une erreur, s'il est temps. */
  hintAfterWrong: () => string | null;
  onStep: (item: T, result: 'progress' | 'wrong' | 'done') => void;
  onReset: () => void;
}

export function openOrderBoard<T extends string>(layer: HTMLElement, o: OrderBoardOptions<T>): Promise<boolean> {
  const tiles = new Map<T, HTMLElement>();
  const render = (): void => {
    for (const [id, node] of tiles) node.classList.toggle('lit', o.puzzle.lit.includes(id));
  };
  return openBoard(layer, {
    id: o.id,
    title: o.title,
    help: o.help,
    timeScale: o.timeScale,
    restart: () => {
      o.puzzle.reset();
      o.onReset();
      render();
    },
    build: (api) => {
      const row = el('div', { className: 'order-tiles' });
      for (const item of o.items) {
        const b = el('button', { className: 'order-tile', text: item.label, testId: `${o.id}-${item.id}` });
        b.type = 'button';
        if (item.color) b.style.background = item.color;
        b.addEventListener('click', () => {
          if (api.finished) return;
          const res = o.puzzle.step(item.id);
          if (res === 'ignored') return;
          o.onStep(item.id, res);
          render();
          api.say(res === 'wrong' ? o.wrongText : '');
          const hint = res === 'wrong' ? o.hintAfterWrong() : null;
          if (hint) api.hint(hint);
          if (res === 'done') api.win();
        });
        tiles.set(item.id, b);
        row.appendChild(b);
      }
      return { board: el('div', { className: 'order-board' }, [o.clue, row]) };
    },
  });
}

// ---------- Canaux d'eau ----------

const SIDE_POINT: Record<Side, [number, number]> = { N: [50, 0], E: [100, 50], S: [50, 100], W: [0, 50] };

function pieceSvg(piece: Piece, wet: boolean): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  const [a, b] = openings(piece).map((s) => SIDE_POINT[s]);
  const d = `M${a[0]} ${a[1]} L50 50 L${b[0]} ${b[1]}`;
  for (const [cls, width] of [['canal-wood', 42], [wet ? 'canal-water' : 'canal-dry', 22]] as const) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', cls);
    path.setAttribute('stroke-width', String(width));
    svg.appendChild(path);
  }
  return svg;
}

export interface CanalBoardOptions {
  puzzle: CanalPuzzle;
  title: string;
  help: string;
  hint: string;
  hintAfter: number;
  timeScale: number;
  onTurn: () => void;
}

export function openCanalBoard(layer: HTMLElement, o: CanalBoardOptions): Promise<boolean> {
  const { puzzle } = o;
  const cols = puzzle.grid[0].length;
  const rows = puzzle.grid.length;
  const cells: HTMLElement[][] = [];
  const render = (): void => {
    const { wet } = flow(puzzle.grid, puzzle.inRow, puzzle.outRow);
    puzzle.grid.forEach((line, y) =>
      line.forEach((p, x) => {
        cells[y][x].replaceChildren(pieceSvg(p, wet.some(([wx, wy]) => wx === x && wy === y)));
      }),
    );
  };
  let turns = 0;
  return openBoard(layer, {
    id: 'canal',
    title: o.title,
    help: o.help,
    timeScale: o.timeScale,
    restart: () => {
      puzzle.reset();
      o.onTurn();
      render();
    },
    build: (api) => {
      const board = el('div', { className: 'canal-grid' });
      board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      board.style.aspectRatio = `${cols} / ${rows}`;
      board.style.setProperty('--rows', String(rows));
      board.style.setProperty('--cols', String(cols));
      for (let y = 0; y < rows; y++) {
        cells.push([]);
        for (let x = 0; x < cols; x++) {
          const b = el('button', { className: 'canal-piece', aria: `Tourner le morceau ${x + 1}, ${y + 1}`, testId: `canal-${x}-${y}` });
          b.type = 'button';
          b.addEventListener('click', () => {
            if (api.finished) return;
            const solved = puzzle.rotate(x, y);
            o.onTurn();
            render();
            if (++turns >= o.hintAfter) api.hint(o.hint);
            if (solved) api.win();
          });
          cells[y].push(b);
          board.appendChild(b);
        }
      }
      render();
      const wrap = el('div', { className: 'canal-wrap' }, [
        el('span', { className: 'canal-end', text: '💧' }),
        board,
        el('span', { className: 'canal-end', text: '🎡' }),
      ]);
      wrap.style.setProperty('--in', String((puzzle.inRow + 0.5) / rows));
      return { board: wrap };
    },
  });
}

// ---------- Miroirs ----------

export interface MirrorBoardOptions {
  puzzle: MirrorPuzzle;
  title: string;
  help: string;
  hint: string;
  hintAfter: number;
  onChange: () => void;
  onTurn: () => void;
  timeScale: number;
}

/** Points du rayon dans le dessin : il entre par la fente et s'arrête au mur s'il sort de la salle. */
function rayPoints(facing: readonly Dir[], room: MirrorRoom): string {
  const cell = 100 / room.size;
  const { path, lit } = traceRay(facing, room);
  const points = path.map(([x, y]) => [x * cell + cell / 2, y * cell + cell / 2]);
  points.unshift([0, room.entryRow * cell + cell / 2]);
  if (!lit && path.length >= 2) {
    const [ax, ay] = path[path.length - 2];
    const [bx, by] = path[path.length - 1];
    const last = points[points.length - 1];
    points.push([last[0] + (bx - ax) * (cell / 2), last[1] + (by - ay) * (cell / 2)]);
  }
  return points.map((p) => p.join(',')).join(' ');
}

export function openMirrorBoard(layer: HTMLElement, o: MirrorBoardOptions): Promise<boolean> {
  const { puzzle } = o;
  const { room } = puzzle;
  const arrows: HTMLElement[] = [];
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'mirror-ray');
  svg.setAttribute('aria-hidden', 'true');
  const glow = document.createElementNS(SVG_NS, 'polyline');
  glow.setAttribute('class', 'mirror-ray-glow');
  const ray = document.createElementNS(SVG_NS, 'polyline');
  ray.setAttribute('class', 'mirror-ray-core');
  svg.append(glow, ray);
  const crystal = el('span', { className: 'board-token mirror-crystal', text: '💎', testId: 'mirror-crystal' });
  const render = (): void => {
    const points = rayPoints(puzzle.facing, room);
    glow.setAttribute('points', points);
    ray.setAttribute('points', points);
    puzzle.facing.forEach((d, i) => (arrows[i].style.transform = `rotate(${ANGLE[d]}deg)`));
    crystal.classList.toggle('lit', puzzle.solved);
  };
  let turns = 0;
  return openBoard(layer, {
    id: 'mirror',
    title: o.title,
    help: o.help,
    timeScale: o.timeScale,
    restart: () => {
      puzzle.reset();
      o.onChange();
      render();
    },
    build: (api) => {
      const { node, place } = grid(room.size);
      node.appendChild(svg);
      place(el('span', { className: 'board-token mirror-slit', text: '☀️' }), 0, room.entryRow);
      place(crystal, ...room.crystal);
      room.mirrors.forEach((m, i) => {
        const arrow = uiIcon('next');
        arrows.push(arrow);
        const b = el('button', { className: 'board-token mirror-piece', aria: `Tourner le miroir ${i + 1}`, testId: `mirror-${i}` }, [arrow]);
        b.type = 'button';
        place(b, m.x, m.y);
        b.addEventListener('click', () => {
          if (api.finished) return;
          const solved = puzzle.rotate(i);
          o.onTurn();
          o.onChange();
          render();
          if (++turns >= o.hintAfter) api.hint(o.hint);
          if (solved) api.win();
        });
      });
      render();
      return { board: node };
    },
  });
}

// ---------- Bloc de grès ----------

export interface PushBoardOptions {
  puzzle: PushPuzzle;
  title: string;
  help: string;
  hint: string;
  hintAfter: number;
  stuckText: string;
  timeScale: number;
  onChange: () => void;
  onPush: (moved: boolean) => void;
}

export function openPushBoard(layer: HTMLElement, o: PushBoardOptions): Promise<boolean> {
  const { puzzle } = o;
  const unit = 100 / PUSH_ROOM.size;
  const block = el('span', { className: 'board-token push-block', testId: 'push-block' });
  const render = (): void => {
    block.style.left = `${puzzle.block[0] * unit}%`;
    block.style.top = `${puzzle.block[1] * unit}%`;
  };
  let tries = 0;
  return openBoard(layer, {
    id: 'push',
    title: o.title,
    help: o.help,
    timeScale: o.timeScale,
    restart: () => {
      puzzle.reset();
      o.onChange();
      render();
    },
    build: (api) => {
      const { node, place } = grid(PUSH_ROOM.size);
      place(el('span', { className: 'board-token push-plate' }), ...PUSH_ROOM.plate);
      place(el('span', { className: 'board-token push-column' }), ...PUSH_ROOM.column);
      node.appendChild(block);
      render();
      const pad = dpad((dir) => {
        if (api.finished) return;
        const moved = puzzle.push(dir);
        o.onPush(moved);
        o.onChange();
        render();
        api.say(moved ? '' : o.stuckText);
        if (++tries >= o.hintAfter) api.hint(o.hint);
        if (puzzle.solved) api.win();
      });
      return { board: node, side: [pad] };
    },
  });
}

// ---------- Dalles-symboles ----------

export interface SymbolBoardOptions {
  title: string;
  help: string;
  timeScale: number;
  wall: number;
  wrongText: string;
  rightText: string;
  onRight: (wall: number) => void;
  onWrong: () => void;
}

export function openSymbolBoard(layer: HTMLElement, o: SymbolBoardOptions): Promise<boolean> {
  let wall = o.wall;
  return openBoard(layer, {
    id: 'symbol',
    title: o.title,
    help: o.help,
    timeScale: o.timeScale,
    build: (api) => {
      const sequence = el('p', { className: 'symbol-sequence', testId: 'symbol-sequence' });
      const row = el('div', { className: 'order-tiles' });
      const render = (): void => {
        const w = SYMBOL_WALLS[wall];
        if (!w) return;
        sequence.textContent = w.sequence;
        row.replaceChildren(
          ...w.tiles.map((label, i) => {
            const b = el('button', { className: 'order-tile', text: label, testId: `symbol-${i}` });
            b.type = 'button';
            b.addEventListener('click', () => {
              if (api.finished) return;
              if (label !== SYMBOL_WALLS[wall].answer) {
                o.onWrong();
                api.say(o.wrongText);
                return;
              }
              o.onRight(wall);
              wall++;
              if (wall >= SYMBOL_WALLS.length) api.win();
              else {
                api.say(o.rightText);
                render();
              }
            });
            return b;
          }),
        );
      };
      render();
      return { board: el('div', { className: 'order-board' }, [sequence, row]) };
    },
  });
}

// ---------- Glissade ----------

export interface SlideBoardOptions {
  puzzle: SlidePuzzle;
  title: string;
  help: string;
  /** Première glissade montrée en aide (absente dans l'Épreuve des Étoiles). */
  firstMove?: string;
  timeScale: number;
  onSlide: () => void;
}

export function openSlideBoard(layer: HTMLElement, o: SlideBoardOptions): Promise<boolean> {
  const { puzzle } = o;
  const room: SlideRoom = puzzle.room;
  const unit = 100 / room.size;
  const hero = el('span', { className: 'board-token slide-hero', text: '🧒', testId: 'slide-hero' });
  const render = (): void => {
    hero.style.left = `${puzzle.pos[0] * unit}%`;
    hero.style.top = `${puzzle.pos[1] * unit}%`;
  };
  return openBoard(layer, {
    id: 'slide',
    title: o.title,
    help: o.help,
    timeScale: o.timeScale,
    restart: () => {
      puzzle.reset();
      render();
    },
    build: (api) => {
      const { node, place } = grid(room.size);
      for (const [x, y] of room.rocks) place(el('span', { className: 'board-token slide-rock' }), x, y);
      place(el('span', { className: 'board-token slide-exit', text: '🚪' }), room.exit, 0);
      node.appendChild(hero);
      render();
      if (o.firstMove) api.say(o.firstMove);
      const pad = dpad((dir) => {
        if (api.finished) return;
        const to = puzzle.move(dir);
        o.onSlide();
        api.say('');
        if (to === 'exit') {
          hero.style.top = `-${unit}%`;
          api.win();
        } else render();
      });
      return { board: node, side: [pad] };
    },
  });
}

// ---------- Mémoire de glace ----------

const MEMORY_COLORS = ['#4f8fe6', '#5ac45e', '#e87fb8', '#f2c43c'];

export interface MemoryBoardOptions {
  puzzle: IceMemory;
  title: string;
  help: string;
  timeScale: number;
  watchText: string;
  goText: string;
  wrongText: string;
  easierText: string;
  easyAfter: number;
  onPress: (tile: number, result: 'ok' | 'wrong' | 'done') => void;
}

export function openMemoryBoard(layer: HTMLElement, o: MemoryBoardOptions): Promise<boolean> {
  const { puzzle } = o;
  const tiles: HTMLButtonElement[] = [];
  let timers: number[] = [];
  const stepMs = MEMORY_STEP_MS * o.timeScale;
  return openBoard(layer, {
    id: 'memory',
    title: o.title,
    help: o.help,
    timeScale: o.timeScale,
    build: (api) => {
      const flash = (i: number, ms: number): void => {
        tiles[i].classList.add('lit');
        timers.push(window.setTimeout(() => tiles[i].classList.remove('lit'), ms));
      };
      const play = (): void => {
        timers.forEach(clearTimeout);
        timers = [];
        puzzle.input = [];
        tiles.forEach((t) => (t.disabled = true));
        api.say(o.watchText);
        puzzle.sequence.forEach((tile, i) => timers.push(window.setTimeout(() => flash(tile, stepMs * 0.7), stepMs * (i + 0.5))));
        timers.push(
          window.setTimeout(() => {
            tiles.forEach((t) => (t.disabled = false));
            api.say(o.goText);
          }, stepMs * (puzzle.sequence.length + 0.5)),
        );
      };
      const row = el('div', { className: 'memory-tiles' });
      MEMORY_COLORS.forEach((color, i) => {
        const b = el('button', { className: 'memory-tile', aria: `Dalle ${i + 1}`, testId: `memory-${i}` });
        b.type = 'button';
        b.style.setProperty('--tile', color);
        b.addEventListener('click', () => {
          if (api.finished) return;
          const res = puzzle.press(i);
          o.onPress(i, res);
          flash(i, 300);
          if (res === 'wrong') {
            api.say(puzzle.failures === o.easyAfter ? o.easierText : o.wrongText);
            timers.push(window.setTimeout(play, stepMs));
          } else if (res === 'done') {
            tiles.forEach((t) => t.classList.add('lit'));
            api.win();
          }
        });
        tiles.push(b);
        row.appendChild(b);
      });
      const replay = el('button', { className: 'btn-big', text: TEXT_REPLAY, testId: 'memory-replay' });
      replay.type = 'button';
      replay.addEventListener('click', () => {
        if (!api.finished) play();
      });
      play();
      return { board: row, side: [replay] };
    },
  });
}

// ---------- Moulin gelé ----------

export interface MillBoardOptions {
  title: string;
  help: string;
  hint: string;
  hintAfter: number;
  timeScale: number;
  gapText: string;
  jamText: string;
  wrongText: string;
  onCrank: () => void;
  onPlaced: (placed: Partial<Record<GearSlot, GearSize>>) => void;
}

const SPIN_ICON: Record<Spin, string> = { cw: '↻', ccw: '↺' };

export function openMillBoard(layer: HTMLElement, o: MillBoardOptions): Promise<boolean> {
  const placed: Partial<Record<GearSlot, GearSize>> = {};
  const slots = new Map<GearSlot, HTMLButtonElement>();
  let tries = 0;
  const free = (size: GearSize): boolean => GEAR_PIECES.filter((g) => g === size).length > Object.values(placed).filter((g) => g === size).length;
  const render = (spins?: Partial<Record<GearSlot, Spin>>): void => {
    for (const [slot, node] of slots) {
      const size = placed[slot];
      node.className = `mill-slot mill-${slot} ${size ?? 'empty'} ${spins?.[slot] ?? ''}`;
      node.textContent = spins?.[slot] ? SPIN_ICON[spins[slot]] : size ? '⚙️' : '＋';
    }
  };
  return openBoard(layer, {
    id: 'mill',
    title: o.title,
    help: o.help,
    timeScale: o.timeScale,
    restart: () => {
      for (const s of GEAR_SLOTS) delete placed[s];
      o.onPlaced({});
      render();
    },
    build: (api) => {
      const board = el('div', { className: 'mill-board' });
      board.appendChild(el('span', { className: 'mill-end mill-crank-end', text: `⚙️ ${SPIN_ICON[CRANK_SPIN]}` }));
      for (const slot of GEAR_SLOTS) {
        const b = el('button', { className: 'mill-slot', aria: `Axe ${slot}`, testId: `mill-slot-${slot}` });
        b.type = 'button';
        b.addEventListener('click', () => {
          if (api.finished) return;
          // Un toucher passe à la roue suivante : petite, grande, puis rien.
          const now = placed[slot];
          delete placed[slot];
          if (!now && free('small')) placed[slot] = 'small';
          else if (now !== 'big' && free('big')) placed[slot] = 'big';
          o.onPlaced({ ...placed });
          render();
        });
        slots.set(slot, b);
        board.appendChild(b);
      }
      board.appendChild(el('span', { className: 'mill-end mill-goal', text: `🎡 ${SPIN_ICON[MILL_ARROW]}` }));
      render();
      const crank = el('button', { className: 'btn-big', text: TEXT_CRANK, testId: 'mill-crank' });
      crank.type = 'button';
      crank.addEventListener('click', () => {
        if (api.finished) return;
        o.onCrank();
        const r: GearResult = gearTrain(placed);
        if (r.kind === 'turns') {
          const spins: Partial<Record<GearSlot, Spin>> = {};
          r.chain.forEach((slot, i) => (spins[slot] = r.spins[i]));
          render(spins);
          if (r.right) {
            api.win();
            return;
          }
        } else render();
        api.say(r.kind === 'turns' ? o.wrongText : r.kind === 'gap' ? o.gapText : o.jamText);
        if (++tries >= o.hintAfter) api.hint(o.hint);
      });
      return { board, side: [crank] };
    },
  });
}

// ---------- Balance ----------

export interface BalanceBoardOptions {
  puzzle: Balance;
  title: string;
  help: string;
  hint: string;
  hintAfter: number;
  timeScale: number;
  lightText: string;
  heavyText: string;
  onToggle: () => void;
}

export function openBalanceBoard(layer: HTMLElement, o: BalanceBoardOptions): Promise<boolean> {
  const { puzzle } = o;
  const beam = el('div', { className: 'balance-beam' });
  const right = el('span', { className: 'balance-pan right', testId: 'balance-right' });
  const buttons: HTMLElement[] = [];
  const render = (): void => {
    beam.style.transform = `rotate(${puzzle.tilt}rad)`;
    right.textContent = String(puzzle.right);
    buttons.forEach((b, i) => b.classList.toggle('placed', puzzle.placed.has(i)));
  };
  let toggles = 0;
  return openBoard(layer, {
    id: 'balance',
    title: o.title,
    help: o.help,
    timeScale: o.timeScale,
    build: (api) => {
      beam.append(el('span', { className: 'balance-pan left', text: String(BALANCE_LEFT) }), right);
      const row = el('div', { className: 'order-tiles' });
      BALANCE_WEIGHTS.forEach((w, i) => {
        const b = el('button', { className: 'order-tile balance-weight', text: String(w), testId: `balance-weight-${i}` });
        b.type = 'button';
        b.addEventListener('click', () => {
          if (api.finished) return;
          puzzle.toggle(i);
          o.onToggle();
          render();
          if (puzzle.solved) {
            api.say('');
            api.win();
            return;
          }
          api.say(puzzle.diff < 0 ? o.lightText : o.heavyText);
          if (++toggles >= o.hintAfter) api.hint(o.hint);
        });
        buttons.push(b);
        row.appendChild(b);
      });
      render();
      return { board: el('div', { className: 'order-board' }, [el('div', { className: 'balance-stand' }, [beam]), row]) };
    },
  });
}
