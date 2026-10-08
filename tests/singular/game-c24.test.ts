// Chapter 24: the story numbers, every puzzle's win check (reference wins, misconceptions do not), the
// Doubts (canonical construction right, the curated case breaks the false claims), the Law (the target
// survives 500 cases, each near-miss breaks) and the two builds (references pass their tests and a swarm in
// CPython; each decoy fails).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../site/src/singular/content/chapters/c24-spectral/logic.ts';
import { S } from '../../site/src/singular/content/chapters/c24-spectral/script.ts';
import { QUAD_FORM, buildQuadForm, buildSymEigen } from '../../site/src/singular/content/chapters/c24-spectral/build.ts';
import { checkLaw, rng } from '../../site/src/singular/game/lawcheck.ts';
import { dot, eig2, matMul, matVec, meq, normalize, transpose, veq } from '../../site/src/singular/math/la.ts';
import { C as COLLAPSE, INERTIA, V } from '../../site/src/singular/content/truth.ts';
import { BASE_LIB, checkBuild } from './game-c24-lib.test.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const said = (ls: unknown[]) => (ls as ({ text: string } | [string, string])[]).map((l) => (Array.isArray(l) ? l[1] : l.text)).join(' ');

test('p1 [D]: the symmetric panel’s lines (1, 1) × 4 and (1, −1) × 2 are perpendicular; Chapter 18’s are 72° apart', () => {
  for (const { dir, value } of L.P1_LINES) assert.ok(veq(matVec(L.P1_S, dir), dir.map((x) => x * value)));
  close(dot(L.P1_LINES[0].dir, L.P1_LINES[1].dir), 0);
  for (const d of L.P1_NONSYM_LINES) { const y = matVec(L.P1_NONSYM, d); close(y[0] * d[1] - y[1] * d[0], 0); }
  close(L.P1_NONSYM_ANGLE, 71.565, 1e-3);
  // the shake: random symmetric matrices always give perpendicular lines
  const r = rng(24);
  for (let i = 0; i < 200; i++) close(L.eigenAngle(L.randSym2(r))!, 90, 1e-6);
  assert.equal(L.P1_ORDER.join(), 'a,b,c,d');
  // the navigator's numbers: (Sa)·b = a·(Sb) = 22 for the symmetric panel; 30 and 25 for Chapter 18's matrix
  const a = [2, 1], b = [1, 3];
  assert.ok(veq(matVec(L.P1_S, a), [7, 5]));
  close(dot(matVec(L.P1_S, a), b), 22); close(dot(a, matVec(L.P1_S, b)), 22);
  close(dot(matVec(L.P1_NONSYM, a), b), 30); close(dot(a, matVec(L.P1_NONSYM, b)), 25);
  assert.ok(said(S.p1Win).includes('(1, 1)') && said(S.p1Win).includes('(1, −1)'));
});

test('p2: the mixed term of 2x² + 2xy + 2y² vanishes at 45° (3u² + v²), not at 30°', () => {
  const f = L.formIn(L.P2_S, L.rad(45));
  close(f.a, 3); close(f.b, 0); close(f.c, 1);
  assert.ok(Math.abs(L.formIn(L.P2_S, L.rad(30)).b) > 0.9);
  assert.ok(L.p2Won(45, 0.5) && L.p2Won(135, 0.5) && L.p2Won(45.4, 0.5));
  assert.ok(!L.p2Won(30, 2.5) && !L.p2Won(47, 1));
  // the win and the readout's green 0 are one test: on 1° and 0.5° slider steps only 45° (or 135°) wins
  assert.ok(L.p2Zero(45) && L.p2Zero(135));
  for (const t of [44, 46, 44.5, 45.5, 40, 50]) assert.ok(!L.p2Zero(t), `no win at ${t}°`);
  // the form's matrix splits the cross term in half
  assert.ok(meq(L.P2_S, [[2, 1], [1, 2]]));
});

