// Chapter 24 builds (GDD §5.5): quad_form (the height xᵀSx, via dot and matvec) and sym_eigen (power
// iteration, then take each found layer λqqᵀ away and repeat). Python on plain lists. sym_eigen returns a
// canonical form so the swarm can compare: eigenvalues largest first, unit eigenvectors with their first
// non-zero entry positive. The brace planner runs on sym_eigen; Chapter 25's svd is built on it.
import type { BuildDef } from '../../../game/types.ts';
import type { Mat, Vec } from '../../../math/la.ts';
import { crewQuadForm, crewSymEigen, quadCase, symCase } from './logic.ts';

export const QUAD_FORM = `def quad_form(S, x):
    """Return the height x^T S x of the surface above the point x."""
    return dot(x, matvec(S, x))
`;

export const SYM_EIGEN = `def sym_eigen(S):
    """Return the eigenvalues of a symmetric S, largest first, and their unit eigenvectors."""
    n = len(S)
    A = [row[:] for row in S]
    pairs = []
    for _ in range(n):
        q = power_iteration(A, [math.sqrt(i + 2) for i in range(n)], 200)
        if next(t for t in q if abs(t) > 1e-9) < 0:
            q = [-t for t in q]
        lam = quad_form(S, q)
        pairs.append((lam, q))
        A = [[A[i][j] - lam * q[i] * q[j] for j in range(n)] for i in range(n)]
    pairs.sort(key=lambda p: -p[0])
    return [p[0] for p in pairs], [p[1] for p in pairs]
`;

const R2 = Math.SQRT1_2, R3 = 1 / Math.sqrt(3), R6 = 1 / Math.sqrt(6);

export const QUAD_TESTS = [
  { name: 'panel two at (1, 1): `quad_form([[2, 1], [1, 2]], [1, 1])` is 6', args: [[[2, 1], [1, 2]], [1, 1]], expect: 6 },
  { name: 'panel two at (1, −1): 2', args: [[[2, 1], [1, 2]], [1, -1]], expect: 2 },
  { name: 'the saddle goes below the floor: `quad_form([[1, 2], [2, 1]], [1, -1])` is −2', args: [[[1, 2], [2, 1]], [1, -1]], expect: -2 },
  { name: 'the stress block at (1, 1, 1): 12', args: [[[2, 1, 1], [1, 2, 1], [1, 1, 2]], [1, 1, 1]], expect: 12 },
  { name: 'the origin has height 0', args: [[[3, 1], [1, 3]], [0, 0]], expect: 0 },
];

export const SYM_TESTS = [
  { name: 'panel one: `sym_eigen([[3, 1], [1, 3]])` gives 4 along (1, 1) and 2 along (1, −1)', args: [[[3, 1], [1, 3]]], expect: [[4, 2], [[R2, R2], [R2, -R2]]] },
  { name: 'a saddle: [[1, 2], [2, 1]] gives 3 and −1', args: [[[1, 2], [2, 1]]], expect: [[3, -1], [[R2, R2], [R2, -R2]]] },
  { name: 'already diagonal: [[2, 0], [0, 5]] gives 5 along (0, 1) and 2 along (1, 0)', args: [[[2, 0], [0, 5]]], expect: [[5, 2], [[0, 1], [1, 0]]] },
  { name: 'Vell’s pulse: 1, 0.5, 0.2 along (1, 1, 1), (1, −1, 0), (1, 1, −2)', args: [[[37 / 60, 7 / 60, 16 / 60], [7 / 60, 37 / 60, 16 / 60], [16 / 60, 16 / 60, 28 / 60]]], expect: [[1, 0.5, 0.2], [[R3, R3, R3], [R2, -R2, 0], [R6, R6, -2 * R6]]] },
];

