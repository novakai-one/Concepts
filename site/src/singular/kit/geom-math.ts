// Pure maths behind the geometry and data kit (geom.ts, data.ts). No three.js, no DOM, so it can be
// unit-tested in node. Every picture the kit draws gets its numbers from here (and from math/la.ts).
import {
  angle, cross, cross2, dot, leastSquares, matMul, matVec, norm, normalize, pca, proj, rot2, svd,
  type Mat, type Vec,
} from '../math/la.ts';

export type P3 = [number, number, number];

const EPS = 1e-9;
const TAU = Math.PI * 2;

/** Any 2-D or 3-D point as [x, y, z]. */
export const to3 = (v: readonly number[]): P3 => [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
export const add3 = (a: readonly number[], b: readonly number[], s = 1): P3 => [a[0] + s * b[0], a[1] + s * b[1], (a[2] ?? 0) + s * (b[2] ?? 0)];
export const sub3 = (a: readonly number[], b: readonly number[]): P3 => [a[0] - b[0], a[1] - b[1], (a[2] ?? 0) - (b[2] ?? 0)];
export const scale3 = (a: readonly number[], s: number): P3 => [a[0] * s, a[1] * s, (a[2] ?? 0) * s];
export const len3 = (a: readonly number[]): number => Math.hypot(a[0], a[1], a[2] ?? 0);
export const unit3 = (a: readonly number[]): P3 => { const l = len3(a); return l < EPS ? [0, 0, 0] : scale3(a, 1 / l); };
export const lerp3 = (a: readonly number[], b: readonly number[], t: number): P3 => add3(a, sub3(b, a), t);
export const smoothstep = (e0: number, e1: number, x: number): number => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/** Wrap an angle to (-π, π]. */
export function wrapAngle(t: number): number {
  let a = ((t + Math.PI) % TAU + TAU) % TAU - Math.PI;
  if (a <= -Math.PI) a += TAU;
  return a;
}
/** Distance between two directions of a LINE (angles mod π), in [0, π/2]. */
export function lineAngleDist(a: number, b: number): number {
  const d = Math.abs(((a - b) % Math.PI + Math.PI) % Math.PI);
  return Math.min(d, Math.PI - d);
}
export const deg = (r: number): number => (r * 180) / Math.PI;
export const rad = (d: number): number => (d * Math.PI) / 180;

// ------------------------------------------------------------------ projection onto a line

/** Signed length of the shadow of v on the line through w: v·w / |w| (0 when w = 0). */
export function shadowLength(v: readonly number[], w: readonly number[]): number {
  const n = len3(w);
  return n < EPS ? 0 : (v[0] * w[0] + v[1] * w[1] + (v[2] ?? 0) * (w[2] ?? 0)) / n;
}
/** The projection of v onto the line through w (the foot of the perpendicular from v's tip). */
export function shadowFoot(v: readonly number[], w: readonly number[]): P3 {
  return to3(proj(to3(v), to3(w)));
}

/** A direction perpendicular to a (in the xy-plane when a is flat; otherwise any perpendicular). */
export function perpTo(a: readonly number[]): P3 {
  const u = unit3(a);
  if (Math.abs(u[2]) < 1e-6) return [-u[1], u[0], 0];
  const helper: P3 = Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  return unit3(cross(u, helper));
}

/** The three corners (a polyline) of the small square that marks a right angle at `at`. */
export function rightAnglePts(at: readonly number[], dirA: readonly number[], dirB: readonly number[], size = 0.26): P3[] {
  const a = unit3(dirA), b = unit3(dirB);
  return [add3(at, a, size), add3(add3(at, a, size), b, size), add3(at, b, size)];
}

/**
 * An orthonormal pair (e1, e2) for the plane of a and b with e1 along a and b on the e2 side,
 * plus the angle from a to b (0..π). Works for parallel and opposite vectors too.
 */
export function arcFrame(a: readonly number[], b: readonly number[]): { e1: P3; e2: P3; angle: number } {
  const e1 = unit3(a);
  const bb = to3(b);
  const t = angle(to3(a), bb);
  let e2 = sub3(bb, scale3(e1, dot(bb, e1)));
  if (len3(e2) < 1e-7 * Math.max(1, len3(bb))) e2 = perpTo(e1);
  return { e1, e2: unit3(e2), angle: t };
}

/** Points on the arc of radius r around `at`, from direction a to direction b (the short way). */
export function arcPts(at: readonly number[], a: readonly number[], b: readonly number[], r: number, n = 32): P3[] {
  const { e1, e2, angle: th } = arcFrame(a, b);
  const out: P3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (th * i) / n;
    out.push(add3(add3(at, e1, r * Math.cos(t)), e2, r * Math.sin(t)));
  }
  return out;
}

