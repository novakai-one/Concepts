// Chapter 4 pure logic (no DOM, no three): the story numbers, every win check, the doubt predicates,
// the Law core, the beacon matcher's data and the crew versions of the builds.
// Unit-tested in tests/singular/game-c04.test.ts.
import { angle, cross, dot, norm, proj, type Vec } from '../../../math/la.ts';
import { nice } from '../../../math/frac.ts';
import { rint, rng, type LawCore } from '../../../game/lawcheck.ts';

export const fmt = (v: readonly number[]) => `(${v.map((x) => nice(x)).join(', ')})`;
export const deg = (r: number) => (r * 180) / Math.PI;
const isZero = (v: readonly number[], tol = 1e-9) => v.every((x) => Math.abs(x) <= tol);
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const nearV = (a: readonly number[], b: readonly number[], tol: number) => a.length === b.length && a.every((x, i) => near(x, b[i], tol));

// ------------------------------------------------------------------ p1 [F][D] Read the pattern

/** The faint signal the dish is reading (p1, p2). */
export const SIGNAL: Vec = [2, 4];
export const E1: Vec = [1, 0];
export const E2: Vec = [0, 1];
/** The dish reading of an arrow d against the signal s: the shadow length on s's line times |s|. */
export const reading = (d: readonly number[], s: readonly number[] = SIGNAL): number => {
  const sl = norm(s as Vec);
  if (sl < 1e-12) return 0;
  // shadow length × length of s (written the long way on purpose: this is the dish's definition)
  const shadow = dot(d.slice(0, s.length) as Vec, s as Vec) / sl;
  return shadow * sl;
};
/** p1: 3 of (1, 0) plus 1 of (0, 1). The reading is then 3·2 + 1·4 = 10. */
export const P1_TARGET: Vec = [3, 1];
export const p1Won = (a: number, b: number) => near(a, 3, 1e-9) && near(b, 1, 1e-9);

// ------------------------------------------------------------------ p2 The silent direction

/** A whole-number dish arrow, not zero, that reads exactly 0 against (2, 4). */
export const p2Won = (d: readonly number[]) => {
  const e = d.slice(0, 2);
  return (d[2] ?? 0) === 0 && e.every((x) => Math.abs(x - Math.round(x)) < 1e-9) && !isZero(e) && Math.abs(dot(e, SIGNAL)) < 1e-9;
};

// ------------------------------------------------------------------ p3 [D] The law of cosines

/** LANTERN's test pair for the derivation: 45° apart. */
export const P3_V: Vec = [3, 1];
export const P3_W: Vec = [1, 2];
/** Both sides of the identity for any pair: v·w and |v||w|cos θ (θ measured from the picture). */
export const cosSide = (v: Vec, w: Vec) => norm(v) * norm(w) * Math.cos(angle(v, w));
/**
 * Navigator's derivation, for any pair: the number in front of each term.
 *   (v₁ − w₁)² = v₁² + cross·v₁w₁ + w₁²
 *   ‖v − w‖² = ‖v‖² + ‖w‖² + grouped·(v₁w₁ + v₂w₂)
 *   v₁w₁ + v₂w₂ = match·‖v‖‖w‖cos θ   (the law of cosines has −2‖v‖‖w‖cos θ in the same place)
 */
export const P3_COEFFS = { cross: -2, grouped: -2, match: 1 } as const;
/** Commander's tile order for the derivation: t1 < t2 < t3 < t5 and t4 < t5, no decoys. */
export const P3_TILES = ['t1', 't2', 't3', 't4', 't5'];
export function p3OrderOk(order: string[]): boolean {
  if (order.length !== 5 || order.some((id) => !P3_TILES.includes(id))) return false;
  const at = (id: string) => order.indexOf(id);
  return at('t1') < at('t2') && at('t2') < at('t3') && at('t3') < at('t5') && at('t4') < at('t5');
}

// ------------------------------------------------------------------ p4 Turn to the ark

