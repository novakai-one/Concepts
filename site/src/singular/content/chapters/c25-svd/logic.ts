// Chapter 25 logic (pure: no DOM, no three). The SVD story numbers, win checks, Teo's voice as a matrix of
// known singular values, the Act IX set piece (the Unfold: raw inverse, the exact model, readings, braces, the
// settings in the Anchor's grid, the split), Teach Teo T5, the Doubt predicates, the Law core and the crew
// versions of svd and low_rank. Unit-tested in tests/singular/game-c25.test.ts.
import {
  col, det, dot, eig2, fromCols, identity, inverse, matMul, matVec, norm, normalize, svd, transpose, type Mat, type Vec,
} from '../../../math/la.ts';
import { rng, rint } from '../../../game/lawcheck.ts';
import { AMPLIFY, C as COLLAPSE, C2, C2_NULL, CONDITION, NOISE, P, Pinv, R, READINGS, SV_C, TEAR } from '../../truth.ts';
import { canon, fmtD, fmtN, lineDeg, randOrtho, spread } from '../c24-spectral/logic.ts';

export { fmtN, fmtD };
const R2 = Math.SQRT1_2;

/** Singular values high → low, right singular vectors canonical, u = Av/σ (for σ > 0). */
export function svdCanon(A: Mat): { us: Vec[]; S: number[]; vs: Vec[] } {
  const d = svd(A);
  const n = A[0].length;
  const vs = Array.from({ length: n }, (_, j) => canon(col(d.V, j)));
  const S = d.S.slice(0, n).map((s) => (Math.abs(s) < 1e-12 ? 0 : s));
  const us = vs.map((v, i) => (S[i] > 1e-12 ? matVec(A, v).map((x) => x / S[i]) : []));
  return { us, S, vs };
}

// ------------------------------------------------------------------ p1 · circle to ellipse (UNFOLD)

export const P1_A: Mat = [[3, 0], [4, 5]];
export const P1_SV = svdCanon(P1_A);                 // σ = √45, √5; v = (1, 1)/√2, (1, −1)/√2
export const P1_SIGMA = P1_SV.S;
export const P1_V: Vec[] = [[R2, R2], [R2, -R2]];
export const P1_UDIR: Vec[] = [[1, 3], [3, -1]];       // the output axes, as whole numbers
export const P1_DET = det(P1_A);
/** The input cross at angle θ (degrees): v₁ at θ, v₂ at θ + 90°. Angle between the two outputs (0..180). */
export function outputsAngle(thetaDeg: number, A: Mat = P1_A): number {
  const t = (thetaDeg * Math.PI) / 180;
  const a = matVec(A, [Math.cos(t), Math.sin(t)]), b = matVec(A, [-Math.sin(t), Math.cos(t)]);
  return (Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (norm(a) * norm(b))))) * 180) / Math.PI;
}
/** Won when the outputs are perpendicular: the cross sits on the singular axes (every 90°). */
export const p1Won = (thetaDeg: number, tolDeg: number): boolean => { const m = ((thetaDeg - 45) % 90 + 90) % 90; return Math.min(m, 90 - m) <= tolDeg; };

// ------------------------------------------------------------------ p2 [D] · where the axes come from

