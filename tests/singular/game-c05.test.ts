// Chapter 5: puzzle numbers, pure win checks, doubt predicates, the Law and the inside-out hull.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../site/src/singular/content/chapters/c05-cross/logic.ts';
import { checkLaw, rng } from '../../site/src/singular/game/lawcheck.ts';
import { angle, cross, dot, norm } from '../../site/src/singular/math/la.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('p1: edges (2, 0, 0) and (1, 3, 0) shade area 6; (0, 0, 6) reads 0 against both', () => {
  close(L.P1_AREA, 6);
  assert.deepEqual(cross(L.P1_V, L.P1_W), [0, 0, 6]);
  assert.ok(L.p1Won([0, 0, 6]));
  assert.ok(L.p1Won([0, 0, -6]), 'the flip qualifies too; the order picks one (p2)');
  assert.ok(!L.p1Won([0, 0, 5]), 'right direction, wrong length');
  assert.ok(!L.p1Won([6, 0, 0]), 'right length, not at a right angle');
  assert.ok(!L.p1Won([0, 0, 6.03], 0.01), 'commander tolerance');
});

test('p2: spinning about v × w turns the heading onto the target; w × v turns it away', () => {
  assert.deepEqual(L.raised('wv'), [0, 0, -6]);
  close(L.deg(L.P2_TURN), L.deg(Math.atan2(3, 1)), 1e-9);
  assert.ok(L.p2Won('vw'));
  assert.ok(!L.p2Won('wv'));
  close(L.deg(angle(L.headingAfter('wv'), L.P1_W)), 2 * L.deg(L.P2_TURN), 1e-6);
});

test('p3: the 2 × 2 pattern gives (6, −3, 1); both dot products 0; squared length 50 − 4 = 46', () => {
  assert.deepEqual(L.P3_N, [6, -3, 1]);
  assert.equal(dot(L.P3_N, L.P3_A), 0); assert.equal(dot(L.P3_N, L.P3_B), 0);
  assert.equal(L.P3_SQ, 46);
  assert.equal(dot(L.P3_N, L.P3_N), 46);
  close(Math.sqrt(46), 6.782, 1e-3);
  for (const t of [-2, 0.5, 3]) { const n = L.p3Answer(t); close(dot(n, L.P3_A), 0); close(dot(n, L.P3_B), 0); }
  assert.ok(L.p3Won(1) && !L.p3Won(-1) && !L.p3Won(2));
  close(L.parallelogramArea(L.P3_A, L.P3_B), Math.sqrt(46), 1e-12);
});

test('p4: the hangar door normal (6, 3, 2), length 7, area 3.5', () => {
  assert.deepEqual(L.DOOR.pq, [-1, 2, 0]); assert.deepEqual(L.DOOR.pr, [-1, 0, 3]);
  assert.deepEqual(L.DOOR.n, [6, 3, 2]);
  assert.equal(L.DOOR.len, 7); assert.equal(L.DOOR.area, 3.5);
  assert.deepEqual(cross(L.DOOR_Q, L.DOOR_R), [6, 0, 0], 'the position-vector trap');
});

test('p5: 18,000 triangles, 9,000 inside out; the right rule turns every one outward, the others do not', () => {
  const { tris, wrong } = L.hullTriangles();
  assert.equal(tris.length, L.HULL_TRIS);
  assert.equal(L.HULL_TRIS, 18000);
  assert.equal(wrong.filter(Boolean).length, 9000);
  assert.equal(L.outwardCount(tris), 9000);
  tris.forEach((t, i) => assert.equal(L.outwardReading(t) > 0, !wrong[i]));
  assert.ok(tris.every((t) => norm(L.triNormal(t)) > 1e-9), 'no flat triangles');
  const fixed = L.applyRule(tris, 'negative');
  assert.ok(L.p5Won(fixed));
  assert.equal(L.outwardCount(L.applyRule(tris, 'positive')), 0, 'swapping on positive turns every triangle inward');
  assert.equal(L.outwardCount(L.applyRule(tris, 'zero')), 9000, 'no reading is exactly zero');
  assert.ok(L.p5Won(L.applyRule(L.applyRule(tris, 'positive'), 'negative')));
});

test('p6: as the angle closes, the cross product shrinks to (0, 0, 0)', () => {
  assert.deepEqual(cross(L.P6_V, L.P6_W), [0, 0, 0]);
  assert.ok(L.p6Won(0) && !L.p6Won(1) && !L.p6Won(50));
  close(L.deg(angle(L.P6_V, L.p6W(50))), 50, 1e-6);
  close(norm(L.P6_W), norm(L.p6W(37)), 1e-12);
  let prev = Infinity;
  for (const th of [50, 40, 30, 20, 10, 0]) { const a = norm(cross(L.P6_V, L.p6W(th))); assert.ok(a < prev); prev = a; }
});

