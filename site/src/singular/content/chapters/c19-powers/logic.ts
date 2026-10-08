// Chapter 19 pure logic (no DOM, no three): every number, win check, doubt predicate, the Law core,
// Teo's message (T3) and the crew versions of the builds. Unit-tested in tests/singular/game-c19.test.ts.
// Story numbers come from truth.ts (V); the puzzle matrices are the GDD's (§6.9 Ch 19).
import { V } from '../../truth.ts';
import { det, eig2, identity, inverse, matMul, matVec, meq, mpow, norm, veq, type Mat, type Vec } from '../../../math/la.ts';
import { rint, type LawCore } from '../../../game/lawcheck.ts';
import { crewEig2, fmtN, fmtV, P5_A, P5_VALUES } from '../c18-eigen/logic.ts';

export { fmtN, fmtV };

// ------------------------------------------------------------------ p1 · press five times (the 2-D slice of a slow pulse)

/** V₂ = [[0.75, 0.25], [0.25, 0.75]]: lines (1, 1) × 1 and (1, −1) × 0.5. */
export const V2: Mat = [[0.75, 0.25], [0.25, 0.75]];
export const P1_START: Vec = [3, 1];
/** (3, 1) = 2·(1, 1) + 1·(1, −1). */
export const P1_COORDS: Vec = [2, 1];
export const P1_FORECAST: Vec = [2, 2];
export const P1_PULSES = 50;
/** Where a start is after k pulses, by the eigenvector grid: c₁·1ᵏ·(1, 1) + c₂·0.5ᵏ·(1, −1). */
export const forecast2 = (x: readonly number[], k: number): Vec => {
  const c1 = (x[0] + x[1]) / 2, c2 = (x[0] - x[1]) / 2;
  const s = 0.5 ** k;
  return [c1 + c2 * s, c1 - c2 * s];
};
export const p1Won = (marker: readonly number[], ran: number, tol = 0.05): boolean => ran >= P1_PULSES && Math.hypot(marker[0] - P1_FORECAST[0], marker[1] - P1_FORECAST[1]) <= tol;

// ------------------------------------------------------------------ p2 [D] · fifty as three moves

export const P2_P: Mat = [[1, 1], [1, -1]];
export const P2_D: Mat = [[1, 0], [0, 0.5]];
export const P2_PINV: Mat = inverse(P2_P)!;
export const P2_D50: Mat = [[1, 0], [0, 0.5 ** 50]];
export const P2_V50: Mat = matMul(matMul(P2_P, P2_D50), P2_PINV);
/** A product written as a list of named factors, left to right, e.g. ['P','D','Pi','P','D','Pi']. */
export type Factor = 'P' | 'D' | 'Pi' | 'I';
export const repeatFactors = (k: number): Factor[] => Array.from({ length: k }, () => ['P', 'D', 'Pi'] as Factor[]).flat();
/** Cancel every Pi·P pair that sits side by side (P⁻¹P = I), then drop the I's. */
export function cancelPairs(fs: readonly Factor[]): Factor[] {
  const out: Factor[] = [];
  for (const f of fs) {
    if (f === 'I') continue;
    if (f === 'P' && out[out.length - 1] === 'Pi') { out.pop(); continue; }
    out.push(f);
  }
  return out;
}
/** The value of a factor list (with the 2-D slice's P and D). */
export const factorValue = (fs: readonly Factor[]): Mat => fs.reduce<Mat>((acc, f) => matMul(acc, f === 'P' ? P2_P : f === 'D' ? P2_D : f === 'Pi' ? P2_PINV : identity(2)), identity(2));
/** After cancelling: P D…D P⁻¹ with k D's in a row. */
export const cancelledForm = (k: number): Factor[] => ['P', ...Array.from({ length: k }, () => 'D' as Factor), 'Pi'];

