// Chapter 21 pure logic (no DOM, no three): every number on screen, the win checks, the Doubt predicates,
// the Law core and the crew version of `project`. Unit-tested in tests/singular/game-c21.test.ts.
import {
  colspace, cross, dot, fromCols, inverse, matMul, matVec, norm, proj, projectOntoCols, transpose, vadd, vscale, vsub,
  type Mat, type Vec,
} from '../../../math/la.ts';
import { rint, type LawCore } from '../../../game/lawcheck.ts';
import { niceTex } from '../../../math/frac.ts';
import { HATCH, HATCH_FOOT, TETHER } from '../../truth.ts';

export { HATCH, HATCH_FOOT, TETHER };

const r2 = (x: number) => Math.round(x * 100) / 100;
/** (1, 2) or (1, 2, 3), each number to at most two decimals (−0 shown as 0). */
export const fmtV = (v: readonly number[], d = 2): string => `(${v.map((x) => { const y = Math.round(x * 10 ** d) / 10 ** d; return Object.is(y, -0) || Math.abs(y) < 10 ** -d / 2 ? '0' : String(y).replace('-', '−'); }).join(', ')})`;
export const fmtN = (x: number, d = 2): string => { const y = Math.round(x * 10 ** d) / 10 ** d; return Math.abs(y) < 10 ** -d / 2 ? '0' : y.toFixed(d).replace('-', '−'); };
export const near = (a: readonly number[], b: readonly number[], tol: number): boolean => norm(vsub([...a], [...b])) <= tol;
/** A matrix in TeX, entries as simple fractions. */
export const texM = (M: Mat): string => `\\begin{bmatrix} ${M.map((r) => r.map((x) => niceTex(x)).join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;
export const tolFor = (d: string): number => (d === 'commander' ? 0.01 : 0.05);

/** The orthogonal projection of b onto the column space of A (any columns, dependent ones dropped). */
export function project(A: Mat, b: Vec): Vec {
  const basis = colspace(A);
  if (!basis.length) return b.map(() => 0);
  return projectOntoCols(fromCols(basis), b)!;
}

// ------------------------------------------------------------------ p1 Onto a line

export const P1_A: Vec = [1, 2];
export const P1_B: Vec = [3, 1];
export const P1_FOOT: Vec = proj(P1_B, P1_A);                 // (1, 2)
export const P1_LEFT: Vec = vsub(P1_B, P1_FOOT);              // (2, −1)
export const P1_DIST = norm(P1_LEFT);                         // √5
/** p1: the probe t·a is the foot of the perpendicular from b. */
export const p1Won = (t: number, tol = 0.05) => near(vscale(P1_A, t), P1_FOOT, tol);

// ------------------------------------------------------------------ p2 Get close enough (the hatch, TT16)

export const THR1: Vec = [1, 0, 1];
export const THR2: Vec = [0, 1, 1];
export const THR: Mat = fromCols([THR1, THR2]);
/** The plane the two thrusters reach: z = x + y, with normal (1, 1, −1). */
export const THR_NORMAL: Vec = [1, 1, -1];
export const onThrusterPlane = (p: readonly number[], tol = 1e-9) => Math.abs(p[2] - p[0] - p[1]) <= tol;
export const HATCH_LEFT: Vec = vsub(HATCH, HATCH_FOOT);       // (2/3, 2/3, −2/3)
export const HATCH_DIST = norm(HATCH_LEFT);                   // 1.155
/** Straight up from the hatch, on the plane: the near-miss in the Doubt (2 away). */
export const HATCH_UP: Vec = [HATCH[0], HATCH[1], HATCH[0] + HATCH[1]];
/** p2: the ship parks at the closest point (and so the tether reaches). */
export const p2Won = (q: readonly number[], tol = 0.05) => near(q, HATCH_FOOT, tol) && norm(vsub(HATCH, [...q])) <= TETHER;
/** Where the weights s, t on the two thrusters put the ship. */
export const thrusterPoint = (s: number, t: number): Vec => [s, t, s + t];

// ------------------------------------------------------------------ p3 [D] Sum of shadows, perpendicular basis

export const P3_U1: Vec = [1, 1, 0];
export const P3_U2: Vec = [0, 0, 1];
export const P3_B: Vec = [3, 1, 2];
export const P3_S1: Vec = proj(P3_B, P3_U1);                   // (2, 2, 0)
export const P3_S2: Vec = proj(P3_B, P3_U2);                   // (0, 0, 2)
export const P3_P: Vec = vadd(P3_S1, P3_S2);                   // (2, 2, 2)
export const P3_LEFT: Vec = vsub(P3_B, P3_P);                  // (1, −1, 0)
/** The weights c₁, c₂ in p = c₁u₁ + c₂u₂: the leftover reads 0 against each arrow, and u₂·u₁ = 0 drops the cross term. */
export const P3_C: Vec = [dot(P3_B, P3_U1) / dot(P3_U1, P3_U1), dot(P3_B, P3_U2) / dot(P3_U2, P3_U2)]; // (2, 2)
export const p3Won = (q: readonly number[], tol = 0.05) => near(q, P3_P, tol);

// ------------------------------------------------------------------ p4 The trap: a skewed basis

export const P4_K1: Vec = [1, 0, 0];
export const P4_K2: Vec = [1, 1, 0];
export const P4_B: Vec = [2, 3, 4];
export const P4_S1: Vec = proj(P4_B, P4_K1);                   // (2, 0, 0)
export const P4_S2: Vec = proj(P4_B, P4_K2);                   // (2.5, 2.5, 0)
export const P4_WRONG: Vec = vadd(P4_S1, P4_S2);               // (4.5, 2.5, 0)
export const P4_FOOT: Vec = project(fromCols([P4_K1, P4_K2]), P4_B); // (2, 3, 0)
/** The overlap: the second shadow dropped onto the first arrow's line. Both shadows push along it. */
export const P4_OVERLAP: Vec = proj(P4_S2, P4_K1);             // (2.5, 0, 0)
export const p4FootOk = (q: readonly number[], tol = 0.05) => near(q, P4_FOOT, tol);
export const p4OverlapOk = (q: readonly number[], tol = 0.05) => near(q, P4_OVERLAP, tol);

// ------------------------------------------------------------------ p5 [H] Projection onto a plane, any basis

export const P5_A1: Vec = [1, 1, 0];
export const P5_A2: Vec = [0, 1, 1];
export const P5_A: Mat = fromCols([P5_A1, P5_A2]);
export const P5_B: Vec = [1, 2, 3];
export const P5_ATA: Mat = matMul(transpose(P5_A), P5_A);      // [[2, 1], [1, 2]]
export const P5_ATB: Vec = matVec(transpose(P5_A), P5_B);      // (3, 5)
export const P5_X: Vec = matVec(inverse(P5_ATA)!, P5_ATB);     // (1/3, 7/3)
export const P5_P: Vec = matVec(P5_A, P5_X);                   // (1/3, 8/3, 7/3)
export const P5_LEFT: Vec = vsub(P5_B, P5_P);                  // (2/3, −2/3, 2/3)

// ------------------------------------------------------------------ p6 Remove the hum

export const P6_S: Vec = [4, 3];
export const P6_D: Vec = [0.6, 0.8];
export const P6_ALONG: Vec = proj(P6_S, P6_D);                 // (2.88, 3.84)
export const P6_KEEP: Vec = vsub(P6_S, P6_ALONG);              // (1.12, −0.84)
export const P6_T = dot(P6_S, P6_D);                           // 4.8: how far along d the foot is
/** p6: the part kept is perpendicular to the hum and adds back to s with the part along d. */
export const p6Won = (keep: readonly number[], tol = 0.05) => near(keep, P6_KEEP, tol);

// ------------------------------------------------------------------ p7 Twice is once

export const P7_DIR: Vec = [1, 2];
export const P7: Mat = [[1, 2], [2, 4]].map((r) => r.map((x) => x / 5));
export const P7_NULL: Vec = [2, -1];
/** p7: a non-zero arrow that P sends to the origin. */
export const p7NullOk = (x: readonly number[], tol = 0.05) => norm([...x]) > 0.4 && norm(matVec(P7, [...x])) <= tol;

// ------------------------------------------------------------------ p8 [S] The projection matrix of p5's plane

export const P8_INV: Mat = inverse(P5_ATA)!;                   // (1/3)[[2, −1], [−1, 2]]
export const P8: Mat = matMul(matMul(P5_A, P8_INV), transpose(P5_A)); // (1/3)[[2, 1, −1], [1, 2, 1], [−1, 1, 2]]

// ------------------------------------------------------------------ Doubts

/** (F) "The closest point on the plane is straight up from the hatch." Holds unless q (on the plane) is nearer than straight up. */
export function straightUpHolds(target: readonly number[], q: readonly number[]): boolean {
  const up = [target[0], target[1], target[0] + target[1]];
  return !(norm(vsub([...target], [...q])) < norm(vsub([...target], up)) - 0.01);
}

/** (F) "Adding the shadows works for any basis." Holds when the sum of the two shadows is the closest point. */
export function shadowSumHolds(k1: Vec, k2: Vec, b: Vec): boolean {
  if (norm(cross(pad3(k1), pad3(k2))) < 1e-6) return true; // no plane: nothing to claim
  const sum = vadd(proj(pad3(b), pad3(k1)), proj(pad3(b), pad3(k2)));
  return near(sum, project(fromCols([pad3(k1), pad3(k2)]), pad3(b)), 0.02);
}
const pad3 = (v: readonly number[]): Vec => [v[0], v[1], v[2] ?? 0];

/** (T) "Projecting twice lands on the same point as projecting once." */
export function twiceHolds(d: Vec, x: Vec): boolean {
  if (norm(d) < 1e-9) return true;
  const once = proj(x, d), twice = proj(once, d);
  return near(once, twice, 1e-9);
}

// ------------------------------------------------------------------ the Law

/** A plane through the origin (spanned by a and b), a point, and other points of the plane to test the "exactly when". */
export interface PlaneCase { a: Vec; b: Vec; target: Vec; others: Vec[] }

const unitLike = (u: Vec) => { const n = norm(u); return n < 1e-12 ? u : vscale(u, 1 / n); };
const perp = (r: Vec, w: Vec) => norm(r) < 1e-9 || Math.abs(dot(unitLike(r), unitLike(w))) < 1e-7;
const par = (r: Vec, w: Vec) => norm(r) < 1e-9 || norm(cross(unitLike(r), unitLike(w))) < 1e-7;
const Z: Vec = [0, 0, 1];

/** Does the leftover r satisfy the filled condition? */
export function leftoverIs(f: Record<string, string>, r: Vec, c: PlaneCase): boolean {
  const rel = f.rel === 'par' ? par : perp;
  if (f.to === 'first') return rel(r, c.a);
  if (f.to === 'z') return rel(r, Z);
  return rel(r, c.a) && rel(r, c.b);
}

export function makeCase(a: Vec, b: Vec, target: Vec, extra: Vec[] = []): PlaneCase {
  const A = fromCols([a, b]);
  const p = project(A, target);
  const n = cross(a, b);
  const others: Vec[] = [];
  // a point of the plane whose leftover is also perpendicular to a (the 'first arrow only' trap)
  const w = cross(n, a);
  if (norm(w) > 1e-9) others.push(vadd(p, vscale(w, 1 / norm(w))));
  // the point of the plane straight above or below the target (the 'along z' trap), when there is one
  if (Math.abs(n[2]) > 1e-9) { const zz = -(n[0] * target[0] + n[1] * target[1]) / n[2]; others.push([target[0], target[1], zz]); }
  others.push(vadd(p, a), vadd(p, vscale(b, -1)), [0, 0, 0], ...extra);
  return { a, b, target, others: others.filter((q) => norm(vsub(q, p)) > 0.1) };
}

export const lawCore: LawCore<PlaneCase> & { answer: Record<string, string> } = {
  id: 'c21-law',
  answer: { rel: 'perp', to: 'plane' },
  gen(r) {
    let a: Vec, b: Vec;
    do { a = [rint(r, -3, 3), rint(r, -3, 3), rint(r, -3, 3)]; b = [rint(r, -3, 3), rint(r, -3, 3), rint(r, -3, 3)]; } while (norm(cross(a, b)) < 1);
    return makeCase(a, b, [rint(r, -4, 4), rint(r, -4, 4), rint(r, -4, 4)]);
  },
  edgeCases: [
    makeCase(THR1, THR2, HATCH),                 // the hatch
    makeCase([1, 0, 0], [0, 1, 0], [1, 2, 3]),   // a floor: straight down is the closest point here
    makeCase(P5_A1, P5_A2, P5_B),
    makeCase(THR1, THR2, [2, 3, 5]),             // a point already on the plane: the leftover is zero
  ],
  holds(f, c) {
    const p = project(fromCols([c.a, c.b]), c.target);
    if (!leftoverIs(f, vsub(c.target, p), c)) return false;
    return c.others.every((q) => !leftoverIs(f, vsub(c.target, q), c));
  },
  describe(c) {
    const p = project(fromCols([c.a, c.b]), c.target);
    return `the plane of ${fmtV(c.a)} and ${fmtV(c.b)}, the point $\\mathbf b = ${fmtV(c.target)}$; its closest point is ${fmtV(p)}`;
  },
};

// ------------------------------------------------------------------ the crew version of the build

export const crew = {
  project: (A: Mat, b: Vec): Vec => project(A, b),
};

/** A random build case: A with 1 to n − 1 columns (sometimes one repeated), b anywhere. */
export function projectCase(r: () => number, level: string): [Mat, Vec] {
  const n = rint(r, 2, 4);
  const k = rint(r, 1, n - 1);
  const num = () => (level === 'cadet' ? rint(r, -3, 3) : level === 'navigator' ? rint(r, -8, 8) / 2 : rint(r, -40, 40) / 10);
  let cols: Vec[];
  do { cols = Array.from({ length: k }, () => Array.from({ length: n }, num)); } while (colspace(fromCols(cols)).length < k);
  if (k >= 2 && r() < 0.1) cols[k - 1] = vscale(cols[0], 2); // a wasted column: the answer is the same
  return [fromCols(cols), Array.from({ length: n }, num)];
}

export { r2 };
