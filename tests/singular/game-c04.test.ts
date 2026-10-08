// Chapter 4: puzzle numbers, pure win checks, doubt predicates, the Law and the beacon matcher.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../site/src/singular/content/chapters/c04-dot/logic.ts';
import { checkLaw, rng } from '../../site/src/singular/game/lawcheck.ts';
import { angle, dot, norm, proj } from '../../site/src/singular/math/la.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('p1: the grid arrows read 2 and 4; (3, 1) reads 3·2 + 1·4 = 10', () => {
  close(L.reading(L.E1), 2);
  close(L.reading(L.E2), 4);
  close(L.reading(L.P1_TARGET), 10);
  close(L.reading([3, 1]), 3 * L.reading(L.E1) + 1 * L.reading(L.E2));
  assert.ok(L.p1Won(3, 1));
  assert.ok(!L.p1Won(1, 3), 'the swapped amounts are the misconception');
});

test('p2: (2, −1) and its whole multiples read 0; the zero arrow does not count', () => {
  for (const d of [[2, -1], [-2, 1], [4, -2], [-6, 3], [2, -1, 0]]) assert.ok(L.p2Won(d), `${d}`);
  for (const d of [[0, 0], [1, -1], [2, 1], [0.5, -0.25], [4, 2]]) assert.ok(!L.p2Won(d), `${d}`);
});

test('p3: the test pair is 45° apart; v·w = |v||w|cos θ for many pairs; the tile order', () => {
  close(dot(L.P3_V, L.P3_W), 5);
  close(L.deg(angle(L.P3_V, L.P3_W)), 45, 1e-9);
  close(norm([2, -1]) ** 2, 10 + 5 - 2 * 5);
  const r = rng(7);
  for (let i = 0; i < 50; i++) { const v = [r() * 8 - 4, r() * 8 - 4], w = [r() * 8 - 4, r() * 8 - 4]; close(dot(v, w), L.cosSide(v, w), 1e-9); }
  assert.ok(L.p3OrderOk(['t1', 't2', 't3', 't4', 't5']));
  assert.ok(L.p3OrderOk(['t4', 't1', 't2', 't3', 't5']));
  assert.ok(!L.p3OrderOk(['t1', 't3', 't2', 't4', 't5']));
  assert.ok(!L.p3OrderOk(['t1', 't2', 't3', 't5', 't4']));
  assert.ok(!L.p3OrderOk(['t1', 'x', 't3', 't4', 't5']));
});

test('p3 (navigator): the coefficient steps expand ‖v − w‖² for any pair and match the law of cosines', () => {
  const { cross, grouped, match } = L.P3_COEFFS;
  assert.deepEqual([cross, grouped, match], [-2, -2, 1]);
  const r = rng(13);
  for (let i = 0; i < 50; i++) {
    const v = [r() * 8 - 4, r() * 8 - 4], w = [r() * 8 - 4, r() * 8 - 4];
    close((v[0] - w[0]) ** 2, v[0] ** 2 + cross * v[0] * w[0] + w[0] ** 2, 1e-9);
    close(norm([v[0] - w[0], v[1] - w[1]]) ** 2, norm(v) ** 2 + norm(w) ** 2 + grouped * dot(v, w), 1e-9);
    // the law of cosines: ‖v − w‖² = ‖v‖² + ‖w‖² − 2‖v‖‖w‖cos θ, so the brackets match
    close(norm([v[0] - w[0], v[1] - w[1]]) ** 2, norm(v) ** 2 + norm(w) ** 2 - 2 * L.cosSide(v, w), 1e-9);
    close(dot(v, w), match * L.cosSide(v, w), 1e-9);
  }
  // the wrong numbers the worksheet names are wrong for a real pair
  for (const k of [0, -1, 2]) assert.ok(Math.abs((3 - 1) ** 2 - (9 + k * 3 + 1)) > 1e-9, `cross ${k}`);
});

test('p4: heading (1, 1, 0) and spine (1, 0, 1) are 60° apart; turning 60° lands on the spine', () => {
  close(dot(L.P4_HEADING, L.P4_SPINE) / (norm(L.P4_HEADING) * norm(L.P4_SPINE)), 0.5);
  close(L.P4_ANGLE, 60, 1e-9);
  const h = L.turnedHeading(60);
  close(L.deg(angle(h, L.P4_SPINE)), 0, 1e-4);
  assert.ok(L.p4Won(60) && L.p4Won(59.2) && !L.p4Won(45) && !L.p4Won(62));
  close(L.deg(angle(L.turnedHeading(45), L.P4_SPINE)), 15, 1e-4);
});

