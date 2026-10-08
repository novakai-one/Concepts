// Chapter 2 pure logic (no DOM, no three): the story numbers, reach tests, win checks, doubt
// predicates, the Law core and the crew versions of the builds. Unit-tested in tests/singular/game-c02.test.ts.
import { col, combo, cross, dot, fromCols, norm, rank, vsub, type Vec } from '../../../math/la.ts';
import { C2, HATCH } from '../../truth.ts';
import { rint, type LawCore } from '../../../game/lawcheck.ts';

// ------------------------------------------------------------------ story numbers (GDD §6.3 Ch 2)

/** Thruster two (green) and thruster three (red), locked flat by the pulse. */
export const V: Vec = [2, 1];
export const W: Vec = [1, 3];
/** p2, p3, p4 targets and the weights that reach them. */
export const P2_TARGET: Vec = [5, 5];
export const P2_DIALS: Vec = [2, 1];
export const P3_TARGET: Vec = [0, 5];
export const P3_DIALS: Vec = [-1, 2];
export const P4_TARGET: Vec = [4, 7];
export const P4_DIALS: Vec = [1, 2];
/** p1 [F]: v = (1, 2), w = (2, k). Only k = 4 puts w on v's line. */
export const P1_V: Vec = [1, 2];
export const P1_K = 4;
export const p1W = (k: number): Vec => [2, k];
/** p5: thruster three fails over to its backup nozzle, along (−4, −2) = −2 (2, 1). */
export const BACKUP: Vec = [-4, -2];
/** p6 [D]: two reachable points P = v (dials 1, 0) and Q = w (dials 0, 1); R = P + t(Q − P). */
export const P6_P: Vec = [1, 0];
export const P6_Q: Vec = [0, 1];
export const P6_T = 2;
export const p6Dials = (t: number): Vec => [1 - t, t];
/** The real thrusters once the gimbals unlock: the first two columns of the two-decimal Collapse model (TT9). */
export const THRUST3: [Vec, Vec] = [col(C2, 0), col(C2, 1)];
/** The beacon lit after the unlock, and its weights. */
export const BEACON3: Vec = [2, 3, 5];
export const BEACON3_DIALS: Vec = [2, 3];
/** The Meridian's signal: the hatch on day one (TT16), off the plane z = x + y. */
export const SIGNAL: Vec = HATCH.slice();
/** Normal of the plane the two real thrusters reach: (−1, −1, 1), so the plane is z = x + y. */
export const PLANE_N: Vec = cross(THRUST3[0], THRUST3[1]);
/** p7 [S]: light arrows (x = red, y = green, z = blue). */
export const LAMP_RED: Vec = [1, 0, 0];
export const LAMP_GREEN: Vec = [0, 1, 0];
export const LAMP_BLUE: Vec = [0, 0, 1];
export const AMBER: Vec = [1, 0.6, 0.2];
/** Dials in the order green, red, blue (the maths colour order). */
export const AMBER_DIALS: Vec = [0.6, 1, 0.2];
export const LAMP_WARM: Vec = [1, 0.5, 0];
export const LAMP_COOL: Vec = [0, 0.5, 1];

// ------------------------------------------------------------------ reach

/** Number of independent directions the arrows reach: 0 (a point), 1 (a line), 2 (a plane), 3 (space). */
export const spanDim = (vs: Vec[]): number => (vs.length ? rank(fromCols(vs)) : 0);

/** Distance from q to the set the arrows reach (Gram–Schmidt on the arrows, then what is left of q). */
export function distToSpan(vs: Vec[], q: Vec): number {
  const basis: Vec[] = [];
  for (const v of vs) {
    let r = v.slice();
    for (const b of basis) r = vsub(r, b.map((x) => x * dot(r, b)));
    const n = norm(r);
    if (n > 1e-9) basis.push(r.map((x) => x / n));
  }
  let r = q.slice();
  for (const b of basis) r = vsub(r, b.map((x) => x * dot(r, b)));
  return norm(r);
}

