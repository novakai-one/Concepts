// Chapter 18 pure logic (no DOM, no three): every number, win check, doubt predicate, the Law core, the
// Procedure's literal run and the crew versions of the builds. Unit-tested in tests/singular/game-c18.test.ts.
// Story numbers come from truth.ts (T, V, C2, VELL_CUTTER); the puzzle matrices are the GDD's (§6.9).
import { C2, T, V, VELL_CUTTER } from '../../truth.ts';
import {
  det, dot, eig2, eigvals3, identity, matMul, matVec, meq, mpow, norm, nullspace, normalize, veq, type Mat, type Vec,
} from '../../../math/la.ts';
import { nice } from '../../../math/frac.ts';
import { rint, type LawCore } from '../../../game/lawcheck.ts';

// ------------------------------------------------------------------ formatting

/** A number for display: whole numbers as they are, simple fractions as a/b, a real minus sign. */
export const fmtN = (x: number): string => {
  const r = Math.round(x * 1e9) / 1e9;
  const t = Number.isInteger(r) ? String(r) : Math.abs(r * 100 - Math.round(r * 100)) < 1e-9 ? String(Math.round(r * 100) / 100) : nice(r);
  return (t === '-0' ? '0' : t).replace(/^-/, '−');
};
/** Two decimals, for readouts that change continuously. */
export const fmt2 = (x: number): string => (Math.abs(x) < 0.005 ? '0.00' : x.toFixed(2).replace(/^-/, '−'));
export const fmtV = (v: readonly number[]): string => `(${v.map(fmtN).join(', ')})`;
export const fmtV2 = (v: readonly number[]): string => `(${v.map(fmt2).join(', ')})`;
/** A matrix as TeX (rows). */
export const texM = (M: Mat): string => `\\begin{bmatrix}${M.map((r) => r.map((x) => nice(x)).join(' & ')).join(' \\\\ ')}\\end{bmatrix}`;
/** A vector as a stacked column. */
const texV = (v: readonly number[]): string => texM(v.map((x) => [x]));
/** A matrix as small inline TeX (readout rows). */
export const texSmall = (M: Mat): string => `\\left[\\begin{smallmatrix}${M.map((r) => r.map((x) => nice(x)).join(' & ')).join(' \\\\ ')}\\end{smallmatrix}\\right]`;
/** A number read aloud: "minus one", "zero point five". */
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export function spell(x: number): string {
  const neg = x < 0 ? 'minus ' : '';
  const a = Math.abs(x);
  if (Number.isInteger(a) && a <= 10) return neg + WORDS[a];
  if (Number.isInteger(a)) return neg + String(a);
  const [i, d] = a.toFixed(2).replace(/0+$/, '').split('.');
  return `${neg}${WORDS[Number(i)] ?? i} point ${d.split('').map((c) => WORDS[Number(c)]).join(' ')}`;
}
export const sayV = (v: readonly number[]): string => v.map(spell).join(', ');

// ------------------------------------------------------------------ lines that hold (2 × 2)

/** Angle between two lines through the origin (degrees, 0..90). */
export function lineAngleDeg(a: readonly number[], b: readonly number[]): number {
  const na = norm(a as Vec), nb = norm(b as Vec);
  if (na < 1e-12 || nb < 1e-12) return 90;
  const c = Math.min(1, Math.abs(dot(a as Vec, b as Vec)) / (na * nb));
  return (Math.acos(c) * 180) / Math.PI;
}
/** How far M turns the arrow x off its own line (degrees). 0 when Mx stays on x's line (or Mx = 0). */
export function turnDeg(M: Mat, x: readonly number[]): number {
  const y = matVec(M, x as Vec);
  return norm(y) < 1e-12 ? 0 : lineAngleDeg(x, y);
}
/** The signed stretch of x under M along x's own line: (Mx · x) / (x · x). */
export const stretchOf = (M: Mat, x: readonly number[]): number => dot(matVec(M, x as Vec), x as Vec) / dot(x as Vec, x as Vec);

