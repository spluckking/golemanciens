import { expect, test } from '@playwright/test';
import { answerShown, waitReady } from './helpers';

test('chapitre 2 : l’Arche des éclats raconte T2 (cinématique et questions), puis mène à la Forêt', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('?test&fast&start=play&chapter=2');
  await waitReady(page);
  expect(await page.evaluate(() => window.__game!.life().arch.open)).toBe(true);

  // On touche l'arche : la cinématique de T2 commence.
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
  expect(shots).toBe(7);

  // Deux bonnes réponses : la lecture est réussie, et l'on arrive dans la Forêt.
  for (let i = 0; i < 2; i++) await answerShown(page, true);
  await page.getByTestId('reading-success-ok').tap();
  await expect.poll(() => page.evaluate(() => window.__game!.life().biome), { timeout: 15_000 }).toBe('foret');
  const st = await page.evaluate(() => window.__game!.state());
  expect(st.storiesRead).toContain('T2');
  expect(st.biome).toBe('foret');
  expect(errors).toEqual([]);
});
