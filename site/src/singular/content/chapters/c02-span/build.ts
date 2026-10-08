// Chapter 2 builds (GDD §5.5): lincomb (uses scale and add from Chapter 1) and reachable, a brute-force
// dial search that Chapter 10 replaces with solve.
import type { BuildDef } from '../../../game/types';
import { lincombCrew, reachableCrew } from './logic.ts';

const LINCOMB = 'def lincomb(cs, vs):\n    """Return the linear combination cs[0]*vs[0] + cs[1]*vs[1] + ..."""\n    total = scale(0, vs[0])\n    for c, v in zip(cs, vs):\n        total = add(total, scale(c, v))\n    return total\n';

export const buildLincomb: BuildDef = {
  id: 'c02-lincomb', fn: 'lincomb', title: 'Stretch each arrow, then add',
  brief: 'Write `lincomb(cs, vs)`. `vs` is a list of arrows and `cs` a list of weights, one per arrow. Return `cs[0]*vs[0] + cs[1]*vs[1] + …`: stretch each arrow by its weight with your `scale`, then add them up with your `add`.\n\nStart from the zero vector with as many parts as the arrows: `scale(0, vs[0])`.',
  starter: 'def lincomb(cs, vs):\n    """Return the linear combination cs[0]*vs[0] + cs[1]*vs[1] + ..."""\n    total = scale(0, vs[0])   # the zero vector, as long as the arrows\n    # for each weight and its arrow: stretch the arrow, add it to total\n    return total\n',
  fill: LINCOMB.replace('    total = scale(0, vs[0])', '    total = ___').replace('add(total, scale(c, v))', 'add(total, ___)'),
  solution: LINCOMB,
  assemble: {
    lines: ['def lincomb(cs, vs):', '    """Return the linear combination cs[0]*vs[0] + cs[1]*vs[1] + ..."""', '    total = scale(0, vs[0])', '    for c, v in zip(cs, vs):', '        total = add(total, scale(c, v))', '    return total'],
    decoys: ['        total = scale(c, v)', '        total = add(total, v)'],
  },
  uses: ['scale', 'add'],
  tests: [
    { name: '`lincomb([2, 1], [[2, 1], [1, 3]])` lands on the first beacon, `[5, 5]`', args: [[2, 1], [[2, 1], [1, 3]]], expect: [5, 5] },
    { name: 'a negative weight: `lincomb([-1, 2], [[2, 1], [1, 3]])` is `[0, 5]`', args: [[-1, 2], [[2, 1], [1, 3]]], expect: [0, 5] },
    { name: 'in 3-D: `lincomb([2, 3], [[1, 0, 1], [0, 1, 1]])` is `[2, 3, 5]`', args: [[2, 3], [[1, 0, 1], [0, 1, 1]]], expect: [2, 3, 5] },
    { name: 'all weights zero give the zero vector', args: [[0, 0], [[2, 1], [1, 3]]], expect: [0, 0] },
    { name: 'three arrows: `lincomb([2, 3, -1], [[1, 0, 2], [0, 1, 1], [2, 3, 7]])` is `[0, 0, 0]`', args: [[2, 3, -1], [[1, 0, 2], [0, 1, 1], [2, 3, 7]]], expect: [0, 0, 0] },
  ],
  swarm: {
    gen: (r, d) => {
      const k = 2 + Math.floor(r() * 2), dim = r() < 0.5 ? 2 : 3;
      const num = () => (d === 'cadet' ? Math.round(r() * 8 - 4) : Math.round((r() * 10 - 5) * 2) / 2);
      return [Array.from({ length: k }, num), Array.from({ length: k }, () => Array.from({ length: dim }, num))];
    },
    crew: (...a: unknown[]) => lincombCrew(a[0] as number[], a[1] as number[][]),
  },
  docPrompt: 'What question does `lincomb` answer, and why does stretching then adding give the landing point? Write it the way you would tell Bram.',
  ilseNote: 'lincomb: where a set of thrusters, fired by these amounts, puts the ship. Stretch each arrow, add the stretches. Every later routine that moves points is built on this one.',
  payoff: 'LANTERN’s dial planner adds up the thrusters with your `lincomb` from now on.',
};