export const P4_HEADING: Vec = [1, 1, 0];
export const P4_SPINE: Vec = [1, 0, 1];
/** The angle between heading and spine: cos θ = 1 / (√2 · √2) = 1/2, so 60°. */
export const P4_ANGLE = deg(angle(P4_HEADING, P4_SPINE));
export const p4Won = (turnDeg: number) => Math.abs(turnDeg - 60) <= 1;

/** Rotate p about the unit axis k by t radians (Rodrigues). */
export function rotateAbout(p: readonly number[], k: readonly number[], t: number): Vec {
  const kk = norm(k as Vec) < 1e-12 ? [0, 0, 1] : (k as Vec).map((x) => x / norm(k as Vec));
  const c = Math.cos(t), s = Math.sin(t);
  const kxp = cross(kk, p as Vec);
  const kdp = dot(kk, p as Vec);
  return [0, 1, 2].map((i) => p[i] * c + kxp[i] * s + kk[i] * kdp * (1 - c));
}
/** The heading after turning by `turnDeg` toward the spine (about the axis at a right angle to both). */
export function turnedHeading(turnDeg: number): Vec {
  const axis = cross(P4_HEADING, P4_SPINE);
  return rotateAbout(P4_HEADING, axis, (turnDeg * Math.PI) / 180);
}

// ------------------------------------------------------------------ p5 Which one is the ark? (cosine similarity)

export const P5_T: Vec = [3, 4];
export const P5_CANDS: Record<'a' | 'b' | 'c', Vec> = { a: [6, 8], b: [4, 3], c: [0, 20] };
export type Cand = keyof typeof P5_CANDS;
/** The meter: multiply matching parts and add, then optionally divide by either length. */
export function meter(x: Vec, divT: boolean, divX: boolean, t: Vec = P5_T): number {
  let r = dot(t, x);
  if (divT) r /= norm(t);
  if (divX) r /= norm(x);
  return r;
}
export const cosine = (a: Vec, b: Vec) => dot(a, b) / (norm(a) * norm(b));
/** LANTERN locks only on a reading of 1.00: the same direction as the ark's pattern. */
export const LOCK_AT = 1;
export const lockAccepted = (c: Cand, divT: boolean, divX: boolean) => Math.abs(meter(P5_CANDS[c], divT, divX) - LOCK_AT) < 0.005;
export const p5Won = (c: Cand, divT: boolean, divX: boolean) => c === 'a' && divT && divX && lockAccepted(c, divT, divX);

// ------------------------------------------------------------------ p6 [H] Cast the shadow

export const P6_V: Vec = [3, 4];
export const P6_U: Vec = [2, 1];
export const P6_STEPS = {
  vu: dot(P6_V, P6_U),                               // 10
  uu: dot(P6_U, P6_U),                               // 5
  scale: dot(P6_V, P6_U) / dot(P6_U, P6_U),          // 2
  tip: proj(P6_V, P6_U),                             // (4, 2)
  gap: [P6_V[0] - proj(P6_V, P6_U)[0], P6_V[1] - proj(P6_V, P6_U)[1]], // (−1, 2)
};
/** The trap: dividing by the length of u once (forgetting to make u one unit long). */
export const P6_OVERSHOOT_SCALE = dot(P6_V, P6_U) / norm(P6_U);  // 10/√5 ≈ 4.47
export const p6Won = (worksheetDone: boolean, mark: readonly number[]) => worksheetDone && nearV(mark.slice(0, 2), P6_STEPS.tip, 0.05);

// ------------------------------------------------------------------ p7 [S] Hidden bearing