test('p3: positive entries, a saddle (the probe escapes along (1, −1)); 3x² + 4xy + 3y² is a bowl (the probe rests)', () => {
  assert.equal(L.shapeOf(L.P3_SADDLE), 'saddle');
  assert.deepEqual(L.symEig(L.P3_SADDLE).values.map((x) => Math.round(x)), [3, -1]);
  assert.equal(L.shapeOf(L.P3_BOWL), 'bowl');
  assert.deepEqual(L.symEig(L.P3_BOWL).values.map((x) => Math.round(x)), [5, 1]);
  assert.ok(meq(L.P3_BOWL, [[L.P3_FORM.x2, L.P3_FORM.xy / 2], [L.P3_FORM.xy / 2, L.P3_FORM.y2]]));
  for (const x0 of [[0.6, 0.2], [-1.2, 0.4], [0.3, -0.9], [1.5, 1.2]]) assert.ok(L.p3EscapeWon(L.roll(L.P3_SADDLE, x0)), `escape from ${x0}`);
  assert.ok(!L.p3EscapeWon(L.roll(L.P3_SADDLE, [0.8, 0.8])), 'on the (1, 1) line it balances');
  assert.ok(L.p3SettleWon(L.roll(L.P3_BOWL, [1.4, -0.9])));
  assert.ok(!L.p3SettleWon(L.roll(L.P3_SADDLE, [0.6, 0.2])));
});

test('p4 [H]: S = 4 along (1, 1, 1), 1 on x + y + z = 0; Q D Qᵀ = S; Σ λ qqᵀ = S; the typed steps', () => {
  assert.ok(meq(matMul(matMul(L.P4_Q, L.P4_D), transpose(L.P4_Q)), L.P4_S, 1e-12));
  assert.ok(meq(matMul(transpose(L.P4_Q), L.P4_Q), [[1, 0, 0], [0, 1, 0], [0, 0, 1]], 1e-12));
  const qs = [0, 1, 2].map((j) => L.P4_Q.map((r) => r[j]));
  assert.ok(meq(L.spectralSum(L.P4_VALUES, qs), L.P4_S, 1e-12));
  assert.deepEqual(L.symEig(L.P4_S).values.map((x) => Math.round(x * 1e9) / 1e9), L.P4_VALUES);
  // Gram–Schmidt inside the plane
  const u = [1, -1, 0], s0 = L.P4_START;
  close(dot(s0, u) / dot(u, u), L.P4_SHADOW_C);
  assert.ok(veq(s0.map((x, i) => x - L.P4_SHADOW_C * u[i]), L.P4_LEFTOVER));
  assert.ok(veq(normalize(L.P4_LEFTOVER), normalize([1, 1, -2])));
  close(L.P4_ENTRY12, 1, 1e-12);
});

test('p5: on the unit circle the largest value is 3 at (1, 1)/√2, the smallest 1 at (1, −1)/√2', () => {
  close(L.circleValue(L.P5_S, Math.PI / 4), 3); close(L.circleValue(L.P5_S, -Math.PI / 4), 1);
  for (let k = 0; k < 360; k++) { const v = L.circleValue(L.P5_S, L.rad(k)); assert.ok(v <= 3 + 1e-9 && v >= 1 - 1e-9); }
  assert.ok(L.p5Won([L.rad(45), L.rad(135)], 1));
  assert.ok(L.p5Won([L.rad(225), L.rad(-45)], 1));
  assert.ok(!L.p5Won([L.rad(45)], 1), 'both are needed');
  assert.ok(!L.p5Won([L.rad(45), L.rad(90)], 1));
});

test('p6: the Lantern holds about the largest and smallest axes; the middle one flips; a non-principal axis wobbles', () => {
  assert.deepEqual(L.AXES.map((a) => Math.round(a.I)), [2, 6, 9]);
  assert.ok(veq(L.AXES[0].dir, normalize([1, 1, 0]), 1e-9) && veq(L.AXES[1].dir, normalize([1, -1, 0]), 1e-9) && veq(L.AXES[2].dir, [0, 0, 1], 1e-9));
  for (const a of L.AXES) assert.ok(veq(matVec(INERTIA, a.dir), a.dir.map((x) => x * a.I), 1e-9));
  assert.ok(L.flipWon([0, 0, 1]), 'the deck axis holds');
  assert.ok(L.flipWon([1, 1, 0]), 'the long axis holds');
  const mid = L.spin([1, -1, 0], { every: 60 });
  assert.ok(!mid.held && mid.flipAt !== null && mid.flipAt > 30 && mid.flipAt < 400, `the Flip at ${mid.flipAt}`);
  assert.ok(mid.maxDrift > 170, 'end over end');
  assert.ok(!L.flipWon([1, 0, 0]), 'not a principal axis');
  // only (close to) the largest or smallest axis holds: off-axis inputs that drift 5–9° do not count as held
  for (const a of [[1, 1, 0.1], [1.1, 1, 0], [1, 0.9, 0], [0.05, 0, 1]]) assert.ok(!L.flipWon(a), `${a} is not a principal axis`);
  for (const a of [[0, 0, 1], [1, 1, 0]]) assert.ok(L.spin(a, { every: 60 }).maxDrift < 1, `${a} drifts under 1°`);
  assert.ok(!said(S.p6Win).includes('one degree'), 'the win line claims no drift the simulation does not guarantee');
  assert.ok(!L.flipWon([0, 0, 0]));
});

