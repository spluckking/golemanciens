/**
 * Énigmes du temple ensablé (CONTENU.md, S3), sans rendu : le bloc de grès à pousser sur la
 * dalle-pression, et les miroirs du soleil (révision 1.6). Les grilles sont petites : on vérifie
 * par des tests qu'elles ont une solution courte.
 */

export type Dir = 'N' | 'E' | 'S' | 'W';
export const DIRS: readonly Dir[] = ['N', 'E', 'S', 'W'];
export const STEP: Record<Dir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

// ---------- Bloc de grès ----------

/** Salle de 5 × 5 : le bloc, la dalle-pression et une colonne (CONTENU.md : un seul obstacle). */
export const PUSH_ROOM = { size: 5, block: [1, 1] as [number, number], plate: [3, 3] as [number, number], column: [3, 2] as [number, number] };

export class PushPuzzle {
  block: [number, number] = [...PUSH_ROOM.block];
  pushes = 0;

  get solved(): boolean {
    return this.block[0] === PUSH_ROOM.plate[0] && this.block[1] === PUSH_ROOM.plate[1];
  }

  private free(x: number, y: number): boolean {
    const { size, column } = PUSH_ROOM;
    return x >= 0 && y >= 0 && x < size && y < size && !(x === column[0] && y === column[1]);
  }

  /** Le héros pousse le bloc dans cette direction : il avance d'une case si elle est libre. */
  push(dir: Dir): boolean {
    if (this.solved) return false;
    const [dx, dy] = STEP[dir];
    const nx = this.block[0] + dx;
    const ny = this.block[1] + dy;
    if (!this.free(nx, ny)) return false;
    this.block = [nx, ny];
    this.pushes++;
    return true;
  }

  reset(): void {
    if (this.solved) return;
    this.block = [...PUSH_ROOM.block];
    this.pushes = 0;
  }
}

/**
 * Nombre minimal de poussées pour amener le bloc sur la dalle, le héros partant de la case
 * d'entrée (en bas au milieu) et ne pouvant pas traverser le bloc ni la colonne.
 */
export function minPushes(start: [number, number] = PUSH_ROOM.block, hero: [number, number] = [2, 4]): number {
  const { size, column, plate } = PUSH_ROOM;
  const free = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < size && y < size && !(x === column[0] && y === column[1]);
  const key = (b: number[], h: number[]): string => `${b.join(',')}|${h.join(',')}`;
  // Parcours en largeur sur (bloc, héros) ; une poussée coûte 1, un pas du héros 0 (0-1 BFS).
  const dist = new Map<string, number>([[key(start, hero), 0]]);
  const deque: [number[], number[], number][] = [[start, hero, 0]];
  while (deque.length) {
    const [b, h, d] = deque.shift()!;
    if (b[0] === plate[0] && b[1] === plate[1]) return d;
    if ((dist.get(key(b, h)) ?? Infinity) < d) continue;
    for (const dir of DIRS) {
      const [dx, dy] = STEP[dir];
      const hx = h[0] + dx;
      const hy = h[1] + dy;
      if (!free(hx, hy)) continue;
      if (hx === b[0] && hy === b[1]) {
        const bx = b[0] + dx;
        const by = b[1] + dy;
        if (!free(bx, by)) continue;
        const k = key([bx, by], [hx, hy]);
        if ((dist.get(k) ?? Infinity) > d + 1) {
          dist.set(k, d + 1);
          deque.push([[bx, by], [hx, hy], d + 1]);
        }
      } else {
        const k = key(b, [hx, hy]);
        if ((dist.get(k) ?? Infinity) > d) {
          dist.set(k, d);
          deque.unshift([b, [hx, hy], d]);
        }
      }
    }
  }
  return Infinity;
}

// ---------- Miroirs du soleil ----------

/**
 * Salle des miroirs : le rayon entre par la fente ouest sur la ligne 2 et part vers l'est.
 * Chaque miroir renvoie la lumière là où il regarde (4 positions : nord, est, sud, ouest).
 * Le cristal de la porte est en (4, 0).
 */
export const MIRROR_ROOM = {
  size: 5,
  entryRow: 2,
  mirrors: [
    { x: 2, y: 2, start: 'S' as Dir },
    { x: 2, y: 0, start: 'W' as Dir },
  ],
  crystal: [4, 0] as [number, number],
};

/** Trajet du rayon : les cases traversées (dans l'ordre) et s'il atteint le cristal. */
export function traceRay(facing: readonly Dir[]): { path: [number, number][]; lit: boolean } {
  const { size, entryRow, mirrors, crystal } = MIRROR_ROOM;
  const path: [number, number][] = [];
  let x = 0;
  let y = entryRow;
  let dir: Dir = 'E';
  for (let guard = 0; guard < size * size * 2; guard++) {
    if (x < 0 || y < 0 || x >= size || y >= size) break;
    path.push([x, y]);
    if (x === crystal[0] && y === crystal[1]) return { path, lit: true };
    const m = mirrors.findIndex((mm) => mm.x === x && mm.y === y);
    if (m >= 0) dir = facing[m];
    const [dx, dy] = STEP[dir];
    x += dx;
    y += dy;
  }
  return { path, lit: false };
}

export class MirrorPuzzle {
  facing: Dir[] = MIRROR_ROOM.mirrors.map((m) => m.start);
  turns = 0;

  get solved(): boolean {
    return traceRay(this.facing).lit;
  }

  /** Toucher un miroir : un quart de tour dans le sens des aiguilles d'une montre. */
  rotate(i: number): boolean {
    if (this.solved) return false;
    this.facing[i] = DIRS[(DIRS.indexOf(this.facing[i]) + 1) % 4];
    this.turns++;
    return this.solved;
  }

  reset(): void {
    if (this.solved) return;
    this.facing = MIRROR_ROOM.mirrors.map((m) => m.start);
  }
}

// ---------- Dalles-symboles ----------

/** Les deux murs de la suite logique (CONTENU.md, S3) : la suite affichée, les dalles et la bonne. */
export const SYMBOL_WALLS: readonly { sequence: string; tiles: readonly string[]; answer: string }[] = [
  { sequence: '🌙 ☀️ 🌙 ☀️ 🌙 ❓', tiles: ['☀️', '🌙', '⭐'], answer: '☀️' },
  { sequence: '1, 3, 5, ❓', tiles: ['6', '7', '8'], answer: '7' },
];
