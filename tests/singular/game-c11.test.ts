// Chapter 11: games 1–3 answers, puzzle numbers, win checks (reference wins, misconceptions do not), the honest pulse
// animation, the Law (target survives, near-misses break), the Doubts' predicates, and the matvec
// build (the reference passes its tests in CPython; each decoy fails one).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as L from '../../site/src/singular/content/chapters/c11-transformations/logic.ts';
import * as G from '../../site/src/singular/content/chapters/c11-transformations/apply-logic.ts';
import { plan2, framesOf, T3partial, T2partial, smoothAt, stageEnd } from '../../site/src/singular/content/chapters/c11-transformations/honest.ts';
import { TESTS, buildMatvec, swarmCase } from '../../site/src/singular/content/chapters/c11-transformations/build.ts';
import { buildLincomb } from '../../site/src/singular/content/chapters/c02-span/build.ts';
import { buildDot } from '../../site/src/singular/content/chapters/c04-dot/build.ts';
import { checkLaw, rng } from '../../site/src/singular/game/lawcheck.ts';
import { det, matMul, matVec, meq, mpow, identity, rank, veq, transpose } from '../../site/src/singular/math/la.ts';
import { T, T3, S_now } from '../../site/src/singular/content/truth.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('game 1: A v answers; the rows of A (A transpose v) are caught; reverse rounds have one v', () => {
  const r3 = G.G1[2];
  assert.ok(veq(G.g1Answer(r3), [-1, 1]));
  assert.ok(G.g1Right(r3, [-1, 1]) && !G.g1Right(r3, [5, -8]));
  assert.ok(G.usedRows(r3, [5, -8]) && !G.usedRows(r3, [3, -2]));
  assert.ok(veq(G.g1Answer(G.G1[0]), [1, 1]) && veq(G.g1Answer(G.G1[1]), [-2, -1]), 'rounds 1 and 2 are the columns');
  assert.ok(veq(G.g1Answer(G.G1[6]), [0, 0]), 'round 7 lands on 0');
  for (const r of G.G1.filter((x) => x.reverse)) {
    assert.ok(Math.abs(det(r.A)) > 1e-9, 'reverse rounds have one answer');
    assert.ok(G.g1Right(r, r.v) && !G.g1Right(r, [r.v[0] + 1, r.v[1]]));
  }
  // no default (empty boxes) and no "v unchanged" answer passes a forward round
  for (const r of G.G1.filter((x) => !x.reverse)) assert.ok(!G.g1Right(r, r.v) || meq(r.A, identity(2)));
});

test('game 2: A = W U⁻¹ meets both equations; typing the targets as columns does not', () => {
  for (const r of G.G2) {
    const A = G.g2Answer(r);
    assert.equal(G.g2Misses(r, A).length, 0);
    assert.ok(veq(matVec(A, r.u[0]), r.w[0]) && veq(matVec(A, r.u[1]), r.w[1]));
  }
  const r5 = G.G2[4];
  assert.ok(meq(G.g2Answer(r5), [[2, 1], [1, 2]]));
  assert.ok(G.g2Misses(r5, [[3, 1], [3, -1]]).length > 0, 'targets typed in as the columns');
  assert.ok(meq(G.g2Answer(G.G2[9]), [[2, 0], [0, 2]]));
});

test('game 3: matrix rounds match T; the others fail with their evidence', () => {
  for (const r of G.G3) {
    if (r.A) { assert.equal(G.g3Mismatch(r, r.A), null); continue; }
    assert.ok(r.evidence);
    // no matrix matches T: the identity, the T columns, and the zero matrix all fail
    const cols = [r.T([1, 0]), r.T([0, 1])];
    for (const A of [identity(2), [[cols[0][0], cols[1][0]], [cols[0][1], cols[1][1]]], [[0, 0], [0, 0]]]) assert.ok(G.g3Mismatch(r, A));
    const ev = G.evidencePoint(r);
    if (r.evidence!.kind === 'origin') assert.ok(!veq(ev.T, [0, 0]));
    else {
      const e = r.evidence!;
      if (e.kind === 'scale') assert.ok(!veq(ev.T, r.T(e.x).map((x) => x * e.k)));
    }
  }
  assert.equal(G.G3.filter((r) => r.A).length, 6);
});

