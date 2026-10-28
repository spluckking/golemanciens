import { normalizePlayerName, PLAYER_NAME_MAX } from '../core/playerName';
import { formatText } from '../core/text';
import { GOLEMS, TYPE_ICON, unlockedAttacks, type GolemSpecies } from '../data/creatures';
import { NICKNAME_SUGGESTIONS, TEXT_CHOOSE_GOLEM, TEXT_NICKNAME_QUESTION, TEXT_NO_NICKNAME } from '../data/sanctuaries';
import { el } from './dom';

/**
 * Écrans de l'éclosion (SPEC.md § 4.2) : choix entre les deux golems de la phase,
 * puis surnom facultatif avec des suggestions.
 */

function button(className: string, testId: string, children: HTMLElement[] = [], text?: string): HTMLButtonElement {
  const b = el('button', { className, testId, text }, children);
  b.type = 'button';
  return b;
}

/** Deux grandes cartes : nom, élément, et les deux attaques du stade 1 avec leur badge 🔢 ou 🧩. */
export function chooseGolem(layer: HTMLElement, choices: readonly GolemSpecies[]): Promise<GolemSpecies> {
  return new Promise((resolve) => {
    const cards = choices.map((species) => {
      const info = GOLEMS[species];
      const attacks = unlockedAttacks(species, 1).map((a) =>
        el('li', { className: 'golem-choice-attack' }, [
          el('span', { className: 'attack-type', text: TYPE_ICON[a.type] }),
          el('span', { text: a.name }),
          el('span', { className: 'attack-badge', text: a.kind === 'force' ? '🔢' : '🧩' }),
        ]),
      );
      const card = button(`golem-choice golem-choice-${species}`, `choose-${species}`, [
        el('span', { className: 'golem-choice-icon', text: TYPE_ICON[info.element] }),
        el('span', { className: 'golem-choice-name', text: info.name }),
        el('ul', { className: 'golem-choice-attacks' }, attacks),
      ]);
      card.addEventListener('click', () => {
        root.remove();
        resolve(species);
      });
      return card;
    });
    const panel = el('div', { className: 'card choose-card' }, [el('h2', { className: 'card-title', text: TEXT_CHOOSE_GOLEM }), el('div', { className: 'golem-choices' }, cards)]);
    const root = el('div', { className: 'screen screen-choose', testId: 'choose-golem' }, [panel]);
    layer.appendChild(root);
  });
}

/** Surnom facultatif : champ libre, suggestions, ou garder le nom du golem (retourne '' dans ce cas). */
export function askNickname(layer: HTMLElement, species: GolemSpecies): Promise<string> {
  return new Promise((resolve) => {
    const name = GOLEMS[species].name;
    const finish = (value: string): void => {
      input.blur();
      root.remove();
      resolve(value);
    };
    const input = el('input', { className: 'name-input', testId: 'nickname-input', aria: 'Surnom' });
    input.type = 'text';
    input.maxLength = PLAYER_NAME_MAX;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('enterkeyhint', 'done');
    const ok = button('btn-big', 'nickname-ok', [], 'OK');
    ok.disabled = true;
    const keep = button('btn-big btn-secondary', 'nickname-keep', [], formatText(TEXT_NO_NICKNAME.replace('{nom}', name), ''));
    const suggestions = NICKNAME_SUGGESTIONS[species].map((s) => {
      const b = button('btn-suggestion', `nickname-${s}`, [], s);
      b.addEventListener('click', () => finish(s));
      return b;
    });
    const submit = (): void => {
      const nick = normalizePlayerName(input.value);
      if (nick) finish(nick);
    };
    input.addEventListener('input', () => (ok.disabled = normalizePlayerName(input.value) === null));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    ok.addEventListener('click', submit);
    keep.addEventListener('click', () => finish(''));
    const card = el('div', { className: 'card name-card' }, [
      el('h2', { className: 'card-title', text: formatText(TEXT_NICKNAME_QUESTION, '') }),
      el('div', { className: 'suggestions' }, suggestions),
      el('div', { className: 'nickname-row' }, [input, ok]),
      keep,
    ]);
    const root = el('div', { className: 'screen screen-name', testId: 'nickname' }, [card]);
    layer.appendChild(root);
  });
}
