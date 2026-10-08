// Chapter 6 builds (GDD §5.5): triple and coplanar. Python on plain lists. `triple` calls the
// player's `cross` (Chapter 5) and `dot` (Chapter 4); `coplanar` calls `triple`.
import type { BuildDef } from '../../../game/types';
import { crew, swarmPoints, swarmVec } from './logic';

export const buildTriple: BuildDef = {
  id: 'c06-triple', fn: 'triple', title: 'How much space do three struts enclose?',
  brief: 'Write `triple(a, b, c)`. It returns $\\mathbf a\\cdot(\\mathbf b\\times\\mathbf c)$: the volume of the box on the three arrows, with a sign for which way round they are.\n\nYour `cross` and `dot` are available. Cross two, dot with the third.',
  starter: 'def triple(a, b, c):\n    """Return a . (b x c): the signed volume of the box on a, b, c."""\n    # cross b with c, then dot the result with a\n    return 0\n',
  fill: 'def triple(a, b, c):\n    """Return a . (b x c): the signed volume of the box on a, b, c."""\n    return dot(___, cross(___, ___))\n',
  solution: 'def triple(a, b, c):\n    """Return a . (b x c): the signed volume of the box on a, b, c."""\n    return dot(a, cross(b, c))\n',
  assemble: {
    lines: ['def triple(a, b, c):', '    """Return a . (b x c): the signed volume of the box on a, b, c."""', '    n = cross(b, c)', '    return dot(a, n)'],
    decoys: ['    return dot(a, b) * dot(b, c)', '    return abs(dot(a, n))'],
  },
  uses: ['cross', 'dot'],
  tests: [
    { name: 'the leaned box holds 24: `triple([2, 0, 0], [1, 3, 0], [1, 1, 4])`', args: [[2, 0, 0], [1, 3, 0], [1, 1, 4]], expect: 24 },
    { name: 'Section C is flat: `triple([2, 1, 0], [0, 1, 2], [1, 1, 1])` is 0', args: [[2, 1, 0], [0, 1, 2], [1, 1, 1]], expect: 0 },
    { name: 'swapped order flips the sign: node 7 logs −24', args: [[1, 3, 0], [2, 0, 0], [1, 1, 4]], expect: -24 },
    { name: 'the unit cube: `triple([1, 0, 0], [0, 1, 0], [0, 0, 1])` is 1', args: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], expect: 1 },
    { name: 'a zero strut gives 0', args: [[0, 0, 0], [1, 2, 3], [3, 1, 2]], expect: 0 },
  ],
  swarm: { gen: (r, d) => [swarmVec(r, d === 'commander'), swarmVec(r, d === 'commander'), swarmVec(r, d === 'commander')], crew: (a, b, c) => crew.triple(a as number[], b as number[], c as number[]) },
  docPrompt: 'What question does `triple` answer, and why does crossing two arrows and dotting with the third answer it? Write it the way you would tell Bram.',
  ilseNote: 'triple(a, b, c) = a . (b x c). Base area |b x c| times the height of a above that base. The sign says which way round. Zero: flat.',
  payoff: 'The strut scan reads every hull node with your `triple`.',
};

export const buildCoplanar: BuildDef = {
  id: 'c06-coplanar', fn: 'coplanar', title: 'Do four points lie on one plane?',
  brief: 'Write `coplanar(p, q, r, s)`. It returns `True` when the four points lie on one plane.\n\nUse the **edge arrows from p**: $q - p$, $r - p$, $s - p$. They lie in one plane exactly when `triple` of them is 0. Rounding can leave a tiny number, so treat anything closer to 0 than `1e-9` as 0.',
  starter: 'def coplanar(p, q, r, s):\n    """Return True when the points p, q, r, s lie on one plane."""\n    # the edge arrows from p, then triple\n    return False\n',
  fill: 'def coplanar(p, q, r, s):\n    """Return True when the points p, q, r, s lie on one plane."""\n    e1 = [q[i] - p[i] for i in range(3)]\n    e2 = [r[i] - p[i] for i in range(3)]\n    e3 = [___ for i in range(3)]\n    return abs(triple(___, ___, ___)) < 1e-9\n',
  solution: 'def coplanar(p, q, r, s):\n    """Return True when the points p, q, r, s lie on one plane."""\n    e1 = [q[i] - p[i] for i in range(3)]\n    e2 = [r[i] - p[i] for i in range(3)]\n    e3 = [s[i] - p[i] for i in range(3)]\n    return abs(triple(e1, e2, e3)) < 1e-9\n',
  assemble: {
    lines: [
      'def coplanar(p, q, r, s):', '    """Return True when the points p, q, r, s lie on one plane."""',
      '    e1 = [q[i] - p[i] for i in range(3)]', '    e2 = [r[i] - p[i] for i in range(3)]', '    e3 = [s[i] - p[i] for i in range(3)]',
      '    return abs(triple(e1, e2, e3)) < 1e-9',
    ],
    decoys: ['    return abs(triple(q, r, s)) < 1e-9'],
  },
  uses: ['cross', 'dot', 'triple'],
  tests: [
    { name: 'the four clamps share a plane', args: [[1, 0, 0], [2, 1, 0], [1, 1, 1], [2, 2, 1]], expect: true },
    { name: 'after the strike, S at (2, 2, 3): not one plane', args: [[1, 0, 0], [2, 1, 0], [1, 1, 1], [2, 2, 3]], expect: false },
    { name: 'four corners of the floor', args: [[0, 0, 0], [3, 0, 0], [0, 2, 0], [5, 5, 0]], expect: true },
    { name: 'measured from the origin these would look wrong; from p they share a plane', args: [[1, 1, 1], [2, 1, 1], [1, 2, 1], [4, 7, 1]], expect: true },
  ],
  swarm: { gen: (r, d) => swarmPoints(r, d === 'commander'), crew: (p, q, r, s) => crew.coplanar(p as number[], q as number[], r as number[], s as number[]) },
  docPrompt: 'Why do you measure from one of the four points, and not from the origin?',
  ilseNote: 'coplanar(p, q, r, s): edge arrows from p, then triple. Zero volume, one plane. Never measure from the origin unless the origin is one of the points.',
  payoff: 'The docking clamps are certified with your `coplanar`.',
};
