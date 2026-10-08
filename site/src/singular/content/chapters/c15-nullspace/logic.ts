// Chapter 15 pure logic (no DOM, no three): story numbers, win checks, doubt predicates, the Law
// core, the Teach Teo procedure core and the crew versions of the builds. Unit-tested in
// tests/singular/game-c15.test.ts. Chapter 16 reuses the helpers at the top.
import { C2, C2_NULL } from '../../truth.ts';
import { col, cross, dot, matVec, norm, nullspace, colspace, rank, rrefNum, vsub, vadd, vscale, type Mat, type Vec } from '../../../math/la.ts';
import { rint, rng, type LawCore } from '../../../game/lawcheck.ts';

export type Diff = 'cadet' | 'navigator' | 'commander';
export type P3 = [number, number, number];

/** Win tolerance by difficulty (GDD §7.1). */
export const winTol = (d: Diff): number => (d === 'commander' ? 0.01 : 0.05);

/** A number for display: up to two decimals, a true minus sign, no "−0". */
export const fmtN = (x: number): string => {
  const r = Math.round(x * 100) / 100;
  return Math.abs(r) < 1e-9 ? '0' : String(r).replace('-', '−');
};
export const fmtV = (v: readonly number[]): string => `(${v.map(fmtN).join(', ')})`;

export const len = (v: readonly number[]): number => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
/** Sine of the angle between two lines through the origin (0 when parallel, either sign). */
export function sinBetween(a: readonly number[], b: readonly number[]): number {
  const la = len(a), lb = len(b);
  if (la < 1e-12 || lb < 1e-12) return 1;
  return len(cross([...a], [...b])) / (la * lb);
}
export const parallel = (a: readonly number[], b: readonly number[], tol = 1e-6): boolean => sinBetween(a, b) <= tol;

// ------------------------------------------------------------------ the two-decimal model C₂

/** C₂'s columns: the two thruster directions from Act I and their sum. */
export const COLS: P3[] = [0, 1, 2].map((j) => col(C2, j) as P3);
/** The null space direction (1, 1, −1). */
export const NULL_DIR: P3 = [...C2_NULL] as P3;
/** A normal to the column space z = x + y. */
export const COL_NORMAL: P3 = cross(COLS[0], COLS[1]) as P3; // (−1, −1, 1)
/** C₂ x. */
export const land = (x: readonly number[]): P3 => matVec(C2, [...x]) as P3;
/** Distance from a point to the plane z = x + y (the column space of C₂). */
export const offPlane = (p: readonly number[]): number => Math.abs(dot([...p], COL_NORMAL)) / len(COL_NORMAL);
export const onLandingPlane = (p: readonly number[], tol = 1e-9): boolean => offPlane(p) <= tol;

// ------------------------------------------------------------------ p1 The landing plane

/** Starts for the test buoys: n points in a ball of radius r (seeded), so the landings are an ellipse. */
export function ballStarts(n: number, r = 1.25, seed = 1515): P3[] {
  const R = rng(seed);
  const out: P3[] = [];
  while (out.length < n) {
    const p: P3 = [R() * 2 - 1, R() * 2 - 1, R() * 2 - 1];
    if (len(p) <= 1) out.push([p[0] * r, p[1] * r, p[2] * r]);
  }
  return out;
}

/** How many points lie within tol of the plane through the origin with normal n. */
export function countOnPlane(n: readonly number[], pts: readonly (readonly number[])[], tol = 0.06): number {
  const l = len(n);
  if (l < 1e-9) return 0;
  return pts.filter((p) => Math.abs(dot([...p], [...n])) / l <= tol).length;
}

/** p1: the plane through the origin with normal n holds every landing exactly when n is along (1, 1, −1). */
export const p1Won = (n: readonly number[], tol = 0.02): boolean => len(n) > 0.2 && sinBetween(n, COL_NORMAL) <= tol;

// ------------------------------------------------------------------ p2 Possible landings

