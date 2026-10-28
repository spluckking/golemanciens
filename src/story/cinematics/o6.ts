import type { CinematicScript, Vec3 } from './director';
import { bezier, flyDragon, key, raiseArm, turnTowards } from './t1';

/**
 * Outro finale O6 (SPEC.md § 9.4) : le Dragon d'Ombre se change en fumée au-dessus de son
 * volcan (décor construit pour la cinématique), le ciel redevient bleu, le village danse,
 * et Lumibloc accroche une médaille d'or au cou de {prenom}. Le générique suit.
 */

/** Cratère du décor du volcan (voir volcanoSet.ts). */
const CRATER = { x: 32.5, z: 30.5, rimY: 22 };
const ACADEMY_DOOR = { x: 64.5, z: 35.4 };
const SMOKE = 0x2c2632;
const FIREWORKS = [0xff6a6a, 0xffd23a, 0x6ad0ff, 0x9a6aff, 0x7ae07a];

/** Les villageois qui dansent sur la place (x, z, modèle). */
const DANCERS: [number, number, 'mereBrique' | 'paquerette' | 'gaston' | 'villagerFarmer' | 'villagerBaker'][] = [
  [34.2, 86.4, 'mereBrique'],
  [35.4, 84.3, 'paquerette'],
  [37.8, 84.1, 'gaston'],
  [39.2, 86.3, 'villagerFarmer'],
  [33.6, 88.6, 'villagerBaker'],
];

/** Une fois, au passage de l'instant `at`. */
function once(t: number, dt: number, at: number): boolean {
  return t >= at && t - dt < at;
}

