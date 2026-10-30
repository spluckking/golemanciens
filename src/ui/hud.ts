import type { GolemData } from '../core/gameState';
import { GOLEMS } from '../data/creatures';
import { frenchTypography } from '../core/text';
import { el } from './dom';
import { uiIcon } from './icons';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Flèche de boussole : pointe large et longue tige, lisible d'un coup d'œil. */
function compassArrow(): HTMLElement {
  const box = el('span', { className: 'compass-arrow' });
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  // Pointe en haut, encoches à la base de la pointe, tige jusqu'en bas.
  path.setAttribute('d', 'M20 2 L33 18 L24 15 L24 38 L16 38 L16 15 L7 18 Z');
  svg.appendChild(path);
  box.appendChild(svg);
  return box;
}

/**
 * HUD : 🍎, éclats, portraits des golems avec leurs PV, boussole, boutons du haut
 * (Journal, Golems, Encyclopédie, Pause), bulle d'information.
 */
export class Hud {
  readonly root: HTMLDivElement;
  private readonly toast: HTMLDivElement;
  private readonly food = el('span', { className: 'stat-value', testId: 'hud-food' });
  private readonly shards = el('span', { className: 'stat-value', testId: 'hud-shards' });
  private readonly golemBox = el('div', { className: 'golem-cards' });
  private readonly compass = el('div', { className: 'compass hidden', testId: 'compass' }, [compassArrow()]);
  private readonly cards = new Map<string, { root: HTMLDivElement; fill: HTMLDivElement; zzz: HTMLSpanElement }>();
  private toastTimer = 0;
  private lastFood = -1;

  constructor(actions: { journal: () => void; golems: () => void; encyclopedia: () => void; pause: () => void }) {
    const buttons = (
      [
        ['journal', 'Journal', 'btn-journal'],
        ['golems', 'Golems', 'btn-golems'],
        ['encyclopedia', 'Encyclopédie', 'btn-encyclopedia'],
        ['pause', 'Pause', 'btn-pause'],
      ] as const
    ).map(([icon, label, id]) => {
      // Icône seule, dans une case de la barre du haut ; le nom reste lu par l'accessibilité.
      const b = el('button', { className: 'btn-top', aria: label, testId: id }, [uiIcon(icon)]);
      b.title = label;
      b.type = 'button';
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      return b;
    });
    buttons[0].addEventListener('click', actions.journal);
    buttons[1].addEventListener('click', actions.golems);
    buttons[2].addEventListener('click', actions.encyclopedia);
    buttons[3].addEventListener('click', actions.pause);
    this.toast = el('div', { className: 'toast hidden', testId: 'toast' });
    const stats = el('div', { className: 'stats' }, [
      el('div', { className: 'stat' }, [uiIcon('apple'), this.food]),
      el('div', { className: 'stat' }, [uiIcon('shard'), this.shards]),
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
    this.toast.textContent = frenchTypography(text);
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
          el('div', { className: 'hp-row' }, [uiIcon('heart'), el('div', { className: 'hp-bar hp-golem' }, [fill])]),
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
