import type { Cube, ModelDef } from './cubeModel';

/**
 * Modèles en cubes des Pics de Givre (chapitre 4) : golems Glace et Cristal, monstres de la phase 4,
 * Sorcière du Blizzard, objets de quête (bûche, poisson, cloches, braseros) et mécanismes du
 * sanctuaire gelé (dalles de mémoire, roues dentées, manivelle, moulin). Tous originaux.
 */

/** Glace : golem de glace bleu pâle, translucide aux bords, avec des pointes de givre sur le dos. */
export function glaceModel(): ModelDef {
  const ice = 0x9fd8ff;
  const deep = 0x5aa8e0;
  const frost = 0xe8f6ff;
  return [
    { name: 'legL', pivot: [-0.22, 0.45, 0], cubes: [[0.3, 0.45, 0.34, 0, -0.22, 0, deep]] },
    { name: 'legR', pivot: [0.22, 0.45, 0], cubes: [[0.3, 0.45, 0.34, 0, -0.22, 0, deep]] },
    {
      name: 'body',
      pivot: [0, 0.45, 0],
      cubes: [
        [0.88, 0.78, 0.6, 0, 0.4, 0, ice],
        [0.6, 0.5, 0.54, 0, 1.04, -0.02, frost],
        [0.12, 0.1, 0.02, -0.13, 1.08, -0.3, 0x1e4a8a],
        [0.12, 0.1, 0.02, 0.13, 1.08, -0.3, 0x1e4a8a],
        // Pointes de givre sur le dos et la tête.
        ...[-0.25, 0, 0.25].map((x, i): Cube => [0.12, 0.26 + (i % 2) * 0.1, 0.12, x, 0.7 + (i % 2) * 0.05, 0.34, frost]),
        [0.1, 0.2, 0.1, -0.14, 1.38, 0, frost],
        [0.1, 0.28, 0.1, 0.12, 1.42, 0, frost],
      ],
    },
    { name: 'armL', pivot: [-0.56, 1.0, 0], cubes: [[0.24, 0.78, 0.28, 0, -0.37, 0, ice], [0.32, 0.18, 0.34, 0, -0.78, 0, deep]] },
    { name: 'armR', pivot: [0.56, 1.0, 0], cubes: [[0.24, 0.78, 0.28, 0, -0.37, 0, ice], [0.32, 0.18, 0.34, 0, -0.78, 0, deep]] },
  ];
}

/** Cristal : golem de quartz violet à facettes, avec une grande gemme sur la poitrine. */
export function cristalModel(): ModelDef {
  const quartz = 0xb48aff;
  const dark = 0x7a52c8;
  const shine = 0xe8d8ff;
  return [
    { name: 'legL', pivot: [-0.2, 0.45, 0], cubes: [[0.26, 0.45, 0.3, 0, -0.22, 0, dark]] },
    { name: 'legR', pivot: [0.2, 0.45, 0], cubes: [[0.26, 0.45, 0.3, 0, -0.22, 0, dark]] },
    {
      name: 'body',
      pivot: [0, 0.45, 0],
      cubes: [
        [0.76, 0.76, 0.56, 0, 0.4, 0, quartz],
        [0.3, 0.3, 0.04, 0, 0.5, -0.29, shine],
        [0.16, 0.16, 0.04, 0, 0.5, -0.31, 0xff7ad0],
        [0.56, 0.5, 0.5, 0, 1.02, -0.02, quartz],
        [0.14, 0.08, 0.02, -0.12, 1.06, -0.27, 0xffffff],
        [0.14, 0.08, 0.02, 0.12, 1.06, -0.27, 0xffffff],
        // Une couronne de prismes.
        [0.12, 0.34, 0.12, 0, 1.44, 0, shine],
        [0.1, 0.24, 0.1, -0.18, 1.38, 0.04, quartz],
        [0.1, 0.24, 0.1, 0.18, 1.38, 0.04, quartz],
        [0.14, 0.3, 0.14, -0.4, 0.9, 0.1, shine],
        [0.14, 0.3, 0.14, 0.4, 0.9, 0.1, shine],
      ],
    },
    { name: 'armL', pivot: [-0.5, 0.98, 0], cubes: [[0.22, 0.74, 0.26, 0, -0.35, 0, quartz], [0.28, 0.16, 0.3, 0, -0.74, 0, dark]] },
    { name: 'armR', pivot: [0.5, 0.98, 0], cubes: [[0.22, 0.74, 0.26, 0, -0.35, 0, quartz], [0.28, 0.16, 0.3, 0, -0.74, 0, dark]] },
  ];
}

