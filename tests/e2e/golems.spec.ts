import { expect, test } from '@playwright/test';
import { waitReady } from './helpers';

test('écran Golems : stats, attaques, repas (3 🍎, au plus 4 par stade) et réplique de Lumibloc', async ({ page }) => {
  await page.goto('?test&start=play&golems=mousse');
  await waitReady(page);
  await page.evaluate(() => {
    window.__game!.state().food = 14;
  });
  await page.getByTestId('btn-golems').tap();
  const sheet = page.getByTestId('golem-sheet-mousse');
  await expect(sheet).toContainText('Mousse');
  await expect(sheet).toContainText('Fouet de lianes');
  await expect(sheet).toContainText('Tournesol brûlant');
  await expect(sheet).toContainText('au stade 2');
  await expect(page.getByTestId('golems-tip')).toContainText('4 repas par stade');
  await expect(page.getByTestId('golems-food')).toHaveText('🍎 14');

  await page.getByTestId('meal-hp-mousse').tap();
  await expect(page.getByTestId('golem-hp-mousse')).toContainText('44 / 44');
  await page.getByTestId('meal-atk-mousse').tap();
  await expect(page.getByTestId('golem-atk-mousse')).toContainText('9');
  await page.getByTestId('meal-atk-mousse').tap();
  await page.getByTestId('meal-atk-mousse').tap();
  await expect(page.getByTestId('golem-meals-mousse')).toHaveText('4 / 4');
  await expect(page.getByTestId('golems-food')).toHaveText('🍎 2');
  await expect(page.getByTestId('meal-atk-mousse')).toBeDisabled();
  await expect(sheet).toContainText('il faut évoluer pour manger encore');
  await page.getByTestId('golems-close').tap();

  const g = (await page.evaluate(() => window.__game!.state().golems))[0];
  expect(g).toMatchObject({ maxHp: 44, atk: 11, meals: 4 });
  await expect(page.getByTestId('hud-food')).toHaveText('2');

  // La réplique de Lumibloc ne revient pas.
  await page.getByTestId('btn-golems').tap();
  await expect(page.getByTestId('golems-tip')).toHaveCount(0);
  await page.getByTestId('golems-close').tap();
});

test('encyclopédie : ce qu’on a rencontré se dévoile, le reste est « ??? »', async ({ page }) => {
  await page.goto('?test&start=play&golems=pierre');
  await waitReady(page);
  await page.getByTestId('btn-encyclopedia').tap();
  await expect(page.getByTestId('enc-count-golem')).toContainText('1 / 11');
  await expect(page.getByTestId('enc-count-monster')).toContainText('0 / 15');
  await expect(page.getByTestId('enc-pierre')).toContainText('Un golem de roche costaud');
  await expect(page.getByTestId('enc-slime')).toContainText('???');
  await page.getByTestId('encyclopedia-close').tap();

  // On s'approche du camp des slimes : ils entrent dans l'encyclopédie.
  const slime = await page.evaluate(() => window.__game!.life().monsters.find((m) => m.species === 'slime')!);
  await page.evaluate(([x, z]) => window.__game!.teleport(x + 6, z), [slime.x, slime.z]);
  await expect.poll(() => page.evaluate(() => window.__game!.state().seen)).toContain('slime');
  await page.getByTestId('btn-encyclopedia').tap();
  await expect(page.getByTestId('enc-count-monster')).toContainText('1 / 15');
  await expect(page.getByTestId('enc-slime')).toContainText('Le soleil le dessèche');
  await expect(page.getByTestId('enc-slime')).toContainText('Faible contre');
});
