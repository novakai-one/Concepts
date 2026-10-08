// The game's linear algebra library: every number the player sees comes from here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Frac, fmat, fnum, nice } from '../../site/src/singular/math/frac.ts';
import {
  angle, colspace, cross, cubicRealRoots, det, dot, eig2, eigSym, eigvals3, eigvals3Mult, eigvecFor, gramSchmidt, identity, inverse, leastSquares,
  lowRank, matMul, matVec, meq, norm, nullspace, pca, powerIteration, proj, qr, rank, solve, svd, transpose, triple,
  veq, fromCols, coordsIn,
} from '../../site/src/singular/math/la.ts';
import { applyOp, classify, fdet, finverse, gaussJordanSteps, isREF, isRREF, opLabel, rref } from '../../site/src/singular/math/rref.ts';

const close = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('fractions reduce and print', () => {
  assert.equal(new Frac(6, -8).toString(), '-3/4');
  assert.equal(new Frac(1, 3).add(new Frac(1, 6)).toString(), '1/2');
  assert.equal(Frac.from(0.75).toString(), '3/4');
  assert.equal(Frac.from(-2).toString(), '-2');
  assert.equal(nice(1 / 3), '1/3');
  assert.equal(nice(2.0000000001), '2');
  assert.equal(new Frac(0, -5).toString(), '0');
});

