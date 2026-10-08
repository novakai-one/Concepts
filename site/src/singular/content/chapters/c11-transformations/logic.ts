// Chapter 11, pure logic: every number the chapter shows, every win test, the Law's predicates and
// the Doubts' predicates. No DOM, no three: tests/singular/game-c11.test.ts imports this file in Node.
import {
  col, cross2, det, dot, fromCols, matMul, matVec, transpose, type Mat, type Vec,
} from '../../../math/la.ts';
import { T, T3, S_now, R2 } from '../../truth.ts';
import type { Difficulty } from '../../../core/save.ts';
import { rint, type LawCore } from '../../../game/lawcheck.ts';

export type { Mat, Vec };

/** Win tolerance by Maths depth (GDD §7.1). */
export const tolFor = (d: Difficulty): number => (d === 'commander' ? 0.01 : 0.05);
export const near = (a: readonly number[], b: readonly number[], tol = 0.05): boolean =>
  Math.hypot(...a.map((x, i) => x - (b[i] ?? 0))) <= tol;
export const meqTol = (A: Mat, B: Mat, tol = 0.05): boolean =>
  A.length === B.length && A.every((r, i) => r.every((x, j) => Math.abs(x - B[i][j]) <= tol));
export const fmtV = (v: readonly number[]): string => `(${v.map((x) => fmtN(x)).join(', ')})`;
export function fmtN(x: number): string {
  if (Math.abs(x) < 1e-9) return '0';
  if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x)).replace('-', '−');
  const s = Math.abs(x * 10 - Math.round(x * 10)) < 1e-9 ? x.toFixed(1) : x.toFixed(2);
  return s.replace('-', '−');
}

// ------------------------------------------------------------------ the routine pulse (truth.ts)

/** The routine pulse, ground layer: columns (1, 1) and (−2, −1). */
export const PULSE = T;
export const PULSE_E1: Vec = col(T, 0);
export const PULSE_E2: Vec = col(T, 1);

// ------------------------------------------------------------------ c11-p1 · read the pulse

export const P1_BUOY: Vec = [3, 2];
export const P1_LAND: Vec = matVec(T, P1_BUOY); // (−1, 1)
export const p1Won = (marker: readonly number[], tol = 0.05): boolean => near(marker, P1_LAND, tol);
/** The misconception landings: rows read as landing spots, and entry by entry. */
export const P1_ROWS: Vec = matVec(transpose(T), P1_BUOY); // (5, −8)
export const P1_ENTRYWISE: Vec = [P1_BUOY[0] * T[0][0], P1_BUOY[1] * T[1][1]]; // (3, −2)

// ------------------------------------------------------------------ c11-p2 · build a pulse

export const P2_PROBES: Vec[] = [[1, 1], [1, -1]];
export const P2_TARGETS: Vec[] = [[3, 3], [1, -1]];
export const P2_ANSWER: Mat = fromCols([[2, 1], [1, 2]]);
export const p2Won = (M: Mat, tol = 0.05): boolean => P2_PROBES.every((p, i) => near(matVec(M, p), P2_TARGETS[i], tol));

// ------------------------------------------------------------------ c11-p3 · why two arrows fix everything [D]

export const SHEAR: Mat = [[1, 1], [0, 1]];
export const TURN: Mat = R2; // a quarter turn: columns (0, 1), (−1, 0)
export const P3_TARGETS: { name: string; M: Mat }[] = [
  { name: 'the shear', M: SHEAR },
  { name: 'the quarter turn', M: TURN },
];
/** "Everything slides 3 to the right": not a move the bench can make. The origin goes to (3, 0). */
export const SLIDE: Vec = [3, 0];
/** The curved warp: (x, y) → (x, y + k x²). Vertical lines stay straight; horizontal lines bend. */
export const WARP_K = 0.14;
export const warp = (p: readonly number[]): Vec => [p[0], p[1] + WARP_K * p[0] * p[0]];
/** The pin marks the slide's evidence when it sits where the origin went. */
export const slideEvidence = (pin: readonly number[]): boolean => near(pin, SLIDE, 0.35);
/**
 * The pin marks the warp's evidence when it sits on the image of a horizontal grid line y = c
 * (c a whole number from −4 to 4) where that line is visibly bent (|x| ≥ 0.8).
 */
