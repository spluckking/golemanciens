/** Espace fine insécable (avant ? ! ;) et espace insécable (avant : et dans « »). */
export const NNBSP = ' ';
export const NBSP = ' ';

/** Applique la typographie française à un texte affiché. */
export function frenchTypography(text: string): string {
  return text
    .replace(/\s+([?!;])/g, `${NNBSP}$1`)
    .replace(/\s+:/g, `${NBSP}:`)
    .replace(/«\s*/g, `«${NBSP}`)
    .replace(/\s*»/g, `${NBSP}»`);
}

/** Remplace {prenom} puis applique la typographie. */
export function formatText(text: string, playerName: string): string {
  return frenchTypography(text.replaceAll('{prenom}', playerName));
}
