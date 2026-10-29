import { describe, expect, it } from 'vitest';
import { DIRS, MirrorPuzzle, MIRROR_ROOM, PushPuzzle, SYMBOL_WALLS, minPushes, traceRay, type Dir } from '../../src/quests/templePuzzles';

describe('bloc de grès (S3)', () => {
  it('solvable en 6 poussées au plus (parcours en largeur), et pas en moins de 3', () => {
    const n = minPushes();
    expect(n).toBeLessThanOrEqual(6);
    expect(n).toBeGreaterThanOrEqual(3);
  });

  it('la colonne bloque, la dalle résout, « Recommencer » remet le bloc', () => {
    const p = new PushPuzzle();
    expect(p.push('S')).toBe(true);
    expect(p.push('S')).toBe(true);
    expect(p.push('E')).toBe(true);
    p.reset();
    expect(p.block).toEqual([1, 1]);
    // Chemin de la solution : deux fois au sud, deux fois à l'est.
    for (const d of ['S', 'S', 'E', 'E'] as const) p.push(d);
    expect(p.solved).toBe(true);
    expect(p.push('N')).toBe(false);
  });
});

describe('miroirs du soleil (S3)', () => {
  /** Nombre minimal de rotations (au plus 4 par miroir). */
  function minTurns(): number {
    let best = Infinity;
    for (let a = 0; a < 4; a++)
      for (let b = 0; b < 4; b++) {
        const rot = (d: Dir, n: number): Dir => DIRS[(DIRS.indexOf(d) + n) % 4];
        const facing = [rot(MIRROR_ROOM.mirrors[0].start, a), rot(MIRROR_ROOM.mirrors[1].start, b)];
        if (traceRay(facing).lit) best = Math.min(best, a + b);
      }
    return best;
  }

  it('la solution demande 2 à 4 rotations, et le rayon n’atteint pas le cristal au départ', () => {
    expect(traceRay(MIRROR_ROOM.mirrors.map((m) => m.start)).lit).toBe(false);
    const n = minTurns();
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThanOrEqual(4);
  });

  it('en tournant les miroirs, le rayon atteint le cristal', () => {
    const p = new MirrorPuzzle();
    p.rotate(0);
    p.rotate(0);
    p.rotate(1);
    expect(p.rotate(1)).toBe(true);
    expect(traceRay(p.facing).path.at(-1)).toEqual(MIRROR_ROOM.crystal);
  });
});

describe('dalles-symboles (S3)', () => {
  it('chaque mur a 3 dalles et une seule bonne réponse', () => {
    for (const w of SYMBOL_WALLS) {
      expect(w.tiles).toHaveLength(3);
      expect(w.tiles.filter((t) => t === w.answer)).toHaveLength(1);
    }
  });
});
