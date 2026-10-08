// Chapter 5 pure logic (no DOM, no three): the story numbers, every win check, the doubt predicates,
// the Law core, the inside-out hull and the crew versions of the builds.
// Unit-tested in tests/singular/game-c05.test.ts.
import { angle, cross, cross2, dot, norm, type Vec } from '../../../math/la.ts';
import { nice } from '../../../math/frac.ts';
import { rint, rng, type LawCore } from '../../../game/lawcheck.ts';

export const fmt = (v: readonly number[]) => `(${v.map((x) => nice(x)).join(', ')})`;
export const deg = (r: number) => (r * 180) / Math.PI;
const sub = (a: readonly number[], b: readonly number[]): Vec => a.map((x, i) => x - b[i]);
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const nearV = (a: readonly number[], b: readonly number[], tol: number) => a.length === b.length && a.every((x, i) => near(x, b[i], tol));
const isZero = (v: readonly number[], tol = 1e-9) => v.every((x) => Math.abs(x) <= tol);

/** Rotate p about the axis k by t radians (Rodrigues): counter-clockwise seen from k's tip. */
export function rotateAbout(p: readonly number[], k: readonly number[], t: number): Vec {
  const l = norm(k as Vec);
  const kk = l < 1e-12 ? [0, 0, 1] : (k as Vec).map((x) => x / l);
  const c = Math.cos(t), s = Math.sin(t);
  const kxp = cross(kk, p as Vec);
  const kdp = dot(kk, p as Vec);
  return [0, 1, 2].map((i) => p[i] * c + kxp[i] * s + kk[i] * kdp * (1 - c));
}

/** Area of the parallelogram on a and b, from base times height (no cross product involved). */
export function parallelogramArea(a: readonly number[], b: readonly number[]): number {
  const al = norm(a as Vec);
  if (al < 1e-12) return 0;
  const k = dot(a as Vec, b as Vec) / (al * al);
  return al * norm(sub(b, a.map((x) => x * k)));
}

// ------------------------------------------------------------------ p1 [D] Find the axis (RAISE)

export const P1_V: Vec = [2, 0, 0];
export const P1_W: Vec = [1, 3, 0];
export const P1_AREA = parallelogramArea(P1_V, P1_W);   // 6
/** An arrow with both readings 0 and length equal to the shaded area: (0, 0, 6) (or its flip). */
export function p1Won(n: readonly number[], tol = 0.05): boolean {
  return Math.abs(dot(n as Vec, P1_V)) <= tol && Math.abs(dot(n as Vec, P1_W)) <= tol && near(norm(n as Vec), P1_AREA, tol);
}

// ------------------------------------------------------------------ p2 Which order?

export type Order = 'vw' | 'wv';
export const raised = (o: Order, v: Vec = P1_V, w: Vec = P1_W) => (o === 'vw' ? cross(v, w) : cross(w, v));
/** The angle from the heading v to the target w. */
export const P2_TURN = angle(P1_V, P1_W);
/** Spin the heading v about the raised arrow by the angle between v and w (right-handed). */
export const headingAfter = (o: Order) => rotateAbout(P1_V, raised(o), P2_TURN);
export const p2Won = (o: Order) => deg(angle(headingAfter(o), P1_W)) < 0.5;

// ------------------------------------------------------------------ p3 [D] Where the formula comes from

export const P3_A: Vec = [1, 2, 0];
export const P3_B: Vec = [0, 1, 3];
/** The 2 × 2 pattern: (a₂b₃ − a₃b₂, a₃b₁ − a₁b₃, a₁b₂ − a₂b₁). */
export const pattern = (a: readonly number[], b: readonly number[]): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const P3_N = pattern(P3_A, P3_B);                                       // (6, −3, 1)
export const P3_SQ = dot(P3_A, P3_A) * dot(P3_B, P3_B) - dot(P3_A, P3_B) ** 2;  // 50 − 4 = 46
/** Every answer of n·a = 0, n·b = 0 is a multiple of (6, −3, 1); the pattern picks t = 1. */
export const p3Answer = (t: number): Vec => P3_N.map((x) => x * t);
export const p3Won = (t: number, tol = 0.02) => near(t, 1, tol);

// ------------------------------------------------------------------ p4 [H] [X4] The hangar door

export const DOOR_P: Vec = [1, 0, 0];
export const DOOR_Q: Vec = [0, 2, 0];
export const DOOR_R: Vec = [0, 0, 3];
export const DOOR = {
  pq: sub(DOOR_Q, DOOR_P),                                        // (−1, 2, 0)
  pr: sub(DOOR_R, DOOR_P),                                        // (−1, 0, 3)
  n: cross(sub(DOOR_Q, DOOR_P), sub(DOOR_R, DOOR_P)),            // (6, 3, 2)
  len: norm(cross(sub(DOOR_Q, DOOR_P), sub(DOOR_R, DOOR_P))),    // 7
  area: norm(cross(sub(DOOR_Q, DOOR_P), sub(DOOR_R, DOOR_P))) / 2, // 3.5
};

