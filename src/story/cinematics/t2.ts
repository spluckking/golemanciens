import type { CinematicScript } from './director';
import { STONE, key, raiseArm, turnTowards } from './t1';

/**
 * Cinématique de T2 (Forêt Murmurante), 7 plans pour les 10 phrases du texte : l'éclat rejoint
 * l'Académie, Lumibloc montre l'est, puis la forêt (décor de la Forêt, chargé le temps des plans) :
 * les arbres immenses, les cabanes perchées, les loups et les squelettes, la toile d'argent et la
 * Reine Araignée, enfin le sanctuaire couvert de mousse.
 */

const DOOR = { x: 64.5, z: 35.4 };
/** Lieux de la Forêt (voir world/forest.ts). */
const VILLAGE = { x: 41, z: 51, platformY: 16 };
const LAIR = { x: 24.5, z: 20.5, y: 10 };
const RUINS = { x: 95.5, z: 30.5 };

/** Une fois, au passage de l'instant `at`. */
function once(t: number, dt: number, at: number): boolean {
  return t >= at && t - dt < at;
}

export const T2_CINEMATIC: CinematicScript = {
  id: 'T2',
  biome: 'prairie',
  shots: [
    // 1. Avec son premier golem à ses côtés, {prenom} a battu le Roi Slime et récupéré le premier éclat.
    {
      sentences: 1,
      setup(c) {
        c.set(null);
        c.sky('day');
        c.camera(key([69.5, 20.5, 49], [64.5, 19, 38]), key([68, 22, 46], [64.5, 24, 32]), 7);
        c.actor('hero', 'hero', 64.5, 48, 0).walk([[64.5, 39.5]], 2);
        c.actor('golem', 'pierre', 66.2, 49.5, 0).walk([[66.2, 41]], 2);
        c.actor('stone', 'starStone', STONE[0], STONE[2], 0, { y: STONE[1] });
      },
      update(c, t, dt) {
        const stone = c.get('stone');
        stone.root.rotation.y += dt * 0.8;
        if (Math.floor(t * 3) !== Math.floor((t - dt) * 3)) c.burst(STONE[0], STONE[1] + 0.8, STONE[2], 0xffe680, 3, 0.6);
      },
    },
    // 2. Lumibloc montre du doigt une forêt sombre, à l'est.
    {
      sentences: 1,
      setup(c) {
        c.set(null);
        c.sky('day');
        c.camera(key([62, 18.4, 39.5], [70, 17.6, 36]), key([61, 19, 40.5], [80, 18, 34]), 6);
        c.actor('lumibloc', 'lumibloc', DOOR.x, DOOR.z + 0.4, Math.PI);
        c.actor('hero', 'hero', DOOR.x - 1.4, DOOR.z + 2.2, 0);
      },
      update(c, t) {
        const lumibloc = c.get('lumibloc');
        const k = Math.min(1, Math.max(0, (t - 0.8) * 1.5));
        lumibloc.facing = turnTowards(Math.PI, -Math.PI / 2, k);
        raiseArm(lumibloc, 'armR', 1.5 * k);
        const hero = c.get('hero');
        hero.facing = turnTowards(0, -Math.PI / 2, Math.min(1, Math.max(0, (t - 1.6) * 1.5)));
      },
    },
    // 3. « Voici la Forêt Murmurante. Ses arbres sont si hauts qu'ils cachent le soleil. On dit que les feuilles chuchotent… »
    {
      sentences: 3,
      setup(c) {
        c.set('foret');
        c.sky('morning');
        c.music('storyNight');
        c.camera(key([64, 11.5, 97], [62, 17, 74]), key([63, 12, 92], [60, 21, 70]), 9);
      },
      update(c, t, dt) {
        // Des feuilles et des grains de lumière tombent doucement.
        if (Math.floor(t * 5) !== Math.floor((t - dt) * 5)) {
          const x = 52 + Math.random() * 14;
          const z = 84 + Math.random() * 14;
          c.burst(x, 22, z, Math.random() < 0.5 ? 0x7ac05a : 0xfff0a0, 2, 0.3);
        }
        if (once(t, dt, 2)) c.sound('wings');
      },
    },
    // 4. Dans cette forêt, les habitants ont construit leurs maisons dans les arbres.
    {
      sentences: 1,
      setup(c) {
        c.set('foret');
        c.sky('morning');
        c.music('storyDay');
        c.camera(key([54, 19, 66], [41, 16, 52]), key([50, 21, 64], [40, 17, 50]), 7);
        c.actor('noisette', 'noisette', VILLAGE.x - 1.5, VILLAGE.z + 2.5, Math.PI * 0.85, { y: VILLAGE.platformY });
        c.actor('pip', 'pip', VILLAGE.x - 9, VILLAGE.z - 1, Math.PI * 0.8, { y: VILLAGE.platformY });
        c.actor('tilleul', 'tilleul', VILLAGE.x + 10.5, VILLAGE.z + 4.5, Math.PI * 1.2, { y: VILLAGE.platformY });
      },
      update(c, t) {
        // Pip saute de joie sur sa plateforme ; Noisette salue.
        c.get('pip').y = VILLAGE.platformY + Math.max(0, Math.sin(t * 5)) * 0.35;
        raiseArm(c.get('noisette'), 'armR', Math.min(1, t) * 2.2 + Math.sin(t * 5) * 0.2);
      },
    },
    // 5. Ils ont peur, car des loups d'ombre rôdent près du ruisseau et des squelettes tirent des flèches entre les troncs.
    {
      sentences: 1,
      setup(c) {
        c.set('foret');
        c.sky('dusk');
        c.music('storyNight');
        c.camera(key([72, 13, 94], [70, 10.5, 80]), key([75, 13.5, 92], [72, 10.5, 78]), 7);
        c.actor('wolf1', 'wolf', 64, 82, -Math.PI / 2).walk([[74, 80], [78, 83]], 1.6);
        c.actor('wolf2', 'wolf', 62, 79, -Math.PI / 2).walk([[71, 77], [76, 79]], 1.5);
        c.actor('skeleton', 'skeleton', 80, 72, Math.PI * 0.9);
      },
      update(c, t, dt) {
        const sk = c.get('skeleton');
        // Le squelette lève son arc ; une flèche (étincelle) file entre les troncs.
        sk.model.swing('armL', t > 1.5 ? -1.4 : -1.4 * (t / 1.5));
        if (once(t, dt, 2.6)) {
          c.burst(sk.x - 1, sk.y + 1.3, sk.z + 1, 0xd8d0b8, 6, 0.8);
          c.sound('spark');
        }
      },
    },
    // 6. Au cœur de la forêt, une toile géante brille comme de l'argent. C'est là que se cache la Reine Araignée…
    {
      sentences: 2,
      setup(c) {
        c.set('foret');
        c.sky('night');
        c.camera(key([LAIR.x, LAIR.y + 3, LAIR.z + 13], [LAIR.x, LAIR.y + 3.4, LAIR.z - 2]), key([LAIR.x, LAIR.y + 2.4, LAIR.z + 9], [LAIR.x, LAIR.y + 2.6, LAIR.z - 2]), 8);
        c.actor('web', 'giantWeb', LAIR.x, LAIR.z - 4, 0, { y: LAIR.y, scale: 1.3 });
        c.actor('queen', 'spiderQueen', LAIR.x, LAIR.z - 2.5, Math.PI, { y: LAIR.y + 0.4, scale: 1.7 });
      },
      update(c, t, dt) {
        const queen = c.get('queen');
        // La Reine sort de l'ombre et lève ses pattes avant.
        const k = Math.min(1, Math.max(0, (t - 2.5) / 1.2));
        queen.z = LAIR.z - 3.5 + k * 1.5;
        queen.model.swing('legsL', Math.sin(t * 6) * 0.12 * k, 'z');
        queen.model.swing('legsR', -Math.sin(t * 6) * 0.12 * k, 'z');
        if (once(t, dt, 2.5)) c.sound('roar');
        if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) c.burst(LAIR.x + (Math.random() - 0.5) * 5, LAIR.y + 2 + Math.random() * 3, LAIR.z - 4, 0xe8ecf8, 2, 0.3);
      },
    },
    // 7. Mais avant de l'affronter, {prenom} doit trouver le deuxième œuf, caché dans un sanctuaire couvert de mousse.
    {
      sentences: 1,
      setup(c) {
        c.set('foret');
        c.sky('morning');
        c.music('storyMorning');
        c.camera(key([RUINS.x - 9, 13.5, RUINS.z + 4], [RUINS.x + 4, 11, RUINS.z]), key([RUINS.x - 6, 12.5, RUINS.z + 3], [RUINS.x + 6, 11, RUINS.z]), 7);
        c.actor('hero', 'hero', RUINS.x - 6, RUINS.z + 1, -Math.PI / 2).walk([[RUINS.x - 1.5, RUINS.z]], 1.8);
        c.actor('golem', 'pierre', RUINS.x - 6.5, RUINS.z - 2.2, -Math.PI / 2).walk([[RUINS.x - 2.5, RUINS.z - 1.8]], 1.8);
      },
      update(c, t, dt) {
        if (once(t, dt, 3)) c.burst(RUINS.x + 10, 12, RUINS.z, 0xfff3a0, 16, 1);
        if (once(t, dt, 3)) c.sound('chime');
      },
    },
  ],
};
