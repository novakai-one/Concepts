// Chapter 25: the SVD story numbers (TT7, TT10, TT11, TT12, TT22), every puzzle's win check (reference wins,
// misconceptions do not), the set piece, Teach Teo T5 (the reference lands; each missing key step fails as listed),
// the Doubts, the Law (the target survives 500 cases, each near-miss breaks) and the two builds in CPython.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../site/src/singular/content/chapters/c25-svd/logic.ts';
import { S } from '../../site/src/singular/content/chapters/c25-svd/script.ts';
import { LOW_RANK, SVD, buildLowRank, buildSvd } from '../../site/src/singular/content/chapters/c25-svd/build.ts';
import { checkLaw } from '../../site/src/singular/game/lawcheck.ts';
import { det, dot, identity, inverse, matMul, matVec, meq, norm, svd, transpose, veq } from '../../site/src/singular/math/la.ts';
import { C as COLLAPSE, C2, C2_NULL, P, Pinv, R } from '../../site/src/singular/content/truth.ts';
import { ACT9_LIB, checkBuild } from './game-c24-lib.test.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const said = (ls: unknown[]) => (ls as ({ text: string } | [string, string])[]).map((l) => (Array.isArray(l) ? l[1] : l.text)).join(' ');

test('p1: A = [[3, 0], [4, 5]]: inputs (1, 1)/√2, (1, −1)/√2 land perpendicular, √45 and √5 long, product |det A| = 15', () => {
  close(L.P1_SIGMA[0], Math.sqrt(45)); close(L.P1_SIGMA[1], Math.sqrt(5));
  close(L.P1_SIGMA[0] * L.P1_SIGMA[1], Math.abs(L.P1_DET)); close(L.P1_DET, 15);
  close(L.outputsAngle(45), 90, 1e-9); close(L.outputsAngle(135), 90, 1e-9);
  assert.ok(Math.abs(L.outputsAngle(10) - 90) > 20);
  assert.ok(L.p1Won(45, 0.5) && L.p1Won(-45, 0.5) && L.p1Won(135.3, 0.5));
  assert.ok(!L.p1Won(0, 1) && !L.p1Won(50, 1));
  for (const [v, u] of [[L.P1_V[0], L.P1_UDIR[0]], [L.P1_V[1], L.P1_UDIR[1]]]) { const y = matVec(L.P1_A, v); close(y[0] * u[1] - y[1] * u[0], 0, 1e-9); }
  // the singular values are not the eigenvalues (3 and 5)
  assert.ok(!L.svIsEigHolds(L.P1_A));
  assert.ok(said(S.p1Win).includes('6.71') && said(S.p1Win).includes('2.24'));
});

test('p2 [D]: AᵀA = [[25, 20], [20, 25]], eigenvalues 45 and 5; A(1, 1)·A(1, −1) = 0; A v₁·A v₂ = 45 (v₁·v₂)', () => {
  assert.ok(meq(L.P2_ATA, [[25, 20], [20, 25]]));
  assert.deepEqual(L.P2_EIG, [45, 5]);
  assert.ok(veq(L.P2_AV1, [3, 9]) && veq(L.P2_AV2, [3, -1]));
  close(dot(L.P2_AV1, L.P2_AV2), 0);
  for (const t of [0, 30, -45, 100]) close(L.p2Dot(t), 45 * dot([Math.SQRT1_2, Math.SQRT1_2], [Math.cos((t * Math.PI) / 180), Math.sin((t * Math.PI) / 180)]), 1e-9);
  close(L.p2Dot(-45), 0, 1e-9);
  assert.equal(L.P2_ORDER.join(), 'a,b,c,d');
});

