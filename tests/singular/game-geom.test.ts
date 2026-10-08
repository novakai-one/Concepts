// Pure maths behind the geometry/data kit (site/src/singular/kit/geom-math.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  arcFrame, arcPts, bestLine, bisector, blob2, eigenDirs2, ellipsePts, labelSpot, lineAngleDist, lineThrough, noisyLine,
  parallelSin, perpTo, planeSplit, principal, rayPlane, residuals, rightAnglePts, rng, shadowFoot, shadowLength,
  shadowsOnLine, spreadAlong, ssr, stretchAlong, svdPath, svdRot2, wrapAngle, len3, sub3, rad, markArc,
} from '../../site/src/singular/kit/geom-math.ts';
import { det, dot, matMul, matVec, meq, rot2 } from '../../site/src/singular/math/la.ts';

const close = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const closeV = (a: number[], b: number[], tol = 1e-6) => a.forEach((x, i) => close(x, b[i], tol));

test('angles wrap and line directions compare mod π', () => {
  close(wrapAngle(3 * Math.PI), Math.PI);
  close(wrapAngle(-Math.PI / 2 - 2 * Math.PI), -Math.PI / 2);
  close(lineAngleDist(0.1, Math.PI + 0.1), 0);
  close(lineAngleDist(0.05, Math.PI - 0.05), 0.1);
  close(lineAngleDist(0, Math.PI / 2), Math.PI / 2);
});

test('shadow of v on w: signed length and foot', () => {
  close(shadowLength([1, 2], [4, 3]), 2);            // (4 + 6) / 5
  close(shadowLength([-1, 0], [4, 3]), -0.8);
  closeV(shadowFoot([1, 2], [4, 3]), [1.6, 1.2, 0]);
  close(shadowLength([3, 1], [0, 0]), 0);              // no line to project on
  // the drop from v's tip to the foot is perpendicular to w
  const f = shadowFoot([2, 3, 1], [1, 1, 1]);
  close(dot(sub3([2, 3, 1], f), [1, 1, 1]), 0);
});

test('right-angle marker and arcs', () => {
  const pts = rightAnglePts([1, 1, 0], [2, 0, 0], [0, -3, 0], 0.5);
  closeV(pts[0], [1.5, 1, 0]); closeV(pts[1], [1.5, 0.5, 0]); closeV(pts[2], [1, 0.5, 0]);
  const { angle, e2 } = arcFrame([1, 0, 0], [0, 2, 0]);
  close(angle, Math.PI / 2); closeV(e2, [0, 1, 0]);
  const arc = arcPts([0, 0, 0], [1, 0, 0], [0, 1, 0], 2, 4);
  closeV(arc[0], [2, 0, 0]); closeV(arc[4], [0, 2, 0]);
  arc.forEach((p) => close(len3(p), 2));
  // opposite directions: still a half circle (in the plane for 2-D vectors)
  const half = arcPts([0, 0, 0], [1, 0, 0], [-1, 0, 0], 1, 2);
  closeV(half[1], [0, 1, 0]);
  closeV(bisector([1, 0, 0], [0, 1, 0]), [Math.SQRT1_2, Math.SQRT1_2, 0]);
  close(dot(perpTo([0, 0, 1]), [0, 0, 1]), 0);
});

test('label spot avoids arrow shafts', () => {
  // free space beyond the tip: keep it
  closeV(labelSpot([2, 0, 0], [1, 0, 0], [[[0, 0], [2, 0]]]), [2.42, 0, 0]);
  // another arrow continues past the tip along the same line: go to the side
  const s = labelSpot([1, 0, 0], [1, 0, 0], [[[0, 0], [1, 0]], [[0, 0], [3, 0]]]);
  assert.ok(Math.abs(s[1]) > 0.3, `label moved off the line (${s})`);
});

