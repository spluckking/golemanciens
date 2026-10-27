export const PLAYER_NAME_MAX = 15;

const VALID = /^\p{L}[\p{L}' -]*$/u;

/**
 * Nettoie le prénom saisi : espaces superflus retirés, première lettre en majuscule.
 * Retourne null si le prénom n'est pas valable (vide, trop long, caractères interdits).
 */
export function normalizePlayerName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ').replace(/’/g, "'");
  if (name.length === 0 || name.length > PLAYER_NAME_MAX) return null;
  if (!VALID.test(name)) return null;
  return name.charAt(0).toLocaleUpperCase('fr-FR') + name.slice(1);
}
