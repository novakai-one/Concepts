// Chapter 10 pure logic: puzzle numbers, win checks, the Act III set piece, Doubt and Review predicates,
// the Law core, and the crew versions of rref / solve / reachable. No DOM, no three.
// Unit-tested in tests/singular/game-c10.test.ts.
import { Frac, fmat, type FMat } from '../../../math/frac.ts';
import { isRREF, leadCol, pivotCols, rref } from '../../../math/rref.ts';
import { rrefNum } from '../../../math/la.ts';
import type { LawCore } from '../../../game/lawcheck.ts';
import {
  add, classifyAug, cross, dist, dot, kindOf, len, onAll, randConsistent, randInt, randNZ, sameSolutions, scale, sub,
  type Aug,
} from '../c08-systems/act3.ts';

// ------------------------------------------------------------------ puzzle numbers (GDD §6.5, Ch 10)

/** p1: Ch 9's staircase, finished to [I | (1, 2, 3)] in 3 steps. */
export const P1 = { aug: [[1, 2, 1, 8], [0, 1, 2, 8], [0, 0, 1, 3]] as Aug, done: [[1, 0, 0, 1], [0, 1, 0, 2], [0, 0, 1, 3]] as Aug, par: 3 };
export const p1Won = (m: Aug | FMat): boolean => isRREF(fmat(m as (number | Frac)[][]), 3) && sameSolutions(m, P1.aug);

/** p2: flows x₁ − x₂ = 2, x₂ − x₃ = 1, x₁ − x₃ = 3: solutions (3 + t, 1 + t, t). */
export const P2 = {
  aug: [[1, -1, 0, 2], [0, 1, -1, 1], [1, 0, -1, 3]] as Aug, particular: [3, 1, 0], dir: [1, 1, 1], free: 2, par: 3, max: 5,
  /** The free dial. It starts at t = −1 (pipe 3 below 0), on every difficulty's step grid; the nearest legal t is 0, the least load. */
  dial: { start: -1, min: -2, max: 4, step: { cadet: 1, navigator: 0.5, commander: 0.25 } as Record<string, number> },
};
export const flowsAt = (t: number): number[] => add(P2.particular, scale(P2.dir, t));
export const pipesOk = (t: number, max = P2.max): boolean => flowsAt(t).every((f) => f >= -1e-9 && f <= max + 1e-9);
export const totalLoad = (t: number): number => flowsAt(t).reduce((s, x) => s + x, 0);
/** Columns without a pivot in reduced row echelon form (the free columns). */
export const freeColumns = (m: Aug): number[] => {
  const f = fmat(m), n = f[0].length - 1;
  const piv = pivotCols(rref(f, n), n);
  return [...Array(n).keys()].filter((c) => !piv.includes(c));
};

/** p3: the lying meter: meter three reads 4. Consistent exactly when b₃ = b₁ + b₂. */
export const P3 = { b: [2, 1, 4] };
export const p3Rows = (b: number[]): Aug => [[1, -1, 0, b[0]], [0, 1, -1, b[1]], [1, 0, -1, b[2]]];
export const p3Consistent = (b: number[]): boolean => kindOf(p3Rows(b)) !== 'none';
/** The meter buttons, in the order the readout lists them: meter one −, +, meter two −, +, meter three −, +. Readings stay in 0..6. */
export const p3Press = (b: number[], i: number): number[] => b.map((x, k) => (k === i >> 1 ? Math.max(0, Math.min(6, x + (i % 2 ? 1 : -1))) : x));
/**
 * p3's Show me, from any readings: the buttons to press so that b₃ = b₁ + b₂. If b₁ + b₂ fits on meter three (at most 6),
 * step meter three to it; otherwise first step meter one down to max(0, b₃ − b₂), then meter three if still needed.
 */
export function p3Presses(start: number[]): number[] {
  let b = start.slice();
  const out: number[] = [];
  const press = (i: number) => { out.push(i); b = p3Press(b, i); };
  if (b[0] + b[1] > 6) { const want = Math.max(0, b[2] - b[1]); while (b[0] > want) press(0); }
  while (b[2] !== b[0] + b[1]) press(b[2] > b[0] + b[1] ? 4 : 5);
  return out;
}