/** The point of the reach nearest to q. */
export function nearestInSpan(vs: Vec[], q: Vec): Vec {
  const basis: Vec[] = [];
  for (const v of vs) {
    let r = v.slice();
    for (const b of basis) r = vsub(r, b.map((x) => x * dot(r, b)));
    const n = norm(r);
    if (n > 1e-9) basis.push(r.map((x) => x / n));
  }
  const out = q.map(() => 0);
  for (const b of basis) { const k = dot(q, b); b.forEach((x, i) => { out[i] += k * x; }); }
  return out;
}

/** Do two sets of arrows reach exactly the same places? */
export const sameReach = (a: Vec[], b: Vec[]): boolean => spanDim(a) === spanDim(b) && spanDim(a) === spanDim([...a, ...b]);

/**
 * Weights (a, b) with a·v + b·w closest to q (exact when q is reachable). When v and w lie on one
 * line the weights are not unique: b is kept and a is solved (or the other way if v is zero).
 */
export function weights2(v: Vec, w: Vec, q: Vec, keepB = 0): [number, number] {
  const vv = dot(v, v), ww = dot(w, w), vw = dot(v, w);
  const d = vv * ww - vw * vw;
  if (Math.abs(d) > 1e-9 * Math.max(1, vv * ww)) {
    const qv = dot(q, v), qw = dot(q, w);
    return [(qv * ww - qw * vw) / d, (qw * vv - qv * vw) / d];
  }
  if (vv > 1e-12) return [dot(vsub(q, w.map((x) => x * keepB)), v) / vv, keepB];
  if (ww > 1e-12) return [0, dot(q, w) / ww];
  return [0, 0];
}

export const near = (a: Vec, b: Vec, tol = 0.05): boolean => norm(vsub(a, b.length === a.length ? b : [...b, 0].slice(0, a.length))) <= tol;

// ------------------------------------------------------------------ win checks

/** p1: w = (2, k) lies on v's line (the glow is a line). */
export const p1Collapsed = (k: number, tol = 0.05): boolean => Math.abs(P1_V[0] * k - P1_V[1] * 2) <= tol * Math.abs(P1_V[0]);
/** p1: the glow is a line and the beacon is off it. */
export const p1Won = (k: number, beacon: Vec, tol = 0.05): boolean => p1Collapsed(k, tol) && distToSpan([P1_V, p1W(P1_K)], beacon) >= 0.3;
/** p2–p4: the ship landed on the target. */
export const landedOn = (end: Vec, target: Vec, tol = 0.05): boolean => near(end, target, tol);
/** p5: the beacon is off the line the backup pair reaches. */
export const p5Won = (beacon: Vec): boolean => distToSpan([V, BACKUP], beacon) >= 0.3;
/** p6: looking along the plane (the plane seen edge-on). */
export const edgeOn = (viewDir: Vec, n: Vec = PLANE_N, tol = 0.12): boolean => Math.abs(dot(viewDir, n)) / (norm(viewDir) * norm(n)) < tol;
/**
 * p7: the probe colour is inside the colour cube and off the plane of the two lamps. The probe
 * sliders step by 0.1, so a probe is either on the plane or at least 0.05 / |(0.5, −1, 0.5)| ≈ 0.041
 * off it; the threshold sits below that, so every off-plane probe counts.
 */
export const P7_OFF = 0.02;
export const p7OffPlane = (probe: Vec): boolean => probe.every((x) => x >= -1e-9 && x <= 1 + 1e-9) && distToSpan([LAMP_WARM, LAMP_COOL], probe) >= P7_OFF;

// ------------------------------------------------------------------ doubts

/**
 * (F) "Make both thrusters twice as strong and we'll reach new places."
 * Bram's "new place" is what the doubled pair reaches with his dials. The claim holds for the scene
 * while the old pair, at the player's dials, does not land on it.
 */
