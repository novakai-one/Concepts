// Chapter 14: puzzle numbers, pure win checks (reference wins, misconceptions do not), the honest
// animations (no false flattening), Doubt and Review predicates, the Law, the Collapse numbers against
// the truth table, and the crew det.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../site/src/singular/content/chapters/c14-determinant/logic.ts';
import { S } from '../../site/src/singular/content/chapters/c14-determinant/script.ts';
import { checkLaw, rng } from '../../site/src/singular/game/lawcheck.ts';
import { cross, det, identity, inverse, matMul, meq, mlerp, mscale, svd, transpose } from '../../site/src/singular/math/la.ts';
import { DET_C, C, S_COLLAPSE, T3, S_now, P, Pinv, DELTA } from '../../site/src/singular/content/truth.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const text = (k: string) => S[k].map((l) => (Array.isArray(l) ? l[1] : l.text)).join(' ');

test('p1: a hold of area 6; the stabiliser keeps every area; the spires and the pulse both give 0.8', () => {
  assert.ok(L.p1HoldOk(L.P1_EXAMPLE));
  assert.ok(L.p1HoldOk([[2, 0], [0, 3]]) && L.p1HoldOk([[3, 1.5], [0, 2]]));
  assert.ok(!L.p1HoldOk([[2, 0], [0, 2]]) && !L.p1HoldOk([[3, 1], [1, 2]]), 'area 4, and area 5');
  assert.ok(!L.p1HoldOk([[0, 3], [2, 0]]), 'area −6: the tile is turned over');
  close(det(L.P1_STAB), 1);
  close(det(matMul(L.P1_STAB, L.P1_EXAMPLE)), 6);
  // the stabiliser's playback keeps every area on every frame (not (1 − t)I + tY, which reads 1.25 mid-move)
  for (let i = 0; i <= 24; i++) {
    const W = L.stabPath(i / 24);
    close(det(W), 1);
    close(det(matMul(W, L.P1_EXAMPLE)), 6);
  }
  close(det(mlerp(identity(2), L.P1_STAB, 0.5)), 1.25, 1e-12);
  assert.ok(meq(L.stabPath(1), L.P1_STAB, 1e-12) && meq(L.powSym2(L.P1_STAB, 1 - 1e-12), L.P1_STAB, 1e-9));
  assert.ok(meq(L.stabPath(0), identity(2), 1e-12));
  close(L.SPIRE_VOLUME, 0.8, 1e-12);
  close(L.PULSE_VOLUME, 0.8, 1e-12);
  assert.ok(text('spireVolume').includes('volume 0.8') && text('open').includes('times 0.8'));
});

test('p2 [D]: the six corner pieces add to 7 and leave ad − bc = 5', () => {
  const total = L.P2_PIECES.reduce((s, p) => s + p.area, 0);
  close(total, 7);
  for (const p of L.P2_PIECES) close(L.polyArea(p.pts), p.area);
  assert.deepEqual(L.P2_STEPS, { box: 12, triA: 3, triB: 2, rects: 2, left: 5 });
  close(L.P2_STEPS.box - total, det(L.P2_M));
  // inside the box nothing counts as removed; outside it does
  for (const p of L.P2_PIECES) { assert.ok(!L.pieceOut(p.pts, [0, 0])); assert.ok(L.pieceOut(p.pts, [6, 0])); }
  assert.ok(L.p2OrderOk(['box', 'rects', 'tri-a', 'tri-b']) && !L.p2OrderOk(['tri-a', 'box', 'tri-b', 'rects']));
});

test('p3: areas multiply; scaling every entry by k gives k²; the swap reads −1', () => {
  close(det(L.P3_A), 2); close(det(L.P3_B), 3);
  close(det(L.productOf(['B', 'A'])), 6); close(det(L.productOf(['A', 'B'])), 6);
  assert.ok(L.p3ProductOk(['B', 'A']) && L.p3ProductOk(['A', 'B']) && !L.p3ProductOk(['A', 'A']) && !L.p3ProductOk(['A']));
  close(det(L.P3_UNIT), 1);
  assert.ok(L.p3ScaleOk(2) && !L.p3ScaleOk(4), 'k = 4 is the misconception (area 16)');
  close(L.scaledArea(4), 16);
  close(det(mscale(identity(3), 2)), 8, 1e-12);
  assert.ok(L.p3FlipOk(L.P3_SWAP) && L.p3FlipOk([[-1, 0], [0, 1]]) && !L.p3FlipOk([[0, -1], [1, 0]]) && !L.p3FlipOk([[0, 2], [1, 0]]));
});

