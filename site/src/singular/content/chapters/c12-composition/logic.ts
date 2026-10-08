// Chapter 12, pure logic: the numbers, win checks, the Law core and the Doubts' predicates.
// No DOM, no three: tests/singular/game-c12.test.ts imports this file in Node.
import { col, dot, matMul, matVec, transpose, type Mat, type Vec } from '../../../math/la.ts';
import { R2, T } from '../../truth.ts';
import { rint, type LawCore } from '../../../game/lawcheck.ts';
import { fmtN, fmtV, meqTol, near } from '../c11-transformations/logic.ts';

export { fmtN, fmtV, meqTol, near };
export type { Mat, Vec };

const isZero = (M: Mat, tol = 1e-9) => M.every((r) => r.every((x) => Math.abs(x) <= tol));
const turn = (deg: number): Mat => { const t = (deg * Math.PI) / 180; return [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]]; };

// ------------------------------------------------------------------ the cards on the rail

export interface Card { id: string; name: string; M: Mat }
export const SHEAR: Mat = [[1, 1], [0, 1]];
export const TURN: Mat = R2;                      // the stabiliser: a quarter turn
export const FLIP: Mat = [[0, 1], [1, 0]];        // the flip over y = x
export const PX: Mat = [[1, 0], [0, 0]];          // flatten onto the x-axis
export const PY: Mat = [[0, 0], [0, 1]];          // flatten onto the y-axis
export const STRETCH: Mat = [[2, 0], [0, 1]];     // stretch across by 2
export const CARDS: Record<string, Card> = {
  shear: { id: 'shear', name: 'shear', M: SHEAR },
  turn: { id: 'turn', name: 'quarter turn', M: TURN },
  flip: { id: 'flip', name: 'flip over y = x', M: FLIP },
  px: { id: 'px', name: 'onto the x-axis', M: PX },
  py: { id: 'py', name: 'onto the y-axis', M: PY },
  stretch: { id: 'stretch', name: 'stretch across ×2', M: STRETCH },
  pulse: { id: 'pulse', name: 'routine pulse', M: T },
};

/** The single matrix for cards played in order (first acting first): the last card on the left. */
export const fuse = (Ms: Mat[]): Mat => Ms.reduce((acc, M) => matMul(M, acc), [[1, 0], [0, 1]] as Mat);

// ------------------------------------------------------------------ c12-p1 · the pair as one

export const P1_BA: Mat = matMul(TURN, SHEAR);    // shear first, then turn: [[0, −1], [1, 1]]
export const P1_AB: Mat = matMul(SHEAR, TURN);    // turn first, then shear: [[1, −1], [1, 0]]
/** Where e₁ and e₂ are after each stage: e₁ → (1, 0) → (0, 1); e₂ → (1, 1) → (−1, 1). */
export const P1_TRACE = { e1: [[1, 0], matVec(SHEAR, [1, 0]), matVec(P1_BA, [1, 0])], e2: [[0, 1], matVec(SHEAR, [0, 1]), matVec(P1_BA, [0, 1])] };
export const p1Won = (M: Mat, tol = 0.05) => meqTol(M, P1_BA, tol);

// ------------------------------------------------------------------ c12-p2 · order

/** A point shows that order matters when its two landings are visibly apart. */
export const ordersApart = (p: Vec, tol = 0.3) => !near(matVec(P1_BA, p), matVec(P1_AB, p), tol);
export const flipTwiceHome = (cards: Mat[]) => cards.length === 2 && cards.every((M) => meqTol(M, FLIP, 1e-9)) && meqTol(fuse(cards), [[1, 0], [0, 1]], 1e-9);

// ------------------------------------------------------------------ c12-p3 [H] · the row–column rule