export const P2_TARGETS: P3[] = [[1, 2, 3], [1, 1, 1], [0, 0, 0], [2, -1, 1]];
/** The one target off the plane. */
export const P2_GAP_TARGET: P3 = [1, 1, 1];
/** Inputs that land on each reachable target (Show me). */
export const P2_INPUTS: Record<string, P3> = { '1,2,3': [1, 2, 0], '0,0,0': [0, 0, 0], '2,-1,1': [2, -1, 0] };
export const reachable = (b: readonly number[]): boolean => onLandingPlane(b, 1e-9);
export const p2Hit = (x: readonly number[], target: readonly number[], tol = 0.05): boolean => len(vsub(land(x), [...target])) <= tol;
/** The plane z = x + y stands at height x + y above (x, y). */
export const planeHeight = (x: number, y: number): number => x + y;
/** The vertical gap from (1, 1, 1) up to the plane is 1: the gap arrow of length g touches the plane at g = 1. */
export const p2GapOk = (g: number, tol = 0.05): boolean => Math.abs(P2_GAP_TARGET[2] + g - planeHeight(P2_GAP_TARGET[0], P2_GAP_TARGET[1])) <= tol;
/** Signed height of a point above the plane z = x + y, measured straight up (negative below). Chapter 15
 *  measures the gap to the landing plane this way everywhere; the perpendicular distance waits for c21. */
export const aboveLandingPlane = (p: readonly number[]): number => p[2] - planeHeight(p[0], p[1]);

// ------------------------------------------------------------------ p3 [H] Land on the origin

/** A start that is not the origin and lands on the origin. */
export const p3Won = (x: readonly number[], tol = 0.05): boolean => len(x) >= 0.3 && len(land(x)) <= tol;
/** How strongly the cadet violet preview glows for a start x (1 on the line, fading off it). */
export const violetPreview = (x: readonly number[]): number => (len(x) < 0.3 ? 0 : Math.exp(-3 * len(land(x)) ** 2));
/** The free variable z = 1 read from the reduced form [[1, 0, 1], [0, 1, 1], [0, 0, 0]]. */
export const P3_READ = { x: -1, y: -1, dir: [-1, -1, 1] as P3 };

// ------------------------------------------------------------------ p4 Same landing

export const P4_A: P3 = [2, 0, 1];
export const P4_B: P3 = [3, 1, 0];
export const P4_LAND: P3 = land(P4_A); // (3, 1, 4)
export const P4_TARGET: P3 = [1, 2, 3];
export const P4_PARTICULAR: P3 = [1, 2, 0];
/** The difference arrow from A to B lies on the null space line. */
export const diffOnNull = (a: readonly number[], b: readonly number[]): boolean => len(vsub([...b], [...a])) > 0.3 && parallel(vsub([...b], [...a]), NULL_DIR, 1e-6);
/** Three starts that each land on the target and are pairwise apart. */
export function threeStartsOk(starts: readonly (readonly number[])[], target: readonly number[] = P4_TARGET, tol = 0.05, apart = 0.3): boolean {
  if (starts.length < 3) return false;
  if (!starts.every((s) => len(vsub(land(s), [...target])) <= tol)) return false;
  for (let i = 0; i < starts.length; i++) for (let j = i + 1; j < starts.length; j++) if (len(vsub([...starts[i]], [...starts[j]])) < apart) return false;
  return true;
}

// ------------------------------------------------------------------ p5 [D] What counts as a landing set?

export type SetId = 'plane' | 'line' | 'shifted' | 'axes' | 'quarter';
export const SET_IDS: SetId[] = ['plane', 'line', 'shifted', 'axes', 'quarter'];
export const IMPOSTORS: SetId[] = ['shifted', 'axes', 'quarter'];
/** Short names for the candidate buttons. */
export const SET_SHORT: Record<SetId, string> = {
  plane: 'plane $z = x + y$',
  line: 'line along $(1, 1, -1)$',
  shifted: 'plane $z = x + y + 1$',
  axes: 'the two axes',
  quarter: 'a quarter of the floor',
};
export const SET_NAMES: Record<SetId, string> = {
  plane: 'the landing plane $z = x + y$',
  line: 'the line through $(1, 1, -1)$',
  shifted: 'the plane $z = x + y + 1$',
  axes: 'the $x$-axis and the $y$-axis together',
  quarter: 'one quarter of the floor: $z = 0$, $x \\ge 0$, $y \\ge 0$',
};