test('marking swept angle bins never skips a bin', () => {
  const full = (a0: number, d: number, n = 360) => { const b = new Uint8Array(n); markArc(b, a0, d); return b.reduce((s, x) => s + x, 0); };
  // a full turn from awkward starts, both ways, and exact 2π steps (rounding used to skip bins)
  for (const a0 of [0, 0.349, Math.PI / 9, -2.5, 100]) {
    assert.equal(full(a0, 2 * Math.PI), 360);
    assert.equal(full(a0, -2 * Math.PI), 360);
    assert.equal(full(a0, 4 * Math.PI, 97), 97);
  }
  // a quarter turn marks about a quarter of the bins, and reports a change only once
  const b = new Uint8Array(360);
  assert.equal(markArc(b, 0, Math.PI / 2), true);
  assert.ok(Math.abs(b.reduce((s, x) => s + x, 0) - 91) <= 1);
  assert.equal(markArc(b, 0.1, 0.5), false);
});

test('eigen-directions of 2×2 matrices', () => {
  const A = eigenDirs2([[1, 1], [0.5, 1.5]]);   // λ = 2 along (1, 1), λ = 0.5 along (2, −1)
  assert.equal(A.kind, 'lines');
  if (A.kind !== 'lines') return;
  assert.equal(A.angles.length, 2);
  const i2 = A.values.findIndex((v) => Math.abs(v - 2) < 1e-9);
  close(lineAngleDist(A.angles[i2], Math.PI / 4), 0);
  close(lineAngleDist(A.angles[1 - i2], Math.atan2(-1, 2)), 0);
  for (const t of A.angles) close(parallelSin([[1, 1], [0.5, 1.5]], t), 0);
  close(stretchAlong([[1, 1], [0.5, 1.5]], Math.PI / 4), 2);
  // rotation: complex, nothing stays on its line
  const R = eigenDirs2(rot2(0.7));
  assert.equal(R.kind, 'none');
  for (let t = 0; t < Math.PI; t += 0.1) assert.ok(Math.abs(parallelSin(rot2(0.7), t)) > 0.6);
  // shear: one line only
  const S = eigenDirs2([[1, 1], [0, 1]]);
  assert.ok(S.kind === 'lines' && S.angles.length === 1 && Math.abs(S.angles[0]) < 1e-9);
  // scalar matrix: every direction
  assert.equal(eigenDirs2([[2, 0], [0, 2]]).kind, 'all');
  // diagonal and singular matrices
  const D = eigenDirs2([[3, 0], [0, -1]]);
  assert.ok(D.kind === 'lines' && D.angles.length === 2);
  const Z = eigenDirs2([[1, 2], [2, 4]]);     // λ = 0 along (2, −1), λ = 5 along (1, 2)
  assert.ok(Z.kind === 'lines' && Z.values.some((v) => Math.abs(v) < 1e-9));
  // negative eigenvalue: reflection across the x-axis
  const F = eigenDirs2([[1, 0], [0, -1]]);
  assert.ok(F.kind === 'lines' && F.values.includes(-1));
});

