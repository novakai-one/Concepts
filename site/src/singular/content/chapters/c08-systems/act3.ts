// Act III (The Ledger) shared maths: plain numbers and exact fractions, no DOM, no three.
// Chapters 8, 9 and 10 build their win checks, Doubt predicates and Law cases on these.
// Unit-tested in tests/singular/game-c08.test.ts, game-c09.test.ts and game-c10.test.ts.
import { Frac, fmat, type FMat } from '../../../math/frac.ts';
import { classify, isREF, leadCol, pivotCols, rref, type Classification, type RowOp } from '../../../math/rref.ts';

/** An augmented matrix [A | b] as plain numbers: each row is [a₁ … aₙ, b]. */
export type Aug = number[][];
export type Diff = 'cadet' | 'navigator' | 'commander';

/** Win tolerance by difficulty (GDD §7.1). */
export const winTol = (d: Diff): number => (d === 'commander' ? 0.01 : 0.05);
/**
 * How close the Ch 8 marker must be for a plane to light (GDD Ch 8: within 0.1 on cadet). The marker
 * puzzles (c08-p2, c08-p3) also win at this distance, so a lit plane, "on it" and "✓ all 3" always count.
 * Cadet's 0.1 is §7.1's tolerance for a typed point; a dragged cadet marker snaps to whole numbers, and
 * no whole-number point other than an exact one comes within 0.1 of those planes.
 */
export const glowTol = (d: Diff): number => (d === 'cadet' ? 0.1 : winTol(d));

export const dot = (a: number[], b: number[]): number => a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);
export const sub = (a: number[], b: number[]): number[] => a.map((x, i) => x - b[i]);
export const add = (a: number[], b: number[]): number[] => a.map((x, i) => x + b[i]);
export const scale = (a: number[], k: number): number[] => a.map((x) => x * k);
export const len = (a: number[]): number => Math.sqrt(dot(a, a));
export const dist = (a: number[], b: number[]): number => len(sub(a, b));
export const near = (a: number[], b: number[], tol: number): boolean => dist(a, b) <= tol;
export const cross = (a: number[], b: number[]): number[] => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Number of unknowns in an augmented matrix. */
export const unknowns = (m: Aug): number => (m[0]?.length ?? 1) - 1;

/** How far off each equation is at x: (a · x) − b, one number per row (the Ch 8 build `check`). */
export function residuals(rows: Aug, x: number[]): number[] {
  return rows.map((r) => dot(r.slice(0, -1), x) - r[r.length - 1]);
}

/** Distance from x to the line / plane of one row; Infinity when the row reads 0 = c (c ≠ 0), 0 for 0 = 0. */
export function distToRow(row: number[], x: number[]): number {
  const a = row.slice(0, -1);
  const l = len(a);
  const r = dot(a, x) - row[row.length - 1];
  if (l < 1e-12) return Math.abs(r) < 1e-12 ? 0 : Infinity;
  return Math.abs(r) / l;
}

/** True when x lies on every line / plane, within tol. */
export const onAll = (rows: Aug, x: number[], tol = 1e-6): boolean => rows.every((r) => distToRow(r, x) <= tol);

/** Exact classification of the solutions of [A | b]. */
export function classifyAug(m: Aug | FMat): Classification {
  const f = fmat(m as (number | Frac)[][]);
  return classify(f, f[0].length - 1);
}

export type Kind = 'one' | 'many' | 'none';
export function kindOf(m: Aug): Kind {
  const c = classifyAug(m);
  return c.kind === 'unique' ? 'one' : c.kind === 'infinite' ? 'many' : 'none';
}

/** The non-zero rows of the reduced row echelon form of [A | b] (pivots may fall in the right-hand column). */
function reducedRows(m: Aug | FMat): string[] {
  const f = fmat(m as (number | Frac)[][]);
  return rref(f).filter((r) => r.some((x) => !x.isZero())).map((r) => r.map(String).join(','));
}

/**
 * True when two augmented matrices (same number of unknowns) have the same solutions.
 * Both empty, or the same reduced rows (reduced row echelon form is unique).
 */
export function sameSolutions(a: Aug | FMat, b: Aug | FMat): boolean {
  const ka = classifyAug(a).kind, kb = classifyAug(b).kind;
  if (ka === 'none' || kb === 'none') return ka === kb;
  const ra = reducedRows(a), rb = reducedRows(b);
  return ra.length === rb.length && ra.every((r, i) => r === rb[i]);
}

/** Number of solutions as a count: 0, 1 or Infinity. A linear system never has exactly 2. */
export function solutionCount(m: Aug): number {
  const k = kindOf(m);
  return k === 'none' ? 0 : k === 'one' ? 1 : Infinity;
}

/** A solution point (the unique one, or the particular one with free unknowns 0); null when none. */
export function somePoint(m: Aug): number[] | null {
  const c = classifyAug(m);
  if (c.kind === 'none') return null;
  return (c.kind === 'unique' ? c.x : c.particular).map((v) => v.value());
}

