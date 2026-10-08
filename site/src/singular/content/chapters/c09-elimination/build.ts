// Chapter 9 builds (GDD §5.5): row_echelon(M) and back_sub(M). Pure data plus crew versions and swarm
// generators (Node tests run the references in CPython).
import type { BuildDef } from '../../../game/types.ts';
import { randInt, randNZ } from '../c08-systems/act3.ts';
import { backSubCrew, rowEchelonCrew } from './logic.ts';

/** A random augmented matrix with small whole entries; sometimes a zero where the first pivot would be. */
function randM(r: () => number): number[][] {
  const m = randInt(r, 2, 4), n = randInt(r, 2, 4);
  const M = Array.from({ length: m }, () => Array.from({ length: n + 1 }, () => randInt(r, -5, 5)));
  if (r() < 0.3) M[0][0] = 0;
  return M;
}

/** A random square staircase with non-zero pivots (for back_sub). */
function randStair(r: () => number): number[][] {
  const n = randInt(r, 2, 4);
  return Array.from({ length: n }, (_, i) => Array.from({ length: n + 1 }, (_, c) => (c < i ? 0 : c === i ? randNZ(r, 4) : randInt(r, -5, 5))));
}

export const buildRowEchelon: BuildDef = {
  id: 'c09-row-echelon', fn: 'row_echelon', title: 'Make the staircase',
  brief: 'Write `row_echelon(M)`. `M` is an augmented matrix as a list of rows, such as `[[1, 2, 1, 8], [2, 5, 4, 24], [1, 3, 4, 19]]` (the last number of each row is its right side).\n\nWork column by column, leaving the right-side column alone. In each column, take the **first** row (from the current row down) whose entry there is not 0, and swap it up to the current row. Then subtract a multiple of it from every row below so their entries in that column become 0. Do not scale rows. Move one row down and go on to the next column. Return the new rows.',
  starter: 'def row_echelon(M):\n    """A row echelon form of the augmented matrix M (a list of rows)."""\n    M = [row[:] for row in M]\n    rows, cols = len(M), len(M[0]) - 1\n    r = 0\n    for c in range(cols):\n        # 1. find the first row from r down with M[i][c] != 0 (skip the column if none)\n        # 2. swap it up to row r\n        # 3. clear every entry below it in column c\n        pass\n    return M\n',
  solution: 'def row_echelon(M):\n    """A row echelon form of the augmented matrix M (a list of rows)."""\n    M = [row[:] for row in M]\n    rows, cols = len(M), len(M[0]) - 1\n    r = 0\n    for c in range(cols):\n        p = next((i for i in range(r, rows) if abs(M[i][c]) > 1e-12), None)\n        if p is None:\n            continue\n        M[r], M[p] = M[p], M[r]\n        for i in range(r + 1, rows):\n            f = M[i][c] / M[r][c]\n            M[i] = [a - f * b for a, b in zip(M[i], M[r])]\n        r += 1\n        if r == rows:\n            break\n    return M\n',
  fill: 'def row_echelon(M):\n    """A row echelon form of the augmented matrix M (a list of rows)."""\n    M = [row[:] for row in M]\n    rows, cols = len(M), len(M[0]) - 1\n    r = 0\n    for c in range(cols):\n        p = next((i for i in range(r, rows) if abs(M[i][c]) > 1e-12), None)\n        if p is None:\n            continue\n        M[r], M[p] = ___, ___\n        for i in range(r + 1, rows):\n            f = M[i][c] / ___\n            M[i] = [a - f * b for a, b in zip(M[i], ___)]\n        r += 1\n        if r == rows:\n            break\n    return M\n',
  // Assemble: a shorter form of the same steps (it returns exactly the same rows)
  assemble: {
    lines: [
      'def row_echelon(M):',
      '    M = [row[:] for row in M]',
      '    r = 0',
      '    for c in range(len(M[0]) - 1):',
      '        p = next((i for i in range(r, len(M)) if abs(M[i][c]) > 1e-12), None)',
      '        if p is None:',
      '            continue',
      '        M[r], M[p] = M[p], M[r]',
      '        for i in range(r + 1, len(M)):',
      '            M[i] = [a - M[i][c] / M[r][c] * b for a, b in zip(M[i], M[r])]',
      '        r += 1',
      '    return M',
    ],
    decoys: ['        M[r], M[p] = M[r], M[p]', '            M[i] = [a - M[i][c] / M[0][c] * b for a, b in zip(M[i], M[r])]'],
  },
  tests: [
    { name: 'the power board becomes the staircase', args: [[[1, 2, 1, 8], [2, 5, 4, 24], [1, 3, 4, 19]]], expect: [[1, 2, 1, 8], [0, 1, 2, 8], [0, 0, 1, 3]] },
    { name: 'a 0 on top: swap first', args: [[[0, 2, 1, 5], [1, 1, 1, 4], [2, 1, 0, 4]]], expect: [[1, 1, 1, 4], [0, 2, 1, 5], [0, 0, -1.5, -1.5]] },
    { name: 'two lines: x + 2y = 3, 2x + 4y = 7 give the row 0 = 1', args: [[[1, 2, 3], [2, 4, 7]]], expect: [[1, 2, 3], [0, 0, 1]] },
    { name: 'a column with no pivot is skipped', args: [[[1, 2, 1, 1], [2, 4, 0, 6], [1, 2, 2, 7]]], expect: [[1, 2, 1, 1], [0, 0, -2, 4], [0, 0, 0, 8]] },
    { name: 'M itself is not changed (a copy is returned)', args: [[[2, 1, 4], [1, -1, -1]]], expect: [[2, 1, 4], [0, -1.5, -3]] },
  ],
  swarm: { gen: (r) => [randM(r)], crew: (M) => rowEchelonCrew(M as number[][]), tol: 1e-6 },
  docPrompt: 'Why does clearing below each pivot, column by column, never change where the planes meet? Write it the way you would tell Bram.',
  ilseNote: 'row_echelon: for each column, bring a row with a non-zero entry to the top of what is left, then subtract multiples of it from the rows below. Each step is a row operation, so the solutions never change.',
  payoff: 'Power routing runs on your `row_echelon`: the generators light from your staircase.',
};

