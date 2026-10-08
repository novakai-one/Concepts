// Chapter 17 pure logic (no DOM, no three): every number, win check, doubt predicate, the Law core, the
// honest in-between frames and Teo's message. Unit-tested in tests/singular/game-c17.test.ts.
// Story numbers come from truth.ts (P, R, T, ILSE_MEANT, S_now, T3); nothing here is typed by hand
// except the puzzle data the GDD fixes (the ship points, Vell's grid, Teo's position).
import { HATCH, ILSE_MEANT, P, P2, P2inv, Pinv, R, R2, S_now, T, T3, Tpartial } from '../../truth.ts';
import {
  angle, col, cross2, det, dot, fromCols, identity, interpMat2, inverse, matMul, matVec, meq, mpow, norm, transpose, veq,
  type Mat, type Vec,
} from '../../../math/la.ts';
import { nice } from '../../../math/frac.ts';
import { rint, type LawCore } from '../../../game/lawcheck.ts';

// ------------------------------------------------------------------ formatting

/** A number for display: whole numbers as they are, simple fractions as a/b, a real minus sign. */
export const fmtN = (x: number): string => {
  const q = Math.round(x * 4);
  const t = Math.abs(x * 4 - q) < 1e-9 && !Number.isInteger(x) ? String(q / 4) : nice(x);
  return t.replace(/^-/, '−');
};
export const fmtV = (v: readonly number[]): string => `(${v.map(fmtN).join(', ')})`;
/** A matrix as TeX (rows). */
export const texM = (M: Mat): string => `\\begin{bmatrix}${M.map((r) => r.map((x) => nice(x)).join(' & ')).join(' \\\\ ')}\\end{bmatrix}`;
/** A matrix as small inline TeX (for readout rows). */
export const texSmall = (M: Mat): string => `\\left[\\begin{smallmatrix}${M.map((r) => r.map((x) => nice(x)).join(' & ')).join(' \\\\ ')}\\end{smallmatrix}\\right]`;
/** The 2 × 2 ground-layer slice of a 3 × 3. */
export const slice2 = (M: Mat): Mat => [[M[0][0], M[0][1]], [M[1][0], M[1][1]]];

// ------------------------------------------------------------------ the Anchor's grid (TT1)

/** The Anchor's two ground arms: b₁ = (1, 0), b₂ = (1, 1), the columns of P. */
export const B1: Vec = col(P2, 0);
export const B2: Vec = col(P2, 1);
/** Length of b₂ (1.41) and the angle between the arms (45°). */
export const B2_LEN = norm(B2);
export const ARM_ANGLE = (angle(B1, B2) * 180) / Math.PI;
/** Where the Anchor's numbers c reach, in ship numbers: c₁ b₁ + c₂ b₂ = P c. */
export const reach = (c: readonly number[], M: Mat = P2): Vec => matVec(M, c as number[]);
/** The Anchor's numbers of a ship point: solve P c = x. */
export const anchorOf = (x: readonly number[], M: Mat = P2): Vec | null => { const inv = inverse(M); return inv ? matVec(inv, x as number[]) : null; };

// ------------------------------------------------------------------ p1 · ship point → Anchor numbers

export const P1_SHIP: Vec = [3, 2];
export const P1_ANCHOR: Vec = matVec(P2inv, P1_SHIP);                // (1, 2)
/** Won when the Anchor's numbers c reach the ship point. */
export const p1Won = (c: readonly number[], tol = 0.05): boolean => veq(reach(c), P1_SHIP, tol);
/** Misconceptions: the ship numbers read as Anchor numbers; P applied the wrong way. */
export const P1_SAME: Vec = P1_SHIP.slice();                          // (3, 2) reaches (5, 2)
export const P1_WRONGWAY: Vec = matVec(P2, P1_SHIP);                  // (5, 2) reaches (7, 2)

// ------------------------------------------------------------------ p2 · Anchor numbers → ship point

export const P2_ANCHOR: Vec = [2, -1];
export const P2_SHIP: Vec = matVec(P2, P2_ANCHOR);                    // (1, −1)
export const p2Won = (x: readonly number[], tol = 0.05): boolean => veq(x as number[], P2_SHIP, tol);
export const P2_SAME: Vec = P2_ANCHOR.slice();                        // the numbers placed as ship numbers
export const P2_WRONGWAY: Vec = matVec(P2inv, P2_ANCHOR);             // (3, −1)

// ------------------------------------------------------------------ p3 [H] · Anchor numbers → Vell's numbers

