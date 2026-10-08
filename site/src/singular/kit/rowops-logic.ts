// Pure logic behind the row-operation board (no DOM, no three): parsing typed multipliers, the
// multiplier the board fills in for the player, inverse operations for Undo, the row order after a
// change, and the plain-text / TeX the board shows. Unit-tested in tests/singular/game-rowops.test.ts.
import { Frac, type FMat } from '../math/frac.ts';
import { classify, isRREF, leadCol, type RowOp } from '../math/rref.ts';

export type OpKind = RowOp['kind'];

/** Parse a typed number exactly: "3", "-2", "−1/3", "0.5", "+4/6". Returns null if it is not a number. */
export function parseFrac(s: string): Frac | null {
  const t = s.trim().replace(/[−–]/g, '-').replace(/\s+/g, '');
  if (!t) return null;
  let m = t.match(/^([+-]?\d+)\/([+-]?\d+)$/);
  if (m) {
    const d = parseInt(m[2], 10);
    return d === 0 ? null : new Frac(parseInt(m[1], 10), d);
  }
  if (/^[+-]?\d+$/.test(t)) return new Frac(parseInt(t, 10));
  m = t.match(/^([+-]?)(\d*)\.(\d+)$/);
  if (m) {
    if (m[3].length > 9) return null;
    const num = parseInt(`${m[2] || '0'}${m[3]}`, 10);
    return new Frac((m[1] === '-' ? -1 : 1) * num, 10 ** m[3].length);
  }
  return null;
}

/** Plain text with a true minus sign: "−3/2", "4". */
export function fracText(x: Frac): string {
  const s = x.sign() < 0 ? '−' : '';
  const a = Math.abs(x.n);
  return x.d === 1 ? `${s}${a}` : `${s}${a}/${x.d}`;
}

/** HTML for one number: integers inline, fractions stacked (styled by kit-rowops.css). */
export function fracHTML(x: Frac): string {
  const s = x.sign() < 0 ? '<span class="rob-minus">−</span>' : '';
  const a = Math.abs(x.n);
  if (x.d === 1) return `${s}${a}`;
  return `${s}<span class="rob-fr"><span class="rob-fr-n">${a}</span><span class="rob-fr-d">${x.d}</span></span>`;
}

export interface AddSuggestion {
  /** The multiplier to fill in. */
  k: Frac;
  /** The column whose entry it clears in the target row (the source row's pivot column), or -1. */
  col: number;
  /** True when adding k × source to target makes target[col] zero. */
  clears: boolean;
}

/**
 * The multiplier the board fills in for "R_target → R_target + k·R_source": the one that clears the
 * target's entry in the source row's pivot column. Falls back to 1 when there is nothing to clear.
 */
export function suggestAddK(m: FMat, target: number, source: number, n: number): AddSuggestion {
  const c = leadCol(m[source], n);
  if (c < 0) return { k: Frac.ONE, col: -1, clears: false };
  const t = m[target][c];
  if (t.isZero()) return { k: Frac.ONE, col: c, clears: false };
  return { k: t.div(m[source][c]).neg(), col: c, clears: true };
}

/**
 * Which row to add to `target` when the player asks to add without naming a row.
 * First choice: a row above with its pivot under the target's first non-zero entry (clearing below a
 * pivot). Then any row with a pivot in that column. Then a row whose pivot column holds a non-zero
 * entry of the target (clearing above a pivot), leftmost first. Pivots of ±1 win ties.
 */
export function suggestSource(m: FMat, target: number, n: number): number {
  const ct = leadCol(m[target], n);
  let best = -1, bestScore = -Infinity;
  for (let j = 0; j < m.length; j++) {
    if (j === target) continue;
    const cj = leadCol(m[j], n);
    if (cj < 0 || m[target][cj].isZero()) continue;
    let score = cj === ct ? (j < target ? 300 : 200) : 100;
    score -= cj * 5;
    const v = m[j][cj];
    if (v.isOne() || v.neg().isOne()) score += 2;
    if (score > bestScore) { bestScore = score; best = j; }
  }
  if (best >= 0) return best;
  for (let j = 0; j < m.length; j++) if (j !== target && leadCol(m[j], n) >= 0) return j;
  return target === 0 ? 1 : 0;
}

/** The multiplier that makes the row's pivot 1 (1 / pivot), or null for a row with no pivot. */
export function suggestScaleK(m: FMat, row: number, n: number): Frac | null {
  const c = leadCol(m[row], n);
  return c < 0 ? null : m[row][c].inv();
}

/** The operation that undoes op. */
export function inverseOp(op: RowOp): RowOp {
  if (op.kind === 'swap') return { ...op };
  if (op.kind === 'scale') return { kind: 'scale', i: op.i, k: op.k.inv() };
  return { kind: 'add', i: op.i, j: op.j, k: op.k.neg() };
}

