// Chapter 26 logic (pure: no DOM, no three). Point clouds with exact spreads, the record of 10,000 entries of 12
// numbers built with the singular values of TT18, win checks, LANTERN's PCA procedure run literally, the Act IX
// Review predicates, the Doubts, the Law core and the crew versions of covariance and pca. Spread (variance)
// here always divides by n − 1, like the covariance matrix. Unit-tested in tests/singular/game-c26.test.ts.
import { det, dot, eigSym, inverse, matMul, matVec, norm, normalize, transpose, type Mat, type Vec } from '../../../math/la.ts';
import { rng, rint } from '../../../game/lawcheck.ts';
import { RECORD_SV } from '../../truth.ts';
import { canon, fmtD, fmtN, isSym, lineDeg, randOrtho, spread as spreadSizes, symEig } from '../c24-spectral/logic.ts';
import { svdCanon } from '../c25-svd/logic.ts';

export { fmtD, fmtN, lineDeg };

// ------------------------------------------------------------------ clouds and their spread

export const meanOf = (X: number[][]): Vec => X[0].map((_, j) => X.reduce((s, r) => s + r[j], 0) / X.length);
/** Covariance matrix: centre, then XcᵀXc / (n − 1). */
export function covariance(X: number[][]): Mat {
  const m = meanOf(X), n = X.length, d = m.length;
  const C: Mat = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const r of X) for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) C[i][j] += ((r[i] - m[i]) * (r[j] - m[j])) / (n - 1);
  return C;
}
/** Second moments about a pivot point c (no centring when c ≠ mean): Σ (x − c)(x − c)ᵀ / (n − 1). */
export function momentsAbout(X: number[][], c: readonly number[]): Mat {
  const n = X.length, d = c.length;
  const M: Mat = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const r of X) for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) M[i][j] += ((r[i] - c[i]) * (r[j] - c[j])) / (n - 1);
  return M;
}
/** Spread of the shadows on the line through c along dir: Σ ((x − c)·u)² / (n − 1). */
export function spreadOn(X: number[][], c: readonly number[], dir: readonly number[]): number {
  const u = normalize(dir as number[]);
  return X.reduce((s, r) => { const t = r.reduce((a, x, i) => a + (x - c[i]) * u[i], 0); return s + t * t; }, 0) / (X.length - 1);
}
/** Mean squared perpendicular distance to the line through c along dir (same n − 1). */
export function perpOn(X: number[][], c: readonly number[], dir: readonly number[]): number {
  const u = normalize(dir as number[]);
  return X.reduce((s, r) => { const v = r.map((x, i) => x - c[i]); const t = dot(v, u); return s + dot(v, v) - t * t; }, 0) / (X.length - 1);
}
export const totalSpread = (X: number[][]): number => { const C = covariance(X); return C.reduce((s, r, i) => s + r[i], 0); };

