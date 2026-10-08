// Chapter 14, pure logic: every number the chapter shows, every win test, the Doubts' predicates, the
// Law core, the Collapse set piece's numbers and the crew versions of the builds. No DOM, no three:
// tests/singular/game-c14.test.ts imports this file in Node.
import { det, fromCols, identity, inverse, matMul, matVec, mscale, madd, meq, rank, type Mat, type Vec } from '../../../math/la.ts';
import { Frac, fmat, fnum } from '../../../math/frac.ts';
import { fdet, applyOp, type RowOp } from '../../../math/rref.ts';
import { rint, type LawCore } from '../../../game/lawcheck.ts';
import type { Difficulty } from '../../../core/save.ts';
import { T3, S_now, S_COLLAPSE, DET_C, C as COLLAPSE, DELTA } from '../../truth.ts';
import { fmtN, meqTol, texM } from '../c13-inverse/logic.ts';

export type { Mat, Vec };
export { fmtN, texM, meqTol };

export const tolFor = (d: Difficulty): number => (d === 'commander' ? 0.01 : 0.05);
export const det2 = (M: Mat): number => M[0][0] * M[1][1] - M[0][1] * M[1][0];

// ------------------------------------------------------------------ c14-p1 · shape a hold

export const P1_AREA = 6;
export const P1_EXAMPLE: Mat = fromCols([[3, 0], [1, 2]]);
/** Win (first part): the unit tile's image has signed area exactly 6. */
export const p1HoldOk = (M: Mat, tol = 0.05): boolean => Math.abs(det2(M) - P1_AREA) <= tol;
/** The stabiliser applied afterwards: shape changes, every area stays (its tile reads 1). */
export const P1_STAB: Mat = [[2, 1], [1, 1]];
/**
 * Y^t for a symmetric 2×2 Y with positive eigenvalues: Q·diag(λ1^t, λ2^t)·Qᵀ. Its determinant is
 * (λ1λ2)^t = (det Y)^t, so for det Y = 1 every frame keeps every area (GDD §11.3: an area-keeping move
 * is played with areas kept, not by (1 − t)I + tY, which reads up to 1.25 on the way).
 */
export function powSym2(Y: Mat, t: number): Mat {
  const [[a, b], [, d]] = Y;
  const m = (a + d) / 2, R = Math.hypot((a - d) / 2, b);
  const th = Math.atan2(2 * b, a - d) / 2, c = Math.cos(th), s = Math.sin(th);
  const p = Math.pow(m + R, t), q = Math.pow(m - R, t);
  return [[p * c * c + q * s * s, (p - q) * c * s], [(p - q) * c * s, p * s * s + q * c * c]];
}
/** The stabiliser's playback at time t (0..1): det 1 on every frame, P1_STAB at t = 1. */
export const stabPath = (t: number): Mat => (t >= 1 ? P1_STAB.map((r) => r.slice()) : powSym2(P1_STAB, t));
/** The volume factors behind the Case Board clue: the spire numbers and the measured pulse agree. */
export const SPIRE_VOLUME = det(S_now);
export const PULSE_VOLUME = det(T3);

// ------------------------------------------------------------------ c14-p2 [D] · where ad − bc comes from

/** Columns (a, c) = (3, 1) and (b, d) = (1, 2): the matrix [[a, b], [c, d]] = [[3, 1], [1, 2]]. */
export const P2_M: Mat = [[3, 1], [1, 2]];
export const P2_BOX: [number, number] = [P2_M[0][0] + P2_M[0][1], P2_M[1][0] + P2_M[1][1]]; // 4 × 3
export interface Piece { id: string; kind: 'tri-a' | 'tri-b' | 'rect'; pts: [number, number][]; area: number }
/** The six corner pieces between the parallelogram and its 4 × 3 box. */
export const P2_PIECES: Piece[] = (() => {
  const [a, b] = [P2_M[0][0], P2_M[0][1]];
  const [c, d] = [P2_M[1][0], P2_M[1][1]];
  const W = a + b, H = c + d;
  return [
    { id: 'tri-a-bottom', kind: 'tri-a', pts: [[0, 0], [a, 0], [a, c]], area: (a * c) / 2 },
    { id: 'tri-a-top', kind: 'tri-a', pts: [[b, d], [W, H], [b, H]], area: (a * c) / 2 },
    { id: 'tri-b-left', kind: 'tri-b', pts: [[0, 0], [b, d], [0, d]], area: (b * d) / 2 },
    { id: 'tri-b-right', kind: 'tri-b', pts: [[a, c], [W, c], [W, H]], area: (b * d) / 2 },
    { id: 'rect-bottom', kind: 'rect', pts: [[a, 0], [W, 0], [W, c], [a, c]], area: b * c },
    { id: 'rect-top', kind: 'rect', pts: [[0, d], [b, d], [b, H], [0, H]], area: b * c },
  ] as Piece[];
})();
export const polyArea = (pts: readonly (readonly number[])[]): number =>
  Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
