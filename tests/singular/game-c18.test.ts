// Chapter 18: the story numbers (from truth.ts), every puzzle's win check (reference wins, misconceptions
// do not), the Doubts (the canonical construction gives the right verdict and the Shake finds the breaking
// case), the Law (the target survives 500 cases, each near-miss breaks), the Procedure (the reference
// order succeeds; dropping each key step fails as listed) and the two builds (the references pass their
// tests and a swarm in CPython; each decoy fails).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as L from '../../site/src/singular/content/chapters/c18-eigen/logic.ts';
import { S } from '../../site/src/singular/content/chapters/c18-eigen/script.ts';
import { EIG2, EIG2_TESTS, POWER, POWER_TESTS, buildEig2, buildPower } from '../../site/src/singular/content/chapters/c18-eigen/build.ts';
import { checkLaw, rng, rint } from '../../site/src/singular/game/lawcheck.ts';
import { det, identity, matVec, meq, mpow, veq, type Mat } from '../../site/src/singular/math/la.ts';
import { C2, T, V, VELL_CUTTER } from '../../site/src/singular/content/truth.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const said = (ls: { text: string }[] | unknown[]) => (ls as ({ text: string } | [string, string])[]).map((l) => (Array.isArray(l) ? l[1] : l.text)).join(' ');

test('every line that holds is A v = λ v (p1, p3, p5, p6) and the story pulses agree with truth.ts', () => {
  for (const [M, lines] of [[L.P1_A, L.P1_LINES], [L.P3_A, L.P3_LINES], [L.P6_V, L.P6_LINES]] as [Mat, [number[], number][]][]) {
    for (const [v, l] of lines) assert.ok(veq(matVec(M, v), v.map((x) => x * l), 1e-12), `${M} ${v}`);
    assert.equal(L.eigenLines(M).length, lines.length);
  }
  L.P5_VECS.forEach((v, i) => assert.ok(veq(matVec(L.P5_A, v), v.map((x) => x * L.P5_VALUES[i]))));
  assert.equal(L.trace(L.P5_A), 2); close(det(L.P5_A), -50);
  close(L.P5_VALUES.reduce((a, b) => a + b, 0), L.trace(L.P5_A)); close(L.P5_VALUES.reduce((a, b) => a * b, 1), det(L.P5_A));
  assert.equal(L.P5_BLOCK_C, -25);
  assert.deepEqual(L.eigenLines(L.P5_TRI).map((x) => Math.round(x.value)).sort((a, b) => a - b), [...L.P5_TRI_VALUES].sort((a, b) => a - b));
  // the story's matrices
  assert.ok(meq(L.P4_T, T) && meq(L.P6_V, V));
  close(det(V), 0.1);
  assert.ok(veq(L.cutterAfter(50), [2, 2, 2], 1e-9));
  assert.ok(veq(VELL_CUTTER, [4, 2, 0]));
  // the line finder settles on (1, 1, 1)
  assert.ok(L.lineFinderOk(L.lineFinder()));
  // the spoken numbers are the computed ones
  assert.ok(said(S.p5Win).includes(`λ = ${L.fmtN(L.P5_VALUES[2])}`));
  assert.ok(said(S.close).includes('\\begin{bmatrix}4 \\\\ 2 \\\\ 0\\end{bmatrix}'));
});

test('p1: both lines with their stretches win; one line, a wrong stretch or a turned arrow do not', () => {
  const right: L.Lock[] = [{ dir: [1, 1], stretch: 3 }, { dir: [1, -1], stretch: 1 }];
  assert.ok(L.linesWon(L.P1_A, right, 2, 0.05));
  assert.ok(!L.linesWon(L.P1_A, right.slice(0, 1), 2, 0.05), 'one line only');
  assert.ok(!L.linesWon(L.P1_A, [{ dir: [1, 1], stretch: 1 }, { dir: [1, -1], stretch: 3 }], 2, 0.05), 'stretches swapped');
  assert.ok(!L.onLine(L.P1_A, [1, 0], 2), 'the first axis turns');
  close(L.turnDeg(L.P1_A, [1, 0]), (Math.atan2(1, 2) * 180) / Math.PI, 1e-9);
  assert.ok(L.onLine(L.P1_A, [Math.cos(Math.PI / 4 + 0.01), Math.sin(Math.PI / 4 + 0.01)], 2), 'within 2° of the diagonal counts');
});

