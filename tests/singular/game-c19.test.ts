// Chapter 19: the story numbers, every puzzle's win check (reference wins, misconceptions do not), the
// Doubts (canonical construction right, the Shake finds the breaking case), the Law (the target survives
// 500 cases, each near-miss breaks), Teo's message T3 (the reference lands, each missing key step fails as
// listed) and the two builds (references pass their tests and a swarm in CPython; each decoy fails).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as L from '../../site/src/singular/content/chapters/c19-powers/logic.ts';
import { S } from '../../site/src/singular/content/chapters/c19-powers/script.ts';
import { DIAG2, DIAG2_TESTS, MAT_POW, MAT_POW_TESTS, buildDiag2, buildMatPow } from '../../site/src/singular/content/chapters/c19-powers/build.ts';
import { checkLaw, rng, rint } from '../../site/src/singular/game/lawcheck.ts';
import { det, identity, inverse, matMul, matVec, meq, mpow, veq, type Mat } from '../../site/src/singular/math/la.ts';
import { V } from '../../site/src/singular/content/truth.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const said = (ls: unknown[]) => (ls as ({ text: string } | [string, string])[]).map((l) => (Array.isArray(l) ? l[1] : l.text)).join(' ');

test('p1: (3, 1) = 2(1, 1) + 1(1, −1) lands on (2, 2) after fifty pulses; the Anchor and “stays” do not win', () => {
  assert.ok(veq(matVec(L.V2, [1, 1]), [1, 1]) && veq(matVec(L.V2, [1, -1]), [0.5, -0.5]));
  assert.ok(veq(L.forecast2(L.P1_START, 50), L.P1_FORECAST, 1e-12));
  assert.ok(veq(matVec(mpow(L.V2, 50), L.P1_START), L.P1_FORECAST, 1e-12));
  assert.ok(veq(L.forecast2(L.P1_START, 5), matVec(mpow(L.V2, 5), L.P1_START), 1e-12));
  assert.ok(L.p1Won([2, 2], 50));
  assert.ok(!L.p1Won([2, 2], 10), 'the forecast counts after fifty pulses');
  assert.ok(!L.p1Won([0, 0], 50), 'everything at the Anchor');
  assert.ok(!L.p1Won([3, 1], 50), 'it stays');
  assert.ok(L.p1Won([2.02, 1.98], 50, 0.05) && !L.p1Won([2.02, 1.98], 50, 0.01));
  assert.ok(said(S.p1Win).includes('(2, 2)'));
});

test('p2 [D]: fifty copies of P D P⁻¹ cancel to P D⁵⁰ P⁻¹ ≈ [[0.5, 0.5], [0.5, 0.5]]', () => {
  assert.ok(meq(matMul(matMul(L.P2_P, L.P2_D), L.P2_PINV), L.V2, 1e-12));
  for (const k of [1, 2, 3, 5]) {
    const fs = L.repeatFactors(k);
    assert.deepEqual(L.cancelPairs(fs), L.cancelledForm(k));
    assert.ok(meq(L.factorValue(fs), mpow(L.V2, k), 1e-12));
    assert.ok(meq(L.factorValue(L.cancelPairs(fs)), mpow(L.V2, k), 1e-12));
  }
  assert.ok(meq(L.P2_V50, mpow(L.V2, 50), 1e-12));
  assert.ok(meq(L.P2_V50, [[0.5, 0.5], [0.5, 0.5]], 1e-6));
  assert.equal(L.P2_ORDER.join(), 'a,b,c,d');
});

test('p3 [H]: P, D, P⁻¹ for [[3, 1], [0, 2]]; A¹⁰(1, 1) = (117074, 1024); the 3 × 3’s D⁴ = diag(16, 625, 625)', () => {
  assert.ok(meq(matMul(matMul(L.P3_P, L.P3_D), L.P3_PINV), L.P3_A, 1e-12));
  assert.ok(veq(L.P3_C, [2, -1]));
  assert.ok(veq(L.P3_RESULT, [117074, 1024]));
  assert.ok(veq(matVec(mpow(L.P3_A, 10), [1, 1]), L.P3_RESULT));
  assert.ok(meq(L.P3_SUB_D4, L.P3_SUB_VALUES.map((v, i) => [0, 1, 2].map((j) => (i === j ? v ** 4 : 0)))));
  assert.deepEqual([...L.P3_SUB_VALUES].sort(), [...L.P3_SUB_CHECK].sort());
  assert.ok(said(S.p3Win).includes('(117074, 1024)'));
});

