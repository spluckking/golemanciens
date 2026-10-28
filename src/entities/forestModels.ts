import type { Cube, ModelDef } from './cubeModel';

/**
 * Modèles en cubes de la Forêt Murmurante (chapitre 2) : monstres de la phase 2, Reine Araignée,
 * toile géante, toiles du sentier et champignons de quête. Tous originaux.
 */

/** Squelette archer : os blancs, arc en bois tenu à gauche. */
export function skeletonModel(): ModelDef {
  const bone = 0xeeeae0;
  const shade = 0xc8c2b4;
  return [
    { name: 'legL', pivot: [-0.12, 0.65, 0], cubes: [[0.12, 0.65, 0.12, 0, -0.32, 0, bone]] },
    { name: 'legR', pivot: [0.12, 0.65, 0], cubes: [[0.12, 0.65, 0.12, 0, -0.32, 0, bone]] },
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.1, 0.55, 0.1, 0, 0.95, 0, shade],
        ...[0.8, 0.95, 1.1].map((y): Cube => [0.44, 0.06, 0.24, 0, y, 0, bone]),
        [0.4, 0.4, 0.4, 0, 1.45, 0, bone],
        [0.1, 0.1, 0.02, -0.1, 1.48, -0.205, 0x202020],
        [0.1, 0.1, 0.02, 0.1, 1.48, -0.205, 0x202020],
        [0.2, 0.04, 0.02, 0, 1.33, -0.205, 0x505050],
      ],
    },
    { name: 'armL', pivot: [-0.3, 1.18, 0], cubes: [[0.1, 0.6, 0.1, 0, -0.28, 0, bone], [0.06, 0.9, 0.06, 0, -0.55, -0.12, 0x8a5a2c], [0.02, 0.86, 0.02, 0, -0.55, -0.04, 0xf0f0f0]] },
    { name: 'armR', pivot: [0.3, 1.18, 0], cubes: [[0.1, 0.6, 0.1, 0, -0.28, 0, bone]] },
  ];
}

/** Loup d'ombre : gris très foncé, yeux violets, queue touffue. */
export function wolfModel(): ModelDef {
  const fur = 0x3e3e4c;
  const light = 0x5a5a6a;
  const leg = (x: number, z: number): Cube => [0.14, 0.4, 0.14, x, 0.2, z, fur];
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.42, 0.38, 0.95, 0, 0.58, 0.05, fur],
        [0.36, 0.34, 0.36, 0, 0.78, -0.55, light],
        [0.2, 0.16, 0.22, 0, 0.7, -0.82, fur],
        [0.08, 0.12, 0.06, -0.12, 1.0, -0.55, fur],
        [0.08, 0.12, 0.06, 0.12, 1.0, -0.55, fur],
        [0.07, 0.06, 0.02, -0.1, 0.84, -0.74, 0xb070ff],
        [0.07, 0.06, 0.02, 0.1, 0.84, -0.74, 0xb070ff],
        [0.14, 0.14, 0.42, 0, 0.72, 0.68, light],
      ],
    },
    { name: 'legL', pivot: [0, 0, -0.3], cubes: [leg(-0.14, 0), leg(0.14, 0.62)] },
    { name: 'legR', pivot: [0, 0, -0.3], cubes: [leg(0.14, 0), leg(-0.14, 0.62)] },
  ];
}

/** Champignon sauteur : petit champignon violet à pois, qui saute (comme le slime). */
export function hopperModel(): ModelDef {
  const cap = 0x8a4ac8;
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.36, 0.4, 0.36, 0, 0.2, 0, 0xf0e6d0],
        [0.8, 0.3, 0.8, 0, 0.55, 0, cap],
        [0.56, 0.14, 0.56, 0, 0.76, 0, cap],
        [0.12, 0.04, 0.12, -0.22, 0.71, -0.2, 0xffffff],
        [0.1, 0.04, 0.1, 0.2, 0.71, 0.15, 0xffffff],
        [0.06, 0.08, 0.02, -0.08, 0.26, -0.185, 0x202020],
        [0.06, 0.08, 0.02, 0.08, 0.26, -0.185, 0x202020],
      ],
    },
  ];
}

