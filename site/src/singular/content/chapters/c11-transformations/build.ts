// Chapter 11 build (GDD §5.5): matvec(A, x), the column view through Chapter 2's lincomb.
// Plain data and maths (no DOM): tests/singular/game-c11.test.ts runs the reference in CPython.
import type { BuildDef } from '../../../game/types.ts';
import { matVec, type Mat } from '../../../math/la.ts';
import { rint } from '../../../game/lawcheck.ts';

const SOLUTION_LINES = [
  'def matvec(A, x):',
  '    """Return A x: the columns of A mixed, with x as the weights."""',
  '    columns = [[row[j] for row in A] for j in range(len(x))]',
  '    return lincomb(x, columns)',
];

/** Random m × n matrix and x with entries on the level's number range. */
export function swarmCase(r: () => number, level: string): [Mat, number[]] {
  const m = rint(r, 2, 3), n = rint(r, 2, 3);
  const num = () => (level === 'cadet' ? rint(r, -5, 5) : level === 'navigator' ? rint(r, -10, 10) / 2 : rint(r, -50, 50) / 10);
  const A = Array.from({ length: m }, () => Array.from({ length: n }, num));
  return [A, Array.from({ length: n }, num)];
}

export const TESTS = [
  { name: 'the buoy from (3, 2): `matvec([[1, -2], [1, -1]], [3, 2])` is `[-1, 1]`', args: [[[1, -2], [1, -1]], [3, 2]], expect: [-1, 1] },
  { name: '$\\mathbf e_2$ picks out the second column', args: [[[1, -2], [1, -1]], [0, 1]], expect: [-2, -1] },
  { name: '(1, −1) stays where it is under columns (2, 1) and (1, 2)', args: [[[2, 1], [1, 2]], [1, -1]], expect: [1, -1] },
  { name: 'a 2 × 3 matrix: three weights in, two numbers out', args: [[[1, 0, 2], [0, 1, -1]], [3, 1, 2]], expect: [7, -1] },
  { name: 'a 3 × 2 matrix: two weights in, three numbers out', args: [[[1, 2], [3, 4], [5, 6]], [1, 1]], expect: [3, 7, 11] },
  { name: '3-D: the beacon (1, 1, 1) lands on (2, 2, 1)', args: [[[1, 1, 0], [0, 1, 1], [0, 0, 1]], [1, 1, 1]], expect: [2, 2, 1] },
  { name: 'the origin does not move', args: [[[1, -2], [1, -1]], [0, 0]], expect: [0, 0] },
];

export const buildMatvec: BuildDef = {
  id: 'c11-matvec', fn: 'matvec', title: 'Where does one point land?',
  brief: 'Write `matvec(A, x)`. `A` is a list of rows, such as `[[1, -2], [1, -1]]`. `x` has one number per column of `A`.\n\nReturn $A\\mathbf x$: **the mix of the columns of `A`, with the numbers in `x` as the weights**. Your `lincomb(cs, vs)` from Chapter 2 does the mixing.\n\nThe columns are not stored as lists: column `j` is `[row[j] for row in A]`.\n\nOn Write you may also use the row view: entry `i` is `dot(A[i], x)`, row `i` dotted with `x`.',
  starter: 'def matvec(A, x):\n    """Return A x: the columns of A mixed, with x as the weights."""\n    columns = []\n    # column j of A is [row[j] for row in A]\n    return lincomb(x, columns)\n',
  fill: 'def matvec(A, x):\n    """Return A x: the columns of A mixed, with x as the weights."""\n    columns = [[row[___] for row in ___] for j in range(len(___))]\n    return lincomb(___, columns)\n',
  signature: 'def matvec(A, x):\n    """Return A x: the columns of A mixed, with x as the weights.\n\n    (The row view works too: entry i is row i dotted with x.)"""\n',
  solution: `${SOLUTION_LINES.join('\n')}\n`,
  assemble: {
    lines: SOLUTION_LINES,
    decoys: ['    columns = A', '    return [A[i][i] * x[i] for i in range(len(x))]'],
  },
  uses: ['lincomb', 'scale', 'add', 'dot'],
  tests: TESTS,
  swarm: { gen: (r, level) => swarmCase(r, level), crew: (...a: unknown[]) => matVec(a[0] as Mat, a[1] as number[]) },
  docPrompt: 'What question does `matvec` answer, and why does the code work? Write it the way you would tell Bram.',
  ilseNote: '`matvec(A, x)`: where x lands. Mix the columns of A, with the numbers of x as weights: the columns are where the grid arrows land. Entry i is also row i dotted with x, which is how a computer usually adds it up.',
  payoff: 'The pulse forecast runs your `matvec` on every buoy in view, and the next pulse lands each buoy on your ghost.',
};
