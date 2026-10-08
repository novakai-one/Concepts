// Chapter 16 pure logic (no DOM, no three): story numbers, win checks, the survivor counter, doubt
// predicates, the Law core, the set piece (four rooms and the eleven stars), and the crew versions of
// the builds. Unit-tested in tests/singular/game-c16.test.ts.
import { C2 } from '../../truth.ts';
import { col, cross, det, dot, fromCols, matVec, nullspace, rank, rrefNum, transpose, type Mat, type Vec } from '../../../math/la.ts';
import { rint, type LawCore } from '../../../game/lawcheck.ts';
import { COLS, NULL_DIR, fmtN, fmtV, len, parallel, randRankMat, reachable, land, type Diff, type P3 } from '../c15-nullspace/logic.ts';

export { fmtN, fmtV, len, parallel, land, reachable, randRankMat, C2, COLS, NULL_DIR };
export type { Diff, P3 };

export const winTol = (d: Diff): number => (d === 'commander' ? 0.01 : 0.05);
export const nullity = (A: Mat): number => A[0].length - rank(A);
export const pivotCols = (A: Mat): number[] => rrefNum(A).pivots;
/** Do two lists of vectors span the same subspace? */
export function sameSpan(a: readonly (readonly number[])[], b: readonly (readonly number[])[]): boolean {
  const ra = a.length ? rank(fromCols(a.map((v) => [...v]))) : 0;
  const rb = b.length ? rank(fromCols(b.map((v) => [...v]))) : 0;
  const both = [...a, ...b];
  const rab = both.length ? rank(fromCols(both.map((v) => [...v]))) : 0;
  return ra === rb && rb === rab;
}
export const spanRank = (vs: readonly (readonly number[])[]): number => (vs.length ? rank(fromCols(vs.map((v) => [...v]))) : 0);

// ------------------------------------------------------------------ p1 Smallest set

export const P1_ARROWS: P3[] = [[1, 0, 1], [0, 1, 1], [1, 1, 2], [2, 1, 3]];
/** All four arrows lie on the landing plane z = x + y; the reach of all four is that plane. */
export const p1Reach = (keep: readonly number[]): number => spanRank(keep.map((i) => P1_ARROWS[i]));
/** p1: the fewest arrows with the same reach: exactly two, not on one line. */
export const p1Won = (keep: readonly number[]): boolean => keep.length === 2 && p1Reach(keep) === 2;

// ------------------------------------------------------------------ p2 [H] Count

export const P2_A: Mat = [[1, 2, 0, 1], [2, 4, 1, 4], [3, 6, 1, 5]];
export const P2_PIVOTS = [0, 2];
export const P2_NULL: Vec[] = [[-2, 1, 0, 0], [-1, 0, -2, 1]];
/** Two independent arrows that A sends to the origin. */
export function nullPairOk(A: Mat, vs: readonly (readonly number[])[], tol = 1e-9): boolean {
  if (vs.length !== 2) return false;
  if (!vs.every((v) => len(v) > 1e-9 && len(matVec(A, [...v])) <= tol)) return false;
  return spanRank(vs) === 2;
}
export const p2Won = (rk: number, nl: number, vs: readonly (readonly number[])[]): boolean => rk === 2 && nl === 2 && nullPairOk(P2_A, vs);

// ------------------------------------------------------------------ p3 The trap

/** Candidate arrows: A's four columns, then the reduced form's four columns. */
export const P3_R: Mat = rrefNum(P2_A).R;
export const P3_CANDS: { id: string; v: P3; from: 'A' | 'R'; j: number }[] = [
  ...[0, 1, 2, 3].map((j) => ({ id: `a${j + 1}`, v: col(P2_A, j) as P3, from: 'A' as const, j })),
  ...[0, 1, 2, 3].map((j) => ({ id: `r${j + 1}`, v: col(P3_R, j) as P3, from: 'R' as const, j })),
];
/** The plane spanned by two picks; does it hold every column of A? */
export function p3Won(pick: readonly string[]): boolean {
  if (pick.length !== 2) return false;
  const vs = pick.map((id) => P3_CANDS.find((c) => c.id === id)!.v);
  if (spanRank(vs) !== 2) return false;
  return [0, 1, 2, 3].every((j) => spanRank([...vs, col(P2_A, j)]) === 2);
}
/** How far a column of A sticks out of the plane through two arrows. */
export function stickOut(a: readonly number[], b: readonly number[], v: readonly number[]): number {
  const n = cross([...a], [...b]);
  const l = len(n);
  return l < 1e-12 ? len(v) : Math.abs(dot(n, [...v])) / l;
}

// ------------------------------------------------------------------ p4 Orders

