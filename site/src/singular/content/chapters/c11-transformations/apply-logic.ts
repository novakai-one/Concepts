// Chapter 11, games 1–3 (pure data and checks, no DOM): A v = ?, find A, and "is there a matrix?".
import { col, matVec, type Mat, type Vec } from '../../../math/la.ts';

const TOL = 1e-6;
export const same = (a: Vec, b: Vec): boolean => Math.abs(a[0] - b[0]) <= TOL && Math.abs(a[1] - b[1]) <= TOL;
export const sameM = (A: Mat, B: Mat): boolean => same(A[0], B[0]) && same(A[1], B[1]);
const clean = (v: Vec): Vec => v.map((x) => (Math.abs(x) < 1e-12 ? 0 : Math.round(x * 1e9) / 1e9));
export const apply = (A: Mat, v: Vec): Vec => clean(matVec(A, v));
export const transpose2 = (A: Mat): Mat => [[A[0][0], A[1][0]], [A[0][1], A[1][1]]];

// ------------------------------------------------------------------ game 1 · A v = ?

/** Forward: A v = ? (type A v). Reverse: A v = w (type v). */
export interface ApplyRound { A: Mat; v: Vec; reverse?: boolean }
export const G1: ApplyRound[] = [
  { A: [[1, -2], [1, -1]], v: [1, 0] },
  { A: [[1, -2], [1, -1]], v: [0, 1] },
  { A: [[1, -2], [1, -1]], v: [3, 2] },
  { A: [[2, 1], [0, 3]], v: [2, -1] },
  { A: [[0, -1], [1, 0]], v: [2, 1] },
  { A: [[3, 1], [-1, 2]], v: [-1, 2] },
  { A: [[1, 2], [2, 4]], v: [2, -1] },
  { A: [[0.5, 0], [0, 2]], v: [4, 1] },
  { A: [[2, 1], [1, -1]], v: [2, 1], reverse: true },
  { A: [[1, 3], [2, 1]], v: [-2, 1], reverse: true },
];
/** The answer the player types: A v (forward) or v (reverse). */
export const g1Answer = (r: ApplyRound): Vec => (r.reverse ? r.v.slice() : apply(r.A, r.v));
/** Is the typed vector right? Reverse rounds accept any v with A v = w (the A here are invertible). */
export const g1Right = (r: ApplyRound, typed: Vec): boolean => (r.reverse ? same(apply(r.A, typed), apply(r.A, r.v)) : same(typed, apply(r.A, r.v)));
/** A wrong forward answer that used the rows of A as columns (A transpose times v). */
export const usedRows = (r: ApplyRound, typed: Vec): boolean => !r.reverse && !same(apply(r.A, r.v), apply(transpose2(r.A), r.v)) && same(typed, apply(transpose2(r.A), r.v));

// ------------------------------------------------------------------ game 2 · find A

/** A u₁ = w₁ and A u₂ = w₂: the player types A. */
export interface FindRound { u: [Vec, Vec]; w: [Vec, Vec] }
export const G2: FindRound[] = [
  { u: [[1, 0], [0, 1]], w: [[2, 1], [-1, 1]] },
  { u: [[1, 0], [0, 1]], w: [[0, 1], [1, 0]] },
  { u: [[2, 0], [0, 1]], w: [[4, 2], [1, 3]] },
  { u: [[1, 0], [1, 1]], w: [[3, 0], [3, 2]] },
  { u: [[1, 1], [1, -1]], w: [[3, 3], [1, -1]] },
  { u: [[1, 1], [1, -1]], w: [[0, 2], [2, 0]] },
  { u: [[1, 2], [0, 1]], w: [[5, 0], [2, -1]] },
  { u: [[2, 1], [1, 1]], w: [[1, 0], [0, 1]] },
  { u: [[1, 1], [1, 0]], w: [[-1, 1], [0, 1]] },
  { u: [[1, 2], [3, 1]], w: [[2, 4], [6, 2]] },
];
/** The one A with A u₁ = w₁, A u₂ = w₂: A = W U⁻¹ (u₁, u₂ independent). */
export function g2Answer(r: FindRound): Mat {
  const [u1, u2] = r.u, [w1, w2] = r.w;
  const d = u1[0] * u2[1] - u2[0] * u1[1];
  // U⁻¹ = (1/d) [u2y −u2x; −u1y u1x]
  const inv = [[u2[1] / d, -u2[0] / d], [-u1[1] / d, u1[0] / d]];
  const W = [[w1[0], w2[0]], [w1[1], w2[1]]];
  return W.map((row) => [0, 1].map((j) => clean([row[0] * inv[0][j] + row[1] * inv[1][j]])[0]));
}
/** Which equations the typed A breaks: index and what A u gives. */
export const g2Misses = (r: FindRound, A: Mat): { i: number; got: Vec }[] =>
  [0, 1].map((i) => ({ i, got: apply(A, r.u[i]) })).filter(({ i, got }) => !same(got, r.w[i]));