test('p1 Cadet: the Sweep finds a line up to 3° off it, where A x can be turned more; autoLock locks the line found', () => {
  // the Sweep's onFound fires once, at the first angle within tol = 3°; near (1, −1) the turn is about twice the offset
  const at = (deg: number) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
  assert.ok(L.turnDeg(L.P1_A, at(-45 + 3)) > 3, 'λ = 1: 3° off the line, A x is turned more than 3°');
  assert.ok(L.turnDeg(L.P1_A, at(-45 + 2)) > 3, 'λ = 1: even 2° off');
  assert.ok(L.turnDeg(L.P1_A, at(45 + 3)) <= 3, 'λ = 3: the turn is (2/3) of the offset');
  // locking the found line itself (its exact angle) always holds
  for (const M of [L.P1_A, L.P7_U]) for (const l of L.eigenLines(M)) assert.ok(L.turnDeg(M, [Math.cos(Math.atan2(l.dir[1], l.dir[0])), Math.sin(Math.atan2(l.dir[1], l.dir[0]))]) < 1e-6);
});

test('p2: the shear keeps one line; the win needs the full sweep as evidence', () => {
  const lock: L.Lock[] = [{ dir: [1, 0], stretch: 1 }];
  assert.equal(L.eigenLines(L.P2_A).length, 1);
  assert.ok(L.p2Won(lock, 1));
  assert.ok(!L.p2Won(lock, 0.5), 'half a sweep is not evidence');
  assert.ok(!L.p2Won([{ dir: [1, 1], stretch: 1 }], 1), '(1, 1) is turned by the shear');
  assert.ok(!L.p2Won([{ dir: [1, 0], stretch: 2 }], 1));
});

test('p3 [D]: det(A − λI) = λ² − 7λ + 10 flattens at 5 and 2 along (1, 1) and (1, −2)', () => {
  assert.deepEqual(L.charPoly2(L.P3_A), [1, -7, 10]);
  for (const r of L.P3_ROOTS) { close(L.charAt(L.P3_A, r), 0); assert.ok(L.flatAt(L.P3_A, r, 1e-9)); }
  assert.ok(!L.flatAt(L.P3_A, 4, 1e-6), '4 is on the diagonal, not a root');
  assert.ok(L.rootsWon([5, 2]) && L.rootsWon([2, 5]) && !L.rootsWon([5]) && !L.rootsWon([5, 4]));
  const l5 = L.nullLine(L.P3_A, 5)!, l2 = L.nullLine(L.P3_A, 2)!;
  assert.ok(L.lineAngleDeg(l5, [1, 1]) < 1e-9 && L.lineAngleDeg(l2, [1, -2]) < 1e-9);
  assert.equal(L.nullLine(L.P3_A, 4), null);
  // every dial step lands exactly on the roots
  for (const step of [0.5, 0.25, 0.05]) for (const r of L.P3_ROOTS) close(Math.round(r / step) * step, r);
});

