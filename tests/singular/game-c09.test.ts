// Chapter 9: puzzle numbers, pure win checks, Doubt predicates, the Law, the row machine Procedure, builds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Frac, fmat } from '../../site/src/singular/math/frac.ts';
import { applyOp, gaussSteps } from '../../site/src/singular/math/rref.ts';
import {
  P1, P3, P4, P4_FORBIDDEN, p4AppliedK, PROC_CASE, PROC_KEYS, PROC_REFERENCE, PROC_TILES, PROC_DECOYS, LAW_C09, addRow, backSub, bramRef,
  expectedRow, firstColumnCleared, otherRef, p1Won, p3Won, p5Kind, p5Reduced, p6Final, refRandom, rowEchelonCrew, rowMachine,
  samePivots, scaleHolds, scaleRandom, scaleRow, swapHolds, swapRandom, twoRefHolds, D_REF_START, D_SCALE_START, D_SWAP_START,
} from '../../site/src/singular/content/chapters/c09-elimination/logic.ts';
import { isStaircase, kindOf, onAll, sameSolutions, seeded, somePoint } from '../../site/src/singular/content/chapters/c08-systems/act3.ts';
import { checkLaw } from '../../site/src/singular/game/lawcheck.ts';
import { buildBackSub, buildRowEchelon } from '../../site/src/singular/content/chapters/c09-elimination/build.ts';
import { fillAnswers } from '../../site/src/singular/game/codehelp.ts';

const F = (n: number, d = 1) => new Frac(n, d);
const nums = (m: Frac[][]) => m.map((r) => r.map((x) => x.value()));

test('p1: three row operations make the staircase and keep the point (1, 2, 3)', () => {
  const ops = gaussSteps(fmat(P1.aug), 3).ops;
  assert.equal(ops.length, P1.par);
  const end = nums(gaussSteps(fmat(P1.aug), 3).states.at(-1)!);
  assert.deepEqual(end, P1.staircase);
  assert.ok(p1Won(P1.staircase));
  assert.ok(!p1Won(P1.aug), 'the start is not a staircase');
  const after1 = nums(applyOp(fmat(P1.aug), { kind: 'add', i: 1, j: 0, k: F(-2) }));
  assert.ok(!firstColumnCleared(after1));
  const after2 = nums(applyOp(fmat(after1), { kind: 'add', i: 2, j: 0, k: F(-1) }));
  assert.ok(firstColumnCleared(after2) && !p1Won(after2));
  assert.deepEqual(somePoint(P1.aug), P1.answer);
  // a staircase with a wrong number is not a win (the point moved)
  assert.ok(!p1Won([[1, 2, 1, 8], [0, 1, 2, 9], [0, 0, 1, 3]]));
});

test('p2: back substitution reads z = 3, y = 2, x = 1', () => {
  assert.deepEqual(backSub(P1.staircase), [1, 2, 3]);
});

test('p3: a swap first; the staircase gives (1, 2, 1); a wrong typed point does not win', () => {
  const g = gaussSteps(fmat(P3.aug), 3);
  assert.equal(g.ops[0].kind, 'swap');
  assert.equal(g.ops.length, P3.par);
  const end = nums(g.states.at(-1)!);
  assert.deepEqual(backSub(end), P3.answer);
  assert.ok(p3Won(end, [1, 2, 1]));
  assert.ok(!p3Won(end, [1, 1, 2]));
  assert.ok(!p3Won(P3.aug, [1, 2, 1]), 'not a staircase yet');
});

test('p4 [D]: forbidden moves change the solutions; a legal move keeps (1, 2)', () => {
  assert.deepEqual(somePoint(P4.aug), P4.point);
  const results = Object.fromEntries(P4_FORBIDDEN.map((f) => [f.id, f.apply(P4.aug)]));
  assert.equal(kindOf(results.zero), 'many', 'times 0: the second line vanishes, a whole line of points');
  assert.deepEqual(somePoint(results.side), [2, 3], 'one side only: the point jumps to (2, 3)');
  assert.deepEqual(somePoint(results.cols), [2, 1], 'columns swapped: the point jumps to (2, 1)');
  for (const k of [-3, -2, -1, 1, 2, 3]) assert.ok(sameSolutions(P4.aug, addRow(P4.aug, 1, 0, k)), `k = ${k}`);
  assert.deepEqual(addRow(P4.aug, 1, 0, 2)[1], [5, 1, 7]);
  // the "why" worksheet reads k from the matrix on screen; at (1, 2) the new row 2 reads −1 + 4k
  for (const k of [-3, -2, -1, 1, 2, 3]) {
    const m = addRow(P4.aug, 1, 0, k);
    assert.equal(p4AppliedK(m), k);
    assert.equal(m[1][0] * 1 + m[1][1] * 2, -1 + 4 * k);
    assert.equal(p4AppliedK(addRow(m, 1, 0, 1)), k + 1, 'Apply twice: the k values add');
  }
  assert.deepEqual(addRow(P4.aug, 1, 0, -1)[1], [-1, -2, -5]);
  assert.equal(p4AppliedK(P4.aug), 0);
});

