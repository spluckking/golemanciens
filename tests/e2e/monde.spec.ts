import { expect, test, type Page } from '@playwright/test';

/** Partie de test avec Pierre et Mousse (l'œuf n'arrive qu'à la sous-étape 1.4). */
async function openWithGolems(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('?test&start=play&golems=pierre,mousse');
  await page.waitForFunction(() => window.__game?.ready === true && window.__game.frames() > 10, null, { timeout: 30_000 });
  return errors;
}

/** Place le héros à distance d'une cible, tourné vers elle. */
async function approach(page: Page, x: number, z: number, distance: number): Promise<void> {
  await page.evaluate(
    ([tx, tz, d]) => {
      // Le héros arrive par l'est : il regarde vers −X (angle π/2).
      window.__game!.teleport(tx + d, tz, Math.PI / 2);
    },
    [x, z, distance],
  );
  await page.waitForTimeout(600);
}

test('caisse, combat contre le camp des slimes, coffre, PNJ, journal', async ({ page }) => {
  const errors = await openWithGolems(page);

  // HUD : 2 golems avec leurs PV, 🍎, éclats, boussole.
  await expect(page.getByTestId('golem-card-pierre')).toBeVisible();
  await expect(page.getByTestId('golem-card-mousse')).toBeVisible();
  await expect(page.getByTestId('hud-shards')).toHaveText('0/5');
  await expect(page.getByTestId('compass')).toBeVisible();

  // Casser la première caisse avec la baguette.
  const crate = await page.evaluate(() => window.__game!.life().crates[0]);
  await approach(page, crate.x, crate.z, 3);
  await page.getByTestId('btn-attack').tap();
  await page.waitForFunction((id) => window.__game!.state().brokenCrates.includes(id), crate.id, { timeout: 5_000 });

  // Combat : engager le camp des slimes, les golems les battent.
  const slimes = await page.evaluate(() => window.__game!.life().monsters.filter((m) => m.id.startsWith('slimes')));
  await approach(page, slimes[0].x, slimes[0].z, 5);
  await page.getByTestId('btn-attack').tap();
  await page.waitForFunction(() => window.__game!.life().monsters.some((m) => m.id.startsWith('slimes') && m.mode === 'engaged'), null, {
    timeout: 5_000,
  });
  await expect(page.locator('.float-label').first()).toBeAttached({ timeout: 10_000 });
  await page.waitForFunction(
    () => window.__game!.life().monsters.filter((m) => m.id.startsWith('slimes')).every((m) => m.mode === 'dead'),
    null,
    { timeout: 40_000 },
  );

  // Le coffre du camp donne 3 🍎.
  const food0 = await page.evaluate(() => window.__game!.state().food);
  const chest = await page.evaluate(() => window.__game!.life().chests.find((c) => c.campId === 'slimes')!);
  await page.evaluate(([x, z]) => window.__game!.teleport(x, z + 1.5), [chest.x, chest.z]);
  await expect(page.getByTestId('btn-interact')).toContainText('Ouvrir', { timeout: 5_000 });
  await page.getByTestId('btn-interact').tap();
  await expect.poll(() => page.evaluate(() => window.__game!.state().food)).toBe(food0 + 3);
  await expect(page.getByTestId('hud-food')).toHaveText(String(food0 + 3));

  // Parler à Mère Brique, au village.
  const mere = await page.evaluate(() => window.__game!.life().npcs.find((n) => n.id === 'mereBrique')!);
  await page.evaluate(([x, z]) => window.__game!.teleport(x, z + 1.8, 0), [mere.x, mere.z]);
  await expect(page.getByTestId('btn-interact')).toContainText('Parler', { timeout: 5_000 });
  await page.getByTestId('btn-interact').tap();
  await expect(page.getByTestId('dialog')).toContainText('Mère Brique');
  await expect(page.getByTestId('dialog-text')).toContainText('Ferme-des-Blocs');

  // Budget de rendu au village, la scène la plus chargée.
  await page.waitForTimeout(500);
  const calls = await page.evaluate(() => window.__game!.drawCalls());
  expect(calls).toBeLessThan(150);

  // Journal : l'objectif actif.
  await page.getByTestId('btn-journal').tap();
  await expect(page.getByTestId('journal')).toContainText('Trouver l’œuf dans le sanctuaire de la Prairie');
  await page.getByTestId('journal-close').tap();
  await expect(page.getByTestId('journal')).toBeHidden();

  expect(errors).toEqual([]);
});

test('tous les golems K.O. : retour à la dernière lanterne, golems soignés', async ({ page }) => {
  await openWithGolems(page);
  // Allumer la lanterne du village en passant à côté.
  await page.evaluate(() => window.__game!.teleport(39.5, 89.5));
  await expect(page.getByTestId('toast')).toHaveText('Lanterne allumée', { timeout: 5_000 });
  expect(await page.evaluate(() => window.__game!.state().lastLantern)).toBe('village');

  // Engager les araignées avec des golems presque K.O. et sans attaque (le K.O. est certain).
  const spiders = await page.evaluate(() => window.__game!.life().monsters.filter((m) => m.id.startsWith('spiders')));
  await approach(page, spiders[0].x, spiders[0].z, 4);
  await page.evaluate(() => {
    for (const g of window.__game!.state().golems) {
      g.hp = 1;
      g.atk = 0;
    }
  });
  await page.getByTestId('btn-attack').tap();
  await expect(page.getByTestId('ko-fade')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('ko-fade')).toBeHidden({ timeout: 5_000 });

  const hero = await page.evaluate(() => window.__game!.hero());
  expect(Math.hypot(hero.x - 39.5, hero.z - 89.5)).toBeLessThan(4);
  const golems = await page.evaluate(() => window.__game!.life().golems);
  for (const g of golems) {
    expect(g.ko).toBe(false);
    expect(g.hp).toBe(40);
  }
});

/** Pouce posé sur le joystick et poussé vers le haut, maintenu holdMs. */
async function pushStick(page: Page, holdMs: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 650, id: 1 }] });
  for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 650 - i * 18, id: 1 }] });
  await page.waitForTimeout(holdMs);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('on ressort du puits en marchant', async ({ page }) => {
  await openWithGolems(page);
  // Dans le puits, au centre du village (36, 86), tourné vers le nord.
  await page.evaluate(() => window.__game!.teleport(36.5, 86.5, 0));
  await page.waitForTimeout(500);
  await pushStick(page, 1500);
  const hero = await page.evaluate(() => window.__game!.hero());
  expect(Math.hypot(hero.x - 36.5, hero.z - 86.5)).toBeGreaterThan(1.5);
});

test('« Me débloquer » apparaît quand on pousse sans avancer, et ramène à un endroit sûr', async ({ page }) => {
  await openWithGolems(page);
  // Face au mur de l'Académie (hors de la porte), le héros ne peut pas avancer.
  await page.evaluate(() => window.__game!.teleport(58.5, 35.5, 0));
  await page.waitForTimeout(500);
  const before = await page.evaluate(() => window.__game!.hero());
  // On garde le pouce sur le joystick jusqu'à l'apparition du bouton (3 s de jeu,
  // plus longtemps en temps réel avec le rendu logiciel des tests).
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 650, id: 1 }] });
  for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 650 - i * 18, id: 1 }] });
  const interact = page.getByTestId('btn-interact');
  await expect(interact).toBeVisible({ timeout: 20_000 });
  await expect(interact).toContainText('Me débloquer');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await interact.tap();
  await expect(interact).toBeHidden();
  const after = await page.evaluate(() => window.__game!.hero());
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(1);
});
