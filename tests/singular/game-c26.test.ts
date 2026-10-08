// Chapter 26: the PCA story numbers (TT18: the record's singular values), every puzzle's win check (reference
// wins, misconceptions do not), the record itself (exact singular values, 10,000 × 12), LANTERN's Procedure (the
// reference lands; each missing key step fails as listed), the Doubts, the Act IX Review, the Law (the target
// survives 500 cases, each near-miss breaks) and the two builds in CPython.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../site/src/singular/content/chapters/c26-pca/logic.ts';
import { S } from '../../site/src/singular/content/chapters/c26-pca/script.ts';
import { COVARIANCE, buildCovariance, buildPca } from '../../site/src/singular/content/chapters/c26-pca/build.ts';
import { checkLaw } from '../../site/src/singular/game/lawcheck.ts';
import { dot, eigSym, matVec, meq, norm, transpose, veq } from '../../site/src/singular/math/la.ts';
import { C as COLLAPSE, RECORD_SV } from '../../site/src/singular/content/truth.ts';
import { symEig } from '../../site/src/singular/content/chapters/c24-spectral/logic.ts';
import { svdCanon } from '../../site/src/singular/content/chapters/c25-svd/logic.ts';
import { ACT9_LIB, BASE_LIB, checkBuild } from './game-c24-lib.test.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const said = (ls: unknown[]) => (ls as { text: string }[]).map((l) => l.text).join(' ');
const R2 = Math.SQRT1_2;

test('clouds are built with exactly the mean and covariance asked for', () => {
  const C = [[2, 0.5], [0.5, 1]];
  const X = L.cloudWith(50, [3, -1], C, 7);
  assert.ok(veq(L.meanOf(X), [3, -1], 1e-9));
  assert.ok(meq(L.covariance(X), C, 1e-9));
});

test('p1: spread of the shadows + mean squared distance to the line = the same total, for every line; the best is the top eigenvector', () => {
  const tot = L.totalSpread(L.P1_CLOUD);
  for (let t = 0; t < 180; t += 7) {
    const d = [Math.cos((t * Math.PI) / 180), Math.sin((t * Math.PI) / 180)];
    close(L.spreadOn(L.P1_CLOUD, [0, 0], d) + L.perpOn(L.P1_CLOUD, [0, 0], d), tot, 1e-9);
  }
  assert.ok(L.p1Won(L.P1_BEST) && !L.p1Won([1, 0]) && !L.p1Won([0, 1]));
  assert.ok(L.p1Won(L.P1_BEST.map((x) => -x)));
  // the pancake: spreads 5, 2 and 0.1; the plane of the two largest keeps 7
  assert.ok(veq(symEig(L.covariance(L.PANCAKE)).values, [5, 2, 0.1], 1e-9));
  const n = L.normalFrom(L.P1B_REF.turn, L.P1B_REF.tilt);
  close(L.planeKeeps(n), L.PANCAKE_BEST, 1e-9);
  assert.ok(L.p1bWon(n) && !L.p1bWon([0, 0, 1]) && !L.p1bWon([1, 0, 0]));
});

test('p2: about the origin the best direction points toward the mean; about the mean it runs along the cloud', () => {
  const raw = L.bestAbout([0, 0]), cen = L.bestAbout(L.P2_MEAN);
  assert.ok(L.lineDeg(raw, L.P2_MEAN) < 12, `raw is ${L.lineDeg(raw, L.P2_MEAN)}° from the mean`);
  assert.ok(L.lineDeg(cen, L.P2_MEAN) > 40);
  close(L.lineDeg(cen, symEig(L.covariance(L.P2_CLOUD)).vectors[0]), 0, 1e-6);
  assert.ok(L.p2Won([3.25, 2.15], 0.15) && !L.p2Won([0, 0], 0.15) && !L.p2Won([2.5, 2.2], 0.15));
});

test('p2 bark: “Closer” only when the pivot moved toward the mean; the turn is between lines, folded into [0°, 90°]', () => {
  close(L.p2FromMean([0, 0]), Math.hypot(3.2, 2.2), 1e-12);   // 3.88
  assert.ok(L.p2FromMean([-2, -2]) > L.p2FromMean([0, 0]), 'moving away from the mean is not closer');
  assert.ok(L.p2FromMean([1, 1]) < L.p2FromMean([0, 0]));
  close(L.p2Turn([0, 0]), 0, 1e-9);
  // at (3.2, 0) the line goes from 33° to 99°: a turn of 66°, not the raw 114° between the two eigenvectors
  assert.ok(Math.abs(L.p2Turn([3.2, 0]) - 66) < 1, `${L.p2Turn([3.2, 0])}`);
  for (const c of [[3.2, 0], [-2, -2], [1, 1], [2, 1.5], [3, 3], [-1, 4]]) { const t = L.p2Turn(c); assert.ok(t >= 0 && t <= 90, `${c}: ${t}`); close(t, L.lineDeg(L.bestAbout(c), L.bestAbout([0, 0])), 1e-6); }
});

