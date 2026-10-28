import { normalizePlayerName, PLAYER_NAME_MAX } from '../core/playerName';
import { formatText } from '../core/text';
import type { StoryText } from '../data/types';
import type { QuestionView } from '../questions/present';
import { el } from './dom';
import { createLogo } from './logo';

/** Écrans plein écran en DOM, superposés au monde 3D. Chaque écran se retire à la fin. */

function screen(className: string, testId: string, children: HTMLElement[]): HTMLDivElement {
  return el('div', { className: `screen ${className}`, testId }, children);
}

function bigButton(label: string, testId: string, className = 'btn-big'): HTMLButtonElement {
  const b = el('button', { className, text: label, testId });
  b.type = 'button';
  return b;
}

/** Écran titre : logo en blocs et bouton Jouer. */
/** Appui long sur le logo pour ouvrir le menu parent (SPEC.md § 14). */
export const PARENT_HOLD_MS = 3000;

/** Écran titre : « play » quand on touche le bouton, « parent » après un appui long de 3 s sur le logo. */
export function showTitle(layer: HTMLElement, label = 'Jouer'): Promise<'play' | 'parent'> {
  return new Promise((resolve) => {
    const play = bigButton(label, 'btn-play');
    const logo = el('div', { className: 'logo-wrap', testId: 'title-logo' }, [createLogo()]);
    const root = screen('screen-title', 'screen-title', [logo, play]);
    const done = (choice: 'play' | 'parent'): void => {
      clearTimeout(hold);
      root.remove();
      resolve(choice);
    };
    let hold = 0;
    logo.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      clearTimeout(hold);
      hold = window.setTimeout(() => done('parent'), PARENT_HOLD_MS);
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel'] as const) logo.addEventListener(ev, () => clearTimeout(hold));
    play.addEventListener('click', () => done('play'));
    layer.appendChild(root);
  });
}

/** Saisie du prénom au premier lancement. */
export function askPlayerName(layer: HTMLElement): Promise<string> {
  return new Promise((resolve) => {
    const input = el('input', { className: 'name-input', testId: 'name-input', aria: 'Prénom' });
    input.type = 'text';
    input.maxLength = PLAYER_NAME_MAX;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('autocapitalize', 'words');
    input.setAttribute('enterkeyhint', 'done');
    const go = bigButton(formatText("C'est parti !", ''), 'btn-name-ok');
    go.disabled = true;
    const card = el('div', { className: 'card name-card' }, [
      el('label', { className: 'card-title', text: formatText("Comment t'appelles-tu ?", '') }),
      input,
      go,
    ]);
    const root = screen('screen-name', 'screen-name', [card]);
    const submit = (): void => {
      const name = normalizePlayerName(input.value);
      if (!name) return;
      input.blur();
      root.remove();
      resolve(name);
    };
    input.addEventListener('input', () => (go.disabled = normalizePlayerName(input.value) === null));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    go.addEventListener('click', submit);
    layer.appendChild(root);
    setTimeout(() => input.focus(), 50);
  });
}

/** Texte d'histoire façon parchemin ; « J'ai lu ! » s'active après waitSeconds. */
export function showStory(layer: HTMLElement, story: StoryText, playerName: string, waitSeconds: number): Promise<void> {
  return new Promise((resolve) => {
    const fill = el('span', { className: 'wait-fill' });
    const btn = el('button', { className: 'btn-big btn-read', testId: 'btn-read' }, [
      fill,
      el('span', { className: 'btn-read-label', text: formatText("J'ai lu !", playerName) }),
    ]);
    btn.type = 'button';
    btn.disabled = true;
    const scroll = el(
      'div',
      { className: 'parchment-scroll' },
      story.paragraphs.map((p) => el('p', { text: formatText(p, playerName) })),
    );
    const parchment = el('div', { className: 'parchment' }, [el('h1', { text: story.title }), scroll, btn]);
    const root = screen('screen-story', 'screen-story', [parchment]);
    layer.appendChild(root);

    // Barre qui se remplit doucement (pas de compte à rebours affiché).
    fill.style.transitionDuration = `${waitSeconds}s`;
    requestAnimationFrame(() => requestAnimationFrame(() => fill.classList.add('full')));
    setTimeout(() => {
      btn.disabled = false;
      btn.classList.add('ready');
    }, waitSeconds * 1000);
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      root.remove();
      resolve();
    });
  });
}

const BADGES: Record<QuestionView['badge'], string> = { calc: '🔢', riddle: '🧩', reading: '📖' };

/** Question affichée en ce moment (accès réservé aux tests de bout en bout). */
let shown: QuestionView | null = null;
export function shownQuestion(): QuestionView | null {
  return shown;
}

