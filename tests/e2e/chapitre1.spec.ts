import { expect, test } from '@playwright/test';
import { formatText } from '../../src/core/text';
import { CONTENT } from '../../src/data/content';
import { answerShown, interactAt, playFight, talkTo, waitReady } from './helpers';

/**
 * Parcours du chapitre 1 (JALONS.md, critères du jalon 1) : titre → prénom → lecture de T1
 * (avec une erreur) → sanctuaire → choix du golem → 3 quêtes → arène (3 victoires) → boss → outro.
 * Le mode test accélère les attentes et donne la bonne réponse des questions de combat.
 */

const NAME = 'Léo';
const T1 = CONTENT.stories.find((s) => s.id === 'T1')!;

test('chapitre 1 de bout en bout', async ({ page }) => {
  test.setTimeout(900_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('?test&fast');
  await page.waitForFunction(() => window.__game?.ready === true);

  // Titre et prénom.
  await page.getByTestId('btn-play').tap();
  await page.getByTestId('name-input').fill(NAME);
  await page.getByTestId('btn-name-ok').tap();

  // Cinématique de T1, puis les questions de lecture (une erreur, relecture, réussite).
  const next = page.getByTestId('cinematic-next');
  while (await page.getByTestId('cinematic').count()) {
    const text = (await page.getByTestId('cinematic-caption').textContent()) ?? '';
    await expect(next).toBeVisible({ timeout: 10_000 });
    await next.tap();
    await expect(page.getByTestId('cinematic-caption').filter({ hasText: text })).toHaveCount(0);
  }
  const answerReading = async (correct: boolean): Promise<void> => {
    const prompt = await page.getByTestId('question-prompt').textContent();
    const q = T1.questions.find((x) => formatText(x.text, NAME) === prompt)!;
    const target = correct ? q.choices[q.answer] : q.choices[(q.answer + 1) % 3];
    await page.locator('.choice', { hasText: formatText(target, NAME) }).tap();
    await expect(page.getByTestId('question-prompt').filter({ hasText: prompt ?? '' })).toHaveCount(0);
  };
  await answerReading(false);
  await answerReading(true);
  await page.getByTestId('reading-retry-ok').tap();
  await expect(page.getByTestId('btn-read')).toBeEnabled({ timeout: 15_000 });
  await page.getByTestId('btn-read').tap();
  await answerReading(true);
  await answerReading(true);
  await page.getByTestId('reading-success-ok').tap();

  // Réveil dans la maison.
  await waitReady(page);
  await expect(page.getByTestId('btn-jump')).toBeVisible();
  const home = await page.evaluate(() => window.__game!.hero());
  expect(home.z).toBeGreaterThan(93);

  // Sanctuaire : pierre-énigme, dalles, œuf → Pierre.
  const s = await page.evaluate(() => window.__game!.sanctuary());
  await interactAt(page, s.stone.x - 1.6, s.stone.z, 'Lire', -Math.PI / 2);
  await answerShown(page, true);
  await expect.poll(() => page.evaluate(() => window.__game!.sanctuary().step)).toBe('tiles');
  for (const c of ['red', 'yellow', 'blue']) {
    const t = s.tiles.find((x) => x.color === c)!;
    await page.evaluate(([x, z]) => window.__game!.teleport(x, z), [t.x, t.z]);
    await page.waitForTimeout(250);
  }
  await expect.poll(() => page.evaluate(() => window.__game!.sanctuary().step)).toBe('open');
  await interactAt(page, s.nest.x - 1.8, s.nest.z, 'Toucher', -Math.PI / 2);
  await page.getByTestId('choose-pierre').tap({ timeout: 10_000 });
  await page.getByTestId('nickname-keep').tap();
  await expect.poll(() => page.evaluate(() => window.__game!.state().golems.length)).toBe(1);

  // Quêtes : R1 (poules), R3 (slimes), R2 (panier).
  await talkTo(page, 'mereBrique', 'Mes trois poules');
  const pen = (await page.evaluate(() => window.__game!.quests())).pen;
  for (let i = 0; i < 3; i++) {
    const c = (await page.evaluate(() => window.__game!.quests())).chickens[i];
    await interactAt(page, c.x + 1.2, c.z, 'Attraper');
    await expect.poll(() => page.evaluate((k) => window.__game!.quests().chickens[k].mode, i)).toBe('following');
    await page.evaluate(([x, z]) => window.__game!.teleport(x, z), [(pen.x0 + pen.x1) / 2, (pen.z0 + pen.z1) / 2]);
    await expect.poll(() => page.evaluate((k) => window.__game!.quests().chickens[k].mode, i), { timeout: 40_000 }).toBe('home');
  }
  await talkTo(page, 'mereBrique', 'Mes poules sont rentrées');
  await talkTo(page, 'mereBrique', 'Des slimes');
  const slimes = await page.evaluate(() => window.__game!.life().monsters.filter((m) => m.id.startsWith('slimes')));
  await page.evaluate(([x, z]) => window.__game!.teleport(x + 5, z, Math.PI / 2), [slimes[0].x, slimes[0].z]);
  await page.waitForTimeout(500);
  await page.getByTestId('btn-attack').tap();
  await expect.poll(() => page.evaluate(() => window.__game!.quests().log.R3.status), { timeout: 60_000 }).toBe('ready');
  await talkTo(page, 'mereBrique', 'Plus un seul slime');
  await talkTo(page, 'paquerette', 'porter ce panier');
  const gaston = await page.evaluate(() => window.__game!.life().npcs.find((x) => x.id === 'gaston')!);
  await interactAt(page, gaston.x, gaston.z - 1.6, 'Parler', Math.PI);
  await expect(page.getByTestId('dialog-text')).toContainText('le bon pain');
  await page.getByTestId('dialog-close').tap();

  // Arène : 3 victoires.
  for (let i = 0; i < 3; i++) {
    await interactAt(page, 24.5, 38.5, 'Combattre');
    await playFight(page, true, 'combat-victory');
    await page.getByTestId('combat-victory-ok').tap();
    if (i === 2) await page.getByTestId('arena-done-ok').tap();
    await expect(page.getByTestId('combat')).toHaveCount(0);
  }

  // Quête du boss, piste gluante, Roi Slime.
  await talkTo(page, 'mereBrique', 'Suis la piste gluante');
  expect(await page.evaluate(() => window.__game!.state().biomes.prairie.bossQuest)).toBe('active');
  await interactAt(page, 20.5, 112.5, 'Affronter');
  await playFight(page, true, 'combat-victory');
  await expect(page.getByTestId('combat-victory')).toContainText('Le Roi Slime est vaincu');
  await page.getByTestId('combat-victory-ok').tap();

  // Outro O1 (on peut la passer), puis retour à la maison avec le trophée.
  await expect(page.getByTestId('cinematic-caption')).toContainText('Le Roi Slime éclate');
  await page.getByTestId('cinematic-skip').tap();
  await expect(page.getByTestId('toast')).toContainText('Un trophée t’attend', { timeout: 5_000 });
  const st = await page.evaluate(() => window.__game!.state());
  expect(st.shards).toBe(1);
  expect(st.chapter).toBe(2);
  expect(st.trophies).toEqual(['roiSlime']);
  expect(st.storiesRead).toEqual(['T1', 'O1']);
  await expect(page.getByTestId('hud-shards')).toHaveText('1/5');
  expect((await page.evaluate(() => window.__game!.life().home)).trophies).toBe(1);
  expect(errors).toEqual([]);
});
