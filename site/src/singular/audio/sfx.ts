// Synthesised sound effects. Short, soft, musical (they sit in the same key as the score).
import { audio, midiHz } from './audio';
import { music } from './music';

type Wave = OscillatorType;

function env(g: GainNode, t: number, a: number, peak: number, d: number, sustain = 0, r = 0.08): number {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(1e-4, sustain || 1e-4), t + a + d);
  if (sustain) g.gain.exponentialRampToValueAtTime(1e-4, t + a + d + r);
  return t + a + d + r;
}

function tone(freq: number, o: { wave?: Wave; at?: number; a?: number; d?: number; vol?: number; detune?: number; glideTo?: number; reverb?: number; pan?: number; filter?: number } = {}): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const t = (o.at ?? 0) + ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = o.wave ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t + (o.a ?? 0.005) + (o.d ?? 0.2));
  if (o.detune) osc.detune.value = o.detune;
  const g = ctx.createGain();
  const end = env(g, t, o.a ?? 0.005, o.vol ?? 0.2, o.d ?? 0.2);
  let node: AudioNode = osc;
  if (o.filter) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = o.filter;
    node.connect(f); node = f;
  }
  const p = ctx.createStereoPanner();
  p.pan.value = o.pan ?? 0;
  node.connect(g).connect(p).connect(audio.buses.sfx);
  if (o.reverb) {
    const s = ctx.createGain(); s.gain.value = o.reverb;
    p.connect(s).connect(audio.reverbSend);
  }
  osc.start(t);
  osc.stop(end + 0.05);
}

let noiseBuf: AudioBuffer | null = null;
function noise(o: { at?: number; dur?: number; vol?: number; from?: number; to?: number; q?: number; type?: BiquadFilterType; reverb?: number }): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = (o.at ?? 0) + ctx.currentTime;
  const dur = o.dur ?? 0.4;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.Q.value = o.q ?? 1.2;
  f.frequency.setValueAtTime(o.from ?? 400, t);
  f.frequency.exponentialRampToValueAtTime(o.to ?? 2400, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(o.vol ?? 0.15, t + dur * 0.35);
  g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  src.connect(f).connect(g).connect(audio.buses.sfx);
  if (o.reverb) { const s = ctx.createGain(); s.gain.value = o.reverb; g.connect(s).connect(audio.reverbSend); }
  src.start(t);
  src.stop(t + dur + 0.05);
}

// Effects use the score's notes. The score starts in D Dorian; each act moves its key centre and mode,
// so D (the tonic near D4) and the two-octave scale are read from the music when an effect plays.
let D = 62;
let scale = [0, 2, 3, 5, 7, 9, 10, 12, 14, 15, 17, 19];
function inKey(): void {
  const k = music.tonality();
  D = k.tonic;
  scale = [...k.scale, ...k.scale.slice(0, 5).map((x) => x + 12)];
}
let lastTick = 0;

