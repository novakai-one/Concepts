// Chapter 15 builds (GDD §5.5): null_space (reduce, then read one arrow per free column) and
// col_space (the original columns that hold pivots). Python on plain lists.
// The arrows null_space returns are fixed by the matrix (each free variable 1 in turn, the other free
// variables 0), so the swarm can compare them with LANTERN's backup entry by entry.
import type { BuildDef } from '../../../game/types';
import { crew, swarmMat } from './logic';

const NULL_SPACE = `def null_space(A):
    """Return the arrows A sends to the origin, one per free column."""
    R = rref(A)
    n = len(A[0])
    pivots = []
    for row in R:
        lead = next((c for c, x in enumerate(row) if x != 0), None)
        if lead is not None:
            pivots.append(lead)
    arrows = []
    for free in range(n):
        if free not in pivots:
            x = [0.0] * n
            x[free] = 1.0
            for i, pc in enumerate(pivots):
                x[pc] = -R[i][free]
            arrows.append(x)
    return arrows
`;

export const buildNullSpace: BuildDef = {
  id: 'c15-null-space', fn: 'null_space', title: 'What does a matrix send to the origin?',
  brief: 'Write `null_space(A)` for a matrix `A` (a list of rows). Reduce it with your `rref` and note each row\'s **pivot column** (its first non-zero entry). Then, for each **free** column (no pivot), build one arrow: that variable 1, the other free variables 0, and each pivot variable read from its row: `x[pivot] = -R[row][free]`.\n\nReturn the list of arrows, free columns in order. Return `[]` when every column has a pivot.',
  starter: 'def null_space(A):\n    """Return the arrows A sends to the origin, one per free column."""\n    R = rref(A)\n    n = len(A[0])\n    pivots = []\n    # the first non-zero entry of each row is a pivot\n    arrows = []\n    # one arrow per free column\n    return arrows\n',
  fill: NULL_SPACE.replace('        if free not in pivots:', '        if free not in ___:').replace('            x[free] = 1.0', '            x[free] = ___').replace('                x[pc] = -R[i][free]', '                x[pc] = ___'),
  solution: NULL_SPACE,
  assemble: {
    lines: NULL_SPACE.trimEnd().split('\n'),
    decoys: ['                x[pc] = R[i][free]', '            x[free] = 0.0'],
  },
  uses: ['rref'],
  tests: [
    { name: 'the two-decimal model: `null_space([[1, 0, 1], [0, 1, 1], [1, 1, 2]])`', args: [[[1, 0, 1], [0, 1, 1], [1, 1, 2]]], expect: [[-1, -1, 1]] },
    { name: 'an undo exists, nothing goes to the origin: `null_space([[2, 1], [1, 1]])`', args: [[[2, 1], [1, 1]]], expect: [] },
    { name: 'the salvage arm: `null_space([[1, 0, 1], [0, 1, 1]])`', args: [[[1, 0, 1], [0, 1, 1]]], expect: [[-1, -1, 1]] },
    { name: 'two free columns: `null_space([[1, 2, 3], [2, 4, 6]])`', args: [[[1, 2, 3], [2, 4, 6]]], expect: [[-2, 1, 0], [-3, 0, 1]] },
    { name: 'a zero first column needs no pivot: `null_space([[0, 1], [0, 2]])`', args: [[[0, 1], [0, 2]]], expect: [[1, 0]] },
  ],
  swarm: { gen: (r, d) => [swarmMat(r, d)], crew: (A) => crew.null_space(A as number[][]), tol: 1e-6 },
  docPrompt: 'What question does `null_space` answer, and why does each free column give exactly one arrow? Write it the way you would tell Bram.',
  ilseNote: 'null_space(A): reduce, then each free variable in turn is 1 and the rest 0. The pivot variables are read off their rows. These arrows land on the origin; every solution of Ax = b is one solution plus a mix of them.',
  payoff: 'The debris sorter groups pieces that landed together with your `null_space`. It finds every loop exactly, where Chapter 3\'s search tried whole numbers.',
};

const COL_SPACE = `def col_space(A):
    """Return the columns of A itself that hold pivots."""
    n = len(A[0])
    kept = []
    flat = 0
    for j in range(n):
        first = [row[:j + 1] for row in A]
        now = len(null_space(first))
        if now == flat:
            kept.append([row[j] for row in A])
        flat = now
    return kept
`;

export const buildColSpace: BuildDef = {
  id: 'c15-col-space', fn: 'col_space', title: 'Which columns hold the reach?',
  brief: 'Write `col_space(A)`. Return the columns **of A itself** that hold pivots, in order: their span is the column space.\n\nA column holds a pivot exactly when it is not a mix of the columns before it. Test that with your `null_space`: take the first `j + 1` columns. If they send **no more** arrows to the origin than the first `j` did, column `j` added a new direction: keep it.',
  starter: 'def col_space(A):\n    """Return the columns of A itself that hold pivots."""\n    n = len(A[0])\n    kept = []\n    flat = 0\n    for j in range(n):\n        first = [row[:j + 1] for row in A]\n        # keep column j when it adds no arrow to the null space\n    return kept\n',
  fill: COL_SPACE.replace('        if now == flat:', '        if now == ___:').replace('            kept.append([row[j] for row in A])', '            kept.append(___)'),
  solution: COL_SPACE,
  assemble: {
    lines: COL_SPACE.trimEnd().split('\n'),
    decoys: ['        if now > flat:'],
  },
  uses: ['rref', 'null_space'],
  tests: [
    { name: 'the two-decimal model keeps (1, 0, 1) and (0, 1, 1)', args: [[[1, 0, 1], [0, 1, 1], [1, 1, 2]]], expect: [[1, 0, 1], [0, 1, 1]] },
    { name: 'the columns of A, not of its reduced form', args: [[[1, 2, 0, 1], [2, 4, 1, 4], [3, 6, 1, 5]]], expect: [[1, 2, 3], [0, 1, 1]] },
    { name: 'the damaged arm keeps one column', args: [[[1, 2, 3], [2, 4, 6]]], expect: [[1, 2]] },
    { name: 'a zero column is never kept', args: [[[0, 1], [0, 1]]], expect: [[1, 1]] },
    { name: 'nothing flattened: every column kept', args: [[[2, 1], [1, 1]]], expect: [[2, 1], [1, 1]] },
  ],
  swarm: { gen: (r, d) => [swarmMat(r, d)], crew: (A) => crew.col_space(A as number[][]), tol: 1e-6 },
  docPrompt: 'Why must `col_space` return columns of A itself and not columns of its reduced form?',
  ilseNote: 'col_space(A): the pivot columns of A as it was. Row operations change the columns, so the reduced form only says which ones to take.',
  payoff: 'The landing-plane readout now names its two arrows with your `col_space`.',
};
