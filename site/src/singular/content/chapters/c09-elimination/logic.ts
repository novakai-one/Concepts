// Chapter 9 pure logic: puzzle numbers, win checks, Doubt predicates, the Law core, and the row
// machine that runs the player's Procedure literally. No DOM, no three (tests/singular/game-c09.test.ts).
import { Frac, fmat, type FMat } from '../../../math/frac.ts';
import { applyOp, gaussSteps, isREF, leadCol, type RowOp } from '../../../math/rref.ts';
import type { LawCore } from '../../../game/lawcheck.ts';
import {
  kindOf, onAll, pivotPositions, randConsistent, randInt, randNZ, sameSolutions, isStaircase, allWhole, num, type Aug,
} from '../c08-systems/act3.ts';

// ------------------------------------------------------------------ puzzle numbers (GDD §6.5, Ch 9)

/** p1 / p6: the power board. Staircase in 3 steps: R2 − 2R1, R3 − R1, R3 − R2. Generators (1, 2, 3). */
export const P1 = {
  aug: [[1, 2, 1, 8], [2, 5, 4, 24], [1, 3, 4, 19]] as Aug,
  staircase: [[1, 2, 1, 8], [0, 1, 2, 8], [0, 0, 1, 3]] as Aug,
  answer: [1, 2, 3],
  par: 3,
};
/** p1's first subgoal: zeros under row 1's first number. */
export const firstColumnCleared = (m: Aug | FMat): boolean => {
  const f = fmat(m as (number | Frac)[][]);
  return !f[0][0].isZero() && f.slice(1).every((r) => r[0].isZero());
};
export const p1Won = (m: Aug | FMat): boolean => isStaircase(m, 3) && sameSolutions(m, P1.aug);

/** p2: back substitution on the staircase: z = 3, then y = 8 − 2·3 = 2, then x = 8 − 2·2 − 3 = 1. */
export function backSub(m: Aug): number[] | null {
  const n = m[0].length - 1;
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    const row = m[r];
    if (!row || Math.abs(row[r]) < 1e-12) return null;
    let s = row[n];
    for (let c = r + 1; c < n; c++) s -= row[c] * x[c];
    x[r] = s / row[r];
  }
  return x;
}

/** p3: row 1 starts with 0, so a swap comes first. Answer (1, 2, 1). */
export const P3 = { aug: [[0, 2, 1, 5], [1, 1, 1, 4], [2, 1, 0, 4]] as Aug, answer: [1, 2, 1], par: 3 };
export const p3Won = (m: Aug | FMat, typed: number[] | null): boolean => isStaircase(m, 3) && sameSolutions(m, P3.aug) && !!typed && typed.every((v, i) => Math.abs(v - P3.answer[i]) < 1e-9);

/** p4 [D]: the sandbox: 2x + y = 4, x − y = −1, meeting at (1, 2). */
export const P4 = { aug: [[2, 1, 4], [1, -1, -1]] as Aug, point: [1, 2] };
/** Forbidden: multiply a row by 0. */
export const scaleZero = (m: Aug, i: number): Aug => m.map((r, k) => (k === i ? r.map(() => 0) : r.slice()));
/** Forbidden: change one side of a row only. */
export const oneSide = (m: Aug, i: number, delta: number): Aug => m.map((r, k) => (k === i ? [...r.slice(0, -1), r[r.length - 1] + delta] : r.slice()));
/** Forbidden: swap two columns of the coefficient part. */
export const swapCols = (m: Aug, a: number, b: number): Aug => m.map((r) => { const s = r.slice(); [s[a], s[b]] = [s[b], s[a]]; return s; });
/** Legal: R_i → R_i + k R_j. */
export const addRow = (m: Aug, i: number, j: number, k: number): Aug => m.map((r, q) => (q === i ? r.map((x, c) => x + k * m[j][c]) : r.slice()));
/** The total k the sandbox has applied (row 1 never changes under the legal move; row 2's first entry is 1 + 2k). */
export const p4AppliedK = (m: Aug): number => (m[1][0] - P4.aug[1][0]) / P4.aug[0][0];
export const P4_FORBIDDEN = [
  { id: 'zero', label: 'Multiply row 2 by 0', apply: (m: Aug) => scaleZero(m, 1) },
  { id: 'side', label: 'Add 3 to row 1\'s right side only', apply: (m: Aug) => oneSide(m, 0, 3) },
  { id: 'cols', label: 'Swap the x and y columns', apply: (m: Aug) => swapCols(m, 0, 1) },
] as const;