/** Yéti : grand et blanc, fourrure en cubes, visage bleu et petites cornes. */
export function yetiModel(): ModelDef {
  const fur = 0xf4f4f4;
  const shade = 0xd8dce4;
  const face = 0x8ab0d8;
  return [
    { name: 'legL', pivot: [-0.26, 0.6, 0], cubes: [[0.36, 0.6, 0.4, 0, -0.3, 0, shade]] },
    { name: 'legR', pivot: [0.26, 0.6, 0], cubes: [[0.36, 0.6, 0.4, 0, -0.3, 0, shade]] },
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [1.0, 0.9, 0.7, 0, 1.05, 0, fur],
        ...[-0.3, 0, 0.3].map((x): Cube => [0.2, 0.12, 0.2, x, 1.52, 0.1, shade]),
        [0.66, 0.56, 0.6, 0, 1.78, -0.05, fur],
        [0.44, 0.3, 0.04, 0, 1.74, -0.36, face],
        [0.08, 0.08, 0.02, -0.1, 1.8, -0.39, 0x202020],
        [0.08, 0.08, 0.02, 0.1, 1.8, -0.39, 0x202020],
        [0.2, 0.04, 0.02, 0, 1.66, -0.39, 0x202020],
        [0.08, 0.16, 0.08, -0.26, 2.12, 0, 0xc8b88a],
        [0.08, 0.16, 0.08, 0.26, 2.12, 0, 0xc8b88a],
      ],
    },
    { name: 'armL', pivot: [-0.62, 1.4, 0], cubes: [[0.28, 0.9, 0.32, 0, -0.42, 0, fur], [0.32, 0.18, 0.34, 0, -0.9, 0, face]] },
    { name: 'armR', pivot: [0.62, 1.4, 0], cubes: [[0.28, 0.9, 0.32, 0, -0.42, 0, fur], [0.32, 0.18, 0.34, 0, -0.9, 0, face]] },
  ];
}

/** Chauve-souris de glace : bleu pâle, ailes translucides, elle vole en battant des ailes. */
export function iceBatModel(): ModelDef {
  const body = 0x9fd8ff;
  const wing = 0xd8f0ff;
  return [
    {
      name: 'body',
      pivot: [0, 0.6, 0],
      cubes: [
        [0.34, 0.34, 0.34, 0, 0.5, 0, body],
        [0.08, 0.14, 0.06, -0.1, 0.72, 0, body],
        [0.08, 0.14, 0.06, 0.1, 0.72, 0, body],
        [0.06, 0.06, 0.02, -0.07, 0.55, -0.18, 0xff5a8a],
        [0.06, 0.06, 0.02, 0.07, 0.55, -0.18, 0xff5a8a],
        [0.04, 0.06, 0.02, -0.04, 0.42, -0.18, 0xffffff],
        [0.04, 0.06, 0.02, 0.04, 0.42, -0.18, 0xffffff],
      ],
    },
    { name: 'wingL', pivot: [-0.16, 1.15, 0], cubes: [[0.6, 0.04, 0.36, -0.3, 0, 0, wing], [0.2, 0.04, 0.2, -0.62, 0, 0.06, wing]] },
    { name: 'wingR', pivot: [0.16, 1.15, 0], cubes: [[0.6, 0.04, 0.36, 0.3, 0, 0, wing], [0.2, 0.04, 0.2, 0.62, 0, 0.06, wing]] },
  ];
}

