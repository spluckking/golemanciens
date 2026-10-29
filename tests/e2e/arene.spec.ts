import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, extra = ''): Promise<void> {
  await page.goto(`?test&fast&start=play&arena=open&golems=pierre${extra}`);
  await page.waitForFunction(() => window.__game?.ready === true && window.__game.frames() > 10, null, { timeout: 30_000 });
}

/** Frappe le gong de l'arène. */
async function strikeGong(page: Page): Promise<void> {
  await page.evaluate(() => window.__game!.teleport(24.5, 38.5, 0));
  const interact = page.getByTestId('btn-interact');
  await expect(interact).toContainText('Combattre', { timeout: 5_000 });
  await interact.tap();
  await expect(page.getByTestId('combat')).toBeVisible();
}

/**
 * Joue un combat jusqu'à un écran de fin : répond juste (ou faux), en choisissant l'attaque
 * qui vise la faiblesse quand il y en a une.
 */
async function playFight(page: Page, correct: boolean, endId: string): Promise<void> {
  const end = page.getByTestId(endId);
  for (let step = 0; step < 200; step++) {
    if (await end.isVisible()) return;
    if (await page.getByTestId('combat-lumibloc-ok').isVisible()) {
      await page.getByTestId('combat-lumibloc-ok').tap();
      continue;
    }
    if (await page.getByTestId('btn-understood').isVisible()) {
      await page.getByTestId('btn-understood').tap();
      continue;
    }
    if (await page.getByTestId('question-prompt').isVisible()) {
      const right = await page.evaluate(() => window.__game!.answer());
      if (right >= 0) {
        const pick = correct ? right : (right + 1) % (await page.locator('.choice').count());
        await page.getByTestId(`choice-${pick}`).tap();
        await expect(page.getByTestId('question-prompt')).toBeHidden();
        continue;
      }
    }
    const attacks = page.locator('.combat-attack');
    if ((await attacks.count()) > 0) {
      const best = page.locator('.combat-attack[data-super="true"]');
      await ((await best.count()) > 0 ? best.first() : attacks.first()).tap();
      continue;
    }
    await page.waitForTimeout(150);
  }
  throw new Error(`Combat sans fin (attendu : ${endId})`);
}

test('arène : 3 victoires, +4 🍎 chacune, soin complet, puis l’arène est terminée', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  const food0 = await page.evaluate(() => window.__game!.state().food);

  for (let i = 1; i <= 3; i++) {
    await strikeGong(page);
    if (i === 1) await expect(page.getByTestId('combat-lumibloc')).toContainText('il faut réfléchir');
    await expect(page.getByTestId('combat-weakness')).not.toBeEmpty();
    await playFight(page, true, 'combat-victory');
    await expect(page.getByTestId('combat-victory')).toContainText('+4');
    await page.getByTestId('combat-victory-ok').tap();
    if (i === 3) {
      await expect(page.getByTestId('arena-done')).toContainText('3 combats');
      await page.getByTestId('arena-done-ok').tap();
    }
    await expect(page.getByTestId('combat')).toHaveCount(0);
    await expect(page.getByTestId('btn-jump')).toBeVisible();
    const st = await page.evaluate(() => window.__game!.state());
    expect(st.biomes.prairie.arena.wins).toBe(i);
    expect(st.golems[0].hp).toBe(st.golems[0].maxHp);
  }
  expect(await page.evaluate(() => window.__game!.state().food)).toBe(food0 + 12);

  // L'arène terminée propose des combats libres (+2 🍎 en cas de victoire).
  await page.evaluate(() => window.__game!.teleport(24.5, 38.5, 0));
  await page.getByTestId('btn-interact').tap();
  await expect(page.getByTestId('toast')).toContainText('Combat libre');
  await expect(page.getByTestId('combat')).toBeVisible();
  expect(errors).toEqual([]);
});

test('première défaite : réplique de Lumibloc, leçon des faiblesses et quiz, puis la fiche 📒', async ({ page }) => {
  test.setTimeout(240_000);
  await open(page);
  await strikeGong(page);
  await expect(page.getByTestId('combat-sheet')).toBeHidden();
  await playFight(page, false, 'combat-defeat');
  await expect(page.getByTestId('combat-defeat')).toContainText('Tes golems ont besoin de souffler');
  await page.getByTestId('combat-defeat-ok').tap();

  // Leçon : 3 bulles, puis le quiz (une erreur fait revenir la question à la fin).
  for (let i = 0; i < 3; i++) await page.getByTestId('combat-lumibloc-ok').tap();
  let wrongDone = false;
  for (let answered = 0; answered < 3; ) {
    await expect(page.getByTestId('question-prompt')).toBeVisible();
    const right = await page.evaluate(() => window.__game!.answer());
    if (!wrongDone) {
      wrongDone = true;
      await page.getByTestId(`choice-${(right + 1) % 3}`).tap();
      await expect(page.getByTestId('explanation')).not.toBeEmpty();
      await page.getByTestId('btn-understood').tap();
      continue;
    }
    const before = (await page.getByTestId('question-prompt').textContent()) ?? '';
    await page.getByTestId(`choice-${right}`).tap();
    // La question suivante s'affiche aussitôt : on attend que celle-ci soit partie.
    await expect(page.getByTestId('question-prompt').filter({ hasText: before })).toHaveCount(0);
    answered++;
  }
  await expect(page.getByTestId('combat')).toHaveCount(0);
  const st = await page.evaluate(() => window.__game!.state());
  expect(st.biomes.prairie.arena).toEqual({ wins: 0 });
  expect(st.lessonDone).toBe(true);
  expect(st.golems[0].hp).toBe(st.golems[0].maxHp);

  // Au combat suivant, le bouton 📒 ouvre la fiche des faiblesses.
  await strikeGong(page);
  await expect(page.getByTestId('combat-sheet')).toBeVisible();
  await page.getByTestId('combat-sheet').tap();
  await expect(page.getByTestId('weakness-sheet')).toContainText('Les faiblesses');
  await expect(page.locator('.sheet-row')).toHaveCount(2);
  await page.getByTestId('sheet-close').tap();
  await expect(page.getByTestId('weakness-sheet')).toHaveCount(0);
});