/** p5 [H]: x + 2y = 3, 2x + ky = c. R2 − 2R1 = [0, k − 4 | c − 6]. */
export const p5Rows = (k: number, c: number): Aug => [[1, 2, 3], [2, k, c]];
export const p5Reduced = (k: number, c: number): number[] => [0, k - 4, c - 6];
export type P5Case = 'one' | 'many' | 'none';
export const p5Kind = (k: number, c: number): P5Case => kindOf(p5Rows(k, c));

/** p6 [H]: the row a typed operation should give (exact). */
export function expectedRow(m: Aug, op: RowOp): number[] {
  return applyOp(fmat(m), op)[op.i].map((x) => x.value());
}
/** p6 on Commander: only the final staircase is checked. */
export const p6Final = (m: Aug): boolean => isStaircase(m, 3) && sameSolutions(m, P1.aug);
export const noFractions = allWhole;

// ------------------------------------------------------------------ the Doubts

/** (F) "Swapping two rows changes the answer." Holds for a scene once a swap has been made and the answer changed. */
export const swapHolds = (orig: Aug, cur: Aug, swapped: boolean): boolean => !swapped || !sameSolutions(orig, cur);
export const D_SWAP_START: Aug = [[1, 1, 1, 6], [0, 2, 5, -4], [2, 5, -1, 27]];
/** A random system and a random swap of two of its rows. */
export function swapRandom(r: () => number, edge = -1): { orig: Aug; cur: Aug } {
  const orig = edge === 0 ? [[1, 1, 1, 3], [1, -1, 0, 1], [2, 0, 1, 5]] : randConsistent(r, 3, 3).aug;
  const i = randInt(r, 0, 2);
  let j = randInt(r, 0, 2);
  while (j === i) j = randInt(r, 0, 2);
  const cur = orig.map((x) => x.slice());
  [cur[i], cur[j]] = [cur[j], cur[i]];
  return { orig, cur };
}

/** (F) "Multiplying a row by any number keeps the solutions." Holds for (system, row, k) when the solutions stay the same. */
export const scaleRow = (m: Aug, i: number, k: number): Aug => m.map((r, q) => (q === i ? r.map((x) => x * k) : r.slice()));
export const scaleHolds = (m: Aug, i: number, k: number): boolean => sameSolutions(m, scaleRow(m, i, k));
export const D_SCALE_START: Aug = [[2, 1, 4], [1, -1, -1]];
export function scaleRandom(r: () => number, edge = -1): { m: Aug; i: number; k: number } {
  let m: Aug, x0: number[];
  // one meeting point, inside the doubt's frame (x from −3 to 5, y from −1.5 to 2.5)
  do { ({ aug: m, x0 } = randConsistent(r, 2, 2)); } while (kindOf(m) !== 'one' || x0[1] < -1.5 || x0[1] > 2.5);
  const ks = [-3, -2, -1, -0.5, 0.5, 2, 3];
  // always row 2: the Doubt's slider, readout and goal all name row 2 and its red line
  return { m, i: 1, k: edge === 0 ? 0 : ks[randInt(r, 0, ks.length - 1)] };
}

