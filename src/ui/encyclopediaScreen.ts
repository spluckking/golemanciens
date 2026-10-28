import type { GameState } from '../core/gameState';
import {
  ENCYCLOPEDIA,
  TEXT_ELEMENT,
  TEXT_ENCYCLOPEDIA,
  TEXT_NOT_CHOSEN,
  TEXT_SECTIONS,
  TEXT_UNKNOWN,
  TEXT_WEAKNESS,
  type EncyclopediaEntry,
  type EntryKind,
} from '../data/encyclopedia';
import { el } from './dom';

/**
 * Encyclopédie (SPEC.md § 11) : golems, monstres et boss, dévoilés à mesure qu'on les rencontre.
 * Un golem vu à l'éclosion mais pas choisi reste en silhouette, avec son nom.
 */

type Known = 'owned' | 'seen' | 'unknown';

function known(state: GameState, e: EncyclopediaEntry): Known {
  if (e.kind === 'golem') {
    if (state.golems.some((g) => g.species === e.id)) return 'owned';
    return state.seen.includes(e.id) ? 'seen' : 'unknown';
  }
  return state.seen.includes(e.id) ? 'owned' : 'unknown';
}

function entryCard(state: GameState, e: EncyclopediaEntry): HTMLElement {
  const k = known(state, e);
  if (k === 'unknown') {
    return el('div', { className: 'enc-card unknown', testId: `enc-${e.id}` }, [el('div', { className: 'enc-thumb', text: '?' }), el('div', { className: 'enc-name', text: TEXT_UNKNOWN })]);
  }
  const thumb = el('div', { className: 'enc-thumb', text: e.icon });
  thumb.style.background = k === 'seen' ? '#2a2440' : e.color;
  const info = e.kind === 'golem' ? `${TEXT_ELEMENT} : ${e.icon}` : `${TEXT_WEAKNESS} : ${e.icon}`;
  return el('div', { className: `enc-card ${k}`, testId: `enc-${e.id}` }, [
    thumb,
    el('div', { className: 'enc-name', text: e.name }),
    el('div', { className: 'enc-info', text: k === 'seen' ? TEXT_NOT_CHOSEN : info }),
    ...(k === 'owned' && e.description ? [el('p', { className: 'enc-desc', text: e.description })] : []),
  ]);
}

/** Ouvre l'encyclopédie ; résout à la fermeture. */
export function openEncyclopedia(layer: HTMLElement, state: GameState): Promise<void> {
  return new Promise((resolve) => {
    const sections = (['golem', 'monster', 'boss'] as EntryKind[]).map((kind) => {
      const entries = ENCYCLOPEDIA.filter((e) => e.kind === kind);
      const found = entries.filter((e) => known(state, e) !== 'unknown').length;
      return el('section', { className: 'enc-section' }, [
        el('h3', { className: 'journal-section', text: `${TEXT_SECTIONS[kind]} · ${found} / ${entries.length}`, testId: `enc-count-${kind}` }),
        el('div', { className: 'enc-grid' }, entries.map((e) => entryCard(state, e))),
      ]);
    });
    const close = el('button', { className: 'btn-big', text: 'Fermer', testId: 'encyclopedia-close' });
    close.type = 'button';
    const card = el('div', { className: 'card encyclopedia-card' }, [el('h2', { className: 'card-title', text: TEXT_ENCYCLOPEDIA }), el('div', { className: 'enc-scroll' }, sections), close]);
    const root = el('div', { className: 'screen screen-message', testId: 'encyclopedia' }, [card]);
    close.addEventListener('click', () => {
      root.remove();
      resolve();
    });
    layer.appendChild(root);
  });
}
