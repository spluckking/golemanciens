import { expect, type Page } from '@playwright/test';

/** Aides partagées des parcours de bout en bout (mode test du jeu, ?test). */

export async function waitReady(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__game?.ready === true && window.__game.frames() > 10, null, { timeout: 30_000 });
}

/** Attend quelques images : après une téléportation, le jeu recalcule l'objet le plus proche. */
export async function settle(page: Page, frames = 3): Promise<void> {
  const start = await page.evaluate(() => window.__game!.frames());
  await page.waitForFunction((f) => window.__game!.frames() >= f, start + frames);
}

/** Touche Interagir près de (x, z) et vérifie son libellé. */
export async function interactAt(page: Page, x: number, z: number, label: string, facing = 0): Promise<void> {
  await page.evaluate(([px, pz, f]) => window.__game!.teleport(px, pz, f), [x, z, facing]);
  await settle(page);
  const interact = page.getByTestId('btn-interact');
  await expect(interact).toBeVisible({ timeout: 5_000 });
  await expect(interact).toContainText(label);
  // Le jeu masque le bouton dès qu'on le touche : sans « force », Playwright pourrait croire le toucher
  // raté et attendre indéfiniment un bouton disparu.
  await interact.tap({ force: true });
  // Le jeu lit le toucher à l'image suivante : on attend avant de bouger le héros.
  await settle(page, 2);
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
    if (endId !== 'combat-defeat' && (await page.getByTestId('combat-defeat').isVisible())) throw new Error('Défaite inattendue pendant le combat');
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
    // Golem actif K.O. : on fait entrer le suivant.
    const switches = page.locator('.combat-switch');
    if ((await switches.count()) > 0) {
      await switches.first().tap();
      continue;
    }
    await page.waitForTimeout(150);
  }
  throw new Error(`Combat sans fin (attendu : ${endId})`);
}

/**
 * Coups de baguette jusqu'à ce que done() soit vrai : sur une machine lente, un coup tombe parfois
 * pendant la recharge et il est ignoré ; on réessaie, comme le ferait un joueur.
 */
export async function zapUntil(page: Page, done: () => Promise<boolean>, timeoutMs = 45_000): Promise<void> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    await page.getByTestId('btn-attack').tap({ force: true, timeout: 2_000 }).catch(() => undefined);
    await page.waitForTimeout(700);
    if (await done()) return;
  }
  expect(await done()).toBe(true);
}
