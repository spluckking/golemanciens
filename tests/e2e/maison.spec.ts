import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, extra = ''): Promise<void> {
  await page.goto(`?test&start=play&golems=pierre${extra}`);
  await page.waitForFunction(() => window.__game?.ready === true && window.__game.frames() > 10, null, { timeout: 30_000 });
}

test('la partie commence dans la maison ; le lit soigne les golems et devient le point de retour', async ({ page }) => {
  await open(page);
  const hero = await page.evaluate(() => window.__game!.hero());
  const home = await page.evaluate(() => window.__game!.life().home);
  // Dans la maison (murs x 32..40, z 93..99), avec Lumibloc devant la porte.
  expect(hero.x).toBeGreaterThan(32);
  expect(hero.x).toBeLessThan(40);
  expect(hero.z).toBeGreaterThan(93);
  expect(hero.z).toBeLessThan(99);
  const lumi = await page.evaluate(() => window.__game!.life().npcs.find((n) => n.id === 'lumibloc')!);
  expect(lumi.z).toBeLessThan(93);
  expect(Math.hypot(lumi.x - 36.5, lumi.z - 92.5)).toBeLessThan(4);

  // Golem fatigué, puis une nuit dans le lit.
  await page.evaluate(() => (window.__game!.state().golems[0].hp = 5));
  await page.evaluate(([x, z]) => window.__game!.teleport(x + 1.2, z, Math.PI / 2), [home.bed.x, home.bed.z]);
  const interact = page.getByTestId('btn-interact');
  await expect(interact).toContainText('Dormir', { timeout: 5_000 });
  await interact.tap({ force: true });
  await expect(page.getByTestId('sleep-fade')).toBeVisible();
  await expect(page.getByTestId('sleep-fade')).toBeHidden({ timeout: 6_000 });
  await expect(page.getByTestId('toast')).toHaveText('Tu as bien dormi ! Tes golems sont en pleine forme.');
  const state = await page.evaluate(() => window.__game!.state());
  expect(state.golems[0].hp).toBe(40);
  expect(state.lastLantern).toBe('home');
});

test('l’étagère attend ses trophées, et montre ceux des boss vaincus', async ({ page }) => {
  await open(page);
  let home = await page.evaluate(() => window.__game!.life().home);
  expect(home.trophies).toBe(0);
  await page.evaluate(([x, z]) => window.__game!.teleport(x - 1.4, z, -Math.PI / 2), [home.shelf.x, home.shelf.z]);
  const interact = page.getByTestId('btn-interact');
  await expect(interact).toContainText('Regarder', { timeout: 5_000 });
  await interact.tap();
  await expect(page.getByTestId('toast')).toHaveText('Ici, tu poseras un trophée après chaque boss vaincu.');

  await open(page, '&trophies=roiSlime');
  home = await page.evaluate(() => window.__game!.life().home);
  expect(home.trophies).toBe(1);
  await page.evaluate(([x, z]) => window.__game!.teleport(x - 1.4, z, -Math.PI / 2), [home.shelf.x, home.shelf.z]);
  await expect(interact).toContainText('Regarder', { timeout: 5_000 });
  await interact.tap();
  await expect(page.getByTestId('toast')).toHaveText('Tes trophées : Roi Slime.');
});

test('Rivet, le golem de maison, fait sa ronde et salue le héros', async ({ page }) => {
  await open(page);
  const start = (await page.evaluate(() => window.__game!.life().home)).rivet;
  await expect.poll(async () => {
    const r = (await page.evaluate(() => window.__game!.life().home)).rivet;
    return Math.hypot(r.x - start.x, r.z - start.z);
  }, { timeout: 15_000 }).toBeGreaterThan(0.5);

  const r = (await page.evaluate(() => window.__game!.life().home)).rivet;
  await page.evaluate(([x, z]) => window.__game!.teleport(x, z - 0.9, Math.PI), [r.x, r.z]);
  const interact = page.getByTestId('btn-interact');
  await expect(interact).toContainText('Parler', { timeout: 5_000 });
  await interact.tap();
  await expect(page.getByTestId('dialog')).toContainText('Rivet');
  await expect(page.getByTestId('dialog-text')).toContainText('Testeur');
});