export const P2_STEPS = { box: P2_BOX[0] * P2_BOX[1], triA: P2_M[0][0] * P2_M[1][0], triB: P2_M[0][1] * P2_M[1][1], rects: 2 * P2_M[0][1] * P2_M[1][0], left: det2(P2_M) };
/** A piece counts as removed once its centre is outside the box. */
export function pieceOut(pts: readonly (readonly number[])[], offset: readonly number[]): boolean {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length + offset[0];
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length + offset[1];
  return cx < -0.05 || cx > P2_BOX[0] + 0.05 || cy < -0.05 || cy > P2_BOX[1] + 0.05;
}
/** Commander tile order: the box first, then the three removals in any order. */
export const P2_TILE_IDS = ['box', 'tri-a', 'tri-b', 'rects'];
export const p2OrderOk = (o: string[]): boolean => o.length === 4 && o[0] === 'box' && ['tri-a', 'tri-b', 'rects'].every((x) => o.includes(x));

// ------------------------------------------------------------------ c14-p3 · products and scalings

export const P3_A: Mat = [[1, 1], [0, 2]]; // doubles area
export const P3_B: Mat = [[1, 0], [1, 3]]; // triples area
/** The moves applied, in order (first acts first). Win (part 1): one of each, area 6. */
export const p3ProductOk = (ids: string[]): boolean => ids.length === 2 && ids.includes('A') && ids.includes('B');
export const productOf = (ids: string[]): Mat => ids.reduce((acc, id) => matMul(id === 'A' ? P3_A : P3_B, acc), identity(2));
export const P3_UNIT: Mat = [[2, 1], [1, 1]]; // area 1
/** Scale every entry by k: area k² (in 3-D, k³). */
export const scaledArea = (k: number): number => det2(mscale(P3_UNIT, k));
export const p3ScaleOk = (k: number, tol = 0.05): boolean => Math.abs(scaledArea(k) - 4) <= tol * 4;
export const P3_SWAP: Mat = [[0, 1], [1, 0]];
export const p3FlipOk = (M: Mat, tol = 0.05): boolean => Math.abs(det2(M) + 1) <= tol;

// ------------------------------------------------------------------ c14-p4 [D][H] · cofactor expansion

export const P4_M3: Mat = [[2, 1, 0], [1, 3, 1], [0, 1, 2]];
export const P4_M4: Mat = [[1, 2, 0, 3], [0, 1, 0, 0], [2, 0, 1, 1], [1, 1, 0, 2]];
export const minorOf = (M: Mat, i: number, j: number): Mat => M.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j));
export const cofactor = (M: Mat, i: number, j: number): number => ((i + j) % 2 ? -1 : 1) * det(minorOf(M, i, j));
/** Expansion along row i: Σ a_ij C_ij. */
export const expandRow = (M: Mat, i: number): number => M[i].reduce((s, a, j) => s + a * cofactor(M, i, j), 0);
/** The 4 × 4 by the two single-entry expansions: row 2, then the middle column of the minor. */
export const P4_MINOR3: Mat = minorOf(P4_M4, 1, 1); // [[1, 0, 3], [2, 1, 1], [1, 0, 2]]
export const P4_MINOR2: Mat = minorOf(P4_MINOR3, 1, 1); // [[1, 3], [1, 2]]
export const P4_DET4 = det(P4_M4);

// ------------------------------------------------------------------ c14-p5 [H] · row reduction, and the k that flattens

