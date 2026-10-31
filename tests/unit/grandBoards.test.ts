import { describe, expect, it } from 'vitest';
import { CanalPuzzle, flow, GRAND_CANAL_ROW, grandGrid } from '../../src/quests/canals';
import { GRAND_SLIDE_ROOM, SlidePuzzle, solveSlide } from '../../src/quests/frostPuzzles';
import { createStarTrial, pendingBoard, STARS_PER_BOARD } from '../../src/quests/starTrial';
import { DIRS, GRAND_MIRROR_ROOM, traceRay, type Dir } from '../../src/quests/templePuzzles';

describe('grandes énigmes de l’Épreuve des Étoiles', () => {
  it('le grand canal : fermé au départ, résolu quand chaque morceau du chemin est à sa place', () => {
    expect(new CanalPuzzle(() => grandGrid(), GRAND_CANAL_ROW, GRAND_CANAL_ROW).solved).toBe(false);
    const { arrived, wet } = flow(grandGrid(true), GRAND_CANAL_ROW, GRAND_CANAL_ROW);
    expect(arrived).toBe(true);
    expect(wet.length).toBe(11);
  });

  it('les trois miroirs : au moins 4 quarts de tour, dont les trois miroirs', () => {
    const starts = GRAND_MIRROR_ROOM.mirrors.map((m) => DIRS.indexOf(m.start));
    let best = Infinity;
    for (const a of DIRS) for (const b of DIRS) for (const c of DIRS) {
      const facing: Dir[] = [a, b, c];
      if (!traceRay(facing, GRAND_MIRROR_ROOM).lit) continue;
      const turns = facing.reduce((n, d, i) => n + ((DIRS.indexOf(d) - starts[i] + 4) % 4), 0);
      best = Math.min(best, turns);
    }
    expect(best).toBeGreaterThanOrEqual(4);
    expect(best).toBeLessThan(Infinity);
    expect(traceRay(GRAND_MIRROR_ROOM.mirrors.map((m) => m.start), GRAND_MIRROR_ROOM).lit).toBe(false);
  });

  it('la grande glissade demande 8 glissades, et rejouer la solution fait sortir', () => {
    const path = solveSlide(GRAND_SLIDE_ROOM.start, GRAND_SLIDE_ROOM)!;
    expect(path).toHaveLength(8);
    const p = new SlidePuzzle(GRAND_SLIDE_ROOM);
    for (const d of path) p.move(d);
    expect(p.out).toBe(true);
  });

  it('une grande énigme toutes les 4 étoiles ; les anciennes parties ne sont pas bloquées', () => {
    const t = createStarTrial();
    expect(pendingBoard(t)).toBeNull();
    t.lit = STARS_PER_BOARD;
    expect(pendingBoard(t)).toBe('canals');
    t.boards = 1;
    expect(pendingBoard(t)).toBeNull();
    t.lit = STARS_PER_BOARD * 2;
    expect(pendingBoard(t)).toBe('mirrors');
    t.lit = STARS_PER_BOARD * 3;
    t.boards = 2;
    expect(pendingBoard(t)).toBe('slide');
    expect(pendingBoard({ lit: 8 })).toBeNull();
  });
});
