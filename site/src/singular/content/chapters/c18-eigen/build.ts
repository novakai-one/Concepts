// Chapter 18 builds (GDD §5.5): eig2 (eigenvalues from the trace and determinant; a complex pair as size and
// angle) and power_iteration (apply, rescale, repeat). Python on plain lists. The line finder runs on
// power_iteration. Plain data and maths (no DOM): tests/singular/game-c18.test.ts runs the references in CPython.
import type { BuildDef } from '../../../game/types.ts';
import type { Mat, Vec } from '../../../math/la.ts';
import { crewEig2, crewPower, eig2Case, powerCase } from './logic.ts';

export const EIG2 = `def eig2(A):
    """Return the eigenvalues of a 2 x 2 matrix from its trace and determinant."""
    (a, b), (c, d) = A
    tr = a + d
    det = a * d - b * c
    disc = tr * tr - 4 * det
    if disc >= 0:
        root = math.sqrt(disc)
        return {'kind': 'real', 'values': [(tr + root) / 2, (tr - root) / 2]}
    stretch = math.sqrt(det)
    angle = math.degrees(math.atan2(math.sqrt(-disc) / 2, tr / 2))
    return {'kind': 'complex', 'stretch': stretch, 'angle': angle}
`;

export const POWER = `def power_iteration(A, x, steps):
    """Apply A to x again and again, rescaling to length 1 each time; return where x settles."""
    for _ in range(steps):
        x = matvec(A, x)
        size = math.sqrt(sum(t * t for t in x))
        x = [t / size for t in x]
    return x
`;

const R2 = Math.SQRT1_2;
export const EIG2_TESTS = [
  { name: '`eig2([[2, 1], [1, 2]])` gives 3 and 1', args: [[[2, 1], [1, 2]]], expect: { kind: 'real', values: [3, 1] } },
  { name: '`eig2([[4, 1], [2, 3]])` gives 5 and 2', args: [[[4, 1], [2, 3]]], expect: { kind: 'real', values: [5, 2] } },
  { name: 'the shear `[[1, 1], [0, 1]]`: 1 twice, `[1, 1]`', args: [[[1, 1], [0, 1]]], expect: { kind: 'real', values: [1, 1] } },
  { name: 'a flip: `eig2([[0, 1], [1, 0]])` gives 1 and -1', args: [[[0, 1], [1, 0]]], expect: { kind: 'real', values: [1, -1] } },
  { name: '`[[1, -1], [1, 1]]`: complex, stretch √2, angle 45', args: [[[1, -1], [1, 1]]], expect: { kind: 'complex', stretch: Math.SQRT2, angle: 45 } },
  { name: 'T = `[[1, -2], [1, -1]]`: complex, stretch 1, angle 90', args: [[[1, -2], [1, -1]]], expect: { kind: 'complex', stretch: 1, angle: 90 } },
];
export const POWER_TESTS = [
  { name: 'one step: `power_iteration([[3, 0], [0, 4]], [1, 1], 1)` is `[0.6, 0.8]`', args: [[[3, 0], [0, 4]], [1, 1], 1], expect: [0.6, 0.8] },
  { name: '`[[2, 1], [1, 2]]` from `[1, 0]` settles on the line through `[1, 1]`', args: [[[2, 1], [1, 2]], [1, 0], 40], expect: [R2, R2] },
  { name: 'the larger λ wins: `[[2, 0], [0, 1]]` from `[1, 1]`', args: [[[2, 0], [0, 1]], [1, 1], 60], expect: [1, 0] },
  { name: '`[[4, 1], [2, 3]]`: λ = 5 along `[1, 1]` beats λ = 2', args: [[[4, 1], [2, 3]], [1, 0], 50], expect: [R2, R2] },
  { name: 'Vell’s V from his cutter: the line through `[1, 1, 1]`', args: [[[37 / 60, 7 / 60, 16 / 60], [7 / 60, 37 / 60, 16 / 60], [16 / 60, 16 / 60, 28 / 60]], [4, 2, 0], 60], expect: [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)] },
];

