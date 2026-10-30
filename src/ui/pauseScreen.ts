import { formatText } from '../core/text';
import { PORTRAITS } from '../entities/models';
import { paintPortrait } from './dialog';
import { el } from './dom';

/**
 * Pause (SPEC.md § 11) : bouton Pause, ou rappel de Lumibloc après un long moment de jeu.
 * Pour le rappel, « Continuer » n'apparaît qu'après une petite attente (10 s).
 * extras : les réglages du bouton Pause (volumes, Quitter le jeu).
 */
export function openPause(layer: HTMLElement, text: string, playerName: string, waitSeconds: number, testId: string, extras: HTMLElement[] = []): Promise<void> {
  return new Promise((resolve) => {
    const fill = el('span', { className: 'wait-fill' });
    const go = el('button', { className: 'btn-big btn-read', testId: `${testId}-continue` }, [fill, el('span', { className: 'btn-read-label', text: 'Continuer' })]);
    go.type = 'button';
    go.disabled = waitSeconds > 0;
    const card = el('div', { className: 'card pause-card' }, [
      el('div', { className: 'pause-zzz', text: '💤' }),
      el('div', { className: 'gs-tip' }, [el('div', { className: 'dialog-portrait' }, [paintPortrait(PORTRAITS.lumibloc)]), el('p', { text: formatText(text, playerName) })]),
      ...extras,
      go,
    ]);
    const root = el('div', { className: 'screen screen-message', testId }, [card]);
    if (waitSeconds > 0) {
      fill.style.transitionDuration = `${waitSeconds}s`;
      requestAnimationFrame(() => requestAnimationFrame(() => fill.classList.add('full')));
      setTimeout(() => {
        go.disabled = false;
        go.classList.add('ready');
      }, waitSeconds * 1000);
    } else go.classList.add('ready');
    go.addEventListener('click', () => {
      if (go.disabled) return;
      root.remove();
      resolve();
    });
    layer.appendChild(root);
  });
}
