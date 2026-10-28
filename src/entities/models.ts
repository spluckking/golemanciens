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

/** Gemme du bâton, dans le repère du bâton (point de départ des étincelles). */
export const HERO_STAFF_TIP: [number, number, number] = [0, 0.12, -0.87];

export function heroModel(): ModelDef {
  const skin = 0xf2c6a0;
  const hair = 0x5a3a22;
  const robe = 0x2d3a8c;
  const robeDark = 0x222c6e;
  const trim = 0xf0c43c;
  const cape = 0x7b2d8b;
  const capeLining = 0xa04ab4;
  const wood = 0x8a5a32;
  return [
    {
      name: 'legL',
      pivot: [-0.13, 0.62, 0],
      cubes: [[0.22, 0.48, 0.24, 0, -0.26, 0, robeDark], [0.24, 0.14, 0.3, 0, -0.55, -0.03, 0x3a2a1e], [0.25, 0.04, 0.31, 0, -0.47, -0.03, 0x5a4030]],
    },
    {
      name: 'legR',
      pivot: [0.13, 0.62, 0],
      cubes: [[0.22, 0.48, 0.24, 0, -0.26, 0, robeDark], [0.24, 0.14, 0.3, 0, -0.55, -0.03, 0x3a2a1e], [0.25, 0.04, 0.31, 0, -0.47, -0.03, 0x5a4030]],
    },
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        // Tunique d'école, ceinture dorée, pans de robe.
        [0.52, 0.56, 0.3, 0, 0.9, 0, robe],
        [0.56, 0.18, 0.32, 0, 0.6, 0, robe],
        [0.54, 0.07, 0.33, 0, 0.7, 0, trim],
        [0.1, 0.1, 0.04, 0, 0.7, -0.17, 0xfff2a8],
        // Col et fermoir de cape en étoile.
        [0.5, 0.08, 0.34, 0, 1.16, 0, capeLining],
        [0.12, 0.12, 0.04, -0.17, 1.12, -0.18, trim],
        [0.06, 0.06, 0.04, -0.17, 1.12, -0.2, 0xfff2a8],
        // Écusson de l'Académie.
        [0.12, 0.14, 0.03, 0.12, 0.98, -0.16, trim],
        // Tête, cheveux, mèche, oreilles.
        [0.44, 0.42, 0.42, 0, 1.4, 0, skin],
        [0.46, 0.14, 0.44, 0, 1.62, 0.01, hair],
        [0.46, 0.26, 0.1, 0, 1.48, 0.18, hair],
        [0.2, 0.08, 0.06, -0.1, 1.55, -0.21, hair],
        [0.04, 0.1, 0.08, -0.23, 1.4, 0.02, skin],
        [0.04, 0.1, 0.08, 0.23, 1.4, 0.02, skin],
        ...eyes(1.42, -0.215, 0.1, EYE_DARK),
        [0.12, 0.03, 0.02, 0, 1.3, -0.215, 0xc08070],
        // Capuche repliée dans le dos.
        [0.4, 0.16, 0.12, 0, 1.2, 0.2, cape],
      ],
    },
    // Cape en deux pans, accrochée dans le dos : elle ne flotte que vers l'arrière (voir animateCape).
    { name: 'cape', parent: 'body', pivot: [0, 1.17, 0.19], cubes: [[0.6, 0.5, 0.05, 0, -0.25, 0, cape], [0.56, 0.48, 0.02, 0, -0.25, -0.03, capeLining]] },
    {
      name: 'capeLow',
      parent: 'cape',
      pivot: [0, -0.5, 0],
      cubes: [[0.64, 0.42, 0.05, 0, -0.21, 0, cape], [0.6, 0.4, 0.02, 0, -0.21, -0.03, capeLining], [0.66, 0.05, 0.06, 0, -0.42, 0, trim]],
    },
    { name: 'armL', pivot: [-0.34, 1.12, 0], cubes: [[0.16, 0.5, 0.2, 0, -0.22, 0, robe], [0.18, 0.06, 0.22, 0, -0.42, 0, trim], [0.16, 0.1, 0.18, 0, -0.5, 0, skin]] },
    {
      name: 'armR',
      pivot: [0.34, 1.12, 0],
      cubes: [
        [0.16, 0.5, 0.2, 0, -0.22, 0, robe],
        [0.18, 0.06, 0.22, 0, -0.42, 0, trim],
        // Main fermée sur le manche.
        [0.17, 0.14, 0.2, 0, -0.52, -0.02, skin],
      ],
    },
    // Bâton tenu dans le poing, presque à l'horizontale, pointé vers l'avant : manche, bague dorée,
    // crosse relevée qui tient la gemme. Repère : la main, l'axe du manche vers -Z.
    {
      name: 'staff',
      parent: 'armR',
      pivot: [0, -0.52, -0.02],
      rest: [0.16, 0, 0],
      cubes: [
        [0.07, 0.07, 1.25, 0, 0, -0.33, wood],
        [0.09, 0.09, 0.06, 0, 0, -0.16, trim],
        [0.09, 0.09, 0.06, 0, 0, 0.26, trim],
        [0.07, 0.3, 0.07, 0, 0.12, -0.99, wood],
        [0.07, 0.07, 0.16, 0, 0.27, -0.9, wood],
      ],
    },
    { name: 'gem', parent: 'staff', pivot: [0, 0, 0], glow: true, cubes: [[0.14, 0.14, 0.14, 0, 0.12, -0.87, 0x6ff0ff], [0.05, 0.05, 0.04, 0.04, 0.16, -0.93, 0xe8ffff]] },
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