/** (T) "Two people can reach different row echelon forms and the same pivot positions." */
export const samePivots = (a: Aug | FMat, b: Aug | FMat): boolean => {
  const pa = pivotPositions(a, 3), pb = pivotPositions(b, 3);
  return pa.length === pb.length && pa.every((c, i) => c === pb[i]);
};
export const twoRefHolds = (mine: Aug | FMat, bram: Aug | FMat): boolean => !isStaircase(mine, 3) || samePivots(mine, bram);
/** Bram's route: the plain forward elimination (no scaling). */
export const bramRef = (m: Aug): FMat => gaussSteps(fmat(m), 3).states.at(-1)!;
/** A different route to a staircase: scale each row by a random non-zero number, eliminate, then add a random multiple of a lower row to a higher one. */
export function otherRef(m: Aug, r: () => number): FMat {
  let a = fmat(m).map((row) => { const k = randNZ(r, 3); return row.map((x) => x.mul(k)); });
  a = gaussSteps(a, 3).states.at(-1)!;
  // add a multiple of a lower row to a higher row: still a staircase, different numbers
  for (let i = 0; i < a.length - 1; i++) {
    const j = i + 1;
    if (leadCol(a[j], 3) >= 0) a = applyOp(a, { kind: 'add', i, j, k: new Frac(randNZ(r, 2)) });
  }
  return a;
}
export const D_REF_START: Aug = [[1, 2, 1, 8], [2, 5, 4, 24], [1, 3, 4, 19]];
export function refRandom(r: () => number, edge = -1): { m: Aug; mine: FMat } {
  const m = edge === 0 ? [[1, 1, 1, 3], [1, -1, 0, 1], [2, 0, 1, 4]] : edge === 1 ? [[0, 2, 1, 5], [1, 1, 1, 4], [2, 1, 0, 4]] : randConsistent(r, 3, 3).aug;
  return { m, mine: otherRef(m, r) };
}

// ------------------------------------------------------------------ the Law

export type LawOp = RowOp | { kind: 'scale0'; i: number };
export interface C09Case { aug: Aug; op: LawOp; note: string }

const opWords = (op: LawOp): string => op.kind === 'swap' ? `swap rows ${op.i + 1} and ${op.j + 1}`
  : op.kind === 'scale0' ? `multiply row ${op.i + 1} by 0`
  : op.kind === 'scale' ? `multiply row ${op.i + 1} by ${num(op.k.value())}`
  : `add ${num(op.k.value())} × row ${op.j + 1} to row ${op.i + 1}`;
export const applyLawOp = (m: Aug, op: LawOp): Aug => op.kind === 'scale0' ? scaleZero(m, op.i) : applyOp(fmat(m), op).map((r) => r.map((x) => x.value()));

function randOp(r: () => number, m: number): LawOp {
  const i = randInt(r, 0, m - 1);
  let j = randInt(r, 0, m - 1);
  while (j === i) j = randInt(r, 0, m - 1);
  const t = r();
  if (t < 0.15) return { kind: 'scale0', i };
  if (t < 0.4) return { kind: 'swap', i: Math.min(i, j), j: Math.max(i, j) };
  if (t < 0.65) return { kind: 'scale', i, k: new Frac(randNZ(r, 4), randInt(r, 1, 2)) };
  return { kind: 'add', i, j, k: new Frac(randNZ(r, 4), randInt(r, 1, 2)) };
}

