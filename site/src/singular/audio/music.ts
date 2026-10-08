// Generative, adaptive score. Each mood (title, explore, puzzle, tension, triumph, void) is a key, a few
// chord progressions, a few arpeggio patterns and a texture (pad, bass, arpeggio, bells, pulse).
// Each act of the story colours the moods (setAct): it moves the key centre, picks the mode and the
// progressions, and sets how much space, pulse or clockwork the texture has. Inside a loop the music
// varies by phrase: an A A B A form, arpeggio patterns that change every two chords, sus/add9/quartal
// substitutions and voice-led pads, all drawn from a random stream seeded per session, act and mood.
// The main theme ("Every move has a rule") plays softly on the title, in triumph, and as a fragment in
// the void. The scheduler looks ahead and places notes on the AudioContext clock, so timing is exact;
// mood and act changes land on chord boundaries. setIntensity() thickens the texture during hard
// puzzles; stinger() marks a win with the head of the theme.
import { audio, midiHz } from './audio';

export interface Mood {
  root: number;            // MIDI note of the key centre (home key; acts transpose it)
  scale: number[];         // semitone offsets (the mood's own mode; acts may swap it)
  chords: number[][];      // main progression: scale-degree indices (≥ scale.length wraps up an octave)
  beatsPerChord: number;
  bpm: number;
  padCutoff: number;
  padVol: number;
  bassVol: number;
  arp: number[];           // chord-tone indices per 16th; -1 = rest
  arpVol: number;
  arpOct: number;
  bellProb: number;
  pulse: number;           // 0 = none; >0 = soft eighth-note pulse level
  wave: OscillatorType;    // pad oscillator ('sawtooth' plays a softened saw)
  variants?: number[][][]; // more progressions; `chords` is variant 0
  arps?: number[][];       // more arpeggio patterns; `arp` is pattern 0
  voiceLead?: boolean;     // re-voice each chord near the last one (else play it as written)
  bassWalk?: number;       // chance the bass steps to the fifth halfway through a chord
  air?: number;            // level of a soft filtered-noise layer
}

type MoodName = 'title' | 'explore' | 'puzzle' | 'tension' | 'triumph' | 'void';

const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const IONIAN = [0, 2, 4, 5, 7, 9, 11];
const MIXOLYDIAN = [0, 2, 4, 5, 7, 9, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];

