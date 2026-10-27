import type * as THREE from 'three';
import { el } from './dom';

/** Compteur FPS, appels de dessin et triangles (renderer.info). */
export class DebugOverlay {
  readonly root: HTMLDivElement;
  private frames = 0;
  private elapsed = 0;
  fps = 0;

  constructor() {
    this.root = el('div', { className: 'debug', testId: 'debug' });
  }

  update(dt: number, renderer: THREE.WebGLRenderer): void {
    this.frames++;
    this.elapsed += dt;
    if (this.elapsed < 0.5) return;
    this.fps = this.frames / this.elapsed;
    this.frames = 0;
    this.elapsed = 0;
    const { calls, triangles } = renderer.info.render;
    const ratio = renderer.getPixelRatio();
    this.root.textContent = `${this.fps.toFixed(0)} FPS · ${calls} appels · ${(triangles / 1000).toFixed(1)} k triangles · ratio ${ratio.toFixed(2)}`;
  }
}
