import type { CinematicScript } from './director';
import { flyDragon, key, raiseArm, turnTowards } from './t1';

/**
 * Cinématique de T6 (Volcan d'Ombre), 8 plans pour les 16 phrases du texte : le Golem Galaxie qui
 * brille, la vieille carte de Lumibloc, le volcan et ses rivières de lave, l'armure du dragon, le
 * pont de pierre noire, les yeux rouges au fond du cratère, le dragon qui déploie ses ailes et parle,
 * puis {prenom} et ses golems prêts pour le combat final.
 */

const ARRIVAL = { x: 48.5, z: 80.5 };
const BRIDGE = { x: 48.5, z0: 46, z1: 35 };
const CRATER = { x: 48.5, z: 20.5 };
const Y = 10;

function once(t: number, dt: number, at: number): boolean {
  return t >= at && t - dt < at;
}

export const T6_CINEMATIC: CinematicScript = {
  id: 'T6',
  biome: 'volcan',
  shots: [
    // 1. Le Golem Galaxie brille de mille étoiles. 2. Grâce à lui, Cubeterre a enfin une chance.
    {
      sentences: 2,
      setup(c) {
        c.sky('dusk');
        c.music('storyNight');
        c.camera(key([ARRIVAL.x + 3, Y + 1.8, ARRIVAL.z - 3.5], [ARRIVAL.x, Y + 1.2, ARRIVAL.z]), key([ARRIVAL.x + 2.4, Y + 1.6, ARRIVAL.z - 3], [ARRIVAL.x, Y + 1.3, ARRIVAL.z]), 8);
        c.actor('galaxie', 'galaxie', ARRIVAL.x, ARRIVAL.z, Math.PI, { scale: 1.36 });
      },
      update(c, t, dt) {
        const g = c.get('galaxie');
        if (Math.floor(t * 8) !== Math.floor((t - dt) * 8)) c.burst(g.x + (Math.random() - 0.5) * 1.6, Y + 0.4 + Math.random() * 2.2, g.z + (Math.random() - 0.5) * 1.6, Math.random() < 0.5 ? 0xfff3a0 : 0x9ad8ff, 2, 0.3);
        raiseArm(g, 'armR', 2.2 * Math.min(1, Math.max(0, t - 2)));
        if (once(t, dt, 0.6)) c.sound('star');
      },
    },
    // 3. Lumibloc ouvre une vieille carte.
    {
      sentences: 1,
      setup(c) {
        c.sky('dusk');
        c.camera(key([ARRIVAL.x - 2, Y + 2, ARRIVAL.z + 3], [ARRIVAL.x, Y + 1.1, ARRIVAL.z]), key([ARRIVAL.x - 1.6, Y + 1.8, ARRIVAL.z + 2.4], [ARRIVAL.x, Y + 1, ARRIVAL.z]), 5);
        c.actor('lumibloc', 'lumibloc', ARRIVAL.x - 0.4, ARRIVAL.z, Math.PI * 0.2);
        c.actor('hero', 'hero', ARRIVAL.x + 1, ARRIVAL.z + 0.4, -Math.PI * 0.4);
        c.actor('map', 'mapPiece', ARRIVAL.x + 0.2, ARRIVAL.z + 0.2, 0, { y: Y + 0.9, scale: 1.6 });
      },
      update(c, t) {
        raiseArm(c.get('lumibloc'), 'armR', 1.2 * Math.min(1, t));
        raiseArm(c.get('lumibloc'), 'armL', 1.2 * Math.min(1, t));
        c.get('map').root.rotation.x = -Math.min(1, t) * 1.2;
      },
    },
    // 4. « Le Dragon d'Ombre vit dans le Volcan d'Ombre, au bout du monde. 5. La lave y coule comme des rivières…
    {
      sentences: 2,
      setup(c) {
        c.sky('ember', 2);
        c.music('dragon');
        c.camera(key([ARRIVAL.x + 20, 26, ARRIVAL.z + 2], [CRATER.x, 14, CRATER.z + 20]), key([ARRIVAL.x + 14, 28, ARRIVAL.z - 14], [CRATER.x, 14, CRATER.z]), 9);
      },
      update(c, t, dt) {
        if (Math.floor(t * 6) !== Math.floor((t - dt) * 6)) c.burst(20 + Math.random() * 56, 12 + Math.random() * 4, 30 + Math.random() * 40, Math.random() < 0.3 ? 0xff7a2a : 0x4a3a44, 4, 0.6);
        if (once(t, dt, 1)) c.sound('rumble');
      },
    },
    // 6. Son armure est si dure que rien ne peut la casser… 7. sauf la lumière des étoiles. »
    {
      sentences: 2,
      setup(c) {
        c.sky('ember');
        c.camera(key([CRATER.x + 7, Y + 4, CRATER.z + 9], [CRATER.x, Y + 3, CRATER.z]), key([CRATER.x + 6, Y + 3.6, CRATER.z + 7.6], [CRATER.x, Y + 3.2, CRATER.z]), 8);
        c.actor('dragon', 'dragon', CRATER.x, CRATER.z, 0, { y: Y + 2.4, scale: 1.1 });
        c.actor('star', 'starShard', CRATER.x + 2, CRATER.z + 3, 0, { y: Y + 5, scale: 1.2 });
      },
      update(c, t, dt) {
        const d = c.get('dragon');
        flyDragon(d, [CRATER.x, Y + 2.4, CRATER.z + 0.01], [CRATER.x, Y + 2.4 + Math.sin(t) * 0.2, CRATER.z], t * 0.4);
        d.facing = 0;
        // Des cailloux rebondissent sur l'armure ; puis une étoile y laisse une trace de lumière.
        if (t < 3.5 && Math.floor(t * 3) !== Math.floor((t - dt) * 3)) {
          c.burst(CRATER.x + (Math.random() - 0.5) * 2, Y + 3, CRATER.z + 1.5, 0x8a8a98, 8, 0.8);
          c.sound('knock');
        }
        const s = c.get('star');
        const k = Math.min(1, Math.max(0, (t - 3.5) / 1.2));
        s.x = CRATER.x + 2 - k * 2;
        s.y = Y + 5 - k * 1.8;
        s.z = CRATER.z + 3 - k * 2;
        s.root.visible = t > 3.2 && k < 1;
        if (once(t, dt, 4.7)) {
          c.burst(CRATER.x, Y + 3.2, CRATER.z + 1, 0xfff3a0, 40, 1.6);
          c.sound('star');
        }
      },
    },
    // 8. {prenom} traverse un pont de pierre noire au-dessus de la lave. 9. Il fait de plus en plus chaud.
    {
      sentences: 2,
      setup(c) {
        c.sky('ember');
        c.camera(key([BRIDGE.x + 7, Y + 3, BRIDGE.z0 + 3], [BRIDGE.x, Y + 1, BRIDGE.z0 - 3]), key([BRIDGE.x + 6, Y + 3.5, BRIDGE.z1 + 2], [BRIDGE.x, Y + 1, BRIDGE.z1 - 2]), 9);
        c.actor('hero', 'hero', BRIDGE.x, BRIDGE.z0 + 1, 0).walk([[BRIDGE.x, BRIDGE.z1 - 1]], 1.6);
        c.actor('galaxie', 'galaxie', BRIDGE.x, BRIDGE.z0 + 3, 0, { scale: 1.36 }).walk([[BRIDGE.x, BRIDGE.z1 + 1]], 1.6);
      },
      update(c, t, dt) {
        if (Math.floor(t * 10) !== Math.floor((t - dt) * 10)) c.burst(BRIDGE.x + (Math.random() < 0.5 ? -3 : 3) + (Math.random() - 0.5) * 4, Y, BRIDGE.z0 - Math.random() * 11, 0xff8a2a, 3, 0.6);
        // Il s'essuie le front.
        if (t > 4) c.get('hero').model.swing('armR', -2.4 * Math.sin(Math.min(1, (t - 4) / 1.5) * Math.PI));
      },
    },
    // 10. Tout au fond du cratère, deux yeux rouges s'allument.
    {
      sentences: 1,
      setup(c) {
        c.sky('night', 1.5);
        c.camera(key([CRATER.x, Y + 2.5, CRATER.z + 7], [CRATER.x, Y + 3.2, CRATER.z]), key([CRATER.x, Y + 2.8, CRATER.z + 5.5], [CRATER.x, Y + 3.4, CRATER.z]), 5);
        c.actor('dragon', 'dragon', CRATER.x, CRATER.z, 0, { y: Y + 1.4, scale: 1.1 });
      },
      update(c, t, dt) {
        if (once(t, dt, 1.6)) {
          c.sound('roar');
          c.burst(CRATER.x - 0.5, Y + 4, CRATER.z + 2, 0xff3a3a, 10, 0.4);
          c.burst(CRATER.x + 0.5, Y + 4, CRATER.z + 2, 0xff3a3a, 10, 0.4);
        }
      },
    },
    // 11. Le dragon déploie ses ailes immenses. 12. « Tu crois pouvoir me battre… » 13. gronde-t-il.
    {
      sentences: 3,
      setup(c) {
        c.sky('ember', 1.5);
        c.camera(key([CRATER.x + 10, Y + 3, CRATER.z + 12], [CRATER.x, Y + 4, CRATER.z]), key([CRATER.x + 8, Y + 2.4, CRATER.z + 10], [CRATER.x, Y + 5, CRATER.z]), 9);
        c.actor('dragon', 'dragon', CRATER.x, CRATER.z, 0, { y: Y + 1.4, scale: 1.1 });
      },
      update(c, t, dt) {
        const d = c.get('dragon');
        const rise = Math.min(1, t / 3);
        flyDragon(d, [CRATER.x, Y + 1.4, CRATER.z + 0.01], [CRATER.x, Y + 1.4 + rise * 3, CRATER.z], t);
        d.facing = 0;
        const jaw = d.model.part('jaw');
        if (jaw) jaw.rotation.x = t > 3.5 && t < 6.5 ? 0.45 + Math.sin(t * 10) * 0.1 : 0;
        if (once(t, dt, 3.5)) {
          c.sound('roar');
          c.shake(0.35, 1.2);
        }
        if (t > 3 && Math.floor(t * 8) !== Math.floor((t - dt) * 8)) c.burst(CRATER.x + (Math.random() - 0.5) * 8, Y + 1, CRATER.z + (Math.random() - 0.5) * 8, 0x3a2a44, 6, 1);
      },
    },
    // 14. {prenom} serre sa baguette de golémancien. 15. Ses golems se placent autour de lui. 16. Le combat final commence !
    {
      sentences: 3,
      setup(c) {
        c.sky('ember');
        c.music('boss');
        c.camera(key([CRATER.x + 4, Y + 1.8, CRATER.z + 12], [CRATER.x, Y + 1.4, CRATER.z + 7]), key([CRATER.x + 5, Y + 2.6, CRATER.z + 14], [CRATER.x, Y + 2, CRATER.z + 5]), 9);
        c.actor('hero', 'hero', CRATER.x, CRATER.z + 8, Math.PI);
        c.actor('galaxie', 'galaxie', CRATER.x + 3, CRATER.z + 10, Math.PI, { scale: 1.36 }).walk([[CRATER.x + 1.8, CRATER.z + 7.2]], 1.4);
        c.actor('golem', 'pierre', CRATER.x - 3, CRATER.z + 10, Math.PI, { scale: 1.36 }).walk([[CRATER.x - 1.8, CRATER.z + 7.2]], 1.4);
      },
      update(c, t, dt) {
        const hero = c.get('hero');
        hero.facing = turnTowards(Math.PI, 0, Math.min(1, t / 1.2));
        raiseArm(hero, 'armR', 2.6 * Math.min(1, Math.max(0, t - 1)));
        if (once(t, dt, 1.2)) c.sound('chime');
        if (once(t, dt, 4.5)) c.sound('gong');
      },
    },
  ],
};