export interface EigLine { dir: Vec; value: number }
/** The real lines a 2 × 2 or 3 × 3 matrix keeps, with their stretches (largest first). Directions are unit arrows. */
export function eigenLines(M: Mat): EigLine[] {
  const n = M.length;
  const values = n === 2 ? (() => { const e = eig2(M); return e.kind === 'real' ? (Math.abs(e.values[0] - e.values[1]) < 1e-9 ? [e.values[0]] : e.values) : []; })() : uniq(eigvals3(M));
  const out: EigLine[] = [];
  for (const l of values) {
    const S = M.map((r, i) => r.map((x, j) => x - (i === j ? l : 0)).map((x) => (Math.abs(x) < 1e-9 ? 0 : x)));
    for (const v of nullspace(S)) out.push({ dir: normalize(v), value: l });
  }
  return out;
}
const uniq = (xs: number[]) => xs.filter((x, i) => xs.findIndex((y) => Math.abs(y - x) < 1e-7) === i);

/** A line the player locked: a direction and the stretch they gave it. */
export interface Lock { dir: number[]; stretch: number }

/** Is this arrow on a line that M keeps (within tol degrees)? */
export const onLine = (M: Mat, x: readonly number[], tolDeg: number): boolean => norm(x as Vec) > 1e-9 && turnDeg(M, x) <= tolDeg;

/** Every line M keeps has a lock on it whose stretch is right (within tol). */
export function linesWon(M: Mat, locks: readonly Lock[], tolDeg: number, tolStretch: number): boolean {
  const want = eigenLines(M);
  if (!want.length) return false;
  return want.every((w) => locks.some((k) => lineAngleDeg(k.dir, w.dir) <= tolDeg && Math.abs(k.stretch - w.value) <= tolStretch));
}

// ------------------------------------------------------------------ the puzzles' matrices (GDD §6.9 Ch 18)

/** p1: the stretch from the spire bench (Ch 11): lines (1, 1) × 3 and (1, −1) × 1. */
export const P1_A: Mat = [[2, 1], [1, 2]];
export const P1_LINES: [Vec, number][] = [[[1, 1], 3], [[1, -1], 1]];
/** p2: a shear: one line, the first axis, × 1. */
export const P2_A: Mat = [[1, 1], [0, 1]];
export const P2_LINE: [Vec, number] = [[1, 0], 1];
/** p2 needs the full sweep as evidence: this share of the circle visited. */
export const SWEEP_FULL = 0.97;
export const p2Won = (locks: readonly Lock[], coverage: number, tolDeg = 2): boolean => coverage >= SWEEP_FULL && linesWon(P2_A, locks, tolDeg, 0.05);

/** p3 [D]: the λ dial on A = [[4, 1], [2, 3]]: λ² − 7λ + 10 = 0 at λ = 5 and 2; lines (1, 1) and (1, −2). */
export const P3_A: Mat = [[4, 1], [2, 3]];
export const P3_ROOTS = [5, 2];
export const P3_LINES: [Vec, number][] = [[[1, 1], 5], [[1, -2], 2]];
/** The characteristic polynomial of a 2 × 2 as [1, −trace, det]: λ² − (a + d)λ + (ad − bc). */
export const charPoly2 = (A: Mat): [number, number, number] => [1, -(A[0][0] + A[1][1]), det(A)];
export const shift = (A: Mat, l: number): Mat => A.map((r, i) => r.map((x, j) => x - (i === j ? l : 0)));
/** det(A − λI). */
export const charAt = (A: Mat, l: number): number => det(shift(A, l));
/** Both roots stopped on, within tol. */
export const rootsWon = (stops: readonly number[], tol = 0.05): boolean => P3_ROOTS.every((r) => stops.some((s) => Math.abs(s - r) <= tol));
/** A dial stop is a flattening when |det(A − λI)| is small (relative to the dial step). */
export const flatAt = (A: Mat, l: number, tol: number): boolean => Math.abs(charAt(A, l)) <= tol;
/** The line A − λI flattens (its null space), as a unit arrow, or null. */
export function nullLine(A: Mat, l: number): Vec | null {
  const ns = nullspace(shift(A, l).map((r) => r.map((x) => (Math.abs(x) < 1e-7 ? 0 : x))));
  return ns.length === 1 ? normalize(ns[0]) : null;
}

