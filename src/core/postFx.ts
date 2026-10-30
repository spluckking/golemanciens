import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * Réglages du bloom (profil « Haut ») : seul ce qui dépasse 1 en HDR brille (runes, cristaux, lave,
 * braseros, auras). Le seuil est appliqué avant le tone mapping, que l'OutputPass fait une seule fois.
 */
const BLOOM_STRENGTH = 0.3;
const BLOOM_RADIUS = 0.35;
const BLOOM_THRESHOLD = 1.0;

/** Passe de rendu de la scène qui compte ses propres appels de dessin (budget de CLAUDE.md). */
class MeteredRenderPass extends RenderPass {
  calls = 0;

  override render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget, deltaTime: number, maskActive: boolean): void {
    const before = renderer.info.render.calls;
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    this.calls = renderer.info.render.calls - before;
  }
}

/**
 * Chaîne d'image : scène en HDR (demi-flottants) → bloom → tone mapping et sortie sRGB.
 * Créée seulement si le GPU sait dessiner dans des cibles flottantes ; sinon le jeu dessine
 * directement à l'écran (même image, sans bloom).
 */
export class PostFx {
  private readonly composer: EffectComposer;
  private readonly scenePass: MeteredRenderPass;
  private readonly bloom: UnrealBloomPass;

  private constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer);
    this.scenePass = new MeteredRenderPass(scene, camera);
    this.bloom = new UnrealBloomPass(size, BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD);
    this.composer.addPass(this.scenePass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  /** La chaîne, ou null si le contexte WebGL ne permet pas les cibles flottantes (headless, vieux GPU). */
  static create(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): PostFx | null {
    if (!renderer.extensions.has('EXT_color_buffer_float') && !renderer.extensions.has('EXT_color_buffer_half_float')) return null;
    try {
      return new PostFx(renderer, scene, camera);
    } catch {
      return null;
    }
  }

  /** Appels de dessin de la scène elle-même (hors passes plein écran du post-traitement). */
  get sceneCalls(): number {
    return this.scenePass.calls;
  }

  render(dt: number): void {
    this.composer.render(dt);
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
  }

  dispose(): void {
    this.bloom.dispose();
    this.composer.dispose();
  }
}