/** p4 [H]: x + 2y − z = 4: (4, 0, 0) + s(−2, 1, 0) + t(1, 0, 1). Three marked points. */
export const P4 = {
  row: [1, 2, -1, 4], p: [4, 0, 0], d1: [-2, 1, 0], d2: [1, 0, 1],
  targets: [[2, 1, 0], [6, 0, 2], [0, 1, -2]], dials: [[1, 0], [0, 2], [1, -2]],
};

/**
 * Par where typed or picked steps count a move (each checked worksheet line, a tile-order submit, the column pick).
 * p2: the board's 3 steps, plus the column pick (navigator) or the worksheet's last line (commander), plus one dial drag.
 *     Fewest moves: cadet 4, navigator 5, commander 5.
 * p4: four single-dial changes visit (1, 0), (0, 2), (1, −2) from (0, 0); navigator also checks 3 typed lines, commander 1.
 *     Fewest moves: cadet 4, navigator 7, commander 5.
 * p6: one drag; navigator checks 3 typed lines; commander submits the tiles and checks 1 typed line.
 *     Fewest moves: cadet 1, navigator 4, commander 3.
 */
export const PAR = { p2: P2.par + 2, p4: 7, p6: 4 };
export const p4Point = (s: number, t: number): number[] => add(P4.p, add(scale(P4.d1, s), scale(P4.d2, t)));

/** p5 [H]: [1 1 1 | 1], [1 2 3 | 2], [1 3 k | m] → [0 0 (k − 5) | (m − 3)]. */
export const p5Rows = (k: number, m: number): Aug => [[1, 1, 1, 1], [1, 2, 3, 2], [1, 3, k, m]];
export const p5Reduced = (k: number, m: number): number[] => [0, 0, k - 5, m - 3];

/** p6 [D]: the same flows with zeros on the right: the line t(1, 1, 1) through the origin. */
export const P6 = { aug: [[1, -1, 0, 0], [0, 1, -1, 0], [1, 0, -1, 0]] as Aug, particular: [3, 1, 0] };
/** Distance from q to p2's line of solutions. */
export const distToP2Line = (q: number[]): number => len(cross(sub(q, P2.particular), P2.dir)) / len(P2.dir);
export const p6Won = (tip: number[], tol: number): boolean => distToP2Line(tip) <= tol;

// ------------------------------------------------------------------ the Act III set piece: power to the pod bay

export const SP = {
  rows: (m: number): Aug => [[1, 1, 1, 1], [1, 2, 3, 2], [1, 3, 5, m]],
  m: 3,
  flows: (t: number): number[] => [t, 1 - 2 * t, t],
  /** The drone's two thrusters (Act I) and the pod-bay door: the triangle P, Q, R of Act II. */
  u: [1, 0, 1], w: [0, 1, 1],
  door: { P: [1, 0, 0], Q: [0, 2, 0], R: [0, 0, 3], n: [6, 3, 2], d: 6, centre: [1 / 3, 2 / 3, 1] },
};
export const spConsistent = (m: number): boolean => kindOf(SP.rows(m)) !== 'none';
export const spFlowsOk = (t: number): boolean => SP.flows(t).every((f) => f >= -1e-9 && f <= 1 + 1e-9);
export const spBurn = (a: number, b: number): number[] => add(scale(SP.u, a), scale(SP.w, b));
/** Where the straight path s·burn (s > 0) from the drone at the origin meets the door's plane; null if it never does. */
export function spHit(a: number, b: number): number[] | null {
  const d = spBurn(a, b);
  const k = dot(SP.door.n, d);
  if (k <= 1e-12) return null;
  return scale(d, SP.door.d / k);
}
export const spDroneWon = (a: number, b: number, tol: number): boolean => { const h = spHit(a, b); return !!h && dist(h, SP.door.centre) <= tol; };

