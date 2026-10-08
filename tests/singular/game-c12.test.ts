// Chapter 12: puzzle numbers, win checks (reference wins, misconceptions do not), the Law (target
// survives, near-misses break), the Doubts' predicates (canonical construction, the Shake finds the
// breaking case), and the matmul / transpose builds run in CPython (reference passes, decoys fail).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as L from '../../site/src/singular/content/chapters/c12-composition/logic.ts';
import { MATMUL_TESTS, TRANSPOSE_TESTS, buildMatmul, buildTranspose, matmulCase, transposeCase } from '../../site/src/singular/content/chapters/c12-composition/build.ts';
import { buildMatvec } from '../../site/src/singular/content/chapters/c11-transformations/build.ts';
import { buildLincomb } from '../../site/src/singular/content/chapters/c02-span/build.ts';
import { checkLaw, rng } from '../../site/src/singular/game/lawcheck.ts';
import { det, identity, matMul, matVec, meq, transpose, veq } from '../../site/src/singular/math/la.ts';

test('p1: shear then turn is one matrix with columns (0, 1) and (−1, 1); the swapped order is not it', () => {
  assert.ok(meq(L.P1_BA, [[0, -1], [1, 1]]));
  assert.ok(meq(L.P1_AB, [[1, -1], [1, 0]]));
  assert.ok(L.p1Won(L.P1_BA));
  assert.ok(!L.p1Won(L.P1_AB), 'the turn first');
  assert.ok(!L.p1Won(matMul(L.SHEAR, L.TURN)));
  assert.ok(veq(L.P1_TRACE.e1[1], [1, 0]) && veq(L.P1_TRACE.e1[2], [0, 1]));
  assert.ok(veq(L.P1_TRACE.e2[1], [1, 1]) && veq(L.P1_TRACE.e2[2], [-1, 1]));
  assert.ok(meq(L.fuse([L.SHEAR, L.TURN]), L.P1_BA), 'the rail: first card acts first');
});

test('p2: (1, 0) lands apart in the two orders; only the origin agrees; two flips come home', () => {
  assert.ok(veq(matVec(L.P1_BA, [1, 0]), [0, 1]) && veq(matVec(L.P1_AB, [1, 0]), [1, 1]));
  assert.ok(L.ordersApart([1, 0]));
  assert.ok(!L.ordersApart([0, 0]));
  for (const p of [[1, 1], [-2, 1], [0, 3], [0.5, -0.5]]) assert.ok(L.ordersApart(p), JSON.stringify(p));
  // the two landings are |p| apart, so a point one Commander snap from the origin lands apart, but too
  // close to see: LANTERN must not call it the origin
  for (const p of [[0.25, 0], [0, 0.25], [-0.25, 0]]) {
    const a = matVec(L.P1_BA, p), b = matVec(L.P1_AB, p);
    assert.ok(Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1]) - Math.hypot(p[0], p[1])) < 1e-12, JSON.stringify(p));
    assert.ok(!L.ordersApart(p) && Math.hypot(p[0], p[1]) > 1e-9, JSON.stringify(p));
  }
  assert.ok(L.flipTwiceHome([L.FLIP, L.FLIP]));
  assert.ok(!L.flipTwiceHome([L.FLIP]));
  assert.ok(!L.flipTwiceHome([L.FLIP, L.TURN]));
  assert.ok(meq(matMul(L.FLIP, L.FLIP), identity(2)));
});

test('p3 [H]: [[1, 2, 0], [0, 1, 3]] times [[1, 0], [2, 1], [0, 4]] is [[5, 2], [2, 13]]', () => {
  assert.ok(meq(L.P3_AB, [[5, 2], [2, 13]]));
  assert.ok(veq(L.P3_COLS[0], [5, 2]) && veq(L.P3_COLS[1], [2, 13]));
  assert.equal(L.P3_STEPS[2].answer, 5);
  assert.equal(L.P3_STEPS[3].answer, 13);
  // each column of the product is the first matrix applied to a column of the second
  for (let j = 0; j < 2; j++) assert.ok(veq(L.P3_COLS[j], matVec(L.P3_A, [L.P3_B[0][j], L.P3_B[1][j], L.P3_B[2][j]])));
});