export const P5_M: Mat = [[0, 2, 1], [1, 1, 1], [2, 1, 0]];
export const P5_OPS: RowOp[] = [
  { kind: 'swap', i: 0, j: 1 },
  { kind: 'add', i: 2, j: 0, k: new Frac(-2) },
  { kind: 'add', i: 2, j: 1, k: new Frac(1, 2) },
];
export const P5_TRI: Mat = fnum(P5_OPS.reduce((a, op) => applyOp(a, op), fmat(P5_M))); // [[1, 1, 1], [0, 2, 1], [0, 0, −3/2]]
export const P5_DIAG: number[] = P5_TRI.map((r, i) => r[i]);
export const P5_DET = fdet(fmat(P5_M)).value(); // 3
/** The shield generator [[2, k], [3, 6]]: flat when 12 − 3k = 0. */
export const shield = (k: number): Mat => [[2, k], [3, 6]];
export const P5_K = 4;
export const p5ShieldOk = (k: number, tol = 0.05): boolean => Math.abs(det2(shield(k))) <= 3 * tol;

// ------------------------------------------------------------------ c14-p6 [SP] · the Collapse

/** The spire readings at the Collapse (TT21): columns (1, 0, 1), (0, 1, 2), (0, 1, 2 + δ). */
export const SPIRES: Mat = S_COLLAPSE;
/** Their determinant is the forecast: δ ≈ 0.004 (the same as det C: similar matrices). */
export const FORECAST = det(S_COLLAPSE);
export const FORECAST_DET_C = DET_C;
export { DELTA };
/** Row 1 of the readings is (1, 0, 0): expanding along it leaves one 2 × 2 minor. */
export const FORECAST_MINOR: Mat = minorOf(S_COLLAPSE, 0, 0); // [[1, 1], [2, 2 + δ]]
/** "Zero point zero zero, to two decimal places." */
export const twoDp = (x: number): string => x.toFixed(2);
/** The two-decimal reading: second and third columns equal, so a pivot is missing. */
export const SPIRES_2DP: Mat = S_COLLAPSE.map((r) => r.map((x) => Math.round(x * 100) / 100));
export const P6_UNDO_OPS: RowOp[] = [
  { kind: 'add', i: 2, j: 0, k: new Frac(-1) },
  { kind: 'add', i: 2, j: 1, k: new Frac(-2) },
];
/** The true Collapse pulse in the ship's grid (TT7), used for the hull in the act beat. */
export const PULSE: Mat = COLLAPSE;
/** Brace boxes: any three braces from Teo's node; the forecast pulse scales every box by the same factor. */
export const braceVolume = (b: Vec[]): number => det(fromCols(b));
export const afterPulse = (b: Vec[]): Vec[] => b.map((v) => matVec(S_COLLAPSE, v));
export const braceRatio = (b: Vec[]): number => braceVolume(afterPulse(b)) / braceVolume(b);
/** A brace arrangement counts when its box is not flat and it differs from the ones tried before. */
export function newArrangement(b: Vec[], tried: Vec[][], minVol = 0.5): boolean {
  if (Math.abs(braceVolume(b)) < minVol) return false;
  return tried.every((t) => t.some((v, i) => Math.hypot(...v.map((x, k) => x - b[i][k])) > 0.4));
}
export const P6_BRACES: Vec[][] = [
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  [[2, 0, 0], [0, 1, 1], [0, -1, 1]],
  [[1, 1, 0], [-1, 1, 0], [0, 0, 2]],
];

// ------------------------------------------------------------------ c14-p7 [S] · Cramer's rule

export const P7_A: Mat = [[2, 1], [1, 1]];
export const P7_B: Vec = [5, 3];
export const P7_X: Vec = matVec(inverse(P7_A)!, P7_B); // (2, 1)
export const replaceCol = (A: Mat, j: number, v: Vec): Mat => A.map((r, i) => r.map((x, c) => (c === j ? v[i] : x)));
export const cramer = (A: Mat, b: Vec): Vec => A.map((_, j) => det(replaceCol(A, j, b)) / det(A));

// ------------------------------------------------------------------ the Doubts

/** (F) "Double every number in a 2 × 2 and you double the area." Holds only for flat matrices. */
export const doublingDoubles = (M: Mat): boolean => Math.abs(det2(mscale(M, 2)) - 2 * det2(M)) < 1e-9;
/** (F) "det(A + B) = det A + det B." */
export const detAdds = (A: Mat, B: Mat): boolean => Math.abs(det(madd(A, B)) - det(A) - det(B)) < 1e-9;
/** (T) "A matrix with no inverse has determinant zero." Vacuous for invertible matrices. */
export const noInverseDetZero = (M: Mat): boolean => rank(M) === M.length || Math.abs(det(M)) < 1e-9;
/** Review (F) "AB = BA." */
export const commutes = (A: Mat, B: Mat): boolean => meq(matMul(A, B), matMul(B, A), 1e-9);
/** Review (F) "A matrix with no zero entries always has an undo." Vacuous when some entry is zero. */
export const noZeroHasUndo = (M: Mat): boolean => M.some((r) => r.some((x) => Math.abs(x) < 1e-12)) || Math.abs(det(M)) > 1e-9;
/** Review (T) "A matrix that flips the grid can be undone." Vacuous when it does not flip. */
export const flipUndo = (M: Mat): boolean => det(M) >= -1e-12 || inverse(M) !== null;

