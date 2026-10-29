import type { Cube, ModelDef } from './cubeModel';

/**
 * Modèles en cubes du Désert des Sables Chantants (chapitre 3) : golems Sable et Cuivre,
 * monstres de la phase 3, Grand Ver, chameau, tambours, objets de quête et mécanismes du temple.
 * Tous originaux.
 */

/** Sable : golem de sable doré aux bords qui s'effritent, avec un petit tourbillon sur la tête. */
export function sableModel(): ModelDef {
  const sand = 0xe0c080;
  const dark = 0xb89858;
  const light = 0xf4dca0;
  return [
    { name: 'legL', pivot: [-0.22, 0.45, 0], cubes: [[0.3, 0.45, 0.34, 0, -0.22, 0, dark]] },
    { name: 'legR', pivot: [0.22, 0.45, 0], cubes: [[0.3, 0.45, 0.34, 0, -0.22, 0, dark]] },
    {
      name: 'body',
      pivot: [0, 0.45, 0],
      cubes: [
        [0.86, 0.76, 0.6, 0, 0.4, 0, sand],
        [0.62, 0.5, 0.54, 0, 1.02, -0.02, light],
        [0.12, 0.12, 0.02, -0.13, 1.06, -0.3, 0x5a3a18],
        [0.12, 0.12, 0.02, 0.13, 1.06, -0.3, 0x5a3a18],
        ...[-0.3, -0.1, 0.12, 0.32].map((x, i): Cube => [0.12, 0.08, 0.12, x, 0.02 - (i % 2) * 0.06, -0.3, dark]),
        [0.3, 0.12, 0.3, 0, 1.36, 0, light],
        [0.18, 0.12, 0.18, 0.06, 1.48, 0, sand],
        [0.08, 0.1, 0.08, 0.1, 1.58, 0, light],
      ],
    },
    { name: 'armL', pivot: [-0.55, 1.0, 0], cubes: [[0.24, 0.76, 0.28, 0, -0.36, 0, sand], [0.3, 0.16, 0.32, 0, -0.76, 0, dark]] },
    { name: 'armR', pivot: [0.55, 1.0, 0], cubes: [[0.24, 0.76, 0.28, 0, -0.36, 0, sand], [0.3, 0.16, 0.32, 0, -0.76, 0, dark]] },
  ];
}

/** Cuivre : golem de cuivre aux rivets verts, avec deux antennes et une ampoule qui brille. */
export function cuivreModel(): ModelDef {
  const copper = 0xc8743c;
  const dark = 0x8a4a24;
  const patina = 0x6fb8a0;
  return [
    { name: 'legL', pivot: [-0.2, 0.45, 0], cubes: [[0.26, 0.45, 0.3, 0, -0.22, 0, dark]] },
    { name: 'legR', pivot: [0.2, 0.45, 0], cubes: [[0.26, 0.45, 0.3, 0, -0.22, 0, dark]] },
    {
      name: 'body',
      pivot: [0, 0.45, 0],
      cubes: [
        [0.78, 0.74, 0.56, 0, 0.4, 0, copper],
        ...[-0.26, 0.26].flatMap((x): Cube[] => [0.12, 0.6].map((y): Cube => [0.08, 0.08, 0.02, x, y, -0.29, patina])),
        [0.56, 0.48, 0.5, 0, 1.0, -0.02, copper],
        [0.16, 0.08, 0.02, -0.12, 1.04, -0.27, 0x7ae0ff],
        [0.16, 0.08, 0.02, 0.12, 1.04, -0.27, 0x7ae0ff],
        [0.04, 0.3, 0.04, -0.16, 1.38, 0, dark],
        [0.04, 0.3, 0.04, 0.16, 1.38, 0, dark],
        [0.1, 0.1, 0.1, -0.16, 1.56, 0, 0xfff060],
        [0.1, 0.1, 0.1, 0.16, 1.56, 0, 0xfff060],
      ],
    },
    { name: 'armL', pivot: [-0.5, 0.98, 0], cubes: [[0.2, 0.74, 0.24, 0, -0.35, 0, copper], [0.26, 0.14, 0.28, 0, -0.74, 0, patina]] },
    { name: 'armR', pivot: [0.5, 0.98, 0], cubes: [[0.2, 0.74, 0.24, 0, -0.35, 0, copper], [0.26, 0.14, 0.28, 0, -0.74, 0, patina]] },
  ];
}