/** Is p in the candidate set? */
export function inSet(id: SetId, p: readonly number[], tol = 1e-6): boolean {
  const [x, y, z] = p;
  switch (id) {
    case 'plane': return Math.abs(z - x - y) / Math.sqrt(3) <= tol;
    case 'line': return sinBetween(p, NULL_DIR) * len(p) <= tol;
    case 'shifted': return Math.abs(z - x - y - 1) / Math.sqrt(3) <= tol;
    case 'axes': return (Math.abs(y) <= tol && Math.abs(z) <= tol) || (Math.abs(x) <= tol && Math.abs(z) <= tol);
    case 'quarter': return Math.abs(z) <= tol && x >= -tol && y >= -tol;
  }
}

/** The nearest point of the candidate set (keeps dragged test arrows on the set). */
export function toSet(id: SetId, p: readonly number[]): P3 {
  const [x, y, z] = p;
  switch (id) {
    case 'plane': case 'shifted': {
      const c = id === 'shifted' ? 1 : 0;
      // nearest point on z − x − y = c: move along (−1, −1, 1)
      const k = (z - x - y - c) / 3;
      return [x + k, y + k, z - k];
    }
    case 'line': { const k = dot([...p], NULL_DIR) / 3; return [k, k, -k]; }
    case 'axes': return Math.abs(x) >= Math.abs(y) ? [x, 0, 0] : [0, y, 0];
    case 'quarter': return [Math.max(0, x), Math.max(0, y), 0];
  }
}

/** Where a dragged test arrow may sit on the candidate set (snapped in room units; x, y within ±lim). */
export function snapToSet(id: SetId, p: readonly number[], snap: number | null, lim = 2): P3 {
  const q = (x: number) => (snap ? Math.round(x / snap) * snap : x);
  const c = (x: number) => Math.max(-lim, Math.min(lim, x));
  const x = c(q(p[0])), y = c(q(p[1]));
  switch (id) {
    case 'plane': return [x, y, x + y];
    case 'shifted': return [x, y, x + y + 1];
    case 'line': { const k = c(q(dot([...p], NULL_DIR) / 3)); return [k, k, -k]; }
    case 'axes': return Math.abs(p[0]) >= Math.abs(p[1]) ? [c(q(p[0])), 0, 0] : [0, c(q(p[1])), 0];
    case 'quarter': return [Math.max(0, x), Math.max(0, y), 0];
  }
}

export type TestOp = 'add' | 'stretch';
/** The test arrow: u + v, or k u. */
export const testResult = (op: TestOp, u: readonly number[], v: readonly number[], k: number): P3 =>
  (op === 'add' ? vadd([...u], [...v]) : vscale([...u], k)) as P3;
