// Chapter 23 pure logic (no DOM, no three): every number on screen, the win checks, the Collapse fit data
// (TT17), the Doubt and Review predicates, the Law core and the crew version of least_squares.
// Unit-tested in tests/singular/game-c23.test.ts.
import {
  col, dot, fromCols, gramSchmidt, inverse, leastSquares, matMul, matVec, norm, pca, qr, transpose, vadd, vscale, vsub,
  type Mat, type Vec,
} from '../../../math/la.ts';
import { rint, rng, type LawCore } from '../../../game/lawcheck.ts';
import { niceTex } from '../../../math/frac.ts';
import { C as COLLAPSE, C2 } from '../../truth.ts';

export const fmtV = (v: readonly number[], d = 2): string => `(${v.map((x) => { const y = Math.round(x * 10 ** d) / 10 ** d; return Math.abs(y) < 10 ** -d / 2 ? '0' : String(y).replace('-', '−'); }).join(', ')})`;
export const fmtN = (x: number, d = 2): string => { const y = Math.round(x * 10 ** d) / 10 ** d; return Math.abs(y) < 10 ** -d / 2 ? '0' : y.toFixed(d).replace('-', '−'); };
export const texM = (M: Mat, d?: number): string => `\\begin{bmatrix} ${M.map((r) => r.map((x) => (d === undefined ? niceTex(x) : fmtN(x, d).replace('−', '-'))).join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;
export const near = (a: readonly number[], b: readonly number[], tol: number): boolean => a.length === b.length && norm(vsub([...a], [...b])) <= tol;
/** The line y = c0 + c1 t as TeX. The sign comes from the rounded slope, so −1e-17 prints "+ 0t", never "- 0t". */
export const lineTex = (c0: number, c1: number, d1 = 2): string => { const s = fmtN(c1, d1); return `$y = ${fmtN(c0)} ${s.startsWith('−') ? '-' : '+'} ${s.replace('−', '')}t$`; };

/** A line y = c0 + c1 t through points (t, y): its columns are 1 and t. */
export const lineA = (ts: readonly number[]): Mat => ts.map((t) => [1, t]);
/** Least-squares intercept and slope [c0, c1]. */
export const fitLine = (pts: readonly number[][]): Vec => leastSquares(lineA(pts.map((q) => q[0])), pts.map((q) => q[1]))!;
/** Total square area: the sum of squared vertical leftovers. */
export const area = (pts: readonly number[][], c0: number, c1: number): number => pts.reduce((s, q) => s + (q[1] - c0 - c1 * q[0]) ** 2, 0);

// ------------------------------------------------------------------ p1 Drag the line

export const P1_PTS: number[][] = [[0, 1], [1, 2], [2, 2], [3, 4]];
export const P1_FIT: Vec = fitLine(P1_PTS);                    // (0.9, 0.9)
export const P1_BEST = area(P1_PTS, P1_FIT[0], P1_FIT[1]);     // 0.7
/** p1: within 1% of the smallest total square area. */
export const p1Won = (c0: number, c1: number) => area(P1_PTS, c0, c1) <= P1_BEST * 1.01;
/** How many readings a line passes through. */
export const throughCount = (pts: readonly number[][], c0: number, c1: number, tol = 1e-6) => pts.filter((q) => Math.abs(q[1] - c0 - c1 * q[0]) <= tol).length;

// ------------------------------------------------------------------ p2 [D] See the right angle (twin view)

export const P2_TS = [0, 1, 2];
export const P2_B: Vec = [1, 2, 4];
export const P2_A: Mat = lineA(P2_TS);                          // columns (1, 1, 1) and (0, 1, 2)
export const P2_ONES: Vec = [1, 1, 1];
export const P2_T: Vec = [0, 1, 2];
export const P2_ATA: Mat = matMul(transpose(P2_A), P2_A);       // [[3, 3], [3, 5]]
export const P2_ATB: Vec = matVec(transpose(P2_A), P2_B);       // (7, 10)
export const P2_X: Vec = leastSquares(P2_A, P2_B)!;              // (5/6, 3/2)
export const P2_P: Vec = matVec(P2_A, P2_X);                     // (5/6, 7/3, 23/6)
export const P2_R: Vec = vsub(P2_B, P2_P);                       // (1/6, −1/3, 1/6)
export const p2Won = (w: readonly number[], tol = 0.05) => near(matVec(P2_A, [...w]), P2_P, tol);

// ------------------------------------------------------------------ p3 [H] Five readings by hand

export const P3_PTS: number[][] = [[0, 1], [1, 3], [2, 2], [3, 5], [4, 4]];
export const P3_A: Mat = lineA(P3_PTS.map((q) => q[0]));
export const P3_B: Vec = P3_PTS.map((q) => q[1]);
export const P3_ATA: Mat = matMul(transpose(P3_A), P3_A);       // [[5, 10], [10, 30]]
export const P3_ATB: Vec = matVec(transpose(P3_A), P3_B);       // (15, 38)
export const P3_FIT: Vec = fitLine(P3_PTS);                     // (1.4, 0.8)
export const P3_AREA = area(P3_PTS, P3_FIT[0], P3_FIT[1]);      // 3.6

// ------------------------------------------------------------------ p4 A curve through every reading

export const P4_TS = [0, 1, 2, 3, 4, 5];
export const P4_YS = [412.0, 410.9, 410.1, 408.8, 408.1, 406.9];
export const P4_PTS: number[][] = P4_TS.map((t, i) => [t, P4_YS[i]]);
export const P4_FIT: Vec = fitLine(P4_PTS);                     // (411.98, −1.006)
export const P4_TARGET = 380;
export const P4_HOUR = (P4_FIT[0] - P4_TARGET) / -P4_FIT[1];    // 31.8
/** The degree-5 curve through all six readings (Lagrange form). */
export const curve5 = (t: number): number => P4_TS.reduce((s, ti, i) => s + P4_YS[i] * P4_TS.reduce((p, tj, j) => (j === i ? p : (p * (t - tj)) / (ti - tj)), 1), 0);
export const P4_CURVE10 = curve5(10);                           // −315.7
export const P4_BEST = area(P4_PTS, P4_FIT[0], P4_FIT[1]);     // 0.0728
/** Where the line y = c0 + c1 t reaches the target. */
export const hourAt = (c0: number, c1: number, y = P4_TARGET) => (Math.abs(c1) < 1e-12 ? Infinity : (y - c0) / c1);
/** p4's two line handles sit at hours 0 and 24. */
export const P4_HANDLE_T: [number, number] = [0, 24];
/** p4: both handles within tolM metres of the best line's. The puzzle then snaps the line onto the best line. */
export const p4Near = (c0: number, c1: number, tolM: number) => P4_HANDLE_T.every((t) => Math.abs(c0 + c1 * t - (P4_FIT[0] + P4_FIT[1] * t)) <= tolM);
/** How far the forecast of the line y = c0 + c1 t may sit from the best line's and still count as that line's. */
export const P4_HOUR_SLACK = 0.3;
/**
 * p4's forecast: the marker sits where the player's own line reaches 380 m (within tol hours), and that line
 * forecasts what the best line does (within P4_HOUR_SLACK). Fitting the line is subgoal 0, checked apart.
 */
export const p4Won = (c0: number, c1: number, hour: number, tol: number) => { const h = hourAt(c0, c1); return Math.abs(hour - h) <= tol && Math.abs(h - P4_HOUR) <= P4_HOUR_SLACK; };

// ------------------------------------------------------------------ p5 [SP] The Collapse fit (TT17)

/** The knock: three short, three long, three short. One character per leftover sample: S short, L long, '.' a gap. */
export const KNOCK = 'S.S.S...LLL.LLL.LLL...S.S.S';
export const KNOCK_START = 17;
export const KNOCK_END = KNOCK_START + KNOCK.length;            // 44: the first sample after the knock
export const KNOCK_AMP = 0.012;
export const NOISE_SIZE = 0.002;
const N_READ = 20;

function gauss(r: () => number): number { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

/**
 * TT17. Twenty drones logged where they were before the Collapse pulse (X, one row each) and after (Y).
 * Y = X Cᵀ + E. The leftover E is built perpendicular to the column space of X, column by column, so the
 * least-squares fit returns C exactly and its leftover is exactly E. E holds the knock (in recording order:
 * reading k's x, y, z are samples 3k, 3k + 1, 3k + 2) plus seeded noise of size 0.002.
 */
export const FIT = (() => {
  const r = rng(4);
  const pat = new Array(N_READ * 3).fill(0);
  for (let i = 0; i < KNOCK.length; i++) if (KNOCK[i] !== '.') pat[KNOCK_START + i] = KNOCK_AMP;
  const Pm = Array.from({ length: N_READ }, (_, k) => [0, 1, 2].map((j) => pat[3 * k + j]));
  // the drones' starting positions, kept perpendicular to the knock so that removing the fitted part leaves it whole
  const basis = gramSchmidt([0, 1, 2].map((j) => col(Pm, j)));
  const raw = Array.from({ length: N_READ }, () => [0, 0, 0].map(() => r() * 6 - 3));
  const Xc = [0, 1, 2].map((i) => { let x = col(raw, i); for (const q of basis) x = vsub(x, vscale(q, dot(x, q))); return x; });
  const X: Mat = Array.from({ length: N_READ }, (_, k) => [0, 1, 2].map((i) => Math.round(Xc[i][k] * 1e6) / 1e6));
  const noise = Array.from({ length: N_READ }, () => [0, 0, 0].map(() => NOISE_SIZE * gauss(r)));
  const Xt = transpose(X), XtXi = inverse(matMul(Xt, X))!;
  const E: Mat = Array.from({ length: N_READ }, () => [0, 0, 0]);
  for (let j = 0; j < 3; j++) {
    const e = col(noise, j).map((v, k) => v + Pm[k][j]);
    const pe = matVec(X, matVec(XtXi, matVec(Xt, e)));
    for (let k = 0; k < N_READ; k++) E[k][j] = e[k] - pe[k];
  }
  const Y: Mat = X.map((x, k) => vadd(matVec(COLLAPSE, x), E[k]));
  return { X, Y, E };
})();
/** Row i of the pulse is the least-squares answer of X c = (column i of Y). */
export const fitPulse = (X: Mat = FIT.X, Y: Mat = FIT.Y): Mat => [0, 1, 2].map((i) => leastSquares(X, col(Y, i))!);
export const FITTED: Mat = fitPulse();
/** The leftover of the fit, in recording order (60 samples). */
export const leftoverOf = (F: Mat, X: Mat = FIT.X, Y: Mat = FIT.Y): number[] => X.flatMap((x, k) => vsub(Y[k], matVec(F, x)));
export const LEFTOVER: number[] = leftoverOf(FITTED);
/** Solve one row by QR: R c = Qᵀ b, by back substitution. */
export function qrSolve(A: Mat, b: Vec): Vec {
  const { Q, R } = qr(A);
  const y = matVec(transpose(Q), b);
  const n = y.length, x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let j = i + 1; j < n; j++) s -= R[i][j] * x[j]; x[i] = s / R[i][i]; }
  return x;
}
export const THIRD = (F: Mat): Vec => col(F, 2);
export { C2 };
export const p5ReadOk = (v: readonly number[], tol = 0.0005) => near(v, THIRD(COLLAPSE), tol);

// ------------------------------------------------------------------ p6 What's left over

/** Markers sit on sample boundaries 0..60. The knock occupies samples KNOCK_START .. KNOCK_END − 1. */
export const p6Won = (start: number, end: number, tol: number) => Math.abs(start - KNOCK_START) <= tol && Math.abs(end - KNOCK_END) <= tol;

// ------------------------------------------------------------------ p7 [S] A parabola; normal equations against QR

export const P7_A0: Mat = P3_PTS.map((q) => [1, q[0], q[0] * q[0]]);
export const P7_FIT0: Vec = leastSquares(P7_A0, P3_B)!;           // (39/35, 48/35, −1/7)
export const P7_T0 = 300;
export const P7_A300: Mat = P3_PTS.map((q) => [1, q[0] + P7_T0, (q[0] + P7_T0) ** 2]);
/** The exact answer at hours 300–304: the same parabola, rewritten in t = s + 300. */
export const P7_EXACT: Vec = (() => { const [a, b, c] = P7_FIT0; return [a - b * P7_T0 + c * P7_T0 * P7_T0, b - 2 * c * P7_T0, c]; })();
export const P7_NE: Vec = leastSquares(P7_A300, P3_B)!;
export const P7_QR: Vec = qrSolve(P7_A300, P3_B);
export const errOf = (x: Vec): number => Math.max(...x.map((v, i) => Math.abs(v - P7_EXACT[i]) / Math.max(1, Math.abs(P7_EXACT[i]))));

// ------------------------------------------------------------------ Doubts and Review claims

/** (F) "The best line goes through as many points as it can." Holds when the best line passes through at least two readings. */
export const throughHolds = (pts: readonly number[][]): boolean => { const f = fitLine(pts); return throughCount(pts, f[0], f[1]) >= 2; };

/** The line through the mean along the main direction of the points: the one that makes perpendicular distances small. */
export function perpLine(pts: readonly number[][]): Vec | null {
  const { mean, vectors } = pca(pts.map((q) => [q[0], q[1]]));
  const d = vectors[0];
  if (Math.abs(d[0]) < 1e-9) return null;
  const c1 = d[1] / d[0];
  return [mean[1] - c1 * mean[0], c1];
}
/** (F) "Least squares makes the perpendicular distances to the line small." Holds when the two lines are the same. */
export function perpHolds(pts: readonly number[][]): boolean {
  const a = fitLine(pts), b = perpLine(pts);
  return !!b && Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01;
}
/** (T) "If the readings fit exactly, least squares returns that exact answer." */
export function exactHolds(c0: number, c1: number, ts: readonly number[]): boolean {
  const pts = ts.map((t) => [t, c0 + c1 * t]);
  const f = fitLine(pts);
  return Math.abs(f[0] - c0) < 1e-9 && Math.abs(f[1] - c1) < 1e-9 && area(pts, f[0], f[1]) < 1e-12;
}
/** Review (F) "A curve through every reading is the best fit." Holds when the curve misses a new reading by no more than the line. */
export function curveFits(pts: readonly number[][], next: readonly number[]): { curve: number; line: number } {
  const ts = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const curve = ts.reduce((s, ti, i) => s + ys[i] * ts.reduce((p, tj, j) => (j === i ? p : (p * (next[0] - tj)) / (ti - tj)), 1), 0);
  const f = fitLine(pts);
  return { curve: Math.abs(curve - next[1]), line: Math.abs(f[0] + f[1] * next[0] - next[1]) };
}
export const curveHolds = (pts: readonly number[][], next: readonly number[]): boolean => { const m = curveFits(pts, next); return m.curve <= m.line + 1e-9; };
/** Review (T) "The residual is perpendicular to every column." */
export function residualPerp(pts: readonly number[][]): { ones: number; ts: number } {
  const f = fitLine(pts);
  const r = pts.map((q) => q[1] - f[0] - f[1] * q[0]);
  return { ones: r.reduce((s, x) => s + x, 0), ts: r.reduce((s, x, i) => s + x * pts[i][0], 0) };
}
export const residualHolds = (pts: readonly number[][]): boolean => { const d = residualPerp(pts); return Math.abs(d.ones) < 1e-9 && Math.abs(d.ts) < 1e-9; };

/** Random readings for the Shake: n whole-number times (at least two different), values on a slope plus noise. */
export function randPts(r: () => number, n = 4, noise = 1): number[][] {
  const ts = [0, 1, 2, 3, 4, 5].slice(0, n);
  const c0 = rint(r, -2, 3), c1 = rint(r, -2, 2) / 2;
  return ts.map((t) => [t, c0 + c1 * t + (rint(r, -4, 4) / 4) * noise]);
}

// ------------------------------------------------------------------ the Law

export interface FitCase { pts: number[][] }
const resid = (pts: readonly number[][]) => { const f = fitLine(pts); return { f, r: pts.map((q) => q[1] - f[0] - f[1] * q[0]) }; };
/** Does the filled statement hold for this line fit? */
export function lawHolds(f: Record<string, string>, c: FitCase): boolean {
  const { f: fit, r } = resid(c.pts);
  const ts = c.pts.map((q) => q[0]), b = c.pts.map((q) => q[1]);
  const rn = norm(r);
  const perp = (w: number[]) => rn < 1e-9 || Math.abs(dot(r, w)) / (rn * Math.max(norm(w), 1e-12)) < 1e-9;
  const par = (w: number[]) => rn < 1e-9 || Math.abs(Math.abs(dot(r, w)) / (rn * Math.max(norm(w), 1e-12)) - 1) < 1e-9;
  const rel = f.rel === 'par' ? par : perp;
  if (f.to === 'cols') return rel(ts.map(() => 1)) && rel(ts);
  if (f.to === 'b') return rel(b);
  // 'line': the drawn leftover segments are vertical; perpendicular to the line only if it is level; parallel never
  if (rn < 1e-9) return true;
  return f.rel === 'par' ? false : Math.abs(fit[1]) < 1e-9;
}
export const lawCore: LawCore<FitCase> & { answer: Record<string, string> } = {
  id: 'c23-law',
  answer: { rel: 'perp', to: 'cols' },
  gen: (r) => ({ pts: randPts(r, rint(r, 3, 6), 1) }),
  edgeCases: [
    { pts: P1_PTS }, { pts: P3_PTS }, { pts: [[0, 1], [1, 2], [2, 3]] },        // exact: the leftover is zero
    { pts: [[0, 2], [1, 3], [2, 3], [3, 2]] },                                  // the best line here is level
    { pts: [[0, 0], [1, 5]] },                                                  // two readings: always exact
  ],
  holds: lawHolds,
  describe: (c) => { const { f, r } = resid(c.pts); return `readings ${c.pts.map((q) => fmtV(q)).join(', ')}: best line ${lineTex(f[0], f[1])}, leftover ${fmtV(r)}`; },
};

// ------------------------------------------------------------------ crew

export const crew = { least_squares: (A: Mat, b: Vec): Vec => leastSquares(A, b)! };

/** A tall matrix with independent columns, and readings b. */
export function lsCase(r: () => number, level: string): [Mat, Vec] {
  const n = rint(r, 1, 3), m = rint(r, n + 1, 7);
  const num = () => (level === 'cadet' ? rint(r, -3, 3) : level === 'navigator' ? rint(r, -8, 8) / 2 : rint(r, -40, 40) / 10);
  let A: Mat;
  do { A = Array.from({ length: m }, () => Array.from({ length: n }, num)); } while (gramSchmidt(A[0].map((_, j) => col(A, j))).length < n);
  return [A, Array.from({ length: m }, num)];
}

export { fromCols, COLLAPSE };