/** The commander's derivation tiles, in order. */
export const P2_TILES = [
  { id: 'a', text: '$A = PDP^{-1}$: into the grid of lines that hold, stretch, back out' },
  { id: 'b', text: '$A^2 = PDP^{-1}\\,PDP^{-1}$' },
  { id: 'c', text: 'The middle $P^{-1}P$ is $I$: $A^2 = PD\\,D\\,P^{-1} = PD^2P^{-1}$' },
  { id: 'd', text: 'Every repeat adds one more cancelling pair: $A^k = PD^kP^{-1}$' },
];
export const P2_DECOYS = [{ id: 'x', text: 'The outer $P$ and $P^{-1}$ cancel: $A^k = D^k$' }];
export const P2_ORDER = ['a', 'b', 'c', 'd'];

// ------------------------------------------------------------------ p3 [H] [X8] · diagonalise by hand

export const P3_A: Mat = [[3, 1], [0, 2]];
export const P3_P: Mat = [[1, 1], [0, -1]];
export const P3_D: Mat = [[3, 0], [0, 2]];
export const P3_PINV: Mat = inverse(P3_P)!;
export const P3_X: Vec = [1, 1];
export const P3_C: Vec = matVec(P3_PINV, P3_X);
export const P3_K = 10;
/** A¹⁰(1, 1) = 2·3¹⁰·(1, 0) − 2¹⁰·(1, −1) = (117074, 1024): one power per direction. */
export const P3_RESULT: Vec = [P3_C[0] * 3 ** P3_K + P3_C[1] * 2 ** P3_K, -P3_C[1] * 2 ** P3_K];
/** Ch 18's 3 × 3 in its own grid (stretches 2, 5, −5 in that order): A⁴ there is diag(16, 625, 625). */
export const P3_SUB_VALUES = [2, 5, -5];
export const P3_SUB_D4: Mat = [[16, 0, 0], [0, 625, 0], [0, 0, 625]];
export const P3_SUB_A = P5_A;
export const P3_SUB_CHECK = P5_VALUES;

// ------------------------------------------------------------------ p4 · not enough lines (the shear)

export const P4_SHEAR: Mat = [[1, 1], [0, 1]];
/** Is this arrow a line the shear keeps? (non-zero, on the first axis) */
export const shearKeeps = (v: readonly number[]): boolean => norm(v as Vec) > 1e-9 && Math.abs(v[1]) < 1e-9;
/** The columns of P from two arrows the shear keeps: det P = 0, so P⁻¹ does not exist. */
export const p4Rejected = (a: readonly number[], b: readonly number[]): boolean => shearKeeps(a) && shearKeeps(b) && Math.abs(a[0] * b[1] - a[1] * b[0]) < 1e-9;

// ------------------------------------------------------------------ p5 · two sites

/** Fixed shares each step: column 1 is “from site A”, column 2 “from site B”. */
export const P5_M: Mat = [[0.9, 0.2], [0.1, 0.8]];
export const P5_START: Vec = [1, 0];
export const P5_LONG: Vec = [2 / 3, 1 / 3];
export const P5_RATIO = 0.7;
export const step2 = (x: readonly number[], k = 1): Vec => matVec(mpow(P5_M, k), x as Vec);
/** The gap to the long run after k steps: (1/3)·0.7ᵏ·(1, −1). */
export const gap = (k: number): number => Math.hypot(...step2(P5_START, k).map((t, i) => t - P5_LONG[i]));
export const p5Won = (share: number, steps: number, ratio: number, tol = 0.02): boolean => Math.abs(share - P5_LONG[0]) <= tol && steps >= 3 && Math.abs(ratio - P5_RATIO) <= 0.005;

// ------------------------------------------------------------------ p6 [S] · Fibonacci by repeated squaring

