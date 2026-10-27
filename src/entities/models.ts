import type { Cube, ModelDef, PartDef } from './cubeModel';

/**
 * Modèles en cubes, définis dans le code (aucun fichier externe).
 * Origine entre les pieds, le personnage regarde vers -Z.
 */

const EYE_DARK = 0x1d1d2b;

/** Paire d'yeux sur une face avant à la hauteur y et à la profondeur z. */
function eyes(y: number, z: number, spacing: number, color: number, size = 0.07): Cube[] {
  return [
    [size, size, 0.02, -spacing, y, z, color],
    [size, size, 0.02, spacing, y, z, color],
  ];
}

// ---------- Héros ----------

export const HERO_STAFF_TIP: [number, number, number] = [0, 0.32, -0.06];

export function heroModel(): ModelDef {
  const skin = 0xf2c6a0;
  const hair = 0x5a3a22;
  const robe = 0x2d3a8c;
  const trim = 0xf0c43c;
  return [
    { name: 'legL', pivot: [-0.13, 0.62, 0], cubes: [[0.22, 0.48, 0.24, 0, -0.26, 0, robe], [0.24, 0.14, 0.28, 0, -0.55, -0.02, 0x3a2a1e]] },
    { name: 'legR', pivot: [0.13, 0.62, 0], cubes: [[0.22, 0.48, 0.24, 0, -0.26, 0, robe], [0.24, 0.14, 0.28, 0, -0.55, -0.02, 0x3a2a1e]] },
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.52, 0.56, 0.3, 0, 0.9, 0, robe],
        [0.54, 0.08, 0.32, 0, 0.66, 0, trim],
        [0.12, 0.12, 0.04, 0.12, 1.06, -0.16, trim],
        [0.44, 0.42, 0.42, 0, 1.4, 0, skin],
        [0.46, 0.14, 0.44, 0, 1.62, 0.01, hair],
        [0.46, 0.26, 0.1, 0, 1.48, 0.18, hair],
        ...eyes(1.42, -0.215, 0.1, EYE_DARK),
      ],
    },
    { name: 'cape', parent: 'body', pivot: [0, 1.17, 0.18], rest: [0.1, 0, 0], cubes: [[0.56, 0.86, 0.05, 0, -0.43, 0, 0x7b2d8b]] },
    { name: 'armL', pivot: [-0.34, 1.12, 0], cubes: [[0.16, 0.5, 0.2, 0, -0.22, 0, robe], [0.16, 0.1, 0.18, 0, -0.5, 0, skin]] },
    {
      name: 'armR',
      pivot: [0.34, 1.12, 0],
      rest: [-0.25, 0, 0],
      cubes: [
        [0.16, 0.5, 0.2, 0, -0.22, 0, robe],
        [0.16, 0.1, 0.18, 0, -0.5, 0, skin],
        [0.07, 1.25, 0.07, 0, -0.35, -0.06, 0x8a5a32],
        [0.16, 0.16, 0.16, ...HERO_STAFF_TIP, 0x6ff0ff],
      ],
    },
  ];
}

// ---------- Golems ----------

/** Golem trapu générique (Pierre, gardiens du village). */
function stoneGolem(body: number, dark: number, light: number, eye: number, extra: Cube[] = []): ModelDef {
  return [
    { name: 'legL', pivot: [-0.25, 0.5, 0], cubes: [[0.36, 0.5, 0.4, 0, -0.25, 0, dark]] },
    { name: 'legR', pivot: [0.25, 0.5, 0], cubes: [[0.36, 0.5, 0.4, 0, -0.25, 0, dark]] },
    {
      name: 'body',
      pivot: [0, 0.5, 0],
      cubes: [
        [1.0, 0.8, 0.7, 0, 0.45, 0, body],
        [0.6, 0.45, 0.55, 0, 1.05, -0.05, light],
        [0.64, 0.1, 0.12, 0, 1.22, -0.3, dark],
        ...eyes(1.06, -0.33, 0.14, eye, 0.12),
        [0.3, 0.2, 0.08, -0.22, 0.6, -0.36, light],
        [0.2, 0.14, 0.08, 0.25, 0.3, -0.36, dark],
        ...extra,
      ],
    },
    { name: 'armL', pivot: [-0.62, 1.15, 0], cubes: [[0.3, 0.7, 0.35, 0, -0.3, 0, body], [0.38, 0.3, 0.42, 0, -0.75, 0, dark]] },
    { name: 'armR', pivot: [0.62, 1.15, 0], cubes: [[0.3, 0.7, 0.35, 0, -0.3, 0, body], [0.38, 0.3, 0.42, 0, -0.75, 0, dark]] },
  ];
}

