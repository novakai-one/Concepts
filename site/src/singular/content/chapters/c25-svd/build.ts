// Chapter 25 builds (GDD §5.5): svd (sym_eigen on AᵀA, then uᵢ = A vᵢ / σᵢ) and low_rank (the sum of the k
// largest layers σ u vᵀ). Python on plain lists. The canonical form makes the swarm comparable: singular values
// largest first, each v with its first non-zero entry positive (sym_eigen does that), u determined by v.
// Show more decimals runs the player's svd; Teo's channel is rebuilt by the player's low_rank.
import type { BuildDef } from '../../../game/types.ts';
import type { Mat } from '../../../math/la.ts';
import { crewLowRank, crewSvd, lowRankCase, svdCase } from './logic.ts';

export const SVD = `def svd(A):
    """Return the u's, the singular values (largest first) and the v's of A."""
    values, vs = sym_eigen(matmul(transpose(A), A))
    sigmas = [math.sqrt(max(lam, 0)) for lam in values]
    us = [[t / s for t in matvec(A, v)] for s, v in zip(sigmas, vs)]
    return us, sigmas, vs
`;

export const LOW_RANK = `def low_rank(A, k):
    """Return the sum of the k largest layers sigma * u v^T of A."""
    us, sigmas, vs = svd(A)
    B = [[0.0] * len(A[0]) for _ in A]
    for u, s, v in zip(us[:k], sigmas[:k], vs[:k]):
        for i in range(len(A)):
            for j in range(len(A[0])):
                B[i][j] += s * u[i] * v[j]
    return B
`;

const R2 = Math.SQRT1_2, R10 = 1 / Math.sqrt(10), R6 = 1 / Math.sqrt(6);

export const SVD_TESTS = [
  { name: 'the test move: `svd([[3, 0], [4, 5]])`: σ = √45, √5; v along (1, 1) and (1, −1); u along (1, 3) and (3, −1)', args: [[[3, 0], [4, 5]]], expect: [[[R10, 3 * R10], [3 * R10, -R10]], [Math.sqrt(45), Math.sqrt(5)], [[R2, R2], [R2, -R2]]] },
  { name: 'a 3 × 2: `svd([[1, 1], [0, 1], [1, 0]])`: σ = √3, 1', args: [[[1, 1], [0, 1], [1, 0]]], expect: [[[2 * R6, R6, R6], [0, -R2, R2]], [Math.sqrt(3), 1], [[R2, R2], [R2, -R2]]] },
  { name: 'already a stretch: `svd([[2, 0], [0, 3]])`: σ = 3 along (0, 1), then 2', args: [[[2, 0], [0, 3]]], expect: [[[0, 1], [1, 0]], [3, 2], [[0, 1], [1, 0]]] },
  { name: 'a flip still has positive singular values: `svd([[0, 2], [1, 0]])`', args: [[[0, 2], [1, 0]]], expect: [[[1, 0], [0, 1]], [2, 1], [[0, 1], [1, 0]]] },
];

export const LOW_RANK_TESTS = [
  { name: 'one layer of the test move: `low_rank([[3, 0], [4, 5]], 1)` is [[1.5, 1.5], [4.5, 4.5]]', args: [[[3, 0], [4, 5]], 1], expect: [[1.5, 1.5], [4.5, 4.5]] },
  { name: 'both layers give the move back', args: [[[3, 0], [4, 5]], 2], expect: [[3, 0], [4, 5]] },
  { name: 'one layer of the 3 × 2', args: [[[1, 1], [0, 1], [1, 0]], 1], expect: [[1, 1], [0.5, 0.5], [0.5, 0.5]] },
  { name: 'one layer of a stretch keeps the larger stretch', args: [[[2, 0], [0, 3]], 1], expect: [[0, 0], [0, 3]] },
];

