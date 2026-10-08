// Chapter 7 pure logic (no DOM, no three): the story numbers, every win check, the doubt predicates,
// the Law core, the set piece's numbers, the Act II Review predicates and the crew versions of the
// builds. Unit-tested in tests/singular/game-c07.test.ts. Every number is computed with math/la.ts.
import { cross, dot, norm, vadd, vscale, vsub, type Vec } from '../../../math/la.ts';
import { nice } from '../../../math/frac.ts';
import { rint, type LawCore } from '../../../game/lawcheck.ts';

export const num = (x: number): string => nice(x).replace('-', '−');
export const fmt = (v: readonly number[]): string => `(${v.map((x) => num(x)).join(', ')})`;
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
export const dist = (a: readonly number[], b: readonly number[]): number => Math.hypot(a[0] - b[0], a[1] - b[1], (a[2] ?? 0) - (b[2] ?? 0));
export const deg = (r: number): number => (r * 180) / Math.PI;
/** A point on the line p + t d. */
export const along = (p: readonly number[], d: readonly number[], t: number): Vec => vadd(p as Vec, vscale(d as Vec, t));

// ------------------------------------------------------------------ the hangar door (Chapter 5's triangle)

export const DOOR_P: Vec = [1, 0, 0];
export const DOOR_Q: Vec = [0, 2, 0];
export const DOOR_R: Vec = [0, 0, 3];
/** The door's normal (Q − P) × (R − P) = (6, 3, 2); its length is 7. */
export const DOOR_N: Vec = cross(vsub(DOOR_Q, DOOR_P), vsub(DOOR_R, DOOR_P));
/** The door's plane: n · X = k with k = n · P = 6, so 6x + 3y + 2z = 6. */
export const DOOR_K = dot(DOOR_N, DOOR_P);
export const DOOR_CENTRE: Vec = vscale(vadd(vadd(DOOR_P, DOOR_Q), DOOR_R), 1 / 3);
/** How far a point is off the door's plane, signed, in units of n (n · X − k). */
export const planeReading = (x: readonly number[], n: readonly number[] = DOOR_N, k: number = DOOR_K): number => dot(n as Vec, x as Vec) - k;
export const onPlane = (x: readonly number[], tol = 1e-6, n: readonly number[] = DOOR_N, k: number = DOOR_K): boolean =>
  Math.abs(planeReading(x, n, k)) <= tol * norm(n as Vec);
/** Closest point of a plane to x (the foot of the perpendicular). */
export const footOnPlane = (x: readonly number[], n: readonly number[] = DOOR_N, k: number = DOOR_K): Vec =>
  vsub(x as Vec, vscale(n as Vec, planeReading(x, n, k) / dot(n as Vec, n as Vec)));
/** Where a point is inside the triangle P, Q, R (on its plane): barycentric weights. */
export function insideDoor(x: readonly number[], margin = 0): boolean {
  const v0 = vsub(DOOR_Q, DOOR_P), v1 = vsub(DOOR_R, DOOR_P), v2 = vsub(x as Vec, DOOR_P);
  const d00 = dot(v0, v0), d01 = dot(v0, v1), d11 = dot(v1, v1), d20 = dot(v2, v0), d21 = dot(v2, v1);
  const den = d00 * d11 - d01 * d01;
  const b = (d11 * d20 - d01 * d21) / den, c = (d00 * d21 - d01 * d20) / den, a = 1 - b - c;
  return a >= -margin && b >= -margin && c >= -margin;
}

// ------------------------------------------------------------------ ray meets plane (the chapter's one formula)

/** Where p + t d meets n · X = k: t = (k − n · p) / (n · d), or null when d reads 0 against n (no single hit). */
export function rayPlane(p: readonly number[], d: readonly number[], n: readonly number[], k: number): number | null {
  const den = dot(n as Vec, d as Vec);
  if (Math.abs(den) < 1e-12) return null;
  return (k - dot(n as Vec, p as Vec)) / den;
}
export const distToPlane = (q: readonly number[], n: readonly number[], k: number): number => Math.abs(dot(n as Vec, q as Vec) - k) / norm(n as Vec);
/** Distance from q to the line p + t d: |(q − p) × d| / |d|. */
export const distToLine = (q: readonly number[], p: readonly number[], d: readonly number[]): number =>
  norm(cross(vsub(q as Vec, p as Vec), d as Vec)) / norm(d as Vec);