// ------------------------------------------------------------------ p5 The inside-out hull

export const HULL = { around: 120, rings: 75, radius: 3, length: 16, seed: 18000 };
/** 74 bands of squares between 75 rings, closed by a fan of triangles at each tip: 18,000 triangles. */
export const HULL_TRIS = HULL.around * (HULL.rings - 1) * 2 + 2 * HULL.around;
export type Tri = [Vec, Vec, Vec];
export type Rule = 'negative' | 'positive' | 'zero';
export const HULL_CENTRE: Vec = [0, 0, 0];

/** The normal of a triangle from its corner order: (B − A) × (C − A). */
export const triNormal = (t: Tri): Vec => cross(sub(t[1], t[0]), sub(t[2], t[0]));
const centroid = (t: Tri): Vec => [0, 1, 2].map((i) => (t[0][i] + t[1][i] + t[2][i]) / 3);
/** The reading of a triangle's normal against the arrow from the hull's centre to the triangle. */
export const outwardReading = (t: Tri, c: Vec = HULL_CENTRE) => dot(triNormal(t), sub(centroid(t), c));

/**
 * The ark's hull as a closed, rounded capsule of 18,000 triangles (in holotable units), cut into
 * panels (10 squares around by 5 along; 10 triangles at the tips). Panels chosen by a seed, exactly
 * 9,000 triangles in all, list their corners in the wrong order. `panel` gives each triangle's panel.
 */
export function hullTriangles(): { tris: Tri[]; wrong: boolean[]; panel: number[] } {
  const { around, rings, radius, length } = HULL;
  const half = length / 2;
  const ringAt = (i: number) => {
    const x = -half * 0.97 + (2 * half * 0.97 * i) / (rings - 1);
    const r = radius * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x / half), 4)), 0.25);
    return { x, r };
  };
  const P = (i: number, j: number): Vec => { const { x, r } = ringAt(i); const a = (2 * Math.PI * (j % around)) / around; return [x, r * Math.cos(a), r * Math.sin(a)]; };
  const tipA: Vec = [-half, 0, 0], tipB: Vec = [half, 0, 0];
  const raw: { t: Tri; panel: number }[] = [];
  const cols = around / 10;
  for (let j = 0; j < around; j++) raw.push({ t: [tipA, P(0, j), P(0, j + 1)], panel: Math.floor(j / 10) });
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < around; j++) {
      const panel = cols + Math.floor(i / 5) * cols + Math.floor(j / 10);
      const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
      raw.push({ t: [a, b, c], panel }, { t: [a, c, d], panel });
    }
  }
  const lastPanel = cols + Math.ceil((rings - 1) / 5) * cols;
  for (let j = 0; j < around; j++) raw.push({ t: [tipB, P(rings - 1, j + 1), P(rings - 1, j)], panel: lastPanel + Math.floor(j / 10) });
  // the true order faces out
  for (const x of raw) if (outwardReading(x.t) < 0) x.t = [x.t[0], x.t[2], x.t[1]];
  // the corrupted record: whole panels, in a seeded order, until exactly half the triangles are flipped
  const np = lastPanel + cols;
  const size = new Array(np).fill(0);
  raw.forEach((x) => { size[x.panel]++; });
  const R = rng(HULL.seed);
  const ids = Array.from({ length: np }, (_, k) => k);
  for (let k = np - 1; k > 0; k--) { const m = Math.floor(R() * (k + 1)); [ids[k], ids[m]] = [ids[m], ids[k]]; }
  const flipped = new Set<number>();
  let total = 0;
  for (const id of ids) if (total + size[id] <= raw.length / 2) { flipped.add(id); total += size[id]; }
  const tris: Tri[] = [], wrong: boolean[] = [], panel: number[] = [];
  for (const x of raw) {
    const bad = flipped.has(x.panel);
    tris.push(bad ? [x.t[0], x.t[2], x.t[1]] : x.t);
    wrong.push(bad);
    panel.push(x.panel);
  }
  return { tris, wrong, panel };
}

/** The corner-order rule: swap B and C on every triangle whose reading is negative / positive / zero. */
export function applyRule(tris: Tri[], rule: Rule, c: Vec = HULL_CENTRE): Tri[] {
  return tris.map((t) => {
    const r = outwardReading(t, c);
    const hit = rule === 'negative' ? r < 0 : rule === 'positive' ? r > 0 : Math.abs(r) < 1e-12;
    return hit ? [t[0], t[2], t[1]] as Tri : t;
  });
}
export const outwardCount = (tris: Tri[], c: Vec = HULL_CENTRE) => tris.reduce((n, t) => n + (outwardReading(t, c) > 0 ? 1 : 0), 0);
export const p5Won = (tris: Tri[]) => outwardCount(tris) === tris.length;

// ------------------------------------------------------------------ p6 No axis

