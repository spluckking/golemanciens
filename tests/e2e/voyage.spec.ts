import { expect, test } from '@playwright/test';
import { waitReady } from './helpers';

/**
 * En arrivant par l'arche dans un nouveau biome, sa première énigme doit être active :
 * la vie du biome ne doit pas lire l'avancement du biome qu'on vient de quitter (terminé, lui).
 */
for (const [biome, first] of [
  ['foret', 'stone'],
  ['desert', 's3-block'],
  ['givre', 'stone'],
  ['ciel', 'stone'],
] as const) {
  test(`voyage vers ${biome} : la première énigme répond`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('?test&start=play&golems=pierre&sanctuary=hatched');
    await waitReady(page);
    await page.evaluate((b) => window.__game!.travel(b), biome);
    await waitReady(page);
    await page.waitForTimeout(500);
    const ids = await page.evaluate(() => window.__game!.interactables());
    expect(ids.join(' ')).toContain(first);
  });
}