/** A 3 × 4 with rank 2 and nullity 2. */
export const p4BuildOk = (M: Mat): boolean => M.length === 3 && M[0].length === 4 && rank(M) === 2 && nullity(M) === 2;
/** "Rank 3, nullity 2, four columns": the bar fills the four columns, keeps at most 3, and holds one of the order's numbers. */
export const p4BarA = (kept: number, flat: number): boolean => kept + flat === 4 && kept <= 3 && (kept === 3 || flat === 2);
/** "A 3 × 5 that flattens nothing": keep the most a 3-row matrix can keep (3); the other 2 are flattened. */
export const p4BarB = (kept: number, flat: number): boolean => kept + flat === 5 && kept === 3;
export const P4_ORDERS = [
  { id: 'A', rows: 3, cols: 4, text: 'rank 3, nullity 2, four columns', want: { kept: 3, flat: 2 } },
  { id: 'B', rows: 3, cols: 5, text: 'a 3 × 5 that flattens nothing', want: { kept: 5, flat: 0 } },
];

// ------------------------------------------------------------------ p5 [H] Strut bend profiles

/** The rate-of-bend rule a + bt + ct² → b + 2ct, on the numbers (a, b, c). */
export const D: Mat = [[0, 1, 0], [0, 0, 2], [0, 0, 0]];
export const P5_PROFILE: P3 = [5, -3, 2];
export const P5_RATE: P3 = matVec(D, P5_PROFILE) as P3; // (−3, 4, 0)
export const P5_NULL: P3 = [1, 0, 0];
/** 1 + t, t + t², 1 + t² as columns of numbers. */
export const P5_SET: Mat = fromCols([[1, 1, 0], [0, 1, 1], [1, 0, 1]]);
export const P5_DET = det(P5_SET); // 2
/** Where each of 1, t, t² lands under the rule: the columns of D. */
export const P5_LANDS: P3[] = [[0, 0, 0], [1, 0, 0], [0, 2, 0]];
/** Evaluate a profile (a, b, c) at t. */
export const profileAt = (p: readonly number[], t: number): number => p[0] + p[1] * t + p[2] * t * t;

// ------------------------------------------------------------------ p6 [D] Why kept + flattened = columns

export type Tag = 'kept' | 'flat';
/** Tags are right when kept marks exactly the pivot columns. */
export function tagsOk(A: Mat, tags: readonly (Tag | null)[]): boolean {
  const piv = pivotCols(A);
  return tags.length === A[0].length && tags.every((t, j) => t === (piv.includes(j) ? 'kept' : 'flat'));
}
/** Each flattened column's arrow (that free variable 1, the other free variables 0). */
export const freeArrows = (A: Mat): Vec[] => nullspace(A);
/** The six matrices of the derivation: two fixed, then the Shake (seeded by round). */
export function p6Matrix(round: number, R: () => number): Mat {
  if (round === 0) return P2_A;
  if (round === 1) return C2;
  const shapes: [number, number][] = [[2, 3], [3, 3], [3, 4], [2, 4], [3, 5], [4, 3]];
  const [m, n] = shapes[(round + Math.floor(R() * 6)) % shapes.length];
  return randRankMat(R, m, n, rint(R, 1, Math.min(m, n)));
}
export const P6_TILES = [
  { id: 't1', text: 'Reduce $A$. Each column is a pivot column or it is not.' },
  { id: 't2', text: 'Each pivot column adds one new output direction: rank = number of pivots.' },
  { id: 't3', text: 'Each non-pivot column is a free variable: one null space arrow each, so nullity = number of free columns.' },
  { id: 't4', text: 'Pivots + free columns = all the columns, so rank + nullity = $n$.' },
];
export const P6_DECOYS = [{ id: 'x1', text: 'Each zero row is a free variable, so nullity = number of zero rows.' }];
export function p6OrderOk(order: readonly string[]): boolean {
  if (order.length !== 4 || order[0] !== 't1' || order[3] !== 't4') return false;
  return [...order].sort().join() === 't1,t2,t3,t4';
}
/**
 * Navigator's typed argument for one tagged matrix (it must have a free column): the rank (pivot
 * columns), the arrow to the origin from its last free column (that variable 1, any other free ones 0),
 * the nullity (free columns) and their sum, the number of columns.
 */
export function p6Argument(A: Mat): { rank: number; freeCol: number; arrow: Vec; nullity: number; n: number } {
  const piv = pivotCols(A), n = A[0].length;
  const free = [...Array(n).keys()].filter((j) => !piv.includes(j));
  if (!free.length) throw new Error('p6Argument: no free column');
  return { rank: piv.length, freeCol: free[free.length - 1], arrow: freeArrows(A)[free.length - 1], nullity: free.length, n };
}
/** Commander's last line: a matrix of a new shape, given its rank; its nullity is typed (zero rows would say 1). */
export const P6_LAST = { m: 4, n: 6, rank: 3, nullity: 3 };

