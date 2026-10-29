import { describe, expect, it } from 'vitest';
import { SONGS, autoPad, compose, midiToHz, padChords, noteToMidi, parseVoice, stepSeconds, voiceLength } from '../../src/audio/music';

describe('musiques', () => {
  it('notes : la 4 = 440 Hz, altérations', () => {
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('Bb2')).toBe(46);
    expect(noteToMidi('F#3')).toBe(54);
    expect(midiToHz(69)).toBeCloseTo(440);
    expect(() => noteToMidi('H2')).toThrow();
  });

  it('« - » allonge la note précédente, « . » est un silence', () => {
    expect(parseVoice('C5 - . E5').map((n) => [n.step, n.length])).toEqual([
      [0, 2],
      [3, 1],
    ]);
  });

  it('compose enchaîne les parties selon la forme', () => {
    const a = { lead: 'C5 -', bass: 'C3 .', drums: 'k .' };
    const b = { lead: 'E5 G5', bass: 'G2 .', drums: 'h h' };
    const song = compose(100, 1, { A: a, B: b }, 'A B A');
    expect(song.lead).toBe('C5 - E5 G5 C5 -');
    expect(song.drums).toBe('k . h h k .');
    expect(() => compose(100, 1, { A: a }, 'A C')).toThrow();
  });

  it('les musiques de biome durent au moins 30 s avant de reboucler', () => {
    for (const id of ['prairie', 'foret', 'desert', 'givre'] as const) {
      const song = SONGS[id];
      expect(voiceLength(song.lead) * stepSeconds(song.bpm)).toBeGreaterThanOrEqual(30);
    }
  });

  for (const [id, song] of Object.entries(SONGS)) {
    it(`${id} : 3 voix de même longueur, notes valides, dans une tessiture douce`, () => {
      const n = voiceLength(song.lead);
      expect(voiceLength(song.bass)).toBe(n);
      expect(voiceLength(song.drums)).toBe(n);
      expect(n % 8).toBe(0);
      for (const ev of parseVoice(song.lead)) {
        expect(ev.hz).toBeGreaterThan(200);
        expect(ev.hz).toBeLessThan(1500);
      }
      for (const ev of parseVoice(song.bass)) expect(ev.hz).toBeLessThan(260);
      expect(song.drums.split(/\s+/).every((t) => ['k', 's', 'h', '.'].includes(t))).toBe(true);
      expect(stepSeconds(song.bpm)).toBeGreaterThan(0.15);
    });
  }
});

describe('nappes d’accords', () => {
  it('la nappe déduite de la basse : fondamentale, quinte, octave, une par mesure', () => {
    expect(autoPad('C3 . G3 . . . . . A2 - - - - - - -')).toBe('C3+G3+C4 - - - - - - - A3+E4+A4 - - - - - - -');
  });

  for (const [id, song] of Object.entries(SONGS)) {
    it(`${id} : la nappe a la longueur du morceau et reste dans une tessiture douce`, () => {
      const n = voiceLength(song.lead);
      for (const voice of padChords(song))
        for (const ev of voice) {
          expect(ev.step + ev.length).toBeLessThanOrEqual(n);
          expect(ev.hz).toBeGreaterThan(120);
          expect(ev.hz).toBeLessThan(700);
        }
      if (song.pad) expect(voiceLength(song.pad)).toBe(n);
    });
  }
});
