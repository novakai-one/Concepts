// Chapter 12 builds (GDD §5.5): matmul(A, B) built on your matvec, one column at a time, and
// transpose(A). Plain data and maths (no DOM): tests/singular/game-c12.test.ts runs them in CPython.
import type { BuildDef } from '../../../game/types.ts';
import { matMul, transpose, type Mat } from '../../../math/la.ts';
import { rint } from '../../../game/lawcheck.ts';

const MATMUL_LINES = [
  'def matmul(A, B):',
  '    """Return A B: column j is A times column j of B (B acts first)."""',
  '    columns = [matvec(A, [row[j] for row in B]) for j in range(len(B[0]))]',
  '    return [[c[i] for c in columns] for i in range(len(A))]',
];
const TRANSPOSE_LINES = [
  'def transpose(A):',
  '    """Return A with its rows written as columns."""',
  '    return [[row[j] for row in A] for j in range(len(A[0]))]',
];

const num = (r: () => number, level: string) => (level === 'cadet' ? rint(r, -4, 4) : level === 'navigator' ? rint(r, -8, 8) / 2 : rint(r, -40, 40) / 10);
/** A random product case with matching sizes: A is m × n, B is n × k. */
export function matmulCase(r: () => number, level: string): [Mat, Mat] {
  const m = rint(r, 1, 3), n = rint(r, 1, 3), k = rint(r, 1, 3);
  const mk = (a: number, b: number) => Array.from({ length: a }, () => Array.from({ length: b }, () => num(r, level)));
  return [mk(m, n), mk(n, k)];
}
export function transposeCase(r: () => number, level: string): [Mat] {
  const m = rint(r, 1, 3), n = rint(r, 1, 3);
  return [Array.from({ length: m }, () => Array.from({ length: n }, () => num(r, level)))];
}

export const MATMUL_TESTS = [
  { name: 'shear first, then the quarter turn: `matmul([[0, -1], [1, 0]], [[1, 1], [0, 1]])`', args: [[[0, -1], [1, 0]], [[1, 1], [0, 1]]], expect: [[0, -1], [1, 1]] },
  { name: 'the other order gives a different matrix', args: [[[1, 1], [0, 1]], [[0, -1], [1, 0]]], expect: [[1, -1], [1, 0]] },
  { name: 'the sensors: 2 × 3 times 3 × 2 is 2 × 2', args: [[[1, 2, 0], [0, 1, 3]], [[1, 0], [2, 1], [0, 4]]], expect: [[5, 2], [2, 13]] },
  { name: 'two non-zero matrices can multiply to zero', args: [[[0, 0], [0, 1]], [[1, 0], [0, 0]]], expect: [[0, 0], [0, 0]] },
  { name: 'flip over $y = x$ twice: nothing moves', args: [[[0, 1], [1, 0]], [[0, 1], [1, 0]]], expect: [[1, 0], [0, 1]] },
  { name: '3 × 3: the identity matrix first changes nothing', args: [[[1, 1, 0], [0, 1, 1], [0, 0, 1]], [[1, 0, 0], [0, 1, 0], [0, 0, 1]]], expect: [[1, 1, 0], [0, 1, 1], [0, 0, 1]] },
  { name: '3 × 3: two shears in a row', args: [[[1, 1, 0], [0, 1, 1], [0, 0, 1]], [[1, 1, 0], [0, 1, 1], [0, 0, 1]]], expect: [[1, 2, 1], [0, 1, 2], [0, 0, 1]] },
  { name: 'a row times a column is a 1 × 1 matrix: a dot product', args: [[[1, 2, 3]], [[4], [5], [6]]], expect: [[32]] },
];
export const TRANSPOSE_TESTS = [
  { name: 'rows become columns: `transpose([[1, 2], [0, 1]])` is `[[1, 0], [2, 1]]`', args: [[[1, 2], [0, 1]]], expect: [[1, 0], [2, 1]] },
  { name: 'a 2 × 3 becomes a 3 × 2', args: [[[1, 2, 0], [0, 1, 3]]], expect: [[1, 0], [2, 1], [0, 3]] },
  { name: 'a symmetric matrix is its own transpose', args: [[[2, 1], [1, 2]]], expect: [[2, 1], [1, 2]] },
  { name: 'one row becomes one column', args: [[[4, 5, 6]]], expect: [[4], [5], [6]] },
];

