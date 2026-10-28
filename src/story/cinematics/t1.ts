import type { Actor, CameraKey, CinematicScript, Vec3 } from './director';

/**
 * Cinématique du texte T1 (intro du jeu). 11 plans pour les 13 phrases du texte :
 * l'Académie, Lumibloc, la maison au village, la nuit du dragon, les éclats,
 * les golems devenus œufs, les monstres, et le départ.
 */

const ACADEMY = { x: 64.5, z: 26.5 };
const STONE: Vec3 = [64.5, 32, 26.5];
const HOME_DOOR = { x: 36.5, z: 92.5 };
const SANCTUARY = { x: 113, z: 100 };

/** Point d'une courbe de Bézier quadratique. */
function bezier(a: Vec3, b: Vec3, c: Vec3, t: number): Vec3 {
  const u = 1 - t;
  return [0, 1, 2].map((i) => u * u * a[i] + 2 * u * t * b[i] + t * t * c[i]) as Vec3;
}

function key(pos: Vec3, look: Vec3): CameraKey {
  return { pos, look };
}

/** Fait voler le dragon : battements d'ailes, queue qui ondule, cap dans le sens du vol. */
function flyDragon(dragon: Actor, from: Vec3, to: Vec3, t: number): void {
  dragon.x = to[0];
  dragon.y = to[1];
  dragon.z = to[2];
  const vx = to[0] - from[0];
  const vz = to[2] - from[2];
  if (Math.hypot(vx, vz) > 1e-4) dragon.facing = Math.atan2(-vx, -vz);
  const flap = Math.sin(t * 5.5);
  const m = dragon.model;
  m.swing('wingL', flap * 0.55, 'z');
  m.swing('wingR', -flap * 0.55, 'z');
  m.swing('wingTipL', flap * 0.35, 'z');
  m.swing('wingTipR', -flap * 0.35, 'z');
  const tail = m.part('tail1');
  if (tail) tail.rotation.y = Math.sin(t * 2.2) * 0.25;
  const tail2 = m.part('tail2');
  if (tail2) tail2.rotation.y = Math.sin(t * 2.2 - 0.8) * 0.3;
  dragon.root.rotation.z = -Math.sin(t * 1.3) * 0.08;
}

/** Angle intermédiaire entre deux caps, par le plus court chemin. */
function turnTowards(from: number, to: number, k: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + d * k;
}

/** Bras levé sur le côté (signe de la main). */
function raiseArm(a: Actor, arm: 'armL' | 'armR', angle: number): void {
  a.model.swing(arm, arm === 'armR' ? angle : -angle, 'z');
}