/** Why an operation cannot be applied (plain words), or null if it is fine. */
export function opProblem(op: RowOp, rows: number): string | null {
  const bad = (i: number) => !Number.isInteger(i) || i < 0 || i >= rows;
  if (bad(op.i) || (op.kind !== 'scale' && bad(op.j))) return 'Pick a row of this matrix.';
  if (op.kind === 'swap') return op.i === op.j ? 'Pick two different rows to swap.' : null;
  if (op.kind === 'scale') {
    if (op.k.isZero()) return 'Multiplying a row by 0 is not a row operation: it erases the equation.';
    if (op.k.isOne()) return 'Multiplying by 1 leaves the row as it is.';
    return null;
  }
  if (op.i === op.j) return 'Pick a different row to add.';
  if (op.k.isZero()) return 'Adding 0 times a row leaves the row as it is.';
  return null;
}

/**
 * The row order after a change: next[i] holds the row that was at prev[i]'s position perm[i].
 * Returns null when next is not a reordering of prev's rows (some row changed).
 */
export function rowPermutation(prev: FMat, next: FMat): number[] | null {
  if (prev.length !== next.length) return null;
  const same = (a: Frac[], b: Frac[]) => a.length === b.length && a.every((x, c) => x.eq(b[c]));
  const used = new Array(prev.length).fill(false);
  const perm: number[] = [];
  for (let i = 0; i < next.length; i++) {
    let pick = -1;
    if (!used[i] && same(prev[i], next[i])) pick = i;
    else for (let j = 0; j < prev.length; j++) if (!used[j] && same(prev[j], next[i])) { pick = j; break; }
    if (pick < 0) return null;
    used[pick] = true;
    perm.push(pick);
  }
  return perm;
}

/** Default unknown names: x, y, z for up to three, x₁ … xₙ beyond. */
export function defaultNames(n: number): string[] {
  return n <= 3 ? ['x', 'y', 'z'].slice(0, n) : Array.from({ length: n }, (_, i) => `x_{${i + 1}}`);
}

/** A linear expression in TeX: coefficients times names plus a constant, e.g. "3 - 2z". */
export function linTex(coefs: Frac[], names: string[], constant: Frac = Frac.ZERO): string {
  const parts: { neg: boolean; body: string }[] = [];
  if (!constant.isZero()) parts.push({ neg: constant.sign() < 0, body: (constant.sign() < 0 ? constant.neg() : constant).toTex() });
  coefs.forEach((k, c) => {
    if (k.isZero()) return;
    const neg = k.sign() < 0;
    const mag = neg ? k.neg() : k;
    parts.push({ neg, body: `${mag.isOne() ? '' : mag.toTex()}${names[c]}` });
  });
  if (!parts.length) return '0';
  return parts.map((p, i) => (i === 0 ? `${p.neg ? '-' : ''}${p.body}` : ` ${p.neg ? '-' : '+'} ${p.body}`)).join('');
}

/** One row of [A | b] as an equation in TeX: "2x + y = 4". */
export function eqTex(row: Frac[], n: number, names: string[] = defaultNames(n)): string {
  return `${linTex(row.slice(0, n), names)} = ${row[n].toTex()}`;
}

export type Reading =
  | { kind: 'unique'; tex: string }
  | { kind: 'infinite'; free: number[]; tex: string }
  | { kind: 'none'; row: number; tex: string }
  | { kind: 'not-yet' };

/**
 * What the matrix says about the solutions, once it can be read: a row 0 = c (c ≠ 0) can be read at
 * any time; otherwise the matrix must be in reduced row echelon form.
 */
export function readSolution(m: FMat, n: number, names: string[] = defaultNames(n)): Reading {
  for (let r = 0; r < m.length; r++) {
    if (leadCol(m[r], n) === -1 && !m[r][n].isZero()) return { kind: 'none', row: r, tex: `0 = ${m[r][n].toTex()}` };
  }
  if (!isRREF(m, n)) return { kind: 'not-yet' };
  const cl = classify(m, n);
  if (cl.kind === 'unique') return { kind: 'unique', tex: cl.x.map((v, i) => `${names[i]} = ${v.toTex()}`).join(',\\quad ') };
  if (cl.kind === 'none') return { kind: 'none', row: cl.badRow, tex: `0 = ${m[cl.badRow][n].toTex()}` };
  const parts: string[] = [];
  for (const row of m) {
    const pc = leadCol(row, n);
    if (pc < 0) continue;
    const coefs = row.slice(0, n).map((x, c) => (cl.free.includes(c) ? x.neg() : Frac.ZERO));
    parts.push(`${names[pc]} = ${linTex(coefs, names, row[n])}`);
  }
  return { kind: 'infinite', free: cl.free, tex: parts.join(',\\quad ') };
}

/** Lead (pivot) positions [row, col] of a matrix in row echelon form. */
export function pivotCells(m: FMat, n: number): [number, number][] {
  const out: [number, number][] = [];
  m.forEach((row, r) => { const c = leadCol(row, n); if (c >= 0) out.push([r, c]); });
  return out;
}