export function pierreModel(): ModelDef {
  return stoneGolem(0x8d8f9c, 0x5f6170, 0xa9abb8, 0x6ff0ff);
}

export function mousseModel(): ModelDef {
  const green = 0x5aa04a;
  const dark = 0x3d7a34;
  const light = 0x86c86a;
  const moss = 0xa6e07c;
  return [
    { name: 'legL', pivot: [-0.22, 0.45, 0], cubes: [[0.3, 0.45, 0.34, 0, -0.22, 0, dark]] },
    { name: 'legR', pivot: [0.22, 0.45, 0], cubes: [[0.3, 0.45, 0.34, 0, -0.22, 0, dark]] },
    {
      name: 'body',
      pivot: [0, 0.45, 0],
      cubes: [
        [0.85, 0.75, 0.62, 0, 0.4, 0, green],
        [0.62, 0.5, 0.56, 0, 1.02, -0.03, light],
        ...eyes(1.04, -0.32, 0.13, 0xfff6c8, 0.11),
        [0.32, 0.14, 0.32, -0.34, 0.84, 0, moss],
        [0.32, 0.14, 0.32, 0.34, 0.84, 0, moss],
        [0.4, 0.12, 0.4, 0, 1.32, 0, moss],
        [0.06, 0.22, 0.06, 0.12, 1.48, 0, 0x3d7a34],
        [0.26, 0.08, 0.26, 0.12, 1.62, 0, 0xf08ac0],
        [0.1, 0.1, 0.1, 0.12, 1.66, 0, 0xffe066],
        [0.22, 0.18, 0.06, 0.2, 0.35, -0.32, moss],
      ],
    },
    { name: 'armL', pivot: [-0.55, 1.0, 0], cubes: [[0.22, 0.75, 0.26, 0, -0.35, 0, green], [0.28, 0.16, 0.3, 0, -0.75, 0, moss]] },
    { name: 'armR', pivot: [0.55, 1.0, 0], cubes: [[0.22, 0.75, 0.26, 0, -0.35, 0, green], [0.28, 0.16, 0.3, 0, -0.75, 0, moss]] },
  ];
}

export function guardianModel(): ModelDef {
  return stoneGolem(0xc9a36a, 0x8f6d40, 0xe0c08a, 0xf0c43c, [[1.04, 0.12, 0.74, 0, 0.1, 0, 0x8f6d40]]);
}

// ---------- Monstres de la phase 1 ----------

export function slimeModel(): ModelDef {
  const g = 0x6ed46e;
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.9, 0.8, 0.9, 0, 0.4, 0, g],
        [0.5, 0.12, 0.5, 0, 0.86, 0, 0x9ae89a],
        [0.14, 0.18, 0.02, -0.2, 0.5, -0.46, EYE_DARK],
        [0.14, 0.18, 0.02, 0.2, 0.5, -0.46, EYE_DARK],
        [0.26, 0.06, 0.02, 0, 0.3, -0.46, 0x2f7a3a],
      ],
    },
  ];
}

export function zombieModel(): ModelDef {
  const skin = 0x7fae6a;
  const shirt = 0x6d5a3f;
  const pants = 0x445a78;
  return [
    { name: 'legL', pivot: [-0.13, 0.65, 0], cubes: [[0.22, 0.65, 0.24, 0, -0.32, 0, pants]] },
    { name: 'legR', pivot: [0.13, 0.65, 0], cubes: [[0.22, 0.65, 0.24, 0, -0.32, 0, pants], [0.1, 0.12, 0.26, 0.06, -0.55, 0, skin]] },
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.5, 0.6, 0.28, 0, 0.95, 0, shirt],
        [0.18, 0.14, 0.04, 0.12, 0.75, -0.15, skin],
        [0.42, 0.42, 0.42, 0, 1.46, 0, skin],
        [0.44, 0.08, 0.44, 0, 1.68, 0, 0x4f6e44],
        ...eyes(1.48, -0.215, 0.1, 0x202a20, 0.09),
      ],
    },
    { name: 'armL', pivot: [-0.33, 1.18, 0], rest: [-1.45, 0, 0], cubes: [[0.16, 0.6, 0.2, 0, -0.28, 0, skin], [0.17, 0.2, 0.21, 0, -0.1, 0, shirt]] },
    { name: 'armR', pivot: [0.33, 1.18, 0], rest: [-1.45, 0, 0], cubes: [[0.16, 0.6, 0.2, 0, -0.28, 0, skin]] },
  ];
}

