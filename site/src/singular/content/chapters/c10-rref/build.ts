// Chapter 10 builds (GDD §5.5): rref(M), solve(M) → {kind, point, directions}, and the refactor beat:
// Chapter 2's brute-force reachable(v, w, target) rebuilt on solve. Pure data, crew versions, swarms.
import type { BuildDef } from '../../../game/types.ts';
import { randConsistent, randInt, randNZ } from '../c08-systems/act3.ts';
import { reachableCrew, rrefCrew, solveCrew } from './logic.ts';

/** Random augmented matrices: consistent of every rank, and some with a contradiction. */
function randAugM(r: () => number): number[][] {
  const m = randInt(r, 1, 4), n = randInt(r, 1, 4);
  const M = randConsistent(r, m, n, randInt(r, 1, Math.min(m, n))).aug;
  if (r() < 0.25) M[m - 1][n] += randNZ(r, 3);
  return M;
}

const RREF_SOLUTION = 'def rref(M):\n    """The reduced row echelon form of M (any column may hold a pivot)."""\n    M = [row[:] for row in M]\n    rows, cols = len(M), len(M[0])\n    r = 0\n    for c in range(cols):\n        p = next((i for i in range(r, rows) if abs(M[i][c]) > 1e-9), None)\n        if p is None:\n            continue\n        M[r], M[p] = M[p], M[r]\n        pivot = M[r][c]\n        M[r] = [x / pivot for x in M[r]]\n        for i in range(rows):\n            if i != r and abs(M[i][c]) > 1e-12:\n                f = M[i][c]\n                M[i] = [a - f * b for a, b in zip(M[i], M[r])]\n        r += 1\n        if r == rows:\n            break\n    return [[0 if abs(x) < 1e-9 else x for x in row] for row in M]\n';

export const buildRref: BuildDef = {
  id: 'c10-rref', fn: 'rref', title: 'Finish the job',
  brief: 'Write `rref(M)`. Return the **reduced row echelon form** of `M`: every pivot is 1 and is the only non-zero number in its column. Treat every column the same, the right-hand one included (so a system with no solution ends with a row `[0, …, 0, 1]`).\n\nFor each column: find a row (from the current row down) with a non-zero entry, swap it up, divide it by its pivot, then subtract multiples of it from **every other** row, above and below. Round tiny leftovers (below `1e-9`) to 0.',
  starter: 'def rref(M):\n    """The reduced row echelon form of M (any column may hold a pivot)."""\n    M = [row[:] for row in M]\n    rows, cols = len(M), len(M[0])\n    r = 0\n    for c in range(cols):\n        # find a pivot row, swap it up, scale it to 1, clear the column above and below\n        pass\n    return M\n',
  solution: RREF_SOLUTION,
  fill: RREF_SOLUTION.replace('M[r] = [x / pivot for x in M[r]]', 'M[r] = [x / ___ for x in M[r]]').replace('        for i in range(rows):\n            if i != r', '        for i in range(___):\n            if i != ___').replace('M[i] = [a - f * b for a, b in zip(M[i], M[r])]', 'M[i] = [a - f * b for a, b in zip(M[i], ___)]'),
  // Assemble: a shorter form of the same steps (it returns the same matrix)
  assemble: {
    lines: [
      'def rref(M):',
      '    M = [row[:] for row in M]',
      '    r = 0',
      '    for c in range(len(M[0])):',
      '        p = next((i for i in range(r, len(M)) if abs(M[i][c]) > 1e-9), None)',
      '        if p is None:',
      '            continue',
      '        M[r], M[p] = M[p], M[r]',
      '        M[r] = [x / M[r][c] for x in M[r]]',
      '        M = [row if i == r else [a - row[c] * b for a, b in zip(row, M[r])] for i, row in enumerate(M)]',
      '        r += 1',
      '    return [[0 if abs(x) < 1e-9 else x for x in row] for row in M]',
    ],
    decoys: ['        M = [row if i <= r else [a - row[c] * b for a, b in zip(row, M[r])] for i, row in enumerate(M)]', '        M[r] = [x / M[0][c] for x in M[r]]'],
  },
  tests: [
    { name: 'the power board: every row names one unknown', args: [[[1, 2, 1, 8], [0, 1, 2, 8], [0, 0, 1, 3]]], expect: [[1, 0, 0, 1], [0, 1, 0, 2], [0, 0, 1, 3]] },
    { name: 'the pod bay flows: a zero row, x₃ free', args: [[[1, -1, 0, 2], [0, 1, -1, 1], [1, 0, -1, 3]]], expect: [[1, 0, -1, 3], [0, 1, -1, 1], [0, 0, 0, 0]] },
    { name: 'the lying meter: a pivot in the right-hand column', args: [[[1, -1, 0, 2], [0, 1, -1, 1], [1, 0, -1, 4]]], expect: [[1, 0, -1, 0], [0, 1, -1, 0], [0, 0, 0, 1]] },
    { name: 'a 0 on top: [0 2 | 4], [3 0 | 3]', args: [[[0, 2, 4], [3, 0, 3]]], expect: [[1, 0, 1], [0, 1, 2]] },
    { name: 'one equation: x + 2y − z = 4', args: [[[1, 2, -1, 4]]], expect: [[1, 2, -1, 4]] },
  ],
  swarm: { gen: (r) => [randAugM(r)], crew: (M) => rrefCrew(M as number[][]), tol: 1e-6 },
  docPrompt: 'Why does reduced row echelon form let you read every solution straight off the rows? Write it the way you would tell Bram.',
  ilseNote: 'rref: scale each pivot to 1 and clear its whole column. The result does not depend on the order of the steps, so it is a fingerprint of the system.',
  payoff: 'Flow routing in the pod bay runs on your `rref`.',
};

