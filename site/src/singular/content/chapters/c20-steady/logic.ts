// Chapter 20 pure logic (no DOM, no three): every number, win check, doubt predicate, the Law core, the
// Procedure's literal run, the set piece and the crew version of steady_state. Unit-tested in
// tests/singular/game-c20.test.ts. Story numbers come from truth.ts (DRONES, DRONES_START, DRONES_STEADY, V,
// VELL_CUTTER); nothing here retypes them.
import { DRONES, DRONES_START, DRONES_STEADY, V, VELL_CUTTER } from '../../truth.ts';
import { det, fromCols, identity, inverse, matMul, matVec, meq, mpow, nullspace, rank, transpose, veq, type Mat, type Vec } from '../../../math/la.ts';
import { rint, type LawCore } from '../../../game/lawcheck.ts';
import { fmtN, fmtV } from '../c18-eigen/logic.ts';

export { fmtN, fmtV };
export const STATIONS = ['Bow', 'Mid', 'Stern'];
export const TOTAL = DRONES_START.reduce((a, b) => a + b, 0);

/** Column sums (each column is "from" one station). */
export const colSums = (P: Mat): number[] => P[0].map((_, j) => P.reduce((s, r) => s + r[j], 0));
export const isStochastic = (P: Mat, tol = 1e-9): boolean => P.every((r) => r.every((x) => x >= -tol)) && colSums(P).every((s) => Math.abs(s - 1) < tol);
/** The state after k hours. */
export const after = (P: Mat, x: readonly number[], k: number): Vec => matVec(mpow(P, k), x as Vec);
/** The steady state scaled to `total`: the null space of P − I. Null when it is not a single line. */
export function steadyOf(P: Mat, total = 1): Vec | null {
  const ns = nullspace(P.map((r, i) => r.map((x, j) => (Math.abs(x - (i === j ? 1 : 0)) < 1e-12 ? 0 : x - (i === j ? 1 : 0)))));
  if (ns.length !== 1) return null;
  const s = ns[0].reduce((a, b) => a + b, 0);
  return ns[0].map((x) => (x / s) * total);
}

// ------------------------------------------------------------------ whole drones, and the triangle of splits