export const O6_CINEMATIC: CinematicScript = {
  id: 'O6',
  shots: [
    // 1. Le Dragon d'Ombre pousse un dernier cri et se change en fumée.
    {
      sentences: 1,
      setup(c) {
        c.set('volcano');
        c.sky('ember');
        c.music('dragon');
        c.camera(key([CRATER.x, 17, 50], [CRATER.x, 26, CRATER.z]), key([CRATER.x, 19, 45], [CRATER.x, 27.5, CRATER.z]), 6);
        c.actor('dragon', 'dragon', CRATER.x, CRATER.z, Math.PI, { y: CRATER.rimY + 4.5, scale: 1.4 });
      },
      update(c, t, dt) {
        const dragon = c.get('dragon');
        const cry = 1.2;
        const fade = 1.8;
        const gone = 3.6;
        // Il bat des ailes sur place, cou dressé, puis crie et se dissout en fumée.
        const hover: Vec3 = [CRATER.x, CRATER.rimY + 4.5 + Math.sin(t * 2) * 0.3 + Math.max(0, t - fade) * 1.2, CRATER.z];
        flyDragon(dragon, [hover[0], hover[1], hover[2] - 0.01], hover, t);
        dragon.facing = Math.PI;
        const jaw = dragon.model.part('jaw');
        if (jaw) jaw.rotation.x = t > cry && t < fade + 0.6 ? 0.55 : 0;
        if (once(t, dt, cry)) {
          c.sound('roar');
          c.shake(0.4, 1.2);
        }
        if (t > fade) {
          const k = Math.min(1, (t - fade) / (gone - fade));
          dragon.root.scale.setScalar(1.4 * Math.max(0.001, 1 - k));
          if (Math.floor(t * 12) !== Math.floor((t - dt) * 12)) c.burst(dragon.x + (Math.random() - 0.5) * 3, dragon.y + 1.5, dragon.z + (Math.random() - 0.5) * 3, SMOKE, 8, 1.4);
        }
        if (once(t, dt, fade)) c.sound('poof');
        if (once(t, dt, gone)) {
          dragon.root.visible = false;
          c.burst(hover[0], hover[1] + 1, hover[2], SMOKE, 40, 2.2);
          c.sound('rumble');
        }
      },
    },
    // 2. Au-dessus du volcan, le ciel redevient bleu.
    {
      sentences: 1,
      setup(c) {
        c.set('volcano');
        c.sky('ember');
        c.sky('day', 3.5);
        c.music('finale');
        c.camera(key([16, 10, 50], [CRATER.x, 19, CRATER.z]), key([20, 18, 54], [CRATER.x, 20, CRATER.z]), 7);
      },
      update(c, t, dt) {
        // Les dernières volutes de fumée s'envolent et se dissipent.
        if (t < 2 && Math.floor(t * 6) !== Math.floor((t - dt) * 6)) c.burst(CRATER.x, CRATER.rimY + 4 + t * 3, CRATER.z, SMOKE, 6, 1);
        if (once(t, dt, 2.5)) c.sound('chime');
      },
    },
    // 3. Partout dans Cubeterre, les monstres s'enfuient et les villageois sortent en dansant.
    {
      sentences: 1,
      setup(c) {
        c.set(null);
        c.sky('day');
        c.music('finale');
        const g = c.ground(36.5, 87);
        c.camera(key([41.6, g + 4.2, 80.2], [36.5, g - 0.2, 87.8]), key([40.8, g + 3.6, 81.4], [36.5, g - 0.1, 87.8]), 7);
        DANCERS.forEach(([x, z, model], i) => c.actor(`dancer${i}`, model, x, z, Math.PI * 0.8 + i));
        // Les monstres passent en courant derrière la fête et disparaissent vers l'ouest.
        c.actor('slime', 'slime', 42, 92.5, -Math.PI / 2).walk([[28.5, 86.5]], 4.2);
        c.actor('zombie', 'zombie', 43.5, 93.5, -Math.PI / 2).walk([[29.5, 87.5]], 3.6);
      },
      update(c, t) {
        DANCERS.forEach((_, i) => {
          const d = c.get(`dancer${i}`);
          const phase = t * 6 + i * 1.3;
          d.y = c.ground(d.x, d.z) + Math.abs(Math.sin(phase)) * 0.35;
          d.facing += Math.sin(t * 1.5 + i) * 0.02;
          raiseArm(d, 'armL', 2.2 + Math.sin(phase) * 0.5);
          raiseArm(d, 'armR', 2.2 - Math.sin(phase) * 0.5);
        });
        const slime = c.get('slime');
        slime.y = c.ground(slime.x, slime.z) + Math.abs(Math.sin(t * 9)) * 0.5;
      },
    },
    // 4. À l'Académie, Lumibloc accroche une médaille d'or au cou de {prenom}.
    {
      sentences: 1,
      setup(c) {
        c.set(null);
        c.sky('day');
        c.music('finale');
        const heroZ = ACADEMY_DOOR.z + 1.8;
        const g = c.ground(ACADEMY_DOOR.x, heroZ);
        c.camera(key([68.6, g + 1.9, 36.6], [64.5, g + 1.1, 36.4]), key([67.6, g + 1.6, 36.5], [64.5, g + 1.1, 36.4]), 6);
        c.actor('lumibloc', 'lumibloc', ACADEMY_DOOR.x, ACADEMY_DOOR.z, Math.PI);
        c.actor('hero', 'hero', ACADEMY_DOOR.x, heroZ, 0);
        c.actor('medal', 'medal', ACADEMY_DOOR.x, ACADEMY_DOOR.z + 0.7, 0, { y: g + 0.25 });
      },
      update(c, t, dt) {
        const lumibloc = c.get('lumibloc');
        const hero = c.get('hero');
        const medal = c.get('medal');
        // Lumibloc tend la médaille à deux mains, puis la passe au cou de {prenom}.
        const reach = t > 0.5 && t < 2.8 ? Math.min(1, (t - 0.5) * 2) : Math.max(0, 1 - (t - 2.8) * 2);
        lumibloc.model.swing('armL', -1.3 * reach);
        lumibloc.model.swing('armR', -1.3 * reach);
        const k = Math.min(1, Math.max(0, (t - 1) / 1.4));
        const from: Vec3 = [ACADEMY_DOOR.x, hero.y + 0.25, ACADEMY_DOOR.z + 0.7];
        const to: Vec3 = [hero.x, hero.y, hero.z];
        [medal.x, medal.y, medal.z] = bezier(from, [hero.x, hero.y + 0.8, (from[2] + to[2]) / 2], to, k);
        const star = medal.model.part('star');
        if (star) star.rotation.z = t * 2;
        // Elle tournoie en passant de l'un à l'autre, puis reste sur la poitrine de {prenom}.
        medal.facing = k < 1 ? t * 5 : hero.facing;
        if (once(t, dt, 2.4)) {
          c.burst(hero.x, hero.y + 1, hero.z - 0.3, 0xffe27a, 18, 1);
          c.sound('chime');
        }
        // {prenom} se tourne vers nous pour montrer sa médaille, et saute de joie.
        if (t > 2.6) hero.facing = turnTowards(0, -Math.PI / 2, Math.min(1, (t - 2.6) * 2));
        if (t > 3.2) {
          const jump = Math.max(0, Math.sin((t - 3.2) * 5)) * 0.45;
          hero.y = c.ground(hero.x, hero.z) + jump;
          medal.y = hero.y;
        }
      },
    },
    // 5. FIN… pour l'instant !
    {
      sentences: 2,
      setup(c) {
        c.set(null);
        c.sky('day');
        c.music('finale');
        const g = c.ground(64.5, 39);
        // Toute la bande devant l'Académie, puis la caméra recule pour le feu d'artifice.
        c.camera(key([64.5, g + 2.4, 46], [64.5, g + 1.5, 38]), key([64.5, g + 2.9, 49.5], [64.5, g + 3.4, 37]), 7);
        c.actor('pierre', 'pierre', 61.9, 39.4, Math.PI);
        c.actor('hero', 'hero', 63.7, 39, Math.PI);
        c.actor('medal', 'medal', 63.7, 39, Math.PI);
        c.actor('lumibloc', 'lumibloc', 65.3, 38.8, Math.PI);
        c.actor('mousse', 'mousse', 67.1, 39.4, Math.PI);
      },
      update(c, t, dt) {
        raiseArm(c.get('lumibloc'), 'armR', Math.min(1, t * 2) * 2.4 + Math.sin(t * 6) * 0.15);
        const hero = c.get('hero');
        const medal = c.get('medal');
        hero.y = medal.y = c.ground(hero.x, hero.z) + Math.max(0, Math.sin(t * 5 + 1)) * 0.35;
        for (const [id, offset] of [['pierre', 0], ['mousse', 0.4]] as const) {
          const golem = c.get(id);
          golem.y = c.ground(golem.x, golem.z) + Math.max(0, Math.sin(t * 4 + offset)) * 0.3;
        }
        // Feu d'artifice au-dessus de l'Académie.
        const every = 0.6;
        if (Math.floor(t / every) !== Math.floor((t - dt) / every)) {
          const n = Math.floor(t / every);
          const g = c.ground(64.5, 39);
          const x = 64.5 + ((n * 37) % 13) - 6;
          const y = g + 6.5 + (n % 3) * 1.2;
          const color = FIREWORKS[n % FIREWORKS.length];
          c.burst(x, y, 35, color, 60, 3);
          c.burst(x, y, 35, 0xffffff, 16, 1.4);
          c.sound(n % 2 ? 'pop' : 'chime');
        }
      },
    },
  ],
};