/** Vell's cutter grid: c₁ = (1, 1), c₂ = (−1, 1), both 1.41 long, at right angles. */
export const PC: Mat = fromCols([[1, 1], [-1, 1]]);
export const PCinv: Mat = inverse(PC)!;
export const P3_ANCHOR: Vec = [2, 1];
export const P3_SHIP: Vec = matVec(P2, P3_ANCHOR);                    // (3, 1)
export const P3_VELL: Vec = matVec(PCinv, P3_SHIP);                   // (2, −1)
/** The one conversion matrix, Anchor numbers → Vell's numbers: P_C⁻¹ P_B. */
export const P3_CONVERT: Mat = matMul(PCinv, P2);                     // [[1/2, 1], [−1/2, 0]]
export const P3_MISTAKES = {
  ship: matVec(P2inv, P3_ANCHOR),                                     // (1, 1): P⁻¹ instead of P
  vell: matVec(PC, P3_SHIP),                                          // (2, 4): P_C instead of P_C⁻¹
  backwards: matMul(inverse(P2)!, PC),                                // Vell's numbers → Anchor numbers
  order: matMul(P2, PCinv),                                           // the right-hand matrix acts first
};

// ------------------------------------------------------------------ p4 · the three-slot rail

/** One card for the rail. */
export interface Card { id: string; name: string; M: Mat; /** Honest in-between of this card's own move (I at t = 0, M at t = 1). */ at?: (t: number) => Mat }
/** The product of the cards in acting order (the first acts first): M_k ⋯ M_2 M_1. */
export const railProduct = (acting: readonly Mat[]): Mat => acting.reduce((acc, M) => matMul(M, acc), identity(acting[0]?.length ?? 2));
/** The rail's slots, in acting order: into the Anchor's grid, the spire numbers, back to the ship's grid. */
export const RAIL_RIGHT: Mat[] = [P2inv, R2, P2];
/** Won when the rail plays the measured pulse T (TT3). */
export const p4Won = (acting: readonly (Mat | null)[]): boolean => acting.length === 3 && acting.every(Boolean) && meq(railProduct(acting as Mat[]), T, 1e-9);
export const BOW: Vec = [1, 0];
export const BOW_SPIRE: Vec = matVec(R2, BOW);                        // (0, 1): the spire numbers read in our grid
export const BOW_REAL: Vec = matVec(T, BOW);                          // (1, 1): where the bow went
/** The rail the other way round, P⁻¹ R P (what Ilse meant), sends the bow to (−1, 1). */
export const ILSE_MEANT2: Mat = slice2(ILSE_MEANT);
export const BOW_SWAPPED: Vec = matVec(ILSE_MEANT2, BOW);
/** The measured pulse's unit square: 0, T e₁, T(e₁ + e₂), T e₂. */
export const squareOf = (M: Mat): Vec[] => [[0, 0], matVec(M, [1, 0]), matVec(M, [1, 1]), matVec(M, [0, 1])];

/**
 * Honest frames for one rail stage: the picture moves from `cur` to M·cur. A turn plays as a turn (polar),
 * a shear slides straight; neither ever passes through a flattening.
 */
export const stageAt = (M: Mat, cur: Mat, t: number): Mat => interpMat2(cur, matMul(M, cur), t, 'auto');

// ------------------------------------------------------------------ p5 · what Ilse meant to enter

/** The ship-grid move a setting S makes when the Anchor reads it in its own grid: P S P⁻¹. */
export const shipMove = (S: Mat): Mat => (S.length === 3 ? matMul(matMul(P, S), Pinv) : matMul(matMul(P2, S), P2inv));
/** Won when the setting turns the ship grid a clean quarter turn: P S P⁻¹ = R. */
export const p5Won = (S: Mat, tol = 1e-6): boolean => meq(shipMove(S), S.length === 3 ? R : R2, tol);
/** Where a clean quarter turn sends the Anchor's arms (ship numbers), and those spots in Anchor numbers. */
export const TURN_B1: Vec = matVec(R2, B1);                           // (0, 1)
export const TURN_B2: Vec = matVec(R2, B2);                           // (−1, 1)
/** The setting whose columns are the Anchor numbers of two landing spots (drawn in ship space). */
export const settingFromLandings = (l1: readonly number[], l2: readonly number[]): Mat => matMul(P2inv, fromCols([l1 as number[], l2 as number[]]));

// ------------------------------------------------------------------ p6 [D] · what did not change

