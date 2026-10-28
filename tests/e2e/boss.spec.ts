import { expect, test } from '@playwright/test';
import { interactAt, playFight, waitReady } from './helpers';

test('Roi Slime : golems soignés au départ, défaite, « Réessayer » relance tout de suite, « Plus tard » ramène au marais', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('?test&fast&start=play&arena=open&boss=active&lesson=done&golems=pierre');
  await waitReady(page);
  // Golem fatigué (soigné au départ du combat) et fragile, pour que la défaite arrive vite.
  await page.evaluate(() => {
    const s = window.__game!.state();
    s.tutorialsSeen.push('firstArena', 'weakness', 'combatMistake');
    s.golems[0].maxHp = 8;
    s.golems[0].hp = 3;
  });
  await interactAt(page, 20.5, 112.5, 'Affronter');
  await expect(page.getByTestId('combat-monster-name')).toHaveText('Roi Slime');
  await expect(page.getByTestId('combat-weakness')).toContainText('Soleil');
  await expect.poll(() => page.evaluate(() => window.__game!.fight()?.golem.hp)).toBe(8);

  await playFight(page, false, 'combat-defeat');
  await page.getByTestId('combat-defeat-ok').tap();
  await page.getByTestId('boss-retry-0').tap();
  await expect(page.getByTestId('combat')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__game!.fight()?.monster.hp)).toBe(54);

  await playFight(page, false, 'combat-defeat');
  await page.getByTestId('combat-defeat-ok').tap();
  await page.getByTestId('boss-retry-1').tap();
  await expect(page.getByTestId('combat')).toHaveCount(0);
  await expect(page.getByTestId('btn-jump')).toBeVisible();
  const st = await page.evaluate(() => window.__game!.state());
  expect(st.bossQuest).toBe('active');
  expect(st.shards).toBe(0);
  expect(st.golems[0].hp).toBe(8);
});
