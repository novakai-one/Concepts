// Chapter 21 build (GDD §5.5): project(A, b) via the transpose, a matrix product and your solve.
// The tether planner runs on it. Plain data and maths (no DOM): tests/singular/game-c21.test.ts runs the
// reference in CPython.
import type { BuildDef } from '../../../game/types.ts';
import type { Mat, Vec } from '../../../math/la.ts';
import { crew, projectCase } from './logic.ts';

export const PROJECT = `def project(A, b):
    """Return the point nearest to b among all mixes of the columns of A."""
    At = transpose(A)
    M = [row + [y] for row, y in zip(matmul(At, A), matvec(At, b))]
    weights = solve(M)['point']
    return matvec(A, weights)
`;

export const PROJECT_TESTS = [
  { name: 'the hatch: `project([[1, 0], [0, 1], [1, 1]], [1, 1, 0])` is `[1/3, 1/3, 2/3]`', args: [[[1, 0], [0, 1], [1, 1]], [1, 1, 0]], expect: [1 / 3, 1 / 3, 2 / 3] },
  { name: 'onto a line: `project([[1], [2]], [3, 1])` is `[1, 2]`', args: [[[1], [2]], [3, 1]], expect: [1, 2] },
  { name: 'the hard case: arrows (1, 1, 0) and (0, 1, 1), b = (1, 2, 3)', args: [[[1, 0], [1, 1], [0, 1]], [1, 2, 3]], expect: [1 / 3, 8 / 3, 7 / 3] },
  { name: 'perpendicular arrows: the shadows add, `[2, 2, 2]`', args: [[[1, 0], [1, 0], [0, 1]], [3, 1, 2]], expect: [2, 2, 2] },
  { name: 'a point already on the plane stays put', args: [[[1, 0], [0, 1], [1, 1]], [2, 3, 5]], expect: [2, 3, 5] },
  { name: 'a point straight out of the plane lands on the origin', args: [[[1, 0], [0, 1], [1, 1]], [1, 1, -1]], expect: [0, 0, 0] },
];

export const buildProject: BuildDef = {
  id: 'c21-project', fn: 'project', title: 'The nearest point we can reach',
  brief: 'Write `project(A, b)`. The columns of `A` span a plane (or a line) through the origin; return the point of it nearest to `b`.\n\nThe leftover `b − A x` must read 0 against every column, so the weights `x` solve $A^{\\mathsf T}A\\,\\mathbf x = A^{\\mathsf T}\\mathbf b$. Build that system as an augmented matrix with your `transpose`, `matmul` and `matvec`, use your `solve`, and return `A` times the weights.',
  starter: 'def project(A, b):\n    """Return the point nearest to b among all mixes of the columns of A."""\n    At = transpose(A)\n    # the weights solve (At A) x = At b\n    return b\n',
  fill: 'def project(A, b):\n    """Return the point nearest to b among all mixes of the columns of A."""\n    At = transpose(___)\n    M = [row + [y] for row, y in zip(matmul(At, ___), matvec(At, ___))]\n    weights = solve(M)[___]\n    return matvec(A, weights)\n',
  solution: PROJECT,
  assemble: { lines: PROJECT.trimEnd().split('\n'), decoys: ['    return weights', '    M = [row + [y] for row, y in zip(matmul(A, At), b)]'] },
  uses: ['transpose', 'matmul', 'matvec', 'solve'],
  tests: PROJECT_TESTS,
  swarm: { gen: (r, d) => projectCase(r, d), crew: (A, b) => crew.project(A as Mat, b as Vec), tol: 1e-6 },
  docPrompt: 'Why does solving Aᵀ A x = Aᵀ b give the nearest point? Write it the way you would tell Bram.',
  ilseNote: 'project(A, b): the nearest point is A x̂, where the leftover b − A x̂ reads 0 against every column. Written as one system that is Aᵀ A x̂ = Aᵀ b. With square, unit columns Aᵀ A is the identity and the weights are plain dot products.',
  payoff: 'The tether planner finds the nearest point of our plane to the hatch with your `project`.',
};
