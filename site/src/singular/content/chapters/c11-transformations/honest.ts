// Honest in-between frames for a move of the plane (GDD §9.3, §11.3). Pure maths, no DOM or three,
// so the unit tests can run it in Node. Shared by Chapters 11 and 12.
//
// A 2×2 move S is played from the identity in stages that never show a flattening S does not have:
//   det S ≥ 0: one smooth stage, M(t) = R(tθ)·((1 − t)I + t·Y), where S = R(θ)·Y is the polar split
//              (Y symmetric, never negative). det M(t) > 0 for every t < 1.
//   det S < 0: S = Q·Y with Q a mirror flip. First the smooth stage (1 − t)I + t·Y, then Q as a
//              half-turn through 3-D about its mirror line (a flip has no flat in-between).
// The routine pulse plays as P R(θ) P⁻¹ (truth.ts Tpartial), determinant 1 at every frame.
import { det, identity, matMul, type Mat, type Vec } from '../../../math/la.ts';
import { P, Pinv, P2, P2inv } from '../../truth.ts';

export type Stage2 =
  | { kind: 'smooth'; theta: number; Y: Mat }
  | { kind: 'flip'; u: [number, number]; Q: Mat };

const rot = (t: number): Mat => [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]];
const lerpI = (Y: Mat, t: number): Mat => [[1 - t + t * Y[0][0], t * Y[0][1]], [t * Y[1][0], 1 - t + t * Y[1][1]]];

/** The stages that play S (2×2) from the identity. */
export function plan2(S: Mat): Stage2[] {
  const [[a, b], [c, d]] = S;
  if (det(S) >= -1e-12) {
    const theta = (Math.abs(c - b) < 1e-12 && Math.abs(a + d) < 1e-12) ? 0 : Math.atan2(c - b, a + d);
    const Y = matMul(rot(-theta), S);
    return [{ kind: 'smooth', theta, Y: symmetrise(Y) }];
  }
  // S = Q·Y, Q = [[cos φ, sin φ], [sin φ, −cos φ]] (mirror line at angle φ/2), Y = Q·S symmetric positive
  const phi = Math.atan2(b + c, a - d);
  const Q: Mat = [[Math.cos(phi), Math.sin(phi)], [Math.sin(phi), -Math.cos(phi)]];
  const Y = symmetrise(matMul(Q, S));
  const stages: Stage2[] = [];
  if (!isIdentity(Y)) stages.push({ kind: 'smooth', theta: 0, Y });
  stages.push({ kind: 'flip', u: [Math.cos(phi / 2), Math.sin(phi / 2)], Q });
  return stages;
}

const symmetrise = (Y: Mat): Mat => { const m = (Y[0][1] + Y[1][0]) / 2; return [[Y[0][0], m], [m, Y[1][1]]]; };
const isIdentity = (Y: Mat): boolean => Math.abs(Y[0][0] - 1) + Math.abs(Y[1][1] - 1) + Math.abs(Y[0][1]) + Math.abs(Y[1][0]) < 1e-9;

/** A smooth stage at time t (0..1), as a 2×2. */
export function smoothAt(s: Extract<Stage2, { kind: 'smooth' }>, t: number): Mat {
  return matMul(rot(s.theta * t), lerpI(s.Y, t));
}

/** The 2×2 that a whole stage ends on. */
export function stageEnd(s: Stage2): Mat { return s.kind === 'smooth' ? smoothAt(s, 1) : s.Q; }

/** A turn by angle `ang` about the unit axis u through the origin (3×3, Rodrigues). */
export function rot3(u: Vec, ang: number): Mat {
  const [x, y, z] = u, c = Math.cos(ang), s = Math.sin(ang), k = 1 - c;
  return [
    [c + x * x * k, x * y * k - z * s, x * z * k + y * s],
    [y * x * k + z * s, c + y * y * k, y * z * k - x * s],
    [z * x * k - y * s, z * y * k + x * s, c + z * z * k],
  ];
}

/** A 2×2 as a 3×3 acting on the floor (z untouched). */
export const embed = (M: Mat): Mat => [[M[0][0], M[0][1], 0], [M[1][0], M[1][1], 0], [0, 0, 1]];

/** A flip stage partway (φ from 0 to π): the half-turn about the mirror line, after M0. */
export function flipAt(s: Extract<Stage2, { kind: 'flip' }>, k: number, M0: Mat): Mat {
  return matMul(rot3([s.u[0], s.u[1], 0], Math.PI * k), embed(M0));
}

/** Every frame of S applied after M0, sampled (for tests): 3×3 world matrices. */
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

/** The routine pulse in 3-D partway (t from 0 to 1): P · (R(tπ/2) with heights × (1 − 0.2t)) · P⁻¹. */
export function T3partial(t: number, heightTo = 0.8): Mat {
  const th = (t * Math.PI) / 2, h = 1 + (heightTo - 1) * t;
  const mid: Mat = [[Math.cos(th), -Math.sin(th), 0], [Math.sin(th), Math.cos(th), 0], [0, 0, h]];
  return matMul(matMul(P, mid), Pinv);
}

/** The routine pulse (2-D ground layer) partway: P R(θ) P⁻¹, θ = tπ/2. Same as truth.Tpartial. */
export const T2partial = (t: number): Mat => matMul(matMul(P2, rot((t * Math.PI) / 2)), P2inv);
