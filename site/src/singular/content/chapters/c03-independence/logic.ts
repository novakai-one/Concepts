// Chapter 3 pure logic (no DOM, no three): story numbers, loop tests, win checks, doubt predicates,
// the Law core, the Act I set piece and the crew version of find_loop. Unit-tested in
// tests/singular/game-c03.test.ts.
import { combo, det, fromCols, norm, nullspace, type Vec } from '../../../math/la.ts';
import { rint, type LawCore } from '../../../game/lawcheck.ts';
import { THRUST3, SIGNAL, spanDim, distToSpan } from '../c02-span/logic.ts';

export { THRUST3, SIGNAL, spanDim, distToSpan };

// ------------------------------------------------------------------ story numbers (GDD §6.3 Ch 3)

/** p1 [F]: fire all three, go nowhere: 2u + 3v − w = 0. */
export const P1_U: Vec = [1, 0, 2];
export const P1_V: Vec = [0, 1, 1];
export const P1_W: Vec = [2, 3, 7];
export const P1_LOOP: Vec = [2, 3, -1];
/** p2: the first spare mount, along (1, 2, 3) = 1·(1, 0, 1) + 2·(0, 1, 1). */
export const SPARE_BAD: Vec = [1, 2, 3];
export const SPARE_BAD_DIALS: Vec = [1, 2];
/** p3: three bolt points; reach the signal (1, 1, 0) with total fuel at most 3. */
export const MOUNTS: Vec[] = [[2, -1, 1], [1, 1, 1], [0, 0, 2]];
export const P3_FUEL = 3;
export const P3_MOUNT = 2;
export const P3_DIALS: Vec = [1, 1, -1];
/** p4: four arrows that reach all of space; any of the first three can go, the fourth cannot. */
export const PRUNE: Vec[] = [[1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1]];
/** Act I set piece: mounts v, w, u and a spare; the ark's approach point; the fuel limit. */
export const SP_ARROWS: Vec[] = [[1, 0, 1], [0, 1, 1], [0, 0, 2], [2, -1, 1]];
export const SP_TARGET: Vec = [4, -1, 6];
export const SP_FUEL = 6.5;
export const SP_DIALS: Vec = [4, -1, 1.5, 0];

// ------------------------------------------------------------------ loops

export const isZero = (v: Vec, tol = 1e-12): boolean => v.every((x) => Math.abs(x) < tol);

/** Fuel burned by a firing: the sum of the sizes of the dials. */
export const fuel = (d: number[]): number => d.reduce((s, x) => s + Math.abs(x), 0);

/**
 * Some dials, not all zero, bring the ship back to the start. The test is scale-invariant: the
 * dials are divided by their largest size first, so tiny dials (0.01, 0, 0) are not a loop just
 * because the ship barely moved. Tiny is not zero.
 */
export const isLoop = (vs: Vec[], dials: number[], tol = 0.05): boolean => {
  const m = Math.max(0, ...dials.map(Math.abs));
  return m > 1e-9 && norm(combo(dials, vs)) <= tol * m;
};

/** Is there a loop at all? (The arrows are dependent.) */
export const dependent = (vs: Vec[]): boolean => spanDim(vs) < vs.length;

/** A loop for dependent arrows: a null-space direction scaled to small whole numbers when possible. */
export function loopOf(vs: Vec[]): number[] | null {
  if (!vs.length) return null;
  const z = vs.findIndex((v) => isZero(v));
  if (z >= 0) return vs.map((_, i) => (i === z ? 1 : 0));
  const ns = nullspace(fromCols(vs));
  if (!ns.length) return null;
  const n = ns[0];
  for (let k = 1; k <= 60; k++) {
    const m = n.map((x) => x * k);
    if (m.every((x) => Math.abs(x - Math.round(x)) < 1e-6)) return m.map((x) => Math.round(x) + 0);
  }
  return n;
}