export interface Measure { id: 'det' | 'diag' | 'four' | 'entries' | 'land'; label: string; a: string; b: string; same: boolean }
const diagSum = (M: Mat): number => M.reduce((s, r, i) => s + r[i], 0);
const homeAfter4 = (M: Mat): boolean => meq(mpow(M, 4), identity(M.length), 1e-9);
/** The five measurements of R (in the Anchor's grid) and T = P R P⁻¹ (in the ship's grid). */
export function measures(A: Mat = R2, B: Mat = T): Measure[] {
  return [
    { id: 'det', label: 'Area scale', a: fmtN(det(A)), b: fmtN(det(B)), same: Math.abs(det(A) - det(B)) < 1e-9 },
    { id: 'diag', label: 'Diagonal sum', a: fmtN(diagSum(A)), b: fmtN(diagSum(B)), same: Math.abs(diagSum(A) - diagSum(B)) < 1e-9 },
    { id: 'four', label: 'Home after four', a: homeAfter4(A) ? 'yes' : 'no', b: homeAfter4(B) ? 'yes' : 'no', same: homeAfter4(A) === homeAfter4(B) },
    { id: 'entries', label: 'The entries', a: `$${texSmall(A)}$`, b: `$${texSmall(B)}$`, same: meq(A, B, 1e-9) },
    { id: 'land', label: '$(1, 0)$ lands at', a: fmtV(matVec(A, [1, 0])), b: fmtV(matVec(B, [1, 0])), same: veq(matVec(A, [1, 0]), matVec(B, [1, 0]), 1e-9) },
  ];
}
/** The player's marks win when every measurement is marked and each mark matches. */
export const p6MarksRight = (marks: Partial<Record<Measure['id'], 'same' | 'diff'>>): boolean =>
  measures().every((m) => marks[m.id] === (m.same ? 'same' : 'diff'));
/** The derivation, on Vell's grid (det P_C = 2, so the cancelling shows): det(P_C⁻¹ T P_C) = ½ · 1 · 2 = 1. */
export const P6_SIM: Mat = matMul(matMul(PCinv, T), PC);
export const P6 = { detPC: det(PC), detPCinv: det(PCinv), detT: det(T), detSim: det(P6_SIM) };
export const P6_ORDER = ['product', 'inverse', 'cancel'];
/**
 * Fewest moves for p6 on each difficulty: five measurements and five marks (each a move), then the reason.
 * Cadet: one slider change (two if dragged through ½ steps); navigator: four checked worksheet lines;
 * commander: the tile submit and the last line. Par is the largest, so it is reachable on every difficulty.
 */
export const P6_MIN = { cadet: 5 + 5 + 2, navigator: 5 + 5 + 4, commander: 5 + 5 + 1 + 1 };
export const P6_PAR = Math.max(...Object.values(P6_MIN));

// ------------------------------------------------------------------ p7 [S] · Chapter 11's bow, forecast again (3-D)

export const BOW3: Vec = [1, 0, 0];
export const BOW3_SPIRE: Vec = matVec(S_now, BOW3);                   // (0, 1, 0): the Ch 11 forecast
export const BOW3_REAL: Vec = matVec(T3, BOW3);                       // (1, 1, 0): where the bow went
export const p7Won = (acting: readonly (Mat | null)[]): boolean => acting.length === 3 && acting.every(Boolean) && meq(railProduct(acting as Mat[]), T3, 1e-9);

/** The measured pulse in 3-D partway (t from 0 to 1): P · (R(tπ/2), heights × (1 − 0.2t)) · P⁻¹. */
export function T3partial(t: number): Mat {
  const th = (t * Math.PI) / 2, h = 1 + (S_now[2][2] - 1) * t;
  return matMul(matMul(P, [[Math.cos(th), -Math.sin(th), 0], [Math.sin(th), Math.cos(th), 0], [0, 0, h]]), Pinv);
}
/** A clean quarter turn about the vertical, partway. */
export const turn3 = (t: number): Mat => { const th = (t * Math.PI) / 2; return [[Math.cos(th), -Math.sin(th), 0], [Math.sin(th), Math.cos(th), 0], [0, 0, 1]]; };
export { Tpartial };

// ------------------------------------------------------------------ [SP] Act VI · set the spires right