test('p4: the routine pulse keeps no line (λ² + 1); D = turn 45° · stretch 1.41 has λ = 1 ± i; T⁴ = I', () => {
  assert.equal(L.eigenLines(L.P4_T).length, 0);
  assert.deepEqual(L.charPoly2(L.P4_T).map((x) => x + 0), [1, 0, 1]);
  for (let l = -5; l <= 5; l += 0.25) assert.ok(L.charAt(L.P4_T, l) >= 1 - 1e-9);
  const z = L.complexPair(L.P4_D)!;
  assert.deepEqual([z.re, z.im], [1, 1]);
  const pol = L.polarOf(z);
  close(pol.r, L.P4_STRETCH); close(pol.deg, L.P4_ANGLE);
  const [t45, t90, s141, s2] = L.P4_CARDS.map((c) => c.M);
  assert.ok(L.p4DWon([t45, s141]) && L.p4DWon([s141, t45]), 'a uniform stretch commutes with a turn');
  assert.ok(!L.p4DWon([t90, s141]) && !L.p4DWon([t45, s2]) && !L.p4DWon([t45]));
  assert.equal(L.P4_SUM, 2 * z.re); close(L.P4_PRODUCT, z.re * z.re + z.im * z.im);
  close(L.trace(L.P4_D), L.P4_SUM); close(det(L.P4_D), L.P4_PRODUCT);
  assert.ok(L.p4FourWon([T, T, T, T]) && !L.p4FourWon([T, T]) && !L.p4FourWon([T, T, T]));
  assert.ok(meq(mpow(T, 4), identity(2)));
});

test('p6: Vell’s three lines with stretches 1, 0.5, 0.2; the decoy candidates turn', () => {
  const right: L.Lock[] = L.P6_LINES.map(([d, s]) => ({ dir: d, stretch: s }));
  assert.ok(L.p6Won(right));
  assert.ok(!L.p6Won(right.slice(0, 2)), 'two lines only');
  assert.ok(!L.p6Won([right[0], right[1], { dir: right[2].dir, stretch: 0.5 }]), 'a wrong stretch');
  const holds = L.P6_CANDIDATES.filter((c) => L.onLine(V, c, 0.5));
  assert.equal(holds.length, 3);
  assert.ok(!L.onLine(V, [1, 0, 0], 1) && !L.onLine(V, [1, 1, 0], 1));
  // the win message: arrows with a part along (1, 1, 1) turn towards it; the plane x + y + z = 0 stays put
  const x: number[] = [1, 0, -1];
  close(matVec(V, x).reduce((a, b) => a + b, 0), 0, 1e-12);
  assert.ok(Math.hypot(...matVec(mpow(V, 50), x)) < 1e-12, 'V⁵⁰(1, 0, −1) fades to 0, not onto (1, 1, 1)');
  // the hint: where x has a 0, V x has a 0 too (the third entry of (1, −1, 0))
  close(matVec(V, [1, -1, 0])[2], 0, 1e-12);
});

test('p7 [S]: row reducing first changes the stretches (4 and 2.5, not 5 and 2)', () => {
  assert.deepEqual(L.eigenLines(L.P7_U).map((x) => x.value), L.P7_VALUES);
  close(det(L.P7_U), det(L.P3_A), 1e-12);
  assert.ok(!L.P7_VALUES.some((v) => L.P3_ROOTS.includes(v)));
});

test('coda: the two-decimal model C₂ flattens at λ = 0, so 0 is an eigenvalue (TT9)', () => {
  assert.ok(L.coda0());
  assert.ok(meq(L.CODA_C2, C2));
});

test('Doubts: every pulse keeps a line (F), the zero arrow (F), eigenvalues add to the trace (T)', () => {
  // (F) every pulse keeps a line: the quarter turn breaks it; a Shake of random matrices finds a turn
  assert.equal(L.everyLineHolds([[0, -1], [1, 0]]), false);
  assert.equal(L.everyLineHolds(T), false);
  assert.equal(L.everyLineHolds([[2, 1], [1, 2]]), true);
  const r = rng(18);
  let broke = 0;
  for (let i = 0; i < 40; i++) { const M: Mat = [[rint(r, -2, 2), rint(r, -2, 2)], [rint(r, -2, 2), rint(r, -2, 2)]]; if (!L.everyLineHolds(M)) broke++; }
  assert.ok(broke >= 4, `the Shake found ${broke} turns`);
  // (F) the zero arrow: x = 0 with λ = 4 breaks it (4 is not a stretch of [[2, 1], [1, 2]])
  const A: Mat = [[2, 1], [1, 2]];
  assert.equal(L.zeroArrowHolds(A, [0, 0], 4), false);
  assert.equal(L.zeroArrowHolds(A, [0, 0], 3), true, 'λ = 3 is a stretch: no contradiction there');
  assert.equal(L.zeroArrowHolds(A, [1, 1], 4), true, 'a non-zero arrow says nothing about the claim');
  // (T) the trace: holds for real pairs, repeated roots and complex pairs alike
  for (const M of [A, T, [[1, 1], [0, 1]], [[1, 2], [2, 4]], [[0, -1], [1, 0]]] as Mat[]) assert.ok(L.traceSumHolds(M));
  for (let i = 0; i < 300; i++) assert.ok(L.traceSumHolds([[rint(r, -5, 5), rint(r, -5, 5)], [rint(r, -5, 5), rint(r, -5, 5)]]));
});

