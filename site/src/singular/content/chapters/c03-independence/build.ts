// Chapter 3 build (GDD §5.5): find_loop, a brute-force search for a loop (uses lincomb from Chapter 2).
// Chapter 15 replaces it with null_space.
import type { BuildDef } from '../../../game/types';
import { findLoopCrew } from './logic.ts';

const FIND_LOOP = 'def find_loop(vs):\n    """Brute force: whole dials -5..5, not all zero, that bring vs back to the start; or None."""\n    dials = [-5] * len(vs)\n    while True:\n        if any(dials) and all(abs(x) < 1e-9 for x in lincomb(dials, vs)):\n            return list(dials)\n        i = len(vs) - 1\n        while i >= 0 and dials[i] == 5:\n            dials[i] = -5\n            i -= 1\n        if i < 0:\n            return None\n        dials[i] += 1\n';

export const buildFindLoop: BuildDef = {
  id: 'c03-find-loop', fn: 'find_loop', title: 'Is one of these thrusters wasted? (brute force)',
  brief: 'Write `find_loop(vs)`. Try every setting of whole-number dials from −5 to 5, one dial per arrow in `vs`. Return the first setting, **not all zero**, whose `lincomb` brings the ship back to the start (every part 0). Return `None` if there is none.\n\nCount through the settings like an odometer: start at `[-5, -5, …]`, step the **last** dial up first, and when a dial passes 5, set it back to −5 and step the one before it.\n\nBrute force again: it only tries whole numbers up to 5. Chapter 15 replaces it.',
  starter: 'def find_loop(vs):\n    """Brute force: whole dials -5..5, not all zero, that bring vs back to the start; or None."""\n    dials = [-5] * len(vs)\n    while True:\n        # 1. is this setting a loop? (not all zero, and lincomb is all zeros)\n        # 2. step the odometer; return None when it rolls over\n        return None\n',
  fill: FIND_LOOP.replace('if any(dials) and', 'if ___ and').replace('dials[i] = -5', 'dials[i] = ___').replace('        dials[i] += 1', '        dials[i] += ___'),
  solution: FIND_LOOP,
  assemble: {
    lines: FIND_LOOP.trimEnd().split('\n'),
    decoys: ['        if all(abs(x) < 1e-9 for x in lincomb(dials, vs)):'],
  },
  uses: ['scale', 'add', 'lincomb'],
  tests: [
    { name: 'GDD p1: `find_loop([[1, 0, 2], [0, 1, 1], [2, 3, 7]])` finds `[-2, -3, 1]`', args: [[[1, 0, 2], [0, 1, 1], [2, 3, 7]]], expect: [-2, -3, 1] },
    { name: 'the spare `[1, 2, 3]` with thrusters two and three: `[-2, -4, 2]`', args: [[[1, 0, 1], [0, 1, 1], [1, 2, 3]]], expect: [-2, -4, 2] },
    { name: 'three directions, no loop: `None`', args: [[[1, 0, 0], [0, 1, 0], [0, 0, 1]]], expect: null },
    { name: 'the backup pair on one line: `[-4, -2]`', args: [[[2, 1], [-4, -2]]], expect: [-4, -2] },
    { name: 'the zero arrow always makes a loop: `[-5, 0]`', args: [[[0, 0, 0], [1, 2, 3]]], expect: [-5, 0] },
    { name: 'four arrows in 3-D: `[-5, -5, 5, 0]`', args: [[[1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1]]], expect: [-5, -5, 5, 0] },
  ],
  swarm: {
    // Kept quick for brute force: pairs of arrows (half of them on one line), and triples whose first arrow is zero.
    gen: (r) => {
      const dim = r() < 0.5 ? 2 : 3;
      const ent = () => Math.floor(r() * 7) - 3;
      const v = () => Array.from({ length: dim }, ent);
      const x = r();
      if (x < 0.45) { const a = v(); const k = [-2, -1, 2, 3][Math.floor(r() * 4)]; return [[a, a.map((t) => k * t)]]; }
      if (x < 0.8) return [[v(), v()]];
      return [[Array.from({ length: dim }, () => 0), v(), v()]];
    },
    crew: (...a: unknown[]) => findLoopCrew(a[0] as number[][]),
  },
  docPrompt: 'What question does `find_loop` answer, and what does a loop tell you about the thrusters? Write it the way you would tell Bram.',
  ilseNote: 'find_loop: some firing, not all zero, that comes back to the start. If there is one, an arrow is wasted: the others already reach its tip. Searching whole numbers is a start; Chapter 15 finds every loop at once.',
  payoff: 'The thruster audit flags wasted mounts with your `find_loop` from now on.',
};
