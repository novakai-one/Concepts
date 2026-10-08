// Chapter 16: puzzle numbers, pure win checks (references win, misconceptions do not), the survivor
// counter, doubt predicates, the Law (target survives, near-misses break), the set piece, crew versions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../site/src/singular/content/chapters/c16-rank/logic.ts';
import { checkLaw, rng } from '../../site/src/singular/game/lawcheck.ts';
import { C2 } from '../../site/src/singular/content/truth.ts';
import { col, cross, det, dot, matVec, nullspace, rank, rrefNum, transpose } from '../../site/src/singular/math/la.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const vclose = (a: readonly number[], b: readonly number[], tol = 1e-9) => { assert.equal(a.length, b.length); a.forEach((x, i) => close(x, b[i], tol)); };

test('p1: any two of the four arrows keep the whole plane; one or three do not count', () => {
  for (const v of L.P1_ARROWS) close(v[2], v[0] + v[1]);
  assert.equal(L.p1Reach([0, 1, 2, 3]), 2);
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) assert.ok(L.p1Won([i, j]), `${i}, ${j}`);
  assert.ok(!L.p1Won([0]) && !L.p1Won([0, 1, 2]) && !L.p1Won([]));
});

test('p2: pivots in columns 1 and 3; rank 2, nullity 2; the two null space arrows', () => {
  assert.deepEqual(L.pivotCols(L.P2_A), L.P2_PIVOTS);
  assert.equal(rank(L.P2_A), 2);
  assert.equal(L.nullity(L.P2_A), 2);
  for (const v of L.P2_NULL) vclose(matVec(L.P2_A, v), [0, 0, 0]);
  vclose(nullspace(L.P2_A)[0], L.P2_NULL[0]); vclose(nullspace(L.P2_A)[1], L.P2_NULL[1]);
  assert.ok(L.p2Won(2, 2, L.P2_NULL));
  assert.ok(L.p2Won(2, 2, [[-1, 0, -2, 1], [-3, 1, -2, 1]]), 'any two independent null space arrows');
  assert.ok(!L.p2Won(3, 1, L.P2_NULL), 'counting rows, not pivots');
  assert.ok(!L.p2Won(2, 2, [[-2, 1, 0, 0], [-4, 2, 0, 0]]), 'one direction twice');
  assert.ok(!L.p2Won(2, 2, [[1, 0, 0, 0], [-1, 0, -2, 1]]));
});

test('p3: the reduced columns give the floor, which A\'s columns stick out of; A\'s own pivot columns hold them all', () => {
  vclose(L.P3_R[0], [1, 2, 0, 1]); vclose(L.P3_R[1], [0, 0, 1, 2]); vclose(L.P3_R[2], [0, 0, 0, 0]);
  assert.ok(!L.p3Won(['r1', 'r3']), 'the trap: reduced pivot columns');
  assert.ok(L.p3Won(['a1', 'a3']), 'A\'s pivot columns (1, 2, 3) and (0, 1, 1)');
  assert.ok(L.p3Won(['a3', 'a4']) && L.p3Won(['a2', 'a4']));
  assert.ok(!L.p3Won(['a1', 'a2']), 'parallel columns make a line');
  assert.ok(L.stickOut([1, 0, 0], [0, 1, 0], [1, 2, 3]) > 2.9);
  close(L.stickOut([1, 2, 3], [0, 1, 1], [1, 4, 5]), 0);
  assert.ok(L.parallel(cross([1, 2, 3], [0, 1, 1]), [1, 1, -1]), 'the same plane as the landing plane, z = x + y');
});

test('p4: a 3 × 4 with rank 2 and nullity 2 builds; the impossible orders and their bars', () => {
  assert.ok(L.p4BuildOk(L.P2_A));
  assert.ok(!L.p4BuildOk([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]]), 'rank 3');
  assert.ok(!L.p4BuildOk(C2), 'wrong shape');
  assert.ok(L.p4BarA(3, 1) && L.p4BarA(2, 2));
  assert.ok(!L.p4BarA(3, 2), 'the order itself overflows four columns');
  assert.ok(!L.p4BarA(4, 0) && !L.p4BarA(1, 3));
  assert.ok(L.p4BarB(3, 2));
  assert.ok(!L.p4BarB(5, 0), 'five kept rows is more than three rows allow');
  assert.ok(!L.p4BarB(2, 3));
});