// ---------- Villageois et apprentis variés ----------

export type HairStyle = 'short' | 'long' | 'bun' | 'bald' | 'spiky';
export type HatStyle = 'none' | 'straw' | 'cap' | 'beanie' | 'kerchief' | 'pointy';

export interface VillagerLook {
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  hat: HatStyle;
  hatColor: number;
  top: number;
  bottom: number;
  shoes: number;
  /** Tablier, salopette ou robe longue. */
  outfit: 'plain' | 'apron' | 'overalls' | 'dress' | 'robe';
  outfitColor: number;
  beard?: number;
}

function hairCubes(style: HairStyle, c: number): Cube[] {
  if (style === 'bald') return [[0.46, 0.06, 0.44, 0, 1.47, 0.12, c]];
  const base: Cube[] = [[0.46, 0.12, 0.44, 0, 1.63, 0.01, c]];
  if (style === 'short') return [...base, [0.46, 0.2, 0.1, 0, 1.52, 0.18, c]];
  if (style === 'long') return [...base, [0.48, 0.5, 0.12, 0, 1.38, 0.18, c], [0.06, 0.36, 0.3, -0.24, 1.45, 0.05, c], [0.06, 0.36, 0.3, 0.24, 1.45, 0.05, c]];
  if (style === 'bun') return [...base, [0.46, 0.2, 0.1, 0, 1.52, 0.18, c], [0.2, 0.2, 0.2, 0, 1.72, 0.2, c]];
  return [...base, [0.1, 0.12, 0.1, -0.12, 1.74, 0, c], [0.1, 0.14, 0.1, 0.06, 1.75, -0.06, c], [0.1, 0.1, 0.1, 0.16, 1.72, 0.08, c], [0.46, 0.2, 0.1, 0, 1.52, 0.18, c]];
}

function hatCubes(style: HatStyle, c: number): Cube[] {
  switch (style) {
    case 'straw':
      return [[0.72, 0.05, 0.72, 0, 1.66, 0, c], [0.42, 0.14, 0.42, 0, 1.74, 0, c], [0.44, 0.04, 0.44, 0, 1.69, 0, 0xc0392b]];
    case 'cap':
      return [[0.48, 0.12, 0.46, 0, 1.68, 0.01, c], [0.4, 0.04, 0.2, 0, 1.63, -0.3, c]];
    case 'beanie':
      return [[0.48, 0.16, 0.46, 0, 1.68, 0.01, c], [0.1, 0.1, 0.1, 0, 1.8, 0, 0xf4f4f4]];
    case 'kerchief':
      return [[0.48, 0.1, 0.46, 0, 1.66, 0.01, c], [0.16, 0.16, 0.06, 0, 1.58, 0.24, c]];
    case 'pointy':
      return [[0.56, 0.06, 0.56, 0, 1.67, 0, c], [0.36, 0.18, 0.36, 0, 1.79, 0, c], [0.22, 0.18, 0.22, 0.02, 1.95, 0.02, c], [0.1, 0.14, 0.1, 0.04, 2.1, 0.04, c]];
    default:
      return [];
  }
}

