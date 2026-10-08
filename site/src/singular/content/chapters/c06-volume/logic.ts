// Chapter 6 pure logic (no DOM, no three): the story numbers, every win check, the doubt predicates,
// the Law core, the strut-scan data and the crew versions of the builds.
// Unit-tested in tests/singular/game-c06.test.ts. Every number here is computed with math/la.ts.
import { cross, dot, norm, rank, vadd, vscale, vsub, type Vec } from '../../../math/la.ts';
import { nice } from '../../../math/frac.ts';
import { rint, rng, type LawCore } from '../../../game/lawcheck.ts';

/** A number for display: integers, simple fractions, else 2 decimals; a real minus sign. */
export const num = (x: number): string => nice(x).replace('-', '−');
export const fmt = (v: readonly number[]): string => `(${v.map((x) => num(x)).join(', ')})`;
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], (a[2] ?? 0) - (b[2] ?? 0));

/** The scalar triple product a · (b × c): the signed volume of the box on a, b, c. */
export const triple = (a: readonly number[], b: readonly number[], c: readonly number[]): number => dot(a as Vec, cross(b as Vec, c as Vec));
/** The box on base struts v, w and third strut u: u · (v × w) (the order the chapter writes it). */
export const boxVol = (u: readonly number[], v: readonly number[], w: readonly number[]): number => triple(u, v, w);
/** Base area of the box: the area of the parallelogram on v and w, |v × w|. */
export const baseArea = (v: readonly number[], w: readonly number[]): number => norm(cross(v as Vec, w as Vec));
/** Height of u above the base of v and w: u's shadow on the unit normal (signed). */
export const height = (u: readonly number[], v: readonly number[], w: readonly number[]): number => {
  const n = cross(v as Vec, w as Vec);
  const l = norm(n);
  return l < 1e-12 ? 0 : dot(u as Vec, n) / l;
};
/** True when three arrows lie in one plane (decided by rank, independent of the triple product). */
export const coplanar3 = (u: readonly number[], v: readonly number[], w: readonly number[]): boolean => rank([u as Vec, v as Vec, w as Vec]) < 3;

// ------------------------------------------------------------------ p1 Slide the top

/** The upright box: 2 along, 3 across, 4 up. Its volume is 24. */
export const P1_V: Vec = [2, 0, 0];
export const P1_W0: Vec = [0, 3, 0];
export const P1_U0: Vec = [0, 0, 4];
/** After the pulse leans it: the across strut and the top strut lean over. */
export const P1_W: Vec = [1, 3, 0];
export const P1_U: Vec = [1, 1, 4];
export const P1_VOLUME = 24;
/** Three new spots for the top strut's tip (Show me). Each keeps the tip at height 4. */
export const P1_SPOTS: Vec[] = [[2, 1, 4], [-1, 2, 4], [0, -1, 4]];
/** A new spot counts when the volume is still 24 and the tip is somewhere new (≥ 0.75 from the start and from every counted spot). */
export function p1Accept(spots: readonly Vec[], tip: readonly number[], tol = 0.05): boolean {
  // tol is a height tolerance; the base area is 6, so the volume may be off by 6 · tol
  if (!near(boxVol(tip, P1_V, P1_W), P1_VOLUME, tol * baseArea(P1_V, P1_W))) return false;
  if (dist(tip, P1_U) < 0.75) return false;
  return spots.every((s) => dist(s, tip) >= 0.75);
}
export const p1Won = (spots: readonly Vec[]): boolean => spots.length >= 3;

// ------------------------------------------------------------------ p2 [D] Base times height

export const P2 = (() => {
  const vw = cross(P1_V, P1_W);
  const base = norm(vw);
  const h = dot(P1_U, vw) / base;
  return { cross: vw, base, height: h, volume: base * h, triple: boxVol(P1_U, P1_V, P1_W) };
})();
/** Commander: the steps of the derivation as tiles; t1/t2 either way round, then t3, t4, t5. */
export const P2_TILES = ['t1', 't2', 't3', 't4', 't5'];
export function p2OrderOk(order: readonly string[]): boolean {
  if (order.length !== 5 || order.some((id) => !P2_TILES.includes(id))) return false;
  const at = (id: string) => order.indexOf(id);
  return at('t2') < at('t3') && at('t1') < at('t4') && at('t3') < at('t4') && at('t4') < at('t5');
}

// ------------------------------------------------------------------ p3 Section C

