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
