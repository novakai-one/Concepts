// Exact row reduction with a record of every step. The row-operation puzzles use this:
// the player's moves are RowOps, and "Show me" plays the steps from gaussJordanSteps().
import { Frac, type FMat, fclone } from './frac.ts';

export type RowOp =
  | { kind: 'swap'; i: number; j: number }
  | { kind: 'scale'; i: number; k: Frac }
  | { kind: 'add'; i: number; j: number; k: Frac }; // R_i ← R_i + k·R_j

export function applyOp(m: FMat, op: RowOp): FMat {
  const a = fclone(m);
  if (op.kind === 'swap') {
    [a[op.i], a[op.j]] = [a[op.j], a[op.i]];
  } else if (op.kind === 'scale') {
    if (op.k.isZero()) throw new Error('scale by 0 is not a row operation');
    a[op.i] = a[op.i].map((x) => x.mul(op.k));
  } else {
    if (op.i === op.j) throw new Error('add a row to itself is not a row operation');
    a[op.i] = a[op.i].map((x, c) => x.add(a[op.j][c].mul(op.k)));
  }
  return a;
}

/** Plain-text label, rows 1-based: "R2 → R2 − 3R1". */
export function opLabel(op: RowOp): string {
  const R = (i: number) => `R${i + 1}`;
  if (op.kind === 'swap') return `${R(op.i)} ↔ ${R(op.j)}`;
  if (op.kind === 'scale') return `${R(op.i)} → ${op.k.toString()}·${R(op.i)}`;
  const neg = op.k.sign() < 0;
  const mag = neg ? op.k.neg() : op.k;
  const coef = mag.isOne() ? '' : `${mag.toString()}·`;
  return `${R(op.i)} → ${R(op.i)} ${neg ? '−' : '+'} ${coef}${R(op.j)}`;
}

export function opTex(op: RowOp): string {
  const R = (i: number) => `R_{${i + 1}}`;
  if (op.kind === 'swap') return `${R(op.i)} \\leftrightarrow ${R(op.j)}`;
  if (op.kind === 'scale') return `${R(op.i)} \\to ${op.k.toTex()}\\,${R(op.i)}`;
  const neg = op.k.sign() < 0;
  const mag = neg ? op.k.neg() : op.k;
  const coef = mag.isOne() ? '' : mag.toTex();
  return `${R(op.i)} \\to ${R(op.i)} ${neg ? '-' : '+'} ${coef}${R(op.j)}`;
}

/** Index of the first non-zero entry in a row (within the first `width` columns), or -1. */
export function leadCol(row: Frac[], width = row.length): number {
  for (let c = 0; c < width; c++) if (!row[c].isZero()) return c;
  return -1;
}

/**
 * Row echelon form: zero rows at the bottom, and each row's first non-zero entry (its pivot)
 * sits strictly to the right of the pivot in the row above.
 */
export function isREF(m: FMat, width = m[0]?.length ?? 0): boolean {
  let last = -1;
  let seenZero = false;
  for (const row of m) {
    const lc = leadCol(row, width);
    if (lc === -1) { seenZero = true; continue; }
    if (seenZero) return false;
    if (lc <= last) return false;
    last = lc;
  }
  return true;
}

/** Reduced row echelon form: REF, every pivot is 1, and each pivot is the only non-zero entry in its column. */
export function isRREF(m: FMat, width = m[0]?.length ?? 0): boolean {
  if (!isREF(m, width)) return false;
  for (let r = 0; r < m.length; r++) {
    const lc = leadCol(m[r], width);
    if (lc === -1) continue;
    if (!m[r][lc].isOne()) return false;
    for (let i = 0; i < m.length; i++) if (i !== r && !m[i][lc].isZero()) return false;
  }
  return true;
}

export function pivotCols(m: FMat, width = m[0]?.length ?? 0): number[] {
  return m.map((r) => leadCol(r, width)).filter((c) => c >= 0);
}

/**
 * Gauss–Jordan steps to reduced row echelon form. Prefers a pivot of ±1 when one is available
 * (fewer fractions on screen), then clears below and above each pivot.
 * `width` limits pivots to the coefficient columns (pass n for an n-unknown augmented matrix).
 */
