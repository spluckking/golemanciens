/** Éléments avec lesquels le héros peut interagir (PNJ, pierres, leviers, arches…). */
export interface Interactable {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  /** Libellé du bouton Interagir (« Parler », « Lire »…). */
  label: string;
  action: () => void;
}

export class Interactions {
  private readonly items: Interactable[] = [];

  add(item: Interactable): void {
    this.items.push(item);
  }

  /** Tout retirer (changement de biome). */
  clear(): void {
    this.items.length = 0;
  }

  remove(id: string): void {
    const i = this.items.findIndex((it) => it.id === id);
    if (i >= 0) this.items.splice(i, 1);
  }

  /** Position d'un élément actif (mode test). */
  find(id: string): { x: number; z: number } | null {
    const it = this.items.find((i) => i.id === id);
    return it ? { x: it.x, z: it.z } : null;
  }

  /** Identifiants des éléments actifs (mode test). */
  ids(): string[] {
    return this.items.map((it) => it.id);
  }

  /** L'élément le plus proche à portée, ou null. */
  nearest(x: number, y: number, z: number): Interactable | null {
    let best: Interactable | null = null;
    let bestD = Infinity;
    for (const it of this.items) {
      const d = Math.hypot(it.x - x, (it.y - y) * 0.5, it.z - z);
      if (d <= it.radius && d < bestD) {
        best = it;
        bestD = d;
      }
    }
    return best;
  }
}
