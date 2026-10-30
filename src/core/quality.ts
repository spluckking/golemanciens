/**
 * Profils de qualité du rendu. « Haut » : la tablette (Xiaomi Pad 7 Pro), avec le bloom des éléments
 * lumineux et un pixel ratio jusqu'à 1,75. « Test » : la CI et le rendu logiciel des tests
 * (SwiftShader), sans post-traitement et à 1,5 au plus, pour ne pas ralentir les parcours.
 */

export type QualityTier = 'high' | 'test';

export interface QualityProfile {
  tier: QualityTier;
  /** Plafond du pixel ratio (CLAUDE.md : budget de performance). */
  maxPixelRatio: number;
  /** Bloom léger sur les émissifs (post-traitement en demi-résolution). */
  bloom: boolean;
}

export const QUALITY: Record<QualityTier, QualityProfile> = {
  high: { tier: 'high', maxPixelRatio: 1.75, bloom: true },
  test: { tier: 'test', maxPixelRatio: 1.5, bloom: false },
};

/**
 * Choix du profil : « ?quality=high|test » l'impose ; sinon le mode test (« ?test ») ou un navigateur
 * piloté (Playwright : navigator.webdriver) donnent « test », et tout le reste « haut ».
 */
export function detectQuality(params: URLSearchParams, webdriver: boolean): QualityProfile {
  const forced = params.get('quality');
  if (forced === 'high' || forced === 'test') return QUALITY[forced];
  if (params.has('test') || webdriver) return QUALITY.test;
  return QUALITY.high;
}
