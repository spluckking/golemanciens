import type { GolemData } from '../core/gameState';
import { GOLEMS } from '../data/creatures';
import { el } from './dom';

/**
 * HUD : 🍎, éclats, portraits des golems avec leurs PV, boussole, boutons du haut
 * (Journal ; Golems, Encyclopédie et Pause arrivent à la sous-étape 1.5), bulle d'information.
 */
export class Hud {
  readonly root: HTMLDivElement;
  private readonly toast: HTMLDivElement;
  private readonly food = el('span', { className: 'stat-value', testId: 'hud-food' });
  private readonly shards = el('span', { className: 'stat-value', testId: 'hud-shards' });
  private readonly golemBox = el('div', { className: 'golem-cards' });
  private readonly compass = el('div', { className: 'compass hidden', testId: 'compass' }, [el('span', { className: 'compass-arrow', text: '▲' })]);
  private readonly cards = new Map<string, { root: HTMLDivElement; fill: HTMLDivElement; zzz: HTMLSpanElement }>();
  private toastTimer = 0;
  private lastFood = -1;

  constructor(onJournal: () => void) {
    const buttons = (
      [
        ['📜', 'Journal', 'btn-journal'],
        ['🧱', 'Golems', 'btn-golems'],
        ['📖', 'Encyclopédie', 'btn-encyclopedia'],
        ['⏸', 'Pause', 'btn-pause'],
      ] as const
    ).map(([icon, label, id]) => {
      const b = el('button', { className: 'btn-top', aria: label, testId: id }, [
        el('span', { className: 'btn-icon', text: icon }),
        el('span', { className: 'btn-label', text: label }),
      ]);
      b.type = 'button';
      b.disabled = id !== 'btn-journal';
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      return b;
    });
    buttons[0].addEventListener('click', onJournal);
    this.toast = el('div', { className: 'toast hidden', testId: 'toast' });
    const stats = el('div', { className: 'stats' }, [
      el('div', { className: 'stat' }, [el('span', { text: '🍎' }), this.food]),
      el('div', { className: 'stat' }, [el('span', { text: '✦' }), this.shards]),
    ]);
    this.root = el('div', { className: 'hud' }, [
      el('div', { className: 'top-left' }, [stats, this.golemBox]),
      this.compass,
      el('div', { className: 'top-bar' }, buttons),
      this.toast,
    ]);
  }

  /** Bulle d'information brève, au centre en haut. */
  showToast(text: string, seconds = 2.5): void {
    this.toast.textContent = text;
    this.toast.classList.remove('hidden');
    this.toastTimer = seconds;
  }

  setStats(food: number, shards: number): void {
    if (food !== this.lastFood) {
      this.food.textContent = String(food);
      if (this.lastFood >= 0 && food > this.lastFood) {
        this.food.classList.remove('bump');
        void this.food.offsetWidth;
        this.food.classList.add('bump');
      }
      this.lastFood = food;
    }
    this.shards.textContent = `${shards}/5`;
  }

  setGolems(golems: GolemData[], ko: (id: string) => boolean): void {
    for (const g of golems) {
      let card = this.cards.get(g.id);
      if (!card) {
        const fill = el('div', { className: 'hp-fill' });
        const zzz = el('span', { className: 'card-zzz hidden', text: '💤' });
        const root = el('div', { className: 'golem-card', testId: `golem-card-${g.id}` }, [
          el('span', { className: `golem-dot dot-${g.species}` }),
          el('span', { className: 'golem-name', text: g.nickname || GOLEMS[g.species].name }),
          zzz,
          el('div', { className: 'hp-bar hp-golem' }, [fill]),
        ]);
        card = { root, fill, zzz };
        this.cards.set(g.id, card);
        this.golemBox.appendChild(root);
      }
      card.fill.style.width = `${(Math.max(0, g.hp) / g.maxHp) * 100}%`;
      card.zzz.classList.toggle('hidden', !ko(g.id));
    }
  }

  /** Flèche de boussole (degrés), ou null pour la masquer. */
  setCompass(degrees: number | null): void {
    this.compass.classList.toggle('hidden', degrees === null);
    if (degrees !== null) (this.compass.firstChild as HTMLElement).style.transform = `rotate(${degrees.toFixed(1)}deg)`;
  }

  update(dt: number): void {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toast.classList.add('hidden');
    }
  }
}
