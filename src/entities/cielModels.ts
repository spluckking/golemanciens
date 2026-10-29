import type { Cube, ModelDef } from './cubeModel';

/**
 * Modèles en cubes de l'Île Céleste (chapitre 5) : golems Nuage, Arc-en-ciel et Galaxie, monstres
 * de la phase 5, Griffon d'Ombre, objets de quête (cristal de vent, fleur céleste, plume noire,
 * lettre) et mécanismes du sanctuaire des Vents (vitrail, balance à contrepoids, poids, herse).
 * Tous originaux.
 */

const RAINBOW = [0xe84a4a, 0xf0943c, 0xf4d83c, 0x5ac85a, 0x4a8ae8, 0x9a5ad8];

/** Nuage : golem tout rond et cotonneux, avec de petits tourbillons de vent autour des bras. */
export function nuageModel(): ModelDef {
  const cloud = 0xf4f8ff;
  const shade = 0xd0dcec;
  return [
    { name: 'legL', pivot: [-0.22, 0.45, 0], cubes: [[0.32, 0.45, 0.36, 0, -0.22, 0, shade]] },
    { name: 'legR', pivot: [0.22, 0.45, 0], cubes: [[0.32, 0.45, 0.36, 0, -0.22, 0, shade]] },
    {
      name: 'body',
      pivot: [0, 0.45, 0],
      cubes: [
        [0.92, 0.7, 0.66, 0, 0.42, 0, cloud],
        [1.04, 0.44, 0.5, 0, 0.5, 0, cloud],
        [0.66, 0.54, 0.6, 0, 1.04, -0.02, cloud],
        [0.84, 0.3, 0.44, 0, 1.12, 0, cloud],
        [0.12, 0.12, 0.02, -0.14, 1.08, -0.33, 0x4a7ab8],
        [0.12, 0.12, 0.02, 0.14, 1.08, -0.33, 0x4a7ab8],
        [0.16, 0.04, 0.02, 0, 0.94, -0.33, 0x9ab0d0],
        [0.34, 0.18, 0.34, -0.12, 1.4, 0.04, cloud],
        [0.26, 0.14, 0.26, 0.16, 1.36, -0.04, cloud],
      ],
    },
    { name: 'armL', pivot: [-0.6, 1.0, 0], cubes: [[0.26, 0.74, 0.3, 0, -0.35, 0, cloud], [0.4, 0.06, 0.4, 0, -0.5, 0, 0xbfe0ff]] },
    { name: 'armR', pivot: [0.6, 1.0, 0], cubes: [[0.26, 0.74, 0.3, 0, -0.35, 0, cloud], [0.4, 0.06, 0.4, 0, -0.5, 0, 0xbfe0ff]] },
  ];
}

/** Arc-en-ciel : golem de cristal blanc traversé de bandes aux six couleurs, avec une petite couronne-prisme. */
export function arcEnCielModel(): ModelDef {
  const white = 0xf4f0f8;
  const bands: Cube[] = RAINBOW.map((c, i) => [0.8, 0.1, 0.02, 0, 0.7 - i * 0.1, -0.31, c]);
  return [
    { name: 'legL', pivot: [-0.2, 0.45, 0], cubes: [[0.26, 0.45, 0.3, 0, -0.22, 0, RAINBOW[4]]] },
    { name: 'legR', pivot: [0.2, 0.45, 0], cubes: [[0.26, 0.45, 0.3, 0, -0.22, 0, RAINBOW[5]]] },
    {
      name: 'body',
      pivot: [0, 0.45, 0],
      cubes: [
        [0.8, 0.76, 0.6, 0, 0.4, 0, white],
        ...bands,
        [0.56, 0.5, 0.52, 0, 1.02, -0.02, white],
        [0.12, 0.1, 0.02, -0.12, 1.06, -0.29, 0x3a3a6a],
        [0.12, 0.1, 0.02, 0.12, 1.06, -0.29, 0x3a3a6a],
        ...RAINBOW.map((c, i): Cube => [0.08, 0.16 + (i % 2) * 0.08, 0.08, -0.22 + i * 0.09, 1.38, 0, c]),
      ],
    },
    { name: 'armL', pivot: [-0.52, 0.98, 0], cubes: [[0.22, 0.74, 0.26, 0, -0.35, 0, white], [0.28, 0.16, 0.3, 0, -0.74, 0, RAINBOW[0]]] },
    { name: 'armR', pivot: [0.52, 0.98, 0], cubes: [[0.22, 0.74, 0.26, 0, -0.35, 0, white], [0.28, 0.16, 0.3, 0, -0.74, 0, RAINBOW[2]]] },
  ];
}

