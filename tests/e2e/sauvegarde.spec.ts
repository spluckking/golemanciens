import { expect, test } from '@playwright/test';
import { interactAt, talkTo, waitReady } from './helpers';

/**
 * Critère du jalon 1 : fermer brutalement l'appli pendant une quête, puis la rouvrir —
 * la progression est conservée. (« &save » active l'enregistrement en mode test.)
 */
test('fermer en pleine quête puis rouvrir : « Continuer » et la progression est là', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('?test&save&start=play&sanctuary=hatched&golems=pierre');
  await waitReady(page);

  // Une quête en cours : 1 poule sur 3 ramenée, et quelques pommes.
  await talkTo(page, 'mereBrique', 'Mes trois poules');
  const q = await page.evaluate(() => window.__game!.quests());
  const c = q.chickens[0];
  await interactAt(page, c.x + 1.2, c.z, 'Attraper');
  await expect.poll(() => page.evaluate(() => window.__game!.quests().chickens[0].mode)).toBe('following');
  await page.evaluate(([x, z]) => window.__game!.teleport(x, z), [(q.pen.x0 + q.pen.x1) / 2, (q.pen.z0 + q.pen.z1) / 2]);
  await expect.poll(() => page.evaluate(() => window.__game!.quests().chickens[0].mode), { timeout: 40_000 }).toBe('home');
  await page.evaluate(() => {
    window.__game!.state().food = 9;
  });
  // L'enregistrement se fait aux étapes ; on laisse passer une écriture.
  await page.waitForTimeout(800);

  // Fermeture brutale : on recharge la page sans rien demander au jeu.
  await page.goto('?test&save');
  await page.waitForFunction(() => window.__game?.ready === true);
  await expect(page.getByTestId('btn-play')).toHaveText('Continuer');
  await page.getByTestId('btn-play').tap();
  await waitReady(page);
  await expect(page.getByTestId('btn-jump')).toBeVisible();

  const st = await page.evaluate(() => window.__game!.state());
  expect(st.playerName).toBe('Testeur');
  expect(st.sanctuary.step).toBe('hatched');
  expect(st.golems.map((g) => g.species)).toEqual(['pierre']);
  expect(st.quests.R1).toEqual({ status: 'active', progress: 1 });
  expect(st.food).toBeGreaterThanOrEqual(0);
  const again = await page.evaluate(() => window.__game!.quests());
  expect(again.chickens[0].mode).toBe('home');
  // Pas de lecture de T1 à refaire, pas de prénom à redemander.
  await expect(page.getByTestId('cinematic')).toHaveCount(0);
  await expect(page.getByTestId('name-input')).toHaveCount(0);
});

test('dormir dans le lit enregistre la partie', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('?test&save&start=play&golems=mousse');
  await waitReady(page);
  await page.evaluate(() => {
    window.__game!.state().food = 21;
  });
  const home = await page.evaluate(() => window.__game!.life().home);
  await interactAt(page, home.bed.x + 1.2, home.bed.z, 'Dormir', Math.PI / 2);
  await expect(page.getByTestId('toast')).toHaveText('Bonne nuit ! Partie enregistrée.', { timeout: 8_000 });

  await page.goto('?test&save');
  await page.waitForFunction(() => window.__game?.ready === true);
  await page.getByTestId('btn-play').tap();
  await waitReady(page);
  const st = await page.evaluate(() => window.__game!.state());
  expect(st.food).toBe(21);
  expect(st.lastLantern).toBe('home');
  // On se réveille à la maison.
  const hero = await page.evaluate(() => window.__game!.hero());
  expect(Math.hypot(hero.x - 36.5, hero.z - 95.6)).toBeLessThan(1.5);
});
