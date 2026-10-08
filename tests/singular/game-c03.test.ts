// Chapter 3: story numbers, pure win checks, doubt predicates (Chapter 3 and the Act I Review), the Law,
// the set piece and the find_loop build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import * as L from '../../site/src/singular/content/chapters/c03-independence/logic.ts';
import { buildFindLoop } from '../../site/src/singular/content/chapters/c03-independence/build.ts';
import { buildLincomb } from '../../site/src/singular/content/chapters/c02-span/build.ts';
import { S } from '../../site/src/singular/content/chapters/c03-independence/script.ts';
import { checkLaw, rng, rint } from '../../site/src/singular/game/lawcheck.ts';
import { combo, norm, veq, solve, fromCols, det } from '../../site/src/singular/math/la.ts';

test('p1 [F]: 2u + 3v − w = 0; all-zero dials and near misses do not count', () => {
  assert.ok(veq(combo(L.P1_LOOP, [L.P1_U, L.P1_V, L.P1_W]), [0, 0, 0]));
  assert.ok(L.p1Won([2, 3, -1]));
  assert.ok(L.p1Won([-4, -6, 2]), 'any multiple is a loop');
  assert.ok(!L.p1Won([0, 0, 0]), 'the all-zero firing is not a loop');
  assert.ok(!L.p1Won([2, 3, 1]), 'w fired forwards');
  assert.equal(L.spanDim([L.P1_U, L.P1_V, L.P1_W]), 2);
});

test('loops are scale-invariant: tiny dials are not a loop, a small real loop still is', () => {
  const P1 = [L.P1_U, L.P1_V, L.P1_W];
  assert.ok(!L.p1Won([0.01, 0, 0]), 'typed 0.01 barely moves the ship but is no loop (cadet / navigator tolerance)');
  assert.ok(!L.isLoop(P1, [0.004, 0, 0], 0.01), 'commander tolerance');
  assert.ok(!L.isLoop(P1, [1e-6, 1e-6, 0]), 'tiny is not zero');
  assert.ok(L.isLoop(P1, [0.2, 0.3, -0.1], 0.01), 'a loop scaled down is still a loop');
  assert.ok(L.isLoop(P1, [20, 30, -10], 0.01), 'and scaled up');
  assert.ok(!L.isLoop(P1, [2, 3, 1]));
  // Review (F) zero arrow: (0.02, 0) on (1, 0, 1) and the zero arrow is not a loop, so it does not break the claim
  assert.equal(L.zeroIndependentHolds([[1, 0, 1], [0, 0, 0]], [0.02, 0]), true);
  assert.equal(L.zeroIndependentHolds([[1, 0, 1], [0, 0, 0]], [0, 0.02]), false, 'any non-zero dial on the zero arrow alone is a loop');
  // Review (F) one way: near-identical firings are one way, not two
  const SPARE = [[1, 0, 1], [0, 1, 1], [1, 2, 3]];
  assert.equal(L.oneWayHolds(SPARE, [2, 3, 5], [[2, 3, 0], [2.02, 3, 0]]), true, 'one way only');
  assert.equal(L.oneWayHolds(SPARE, [2, 3, 5], [[2, 3, 0], [1, 1, 1]]), false, 'the loop (1, 2, −1) between them');
  const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  assert.equal(L.oneWayHolds(I3, [1, 1, 1], [[1, 1, 1], [1.02, 1, 1]]), true, 'independent arrows give one way only');
});

test('p2: the spare (1, 2, 3) is 1 of (1, 0, 1) plus 2 of (0, 1, 1); the signal stays out of reach', () => {
  assert.ok(veq(combo(L.SPARE_BAD_DIALS, L.THRUST3), L.SPARE_BAD));
  assert.ok(L.p2Won(L.SPARE_BAD));
  assert.ok(!L.p2Won([1, 1, 2]));
  assert.equal(L.spanDim([...L.THRUST3, L.SPARE_BAD]), 2);
  assert.ok(L.distToSpan([...L.THRUST3, L.SPARE_BAD], L.SIGNAL) > 1);
});