test('p5 [H]: R2 − 2R1 = [0, k − 4 | c − 6]; one, many, none', () => {
  assert.deepEqual(p5Reduced(4, 6), [0, 0, 0]);
  assert.deepEqual(p5Reduced(3, 6), [0, -1, 0]);
  assert.equal(p5Kind(3, 6), 'one');
  assert.equal(p5Kind(2, 6), 'one');
  assert.equal(p5Kind(4, 6), 'many');
  assert.equal(p5Kind(4, 7), 'none');
  assert.equal(p5Kind(4, 5), 'none');
  for (let k = 0; k <= 8; k += 0.5) if (k !== 4) assert.equal(p5Kind(k, 6), 'one');
});

test('p6 [H]: the typed rows the board expects; Commander checks only the end', () => {
  assert.deepEqual(expectedRow(P1.aug, { kind: 'add', i: 1, j: 0, k: F(-2) }), [0, 1, 2, 8]);
  assert.ok(p6Final(P1.staircase));
  assert.ok(!p6Final([[1, 2, 1, 8], [0, 1, 2, 9], [0, 0, 1, 3]]), 'a typing slip changes the answer');
});

test('Doubt "swapping changes the answer" (false): every swap keeps the solutions', () => {
  assert.ok(swapHolds(D_SWAP_START, D_SWAP_START, false), 'no swap yet: nothing refuted');
  const swapped = nums(applyOp(fmat(D_SWAP_START), { kind: 'swap', i: 0, j: 2 }));
  assert.equal(swapHolds(D_SWAP_START, swapped, true), false, 'the counterexample');
  const r = seeded(9);
  for (let i = 0; i < 50; i++) { const c = swapRandom(r, i === 0 ? 0 : -1); assert.equal(swapHolds(c.orig, c.cur, true), false); }
});

test('Doubt "any number keeps the solutions" (false): random non-zero k holds, the curated 0 breaks it', () => {
  assert.ok(scaleHolds(D_SCALE_START, 1, 2));
  assert.ok(!scaleHolds(D_SCALE_START, 1, 0));
  assert.equal(kindOf(scaleRow(D_SCALE_START, 1, 0)), 'many');
  const r = seeded(4);
  for (let i = 0; i < 60; i++) { const c = scaleRandom(r); assert.ok(scaleHolds(c.m, c.i, c.k)); }
  for (let i = 0; i < 10; i++) { const c = scaleRandom(r, 0); assert.equal(scaleHolds(c.m, c.i, c.k), false); }
  // the Shake always scales row 2: the slider, the readout and the goal all name row 2 (its red line)
  for (let i = 0; i < 40; i++) assert.equal(scaleRandom(r, i % 2 ? 0 : -1).i, 1);
});

test('Doubt "different staircases, same pivots" (true): the canonical construction and the Shake', () => {
  const bram = bramRef(D_REF_START);
  const mine = nums(applyOp(fmat(nums(bram)), { kind: 'add', i: 0, j: 1, k: F(1) }));
  assert.ok(isStaircase(mine, 3));
  assert.ok(!sameSolutions(mine, nums(bram)) === false, 'still the same solutions');
  assert.notDeepEqual(mine, nums(bram), 'a different staircase');
  assert.ok(twoRefHolds(mine, bram));
  const r = seeded(21);
  for (let i = 0; i < 100; i++) {
    const c = refRandom(r, i < 2 ? i : -1);
    assert.ok(isStaircase(c.mine, 3), 'the other route is a staircase');
    assert.ok(twoRefHolds(c.mine, bramRef(c.m)));
    assert.ok(samePivots(otherRef(c.m, r), bramRef(c.m)));
  }
});