export const MOODS: Record<string, Mood> = {
  // wide, slow, hopeful
  title: {
    root: 50, scale: LYDIAN, beatsPerChord: 8, bpm: 64, padCutoff: 1500, padVol: 0.07, bassVol: 0.08, arpVol: 0.028, arpOct: 2, bellProb: 0.12, pulse: 0, wave: 'sawtooth', voiceLead: true, bassWalk: 0.15,
    chords: [[0, 2, 4, 6], [1, 3, 5, 7], [5, 7, 9, 11], [4, 6, 8, 10]],           // I II vi V
    variants: [[[0, 2, 4, 6], [4, 6, 8, 10], [5, 7, 9, 11], [1, 3, 5, 7]],          // I V vi II
      [[0, 2, 4, 6], [2, 4, 6, 8], [1, 3, 5, 7], [0, 2, 4, 8]]],                    // I iii II I(add9)
    arp: [0, -1, 2, -1, 4, -1, 3, -1, 6, -1, 4, -1, 2, -1, 3, -1],
    arps: [[0, -1, 3, -1, 5, -1, 4, -1, 2, -1, 4, -1, 6, -1, 5, -1], [2, -1, 4, -1, 3, -1, 5, -1, 4, -1, 2, -1, 1, -1, -1, -1]],
  },
  // calm exploring, Dorian
  explore: {
    root: 50, scale: DORIAN, beatsPerChord: 8, bpm: 72, padCutoff: 1200, padVol: 0.06, bassVol: 0.08, arpVol: 0.025, arpOct: 2, bellProb: 0.07, pulse: 0, wave: 'sawtooth', voiceLead: true, bassWalk: 0.25,
    chords: [[0, 2, 4, 6], [3, 5, 7, 9], [6, 8, 10, 12], [4, 6, 8, 10]],          // i IV VII v
    variants: [[[0, 2, 4, 6], [6, 8, 10, 12], [2, 4, 6, 8], [3, 5, 7, 9]],          // i VII III IV
      [[0, 2, 4, 6], [1, 3, 5, 7], [3, 5, 7, 9], [0, 2, 4, 8]]],                    // i ii IV i(add9)
    arp: [0, -1, -1, 2, -1, -1, 4, -1, 3, -1, -1, 1, -1, -1, 2, -1],
    arps: [
      [0, -1, -1, 3, -1, -1, 5, -1, 4, -1, -1, 2, -1, -1, 3, -1],                   // 1: same rhythm, higher line
      [2, -1, -1, 4, -1, -1, 1, -1, 3, -1, -1, 0, -1, -1, -1, -1],                  // 2: falling, a breath at the end
      [0, -1, -1, -1, -1, -1, 4, -1, -1, -1, 3, -1, -1, -1, -1, -1],                // 3: sparse (Drift)
      [4, -1, 4, -1, -1, -1, 2, -1, 4, -1, 4, -1, -1, -1, 3, -1],                   // 4: a beacon (Signal)
      [0, -1, 2, -1, 1, -1, 2, -1, 0, -1, 2, -1, 1, -1, 3, -1],                     // 5: clockwork eighths (Ledger)
    ],
  },
  // focused puzzle: sparse, gentle, never busy (no pattern is denser than the first)
  puzzle: {
    root: 50, scale: DORIAN, beatsPerChord: 8, bpm: 80, padCutoff: 900, padVol: 0.05, bassVol: 0.07, arpVol: 0.018, arpOct: 2, bellProb: 0.04, pulse: 0, wave: 'sawtooth', voiceLead: true, bassWalk: 0,
    chords: [[0, 2, 4, 7], [5, 7, 9, 11], [3, 5, 7, 9], [4, 6, 8, 11]],
    variants: [[[0, 2, 4, 7], [2, 4, 6, 9], [3, 5, 7, 9], [0, 2, 4, 8]],            // i III IV i(add9)
      [[0, 2, 4, 7], [4, 6, 8, 11], [6, 8, 10, 13], [3, 5, 7, 10]]],                // i v VII IV
    arp: [0, -1, 4, -1, 2, -1, 4, -1, 1, -1, 4, -1, 2, -1, 3, -1],
    arps: [
      [0, -1, -1, -1, 4, -1, 2, -1, -1, -1, 3, -1, -1, -1, 1, -1],
      [2, -1, 4, -1, -1, -1, 3, -1, 1, -1, -1, -1, 0, -1, -1, -1],
      [0, -1, -1, -1, -1, -1, -1, -1, 4, -1, -1, -1, -1, -1, 2, -1],
    ],
  },
  // something is wrong
  tension: {
    root: 50, scale: AEOLIAN, beatsPerChord: 4, bpm: 96, padCutoff: 800, padVol: 0.06, bassVol: 0.1, arpVol: 0.022, arpOct: 1, bellProb: 0.02, pulse: 0.05, wave: 'sawtooth', voiceLead: true, bassWalk: 0.15,
    chords: [[0, 2, 4, 6], [5, 7, 9, 11], [1, 3, 5, 8], [4, 6, 8, 11]],
    variants: [[[0, 2, 4, 6], [3, 5, 7, 9], [5, 7, 9, 11], [4, 6, 8, 11]],          // i iv VI v
      [[0, 2, 4, 6], [6, 8, 10, 12], [5, 7, 9, 11], [4, 6, 8, 10]]],                // i VII VI v
    arp: [0, 0, -1, 2, -1, 0, 4, -1, 0, -1, 3, -1, 0, 2, -1, 1],
    arps: [[0, -1, 0, 2, -1, 0, 3, -1, 0, -1, 4, -1, 0, 2, -1, 3], [0, -1, 2, 0, -1, 2, 4, -1, 0, -1, 2, -1, 1, -1, 3, -1]],
  },
  // resolution
  triumph: {
    root: 50, scale: IONIAN, beatsPerChord: 8, bpm: 76, padCutoff: 2000, padVol: 0.07, bassVol: 0.09, arpVol: 0.025, arpOct: 2, bellProb: 0.15, pulse: 0, wave: 'sawtooth', voiceLead: true, bassWalk: 0.3,
    chords: [[0, 2, 4, 7], [4, 6, 8, 11], [5, 7, 9, 12], [3, 5, 7, 9]],           // I V vi IV
    variants: [[[0, 2, 4, 7], [3, 5, 7, 10], [5, 7, 9, 12], [4, 6, 8, 11]],         // I IV vi V
      [[0, 2, 4, 7], [2, 4, 6, 9], [3, 5, 7, 10], [4, 6, 8, 11]]],                  // I iii IV V
    arp: [0, 2, 4, 7, 4, 2, 0, 2, 4, 7, 9, 7, 4, 2, 4, 2],
    arps: [[0, 4, 2, 4, 7, 4, 2, 4, 0, 4, 2, 4, 9, 7, 4, 2], [4, 2, 0, 2, 4, 7, 4, 2, 5, 4, 2, 4, 7, 4, 2, 0]],
  },
  // the dark middle of the story: open fifths, a tritone, air
  void: {
    root: 45, scale: AEOLIAN, beatsPerChord: 8, bpm: 58, padCutoff: 600, padVol: 0.07, bassVol: 0.11, arpVol: 0.02, arpOct: 2, bellProb: 0.05, pulse: 0, wave: 'sawtooth', air: 0.055,
    chords: [[0, 4, 7], [5, 8, 12], [3, 7, 10], [6, 10, 13]],
    variants: [[[0, 4, 7], [3, 7, 10], [5, 9, 12], [4, 7, 11]], [[0, 4, 7], [6, 10, 13], [5, 9, 12], [0, 3, 7]]],
    arp: [0, -1, -1, -1, -1, -1, 4, -1, -1, -1, -1, -1, 2, -1, -1, -1],
    arps: [[-1, -1, -1, -1, 2, -1, -1, -1, -1, -1, 0, -1, -1, -1, -1, -1], [0, -1, -1, -1, -1, -1, -1, -1, 1, -1, -1, -1, -1, -1, 4, -1]],
  },
};

// ------------------------------------------------------------------ acts