test('p4 [D]: the mover of B is B with rows as columns; it survives 200 pairs; B itself does not; the rule twice', () => {
  assert.ok(meq(L.P4_MOVER, [[1, 0], [2, 1]]));
  assert.equal(L.moverShake(L.P4_B, L.P4_MOVER), null);
  assert.notEqual(L.moverShake(L.P4_B, L.P4_B), null, 'B itself is a misconception');
  assert.notEqual(L.moverShake(L.P4_B, identity(2)), null);
  assert.ok(meq(L.P4_AB, [[0, -1], [1, 2]]));
  assert.ok(meq(L.P4_AB_MOVER, [[0, 1], [-1, 2]]));
  assert.ok(meq(L.P4_RULE_TWICE, L.P4_AB_MOVER), '(AB)ᵀ = BᵀAᵀ');
  assert.ok(!meq(matMul(transpose(L.P4_A), transpose(L.P4_B)), L.P4_AB_MOVER), 'AᵀBᵀ is the misconception');
  assert.deepEqual(L.P4_ORDER, L.P4_TILES.map((t) => t.id));
  assert.equal(L.shakePairs().length, 200);
});

test('p5: onto the x-axis then onto the y-axis is zero; neither alone is', () => {
  assert.ok(L.zeroFromNonZero([L.PX, L.PY]));
  assert.ok(L.zeroFromNonZero([L.PY, L.PX]));
  assert.ok(!L.zeroFromNonZero([L.PX, L.PX]));
  assert.ok(!L.zeroFromNonZero([L.TURN, L.SHEAR]));
  assert.ok(!L.zeroFromNonZero([[[0, 0], [0, 0]], L.PX]), 'a zero card does not count');
});

test('p6: three moves fuse to columns (0, 2) and (−1, 1); no matrix separates the ring from the blob', () => {
  assert.ok(meq(L.P6_FUSED, [[0, -1], [2, 1]]));
  assert.ok(veq(matVec(L.P6_FUSED, [1, 0]), [0, 2]) && veq(matVec(L.P6_FUSED, [0, 1]), [-1, 1]));
  assert.ok(Math.abs(det(L.P6_FUSED) - 2) < 1e-12);
  assert.ok(L.p6Won(L.P6_FUSED));
  assert.ok(!L.p6Won(L.fuse([L.TURN, L.SHEAR, L.STRETCH])), 'the reversed order');
  // the separation check works: a blob moved off to the side is separable
  assert.ok(L.separable(L.RING, L.BLOB.map((p) => [p[0] + 6, p[1]])));
  const r = rng(9);
  for (let i = 0; i < 200; i++) {
    const M = [[r() * 6 - 3, r() * 6 - 3], [r() * 6 - 3, r() * 6 - 3]];
    assert.equal(L.ringSeparated(M), false);
  }
  for (const M of [identity(2), L.PX, [[0, 0], [0, 0]], L.FLIP, [[10, 0], [0, 0.1]]]) assert.equal(L.ringSeparated(M), false);
  assert.ok(L.newTry([], identity(2)) && !L.newTry([identity(2)], identity(2)));
});

test('p7 [S]: grouping either way gives one matrix', () => {
  assert.ok(meq(L.P7_LEFT_FIRST, L.P7_RIGHT_FIRST));
  assert.ok(meq(L.P7_LEFT_FIRST, L.fuse(L.P7_CARDS)));
});

test('Law: “In AB x, B moves the grid first, always” survives 500 cases; every near-miss breaks', () => {
  assert.equal(checkLaw(L.lawCore, L.lawCore.answer).survived, true);
  for (const f of L.LAW_NEAR_MISSES) assert.equal(checkLaw(L.lawCore, f).survived, false, JSON.stringify(f));
});

test('Doubts: shear/turn order and AB = 0 are false (the Shake breaks them); grouping is true', () => {
  // (F) order: the canonical counterexample, and the edge cases where it happens to hold
  assert.equal(L.d1Holds({ k: 1, deg: 90, p: [1, 0] }), false);
  // the doubt opens with no shear (briefing.ts): the claim holds there, so the player must build the case
  assert.equal(L.d1Holds({ k: 0, deg: 90, p: [1, 0] }), true);
  assert.equal(L.d1Holds({ k: 0, deg: 60, p: [2, 1] }), true);
  assert.equal(L.d1Holds({ k: 1.5, deg: 180, p: [1, 2] }), true);
  const r = rng(21);
  let broke = 0;
  for (let i = 0; i < 5; i++) {
    const k = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2][Math.floor(r() * 8)];
    const deg = [30, 45, 60, 90, 120, 135, 150][Math.floor(r() * 7)];
    if (!L.d1Holds({ k, deg, p: [1, 1] })) broke++;
  }
  assert.ok(broke >= 1, 'two random shakes are enough to break it');
  // (F) zero product
  assert.equal(L.d2Holds(L.PY, L.PX), false, 'the canonical counterexample');
  assert.equal(L.d2Holds(identity(2), identity(2)), true);
  const r2 = rng(4);
  let found = false;
  for (let i = 0; i < 2 && !found; i++) { const [A, B] = L.d2Random(r2); if (!L.d2Holds(A, B)) found = true; }
  for (let i = 0; i < 10 && !found; i++) { const [A, B] = L.d2Random(r2); if (!L.d2Holds(A, B)) found = true; }
  assert.ok(found, 'the Shake finds a non-zero pair with a zero product');
  // (T) grouping
  const r3 = rng(8);
  for (let i = 0; i < 300; i++) {
    const m = () => [[r3() * 4 - 2, r3() * 4 - 2], [r3() * 4 - 2, r3() * 4 - 2]];
    assert.ok(L.d3Holds(m(), m(), m()));
  }
});