export const LAW_C09: LawCore<C09Case> & { answer: Record<string, string> } = {
  id: 'c09-law',
  answer: { does: 'keeps', when: 'unless0' },
  gen: (r) => {
    const m = randInt(r, 2, 3), n = randInt(r, 2, 3);
    const aug = r() < 0.8 ? randConsistent(r, m, n).aug : Array.from({ length: m }, () => Array.from({ length: n + 1 }, () => randInt(r, -3, 3)));
    const op = randOp(r, m);
    return { aug, op, note: opWords(op) };
  },
  edgeCases: [
    { aug: [[1, 2, 1, 8], [2, 5, 4, 24], [1, 3, 4, 19]], op: { kind: 'scale0', i: 2 }, note: 'multiply row 3 by 0' },
    { aug: [[2, 1, 4], [1, -1, -1]], op: { kind: 'swap', i: 0, j: 1 }, note: 'swap rows 1 and 2' },
    { aug: [[2, 1, 4], [1, -1, -1]], op: { kind: 'add', i: 1, j: 0, k: new Frac(2) }, note: 'add 2 × row 1 to row 2' },
    { aug: [[1, 1, 3], [1, 1, 5]], op: { kind: 'scale', i: 1, k: new Frac(-1) }, note: 'multiply row 2 by −1 (the lines never meet)' },
  ],
  holds(f, c) {
    const keeps = sameSolutions(c.aug, applyLawOp(c.aug, c.op));
    const zero = c.op.kind === 'scale0';
    if (f.does === 'keeps') return f.when === 'always' ? keeps : zero || keeps;
    // "changes the solution set …"
    return f.when === 'always' ? !keeps : zero ? true : !keeps;
  },
  describe: (c) => {
    const after = applyLawOp(c.aug, c.op);
    const same = sameSolutions(c.aug, after);
    return `${c.note}: the solutions ${same ? 'stay the same' : 'change'} (${kindName(c.aug)} before, ${kindName(after)} after)`;
  },
};
const kindName = (m: Aug) => ({ one: 'one solution', many: 'infinitely many', none: 'no solution' })[kindOf(m)];

// ------------------------------------------------------------------ the Procedure: the row machine

export const PROC_TILES = [
  { id: 'find', text: 'FIND PIVOT: look at the entry in this row and this column', py: 'p = M[r][c]' },
  { id: 'swap0', text: 'SWAP IF ZERO: if that entry is 0, swap in a lower row that has a non-zero entry there', py: 'if M[r][c] == 0: swap(M, r, k)' },
  { id: 'clear', text: 'CLEAR BELOW: subtract multiples of this row so every entry below the pivot is 0', py: 'for i below r: M[i] -= (M[i][c] / M[r][c]) * M[r]' },
  { id: 'next', text: 'NEXT ROW AND COLUMN: move one row down and one column right, and repeat', py: 'r, c = r + 1, c + 1' },
  { id: 'back', text: 'BACK SUBSTITUTE FROM THE BOTTOM: solve the last row, then climb', py: 'x = back_sub(M)' },
];
export const PROC_DECOYS = [
  { id: 'scale0', text: 'TIDY UP: multiply the pivot row by 0', py: 'M[r] = [0 * a for a in M[r]]' },
  { id: 'colswap', text: 'SWAP COLUMNS: swap this column with the next one', py: 'swap_columns(M, c, c + 1)' },
  { id: 'top', text: 'READ FROM THE TOP DOWN: solve the first row first', py: 'x = read_top_down(M)' },
];
export const PROC_REFERENCE = ['find', 'swap0', 'clear', 'next', 'back'];
/** The key steps (K1–K3): dropping any one of these must fail on the test case. */
export const PROC_KEYS = ['swap0', 'clear', 'back'];
/** The test case LANTERN runs: p3's system, whose first row starts with 0. */
export const PROC_CASE: Aug = P3.aug;

export type MachineStep =
  | { kind: 'look'; r: number; c: number; text: string }
  | { kind: 'op'; op: RowOp; text: string }
  | { kind: 'set'; m: number[][]; text: string }
  | { kind: 'note'; text: string };

export interface MachineResult {
  ok: boolean;
  message: string;
  steps: MachineStep[];
  answer?: number[];
  /** Which misconception showed (for tests and the bark). */
  misconception?: 'divide-by-zero' | 'no-pivot' | 'not-cleared' | 'no-back' | 'top-down' | 'scale-zero' | 'column-swap' | 'stopped';
}

const NAMES = ['x', 'y', 'z'];
const fracTxt = (x: Frac) => num(x.value());

