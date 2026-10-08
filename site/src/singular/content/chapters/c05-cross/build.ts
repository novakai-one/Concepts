// Chapter 5 builds (GDD §5.5): cross, normal, area. Python on plain lists.
import type { BuildDef } from '../../../game/types';
import { crew, swarmVec } from './logic.ts';

export const buildCross: BuildDef = {
  id: 'c05-cross', fn: 'cross', title: 'Straight out of two edges',
  brief: 'Write `cross(v, w)` for two arrows with three parts each. It returns the arrow at a right angle to both, as long as the parallelogram they make:\n\n$(v_2w_3 - v_3w_2,\\ v_3w_1 - v_1w_3,\\ v_1w_2 - v_2w_1)$. In Python the parts are `v[0]`, `v[1]`, `v[2]`.',
  starter: 'def cross(v, w):\n    """Return the arrow at a right angle to v and w, as long as their parallelogram."""\n    # each part skips its own axis\n    return [0, 0, 0]\n',
  fill: 'def cross(v, w):\n    """Return the arrow at a right angle to v and w, as long as their parallelogram."""\n    return [v[1] * w[2] - v[2] * w[1],\n            ___,\n            ___]\n',
  solution: 'def cross(v, w):\n    """Return the arrow at a right angle to v and w, as long as their parallelogram."""\n    return [v[1] * w[2] - v[2] * w[1],\n            v[2] * w[0] - v[0] * w[2],\n            v[0] * w[1] - v[1] * w[0]]\n',
  assemble: {
    lines: ['def cross(v, w):', '    """Return the arrow at a right angle to v and w, as long as their parallelogram."""', '    x = v[1] * w[2] - v[2] * w[1]', '    y = v[2] * w[0] - v[0] * w[2]', '    z = v[0] * w[1] - v[1] * w[0]', '    return [x, y, z]'],
    decoys: ['    y = v[0] * w[2] - v[2] * w[0]', '    return x + y + z'],
  },
  tests: [
    { name: '`cross([2, 0, 0], [1, 3, 0])` is `[0, 0, 6]`', args: [[2, 0, 0], [1, 3, 0]], expect: [0, 0, 6] },
    { name: 'the other order flips it', args: [[1, 3, 0], [2, 0, 0]], expect: [0, 0, -6] },
    { name: '`cross([1, 2, 0], [0, 1, 3])` is `[6, -3, 1]`', args: [[1, 2, 0], [0, 1, 3]], expect: [6, -3, 1] },
    { name: 'parallel edges: `cross([2, 4, 6], [1, 2, 3])` is zero', args: [[2, 4, 6], [1, 2, 3]], expect: [0, 0, 0] },
    { name: 'the grid arrows: `cross([1, 0, 0], [0, 1, 0])` is `[0, 0, 1]`', args: [[1, 0, 0], [0, 1, 0]], expect: [0, 0, 1] },
  ],
  swarm: { gen: (r) => [swarmVec(r), swarmVec(r)], crew: (v, w) => crew.cross(v as number[], w as number[]) },
  docPrompt: 'What does `cross` return, and how could you check that it is at a right angle to both edges?',
  ilseNote: 'cross(v, w): each part skips its own axis. Check it with dot: zero against both.',
  payoff: 'The tumble matcher finds turning axes with your `cross`.',
};