/** Closest point of the line p + t d to q: its t. */
export const footT = (q: readonly number[], p: readonly number[], d: readonly number[]): number => dot(vsub(q as Vec, p as Vec), d as Vec) / dot(d as Vec, d as Vec);
/** The gap between two lines measured along d1 × d2 (skew distance); null for parallel lines. */
export function skewDist(p1: readonly number[], d1: readonly number[], p2: readonly number[], d2: readonly number[]): number | null {
  const x = cross(d1 as Vec, d2 as Vec);
  const l = norm(x);
  if (l < 1e-12) return null;
  return Math.abs(dot(vsub(p2 as Vec, p1 as Vec), x)) / l;
}
/** Closest points of two non-parallel lines: their t and s. */
export function closestTs(p1: readonly number[], d1: readonly number[], p2: readonly number[], d2: readonly number[]): [number, number] | null {
  const w0 = vsub(p1 as Vec, p2 as Vec);
  const a = dot(d1 as Vec, d1 as Vec), b = dot(d1 as Vec, d2 as Vec), c = dot(d2 as Vec, d2 as Vec);
  const dd = dot(d1 as Vec, w0), e = dot(d2 as Vec, w0);
  const den = a * c - b * b;
  if (Math.abs(den) < 1e-12) return null;
  return [(b * e - c * dd) / den, (a * e - b * dd) / den];
}

// ------------------------------------------------------------------ p1 Same place, same time?

export const P1_DIR: Vec = [1, 1, 0];
export const DEB1_P: Vec = [4, 0, 0];
export const DEB1_D: Vec = [-1, 1, 0];
export const P1_CROSS: Vec = [2, 2, 0];
export const P1_CROSS_MIN = 2;
/** Clearance needed between the two ships (0.5 grid steps = 50 m). */
export const P1_CLEAR = 0.5;
/** Where each ship is at minute t, our speed k (k = 1 is the planned speed). */
export const ourAt = (k: number, t: number): Vec => vscale(P1_DIR, k * t);
export const debrisAt = (t: number): Vec => along(DEB1_P, DEB1_D, t);
/** The closest the two ships come over all minutes: √8 |k − 1| / √(k² + 1). */
export const p1MinGap = (k: number): number => (Math.sqrt(8) * Math.abs(k - 1)) / Math.sqrt(k * k + 1);
/** The minute the two ships are closest. */
export const p1MinAt = (k: number): number => (2 * (k + 1)) / (k * k + 1);
/** Win: our path still passes the crossing (speed only changes when), and we clear the debris. */
export const p1Won = (k: number): boolean => k > 0 && p1MinGap(k) >= P1_CLEAR - 1e-9;

// ------------------------------------------------------------------ p2 Never crossing (skew lines)

export const P2_P1: Vec = [0, 0, 0];
export const P2_D1: Vec = [1, 0, 0];
export const P2_P2: Vec = [0, 1, 2];
export const P2_D2: Vec = [0, 1, 0];
export const P2_GAP = skewDist(P2_P1, P2_D1, P2_P2, P2_D2)!;
export const P2_CROSS: Vec = cross(P2_D1, P2_D2);
export const P2_TS = closestTs(P2_P1, P2_D1, P2_P2, P2_D2)!;
/** The link between the beads: from our bead (t) to the debris bead (s). */
export const p2Link = (t: number, s: number): Vec => vsub(along(P2_P2, P2_D2, s), along(P2_P1, P2_D1, t));
/** Win: the link reads 0 against both directions. */
export const p2Won = (t: number, s: number, tol = 0.05): boolean => {
  const l = p2Link(t, s);
  return Math.abs(dot(l, P2_D1)) <= tol && Math.abs(dot(l, P2_D2)) <= tol;
};

// ------------------------------------------------------------------ p3 [D][H] Write the door

/** Three points the test needs, and they must be different places on the door. */
export function p3Accept(tests: readonly Vec[], x: readonly number[], tol = 0.02): boolean {
  if (!onPlane(x, tol)) return false;
  return tests.every((t) => dist(t, x) >= 0.4);
}
export const P3_TESTS: Vec[] = [[0, 0, 3], [0.5, 1, 0], [0.25, 0.5, 1.5]];
/** Commander's tiles, in a correct order: point and normal, the arrow X − P, a right angle, expand. */
export const P3_TILES = ['t1', 't2', 't3', 't4', 't5'];
export function p3OrderOk(order: readonly string[]): boolean {
  if (order.length !== 5 || order.some((id) => !P3_TILES.includes(id))) return false;
  return order.join() === P3_TILES.join();
}