test('p7 [S]: an upside-down bowl, a trough, and the block’s lowest value 1 on the sphere', () => {
  assert.ok(L.p7CapWon([[-2, 0], [0, -1]]) && !L.p7CapWon([[-2, 0], [0, 1]]));
  assert.ok(L.p7TroughWon([[1, 1], [1, 1]]) && !L.p7TroughWon([[1, 0], [0, 1]]) && !L.p7TroughWon([[-1, 1], [1, -1]]));
  assert.ok(L.p7SphereWon([1, -1, 0]) && L.p7SphereWon([2, -1, -1]));
  assert.ok(!L.p7SphereWon([1, 1, 1]) && !L.p7SphereWon([1, 0, 0]));
});

test('Doubts: positive entries can make a saddle; a turn has no real eigenvalue; xᵀSx never beats λmax on the circle', () => {
  assert.ok(!L.posBowlHolds([[1, 2], [2, 1]]) && !L.posBowlHolds([[1, 3], [3, 2]]), 'the curated cases break it');
  assert.ok(L.posBowlHolds([[2, 1], [1, 2]]));
  assert.ok(!L.realEigHolds([[0, -1], [1, 0]]) && !L.realEigHolds([[1, -2], [1, -1]]));
  assert.ok(L.realEigHolds([[2, 1], [1, 2]]));
  const r = rng(7);
  for (let i = 0; i < 500; i++) {
    const S0 = L.randSym2(r);
    const t = r() * Math.PI * 2;
    assert.ok(L.circleMaxHolds(S0, [Math.cos(t), Math.sin(t)]));
    assert.equal(eig2(S0).kind, 'real', 'symmetric matrices have real eigenvalues');
  }
  assert.ok(L.circleMaxHolds([[2, 1], [1, 2]], [1, 1]), 'equality at the eigenvector');
});

test('Law: symmetric, different eigenvalues, perpendicular survives 500 cases; each near-miss breaks', () => {
  assert.deepEqual(checkLaw(L.LAW_CORE, L.LAW_ANSWER), { survived: true });
  for (const f of [
    { which: 'any', pairs: 'diff', rel: 'perp' },
    { which: 'real', pairs: 'diff', rel: 'perp' },
    { which: 'sym', pairs: 'any', rel: 'perp' },
    { which: 'sym', pairs: 'diff', rel: 'par' },
  ]) assert.equal(checkLaw(L.LAW_CORE, f).survived, false, JSON.stringify(f));
});

test('the brace planner: the stern’s stress matrix is the Collapse pulse; braces along (1, 1, 2), (1, −1, 0), (1, 1, −1); Vell’s lines', () => {
  assert.ok(L.isSym(COLLAPSE) && meq(L.STRESS, COLLAPSE));
  assert.ok(L.braceOk(L.BRACE_DIRS));
  assert.ok(!L.braceOk([[1, 0, 0], [0, 1, 0], [0, 0, 1]]));
  close(L.BRACES.values[0], 3.00267, 1e-5); close(L.BRACES.values[1], 1, 1e-9); close(L.BRACES.values[2], 1 / 750, 1e-9);
  assert.equal(L.fmtD(L.BRACES.values[2], 2), '0.00', 'zero, to two decimal places');
  assert.ok(L.VELL_SYM && L.VELL_PERP);
  for (const d of L.VELL_LINES) { const y = matVec(V, d); close(y[0] * d[1] - y[1] * d[0], 0); }
  assert.ok(said(S.bracesOut).includes('0.00'));
});

test('builds: quad_form and sym_eigen pass their tests and a swarm in CPython; each decoy fails a test', () => {
  checkBuild(buildQuadForm);
  checkBuild(buildSymEigen, `${BASE_LIB}\n${QUAD_FORM}`, 90);
  // sym_eigen's canonical form: values high → low, first non-zero entry positive
  const [vals, vecs] = L.crewSymEigen([[1, 2], [2, 1]]);
  assert.deepEqual(vals.map((x) => Math.round(x)), [3, -1]);
  assert.ok(vecs.every((v) => v.find((x) => Math.abs(x) > 1e-9)! > 0));
});
