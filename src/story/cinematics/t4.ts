import type { CinematicScript } from './director';
import { key, raiseArm, turnTowards } from './t1';

/**
 * Cinématique de T4 (Pics de Givre), 8 plans pour les 12 phrases du texte : l'arrivée dans le
 * froid et les traces des golems, le vent et les flocons, le village des igloos et le lac gelé,
 * la vieille pêcheuse qui parle de la Sorcière, la tempête, Lumibloc devant le sanctuaire gelé.
 */

const ARCH = { x: 64.5, z: 114.5 };
const VILLAGE = { x: 44, z: 70 };
const LAKE = { x: 64, z: 60 };
const SANCTUARY = { x: 100, z: 52 };
const SUMMIT = { x: 24, z: 22 };

function once(t: number, dt: number, at: number): boolean {
  return t >= at && t - dt < at;
}

/** Quelques flocons qui tombent autour d'un point. */
function snow(c: Parameters<NonNullable<CinematicScript['shots'][number]['update']>>[0], t: number, dt: number, x: number, z: number, rate: number, spread = 10): void {
  if (Math.floor(t * rate) !== Math.floor((t - dt) * rate)) c.burst(x + (Math.random() - 0.5) * spread, 16, z + (Math.random() - 0.5) * spread, 0xffffff, 3, 0.3);
}

