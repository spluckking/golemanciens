import type { CinematicScript } from './director';
import { bezier, key, raiseArm } from './t1';

/**
 * Cinématique de l'outro O2 (après la Reine Araignée), 4 plans pour les 4 phrases du texte :
 * la Reine s'enfuit et sa toile tombe en poussière, l'éclat roule aux pieds de {prenom},
 * les habitants allument des lanternes, et les feuilles murmurent « merci » (l'éclat s'envole
 * vers l'Académie).
 */

const LAIR = { x: 24.5, z: 17.5, y: 10 };
const VILLAGE = { x: 41, z: 51, y: 16 };
/** Plateformes du village perché où l'on allume les lanternes (voir forestStructures.ts). */
const LANTERNS: [number, number, number][] = [
  [VILLAGE.x - 2, VILLAGE.y, VILLAGE.z + 2.5],
  [VILLAGE.x + 2.5, VILLAGE.y, VILLAGE.z + 2.5],
  [30.5, VILLAGE.y, 48.5],
  [53.5, VILLAGE.y, 55],
  [38.5, VILLAGE.y + 4, 39.5],
];

function once(t: number, dt: number, at: number): boolean {
  return t >= at && t - dt < at;
}

export const O2_CINEMATIC: CinematicScript = {
  id: 'O2',
  biome: 'foret',
  shots: [
    // 1. La Reine Araignée s'enfuit dans les branches, et sa toile d'argent tombe en poussière.
    {
      sentences: 1,
      setup(c) {
        c.sky('dusk');
        c.music('storyNight');
        c.camera(key([LAIR.x, LAIR.y + 2.5, LAIR.z + 11], [LAIR.x, LAIR.y + 3, LAIR.z - 2]), key([LAIR.x, LAIR.y + 3, LAIR.z + 9], [LAIR.x, LAIR.y + 5, LAIR.z - 2]), 7);
        c.actor('web', 'giantWeb', LAIR.x, LAIR.z - 1.8, 0, { y: LAIR.y, scale: 1.3 });
        c.actor('queen', 'spiderQueen', LAIR.x, LAIR.z, Math.PI, { y: LAIR.y + 0.3, scale: 1.4 });
      },
      update(c, t, dt) {
        const queen = c.get('queen');
        // Elle se retourne et grimpe vers les branches.
        const k = Math.min(1, Math.max(0, (t - 0.6) / 2.2));
        queen.facing = Math.PI * (1 - k);
        queen.y = LAIR.y + 0.3 + k * k * 9;
        queen.model.swing('legsL', Math.sin(t * 12) * 0.25 * k, 'z');
        queen.model.swing('legsR', -Math.sin(t * 12) * 0.25 * k, 'z');
        if (once(t, dt, 0.6)) c.sound('roar');
        if (once(t, dt, 3)) {
          c.get('web').root.visible = false;
          c.burst(LAIR.x, LAIR.y + 3.4, LAIR.z - 1.8, 0xe8ecf8, 60, 2);
          c.sound('shatter');
        }
        if (t > 3 && Math.floor(t * 8) !== Math.floor((t - dt) * 8)) c.burst(LAIR.x + (Math.random() - 0.5) * 6, LAIR.y + 2 + Math.random() * 4, LAIR.z - 1.8, 0xd8dcec, 3, 0.3);
      },
    },
    // 2. Le deuxième éclat roule aux pieds de {prenom}.
    {
      sentences: 1,
      setup(c) {
        c.sky('dusk');
        c.camera(key([LAIR.x + 4.5, LAIR.y + 1.8, LAIR.z + 6.5], [LAIR.x, LAIR.y + 0.6, LAIR.z + 3]), key([LAIR.x + 3.5, LAIR.y + 1.5, LAIR.z + 6], [LAIR.x, LAIR.y + 0.6, LAIR.z + 3.5]), 6);
        c.actor('hero', 'hero', LAIR.x + 0.2, LAIR.z + 5, Math.PI * 0.9);
        c.actor('shard', 'starShard', LAIR.x - 2, LAIR.z, 0, { y: LAIR.y + 0.3, scale: 1.3 });
      },
      update(c, t, dt) {
        const shard = c.get('shard');
        // Il roule en rebondissant jusqu'aux pieds du héros.
        const k = Math.min(1, t / 2.4);
        const [x, , z] = bezier([LAIR.x - 2, 0, LAIR.z], [LAIR.x - 1, 0, LAIR.z + 3], [LAIR.x, 0, LAIR.z + 4.2], k);
        shard.x = x;
        shard.z = z;
        shard.y = LAIR.y + 0.3 + Math.abs(Math.sin(k * Math.PI * 3)) * 0.4 * (1 - k);
        shard.root.rotation.x += dt * 8 * (1 - k);
        if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) c.burst(shard.x, shard.y + 0.3, shard.z, 0xffe680, 2, 0.3);
        if (once(t, dt, 2.4)) c.sound('chime');
        const hero = c.get('hero');
        if (t > 2.6) hero.y = c.ground(hero.x, hero.z) + Math.max(0, Math.sin((t - 2.6) * 5)) * 0.4;
      },
    },
    // 3. Dans les cabanes, les habitants allument des lanternes pour fêter la victoire.
    {
      sentences: 1,
      setup(c) {
        c.sky('night', 1.5);
        c.music('finale');
        c.camera(key([56, 20, 68], [42, 17, 50]), key([53, 21, 66], [41, 18, 49]), 8);
        LANTERNS.forEach(([x, y, z], i) => {
          c.actor(`unlit${i}`, 'lanternUnlit', x, z, 0, { y });
          c.actor(`lit${i}`, 'lanternLit', x, z, 0, { y }).root.visible = false;
        });
        c.actor('noisette', 'noisette', VILLAGE.x - 0.5, VILLAGE.z + 1.5, Math.PI * 0.85, { y: VILLAGE.y });
        c.actor('pip', 'pip', VILLAGE.x + 1.5, VILLAGE.z + 1, Math.PI * 1.1, { y: VILLAGE.y });
      },
      update(c, t, dt) {
        LANTERNS.forEach(([x, y, z], i) => {
          const at = 0.8 + i * 0.7;
          if (once(t, dt, at)) {
            c.get(`unlit${i}`).root.visible = false;
            c.get(`lit${i}`).root.visible = true;
            c.burst(x, y + 1.9, z, 0xffe27a, 14, 0.8);
            c.sound('lantern');
          }
        });
        raiseArm(c.get('noisette'), 'armR', Math.min(1, t) * 2.2 + Math.sin(t * 4) * 0.2);
        c.get('pip').y = VILLAGE.y + Math.max(0, Math.sin(t * 6)) * 0.35;
      },
    },
    // 4. Pour la première fois, les feuilles de la forêt murmurent un mot : « merci ».
    {
      sentences: 1,
      setup(c) {
        c.sky('morning', 2);
        c.music('storyMorning');
        c.camera(key([64, 12, 100], [60, 22, 74]), key([64, 14, 96], [60, 30, 70]), 9);
        c.actor('shard', 'starShard', 62, 84, 0, { y: 12, scale: 1.4 });
      },
      update(c, t, dt) {
        // Les feuilles tourbillonnent et chuchotent ; l'éclat s'envole vers l'Académie.
        if (Math.floor(t * 6) !== Math.floor((t - dt) * 6)) {
          const a = t * 2;
          c.burst(60 + Math.cos(a) * 6, 18 + Math.sin(t) * 2, 80 + Math.sin(a) * 6, Math.random() < 0.7 ? 0x7ac05a : 0xc8e890, 4, 0.5);
        }
        if (once(t, dt, 0.8) || once(t, dt, 2.2)) c.sound('wings');
        const shard = c.get('shard');
        const k = Math.min(1, Math.max(0, (t - 3) / 3));
        [shard.x, shard.y, shard.z] = bezier([62, 12, 84], [60, 26, 76], [56, 34, 40], k);
        shard.root.rotation.y += dt * 3;
        if (k > 0 && Math.floor(t * 10) !== Math.floor((t - dt) * 10)) c.burst(shard.x, shard.y, shard.z, 0xffe680, 2, 0.3);
        if (once(t, dt, 3)) c.sound('chime');
      },
    },
  ],
};
