import { expect, test, type Page } from '@playwright/test';
import { formatText } from '../../src/core/text';
import { CONTENT } from '../../src/data/content';

const NAME = 'Léo';
const T1 = CONTENT.stories.find((s) => s.id === 'T1')!;

/** Retrouve la question affichée dans T1 et touche la bonne (ou une mauvaise) réponse. */
async function answer(page: Page, correct: boolean): Promise<void> {
  const prompt = await page.getByTestId('question-prompt').textContent();
  const q = T1.questions.find((x) => formatText(x.text, NAME) === prompt);
  expect(q, `question inconnue : ${prompt}`).toBeDefined();
  const target = correct ? q!.choices[q!.answer] : q!.choices[(q!.answer + 1) % 3];
  await page.locator('.choice', { hasText: formatText(target, NAME) }).tap();
  // La question a changé, ou il n'y en a plus (fin du tour).
  await expect(page.getByTestId('question-prompt').filter({ hasText: prompt ?? '' })).toHaveCount(0);
}

test('titre → prénom → cinématique de T1 → questions avec une erreur → texte en une bulle → Prairie', async ({ page }) => {
  // « fast » : les temps de lecture sont divisés par 2,5 (règles vérifiées en tests unitaires).
  await page.goto('?test&fast');
  await page.waitForFunction(() => window.__game?.ready === true);

  // Écran titre.
  await expect(page.getByRole('img', { name: 'Les Golémanciens de Cubeterre' })).toBeVisible();
  await page.getByTestId('btn-play').tap();

  // Prénom : le bouton reste inactif tant que le prénom n'est pas valable.
  const ok = page.getByTestId('btn-name-ok');
  await expect(ok).toBeDisabled();
  await page.getByTestId('name-input').fill('  léo ');
  await expect(ok).toBeEnabled();
  await ok.tap();

  // Cinématique : un sous-titre par plan, ▶ apparaît après le temps de lecture. Pas de « Passer » la première fois.
  const caption = page.getByTestId('cinematic-caption');
  await expect(caption).toContainText("C'est la rentrée à l'Académie des Golémanciens");
  await expect(page.getByTestId('cinematic-skip')).toHaveCount(0);
  const next = page.getByTestId('cinematic-next');
  await expect(next).toBeHidden();
  const seen: string[] = [];
  while (await page.getByTestId('cinematic').count()) {
    const text = (await caption.textContent()) ?? '';
    seen.push(text);
    await expect(next).toBeVisible({ timeout: 10_000 });
    await next.tap();
    await expect(page.getByTestId('cinematic-caption').filter({ hasText: text })).toHaveCount(0);
  }
  expect(seen).toHaveLength(11);
  expect(seen[1]).toContain(`${NAME} entre en première année`);
  expect(seen.at(-1)).toContain('Tu es prêt');

  // Une erreur volontaire : le texte revient en une seule bulle, sans révéler la bonne réponse.
  await answer(page, false);
  await answer(page, true);
  const retry = page.getByTestId('reading-retry');
  await expect(retry).toContainText('Relis bien le texte, la réponse s’y cache');
  await expect(page.locator('.choice.correct')).toHaveCount(0);
  await page.getByTestId('reading-retry-ok').tap();

  // Relecture du texte entier (la cinématique n'est pas rejouée), puis 2 nouvelles questions.
  await expect(page.getByTestId('cinematic')).toHaveCount(0);
  await expect(page.getByTestId('screen-story')).toContainText(`${NAME} entre en première année`);
  await expect(page.getByTestId('screen-story')).toContainText('Tu es prêt');
  const read = page.getByTestId('btn-read');
  await expect(read).toBeDisabled();
  await expect(read).toBeEnabled({ timeout: 15_000 });
  await read.tap();
  await answer(page, true);
  await answer(page, true);

  await expect(page.getByTestId('confetti')).toBeAttached();
  await expect(page.getByTestId('reading-success')).toContainText(`Bravo, ${NAME}`);
  await page.getByTestId('reading-success-ok').tap();

  // Arrivée dans la Prairie : les commandes apparaissent.
  await expect(page.getByTestId('btn-jump')).toBeVisible();
  const state = await page.evaluate(() => window.__game!.state());
  expect(state.playerName).toBe(NAME);
  expect(state.storiesRead).toEqual(['T1']);
  expect(state.readingStats.T1).toMatchObject({ reads: 2, asked: 4, correct: 3, completed: true });
});

test('le journal permet de revoir la cinématique de T1, et de la passer', async ({ page }) => {
  await page.goto('?test&start=play');
  await page.waitForFunction(() => window.__game?.ready === true && window.__game.frames() > 10, null, { timeout: 30_000 });
  await page.getByTestId('btn-journal').tap();
  await page.getByTestId('journal-replay-T1').tap();
  await expect(page.getByTestId('journal')).toHaveCount(0);
  await expect(page.getByTestId('cinematic-caption')).toContainText("C'est la rentrée");
  await page.getByTestId('cinematic-skip').tap();
  await expect(page.getByTestId('cinematic')).toHaveCount(0);
  await expect(page.getByTestId('btn-jump')).toBeVisible();
  expect(await page.evaluate(() => window.__game!.screen())).toBe('play');
});
