import { expect, test } from '@playwright/test';
import { waitReady } from './helpers';

/** Va devant l'arche du biome et touche « Voyager ». */
async function useArch(page: import('@playwright/test').Page): Promise<void> {
  const arch = await page.evaluate(() => window.__game!.life().arch);
  await page.evaluate(({ x, z }) => window.__game!.teleport(x - 2, z, 0), arch);
  const interact = page.getByTestId('btn-interact');
  await expect(interact).toContainText('Voyager', { timeout: 5_000 });
  await interact.tap();
}

test('arche des éclats : endormie au début, puis voyage vers la Forêt et retour', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // Sans T2 lu, l'arche dort.
  await page.goto('?test&fast&start=play');
  await waitReady(page);
  expect((await page.evaluate(() => window.__game!.life())).arch.open).toBe(false);
  await useArch(page);
  await expect(page.getByTestId('toast')).toContainText('L’arche dort encore');

  // Forêt débloquée : on choisit la destination.
  await page.goto('?test&fast&start=play&unlock=foret&golems=pierre');
  await waitReady(page);
  await useArch(page);
  await page.getByTestId('arch-choice').getByRole('button', { name: 'Forêt Murmurante' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.life().biome)).toBe('foret');
  expect(await page.evaluate(() => window.__game!.state().biome)).toBe('foret');
  // Le golem suit le héros dans la Forêt.
  await expect.poll(() => page.evaluate(() => window.__game!.life().golems.length)).toBe(1);

  // Retour par l'arche de la Forêt : l'avancement de la Prairie n'a pas bougé.
  await useArch(page);
  await page.getByTestId('arch-choice').getByRole('button', { name: 'Prairie de Cubeterre' }).tap();
  await expect.poll(() => page.evaluate(() => window.__game!.life().biome)).toBe('prairie');
  expect(await page.evaluate(() => window.__game!.sanctuary().step)).toBe('stone');
  expect(errors).toEqual([]);
});
