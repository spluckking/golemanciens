/** Énigmes du sanctuaire des Vents (CONTENU.md, S5) : logique pure, testée sans rendu. */

// ---------- Les nuages arc-en-ciel ----------

export type CloudColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'violet';
/** L'ordre de l'arc-en-ciel (le vitrail le rappelle). */
export const RAINBOW_ORDER: readonly CloudColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'violet'];

/**
 * Les six nuages, sur une grille de 3 colonnes × 2 rangées (rangée 1 au sud, côté départ),
 * mélangés : on saute de nuage en nuage dans l'ordre, chacun touchant le suivant (même en diagonale).
 */
export const CLOUD_GRID: readonly { color: CloudColor; col: number; row: number }[] = [
  { color: 'violet', col: 0, row: 0 },
  { color: 'green', col: 1, row: 0 },
  { color: 'yellow', col: 2, row: 0 },
  { color: 'blue', col: 0, row: 1 },
  { color: 'red', col: 1, row: 1 },
  { color: 'orange', col: 2, row: 1 },
];

export class CloudPath {
  /** Nombre de nuages déjà allumés, dans l'ordre. */
  lit = 0;

  get solved(): boolean {
    return this.lit >= RAINBOW_ORDER.length;
  }

  /** Le héros arrive sur un nuage : « ok » (le bon), « same » (déjà allumé), « wrong » (on recommence), « done ». */
  step(color: CloudColor): 'ok' | 'same' | 'wrong' | 'done' {
    if (this.solved) return 'done';
    const i = RAINBOW_ORDER.indexOf(color);
    if (i < this.lit) return 'same';
    if (i !== this.lit) {
      this.lit = 0;
      return 'wrong';
    }
    this.lit++;
    return this.solved ? 'done' : 'ok';
  }
}

// ---------- La balance à contrepoids ⚙️ ----------

/** Le plateau de gauche porte 8 ; on équilibre avec les poids 1, 2, 3 et 5 sur celui de droite. */
export const BALANCE_LEFT = 8;
export const BALANCE_WEIGHTS: readonly number[] = [1, 2, 3, 5];

export class Balance {
  /** Poids posés sur le plateau de droite (indices dans BALANCE_WEIGHTS). */
  readonly placed = new Set<number>();

  get right(): number {
    let sum = 0;
    for (const i of this.placed) sum += BALANCE_WEIGHTS[i];
    return sum;
  }

  /** Différence droite − gauche : négative si pas assez, positive si trop. */
  get diff(): number {
    return this.right - BALANCE_LEFT;
  }

  get solved(): boolean {
    return this.diff === 0;
  }

  /** Pose ou retire un poids. */
  toggle(i: number): void {
    if (this.placed.has(i)) this.placed.delete(i);
    else this.placed.add(i);
  }

  /** Inclinaison du fléau (radians, signe de la différence), bornée : on voit si c'est trop ou pas assez. */
  get tilt(): number {
    return Math.max(-0.35, Math.min(0.35, this.diff * 0.07));
  }

  /** Hauteur de la herse (0 fermée, 1 levée) : elle monte avec le plateau de gauche. */
  get gate(): number {
    if (this.solved) return 1;
    return Math.max(0, Math.min(0.85, this.right / BALANCE_LEFT)) * (this.diff > 0 ? 0.3 : 1);
  }
}

/** Toutes les façons de faire 8 avec les poids (chaque combinaison est acceptée). */
export function balanceSolutions(): number[][] {
  const out: number[][] = [];
  for (let mask = 1; mask < 1 << BALANCE_WEIGHTS.length; mask++) {
    const picked = BALANCE_WEIGHTS.filter((_, i) => mask & (1 << i));
    if (picked.reduce((a, b) => a + b, 0) === BALANCE_LEFT) out.push(picked);
  }
  return out;
}
