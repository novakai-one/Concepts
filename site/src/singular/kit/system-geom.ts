// Pure geometry for SystemView (no three, no DOM): each row a·x = c of an augmented matrix is a line
// (2 unknowns) or a plane (3 unknowns). When a row operation changes a row, the old and new line/plane
// meet along a "hinge" (a point in 2-D, a line in 3-D). The animation rotates the row about that
// hinge, so every point that solves the system (it lies on the hinge) stays put the whole way.
// Unit-tested in tests/singular/game-rowops.test.ts.
import type { Frac } from '../math/frac.ts';

export type Vec = number[];

/** The line / plane n·x = c. */
export interface Hyper { n: Vec; c: number }

export const dot = (a: Vec, b: Vec): number => a.reduce((s, x, i) => s + x * b[i], 0);
export const len = (a: Vec): number => Math.sqrt(dot(a, a));
export const add = (a: Vec, b: Vec): Vec => a.map((x, i) => x + b[i]);
export const sub = (a: Vec, b: Vec): Vec => a.map((x, i) => x - b[i]);
export const scale = (a: Vec, k: number): Vec => a.map((x) => x * k);
export const cross3 = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export function unit(a: Vec): Vec | null { const l = len(a); return l < 1e-12 ? null : scale(a, 1 / l); }

/** Row [a₁ … aₙ | c] → hyperplane (numbers). */
export function rowHyper(row: (Frac | number)[], n: number): Hyper {
  const v = (x: Frac | number) => (typeof x === 'number' ? x : x.value());
  return { n: row.slice(0, n).map(v), c: v(row[n]) };
}

/** Scale so the normal has length 1. Null when the normal is zero (the row reads 0 = c). */
export function normHyper(h: Hyper): Hyper | null {
  const l = len(h.n);
  return l < 1e-12 ? null : { n: scale(h.n, 1 / l), c: h.c / l };
}

/** Closest point of a hyperplane (unit normal) to p. */
export function projectTo(h: Hyper, p: Vec): Vec {
  return sub(p, scale(h.n, dot(h.n, p) - h.c));
}

export interface HingeTween {
  /** 'rotate' about a common point/line, 'slide' between parallel rows, 'same' when nothing moves. */
  kind: 'rotate' | 'slide' | 'same';
  /** The hyperplane at t ∈ [0, 1] (unit normal). */
  at(t: number): Hyper;
  /** A point on the hinge (rotate only). */
  hinge: Vec | null;
  /** Rotation axis (3-D rotate only, unit) and total angle in radians. */
  axis: Vec | null;
  angle: number;
}

/**
 * Tween from row a to row b. Both are normalised and b's sign is matched to a's (the same line or
 * plane), then the normal turns at an even rate about the hinge where the two meet.
 * Null when either row has a zero normal (0 = c): the caller fades instead.
 */
export function hingeTween(a: Hyper, b: Hyper): HingeTween | null {
  const A = normHyper(a), B0 = normHyper(b);
  if (!A || !B0) return null;
  let B = B0;
  if (dot(A.n, B.n) < 0) B = { n: scale(B.n, -1), c: -B.c };
  const d = Math.max(-1, Math.min(1, dot(A.n, B.n)));
  const angle = Math.acos(d);
  if (angle < 1e-7) {
    if (Math.abs(A.c - B.c) < 1e-9) return { kind: 'same', at: () => A, hinge: null, axis: null, angle: 0 };
    return { kind: 'slide', at: (t) => ({ n: A.n, c: A.c + (B.c - A.c) * t }), hinge: null, axis: null, angle: 0 };
  }
  // the point of the hinge closest to the origin: q = λ₁·nA + λ₂·nB with nA·q = cA, nB·q = cB
  const den = 1 - d * d;
  const l1 = (A.c - d * B.c) / den, l2 = (B.c - d * A.c) / den;
  const q = add(scale(A.n, l1), scale(B.n, l2));
  const s = Math.sin(angle);
  const at = (t: number): Hyper => {
    const nt = add(scale(A.n, Math.sin((1 - t) * angle) / s), scale(B.n, Math.sin(t * angle) / s));
    const u = unit(nt) ?? A.n;
    return { n: u, c: dot(u, q) };
  };
  const axis = A.n.length === 3 ? unit(cross3(A.n, B.n)) : null;
  return { kind: 'rotate', at, hinge: q, axis, angle };
}

/**
 * An in-plane frame (u, v) for a plane with unit normal n: u is level (no z part) and v points up the
 * slope, so square patches keep level edges. It changes smoothly with n (u flips with n, and the
 * square looks the same either way), except for planes that are nearly level.
 */
export function planeFrame(n: Vec): [Vec, Vec] {
  const r = Math.hypot(n[0], n[1]);
  if (r < 1e-6) return [[1, 0, 0], unit(cross3(n, [1, 0, 0]))!.map((x) => x * Math.sign(n[2] || 1))];
  const u = [-n[1] / r, n[0] / r, 0];
  const v = cross3(n, u); // its z part is r > 0: up the slope
  return [u, unit(v)!];
}

/**
 * Clip the line q + s·d to the square patch centred at c with unit edges u, v and half-size h.
 * Returns the parameter range [s0, s1], or null if the line misses the patch.
 */
export function clipToSquare(q: Vec, d: Vec, c: Vec, u: Vec, v: Vec, h: number): [number, number] | null {
  let lo = -Infinity, hi = Infinity;
  for (const e of [u, v]) {
    const p0 = dot(sub(q, c), e), k = dot(d, e);
    if (Math.abs(k) < 1e-12) { if (Math.abs(p0) > h) return null; continue; }
    let a = (-h - p0) / k, b = (h - p0) / k;
    if (a > b) [a, b] = [b, a];
    lo = Math.max(lo, a); hi = Math.min(hi, b);
  }
  return lo <= hi ? [lo, hi] : null;
}

/** Where two planes (unit normals) meet: a point and a unit direction, or null if parallel. */
export function planePlaneLine(a: Hyper, b: Hyper): { q: Vec; d: Vec } | null {
  const dir = cross3(a.n, b.n);
  const d = unit(dir);
  if (!d) return null;
  const k = dot(a.n, b.n), den = 1 - k * k;
  const q = add(scale(a.n, (a.c - k * b.c) / den), scale(b.n, (b.c - k * a.c) / den));
  return { q, d };
}