export const P2_ATA: Mat = matMul(transpose(P1_A), P1_A);   // [[25, 20], [20, 25]]
export const P2_EIG = [45, 5];
export const P2_AV1: Vec = matVec(P1_A, [1, 1]);            // (3, 9)
export const P2_AV2: Vec = matVec(P1_A, [1, -1]);           // (3, −1)
export const P2_TILES = [
  { id: 'a', text: '$A\\mathbf v_1\\cdot A\\mathbf v_2 = (A\\mathbf v_1)^{\\mathsf T}(A\\mathbf v_2) = \\mathbf v_1^{\\mathsf T}A^{\\mathsf T}A\\,\\mathbf v_2$' },
  { id: 'b', text: '$A^{\\mathsf T}A$ is symmetric, so its eigenvectors $\\mathbf v_1, \\mathbf v_2$ are perpendicular (Chapter 24)' },
  { id: 'c', text: '$A^{\\mathsf T}A\\,\\mathbf v_2 = \\sigma_2^2\\,\\mathbf v_2$, so $\\mathbf v_1^{\\mathsf T}A^{\\mathsf T}A\\,\\mathbf v_2 = \\sigma_2^2(\\mathbf v_1\\cdot\\mathbf v_2)$' },
  { id: 'd', text: '$\\mathbf v_1\\cdot\\mathbf v_2 = 0$, so $A\\mathbf v_1\\cdot A\\mathbf v_2 = 0$: the images are perpendicular' },
];
export const P2_DECOYS = [{ id: 'x', text: '$A$ is symmetric, so $A\\mathbf v_1$ and $A\\mathbf v_2$ are perpendicular' }];
export const P2_ORDER = ['a', 'b', 'c', 'd'];   // the canonical order (Show me, solve)
/** What is wrong with a tile order, or null. Tile b (AᵀA symmetric) is only needed by d, so it may sit
 *  anywhere before d: a, b, c, d and b, a, c, d and a, c, b, d are all proofs. */
export type P2Fault = 'decoy' | 'missing' | 'repeat' | 'last' | 'order' | null;
export function p2OrderFault(o: readonly string[]): P2Fault {
  if (o.some((id) => !P2_ORDER.includes(id))) return 'decoy';
  if (P2_ORDER.some((id) => !o.includes(id))) return 'missing';
  if (o.length !== P2_ORDER.length) return 'repeat';
  if (o[o.length - 1] !== 'd') return 'last';
  if (o.indexOf('c') < o.indexOf('a')) return 'order';
  return null;
}
export const p2OrderOk = (o: readonly string[]): boolean => p2OrderFault(o) === null;
/** AᵀA times the eigenvectors (1, 1) and (1, −1): 45 (1, 1) and 5 (1, −1). */
export const P2_ATAV1: Vec = matVec(P2_ATA, [1, 1]);
export const P2_ATAV2: Vec = matVec(P2_ATA, [1, -1]);
/** The two usual slips for AᵀA: AAᵀ (rows dotted with rows), and column lengths on the diagonal with a row
 *  dotted with a row in the corners. */
export const P2_AAT: Mat = matMul(P1_A, transpose(P1_A));   // [[9, 12], [12, 41]]
export const P2_ROWCOL: Mat = [[dot(col(P1_A, 0), col(P1_A, 0)), dot(P1_A[0], P1_A[1])], [dot(P1_A[0], P1_A[1]), dot(col(P1_A, 1), col(P1_A, 1))]];   // [[25, 12], [12, 25]]
/** For v₁ = (1, 1)/√2 fixed and v₂ at angle θ: A v₁ · A v₂ = 45 (v₁ · v₂). */
export const p2Dot = (thetaDeg: number): number => { const t = (thetaDeg * Math.PI) / 180; return dot(matVec(P1_A, [R2, R2]), matVec(P1_A, [Math.cos(t), Math.sin(t)])); };

// ------------------------------------------------------------------ p3 · three moves

/** R(θ₂) · diag(s₁, s₂) · R(θ₁), angles in degrees. */
export function threeMoves(t1: number, s1: number, s2: number, t2: number): Mat {
  const r = (d: number): Mat => { const a = (d * Math.PI) / 180; return [[Math.cos(a), -Math.sin(a)], [Math.sin(a), Math.cos(a)]]; };
  return matMul(matMul(r(t2), [[s1, 0], [0, s2]]), r(t1));
}
/** The reference: turn −45° (Vᵀ), stretch 6.71 and 2.24 (Σ), turn by the angle of (1, 3) (U). */
export const P3_T1 = -45;
export const P3_T2 = (Math.atan2(3, 1) * 180) / Math.PI;    // 71.57°
export const p3Err = (M: Mat): number => Math.max(...M.flatMap((r, i) => r.map((x, j) => Math.abs(x - P1_A[i][j]))));
export const p3Won = (M: Mat, tol: number): boolean => p3Err(M) <= tol;

// ------------------------------------------------------------------ p4 [H] · SVD by hand, non-square