export const P3_A: Mat = [[1, 2, 0], [0, 1, 3]];
export const P3_B: Mat = [[1, 0], [2, 1], [0, 4]];
export const P3_AB: Mat = matMul(P3_A, P3_B);    // [[5, 2], [2, 13]]
export const P3_COLS: Vec[] = [0, 1].map((j) => matVec(P3_A, col(P3_B, j)));
export const P3_STEPS = [
  { prompt: 'Column 1 of $B$ is $(1, 2, 0)$. $A$ times it: $1\\,\\cg{(1, 0)} + 2\\,\\cr{(2, 1)} + 0\\,\\cb{(0, 3)}$', answer: P3_COLS[0], mistakes: [[[1, 2], 'That is column 1 of B itself. Mix the columns of A with its numbers as weights.']] as [Vec, string][] },
  { prompt: 'Column 2 of $B$ is $(0, 1, 4)$. $A$ times it: $0\\,\\cg{(1, 0)} + 1\\,\\cr{(2, 1)} + 4\\,\\cb{(0, 3)}$', answer: P3_COLS[1], mistakes: [[[2, 4], 'The third column of A is (0, 3): 4 of it is (0, 12).']] as [Vec, string][] },
  { prompt: 'Row–column rule, entry (1, 1): row 1 of $A$ · column 1 of $B$ $= (1, 2, 0)\\cdot(1, 2, 0)$', answer: P3_AB[0][0], mistakes: [[1, 'That is only the first pair. Add all three products: 1·1 + 2·2 + 0·0.']] as [number, string][] },
  { prompt: 'Entry (2, 2): row 2 of $A$ · column 2 of $B$ $= (0, 1, 3)\\cdot(0, 1, 4)$', answer: P3_AB[1][1] },
  { prompt: 'The product $AB$ (2 × 2)', answer: P3_AB, mistakes: [[[[5, 2], [0, 13]], 'Entry (2, 1) is row 2 of A · column 1 of B = 0·1 + 1·2 + 3·0 = 2.']] as [Mat, string][] },
];

// ------------------------------------------------------------------ c12-p4 [D] · moving a matrix across a dot product

export const P4_B: Mat = [[1, 2], [0, 1]];
export const P4_MOVER: Mat = transpose(P4_B);    // [[1, 0], [2, 1]]
export const P4_A: Mat = TURN;
/** Seeded pairs (x, y) for Bram's 200-pair shake. */
export function shakePairs(n = 200, seed = 7): [Vec, Vec][] {
  let s = seed >>> 0;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  return Array.from({ length: n }, () => [[rint(r, -5, 5), rint(r, -5, 5)], [rint(r, -5, 5), rint(r, -5, 5)]] as [Vec, Vec]);
}
/** Does (B x)·y = x·(M y) for this pair? */
export const moverHoldsFor = (B: Mat, M: Mat, x: Vec, y: Vec) => Math.abs(dot(matVec(B, x), y) - dot(x, matVec(M, y))) < 1e-9;
/** The first of the 200 pairs that breaks it (or null when M survives). */
export function moverShake(B: Mat, M: Mat, pairs = shakePairs()): [Vec, Vec] | null {
  return pairs.find(([x, y]) => !moverHoldsFor(B, M, x, y)) ?? null;
}
export const P4_AB: Mat = matMul(P4_A, P4_B);                    // [[0, −1], [1, 2]]
export const P4_AB_MOVER: Mat = transpose(P4_AB);                // [[0, 1], [−1, 2]]
export const P4_RULE_TWICE: Mat = matMul(transpose(P4_B), transpose(P4_A)); // the mover of B times the mover of A
export const P4_TILES = [
  { id: 'start', text: 'Start from $(AB\\mathbf x)\\cdot\\mathbf y = (A(B\\mathbf x))\\cdot\\mathbf y$.', py: 'dot(A @ (B @ x), y)' },
  { id: 'moveA', text: 'Move $A$ across: $= (B\\mathbf x)\\cdot(M_A\\mathbf y)$.', py: 'dot(B @ x, MA @ y)' },
  { id: 'moveB', text: 'Move $B$ across: $= \\mathbf x\\cdot(M_B M_A\\mathbf y)$.', py: 'dot(x, MB @ (MA @ y))' },
  { id: 'end', text: 'So the matrix that moves $AB$ across is $M_B M_A$: the other order.', py: 'M_AB == MB @ MA' },
];
export const P4_DECOYS = [{ id: 'same', text: 'Move both at once: $= \\mathbf x\\cdot(M_A M_B\\mathbf y)$.', py: 'dot(x, MA @ (MB @ y))' }];
export const P4_ORDER = ['start', 'moveA', 'moveB', 'end'];