test('p3: mount C reaches the signal with fuel 3; B needs fuel 4; A adds nothing', () => {
  assert.ok(veq(combo(L.P3_DIALS, [...L.THRUST3, L.MOUNTS[2]]), L.SIGNAL));
  assert.equal(L.fuel(L.P3_DIALS), 3);
  assert.ok(L.p3Won(2, [1, 1, -1]));
  const b = solve(fromCols([...L.THRUST3, L.MOUNTS[1]]), L.SIGNAL);
  assert.equal(b.kind, 'unique');
  if (b.kind === 'unique') { assert.ok(veq(b.x, [-1, -1, 2])); assert.equal(L.fuel(b.x), 4); assert.ok(!L.p3Won(1, b.x), 'over the fuel limit'); }
  assert.equal(L.spanDim([...L.THRUST3, L.MOUNTS[0]]), 2, 'mount A lies in the old plane');
  assert.ok(veq(combo([2, -1], L.THRUST3), L.MOUNTS[0]));
  assert.equal(solve(fromCols([...L.THRUST3, L.MOUNTS[0]]), L.SIGNAL).kind, 'none');
});

test('p4: any of the first three can go; (0, 0, 1) cannot', () => {
  for (let i = 0; i < 4; i++) {
    const bolted = [true, true, true, true];
    bolted[i] = false;
    assert.equal(L.p4Won(bolted), i < 3, `unbolting ${i}`);
  }
  assert.ok(!L.p4Won([true, true, true, true]), 'nothing unbolted');
});

test('p5 [D]: Bram’s four arrows: the first three reach everything and the loop has dial −1 on the fourth', () => {
  for (const level of ['cadet', 'navigator', 'commander'] as const) {
    const r = rng(level.length * 101);
    for (let i = 0; i < 60; i++) {
      const f = L.bramFour(r, level);
      assert.equal(L.spanDim(f.arrows.slice(0, 3)), 3);
      assert.ok(veq(combo(f.dials, f.arrows.slice(0, 3)), f.arrows[3]));
      assert.ok(L.isLoop(f.arrows, [...f.dials, -1]));
      assert.ok(f.arrows.slice(0, 3).every((a) => !L.parallel(a, f.arrows[3])), 'no parallel pair with the fourth');
      assert.ok(Math.abs(det(fromCols(f.arrows.slice(0, 3)))) >= 0.5);
    }
  }
});

test('p6 [S]: three arrows in the plane always have a loop', () => {
  const r = rng(3);
  for (let i = 0; i < 300; i++) {
    const vs = [0, 1, 2].map(() => [rint(r, -4, 4), rint(r, -4, 4)]);
    const l = L.planeLoop(vs)!;
    assert.ok(l && L.isLoop(vs, l, 1e-9), JSON.stringify(vs));
  }
});

test('Act I set piece: unbolt the spare, dials 4, −1, 1.5, fuel 6.5; four powered is refused; a plane misses', () => {
  assert.ok(veq(combo(L.SP_DIALS, L.SP_ARROWS), L.SP_TARGET));
  assert.equal(L.fuel(L.SP_DIALS), 6.5);
  assert.ok(L.spWon([true, true, true, false], L.SP_DIALS));
  assert.ok(!L.spWon([true, true, true, true], L.SP_DIALS), 'power for three only');
  // the spare adds no direction: 2v − w
  assert.ok(veq(combo([2, -1], L.SP_ARROWS.slice(0, 2)), L.SP_ARROWS[3]));
  // without u, the other three lie in one plane and miss
  assert.equal(L.spanDim([L.SP_ARROWS[0], L.SP_ARROWS[1], L.SP_ARROWS[3]]), 2);
  assert.equal(solve(fromCols([L.SP_ARROWS[0], L.SP_ARROWS[1], L.SP_ARROWS[3]]), L.SP_TARGET).kind, 'none');
  // the other two good prunes also reach it within the fuel
  assert.ok(L.spWon([false, true, true, true], [0, 1, 1.5, 2]));
  assert.ok(L.spWon([true, false, true, true], [2, 0, 1.5, 1]));
});