/** Carte de question : retourne l'index du choix touché (dans l'ordre affiché). */
export function askQuestion(layer: HTMLElement, view: QuestionView, playerName: string, progress?: string): Promise<number> {
  shown = view;
  return new Promise((resolve) => {
    const choices = view.choices.map((c, i) => {
      const b = el('button', { className: 'choice', text: formatText(c, playerName), testId: `choice-${i}` });
      b.type = 'button';
      return b;
    });
    const header = el('div', { className: 'card-header' }, [el('span', { className: 'badge', text: BADGES[view.badge] })]);
    if (progress) header.appendChild(el('span', { className: 'progress', text: progress }));
    const card = el('div', { className: 'card question-card' }, [
      header,
      el('p', { className: 'question-prompt', text: formatText(view.prompt, playerName), testId: 'question-prompt' }),
      el('div', { className: `choices choices-${view.choices.length}` }, choices),
    ]);
    const root = screen('screen-question', 'screen-question', [card]);
    choices.forEach((b, i) =>
      b.addEventListener('click', () => {
        choices.forEach((c) => (c.disabled = true));
        b.classList.add('chosen');
        setTimeout(() => {
          root.remove();
          shown = null;
          resolve(i);
        }, 250);
      }),
    );
    layer.appendChild(root);
  });
}

/**
 * Après une erreur en combat : la bonne réponse en vert, l'explication, puis « J'ai compris ».
 * (Utilisé à partir de l'arène ; jamais pour la lecture.)
 */
export function revealAnswer(layer: HTMLElement, view: QuestionView, chosen: number, playerName: string): Promise<void> {
  return new Promise((resolve) => {
    const choices = view.choices.map((c, i) => {
      const cls = i === view.correctIndex ? 'choice correct' : i === chosen ? 'choice missed' : 'choice';
      const b = el('button', { className: cls, text: formatText(c, playerName) });
      b.disabled = true;
      return b;
    });
    const ok = bigButton("J'ai compris", 'btn-understood');
    const card = el('div', { className: 'card question-card' }, [
      el('p', { className: 'question-prompt', text: formatText(view.prompt, playerName) }),
      el('div', { className: `choices choices-${view.choices.length}` }, choices),
      el('p', { className: 'explanation', text: formatText(view.explanation ?? '', playerName), testId: 'explanation' }),
      ok,
    ]);
    const root = screen('screen-question', 'screen-reveal', [card]);
    ok.addEventListener('click', () => {
      root.remove();
      resolve();
    });
    layer.appendChild(root);
  });
}

/** Message court avec un bouton. */
export function showMessage(layer: HTMLElement, text: string, button: string, playerName: string, testId: string): Promise<void> {
  return new Promise((resolve) => {
    const ok = bigButton(formatText(button, playerName), `${testId}-ok`);
    const card = el('div', { className: 'card message-card' }, [el('p', { className: 'message-text', text: formatText(text, playerName) }), ok]);
    const root = screen('screen-message', testId, [card]);
    ok.addEventListener('click', () => {
      root.remove();
      resolve();
    });
    layer.appendChild(root);
  });
}

/** Message avec plusieurs boutons : retourne l'index du bouton touché. */
export function askChoice(layer: HTMLElement, text: string, labels: string[], playerName: string, testId: string): Promise<number> {
  return new Promise((resolve) => {
    const buttons = labels.map((l, i) => bigButton(formatText(l, playerName), `${testId}-${i}`, i === 0 ? 'btn-big' : 'btn-big btn-secondary'));
    const card = el('div', { className: 'card message-card' }, [el('p', { className: 'message-text', text: formatText(text, playerName) }), el('div', { className: 'choice-row' }, buttons)]);
    const root = screen('screen-message', testId, [card]);
    buttons.forEach((b, i) =>
      b.addEventListener('click', () => {
        root.remove();
        resolve(i);
      }),
    );
    layer.appendChild(root);
  });
}

/** Confettis en cubes colorés (DOM + CSS). */
export function confetti(layer: HTMLElement): void {
  const colors = ['#f0c43c', '#6ff0ff', '#e64646', '#6ebe50', '#a06ee6', '#ffffff'];
  const box = el('div', { className: 'confetti', testId: 'confetti' });
  for (let i = 0; i < 90; i++) {
    const p = el('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.6}s`;
    p.style.animationDuration = `${1.6 + Math.random() * 1.2}s`;
    p.style.setProperty('--drift', `${(Math.random() - 0.5) * 240}px`);
    p.style.setProperty('--spin', `${(Math.random() - 0.5) * 1080}deg`);
    box.appendChild(p);
  }
  layer.appendChild(box);
  setTimeout(() => box.remove(), 3500);
}
