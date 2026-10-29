import { expect, test, type Page } from '@playwright/test';
import { answerShown, interactAt, playFight, settle, waitReady } from './helpers';

type VolcanView = { guardsLeft: number; dragon: { x: number; z: number }; safe: { x: number; z: number }; bridge: { x: number; z0: number; z1: number } };
const view = (page: Page): Promise<VolcanView> => page.evaluate(() => window.__game!.life() as unknown as VolcanView);

test('finale : T6, la lave fait reculer, les gardiens du chemin, le Dragon en 3 étapes, O6, générique, retour à la Prairie', async ({ page }) => {
  test.setTimeout(420_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Chapitre 6 : le Galaxie est né, l'Arche raconte T6 puis mène au volcan.
  await page.goto('?test&fast&start=play&golems=pierre&galaxy=pierre&unlock=foret,desert,givre,ciel&bossHp=0.3');
  await waitReady(page);
  expect(await page.evaluate(() => window.__game!.state().chapter)).toBe(6);
  const arch = await page.evaluate(() => window.__game!.life().arch);
  await page.evaluate(({ x, z }) => window.__game!.teleport(x - 2, z, 0), arch);
  const interact = page.getByTestId('btn-interact');
  await expect(interact).toContainText('Voyager', { timeout: 5_000 });
  await interact.tap();
  await expect(page.getByTestId('cinematic')).toBeVisible({ timeout: 15_000 });
  const next = page.getByTestId('cinematic-next');
  let shots = 0;
  while (await page.getByTestId('cinematic').count()) {
    const text = (await page.getByTestId('cinematic-caption').textContent()) ?? '';
    await expect(next).toBeVisible({ timeout: 20_000 });
    await next.tap();
    shots++;
    await expect(page.getByTestId('cinematic-caption').filter({ hasText: text })).toHaveCount(0, { timeout: 20_000 });
  }
  expect(shots).toBe(8);
  for (let i = 0; i < 2; i++) await answerShown(page, true);
  await page.getByTestId('reading-success-ok').tap();
  await expect.poll(() => page.evaluate(() => window.__game!.state().biome), { timeout: 30_000 }).toBe('volcan');
  await waitReady(page);

  // La lave fait reculer, sans dégâts.
  const v = await view(page);
  await page.evaluate(([x, z]) => window.__game!.teleport(x, z), [v.bridge.x + 6.5, (v.bridge.z0 + v.bridge.z1) / 2]);
  await expect(page.getByTestId('toast')).toContainText('c’est chaud', { timeout: 10_000 });
  await settle(page, 4);
  const hero = await page.evaluate(() => window.__game!.hero());
  expect(Math.abs(hero.x - (v.bridge.x + 6.5)) + Math.abs(hero.z - (v.bridge.z0 + v.bridge.z1) / 2)).toBeGreaterThan(1);

  // Tant que des gardiens restent, le Dragon n'est pas accessible.
  expect(v.guardsLeft).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__game!.interactables())).not.toContain('boss-dragon');
  await page.evaluate(() => window.__game!.clearCamps());
  await expect(page.getByTestId('toast')).toContainText('chemin est libre', { timeout: 10_000 });

  await interactAt(page, v.dragon.x, v.dragon.z + 5, 'Affronter');
  await expect(page.getByTestId('combat')).toBeVisible();
  await playFight(page, true, 'combat-victory');
  await expect(page.getByTestId('combat-victory')).toContainText('Dragon d’Ombre est vaincu');
  await page.getByTestId('combat-victory-ok').tap();
  await expect(page.getByTestId('cinematic')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('cinematic-skip').tap();
  // Le générique (avec le prénom), puis la Prairie en mode « jeu terminé ».
  await expect(page.getByTestId('credits')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('credits')).toContainText('Testeur');
  await page.getByTestId('credits-skip').tap();
  if (await page.getByTestId('credits-continue').isVisible()) await page.getByTestId('credits-continue').tap();
  await expect.poll(() => page.evaluate(() => window.__game!.state().biome), { timeout: 30_000 }).toBe('prairie');
  await expect(page.getByTestId('toast')).toContainText('terminé l’aventure', { timeout: 20_000 });
  const st = await page.evaluate(() => window.__game!.state());
  expect(st.trophies).toContain('dragon');
  expect(st.chapter).toBe(7);
  expect(errors).toEqual([]);
});
