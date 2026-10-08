// Chapter 17 builds (GDD §5.5): to_coords (solve), from_coords (matvec), in_grid (P⁻¹ A P). Python on
// plain lists. The spire translator runs on them: it converts a ship-grid move into the Anchor's grid.
// Plain data and maths (no DOM): tests/singular/game-c17.test.ts runs the references in CPython.
import type { BuildDef } from '../../../game/types.ts';
import type { Mat, Vec } from '../../../math/la.ts';
import { crew, swarmGrid, swarmMat, swarmVec } from './logic.ts';

export const TO_COORDS = `def to_coords(B, x):
    """Return the numbers c with B c = x: how much of each grid arrow (a column of B) reaches x."""
    M = [row + [xi] for row, xi in zip(B, x)]
    s = solve(M)
    if s['kind'] != 'one':
        return None
    return s['point']
`;

export const FROM_COORDS = `def from_coords(B, c):
    """Return the point reached by c[0] of the first grid arrow, c[1] of the second, and so on."""
    return matvec(B, c)
`;

export const IN_GRID = `def in_grid(P, A):
    """Return the move A written in the grid whose arrows are the columns of P: P^-1 A P."""
    into = inverse(P)
    moved = matmul(A, P)
    return matmul(into, moved)
`;

/** A to_coords case: a grid (sometimes flat, to test the None) and a point. */
export function toCoordsCase(r: () => number, level: string): [Mat, Vec] {
  const G = swarmGrid(r, level);
  if (r() < 0.12) { G.forEach((row) => { row[row.length - 1] = row[0] * 2; }); }   // last arrow = 2 × the first: no grid
  return [G, swarmVec(r, level, G.length)];
}
export function fromCoordsCase(r: () => number, level: string): [Mat, Vec] {
  const G = swarmGrid(r, level);
  return [G, swarmVec(r, level, G.length)];
}
export function inGridCase(r: () => number, level: string): [Mat, Mat] {
  const G = swarmGrid(r, level);
  return [G, swarmMat(r, level, G.length)];
}

export const TO_COORDS_TESTS = [
  { name: 'the buoy (3, 2) in the Anchor’s grid: `to_coords([[1, 1], [0, 1]], [3, 2])` is `[1, 2]`', args: [[[1, 1], [0, 1]], [3, 2]], expect: [1, 2] },
  { name: 'Vell’s grid: `to_coords([[1, -1], [1, 1]], [3, 1])` is `[2, -1]`', args: [[[1, -1], [1, 1]], [3, 1]], expect: [2, -1] },
  { name: 'our own grid changes nothing', args: [[[1, 0], [0, 1]], [4, -2]], expect: [4, -2] },
  { name: 'fractions: `to_coords([[2, 1], [0, 2]], [1, 1])` is `[0.25, 0.5]`', args: [[[2, 1], [0, 2]], [1, 1]], expect: [0.25, 0.5] },
  { name: 'Teo’s position (4, 3) in the Anchor’s grid is `[1, 3]`', args: [[[1, 1], [0, 1]], [4, 3]], expect: [1, 3] },
  { name: '3-D: the Anchor’s three arms', args: [[[1, 1, 0], [0, 1, 0], [0, 0, 1]], [3, 1, 2]], expect: [2, 1, 2] },
  { name: 'two arrows on one line make no grid: `None`', args: [[[1, 2], [2, 4]], [1, 2]], expect: null },
];
export const FROM_COORDS_TESTS = [
  { name: 'the Anchor’s (2, −1) is our (1, −1): `from_coords([[1, 1], [0, 1]], [2, -1])`', args: [[[1, 1], [0, 1]], [2, -1]], expect: [1, -1] },
  { name: 'the Anchor’s (1, 2) is our (3, 2)', args: [[[1, 1], [0, 1]], [1, 2]], expect: [3, 2] },
  { name: 'Vell’s (2, −1) is our (3, 1)', args: [[[1, -1], [1, 1]], [2, -1]], expect: [3, 1] },
  { name: 'no steps of any arrow: the origin', args: [[[1, 1], [0, 1]], [0, 0]], expect: [0, 0] },
  { name: '3-D: the Anchor’s (2, 1, 2) is our (3, 1, 2)', args: [[[1, 1, 0], [0, 1, 0], [0, 0, 1]], [2, 1, 2]], expect: [3, 1, 2] },
];
export const IN_GRID_TESTS = [
  { name: 'what Ilse meant: `in_grid([[1, 1], [0, 1]], [[0, -1], [1, 0]])` is `[[-1, -2], [1, 1]]`', args: [[[1, 1], [0, 1]], [[0, -1], [1, 0]]], expect: [[-1, -2], [1, 1]] },
  { name: 'the measured pulse, written in the Anchor’s grid, is Ilse’s quarter turn', args: [[[1, 1], [0, 1]], [[1, -2], [1, -1]]], expect: [[0, -1], [1, 0]] },
  { name: 'in our own grid nothing changes', args: [[[1, 0], [0, 1]], [[2, 1], [1, 2]]], expect: [[2, 1], [1, 2]] },
  { name: 'a stretch along the grid lines: `in_grid([[1, 1], [1, -1]], [[2, 1], [1, 2]])` is `[[3, 0], [0, 1]]`', args: [[[1, 1], [1, -1]], [[2, 1], [1, 2]]], expect: [[3, 0], [0, 1]] },
  { name: '3-D: the spire setting that swings the ark clear', args: [[[1, 1, 0], [0, 1, 0], [0, 0, 1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]]], expect: [[-1, -2, 0], [1, 1, 0], [0, 0, 1]] },
];