export const P6_V: Vec = [2, 4, 6];
export const P6_W: Vec = [1, 2, 3];
/** The second strut turned away from the first by theta degrees (it lies along the first at 0). */
const P6_AXIS = cross(P6_V, [0, 0, 1]);
export const p6W = (thetaDeg: number): Vec => rotateAbout(P6_W, P6_AXIS, (thetaDeg * Math.PI) / 180);
export const p6Won = (thetaDeg: number) => norm(cross(P6_V, p6W(thetaDeg))) < 1e-9;

// ------------------------------------------------------------------ p7 [S] Left or right? (signed area in 2-D)

export const P7_A: Vec = [0, 0], P7_B: Vec = [4, 0], P7_C: Vec = [5, 3];
/**
 * The signed area v₁w₂ − v₂w₁ (leg in, then leg out) at every corner A, B, C, D of the loop
 * A → B → C → D → A, in that order. The turn at A is 4·D₂, so D must sit above the line AB too.
 */
export function turns(D: readonly number[]): number[] {
  const pts = [P7_A, P7_B, P7_C, D.slice(0, 2)];
  return [0, 1, 2, 3].map((k) => cross2(sub(pts[k], pts[(k + 3) % 4]), sub(pts[(k + 1) % 4], pts[k])));
}
export const p7Won = (D: readonly number[]) => turns(D).every((x) => x > 1e-9);

// ------------------------------------------------------------------ Doubts

/** (F) "v × w and w × v are the same arrow." */
export const swapSame = (v: readonly number[], w: readonly number[]) => nearV(cross(v as Vec, w as Vec), cross(w as Vec, v as Vec), 1e-9);
/** (T) "Double one edge and the cross product's length doubles." */
export const doubleDoubles = (v: readonly number[], w: readonly number[]) =>
  near(norm(cross(v.map((x) => 2 * x), w as Vec)), 2 * norm(cross(v as Vec, w as Vec)), 1e-9);

// ------------------------------------------------------------------ the Law

export interface CrossCase { a: Vec; b: Vec }

export const lawCore: LawCore<CrossCase> & { answer: Record<string, string> } = {
  id: 'c05-law',
  answer: { perp: 'ab', len: 'area', swap: 'flips' },
  gen(r) {
    const rv = () => [rint(r, -4, 4), rint(r, -4, 4), rint(r, -4, 4)];
    const a = rv();
    let b = rv();
    const k = r();
    if (k < 0.1) b = a.map((x) => x * rint(r, -2, 2));          // parallel (or zero)
    else if (k < 0.15) b = [0, 0, 0];
    return { a, b };
  },
  edgeCases: [
    { a: [2, 0, 0], b: [1, 3, 0] },      // the first panel
    { a: [1, 2, 3], b: [2, 4, 6] },      // parallel
    { a: [0, 0, 0], b: [1, 2, 0] },      // the zero vector
    { a: [1, 0, 0], b: [0, 1, 0] },      // at a right angle
    { a: [1, 2, 0], b: [-2, -4, 0] },    // opposite
    { a: [1, 2, 0], b: [0, 1, 3] },
  ],
  holds(f, c) {
    const n = cross(c.a, c.b);
    const pa = Math.abs(dot(n, c.a)) < 1e-9, pb = Math.abs(dot(n, c.b)) < 1e-9;
    // 'a only' means at a right angle to a and not to b (and the other way round for 'b only')
    const perp = f.perp === 'ab' ? pa && pb : f.perp === 'a' ? pa && !pb : f.perp === 'b' ? pb && !pa : !pa && !pb;
    const len = f.len === 'area' ? near(norm(n), parallelogramArea(c.a, c.b), 1e-6) : near(norm(n), norm(c.a) * norm(c.b), 1e-6);
    const ba = cross(c.b, c.a);
    const swap = f.swap === 'flips' ? nearV(ba, n.map((x) => -x), 1e-9) : nearV(ba, n, 1e-9);
    return perp && len && swap;
  },
  describe(c) {
    const n = cross(c.a, c.b);
    return `a = ${fmt(c.a)}, b = ${fmt(c.b)}: a × b = ${fmt(n)}, (a × b)·a = ${nice(dot(n, c.a))}, (a × b)·b = ${nice(dot(n, c.b))}, area ${nice(Math.round(parallelogramArea(c.a, c.b) * 100) / 100)}, b × a = ${fmt(cross(c.b, c.a))}`;
  },
};

// ------------------------------------------------------------------ crew versions of the builds (TypeScript)

export const crew = {
  cross: (v: number[], w: number[]) => [v[1] * w[2] - v[2] * w[1], v[2] * w[0] - v[0] * w[2], v[0] * w[1] - v[1] * w[0]],
  normal: (a: number[], b: number[], c: number[]) => crew.cross(sub(b, a), sub(c, a)),
  area: (a: number[], b: number[], c: number[]) => Math.hypot(...crew.normal(a, b, c)) / 2,
};

export function swarmVec(r: () => number, lo = -6, hi = 6): number[] { return [rint(r, lo, hi), rint(r, lo, hi), rint(r, lo, hi)]; }
export { isZero };