test('p4: the shear’s P from its lines is rejected (det 0); a turned column is not a line that holds', () => {
  assert.ok(L.p4Rejected([1, 0], [2, 0]));
  assert.ok(!L.p4Rejected([1, 0], [0, 1]), '(0, 1) is turned by the shear');
  assert.ok(!L.p4Rejected([0, 0], [1, 0]), 'the zero arrow is not a line that holds');
  assert.ok(!L.shearKeeps([1, 1]) && L.shearKeeps([-2, 0]));
  assert.equal(L.diagonalisable2(L.P4_SHEAR), false);
  assert.equal(L.crewDiag(L.P4_SHEAR), null);
});

test('p5: two sites settle at (2/3, 1/3); the gap shrinks by 0.7 a step', () => {
  assert.ok(veq(matVec(L.P5_M, L.P5_LONG), L.P5_LONG, 1e-12));
  for (let k = 1; k < 8; k++) close(L.gap(k) / L.gap(k - 1), L.P5_RATIO, 1e-9);
  assert.ok(veq(L.step2(L.P5_START, 80), L.P5_LONG, 1e-9));
  assert.ok(L.p5Won(2 / 3, 3, 0.7));
  assert.ok(!L.p5Won(1, 3, 0.7), 'everyone stays at A');
  assert.ok(!L.p5Won(0.5, 3, 0.7), 'half and half');
  assert.ok(!L.p5Won(2 / 3, 2, 0.7), 'three steps at least');
  assert.ok(!L.p5Won(2 / 3, 3, 0.9), 'the stretch of the other site, not the gap');
});

test('p6 [S]: repeated squaring reaches M⁵⁰ in 7 products (par 10); F₅₀ = 12,586,269,025; ratio → 1.618', () => {
  const s = L.fibPlan(50).reduce((st, op) => L.fibOp(st, op), L.FIB_START);
  assert.ok(L.fibWon(s));
  assert.equal(s.products, 7);
  assert.ok(s.products <= L.FIB_PAR);
  assert.equal(L.fib(50), 12586269025n);
  assert.equal(L.F50, Number(L.fib(50)));
  assert.ok(meq(L.fibPow(10), mpow(L.FIB, 10)) && meq(L.fibPow(0), identity(2)));
  const R = L.fibPow(50);
  assert.equal(R[0][1], L.F50);
  close(R[0][0] / R[0][1], L.PHI, 1e-12);
  // the slow way: fifty single steps cost 49 products
  let t = L.FIB_START; for (let i = 0; i < 50; i++) t = L.fibOp(t, 'once');
  assert.ok(L.fibWon(t) && t.products === 49);
  assert.equal(L.powProducts(50), 9);
  // the WHY card: A^1000000 takes 27 products in mat_pow (25 at best on the bench), not "about 40"
  assert.equal(L.powProducts(1_000_000), 27);
  assert.equal(L.fibPlan(1_000_000).reduce((st, op) => L.fibOp(st, op), L.FIB_START).products, 25);
  // Ilse's note: one squaring per binary digit plus one product per 1, at most 2(⌊log₂ k⌋ + 1)
  for (let k = 1; k <= 4096; k++) assert.ok(L.powProducts(k) <= 2 * (Math.floor(Math.log2(k)) + 1), String(k));
  // Show me replays the plan from R = I, B = M: from a state already pressed it would overshoot 50
  let dirty = L.fibOp(L.fibOp(L.FIB_START, 'square'), 'take');
  for (const op of L.fibPlan(50)) { const n = L.fibOp(dirty, op); if (n.r <= 50 && n.b <= 64) dirty = n; }
  assert.ok(!L.fibWon(dirty), 'the plan needs a fresh start');
});

