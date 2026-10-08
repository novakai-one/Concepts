// Chapter 10: puzzle numbers, win checks, the Act III set piece, Doubts, the Act III Review, the Law, builds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fmat } from '../../site/src/singular/math/frac.ts';
import { applyOp, gaussJordanSteps, isRREF } from '../../site/src/singular/math/rref.ts';
import {
  D_FREE_COUNTER, D_FREE_START, D_ONE_COUNTER, D_ONE_START, D_RHS_START, LAW_C10, P1, P2, P3, P4, P6, PAR, R1_COUNTER, R1_START,
  R2_START, R3_START, R4_SHOW, R4_START, SP, distToP2Line, flowsAt, freeColumns, freeCount, freeFromZeroHolds, freeRandom,
  oneAnswerHolds, oneRandom, p1Won, p3Consistent, p3Press, p3Presses, p3Rows, p4Point, p5Reduced, p5Rows, p6Won, pipesOk, r1Holds, r1Random,
  r2Holds, r2Random, r3Holds, r3Random, r4Holds, r4Random, reachableCrew, rhsPivot, rhsPivotHolds, rhsRandom, rrefCrew,
  solveCrew, spBurn, spConsistent, spDroneWon, spFlowsOk, spHit, totalLoad, zeroRows,
} from '../../site/src/singular/content/chapters/c10-rref/logic.ts';
import { hasFalseRow, kindOf, onAll, seeded, somePoint } from '../../site/src/singular/content/chapters/c08-systems/act3.ts';
import { checkLaw } from '../../site/src/singular/game/lawcheck.ts';
import { buildReachable, buildRref, buildSolve } from '../../site/src/singular/content/chapters/c10-rref/build.ts';
import { fillAnswers } from '../../site/src/singular/game/codehelp.ts';

const close = (a: unknown, b: unknown, tol = 1e-6): boolean => {
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => close(x, b[i], tol));
  if (typeof a === 'object' && typeof b === 'object') { const ka = Object.keys(a as object), kb = Object.keys(b as object); return ka.length === kb.length && ka.every((k) => close((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], tol)); }
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tol;
  return a === b;
};

test('p1: three steps finish the staircase to [I | (1, 2, 3)]', () => {
  const g = gaussJordanSteps(fmat(P1.aug), 3);
  assert.equal(g.ops.length, P1.par);
  assert.deepEqual(g.states.at(-1)!.map((r) => r.map((x) => x.value())), P1.done);
  assert.ok(p1Won(P1.done));
  assert.ok(!p1Won(P1.aug));
});

test('p2: the flows (3 + t, 1 + t, t); pipes within 0..5 exactly for t in [0, 2]; least load 4 at t = 0', () => {
  assert.equal(kindOf(P2.aug), 'many');
  assert.deepEqual(freeColumns(P2.aug), [P2.free]);
  for (const t of [-1, 0, 0.5, 1, 2, 2.5]) assert.ok(onAll(P2.aug, flowsAt(t), 1e-12));
  for (const t of [0, 1, 2]) assert.ok(pipesOk(t));
  for (const t of [-0.5, 2.5]) assert.ok(!pipesOk(t));
  assert.equal(totalLoad(0), 4);
  assert.ok(totalLoad(0) < totalLoad(1));
  assert.equal(P2.par, gaussJordanSteps(fmat(P2.aug), 3).ops.length);
});

test('p2: the dial starts off the legal range, on every step grid; the nearest legal setting is t = 0, the least load', () => {
  const { start, min, max, step } = P2.dial;
  assert.ok(!pipesOk(start), 'the dial does not start on a winning setting');
  for (const d of ['cadet', 'navigator', 'commander']) {
    const s = step[d];
    const onGrid = (v: number) => Math.abs((v - min) / s - Math.round((v - min) / s)) < 1e-9;
    assert.ok(onGrid(start) && onGrid(0), `${d}: start and 0 are dial settings`);
    const grid = Array.from({ length: Math.round((max - min) / s) + 1 }, (_, i) => min + i * s);
    const legal = grid.filter((v) => pipesOk(v));
    const nearest = legal.reduce((a, v) => (Math.abs(v - start) < Math.abs(a - start) ? v : a));
    assert.equal(nearest, 0, `${d}: the nearest legal setting`);
    assert.equal(Math.min(...legal.map(totalLoad)), totalLoad(0), `${d}: t = 0 has the least load`);
  }
});