export const P7_READINGS: Vec = [3, -1, 2];
/** The readings along the three axis arrows are the arrow's own parts. */
export const axisReadings = (v: readonly number[]) => [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((e) => dot(e, v as Vec));
export const p7Won = (v: readonly number[]) => nearV(axisReadings(v), P7_READINGS, 0.05);
/** Cauchy–Schwarz: a shadow is never longer than its arrow. */
export const cauchySchwarz = (v: Vec, w: Vec) => Math.abs(dot(v, w)) <= norm(v) * norm(w) + 1e-9;
/** Bram's Shake after p7: five seeded pairs, then a parallel pair, where the shadow is exactly as long as the arrow. */
export const P7_SHAKES: [Vec, Vec][] = (() => {
  let rs = 12345;
  const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
  const out: [Vec, Vec][] = [];
  for (let i = 0; i < 5; i++) out.push([[rnd() * 6 - 3, rnd() * 6 - 3, rnd() * 4], [rnd() * 6 - 3, rnd() * 6 - 3, rnd() * 4]]);
  out.push([[1, 2, 2], [2, 4, 4]]);
  return out;
})();

// ------------------------------------------------------------------ Doubts

/** (F) "A reading of zero means the signal's gone." Holds for a case unless the reading is 0 with a signal present. */
export const zeroMeansGone = (dish: readonly number[], signal: readonly number[]) =>
  !(Math.abs(dot(dish as Vec, signal as Vec)) < 1e-9 && norm(signal as Vec) > 1e-9);

/** Turn a 2-D arrow by phi degrees. */
export const turn2 = (v: readonly number[], phiDeg: number): Vec => {
  const t = (phiDeg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  return [c * v[0] - s * v[1], s * v[0] + c * v[1]];
};
/** (T) "Turn both arrows together and the reading does not change." */
export const turnKeepsReading = (v: readonly number[], w: readonly number[], phiDeg: number) =>
  Math.abs(dot(turn2(v, phiDeg), turn2(w, phiDeg)) - dot(v as Vec, w as Vec)) < 1e-9;

// ------------------------------------------------------------------ the Law

export interface DotCase { v: Vec; w: Vec }

/** Which angle condition (only meaningful for two arrows that are not zero). */
function angleIs(c: DotCase, which: string): boolean {
  if (isZero(c.v) || isZero(c.w)) return false;
  const th = deg(angle(c.v, c.w));
  if (which === 'right') return near(th, 90, 1e-7);
  if (which === 'acute') return th < 90 - 1e-7;
  if (which === 'obtuse') return th > 90 + 1e-7;
  if (which === 'equal') return near(norm(c.v), norm(c.w), 1e-9);
  return false;
}

export const lawCore: LawCore<DotCase> & { answer: Record<string, string> } = {
  id: 'c04-law',
  answer: { sign: 'zero', angle: 'right', extra: 'orzero' },
  gen(r) {
    const dim = r() < 0.5 ? 2 : 3;
    const rv = () => Array.from({ length: dim }, () => rint(r, -5, 5));
    const v = rv();
    let w = rv();
    const k = r();
    if (k < 0.18 && !isZero(v)) {
      // a right angle, on purpose: a multiple of an arrow at a right angle to v
      const m = rint(r, 1, 3) * (r() < 0.5 ? -1 : 1);
      w = dim === 2 ? [-v[1] * m, v[0] * m] : cross(v, rv()).map((x) => x || 0);
    } else if (k < 0.24) {
      w = w.map(() => 0);
    }
    return { v, w };
  },
  edgeCases: [
    { v: [0, 0], w: [1, 2] },          // the zero vector
    { v: [2, 1], w: [-1, 2] },         // a right angle
    { v: [2, 1], w: [4, 2] },          // parallel
    { v: [2, 1], w: [-4, -2] },        // opposite
    { v: [1, 0, 0], w: [0, 0, 0] },    // zero vector in 3-D
    { v: [3, 1], w: [1, 2] },          // 45°
    { v: [1, 2], w: [-3, -1] },        // over 90°
    { v: [3, 4], w: [4, 3] },          // same length, under 90°
  ],
  holds(f, c) {
    const d = dot(c.v, c.w);
    const lhs = f.sign === 'zero' ? Math.abs(d) < 1e-9 : f.sign === 'positive' ? d > 1e-9 : d < -1e-9;
    const zero = isZero(c.v) || isZero(c.w);
    const rhs = angleIs(c, f.angle) || (f.extra === 'orzero' && zero);
    return lhs === rhs;
  },
  describe(c) {
    const d = dot(c.v, c.w);
    const zero = isZero(c.v) ? 'v is the zero vector' : isZero(c.w) ? 'w is the zero vector' : `the angle is ${nice(Math.round(deg(angle(c.v, c.w)) * 10) / 10)}°`;
    return `v = ${fmt(c.v)}, w = ${fmt(c.w)}: v · w = ${nice(d)} and ${zero}`;
  },
};

// ------------------------------------------------------------------ the beacon matcher (install)

/** Six numbers per signature. */
export const BANDS = 6;
/** The ark's beacon pattern, from the distress call. */
export const ARK_PATTERN: Vec = [4, 1, 3, 0.5, 2, 1.5];
export interface Signature { sig: Vec; ark: boolean }
/** Where the ark's own beacon sits in the list, and the most aligned echo allowed. */
export const ARK_INDEX = 137;
export const ECHO_MAX_COS = 0.95;

/**
 * 200 signatures heard on the ark's bearing: one is the ark's beacon (faint, the ark's exact pattern),
 * 199 are echoes off the debris (louder, turned away from the pattern by a seeded angle). Seeded, so
 * every player sees the same sky.
 */
export function beaconField(seed = 4004, n = 200): Signature[] {
  const r = rng(seed);
  const pl = norm(ARK_PATTERN);
  const a = ARK_PATTERN.map((x) => x / pl);
  const out: Signature[] = [];
  for (let i = 0; i < n; i++) {
    if (i === ARK_INDEX) { out.push({ sig: ARK_PATTERN.map((x) => x * 0.45), ark: true }); continue; }
    // an echo: the cosine to the pattern is chosen (0.15 … 0.95), the rest points some other way
    const c = 0.15 + (ECHO_MAX_COS - 0.15) * Math.sqrt(r());
    let p = Array.from({ length: BANDS }, () => r() * 2 - 1);
    const pa = dot(p, a);
    p = p.map((x, k) => x - pa * a[k]);
    const plen = norm(p) || 1;
    const loud = pl * (1.2 + 2.4 * r());
    out.push({ sig: a.map((x, k) => loud * (c * x + Math.sqrt(1 - c * c) * (p[k] / plen))), ark: false });
  }
  return out;
}

/** Rank signatures by the cosine of the angle to the pattern (largest first). `d` is the dot product used. */
export function rankByCosine(pattern: Vec, sigs: Signature[], d: (a: Vec, b: Vec) => number = dot): { i: number; cos: number; raw: number }[] {
  const pl = Math.sqrt(d(pattern, pattern));
  return sigs.map((s, i) => {
    const raw = d(pattern, s.sig);
    return { i, raw, cos: raw / (pl * Math.sqrt(d(s.sig, s.sig))) };
  }).sort((a, b) => b.cos - a.cos);
}

// ------------------------------------------------------------------ crew versions of the builds (TypeScript)

export const crew = {
  dot: (v: number[], w: number[]) => v.reduce((s, x, i) => s + x * w[i], 0),
  length: (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0)),
  angle: (v: number[], w: number[]) => {
    const c = crew.dot(v, w) / (crew.length(v) * crew.length(w));
    return deg(Math.acos(Math.max(-1, Math.min(1, c))));
  },
  shadow: (v: number[], u: number[]) => { const c = crew.dot(v, u) / crew.dot(u, u); return u.map((x) => c * x); },
};

/** Random whole-number arrows for the test swarm (2-D or 3-D, never the zero vector where it matters). */
export function swarmVec(r: () => number, dim: number, lo = -6, hi = 6, nonzero = false): number[] {
  for (;;) {
    const v = Array.from({ length: dim }, () => rint(r, lo, hi));
    if (!nonzero || v.some((x) => x !== 0)) return v;
  }
}