export const buildNormal: BuildDef = {
  id: 'c05-normal', fn: 'normal', title: 'Which way does a triangle face?',
  brief: 'Write `normal(a, b, c)` for a triangle with corners `a`, `b`, `c` (in that order). It returns $(b - a)\\times(c - a)$: the edge arrows from `a`, crossed with your `cross`.\n\nThe order of the corners decides which side the normal points to.',
  starter: 'def normal(a, b, c):\n    """Return the normal of triangle abc: (b - a) cross (c - a)."""\n    ab = [0, 0, 0]  # the edge from a to b\n    ac = [0, 0, 0]  # the edge from a to c\n    return cross(ab, ac)\n',
  fill: 'def normal(a, b, c):\n    """Return the normal of triangle abc: (b - a) cross (c - a)."""\n    ab = [b[i] - a[i] for i in range(3)]\n    ac = ___\n    return cross(___, ___)\n',
  solution: 'def normal(a, b, c):\n    """Return the normal of triangle abc: (b - a) cross (c - a)."""\n    ab = [b[i] - a[i] for i in range(3)]\n    ac = [c[i] - a[i] for i in range(3)]\n    return cross(ab, ac)\n',
  assemble: {
    lines: ['def normal(a, b, c):', '    """Return the normal of triangle abc: (b - a) cross (c - a)."""', '    ab = [b[i] - a[i] for i in range(3)]', '    ac = [c[i] - a[i] for i in range(3)]', '    return cross(ab, ac)'],
    decoys: ['    return cross(b, c)', '    ac = [a[i] - c[i] for i in range(3)]'],
  },
  uses: ['cross'],
  tests: [
    { name: 'the hangar door: `normal([1, 0, 0], [0, 2, 0], [0, 0, 3])` is `[6, 3, 2]`', args: [[1, 0, 0], [0, 2, 0], [0, 0, 3]], expect: [6, 3, 2] },
    { name: 'corners in the other order point the other way', args: [[1, 0, 0], [0, 0, 3], [0, 2, 0]], expect: [-6, -3, -2] },
    { name: 'a floor triangle faces up: `normal([0, 0, 0], [4, 0, 0], [0, 3, 0])`', args: [[0, 0, 0], [4, 0, 0], [0, 3, 0]], expect: [0, 0, 12] },
    { name: 'it does not matter where the triangle sits', args: [[5, 5, 5], [9, 5, 5], [5, 8, 5]], expect: [0, 0, 12] },
  ],
  swarm: { gen: (r) => [swarmVec(r), swarmVec(r), swarmVec(r)], crew: (a, b, c) => crew.normal(a as number[], b as number[], c as number[]) },
  docPrompt: 'Why does the normal use edge arrows from one corner, and not the corners themselves?',
  ilseNote: 'normal(a, b, c) = (b − a) × (c − a). Corners in order; swap two and the hull goes dark.',
  payoff: 'Hull lighting: every triangle of the *Meridian* gets its normal from your `normal`.',
};

export const buildArea: BuildDef = {
  id: 'c05-area', fn: 'area', title: 'How big is a triangle?',
  brief: 'Write `area(a, b, c)`: the area of the triangle with corners `a`, `b`, `c`. It is **half** the length of its normal: $\\tfrac12\\|(b - a)\\times(c - a)\\|$. Your `normal` and `length` are available.',
  starter: 'def area(a, b, c):\n    """Return the area of triangle abc."""\n    return 0\n',
  fill: 'def area(a, b, c):\n    """Return the area of triangle abc."""\n    return ___ * length(___)\n',
  solution: 'def area(a, b, c):\n    """Return the area of triangle abc."""\n    return 0.5 * length(normal(a, b, c))\n',
  assemble: {
    lines: ['def area(a, b, c):', '    """Return the area of triangle abc."""', '    return 0.5 * length(normal(a, b, c))'],
    decoys: ['    return length(normal(a, b, c))'],
  },
  uses: ['dot', 'length', 'cross', 'normal'],
  tests: [
    { name: 'the hangar door: `area([1, 0, 0], [0, 2, 0], [0, 0, 3])` is 3.5', args: [[1, 0, 0], [0, 2, 0], [0, 0, 3]], expect: 3.5 },
    { name: 'a right triangle with sides 4 and 3 has area 6', args: [[0, 0, 0], [4, 0, 0], [0, 3, 0]], expect: 6 },
    { name: 'three points on one line have no area', args: [[0, 0, 0], [1, 1, 1], [2, 2, 2]], expect: 0 },
    { name: 'the order of the corners does not change the area', args: [[1, 0, 0], [0, 0, 3], [0, 2, 0]], expect: 3.5 },
  ],
  swarm: { gen: (r) => [swarmVec(r), swarmVec(r), swarmVec(r)], crew: (a, b, c) => crew.area(a as number[], b as number[], c as number[]), tol: 1e-9 },
  docPrompt: 'Why is a triangle\'s area half the length of its normal?',
  ilseNote: 'area(a, b, c) = ½ |normal|. The parallelogram on two edges, cut in half.',
  payoff: 'The repair crew sizes hull patches with your `area`.',
};