test('par: reachable on every difficulty (checked lines, picks and tile submits count a move)', () => {
  // p2: board steps + (navigator: the column pick; commander: the worksheet's last line) + one dial drag
  const p2Min = { cadet: P2.par + 1, navigator: P2.par + 2, commander: P2.par + 2 };
  assert.equal(PAR.p2, Math.max(...Object.values(p2Min)));
  // p4: fewest single-dial changes to visit the three marked points from (0, 0), in any order
  const perms = (a: number[][]): number[][][] => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r])));
  const dialMoves = Math.min(...perms(P4.dials).map((order) => order.reduce((acc, q, i) => {
    const prev = i ? order[i - 1] : [0, 0];
    return acc + (q[0] !== prev[0] ? 1 : 0) + (q[1] !== prev[1] ? 1 : 0);
  }, 0)));
  assert.equal(dialMoves, 4);
  const p4Min = { cadet: dialMoves, navigator: 3 + dialMoves, commander: 1 + dialMoves };
  assert.equal(PAR.p4, Math.max(...Object.values(p4Min)));
  // p6: one drag; navigator checks 3 lines; commander submits the tiles and checks 1 line
  const p6Min = { cadet: 1, navigator: 1 + 3, commander: 1 + 1 + 1 };
  assert.equal(PAR.p6, Math.max(...Object.values(p6Min)));
});

test('p3: meter three at 4 reduces to 0 = 1; any single meter fixed gives solutions', () => {
  assert.ok(!p3Consistent(P3.b));
  const end = gaussJordanSteps(fmat(p3Rows(P3.b)), 3).states.at(-1)!;
  assert.ok(hasFalseRow(end));
  assert.ok(p3Consistent([2, 1, 3]) && p3Consistent([3, 1, 4]) && p3Consistent([2, 2, 4]));
  assert.ok(!p3Consistent([2, 1, 5]));
});

test('p3: Show me presses meter buttons until the meters agree, from any readings', () => {
  assert.deepEqual(p3Presses(P3.b), [4], 'from the start: meter three down once');
  for (let a = 0; a <= 6; a++) for (let b = 0; b <= 6; b++) for (let c = 0; c <= 6; c++) {
    const presses = p3Presses([a, b, c]);
    const end = presses.reduce((m, i) => p3Press(m, i), [a, b, c]);
    assert.ok(p3Consistent(end), `from (${a}, ${b}, ${c}) → (${end})`);
    assert.ok(presses.length <= 12);
  }
  assert.deepEqual(p3Presses([2, 1, 5]), [4, 4]);
  assert.deepEqual(p3Presses([6, 2, 5]), [0, 0, 0], 'meter one down to 3');
});

test('p3: replaying every step so far on new meter readings keeps the board reduced', () => {
  // the player's reduction, then two meter changes: the second replay must still use every step, not an empty history
  const ops = gaussJordanSteps(fmat(p3Rows(P3.b)), 3).ops;
  const replay = (b: number[]) => ops.reduce((m, op) => applyOp(m, op), fmat(p3Rows(b))).map((r) => r.map((x) => x.value()));
  assert.deepEqual(replay([2, 1, 5]).at(-1), [0, 0, 0, 2]);
  assert.deepEqual(replay([2, 1, 3]).at(-1), [0, 0, 0, 0], 'the bottom row reads 0 = 0 again');
});

