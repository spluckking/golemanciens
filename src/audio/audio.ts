import { SONGS, padChords, parseVoice, stepSeconds, voiceLength, type NoteEvent, type TrackId } from './music';

/**
 * Son du jeu (SPEC.md § 12), entièrement généré avec Web Audio : aucun fichier.
 * Musiques en boucle (séquenceur avec un peu d'avance), fondu entre deux morceaux,
 * bruitages synthétisés, volumes séparés. Le son ne démarre qu'après un premier toucher.
 *
 * Chaîne : instruments → bus musique / bus bruitages → compresseur → sortie,
 * avec un envoi vers une petite réverbération (salle générée par le code) et un écho léger pour la mélodie.
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
  | 'chime'
  | 'evolve'
  | 'star';

const LOOKAHEAD_S = 0.15;
const TICK_MS = 25;
const FADE_S = 0.8;
const REVERB_S = 2.2;
/** Part de réverbération (musique, bruitages). */
const MUSIC_REVERB = 0.22;
const SFX_REVERB = 0.18;

interface Playing {
  id: TrackId;
  gain: GainNode;
  lead: NoteEvent[];
  bass: NoteEvent[];
  pads: NoteEvent[][];
  drums: string[];
  length: number;
  step: number;
  nextTime: number;
  stepS: number;
  leadLevel: number;
  padLevel: number;
}