export const buildToCoords: BuildDef = {
  id: 'c17-to-coords', fn: 'to_coords', title: 'A point’s numbers in another grid',
  brief: 'Write `to_coords(B, x)`. The columns of `B` are a grid’s arrows, written in our numbers. Return the grid’s numbers `c` of the point `x`: the amounts of each arrow that reach it, so that `B c = x`.\n\nThat is a system of equations. Stand `x` beside `B` as an augmented matrix and use your `solve`. Return `None` unless there is exactly one answer (arrows on one line make no grid).',
  starter: 'def to_coords(B, x):\n    """Return the numbers c with B c = x: how much of each grid arrow (a column of B) reaches x."""\n    # one row per equation: the row of B, then x\'s entry\n    M = []\n    return None\n',
  fill: 'def to_coords(B, x):\n    """Return the numbers c with B c = x: how much of each grid arrow (a column of B) reaches x."""\n    M = [row + [___] for row, xi in zip(B, x)]\n    s = solve(___)\n    if s[\'kind\'] != ___:\n        return None\n    return s[___]\n',
  solution: TO_COORDS,
  assemble: { lines: TO_COORDS.trimEnd().split('\n'), decoys: ['    return matvec(B, x)', '    M = [row for row in B] + [x]'] },
  uses: ['rref', 'solve'],
  tests: TO_COORDS_TESTS,
  swarm: { gen: (r, d) => toCoordsCase(r, d), crew: (B, x) => crew.to_coords(B as Mat, x as Vec), tol: 1e-6 },
  docPrompt: 'Why does solving B c = x give the point’s numbers in the grid B? Write it the way you would tell Bram.',
  ilseNote: 'to_coords(B, x): the grid’s numbers are the weights on its arrows that reach x. Finding weights is solving B c = x. B itself goes the other way.',
  payoff: 'The spire translator reads every ship-grid point in the Anchor’s numbers with your `to_coords`.',
};

export const buildFromCoords: BuildDef = {
  id: 'c17-from-coords', fn: 'from_coords', title: 'Back to our numbers',
  brief: 'Write `from_coords(B, c)`: the point, in our numbers, that a grid’s numbers `c` describe. It is `c[0]` of the first arrow plus `c[1]` of the second (and so on): a mix of the columns of `B` with `c` as the weights. Your `matvec` does exactly that.',
  starter: 'def from_coords(B, c):\n    """Return the point reached by c[0] of the first grid arrow, c[1] of the second, and so on."""\n    # mix the columns of B with the numbers in c as weights\n    return None\n',
  solution: FROM_COORDS,
  assemble: { lines: FROM_COORDS.trimEnd().split('\n'), decoys: ['    return to_coords(B, c)', '    return [b * ci for b, ci in zip(B[0], c)]'] },
  uses: ['add', 'scale', 'lincomb', 'matvec'],
  tests: FROM_COORDS_TESTS,
  swarm: { gen: (r, d) => fromCoordsCase(r, d), crew: (B, c) => crew.from_coords(B as Mat, c as Vec), tol: 1e-6 },
  docPrompt: 'Why is turning a grid’s numbers back into ours one matrix–vector product?',
  ilseNote: 'from_coords(B, c) = B c: the columns of B are the grid arrows in our numbers, and c says how much of each. This is the direction P goes. I never wrote P down: I took the Anchor’s arms for ours.',
  payoff: 'The spire translator draws every Anchor reading in our grid with your `from_coords`.',
};

export const buildInGrid: BuildDef = {
  id: 'c17-in-grid', fn: 'in_grid', title: 'A move, written in another grid',
  brief: 'Write `in_grid(P, A)`. The columns of `P` are a grid’s arrows; `A` is a move in our numbers. Return the same move written in the grid’s numbers: $P^{-1}AP$.\n\nRead it right to left: translate the grid’s numbers into ours (`P`), move (`A`), translate back (`inverse(P)`). With your `matmul`, the matrix that acts first goes on the right.',
  starter: 'def in_grid(P, A):\n    """Return the move A written in the grid whose arrows are the columns of P: P^-1 A P."""\n    # translate in, move, translate back: right to left\n    return A\n',
  fill: 'def in_grid(P, A):\n    """Return the move A written in the grid whose arrows are the columns of P: P^-1 A P."""\n    into = ___\n    moved = matmul(___, ___)\n    return matmul(into, ___)\n',
  solution: IN_GRID,
  assemble: { lines: IN_GRID.trimEnd().split('\n'), decoys: ['    moved = matmul(P, A)', '    return matmul(moved, into)'] },
  uses: ['identity', 'inverse', 'add', 'scale', 'lincomb', 'matvec', 'matmul'],
  tests: IN_GRID_TESTS,
  swarm: { gen: (r, d) => inGridCase(r, d), crew: (P, A) => crew.in_grid(P as Mat, A as Mat), tol: 1e-6 },
  docPrompt: 'Why is the move in the grid P equal to P⁻¹ A P and not P A P⁻¹?',
  ilseNote: 'in_grid(P, A) = P⁻¹ A P: grid numbers in, ours out (P), move (A), ours in, grid numbers out (P⁻¹). P A P⁻¹ is the reverse question: what a move written in the grid does to our space. That is the one the Anchor answered for me.',
  payoff: 'The spire translator converts every ship-grid move into the Anchor’s grid with your `in_grid` before the spires are set.',
};