/** Run the tiles literally on an augmented matrix (exact fractions). */
export function rowMachine(tiles: string[], aug: Aug = PROC_CASE): MachineResult {
  let a: FMat = fmat(aug);
  const R = a.length, n = a[0].length - 1;
  const steps: MachineStep[] = [];
  const fail = (misconception: MachineResult['misconception'], message: string): MachineResult => ({ ok: false, message, steps, misconception });
  const iNext = tiles.indexOf('next');
  const body = iNext >= 0 ? tiles.slice(0, iNext) : tiles.filter((t) => t !== 'back' && t !== 'top');
  const after = iNext >= 0 ? tiles.slice(iNext + 1) : tiles.filter((t) => t === 'back' || t === 'top');
  if (!tiles.length) return fail('stopped', 'You gave me no steps.');
  let erased = false, swappedCols = false;
  let r = 0, c = 0;
  let passes = 0;
  const back = (fromTop: boolean): MachineResult | number[] => {
    if (fromTop) {
      const unknown = [...Array(n).keys()].filter((k) => k > 0 && !a[0][k].isZero()).map((k) => NAMES[k]);
      if (unknown.length) return fail('top-down', `Row 1 still has ${unknown.join(' and ')} in it, and I do not know ${unknown.length > 1 ? 'them' : 'it'} yet. I cannot read ${NAMES[0]} first. Start from the bottom row, which has one unknown.`);
    }
    if (erased) {
      const z = a.findIndex((row) => row.every((x) => x.isZero()));
      return fail('scale-zero', `Row ${z + 1} is all zeros: you told me to multiply an equation by 0, which erased it. I cannot read ${NAMES[Math.min(z, n - 1)]} from nothing.`);
    }
    if (!isREF(a, n) && iNext < 0) {
      return fail('stopped', tiles.includes('clear')
        ? 'Nothing told me to move on, so I cleared below the first pivot only. The rows are not a staircase, and back substitution would read the wrong equation.'
        : 'Nothing told me to clear below a pivot or to move on to the next column. The rows are not a staircase, so back substitution would read the wrong equation.');
    }
    if (!isREF(a, n) && swappedCols) return fail('column-swap', 'You told me to swap two columns. That put numbers under the wrong unknowns, and the rows are not a staircase any more, so back substitution would read the wrong equation.');
    if (!isREF(a, n)) {
      const bad = a.findIndex((row, i) => i > 0 && leadCol(row, n) <= leadCol(a[i - 1], n) && leadCol(row, n) >= 0);
      return fail('not-cleared', `The rows are not a staircase: row ${bad + 1} still has ${NAMES[leadCol(a[bad], n)]} in it. Back substitution reads the bottom row as one unknown, so the answer it gives is wrong.`);
    }
    const x: Frac[] = new Array(n).fill(Frac.ZERO);
    for (let i = n - 1; i >= 0; i--) {
      const row = a[i];
      if (!row || row[i].isZero()) {
        if (erased) return fail('scale-zero', `Row ${i + 1} is all zeros: you multiplied an equation by 0 and erased it. I cannot read ${NAMES[i]} from nothing.`);
        return fail('divide-by-zero', `Row ${i + 1} has 0 where ${NAMES[i]} should be. I divided by zero.`);
      }
      let s = row[n];
      for (let k = i + 1; k < n; k++) s = s.sub(row[k].mul(x[k]));
      x[i] = s.div(row[i]);
      steps.push({ kind: 'note', text: `Row ${i + 1}: ${NAMES[i]} = ${fracTxt(x[i])}` });
    }
    return x.map((v) => v.value());
  };
  while (r < R && c < n) {
    passes++;
    let found = false;
    for (const t of body) {
      if (t === 'find') { found = true; steps.push({ kind: 'look', r, c, text: `Pivot candidate: row ${r + 1}, column ${c + 1}, entry ${fracTxt(a[r][c])}.` }); }
      else if (t === 'swap0') {
        if (a[r][c].isZero()) {
          const k = a.findIndex((row, i) => i > r && !row[c].isZero());
          if (k >= 0) { const op: RowOp = { kind: 'swap', i: r, j: k }; a = applyOp(a, op); steps.push({ kind: 'op', op, text: `Row ${r + 1} has 0 there. Swap rows ${r + 1} and ${k + 1}.` }); }
        }
      } else if (t === 'clear') {
        if (!found) return fail('no-pivot', 'You told me to clear below. Below what? You never told me to find a pivot.');
        if (a[r][c].isZero()) {
          // blame the step that put the 0 there
          const lower = a.some((row, i) => i > r && !row[c].isZero());
          const [mis, why]: [MachineResult['misconception'], string] = erased && a[r].every((x) => x.isZero())
            ? ['scale-zero', 'The ×0 tile wiped out that row before I could clear below it.']
            : swappedCols
              ? ['column-swap', lower ? 'Swapping columns moved a 0 into the pivot spot.' : 'Swapping columns moved a column of zeros into the pivot spot, and no lower row had a non-zero entry to swap in.']
              : !tiles.includes('swap0') ? ['divide-by-zero', 'Nothing told me to swap first.']
              : tiles.indexOf('swap0') > tiles.indexOf('clear') ? ['divide-by-zero', 'Your swap step comes after clearing, so it came too late.']
              : ['divide-by-zero', 'No lower row has a non-zero entry there to swap in.'];
          return fail(mis, `Row ${r + 1} has 0 in column ${c + 1}. To clear below it I would divide by that 0. I divided by zero. ${why}`);
        }
        for (let i = r + 1; i < R; i++) {
          if (a[i][c].isZero()) continue;
          const op: RowOp = { kind: 'add', i, j: r, k: a[i][c].div(a[r][c]).neg() };
          a = applyOp(a, op);
          steps.push({ kind: 'op', op, text: `Clear row ${i + 1} under the pivot.` });
        }
      } else if (t === 'scale0') {
        a = a.map((row, i) => (i === r ? row.map(() => Frac.ZERO) : row));
        erased = true;
        steps.push({ kind: 'set', m: a.map((row) => row.map((x) => x.value())), text: `Row ${r + 1} times 0: the equation is gone.` });
      } else if (t === 'colswap') {
        if (c + 1 < n) {
          a = a.map((row) => { const s = row.slice(); [s[c], s[c + 1]] = [s[c + 1], s[c]]; return s; });
          swappedCols = true;
          steps.push({ kind: 'set', m: a.map((row) => row.map((x) => x.value())), text: `Columns ${c + 1} and ${c + 2} swapped: ${NAMES[c]} and ${NAMES[c + 1]} trade places.` });
        }
      } else if (t === 'back' || t === 'top') {
        const res = back(t === 'top');
        if (!Array.isArray(res)) return res;
      }
    }
    if (iNext < 0) {
      if (r + 1 < R) steps.push({ kind: 'note', text: 'Nothing told me to move to the next column. I stop after column 1.' });
      break;
    }
    if (found || body.length) { r++; c++; }
    if (passes > 10) break;
  }
  // the tiles after NEXT run once, in order, after the repeat has used up the rows
  let x: number[] | null = null;
  const last = Math.max(0, Math.min(r, R) - 1);
  const snap = () => a.map((row) => row.map((v) => v.value()));
  const AFTER_NAMES: Record<string, string> = { find: 'FIND PIVOT', swap0: 'SWAP IF ZERO', clear: 'CLEAR BELOW' };
  for (const t of after) {
    if (t === 'back' && x) {
      steps.push({ kind: 'note', text: 'I already have the answer. Reading it again changes nothing.' });
    } else if (t === 'back' || t === 'top') {
      const res = back(t === 'top');
      if (!Array.isArray(res)) return res;
      x = res;
    } else if (t === 'scale0') {
      a = a.map((row, i) => (i === last ? row.map(() => Frac.ZERO) : row));
      erased = true;
      steps.push({ kind: 'set', m: snap(), text: `Row ${last + 1} times 0: the equation is gone.` });
      if (x) return fail('scale-zero', `I already had the answer, then you told me to multiply row ${last + 1} by 0. That erased an equation, so the board no longer fixes the answer. Multiplying by 0 is never a row operation.`);
    } else if (t === 'colswap') {
      if (n >= 2) {
        a = a.map((row) => { const s = row.slice(); [s[n - 2], s[n - 1]] = [s[n - 1], s[n - 2]]; return s; });
        swappedCols = true;
        steps.push({ kind: 'set', m: snap(), text: `Columns ${n - 1} and ${n} swapped: ${NAMES[n - 2]} and ${NAMES[n - 1]} trade places.` });
      }
      if (x) return fail('column-swap', `I already had the answer, then you told me to swap two columns. Now ${NAMES[n - 2]}'s numbers sit under ${NAMES[n - 1]}, so the board no longer matches the answer. Swapping columns is not a row operation.`);
    } else if (AFTER_NAMES[t]) {
      steps.push({ kind: 'note', text: `${AFTER_NAMES[t]} comes after the repeat has ended. No row is left, so it does nothing.` });
    }
  }
  if (!x) return fail('no-back', 'I made the staircase. You did not tell me to read the answer from it, so I have no answer.');
  const ok = onAll(aug, x, 1e-9);
  if (!ok) {
    const miss = aug.findIndex((row) => Math.abs(row.slice(0, -1).reduce((s, v, i) => s + v * x![i], 0) - row[row.length - 1]) > 1e-9);
    const why = swappedCols ? 'Swapping columns swapped which number belongs to which unknown.'
      : erased ? 'Multiplying a row by 0 erased one equation, so the answer no longer has to meet it.'
      : 'The rows were not cleared, so reading from the bottom used the wrong equation.';
    return { ok: false, message: `Your steps give (${x.map((v) => num(v)).join(', ')}). That point is not on plane ${miss + 1}. ${why}`, steps, answer: x, misconception: swappedCols ? 'column-swap' : erased ? 'scale-zero' : 'not-cleared' };
  }
  return { ok: true, message: `(${x.map((v) => num(v)).join(', ')}) is on all three planes: ${x.map((v, i) => `${NAMES[i]} = ${num(v)}`).join(', ')}.`, steps, answer: x };
}

