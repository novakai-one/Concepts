// Plain maths kit: pure helpers (no DOM, no three). Copied from Chapter 18's traj-logic.ts and made
// matrix-free: reading typed numbers, comparing vectors, lines through the origin, seeded numbers, and the
// per-stage help record (no help / after a mistake / with help).
import { S, save } from '../../core/save';
import { nice } from '../../math/frac';
import type { Vec } from '../../math/la';

export type { Vec };

const len = (a: Vec): number => Math.hypot(a[0], a[1]);
const cross = (a: Vec, b: Vec): number => a[0] * b[1] - a[1] * b[0];
const dot = (a: Vec, b: Vec): number => a[0] * b[0] + a[1] * b[1];
/** Relative tolerance: typed entries are exact, so this only absorbs rounding. */
const REL = 1e-9;

// ------------------------------------------------------------------ numbers and vectors

/** A number for display: whole numbers as they are, simple fractions as a/b, a real minus sign. */
export const fmtN = (x: number): string => {
  const r = Math.round(x * 1e9) / 1e9;
  const t = Number.isInteger(r) ? String(r) : Math.abs(r * 100 - Math.round(r * 100)) < 1e-9 ? String(Math.round(r * 100) / 100) : nice(r);
  return (t === '-0' ? '0' : t).replace(/^-/, '−');
};

/** Round away float dust (1e-12) so 3.0000000001 reads as 3. */
export function clean(x: number): number {
  const r = Math.round(x);
  if (Math.abs(x - r) < 1e-9) return r === 0 ? 0 : r;
  return Math.round(x * 1e9) / 1e9;
}
export const cleanV = (v: Vec): Vec => v.map(clean);

export const isZero = (v: Vec): boolean => len(v) < 1e-12;
/** Two numbers (or two vectors) are equal up to rounding. */
export function same(a: number | Vec, b: number | Vec): boolean {
  const x = typeof a === 'number' ? [a] : a, y = typeof b === 'number' ? [b] : b;
  if (x.length !== y.length) return false;
  return x.every((xi, i) => Math.abs(xi - y[i]) <= REL * 10 * Math.max(1, Math.abs(y[i])));
}
export const add = (a: Vec, b: Vec): Vec => cleanV([a[0] + b[0], a[1] + b[1]]);
export const mul = (c: number, v: Vec): Vec => cleanV([c * v[0], c * v[1]]);
/** a·u + b·v. */
export const lin = (a: number, u: Vec, b: number, v: Vec): Vec => cleanV([a * u[0] + b * v[0], a * u[1] + b * v[1]]);
/** The length √(x² + y²). */
export const norm = (v: Vec): number => clean(len(v));

/** True when b lies on the line through a (a ≠ 0). The zero vector lies on every line. */
export function onLineOf(a: Vec, b: Vec): boolean {
  const la = len(a), lb = len(b);
  if (la < 1e-12) return false;
  if (lb < 1e-12) return true;
  return Math.abs(cross(a, b)) <= REL * la * lb * 10;
}
/** b = k a: the k (a ≠ 0, b on the line of a). */
export const multipleOf = (b: Vec, a: Vec): number => clean(dot(b, a) / dot(a, a));
/** u and v point along different lines (neither is zero, not multiples): they are independent. */
export const independent = (u: Vec, v: Vec): boolean => !isZero(u) && !isZero(v) && !onLineOf(u, v);
/** Solve a·u + b·v = t for (a, b); null when u and v lie on one line. */
export function solve2(u: Vec, v: Vec, t: Vec): [number, number] | null {
  const d = cross(u, v);
  if (Math.abs(d) < 1e-12) return null;
  return [clean(cross(t, v) / d), clean(cross(u, t) / d)];
}

// ------------------------------------------------------------------ typed numbers

export const ENTRY_MAX = 9999;
export const ENTRY_MIN = 0.001;
/**
 * Read a typed number. Accepts 3, -1.5, −2 (real minus), +3, .5, 3., 3/4, and a decimal comma (1,5).
 * Returns null for anything else (empty, "-", "1e3", "x/0").
 */
export function parseEntry(s: string, o: { comma?: boolean } = {}): number | null {
  let t = s.trim().replace(/[−–]/g, '-').replace(/\s+/g, '').replace(/^\+/, '');
  // a decimal comma where one number is asked for; never in a vector part, where "1,1" is a whole vector
  if (o.comma !== false && /^-?\d*,\d{1,2}$/.test(t)) t = t.replace(',', '.');
  if (/^-?\d+\.$/.test(t)) t = t.slice(0, -1);
  const f = t.match(/^(-?\d*\.?\d+)\/(\d*\.?\d+)$/);
  if (f) {
    const d = parseFloat(f[2]);
    const x = d === 0 ? null : parseFloat(f[1]) / d;
    return x === null || Math.abs(x) > ENTRY_MAX || (x !== 0 && Math.abs(x) < ENTRY_MIN) ? null : x;
  }
  if (!/^-?(\d+(\.\d+)?|\.\d+)$/.test(t)) return null;
  const x = parseFloat(t);
  if (Math.abs(x) > ENTRY_MAX || (x !== 0 && Math.abs(x) < ENTRY_MIN)) return null;
  return Object.is(x, -0) ? 0 : x;
}

// ------------------------------------------------------------------ seeded numbers

/** Small seeded generator (mulberry32), so a round can be replayed from its seed. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A whole number from lo to hi (inclusive), never one in `not`. */
export function pickInt(r: () => number, lo: number, hi: number, not: number[] = []): number {
  for (let i = 0; i < 50; i++) { const x = lo + Math.floor(r() * (hi - lo + 1)); if (!not.includes(x)) return x; }
  return lo;
}

// ------------------------------------------------------------------ help record

export type Outcome = 'independent' | 'corrected' | 'assisted';
export interface Attempt { help: number; wrong: number }
export const fresh = (): Attempt => ({ help: 0, wrong: 0 });
/** Any hint or Show me makes a success assisted; a wrong committed answer fixed without help is corrected. */
export const outcomeOf = (a: Attempt): Outcome => (a.help > 0 ? 'assisted' : a.wrong > 0 ? 'corrected' : 'independent');
export const OUTCOME_NAMES: Record<Outcome, string> = { independent: 'no help', corrected: 'after a mistake', assisted: 'with help' };

/** Save how a stage was passed under the chapter's key (latest attempt wins). */
export function record(key: string, id: string, a: Attempt): Outcome {
  const f = ((S().flags[key] as Record<string, Outcome> | undefined) ?? {});
  f[id] = outcomeOf(a);
  S().flags[key] = f;
  save();
  return f[id];
}
/** Everything recorded so far under this key. */
export function records(key: string): Record<string, Outcome> {
  return { ...((S().flags[key] as Record<string, Outcome> | undefined) ?? {}) };
}

/** Stage hints: the next one for the stage in play; onGive runs once per new hint (count it as help). */
export function hinter(list: () => string[], onGive: () => void): () => { text: string; left: number } | null {
  let key = '', n = 0;
  return () => {
    const hs = list();
    const k = hs.join('|');
    if (k !== key) { key = k; n = 0; }
    if (!hs.length) return null;
    const i = Math.min(n, hs.length - 1);
    if (n < hs.length) { n++; onGive(); }
    return { text: hs[i], left: hs.length - n };
  };
}
