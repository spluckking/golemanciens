import { Block } from './blocks';
import type { VoxelWorld } from './voxelWorld';

/**
 * Académie des Golémanciens : un grand bâtiment en briques claires, toit bleu en gradins,
 * une tour centrale avec un piédestal doré pour la Pierre-Étoile. Porte au sud (+Z).
 * (cx, cz) = centre, floorY = premier bloc vide au-dessus du plateau.
 */
export function buildAcademy(world: VoxelWorld, cx: number, cz: number, floorY: number): { doorX: number; doorZ: number } {
  const x0 = cx - 10;
  const x1 = cx + 10;
  const z0 = cz - 7;
  const z1 = cz + 7;
  const wallTop = floorY + 5;

  // Plancher et murs creux.
  world.fill(x0, floorY - 1, z0, x1, floorY - 1, z1, Block.Plank);
  for (let y = floorY; y <= wallTop; y++) {
    for (let x = x0; x <= x1; x++) {
      world.set(x, y, z0, Block.Brick);
      world.set(x, y, z1, Block.Brick);
    }
    for (let z = z0; z <= z1; z++) {
      world.set(x0, y, z, Block.Brick);
      world.set(x1, y, z, Block.Brick);
    }
  }
  // Fenêtres.
  for (const y of [floorY + 2, floorY + 3]) {
    for (let x = x0 + 2; x <= x1 - 2; x += 3) {
      world.set(x, y, z0, Block.Window);
      world.set(x, y, z1, Block.Window);
    }
    for (let z = z0 + 3; z <= z1 - 3; z += 3) {
      world.set(x0, y, z, Block.Window);
      world.set(x1, y, z, Block.Window);
    }
  }
  // Grande porte ouverte (3 de large, 3 de haut) avec un encadrement doré.
  for (let y = floorY; y < floorY + 3; y++) for (let x = cx - 1; x <= cx + 1; x++) world.set(x, y, z1, Block.Air);
  for (let x = cx - 2; x <= cx + 2; x++) world.set(x, floorY + 3, z1, Block.Gold);
  for (let y = floorY; y < floorY + 3; y++) {
    world.set(cx - 2, y, z1, Block.Door);
    world.set(cx + 2, y, z1, Block.Door);
  }

  // Toit en gradins.
  let level = 0;
  for (let y = wallTop + 1; ; y++, level++) {
    const ax = x0 - 1 + level;
    const bx = x1 + 1 - level;
    const az = z0 - 1 + level;
    const bz = z1 + 1 - level;
    if (ax > bx || az > bz) break;
    for (let x = ax; x <= bx; x++) {
      world.set(x, y, az, Block.Roof);
      world.set(x, y, bz, Block.Roof);
    }
    for (let z = az; z <= bz; z++) {
      world.set(ax, y, z, Block.Roof);
      world.set(bx, y, z, Block.Roof);
    }
    if (az === bz || ax === bx) {
      world.fill(ax, y, az, bx, y, bz, Block.Roof);
      break;
    }
  }

  // Tour centrale qui traverse le toit.
  const towerTop = Math.min(world.sizeY - 3, wallTop + 9);
  for (let y = wallTop + 1; y <= towerTop; y++) {
    for (let x = cx - 3; x <= cx + 3; x++)
      for (let z = cz - 3; z <= cz + 3; z++) {
        const edge = x === cx - 3 || x === cx + 3 || z === cz - 3 || z === cz + 3;
        world.set(x, y, z, edge ? Block.Brick : Block.Air);
      }
  }
  for (const [dx, dz] of [[0, -3], [0, 3], [-3, 0], [3, 0]]) {
    world.set(cx + dx, towerTop - 2, cz + dz, Block.Window);
    world.set(cx + dx, towerTop - 3, cz + dz, Block.Window);
  }
  world.fill(cx - 3, towerTop + 1, cz - 3, cx + 3, towerTop + 1, cz + 3, Block.Brick);
  // Créneaux et piédestal doré de la Pierre-Étoile.
  for (let x = cx - 3; x <= cx + 3; x += 2) {
    world.set(x, towerTop + 2, cz - 3, Block.Brick);
    world.set(x, towerTop + 2, cz + 3, Block.Brick);
  }
  for (let z = cz - 1; z <= cz + 1; z += 2) {
    world.set(cx - 3, towerTop + 2, z, Block.Brick);
    world.set(cx + 3, towerTop + 2, z, Block.Brick);
  }
  world.set(cx, towerTop + 2, cz, Block.Gold);

  return { doorX: cx, doorZ: z1 + 1 };
}