// ------------------------------------------------------------------ p4 Hit the centre

export const P4_DIR: Vec = [1, 2, 3];
/** Where the path from the origin along d meets the door (null if it never does, or meets it behind us). */
export function p4Hit(d: readonly number[]): { t: number; at: Vec } | null {
  const t = rayPlane([0, 0, 0], d, DOOR_N, DOOR_K);
  if (t === null || t <= 0) return null;
  return { t, at: vscale(d as Vec, t) };
}
export const p4Won = (d: readonly number[], tol = 0.05): boolean => {
  const h = p4Hit(d);
  return !!h && dist(h.at, DOOR_CENTRE) <= tol;
};

// ------------------------------------------------------------------ p5 How far out?

export const HOLD: Vec = [3, 3, 3];
export const HOLD_FOOT: Vec = footOnPlane(HOLD);
export const HOLD_DIST = distToPlane(HOLD, DOOR_N, DOOR_K);
export const HOLD_LINE_T = footT(HOLD, [0, 0, 0], P4_DIR);
export const HOLD_LINE_FOOT: Vec = along([0, 0, 0], P4_DIR, HOLD_LINE_T);
export const HOLD_LINE_DIST = distToLine(HOLD, [0, 0, 0], P4_DIR);
export const p5PlaneWon = (f: readonly number[], tol = 0.05): boolean => dist(f, HOLD_FOOT) <= tol;
export const p5LineWon = (t: number, tol = 0.02): boolean => Math.abs(t - HOLD_LINE_T) <= tol;

// ------------------------------------------------------------------ p6 [H] The weld seam

export const HULL_N: Vec = [1, -1, 0];
export const HULL_K = 0;
export const WELD_DIR: Vec = cross(DOOR_N, HULL_N);
export const WELD_POINT: Vec = [0, 0, 3];
export const WELD_COS = dot(DOOR_N, HULL_N) / (norm(DOOR_N) * norm(HULL_N));
export const WELD_DEG = deg(Math.acos(WELD_COS));
/** A weld line works when it lies in both planes: its direction reads 0 against both normals and its point is on both. */
export const weldOk = (p: readonly number[], d: readonly number[], tol = 1e-6): boolean =>
  norm(d as Vec) > 1e-9 && Math.abs(dot(d as Vec, DOOR_N)) <= tol && Math.abs(dot(d as Vec, HULL_N)) <= tol && onPlane(p, tol) && onPlane(p, tol, HULL_N, HULL_K);

// ------------------------------------------------------------------ p7 [S] No single hit

export const P7_START: Vec = [2, 2, 2];
/** The hit test reports no single hit exactly when the direction reads 0 against the normal. */
export const p7Won = (d: readonly number[]): boolean => norm(d as Vec) > 1e-9 && rayPlane(P7_START, d, DOOR_N, DOOR_K) === null;

// ------------------------------------------------------------------ Doubts

/** (F) "Two lines in space that aren't parallel have to cross." Holds unless the lines are not parallel and miss. */
export function mustCross(p1: readonly number[], d1: readonly number[], p2: readonly number[], d2: readonly number[]): boolean {
  const g = skewDist(p1, d1, p2, d2);
  if (g === null) return true; // parallel: the claim says nothing
  return g < 1e-6;
}
/** (T) "The numbers in front of x, y and z point straight out of the plane." Checked on two arrows lying in the plane. */
export function coeffsOut(n: readonly number[], k: number): boolean {
  if (norm(n as Vec) < 1e-9) return true;
  const [a, b] = inPlaneDirs(n);
  const x0 = footOnPlane([0, 0, 0], n, k);
  const x1 = vadd(x0, a), x2 = vadd(x0, vadd(vscale(a, 2), b));
  // both points really lie on the plane, and the arrows between plane points read 0 against n
  return onPlane(x1, 1e-9, n, k) && onPlane(x2, 1e-9, n, k) && Math.abs(dot(vsub(x1, x0), n as Vec)) < 1e-9 && Math.abs(dot(vsub(x2, x1), n as Vec)) < 1e-9;
}
/** Two arrows lying in the plane with normal n. */
export function inPlaneDirs(n: readonly number[]): [Vec, Vec] {
  const helper: Vec = Math.abs(n[2]) < 0.9 * norm(n as Vec) ? [0, 0, 1] : [1, 0, 0];
  const a = cross(n as Vec, helper);
  const b = cross(n as Vec, a);
  return [vscale(a, 1 / norm(a)), vscale(b, 1 / norm(b))];
}