test('vectors: dot, cross, triple, angle, projection', () => {
  assert.equal(dot([1, 2, 3], [4, 5, 6]), 32);
  assert.deepEqual(cross([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
  assert.equal(triple([1, 0, 0], [0, 1, 0], [0, 0, 1]), 1);
  assert.equal(triple([1, 2, 3], [2, 4, 6], [0, 1, 5]), 0); // coplanar
  close(angle([1, 0], [0, 3]), Math.PI / 2);
  assert.ok(veq(proj([3, 4], [1, 0]), [3, 0]));
  close(norm([3, 4]), 5);
});

test('det, inverse, rank, null space, column space', () => {
  assert.equal(det([[3, 1], [1, 2]]), 5);
  assert.equal(det([[2, 4], [1, 2]]), 0);
  close(det([[2, 0, 1], [1, 3, 2], [1, 1, 1]]), 2 * (3 - 2) - 0 + 1 * (1 - 3));
  close(det([[1, 2, 3, 4], [0, 1, 2, 3], [0, 0, 1, 2], [0, 0, 0, 2]]), 2);
  const A = [[2, 1], [1, 1]];
  assert.ok(meq(matMul(A, inverse(A)!), identity(2)));
  assert.equal(inverse([[1, 2], [2, 4]]), null);
  assert.equal(rank([[1, 2, 3], [2, 4, 6], [1, 0, 1]]), 2);
  const N = nullspace([[1, 2, 3], [2, 4, 6]]);
  assert.equal(N.length, 2);
  for (const v of N) assert.ok(veq(matVec([[1, 2, 3], [2, 4, 6]], v), [0, 0]));
  assert.equal(colspace([[1, 2], [2, 4]]).length, 1);
});

test('solve classifies one / none / infinitely many', () => {
  const u = solve([[1, 1], [1, -1]], [3, 1]);
  assert.equal(u.kind, 'unique');
  if (u.kind === 'unique') assert.ok(veq(u.x, [2, 1]));
  assert.equal(solve([[1, 1], [2, 2]], [1, 3]).kind, 'none');
  const inf = solve([[1, 1], [2, 2]], [1, 2]);
  assert.equal(inf.kind, 'infinite');
});

test('exact row reduction: steps, REF, RREF, classification', () => {
  const aug = fmat([[2, 1, -1, 8], [-3, -1, 2, -11], [-2, 1, 2, -3]]);
  const { ops, states } = gaussJordanSteps(aug, 3);
  const last = states[states.length - 1];
  assert.ok(isRREF(last, 3));
  assert.deepEqual(fnum(last).map((r) => r[3]), [2, 3, -1]);
  // replaying the ops gives the same result
  let m = aug;
  for (const op of ops) m = applyOp(m, op);
  assert.deepEqual(fnum(m), fnum(last));
  const c = classify(aug, 3);
  assert.equal(c.kind, 'unique');
  assert.ok(isREF(fmat([[1, 2, 3], [0, 0, 1], [0, 0, 0]])));
  assert.ok(!isREF(fmat([[0, 1], [1, 0]])));
  assert.ok(!isRREF(fmat([[1, 2], [0, 2]])));
  const none = classify(fmat([[1, 1, 1], [2, 2, 3]]), 2);
  assert.equal(none.kind, 'none');
  const inf = classify(fmat([[1, 2, -1, 3], [2, 4, -2, 6]]), 3);
  assert.equal(inf.kind, 'infinite');
  if (inf.kind === 'infinite') assert.deepEqual(inf.free, [1, 2]);
  assert.equal(opLabel({ kind: 'add', i: 1, j: 0, k: new Frac(-3) }), 'R2 → R2 − 3·R1');
  assert.equal(fnum(rref(fmat([[0, 2], [3, 0]])))[0][0], 1);
});

test('exact det and inverse', () => {
  assert.equal(fdet(fmat([[2, 0, 1], [1, 3, 2], [1, 1, 2]])).toString(), '6');
  assert.equal(fdet(fmat([[2, 0, 1], [1, 3, 2], [1, 1, 1]])).toString(), '0');
  const inv = finverse(fmat([[2, 1], [1, 1]]));
  assert.deepEqual(fnum(inv!), [[1, -1], [-1, 2]]);
  assert.equal(finverse(fmat([[1, 2], [2, 4]])), null);
});

test('eigen: 2×2 real and complex, symmetric, 3×3, power iteration', () => {
  const e = eig2([[2, 1], [1, 2]]);
  assert.equal(e.kind, 'real');
  if (e.kind === 'real') {
    close(e.values[0], 3); close(e.values[1], 1);
    const v = e.vectors[0]!;
    assert.ok(veq(matVec([[2, 1], [1, 2]], v), v.map((x) => 3 * x)));
  }
  const r = eig2([[0, -1], [1, 0]]);
  assert.equal(r.kind, 'complex');
  const s = eigSym([[4, 1, 0], [1, 3, 0], [0, 0, 1]]);
  s.vectors.forEach((v, i) => assert.ok(veq(matVec([[4, 1, 0], [1, 3, 0], [0, 0, 1]], v), v.map((x) => s.values[i] * x), 1e-8)));
  const vals = eigvals3([[2, 0, 0], [0, 3, 4], [0, 4, 9]]);
  vals.forEach((x, i) => close(x, [11, 2, 1][i]));
  const ev = eigvecFor([[2, 0, 0], [0, 3, 4], [0, 4, 9]], 11)!;
  assert.ok(veq(matVec([[2, 0, 0], [0, 3, 4], [0, 4, 9]], ev), ev.map((x) => 11 * x), 1e-6));
  const p = powerIteration([[2, 1], [1, 2]], [1, 0]);
  close(p.value, 3);
});

test('orthogonality: Gram–Schmidt, QR, least squares', () => {
  const q = gramSchmidt([[1, 1, 0], [1, 0, 1], [0, 1, 1]]);
  assert.equal(q.length, 3);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) close(dot(q[i], q[j]), i === j ? 1 : 0);
  const A = [[1, 2], [3, 4], [5, 6]];
  const { Q, R } = qr(A);
  assert.ok(meq(matMul(Q, R), A));
  // best line y = c + m x through (0,1), (1,2), (2,2)
  const x = leastSquares([[1, 0], [1, 1], [1, 2]], [1, 2, 2])!;
  close(x[0], 7 / 6); close(x[1], 1 / 2);
});

test('SVD rebuilds the matrix; rank-1 approximation; PCA', () => {
  const A = [[3, 0], [4, 5]];
  const { U, S, V } = svd(A);
  const Sig = [[S[0], 0], [0, S[1]]];
  assert.ok(meq(matMul(matMul(U, Sig), transpose(V)), A, 1e-8));
  close(S[0] * S[1], Math.abs(det(A)));
  const B = [[1, 2], [2, 4], [3, 6]];
  assert.ok(meq(lowRank(B, 1), B, 1e-8));
  const pts = [[-2, -1], [0, 0], [2, 1], [4, 2]];
  const P = pca(pts);
  close(Math.abs(P.vectors[0][1] / P.vectors[0][0]), 0.5);
});

test('change of basis', () => {
  const B = fromCols([[1, 1], [-1, 1]]);
  const c = coordsIn(B, [0, 2])!;
  assert.ok(veq(c, [1, 1]));
});

test('rotation-aware interpolation never collapses a rotation', async () => {
  const { interpMat2, rot2, det: d, meq: eq } = await import('../../site/src/singular/math/la.ts');
  const R = rot2(Math.PI * 0.999);
  for (let k = 0; k <= 10; k++) {
    const M = interpMat2([[1, 0], [0, 1]], R, k / 10, 'auto');
    assert.ok(Math.abs(d(M) - 1) < 1e-9, `det stays 1 at t=${k / 10}`);
  }
  assert.ok(eq(interpMat2([[1, 0], [0, 1]], R, 1), R));
  const A = [[2, 1], [0, 1]];
  assert.ok(eq(interpMat2([[1, 0], [0, 1]], A, 0.5), [[1.5, 0.5], [0, 1]]), 'small turns stay linear');
  const B = [[0, -2], [1, 0]];
  assert.ok(eq(interpMat2([[1, 0], [0, 1]], B, 1, 'polar'), B));
});

test('eigvals3: repeated eigenvalues are found once each, with their multiplicity', () => {
  assert.deepEqual(eigvals3Mult([[2, 5, 1], [0, 2, 3], [0, 0, 2]]), [{ value: 2, mult: 3 }]);
  assert.deepEqual(eigvals3Mult([[2, 3, -1], [0, 4, 0], [0, 0, 4]]), [{ value: 4, mult: 2 }, { value: 2, mult: 1 }]);
  assert.deepEqual(eigvals3([[-3, -3, 1], [0, -4, 0], [0, 0, -4]]), [-3, -4]);
  assert.deepEqual(eigvals3([[0, -1, 0], [1, 0, 0], [0, 0, 2]]), [2]); // a quarter turn about z: one real line
  assert.deepEqual(cubicRealRoots(1, -6, 11, -6), [3, 2, 1]);
  assert.deepEqual(cubicRealRoots(1, 0, 0, 0), [0]);
  // triangular matrices: the eigenvalues are the diagonal (2000 seeded cases, many repeats)
  let seed = 11;
  const r = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let t = 0; t < 2000; t++) {
    const dg = [0, 1, 2].map(() => Math.round(r() * 10 - 5));
    const U = [[dg[0], Math.round(r() * 8 - 4), Math.round(r() * 8 - 4)], [0, dg[1], Math.round(r() * 8 - 4)], [0, 0, dg[2]]];
    assert.deepEqual(eigvals3(U), [...new Set(dg)].sort((x, y) => y - x));
    assert.equal(eigvals3Mult(U).reduce((s, m) => s + m.mult, 0), 3);
  }
});
