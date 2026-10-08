// Chapter 22 pure logic (no DOM, no three): the numbers of every puzzle, the win checks, the Doubt
// predicates, the Law core, LANTERN's procedure (run literally), Teo's message (T4) and the crew versions
// of gram_schmidt and qr. Unit-tested in tests/singular/game-c22.test.ts.
import {
  col, cross, dot, fromCols, gramSchmidt, identity, matMul, meq, norm, normalize, qr, transpose, vadd, vscale, vsub,
  type Mat, type Vec,
} from '../../../math/la.ts';
import { rint, type LawCore } from '../../../game/lawcheck.ts';
import { niceTex } from '../../../math/frac.ts';
import { P } from '../../truth.ts';

export const fmtV = (v: readonly number[], d = 2): string => `(${v.map((x) => { const y = Math.round(x * 10 ** d) / 10 ** d; return Math.abs(y) < 10 ** -d / 2 ? '0' : String(y).replace('-', '−'); }).join(', ')})`;
export const fmtN = (x: number, d = 2): string => { const y = Math.round(x * 10 ** d) / 10 ** d; return Math.abs(y) < 10 ** -d / 2 ? '0' : y.toFixed(d).replace('-', '−'); };
export const texM = (M: Mat): string => `\\begin{bmatrix} ${M.map((r) => r.map((x) => niceTex(x)).join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;
export const near = (a: readonly number[], b: readonly number[], tol: number): boolean => a.length === b.length && norm(vsub([...a], [...b])) <= tol;
export const tolFor = (d: string): number => (d === 'commander' ? 0.01 : 0.05);
export const angleDeg = (a: readonly number[], b: readonly number[]): number => {
  const n = norm([...a]) * norm([...b]);
  return n < 1e-12 ? 0 : (Math.acos(Math.max(-1, Math.min(1, dot([...a], [...b]) / n))) * 180) / Math.PI;
};

/** Is every column of length 1 and every pair at a right angle (QᵀQ = I)? */
export const orthonormalCols = (Q: Mat, tol = 1e-9): boolean => meq(matMul(transpose(Q), Q), identity(Q[0].length), tol);
/** A move that keeps every length and angle: a square matrix with orthonormal columns. */
export const isOrthogonal = (M: Mat, tol = 1e-9): boolean => M.length === M[0].length && orthonormalCols(M, tol);

// ------------------------------------------------------------------ p1 Square up two

export const P1_B1: Vec = [3, 4];
export const P1_B2: Vec = [2, 1];
export const P1_K = 1 / norm(P1_B1);                       // 0.2
export const P1_Q1: Vec = vscale(P1_B1, P1_K);             // (0.6, 0.8)
export const P1_C = dot(P1_B2, P1_Q1);                     // 2: the shadow coefficient
export const P1_V2: Vec = vsub(P1_B2, vscale(P1_Q1, P1_C)); // (0.8, −0.6)
export const P1_Q2: Vec = normalize(P1_V2);                // already length 1
export const p1Q1Ok = (q: readonly number[], tol = 0.05) => near(q, P1_Q1, tol);
export const p1Q2Ok = (q: readonly number[], tol = 0.05) => near(q, P1_Q2, tol);

// ------------------------------------------------------------------ p2 [H] Square up three

export const P2_X: Vec[] = [[1, 1, 0], [1, 0, 1], [0, 1, 1]];
export const P2_V1: Vec = P2_X[0];
export const P2_C21 = dot(P2_X[1], P2_V1) / dot(P2_V1, P2_V1);                    // 1/2
export const P2_V2: Vec = vsub(P2_X[1], vscale(P2_V1, P2_C21));                  // (1/2, −1/2, 1)
export const P2_C31 = dot(P2_X[2], P2_V1) / dot(P2_V1, P2_V1);                    // 1/2
export const P2_C32 = dot(P2_X[2], P2_V2) / dot(P2_V2, P2_V2);                    // 1/3
export const P2_V3: Vec = vsub(vsub(P2_X[2], vscale(P2_V1, P2_C31)), vscale(P2_V2, P2_C32)); // (−2/3, 2/3, 2/3)
export const P2_LEN2: Vec = [P2_V1, P2_V2, P2_V3].map((v) => dot(v, v));          // (2, 3/2, 4/3)
export const P2_Q: Vec[] = gramSchmidt(P2_X);                                      // (1,1,0)/√2, (1,−1,2)/√6, (−1,1,1)/√3
/** The q's are typed to two decimals (the worksheet's last, and on Commander only checked, step). */
export const P2_Q_TOL = 0.006;
/** The largest dot product between two different finished arrows. */
export const maxOffDot = (qs: Vec[]): number => { let m = 0; for (let i = 0; i < qs.length; i++) for (let j = i + 1; j < qs.length; j++) m = Math.max(m, Math.abs(dot(qs[i], qs[j]))); return m; };

// ------------------------------------------------------------------ p3 [D] Coordinates by dot products

export const P3_Q1: Vec = [3 / 5, 4 / 5];
export const P3_Q2: Vec = [-4 / 5, 3 / 5];
export const P3_Q: Mat = fromCols([P3_Q1, P3_Q2]);
export const P3_X: Vec = [5, 5];
export const P3_C: Vec = [dot(P3_X, P3_Q1), dot(P3_X, P3_Q2)];                    // (7, −1)
export const p3Won = (c: readonly number[], tol = 0.05) => near(c, P3_C, tol);

// ------------------------------------------------------------------ p4 Safe moves

export interface Move { id: string; M: Mat; tex: string; note: string }
export const MOVES: Move[] = [
  { id: 'turn', M: [[0.6, -0.8], [0.8, 0.6]], tex: '\\begin{bmatrix} 0.6 & -0.8 \\\\ 0.8 & 0.6 \\end{bmatrix}', note: 'a turn' },
  { id: 'flip', M: [[1, 0], [0, -1]], tex: '\\begin{bmatrix} 1 & 0 \\\\ 0 & -1 \\end{bmatrix}', note: 'a flip' },
  { id: 'shear', M: [[1, 1], [0, 1]], tex: '\\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\end{bmatrix}', note: 'a shear' },
  { id: 'squash', M: [[2, 0], [0, 0.5]], tex: '\\begin{bmatrix} 2 & 0 \\\\ 0 & 0.5 \\end{bmatrix}', note: 'keeps area, not lengths' },
  { id: 'swap', M: [[0, 1], [1, 0]], tex: '\\begin{bmatrix} 0 & 1 \\\\ 1 & 0 \\end{bmatrix}', note: 'a flip over $y = x$' },
  { id: 'grow', M: [[1, 1], [-1, 1]], tex: '\\begin{bmatrix} 1 & 1 \\\\ -1 & 1 \\end{bmatrix}', note: 'square columns of length 1.41' },
];
export const SAFE = MOVES.filter((m) => isOrthogonal(m.M)).map((m) => m.id);       // turn, flip, swap
export const p4Won = (pinned: readonly string[]) => pinned.length === SAFE.length && SAFE.every((id) => pinned.includes(id));

// ------------------------------------------------------------------ p5 Fix the Drift

/** The frame LANTERN keeps: columns up, forward, side (world: x forward, y side, z up). Up is trusted most. */
const LEAN = (1.4 * Math.PI) / 180;
export const DRIFT_LENGTHS = [1.03, 0.98, 1.01];
export const DRIFT: Vec[] = [
  [0, 0, 1.03],                                                   // up
  [0.98 * Math.cos(LEAN), 0, 0.98 * Math.sin(LEAN)],              // forward, leaning 1.4° toward up
  [0, 1.01, 0],                                                   // side
];
export const DRIFT_NAMES = ['up', 'forward', 'side'];
/** Gram–Schmidt in this order stands the frame up exactly: up, forward, side become z, x, y. */
export const DRIFT_FIXED: Vec[] = gramSchmidt(DRIFT);
/** The horizon is drawn along the forward arrow: its lean above level, in degrees. */
export const horizonLean = (forward: readonly number[]): number => (Math.atan2(forward[2], Math.hypot(forward[0], forward[1])) * 180) / Math.PI;
/** How egg-shaped the star looks: the ratio of the long to the short axis of the image of a round star
 *  drawn in the forward–up plane through the frame (1 = round). */
export function starRatio(up: readonly number[], forward: readonly number[]): number {
  // the 2 × 2 map from (forward, up) amounts to the drawn (x, z) position
  const a = forward[0], b = up[0], c = forward[2], d = up[2];
  const s = a * a + b * b + c * c + d * d, det = a * d - b * c;
  const disc = Math.sqrt(Math.max(0, s * s - 4 * det * det));
  const s1 = Math.sqrt((s + disc) / 2), s2 = Math.sqrt(Math.max(0, (s - disc) / 2));
  return s2 < 1e-12 ? Infinity : s1 / s2;
}
/** The frame is fixed when it is square, unit and level: up straight up, the horizon level. */
export function driftFixed(frame: readonly Vec[], tol = 1e-6): boolean {
  return orthonormalCols(fromCols(frame as Vec[]), tol) && Math.abs(horizonLean(frame[1])) < 1e-4 && near(frame[0], [0, 0, 1], tol * 10);
}

// ------------------------------------------------------------------ p6 [H] QR

export const P6_A: Mat = fromCols([[1, 1, 0], [1, 0, 1]]);
export const P6_QR = qr(P6_A);                                                     // Q: p2's first two arrows
export const P6_R: Mat = P6_QR.R;                                                  // [[√2, 1/√2], [0, 3/√6]]

// ------------------------------------------------------------------ p7 [S] Classical against modified

const E = 1e-8;
export const P7_X: Vec[] = [[1, E, 0], [1, 0, E], [1, 0, 0]];
/** Classical: subtract the shadows of the ORIGINAL arrow on each finished one. */
export function classicalGS(vs: Vec[]): Vec[] {
  const qs: Vec[] = [];
  for (const v of vs) { let w = v.slice(); for (const q of qs) w = vsub(w, vscale(q, dot(v, q))); qs.push(normalize(w)); }
  return qs;
}
/** Modified: subtract each shadow from what is left so far. */
export function modifiedGS(vs: Vec[]): Vec[] {
  const qs: Vec[] = [];
  for (const v of vs) { let w = v.slice(); for (const q of qs) w = vsub(w, vscale(q, dot(w, q))); qs.push(normalize(w)); }
  return qs;
}

// ------------------------------------------------------------------ Doubts

/** (F) "Any matrix with determinant 1 is a safe move." Holds unless a determinant-1 matrix changes a length or angle. */
export function det1Holds(M: Mat): boolean {
  const d = M[0][0] * M[1][1] - M[0][1] * M[1][0];
  return Math.abs(d - 1) > 0.02 || isOrthogonal(M, 1e-6);
}
/** (F) "Perpendicular columns are enough." Holds unless perpendicular columns still stretch. */
export function perpHolds(M: Mat): boolean {
  const a = col(M, 0), b = col(M, 1);
  if (norm(a) < 1e-9 || norm(b) < 1e-9) return true;
  return Math.abs(dot(a, b)) > 1e-6 || isOrthogonal(M, 1e-6);
}
/** (T) "Gram–Schmidt keeps the plane the arrows span." */
export function gsPlaneHolds(x1: Vec, x2: Vec): boolean {
  const n = cross(x1, x2);
  if (norm(n) < 1e-9) return true;
  const qs = gramSchmidt([x1, x2]);
  return qs.length === 2 && qs.every((q) => Math.abs(dot(q, normalize(n))) < 1e-9) && norm(cross(qs[0], qs[1])) > 0.99;
}

// ------------------------------------------------------------------ the Law

export interface QCase { Q: Mat }
const colsOf = (Q: Mat): Vec[] => Q[0].map((_, j) => col(Q, j));
const pairwise = (vs: Vec[], f: (a: Vec, b: Vec) => boolean) => vs.every((a, i) => vs.every((b, j) => i >= j || f(a, b)));
export function propHolds(part: string, prop: string, Q: Mat): boolean {
  const vs = part === 'rows' ? Q.map((r) => r.slice()) : colsOf(Q);
  const unit = vs.every((v) => Math.abs(norm(v) - 1) < 1e-9);
  const perp = pairwise(vs, (a, b) => Math.abs(dot(a, b)) < 1e-9);
  return prop === 'unit' ? unit : prop === 'perp' ? perp : unit && perp;
}

/** Matrices of every kind: orthonormal columns (square or tall), square-but-stretched, unit-but-slanted, random. */
export function genQ(r: () => number): Mat {
  const n = rint(r, 2, 3), k = r() < 0.5 ? n : rint(r, 1, n - 1);
  const kind = rint(r, 0, 3);
  let vs: Vec[];
  do { vs = Array.from({ length: k }, () => Array.from({ length: n }, () => rint(r, -3, 3))); } while (gramSchmidt(vs).length < k);
  const qs = gramSchmidt(vs);
  if (kind === 0) return fromCols(qs);
  if (kind === 1) return fromCols(qs.map((q, i) => vscale(q, 1 + rint(r, 1, 3) * (i % 2 === 0 ? 1 : 0.5))));
  if (kind === 2) return fromCols(vs.map((v) => normalize(v)));
  return fromCols(vs);
}

export const lawCore: LawCore<QCase> & { answer: Record<string, string> } = {
  id: 'c22-law',
  answer: { part: 'cols', prop: 'both' },
  gen: (r) => ({ Q: genQ(r) }),
  edgeCases: [
    { Q: identity(2) },
    { Q: [[0.6, -0.8], [0.8, 0.6]] },
    { Q: fromCols(P2_Q.slice(0, 2)) },        // tall: two orthonormal columns in 3-D
    { Q: [[1, 1], [-1, 1]] },                  // square, stretched
    { Q: [[0, 1], [1, 0]] },
  ],
  holds(f, c) {
    const lhs = orthonormalCols(c.Q, 1e-9);
    return lhs === propHolds(f.part, f.prop, c.Q);
  },
  describe(c) {
    const QtQ = matMul(transpose(c.Q), c.Q);
    return `$Q = ${texM(c.Q.map((r) => r.map((x) => Math.round(x * 1000) / 1000)))}$, $Q^{\\mathsf T}Q = ${texM(QtQ.map((r) => r.map((x) => Math.round(x * 1000) / 1000)))}$`;
  },
};

// ------------------------------------------------------------------ LANTERN's procedure, run literally

/** The test case: LANTERN squares up (2, 0, 0), (1, 2, 0), (1, 1, 2). */
export const PROC_X: Vec[] = [[2, 0, 0], [1, 2, 0], [1, 1, 2]];
export const PROC_REF = ['each', 'sub', 'scale'];
export type ProcFault = 'ok' | 'noloop' | 'nosub' | 'first' | 'orig' | 'noscale';
export interface ProcStep { arrow: number; op: 'sub' | 'subfirst' | 'suborig' | 'scale'; before: Vec; after: Vec; onto?: Vec }
export interface ProcRun { out: Vec[]; steps: ProcStep[]; fault: ProcFault; maxDot: number; lengths: number[] }

/** Run the tiles literally on the test case. Tiles before FOR EACH run once on the first arrow. */
export function runProcedure(ids: readonly string[], xs: Vec[] = PROC_X): ProcRun {
  const steps: ProcStep[] = [];
  const out = xs.map((x) => x.slice());
  const done: Vec[] = [];
  const loopAt = ids.indexOf('each');
  const apply = (i: number, op: string) => {
    const before = out[i].slice();
    if (op === 'sub') for (const q of done) { const b = out[i].slice(); out[i] = vsub(out[i], vscale(q, dot(out[i], q) / dot(q, q))); steps.push({ arrow: i, op: 'sub', before: b, after: out[i].slice(), onto: q }); }
    else if (op === 'subfirst') { if (done.length) { const q = done[0]; out[i] = vsub(out[i], vscale(q, dot(out[i], q) / dot(q, q))); steps.push({ arrow: i, op: 'subfirst', before, after: out[i].slice(), onto: q }); } }
    else if (op === 'suborig') for (let j = 0; j < i; j++) { const q = xs[j]; const b = out[i].slice(); out[i] = vsub(out[i], vscale(q, dot(out[i], q) / dot(q, q))); steps.push({ arrow: i, op: 'suborig', before: b, after: out[i].slice(), onto: q }); }
    else if (op === 'scale') { out[i] = normalize(out[i]); steps.push({ arrow: i, op: 'scale', before, after: out[i].slice() }); }
  };
  if (loopAt < 0) {
    for (const op of ids) apply(0, op);
    done.push(out[0]);
  } else {
    for (const op of ids.slice(0, loopAt)) apply(0, op);
    const body = ids.slice(loopAt + 1);
    for (let i = 0; i < out.length; i++) { for (const op of body) apply(i, op); done.push(out[i]); }
  }
  const maxDot = (() => { let m = 0; for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) m = Math.max(m, Math.abs(dot(normalize(out[i]), normalize(out[j])))); return m; })();
  const lengths = out.map((v) => norm(v));
  const square = maxDot < 1e-9, unit = lengths.every((l) => Math.abs(l - 1) < 1e-9);
  let fault: ProcFault = 'ok';
  if (!square || !unit) {
    if (loopAt < 0) fault = 'noloop';
    else if (!square && ids.includes('subfirst')) fault = 'first';
    else if (!square && ids.includes('suborig')) fault = 'orig';
    else if (!square) fault = 'nosub';
    else fault = 'noscale';
  }
  return { out, steps, fault, maxDot, lengths };
}

/** What LANTERN says after running the tiles: built from the run, so it says what actually happened. */
export function procMessage(ids: readonly string[]): { ok: boolean; message: string } {
  const res = runProcedure(ids);
  const third = res.out[2], second = res.out[1];
  const lean = Math.abs(dot(normalize(third), normalize(second)));
  const lens = res.lengths.map((l) => fmtN(l)).join(', ');
  switch (res.fault) {
    case 'ok': return { ok: true, message: `LANTERN squared up ${PROC_X.map((x) => fmtV(x)).join(', ')} into ${res.out.map((x) => fmtV(x)).join(', ')}. Every pair reads 0; every arrow is one unit long.` };
    case 'noloop': return { ok: false, message: 'You never said to go through the arrows. LANTERN finished the first arrow and stopped. The other two still lean.' };
    case 'first': return { ok: false, message: `You told me to subtract the shadow on the first arrow. You did not say what to do about the second. The third arrow leans: it reads ${fmtN(lean)} against the second.` };
    case 'orig': return { ok: false, message: `You told me to subtract shadows on the original arrows, not the finished ones. The third arrow still leans: it reads ${fmtN(lean)} against the second.` };
    case 'nosub': {
      // 'sub' inside the loop always squares the arrows, so here it can only sit before FOR EACH
      const why = ids.includes('sub')
        ? 'You said to subtract shadows, but before ‘For each arrow’. LANTERN ran it once on the first arrow, when nothing was finished yet, so nothing came off. Put it inside the loop.'
        : 'You never said to remove shadows.';
      const unit = res.lengths.every((l) => Math.abs(l - 1) < 1e-9);
      const first2 = fmtN(Math.abs(dot(normalize(res.out[0]), normalize(res.out[1]))));
      return { ok: false, message: `${why} ${unit ? 'Every arrow is one unit long, but they still lean on each other' : `The arrows are ${lens} long, and they still lean on each other`}: the first two read ${first2}.` };
    }
    default: {
      const order = ids.includes('scale');
      return { ok: false, message: order ? `Every pair reads 0: the grid is square. But you scaled before the shadows came off, so the arrows ended ${lens} long. Scale last.` : `Every pair reads 0: the grid is square. But the arrows are ${lens} long: square, but stretched. Say to scale to length 1.` };
    }
  }
}

// ------------------------------------------------------------------ Teach Teo (T4): aim the suit antenna

/** Teo's suit dial: three heading arrows. The Lantern lies along s (and its signal is 5 strong). */
export const TEO_HEADINGS: Vec[] = [[2, 0], [1, 1], [0, 1]];
export const TEO_SIGNAL: Vec = [3, 4];
export const TEO_REF = ['unit', 'check', 'read', 'aim'];
export type TeoFault = 'ok' | 'scaled' | 'readfirst' | 'nocheck' | 'noread' | 'noaim' | 'max' | 'half';
export interface TeoRun { headings: Vec[]; readings: number[] | null; pair: [number, number]; aim: Vec | null; off: number; fault: TeoFault; readScaled: boolean }

/** Teo follows the tiles literally. */
export function runTeo(ids: readonly string[]): TeoRun {
  let H = TEO_HEADINGS.map((h) => h.slice());
  let R: number[] | null = null;
  let pair: [number, number] = [0, 1];
  let checked = false, unitDone = false, readScaled = false;
  let aim: Vec | null = null;
  let how: 'aim' | 'max' | 'half' | null = null;
  let aimChecked = false, aimScaled = false, aimUnit = false;
  for (const id of ids) {
    if (id === 'unit') { H = H.map((h) => normalize(h)); unitDone = true; }
    else if (id === 'read') { R = H.map((h) => dot(TEO_SIGNAL, h)); readScaled = !unitDone; }
    else if (id === 'check') {
      checked = true;
      outer: for (let i = 0; i < H.length; i++) for (let j = i + 1; j < H.length; j++) if (Math.abs(dot(H[i], H[j])) < 1e-9) { pair = [i, j]; break outer; }
    } else if ((id === 'aim' || id === 'max' || id === 'half') && (R || id === 'half')) {
      if (id === 'aim') aim = vadd(vscale(H[pair[0]], R![pair[0]]), vscale(H[pair[1]], R![pair[1]]));
      else if (id === 'max') { const k = R!.indexOf(Math.max(...R!)); aim = H[k].slice(); }
      else aim = vadd(normalize(H[pair[0]]), normalize(H[pair[1]]));
      how = id;
      aimChecked = checked; aimScaled = readScaled; aimUnit = unitDone;
    }
  }
  const off = aim ? angleDeg(aim, TEO_SIGNAL) : 180;
  let fault: TeoFault = 'ok';
  if (!aim) fault = ids.includes('aim') || ids.includes('max') ? 'noread' : 'noaim';
  else if (off > 1) {
    if (how === 'max') fault = 'max';
    else if (how === 'half') fault = 'half';
    else if (!aimChecked) fault = 'nocheck';
    else if (aimScaled && aimUnit) fault = 'readfirst';
    else fault = 'scaled';
  }
  return { headings: H, readings: R, pair, aim, off, fault, readScaled };
}

/** A number as fmtV writes it: up to two decimals, no trailing zeros. */
const fmtS = (x: number): string => fmtV([x]).slice(1, -1);

/** What LANTERN reports after playing the tiles as Teo would: built from the run. */
export function teoReply(ids: readonly string[]): { ok: boolean; message: string } {
  const res = runTeo(ids);
  const off = fmtN(res.off, 1);
  switch (res.fault) {
    case 'ok': return { ok: true, message: `Played as Teo would follow it: headings (1, 0) and (0, 1), readings 3 and 4, antenna along (3, 4). It points straight at the *Lantern*.` };
    case 'scaled': return { ok: false, message: `He reads along his dial’s arrows as they are: (2, 0) is two units long, so its reading doubles to 6. He aims along 6 × (2, 0) + 4 × (0, 1), ${off}° off. Tell him to make each heading one unit long first.` };
    case 'readfirst': return { ok: false, message: `He took the readings before he shortened the headings, so the first one reads 6, not 3. His antenna ends ${off}° off. Make the headings one unit long before reading.` };
    case 'nocheck': {
      const [i, j] = res.pair, hi = res.headings[i], hj = res.headings[j];
      const read = res.readings ? `, reading ${fmtS(res.readings[i])} and ${fmtS(res.readings[j])}` : '';
      return { ok: false, message: `He uses headings ${fmtV(hi)} and ${fmtV(hj)}, ${fmtN(angleDeg(hi, hj), 0)}° apart${read}. They are not at a right angle, so the two readings overlap. His antenna ends ${off}° off. Tell him to pick two headings that read 0 against each other${res.readScaled ? ', and to make each one unit long before reading' : ''}.` };
    }
    case 'noread': return { ok: false, message: 'He has nothing to aim with: your message never has him take a reading before he aims.' };
    case 'max': return { ok: false, message: `He points along the loudest heading, (1, 1). One reading cannot say where between his headings the *Lantern* is: ${off}° off.` };
    case 'half': return { ok: false, message: `He aims halfway between two headings, whatever they read: ${off}° off. The readings have to set the mix.` };
    default: return { ok: false, message: 'He works out a direction and keeps the antenna where it is. Your message never says to turn it.' };
  }
}

// ------------------------------------------------------------------ crew versions and swarms

export const crew = {
  gram_schmidt: (vs: Vec[]): Vec[] => gramSchmidt(vs),
  qr: (A: Mat): [Mat, Mat] => { const { Q, R } = qr(A); return [Q, R]; },
};

const num = (r: () => number, level: string) => (level === 'cadet' ? rint(r, -3, 3) : level === 'navigator' ? rint(r, -8, 8) / 2 : rint(r, -40, 40) / 10);

/** 1 to 3 arrows in 2-D to 4-D; sometimes one repeats an earlier direction (it is dropped). */
export function gsCase(r: () => number, level: string): [Vec[]] {
  const n = rint(r, 2, 4), k = rint(r, 1, Math.min(3, n));
  let vs: Vec[];
  do { vs = Array.from({ length: k }, () => Array.from({ length: n }, () => num(r, level))); } while (gramSchmidt(vs).length < k);
  if (k >= 2 && r() < 0.12) vs.push(vscale(vs[0], -2));
  return [vs];
}
/** A tall or square matrix with independent columns. */
export function qrCase(r: () => number, level: string): [Mat] {
  const n = rint(r, 2, 4), k = rint(r, 1, n);
  let vs: Vec[];
  do { vs = Array.from({ length: k }, () => Array.from({ length: n }, () => num(r, level))); } while (gramSchmidt(vs).length < k);
  return [fromCols(vs)];
}

/** The Anchor's arms (TT1), squared up: our own grid back. */
export const ANCHOR_ARMS: Vec[] = [0, 1, 2].map((j) => col(P, j));
export const ANCHOR_SQUARED: Vec[] = gramSchmidt(ANCHOR_ARMS);