// ------------------------------------------------------------------ the Law

export interface PlaneCase { n: Vec; k: number; x: Vec; y: Vec }
const rv = (r: () => number, lo = -4, hi = 4): Vec => [rint(r, lo, hi), rint(r, lo, hi), rint(r, lo, hi)];
/** Two points of the plane n · X = k, made from whole-number steps along two arrows lying in it. */
function twoPoints(n: Vec, k: number, r: () => number): [Vec, Vec] {
  const x0 = footOnPlane([0, 0, 0], n, k);
  const [a, b] = inPlaneDirs(n);
  return [vadd(x0, vadd(vscale(a, rint(r, -3, 3)), vscale(b, rint(r, -3, 3)))), vadd(x0, vadd(vscale(a, rint(r, -3, 3)), vscale(b, rint(r, -3, 3))))];
}
export const LAW_RELS: Record<string, (c: PlaneCase) => boolean> = {
  /** every arrow between two points of the plane reads 0 against (a, b, c) */
  perp: (c) => Math.abs(dot(c.n, vsub(c.y, c.x))) < 1e-9,
  /** (a, b, c) lies along the plane: from a point of the plane, its tip stays on the plane */
  inside: (c) => onPlane(vadd(c.x, c.n), 1e-9, c.n, c.k),
  /** (a, b, c) makes 45° with every arrow in the plane */
  deg45: (c) => { const e = vsub(c.y, c.x); const l = norm(e); return l > 1e-9 && near(Math.abs(dot(c.n, e)) / (norm(c.n) * l), Math.SQRT1_2, 1e-9); },
};
/** In ax + by + cz = d, the arrow (a, b, c) is [rel] the plane, [when]. */
export const lawCore: LawCore<PlaneCase> & { answer: Record<string, string> } = {
  id: 'c07-law',
  answer: { rel: 'perp', when: 'always' },
  gen: (r) => {
    let n: Vec;
    do { n = rv(r, -5, 5); } while (norm(n) < 1e-9);
    const k = r() < 0.2 ? 0 : rint(r, -9, 9);
    const [x, y] = twoPoints(n, k, r);
    return { n, k, x, y };
  },
  edgeCases: [
    { n: [6, 3, 2], k: 6, x: [1, 0, 0], y: [0, 2, 0] },          // the hangar door
    { n: [1, -1, 0], k: 0, x: [0, 0, 3], y: [2, 2, -1] },        // the hull plane, through the origin
    { n: [0, 0, 1], k: 4, x: [1, 2, 4], y: [-3, 5, 4] },         // a level deck
  ],
  holds(f, c) {
    const rel = LAW_RELS[f.rel];
    if (!rel) return false;
    const v = rel(c);
    if (f.when === 'always') return v;
    if (f.when === 'd0') return v === (c.k === 0);
    return false;
  },
  describe: (c) => `the plane ${planeEq(c.n, c.k)}, points ${fmt(c.x)} and ${fmt(c.y)}: the arrow between them reads ${num(dot(c.n, vsub(c.y, c.x)))} against ${fmt(c.n)}`,
};
/** "6x + 3y + 2z = 6" from n and k. */
export function planeEq(n: readonly number[], k: number): string {
  const parts: string[] = [];
  ['x', 'y', 'z'].forEach((s, i) => {
    const a = n[i];
    if (Math.abs(a) < 1e-12) return;
    const mag = Math.abs(a) === 1 ? '' : num(Math.abs(a));
    parts.push(`${parts.length ? (a < 0 ? ' − ' : ' + ') : a < 0 ? '−' : ''}${mag}${s}`);
  });
  return `${parts.join('') || '0'} = ${num(k)}`;
}

// ------------------------------------------------------------------ the Act II set piece: docking