test('p4 [H]: x + 2y − z = 4 is (4, 0, 0) + s(−2, 1, 0) + t(1, 0, 1); the dials reach the marked points', () => {
  P4.targets.forEach((q, i) => {
    assert.deepEqual(p4Point(P4.dials[i][0], P4.dials[i][1]), q);
    assert.ok(onAll([P4.row], q, 1e-12));
  });
  for (const [s, t] of [[-3, 2], [0.5, -1.5], [2, 2]]) assert.ok(onAll([P4.row], p4Point(s, t), 1e-12));
  const sol = solveCrew([P4.row]);
  assert.deepEqual(sol.point, P4.p);
  assert.deepEqual(sol.directions, [P4.d1, P4.d2]);
});

test('p5 [H]: the last row is [0 0 (k − 5) | (m − 3)]: one, many, none', () => {
  for (const [k, m] of [[7, 3], [6, 3], [5, 3], [5, 4], [2, 0]]) {
    const end = gaussJordanSteps(fmat(p5Rows(k, m)), 3).states.at(-1)!;
    void end;
    const red = p5Reduced(k, m);
    const kind = kindOf(p5Rows(k, m));
    assert.equal(kind, red[2] !== 0 ? 'one' : red[3] === 0 ? 'many' : 'none', `k = ${k}, m = ${m}`);
  }
  assert.deepEqual(somePoint(p5Rows(7, 3)), [0, 1, 0]);
});

test('p6 [D]: the zero-meter line is parallel to the real one; any point of the real line is a particular solution', () => {
  assert.equal(kindOf(P6.aug), 'many');
  assert.ok(onAll(P2.aug, P6.particular, 1e-12));
  for (const t of [-2, 1, 3]) {
    const h = [t, t, t];
    assert.ok(onAll(P6.aug, h, 1e-12), 'h solves the homogeneous system');
    assert.ok(onAll(P2.aug, P6.particular.map((x, i) => x + h[i]), 1e-12), 'p + h solves the system');
    assert.ok(p6Won(P6.particular.map((x, i) => x + h[i]), 0.01));
  }
  assert.ok(!p6Won([0, 0, 0], 0.05), 'the origin is not on the real line');
  assert.ok(!p6Won([1, -1, 0], 0.05), 'the arrow\'s start');
  assert.ok(distToP2Line([3, 1, 0]) < 1e-12);
});

test('set piece: only m = 3 has solutions; flows (t, 1 − 2t, t) fit [0, 1] for t in [0, 0.5]; burn (1, 2) hits the door centre', () => {
  for (let m = 0; m <= 6; m++) assert.equal(spConsistent(m), m === SP.m, `m = ${m}`);
  for (const t of [-0.5, 0, 0.25, 0.5, 1]) assert.ok(onAll(SP.rows(3), SP.flows(t), 1e-12));
  assert.ok(spFlowsOk(0) && spFlowsOk(0.25) && spFlowsOk(0.5));
  assert.ok(!spFlowsOk(0.6) && !spFlowsOk(-0.1));
  assert.deepEqual(spBurn(1, 2), [1, 2, 3]);
  const hit = spHit(1, 2)!;
  assert.ok(hit.every((x, i) => Math.abs(x - SP.door.centre[i]) < 1e-12));
  assert.ok(spDroneWon(1, 2, 0.01) && spDroneWon(0.5, 1, 0.01), 'any burn along (1, 2, 3)');
  assert.ok(!spDroneWon(1, 1, 0.05) && !spDroneWon(2, 1, 0.05));
  assert.equal(spHit(-1, 0), null, 'a burn away from the door never meets it');
  // the door centre is on the door's plane and is the centroid of P, Q, R
  const { P, Q, R, n, d, centre } = SP.door;
  assert.ok(Math.abs(n[0] * centre[0] + n[1] * centre[1] + n[2] * centre[2] - d) < 1e-12);
  assert.ok([0, 1, 2].every((i) => Math.abs((P[i] + Q[i] + R[i]) / 3 - centre[i]) < 1e-12));
});

test('Doubt "three in three always have one answer" (false): the prism breaks it; random systems hold; the Shake finds it', () => {
  assert.ok(oneAnswerHolds(D_ONE_START));
  assert.ok(!oneAnswerHolds(D_ONE_COUNTER));
  const r = seeded(31);
  for (let i = 0; i < 40; i++) assert.ok(oneAnswerHolds(oneRandom(r)));
  assert.ok(!oneAnswerHolds(oneRandom(r, 0)) && !oneAnswerHolds(oneRandom(r, 1)));
});