test('p5: raw readings 50, 24, 80 favour c; cosines 1.00, 0.96, 0.80 pick a', () => {
  const { a, b, c } = L.P5_CANDS;
  assert.deepEqual([a, b, c].map((x) => L.meter(x, false, false)), [50, 24, 80]);
  close(L.meter(a, true, true), 1); close(L.meter(b, true, true), 0.96); close(L.meter(c, true, true), 0.8);
  assert.ok(L.p5Won('a', true, true));
  assert.ok(!L.p5Won('c', false, false), 'the raw reading picks the loud echo');
  assert.ok(!L.p5Won('a', false, true), 'dividing by one length is not enough for the 1.00 lock');
  assert.ok(!L.p5Won('b', true, true));
  assert.ok(!L.lockAccepted('c', false, false));
});

test('p6: v·u = 10, u·u = 5, scale 2, shadow (4, 2), gap (−1, 2) reads 0 against u; the overshoot', () => {
  assert.equal(L.P6_STEPS.vu, 10); assert.equal(L.P6_STEPS.uu, 5); assert.equal(L.P6_STEPS.scale, 2);
  assert.deepEqual(L.P6_STEPS.tip, [4, 2]); assert.deepEqual(L.P6_STEPS.gap, [-1, 2]);
  close(dot(L.P6_STEPS.gap, L.P6_U), 0);
  close(L.P6_OVERSHOOT_SCALE, 10 / Math.sqrt(5));
  assert.ok(L.p6Won(true, [4, 2, 0]));
  assert.ok(!L.p6Won(true, [L.P6_OVERSHOOT_SCALE * 2, L.P6_OVERSHOOT_SCALE]), 'dividing by |u| once overshoots');
  assert.ok(!L.p6Won(false, [4, 2]));
});

test('p7: the readings along the axis arrows are the parts; Cauchy–Schwarz on a shake', () => {
  assert.ok(L.p7Won([3, -1, 2]));
  assert.ok(!L.p7Won([2, -1, 3]));
  const r = rng(11);
  for (let i = 0; i < 200; i++) { const v = [r() * 6 - 3, r() * 6 - 3, r() * 6 - 3], w = [r() * 6 - 3, r() * 6 - 3, r() * 6 - 3]; assert.ok(L.cauchySchwarz(v, w)); }
  assert.ok(L.cauchySchwarz([2, 1, 0], [4, 2, 0]), 'equality for parallel arrows');
});

test('p7: Bram\'s Shake has 6 cases, every one survives, and the last (parallel) one reaches 1.00', () => {
  assert.equal(L.P7_SHAKES.length, 6);
  const ratio = ([a, b]: number[][]) => Math.abs(dot(a, b)) / (norm(a) * norm(b));
  for (const c of L.P7_SHAKES) { assert.ok(L.cauchySchwarz(c[0], c[1])); assert.ok(ratio(c) <= 1 + 1e-12); }
  close(ratio(L.P7_SHAKES[5]), 1, 1e-12);
  assert.equal(ratio(L.P7_SHAKES[5]).toFixed(2), '1.00');
  for (const c of L.P7_SHAKES.slice(0, 5)) assert.ok(ratio(c) < 0.99, `${ratio(c)}`);
});

test('doubt (F): a zero reading with the signal present breaks it; the Shake finds such a case', () => {
  assert.equal(L.zeroMeansGone([2, -1], [2, 4]), false, 'the canonical counterexample');
  assert.equal(L.zeroMeansGone([1, 0], [2, 4]), true);
  assert.equal(L.zeroMeansGone([3, 3], [0, 0]), true, 'no signal at all: the claim holds there');
});

test('doubt (T): turning both arrows together never changes the reading', () => {
  const r = rng(5);
  for (let i = 0; i < 300; i++) {
    const v = [Math.round(r() * 10 - 5), Math.round(r() * 10 - 5)], w = [Math.round(r() * 10 - 5), Math.round(r() * 10 - 5)];
    assert.ok(L.turnKeepsReading(v, w, r() * 360 - 180));
  }
  assert.ok(L.turnKeepsReading([0, 0], [2, 1], 90));
  assert.ok(L.turnKeepsReading([2, 1], [4, 2], 180));
});