/** Fantôme gelé : drap blanc translucide qui flotte, yeux bleus, bas en franges. */
export function frostGhostModel(): ModelDef {
  const sheet = 0xe8f4ff;
  return [
    {
      name: 'body',
      pivot: [0, 0.4, 0],
      cubes: [
        [0.66, 0.8, 0.56, 0, 0.6, 0, sheet],
        [0.5, 0.3, 0.46, 0, 1.12, 0, sheet],
        ...[-0.24, 0, 0.24].map((x): Cube => [0.16, 0.18, 0.5, x, 0.12, 0, sheet]),
        [0.12, 0.14, 0.02, -0.12, 0.92, -0.29, 0x4a8ae0],
        [0.12, 0.14, 0.02, 0.12, 0.92, -0.29, 0x4a8ae0],
        [0.14, 0.1, 0.02, 0, 0.72, -0.29, 0x8ab0d8],
      ],
    },
    { name: 'armL', pivot: [-0.36, 0.95, 0], rest: [-1.1, 0, 0], cubes: [[0.14, 0.42, 0.16, 0, -0.18, 0, sheet]] },
    { name: 'armR', pivot: [0.36, 0.95, 0], rest: [-1.1, 0, 0], cubes: [[0.14, 0.42, 0.16, 0, -0.18, 0, sheet]] },
  ];
}

/** Sorcière du Blizzard : grande cape bleu glacier, chapeau pointu, bâton surmonté d'un flocon. */
export function sorciereModel(): ModelDef {
  const cape = 0x3a6aa8;
  const light = 0x7ec8f0;
  const skin = 0xd8e8f4;
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [1.1, 1.4, 0.8, 0, 0.7, 0, cape],
        [1.2, 0.12, 0.9, 0, 0.06, 0, light],
        [0.8, 0.7, 0.6, 0, 1.75, 0, cape],
        [0.56, 0.52, 0.5, 0, 2.36, -0.04, skin],
        [0.14, 0.1, 0.02, -0.13, 2.4, -0.3, 0x2a5ae0],
        [0.14, 0.1, 0.02, 0.13, 2.4, -0.3, 0x2a5ae0],
        [0.6, 0.5, 0.06, 0, 2.2, 0.25, 0xf4f4f4],
        // Chapeau pointu à large bord.
        [0.9, 0.08, 0.9, 0, 2.66, 0, cape],
        [0.5, 0.36, 0.5, 0, 2.88, 0, cape],
        [0.3, 0.3, 0.3, 0.04, 3.18, 0.04, cape],
        [0.14, 0.24, 0.14, 0.08, 3.42, 0.08, light],
      ],
    },
    { name: 'armL', pivot: [-0.55, 2.0, 0], cubes: [[0.24, 0.8, 0.26, 0, -0.38, 0, cape], [0.18, 0.16, 0.2, 0, -0.82, 0, skin]] },
    {
      name: 'armR',
      pivot: [0.55, 2.0, 0],
      rest: [-0.6, 0, 0],
      cubes: [
        [0.24, 0.8, 0.26, 0, -0.38, 0, cape],
        [0.18, 0.16, 0.2, 0, -0.82, 0, skin],
        // Bâton et son flocon lumineux.
        [0.08, 1.6, 0.08, 0, -0.4, -0.12, 0xe8e2d0],
        [0.4, 0.08, 0.08, 0, 0.42, -0.12, light],
        [0.08, 0.4, 0.08, 0, 0.42, -0.12, light],
        [0.12, 0.12, 0.12, 0, 0.42, -0.12, 0xffffff],
      ],
    },
  ];
}

/** Bûche (quête R1) : un rondin à l'écorce brune. */
export function logModel(): ModelDef {
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.7, 0.26, 0.26, 0, 0.13, 0, 0x7a5232],
        [0.04, 0.22, 0.22, -0.36, 0.13, 0, 0xd8b07a],
        [0.04, 0.22, 0.22, 0.36, 0.13, 0, 0xd8b07a],
        [0.7, 0.06, 0.28, 0, 0.27, 0, 0xf4f8ff],
      ],
    },
  ];
}

/** Poisson du lac gelé (quête O1). */
export function fishModel(): ModelDef {
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.16, 0.24, 0.5, 0, 0.2, 0, 0x6aa8d8],
        [0.04, 0.2, 0.16, 0, 0.2, 0.32, 0x4a88b8],
        [0.06, 0.06, 0.02, -0.08, 0.24, -0.18, 0x202020],
        [0.06, 0.06, 0.02, 0.08, 0.24, -0.18, 0x202020],
      ],
    },
  ];
}