/** p4: the routine pulse T (TT3): λ² + 1 = 0, no real line; D = [[1, −1], [1, 1]] = turn 45°, stretch √2. */
export const P4_T: Mat = T;
export const P4_D: Mat = [[1, -1], [1, 1]];
export const P4_STRETCH = Math.SQRT2;
export const P4_ANGLE = 45;
/** The complex pair a ± bi of a 2 × 2 (null when its roots are real). */
export function complexPair(A: Mat): { re: number; im: number } | null {
  const e = eig2(A);
  return e.kind === 'complex' ? { re: e.re, im: e.im } : null;
}
/** Stretch |λ| and turn angle arg λ (degrees) of a complex pair. */
export const polarOf = (z: { re: number; im: number }): { r: number; deg: number } => ({ r: Math.hypot(z.re, z.im), deg: (Math.atan2(z.im, z.re) * 180) / Math.PI });

/** Rail cards for p4: turns, stretches and the routine pulse. */
export interface Card { id: string; name: string; M: Mat }
const rot = (deg: number): Mat => { const t = (deg * Math.PI) / 180; const c = Math.abs(Math.cos(t)) < 1e-12 ? 0 : Math.cos(t), s = Math.abs(Math.sin(t)) < 1e-12 ? 0 : Math.sin(t); return [[c, -s], [s, c]]; };
export const P4_CARDS: Card[] = [
  { id: 'turn45', name: 'turn 45°', M: rot(45) },
  { id: 'turn90', name: 'turn 90°', M: rot(90) },
  { id: 'str141', name: 'stretch × 1.41', M: [[Math.SQRT2, 0], [0, Math.SQRT2]] },
  { id: 'str2', name: 'stretch × 2', M: [[2, 0], [0, 2]] },
];
/** Product of rail cards, the first card acting first (it sits on the right). */
export const railProduct = (cards: readonly (Mat | null)[]): Mat => cards.reduce<Mat>((acc, M) => (M ? matMul(M, acc) : acc), identity(2));
export const p4DWon = (cards: readonly Mat[]): boolean => cards.length > 0 && meq(railProduct(cards), P4_D, 1e-9);
export const p4FourWon = (cards: readonly Mat[]): boolean => cards.length === 4 && cards.every((M) => meq(M, P4_T)) && meq(railProduct(cards), identity(2), 1e-9);
/** The checks typed in p4: λ₁ + λ₂ = 2 (the sum down the diagonal) and λ₁λ₂ = 2 (det). */
export const P4_SUM = 2;
export const P4_PRODUCT = 2;

/** p5 [H] [X8]: a 3 × 3: stretches 5, 2, −5 along (0, 2, 1), (1, 0, 0), (0, 1, −2); trace 2, det −50. */
export const P5_A: Mat = [[2, 0, 0], [0, 3, 4], [0, 4, -3]];
export const P5_VALUES = [5, 2, -5];
export const P5_VECS: Vec[] = [[0, 2, 1], [1, 0, 0], [0, 1, -2]];
/** (3 − λ)(−3 − λ) − 16 = λ² − 25: the block's constant term. */
export const P5_BLOCK_C = (P5_A[1][1] * P5_A[2][2]) - P5_A[1][2] * P5_A[2][1];
/** A triangular matrix: its eigenvalues are its diagonal, 3, −1, 2. */
export const P5_TRI: Mat = [[3, 1, 2], [0, -1, 4], [0, 0, 2]];
export const P5_TRI_VALUES = [3, -1, 2];
export const trace = (M: Mat): number => M.reduce((s, r, i) => s + r[i], 0);

/** p6: Vell's pulse V (TT13): lines (1, 1, 1) × 1, (1, −1, 0) × 0.5, (1, 1, −2) × 0.2. */
export const P6_V: Mat = V;
export const P6_LINES: [Vec, number][] = [[[1, 1, 1], 1], [[1, -1, 0], 0.5], [[1, 1, -2], 0.2]];
/** Candidate lines offered on cadet and navigator: the three that hold and two that do not. */
export const P6_CANDIDATES: Vec[] = [[1, 0, 0], [1, 1, 1], [1, 1, 0], [1, -1, 0], [1, 1, -2]];
export const p6Won = (locks: readonly Lock[], tolDeg = 1, tolStretch = 0.02): boolean => linesWon(P6_V, locks, tolDeg, tolStretch);

/** p7 [S]: row reduce A = [[4, 1], [2, 3]] first (R₂ − ½R₁): U = [[4, 1], [0, 2.5]], stretches 4 and 2.5, not 5 and 2. */
export const P7_U: Mat = [[4, 1], [0, 2.5]];
export const P7_VALUES = [4, 2.5];

