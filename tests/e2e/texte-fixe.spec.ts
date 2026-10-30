import { expect, test } from '@playwright/test';
import { waitReady } from './helpers';

/** Position et taille d'un élément, pour vérifier qu'il ne bouge pas. */
function box(testId: string): string {
  const r = document.querySelector(`[data-testid=${testId}]`)!.getBoundingClientRect();
  return [r.top, r.width, r.height].map(Math.round).join('/');
}

test('cinématique : le sous-titre reste en place quand ▶ apparaît', async ({ page }) => {
  await page.goto('?test&start=play&cine=T1');
  await expect(page.getByTestId('cinematic-caption')).toBeVisible({ timeout: 30_000 });
  // Fin de l'arrivée de la carte (0,45 s).
  await page.waitForTimeout(700);
  const before = await page.evaluate(box, 'cinematic-caption');
  await expect(page.getByTestId('cinematic-next')).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(box, 'cinematic-caption')).toBe(before);
});

test('bulle de dialogue : même place avec ou sans le bouton 🔊', async ({ page }) => {
  await page.goto('?test&start=play&golems=pierre');
  await waitReady(page);
  const npc = await page.evaluate(() => window.__game!.life().npcs.find((n) => n.id === 'mereBrique')!);
  await page.evaluate(([x, z]) => window.__game!.teleport(x, z + 1.6, 0), [npc.x, npc.z]);
  await expect(page.getByTestId('btn-interact')).toContainText('Parler', { timeout: 5_000 });
  await page.getByTestId('btn-interact').tap({ force: true });
  await expect(page.getByTestId('dialog-text')).toBeVisible();
  const moves = await page.evaluate(() => {
    const speak = document.querySelector('[data-testid=dialog-speak]')!;
    const measure = (): string => {
      const text = document.querySelector('[data-testid=dialog-text]')!.getBoundingClientRect();
      const bubble = document.querySelector('[data-testid=dialog]')!.getBoundingClientRect();
      return `${Math.round(text.top)}/${Math.round(text.width)}/${Math.round(bubble.height)}`;
    };
    speak.classList.add('hidden');
    const without = measure();
    speak.classList.remove('hidden');
    return [without, measure()];
  });
  expect(moves[0]).toBe(moves[1]);
});
