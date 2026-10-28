import { describe, expect, it } from 'vitest';
import { SONGS, midiToHz, noteToMidi, parseVoice, stepSeconds, voiceLength } from '../../src/audio/music';

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
