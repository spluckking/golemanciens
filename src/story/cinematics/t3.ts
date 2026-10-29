import type { CinematicScript } from './director';
import { key, raiseArm, turnTowards } from './t1';

/**
 * Cinématique de T3 (Désert des Sables Chantants), 8 plans pour les 11 phrases du texte :
 * l'arrivée dans les dunes, le vent qui chante, la soif, le marchand et son chameau, ses
 * avertissements (momies, scorpions, Grand Ver), Lumibloc au temple ensablé, le cristal caché.
 */

const ARCH = { x: 64.5, z: 106.5 };
const VILLAGE = { x: 40, z: 62 };
const TEMPLE = { x: 98.5, z: 38.5 };
const PIT = { x: 24.5, z: 22 };

function once(t: number, dt: number, at: number): boolean {
  return t >= at && t - dt < at;
}

export const T3_CINEMATIC: CinematicScript = {
  id: 'T3',
  biome: 'desert',
  shots: [
    // 1. Le chemin quitte la forêt et le sol devient jaune et chaud. Voici le Désert des Sables Chantants.
    {
      sentences: 2,
      setup(c) {
        c.sky('day');
        c.music('desert');
        c.camera(key([ARCH.x + 4, 14, ARCH.z + 6], [ARCH.x, 11, ARCH.z - 6]), key([ARCH.x + 2, 16, ARCH.z + 2], [ARCH.x - 4, 12, ARCH.z - 20]), 8);
        c.actor('hero', 'hero', ARCH.x, ARCH.z + 4, 0).walk([[ARCH.x, ARCH.z - 4], [ARCH.x - 3, ARCH.z - 10]], 2.2);
      },
    },
    // 2. Quand le vent souffle sur les dunes, le sable fait une drôle de musique, comme une flûte.
    {
      sentences: 1,
      setup(c) {
        c.sky('day');
        c.camera(key([80, 16, 96], [70, 11, 80]), key([76, 15, 92], [64, 12, 76]), 8);
      },
      update(c, t, dt) {
        // Des volutes de sable glissent sur les crêtes.
        if (Math.floor(t * 8) !== Math.floor((t - dt) * 8)) c.burst(60 + Math.random() * 20, 12 + Math.random() * 2, 76 + Math.random() * 14, 0xf0d8a0, 4, 0.6);
        if (once(t, dt, 0.5) || once(t, dt, 2.5)) c.sound('wings');
        if (once(t, dt, 1.5)) c.sound('chime');
      },
    },
    // 3. {prenom} a soif, mais il n'y a pas d'eau à perte de vue.
    {
      sentences: 1,
      setup(c) {
        c.sky('day');
        c.camera(key([58, 12.5, 90], [56, 11, 84]), key([57, 12, 88.5], [55, 11.2, 84]), 6);
        c.actor('hero', 'hero', 55.5, 84, 0.4);
      },
      update(c, t) {
        // Il s'essuie le front et regarde au loin.
        const hero = c.get('hero');
        hero.model.swing('armR', -2.4 * Math.max(0, Math.sin(Math.min(1, t / 1.5) * Math.PI)));
        hero.facing = 0.4 + Math.sin(t * 0.8) * 0.6;
      },
    },
    // 4. Heureusement, un marchand sur son chameau lui indique une oasis, avec des palmiers et un petit village.
    {
      sentences: 1,
      setup(c) {
        c.sky('day');
        c.camera(key([54, 13, 84], [48, 11.5, 72]), key([53, 14, 82], [42, 11, 64]), 7);
        c.actor('hero', 'hero', 52.5, 79, Math.PI * 0.9);
        c.actor('camel', 'camel', 50, 76, -0.6);
        c.actor('zephir', 'zephir', 50, 76, -0.6, { y: 11.2 });
      },
      update(c, t) {
        const z = c.get('zephir');
        z.facing = turnTowards(-0.6, Math.atan2(-(VILLAGE.x - 50), -(VILLAGE.z - 76)), Math.min(1, t / 1.5));
        z.model.swing('armR', -1.5 * Math.min(1, Math.max(0, t - 1)));
      },
    },
    // 5. « Méfie-toi, dit le marchand. Les momies se réveillent quand le soleil se couche, et les scorpions se cachent sous le sable.
    {
      sentences: 2,
      setup(c) {
        c.sky('dusk', 2);
        c.music('storyNight');
        c.camera(key([90, 13, 56], [84, 11, 48]), key([89, 12.5, 54], [84, 11.2, 47]), 7);
        c.actor('mummy1', 'mummy', 83, 47, 0.3, { y: 7 });
        c.actor('mummy2', 'mummy', 86, 49, -0.2, { y: 7 });
        c.actor('scorpion', 'scorpion', 80.5, 52, 0.8, { y: 9.6 });
      },
      update(c, t, dt) {
        // Les momies sortent du sable, bras tendus ; le scorpion lève son dard.
        for (const [id, at] of [['mummy1', 0.6], ['mummy2', 1.4]] as const) {
          const m = c.get(id);
          const k = Math.min(1, Math.max(0, (t - at) / 1.2));
          m.y = c.ground(m.x, m.z) - (1 - k) * 2.2;
          if (once(t, dt, at)) {
            c.burst(m.x, c.ground(m.x, m.z) + 0.2, m.z, 0xe0c890, 14, 1);
            c.sound('poof');
          }
        }
        const s = c.get('scorpion');
        s.y = c.ground(s.x, s.z) - Math.max(0, 1 - t / 2) * 0.6;
      },
    },
    // 6. Et puis, il y a le Grand Ver… Il nage dans les dunes comme un poisson dans l'eau. »
    {
      sentences: 2,
      setup(c) {
        c.sky('dusk');
        c.camera(key([PIT.x + 12, 15, PIT.z + 14], [PIT.x, 11, PIT.z]), key([PIT.x + 10, 14, PIT.z + 12], [PIT.x, 12, PIT.z]), 8);
        c.actor('worm', 'grandVer', PIT.x - 6, PIT.z, 0, { y: 4 });
      },
      update(c, t, dt) {
        // Il plonge et ressort en arc, comme un dauphin.
        const w = c.get('worm');
        const k = (t % 3) / 3;
        w.x = PIT.x - 6 + k * 12;
        w.y = 7 + Math.sin(k * Math.PI) * 4;
        w.facing = -Math.PI / 2;
        w.root.rotation.z = (k - 0.5) * 0.8;
        if (Math.floor(t * 6) !== Math.floor((t - dt) * 6)) c.burst(w.x, 10.5, w.z, 0xe0c080, 6, 1);
        if (once(t, dt, 0.3) || once(t, dt, 3.3)) c.sound('rumble');
      },
    },
    // 7. Lumibloc sourit : « Le troisième œuf est caché dans un temple ensablé.
    {
      sentences: 1,
      setup(c) {
        c.sky('morning');
        c.music('storyMorning');
        c.camera(key([TEMPLE.x - 7, 13, TEMPLE.z + 6], [TEMPLE.x + 3, 12, TEMPLE.z - 6]), key([TEMPLE.x - 6, 12.5, TEMPLE.z + 4], [TEMPLE.x + 3, 12, TEMPLE.z - 6]), 7);
        c.actor('lumibloc', 'lumibloc', TEMPLE.x - 3, TEMPLE.z + 1, Math.PI * 0.75);
        c.actor('hero', 'hero', TEMPLE.x - 4.5, TEMPLE.z + 2.5, Math.PI * 0.9);
      },
      update(c, t) {
        const l = c.get('lumibloc');
        l.facing = turnTowards(Math.PI * 0.75, Math.atan2(-(104 - l.x), -(30 - l.z)), Math.min(1, t / 1.5));
        raiseArm(l, 'armR', 1.6 * Math.min(1, t / 1.5));
      },
    },
    // 8. Et peut-être qu'un Cristal de puissance t'attend quelque part dans ces dunes. »
    {
      sentences: 1,
      setup(c) {
        c.sky('morning');
        c.camera(key([22, 14, 104], [13, 11.5, 113]), key([18, 13, 108], [12.5, 11.5, 114]), 7);
        c.actor('crystal', 'crystalItem', 12.5, 114.5, 0);
      },
      update(c, t, dt) {
        const gem = c.get('crystal').model.part('gem');
        if (gem) {
          gem.rotation.y += dt * 1.5;
          gem.position.y = 0.85 + Math.sin(t * 2) * 0.08;
        }
        if (Math.floor(t * 3) !== Math.floor((t - dt) * 3)) c.burst(12.5, 12.5, 114.5, 0xffc060, 3, 0.4);
        if (once(t, dt, 1)) c.sound('star');
      },
    },
  ],
};