export const FIB: Mat = [[1, 1], [1, 0]];
export const F50 = 12586269025;
export const FIB_PAR = 10;
export const PHI = (1 + Math.sqrt(5)) / 2;
/** The state of the squaring bench: result R = Mʳ, square B = Mᵇ, products used. */
export interface FibState { r: number; b: number; products: number }
export const FIB_START: FibState = { r: 0, b: 1, products: 0 };
export function fibOp(s: FibState, op: 'square' | 'take' | 'once'): FibState {
  if (op === 'square') return { ...s, b: s.b * 2, products: s.products + 1 };
  if (op === 'take') return { ...s, r: s.r + s.b, products: s.products + (s.r === 0 ? 0 : 1) };
  return { ...s, r: s.r + 1, products: s.products + (s.r === 0 ? 0 : 1) };
}
/** The fewest products for M⁵⁰ by squaring: 50 = 32 + 16 + 2 → 5 squarings and 2 multiplications. */
export function fibPlan(n = 50): ('square' | 'take')[] {
  const ops: ('square' | 'take')[] = [];
  let k = n;
  while (k > 0) { if (k & 1) ops.push('take'); k >>= 1; if (k > 0) ops.push('square'); }
  return ops;
}
export const fibWon = (s: FibState): boolean => s.r === 50;
/** Matrix products the reference mat_pow makes for Aᵏ (one squaring per bit, one product per 1-bit). */
export function powProducts(k: number): number { let n = 0; while (k > 0) { if (k & 1) n++; n++; k >>= 1; } return n; }
/** Fibonacci numbers exactly (BigInt), and M^k as numbers (exact up to 2^53). */
export function fib(n: number): bigint { let a = 0n, b = 1n; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; }
export const fibPow = (k: number): Mat => (k === 0 ? identity(2) : [[Number(fib(k + 1)), Number(fib(k))], [Number(fib(k)), Number(fib(k - 1))]]);

// ------------------------------------------------------------------ diagonalisable or not (2 × 2)

/** Two independent lines that hold (real stretches, distinct, or A = λI). */
export function diagonalisable2(A: Mat): boolean {
  const e = eig2(A);
  if (e.kind !== 'real') return false;
  if (Math.abs(e.values[0] - e.values[1]) > 1e-9) return true;
  return Math.abs(A[0][1]) < 1e-12 && Math.abs(A[1][0]) < 1e-12;
}

// ------------------------------------------------------------------ the Briefing: Doubts

/** (F) "After fifty pulses everything ends up at the Anchor." Holds for a start when V₂⁵⁰ x is (almost) the origin. */
export const allAtAnchorHolds = (x: readonly number[]): boolean => norm(matVec(mpow(V2, 50), x as Vec)) < 0.01;
/** (F) "Diagonalisable means invertible." */
export const diagInvHolds = (A: Mat): boolean => !diagonalisable2(A) || Math.abs(det(A)) > 1e-9;
/** (T) "A 2 × 2 with two different real eigenvalues can always be diagonalised." Complex or repeated: the claim says nothing, so the case agrees. */
export function distinctDiagHolds(A: Mat): boolean {
  const e = eig2(A);
  if (e.kind !== 'real' || Math.abs(e.values[0] - e.values[1]) < 1e-9) return true;
  const d = crewDiag(A);
  return !!d && Math.abs(det(d[0])) > 1e-9 && meq(matMul(matMul(d[0], d[1]), inverse(d[0])!), A, 1e-6);
}

// ------------------------------------------------------------------ the Law

