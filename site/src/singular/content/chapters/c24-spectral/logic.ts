// Chapter 24 logic (pure: no DOM, no three). Story numbers, win checks, the bowl-or-saddle physics, the
// rigid-body spin test for the Flip (Euler's equations, RK4), the Doubt predicates, the Law core and the
// crew versions of the builds. Shared helpers for Act IX (formatting, canonical signs) live here too, so
// Chapters 25 and 26 import them. Unit-tested in tests/singular/game-c24.test.ts.
import {
  dot, eig2, eigSym, fromCols, matMul, matVec, norm, normalize, transpose, type Mat, type Vec,
} from '../../../math/la.ts';
import { nice } from '../../../math/frac.ts';
import { C as COLLAPSE, INERTIA, V as VELL } from '../../truth.ts';
import { rint } from '../../../game/lawcheck.ts';

// ------------------------------------------------------------------ formatting (Act IX)

/** A number for the player: exact fractions where simple, else up to two decimals. Minus as −. */
export const fmtN = (x: number): string => {
  if (Math.abs(x) < 1e-9) return '0';
  const r = Math.round(x * 100) / 100;
  const s = Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : Math.abs(x - r) < 1e-9 ? String(r) : nice(x, 12);
  return s.replace(/-/g, '−');
};
export const fmtV = (v: readonly number[]): string => `(${v.map(fmtN).join(', ')})`;
/** Fixed decimals, with a proper minus sign. */
export const fmtD = (x: number, d = 2): string => { const s = (Math.abs(x) < 0.5 * 10 ** -d ? 0 : x).toFixed(d); return s.replace('-', '−'); };
export const fmt2 = (x: number): string => fmtD(x, 2);
export const fmtVD = (v: readonly number[], d = 2): string => `(${v.map((x) => fmtD(x, d)).join(', ')})`;
/** A matrix as TeX (exact where simple). */
export const texM = (M: Mat): string => `\\begin{bmatrix}${M.map((r) => r.map((x) => fmtN(x).replace('−', '-')).join(' & ')).join(' \\\\ ')}\\end{bmatrix}`;
export const texSmall = (M: Mat, d?: number): string => `\\left[\\begin{smallmatrix}${M.map((r) => r.map((x) => (d === undefined ? fmtN(x) : fmtD(x, d)).replace('−', '-')).join(' & ')).join(' \\\\ ')}\\end{smallmatrix}\\right]`;
/** A vector read aloud. */
export const sayN = (x: number): string => (x < 0 ? `minus ${sayN(-x)}` : fmtN(x).replace('.', ' point '));
export const sayV = (v: readonly number[]): string => v.map(sayN).join(', ');
export const deg = (r: number): number => (r * 180) / Math.PI;
export const rad = (d: number): number => (d * Math.PI) / 180;

/** Angle between two lines through the origin, in degrees (0..90). */
export function lineDeg(a: readonly number[], b: readonly number[]): number {
  const na = norm(a as number[]), nb = norm(b as number[]);
  if (na < 1e-12 || nb < 1e-12) return 90;
  return deg(Math.acos(Math.min(1, Math.abs(dot(a as number[], b as number[])) / (na * nb))));
}

/** Canonical sign for an eigen- or singular vector: its first clearly non-zero entry is positive. */
export function canon(v: readonly number[]): Vec {
  const f = v.find((t) => Math.abs(t) > 1e-9);
  return f !== undefined && f < 0 ? v.map((t) => (t === 0 ? 0 : -t)) : v.slice();
}

export const isSym = (S: Mat, tol = 1e-9): boolean => S.every((r, i) => r.every((x, j) => Math.abs(x - S[j][i]) <= tol));

// ------------------------------------------------------------------ the quadratic form and its surface

/** xᵀ S x: the height of the surface above x. */
export const quadForm = (S: Mat, x: readonly number[]): number => dot(x as number[], matVec(S, x as number[]));

