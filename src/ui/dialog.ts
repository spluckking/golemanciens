import { formatText } from '../core/text';
import type { PortraitColors } from '../entities/models';
import { el } from './dom';
import { hasFrenchVoice, onVoicesChanged, speak, stopSpeaking } from './speech';

function hex(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`;
}

/** Portrait en cubes 8×8 peint à partir des couleurs du personnage. */
export function paintPortrait(c: PortraitColors): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  canvas.className = 'portrait';
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const px = (x: number, y: number, w: number, h: number, color: number): void => {
    ctx.fillStyle = hex(color);
    ctx.fillRect(x, y, w, h);
  };
  px(0, 0, 8, 8, 0xdfe8ff);
  px(1, 2, 6, 6, c.skin);
  px(1, 1, 6, 2, c.hair);
  px(1, 2, 1, 3, c.hair);
  px(6, 2, 1, 3, c.hair);
  if (c.hat !== undefined) {
    px(0, 1, 8, 1, c.hat);
    px(2, 0, 4, 1, c.hat);
  }
  px(2, 4, 1, 1, c.eye);
  px(5, 4, 1, 1, c.eye);
  if (c.beard !== undefined) {
    px(1, 5, 6, 3, c.beard);
    px(3, 5, 2, 1, c.skin);
  }
  return canvas;
}

export interface DialogLine {
  speaker: string;
  portrait: PortraitColors;
  text: string;
}

/**
 * Bulle de dialogue en bas de l'écran (1 ou 2 phrases), avec portrait et bouton 🔊.
 * Elle ne bloque pas le jeu : on peut continuer à marcher.
 */
export class DialogBubble {
  readonly root: HTMLDivElement;
  private readonly portraitBox = el('div', { className: 'dialog-portrait' });
  private readonly name = el('div', { className: 'dialog-name' });
  private readonly text = el('p', { className: 'dialog-text', testId: 'dialog-text' });
  private readonly speakBtn: HTMLButtonElement;
  private current: string | null = null;
  private onClose: (() => void) | null = null;

  constructor(private readonly playerName: () => string) {
    this.speakBtn = el('button', { className: 'dialog-btn', text: '🔊', aria: 'Écouter', testId: 'dialog-speak' });
    const close = el('button', { className: 'dialog-btn', text: '✕', aria: 'Fermer', testId: 'dialog-close' });
    this.root = el('div', { className: 'dialog hidden', testId: 'dialog' }, [
      this.portraitBox,
      el('div', { className: 'dialog-body' }, [this.name, this.text]),
      el('div', { className: 'dialog-actions' }, [this.speakBtn, close]),
    ]);
    for (const b of [this.speakBtn, close]) {
      b.type = 'button';
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
    }
    this.speakBtn.addEventListener('click', () => {
      if (this.current) speak(this.current);
    });
    close.addEventListener('click', () => this.close());
    const syncVoice = (): void => {
      this.speakBtn.classList.toggle('hidden', !hasFrenchVoice());
    };
    syncVoice();
    onVoicesChanged(syncVoice);
  }

  get isOpen(): boolean {
    return this.current !== null;
  }

  show(line: DialogLine, onClose?: () => void): void {
    stopSpeaking();
    const text = formatText(line.text, this.playerName());
    this.current = text;
    this.onClose = onClose ?? null;
    this.portraitBox.replaceChildren(paintPortrait(line.portrait));
    this.name.textContent = line.speaker;
    this.text.textContent = text;
    this.root.classList.remove('hidden');
  }

  close(): void {
    if (!this.current) return;
    stopSpeaking();
    this.current = null;
    this.root.classList.add('hidden');
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }
}