test('p3: turn −45°, stretch √45 and √5, turn 71.57° rebuilds A; turning the wrong way does not', () => {
  close(L.P3_T2, (Math.atan2(3, 1) * 180) / Math.PI);
  assert.ok(L.p3Won(L.threeMoves(L.P3_T1, L.P1_SIGMA[0], L.P1_SIGMA[1], L.P3_T2), 1e-9));
  assert.ok(L.p3Won(L.threeMoves(-45, 6.71, 2.24, 71.57), 0.03), 'the rounded values are close enough');
  assert.ok(!L.p3Won(L.threeMoves(45, L.P1_SIGMA[0], L.P1_SIGMA[1], L.P3_T2), 0.15), 'first turn the wrong way');
  assert.ok(!L.p3Won(L.threeMoves(-45, 5, 3, L.P3_T2), 0.15), 'the eigenvalues are not the stretches');
});

test('p4 [H]: the 3 × 2: AᵀA = [[2, 1], [1, 2]], σ = √3 and 1, u₁ = (2, 1, 1)/√6, u₂ = (0, −1, 1)/√2', () => {
  assert.ok(meq(L.P4_ATA, [[2, 1], [1, 2]]));
  const d = L.svdCanon(L.P4_A);
  assert.ok(veq(d.S, L.P4_SIGMA, 1e-9));
  assert.ok(veq(d.vs[0], L.P4_V[0], 1e-9) && veq(d.vs[1], L.P4_V[1], 1e-9));
  assert.ok(veq(d.us[0], L.P4_U[0], 1e-9) && veq(d.us[1], L.P4_U[1], 1e-9));
  for (let i = 0; i < 2; i++) assert.ok(veq(matVec(L.P4_A, L.P4_V[i]), L.P4_U[i].map((x) => x * L.P4_SIGMA[i]), 1e-9));
});

test('p5: Teo’s voice has the singular values it was built with; 8 layers is the fewest clear, inside 800; one layer of A misses by √5', () => {
  assert.ok(veq(svd(L.TEO.X).S, L.TEO_SV, 1e-9));
  assert.equal(L.K_OPTIONS.find(L.isClear), L.P5_K);
  assert.ok(L.p5Won(8) && !L.p5Won(4) && !L.p5Won(16) && !L.p5Won(32));
  assert.ok(L.storage(8) <= 800 && L.storage(16) > 800);
  assert.ok(L.heard(L.layerError(8)) === L.TEO_WORDS);
  assert.ok(L.heard(L.layerError(4)) !== L.TEO_WORDS);
  // the rebuilt picture misses by exactly the left-over share
  const X8 = L.rebuild(8);
  const fro = (M: number[][]) => Math.sqrt(M.flat().reduce((s, x) => s + x * x, 0));
  close(fro(L.TEO.X.map((r, i) => r.map((x, j) => x - X8[i][j]))) / fro(L.TEO.X), L.layerError(8), 1e-9);
  // one layer of the test move
  assert.ok(meq(L.P5_A1, [[1.5, 1.5], [4.5, 4.5]], 1e-9));
  close(L.errStretch(-45), Math.sqrt(5), 1e-9);
  for (let t = 0; t < 360; t += 5) assert.ok(L.errStretch(t) <= Math.sqrt(5) + 1e-9);
  assert.ok(L.p5bWon(-45, 0.01) && L.p5bWon(135, 0.01) && !L.p5bWon(45, 0.05));
});

test('p6: the fitted pulse’s stretches are 3.00, 1.00, 0.00 to two decimals and 3.002670, 1.000000, 0.001333 to six; thickness 1/750', () => {
  assert.deepEqual(L.SV2, ['3.00', '1.00', '0.00']);
  assert.deepEqual(L.SV6, ['3.002670', '1.000000', '0.001333']);
  close(L.THIN, 1 / 750, 1e-12);
  assert.ok(L.p6Won(1 / 750) && L.p6Won(0.001333));
  assert.ok(!L.p6Won(0) && !L.p6Won(0.0013) && !L.p6Won(0.01));
  // the star: the two-decimal model's smallest singular value is exactly 0
  close(L.SV_C2[2], 0, 1e-12);
  assert.ok(L.svdOk(L.crewSvd(L.FITTED)));
  assert.ok(said(S.p6Win).includes('0.001333') && said(S.p6Intro).includes('0.00'));
});