// The game injects only the sources named in `uses` (game/build.ts runTests): Chapter 1's scale and add
// (copied from c01-vectors/index.ts), Chapter 2's real lincomb, Chapter 11's matvec.
const SOURCES: Record<string, string> = {
  scale: 'def scale(c, v):\n    """Return the vector v stretched by the number c."""\n    return [c * x for x in v]\n',
  add: 'def add(v, w):\n    """Return the vector for move v followed by move w."""\n    return [a + b for a, b in zip(v, w)]\n',
  lincomb: buildLincomb.solution,
  matvec: buildMatvec.solution,
};
function runPy(lib: string, code: string, fn: string, tests: { args: unknown[]; expect: unknown }[]): boolean[] {
  const prog = `import json, math\n${lib}\n${code}\ndef close(a, b):\n    if isinstance(a, list) and isinstance(b, list):\n        return len(a) == len(b) and all(close(x, y) for x, y in zip(a, b))\n    return isinstance(a, (int, float)) and isinstance(b, (int, float)) and abs(a - b) < 1e-6\nres = []\nfor a, e in json.loads(${JSON.stringify(JSON.stringify(tests.map((t) => [t.args, t.expect])))}):\n    try:\n        res.append(close(${fn}(*a), e))\n    except Exception:\n        res.append(False)\nprint(json.dumps(res))\n`;
  return JSON.parse(execFileSync('python3', ['-I', '-c', prog], { encoding: 'utf8' }));
}

test('builds: matmul (on matvec) and transpose pass their tests and a swarm; each decoy fails', () => {
  for (const u of buildMatmul.uses ?? []) assert.ok(SOURCES[u], `known library source ${u}`);
  const lib = (buildMatmul.uses ?? []).map((u) => SOURCES[u]).join('\n');
  assert.ok(runPy(lib, buildMatmul.solution, 'matmul', MATMUL_TESTS).every(Boolean));
  assert.ok(runPy('', buildTranspose.solution, 'transpose', TRANSPOSE_TESTS).every(Boolean));
  const r = rng(13);
  const sw = Array.from({ length: 60 }, (_, i) => { const [A, B] = matmulCase(r, ['cadet', 'navigator', 'commander'][i % 3]); return { args: [A, B], expect: matMul(A, B) }; });
  assert.ok(runPy(lib, buildMatmul.solution, 'matmul', sw).every(Boolean));
  const st = Array.from({ length: 30 }, (_, i) => { const [A] = transposeCase(r, ['cadet', 'navigator', 'commander'][i % 3]); return { args: [A], expect: transpose(A) }; });
  assert.ok(runPy('', buildTranspose.solution, 'transpose', st).every(Boolean));
  for (const decoy of buildMatmul.assemble!.decoys!) {
    const lines = buildMatmul.assemble!.lines.slice();
    if (decoy.includes('columns =')) lines[2] = decoy; else lines[3] = decoy;
    assert.ok(runPy(lib, `${lines.join('\n')}\n`, 'matmul', MATMUL_TESTS).some((ok) => !ok), decoy);
  }
  for (const decoy of buildTranspose.assemble!.decoys!) {
    const lines = buildTranspose.assemble!.lines.slice();
    lines[2] = decoy;
    assert.ok(runPy('', `${lines.join('\n')}\n`, 'transpose', TRANSPOSE_TESTS).some((ok) => !ok), decoy);
  }
  for (const t of MATMUL_TESTS) assert.ok(meq(matMul(t.args[0] as number[][], t.args[1] as number[][]), t.expect as number[][]), t.name);
  for (const t of TRANSPOSE_TESTS) assert.ok(meq(transpose(t.args[0] as number[][]), t.expect as number[][]), t.name);
});
