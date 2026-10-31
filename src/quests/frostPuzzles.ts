import type { Dir } from './templePuzzles';

/** Énigmes du sanctuaire gelé (CONTENU.md, S4) : logique pure, testée sans rendu. */

const STEP: Record<Dir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

// ---------- La glissade ----------

/**
 * Salle de glace 6 × 6 (ligne 0 au nord). Le héros entre par le sud en (0, 5) et glisse tout droit
 * jusqu'à un obstacle (bloc ou mur). La sortie est une ouverture du mur nord, au-dessus de la
 * colonne `exit` : glisser vers le nord dans cette colonne fait sortir de la salle.
 */
export interface SlideRoom {
  size: number;
  start: [number, number];
  exit: number;
  rocks: [number, number][];
  hint: Dir;
}

export const SLIDE_ROOM: SlideRoom = {
  size: 6,
  start: [0, 5],
  exit: 4,
  rocks: [
    [1, 1],
    [3, 0],
    [1, 4],
    [4, 2],
    [2, 3],
  ],
  /** Première glissade de la solution, montrée par la flèche d'aide. */
  hint: 'E',
};

/** Épreuve des Étoiles : une salle de 8 × 8, la solution demande 8 glissades (vérifié par test). */
export const GRAND_SLIDE_ROOM: SlideRoom = {
  size: 8,
  start: [0, 7],
  exit: 6,
  rocks: [[3, 1], [3, 0], [7, 0], [0, 4], [4, 6], [2, 5], [5, 6], [3, 4], [1, 0], [4, 7]],
  hint: 'E',
};

/** Case d'arrivée d'une glissade, ou « exit » si le héros sort par l'ouverture nord. */
export function slide(from: [number, number], dir: Dir, room: SlideRoom = SLIDE_ROOM): [number, number] | 'exit' {
  const { size, rocks, exit } = room;
  let [x, y] = from;
  const [dx, dy] = STEP[dir];
  for (;;) {
    const nx = x + dx;
    const ny = y + dy;
    if (ny < 0 && x === exit && dir === 'N') return 'exit';
    if (nx < 0 || ny < 0 || nx >= size || ny >= size) return [x, y];
    if (rocks.some(([rx, ry]) => rx === nx && ry === ny)) return [x, y];
    x = nx;
    y = ny;
  }
}

/** Plus court chemin (parcours en largeur) : la liste des glissades jusqu'à la sortie, ou null. */
export function solveSlide(from: [number, number] = SLIDE_ROOM.start, room: SlideRoom = SLIDE_ROOM): Dir[] | null {
  const key = (p: [number, number]): string => `${p[0]},${p[1]}`;
  const seen = new Map<string, Dir[]>([[key(from), []]]);
  const queue: [number, number][] = [from];
  while (queue.length) {
    const p = queue.shift()!;
    const path = seen.get(key(p))!;
    for (const d of ['N', 'E', 'S', 'W'] as const) {
      const to = slide(p, d, room);
      if (to === 'exit') return [...path, d];
      if (seen.has(key(to))) continue;
      seen.set(key(to), [...path, d]);
      queue.push(to);
    }
  }
  return null;
}

export class SlidePuzzle {
  pos: [number, number];
  out = false;
  slides = 0;

  constructor(readonly room: SlideRoom = SLIDE_ROOM) {
    this.pos = [...room.start];
  }

  /** Une glissade ; renvoie la case d'arrivée (ou « exit »). */
  move(dir: Dir): [number, number] | 'exit' {
    if (this.out) return 'exit';
    const to = slide(this.pos, dir, this.room);
    this.slides++;
    if (to === 'exit') this.out = true;
    else this.pos = to;
    return to;
  }

  reset(): void {
    if (this.out) return;
    this.pos = [...this.room.start];
  }
}

// ---------- La mémoire de glace ----------

/** Les 4 dalles s'allument dans cet ordre ; après 3 échecs, on ne garde que les 3 premières. */
export const MEMORY_SEQUENCE: readonly number[] = [2, 0, 3, 1];
export const MEMORY_EASY_AFTER = 3;

export class IceMemory {
  input: number[] = [];
  failures = 0;
  solved = false;

  get sequence(): readonly number[] {
    return this.failures >= MEMORY_EASY_AFTER ? MEMORY_SEQUENCE.slice(0, 3) : MEMORY_SEQUENCE;
  }

  /** Toucher une dalle : « ok » (bonne, on continue), « wrong » (la séquence sera rejouée), « done ». */
  press(tile: number): 'ok' | 'wrong' | 'done' {
    if (this.solved) return 'done';
    if (this.sequence[this.input.length] !== tile) {
      this.input = [];
      this.failures++;
      return 'wrong';
    }
    this.input.push(tile);
    if (this.input.length === this.sequence.length) {
      this.solved = true;
      return 'done';
    }
    return 'ok';
  }
}

// ---------- Le moulin gelé ⚙️ ----------

export type GearSlot = 'L' | 'M' | 'R';
export type GearSize = 'big' | 'small';
export type Spin = 'cw' | 'ccw';
export const GEAR_SLOTS: readonly GearSlot[] = ['L', 'M', 'R'];
/** Les roues posées à côté : une grande, deux petites. */
export const GEAR_PIECES: readonly GearSize[] = ['big', 'small', 'small'];
/** Sens de la manivelle, et sens de la flèche gravée sur le moulin. */
export const CRANK_SPIN: Spin = 'cw';
export const MILL_ARROW: Spin = 'ccw';

export type GearResult =
  /** Les roues relient la manivelle au moulin : sens de chaque roue (dans l'ordre de la chaîne) et du moulin. */
  | { kind: 'turns'; chain: GearSlot[]; spins: Spin[]; mill: Spin; right: boolean }
  /** Une roue ne touche pas sa voisine (ou aucune roue) : le moulin ne tourne pas. */
  | { kind: 'gap'; after: GearSlot | 'crank' }
  /** Trois roues qui se touchent toutes ou une grande roue qui ne rentre pas : tout se bloque. */
  | { kind: 'jam'; slot: GearSlot };

const flip = (s: Spin): Spin => (s === 'cw' ? 'ccw' : 'cw');

/**
 * Les axes : la manivelle, L, M, R, le moulin. Les petites roues de L et R se touchent (M est un peu
 * en retrait, au-dessus) ; la manivelle touche L, et R touche le moulin. Une grande roue sur M touche
 * à la fois la manivelle et le moulin ; elle est trop grande pour L ou R.
 */
export function gearTrain(placed: Partial<Record<GearSlot, GearSize>>): GearResult {
  for (const s of ['L', 'R'] as const) if (placed[s] === 'big') return { kind: 'jam', slot: s };
  let chain: GearSlot[];
  if (placed.M === 'big') {
    if (placed.L || placed.R) return { kind: 'jam', slot: 'M' };
    chain = ['M'];
  } else if (placed.M === 'small') {
    // Une petite roue au milieu ne touche ni la manivelle ni le moulin.
    if (!placed.L) return { kind: 'gap', after: 'crank' };
    if (placed.R) return { kind: 'jam', slot: 'M' };
    return { kind: 'gap', after: 'L' };
  } else {
    if (!placed.L) return { kind: 'gap', after: 'crank' };
    if (!placed.R) return { kind: 'gap', after: 'L' };
    chain = ['L', 'R'];
  }
  const spins: Spin[] = [];
  let s = CRANK_SPIN;
  for (let i = 0; i < chain.length; i++) spins.push((s = flip(s)));
  const mill = flip(s);
  return { kind: 'turns', chain, spins, mill, right: mill === MILL_ARROW };
}
