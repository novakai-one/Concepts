// Chapter 13, pure logic: every number the chapter shows, every win test, the Doubts' predicates, the
// Law core, the Procedure executor and the crew versions of the builds. No DOM, no three:
// tests/singular/game-c13.test.ts imports this file in Node.
import { det, fromCols, identity, inverse, matMul, matVec, meq, type Mat, type Vec } from '../../../math/la.ts';
import { Frac, fmat, fnum, type FMat } from '../../../math/frac.ts';
import { applyOp, finverse, type RowOp } from '../../../math/rref.ts';
import { rint, type LawCore } from '../../../game/lawcheck.ts';
import type { Difficulty } from '../../../core/save.ts';
import { T, R2 } from '../../truth.ts';

export type { Mat, Vec };

/** Win tolerance by Maths depth (GDD §7.1). */
export const tolFor = (d: Difficulty): number => (d === 'commander' ? 0.01 : 0.05);
export const I2: Mat = identity(2);
export const I3: Mat = identity(3);

export const meqTol = (A: Mat, B: Mat, tol = 0.05): boolean =>
  A.length === B.length && A.every((r, i) => r.length === B[i].length && r.every((x, j) => Math.abs(x - B[i][j]) <= tol));
export const near = (a: readonly number[], b: readonly number[], tol = 0.05): boolean =>
  Math.hypot(...a.map((x, i) => x - (b[i] ?? 0))) <= tol;

/** "(1, −1)" with true minus signs, whole numbers and simple fractions exact. */
export function fmtN(x: number): string {
  if (Math.abs(x) < 1e-9) return '0';
  if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x)).replace('-', '−');
  const f = Frac.from(x, 12);
  if (Math.abs(f.value() - x) < 1e-9) return f.toString().replace('-', '−');
  return x.toFixed(2).replace('-', '−');
}
export const fmtV = (v: readonly number[]): string => `(${v.map(fmtN).join(', ')})`;
/** TeX for a matrix: \begin{bmatrix} … \end{bmatrix}, entries as exact as possible. */
export function texM(M: Mat): string {
  const t = (x: number) => { const s = fmtN(x).replace('−', '-'); return s.includes('/') ? `${s.startsWith('-') ? '-' : ''}\\tfrac{${s.replace('-', '').split('/')[0]}}{${s.split('/')[1]}}` : s; };
  return `\\begin{bmatrix}${M.map((r) => r.map(t).join(' & ')).join(' \\\\ ')}\\end{bmatrix}`;
}

/** Does U undo A? (U after A leaves every point where it started.) */
export const undoes = (U: Mat, A: Mat, tol = 0.05): boolean => meqTol(matMul(U, A), identity(A.length), tol);

// ------------------------------------------------------------------ c13-p1 · undo a quarter turn

/** The test frame was turned a quarter turn: columns (0, 1) and (−1, 0). */
export const P1_A: Mat = R2;
export const P1_UNDO: Mat = inverse(R2)!; // [[0, 1], [−1, 0]]: a quarter turn the other way
export const p1Won = (U: Mat, tol = 0.05): boolean => undoes(U, P1_A, tol);
/** The misconception: "undo" by turning the same way again (a half turn). */
export const P1_SAME_WAY: Mat = matMul(R2, I2);

// ------------------------------------------------------------------ c13-p2 · undo by landing spots

export const P2_A: Mat = [[2, 1], [1, 1]];
/** The points A sends to e₁ and e₂. */
export const P2_TO_E1: Vec = [1, -1];
export const P2_TO_E2: Vec = [-1, 2];
export const P2_UNDO: Mat = fromCols([P2_TO_E1, P2_TO_E2]);
/** Win: each column of the undo lands on its grid arrow under A. */
export const p2ColumnOk = (j: 0 | 1, colTip: readonly number[], tol = 0.05): boolean =>
  near(matVec(P2_A, [colTip[0], colTip[1]]), j === 0 ? [1, 0] : [0, 1], tol);