// ------------------------------------------------------------------ builds: row_echelon(M), back_sub(M)

/**
 * The crew version of row_echelon, exactly as the brief describes it: for each column, take the first
 * row (from the current row down) with a non-zero entry, swap it up, subtract multiples of it from the
 * rows below. No scaling. Numbers (floats), with tiny values set to 0.
 */
export function rowEchelonCrew(M: number[][]): number[][] {
  const a = M.map((r) => r.slice());
  const R = a.length, C = R ? a[0].length - 1 : 0;
  let r = 0;
  for (let c = 0; c < C && r < R; c++) {
    let p = -1;
    for (let i = r; i < R; i++) if (Math.abs(a[i][c]) > 1e-12) { p = i; break; }
    if (p < 0) continue;
    [a[r], a[p]] = [a[p], a[r]];
    for (let i = r + 1; i < R; i++) {
      const f = a[i][c] / a[r][c];
      if (f !== 0) for (let k = c; k <= C; k++) a[i][k] -= f * a[r][k];
      a[i][c] = 0;
    }
    r++;
  }
  return a.map((row) => row.map((x) => (Math.abs(x) < 1e-12 ? 0 : x)));
}

/** The crew version of back_sub: M in row echelon form with a pivot in every column. */
export const backSubCrew = (M: number[][]): number[] => backSub(M) ?? [];

export { sameSolutions, kindOf, isStaircase };