function outfitCubes(look: VillagerLook): Cube[] {
  switch (look.outfit) {
    case 'apron':
      return [[0.4, 0.5, 0.04, 0, 0.82, -0.17, look.outfitColor]];
    case 'overalls':
      return [[0.4, 0.3, 0.04, 0, 0.78, -0.16, look.outfitColor], [0.06, 0.3, 0.04, -0.15, 1.04, -0.16, look.outfitColor], [0.06, 0.3, 0.04, 0.15, 1.04, -0.16, look.outfitColor]];
    case 'dress':
      return [[0.58, 0.46, 0.36, 0, 0.44, 0, look.outfitColor]];
    case 'robe':
      return [[0.58, 0.5, 0.36, 0, 0.42, 0, look.top], [0.54, 0.06, 0.33, 0, 0.68, 0, look.outfitColor], [0.5, 0.08, 0.34, 0, 1.17, 0, look.outfitColor]];
    default:
      return [];
  }
}

/** Villageois sur une base commune, rendu unique par sa tenue, sa coiffure et son chapeau. */
export function villagerModel(look: VillagerLook): ModelDef {
  const parts = humanoid({
    skin: look.skin,
    hair: look.hair,
    top: look.top,
    bottom: look.bottom,
    shoes: look.shoes,
    extra: [
      ...outfitCubes(look),
      ...hatCubes(look.hat, look.hatColor),
      ...(look.beard !== undefined ? ([[0.36, 0.14, 0.06, 0, 1.26, -0.23, look.beard]] as Cube[]) : []),
    ],
  });
  // Coiffure propre au villageois, à la place de celle de la base.
  const body = parts.find((p) => p.name === 'body')!;
  body.cubes = body.cubes.filter((cube) => cube[6] !== look.hair || cube[4] < 1.45);
  body.cubes.push(...hairCubes(look.hairStyle, look.hair));
  return parts;
}

/** Quelques silhouettes de villageois et d'apprentis (fond des cinématiques, villages). */
export const VILLAGER_LOOKS: Record<string, VillagerLook> = {
  farmer: { skin: 0xd9a37c, hair: 0x3a2618, hairStyle: 'short', hat: 'straw', hatColor: 0xe8cf7a, top: 0x6f9e4c, bottom: 0x5a4632, shoes: 0x3a2a1e, outfit: 'overalls', outfitColor: 0x3e64a0 },
  baker: { skin: 0xf3cfb0, hair: 0xb04a2a, hairStyle: 'bun', hat: 'kerchief', hatColor: 0xe76f9a, top: 0xf6e3c0, bottom: 0x8a5a3c, shoes: 0x4a3426, outfit: 'apron', outfitColor: 0xffffff },
  grandpa: { skin: 0xe2b896, hair: 0xd8d8d8, hairStyle: 'bald', hat: 'cap', hatColor: 0x6a5a8a, top: 0x9c6b3a, bottom: 0x4a4a5a, shoes: 0x2a2a2a, outfit: 'plain', outfitColor: 0, beard: 0xd8d8d8 },
  girl: { skin: 0x8d5a3c, hair: 0x1e1410, hairStyle: 'long', hat: 'none', hatColor: 0, top: 0xf0c43c, bottom: 0xf0c43c, shoes: 0xc0392b, outfit: 'dress', outfitColor: 0x4fb4c8 },
  fisher: { skin: 0xc68a62, hair: 0x5a3a22, hairStyle: 'spiky', hat: 'beanie', hatColor: 0xc0392b, top: 0x2e7d8a, bottom: 0x3a3a48, shoes: 0x2a2a2a, outfit: 'plain', outfitColor: 0 },
  apprenticeRed: { skin: 0xf2c6a0, hair: 0xe0a040, hairStyle: 'long', hat: 'pointy', hatColor: 0xb03040, top: 0xb03040, bottom: 0x7a1e2a, shoes: 0x3a2a1e, outfit: 'robe', outfitColor: 0xf0c43c },
  apprenticeGreen: { skin: 0x9a6648, hair: 0x2a1a10, hairStyle: 'spiky', hat: 'none', hatColor: 0, top: 0x2f8a52, bottom: 0x1f5a36, shoes: 0x3a2a1e, outfit: 'robe', outfitColor: 0xf0c43c },
  apprenticeTeal: { skin: 0xe8b890, hair: 0x6a3e22, hairStyle: 'bun', hat: 'pointy', hatColor: 0x2a8a9a, top: 0x2a8a9a, bottom: 0x1c5a66, shoes: 0x3a2a1e, outfit: 'robe', outfitColor: 0xf0c43c },
};