// ------------------------------------------------------------------ c12-p5 · zero from non-zero

export const zeroFromNonZero = (Ms: Mat[]) => Ms.length === 2 && Ms.every((M) => !isZero(M)) && isZero(fuse(Ms), 1e-9);

// ------------------------------------------------------------------ c12-p6 · three layers, one matrix

export const P6_CARDS: Mat[] = [STRETCH, SHEAR, TURN];              // first acting first
export const P6_FUSED: Mat = fuse(P6_CARDS);                         // [[0, −1], [2, 1]]
export const p6Won = (M: Mat, tol = 0.05) => meqTol(M, P6_FUSED, tol);
/** The ring (radius 2) and the blob (around the origin, the origin included). */
export const RING: Vec[] = Array.from({ length: 16 }, (_, i) => [2 * Math.cos((i * Math.PI) / 8), 2 * Math.sin((i * Math.PI) / 8)]);
export const BLOB: Vec[] = [[0, 0], [0.45, 0.1], [-0.35, 0.3], [0.1, -0.45], [-0.3, -0.25], [0.25, 0.42], [-0.5, -0.05]];
/** Can a straight line put every point of P strictly on one side and every point of Q on the other? */
export function separable(P: Vec[], Q: Vec[]): boolean {
  const dirs: Vec[] = [];
  for (let k = 0; k < 360; k++) dirs.push([Math.cos((k * Math.PI) / 180), Math.sin((k * Math.PI) / 180)]);
  const all = [...P, ...Q];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const d = [all[j][0] - all[i][0], all[j][1] - all[i][1]];
    if (Math.hypot(d[0], d[1]) > 1e-12) dirs.push([-d[1], d[0]], [d[1], -d[0]]);
  }
  for (const n of dirs) {
    const pMax = Math.max(...P.map((p) => dot(n, p))), qMin = Math.min(...Q.map((q) => dot(n, q)));
    if (pMax < qMin - 1e-9) return true;
  }
  return false;
}
export const ringSeparated = (M: Mat) => separable(RING.map((p) => matVec(M, p)), BLOB.map((p) => matVec(M, p)));
/** The try counts when it is a new matrix (not one already tried). */
export const newTry = (tried: Mat[], M: Mat) => !tried.some((N) => meqTol(N, M, 1e-6));

// ------------------------------------------------------------------ c12-p7 [S] · grouping

export const P7_CARDS: Mat[] = [SHEAR, TURN, STRETCH];             // A, then B, then C
export const P7_LEFT_FIRST: Mat = matMul(matMul(P7_CARDS[2], P7_CARDS[1]), P7_CARDS[0]);  // (CB)A
export const P7_RIGHT_FIRST: Mat = matMul(P7_CARDS[2], matMul(P7_CARDS[1], P7_CARDS[0])); // C(BA)

// ------------------------------------------------------------------ the Law: "In AB, [B / A] moves the grid first"