test('p3 [D]: C = [[4, 2], [2, 3]]: largest spread 5.56 of 7 (79%) along the top eigenvector; wᵀCw is the spread', () => {
  close(L.P3_EIG.values[0], (7 + Math.sqrt(17)) / 2, 1e-9);
  close(L.P3_SHARE, 0.7945, 1e-4);
  assert.ok(meq(L.covariance(L.P3_CLOUD), L.P3_C, 1e-9));
  for (let t = 0; t < 180; t += 11) { const w = [Math.cos(t), Math.sin(t)]; close(L.spreadOn(L.P3_CLOUD, [0, 0], w), dot(w, matVec(L.P3_C, w)), 1e-9); }
  assert.ok(L.p3Won(L.P3_EIG.vectors[0], 1) && !L.p3Won([1, 0], 5) && !L.p3Won(L.P3_EIG.vectors[1], 5));
  assert.equal(L.P3_ORDER.join(), 'a,b,c,d');
  assert.ok(said(S.p3Win).includes('5.56') && said(S.p3Win).includes('79%'));
});

test('p3 [D] at Navigator: the typed steps follow the derivation at w = (1, 0); two-decimal working passes each step', () => {
  const [l1, l2] = L.P3_EIG.values, [q1, q2] = L.P3_EIG.vectors;
  // (1) the quadratic form at w = (1, 0)
  assert.equal(L.P3_W0_SPREAD, 4);
  close(L.P3_W0_SPREAD, L.spreadOn(L.P3_CLOUD, [0, 0], L.P3_W0), 1e-9);
  // (2) the eigenvalues, typed to two decimals
  assert.ok(Math.abs(5.56 - l1) <= L.TOL2 && Math.abs(1.44 - l2) <= L.TOL2);
  // (3) w in C's eigenvector grid: y² = (0.62, 0.38), adding to 1
  close(L.P3_Y2[0] + L.P3_Y2[1], 1, 1e-12);
  const r2 = (x: number) => Math.round(x * 100) / 100;
  const qGrid = [q1, q2].map((q) => q.map(r2));   // the two-decimal grid printed in the prompt
  assert.deepEqual(qGrid, [[0.79, 0.62], [0.62, -0.79]]);
  const y2Worked = qGrid.map((q) => (q[0] * L.P3_W0[0] + q[1] * L.P3_W0[1]) ** 2);   // 0.6241, 0.3844
  for (const typed of [y2Worked, y2Worked.map(r2)]) typed.forEach((y, i) => assert.ok(Math.abs(y - L.P3_Y2[i]) <= L.P3_Y2_TOL, `${y} vs ${L.P3_Y2[i]}`));
  assert.ok(Math.abs(L.P3_Y2[1] - L.P3_Y2[0]) > L.P3_Y2_TOL, 'swapped y² values fail');
  // (4) λ₁y₁² + λ₂y₂² is the same spread as step 1, also from two-decimal working
  close(l1 * L.P3_Y2[0] + l2 * L.P3_Y2[1], L.P3_W0_SPREAD, 1e-9);
  for (const y of [y2Worked, y2Worked.map(r2)]) assert.ok(Math.abs(5.56 * y[0] + 1.44 * y[1] - 4) <= L.P3_FORM_TOL, `${5.56 * y[0] + 1.44 * y[1]}`);
  assert.ok(Math.abs(5.56 - 4) > L.P3_FORM_TOL && Math.abs(7 - 4) > L.P3_FORM_TOL);
  // (5) with y₁² + y₂² = 1 the largest value is λ₁, at y = (1, 0): w = q₁
  for (let t = 0; t <= 1; t += 0.05) assert.ok(l1 * t + l2 * (1 - t) <= l1 + 1e-12);
  close(dot(q1, matVec(L.P3_C, q1)), l1, 1e-9);
});