/** Two arrows lie on one line through the origin (in any dimension). */
export const parallel = (a: Vec, b: Vec): boolean => spanDim([a, b]) < 2;
export const pairwiseApart = (vs: Vec[]): boolean => vs.every((a, i) => vs.every((b, j) => j <= i || !parallel(a, b)));

// ------------------------------------------------------------------ win checks

export const p1Won = (dials: number[]): boolean => isLoop([P1_U, P1_V, P1_W], dials);
/** p2: the green and red dials build the spare's arrow. */
export const p2Won = (end: Vec, tol = 0.05): boolean => norm(end.map((x, i) => x - SPARE_BAD[i])) <= tol;
/** p3: the right mount, on the signal, within the fuel limit. */
export const p3Won = (mount: number, dials: number[], tol = 0.05): boolean => {
  const end = combo(dials, [...THRUST3, MOUNTS[mount]]);
  return norm(end.map((x, i) => x - SIGNAL[i])) <= tol && fuel(dials) <= P3_FUEL + 1e-9;
};
/** p4: one arrow unbolted and the rest still reach all of space. */
export const p4Won = (bolted: boolean[]): boolean => bolted.filter((b) => !b).length === 1 && spanDim(PRUNE.filter((_, i) => bolted[i])) === 3;
/** Act I set piece: at most three thrusters powered, on the approach point, within the fuel. */
export const spWon = (bolted: boolean[], dials: number[], tol = 0.05): boolean => {
  if (bolted.filter(Boolean).length > 3) return false;
  const d = dials.map((x, i) => (bolted[i] ? x : 0));
  const end = combo(d, SP_ARROWS);
  return norm(end.map((x, i) => x - SP_TARGET[i])) <= tol && fuel(d) <= SP_FUEL + tol;
};

/** p5 [D]: Bram's four arrows. The first three are independent; the fourth is a combination of them. */
export interface Four { arrows: Vec[]; dials: Vec }
export function bramFour(r: () => number, level: 'cadet' | 'navigator' | 'commander'): Four {
  for (;;) {
    const ent = () => (level === 'commander' ? rint(r, -4, 4) / 2 : rint(r, -2, 2));
    const a = [0, 1, 2].map(() => [ent(), ent(), ent()]);
    const d = det(fromCols(a));
    if (Math.abs(d) < (level === 'commander' ? 0.5 : 1) || Math.abs(d) > 6) continue;
    const c = [0, 1, 2].map(() => rint(r, -2, 2));
    if (c.some((x) => x === 0)) continue;
    const a4 = combo(c, a);
    if (norm(a4) < 1 || norm(a4) > 6.5) continue;
    if (a.some((x) => parallel(x, a4))) continue;
    return { arrows: [...a, a4], dials: c };
  }
}

/** p6 [S]: three arrows in the plane always have a loop. */
export const planeLoop = (vs: Vec[]): number[] | null => loopOf(vs);

// ------------------------------------------------------------------ doubts

/** (T) "Any set with the zero arrow in it has a loop." */
export const zeroLoopHolds = (vs: Vec[]): boolean => !vs.some((v) => isZero(v)) || dependent(vs);
/** (F) "No two of these three lie on one line, so all three must be useful." */
export const apartUsefulHolds = (vs: Vec[]): boolean => !pairwiseApart(vs) || !dependent(vs);
/** Review (F) "Three arrows always reach more than two." */
export const threeMoreHolds = (vs: Vec[]): boolean => spanDim(vs) > spanDim(vs.slice(0, 2));
/**
 * Review (F) "If you can reach a point, there is only one way to reach it": broken by two different
 * firings to one crate. Two landings count as two ways only when their difference is a loop, so
 * near-identical dials (2, 3, 0) and (2.02, 3, 0) are one way, not two.
 */