// ---------- Dragon d'Ombre (finale) ----------

/** Grand dragon noir et violet, yeux et pointes lumineux. Il regarde vers -Z ; origine au centre du corps. */
export function dragonModel(): ModelDef {
  const dark = 0x2a2238;
  const mid = 0x3d2f55;
  const belly = 0x55406e;
  const membrane = 0x5b2d82;
  const spike = 0x9a5ae0;
  const bone = 0xcfc6e0;
  const wing = (side: number): PartDef[] => [
    {
      name: side < 0 ? 'wingL' : 'wingR',
      parent: 'body',
      pivot: [side * 0.75, 0.45, -0.5],
      cubes: [
        [2.3, 0.16, 0.22, side * 1.15, 0, 0, mid],
        [2.3, 0.06, 1.9, side * 1.15, -0.03, 0.95, membrane],
        [0.3, 0.3, 0.3, side * 2.3, 0, 0, dark],
      ],
    },
    {
      name: side < 0 ? 'wingTipL' : 'wingTipR',
      parent: side < 0 ? 'wingL' : 'wingR',
      pivot: [side * 2.3, 0, 0],
      cubes: [
        [2.0, 0.12, 0.16, side * 1.0, 0, 0, mid],
        [2.0, 0.05, 1.5, side * 1.0, -0.03, 0.75, membrane],
        [0.16, 0.12, 0.4, side * 2.05, 0, -0.1, bone],
      ],
    },
  ];
  const leg = (name: string, x: number, z: number): PartDef => ({
    name,
    parent: 'body',
    pivot: [x, -0.45, z],
    rest: [0.6, 0, 0],
    cubes: [[0.36, 0.7, 0.36, 0, -0.35, 0, mid], [0.42, 0.14, 0.5, 0, -0.72, -0.08, dark], [0.08, 0.08, 0.14, 0.12, -0.74, -0.38, bone], [0.08, 0.08, 0.14, -0.12, -0.74, -0.38, bone]],
  });
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [1.6, 1.15, 2.9, 0, 0, 0, dark],
        [1.3, 0.28, 2.5, 0, -0.62, 0, belly],
      ],
    },
    // Pointes du dos lumineuses : on voit le dragon passer dans la nuit.
    { name: 'spikes', parent: 'body', pivot: [0, 0, 0], glow: true, cubes: [-1.1, -0.35, 0.4, 1.1].map((z): Cube => [0.26, 0.42, 0.34, 0, 0.75, z, spike]) },
    { name: 'neck', parent: 'body', pivot: [0, 0.3, -1.4], rest: [-0.35, 0, 0], cubes: [[0.85, 0.85, 1.4, 0, 0.1, -0.6, dark], [0.6, 0.2, 1.2, 0, -0.35, -0.6, belly], [0.22, 0.34, 0.3, 0, 0.6, -0.6, spike]] },
    {
      name: 'head',
      parent: 'neck',
      pivot: [0, 0.2, -1.3],
      rest: [0.35, 0, 0],
      cubes: [
        [1.05, 0.8, 1.0, 0, 0.1, -0.4, dark],
        [0.75, 0.48, 0.85, 0, -0.04, -1.25, mid],
        [0.12, 0.08, 0.04, -0.2, 0.12, -1.69, 0x110d18],
        [0.12, 0.08, 0.04, 0.2, 0.12, -1.69, 0x110d18],
        [0.14, 0.55, 0.14, -0.33, 0.68, 0.0, bone],
        [0.14, 0.55, 0.14, 0.33, 0.68, 0.0, bone],
        [0.1, 0.3, 0.1, -0.33, 0.95, 0.12, bone],
        [0.1, 0.3, 0.1, 0.33, 0.95, 0.12, bone],
      ],
    },
    { name: 'jaw', parent: 'head', pivot: [0, -0.3, -0.7], cubes: [[0.68, 0.18, 0.82, 0, -0.06, -0.5, mid], [0.06, 0.1, 0.06, -0.24, 0.07, -0.82, bone], [0.06, 0.1, 0.06, 0.24, 0.07, -0.82, bone]] },
    { name: 'eyes', parent: 'head', pivot: [0, 0, 0], glow: true, cubes: [[0.22, 0.12, 0.05, -0.33, 0.28, -0.92, 0xe08bff], [0.22, 0.12, 0.05, 0.33, 0.28, -0.92, 0xe08bff]] },
    ...wing(-1),
    ...wing(1),
    { name: 'tail1', parent: 'body', pivot: [0, 0, 1.45], cubes: [[0.75, 0.62, 1.7, 0, 0, 0.85, dark], [0.2, 0.3, 0.3, 0, 0.42, 0.85, spike]] },
    { name: 'tail2', parent: 'tail1', pivot: [0, 0, 1.7], cubes: [[0.48, 0.42, 1.7, 0, 0, 0.85, dark], [0.7, 0.1, 0.55, 0, 0, 1.75, spike]] },
    leg('legFL', -0.55, -0.9),
    leg('legFR', 0.55, -0.9),
    leg('legBL', -0.6, 0.9),
    leg('legBR', 0.6, 0.9),
  ];
}

