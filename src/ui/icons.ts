/**
 * Icônes de l'interface en SVG, écrites dans le code (aucun fichier image) : elles restent nettes
 * à toutes les tailles. Style commun : formes pleines et rondes, contour sombre et chaud, reflet clair.
 */

export type UiIconId = 'wand' | 'journal' | 'golems' | 'encyclopedia' | 'pause' | 'jump' | 'hand' | 'apple' | 'shard' | 'heart' | 'speaker' | 'close' | 'next';

/** Trait de contour commun (viewBox 48 × 48). */
const INK = 'stroke="#2a1f2e" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"';

const ICONS: Record<UiIconId, string> = {
  // Baguette en diagonale, bague d'or, étoile au bout.
  wand: `<path d="M8 41 L27 22 L32 27 L13 46 Z" fill="#7a4a26" ${INK}/>
    <path d="M23 26 L28 31 L25 34 L20 29 Z" fill="#ffd25e" ${INK}/>
    <path d="M34 3 L37.5 11.5 L46 13 L39.5 19 L41 28 L34 23.5 L27 28 L28.5 19 L22 13 L30.5 11.5 Z" fill="#ffe08a" ${INK}/>
    <circle cx="34" cy="15.5" r="3" fill="#ffffff"/>`,
  // Parchemin roulé, avec un sceau rouge.
  journal: `<path d="M11 9 H37 V39 H11 Z" fill="#fdf0d0" ${INK}/>
    <rect x="6" y="5" width="36" height="8" rx="4" fill="#c98a4c" ${INK}/>
    <rect x="6" y="35" width="36" height="8" rx="4" fill="#c98a4c" ${INK}/>
    <path d="M16 19 H32 M16 25 H32 M16 31 H25" stroke="#8a6a4a" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="32" cy="31" r="4" fill="#e2604a" ${INK}/>`,
  // Tête de golem en pierre, yeux de cristal, brin de mousse.
  golems: `<path d="M9 16 Q9 9 16 9 H32 Q39 9 39 16 V36 Q39 43 32 43 H16 Q9 43 9 36 Z" fill="#a4a8b8" ${INK}/>
    <path d="M9 22 H39" stroke="#6d7082" stroke-width="2.6"/>
    <rect x="14" y="26" width="8" height="6" rx="2" fill="#7fe3ff" ${INK}/>
    <rect x="26" y="26" width="8" height="6" rx="2" fill="#7fe3ff" ${INK}/>
    <path d="M19 37 H29" stroke="#2a1f2e" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M16 9 Q18 3 24 6 Q30 3 32 9 Z" fill="#67c95a" ${INK}/>`,
  // Livre ouvert, marque-page d'or.
  encyclopedia: `<path d="M4 12 Q14 8 24 13 Q34 8 44 12 V40 Q34 36 24 41 Q14 36 4 40 Z" fill="#c8384a" ${INK}/>
    <path d="M8 13 Q16 10 24 15 V37 Q16 32 8 35 Z" fill="#fff8e6" ${INK}/>
    <path d="M40 13 Q32 10 24 15 V37 Q32 32 40 35 Z" fill="#fdeec8" ${INK}/>
    <path d="M12 19 Q16 18 20 20 M12 25 Q16 24 20 26 M28 20 Q32 18 36 19 M28 26 Q32 24 36 25" fill="none" stroke="#8a6a4a" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M32 6 H38 V19 L35 16 L32 19 Z" fill="#ffd25e" ${INK}/>`,
  pause: `<rect x="11" y="8" width="10" height="32" rx="3.5" fill="#ffffff" ${INK}/>
    <rect x="27" y="8" width="10" height="32" rx="3.5" fill="#ffffff" ${INK}/>`,
  // Flèche vers le haut, trait au sol.
  jump: `<path d="M24 4 L43 24 H32 V35 H16 V24 H5 Z" fill="#ffffff" ${INK}/>
    <rect x="13" y="39" width="22" height="6" rx="3" fill="#ffffff" ${INK}/>`,
  // Main ouverte.
  hand: `<path d="M14 26 V12 Q14 8 17.5 8 Q21 8 21 12 V9 Q21 5 24.5 5 Q28 5 28 9 V11 Q28 8 31.5 8 Q35 8 35 12 V16 Q35 13 38 13 Q41 13 41 17 V30 Q41 44 27 44 Q18 44 13 37 L6 28 Q4 25 7 23 Q10 21 12 24 Z" fill="#ffd9a8" ${INK}/>
    <path d="M21 12 V24 M28 11 V24 M35 16 V25" fill="none" stroke="#2a1f2e" stroke-width="2.2" stroke-linecap="round"/>`,
  apple: `<path d="M24 15 C16 8 5 13 6 26 C7 37 15 45 20 44 Q24 43 28 44 C33 45 41 37 42 26 C43 13 32 8 24 15 Z" fill="#e2483e" ${INK}/>
    <path d="M24 15 Q24 9 28 5" fill="none" ${INK}/>
    <path d="M27 10 Q33 3 40 7 Q35 14 27 10 Z" fill="#67c95a" ${INK}/>
    <ellipse cx="15" cy="23" rx="3.5" ry="6" fill="#ffffff" opacity=".6"/>`,
  // Éclat de cristal.
  shard: `<path d="M24 3 L40 19 L24 45 L8 19 Z" fill="#7fe3ff" ${INK}/>
    <path d="M8 19 H40 M24 3 L17 19 L24 45 L31 19 Z" fill="none" stroke="#2a78b0" stroke-width="2" stroke-linejoin="round"/>
    <path d="M17 19 L24 3 L8 19 Z" fill="#d8f8ff"/>`,
  heart: `<path d="M24 43 C8 31 4 23 5 16 C6 7 18 4 24 13 C30 4 42 7 43 16 C44 23 40 31 24 43 Z" fill="#ef5a6a" ${INK}/>
    <ellipse cx="15" cy="16" rx="4" ry="3.2" fill="#ffffff" opacity=".65"/>`,
  speaker: `<path d="M6 18 H15 L27 8 V40 L15 30 H6 Z" fill="#ffffff" ${INK}/>
    <path d="M33 17 Q38 24 33 31 M38 11 Q47 24 38 37" fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round"/>`,
  close: `<path d="M12 12 L36 36 M36 12 L12 36" fill="none" stroke="#2a1f2e" stroke-width="10" stroke-linecap="round"/>
    <path d="M12 12 L36 36 M36 12 L12 36" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>`,
  next: `<path d="M13 7 Q10 5.5 10 9 V39 Q10 42.5 13 41 L41 26 Q44 24 41 22 Z" fill="#ffffff" ${INK}/>`,
};

/** Icône SVG décorative (le nom du bouton reste porté par son aria-label). */
export function uiIcon(id: UiIconId): HTMLSpanElement {
  const box = document.createElement('span');
  box.className = `ui-icon ui-icon-${id}`;
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = `<svg viewBox="0 0 48 48">${ICONS[id]}</svg>`;
  return box;
}
