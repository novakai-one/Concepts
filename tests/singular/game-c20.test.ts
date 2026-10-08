// Chapter 20: the story numbers (TT13, TT14, TT15), every puzzle's win check (reference wins, misconceptions
// do not), the Doubts and the Act VII Review (canonical construction right, the Shake finds the breaking
// case), the Law (the target survives 500 cases, each near-miss breaks), the Procedure (the reference
// succeeds; dropping each key step fails as listed), the set piece and the build (reference passes its
// tests and a swarm in CPython; each decoy fails).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as L from '../../site/src/singular/content/chapters/c20-steady/logic.ts';
import { S } from '../../site/src/singular/content/chapters/c20-steady/script.ts';
import { STEADY, STEADY_TESTS, buildSteady } from '../../site/src/singular/content/chapters/c20-steady/build.ts';

import { checkLaw, rng, rint } from '../../site/src/singular/game/lawcheck.ts';
import { det, eigvals3, matVec, mpow, transpose, veq, type Mat } from '../../site/src/singular/math/la.ts';
import { DRONES, DRONES_START, DRONES_STEADY, V, VELL_CUTTER } from '../../site/src/singular/content/truth.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const said = (ls: unknown[]) => (ls as ({ text: string } | [string, string])[]).map((l) => (Array.isArray(l) ? l[1] : l.text)).join(' ');

test('the drone chain (TT14): one hour (240, 30, 30), two (204, 51, 45), steady (150, 90, 60); other eigenvalues 0.6, 0.5', () => {
  assert.ok(L.isStochastic(DRONES));
  assert.ok(veq(L.P1_HOUR1, [240, 30, 30], 1e-9) && veq(L.P1_HOUR2, [204, 51, 45], 1e-9));
  assert.ok(veq(L.steadyOf(DRONES, 300)!, DRONES_STEADY, 1e-9));
  const ev = eigvals3(DRONES).map((x) => Math.round(x * 1e9) / 1e9);
  assert.deepEqual(ev, [1, 0.6, 0.5]);
  assert.ok(said(S.p1Win).includes('(240, 30, 30)') && said(S.p2Win).includes('(150, 90, 60)'));
});

test('p1: the shares written in the columns win; the rows (the transpose) make drones from nowhere', () => {
  assert.ok(L.p1Won(DRONES));
  assert.ok(!L.p1Won(L.P1_ROWS));
  assert.ok(!L.isStochastic(L.P1_ROWS), 'its columns do not add to 1');
  assert.ok(veq(L.P1_ROWS_HOUR1, [240, 60, 60], 1e-9));
  close(L.P1_ROWS_HOUR1.reduce((a, b) => a + b, 0), 360);
  // the shares as told: from the Bow 80% stay, 10% and 10%
  assert.deepEqual(L.SHARES.filter((s) => s.from === 0).map((s) => s.share), [0.8, 0.1, 0.1]);
});

test('p2 [H] [X9]: 10(P − I) has null space t(2.5, 1.5, 1); scaled to 300 drones (150, 90, 60)', () => {
  assert.deepEqual(L.P2_AUG, [[-2, 2, 2, 0], [1, -3, 2, 0], [1, 1, -4, 0]]);
  assert.ok(veq(L.P2_Q1, [2.5, 1.5, 1], 1e-12));
  assert.ok(L.p2Won([150, 90, 60]));
  assert.ok(!L.p2Won([0.5, 0.3, 0.2]), 'the shares, not the drones');
  assert.ok(!L.p2Won([250, 150, 100]), 'not scaled to 300');
  assert.ok(L.settlesTo(DRONES, DRONES_START, DRONES_STEADY));
});

test('p3: all-Bow, all-Stern and an even split all end at (150, 90, 60); so do random starts', () => {
  for (const s of L.P3_STARTS) assert.ok(L.settlesTo(DRONES, s, DRONES_STEADY));
  const r = rng(20);
  for (let i = 0; i < 50; i++) { const x = [rint(r, 0, 10), rint(r, 0, 10), rint(r, 0, 10)]; const t = x.reduce((a, b) => a + b, 0) || 1; assert.ok(L.settlesTo(DRONES, x.map((v) => (v / t) * 300), DRONES_STEADY)); }
});

test('p4 [D]: Pᵀ1 = 1; det(P − λI) = 0 at λ = 1 (and 0.6, 0.5); a transpose keeps the determinant', () => {
  assert.ok(veq(L.P4_PT1, L.ONES, 1e-12));
  assert.ok(L.colSums(DRONES).every((s) => Math.abs(s - 1) < 1e-12));
  close(L.shiftDet(DRONES, 1), 0, 1e-12);
  for (const l of L.P4_OTHERS) close(L.shiftDet(DRONES, l), 0, 1e-12);
  for (const l of [0, 0.3, 0.9, 1.2]) close(L.shiftDet(transpose(DRONES), l), L.shiftDet(DRONES, l), 1e-12);
  assert.ok(Math.abs(L.shiftDet(DRONES, 0.95)) > 1e-4);
  assert.equal(L.P4_ORDER.join(), 'a,b,c,d');
});