// ---------- Pierre-Étoile, éclats et œufs ----------

/** Cristal en étoile, lumineux. Origine à sa base. */
export function starStoneModel(): ModelDef {
  const core = 0xfff3a0;
  const edge = 0xffd24a;
  return [
    {
      name: 'body',
      pivot: [0, 0.75, 0],
      glow: true,
      cubes: [
        [0.3, 0.3, 0.3, 0, -0.6, 0, edge],
        [0.55, 0.45, 0.55, 0, -0.25, 0, edge],
        [0.75, 0.5, 0.75, 0, 0.1, 0, core],
        [0.55, 0.45, 0.55, 0, 0.45, 0, edge],
        [0.3, 0.3, 0.3, 0, 0.75, 0, core],
        [1.0, 0.16, 0.16, 0, 0.1, 0, core],
        [0.16, 0.16, 1.0, 0, 0.1, 0, core],
      ],
    },
  ];
}

export function starShardModel(): ModelDef {
  return [{ name: 'body', pivot: [0, 0, 0], glow: true, cubes: [[0.3, 0.42, 0.3, 0, 0, 0, 0xfff3a0], [0.18, 0.18, 0.18, 0.12, 0.18, 0.08, 0xffd24a]] }];
}

/** Œuf de golem : coquille crème tachetée de la couleur du golem. Origine à sa base. */
function eggModel(spot: number): ModelDef {
  const shell = 0xf6efdc;
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.46, 0.14, 0.46, 0, 0.07, 0, shell],
        [0.62, 0.4, 0.62, 0, 0.34, 0, shell],
        [0.52, 0.24, 0.52, 0, 0.66, 0, shell],
        [0.32, 0.12, 0.32, 0, 0.84, 0, shell],
        [0.14, 0.14, 0.02, -0.12, 0.42, -0.315, spot],
        [0.1, 0.1, 0.02, 0.16, 0.6, -0.265, spot],
        [0.02, 0.12, 0.12, 0.315, 0.3, 0.1, spot],
        [0.02, 0.1, 0.1, -0.265, 0.62, -0.05, spot],
        [0.12, 0.02, 0.12, 0.05, 0.905, 0.02, spot],
      ],
    },
  ];
}