export const P4_A: Mat = [[1, 1], [0, 1], [1, 0]];
export const P4_ATA: Mat = matMul(transpose(P4_A), P4_A);   // [[2, 1], [1, 2]]
/** The slips that fit a 2 × 2 grid: the top-left corner of the 3 × 3 AAᵀ, and AᵀA without its cross term. */
export const P4_AAT_CORNER: Mat = matMul(P4_A, transpose(P4_A)).slice(0, 2).map((r) => r.slice(0, 2));   // [[2, 1], [1, 1]]
export const P4_NO_CROSS: Mat = [[P4_ATA[0][0], 0], [0, P4_ATA[1][1]]];   // [[2, 0], [0, 2]]
export const P4_EIG = [3, 1];
export const P4_SIGMA = [Math.sqrt(3), 1];
export const P4_V: Vec[] = [[R2, R2], [R2, -R2]];
export const P4_U: Vec[] = [normalize([2, 1, 1]), normalize([0, -1, 1])];

// ------------------------------------------------------------------ p5 · Teo's voice, layer by layer (LAYER)

export const TEO_ROWS = 64, TEO_COLS = 32;
/** His voice: eight strong layers, then a floor of noise. */
export const TEO_SV: number[] = [52, 38, 30, 23, 17, 13, 10, 8, ...Array.from({ length: 24 }, (_, i) => 1.4 - (0.9 * i) / 23)];
export const K_OPTIONS = [1, 2, 4, 8, 16, 32];
export const CLEAR = 0.08;
export const P5_K = 8;

