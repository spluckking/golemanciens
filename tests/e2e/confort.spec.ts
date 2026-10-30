import { expect, test, type Page } from '@playwright/test';
import { waitReady } from './helpers';


/** Le bouton est entièrement dans l'écran. */
async function inView(page: Page, testId: string): Promise<void> {
  const box = (await page.getByTestId(testId).boundingBox())!;
  const size = page.viewportSize()!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(size.height);
}

for (const [name, viewport] of [
  ['tablette', { width: 1280, height: 720 }],
  ['téléphone', { width: 892, height: 412 }],
] as const) {
  test(`${name} : Fermer reste visible dans le journal, l’encyclopédie et l’écran Golems`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('?test&start=play&golems=pierre,mousse');
    await waitReady(page);
    for (const [open, close] of [['btn-journal', 'journal-close'], ['btn-encyclopedia', 'encyclopedia-close'], ['btn-golems', 'golems-close']]) {
      await page.getByTestId(open).tap({ force: true });
      await expect(page.getByTestId(close)).toBeVisible();
      await inView(page, close);
      await page.getByTestId(close).tap();
    }
  });
}

test('arène : la manche est affichée, et on peut quitter après confirmation sans rien perdre', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('?test&fast&start=play&arena=open&golems=pierre,mousse&lesson=done');
  await waitReady(page);
  await page.evaluate(() => window.__game!.teleport(24.5, 38.5, 0));
  await expect(page.getByTestId('btn-interact')).toContainText('Combattre', { timeout: 5_000 });
  await page.getByTestId('btn-interact').tap();
  await expect(page.getByTestId('combat-round')).toHaveText('Combat 1 / 3');
  for (let i = 0; i < 8 && !(await page.getByTestId('combat-leave').isVisible()); i++) {
    const ok = page.getByTestId('combat-lumibloc-ok');
    if (await ok.isVisible()) await ok.tap();
    await page.waitForTimeout(500);
  }

  // Changer de golem ne donne pas la main au monstre.
  await page.getByTestId('switch-mousse').tap();
  await expect(page.getByTestId('combat-golem-name')).toHaveText('Mousse');
  await page.waitForTimeout(800);
  await expect(page.getByTestId('attack-a1')).toBeVisible();
  expect(await page.evaluate(() => window.__game!.state().golems.every((g) => g.hp === g.maxHp))).toBe(true);

  // Annuler, puis confirmer.
  await page.getByTestId('combat-leave').tap();
  await page.getByTestId('combat-leave-confirm-0').tap();
  await expect(page.getByTestId('combat')).toBeVisible();
  await page.getByTestId('combat-leave').tap();
  await page.getByTestId('combat-leave-confirm-1').tap();
  await expect(page.getByTestId('combat')).toHaveCount(0);
  expect(await page.evaluate(() => window.__game!.state().biomes.prairie.arena.wins)).toBe(0);
});

test('pause : volumes réglables et sortie avec confirmation', async ({ page }) => {
  await page.goto('?test&start=play&golems=pierre');
  await waitReady(page);
  await page.getByTestId('btn-pause').tap({ force: true });
  await inView(page, 'pause-continue');
  await page.getByTestId('pause-music-minus').tap();
  await expect(page.getByTestId('pause-music-value')).toHaveText('50 %');
  expect(await page.evaluate(() => window.__game!.state().settings.musicVolume)).toBeCloseTo(0.5);
  await page.getByTestId('pause-quit').tap();
  await page.getByTestId('quit-confirm-0').tap();
  await expect(page.getByTestId('pause')).toBeVisible();
  await page.getByTestId('pause-continue').tap();
  await expect(page.getByTestId('pause')).toHaveCount(0);
});