test('p4 [H]: mean (4, 5); centred (2, 1), (−2, −1), (1, 2), (−1, −2); C = (1/3)[[10, 8], [8, 10]]; 6 and 2/3; (1, 1)/√2 keeps 90%; ±3/√2', () => {
  assert.ok(veq(L.P4_MEAN, [4, 5]));
  assert.ok(meq(L.P4_CENTRED, [[2, 1], [-2, -1], [1, 2], [-1, -2]]));
  assert.ok(meq(L.P4_COV, [[10 / 3, 8 / 3], [8 / 3, 10 / 3]], 1e-12));
  assert.ok(veq(L.P4_EIG.values, [6, 2 / 3], 1e-12));
  assert.ok(veq(L.P4_EIG.vectors[0], [R2, R2], 1e-12));
  close(L.P4_SHARE, 0.9, 1e-12);
  assert.ok(veq(L.P4_PROJ, [3 * R2, -3 * R2, 3 * R2, -3 * R2], 1e-12));
  // two-decimal answers (3.33, 2.67; 0.67) pass the covariance and eigenvalue steps; the misconceptions do not
  const r2 = (x: number) => Math.round(x * 100) / 100;
  assert.ok(meq(L.P4_COV.map((r) => r.map(r2)), L.P4_COV, L.TOL2));
  assert.ok(veq(L.P4_EIG.values.map(r2), L.P4_EIG.values, L.TOL2));
  assert.ok(!meq([[2.5, 2], [2, 2.5]], L.P4_COV, L.TOL2) && !meq([[10, 8], [8, 10]], L.P4_COV, L.TOL2));
  assert.ok(!veq([6, 0.6], L.P4_EIG.values, L.TOL2) && !veq([6, 0.7], L.P4_EIG.values, L.TOL2));
});

test('p5: the record’s twelve singular values (TT18); 2 components keep 96.35%, 1 keeps 60.0%; the third is above the tail', () => {
  assert.deepEqual(RECORD_SV, [9.0, 7.0, 1.5, 1.0, 0.8, 0.6, 0.5, 0.4, 0.3, 0.3, 0.2, 0.2]);
  close(L.keptShare(1), 81 / 134.92, 1e-12); close(L.keptShare(2), 130 / 134.92, 1e-12);
  assert.equal(L.P5_K, 2);
  assert.ok(L.p5Won(2) && !L.p5Won(1) && !L.p5Won(3));
  assert.ok(RECORD_SV[2] > RECORD_SV[3] + 0.4);
  assert.ok(said(S.p5Win).includes('96.4%'));
});

test('p6: the record is 10,000 × 12 with exactly the singular values of TT18 after centring; components 1 and 2 go out', () => {
  const rec = L.record();
  assert.equal(rec.X.length, L.REC_N); assert.equal(rec.X[0].length, L.REC_D);
  assert.ok(veq(L.meanOf(rec.X), rec.mean, 1e-9));
  // σ² are the eigenvalues of XcᵀXc (never la.svd on a tall matrix: it completes U to 10,000 columns)
  const Xc = rec.X.map((r) => r.map((x, i) => x - rec.mean[i]));
  const G = transpose(Xc).map((a) => transpose(Xc).map((b) => dot(a, b)));
  const sv = eigSym(G).values.map((l) => Math.sqrt(Math.max(0, l))).sort((a, b) => b - a);
  assert.ok(veq(sv, RECORD_SV, 1e-6), JSON.stringify(sv));
  // the crew's pca of the record gives the scores σ u (up to sign)
  const Y = L.crewPca(rec.X, 2), sc = L.scores([0, 1]);
  for (const k of [0, 1]) { const s = Math.sign(Y[0][k] * sc[0][k]) || 1; assert.ok(Y.every((y, i) => Math.abs(y[k] - s * sc[i][k]) < 1e-6)); }
  assert.ok(L.p6Won([0, 1]) && L.p6Won([1, 0]) && !L.p6Won([0, 2]) && !L.p6Won([0]));
  close(L.pairShare([0, 1]), L.keptShare(2), 1e-12);
  assert.equal(rec.path.length, 42);
});

test('p7 [S]: the first component runs along the groups; the second separates them', () => {
  assert.ok(L.lineDeg(L.P7_EIG.vectors[0], [0, 1]) < 1e-6 && L.lineDeg(L.P7_EIG.vectors[1], [1, 0]) < 1e-6);
  assert.ok(!L.p7Won(L.P7_EIG.vectors[0]) && L.p7Won(L.P7_EIG.vectors[1]));
  assert.ok(L.p7Gap([1, 0]) > 0.1);
});

