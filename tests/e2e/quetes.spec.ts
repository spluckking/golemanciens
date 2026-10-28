import { expect, test, type Page } from '@playwright/test';

async function open(page: Page): Promise<void> {
  await page.goto('?test&start=play&sanctuary=hatched&golems=pierre');
  await page.waitForFunction(() => window.__game?.ready === true && window.__game.frames() > 10, null, { timeout: 30_000 });
}

/** Va parler à un villageois et vérifie ce qu'il dit. */
async function talkTo(page: Page, npc: string, expected: string): Promise<void> {
  const n = await page.evaluate((id) => window.__game!.life().npcs.find((x) => x.id === id)!, npc);
  // Les villageois du nord de la place regardent vers le sud : on se place devant eux.
  await page.evaluate(([x, z]) => window.__game!.teleport(x, z + 1.6, 0), [n.x, n.z]);
  const interact = page.getByTestId('btn-interact');
  await expect(interact).toContainText('Parler', { timeout: 5_000 });
  await interact.tap();
  await expect(page.getByTestId('dialog-text')).toContainText(expected);
  await page.getByTestId('dialog-close').tap();
}

const status = (page: Page, id: string) => page.evaluate((q) => window.__game!.quests().log[q as 'R1'].status, id);

test('les 3 quêtes obligatoires : poules, panier, slimes ; l’arène s’ouvre', async ({ page }) => {
  // Parcours long (3 quêtes et un combat) avec le rendu logiciel des tests.
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  const food0 = await page.evaluate(() => window.__game!.state().food);
  await expect(page.locator('.quest-mark').first()).toBeAttached({ timeout: 5_000 });

  // R1 : Mère Brique demande ses poules.
  await talkTo(page, 'mereBrique', 'Mes trois poules');
  expect(await status(page, 'R1')).toBe('active');
  const q = await page.evaluate(() => window.__game!.quests());
  const interact = page.getByTestId('btn-interact');
  // Au milieu de l'enclos : la poule s'arrête juste derrière le héros, donc dedans.
  const penX = (q.pen.x0 + q.pen.x1) / 2;
  const penZ = (q.pen.z0 + q.pen.z1) / 2;
  for (let i = 0; i < 3; i++) {
    const c = (await page.evaluate(() => window.__game!.quests())).chickens[i];
    await page.evaluate(([x, z]) => window.__game!.teleport(x + 1.2, z), [c.x, c.z]);
    await expect(interact).toContainText('Attraper', { timeout: 5_000 });
    await interact.tap();
    await expect.poll(() => page.evaluate((k) => window.__game!.quests().chickens[k].mode, i)).toBe('following');
    await page.evaluate(([x, z]) => window.__game!.teleport(x, z), [penX, penZ]);
    await expect.poll(() => page.evaluate((k) => window.__game!.quests().chickens[k].mode, i), { timeout: 40_000 }).toBe('home');
  }
  expect(await status(page, 'R1')).toBe('ready');
  await talkTo(page, 'mereBrique', 'Mes poules sont rentrées');
  expect(await status(page, 'R1')).toBe('done');
  await expect.poll(() => page.evaluate(() => window.__game!.state().food)).toBe(food0 + 5);

  // R3 : le camp des slimes (proposé ensuite par Mère Brique), vidé par Pierre.
  await talkTo(page, 'mereBrique', 'Des slimes');
  const slimes = await page.evaluate(() => window.__game!.life().monsters.filter((m) => m.id.startsWith('slimes')));
  await page.evaluate(([x, z]) => window.__game!.teleport(x + 5, z, Math.PI / 2), [slimes[0].x, slimes[0].z]);
  await page.waitForTimeout(500);
  await page.getByTestId('btn-attack').tap();
  await expect.poll(() => status(page, 'R3'), { timeout: 60_000 }).toBe('ready');
  await talkTo(page, 'mereBrique', 'Plus un seul slime');

  // R2 : le panier de Pâquerette pour Gaston.
  await talkTo(page, 'paquerette', 'porter ce panier à Gaston');
  expect(await status(page, 'R2')).toBe('ready');
  const gaston = await page.evaluate(() => window.__game!.life().npcs.find((x) => x.id === 'gaston')!);
  await page.evaluate(([x, z]) => window.__game!.teleport(x, z - 1.6, Math.PI), [gaston.x, gaston.z]);
  await expect(interact).toContainText('Parler', { timeout: 5_000 });
  await interact.tap();
  await expect(page.getByTestId('dialog-text')).toContainText('le bon pain de Pâquerette');
  await expect(page.getByTestId('toast')).toContainText('L’arène de la Prairie est ouverte', { timeout: 5_000 });
  await expect.poll(() => page.evaluate(() => window.__game!.state().food)).toBe(food0 + 15);

  // Les slimes du camp ne reviennent plus.
  const cleared = await page.evaluate(() => window.__game!.life().monsters.filter((m) => m.id.startsWith('slimes')).every((m) => m.mode === 'dead'));
  expect(cleared).toBe(true);

  // Journal : les 3 quêtes terminées, l'objectif est l'arène.
  await page.getByTestId('btn-journal').tap();
  const journal = page.getByTestId('journal');
  await expect(journal).toContainText('Aller à l’arène de la Prairie');
  for (const t of ['Les poules envolées', 'Le camp des slimes', 'Le panier du meunier']) await expect(journal).toContainText(t);
  await page.getByTestId('journal-close').tap();
  expect(errors).toEqual([]);
});

