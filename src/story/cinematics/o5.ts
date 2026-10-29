import type { CinematicScript } from './director';
import { bezier, key, raiseArm } from './t1';

/**
 * Cinématique de l'outro O5 (après l'Épreuve des Étoiles), 5 plans pour les 6 phrases : le Griffon
 * s'enfuit vers le volcan, le cinquième éclat descend sur la place de l'Académie, les cinq éclats
 * tournent et deviennent la Poussière d'étoile, {prenom} la verse sur son golem, et le Golem Galaxie
 * naît dans une lumière bleue.
 */

/** Cratère du décor du volcan (voir volcanoSet.ts) et place de l'Académie (Prairie). */
const CRATER = { x: 32.5, z: 30.5, rimY: 22 };
const PLAZA = { x: 64.5, z: 39.5, y: 16 };

function once(t: number, dt: number, at: number): boolean {
  return t >= at && t - dt < at;
}

export const O5_CINEMATIC: CinematicScript = {
  id: 'O5',
  shots: [
    // 1. Le Griffon d'Ombre s'envole en criant vers le volcan.
    {
      sentences: 1,
      setup(c) {
        c.set('volcano');
        c.sky('ember');
        c.music('storyNight');
        c.camera(key([CRATER.x + 10, 20, 58], [CRATER.x + 4, 26, 44]), key([CRATER.x + 6, 22, 54], [CRATER.x, 26, CRATER.z]), 6);
        c.actor('griffon', 'griffon', CRATER.x + 12, 52, Math.PI, { y: 26, scale: 0.8 });
      },
      update(c, t, dt) {
        const g = c.get('griffon');
        const k = Math.min(1, t / 4.5);
        [g.x, g.y, g.z] = bezier([CRATER.x + 12, 26, 52], [CRATER.x + 6, 30, 40], [CRATER.x, CRATER.rimY + 8, CRATER.z], k);
        g.root.scale.setScalar(0.8 * (1 - k * 0.6));
        const flap = Math.sin(t * 10) * 0.6;
        g.model.swing('wingL', flap, 'z');
        g.model.swing('wingR', -flap, 'z');
        if (once(t, dt, 0.4)) c.sound('roar');
      },
    },
    // 2. Le cinquième éclat descend doucement du ciel.
    {
      sentences: 1,
      setup(c) {
        c.set(null);
        c.sky('night');
        c.music('storyMorning');
        c.camera(key([PLAZA.x + 4, PLAZA.y + 3, PLAZA.z + 6], [PLAZA.x, PLAZA.y + 4, PLAZA.z]), key([PLAZA.x + 3.5, PLAZA.y + 2.4, PLAZA.z + 5], [PLAZA.x, PLAZA.y + 1.6, PLAZA.z]), 6);
        c.actor('hero', 'hero', PLAZA.x + 1.2, PLAZA.z + 1.5, -Math.PI * 0.2);
        c.actor('lumibloc', 'lumibloc', PLAZA.x - 1.4, PLAZA.z + 0.8, Math.PI * 0.2);
        c.actor('shard', 'starShard', PLAZA.x, PLAZA.z, 0, { y: PLAZA.y + 9, scale: 1.2 });
      },
      update(c, t, dt) {
        const s = c.get('shard');
        const k = Math.min(1, t / 4);
        s.y = PLAZA.y + 9 - (1 - (1 - k) * (1 - k)) * 7.6;
        s.root.rotation.y += dt * 1.5;
        if (Math.floor(t * 6) !== Math.floor((t - dt) * 6)) c.burst(s.x, s.y + 0.3, s.z, 0xffe680, 2, 0.3);
        if (once(t, dt, 4)) c.sound('chime');
      },
    },
    // 3. Les cinq morceaux se rassemblent, tournent, tournent… 4. et se changent en Poussière d'étoile !
    {
      sentences: 2,
      setup(c) {
        c.sky('night');
        c.camera(key([PLAZA.x + 3, PLAZA.y + 2.2, PLAZA.z + 4], [PLAZA.x, PLAZA.y + 1.6, PLAZA.z]), key([PLAZA.x + 2.6, PLAZA.y + 2.6, PLAZA.z + 3.4], [PLAZA.x, PLAZA.y + 2, PLAZA.z]), 7);
        for (let i = 0; i < 5; i++) c.actor(`shard${i}`, 'starShard', PLAZA.x, PLAZA.z, 0, { y: PLAZA.y + 1.6, scale: 0.9 });
      },
      update(c, t, dt) {
        const merge = 4.5;
        const k = Math.min(1, t / merge);
        for (let i = 0; i < 5; i++) {
          const s = c.get(`shard${i}`);
          const a = t * (2 + k * 8) + (i * Math.PI * 2) / 5;
          const r = 1.4 * (1 - k);
          s.x = PLAZA.x + Math.cos(a) * r;
          s.z = PLAZA.z + Math.sin(a) * r;
          s.y = PLAZA.y + 1.6 + k * 0.8;
          s.root.visible = t < merge;
          s.root.rotation.y += dt * 4;
        }
        if (Math.floor(t * 10) !== Math.floor((t - dt) * 10)) c.burst(PLAZA.x, PLAZA.y + 2.2, PLAZA.z, 0xfff3a0, 3, 0.6 + k);
        if (once(t, dt, merge)) {
          c.burst(PLAZA.x, PLAZA.y + 2.4, PLAZA.z, 0x9ad8ff, 60, 2);
          c.sound('star');
        }
        if (t > merge && Math.floor(t * 12) !== Math.floor((t - dt) * 12)) c.burst(PLAZA.x + (Math.random() - 0.5) * 0.6, PLAZA.y + 2.4, PLAZA.z + (Math.random() - 0.5) * 0.6, 0xd8f0ff, 4, 0.3);
      },
    },
    // 5. {prenom} la verse sur le golem qu'il a choisi.
    {
      sentences: 1,
      setup(c) {
        c.sky('night');
        c.camera(key([PLAZA.x + 3.4, PLAZA.y + 2, PLAZA.z + 3.6], [PLAZA.x - 0.4, PLAZA.y + 1.2, PLAZA.z]), key([PLAZA.x + 3, PLAZA.y + 1.8, PLAZA.z + 3.2], [PLAZA.x - 0.4, PLAZA.y + 1.2, PLAZA.z]), 6);
        c.actor('hero', 'hero', PLAZA.x + 0.8, PLAZA.z + 0.8, Math.PI * 0.75);
        c.actor('golem', 'shadowGalaxie', PLAZA.x - 0.8, PLAZA.z - 0.4, Math.PI * 0.2);
      },
      update(c, t, dt) {
        raiseArm(c.get('hero'), 'armR', 2.4 * Math.min(1, t / 1));
        // La poussière tombe en pluie scintillante sur le golem.
        if (t > 1 && Math.floor(t * 16) !== Math.floor((t - dt) * 16)) c.burst(PLAZA.x - 0.8 + (Math.random() - 0.5) * 0.8, PLAZA.y + 2.6, PLAZA.z - 0.4 + (Math.random() - 0.5) * 0.8, 0xfff3a0, 3, 0.2);
        if (once(t, dt, 1)) c.sound('chime');
      },
    },
    // 6. Une lumière bleue envahit tout : le Golem Galaxie est né !
    {
      sentences: 1,
      setup(c) {
        c.sky('night');
        c.music('finale');
        c.camera(key([PLAZA.x + 2.8, PLAZA.y + 1.6, PLAZA.z + 3.4], [PLAZA.x - 0.8, PLAZA.y + 1.2, PLAZA.z - 0.4]), key([PLAZA.x + 3.6, PLAZA.y + 2.4, PLAZA.z + 4.4], [PLAZA.x - 0.8, PLAZA.y + 1.4, PLAZA.z - 0.4]), 7);
        c.actor('golem', 'galaxie', PLAZA.x - 0.8, PLAZA.z - 0.4, Math.PI * 0.2, { scale: 0.01 });
        c.actor('hero', 'hero', PLAZA.x + 0.8, PLAZA.z + 0.8, Math.PI * 0.75);
      },
      update(c, t, dt) {
        const g = c.get('golem');
        const k = Math.min(1, t / 1.2);
        g.root.scale.setScalar(Math.max(0.01, 1.36 * (k < 1 ? k * (2 - k) : 1)));
        g.root.rotation.y += dt * (k < 1 ? 8 : 0.6);
        if (once(t, dt, 0.05)) {
          c.burst(g.x, PLAZA.y + 1.2, g.z, 0x6ab8ff, 80, 2.6);
          c.sound('evolve');
          c.shake(0.15, 0.6);
        }
        if (Math.floor(t * 6) !== Math.floor((t - dt) * 6)) c.burst(g.x + (Math.random() - 0.5) * 1.4, PLAZA.y + 0.4 + Math.random() * 2, g.z + (Math.random() - 0.5) * 1.4, Math.random() < 0.5 ? 0xfff3a0 : 0x9ad8ff, 2, 0.3);
        if (t > 2) raiseArm(c.get('hero'), 'armR', 2.8);
      },
    },
  ],
};
