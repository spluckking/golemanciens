import { describe, expect, it } from 'vitest';
import { CHECKPOINTS, checkpointState } from '../../src/core/checkpoints';
import { createGameState, createGolem } from '../../src/core/gameState';

describe('mode test : points de passage du chapitre 1', () => {
  const current = createGameState();
  current.playerName = 'Léo';
  current.settings.pauseMinutes = 25;
  current.golems.push({ ...createGolem('mousse', 'Trèfle'), hp: 3 });

  it('garde le prénom, les réglages et les statistiques', () => {
    for (const c of CHECKPOINTS) {
      const s = checkpointState(current, c.id);
      expect(s.playerName).toBe('Léo');
      expect(s.settings.pauseMinutes).toBe(25);
      expect(s.storiesRead).toContain('T1');
    }
  });

  it('chaque étape est cohérente avec la suivante', () => {
    expect(checkpointState(current, 'start').golems).toEqual([]);
    const hatched = checkpointState(current, 'hatched');
    expect(hatched.biomes.prairie.sanctuary.step).toBe('hatched');
    expect(hatched.golems[0]).toMatchObject({ species: 'mousse', nickname: 'Trèfle', hp: 40 });
    expect(hatched.biomes.prairie.quests.R1.status).toBe('available');
    const arena = checkpointState(current, 'arena');
    expect(['R1', 'R2', 'R3'].map((q) => arena.biomes.prairie.quests[q as 'R1'].status)).toEqual(['done', 'done', 'done']);
    expect(arena.biomes.prairie.arena.wins).toBe(0);
    const boss = checkpointState(current, 'boss');
    expect(boss.biomes.prairie.arena.wins).toBe(3);
    expect(boss.biomes.prairie.bossQuest).toBe('active');
    expect(checkpointState(createGameState(), 'hatched').golems[0].species).toBe('pierre');
  });
});
