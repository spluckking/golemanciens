import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, createGameState, createGolem } from '../../src/core/gameState';
import { SAVE_FORMAT, SaveError, exportSave, parseSave } from '../../src/save/saveFile';

function playedState() {
  const s = createGameState();
  s.playerName = 'Léo';
  s.storiesRead.push('T1', 'O1');
  s.golems.push({ ...createGolem('mousse', 'Trèfle'), hp: 12, meals: 2 });
  s.food = 17;
  s.shards = 1;
  const prairie = s.biomes.prairie;
  prairie.sanctuary.step = 'hatched';
  prairie.quests.R1 = { status: 'done', progress: 3 };
  prairie.quests.O2 = { status: 'active', progress: 2 };
  prairie.arena = { wins: 2 };
  prairie.bossQuest = 'active';
  s.lessonDone = true;
  s.trophies.push('roiSlime');
  s.riddles.seen.push('E1-1', 'E1-4');
  s.levels.calc.level = 3;
  s.stats.tables['7'] = { asked: 5, correct: 3 };
  s.settings.pauseMinutes = 30;
  s.playTimeS = 1234.5;
  return s;
}

describe('sauvegarde', () => {
  it('aller-retour export → import : l’état est identique', () => {
    const s = playedState();
    const text = exportSave(s, new Date('2026-10-28T10:00:00Z'));
    const file = JSON.parse(text);
    expect(file.format).toBe(SAVE_FORMAT);
    expect(file.version).toBe(SAVE_VERSION);
    expect(file.savedAt).toBe('2026-10-28T10:00:00.000Z');
    expect(parseSave(text)).toEqual(s);
  });

  it('refuse un fichier qui n’est pas une sauvegarde, ou d’une version future', () => {
    expect(() => parseSave('{"hello": 1}')).toThrow(SaveError);
    expect(() => parseSave({ format: SAVE_FORMAT, version: 1, state: { golems: [] } })).toThrow(SaveError);
    const future = JSON.parse(exportSave(playedState()));
    future.version = SAVE_VERSION + 1;
    expect(() => parseSave(future)).toThrow(/plus récente/);
    expect(() => parseSave('pas du JSON')).toThrow();
  });

  /** État au format de la version 2 : l'avancement de la Prairie à la racine. */
  function legacyState(): Record<string, unknown> {
    const { biome: _biome, biomes, lessonDone, ...rest } = playedState();
    const p = biomes.prairie;
    return { ...rest, version: 2, sanctuary: p.sanctuary, quests: p.quests, arena: { ...p.arena, lessonDone }, bossQuest: p.bossQuest };
  }

  it('migration 2 → 3 : l’avancement existant devient celui de la Prairie, la Forêt commence à zéro', () => {
    const migrated = parseSave({ format: SAVE_FORMAT, version: 2, savedAt: '', state: legacyState() });
    expect(migrated).toEqual(playedState());
    expect(migrated.biome).toBe('prairie');
    expect(migrated.biomes.foret).toEqual(createGameState().biomes.foret);
    expect('sanctuary' in migrated).toBe(false);
  });

  it('migration 1 → 2 : repas des golems, réglages, statistiques et temps de jeu ajoutés', () => {
    const v1 = legacyState();
    delete v1.settings;
    delete v1.stats;
    delete v1.playTimeS;
    v1.version = 1;
    v1.golems = [{ id: 'pierre', species: 'pierre', nickname: '', stage: 1, maxHp: 40, atk: 8, hp: 40 }];
    const migrated = parseSave({ format: SAVE_FORMAT, version: 1, savedAt: '', state: v1 });
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.golems[0].meals).toBe(0);
    expect(migrated.settings).toEqual(createGameState().settings);
    expect(migrated.stats).toEqual(createGameState().stats);
    expect(migrated.playTimeS).toBe(0);
    expect(migrated.food).toBe(17);
    expect(migrated.biomes.prairie.quests.R1.status).toBe('done');
  });

  it('les champs manquants (ajoutés plus tard) prennent leur valeur par défaut, sans écraser le reste', () => {
    const file = JSON.parse(exportSave(playedState()));
    delete file.state.biomes.prairie.arena;
    delete file.state.settings.showFps;
    const s = parseSave(file);
    expect(s.biomes.prairie.arena).toEqual({ wins: 0 });
    expect(s.settings.showFps).toBe(false);
    expect(s.settings.pauseMinutes).toBe(30);
  });
});
