import { describe, expect, it } from 'vitest';
import { GEAR_PIECES, IceMemory, MEMORY_SEQUENCE, MILL_ARROW, SLIDE_ROOM, SlidePuzzle, gearTrain, slide, solveSlide, type GearSize, type GearSlot } from '../../src/quests/frostPuzzles';

describe('la glissade (S4)', () => {
  it('se résout en 3 à 5 glissades (parcours en largeur), en commençant par la flèche d’aide', () => {
    const path = solveSlide();
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThanOrEqual(3);
    expect(path!.length).toBeLessThanOrEqual(5);
    expect(path![0]).toBe(SLIDE_ROOM.hint);
  });

  it('on glisse jusqu’au premier obstacle, et l’on ne sort que par l’ouverture nord', () => {
    expect(slide([0, 5], 'E')).toEqual([5, 5]);
    expect(slide([5, 5], 'N')).toEqual([5, 0]);
    expect(slide([5, 0], 'N')).toEqual([5, 0]);
    const p = new SlidePuzzle();
    for (const d of solveSlide()!) p.move(d);
    expect(p.out).toBe(true);
  });

  it('on peut toujours revenir au départ et réessayer (aucune case sans issue)', () => {
    // Depuis chaque case atteignable, la sortie reste atteignable.
    const seen = new Set<string>(['0,5']);
    const queue: [number, number][] = [[0, 5]];
    while (queue.length) {
      const pos = queue.shift()!;
      expect(solveSlide(pos), `depuis ${pos}`).not.toBeNull();
      for (const d of ['N', 'E', 'S', 'W'] as const) {
        const to = slide(pos, d);
        if (to === 'exit' || seen.has(String(to))) continue;
        seen.add(String(to));
        queue.push(to);
      }
    }
  });
});

describe('la mémoire de glace (S4)', () => {
  it('reproduire la séquence de 4 dalles', () => {
    const m = new IceMemory();
    const res = MEMORY_SEQUENCE.map((t) => m.press(t));
    expect(res).toEqual(['ok', 'ok', 'ok', 'done']);
    expect(m.solved).toBe(true);
  });

  it('une erreur fait rejouer la séquence ; après 3 échecs, elle passe à 3 dalles', () => {
    const m = new IceMemory();
    const wrong = (MEMORY_SEQUENCE[0] + 1) % 4;
    for (let i = 0; i < 3; i++) expect(m.press(wrong)).toBe('wrong');
    expect(m.sequence).toHaveLength(3);
    expect(MEMORY_SEQUENCE.slice(0, 3).map((t) => m.press(t))).toEqual(['ok', 'ok', 'done']);
  });
});

describe('le moulin gelé ⚙️ (S4)', () => {
  /** Toutes les façons de poser 0 à 3 des roues disponibles sur les 3 axes. */
  function placements(): Partial<Record<GearSlot, GearSize>>[] {
    const out: Partial<Record<GearSlot, GearSize>>[] = [];
    const options: (GearSize | null)[] = [null, 'big', 'small'];
    for (const l of options)
      for (const m of options)
        for (const r of options) {
          const used = [l, m, r].filter((g): g is GearSize => g !== null);
          const avail = [...GEAR_PIECES];
          if (!used.every((g) => avail.includes(g) && avail.splice(avail.indexOf(g), 1))) continue;
          const p: Partial<Record<GearSlot, GearSize>> = {};
          if (l) p.L = l;
          if (m) p.M = m;
          if (r) p.R = r;
          out.push(p);
        }
    return out;
  }

  it('seules les deux petites roues donnent le bon sens', () => {
    const good = placements().filter((p) => {
      const r = gearTrain(p);
      return r.kind === 'turns' && r.right;
    });
    expect(good).toEqual([{ L: 'small', R: 'small' }]);
  });

  it('la grande roue seule au milieu fait tourner le moulin dans le mauvais sens', () => {
    const r = gearTrain({ M: 'big' });
    expect(r.kind).toBe('turns');
    if (r.kind === 'turns') {
      expect(r.right).toBe(false);
      expect(r.mill).not.toBe(MILL_ARROW);
    }
  });

  it('chaque roue tourne dans l’autre sens que sa voisine ; un trou ou un blocage se voit', () => {
    const r = gearTrain({ L: 'small', R: 'small' });
    expect(r.kind === 'turns' && r.spins).toEqual(['ccw', 'cw']);
    expect(gearTrain({ L: 'small' })).toEqual({ kind: 'gap', after: 'L' });
    expect(gearTrain({})).toEqual({ kind: 'gap', after: 'crank' });
    expect(gearTrain({ L: 'big' }).kind).toBe('jam');
    expect(gearTrain({ M: 'big', L: 'small' }).kind).toBe('jam');
  });
});