test('p5: the rate-of-bend matrix, its action, its null space, and a basis with determinant 2', () => {
  for (let j = 0; j < 3; j++) vclose(col(L.D, j), L.P5_LANDS[j]);
  vclose(L.P5_RATE, [-3, 4, 0]);
  vclose(matVec(L.D, L.P5_NULL), [0, 0, 0]);
  close(L.P5_DET, 2);
  assert.notDeepEqual(transpose(L.D), L.D, 'the transposed-D mistake is a different matrix');
  // the rule is the slope: (p(t + h) − p(t)) / h → b + 2ct
  const p = L.P5_PROFILE, h = 1e-6;
  for (const t of [-1, 0, 0.5, 2]) close((L.profileAt(p, t + h) - L.profileAt(p, t)) / h, L.profileAt(L.P5_RATE, t), 1e-4);
});

test('p6: tags are right exactly at the pivot columns; the Shake matrices obey kept + flattened = columns', () => {
  assert.ok(L.tagsOk(L.P2_A, ['kept', 'flat', 'kept', 'flat']));
  assert.ok(!L.tagsOk(L.P2_A, ['kept', 'kept', 'flat', 'flat']), 'reading the reduced form wrongly');
  assert.ok(L.tagsOk(C2, ['kept', 'kept', 'flat']));
  const r = rng(16);
  for (let i = 0; i < 200; i++) {
    const A = L.p6Matrix(i % 6, r);
    const piv = L.pivotCols(A);
    assert.equal(piv.length + L.freeArrows(A).length, A[0].length);
    for (const v of L.freeArrows(A)) vclose(matVec(A, v), A.map(() => 0));
  }
  assert.ok(L.p6OrderOk(['t1', 't2', 't3', 't4']) && L.p6OrderOk(['t1', 't3', 't2', 't4']));
  assert.ok(!L.p6OrderOk(['t1', 'x1', 't3', 't4']) && !L.p6OrderOk(['t4', 't2', 't3', 't1']));
});

test('p6: Navigator\'s typed argument (rank, one free arrow, nullity, sum) and Commander\'s last line', () => {
  const g = L.p6Argument(L.P2_A);
  assert.deepEqual([g.rank, g.freeCol, g.nullity, g.n], [2, 3, 2, 4]);
  vclose(g.arrow, [-1, 0, -2, 1]);
  const r = rng(1606);
  for (let i = 0; i < 200; i++) {
    const A = L.p6Matrix(i % 6, r);
    if (L.pivotCols(A).length === A[0].length) { assert.throws(() => L.p6Argument(A)); continue; }
    const a = L.p6Argument(A);
    assert.equal(a.rank, rank(A));
    assert.equal(a.nullity, L.nullity(A));
    assert.equal(a.rank + a.nullity, a.n);
    assert.ok(!L.pivotCols(A).includes(a.freeCol));
    close(a.arrow[a.freeCol], 1);
    vclose(matVec(A, a.arrow), A.map(() => 0));
    // every other free variable is 0
    for (let j = 0; j < a.n; j++) if (j !== a.freeCol && !L.pivotCols(A).includes(j)) close(a.arrow[j], 0);
  }
  const { m, n, rank: rk, nullity: nl } = L.P6_LAST;
  assert.equal(rk + nl, n);
  assert.equal(L.nullity(L.randRankMat(rng(3), m, n, rk)), nl);
  assert.notEqual(nl, m - rk, 'counting zero rows gives a different number');
  assert.notEqual(nl, n - m, 'columns minus rows gives a different number');
});

test('p7: a third arrow off the plane completes a basis of 3-D; one on the plane does not', () => {
  assert.ok(L.p7Won([0, 0, 1]) && L.p7Won([1, 1, 1]));
  assert.ok(!L.p7Won([1, 1, 2]) && !L.p7Won([2, -1, 1]) && !L.p7Won([0, 0, 0]));
});

test('doubts: reduced columns fail on A, two bases of one plane exist, every basis of a plane has two arrows', () => {
  assert.equal(L.reducedColsHold(L.P2_A), false, 'the canonical counterexample');
  assert.equal(L.reducedColsHold([[1, 0], [0, 1]]), true, 'already reduced');
  const r = rng(5);
  let broke = false;
  for (let i = 0; i < 5 && !broke; i++) broke = !L.reducedColsHold(L.randRankMat(r, 3, 3, 2));
  assert.ok(broke, 'the Shake finds a matrix whose column space moves');
  assert.equal(L.oneBasisHolds([[1, 0, 1], [0, 1, 1]], [[1, 1, 2], [2, 1, 3]]), false);
  assert.equal(L.oneBasisHolds([[1, 0, 1], [0, 1, 1]], [[0, 1, 1], [1, 0, 1]]), true, 'the same pair');
  for (let i = 0; i < 300; i++) {
    const k = 1 + Math.floor(r() * 3);
    const vs = Array.from({ length: k }, () => { const x = Math.round(r() * 4 - 2), y = Math.round(r() * 4 - 2); return [x, y, x + y]; });
    assert.ok(L.twoArrowsHolds(vs));
  }
});