export const buildEig2: BuildDef = {
  id: 'c18-eig2', fn: 'eig2', title: 'The eigenvalues of a 2 × 2',
  brief: 'Write `eig2(A)` for a 2 × 2 matrix `A = [[a, b], [c, d]]`. Its eigenvalues are the roots of $\\lambda^2 - (a + d)\\lambda + (ad - bc) = 0$: the trace and the determinant are all you need.\n\n- Two real roots (the part under the square root is 0 or more): return `{\'kind\': \'real\', \'values\': [larger, smaller]}`.\n- No real root: the pair is $\\lambda = p \\pm qi$. Return `{\'kind\': \'complex\', \'stretch\': ..., \'angle\': ...}`: `stretch` is the size $|\\lambda| = \\sqrt{p^2 + q^2}$ (that is $\\sqrt{\\det}$), and `angle` is `atan2(q, p)` in degrees.',
  starter: 'def eig2(A):\n    """Return the eigenvalues of a 2 x 2 matrix from its trace and determinant."""\n    (a, b), (c, d) = A\n    tr = a + d\n    det = a * d - b * c\n    # the roots of lam**2 - tr*lam + det = 0\n    return None\n',
  fill: 'def eig2(A):\n    """Return the eigenvalues of a 2 x 2 matrix from its trace and determinant."""\n    (a, b), (c, d) = A\n    tr = a + d\n    det = a * d - b * c\n    disc = ___\n    if disc >= 0:\n        root = math.sqrt(disc)\n        return {\'kind\': \'real\', \'values\': [___, ___]}\n    stretch = ___\n    angle = math.degrees(math.atan2(math.sqrt(-disc) / 2, tr / 2))\n    return {\'kind\': \'complex\', \'stretch\': stretch, \'angle\': angle}\n',
  solution: EIG2,
  assemble: { lines: EIG2.trimEnd().split('\n'), decoys: ['    disc = tr * tr - det', '    stretch = det'] },
  tests: EIG2_TESTS,
  swarm: { gen: (r, d) => eig2Case(r, d), crew: (A) => crewEig2(A as Mat), tol: 1e-6 },
  docPrompt: 'Why are the eigenvalues the roots of λ² − (trace)λ + det? Write it in your own words.',
  ilseNote: 'eig2(A): det(A − λI) = λ² − (a + d)λ + (ad − bc). Real roots are eigenvalues, each with its line. A negative discriminant means a turn: the size of p + qi is the stretch, its angle is the turn.',
  payoff: 'Chapter 19’s `diagonalise2` takes its eigenvalues from your `eig2`.',
};

export const buildPower: BuildDef = {
  id: 'c18-power', fn: 'power_iteration', title: 'Repeat until the vector settles',
  brief: 'Write `power_iteration(A, x, steps)`. Apply `A` to `x`, then rescale the result to length 1. Do that `steps` times and return the final `x`.\n\nThe part along the eigenvector with the largest $|\\lambda|$ grows fastest, so `x` swings onto that line. Your `matvec` is available.',
  starter: 'def power_iteration(A, x, steps):\n    """Apply A to x again and again, rescaling to length 1 each time; return where x settles."""\n    for _ in range(steps):\n        # apply A, then rescale to length 1\n        pass\n    return x\n',
  fill: 'def power_iteration(A, x, steps):\n    """Apply A to x again and again, rescaling to length 1 each time; return where x settles."""\n    for _ in range(steps):\n        x = ___\n        size = math.sqrt(sum(___ for t in x))\n        x = [___ for t in x]\n    return x\n',
  solution: POWER,
  assemble: { lines: POWER.trimEnd().split('\n'), decoys: ['        x = [t / steps for t in x]', '        size = sum(x)'] },
  uses: ['matvec'],
  tests: POWER_TESTS,
  swarm: { gen: (r, d) => powerCase(r, d), crew: (A, x, n) => crewPower(A as Mat, x as Vec, n as number), tol: 1e-6 },
  docPrompt: 'Why does repeating and rescaling swing almost any vector (any with a part on that line) onto the line with the largest |λ|?',
  ilseNote: 'power_iteration: each step multiplies the part on each line by its λ. After many steps the largest |λ| has outgrown the rest, and rescaling keeps the numbers from running away.',
  payoff: 'The line finder runs on your `power_iteration` (and later, the drone allocation).',
};
