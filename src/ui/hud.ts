import { el } from './dom';

/** Barre du haut : Journal, Golems, Encyclopédie, Pause (écrans branchés aux sous-étapes suivantes). */
export class Hud {
  readonly root: HTMLDivElement;
  private readonly toast: HTMLDivElement;
  private toastTimer = 0;

  constructor() {
    const buttons = [
      ['📜', 'Journal', 'btn-journal'],
      ['🧱', 'Golems', 'btn-golems'],
      ['📖', 'Encyclopédie', 'btn-encyclopedia'],
      ['⏸', 'Pause', 'btn-pause'],
    ].map(([icon, label, id]) => {
      const b = el('button', { className: 'btn-top', aria: label, testId: id }, [
        el('span', { className: 'btn-icon', text: icon }),
        el('span', { className: 'btn-label', text: label }),
      ]);
      b.disabled = true;
      return b;
    });
    this.toast = el('div', { className: 'toast hidden', testId: 'toast' });
    this.root = el('div', { className: 'hud' }, [el('div', { className: 'top-bar' }, buttons), this.toast]);
  }

  /** Bulle d'information brève, au centre en haut. */
  showToast(text: string, seconds = 2.5): void {
    this.toast.textContent = text;
    this.toast.classList.remove('hidden');
    this.toastTimer = seconds;
  }

  update(dt: number): void {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toast.classList.add('hidden');
    }
  }
}
