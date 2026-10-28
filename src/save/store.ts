import type { GameState } from '../core/gameState';
import { parseSave, toSaveFile } from './saveFile';

/**
 * Stockage de la partie dans IndexedDB (SPEC.md § 13) : un seul profil, une seule clé.
 * Petite couche maison, sans dépendance. Les erreurs ne bloquent jamais le jeu.
 */

const DB_NAME = 'golemanciens';
const STORE = 'saves';
const KEY = 'profil';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = action(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? req.error);
        };
      }),
  );
}

/** Partie enregistrée, ou null s'il n'y en a pas (ou si elle est illisible). */
export async function loadGame(): Promise<GameState | null> {
  try {
    const data = await run('readonly', (s) => s.get(KEY));
    return data ? parseSave(data) : null;
  } catch (e) {
    console.warn('Sauvegarde illisible', e);
    return null;
  }
}

/** Enregistre la partie (copie profonde : l'état peut continuer à changer pendant l'écriture). */
export async function saveGame(state: GameState): Promise<boolean> {
  try {
    await run('readwrite', (s) => s.put(JSON.parse(JSON.stringify(toSaveFile(state))), KEY));
    return true;
  } catch (e) {
    console.warn('Sauvegarde impossible', e);
    return false;
  }
}

/** Efface la partie (réinitialisation du menu parent). */
export async function clearGame(): Promise<void> {
  try {
    await run('readwrite', (s) => s.delete(KEY));
  } catch (e) {
    console.warn('Effacement impossible', e);
  }
}