const REACHABLE = 'def reachable(v, w, target):\n    """Brute force: dials -10..10, steps 0.1. Return [a, b] within 0.05 of target, or None."""\n    for i in range(-100, 101):\n        a = i / 10\n        for j in range(-100, 101):\n            b = j / 10\n            if all(abs(a * v[k] + b * w[k] - target[k]) <= 0.05 for k in range(len(target))):\n                return [a, b]\n    return None\n';

export const buildReachable: BuildDef = {
  id: 'c02-reachable', fn: 'reachable', title: 'Can two thrusters reach it? (brute force)',
  brief: 'Write `reachable(v, w, target)`. Try every dial setting `a` and `b` from −10 to 10 in steps of 0.1: 201 × 201 = 40,401 tries. Return `[a, b]` for the first setting whose landing point `a*v + b*w` is within 0.05 of `target` in every part. Return `None` if no setting lands there.\n\nTry `a` in the outer loop and `b` in the inner one, both from −10 upwards. Use whole-number counters (`i / 10`), so the dials come out exact.\n\nThis is brute force: slow, and blind to anything outside −10 to 10. It is **to be replaced** in Chapter 10.',
  starter: 'def reachable(v, w, target):\n    """Search dials a, b from -10 to 10 in steps of 0.1. Return [a, b] or None. Brute force: to be replaced."""\n    for i in range(-100, 101):\n        a = i / 10\n        # try every b, and check every part of a*v + b*w against target\n    return None\n',
  fill: REACHABLE.replace('b = j / 10', 'b = ___').replace('<= 0.05 for', '<= ___ for').replace('    return None', '    return ___'),
  solution: REACHABLE,
  assemble: {
    lines: REACHABLE.trimEnd().split('\n'),
    decoys: ['            if a * v[0] + b * w[1] == target[0]:'],
  },
  swarm: {
    // Brute force is slow, so the swarm keeps to targets the search meets early (a from −10 to −9.8):
    // random arrows in 2-D or 3-D, any b. The listed tests cover the targets it never finds.
    gen: (r) => {
      const dim = r() < 0.5 ? 2 : 3;
      const ent = () => Math.floor(r() * 7) - 3;
      let v: number[], w: number[];
      do { v = Array.from({ length: dim }, ent); w = Array.from({ length: dim }, ent); } while (Math.abs(dim === 2 ? v[0] * w[1] - v[1] * w[0] : Math.hypot(v[1] * w[2] - v[2] * w[1], v[2] * w[0] - v[0] * w[2], v[0] * w[1] - v[1] * w[0])) < 1e-9);
      const a = -100 + Math.floor(r() * 3), b = Math.floor(r() * 201) - 100;
      return [v, w, v.map((x, k) => Math.round(((a / 10) * x + (b / 10) * w[k]) * 1e9) / 1e9)];
    },
    crew: (...a: unknown[]) => reachableCrew(a[0] as number[], a[1] as number[], a[2] as number[]),
  },
  tests: [
    { name: '`reachable([2, 1], [1, 3], [5, 5])` finds `[2, 1]`', args: [[2, 1], [1, 3], [5, 5]], expect: [2, 1] },
    { name: 'a negative dial: `reachable([2, 1], [1, 3], [0, 5])` finds `[-1, 2]`', args: [[2, 1], [1, 3], [0, 5]], expect: [-1, 2] },
    { name: 'in 3-D: the beacon `[2, 3, 5]` takes `[2, 3]`', args: [[1, 0, 1], [0, 1, 1], [2, 3, 5]], expect: [2, 3] },
    { name: 'the signal `[1, 1, 0]` is off the plane: `None`', args: [[1, 0, 1], [0, 1, 1], [1, 1, 0]], expect: null },
    { name: 'the backup pair reaches only a line: `[0, 3]` gives `None`', args: [[2, 1], [-4, -2], [0, 3]], expect: null },
    { name: 'a target that needs a = 13.7: brute force misses it and says `None` (to be replaced)', args: [[1, 0], [0, 1], [13.7, 0]], expect: null },
  ],
  docPrompt: 'What does `reachable` answer, and what is wrong with answering it this way? Write it the way you would tell Bram.',
  ilseNote: 'reachable: try every dial setting on a grid and stop at the first that lands close enough. It is honest about what it tried and blind to everything else. Replace it when you can solve for the dials directly.',
  payoff: 'The reach planner lights reachable beacons with your `reachable` from now on.',
};

/** Crew version for installs (the world never waits for player code). */
export { reachableCrew };
