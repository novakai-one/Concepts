// Chapter 14 builds (GDD §5.5): det by elimination (product of the pivots, a sign per swap), and det3 by
// the formula, for checking. Python on plain lists. The Collapse forecast runs on the player's det.
import type { BuildDef } from '../../../game/types';
import { crewDet, crewDet3, swarmSquare } from './logic';

export const buildDet: BuildDef = {
  id: 'c14-det', fn: 'det', title: 'How much does a move scale volume?',
  brief: 'Write `det(A)` for a square matrix `A` (a list of rows). Eliminate below each pivot. Before each column, swap up the row with the largest entry there; **every swap flips the sign**. The determinant is the sign times the product of the pivots.\n\nIf a column has no pivot (every candidate is within `1e-12` of 0), the move flattens space: return `0`.',
  starter: 'def det(A):\n    """Return the determinant of the square matrix A."""\n    n = len(A)\n    M = [list(map(float, row)) for row in A]\n    sign, out = 1, 1.0\n    # for each column: pick a pivot (swap flips the sign), multiply it in, clear below\n    return sign * out\n',
  fill: 'def det(A):\n    """Return the determinant of the square matrix A."""\n    n = len(A)\n    M = [list(map(float, row)) for row in A]\n    sign, out = 1, 1.0\n    for c in range(n):\n        p = max(range(c, n), key=lambda r: abs(M[r][c]))\n        if abs(M[p][c]) < 1e-12:\n            return 0\n        if p != c:\n            M[c], M[p] = M[p], M[c]\n            sign = ___\n        out *= ___\n        for r in range(c + 1, n):\n            f = M[r][c] / M[c][c]\n            M[r] = [a - f * b for a, b in zip(M[r], ___)]\n    return sign * out\n',
  solution: 'def det(A):\n    """Return the determinant of the square matrix A."""\n    n = len(A)\n    M = [list(map(float, row)) for row in A]\n    sign, out = 1, 1.0\n    for c in range(n):\n        p = max(range(c, n), key=lambda r: abs(M[r][c]))\n        if abs(M[p][c]) < 1e-12:\n            return 0\n        if p != c:\n            M[c], M[p] = M[p], M[c]\n            sign = -sign\n        out *= M[c][c]\n        for r in range(c + 1, n):\n            f = M[r][c] / M[c][c]\n            M[r] = [a - f * b for a, b in zip(M[r], M[c])]\n    return sign * out\n',
  assemble: {
    lines: [
      'def det(A):',
      '    """Return the determinant of the square matrix A."""',
      '    n = len(A)',
      '    M = [list(map(float, row)) for row in A]',
      '    sign, out = 1, 1.0',
      '    for c in range(n):',
      '        p = max(range(c, n), key=lambda r: abs(M[r][c]))',
      '        if abs(M[p][c]) < 1e-12:',
      '            return 0',
      '        if p != c:',
      '            M[c], M[p] = M[p], M[c]',
      '            sign = -sign',
      '        out *= M[c][c]',
      '        for r in range(c + 1, n):',
      '            f = M[r][c] / M[c][c]',
      '            M[r] = [a - f * b for a, b in zip(M[r], M[c])]',
      '    return sign * out',
    ],
    decoys: ['    return out', '            M[r] = [a - b for a, b in zip(M[r], M[c])]'],
  },
  tests: [
    { name: '`det([[3, 1], [1, 2]])` is 5', args: [[[3, 1], [1, 2]]], expect: 5, tol: 1e-9 },
    { name: 'a swap is needed: `det([[0, 2, 1], [1, 1, 1], [2, 1, 0]])` is 3', args: [[[0, 2, 1], [1, 1, 1], [2, 1, 0]]], expect: 3, tol: 1e-9 },
    { name: 'a flip: `det([[0, 1], [1, 0]])` is −1', args: [[[0, 1], [1, 0]]], expect: -1, tol: 1e-9 },
    { name: 'flat: `det([[1, 2], [2, 4]])` is 0', args: [[[1, 2], [2, 4]]], expect: 0, tol: 1e-9 },
    { name: 'the 4 × 4 from the worksheet is −1', args: [[[1, 2, 0, 3], [0, 1, 0, 0], [2, 0, 1, 1], [1, 1, 0, 2]]], expect: -1, tol: 1e-9 },
  ],
  swarm: { gen: (r, d) => [swarmSquare(r, d)], crew: (A) => crewDet(A as number[][]), tol: 1e-6 },
  docPrompt: 'Why is the determinant the product of the pivots, and why does each swap flip its sign?',
  ilseNote: 'det(A): elimination shears the box without changing its volume; a swap turns it over (sign); a triangle\'s volume is its diagonal multiplied.',
  payoff: 'The Collapse forecast runs on your `det`.',
};

export const buildDet3: BuildDef = {
  id: 'c14-det3', fn: 'det3', title: 'A 3 × 3 determinant by the formula',
  brief: 'Write `det3(M)` for a 3 × 3 matrix by cofactor expansion along the first row: $a_{11}C_{11} + a_{12}C_{12} + a_{13}C_{13}$, with the signs $+\\,-\\,+$. Use it to check your `det`.',
  starter: 'def det3(M):\n    """Return det M for a 3 by 3 M, expanding along row 1."""\n    (a, b, c), (d, e, f), (g, h, i) = M\n    return 0\n',
  fill: 'def det3(M):\n    """Return det M for a 3 by 3 M, expanding along row 1."""\n    (a, b, c), (d, e, f), (g, h, i) = M\n    return a * (e * i - f * h) - b * (___) + c * (___)\n',
  solution: 'def det3(M):\n    """Return det M for a 3 by 3 M, expanding along row 1."""\n    (a, b, c), (d, e, f), (g, h, i) = M\n    return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)\n',
  assemble: {
    lines: [
      'def det3(M):',
      '    """Return det M for a 3 by 3 M, expanding along row 1."""',
      '    (a, b, c), (d, e, f), (g, h, i) = M',
      '    return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)',
    ],
    decoys: ['    return a * (e * i - f * h) + b * (d * i - f * g) + c * (d * h - e * g)'],
  },
  tests: [
    { name: '`det3([[2, 1, 0], [1, 3, 1], [0, 1, 2]])` is 8', args: [[[2, 1, 0], [1, 3, 1], [0, 1, 2]]], expect: 8 },
    { name: 'the identity has determinant 1', args: [[[1, 0, 0], [0, 1, 0], [0, 0, 1]]], expect: 1 },
    { name: 'a swap of two rows: −1', args: [[[0, 1, 0], [1, 0, 0], [0, 0, 1]]], expect: -1 },
    { name: 'two equal columns: 0', args: [[[1, 0, 0], [0, 1, 1], [1, 2, 2]]], expect: 0 },
  ],
  swarm: { gen: (r, d) => [swarmSquare(r, d, 3)], crew: (A) => crewDet3(A as number[][]), tol: 1e-9 },
  docPrompt: 'Where does the + − + pattern come from?',
  ilseNote: 'det3: row 1 dotted with row 2 × row 3, the triple product of the rows. It equals the triple product of the columns because det Aᵀ = det A. The middle term carries the minus sign.',
  payoff: 'LANTERN checks every `det` it runs against your `det3`.',
};
