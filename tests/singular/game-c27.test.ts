import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../site/src/singular/content/chapters/c27-epilogue/logic.ts';
import { P, R, T, FINAL } from '../../site/src/singular/content/truth.ts';
import { rng } from '../../site/src/singular/game/lawcheck.ts';

test('the final setting is the identity, and it moves our grid by P I P⁻¹ = I', () => {
  assert.ok(L.isIdentity(FINAL));
  assert.ok(L.isIdentity(L.shipMove(FINAL)));
  assert.ok(L.isIdentity(L.shipMove(FINAL, P)));
  // the bench starts at Ilse's spire numbers R: in our grid that is the lean P R P⁻¹ (TT3), not a clean turn
  const lean = L.shipMove(R);
  assert.ok(!L.isIdentity(lean));
  const want = [[1, -2, 0], [1, -1, 0], [0, 0, 1]];
  lean.forEach((row, i) => row.forEach((x, j) => assert.ok(Math.abs(x - want[i][j]) < 1e-12)));
  assert.ok(Math.abs(lean[0][0] - T[0][0]) < 1e-12 && Math.abs(lean[0][1] - T[0][1]) < 1e-12 && Math.abs(lean[1][0] - T[1][0]) < 1e-12 && Math.abs(lean[1][1] - T[1][1]) < 1e-12);
});

test('Q1 (false): every singular move loses a start; invertible moves are not counterexamples', () => {
  assert.equal(L.q1Holds([[1, 2], [2, 4]]), false);
  const n = L.lostStart([[1, 2], [2, 4]])!;
  assert.ok(Math.abs(1 * n[0] + 2 * n[1]) < 1e-12 && Math.abs(2 * n[0] + 4 * n[1]) < 1e-12 && Math.hypot(...n) > 0);
  assert.equal(L.q1Holds([[0, 0], [0, 0]]), false);
  assert.equal(L.q1Holds([[2, 1], [1, 1]]), true);
});

test('Q2–Q5 (true) hold on 500 seeded cases and their edge cases', () => {
  const r = rng(27);
  const ri = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  for (let i = 0; i < 500; i++) {
    assert.ok(L.q2Holds(ri(-4, 4), ri(-4, 4), ri(-4, 4)));
    assert.ok(L.q3Holds([ri(-4, 4) || 1, ri(-4, 4)], [ri(-4, 4), ri(-4, 4)]));
    assert.ok(L.q4Holds([[ri(-4, 4), ri(-4, 4)], [ri(-4, 4), ri(-4, 4)]]));
    assert.ok(L.q5Holds(ri(0, 10) / 10, ri(0, 10) / 10));
  }
  assert.ok(L.q2Holds(2, 0, 2));          // repeated eigenvalue: two lines at right angles can still be found
  assert.ok(L.q2EqualStretch(2, 0, 2) && !L.q2EqualStretch(3, 1, 3) && !L.q2EqualStretch(2, 1, 2));
  assert.ok(L.q5Holds(1, 1) && L.q5Holds(0, 0));
  const s = L.steady(0.9, 0.6);
  const T = L.transition(0.9, 0.6);
  assert.ok(Math.abs(T[0][0] * s[0] + T[0][1] * s[1] - s[0]) < 1e-12);
});

test('Q1: a free (unsnapped) drag near a singular move is not a counterexample; the snapped one is', () => {
  assert.equal(L.q1Holds([[2.0371, 4.07], [1.0123, 2.03]]), true);
  assert.equal(L.q1Holds([[2, 4], [1, 2]]), false);     // Show me: columns (2, 1) and (4, 2), on the 0.5 grid
});

test('Q6 (false): only coinciding lines break it, and then there are many solutions', () => {
  // Show me resets line 1 too: a moved line 1 with the old Show me crossed line 2 once
  assert.equal(L.solutions([[0, 3], [2, 0]], [[1, 1], [3, -1]]).count, 'one');
  assert.equal(L.solutions([[0, 2], [2, 0]], [[0, 0], [1, 1]]).count, 'one');
  assert.equal(L.solutions([[0, 2], [2, 0]], [[0, 3], [3, 0]]).count, 'none');
  assert.equal(L.solutions([[0, 2], [2, 0]], [[1, 1], [3, -1]]).count, 'many');
  assert.equal(L.q6Holds([[0, 2], [2, 0]], [[1, 1], [3, -1]]), false);
  assert.equal(L.q6Holds([[0, 2], [2, 0]], [[0, 0], [1, 1]]), true);
  const p = L.solutions([[0, 2], [2, 0]], [[0, 0], [1, 1]]).point!;
  assert.ok(Math.abs(p[0] - 1) < 1e-12 && Math.abs(p[1] - 1) < 1e-12);
});

test('the layer: without the clip every score is 0; with it, a cut at 1.7 separates blob from ring', () => {
  const pts = L.layerPoints();
  assert.ok(pts.blob.every((x) => Math.abs(L.score(x, false)) < 1e-12));
  assert.ok(L.separates(1.7, true, pts));
  assert.ok(!L.separates(1.7, false, pts));
  assert.ok(!L.separates(1.2, true, pts) && !L.separates(2.6, true, pts));
  assert.ok(Math.max(...pts.blob.map((x) => L.score(x, true))) <= Math.SQRT2);
  assert.ok(Math.min(...pts.ring.map((x) => L.score(x, true))) >= 2);
});

test('the layer: one move and one straight cut always leave stars on the wrong side', () => {
  const pts = L.layerPoints();
  // a cut along a direction finds a clean split when there is one
  const easy = L.bestCutAlong([1, 0], [[-2, 0], [-1, 1]], [[1, 0], [3, -2]]);
  assert.equal(easy.wrong, 0);
  assert.ok(!L.wrongSide(easy, [-1.5, 0], true) && !L.wrongSide(easy, [2, 0], false));
  // the four tries the puzzle shows, and 200 seeded moves
  const tries = [[[1, 0], [0, 1]], [[2, 1], [0, 0.5]], [[0.5, -1.5], [1, 0.5]], [[1.5, 0], [-1, 1]]];
  const r = rng(2727);
  const moves = [...tries, ...Array.from({ length: 200 }, () => [[r() * 4 - 2, r() * 4 - 2], [r() * 4 - 2, r() * 4 - 2]])];
  for (const M of moves) {
    const cut = L.bestMoveAndCut(M, pts, 90);
    assert.ok(cut.wrong > 0);
    // the reported count is the stars wrongSide colours
    const blob = pts.blob.map((x) => L.apply2(M, x)), ring = pts.ring.map((x) => L.apply2(M, x));
    const n = blob.filter((y) => L.wrongSide(cut, y, true)).length + ring.filter((y) => L.wrongSide(cut, y, false)).length;
    assert.equal(n, cut.wrong);
  }
  // with no move at all, the best straight cut (fine sweep) still gets dozens wrong
  assert.ok(L.bestMoveAndCut([[1, 0], [0, 1]], pts, 1800).wrong >= 50);
});