export interface PowCase { P: Mat; M: Mat; k: number }
const isDiag = (M: Mat) => Math.abs(M[0][1]) < 1e-12 && Math.abs(M[1][0]) < 1e-12;
const conjPow = (c: PowCase): Mat => mpow(matMul(matMul(c.P, c.M), inverse(c.P)!), c.k);
/** The Law: "(PMP⁻¹)ᵏ = PMᵏP⁻¹ [for every M / only for diagonal M], because [each P⁻¹P cancels / M is diagonal / the powers of P cancel]". */
export const LAW_CORE: LawCore<PowCase> & { answer: Record<string, string> } = {
  id: 'c19-law',
  answer: { scope: 'every', why: 'cancel' },
  gen(r) {
    let P: Mat;
    do { P = [[rint(r, -2, 2), rint(r, -2, 2)], [rint(r, -2, 2), rint(r, -2, 2)]]; } while (Math.abs(det(P)) < 1);
    const M: Mat = r() < 0.3 ? [[rint(r, -2, 2), 0], [0, rint(r, -2, 2)]] : [[rint(r, -2, 2), rint(r, -2, 2)], [rint(r, -2, 2), rint(r, -2, 2)]];
    return { P, M, k: rint(r, 2, 4) };
  },
  edgeCases: [
    { P: [[1, 1], [1, -1]], M: [[1, 0], [0, 0.5]], k: 3 },      // the chapter's own: D diagonal
    { P: [[1, 1], [0, 1]], M: [[0, -1], [1, 0]], k: 2 },        // M a quarter turn: not diagonal, still holds
    { P: [[2, 1], [1, 1]], M: [[1, 1], [0, 1]], k: 3 },         // M a shear
    { P: [[1, 0], [0, 1]], M: [[1, 2], [3, 4]], k: 2 },         // P = I
  ],
  holds(f, c) {
    const identityHolds = meq(conjPow(c), matMul(matMul(c.P, mpow(c.M, c.k)), inverse(c.P)!), 1e-6);
    // "for every M": the identity must hold here; "only for a diagonal M": it must not hold for this M unless M is diagonal
    const scopeOk = f.scope === 'every' ? identityHolds : !identityHolds || isDiag(c.M);
    const whyOk = f.why === 'cancel' ? true
      : f.why === 'diagM' ? isDiag(c.M)
      : meq(conjPow(c), matMul(matMul(mpow(c.P, c.k), mpow(c.M, c.k)), inverse(mpow(c.P, c.k))!), 1e-6);
    return scopeOk && whyOk;
  },
  describe: (c) => {
    const plain = (M: Mat) => `(${M.map((r) => r.map(fmtN).join(', ')).join('; ')})`;
    const r2 = (A: Mat) => A.map((r) => r.map((x) => Math.round(x * 100) / 100));
    // the powers-of-P side, shown only where it differs: that is the evidence against "the powers of P cancel"
    const lhs = conjPow(c), q = matMul(matMul(mpow(c.P, c.k), mpow(c.M, c.k)), inverse(mpow(c.P, c.k))!);
    return `P = ${plain(c.P)}, M = ${plain(c.M)}${isDiag(c.M) ? ' (diagonal)' : ' (not diagonal)'}, k = ${c.k}: (PMP⁻¹)^${c.k} = P M^${c.k} P⁻¹ = ${plain(r2(lhs))}`
      + (meq(lhs, q, 1e-6) ? '' : `, but P^${c.k} M^${c.k} P^−${c.k} = ${plain(r2(q))}`);
  },
};
export const LAW_NEAR_MISSES: Record<string, string>[] = [{ scope: 'diag', why: 'cancel' }, { scope: 'every', why: 'diagM' }, { scope: 'every', why: 'powers' }];

// ------------------------------------------------------------------ Teach Teo T3 (GDD §4.4): row operations, by hand

/** Teo's air-mix system: three valve settings x, y, z read by three gauges. Solution (1, 2, 3). */
export const TEO_AUG: number[][] = [[1, 1, 1, 6], [2, 3, 1, 11], [1, 2, 3, 14]];
export const TEO_X: Vec = [1, 2, 3];
export const TEO_REF = ['whole', 'cols', 'back', 'check'];
export const TEO_KEYS = ['whole', 'cols', 'back'];
export interface TeoStep { label: string; aug: number[][] }
export interface TeoRun { ok: boolean; x: Vec | null; steps: TeoStep[]; fault: null | 'stuck' | 'rhs' | 'noread' | 'top'; gauges: Vec | null; checked: boolean }

/** Clear below each pivot, column by column. rhs: whether the right-hand side changes too. */
function eliminate(aug: number[][], rhs: boolean, steps: TeoStep[]): number[][] {
  const m = aug.map((r) => r.slice());
  const n = 3;
  for (let c = 0; c < n; c++) for (let r = c + 1; r < n; r++) {
    const f = m[r][c] / m[c][c];
    if (Math.abs(f) < 1e-12) continue;
    for (let j = c; j < (rhs ? n + 1 : n); j++) m[r][j] -= f * m[c][j];
    steps.push({ label: `Row ${r + 1} − ${fmtN(f)} × row ${c + 1}${rhs ? '' : ' (left side only)'}`, aug: m.map((x) => x.slice()) });
  }
  return m;
}
const backSub = (m: number[][]): Vec => {
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) { let s = m[i][3]; for (let j = i + 1; j < 3; j++) s -= m[i][j] * x[j]; x[i] = s / m[i][i]; }
  return x;
};

