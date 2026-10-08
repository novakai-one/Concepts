// Chapter 16 builds (GDD §5.5): rank (columns minus the arrows null_space finds: rank–nullity, in
// code) and basis_for_span (the arrows that hold pivots, via col_space). Python on plain lists.
import type { BuildDef } from '../../../game/types';
import { crew, swarmVecs } from './logic';
import { swarmMat } from '../c15-nullspace/logic';

const RANK = `def rank(A):
    """Return how many directions A keeps: columns minus flattened."""
    columns = len(A[0])
    flattened = len(null_space(A))
    return columns - flattened
`;

export const buildRank: BuildDef = {
  id: 'c16-rank', fn: 'rank', title: 'How many directions survive?',
  brief: 'Write `rank(A)`: the number of directions `A` keeps. Every column is kept or flattened, never both, and your `null_space(A)` returns one arrow per flattened direction. So the kept ones are the columns minus those arrows.',
  starter: 'def rank(A):\n    """Return how many directions A keeps: columns minus flattened."""\n    columns = len(A[0])\n    # how many directions does A flatten?\n    return columns\n',
  fill: RANK.replace('    flattened = len(null_space(A))', '    flattened = len(___)').replace('    return columns - flattened', '    return ___'),
  solution: RANK,
  assemble: { lines: RANK.trimEnd().split('\n'), decoys: ['    columns = len(A)', '    return columns + flattened'] },
  uses: ['rref', 'null_space'],
  tests: [
    { name: 'the two-decimal model keeps 2: `rank([[1, 0, 1], [0, 1, 1], [1, 1, 2]])`', args: [[[1, 0, 1], [0, 1, 1], [1, 1, 2]]], expect: 2 },
    { name: 'the scanner matrix keeps 2 of 4', args: [[[1, 2, 0, 1], [2, 4, 1, 4], [3, 6, 1, 5]]], expect: 2 },
    { name: 'an undo exists, nothing flattened: `rank([[2, 1], [1, 1]])`', args: [[[2, 1], [1, 1]]], expect: 2 },
    { name: 'the damaged arm keeps 1', args: [[[1, 2, 3], [2, 4, 6]]], expect: 1 },
    { name: 'a 3 × 5 keeps at most 3', args: [[[1, 0, 0, 1, 2], [0, 1, 0, 3, 1], [0, 0, 1, 1, 1]]], expect: 3 },
    { name: 'the zero matrix keeps nothing', args: [[[0, 0], [0, 0]]], expect: 0 },
  ],
  swarm: { gen: (r, d) => [swarmMat(r, d)], crew: (A) => crew.rank(A as number[][]) },
  docPrompt: 'Why is the rank the number of columns minus the number of arrows `null_space` returns?',
  ilseNote: 'rank(A) = n − nullity: every column is a pivot column or a free one. The pivots are the directions that survive.',
  payoff: 'Vell’s survey scanner reports kept and flattened directions with your `rank`.',
};

const BASIS = `def basis_for_span(vs):
    """Return the arrows of vs that hold pivots: a basis of their span."""
    A = [[v[i] for v in vs] for i in range(len(vs[0]))]
    return col_space(A)
`;

export const buildBasis: BuildDef = {
  id: 'c16-basis', fn: 'basis_for_span', title: 'The fewest arrows with the same reach',
  brief: 'Write `basis_for_span(vs)`. `vs` is a list of arrows of the same length. Return a basis for their span: the arrows from `vs` that hold pivots, in order, so none is wasted.\n\nPut the arrows in a matrix **as columns**, then your `col_space` finds the ones that add a new direction.',
  starter: 'def basis_for_span(vs):\n    """Return the arrows of vs that hold pivots: a basis of their span."""\n    # each arrow becomes a column\n    A = []\n    return A\n',
  fill: BASIS.replace('    A = [[v[i] for v in vs] for i in range(len(vs[0]))]', '    A = [[v[i] for v in ___] for i in range(len(vs[0]))]').replace('    return col_space(A)', '    return ___'),
  solution: BASIS,
  assemble: { lines: BASIS.trimEnd().split('\n'), decoys: ['    A = [list(v) for v in vs]'] },
  uses: ['rref', 'null_space', 'col_space'],
  tests: [
    { name: 'four strut arrows on one sheet: two are enough', args: [[[1, 0, 1], [0, 1, 1], [1, 1, 2], [2, 1, 3]]], expect: [[1, 0, 1], [0, 1, 1]] },
    { name: 'a repeated arrow is dropped', args: [[[1, 2], [2, 4], [0, 1]]], expect: [[1, 2], [0, 1]] },
    { name: 'three that reach all of 3-D stay', args: [[[1, 0, 1], [0, 1, 1], [0, 0, 1]]], expect: [[1, 0, 1], [0, 1, 1], [0, 0, 1]] },
    { name: 'a zero arrow adds nothing', args: [[[0, 0, 0], [1, 1, 2]]], expect: [[1, 1, 2]] },
  ],
  swarm: { gen: (r, d) => [swarmVecs(r, d)], crew: (vs) => crew.basis_for_span(vs as number[][]) },
  docPrompt: 'Why do the arrows that hold pivots reach everything the whole list reaches, with none wasted?',
  ilseNote: 'basis_for_span(vs): stand the arrows up as columns; keep the pivot columns. Each one adds a direction the earlier ones could not reach.',
  payoff: 'The survey scanner lists the stern’s surviving directions with your `basis_for_span`.',
};
