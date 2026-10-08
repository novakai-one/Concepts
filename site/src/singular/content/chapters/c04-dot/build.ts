// Chapter 4 builds (GDD §5.5): dot, length rewritten on dot, angle, shadow. Python on plain lists.
import type { BuildDef } from '../../../game/types';
import { crew, swarmVec } from './logic.ts';

export const buildDot: BuildDef = {
  id: 'c04-dot', fn: 'dot', title: 'How much do two arrows point the same way?',
  brief: 'Write `dot(v, w)`. Multiply matching parts and add them up. It returns **one number**.\n\n`v` and `w` are lists of the same length, such as `[3, 1]` and `[2, 4]`.',
  starter: 'def dot(v, w):\n    """Return the dot product of v and w: multiply matching parts and add."""\n    total = 0\n    # add v[i] * w[i] for every i\n    return total\n',
  fill: 'def dot(v, w):\n    """Return the dot product of v and w: multiply matching parts and add."""\n    total = ___\n    for i in range(len(v)):\n        total += ___\n    return total\n',
  solution: 'def dot(v, w):\n    """Return the dot product of v and w: multiply matching parts and add."""\n    total = 0\n    for i in range(len(v)):\n        total += v[i] * w[i]\n    return total\n',
  assemble: {
    lines: ['def dot(v, w):', '    """Return the dot product of v and w: multiply matching parts and add."""', '    total = 0', '    for i in range(len(v)):', '        total += v[i] * w[i]', '    return total'],
    decoys: ['        total += v[i] * w[0]', '    return [v[i] * w[i] for i in range(len(v))]'],
  },
  tests: [
    { name: '`dot([3, 1], [2, 4])` is 10', args: [[3, 1], [2, 4]], expect: 10 },
    { name: 'a right angle reads 0: `dot([2, -1], [2, 4])`', args: [[2, -1], [2, 4]], expect: 0 },
    { name: 'pointing apart is negative: `dot([-1, 0], [3, 4])`', args: [[-1, 0], [3, 4]], expect: -3 },
    { name: 'three parts: `dot([1, 1, 0], [1, 0, 1])` is 1', args: [[1, 1, 0], [1, 0, 1]], expect: 1 },
    { name: 'the zero vector reads 0', args: [[0, 0, 0], [5, -2, 7]], expect: 0 },
  ],
  swarm: { gen: (r, d) => { const n = d === 'cadet' ? 2 : 3; return [swarmVec(r, n), swarmVec(r, n)]; }, crew: (v, w) => crew.dot(v as number[], w as number[]) },
  docPrompt: 'What question does `dot` answer, and why does multiplying matching parts and adding answer it? Write it the way you would tell Bram.',
  ilseNote: 'dot(v, w): how much v points along w. Shadow of v on the line of w, times the length of w. Zero at a right angle.',
  payoff: 'The beacon matcher ranks signatures with your `dot`.',
};

export const buildLength: BuildDef = {
  id: 'c04-length', fn: 'length', title: 'Rewrite length with dot',
  brief: 'You wrote `length(v)` in Chapter 1. Rewrite it so it calls your `dot`: the length squared of an arrow is the arrow\'s dot product with itself, $\\|\\mathbf v\\|^2 = \\mathbf v\\cdot\\mathbf v$.\n\n`dot` and `math.sqrt` are available.',
  starter: 'def length(v):\n    """Return the length of vector v, using dot."""\n    # the length squared is dot(v, v)\n    return 0\n',
  fill: 'def length(v):\n    """Return the length of vector v, using dot."""\n    return math.sqrt(dot(___, ___))\n',
  solution: 'def length(v):\n    """Return the length of vector v, using dot."""\n    return math.sqrt(dot(v, v))\n',
  assemble: {
    lines: ['def length(v):', '    """Return the length of vector v, using dot."""', '    return math.sqrt(dot(v, v))'],
    decoys: ['    return dot(v, v)', '    return math.sqrt(dot(v, [1] * len(v)))'],
  },
  uses: ['dot'],
  tests: [
    { name: '`length([3, 4])` is 5', args: [[3, 4]], expect: 5 },
    { name: 'three parts: `length([2, 3, 6])` is 7', args: [[2, 3, 6]], expect: 7 },
    { name: 'negative parts: `length([-1, -1, 0])` is √2', args: [[-1, -1, 0]], expect: Math.SQRT2, tol: 1e-9 },
    { name: 'the zero vector has length 0', args: [[0, 0]], expect: 0 },
  ],
  swarm: { gen: (r) => [swarmVec(r, 3)], crew: (v) => crew.length(v as number[]), tol: 1e-9 },
  docPrompt: 'Why is the length of an arrow the square root of its dot product with itself?',
  ilseNote: 'length(v) = sqrt(dot(v, v)). Each part times itself, added: Pythagoras, as a dot product.',
  payoff: 'Every distance readout now goes through your `dot`.',
};