const SOLVE_SOLUTION = 'def solve(M):\n    """Solve [A | b]: its kind, a point, and a direction per free unknown."""\n    n = len(M[0]) - 1\n    R = rref(M)\n    pivots = []\n    for row in R:\n        lead = next((c for c, x in enumerate(row) if x != 0), None)\n        if lead is not None:\n            pivots.append(lead)\n    if n in pivots:\n        return {\'kind\': \'none\', \'point\': None, \'directions\': []}\n    point = [0] * n\n    for i, pc in enumerate(pivots):\n        point[pc] = R[i][n]\n    free = [c for c in range(n) if c not in pivots]\n    directions = []\n    for f in free:\n        d = [0] * n\n        d[f] = 1\n        for i, pc in enumerate(pivots):\n            d[pc] = -R[i][f]\n        directions.append(d)\n    return {\'kind\': \'many\' if free else \'one\', \'point\': point, \'directions\': directions}\n';

export const buildSolve: BuildDef = {
  id: 'c10-solve', fn: 'solve', title: 'Every answer, in one dictionary',
  brief: 'Write `solve(M)` for an augmented matrix `M`. Use your `rref`. Return a dictionary:\n\n- `\'kind\'`: `\'none\'` if the right-hand column has a pivot, `\'one\'` if every unknown has a pivot, `\'many\'` otherwise.\n- `\'point\'`: one solution, with every free unknown set to 0 (`None` when there is none).\n- `\'directions\'`: one list per free unknown, in order: that unknown 1, the other free ones 0, and each pivot unknown minus its row\'s entry in that column.',
  starter: 'def solve(M):\n    """Solve [A | b]: its kind, a point, and a direction per free unknown."""\n    n = len(M[0]) - 1\n    R = rref(M)\n    # 1. the pivot column of each non-zero row\n    # 2. a pivot in column n means no solution\n    # 3. the point: each pivot unknown reads its row\'s right side\n    # 4. one direction per free unknown\n    return {\'kind\': \'none\', \'point\': None, \'directions\': []}\n',
  solution: SOLVE_SOLUTION,
  fill: SOLVE_SOLUTION.replace('    if n in pivots:', '    if ___ in pivots:').replace('        point[pc] = R[i][n]', '        point[pc] = ___').replace('            d[pc] = -R[i][f]', '            d[pc] = ___'),
  // Assemble: a shorter form of the same reading of the rows
  assemble: {
    lines: [
      'def solve(M):',
      '    n = len(M[0]) - 1',
      '    R = rref(M)',
      '    piv = [next(c for c, x in enumerate(row) if x != 0) for row in R if any(row)]',
      '    if n in piv:',
      "        return {'kind': 'none', 'point': None, 'directions': []}",
      '    point = [0] * n',
      '    for i, pc in enumerate(piv):',
      '        point[pc] = R[i][n]',
      '    free = [c for c in range(n) if c not in piv]',
      '    dirs = [[1 if c == f else -R[piv.index(c)][f] if c in piv else 0 for c in range(n)] for f in free]',
      "    return {'kind': 'many' if free else 'one', 'point': point, 'directions': dirs}",
    ],
    decoys: ['    dirs = [[1 if c == f else R[piv.index(c)][f] if c in piv else 0 for c in range(n)] for f in free]', '    free = [c for c in range(n) if R[c][c] == 0]'],
  },
  uses: ['rref'],
  tests: [
    { name: 'the power board: one point (1, 2, 3)', args: [[[1, 2, 1, 8], [2, 5, 4, 24], [1, 3, 4, 19]]], expect: { kind: 'one', point: [1, 2, 3], directions: [] } },
    { name: 'the pod bay flows: (3, 1, 0) plus any amount of (1, 1, 1)', args: [[[1, -1, 0, 2], [0, 1, -1, 1], [1, 0, -1, 3]]], expect: { kind: 'many', point: [3, 1, 0], directions: [[1, 1, 1]] } },
    { name: 'the lying meter: none', args: [[[1, -1, 0, 2], [0, 1, -1, 1], [1, 0, -1, 4]]], expect: { kind: 'none', point: null, directions: [] } },
    { name: 'a plane: x + 2y − z = 4', args: [[[1, 2, -1, 4]]], expect: { kind: 'many', point: [4, 0, 0], directions: [[-2, 1, 0], [1, 0, 1]] } },
    { name: 'four unknowns, two free', args: [[[1, 2, 1, 1, 5], [2, 4, 0, 2, 6], [1, 2, 2, 1, 7]]], expect: { kind: 'many', point: [3, 0, 2, 0], directions: [[-2, 1, 0, 0], [-1, 0, 0, 1]] } },
  ],
  swarm: { gen: (r) => [randAugM(r)], crew: (M) => solveCrew(M as number[][]), tol: 1e-6 },
  docPrompt: 'Why is every answer the point plus some amount of each direction? Write it the way you would tell Bram.',
  ilseNote: 'solve: reduce, then read. A pivot on the right means no answer. Otherwise each free unknown is a dial; set them all to 0 for one answer, and turn one at a time for the directions.',
  payoff: 'LANTERN routes the pod bay with your `solve`.',
};

