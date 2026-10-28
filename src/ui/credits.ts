import type { GameState } from '../core/gameState';
import { formatText } from '../core/text';
import { BOSSES, GOLEMS, type BossId } from '../data/creatures';
import { NPC_NAMES } from '../story/dialogues';
import { el } from './dom';
import { createLogo } from './logo';

/**
 * Générique de fin (outro O6) : le logo, puis les héros de l'aventure qui défilent.
 * Textes nouveaux, à valider par le parent.
 */
export const CREDITS_TEXT = {
  adventure: 'Une aventure de {prenom}',
  hero: 'Le héros',
  heroLine: '{prenom}, le plus grand golémancien de Cubeterre',
  golems: 'Ses golems',
  teacher: 'Son professeur',
  villagers: 'Les habitants de Cubeterre',
  bosses: 'Les boss vaincus',
  dragon: 'Dragon d’Ombre',
  madeWith: 'Les dessins, la musique et les sons de ce jeu sont fabriqués en blocs et en code, rien que pour {prenom}.',
  thanks: 'Merci d’avoir joué !',
  continue: 'Continuer',
  skip: 'Passer',
};

/** Durée du défilement : environ 1,6 s par ligne, au moins 30 s. */
const SECONDS_PER_LINE = 1.6;
const MIN_SECONDS = 30;

export interface CreditSection {
  title?: string;
  lines: string[];
}

/** Contenu du générique, selon la partie (prénom, golems, trophées). */
export function creditSections(state: GameState): CreditSection[] {
  const golems = state.golems.map((g) => {
    const species = GOLEMS[g.species].name;
    return g.nickname && g.nickname !== species ? `${g.nickname} (${species})` : species;
  });
  const bosses = state.trophies.filter((id): id is BossId => id in BOSSES).map((id) => BOSSES[id].name);
  const name = (text: string): string => formatText(text, state.playerName);
  return [
    { lines: [name(CREDITS_TEXT.adventure)] },
    { title: CREDITS_TEXT.hero, lines: [name(CREDITS_TEXT.heroLine)] },
    ...(golems.length ? [{ title: CREDITS_TEXT.golems, lines: golems }] : []),
    { title: CREDITS_TEXT.teacher, lines: [NPC_NAMES.lumibloc] },
    { title: CREDITS_TEXT.villagers, lines: ['mereBrique', 'paquerette', 'gaston', 'rivet'].map((id) => NPC_NAMES[id]) },
    { title: CREDITS_TEXT.bosses, lines: [...bosses, CREDITS_TEXT.dragon] },
    { lines: [name(CREDITS_TEXT.madeWith)] },
    { lines: [name(CREDITS_TEXT.thanks)] },
  ];
}

export function creditsSeconds(sections: readonly CreditSection[]): number {
  const lines = sections.reduce((n, s) => n + s.lines.length + (s.title ? 1 : 0) + 1, 4);
  return Math.max(MIN_SECONDS, lines * SECONDS_PER_LINE);
}

/** Joue le générique ; « Passer » à tout moment, « Continuer » à la fin. */
export function showCredits(layer: HTMLElement, state: GameState, timeScale = 1): Promise<void> {
  return new Promise((resolve) => {
    const sections = creditSections(state);
    const roll = el('div', { className: 'credits-roll', testId: 'credits-roll' }, [
      el('div', { className: 'credits-logo' }, [createLogo(8)]),
      ...sections.map((s) =>
        el('section', { className: 'credits-section' }, [
          ...(s.title ? [el('h3', { className: 'credits-title', text: s.title })] : []),
          ...s.lines.map((line) => el('p', { className: 'credits-line', text: line })),
        ]),
      ),
    ]);
    roll.style.animationDuration = `${creditsSeconds(sections) * timeScale}s`;
    const skip = el('button', { className: 'cine-skip', text: CREDITS_TEXT.skip, testId: 'credits-skip' });
    skip.type = 'button';
    const done = el('button', { className: 'btn-big credits-continue hidden', text: CREDITS_TEXT.continue, testId: 'credits-continue' });
    done.type = 'button';
    const root = el('div', { className: 'credits', testId: 'credits' }, [roll, skip, done]);
    const finish = (): void => {
      root.remove();
      resolve();
    };
    roll.addEventListener('animationend', () => {
      skip.classList.add('hidden');
      done.classList.remove('hidden');
    });
    skip.addEventListener('click', finish);
    done.addEventListener('click', finish);
    layer.appendChild(root);
  });
}