export const buildSvd: BuildDef = {
  id: 'c25-svd', fn: 'svd', title: 'Turn, stretch, turn',
  brief: 'Write `svd(A)` for a matrix `A` (a list of rows, at least as many rows as columns, singular values of different sizes):\n\n1. Build $A^{\\mathsf T}A$ with your `matmul` and `transpose`, and split it with your `sym_eigen`. Its eigenvalues are $\\sigma^2$; its eigenvectors are the $\\mathbf v$’s.\n2. Each $\\sigma$ is the square root of its eigenvalue.\n3. Each $\\mathbf u = A\\mathbf v/\\sigma$, with your `matvec`.\n\nReturn three lists: the $\\mathbf u$’s, the $\\sigma$’s (largest first), the $\\mathbf v$’s.',
  starter: 'def svd(A):\n    """Return the u\'s, the singular values (largest first) and the v\'s of A."""\n    values, vs = sym_eigen(matmul(transpose(A), A))\n    sigmas = []\n    us = []\n    return us, sigmas, vs\n',
  fill: SVD.replace('    sigmas = [math.sqrt(max(lam, 0)) for lam in values]', '    sigmas = [___ for lam in values]').replace('    us = [[t / s for t in matvec(A, v)] for s, v in zip(sigmas, vs)]', '    us = [[t / ___ for t in matvec(___, v)] for s, v in zip(sigmas, vs)]'),
  solution: SVD,
  assemble: { lines: SVD.trimEnd().split('\n'), decoys: ['    sigmas = values', '    values, vs = sym_eigen(A)'] },
  uses: ['sym_eigen', 'matmul', 'transpose', 'matvec', 'power_iteration', 'quad_form', 'dot'],
  tests: SVD_TESTS,
  swarm: { gen: (r, d) => svdCase(r, d), crew: (A) => crewSvd(A as Mat), tol: 1e-6 },
  docPrompt: 'Why are the eigenvectors of AᵀA the right inputs, and why are the outputs A v perpendicular? Write it the way you would tell Bram.',
  ilseNote: 'svd(A): AᵀA is symmetric, so sym_eigen gives perpendicular v’s with eigenvalues σ². Then A v · A w = vᵀ AᵀA w = σ² (v · w) = 0, so the outputs are perpendicular too, and |A v| = σ. Divide by σ to get the unit u.',
  payoff: 'Show more decimals runs your `svd` on the fitted pulse.',
};

export const buildLowRank: BuildDef = {
  id: 'c25-low-rank', fn: 'low_rank', title: 'Keep the biggest layers',
  brief: 'Write `low_rank(A, k)`: take your `svd(A)`, and add up the first `k` layers $\\sigma\\,\\mathbf u\\mathbf v^{\\mathsf T}$. Each layer’s entry in row `i`, column `j` is `s * u[i] * v[j]`.',
  starter: 'def low_rank(A, k):\n    """Return the sum of the k largest layers sigma * u v^T of A."""\n    us, sigmas, vs = svd(A)\n    B = [[0.0] * len(A[0]) for _ in A]\n    # add the first k layers into B\n    return B\n',
  fill: LOW_RANK.replace('    for u, s, v in zip(us[:k], sigmas[:k], vs[:k]):', '    for u, s, v in zip(us[:___], sigmas[:___], vs[:___]):').replace('                B[i][j] += s * u[i] * v[j]', '                B[i][j] += ___'),
  solution: LOW_RANK,
  assemble: { lines: LOW_RANK.trimEnd().split('\n'), decoys: ['                B[i][j] += s * u[j] * v[i]', '    for u, s, v in zip(us[-k:], sigmas[-k:], vs[-k:]):'] },
  uses: ['svd', 'sym_eigen', 'matmul', 'transpose', 'matvec', 'power_iteration', 'quad_form', 'dot'],
  tests: LOW_RANK_TESTS,
  swarm: { gen: (r, d) => lowRankCase(r, d), crew: (A, k) => crewLowRank(A as Mat, k as number), tol: 1e-6 },
  docPrompt: 'Why do the largest layers carry the most of the picture? What does the first layer you leave out tell you?',
  ilseNote: 'low_rank(A, k): the layers σ u vᵀ are perpendicular to each other, so leaving some out removes exactly their share. Keep the largest; the miss is the largest σ you dropped.',
  payoff: 'Teo’s channel is rebuilt from eight layers with your `low_rank`.',
};
