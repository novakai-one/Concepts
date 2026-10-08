// Chapter 7: puzzle numbers, pure win checks, doubt predicates, the Law, the set piece, the Act II Review.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../site/src/singular/content/chapters/c07-docking/logic.ts';
import { checkLaw, rng } from '../../site/src/singular/game/lawcheck.ts';
import { cross, dot, norm, vsub } from '../../site/src/singular/math/la.ts';
import { swapFlips } from '../../site/src/singular/content/chapters/c06-volume/logic.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const closeV = (a: number[], b: number[], tol = 1e-9) => a.forEach((x, i) => close(x, b[i], tol));

test('the door: normal (6, 3, 2) of length 7; plane 6x + 3y + 2z = 6 through all three corners; centre (1/3, 2/3, 1)', () => {
  assert.deepEqual(L.DOOR_N, [6, 3, 2]);
  close(norm(L.DOOR_N), 7);
  close(L.DOOR_K, 6);
  for (const x of [L.DOOR_P, L.DOOR_Q, L.DOOR_R, L.DOOR_CENTRE]) assert.ok(L.onPlane(x));
  closeV(L.DOOR_CENTRE, [1 / 3, 2 / 3, 1]);
  assert.ok(L.insideDoor(L.DOOR_CENTRE));
  assert.ok(!L.insideDoor([1, 2, -3]));
  assert.equal(L.planeEq(L.DOOR_N, L.DOOR_K), '6x + 3y + 2z = 6');
  assert.equal(L.planeEq([1, -1, 0], 0), 'x − y = 0');
});

test('p1: the paths cross at (2, 2, 0) at minute 2; at the planned speed the ships collide; a new speed clears', () => {
  closeV(L.ourAt(1, 2), L.P1_CROSS);
  closeV(L.debrisAt(2), L.P1_CROSS);
  close(L.p1MinGap(1), 0);
  assert.ok(!L.p1Won(1));
  for (const k of [0.5, 1.5, 2]) assert.ok(L.p1Won(k), `speed ${k}`);
  assert.ok(!L.p1Won(1.25), 'too close: 0.44');
  // the closed form matches a brute-force search over minutes
  for (const k of [0.5, 0.75, 1.25, 1.5, 2]) {
    let m = Infinity;
    for (let t = 0; t <= 6; t += 0.0005) m = Math.min(m, L.dist(L.ourAt(k, t), L.debrisAt(t)));
    close(L.p1MinGap(k), m, 1e-3);
  }
  // our path still passes the crossing at every speed, at minute 2 / k
  for (const k of [0.5, 1.5, 2]) closeV(L.ourAt(k, 2 / k), L.P1_CROSS);
});

test('p2: the lines are skew; the link at right angles to both is 2 long, along (0, 0, 1)', () => {
  close(L.P2_GAP, 2);
  assert.deepEqual(L.P2_CROSS, [0, 0, 1]);
  closeV(L.P2_TS, [0, -1]);
  assert.ok(L.p2Won(0, -1));
  assert.ok(!L.p2Won(0, 0), 'the link must read 0 against the debris direction too');
  assert.ok(!L.p2Won(1, -1));
  closeV(L.p2Link(0, -1), [0, 0, 2]);
  assert.ok(!L.mustCross(L.P2_P1, L.P2_D1, L.P2_P2, L.P2_D2));
});

test('p3: every arrow from P to the door reads 0 against n; three test points; the tiles', () => {
  const tests: number[][] = [];
  for (const x of L.P3_TESTS) {
    close(dot(L.DOOR_N, vsub(x, L.DOOR_P)), 0);
    assert.ok(L.p3Accept(tests, x)); tests.push(x);
  }
  assert.ok(!L.p3Accept([], [1, 1, 1]), 'off the door');
  assert.ok(!L.p3Accept([[0, 0, 3]], [0, 0.05, 2.925]), 'too close to a point already tested');
  assert.ok(L.p3OrderOk(['t1', 't2', 't3', 't4', 't5']));
  assert.ok(!L.p3OrderOk(['t1', 't3', 't2', 't4', 't5']));
});