/** How one act of the story colours the moods. */
interface ActColour {
  shift: number;                                     // semitones from the home key (D)
  mode?: Partial<Record<MoodName, number[]>>;        // scale per mood (else the mood's own)
  v: number;                                         // progression choice: A = variant (v + mood offset) % 3, B = the next one
  prog?: Partial<Record<MoodName, [number, number]>>; // explicit [A, B] progression variants
  arps?: Partial<Record<MoodName, number[]>>;        // arpeggio pool (first entry opens the piece)
  tempo: number;                                     // bpm factor (puzzles never speed up)
  bright: number;                                    // pad cutoff factor
  space: number;                                     // 0..1: rests in the arpeggio, more reverb
  sus: number;                                       // chance of a sus/add9 colour on a chord
  quartal?: boolean;                                 // colours stack fourths (cold, open)
  bells?: number;                                    // bell chance factor
  tick?: number;                                     // clockwork escapement level (explore, tension)
  beat?: Partial<Record<MoodName, number>>;          // heartbeat level per mood
  motif?: number;                                    // chance the theme surfaces in explore's B phrase
}

const HOME: ActColour = { shift: 0, v: 0, tempo: 1, bright: 1, space: 0.15, sus: 0.2 };

// Indices are the acts in content/acts.ts (0 Prologue … 10 Epilogue). Keys: D E C F B♭ C♯ E♭ E F♯ G D.
// The story leaves home, darkens through Collapse and the Wrong Grid, climbs E → F♯ → G through
// acts 7–9, and lands back in D (a plagal IV → I) for the Epilogue.
const ACTS: Record<number, ActColour> = {
  // Prologue, the first pulse: home key, bright Lydian wonder; a faint heartbeat under the void
  0: { shift: 0, v: 0, mode: { explore: LYDIAN, void: DORIAN }, tempo: 1, bright: 1.05, space: 0.2, sus: 0.25, beat: { void: 0.03 } },
  // Drift: cold and spacious; fourths instead of thirds, rests, slower, more glints
  1: { shift: 2, v: 1, mode: { triumph: LYDIAN }, arps: { explore: [3, 2, 3], puzzle: [3, 1], title: [2, 0] }, tempo: 0.94, bright: 0.82, space: 0.6, sus: 0.5, quartal: true, bells: 1.5 },
  // Signal: measuring space; clear Mixolydian, a beacon of repeated notes
  2: { shift: -2, v: 2, mode: { explore: MIXOLYDIAN }, arps: { explore: [4, 0, 4, 1] }, tempo: 1, bright: 1.05, space: 0.2, sus: 0.2 },
  // The Ledger: clockwork; steady eighths and a soft escapement tick
  3: { shift: 3, v: 1, prog: { explore: [2, 0] }, arps: { explore: [5, 5, 1], puzzle: [0, 1], tension: [1, 0] }, tempo: 1.04, bright: 0.95, space: 0.05, sus: 0.12, tick: 0.1 },
  // The Pulse: moving space; driving Mixolydian over a heartbeat
  4: { shift: -4, v: 2, mode: { explore: MIXOLYDIAN }, tempo: 1.05, bright: 1, space: 0.15, sus: 0.25, beat: { explore: 0.03 } },
  // Collapse: darker; Aeolian and Phrygian
  5: { shift: -1, v: 1, mode: { title: DORIAN, explore: AEOLIAN, puzzle: AEOLIAN, tension: PHRYGIAN, void: PHRYGIAN }, tempo: 0.97, bright: 0.85, space: 0.35, sus: 0.3, bells: 0.6 },
  // The Wrong Grid: a semitone off home, Phrygian; it breaks into major at the end
  6: { shift: 1, v: 0, mode: { title: DORIAN, explore: PHRYGIAN, puzzle: AEOLIAN, tension: PHRYGIAN, void: PHRYGIAN }, prog: { explore: [1, 2] }, tempo: 0.98, bright: 0.9, space: 0.3, sus: 0.3, bells: 0.7 },
  // Lines That Hold: building; hope comes back, the theme starts to surface
  7: { shift: 2, v: 2, mode: { triumph: LYDIAN }, tempo: 1, bright: 1, space: 0.2, sus: 0.3, motif: 0.35 },
  // Shadows: building
  8: { shift: 4, v: 1, mode: { triumph: LYDIAN, tension: DORIAN }, tempo: 1.02, bright: 1.05, space: 0.2, sus: 0.35, motif: 0.5 },
  // Singular: the climb; soaring Lydian, the theme often in reach
  9: { shift: 5, v: 0, mode: { explore: LYDIAN, puzzle: LYDIAN, tension: DORIAN, triumph: LYDIAN }, prog: { explore: [1, 2] }, tempo: 1.05, bright: 1.1, space: 0.15, sus: 0.35, motif: 0.7 },
  // Epilogue: home, resolved Ionian
  10: { shift: 0, v: 0, mode: { title: IONIAN, explore: IONIAN, puzzle: IONIAN, tension: DORIAN, void: MIXOLYDIAN }, tempo: 0.96, bright: 1.05, space: 0.3, sus: 0.3, motif: 0.8 },
};
const MOOD_OFFSET: Record<MoodName, number> = { title: 0, explore: 0, puzzle: 1, tension: 2, triumph: 0, void: 1 };

// ------------------------------------------------------------------ the theme

type Phrase = [number, number][]; // [scale degree (0 = tonic, 7 = octave), beats]
// "Every move has a rule": up a fourth, a turn around the octave, and an answer.
const HEAD: Phrase = [[4, 1], [7, 1], [8, 1.5], [6, 0.5], [7, 1], [4, 1]];
const THEME = {
  open: [...HEAD, [5, 2]] as Phrase,          // ends on the sixth, a question (title)
  closed: [...HEAD, [7, 2]] as Phrase,        // comes home (triumph)
  fragment: [[4, 2], [7, 2], [8, 4]] as Phrase, // the first three notes, slowly (void, later acts)
};