export function doubledNewHolds(v: Vec, w: Vec, bram: Vec, mine: Vec): boolean {
  const place = combo([2 * bram[0], 2 * bram[1]], [v, w]);
  return !near(combo(mine, [v, w]), place, 0.05);
}
export const bramPlace = (v: Vec, w: Vec, bram: Vec): Vec => combo([2 * bram[0], 2 * bram[1]], [v, w]);

/** (T) "Point one thruster backwards and we reach exactly the same places." */
export const flippedSameHolds = (v: Vec, w: Vec): boolean => sameReach([v, w], [v, w.map((x) => -x)]);

// ------------------------------------------------------------------ the Law

export interface SpanCase { v: Vec; w: Vec }

const isZero = (v: Vec) => v.every((x) => Math.abs(x) < 1e-12);
const shapeDim: Record<string, number> = { plane: 2, line: 1, point: 0 };
const shapeWord = ['a point', 'a line', 'the whole plane'];
const fmt = (v: Vec) => `(${v.map((x) => String(Math.round(x * 100) / 100).replace('-', '−')).join(', ')})`;

function condition(f: Record<string, string>, c: SpanCase): boolean {
  const cr = c.v[0] * c.w[1] - c.v[1] * c.w[0];
  const both = isZero(c.v) && isZero(c.w);
  const either = isZero(c.v) || isZero(c.w);
  switch (f.cond) {
    case 'apart': return Math.abs(cr) > 1e-9;
    case 'oneline': return Math.abs(cr) <= 1e-9;
    case 'onelineNZ': return Math.abs(cr) <= 1e-9 && !both;
    case 'differ': return !(c.v[0] === c.w[0] && c.v[1] === c.w[1]);
    case 'apartOrZero': return Math.abs(cr) > 1e-9 || either;
    default: return both;
  }
}

/** "The span of v and w is [shape] exactly when [cond]." */
export const lawCore: LawCore<SpanCase> & { answer: Record<string, string> } = {
  id: 'c02-law',
  answer: { shape: 'plane', cond: 'apart' },
  gen(r) {
    const x = r();
    const rv = (): Vec => [rint(r, -5, 5), rint(r, -5, 5)];
    if (x < 0.06) return { v: [0, 0], w: [0, 0] };
    if (x < 0.16) { const a = rv(); return r() < 0.5 ? { v: [0, 0], w: a } : { v: a, w: [0, 0] }; }
    if (x < 0.46) {
      const v = rv();
      const k = [-3, -2, -1.5, -1, -0.5, 0.5, 1, 2, 3][rint(r, 0, 8)];
      return { v, w: [k * v[0], k * v[1]] };
    }
    return { v: rv(), w: rv() };
  },
  edgeCases: [
    { v: [0, 0], w: [0, 0] }, { v: [0, 0], w: [1, 2] }, { v: [2, 1], w: [-4, -2] },
    { v: [2, 1], w: [2, 1] }, { v: [1, 2], w: [2, 4] }, { v: [2, 1], w: [1, 3] },
  ],
  holds: (f, c) => (spanDim([c.v, c.w]) === shapeDim[f.shape]) === condition(f, c),
  describe: (c) => `v = ${fmt(c.v)}, w = ${fmt(c.w)}: together they reach ${shapeWord[spanDim([c.v, c.w])]}`,
};

// ------------------------------------------------------------------ crew versions of the builds

/** lincomb(cs, vs): cs[0]·vs[0] + cs[1]·vs[1] + … */
export const lincombCrew = (cs: number[], vs: Vec[]): Vec => combo(cs, vs);

/** reachable(v, w, target): brute force over dials −10..10 in steps of 0.1 (40,401 tries); null if none lands within 0.05. */
export function reachableCrew(v: Vec, w: Vec, target: Vec): Vec | null {
  for (let i = -100; i <= 100; i++) {
    const a = i / 10;
    for (let j = -100; j <= 100; j++) {
      const b = j / 10;
      let ok = true;
      for (let k = 0; k < target.length; k++) if (Math.abs(a * v[k] + b * w[k] - target[k]) > 0.05) { ok = false; break; }
      if (ok) return [a, b];
    }
  }
  return null;
}
