import { formatText } from '../core/text';
import { el } from './dom';

export interface JournalEntry {
  text: string;
  active: boolean;
}

/** Journal de quêtes : quêtes en cours (objectif actif en évidence) et terminées. */
export function openJournal(layer: HTMLElement, current: JournalEntry[], done: string[], emptyDone: string, playerName: string): Promise<void> {
  return new Promise((resolve) => {
    const close = el('button', { className: 'btn-big', text: 'Fermer', testId: 'journal-close' });
    close.type = 'button';
    const list = (items: HTMLElement[]): HTMLUListElement => el('ul', { className: 'journal-list' }, items);
    const card = el('div', { className: 'card journal-card' }, [
      el('h2', { className: 'card-title', text: '📜 Journal' }),
      el('h3', { className: 'journal-section', text: 'En cours' }),
      list(current.map((c) => el('li', { className: c.active ? 'journal-active' : '', text: formatText(c.text, playerName) }))),
      el('h3', { className: 'journal-section', text: 'Terminées' }),
      list(done.length ? done.map((d) => el('li', { text: formatText(d, playerName) })) : [el('li', { className: 'journal-empty', text: formatText(emptyDone, playerName) })]),
      close,
    ]);
    const root = el('div', { className: 'screen screen-message', testId: 'journal' }, [card]);
    close.addEventListener('click', () => {
      root.remove();
      resolve();
    });
    layer.appendChild(root);
  });
}