export const buildMatmul: BuildDef = {
  id: 'c12-matmul', fn: 'matmul', title: 'Two moves in a row, as one matrix',
  brief: 'Write `matmul(A, B)`: the single matrix for **B first, then A**.\n\nColumn `j` of the answer is where $\\mathbf e_j$ ends up: `matvec(A, column j of B)`. Build the columns with your `matvec`, then write them back as rows.\n\nA 3 × 3 product needs 27 multiplications: 9 entries, 3 each.',
  starter: 'def matmul(A, B):\n    """Return A B: column j is A times column j of B (B acts first)."""\n    columns = []\n    # column j of B is [row[j] for row in B]\n    return [[c[i] for c in columns] for i in range(len(A))]\n',
  fill: 'def matmul(A, B):\n    """Return A B: column j is A times column j of B (B acts first)."""\n    columns = [matvec(___, [row[j] for row in ___]) for j in range(len(B[0]))]\n    return [[c[___] for c in columns] for i in range(len(A))]\n',
  signature: 'def matmul(A, B):\n    """Return A B: column j is A times column j of B (B acts first)."""\n',
  solution: `${MATMUL_LINES.join('\n')}\n`,
  assemble: { lines: MATMUL_LINES, decoys: ['    columns = [matvec(B, [row[j] for row in A]) for j in range(len(A[0]))]', '    return [[A[i][j] * B[i][j] for j in range(len(B[0]))] for i in range(len(A))]'] },
  uses: ['matvec', 'lincomb', 'scale', 'add'],
  tests: MATMUL_TESTS,
  swarm: { gen: (r, level) => matmulCase(r, level), crew: (...a: unknown[]) => matMul(a[0] as Mat, a[1] as Mat) },
  docPrompt: 'What question does `matmul` answer, and why is column j of the answer A times column j of B? Write it the way you would tell Bram.',
  ilseNote: '`matmul(A, B)`: two moves as one. B acts first, so e_j goes to column j of B, and then A moves it. Each column of the product is A times a column of B. Entry (i, j) is row i of A dotted with column j of B.',
  payoff: 'The forecast fuses the pulse and the stabiliser turn with your `matmul`: one matrix, one set of ghosts.',
};

export const buildTranspose: BuildDef = {
  id: 'c12-transpose', fn: 'transpose', title: 'Rows into columns',
  brief: 'Write `transpose(A)`: the matrix whose column `j` is row `j` of `A`. An $m \\times n$ matrix becomes $n \\times m$.\n\nIt is the matrix that moves `A` to the other side of a dot product.',
  starter: 'def transpose(A):\n    """Return A with its rows written as columns."""\n    return []\n',
  fill: 'def transpose(A):\n    """Return A with its rows written as columns."""\n    return [[row[___] for row in A] for j in range(len(A[___]))]\n',
  signature: 'def transpose(A):\n    """Return A with its rows written as columns."""\n',
  solution: `${TRANSPOSE_LINES.join('\n')}\n`,
  assemble: { lines: TRANSPOSE_LINES, decoys: ['    return [[row[j] for row in A] for j in range(len(A))]'] },
  tests: TRANSPOSE_TESTS,
  swarm: { gen: (r, level) => transposeCase(r, level), crew: (...a: unknown[]) => transpose(a[0] as Mat) },
  docPrompt: 'What does `transpose` do to a matrix, and what is it for? Write it the way you would tell Bram.',
  ilseNote: '`transpose(A)`: rows become columns. It moves A across a dot product: (A x)·y = x·(Aᵀ y). For two moves in a row the order flips: (AB)ᵀ = BᵀAᵀ.',
  payoff: 'LANTERN moves matrices across its dot-product checks with your `transpose`.',
};
