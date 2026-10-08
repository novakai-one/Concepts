// Chapter 20 build (GDD §5.5): steady_state, your power_iteration rescaled to add to 1. Python on plain lists.
// The drone allocation runs on it. Plain data and maths (no DOM): tests/singular/game-c20.test.ts runs the
// reference in CPython.
import type { BuildDef } from '../../../game/types.ts';
import type { Mat } from '../../../math/la.ts';
import { DRONES } from '../../truth.ts';
import { LINK_M, PR, crewSteady, designP, steadyCase } from './logic.ts';

export const STEADY = `def steady_state(P):
    """Return the shares that one more step of P leaves unchanged, adding to 1."""
    x = power_iteration(P, [1] * len(P), 200)
    total = sum(x)
    return [t / total for t in x]
`;

const round = (M: Mat) => M.map((r) => r.map((x) => Math.round(x * 1e12) / 1e12));
export const STEADY_TESTS = [
  { name: 'the drones: `steady_state(P)` is `[0.5, 0.3, 0.2]`', args: [round(DRONES)], expect: [0.5, 0.3, 0.2] },
  { name: 'two sites: two thirds and one third', args: [[[0.9, 0.2], [0.1, 0.8]]], expect: [2 / 3, 1 / 3] },
  { name: 'the Stern rule at 80%: (125, 75, 100) of 300', args: [round(designP(0.8))], expect: [125 / 300, 75 / 300, 100 / 300] },
  { name: 'an even mix stays even', args: [[[0.5, 0.5], [0.5, 0.5]]], expect: [0.5, 0.5] },
  { name: 'the reading terminals (PageRank)', args: [round(LINK_M)], expect: PR },
];

export const buildSteady: BuildDef = {
  id: 'c20-steady', fn: 'steady_state', title: 'Where does a chain settle?',
  brief: 'Write `steady_state(P)`: the shares that one more step of `P` leaves unchanged. Start from all ones and run your `power_iteration` for 200 steps: it settles on the line with eigenvalue 1. Then rescale so the entries **add to 1** (`power_iteration` makes the length 1, not the sum).\n\n`P` is a regular chain: its columns add to 1 and some power of it has no zero entry.',
  starter: 'def steady_state(P):\n    """Return the shares that one more step of P leaves unchanged, adding to 1."""\n    # repeat P many times (your power_iteration), then make the entries add to 1\n    return None\n',
  fill: 'def steady_state(P):\n    """Return the shares that one more step of P leaves unchanged, adding to 1."""\n    x = power_iteration(P, ___, 200)\n    total = ___\n    return [___ for t in x]\n',
  solution: STEADY,
  assemble: { lines: STEADY.trimEnd().split('\n'), decoys: ['    total = math.sqrt(sum(t * t for t in x))', '    x = power_iteration(P, [1] * len(P), 1)'] },
  uses: ['power_iteration'],
  tests: STEADY_TESTS,
  swarm: { gen: (r, d) => steadyCase(r, d), crew: (P) => crewSteady(P as Mat), tol: 1e-6 },
  docPrompt: 'Why does repeating the chain and rescaling find the arrangement that one more step leaves unchanged?',
  ilseNote: 'steady_state: repeat P and every part of the start except the eigenvalue-1 part shrinks away (in a regular chain). Rescale to add to 1, because shares add to 1, not lengths.',
  payoff: 'The drone allocation runs on your `steady_state`.',
};
