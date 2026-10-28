import type { CinematicScript, Vec3 } from './director';
import { STONE, bezier, key, raiseArm } from './t1';

/**
 * Cinématique de l'outro O1 (après le Roi Slime), 4 plans pour les 6 phrases du texte :
 * le Roi Slime éclate en gouttes, l'éclat brille dans la flaque, {prenom} le rapporte
 * à l'Académie (l'éclat rejoint la tour), Lumibloc le félicite.
 */

const MARSH = { x: 18.5, z: 114.5 };

export const O1_CINEMATIC: CinematicScript = {
  id: 'O1',
  shots: [
    // 1. Le Roi Slime éclate en mille petites gouttes vertes qui s'enfuient en sautillant.
    {
      sentences: 1,
      setup(c) {
        const g = c.ground(MARSH.x, MARSH.z);
        c.sky('day');
        c.camera(key([MARSH.x, g + 4.2, MARSH.z - 8.5], [MARSH.x, g + 1, MARSH.z]), key([MARSH.x, g + 3.4, MARSH.z - 7], [MARSH.x, g + 0.8, MARSH.z]), 6);
        c.actor('boss', 'roiSlime', MARSH.x, MARSH.z, Math.PI);
        for (let i = 0; i < 8; i++) c.actor(`drop${i}`, 'slime', MARSH.x, MARSH.z, 0, { y: g, scale: 0.001 });
      },
      update(c, t, dt) {
        const g = c.ground(MARSH.x, MARSH.z);
        const boss = c.get('boss');
        const pop = 0.9;
        if (t < pop) boss.root.scale.setScalar(1 + Math.sin(t * 30) * 0.05 * (t / pop));
        if (t >= pop && t - dt < pop) {
          boss.root.visible = false;
          c.flash(0.4);
          c.burst(MARSH.x, g + 1.2, MARSH.z, 0x5ec45e, 40, 2);
          c.sound('split');
        }
        for (let i = 0; i < 8; i++) {
          const d = c.get(`drop${i}`);
          if (t < pop) continue;
          const k = t - pop;
          const a = (i / 8) * Math.PI * 2;
          d.root.scale.setScalar(0.4);
          d.x = MARSH.x + Math.cos(a) * k * 2.2;
          d.z = MARSH.z + Math.sin(a) * k * 2.2;
          d.y = c.ground(d.x, d.z) + Math.abs(Math.sin(k * 7 + i)) * 0.7;
          d.facing = Math.atan2(-Math.cos(a), -Math.sin(a));
        }
      },
    },
    // 2. Au milieu de la flaque, quelque chose brille : le premier éclat de la Pierre-Étoile !
    {
      sentences: 1,
      setup(c) {
        const g = c.ground(MARSH.x, MARSH.z);
        c.sky('day');
        c.camera(key([MARSH.x + 1.5, g + 2.4, MARSH.z - 4.2], [MARSH.x, g + 0.9, MARSH.z]), key([MARSH.x + 1, g + 1.8, MARSH.z - 3.2], [MARSH.x, g + 1, MARSH.z]), 5);
        c.actor('puddle', 'puddle', MARSH.x, MARSH.z, 0).root.scale.setScalar(2.4);
        c.sound('chime');
        c.actor('shard', 'starShard', MARSH.x, MARSH.z, 0, { y: g + 0.5, scale: 1.6 });
        // {prenom} arrive par la gauche de l'image, sans cacher l'éclat.
        c.actor('hero', 'hero', MARSH.x - 4.5, MARSH.z - 3.5, 0).walk([[MARSH.x - 1.6, MARSH.z - 1]], 1.8);
      },
      update(c, t, dt) {
        const g = c.ground(MARSH.x, MARSH.z);
        const shard = c.get('shard');
        shard.y = g + 0.5 + Math.min(1, t / 2) * 0.6 + Math.sin(t * 2) * 0.08;
        shard.root.rotation.y += dt * 1.5;
        if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) c.burst(shard.x, shard.y + 0.3, shard.z, 0xffe680, 3, 0.5);
        const hero = c.get('hero');
        if (!hero.walking) hero.facing = Math.atan2(-(MARSH.x - hero.x), -(MARSH.z - hero.z));
      },
    },
    // 3. {prenom} le rapporte à l'Académie : l'éclat s'envole et rejoint la tour.
    {
      sentences: 1,
      setup(c) {
        c.sky('day');
        c.camera(key([69.5, 20.5, 49], [64.5, 22, 34]), key([68, 24, 47], [64.5, 29, 28]), 7);
        c.actor('hero', 'hero', 64.5, 48, 0).walk([[64.5, 39]], 2.2);
        c.actor('shard', 'starShard', 64.5, 48, 0, { y: 18, scale: 1.4 });
      },
      update(c, t, dt) {
        const hero = c.get('hero');
        const shard = c.get('shard');
        const launch = 3.2;
        shard.root.rotation.y += dt * 2;
        if (t < launch) {
          // L'éclat flotte au-dessus de la tête du héros.
          shard.x = hero.x;
          shard.z = hero.z;
          shard.y = hero.y + 2.4 + Math.sin(t * 3) * 0.1;
          return;
        }
        if (t - dt < launch) c.sound('spark');
        const k = Math.min(1, (t - launch) / 2.2);
        const from: Vec3 = [64.5, hero.y + 2.4, 39];
        const p = bezier(from, [66, 36, 32], [STONE[0], STONE[1] + 0.6, STONE[2]], k);
        [shard.x, shard.y, shard.z] = p;
        if (Math.floor(t * 10) !== Math.floor((t - dt) * 10)) c.burst(p[0], p[1], p[2], 0xffe680, 3, 0.4);
        if (k >= 1 && t - dt < launch + 2.2) {
          c.flash(0.4);
          c.burst(STONE[0], STONE[1] + 0.8, STONE[2], 0xfff3a0, 30, 1.6);
          c.sound('chime');
        }
      },
    },
    // 4. Lumibloc sourit : « Bravo. Un éclat sur cinq. Prochaine étape : la Forêt Murmurante. »
    {
      sentences: 3,
      setup(c) {
        c.sky('day');
        c.camera(key([67.2, 18.9, 41.5], [64.5, 17.8, 35.4]), key([66.4, 18.4, 39.8], [64.5, 17.9, 35.4]), 6);
        c.actor('lumibloc', 'lumibloc', 64.5, 35.4, Math.PI);
        c.actor('hero', 'hero', 63.4, 37.8, -0.4);
        c.actor('shard', 'starShard', STONE[0], STONE[2], 0, { y: STONE[1] + 0.6, scale: 1.4 });
        c.sound('quest');
      },
      update(c, t, dt) {
        // Lumibloc lève le bras pour féliciter ; {prenom} saute de joie.
        raiseArm(c.get('lumibloc'), 'armR', Math.min(1, t * 2) * 2.4 + Math.sin(t * 6) * 0.15);
        const hero = c.get('hero');
        hero.y = c.ground(hero.x, hero.z) + (t > 1.2 ? Math.max(0, Math.sin((t - 1.2) * 5)) * 0.45 : 0);
        c.get('shard').root.rotation.y += dt;
      },
    },
  ],
};