// ------------------------------------------------------------------ p7 [S] Extend to a basis of 3-D

export const P7_GIVEN: P3[] = [[1, 0, 1], [0, 1, 1]];
export const p7Won = (v: readonly number[]): boolean => Math.abs(det(fromCols([...P7_GIVEN, [...v]]))) > 1e-9;

// ------------------------------------------------------------------ Doubts

/** (F) "Use the columns of the reduced matrix as a basis for the column space." Holds when they span Col A. */
export function reducedColsHold(A: Mat): boolean {
  const { R, pivots } = rrefNum(A);
  return sameSpan(pivots.map((j) => col(R, j)), pivots.map((j) => col(A, j)));
}
/** On the plane z = x + y: is a pair of arrows a basis of it? */
export const planeBasis = (a: readonly number[], b: readonly number[]): boolean =>
  [a, b].every((v) => Math.abs(v[2] - v[0] - v[1]) < 1e-9) && spanRank([a, b]) === 2;
/** (F) "A subspace has only one basis." Holds unless the scene shows two different bases of the plane. */
export function oneBasisHolds(p: readonly (readonly number[])[], q: readonly (readonly number[])[]): boolean {
  const differ = !(sameSet(p, q));
  return !(planeBasis(p[0], p[1]) && planeBasis(q[0], q[1]) && differ);
}
const sameSet = (p: readonly (readonly number[])[], q: readonly (readonly number[])[]) =>
  p.every((v) => q.some((w) => len(v.map((x, i) => x - w[i])) < 1e-9)) && q.every((v) => p.some((w) => len(v.map((x, i) => x - w[i])) < 1e-9));
/** (T) "Every basis of a plane has exactly two arrows." For arrows on the plane z = x + y. */
export function twoArrowsHolds(vs: readonly (readonly number[])[]): boolean {
  const onPlane = vs.every((v) => Math.abs(v[2] - v[0] - v[1]) < 1e-9);
  const isBasis = onPlane && vs.length > 0 && spanRank(vs) === 2 && spanRank(vs) === vs.length;
  return !isBasis || vs.length === 2;
}

// ------------------------------------------------------------------ the Law: rank + nullity = number of columns

export interface ShapeCase { A: Mat }
export const lawCore: LawCore<ShapeCase> & { answer: Record<string, string> } = {
  id: 'c16-law',
  answer: { op: 'plus', count: 'cols' },
  gen(R) {
    const m = rint(R, 1, 5), n = rint(R, 1, 5);
    return { A: randRankMat(R, m, n, rint(R, 0, Math.min(m, n)) || 1) };
  },
  edgeCases: [
    { A: C2 },
    { A: P2_A },
    { A: [[1, 2, 3], [2, 4, 6]] },
    { A: [[1, 0], [0, 1], [1, 1]] },
    { A: [[0, 0, 0], [0, 0, 0]] },
    { A: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] },
  ],
  holds(f, c) {
    const r = rank(c.A), nl = nullity(c.A);
    const lhs = f.op === 'plus' ? r + nl : f.op === 'times' ? r * nl : r - nl;
    const rhs = f.count === 'cols' ? c.A[0].length : f.count === 'rows' ? c.A.length : c.A.flat().filter((x) => Math.abs(x) > 1e-12).length;
    return lhs === rhs;
  },
  describe(c) {
    const m = c.A.length, n = c.A[0].length;
    return `a ${m} × ${n} matrix with rank ${rank(c.A)} and nullity ${nullity(c.A)}`;
  },
};

// ------------------------------------------------------------------ the set piece: four rooms

export const M4: Mat = [[1, 2, 3], [2, 4, 6], [1, 1, 1]];
export const M4_ROWS: P3[] = M4.map((r) => r as P3);
export const M4_COLS: P3[] = [0, 1, 2].map((j) => col(M4, j) as P3);
export const ROW_NORMAL: P3 = [1, -2, 1];
export const COL_NORMAL4: P3 = [2, -1, 0];
/** The row space from two picked rows: independent rows, so the plane holds every row. */
export const rowPickOk = (i: number, j: number): boolean => i !== j && spanRank([M4_ROWS[i], M4_ROWS[j]]) === 2;
export const colPickOk = (i: number, j: number): boolean => i !== j && spanRank([M4_COLS[i], M4_COLS[j]]) === 2;
/** The null space line: M d = 0, d ≠ 0. */
export const nullDirOk = (d: readonly number[]): boolean => len(d) > 1e-9 && len(matVec(M4, [...d])) < 1e-9;
/** The left null space line: Mᵀ e = 0, e ≠ 0. */
export const leftNullOk = (e: readonly number[]): boolean => len(e) > 1e-9 && len(matVec(transpose(M4), [...e])) < 1e-9;

