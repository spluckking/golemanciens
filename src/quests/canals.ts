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

/** Trajet de l'eau : les cases mouillées, dans l'ordre ; arrived = l'eau sort vers la roue. */
export function flow(grid: Piece[][]): { wet: [number, number][]; arrived: boolean } {
  const wet: [number, number][] = [];
  let x = 0;
  let y = CANAL_IN_ROW;
  let from: Side = 'W';
  for (let guard = 0; guard < CANAL_COLS * CANAL_ROWS + 1; guard++) {
    if (x < 0 || y < 0 || x >= CANAL_COLS || y >= CANAL_ROWS) break;
    const [a, b] = openings(grid[y][x]);
    if (a !== from && b !== from) break;
    if (wet.some(([wx, wy]) => wx === x && wy === y)) break;
    wet.push([x, y]);
    const out: Side = a === from ? b : a;
    if (x === CANAL_COLS - 1 && y === CANAL_OUT_ROW && out === 'E') return { wet, arrived: true };
    const [dx, dy] = STEP[out];
    x += dx;
    y += dy;
    from = OPPOSITE[out];
  }
  return { wet, arrived: false };
}

/** État de l'énigme : la grille, les rotations faites, résolue ou non. */
export class CanalPuzzle {
  grid = startGrid();
  turns = 0;

  get solved(): boolean {
    return flow(this.grid).arrived;
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
    this.grid = startGrid();
  }
}
