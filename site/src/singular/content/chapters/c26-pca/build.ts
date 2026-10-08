// Chapter 26 builds (GDD §5.5): covariance (centre, then entry (i, j) is column i of the centred readings dotted
// with column j, over n − 1) and pca (centre, split the covariance with sym_eigen, project onto the first k
// eigenvectors). Python on plain lists, written with dot products so 10,000 readings stay fast in the browser.
// pca's output is comparable in the swarm because sym_eigen returns a canonical form (largest first, each
// eigenvector's first non-zero entry positive). The transmission to the Meridian is projected by the player's pca.
import type { BuildDef } from '../../../game/types.ts';
import { covCase, crewCovariance, crewPca, pcaCase } from './logic.ts';

export const COVARIANCE = `def covariance(X):
    """Return the covariance matrix of the readings X (one reading per row)."""
    n = len(X)
    mean = [sum(col) / n for col in transpose(X)]
    cols = transpose([[x - m for x, m in zip(row, mean)] for row in X])
    return [[dot(a, b) / (n - 1) for b in cols] for a in cols]
`;

export const PCA = `def pca(X, k):
    """Return each reading's k coordinates along the k directions of most spread."""
    n = len(X)
    mean = [sum(col) / n for col in transpose(X)]
    values, vectors = sym_eigen(covariance(X))
    keep = vectors[:k]
    return [[dot([x - m for x, m in zip(row, mean)], w) for w in keep] for row in X]
`;

const R2 = Math.SQRT1_2;
const F4 = [[6, 6], [2, 4], [5, 7], [3, 3]];

export const COVARIANCE_TESTS = [
  { name: 'the four readings by hand: `covariance([[6, 6], [2, 4], [5, 7], [3, 3]])` is (1/3)·[[10, 8], [8, 10]]', args: [F4], expect: [[10 / 3, 8 / 3], [8 / 3, 10 / 3]] },
  { name: 'moving the whole cloud changes nothing: the same readings plus 100', args: [F4.map((r) => r.map((x) => x + 100))], expect: [[10 / 3, 8 / 3], [8 / 3, 10 / 3]] },
  { name: 'two readings: `covariance([[1, 2], [3, 6]])` is [[2, 4], [4, 8]]', args: [[[1, 2], [3, 6]]], expect: [[2, 4], [4, 8]] },
  { name: 'the same spread every way: `covariance([[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1]])` is I/3', args: [[[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1]]], expect: [[1 / 3, 0, 0], [0, 1 / 3, 0], [0, 0, 1 / 3]] },
];

export const PCA_TESTS = [
  { name: 'the four readings, one component: `pca([[6, 6], [2, 4], [5, 7], [3, 3]], 1)` is ±3/√2', args: [F4, 1], expect: [[3 * R2], [-3 * R2], [3 * R2], [-3 * R2]] },
  { name: 'both components: the second runs along (1, −1)/√2', args: [F4, 2], expect: [[3 * R2, R2], [-3 * R2, -R2], [3 * R2, -R2], [-3 * R2, R2]] },
  { name: 'a cloud far from the origin: the mean is taken away first', args: [[[0, 10], [0, 14], [1, 12], [-1, 12]], 1], expect: [[-2], [2], [0], [0]] },
  { name: 'three numbers per reading, keep two', args: [[[2, 0, 0], [-2, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 0.5], [0, 0, -0.5]], 2], expect: [[2, 0], [-2, 0], [0, 1], [0, -1], [0, 0], [0, 0]] },
];

