// Chapter 19 builds (GDD §5.5): mat_pow (repeated squaring) and diagonalise2 (P and D from eig2). Python on
// plain lists. Vell's fifty-pulse forecast runs on mat_pow. Plain data and maths (no DOM):
// tests/singular/game-c19.test.ts runs the references in CPython.
import type { BuildDef } from '../../../game/types.ts';
import type { Mat } from '../../../math/la.ts';
import { crewDiag, crewPow, diagCase, powCase } from './logic.ts';

export const MAT_POW = `def mat_pow(A, k):
    """Return A multiplied by itself k times, by repeated squaring."""
    result = identity(len(A))
    square = A
    while k > 0:
        if k % 2 == 1:
            result = matmul(result, square)
        square = matmul(square, square)
        k = k // 2
    return result
`;

export const DIAG2 = `def diagonalise2(A):
    """Return [P, D] with A = P D P^-1: lines that hold as P's columns, stretches on D's diagonal. None if too few lines."""
    e = eig2(A)
    if e['kind'] != 'real':
        return None
    l1, l2 = e['values']
    if abs(l1 - l2) < 1e-12:
        if A[0][1] == 0 and A[1][0] == 0:
            return [identity(2), [[l1, 0], [0, l2]]]
        return None
    vs = []
    for lam in (l1, l2):
        a, b = A[0][0] - lam, A[0][1]
        c, d = A[1][0], A[1][1] - lam
        if abs(b) > 1e-12:
            vs.append([1, -a / b])
        elif abs(a) > 1e-12:
            vs.append([0, 1])
        elif abs(d) > 1e-12:
            vs.append([1, -c / d])
        else:
            vs.append([0, 1])
    P = [[vs[0][0], vs[1][0]], [vs[0][1], vs[1][1]]]
    return [P, [[l1, 0], [0, l2]]]
`;

const H = 0.5 ** 50;
export const MAT_POW_TESTS = [
  { name: 'Fibonacci: `mat_pow([[1, 1], [1, 0]], 10)` is `[[89, 55], [55, 34]]`', args: [[[1, 1], [1, 0]], 10], expect: [[89, 55], [55, 34]] },
  { name: 'no repeats at all: the identity', args: [[[2, 3], [4, 5]], 0], expect: [[1, 0], [0, 1]] },
  { name: 'four quarter turns come home', args: [[[0, -1], [1, 0]], 4], expect: [[1, 0], [0, 1]] },
  { name: 'stretches along the axes: `mat_pow([[2, 0], [0, 3]], 5)`', args: [[[2, 0], [0, 3]], 5], expect: [[32, 0], [0, 243]] },
  { name: 'fifty slow pulses: everything onto (1, 1)', args: [[[0.75, 0.25], [0.25, 0.75]], 50], expect: [[0.5 + H / 2, 0.5 - H / 2], [0.5 - H / 2, 0.5 + H / 2]] },
  { name: '3-D: a shear, three times', args: [[[1, 1, 0], [0, 1, 0], [0, 0, 1]], 3], expect: [[1, 3, 0], [0, 1, 0], [0, 0, 1]] },
];
export const DIAG2_TESTS = [
  { name: '`diagonalise2([[3, 1], [0, 2]])`: P = [[1, 1], [0, -1]], D = diag(3, 2)', args: [[[3, 1], [0, 2]]], expect: [[[1, 1], [0, -1]], [[3, 0], [0, 2]]] },
  { name: 'the slow pulse: lines (1, 1) and (1, −1), stretches 1 and 0.5', args: [[[0.75, 0.25], [0.25, 0.75]]], expect: [[[1, 1], [1, -1]], [[1, 0], [0, 0.5]]] },
  { name: 'the λ dial’s matrix: lines (1, 1) and (1, −2)', args: [[[4, 1], [2, 3]]], expect: [[[1, 1], [1, -2]], [[5, 0], [0, 2]]] },
  { name: 'the shear has too few lines: `None`', args: [[[1, 1], [0, 1]]], expect: null },
  { name: 'a quarter turn has no real line: `None`', args: [[[0, -1], [1, 0]]], expect: null },
  { name: 'a plain stretch: every arrow holds, P = I', args: [[[2, 0], [0, 2]]], expect: [[[1, 0], [0, 1]], [[2, 0], [0, 2]]] },
];