test('Law: "keeps … unless it multiplies a row by zero" survives; near-misses break', () => {
  assert.equal(checkLaw(LAW_C09, LAW_C09.answer).survived, true);
  for (const f of [{ does: 'keeps', when: 'always' }, { does: 'changes', when: 'always' }, { does: 'changes', when: 'unless0' }]) {
    assert.equal(checkLaw(LAW_C09, f).survived, false, JSON.stringify(f));
  }
  assert.equal(LAW_C09.edgeCases.filter((c) => !LAW_C09.holds({ does: 'keeps', when: 'always' }, c)).length > 0, true, 'a curated case breaks "keeps always"');
});

test('Procedure: the reference order succeeds; dropping each key step fails with its misconception', () => {
  const ok = rowMachine(PROC_REFERENCE, PROC_CASE);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.answer, P3.answer);
  assert.ok(onAll(PROC_CASE, ok.answer!, 1e-9));
  const expect: Record<string, string> = { swap0: 'divide-by-zero', clear: 'not-cleared', back: 'no-back' };
  for (const k of PROC_KEYS) {
    const r = rowMachine(PROC_REFERENCE.filter((t) => t !== k), PROC_CASE);
    assert.equal(r.ok, false, `without ${k}`);
    assert.equal(r.misconception, expect[k], `without ${k}`);
  }
  // the structural steps matter too
  assert.equal(rowMachine(['swap0', 'clear', 'next', 'back']).misconception, 'no-pivot');
  assert.equal(rowMachine(['find', 'swap0', 'clear', 'back']).misconception, 'stopped');
  // misplaced: swapping after clearing is too late; reading from the top fails
  assert.equal(rowMachine(['find', 'clear', 'swap0', 'next', 'back']).misconception, 'divide-by-zero');
  assert.equal(rowMachine(['find', 'swap0', 'clear', 'next', 'top']).misconception, 'top-down');
  // decoys fail visibly
  assert.equal(rowMachine(['find', 'swap0', 'clear', 'scale0', 'next', 'back']).misconception, 'scale-zero');
  assert.equal(rowMachine(['find', 'swap0', 'colswap', 'clear', 'next', 'back']).misconception, 'column-swap');
  // tile data is complete
  for (const id of PROC_REFERENCE) assert.ok(PROC_TILES.some((t) => t.id === id));
  assert.equal(PROC_DECOYS.length, 3);
  // the same procedure also works on the power board (no swap needed)
  assert.deepEqual(rowMachine(PROC_REFERENCE, P1.aug).answer, P1.answer);
});

test('Procedure: tiles after NEXT run too; a decoy anywhere fails, harmless repeats do not', () => {
  // decoys between NEXT and BACK run on the finished staircase
  const z = rowMachine(['find', 'swap0', 'clear', 'next', 'scale0', 'back']);
  assert.equal(z.ok, false);
  assert.equal(z.misconception, 'scale-zero');
  assert.ok(z.steps.some((s) => s.kind === 'set' && s.text.startsWith('Row 3 times 0')));
  const cs = rowMachine(['find', 'swap0', 'clear', 'next', 'colswap', 'back']);
  assert.equal(cs.ok, false);
  assert.equal(cs.misconception, 'column-swap');
  // decoys after the answer is read are not dropped either
  assert.equal(rowMachine(['find', 'swap0', 'clear', 'next', 'back', 'scale0']).misconception, 'scale-zero');
  assert.equal(rowMachine(['find', 'swap0', 'clear', 'next', 'back', 'colswap']).misconception, 'column-swap');
  assert.equal(rowMachine(['find', 'swap0', 'clear', 'next', 'back', 'top']).misconception, 'top-down');
  // no plan with a decoy passes
  const keys = ['find', 'swap0', 'clear', 'next', 'back'];
  for (const d of ['scale0', 'colswap', 'top']) {
    for (let at = 0; at <= keys.length; at++) {
      const plan = [...keys.slice(0, at), d, ...keys.slice(at)];
      assert.equal(rowMachine(plan).ok, false, plan.join(','));
    }
  }
  // FIND / SWAP IF ZERO / CLEAR after NEXT have nothing left to do: a note, not a failure
  const extra = rowMachine(['find', 'swap0', 'clear', 'next', 'clear', 'find', 'swap0', 'back']);
  assert.equal(extra.ok, true);
  assert.ok(extra.steps.some((s) => s.kind === 'note' && s.text.includes('CLEAR BELOW')));
});

