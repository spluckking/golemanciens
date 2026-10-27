import * as THREE from 'three';
import { el } from './dom';

const FLOAT_LIFE_S = 1.1;

interface Floating {
  node: HTMLDivElement;
  pos: THREE.Vector3;
  life: number;
}

interface Tag {
  node: HTMLDivElement;
  fill: HTMLDivElement | null;
}

/**
 * Textes et barres en DOM accrochés à des points du monde 3D (pas de texte dans le WebGL) :
 * chiffres de dégâts flottants, barres de PV, « Zzz ».
 */
export class WorldLabels {
  readonly root = el('div', { className: 'world-labels' });
  private readonly floating: Floating[] = [];
  private readonly tags = new Map<string, Tag>();
  private readonly used = new Set<string>();
  private readonly v = new THREE.Vector3();

  constructor(private readonly camera: THREE.Camera) {}

  /** Chiffre ou texte qui monte et s'efface. */
  float(text: string, x: number, y: number, z: number, className = ''): void {
    const node = el('div', { className: `float-label ${className}`, text });
    this.root.appendChild(node);
    this.floating.push({ node, pos: new THREE.Vector3(x, y, z), life: FLOAT_LIFE_S });
  }

  /** Début d'image : les étiquettes non redemandées seront masquées à la fin. */
  begin(): void {
    this.used.clear();
  }

  /** Barre de PV (ratio 0 à 1) au-dessus d'une entité. */
  bar(id: string, ratio: number, x: number, y: number, z: number, kind: 'golem' | 'monster'): void {
    const tag = this.tag(id, () => {
      const fill = el('div', { className: 'hp-fill' });
      return { node: el('div', { className: `hp-bar hp-${kind}` }, [fill]), fill };
    });
    if (tag.fill) tag.fill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    this.place(tag.node, x, y, z);
  }

  /** Petit texte fixe au-dessus d'une entité (« Zzz »). */
  text(id: string, text: string, x: number, y: number, z: number): void {
    const tag = this.tag(id, () => ({ node: el('div', { className: 'tag-label', text }), fill: null }));
    this.place(tag.node, x, y, z);
  }

  end(dt: number): void {
    for (const [id, tag] of this.tags) if (!this.used.has(id)) tag.node.style.display = 'none';
    for (let i = this.floating.length - 1; i >= 0; i--) {
      const f = this.floating[i];
      f.life -= dt;
      if (f.life <= 0) {
        f.node.remove();
        this.floating.splice(i, 1);
        continue;
      }
      f.pos.y += dt * 1.2;
      f.node.style.opacity = String(Math.min(1, f.life / 0.4));
      this.place(f.node, f.pos.x, f.pos.y, f.pos.z);
    }
  }

  private tag(id: string, create: () => Tag): Tag {
    let tag = this.tags.get(id);
    if (!tag) {
      tag = create();
      this.tags.set(id, tag);
      this.root.appendChild(tag.node);
    }
    this.used.add(id);
    return tag;
  }

  private place(node: HTMLElement, x: number, y: number, z: number): void {
    this.v.set(x, y, z).project(this.camera);
    if (this.v.z > 1 || Math.abs(this.v.x) > 1.2 || Math.abs(this.v.y) > 1.2) {
      node.style.display = 'none';
      return;
    }
    node.style.display = '';
    const sx = (this.v.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-this.v.y * 0.5 + 0.5) * window.innerHeight;
    node.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`;
  }
}