export const T4_CINEMATIC: CinematicScript = {
  id: 'T4',
  biome: 'givre',
  shots: [
    // 1. Après le désert brûlant, voici le froid ! {prenom} grimpe vers les Pics de Givre…
    {
      sentences: 2,
      setup(c) {
        c.sky('day');
        c.music('givre');
        c.camera(key([ARCH.x + 8, 13.5, ARCH.z - 1], [ARCH.x - 1, 11, ARCH.z - 3]), key([ARCH.x + 7, 14, ARCH.z - 5], [ARCH.x - 4, 11, ARCH.z - 12]), 8);
        c.actor('hero', 'hero', ARCH.x, ARCH.z + 3, 0).walk([[ARCH.x, ARCH.z - 5], [ARCH.x - 4, ARCH.z - 12]], 2);
      },
      update(c, t, dt) {
        snow(c, t, dt, ARCH.x - 2, ARCH.z - 6, 5);
      },
    },
    // 3. Ses golems laissent de grandes traces de pas derrière eux.
    {
      sentences: 1,
      setup(c) {
        c.sky('day');
        c.camera(key([ARCH.x - 3, 12.5, ARCH.z - 12], [ARCH.x - 1, 10.4, ARCH.z - 7]), key([ARCH.x - 3.5, 12.2, ARCH.z - 13], [ARCH.x - 2, 10.4, ARCH.z - 9]), 6);
        c.actor('pierre', 'pierre', ARCH.x - 0.5, ARCH.z - 4, 0).walk([[ARCH.x - 1.5, ARCH.z - 10]], 1.4);
        c.actor('hero', 'hero', ARCH.x - 2, ARCH.z - 8, 0).walk([[ARCH.x - 3, ARCH.z - 14]], 1.4);
      },
      update(c, t, dt) {
        // Un petit nuage de neige à chaque grand pas du golem.
        const g = c.get('pierre');
        if (Math.floor(t * 2.5) !== Math.floor((t - dt) * 2.5)) c.burst(g.x, c.ground(g.x, g.z) + 0.1, g.z + 0.3, 0xf4f8ff, 6, 0.5);
      },
    },
    // 4. Le vent souffle si fort que les flocons piquent les joues.
    {
      sentences: 1,
      setup(c) {
        c.sky('day');
        c.camera(key([ARCH.x - 2, 11.6, ARCH.z - 16.5], [ARCH.x - 3, 11.4, ARCH.z - 14]), key([ARCH.x - 2.2, 11.5, ARCH.z - 16], [ARCH.x - 3, 11.4, ARCH.z - 14]), 5);
        c.actor('hero', 'hero', ARCH.x - 3, ARCH.z - 14, Math.PI);
      },
      update(c, t, dt) {
        // Il se protège le visage du bras.
        const hero = c.get('hero');
        hero.model.swing('armR', -2.2 * Math.min(1, t / 0.8));
        if (Math.floor(t * 20) !== Math.floor((t - dt) * 20)) c.burst(hero.x - 3, 11.5 + Math.random(), hero.z - 1 + Math.random() * 2, 0xffffff, 2, 1.4);
        if (once(t, dt, 0.4) || once(t, dt, 2.6)) c.sound('wings');
      },
    },
    // 5. En haut du col, de petites maisons rondes en glace fument doucement… 6. Les habitants… pêchent dans un lac gelé.
    {
      sentences: 2,
      setup(c) {
        c.sky('day');
        c.camera(key([VILLAGE.x + 14, 17, VILLAGE.z + 16], [VILLAGE.x, 11, VILLAGE.z]), key([VILLAGE.x + 20, 16, VILLAGE.z + 8], [LAKE.x - 4, 10, LAKE.z + 2]), 9);
        c.actor('fisher', 'villagerFisher', LAKE.x - 3.5, LAKE.z + 3.5, Math.PI);
        c.actor('flocon', 'flocon', VILLAGE.x + 0.5, VILLAGE.z + 4.5, 0);
      },
      update(c, t, dt) {
        // De petites fumées montent des igloos.
        if (Math.floor(t * 3) !== Math.floor((t - dt) * 3)) {
          c.burst(VILLAGE.x - 10, 14.5, VILLAGE.z - 8, 0xd8dce4, 3, 0.3);
          c.burst(VILLAGE.x + 9, 14.5, VILLAGE.z - 9, 0xd8dce4, 3, 0.3);
        }
        const f = c.get('fisher');
        f.model.swing('armR', -1 + Math.sin(t * 2) * 0.2);
      },
    },
    // 7. « Une sorcière est arrivée sur la montagne, raconte une vieille pêcheuse. 8. On l'appelle la Sorcière du Blizzard.
    {
      sentences: 2,
      setup(c) {
        c.sky('day');
        c.camera(key([VILLAGE.x - 2.5, 12.3, VILLAGE.z + 9], [VILLAGE.x + 1, 11.4, VILLAGE.z + 4.8]), key([VILLAGE.x - 2, 12.1, VILLAGE.z + 8.4], [VILLAGE.x + 1, 11.5, VILLAGE.z + 4.8]), 9);
        c.actor('flocon', 'flocon', VILLAGE.x + 0.5, VILLAGE.z + 4.5, Math.PI * 0.85);
        c.actor('hero', 'hero', VILLAGE.x + 2.6, VILLAGE.z + 5.6, Math.PI * 0.35);
      },
      update(c, t) {
        // Elle montre le sommet du doigt.
        const f = c.get('flocon');
        f.facing = turnTowards(Math.PI * 0.85, Math.atan2(-(SUMMIT.x - f.x), -(SUMMIT.z - f.z)), Math.min(1, Math.max(0, t - 1.5)));
        if (t > 1.5) raiseArm(f, 'armR', 2.2);
      },
    },
    // 9. Depuis qu'elle est là, la tempête ne s'arrête jamais. »
    {
      sentences: 1,
      setup(c) {
        c.sky('dusk', 2);
        c.music('storyNight');
        c.camera(key([SUMMIT.x + 6, 13.5, SUMMIT.z + 6], [SUMMIT.x, 11.5, SUMMIT.z - 1]), key([SUMMIT.x + 5, 13, SUMMIT.z + 5], [SUMMIT.x, 12, SUMMIT.z - 1]), 5);
        c.actor('sorciere', 'sorciere', SUMMIT.x + 0.5, SUMMIT.z - 1.5, Math.PI * 0.25, { y: 10.4 });
      },
      update(c, t, dt) {
        snow(c, t, dt, SUMMIT.x, SUMMIT.z, 30, 16);
        const s = c.get('sorciere');
        s.model.swing('armR', -1.6 + Math.sin(t * 3) * 0.4);
        s.y = 10.4 + Math.sin(t * 1.5) * 0.2;
        if (once(t, dt, 0.5)) c.sound('wings');
        if (once(t, dt, 2)) c.sound('roar');
      },
    },
    // 10. Lumibloc regarde le sommet : « Elle garde le quatrième éclat. 11. Mais d'abord, trouve l'œuf…
    {
      sentences: 2,
      setup(c) {
        c.sky('morning');
        c.music('storyMorning');
        c.camera(key([SANCTUARY.x - 6, 13, SANCTUARY.z + 6], [SANCTUARY.x, 11.5, SANCTUARY.z - 3]), key([SANCTUARY.x - 5, 12.6, SANCTUARY.z + 5], [SANCTUARY.x, 11.6, SANCTUARY.z - 3]), 8);
        c.actor('lumibloc', 'lumibloc', SANCTUARY.x - 2.5, SANCTUARY.z + 1, Math.PI * 0.8);
        c.actor('hero', 'hero', SANCTUARY.x - 4, SANCTUARY.z + 2.5, Math.PI * 0.9);
      },
      update(c, t) {
        const l = c.get('lumibloc');
        l.facing = turnTowards(Math.PI * 0.8, Math.atan2(-(SANCTUARY.x - l.x), -(SANCTUARY.z - 6 - l.z)), Math.min(1, t / 1.5));
        raiseArm(l, 'armR', 1.6 * Math.min(1, t / 1.5));
      },
    },
    // 12. Attention, le sol y est très glissant ! »
    {
      sentences: 1,
      setup(c) {
        c.sky('morning');
        c.camera(key([SANCTUARY.x - 0.5, 18, SANCTUARY.z - 5], [SANCTUARY.x - 0.5, 10, SANCTUARY.z - 11.5]), key([SANCTUARY.x - 0.5, 17.5, SANCTUARY.z - 5.5], [SANCTUARY.x - 0.5, 10, SANCTUARY.z - 11.5]), 6);
        c.actor('hero', 'hero', SANCTUARY.x - 2.5, SANCTUARY.z - 10, Math.PI / 2);
      },
      update(c, t, dt) {
        // Le héros glisse sur la glace en battant des bras.
        const hero = c.get('hero');
        const k = Math.min(1, t / 1.6);
        hero.x = SANCTUARY.x - 2.5 + k * 5;
        hero.model.swing('armL', Math.sin(t * 14) * 1.2, 'z');
        hero.model.swing('armR', -Math.sin(t * 14) * 1.2, 'z');
        if (once(t, dt, 0.2)) c.sound('slide');
        if (k >= 1 && once(t, dt, 1.7)) c.sound('knock');
      },
    },
  ],
};