test('Procedure: each failure message names the step that caused it', () => {
  // ×0 after the swap zeroes the swapped-in pivot row: the swap was not late
  const z = rowMachine(['find', 'swap0', 'scale0', 'clear', 'next', 'back']);
  assert.equal(z.misconception, 'scale-zero');
  assert.ok(z.message.includes('×0') && !z.message.includes('too late'), z.message);
  // a column swap after clearing moves a cleared column into the pivot spot
  const c = rowMachine(['find', 'swap0', 'clear', 'colswap', 'next', 'back']);
  assert.equal(c.misconception, 'column-swap');
  assert.ok(c.message.includes('Swapping columns') && !c.message.includes('too late'), c.message);
  // swap genuinely late or missing
  assert.ok(rowMachine(['find', 'clear', 'swap0', 'next', 'back']).message.includes('too late'));
  assert.ok(rowMachine(['find', 'clear', 'next', 'back']).message.includes('Nothing told me to swap first'));
  // no CLEAR tile at all: the message does not claim a clear happened
  const b = rowMachine(['back']);
  assert.equal(b.misconception, 'stopped');
  assert.ok(!b.message.includes('I cleared'), b.message);
  assert.ok(rowMachine(['find', 'swap0', 'clear', 'back']).message.includes('I cleared below the first pivot only'));
});

const runPy = (src: string, fn: string, argsList: unknown[][]) => spawnSync('python3', ['-c', `${src}\nimport json,sys\nfor a in json.loads(sys.stdin.read()):\n    print(json.dumps(${fn}(*a)))`], { input: JSON.stringify(argsList), encoding: 'utf8' });
const close = (a: unknown, b: unknown, tol = 1e-6): boolean => Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((x, i) => close(x, b[i], tol)) : Math.abs((a as number) - (b as number)) <= tol;

test('builds: crew versions match the tests; references pass the tests and the swarm in CPython', () => {
  for (const b of [buildRowEchelon, buildBackSub]) {
    for (const t of b.tests) assert.ok(close(b.swarm!.crew(...t.args), t.expect), `${b.fn}: ${t.name}`);
    const r = seeded(13);
    const cases = Array.from({ length: 150 }, () => b.swarm!.gen(r, 'commander'));
    const py = runPy(b.solution, b.fn, [...b.tests.map((t) => t.args), ...cases]);
    if (py.error) continue;
    assert.equal(py.status, 0, py.stderr);
    const out = py.stdout.trim().split('\n').map((l) => JSON.parse(l));
    b.tests.forEach((t, i) => assert.ok(close(out[i], t.expect), `${b.fn} test ${t.name}: ${JSON.stringify(out[i])}`));
    cases.forEach((c, i) => assert.ok(close(out[b.tests.length + i], b.swarm!.crew(...c), 1e-6), `${b.fn} swarm ${JSON.stringify(c)}`));
    // the Assemble lines, in order, pass the tests too
    const asm = runPy(b.assemble!.lines.join('\n'), b.fn, [...b.tests.map((t) => t.args), ...cases]);
    assert.equal(asm.status, 0, asm.stderr);
    const aout = asm.stdout.trim().split('\n').map((l) => JSON.parse(l));
    b.tests.forEach((t, i) => assert.ok(close(aout[i], t.expect), `${b.fn} assembled: ${t.name}`));
    cases.forEach((c, i) => assert.ok(close(aout[b.tests.length + i], b.swarm!.crew(...c), 1e-6), `${b.fn} assembled swarm`));
    // the Fill template's blanks are the solution's own pieces
    assert.ok(fillAnswers(b.fill!, b.solution)?.length, `${b.fn} fill resolves`);
    // each decoy line breaks a test
    for (const decoy of b.assemble!.decoys!) {
      const lines = b.assemble!.lines.slice();
      const indent = decoy.match(/^ */)![0].length;
      const at = lines.findIndex((l) => l.match(/^ */)![0].length === indent && l.trim().split(/[ =(]/)[0] === decoy.trim().split(/[ =(]/)[0]);
      if (at < 0) continue;
      lines[at] = decoy;
      const bad = runPy(lines.join('\n'), b.fn, b.tests.map((t) => t.args));
      const got = bad.status === 0 ? bad.stdout.trim().split('\n').map((l) => JSON.parse(l)) : null;
      assert.ok(!got || b.tests.some((t, i) => !close(got[i], t.expect)), `${b.fn} decoy should fail: ${decoy}`);
    }
  }
  // the staircase from row_echelon has the same solutions as the board
  assert.ok(sameSolutions(rowEchelonCrew(P1.aug), P1.aug));
});