test('p4 [D][H]: 8 along every row; the 4 × 4 is −1 from two single entries', () => {
  for (let i = 0; i < 3; i++) close(L.expandRow(L.P4_M3, i), 8);
  assert.deepEqual([0, 1, 2].map((j) => L.cofactor(L.P4_M3, 0, j)), [5, -2, 1]);
  assert.deepEqual(L.P4_MINOR3, [[1, 0, 3], [2, 1, 1], [1, 0, 2]]);
  assert.deepEqual(L.P4_MINOR2, [[1, 3], [1, 2]]);
  close(det(L.P4_MINOR2), -1);
  close(L.P4_DET4, -1);
  close(L.crewDet3(L.P4_M3), 8);
  // the triple product of the columns, written out, is the expansion down column 1 (not along row 1):
  // a2 × a3 has the column-1 cofactors as components. det3's formula is the triple product of the rows.
  const A = [[1, 2, 0], [0, 1, 0], [0, 0, 1]];
  const col = (M: number[][], j: number) => M.map((r) => r[j]);
  assert.deepEqual(cross(col(A, 1), col(A, 2)).map((x) => x + 0), [0, 1, 2].map((i) => L.cofactor(A, i, 0) + 0));
  assert.notDeepEqual([0, 1, 2].map((j) => L.cofactor(A, 0, j) + 0), [0, 1, 2].map((i) => L.cofactor(A, i, 0) + 0));
  close(L.crewDet3(A), det(transpose(A)));
});

test('p5 [H]: one swap, triangle 1, 2, −3/2, det 3; the shield flattens at k = 4', () => {
  assert.deepEqual(L.P5_DIAG, [1, 2, -1.5]);
  close(L.P5_DET, 3);
  close(-1 * L.P5_DIAG.reduce((a, b) => a * b, 1), det(L.P5_M));
  assert.ok(L.p5ShieldOk(L.P5_K) && !L.p5ShieldOk(3.5) && !L.p5ShieldOk(5));
  close(det(L.shield(4)), 0);
});

test('p6 [SP]: the Collapse numbers come from the truth table', () => {
  assert.ok(meq(L.SPIRES, S_COLLAPSE));
  assert.ok(meq(S_COLLAPSE.map((r) => r.slice(0, 2)), [[1, 0], [0, 1], [1, 2]]));
  close(S_COLLAPSE[2][2], 2 + DELTA, 1e-15);
  close(L.FORECAST, DET_C, 1e-12);
  close(L.FORECAST, DELTA, 1e-12);
  assert.equal(L.twoDp(L.FORECAST), '0.00');
  close(det(L.FORECAST_MINOR), L.FORECAST, 1e-12);
  // the two-decimal reading has equal second and third columns and no inverse; the reference moves leave a zero row
  assert.ok(meq(L.SPIRES_2DP, [[1, 0, 0], [0, 1, 1], [1, 2, 2]]));
  assert.equal(inverse(L.SPIRES_2DP), null);
  // the real pulse is not exactly flat: smallest stretch 1/750
  close(svd(C).S[2], 1 / 750, 1e-9);
  // every brace arrangement keeps the same fraction
  for (const b of L.P6_BRACES) close(L.braceRatio(b), DET_C, 1e-9);
  const r = rng(3);
  for (let i = 0; i < 100; i++) {
    const b = [0, 1, 2].map(() => [r() * 4 - 2, r() * 4 - 2, r() * 4 - 2]);
    if (Math.abs(L.braceVolume(b)) > 1e-3) close(L.braceRatio(b), DET_C, 1e-6);
  }
  assert.ok(L.newArrangement(L.P6_BRACES[1], [L.P6_BRACES[0]]) && !L.newArrangement(L.P6_BRACES[0], [L.P6_BRACES[0]]));
  assert.ok(!L.newArrangement([[1, 0, 0], [2, 0, 0], [0, 0, 1]], []), 'a flat set of braces does not count');
  assert.ok(text('strike').includes('(0, 1, 2.004)') && text('after').includes('to two decimal places'));
});

test('honest animations: no frame flattens before the end', () => {
  // the routine pulse played as P·(R(θ) ⊕ height)·P⁻¹ and as (1 − t)I + t·M: determinant never 0 before the end
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const th = (t * Math.PI) / 2;
    const Sp = [[Math.cos(th), -Math.sin(th), 0], [Math.sin(th), Math.cos(th), 0], [0, 0, 1 + (S_now[2][2] - 1) * t]];
    close(det(matMul(matMul(P, Sp), Pinv)), 1 - 0.2 * t, 1e-9);
    assert.ok(det(mlerp(identity(3), S_now, t)) > 0.3);
    if (t < 1) assert.ok(det(mlerp(identity(3), C, t)) > 1e-3, 'the Collapse is a sheet only at the end');
  }
  assert.ok(meq(matMul(matMul(P, S_now), Pinv), T3));
});

