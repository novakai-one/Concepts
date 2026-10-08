// Chapter 15: story numbers, pure win checks (references win, misconceptions do not), doubt
// predicates, the Law (the target survives, near-misses break), Teach Teo, and the crew versions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../site/src/singular/content/chapters/c15-nullspace/logic.ts';
import { checkLaw, rng } from '../../site/src/singular/game/lawcheck.ts';
import { C2, C2_NULL } from '../../site/src/singular/content/truth.ts';
import { matVec, nullspace, colspace, rank, dot, det } from '../../site/src/singular/math/la.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const vclose = (a: readonly number[], b: readonly number[], tol = 1e-9) => { assert.equal(a.length, b.length); a.forEach((x, i) => close(x, b[i], tol)); };

test('the two-decimal model: rank 2, column space z = x + y, null space t(1, 1, −1)', () => {
  assert.equal(rank(C2), 2);
  close(det(C2), 0);
  vclose(L.NULL_DIR, C2_NULL);
  vclose(matVec(C2, C2_NULL), [0, 0, 0]);
  assert.ok(L.parallel(nullspace(C2)[0], [1, 1, -1]));
  for (const c of L.COLS) assert.ok(L.onLandingPlane(c), `column ${c} is on z = x + y`);
  assert.ok(L.parallel(L.COL_NORMAL, [1, 1, -1]), 'the normal of the column space is along (1, 1, −1)');
  vclose(L.COLS[0], [1, 0, 1]); vclose(L.COLS[1], [0, 1, 1]); vclose(L.COLS[2], [1, 1, 2]);
});

test('p1: every landed buoy is on z = x + y; only a normal along (1, 1, −1) holds them all', () => {
  const starts = L.ballStarts(2000);
  assert.equal(starts.length, 2000);
  const landed = starts.map(L.land);
  assert.equal(L.countOnPlane([1, 1, -1], landed), 2000);
  assert.equal(L.countOnPlane([-2, -2, 2], landed), 2000);
  assert.ok(L.countOnPlane([0, 0, 1], landed) < 200, 'the floor holds few');
  assert.ok(L.p1Won([1, 1, -1]) && L.p1Won([-1, -1, 1]) && L.p1Won([2, 2, -2]));
  assert.ok(!L.p1Won([0, 0, 1]), 'the floor is the default, not the answer');
  assert.ok(!L.p1Won([1, 1, 1]) && !L.p1Won([1, 0, -1]) && !L.p1Won([0, 0, 0]));
});

test('p2: three targets reachable, (1, 1, 1) is not; its gap to the plane is 1', () => {
  const [a, b, c, d] = L.P2_TARGETS;
  assert.ok(L.reachable(a) && !L.reachable(b) && L.reachable(c) && L.reachable(d));
  for (const [k, x] of Object.entries(L.P2_INPUTS)) assert.ok(L.p2Hit(x, k.split(',').map(Number)), k);
  assert.ok(!L.p2Hit([1, 1, 1], [1, 1, 1]), 'the input (1, 1, 1) does not land on (1, 1, 1)');
  assert.ok(L.p2GapOk(1) && !L.p2GapOk(0) && !L.p2GapOk(2));
  vclose(L.land([1, 2, 0]), [1, 2, 3]);
});

test('c15 measures the gap to the landing plane straight up: (1, 1, 1) is 1 below, matching p2', () => {
  close(L.aboveLandingPlane([1, 1, 1]), -1);
  assert.ok(L.p2GapOk(-L.aboveLandingPlane(L.P2_GAP_TARGET)), 'the p2 gap slider wins at the straight-up gap');
  close(L.aboveLandingPlane([1, 2, 3]), 0);
  close(L.aboveLandingPlane([0, 0, 1]), 1, 1e-12);
  close(L.aboveLandingPlane([1, 1, 0]), -2);
  // the perpendicular distance (taught in c21) is a different number; c15 does not show it as the gap
  close(L.offPlane([1, 1, 1]), 1 / Math.sqrt(3));
  for (const t of L.P2_TARGETS) assert.equal(L.reachable(t), Math.abs(L.aboveLandingPlane(t)) < 1e-9, `${t}`);
});

test('p3: (1, 1, −1) and its multiples land on the origin; the origin and near misses do not count', () => {
  assert.ok(L.p3Won([1, 1, -1]) && L.p3Won([-2, -2, 2]) && L.p3Won([0.5, 0.5, -0.5]));
  assert.ok(!L.p3Won([0, 0, 0]), 'the zero start is not an answer');
  assert.ok(!L.p3Won([1, 1, 1]) && !L.p3Won([1, -1, 0]));
  close(L.violetPreview([1, 1, -1]), 1);
  assert.ok(L.violetPreview([1, 1, 1]) < 0.01);
  vclose(matVec(C2, L.P3_READ.dir), [0, 0, 0]);
  vclose(L.P3_READ.dir, [L.P3_READ.x, L.P3_READ.y, 1]);
});