// ------------------------------------------------------------------ helpers

const FORM = ['A', 'A', 'B', 'A'];

interface Arrangement {
  name: string;
  act: number;
  m: Mood;
  root: number;
  scale: number[];
  native: boolean;          // the mood's own mode (progressions were written for it)
  progA: number[][];
  progB: number[][];
  arps: number[][];
  pool: number[];
  bpm: number;
  padCutoff: number;
  bellProb: number;
  c: ActColour;
  rng: () => number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: number, key: string): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < key.length; i++) { h = Math.imul(h ^ key.charCodeAt(i), 0x85ebca6b); h ^= h >>> 13; }
  return h >>> 0;
}

function noteOf(a: { root: number; scale: number[] }, degree: number, octave = 0): number {
  const n = a.scale.length;
  const oct = Math.floor(degree / n);
  const idx = ((degree % n) + n) % n;
  return a.root + a.scale[idx] + 12 * (oct + octave);
}

const semis = (a: Arrangement, from: number, to: number) => noteOf(a, to) - noteOf(a, from);
/** A chord written as stacked thirds from its first degree (root position, 7th or octave on top). */
const stacked = (ch: number[]) => ch.length >= 3 && ch[1] === ch[0] + 2 && ch[2] === ch[0] + 4;

/**
 * Outside the mood's own mode a written chord can land on a diminished triad: use the 7th chord a third
 * below (vii° → V7), or a third above if that would repeat the previous chord. An open fifth that has
 * turned into a tritone becomes a fourth.
 */
function fixDim(ch: number[], a: Arrangement, prev: number[]): number[] {
  const d = ch[0];
  if (!stacked(ch)) return ch.map((x) => ((x - d) % 7 === 4 && semis(a, d, x) % 12 === 6 ? x - 1 : x));
  if (semis(a, d, d + 2) !== 3 || semis(a, d, d + 4) !== 6) return ch;
  const r = prev.length && (((prev[0] - (d - 2)) % 7) + 7) % 7 === 0 ? d + 2 : d - 2;
  return [r, r + 2, r + 4, r + 6];
}

/** A colour on a chord: sus2, sus4, add9, or (Drift) stacked fourths. Keeps the chord if none fits. */
function colour(ch: number[], a: Arrangement): number[] {
  if (!stacked(ch)) return ch;
  const d = ch[0];
  if (semis(a, d, d + 2) === 3 && semis(a, d, d + 4) === 6) return ch; // leave diminished colour alone
  const r = a.rng();
  if (a.c.quartal && r < 0.5 && [0, 3, 6].every((k) => semis(a, d + k, d + k + 3) === 5)) return [d, d + 3, d + 6, d + 9];
  if (r < 0.35 && semis(a, d, d + 1) === 2 && !ch.includes(d + 8)) return [d, d + 1, ...ch.slice(2)]; // sus2
  if (r < 0.6 && semis(a, d, d + 3) === 5) return [d, d + 3, ...ch.slice(2)];                   // sus4
  if (semis(a, d, d + 1) === 2) return ch.length > 3 ? [d, d + 2, d + 4, d + 8] : [...ch, d + 8]; // add9
  return ch;
}

/**
 * Re-voice a chord near the previous one (least total movement) inside a register window, pulled
 * towards the window's centre and never with a second between the two lowest voices (mud).
 */
function leadVoices(prev: number[], notes: number[], lo: number, hi: number): number[] {
  const pcs = notes.map((n) => ((n % 12) + 12) % 12);
  const centre = (lo + hi) / 2;
  const cost = (v: number[]) => (prev.length ? v.reduce((s, x) => s + Math.min(...prev.map((p) => Math.abs(p - x))), 0) : 0)
    + 0.3 * Math.abs(v.reduce((s, x) => s + x, 0) / v.length - centre)
    + (v[1] - v[0] < 3 ? 3 : 0);
  let best = notes, bestCost = notes[0] >= lo && notes[notes.length - 1] <= hi ? cost(notes) : Infinity;
  for (let inv = 0; inv < pcs.length; inv++) {
    const order = pcs.slice(inv).concat(pcs.slice(0, inv));
    for (let base = lo; base < lo + 12; base++) {
      if (base % 12 !== order[0]) continue;
      const v = [base];
      for (let j = 1; j < order.length; j++) {
        let x = v[j - 1] + ((order[j] - v[j - 1] % 12 + 12) % 12);
        if (x === v[j - 1]) x += 12;
        v.push(x);
      }
      if (v[v.length - 1] > hi) continue;
      const c = cost(v);
      if (c < bestCost) { best = v; bestCost = c; }
    }
  }
  return best;
}

interface Waves { soft: PeriodicWave; warm: PeriodicWave; flute: PeriodicWave; noise: AudioBuffer }
const waveCache = new WeakMap<BaseAudioContext, Waves>();
function waves(ctx: BaseAudioContext): Waves {
  let w = waveCache.get(ctx);
  if (w) return w;
  const make = (amp: (k: number) => number, n: number) => {
    const real = new Float32Array(n + 1), imag = new Float32Array(n + 1);
    for (let k = 1; k <= n; k++) imag[k] = amp(k);
    return ctx.createPeriodicWave(real, imag);
  };
  const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 3), ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  w = {
    soft: make((k) => (k % 2 ? 1 : -1) / Math.pow(k, 1.35), 40),       // a saw with its top rolled off
    warm: make((k) => [0, 1, 0.42, 0.16, 0.1, 0.05, 0.03][k] ?? 0, 6),   // pluck: round, a little hollow
    flute: make((k) => [0, 1, 0.16, 0.07, 0.025][k] ?? 0, 4),            // the theme's voice
    noise,
  };
  waveCache.set(ctx, w);
  return w;
}