// ---------- Maison du joueur ----------

/** Lit d'une place : tête (oreiller) vers +Z. Origine au centre, au sol. */
function bedModel(): ModelDef {
  const wood = 0x8a5a32;
  const dark = 0x5a3a20;
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [1.1, 0.35, 2.0, 0, 0.3, 0, wood],
        ...[-0.48, 0.48].flatMap((x): Cube[] => [[0.12, 0.15, 0.12, x, 0.07, -0.92, dark], [0.12, 0.15, 0.12, x, 0.07, 0.92, dark]]),
        [1.14, 0.9, 0.12, 0, 0.45, 0.98, wood],
        [0.9, 0.08, 0.06, 0, 0.82, 1.02, 0xf0c43c],
        [1.14, 0.55, 0.12, 0, 0.3, -0.98, wood],
        [1.0, 0.16, 1.85, 0, 0.55, 0, 0xf4f0e6],
        [0.7, 0.14, 0.45, 0, 0.68, 0.62, 0xffffff],
        // Couverture violette brodée d'étoiles dorées.
        [1.04, 0.1, 1.25, 0, 0.66, -0.32, 0x7b2d8b],
        [0.12, 0.02, 0.12, -0.25, 0.72, -0.5, 0xf0c43c],
        [0.12, 0.02, 0.12, 0.22, 0.72, -0.15, 0xf0c43c],
        [0.12, 0.02, 0.12, 0.05, 0.72, -0.75, 0xf0c43c],
      ],
    },
  ];
}

/** Places des trophés sur l'étagère (repère de l'étagère) : 3 en bas, 2 en haut. */
export const SHELF_SLOTS: [number, number, number][] = [
  [-0.62, 0.86, -0.02],
  [0, 0.86, -0.02],
  [0.62, 0.86, -0.02],
  [-0.32, 1.56, -0.02],
  [0.32, 1.56, -0.02],
];

/** Étagère à trophées : façade vers -Z. Origine au centre, au sol. */
function trophyShelfModel(): ModelDef {
  const wood = 0xa8703c;
  const dark = 0x6a4424;
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.12, 2.2, 0.42, -0.98, 1.1, 0, dark],
        [0.12, 2.2, 0.42, 0.98, 1.1, 0, dark],
        [2.08, 0.1, 0.44, 0, 2.2, 0, dark],
        [1.84, 2.1, 0.04, 0, 1.1, 0.19, wood],
        ...[0.1, 0.8, 1.5].map((y): Cube => [1.84, 0.08, 0.4, 0, y, 0, wood]),
        [0.9, 0.16, 0.04, 0, 2.05, -0.22, 0xf0c43c],
      ],
    },
  ];
}

/** Trophée du Roi Slime : statuette dorée sur socle. */
function trophyRoiSlimeModel(): ModelDef {
  const gold = 0xf0c43c;
  const light = 0xffe27a;
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.4, 0.08, 0.32, 0, 0.04, 0, 0x6a4424],
        [0.32, 0.26, 0.28, 0, 0.21, 0, gold],
        [0.2, 0.04, 0.2, 0, 0.36, 0, light],
        ...[-0.09, 0, 0.09].map((x): Cube => [0.05, 0.08, 0.05, x, 0.42, 0, light]),
        [0.05, 0.06, 0.02, -0.07, 0.25, -0.145, 0x6a4424],
        [0.05, 0.06, 0.02, 0.07, 0.25, -0.145, 0x6a4424],
      ],
    },
  ];
}

/**
 * Rivet, le golem de maison : petit, rond, couleur cuivre avec des taches de vert-de-gris,
 * un tuyau de poêle sur la tête et un balai. Il ne combat pas.
 */