test('Doubts: all at the Anchor (F), diagonalisable means invertible (F), two different eigenvalues (T)', () => {
  assert.equal(L.allAtAnchorHolds([3, 1]), false);
  assert.equal(L.allAtAnchorHolds([2, -2]), true, 'on the shrinking line: agrees with the claim');
  const r = rng(19);
  let broke = 0;
  for (let i = 0; i < 20; i++) if (!L.allAtAnchorHolds([rint(r, -3, 3), rint(r, -3, 3)])) broke++;
  assert.ok(broke > 5);
  assert.equal(L.diagInvHolds([[0, 0], [0, 1]]), false);
  assert.equal(L.diagInvHolds([[1, 2], [2, 4]]), false);
  assert.equal(L.diagInvHolds([[1, 1], [0, 1]]), true, 'the shear: invertible and not diagonalisable');
  for (let i = 0; i < 400; i++) assert.ok(L.distinctDiagHolds([[rint(r, -4, 4), rint(r, -4, 4)], [rint(r, -4, 4), rint(r, -4, 4)]]));
  for (const M of [[[1, 1], [0, 1]], [[0, -1], [1, 0]], [[2, 1], [0, 3]], [[1, 2], [2, 4]]] as Mat[]) assert.ok(L.distinctDiagHolds(M));
  // the quarter turn has two different eigenvalues ±i but no real grid: the claim is about real eigenvalues
  assert.equal(L.diagonalisable2([[0, -1], [1, 0]]), false);
  assert.ok(L.distinctDiagHolds([[0, -1], [1, 0]]), 'complex eigenvalues: the claim says nothing, so the case agrees');
});

test('Law: “(PMP⁻¹)ᵏ = PMᵏP⁻¹ for every M, because each P⁻¹P cancels” survives; every near-miss breaks', () => {
  assert.equal(checkLaw(L.LAW_CORE, L.LAW_CORE.answer).survived, true);
  for (const f of L.LAW_NEAR_MISSES) assert.equal(checkLaw(L.LAW_CORE, f).survived, false, JSON.stringify(f));
  // the "powers of P cancel" counterexample shows the side that breaks; agreeing cases stay short
  const pw = checkLaw(L.LAW_CORE, { scope: 'every', why: 'powers' });
  assert.ok(pw.counterexample?.includes('but P^3 M^3 P^−3 = (−311, 507; −192, 313)'), pw.counterexample);
  assert.ok(!L.LAW_CORE.describe({ P: [[1, 0], [0, 1]], M: [[1, 2], [3, 4]], k: 2 }).includes('but'));
});

test('Teo T3: whole rows, column by column, bottom up gives (1, 2, 3); each missing key step fails as listed', () => {
  for (const row of L.TEO_AUG) close(row[0] * L.TEO_X[0] + row[1] * L.TEO_X[1] + row[2] * L.TEO_X[2], row[3]);
  const ok = L.runTeo(L.TEO_REF);
  assert.ok(ok.ok && veq(ok.x!, L.TEO_X, 1e-12));
  // K1 missing (or after the clearing): the right side is left alone and the valves come out wrong
  assert.equal(L.runTeo(L.TEO_REF.filter((x) => x !== 'whole')).fault, 'rhs');
  assert.equal(L.runTeo(['cols', 'whole', 'back', 'check']).fault, 'rhs');
  // K2 missing: he cannot read anything off a row with three unknowns
  assert.equal(L.runTeo(L.TEO_REF.filter((x) => x !== 'cols')).fault, 'stuck');
  // K3 missing: no place to start reading
  assert.equal(L.runTeo(L.TEO_REF.filter((x) => x !== 'back')).fault, 'noread');
  // the check is good practice but not a key step
  assert.ok(L.runTeo(L.TEO_REF.filter((x) => x !== 'check')).ok);
  // the decoys are the misconceptions
  assert.equal(L.runTeo(['left', 'cols', 'back']).fault, 'rhs');
  assert.equal(L.runTeo(['whole', 'cols', 'top']).fault, 'top');
  assert.ok(L.TEO_KEYS.every((k) => L.TEO_REF.includes(k)));
});

test('Vell’s forecast (TT13): V⁵⁰ sends every point onto (1, 1, 1); the cutter (4, 2, 0) to (2, 2, 2)', () => {
  assert.ok(L.forecastOk(mpow(V, 50)));
  assert.ok(veq(matVec(L.V50, [4, 2, 0]), [2, 2, 2], 1e-9));
  const r = rng(7);
  for (let i = 0; i < 20; i++) { const y = matVec(L.V50, [rint(r, -5, 5), rint(r, -5, 5), rint(r, -5, 5)]); assert.ok(Math.abs(y[0] - y[1]) < 1e-9 && Math.abs(y[1] - y[2]) < 1e-9); }
  close(Math.log10(det(V) ** 50), -50, 1e-9);
});

// ------------------------------------------------------------------ builds in CPython