/** Does the test arrow escape the set (with both test arrows in it)? */
export function escapes(id: SetId, op: TestOp, u: readonly number[], v: readonly number[], k: number, tol = 1e-6): boolean {
  if (!inSet(id, u, tol) || (op === 'add' && !inSet(id, v, tol))) return false;
  return !inSet(id, testResult(op, u, v, k), tol);
}
/** The canonical escapes (Show me). */
export const P5_ESCAPES: Record<'shifted' | 'axes' | 'quarter', { op: TestOp; u: P3; v: P3; k: number }> = {
  shifted: { op: 'add', u: [0, 0, 1], v: [1, 0, 2], k: 1 },   // (1, 0, 3): 3 ≠ 1 + 0 + 1
  axes: { op: 'add', u: [2, 0, 0], v: [0, 1, 0], k: 1 },      // (2, 1, 0) is on neither axis
  quarter: { op: 'stretch', u: [2, 1, 0], v: [0, 0, 0], k: -1 }, // (−2, −1, 0) leaves the quarter
};
/** Each row of C₂ dotted with (1, 1, −1): all 0, so the violet line is perpendicular to every row. */
export const P5_ROW_DOTS: number[] = C2.map((r) => dot(r, NULL_DIR));
/** Commander: the closure argument, in order. */
export const P5_TILES = [
  { id: 't1', text: 'Take two inputs $\\mathbf u$, $\\mathbf v$ with $A\\mathbf u = \\mathbf 0$ and $A\\mathbf v = \\mathbf 0$.' },
  { id: 't2', text: '$A(\\mathbf u + \\mathbf v) = A\\mathbf u + A\\mathbf v = \\mathbf 0 + \\mathbf 0 = \\mathbf 0$.' },
  { id: 't3', text: '$A(c\\mathbf u) = c\\,A\\mathbf u = c\\,\\mathbf 0 = \\mathbf 0$.' },
  { id: 't4', text: 'So sums and stretches of inputs sent to the origin are sent to the origin too.' },
];
export const P5_DECOYS = [{ id: 'x1', text: '$A(\\mathbf u + \\mathbf v) = A\\mathbf u \\cdot A\\mathbf v$.' }];
/** t1 first, t4 last; t2 and t3 in either order. */
export function p5OrderOk(order: readonly string[]): boolean {
  if (order.length !== 4 || order[0] !== 't1' || order[3] !== 't4') return false;
  return [...order].sort().join() === 't1,t2,t3,t4';
}

// ------------------------------------------------------------------ p6 Move the elbow, not the hand

/** The salvage arm: three telescoping motors push the gripper along (1, 0), (0, 1) and (1, 1). */
export const ARM: Mat = [[1, 0, 1], [0, 1, 1]];
export const ARM_START: P3 = [2, 1, 1];
export const HANDLE: [number, number] = [3, 2];
export const PIPE = { c: [2, 0.5] as [number, number], r: 0.3 };
export const ARM_HALF = 0.08;
/** Base, first joint, elbow, gripper. */
export function armJoints(m: readonly number[]): [number, number][] {
  const j1: [number, number] = [m[0], 0];
  const j2: [number, number] = [m[0], m[1]];
  const g: [number, number] = [m[0] + m[2], m[1] + m[2]];
  return [[0, 0], j1, j2, g];
}
const segDist = (p: [number, number], a: [number, number], b: [number, number]): number => {
  const d = [b[0] - a[0], b[1] - a[1]], w = [p[0] - a[0], p[1] - a[1]];
  const L = d[0] * d[0] + d[1] * d[1];
  const t = L < 1e-12 ? 0 : Math.max(0, Math.min(1, (w[0] * d[0] + w[1] * d[1]) / L));
  return Math.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1]);
};
/** Closest approach of the arm to the pipe's centre. */
export function armGap(m: readonly number[]): number {
  const J = armJoints(m);
  return Math.min(segDist(PIPE.c, J[0], J[1]), segDist(PIPE.c, J[1], J[2]), segDist(PIPE.c, J[2], J[3]));
}
export const armClear = (m: readonly number[]): boolean => armGap(m) > PIPE.r + ARM_HALF;
export const gripperAt = (m: readonly number[]): [number, number] => matVec(ARM, [...m]) as [number, number];
/** Motors after running command c for amount t from the start. */
export const armMotors = (c: readonly number[], t: number): P3 => vadd(ARM_START, vscale([...c], t)) as P3;
/** A command keeps the gripper still exactly when A c = 0. */
export const stillCommand = (c: readonly number[], A: Mat = ARM): boolean => len(c) > 1e-9 && len(matVec(A, [...c])) <= 1e-9;
/** p6: a still command, run until the elbow clears the pipe, with the gripper on the handle. */
export function p6Won(c: readonly number[], t: number, tol = 0.05): boolean {
  const m = armMotors(c, t);
  const g = gripperAt(m);
  return stillCommand(c) && Math.abs(t) > 1e-9 && Math.hypot(g[0] - HANDLE[0], g[1] - HANDLE[1]) <= tol && armClear(m) && m.every((x) => Math.abs(x) <= 4 + 1e-9);
}