/** Eigen-decomposition of a symmetric matrix, values high → low, vectors in canonical sign. */
export function symEig(S: Mat): { values: number[]; vectors: Vec[] } {
  const e = eigSym(S);
  return { values: e.values.map((x) => (Math.abs(x) < 1e-13 ? 0 : x)), vectors: e.vectors.map(canon) };
}

export type Shape = 'bowl' | 'cap' | 'saddle' | 'trough' | 'ridge' | 'flat';
/** The shape of z = xᵀSx from the signs of the eigenvalues. cap = upside-down bowl; trough/ridge = semidefinite. */
export function shapeOf(S: Mat, tol = 1e-9): Shape {
  const { values } = symEig(S);
  const pos = values.filter((x) => x > tol).length, neg = values.filter((x) => x < -tol).length;
  const zero = values.length - pos - neg;
  if (pos === values.length) return 'bowl';
  if (neg === values.length) return 'cap';
  if (pos && neg) return 'saddle';
  if (pos && zero) return 'trough';
  if (neg && zero) return 'ridge';
  return 'flat';
}
export const SHAPE_WORD: Record<Shape, string> = {
  bowl: 'a bowl', cap: 'an upside-down bowl', saddle: 'a saddle', trough: 'a trough (a line of lowest points)', ridge: 'a ridge (a line of highest points)', flat: 'flat',
};

/**
 * The form written in a survey grid turned by θ (u along (cos θ, sin θ), v at a right angle to it):
 * E = a u² + b uv + c v². b is the mixed term.
 */
export function formIn(S: Mat, theta: number): { a: number; b: number; c: number } {
  const u = [Math.cos(theta), Math.sin(theta)], v = [-Math.sin(theta), Math.cos(theta)];
  return { a: quadForm(S, u), b: 2 * dot(u, matVec(S, v)), c: quadForm(S, v) };
}

// ------------------------------------------------------------------ p1 [D] · stress lines, and why they are perpendicular

export const P1_S: Mat = [[3, 1], [1, 3]];
/** The stress lines of the panel and their stretches: (1, 1) × 4 and (1, −1) × 2. */
export const P1_LINES: { dir: Vec; value: number }[] = [{ dir: [1, 1], value: 4 }, { dir: [1, -1], value: 2 }];
/** Chapter 18's λ-dial matrix: not symmetric, its lines (1, 1) and (1, −2) are not perpendicular. */
export const P1_NONSYM: Mat = [[4, 1], [2, 3]];
export const P1_NONSYM_LINES: Vec[] = [[1, 1], [1, -2]];
/** The angle between Chapter 18's two lines (degrees, as lines). */
export const P1_NONSYM_ANGLE = lineDeg([1, 1], [1, -2]);

/** The two real eigen-lines of a 2 × 2 (null when complex or a repeated root). */
export function lines2(M: Mat): [Vec, Vec] | null {
  const e = eig2(M);
  if (e.kind !== 'real' || Math.abs(e.values[0] - e.values[1]) < 1e-9 || !e.vectors[0] || !e.vectors[1]) return null;
  return [e.vectors[0], e.vectors[1]];
}
/** Angle between the two eigen-lines of a 2 × 2 (degrees, 0..90), or null. */
export function eigenAngle(M: Mat): number | null { const L = lines2(M); return L ? lineDeg(L[0], L[1]) : null; }

/** A random symmetric 2 × 2 with two different eigenvalues (Bram's Shake in p1). */
export function randSym2(r: () => number, lo = -4, hi = 4): Mat {
  for (;;) {
    const a = rint(r, lo, hi), b = rint(r, lo, hi), d = rint(r, lo, hi);
    const S = [[a, b], [b, d]];
    if (b !== 0 && lines2(S)) return S;
  }
}

