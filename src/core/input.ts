/** État des commandes, alimenté par le tactile et le clavier, lu une fois par image. */
export class InputState {
  /** Joystick : x vers la droite, y vers l'avant, longueur 0 à 1. */
  stickX = 0;
  stickY = 0;
  /** Touches du clavier (secours sur PC). */
  keyX = 0;
  keyY = 0;
  /** Rotation de caméra accumulée depuis la dernière image (pixels). */
  lookDX = 0;
  lookDY = 0;
  jumpHeld = false;
  private attackQueued = false;
  private interactQueued = false;

  move(): { x: number; y: number } {
    const x = this.stickX + this.keyX;
    const y = this.stickY + this.keyY;
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  }

  pressAttack(): void {
    this.attackQueued = true;
  }

  pressInteract(): void {
    this.interactQueued = true;
  }

  consumeAttack(): boolean {
    const v = this.attackQueued;
    this.attackQueued = false;
    return v;
  }

  consumeInteract(): boolean {
    const v = this.interactQueued;
    this.interactQueued = false;
    return v;
  }

  consumeLook(): { dx: number; dy: number } {
    const v = { dx: this.lookDX, dy: this.lookDY };
    this.lookDX = 0;
    this.lookDY = 0;
    return v;
  }
}

/** Clavier de secours (ZQSD sur AZERTY grâce aux codes physiques, ou flèches). */
export function attachKeyboard(input: InputState, target: Window): () => void {
  const held = new Set<string>();
  const refresh = (): void => {
    input.keyX = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
    input.keyY = (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0) - (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0);
    input.jumpHeld = held.has('Space');
  };
  const down = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.code === 'KeyF' || e.code === 'KeyJ') input.pressAttack();
    if (e.code === 'KeyE') input.pressInteract();
    held.add(e.code);
    refresh();
    if (e.code === 'Space') e.preventDefault();
  };
  const up = (e: KeyboardEvent): void => {
    held.delete(e.code);
    refresh();
  };
  const blur = (): void => {
    held.clear();
    refresh();
  };
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
  target.addEventListener('blur', blur);
  return () => {
    target.removeEventListener('keydown', down);
    target.removeEventListener('keyup', up);
    target.removeEventListener('blur', blur);
  };
}