// ------------------------------------------------------------------ p7 [S] A damaged arm

export const ARM7: Mat = [[1, 2, 3], [2, 4, 6]];
/** Its reach: the line through (1, 2). */
export const offReach7 = (p: readonly number[], gap = 0.25): boolean => Math.abs(2 * p[0] - p[1]) / Math.sqrt(5) > gap;
export const p7Won = (target: readonly number[], c: readonly number[], d: readonly number[]): boolean =>
  offReach7(target) && stillCommand(c, ARM7) && stillCommand(d, ARM7) && !parallel(c, d, 1e-6);

// ------------------------------------------------------------------ Doubts

/** (F) "Start a point in the right place and the pulse can land it anywhere." Holds for a target it can reach. */
export const anywhereHolds = (target: readonly number[], tol = 1e-6): boolean => onLandingPlane(target, tol);
/** (F) "Any plane is a subspace." Holds for a plane n · x = d exactly when it passes through the origin. */
export const planeIsSubspace = (n: readonly number[], d: number): boolean => len(n) < 1e-9 || Math.abs(d) / len(n) < 1e-9;
/** (T) "If two starts land on the same point, their difference lands on the origin." */
export function sameLandingHolds(A: Mat, a: readonly number[], b: readonly number[], tol = 1e-6): boolean {
  const same = len(vsub(matVec(A, [...a]), matVec(A, [...b]))) <= tol;
  return !same || len(matVec(A, vsub([...a], [...b]))) <= tol * 10;
}

// ------------------------------------------------------------------ the Law: A x = b has a solution exactly when b is in Col A

export interface SolveCase { A: Mat; b: Vec }

export function solvable(A: Mat, b: Vec): boolean {
  const aug = A.map((r, i) => [...r, b[i]]);
  return !rrefNum(aug).pivots.includes(A[0].length);
}
const inNull = (A: Mat, v: Vec): boolean => v.length === A[0].length && len(matVec(A, v)) <= 1e-9;
const perpCol = (A: Mat, v: Vec): boolean => v.length === A.length && A[0].every((_, j) => Math.abs(dot(col(A, j), v)) <= 1e-9);
const perpNull = (A: Mat, v: Vec): boolean => v.length === A[0].length && nullspace(A).every((d) => Math.abs(dot(d, v)) <= 1e-9);

/** A random integer matrix of shape m × n and rank r (r ≤ min(m, n)), entries small. */
export function randRankMat(R: () => number, m: number, n: number, r: number): Mat {
  for (let tries = 0; tries < 50; tries++) {
    const U = Array.from({ length: m }, () => Array.from({ length: r }, () => rint(R, -2, 2)));
    const V = Array.from({ length: r }, () => Array.from({ length: n }, () => rint(R, -2, 2)));
    const A = U.map((row) => V[0].map((_, j) => row.reduce((s, u, k) => s + u * V[k][j], 0)));
    if (rank(A) === r) return A;
  }
  return Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => (i === j && i < r ? 1 : 0)));
}

export const lawCore: LawCore<SolveCase> & { answer: Record<string, string> } = {
  id: 'c15-law',
  answer: { rel: 'in', space: 'col' },
  gen(R) {
    const m = rint(R, 2, 3), n = rint(R, 2, 3);
    const r = rint(R, 1, Math.min(m, n));
    const A = randRankMat(R, m, n, r);
    const b = R() < 0.5 ? matVec(A, Array.from({ length: n }, () => rint(R, -2, 2))) : Array.from({ length: m }, () => rint(R, -3, 3));
    return { A, b };
  },
  edgeCases: [
    { A: C2, b: [1, 1, 1] },
    { A: C2, b: [1, 2, 3] },
    { A: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], b: [1, 2, 3] },
    { A: [[0, 0], [0, 0]], b: [0, 0] },
    { A: [[1, 2, 3], [2, 4, 6]], b: [1, 1] },
    { A: [[1, 0], [0, 1], [1, 1]], b: [1, 1, 2] },
  ],
  holds(f, c) {
    const yes = solvable(c.A, c.b);
    const member = f.space === 'col' ? solvable(c.A, c.b) : inNull(c.A, c.b);
    const perp = f.space === 'col' ? perpCol(c.A, c.b) : perpNull(c.A, c.b);
    const said = f.rel === 'in' ? member : f.rel === 'notin' ? !member : perp;
    return said === yes;
  },
  describe(c) {
    const yes = solvable(c.A, c.b);
    const rows = c.A.map((r) => `(${r.map(fmtN).join(', ')})`).join(', ');
    return `the matrix with rows ${rows} and b = ${fmtV(c.b)}: ${yes ? 'A x = b has a solution' : 'A x = b has no solution'}`;
  },
};