test('Law: “λ is an eigenvalue exactly when A − λI is singular” survives 500 cases; every near-miss breaks', () => {
  assert.equal(checkLaw(L.LAW_CORE, L.LAW_CORE.answer).survived, true);
  for (const f of L.LAW_NEAR_MISSES) assert.equal(checkLaw(L.LAW_CORE, f).survived, false, JSON.stringify(f));
});

test('Procedure: the reference finds λ = 4, 1 along (1, 1), (2, −1); each missing key step fails as listed', () => {
  const ok = L.runProc(L.PROC_REF);
  assert.ok(ok.ok && ok.fault === null);
  assert.deepEqual(ok.values, L.PROC_VALUES);
  assert.equal(ok.vectors.length, 2);
  L.PROC_VECS.forEach((v, i) => assert.ok(veq(matVec(L.PROC_A, v), v.map((x) => x * L.PROC_VALUES[i]))));
  // every tile is needed
  for (const t of L.PROC_REF) assert.equal(L.runProc(L.PROC_REF.filter((x) => x !== t)).ok, false, `without ${t}`);
  // the key steps fail visibly, as the misconception
  assert.equal(L.runProc(L.PROC_REF.filter((x) => x !== 'det0')).fault, 'noeq');
  assert.equal(L.runProc(L.PROC_REF.filter((x) => x !== 'foreach')).fault, 'one', 'one eigenvector only');
  assert.ok(L.runProc(L.PROC_REF.filter((x) => x !== 'foreach')).message.includes('One eigenvector'));
  assert.equal(L.runProc(L.PROC_REF.filter((x) => x !== 'exclude')).fault, 'zero');
  // misplaced: “for each” after the null space; “exclude” before it
  assert.equal(L.runProc(['form', 'det0', 'solve', 'null', 'foreach', 'exclude']).fault, 'one');
  assert.equal(L.runProc(['form', 'det0', 'solve', 'foreach', 'exclude', 'null']).fault, 'zero');
  // the decoys are the misconceptions
  assert.equal(L.runProc(['rowred', ...L.PROC_REF]).fault, 'values');
  assert.equal(L.runProc(['direct', 'foreach', 'null', 'exclude']).fault, 'direct');
  assert.ok(L.PROC_KEYS.every((k) => L.PROC_REF.includes(k)));
});

