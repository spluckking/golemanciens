import { expect, test, type Page } from '@playwright/test';
import { answerShown, interactAt, waitReady } from './helpers';

const step = (page: Page): Promise<string> => page.evaluate(() => window.__game!.forestSanctuary().step);

/** Se place sur (x, z) et touche l'interaction qui porte ce libellé. */
const use = (page: Page, x: number, z: number, label: string): Promise<void> => interactAt(page, x, z, label);

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
  const lever = s.levers[1];
  await use(page, lever.x, lever.z, 'Résoudre');
  await page.getByTestId('lever-moon').tap();
  await expect(page.getByTestId('lever-message')).toContainText('Les leviers remontent');
  for (const sym of ['sun', 'moon', 'star']) await page.getByTestId(`lever-${sym}`).tap();
  await expect.poll(() => step(page)).toBe('canals');

  // Canaux : on tourne les six morceaux du chemin ; l'eau arrive à la roue.
  await expect(page.getByTestId('btn-interact')).toContainText('Résoudre', { timeout: 15_000 }).catch(() => undefined);
  const canal = await page.evaluate(() => window.__game!.interactionAt('s2-canals'));
  await use(page, canal!.x, canal!.z, 'Résoudre');
  for (const [gx, gy] of [[0, 1], [1, 1], [1, 0], [2, 0], [3, 0], [3, 1]]) await page.getByTestId(`canal-${gx}-${gy}`).tap();
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