// ------------------------------------------------------------------ Teach Teo (T1): are my struts still holding volume?

export const TEO_NODE: P3 = [2, 1, 1];
export const TEO_ENDS: P3[] = [[3, 2, 1], [2, 2, 2], [3, 3, 2]];
export const TEO_TILES = [
  { id: 'k1', text: 'Take the three strut arrows from your node: each end minus the node.', py: 'a, b, c = [sub(e, node) for e in ends]' },
  { id: 'k2', text: 'Cross two of the strut arrows.', py: 'n = cross(a, b)' },
  { id: 'k3', text: 'Dot that with the third strut arrow.', py: 'vol = dot(n, c)' },
  { id: 'k4', text: 'If the number is zero, the box is flat: those struts hold no volume. Do not lean on them.', py: 'flat = abs(vol) < 1e-9' },
];
export const TEO_DECOYS = [
  { id: 'x1', text: 'Use the three end points as they are.', py: 'a, b, c = ends' },
  { id: 'x2', text: 'Add the three strut arrows and measure the length.', py: 'vol = length(add(add(a, b), c))' },
];
export const TEO_REF = ['k1', 'k2', 'k3', 'k4'];
export interface TeoRun { ok: boolean; vol: number | null; flat: boolean | null; missing: 'k1' | 'k2' | 'k3' | 'k4' | null; usedPositions: boolean }
/** Run Teo's steps literally. Missing K1 → he uses positions (−2: he trusts a flat set). */
export function runTeo(order: readonly string[]): TeoRun {
  const has = (k: string) => order.includes(k);
  const before = (a: string, b: string) => order.indexOf(a) >= 0 && order.indexOf(b) >= 0 && order.indexOf(a) < order.indexOf(b);
  const usedPositions = !has('k1') || has('x1') || (has('k1') && !before('k1', 'k2'));
  const vs = usedPositions ? TEO_ENDS.map((e) => [...e]) : TEO_ENDS.map((e) => vsub(e, TEO_NODE));
  if (!has('k2') || !has('k3') || !before('k2', 'k3')) return { ok: false, vol: null, flat: null, missing: !has('k2') ? 'k2' : 'k3', usedPositions };
  const vol = has('x2') ? len(vadd(vadd(vs[0], vs[1]), vs[2])) : dot(cross(vs[0], vs[1]), vs[2]);
  if (!has('k4') || !before('k3', 'k4')) return { ok: false, vol, flat: null, missing: 'k4', usedPositions };
  const flat = Math.abs(vol) < 1e-9;
  return { ok: !usedPositions && !has('x2') && flat, vol, flat, missing: usedPositions ? 'k1' : null, usedPositions };
}

// ------------------------------------------------------------------ crew versions of the builds (LANTERN's backup)

export const crew = {
  null_space: (A: Mat): Vec[] => nullspace(A),
  col_space: (A: Mat): Vec[] => colspace(A),
};
/** A random integer matrix for the test swarm (sometimes rank-deficient). */
export function swarmMat(R: () => number, d: Diff): Mat {
  const m = rint(R, 2, d === 'cadet' ? 3 : 4), n = rint(R, 2, d === 'cadet' ? 3 : 4);
  const r = rint(R, 1, Math.min(m, n));
  return randRankMat(R, m, n, r);
}
export { norm };