/** Arbre feuillu : tronc de 4 ou 5 blocs, houppier arrondi. */
export function buildTree(world: VoxelWorld, x: number, groundY: number, z: number, trunk: number): void {
  for (let y = 0; y < trunk; y++) world.set(x, groundY + y, z, Block.Log);
  const top = groundY + trunk;
  for (let dy = -2; dy <= 1; dy++) {
    const r = dy === 1 ? 1 : 2;
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
        const y = top + dy;
        if (world.get(x + dx, y, z + dz) === Block.Air) world.set(x + dx, y, z + dz, Block.Leaves);
      }
  }
}

/** Maison simple : murs, fenêtres, porte ouverte au sud (+Z) ou au nord (−Z), toit en gradins. */
function buildHouse(
  world: VoxelWorld,
  x0: number,
  z0: number,
  w: number,
  d: number,
  floorY: number,
  wall: number,
  roof: number,
  doorSouth: boolean,
): void {
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  const top = floorY + 3;
  world.fill(x0, floorY - 1, z0, x1, floorY - 1, z1, Block.Plank);
  for (let y = floorY; y <= top; y++) {
    for (let x = x0; x <= x1; x++)
      for (let z = z0; z <= z1; z++) {
        const edgeX = x === x0 || x === x1;
        const edgeZ = z === z0 || z === z1;
        if (!edgeX && !edgeZ) {
          world.set(x, y, z, Block.Air);
          continue;
        }
        world.set(x, y, z, edgeX && edgeZ ? Block.Log : wall);
      }
  }
  const cx = Math.floor((x0 + x1) / 2);
  for (const z of [z0, z1]) world.set(cx + 2 <= x1 - 1 ? cx + 2 : cx, floorY + 1, z, Block.Window);
  const dz = doorSouth ? z1 : z0;
  world.set(cx, floorY, dz, Block.Air);
  world.set(cx, floorY + 1, dz, Block.Air);
  for (let level = 0; ; level++) {
    const ax = x0 - 1 + level;
    const bx = x1 + 1 - level;
    if (ax > bx) break;
    world.fill(ax, top + 1 + level, z0 - 1, bx, top + 1 + level, z1 + 1, roof);
    if (level > 0) world.fill(ax + 1, top + level, z0, bx - 1, top + level, z1, Block.Air);
  }
}

interface Spot {
  x: number;
  z: number;
  facing: number;
}

/** Maison du joueur (SPEC.md § 18) : porte au nord, face à la place. */
export interface HomePlan {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Devant la porte, dehors. */
  door: { x: number; z: number };
  /** Où l'on se réveille (départ du jeu, retour après un K.O. si l'on a dormi). */
  wake: Spot;
  bed: Spot;
  shelf: Spot;
  /** Trajet du golem de maison, en boucle. */
  golemPath: [number, number][];
}

export interface VillagePlan {
  npcs: { id: string; x: number; z: number; facing: number }[];
  guardians: { x: number; z: number; facing: number }[];
  lantern: { x: number; z: number };
  wheat: { x0: number; z0: number; x1: number; z1: number };
  well: { x: number; z: number };
  pen: { x0: number; z0: number; x1: number; z1: number };
  home: HomePlan;
}

/**
 * Ferme-des-Blocs : ferme de Mère Brique, boulangerie de Pâquerette, moulin de Gaston,
 * enclos à poules, puits et champ de blé. (cx, cz) = centre de la place, floorY = sol.
 */