/** Reine Araignée : grande, gris-argent et violet, couronne dorée, huit pattes. */
export function spiderQueenModel(): ModelDef {
  const body = 0x6a5a8a;
  const dark = 0x3a2e52;
  const silver = 0xc8cce0;
  const legs = (side: number): Cube[] =>
    [-0.6, -0.2, 0.2, 0.6].flatMap((z): Cube[] => [
      [0.8, 0.12, 0.12, side * 0.4, 0.2, z, dark],
      [0.12, 0.7, 0.12, side * 0.78, -0.15, z, dark],
    ]);
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [1.4, 0.9, 1.5, 0, 0.9, 0.55, body],
        [1.0, 0.1, 1.1, 0, 1.38, 0.55, silver],
        [0.2, 0.3, 0.5, 0, 0.9, 1.3, silver],
        [0.9, 0.7, 0.8, 0, 0.85, -0.55, dark],
        ...[-0.25, 0, 0.25].map((x): Cube => [0.14, 0.22, 0.14, x, 1.32, -0.6, 0xf0c43c]),
        [0.6, 0.06, 0.4, 0, 1.22, -0.6, 0xf0c43c],
        [0.12, 0.12, 0.02, -0.22, 0.95, -0.955, 0xc040ff],
        [0.12, 0.12, 0.02, 0.22, 0.95, -0.955, 0xc040ff],
        [0.08, 0.08, 0.02, -0.08, 0.8, -0.955, 0xc040ff],
        [0.08, 0.08, 0.02, 0.08, 0.8, -0.955, 0xc040ff],
      ],
    },
    { name: 'legsL', pivot: [-0.45, 0.8, 0], cubes: legs(-1) },
    { name: 'legsR', pivot: [0.45, 0.8, 0], cubes: legs(1) },
  ];
}

/** Toile géante d'argent (repaire de la Reine) : rayons et cercles, elle brille la nuit. */
export function giantWebModel(): ModelDef {
  const cubes: Cube[] = [];
  const thread = 0xe8ecf8;
  const R = 3.2;
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI;
    const steps = 16;
    for (let s = -steps; s <= steps; s++) {
      const r = (s / steps) * R;
      cubes.push([0.07, 0.07, 0.03, Math.cos(ang) * r, Math.sin(ang) * r, 0, thread]);
    }
  }
  for (const r of [0.9, 1.7, 2.5]) for (let k = 0; k < 28; k++) cubes.push([0.06, 0.06, 0.03, Math.cos((k / 28) * Math.PI * 2) * r, Math.sin((k / 28) * Math.PI * 2) * r, 0, thread]);
  return [{ name: 'web', pivot: [0, 3.4, 0], glow: true, cubes }];
}

/** Toile qui barre le sentier (quête P2) : à couper d'un coup de baguette. */
export function pathWebModel(): ModelDef {
  const cubes: Cube[] = [];
  const thread = 0xe0e4f0;
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI;
    for (let s = -8; s <= 8; s++) cubes.push([0.05, 0.05, 0.03, Math.cos(ang) * (s / 8) * 1.1, Math.sin(ang) * (s / 8) * 1.1, 0, thread]);
  }
  for (let k = 0; k < 18; k++) cubes.push([0.05, 0.05, 0.03, Math.cos((k / 18) * Math.PI * 2) * 0.7, Math.sin((k / 18) * Math.PI * 2) * 0.7, 0, thread]);
  return [
    { name: 'posts', pivot: [0, 0, 0], cubes: [[0.16, 2.4, 0.16, -1.3, 1.2, 0, 0x5a3a20], [0.16, 2.4, 0.16, 1.3, 1.2, 0, 0x5a3a20]] },
    { name: 'web', pivot: [0, 1.3, 0], glow: true, cubes },
  ];
}

/** Champignon de quête (O1 « Les champignons bleus ») : bleu ou rouge, assez gros pour être vu. */
export function questMushroomModel(cap: number): ModelDef {
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.16, 0.3, 0.16, 0, 0.15, 0, 0xf0e6d0],
        [0.44, 0.16, 0.44, 0, 0.36, 0, cap],
        [0.28, 0.08, 0.28, 0, 0.48, 0, cap],
        [0.08, 0.02, 0.08, -0.1, 0.45, -0.1, 0xffffff],
        [0.08, 0.02, 0.08, 0.12, 0.45, 0.06, 0xffffff],
      ],
    },
  ];
}
