// The story's facts (GDD §2.7), computed from the maths library at load time. Chapters read numbers
// from here; dialogue and goals format them with nice(). Unit-tested in tests/singular/game-truth.test.ts.
// Plain data and maths only (no DOM, no three), so Node tests can import it.
import { det, fromCols, identity, inverse, matMul, matVec, svd, mpow, type Mat, type Vec } from '../math/la.ts';

/** TT1: the Anchor's own grid (columns b1, b2, b3). b2 is at 45° to b1 and 1.41 long. */
export const P: Mat = fromCols([[1, 0, 0], [1, 1, 0], [0, 0, 1]]);
export const P2: Mat = [[1, 1], [0, 1]];
export const Pinv: Mat = inverse(P)!;
export const P2inv: Mat = inverse(P2)!;

/** TT2: Ilse's spire numbers R (columns): a quarter turn. Read aloud as three landing spots. */
export const R: Mat = fromCols([[0, 1, 0], [-1, 0, 0], [0, 0, 1]]);
export const R2: Mat = [[0, -1], [1, 0]];

/** Rotation by angle t (2-D), for the honest animation of the routine pulse. */
export const rot = (t: number): Mat => [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]];

/** TT3: the routine pulse in the ship's grid, 2-D slice: T = P R P⁻¹ = [[1, −2], [1, −1]]. det 1, T⁴ = I, eigenvalues ±i. */
export const T: Mat = matMul(matMul(P2, R2), P2inv);
/** The routine pulse partway through (θ from 0 to π/2): P R(θ) P⁻¹, determinant 1 at every frame. */
export const Tpartial = (theta: number): Mat => matMul(matMul(P2, rot(theta)), P2inv);

/** TT4: spire numbers now (third spire bent). */
export const S_now: Mat = fromCols([[0, 1, 0], [-1, 0, 0], [0, 0, 0.8]]);
/** TT5: the routine pulse now, 3-D: columns (1,1,0), (−2,−1,0), (0,0,0.8). */
export const T3: Mat = matMul(matMul(P, S_now), Pinv);

/** TT6: what Ilse meant to enter, in the Anchor's grid: P⁻¹ R P (2-D slice [[−1, −2], [1, 1]]). */
export const ILSE_MEANT: Mat = matMul(matMul(Pinv, R), P);

/** TT7: the true Collapse pulse C: columns (1,0,1), (0,1,1), (1,1,2+δ). Symmetric. */
// δ is chosen so the smallest singular value is exactly 1/750: on the plane spanned by (1,1,0) and
// (0,0,1), C acts as [[1, √2], [√2, 2+δ]], whose small eigenvalue ε solves ε² − (3+δ)ε + δ = 0.
const EPS = 1 / 750;
export const DELTA = (EPS * (3 - EPS)) / (1 - EPS); // 2249 / 561750 ≈ 0.0040036
export const C: Mat = fromCols([[1, 0, 1], [0, 1, 1], [1, 1, 2 + DELTA]]);
/** TT9: the two-decimal model C₂ (δ = 0): rank 2, column space z = x + y, null space t·(1, 1, −1). */
export const C2: Mat = fromCols([[1, 0, 1], [0, 1, 1], [1, 1, 2]]);
export const C2_NULL: Vec = [1, 1, -1];

/** TT8: det C (shown as "0.00, to two decimal places"). */
export const DET_C = det(C);
/** Singular values of C: 3.00267, 1, 1/750. */
export const SV_C = svd(C).S;

/** TT10/TT11: amplification 750, condition number about 2252, readings needed N = 625. */
export const AMPLIFY = 1 / SV_C[2];
export const CONDITION = SV_C[0] / SV_C[2];
export const NOISE = 0.01;
export const TEAR = 0.3;
export const READINGS = Math.ceil(((NOISE * AMPLIFY) / TEAR) ** 2 - 1e-6);

/** TT13: Vell's pulse (symmetric): eigenvalues 1, 0.5, 0.2 along (1,1,1), (1,−1,0), (1,1,−2). */
export const V: Mat = [[37, 7, 16], [7, 37, 16], [16, 16, 28]].map((r) => r.map((x) => x / 60));
export const VELL_CUTTER: Vec = [4, 2, 0];
export const VELL_AFTER_50: Vec = matVec(mpow(V, 50), VELL_CUTTER);

/** TT14: drone transition matrix (columns = from Bow, Mid, Stern). */
export const DRONES: Mat = fromCols([[0.8, 0.1, 0.1], [0.2, 0.7, 0.1], [0.2, 0.2, 0.6]]);
export const DRONES_START: Vec = [300, 0, 0];
export const DRONES_STEADY: Vec = [150, 90, 60];

/** TT16: the hatch, and the closest point on the plane z = x + y (distance 1.155 < tether 1.2). */
export const HATCH: Vec = [1, 1, 0];
export const HATCH_FOOT: Vec = [1 / 3, 1 / 3, 2 / 3];
export const TETHER = 1.2;

/** TT18: the Anchor record's twelve singular values. */
export const RECORD_SV = [9.0, 7.0, 1.5, 1.0, 0.8, 0.6, 0.5, 0.4, 0.3, 0.3, 0.2, 0.2];

/** TT19: the Lantern's inertia matrix (10⁵ kg·m²): axes (1,1,0) → 2, (1,−1,0) → 6, (0,0,1) → 9. */
export const INERTIA: Mat = [[4, -2, 0], [-2, 4, 0], [0, 0, 9]];

/** TT20: the final setting. */
export const FINAL: Mat = identity(3);

/** TT21: spire readings at the Collapse, S_c = P⁻¹ C P: the third tip is 0.004 from the second. */
export const S_COLLAPSE: Mat = matMul(matMul(Pinv, C), P);

/** Prologue reference buoys (before the pulse) and where the routine pulse T sends them. */
export const PROLOGUE_WHITE: Vec[] = [[-1, 1], [0, 2], [1, 3]];
export const PROLOGUE_CYAN: Vec[] = [[2, 0], [3, 0], [4, 0], [5, 0]];