test('p5 (TT15): 80% is the smallest whole percent with 100 at the Stern: (125, 75, 100); 79% gives 96.8', () => {
  assert.equal(L.P5_BEST, 80);
  assert.ok(veq(L.P5_STEADY, [125, 75, 100], 1e-9));
  close(Math.round(L.sternAt(79) * 10) / 10, 96.8);
  assert.ok(L.p5Won(80) && !L.p5Won(79) && !L.p5Won(85));
  assert.ok(L.sternAt(85) >= 100, '85% works too, but is not the smallest');
  assert.ok(L.isStochastic(L.designP(0.8)));
  assert.ok(veq(L.steadyOf(L.designP(0.6), 300)!, DRONES_STEADY, 1e-9), 'at 60% the design is the drone chain itself');
  assert.ok(said(S.p5Win).includes('(125, 75, 100)'));
});

test('p6: the swap never settles (eigenvalue −1); a 10% stay share settles at (50, 50)', () => {
  assert.equal(L.settlesHolds(L.SWAP), false);
  assert.equal(L.settlesHolds(L.bays(0.1)), true);
  assert.ok(veq(L.after(L.bays(0.1), [100, 0], 60), [50, 50], 0.01));
  assert.ok(veq(L.after(L.SWAP, [100, 0], 7), [0, 100]));
  assert.ok(L.p6Won(4, 0.1, true));
  assert.ok(!L.p6Won(2, 0.1, true), 'run the swap first');
  assert.ok(!L.p6Won(4, 0, false), 'the swap alone never settles');
  // any stay share can win, so the fixed lines must not name one
  assert.ok(!/ten percent|10%/.test(said(S.p6Win)), 'the win line holds for any stay share');
});

test('p7 [S] PageRank: C 0.394, A 0.373, B 0.196, D 0.038; 13 steps to settle', () => {
  assert.deepEqual(L.PR.map((x) => Math.round(x * 1000) / 1000), [0.373, 0.196, 0.394, 0.038]);
  assert.deepEqual(L.PR_ORDER, ['C', 'A', 'B', 'D']);
  assert.equal(L.PR_STEPS, 13);
  assert.ok(L.isStochastic(L.LINK_M));
  assert.ok(L.p7Won(['C', 'A', 'B', 'D']) && !L.p7Won(['A', 'C', 'B', 'D']));
});

test('Doubts: the start matters (F), every chain settles (F), settled drones keep moving (T)', () => {
  assert.equal(L.startMattersHolds(DRONES, [0, 0, 300], [300, 0, 0]), false);
  const r = rng(21);
  for (let i = 0; i < 20; i++) assert.equal(L.startMattersHolds(DRONES, [rint(r, 0, 9), rint(r, 0, 9), rint(r, 1, 9)], [rint(r, 1, 9), rint(r, 0, 9), rint(r, 0, 9)]), false);
  assert.equal(L.startMattersHolds(L.SWAP, [1, 0], [0, 1]), true, 'the swap: two starts stay apart');
  assert.equal(L.settlesHolds(L.SWAP), false);
  assert.equal(L.settlesHolds([[0.3, 0.8], [0.7, 0.2]]), true);
  // |λ₂| = 0.9 is slow but still settles: the Doubt must not call it a swing
  assert.equal(L.settlesHolds([[0, 0.9], [1, 0.1]]), true);
  assert.equal(L.settlesHolds([[0.1, 1], [0.9, 0]]), true);
  // every pair of slider stay shares (0% to 90%) settles except the swap, and the Doubt agrees with the Law
  for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) {
    const P: Mat = [[a / 10, 1 - b / 10], [1 - a / 10, b / 10]];
    assert.equal(L.settlesHolds(P), !(a === 0 && b === 0), `stay shares ${a * 10}% and ${b * 10}%`);
    assert.equal(L.settlesHolds(P), L.settlesFromAll(P));
  }
  // (T) still moving: 81 drones change section every hour at (150, 90, 60)
  close(L.movingAtSteady(DRONES), 81, 1e-9);
  assert.ok(L.stillMovingHolds(DRONES));
  for (let i = 0; i < 100; i++) assert.ok(L.stillMovingHolds(L.randChain(r, 3, 1)));
  close(L.STEADY_FLOWS.flat().reduce((a, b) => a + b, 0), 300, 1e-9);
});

