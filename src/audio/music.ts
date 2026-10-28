/**
 * Musiques du jeu (SPEC.md § 12), composées pour le jeu et écrites en notes : chiptune doux.
 * Chaque morceau a 3 voix (mélodie, basse, percussions) sur une grille de croches, en boucle.
 * Notation : « C5 » = do 5, « Bb2 » = si bémol 2, « - » = la note précédente continue, « . » = silence.
 * Percussions : « k » grosse caisse, « s » caisse claire, « h » charleston.
 */

export type TrackId = 'prairie' | 'arena' | 'boss' | 'storyDay' | 'storyNight' | 'storyMorning';

export interface Song {
  bpm: number;
  lead: string;
  bass: string;
  drums: string;
  /** Volume de la mélodie (0 à 1), pour les morceaux calmes. */
  leadLevel: number;
}

export const SONGS: Record<TrackId, Song> = {
  // Prairie : do majeur, tranquille et lumineux.
  prairie: {
    bpm: 104,
    leadLevel: 0.8,
    lead: 'E5 G5 C6 G5 A5 G5 E5 - F5 A5 G5 E5 D5 - - . E5 G5 C6 G5 A5 C6 B5 A5 G5 E5 D5 E5 C5 - - .',
    bass: 'C3 . G3 . A2 . E3 . F2 . C3 . G2 . G3 . C3 . G3 . A2 . E3 . F2 . G2 . C3 . . .',
    drums: 'k . h . k . h . k . h . k . h . k . h . k . h . k . h . k h k .',
  },
  // Arène : la mineur, entraînant.
  arena: {
    bpm: 132,
    leadLevel: 0.75,
    lead: 'A4 C5 E5 A5 G5 E5 C5 E5 F5 A5 C6 A5 G5 E5 D5 E5 A4 C5 E5 A5 B5 A5 G5 E5 F5 E5 D5 C5 B4 - A4 .',
    bass: 'A2 A2 A3 A2 A2 A2 A3 A2 F2 F2 F3 F2 G2 G2 G3 G2 A2 A2 A3 A2 A2 A2 A3 A2 F2 F2 G2 G2 E2 E2 A2 .',
    drums: 'k h s h k h s h k h s h k k s h k h s h k h s h k h s h k s s s',
  },
  // Boss : ré mineur, plus tendu.
  boss: {
    bpm: 144,
    leadLevel: 0.75,
    lead: 'D5 . F5 D5 A5 . G5 F5 E5 . C5 E5 G5 . F5 E5 D5 . F5 D5 A5 . Bb5 A5 G5 F5 E5 F5 D5 - - .',
    bass: 'D2 D3 D2 D3 D2 D3 D2 D3 C2 C3 C2 C3 C2 C3 C2 C3 Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 A1 A2 A1 A2 A1 A2 A1 A2',
    drums: 'k . s . k k s . k . s . k k s h k . s . k k s . k s k s k s s s',
  },
  // Histoire, le jour et le matin : fa majeur, arpèges doux, sans percussions.
  storyDay: {
    bpm: 84,
    leadLevel: 0.6,
    lead: 'F5 . A5 . C6 . A5 . G5 . Bb5 . D6 . Bb5 . A5 . C6 . F6 . C6 . E5 . G5 . C6 . - .',
    bass: 'F2 - - - - - - - G2 - - - - - - - A2 - - - - - - - C3 - - - - - - -',
    drums: '. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .',
  },
  // Histoire, le matin : sol majeur, joyeux et sautillant.
  storyMorning: {
    bpm: 112,
    leadLevel: 0.65,
    lead: 'G5 . B5 D6 B5 . G5 . A5 . C6 . B5 A5 G5 . E5 . G5 B5 A5 . F#5 . G5 B5 D6 B5 G5 - - .',
    bass: 'G2 . D3 . G2 . D3 . C3 . G3 . C3 . G3 . E2 . B2 . D3 . A2 . G2 . D3 . G2 . . .',
    drums: 'k . h . s . h . k . h . s . h . k . h . s . h . k . h h s . . .',
  },
  // Histoire, la nuit : ré mineur, grave et mystérieux.
  storyNight: {
    bpm: 72,
    leadLevel: 0.55,
    lead: 'D5 - . . F5 - E5 - D5 - . . A4 - - . Bb4 - . . D5 - C5 - A4 - - - - - . .',
    bass: 'D2 - - - - - - - - - - - - - - - Bb1 - - - - - - - A1 - - - - - - -',
    drums: 'k . . . . . . . k . . . . . . . k . . . . . . . k . . . . . . .',
  },
};

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** « A4 » → 69 (MIDI) ; « Bb2 », « F#3 ». */
export function noteToMidi(note: string): number {
  const m = /^([A-G])([b#]?)(-?\d)$/.exec(note);
  if (!m) throw new Error(`Note inconnue : ${note}`);
  const acc = m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0;
  return 12 * (Number(m[3]) + 1) + NOTE_INDEX[m[1]] + acc;
}

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Une note à jouer : début et durée en croches, hauteur en Hz. */
export interface NoteEvent {
  step: number;
  length: number;
  hz: number;
}

/** Voix mélodique → notes (les « - » allongent la note précédente). */
export function parseVoice(voice: string): NoteEvent[] {
  const tokens = voice.trim().split(/\s+/);
  const out: NoteEvent[] = [];
  tokens.forEach((t, step) => {
    if (t === '-') {
      if (out.length && out[out.length - 1].step + out[out.length - 1].length === step) out[out.length - 1].length++;
      return;
    }
    if (t === '.') return;
    out.push({ step, length: 1, hz: midiToHz(noteToMidi(t)) });
  });
  return out;
}

export function voiceLength(voice: string): number {
  return voice.trim().split(/\s+/).length;
}

/** Durée d'une croche, en secondes. */
export function stepSeconds(bpm: number): number {
  return 60 / bpm / 2;
}
