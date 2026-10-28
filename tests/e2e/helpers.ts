import { expect, type Page } from '@playwright/test';

/** Aides partagées des parcours de bout en bout (mode test du jeu, ?test). */

export async function waitReady(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__game?.ready === true && window.__game.frames() > 10, null, { timeout: 30_000 });
}

/** Touche Interagir près de (x, z) et vérifie son libellé. */
export async function interactAt(page: Page, x: number, z: number, label: string, facing = 0): Promise<void> {
  await page.evaluate(([px, pz, f]) => window.__game!.teleport(px, pz, f), [x, z, facing]);
  const interact = page.getByTestId('btn-interact');
  await expect(interact).toBeVisible({ timeout: 5_000 });
  await expect(interact).toContainText(label);
  await interact.tap();
}

/** Parle à un villageois (on se place au sud de lui) et vérifie le début de sa réplique. */
export async function talkTo(page: Page, npc: string, expected: string): Promise<void> {
  const n = await page.evaluate((id) => window.__game!.life().npcs.find((x) => x.id === id)!, npc);
  await interactAt(page, n.x, n.z + 1.6, 'Parler');
  await expect(page.getByTestId('dialog-text')).toContainText(expected);
  await page.getByTestId('dialog-close').tap();
}

/** Répond à la question affichée, juste ou faux (le jeu donne la bonne réponse en mode test). */
export async function answerShown(page: Page, correct: boolean): Promise<void> {
  await expect(page.getByTestId('question-prompt')).toBeVisible({ timeout: 10_000 });
  await expect.poll(() => page.evaluate(() => window.__game!.answer())).toBeGreaterThanOrEqual(0);
  const right = await page.evaluate(() => window.__game!.answer());
  const count = await page.locator('.choice').count();
  const before = (await page.getByTestId('question-prompt').textContent()) ?? '';
  await page.getByTestId(`choice-${correct ? right : (right + 1) % count}`).tap();
  await expect(page.getByTestId('question-prompt').filter({ hasText: before })).toHaveCount(0);
}

/**
 * Joue un combat au tour par tour jusqu'à l'écran de fin attendu : répond juste (ou faux),
 * en choisissant l'attaque qui vise la faiblesse quand il y en a une.
 */
export async function playFight(page: Page, correct: boolean, endId: string): Promise<void> {
  const end = page.getByTestId(endId);
  // Pas de limite serrée : sur un serveur lent, un combat peut demander beaucoup d'étapes.
  for (let step = 0; step < 3000; step++) {
    if (await end.isVisible()) return;
    for (const id of ['combat-lumibloc-ok', 'btn-understood']) {
      if (await page.getByTestId(id).isVisible()) {
        await page.getByTestId(id).tap();
        continue;
      }
    }
    if ((await page.getByTestId('question-prompt').isVisible()) && (await page.evaluate(() => window.__game!.answer())) >= 0) {
      await answerShown(page, correct);
      continue;
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