test('Law: the target survives 500 cases; every near-miss is broken', () => {
  assert.equal(checkLaw(L.lawCore, L.lawCore.answer).survived, true);
  const nearMisses = [
    { sign: 'zero', angle: 'right', extra: 'none' },       // forgets the zero vector
    { sign: 'zero', angle: 'acute', extra: 'orzero' },
    { sign: 'positive', angle: 'obtuse', extra: 'none' },
    { sign: 'negative', angle: 'acute', extra: 'none' },
    { sign: 'positive', angle: 'acute', extra: 'orzero' },
    { sign: 'zero', angle: 'equal', extra: 'orzero' },
    { sign: 'positive', angle: 'right', extra: 'none' },
  ];
  for (const f of nearMisses) assert.equal(checkLaw(L.lawCore, f).survived, false, JSON.stringify(f));
  assert.match(checkLaw(L.lawCore, nearMisses[0]).counterexample ?? '', /zero vector/);
});

test('beacon matcher: cosine ranks the ark first; the raw reading does not', () => {
  const sigs = L.beaconField();
  assert.equal(sigs.length, 200);
  assert.equal(sigs.filter((s) => s.ark).length, 1);
  const ranked = L.rankByCosine(L.ARK_PATTERN, sigs);
  assert.ok(sigs[ranked[0].i].ark);
  close(ranked[0].cos, 1, 1e-12);
  assert.ok(ranked[1].cos < 0.99, `runner-up ${ranked[1].cos}`);
  const byRaw = [...ranked].sort((a, b) => b.raw - a.raw);
  assert.ok(!sigs[byRaw[0].i].ark, 'the loudest echo wins the raw reading');
  const arkRawRank = byRaw.findIndex((x) => sigs[x.i].ark);
  assert.ok(arkRawRank > 20, `ark is ${arkRawRank} by raw reading`);
});

test('crew versions agree with the maths library', () => {
  const r = rng(3);
  for (let i = 0; i < 100; i++) {
    const v = L.swarmVec(r, 3, -6, 6, true), u = L.swarmVec(r, 3, -6, 6, true);
    close(L.crew.dot(v, u), dot(v, u));
    close(L.crew.length(v), norm(v), 1e-12);
    close(L.crew.angle(v, u), L.deg(angle(v, u)), 1e-9);
    L.crew.shadow(v, u).forEach((x, k) => close(x, proj(v, u)[k], 1e-9));
  }
  close(L.crew.angle([3, 4], [6, 8]), 0, 1e-6);
  close(L.crew.angle([1, 0], [-1, 0]), 180, 1e-9);
});

test('builds: every test case agrees with the crew version; the swarm generates valid cases', async () => {
  const B = await import('../../site/src/singular/content/chapters/c04-dot/build.ts');
  const r = rng(21);
  for (const b of [B.buildDot, B.buildLength, B.buildAngle, B.buildShadow]) {
    const crewFn = (L.crew as Record<string, (...a: number[][]) => unknown>)[b.fn];
    for (const t of b.tests) {
      const got = crewFn(...(t.args as number[][]));
      const want = t.expect;
      if (Array.isArray(want)) (got as number[]).forEach((x, i) => close(x, (want as number[])[i], t.tol ?? 1e-6));
      else close(got as number, want as number, t.tol ?? 1e-6);
    }
    for (let i = 0; i < 20; i++) { const args = b.swarm!.gen(r, 'commander'); assert.doesNotThrow(() => b.swarm!.crew(...args)); }
    assert.ok(b.solution.includes(`def ${b.fn}(`) && b.starter.includes(`def ${b.fn}(`));
  }
});

test('builds: every Fill template matches its solution; Assemble has lines and decoys', async () => {
  const B = await import('../../site/src/singular/content/chapters/c04-dot/build.ts');
  const { fillAnswers, assembleParts } = await import('../../site/src/singular/game/codehelp.ts');
  for (const b of Object.values(B)) {
    const a = fillAnswers(b.fill!, b.solution);
    assert.ok(a && a.length >= 2 && a.length <= 4, `${b.fn}: ${JSON.stringify(a)}`);
    const asm = assembleParts(b.solution, b.assemble);
    assert.ok(asm.body.length >= 1 && asm.decoys.length >= 1 && asm.decoys.length <= 2, b.fn);
    assert.ok(b.swarm && b.docPrompt && b.ilseNote, b.fn);
  }
});
