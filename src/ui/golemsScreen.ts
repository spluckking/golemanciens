import type { GameState, GolemData } from '../core/gameState';
import { canEvolve, evolve } from '../core/evolution';
import { canFeed, feedGolem, type MealChoice } from '../core/meals';
import { ITEMS, type EvolutionItem } from '../data/items';
import { MEAL_ATK, MEAL_COST, MEAL_HP, MEALS_PER_STAGE } from '../data/balance';
import { GOLEMS, TYPE_ICON, TYPE_NAME, UNLOCK_STAGE } from '../data/creatures';
import { PORTRAITS } from '../entities/models';
import { paintPortrait } from './dialog';
import { el } from './dom';

/**
 * Écran Golems (SPEC.md § 11) : une carte par golem, avec ses stats, son stade, ses attaques,
 * les repas (🍎) et la place des objets d'évolution (à partir de la phase 2).
 * Textes nouveaux (à valider par le parent).
 */
const TEXT_TITLE = '🧱 Mes golems';
const TEXT_NONE = 'Tu n’as pas encore de golem. Trouve l’œuf du sanctuaire !';
const TEXT_STAGE = 'Stade';
const TEXT_MEALS = 'Repas';
const TEXT_MEAL_HP = `+${MEAL_HP} PV max`;
const TEXT_MEAL_ATK = `+${MEAL_ATK} ATQ`;
const TEXT_FULL = 'Il a assez mangé pour ce stade : il faut évoluer pour manger encore.';
const TEXT_NO_FOOD = `Il faut ${MEAL_COST} 🍎 pour un repas.`;
const TEXT_EVOLUTION = 'Objets d’évolution';
const TEXT_EVOLUTION_NONE = 'Aucun pour l’instant. Les premiers arrivent dans la Forêt Murmurante.';
const TEXT_LOCKED = 'au stade';
const TEXT_GIVE = 'Donner';
const TEXT_WRONG_STAGE = 'Pour un golem au stade {n}';

function golemCard(state: GameState, g: GolemData, refresh: () => void, onFeed: () => void, onEvolve: () => void): HTMLElement {
  const info = GOLEMS[g.species];
  const attacks = info.attacks.map((a) => {
    const locked = g.stage < UNLOCK_STAGE[a.slot];
    return el('li', { className: locked ? 'gs-attack locked' : 'gs-attack' }, [
      el('span', { className: 'gs-attack-type', text: TYPE_ICON[a.type] }),
      el('span', { className: 'gs-attack-name', text: a.name }),
      el('span', { className: 'gs-attack-badge', text: locked ? `🔒 ${TEXT_LOCKED} ${UNLOCK_STAGE[a.slot]}` : a.kind === 'force' ? '🔢' : '🧩' }),
    ]);
  });
  const status = canFeed(state, g.id);
  const feedBtn = (choice: MealChoice, label: string): HTMLButtonElement => {
    const b = el('button', { className: 'btn-meal', testId: `meal-${choice}-${g.id}` }, [el('span', { text: label }), el('span', { className: 'meal-cost', text: `${MEAL_COST} 🍎` })]);
    b.type = 'button';
    b.disabled = status !== 'ok';
    b.addEventListener('click', () => {
      if (feedGolem(state, g.id, choice) === 'ok') {
        onFeed();
        refresh();
      }
    });
    return b;
  };
  const note = status === 'full' ? TEXT_FULL : status === 'noFood' ? TEXT_NO_FOOD : '';
  // Objets d'évolution en poche : un bouton par objet, grisé si le golem n'est pas au bon stade.
  const items = (Object.keys(ITEMS) as EvolutionItem[]).filter((i) => (state.items[i] ?? 0) > 0);
  const evolveRow = items.map((item) => {
    const info = ITEMS[item];
    const ok = canEvolve(state, g.id, item) === 'ok';
    const b = el('button', { className: 'btn-meal btn-evolve', testId: `evolve-${item}-${g.id}` }, [el('span', { text: `${TEXT_GIVE} ${info.icon} ${info.name}` })]);
    b.type = 'button';
    b.disabled = !ok;
    if (!ok) b.title = TEXT_WRONG_STAGE.replace('{n}', String(info.fromStage));
    b.addEventListener('click', () => {
      if (evolve(state, g.id, item) === 'ok') onEvolve();
    });
    return b;
  });
  return el('div', { className: `gs-card dot-${g.species}`, testId: `golem-sheet-${g.id}` }, [
    el('div', { className: 'gs-head' }, [
      el('span', { className: 'gs-icon', text: TYPE_ICON[info.element] }),
      el('div', { className: 'gs-names' }, [
        el('div', { className: 'gs-name', text: g.nickname || info.name }),
        el('div', { className: 'gs-species', text: `${info.name} · ${TYPE_NAME[info.element]} · ${TEXT_STAGE} ${g.stage}` }),
      ]),
    ]),
    el('div', { className: 'gs-stats' }, [
      el('div', { className: 'gs-stat', testId: `golem-hp-${g.id}` }, [el('span', { text: '❤️ PV' }), el('strong', { text: `${Math.round(g.hp)} / ${g.maxHp}` })]),
      el('div', { className: 'gs-stat', testId: `golem-atk-${g.id}` }, [el('span', { text: '⚔️ ATQ' }), el('strong', { text: String(g.atk) })]),
    ]),
    el('ul', { className: 'gs-attacks' }, attacks),
    el('div', { className: 'gs-meals' }, [
      el('div', { className: 'gs-meals-head' }, [el('span', { text: `🍎 ${TEXT_MEALS}` }), el('strong', { text: `${g.meals} / ${MEALS_PER_STAGE}`, testId: `golem-meals-${g.id}` })]),
      el('div', { className: 'gs-meal-buttons' }, [feedBtn('hp', TEXT_MEAL_HP), feedBtn('atk', TEXT_MEAL_ATK)]),
      ...(note ? [el('p', { className: 'gs-note', text: note })] : []),
    ]),
    ...(evolveRow.length ? [el('div', { className: 'gs-meal-buttons gs-evolve' }, evolveRow)] : []),
  ]);
}