export const sfx = {
  hover(): void { inKey(); tone(midiHz(D + 24 + 7), { vol: 0.03, d: 0.05, wave: 'sine' }); },
  click(): void { inKey(); tone(midiHz(D + 19), { vol: 0.08, d: 0.07, wave: 'triangle' }); tone(midiHz(D + 26), { vol: 0.04, d: 0.05, at: 0.02 }); },
  back(): void { inKey(); tone(midiHz(D + 14), { vol: 0.07, d: 0.08, wave: 'triangle' }); },
  open(): void { inKey(); [0, 4, 7].forEach((s, i) => tone(midiHz(D + 12 + scale[s]), { vol: 0.05, d: 0.25, at: i * 0.04, reverb: 0.4 })); },
  /** A soft tick as a dragged point crosses whole-number positions. Pitch follows height. */
  tick(level = 0): void {
    const ctx = audio.ctx;
    if (!ctx || ctx.currentTime - lastTick < 0.03) return;
    inKey();
    lastTick = ctx.currentTime;
    const idx = Math.max(0, Math.min(scale.length - 1, 4 + Math.round(level)));
    tone(midiHz(D + 12 + scale[idx]), { vol: 0.05, d: 0.06, wave: 'triangle', filter: 3000 });
  },
  snap(): void { inKey(); tone(midiHz(D + 24), { vol: 0.07, d: 0.09, wave: 'sine' }); },
  /** Correct move / goal reached. */
  success(): void {
    inKey();
    [0, 2, 4, 7].forEach((s, i) => tone(midiHz(D + 12 + scale[s]), { vol: 0.09, d: 0.9, at: i * 0.07, wave: 'triangle', reverb: 0.6, pan: (i - 1.5) * 0.3 }));
    tone(midiHz(D + 36), { vol: 0.03, d: 1.2, at: 0.28, reverb: 0.8 });
  },
  /** Big completion (puzzle solved). */
  solved(): void {
    inKey();
    const chord = [0, 4, 7, 9, 11];
    chord.forEach((s, i) => tone(midiHz(D + scale[s % scale.length] + 12), { vol: 0.08, d: 1.8, at: i * 0.09, wave: 'triangle', reverb: 0.7, pan: (i - 2) * 0.25 }));
    tone(midiHz(D - 12), { vol: 0.14, d: 1.6, wave: 'sine', reverb: 0.3 });
    noise({ from: 6000, to: 12000, dur: 1.2, vol: 0.02, type: 'highpass', reverb: 0.6 });
  },
  /** Not right (gentle, never harsh). */
  miss(): void { inKey(); tone(midiHz(D - 5), { vol: 0.09, d: 0.22, wave: 'sine' }); tone(midiHz(D - 6), { vol: 0.06, d: 0.25, wave: 'triangle', at: 0.06, filter: 900 }); },
  /** The grid moving under a matrix. */
  whoosh(dur = 1.2): void { inKey(); noise({ from: 220, to: 2600, dur, vol: 0.06, q: 0.8, reverb: 0.5 }); tone(midiHz(D - 12), { vol: 0.05, d: dur, glideTo: midiHz(D), wave: 'sine' }); },
  /** Space squashed flat (det = 0). */
  collapse(): void {
    inKey();
    tone(midiHz(D), { vol: 0.12, d: 1.4, glideTo: midiHz(D - 24), wave: 'sawtooth', filter: 900, reverb: 0.5 });
    noise({ from: 3000, to: 120, dur: 1.4, vol: 0.08, type: 'lowpass', q: 0.7, reverb: 0.5 });
  },
  /** A new idea named / codex entry. */
  discover(): void {
    inKey();
    [7, 9, 11, 14].forEach((s, i) => tone(midiHz(D + 12 + (scale[s % scale.length] ?? 0) + (s >= 12 ? 12 : 0)), { vol: 0.05, d: 1.6, at: i * 0.12, wave: 'sine', reverb: 0.9 }));
  },
  star(i = 0): void { inKey(); tone(midiHz(D + 24 + scale[[0, 2, 4][i] ?? 4]), { vol: 0.08, d: 0.7, wave: 'triangle', reverb: 0.6 }); },
  thrust(dur = 0.6): void { noise({ from: 180, to: 700, dur, vol: 0.07, q: 0.6, type: 'lowpass' }); },
  warp(): void { inKey(); tone(midiHz(D - 12), { vol: 0.1, d: 1.6, glideTo: midiHz(D + 24), wave: 'sawtooth', filter: 2400, reverb: 0.6 }); noise({ from: 200, to: 8000, dur: 1.6, vol: 0.05, reverb: 0.6 }); },
  type(): void { inKey(); tone(midiHz(D + 31), { vol: 0.012, d: 0.02, wave: 'square', filter: 2000 }); },
  /**
   * A navigation pulse (Chapter 18). GDD §10.2: one held note stays fixed while the others glide, the way the
   * kept line stays put while everything else is moved.
   */
  pulse(dur = 0.8): void {
    inKey();
    noise({ from: 160, to: 1900, dur, vol: 0.05, q: 0.7, reverb: 0.5 });
    tone(midiHz(D), { wave: 'sine', vol: 0.08, a: 0.03, d: dur, reverb: 0.5 });
    tone(midiHz(D + 12 + scale[4]), { wave: 'triangle', vol: 0.035, a: 0.03, d: dur, glideTo: midiHz(D + 12 + scale[4] + 3), reverb: 0.4, filter: 2600, pan: 0.3 });
    tone(midiHz(D + 12 + scale[2]), { wave: 'triangle', vol: 0.035, a: 0.03, d: dur, glideTo: midiHz(D + 12 + scale[2] - 2), reverb: 0.4, filter: 2600, pan: -0.3 });
  },
  /** The trajectory stayed on its line: a bright, open fifth that rings. */
  align(): void {
    inKey();
    [0, 7, 12].forEach((s, i) => tone(midiHz(D + 12 + s), { wave: 'sine', vol: 0.065, a: 0.03, d: 1.2, at: i * 0.035, reverb: 0.85, pan: (i - 1) * 0.4 }));
    tone(midiHz(D + 36), { vol: 0.025, d: 1, at: 0.14, reverb: 0.9 });
  },
  /** The trajectory was turned off its line: two soft falling tones (amber, never harsh). */
  offcourse(): void {
    inKey();
    tone(midiHz(D + 10), { wave: 'triangle', vol: 0.06, d: 0.18, filter: 1600, glideTo: midiHz(D + 8) });
    tone(midiHz(D + 7), { wave: 'triangle', vol: 0.05, d: 0.26, at: 0.16, filter: 1400, glideTo: midiHz(D + 5) });
  },
  /** The ship passes through the Anchor (a reversing pulse). */
  flip(): void {
    inKey();
    tone(midiHz(D + 19), { wave: 'sine', vol: 0.05, d: 0.32, glideTo: midiHz(D + 7), reverb: 0.5, pan: 0.4 });
    tone(midiHz(D + 7), { wave: 'sine', vol: 0.05, d: 0.32, at: 0.04, glideTo: midiHz(D + 19), reverb: 0.5, pan: -0.4 });
  },
  /** A waypoint reached: a docking thump under a rising chord. */
  arrive(): void {
    inKey();
    noise({ from: 900, to: 120, dur: 0.35, vol: 0.07, type: 'lowpass', q: 0.8 });
    [0, 4, 7, 9].forEach((s, i) => tone(midiHz(D + 12 + scale[s]), { wave: 'triangle', vol: 0.08, d: 1.3, at: 0.08 + i * 0.06, reverb: 0.7, pan: (i - 1.5) * 0.3 }));
    tone(midiHz(D - 12), { vol: 0.1, d: 1.4, at: 0.08, reverb: 0.4 });
  },
  alarm(): void { inKey(); [0, 0.5].forEach((at) => tone(midiHz(D + 7), { vol: 0.07, d: 0.3, at, wave: 'square', filter: 1400, glideTo: midiHz(D + 5) })); },
};