/** The ark's centre, inside the debris stream that flows along x = 3, z = 0. */
export const ARK: Vec = [3, 1, 0];
export const STREAM_X = 3;
export const CLEARANCE = 2;
/** Distance from a point to the stream's line (x = 3, z = 0, running along y). */
export const distToStream = (p: readonly number[]): number => Math.hypot(p[0] - STREAM_X, p[2] ?? 0);
/** The foot of the perpendicular from a point to the stream's line. */
export const streamFoot = (p: readonly number[]): Vec => [STREAM_X, p[1], 0];
/** The setting Ilse meant (TT6), third spire upright. */
export const SP_SETTING: Mat = ILSE_MEANT;
export const SP_MOVE: Mat = shipMove(SP_SETTING);                     // = R: a clean quarter turn
export const ARK_AFTER: Vec = matVec(SP_MOVE, ARK);                   // (−1, 3, 0)
export const ARK_CLEAR = distToStream(ARK_AFTER);                     // 4
/** Ilse's original setting, repeated: (3, 1) → (1, 2) → (−3, −1) → (−1, −2) → back into the stream. */
export const ILSE_PATH: Vec[] = [0, 1, 2, 3, 4].map((k) => matVec(mpow(T, k), [ARK[0], ARK[1]]));
/** Step checks for the set piece. */
export const spSettingOk = (S: Mat): boolean => p5Won(S);
export const spVolumeOk = (S: Mat): boolean => Math.abs(det(S) - 1) < 1e-6 && Math.abs(det(shipMove(S)) - 1) < 1e-6;
export const spForecast = (S: Mat): Vec => matVec(shipMove(S), ARK);
/** The clearance step: the foot of the perpendicular placed on the stream's line, at the closest point. */
export const spFootOk = (foot: readonly number[], from: readonly number[], tol = 0.05): boolean => veq(foot as number[], streamFoot(from), tol);
export const spClear = (S: Mat): boolean => distToStream(spForecast(S)) >= CLEARANCE - 1e-9;

// ------------------------------------------------------------------ Doubts

/** Two arrows name every point exactly when they are not on one line. */
export const namesPoints = (b1: readonly number[], b2: readonly number[]): boolean => Math.abs(cross2(b1 as number[], b2 as number[])) > 1e-9;
export const atRightAngles = (b1: readonly number[], b2: readonly number[]): boolean => Math.abs(dot(b1 as number[], b2 as number[])) < 1e-9 && norm(b1 as number[]) > 1e-9 && norm(b2 as number[]) > 1e-9;
/** (F) "A grid needs right angles to name points." Fails for any pair at a slant that still names points. */
export const needsRightHolds = (b1: readonly number[], b2: readonly number[]): boolean => atRightAngles(b1, b2) || !namesPoints(b1, b2);

/** (F) "Same numbers, same motion." The setting S read in the ship's grid moves space by S; read in grid G, by G S G⁻¹. */
export const motionIn = (S: Mat, G: Mat): Mat | null => { const Gi = inverse(G); return Gi ? matMul(matMul(G, S), Gi) : null; };
export const sameMotionHolds = (S: Mat, G: Mat): boolean => { const m = motionIn(S, G); return m === null || meq(m, S, 1e-9); };

/** The move A written in the grid G: G⁻¹ A G (null when G is flat). */
export const inGrid = (A: Mat, G: Mat): Mat | null => { const Gi = inverse(G); return Gi ? matMul(matMul(Gi, A), G) : null; };
/** (T) "Two similar matrices scale area by the same amount." */
export const similarAreaHolds = (A: Mat, G: Mat): boolean => { const B = inGrid(A, G); return B === null || Math.abs(det(B) - det(A)) < 1e-9; };

// ------------------------------------------------------------------ the act Review (Ilse)

/**
 * (F) "Changing the basis moves the point." The point stays; only its numbers change. The starting grid
 * (no change yet) agrees with the claim, so the player has to drag the arrows to find a case against it.
 */
export const basisMovesPointHolds = (point: readonly number[], G: Mat): boolean => {
  const c = anchorOf(point, G);
  return c === null || meq(G, identity(2), 1e-9) || !veq(reach(c, G), point as number[], 1e-9);
};
/** (F) "P converts standard numbers into B-numbers." Holds only where P x happens to equal the B-numbers. */
export const pToBHolds = (G: Mat, x: readonly number[]): boolean => { const c = anchorOf(x, G); return c === null || veq(matVec(G, x as number[]), c, 1e-9); };
/** (T) "If four pulses of one matrix bring every point home, four pulses of any similar matrix do too." */
export const fourHomeHolds = (A: Mat, G: Mat): boolean => {
  const m = motionIn(A, G);
  if (m === null || !homeAfter4(A)) return true;
  return homeAfter4(m);
};
/** (F) "Similar matrices have the same entries." */
export const sameEntriesHolds = (A: Mat, G: Mat): boolean => { const B = inGrid(A, G); return B === null || meq(B, A, 1e-9); };

