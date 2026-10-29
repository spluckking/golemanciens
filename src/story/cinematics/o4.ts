import type { CinematicScript } from './director';
import { key } from './t1';

/**
 * Cinématique de l'outro O4 (après la Sorcière du Blizzard), 4 plans pour les 4 phrases : la
 * Sorcière disparaît dans un tourbillon, la tempête s'arrête et le soleil revient, un golem libère
 * l'éclat pris dans la glace, et tout le village sort des igloos.
 */

const SUMMIT = { x: 24.5, z: 20.5, y: 10 };
const VILLAGE = { x: 44, z: 70 };

function once(t: number, dt: number, at: number): boolean {
  return t >= at && t - dt < at;
}

export const O4_CINEMATIC: CinematicScript = {
  id: 'O4',
  biome: 'givre',
  shots: [
    // 1. La Sorcière du Blizzard disparaît dans un tourbillon de flocons.
    {
      sentences: 1,
      setup(c) {
        c.sky('dusk');
        c.music('storyNight');
        c.camera(key([SUMMIT.x + 7, SUMMIT.y + 3, SUMMIT.z + 8], [SUMMIT.x, SUMMIT.y + 1.5, SUMMIT.z]), key([SUMMIT.x + 6, SUMMIT.y + 3.5, SUMMIT.z + 7], [SUMMIT.x, SUMMIT.y + 2.5, SUMMIT.z]), 6);
        c.actor('sorciere', 'sorciere', SUMMIT.x, SUMMIT.z, 0.3, { y: SUMMIT.y });
      },
      update(c, t, dt) {
        const s = c.get('sorciere');
        const k = Math.min(1, Math.max(0, (t - 1) / 2.4));
        s.root.rotation.y += dt * (2 + k * 14);
        s.root.scale.setScalar(Math.max(0.01, 1 - k));
        s.y = SUMMIT.y + k * 2.5;
        // Le tourbillon de flocons autour d'elle.
        if (t > 0.6 && Math.floor(t * 14) !== Math.floor((t - dt) * 14)) {
          const a = t * 9;
          c.burst(SUMMIT.x + Math.cos(a) * 1.4, SUMMIT.y + 0.5 + (t % 1) * 3, SUMMIT.z + Math.sin(a) * 1.4, 0xffffff, 4, 0.6);
        }
        if (once(t, dt, 1)) c.sound('wings');
        if (once(t, dt, 3.2)) c.sound('poof');
      },
    },
    // 2. D'un coup, la tempête s'arrête et le soleil revient sur la montagne.
    {
      sentences: 1,
      setup(c) {
        c.sky('day', 2.5);
        c.music('givre');
        c.camera(key([SUMMIT.x + 18, 20, SUMMIT.z + 22], [SUMMIT.x + 4, 12, SUMMIT.z + 4]), key([SUMMIT.x + 24, 24, SUMMIT.z + 30], [SUMMIT.x + 10, 13, SUMMIT.z + 14]), 7);
      },
      update(c, t, dt) {
        if (once(t, dt, 0.8)) c.sound('chime');
        if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) c.burst(SUMMIT.x + 6 + Math.random() * 10, 16 + Math.random() * 4, SUMMIT.z + 6 + Math.random() * 10, 0xfff3a0, 3, 0.4);
      },
    },
    // 3. Le quatrième éclat est pris dans la glace, mais un golem le libère d'un coup de poing.
    {
      sentences: 1,
      setup(c) {
        c.sky('day');
        c.camera(key([SUMMIT.x + 3.5, SUMMIT.y + 1.8, SUMMIT.z + 4], [SUMMIT.x, SUMMIT.y + 0.6, SUMMIT.z]), key([SUMMIT.x + 3, SUMMIT.y + 1.6, SUMMIT.z + 3.4], [SUMMIT.x, SUMMIT.y + 0.7, SUMMIT.z]), 6);
        c.actor('shard', 'starShard', SUMMIT.x, SUMMIT.z, 0, { y: SUMMIT.y + 0.4, scale: 1.3 });
        c.actor('golem', 'pierre', SUMMIT.x + 1.6, SUMMIT.z + 0.4, Math.PI / 2);
      },
      update(c, t, dt) {
        const g = c.get('golem');
        // Il lève le poing, frappe, la glace éclate.
        const hit = 1.8;
        g.model.swing('armR', t < hit ? -2.6 * Math.min(1, t / 1.2) : -2.6 + Math.min(2.6, (t - hit) * 12));
        const s = c.get('shard');
        s.root.rotation.y += dt * 1.5;
        if (t > hit) s.y = SUMMIT.y + 0.4 + Math.min(1, (t - hit) / 1.5) * 0.8;
        if (once(t, dt, hit)) {
          c.burst(SUMMIT.x, SUMMIT.y + 0.6, SUMMIT.z, 0xbfe8ff, 30, 1.4);
          c.sound('shatter');
          c.shake(0.2, 0.5);
        }
        if (once(t, dt, hit + 0.8)) c.sound('chime');
      },
    },
    // 4. Au village, tout le monde sort enfin des igloos.
    {
      sentences: 1,
      setup(c) {
        c.sky('day');
        c.music('storyMorning');
        c.camera(key([VILLAGE.x + 6, 13, VILLAGE.z + 12], [VILLAGE.x, 11, VILLAGE.z]), key([VILLAGE.x + 5, 12.6, VILLAGE.z + 10], [VILLAGE.x, 11.2, VILLAGE.z - 1]), 7);
        c.actor('flocon', 'flocon', VILLAGE.x - 10, VILLAGE.z - 4, 0).walk([[VILLAGE.x - 2, VILLAGE.z + 2]], 1.6);
        c.actor('nilou', 'nilou', VILLAGE.x + 9, VILLAGE.z - 5, 0).walk([[VILLAGE.x + 2, VILLAGE.z + 2]], 2.4);
        c.actor('fisher', 'villagerFisher', VILLAGE.x - 11, VILLAGE.z + 8, 0).walk([[VILLAGE.x - 4, VILLAGE.z + 5]], 1.8);
        c.actor('hero', 'hero', VILLAGE.x, VILLAGE.z + 5, 0);
      },
      update(c, t, dt) {
        if (once(t, dt, 0.5) || once(t, dt, 2)) c.sound('bell');
        if (t > 2.5) c.get('hero').model.swing('armR', -2.6 + Math.sin(t * 8) * 0.3);
      },
    },
  ],
};