// ------------------------------------------------------------------ the Doubts

/** (F) "Three equations in three unknowns always have exactly one answer." */
export const oneAnswerHolds = (rows: Aug): boolean => kindOf(rows) === 'one';
export const D_ONE_START: Aug = [[1, 1, 1, 6], [0, 2, 5, -4], [2, 5, -1, 27]];
export const D_ONE_COUNTER: Aug = [[1, 1, 1, 3], [1, -1, 0, 1], [2, 0, 1, 5]];
export function oneRandom(r: () => number, edge = -1): Aug {
  if (edge === 0) return D_ONE_COUNTER.map((x) => x.slice());
  if (edge === 1) return [[1, 1, 1, 3], [1, -1, 0, 1], [2, 0, 1, 4]];
  let m: Aug;
  do { m = randConsistent(r, 3, 3).aug; } while (kindOf(m) !== 'one');
  return m;
}

/** Zero rows of the reduced row echelon form of [A | b] (pivots may fall in the right-hand column). */
export const zeroRows = (m: Aug): number => rref(fmat(m)).filter((r) => r.every((x) => x.isZero())).length;
export const freeCount = (m: Aug): number => freeColumns(m).length;
/** (F) "Free variables come from zero rows." As a count: as many free variables as zero rows. */
export const freeFromZeroHolds = (m: Aug): boolean => freeCount(m) === zeroRows(m);
export const D_FREE_START: Aug = [[1, -1, 0, 2], [0, 1, -1, 1], [1, 0, -1, 3]];
export const D_FREE_COUNTER: Aug = [[1, 0, 2, 1], [0, 1, 3, 2]];
export function freeRandom(r: () => number, edge = -1): Aug {
  if (edge === 0) return D_FREE_COUNTER.map((x) => x.slice());
  return randConsistent(r, 3, 3, randInt(r, 2, 3)).aug;
}

/** Is there a pivot in the right-hand column (a row 0 = c, c ≠ 0, after reducing everything)? */
export const rhsPivot = (m: Aug): boolean => {
  const R = rref(fmat(m));
  const n = R[0].length - 1;
  return R.some((row) => leadCol(row) === n);
};
/** (T) "If the right-hand column has a pivot, there is no solution." */
export const rhsPivotHolds = (m: Aug): boolean => !rhsPivot(m) || kindOf(m) === 'none';
export const D_RHS_START: Aug = [[1, -1, 0, 2], [0, 1, -1, 1], [1, 0, -1, 4]];
export function rhsRandom(r: () => number, edge = -1): Aug {
  // the curated case, on the doubt's 3 × 4 board: x + 2y = 3 and 2x + 4y = 7 are parallel, z = 1
  if (edge === 0) return [[1, 2, 0, 3], [2, 4, 0, 7], [0, 0, 1, 1]];
  if (r() < 0.5) return randConsistent(r, 3, 3, randInt(r, 1, 3)).aug;
  const m = randConsistent(r, 3, 3, 2).aug;
  m[2][3] += randNZ(r, 3);
  return m;
}

// ------------------------------------------------------------------ the Act III Review (Bram)

/** R1 (F) "More unknowns than equations always means infinitely many solutions." */
export const r1Holds = (rows: Aug): boolean => kindOf(rows) === 'many';
export const R1_START: Aug = [[1, 1, 1, 3], [1, -1, 2, 2]];
export const R1_COUNTER: Aug = [[1, 1, 1, 1], [2, 2, 2, 5]];
export function r1Random(r: () => number, edge = -1): Aug {
  if (edge === 0) { const a = [randNZ(r, 3), randInt(r, -3, 3), randInt(r, -3, 3)], k = randNZ(r, 2); return [[...a, 1], [...scale(a, k), k + randNZ(r, 3)]]; }
  let m: Aug;
  do { m = [[randInt(r, -3, 3), randInt(r, -3, 3), randNZ(r, 3), randInt(r, -4, 4)], [randInt(r, -3, 3), randNZ(r, 3), randInt(r, -3, 3), randInt(r, -4, 4)]]; } while (len(cross(m[0].slice(0, 3), m[1].slice(0, 3))) < 1e-9);
  return m;
}