test('doubts: zero arrow (T) holds for every case; pairwise-apart (F) breaks on the spare; the Review claims', () => {
  const r = rng(11);
  for (let i = 0; i < 300; i++) {
    const vs = [0, 1].map(() => [rint(r, -3, 3), rint(r, -3, 3), rint(r, -3, 3)]);
    assert.ok(L.zeroLoopHolds([...vs, [0, 0, 0]]));
  }
  assert.ok(L.zeroLoopHolds([[0, 0, 0], [0, 0, 0], [0, 0, 0]]));
  assert.ok(L.zeroLoopHolds([[1, 2, 0], [-2, -4, 0], [0, 0, 0]]));
  // (F) pairwise apart: the canonical counterexample is the spare
  assert.equal(L.apartUsefulHolds([[1, 0, 1], [0, 1, 1], [1, 2, 3]]), false);
  assert.equal(L.apartUsefulHolds([[1, 0, 1], [0, 1, 1], [1, 1, 1]]), true, 'the starting arrows agree with the claim');
  // Review (F) three reach more than two
  assert.equal(L.threeMoreHolds([[1, 0, 1], [0, 1, 1], [1, 2, 3]]), false);
  assert.equal(L.threeMoreHolds([[1, 0, 1], [0, 1, 1], [0, 0, 2]]), true);
  // Review (F) only one way: two firings to the crate with the wasted spare
  assert.equal(L.oneWayHolds([[1, 0, 1], [0, 1, 1], [1, 2, 3]], [2, 3, 5], [[2, 3, 0], [1, 1, 1]]), false);
  assert.ok(veq(combo([1, 1, 1], [[1, 0, 1], [0, 1, 1], [1, 2, 3]]), [2, 3, 5]));
  assert.equal(L.oneWayHolds([[1, 0, 1], [0, 1, 1], [1, 2, 3]], [2, 3, 5], [[2, 3, 0]]), true, 'one firing proves nothing');
  // Review (T) deck: two arrows in different directions on the deck
  for (let i = 0; i < 300; i++) { const v = [rint(r, -3, 3), rint(r, -3, 3), 0], w = [rint(r, -3, 3), rint(r, -3, 3), 0]; assert.ok(L.deckHolds(v, w)); }
  // Review (F) zero arrow in an independent set: the loop (0, 1) breaks it
  assert.equal(L.zeroIndependentHolds([[1, 0, 1], [0, 0, 0]], [0, 1]), false);
  assert.equal(L.zeroIndependentHolds([[1, 0, 1], [0, 0, 0]], [1, 0]), true);
});

test('doubt and review wording: the claims say "not on one line", the edge cases they exclude stay vacuous', () => {
  const src = readFileSync(new URL('../../site/src/singular/content/chapters/c03-independence/briefing.ts', import.meta.url), 'utf8');
  assert.ok(src.includes("claim: 'No two of these three lie on one line, so all three must be useful.'"));
  assert.ok(src.includes("claim: 'Two arrows that are not on one line reach every point of a flat deck.'"));
  assert.ok(!src.includes('in different directions reach every point'));
  assert.ok(src.includes('Either way, four arrows in 3-D are always dependent.'), 'Ilse’s page covers three arrows that already loop');
  // opposite arrows and the zero arrow lie on one line with another arrow: the claims do not apply to them
  assert.equal(L.pairwiseApart([[1, 0, 0], [-1, 0, 0], [0, 1, 0]]), false);
  assert.equal(L.pairwiseApart([[0, 0, 0], [1, 0, 0], [0, 1, 0]]), false);
  assert.equal(L.apartUsefulHolds([[1, 0, 0], [-1, 0, 0], [0, 1, 0]]), true);
  assert.equal(L.apartUsefulHolds([[0, 0, 0], [1, 0, 0], [0, 1, 0]]), true);
  assert.ok(L.parallel([1, 0, 0], [-1, 0, 0]) && L.deckHolds([1, 0, 0], [-1, 0, 0]));
});

test('p5 [D]: the derivation splits on whether the first three already loop', () => {
  const src = readFileSync(new URL('../../site/src/singular/content/chapters/c03-independence/puzzles.ts', import.meta.url), 'utf8');
  const tiles = src.slice(src.indexOf('const P5_TILES'), src.indexOf('const P5_DECOY'));
  assert.deepEqual([...tiles.matchAll(/id: '(\w+)'/g)].map((m) => m[1]), ['split', 'indep', 'reach', 'combo', 'move', 'loop']);
  // the split case: a loop of the first three, with dial 0 on a fourth, is a loop of all four
  const flat = [[1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1]];
  const l = L.loopOf(flat.slice(0, 3))!;
  assert.ok(L.isLoop(flat, [...l, 0], 1e-9));
});

test('wording: earned terms only, and LANTERN keeps "not all zero" in the p6 task', () => {
  assert.ok(!/null space/i.test(buildFindLoop.ilseNote ?? ''), 'null space is a Chapter 15 term');
  assert.match(buildFindLoop.ilseNote ?? '', /Chapter 15 finds every loop at once/);
  assert.equal(S.p6[0].text, 'Optional. Three arrows on the flat holotable. Try to place them so that only the all-zero firing brings the ship back.');
});

