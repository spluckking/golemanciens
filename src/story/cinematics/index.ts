import type { StoryText } from '../../data/types';
import { groupCaptions, storySentences } from './captions';
import type { CinematicScript } from './director';
import { T1_CINEMATIC } from './t1';

/** Cinématiques disponibles, par identifiant de texte (les autres arrivent avec leur jalon). */
export const CINEMATICS: Record<string, CinematicScript> = {
  T1: T1_CINEMATIC,
};

/** Sous-titres d'une cinématique : les phrases du texte, regroupées plan par plan. */
export function storyCaptions(story: StoryText, script: CinematicScript): string[] {
  return groupCaptions(
    storySentences(story.paragraphs),
    script.shots.map((s) => s.sentences),
  );
}