/** R2 (F) "A system can have exactly two solutions." The scene: a system, two solutions A, B, and C = A + t(B − A). */
export interface TwoCase { rows: Aug; A: number[]; B: number[]; t: number }
const C2 = (c: TwoCase) => add(c.A, scale(sub(c.B, c.A), c.t));
/** The claim survives until a third, different point solves the system. */
export const r2Holds = (c: TwoCase): boolean => {
  const C = C2(c);
  const third = onAll(c.rows, C, 1e-9) && dist(C, c.A) > 1e-6 && dist(C, c.B) > 1e-6;
  return !third;
};
export const R2_START: TwoCase = { rows: [[1, 1, 1, 3], [1, -1, 0, 1], [2, 0, 1, 4]], A: [1, 0, 2], B: [2, 1, 0], t: 0 };
export function r2Random(r: () => number): TwoCase {
  let d: number[];
  do { d = [randInt(r, -2, 2), randInt(r, -2, 2), randInt(r, -2, 2)]; } while (len(d) < 1e-9);
  const p0 = [randInt(r, -2, 2), randInt(r, -2, 2), randInt(r, -2, 2)];
  const rows: Aug = [];
  while (rows.length < 2) {
    const u = [randInt(r, -2, 2), randInt(r, -2, 2), randInt(r, -2, 2)];
    const n = cross(d, u);
    if (len(n) < 1e-9 || (rows.length && len(cross(n, rows[0].slice(0, 3))) < 1e-9)) continue;
    rows.push([...n, dot(n, p0)]);
  }
  rows.push(add(rows[0], rows[1]));
  const A = add(p0, scale(d, randInt(r, -1, 0))), B = add(A, scale(d, randInt(r, 1, 2)));
  return { rows, A, B, t: [-0.5, 0.5, 1.5, 2][randInt(r, 0, 3)] };
}

/** R3 (F) "Multiplying a row by a negative number changes the answer." */
export const r3Holds = (m: Aug, i: number, k: number): boolean => !sameSolutions(m, m.map((row, q) => (q === i ? row.map((x) => x * k) : row.slice())));
export const R3_START: Aug = [[2, 1, 4], [1, -1, -1]];
export function r3Random(r: () => number): { m: Aug; i: number; k: number } {
  let m: Aug;
  do { m = randConsistent(r, 2, 2).aug; } while (kindOf(m) !== 'one');
  return { m, i: randInt(r, 0, 1), k: -[0.5, 1, 1.5, 2, 3][randInt(r, 0, 4)] };
}

/** R4 (T) "Three equations in three unknowns can have no solution." A demonstration: a 3 × 3 system with none. */
export const r4Holds = (rows: Aug): boolean => rows.length === 3 && rows[0].length === 4 && kindOf(rows) === 'none';
export const R4_START: Aug = [[1, 1, 1, 3], [1, -1, 0, 1], [2, 0, 1, 4]];
export const R4_SHOW: Aug = [[1, 1, 1, 3], [1, -1, 0, 1], [2, 0, 1, 5]];
/** The Shake keeps the construction's shape (row 3's left side = row 1's + row 2's, its right side off) with new numbers. */
export function r4Random(r: () => number, edge = -1): Aug {
  if (edge === 0) { const a = [randNZ(r, 2), randInt(r, -2, 2), randInt(r, -2, 2)]; return [[...a, 1], [...a, 2], [...a, 3]]; }
  let a: number[], b: number[];
  do { a = [randInt(r, -3, 3), randInt(r, -3, 3), randInt(r, -3, 3)]; b = [randInt(r, -3, 3), randInt(r, -3, 3), randInt(r, -3, 3)]; } while (len(cross(a, b)) < 1e-9);
  const ra = randInt(r, -4, 4), rb = randInt(r, -4, 4);
  return [[...a, ra], [...b, rb], [...add(a, b), ra + rb + randNZ(r, 3)]];
}

