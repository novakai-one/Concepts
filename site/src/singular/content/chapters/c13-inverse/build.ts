// Chapter 13 builds (GDD §5.5): identity(n) and inverse(A) by row reducing [A | I]. Python on plain lists.
import type { BuildDef } from '../../../game/types';
import { crewIdentity, crewInverse, swarmMatrix } from './logic';

export const buildIdentity: BuildDef = {
  id: 'c13-identity', fn: 'identity', title: 'The move that does nothing',
  brief: 'Write `identity(n)`. It returns the $n \\times n$ identity matrix as a list of rows: 1 on the diagonal, 0 everywhere else.\n\n`identity(2)` is `[[1, 0], [0, 1]]`.',
  starter: 'def identity(n):\n    """Return the n by n identity matrix, as a list of rows."""\n    # row i has a 1 in place i and 0 everywhere else\n    return []\n',
  fill: 'def identity(n):\n    """Return the n by n identity matrix, as a list of rows."""\n    return [[1 if ___ else 0 for j in range(n)] for i in range(___)]\n',
  solution: 'def identity(n):\n    """Return the n by n identity matrix, as a list of rows."""\n    return [[1 if i == j else 0 for j in range(n)] for i in range(n)]\n',
  assemble: {
    lines: ['def identity(n):', '    """Return the n by n identity matrix, as a list of rows."""', '    return [[1 if i == j else 0 for j in range(n)] for i in range(n)]'],
    decoys: ['    return [[1 for j in range(n)] for i in range(n)]'],
  },
  tests: [
    { name: '`identity(2)` is `[[1, 0], [0, 1]]`', args: [2], expect: [[1, 0], [0, 1]] },
    { name: '`identity(3)`', args: [3], expect: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] },
    { name: '`identity(1)` is `[[1]]`', args: [1], expect: [[1]] },
  ],
  swarm: { gen: (r) => [2 + Math.floor(r() * 4)], crew: (n) => crewIdentity(n as number) },
  docPrompt: 'What does the identity matrix do to the grid, and why is it 1 on the diagonal?',
  ilseNote: 'identity(n): every grid arrow lands on itself. Column j is e_j, so the 1s sit on the diagonal.',
  payoff: 'The undo planner starts every [A | I] from your `identity`.',
};

export const buildInverse: BuildDef = {
  id: 'c13-inverse', fn: 'inverse', title: 'Undo a move',
  brief: 'Write `inverse(A)` for a square matrix `A` (a list of rows). Row reduce $[A \\mid I]$: for each column, pick the row with the largest entry there at or below the diagonal and swap it up, divide that row by its pivot, then clear the column in every other row. Do every step to the **whole row**, right half too. The right half is $A^{-1}$.\n\nReturn `None` when a column has no pivot (every candidate is within `1e-9` of 0): then the move flattens space and has no inverse. `identity(n)` is available.',
  starter: 'def inverse(A):\n    """Return the inverse of the square matrix A, or None if it has none."""\n    n = len(A)\n    M = [list(map(float, A[i])) + identity(n)[i] for i in range(n)]\n    # for each column: choose a pivot row, swap, scale to 1, clear the other rows\n    return [row[n:] for row in M]\n',
  fill: 'def inverse(A):\n    """Return the inverse of the square matrix A, or None if it has none."""\n    n = len(A)\n    M = [list(map(float, A[i])) + identity(n)[i] for i in range(n)]\n    for c in range(n):\n        p = max(range(c, n), key=lambda r: abs(M[r][c]))\n        if abs(M[p][c]) < 1e-9:\n            return ___\n        M[c], M[p] = M[p], M[c]\n        pivot = M[c][c]\n        M[c] = [x / ___ for x in M[c]]\n        for r in range(n):\n            if r != c:\n                f = M[r][c]\n                M[r] = [a - f * b for a, b in zip(M[r], ___)]\n    return [row[n:] for row in M]\n',
  solution: 'def inverse(A):\n    """Return the inverse of the square matrix A, or None if it has none."""\n    n = len(A)\n    M = [list(map(float, A[i])) + identity(n)[i] for i in range(n)]\n    for c in range(n):\n        p = max(range(c, n), key=lambda r: abs(M[r][c]))\n        if abs(M[p][c]) < 1e-9:\n            return None\n        M[c], M[p] = M[p], M[c]\n        pivot = M[c][c]\n        M[c] = [x / pivot for x in M[c]]\n        for r in range(n):\n            if r != c:\n                f = M[r][c]\n                M[r] = [a - f * b for a, b in zip(M[r], M[c])]\n    return [row[n:] for row in M]\n',
  assemble: {
    lines: [
      'def inverse(A):',
      '    """Return the inverse of the square matrix A, or None if it has none."""',
      '    n = len(A)',
      '    M = [list(map(float, A[i])) + identity(n)[i] for i in range(n)]',
      '    for c in range(n):',
      '        p = max(range(c, n), key=lambda r: abs(M[r][c]))',
      '        if abs(M[p][c]) < 1e-9:',
      '            return None',
      '        M[c], M[p] = M[p], M[c]',
      '        pivot = M[c][c]',
      '        M[c] = [x / pivot for x in M[c]]',
      '        for r in range(n):',
      '            if r != c:',
      '                f = M[r][c]',
      '                M[r] = [a - f * b for a, b in zip(M[r], M[c])]',
      '    return [row[n:] for row in M]',
    ],
    decoys: ['    M = [list(map(float, A[i])) for i in range(n)]', '                M[r] = [a - f * b for a, b in zip(M[r][:n], M[c][:n])] + M[r][n:]'],
  },
  uses: ['identity'],
  tests: [
    { name: 'a quarter turn: `inverse([[0, -1], [1, 0]])` turns back', args: [[[0, -1], [1, 0]]], expect: [[0, 1], [-1, 0]] },
    { name: 'the routine pulse: `inverse([[1, -2], [1, -1]])`', args: [[[1, -2], [1, -1]]], expect: [[-1, 2], [-1, 1]] },
    { name: 'a zero pivot needs a swap: `inverse([[0, 2], [1, 1]])`', args: [[[0, 2], [1, 1]]], expect: [[-0.5, 1], [0.5, 0]] },
    { name: 'the corner joint (3 × 3)', args: [[[1, 1, 0], [0, 1, 1], [1, 0, 1]]], expect: [[0.5, -0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, 0.5]] },
    { name: 'a flattening has no inverse: `inverse([[1, 2], [2, 4]])` is `None`', args: [[[1, 2], [2, 4]]], expect: null },
  ],
  swarm: { gen: (r, d) => [swarmMatrix(r, d)], crew: (A) => crewInverse(A as number[][]), tol: 1e-6 },
  docPrompt: 'Why does row reducing [A | I] leave the inverse in the right half, and when does it return None?',
  ilseNote: 'inverse(A): the row operations that turn A into I, done to I as well. A column with no pivot means two points landed together: no inverse.',
  payoff: 'The undo planner squares the bow with your `inverse`.',
};