/** The derivation, in order: λ(v·w) = (Av)·w = v·(Aᵀw) = v·(Aw) = μ(v·w). */
export const P1_TILES = [
  { id: 'a', text: '$\\lambda(\\mathbf v \\cdot \\mathbf w) = (A\\mathbf v) \\cdot \\mathbf w$, because $A\\mathbf v = \\lambda\\mathbf v$' },
  { id: 'b', text: '$(A\\mathbf v) \\cdot \\mathbf w = \\mathbf v \\cdot (A^{\\mathsf T}\\mathbf w)$: the transpose moves $A$ across the dot' },
  { id: 'c', text: '$\\mathbf v \\cdot (A^{\\mathsf T}\\mathbf w) = \\mathbf v \\cdot (A\\mathbf w)$, because $A^{\\mathsf T} = A$' },
  { id: 'd', text: '$\\mathbf v \\cdot (A\\mathbf w) = \\mu(\\mathbf v \\cdot \\mathbf w)$, so $(\\lambda - \\mu)(\\mathbf v \\cdot \\mathbf w) = 0$' },
];
export const P1_DECOYS = [{ id: 'x', text: '$\\mathbf v \\cdot \\mathbf w = \\lambda\\mu$' }];
export const P1_ORDER = ['a', 'b', 'c', 'd'];

// ------------------------------------------------------------------ p2 · turn the grid

export const P2_S: Mat = [[2, 1], [1, 2]];
/** E = 2x² + 2xy + 2y² has no mixed term in a grid turned 45° (or 45° + any quarter turn): 3u² + v². */
export const P2_ANGLE = 45;
export const p2Won = (thetaDeg: number, tolDeg: number): boolean => {
  const m = ((thetaDeg % 90) + 90) % 90;
  return Math.abs(m - 45) <= tolDeg;
};
/** The readout's zero and the win: the uv term of E in a grid turned by θ is 0 to two places (only 45°, 135°, … on the slider). */
export const p2Zero = (thetaDeg: number): boolean => Math.abs(formIn(P2_S, rad(thetaDeg)).b) < 0.02;

// ------------------------------------------------------------------ p3 · bowl or saddle

export const P3_SADDLE: Mat = [[1, 2], [2, 1]];
export const P3_BOWL: Mat = [[3, 2], [2, 3]];
/** 3x² + 4xy + 3y²: the cross-term coefficient 4 split in half. */
export const P3_FORM = { x2: 3, xy: 4, y2: 3 };
export const P3_ESCAPE: Vec = [1, -1];
export const RIM = 2.4;

export interface Roll { path: Vec[]; exit: Vec | null; settled: boolean }
/**
 * Release a probe on z = xᵀSx at x0: it rolls downhill (x'' = −∇E − γx', ∇E = 2Sx) until it leaves the
 * rim, or comes to rest. Semi-implicit Euler, fixed step: the same path every time.
 */
export function roll(S: Mat, x0: readonly number[], o: { gamma?: number; dt?: number; steps?: number; rim?: number } = {}): Roll {
  const g = o.gamma ?? 1.6, dt = o.dt ?? 0.02, rim = o.rim ?? RIM, steps = o.steps ?? 1500;
  let x = x0.slice(), v = [0, 0];
  const path: Vec[] = [x.slice()];
  for (let i = 0; i < steps; i++) {
    const f = matVec(S, x).map((t) => -2 * t);
    v = v.map((vi, k) => vi + dt * (f[k] - g * vi));
    x = x.map((xi, k) => xi + dt * v[k]);
    if (i % 2 === 1) path.push(x.slice());
    if (norm(x) > rim) return { path: [...path, x.slice()], exit: x, settled: false };
    if (norm(x) < 1e-3 && norm(v) < 1e-3) return { path: [...path, x.slice()], exit: null, settled: true };
  }
  return { path, exit: null, settled: norm(x) < 0.05 };
}
/** The probe left the rim along the line (1, −1). */
export const p3EscapeWon = (r: Roll, tolDeg = 12): boolean => !!r.exit && lineDeg(r.exit, P3_ESCAPE) <= tolDeg;
/** The probe came to rest at the lowest point. */
export const p3SettleWon = (r: Roll): boolean => r.settled || norm(r.path[r.path.length - 1]) < 0.05;