/** Unit direction halfway between a and b (perpendicular to a when they point opposite ways). */
export function bisector(a: readonly number[], b: readonly number[]): P3 {
  const { e1, e2, angle: th } = arcFrame(a, b);
  return unit3(add3(scale3(e1, Math.cos(th / 2)), e2, Math.sin(th / 2)));
}

// ------------------------------------------------------------------ label placement

function segDist2D(p: readonly number[], a: readonly number[], b: readonly number[]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 < EPS ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Where to put a label next to an arrow tip so it stays clear of other arrows (2-D, on screen = xy).
 * Tries beyond the tip first, then to either side; keeps the first spot with enough clearance,
 * otherwise the spot with the most clearance. `segs` are arrow shafts, `avoid` are points to keep away from.
 */
export function labelSpot(tip: readonly number[], dir: readonly number[], segs: [readonly number[], readonly number[]][] = [], avoid: readonly number[][] = [], gap = 0.42, need = 0.32): P3 {
  let d = unit3([dir[0], dir[1], 0]);
  if (len3(d) < 0.5) d = [1, 0, 0];
  const rotd = (k: number): P3 => { const c = Math.cos(k), s = Math.sin(k); return [d[0] * c - d[1] * s, d[0] * s + d[1] * c, 0]; };
  const tries = [0, 50, -50, 90, -90, 135, -135].map((a) => add3(tip, rotd(rad(a)), gap));
  let best = tries[0], bestC = -Infinity;
  for (const c of tries) {
    let clear = Infinity;
    for (const [a, b] of segs) clear = Math.min(clear, segDist2D(c, a, b));
    for (const q of avoid) clear = Math.min(clear, Math.hypot(c[0] - q[0], c[1] - q[1]));
    if (clear >= need) return [c[0], c[1], tip[2] ?? 0];
    if (clear > bestC) { bestC = clear; best = c; }
  }
  return [best[0], best[1], tip[2] ?? 0];
}

// ------------------------------------------------------------------ eigen-directions of a 2×2 matrix

export type EigenDirs =
  | { kind: 'none'; re: number; im: number }                 // complex eigenvalues: no real direction stays on its line
  | { kind: 'all'; value: number }                            // M = λI: every direction does
  | { kind: 'lines'; angles: number[]; values: number[] };    // 1 or 2 lines; angles in [0, π)

/** Directions x (as angles of lines through the origin) with Mx parallel to x, and their λ. */
export function eigenDirs2(M: Mat): EigenDirs {
  const [[a, b], [c, d]] = M;
  const sc = Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d), 1e-12);
  const tol = 1e-9 * sc;
  const tr = a + d, dt = a * d - b * c;
  const disc = tr * tr - 4 * dt;
  if (Math.abs(b) <= tol && Math.abs(c) <= tol && Math.abs(a - d) <= tol) return { kind: 'all', value: a };
  if (disc < -1e-9 * sc * sc) return { kind: 'none', re: tr / 2, im: Math.sqrt(-disc) / 2 };
  const s = Math.sqrt(Math.max(0, disc));
  const lams = s < 1e-7 * sc ? [tr / 2] : [(tr + s) / 2, (tr - s) / 2];
  const angles: number[] = [], values: number[] = [];
  for (const l of lams) {
    // x is perpendicular to the larger row of (M − λI)
    const r1: Vec = [a - l, b], r2: Vec = [c, d - l];
    const r = norm(r1) >= norm(r2) ? r1 : r2;
    let th = Math.atan2(-r[0], r[1]); // direction (r[1], -r[0]) ⟂ r
    th = ((th % Math.PI) + Math.PI) % Math.PI;
    if (th >= Math.PI - 1e-12) th = 0;
    if (!angles.some((x) => lineAngleDist(x, th) < 1e-6)) { angles.push(th); values.push(l); }
  }
  return { kind: 'lines', angles, values };
}

/** Sine of the angle from x = (cos t, sin t) to Mx: 0 exactly when Mx lies on x's line (or Mx = 0). */
export function parallelSin(M: Mat, t: number): number {
  const x = [Math.cos(t), Math.sin(t)];
  const y = matVec(M, x);
  const n = norm(y);
  return n < 1e-9 ? 0 : cross2(x, y) / n;
}

/**
 * Mark the angle bins swept from angle a0 over d radians (d may be negative or more than a turn).
 * `bins` splits the full turn into bins.length equal bins. Samples every half bin, so no bin is
 * skipped by rounding. Returns true if any bin was newly marked.
 */
