import { expect, test, type Page } from '@playwright/test';
import { interactAt, talkTo, waitReady } from './helpers';

const status = (page: Page, id: string): Promise<string> =>
  page.evaluate((q) => (window.__game!.life() as unknown as { forestQuests: { log: Record<string, { status: string }> } }).forestQuests.log[q].status, id);
const quests = (page: Page) =>
  page.evaluate(() => (window.__game!.life() as unknown as { forestQuests: { lantern: { x: number; z: number }; planks: { x: number; z: number; taken: boolean }[]; blue: { x: number; z: number; taken: boolean }[]; red: { x: number; z: number }[]; highCabin: { x: number; y: number; z: number } } }).forestQuests);

test('Cabanes des Cimes : lanterne, planches et pont, loups, champignons bleus, lettre ; l’arène de la Forêt s’ouvre', async ({ page }) => {
  test.setTimeout(420_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('?test&fast&start=play&biome=foret&golems=pierre,champignon&forestSanctuary=hatched');
  await waitReady(page);
  const q = await quests(page);

  // R1 : la lanterne de Pip.
  await talkTo(page, 'pip', 'Ma lanterne');
  await interactAt(page, q.lantern.x, q.lantern.z + 1, 'Ramasser');
  await expect.poll(() => status(page, 'R1')).toBe('ready');
  await talkTo(page, 'pip', 'Ma lanterne !');
  expect(await status(page, 'R1')).toBe('done');

  // R2 : trois planches dans les vieilles caisses (un coup de baguette), puis le pont est réparé.
  await talkTo(page, 'tilleul', 'pont du ruisseau');
  for (const p of q.planks) {
    await page.evaluate(([x, z]) => window.__game!.teleport(x, z + 2, 0), [p.x, p.z]);
    await page.waitForTimeout(400);
    await page.getByTestId('btn-attack').tap();
    await expect.poll(async () => (await quests(page)).planks.filter((c) => c.taken).length).toBeGreaterThan(q.planks.indexOf(p));
  }
  expect(await status(page, 'R2')).toBe('ready');
  await talkTo(page, 'tilleul', 'Trois belles planches');

  // R3 : les loups du ruisseau, vaincus par les golems.
  await talkTo(page, 'noisette', 'loups');
  const wolves = await page.evaluate(() => window.__game!.life().monsters.filter((m) => m.id.startsWith('foret-loups')));
  await page.evaluate(([x, z]) => window.__game!.teleport(x + 5, z, Math.PI / 2), [wolves[0].x, wolves[0].z]);
  // On attend que les golems aient rejoint le héros : sinon les loups abandonnent la poursuite.
  await expect
    .poll(() => page.evaluate(() => window.__game!.life().golems.every((g) => Math.hypot(g.x - window.__game!.hero().x, g.z - window.__game!.hero().z) < 4)), { timeout: 15_000 })
    .toBe(true);
  await page.getByTestId('btn-attack').tap();
  // Si un loup abandonne la poursuite, on retourne le chercher.
  for (let i = 0; i < 60 && (await status(page, 'R3')) !== 'ready'; i++) {
    await page.waitForTimeout(2000);
    const alive = await page.evaluate(() => window.__game!.life().monsters.filter((m) => m.id.startsWith('foret-loups') && m.mode !== 'dead'));
    if (alive.length && alive.every((m) => m.mode !== 'engaged')) {
      await page.evaluate(([x, z]) => window.__game!.teleport(x + 4, z, Math.PI / 2), [alive[0].x, alive[0].z]);
      await page.waitForTimeout(1500);
      await page.getByTestId('btn-attack').tap();
    }
  }
  expect(await status(page, 'R3')).toBe('ready');
  await talkTo(page, 'noisette', 'ruisseau est calme');
  await expect(page.getByTestId('toast')).toContainText('L’arène de la Forêt est ouverte', { timeout: 5_000 });

  // O1 : un champignon rouge ne compte pas ; les 4 bleus, oui.
  await talkTo(page, 'noisette', 'champignons bleus');
  await interactAt(page, q.red[0].x, q.red[0].z + 1, 'Cueillir');
  await expect(page.getByTestId('toast')).toContainText('rouge');
  for (const [i, b] of q.blue.entries()) {
    await interactAt(page, b.x, b.z + 1, 'Cueillir');
    // Chaque champignon bleu compte (un rouge voisin pourrait être le plus proche : on vérifie).
    await expect.poll(async () => (await quests(page)).blue.filter((c) => c.taken).length, { timeout: 5_000 }).toBe(i + 1);
  }
  await expect.poll(() => status(page, 'O1')).toBe('ready');

  // O2 : la lettre du hibou, à la cabane la plus haute (on y monte par les escaliers ; ici, on s'y place).
  await talkTo(page, 'pip', 'lettre');
  await page.evaluate(([x, y, z]) => window.__game!.teleportAt(x, y, z), [q.highCabin.x, q.highCabin.y, q.highCabin.z + 1]);
  await expect(page.getByTestId('btn-interact')).toContainText('Déposer la lettre', { timeout: 5_000 });
  await page.getByTestId('btn-interact').tap();
  await expect.poll(() => status(page, 'O2')).toBe('ready');
  expect(errors).toEqual([]);
});
