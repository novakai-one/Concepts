// Prologue: the numbers. A row of points b + t·s (t = 1, 2, 3, …: equal steps along a line), a matrix that
// moves the whole plane, and the point asked about. The answer is always where equal steps put it.
import type { Mat } from '../../../math/la';
import { T } from '../../truth';
import { cleanV, type Vec } from '../../../kit/plain';

/** The chapter's matrix (the pulse from the story): [[1, −2], [1, −1]]. */
export const A: Mat = T;

/** M times p. */
export const mv = (M: Mat, p: Vec): Vec => cleanV([M[0][0] * p[0] + M[0][1] * p[1], M[1][0] * p[0] + M[1][1] * p[1]]);
export const sub = (a: Vec, b: Vec): Vec => cleanV([a[0] - b[0], a[1] - b[1]]);

/** Points b + t·s on a line, t whole numbers (or halves). */
export interface Row { b: Vec; s: Vec }
export const at = (r: Row, t: number): Vec => cleanV([r.b[0] + t * r.s[0], r.b[1] + t * r.s[1]]);

/** One question: the given points (by step number) move under M; where does the point at step `ask` land? */
export interface Question {
  M: Mat;
  row: Row;
  /** Step numbers of the given points, in order. */
  given: number[];
  /** Step number of the point asked about. */
  ask: number;
}

export const inputs = (q: Question): Vec[] => q.given.map((t) => at(q.row, t));
export const landed = (q: Question): Vec[] => inputs(q).map((p) => mv(q.M, p));
export const askP = (q: Question): Vec => at(q.row, q.ask);
export const answer = (q: Question): Vec => mv(q.M, askP(q));

/** Where a wrong guess sits against the given points: the two steps to compare. */
export type Steps =
  | { kind: 'ahead' | 'behind'; from: Vec; prev: Vec; s: Vec; d: Vec; k: number }
  | { kind: 'between'; lo: Vec; hi: Vec; a: Vec; b: Vec };

/**
 * The steps a guess g makes. Ahead: the last given step, then from the last point to g (k steps expected).
 * Behind: the first given step, then from g to the first point. Between: from the point below to g, and
 * from g to the point above (equal for the middle).
 */
export function stepsOf(q: Question, g: Vec): Steps {
  const ts = q.given, qs = landed(q), n = ts.length;
  const t = q.ask;
  if (t > ts[0] && t < ts[n - 1]) {
    const i = ts.findIndex((x) => x > t);
    return { kind: 'between', lo: qs[i - 1], hi: qs[i], a: sub(g, qs[i - 1]), b: sub(qs[i], g) };
  }
  if (t > ts[n - 1]) {
    const unit = ts[n - 1] - ts[n - 2];
    const s = cleanV(sub(qs[n - 1], qs[n - 2]).map((x) => x / unit));
    return { kind: 'ahead', from: qs[n - 1], prev: qs[n - 2], s, d: sub(g, qs[n - 1]), k: (t - ts[n - 1]) / unit };
  }
  const unit = ts[1] - ts[0];
  const s = cleanV(sub(qs[1], qs[0]).map((x) => x / unit));
  return { kind: 'behind', from: qs[0], prev: qs[1], s, d: sub(qs[0], g), k: (ts[0] - t) / unit };
}

// ------------------------------------------------------------------ the first puzzle: three rows under A

export interface Step { q: Question; /** Which entry is the box (the other is shown); null: the whole vector. */ box: 0 | 1 | null }
export const STEPS: Step[] = [
  // [1;0], [2;0], [3;0] → [1;1], [2;2], [3;3]; A[4;0] = [4; ?]
  { q: { M: A, row: { b: [0, 0], s: [1, 0] }, given: [1, 2, 3], ask: 4 }, box: 1 },
  // [0;1], [1;2], [2;3] → [−2;−1], [−3;−1], [−4;−1]; A[3;4] = [? ; −1]
  { q: { M: A, row: { b: [0, 1], s: [1, 1] }, given: [0, 1, 2], ask: 3 }, box: 0 },
  // [1;1], [2;2], [3;3] → [−1;0], [−2;0], [−3;0]; A[0;0] = ?
  { q: { M: A, row: { b: [0, 0], s: [1, 1] }, given: [1, 2, 3], ask: 0 }, box: null },
];

// ------------------------------------------------------------------ practice: ten short rounds

export interface RoundData { id: string; name: string; q: Question }
const SHEAR: Mat = [[1, 1], [0, 1]];
const STRETCH: Mat = [[2, 0], [0, 1]];
const TURN: Mat = [[0, -1], [1, 0]];
const FLIP: Mat = [[1, 0], [0, -1]];

export const ROUNDS: RoundData[] = [
  // the next point
  { id: 'r1', name: 'next point', q: { M: A, row: { b: [0, 0], s: [0, 1] }, given: [1, 2], ask: 3 } },
  { id: 'r2', name: 'next point, a shear', q: { M: SHEAR, row: { b: [1, 0], s: [0, 1] }, given: [1, 2], ask: 3 } },
  { id: 'r3', name: 'next point, a stretch', q: { M: STRETCH, row: { b: [0, 1], s: [1, 0] }, given: [1, 2], ask: 3 } },
  { id: 'r4', name: 'next point, a rotation', q: { M: TURN, row: { b: [1, 0], s: [0, 1] }, given: [0, 1], ask: 2 } },
  // the middle point
  { id: 'r5', name: 'the middle point', q: { M: [[2, 1], [1, 2]], row: { b: [0, 0], s: [1, 0] }, given: [1, 3], ask: 2 } },
  { id: 'r6', name: 'half a step', q: { M: [[3, 1], [1, 1]], row: { b: [0, 0], s: [1, 0] }, given: [1, 2], ask: 1.5 } },
  // back to the origin, and through it
  { id: 'r7', name: 'the origin', q: { M: [[2, -1], [1, 1]], row: { b: [0, 0], s: [1, 1] }, given: [1, 2], ask: 0 } },
  { id: 'r8', name: 'through the origin', q: { M: [[1, 1], [-1, 2]], row: { b: [0, 0], s: [1, 1] }, given: [1, 2], ask: -1 } },
  // two steps ahead
  { id: 'r9', name: 'two steps ahead', q: { M: [[1, 0], [1, 1]], row: { b: [0, -1], s: [1, 0] }, given: [1, 2], ask: 4 } },
  { id: 'r10', name: 'two steps ahead, a reflection', q: { M: FLIP, row: { b: [0, 1], s: [1, 1] }, given: [1, 2], ask: 4 } },
];
