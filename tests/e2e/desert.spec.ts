import { expect, test, type Page } from '@playwright/test';
import { answerShown, interactAt, playFight, settle, talkTo, waitReady } from './helpers';

type P = { x: number; z: number };
type Temple = { step: string; blockPos: P; mirrorPos: P[]; tiles: P[]; stone: P; nest: P; wall: number; lit: boolean };
type DesertView = {
  temple: Temple;
  desertQuests: { log: Record<string, { status: string; progress: number }>; full: boolean; crates: (P & { taken: boolean })[]; pieces: (P & { taken: boolean })[]; camel: P & { mode: string }; pen: P };
  desertBoss: { drums: (P & { struck: boolean })[]; worm: P };
};
const view = (page: Page): Promise<DesertView> => page.evaluate(() => window.__game!.life() as unknown as DesertView);
const temple = async (page: Page): Promise<Temple> => (await view(page)).temple;

test('temple ensablé : bloc de grès, miroirs du soleil, dalles-symboles, pierre, éclosion de Cuivre', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  await page.goto('?test&fast&start=play&biome=desert&golems=pierre');
  await waitReady(page);
  expect((await temple(page)).step).toBe('push');

  // Bloc de grès, sur le plateau 2D : deux fois vers le sud, deux fois vers l'est.
  const start = (await temple(page)).blockPos;
  await interactAt(page, start.x + 1, start.z + 1, 'Résoudre');
  for (const d of ['S', 'S', 'E', 'E']) await page.getByTestId(`dpad-${d}`).tap();
  await expect.poll(async () => (await temple(page)).step).toBe('mirrors');

  // Miroirs, sur le plateau 2D : deux quarts de tour chacun ; le rayon atteint le cristal.
  const t = await temple(page);
  await interactAt(page, t.mirrorPos[0].x + 1, t.mirrorPos[0].z, 'Résoudre');
  await expect(page.getByTestId('mirror-board')).toBeVisible();
  await page.getByTestId('mirror-0').tap();
  await page.getByTestId('mirror-restart').tap();
  for (const i of [0, 0, 1, 1]) await page.getByTestId(`mirror-${i}`).tap();
  await expect(page.getByTestId('mirror-crystal')).toHaveClass(/lit/);
  await expect(page.getByTestId('mirror-board')).toHaveCount(0);
  await expect.poll(async () => (await temple(page)).step).toBe('symbols');

  // Dalles-symboles, sur le plateau 2D : ☀️ (première dalle), puis 7 (deuxième dalle).
  await interactAt(page, t.tiles[1].x, t.tiles[1].z + 1, 'Résoudre');
  await page.getByTestId('symbol-0').tap();
  await expect(page.getByTestId('symbol-sequence')).toContainText('1, 3, 5');
  await page.getByTestId('symbol-1').tap();
  await expect.poll(async () => (await temple(page)).step).toBe('stone3');

  // Pierre-énigme de niveau 3, puis l'œuf : Sable ou Cuivre.
  await interactAt(page, t.stone.x - 1.5, t.stone.z, 'Lire');
  await answerShown(page, true);
  await expect.poll(async () => (await temple(page)).step).toBe('open');
  await interactAt(page, t.nest.x - 1.5, t.nest.z, 'Toucher l’œuf');
  await expect(page.getByTestId('choose-sable')).toContainText('Sable électrique', { timeout: 8_000 });
  await page.getByTestId('choose-cuivre').tap();
  await page.getByTestId('nickname-keep').tap();
  await expect.poll(async () => (await temple(page)).step).toBe('hatched');
  expect(await page.evaluate(() => window.__game!.state().golems.map((g) => g.species))).toEqual(['pierre', 'cuivre']);
  expect(errors).toEqual([]);
});