/** Split integers by largest remainder so they add to `total`. */
export function apportion(x: readonly number[], total: number): number[] {
  const s = x.reduce((a, b) => a + b, 0) || 1;
  const raw = x.map((t) => (t / s) * total);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((t, i) => [t - Math.floor(t), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) out[order[k][1]]++;
  return out;
}

export const TRI: [number, number][] = [[-2.8, -1.6], [2.8, -1.6], [0, 3.25]];
/** A split (b, m, s) as a point in the triangle. */
export const triPoint = (x: readonly number[]): [number, number, number] => { const s = x.reduce((a, b) => a + b, 0) || 1; return [TRI.reduce((t, v, i) => t + v[0] * (x[i] / s), 0), TRI.reduce((t, v, i) => t + v[1] * (x[i] / s), 0), 0]; };
/** A point in the plane back to the nearest split (clamped into the triangle), scaled to `total`. */
export function triSplit(q: readonly number[], total: number): Vec {
  const [[x1, y1], [x2, y2], [x3, y3]] = TRI;
  const d = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
  let a = ((y2 - y3) * (q[0] - x3) + (x3 - x2) * (q[1] - y3)) / d;
  let b = ((y3 - y1) * (q[0] - x3) + (x1 - x3) * (q[1] - y3)) / d;
  let c = 1 - a - b;
  a = Math.max(0, a); b = Math.max(0, b); c = Math.max(0, c);
  const s = a + b + c;
  return [a / s * total, b / s * total, c / s * total];
}


// ------------------------------------------------------------------ p1 · one hour

export const P1_HOUR1: Vec = matVec(DRONES, DRONES_START);
export const P1_HOUR2: Vec = matVec(DRONES, P1_HOUR1);
/** The shares as told: from each station, where its drones go (stay, then the other two). */
export const SHARES: { from: number; to: number; share: number }[] = DRONES[0].flatMap((_, j) => DRONES.map((row, i) => ({ from: j, to: i, share: row[j] })));
export const p1Won = (M: Mat, tol = 1e-9): boolean => meq(M, DRONES, tol);
/** The misconception: shares written along the rows (the transpose). Drones appear from nowhere. */
export const P1_ROWS: Mat = transpose(DRONES);
export const P1_ROWS_HOUR1: Vec = matVec(P1_ROWS, DRONES_START);

// ------------------------------------------------------------------ p2 [H] [X9] · where it settles

/** 10(P − I): the same null space, whole numbers. */
export const P2_AUG: number[][] = DRONES.map((r, i) => [...r.map((x, j) => Math.round((x - (i === j ? 1 : 0)) * 10)), 0]);
export const P2_Q1: Vec = (() => { const q = nullspace(P2_AUG.map((r) => r.slice(0, 3)))[0]; return q.map((x) => x / q[2]); })();
export const P2_STEADY: Vec = DRONES_STEADY;
export const p2Won = (q: readonly number[], tol = 1e-6): boolean => veq(q as Vec, DRONES_STEADY, tol);

// ------------------------------------------------------------------ p3 · different starts

export const P3_STARTS: Vec[] = [[300, 0, 0], [0, 0, 300], [100, 100, 100]];
export const HOURS = 40;
export const settlesTo = (P: Mat, x: readonly number[], q: readonly number[], hours = HOURS, tol = 0.5): boolean => veq(after(P, x, hours), q as Vec, tol);

// ------------------------------------------------------------------ p4 [D] · why 1 is always an eigenvalue

export const ONES: Vec = [1, 1, 1];
export const P4_PT1: Vec = matVec(transpose(DRONES), ONES);
export const shiftDet = (P: Mat, l: number): number => det(P.map((r, i) => r.map((x, j) => x - (i === j ? l : 0))));
/** The other eigenvalues of the drone chain: 0.6 and 0.5. */
export const P4_OTHERS = [0.6, 0.5];
export const P4_TILES = [
  { id: 'a', text: 'Each column of $P$ adds to 1, so $P^{\\mathsf T}\\mathbf 1 = \\mathbf 1$: 1 is an eigenvalue of $P^{\\mathsf T}$' },
  { id: 'b', text: 'So $P^{\\mathsf T} - I$ flattens space: $\\det(P^{\\mathsf T} - I) = 0$' },
  { id: 'c', text: '$P^{\\mathsf T} - I = (P - I)^{\\mathsf T}$, and a transpose has the same determinant' },
  { id: 'd', text: 'So $\\det(P - I) = 0$: 1 is an eigenvalue of $P$ too' },
];
export const P4_DECOYS = [{ id: 'x', text: 'Each row of $P$ adds to 1, so $P\\mathbf 1 = \\mathbf 1$' }];
export const P4_ORDER = ['a', 'b', 'c', 'd'];

// ------------------------------------------------------------------ p5 · design the rules

/** The drone chain with the Stern's stay share s (leavers split evenly between Bow and Mid). */
export const designP = (s: number): Mat => fromCols([[0.8, 0.1, 0.1], [0.2, 0.7, 0.1], [(1 - s) / 2, (1 - s) / 2, s]]);
export const sternAt = (pct: number): number => steadyOf(designP(pct / 100), TOTAL)![2];
export const NEED = 100;
/** The smallest whole percent that settles at least 100 at the Stern: 80. */
export const P5_BEST = (() => { for (let p = 50; p <= 99; p++) if (sternAt(p) >= NEED - 1e-9) return p; return -1; })();
export const P5_STEADY: Vec = steadyOf(designP(P5_BEST / 100), TOTAL)!;
export const p5Won = (pct: number): boolean => pct === P5_BEST;

// ------------------------------------------------------------------ p6 · the swap

export const SWAP: Mat = [[0, 1], [1, 0]];
export const bays = (stay: number): Mat => [[stay, 1 - stay], [1 - stay, stay]];
export const BAYS = 100;
/** Settled: one more hour changes nothing (to half a drone). */
export const settled2 = (P: Mat, x: readonly number[], tol = 0.5): boolean => Math.hypot(...matVec(P, x as Vec).map((t, i) => t - x[i])) < tol;
export const p6Won = (swapHours: number, stay: number, settledNow: boolean): boolean => swapHours >= 4 && stay > 0 && settledNow;

// ------------------------------------------------------------------ p7 [S] · PageRank on four terminals

export const TERMINALS = ['A', 'B', 'C', 'D'];
export const LINKS: Record<string, string> = { A: 'BC', B: 'C', C: 'A', D: 'C' };
export const DAMPING = 0.85;
export const LINK_M: Mat = (() => {
  const G = TERMINALS.map(() => TERMINALS.map(() => 0));
  for (const [s, ts] of Object.entries(LINKS)) for (const t of ts) G[TERMINALS.indexOf(t)][TERMINALS.indexOf(s)] = 1 / ts.length;
  return G.map((r) => r.map((x) => DAMPING * x + (1 - DAMPING) / TERMINALS.length));
})();
export const PR: Vec = steadyOf(LINK_M)!;
export const PR_ORDER: string[] = TERMINALS.slice().sort((a, b) => PR[TERMINALS.indexOf(b)] - PR[TERMINALS.indexOf(a)]);
/** Steps of repetition from the even start until the change is under 0.001: 13. */
export const PR_STEPS = (() => { let x = [0.25, 0.25, 0.25, 0.25], k = 0; for (;;) { const y = matVec(LINK_M, x); k++; if (Math.max(...y.map((t, i) => Math.abs(t - x[i]))) < 1e-3) return k; x = y; } })();
export const p7Won = (order: readonly string[]): boolean => order.join('') === PR_ORDER.join('');

// ------------------------------------------------------------------ the Briefing: Doubts

/** (F) "Where they end up depends on where they start." Holds when two starts end apart after 60 hours. */
export const startMattersHolds = (P: Mat, a: readonly number[], b: readonly number[]): boolean => {
  const sa = a.reduce((s, x) => s + x, 0), sb = b.reduce((s, x) => s + x, 0);
  const ea = after(P, a.map((x) => x / sa), 60), eb = after(P, b.map((x) => x / sb), 60);
  return Math.hypot(...ea.map((x, i) => x - eb[i])) > 1e-3;
};
/** Settles from every start: P^256 and P^257 agree (every other eigenvalue smaller than 1 in size has died away). */
export const settlesFromAll = (P: Mat): boolean => { const A = mpow(P, 256), B = matMul(P, A); return meq(A, B, 1e-6); };
/** (F) "Every chain settles." The same test as the Law: P^k stops changing (|λ₂| = 0.9 still settles; the swap never does). */
export const settlesHolds = (P: Mat): boolean => settlesFromAll(P);
/** (T) "Steady state does not mean the drones stop moving." At the steady state, drones still change station each hour. */
export function movingAtSteady(P: Mat, total = TOTAL): number {
  const q = steadyOf(P, total);
  if (!q) return 0;
  return P.reduce((s, r, i) => s + r.reduce((t, x, j) => t + (i === j ? 0 : x * q[j]), 0), 0);
}
export const stillMovingHolds = (P: Mat): boolean => { const q = steadyOf(P, TOTAL); return !!q && veq(matVec(P, q), q, 1e-6) && movingAtSteady(P) > 1e-6; };
/** The flows at the drone chain's steady state: [from][to] drones per hour. */
export const STEADY_FLOWS: number[][] = DRONES_STEADY.map((qj, j) => DRONES.map((row) => row[j] * qj));

/** (T, Review) "Eigenvalues of a triangular matrix are on its diagonal." */
export function triangularHolds(U: Mat): boolean {
  const n = U.length;
  // det(U − λI) is the product down the diagonal: check it vanishes at each diagonal entry
  return U.every((_, i) => Math.abs(det(U.map((r, a) => r.map((x, b) => x - (a === b ? U[i][i] : 0))))) < 1e-9) && n > 0;
}

/**
 * The real eigenvalues of a 3 × 3 matrix, with multiplicity, from det(A − λI) = 0 (never read off the
 * diagonal, so the Review's readout is independent evidence). One real root by bisection, the cubic deflated
 * to a quadratic, and a near-zero discriminant (relative) read as a double root: a repeated eigenvalue such
 * as 2, 2, 2 keeps all three copies. Largest first.
 */
export function eigvalsWithMult3(A: Mat): number[] {
  const tr = A[0][0] + A[1][1] + A[2][2];
  const m2 = A[0][0] * A[1][1] - A[0][1] * A[1][0] + A[0][0] * A[2][2] - A[0][2] * A[2][0] + A[1][1] * A[2][2] - A[1][2] * A[2][1];
  const d = det(A);
  // λ³ + bλ² + cλ + e
  const b = -tr, c = m2, e = -d;
  const p = (l: number) => ((l + b) * l + c) * l + e;
  const R = 1 + Math.max(Math.abs(b), Math.abs(c), Math.abs(e));
  let lo = -R, hi = R;
  for (let k = 0; k < 200 && hi - lo > 0; k++) {
    const mid = (lo + hi) / 2;
    if (mid === lo || mid === hi) break;
    if (p(mid) > 0) hi = mid; else lo = mid;
  }
  let r = (lo + hi) / 2;
  // polish where the slope allows (a simple root); a repeated root stays where bisection put it
  for (let k = 0; k < 4; k++) { const s = (3 * r + 2 * b) * r + c; if (Math.abs(s) < 1e-6) break; const nr = r - p(r) / s; if (!Number.isFinite(nr) || Math.abs(p(nr)) > Math.abs(p(r))) break; r = nr; }
  // deflate: λ² + Bλ + C
  const B = b + r, Cq = c + r * B;
  const disc = B * B - 4 * Cq;
  const tol = 1e-8 * (B * B + 4 * Math.abs(Cq)) + 1e-12;
  const out = [r];
  if (Math.abs(disc) <= tol) out.push(-B / 2, -B / 2);
  else if (disc > 0) { const q = -(B + Math.sign(B || 1) * Math.sqrt(disc)) / 2; out.push(q, q !== 0 ? Cq / q : -B - q); }
  return out.sort((x, y) => y - x);
}

// ------------------------------------------------------------------ the Law

export interface ChainCase { P: Mat }
/** Random column-stochastic matrix (entries ≥ 0, columns add to 1), 2 × 2 or 3 × 3. */
export function randChain(r: () => number, n = r() < 0.5 ? 2 : 3, floor = 0): Mat {
  const cols = Array.from({ length: n }, () => { const c = Array.from({ length: n }, () => floor + rint(r, 0, 10)); const s = c.reduce((a, b) => a + b, 0) || 1; return c.map((x, i) => (s === 0 ? (i === 0 ? 1 : 0) : x / s)); });
  return fromCols(cols.map((c) => (c.every((x) => x === 0) ? c.map((_, i) => (i === 0 ? 1 : 0)) : c)));
}
export const LAW_CORE: LawCore<ChainCase> & { answer: Record<string, string> } = {
  id: 'c20-law',
  answer: { then: 'eig1' },
  gen: (r) => ({ P: randChain(r) }),
  edgeCases: [
    { P: SWAP },
    { P: identity(2) },
    { P: [[0, 0, 1], [1, 0, 0], [0, 1, 0]] },
    { P: DRONES },
    { P: [[1, 0.5], [0, 0.5]] },
  ],
  holds(f, c) {
    const P = c.P;
    if (f.then === 'eig1') return Math.abs(det(P.map((r, i) => r.map((x, j) => x - (i === j ? 1 : 0))))) < 1e-9;
    if (f.then === 'settles') return settlesFromAll(P);
    if (f.then === 'unique') return rank(P.map((r, i) => r.map((x, j) => x - (i === j ? 1 : 0)))) === P.length - 1;
    // 'smaller': every other eigenvalue is smaller than 1 in size: P^k tends to one steady state for every start
    return settlesFromAll(P) && rank(mpow(P, 256)) === 1;
  },
  describe(c) {
    const plain = `(${c.P.map((r) => r.map((x) => fmtN(Math.round(x * 100) / 100)).join(', ')).join('; ')})`;
    const s = settlesFromAll(c.P), u = rank(c.P.map((r, i) => r.map((x, j) => x - (i === j ? 1 : 0)))) === c.P.length - 1;
    return `P = ${plain}: its columns add to 1; ${s ? 'it settles' : 'it never settles'}${u ? '' : '; more than one arrangement never changes'}`;
  },
};
export const LAW_NEAR_MISSES: Record<string, string>[] = [{ then: 'settles' }, { then: 'smaller' }, { then: 'unique' }];

// ------------------------------------------------------------------ the Procedure: steady state by repetition

export const PROC_REF = ['start', 'apply', 'rescale', 'repeat'];
export const PROC_KEYS = ['apply', 'rescale', 'repeat'];
export const PROC_START: Vec = DRONES_START.slice();
export interface ProcRun { ok: boolean; message: string; trace: Vec[]; result: Vec | null; repeats: number; fault: string | null }

/** Shares to three decimals, zeros kept: (0.501, 0.299, 0.200). */
export const procShares = (x: readonly number[]): string => `(${x.map((t) => t.toFixed(3).replace(/^-/, '−')).join(', ')})`;
/** Run the tiles literally on the drone chain. "Repeat" repeats every step above it until the change is under 0.001. */
export function runProc(ids: readonly string[]): ProcRun {
  const at = ids.indexOf('repeat');
  const body = at >= 0 ? ids.slice(0, at) : ids.slice();
  const after2 = at >= 0 ? ids.slice(at + 1) : [];
  let x: Vec | null = null;
  const trace: Vec[] = [];
  const doStep = (id: string) => {
    if (id === 'start') x = PROC_START.slice();
    else if (id === 'expect') x = [0.4, 0.3, 0.3];
    else if (!x) return;
    else if (id === 'apply') x = matVec(DRONES, x);
    // a zero arrangement (after SOLVE Pq = 0) has nothing to rescale: leave it, never divide by zero
    else if (id === 'rescale') { const s = x.reduce((a, b) => a + b, 0); if (Math.abs(s) > 1e-12) x = x.map((t) => t / s); }
    else if (id === 'len') { const s = Math.hypot(...x); if (s > 1e-12) x = x.map((t) => t / s); }
    else if (id === 'solve0') x = matVec(inverse(DRONES)!, [0, 0, 0]);
    if (x) trace.push(x.slice());
  };
  let repeats = 0;
  if (at >= 0) {
    // the steps above "repeat", once, then again until the change is small
    const loop = body.filter((id) => id !== 'start' && id !== 'expect');
    for (const id of body) doStep(id);
    if (loop.length) {
      for (let k = 0; k < 400; k++) {
        const before: Vec | null = x ? (x as Vec).slice() : null;
        for (const id of loop) doStep(id);
        repeats++;
        if (!x || !before) break;
        if (Math.max(...(x as Vec).map((t, i) => Math.abs(t - before[i]))) < 1e-3) break;
      }
    }
    for (const id of after2) doStep(id);
  } else for (const id of body) doStep(id);
  const res = x as Vec | null;
  const want = steadyOf(DRONES)!;
  const fail = (fault: string, message: string): ProcRun => ({ ok: false, message, trace, result: res, repeats, fault });
  if (!ids.includes('start') && !ids.includes('expect')) return fail('nostart', 'LANTERN has nothing to apply $P$ to. Start with any arrangement, for example all 300 drones at the Bow.');
  if (!res) return fail('nostart', 'LANTERN has nothing to apply $P$ to. The start has to come first.');
  if (ids.includes('solve0')) return fail('solve0', 'LANTERN solved $P\\mathbf q = \\mathbf 0$ and found $\\mathbf q = \\mathbf 0$: no drones anywhere. The steady state solves $P\\mathbf q = \\mathbf q$.');
  if (ids.includes('expect')) return fail('expect', 'LANTERN started at the answer you expected, $(0.4, 0.3, 0.3)$. Starting there assumes what you wanted to find; start anywhere and let the repeats decide.');
  if (!ids.includes('apply')) return fail('noapply', `LANTERN never applied $P$. It reports the start, ${fmtV(res.map((t) => Math.round(t * 1000) / 1000))}, unchanged.`);
  if (at < 0 || !body.includes('apply')) return fail('once', `LANTERN applied $P$ once and stopped: ${fmtV(res.map((t) => Math.round(t * 1000) / 1000))}. That is one hour, not where the drones settle. Repeat until the change is small.`);
  const sum = res.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 1e-6) return fail(ids.includes('len') ? 'len' : 'norescale', ids.includes('len') ? `LANTERN rescaled to length 1: ${fmtV(res.map((t) => Math.round(t * 1000) / 1000))}, which adds to ${fmtN(Math.round(sum * 100) / 100)}. Shares must add to 1.` : `LANTERN reports ${fmtV(res.map((t) => Math.round(t * 10) / 10))}: drone counts, not shares. They add to ${fmtN(Math.round(sum))}. Rescale so they add to 1.`);
  if (!veq(res, want, 2e-3)) return fail('values', `LANTERN reports ${fmtV(res.map((t) => Math.round(t * 1000) / 1000))}. The drones settle at (0.5, 0.3, 0.2).`);
  const [b3, m3, s3] = res.map((t) => Math.round(t * TOTAL));
  return { ok: true, message: `After ${repeats} repeats the change is under 0.001. To three decimals the shares are ${procShares(res)}: about ${b3}, ${m3} and ${s3} of the ${TOTAL} drones. The exact steady state is ${fmtV(want.map((t) => Math.round(t * 1000) / 1000))}.`, trace, result: res, repeats, fault: null };
}