test('p4: (2, 0, 1) and (3, 1, 0) both land on (3, 1, 4); their difference is (1, 1, −1); three starts for (1, 2, 3)', () => {
  vclose(L.P4_LAND, [3, 1, 4]);
  vclose(L.land(L.P4_B), [3, 1, 4]);
  assert.ok(L.diffOnNull(L.P4_A, L.P4_B));
  assert.ok(!L.diffOnNull(L.P4_A, [3, 1, 1]));
  vclose(L.land(L.P4_PARTICULAR), L.P4_TARGET);
  assert.ok(L.threeStartsOk([[1, 2, 0], [2, 3, -1], [0, 1, 1]]));
  assert.ok(!L.threeStartsOk([[1, 2, 0], [1, 2, 0], [2, 3, -1]]), 'the same start twice');
  assert.ok(!L.threeStartsOk([[1, 2, 0], [2, 3, -1], [1, 2, 1]]), 'one lands elsewhere');
});

test('p5: the two true landing sets never let an arrow escape; each impostor has its escape', () => {
  const r = rng(15);
  const rand = (): number[] => [r() * 6 - 3, r() * 6 - 3, r() * 6 - 3];
  for (const id of ['plane', 'line'] as const) {
    for (let i = 0; i < 300; i++) {
      const u = L.toSet(id, rand()), v = L.toSet(id, rand());
      const k = r() * 6 - 3;
      assert.ok(!L.escapes(id, 'add', u, v, k, 1e-6), `${id} add`);
      assert.ok(!L.escapes(id, 'stretch', u, v, k, 1e-6), `${id} stretch`);
    }
  }
  for (const id of L.IMPOSTORS) {
    const e = L.P5_ESCAPES[id as 'shifted' | 'axes' | 'quarter'];
    assert.ok(L.inSet(id, e.u) && (e.op === 'stretch' || L.inSet(id, e.v)), `${id}: the test arrows are in the set`);
    assert.ok(L.escapes(id, e.op, e.u, e.v, e.k), `${id}: escapes`);
  }
  assert.ok(L.escapes('shifted', 'stretch', [0, 0, 1], [0, 0, 0], 0), 'stretching by 0 gives the missing origin');
  assert.ok(!L.inSet('shifted', [0, 0, 0]));
  for (const id of L.SET_IDS) for (let i = 0; i < 50; i++) assert.ok(L.inSet(id, L.toSet(id, rand()), 1e-9), `toSet lands in ${id}`);
  assert.deepEqual(L.P5_ROW_DOTS, [0, 0, 0]);
  assert.ok(L.p5OrderOk(['t1', 't2', 't3', 't4']) && L.p5OrderOk(['t1', 't3', 't2', 't4']));
  assert.ok(!L.p5OrderOk(['t2', 't1', 't3', 't4']) && !L.p5OrderOk(['t1', 't2', 't3']) && !L.p5OrderOk(['t1', 'x1', 't3', 't4']));
});

test('p6: (1, 1, −1) keeps the gripper still; run forward it clears the pipe; other commands move the hand', () => {
  assert.deepEqual(L.gripperAt(L.ARM_START), [3, 2]);
  assert.ok(!L.armClear(L.ARM_START), 'the elbow starts against the pipe');
  assert.ok(L.stillCommand([1, 1, -1]) && L.stillCommand([-2, -2, 2]));
  assert.ok(!L.stillCommand([1, 0, 0]) && !L.stillCommand([0, 0, 0]));
  assert.ok(L.p6Won([1, 1, -1], 1));
  assert.ok(L.p6Won([1, 1, -1], 0.5));
  assert.ok(L.p6Won([-1, -1, 1], -1));
  assert.ok(!L.p6Won([1, 1, -1], -1), 'backwards the last segment still grazes the pipe');
  assert.ok(!L.p6Won([1, 1, -1], 0.2), 'not far enough');
  assert.ok(!L.p6Won([1, 0, 0], 1), 'one motor alone drags the gripper off the handle');
  assert.ok(!L.p6Won([1, 1, -1], 0));
});

test('p7: the damaged arm reaches only the line through (1, 2); two independent still-commands', () => {
  assert.ok(L.p7Won([1, 0], [-2, 1, 0], [-3, 0, 1]));
  assert.ok(!L.p7Won([1, 2], [-2, 1, 0], [-3, 0, 1]), '(1, 2) is reachable');
  assert.ok(!L.p7Won([1, 0], [-2, 1, 0], [-4, 2, 0]), 'parallel still-commands are one direction');
  assert.ok(!L.p7Won([1, 0], [1, 0, 0], [-3, 0, 1]), '(1, 0, 0) moves this gripper');
  assert.ok(L.p7Won([0, 1], [1, 1, -1], [-2, 1, 0]), '(1, 1, −1) also keeps this gripper still');
  vclose(matVec(L.ARM7, [-2, 1, 0]), [0, 0]); vclose(matVec(L.ARM7, [-3, 0, 1]), [0, 0]);
});