test('Procedure: a decoy at the start, in the middle or at the end never passes, and names its own fault', () => {
  const REF = L.PROC_REF;
  const put = (t: string, i: number) => [...REF.slice(0, i), t, ...REF.slice(i)];
  // every position of each decoy fails
  for (const t of ['rowred', 'direct']) for (let i = 0; i <= REF.length; i++) assert.equal(L.runProc(put(t, i)).ok, false, `${t} at ${i}`);
  // SOLVE (A − λI)v = 0 STRAIGHT AWAY: “without choosing λ” only while λ is not chosen yet
  const early = L.runProc(['direct', ...REF]), mid = L.runProc(put('direct', REF.indexOf('solve') + 1)), end = L.runProc([...REF, 'direct']);
  for (const r of [early, mid, end]) assert.equal(r.fault, 'direct');
  assert.ok(early.message.includes('without choosing'));
  for (const r of [mid, end]) { assert.ok(!r.message.includes('without choosing'), r.message); assert.ok(r.message.includes('zero vector')); }
  // ROW REDUCE A FIRST: before the roots it changes the stretches; after them it changes the null spaces or the lines
  assert.equal(L.runProc(['rowred', ...REF]).fault, 'values');
  assert.equal(L.runProc(put('rowred', REF.indexOf('solve'))).fault, 'values');
  const afterRoots = L.runProc(put('rowred', REF.indexOf('solve') + 1));
  assert.equal(afterRoots.fault, 'rowred');
  assert.ok(!afterRoots.message.includes('find the null space'), afterRoots.message);
  assert.ok(afterRoots.message.includes('U - 4I') && afterRoots.message.includes('U - I'), afterRoots.message);
  assert.ok(afterRoots.message.includes('2 & 2 \\\\ 0 & 2'), 'U = [[2, 2], [0, 2]]');
  const afterLines = L.runProc([...REF, 'rowred']);
  assert.equal(afterLines.fault, 'rowred');
  assert.ok(afterLines.message.includes('the one eigenvalue 2'), afterLines.message);
  // no null step at all is still “find the null space”
  assert.equal(L.runProc(REF.filter((x) => x !== 'null')).fault, 'novectors');
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
`;

function runPy(fn: string, code: string, cases: { args: unknown[]; expect: unknown }[]): boolean[] {
  const prog = `import json, math\n${LIB}\n${code}\ndef close(a, b):\n    if a is None or b is None:\n        return a is None and b is None\n    if isinstance(a, dict):\n        return isinstance(b, dict) and a.keys() == b.keys() and all(close(a[k], b[k]) for k in a)\n    if isinstance(a, str):\n        return a == b\n    if isinstance(a, (list, tuple)):\n        return isinstance(b, (list, tuple)) and len(a) == len(b) and all(close(x, y) for x, y in zip(a, b))\n    return abs(a - b) < 1e-6\nres = []\nfor a, e in json.loads(${JSON.stringify(JSON.stringify(cases.map((t) => [t.args, t.expect])))}):\n    try:\n        res.append(close(${fn}(*a), e))\n    except Exception:\n        res.append(False)\nprint(json.dumps(res))\n`;
  return JSON.parse(execFileSync('python3', ['-I', '-c', prog], { encoding: 'utf8' }));
}

const swarm = (gen: (r: () => number, d: string) => unknown[], crew: (...a: unknown[]) => unknown) => {
  const r = rng(181);
  return Array.from({ length: 120 }, (_, i) => { const args = gen(r, ['cadet', 'navigator', 'commander'][i % 3]); return { args, expect: crew(...args) ?? null }; });
};

test('builds: eig2 and power_iteration pass their tests and a swarm; each decoy fails one', () => {
  for (const [b, src, tests] of [[buildEig2, EIG2, EIG2_TESTS], [buildPower, POWER, POWER_TESTS]] as const) {
    assert.ok(runPy(b.fn, src, tests).every(Boolean), `${b.fn} tests`);
    const cases = swarm(b.swarm!.gen as (r: () => number, d: string) => unknown[], b.swarm!.crew);
    assert.ok(runPy(b.fn, src, cases).every(Boolean), `${b.fn} swarm`);
    const same = (a: unknown, e: unknown): boolean => (typeof a === 'string' ? a === e : Array.isArray(a) ? Array.isArray(e) && a.length === e.length && a.every((x, i) => same(x, e[i])) : a && typeof a === 'object' ? Object.keys(a).every((k) => same((a as Record<string, unknown>)[k], (e as Record<string, unknown>)[k])) : Math.abs((a as number) - (e as number)) < 1e-9);
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
  // the swarm covers complex pairs and real ones
  const r = rng(5);
  const kinds = new Set(Array.from({ length: 60 }, () => L.crewEig2(L.eig2Case(r, 'navigator')[0]).kind));
  assert.deepEqual([...kinds].sort(), ['complex', 'real']);
});