export function warpEvidence(pin: readonly number[]): number | null {
  const [x, y] = pin;
  if (Math.abs(x) < 0.8 || Math.abs(x) > 5) return null;
  const c = Math.round(y - WARP_K * x * x);
  if (Math.abs(c) > 4) return null;
  return Math.abs(y - (c + WARP_K * x * x)) <= 0.22 ? c : null;
}
/** The split of x and where its two parts land under the pulse. */
export function splitParts(x: readonly number[], M: Mat = T): { e1: Vec; e2: Vec; a1: Vec; a2: Vec; land: Vec } {
  return { e1: [x[0], 0], e2: [0, x[1]], a1: col(M, 0).map((v) => v * x[0]), a2: col(M, 1).map((v) => v * x[1]), land: matVec(M, [x[0], x[1]]) };
}
/** The derivation tiles (Commander): reference order, plus a decoy (entry by entry). */
export const P3_TILES = [
  { id: 'split', text: 'Write $\\mathbf x = x_1\\mathbf e_1 + x_2\\mathbf e_2$.', py: 'x = x1*e1 + x2*e2' },
  { id: 'sum', text: 'The move keeps sums: $T(x_1\\mathbf e_1 + x_2\\mathbf e_2) = T(x_1\\mathbf e_1) + T(x_2\\mathbf e_2)$.', py: 'T(u + w) == T(u) + T(w)' },
  { id: 'scale', text: 'The move keeps stretches: $T(x_1\\mathbf e_1) = x_1\\,T(\\mathbf e_1)$, and the same for $\\mathbf e_2$.', py: 'T(c*u) == c*T(u)' },
  { id: 'land', text: 'So $T(\\mathbf x) = x_1\\,T(\\mathbf e_1) + x_2\\,T(\\mathbf e_2)$: the same mix of the two landing spots.', py: 'T(x) == x1*T(e1) + x2*T(e2)' },
];
export const P3_DECOYS = [
  { id: 'entry', text: 'Multiply entry by entry: $T(\\mathbf x) = (x_1 \\cdot 1,\\ x_2 \\cdot (-1))$.', py: 'T(x) == [x1*1, x2*(-1)]' },
];
export const P3_ORDER = ['split', 'sum', 'scale', 'land'];
export const p3TilesRight = (order: readonly string[]): boolean => order.length === P3_ORDER.length && order.every((id, i) => id === P3_ORDER[i]);

// ------------------------------------------------------------------ c11-p4 · the spire numbers

export const SPIRES_NOW = S_now;        // columns (0, 1, 0), (−1, 0, 0), (0, 0, 0.8)
export const MEASURED = T3;             // columns (1, 1, 0), (−2, −1, 0), (0, 0, 0.8)
export const BOW: Vec = [1, 0, 0];
export const BOW_SPIRE: Vec = matVec(S_now, BOW);   // (0, 1, 0)
export const BOW_REAL: Vec = matVec(T3, BOW);       // (1, 1, 0)
export const VOL_SPIRE = det(S_now);    // 0.8
export const VOL_REAL = det(T3);        // 0.8
export interface P4State { spire: Mat | null; spireMark: Vec | null; real: Mat | null; realMark: Vec | null }
export function p4Subgoals(s: P4State, tol = 0.05): boolean[] {
  return [
    !!s.spire && meqTol(s.spire, S_now, tol),
    !!s.spireMark && near(s.spireMark, BOW_SPIRE, tol),
    !!s.real && meqTol(s.real, T3, tol),
    !!s.realMark && near(s.realMark, BOW_REAL, tol),
  ];
}
export const p4Won = (s: P4State, tol = 0.05): boolean => p4Subgoals(s, tol).every(Boolean);

// ------------------------------------------------------------------ c11-p5 · both ways [H]