test('Law: the target survives 500 cases; only the true fillings survive; "two are parallel" breaks', () => {
  assert.equal(checkLaw(L.lawCore, L.lawCore.answer).survived, true);
  const TRUE = new Set(['dep/loop', 'indep/onlyzero']);
  for (const kind of ['dep', 'indep']) for (const cond of ['loop', 'onlyzero', 'parallel', 'zero', 'many']) {
    const r = checkLaw(L.lawCore, { kind, cond });
    assert.equal(r.survived, TRUE.has(`${kind}/${cond}`), `${kind}/${cond}: ${r.counterexample ?? 'survived'}`);
  }
  const par = checkLaw(L.lawCore, { kind: 'dep', cond: 'parallel' });
  assert.match(par.counterexample!, /dependent/);
});

test('find_loop: the crew version passes every listed test and the swarm stays cheap', () => {
  for (const t of buildFindLoop.tests) {
    const got = L.findLoopCrew(t.args[0] as number[][]);
    assert.deepEqual(got, t.expect, t.name);
  }
  const r = rng(5);
  for (let i = 0; i < 300; i++) {
    const args = buildFindLoop.swarm!.gen(r, 'commander');
    const vs = args[0] as number[][];
    const got = L.findLoopCrew(vs);
    if (got) assert.ok(L.isLoop(vs, got, 1e-9));
    else assert.equal(L.spanDim(vs), vs.length);
  }
  assert.deepEqual(buildFindLoop.uses, ['scale', 'add', 'lincomb']);
});

test('find_loop: the Python solution passes its tests and a 300-case swarm quickly (python3)', { skip: spawnSync('python3', ['--version']).status !== 0 }, () => {
  const lib = 'import math\ndef add(v, w):\n    return [a + b for a, b in zip(v, w)]\ndef scale(c, v):\n    return [c * x for x in v]\n' + buildLincomb.solution;
  const r = rng(9);
  const swarm = Array.from({ length: 300 }, () => { const a = buildFindLoop.swarm!.gen(r, 'commander'); return { args: a, expect: L.findLoopCrew(a[0] as number[][]) }; });
  const cases = [...buildFindLoop.tests.map((t) => ({ args: t.args, expect: t.expect })), ...swarm];
  const src = `${lib}\n${buildFindLoop.solution}\nimport json, time\nt0 = time.time()\nok = [find_loop(*c['args']) == c['expect'] for c in json.loads(${JSON.stringify(JSON.stringify(cases))})]\nprint(json.dumps({'ok': ok, 'secs': time.time() - t0}))\n`;
  const res = spawnSync('python3', ['-I', '-c', src], { encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout) as { ok: boolean[]; secs: number };
  assert.ok(out.ok.every(Boolean), `failures at ${out.ok.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0).join(', ')}`);
  assert.ok(out.secs < 0.8, `swarm took ${out.secs.toFixed(2)} s natively (Pyodide is several times slower)`);
});

test('Chapter 2 reachable swarm runs fast in Python too (python3)', { skip: spawnSync('python3', ['--version']).status !== 0 }, async () => {
  const { buildReachable } = await import('../../site/src/singular/content/chapters/c02-span/build.ts');
  const r = rng(13);
  const cases = Array.from({ length: 300 }, () => { const a = buildReachable.swarm!.gen(r, 'commander'); return { args: a, expect: buildReachable.swarm!.crew(...a) }; });
  assert.ok(cases.every((c) => c.expect !== null), 'every swarm target is found');
  const src = `${buildReachable.solution}\nimport json, time\ndef close(a, b):\n    return (a is None and b is None) or (a is not None and b is not None and all(abs(x - y) < 1e-6 for x, y in zip(a, b)))\nt0 = time.time()\nok = [close(reachable(*c['args']), c['expect']) for c in json.loads(${JSON.stringify(JSON.stringify(cases))})]\nprint(json.dumps({'ok': ok, 'secs': time.time() - t0}))\n`;
  const res = spawnSync('python3', ['-I', '-c', src], { encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout) as { ok: boolean[]; secs: number };
  assert.ok(out.ok.every(Boolean));
  assert.ok(out.secs < 0.8, `swarm took ${out.secs.toFixed(2)} s natively`);
  assert.ok(norm([1]) === 1);
});
