// Chapter 8 build (GDD §5.5): check(rows, x), how far off each equation is. Pure data plus the crew
// version and the swarm generator, so Node tests can run the reference in CPython.
import type { BuildDef } from '../../../game/types.ts';
import { randInt } from './act3.ts';
import { checkCrew } from './logic.ts';

export const buildCheck: BuildDef = {
  id: 'c08-check', fn: 'check', title: 'How far off is each equation?',
  brief: 'Write `check(rows, x)`. Each row is one equation written as its numbers: `[a1, a2, a3, b]` means $a_1x + a_2y + a_3z = b$. `x` is a point, such as `[5, 3, -2]`.\n\nReturn a list with one number per row: the row\'s left side at `x` minus its right side. A point is on every plane exactly when every number is 0.',
  starter: 'def check(rows, x):\n    """How far off each equation is at the point x."""\n    out = []\n    for row in rows:\n        # row[:-1] are the numbers in front of the unknowns, row[-1] is the right side\n        pass\n    return out\n',
  solution: 'def check(rows, x):\n    """How far off each equation is at the point x."""\n    out = []\n    for row in rows:\n        left = sum(a * xi for a, xi in zip(row[:-1], x))\n        out.append(left - row[-1])\n    return out\n',
  fill: 'def check(rows, x):\n    """How far off each equation is at the point x."""\n    out = []\n    for row in rows:\n        left = sum(a * xi for a, xi in zip(___, x))\n        out.append(left - ___)\n    return out\n',
  assemble: {
    lines: [
      'def check(rows, x):',
      '    out = []',
      '    for row in rows:',
      '        left = sum(a * xi for a, xi in zip(row[:-1], x))',
      '        out.append(left - row[-1])',
      '    return out',
    ],
    decoys: ['        out.append(left + row[-1])', '        left = sum(a * xi for a, xi in zip(row[1:], x))'],
  },
  tests: [
    { name: 'the pod (5, 3, −2) is on all three fan-beam planes', args: [[[1, 1, 1, 6], [0, 2, 5, -4], [2, 5, -1, 27]], [5, 3, -2]], expect: [0, 0, 0] },
    { name: 'the origin is off by −6, 4 and −27', args: [[[1, 1, 1, 6], [0, 2, 5, -4], [2, 5, -1, 27]], [0, 0, 0]], expect: [-6, 4, -27] },
    { name: 'two lines: (3, 2) is on x + y = 5 and x − y = 1', args: [[[1, 1, 5], [1, -1, 1]], [3, 2]], expect: [0, 0] },
    { name: 'a point off one line: (3, 1) is off x + y = 5 by −1', args: [[[1, 1, 5], [1, -1, 1]], [3, 1]], expect: [-1, 1] },
    { name: 'a row of zeros reading 0 = 1 is off by −1 at every point', args: [[[0, 0, 0, 1]], [4, -2, 7]], expect: [-1] },
  ],
  swarm: {
    gen: (rng) => {
      const n = randInt(rng, 2, 3), m = randInt(rng, 1, 3);
      const rows = Array.from({ length: m }, () => Array.from({ length: n + 1 }, () => randInt(rng, -5, 5)));
      return [rows, Array.from({ length: n }, () => randInt(rng, -4, 4))];
    },
    crew: (...a: unknown[]) => checkCrew(a[0] as number[][], a[1] as number[]),
  },
  docPrompt: 'What question does `check` answer, and why does getting back a list of all zeros mean the point is on every plane? Write it the way you would tell Bram.',
  ilseNote: 'check: substitute the point into each equation and report the leftover. All zeros means the point lies on every plane; one non-zero leftover names the plane it misses.',
  payoff: 'LANTERN checks the pod position with your `check`.',
};
