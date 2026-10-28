import { describe, expect, it } from 'vitest';
import { createGameState, createGolem } from '../../src/core/gameState';
import { OUTRO_CINEMATICS } from '../../src/story/cinematics';
import { CREDITS_TEXT, creditSections, creditsSeconds } from '../../src/ui/credits';
import { Block } from '../../src/world/blocks';
import { buildVolcanoSet, VOLCANO_SIZE } from '../../src/world/volcanoSet';

describe('décor du Volcan d’Ombre (outro O6)', () => {
  const { world, crater } = buildVolcanoSet();

  it('un cratère de lave au sommet, plus haut que la plaine', () => {
    const cx = Math.floor(crater.x);
    const cz = Math.floor(crater.z);
    expect(world.get(cx, crater.lavaY - 1, cz)).toBe(Block.Lava);
    expect(world.standY(cx, cz)).toBe(crater.lavaY);
    expect(world.standY(cx + 6, cz)).toBeGreaterThan(crater.lavaY);
    expect(world.standY(1, 1)).toBeLessThan(8);
  });

  it('de la roche noire, de la lave sur les pentes et de la cendre dans la plaine', () => {
    const count = new Map<number, number>();
    for (let z = 0; z < VOLCANO_SIZE; z++)
      for (let x = 0; x < VOLCANO_SIZE; x++) {
        const top = world.get(x, world.standY(x, z) - 1, z);
        count.set(top, (count.get(top) ?? 0) + 1);
      }
    expect(count.get(Block.Basalt)).toBeGreaterThan(200);
    expect(count.get(Block.Ash)).toBeGreaterThan(200);
    // Le cratère seul fait environ 80 cases : les rivières en ajoutent bien plus.
    expect(count.get(Block.Lava)).toBeGreaterThan(150);
    expect(count.has(Block.Grass)).toBe(false);
  });

  it('toujours le même décor (aucun tirage au hasard)', () => {
    expect(buildVolcanoSet().world.data).toEqual(world.data);
  });
});

describe('outro finale et générique', () => {
  it('O6 est racontée en 5 plans, la fin « FIN… pour l’instant ! » dans le dernier', () => {
    expect(OUTRO_CINEMATICS.O6.shots).toHaveLength(5);
    expect(OUTRO_CINEMATICS.O6.shots[4].sentences).toBe(2);
  });

  it('le générique reprend le prénom, les golems avec leur surnom, les boss vaincus et le dragon', () => {
    const state = createGameState();
    state.playerName = 'Andy';
    state.golems.push(createGolem('pierre', 'Caillou'), createGolem('mousse'));
    state.trophies.push('roiSlime');
    const lines = creditSections(state).flatMap((s) => [s.title ?? '', ...s.lines]);
    expect(lines).toContain('Une aventure de Andy');
    expect(lines).toContain('Caillou (Pierre)');
    expect(lines).toContain('Mousse');
    expect(lines).toContain('Roi Slime');
    expect(lines).toContain(CREDITS_TEXT.dragon);
    // Typographie française : espace fine insécable avant « ! ».
    expect(lines).toContain('Merci d’avoir joué !');
    expect(lines.join(' ')).not.toContain('{prenom}');
  });

  it('défile au moins 30 s', () => {
    expect(creditsSeconds(creditSections(createGameState()))).toBeGreaterThanOrEqual(30);
  });
});