export const p2Won = (U: Mat, tol = 0.05): boolean => meqTol(matMul(P2_A, U), I2, tol);
/** The misconceptions: A itself, and the entry-by-entry flip (1/a). */
export const P2_ENTRY_RECIP: Mat = [[1 / 2, 1], [1, 1]];

// ------------------------------------------------------------------ c13-p3 · square the bow

/** The routine pulse's ground layer (TT3). Its undo is also three more routine pulses. */
export const P3_A: Mat = T;
export const P3_UNDO: Mat = inverse(T)!; // [[−1, 2], [−1, 1]]
export const p3Won = (U: Mat, tol = 0.05): boolean => undoes(U, P3_A, tol);

// ------------------------------------------------------------------ c13-p4 · why [A | I] works

export const P4_A: Mat = [[1, 1, 0], [0, 1, 1], [1, 0, 1]];
export const P4_INV_F: FMat = finverse(fmat(P4_A))!;
export const P4_INV: Mat = fnum(P4_INV_F); // ½·[[1, −1, 1], [1, 1, −1], [−1, 1, 1]]
export const P4_B: Mat = [[1, 0], [2, 1], [3, 1]];
export const P4_X: Mat = matMul(P4_INV, P4_B); // [[1, 0], [0, 0], [2, 1]]
/** The augmented matrix [A | I]. */
export const augWithI = (A: Mat): Mat => A.map((r, i) => [...r, ...identity(A.length)[i]]);
/** The elementary matrix of a row operation on n rows (the same operation done to I). */
export function elementary(op: RowOp, n: number): Mat {
  return fnum(applyOp(fmat(identity(n)), op));
}
/** The left block of an n-row augmented matrix, as numbers. */
export const leftOf = (m: FMat, n: number): Mat => fnum(m).map((r) => r.slice(0, n));
export const rightOf = (m: FMat, n: number): Mat => fnum(m).map((r) => r.slice(n));
/** True when the left block is the identity. */
export const leftIsI = (m: FMat, n: number): boolean => meq(leftOf(m, n), identity(n), 1e-12);
/** The commander answer: LANTERN checks only A·X = I. */
export const p4TypedOk = (X: Mat): boolean => meqTol(matMul(P4_A, X), I3, 1e-6);
/** The reference row operations for [A | I] (Gauss–Jordan, no swaps needed). */
export const P4_REF_OPS: RowOp[] = [
  { kind: 'add', i: 2, j: 0, k: new Frac(-1) },
  { kind: 'add', i: 2, j: 1, k: new Frac(1) },
  { kind: 'scale', i: 2, k: new Frac(1, 2) },
  { kind: 'add', i: 1, j: 2, k: new Frac(-1) },
  { kind: 'add', i: 0, j: 1, k: new Frac(-1) },
];
/** Play row operations on a matrix (exact). */
export const playOps = (m: Mat | FMat, ops: RowOp[]): FMat => ops.reduce((a, op) => applyOp(a, op), (m[0][0] instanceof Frac ? m : fmat(m as Mat)) as FMat);

// ------------------------------------------------------------------ c13-p5 · undo a chain

export const SHEAR: Mat = [[1, 1], [0, 1]];
export const TURN: Mat = R2;
/** The frame was turned, then sheared: SHEAR · TURN (the move next to the point acts first). */
export const P5_FRAME: Mat = matMul(SHEAR, TURN);
export const P5_CARDS: Record<string, { M: Mat; label: string; tex: string }> = {
  'undo-turn': { M: inverse(TURN)!, label: 'Undo the turn', tex: 'R^{-1}' },
  'undo-shear': { M: inverse(SHEAR)!, label: 'Undo the shear', tex: 'S^{-1}' },
  turn: { M: TURN, label: 'Turn again', tex: 'R' },
  shear: { M: SHEAR, label: 'Shear again', tex: 'S' },
};
/** The cards in the order they act (first acts first) → the product (last acting on the left). */
export const chainOf = (ids: string[]): Mat => ids.reduce((acc, id) => matMul(P5_CARDS[id].M, acc), I2);
export const p5Won = (ids: string[]): boolean => ids.length === 2 && meqTol(matMul(chainOf(ids), P5_FRAME), I2, 1e-9);
export const P5_REF = ['undo-shear', 'undo-turn'];
export const P5_WRONG = ['undo-turn', 'undo-shear'];