/** Galaxie : golem bleu nuit semé de points d'étoiles, une étoile dorée sur la poitrine et un anneau de planète. */
export function galaxieModel(): ModelDef {
  const night = 0x2a2a7a;
  const deep = 0x12123a;
  const star = 0xfff3a0;
  const dots: Cube[] = [
    [-0.28, 0.62],
    [0.3, 0.2],
    [-0.12, 0.12],
    [0.22, 0.66],
    [-0.34, 0.3],
    [0.08, 0.86],
  ].map(([x, y]): Cube => [0.06, 0.06, 0.02, x, y, -0.31, star]);
  return [
    { name: 'legL', pivot: [-0.22, 0.45, 0], cubes: [[0.3, 0.45, 0.34, 0, -0.22, 0, deep], [0.06, 0.06, 0.02, 0.05, -0.2, -0.18, star]] },
    { name: 'legR', pivot: [0.22, 0.45, 0], cubes: [[0.3, 0.45, 0.34, 0, -0.22, 0, deep]] },
    {
      name: 'body',
      pivot: [0, 0.45, 0],
      cubes: [
        [0.88, 0.8, 0.6, 0, 0.42, 0, night],
        ...dots,
        [0.22, 0.22, 0.03, 0, 0.46, -0.32, star],
        [0.08, 0.36, 0.03, 0, 0.46, -0.33, star],
        [0.36, 0.08, 0.03, 0, 0.46, -0.33, star],
        [0.6, 0.52, 0.54, 0, 1.06, -0.02, night],
        [0.14, 0.1, 0.02, -0.13, 1.1, -0.3, 0x9ad8ff],
        [0.14, 0.1, 0.02, 0.13, 1.1, -0.3, 0x9ad8ff],
        [0.06, 0.06, 0.02, 0.2, 1.26, -0.3, star],
        // L'anneau d'une petite planète autour de la tête.
        [0.9, 0.04, 0.12, 0, 1.36, 0, 0xb48aff],
        [0.12, 0.04, 0.9, 0, 1.36, 0, 0xb48aff],
      ],
    },
    { name: 'armL', pivot: [-0.56, 1.02, 0], cubes: [[0.24, 0.78, 0.28, 0, -0.37, 0, night], [0.06, 0.06, 0.02, 0, -0.4, -0.15, star], [0.3, 0.18, 0.32, 0, -0.78, 0, deep]] },
    { name: 'armR', pivot: [0.56, 1.02, 0], cubes: [[0.24, 0.78, 0.28, 0, -0.37, 0, night], [0.06, 0.06, 0.02, 0, -0.2, -0.15, star], [0.3, 0.18, 0.32, 0, -0.78, 0, deep]] },
  ];
}

/** Harpie : femme-oiseau aux plumes grises, grandes ailes, serres jaunes. Elle vole. */
export function harpyModel(): ModelDef {
  const feather = 0x9a9aa8;
  const dark = 0x6a6a78;
  return [
    {
      name: 'body',
      pivot: [0, 0.6, 0],
      cubes: [
        [0.4, 0.5, 0.3, 0, 0.45, 0, feather],
        [0.32, 0.32, 0.3, 0, 0.88, -0.02, 0xe8c8a8],
        [0.36, 0.14, 0.34, 0, 1.06, 0.02, dark],
        [0.06, 0.06, 0.02, -0.08, 0.9, -0.17, 0x202020],
        [0.06, 0.06, 0.02, 0.08, 0.9, -0.17, 0x202020],
        [0.3, 0.12, 0.3, 0, 0.12, 0.08, dark],
        [0.06, 0.24, 0.06, -0.1, 0, 0, 0xf0c43c],
        [0.06, 0.24, 0.06, 0.1, 0, 0, 0xf0c43c],
      ],
    },
    { name: 'wingL', pivot: [-0.2, 1.05, 0], cubes: [[0.9, 0.06, 0.5, -0.45, 0, 0, feather], [0.3, 0.06, 0.3, -0.95, 0, 0.1, dark]] },
    { name: 'wingR', pivot: [0.2, 1.05, 0], cubes: [[0.9, 0.06, 0.5, 0.45, 0, 0, feather], [0.3, 0.06, 0.3, 0.95, 0, 0.1, dark]] },
  ];
}

/** Méduse céleste : cloche rose translucide qui flotte, filaments qui pendent. */
export function jellyfishModel(): ModelDef {
  const pink = 0xf0a0d0;
  const light = 0xf8d0e8;
  return [
    {
      name: 'body',
      pivot: [0, 0.4, 0],
      cubes: [
        [0.8, 0.4, 0.8, 0, 1.1, 0, pink],
        [0.56, 0.2, 0.56, 0, 1.38, 0, light],
        [0.1, 0.1, 0.02, -0.14, 1.06, -0.41, 0x7a2a6a],
        [0.1, 0.1, 0.02, 0.14, 1.06, -0.41, 0x7a2a6a],
        ...[-0.28, -0.1, 0.1, 0.28].map((x, i): Cube => [0.06, 0.6 + (i % 2) * 0.2, 0.06, x, 0.6 - (i % 2) * 0.1, (i % 2) * 0.2 - 0.1, light]),
      ],
    },
  ];
}