function gsCols(vs: Vec[]): Vec[] {
  const out: Vec[] = [];
  for (const v of vs) {
    let w = v.slice();
    for (let pass = 0; pass < 2; pass++) for (const q of out) { const c = dot(w, q); w = w.map((x, i) => x - c * q[i]); }
    out.push(normalize(w));
  }
  return out;
}
function gauss(r: () => number): number { const u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

/** Teo's voice: X = Σ σᵢ uᵢ vᵢᵀ with orthonormal u (frequency profiles) and v (time envelopes). */
export const TEO = (() => {
  const r = rng(625);
  const bump = (n: number, c: number, w: number) => Array.from({ length: n }, (_, i) => Math.exp(-(((i - c) / w) ** 2)));
  const uRaw: Vec[] = [], vRaw: Vec[] = [];
  for (let i = 0; i < 8; i++) {
    const f = 5 + 6 * i;
    const b1 = bump(TEO_ROWS, f, 2.2), b2 = bump(TEO_ROWS, Math.min(62, f * 1.8 + 3), 3);
    uRaw.push(b1.map((x, k) => x + 0.55 * b2[k] + 0.04 * gauss(r)));
    const env = bump(TEO_COLS, 3 + ((i * 7) % 27), 2.5 + (i % 3));
    const env2 = bump(TEO_COLS, (13 + i * 5) % 30, 2);
    vRaw.push(env.map((x, k) => x + 0.6 * env2[k] + 0.03 * gauss(r)));
  }
  for (let i = 8; i < TEO_COLS; i++) { uRaw.push(Array.from({ length: TEO_ROWS }, () => gauss(r))); vRaw.push(Array.from({ length: TEO_COLS }, () => gauss(r))); }
  const U = gsCols(uRaw), V = gsCols(vRaw);
  const X: Mat = Array.from({ length: TEO_ROWS }, (_, i) => Array.from({ length: TEO_COLS }, (_, j) => TEO_SV.reduce((s, sg, k) => s + sg * U[k][i] * V[k][j], 0)));
  return { X, U, V, S: TEO_SV };
})();

/** The picture rebuilt from its k largest layers σ u vᵀ. */
export function rebuild(k: number, src = TEO): Mat {
  return src.X.map((row, i) => row.map((_, j) => { let s = 0; for (let t = 0; t < k; t++) s += src.S[t] * src.U[t][i] * src.V[t][j]; return s; }));
}
/** Relative error of the k-layer picture: √(σ²(k+1) + …) / √(σ²(1) + …). */
export function layerError(k: number, S: number[] = TEO_SV): number {
  const tot = S.reduce((a, s) => a + s * s, 0), left = S.slice(k).reduce((a, s) => a + s * s, 0);
  return Math.sqrt(left / tot);
}
export const storage = (k: number, m = TEO_ROWS, n = TEO_COLS): number => k * (m + n + 1);
export const isClear = (k: number): boolean => layerError(k) <= CLEAR;
/** The smallest k among the options whose words are clear. */
export const p5Won = (k: number): boolean => k === K_OPTIONS.find(isClear);
/** How much of the line is still static at this error (0 = clear, 1 = all static). */
export const staticLevel = (err: number): number => Math.max(0, Math.min(1, (err - CLEAR) / 0.25));
export const TEO_WORDS = 'Wren? It is very quiet in here. Is that really you out there?';
/** The words as heard: each letter lost to static by a fixed pattern, more of them as the error grows. */
export function heard(err: number, words = TEO_WORDS): string {
  const lv = staticLevel(err);
  return [...words].map((ch, i) => (ch === ' ' || ((i * 7919 + 13) % 997) / 997 >= lv ? ch : '·')).join('');
}
/** Keep only A's first layer: the error A − A₁ stretches at most σ₂ = √5 (at v₂). */
export const P5_A1: Mat = (() => { const { us, S, vs } = P1_SV; return us[0].map((u) => vs[0].map((v) => S[0] * u * v)); })();
export const P5_E: Mat = P1_A.map((r, i) => r.map((x, j) => x - P5_A1[i][j]));
export const errStretch = (thetaDeg: number): number => { const t = (thetaDeg * Math.PI) / 180; return norm(matVec(P5_E, [Math.cos(t), Math.sin(t)])); };
export const p5bWon = (thetaDeg: number, tol: number): boolean => Math.abs(errStretch(thetaDeg) - P1_SIGMA[1]) <= tol;

// ------------------------------------------------------------------ p6 · the Collapse pulse, exactly

export const SV2 = SV_C.map((x) => fmtD(x, 2));                 // 3.00, 1.00, 0.00
export const SV6 = SV_C.map((x) => fmtD(x, 6));                 // 3.002670, 1.000000, 0.001333
export const THIN = SV_C[2];                                    // 1/750
export const p6Won = (thickness: number): boolean => Math.abs(thickness / THIN - 1) <= 0.005;
export const SV_C2 = svdCanon(C2).S;                           // 3, 1, 0: the star lights for the model

// ------------------------------------------------------------------ p7 [S] · the shortest least-squares answer

export const P7_A: Mat = [[1, 1], [1, 1]];
export const P7_B: Vec = [2, 0];
/** Where the input starts: off the line x₁ + x₂ = 1 (A x = (2, 2), a miss of 2), so nothing is solved before a move. */
export const P7_START: Vec = [1.5, 0.5];
/** V Σ⁺ Uᵀ: flip every non-zero stretch, leave the zeros at zero. */
export function pinv(A: Mat, tol = 1e-9): Mat {
  const d = svd(A);
  const m = A.length, n = A[0].length;
  const out: Mat = Array.from({ length: n }, () => new Array(m).fill(0));
  d.S.forEach((s, k) => {
    if (s <= tol) return;
    const v = col(d.V, k), u = col(d.U, k);
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) out[i][j] += (v[i] * u[j]) / s;
  });
  return out;
}
export const P7_XPLUS: Vec = matVec(pinv(P7_A), P7_B);          // (0.5, 0.5)
/** Every x with x₁ + x₂ = 1 is a least-squares answer; the shortest is (½, ½). */
export const p7Won = (x: Vec, tol: number): boolean => Math.abs(x[0] + x[1] - 1) <= tol && norm(x.map((t, i) => t - P7_XPLUS[i])) <= tol;

// ------------------------------------------------------------------ the set piece: Thin, Not Gone

export const RAW_ERROR = NOISE * AMPLIFY;                       // 7.5
export const THIN_DIR: Vec = canon(svdCanon(COLLAPSE).vs[2]);   // ≈ (1, 1, −1)/√3
export const sp1Won = (measured: number, tol: number): boolean => Math.abs(measured - RAW_ERROR) <= tol;
export { CONDITION, READINGS, TEAR, NOISE, AMPLIFY };

