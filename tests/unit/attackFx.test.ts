import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { AttackType } from '../../src/data/creatures';
import { AttackFx } from '../../src/entities/attackFx';

const TYPES: AttackType[] = ['rock', 'plant', 'sun', 'spore', 'sand', 'thunder', 'ice', 'crystal', 'wind', 'rainbow', 'star'];
const FROM = { x: 0, y: 0, z: 0 };
const TO = { x: 6, y: 0, z: 0 };

describe('effets d’attaque', () => {
  it.each(TYPES)('%s : des cubes visibles, placés sur des nombres valides, qui finissent par disparaître', (type) => {
    const fx = new AttackFx();
    const seconds = fx.play(type, FROM, TO);
    expect(seconds).toBeGreaterThan(0);
    expect(fx.active).toBeGreaterThan(0);
    let peak = 0;
    const m = new THREE.Matrix4();
    for (let t = 0; t < 2; t += 0.05) {
      fx.update(0.05);
      peak = Math.max(peak, fx.mesh.count);
      for (let i = 0; i < fx.mesh.count; i++) {
        fx.mesh.getMatrixAt(i, m);
        expect(m.elements.every(Number.isFinite)).toBe(true);
      }
    }
    expect(peak).toBeGreaterThan(5);
    expect(fx.active).toBe(0);
    fx.dispose();
  });

  it('l’Ultime dure plus longtemps et compte plus de cubes', () => {
    const a = new AttackFx();
    const b = new AttackFx();
    expect(b.play('sand', FROM, TO, true)).toBeGreaterThan(a.play('sand', FROM, TO));
    expect(b.active).toBeGreaterThan(a.active);
  });
});