/** The two-decimal model C₂ (TT9) at the λ dial: C₂ − 0·I = C₂ flattens, so 0 is an eigenvalue. */
export const CODA_C2: Mat = C2;
export const coda0 = (): boolean => Math.abs(det(C2)) < 1e-12 && nullspace(C2).length === 1;

/** Vell's cutter (TT13), inside the field his plan gathers. */
export const CUTTER: Vec = VELL_CUTTER;

// ------------------------------------------------------------------ the Briefing: Doubts

/** (F) "Every pulse has some line it doesn't turn." Holds when M keeps at least one real line. */
export const everyLineHolds = (M: Mat): boolean => eig2(M).kind === 'real';
/**
 * (F) "The zero arrow is an eigenvector of every matrix." If it were, A0 = λ0 would make every λ a stretch.
 * For the scene (A, x, λ): when x is the zero arrow, the claim says λ is a stretch of A; check it.
 */
export const isRealEigenvalue = (A: Mat, l: number, tol = 1e-6): boolean => {
  const e = eig2(A);
  return e.kind === 'real' && e.values.some((v) => Math.abs(v - l) <= tol);
};
export const zeroArrowHolds = (A: Mat, x: readonly number[], l: number): boolean => norm(x as Vec) > 1e-9 || isRealEigenvalue(A, l);
/** (T) "The eigenvalues add up to the trace." Real pair: λ₁ + λ₂; complex pair: (p + qi) + (p − qi) = 2p. */
export function eigSum(M: Mat): number {
  const e = eig2(M);
  return e.kind === 'real' ? e.values[0] + e.values[1] : 2 * e.re;
}
export const traceSumHolds = (M: Mat): boolean => Math.abs(eigSum(M) - trace(M)) < 1e-6;

// ------------------------------------------------------------------ the Law

export interface EigCase { A: Mat; l: number }
/** The Law: "λ is an eigenvalue of A exactly when A − λI is [singular / the zero matrix / invertible / …]". */
export const LAW_CORE: LawCore<EigCase> & { answer: Record<string, string> } = {
  id: 'c18-law',
  answer: { cond: 'singular' },
  gen(r) {
    // half the cases sit on a real eigenvalue; the rest are a whole number on the dial
    let A: Mat;
    do { A = [[rint(r, -4, 4), rint(r, -4, 4)], [rint(r, -4, 4), rint(r, -4, 4)]]; } while (r() < 0.5 && eig2(A).kind !== 'real');
    const e = eig2(A);
    const l = e.kind === 'real' && r() < 0.5 ? e.values[rint(r, 0, 1)] : rint(r, -5, 5);
    return { A, l };
  },
  edgeCases: [
    { A: [[2, 1], [1, 2]], l: 3 },          // a stretch, but A − 3I is not the zero matrix
    { A: [[3, 0], [0, 3]], l: 3 },          // A − 3I is the zero matrix
    { A: [[4, 1], [2, 3]], l: 4 },          // 4 sits on the diagonal but is not a stretch
    { A: [[0, -1], [1, 0]], l: 0 },         // a quarter turn: no real stretch
    { A: [[1, 1], [0, 1]], l: 1 },          // the shear: one line, λ = 1
    { A: [[1, 2], [2, 4]], l: 0 },          // a flat move: 0 is a stretch
  ],
  holds(f, c) {
    const S = shift(c.A, c.l);
    const isEig = isRealEigenvalue(c.A, c.l, 1e-7);
    const cond = f.cond === 'singular' ? Math.abs(det(S)) < 1e-7
      : f.cond === 'zero' ? S.every((r) => r.every((x) => Math.abs(x) < 1e-9))
      : f.cond === 'invertible' ? Math.abs(det(S)) >= 1e-7
      : c.A.some((r, i) => Math.abs(r[i] - c.l) < 1e-9);   // 'diag': λ is on A's diagonal
    return isEig === cond;
  },
  describe: (c) => {
    const S = shift(c.A, c.l);
    const flat = Math.abs(det(S)) < 1e-7, zero = S.every((r) => r.every((x) => Math.abs(x) < 1e-9));
    const what = zero ? 'is the zero matrix' : flat ? 'flattens space but is not the zero matrix' : 'does not flatten space';
    return `$A = ${texM(c.A)}$, $\\lambda = ${fmtN(c.l).replace('−', '-')}$: ${isRealEigenvalue(c.A, c.l, 1e-7) ? 'it is an eigenvalue' : 'it is not an eigenvalue'}, and $A - \\lambda I = ${texM(S)}$ ${what}`;
  },
};
export const LAW_NEAR_MISSES: Record<string, string>[] = [{ cond: 'zero' }, { cond: 'invertible' }, { cond: 'diag' }];

