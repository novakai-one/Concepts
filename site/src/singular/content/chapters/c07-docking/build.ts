// Chapter 7 builds (GDD §5.5): ray_plane and dist_to_plane. Python on plain lists; both call the
// player's `dot` (Chapter 4), and dist_to_plane calls `length` (Chapters 1 and 4).
import type { BuildDef } from '../../../game/types';
import { rint } from '../../../game/lawcheck';
import { crew, swarmVec } from './logic';

/** Swarm planes: a normal that is never the zero arrow, and a whole-number k. */
const swarmNormal = (r: () => number, wide: boolean): number[] => {
  let n: number[];
  do { n = swarmVec(r, wide); } while (n.every((x) => x === 0));
  return n;
};

export const buildRayPlane: BuildDef = {
  id: 'c07-ray-plane', fn: 'ray_plane', title: 'Where does a path meet a plane?',
  brief: 'Write `ray_plane(p, d, n, k)`. The path is $\\mathbf p + t\\mathbf d$; the plane is $\\mathbf n\\cdot X = k$. Return the $t$ where they meet.\n\nSubstitute the path into the plane: $\\mathbf n\\cdot\\mathbf p + t\\,(\\mathbf n\\cdot\\mathbf d) = k$. If $\\mathbf n\\cdot\\mathbf d$ is 0 the path runs alongside the plane: return `None` (no single hit). Treat anything closer to 0 than `1e-12` as 0. Your `dot` is available.',
  starter: 'def ray_plane(p, d, n, k):\n    """Return t where the path p + t d meets the plane n . X = k, or None."""\n    # substitute the path into the plane and solve for t\n    return None\n',
  fill: 'def ray_plane(p, d, n, k):\n    """Return t where the path p + t d meets the plane n . X = k, or None."""\n    den = dot(n, d)\n    if abs(den) < 1e-12:\n        return ___\n    return (___ - dot(n, p)) / ___\n',
  solution: 'def ray_plane(p, d, n, k):\n    """Return t where the path p + t d meets the plane n . X = k, or None."""\n    den = dot(n, d)\n    if abs(den) < 1e-12:\n        return None\n    return (k - dot(n, p)) / den\n',
  assemble: {
    lines: [
      'def ray_plane(p, d, n, k):', '    """Return t where the path p + t d meets the plane n . X = k, or None."""',
      '    den = dot(n, d)', '    if abs(den) < 1e-12:', '        return None', '    return (k - dot(n, p)) / den',
    ],
    decoys: ['    return (k - dot(n, p)) / dot(n, n)', '    return k / den'],
  },
  uses: ['dot'],
  tests: [
    { name: 'from the origin along (1, 2, 3) to the door: t = 1/3', args: [[0, 0, 0], [1, 2, 3], [6, 3, 2], 6], expect: 1 / 3, tol: 1e-9 },
    { name: 'from the path start, straight in along −n: t = 1/3', args: [[7 / 3, 5 / 3, 5 / 3], [-6, -3, -2], [6, 3, 2], 6], expect: 1 / 3, tol: 1e-9 },
    { name: 'alongside the plane: no single hit', args: [[2, 2, 2], [1, -2, 0], [6, 3, 2], 6], expect: null },
    { name: 'a plane behind us gives a negative t', args: [[0, 0, 5], [0, 0, 1], [0, 0, 1], 2], expect: -3 },
  ],
  swarm: {
    gen: (r, d) => { const w = d === 'commander'; return [swarmVec(r, w), swarmVec(r, w), swarmNormal(r, w), rint(r, -9, 9)]; },
    crew: (p, d, n, k) => crew.rayPlane(p as number[], d as number[], n as number[], k as number),
    tol: 1e-9,
  },
  docPrompt: 'What does `ray_plane` return, and why does it return None exactly when the direction reads 0 against the normal?',
  ilseNote: 'ray_plane: put p + t d into n . X = k. One unknown, t. n . d = 0 means the path never meets the plane once: it misses it, or lies in it.',
  payoff: 'Clicking the hangar door places the docking marker with your `ray_plane`.',
};

export const buildDistToPlane: BuildDef = {
  id: 'c07-dist-to-plane', fn: 'dist_to_plane', title: 'How far is a point from a plane?',
  brief: 'Write `dist_to_plane(q, n, k)`. It returns how far the point `q` is from the plane $\\mathbf n\\cdot X = k$: the shadow of the gap on the unit normal, $\\dfrac{|\\mathbf n\\cdot\\mathbf q - k|}{\\|\\mathbf n\\|}$.\n\nYour `dot` and `length` are available.',
  starter: 'def dist_to_plane(q, n, k):\n    """Return the distance from the point q to the plane n . X = k."""\n    return 0\n',
  fill: 'def dist_to_plane(q, n, k):\n    """Return the distance from the point q to the plane n . X = k."""\n    return abs(___ - k) / ___\n',
  solution: 'def dist_to_plane(q, n, k):\n    """Return the distance from the point q to the plane n . X = k."""\n    return abs(dot(n, q) - k) / length(n)\n',
  assemble: {
    lines: ['def dist_to_plane(q, n, k):', '    """Return the distance from the point q to the plane n . X = k."""', '    off = dot(n, q) - k', '    return abs(off) / length(n)'],
    decoys: ['    return abs(off)', '    return abs(off) / dot(n, n)'],
  },
  uses: ['dot', 'length'],
  tests: [
    { name: 'the holding point (3, 3, 3) is 27/7 from the door', args: [[3, 3, 3], [6, 3, 2], 6], expect: 27 / 7, tol: 1e-9 },
    { name: 'a corner of the door is on it: 0', args: [[1, 0, 0], [6, 3, 2], 6], expect: 0, tol: 1e-9 },
    { name: 'the origin is 6/7 from the door', args: [[0, 0, 0], [6, 3, 2], 6], expect: 6 / 7, tol: 1e-9 },
    { name: 'below the deck z = 2 counts as a distance too: 5', args: [[1, 1, -3], [0, 0, 1], 2], expect: 5, tol: 1e-9 },
  ],
  swarm: {
    gen: (r, d) => { const w = d === 'commander'; return [swarmVec(r, w), swarmNormal(r, w), rint(r, -9, 9)]; },
    crew: (q, n, k) => crew.distToPlane(q as number[], n as number[], k as number),
    tol: 1e-9,
  },
  docPrompt: 'Why do you divide by the length of the normal, and why the absolute value?',
  ilseNote: 'dist_to_plane: how far off the plane, n . q - k, measured in units of n. Divide by |n| for real distance. Never negative.',
  payoff: 'Door picking also reports how far the approach path starts from the door, with your `dist_to_plane`.',
};