export const C_A: Vec = [2, 1, 0];
export const C_B: Vec = [0, 1, 2];
export const C_C0: Vec = [1, 1, 1];
/** The centre of 0, a, b and the flat c: a point on the plane of a and b (where its patch is drawn). */
export const C_MID: Vec = vscale(vadd(vadd(C_A, C_B), C_C0), 1 / 4);
/** Section C's base normal a × b = (2, −4, 2). */
export const C_AB: Vec = cross(C_A, C_B);
/** The volume with the brace set to k, c = (1, 1, k): (a × b) · c = 2k − 2. */
export const braceVol = (k: number): number => dot(C_AB, [1, 1, k]);
export const C_TARGET = 6;
export const C_K = 4;
export const p3Won = (k: number, tol = 0.05): boolean => near(braceVol(k), C_TARGET, tol * 2);
/** The flat strut is half of each of the other two: c = ½a + ½b. */
export const C_HALF: [number, number] = [0.5, 0.5];

// ------------------------------------------------------------------ p4 [H] Will the clamps latch?

export const CL_P: Vec = [1, 0, 0];
export const CL_Q: Vec = [2, 1, 0];
export const CL_R: Vec = [1, 1, 1];
export const CL_S: Vec = [2, 2, 1];
export const CL_S_BENT: Vec = [2, 2, 3];
/** The three edge arrows from one point and the triple product of them: zero means the four points share a plane. */
export const edges = (p: readonly number[], q: readonly number[], r: readonly number[], s: readonly number[]): [Vec, Vec, Vec] =>
  [vsub(q as Vec, p as Vec), vsub(r as Vec, p as Vec), vsub(s as Vec, p as Vec)];
export const fourPointTriple = (p: readonly number[], q: readonly number[], r: readonly number[], s: readonly number[]): number => {
  const [e1, e2, e3] = edges(p, q, r, s);
  return triple(e1, e2, e3);
};
export const coplanar4 = (p: readonly number[], q: readonly number[], r: readonly number[], s: readonly number[], tol = 1e-9): boolean =>
  Math.abs(fourPointTriple(p, q, r, s)) <= tol;
/** The volume of the tetrahedron on four points: one sixth of the box on the three edge arrows. */
export const tetVol = (p: readonly number[], q: readonly number[], r: readonly number[], s: readonly number[]): number =>
  Math.abs(fourPointTriple(p, q, r, s)) / 6;
/** The trap: the position arrows Q, R, S from the origin, as if the origin were a clamp: −1, "not flat". */
export const CL_TRAP = triple(CL_Q, CL_R, CL_S);
export const P4 = (() => {
  const [e1, e2, e3] = edges(CL_P, CL_Q, CL_R, CL_S);
  const x = cross(e2, e3);
  const [, , b3] = edges(CL_P, CL_Q, CL_R, CL_S_BENT);
  const xb = cross(e2, b3);
  const box = dot(e1, xb);
  return { e1, e2, e3, cross: x, triple: dot(e1, x), bent: b3, crossBent: xb, box, tet: Math.abs(box) / 6 };
})();

// ------------------------------------------------------------------ p5 Inside out

/** Node 7's struts by their real direction: along the spine, across, up. */
export const N7: Vec[] = [P1_V, P1_W, P1_U];
export const N7_NAMES = ['along', 'across', 'up'];
/** The log lists the struts in this order (indices into N7). The rule is along, across, up. */
export const N7_LOG0 = [1, 0, 2];
export const logVol = (order: readonly number[]): number => triple(N7[order[0]], N7[order[1]], N7[order[2]]);
export const swapLog = (order: readonly number[], i: number, j: number): number[] => { const o = order.slice(); [o[i], o[j]] = [o[j], o[i]]; return o; };
export const p5Won = (order: readonly number[]): boolean => order.join() === '0,1,2';
/** Show me, from any log: the first place whose strut is wrong, swapped with the place holding the strut it needs. */
export function p5NextSwap(order: readonly number[]): [number, number] {
  const i = order.findIndex((s, k) => s !== k);
  return [i, order.indexOf(i)];
}
/** A log order that is a turn of the rule (cyclic) reads +24 too, but is not the rule. */
export const isCyclicOfRule = (order: readonly number[]): boolean => ['0,1,2', '1,2,0', '2,0,1'].includes(order.join());

// ------------------------------------------------------------------ p6 [H] The sensor housing

export const H_A: Vec = [2, 0, 0];
export const H_B: Vec = [0, 3, 0];
export const H_C: Vec = [1, 1, 4];
export const P6 = (() => {
  const x = cross(H_B, H_C);
  const box = dot(H_A, x);
  return { cross: x, box, housing: Math.abs(box) / 6 };
})();
/**
 * The box on a, b, c cut into six tetrahedra of equal volume: two prisms (cut along the diagonal
 * plane through 0, a + b, c), each prism three tetrahedra. Piece 0 is the corner tetrahedron 0, a, b, c.
 */