test('doubts: the canonical constructions give the right verdicts; the Shake finds the breaking cases', () => {
  // (F) land it anywhere: (1, 1, 1) breaks it, (1, 2, 3) does not
  assert.equal(L.anywhereHolds([1, 1, 1]), false);
  assert.equal(L.anywhereHolds([1, 2, 3]), true);
  const r = rng(77);
  let broke = false;
  for (let i = 0; i < 5 && !broke; i++) broke = !L.anywhereHolds([Math.round(r() * 6 - 3), Math.round(r() * 6 - 3), Math.round(r() * 6 - 3)]);
  assert.ok(broke, 'five random targets find one off the plane');
  // (F) any plane is a subspace: an offset plane breaks it
  assert.equal(L.planeIsSubspace([1, 1, -1], 1), false);
  assert.equal(L.planeIsSubspace([0, 0, 1], 0), true);
  // (T) same landing → the difference lands on the origin: always
  assert.ok(L.sameLandingHolds(C2, L.P4_A, L.P4_B));
  for (let i = 0; i < 300; i++) {
    const A = L.randRankMat(r, 3, 3, 1 + Math.floor(r() * 3));
    const a = [r() * 4 - 2, r() * 4 - 2, r() * 4 - 2];
    const ns = nullspace(A);
    const b = ns.length ? a.map((x, k) => x + 2 * ns[0][k]) : a.map((x) => x + 1);
    assert.ok(L.sameLandingHolds(A, a, b));
  }
});

test('Law: "solvable exactly when b is in the column space" survives; every near-miss breaks', () => {
  assert.equal(checkLaw(L.lawCore, L.lawCore.answer).survived, true);
  for (const f of [{ rel: 'in', space: 'null' }, { rel: 'notin', space: 'col' }, { rel: 'perp', space: 'col' }, { rel: 'perp', space: 'null' }, { rel: 'notin', space: 'null' }]) {
    assert.equal(checkLaw(L.lawCore, f).survived, false, JSON.stringify(f));
  }
  assert.ok(L.solvable(C2, [1, 2, 3]) && !L.solvable(C2, [1, 1, 1]));
});

test('Teach Teo: the full message finds the flat box; without edge arrows he trusts it at −2', () => {
  const good = L.runTeo(L.TEO_REF);
  assert.ok(good.ok && good.flat);
  close(good.vol!, 0);
  const noK1 = L.runTeo(['k2', 'k3', 'k4']);
  assert.ok(!noK1.ok && noK1.usedPositions);
  close(noK1.vol!, -2);
  assert.equal(noK1.flat, false);
  assert.ok(!L.runTeo(['x1', 'k2', 'k3', 'k4']).ok);
  assert.ok(!L.runTeo(['k1', 'k2', 'k4']).ok, 'no dot product');
  assert.ok(!L.runTeo(['k1', 'k2', 'k3']).ok, 'no reading of zero');
  assert.ok(!L.runTeo(['k1', 'k3', 'k2', 'k4']).ok, 'dot before cross');
  for (const k of L.TEO_REF) assert.ok(!L.runTeo(L.TEO_REF.filter((x) => x !== k)).ok, `dropping ${k} fails`);
  // each dropped key step shows its own misconception
  const without = (k: string) => L.runTeo(L.TEO_REF.filter((x) => x !== k));
  assert.ok(without('k1').usedPositions && Math.abs(without('k1').vol! + 2) < 1e-9 && without('k1').flat === false, 'K1: positions, −2, trusts a flat set');
  assert.equal(without('k2').missing, 'k2');
  assert.equal(without('k3').missing, 'k3');
  assert.equal(without('k4').missing, 'k4');
  for (const x of L.TEO_DECOYS) assert.ok(!L.runTeo([...L.TEO_REF, x.id]).ok, `adding the decoy ${x.id} fails`);
});

test('crew versions: null_space reads the free columns; col_space keeps the original pivot columns', () => {
  vclose(L.crew.null_space(C2)[0], [-1, -1, 1]);
  assert.deepEqual(L.crew.col_space(C2), [[1, 0, 1], [0, 1, 1]]);
  const r = rng(3);
  for (let i = 0; i < 100; i++) {
    const A = L.swarmMat(r, 'commander');
    const ns = L.crew.null_space(A);
    assert.equal(ns.length + rank(A), A[0].length);
    for (const v of ns) vclose(matVec(A, v), A.map(() => 0), 1e-9);
    assert.equal(colspace(A).length, rank(A));
    for (const c of L.crew.col_space(A)) assert.ok(A[0].some((_, j) => A.every((row, k) => Math.abs(row[j] - c[k]) < 1e-12)), 'a column of A itself');
  }
  void dot;
});