/** C₂⁺C₂: sends every point back with its (1, 1, −1) part set to zero. */
export const C2_PLUS: Mat = pinv(C2);
export const C2_BACK: Mat = matMul(C2_PLUS, C2);
/** Two different starts that C₂ lands on the same spot (so no undo can tell them apart). */
export const sp2Won = (a: Vec, b: Vec): boolean => norm(a.map((x, i) => x - b[i])) > 0.5 && norm(matVec(C2, a).map((x, i) => x - matVec(C2, b)[i])) < 1e-9;
export const SP2_DIRS: Vec[] = [[1, 0, 0], [0, 1, 0], [1, -1, 0], C2_NULL];

export const unfoldError = (N: number): number => (NOISE * AMPLIFY) / Math.sqrt(Math.max(1, N));
export const HOLD_LIMIT = 700;                                  // readings Teo can hold still for
export const sp3Won = (N: number): boolean => unfoldError(N) <= TEAR + 1e-6 && N <= HOLD_LIMIT;

/** The brace frame turned by θ about the hinge (1, −1, 0): q₁ = cos θ e₃ + sin θ (1, 1, 0)/√2, q₃ ⟂. */
export function braceFrame(thetaDeg: number): Vec[] {
  const t = (thetaDeg * Math.PI) / 180;
  const a: Vec = [0, 0, 1], b: Vec = [R2, R2, 0];
  return [a.map((x, i) => Math.cos(t) * x + Math.sin(t) * b[i]), [R2, -R2, 0], a.map((x, i) => -Math.sin(t) * x + Math.cos(t) * b[i])];
}
/** The stress the frame leaves mixed: q₁ᵀ C q₃ (zero exactly on the principal axes). */
export const mixedStress = (thetaDeg: number): number => { const [q1, , q3] = braceFrame(thetaDeg); return dot(q1, matVec(COLLAPSE, q3)); };
export const SP4_THETA = (Math.atan2(svdCanon(COLLAPSE).vs[0][0] / R2, svdCanon(COLLAPSE).vs[0][2]) * 180) / Math.PI; // ≈ 35.23°
export const sp4Won = (thetaDeg: number, tolDeg: number): boolean => { const m = (((thetaDeg - SP4_THETA) % 90) + 90) % 90; return Math.min(m, 90 - m) <= tolDeg; };

/** TT22: today the Collapse reads R C R⁻¹; the undo R C⁻¹ R⁻¹; in the Anchor's grid P⁻¹ R C⁻¹ R⁻¹ P. */
export const Rinv: Mat = inverse(R)!;
export const Cinv: Mat = inverse(COLLAPSE)!;
export const TODAY: Mat = matMul(matMul(R, COLLAPSE), Rinv);
export const UNDO_TODAY: Mat = matMul(matMul(R, Cinv), Rinv);
export const SETTINGS: Mat = matMul(matMul(Pinv, UNDO_TODAY), P);
export const SPIRE_LENGTHS: number[] = [0, 1, 2].map((j) => norm(col(SETTINGS, j)));
export interface Card { id: string; name: string; tex: string; M: Mat }
export const CARDS: Card[] = [
  { id: 'P', name: 'into ship numbers', tex: 'P', M: P },
  { id: 'Pinv', name: 'into Anchor numbers', tex: 'P^{-1}', M: Pinv },
  { id: 'R', name: 'quarter turn', tex: 'R', M: R },
  { id: 'Rinv', name: 'quarter turn back', tex: 'R^{-1}', M: Rinv },
  { id: 'Cinv', name: 'the undo', tex: 'C^{-1}', M: Cinv },
  { id: 'C', name: 'the Collapse', tex: 'C', M: COLLAPSE },
];
/** Cards right to left: the rightmost acts first. Product of the rail. */
export const railProduct = (ids: string[]): Mat => ids.reduce((M, id) => matMul(M, CARDS.find((c) => c.id === id)!.M), identity(3));
export const SP5_REF = ['Pinv', 'R', 'Cinv', 'Rinv', 'P'];
export const sp5Won = (ids: string[]): boolean => ids.length > 0 && railProduct(ids).every((r, i) => r.every((x, j) => Math.abs(x - SETTINGS[i][j]) <= 1e-6 * 600));
/** The settings undo today's Collapse, read in the Anchor's grid. */
export const SETTINGS_UNDO = matMul(SETTINGS, matMul(matMul(Pinv, TODAY), P));