export const buildQuadForm: BuildDef = {
  id: 'c24-quad-form', fn: 'quad_form', title: 'The height of the surface',
  brief: 'Write `quad_form(S, x)`: the height $\\mathbf x^{\\mathsf T}S\\mathbf x$ of the surface above the point `x`. Apply `S` to `x` with your `matvec`, then dot the result with `x` using your `dot`.',
  starter: 'def quad_form(S, x):\n    """Return the height x^T S x of the surface above the point x."""\n    return 0\n',
  fill: 'def quad_form(S, x):\n    """Return the height x^T S x of the surface above the point x."""\n    return dot(___, matvec(___, ___))\n',
  solution: QUAD_FORM,
  assemble: { lines: QUAD_FORM.trimEnd().split('\n'), decoys: ['    return dot(x, x)', '    return dot(matvec(S, x), matvec(S, x))'] },
  uses: ['dot', 'matvec'],
  tests: QUAD_TESTS,
  swarm: { gen: (r, d) => quadCase(r, d), crew: (S, x) => crewQuadForm(S as Mat, x as Vec), tol: 1e-9 },
  docPrompt: 'Why is xᵀSx the same as the dot product of x with Sx? Write it the way you would tell Bram.',
  ilseNote: 'quad_form(S, x): S moves x, and the dot product with x itself measures how much of Sx points back along x, times the length of x. One unit out along an eigenvector, that is the eigenvalue.',
  payoff: 'The surfaces on the holotable read their heights from your `quad_form`.',
};

export const buildSymEigen: BuildDef = {
  id: 'c24-sym-eigen', fn: 'sym_eigen', title: 'Every brace line of a symmetric matrix',
  brief: 'Write `sym_eigen(S)` for a symmetric `S` whose eigenvalues all have different sizes. Repeat `n` times:\n\n1. Run your `power_iteration(A, start, 200)` from a fixed start. It settles on the line of the largest stretch left in `A`.\n2. Turn `q` so its first non-zero entry is positive, and read its eigenvalue with your `quad_form(S, q)`.\n3. Take that layer away: `A[i][j] -= lam * q[i] * q[j]`. What is left has the same eigenvectors, with this one now at 0.\n\nReturn two lists: the eigenvalues **largest first**, and their eigenvectors in the same order.',
  starter: 'def sym_eigen(S):\n    """Return the eigenvalues of a symmetric S, largest first, and their unit eigenvectors."""\n    n = len(S)\n    A = [row[:] for row in S]\n    pairs = []\n    for _ in range(n):\n        q = power_iteration(A, [math.sqrt(i + 2) for i in range(n)], 200)\n        # turn q so its first non-zero entry is positive\n        # its eigenvalue: quad_form(S, q)\n        # take the layer lam * q q^T away from A\n        pass\n    pairs.sort(key=lambda p: -p[0])\n    return [p[0] for p in pairs], [p[1] for p in pairs]\n',
  fill: SYM_EIGEN.replace('        lam = quad_form(S, q)', '        lam = quad_form(___, ___)').replace('        A = [[A[i][j] - lam * q[i] * q[j] for j in range(n)] for i in range(n)]', '        A = [[A[i][j] - ___ for j in range(n)] for i in range(n)]').replace('    pairs.sort(key=lambda p: -p[0])', '    pairs.sort(key=lambda p: ___)'),
  solution: SYM_EIGEN,
  assemble: { lines: SYM_EIGEN.trimEnd().split('\n'), decoys: ['        A = [[A[i][j] - lam for j in range(n)] for i in range(n)]', '    pairs.sort(key=lambda p: p[0])'] },
  uses: ['power_iteration', 'quad_form', 'matvec', 'dot'],
  tests: SYM_TESTS,
  swarm: { gen: (r, d) => symCase(r, d), crew: (S) => crewSymEigen(S as Mat), tol: 1e-6 },
  docPrompt: 'Why does taking away λqqᵀ leave the other eigenvectors where they were? Write it the way you would tell Bram.',
  ilseNote: 'sym_eigen: power iteration finds the strongest line. Subtracting λqqᵀ removes exactly that line from the matrix and leaves every perpendicular eigenvector alone, because qᵀ times a perpendicular arrow is zero. Repeat.',
  payoff: 'The brace planner sets the stern’s braces with your `sym_eigen`. Chapter 25’s `svd` is built on it.',
};