test('p7 [S]: V Σ⁺ Uᵀ (2, 0) = (0.5, 0.5), the shortest of the closest answers', () => {
  assert.ok(veq(L.P7_XPLUS, [0.5, 0.5], 1e-12));
  assert.ok(meq(L.pinv(L.P7_A), [[0.25, 0.25], [0.25, 0.25]], 1e-12));
  assert.ok(L.p7Won([0.5, 0.5], 0.03) && !L.p7Won([1, 0], 0.03) && !L.p7Won([0.4, 0.4], 0.03));
});

test('set piece: 7.5 off; C₂ has no inverse and C₂⁺C₂ drops the (1, 1, −1) part; N = 625; braces at 35.2°; the settings (TT22); the split', () => {
  close(L.RAW_ERROR, 7.5, 1e-6);
  close(L.CONDITION, 2252, 1);
  assert.ok(L.sp1Won(7.5, 0.25) && !L.sp1Won(0.75, 0.25));
  // the exact model
  close(det(C2), 0, 1e-12);
  assert.equal(inverse(C2.map((r) => r.slice())) === null || Math.abs(det(C2)) < 1e-12, true);
  assert.ok(veq(matVec(L.C2_BACK, C2_NULL), [0, 0, 0], 1e-9));
  assert.ok(meq(matMul(L.C2_BACK, L.C2_BACK), L.C2_BACK, 1e-9), 'C₂⁺C₂ is a projection');
  const a = [0.9, -0.4, 0.5];
  assert.ok(L.sp2Won(a, a.map((x, i) => x + C2_NULL[i])));
  assert.ok(!L.sp2Won(a, a.map((x, i) => x + [1, 0, 0][i])));
  assert.ok(!L.sp2Won(a, a), 'two different points');
  // readings
  assert.equal(L.READINGS, 625);
  close(L.unfoldError(625), 0.3, 1e-6);
  assert.ok(L.sp3Won(625) && L.sp3Won(700) && !L.sp3Won(600) && !L.sp3Won(800));
  // braces
  close(L.mixedStress(L.SP4_THETA), 0, 1e-12);
  close(L.SP4_THETA, 35.23, 0.01);
  assert.ok(L.sp4Won(L.SP4_THETA, 0.1) && L.sp4Won(L.SP4_THETA + 90, 0.1) && !L.sp4Won(0, 1));
  // settings: today R C R⁻¹ has the same singular values; the undo in the Anchor's grid
  assert.ok(veq(svd(L.TODAY).S, svd(COLLAPSE).S, 1e-9));
  assert.ok(meq(L.SETTINGS, matMul(matMul(matMul(matMul(Pinv, R), inverse(COLLAPSE)!), inverse(R)!), P), 1e-6));
  assert.ok(meq(L.SETTINGS_UNDO, identity(3), 1e-6));
  close(L.SPIRE_LENGTHS[0], 612.6, 0.1); close(L.SPIRE_LENGTHS[1], 1, 1e-9); close(L.SPIRE_LENGTHS[2], 611.8, 0.1);
  assert.ok(L.sp5Won(L.SP5_REF));
  for (const wrong of [['Cinv'], ['R', 'Cinv', 'Rinv'], ['Pinv', 'Cinv', 'P'], ['Pinv', 'Rinv', 'Cinv', 'R', 'P'], ['P', 'R', 'Cinv', 'Rinv', 'Pinv']]) assert.ok(!L.sp5Won(wrong), wrong.join(' '));
  assert.ok(L.unfoldGrade({ N: 625, braced: true, settings: true }).ok);
  assert.ok(!L.unfoldGrade({ N: 100, braced: true, settings: true }).ok);
  // the split
  close(L.splitStretch(0.5), Math.sqrt(750), 1e-6);
  assert.ok(L.sp7Won(0.5) && !L.sp7Won(0.45) && !L.sp7Won(0));
  void transpose; void norm;
});

