import { expect, test, type Page } from '@playwright/test';
import { answerShown, interactAt, playFight, talkTo, waitReady } from './helpers';

type P = { x: number; z: number };
type Frost = {
  step: string;
  slideCell: [number, number];
  slides: number;
  memory: { input: number; failures: number; playing: boolean; sequence: number[] };
  gears: Record<string, string>;
  plan: { stone: P; slideOrigin: P; memoryTiles: P[]; memoryStele: P; millPanel: P; stone4: P; nest: P };
};
type GivreView = {
  frost: Frost;
  givreQuests: { log: Record<string, { status: string; progress: number }>; logs: (P & { taken: boolean })[]; holes: (P & { taken: boolean })[]; bells: (P & { size: number })[]; nilou: P & { mode: string }; home: P };
  givreBoss: { braziers: (P & { lit: boolean })[]; witch: P };
  snow: number;
};
const view = (page: Page): Promise<GivreView> => page.evaluate(() => window.__game!.life() as unknown as GivreView);
const frost = async (page: Page): Promise<Frost> => (await view(page)).frost;

test('sanctuaire gelé : pierre, glissade, mémoire de glace, moulin gelé, pierre, éclosion de Cristal', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('?test&fast&start=play&biome=givre&golems=pierre');
  await waitReady(page);
  const f0 = await frost(page);
  expect(f0.step).toBe('stone');
  const plan = f0.plan;

  // Pierre de niveau 4 : la porte de glace fond, Lumibloc explique la glissade.
  await interactAt(page, plan.stone.x - 1.5, plan.stone.z, 'Lire');
  await answerShown(page, true);
  await expect.poll(async () => (await frost(page)).step).toBe('slide');
  await expect(page.getByTestId('dialog-text')).toContainText('glisse');
  await page.getByTestId('dialog-close').tap();

  // La glissade, sur le plateau 2D : E, N, W, N.
  const o = plan.slideOrigin;
  await interactAt(page, o.x, o.z + 5, 'Résoudre');
  for (const d of ['E', 'N', 'W', 'N']) await page.getByTestId(`dpad-${d}`).tap();
  await expect.poll(async () => (await frost(page)).step).toBe('memory');

  // La mémoire de glace : la séquence se joue, puis on touche les dalles dans l'ordre.
  await interactAt(page, plan.memoryStele.x, plan.memoryStele.z + 1, 'Résoudre');
  await expect(page.getByTestId('memory-0')).toBeEnabled({ timeout: 20_000 });
  for (const t of (await frost(page)).memory.sequence) await page.getByTestId(`memory-${t}`).tap();
  await expect.poll(async () => (await frost(page)).step).toBe('mill');

  // Le moulin gelé : la grande roue seule au milieu tourne dans le mauvais sens…
  await interactAt(page, plan.millPanel.x, plan.millPanel.z + 1, 'Résoudre');
  await page.getByTestId('mill-slot-M').tap();
  await page.getByTestId('mill-slot-M').tap();
  await page.getByTestId('mill-crank').tap();
  await expect(page.getByTestId('mill-message')).toContainText('mauvais sens');
  // … on l'enlève, puis deux petites roues à gauche et à droite : le bon sens.
  await page.getByTestId('mill-restart').tap();
  await page.getByTestId('mill-slot-L').tap();
  await page.getByTestId('mill-slot-R').tap();
  await expect.poll(async () => (await frost(page)).gears).toEqual({ L: 'small', R: 'small' });
  await page.getByTestId('mill-crank').tap();
  await expect.poll(async () => (await frost(page)).step, { timeout: 15_000 }).toBe('stone4');

  // Seconde pierre, puis l'œuf : Glace ou Cristal.
  await interactAt(page, plan.stone4.x + 1.5, plan.stone4.z, 'Lire');
  await answerShown(page, true);
  await expect.poll(async () => (await frost(page)).step).toBe('open');
  await interactAt(page, plan.nest.x - 1.5, plan.nest.z, 'Toucher l’œuf');
  await expect(page.getByTestId('choose-glace')).toContainText('Glace', { timeout: 8_000 });
  await page.getByTestId('choose-cristal').tap();
  await page.getByTestId('nickname-keep').tap();
  await expect.poll(async () => (await frost(page)).step).toBe('hatched');
  expect(await page.evaluate(() => window.__game!.state().golems.map((g) => g.species))).toEqual(['pierre', 'cristal']);
  expect(errors).toEqual([]);
});