export function gaussJordanSteps(start: FMat, width = start[0]?.length ?? 0): { ops: RowOp[]; states: FMat[] } {
  let a = fclone(start);
  const ops: RowOp[] = [];
  const states: FMat[] = [a];
  const push = (op: RowOp) => { a = applyOp(a, op); ops.push(op); states.push(a); };
  const R = a.length;
  let r = 0;
  for (let c = 0; c < width && r < R; c++) {
    let p = -1;
    for (let i = r; i < R; i++) if (!a[i][c].isZero()) {
      if (p === -1) p = i;
      const v = a[i][c];
      if ((v.isOne() || v.neg().isOne()) && !(a[p][c].isOne() || a[p][c].neg().isOne())) p = i;
    }
    if (p === -1) continue;
    if (p !== r) push({ kind: 'swap', i: r, j: p });
    if (!a[r][c].isOne()) push({ kind: 'scale', i: r, k: a[r][c].inv() });
    for (let i = 0; i < R; i++) if (i !== r && !a[i][c].isZero()) push({ kind: 'add', i, j: r, k: a[i][c].neg() });
    r++;
  }
  return { ops, states };
}

/** Forward elimination only (to row echelon form, pivots not scaled). */
export function gaussSteps(start: FMat, width = start[0]?.length ?? 0): { ops: RowOp[]; states: FMat[] } {
  let a = fclone(start);
  const ops: RowOp[] = [];
  const states: FMat[] = [a];
  const push = (op: RowOp) => { a = applyOp(a, op); ops.push(op); states.push(a); };
  const R = a.length;
  let r = 0;
  for (let c = 0; c < width && r < R; c++) {
    let p = -1;
    for (let i = r; i < R; i++) if (!a[i][c].isZero()) { p = i; break; }
    if (p === -1) continue;
    if (p !== r) push({ kind: 'swap', i: r, j: p });
    for (let i = r + 1; i < R; i++) if (!a[i][c].isZero()) push({ kind: 'add', i, j: r, k: a[i][c].div(a[r][c]).neg() });
    r++;
  }
  return { ops, states };
}

export function rref(start: FMat, width?: number): FMat {
  const { states } = gaussJordanSteps(start, width);
  return states[states.length - 1];
}

export type Classification =
  | { kind: 'unique'; x: Frac[] }
  | { kind: 'none'; badRow: number }
  | { kind: 'infinite'; free: number[]; particular: Frac[]; directions: Frac[][] };

/** Read the solutions of an augmented matrix [A | b] with n unknowns. */
export function classify(aug: FMat, n = (aug[0]?.length ?? 1) - 1): Classification {
  const R = rref(aug, n);
  for (let r = 0; r < R.length; r++) {
    if (leadCol(R[r], n) === -1 && !R[r][n].isZero()) return { kind: 'none', badRow: r };
  }
  const piv = pivotCols(R, n);
  const free = [...Array(n).keys()].filter((c) => !piv.includes(c));
  const particular = new Array(n).fill(Frac.ZERO);
  piv.forEach((pc, i) => { particular[pc] = R[i][n]; });
  if (!free.length) return { kind: 'unique', x: particular };
  const directions = free.map((f) => {
    const d = new Array(n).fill(Frac.ZERO);
    d[f] = Frac.ONE;
    piv.forEach((pc, i) => { d[pc] = R[i][f].neg(); });
    return d;
  });
  return { kind: 'infinite', free, particular, directions };
}

/** Exact determinant via elimination (tracks swaps and scalings). */
export function fdet(m: FMat): Frac {
  let a = fclone(m);
  const n = a.length;
  let d = Frac.ONE;
  for (let c = 0; c < n; c++) {
    let p = -1;
    for (let r = c; r < n; r++) if (!a[r][c].isZero()) { p = r; break; }
    if (p === -1) return Frac.ZERO;
    if (p !== c) { a = applyOp(a, { kind: 'swap', i: c, j: p }); d = d.neg(); }
    d = d.mul(a[c][c]);
    for (let r = c + 1; r < n; r++) if (!a[r][c].isZero()) a = applyOp(a, { kind: 'add', i: r, j: c, k: a[r][c].div(a[c][c]).neg() });
  }
  return d;
}

/** Exact inverse via [A | I] → [I | A⁻¹]; null if A is not invertible. */
export function finverse(m: FMat): FMat | null {
  const n = m.length;
  const aug = m.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? Frac.ONE : Frac.ZERO))]);
  const R = rref(aug, n);
  for (let i = 0; i < n; i++) if (!R[i][i].isOne()) return null;
  return R.map((r) => r.slice(n));
}