test('Palmebloc : l’eau de l’oasis, la charrette, la carte déchirée, le chameau Caramel', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  await page.goto('?test&fast&start=play&biome=desert&golems=pierre,cuivre&desertSanctuary=hatched');
  await waitReady(page);
  const status = async (id: string): Promise<string> => (await view(page)).desertQuests.log[id].status;

  // R1 : trois seaux, de la source à l'abreuvoir.
  await talkTo(page, 'oasia', 'soif');
  const ids = await page.evaluate(() => window.__game!.interactables());
  expect(ids).toContain('q3-fill');
  for (let i = 0; i < 3; i++) {
    // Les positions de la source et de l'abreuvoir sont celles des interactions.
    await useById(page, 'q3-fill', 'Remplir le seau');
    await useById(page, 'q3-empty', 'Vider le seau');
  }
  await expect.poll(() => status('R1')).toBe('ready');
  await talkTo(page, 'oasia', 'abreuvoir est plein');

  // R2 : les trois caisses qui bloquent la charrette.
  await talkTo(page, 'zephir', 'charrette');
  for (const c of (await view(page)).desertQuests.crates) {
    await page.evaluate(([x, z]) => window.__game!.teleport(x, z + 2, 0), [c.x, c.z]);
    await settle(page, 6);
    await page.getByTestId('btn-attack').tap();
    await expect.poll(async () => (await view(page)).desertQuests.crates.find((k) => k.x === c.x && k.z === c.z)!.taken).toBe(true);
  }
  await expect.poll(() => status('R2')).toBe('ready');
  await talkTo(page, 'zephir', 'roule');

  // O1 : les trois morceaux de carte.
  await talkTo(page, 'zephir', 'carte');
  for (const p of (await view(page)).desertQuests.pieces) await interactAt(page, p.x, p.z + 1, 'Ramasser');
  await expect.poll(() => status('O1')).toBe('ready');

  await talkTo(page, 'zephir', 'carte');

  // Dame Oasia propose d'abord les scorpions du puits (R3, testée par la simulation), puis Caramel.
  await talkTo(page, 'oasia', 'scorpions');
  // O2 : Caramel suit après une 🍎, jusqu'à l'enclos.
  await talkTo(page, 'oasia', 'Caramel');
  const camel = (await view(page)).desertQuests.camel;
  await interactAt(page, camel.x, camel.z + 1.5, 'Donner 1 🍎');
  await expect.poll(async () => (await view(page)).desertQuests.camel.mode).toBe('following');
  // On va à l'enclos : Caramel rattrape le héros et y entre.
  const pen = (await view(page)).desertQuests.pen;
  await page.evaluate(([x, z]) => window.__game!.teleport(x, z, 0), [pen.x, pen.z]);
  await expect.poll(() => status('O2')).toBe('ready');
  expect(errors).toEqual([]);
});

/** Va à l'interaction qui porte cet identifiant et la touche. */
async function useById(page: Page, id: string, label: string): Promise<void> {
  await expect.poll(() => page.evaluate((i) => window.__game!.interactionAt(i), id), { message: id }).not.toBeNull();
  const it = await page.evaluate((i) => window.__game!.interactionAt(i), id);
  await interactAt(page, it!.x, it!.z, label);
}

test('Les tambours des dunes : 3 tambours, le Grand Ver surgit, combat, outro O3, Cristal et chapitre 4', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  await page.goto('?test&fast&start=play&biome=desert&golems=cuivre&desertBoss=active&bossHp=0.3');
  await waitReady(page);
  for (const d of (await view(page)).desertBoss.drums) await interactAt(page, d.x, d.z + 1, 'Frapper');
  await expect(page.getByTestId('toast')).toContainText('Le Grand Ver surgit');
  const worm = (await view(page)).desertBoss.worm;
  await interactAt(page, worm.x, worm.z + 3, 'Affronter');
  await expect(page.getByTestId('combat')).toBeVisible();
  await playFight(page, true, 'combat-victory');
  await expect(page.getByTestId('combat-victory')).toContainText('Grand Ver des Sables est vaincu');
  await expect(page.getByTestId('combat-victory')).toContainText('Cristal de puissance');
  await page.getByTestId('combat-victory-ok').tap();
  await expect(page.getByTestId('cinematic')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('cinematic-skip').tap();
  await expect(page.getByTestId('toast')).toContainText('trophée', { timeout: 20_000 });
  const st = await page.evaluate(() => window.__game!.state());
  expect(st.trophies).toContain('grandVer');
  expect(st.items.crystal).toBe(1);
  expect(st.shards).toBe(3);
  expect(st.chapter).toBe(4);
  expect(errors).toEqual([]);
});
