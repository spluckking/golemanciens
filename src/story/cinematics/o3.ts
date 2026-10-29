import type { CinematicScript } from './director';
import { bezier, key, raiseArm } from './t1';

/**
 * Cinématique de l'outro O3 (après le Grand Ver), 5 plans pour les 5 phrases : le ver plonge
 * pour de bon, l'éclat brille sur le sable, le désert chante au soir, le marchand offre une
 * gourde, et l'on devine le froid qui attend (flocons) pendant que l'éclat s'envole.
 */

const PIT = { x: 24.5, z: 20.5, y: 10 };
const VILLAGE = { x: 40, z: 62 };

function once(t: number, dt: number, at: number): boolean {
  return t >= at && t - dt < at;
}

export const O3_CINEMATIC: CinematicScript = {
  id: 'O3',
  biome: 'desert',
  shots: [
    // 1. Le Grand Ver plonge sous les dunes et ne remonte plus.
    {
      sentences: 1,
      setup(c) {
        c.sky('day');
        c.music('storyDay');
        c.camera(key([PIT.x + 9, PIT.y + 4, PIT.z + 11], [PIT.x, PIT.y + 2, PIT.z]), key([PIT.x + 8, PIT.y + 3.5, PIT.z + 9], [PIT.x, PIT.y + 1, PIT.z]), 6);
        c.actor('worm', 'grandVer', PIT.x, PIT.z, Math.PI, { y: PIT.y, scale: 1.2 });
      },
      update(c, t, dt) {
        const w = c.get('worm');
        const k = Math.min(1, Math.max(0, (t - 0.8) / 2));
        w.y = PIT.y - k * k * 7;
        if (t > 0.8 && t < 3 && Math.floor(t * 8) !== Math.floor((t - dt) * 8)) c.burst(PIT.x + (Math.random() - 0.5) * 3, PIT.y + 0.3, PIT.z + (Math.random() - 0.5) * 3, 0xe0c080, 6, 1.2);
        if (once(t, dt, 0.8)) {
          c.sound('roar');
          c.shake(0.3, 1.5);
        }
      },
    },
    // 2. Le troisième éclat brille sur le sable.
    {
      sentences: 1,
      setup(c) {
        c.sky('day');
        c.camera(key([PIT.x + 3, PIT.y + 1.6, PIT.z + 4], [PIT.x, PIT.y + 0.5, PIT.z]), key([PIT.x + 2.5, PIT.y + 1.3, PIT.z + 3.3], [PIT.x, PIT.y + 0.6, PIT.z]), 5);
        c.actor('shard', 'starShard', PIT.x, PIT.z, 0, { y: PIT.y + 0.3, scale: 1.4 });
      },
      update(c, t, dt) {
        const s = c.get('shard');
        s.root.rotation.y += dt * 1.5;
        s.y = PIT.y + 0.3 + Math.sin(t * 2) * 0.08;
        if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) c.burst(s.x, s.y + 0.4, s.z, 0xffe680, 3, 0.4);
        if (once(t, dt, 0.6)) c.sound('chime');
      },
    },
    // 3. Le soir, le vent se lève et le désert chante une musique joyeuse.
    {
      sentences: 1,
      setup(c) {
        c.sky('dusk', 2);
        c.music('desert');
        c.camera(key([80, 16, 96], [64, 12, 76]), key([74, 18, 92], [58, 13, 70]), 8);
      },
      update(c, t, dt) {
        if (Math.floor(t * 10) !== Math.floor((t - dt) * 10)) c.burst(56 + Math.random() * 26, 12 + Math.random() * 3, 70 + Math.random() * 18, Math.random() < 0.5 ? 0xf0d8a0 : 0xffd090, 4, 0.7);
        if (once(t, dt, 0.5)) c.sound('wings');
        if (once(t, dt, 1.2) || once(t, dt, 2.4)) c.sound('chime');
      },
    },
    // 4. Le marchand offre une gourde fraîche à {prenom} : « Pour la route.
    {
      sentences: 1,
      setup(c) {
        c.sky('dusk');
        c.camera(key([VILLAGE.x + 10, 12.3, VILLAGE.z + 4], [VILLAGE.x + 7, 11.1, VILLAGE.z + 2.5]), key([VILLAGE.x + 9.5, 12.1, VILLAGE.z + 3.6], [VILLAGE.x + 7, 11.2, VILLAGE.z + 2.5]), 6);
        c.actor('zephir', 'zephir', VILLAGE.x + 7.5, VILLAGE.z + 1.5, Math.PI);
        c.actor('hero', 'hero', VILLAGE.x + 7.5, VILLAGE.z + 3.5, 0);
        c.actor('gourd', 'bucket', VILLAGE.x + 7.5, VILLAGE.z + 2.2, 0, { y: 11.5, scale: 0.6 });
      },
      update(c, t) {
        const z = c.get('zephir');
        z.model.swing('armR', -1.3 * Math.min(1, t));
        const g = c.get('gourd');
        const k = Math.min(1, Math.max(0, (t - 1.2) / 1));
        g.z = VILLAGE.z + 2.2 + k * 0.9;
        if (t > 2.4) raiseArm(c.get('hero'), 'armR', 2.4);
      },
    },
    // 5. Il paraît qu'il fait froid là où tu vas ! »
    {
      sentences: 1,
      setup(c) {
        c.sky('night', 2);
        c.music('storyNight');
        c.camera(key([VILLAGE.x + 12, 13, VILLAGE.z + 8], [VILLAGE.x + 4, 16, VILLAGE.z - 6]), key([VILLAGE.x + 11, 15, VILLAGE.z + 7], [VILLAGE.x + 2, 22, VILLAGE.z - 14]), 8);
        c.actor('shard', 'starShard', VILLAGE.x + 7.5, VILLAGE.z + 2, 0, { y: 12.5, scale: 1.3 });
      },
      update(c, t, dt) {
        // Quelques flocons tombent déjà ; l'éclat s'envole vers l'Académie.
        if (Math.floor(t * 6) !== Math.floor((t - dt) * 6)) c.burst(VILLAGE.x + 4 + (Math.random() - 0.5) * 12, 20, VILLAGE.z + (Math.random() - 0.5) * 12, 0xffffff, 3, 0.3);
        const s = c.get('shard');
        const k = Math.min(1, Math.max(0, (t - 1.5) / 3));
        [s.x, s.y, s.z] = bezier([VILLAGE.x + 7.5, 12.5, VILLAGE.z + 2], [VILLAGE.x + 4, 22, VILLAGE.z - 6], [VILLAGE.x - 4, 32, VILLAGE.z - 30], k);
        s.root.rotation.y += dt * 3;
        if (k > 0 && Math.floor(t * 10) !== Math.floor((t - dt) * 10)) c.burst(s.x, s.y, s.z, 0xffe680, 2, 0.3);
        if (once(t, dt, 1.5)) c.sound('chime');
      },
    },
  ],
};