// ------------------------------------------------------------------ p4 [H] · orthogonally diagonalise, with a repeated eigenvalue

export const P4_S: Mat = [[2, 1, 1], [1, 2, 1], [1, 1, 2]];
export const P4_VALUES = [4, 1, 1];
const S3 = Math.sqrt(3), S2 = Math.SQRT2, S6 = Math.sqrt(6);
export const P4_Q: Mat = fromCols([[1 / S3, 1 / S3, 1 / S3], [1 / S2, -1 / S2, 0], [1 / S6, 1 / S6, -2 / S6]]);
export const P4_D: Mat = [[4, 0, 0], [0, 1, 0], [0, 0, 1]];
/** Gram–Schmidt inside the plane x + y + z = 0: start (1, 0, −1), take away its shadow on (1, −1, 0). */
export const P4_START: Vec = [1, 0, -1];
export const P4_SHADOW_C = 0.5;
export const P4_LEFTOVER: Vec = [0.5, 0.5, -1];
/** S = Σ λᵢ qᵢqᵢᵀ: its (1, 2) entry is 4·(1/3) + 1·(−1/2) + 1·(1/6) = 1. */
export const P4_ENTRY12 = 4 * (1 / 3) + 1 * (-1 / 2) + 1 * (1 / 6);
export const spectralSum = (values: number[], qs: Vec[]): Mat => {
  const n = qs[0].length;
  const out: Mat = Array.from({ length: n }, () => new Array(n).fill(0));
  values.forEach((l, k) => { for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out[i][j] += l * qs[k][i] * qs[k][j]; });
  return out;
};

// ------------------------------------------------------------------ p5 · highest and lowest on the circle

export const P5_S: Mat = P2_S;
export const circleValue = (S: Mat, t: number): number => quadForm(S, [Math.cos(t), Math.sin(t)]);
/** Locks at angles (radians): won when one lock is at the largest value and one at the smallest. */
export function p5Won(locks: number[], tolDeg: number): boolean {
  const { vectors } = symEig(P5_S);
  const at = (d: Vec) => locks.some((t) => lineDeg([Math.cos(t), Math.sin(t)], d) <= tolDeg);
  return at(vectors[0]) && at(vectors[1]);
}

// ------------------------------------------------------------------ p6 · the Flip (rigid body, Euler's equations, RK4)

/** The Lantern's principal axes (ship grid) and moments, smallest to largest: (1, 1, 0) 2, (1, −1, 0) 6, (0, 0, 1) 9. */
export const AXES: { dir: Vec; I: number; name: string }[] = (() => {
  const e = symEig(INERTIA);
  return e.values.map((I, k) => ({ dir: e.vectors[k], I, name: '' })).sort((a, b) => a.I - b.I)
    .map((a, k) => ({ ...a, name: ['long axis', 'wing axis', 'deck axis'][k] }));
})();
export const SPIN_RATE = 0.05;      // rad/s
export const SPIN_MINUTES = 10;
/** Held: ω stays within this of the chosen axis. An exact largest or smallest axis drifts under 1°; an axis about 1° off one drifts 2.5° or more. */
export const HOLD_DEG = 2.5;
export const KICK = 0.01;           // a debris strike: 1% of the spin rate, across the axis

type Q4 = [number, number, number, number];
const qmul = (a: Q4, b: Q4): Q4 => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];
const qnorm = (q: Q4): Q4 => { const n = Math.hypot(...q); return q.map((x) => x / n) as Q4; };
/** Rotate v by unit quaternion q. */
export function qrot(q: Q4, v: readonly number[]): Vec {
  const r = qmul(qmul(q, [0, v[0], v[1], v[2]]), [q[0], -q[1], -q[2], -q[3]]);
  return [r[1], r[2], r[3]];
}

