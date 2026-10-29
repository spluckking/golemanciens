import { expect, test, type Page } from '@playwright/test';
import { answerShown, interactAt, playFight, settle, talkTo, waitReady } from './helpers';

type P = { x: number; z: number };
type Sky = {
  step: string;
  lit: number;
  right: number;
  plan: { stone: P; cloudStart: P; cloudEnd: P; clouds: { color: string; x0: number; z0: number }[]; balancePanel: P; stone5: P; nest: P };
};
type CielView = {
  sky: Sky;
  cielQuests: { log: Record<string, { status: string; progress: number }>; crystals: (P & { done: boolean })[]; braziers: P[]; flowers: P[]; guardian: P & { y: number } };
  cielBoss: { feathers: P[]; griffon: P };
  safe: P;
};
const view = (page: Page): Promise<CielView> => page.evaluate(() => window.__game!.life() as unknown as CielView);
const sky = async (page: Page): Promise<Sky> => (await view(page)).sky;
const RAINBOW = ['red', 'orange', 'yellow', 'green', 'blue', 'violet'];

test('sanctuaire des Vents : pierre, nuages arc-en-ciel (chute et erreur), balance à contrepoids, pierre, éclosion d’Arc-en-ciel', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('?test&fast&start=play&biome=ciel&golems=pierre');
  await waitReady(page);
  const plan = (await sky(page)).plan;
  expect((await sky(page)).step).toBe('stone');

  await interactAt(page, plan.stone.x - 1.5, plan.stone.z, 'Lire');
  await answerShown(page, true);
  await expect.poll(async () => (await sky(page)).step).toBe('clouds');
  await expect(page.getByTestId('dialog-text')).toContainText('arc-en-ciel');
  await page.getByTestId('dialog-close').tap();

  // Une chute ramène au départ, sans rien perdre.
  const cloud = (c: string): { x: number; z: number } => {
    const k = plan.clouds.find((cl) => cl.color === c)!;
    return { x: k.x0 + 1, z: k.z0 + 1 };
  };
  await page.evaluate(([x, z]) => window.__game!.teleport(x, z, 0), [plan.cloudStart.x, plan.cloudStart.z]);
  await settle(page, 4);
  await page.evaluate(([x, z]) => window.__game!.teleport(x, z), [cloud('red').x + 1.5, cloud('red').z]);
  await expect(page.getByTestId('toast')).toContainText('coup de vent', { timeout: 10_000 });
  await expect.poll(async () => Math.hypot((await page.evaluate(() => window.__game!.hero())).z - plan.cloudStart.z, 0)).toBeLessThan(1);

  // Une erreur fait recommencer par le rouge.
  for (const c of ['red', 'yellow']) {
    await page.evaluate(([x, z]) => window.__game!.teleport(x, z), [cloud(c).x, cloud(c).z]);
    await settle(page, 4);
  }
  await expect(page.getByTestId('toast')).toContainText('Pas celui-là');
  expect((await sky(page)).lit).toBe(0);
  for (const c of RAINBOW) {
    await page.evaluate(([x, z]) => window.__game!.teleport(x, z), [cloud(c).x, cloud(c).z]);
    await settle(page, 4);
  }
  await expect.poll(async () => (await sky(page)).step).toBe('balance');

  // La balance : 5, puis 2 (pas assez), puis 1 : 8 de chaque côté.
  await interactAt(page, plan.balancePanel.x, plan.balancePanel.z + 0.5, 'Poser les poids');
  await page.getByTestId('balance-weight-3').tap();
  await page.getByTestId('balance-weight-1').tap();
  await expect.poll(async () => (await sky(page)).right).toBe(7);
  await page.getByTestId('balance-weight-0').tap();
  await expect.poll(async () => (await sky(page)).step).toBe('stone5');

  await interactAt(page, plan.stone5.x + 1.5, plan.stone5.z, 'Lire');
  await answerShown(page, true);
  await expect.poll(async () => (await sky(page)).step).toBe('open');
  await interactAt(page, plan.nest.x - 1.5, plan.nest.z, 'Toucher l’œuf');
  await expect(page.getByTestId('choose-nuage')).toContainText('Nuage', { timeout: 8_000 });
  await page.getByTestId('choose-arcEnCiel').tap();
  await page.getByTestId('nickname-keep').tap();
  await expect.poll(async () => (await sky(page)).step).toBe('hatched');
  expect(await page.evaluate(() => window.__game!.state().golems.map((g) => g.species))).toEqual(['pierre', 'arcEnCiel']);
  expect(errors).toEqual([]);
});