test('Teach Teo T5: the reference lands; each missing key step fails as listed; the decoys are the misconceptions', () => {
  assert.deepEqual(L.runTeo(L.TEO_REF), { ok: true, fault: null, error: L.unfoldError(625) });
  assert.equal(L.runTeo(['thin', 'avg', 'go']).fault, 'k1');
  assert.equal(L.runTeo(['flat', 'avg', 'go']).fault, 'k2');
  const k3 = L.runTeo(['flat', 'thin', 'go']);
  assert.equal(k3.fault, 'k3'); close(k3.error, 7.5, 1e-6);
  assert.equal(L.runTeo(['avg', 'flat', 'thin']).fault, 'order');
  assert.equal(L.runTeo([...L.TEO_REF, 'zero']).fault, 'zero');
  assert.equal(L.runTeo(['flat', 'thin', 'one']).fault, 'one');
  assert.ok(L.TEO_KEYS.every((k) => L.TEO_REF.includes(k)));
});

test('Doubts: σ ≠ λ for [[3, 0], [4, 5]]; a 3 × 2 has an SVD; σ₁σ₂ = |det| for every square matrix', () => {
  assert.ok(!L.svIsEigHolds([[3, 0], [4, 5]]) && !L.svIsEigHolds([[1, 1], [0, 1]]));
  assert.ok(L.svIsEigHolds([[2, 1], [1, 2]]), 'they agree for a symmetric matrix with positive eigenvalues');
  assert.ok(!L.squareOnlyHolds(L.P4_A) && L.squareOnlyHolds([[1, 2], [3, 4]]));
  const d = L.svdCanon(L.P4_A);
  assert.ok(meq(L.P4_A, L.P4_A.map((_, i) => [0, 1].map((j) => d.S.reduce((s, sg, k) => s + sg * d.us[k][i] * d.vs[k][j], 0))), 1e-9));
  for (const M of [[[1, 2], [2, 4]], [[0, 1], [1, 0]], [[1, 1.5], [0, 1]], [[3, 0], [4, 5]], [[-2, 1], [0.5, -1]]]) assert.ok(L.svDetHolds(M));
});

test('Law: the k largest layers, missing by σ(k+1), survives 500 cases; each near-miss breaks', () => {
  assert.deepEqual(checkLaw(L.LAW_CORE, L.LAW_ANSWER), { survived: true });
  for (const f of [{ which: 'first', err: 'next' }, { which: 'smallest', err: 'next' }, { which: 'largest', err: 'zero' }, { which: 'largest', err: 'sum' }]) assert.equal(checkLaw(L.LAW_CORE, f).survived, false, JSON.stringify(f));
});

test('builds: svd and low_rank pass their tests and a swarm in CPython; each decoy fails a test', () => {
  checkBuild(buildSvd, ACT9_LIB, 90);
  checkBuild(buildLowRank, `${ACT9_LIB}\n${SVD}`, 60);
  void LOW_RANK;
});

test('p2 [D] Navigator: AᵀA sends (1, 1) to 45 (1, 1) and (1, −1) to 5 (1, −1); the slips are AAᵀ and the row/column mix', () => {
  assert.ok(veq(L.P2_ATAV1, [45, 45]) && veq(L.P2_ATAV2, [5, -5]));
  close(dot([1, 1], L.P2_ATAV2), 0);
  close(dot([1, 1], L.P2_ATAV2), 5 * dot([1, 1], [1, -1]));
  close(dot(L.P2_AV1, L.P2_AV2), dot([1, 1], L.P2_ATAV2), 1e-12);
  assert.ok(meq(L.P2_AAT, matMul(L.P1_A, transpose(L.P1_A))) && meq(L.P2_AAT, [[9, 12], [12, 41]]));
  assert.ok(meq(L.P2_ROWCOL, [[25, 12], [12, 25]]));
  for (const m of [L.P2_AAT, L.P2_ROWCOL]) assert.ok(!meq(m, L.P2_ATA), 'a slip is not the answer');
});

