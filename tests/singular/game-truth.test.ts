// The story's numbers (GDD §2.7) match the maths.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as TT from '../../site/src/singular/content/truth.ts';
import { det, matMul, matVec, meq, mpow, identity, rank, nullspace, veq, eig2, eigSym, inverse, dist, dot, vsub, svd } from '../../site/src/singular/math/la.ts';

const close = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('TT3 routine pulse T = [[1, −2], [1, −1]]: det 1, T⁴ = I, eigenvalues ±i', () => {
  assert.ok(meq(TT.T, [[1, -2], [1, -1]]));
  close(det(TT.T), 1);
  assert.ok(meq(mpow(TT.T, 4), identity(2)));
  const e = eig2(TT.T);
  assert.equal(e.kind, 'complex');
  if (e.kind === 'complex') { close(e.re, 0); close(e.im, 1); }
  for (let k = 0; k <= 8; k++) close(det(TT.Tpartial((k / 8) * (Math.PI / 2))), 1);
  assert.ok(meq(TT.Tpartial(Math.PI / 2), TT.T));
});

test('Prologue buoys land where the GDD says', () => {
  const w = TT.PROLOGUE_WHITE.map((p) => matVec(TT.T, p));
  assert.deepEqual(w.map((p) => p.map((x) => Math.round(x))), [[-3, -2], [-4, -2], [-5, -2]]);
  const c = TT.PROLOGUE_CYAN.map((p) => matVec(TT.T, p));
  assert.deepEqual(c.map((p) => p.map((x) => Math.round(x))), [[2, 2], [3, 3], [4, 4], [5, 5]]);
});

test('TT5 / TT4: routine pulse now, volume factor 0.8 from the spires and from the pulse', () => {
  assert.ok(meq(TT.T3, [[1, -2, 0], [1, -1, 0], [0, 0, 0.8]]));
  close(det(TT.S_now), 0.8);
  close(det(TT.T3), 0.8);
  assert.ok(veq(matVec(TT.T3, [1, 0, 0]), [1, 1, 0]));
  assert.ok(veq(matVec(TT.S_now, [1, 0, 0]), [0, 1, 0]), 'spire forecast puts the bow at (0, 1, 0)');
});

test('TT6 what Ilse meant', () => {
  assert.ok(meq(TT.ILSE_MEANT.slice(0, 2).map((r) => r.slice(0, 2)), [[-1, -2], [1, 1]]));
  assert.ok(meq(matMul(matMul(TT.P, TT.ILSE_MEANT), inverse(TT.P)!), TT.R));
});

test('TT7–TT11: the Collapse pulse, two-decimal model, amplification and readings', () => {
  assert.equal(TT.DET_C.toFixed(2), '0.00');
  close(TT.SV_C[0], 3.00267, 1e-4);
  close(TT.SV_C[1], 1, 1e-6);
  close(TT.SV_C[2], 1 / 750, 1e-7);
  close(TT.AMPLIFY, 750, 1e-3);
  close(TT.CONDITION, 2252, 1);
  assert.equal(TT.READINGS, 625);
  assert.equal(rank(TT.C2), 2);
  assert.ok(veq(matVec(TT.C2, TT.C2_NULL), [0, 0, 0]));
  assert.ok(veq(matVec(TT.C2, [2, 0, 1]), [3, 1, 4]));
  assert.ok(veq(matVec(TT.C2, [3, 1, 0]), [3, 1, 4]));
  assert.equal(nullspace(TT.C2).length, 1);
});

test('TT13 Vell: eigenvalues 1, 0.5, 0.2; cutter (4, 2, 0) → (2, 2, 2) after 50; det 0.1', () => {
  const e = eigSym(TT.V);
  e.values.forEach((x, i) => close(x, [1, 0.5, 0.2][i]));
  assert.ok(veq(TT.VELL_AFTER_50, [2, 2, 2], 1e-6));
  close(det(TT.V), 0.1);
});

test('TT14 drones: steady state (150, 90, 60); first steps', () => {
  const s1 = matVec(TT.DRONES, TT.DRONES_START);
  assert.ok(veq(s1, [240, 30, 30]));
  assert.ok(veq(matVec(TT.DRONES, s1), [204, 51, 45]));
  assert.ok(veq(matVec(TT.DRONES, TT.DRONES_STEADY), TT.DRONES_STEADY));
});

test('TT16 hatch: closest point on z = x + y and distance under the tether', () => {
  const foot = TT.HATCH_FOOT;
  close(foot[2], foot[0] + foot[1]);
  const d = vsub(TT.HATCH, foot);
  close(dot(d, [1, 0, 1]), 0); close(dot(d, [0, 1, 1]), 0);
  close(dist(TT.HATCH, foot), 1.1547, 1e-4);
  assert.ok(dist(TT.HATCH, foot) < TT.TETHER);
});

test('TT18 record: k = 2 keeps 96.4% of the squared total', () => {
  const sq = TT.RECORD_SV.map((s) => s * s);
  const tot = sq.reduce((a, b) => a + b, 0);
  assert.equal(((sq[0] + sq[1]) / tot * 100).toFixed(1), '96.4');
  assert.equal(((sq[0] + sq[1] + sq[2]) / tot * 100).toFixed(1), '98.0');
});

test('TT19 inertia axes and TT21 spire readings at the Collapse', () => {
  const e = eigSym(TT.INERTIA);
  e.values.forEach((x, i) => close(x, [9, 6, 2][i]));
  close(det(TT.S_COLLAPSE), det(TT.C), 1e-9);
  const s = svd(TT.C);
  assert.equal(s.S.length, 3);
});