/** Trou de pêche dans la glace (quête O1). */
export function fishingHoleModel(): ModelDef {
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.9, 0.04, 0.9, 0, 0.02, 0, 0x2a5a8a],
        [1.0, 0.06, 0.12, 0, 0.03, -0.5, 0xe8f6ff],
        [1.0, 0.06, 0.12, 0, 0.03, 0.5, 0xe8f6ff],
        [0.12, 0.06, 1.0, -0.5, 0.03, 0, 0xe8f6ff],
        [0.12, 0.06, 1.0, 0.5, 0.03, 0, 0xe8f6ff],
      ],
    },
  ];
}

/** Cloche de glace (quête O2) : trois tailles. */
export function bellModel(size: number): ModelDef {
  const c = 0xbfe8ff;
  const w = 0.3 + size * 0.15;
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.08, 1.4 + size * 0.2, 0.08, -0.5, 0.7 + size * 0.1, 0, 0x7a5232],
        [0.08, 1.4 + size * 0.2, 0.08, 0.5, 0.7 + size * 0.1, 0, 0x7a5232],
        [1.08, 0.08, 0.08, 0, 1.4 + size * 0.2, 0, 0x7a5232],
      ],
    },
    {
      name: 'bell',
      pivot: [0, 1.36 + size * 0.2, 0],
      cubes: [
        [w * 0.6, w * 0.4, w * 0.6, 0, -w * 0.2, 0, c],
        [w, w * 0.5, w, 0, -w * 0.6, 0, c],
        [0.08, 0.1, 0.08, 0, -w * 0.9, 0, 0xf0c43c],
      ],
    },
  ];
}

/** Brasero du sentier (quête P4) : coupe de pierre sur un pied ; la flamme s'affiche une fois allumé. */
export function brazierModel(): ModelDef {
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.3, 0.8, 0.3, 0, 0.4, 0, 0x5a5a66],
        [0.8, 0.24, 0.8, 0, 0.92, 0, 0x6a6a78],
        [0.66, 0.06, 0.66, 0, 1.05, 0, 0x2a2a30],
      ],
    },
    {
      name: 'flame',
      pivot: [0, 1.05, 0],
      glow: true,
      cubes: [
        [0.5, 0.36, 0.5, 0, 0.18, 0, 0xff8a2a],
        [0.32, 0.36, 0.32, 0.04, 0.44, 0, 0xffc040],
        [0.14, 0.24, 0.14, -0.04, 0.68, 0, 0xfff0a0],
      ],
    },
  ];
}

/** Dalle de mémoire de glace (S4) : elle s'allume quand on la touche ou qu'elle joue la séquence. */
export function memoryTileModel(color: number, lit: boolean): ModelDef {
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      glow: lit,
      cubes: [
        [0.9, 0.08, 0.9, 0, 0.04, 0, lit ? color : 0xc8dcec],
        [0.4, 0.04, 0.4, 0, 0.1, 0, lit ? 0xffffff : color],
      ],
    },
  ];
}

/** Roue dentée (moulin gelé) : grande ou petite ; elle tourne autour de Z. */
export function gearModel(big: boolean): ModelDef {
  const r = big ? 0.9 : 0.5;
  const c = big ? 0xc8a060 : 0x9a9aa8;
  const teeth: Cube[] = [];
  const n = big ? 10 : 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    teeth.push([0.16, 0.16, 0.14, Math.cos(a) * r, Math.sin(a) * r, 0, c]);
  }
  return [
    {
      name: 'wheel',
      pivot: [0, 0, 0],
      cubes: [
        [r * 1.6, r * 0.5, 0.12, 0, 0, 0, c],
        [r * 0.5, r * 1.6, 0.12, 0, 0, 0, c],
        [r * 1.2, r * 1.2, 0.12, 0, 0, 0, c],
        [0.18, 0.18, 0.18, 0, 0, 0, 0x5a3a22],
        // Un repère clair pour voir dans quel sens elle tourne.
        [0.14, 0.14, 0.16, 0, r * 0.6, -0.02, 0xff5a3a],
        ...teeth,
      ],
    },
  ];
}