function gauss(r: () => number): number { const u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
/** Lower Cholesky factor of a symmetric positive definite matrix. */
function chol(A: Mat): Mat {
  const n = A.length, L: Mat = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = A[i][j];
    for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
    L[i][j] = i === j ? Math.sqrt(s) : s / L[j][j];
  }
  return L;
}
/** n points whose mean is exactly `mean` and whose covariance matrix is exactly C. */
export function cloudWith(n: number, mean: readonly number[], C: Mat, seed: number): number[][] {
  const r = rng(seed), d = mean.length;
  let X = Array.from({ length: n }, () => Array.from({ length: d }, () => gauss(r)));
  const m0 = meanOf(X);
  X = X.map((row) => row.map((x, i) => x - m0[i]));
  const W = inverse(chol(covariance(X)))!;   // whiten: covariance I
  const L = chol(C);
  return X.map((row) => matVec(L, matVec(W, row)).map((x, i) => x + mean[i]));
}
const rotC = (angleDeg: number, s1: number, s2: number): Mat => {
  const a = (angleDeg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [[c * c * s1 + s * s * s2, c * s * (s1 - s2)], [c * s * (s1 - s2), s * s * s1 + c * c * s2]];
};

// ------------------------------------------------------------------ p1 · the widest shadow

export const P1_C = rotC(28, 2.6, 0.3);
export const P1_CLOUD = cloudWith(200, [0, 0], P1_C, 2601);
export const P1_BEST = symEig(covariance(P1_CLOUD)).vectors[0];
/** Won when the shadows' spread is within 1% (cadet 2%) of the largest possible. */
export const p1Won = (dir: readonly number[], frac = 0.99): boolean => spreadOn(P1_CLOUD, [0, 0], dir) >= frac * symEig(covariance(P1_CLOUD)).values[0];
/** The tilted pancake: spreads 5, 2 and 0.1, 500 points. */
export const PANCAKE_Q: Mat = (() => { const a = normalize([1, 0.4, 0.5]), b0 = [-0.3, 1, 0.2]; const b = normalize(b0.map((x, i) => x - dot(b0, a) * a[i])); const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; return [a, b, c].map((v) => v.slice()); })();
export const PANCAKE_C: Mat = (() => { const Q = transpose(PANCAKE_Q); const D = [[5, 0, 0], [0, 2, 0], [0, 0, 0.1]]; return matMul(matMul(Q, D), transpose(Q)); })();
export const PANCAKE = cloudWith(500, [0, 0, 0], PANCAKE_C, 2602);
/** A viewing plane with this normal keeps total − nᵀCn of the spread. */
export const planeKeeps = (normal: readonly number[]): number => { const n = normalize(normal as number[]); const C = covariance(PANCAKE); return C[0][0] + C[1][1] + C[2][2] - dot(n, matVec(C, n)); };
export const PANCAKE_BEST = 7;
export const p1bWon = (normal: readonly number[]): boolean => planeKeeps(normal) >= 0.95 * PANCAKE_BEST;
/** The normal from two dial angles (degrees): turn about z, then tilt from the pole. */
export const normalFrom = (turn: number, tilt: number): Vec => { const a = (turn * Math.PI) / 180, b = (tilt * Math.PI) / 180; return [Math.sin(b) * Math.cos(a), Math.sin(b) * Math.sin(a), Math.cos(b)]; };
export const P1B_REF = (() => { const n = canon(symEig(covariance(PANCAKE)).vectors[2]); const s = n[2] < 0 ? -1 : 1; const m = n.map((x) => x * s); return { turn: (Math.atan2(m[1], m[0]) * 180) / Math.PI, tilt: (Math.acos(Math.max(-1, Math.min(1, m[2]))) * 180) / Math.PI }; })();

// ------------------------------------------------------------------ p2 · centre first

export const P2_MEAN: Vec = [3.2, 2.2];
export const P2_CLOUD = cloudWith(160, P2_MEAN, rotC(-38, 1.6, 0.12), 2603);
/** The direction of most spread about the pivot c: the top eigenvector of the moments about c. */
export const bestAbout = (c: readonly number[], X = P2_CLOUD): Vec => symEig(momentsAbout(X, c)).vectors[0];
export const p2Won = (c: readonly number[], tol: number): boolean => norm(c.map((x, i) => x - P2_MEAN[i])) <= tol;
/** The pivot's distance to the mean: a miss that brings it nearer is 'Closer', one that moves it away is not. */
export const p2FromMean = (c: readonly number[]): number => norm(c.map((x, i) => x - P2_MEAN[i]));
/** How far the line of most spread has turned from where it started (pivot at the origin), in degrees. Lines, not
 *  arrows: eigenvectors carry an arbitrary sign, so the turn is folded into [0°, 90°]. */
export function p2Turn(c: readonly number[]): number {
  const at = (q: readonly number[]) => { const b = bestAbout(q); return (Math.atan2(b[1], b[0]) * 180) / Math.PI; };
  const dd = Math.abs(at(c) - at([0, 0])) % 180;
  return Math.min(dd, 180 - dd);
}

// ------------------------------------------------------------------ p3 [D] · why an eigenvector

export const P3_C: Mat = [[4, 2], [2, 3]];
export const P3_CLOUD = cloudWith(150, [0, 0], P3_C, 2604);
export const P3_EIG = symEig(P3_C);                       // 5.56 along (0.79, 0.62), 1.44
export const P3_SHARE = P3_EIG.values[0] / (P3_EIG.values[0] + P3_EIG.values[1]);
export const p3Won = (dir: readonly number[], tolDeg: number): boolean => lineDeg(dir, P3_EIG.vectors[0]) <= tolDeg;
export const P3_TILES = [
  { id: 'a', text: 'The spread of the shadows on a unit arrow $\\mathbf w$ is $\\frac{1}{n-1}\\sum(\\mathbf x_i\\cdot\\mathbf w)^2 = \\mathbf w^{\\mathsf T}C\\,\\mathbf w$' },
  { id: 'b', text: '$C$ is symmetric, so in its eigenvector grid $\\mathbf w^{\\mathsf T}C\\,\\mathbf w = \\lambda_1y_1^2 + \\lambda_2y_2^2$, with $y_1^2 + y_2^2 = 1$' },
  { id: 'c', text: 'That is largest, $\\lambda_1$, when all of $\\mathbf w$ lies along the first eigenvector' },
  { id: 'd', text: 'So the direction of most spread is the eigenvector of $C$ with the largest eigenvalue' },
];
export const P3_DECOYS = [{ id: 'x', text: 'The direction of most spread is the longest column of the data' }];
export const P3_ORDER = ['a', 'b', 'c', 'd'];
/** Two-decimal answers to values that do not terminate pass (|0.67 − 2/3| < 0.006), as on every such step. */
export const TOL2 = 0.006;
// p3 at Navigator: the derivation typed at w = (1, 0). Its spread wᵀCw is 4; in C's eigenvector grid it has
// y² = (0.62, 0.38), and λ₁y₁² + λ₂y₂² gives the same 4; with y₁² + y₂² = 1 the largest is λ₁, at w = q₁.
export const P3_W0: Vec = [1, 0];
export const P3_W0_SPREAD = dot(P3_W0, matVec(P3_C, P3_W0));           // 4
export const P3_Y2: Vec = P3_EIG.vectors.map((q) => dot(P3_W0, q) ** 2);   // 0.62, 0.38
/** y² worked from the two-decimal grid (0.79² = 0.6241, 0.62² = 0.3844) still passes. */
export const P3_Y2_TOL = 0.01;
/** λ₁y₁² + λ₂y₂² worked from two-decimal λ and y² lands between 3.99 and 4.03. */
export const P3_FORM_TOL = 0.05;

// ------------------------------------------------------------------ p4 [H] · by hand

export const P4_X: number[][] = [[6, 6], [2, 4], [5, 7], [3, 3]];
export const P4_MEAN: Vec = meanOf(P4_X);                 // (4, 5)
export const P4_CENTRED: number[][] = P4_X.map((r) => r.map((x, i) => x - P4_MEAN[i]));
export const P4_COV: Mat = covariance(P4_X);              // (1/3)[[10, 8], [8, 10]]
export const P4_EIG = symEig(P4_COV);                     // 6 and 2/3
export const P4_SHARE = P4_EIG.values[0] / (P4_EIG.values[0] + P4_EIG.values[1]);  // 0.9
export const P4_PROJ: Vec = P4_CENTRED.map((r) => dot(r, P4_EIG.vectors[0]));     // ±3/√2

// ------------------------------------------------------------------ p5 · how many to keep

export const SQ = RECORD_SV.map((s) => s * s);
export const SQ_TOTAL = SQ.reduce((a, b) => a + b, 0);
export const keptShare = (k: number): number => SQ.slice(0, k).reduce((a, b) => a + b, 0) / SQ_TOTAL;
export const P5_K = RECORD_SV.findIndex((_, i) => keptShare(i + 1) >= 0.95) + 1;   // 2
export const p5Won = (k: number): boolean => k === P5_K;

// ------------------------------------------------------------------ the record: 10,000 entries of 12 numbers

export const REC_N = 10000, REC_D = 12;
function gs(vs: Vec[]): Vec[] {
  const out: Vec[] = [];
  for (const v of vs) {
    let w = v.slice();
    for (let pass = 0; pass < 2; pass++) for (const q of out) { const c = dot(w, q); w = w.map((x, i) => x - c * q[i]); }
    out.push(normalize(w));
  }
  return out;
}
/** The record: X = mean + Σ σᵢ uᵢ vᵢᵀ, with centred orthonormal u's. Components 1–2 lay out a spiral of star positions; 3 carries a pattern of its own. */
export interface RecordData { X: number[][]; U: Vec[]; V: Mat; mean: number[]; path: number[] }
let REC: RecordData | null = null;
/** Built on first use (it is 120,000 numbers): never at boot. */
export function record(): RecordData { return (REC ??= buildRecord()); }
function buildRecord(): RecordData {
  const r = rng(1018);
  const ang: number[] = [], rad: number[] = [], along: number[] = [];
  const raw1: number[] = [], raw2: number[] = [], raw3: number[] = [];
  for (let i = 0; i < REC_N; i++) {
    const arm = i % 2;
    const t = Math.sqrt(r()) * 3 * Math.PI;
    const rho = 0.18 + t / (3 * Math.PI) + 0.035 * gauss(r);
    const th = t + arm * Math.PI + 0.06 * gauss(r);
    ang.push(th); rad.push(rho); along.push(t);
    raw1.push(rho * Math.cos(th)); raw2.push(rho * Math.sin(th));
    raw3.push(Math.cos(3 * th) * rho + 0.05 * gauss(r));
  }
  const ones = new Array(REC_N).fill(1 / Math.sqrt(REC_N));
  const noise = Array.from({ length: REC_D - 3 }, () => Array.from({ length: REC_N }, () => gauss(r)));
  const U = gs([ones, raw1, raw2, raw3, ...noise]).slice(1);
  const V = randOrtho(r, REC_D);                           // columns: the record's own axes
  const mean = Array.from({ length: REC_D }, () => Math.round((r() * 8 - 4) * 100) / 100);
  const X: number[][] = Array.from({ length: REC_N }, (_, i) => mean.map((m, j) => m + RECORD_SV.reduce((s, sg, k) => s + sg * U[k][i] * V[j][k], 0)));
  // one path through the stars: the entries along the first arm, in order along it
  const arm0 = [...Array(REC_N).keys()].filter((i) => i % 2 === 0).sort((a, b) => along[a] - along[b]);
  const path = arm0.filter((_, k) => k % 110 === 0).slice(0, 42);
  return { X, U, V, mean, path };
}

/** Coordinates of every entry along components i and j (scores σ u, shown scaled). */
export function scores(comps: number[]): number[][] {
  const U = record().U;
  return U[0].map((_, n) => comps.map((c) => RECORD_SV[c] * U[c][n]));
}
export const pairShare = (comps: number[]): number => comps.reduce((s, c) => s + SQ[c], 0) / SQ_TOTAL;
export const p6Won = (comps: number[]): boolean => comps.length === 2 && comps.includes(0) && comps.includes(1);

// ------------------------------------------------------------------ p7 [S] · spread, not labels

export const P7_A = cloudWith(120, [-0.7, 0], [[0.06, 0], [0, 2.2]], 2605);
export const P7_B = cloudWith(120, [0.7, 0], [[0.06, 0], [0, 2.2]], 2606);
export const P7_ALL = [...P7_A, ...P7_B];
export const P7_EIG = symEig(covariance(P7_ALL));         // first: along y (spread); second: along x
/** Do the shadows of the two groups on this line overlap? (gap > 0 means they separate) */
export function p7Gap(dir: readonly number[]): number {
  const u = normalize(dir as number[]);
  const pa = P7_A.map((p) => dot(p, u)), pb = P7_B.map((p) => dot(p, u));
  return Math.max(Math.min(...pb) - Math.max(...pa), Math.min(...pa) - Math.max(...pb));
}
export const p7Won = (dir: readonly number[]): boolean => p7Gap(dir) > 0;

// ------------------------------------------------------------------ LANTERN's procedure (CENTRE → COVARIANCE → EIGENVECTORS → SORT → KEEP → PROJECT)

export const PROC_TILES = [
  { id: 'centre', text: '**Centre**: take the mean reading away.', py: 'Xc = [add(r, scale(-1, mean)) for r in X]' },
  { id: 'cov', text: '**Covariance** $C$ of the centred readings.', py: 'C = covariance(X)' },
  { id: 'eig', text: '**Eigenvectors** of $C$.', py: 'values, vectors = sym_eigen(C)' },
  { id: 'sort', text: '**Sort** by eigenvalue, largest first.', py: 'pairs.sort(key=lambda p: -p[0])' },
  { id: 'keep', text: '**Keep** the first $k$.', py: 'keep = vectors[:k]' },
  { id: 'project', text: '**Project** each reading onto them.', py: '[[dot(r, w) for w in keep] for r in Xc]' },
];
export const PROC_DECOYS = [
  { id: 'cols', text: 'Keep the $k$ columns with the most spread.', py: 'keep = top_columns(X, k)' },
  { id: 'vert', text: 'Fit a line by vertical distances.', py: 'keep = [least_squares_line(X)]' },
];
export const PROC_REF = ['centre', 'cov', 'eig', 'sort', 'keep', 'project'];
export const PROC_KEYS = ['centre', 'sort', 'keep'];
/** The test case: an off-centre cloud, keep one number per reading. */
export const PROC_CLOUD = cloudWith(140, [2.6, 1.6], rotC(-30, 1.5, 0.1), 2607);
export type ProcFault = 'cols' | 'vert' | 'centre' | 'stuck' | 'sort' | 'keep' | 'project' | 'order' | null;
export function runProc(ids: readonly string[]): { ok: boolean; fault: ProcFault; dir: Vec | null } {
  const at = (id: string) => ids.indexOf(id);
  const X = PROC_CLOUD;
  const truth = symEig(covariance(X)).vectors[0];
  if (ids.includes('cols')) return { ok: false, fault: 'cols', dir: [1, 0] };
  if (ids.includes('vert')) return { ok: false, fault: 'vert', dir: null };
  if (at('cov') < 0 || at('eig') < 0) return { ok: false, fault: 'stuck', dir: null };
  if (at('centre') < 0 || at('centre') > at('cov')) return { ok: false, fault: 'centre', dir: symEig(momentsAbout(X, [0, 0])).vectors[0] };
  if (at('sort') < 0) return { ok: false, fault: 'sort', dir: symEig(covariance(X)).vectors[1] };
  if (at('keep') < 0) return { ok: false, fault: 'keep', dir: truth };
  if (at('project') < 0) return { ok: false, fault: 'project', dir: truth };
  const order = PROC_REF.map(at);
  if (order.some((x, i) => i > 0 && x < order[i - 1])) return { ok: false, fault: 'order', dir: truth };
  return { ok: true, fault: null, dir: truth };
}

// ------------------------------------------------------------------ Doubts

/** (F) "Keep the two biggest columns of the data." For one number: the best single column keeps as much as the first component. */
export function colsHolds(X: number[][]): boolean {
  const C = covariance(X), best = Math.max(...C.map((r, i) => r[i]));
  return best >= symEig(C).values[0] - 1e-6;
}
/** (F) "PCA fits data the way least squares does." The least-squares line (vertical distances) points along the first component. */
export function lsqLikePcaHolds(X: number[][]): boolean {
  const C = covariance(X);
  if (Math.abs(C[0][0]) < 1e-12) return false;
  const slope = C[0][1] / C[0][0];
  return lineDeg([1, slope], symEig(C).vectors[0]) < 0.5;
}
/** (T) "Without centring, the first direction swings toward the mean." No further from the mean's line than the true one. */
export function swingHolds(X: number[][]): boolean {
  const m = meanOf(X);
  if (norm(m) < 1e-9) return true;
  const raw = symEig(momentsAbout(X, X[0].map(() => 0))).vectors[0], cen = symEig(covariance(X)).vectors[0];
  return lineDeg(raw, m) <= lineDeg(cen, m) + 1e-6;
}

// ------------------------------------------------------------------ the Act IX Review (Ilse)

/** (F) "A tiny determinant means no inverse." Broken by a matrix with a small, non-zero determinant (it has an inverse). */
export const tinyDetHolds = (M: Mat): boolean => { const d = Math.abs(det(M)); return d >= 0.05 || d < 1e-12; };
/** (F) "Singular values can be negative: a move that flips space has a negative one." */
export const negSvHolds = (M: Mat): boolean => det(M) >= 0 || svdCanon(M).S.some((s) => s < 0);
/** (T) "The condition number says how much a solver can multiply errors": relative error out ≤ κ · relative error in. */
export function condHolds(A: Mat, b: Vec, db: Vec): boolean {
  const inv = inverse(A);
  if (!inv || norm(b) < 1e-9 || norm(db) < 1e-12) return true;
  const s = svdCanon(A).S, kappa = s[0] / s[s.length - 1];
  const x = matVec(inv, b), dx = matVec(inv, db);
  return norm(dx) / norm(x) <= kappa * (norm(db) / norm(b)) * (1 + 1e-9) + 1e-12;
}
export function condRatio(A: Mat, b: Vec, db: Vec): number {
  const inv = inverse(A)!;
  const x = matVec(inv, b), dx = matVec(inv, db);
  return (norm(dx) / norm(x)) / (norm(db) / norm(b));
}
/** (T) "For a symmetric matrix with positive eigenvalues, the singular values are the eigenvalues." */
export function symSvHolds(S: Mat): boolean {
  if (!isSym(S)) return true;
  const e = symEig(S);
  if (e.values.some((x) => x <= 1e-12)) return true;
  const s = svdCanon(S).S;
  return e.values.every((l, i) => Math.abs(l - s[i]) < 1e-6);
}

// ------------------------------------------------------------------ the Law

export interface CloudCase { X: number[][] }
export const LAW_ANSWER = { matrix: 'cov', which: 'largest' };
export function lawHolds(f: Record<string, string>, c: CloudCase): boolean {
  const X = c.X;
  const truth = symEig(covariance(X)).vectors[0];
  const M = f.matrix === 'cov' ? covariance(X) : momentsAbout(X, X[0].map(() => 0));
  const e = symEig(M);
  const pick = f.which === 'largest' ? e.vectors[0] : e.vectors[e.vectors.length - 1];
  return lineDeg(pick, truth) < 0.5;
}
export function lawGen(r: () => number): CloudCase {
  const s1 = 0.6 + r() * 2.4, s2 = s1 * (0.05 + r() * 0.5);
  const mean = r() < 0.7 ? [r() * 8 - 4, r() * 8 - 4] : [0, 0];
  return { X: cloudWith(40, mean, rotC(r() * 180, s1, s2), rint(r, 1, 1e6)) };
}
export const LAW_EDGES: CloudCase[] = [{ X: P2_CLOUD }, { X: P3_CLOUD }, { X: cloudWith(40, [5, -1], rotC(10, 2, 0.2), 99) }];
export const lawDescribe = (c: CloudCase): string => { const m = meanOf(c.X); return `a cloud of ${c.X.length} readings with mean (${fmtD(m[0], 1)}, ${fmtD(m[1], 1)}), spread most along (${symEig(covariance(c.X)).vectors[0].map((x) => fmtD(x)).join(', ')})`; };
export const LAW_CORE = { id: 'c26-law', gen: lawGen, edgeCases: LAW_EDGES, holds: lawHolds, describe: lawDescribe };

// ------------------------------------------------------------------ builds: crew versions and swarm cases

export const crewCovariance = (X: number[][]): Mat => covariance(X);
/** pca's contract: each reading's k coordinates along the k directions of most spread (canonical signs). */
export function crewPca(X: number[][], k: number): number[][] {
  const m = meanOf(X), e = symEig(covariance(X));
  const keep = e.vectors.slice(0, k);
  return X.map((r) => keep.map((w) => r.reduce((s, x, i) => s + (x - m[i]) * w[i], 0)));
}
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
export function covCase(r: () => number, level: string): [number[][]] {
  const n = rint(r, 4, level === 'cadet' ? 6 : 10), d = level === 'cadet' ? 2 : rint(r, 2, 3);
  return [Array.from({ length: n }, () => Array.from({ length: d }, () => rint(r, -9, 9) / (level === 'commander' ? 2 : 1)))];
}
/** Readings whose covariance has spreads of clearly different sizes (so the directions are unique). */
export function pcaCase(r: () => number, level: string): [number[][], number] {
  const d = level === 'cadet' ? 2 : rint(r, 2, 3), n = rint(r, 6, 12);
  const sizes = spreadSizes(r, d, false, [3, 8]).map((x) => x * x);
  const Q = randOrtho(r, d);
  const C = matMul(matMul(Q, sizes.map((s, i) => sizes.map((_, j) => (i === j ? s : 0)))), transpose(Q));
  const mean = Array.from({ length: d }, () => rint(r, -5, 5));
  const X = cloudWith(n, mean, C, rint(r, 1, 1e6)).map((row) => row.map(r4));
  return [X, rint(r, 1, d)];
}
export { eigSym };
