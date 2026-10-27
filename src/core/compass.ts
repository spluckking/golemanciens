/**
 * Rotation de la flèche de boussole (degrés, sens horaire à l'écran) pour pointer
 * de (hx, hz) vers (tx, tz), quand la caméra regarde selon l'angle cameraYaw
 * (0 = vers −Z ; l'angle augmente en tournant vers la gauche).
 */
export function compassRotation(cameraYaw: number, hx: number, hz: number, tx: number, tz: number): number {
  const targetYaw = Math.atan2(-(tx - hx), -(tz - hz));
  let rel = targetYaw - cameraYaw;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  return (-rel * 180) / Math.PI;
}