test('p4: the spire forecast misses, the volume forecast matches (TT4, TT5)', () => {
  assert.ok(veq(L.BOW_SPIRE, [0, 1, 0]));
  assert.ok(veq(L.BOW_REAL, [1, 1, 0]));
  close(L.VOL_SPIRE, 0.8); close(L.VOL_REAL, 0.8);
  const won = { spire: S_now, spireMark: [0, 1, 0], real: T3, realMark: [1, 1, 0] };
  assert.ok(L.p4Won(won));
  assert.ok(!L.p4Won({ ...won, spireMark: [1, 1, 0] }), 'placing the real landing as the spire forecast');
  assert.ok(!L.p4Won({ ...won, spire: transpose(S_now) }), 'tips typed as rows');
  assert.deepEqual(L.p4Subgoals({ spire: S_now, spireMark: null, real: null, realMark: null }), [true, false, false, false]);
});

test('p5 [H]: A x = (7, −1) both ways; the 3-D bench sends (1, 1, 1) to (2, 2, 1)', () => {
  assert.ok(veq(L.P5_AX, [7, -1]));
  assert.deepEqual(L.P5_ROWS, [7, -1]);
  const sum = L.P5_PARTS.reduce((s, v) => [s[0] + v[0], s[1] + v[1]], [0, 0]);
  assert.ok(veq(sum, L.P5_AX));
  assert.ok(veq(L.P5_BEACON_LAND, [2, 2, 1]));
  // every worksheet step's answer is consistent
  assert.ok(veq(L.P5_STEPS[3].answer as number[], [7, -1]));
  close(det(L.P5_BENCH), 1);
});

test('p6: as columns Ilse’s numbers turn the grid the same way as the pulse; as rows the other way', () => {
  assert.equal(L.PULSE_SENSE, 1);
  assert.equal(L.turnSense(L.READ_COLS), 1);
  assert.equal(L.turnSense(L.READ_ROWS), -1);
  assert.ok(L.p6Won({ cols: L.READ_COLS, rows: L.READ_ROWS, loaded: L.READ_COLS }));
  assert.ok(!L.p6Won({ cols: L.READ_COLS, rows: L.READ_ROWS, loaded: L.READ_ROWS }));
  assert.ok(!L.p6Won({ cols: L.READ_COLS, rows: null, loaded: L.READ_COLS }));
  assert.ok(!meq(L.READ_COLS, T), 'the same way round is not the same pulse');
  assert.deepEqual(L.ILSE_NINE, [0, 1, 0, -1, 0, 0, 0, 0, 1]);
});

test('p7 [S]: the three standard moves', () => {
  const [rot, flip, proj] = L.P7_TARGETS.map((t) => t.M);
  close(det(rot), 1);
  assert.ok(veq(matVec(rot, [1, 0]), [Math.sqrt(3) / 2, 0.5]));
  close(det(flip), -1);
  assert.ok(meq(matMul(flip, flip), identity(2)));
  assert.equal(rank(proj), 1);
});