// ------------------------------------------------------------------ the Law

export interface GridCase { G: Mat; c: Vec }
/** "The matrix whose columns are the new grid arrows turns [NEW into OLD / OLD into NEW] numbers, [always / …]." */
export const lawCore: LawCore<GridCase> & { answer: Record<string, string> } = {
  id: 'c17-law',
  answer: { dir: 'new-old', when: 'always' },
  gen: (r) => {
    let G: Mat;
    do { G = [[rint(r, -3, 3), rint(r, -3, 3)], [rint(r, -3, 3), rint(r, -3, 3)]]; } while (Math.abs(det(G)) < 1);
    return { G, c: [rint(r, -3, 3), rint(r, -3, 3)] };
  },
  edgeCases: [
    { G: P2, c: P1_ANCHOR },                         // the Anchor's grid, the story point
    { G: identity(2), c: [2, -1] },                  // the ship's own grid: both directions agree
    { G: PC, c: P3_VELL },                           // Vell's grid: at right angles, 1.41 long
    { G: [[0, -1], [1, 0]], c: [1, 2] },             // right angles, one step long
    { G: [[0, 1], [1, 0]], c: [3, 1] },              // a flip
  ],
  holds(f, k) {
    const old = matVec(k.G, k.c);
    const lands = f.dir === 'new-old' ? veq(matVec(k.G, k.c), old, 1e-9) : veq(matVec(k.G, old), k.c, 1e-9);
    const b1 = col(k.G, 0), b2 = col(k.G, 1);
    const cond = f.when === 'always' ? true
      : f.when === 'right' ? atRightAngles(b1, b2)
      : Math.abs(norm(b1) - 1) < 1e-9 && Math.abs(norm(b2) - 1) < 1e-9;
    return f.when === 'always' ? lands : lands === cond;
  },
  describe: (k) => `grid arrows ${fmtV(col(k.G, 0))} and ${fmtV(col(k.G, 1))}, new numbers ${fmtV(k.c)}: the point is ${fmtV(matVec(k.G, k.c))} in the old numbers, and the matrix sends ${fmtV(matVec(k.G, k.c))} to ${fmtV(matVec(k.G, matVec(k.G, k.c)))}`,
};
export const LAW_NEAR_MISSES: Record<string, string>[] = [
  { dir: 'old-new', when: 'always' },
  { dir: 'new-old', when: 'right' },
  { dir: 'new-old', when: 'unit' },
  { dir: 'old-new', when: 'right' },
  { dir: 'old-new', when: 'unit' },
];

// ------------------------------------------------------------------ Teach Teo T2 (GDD §4.4)

/** Teo's position in the ship's grid, and the stern hatch his suit measures from (TT16, ground layer). */
/** A 2-D view that puts `pts` in the strip right of the centred message panel (820 px wide), or centred if too narrow. */
export function teoView(W: number, H: number, pts: readonly number[][]): { center: [number, number]; height: number } {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const left = W / 2 + Math.min(410, W / 2 - 20) + 50, right = W - 55, room = right - left;
  if (room < 160) return { center: [(x0 + x1) / 2, (y0 + y1) / 2], height: Math.max(8, y1 - y0 + 3) };
  const s = Math.min(room / Math.max(1, x1 - x0), (H * 0.6) / Math.max(1, y1 - y0), 70);
  const extra = room - (x1 - x0) * s;
  return { center: [x0 - (left - W / 2 + extra / 2) / s, (y0 + y1) / 2], height: H / s };
}

export const TEO_POS: Vec = [4, 3];
export const TEO_HATCH: Vec = [HATCH[0], HATCH[1]];
export const TEO_SUIT: Vec = [TEO_POS[0] - TEO_HATCH[0], TEO_POS[1] - TEO_HATCH[1]];  // (3, 2): the arrow his suit shows
export const TEO_ANCHOR: Vec = matVec(P2inv, TEO_POS);               // (1, 3)
export const TEO_WRONG: Vec = matVec(P2, TEO_POS);                   // (7, 3)
export const TEO_REF = ['base', 'cols', 'solve', 'send'];
export const TEO_KEYS = ['base', 'solve'];