// ------------------------------------------------------------------ game 3 · is there a matrix?

/** Why a move is not a matrix: the test the player fills in. */
export type Evidence =
  /** T(0) ≠ 0, but A 0 = 0 for every matrix. */
  | { kind: 'origin' }
  /** T(k x) ≠ k T(x), but A(k x) = k A x. */
  | { kind: 'scale'; x: Vec; k: number };
export interface MoveRound {
  /** Short name for the results list. */
  name: string;
  /** The rule, as TeX for the right-hand side of T(x, y) = … */
  rule: string;
  T: (q: Vec) => Vec;
  /** The matrix when there is one. */
  A?: Mat;
  evidence?: Evidence;
}
export const G3: MoveRound[] = [
  { name: 'shear', rule: '\\begin{bmatrix} x + y \\\\ y \\end{bmatrix}', T: ([x, y]) => [x + y, y], A: [[1, 1], [0, 1]] },
  { name: 'shift by 3', rule: '\\begin{bmatrix} x + 3 \\\\ y \\end{bmatrix}', T: ([x, y]) => [x + 3, y], evidence: { kind: 'origin' } },
  { name: 'quarter turn', rule: '\\begin{bmatrix} -y \\\\ x \\end{bmatrix}', T: ([x, y]) => [-y, x], A: [[0, -1], [1, 0]] },
  { name: 'curved', rule: '\\begin{bmatrix} x \\\\ y + x^2/2 \\end{bmatrix}', T: ([x, y]) => [x, y + (x * x) / 2], evidence: { kind: 'scale', x: [1, 0], k: 2 } },
  { name: 'onto the x-axis', rule: '\\begin{bmatrix} x \\\\ 0 \\end{bmatrix}', T: ([x]) => [x, 0], A: [[1, 0], [0, 0]] },
  { name: 'stretch from (1, 1)', rule: '\\begin{bmatrix} 2x - 1 \\\\ 2y - 1 \\end{bmatrix}', T: ([x, y]) => [2 * x - 1, 2 * y - 1], evidence: { kind: 'origin' } },
  { name: 'flip over y = x', rule: '\\begin{bmatrix} y \\\\ x \\end{bmatrix}', T: ([x, y]) => [y, x], A: [[0, 1], [1, 0]] },
  { name: 'general', rule: '\\begin{bmatrix} 2x + y \\\\ x + y \\end{bmatrix}', T: ([x, y]) => [2 * x + y, x + y], A: [[2, 1], [1, 1]] },
  {
    name: 'two halves', rule: '\\begin{bmatrix} x \\\\ 2y \\end{bmatrix} \\text{ if } y > 0, \\enspace \\begin{bmatrix} x \\\\ y \\end{bmatrix} \\text{ if } y \\le 0',
    T: ([x, y]) => (y > 0 ? [x, 2 * y] : [x, y]), evidence: { kind: 'scale', x: [0, 1], k: -1 },
  },
  { name: 'general', rule: '\\begin{bmatrix} x \\\\ x + 2y \\end{bmatrix}', T: ([x, y]) => [x, x + 2 * y], A: [[1, 0], [1, 2]] },
];
/** The point the evidence box asks about, and what T does there. */
export function evidencePoint(r: MoveRound): { at: Vec; T: Vec } {
  const e = r.evidence!;
  const at = e.kind === 'origin' ? [0, 0] : e.x.map((c) => c * e.k);
  return { at, T: clean(r.T(at)) };
}
/** A point where the typed A and T disagree (null if A matches T on the test points). */
export function g3Mismatch(r: MoveRound, A: Mat): { at: Vec; got: Vec; want: Vec } | null {
  const pts: Vec[] = [[0, 0], [1, 0], [0, 1], [2, 0], [0, -1], [1, 1], [-2, 3]];
  for (const q of pts) {
    const got = apply(A, q), want = clean(r.T(q));
    if (!same(got, want)) return { at: q, got, want };
  }
  return null;
}
/** The columns of A: where [1;0] and [0;1] land. */
export const columns = (A: Mat): [Vec, Vec] => [col(A, 0), col(A, 1)];