export function sixTets(a: readonly number[], b: readonly number[], c: readonly number[]): Vec[][] {
  const A = a as Vec, B = b as Vec, Cc = c as Vec, O: Vec = [0, 0, 0];
  const AB = vadd(A, B), AC = vadd(A, Cc), BC = vadd(B, Cc), ABC = vadd(AB, Cc);
  return [
    [O, A, B, Cc], [A, B, Cc, AC], [B, Cc, AC, BC],
    [A, AB, B, AC], [AB, B, AC, ABC], [B, AC, ABC, BC],
  ];
}
export const tetOf = (t: readonly Vec[]): number => tetVol(t[0], t[1], t[2], t[3]);

// ------------------------------------------------------------------ p7 [S] Cyclic order

/** The three turns of the order give the same number. */
export const cyclicSame = (u: readonly number[], v: readonly number[], w: readonly number[], tol = 1e-9): boolean => {
  const a = triple(u, v, w), b = triple(v, w, u), c = triple(w, u, v);
  return near(a, b, tol) && near(b, c, tol);
};

// ------------------------------------------------------------------ Doubts

/**
 * (F) "Lean the third strut over and you lose volume." The upright strut u0 stands on the base of v
 * and w. The claim holds for a strut u when u is not leaned, or when leaning it lost volume.
 */
export function leanLoses(u: readonly number[], u0: readonly number[] = P1_U0, v: readonly number[] = P1_V, w: readonly number[] = P1_W0): boolean {
  const c = cross(u as Vec, u0 as Vec);
  const leaned = norm(c) > 1e-9 && norm(u as Vec) > 1e-9;
  if (!leaned) return true;
  return Math.abs(boxVol(u, v, w)) < Math.abs(boxVol(u0, v, w)) - 1e-9;
}

/** (T) "Swapping two struts flips the sign of the volume." Swaps the first two. */
export const swapFlips = (a: readonly number[], b: readonly number[], c: readonly number[], tol = 1e-9): boolean =>
  near(triple(b, a, c), -triple(a, b, c), tol);

// ------------------------------------------------------------------ the Law

export interface CopCase { u: Vec; v: Vec; w: Vec }
const parallel = (a: Vec, b: Vec) => norm(cross(a, b)) < 1e-9;
const isZeroV = (a: Vec) => norm(a) < 1e-9;

/** Each frame option, as a predicate on the case. */
export const LAW_CONDS: Record<string, (c: CopCase) => boolean> = {
  zero: (c) => Math.abs(triple(c.u, c.v, c.w)) < 1e-9,
  parallel: (c) => parallel(c.u, c.v) || parallel(c.v, c.w) || parallel(c.u, c.w),
  zerovec: (c) => isZeroV(c.u) || isZeroV(c.v) || isZeroV(c.w),
  positive: (c) => triple(c.u, c.v, c.w) > 1e-9,
  cross: (c) => isZeroV(cross(c.v, c.w)),
};

const rv = (r: () => number, lo = -4, hi = 4): Vec => [rint(r, lo, hi), rint(r, lo, hi), rint(r, lo, hi)];

/** Three arrows are coplanar exactly when [condition]. */
export const lawCore: LawCore<CopCase> & { answer: Record<string, string> } = {
  id: 'c06-law',
  answer: { cond: 'zero' },
  gen: (r) => {
    const v = rv(r), w = rv(r);
    // about half the cases are built flat on purpose: u is a whole-number mix of v and w
    const u = r() < 0.45 ? vadd(vscale(v, rint(r, -2, 2)), vscale(w, rint(r, -2, 2))) : rv(r);
    return { u, v, w };
  },
  edgeCases: [
    { u: [1, 1, 0], v: [1, 0, 0], w: [0, 1, 0] },      // flat, no two parallel
    { u: [1, 1, 1], v: [2, 1, 0], w: [0, 1, 2] },      // Section C: c = ½a + ½b
    { u: [0, 0, 0], v: [1, 2, 3], w: [3, 1, 2] },      // the zero arrow
    { u: [2, 4, 6], v: [1, 2, 3], w: [0, 1, 5] },      // two parallel
    { u: [0, 0, 1], v: [1, 0, 0], w: [0, 1, 0] },      // a right-handed unit cube
    { u: [0, 0, -1], v: [1, 0, 0], w: [0, 1, 0] },     // inside out: negative, not flat
  ],
  holds(f, c) {
    const cond = LAW_CONDS[f.cond];
    if (!cond) return false;
    return cond(c) === coplanar3(c.u, c.v, c.w);
  },
  describe: (c) => `u = ${fmt(c.u)}, v = ${fmt(c.v)}, w = ${fmt(c.w)}: u · (v × w) = ${num(triple(c.u, c.v, c.w))}, ${coplanar3(c.u, c.v, c.w) ? 'and they lie in one plane' : 'and they do not lie in one plane'}`,
};