export interface TeoRun {
  ok: boolean;
  /** The numbers he sends back (null: he sends nothing). */
  report: Vec | null;
  /** Where his numbers reach when the Anchor reads them: report₁ b₁ + report₂ b₂. */
  reached: Vec | null;
  /** The arrow he converted, and where it started. */
  arrow: Vec | null;
  from: 'base' | 'hatch' | null;
  /** The matrix he used, and how. */
  matrix: 'cols' | 'rows' | null;
  how: 'solve' | 'mul' | null;
  /** What went wrong, in one word (for the reply). */
  fault: null | 'hatch' | 'mul' | 'rows' | 'nomatrix' | 'nosend' | 'noconvert';
}

/**
 * Teo follows the tiles literally, in order. A missing key step is replaced by its misconception
 * (GDD §4.4): no "from the base" → he converts the arrow his suit shows, from the hatch; no "go the other
 * way" → he multiplies by P; no "columns" → he writes the arrows as rows.
 */
export function runTeo(ids: readonly string[]): TeoRun {
  const has = (id: string) => ids.includes(id);
  const steps = ids.slice();
  if (!has('cols') && !has('rows') && (has('solve') || has('mul'))) steps.splice(steps.findIndex((s) => s === 'solve' || s === 'mul'), 0, 'rows');
  if (!has('solve') && !has('mul') && (has('cols') || has('rows'))) steps.splice(Math.max(steps.indexOf('cols'), steps.indexOf('rows')) + 1, 0, 'mul');
  let arrow: Vec | null = null, from: TeoRun['from'] = null;
  let M: Mat | null = null, matrix: TeoRun['matrix'] = null, how: TeoRun['how'] = null;
  let c: Vec | null = null, report: Vec | null = null, fault: TeoRun['fault'] = null;
  let used: Vec | null = null, usedFrom: TeoRun['from'] = null;
  for (const s of steps) {
    if (s === 'base') { arrow = [TEO_POS[0] - 0, TEO_POS[1] - 0]; from = 'base'; }
    else if (s === 'cols') { M = P2; matrix = 'cols'; }
    else if (s === 'rows') { M = transpose(P2); matrix = 'rows'; }
    else if (s === 'solve' || s === 'mul') {
      if (!M) { fault = 'nomatrix'; continue; }
      if (!arrow) { arrow = TEO_SUIT.slice(); from = 'hatch'; }
      how = s;
      used = arrow.slice(); usedFrom = from;
      c = s === 'solve' ? matVec(inverse(M)!, arrow) : matVec(M, arrow);
    } else if (s === 'send') {
      if (c) report = c.slice();
      else { used = (arrow ?? TEO_SUIT).slice(); usedFrom = arrow ? from : 'hatch'; report = used.slice(); fault ??= 'noconvert'; }
    }
  }
  if (!report) return { ok: false, report: null, reached: null, arrow: used ?? arrow, from: usedFrom ?? from, matrix, how, fault: fault ?? 'nosend' };
  const reached = matVec(P2, report);
  const ok = veq(reached, TEO_POS, 1e-9) && veq(report, TEO_ANCHOR, 1e-9);
  if (!ok && !fault) fault = usedFrom === 'hatch' ? 'hatch' : how === 'mul' ? 'mul' : matrix === 'rows' ? 'rows' : 'noconvert';
  return { ok, report, reached, arrow: used, from: usedFrom, matrix, how, fault: ok ? null : fault };
}

// ------------------------------------------------------------------ builds: the crew versions

export const crew = {
  to_coords: (B: Mat, x: Vec): Vec | null => anchorOf(x, B),
  from_coords: (B: Mat, c: Vec): Vec => matVec(B, c),
  in_grid: (G: Mat, A: Mat): Mat | null => inGrid(A, G),
};

/** A random grid for the swarms: whole numbers, never flat. 2 × 2 or 3 × 3; wider on harder levels. */
export function swarmGrid(r: () => number, level: string, n = r() < 0.65 ? 2 : 3): Mat {
  const k = level === 'cadet' ? 2 : level === 'navigator' ? 3 : 4;
  let G: Mat;
  do { G = Array.from({ length: n }, () => Array.from({ length: n }, () => rint(r, -k, k))); } while (Math.abs(det(G)) < 1);
  return G;
}
export function swarmVec(r: () => number, level: string, n: number): Vec {
  return Array.from({ length: n }, () => (level === 'commander' ? rint(r, -20, 20) / 4 : level === 'navigator' ? rint(r, -12, 12) / 2 : rint(r, -5, 5)));
}
export function swarmMat(r: () => number, level: string, n: number): Mat {
  return Array.from({ length: n }, () => swarmVec(r, level, n));
}