// Level trims that keep each voice's loudness where the old voices were (measured offline).
const PAD_TRIM = 0.57;
const PLUCK_TRIM = 0.9;

// ------------------------------------------------------------------ the scheduler

interface ThemeRun { notes: { at: number; deg: number; len: number }[]; i: number; pos: number; end: number; oct: number; vol: number }
interface Live { end: number; nodes: AudioScheduledSourceNode[] }

class Music {
  private arr: Arrangement | null = null;
  private act = 0;
  private dirty = false;
  private timer: number | null = null;
  private step = 0;              // 16th-note counter within the chord
  private chordNo = 0;           // chords since this arrangement began (its place in the form)
  private chord: number[] = [];  // degrees of the sounding chord
  private voicing: number[] = []; // MIDI notes of the sounding pad
  private arp: number[] = [];
  private arpRest = false;
  private theme: ThemeRun | null = null;
  private nextTime = 0;
  private intensity = 0.3;
  private bus: GainNode | null = null;
  private padBus: GainNode | null = null; // pads go through here so they can make room for the theme
  private live: Live[] = [];
  private sessionSeed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  private streams = new Map<string, () => number>();
  playing = false;
  name = '';

  play(name: keyof typeof MOODS | string): void {
    if (!MOODS[name]) return;
    this.name = name;
    audio.onReady(() => {
      if (!this.playing) {
        this.arr = this.arrange(name, this.act);
        this.start();
      } else {
        this.dirty = true; // switch at the next chord boundary
      }
    });
  }

  /** The story act (content/acts.ts). Takes effect at the next chord boundary, or when music next starts. */
  setAct(n: number): void {
    if (n === this.act) return;
    this.act = n;
    this.dirty = true;
  }

  setIntensity(x: number): void { this.intensity = Math.max(0, Math.min(1, x)); }

  /** Fix the variation seed (tests). Otherwise each session draws its own. */
  seed(n: number): void { this.sessionSeed = n >>> 0; this.streams.clear(); }

  /** The key the score is in (for effects): a tonic near D4 and the seven-note scale from it. */
  tonality(): { tonic: number; scale: number[] } {
    const a = this.arr;
    const tonic = 62 + (ACTS[a ? a.act : this.act] ?? HOME).shift;
    if (!a) return { tonic, scale: DORIAN };
    const pcs = a.scale.map((s) => (((a.root + s - tonic) % 12) + 12) % 12).sort((x, y) => x - y);
    return pcs[0] === 0 && pcs.length === 7 ? { tonic, scale: pcs } : { tonic, scale: DORIAN };
  }

  stop(fadeSec = 2): void {
    if (!audio.ctx || !this.bus) return;
    const t = audio.ctx.currentTime;
    this.bus.gain.setTargetAtTime(0, t, fadeSec / 3);
    const bus = this.bus;
    window.setTimeout(() => { bus.disconnect(); }, fadeSec * 1000 + 200);
    this.bus = null;
    this.padBus = null;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.playing = false;
    this.theme = null;
    this.voicing = [];
    for (const l of this.live) if (l.end > t + fadeSec) l.nodes.forEach((o) => { try { o.stop(t + fadeSec); } catch { /* already stopped */ } });
    this.live = [];
  }