// ------------------------------------------------------------------ the Procedure: LANTERN runs your steps

/** The test case: A = [[2, 2], [1, 3]]: λ² − 5λ + 4 = 0, λ = 4 along (1, 1), λ = 1 along (2, −1). */
export const PROC_A: Mat = [[2, 2], [1, 3]];
export const PROC_VALUES = [4, 1];
export const PROC_VECS: Vec[] = [[1, 1], [2, -1]];
export const PROC_REF = ['form', 'det0', 'solve', 'foreach', 'null', 'exclude'];
/** Key steps (the node's explain-back): form A − λI and set det = 0; for each λ; exclude the zero arrow. */
export const PROC_KEYS = ['det0', 'foreach', 'exclude'];

export interface ProcStep { tile: string; label: string; M?: Mat; lambda?: number; line?: Vec | null }
export interface ProcRun { ok: boolean; message: string; values: number[] | null; vectors: Vec[]; zero: boolean; steps: ProcStep[]; fault: string | null }

/** Row reduce a 2 × 2 (clear below the first pivot): the misconception "row reduce first". */
const rowReduce2 = (A: Mat): Mat => (Math.abs(A[0][0]) < 1e-12 ? A : [A[0].slice(), [0, A[1][1] - (A[1][0] / A[0][0]) * A[0][1]]]);
const realRoots = (A: Mat): number[] => { const e = eig2(A); return e.kind === 'real' ? (Math.abs(e.values[0] - e.values[1]) < 1e-12 ? [e.values[0]] : e.values) : []; };
const unitLine = (v: Vec): Vec => { const u = normalize(v); return u[0] < -1e-9 || (Math.abs(u[0]) < 1e-9 && u[1] < 0) ? u.map((x) => -x) : u; };

const DIRECT_MSG = 'It solved $(A - \\lambda I)\\mathbf v = \\mathbf 0$ without choosing $\\lambda$. For almost every $\\lambda$ the only answer is $\\mathbf v = \\mathbf 0$, so that is all it found. Find $\\lambda$ first: $\\det(A - \\lambda I) = 0$.';
/** The decoy 'direct' placed after the roots are found: it is still the step det(A − λI) = 0 replaces. */
const DIRECT_LATE_MSG = 'SOLVE $(A - \\lambda I)\\mathbf v = \\mathbf 0$ STRAIGHT AWAY is the step $\\det(A - \\lambda I) = 0$ replaces. Solved for a general $\\lambda$, it only ever returns the zero vector. Take it out.';