/** Teo follows the tiles literally. A missing or misplaced key step is replaced by its misconception. */
export function runTeo(ids: readonly string[]): TeoRun {
  const steps: TeoStep[] = [{ label: 'Teo’s three gauges', aug: TEO_AUG.map((r) => r.slice()) }];
  let rhs = false, m = TEO_AUG.map((r) => r.slice()), eliminated = false, x: Vec | null = null, read: 'bottom' | 'top' | null = null, checked = false;
  for (const id of ids) {
    if (id === 'whole') rhs = true;
    else if (id === 'left') rhs = false;
    else if (id === 'cols') { m = eliminate(m, rhs, steps); eliminated = true; }
    else if (id === 'back' || id === 'top') {
      read = id === 'back' ? 'bottom' : 'top';
      if (!eliminated) return { ok: false, x: null, steps, fault: 'stuck', gauges: null, checked };
      if (read === 'top') return { ok: false, x: null, steps, fault: 'top', gauges: null, checked };
      x = backSub(m);
    } else if (id === 'check') checked = true;
  }
  if (!eliminated) return { ok: false, x: null, steps, fault: 'stuck', gauges: null, checked };
  if (!read) return { ok: false, x: null, steps, fault: 'noread', gauges: null, checked };
  const gauges = TEO_AUG.map((r) => r[0] * x![0] + r[1] * x![1] + r[2] * x![2]);
  const right = veq(x!, TEO_X, 1e-9);
  if (!right) return { ok: false, x, steps, fault: 'rhs', gauges, checked };
  return { ok: true, x, steps, fault: null, gauges, checked };
}

// ------------------------------------------------------------------ builds: the crew versions

/** mat_pow: Aᵏ (the crew version multiplies; the player squares). */
export const crewPow = (A: Mat, k: number): Mat => mpow(A, k);
/** diagonalise2: [P, D] with eigenvectors (first entry 1, or (0, 1)) as P's columns, larger stretch first; null if A has too few real lines. */
export function crewDiag(A: Mat): [Mat, Mat] | null {
  const e = crewEig2(A);
  if (e.kind !== 'real') return null;
  const [l1, l2] = e.values;
  if (Math.abs(l1 - l2) < 1e-12) return A[0][1] === 0 && A[1][0] === 0 ? [identity(2), [[l1, 0], [0, l2]]] : null;
  const vs = [l1, l2].map((lam) => {
    const a = A[0][0] - lam, b = A[0][1], c = A[1][0], d = A[1][1] - lam;
    if (Math.abs(b) > 1e-12) return [1, -a / b];
    if (Math.abs(a) > 1e-12) return [0, 1];
    if (Math.abs(d) > 1e-12) return [1, -c / d];
    return [0, 1];
  });
  return [[[vs[0][0], vs[1][0]], [vs[0][1], vs[1][1]]], [[l1, 0], [0, l2]]];
}

export function powCase(r: () => number, level: string): [Mat, number] {
  const n = r() < 0.7 ? 2 : 3;
  const k = level === 'cadet' ? 1 : 2;
  const A = Array.from({ length: n }, () => Array.from({ length: n }, () => rint(r, -k, k)));
  return [A, rint(r, 0, level === 'commander' ? 12 : 9)];
}
export function diagCase(r: () => number, level: string): [Mat] {
  const k = level === 'cadet' ? 3 : level === 'navigator' ? 4 : 6;
  const u = r();
  if (u < 0.12) { const a = rint(r, -k, k); return [[[a, rint(r, 1, k)], [0, a]]]; }          // a shear: too few lines
  if (u < 0.22) { const a = rint(r, -k, k), b = rint(r, 1, k); return [[[a, -b], [b, a]]]; }    // a turn: no real lines
  if (u < 0.3) { const a = rint(r, -k, k); return [[[a, 0], [0, a]]]; }                          // a plain stretch
  return [[[rint(r, -k, k), rint(r, -k, k)], [rint(r, -k, k), rint(r, -k, k)]]];
}

/** Vell's fifty-pulse forecast: V⁵⁰ (TT13). */
export const V50: Mat = mpow(V, 50);
export const forecastOk = (M: Mat): boolean => meq(M, V50, 1e-6);