test('Igloos du Col : les bûches, Nilou, la pêche, les cloches de glace', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('?test&fast&start=play&biome=givre&golems=pierre,cristal&givreSanctuary=hatched');
  await waitReady(page);
  const status = async (id: string): Promise<string> => (await view(page)).givreQuests.log[id].status;

  // R1 : cinq bûches.
  await talkTo(page, 'flocon', 'bûches');
  for (const l of (await view(page)).givreQuests.logs) await interactAt(page, l.x, l.z + 1, 'Ramasser');
  await expect.poll(() => status('R1')).toBe('ready');
  await talkTo(page, 'flocon', 'feu');

  // R2 : Nilou suit le héros jusqu'au village.
  await talkTo(page, 'flocon', 'Nilou');
  const n = (await view(page)).givreQuests.nilou;
  await interactAt(page, n.x, n.z + 1.5, 'Viens avec moi');
  await expect.poll(async () => (await view(page)).givreQuests.nilou.mode).toBe('following');
  const home = (await view(page)).givreQuests.home;
  await page.evaluate(([x, z]) => window.__game!.teleport(x, z, 0), [home.x, home.z]);
  await expect.poll(() => status('R2'), { timeout: 20_000 }).toBe('ready');
  await talkTo(page, 'flocon', 'Nilou');

  // R3 (yétis) est vérifiée par la simulation ; Grand-mère Flocon la propose avant la pêche.
  await talkTo(page, 'flocon', 'yétis');
  // O1 : trois poissons.
  await talkTo(page, 'flocon', 'poisson');
  for (const h of (await view(page)).givreQuests.holes) await interactAt(page, h.x, h.z + 1, 'Pêcher');
  await expect.poll(() => status('O1')).toBe('ready');
  await talkTo(page, 'flocon', 'poissons');

  // O2 : une erreur d'ordre fait recommencer, puis petite, moyenne, grande.
  await talkTo(page, 'flocon', 'cloches');
  const bells = (await view(page)).givreQuests.bells;
  const bySize = (s: number): P => bells.find((b) => b.size === s)!;
  await interactAt(page, bySize(2).x, bySize(2).z + 1, 'Faire sonner');
  await expect(page.getByTestId('toast')).toContainText('bon ordre');
  for (const s of [0, 1, 2]) await interactAt(page, bySize(s).x, bySize(s).z + 1, 'Faire sonner');
  await expect.poll(() => status('O2')).toBe('ready');
  expect(errors).toEqual([]);
});

test('Le sentier du blizzard : 3 braseros, la Sorcière apparaît, combat, outro O4, Cœur et chapitre 5', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('?test&fast&start=play&biome=givre&golems=cristal&givreBoss=active&bossHp=0.3');
  await waitReady(page);
  for (const b of (await view(page)).givreBoss.braziers) await interactAt(page, b.x, b.z + 1, 'Allumer');
  await expect(page.getByTestId('toast')).toContainText('Sorcière t’attend');
  const witch = (await view(page)).givreBoss.witch;
  await interactAt(page, witch.x, witch.z + 3, 'Affronter');
  await expect(page.getByTestId('combat')).toBeVisible();
  await playFight(page, true, 'combat-victory');
  await expect(page.getByTestId('combat-victory')).toContainText('Sorcière du Blizzard est vaincue');
  await expect(page.getByTestId('combat-victory')).toContainText('Cœur ancestral');
  await page.getByTestId('combat-victory-ok').tap();
  await expect(page.getByTestId('cinematic')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('cinematic-skip').tap();
  await expect(page.getByTestId('toast')).toContainText('trophée', { timeout: 20_000 });
  const st = await page.evaluate(() => window.__game!.state());
  expect(st.trophies).toContain('sorciere');
  expect(st.items.heart).toBe(1);
  expect(st.shards).toBe(4);
  expect(st.chapter).toBe(5);
  expect(errors).toEqual([]);
});
