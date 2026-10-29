import { expect, test } from '@playwright/test';
import { interactAt, waitReady } from './helpers';

test('Rune d’éveil : on la trouve dans la Forêt, puis Champignon évolue au stade 2', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('?test&fast&start=play&biome=foret&golems=champignon&forestSanctuary=hatched');
  await waitReady(page);

  // La Rune cachée, entre les racines au fond de la forêt ; Lumibloc explique quoi en faire.
  const ids = await page.evaluate(() => window.__game!.interactables());
  expect(ids).toContain('foret-rune');
  const target = await page.evaluate(() => (window.__game!.life() as unknown as { rune: { x: number; z: number } }).rune);
  await interactAt(page, target.x, target.z + 1, 'Ramasser');
  await expect(page.getByTestId('dialog-text')).toContainText('Rune d', { timeout: 5_000 });
  await page.getByTestId('dialog-close').tap();
  expect(await page.evaluate(() => window.__game!.state().items.rune)).toBe(1);

  // Écran Golems : « Donner 🔷 Rune d'éveil » ; l'écran se ferme et Champignon évolue.
  await page.getByTestId('btn-golems').tap();
  await expect(page.getByTestId('golems-items')).toContainText('Rune d’éveil × 1');
  await page.getByTestId('evolve-rune-champignon').tap();
  await expect(page.getByTestId('golems')).toHaveCount(0);
  const g = await page.evaluate(() => window.__game!.state().golems[0]);
  expect(g).toMatchObject({ stage: 2, maxHp: 68, atk: 14, hp: 68, meals: 0 });
  expect(await page.evaluate(() => window.__game!.state().items.rune)).toBe(0);
  await page.waitForTimeout(3000);
  expect(errors).toEqual([]);
});