/** Run the tiles literally on PROC_A. A missing or misplaced key step is replaced by its misconception. */
export function runProc(ids: readonly string[], A0: Mat = PROC_A): ProcRun {
  let A = A0.map((r) => r.slice());
  let formed = false, equation: 'char' | 'detA' | null = null, values: number[] | null = null;
  let loop = false, vectors: Vec[] = [], zero = false, direct = false, nullRan = false;
  const steps: ProcStep[] = [];
  const fail = (fault: string, message: string): ProcRun => ({ ok: false, message, values, vectors, zero, steps, fault });
  for (const id of ids) {
    if (id === 'rowred') { A = rowReduce2(A); steps.push({ tile: id, label: values ? 'Row reduce $A$' : 'Row reduce $A$ first', M: A }); }
    else if (id === 'diag') { values = A.map((r, i) => r[i]); steps.push({ tile: id, label: `Diagonal entries: $\\lambda = ${values.map(fmtN).join(', ')}$` }); }
    else if (id === 'form') { formed = true; steps.push({ tile: id, label: 'Form $A - \\lambda I$', M: A }); }
    else if (id === 'det0') {
      equation = formed ? 'char' : 'detA';
      steps.push({ tile: id, label: formed ? `Set $\\det(A - \\lambda I) = \\lambda^2 - ${fmtN(A[0][0] + A[1][1])}\\lambda + ${fmtN(det(A))} = 0$` : `Set $\\det A = 0$: but $\\det A = ${fmtN(det(A))}$` });
    } else if (id === 'direct') {
      direct = true;
      steps.push({ tile: id, label: 'Solve $(A - \\lambda I)\\mathbf v = \\mathbf 0$ straight away' });
    } else if (id === 'solve') {
      if (direct && !equation) { values = []; vectors = [[0, 0]]; zero = true; steps.push({ tile: id, label: 'For a general $\\lambda$, $A - \\lambda I$ does not flatten: only $\\mathbf v = \\mathbf 0$' }); continue; }
      if (!equation) return fail('noeq', 'Nothing to solve: no equation for $\\lambda$ yet. Set $\\det(A - \\lambda I) = 0$ first.');
      if (equation === 'detA') return fail('noform', `It set $\\det A = 0$, but $\\det A = ${fmtN(det(A))}$ and there is no $\\lambda$ in it. Form $A - \\lambda I$ first.`);
      values = realRoots(A);
      steps.push({ tile: id, label: `Roots: $\\lambda = ${values.map(fmtN).join('$ and $\\lambda = ')}$` });
    } else if (id === 'foreach') { loop = true; steps.push({ tile: id, label: 'For each $\\lambda$:' }); }
    else if (id === 'null') {
      if (!values || !values.length) return direct ? fail('direct', DIRECT_MSG) : fail('novalues', 'It reached “find the null space” with no $\\lambda$ to use.');
      const use = loop ? values : values.slice(0, 1);
      nullRan = true;
      for (const l of use) {
        const line = nullLine(A, l);
        if (line) vectors.push(unitLine(line));
        steps.push({ tile: id, label: `$\\lambda = ${fmtN(l)}$: the null space of $A - ${fmtN(l)}I$`, M: shift(A, l), lambda: l, line });
      }
      zero = true;            // a null space always holds the zero vector
    } else if (id === 'exclude') {
      if (vectors.length) zero = false;
      steps.push({ tile: id, label: vectors.length ? 'Leave out the zero vector' : 'Leave out the zero vector (nothing listed yet)' });
    }
  }
  // the decoys, checked after the run: a plan that contains a misconception step does not pass
  const at = (t: string) => ids.indexOf(t);
  const solveAt = at('solve');
  if (direct) return fail('direct', solveAt < 0 || at('direct') < solveAt ? DIRECT_MSG : DIRECT_LATE_MSG);
  if (!values) return fail('novalues', 'It never found a value of $\\lambda$. Form $A - \\lambda I$, set its determinant to 0 and solve.');
  const rightValues = values.length === PROC_VALUES.length && PROC_VALUES.every((v) => values!.some((x) => Math.abs(x - v) < 1e-9));
  if (!rightValues) {
    const why = ids.includes('rowred') ? 'Row operations change the matrix, so they change its eigenvalues.' : ids.includes('diag') ? 'Only a triangular matrix has its eigenvalues on the diagonal.' : '';
    return fail('values', `It reports $\\lambda = ${values.map(fmtN).join(', ')}$. The eigenvalues of $A$ are $4$ and $1$. ${why}`.trim());
  }
  if (ids.includes('rowred')) {
    // row reduced after the roots were found: the roots are A's, but the null spaces (or the lines) are not
    const U = rowReduce2(A0), uVals = realRoots(U);
    const nullAt = at('null'), rowAt = at('rowred');
    const shifts = values.map((l) => `$U - ${l === 1 ? '' : fmtN(l)}I$`).join(' and ');
    return fail('rowred', nullAt < 0 || rowAt < nullAt
      ? `It row reduced $A$ to $U = ${texSmall(U)}$ after finding $\\lambda = ${values.map(fmtN).join('$ and $')}$. ${shifts} do not flatten, so their null spaces hold only the zero vector. Row operations change the matrix, so they change its eigenvalues and its lines.`
      : `It found the lines, then row reduced $A$ to $U = ${texSmall(U)}$. $U$ is a different matrix, with ${uVals.length === 1 ? `the one eigenvalue ${fmtN(uVals[0])}` : `eigenvalues ${uVals.map(fmtN).join(' and ')}`}, so the lines it reports are not $U$’s. Row operations change the matrix, so they change its eigenvalues and its lines. Take that step out.`);
  }
  if (!vectors.length) {
    return nullRan
      ? fail('emptynull', 'It found the null space of $A - \\lambda I$, and it held only the zero vector: at that point $A - \\lambda I$ did not flatten. Nothing may change $A$ between solving for $\\lambda$ and finding the null space.')
      : fail('novectors', 'It found $\\lambda = 4$ and $\\lambda = 1$ and stopped. It has the eigenvalues but not the eigenvectors: find the null space of $A - \\lambda I$.');
  }
  if (vectors.length < PROC_VALUES.length) return fail('one', `It found $\\lambda = 4$ and $\\lambda = 1$, then the null space for $\\lambda = 4$ only. One eigenvector reported: $${texV(PROC_VECS[0])}$. Your steps never said to do it **for each** $\\lambda$.`);
  if (zero) return fail('zero', 'It lists the zero vector under $\\lambda = 4$ and under $\\lambda = 1$. $A\\mathbf 0 = \\lambda\\mathbf 0$ for every $\\lambda$, so it would make every number an eigenvalue. Leave it out, after the null space is found.');
  const [v1, v2] = PROC_VECS;
  return { ok: true, message: `Check: $A${texV(v1)} = ${texV(matVec(PROC_A, v1))} = 4${texV(v1)}$ and $A${texV(v2)} = ${texV(matVec(PROC_A, v2))} = ${texV(v2)}$.`, values, vectors, zero, steps, fault: null };
}