// ------------------------------------------------------------------ crew versions of the builds (LANTERN's backup)

export const crew = {
  triple: (a: number[], b: number[], c: number[]): number => triple(a, b, c),
  coplanar: (p: number[], q: number[], r: number[], s: number[]): boolean => coplanar4(p, q, r, s, 1e-9),
};

/** Random whole-number points for the coplanar swarm: half of them built on one plane on purpose. */
export function swarmPoints(r: () => number, wide: boolean): number[][] {
  const lo = wide ? -6 : -3, hi = wide ? 6 : 3;
  const p = rv(r, lo, hi), e1 = rv(r, -2, 2), e2 = rv(r, -2, 2);
  const q = vadd(p, e1), rr = vadd(p, e2);
  const s = r() < 0.5 ? vadd(p, vadd(vscale(e1, rint(r, -2, 2)), vscale(e2, rint(r, -2, 2)))) : rv(r, lo, hi);
  return [p, q, rr, s];
}
export const swarmVec = (r: () => number, wide: boolean): number[] => rv(r, wide ? -9 : -4, wide ? 9 : 4);

// ------------------------------------------------------------------ the strut scan (install)

export interface HullNode {
  /** Position on the ark's hull, in the ark's own frame (x along the spine). */
  pos: [number, number, number];
  /** The node's three struts (world frame): along, across, up. */
  struts: [Vec, Vec, Vec];
  /** Which section of the hull it belongs to. */
  section: 'A' | 'B' | 'C' | 'D';
}

export const SCAN_NODES = 5000;
/** Section C: the aft cargo truss, x from −16 to −9 in the ark's frame. */
export const SECTION_C: [number, number] = [-16, -9];
const DESIGN = 24;

/** The 5,000 hull nodes, seeded. Section C's top struts lie in the plane of the other two. */
export function hullNodes(n = SCAN_NODES, seed = 606): HullNode[] {
  const r = rng(seed);
  const out: HullNode[] = [];
  for (let i = 0; i < n; i++) {
    const x = -27 + 55 * r();
    const th = r() * Math.PI * 2;
    const rad = x > 15 ? 3.05 : x < -18 ? 2.6 : 2.35;
    const pos: [number, number, number] = [x, rad * Math.cos(th), rad * Math.sin(th)];
    const section = x >= SECTION_C[0] && x <= SECTION_C[1] ? 'C' : x > 15 ? 'A' : x > 0 ? 'B' : 'D';
    // local struts: along, across (sheared by the pulses), up (leaned and squeezed)
    const v: Vec = [2, 0, 0];
    const w: Vec = [0.2 + 0.5 * r(), 3, 0];
    let u: Vec;
    if (section === 'C') {
      // folded flat: the top strut is a mix of the other two
      const a = 0.2 + 0.6 * r(), b = 0.2 + 0.6 * r();
      u = vadd(vscale(v, a), vscale(w, b));
    } else {
      const squeeze = section === 'D' ? 0.55 + 0.4 * r() : 0.8 + 0.2 * r();
      u = [0.4 + 0.8 * r(), 0.3 * (r() - 0.5), 4 * squeeze];
    }
    // turn the local frame to the node's place on the hull (a turn keeps every volume)
    const c = Math.cos(th), s = Math.sin(th);
    const turn = (q: Vec): Vec => [q[0], c * q[1] - s * q[2], s * q[1] + c * q[2]];
    out.push({ pos, struts: [turn(v), turn(w), turn(u)], section });
  }
  return out;
}

/** The scan's verdict per node: the volume as a fraction of the design 24, and flat or not. */
export function scanVerdict(vols: readonly number[]): { ratio: number[]; flat: boolean[]; flatCount: number } {
  const ratio = vols.map((x) => Math.abs(x) / DESIGN);
  const flat = vols.map((x) => Math.abs(x) < 1e-6);
  return { ratio, flat, flatCount: flat.filter(Boolean).length };
}