/** Directions of the solution set (one per free unknown); empty for one or no solution. */
export function directions(m: Aug): number[][] {
  const c = classifyAug(m);
  return c.kind === 'infinite' ? c.directions.map((d) => d.map((v) => v.value())) : [];
}

/** Pivot columns of a matrix that is in row echelon form (coefficient columns only). */
export function pivotPositions(m: Aug | FMat, n = unknowns(m as Aug)): number[] {
  return pivotCols(fmat(m as (number | Frac)[][]), n);
}

export const isStaircase = (m: Aug | FMat, n = unknowns(m as Aug)): boolean => isREF(fmat(m as (number | Frac)[][]), n);

/** Row [0 … 0 | c] with c ≠ 0 somewhere in the matrix (it reads 0 = c). */
export function hasFalseRow(m: Aug | FMat): boolean {
  const f = fmat(m as (number | Frac)[][]);
  const n = f[0].length - 1;
  return f.some((r) => leadCol(r, n) === -1 && !r[n].isZero());
}

/** Apply a row operation to plain numbers (exactly, through fractions). */
export function applyOpNum(m: Aug, op: RowOp): Aug {
  const a = m.map((r) => r.slice());
  if (op.kind === 'swap') [a[op.i], a[op.j]] = [a[op.j], a[op.i]];
  else if (op.kind === 'scale') a[op.i] = a[op.i].map((x) => x * op.k.value());
  else a[op.i] = a[op.i].map((x, c) => x + op.k.value() * a[op.j][c]);
  return a;
}

/** Is a number a whole number (for the "no fractions" stars)? */
export const whole = (x: number): boolean => Math.abs(x - Math.round(x)) < 1e-9;
export const allWhole = (m: Aug | FMat): boolean => (m as (number | Frac)[][]).every((r) => r.every((x) => (typeof x === 'number' ? whole(x) : x.isInt())));

/** Plain-text number with a true minus sign and simple fractions: "−3/2", "4". */
export function num(x: number, maxDen = 60): string {
  if (Math.abs(x) < 1e-9) return '0';
  const f = Frac.from(x, maxDen);
  const s = Math.abs(f.value() - x) < 1e-9 ? f.toString() : x.toFixed(2);
  return s.replace('-', '−');
}
export const pt = (v: number[]): string => `(${v.map((x) => num(x)).join(', ')})`;

/** A row as an equation in TeX, e.g. "x + 2y - z = 4". Names default to x, y, z. */
export function rowTex(row: number[], names = ['x', 'y', 'z']): string {
  const n = row.length - 1;
  const parts: string[] = [];
  for (let c = 0; c < n; c++) {
    const k = row[c];
    if (Math.abs(k) < 1e-12) continue;
    const mag = Math.abs(k);
    const coef = Math.abs(mag - 1) < 1e-12 ? '' : texNum(mag);
    const sign = k < 0 ? '-' : '+';
    parts.push(parts.length ? ` ${sign} ${coef}${names[c]}` : `${k < 0 ? '-' : ''}${coef}${names[c]}`);
  }
  return `${parts.join('') || '0'} = ${texNum(row[n])}`;
}

export function texNum(x: number): string {
  if (Math.abs(x) < 1e-9) return '0';
  const f = Frac.from(x, 60);
  if (Math.abs(f.value() - x) > 1e-9) return x.toFixed(2);
  return f.toTex();
}

// ------------------------------------------------------------------ seeded randomness (Doubts, Laws, swarms)

/** mulberry32: a small seeded generator for repeatable tests. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A whole number from lo to hi inclusive. */
export const randInt = (rng: () => number, lo: number, hi: number): number => lo + Math.floor(rng() * (hi - lo + 1));
/** A non-zero whole number from −r to r. */
export function randNZ(rng: () => number, r = 4): number {
  let k = 0;
  while (k === 0) k = randInt(rng, -r, r);
  return k;
}

/** A random m × (n + 1) augmented matrix with small whole entries. */
export function randAug(rng: () => number, m: number, n: number, r = 4): Aug {
  return Array.from({ length: m }, () => Array.from({ length: n + 1 }, () => randInt(rng, -r, r)));
}

/** A random m × n system with a known solution x0 (so it is consistent): rows a and b = a · x0. */
export function randConsistent(rng: () => number, m: number, n: number, rank = Math.min(m, n), r = 3): { aug: Aug; x0: number[] } {
  const x0 = Array.from({ length: n }, () => randInt(rng, -3, 3));
  const base: number[][] = [];
  for (let i = 0; i < rank; i++) {
    let row: number[];
    do { row = Array.from({ length: n }, () => randInt(rng, -r, r)); } while (row.every((x) => x === 0));
    base.push(row);
  }
  const rows: number[][] = [];
  for (let i = 0; i < m; i++) {
    if (i < rank) rows.push(base[i].slice());
    else {
      // a combination of the base rows (keeps the rank)
      const ks = base.map(() => randInt(rng, -2, 2));
      rows.push(base[0].map((_, c) => base.reduce((s, b, j) => s + ks[j] * b[c], 0)));
    }
  }
  return { aug: rows.map((a) => [...a, dot(a, x0)]), x0 };
}