export const buildCovariance: BuildDef = {
  id: 'c26-covariance', fn: 'covariance', title: 'The spread in every direction at once',
  brief: 'Write `covariance(X)` for readings `X` (a list of rows, one reading per row):\n\n1. The mean reading: the average of each column (your `transpose` gives the columns).\n2. Take the mean away from every reading, and take the columns of the result.\n3. Entry $(i, j)$ is column $i$ dotted with column $j$ (your `dot`), divided by $n - 1$.\n\nThat is $C = X_c^{\\mathsf T}X_c/(n - 1)$, one dot product per entry.',
  starter: 'def covariance(X):\n    """Return the covariance matrix of the readings X (one reading per row)."""\n    n = len(X)\n    mean = [sum(col) / n for col in transpose(X)]\n    # centre the readings, take their columns, and dot them in pairs\n    return []\n',
  fill: COVARIANCE.replace('    cols = transpose([[x - m for x, m in zip(row, mean)] for row in X])', '    cols = transpose([[x - ___ for x, m in zip(row, mean)] for row in X])').replace('    return [[dot(a, b) / (n - 1) for b in cols] for a in cols]', '    return [[dot(a, b) / ___ for b in cols] for a in cols]'),
  solution: COVARIANCE,
  assemble: { lines: COVARIANCE.trimEnd().split('\n'), decoys: ['    return [[dot(a, b) / n for b in cols] for a in cols]', '    cols = transpose(X)'] },
  uses: ['transpose', 'dot'],
  tests: COVARIANCE_TESTS,
  swarm: { gen: (r, d) => covCase(r, d), crew: (X) => crewCovariance(X as number[][]), tol: 1e-6 },
  docPrompt: 'What does entry (i, j) of the covariance matrix measure, and why take the mean away first? Write it the way you would tell Vell.',
  ilseNote: 'covariance(X): centre first, or the biggest thing you measure is where the cloud sits. Then entry (i, j) is how the i-th and j-th numbers of a reading (columns i and j) move together across the readings, averaged over n − 1. The diagonal holds each column’s own spread; the matrix is symmetric, so Chapter 24 applies.',
  payoff: 'Your `pca` builds on it; the Anchor’s record goes out through both.',
};

export const buildPca: BuildDef = {
  id: 'c26-pca', fn: 'pca', title: 'Keep the directions of most spread',
  brief: 'Write `pca(X, k)`:\n\n1. The mean reading, as in `covariance`.\n2. Split `covariance(X)` with your `sym_eigen`: the eigenvectors come largest eigenvalue first.\n3. Keep the first `k` of them.\n4. For each reading, take the mean away and dot it with each kept eigenvector.\n\nReturn one row of `k` numbers per reading.',
  starter: 'def pca(X, k):\n    """Return each reading\'s k coordinates along the k directions of most spread."""\n    n = len(X)\n    mean = [sum(col) / n for col in transpose(X)]\n    values, vectors = sym_eigen(covariance(X))\n    # keep the first k directions and project every centred reading onto them\n    return []\n',
  fill: PCA.replace('    keep = vectors[:k]', '    keep = vectors[:___]').replace('    return [[dot([x - m for x, m in zip(row, mean)], w) for w in keep] for row in X]', '    return [[dot([x - ___ for x, m in zip(row, mean)], ___) for w in keep] for row in X]'),
  solution: PCA,
  assemble: { lines: PCA.trimEnd().split('\n'), decoys: ['    keep = vectors[-k:]', '    return [[dot(row, w) for w in keep] for row in X]'] },
  uses: ['covariance', 'sym_eigen', 'transpose', 'dot', 'power_iteration', 'quad_form', 'matvec'],
  tests: PCA_TESTS,
  swarm: { gen: (r, d) => pcaCase(r, d), crew: (X, k) => crewPca(X as number[][], k as number), tol: 1e-6 },
  docPrompt: 'Why are the directions of most spread the eigenvectors of the covariance matrix with the largest eigenvalues? Write it the way you would tell Bram.',
  ilseNote: 'pca(X, k): the spread along a unit direction w is wᵀCw, a quadratic form. On the unit circle it is largest at the top eigenvector of C, and the next eigenvector is the largest spread at right angles to it. Keep k of them and each reading becomes k numbers.',
  payoff: 'The Anchor’s record goes out projected by your `pca`.',
};