/** Stage 1: the roll axis must lie along the door's normal (read 0 against both door edges). */
export const DOOR_E1: Vec = vsub(DOOR_Q, DOOR_P);
export const DOOR_E2: Vec = vsub(DOOR_R, DOOR_P);
export const axisOk = (a: readonly number[], tol = 1e-6): boolean =>
  norm(a as Vec) > 1e-9 && Math.abs(dot(a as Vec, DOOR_E1)) <= tol && Math.abs(dot(a as Vec, DOOR_E2)) <= tol;
/** Stage 2: the approach path runs along the normal, through the door's centre. It starts a third of n out. */
export const SP_S0 = 1 / 3;
export const SP_START: Vec = along(DOOR_CENTRE, DOOR_N, SP_S0);
export const pathOk = (anchor: readonly number[], tol = 0.05): boolean => dist(anchor, DOOR_CENTRE) <= tol;
/** Stage 3: the nearest debris track, and the gap from our path to it (skew distance 15/7 > 1.5). */
export const SP_DEB_P: Vec = [10 / 3, 2 / 3, 0];
export const SP_DEB_D: Vec = [2, -6, 3];
export const SP_CLEAR = 1.5;
export const SP_GAP = skewDist(DOOR_CENTRE, DOOR_N, SP_DEB_P, SP_DEB_D)!;
export const SP_TS = closestTs(DOOR_CENTRE, DOOR_N, SP_DEB_P, SP_DEB_D)!;
/** The gap from the point at t on our path to the debris track (the bead the player slides). */
export const spGapAt = (t: number): number => distToLine(along(DOOR_CENTRE, DOOR_N, t), SP_DEB_P, SP_DEB_D);
export const spMeasured = (t: number, tol = 0.02): boolean => Math.abs(t - SP_TS[0]) <= tol;
/** Stage 4: one burn from where the Lantern holds to the path's start, built from the three thrusters.
 *  The Lantern holds farther out than the path start, on the same side of the door's plane (and of the
 *  hull plate x − y = 0), so the burn closes on the door nose first and crosses neither plate. */
export const THRUSTERS: Vec[] = [[1, 0, 1], [0, 1, 1], [0, 0, 2]];
export const SP_BURN: Vec = [-1, -1, 0];
export const SP_DIALS: Vec = [-1, -1, 1];
export const SP_SHIP: Vec = vsub(SP_START, SP_BURN);
export const burnOf = (dials: readonly number[]): Vec => THRUSTERS.reduce((s, t, i) => vadd(s, vscale(t, dials[i])), [0, 0, 0] as Vec);
export const spBurnWon = (dials: readonly number[], tol = 0.05): boolean => dist(vadd(SP_SHIP, burnOf(dials)), SP_START) <= tol;

// ------------------------------------------------------------------ the Act II Review (Bram, four claims)

/** (F) "If two arrows have dot product zero, one of them has a zero part." */
export function dotZeroHasZeroPart(v: readonly number[], w: readonly number[]): boolean {
  if (Math.abs(dot(v as Vec, w as Vec)) > 1e-9) return true;
  return v.some((x) => Math.abs(x) < 1e-9) || w.some((x) => Math.abs(x) < 1e-9);
}
/** (F) "If a × b = 0, then a or b is the zero arrow." */
export function crossZeroMeansZero(a: readonly number[], b: readonly number[]): boolean {
  if (norm(cross(a as Vec, b as Vec)) > 1e-9) return true;
  return norm(a as Vec) < 1e-9 || norm(b as Vec) < 1e-9;
}
/** (F) "Three points always fix exactly one plane." True for three points not on one line. */
export const threePointsOnePlane = (a: readonly number[], b: readonly number[], c: readonly number[]): boolean =>
  norm(cross(vsub(b as Vec, a as Vec), vsub(c as Vec, a as Vec))) > 1e-9;

// ------------------------------------------------------------------ crew versions of the builds (LANTERN's backup)

export const crew = {
  rayPlane: (p: number[], d: number[], n: number[], k: number): number | null => rayPlane(p, d, n, k),
  distToPlane: (q: number[], n: number[], k: number): number => distToPlane(q, n, k),
};
export const swarmVec = (r: () => number, wide: boolean): number[] => rv(r, wide ? -9 : -4, wide ? 9 : 4);
