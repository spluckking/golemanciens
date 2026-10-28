import { SONGS, parseVoice, stepSeconds, voiceLength, type NoteEvent, type TrackId } from './music';

/**
 * Son du jeu (SPEC.md § 12), entièrement généré avec Web Audio : aucun fichier.
 * Musiques en boucle (séquenceur avec un peu d'avance), fondu entre deux morceaux,
 * bruitages synthétisés, volumes séparés. Le son ne démarre qu'après un premier toucher.
 */

export type SfxId =
  | 'step'
  | 'spark'
  | 'crate'
  | 'food'
  | 'chest'
  | 'lantern'
  | 'pop'
  | 'quest'
  | 'correct'
  | 'wrong'
  | 'tile'
  | 'door'
  | 'hatch'
  | 'gong'
  | 'hitRock'
  | 'hitPlant'
  | 'hitSun'
  | 'hitStar'
  | 'monsterHit'
  | 'super'
  | 'poof'
  | 'victory'
  | 'defeat'
  | 'split'
  | 'rumble'
  | 'wings'
  | 'roar'
  | 'shatter'
  | 'knock'
  | 'chime';

const LOOKAHEAD_S = 0.15;
const TICK_MS = 25;
const FADE_S = 0.8;

interface Playing {
  id: TrackId;
  gain: GainNode;
  lead: NoteEvent[];
  bass: NoteEvent[];
  drums: string[];
  length: number;
  step: number;
  nextTime: number;
  stepS: number;
  leadLevel: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private playing: Playing | null = null;
  private wanted: TrackId | null = null;
  private timer = 0;
  private musicVolume = 0.6;
  private sfxVolume = 0.8;
  private ducked = false;