test('p4: from the origin along (1, 2, 3) the path meets the door at its centre at t = 1/3', () => {
  const h = L.p4Hit(L.P4_DIR)!;
  close(h.t, 1 / 3);
  closeV(h.at, L.DOOR_CENTRE);
  assert.ok(L.p4Won([1, 2, 3]) && L.p4Won([2, 4, 6]));
  assert.ok(!L.p4Won([1, 1, 1]));
  assert.equal(L.p4Hit([-1, -2, -3]), null, 'pointing away: the door is behind us');
});

test('p5: from (3, 3, 3) the door plane is 27/7 away (|n| = 7); the path t(1, 2, 3) is √(27/7) away', () => {
  close(L.HOLD_DIST, 27 / 7);
  assert.ok(L.onPlane(L.HOLD_FOOT));
  close(norm(vsub(L.HOLD, L.HOLD_FOOT)), 27 / 7);
  close(norm(cross(vsub(L.HOLD, L.HOLD_FOOT), L.DOOR_N)), 0, 1e-9);
  close(L.HOLD_LINE_DIST, Math.sqrt(27 / 7));
  close(L.HOLD_LINE_T, 9 / 7);
  close(norm(cross(L.HOLD, L.P4_DIR)) / norm(L.P4_DIR), Math.sqrt(27 / 7));
  assert.ok(L.p5PlaneWon(L.HOLD_FOOT) && !L.p5PlaneWon(L.DOOR_CENTRE));
  assert.ok(L.p5LineWon(9 / 7) && !L.p5LineWon(1));
});

test('p5 by hand: n · (Q − P) = 27, |n| = 7; Q × d = (3, −6, 3), 54 / 14 = 27/7 is the squared distance to the path', () => {
  close(dot(L.DOOR_N, vsub(L.HOLD, L.DOOR_P)), 27);
  close(dot(L.DOOR_N, L.HOLD) - L.DOOR_K, 27, 1e-9);
  close(dot(L.DOOR_N, L.HOLD), 33, 1e-9); // the n · Q slip the worksheet names
  close(norm(L.DOOR_N), 7);
  close(27 / 7, L.HOLD_DIST);
  const qd = cross(L.HOLD, L.P4_DIR);
  assert.deepEqual(qd, [3, -6, 3]);
  close(dot(qd, qd), 54);
  close(dot(L.P4_DIR, L.P4_DIR), 14);
  close(dot(qd, qd) / dot(L.P4_DIR, L.P4_DIR), 27 / 7);
  close(L.HOLD_LINE_DIST ** 2, 27 / 7, 1e-12);
});

test('p6: the weld line runs along (2, 2, −9) through (0, 0, 3); the planes meet at about 72.4°', () => {
  assert.deepEqual(L.WELD_DIR, [2, 2, -9]);
  assert.ok(L.weldOk(L.WELD_POINT, L.WELD_DIR));
  assert.ok(!L.weldOk([0, 0, 0], L.WELD_DIR), '(0, 0, 0) is not on the door plane');
  close(L.WELD_COS, 3 / (7 * Math.SQRT2));
  close(L.WELD_DEG, 72.36, 0.01);
  // the worksheet's steps: |n1| = 7, |n2| = √2 ≈ 1.41; cos θ from the rounded 1.41 still passes; 3/7 does not
  close(norm(L.DOOR_N), 7);
  close(norm(L.HULL_N), Math.SQRT2);
  close(3 / (7 * 1.41), L.WELD_COS, 0.006);
  assert.ok(Math.abs(3 / 7 - L.WELD_COS) > 0.006);
  // the win picture's arc spans n1 to n2: n1 · n2 > 0, so that angle is θ itself, not 180° − θ
  assert.ok(dot(L.DOOR_N, L.HULL_N) > 0);
  close((Math.acos(dot(L.DOOR_N, L.HULL_N) / (norm(L.DOOR_N) * norm(L.HULL_N))) * 180) / Math.PI, L.WELD_DEG);
});

test('p7: a direction that reads 0 against the normal has no single hit', () => {
  assert.ok(L.p7Won([1, -2, 0]));
  assert.ok(L.p7Won([0, 2, -3]));
  assert.ok(!L.p7Won([0, 0, 0]));
  assert.equal(L.rayPlane(L.P7_START, [0, 0, 0], L.DOOR_N, L.DOOR_K), null, 'the zero arrow reads "no hit" but is no path: p7 says so');
  assert.ok(!L.p7Won([1, 0, 0]));
  assert.equal(L.rayPlane([0, 0, 0], [1, -2, 0], L.DOOR_N, L.DOOR_K), null);
});