test('Review (Vell): triangular eigenvalues are the diagonal (T); the steady state of a regular chain ignores the start (T)', () => {
  const r = rng(22);
  for (let i = 0; i < 200; i++) {
    const U: Mat = [[rint(r, -4, 4), rint(r, -4, 4), rint(r, -4, 4)], [0, rint(r, -4, 4), rint(r, -4, 4)], [0, 0, rint(r, -4, 4)]];
    assert.ok(L.triangularHolds(U));
  }
  assert.ok(L.triangularHolds([[0, 1, 0], [0, 0, 1], [0, 0, 0]]));
  // the readout's eigenvalues come from det(A − λI) = 0, with multiplicity: they match the diagonal
  const two = (v: number[]) => v.map((x) => (Math.round(x * 100) / 100 + 0).toFixed(2)).join(', ');
  const diag = (U: Mat) => two([U[0][0], U[1][1], U[2][2]].sort((a, b) => b - a));
  assert.equal(two(L.eigvalsWithMult3([[2, 5, 1], [0, 2, 3], [0, 0, 2]])), '2.00, 2.00, 2.00');
  assert.equal(two(L.eigvalsWithMult3([[2, 3, -1], [0, 4, 0], [0, 0, 4]])), '4.00, 4.00, 2.00');
  assert.equal(two(L.eigvalsWithMult3([[-3, -3, 1], [0, -4, 0], [0, 0, -4]])), '-3.00, -4.00, -4.00');
  assert.equal(two(L.eigvalsWithMult3([[0, 1, 0], [0, 0, 1], [0, 0, 0]])), '0.00, 0.00, 0.00');
  for (let i = 0; i < 5000; i++) {
    const U: Mat = [[rint(r, -4, 4), rint(r, -4, 4), rint(r, -4, 4)], [0, rint(r, -4, 4), rint(r, -4, 4)], [0, 0, rint(r, -4, 4)]];
    assert.equal(two(L.eigvalsWithMult3(U)), diag(U), JSON.stringify(U));
  }
  assert.equal(two(L.eigvalsWithMult3(DRONES)), '1.00, 0.60, 0.50', 'not only for triangular matrices');
  for (let i = 0; i < 100; i++) assert.equal(L.startMattersHolds(L.randChain(r, 3, 1), [1, 0, 0], [0, 0, 1]), false);
});

test('Law: “columns add to 1 ⇒ 1 is an eigenvalue” survives 500 cases; settles / smaller / unique break', () => {
  assert.equal(checkLaw(L.LAW_CORE, L.LAW_CORE.answer).survived, true);
  for (const f of L.LAW_NEAR_MISSES) assert.equal(checkLaw(L.LAW_CORE, f).survived, false, JSON.stringify(f));
});

test('Procedure: start, apply, rescale, repeat settles at (0.5, 0.3, 0.2); each missing key step fails as listed', () => {
  const ok = L.runProc(L.PROC_REF);
  assert.ok(ok.ok && veq(ok.result!, [0.5, 0.3, 0.2], 2e-3));
  assert.equal(L.runProc(L.PROC_REF.filter((x) => x !== 'apply')).fault, 'noapply');
  assert.equal(L.runProc(L.PROC_REF.filter((x) => x !== 'rescale')).fault, 'norescale');
  assert.equal(L.runProc(L.PROC_REF.filter((x) => x !== 'repeat')).fault, 'once');
  assert.equal(L.runProc(L.PROC_REF.filter((x) => x !== 'start')).fault, 'nostart');
  assert.equal(L.runProc(['start', 'repeat', 'apply', 'rescale']).fault, 'once', 'repeat placed before the steps it repeats');
  assert.equal(L.runProc(['start', 'apply', 'len', 'repeat']).fault, 'len');
  assert.equal(L.runProc(['start', 'solve0', 'rescale', 'repeat']).fault, 'solve0');
  // q = 0 has nothing to rescale: every pass LANTERN shows is a number, never NaN
  for (const ids of [['start', 'solve0', 'rescale', 'repeat'], ['start', 'solve0', 'len', 'repeat'], ['start', 'solve0', 'apply', 'rescale', 'repeat']]) {
    const run = L.runProc(ids);
    assert.equal(run.fault, 'solve0', ids.join());
    assert.ok(run.trace.every((x) => x.every(Number.isFinite)), `finite trace: ${ids.join()}`);
  }
  // LANTERN says what it rounds: three decimals, then whole drones, then the exact answer
  assert.equal(L.procShares(ok.result!), '(0.501, 0.299, 0.200)');
  assert.ok(ok.message.includes('(0.501, 0.299, 0.200)') && ok.message.includes('about 150, 90 and 60') && ok.message.includes('exact steady state is (0.5, 0.3, 0.2)'), ok.message);
  assert.ok(L.PROC_KEYS.every((k) => L.PROC_REF.includes(k)));
});

