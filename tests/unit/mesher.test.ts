import { describe, expect, it } from 'vitest';
import { Block, Tile } from '../../src/world/blocks';
import { meshChunk } from '../../src/world/mesher';
import { VoxelWorld } from '../../src/world/voxelWorld';

function smallWorld(): VoxelWorld {
  return new VoxelWorld(16, 32, 16);
}

/** Aire totale des quads (en faces de blocs), pour vérifier la fusion. */
function totalArea(positions: Float32Array, quads: number): number {
  let area = 0;
  for (let q = 0; q < quads; q++) {
    const p = (k: number, c: number): number => positions[(q * 4 + k) * 3 + c];
    const e1 = [p(1, 0) - p(0, 0), p(1, 1) - p(0, 1), p(1, 2) - p(0, 2)];
    const e2 = [p(3, 0) - p(0, 0), p(3, 1) - p(0, 1), p(3, 2) - p(0, 2)];
    area += Math.hypot(e1[0], e1[1], e1[2]) * Math.hypot(e2[0], e2[1], e2[2]);
  }
  return area;
}

describe('meshing glouton', () => {
  it('un bloc isolé donne 6 faces', () => {
    const w = smallWorld();
    w.set(5, 10, 5, Block.Stone);
    const { opaque, water } = meshChunk(w, 0, 0);
    expect(opaque.quadCount).toBe(6);
    expect(water.quadCount).toBe(0);
    expect(opaque.indices.length).toBe(36);
  });

  it('un cube plein 3×3×3 est fusionné en 6 grands quads', () => {
    const w = smallWorld();
    w.fill(2, 4, 2, 4, 6, 4, Block.Stone);
    const { opaque } = meshChunk(w, 0, 0);
    expect(opaque.quadCount).toBe(6);
    expect(totalArea(opaque.positions, opaque.quadCount)).toBe(54);
  });

  it("aucune face n'est dessinée entre deux blocs pleins", () => {
    const w = smallWorld();
    w.set(5, 10, 5, Block.Stone);
    w.set(6, 10, 5, Block.Brick);
    const { opaque } = meshChunk(w, 0, 0);
    // 2 cubes collés : 10 faces visibles, pas de face commune.
    expect(totalArea(opaque.positions, opaque.quadCount)).toBe(10);
    for (let i = 0; i < opaque.normals.length; i += 3) {
      if (opaque.normals[i] === 1) expect(opaque.positions[i]).not.toBe(6);
    }
  });

  it('les tuiles différentes ne sont pas fusionnées', () => {
    const w = smallWorld();
    w.fill(0, 0, 0, 15, 0, 15, Block.Stone);
    w.set(3, 0, 3, Block.Sand);
    const { opaque } = meshChunk(w, 0, 0);
    const tops = new Set<number>();
    for (let v = 0; v < opaque.tiles.length; v++) if (opaque.normals[v * 3 + 1] === 1) tops.add(opaque.tiles[v]);
    expect(tops).toEqual(new Set([Tile.Stone, Tile.Sand]));
  });

  it("une couche de 16×16 au sol ne donne qu'un quad sur le dessus", () => {
    const w = smallWorld();
    w.fill(0, 0, 0, 15, 0, 15, Block.Grass);
    const { opaque } = meshChunk(w, 0, 0);
    let tops = 0;
    for (let q = 0; q < opaque.quadCount; q++) if (opaque.normals[q * 12 + 1] === 1) tops++;
    expect(tops).toBe(1);
    // Les bords de la carte et le dessous sont cachés : seule la face du dessus reste.
    expect(opaque.quadCount).toBe(1);
  });

  it("les coordonnées de texture couvrent la taille du quad (répétition des tuiles)", () => {
    const w = smallWorld();
    w.fill(0, 0, 0, 15, 0, 15, Block.Grass);
    const { opaque } = meshChunk(w, 0, 0);
    const maxU = Math.max(...Array.from(opaque.uvs).filter((_, i) => i % 2 === 0));
    expect(maxU).toBe(16);
  });

  it("l'eau n'a de faces que contre l'air", () => {
    const w = smallWorld();
    w.fill(0, 0, 0, 15, 0, 15, Block.Stone);
    w.fill(4, 1, 4, 6, 1, 6, Block.Water);
    const { water } = meshChunk(w, 0, 0);
    // Dessus fusionné + 4 côtés, pas de face sous l'eau ni entre blocs d'eau.
    expect(water.quadCount).toBe(5);
  });

  it('les faces des chunks voisins se raccordent sans doublon', () => {
    const w = new VoxelWorld(32, 32, 16);
    w.fill(14, 5, 5, 17, 5, 5, Block.Stone);
    const a = meshChunk(w, 0, 0).opaque;
    const b = meshChunk(w, 1, 0).opaque;
    // Barre de 4×1×1 coupée en deux : 2×(1×4 dessus/dessous/devant/derrière) + 2 bouts = 18.
    expect(totalArea(a.positions, a.quadCount) + totalArea(b.positions, b.quadCount)).toBe(18);
  });

  it('occlusion ambiante : à l’air libre le sol est clair, au pied d’un mur il s’assombrit', () => {
    const w = smallWorld();
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) w.set(x, 0, z, Block.Stone);
    let open = meshChunk(w, 0, 0).opaque;
    expect([...open.ao].every((a) => a === 3)).toBe(true);
    // Un mur posé sur le sol : les coins du sol qui le touchent passent à l'ombre.
    for (let z = 0; z < 16; z++) w.set(8, 1, z, Block.Stone);
    const walled = meshChunk(w, 0, 0).opaque;
    expect(Math.min(...walled.ao)).toBeLessThan(3);
    // Le dessus du mur, lui, reste à l'air libre.
    let topAo = 3;
    for (let k = 0; k < walled.quadCount * 4; k++) if (walled.normals[k * 3 + 1] === 1 && walled.positions[k * 3 + 1] === 2) topAo = Math.min(topAo, walled.ao[k]);
    expect(topAo).toBe(3);
    open = walled;
    expect(open.ao.length).toBe(open.quadCount * 4);
  });
});
