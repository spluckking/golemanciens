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

test('titre → prénom → lecture de T1 avec une erreur → Prairie', async ({ page }) => {
  // « fast » : les attentes de 20 s et 10 s deviennent 4 s et 2 s (règles vérifiées en tests unitaires).
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

  // Lecture : « J'ai lu ! » inactif au début, puis actif.
  await expect(page.getByTestId('screen-story')).toContainText(`${NAME} entre en première année`);
  const read = page.getByTestId('btn-read');
  await expect(read).toBeDisabled();
  await expect(read).toBeEnabled({ timeout: 10_000 });
  await read.tap();

  // Une erreur volontaire : retour au texte, sans révéler la bonne réponse.
  await answer(page, false);
  await answer(page, true);
  const retry = page.getByTestId('reading-retry');
  await expect(retry).toContainText('Relis bien le texte, la réponse s’y cache');
  await expect(page.locator('.choice.correct')).toHaveCount(0);
  await page.getByTestId('reading-retry-ok').tap();

  // Relecture, puis 2 nouvelles questions.
  await expect(read).toBeDisabled();
  await expect(read).toBeEnabled({ timeout: 10_000 });
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