const LIB = `
def add(v, w):
    return [a + b for a, b in zip(v, w)]
def scale(c, v):
    return [c * x for x in v]
def lincomb(cs, vs):
    total = scale(0, vs[0])
    for c, v in zip(cs, vs):
        total = add(total, scale(c, v))
    return total
def matvec(A, x):
    columns = [[row[j] for row in A] for j in range(len(x))]
    return lincomb(x, columns)
def matmul(A, B):
    columns = [matvec(A, [row[j] for row in B]) for j in range(len(B[0]))]
    return [[c[i] for c in columns] for i in range(len(A))]
def identity(n):
    return [[1 if i == j else 0 for j in range(n)] for i in range(n)]
def eig2(A):
    (a, b), (c, d) = A
    tr = a + d
    det = a * d - b * c
    disc = tr * tr - 4 * det
    if disc >= 0:
        root = math.sqrt(disc)
        return {'kind': 'real', 'values': [(tr + root) / 2, (tr - root) / 2]}
    stretch = math.sqrt(det)
    angle = math.degrees(math.atan2(math.sqrt(-disc) / 2, tr / 2))
    return {'kind': 'complex', 'stretch': stretch, 'angle': angle}
`;

function runPy(fn: string, code: string, cases: { args: unknown[]; expect: unknown }[]): boolean[] {
  const prog = `import json, math\n${LIB}\n${code}\ndef close(a, b):\n    if a is None or b is None:\n        return a is None and b is None\n    if isinstance(a, (list, tuple)):\n        return isinstance(b, (list, tuple)) and len(a) == len(b) and all(close(x, y) for x, y in zip(a, b))\n    return abs(a - b) < 1e-6\nres = []\nfor a, e in json.loads(${JSON.stringify(JSON.stringify(cases.map((t) => [t.args, t.expect])))}):\n    try:\n        res.append(close(${fn}(*a), e))\n    except Exception:\n        res.append(False)\nprint(json.dumps(res))\n`;
  return JSON.parse(execFileSync('python3', ['-I', '-c', prog], { encoding: 'utf8', timeout: 60000 }));
}

const swarm = (gen: (r: () => number, d: string) => unknown[], crew: (...a: unknown[]) => unknown) => {
  const r = rng(191);
  return Array.from({ length: 150 }, (_, i) => { const args = gen(r, ['cadet', 'navigator', 'commander'][i % 3]); return { args, expect: crew(...args) ?? null }; });
};

test('builds: mat_pow and diagonalise2 pass their tests and a swarm; each decoy fails one', () => {
  for (const [b, src, tests] of [[buildMatPow, MAT_POW, MAT_POW_TESTS], [buildDiag2, DIAG2, DIAG2_TESTS]] as const) {
    assert.ok(runPy(b.fn, src, tests).every(Boolean), `${b.fn} tests`);
    const cases = swarm(b.swarm!.gen as (r: () => number, d: string) => unknown[], b.swarm!.crew);
    assert.ok(runPy(b.fn, src, cases).every(Boolean), `${b.fn} swarm`);
    const same = (a: unknown, e: unknown): boolean => (a === null || e === null ? a === e : Array.isArray(a) ? Array.isArray(e) && a.length === e.length && a.every((x, i) => same(x, e[i])) : Math.abs((a as number) - (e as number)) < 1e-9);
    for (const t of tests) assert.ok(same(b.swarm!.crew(...t.args), t.expect), `crew agrees: ${t.name}`);
    for (const decoy of b.assemble!.decoys ?? []) {
      const lines = b.assemble!.lines.slice();
      const key = (l: string) => `${l.match(/^ */)![0].length}:${l.trim().split(/[ =(]/)[0]}`;
      let at = -1;
      lines.forEach((l, i) => { if (i >= 2 && key(l) === key(decoy)) at = i; });
      assert.ok(at >= 0, `decoy has a line to replace: ${decoy}`);
      lines[at] = decoy;
      assert.ok(runPy(b.fn, `${lines.join('\n')}\n`, tests).some((x) => !x), `${b.fn} decoy: ${decoy}`);
    }
  }
  // the swarm has None cases (shears and turns) and diagonalisable ones
  const r = rng(3);
  const kinds = Array.from({ length: 80 }, () => L.crewDiag(L.diagCase(r, 'navigator')[0]) === null);
  assert.ok(kinds.some(Boolean) && kinds.some((x) => !x));
  // the crew's P and D rebuild A
  for (let i = 0; i < 200; i++) {
    const [A] = L.diagCase(r, 'commander');
    const d = L.crewDiag(A);
    if (d) assert.ok(meq(matMul(matMul(d[0], d[1]), inverse(d[0])!), A, 1e-9), JSON.stringify(A));
  }
});
