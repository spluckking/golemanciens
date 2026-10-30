import { expect, test } from '@playwright/test';
import { waitReady } from './helpers';

/**
 * Profil de rendu « Haut » (celui de la tablette) : tone mapping, ciel en dégradé, bloom en
 * post-traitement. Les autres parcours tournent en profil « Test » (sans post-traitement) ; celui-ci
 * vérifie que le profil complet démarre sans erreur WebGL et reste dans le budget de dessin.
 */
test('profil Haut : rendu complet sans erreur WebGL, budget de dessin tenu, capture 1280×853', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || /WebGL|GL_INVALID|THREE\.WebGLProgram/i.test(m.text())) errors.push(m.text());
  });
  await page.goto('?test&quality=high&start=play&biome=volcan&golems=pierre&galaxy=pierre');
  await waitReady(page);
  // La lave et l'aura du Galaxie : de quoi faire travailler le bloom.
  await page.evaluate(() => window.__game!.teleport(48.5, 50, 0));
  await page.waitForTimeout(1500);
  // Le post-traitement est actif (passes plein écran comptées à part) et la scène tient le budget.
  await expect(page.getByTestId('debug')).toContainText('post');
  expect(await page.evaluate(() => window.__game!.drawCalls())).toBeLessThan(150);
  await testInfo.attach('profil-haut-volcan', { body: await page.screenshot(), contentType: 'image/png' });
  // Un voyage libère le biome et reconstruit la scène sans erreur.
  await page.evaluate(() => window.__game!.travel('prairie'));
  await waitReady(page);
  await page.waitForTimeout(1000);
  await testInfo.attach('profil-haut-prairie', { body: await page.screenshot(), contentType: 'image/png' });
  expect(errors).toEqual([]);
});
