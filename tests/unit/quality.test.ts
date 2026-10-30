import { describe, expect, it } from 'vitest';
import { detectQuality } from '../../src/core/quality';

describe('profils de qualité du rendu', () => {
  it('la tablette a le profil Haut (bloom, ratio 1,75 au plus)', () => {
    const q = detectQuality(new URLSearchParams(''), false);
    expect(q.tier).toBe('high');
    expect(q.bloom).toBe(true);
    expect(q.maxPixelRatio).toBeLessThanOrEqual(1.75);
  });

  it('la CI et le mode test ont le profil Test (sans post-traitement, ratio 1,5 au plus)', () => {
    for (const q of [detectQuality(new URLSearchParams('test'), false), detectQuality(new URLSearchParams(''), true)]) {
      expect(q.tier).toBe('test');
      expect(q.bloom).toBe(false);
      expect(q.maxPixelRatio).toBeLessThanOrEqual(1.5);
    }
  });

  it('« ?quality= » impose un profil', () => {
    expect(detectQuality(new URLSearchParams('test&quality=high'), true).tier).toBe('high');
    expect(detectQuality(new URLSearchParams('quality=test'), false).tier).toBe('test');
  });
});