export const buildMatPow: BuildDef = {
  id: 'c19-mat-pow', fn: 'mat_pow', title: 'Fifty pulses in a handful of products',
  brief: 'Write `mat_pow(A, k)`: $A$ multiplied by itself $k$ times, with **repeated squaring**. Keep a running `result` (start at the identity) and a `square` (start at `A`). While `k > 0`: if `k` is odd, multiply `square` into `result`; then square `square` and halve `k` (whole numbers).\n\n$A^{50}$ takes 9 products this way instead of 49. Your `matmul` and `identity` are available.',
  starter: 'def mat_pow(A, k):\n    """Return A multiplied by itself k times, by repeated squaring."""\n    result = identity(len(A))\n    square = A\n    # while k > 0: use the lowest bit of k, square, halve k\n    return result\n',
  fill: 'def mat_pow(A, k):\n    """Return A multiplied by itself k times, by repeated squaring."""\n    result = identity(len(A))\n    square = A\n    while k > 0:\n        if k % 2 == 1:\n            result = ___\n        square = ___\n        k = ___\n    return result\n',
  solution: MAT_POW,
  assemble: { lines: MAT_POW.trimEnd().split('\n'), decoys: ['        k = k - 1', '    result = A'] },
  uses: ['identity', 'matmul'],
  tests: MAT_POW_TESTS,
  swarm: { gen: (r, d) => powCase(r, d), crew: (A, k) => crewPow(A as Mat, k as number), tol: 1e-6 },
  docPrompt: 'Why does squaring and halving reach A to the k in so few products? Write it the way you would tell Bram.',
  ilseNote: 'mat_pow: A^50 = A^32 A^16 A^2. Squaring gives A^2, A^4, A^8, … one product each; the bits of k say which ones to keep. One squaring per binary digit of k, plus one product per 1: at most about 2·log₂ k products instead of k − 1.',
  payoff: 'Vell’s fifty-pulse forecast runs on your `mat_pow`.',
};

export const buildDiag2: BuildDef = {
  id: 'c19-diag2', fn: 'diagonalise2', title: 'Write a 2 × 2 in its own grid',
  brief: 'Write `diagonalise2(A)`: return `[P, D]` with $A = PDP^{-1}$, or `None` if $A$ has too few real lines.\n\n- Use your `eig2`. Complex stretches: `None`.\n- A repeated stretch: only $\\lambda I$ (no off-diagonal entries) has enough lines; return `[identity(2), D]`. Anything else (a shear): `None`.\n- Otherwise, for each stretch λ (larger first) take a non-zero $\\mathbf v$ with $(A - \\lambda I)\\mathbf v = \\mathbf 0$, scaled so its first entry is 1 (or $(0, 1)$ when the first entry must be 0). They are the **columns** of $P$, in the same order as $D$’s diagonal.',
  starter: 'def diagonalise2(A):\n    """Return [P, D] with A = P D P^-1: lines that hold as P\'s columns, stretches on D\'s diagonal. None if too few lines."""\n    e = eig2(A)\n    # complex: None. Repeated: only a plain stretch works. Otherwise one line per stretch.\n    return None\n',
  solution: DIAG2,
  assemble: { lines: DIAG2.trimEnd().split('\n'), decoys: ['    P = [vs[0], vs[1]]', '    return [P, [[l2, 0], [0, l1]]]'] },
  uses: ['eig2', 'identity'],
  tests: DIAG2_TESTS,
  swarm: { gen: (r, d) => diagCase(r, d), crew: (A) => crewDiag(A as Mat), tol: 1e-6 },
  docPrompt: 'Why must the columns of P and the diagonal of D be in the same order?',
  ilseNote: 'diagonalise2: AP = PD says column by column A v_i = λ_i v_i. Put v_i in column i and λ_i in place i, and P must have an inverse: two different lines. The shear has one line; a turn has none.',
  payoff: 'The forecast desk writes every two-site pulse in its own grid with your `diagonalise2`.',
};