export const T1_CINEMATIC: CinematicScript = {
  id: 'T1',
  shots: [
    // 1. L'Académie en haut de la colline, des apprentis arrivent pour la rentrée.
    {
      sentences: 1,
      setup(c) {
        c.sky('day');
        c.camera(key([64.5, 31, 80], [64.5, 22, 26]), key([64.5, 23.5, 57], [64.5, 20, 28]), 8);
        c.actor('a1', 'apprenticeRed', 62.5, 53, 0).walk([[63.5, 36]], 2.2);
        c.actor('a2', 'apprenticeGreen', 65.5, 50, 0).walk([[64.8, 36.2]], 2.2);
        c.actor('a3', 'apprenticeTeal', 66.5, 56, 0).walk([[65.6, 36.4]], 2.4);
      },
    },
    // 2. {prenom} entre en première année.
    {
      sentences: 1,
      setup(c) {
        c.sky('day');
        c.camera(key([69.5, 19.5, 47.5], [64.5, 17.6, 44]), key([68.8, 18.6, 39.5], [64.5, 17.4, 36]), 6.5);
        c.actor('hero', 'hero', 64.5, 47, 0).walk([[64.5, 37]], 2.1);
        c.actor('a1', 'apprenticeRed', 63.3, 35.4, 0);
        c.actor('a3', 'apprenticeTeal', 65.9, 35.6, 0);
      },
    },
    // 3. Son professeur s'appelle Lumibloc : longue barbe blanche, chapeau couleur ciel.
    {
      sentences: 2,
      setup(c) {
        c.sky('day');
        // Lumibloc se tient juste devant la porte, hors de l'avancée du toit.
        c.camera(key([67.2, 18.9, 41.5], [64.5, 17.8, 35.4]), key([66.4, 18.4, 39.8], [64.5, 17.9, 35.4]), 6);
        c.actor('lumibloc', 'lumibloc', 64.5, 35.4, Math.PI);
        c.actor('hero', 'hero', 63.4, 37.8, -0.4);
      },
      update(c, t) {
        const wave = t < 3 ? Math.min(1, t * 3) * (2.5 + Math.sin(t * 8) * 0.3) : Math.max(0, 1 - (t - 3) * 2) * 2.5;
        raiseArm(c.get('lumibloc'), 'armR', wave);
      },
    },
    // 4. Le soir, {prenom} rentre dormir dans sa petite maison, à Ferme-des-Blocs.
    {
      sentences: 1,
      setup(c) {
        const g = c.ground(HOME_DOOR.x, HOME_DOOR.z);
        c.sky('dusk', 2);
        c.camera(key([42.5, g + 4.8, 83.5], [37, g + 1.4, 91.5]), key([40.5, g + 3.2, 87.2], [36.5, g + 1.3, 92.4]), 7);
        c.actor('hero', 'hero', 43, 88.5, 0).walk([[38.5, 91.2], [36.5, 91.6], [HOME_DOOR.x, 94]], 2.2);
        c.actor('farmer', 'villagerFarmer', 31.5, 85, 0).walk([[28.5, 80.5]], 1.6);
        c.actor('baker', 'villagerBaker', 42, 82.5, Math.PI / 2).walk([[44.5, 80.6]], 1.4);
      },
      update(c) {
        const hero = c.get('hero');
        hero.root.visible = hero.z < HOME_DOOR.z + 0.8;
      },
    },
    // 5. Le premier soir, un bruit terrible le réveille.
    {
      sentences: 1,
      setup(c) {
        const g = c.ground(HOME_DOOR.x, HOME_DOOR.z);
        c.sky('night', 1.2);
        c.camera(key([40.5, g + 2.4, 87.5], [36.5, g + 1.4, 92.5]), key([40, g + 2.1, 88.5], [36.5, g + 1.6, 92]), 6);
        const hero = c.actor('hero', 'hero', HOME_DOOR.x, 93.6, 0);
        hero.root.visible = false;
      },
      update(c, t, dt) {
        const hero = c.get('hero');
        if (t > 0.6 && t - dt <= 0.6) c.shake(0.35, 1.4);
        if (t > 2 && !hero.root.visible) {
          hero.root.visible = true;
          hero.walk([[HOME_DOOR.x, 90.8]], 1.8);
        }
        // Puis il lève les yeux vers l'Académie.
        if (t > 3.6 && !hero.walking) hero.facing = Math.atan2(-(ACADEMY.x - hero.x), -(ACADEMY.z - hero.z));
      },
    },
    // 6. Dans le ciel noir, un immense dragon frappe la Pierre-Étoile.
    {
      sentences: 1,
      setup(c) {
        c.sky('night');
        c.camera(key([64.5, 23.5, 54], [64.5, 30, 26]), key([64.5, 24.5, 49], [64.5, 31.5, 26]), 7);
        c.actor('stone', 'starStone', STONE[0], STONE[2], 0, { y: STONE[1] });
        c.actor('dragon', 'dragon', 96, 30, 0, { y: 34, scale: 1.4 });
      },
      update(c, t, dt) {
        const dragon = c.get('dragon');
        const strike = 3.2;
        const before: Vec3 = [dragon.x, dragon.y, dragon.z];
        // Il arrive par la droite, pique sur la tour, puis repart vers la gauche.
        const hit: Vec3 = [STONE[0] + 3, STONE[1] + 2.5, STONE[2] + 5];
        let pos: Vec3;
        if (t < strike) pos = bezier([96, 30, 30], [84, 42, 40], hit, t / strike);
        else pos = bezier(hit, [48, 40, 40], [26, 42, 22], Math.min(1, (t - strike) / 3.5));
        flyDragon(dragon, before, pos, t);
        const jaw = dragon.model.part('jaw');
        if (jaw) jaw.rotation.x = t > strike - 0.8 && t < strike + 0.4 ? 0.5 : 0;
        const stone = c.get('stone');
        stone.root.rotation.y += dt * 0.8;
        if (t > strike && t - dt <= strike) {
          c.flash(0.6);
          c.shake(0.5, 1);
          c.burst(STONE[0], STONE[1] + 1, STONE[2], 0xfff3a0, 30, 2);
          c.burst(STONE[0], STONE[1] + 1, STONE[2], 0xb070ff, 20, 1.6);
        }
        stone.root.scale.setScalar(t > strike ? 1 + Math.sin((t - strike) * 40) * 0.08 : 1);
      },
    },
    // 7. La pierre se brise en cinq éclats qui s'envolent dans toutes les directions.
    {
      sentences: 1,
      setup(c) {
        c.sky('night');
        c.camera(key([64.5, 30.5, 40], [64.5, 32, 26.5]), key([64.5, 35, 60], [64.5, 33, 22]), 6);
        for (let i = 0; i < 5; i++) c.actor(`shard${i}`, 'starShard', STONE[0], STONE[2], 0, { y: STONE[1] + 0.6, scale: 1.8 });
        c.flash(0.5);
        c.burst(STONE[0], STONE[1] + 0.8, STONE[2], 0xfff3a0, 40, 2.2);
      },
      update(c, t, dt) {
        for (let i = 0; i < 5; i++) {
          const s = c.get(`shard${i}`);
          const angle = (i / 5) * Math.PI * 2 + 0.4;
          const r = t * (9 + i * 1.5);
          s.x = STONE[0] + Math.cos(angle) * r;
          s.z = STONE[2] + Math.sin(angle) * r;
          s.y = STONE[1] + 0.6 + t * 4 - t * t * 0.35;
          s.root.rotation.y += dt * 6;
          s.root.rotation.x += dt * 4;
          if (Math.floor(t * 12) !== Math.floor((t - dt) * 12)) c.burst(s.x, s.y, s.z, 0xffe680, 2, 0.4);
        }
      },
    },
    // 8. Le lendemain matin, Lumibloc frappe à sa porte.
    {
      sentences: 1,
      setup(c) {
        const g = c.ground(HOME_DOOR.x, HOME_DOOR.z);
        c.sky('morning', 1.5);
        c.camera(key([40, g + 2.6, 88], [36.5, g + 1.4, 92.4]), key([39.4, g + 2.3, 89], [36.5, g + 1.5, 92.4]), 6);
        c.actor('lumibloc', 'lumibloc', HOME_DOOR.x, 91.6, Math.PI);
        const hero = c.actor('hero', 'hero', HOME_DOOR.x, 93.8, 0);
        hero.root.visible = false;
      },
      update(c, t) {
        const lumibloc = c.get('lumibloc');
        const knocking = t > 0.5 && t < 2.3;
        lumibloc.model.swing('armR', knocking ? -1.3 + Math.abs(Math.sin(t * 9)) * 0.45 : 0);
        const hero = c.get('hero');
        if (t > 2.8 && !hero.root.visible) {
          hero.root.visible = true;
          hero.walk([[HOME_DOOR.x, 92.7]], 1.6);
        }
      },
    },
    // 9. « Les golems se sont endormis et sont redevenus des œufs. »
    {
      sentences: 1,
      setup(c) {
        c.sky('morning');
        c.camera(key([64.5, 19.6, 48.5], [64.5, 17, 40]), key([64.5, 18.6, 45.5], [64.5, 17, 40]), 6);
        c.actor('pierre', 'pierre', 61.5, 40.5, Math.PI);
        c.actor('mousse', 'mousse', 67.5, 40.5, Math.PI);
        for (const [id, x] of [['eggPierre', 61.5], ['eggMousse', 67.5]] as const) c.actor(id, id, x, 40.5, Math.PI).root.scale.setScalar(0.001);
      },
      update(c, t, dt) {
        for (const [golem, egg] of [['pierre', 'eggPierre'], ['mousse', 'eggMousse']] as const) {
          const g = c.get(golem);
          const e = c.get(egg);
          // Le golem bâille, se recroqueville, et un œuf prend sa place.
          const shrink = Math.min(1, Math.max(0, (t - 1.4) / 0.8));
          g.root.scale.setScalar(Math.max(0.001, 1 - shrink));
          g.model.swing('armL', -shrink * 1.2);
          g.model.swing('armR', -shrink * 1.2);
          if (t > 2.1 && t - dt <= 2.1) c.burst(g.x, g.y + 0.8, g.z, 0xfff3a0, 16, 1.2);
          const grow = Math.min(1, Math.max(0, (t - 2.1) / 0.5));
          e.root.scale.setScalar(Math.max(0.001, grow * 1.6));
          e.root.rotation.z = grow >= 1 ? Math.sin(t * 3) * 0.08 : 0;
        }
      },
    },
    // 10. « Les monstres vont sortir de partout. »
    {
      sentences: 1,
      setup(c) {
        const g = c.ground(77, 89);
        c.sky('morning');
        c.camera(key([77, g + 3.2, 98.5], [77, g + 0.8, 89]), key([77, g + 2.4, 95.5], [77, g + 0.9, 89]), 5);
        c.actor('slime', 'slime', 74.5, 88, Math.PI, { y: g - 1.5 });
        c.actor('zombie', 'zombie', 77.5, 90, Math.PI, { y: g - 2 });
        c.actor('spider', 'spider', 80, 87.5, Math.PI, { y: g - 1.2 });
      },
      update(c, t, dt) {
        const pops: [string, number][] = [['slime', 0.4], ['zombie', 1.1], ['spider', 1.8]];
        for (const [id, at] of pops) {
          const m = c.get(id);
          const ground = c.ground(m.x, m.z);
          if (t > at && t - dt <= at) c.burst(m.x, ground + 0.2, m.z, 0x7a5a3a, 14, 1);
          const rise = Math.min(1, Math.max(0, (t - at) / 0.6));
          const hop = id === 'slime' && rise >= 1 ? Math.abs(Math.sin((t - at) * 4)) * 0.6 : 0;
          m.y = ground - (1 - rise) * 2 + hop;
        }
      },
    },
    // 11. « Il faut trouver l'œuf caché dans le sanctuaire de la Prairie. Tu es prêt ? »
    {
      sentences: 2,
      setup(c) {
        const g = c.ground(HOME_DOOR.x, HOME_DOOR.z);
        c.sky('morning');
        // De profil, puis un léger recul : Lumibloc se tourne vers la caméra pour montrer l'est.
        c.camera(key([40.2, g + 2.1, 92], [36.5, g + 1.4, 92]), key([41, g + 3.4, 88.4], [37, g + 1.5, 92.2]), 7);
        c.actor('lumibloc', 'lumibloc', HOME_DOOR.x, 91.3, Math.PI);
        c.actor('hero', 'hero', HOME_DOOR.x, 92.7, 0);
      },
      update(c, t) {
        const lumibloc = c.get('lumibloc');
        // Il se tourne vers l'est et montre du doigt le sanctuaire.
        const k = Math.min(1, Math.max(0, (t - 1.5) * 1.5));
        const target = Math.atan2(-(SANCTUARY.x - lumibloc.x), -(SANCTUARY.z - lumibloc.z));
        lumibloc.facing = turnTowards(Math.PI, target, k);
        lumibloc.model.swing('armR', -1.5 * k);
        const hero = c.get('hero');
        // {prenom} saute de joie : il est prêt !
        const jump = t > 4 ? Math.max(0, Math.sin((t - 4) * 5)) * 0.5 : 0;
        hero.y = c.ground(hero.x, hero.z) + jump;
      },
    },
  ],
};
