import { CONTENT } from '../data/content';
import { PORTRAITS } from '../entities/models';
import type { DialogLine } from '../ui/dialog';

/**
 * Répliques des PNJ hors quêtes. Les répliques d'accueil ci-dessous sont des textes
 * nouveaux (hors CONTENU.md), à faire valider par le parent.
 */

export const NPC_NAMES: Record<string, string> = {
  lumibloc: 'Professeur Lumibloc',
  mereBrique: 'Mère Brique',
  paquerette: 'Pâquerette',
  gaston: 'Gaston',
  rivet: 'Rivet',
  noisette: 'Sage Noisette',
  pip: 'Pip',
  tilleul: 'Tilleul',
};

const GREETINGS: Record<string, string> = {
  lumibloc: 'Le sanctuaire de la Prairie est de l’autre côté de la rivière. Suis la flèche en haut de l’écran !',
  mereBrique: 'Bienvenue à Ferme-des-Blocs ! Ici, les monstres n’entrent jamais.',
  paquerette: 'Bonjour ! Mon pain sort tout juste du four.',
  gaston: 'Mon moulin tourne grâce au vent de la Prairie.',
  rivet: 'Bonjour, {prenom} ! J’ai balayé toute la maison.',
  noisette: 'Bienvenue aux Cabanes des Cimes. Ici, les feuilles écoutent et le vent répond.',
  pip: 'Tu as vu nos passerelles ? Je cours dessus plus vite que les écureuils !',
  tilleul: 'Bonjour ! Je suis charpentier. Les ponts de la forêt, c’est moi.',
};

export function greeting(npcId: string): DialogLine {
  return { speaker: NPC_NAMES[npcId], portrait: PORTRAITS[npcId], text: GREETINGS[npcId] };
}

/** Réplique de Lumibloc tirée de CONTENU.md (section G). */
export function lumiblocLine(key: keyof typeof CONTENT.lumibloc): DialogLine {
  return { speaker: NPC_NAMES.lumibloc, portrait: PORTRAITS.lumibloc, text: CONTENT.lumibloc[key] };
}

/** Objectif actif du journal et de la boussole (textes nouveaux, à valider). */
export const OBJECTIVE_FIND_EGG = 'Trouver l’œuf dans le sanctuaire de la Prairie.';
export const JOURNAL_NO_DONE = 'Aucune quête terminée pour l’instant.';
