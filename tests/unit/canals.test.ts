import { describe, expect, it } from 'vitest';
import { CANAL_COLS, CANAL_ROWS, CanalPuzzle, flow, openings, startGrid, type Piece } from '../../src/quests/canals';

/** Peut-on amener l'eau en exactement n rotations au plus ? (recherche en profondeur limitée) */
function solvableIn(grid: Piece[][], n: number): boolean {
  if (flow(grid).arrived) return true;
  if (n === 0) return false;
  for (let y = 0; y < CANAL_ROWS; y++)
    for (let x = 0; x < CANAL_COLS; x++) {
      grid[y][x].rot = (grid[y][x].rot + 1) % 4;
      const ok = solvableIn(grid, n - 1);
      grid[y][x].rot = (grid[y][x].rot + 3) % 4;
      if (ok) return true;
    }
  return false;
}

describe('énigme des canaux d’eau (S2)', () => {
  it('un coude tourne dans le sens des aiguilles d’une montre', () => {
    expect(openings({ kind: 'corner', rot: 0 })).toEqual(['N', 'E']);
    expect(openings({ kind: 'corner', rot: 1 })).toEqual(['E', 'S']);
    expect(openings({ kind: 'straight', rot: 1 })).toEqual(['N', 'S']);
  });

  it('au départ, l’eau ne va pas jusqu’à la roue', () => {
    expect(flow(startGrid()).arrived).toBe(false);
  });

  it('la solution demande de 4 à 6 rotations (pas moins)', () => {
    expect(solvableIn(startGrid(), 3)).toBe(false);
    expect(solvableIn(startGrid(), 6)).toBe(true);
  });

  it('en tournant les bons morceaux, l’eau arrive et l’énigme est résolue', () => {
    const p = new CanalPuzzle();
    for (const [x, y] of [[0, 1], [1, 1], [1, 0], [2, 0], [3, 0], [3, 1]]) p.rotate(x, y);
    expect(p.solved).toBe(true);
    expect(flow(p.grid).wet).toHaveLength(6);
    // Une fois l'eau arrivée, plus rien ne bouge, et « Recommencer » ne défait pas la solution.
    expect(p.rotate(0, 0)).toBe(false);
    p.reset();
    expect(p.solved).toBe(true);
  });
});