test('doubt (F) non-parallel lines must cross: skew lines break it; crossing lines and parallel lines do not', () => {
  assert.equal(L.mustCross([0, 0, 0], [1, 0, 0], [0, 1, 2], [0, 1, 0]), false);
  assert.equal(L.mustCross([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 1, 0]), true, 'these meet at the origin');
  assert.equal(L.mustCross([0, 0, 0], [1, 0, 0], [0, 1, 0], [2, 0, 0]), true, 'parallel: the claim says nothing');
});

test('doubt (T) the coefficients point straight out of the plane: holds on random planes', () => {
  const r = rng(4);
  for (let i = 0; i < 300; i++) {
    const n = [Math.round(r() * 10 - 5), Math.round(r() * 10 - 5), Math.round(r() * 10 - 5)];
    assert.ok(L.coeffsOut(n, Math.round(r() * 18 - 9)), `${n}`);
  }
  assert.ok(L.coeffsOut([6, 3, 2], 6));
  assert.ok(L.coeffsOut([0, 0, 1], 0));
});

test('Law: "(a, b, c) is perpendicular to the plane, always" survives 500 cases; the near-misses break', () => {
  assert.equal(checkLaw(L.lawCore, L.lawCore.answer).survived, true);
  for (const f of [{ rel: 'inside', when: 'always' }, { rel: 'deg45', when: 'always' }, { rel: 'perp', when: 'd0' }, { rel: 'inside', when: 'd0' }]) {
    assert.equal(checkLaw(L.lawCore, f).survived, false, JSON.stringify(f));
  }
  const r = rng(8);
  for (let i = 0; i < 100; i++) { const c = L.lawCore.gen(r); assert.ok(L.onPlane(c.x, 1e-9, c.n, c.k) && L.onPlane(c.y, 1e-9, c.n, c.k)); }
});

test('set piece: the axis, the path through the centre, a 15/7 gap to the debris track, one burn of −1, −1, 1', () => {
  assert.deepEqual(L.DOOR_E1, [-1, 2, 0]);
  assert.deepEqual(L.DOOR_E2, [-1, 0, 3]);
  assert.ok(L.axisOk([6, 3, 2]) && L.axisOk([-6, -3, -2]) && L.axisOk([12, 6, 4]));
  assert.ok(!L.axisOk([1, 2, 3]) && !L.axisOk([0, 0, 0]));
  closeV(L.SP_START, [7 / 3, 5 / 3, 5 / 3]);
  close(L.SP_GAP, 15 / 7);
  assert.ok(L.SP_GAP > L.SP_CLEAR);
  close(L.SP_TS[0], 16 / 49);
  close(L.SP_TS[1], -3 / 49);
  assert.ok(L.SP_TS[0] > 0 && L.SP_TS[0] < L.SP_S0, 'the closest approach is on the approach leg');
  close(L.spGapAt(L.SP_TS[0]), 15 / 7);
  for (const t of [0, 0.1, 0.2, 0.3, 0.33]) assert.ok(L.spGapAt(t) >= 15 / 7 - 1e-9);
  assert.ok(L.spMeasured(16 / 49) && !L.spMeasured(0));
  assert.deepEqual(L.burnOf(L.SP_DIALS), L.SP_BURN);
  assert.ok(L.spBurnWon([-1, -1, 1]));
  assert.ok(!L.spBurnWon([-1, -1, 0.5]));
  assert.ok(L.SP_DIALS.every((x) => Number.isInteger(x) && Math.abs(x) <= 4), 'whole dials the cadet step of 1 reaches');
  closeV(L.SP_BURN, [-1, -1, 0]);
  closeV(L.SP_SHIP, [10 / 3, 8 / 3, 5 / 3]);
});

