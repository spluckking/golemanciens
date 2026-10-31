import { expect, test } from '@playwright/test';
import { zapUntil, playFight, waitReady } from './helpers';

type BossView = { webs: { x: number; z: number; cut: boolean }[]; queen: { x: number; z: number } };

test('Les fils d’argent : 3 toiles coupées, la Reine Araignée vaincue, outro O2 et trophée', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('?test&fast&start=play&biome=foret&golems=champignon&forestBoss=active&bossHp=0.3');
  await waitReady(page);

  // Les toiles se coupent d'un coup de baguette, dans l'ordre du sentier.
  const webs = await page.evaluate(() => (window.__game!.life() as unknown as { forestBoss: BossView }).forestBoss.webs);
  expect(webs).toHaveLength(3);
  for (const [i, w] of webs.entries()) {
    await page.evaluate(([x, z]) => window.__game!.teleport(x, z + 3, 0), [w.x, w.z]);
    await page.waitForTimeout(400);
    await zapUntil(page, async () => (await page.evaluate(() => window.__game!.state().biomes.foret.bossSteps)) === i + 1);
  }
  await expect(page.getByTestId('toast')).toContainText('Le sentier est libre');

  // Affronter la Reine : le combat (2 étapes, dont la toile qui fait passer un tour).
  const queen = await page.evaluate(() => (window.__game!.life() as unknown as { forestBoss: BossView }).forestBoss.queen);
  await page.evaluate(([x, z]) => window.__game!.teleport(x, z + 3, 0), [queen.x, queen.z]);
  const interact = page.getByTestId('btn-interact');
  await expect(interact).toContainText('Affronter', { timeout: 5_000 });
  await interact.tap({ force: true });
  await expect(page.getByTestId('combat')).toBeVisible();
  await playFight(page, true, 'combat-victory');
  await expect(page.getByTestId('combat-victory')).toContainText('La Reine Araignée est vaincue');
  await page.getByTestId('combat-victory-ok').tap();

  // Outro O2 (on la passe), puis le trophée.
  await expect(page.getByTestId('cinematic')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('cinematic-skip').tap();
  await expect(page.getByTestId('toast')).toContainText('trophée', { timeout: 20_000 });
  const st = await page.evaluate(() => window.__game!.state());
  expect(st.biomes.foret.bossQuest).toBe('defeated');
  expect(st.trophies).toContain('reineAraignee');
  expect(st.shards).toBe(2);
  expect(st.chapter).toBe(3);
  expect(st.storiesRead).toContain('O2');
  expect(errors).toEqual([]);
});