export function markArc(bins: Uint8Array, a0: number, d: number): boolean {
  const n = bins.length, w = TAU / n;
  const steps = Math.max(1, Math.ceil((Math.abs(d) / w) * 2));
  let changed = false;
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (d * i) / steps;
    const b = Math.min(n - 1, Math.floor(((((a % TAU) + TAU) % TAU) / TAU) * n));
    if (!bins[b]) { bins[b] = 1; changed = true; }
  }
  return changed;
}

/** x·Mx for unit x at angle t (equals λ when x is an eigenvector). */
export const stretchAlong = (M: Mat, t: number): number => dot([Math.cos(t), Math.sin(t)], matVec(M, [Math.cos(t), Math.sin(t)]));

// ------------------------------------------------------------------ SVD as rotate · stretch · rotate

export interface Svd2 {
  /** Angle of v1 (first input axis); Vᵀ rotates by −theta. |theta| ≤ π/2. */
  theta: number;
  /** Angle of u1 (first output axis); U rotates by phi. */
  phi: number;
  /** Stretch factors along the axes: [σ1, ±σ2] (σ2 is negative when M flips orientation). */
  s: [number, number];
  /** σ1 ≥ σ2 ≥ 0. */
  sigma: [number, number];
  v1: P3; v2: P3; u1: P3; u2: P3;
}

/** M = R(phi) · diag(s1, s2) · R(theta)ᵀ with both R rotations (a flip goes into the sign of s2). */
export function svdRot2(M: Mat): Svd2 {
  const { U, S, V } = svd(M);
  let v1 = [V[0][0], V[1][0]], v2 = [V[0][1], V[1][1]];
  let u1 = [U[0][0], U[1][0]], u2 = [U[0][1], U[1][1]];
  const s1 = S[0] ?? 0, s2 = S[1] ?? 0;
  // u1 from V when σ1 = 0 (zero matrix): keep a frame anyway
  if (s1 < 1e-12) { u1 = v1.slice(); u2 = v2.slice(); }
  // make V a rotation
  if (cross2(v1, v2) < 0) { v2 = v2.map((x) => -x); u2 = u2.map((x) => -x); }
  // σ2 = 0: the second output axis is free, choose it to make U a rotation
  if (s2 < 1e-12) u2 = [-u1[1], u1[0]];
  let sign = 1;
  if (cross2(u1, u2) < 0) { u2 = u2.map((x) => -x); sign = -1; }
  let theta = Math.atan2(v1[1], v1[0]);
  let phi = Math.atan2(u1[1], u1[0]);
  // negate both frames (a half turn on each side) to keep the first rotation small
  if (Math.abs(theta) > Math.PI / 2 + 1e-12) {
    theta = wrapAngle(theta + Math.PI); phi = wrapAngle(phi + Math.PI);
    v1 = v1.map((x) => -x); v2 = v2.map((x) => -x); u1 = u1.map((x) => -x); u2 = u2.map((x) => -x);
  }
  return {
    theta, phi: wrapAngle(phi), s: [s1, sign * s2], sigma: [s1, s2],
    v1: to3(v1), v2: to3(v2), u1: to3(u1), u2: to3(u2),
  };
}

/**
 * The matrix part-way through the three moves, k ∈ [0, 3]:
 * 0 → I, 1 → Vᵀ (rotate), 2 → ΣVᵀ (stretch), 3 → UΣVᵀ = M (rotate).
 */
export function svdPath(d: Svd2, k: number): Mat {
  const kk = Math.max(0, Math.min(3, k));
  const Vt = rot2(-d.theta * Math.min(1, kk));
  if (kk <= 1) return Vt;
  const t = Math.min(1, kk - 1);
  const S: Mat = [[1 + (d.s[0] - 1) * t, 0], [0, 1 + (d.s[1] - 1) * t]];
  const SVt = matMul(S, Vt);
  if (kk <= 2) return SVt;
  return matMul(rot2(d.phi * (kk - 2)), SVt);
}

/** n+1 points of the image of the circle of radius r under M (closed: last = first). */
export function ellipsePts(M: Mat, r = 1, n = 128): P3[] {
  const out: P3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (TAU * i) / n;
    const p = matVec(M, [r * Math.cos(t), r * Math.sin(t)]);
    out.push([p[0], p[1], 0]);
  }
  return out;
}

// ------------------------------------------------------------------ line fitting

/** Residuals y − (m x + c): positive when the point is above the line. */
export const residuals = (pts: readonly number[][], m: number, c: number): number[] => pts.map((p) => p[1] - (m * p[0] + c));
/** Sum of squared residuals. */
export const ssr = (pts: readonly number[][], m: number, c: number): number => residuals(pts, m, c).reduce((s, r) => s + r * r, 0);

