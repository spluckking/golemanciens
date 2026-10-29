import type { CinematicScript } from './director';
import { key, raiseArm, turnTowards } from './t1';

/**
 * Cinématique de T5 (Île Céleste), 7 plans pour les 10 phrases du texte : les quatre éclats qui
 * flottent autour de Lumibloc, l'île au-dessus des nuages, l'escalier de nuages au lever du soleil,
 * les jardins et les ponts arc-en-ciel, les harpies et le chevalier d'ombre, le Griffon, la promesse
 * du Golem Galaxie.
 */

const ARRIVAL = { x: 64.5, z: 108 };
const VILLAGE = { x: 44, z: 72 };
const TOWER = { x: 18, z: 70 };
const KNIGHTS = { x: 40, z: 44 };
const LAIR = { x: 24.5, z: 22.5 };
const Y = 16;

function once(t: number, dt: number, at: number): boolean {
  return t >= at && t - dt < at;
}

export const T5_CINEMATIC: CinematicScript = {
  id: 'T5',
  biome: 'ciel',
  shots: [
    // 1. Quatre éclats brillent maintenant dans le sac de {prenom}. 2. Lumibloc les pose… ils se mettent à flotter.
    {
      sentences: 2,
      setup(c) {
        c.sky('morning');
        c.music('storyMorning');
        c.camera(key([ARRIVAL.x + 3.5, Y + 2.4, ARRIVAL.z + 4], [ARRIVAL.x, Y + 1.3, ARRIVAL.z]), key([ARRIVAL.x + 3, Y + 2.2, ARRIVAL.z + 3.4], [ARRIVAL.x, Y + 1.5, ARRIVAL.z]), 8);
        c.actor('lumibloc', 'lumibloc', ARRIVAL.x - 0.8, ARRIVAL.z, Math.PI * 0.9);
        c.actor('hero', 'hero', ARRIVAL.x + 1, ARRIVAL.z + 0.6, -Math.PI * 0.6);
        for (let i = 0; i < 4; i++) c.actor(`shard${i}`, 'starShard', ARRIVAL.x, ARRIVAL.z, 0, { y: Y + 0.2, scale: 0.8 });
      },
      update(c, t, dt) {
        // Les éclats s'élèvent puis tournent lentement en cercle.
        const k = Math.min(1, Math.max(0, (t - 1.5) / 1.5));
        for (let i = 0; i < 4; i++) {
          const s = c.get(`shard${i}`);
          const a = t * 0.8 + (i * Math.PI) / 2;
          s.x = ARRIVAL.x + Math.cos(a) * 0.7 * k;
          s.z = ARRIVAL.z + Math.sin(a) * 0.7 * k;
          s.y = Y + 0.2 + k * 1.3 + Math.sin(t * 2 + i) * 0.06;
          s.root.rotation.y += dt * 2;
        }
        raiseArm(c.get('lumibloc'), 'armR', 1.4 * Math.min(1, t / 1.2));
        if (once(t, dt, 1.6)) c.sound('chime');
      },
    },
    // 3. « Le dernier éclat est tout là-haut, sur l'Île Céleste, une île qui vole au-dessus des nuages. »
    {
      sentences: 1,
      setup(c) {
        c.sky('morning');
        c.camera(key([ARRIVAL.x + 14, 8, ARRIVAL.z + 10], [ARRIVAL.x, 14, ARRIVAL.z - 4]), key([ARRIVAL.x + 18, 12, ARRIVAL.z + 6], [VILLAGE.x, 16, VILLAGE.z]), 8);
      },
      update(c, t, dt) {
        if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) c.burst(ARRIVAL.x - 10 + Math.random() * 24, 4 + Math.random() * 3, ARRIVAL.z - 10 + Math.random() * 16, 0xffffff, 4, 0.5);
        if (once(t, dt, 0.8)) c.sound('wings');
      },
    },
    // 4. Pour y monter, il faut prendre l'escalier de nuages… 5. {prenom} et ses golems grimpent marche après marche.
    {
      sentences: 2,
      setup(c) {
        c.sky('morning');
        c.camera(key([ARRIVAL.x + 6, Y - 2, ARRIVAL.z + 14], [ARRIVAL.x, Y - 3, ARRIVAL.z + 8]), key([ARRIVAL.x + 5, Y + 1, ARRIVAL.z + 12], [ARRIVAL.x, Y, ARRIVAL.z + 6]), 9);
        c.actor('hero', 'hero', ARRIVAL.x, ARRIVAL.z + 10, Math.PI, { y: Y - 6 });
        c.actor('golem', 'pierre', ARRIVAL.x + 1.4, ARRIVAL.z + 11.5, Math.PI, { y: Y - 7 });
      },
      update(c, t, dt) {
        // Les marches de nuage apparaissent avec le soleil, puis on grimpe.
        const hero = c.get('hero');
        const golem = c.get('golem');
        const climb = Math.min(1, Math.max(0, (t - 1.5) / 6));
        hero.y = Y - 6 + climb * 6;
        hero.z = ARRIVAL.z + 10 - climb * 5;
        golem.y = Y - 7 + Math.max(0, climb - 0.12) * 7;
        golem.z = ARRIVAL.z + 11.5 - Math.max(0, climb - 0.12) * 5.6;
        hero.model.swing('legL', Math.sin(t * 8) * 0.6 * (climb < 1 ? 1 : 0));
        hero.model.swing('legR', -Math.sin(t * 8) * 0.6 * (climb < 1 ? 1 : 0));
        for (let i = 0; i < 6; i++) {
          if (t > 0.3 + i * 0.2 && Math.floor(t * 6) !== Math.floor((t - dt) * 6)) c.burst(ARRIVAL.x + 0.4, Y - 6.8 + i, ARRIVAL.z + 10 - i * 0.9, 0xffffff, 5, 0.4);
        }
        if (once(t, dt, 0.4)) c.sound('chime');
      },
    },
    // 6. En haut, tout est léger et doux : des jardins flottent dans l'air et des arcs-en-ciel servent de ponts.
    {
      sentences: 1,
      setup(c) {
        c.sky('day', 2);
        c.music('ciel');
        c.camera(key([VILLAGE.x + 30, 26, VILLAGE.z + 26], [VILLAGE.x + 8, 15, VILLAGE.z + 4]), key([VILLAGE.x + 24, 27, VILLAGE.z + 10], [VILLAGE.x, 15, VILLAGE.z - 10]), 9);
      },
      update(c, t, dt) {
        if (Math.floor(t * 3) !== Math.floor((t - dt) * 3)) c.burst(VILLAGE.x + Math.random() * 30, 18 + Math.random() * 4, VILLAGE.z - 10 + Math.random() * 30, 0xfff3a0, 3, 0.4);
      },
    },
    // 7. Mais des harpies tournent autour des tours, et un chevalier d'ombre surveille le pont principal.
    {
      sentences: 1,
      setup(c) {
        c.sky('dusk', 2);
        c.music('storyNight');
        c.camera(key([TOWER.x + 14, 24, TOWER.z - 6], [TOWER.x, 22, TOWER.z]), key([KNIGHTS.x + 8, 19, KNIGHTS.z + 10], [KNIGHTS.x, 17, KNIGHTS.z]), 9);
        for (let i = 0; i < 3; i++) c.actor(`harpy${i}`, 'harpy', TOWER.x, TOWER.z, 0, { y: 24 });
        c.actor('knight', 'darkKnight', KNIGHTS.x + 0.5, KNIGHTS.z + 4, Math.PI * 0.1);
      },
      update(c, t, dt) {
        for (let i = 0; i < 3; i++) {
          const h = c.get(`harpy${i}`);
          const a = t * 0.9 + (i * Math.PI * 2) / 3;
          h.x = TOWER.x + 0.5 + Math.cos(a) * 4;
          h.z = TOWER.z + 0.5 + Math.sin(a) * 4;
          h.y = 23 + Math.sin(t * 2 + i) * 0.6;
          h.facing = -a;
          const flap = Math.sin(t * 9 + i) * 0.5;
          h.model.swing('wingL', flap, 'z');
          h.model.swing('wingR', -flap, 'z');
        }
        if (once(t, dt, 0.5)) c.sound('wings');
      },
    },
    // 8. Leur chef est le Griffon d'Ombre, un serviteur du dragon.
    {
      sentences: 1,
      setup(c) {
        c.sky('dusk');
        c.camera(key([LAIR.x + 6, Y + 3, LAIR.z + 9], [LAIR.x, Y + 2, LAIR.z]), key([LAIR.x + 5, Y + 2.5, LAIR.z + 7.5], [LAIR.x, Y + 2.2, LAIR.z]), 6);
        c.actor('griffon', 'griffon', LAIR.x, LAIR.z, Math.PI * 0.85);
      },
      update(c, t, dt) {
        const g = c.get('griffon');
        const flap = Math.sin(t * 3) * 0.35 * Math.min(1, t);
        g.model.swing('wingL', flap, 'z');
        g.model.swing('wingR', -flap, 'z');
        if (once(t, dt, 1.4)) {
          c.sound('roar');
          c.shake(0.25, 0.8);
        }
      },
    },
    // 9. « Quand tu auras les cinq éclats… 10. Avec elle, un de tes golems deviendra un Golem Galaxie ! »
    {
      sentences: 2,
      setup(c) {
        c.sky('morning');
        c.music('storyMorning');
        c.camera(key([ARRIVAL.x + 3, Y + 2, ARRIVAL.z + 3.5], [ARRIVAL.x - 0.5, Y + 1.2, ARRIVAL.z]), key([ARRIVAL.x + 2.6, Y + 1.8, ARRIVAL.z + 3], [ARRIVAL.x - 0.5, Y + 1.3, ARRIVAL.z]), 9);
        c.actor('lumibloc', 'lumibloc', ARRIVAL.x - 1.2, ARRIVAL.z, Math.PI * 0.8);
        c.actor('hero', 'hero', ARRIVAL.x + 0.8, ARRIVAL.z + 0.8, -Math.PI * 0.6);
        c.actor('galaxie', 'shadowGalaxie', ARRIVAL.x - 0.2, ARRIVAL.z - 1.8, 0);
      },
      update(c, t, dt) {
        const l = c.get('lumibloc');
        l.facing = turnTowards(Math.PI * 0.8, Math.PI * 0.6, Math.min(1, t / 1.5));
        raiseArm(l, 'armR', 1.8 * Math.min(1, t / 1.5));
        // La silhouette du Galaxie se dessine en étoiles.
        if (t > 3 && Math.floor(t * 8) !== Math.floor((t - dt) * 8)) c.burst(ARRIVAL.x - 0.2 + (Math.random() - 0.5), Y + 1 + Math.random(), ARRIVAL.z - 1.8, 0x9ad8ff, 3, 0.4);
        if (once(t, dt, 3)) c.sound('star');
      },
    },
  ],
};