test('les 2 quêtes facultatives : la clé du puits et le bouquet', async ({ page }) => {
  test.setTimeout(150_000);
  await open(page);
  const food0 = await page.evaluate(() => window.__game!.state().food);
  const interact = page.getByTestId('btn-interact');

  // O1 : Gaston (après le panier, qu'il ne donne pas : il propose directement la clé).
  const gaston = await page.evaluate(() => window.__game!.life().npcs.find((x) => x.id === 'gaston')!);
  await page.evaluate(([x, z]) => window.__game!.teleport(x, z - 1.6, Math.PI), [gaston.x, gaston.z]);
  await interact.tap();
  await expect(page.getByTestId('dialog-text')).toContainText('la clé du puits');
  const crate = (await page.evaluate(() => window.__game!.quests())).keyCrate;
  // On arrive par l'ouest : à l'est, c'est la rivière.
  await page.evaluate(([x, z]) => window.__game!.teleport(x - 3, z, -Math.PI / 2), [crate.x, crate.z]);
  await page.waitForTimeout(400);
  await page.getByTestId('btn-attack').tap();
  await expect(page.getByTestId('toast')).toContainText('Tu as trouvé la clé du puits', { timeout: 5_000 });
  await page.evaluate(([x, z]) => window.__game!.teleport(x, z - 1.6, Math.PI), [gaston.x, gaston.z]);
  await interact.tap();
  await expect(page.getByTestId('dialog-text')).toContainText('Ma clé');
  await expect.poll(() => page.evaluate(() => window.__game!.state().food)).toBe(food0 + 3);

  // O2 : Pâquerette donne d'abord le panier (obligatoire), puis le bouquet.
  const paq = await page.evaluate(() => window.__game!.life().npcs.find((x) => x.id === 'paquerette')!);
  for (const expected of ['panier', '5 fleurs jaunes']) {
    await page.evaluate(([x, z]) => window.__game!.teleport(x, z + 1.6, 0), [paq.x, paq.z]);
    await interact.tap();
    await expect(page.getByTestId('dialog-text')).toContainText(expected);
    await page.getByTestId('dialog-close').tap();
  }
  const flowers = (await page.evaluate(() => window.__game!.quests())).flowers;
  for (const [i, f] of flowers.entries()) {
    // La case de la fleur est toujours dégagée (herbe, 2 blocs d'air) : on se place dessus.
    await page.evaluate(([x, z]) => window.__game!.teleport(x, z), [f.x, f.z]);
    await expect(interact).toBeVisible({ timeout: 5_000 });
    await expect(interact).toContainText('Cueillir');
    await interact.tap();
    // Attendre que le jeu ait compté la fleur avant de se déplacer (l'appui est traité à l'image suivante).
    await expect.poll(() => page.evaluate(() => window.__game!.quests().log.O2.progress)).toBe(i + 1);
  }
  await expect.poll(() => status(page, 'O2')).toBe('ready');
  const mere = await page.evaluate(() => window.__game!.life().npcs.find((x) => x.id === 'mereBrique')!);
  await page.evaluate(([x, z]) => window.__game!.teleport(x, z + 1.6, 0), [mere.x, mere.z]);
  await interact.tap();
  await expect(page.getByTestId('dialog-text')).toContainText('Un bouquet pour moi');
  await expect.poll(() => page.evaluate(() => window.__game!.state().food)).toBe(food0 + 6);
});