// ------------------------------------------------------------------ the set piece: one fact, eleven stars (on C₂)

export const STARS = [
  { id: 'flat', text: 'The pulse flattens the lattice onto a plane.' },
  { id: 'dep', text: 'The columns are dependent: a loop of weights.' },
  { id: 'reach', text: 'The columns do not reach every point.' },
  { id: 'nonemany', text: 'Some targets have no solution; others have a line of them.' },
  { id: 'nopivot', text: 'A column has no pivot.' },
  { id: 'notI', text: 'The reduced row echelon form is not $I$.' },
  { id: 'null', text: 'The null space holds an arrow other than $\\mathbf 0$.' },
  { id: 'rank', text: 'The rank is less than 3.' },
  { id: 'noinv', text: 'Two starts land together, so there is no inverse.' },
  { id: 'triple', text: 'The scalar triple product of the columns is 0.' },
  { id: 'det', text: 'The determinant is 0.' },
] as const;
export type StarId = (typeof STARS)[number]['id'];
export const C2_TRIPLE = dot(COLS[0], cross(COLS[1], COLS[2]));
export const starChecks = {
  dep: (w: readonly number[]) => len(w) > 1e-9 && len(matVec(C2, [...w])) < 1e-9,
  reach: (b: readonly number[]) => !reachable(b),
  nonemany: (none: readonly number[], many: readonly number[]) => !reachable(none) && reachable(many),
  nopivot: (j: number) => !rrefNum(C2).pivots.includes(j),
  notI: (row3: readonly number[]) => row3.length === 3 && row3.every((x) => Math.abs(x) < 1e-9),
  null: (x: readonly number[]) => len(x) > 1e-9 && len(land(x)) < 1e-9,
  rank: (r: number) => r === rank(C2),
  noinv: (a: readonly number[], b: readonly number[]) => len(a.map((x, i) => x - b[i])) > 1e-9 && len(land(a).map((x, i) => x - land(b)[i])) < 1e-9,
  triple: (t: number) => Math.abs(t - C2_TRIPLE) < 1e-9,
  det: (d0: number) => Math.abs(d0 - det(C2)) < 1e-9,
};

// ------------------------------------------------------------------ Vell's claims (the act Review)

/**
 * (T) "Anything flattened is gone", on the two-decimal model. Two different starts that land together
 * leave one landing, and any undo U would need U(C₂a) = a and U(C₂b) = b with C₂a = C₂b: impossible. Starts
 * that land apart flatten nothing between them. So the claim holds for every pair the scene can show.
 */
export const goneHolds = (_a: readonly number[], _b: readonly number[]): boolean => true;
/** Two different starts with one landing on the two-decimal model: the case Vell shows. */
export const landTogether = (a: readonly number[], b: readonly number[]): boolean =>
  len(a.map((x, i) => x - b[i])) > 1e-9 && len(land(a).map((x, i) => x - land(b)[i])) < 1e-9;

/** (F) "Rank 2 in a 3 × 3 means two directions are crushed." */
export const rank2TwoCrushedHolds = (A: Mat): boolean => !(A.length === 3 && A[0].length === 3 && rank(A) === 2) || nullity(A) === 2;
/** (F) "The row space and the column space are always the same plane." */
export const rowEqColHolds = (A: Mat): boolean => sameSpan(A.map((r) => r), [0, 1, 2].map((j) => col(A, j)).slice(0, A[0].length));
/** (T) "The null space is perpendicular to every row." */
export const nullPerpRowsHolds = (A: Mat): boolean => nullspace(A).every((v) => A.every((r) => Math.abs(dot(r, v)) < 1e-9));

// ------------------------------------------------------------------ crew versions of the builds

export const crew = {
  rank: (A: Mat): number => rank(A),
  basis_for_span: (vs: Vec[]): Vec[] => {
    const A = fromCols(vs);
    return rrefNum(A).pivots.map((j) => vs[j].slice());
  },
};
/** A random list of small integer vectors (some dependent). */
export function swarmVecs(R: () => number, d: Diff): Vec[] {
  const n = rint(R, 2, d === 'cadet' ? 3 : 4), k = rint(R, 1, d === 'cadet' ? 3 : 5);
  const A = randRankMat(R, n, k, rint(R, 1, Math.min(n, k)));
  return Array.from({ length: k }, (_, j) => col(A, j));
}