test('Procedure: the reference lands; missing centre, sort or keep fails as listed; the decoys are the misconceptions', () => {
  const ok = L.runProc(L.PROC_REF);
  assert.ok(ok.ok && ok.fault === null);
  const without = (id: string) => L.PROC_REF.filter((x) => x !== id);
  assert.equal(L.runProc(without('centre')).fault, 'centre');
  assert.ok(L.lineDeg(L.runProc(without('centre')).dir!, L.meanOf(L.PROC_CLOUD)) < L.lineDeg(ok.dir!, L.meanOf(L.PROC_CLOUD)), 'without centring it swings toward the mean');
  assert.equal(L.runProc(without('sort')).fault, 'sort');
  assert.equal(L.runProc(without('keep')).fault, 'keep');
  assert.equal(L.runProc(without('project')).fault, 'project');
  assert.equal(L.runProc(without('cov')).fault, 'stuck');
  assert.equal(L.runProc(['cov', 'centre', 'eig', 'sort', 'keep', 'project']).fault, 'centre');
  assert.equal(L.runProc(['centre', 'cov', 'eig', 'keep', 'sort', 'project']).fault, 'order');
  assert.equal(L.runProc([...L.PROC_REF, 'cols']).fault, 'cols');
  assert.equal(L.runProc([...L.PROC_REF, 'vert']).fault, 'vert');
  assert.ok(L.PROC_KEYS.every((k) => L.PROC_REF.includes(k)));
});

test('Doubts: a tilted cloud breaks “keep the biggest columns” and “PCA is least squares”; centring always matters', () => {
  const tilted = L.cloudWith(60, [0, 0], [[2, 1.5], [1.5, 2]], 3);
  assert.ok(!L.colsHolds(tilted) && L.colsHolds(L.cloudWith(60, [0, 0], [[3, 0], [0, 1]], 4)));
  assert.ok(!L.lsqLikePcaHolds(L.cloudWith(60, [0, 0], [[1, 0.6], [0.6, 1]], 5)));
  for (const [m, C] of [[[4, 1], [[2, -1], [-1, 1]]], [[-3, 2], [[1, 0.3], [0.3, 0.5]]], [[0.5, 5], [[3, 0], [0, 0.2]]]] as [number[], number[][]][]) assert.ok(L.swingHolds(L.cloudWith(50, m, C, 9)));
});

test('Act IX Review: a tiny determinant has an inverse; flips keep σ ≥ 0; κ bounds the error growth; symmetric positive: σ = λ (the Collapse pulse)', () => {
  assert.ok(!L.tinyDetHolds([[1, 1], [1, 1.004]]) && L.tinyDetHolds([[1, 1], [1, 1]]) && L.tinyDetHolds([[2, 0], [0, 1]]));
  assert.ok(!L.negSvHolds([[0, 1], [1, 0]]) && L.negSvHolds([[2, 1], [0, 1]]));
  const A = [[1, 1], [1, 1.1]];
  const d = svdCanon(A);
  close(L.condRatio(A, d.us[0], d.us[1].map((x) => x * 0.01)), d.S[0] / d.S[1], 1e-6);
  for (const [M, b, e] of [[[[2, 1], [1, 1.2]], [2, 1], [0.3, -0.4]], [[[3, 0], [0, 0.5]], [2, 0], [0, 0.1]], [[[0, 2], [-1, 1]], [1, 3], [0.2, 0.2]]] as [number[][], number[], number[]][]) assert.ok(L.condHolds(M, b, e));
  assert.ok(L.symSvHolds(COLLAPSE) && L.symSvHolds([[3, 1], [1, 3]]));
  assert.ok(veq(svdCanon(COLLAPSE).S, symEig(COLLAPSE).values, 1e-9));
  void norm;
});

test('Law: the covariance matrix and its largest eigenvalue survive 500 clouds; each near-miss breaks', () => {
  assert.deepEqual(checkLaw(L.LAW_CORE, L.LAW_ANSWER), { survived: true });
  for (const f of [{ matrix: 'raw', which: 'largest' }, { matrix: 'cov', which: 'smallest' }, { matrix: 'raw', which: 'smallest' }]) assert.equal(checkLaw(L.LAW_CORE, f).survived, false, JSON.stringify(f));
});

test('builds: covariance and pca pass their tests and a swarm in CPython; each decoy fails a test', () => {
  checkBuild(buildCovariance, BASE_LIB, 90);
  checkBuild(buildPca, `${ACT9_LIB}\n${COVARIANCE}`, 60);
});