  /** À appeler au premier toucher (règle des navigateurs mobiles). */
  unlock(): void {
    if (typeof AudioContext === 'undefined') return;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      // Bruit blanc réutilisé par les percussions et les bruitages.
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      this.timer = window.setInterval(() => this.schedule(), TICK_MS);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.wanted && !this.playing) this.music(this.wanted);
  }

  get state(): string {
    return this.ctx?.state ?? 'locked';
  }

  get track(): TrackId | null {
    return this.wanted;
  }

  setVolumes(music: number, sfx: number): void {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    this.applyVolumes();
  }

  /** Musique plus douce pendant les pauses et les menus. */
  duck(on: boolean): void {
    this.ducked = on;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.musicBus || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.musicVolume * 0.5 * (this.ducked ? 0.35 : 1), t, 0.1);
    this.sfxBus.gain.setTargetAtTime(this.sfxVolume * 0.7, t, 0.05);
  }

  // ---------- Musique ----------

  /** Change de morceau (fondu) ; null coupe la musique. */
  music(id: TrackId | null): void {
    this.wanted = id;
    if (!this.ctx || !this.musicBus) return;
    if (this.playing?.id === id) return;
    const now = this.ctx.currentTime;
    if (this.playing) {
      const old = this.playing.gain;
      old.gain.setTargetAtTime(0, now, FADE_S / 3);
      setTimeout(() => old.disconnect(), FADE_S * 2000);
      this.playing = null;
    }
    if (!id) return;
    const song = SONGS[id];
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.setTargetAtTime(1, now, FADE_S / 3);
    gain.connect(this.musicBus);
    this.playing = {
      id,
      gain,
      lead: parseVoice(song.lead),
      bass: parseVoice(song.bass),
      drums: song.drums.trim().split(/\s+/),
      length: voiceLength(song.lead),
      step: 0,
      nextTime: now + 0.1,
      stepS: stepSeconds(song.bpm),
      leadLevel: song.leadLevel,
    };
  }

  /** Programme les notes des prochaines millisecondes (avance de 150 ms). */
  private schedule(): void {
    const p = this.playing;
    if (!this.ctx || !p) return;
    while (p.nextTime < this.ctx.currentTime + LOOKAHEAD_S) {
      const t = p.nextTime;
      for (const n of p.lead) if (n.step === p.step) this.voice(p.gain, 'square', n.hz, t, n.length * p.stepS * 0.92, 0.06 * p.leadLevel, 2400);
      for (const n of p.bass) if (n.step === p.step) this.voice(p.gain, 'triangle', n.hz, t, n.length * p.stepS * 0.95, 0.2, 1200);
      const d = p.drums[p.step];
      if (d === 'k') this.kick(p.gain, t);
      else if (d === 's') this.noiseHit(p.gain, t, 0.12, 0.09, 1800, 'bandpass');
      else if (d === 'h') this.noiseHit(p.gain, t, 0.04, 0.035, 7000, 'highpass');
      p.step = (p.step + 1) % p.length;
      p.nextTime += p.stepS;
    }
  }

  // ---------- Instruments ----------

  private voice(dest: AudioNode, type: OscillatorType, hz: number, t: number, dur: number, level: number, cutoff: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, t);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.01);
    g.gain.setTargetAtTime(level * 0.6, t + 0.02, 0.08);
    g.gain.setTargetAtTime(0, t + Math.max(0.03, dur - 0.04), 0.03);
    osc.connect(filter).connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.2);
  }

  private kick(dest: AudioNode, t: number, level = 0.35): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  private noiseHit(dest: AudioNode, t: number, dur: number, level: number, freq: number, type: BiquadFilterType): void {
    if (!this.ctx || !this.noise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  /** Petite suite de notes (jingles, bruitages mélodiques). */
  private notes(hzs: number[], gap: number, dur: number, type: OscillatorType, level: number): void {
    if (!this.ctx || !this.sfxBus) return;
    const t0 = this.ctx.currentTime;
    hzs.forEach((hz, i) => this.voice(this.sfxBus!, type, hz, t0 + i * gap, dur, level, 4000));
  }

  /** Glissando (montée ou descente de fréquence). */
  private sweep(from: number, to: number, dur: number, type: OscillatorType, level: number): void {
    if (!this.ctx || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // ---------- Bruitages ----------

  sfx(id: SfxId): void {
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const bus = this.sfxBus;
    switch (id) {
      case 'step':
        return this.noiseHit(bus, t, 0.05, 0.05, 900, 'lowpass');
      case 'spark':
        return this.sweep(900, 2400, 0.18, 'triangle', 0.12);
      case 'crate':
        this.noiseHit(bus, t, 0.18, 0.3, 600, 'lowpass');
        return this.kick(bus, t, 0.25);
      case 'food':
        return this.notes([880, 1175], 0.07, 0.1, 'square', 0.07);
      case 'chest':
        return this.notes([523, 659, 784, 1047], 0.08, 0.14, 'square', 0.07);
      case 'lantern':
        return this.notes([784, 1175, 1568], 0.1, 0.3, 'triangle', 0.12);
      case 'pop':
        return this.sweep(400, 1000, 0.1, 'sine', 0.2);
      case 'quest':
        return this.notes([523, 659, 784, 1047, 784, 1047], 0.09, 0.16, 'square', 0.07);
      case 'correct':
        return this.notes([784, 1047], 0.09, 0.18, 'square', 0.08);
      case 'wrong':
        // Erreur douce : deux notes descendantes, sans bruit agressif.
        return this.notes([392, 330], 0.14, 0.22, 'triangle', 0.14);
      case 'tile':
        return this.notes([659, 988], 0.06, 0.2, 'triangle', 0.12);
      case 'door':
        this.noiseHit(bus, t, 0.6, 0.12, 300, 'lowpass');
        return this.notes([392, 523, 659], 0.15, 0.3, 'triangle', 0.1);
      case 'hatch':
        return this.notes([523, 659, 784, 1047, 1319, 1568], 0.08, 0.25, 'square', 0.07);
      case 'gong':
        this.voice(bus, 'sine', 110, t, 2.2, 0.35, 2000);
        return this.voice(bus, 'sine', 166, t, 1.8, 0.15, 2000);
      case 'hitRock':
        this.kick(bus, t, 0.4);
        return this.noiseHit(bus, t, 0.15, 0.2, 500, 'lowpass');
      case 'hitPlant':
        return this.noiseHit(bus, t, 0.2, 0.18, 2500, 'bandpass');
      case 'hitSun':
        return this.sweep(600, 1800, 0.25, 'sawtooth', 0.07);
      case 'hitStar':
        return this.notes([1568, 2093, 2637], 0.05, 0.15, 'triangle', 0.1);
      case 'monsterHit':
        this.kick(bus, t, 0.3);
        return this.sweep(300, 120, 0.15, 'square', 0.06);
      case 'super':
        return this.notes([1047, 1319, 1568], 0.06, 0.14, 'square', 0.08);
      case 'poof':
        return this.noiseHit(bus, t, 0.4, 0.2, 1200, 'bandpass');
      case 'victory':
        return this.notes([523, 659, 784, 659, 784, 1047], 0.12, 0.25, 'square', 0.08);
      case 'defeat':
        return this.notes([523, 466, 440, 392], 0.2, 0.35, 'triangle', 0.12);
      case 'split':
        this.sweep(300, 900, 0.2, 'sine', 0.2);
        return this.noiseHit(bus, t, 0.3, 0.15, 900, 'bandpass');
      case 'rumble':
        this.voice(bus, 'sawtooth', 45, t, 1.4, 0.18, 200);
        return this.noiseHit(bus, t, 1.2, 0.25, 150, 'lowpass');
      case 'wings':
        return this.noiseHit(bus, t, 0.35, 0.18, 400, 'lowpass');
      case 'roar':
        this.sweep(180, 70, 1.0, 'sawtooth', 0.15);
        return this.noiseHit(bus, t, 0.9, 0.15, 500, 'bandpass');
      case 'shatter':
        this.noiseHit(bus, t, 0.5, 0.25, 5000, 'highpass');
        return this.notes([2093, 1568, 2637, 1760], 0.04, 0.2, 'triangle', 0.1);
      case 'knock':
        return this.noiseHit(bus, t, 0.08, 0.35, 400, 'lowpass');
      case 'chime':
        return this.notes([1319, 1760, 2093], 0.12, 0.6, 'sine', 0.12);
    }
  }

  dispose(): void {
    clearInterval(this.timer);
    void this.ctx?.close();
  }
}

/** Son du jeu (un seul pour toute l'appli). */
export const audio = new AudioEngine();