test('p2 [D] Commander: tile b may sit anywhere before d; a before c, d last, no decoy, each tile once', () => {
  for (const o of [['a', 'b', 'c', 'd'], ['b', 'a', 'c', 'd'], ['a', 'c', 'b', 'd']]) assert.ok(L.p2OrderOk(o), o.join());
  assert.equal(L.p2OrderFault(['a', 'x', 'c', 'd']), 'decoy');
  assert.equal(L.p2OrderFault(['a', 'b', 'c', 'd', 'x']), 'decoy');
  assert.equal(L.p2OrderFault(['a', 'c', 'd']), 'missing');
  assert.equal(L.p2OrderFault(['a', 'b', 'b', 'c', 'd']), 'repeat');
  assert.equal(L.p2OrderFault(['a', 'b', 'd', 'c']), 'last');
  assert.equal(L.p2OrderFault(['d', 'a', 'b', 'c']), 'last');
  assert.equal(L.p2OrderFault(['c', 'a', 'b', 'd']), 'order');
  assert.equal(L.p2OrderFault(['b', 'c', 'a', 'd']), 'order');
  assert.ok(L.p2OrderOk(L.P2_ORDER), 'the canonical order (Show me) passes');
});

test('p4 [H]: the AᵀA slips fit the 2 × 2 grid: the corner of AAᵀ, and the missing cross term', () => {
  const aat = matMul(L.P4_A, transpose(L.P4_A));
  assert.ok(meq(aat, [[2, 1, 1], [1, 1, 0], [1, 0, 1]]));
  assert.ok(meq(L.P4_AAT_CORNER, [[2, 1], [1, 1]]) && meq(L.P4_NO_CROSS, [[2, 0], [0, 2]]));
  for (const m of [L.P4_AAT_CORNER, L.P4_NO_CROSS]) { assert.equal(m.flat().length, L.P4_ATA.flat().length); assert.ok(!meq(m, L.P4_ATA)); }
});

test('p7 [S]: the input starts off the line of closest answers, so neither subgoal is met before a move', () => {
  const y = matVec(L.P7_A, L.P7_START);
  assert.ok(veq(y, [2, 2]));
  close(norm([y[0] - L.P7_B[0], y[1] - L.P7_B[1]]), 2);
  for (const tol of [0.03, 0.06]) { assert.ok(Math.abs(L.P7_START[0] + L.P7_START[1] - 1) > tol); assert.ok(!L.p7Won(L.P7_START, tol)); }
});

test('set piece lines: no reading count or error that the player’s own N can contradict; the split multiplies', () => {
  // any N from 625 to 700 wins sp3, so the voiced lines name no N and no error
  for (const N of [625, 650, 675, 700]) assert.ok(L.sp3Won(N));
  for (const ls of [S.sp3Win, S.sp6Intro, S.sp6Win]) { const t = said(ls); assert.ok(!/625|0\.3\b|0\.28|0\.29/.test(t), t); }
  // two pulses of √750 each, multiplied: not half of 750
  const t7 = said(S.sp7Win);
  assert.ok(t7.includes('27.4') && t7.includes('750') && !/half the stretch/i.test(t7));
  close(L.splitStretch(0.5) ** 2, L.AMPLIFY, 1e-9); close(L.AMPLIFY, 750, 1e-6);
  // the svd install line quotes the six decimals
  assert.ok(L.SV6.every((x) => said(S.svdRerun).includes(x)));
});

test('sp4: the slider positions that win on each level leave a small non-zero mixed stress (the readout goes green on the win, not on 0)', () => {
  for (const [step, tol] of [[1, 0.6], [0.5, 0.3], [0.1, 0.08]]) {
    const at = Math.round(L.SP4_THETA / step) * step;
    assert.ok(L.sp4Won(at, tol), `step ${step}`);
    assert.ok(!L.sp4Won(at - step, tol) && !L.sp4Won(at + 2 * step, tol), `step ${step}: one position, not a range`);
  }
  assert.ok(Math.abs(L.mixedStress(35)) > 0.01 && Math.abs(L.mixedStress(35.5)) > 0.01);
  close(L.mixedStress(0), Math.SQRT2, 1e-12);
});