test('Village des Nuages : cristaux de vent, phare, jardin, lettre au gardien de la plus haute tour', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('?test&fast&start=play&biome=ciel&golems=pierre,nuage&cielSanctuary=hatched');
  await waitReady(page);
  const status = async (id: string): Promise<string> => (await view(page)).cielQuests.log[id].status;

  await talkTo(page, 'azur', 'cristaux');
  for (const c of (await view(page)).cielQuests.crystals) await interactAt(page, c.x, c.z + 0.6, 'Ramasser');
  await expect.poll(() => status('R1')).toBe('ready');
  await talkTo(page, 'azur', 'cristaux');

  await talkTo(page, 'azur', 'phare');
  for (const b of (await view(page)).cielQuests.braziers) await interactAt(page, b.x, b.z + 1, 'Allumer');
  await expect.poll(() => status('R2')).toBe('ready');
  await talkTo(page, 'azur', 'phare');

  await talkTo(page, 'azur', 'harpies');
  await talkTo(page, 'azur', 'fleurs');
  for (const f of (await view(page)).cielQuests.flowers) await interactAt(page, f.x, f.z + 1, 'Arroser');
  await expect.poll(() => status('O1')).toBe('ready');
  await talkTo(page, 'azur', 'jardin');

  await talkTo(page, 'azur', 'lettre');
  const g = (await view(page)).cielQuests.guardian;
  await interactAt(page, g.x, g.z, 'Donner la lettre');
  await expect(page.getByTestId('dialog-text')).toContainText('lettre du Capitaine');
  const close = page.getByTestId('dialog-close');
  if (await close.isVisible()) await close.tap({ force: true });
  await expect.poll(() => status('O2')).toBe('ready');
  expect((await page.evaluate(() => window.__game!.hero())).y).toBeGreaterThan(26);

  // Tomber des îles ramène sur la dernière île, sans dégâts.
  await page.evaluate(() => window.__game!.teleport(2.5, 2.5));
  await expect(page.getByTestId('toast')).toContainText('nuage te ramène', { timeout: 10_000 });
  expect((await page.evaluate(() => window.__game!.hero())).y).toBeGreaterThan(14);
  expect(errors).toEqual([]);
});

test('Les plumes noires, le Griffon, puis l’Épreuve des Étoiles à l’Académie et la naissance du Galaxie', async ({ page }) => {
  test.setTimeout(420_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Un seul golem (au stade 3 : la garantie le fera passer au stade 4 avant la cérémonie).
  await page.goto('?test&fast&start=play&biome=ciel&golems=nuage&stage=3&cielBoss=active&bossHp=0.3&shards=4');
  await waitReady(page);
  for (const f of (await view(page)).cielBoss.feathers) await interactAt(page, f.x, f.z + 1, 'Ramasser');
  await expect(page.getByTestId('toast')).toContainText('porte de la tour s’ouvre');
  const gr = (await view(page)).cielBoss.griffon;
  await interactAt(page, gr.x, gr.z + 3.5, 'Affronter');
  await playFight(page, true, 'combat-victory');
  await expect(page.getByTestId('combat-victory')).toContainText('Griffon d’Ombre est vaincu');
  await page.getByTestId('combat-victory-ok').tap();
  await expect(page.getByTestId('toast')).toContainText('trophée', { timeout: 20_000 });
  expect(await page.evaluate(() => window.__game!.state().shards)).toBe(5);

  // À l'Académie : l'Épreuve. Une étoile, puis on part (« Revenir plus tard ») et on revient.
  await page.evaluate(() => window.__game!.travel('prairie'));
  await waitReady(page);
  await expect.poll(() => page.evaluate(() => window.__game!.interactables())).toContain('star-trial');
  // Devant la porte de l'Académie (Prairie).
  const door = { x: 64.5, z: 34.5 };
  await interactAt(page, door.x, door.z + 3, 'Épreuve des Étoiles');
  await page.getByTestId('stars-start-ok').tap();
  await page.getByTestId('stars-menu-0').tap();
  await answerShown(page, true);
  // Une erreur : l'explication, la réplique de Lumibloc, aucune étoile perdue.
  await answerShown(page, false);
  await page.getByTestId('btn-understood').tap();
  await page.getByTestId('stars-mistake-ok').tap();
  await expect(page.getByTestId('stars-menu')).toContainText('(1/12)');
  await page.getByTestId('stars-menu-1').tap();
  expect(await page.evaluate(() => window.__game!.state().starTrial.lit)).toBe(1);

  await interactAt(page, door.x, door.z + 3, 'Épreuve des Étoiles');
  await page.getByTestId('stars-menu-0').tap();
  for (let lit = 1; lit < 12; lit++) {
    await answerShown(page, true);
    if (lit === 3 || lit === 7) await page.getByTestId('stars-cheer-ok').tap();
  }
  await page.getByTestId('stars-end-ok').tap();
  // Garantie : aucun golem au stade 4, Lumibloc donne les objets manquants.
  await page.getByTestId('stars-guarantee-ok').tap();
  await page.getByTestId('galaxy-choice-0').tap();
  await expect(page.getByTestId('cinematic')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('cinematic-skip').tap();
  await expect(page.getByTestId('toast')).toContainText('Golem Galaxie', { timeout: 20_000 });
  const st = await page.evaluate(() => window.__game!.state());
  expect(st.golems.filter((g) => g.species === 'galaxie')).toHaveLength(1);
  expect(st.golems.find((g) => g.species === 'galaxie')!.stage).toBe(4);
  expect(st.chapter).toBe(6);
  expect(st.trophies).toContain('griffon');
  expect(await page.evaluate(() => window.__game!.interactables())).not.toContain('star-trial');
  expect(errors).toEqual([]);
});