test('honest animation: the routine pulse keeps det 1 at every frame; flips are flips; no false flattening', () => {
  for (let k = 0; k <= 12; k++) close(det(T2partial(k / 12)), 1, 1e-9);
  assert.ok(meq(T2partial(1), T));
  for (let k = 0; k <= 12; k++) close(det(T3partial(k / 12)), 1 + (0.8 - 1) * (k / 12), 1e-9);
  assert.ok(meq(T3partial(1), T3));
  assert.ok(meq(mpow(T, 4), identity(2)), 'every fourth pulse the ground layer is home');
  assert.ok(!meq(mpow(T3, 4), identity(3)), 'heights do not come home');
  const r = rng(11);
  for (let n = 0; n < 500; n++) {
    const S = [[r() * 6 - 3, r() * 6 - 3], [r() * 6 - 3, r() * 6 - 3]];
    const frames = framesOf(S, identity(2), 16);
    const end = frames[frames.length - 1];
    assert.ok(meq([[end[0][0], end[0][1]], [end[1][0], end[1][1]]], S, 1e-9), 'ends on S');
    const plan = plan2(S);
    if (det(S) > 1e-6) {
      assert.equal(plan.length, 1);
      for (const F of frames) assert.ok(det(F) > 0, 'never flat, never flipped');
    } else if (det(S) < -1e-6) {
      assert.equal(plan[plan.length - 1].kind, 'flip', 'a reflection has a labelled flip stage');
      const sm = plan.find((s) => s.kind === 'smooth');
      if (sm && sm.kind === 'smooth') for (let k = 1; k < 16; k++) assert.ok(det(smoothAt(sm, k / 16)) > 0);
    }
  }
  // singular targets: rank drops only at the end
  for (const S of [[[1, 0], [0, 0]], [[1, 2], [2, 4]], [[0, 1], [0, 0]], [[-1, 0], [0, 0]], [[0, 0], [0, 0]]]) {
    const [st] = plan2(S);
    assert.equal(st.kind, 'smooth');
    if (st.kind === 'smooth') {
      for (let k = 0; k < 20; k++) assert.ok(det(smoothAt(st, k / 20)) > 1e-12, `flat too early for ${JSON.stringify(S)}`);
      assert.ok(meq(stageEnd(st), S, 1e-9));
    }
  }
  // the flip over y = x is one half-turn about the mirror line
  const fp = plan2([[0, 1], [1, 0]]);
  assert.equal(fp.length, 1);
  assert.equal(fp[0].kind, 'flip');
});

test('Law: “the columns are where e₁ and e₂ land, always” survives 500 cases; every near-miss breaks', () => {
  assert.equal(checkLaw(L.lawCore, L.lawCore.answer).survived, true);
  for (const f of L.LAW_NEAR_MISSES) assert.equal(checkLaw(L.lawCore, f).survived, false, JSON.stringify(f));
});

test('Law: every rows filling freezes on a case whose rows are not where e₁ and e₂ land', () => {
  const firstBreak = (f: Record<string, string>) => [...L.lawCore.edgeCases].find((c) => !L.lawCore.holds(f, c));
  const rowsLand = (A: number[][]) => veq(matVec(A, [1, 0]), A[0]) && veq(matVec(A, [0, 1]), A[1]);
  const expect: [Record<string, string>, number[][]][] = [
    [{ part: 'rows', when: 'always' }, L.SHEAR],
    [{ part: 'rows', when: 'kept' }, L.SHEAR],
    [{ part: 'rows', when: 'turn' }, L.TURN],
    [{ part: 'cols', when: 'turn' }, L.SHEAR],
    [{ part: 'cols', when: 'kept' }, [[1, 0], [0, 0]]],
  ];
  for (const [f, A] of expect) {
    const c = firstBreak(f);
    assert.ok(c && meq(c.A, A), `${JSON.stringify(f)} breaks first on ${JSON.stringify(c?.A)}`);
    assert.equal(checkLaw(L.lawCore, f).counterexample, L.lawCore.describe(c!));
    if (f.part === 'rows') assert.ok(!rowsLand(c!.A), 'the rows are visibly not the landing spots');
  }
});