/** Least-squares line y = m x + c through the points (normal equations, via la.leastSquares). */
export function bestLine(pts: readonly number[][]): { m: number; c: number } | null {
  const sol = leastSquares(pts.map((p) => [p[0], 1]), pts.map((p) => p[1]));
  return sol ? { m: sol[0], c: sol[1] } : null;
}

/** The line through (x1, y1) and (x2, y2). */
export function lineThrough(x1: number, y1: number, x2: number, y2: number): { m: number; c: number } {
  const m = Math.abs(x2 - x1) < EPS ? 0 : (y2 - y1) / (x2 - x1);
  return { m, c: y1 - m * x1 };
}

// ------------------------------------------------------------------ projection onto a plane

/** Split v into p (in the plane spanned by a and b) and r = v − p (perpendicular to it). */
export function planeSplit(v: readonly number[], a: readonly number[], b: readonly number[]): { p: P3; r: P3; n: P3 } {
  const n = unit3(cross(to3(a), to3(b)));
  const vv = to3(v);
  const r = scale3(n, dot(vv, n));
  return { p: sub3(vv, r), r, n };
}

/** Where the line from `from` through `through` meets the plane n·x = d (null when parallel). */
export function rayPlane(from: readonly number[], through: readonly number[], n: readonly number[], d = 0): P3 | null {
  const dir = sub3(through, from);
  const den = dot(to3(n), dir);
  if (Math.abs(den) < 1e-9) return null;
  const s = (d - dot(to3(n), to3(from))) / den;
  return add3(from, dir, s);
}

// ------------------------------------------------------------------ point clouds

/** Variance of the shadows of the points on the line through `mean` along `dir`. */
export function spreadAlong(pts: readonly number[][], mean: readonly number[], dir: readonly number[]): number {
  const u = normalize(dir.slice(0, mean.length));
  let s = 0;
  for (const p of pts) { let t = 0; for (let i = 0; i < mean.length; i++) t += (p[i] - mean[i]) * u[i]; s += t * t; }
  return pts.length ? s / pts.length : 0;
}

/** The shadows themselves: each point moved onto the line through `mean` along `dir`. */
export function shadowsOnLine(pts: readonly number[][], mean: readonly number[], dir: readonly number[]): number[][] {
  const u = normalize(dir.slice(0, mean.length));
  return pts.map((p) => {
    let t = 0;
    for (let i = 0; i < mean.length; i++) t += (p[i] - mean[i]) * u[i];
    return mean.map((m, i) => m + t * u[i]);
  });
}

/** Principal directions (pca from la.ts) with the 2-D directions turned to point right/up. */
export function principal(pts: readonly number[][]): { mean: number[]; values: number[]; vectors: number[][] } {
  const r = pca(pts.map((p) => p.slice()));
  const vectors = r.vectors.map((v) => {
    const k = v.findIndex((x) => Math.abs(x) > 1e-9);
    return k >= 0 && v[k] < 0 ? v.map((x) => -x) : v;
  });
  return { mean: r.mean, values: r.values.map((x) => Math.max(0, x)), vectors };
}

// ------------------------------------------------------------------ seeded data

/** Small deterministic random generator (mulberry32): the same seed gives the same puzzle. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal samples from a seeded generator (Box–Muller). */
export function gauss(r: () => number): number {
  const u = Math.max(1e-12, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

/** n points of an elongated 2-D blob: spreads s1 along angle `angle`, s2 across it. */
export function blob2(n: number, o: { mean?: [number, number]; s1?: number; s2?: number; angle?: number; seed?: number } = {}): number[][] {
  const r = rng(o.seed ?? 1);
  const [mx, my] = o.mean ?? [0, 0];
  const s1 = o.s1 ?? 2, s2 = o.s2 ?? 0.6, a = o.angle ?? 0.5;
  const c = Math.cos(a), s = Math.sin(a);
  return Array.from({ length: n }, () => {
    const x = gauss(r) * s1, y = gauss(r) * s2;
    return [mx + c * x - s * y, my + s * x + c * y];
  });
}

/** n points near the line y = m x + c (x spread evenly over [x0, x1], noise of size `noise`). */
export function noisyLine(n: number, o: { m?: number; c?: number; x0?: number; x1?: number; noise?: number; seed?: number } = {}): number[][] {
  const r = rng(o.seed ?? 7);
  const m = o.m ?? 0.5, c = o.c ?? 0, x0 = o.x0 ?? -4, x1 = o.x1 ?? 4, noise = o.noise ?? 0.6;
  return Array.from({ length: n }, (_, i) => {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n + (r() - 0.5) * 0.3;
    return [x, m * x + c + gauss(r) * noise];
  });
}