/** Hauteur MIDI → fréquence. */
function hzOf(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private reverbIn: GainNode | null = null;
  private echoIn: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private pulse: PeriodicWave | null = null;
  private playing: Playing | null = null;
  private wanted: TrackId | null = null;
  private timer = 0;
  private musicVolume = 0.6;
  private sfxVolume = 0.8;
  private ducked = false;

  /** À appeler au premier toucher (règle des navigateurs mobiles). */
  unlock(): void {
    if (typeof AudioContext === 'undefined') return;
    if (!this.ctx) this.build(new AudioContext());
    if (this.ctx!.state === 'suspended') void this.ctx!.resume();
    if (this.wanted && !this.playing) this.music(this.wanted);
  }

  private build(ctx: AudioContext): void {
    this.ctx = ctx;
    // Compresseur doux : les bruitages forts ne saturent pas et la musique reste égale.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.2;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    comp.connect(this.master).connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus.connect(comp);
    this.sfxBus.connect(comp);

    // Réverbération : réponse impulsionnelle stéréo générée (bruit qui décroît).
    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(ctx, REVERB_S);
    this.reverbIn = ctx.createGain();
    const reverbOut = ctx.createGain();
    reverbOut.gain.value = 0.9;
    this.reverbIn.connect(reverb).connect(reverbOut).connect(comp);
    const musicSend = ctx.createGain();
    musicSend.gain.value = MUSIC_REVERB;
    this.musicBus.connect(musicSend).connect(this.reverbIn);
    const sfxSend = ctx.createGain();
    sfxSend.gain.value = SFX_REVERB;
    this.sfxBus.connect(sfxSend).connect(this.reverbIn);

    // Écho léger pour la mélodie (retour atténué et filtré).
    this.echoIn = ctx.createGain();
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.33;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2200;
    this.echoIn.connect(delay).connect(tone).connect(feedback).connect(delay);
    const echoOut = ctx.createGain();
    echoOut.gain.value = 0.35;
    tone.connect(echoOut).connect(this.musicBus);

    // Bruit blanc réutilisé par les percussions et les bruitages.
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    // Onde « pulse » à 25 % : un timbre de jeu vidéo plus doux que le carré.
    const harmonics = 24;
    const real = new Float32Array(harmonics);
    const imag = new Float32Array(harmonics);
    for (let n = 1; n < harmonics; n++) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * 0.25) * (1 / (1 + n * 0.08));
    this.pulse = ctx.createPeriodicWave(real, imag);

    this.applyVolumes();
    this.timer = window.setInterval(() => this.schedule(), TICK_MS);
  }

  private impulse(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const k = i / len;
        // Premières réflexions plus denses, puis une queue douce.
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 2.8) * (i < 400 ? i / 400 : 1);
      }
    }
    return buf;
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
    this.musicBus.gain.setTargetAtTime(this.musicVolume * 0.55 * (this.ducked ? 0.35 : 1), t, 0.1);
    this.sfxBus.gain.setTargetAtTime(this.sfxVolume * 0.75, t, 0.05);
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
      pads: padChords(song),
      drums: song.drums.trim().split(/\s+/),
      length: voiceLength(song.lead),
      step: 0,
      nextTime: now + 0.1,
      stepS: stepSeconds(song.bpm),
      leadLevel: song.leadLevel,
      padLevel: song.padLevel ?? 0.5,
    };
  }

  /** Programme les notes des prochaines millisecondes (avance de 150 ms). */
  private schedule(): void {
    const p = this.playing;
    if (!this.ctx || !p) return;
    while (p.nextTime < this.ctx.currentTime + LOOKAHEAD_S) {
      const t = p.nextTime;
      // Petites variations de volume : le jeu sonne moins « mécanique ».
      const human = 0.85 + Math.random() * 0.3;
      for (const n of p.lead) if (n.step === p.step) this.lead(p.gain, n.hz, t, n.length * p.stepS, 0.07 * p.leadLevel * human);
      for (const n of p.bass) if (n.step === p.step) this.bass(p.gain, n.hz, t, n.length * p.stepS * 0.95);
      for (const chord of p.pads) for (const n of chord) if (n.step === p.step) this.pad(p.gain, n.hz, t, n.length * p.stepS, 0.022 * p.padLevel);
      const d = p.drums[p.step];
      if (d === 'k') this.kick(p.gain, t, 0.32 * human);
      else if (d === 's') this.snare(p.gain, t, human);
      else if (d === 'h') this.noiseHit(p.gain, t, 0.035, 0.03 * human, 8000, 'highpass');
      p.step = (p.step + 1) % p.length;
      p.nextTime += p.stepS;
    }
  }

  // ---------- Instruments ----------

  /** Mélodie : deux « pulses » légèrement désaccordées, filtre qui se referme, vibrato tardif, écho. */
  private lead(dest: AudioNode, hz: number, t: number, dur: number, level: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.pulse || !this.echoIn) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.012);
    g.gain.setTargetAtTime(level * 0.7, t + 0.03, 0.1);
    g.gain.setTargetAtTime(0, t + Math.max(0.04, dur * 0.92 - 0.03), 0.04);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(4200, t);
    filter.frequency.setTargetAtTime(1800, t + 0.02, 0.15);
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.5;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.setTargetAtTime(hz * 0.006, t + 0.18, 0.15);
    vibrato.connect(depth);
    for (const detune of [-6, 6]) {
      const osc = ctx.createOscillator();
      osc.setPeriodicWave(this.pulse);
      osc.frequency.setValueAtTime(hz, t);
      osc.detune.value = detune;
      depth.connect(osc.frequency);
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + dur + 0.3);
    }
    vibrato.start(t);
    vibrato.stop(t + dur + 0.3);
    filter.connect(g);
    g.connect(dest);
    g.connect(this.echoIn);
  }

  /** Basse : triangle et sinus une octave en dessous, attaque nette. */
  private bass(dest: AudioNode, hz: number, t: number, dur: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.008);
    g.gain.setTargetAtTime(0.15, t + 0.02, 0.12);
    g.gain.setTargetAtTime(0, t + Math.max(0.04, dur - 0.04), 0.03);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    for (const [type, mult, lvl] of [['triangle', 1, 1], ['sine', 0.5, 0.6]] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(hz * mult, t);
      const og = ctx.createGain();
      og.gain.value = lvl;
      osc.connect(og).connect(filter);
      osc.start(t);
      osc.stop(t + dur + 0.2);
    }
    filter.connect(g).connect(dest);
  }

  /** Nappe d'accords : dents de scie très filtrées, attaque et relâche lentes. */
  private pad(dest: AudioNode, hz: number, t: number, dur: number, level: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + Math.min(0.4, dur * 0.4));
    g.gain.setTargetAtTime(0, t + dur * 0.85, 0.25);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    for (const detune of [-8, 8]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(hz, t);
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + dur + 1.2);
    }
    filter.connect(g).connect(dest);
  }

  /** Simple voix enveloppée (bruitages mélodiques, gong…). */
  private voice(dest: AudioNode, type: OscillatorType, hz: number, t: number, dur: number, level: number, cutoff: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, t);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.008);
    g.gain.setTargetAtTime(level * 0.6, t + 0.02, 0.08);
    g.gain.setTargetAtTime(0, t + Math.max(0.03, dur - 0.04), dur > 0.6 ? 0.25 : 0.04);
    osc.connect(filter).connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + dur + 1);
  }

  /** Clochette : sinus et partiel inharmonique, longue décroissance (étoiles, cristaux, magie). */
  private bell(dest: AudioNode, hz: number, t: number, level: number, decay = 0.9): void {
    const ctx = this.ctx;
    if (!ctx) return;
    for (const [mult, lvl] of [[1, 1], [2.76, 0.35], [5.4, 0.12]] as const) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz * mult, t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(level * lvl, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0005, t + decay / mult ** 0.3);
      osc.connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + decay + 0.1);
    }
  }

  private kick(dest: AudioNode, t: number, level = 0.32): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + 0.22);
    // Petit clic d'attaque.
    this.noiseHit(dest, t, 0.012, level * 0.25, 3000, 'lowpass');
  }

  private snare(dest: AudioNode, t: number, human: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.noiseHit(dest, t, 0.14, 0.08 * human, 2200, 'bandpass');
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08 * human, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  private noiseHit(dest: AudioNode, t: number, dur: number, level: number, freq: number, type: BiquadFilterType, q = 1): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  /** Souffle filtré dont le filtre glisse (vent, ailes, fumée, tourbillon). */
  private whoosh(dest: AudioNode, t: number, dur: number, level: number, from: number, to: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.5;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  /** Petite suite de notes (jingles) : pulse douce, ou clochettes. */
  private notes(hzs: number[], gap: number, dur: number, level: number, bells = false): void {
    if (!this.ctx || !this.sfxBus) return;
    const t0 = this.ctx.currentTime;
    hzs.forEach((hz, i) => {
      if (bells) this.bell(this.sfxBus!, hz, t0 + i * gap, level, dur);
      else this.chip(this.sfxBus!, hz, t0 + i * gap, dur, level);
    });
  }

  /** Note de jingle : pulse filtrée, sans vibrato. */
  private chip(dest: AudioNode, hz: number, t: number, dur: number, level: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.pulse) return;
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(this.pulse);
    osc.frequency.setValueAtTime(hz, t);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(5000, t);
    f.frequency.setTargetAtTime(2000, t + 0.02, 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.006);
    g.gain.setTargetAtTime(0, t + dur * 0.7, dur * 0.3);
    osc.connect(f).connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.4);
  }

  /** Glissando (montée ou descente de fréquence). */
  private sweep(from: number, to: number, dur: number, type: OscillatorType, level: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.01);
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
    const n = (midi: number): number => hzOf(midi);
    switch (id) {
      case 'step':
        // Pas dans l'herbe : un froissement court, un peu différent à chaque fois.
        return this.noiseHit(bus, t, 0.06, 0.035, 500 + Math.random() * 500, 'bandpass', 0.8);
      case 'spark':
        this.sweep(900, 2600, 0.16, 'triangle', 0.09);
        return this.bell(bus, n(91 + Math.floor(Math.random() * 3)), t + 0.05, 0.05, 0.4);
      case 'crate':
        // Bois qui craque : coup sourd, éclats de bois.
        this.noiseHit(bus, t, 0.09, 0.3, 700, 'bandpass', 2);
        this.voice(bus, 'triangle', 160, t, 0.12, 0.25, 800);
        this.noiseHit(bus, t + 0.03, 0.18, 0.12, 2500, 'bandpass', 1.5);
        return;
      case 'food':
        return this.notes([n(81), n(86)], 0.07, 0.14, 0.09);
      case 'chest':
        this.noiseHit(bus, t, 0.2, 0.08, 400, 'lowpass');
        return this.notes([n(72), n(76), n(79), n(84), n(88)], 0.07, 0.6, 0.1, true);
      case 'lantern':
        this.whoosh(bus, t, 0.35, 0.08, 400, 2000);
        return this.notes([n(79), n(86), n(91)], 0.1, 1.1, 0.1, true);
      case 'pop':
        return this.sweep(380, 1100, 0.09, 'sine', 0.2);
      case 'quest':
        return this.notes([n(72), n(76), n(79), n(84), n(79), n(84), n(88)], 0.085, 0.22, 0.09);
      case 'correct':
        this.notes([n(79), n(84)], 0.09, 0.25, 0.1);
        return this.bell(bus, n(96), t + 0.18, 0.06, 0.8);
      case 'wrong':
        // Erreur douce : deux notes descendantes, rondes, sans bruit agressif.
        this.voice(bus, 'sine', n(67), t, 0.22, 0.14, 2000);
        return this.voice(bus, 'sine', n(64), t + 0.16, 0.3, 0.12, 2000);
      case 'tile':
        return this.notes([n(76), n(83)], 0.06, 0.7, 0.1, true);
      case 'door':
        this.noiseHit(bus, t, 0.8, 0.1, 250, 'lowpass');
        this.voice(bus, 'triangle', 70, t, 0.6, 0.12, 300);
        return this.notes([n(67), n(72), n(76), n(79)], 0.14, 1.2, 0.09, true);
      case 'hatch':
        this.whoosh(bus, t, 0.8, 0.07, 300, 3000);
        return this.notes([n(72), n(76), n(79), n(84), n(88), n(91), n(96)], 0.08, 1.4, 0.08, true);
      case 'evolve':
        this.whoosh(bus, t, 1.6, 0.08, 200, 4000);
        this.sweep(200, 1200, 1.4, 'triangle', 0.06);
        return this.notes([n(60), n(64), n(67), n(72), n(76), n(79), n(84), n(88), n(91)], 0.12, 1.6, 0.08, true);
      case 'star':
        return this.notes([n(88), n(95), n(100)], 0.07, 1.2, 0.07, true);
      case 'gong':
        this.bell(bus, 110, t, 0.3, 3);
        this.bell(bus, 166, t, 0.12, 2.4);
        return this.noiseHit(bus, t, 0.05, 0.2, 1500, 'bandpass');
      case 'hitRock':
        this.kick(bus, t, 0.4);
        this.noiseHit(bus, t, 0.18, 0.18, 450, 'lowpass');
        return this.noiseHit(bus, t + 0.02, 0.12, 0.08, 3000, 'bandpass', 2);
      case 'hitPlant':
        this.whoosh(bus, t, 0.22, 0.12, 3500, 900);
        return this.noiseHit(bus, t + 0.12, 0.1, 0.1, 1200, 'bandpass', 2);
      case 'hitSun':
        this.sweep(500, 1900, 0.28, 'sawtooth', 0.05);
        return this.notes([n(84), n(88), n(91)], 0.04, 0.6, 0.06, true);
      case 'hitStar':
        return this.notes([n(91), n(96), n(100), n(103)], 0.045, 0.9, 0.08, true);
      case 'monsterHit':
        this.kick(bus, t, 0.3);
        return this.sweep(320, 110, 0.16, 'triangle', 0.1);
      case 'super':
        return this.notes([n(84), n(88), n(91), n(96)], 0.05, 0.5, 0.08, true);
      case 'poof':
        this.whoosh(bus, t, 0.45, 0.16, 2400, 500);
        return this.sweep(600, 200, 0.2, 'sine', 0.08);
      case 'victory': {
        // Petite fanfare : arpège, puis accord tenu.
        this.notes([n(72), n(76), n(79), n(84)], 0.11, 0.25, 0.09);
        for (const m of [72, 76, 79, 84]) this.chip(bus, n(m), t + 0.5, 0.9, 0.05);
        return this.bell(bus, n(96), t + 0.5, 0.06, 1.2);
      }
      case 'defeat':
        // Doux et rassurant, pas triste.
        for (const [i, m] of [72, 70, 69, 67].entries()) this.voice(bus, 'triangle', n(m), t + i * 0.2, 0.4, 0.1, 1800);
        return;
      case 'split':
        this.sweep(300, 900, 0.2, 'sine', 0.2);
        return this.whoosh(bus, t, 0.35, 0.12, 600, 2000);
      case 'rumble':
        this.voice(bus, 'sawtooth', 42, t, 1.6, 0.16, 180);
        return this.noiseHit(bus, t, 1.4, 0.25, 140, 'lowpass');
      case 'wings':
        return this.whoosh(bus, t, 0.4, 0.2, 250, 700);
      case 'roar':
        this.sweep(190, 65, 1.1, 'sawtooth', 0.12);
        this.sweep(140, 55, 1.1, 'square', 0.05);
        return this.noiseHit(bus, t, 1.0, 0.14, 450, 'bandpass');
      case 'shatter':
        this.noiseHit(bus, t, 0.5, 0.22, 5000, 'highpass');
        for (let i = 0; i < 7; i++) this.bell(bus, n(88 + Math.floor(Math.random() * 14)), t + i * 0.035, 0.05, 0.7);
        return;
      case 'knock':
        this.noiseHit(bus, t, 0.07, 0.35, 380, 'bandpass', 3);
        return this.voice(bus, 'sine', 120, t, 0.08, 0.2, 400);
      case 'chime':
        return this.notes([n(88), n(93), n(96)], 0.12, 1.4, 0.09, true);
    }
  }

  dispose(): void {
    clearInterval(this.timer);
    void this.ctx?.close();
  }
}

/** Son du jeu (un seul pour toute l'appli). */
export const audio = new AudioEngine();