/** Axe vide où l'on pose une roue (moulin gelé). */
export function gearAxleModel(): ModelDef {
  return [{ name: 'body', pivot: [0, 0, 0], cubes: [[0.2, 0.2, 0.4, 0, 0, 0.1, 0x5a3a22], [0.5, 0.06, 0.5, 0, -1.2, 0.2, 0x8a8a98]] }];
}

/** Manivelle du moulin gelé : un disque et sa poignée, qui tournent autour de Z. */
export function crankModel(): ModelDef {
  return [
    { name: 'body', pivot: [0, 0, 0], cubes: [[0.3, 1.2, 0.3, 0, -0.6, 0.2, 0x5a5a66]] },
    {
      name: 'wheel',
      pivot: [0, 0, 0],
      cubes: [
        [0.7, 0.7, 0.12, 0, 0, 0, 0x8a5a2c],
        [0.12, 0.5, 0.12, 0, 0.3, -0.1, 0x8a5a2c],
        [0.14, 0.14, 0.3, 0, 0.55, -0.2, 0xc0392b],
      ],
    },
  ];
}

/** Moulin gelé : un grand disque à ailettes et la flèche gravée du bon sens (vers la gauche en haut). */
export function frozenMillModel(): ModelDef {
  const blades: Cube[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    blades.push([i % 2 ? 0.3 : 1.6, i % 2 ? 1.6 : 0.3, 0.1, Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0, 0xd8e8f4]);
  }
  return [
    { name: 'body', pivot: [0, 0, 0], cubes: [[0.3, 1.6, 0.3, 0, -0.8, 0.2, 0x7a7a88]] },
    { name: 'wheel', pivot: [0, 0, 0], cubes: [[0.5, 0.5, 0.2, 0, 0, 0, 0x8a8a98], ...blades] },
    {
      name: 'arrow',
      pivot: [0, 0, 0],
      glow: true,
      cubes: [
        [0.7, 0.08, 0.04, 0, 1.25, -0.06, 0xffc040],
        [0.16, 0.16, 0.04, -0.4, 1.25, -0.06, 0xffc040],
        [0.08, 0.28, 0.04, -0.34, 1.25, -0.06, 0xffc040],
      ],
    },
  ];
}

/** Cœur ancestral caché : un cœur rose qui flotte au-dessus d'un socle de glace. */
export function heartItemModel(): ModelDef {
  return [
    { name: 'body', pivot: [0, 0, 0], cubes: [[0.6, 0.4, 0.6, 0, 0.2, 0, 0xbfe8ff]] },
    {
      name: 'gem',
      pivot: [0, 0.85, 0],
      glow: true,
      cubes: [
        [0.2, 0.2, 0.16, -0.1, 0.06, 0, 0xff6aa8],
        [0.2, 0.2, 0.16, 0.1, 0.06, 0, 0xff6aa8],
        [0.3, 0.16, 0.16, 0, -0.08, 0, 0xff6aa8],
        [0.14, 0.12, 0.16, 0, -0.2, 0, 0xff6aa8],
        [0.06, 0.06, 0.17, -0.1, 0.1, 0, 0xffd0e4],
      ],
    },
  ];
}

/** Trophée de la Sorcière : statuette d'un chapeau pointu sur un flocon doré. */
export function trophySorciereModel(): ModelDef {
  const gold = 0xf0c43c;
  return [
    {
      name: 'body',
      pivot: [0, 0, 0],
      cubes: [
        [0.5, 0.1, 0.5, 0, 0.05, 0, 0x8a5a2c],
        [0.5, 0.06, 0.1, 0, 0.16, 0, gold],
        [0.1, 0.06, 0.5, 0, 0.16, 0, gold],
        [0.36, 0.06, 0.36, 0, 0.22, 0, 0x3a6aa8],
        [0.2, 0.2, 0.2, 0, 0.36, 0, 0x3a6aa8],
        [0.1, 0.16, 0.1, 0.02, 0.52, 0.02, 0x7ec8f0],
      ],
    },
  ];
}
