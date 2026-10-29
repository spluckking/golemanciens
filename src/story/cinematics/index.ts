import type { Outro, StoryText } from '../../data/types';
import { groupCaptions, splitSentences, storySentences } from './captions';
import type { CinematicScript } from './director';
import { O1_CINEMATIC } from './o1';
import { O2_CINEMATIC } from './o2';
import { O3_CINEMATIC } from './o3';
import { O4_CINEMATIC } from './o4';
import { O5_CINEMATIC } from './o5';
import { O6_CINEMATIC } from './o6';
import { T1_CINEMATIC } from './t1';
import { T2_CINEMATIC } from './t2';
import { T3_CINEMATIC } from './t3';
import { T4_CINEMATIC } from './t4';
import { T5_CINEMATIC } from './t5';
import { T6_CINEMATIC } from './t6';

/** Cinématiques des textes d'histoire, par identifiant (les autres arrivent avec leur jalon). */
export const CINEMATICS: Record<string, CinematicScript> = {
  T1: T1_CINEMATIC,
  T2: T2_CINEMATIC,
  T3: T3_CINEMATIC,
  T4: T4_CINEMATIC,
  T5: T5_CINEMATIC,
  T6: T6_CINEMATIC,
};

/** Cinématiques des outros (fin de phase, sans questions). */
export const OUTRO_CINEMATICS: Record<string, CinematicScript> = {
  O1: O1_CINEMATIC,
  O2: O2_CINEMATIC,
  O3: O3_CINEMATIC,
  O4: O4_CINEMATIC,
  O5: O5_CINEMATIC,
  O6: O6_CINEMATIC,
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