test('Doubt "free variables come from zero rows" (false): 2 equations in 3 unknowns break it', () => {
  assert.ok(freeFromZeroHolds(D_FREE_START), 'the flows: one free variable, one zero row');
  assert.ok(!freeFromZeroHolds(D_FREE_COUNTER));
  assert.equal(freeCount(D_FREE_COUNTER), 1);
  assert.equal(zeroRows(D_FREE_COUNTER), 0);
  const r = seeded(32);
  for (let i = 0; i < 40; i++) assert.ok(freeFromZeroHolds(freeRandom(r)), 'square consistent systems agree');
  assert.ok(!freeFromZeroHolds(freeRandom(r, 0)));
});

test('Doubt "a pivot on the right means no solution" (true): holds for every case', () => {
  assert.ok(rhsPivot(D_RHS_START) && kindOf(D_RHS_START) === 'none');
  assert.ok(rhsPivotHolds(D_RHS_START));
  const r = seeded(33);
  let withPivot = 0;
  for (let i = 0; i < 200; i++) {
    const m = rhsRandom(r, i % 10 === 0 ? 0 : -1);
    assert.ok(m.length === 3 && m.every((row) => row.length === 4), 'every case fits the doubt\'s 3 × 4 board');
    assert.ok(rhsPivotHolds(m));
    if (rhsPivot(m)) withPivot++;
  }
  assert.ok(withPivot > 30, 'the Shake includes systems with a pivot on the right');
});

test('Review: the four claims, their constructions and the Shake', () => {
  const r = seeded(34);
  // R1 (false)
  assert.ok(r1Holds(R1_START) && !r1Holds(R1_COUNTER));
  for (let i = 0; i < 30; i++) assert.ok(r1Holds(r1Random(r)));
  assert.ok(!r1Holds(r1Random(r, 0)));
  // R2 (false): C on the line through two solutions is a third solution
  assert.ok(r2Holds(R2_START), 'C starts on A');
  assert.ok(!r2Holds({ ...R2_START, t: 0.5 }) && !r2Holds({ ...R2_START, t: 2 }));
  for (let i = 0; i < 30; i++) { const c = r2Random(r); assert.ok(onAll(c.rows, c.A, 1e-9) && onAll(c.rows, c.B, 1e-9)); assert.ok(!r2Holds(c)); }
  // R3 (false): a negative multiple never changes the solutions
  assert.ok(!r3Holds(R3_START, 1, -2) && !r3Holds(R3_START, 0, -0.5));
  for (let i = 0; i < 30; i++) { const c = r3Random(r); assert.ok(!r3Holds(c.m, c.i, c.k)); }
  // R4 (true): a 3 × 3 system with no solution; the Shake keeps its shape
  assert.ok(!r4Holds(R4_START) && r4Holds(R4_SHOW));
  for (let i = 0; i < 50; i++) assert.ok(r4Holds(r4Random(r, i % 7 === 0 ? 0 : -1)));
});

test('Law: "columns without a pivot" survives 500 cases; "zero rows" and "unknowns minus equations" break', () => {
  assert.equal(checkLaw(LAW_C10, LAW_C10.answer).survived, true);
  assert.equal(checkLaw(LAW_C10, { count: 'zerorows' }).survived, false);
  assert.equal(checkLaw(LAW_C10, { count: 'diff' }).survived, false);
  for (const c of LAW_C10.edgeCases) assert.ok(kindOf(c.aug) !== 'none', 'every Law case is consistent');
});

const runPy = (src: string, fn: string, argsList: unknown[][]) => spawnSync('python3', ['-c', `${src}\nimport json,sys\nfor a in json.loads(sys.stdin.read()):\n    print(json.dumps(${fn}(*a)))`], { input: JSON.stringify(argsList), encoding: 'utf8' });