export function spiderModel(): ModelDef {
  const brown = 0x6b4a2e;
  const dark = 0x4a321e;
  const legs = (side: number): Cube[] =>
    [-0.32, -0.11, 0.11, 0.32].flatMap((z): Cube[] => [
      [0.42, 0.08, 0.08, side * 0.2, 0.08, z, dark],
      [0.08, 0.42, 0.08, side * 0.4, -0.13, z, dark],
    ]);
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.75, 0.5, 0.8, 0, 0.45, 0.3, brown],
        [0.5, 0.4, 0.45, 0, 0.42, -0.32, dark],
        [0.08, 0.08, 0.02, -0.14, 0.5, -0.555, 0xff3030],
        [0.08, 0.08, 0.02, 0.14, 0.5, -0.555, 0xff3030],
        [0.06, 0.06, 0.02, -0.06, 0.4, -0.555, 0xff3030],
        [0.06, 0.06, 0.02, 0.06, 0.4, -0.555, 0xff3030],
      ],
    },
    { name: 'legsL', pivot: [-0.25, 0.4, -0.05], cubes: legs(-1) },
    { name: 'legsR', pivot: [0.25, 0.4, -0.05], cubes: legs(1) },
  ];
}

// ---------- PNJ ----------

interface HumanColors {
  skin: number;
  hair: number;
  top: number;
  bottom: number;
  shoes: number;
  extra?: Cube[];
}

function humanoid(c: HumanColors): ModelDef {
  const parts: PartDef[] = [
    { name: 'legL', pivot: [-0.13, 0.62, 0], cubes: [[0.22, 0.5, 0.24, 0, -0.26, 0, c.bottom], [0.24, 0.12, 0.28, 0, -0.56, -0.02, c.shoes]] },
    { name: 'legR', pivot: [0.13, 0.62, 0], cubes: [[0.22, 0.5, 0.24, 0, -0.26, 0, c.bottom], [0.24, 0.12, 0.28, 0, -0.56, -0.02, c.shoes]] },
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.52, 0.58, 0.3, 0, 0.91, 0, c.top],
        [0.44, 0.42, 0.42, 0, 1.41, 0, c.skin],
        [0.46, 0.12, 0.44, 0, 1.63, 0.01, c.hair],
        [0.46, 0.24, 0.1, 0, 1.5, 0.18, c.hair],
        ...eyes(1.43, -0.215, 0.1, EYE_DARK),
        ...(c.extra ?? []),
      ],
    },
    { name: 'armL', pivot: [-0.34, 1.13, 0], cubes: [[0.16, 0.5, 0.2, 0, -0.22, 0, c.top], [0.16, 0.1, 0.18, 0, -0.5, 0, c.skin]] },
    { name: 'armR', pivot: [0.34, 1.13, 0], cubes: [[0.16, 0.5, 0.2, 0, -0.22, 0, c.top], [0.16, 0.1, 0.18, 0, -0.5, 0, c.skin]] },
  ];
  return parts;
}

export function lumiblocModel(): ModelDef {
  const sky = 0x7ec8f0;
  const white = 0xf4f4f4;
  return humanoid({
    skin: 0xf0c8a8,
    hair: white,
    top: 0x3d3a8a,
    bottom: 0x3d3a8a,
    shoes: 0x2a2440,
    extra: [
      // Longue barbe blanche.
      [0.38, 0.22, 0.06, 0, 1.24, -0.23, white],
      [0.3, 0.3, 0.06, 0, 1.0, -0.19, white],
      [0.18, 0.16, 0.06, 0, 0.78, -0.19, white],
      // Chapeau pointu couleur ciel.
      [0.62, 0.08, 0.62, 0, 1.68, 0, sky],
      [0.42, 0.2, 0.42, 0, 1.82, 0, sky],
      [0.28, 0.2, 0.28, 0.03, 2.0, 0.02, sky],
      [0.16, 0.18, 0.16, 0.06, 2.17, 0.05, sky],
      [0.08, 0.1, 0.08, 0.1, 2.3, 0.08, 0xf0c43c],
      // Robe longue.
      [0.56, 0.5, 0.34, 0, 0.42, 0, 0x3d3a8a],
    ],
  });
}