test('p7: signed areas at every corner A, B, C, D; (1, 4) turns left at all four', () => {
  assert.deepEqual(L.turns([1, 4]), [16, 12, 13, 17]);
  assert.ok(L.p7Won([1, 4]));
  assert.ok(!L.p7Won([7, 5]), 'the start turns right at C');
  assert.ok(L.turns([7, 5])[2] < 0);
  // the turn at A closes the loop: it is 4·D₂
  for (const D of [[1, 4], [-3, -1], [2, 0], [-6, 5]]) close(L.turns(D)[0], 4 * D[1]);
  assert.deepEqual(L.turns([-3, -1]), [-4, 12, 20, 4]);
  assert.ok(!L.p7Won([-3, -1]), 'left at B, C and D but right at A: the loop folds back');
  assert.ok(!L.p7Won([-1, 0]), 'straight at A');
});

test('doubts: order flips the arrow (false claim); doubling an edge doubles the length (true claim)', () => {
  assert.equal(L.swapSame([2, 0, 0], [1, 3, 0]), false);
  assert.equal(L.swapSame([1, 2, 3], [2, 4, 6]), true, 'only parallel arrows agree: both are zero');
  const r = rng(9);
  for (let i = 0; i < 300; i++) assert.ok(L.doubleDoubles(L.swarmVec(r), L.swarmVec(r)));
});

test('Law: the target survives 500 cases; every near-miss is broken', () => {
  assert.equal(checkLaw(L.lawCore, L.lawCore.answer).survived, true);
  for (const f of [
    { perp: 'ab', len: 'product', swap: 'flips' },
    { perp: 'ab', len: 'area', swap: 'same' },
    { perp: 'neither', len: 'area', swap: 'flips' },
    { perp: 'a', len: 'area', swap: 'flips' },
    { perp: 'b', len: 'area', swap: 'flips' },
    { perp: 'ab', len: 'product', swap: 'same' },
  ]) assert.equal(checkLaw(L.lawCore, f).survived, false, JSON.stringify(f));
  // the counterexample shows both readings, so 'a only' visibly breaks
  const cx = checkLaw(L.lawCore, { perp: 'a', len: 'area', swap: 'flips' });
  assert.match(cx.counterexample ?? '', /\(a × b\)·a = 0, \(a × b\)·b = 0/);
});

test('crew versions', () => {
  assert.deepEqual(L.crew.normal(L.DOOR_P, L.DOOR_Q, L.DOOR_R), [6, 3, 2]);
  close(L.crew.area(L.DOOR_P, L.DOOR_Q, L.DOOR_R), 3.5);
  close(L.crew.area([0, 0, 0], [4, 0, 0], [0, 3, 0]), 6);
  close(L.crew.area([0, 0, 0], [1, 1, 1], [2, 2, 2]), 0);
  const r = rng(4);
  for (let i = 0; i < 100; i++) { const a = L.swarmVec(r), b = L.swarmVec(r); assert.deepEqual(L.crew.cross(a, b), cross(a, b)); }
});

test('builds: every test case agrees with the crew version', async () => {
  const B = await import('../../site/src/singular/content/chapters/c05-cross/build.ts');
  for (const b of [B.buildCross, B.buildNormal, B.buildArea]) {
    const crewFn = (L.crew as Record<string, (...a: number[][]) => unknown>)[b.fn];
    for (const t of b.tests) {
      const got = crewFn(...(t.args as number[][]));
      if (Array.isArray(t.expect)) (got as number[]).forEach((x, i) => close(x, (t.expect as number[])[i], 1e-9));
      else close(got as number, t.expect as number, 1e-9);
    }
    assert.ok(b.solution.includes(`def ${b.fn}(`));
  }
});

test('builds: every Fill template matches its solution; Assemble has lines and decoys', async () => {
  const B = await import('../../site/src/singular/content/chapters/c05-cross/build.ts');
  const { fillAnswers, assembleParts } = await import('../../site/src/singular/game/codehelp.ts');
  for (const b of Object.values(B)) {
    const a = fillAnswers(b.fill!, b.solution);
    assert.ok(a && a.length >= 2 && a.length <= 4, `${b.fn}: ${JSON.stringify(a)}`);
    const asm = assembleParts(b.solution, b.assemble);
    assert.ok(asm.body.length >= 1 && asm.decoys.length >= 1 && asm.decoys.length <= 2, b.fn);
    assert.ok(b.swarm && b.docPrompt && b.ilseNote, b.fn);
  }
});