test('p7 [S]: Cramer gives (2, 1) from ratios of areas', () => {
  assert.deepEqual(L.P7_X.map((x) => Math.round(x * 1e9) / 1e9), [2, 1]);
  assert.deepEqual(L.cramer(L.P7_A, L.P7_B).map((x) => Math.round(x * 1e9) / 1e9), [2, 1]);
  close(det(L.replaceCol(L.P7_A, 0, L.P7_B)), 2);
});

test('Doubts and the Act IV Review: canonical constructions give the right verdict; the Shake breaks false claims', () => {
  // (F) doubling doubles area: identity breaks it; it holds only for flat moves
  assert.ok(!L.doublingDoubles(identity(2)) && L.doublingDoubles([[1, 2], [2, 4]]));
  // (F) det(A + B) = det A + det B: A = B = I breaks it
  assert.ok(!L.detAdds(identity(2), identity(2)));
  // (T) no inverse ⇒ det 0, on random flat moves and random moves
  const r = rng(11);
  for (let i = 0; i < 300; i++) {
    const a = [Math.floor(r() * 7) - 3, Math.floor(r() * 7) - 3], k = Math.floor(r() * 5) - 2;
    assert.ok(L.noInverseDetZero([[a[0], k * a[0]], [a[1], k * a[1]]]));
    assert.ok(L.noInverseDetZero([[Math.floor(r() * 7) - 3, Math.floor(r() * 7) - 3], [Math.floor(r() * 7) - 3, Math.floor(r() * 7) - 3]]));
  }
  // Review: AB = BA (F), no zero entries ⇒ undo (F), flips can be undone (T)
  assert.ok(!L.commutes([[1, 1], [0, 1]], [[0, -1], [1, 0]]) && L.commutes([[2, 0], [0, 3]], [[5, 0], [0, 1]]));
  assert.ok(!L.noZeroHasUndo([[1, 1], [1, 1]]) && L.noZeroHasUndo([[2, 1], [1, 1]]) && L.noZeroHasUndo([[1, 0], [0, 0]]));
  for (let i = 0; i < 300; i++) {
    const M = [[Math.floor(r() * 7) - 3, Math.floor(r() * 7) - 3], [Math.floor(r() * 7) - 3, Math.floor(r() * 7) - 3]];
    assert.ok(L.flipUndo(M));
  }
  // the Shake on a false claim finds a breaking case within five random cases
  let broke = false;
  for (let i = 0; i < 5 && !broke; i++) broke = !L.detAdds([[Math.floor(r() * 5) - 2, Math.floor(r() * 5) - 2], [Math.floor(r() * 5) - 2, Math.floor(r() * 5) - 2]], [[Math.floor(r() * 5) - 2, Math.floor(r() * 5) - 2], [Math.floor(r() * 5) - 2, Math.floor(r() * 5) - 2]]);
  assert.ok(broke);
});

test('Law: "det A is zero exactly when A flattens space" survives; every other filling breaks', () => {
  assert.ok(checkLaw(L.lawCore, L.lawCore.answer).survived);
  assert.deepEqual(L.LAW_OPTIONS, { value: ['zero', 'one'], cond: ['flat', 'zero-entry', 'flip', 'same-area'] });
  for (const value of L.LAW_OPTIONS.value) {
    for (const cond of L.LAW_OPTIONS.cond) {
      const right = value === L.lawCore.answer.value && cond === L.lawCore.answer.cond;
      assert.equal(checkLaw(L.lawCore, { value, cond }).survived, right, `${value} / ${cond}`);
    }
  }
});

test('Build crew: det by elimination matches the library; det3 matches on 3 × 3', () => {
  const r = rng(21);
  for (let i = 0; i < 300; i++) {
    const M = L.swarmSquare(r, i % 3 === 0 ? 'cadet' : i % 3 === 1 ? 'navigator' : 'commander');
    close(L.crewDet(M), det(M), 1e-6 * Math.max(1, Math.abs(det(M))));
    if (M.length === 3) close(L.crewDet3(M), det(M), 1e-9);
  }
  close(L.crewDet(S_COLLAPSE), DET_C, 1e-12);
  close(L.crewDet([[0, 2, 1], [1, 1, 1], [2, 1, 0]]), 3, 1e-12);
});