// ------------------------------------------------------------------ build: the crew version

export const crewSteady = (P: Mat): Vec => steadyOf(P)!;
/** A regular chain for the swarm: every entry at least 0.05, so it settles. */
export function steadyCase(r: () => number, level: string): [Mat] {
  const n = level === 'cadet' ? 2 : r() < 0.5 ? 2 : 3;
  return [randChain(r, n, 1)];
}

// ------------------------------------------------------------------ [SP] the fiftieth pulse (Acts IV, VI, VII)

export const SP_LINES: [Vec, number][] = [[[1, 1, 1], 1], [[1, -1, 0], 0.5], [[1, 1, -2], 0.2]];
export const SP_CANDIDATES: Vec[] = [[1, 0, 0], [1, 1, 1], [0, 1, 1], [1, -1, 0], [1, 1, -2]];
export const SP_GRID: Mat = fromCols(SP_LINES.map(([v]) => v));
/** The cutter (4, 2, 0) in the grid of Vell's lines: (2, 1, 1). */
export const SP_COORDS: Vec = matVec(inverse(SP_GRID)!, VELL_CUTTER);
export const SP_AFTER: Vec = matVec(mpow(V, 50), VELL_CUTTER);
export const SP_DET = det(V);
export const SP_EXP = -50;
export const spLineOk = (v: readonly number[]): boolean => SP_LINES.some(([w]) => Math.abs(v[0] * w[1] - v[1] * w[0]) < 1e-9 && Math.abs(v[1] * w[2] - v[2] * w[1]) < 1e-9 && Math.abs(v[0] * w[2] - v[2] * w[0]) < 1e-9 && v.some((x) => x !== 0));
export const spCoordsOk = (c: readonly number[], tol = 1e-6): boolean => veq(matVec(SP_GRID, c as Vec), VELL_CUTTER, tol);
export const spForecastOk = (x: readonly number[], tol = 0.05): boolean => veq(x as Vec, SP_AFTER, tol);
export const spDetOk = (d: number, tol = 1e-6): boolean => Math.abs(d - SP_DET) <= tol;
