// Chapter 18, the trajectory problem (docs/singular/ch18-trajectory-spec.md): pure logic, no DOM, no three.
// A navigation pulse applies one 2 × 2 matrix to the ship's displacement from the Anchor. These functions
// judge launches, kept lines, multipliers and missions with exact arithmetic, and hold every round's numbers.
// Unit-tested in tests/singular/game-c18-traj.test.ts.
import { dot, inverse, matVec, mpow, type Mat, type Vec } from '../../../math/la.ts';

// ------------------------------------------------------------------ the pulse and its lines

/** The opening pulse (Scenes 1–4): keeps (1, 1) with multiplier 3 and (1, −1) with multiplier 1. */
export const PULSE_A: Mat = [[2, 1], [1, 2]];

const cross = (a: Vec, b: Vec): number => a[0] * b[1] - a[1] * b[0];
const len = (a: Vec): number => Math.hypot(a[0], a[1]);
/** Relative tolerance for "on the line" and "equal": typed entries are exact, so this only absorbs rounding. */
const REL = 1e-9;

export const isZero = (v: Vec): boolean => len(v) < 1e-12;
/** The pulse applied to v. */
export const pulseOf = (M: Mat, v: Vec): Vec => matVec(M, v);

/** True when b lies on the line through a (a ≠ 0). The zero vector lies on every line. */
export function onLineOf(a: Vec, b: Vec): boolean {
  const la = len(a), lb = len(b);
  if (la < 1e-12) return false;
  if (lb < 1e-12) return true;
  return Math.abs(cross(a, b)) <= REL * la * lb * 10;
}

/** b = k a: the k (a ≠ 0, b on the line of a). */
export const multipleOf = (b: Vec, a: Vec): number => dot(b, a) / dot(a, a);

/** The pulse keeps v on its own line: v ≠ 0 and A v is a multiple of v (A v = 0 counts: multiplier 0). */
export const keeps = (M: Mat, v: Vec): boolean => !isZero(v) && onLineOf(v, pulseOf(M, v));

/** The signed multiplier along a kept line (A v = λ v), or null if the pulse turns v. */
export function multiplierOf(M: Mat, v: Vec): number | null {
  if (!keeps(M, v)) return null;
  return clean(multipleOf(pulseOf(M, v), v));
}

/** How far the pulse turns the LINE of v, in degrees (0 to 90). A kept line, flipped or collapsed, is 0. */
export function lineTurnDeg(M: Mat, v: Vec): number {
  return lineAngle(v, pulseOf(M, v));
}

/** The angle between the line through v and the line through w, in degrees (0 to 90): how far off its line. */
export function lineAngle(v: Vec, w: Vec): number {
  if (isZero(v) || isZero(w)) return 0;
  const c = Math.abs(dot(v, w)) / (len(v) * len(w));
  return (Math.acos(Math.min(1, c)) * 180) / Math.PI;
}

/** Signed angle from v to w in degrees (−180 to 180). */
export function signedDeg(v: Vec, w: Vec): number {
  return (Math.atan2(cross(v, w), dot(v, w)) * 180) / Math.PI;
}

/** Round away float dust (1e-12) so 3.0000000001 reads as 3. */
export function clean(x: number): number {
  const r = Math.round(x);
  if (Math.abs(x - r) < 1e-9) return r === 0 ? 0 : r;
  return Math.round(x * 1e9) / 1e9;
}
export const cleanV = (v: Vec): Vec => v.map(clean);

// ------------------------------------------------------------------ the multiplier answer

export interface MultVerdict {
  ok: boolean;
  /** The player's number. */
  m: number;
  /** m times the launch vector. */
  scaled: Vec;
  /** Where the pulse really put it. */
  image: Vec;
  /** Components (0 = first, 1 = second) where m v and A v differ. */
  bad: number[];
}

/** Check a typed multiplier against the real pulse, part by part: does m v equal A v? */
export function checkMult(M: Mat, v: Vec, m: number): MultVerdict {
  const image = cleanV(pulseOf(M, v));
  const scaled = cleanV(v.map((x) => m * x));
  const bad = [0, 1].filter((i) => Math.abs(scaled[i] - image[i]) > REL * 10 * Math.max(1, Math.abs(image[i])));
  return { ok: bad.length === 0, m, scaled, image, bad };
}

// ------------------------------------------------------------------ typed numbers

export { parseEntry, ENTRY_MAX, ENTRY_MIN } from '../../../kit/entry.ts';

// ------------------------------------------------------------------ flights and missions

/** The ship's positions: the launch v, then after each pulse. path(M, v, 2) = [v, Av, A²v]. */
export function path(M: Mat, v: Vec, pulses: number): Vec[] {
  const out: Vec[] = [v.slice()];
  for (let k = 0; k < pulses; k++) out.push(cleanV(pulseOf(M, out[out.length - 1])));
  return out;
}