export const P5_A: Mat = [[1, 0, 2], [0, 1, -1]];
export const P5_X: Vec = [3, 1, 2];
export const P5_AX: Vec = matVec(P5_A, P5_X); // (7, −1)
export const P5_PARTS: Vec[] = [0, 1, 2].map((j) => col(P5_A, j).map((v) => v * P5_X[j])); // (3,0), (0,1), (4,−2)
export const P5_ROWS: number[] = P5_A.map((r) => dot(r, P5_X)); // 7, −1
export const P5_BENCH: Mat = fromCols([[1, 0, 0], [1, 1, 0], [0, 1, 1]]);
export const P5_BEACON: Vec = [1, 1, 1];
export const P5_BEACON_LAND: Vec = matVec(P5_BENCH, P5_BEACON); // (2, 2, 1)
/** The by-hand steps (StepWorksheet). */
export const P5_STEPS = [
  { prompt: 'Column view. $3 \\times \\cg{(1, 0)}$', answer: P5_PARTS[0] },
  { prompt: '$1 \\times \\cr{(0, 1)}$', answer: P5_PARTS[1] },
  { prompt: '$2 \\times \\cb{(2, -1)}$', answer: P5_PARTS[2], mistakes: [[[2, -1], 'That is the third column once. The weight is 2.']] as [Vec, string][] },
  { prompt: 'Add the three parts: $A\\mathbf x$', answer: P5_AX, mistakes: [[[3, -1], 'Entry by entry is not the rule. Each column is used whole, scaled by its weight.']] as [Vec, string][] },
  { prompt: 'Row view. Row 1 $\\cdot\\ \\mathbf x = (1, 0, 2)\\cdot(3, 1, 2)$', answer: P5_ROWS[0] },
  { prompt: 'Row 2 $\\cdot\\ \\mathbf x = (0, 1, -1)\\cdot(3, 1, 2)$', answer: P5_ROWS[1], mistakes: [[3, 'Row 2 has −1 in its last place: 0·3 + 1·1 + (−1)·2.']] as [number, string][] },
];

// ------------------------------------------------------------------ c11-p6 · rows or columns?

/** Ilse's nine numbers, in the order she read them: first spire, second spire, third spire. */
export const ILSE_NINE = [0, 1, 0, -1, 0, 0, 0, 0, 1];
/** The ground-layer slice of each reading. The third spire reads (0, 0, 1) either way. */
export const READ_COLS: Mat = R2;             // spires as columns: (0, 1), (−1, 0)
export const READ_ROWS: Mat = transpose(R2);  // spires as rows
/** +1 when a move turns e₁ counterclockwise (toward e₂), −1 when clockwise, 0 when neither. */
export const turnSense = (M: Mat): number => Math.sign(Math.round(cross2([1, 0], col(M, 0)) * 1e6));
export const PULSE_SENSE = turnSense(T); // +1: the cold open's pulse turns the grid counterclockwise
export interface P6State { cols: Mat | null; rows: Mat | null; loaded: Mat | null }
export function p6Subgoals(s: P6State, tol = 0.05): boolean[] {
  return [
    !!s.cols && meqTol(s.cols, READ_COLS, tol),
    !!s.rows && meqTol(s.rows, READ_ROWS, tol),
    !!s.loaded && meqTol(s.loaded, READ_COLS, tol),
  ];
}
export const p6Won = (s: P6State, tol = 0.05): boolean => p6Subgoals(s, tol).every(Boolean);

// ------------------------------------------------------------------ c11-p7 · rotation, reflection, projection [S]

const C30 = Math.cos(Math.PI / 6), S30 = Math.sin(Math.PI / 6);
export const P7_TARGETS: { id: string; text: string; M: Mat }[] = [
  { id: 'rot30', text: 'Turn the grid by 30° counterclockwise.', M: [[C30, -S30], [S30, C30]] },
  { id: 'flip', text: 'Flip the grid over the line $y = x$.', M: [[0, 1], [1, 0]] },
  { id: 'proj', text: 'Flatten the grid onto the $x$-axis: every point drops straight down or up onto it.', M: [[1, 0], [0, 0]] },
];

// ------------------------------------------------------------------ the Law (GDD §6.6 Ch 11)