export function buildVillage(world: VoxelWorld, cx: number, cz: number, floorY: number): VillagePlan {
  // Place centrale en terre battue.
  for (let dx = -4; dx <= 4; dx++)
    for (let dz = -4; dz <= 4; dz++) if (dx * dx + dz * dz <= 18) world.set(cx + dx, floorY - 1, cz + dz, Block.Path);

  buildHouse(world, cx - 11, cz - 10, 7, 6, floorY, Block.Plank, Block.Roof, true);
  buildHouse(world, cx + 5, cz - 10, 6, 5, floorY, Block.Brick, Block.Roof, true);

  // Maison du joueur, au sud de la place : murs de planches, cheminée de pierre.
  // Intérieur de 7 × 5 : lit contre le mur ouest, étagère à trophées contre le mur est.
  const hx0 = cx - 4;
  const hz0 = cz + 7;
  const home: HomePlan = {
    x0: hx0,
    z0: hz0,
    x1: hx0 + 8,
    z1: hz0 + 6,
    door: { x: cx + 0.5, z: hz0 - 0.5 },
    wake: { x: cx + 0.5, z: hz0 + 2.6, facing: 0 },
    bed: { x: hx0 + 1.9, z: hz0 + 4.1, facing: 0 },
    shelf: { x: hx0 + 7.78, z: hz0 + 3.5, facing: Math.PI / 2 },
    golemPath: [
      [cx + 1.5, hz0 + 2.5],
      [cx + 2.5, hz0 + 4.6],
      [cx - 0.5, hz0 + 5],
      [cx - 0.8, hz0 + 3],
    ],
  };
  buildHouse(world, home.x0, home.z0, 9, 7, floorY, Block.Plank, Block.Roof, false);
  world.fill(home.x1 - 1, floorY + 4, home.z1 - 1, home.x1 - 1, floorY + 9, home.z1 - 1, Block.Stone);
  world.set(home.x0, floorY + 1, home.z0 + 2, Block.Window);
  world.set(home.x0, floorY + 1, home.z0 + 4, Block.Window);
  world.set(home.x1, floorY + 1, home.z0 + 2, Block.Window);

  // Moulin : tour de pierre et ailes de planches (face nord).
  const mx = cx + 7;
  const mz = cz + 5;
  world.fill(mx, floorY, mz, mx + 3, floorY + 6, mz + 3, Block.Stone);
  world.fill(mx + 1, floorY, mz, mx + 2, floorY + 1, mz, Block.Air);
  world.fill(mx, floorY + 7, mz, mx + 3, floorY + 7, mz + 3, Block.Roof);
  const hubX = mx + 1;
  const hubY = floorY + 5;
  for (let k = -3; k <= 3; k++) {
    world.set(hubX + k, hubY, mz - 1, Block.Plank);
    world.set(hubX, hubY + k, mz - 1, Block.Plank);
  }
  world.set(hubX, hubY, mz - 1, Block.Log);

  // Enclos à poules : barrière basse, ouverture vers la place.
  const pen = { x0: cx - 12, z0: cz + 4, x1: cx - 5, z1: cz + 10 };
  for (let x = pen.x0; x <= pen.x1; x++) {
    world.set(x, floorY, pen.z0, Block.Log);
    world.set(x, floorY, pen.z1, Block.Log);
  }
  for (let z = pen.z0; z <= pen.z1; z++) {
    world.set(pen.x0, floorY, z, Block.Log);
    world.set(pen.x1, floorY, z, Block.Log);
  }
  world.set(pen.x1, floorY, pen.z0 + 3, Block.Air);

  // Puits : l'eau affleure le haut de la margelle, on en ressort d'un pas (pas de trou piège).
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++) world.set(cx + dx, floorY, cz + dz, dx === 0 && dz === 0 ? Block.Water : Block.Stone);
  world.set(cx, floorY - 1, cz, Block.Stone);

  // Champ de blé (terre labourée, épis en décor).
  const wheat = { x0: cx - 20, z0: cz - 6, x1: cx - 14, z1: cz + 4 };
  for (let x = wheat.x0; x <= wheat.x1; x++)
    for (let z = wheat.z0; z <= wheat.z1; z++) {
      const top = world.surfaceY(x, z) - 1;
      if (world.get(x, top, z) === Block.Grass || world.get(x, top, z) === Block.Path) world.set(x, top, z, Block.Dirt);
    }

  return {
    npcs: [
      { id: 'mereBrique', x: cx - 7.5, z: cz - 2.5, facing: Math.PI },
      { id: 'paquerette', x: cx + 7.5, z: cz - 3.5, facing: Math.PI },
      { id: 'gaston', x: cx + 8.5, z: cz + 2.8, facing: 0 },
    ],
    guardians: [
      { x: cx + 13.5, z: cz - 2.5, facing: -Math.PI / 2 },
      { x: cx - 6.5, z: cz + 15.5, facing: Math.PI },
    ],
    lantern: { x: cx + 3.5, z: cz + 3.5 },
    wheat,
    well: { x: cx + 0.5, z: cz + 0.5 },
    pen,
    home,
  };
}

/** Une case de bloc (porte de lianes, porte du temple) que la quête peut ouvrir. */
export interface Cell {
  x: number;
  y: number;
  z: number;
}

export interface SanctuaryPlan {
  /** Pierre-énigme, devant la porte de lianes. */
  stone: { x: number; z: number };
  /** Porte de lianes de la cour (ouverte par la pierre-énigme). */
  gate: Cell[];
  /** Dalles fleuries (une case chacune), dans le désordre. */
  tiles: { color: 'red' | 'yellow' | 'blue' | 'white' | 'violet'; x: number; z: number }[];
  /** Fresque au-dessus de la porte du temple, tournée vers la cour. */
  fresco: { x: number; y: number; z: number; facing: number };
  /** Porte du temple (ouverte par les dalles). */
  door: Cell[];
  /** Nid de mousse où repose l'œuf. */
  nest: { x: number; z: number };
  floorY: number;
}