export function mereBriqueModel(): ModelDef {
  return humanoid({
    skin: 0xe8b890,
    hair: 0x6a3e22,
    top: 0xc0392b,
    bottom: 0xc0392b,
    shoes: 0x4a2e1e,
    extra: [
      [0.4, 0.5, 0.04, 0, 0.82, -0.17, 0xf8f4ea],
      [0.22, 0.22, 0.22, 0, 1.68, 0.2, 0x6a3e22],
      [0.56, 0.4, 0.34, 0, 0.45, 0, 0xc0392b],
    ],
  });
}

export function paqueretteModel(): ModelDef {
  return humanoid({
    skin: 0xf6d2b0,
    hair: 0xf2d060,
    top: 0xf3c94a,
    bottom: 0xf3c94a,
    shoes: 0x7a5a3a,
    extra: [
      [0.4, 0.5, 0.04, 0, 0.82, -0.17, 0xffffff],
      [0.4, 0.22, 0.4, 0, 1.76, 0.01, 0xffffff],
      [0.48, 0.1, 0.48, 0, 1.9, 0.01, 0xffffff],
    ],
  });
}

export function gastonModel(): ModelDef {
  return humanoid({
    skin: 0xdcae88,
    hair: 0x8a8a8a,
    top: 0xe8e2d4,
    bottom: 0x3e64a0,
    shoes: 0x3a2a1e,
    extra: [
      [0.54, 0.4, 0.04, 0, 0.88, -0.17, 0x3e64a0],
      [0.48, 0.1, 0.5, 0, 1.68, 0, 0x3e64a0],
      [0.48, 0.04, 0.2, 0, 1.64, -0.3, 0x3e64a0],
      [0.3, 0.08, 0.04, 0, 1.3, -0.215, 0x8a8a8a],
    ],
  });
}

// ---------- Objets ----------

function lanternModel(lit: boolean): ModelDef {
  const glass = lit ? 0xffe27a : 0x8a8f9c;
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.5, 0.15, 0.5, 0, 0.075, 0, 0x5a5a66],
        [0.16, 1.5, 0.16, 0, 0.8, 0, 0x4a3a2a],
        [0.5, 0.08, 0.5, 0, 1.58, 0, 0x2a2a33],
        [0.36, 0.42, 0.36, 0, 1.83, 0, glass],
        [0.46, 0.08, 0.46, 0, 2.08, 0, 0x2a2a33],
        [0.16, 0.12, 0.16, 0, 2.18, 0, 0x2a2a33],
      ],
    },
  ];
}

function chestModel(): ModelDef {
  const wood = 0xa8703c;
  const band = 0x5a3c20;
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.9, 0.5, 0.6, 0, 0.25, 0, wood],
        [0.92, 0.08, 0.62, 0, 0.42, 0, band],
        [0.16, 0.16, 0.04, 0, 0.36, -0.31, 0xf0c43c],
      ],
    },
    { name: 'lid', parent: 'body', pivot: [0, 0.5, 0.3], cubes: [[0.9, 0.22, 0.6, 0, 0.11, -0.3, wood], [0.92, 0.06, 0.62, 0, 0.2, -0.3, band]] },
  ];
}

/** Couleurs du portrait de dialogue (visage en pixels). */
export interface PortraitColors {
  skin: number;
  hair: number;
  hat?: number;
  beard?: number;
  eye: number;
}

export const PORTRAITS: Record<string, PortraitColors> = {
  lumibloc: { skin: 0xf0c8a8, hair: 0xf4f4f4, hat: 0x7ec8f0, beard: 0xf4f4f4, eye: EYE_DARK },
  mereBrique: { skin: 0xe8b890, hair: 0x6a3e22, eye: EYE_DARK },
  paquerette: { skin: 0xf6d2b0, hair: 0xf2d060, hat: 0xffffff, eye: EYE_DARK },
  gaston: { skin: 0xdcae88, hair: 0x8a8a8a, hat: 0x3e64a0, eye: EYE_DARK },
};

/** Définitions construites une seule fois : la géométrie de chaque pièce est partagée entre instances. */
export const MODELS = {
  hero: heroModel(),
  pierre: pierreModel(),
  mousse: mousseModel(),
  guardian: guardianModel(),
  slime: slimeModel(),
  zombie: zombieModel(),
  spider: spiderModel(),
  lumibloc: lumiblocModel(),
  mereBrique: mereBriqueModel(),
  paquerette: paqueretteModel(),
  gaston: gastonModel(),
  lanternLit: lanternModel(true),
  lanternUnlit: lanternModel(false),
  chest: chestModel(),
} as const satisfies Record<string, ModelDef>;
export type ModelId = keyof typeof MODELS;