export interface LawCase { A: Mat; B: Mat; x: Vec }
const isTurnM = (M: Mat) => { const Q = matMul(transpose(M), M); return Math.abs(Q[0][0] - 1) + Math.abs(Q[1][1] - 1) + Math.abs(Q[0][1]) < 1e-9 && M[0][0] * M[1][1] - M[0][1] * M[1][0] > 0; };
export const lawCore: LawCore<LawCase> & { answer: Record<string, string> } = {
  id: 'c12-law',
  answer: { first: 'B', when: 'always' },
  gen: (r) => {
    const v = () => rint(r, -6, 6) / 2;
    return { A: [[v(), v()], [v(), v()]], B: [[v(), v()], [v(), v()]], x: [rint(r, -4, 4), rint(r, -4, 4)] };
  },
  edgeCases: [
    { A: SHEAR, B: TURN, x: [1, 0] },             // the chapter's pair: order shows
    { A: STRETCH, B: STRETCH, x: [1, 1] },        // they agree, and neither is a turn
    { A: TURN, B: turn(30), x: [1, 0] },          // two turns: they agree
    { A: PX, B: PY, x: [1, 1] },                  // both flatten
    { A: FLIP, B: SHEAR, x: [0, 1] },
  ],
  holds(f, c) {
    const fused = matVec(matMul(c.A, c.B), c.x);
    const lands = f.first === 'B' ? near(matVec(c.A, matVec(c.B, c.x)), fused, 1e-9) : near(matVec(c.B, matVec(c.A, c.x)), fused, 1e-9);
    return f.when === 'turns' ? !lands || (isTurnM(c.A) && isTurnM(c.B)) : lands;
  },
  describe: (c) => {
    const AB = matMul(c.A, c.B);
    return `A has columns ${fmtV(col(c.A, 0))}, ${fmtV(col(c.A, 1))} and B has columns ${fmtV(col(c.B, 0))}, ${fmtV(col(c.B, 1))}. For x = ${fmtV(c.x)}: B first then A gives ${fmtV(matVec(c.A, matVec(c.B, c.x)))}; A first then B gives ${fmtV(matVec(c.B, matVec(c.A, c.x)))}; AB x = ${fmtV(matVec(AB, c.x))}`;
  },
};
export const LAW_NEAR_MISSES: Record<string, string>[] = [{ first: 'A', when: 'always' }, { first: 'B', when: 'turns' }, { first: 'A', when: 'turns' }];

// ------------------------------------------------------------------ the Doubts

/** (F) "Shear then turn is the same as turn then shear." For shear amount k, turn angle θ, point p. */
export interface D1Case { k: number; deg: number; p: Vec }
export const shearBy = (k: number): Mat => [[1, k], [0, 1]];
export const turnBy = turn;
export const d1Holds = (c: D1Case) => near(matVec(matMul(turnBy(c.deg), shearBy(c.k)), c.p), matVec(matMul(shearBy(c.k), turnBy(c.deg)), c.p), 1e-6);

/** (F) "If AB is the zero matrix then A or B is zero." */
export const d2Holds = (A: Mat, B: Mat) => !isZero(matMul(A, B), 1e-9) || isZero(A) || isZero(B);
/** A random pair, half the time one whose product is zero (for the Shake to find). */
export function d2Random(r: () => number): [Mat, Mat] {
  const v = () => rint(r, -2, 2);
  if (r() < 0.5) {
    // B = b cᵀ, A = d eᵀ with e ⊥ b: AB = d (e·b) cᵀ = 0
    let b: Vec; do { b = [v(), v()]; } while (b[0] === 0 && b[1] === 0);
    let c: Vec; do { c = [v(), v()]; } while (c[0] === 0 && c[1] === 0);
    let d: Vec; do { d = [v(), v()]; } while (d[0] === 0 && d[1] === 0);
    const e = [-b[1], b[0]];
    return [[[d[0] * e[0], d[0] * e[1]], [d[1] * e[0], d[1] * e[1]]], [[b[0] * c[0], b[0] * c[1]], [b[1] * c[0], b[1] * c[1]]]];
  }
  return [[[v(), v()], [v(), v()]], [[v(), v()], [v(), v()]]];
}

/** (T) "Three moves give the same result however you group them." */
export const d3Holds = (A: Mat, B: Mat, C: Mat) => meqTol(matMul(matMul(C, B), A), matMul(C, matMul(B, A)), 1e-9);