/**
 * Sanctuaire des Fleurs (CONTENU.md, S1) : une cour fermée par une haie, avec une porte de lianes
 * gardée par la pierre-énigme ; 5 dalles fleuries dans la cour ; un petit temple de pierre
 * dont la porte s'ouvre quand les dalles sont réussies, et l'œuf sur son nid de mousse.
 * On arrive par l'ouest (le pont). (cx, cz) = centre du temple.
 */
export function buildSanctuary(world: VoxelWorld, cx: number, cz: number, floorY: number): SanctuaryPlan {
  const cx0 = cx - 7;
  const cx1 = cx + 1;
  const cz0 = cz - 4;
  const cz1 = cz + 4;

  // Cour : sol de terre battue, haie de 2 blocs (on ne peut pas l'enjamber).
  for (let x = cx0; x <= cx1 + 1; x++)
    for (let z = cz0; z <= cz1; z++) {
      world.set(x, floorY - 1, z, Block.Path);
      for (let y = floorY; y < floorY + 6; y++) world.set(x, y, z, Block.Air);
    }
  for (let y = floorY; y <= floorY + 1; y++) {
    for (let x = cx0; x <= cx1; x++) {
      world.set(x, y, cz0, Block.Leaves);
      world.set(x, y, cz1, Block.Leaves);
    }
    for (let z = cz0; z <= cz1; z++) world.set(cx0, y, z, Block.Leaves);
  }
  const gate: Cell[] = [];
  for (let z = cz - 1; z <= cz + 1; z++) for (let y = floorY; y <= floorY + 1; y++) gate.push({ x: cx0, y, z });

  // Temple : murs de pierre, toit en gradins, porte au milieu du mur ouest.
  const tx0 = cx + 2;
  const tx1 = cx + 8;
  world.fill(tx0, floorY - 1, cz0, tx1, floorY - 1, cz1, Block.Stone);
  const top = floorY + 4;
  for (let y = floorY; y <= top; y++)
    for (let x = tx0; x <= tx1; x++)
      for (let z = cz0; z <= cz1; z++) {
        const edge = x === tx0 || x === tx1 || z === cz0 || z === cz1;
        world.set(x, y, z, edge ? Block.Stone : Block.Air);
      }
  for (let level = 0; ; level++) {
    const az = cz0 - 1 + level;
    const bz = cz1 + 1 - level;
    if (az > bz) break;
    world.fill(tx0 - 1, top + 1 + level, az, tx1 + 1, top + 1 + level, bz, Block.Roof);
    if (level > 0) world.fill(tx0, top + level, az + 1, tx1, top + level, bz - 1, Block.Air);
  }
  for (const z of [cz - 3, cz + 3]) world.set(tx0, floorY + 2, z, Block.Window);
  const door: Cell[] = [];
  for (let z = cz - 1; z <= cz + 1; z++)
    for (let y = floorY; y <= floorY + 2; y++) {
      world.set(tx0, y, z, Block.Door);
      door.push({ x: tx0, y, z });
    }
  // Linteau doré au-dessus de la porte.
  for (let z = cz - 2; z <= cz + 2; z++) world.set(tx0, floorY + 3, z, Block.Gold);
  // Nid de mousse au fond du temple.
  world.fill(cx + 5, floorY - 1, cz - 1, cx + 7, floorY - 1, cz + 1, Block.Grass);

  // Haie et portes posées : on ferme le passage de lianes.
  for (const c of gate) world.set(c.x, c.y, c.z, Block.Leaves);

  return {
    stone: { x: cx0 - 1.5, z: cz + 0.5 },
    gate,
    tiles: [
      { color: 'yellow', x: cx - 5, z: cz + 1 },
      { color: 'white', x: cx - 4, z: cz - 2 },
      { color: 'violet', x: cx - 3, z: cz },
      { color: 'blue', x: cx - 1, z: cz - 2 },
      { color: 'red', x: cx - 2, z: cz + 2 },
    ],
    fresco: { x: tx0 - 0.12, y: floorY + 4.2, z: cz + 0.5, facing: Math.PI / 2 },
    door,
    nest: { x: cx + 6.5, z: cz + 0.5 },
    floorY,
  };
}
