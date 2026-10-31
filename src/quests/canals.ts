/**
 * Énigme d'ingénierie « les canaux d'eau » (CONTENU.md, S2, révision 1.6), sans rendu.
 * Une grille de 4 × 3 morceaux de rigole, droits ou coudés ; toucher un morceau le fait tourner
 * d'un quart de tour. L'eau entre à gauche (ligne du milieu) et doit sortir à droite, vers la roue.
 */

export type Side = 'N' | 'E' | 'S' | 'W';
export type PieceKind = 'straight' | 'corner';

export interface Piece {
  kind: PieceKind;
  /** Quarts de tour dans le sens des aiguilles d'une montre (0 à 3). */
  rot: number;
}

export const CANAL_COLS = 4;
export const CANAL_ROWS = 3;
/** L'eau entre par la gauche de cette ligne et doit sortir par la droite de celle-ci. */
export const CANAL_IN_ROW = 1;
export const CANAL_OUT_ROW = 1;

const ORDER: Side[] = ['N', 'E', 'S', 'W'];
const OPPOSITE: Record<Side, Side> = { N: 'S', S: 'N', E: 'W', W: 'E' };
const STEP: Record<Side, [number, number]> = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };

/** Côtés reliés par un morceau : droit = ouest-est au repos ; coude = nord-est au repos. */
export function openings(p: Piece): [Side, Side] {
  const base: [Side, Side] = p.kind === 'straight' ? ['W', 'E'] : ['N', 'E'];
  const turn = (s: Side): Side => ORDER[(ORDER.indexOf(s) + p.rot) % 4];
  return [turn(base[0]), turn(base[1])];
}

/**
 * Grille de départ (ligne par ligne, de haut en bas) : le chemin de la solution passe par
 * (0,1) → (1,1) → (1,0) → (2,0) → (3,0) → (3,1). Les autres morceaux sont des leurres.
 */
export function startGrid(): Piece[][] {
  const s = (rot: number): Piece => ({ kind: 'straight', rot });
  const c = (rot: number): Piece => ({ kind: 'corner', rot });
  return [
    [c(1), c(0), s(1), c(1)],
    [s(1), c(2), c(3), c(3)],
    [c(2), s(0), c(0), s(1)],
  ];
}

/** Grande grille de l'Épreuve des Étoiles (5 × 4) : le chemin de la solution, case par case. */
export const GRAND_CANAL_PATH: readonly [number, number][] = [[0, 1], [1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [3, 0], [4, 0], [4, 1]];
export const GRAND_CANAL_ROW = 1;

/** Morceau qui relie deux côtés. */
function pieceFor(a: Side, b: Side): Piece {
  const kind: PieceKind = OPPOSITE[a] === b ? 'straight' : 'corner';
  for (let rot = 0; rot < 4; rot++) {
    const [p, q] = openings({ kind, rot });
    if ((p === a && q === b) || (p === b && q === a)) return { kind, rot };
  }
  throw new Error(`Morceau impossible : ${a} ${b}`);
}

/** La grande grille : résolue, ou mélangée (chaque morceau du chemin à 1 à 3 quarts de tour de sa place). */
export function grandGrid(solved = false): Piece[][] {
  const side = (from: [number, number], to: [number, number]): Side => (to[0] > from[0] ? 'E' : to[0] < from[0] ? 'W' : to[1] > from[1] ? 'S' : 'N');
  const grid: Piece[][] = Array.from({ length: 4 }, (_, y) => Array.from({ length: 5 }, (_u, x) => ({ kind: (x + y) % 2 ? 'corner' : 'straight', rot: (x * 3 + y) % 4 }) as Piece));
  GRAND_CANAL_PATH.forEach((cell, i) => {
    const before: Side = i === 0 ? 'W' : side(cell, GRAND_CANAL_PATH[i - 1]);
    const after: Side = i === GRAND_CANAL_PATH.length - 1 ? 'E' : side(cell, GRAND_CANAL_PATH[i + 1]);
    const p = pieceFor(before, after);
    grid[cell[1]][cell[0]] = solved ? p : { ...p, rot: (p.rot + 1 + i % 3) % 4 };
  });
  return grid;
}

/** Trajet de l'eau : les cases mouillées, dans l'ordre ; arrived = l'eau sort vers la roue. */
export function flow(grid: Piece[][], inRow = CANAL_IN_ROW, outRow = CANAL_OUT_ROW): { wet: [number, number][]; arrived: boolean } {
  const rows = grid.length;
  const cols = grid[0].length;
  const wet: [number, number][] = [];
  let x = 0;
  let y = inRow;
  let from: Side = 'W';
  for (let guard = 0; guard < cols * rows + 1; guard++) {
    if (x < 0 || y < 0 || x >= cols || y >= rows) break;
    const [a, b] = openings(grid[y][x]);
    if (a !== from && b !== from) break;
    if (wet.some(([wx, wy]) => wx === x && wy === y)) break;
    wet.push([x, y]);
    const out: Side = a === from ? b : a;
    if (x === cols - 1 && y === outRow && out === 'E') return { wet, arrived: true };
    const [dx, dy] = STEP[out];
    x += dx;
    y += dy;
    from = OPPOSITE[out];
  }
  return { wet, arrived: false };
}

/** État de l'énigme : la grille, les rotations faites, résolue ou non. */
export class CanalPuzzle {
  grid: Piece[][];
  turns = 0;

  constructor(
    private readonly make: () => Piece[][] = startGrid,
    readonly inRow = CANAL_IN_ROW,
    readonly outRow = CANAL_OUT_ROW,
  ) {
    this.grid = make();
  }

  get solved(): boolean {
    return flow(this.grid, this.inRow, this.outRow).arrived;
  }

  /** Toucher un morceau : un quart de tour (rien une fois l'eau arrivée). */
  rotate(x: number, y: number): boolean {
    if (this.solved) return false;
    const p = this.grid[y][x];
    p.rot = (p.rot + 1) % 4;
    this.turns++;
    return this.solved;
  }

  /** Bouton « Recommencer » : la grille revient à son état de départ. */
  reset(): void {
    if (this.solved) return;
    this.grid = this.make();
  }
}