test('Law: rank + nullity = the number of columns survives; rows, times, minus, entries break', () => {
  assert.equal(checkLaw(L.lawCore, L.lawCore.answer).survived, true);
  for (const f of [{ op: 'plus', count: 'rows' }, { op: 'times', count: 'cols' }, { op: 'minus', count: 'cols' }, { op: 'plus', count: 'entries' }]) {
    assert.equal(checkLaw(L.lawCore, f).survived, false, JSON.stringify(f));
  }
});

test('four rooms: row space normal (1, −2, 1) is the null space; column space normal (2, −1, 0) is the left null space', () => {
  assert.equal(rank(L.M4), 2);
  assert.ok(L.parallel(cross(L.M4_ROWS[0], L.M4_ROWS[2]), L.ROW_NORMAL));
  assert.ok(L.parallel(cross(L.M4_COLS[0], L.M4_COLS[1]), L.COL_NORMAL4));
  assert.ok(L.nullDirOk(L.ROW_NORMAL) && L.leftNullOk(L.COL_NORMAL4));
  assert.ok(!L.nullDirOk(L.COL_NORMAL4) && !L.leftNullOk(L.ROW_NORMAL), 'the rooms are different');
  assert.ok(L.rowPickOk(0, 2) && L.rowPickOk(1, 2) && !L.rowPickOk(0, 1));
  assert.ok(L.colPickOk(0, 1) && L.colPickOk(1, 2) && L.colPickOk(0, 2));
  for (const rrow of L.M4_ROWS) close(dot(rrow, L.ROW_NORMAL), 0);
  for (const c of L.M4_COLS) close(dot(c, L.COL_NORMAL4), 0);
  vclose(matVec(transpose(L.M4), L.COL_NORMAL4), [0, 0, 0]);
  assert.equal(rank(transpose(L.M4)), rank(L.M4), 'dim Row = dim Col');
});

test('one fact: every star\'s construction on the two-decimal model', () => {
  const s = L.starChecks;
  assert.ok(s.dep([1, 1, -1]) && !s.dep([1, 1, 1]) && !s.dep([0, 0, 0]));
  assert.ok(s.reach([1, 1, 1]) && !s.reach([1, 2, 3]));
  assert.ok(s.nonemany([1, 1, 1], [1, 2, 3]) && !s.nonemany([1, 2, 3], [1, 1, 1]));
  assert.ok(s.nopivot(2) && !s.nopivot(0) && !s.nopivot(1));
  assert.deepEqual(rrefNum(C2).R[2], [0, 0, 0]);
  assert.ok(s.notI([0, 0, 0]) && !s.notI([0, 0, 1]));
  assert.ok(s.null([2, 2, -2]) && !s.null([0, 0, 0]));
  assert.ok(s.rank(2) && !s.rank(3));
  assert.ok(s.noinv([2, 0, 1], [3, 1, 0]) && !s.noinv([2, 0, 1], [2, 0, 1]) && !s.noinv([1, 0, 0], [0, 1, 0]));
  close(L.C2_TRIPLE, 0);
  assert.ok(s.triple(0) && !s.triple(1));
  close(det(C2), 0);
  assert.ok(s.det(0) && !s.det(0.004));
  assert.equal(L.STARS.length, 11);
});

test('Vell\'s claims: two true, two false, with the canonical cases', () => {
  assert.ok(L.goneHolds([2, 0, 1], [3, 1, 0]) && L.landTogether([2, 0, 1], [3, 1, 0]) && !L.landTogether([2, 0, 1], [2, 0, 2]));
  assert.equal(L.rank2TwoCrushedHolds(C2), false);
  assert.equal(L.rank2TwoCrushedHolds([[1, 0, 0], [0, 1, 0], [0, 0, 1]]), true, 'vacuous for rank 3');
  assert.equal(L.rowEqColHolds(L.M4), false);
  assert.equal(L.rowEqColHolds(C2), true, 'symmetric: the same plane');
  const r = rng(9);
  for (let i = 0; i < 200; i++) assert.ok(L.nullPerpRowsHolds(L.randRankMat(r, 3, 3, 1 + Math.floor(r() * 3))));
});

test('crew versions: rank and basis_for_span', () => {
  assert.equal(L.crew.rank(C2), 2);
  assert.deepEqual(L.crew.basis_for_span([[1, 0, 1], [0, 1, 1], [1, 1, 2], [2, 1, 3]]), [[1, 0, 1], [0, 1, 1]]);
  const r = rng(4);
  for (let i = 0; i < 100; i++) {
    const vs = L.swarmVecs(r, 'commander');
    const b = L.crew.basis_for_span(vs);
    assert.equal(b.length, L.spanRank(vs));
    assert.ok(L.sameSpan(b, vs));
  }
});
