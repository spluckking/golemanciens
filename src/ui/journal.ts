import { formatText } from '../core/text';
import { el } from './dom';

export interface JournalEntry {
  text: string;
  active: boolean;
}

/** Histoire déjà vue, que l'on peut revoir en cinématique. */
export interface JournalReplay {
  id: string;
  title: string;
}

/**
 * Journal de quêtes : quêtes en cours (objectif actif en évidence) et terminées, puis
 * « Revoir l'histoire ». Résout avec l'identifiant de l'histoire à revoir, ou null à la fermeture.
 */
export function openJournal(
  layer: HTMLElement,
  current: JournalEntry[],
  done: string[],
  emptyDone: string,
  playerName: string,
  replays: JournalReplay[] = [],
): Promise<string | null> {
  return new Promise((resolve) => {
    const close = el('button', { className: 'btn-big', text: 'Fermer', testId: 'journal-close' });
    close.type = 'button';
    const list = (items: HTMLElement[]): HTMLUListElement => el('ul', { className: 'journal-list' }, items);
    const finish = (value: string | null): void => {
      root.remove();
      resolve(value);
    };
    const replayButtons = replays.map((r) => {
      const b = el('button', { className: 'btn-replay', text: `🎬 ${r.title}`, testId: `journal-replay-${r.id}` });
      b.type = 'button';
      b.addEventListener('click', () => finish(r.id));
      return b;
    });
    const card = el('div', { className: 'card journal-card' }, [
      el('h2', { className: 'card-title', text: '📜 Journal' }),
      el('h3', { className: 'journal-section', text: 'En cours' }),
      list(current.map((c) => el('li', { className: c.active ? 'journal-active' : '', text: formatText(c.text, playerName) }))),
      el('h3', { className: 'journal-section', text: 'Terminées' }),
      list(done.length ? done.map((d) => el('li', { text: formatText(d, playerName) })) : [el('li', { className: 'journal-empty', text: formatText(emptyDone, playerName) })]),
      ...(replayButtons.length ? [el('h3', { className: 'journal-section', text: 'Revoir l’histoire' }), el('div', { className: 'journal-replays' }, replayButtons)] : []),
      close,
    ]);
    const root = el('div', { className: 'screen screen-message', testId: 'journal' }, [card]);
    close.addEventListener('click', () => finish(null));
    layer.appendChild(root);
  });
}