test('Doubts: two buoys fix everything unless they are on one line; the origin never moves', () => {
  assert.equal(L.d1Holds({ u: [1, 0], w: [0, 1], A: T, x: [0, 0] }), false, 'the canonical counterexample');
  assert.equal(L.d1Holds({ u: [1, 1], w: [2, 2], A: T, x: [0, 0] }), true, 'the edge case where the claim holds');
  const r = rng(5);
  for (let i = 0; i < 200; i++) {
    const u = [Math.round(r() * 6 - 3), Math.round(r() * 6 - 3)], w = [Math.round(r() * 6 - 3), Math.round(r() * 6 - 3)];
    const A = [[r() * 4 - 2, r() * 4 - 2], [r() * 4 - 2, r() * 4 - 2]], x = [r() * 8 - 4, r() * 8 - 4];
    const pred = L.d1Predict({ u, w, A, x });
    if (pred) assert.ok(veq(pred, matVec(A, x), 1e-6), 'the prediction from two landings is right');
  }
  for (const c of L.D2_EDGES) assert.ok(L.d2Holds(c));
  for (let i = 0; i < 100; i++) assert.ok(L.d2Holds({ A: [[r() * 8 - 4, r() * 8 - 4], [r() * 8 - 4, r() * 8 - 4]] }));
});

// The game injects only the sources named in `uses` (game/build.ts runTests), so build the library the
// same way: Chapter 1's scale and add (copied from c01-vectors/index.ts), Chapter 2's real lincomb,
// Chapter 4's real dot (for the row view).
const SOURCES: Record<string, string> = {
  scale: 'def scale(c, v):\n    """Return the vector v stretched by the number c."""\n    return [c * x for x in v]\n',
  add: 'def add(v, w):\n    """Return the vector for move v followed by move w."""\n    return [a + b for a, b in zip(v, w)]\n',
  lincomb: buildLincomb.solution,
  dot: buildDot.solution,
};
const LINCOMB = (buildMatvec.uses ?? []).map((u) => SOURCES[u] ?? '').join('\n');
function runPy(code: string, tests: { args: unknown[]; expect: unknown }[]): boolean[] {
  const prog = `import json, math\n${LINCOMB}\n${code}\nres = []\nfor a, e in json.loads(${JSON.stringify(JSON.stringify(tests.map((t) => [t.args, t.expect])))}):\n    try:\n        g = matvec(*a)\n        res.append(len(g) == len(e) and all(abs(x - y) < 1e-6 for x, y in zip(g, e)))\n    except Exception:\n        res.append(False)\nprint(json.dumps(res))\n`;
  return JSON.parse(execFileSync('python3', ['-I', '-c', prog], { encoding: 'utf8' }));
}

test('build: the matvec reference passes its tests and a swarm; each decoy fails at least one test', () => {
  for (const u of buildMatvec.uses ?? []) assert.ok(SOURCES[u], `known library source ${u}`);
  assert.ok(runPy(buildMatvec.solution, TESTS).every(Boolean));
  const r = rng(3);
  const swarm = Array.from({ length: 60 }, (_, i) => { const [A, x] = swarmCase(r, ['cadet', 'navigator', 'commander'][i % 3]); return { args: [A, x], expect: matVec(A, x) }; });
  assert.ok(runPy(buildMatvec.solution, swarm).every(Boolean));
  for (const decoy of buildMatvec.assemble!.decoys!) {
    const lines = buildMatvec.assemble!.lines.slice();
    if (decoy.includes('columns =')) lines[2] = decoy; else lines[3] = decoy;
    assert.ok(runPy(`${lines.join('\n')}\n`, TESTS).some((ok) => !ok), decoy);
  }
  for (const t of TESTS) assert.ok(veq(matVec(t.args[0] as number[][], t.args[1] as number[]), t.expect as number[]), t.name);
});

test('build: the row view through dot passes too (the brief offers it on Write)', () => {
  assert.ok((buildMatvec.uses ?? []).includes('dot'), 'dot is injected');
  const rowView = 'def matvec(A, x):\n    return [dot(row, x) for row in A]\n';
  assert.ok(runPy(rowView, TESTS).every(Boolean));
  const r = rng(3);
  const swarm = Array.from({ length: 60 }, (_, i) => { const [A, x] = swarmCase(r, ['cadet', 'navigator', 'commander'][i % 3]); return { args: [A, x], expect: matVec(A, x) }; });
  assert.ok(runPy(rowView, swarm).every(Boolean));
  assert.match(buildMatvec.brief, /dot\(A\[i\], x\)/);
});