/** Ouvre l'écran ; onFeed est appelé après chaque repas (enregistrement, son). Résout à la fermeture. */
export function openGolems(layer: HTMLElement, state: GameState, onFeed: () => void, tip?: string, onEvolve: () => void = () => undefined): Promise<void> {
  return new Promise((resolve) => {
    const food = el('span', { className: 'gs-food', testId: 'golems-food' });
    const list = el('div', { className: 'gs-list' });
    const close = el('button', { className: 'btn-big', text: 'Fermer', testId: 'golems-close' });
    close.type = 'button';
    const finish = (): void => {
      root.remove();
      resolve();
    };
    // Après une évolution, l'écran se ferme : on voit le golem évoluer dans le monde.
    const evolved = (): void => {
      onEvolve();
      finish();
    };
    const owned = el('div', { className: 'gs-items', testId: 'golems-items' });
    const refresh = (): void => {
      food.textContent = `🍎 ${state.food}`;
      list.replaceChildren(...(state.golems.length ? state.golems.map((g) => golemCard(state, g, refresh, onFeed, evolved)) : [el('p', { className: 'gs-note', text: TEXT_NONE })]));
      const items = (Object.keys(ITEMS) as EvolutionItem[]).filter((i) => (state.items[i] ?? 0) > 0);
      owned.replaceChildren(
        ...(items.length ? items.map((i) => el('p', { className: 'gs-note', text: `${ITEMS[i].icon} ${ITEMS[i].name} × ${state.items[i]}` })) : [el('p', { className: 'gs-note', text: TEXT_EVOLUTION_NONE })]),
      );
    };
    refresh();
    const card = el('div', { className: 'card golems-card' }, [
      el('div', { className: 'gs-top' }, [el('h2', { className: 'card-title', text: TEXT_TITLE }), food]),
      ...(tip ? [el('div', { className: 'gs-tip', testId: 'golems-tip' }, [el('div', { className: 'dialog-portrait' }, [paintPortrait(PORTRAITS.lumibloc)]), el('p', { text: tip })])] : []),
      list,
      el('div', { className: 'gs-evolution' }, [el('h3', { className: 'journal-section', text: TEXT_EVOLUTION }), owned]),
      close,
    ]);
    const root = el('div', { className: 'screen screen-message', testId: 'golems' }, [card]);
    close.addEventListener('click', finish);
    layer.appendChild(root);
  });
}