export interface LawCase { A: Mat }
const isTurn = (A: Mat): boolean => {
  const AtA = matMul(transpose(A), A);
  return Math.abs(AtA[0][0] - 1) + Math.abs(AtA[1][1] - 1) + Math.abs(AtA[0][1]) < 1e-6 && det(A) > 0;
};
const colsLand = (A: Mat): boolean => near(matVec(A, [1, 0]), col(A, 0), 1e-9) && near(matVec(A, [0, 1]), col(A, 1), 1e-9);
const rowsLand = (A: Mat): boolean => near(matVec(A, [1, 0]), A[0], 1e-9) && near(matVec(A, [0, 1]), A[1], 1e-9);

/** The Law: "The [COLUMNS / ROWS] of A are where e₁ and e₂ land, [ALWAYS / EXACTLY WHEN …]." */
export const lawCore: LawCore<LawCase> & { answer: Record<string, string> } = {
  id: 'c11-law',
  answer: { part: 'cols', when: 'always' },
  gen: (r) => {
    const v = () => rint(r, -8, 8) / 2;
    return { A: [[v(), v()], [v(), v()]] };
  },
  // Every rows filling breaks on a case whose rows are visibly not where e₁ and e₂ land:
  // rows + always and rows + kept on the shear, rows + turn on the quarter turn.
  edgeCases: [
    { A: SHEAR },                 // rows are not landing spots; columns are, and it is no turn
    { A: TURN },                  // a turn whose rows are not landing spots (as in p6)
    { A: [[1, 0], [0, 0]] },      // flattens onto the x-axis (and equals its own rows)
    { A: [[2, 0], [0, 3]] },      // a stretch: rows and columns agree, no turn
    { A: T },                     // the routine pulse
    { A: [[0, 0], [0, 0]] },      // everything to the origin
    { A: [[0, 1], [1, 0]] },      // a flip
  ],
  /** Does the filled statement hold for this case? */
  holds(f, c) {
    const lands = f.part === 'rows' ? rowsLand(c.A) : colsLand(c.A);
    if (f.when === 'turn') return lands === isTurn(c.A);
    if (f.when === 'kept') return lands === Math.abs(det(c.A)) > 1e-9;
    return lands;
  },
  describe: (c) => {
    const kind = Math.abs(det(c.A)) < 1e-9 ? 'it flattens the grid' : isTurn(c.A) ? 'it turns the grid' : 'it is not a turn';
    return `A has columns ${fmtV(col(c.A, 0))} and ${fmtV(col(c.A, 1))} and rows ${fmtV(c.A[0])} and ${fmtV(c.A[1])}; $\\mathbf e_1$ lands on ${fmtV(matVec(c.A, [1, 0]))}, and ${kind}`;
  },
};
export const LAW_NEAR_MISSES: Record<string, string>[] = [
  { part: 'rows', when: 'always' },
  { part: 'cols', when: 'turn' },
  { part: 'cols', when: 'kept' },
  { part: 'rows', when: 'turn' },
  { part: 'rows', when: 'kept' },
];

// ------------------------------------------------------------------ the Doubts

/** D1 (false): "Two buoys can't tell you where every buoy goes." It holds only when the two buoys are on one line through the origin. */
export interface D1Case { u: Vec; w: Vec; A: Mat; x: Vec }
export const d1Holds = (c: D1Case): boolean => Math.abs(cross2(c.u, c.w)) < 1e-9;
/** When u and w point different ways, the prediction for x from their two landings. */
export function d1Predict(c: D1Case): Vec | null {
  const dd = cross2(c.u, c.w);
  if (Math.abs(dd) < 1e-9) return null;
  // x = a u + b w  (Cramer on the 2×2 [u w])
  const a = cross2(c.x, c.w) / dd, b = cross2(c.u, c.x) / dd;
  const Au = matVec(c.A, c.u), Aw = matVec(c.A, c.w);
  return [a * Au[0] + b * Aw[0], a * Au[1] + b * Aw[1]];
}

/** D2 (true): "No pulse can ever move the point under the Anchor." */
export interface D2Case { A: Mat }
export const d2Holds = (c: D2Case): boolean => near(matVec(c.A, [0, 0]), [0, 0], 1e-12);
export const D2_EDGES: D2Case[] = [{ A: [[0, 0], [0, 0]] }, { A: [[1, 2], [2, 4]] }, { A: [[0, 1], [1, 0]] }, { A: [[-1, 0], [0, -1]] }];
