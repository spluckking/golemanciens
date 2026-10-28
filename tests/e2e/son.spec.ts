import { expect, test } from '@playwright/test';
import { waitReady } from './helpers';

test('le son démarre au premier toucher et la musique suit le jeu', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('?test&start=play&arena=open&golems=pierre&lesson=done');
  await waitReady(page);
  // Avant tout geste : le son est verrouillé, mais la musique voulue est déjà choisie.
  expect(await page.evaluate(() => window.__game!.audio())).toEqual({ state: 'locked', track: 'prairie' });

  await page.mouse.click(640, 300);
  await expect.poll(() => page.evaluate(() => window.__game!.audio().state)).toBe('running');

  // Le gong de l'arène lance la musique du combat.
  await page.evaluate(() => window.__game!.teleport(24.5, 38.5, 0));
  const interact = page.getByTestId('btn-interact');
  await expect(interact).toContainText('Combattre', { timeout: 5_000 });
  await interact.tap();
  await expect.poll(() => page.evaluate(() => window.__game!.audio().track)).toBe('arena');
  expect(errors).toEqual([]);
});
