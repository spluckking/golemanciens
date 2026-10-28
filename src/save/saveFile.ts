import { SAVE_VERSION, createGameState, type GameState } from '../core/gameState';

/**
 * Fichier de sauvegarde (SPEC.md § 13) : l'état de la partie, versionné. Fonctions pures,
 * utilisées par le stockage IndexedDB et par l'export/import du menu parent.
 */

export const SAVE_FORMAT = 'golemanciens-save';

export interface SaveFile {
  format: typeof SAVE_FORMAT;
  version: number;
  /** Date d'enregistrement (ISO). */
  savedAt: string;
  state: GameState;
}

type Json = Record<string, unknown>;

/**
 * Migrations : migrations[v] transforme un état de la version v en version v + 1.
 * Version 1 → 2 : réglages, statistiques, temps de jeu, repas des golems.
 */
const MIGRATIONS: Record<number, (state: Json) => Json> = {
  1: (state) => ({
    ...state,
    golems: Array.isArray(state.golems) ? state.golems.map((g: Json) => ({ ...g, meals: 0 })) : [],
    // Les réglages, statistiques et le temps de jeu sont complétés par les valeurs par défaut.
  }),
};

export function toSaveFile(state: GameState, now = new Date()): SaveFile {
  return { format: SAVE_FORMAT, version: SAVE_VERSION, savedAt: now.toISOString(), state: { ...state, version: SAVE_VERSION } };
}

/** Texte JSON à exporter (fichier lisible, indenté). */
export function exportSave(state: GameState, now = new Date()): string {
  return JSON.stringify(toSaveFile(state, now), null, 2);
}

function isObject(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Complète récursivement les champs manquants avec les valeurs par défaut (les tableaux sont gardés tels quels). */
function withDefaults<T>(defaults: T, value: unknown): T {
  if (!isObject(defaults) || !isObject(value)) return (value === undefined ? defaults : value) as T;
  const out: Json = { ...value };
  for (const [k, d] of Object.entries(defaults)) out[k] = k in value ? withDefaults(d, value[k]) : d;
  return out as T;
}

export class SaveError extends Error {}

/** Version la plus récente : applique les migrations, puis complète les champs manquants. */
export function migrate(state: Json, fromVersion: number): GameState {
  if (fromVersion > SAVE_VERSION) throw new SaveError(`Sauvegarde d'une version plus récente du jeu (${fromVersion})`);
  let s = state;
  for (let v = fromVersion; v < SAVE_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) throw new SaveError(`Pas de migration depuis la version ${v}`);
    s = step(s);
  }
  const full = withDefaults(createGameState(), s);
  full.version = SAVE_VERSION;
  return full;
}

/** Lit un fichier de sauvegarde (export, IndexedDB) : vérifie le format et met à jour la version. */
export function parseSave(data: unknown): GameState {
  const file = typeof data === 'string' ? (JSON.parse(data) as unknown) : data;
  if (!isObject(file) || file.format !== SAVE_FORMAT || !isObject(file.state) || typeof file.version !== 'number') {
    throw new SaveError('Ce fichier n’est pas une sauvegarde des Golémanciens.');
  }
  const state = file.state;
  if (typeof state.playerName !== 'string' || !Array.isArray(state.golems)) throw new SaveError('Sauvegarde incomplète.');
  return migrate(state, file.version);
}
