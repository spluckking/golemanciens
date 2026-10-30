/**
 * Application installée : plein écran et paysage, demandés par le jeu au toucher.
 * Le manifeste reste en « standalone » et orientation libre : avec « fullscreen » et « landscape »,
 * l'icône de l'application ne s'ouvrait pas sur Android (Xiaomi Pad 7 Pro, Pixel 7 Pro).
 */

/** Verrouillage d'orientation (absent des types du DOM). */
interface LockableOrientation {
  lock?(orientation: 'landscape'): Promise<void>;
}

async function enterAppMode(): Promise<void> {
  if (document.fullscreenElement || !window.matchMedia('(display-mode: standalone)').matches) return;
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await (screen.orientation as LockableOrientation).lock?.('landscape');
  } catch {
    // Refusé par l'appareil : le jeu reste jouable dans sa fenêtre.
  }
}

/** Le navigateur exige un geste de l'utilisateur : on réessaie à chaque toucher (retour d'arrière-plan). */
export function watchAppMode(): void {
  window.addEventListener('pointerup', () => void enterAppMode(), { capture: true });
}