// ------------------------------------------------------------------ builds: the crew versions

export type Eig2Out = { kind: 'real'; values: number[] } | { kind: 'complex'; stretch: number; angle: number };
/** eig2: stretches from the trace and determinant; complex roots as stretch |λ| and angle arg λ (degrees). */
export function crewEig2(A: Mat): Eig2Out {
  const [[a, b], [c, d]] = A;
  const tr = a + d, dt = a * d - b * c;
  const disc = tr * tr - 4 * dt;
  if (disc >= 0) { const s = Math.sqrt(disc); return { kind: 'real', values: [(tr + s) / 2, (tr - s) / 2] }; }
  return { kind: 'complex', stretch: Math.sqrt(dt), angle: (Math.atan2(Math.sqrt(-disc) / 2, tr / 2) * 180) / Math.PI };
}
/** power_iteration: apply A again and again, rescaling to length 1 each time. */
export function crewPower(A: Mat, x0: Vec, steps: number): Vec {
  let x = x0.slice();
  for (let i = 0; i < steps; i++) {
    const y = A.map(() => 0);
    x.forEach((xj, j) => A.forEach((row, i2) => { y[i2] += xj * row[j]; }));
    const s = Math.sqrt(y.reduce((t, v) => t + v * v, 0));
    x = y.map((v) => v / s);
  }
  return x;
}

/** Swarm cases. */
export function eig2Case(r: () => number, level: string): [Mat] {
  const k = level === 'cadet' ? 3 : level === 'navigator' ? 5 : 8;
  if (r() < 0.25) { const a = rint(r, -k, k), b = rint(r, 1, k); return [[[a, -b], [b, a]]]; }   // a turn and a stretch
  return [[[rint(r, -k, k), rint(r, -k, k)], [rint(r, -k, k), rint(r, -k, k)]]];
}
export function powerCase(r: () => number, level: string): [Mat, Vec, number] {
  const n = r() < 0.6 ? 2 : 3;
  const k = level === 'cadet' ? 3 : level === 'navigator' ? 4 : 6;
  let A: Mat;
  do { A = Array.from({ length: n }, () => Array.from({ length: n }, () => rint(r, -k, k))); } while (Math.abs(det(A)) < 1);
  let x: Vec;
  do { x = Array.from({ length: n }, () => rint(r, -3, 3)); } while (norm(x) < 1);
  return [A, x, rint(r, 1, level === 'cadet' ? 10 : 30)];
}

/** Where Vell's plan gathers everything: the line his pulse keeps with stretch 1. */
export const GATHER_LINE: Vec = normalize([1, 1, 1]);
/** The line finder on Vell's pulse from the cutter's position: 60 repeats settle on (1, 1, 1). */
export const lineFinder = (): Vec => crewPower(V, CUTTER, 60);
/** Sanity for the scenes: the line finder lands on the gathering line. */
export const lineFinderOk = (v: Vec): boolean => veq(v.map((x) => Math.abs(x)), GATHER_LINE, 1e-6);
/** V⁵⁰ leaves the cutter on the gathering line (used in Ch 20's set piece; planted here). */
export const cutterAfter = (k: number): Vec => matVec(mpow(V, k), CUTTER);
