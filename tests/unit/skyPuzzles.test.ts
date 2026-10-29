import { describe, expect, it } from 'vitest';
import { BALANCE_WEIGHTS, Balance, CLOUD_GRID, CloudPath, RAINBOW_ORDER, balanceSolutions } from '../../src/quests/skyPuzzles';

describe('les nuages arc-en-ciel (S5)', () => {
  it('six nuages, un par couleur ; chacun touche le suivant dans l’ordre de l’arc-en-ciel', () => {
    expect(new Set(CLOUD_GRID.map((c) => c.color)).size).toBe(6);
    for (let i = 0; i < RAINBOW_ORDER.length - 1; i++) {
      const a = CLOUD_GRID.find((c) => c.color === RAINBOW_ORDER[i])!;
      const b = CLOUD_GRID.find((c) => c.color === RAINBOW_ORDER[i + 1])!;
      expect(Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row)), `${a.color} → ${b.color}`).toBe(1);
    }
    // Le rouge est sur la rangée du départ : on peut commencer d'un saut.
    expect(CLOUD_GRID.find((c) => c.color === 'red')!.row).toBe(1);
  });

  it('dans l’ordre, on allume les six nuages ; une erreur fait recommencer', () => {
    const p = new CloudPath();
    expect(p.step('red')).toBe('ok');
    expect(p.step('red')).toBe('same');
    expect(p.step('yellow')).toBe('wrong');
    expect(p.lit).toBe(0);
    expect(RAINBOW_ORDER.map((c) => p.step(c))).toEqual(['ok', 'ok', 'ok', 'ok', 'ok', 'done']);
    expect(p.solved).toBe(true);
  });
});

describe('la balance à contrepoids ⚙️ (S5)', () => {
  it('toute combinaison égale à 8 est acceptée : 5 + 3 et 5 + 2 + 1', () => {
    expect(balanceSolutions().map((s) => s.join('+')).sort()).toEqual(['1+2+5', '3+5']);
    for (const sol of balanceSolutions()) {
      const b = new Balance();
      for (const w of sol) b.toggle(BALANCE_WEIGHTS.indexOf(w));
      expect(b.solved).toBe(true);
      expect(b.gate).toBe(1);
      expect(b.tilt).toBe(0);
    }
  });

  it('on voit si c’est trop ou pas assez : le fléau penche et la herse monte ou descend', () => {
    const b = new Balance();
    b.toggle(3);
    expect(b.diff).toBe(-3);
    expect(b.tilt).toBeLessThan(0);
    const low = b.gate;
    b.toggle(1);
    expect(b.gate).toBeGreaterThan(low);
    b.toggle(2);
    b.toggle(0);
    expect(b.diff).toBe(3);
    expect(b.tilt).toBeGreaterThan(0);
    expect(b.solved).toBe(false);
    b.toggle(2);
    expect(b.solved).toBe(true);
  });
});