// ------------------------------------------------------------------ the Law

export interface C10Case { aug: Aug; note: string }
export const LAW_C10: LawCore<C10Case> & { answer: Record<string, string> } = {
  id: 'c10-law',
  answer: { count: 'nopivot' },
  gen: (r) => {
    const m = randInt(r, 1, 4), n = randInt(r, 2, 4);
    const aug = randConsistent(r, m, n, randInt(r, 1, Math.min(m, n))).aug;
    return { aug, note: `${m} equation${m > 1 ? 's' : ''} in ${n} unknowns` };
  },
  edgeCases: [
    { aug: [[1, 0, 2, 1], [0, 1, 3, 2]], note: '2 equations in 3 unknowns, no zero row' },
    { aug: [[1, 2, 3], [2, 4, 6], [3, 6, 9]], note: '3 equations in 2 unknowns, all the same line' },
    { aug: [[1, -1, 0, 2], [0, 1, -1, 1], [1, 0, -1, 3]], note: 'the pod bay flows' },
    { aug: [[1, 2, -1, 4]], note: 'one equation in 3 unknowns' },
    { aug: [[1, 0, 1], [0, 1, 2], [1, 1, 3]], note: '3 equations in 2 unknowns, one point' },
  ],
  holds(f, c) {
    const free = freeCount(c.aug);
    const n = c.aug[0].length - 1;
    if (f.count === 'nopivot') return free === n - pivotCols(rref(fmat(c.aug), n), n).length;
    if (f.count === 'zerorows') return free === zeroRows(c.aug);
    if (f.count === 'diff') return free === n - c.aug.length;
    return false;
  },
  describe: (c) => {
    const n = c.aug[0].length - 1;
    return `${c.note}: ${freeCount(c.aug)} free variable${freeCount(c.aug) === 1 ? '' : 's'}, ${zeroRows(c.aug)} zero row${zeroRows(c.aug) === 1 ? '' : 's'}, ${n - pivotCols(rref(fmat(c.aug), n), n).length} column${n - pivotCols(rref(fmat(c.aug), n), n).length === 1 ? '' : 's'} without a pivot`;
  },
};

// ------------------------------------------------------------------ builds: rref(M), solve(M), reachable(v, w, target)

/** rref(M): the reduced row echelon form of the whole matrix (the right-hand column may hold a pivot). */
export function rrefCrew(M: number[][]): number[][] {
  return rrefNum(M, 1e-9).R.map((r) => r.map((x) => (Math.abs(x) < 1e-9 ? 0 : x)));
}

export interface Solved { kind: 'none' | 'one' | 'many'; point: number[] | null; directions: number[][] }
/** solve(M): none, one or many; the point has every free unknown 0; one direction per free unknown (that unknown 1). */
export function solveCrew(M: number[][]): Solved {
  const n = M[0].length - 1;
  const { R, pivots } = rrefNum(M, 1e-9);
  if (pivots.includes(n)) return { kind: 'none', point: null, directions: [] };
  const point = new Array(n).fill(0);
  pivots.forEach((pc, i) => { point[pc] = R[i][n]; });
  const free = [...Array(n).keys()].filter((c) => !pivots.includes(c));
  const directions = free.map((f) => {
    const d = new Array(n).fill(0);
    d[f] = 1;
    pivots.forEach((pc, i) => { d[pc] = -R[i][f]; });
    return d;
  });
  const clean = (v: number[]) => v.map((x) => (Math.abs(x) < 1e-9 ? 0 : x));
  return { kind: free.length ? 'many' : 'one', point: clean(point), directions: directions.map(clean) };
}

/** reachable(v, w, target), rebuilt on solve: the weights [a, b] (free weight 0), or null. */
export function reachableCrew(v: number[], w: number[], target: number[]): number[] | null {
  const s = solveCrew(v.map((_, i) => [v[i], w[i], target[i]]));
  return s.kind === 'none' ? null : s.point;
}

export { classifyAug, kindOf, isRREF };