// ------------------------------------------------------------------ c13-p6 · the one that cannot be undone

export const P6_A: Mat = [[1, 2], [2, 4]];
export const P6_PAIR: [Vec, Vec] = [[2, 0], [0, 1]];
export const P6_LAND: Vec = matVec(P6_A, P6_PAIR[0]); // (2, 4)
/** Win: two different starts that land on one spot. */
export function p6Won(x: readonly number[], y: readonly number[], tol = 0.05): boolean {
  const ax = matVec(P6_A, [x[0], x[1]]), ay = matVec(P6_A, [y[0], y[1]]);
  return Math.hypot(x[0] - y[0], x[1] - y[1]) >= 0.5 && near(ax, ay, tol);
}
/** Every undo U leaves U·A flat: its two columns stay on one line. */
export const stillFlat = (U: Mat): boolean => Math.abs(det(matMul(U, P6_A))) < 1e-9;

// ------------------------------------------------------------------ c13-p7 [S] · LU

export const P7_A: Mat = [[2, 1, 1], [4, 3, 3], [8, 7, 9]];
export const P7_MULT = { l21: 2, l31: 4, l32: 3 };
export const P7_U: Mat = [[2, 1, 1], [0, 1, 1], [0, 0, 2]];
export const P7_L: Mat = [[1, 0, 0], [P7_MULT.l21, 1, 0], [P7_MULT.l31, P7_MULT.l32, 1]];

// ------------------------------------------------------------------ the Doubts

/** (F) "Every matrix that is not all zeros has an undo." Vacuous for the zero matrix. */
export const nonzeroHasUndo = (M: Mat): boolean => M.every((r) => r.every((x) => Math.abs(x) < 1e-9)) || Math.abs(det(M)) > 1e-9;

/** (F) "(AB)⁻¹ = A⁻¹B⁻¹." Vacuous when A or B has no inverse. */
export function inverseOfProductClaim(A: Mat, B: Mat): boolean {
  const ia = inverse(A), ib = inverse(B);
  if (!ia || !ib || Math.abs(det(A)) < 1e-9 || Math.abs(det(B)) < 1e-9) return true;
  return meqTol(inverse(matMul(A, B))!, matMul(ia, ib), 1e-9);
}
/** The true rule, for the reason line: (AB)⁻¹ = B⁻¹A⁻¹. */
export const reversedRule = (A: Mat, B: Mat): boolean => meqTol(inverse(matMul(A, B))!, matMul(inverse(B)!, inverse(A)!), 1e-9);

/** (T) "A move that flips the grid over can still be undone." Vacuous when the move does not flip. */
export const flipCanUndo = (M: Mat): boolean => det(M) >= -1e-12 || inverse(M) !== null;

// ------------------------------------------------------------------ the Law

export interface InvCase { M: Mat }
/** "Two different points land on one spot": a non-zero arrow lands on the origin. */
export const twoLandTogether = (M: Mat): boolean => Math.abs(det(M)) < 1e-9;
export const hasInverse = (M: Mat): boolean => Math.abs(det(M)) > 1e-9;

const COND: Record<string, (M: Mat) => boolean> = {
  apart: (M) => !twoLandTogether(M),
  'no-zero': (M) => M.every((r) => r.every((x) => x !== 0)),
  'not-zero': (M) => M.some((r) => r.some((x) => x !== 0)),
  'no-flip': (M) => det(M) >= 0,
};