export const oneWayHolds = (vs: Vec[], crate: Vec, firings: number[][]): boolean => {
  const landing = firings.filter((f) => norm(combo(f, vs).map((x, i) => x - crate[i])) <= 0.05);
  return !landing.some((f, i) => landing.some((g, j) => j > i && isLoop(vs, f.map((x, k) => x - g[k]))));
};
/** Review (T) "Two arrows that are not on one line reach every point of a flat deck." (deck: z = 0) */
export const deckHolds = (v: Vec, w: Vec): boolean => parallel(v, w) || spanDim([v, w]) === 2;
/** Review (F) "An arrow of length zero can belong to an independent set": broken by a shown loop. */
export const zeroIndependentHolds = (vs: Vec[], dials: number[]): boolean => !(vs.some((v) => isZero(v)) && isLoop(vs, dials));

// ------------------------------------------------------------------ the Law (cases in the plane)

export interface SetCase { vs: Vec[] }
const fmt = (v: Vec) => `(${v.map((x) => String(Math.round(x * 100) / 100).replace('-', '−')).join(', ')})`;

function cond(f: Record<string, string>, c: SetCase): boolean {
  const vs = c.vs;
  switch (f.cond) {
    case 'loop': return dependent(vs);
    case 'parallel': return vs.some((a, i) => vs.some((b, j) => j > i && parallel(a, b)));
    case 'zero': return vs.some((v) => isZero(v));
    case 'onlyzero': return !dependent(vs);
    default: return vs.length > 2; // 'many': more arrows than directions in the plane
  }
}

/** "Arrows are [linearly dependent / linearly independent] exactly when [cond]." */
export const lawCore: LawCore<SetCase> & { answer: Record<string, string> } = {
  id: 'c03-law',
  answer: { kind: 'dep', cond: 'loop' },
  gen(r) {
    const rv = (): Vec => [rint(r, -4, 4), rint(r, -4, 4)];
    const x = r();
    if (x < 0.12) { const vs = [rv(), rv()]; vs.splice(rint(r, 0, 2), 0, [0, 0]); return { vs: vs.slice(0, rint(r, 1, 3)) }; }
    if (x < 0.35) { const a = rv(); const k = [-2, -1, -0.5, 0.5, 2, 3][rint(r, 0, 5)]; const vs = [a, [k * a[0], k * a[1]]]; if (r() < 0.4) vs.push(rv()); return { vs }; }
    if (x < 0.6) {
      for (;;) { const vs = [rv(), rv(), rv()]; if (pairwiseApart(vs)) return { vs }; }
    }
    const n = rint(r, 1, 3);
    return { vs: Array.from({ length: n }, rv) };
  },
  edgeCases: [
    { vs: [[2, 1], [1, 3], [3, 4]] }, { vs: [[0, 0], [1, 2]] }, { vs: [[2, 1], [-4, -2]] },
    { vs: [[1, 0], [0, 1]] }, { vs: [[0, 0]] }, { vs: [[1, 2], [2, 1], [-1, 1]] },
  ],
  holds: (f, c) => (f.kind === 'dep' ? dependent(c.vs) : !dependent(c.vs)) === cond(f, c),
  describe: (c) => {
    const l = loopOf(c.vs);
    const dep = dependent(c.vs);
    return `arrows ${c.vs.map(fmt).join(', ')}: ${dep && l ? `dials ${fmt(l)} bring the ship back, so they are dependent` : 'only all-zero dials bring the ship back, so they are independent'}`;
  },
};

// ------------------------------------------------------------------ crew version of the build

/** find_loop(vs): try integer dials −5..5 (first dial slowest); the first setting, not all zero, that comes back to the start. */
export function findLoopCrew(vs: Vec[]): number[] | null {
  const k = vs.length;
  const d = new Array(k).fill(-5);
  for (;;) {
    if (d.some((x) => x !== 0) && combo(d, vs).every((x) => Math.abs(x) < 1e-9)) return d.slice();
    let i = k - 1;
    while (i >= 0 && d[i] === 5) { d[i] = -5; i--; }
    if (i < 0) return null;
    d[i]++;
  }
}