/** The Unfold's grade: the hull error from the readings (and the braces and settings that were set). */
export function unfoldGrade(o: { N: number; braced: boolean; settings: boolean }): { error: number; ok: boolean } {
  const error = unfoldError(o.N) + (o.braced ? 0 : 0.4) + (o.settings ? 0 : 1);
  return { error, ok: error <= TEAR + 1e-6 };
}

/** Two gentler pulses C^(−t) then C^(−(1−t)): the larger stretch either one makes. */
export const splitStretch = (t: number): number => AMPLIFY ** Math.max(t, 1 - t);
export const SPLIT_BEST = Math.sqrt(AMPLIFY);                   // 27.39
export const sp7Won = (t: number): boolean => splitStretch(t) <= SPLIT_BEST + 1e-9;

// ------------------------------------------------------------------ Teach Teo T5

export const TEO_TILES = [
  { id: 'flat', text: 'Exactly flat: two points land on the same spot. No undo can tell them apart.' },
  { id: 'thin', text: 'You are thin, not flat: an undo exists. It multiplies every error along the thin line by 1/σ, which is 750.' },
  { id: 'avg', text: 'So the drones take 625 readings and average them. Hold still until the count ends.' },
  { id: 'go', text: 'Then the spires fire the undo, and the stern fills back out with you inside.' },
];
export const TEO_DECOYS = [
  { id: 'zero', text: 'Zero to two decimal places means zero. Nothing that went flat comes back.' },
  { id: 'one', text: 'One clean reading is enough. The undo is exact.' },
];
export const TEO_REF = ['flat', 'thin', 'avg', 'go'];
export const TEO_KEYS = ['flat', 'thin', 'avg'];
export type TeoFault = 'zero' | 'one' | 'k1' | 'k2' | 'k3' | 'order' | null;
export function runTeo(ids: readonly string[]): { ok: boolean; fault: TeoFault; error: number } {
  const at = (id: string) => ids.indexOf(id);
  if (ids.includes('zero')) return { ok: false, fault: 'zero', error: Infinity };
  if (ids.includes('one')) return { ok: false, fault: 'one', error: RAW_ERROR };
  if (at('flat') < 0) return { ok: false, fault: 'k1', error: unfoldError(READINGS) };
  if (at('thin') < 0) return { ok: false, fault: 'k2', error: unfoldError(READINGS) };
  if (at('avg') < 0) return { ok: false, fault: 'k3', error: RAW_ERROR };
  if (!(at('flat') < at('thin') && at('thin') < at('avg'))) return { ok: false, fault: 'order', error: unfoldError(READINGS) };
  return { ok: true, fault: null, error: unfoldError(READINGS) };
}

// ------------------------------------------------------------------ Doubts

/** (F) "Singular values are the eigenvalues." Holds only when the eigenvalues are real and match σ, largest first. */
export function svIsEigHolds(M: Mat): boolean {
  const e = eig2(M);
  if (e.kind !== 'real') return false;
  const s = svdCanon(M).S;
  return Math.abs(e.values[0] - s[0]) < 1e-6 && Math.abs(e.values[1] - s[1]) < 1e-6;
}
/** (F) "The SVD only exists for square matrices." Holds while the matrix is square (a non-square SVD on screen breaks it). */
export const squareOnlyHolds = (A: Mat): boolean => A.length === A[0].length;
/** (T) "For a square matrix, the singular values multiply to |det|." */
export const svDetHolds = (M: Mat): boolean => { const s = svdCanon(M).S; return Math.abs(s[0] * s[1] - Math.abs(det(M))) < 1e-6 * Math.max(1, Math.abs(det(M))); };

// ------------------------------------------------------------------ the Law: the best rank-k picture