test('builds: crew versions match the tests; references pass tests and swarm in CPython; fill templates have blanks', () => {
  const libs: Record<string, string> = { rref: buildRref.solution, solve: buildSolve.solution, reachable: buildReachable.solution };
  for (const b of [buildRref, buildSolve, buildReachable]) {
    for (const t of b.tests) assert.ok(close(b.swarm!.crew(...t.args), t.expect), `${b.fn} crew: ${t.name}`);
    assert.ok(b.fill!.includes('___'), `${b.fn} fill has blanks`);
    const r = seeded(17);
    const cases = Array.from({ length: 200 }, () => b.swarm!.gen(r, 'commander'));
    const src = [...(b.uses ?? []).map((u) => libs[u]), b.solution].join('\n');
    const py = runPy(src, b.fn, [...b.tests.map((t) => t.args), ...cases]);
    if (py.error) continue;
    assert.equal(py.status, 0, py.stderr);
    const out = py.stdout.trim().split('\n').map((l) => JSON.parse(l));
    b.tests.forEach((t, i) => assert.ok(close(out[i], t.expect), `${b.fn} test ${t.name}: ${JSON.stringify(out[i])}`));
    cases.forEach((c, i) => assert.ok(close(out[b.tests.length + i], b.swarm!.crew(...c)), `${b.fn} swarm ${JSON.stringify(c)} → ${JSON.stringify(out[b.tests.length + i])}`));
    // the Assemble lines pass too, and each decoy breaks a test; the Fill blanks resolve
    assert.ok(fillAnswers(b.fill!, b.solution)?.length, `${b.fn} fill resolves`);
    const libSrc = (b.uses ?? []).map((u) => libs[u]).join('\n');
    const asm = runPy(`${libSrc}\n${b.assemble!.lines.join('\n')}`, b.fn, [...b.tests.map((t) => t.args), ...cases]);
    assert.equal(asm.status, 0, asm.stderr);
    const aout = asm.stdout.trim().split('\n').map((l) => JSON.parse(l));
    b.tests.forEach((t, i) => assert.ok(close(aout[i], t.expect), `${b.fn} assembled: ${t.name}`));
    cases.forEach((c, i) => assert.ok(close(aout[b.tests.length + i], b.swarm!.crew(...c)), `${b.fn} assembled swarm ${JSON.stringify(c)}`));
    for (const decoy of b.assemble!.decoys ?? []) {
      const lines = b.assemble!.lines.slice();
      const key = (l: string) => l.trim().split(/[ =(]/)[0];
      const at = lines.findIndex((l) => l.match(/^ */)![0].length === decoy.match(/^ */)![0].length && key(l) === key(decoy));
      assert.ok(at >= 0, `${b.fn} decoy has a line to replace: ${decoy}`);
      lines[at] = decoy;
      const bad = runPy(`${libSrc}\n${lines.join('\n')}`, b.fn, b.tests.map((t) => t.args));
      const got = bad.status === 0 ? bad.stdout.trim().split('\n').map((l) => JSON.parse(l)) : null;
      assert.ok(!got || b.tests.some((t, i) => !close(got[i], t.expect)), `${b.fn} decoy should fail: ${decoy}`);
    }
  }
  // the refactor beat: the brute-force search (dials −10..10 in 0.1) cannot reach a = 13.7; solve can
  assert.deepEqual(reachableCrew([1, 0, 1], [0, 1, 1], [1, 1, 0]), null);
  const r137 = reachableCrew([2, 1], [1, 3], [28.4, 16.7])!;
  assert.ok(Math.abs(r137[0] - 13.7) < 1e-9 && Math.abs(r137[1] - 1) < 1e-9);
  // rref is canonical: any order of steps gives the same result
  const M = [[2, 4, -2, 2], [1, 2, 1, 5], [3, 6, 0, 9]];
  assert.ok(close(rrefCrew(M), rrefCrew([M[2], M[0], M[1]])));
  assert.ok(isRREF(fmat(rrefCrew(M))));
});