export const buildBackSub: BuildDef = {
  id: 'c09-back-sub', fn: 'back_sub', title: 'Climb back',
  brief: 'Write `back_sub(M)`. `M` is a square staircase: row `i` has its pivot `M[i][i]` (not 0) and zeros to its left, and the last number of each row is its right side.\n\nSolve the bottom row first. Then work upward: in row `i`, take the right side, subtract the parts you already know, and divide by the pivot. Return the list of values `[x1, x2, …]`.',
  starter: 'def back_sub(M):\n    """Solve the square staircase M, bottom row first."""\n    n = len(M)\n    x = [0] * n\n    for i in range(n - 1, -1, -1):\n        # right side, minus what is already known, divided by the pivot\n        pass\n    return x\n',
  solution: 'def back_sub(M):\n    """Solve the square staircase M, bottom row first."""\n    n = len(M)\n    x = [0] * n\n    for i in range(n - 1, -1, -1):\n        known = sum(M[i][c] * x[c] for c in range(i + 1, n))\n        x[i] = (M[i][n] - known) / M[i][i]\n    return x\n',
  fill: 'def back_sub(M):\n    """Solve the square staircase M, bottom row first."""\n    n = len(M)\n    x = [0] * n\n    for i in range(n - 1, -1, -1):\n        known = sum(M[i][c] * x[c] for c in range(___, n))\n        x[i] = (M[i][n] - ___) / ___\n    return x\n',
  assemble: {
    lines: [
      'def back_sub(M):',
      '    n = len(M)',
      '    x = [0] * n',
      '    for i in range(n - 1, -1, -1):',
      '        known = sum(M[i][c] * x[c] for c in range(i + 1, n))',
      '        x[i] = (M[i][n] - known) / M[i][i]',
      '    return x',
    ],
    decoys: ['    for i in range(n):', '        x[i] = (M[i][n] + known) / M[i][i]'],
  },
  tests: [
    { name: 'the staircase gives generators 1, 2, 3', args: [[[1, 2, 1, 8], [0, 1, 2, 8], [0, 0, 1, 3]]], expect: [1, 2, 3] },
    { name: 'pivots that are not 1: the relays give (1, 2, 1)', args: [[[1, 1, 1, 4], [0, 2, 1, 5], [0, 0, -1.5, -1.5]]], expect: [1, 2, 1] },
    { name: 'two unknowns: 2x + y = 4, −1.5y = −3', args: [[[2, 1, 4], [0, -1.5, -3]]], expect: [1, 2] },
    { name: 'one unknown: 4x = 10', args: [[[4, 10]]], expect: [2.5] },
  ],
  swarm: { gen: (r) => [randStair(r)], crew: (M) => backSubCrew(M as number[][]), tol: 1e-6 },
  docPrompt: 'Why must back substitution start from the bottom row? Write it the way you would tell Bram.',
  ilseNote: 'back_sub: the last row has one unknown, so read it first. Each row above has one new unknown once the ones below are known.',
  payoff: 'The generators run at the values your `back_sub` reads off.',
};