/** Momie : bandelettes beiges, yeux verts qui luisent, bras tendus. */
export function mummyModel(): ModelDef {
  const wrap = 0xe0d0a8;
  const dark = 0xb8a880;
  const bands = (w: number, h: number, d: number, x: number, y0: number, z: number): Cube[] =>
    [0, 1, 2, 3].map((i): Cube => [w + 0.01, 0.04, d + 0.01, x, y0 + (i * h) / 4, z, dark]);
  return [
    { name: 'legL', pivot: [-0.13, 0.65, 0], cubes: [[0.22, 0.65, 0.24, 0, -0.32, 0, wrap]] },
    { name: 'legR', pivot: [0.13, 0.65, 0], cubes: [[0.22, 0.65, 0.24, 0, -0.32, 0, wrap]] },
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.5, 0.6, 0.28, 0, 0.95, 0, wrap],
        ...bands(0.5, 0.6, 0.28, 0, 0.7, 0),
        [0.42, 0.42, 0.42, 0, 1.46, 0, wrap],
        [0.44, 0.04, 0.44, 0, 1.4, 0, dark],
        [0.1, 0.06, 0.02, -0.1, 1.5, -0.215, 0x7aff7a],
        [0.1, 0.06, 0.02, 0.1, 1.5, -0.215, 0x7aff7a],
      ],
    },
    { name: 'armL', pivot: [-0.33, 1.18, 0], rest: [-1.45, 0, 0], cubes: [[0.16, 0.6, 0.2, 0, -0.28, 0, wrap]] },
    { name: 'armR', pivot: [0.33, 1.18, 0], rest: [-1.45, 0, 0], cubes: [[0.16, 0.6, 0.2, 0, -0.28, 0, wrap]] },
  ];
}

/** Scorpion : brun-orange, pinces en avant, dard levé. */
export function scorpionModel(): ModelDef {
  const body = 0xc8743c;
  const dark = 0x8a4a24;
  const legs = (side: number): Cube[] => [-0.2, 0.05, 0.3].map((z): Cube => [0.36, 0.08, 0.08, side * 0.3, 0.12, z, dark]);
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.6, 0.3, 0.8, 0, 0.3, 0.05, body],
        [0.18, 0.12, 0.3, -0.3, 0.3, -0.5, dark],
        [0.18, 0.12, 0.3, 0.3, 0.3, -0.5, dark],
        [0.22, 0.18, 0.12, -0.32, 0.3, -0.7, body],
        [0.22, 0.18, 0.12, 0.32, 0.3, -0.7, body],
        [0.06, 0.06, 0.02, -0.1, 0.42, -0.36, 0x202020],
        [0.06, 0.06, 0.02, 0.1, 0.42, -0.36, 0x202020],
        [0.16, 0.16, 0.3, 0, 0.5, 0.55, body],
        [0.14, 0.4, 0.14, 0, 0.78, 0.68, body],
        [0.12, 0.14, 0.2, 0, 1.0, 0.6, dark],
      ],
    },
    { name: 'legsL', pivot: [-0.2, 0.2, 0], cubes: legs(-1) },
    { name: 'legsR', pivot: [0.2, 0.2, 0], cubes: legs(1) },
  ];
}

/** Vautour : brun, cou rose, il vole bas en battant des ailes. */
export function vultureModel(): ModelDef {
  const brown = 0x7a5232;
  const dark = 0x553820;
  const pink = 0xe8a0a0;
  return [
    {
      name: 'body',
      pivot: [0, 0.6, 0],
      cubes: [
        [0.4, 0.36, 0.7, 0, 0.3, 0.05, brown],
        [0.14, 0.3, 0.14, 0, 0.6, -0.3, pink],
        [0.2, 0.18, 0.24, 0, 0.82, -0.36, pink],
        [0.08, 0.06, 0.14, 0, 0.78, -0.54, 0xf0c43c],
        [0.06, 0.06, 0.02, -0.08, 0.86, -0.48, 0x202020],
        [0.06, 0.06, 0.02, 0.08, 0.86, -0.48, 0x202020],
        [0.3, 0.06, 0.3, 0, 0.18, 0.46, dark],
        [0.06, 0.3, 0.06, -0.1, 0, 0, 0xf0c43c],
        [0.06, 0.3, 0.06, 0.1, 0, 0, 0xf0c43c],
      ],
    },
    { name: 'wingL', pivot: [-0.2, 0.95, 0], cubes: [[0.8, 0.06, 0.5, -0.4, 0, 0, dark]] },
    { name: 'wingR', pivot: [0.2, 0.95, 0], cubes: [[0.8, 0.06, 0.5, 0.4, 0, 0, dark]] },
  ];
}