function houseGolemModel(): ModelDef {
  const copper = 0xc8743c;
  const dark = 0x8a4a24;
  const patina = 0x6fb8a0;
  return [
    { name: 'legL', pivot: [-0.14, 0.28, 0], cubes: [[0.18, 0.28, 0.2, 0, -0.14, 0, dark]] },
    { name: 'legR', pivot: [0.14, 0.28, 0], cubes: [[0.18, 0.28, 0.2, 0, -0.14, 0, dark]] },
    {
      name: 'body',
      pivot: [0, 0.28, 0],
      cubes: [
        [0.62, 0.5, 0.5, 0, 0.25, 0, copper],
        [0.5, 0.42, 0.46, 0, 0.7, -0.02, copper],
        [0.16, 0.1, 0.02, 0.12, 0.4, -0.26, patina],
        [0.1, 0.12, 0.02, -0.18, 0.15, -0.26, patina],
        [0.02, 0.12, 0.14, 0.32, 0.3, 0.05, patina],
        // Rivets dorés.
        ...[-0.22, 0.22].map((x): Cube => [0.05, 0.05, 0.02, x, 0.42, -0.26, 0xf0c43c]),
        // Grands yeux ronds et lumineux.
        [0.12, 0.12, 0.02, -0.11, 0.74, -0.255, 0xfff3c0],
        [0.12, 0.12, 0.02, 0.11, 0.74, -0.255, 0xfff3c0],
        [0.05, 0.05, 0.02, -0.1, 0.73, -0.265, EYE_DARK],
        [0.05, 0.05, 0.02, 0.12, 0.73, -0.265, EYE_DARK],
        // Tuyau de poêle sur la tête.
        [0.14, 0.26, 0.14, 0.08, 1.03, 0, 0x5a5a66],
        [0.18, 0.04, 0.18, 0.08, 1.17, 0, 0x3a3a44],
      ],
    },
    { name: 'armL', pivot: [-0.37, 0.75, 0], cubes: [[0.12, 0.38, 0.14, 0, -0.17, 0, copper], [0.14, 0.1, 0.16, 0, -0.38, 0, dark]] },
    {
      name: 'armR',
      pivot: [0.37, 0.75, 0],
      rest: [-0.5, 0, 0],
      cubes: [
        [0.12, 0.38, 0.14, 0, -0.17, 0, copper],
        [0.14, 0.12, 0.2, 0, -0.38, -0.03, dark],
        // Balai tenu dans la pince.
        [0.05, 0.9, 0.05, 0, -0.5, -0.1, 0x8a5a32],
        [0.24, 0.2, 0.08, 0, -1.0, -0.1, 0xe8cf7a],
      ],
    },
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
  rivet: { skin: 0xc8743c, hair: 0x8a4a24, hat: 0x5a5a66, eye: 0xfff3c0 },
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
  dragon: dragonModel(),
  starStone: starStoneModel(),
  starShard: starShardModel(),
  eggPierre: eggModel(0x8d8f9c),
  eggMousse: eggModel(0x5aa04a),
  villagerFarmer: villagerModel(VILLAGER_LOOKS.farmer),
  villagerBaker: villagerModel(VILLAGER_LOOKS.baker),
  villagerGrandpa: villagerModel(VILLAGER_LOOKS.grandpa),
  villagerGirl: villagerModel(VILLAGER_LOOKS.girl),
  villagerFisher: villagerModel(VILLAGER_LOOKS.fisher),
  apprenticeRed: villagerModel(VILLAGER_LOOKS.apprenticeRed),
  apprenticeGreen: villagerModel(VILLAGER_LOOKS.apprenticeGreen),
  apprenticeTeal: villagerModel(VILLAGER_LOOKS.apprenticeTeal),
  bed: bedModel(),
  trophyShelf: trophyShelfModel(),
  trophyRoiSlime: trophyRoiSlimeModel(),
  rivet: houseGolemModel(),
} as const satisfies Record<string, ModelDef>;
export type ModelId = keyof typeof MODELS;