export interface Mission { M: Mat; target: Vec; pulses: number }

/** Did launching v reach the target after exactly the mission's pulses? */
export function reaches(ms: Mission, v: Vec): boolean {
  const end = path(ms.M, v, ms.pulses)[ms.pulses];
  return Math.abs(end[0] - ms.target[0]) + Math.abs(end[1] - ms.target[1]) <= REL * 10 * Math.max(1, len(ms.target));
}

/** The launch that reaches the target: (A^n)⁻¹ t, or null if the pulse flattens space. */
export function launchFor(ms: Mission): Vec | null {
  const P = mpow(ms.M, ms.pulses);
  const Pi = inverse(P);
  return Pi ? cleanV(matVec(Pi, ms.target)) : null;
}

/** Scene 4: the two-pulse mission on the opening pulse. Intended reasoning (1, 1) → (3, 3) → (9, 9). */
export const M1: Mission = { M: PULSE_A, target: [9, 9], pulses: 2 };
/** Scene 6: the independent challenge. B keeps (1, 1) ×3 and (2, 1) ×4; (32, 16) = 4²(2, 1). */
export const SOLO_B: Mat = [[5, -2], [1, 2]];
export const SOLO: Mission = { M: SOLO_B, target: [32, 16], pulses: 2 };

// ------------------------------------------------------------------ the ten practice rounds (Scene 5)

/** A second symmetric pulse (rounds 4, 5, 10): keeps (1, 1) ×4 and (1, −1) ×2. */
export const PULSE_S: Mat = [[3, 1], [1, 3]];
/** Round 6: reverses the vertical axis (×−1), doubles the horizontal one. */
export const PULSE_FLIP: Mat = [[2, 0], [0, -1]];
/** Round 7: collapses the vertical axis to the Anchor (×0); keeps (2, 1) ×2. */
export const PULSE_FLAT: Mat = [[2, 0], [1, 0]];
/** Round 8: a shear. Only the horizontal axis holds, ×1. */
export const PULSE_SHEAR: Mat = [[1, 1], [0, 1]];
/** Round 9: unseen pulse, no hints: (1, 1) ×2 and (2, 1) ×3. */
export const PULSE_NEW: Mat = [[4, -2], [1, 1]];

/** Round 1: which plan stays on its line under PULSE_A? Only (−2, −2). */
export const R1_PLANS: Vec[] = [[2, 1], [-2, -2], [1, 3], [0, 2]];
/** Round 3: three logged plans to sort against the open line through (1, 1). */
export const R3_OPEN: Vec = [1, 1];
export const R3_PLANS: Vec[] = [[3, 1], [-4, -4], [2, -2]];
export type PlanClass = 'same' | 'new' | 'turns';
/** Sort a plan: on the open line (a duplicate), on a different kept line (new), or turned. */
export function classifyPlan(M: Mat, open: Vec, v: Vec): PlanClass {
  if (!keeps(M, v)) return 'turns';
  return onLineOf(open, v) ? 'same' : 'new';
}
/** Round 6: the beacon below the Anchor, one pulse. Launch (0, 3); the pulse reverses it. */
export const R6: Mission = { M: PULSE_FLIP, target: [0, -3], pulses: 1 };
/** Round 8: hold the line through three drifting pulses. */
export const R8_PULSES = 3;
/** Round 10: three pulses to (−8, 8) = 2³(−1, 1). */
export const R10: Mission = { M: PULSE_S, target: [-8, 8], pulses: 3 };

/** The real kept lines of a 2 × 2 with real eigenvalues, as small whole-number directions with their multipliers. */
export function keptLines(M: Mat): { dir: Vec; m: number }[] {
  const [[a, b], [c, d]] = M;
  const tr = a + d, dt = a * d - b * c, disc = tr * tr - 4 * dt;
  if (disc < -1e-12) return [];
  const r = Math.sqrt(Math.max(0, disc));
  const ms = disc < 1e-12 ? [tr / 2] : [(tr + r) / 2, (tr - r) / 2];
  const out: { dir: Vec; m: number }[] = [];
  for (const m of ms) {
    // null space of M − mI
    const p = a - m, q = b, s = c, t = d - m;
    const cands: Vec[] = [];
    if (Math.abs(p) > 1e-12 || Math.abs(q) > 1e-12) cands.push([-q, p]);
    if (Math.abs(s) > 1e-12 || Math.abs(t) > 1e-12) cands.push([-t, s]);
    if (!cands.length) { out.push({ dir: [1, 0], m: clean(m) }, { dir: [0, 1], m: clean(m) }); continue; }
    out.push({ dir: niceDir(cands.sort((x, y) => len(y) - len(x))[0]), m: clean(m) });
  }
  return out;
}

