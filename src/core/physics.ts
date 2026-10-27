/** Collisions boîte englobante contre voxels, sans dépendance au rendu. */
export type SolidFn = (x: number, y: number, z: number) => boolean;

export interface Body {
  /** Position des pieds, au centre de la boîte. */
  x: number;
  y: number;
  z: number;
  vy: number;
  onGround: boolean;
}

export interface BodyShape {
  halfWidth: number;
  height: number;
  /** Monte automatiquement une marche d'un bloc quand on est au sol. */
  autoStep: boolean;
}

const EPS = 1e-4;

export function collides(solid: SolidFn, x: number, y: number, z: number, shape: BodyShape): boolean {
  const x0 = Math.floor(x - shape.halfWidth + EPS);
  const x1 = Math.floor(x + shape.halfWidth - EPS);
  const y0 = Math.floor(y + EPS);
  const y1 = Math.floor(y + shape.height - EPS);
  const z0 = Math.floor(z - shape.halfWidth + EPS);
  const z1 = Math.floor(z + shape.halfWidth - EPS);
  for (let yy = y0; yy <= y1; yy++)
    for (let zz = z0; zz <= z1; zz++)
      for (let xx = x0; xx <= x1; xx++) if (solid(xx, yy, zz)) return true;
  return false;
}

/** Déplace le corps axe par axe (Y, puis X, puis Z), en petits pas pour ne rien traverser. */
export function moveBody(solid: SolidFn, body: Body, dx: number, dy: number, dz: number, shape: BodyShape): void {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / 0.25));
  body.onGround = false;
  for (let i = 0; i < steps; i++) {
    moveY(solid, body, dy / steps, shape);
    moveHorizontal(solid, body, 'x', dx / steps, shape);
    moveHorizontal(solid, body, 'z', dz / steps, shape);
  }
  if (!body.onGround && body.vy <= 0 && collides(solid, body.x, body.y - 0.02, body.z, shape)) {
    body.onGround = true;
  }
}

function moveY(solid: SolidFn, body: Body, dy: number, shape: BodyShape): void {
  if (dy === 0) return;
  const ny = body.y + dy;
  if (!collides(solid, body.x, ny, body.z, shape)) {
    body.y = ny;
    return;
  }
  if (dy < 0) {
    body.y = Math.floor(ny) + 1;
    body.onGround = true;
  } else {
    body.y = Math.floor(ny + shape.height) - shape.height - EPS;
  }
  body.vy = 0;
}

function moveHorizontal(solid: SolidFn, body: Body, axis: 'x' | 'z', d: number, shape: BodyShape): void {
  if (d === 0) return;
  const nx = axis === 'x' ? body.x + d : body.x;
  const nz = axis === 'z' ? body.z + d : body.z;
  if (!collides(solid, nx, body.y, nz, shape)) {
    body.x = nx;
    body.z = nz;
    return;
  }
  const grounded = body.onGround || collides(solid, body.x, body.y - 0.02, body.z, shape);
  if (
    shape.autoStep &&
    grounded &&
    !collides(solid, body.x, body.y + 1, body.z, shape) &&
    !collides(solid, nx, body.y + 1, nz, shape)
  ) {
    body.x = nx;
    body.z = nz;
    body.y = Math.floor(body.y + EPS) + 1;
    return;
  }
  const pos = axis === 'x' ? body.x : body.z;
  const next = pos + d;
  const snapped =
    d > 0 ? Math.floor(next + shape.halfWidth) - shape.halfWidth - EPS : Math.floor(next - shape.halfWidth) + 1 + shape.halfWidth + EPS;
  if (axis === 'x') body.x = snapped;
  else body.z = snapped;
}

/**
 * Lancer de rayon voxel (DDA). Retourne la distance du premier bloc solide touché,
 * ou null si rien n'est touché avant maxDist.
 */
export function raycastVoxels(
  solid: SolidFn,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
): number | null {
  let x = Math.floor(ox);
  let y = Math.floor(oy);
  let z = Math.floor(oz);
  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;
  const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
  const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;
  let tMaxX = dx !== 0 ? (dx > 0 ? x + 1 - ox : ox - x) * tDeltaX : Infinity;
  let tMaxY = dy !== 0 ? (dy > 0 ? y + 1 - oy : oy - y) * tDeltaY : Infinity;
  let tMaxZ = dz !== 0 ? (dz > 0 ? z + 1 - oz : oz - z) * tDeltaZ : Infinity;
  let t = 0;
  while (t <= maxDist) {
    if (solid(x, y, z)) return t;
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX;
      t = tMaxX;
      tMaxX += tDeltaX;
    } else if (tMaxY < tMaxZ) {
      y += stepY;
      t = tMaxY;
      tMaxY += tDeltaY;
    } else {
      z += stepZ;
      t = tMaxZ;
      tMaxZ += tDeltaZ;
    }
  }
  return null;
}