/** Chevalier d'ombre : armure noire, épée, yeux violets. */
export function darkKnightModel(): ModelDef {
  const armor = 0x2a2238;
  const edge = 0x4a3a62;
  return [
    { name: 'legL', pivot: [-0.15, 0.7, 0], cubes: [[0.24, 0.7, 0.26, 0, -0.35, 0, armor]] },
    { name: 'legR', pivot: [0.15, 0.7, 0], cubes: [[0.24, 0.7, 0.26, 0, -0.35, 0, armor]] },
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.56, 0.62, 0.34, 0, 1.02, 0, armor],
        [0.7, 0.14, 0.4, 0, 1.3, 0, edge],
        [0.42, 0.44, 0.42, 0, 1.56, 0, armor],
        [0.32, 0.06, 0.02, 0, 1.58, -0.22, 0xb06aff],
        [0.08, 0.2, 0.08, 0, 1.86, 0, 0x8a2a4a],
      ],
    },
    { name: 'armL', pivot: [-0.36, 1.26, 0], cubes: [[0.18, 0.62, 0.22, 0, -0.29, 0, armor], [0.4, 0.5, 0.06, -0.06, -0.4, -0.16, edge]] },
    {
      name: 'armR',
      pivot: [0.36, 1.26, 0],
      cubes: [
        [0.18, 0.62, 0.22, 0, -0.29, 0, armor],
        [0.06, 1.0, 0.06, 0, -0.5, -0.36, 0xc8c8d8],
        [0.24, 0.06, 0.08, 0, -0.62, -0.26, 0x5a3a22],
      ],
    },
  ];
}

/** Griffon d'Ombre : corps de lion violet sombre, tête et ailes d'aigle noires, yeux rouges. */
export function griffonModel(): ModelDef {
  const body = 0x3d2f55;
  const dark = 0x22183a;
  const beak = 0xf0c43c;
  const leg = (x: number, z: number): Cube => [0.24, 0.9, 0.24, x, 0.45, z, dark];
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [1.0, 0.9, 1.8, 0, 1.3, 0.1, body],
        leg(-0.36, -0.6),
        leg(0.36, -0.6),
        leg(-0.36, 0.7),
        leg(0.36, 0.7),
        [0.2, 0.2, 0.9, 0, 1.5, 1.3, body],
        [0.3, 0.3, 0.3, 0, 1.55, 1.8, dark],
        [0.7, 0.7, 0.7, 0, 2.2, -0.9, dark],
        [0.3, 0.2, 0.36, 0, 2.06, -1.34, beak],
        [0.14, 0.14, 0.04, -0.2, 2.34, -1.26, 0xff3a3a],
        [0.14, 0.14, 0.04, 0.2, 2.34, -1.26, 0xff3a3a],
        [0.12, 0.3, 0.12, -0.2, 2.66, -0.8, dark],
        [0.12, 0.3, 0.12, 0.2, 2.66, -0.8, dark],
      ],
    },
    { name: 'wingL', pivot: [-0.5, 1.75, 0], cubes: [[1.8, 0.1, 1.0, -0.9, 0, 0, dark], [0.7, 0.1, 0.6, -1.9, 0, 0.3, body]] },
    { name: 'wingR', pivot: [0.5, 1.75, 0], cubes: [[1.8, 0.1, 1.0, 0.9, 0, 0, dark], [0.7, 0.1, 0.6, 1.9, 0, 0.3, body]] },
  ];
}

/** Cristal de vent (quête R1) : un cristal bleu ciel qui tourne sur lui-même. */
export function windCrystalModel(): ModelDef {
  return [
    {
      name: 'body',
      pivot: [0, 0.5, 0],
      glow: true,
      cubes: [
        [0.24, 0.5, 0.24, 0, 0.1, 0, 0x9ad8ff],
        [0.14, 0.24, 0.14, 0, 0.44, 0, 0xd8f0ff],
        [0.14, 0.2, 0.14, 0, -0.24, 0, 0x6ab8f0],
      ],
    },
  ];
}