// ------------------------------------------------------------------ the Law

export interface DetCase { M: Mat }
const flattens = (M: Mat): boolean => rank(M) < M.length; // some non-zero arrow lands on the origin
const COND: Record<string, (M: Mat) => boolean> = {
  flat: flattens,
  'zero-entry': (M) => M.some((r) => r.some((x) => x === 0)),
  flip: (M) => det(M) < -1e-9,
  'same-area': (M) => Math.abs(Math.abs(det(M)) - 1) < 1e-9,
};
// No 'negative' value: "det A is negative exactly when A turns the grid over" is the same test on both
// sides (det < 0), so it would survive every case and reach a reason step about zero and flattening.
const VALUE: Record<string, (d: number) => boolean> = {
  zero: (d) => Math.abs(d) < 1e-9,
  one: (d) => Math.abs(d - 1) < 1e-9,
};
/** Every option the Law frame offers (briefing.ts shows these ids, with words). */
export const LAW_OPTIONS = { value: Object.keys(VALUE), cond: Object.keys(COND) };

/** The Law: "det A is [zero / one] exactly when A [condition]." */
export const lawCore: LawCore<DetCase> & { answer: Record<string, string> } = {
  id: 'c14-law',
  answer: { value: 'zero', cond: 'flat' },
  gen(r) {
    const n = r() < 0.6 ? 2 : 3;
    const M = Array.from({ length: n }, () => Array.from({ length: n }, () => rint(r, -4, 4)));
    if (r() < 0.35) { const k = rint(r, -2, 2); const i = rint(r, 0, n - 1), j = (i + 1 + rint(r, 0, n - 2)) % n; M[j] = M[i].map((x) => k * x); }
    return { M };
  },
  edgeCases: [
    { M: [[1, 0], [0, 1]] }, { M: [[1, 1], [1, 1]] }, { M: [[0, 1], [1, 0]] }, { M: [[2, 4], [1, 2]] },
    { M: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] }, { M: [[2, 0, 0], [0, 3, 0], [0, 0, 1]] }, { M: [[0, 0], [0, 0]] },
  ],
  holds(f, c) {
    const v = (VALUE[f.value] ?? (() => false))(det(c.M));
    const cond = (COND[f.cond] ?? (() => false))(c.M);
    return v === cond;
  },
  describe(c) {
    const d = det(c.M);
    return `$A = ${texM(c.M)}$, $\\det A = ${fmtN(d).replace('−', '-')}$: ${flattens(c.M) ? 'it flattens space' : 'it does not flatten space'}`;
  },
};

// ------------------------------------------------------------------ crew versions (the builds)

/** det by elimination with partial pivoting: product of the pivots, a sign flip per swap. Same as the reference Python. */
export function crewDet(A: Mat): number {
  const n = A.length;
  const M = A.map((r) => r.map(Number));
  let sign = 1, out = 1;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return 0;
    if (p !== c) { [M[p], M[c]] = [M[c], M[p]]; sign = -sign; }
    out *= M[c][c];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k < n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return sign * out;
}
/** det3 by the formula (cofactor expansion along the first row). */
export const crewDet3 = (M: Mat): number =>
  M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);

export function swarmSquare(r: () => number, d: Difficulty, size?: number): Mat {
  const n = size ?? (d === 'cadet' ? 2 : 2 + Math.floor(r() * 3));
  const lo = d === 'commander' ? -9 : -5;
  const M = Array.from({ length: n }, () => Array.from({ length: n }, () => rint(r, lo, -lo)));
  if (r() < 0.15) { const k = rint(r, -2, 2); M[n - 1] = M[0].map((x) => k * x); }
  if (r() < 0.15) M[0][0] = 0; // a zero pivot: needs a swap
  return M;
}

/** The fraction form of the triangular diagonal (for the worksheet). */
export const P5_DIAG_TEX = P5_DIAG.map((x) => Frac.from(x).toTex());
