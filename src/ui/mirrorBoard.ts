import type { Dir, MirrorPuzzle } from '../quests/templePuzzles';
import { MIRROR_ROOM, traceRay } from '../quests/templePuzzles';
import { el } from './dom';
import { uiIcon } from './icons';

/** Textes nouveaux (à valider par le parent). */
const TEXT_TITLE = 'Les miroirs du soleil';
const TEXT_HELP = 'Touche un miroir pour le faire tourner. Envoie le rayon sur le cristal !';
const TEXT_RESTART = 'Recommencer';
const TEXT_BACK = 'Retour';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Une case vaut 20 unités dans le dessin du rayon (grille de 5 × 5). */
const CELL = 100 / MIRROR_ROOM.size;
const ANGLE: Record<Dir, number> = { E: 0, S: 90, W: 180, N: 270 };
/** Le temps de voir le rayon toucher le cristal avant de fermer. */
const SOLVED_PAUSE_MS = 900;

export interface MirrorBoardOptions {
  puzzle: MirrorPuzzle;
  hint: string;
  hintAfter: number;
  /** Un miroir a tourné ou tout a été remis à zéro : le décor 3D suit. */
  onChange: () => void;
  onTurn: () => void;
  /** Le temps d'affichage de la réussite (raccourci en mode test). */
  timeScale: number;
}

/** Points du rayon dans le dessin : il entre par la fente et s'arrête au mur s'il sort de la salle. */
function rayPoints(facing: readonly Dir[]): string {
  const { path, lit } = traceRay(facing);
  const points = path.map(([x, y]) => [x * CELL + CELL / 2, y * CELL + CELL / 2]);
  points.unshift([0, MIRROR_ROOM.entryRow * CELL + CELL / 2]);
  if (!lit && path.length >= 2) {
    const [ax, ay] = path[path.length - 2];
    const [bx, by] = path[path.length - 1];
    const last = points[points.length - 1];
    points.push([last[0] + (bx - ax) * (CELL / 2), last[1] + (by - ay) * (CELL / 2)]);
  }
  return points.map((p) => p.join(',')).join(' ');
}

/**
 * Énigme des miroirs en plateau 2D, vue de dessus : ni caméra ni golem ne gênent. Résout true quand
 * le rayon touche le cristal, false si l'on revient au temple pour reprendre plus tard.
 */
export function openMirrorBoard(layer: HTMLElement, options: MirrorBoardOptions): Promise<boolean> {
  const { puzzle } = options;
  return new Promise((resolve) => {
    const board = el('div', { className: 'mirror-grid', testId: 'mirror-grid' });
    board.style.setProperty('--cells', String(MIRROR_ROOM.size));
    for (let i = 0; i < MIRROR_ROOM.size ** 2; i++) board.appendChild(el('span', { className: 'mirror-cell' }));

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'mirror-ray');
    svg.setAttribute('aria-hidden', 'true');
    const glow = document.createElementNS(SVG_NS, 'polyline');
    glow.setAttribute('class', 'mirror-ray-glow');
    const ray = document.createElementNS(SVG_NS, 'polyline');
    ray.setAttribute('class', 'mirror-ray-core');
    svg.append(glow, ray);
    board.appendChild(svg);

    const place = (node: HTMLElement, x: number, y: number): HTMLElement => {
      node.style.left = `${x * CELL}%`;
      node.style.top = `${y * CELL}%`;
      return node;
    };
    board.appendChild(place(el('span', { className: 'mirror-slit', text: '☀️' }), 0, MIRROR_ROOM.entryRow));
    const crystal = el('span', { className: 'mirror-crystal', text: '💎', testId: 'mirror-crystal' });
    board.appendChild(place(crystal, ...MIRROR_ROOM.crystal));

    const arrows: HTMLElement[] = [];
    const hint = el('p', { className: 'mirror-hint hidden', text: options.hint, testId: 'mirror-hint' });
    let turns = 0;
    let finished = false;

    const render = (): void => {
      const points = rayPoints(puzzle.facing);
      glow.setAttribute('points', points);
      ray.setAttribute('points', points);
      puzzle.facing.forEach((d, i) => (arrows[i].style.transform = `rotate(${ANGLE[d]}deg)`));
      crystal.classList.toggle('lit', puzzle.solved);
    };
    const finish = (value: boolean): void => {
      root.remove();
      resolve(value);
    };

    MIRROR_ROOM.mirrors.forEach((m, i) => {
      const arrow = uiIcon('next');
      arrows.push(arrow);
      const b = el('button', { className: 'mirror-piece', aria: `Tourner le miroir ${i + 1}`, testId: `mirror-${i}` }, [arrow]);
      b.type = 'button';
      place(b, m.x, m.y);
      b.addEventListener('click', () => {
        if (finished) return;
        const solved = puzzle.rotate(i);
        options.onTurn();
        options.onChange();
        render();
        if (++turns >= options.hintAfter) hint.classList.remove('hidden');
        if (solved) {
          finished = true;
          setTimeout(() => finish(true), SOLVED_PAUSE_MS * options.timeScale);
        }
      });
      board.appendChild(b);
    });

    const restart = el('button', { className: 'btn-big btn-secondary', text: TEXT_RESTART, testId: 'mirror-restart' });
    restart.type = 'button';
    restart.addEventListener('click', () => {
      puzzle.reset();
      options.onChange();
      render();
    });
    const back = el('button', { className: 'btn-big btn-secondary', text: TEXT_BACK, testId: 'mirror-back' });
    back.type = 'button';
    back.addEventListener('click', () => {
      if (!finished) finish(false);
    });
    const side = el('div', { className: 'board-side' }, [
      el('h2', { className: 'card-title', text: TEXT_TITLE }),
      el('p', { className: 'board-help', text: TEXT_HELP }),
      hint,
      restart,
      back,
    ]);
    const card = el('div', { className: 'card board-card' }, [board, side]);
    const root = el('div', { className: 'screen screen-question', testId: 'mirror-board' }, [card]);
    render();
    layer.appendChild(root);
  });
}
