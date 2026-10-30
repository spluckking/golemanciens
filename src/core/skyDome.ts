import * as THREE from 'three';

/** Rayon du dôme : sous le plan lointain de la caméra (brouillard 64 + 20). */
const DOME_RADIUS = 78;

const VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 zenith;
uniform vec3 horizon;
uniform vec3 ground;
uniform vec3 sunDir;
uniform vec3 sunColor;
varying vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  float h = dir.y;
  // Dégradé : l'horizon s'élargit doucement vers le zénith ; sous l'horizon, le sol renvoie un peu de lumière.
  vec3 col = h >= 0.0 ? mix(horizon, zenith, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(horizon, ground, clamp(-h * 3.0, 0.0, 1.0));
  // Halo du soleil : un cœur net et une large auréole.
  float s = max(dot(dir, sunDir), 0.0);
  col += sunColor * (pow(s, 90.0) * 0.9 + pow(s, 7.0) * 0.18);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * Ciel en dégradé (zénith → horizon) avec le halo du soleil : une sphère centrée sur la caméra,
 * dessinée après le décor, sans écrire de profondeur ni subir de brouillard. L'horizon suit la couleur du brouillard,
 * pour que le décor lointain se fonde exactement dans le ciel. Un seul appel de dessin.
 */
export class SkyDome {
  readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private readonly uniforms: {
    zenith: THREE.IUniform<THREE.Color>;
    horizon: THREE.IUniform<THREE.Color>;
    ground: THREE.IUniform<THREE.Color>;
    sunDir: THREE.IUniform<THREE.Vector3>;
    sunColor: THREE.IUniform<THREE.Color>;
  };
  private readonly hsl = { h: 0, s: 0, l: 0 };

  constructor() {
    this.uniforms = {
      zenith: { value: new THREE.Color() },
      horizon: { value: new THREE.Color() },
      ground: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunColor: { value: new THREE.Color() },
    };
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(DOME_RADIUS, 24, 12), material);
    this.mesh.name = 'sky-dome';
    // Dessiné après le décor opaque, avec test de profondeur : seuls les pixels de ciel visibles sont calculés
    // (le décor plus loin que le dôme est déjà entièrement dans le brouillard, de la couleur de l'horizon).
    this.mesh.renderOrder = 1000;
    this.mesh.frustumCulled = false;
  }

  /**
   * Suit la caméra et reprend l'ambiance du moment : l'horizon (couleur du brouillard), le zénith
   * (celui du biome, ou déduit de l'horizon pendant une cinématique), le sol et le soleil.
   */
  update(camera: THREE.Camera, horizon: THREE.Color, zenith: THREE.Color | null, ground: THREE.Color, sun: THREE.DirectionalLight): void {
    this.mesh.position.copy(camera.position);
    const u = this.uniforms;
    u.horizon.value.copy(horizon);
    if (zenith) u.zenith.value.copy(zenith);
    else {
      // Zénith déduit : la même teinte, plus profonde et plus saturée.
      horizon.getHSL(this.hsl);
      u.zenith.value.setHSL(this.hsl.h, Math.min(1, this.hsl.s * 1.15 + 0.05), this.hsl.l * 0.62);
    }
    u.ground.value.copy(ground).multiplyScalar(0.55).lerp(horizon, 0.35);
    u.sunDir.value.copy(sun.position).normalize();
    u.sunColor.value.copy(sun.color).multiplyScalar(Math.min(1.2, sun.intensity * 0.5));
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