export interface SpinSample { t: number; w: Vec; q: Q4 }
export interface SpinRun { samples: SpinSample[]; drift: number; maxDrift: number; flipAt: number | null; held: boolean }

/**
 * Spin the Lantern about `axis` (ship grid) at SPIN_RATE, with a small kick across it, for SPIN_MINUTES.
 * ω is integrated in the ship's own frame with Euler's equations Iω̇ = (Iω) × ω (RK4); the orientation q
 * with q̇ = ½ q ω. The drift is the angle between ω (in the ship's frame) and the chosen axis.
 */
export function spin(axis: readonly number[], o: { minutes?: number; dt?: number; every?: number; kick?: number } = {}): SpinRun {
  const a = normalize(axis as number[]);
  const I = INERTIA;
  // a kick across the axis, in a fixed direction not along any principal axis
  let k = [0.3, 0.5, 0.81];
  k = normalize(k.map((x, i) => x - dot(k, a) * a[i]));
  const w0 = a.map((x, i) => SPIN_RATE * (x + (o.kick ?? KICK) * k[i]));
  const Iinv = (() => { const e = symEig(I); return e.vectors.map((v, i) => ({ v, inv: 1 / e.values[i] })); })();
  const applyInv = (L: Vec) => { const out = [0, 0, 0]; for (const { v, inv } of Iinv) { const c = dot(v, L) * inv; for (let i = 0; i < 3; i++) out[i] += c * v[i]; } return out; };
  const cross = (u: Vec, v: Vec): Vec => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const f = (w: Vec): Vec => applyInv(cross(matVec(I, w), w));
  const dt = o.dt ?? 0.1, T = (o.minutes ?? SPIN_MINUTES) * 60, every = o.every ?? 1;
  let w = w0, q: Q4 = [1, 0, 0, 0], t = 0, maxDrift = 0, flipAt: number | null = null;
  const samples: SpinSample[] = [{ t: 0, w: w.slice(), q }];
  const driftOf = (x: Vec) => deg(Math.acos(Math.max(-1, Math.min(1, dot(normalize(x), a)))));
  const steps = Math.round(T / dt);
  for (let i = 1; i <= steps; i++) {
    const k1 = f(w), k2 = f(w.map((x, j) => x + (dt / 2) * k1[j])), k3 = f(w.map((x, j) => x + (dt / 2) * k2[j])), k4 = f(w.map((x, j) => x + dt * k3[j]));
    const wn = w.map((x, j) => x + (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    // orientation: rotate by the mean ω over the step
    const wm = w.map((x, j) => (x + wn[j]) / 2), ang = norm(wm) * dt;
    if (ang > 1e-12) { const ax = normalize(wm); const s = Math.sin(ang / 2); q = qnorm(qmul(q, [Math.cos(ang / 2), ax[0] * s, ax[1] * s, ax[2] * s])); }
    w = wn; t = i * dt;
    const d = driftOf(w);
    if (d > maxDrift) maxDrift = d;
    if (flipAt === null && d > 90) flipAt = t;
    if (i % Math.max(1, Math.round(every / dt)) === 0) samples.push({ t, w: w.slice(), q });
  }
  return { samples, drift: driftOf(w), maxDrift, flipAt, held: maxDrift <= HOLD_DEG };
}
/** The win: the ship holds its spin axis for ten simulated minutes. */
export const flipWon = (axis: readonly number[]): boolean => norm(axis as number[]) > 1e-9 && spin(axis, { every: 60 }).held;

// ------------------------------------------------------------------ p7 [S] · upside-down bowl, trough, and a 3 × 3 lowest point

export const p7CapWon = (S: Mat): boolean => shapeOf(S) === 'cap';
export const p7TroughWon = (S: Mat): boolean => shapeOf(S, 1e-6) === 'trough';
/** The lowest value of xᵀSx on the unit sphere for p4's S is 1, on the whole circle x + y + z = 0. */
export const p7SphereValue = (x: readonly number[]): number => (norm(x as number[]) < 1e-9 ? NaN : quadForm(P4_S, normalize(x as number[])));
export const p7SphereWon = (x: readonly number[], tol = 0.01): boolean => Math.abs(p7SphereValue(x) - 1) <= tol;

// ------------------------------------------------------------------ Doubts

/** (F) "Positive entries mean a bowl." Holds for S unless every entry is positive and the surface is not a bowl. */
export const posBowlHolds = (S: Mat): boolean => !S.every((r) => r.every((x) => x > 0)) || shapeOf(S) === 'bowl';
/** (F) "Every real matrix has real eigenvalues." */
export const realEigHolds = (M: Mat): boolean => eig2(M).kind === 'real';
/** (T) "On the unit circle, xᵀSx is never larger than S's largest eigenvalue." */
export const circleMaxHolds = (S: Mat, x: readonly number[]): boolean => {
  if (norm(x as number[]) < 1e-9) return true;
  return quadForm(S, normalize(x as number[])) <= symEig(S).values[0] + 1e-9;
};

// ------------------------------------------------------------------ the Law

export interface EigCase { A: Mat }
export const LAW_ANSWER = { which: 'sym', pairs: 'diff', rel: 'perp' };

/** Does "<which>'s eigenvectors <pairs> are always <rel>" hold for this matrix? */
export function lawHolds(f: Record<string, string>, c: EigCase): boolean {
  const A = c.A;
  const e = eig2(A);
  const inClass = f.which === 'sym' ? isSym(A) : f.which === 'real' ? e.kind === 'real' : true;
  if (!inClass || e.kind !== 'real') return true;
  const rep = Math.abs(e.values[0] - e.values[1]) < 1e-9;
  const test = (u: Vec, v: Vec) => (f.rel === 'perp' ? Math.abs(dot(normalize(u), normalize(v))) < 1e-6 : Math.abs(u[0] * v[1] - u[1] * v[0]) < 1e-6 * norm(u) * norm(v));
  if (f.pairs === 'diff') {
    if (rep) return true;
    const L = lines2(A)!;
    return test(L[0], L[1]);
  }
  // any two eigenvectors, the same eigenvalue allowed: v and 2v always count, so "perpendicular" fails at once
  if (f.rel === 'perp') return false;
  if (rep && Math.abs(A[0][1]) < 1e-9 && Math.abs(A[1][0]) < 1e-9) return false; // λI: every arrow holds
  if (!rep) return false; // two different lines are not parallel
  return true;
}

export function lawGen(r: () => number): EigCase {
  const k = r();
  if (k < 0.45) return { A: randSym2(r) };
  if (k < 0.9) {
    for (;;) {
      const A = [[rint(r, -4, 4), rint(r, -4, 4)], [rint(r, -4, 4), rint(r, -4, 4)]];
      if (!isSym(A) && lines2(A)) return { A };
    }
  }
  return { A: [[rint(r, -3, 3), rint(r, -4, -1)], [rint(r, 1, 4), rint(r, -3, 3)]] };
}
export const LAW_EDGES: EigCase[] = [{ A: [[1, 0], [0, 1]] }, { A: P1_NONSYM }, { A: P1_S }, { A: [[3, 0], [0, 3]] }, { A: [[1, 1], [0, 1]] }];
export function lawDescribe(c: EigCase): string {
  const L = lines2(c.A);
  const e = eig2(c.A);
  const m = `$A = ${texSmall(c.A)}$${isSym(c.A) ? ' (symmetric)' : ''}`;
  if (e.kind !== 'real') return `${m}: no real eigenvector at all`;
  if (!L) return `${m}: one eigenvalue, ${fmtN(e.values[0])}, twice${Math.abs(c.A[0][1]) < 1e-9 && Math.abs(c.A[1][0]) < 1e-9 ? ': every arrow is an eigenvector, so (1, 0) and (1, 1) both are' : ''}`;
  return `${m}: eigenvectors ${fmtVD(canon(L[0]))} and ${fmtVD(canon(L[1]))}, ${Math.round(lineDeg(L[0], L[1]))}° apart`;
}
export const LAW_CORE = { id: 'c24-law', gen: lawGen, edgeCases: LAW_EDGES, holds: lawHolds, describe: lawDescribe };

// ------------------------------------------------------------------ builds: crew versions and swarm cases

export const crewQuadForm = (S: Mat, x: Vec): number => quadForm(S, x);
/** sym_eigen's contract: eigenvalues high → low, unit eigenvectors with their first non-zero entry positive. */
export function crewSymEigen(S: Mat): [number[], Vec[]] { const e = symEig(S); return [e.values, e.vectors]; }

/** A random rotation (orthogonal, det 1) of size n, from Gram–Schmidt on random columns. */
export function randOrtho(r: () => number, n: number): Mat {
  for (;;) {
    const cols: Vec[] = [];
    let ok = true;
    for (let j = 0; j < n && ok; j++) {
      let v = Array.from({ length: n }, () => r() * 2 - 1);
      for (const q of cols) v = v.map((x, i) => x - dot(v, q) * q[i]);
      if (norm(v) < 0.2) ok = false; else cols.push(normalize(v));
    }
    if (ok) return fromCols(cols);
  }
}

/** Distinct sizes, each at most 0.75 of the one before (power iteration converges in 200 steps). */
export function spread(r: () => number, n: number, signed: boolean, top = [2, 6]): number[] {
  const out: number[] = [];
  let m = top[0] + r() * (top[1] - top[0]);
  for (let i = 0; i < n; i++) { out.push(signed && r() < 0.35 ? -m : m); m *= 0.3 + r() * 0.45; }
  return out;
}
const round4 = (M: Mat): Mat => M.map((row) => row.map((x) => Math.round(x * 1e4) / 1e4));

/** A symmetric matrix Q diag(λ) Qᵀ with eigenvalues of different sizes (the swarm for sym_eigen). */
export function symCase(r: () => number, level: string): [Mat] {
  const n = level === 'cadet' ? 2 : r() < 0.5 ? 2 : 3;
  const Q = randOrtho(r, n);
  const l = spread(r, n, level !== 'cadet');
  const S = matMul(matMul(Q, l.map((x, i) => l.map((_, j) => (i === j ? x : 0)))), transpose(Q));
  // symmetric to the last digit, rounded so the case prints cleanly
  const R = round4(S);
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) R[i][j] = R[j][i];
  return [R];
}
export function quadCase(r: () => number, level: string): [Mat, Vec] {
  const n = level === 'cadet' ? 2 : r() < 0.6 ? 2 : 3;
  const S: Mat = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { S[i][j] = S[j][i] = rint(r, -5, 5) / (level === 'commander' ? 2 : 1); }
  return [S, Array.from({ length: n }, () => rint(r, -4, 4) / (level === 'cadet' ? 1 : 2))];
}

// ------------------------------------------------------------------ the brace planner (install) and Vell's pulse

/** The stern's stress matrix: the Collapse pulse as the fit reads it (symmetric). Its eigenvectors are the brace lines. */
export const STRESS: Mat = COLLAPSE;
export const BRACES = symEig(STRESS);
/** Whole-number directions the braces lie along (to the nearest degree). */
export const BRACE_DIRS: Vec[] = [[1, 1, 2], [1, -1, 0], [1, 1, -1]];
export const braceOk = (vs: Vec[]): boolean => BRACES.vectors.every((b) => vs.some((v) => lineDeg(v, b) < 0.5));
export const VELL_LINES: Vec[] = [[1, 1, 1], [1, -1, 0], [1, 1, -2]];
export const VELL_PERP = VELL_LINES.every((a, i) => VELL_LINES.every((b, j) => i === j || Math.abs(dot(a, b)) < 1e-12));
export const VELL_SYM = isSym(VELL);