  private start(): void {
    const ctx = audio.ctx!;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0;
    this.bus.gain.setTargetAtTime(1, ctx.currentTime, 1.2);
    this.bus.connect(audio.buses.music);
    this.padBus = ctx.createGain();
    this.padBus.connect(this.bus);
    this.playing = true;
    this.dirty = false;
    this.step = 0;
    this.chordNo = 0;
    this.theme = null;
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 50);
  }

  private stream(act: number, name: string): () => number {
    const key = `${act}:${name}`;
    let r = this.streams.get(key);
    if (!r) { r = mulberry32(hashSeed(this.sessionSeed, key)); this.streams.set(key, r); }
    return r;
  }

  private arrange(name: string, act: number): Arrangement {
    const m = MOODS[name];
    const mood = name as MoodName;
    const c = ACTS[act] ?? HOME;
    const scale = c.mode?.[mood] ?? m.scale;
    const progs = [m.chords, ...(m.variants ?? [])];
    const k = progs.length;
    const [ia, ib] = c.prog?.[mood] ?? [(c.v + (MOOD_OFFSET[mood] ?? 0)) % k, (c.v + (MOOD_OFFSET[mood] ?? 0) + 1) % k];
    const arps = [m.arp, ...(m.arps ?? [])];
    const def = name === 'puzzle' ? [1, 0, 2] : name === 'explore' ? [0, 1, 2] : arps.map((_, i) => i);
    const pool = (c.arps?.[mood] ?? def).filter((i) => i < arps.length);
    const tempo = name === 'puzzle' ? Math.min(1, c.tempo) : c.tempo;
    return {
      name, act, m, root: m.root + c.shift, scale, native: scale === m.scale,
      progA: progs[ia % k], progB: progs[ib % k], arps, pool: pool.length ? pool : [0],
      bpm: m.bpm * tempo, padCutoff: m.padCutoff * c.bright, bellProb: m.bellProb * (c.bells ?? 1), c,
      rng: this.stream(act, name),
    };
  }

  private schedule(): void {
    const ctx = audio.ctx;
    if (!ctx || !this.arr || !this.bus) return;
    while (this.nextTime < ctx.currentTime + 0.25) {
      this.playStep(this.nextTime);
      this.nextTime += 60 / this.arr.bpm / 4;
    }
  }

  private playStep(t: number): void {
    if (this.step === 0) {
      if (this.dirty) {
        this.dirty = false;
        const cur = this.arr!;
        if (this.name !== cur.name || this.act !== cur.act) {
          this.arr = this.arrange(this.name, this.act);
          this.chordNo = 0;
          this.theme = null;
        }
      }
      this.chordStart(t);
    }
    const a = this.arr!, m = a.m, r = a.rng;
    const s = this.step;
    const sixteenth = 60 / a.bpm / 4;
    const chord = this.chord;

    // the theme, note by note (it stops if the music changes under it)
    const th = this.theme;
    if (th) {
      while (th.i < th.notes.length && th.notes[th.i].at === th.pos) {
        const nt = th.notes[th.i++];
        this.lead(noteOf(a, nt.deg, th.oct), t, nt.len * sixteenth, th.vol);
      }
      if (++th.pos >= th.end) this.theme = null;
    }
    const singing = th !== null;

    // arpeggio, density follows intensity; it steps back while the theme sings
    const ai = this.arp[s % this.arp.length];
    if (ai >= 0 && !this.arpRest) {
      const keep = (s % 4 === 0 ? 1 : 0.45 + 0.55 * this.intensity) * (singing ? 0.5 : 1);
      if (r() < keep) {
        const tone = chord[ai % chord.length] + (ai >= chord.length ? a.scale.length : 0);
        this.pluck(noteOf(a, tone, m.arpOct), t, m.arpVol * (0.7 + 0.6 * this.intensity) * (singing ? 0.6 : 1), r() - 0.5, 0.5 + 0.3 * a.c.space);
      }
    }
    if (s % 8 === 4 && !singing && r() < a.bellProb) {
      // in the void a bell sometimes rings a note of the theme
      const deg = m.air && r() < 0.4 ? HEAD[Math.floor(r() * 3)][0] + a.scale.length : chord[Math.floor(r() * chord.length)] + a.scale.length * 2;
      this.bell(noteOf(a, deg, 1), t);
    }
    const pulse = m.pulse + (this.intensity > 0.7 ? 0.025 : 0);
    if (pulse > 0 && s % 2 === 0) this.thump(noteOf(a, chord[0], -2), t, pulse);
    // a heartbeat, lub-dub every two beats (Prologue void, the Pulse)
    const beat = a.c.beat?.[a.name as MoodName] ?? 0;
    if (beat > 0 && s % 8 < 2) {
      let hb = noteOf(a, chord[0], -1);
      while (hb < 33) hb += 12;
      this.thump(hb, t, s % 8 === 0 ? beat : beat * 0.6);
    }
    const tick = (a.name === 'explore' || a.name === 'tension') ? a.c.tick ?? 0 : 0;
    if (tick > 0 && s % 4 === 0) this.tick(a, t, (s / 4) % 2 === 0, tick);

    this.step++;
    if (this.step >= m.beatsPerChord * 4) { this.step = 0; this.chordNo++; }
  }

  /** A chord boundary: pick the chord (form, colour), voice it, and start pad, bass and air. */
  private chordStart(t: number): void {
    const a = this.arr!, m = a.m, r = a.rng;
    const n = this.chordNo;
    const phrase = Math.floor(n / 4);
    const letter = FORM[phrase % FORM.length];
    const prog = letter === 'B' ? a.progB : a.progA;
    let chord = prog[n % prog.length];
    if (!a.native) chord = fixDim(chord, a, this.chord);
    // phrase starts stay plain so the loop keeps its shape; elsewhere a chord may take a colour
    if (n % 4 !== 0 && r() < a.c.sus) chord = colour(chord, a);
    this.chord = chord;

    const dur = (60 / a.bpm) * m.beatsPerChord;
    const written = chord.map((d) => noteOf(a, d, 0));
    // one register for every key (about A♭3–D5), so brightness and level stay put as acts change key
    const notes = m.voiceLead ? leadVoices(this.voicing, written, 51, 74) : written;
    this.voicing = notes;
    let body = noteOf(a, chord[0], 0);
    while (body > Math.min(...notes)) body -= 12;
    this.pad(notes, body, t, dur, a);

    let bassNote = noteOf(a, chord[0], -1);
    while (bassNote < 28) bassNote += 12;
    if (m.voiceLead && bassNote > a.root - 5 && bassNote - 12 >= 31) bassNote -= 12;
    const fifth = chord.includes(chord[0] + 4) && semis(a, chord[0], chord[0] + 4) === 7;
    if (n > 0 && fifth && r() < (m.bassWalk ?? 0)) {
      // a clean hand-off (short crossfade) so the two notes never stack
      this.bass(bassNote, t, dur / 2, m.bassVol, 1.2, 0.15, 0.15);
      this.bass(bassNote + (bassNote + 7 > a.root - 2 ? -5 : 7), t + dur / 2, dur / 2, m.bassVol * 0.85, 0.3, 1.2); // the fifth, below if above gets high
    } else this.bass(bassNote, t, dur, m.bassVol, 1.2, 1.2);
    if (m.air) this.air(t, dur, a);

    // arpeggio pattern: changes every two chords; the first phrase uses the act's opening pattern
    if (n % 2 === 0) this.arp = a.arps[phrase === 0 ? a.pool[0] : a.pool[Math.floor(r() * a.pool.length)]];
    // now and then the arpeggio sits out a chord (more often in spacious acts); never on a phrase start
    this.arpRest = n % 4 !== 0 && r() < a.c.space * 0.3;

    // the theme
    if (this.theme === null) {
      if (a.name === 'title' && n % 8 === 0) this.startTheme(THEME.open, 2, 1, 0.016, t);
      else if (a.name === 'triumph' && n % 16 === 0) this.startTheme(THEME.closed, 0, 1, 0.017, t);
      else if (a.name === 'void' && n % 8 === 4 && r() < 0.7) this.startTheme(THEME.fragment, 2, 1, 0.015, t);
      else if (a.name === 'explore' && n % 16 === 8 && r() < (a.c.motif ?? 0)) this.startTheme(THEME.fragment, 2, 1, 0.012, t);
    }
    this.prune(t);
  }

  private startTheme(p: Phrase, offsetBeats: number, oct: number, vol: number, t: number): void {
    let at = offsetBeats * 4;
    const notes = p.map(([deg, beats]) => { const nt = { at, deg, len: beats * 4 }; at += beats * 4; return nt; });
    this.theme = { notes, i: 0, pos: 0, end: at, oct, vol };
    // the pad leans back a little while the theme sings
    const sixteenth = 60 / this.arr!.bpm / 4;
    const g = this.padBus!.gain;
    g.setTargetAtTime(0.8, t + Math.max(0, notes[0].at * sixteenth - 0.4), 0.4);
    g.setTargetAtTime(1, t + at * sixteenth, 0.9);
  }

  private track(end: number, nodes: AudioScheduledSourceNode[]): void { this.live.push({ end, nodes }); }
  private prune(now: number): void { this.live = this.live.filter((l) => l.end > now); }

  // ---------------------------------------------------------------- voices

  /** Soft pad: detuned softened saws in two pan groups and a sine body, through a breathing low-pass. */
  private pad(notes: number[], body: number, t: number, dur: number, a: Arrangement): void {
    const ctx = audio.ctx!, m = a.m;
    const vol = m.padVol * PAD_TRIM;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(vol, t + Math.min(2.2, dur * 0.4));
    out.gain.setValueAtTime(vol, t + dur);
    out.gain.linearRampToValueAtTime(0, t + dur + 2.4);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 0.5;
    const cut = a.padCutoff * (0.8 + 0.6 * this.intensity);
    f.frequency.setValueAtTime(cut * 0.6, t);
    f.frequency.linearRampToValueAtTime(cut, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(cut * 0.7, t + dur + 2);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07 + 0.08 * a.rng();
    const depth = ctx.createGain(); depth.gain.value = cut * 0.18;
    lfo.connect(depth).connect(f.frequency);
    f.connect(out);
    out.connect(this.padBus!);
    const send = ctx.createGain(); send.gain.value = 0.55 + 0.25 * a.c.space;
    out.connect(send).connect(audio.reverbSend);
    const sides = [-0.35, 0.35].map((p) => {
      const g = ctx.createGain(); g.gain.value = 0.5 / notes.length;
      const pan = ctx.createStereoPanner(); pan.pan.value = p;
      g.connect(pan).connect(f);
      return g;
    });
    const oscs: OscillatorNode[] = [lfo];
    const w = waves(ctx);
    notes.forEach((n, i) => {
      for (const det of [-7, 6]) {
        const o = ctx.createOscillator();
        if (m.wave === 'sawtooth') o.setPeriodicWave(w.soft); else o.type = m.wave;
        o.frequency.value = midiHz(n);
        o.detune.value = det + (i - 1.5) * 1.5;
        o.connect(sides[(det < 0) === (i % 2 === 1) ? 0 : 1]);
        oscs.push(o);
      }
    });
    const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = midiHz(body);
    const sg = ctx.createGain(); sg.gain.value = 0.14;
    sub.connect(sg).connect(f);
    oscs.push(sub);
    const end = t + dur + 2.6;
    oscs.forEach((o) => { o.start(t); o.stop(end); });
    this.track(end, oscs);
  }

  private bass(n: number, t: number, dur: number, vol: number, attack: number, release: number, fadeLead = 0.2): void {
    const ctx = audio.ctx!;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = midiHz(n);
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = midiHz(n);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur - fadeLead));
    g.gain.linearRampToValueAtTime(0, t + dur + release);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(g); o2.connect(g2).connect(g);
    g.connect(this.bus!);
    const end = t + dur + release + 0.1;
    o.start(t); o2.start(t);
    o.stop(end); o2.stop(end);
    this.track(end, [o, o2]);
  }

  /** Warm pluck: a round wave whose low-pass closes as it decays (highs die first). */
  private pluck(n: number, t: number, vol: number, pan: number, delay = 0.5): void {
    const ctx = audio.ctx!;
    const o = ctx.createOscillator(); o.setPeriodicWave(waves(ctx).warm); o.frequency.value = midiHz(n);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.4;
    const bright = 1800 + 2000 * this.intensity;
    f.frequency.setValueAtTime(bright * 1.4, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(500, midiHz(n) * 1.5), t + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * PLUCK_TRIM, t + 0.005);
    g.gain.exponentialRampToValueAtTime(1e-4, t + 1);
    const p = ctx.createStereoPanner(); p.pan.value = pan * 0.8;
    o.connect(f).connect(g).connect(p).connect(this.bus!);
    const ds = ctx.createGain(); ds.gain.value = delay; p.connect(ds).connect(audio.delaySend);
    const rs = ctx.createGain(); rs.gain.value = 0.35; p.connect(rs).connect(audio.reverbSend);
    o.start(t); o.stop(t + 1.05);
  }

  private bell(n: number, t: number): void {
    const ctx = audio.ctx!;
    const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = midiHz(n);
    const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = midiHz(n) * 3.5;
    const mg = ctx.createGain(); mg.gain.setValueAtTime(midiHz(n) * 1.2, t); mg.gain.exponentialRampToValueAtTime(1, t + 2);
    mod.connect(mg).connect(car.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.022, t + 0.01); g.gain.exponentialRampToValueAtTime(1e-4, t + 3.2);
    car.connect(g).connect(this.bus!);
    const rs = ctx.createGain(); rs.gain.value = 0.9; g.connect(rs).connect(audio.reverbSend);
    car.start(t); mod.start(t); car.stop(t + 3.3); mod.stop(t + 3.3);
  }

  /** The theme's voice: a soft flute-like tone with a slow-blooming vibrato. */
  private lead(n: number, t: number, len: number, vol: number): void {
    const ctx = audio.ctx!;
    const o = ctx.createOscillator(); o.setPeriodicWave(waves(ctx).flute); o.frequency.value = midiHz(n);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 4.8 + Math.random() * 0.6;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(9, t + Math.max(0.15, Math.min(0.7, len * 0.7))); // cents
    lfo.connect(lg).connect(o.detune);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.06);
    g.gain.setTargetAtTime(vol * 0.72, t + 0.06, 0.35);
    g.gain.setTargetAtTime(0, t + len, 0.22);
    o.connect(g).connect(this.bus!);
    const rs = ctx.createGain(); rs.gain.value = 0.7; g.connect(rs).connect(audio.reverbSend);
    const ds = ctx.createGain(); ds.gain.value = 0.25; g.connect(ds).connect(audio.delaySend);
    const end = t + len + 1.4;
    o.start(t); lfo.start(t); o.stop(end); lfo.stop(end);
  }

  /** Air: filtered noise that swells and drifts across a chord (void). */
  private air(t: number, dur: number, a: Arrangement): void {
    const ctx = audio.ctx!;
    const src = ctx.createBufferSource(); src.buffer = waves(ctx).noise; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
    const f0 = 600 + 500 * a.rng();
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f0 * 2.2, t + dur * 0.6);
    bp.frequency.exponentialRampToValueAtTime(f0 * 1.1, t + dur + 2.4);
    const g = ctx.createGain();
    const v = a.m.air!;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + Math.min(3, dur * 0.5));
    g.gain.setValueAtTime(v, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 2.4);
    const p = ctx.createStereoPanner();
    const side = a.rng() < 0.5 ? -1 : 1;
    p.pan.setValueAtTime(-0.5 * side, t);
    p.pan.linearRampToValueAtTime(0.5 * side, t + dur + 2.4);
    src.connect(bp).connect(g).connect(p).connect(this.bus!);
    const rs = ctx.createGain(); rs.gain.value = 0.6; p.connect(rs).connect(audio.reverbSend);
    const end = t + dur + 2.5;
    src.start(t, a.rng() * 2.5);
    src.stop(end);
    this.track(end, [src]);
  }

  /** Clockwork: a short pitched click on each beat, tick and tock (Ledger). */
  private tick(a: Arrangement, t: number, hi: boolean, vol: number): void {
    const ctx = audio.ctx!;
    const src = ctx.createBufferSource(); src.buffer = waves(ctx).noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 7;
    bp.frequency.value = midiHz(a.root + 36 + (hi ? 7 : 0));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.002); g.gain.exponentialRampToValueAtTime(1e-4, t + 0.06);
    const p = ctx.createStereoPanner(); p.pan.value = hi ? 0.25 : -0.25;
    src.connect(bp).connect(g).connect(p).connect(this.bus!);
    src.start(t, Math.random() * 2); src.stop(t + 0.08);
  }

  private thump(n: number, t: number, vol: number): void {
    const ctx = audio.ctx!;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(midiHz(n) * 2, t);
    o.frequency.exponentialRampToValueAtTime(midiHz(n), t + 0.08);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(1e-4, t + 0.35);
    o.connect(g).connect(this.bus!);
    o.start(t); o.stop(t + 0.4);
  }

  /** A short rising phrase on top of the score (a win): the head of the theme, in the current key. */
  stinger(): void {
    const ctx = audio.ctx;
    if (!ctx || !this.arr || !this.bus) return;
    const a = this.arr;
    const t = ctx.currentTime + 0.02;
    [4, 7, 8, 11].forEach((d, i) => this.pluck(noteOf(a, d, 1), t + i * 0.09, 0.05, (i - 1.5) * 0.25));
  }
}

export const music = new Music();