export const buildAngle: BuildDef = {
  id: 'c04-angle', fn: 'angle', title: 'The angle between two arrows',
  brief: 'Write `angle(v, w)`. It returns the angle between `v` and `w` **in degrees**, from 0 to 180.\n\n$\\cos\\theta = \\dfrac{\\mathbf v\\cdot\\mathbf w}{\\|\\mathbf v\\|\\|\\mathbf w\\|}$. Use your `dot` and `length`, then `math.acos` and `math.degrees`. Rounding can push the cosine a hair past 1, so keep it between −1 and 1 first.',
  starter: 'def angle(v, w):\n    """Return the angle between v and w in degrees."""\n    c = 0  # the cosine: dot over both lengths\n    c = max(-1, min(1, c))\n    return math.degrees(math.acos(c))\n',
  fill: 'def angle(v, w):\n    """Return the angle between v and w in degrees."""\n    c = dot(v, w) / (___ * ___)\n    c = max(-1, min(1, c))\n    return math.degrees(math.acos(c))\n',
  solution: 'def angle(v, w):\n    """Return the angle between v and w in degrees."""\n    c = dot(v, w) / (length(v) * length(w))\n    c = max(-1, min(1, c))\n    return math.degrees(math.acos(c))\n',
  assemble: {
    lines: ['def angle(v, w):', '    """Return the angle between v and w in degrees."""', '    c = dot(v, w) / (length(v) * length(w))', '    c = max(-1, min(1, c))', '    return math.degrees(math.acos(c))'],
    decoys: ['    c = dot(v, w) / length(w)'],
  },
  uses: ['dot', 'length'],
  tests: [
    { name: 'heading and spine: `angle([1, 1, 0], [1, 0, 1])` is 60', args: [[1, 1, 0], [1, 0, 1]], expect: 60, tol: 1e-6 },
    { name: 'a right angle: `angle([2, -1], [2, 4])` is 90', args: [[2, -1], [2, 4]], expect: 90, tol: 1e-6 },
    { name: 'the same direction: `angle([3, 4], [6, 8])` is 0', args: [[3, 4], [6, 8]], expect: 0, tol: 1e-6 },
    { name: 'opposite: `angle([1, 0], [-2, 0])` is 180', args: [[1, 0], [-2, 0]], expect: 180, tol: 1e-6 },
    { name: '`angle([3, 1], [1, 2])` is 45', args: [[3, 1], [1, 2]], expect: 45, tol: 1e-6 },
  ],
  swarm: { gen: (r) => [swarmVec(r, 3, -6, 6, true), swarmVec(r, 3, -6, 6, true)], crew: (v, w) => crew.angle(v as number[], w as number[]), tol: 1e-6 },
  docPrompt: 'Why does dividing the dot product by both lengths leave only the angle?',
  ilseNote: 'angle(v, w): acos of dot over both lengths. Clamp first: 1.0000000002 has no arccosine.',
  payoff: 'The heading planner reports turns with your `angle`.',
};

export const buildShadow: BuildDef = {
  id: 'c04-shadow', fn: 'shadow', title: 'Cast a shadow',
  brief: 'Write `shadow(v, u)`. It returns the shadow of `v` on the line through `u`: the arrow $\\dfrac{\\mathbf v\\cdot\\mathbf u}{\\mathbf u\\cdot\\mathbf u}\\,\\mathbf u$.\n\nDivide by `dot(u, u)`, not by `length(u)`.',
  starter: 'def shadow(v, u):\n    """Return the shadow of v on the line through u."""\n    c = 0  # how many u\'s long the shadow is\n    return [c * x for x in u]\n',
  fill: 'def shadow(v, u):\n    """Return the shadow of v on the line through u."""\n    c = dot(v, u) / ___\n    return [___ for x in u]\n',
  solution: 'def shadow(v, u):\n    """Return the shadow of v on the line through u."""\n    c = dot(v, u) / dot(u, u)\n    return [c * x for x in u]\n',
  assemble: {
    lines: ['def shadow(v, u):', '    """Return the shadow of v on the line through u."""', '    c = dot(v, u) / dot(u, u)', '    return [c * x for x in u]'],
    decoys: ['    c = dot(v, u) / length(u)'],
  },
  uses: ['dot', 'length'],
  tests: [
    { name: '`shadow([3, 4], [2, 1])` is `[4, 2]`', args: [[3, 4], [2, 1]], expect: [4, 2] },
    { name: 'a right angle casts no shadow: `shadow([2, -1], [2, 4])`', args: [[2, -1], [2, 4]], expect: [0, 0] },
    { name: 'the line, not the arrow: `shadow([3, 4], [-2, -1])` is `[4, 2]`', args: [[3, 4], [-2, -1]], expect: [4, 2] },
    { name: 'three parts: `shadow([1, 2, 3], [0, 0, 2])` is `[0, 0, 3]`', args: [[1, 2, 3], [0, 0, 2]], expect: [0, 0, 3] },
  ],
  swarm: { gen: (r) => [swarmVec(r, 3), swarmVec(r, 3, -6, 6, true)], crew: (v, u) => crew.shadow(v as number[], u as number[]), tol: 1e-9 },
  docPrompt: 'Why does the formula divide by u · u and not by the length of u?',
  ilseNote: 'shadow(v, u) = (v·u / u·u) u. Once to get the shadow length, once more to make u a unit direction.',
  payoff: 'The tether planner uses your `shadow` for the closest point on a line.',
};
