// Prologue pure logic (no DOM, no three): the numbers behind the two checks. Unit-tested in
// tests/singular/game-c00.test.ts.
import type { V3 } from '../../../core/stage.ts';
import type { Mat } from '../../../math/la.ts';

/** A 2-D matrix applied to a point on the plane (z = 0). */
export const apply = (M: Mat, p: number[]): V3 => [M[0][0] * p[0] + M[0][1] * p[1], M[1][0] * p[0] + M[1][1] * p[1], 0];

/** Pure check: does the line through a and b pass within tol of every target? */
export const lineThrough = (a: V3, b: V3, targets: V3[], tol = 0.08) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy);
  if (L < 0.5) return false;
  return targets.every((t) => Math.abs((t[0] - a[0]) * dy - (t[1] - a[1]) * dx) / L < tol);
};

/** c00-p2: faint copies laid after the step arrow. Four cyan buoys have three gaps: the step and two copies. */
export const STEP_COPIES = 2;

/** The step arrow (from → to) and `n` copies laid head to tail after it, as [tail, tip] pairs. */
export const relayChain = (from: V3, to: V3, n = STEP_COPIES): [V3, V3][] => {
  const v = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const out: [V3, V3][] = [[from, to]];
  let at = to;
  for (let k = 0; k < n; k++) { const nx: V3 = [at[0] + v[0], at[1] + v[1], at[2] + v[2]]; out.push([at, nx]); at = nx; }
  return out;
};

/** c00-p3: only buoys that started this close to the Anchor get a line from where they were. */
export const NEAR_ANCHOR = 3.2;
export const nearAnchor = (q: number[]) => Math.hypot(q[0], q[1]) <= NEAR_ANCHOR;
