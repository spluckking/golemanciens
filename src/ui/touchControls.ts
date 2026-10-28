import type { InputState } from '../core/input';
import { el } from './dom';

const STICK_RADIUS = 64;
const LOOK_SPEED = 1;

/**
 * Commandes tactiles en DOM : joystick dynamique à gauche, zone de caméra à droite,
 * boutons Saut, Baguette et Interagir (contextuel). Fonctionne aussi à la souris.
 */
export class TouchControls {
  readonly root: HTMLDivElement;
  private readonly stickBase: HTMLDivElement;
  private readonly stickKnob: HTMLDivElement;
  private readonly interactBtn: HTMLButtonElement;
  private readonly interactLabel: HTMLSpanElement;
  private stickPointer: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private lookPointer: number | null = null;
  private lookLast = { x: 0, y: 0 };

  constructor(private readonly input: InputState) {
    const stickZone = el('div', { className: 'zone zone-stick', testId: 'stick-zone' });
    const lookZone = el('div', { className: 'zone zone-look', testId: 'look-zone' });
    this.stickKnob = el('div', { className: 'stick-knob' });
    this.stickBase = el('div', { className: 'stick-base', testId: 'stick' }, [this.stickKnob]);
    stickZone.appendChild(this.stickBase);

    const jump = this.button('btn-action btn-jump', '⬆', 'Saut', 'btn-jump');
    const attack = this.button('btn-action btn-attack', '✦', 'Baguette', 'btn-attack');
    this.interactLabel = el('span', { className: 'btn-label', text: 'Parler' });
    this.interactBtn = el('button', { className: 'btn-action btn-interact hidden', aria: 'Interagir', testId: 'btn-interact' }, [
      el('span', { className: 'btn-icon', text: '✋' }),
      this.interactLabel,
    ]);

    this.root = el('div', { className: 'controls' }, [stickZone, lookZone, attack, jump, this.interactBtn]);

    stickZone.addEventListener('pointerdown', (e) => this.stickStart(e));
    lookZone.addEventListener('pointerdown', (e) => this.lookStart(e));
    window.addEventListener('pointermove', (e) => this.pointerMove(e));
    window.addEventListener('pointerup', (e) => this.pointerEnd(e));
    window.addEventListener('pointercancel', (e) => this.pointerEnd(e));

    this.hold(jump, (down) => (input.jumpHeld = down));
    this.tap(attack, () => input.pressAttack());
    this.tap(this.interactBtn, () => input.pressInteract());
  }

  /** Affiche le bouton Interagir avec un libellé, ou le masque (null). */
  setInteract(label: string | null): void {
    this.interactBtn.classList.toggle('hidden', label === null);
    if (label !== null && this.interactLabel.textContent !== label) this.interactLabel.textContent = label;
  }

  private button(className: string, icon: string, label: string, testId: string): HTMLButtonElement {
    return el('button', { className, aria: label, testId }, [
      el('span', { className: 'btn-icon', text: icon }),
      el('span', { className: 'btn-label', text: label }),
    ]);
  }

  private tap(btn: HTMLElement, action: () => void): void {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.add('pressed');
      action();
    });
    const release = (): void => btn.classList.remove('pressed');
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', release);
  }

  private hold(btn: HTMLElement, set: (down: boolean) => void): void {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.add('pressed');
      set(true);
    });
    const release = (): void => {
      btn.classList.remove('pressed');
      set(false);
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', release);
  }

  private stickStart(e: PointerEvent): void {
    if (this.stickPointer !== null) return;
    e.preventDefault();
    this.stickPointer = e.pointerId;
    this.stickOrigin = { x: e.clientX, y: e.clientY };
    this.stickBase.classList.add('active');
    // Le joystick apparaît exactement sous le pouce : coordonnées relatives à sa zone,
    // qui ne commence pas en haut de l'écran.
    const zone = (this.stickBase.parentElement ?? this.root).getBoundingClientRect();
    this.stickBase.style.left = `${e.clientX - zone.left}px`;
    this.stickBase.style.top = `${e.clientY - zone.top}px`;
    this.setKnob(0, 0);
  }

  private lookStart(e: PointerEvent): void {
    if (this.lookPointer !== null) return;
    e.preventDefault();
    this.lookPointer = e.pointerId;
    this.lookLast = { x: e.clientX, y: e.clientY };
  }

  private pointerMove(e: PointerEvent): void {
    if (e.pointerId === this.stickPointer) {
      let dx = e.clientX - this.stickOrigin.x;
      let dy = e.clientY - this.stickOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len > STICK_RADIUS) {
        dx = (dx / len) * STICK_RADIUS;
        dy = (dy / len) * STICK_RADIUS;
      }
      this.setKnob(dx, dy);
      // Petite zone morte au centre.
      const mag = Math.min(1, len / STICK_RADIUS);
      const k = mag < 0.12 ? 0 : (mag - 0.12) / 0.88 / Math.max(mag, 1e-6);
      this.input.stickX = (dx / STICK_RADIUS) * k;
      this.input.stickY = (-dy / STICK_RADIUS) * k;
    } else if (e.pointerId === this.lookPointer) {
      this.input.lookDX += (e.clientX - this.lookLast.x) * LOOK_SPEED;
      this.input.lookDY += (e.clientY - this.lookLast.y) * LOOK_SPEED;
      this.lookLast = { x: e.clientX, y: e.clientY };
    }
  }

  private pointerEnd(e: PointerEvent): void {
    if (e.pointerId === this.stickPointer) {
      this.stickPointer = null;
      this.input.stickX = 0;
      this.input.stickY = 0;
      this.stickBase.classList.remove('active');
      this.stickBase.style.left = '';
      this.stickBase.style.top = '';
      this.setKnob(0, 0);
    } else if (e.pointerId === this.lookPointer) {
      this.lookPointer = null;
    }
  }

  private setKnob(dx: number, dy: number): void {
    this.stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
}