/** Grand Ver des Sables : un long ver en anneaux sable et brun, gueule ronde, qui sort du sol. */
export function grandVerModel(): ModelDef {
  const rings: Cube[] = [];
  for (let i = 0; i < 6; i++) {
    const w = 1.5 - i * 0.08;
    rings.push([w, 0.5, w, 0, 0.25 + i * 0.5, 0, i % 2 ? 0xc8a060 : 0xa87840]);
  }
  return [
    { name: 'body', pivot: [0, 0, 0], cubes: rings },
    {
      name: 'head',
      pivot: [0, 3.1, 0],
      cubes: [
        [1.3, 0.8, 1.3, 0, 0.3, 0, 0xc8a060],
        [0.9, 0.5, 0.06, 0, 0.3, -0.66, 0x3a1e10],
        ...[-0.3, -0.1, 0.1, 0.3].map((x): Cube => [0.1, 0.16, 0.06, x, 0.5, -0.68, 0xf4f0e0]),
        [0.18, 0.18, 0.04, -0.35, 0.72, -0.66, 0xff6040],
        [0.18, 0.18, 0.04, 0.35, 0.72, -0.66, 0xff6040],
      ],
    },
  ];
}

/** Chameau Caramel : brun clair, deux bosses, une petite couverture rouge. */
export function camelModel(): ModelDef {
  const fur = 0xc89a60;
  const dark = 0x9a7040;
  const leg = (x: number, z: number): Cube => [0.16, 0.8, 0.16, x, 0.4, z, fur];
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.6, 0.5, 1.3, 0, 1.05, 0, fur],
        [0.36, 0.3, 0.36, 0, 1.42, -0.25, fur],
        [0.36, 0.3, 0.36, 0, 1.42, 0.3, fur],
        [0.62, 0.06, 0.5, 0, 1.31, 0.02, 0xc0392b],
        [0.18, 0.6, 0.18, 0, 1.4, -0.72, fur],
        [0.24, 0.24, 0.42, 0, 1.76, -0.88, fur],
        [0.06, 0.06, 0.02, -0.08, 1.82, -1.1, 0x202020],
        [0.06, 0.06, 0.02, 0.08, 1.82, -1.1, 0x202020],
        [0.1, 0.24, 0.1, 0, 1.0, 0.7, dark],
      ],
    },
    { name: 'legL', pivot: [0, 0.8, 0], cubes: [leg(-0.2, -0.45), leg(0.2, 0.45)] },
    { name: 'legR', pivot: [0, 0.8, 0], cubes: [leg(0.2, -0.45), leg(-0.2, 0.45)] },
  ];
}

/** Tambour ancien des dunes (quête P3) : fût de bois cerclé d'or, peau claire. */
export function drumModel(): ModelDef {
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.8, 0.7, 0.8, 0, 0.35, 0, 0x8a5a2c],
        [0.84, 0.08, 0.84, 0, 0.12, 0, 0xf0c43c],
        [0.84, 0.08, 0.84, 0, 0.6, 0, 0xf0c43c],
        [0.76, 0.04, 0.76, 0, 0.72, 0, 0xf4e8c8],
      ],
    },
    { name: 'glow', pivot: [0, 0.76, 0], glow: true, cubes: [[0.3, 0.02, 0.3, 0, 0, 0, 0xfff3a0]] },
  ];
}

/** Seau d'eau (quête R1). La partie « water » s'affiche quand il est plein. */
export function bucketModel(): ModelDef {
  return [
    { name: 'body', pivot: [0, 0, 0], cubes: [[0.36, 0.34, 0.36, 0, 0.17, 0, 0x8a8e94], [0.3, 0.04, 0.3, 0, 0.35, 0, 0x5a5e64]] },
    { name: 'water', pivot: [0, 0, 0], cubes: [[0.28, 0.04, 0.28, 0, 0.33, 0, 0x4a9ae8]] },
  ];
}

/** Abreuvoir de pierre (quête R1). */
export function troughModel(): ModelDef {
  return [
    { name: 'body', pivot: [0, 0, 0], cubes: [[1.4, 0.5, 0.6, 0, 0.25, 0, 0xc8a878], [1.2, 0.06, 0.4, 0, 0.5, 0, 0x6a5a40]] },
    { name: 'water', pivot: [0, 0, 0], cubes: [[1.2, 0.06, 0.4, 0, 0.46, 0, 0x4a9ae8]] },
  ];
}

/** Charrette du marchand Zéphir (quête R2). */
export function cartModel(): ModelDef {
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [1.2, 0.5, 1.8, 0, 0.75, 0, 0x8a5a2c],
        [1.24, 0.1, 1.84, 0, 1.0, 0, 0x5a3a20],
        [0.1, 0.7, 0.7, -0.68, 0.35, 0.5, 0x5a3a20],
        [0.1, 0.7, 0.7, 0.68, 0.35, 0.5, 0x5a3a20],
        [0.1, 0.7, 0.7, -0.68, 0.35, -0.5, 0x5a3a20],
        [0.1, 0.7, 0.7, 0.68, 0.35, -0.5, 0x5a3a20],
        [0.9, 0.3, 0.5, 0, 1.15, 0.3, 0xc0392b],
        [0.5, 0.4, 0.5, 0.1, 1.2, -0.4, 0xe0c080],
      ],
    },
  ];
}

