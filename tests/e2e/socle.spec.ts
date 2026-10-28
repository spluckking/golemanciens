import { expect, test, type CDPSession, type Page } from '@playwright/test';

type HeroPos = { x: number; y: number; z: number; onGround: boolean };

async function openGame(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('?test&start=play');
  await page.waitForFunction(() => window.__game?.ready === true && window.__game.frames() > 10, null, { timeout: 30_000 });
  await page.waitForFunction(() => window.__game!.hero().onGround, null, { timeout: 10_000 });
  return errors;
}

function hero(page: Page): Promise<HeroPos> {
  return page.evaluate(() => window.__game!.hero());
}

/** Vrai glissé tactile (touchStart → touchMove → maintien → touchEnd) via le protocole Chrome. */
async function touchDrag(cdp: CDPSession, from: { x: number; y: number }, to: { x: number; y: number }, holdMs: number): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y, id: 1 }] });
  for (let i = 1; i <= 5; i++) {
    const x = from.x + ((to.x - from.x) * i) / 5;
    const y = from.y + ((to.y - from.y) * i) / 5;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] });
  }
  await new Promise((r) => setTimeout(r, holdMs));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('le monde se charge sans erreur et affiche le HUD', async ({ page }) => {
  const errors = await openGame(page);
  await expect(page.locator('#app canvas')).toBeVisible();
  await expect(page.getByTestId('debug')).toContainText('FPS');
  for (const id of ['btn-jump', 'btn-attack', 'btn-journal', 'btn-golems', 'btn-encyclopedia', 'btn-pause']) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box, id).not.toBeNull();
    expect(box!.width, id).toBeGreaterThanOrEqual(72);
    expect(box!.height, id).toBeGreaterThanOrEqual(72);
  }
  expect(errors).toEqual([]);
});

test('le joystick tactile fait avancer le héros', async ({ page }) => {
  await openGame(page);
  const cdp = await page.context().newCDPSession(page);
  const start = await hero(page);
  // Pouce posé en bas à gauche, glissé vers le haut : le héros avance vers l'Académie (-Z).
  await touchDrag(cdp, { x: 200, y: 650 }, { x: 200, y: 560 }, 1200);
  const end = await hero(page);
  const moved = Math.hypot(end.x - start.x, end.z - start.z);
  expect(moved).toBeGreaterThan(1.5);
  expect(end.z).toBeLessThan(start.z);
});

test('glisser à droite fait tourner la caméra sans bouger le héros', async ({ page }) => {
  await openGame(page);
  const cdp = await page.context().newCDPSession(page);
  const start = await hero(page);
  await touchDrag(cdp, { x: 900, y: 500 }, { x: 1100, y: 500 }, 200);
  const end = await hero(page);
  expect(Math.hypot(end.x - start.x, end.z - start.z)).toBeLessThan(0.05);
});

test('le bouton Saut fait sauter le héros', async ({ page }) => {
  await openGame(page);
  const start = await hero(page);
  const box = (await page.getByTestId('btn-jump').boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const p = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] });
  await page.waitForFunction((y0) => window.__game!.hero().y > y0 + 0.5, start.y, { timeout: 5_000 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
});

test('le bouton Interagir apparaît près de Lumibloc et ouvre une bulle de dialogue', async ({ page }) => {
  await openGame(page);
  // Sur la place du village, loin de tout : pas de bouton.
  await page.evaluate(() => window.__game!.teleport(36.5, 80.5));
  await expect(page.getByTestId('btn-interact')).toBeHidden();
  // Lumibloc attend devant la maison ; on l'aborde par la place.
  const lumi = await page.evaluate(() => window.__game!.life().npcs.find((n) => n.id === 'lumibloc')!);
  await page.evaluate(([x, z]) => window.__game!.teleport(x, z), [lumi.x, lumi.z - 1.8]);
  await expect(page.getByTestId('btn-interact')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('btn-interact')).toContainText('Parler');
  await page.getByTestId('btn-interact').tap();
  await expect(page.getByTestId('dialog')).toBeVisible();
  await expect(page.getByTestId('dialog')).toContainText('Professeur Lumibloc');
  await page.getByTestId('dialog-close').tap();
  await expect(page.getByTestId('dialog')).toBeHidden();
});
