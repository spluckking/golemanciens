import { expect, test, type Page } from '@playwright/test';
import { answerShown, waitReady } from './helpers';

const step = (page: Page): Promise<string> => page.evaluate(() => window.__game!.forestSanctuary().step);

/** Se place sur (x, z) et touche l'interaction qui porte ce libellé. */
async function use(page: Page, x: number, z: number, label: string): Promise<void> {
  await page.evaluate(([px, pz]) => window.__game!.teleport(px, pz, 0), [x, z]);
  const interact = page.getByTestId('btn-interact');
  await expect(interact).toContainText(label, { timeout: 5_000 });
  await interact.tap();
}

test('sanctuaire de Mousse : pierre, leviers, canaux d’eau, deuxième pierre, éclosion de Champignon', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('?test&fast&start=play&biome=foret&golems=pierre');
  await waitReady(page);
  const s = await page.evaluate(() => window.__game!.forestSanctuary());
  expect(s.step).toBe('stone');

  // Première pierre (niveau 2).
  await use(page, s.stones[0].x - 1.5, s.stones[0].z, 'Lire');
  await answerShown(page, true);
  await expect.poll(() => step(page)).toBe('levers');

  // Leviers : une erreur (la lune d'abord), puis le bon ordre soleil, lune, étoile.
  const lever = (sym: string) => s.levers.find((l) => l.symbol === sym)!;
  await use(page, lever('moon').x, lever('moon').z, 'Abaisser');
  await expect(page.getByTestId('toast')).toContainText('Les leviers remontent');
  for (const sym of ['sun', 'moon', 'star']) await use(page, lever(sym).x, lever(sym).z, 'Abaisser');
  await expect.poll(() => step(page)).toBe('canals');

  // Canaux : on tourne les six morceaux du chemin ; l'eau arrive à la roue.
  for (const [gx, gy] of [[0, 1], [1, 1], [1, 0], [2, 0], [3, 0], [3, 1]]) {
    const p = s.pieces.find((q) => q.gx === gx && q.gy === gy)!;
    await use(page, p.x, p.z, 'Tourner');
  }
  await expect.poll(() => step(page)).toBe('stone2');
  expect((await page.evaluate(() => window.__game!.forestSanctuary())).wet).toBe(6);

  // Deuxième pierre : la porte du temple s'ouvre.
  await use(page, s.stones[1].x - 1.5, s.stones[1].z, 'Lire');
  await answerShown(page, true);
  await expect.poll(() => step(page)).toBe('open');

  // L'œuf : Écorce ou Champignon.
  await use(page, s.nest.x - 1.5, s.nest.z, 'Toucher l’œuf');
  await expect(page.getByTestId('choose-golem')).toBeVisible({ timeout: 8_000 });
  await expect(page.getByTestId('choose-ecorce')).toContainText('Spores de mousse');
  await page.getByTestId('choose-champignon').tap();
  await page.getByTestId('nickname-keep').tap();
  await expect.poll(() => step(page)).toBe('hatched');
  const golems = await page.evaluate(() => window.__game!.state().golems.map((g) => g.species));
  expect(golems).toEqual(['pierre', 'champignon']);
  expect(errors).toEqual([]);
});