/** Morceau de carte déchirée (quête O1). */
export function mapPieceModel(): ModelDef {
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.4, 0.02, 0.3, 0, 0.03, 0, 0xf4e8c8],
        [0.12, 0.022, 0.04, -0.06, 0.04, 0.02, 0xc0392b],
        [0.04, 0.022, 0.1, 0.08, 0.04, -0.04, 0x8a5a2c],
      ],
    },
    { name: 'glow', pivot: [0, 0.2, 0], glow: true, cubes: [[0.06, 0.06, 0.06, 0, 0, 0, 0xfff3a0]] },
  ];
}

/** Cristal de puissance caché : un cristal orange qui flotte au-dessus d'un socle de grès. */
export function crystalItemModel(): ModelDef {
  return [
    { name: 'body', pivot: [0, 0, 0], cubes: [[0.6, 0.3, 0.6, 0, 0.15, 0, 0xd8b878], [0.5, 0.06, 0.5, 0, 0.32, 0, 0xb89858]] },
    {
      name: 'gem',
      pivot: [0, 0.85, 0],
      glow: true,
      cubes: [
        [0.24, 0.5, 0.24, 0, 0, 0, 0xffa030],
        [0.14, 0.3, 0.14, 0, 0.3, 0, 0xffd060],
        [0.06, 0.4, 0.26, 0, 0, 0, 0xfff0b0],
      ],
    },
  ];
}

/** Miroir sur pivot (énigme des miroirs du soleil) : la face réfléchissante regarde vers −Z. */
export function mirrorModel(): ModelDef {
  return [
    { name: 'body', pivot: [0, 0, 0], cubes: [[0.6, 0.2, 0.6, 0, 0.1, 0, 0xb89858], [0.12, 0.7, 0.12, 0, 0.55, 0, 0x8a5a2c]] },
    { name: 'glass', pivot: [0, 1.1, 0], cubes: [[1.0, 0.9, 0.08, 0, 0, 0, 0xc8e8ff], [1.08, 0.98, 0.04, 0, 0, 0.05, 0xf0c43c]] },
  ];
}

/** Rayon de soleil : un segment lumineux de 1 bloc, étiré par la vie du sanctuaire. */
export function sunRayModel(): ModelDef {
  return [{ name: 'body', pivot: [0, 0, 0], glow: true, cubes: [[0.14, 0.14, 1, 0, 0, 0, 0xfff3a0]] }];
}

/** Cristal de la porte du temple (énigme des miroirs) : il s'illumine quand le rayon l'atteint. */
export function doorCrystalModel(lit: boolean): ModelDef {
  const c = lit ? 0xffe060 : 0x8a7a50;
  return [{ name: 'body', pivot: [0, 0, 0], glow: lit, cubes: [[0.4, 0.6, 0.4, 0, 0.3, 0, c], [0.24, 0.3, 0.24, 0, 0.75, 0, c]] }];
}

/** Bloc de grès à pousser (énigme du bloc de grès). */
export function sandstoneBlockModel(): ModelDef {
  return [{ name: 'body', pivot: [0, 0, 0], cubes: [[0.96, 0.96, 0.96, 0, 0.48, 0, 0xd8b878], [0.98, 0.1, 0.98, 0, 0.9, 0, 0xc8a060], [0.3, 0.3, 0.02, 0, 0.5, -0.49, 0xb89858]] }];
}

/** Dalle-pression (où pousser le bloc de grès). */
export function pressurePlateModel(): ModelDef {
  return [{ name: 'body', pivot: [0, 0, 0], cubes: [[0.9, 0.06, 0.9, 0, 0.03, 0, 0xa87840], [0.6, 0.07, 0.6, 0, 0.035, 0, 0xf0c43c]] }];
}

/** Dalle-symbole (énigme des dalles-symboles) : socle et symbole en relief. */
export function symbolTileModel(color: number): ModelDef {
  return [{ name: 'body', pivot: [0, 0, 0], cubes: [[0.9, 0.08, 0.9, 0, 0.04, 0, 0xd8b878], [0.5, 0.09, 0.5, 0, 0.05, 0, color]] }];
}

/** Trophée du Grand Ver : statuette dorée d'un ver qui sort des dunes. */
export function trophyVerModel(): ModelDef {
  const gold = 0xf0c43c;
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.4, 0.08, 0.32, 0, 0.04, 0, 0x6a4424],
        [0.3, 0.06, 0.26, 0, 0.11, 0, 0xffe27a],
        [0.12, 0.12, 0.12, 0, 0.18, 0, gold],
        [0.1, 0.1, 0.1, 0.02, 0.28, -0.02, gold],
        [0.12, 0.1, 0.12, 0.04, 0.38, -0.05, gold],
      ],
    },
  ];
}