/** The Law: "A [has an inverse / has no inverse] exactly when [condition]." */
export const lawCore: LawCore<InvCase> & { answer: Record<string, string> } = {
  id: 'c13-law',
  answer: { kind: 'inverse', cond: 'apart' },
  gen(r) {
    // a third of the cases are flat on purpose (one column a multiple of the other)
    if (r() < 0.34) {
      const a = [rint(r, -4, 4), rint(r, -4, 4)];
      if (a[0] === 0 && a[1] === 0) a[0] = 1;
      const k = rint(r, -3, 3);
      return { M: fromCols(r() < 0.5 ? [a, [k * a[0], k * a[1]]] : [[k * a[0], k * a[1]], a]) };
    }
    return { M: [[rint(r, -5, 5), rint(r, -5, 5)], [rint(r, -5, 5), rint(r, -5, 5)]] };
  },
  edgeCases: [
    { M: [[1, 0], [0, 1]] }, { M: [[1, 1], [1, 1]] }, { M: [[0, 1], [1, 0]] }, { M: [[1, 2], [2, 4]] },
    { M: [[0, 0], [0, 0]] }, { M: [[2, 1], [1, 1]] }, { M: [[1, 0], [0, 0]] },
  ],
  holds(f, c) {
    const cond = (COND[f.cond] ?? (() => false))(c.M);
    const inv = hasInverse(c.M);
    return (f.kind === 'inverse' ? inv : !inv) === cond;
  },
  describe(c) {
    const M = c.M;
    const lands = twoLandTogether(M);
    return `A = ${texRows(M)}: ${lands ? 'two different points land on one spot, so it has no inverse' : 'no two points land together, and it has an inverse'}`;
  },
};
const texRows = (M: Mat) => `[${M.map((r) => `(${r.map(fmtN).join(', ')})`).join(', ')}] by rows`;

// ------------------------------------------------------------------ the Procedure: LANTERN runs [A | I]

export type ProcTile = 'find' | 'swap' | 'scale' | 'clear' | 'both' | 'left-only' | 'clear-below';
export const PROC_REF: ProcTile[] = ['find', 'swap', 'scale', 'clear', 'both'];
/** The test case: a zero in the first pivot spot, and a pivot that is not 1. */
export const PROC_A: Mat = [[0, 2], [1, 1]];
export const PROC_INV: Mat = inverse(PROC_A)!; // [[−1/2, 1], [1/2, 0]]

export interface ProcStep { label: string; m: FMat; op: RowOp | null; col: number }
export interface ProcResult { ok: boolean; message: string; steps: ProcStep[]; failed?: 'pivot' | 'divide' | 'order' | 'left' | 'right' | 'scale' }

/**
 * Run the tiles literally on [A | I], once per column, left to right. The tiles are the body of the
 * loop. A missing or misplaced key step does what that misconception does, visibly.
 */
