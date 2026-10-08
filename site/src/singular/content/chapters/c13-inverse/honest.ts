// Honest in-between frames for a move of the plane (GDD §9.3, §11.3). Pure maths (no DOM, no three),
// so the unit tests run it in Node. Used by Chapters 13 and 14.
//
// A 2×2 move S is played on top of the current state M0 in stages that never show a flattening or a
// flip that S does not have:
//   det S ≥ 0: one smooth stage M(t) = R(tθ)·((1 − t)I + t·Y)·M0, where S = R(θ)·Y and Y is symmetric
//              with no negative stretch. det M(t) > 0 for every t < 1 (it reaches 0 only if S is flat).
//   det S < 0: S = Q·Y with Q a mirror flip. First Y smoothly, then Q as a half-turn through 3-D about
//              its mirror line. A flip has no flat in-between in 3-D, so none is shown.
import { det, identity, matMul, mlerp, type Mat, type Vec } from '../../../math/la.ts';

export type Stage2 =
  | { kind: 'smooth'; theta: number; Y: Mat }
  | { kind: 'flip'; u: [number, number]; Q: Mat };

export const rot2 = (t: number): Mat => [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]];
const sym = (Y: Mat): Mat => { const m = (Y[0][1] + Y[1][0]) / 2; return [[Y[0][0], m], [m, Y[1][1]]]; };
const isI = (Y: Mat): boolean => Math.abs(Y[0][0] - 1) + Math.abs(Y[1][1] - 1) + Math.abs(Y[0][1]) + Math.abs(Y[1][0]) < 1e-12;

/** The stages that play the 2×2 move S. */
export function plan2(S: Mat): Stage2[] {
  const [[a, b], [c, d]] = S;
  if (det(S) >= -1e-12) {
    // R(−θ)·S is symmetric for θ = atan2(c − b, a + d); its trace is ≥ 0 and its determinant is det S ≥ 0
    const theta = Math.abs(c - b) < 1e-12 && Math.abs(a + d) < 1e-12 ? 0 : Math.atan2(c - b, a + d);
    return [{ kind: 'smooth', theta, Y: sym(matMul(rot2(-theta), S)) }];
  }
  // S = Q·Y with Q = [[cos φ, sin φ], [sin φ, −cos φ]] (a flip over the line at angle φ/2) and Y = Q·S
  const phi = Math.atan2(b + c, a - d);
  const Q: Mat = [[Math.cos(phi), Math.sin(phi)], [Math.sin(phi), -Math.cos(phi)]];
  const Y = sym(matMul(Q, S));
  const out: Stage2[] = [];
  if (!isI(Y)) out.push({ kind: 'smooth', theta: 0, Y });
  out.push({ kind: 'flip', u: [Math.cos(phi / 2), Math.sin(phi / 2)], Q });
  return out;
}

/** A smooth stage at time t (0..1), as a 2×2 (to be applied after the state it started from). */
export const smoothAt = (s: Extract<Stage2, { kind: 'smooth' }>, t: number): Mat =>
  matMul(rot2(s.theta * t), mlerp(identity(2), s.Y, t));

/** The 2×2 a whole stage ends on. */
export const stageEnd = (s: Stage2): Mat => (s.kind === 'smooth' ? smoothAt(s, 1) : s.Q);

/** A turn by angle `ang` about the unit axis u through the origin (3×3, Rodrigues). */
export function rot3(u: Vec, ang: number): Mat {
  const [x, y, z] = u, c = Math.cos(ang), s = Math.sin(ang), k = 1 - c;
  return [
    [c + x * x * k, x * y * k - z * s, x * z * k + y * s],
    [y * x * k + z * s, c + y * y * k, y * z * k - x * s],
    [z * x * k - y * s, z * y * k + x * s, c + z * z * k],
  ];
}

/** A 2×2 as a 3×3 acting on the floor (heights untouched). */
export const embed = (M: Mat): Mat => (M.length === 3 ? M : [[M[0][0], M[0][1], 0], [M[1][0], M[1][1], 0], [0, 0, 1]]);

/** A flip stage partway (k from 0 to 1): the half-turn about the mirror line, after M0 (3×3 world matrix). */
export const flipAt = (s: Extract<Stage2, { kind: 'flip' }>, k: number, M0: Mat): Mat =>
  matMul(rot3([s.u[0], s.u[1], 0], Math.PI * k), embed(M0));

/** Every frame of S played after M0, sampled (for tests): 3×3 world matrices. */
export function framesOf(S: Mat, M0: Mat = identity(2), n = 24): Mat[] {
  const out: Mat[] = [];
  let cur = M0;
  for (const st of plan2(S)) {
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      out.push(st.kind === 'smooth' ? embed(matMul(smoothAt(st, t), cur)) : flipAt(st, t, cur));
    }
    cur = matMul(stageEnd(st), cur);
  }
  return out;
}

/** The floor area factor a 3×3 world frame gives the floor (signed): the 2×2 block of its top rows seen from above. */
export const floorArea = (W: Mat): number => W[0][0] * W[1][1] - W[0][1] * W[1][0];
