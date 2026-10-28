import { expect, test } from '@playwright/test';
import { waitReady } from './helpers';

test('outro finale O6 : volcan, village, médaille, puis le générique', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('?test&fast&cine=O6&golems=pierre');
  await waitReady(page);

  const captions: string[] = [];
  const next = page.getByTestId('cinematic-next');
  while (await page.getByTestId('cinematic').count()) {
    const text = (await page.getByTestId('cinematic-caption').textContent()) ?? '';
    captions.push(text);
    await expect(next).toBeVisible({ timeout: 10_000 });
    await next.tap();
    await expect(page.getByTestId('cinematic-caption').filter({ hasText: text })).toHaveCount(0);
  }
  expect(captions).toHaveLength(5);
  expect(captions[0]).toMatch(/Dragon d.Ombre/);
  expect(captions[4]).toMatch(/pour l.instant/);

  // Le générique défile, avec le prénom et le golem ; on peut le passer.
  await expect(page.getByTestId('credits')).toBeVisible();
  await expect(page.getByTestId('credits-roll')).toContainText('Une aventure de Testeur');
  await expect(page.getByTestId('credits-roll')).toContainText('Pierre');
  await page.getByTestId('credits-skip').tap();
  await expect(page.getByTestId('credits')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__game!.screen())).toBe('play');
  expect(await page.evaluate(() => window.__game!.state().storiesRead)).toContain('O6');
  expect(errors).toEqual([]);
});