/** Fleur céleste (quête O1) : la corolle « watered » s'ouvre quand on l'arrose. */
export function skyFlowerModel(): ModelDef {
  return [
    { name: 'body', pivot: [0, 0, 0], cubes: [[0.06, 0.5, 0.06, 0, 0.25, 0, 0x5ac85a], [0.24, 0.06, 0.12, 0.1, 0.2, 0, 0x5ac85a]] },
    { name: 'bud', pivot: [0, 0.5, 0], cubes: [[0.16, 0.2, 0.16, 0, 0.08, 0, 0xc8a8d8]] },
    {
      name: 'watered',
      pivot: [0, 0.55, 0],
      glow: true,
      cubes: [
        [0.4, 0.06, 0.14, 0, 0, 0, 0x9ad8ff],
        [0.14, 0.06, 0.4, 0, 0, 0, 0x9ad8ff],
        [0.12, 0.1, 0.12, 0, 0.04, 0, 0xfff3a0],
      ],
    },
  ];
}

/** Plume noire du Griffon (quête P5). */
export function blackFeatherModel(): ModelDef {
  return [
    {
      name: 'body',
      pivot: [0, 0.4, 0],
      cubes: [
        [0.04, 0.6, 0.04, 0, 0.1, 0, 0x5a5a66],
        [0.2, 0.44, 0.04, 0.04, 0.16, 0, 0x22183a],
        [0.12, 0.2, 0.04, 0.06, 0.44, 0, 0x3d2f55],
      ],
    },
  ];
}

/** Lettre scellée (quête O2), portée au gardien de la plus haute tour. */
export function sealedLetterModel(): ModelDef {
  return [{ name: 'body', pivot: [0, 0, 0], cubes: [[0.4, 0.04, 0.28, 0, 0.6, 0, 0xf4ead0], [0.08, 0.05, 0.08, 0, 0.62, 0, 0xc0392b]] }];
}

/** Vitrail en arc-en-ciel (aide de l'énigme des nuages) : six bandes de couleur dans un cadre. */
export function stainedGlassModel(): ModelDef {
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      glow: true,
      cubes: [[2.6, 0.16, 0.14, 0, 2.6, 0, 0xe8e2d0], ...RAINBOW.map((c, i): Cube => [0.4, 2.2, 0.1, -1.0 + i * 0.4, 1.4, 0, c])],
    },
  ];
}

/** Balance à contrepoids : un pied, le fléau (qui penche) et ses deux plateaux. */
export function balanceModel(): ModelDef {
  return [
    { name: 'body', pivot: [0, 0, 0], cubes: [[0.3, 1.8, 0.3, 0, 0.9, 0, 0x8a8a98], [1.0, 0.12, 0.6, 0, 0.06, 0, 0x6a6a78]] },
    { name: 'beam', pivot: [0, 1.85, 0], cubes: [[3.0, 0.12, 0.14, 0, 0, 0, 0xc8a060], [0.2, 0.2, 0.2, 0, 0, 0, 0x5a3a22]] },
  ];
}

/** Plateau de balance (suspendu au bout du fléau). */
export function panModel(): ModelDef {
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.04, 0.8, 0.04, 0, -0.4, 0, 0x5a5a66],
        [0.9, 0.08, 0.9, 0, -0.84, 0, 0xc8a060],
      ],
    },
  ];
}

/** Poids gravé de sa valeur (1, 2, 3, 5 ou 8) : plus il est lourd, plus il est gros. */
export function weightModel(value: number): ModelDef {
  const s = 0.22 + value * 0.035;
  return [{ name: 'body', pivot: [0, 0, 0], cubes: [[s, s, s, 0, s / 2, 0, 0x5a5a66], [s * 0.4, 0.06, s * 0.4, 0, s + 0.03, 0, 0x9a9aa8]] }];
}

/** Herse du sanctuaire des Vents : une grille de barreaux qui monte et descend. */
export function portcullisModel(): ModelDef {
  const bars: Cube[] = [];
  for (let i = 0; i < 4; i++) bars.push([0.1, 2.0, 0.1, -0.6 + i * 0.4, 1.0, 0, 0x4a4a58]);
  for (const y of [0.4, 1.2, 1.8]) bars.push([1.4, 0.08, 0.1, 0, y, 0, 0x4a4a58]);
  return [{ name: 'body', pivot: [0, 0, 0], cubes: bars }];
}

/** Trophée du Griffon : statuette d'une aile noire sur un socle doré. */
export function trophyGriffonModel(): ModelDef {
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.5, 0.1, 0.5, 0, 0.05, 0, 0xf0c43c],
        [0.14, 0.3, 0.14, 0, 0.25, 0, 0x3d2f55],
        [0.44, 0.06, 0.24, -0.16, 0.42, 0, 0x22183a],
        [0.44, 0.06, 0.24, 0.16, 0.42, 0, 0x22183a],
        [0.12, 0.12, 0.12, 0, 0.46, -0.1, 0xf0c43c],
      ],
    },
  ];
}