test('set piece: the Lantern holds on the path start\'s side of the door and flies the burn nose first, clear of both plates', () => {
  // same side of the door's plane as the path start (and as p5's holding point), farther out
  const ship = L.planeReading(L.SP_SHIP), start = L.planeReading(L.SP_START);
  assert.ok(ship > 0 && start > 0, `door plane readings ${ship}, ${start}`);
  assert.ok(ship > start, 'the burn closes on the door');
  close(ship, 76 / 3);
  assert.ok(L.planeReading(L.HOLD) > 0);
  // the burn crosses neither the door's plane nor the hull plate x − y = 0
  const u = L.rayPlane(L.SP_SHIP, L.SP_BURN, L.DOOR_N, L.DOOR_K)!;
  assert.ok(u < 0 || u > 1, `the burn meets the door's plane at u = ${u}`);
  const hull = (x: number[]) => L.planeReading(x, L.HULL_N, L.HULL_K);
  assert.ok(Math.sign(hull(L.SP_SHIP)) === Math.sign(hull(L.SP_START)) && Math.abs(hull(L.SP_START)) > 1e-9);
  // after the roll the nose points along −n: the burn runs within 30° of it
  const nose = L.DOOR_N.map((x) => -x);
  assert.ok(dot(L.SP_BURN, nose) / (norm(L.SP_BURN) * norm(nose)) > Math.cos(Math.PI / 6));
  // the whole burn stays clear of the debris track
  for (let u = 0; u <= 1; u += 0.01) assert.ok(L.distToLine(L.along(L.SP_SHIP, L.SP_BURN, u), L.SP_DEB_P, L.SP_DEB_D) > L.SP_CLEAR);
});

test('Act II Review: the three false claims break on their counterexamples; the true one is Chapter 6\'s', () => {
  assert.equal(L.dotZeroHasZeroPart([1, 2, 2], [2, 1, -2]), false);
  assert.equal(L.dotZeroHasZeroPart([2, 1], [-1, 2]), false);
  assert.equal(L.dotZeroHasZeroPart([1, 0], [0, 1]), true);
  assert.equal(L.crossZeroMeansZero([2, 4, 6], [1, 2, 3]), false);
  assert.equal(L.crossZeroMeansZero([1, 0, 0], [0, 1, 0]), true);
  assert.equal(L.crossZeroMeansZero([0, 0, 0], [1, 2, 3]), true);
  assert.equal(L.threePointsOnePlane([0, 0, 1], [1, 1, 1], [2, 2, 1]), false);
  assert.equal(L.threePointsOnePlane([1, 0, 0], [0, 2, 0], [0, 0, 3]), true);
  // the true claim holds on random struts and on its edge cases (flat, parallel, a zero strut)
  const r = rng(21);
  for (let i = 0; i < 200; i++) {
    const v = () => [Math.round(r() * 6 - 3), Math.round(r() * 6 - 3), Math.round(r() * 5 - 1)];
    assert.ok(swapFlips(v(), v(), v()));
  }
  for (const [a, b, c] of [[[1, 0, 0], [0, 1, 0], [1, 1, 0]], [[1, 2, 0], [2, 4, 0], [0, 1, 3]], [[0, 0, 0], [1, 2, 3], [3, 1, 2]]]) assert.ok(swapFlips(a, b, c));
  // the Shake finds a breaking case for each false claim among its curated edge cases
  assert.equal(L.dotZeroHasZeroPart([3, 1], [-1, 3]), false);
  assert.equal(L.crossZeroMeansZero([3, -1, 0], [-3, 1, 0]), false);
  assert.equal(L.threePointsOnePlane([1, 0, 0], [1, 1, 1], [1, 2, 2]), false);
});

test('builds: crew ray_plane and dist_to_plane', () => {
  close(L.crew.rayPlane([0, 0, 0], [1, 2, 3], [6, 3, 2], 6)!, 1 / 3);
  assert.equal(L.crew.rayPlane([2, 2, 2], [1, -2, 0], [6, 3, 2], 6), null);
  close(L.crew.rayPlane([7 / 3, 5 / 3, 5 / 3], [-6, -3, -2], [6, 3, 2], 6)!, 1 / 3);
  close(L.crew.distToPlane([3, 3, 3], [6, 3, 2], 6), 27 / 7);
  close(L.crew.distToPlane([1, 0, 0], [6, 3, 2], 6), 0);
  // the install reports the approach path's start a third of n out: 7/3 from the door
  close(L.crew.distToPlane(L.SP_START, L.DOOR_N, L.DOOR_K), 7 / 3);
});