export interface LayerCase { sigmas: number[]; k: number }
export const LAW_ANSWER = { which: 'largest', err: 'next' };
export function lawHolds(f: Record<string, string>, c: LayerCase): boolean {
  const n = c.sigmas.length, idx = [...c.sigmas.keys()];
  const order = f.which === 'largest' ? idx.slice().sort((a, b) => c.sigmas[b] - c.sigmas[a]) : f.which === 'smallest' ? idx.slice().sort((a, b) => c.sigmas[a] - c.sigmas[b]) : idx;
  const left = order.slice(c.k).map((i) => c.sigmas[i]);
  const sorted = c.sigmas.slice().sort((a, b) => b - a);
  const best = sorted.slice(c.k).reduce((s, x) => s + x * x, 0);
  const got = left.reduce((s, x) => s + x * x, 0);
  if (Math.abs(got - best) > 1e-9) return false;
  const actual = left.length ? Math.max(...left) : 0;
  const claim = f.err === 'next' ? (sorted[c.k] ?? 0) : f.err === 'zero' ? 0 : left.reduce((s, x) => s + x, 0);
  void n;
  return Math.abs(actual - claim) < 1e-9;
}
export function lawGen(r: () => number): LayerCase {
  const n = rint(r, 3, 5);
  const s = spread(r, n, false, [2, 9]).map((x) => Math.round(x * 100) / 100);
  for (let i = n - 1; i > 0; i--) { const j = rint(r, 0, i); [s[i], s[j]] = [s[j], s[i]]; }
  return { sigmas: s, k: rint(r, 1, n - 2) };
}
export const LAW_EDGES: LayerCase[] = [{ sigmas: [9, 7, 1.5, 1], k: 2 }, { sigmas: [1.5, 9, 0.8, 7], k: 2 }, { sigmas: [3, 1, 0.5], k: 3 }, { sigmas: [6.71, 2.24], k: 1 }];
export const lawDescribe = (c: LayerCase): string => `layers listed with σ = ${c.sigmas.map((x) => fmtN(x)).join(', ')}, keep ${c.k}`;
export const LAW_CORE = { id: 'c25-law', gen: lawGen, edgeCases: LAW_EDGES, holds: lawHolds, describe: lawDescribe };

// ------------------------------------------------------------------ builds: crew versions and swarm cases

/** svd's contract: (u's, σ's largest first, v's), each v with its first non-zero entry positive, u = Av/σ. */
export function crewSvd(A: Mat): [Vec[], number[], Vec[]] { const d = svdCanon(A); return [d.us, d.S, d.vs]; }
export function crewLowRank(A: Mat, k: number): Mat {
  const { us, S, vs } = svdCanon(A);
  return A.map((_, i) => A[0].map((__, j) => { let s = 0; for (let t = 0; t < Math.min(k, S.length); t++) s += S[t] * us[t][i] * vs[t][j]; return s; }));
}
const round4 = (M: Mat): Mat => M.map((row) => row.map((x) => Math.round(x * 1e4) / 1e4));
/** A = U Σ Vᵀ with m ≥ n, singular values of different sizes (so the answer is unique). */
export function svdCase(r: () => number, level: string): [Mat] {
  const n = level === 'cadet' ? 2 : r() < 0.5 ? 2 : 3;
  const m = n + (level === 'cadet' ? 0 : rint(r, 0, 1));
  const V = randOrtho(r, n), U0 = randOrtho(r, m);
  const s = spread(r, n, false, [2, 6]);
  const A: Mat = Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => s.reduce((acc, sg, k) => acc + sg * U0[i][k] * V[j][k], 0)));
  return [round4(A)];
}
export function lowRankCase(r: () => number, level: string): [Mat, number] {
  const [A] = svdCase(r, level);
  return [A, rint(r, 1, A[0].length)];
}

/** The fitted pulse (TT17: the fit returns C exactly) and its stretches, for Show more decimals. */
export const FITTED: Mat = COLLAPSE;
export const svdOk = (r: [Vec[], number[], Vec[]] | null): boolean => !!r && r[1].length === 3 && r[1].every((x, i) => Math.abs(x - SV_C[i]) < 1e-6);
export const lineDegC = lineDeg;
export const R2C = R2;
void fromCols;
