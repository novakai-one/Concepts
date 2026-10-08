// Chapter 23 build (GDD §5.5): least_squares(A, b) through the normal equations. The Collapse fit and its
// residual plot run on it: the knock appears in the player's own residuals.
// Plain data and maths (no DOM): tests/singular/game-c23.test.ts runs the reference in CPython.
import type { BuildDef } from '../../../game/types.ts';
import type { Mat, Vec } from '../../../math/la.ts';
import { crew, lsCase } from './logic.ts';

export const LEAST_SQUARES = `def least_squares(A, b):
    """Return the weights x whose mix of the columns of A lands nearest to b."""
    At = transpose(A)
    M = [row + [y] for row, y in zip(matmul(At, A), matvec(At, b))]
    return solve(M)['point']
`;

export const LS_TESTS = [
  { name: 'four readings 1, 2, 2, 4 at t = 0..3: the line `[0.9, 0.9]`', args: [[[1, 0], [1, 1], [1, 2], [1, 3]], [1, 2, 2, 4]], expect: [0.9, 0.9] },
  { name: 'five readings by hand: `[1.4, 0.8]`', args: [[[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]], [1, 3, 2, 5, 4]], expect: [1.4, 0.8] },
  { name: 'the twin view: readings 1, 2, 4 give `[5/6, 3/2]`', args: [[[1, 0], [1, 1], [1, 2]], [1, 2, 4]], expect: [5 / 6, 3 / 2] },
  { name: 'readings on a line give that line back exactly', args: [[[1, 0], [1, 1], [1, 2]], [3, 1, -1]], expect: [3, -2] },
  { name: 'one unknown: the best multiple of (1, 2) for (3, 1) is 1', args: [[[1], [2]], [3, 1]], expect: [1] },
  { name: 'a square system with an answer: the answer itself', args: [[[2, 1], [1, 3]], [3, 5]], expect: [0.8, 1.4] },
];

export const buildLeastSquares: BuildDef = {
  id: 'c23-least-squares', fn: 'least_squares', title: 'The answer that is wrong by the least',
  brief: 'Write `least_squares(A, b)`. There are more readings (rows) than unknowns, so `A x = b` usually has no answer. Return the weights `x` that make `A x` the nearest point to `b`.\n\nThe leftover `b − A x` must read 0 against every column: $A^{\\mathsf T}A\\,\\mathbf x = A^{\\mathsf T}\\mathbf b$, the normal equations. Build that augmented matrix with your `transpose`, `matmul` and `matvec`, and use your `solve`. (On Write you may solve through your `qr` instead: $R\\mathbf x = Q^{\\mathsf T}\\mathbf b$.)',
  starter: 'def least_squares(A, b):\n    """Return the weights x whose mix of the columns of A lands nearest to b."""\n    At = transpose(A)\n    # solve (At A) x = At b\n    return []\n',
  fill: 'def least_squares(A, b):\n    """Return the weights x whose mix of the columns of A lands nearest to b."""\n    At = transpose(___)\n    M = [row + [y] for row, y in zip(matmul(At, ___), matvec(At, ___))]\n    return solve(M)[___]\n',
  solution: LEAST_SQUARES,
  assemble: { lines: LEAST_SQUARES.trimEnd().split('\n'), decoys: ['    M = [row + [y] for row, y in zip(A, b)]', '    return solve(M)'] },
  uses: ['transpose', 'matmul', 'matvec', 'solve', 'qr'],
  tests: LS_TESTS,
  swarm: { gen: (r, d) => lsCase(r, d), crew: (A, b) => crew.least_squares(A as Mat, b as Vec), tol: 1e-6 },
  docPrompt: 'Why does solving Aᵀ A x = Aᵀ b give the weights that are wrong by the least? Write it the way you would tell Bram.',
  ilseNote: 'least_squares(A, b): the nearest point of the column space to b is A x̂, and its leftover is perpendicular to every column, so Aᵀ(b − A x̂) = 0. I wrote it that way for years. When the columns point almost the same way, QR loses only about half as many digits.',
  payoff: 'The Collapse fit, and the plot of what it leaves over, run on your `least_squares`.',
};