/** A direction scaled to small whole numbers when it can be (first non-zero part positive). */
export function niceDir(v: Vec): Vec {
  let u = v.slice();
  const lead = Math.abs(u[0]) > 1e-12 ? u[0] : u[1];
  if (lead < 0) u = u.map((x) => -x);
  for (let k = 1; k <= 12; k++) {
    const base = Math.abs(u[0]) > 1e-12 ? Math.abs(u[0]) : Math.abs(u[1]);
    const w = u.map((x) => (x / base) * k);
    if (w.every((x) => Math.abs(x - Math.round(x)) < 1e-9)) return w.map((x) => clean(Math.round(x)));
  }
  const n = len(u);
  return u.map((x) => clean(Math.round((x / n) * 100) / 100));
}

// ------------------------------------------------------------------ progress: independent, corrected, assisted

export type Outcome = 'independent' | 'corrected' | 'assisted';
export interface Attempt { help: number; wrong: number }
/** Any hint or Show me makes a success assisted; a wrong committed answer fixed without help is corrected. */
export const outcomeOf = (a: Attempt): Outcome => (a.help > 0 ? 'assisted' : a.wrong > 0 ? 'corrected' : 'independent');

// ------------------------------------------------------------------ more rounds on demand

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

/** Direction pairs with determinant ±1, so P D P⁻¹ stays whole. Columns are the kept directions. */
const BASES: Mat[] = [
  [[1, 1], [1, 2]], [[1, 2], [1, 1]], [[1, 1], [0, 1]], [[1, 0], [1, 1]], [[2, 1], [1, 1]], [[1, -1], [1, 0]],
  [[1, 1], [-1, 0]], [[1, 2], [1, 3]], [[1, 3], [1, 2]], [[2, 1], [3, 2]], [[1, 1], [2, 1]], [[1, -1], [0, 1]],
];
const MULTS = [-2, -1, 2, 3, 4];

export interface GenPulse { M: Mat; lines: { dir: Vec; m: number }[] }

/** A fresh pulse with two whole-number kept lines and distinct whole multipliers, entries at most 9 in size. */
/** Every pulse the player meets by name in this chapter: a generated round must never repeat one. */
export const FIXED_PULSES: Mat[] = [PULSE_A, SOLO_B, PULSE_S, PULSE_FLIP, PULSE_FLAT, PULSE_SHEAR, PULSE_NEW];
const sameMat = (a: Mat, b: Mat) => a.every((row, i) => row.every((x, j) => x === b[i][j]));

/** A fresh pulse, never a fixture and never one in `avoid`. `twoPulse` also refuses opposite multipliers (A² = cI). */
export function genPulse(seed: number, o: { avoid?: Mat[]; twoPulse?: boolean } = {}): GenPulse {
  const r = rng(seed);
  const avoid = [...FIXED_PULSES, ...(o.avoid ?? [])];
  for (let tries = 0; tries < 400; tries++) {
    const P = BASES[Math.floor(r() * BASES.length)];
    const i = Math.floor(r() * MULTS.length);
    let j = Math.floor(r() * (MULTS.length - 1));
    if (j >= i) j++;
    const l1 = MULTS[i], l2 = MULTS[j];
    const Pi = inverse(P)!;
    const M = [[0, 0], [0, 0]].map((row, a) => row.map((_, b) => clean(P[a][0] * l1 * Pi[0][b] + P[a][1] * l2 * Pi[1][b])));
    if (M.flat().some((x) => Math.abs(x) > 9 || !Number.isInteger(x))) continue;
    if (M[0][1] === 0 && M[1][0] === 0) continue; // diagonal: too easy to read
    if (avoid.some((X) => sameMat(X, M))) continue;
    // A² = cI: two pulses only rescale, so a two-pulse mission needs no kept line
    if (o.twoPulse && l1 === -l2) continue;
    return { M, lines: [{ dir: niceDir([P[0][0], P[1][0]]), m: l1 }, { dir: niceDir([P[0][1], P[1][1]]), m: l2 }] };
  }
  return { M: PULSE_NEW, lines: keptLines(PULSE_NEW) };
}

/** A fresh mission: a target on a kept line of a fresh pulse, reached after two pulses from a small launch. */
export function genMission(seed: number, avoid: Mat[] = []): Mission & { launch: Vec } {
  const g = genPulse(seed, { avoid, twoPulse: true });
  const r = rng(seed * 7 + 3);
  const line = g.lines.find((l) => Math.abs(l.m) >= 2) ?? g.lines[0];
  const k = r() < 0.5 ? 1 : -1;
  const launch = cleanV(line.dir.map((x) => x * k));
  const pulses = 2;
  const target = path(g.M, launch, pulses)[pulses];
  return { M: g.M, target, pulses, launch };
}