export function runProcedure(tiles: string[], A: Mat = PROC_A): ProcResult {
  const n = A.length;
  const both = tiles.includes('both') && !tiles.includes('left-only');
  const body = tiles.filter((t) => t !== 'both' && t !== 'left-only');
  let m = fmat(augWithI(A));
  const steps: ProcStep[] = [{ label: 'Start: [A | I]', m, op: null, col: -1 }];
  const width = both ? 2 * n : n;
  // an operation done to the left half only, unless "apply to both halves" is in the plan
  const doOp = (op: RowOp, label: string, col: number) => {
    const full = applyOp(m, op);
    m = full.map((row, i) => row.map((x, c) => (c < width ? x : m[i][c])));
    steps.push({ label, m, op, col });
  };
  for (let c = 0; c < n; c++) {
    let found = false;
    for (const t of body) {
      if (t === 'find') { found = true; steps.push({ label: `Column ${c + 1}: the pivot spot is row ${c + 1}`, m, op: null, col: c }); continue; }
      if (!found && (t === 'swap' || t === 'scale' || t === 'clear' || t === 'clear-below')) {
        return { ok: false, steps, failed: 'pivot', message: `Column ${c + 1}: you told me to ${t === 'swap' ? 'swap' : t === 'scale' ? 'scale' : 'clear'} before you told me to find the pivot. I do not know which entry to use.` };
      }
      if (t === 'swap') {
        if (m[c][c].isZero()) {
          let p = -1;
          for (let r = c + 1; r < n; r++) if (!m[r][c].isZero()) { p = r; break; }
          if (p < 0) return { ok: false, steps, failed: 'pivot', message: `Column ${c + 1} has no pivot anywhere below. This matrix has no inverse.` };
          doOp({ kind: 'swap', i: c, j: p }, `Swap R${c + 1} and R${p + 1}`, c);
        }
        continue;
      }
      if (t === 'scale') {
        const pv = m[c][c];
        if (pv.isZero()) return { ok: false, steps, failed: 'divide', message: `Column ${c + 1}: the pivot spot holds 0. You told me to scale it to 1 without swapping first. I cannot divide by 0.` };
        if (!pv.isOne()) doOp({ kind: 'scale', i: c, k: pv.inv() }, `Scale R${c + 1} by ${pv.inv().toString()}`, c);
        continue;
      }
      if (t === 'clear' || t === 'clear-below') {
        // literal: subtract (entry) × (pivot row); this clears the entry only when the pivot is already 1
        for (let r = 0; r < n; r++) {
          if (r === c || (t === 'clear-below' && r < c)) continue;
          const e = m[r][c];
          if (e.isZero()) continue;
          doOp({ kind: 'add', i: r, j: c, k: e.neg() }, `R${r + 1} − ${e.toString()}·R${c + 1}`, c);
        }
      }
    }
  }
  const left = leftOf(m, n), right = rightOf(m, n);
  const leftI = meq(left, identity(n), 1e-12);
  if (!leftI) {
    const missingScale = !body.includes('scale');
    const missingAbove = body.includes('clear-below') && !body.includes('clear');
    return {
      ok: false, steps, failed: missingScale ? 'scale' : 'left',
      message: missingScale ? 'The left half did not become I: its pivots are not 1. You never told me to scale a row.'
        : missingAbove ? 'The left half did not become I: you told me to clear below each pivot, not above it.'
          : !body.includes('clear') ? 'The left half did not become I. You never told me to clear the other entries in each pivot column.'
            : 'The left half did not become I. I cleared with a pivot that was not yet 1, so the entries did not reach 0.',
    };
  }
  if (!meqTol(matMul(A, right), identity(n), 1e-9)) {
    return {
      ok: false, steps, failed: 'right',
      message: both ? 'The left half is I, but the right half does not undo A.'
        : tiles.includes('left-only') ? 'The left half is I. The right half is still I: you told me to change the left half only. A times I is A, not I.'
          : 'The left half is I. The right half is still I: you never told me to do each step to both halves. A times I is A, not I.',
    };
  }
  return { ok: true, steps, message: `[A | I] became [I | A⁻¹]. Check: A times the right half is I.` };
}

// ------------------------------------------------------------------ crew versions (the builds)

export const crewIdentity = (n: number): Mat => identity(n);

/** Gauss–Jordan on [A | I] with partial pivoting; null when a column has no pivot (|entry| < 1e-9). Same as the reference Python. */
export function crewInverse(A: Mat): Mat | null {
  const n = A.length;
  const a = A.map((r, i) => [...r.map(Number), ...identity(n)[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-9) return null;
    [a[p], a[c]] = [a[c], a[p]];
    const pv = a[c][c];
    for (let k = 0; k < 2 * n; k++) a[c][k] /= pv;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = a[r][c];
      for (let k = 0; k < 2 * n; k++) a[r][k] -= f * a[c][k];
    }
  }
  return a.map((r) => r.slice(n));
}

/** Swarm cases: square matrices of size 2 or 3 with small whole entries; some flat on purpose. */
export function swarmMatrix(r: () => number, d: Difficulty): Mat {
  const n = d === 'cadet' ? 2 : r() < 0.5 ? 2 : 3;
  const lo = d === 'commander' ? -9 : -5, hi = -lo;
  const M = Array.from({ length: n }, () => Array.from({ length: n }, () => rint(r, lo, hi)));
  if (r() < 0.2) { const k = rint(r, -2, 2); M[n - 1] = M[0].map((x) => k * x); }
  return M;
}
