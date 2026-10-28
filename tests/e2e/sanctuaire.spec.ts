import { expect, test, type Page } from '@playwright/test';
import { formatText } from '../../src/core/text';
import { CONTENT } from '../../src/data/content';

const NAME = 'Testeur';

async function open(page: Page, extra = ''): Promise<void> {
  await page.goto(`?test&start=play${extra}`);
  await page.waitForFunction(() => window.__game?.ready === true && window.__game.frames() > 10, null, { timeout: 30_000 });
}

/** Répond à l'énigme affichée (bonne ou mauvaise réponse), retrouvée dans la banque par son texte. */
async function answerRiddle(page: Page, correct: boolean): Promise<void> {
  const prompt = await page.getByTestId('question-prompt').textContent();
  const r = CONTENT.riddles.find((x) => formatText(x.text, NAME) === prompt);
  expect(r, `énigme inconnue : ${prompt}`).toBeDefined();
  expect(r!.level).toBe(1);
  const target = correct ? r!.choices[r!.answer] : r!.choices[(r!.answer + 1) % 3];
  await page.locator('.choice', { hasText: formatText(target, NAME) }).first().tap();
}

async function walkOn(page: Page, x: number, z: number): Promise<void> {
  await page.evaluate(([px, pz]) => window.__game!.teleport(px, pz, -Math.PI / 2), [x, z]);
  await page.waitForTimeout(250);
}

test('sanctuaire S1 : pierre-énigme, dalles fleuries, éclosion et choix du golem', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  const s = await page.evaluate(() => window.__game!.sanctuary());
  expect(s.step).toBe('stone');
  await expect(page.getByTestId('compass')).toBeVisible();

  // 1. La pierre-énigme : une erreur fait trembler la pierre, montre l'explication, puis propose une autre énigme.
  await page.evaluate(([x, z]) => window.__game!.teleport(x - 1.6, z, -Math.PI / 2), [s.stone.x, s.stone.z]);
  const interact = page.getByTestId('btn-interact');
  await expect(interact).toContainText('Lire', { timeout: 5_000 });
  await interact.tap();
  await expect(page.getByTestId('btn-jump')).toBeHidden();
  const first = await page.getByTestId('question-prompt').textContent();
  await answerRiddle(page, false);
  await expect(page.getByTestId('explanation')).not.toBeEmpty();
  await page.getByTestId('btn-understood').tap();
  await expect(page.getByTestId('question-prompt')).not.toHaveText(first ?? '');
  await answerRiddle(page, true);
  await expect(page.getByTestId('toast')).toContainText('le passage s’ouvre');
  await expect.poll(() => page.evaluate(() => window.__game!.sanctuary().step)).toBe('tiles');
  await expect(page.getByTestId('btn-jump')).toBeVisible();

  // 2. Les dalles : une erreur éteint tout ; puis rouge, jaune, bleue.
  const tile = (c: string) => s.tiles.find((t) => t.color === c)!;
  await walkOn(page, tile('red').x, tile('red').z);
  await expect.poll(() => page.evaluate(() => window.__game!.sanctuary().tiles.find((t) => t.color === 'red')!.lit)).toBe(true);
  await walkOn(page, tile('violet').x, tile('violet').z);
  await expect(page.getByTestId('toast')).toContainText('On recommence');
  expect((await page.evaluate(() => window.__game!.sanctuary())).tiles.every((t) => !t.lit)).toBe(true);
  for (const c of ['red', 'yellow', 'blue']) await walkOn(page, tile(c).x, tile(c).z);
  await expect.poll(() => page.evaluate(() => window.__game!.sanctuary().step)).toBe('open');
  await expect(page.getByTestId('toast')).toContainText('la porte du sanctuaire s’ouvre');

  // 3. L'œuf éclot : on choisit Mousse, puis un surnom proposé.
  await page.evaluate(([x, z]) => window.__game!.teleport(x - 1.8, z, -Math.PI / 2), [s.nest.x, s.nest.z]);
  await expect(interact).toContainText('Toucher l’œuf', { timeout: 5_000 });
  await interact.tap();
  await expect(page.getByTestId('dialog-text')).toContainText("L'œuf hésite");
  await expect(page.getByTestId('choose-golem')).toBeVisible({ timeout: 6_000 });
  await expect(page.getByTestId('choose-pierre')).toContainText('Coup de poing');
  await expect(page.getByTestId('choose-mousse')).toContainText('Tournesol brûlant');
  await page.getByTestId('choose-mousse').tap();
  await expect(page.getByTestId('nickname')).toBeVisible({ timeout: 5_000 });
  await page.getByTestId('nickname-Trèfle').tap();

  await expect.poll(() => page.evaluate(() => window.__game!.sanctuary().step)).toBe('hatched');
  const golems = await page.evaluate(() => window.__game!.state().golems);
  expect(golems).toHaveLength(1);
  expect(golems[0]).toMatchObject({ species: 'mousse', nickname: 'Trèfle', hp: 40 });
  await expect(page.getByTestId('golem-card-mousse')).toContainText('Trèfle');

  // Le journal passe à l'objectif suivant.
  await page.getByTestId('btn-journal').tap();
  await expect(page.getByTestId('journal')).toContainText('Retourner au village de Ferme-des-Blocs');
  await page.getByTestId('journal-close').tap();
  expect(errors).toEqual([]);
});

test('l’aide de Lumibloc arrive au 3e échec, et « Recommencer » éteint les dalles', async ({ page }) => {
  await open(page, '&sanctuary=tiles');
  const s = await page.evaluate(() => window.__game!.sanctuary());
  const tile = (c: string) => s.tiles.find((t) => t.color === c)!;
  for (let i = 0; i < 3; i++) {
    await walkOn(page, tile('white').x, tile('white').z);
    await walkOn(page, 107.5, 100.5);
  }
  await expect(page.getByTestId('dialog-text')).toContainText('Regarde bien la fresque, de gauche à droite');

  await walkOn(page, tile('red').x, tile('red').z);
  await walkOn(page, tile('yellow').x, tile('yellow').z);
  await page.evaluate(() => window.__game!.teleport(113.5, 100.5, -Math.PI / 2));
  const interact = page.getByTestId('btn-interact');
  await expect(interact).toContainText('Recommencer', { timeout: 5_000 });
  expect((await page.evaluate(() => window.__game!.sanctuary())).tiles.filter((t) => t.lit)).toHaveLength(2);
  await interact.tap();
  await expect.poll(() => page.evaluate(() => window.__game!.sanctuary().tiles.every((t) => !t.lit))).toBe(true);
});

test('choisir Pierre sans surnom', async ({ page }) => {
  await open(page, '&sanctuary=open');
  const s = await page.evaluate(() => window.__game!.sanctuary());
  await page.evaluate(([x, z]) => window.__game!.teleport(x - 1.8, z, -Math.PI / 2), [s.nest.x, s.nest.z]);
  await page.getByTestId('btn-interact').tap();
  await page.getByTestId('choose-pierre').tap({ timeout: 8_000 });
  await page.getByTestId('nickname-keep').tap();
  await expect.poll(() => page.evaluate(() => window.__game!.state().golems.map((g) => g.nickname || g.species))).toEqual(['pierre']);
});