const REACH_SOLUTION = 'def reachable(v, w, target):\n    """Weights [a, b] with a*v + b*w == target (free weight 0), or None."""\n    M = [[v[i], w[i], target[i]] for i in range(len(target))]\n    s = solve(M)\n    if s[\'kind\'] == \'none\':\n        return None\n    return s[\'point\']\n';

export const buildReachable: BuildDef = {
  id: 'c10-reachable', fn: 'reachable', title: 'Refactor: reachable, rebuilt on solve',
  brief: 'Chapter 2\'s `reachable(v, w, target)` tried 40,401 pairs of dials from −10 to 10. A target that needs a dial of 13.7 is out of its reach.\n\nRewrite it with your `solve`: the columns `v` and `w` and the right side `target` make an augmented matrix, one row per coordinate. Return the weights `[a, b]` (with any free weight 0), or `None` when no weights work.',
  starter: 'def reachable(v, w, target):\n    """Weights [a, b] with a*v + b*w == target (free weight 0), or None."""\n    # one row per coordinate: [v[i], w[i], target[i]]\n    return None\n',
  solution: REACH_SOLUTION,
  fill: REACH_SOLUTION.replace("M = [[v[i], w[i], target[i]] for i in range(len(target))]", 'M = [[___, ___, ___] for i in range(len(target))]'),
  assemble: { lines: REACH_SOLUTION.trimEnd().split('\n').filter((l) => !l.includes('"""')), decoys: ['    M = [v, w, target]'] },
  uses: ['rref', 'solve'],
  tests: [
    { name: 'land on (5, 5) with (2, 1) and (1, 3): weights 2 and 1', args: [[2, 1], [1, 3], [5, 5]], expect: [2, 1] },
    { name: 'the target the brute force missed: a = 13.7, b = 1', args: [[2, 1], [1, 3], [28.4, 16.7]], expect: [13.7, 1] },
    { name: 'the ark\'s signal is off the thrusters\' plane: None', args: [[1, 0, 1], [0, 1, 1], [1, 1, 0]], expect: null },
    { name: 'the beacon at (2, 3, 5): weights 2 and 3', args: [[1, 0, 1], [0, 1, 1], [2, 3, 5]], expect: [2, 3] },
    { name: 'one arrow twice as long as the other: the free weight is 0', args: [[1, 2], [2, 4], [3, 6]], expect: [3, 0] },
  ],
  swarm: {
    gen: (r) => {
      const n = r() < 0.6 ? 2 : 3;
      const v = Array.from({ length: n }, () => randInt(r, -4, 4)), w = Array.from({ length: n }, () => randInt(r, -4, 4));
      const a = randInt(r, -150, 150) / 10, b = randInt(r, -150, 150) / 10;
      const target = v.map((x, i) => Math.round((a * x + b * w[i]) * 1000) / 1000 + (r() < 0.2 ? randNZ(r, 2) : 0));
      return [v, w, target];
    },
    crew: (v, w, t) => reachableCrew(v as number[], w as number[], t as number[]),
    tol: 1e-6,
  },
  docPrompt: 'Why can solve reach targets the brute-force search could not? Write it the way you would tell Bram.',
  ilseNote: 'reachable: asking whether a target is a mix of v and w is asking whether a system has a solution. Elimination answers it exactly, for any size of weight.',
  payoff: 'The reach planner now runs on your `solve`: the target that needed a dial of 13.7 passes.',
};
