import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { waitReady } from './helpers';

/** Appui long de 3 s sur le logo (doigt posé), puis le code. */
async function openParent(page: Page, code: string): Promise<void> {
  const logo = page.getByTestId('title-logo');
  await expect(logo).toBeVisible();
  const box = (await logo.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const p = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] });
  await expect(page.getByTestId('parent-pin')).toBeVisible({ timeout: 6_000 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  for (const d of code) await page.getByTestId(`pin-${d}`).tap();
}

test('menu parent : appui long, code, statistiques, réglages, mode test (avec reprise de la partie)', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('?test&save');
  await page.waitForFunction(() => window.__game?.ready === true);

  // Un appui court ne fait rien ; un mauvais code ne passe pas.
  await page.getByTestId('title-logo').tap();
  await expect(page.getByTestId('parent-pin')).toHaveCount(0);
  await openParent(page, '0000');
  await expect(page.getByTestId('parent-pin')).toContainText('Ce n’est pas le bon code');
  for (const d of '1234') await page.getByTestId(`pin-${d}`).tap();
  await expect(page.getByTestId('parent-menu')).toBeVisible();

  // Statistiques.
  await expect(page.getByTestId('parent-stats')).toContainText('Temps de jeu');
  await expect(page.getByTestId('parent-stats')).toContainText('Aucune table ratée');

  // Réglages : rappel de pause, niveau de calcul, nouveau code.
  await page.getByTestId('parent-tab-settings').tap();
  await page.getByTestId('set-pause-min-minus').tap();
  await expect(page.getByTestId('set-pause-min-value')).toHaveText('35 min');
  await page.getByTestId('set-calc-plus').tap();
  await expect(page.getByTestId('set-calc-value')).toHaveText('2');
  await page.getByTestId('parent-code-input').fill('4321');
  await page.getByTestId('parent-code-save').tap();
  const st = await page.evaluate(() => window.__game!.state());
  expect(st.settings).toMatchObject({ pauseMinutes: 35, calcStart: 2, parentCode: '4321' });
  expect(st.levels.calc.level).toBe(2);

  // Mode test : aller avant le Roi Slime (la partie est enregistrée, le jeu redémarre).
  await page.getByTestId('parent-tab-test').tap();
  await Promise.all([page.waitForEvent('load'), page.getByTestId('checkpoint-boss').tap()]);
  await page.waitForFunction(() => window.__game?.ready === true);
  await expect(page.getByTestId('btn-play')).toHaveText('Continuer');
  await page.getByTestId('btn-play').tap();
  await waitReady(page);
  const after = await page.evaluate(() => window.__game!.state());
  expect(after.bossQuest).toBe('active');
  expect(after.arena.wins).toBe(3);
  expect(after.golems).toHaveLength(1);
  expect(after.settings.parentCode).toBe('4321');
  expect(after.settings.pauseMinutes).toBe(35);
});

test('menu parent : export puis import de la partie ; tout effacer avec deux confirmations', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('?test&save&start=play&golems=mousse');
  await waitReady(page);
  await page.evaluate(async () => {
    window.__game!.state().food = 33;
    await window.__game!.save();
  });
  await page.goto('?test&save');
  await page.waitForFunction(() => window.__game?.ready === true);
  await openParent(page, '1234');
  await page.getByTestId('parent-tab-save').tap();

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('parent-export').tap()]);
  expect(download.suggestedFilename()).toMatch(/^golemanciens-Testeur-\d{4}-\d{2}-\d{2}\.json$/);
  const file = JSON.parse(readFileSync((await download.path())!, 'utf8'));
  expect(file.format).toBe('golemanciens-save');
  expect(file.state.golems[0].species).toBe('mousse');

  // On modifie le fichier, puis on l'importe : la partie importée remplace l'actuelle.
  file.state.food = 77;
  await Promise.all([
    page.waitForEvent('load'),
    page.getByTestId('parent-import-file').setInputFiles({ name: 'partie.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) }),
  ]);
  await page.waitForFunction(() => window.__game?.ready === true);
  expect(await page.evaluate(() => window.__game!.state().food)).toBe(77);

  // Un fichier qui n'est pas une sauvegarde est refusé, avec un message.
  await openParent(page, '1234');
  await page.getByTestId('parent-tab-save').tap();
  await page.getByTestId('parent-import-file').setInputFiles({ name: 'autre.json', mimeType: 'application/json', buffer: Buffer.from('{"bonjour": 1}') });
  await expect(page.getByTestId('parent-save-message')).toContainText('n’est pas une sauvegarde');

  // Tout effacer : deux confirmations, puis retour au titre « Jouer ».
  await page.getByTestId('parent-reset').tap();
  await expect(page.getByTestId('parent-reset')).toContainText('Touche encore');
  await page.getByTestId('parent-reset').tap();
  await expect(page.getByTestId('parent-reset')).toContainText('Vraiment');
  await Promise.all([page.waitForEvent('load'), page.getByTestId('parent-reset').tap()]);
  await page.waitForFunction(() => window.__game?.ready === true);
  await expect(page.getByTestId('btn-play')).toHaveText('Jouer');
});

test('bouton Pause, et rappel de pause de Lumibloc (« Continuer » après l’attente)', async ({ page }) => {
  await page.goto('?test&fast&start=play&golems=pierre');
  await waitReady(page);
  await page.getByTestId('btn-pause').tap();
  await expect(page.getByTestId('pause')).toContainText('Le jeu est en pause');
  await expect(page.getByTestId('pause-continue')).toBeEnabled();
  await page.getByTestId('pause-continue').tap();
  await expect(page.getByTestId('pause')).toHaveCount(0);

  // Rappel : on règle un délai très court pour le test.
  await page.evaluate(() => {
    window.__game!.state().settings.pauseMinutes = 0.05;
  });
  await expect(page.getByTestId('pause-reminder')).toContainText('Tu joues depuis un moment', { timeout: 15_000 });
  await expect(page.getByTestId('pause-reminder-continue')).toBeDisabled();
  await expect(page.getByTestId('pause-reminder-continue')).toBeEnabled({ timeout: 10_000 });
  await page.getByTestId('pause-reminder-continue').tap();
  await expect(page.getByTestId('pause-reminder')).toHaveCount(0);
});