test('[SP] the fiftieth pulse (TT13): lines, cutter (2, 1, 1) in that grid, (2, 2, 2) after fifty, det 0.1', () => {
  for (const [v, l] of L.SP_LINES) assert.ok(veq(matVec(V, v), v.map((x) => x * l), 1e-12));
  assert.ok(veq(L.SP_COORDS, [2, 1, 1], 1e-12));
  assert.ok(L.spCoordsOk([2, 1, 1]) && !L.spCoordsOk([4, 2, 0]));
  assert.ok(veq(L.SP_AFTER, [2, 2, 2], 1e-9));
  assert.ok(veq(matVec(mpow(V, 50), VELL_CUTTER), L.SP_AFTER));
  assert.ok(L.spForecastOk([2, 2, 2]) && !L.spForecastOk([0, 0, 0]) && !L.spForecastOk([4, 2, 0]));
  close(L.SP_DET, 0.1, 1e-12); close(det(V), 1 * 0.5 * 0.2, 1e-12);
  assert.ok(L.spDetOk(0.1) && !L.spDetOk(1));
  assert.equal(L.SP_EXP, -50);
  assert.equal(L.SP_CANDIDATES.filter((c) => L.spLineOk(c)).length, 3);
  assert.ok(said(S.spWin).includes('(4, 2, 0)') && said(S.spWin).includes('(2, 2, 2)'));
});

test('the flow board and the triangle: whole drones add up; splits map to the triangle and back', () => {
  assert.deepEqual(L.apportion([240, 30, 30], 300), [240, 30, 30]);
  assert.equal(L.apportion([0.5, 0.3, 0.2], 7).reduce((a, b) => a + b, 0), 7);
  assert.equal(L.apportion([1 / 3, 1 / 3, 1 / 3], 100).reduce((a, b) => a + b, 0), 100);
  for (const x of [[300, 0, 0], [150, 90, 60], [100, 100, 100]]) { const q = L.triPoint(x); assert.ok(veq(L.triSplit([q[0], q[1]], 300), x, 1e-9)); }
});

// ------------------------------------------------------------------ build in CPython

const LIB = `
def add(v, w):
    return [a + b for a, b in zip(v, w)]
def scale(c, v):
    return [c * x for x in v]
def lincomb(cs, vs):
    total = scale(0, vs[0])
    for c, v in zip(cs, vs):
        total = add(total, scale(c, v))
    return total
def matvec(A, x):
    columns = [[row[j] for row in A] for j in range(len(x))]
    return lincomb(x, columns)
def power_iteration(A, x, steps):
    for _ in range(steps):
        x = matvec(A, x)
        size = math.sqrt(sum(t * t for t in x))
        x = [t / size for t in x]
    return x
`;

function runPy(fn: string, code: string, cases: { args: unknown[]; expect: unknown }[]): boolean[] {
  const prog = `import json, math\n${LIB}\n${code}\ndef close(a, b):\n    if isinstance(a, (list, tuple)):\n        return isinstance(b, (list, tuple)) and len(a) == len(b) and all(close(x, y) for x, y in zip(a, b))\n    return abs(a - b) < 1e-6\nres = []\nfor a, e in json.loads(${JSON.stringify(JSON.stringify(cases.map((t) => [t.args, t.expect])))}):\n    try:\n        res.append(close(${fn}(*a), e))\n    except Exception:\n        res.append(False)\nprint(json.dumps(res))\n`;
  return JSON.parse(execFileSync('python3', ['-I', '-c', prog], { encoding: 'utf8', timeout: 60000 }));
}

test('build: steady_state passes its tests and a swarm; each decoy fails one', () => {
  const b = buildSteady;
  assert.ok(runPy(b.fn, STEADY, STEADY_TESTS).every(Boolean), 'tests');
  const r = rng(201);
  const cases = Array.from({ length: 150 }, (_, i) => { const args = b.swarm!.gen(r, ['cadet', 'navigator', 'commander'][i % 3]); return { args, expect: b.swarm!.crew(...args) }; });
  assert.ok(runPy(b.fn, STEADY, cases).every(Boolean), 'swarm');
  for (const t of STEADY_TESTS) assert.ok(veq(L.crewSteady(t.args[0] as Mat), t.expect as number[], 1e-9), `crew agrees: ${t.name}`);
  for (const decoy of b.assemble!.decoys ?? []) {
    const lines = b.assemble!.lines.slice();
    const key = (l: string) => `${l.match(/^ */)![0].length}:${l.trim().split(/[ =(]/)[0]}`;
    let at = -1;
    lines.forEach((l, i) => { if (i >= 2 && key(l) === key(decoy)) at = i; });
    assert.ok(at >= 0, `decoy has a line to replace: ${decoy}`);
    lines[at] = decoy;
    assert.ok(runPy(b.fn, `${lines.join('\n')}\n`, STEADY_TESTS).some((x) => !x), `decoy: ${decoy}`);
  }
});