test('SVD as rotate, stretch, rotate', () => {
  const cases = [[[1, 1], [0.5, 1.5]], [[2, 1], [1, 2]], [[0, -1], [1, 0]], [[1, 2], [3, -1]], [[1, 2], [2, 4]], [[3, 0], [0, 1]], [[-2, 0.5], [1, 1]]];
  for (const M of cases) {
    const d = svdRot2(M);
    // both rotations really are rotations and the product is M
    assert.ok(meq(svdPath(d, 3), M, 1e-6), `UΣVᵀ = M for ${JSON.stringify(M)}`);
    assert.ok(meq(svdPath(d, 0), [[1, 0], [0, 1]]));
    close(det(svdPath(d, 1)), 1);
    assert.ok(Math.abs(d.theta) <= Math.PI / 2 + 1e-9);
    assert.ok(d.sigma[0] >= d.sigma[1] - 1e-12);
    close(Math.sign(d.s[1]) * (d.sigma[1] > 1e-9 ? 1 : 0), Math.sign(det(M)) * (d.sigma[1] > 1e-9 ? 1 : 0));
    // M v1 = σ1 u1 and M v2 = σ2' u2 (σ2' signed)
    closeV(matVec(M, d.v1.slice(0, 2)), [d.s[0] * d.u1[0], d.s[0] * d.u1[1]]);
    closeV(matVec(M, d.v2.slice(0, 2)), [d.s[1] * d.u2[0], d.s[1] * d.u2[1]]);
    // after the first move, v1 lies on the x-axis
    closeV(matVec(svdPath(d, 1), d.v1.slice(0, 2)), [1, 0]);
  }
  // the ellipse is the circle moved by M
  const E = ellipsePts([[2, 0], [0, 1]], 1, 4);
  closeV(E[1], [0, 1, 0]); closeV(E[0], [2, 0, 0]);
  assert.ok(meq(matMul(rot2(0.3), rot2(-0.3)), [[1, 0], [0, 1]]));
});

test('least-squares line and residuals', () => {
  const pts = [[0, 1], [1, 3], [2, 5]];
  const L = bestLine(pts)!;
  close(L.m, 2); close(L.c, 1);
  close(ssr(pts, 2, 1), 0);
  assert.deepEqual(residuals([[0, 2], [1, 0]], 1, 0), [2, -1]);
  const noisy = noisyLine(20, { m: 0.5, c: -1, noise: 0.5, seed: 3 });
  const B = bestLine(noisy)!;
  // the best line beats nearby lines
  for (const [dm, dc] of [[0.05, 0], [-0.05, 0], [0, 0.1], [0, -0.1]]) assert.ok(ssr(noisy, B.m + dm, B.c + dc) > ssr(noisy, B.m, B.c));
  const T = lineThrough(1, 1, 3, 5);
  close(T.m, 2); close(T.c, -1);
});

test('projection onto a plane, and a ray meeting a plane', () => {
  const { p, r, n } = planeSplit([1, 2, 3], [1, 0, 0], [0, 1, 0]);
  closeV(p, [1, 2, 0]); closeV(r, [0, 0, 3]); closeV(n.map(Math.abs), [0, 0, 1]);
  const t = planeSplit([2, 1, 3], [1, 0, 1], [0, 1, 1]);
  close(dot(t.r, [1, 0, 1]), 0); close(dot(t.r, [0, 1, 1]), 0);
  closeV(rayPlane([0, 0, 10], [1, 1, 5], [0, 0, 1], 0)!, [2, 2, 0]);
  assert.equal(rayPlane([0, 0, 1], [1, 0, 1], [0, 0, 1]), null);
});

test('point clouds: spread along a direction is largest on the first principal direction', () => {
  const pts = blob2(400, { s1: 2, s2: 0.5, angle: rad(30), seed: 11 });
  const P = principal(pts);
  close(lineAngleDist(Math.atan2(P.vectors[0][1], P.vectors[0][0]), rad(30)), 0, 0.08);
  const best = spreadAlong(pts, P.mean, P.vectors[0]);
  close(best, P.values[0], 1e-6);
  for (let a = 0; a < Math.PI; a += 0.2) assert.ok(spreadAlong(pts, P.mean, [Math.cos(a), Math.sin(a)]) <= best + 1e-9);
  const sh = shadowsOnLine(pts, P.mean, P.vectors[0]);
  // every shadow is on the line through the mean
  for (const q of sh.slice(0, 20)) close(Math.abs(P.vectors[0][0] * (q[1] - P.mean[1]) - P.vectors[0][1] * (q[0] - P.mean[0])), 0);
  // seeded: same seed, same data
  assert.deepEqual(blob2(5, { seed: 2 }), blob2(5, { seed: 2 }));
  const r = rng(5); const a = r(), b = r();
  assert.ok(a >= 0 && a < 1 && b !== a);
});
