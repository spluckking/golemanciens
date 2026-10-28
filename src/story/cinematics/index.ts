import type { Outro, StoryText } from '../../data/types';
import { groupCaptions, splitSentences, storySentences } from './captions';
import type { CinematicScript } from './director';
import { O1_CINEMATIC } from './o1';
import { T1_CINEMATIC } from './t1';

/** Cinématiques des textes d'histoire, par identifiant (les autres arrivent avec leur jalon). */
export const CINEMATICS: Record<string, CinematicScript> = {
  T1: T1_CINEMATIC,
};

/** Cinématiques des outros (fin de phase, sans questions). */
export const OUTRO_CINEMATICS: Record<string, CinematicScript> = {
  O1: O1_CINEMATIC,
};

/** Sous-titres d'une cinématique : les phrases du texte, regroupées plan par plan. */
export function storyCaptions(story: StoryText, script: CinematicScript): string[] {
  return groupCaptions(
    storySentences(story.paragraphs),
    script.shots.map((s) => s.sentences),
  );
}

export function outroCaptions(outro: Outro, script: CinematicScript): string[] {
  return groupCaptions(
    splitSentences(outro.text),
    script.shots.map((s) => s.sentences),
  );
}
