// The row-operation kit's pure logic (kit/rowops-logic.ts) and geometry (kit/system-geom.ts):
// typed multipliers, the multiplier the board fills in, Undo, row colours across swaps, the solution
// read-out, and the hinge the lines / planes turn about.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Frac, fmat, type FMat } from '../../site/src/singular/math/frac.ts';
import { applyOp, gaussJordanSteps, gaussSteps, isRREF, leadCol, type RowOp } from '../../site/src/singular/math/rref.ts';
import {
  eqTex, fracHTML, fracText, inverseOp, linTex, opProblem, parseFrac, pivotCells, readSolution, rowPermutation,
  suggestAddK, suggestScaleK, suggestSource,
} from '../../site/src/singular/kit/rowops-logic.ts';
import {
  clipToSquare, dot, hingeTween, normHyper, planeFrame, planePlaneLine, projectTo, rowHyper, type Vec,
} from '../../site/src/singular/kit/system-geom.ts';

const F = (n: number, d = 1) => new Frac(n, d);
const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const str = (m: FMat) => m.map((r) => r.map(String).join(' ')).join(' / ');

test('typed multipliers parse exactly', () => {
  assert.equal(parseFrac('3')!.toString(), '3');
  assert.equal(parseFrac('-2')!.toString(), '-2');
  assert.equal(parseFrac('−1/3')!.toString(), '-1/3');
  assert.equal(parseFrac(' +4/6 ')!.toString(), '2/3');
  assert.equal(parseFrac('0.5')!.toString(), '1/2');
  assert.equal(parseFrac('-2.25')!.toString(), '-9/4');
  assert.equal(parseFrac('.75')!.toString(), '3/4');
  assert.equal(parseFrac('3/-6')!.toString(), '-1/2');
  for (const bad of ['', 'abc', '1/0', '1/', '--2', '1.2.3', '2x']) assert.equal(parseFrac(bad), null, bad);
});

test('numbers print with a true minus sign; fractions stack in HTML', () => {
  assert.equal(fracText(F(-3, 2)), '−3/2');
  assert.equal(fracText(F(4)), '4');
  assert.equal(fracHTML(F(7)), '7');
  assert.match(fracHTML(F(-1, 3)), /rob-minus.*rob-fr-n">1<.*rob-fr-d">3</);
});

test('the filled-in multiplier clears the entry in the source row\'s pivot column', () => {
  const m = fmat([[2, 1, 4], [1, -1, -1]]);
  // drag R2 onto R1: R1 → R1 + k·R2 with k = −2 clears R1's x entry
  const s = suggestAddK(m, 0, 1, 2);
  assert.equal(s.k.toString(), '-2');
  assert.equal(s.col, 0);
  assert.ok(s.clears);
  const after = applyOp(m, { kind: 'add', i: 0, j: 1, k: s.k });
  assert.ok(after[0][0].isZero());
  // fractions: R2 → R2 + k·R1 with pivot 2 gives k = −1/2
  assert.equal(suggestAddK(m, 1, 0, 2).k.toString(), '-1/2');
  // back substitution: clear the y entry above a pivot
  const r = fmat([[1, -1, -1], [0, 1, 2]]);
  assert.equal(suggestAddK(r, 0, 1, 2).k.toString(), '1');
  // nothing to clear: target already 0 in that column, or the source has no pivot → 1
  const z = fmat([[1, 2, 3], [0, 1, 1], [0, 0, 0]]);
  assert.deepEqual([suggestAddK(z, 1, 0, 2).k.toString(), suggestAddK(z, 1, 0, 2).clears], ['1', false]);
  assert.deepEqual([suggestAddK(z, 0, 2, 2).k.toString(), suggestAddK(z, 0, 2, 2).col], ['1', -1]);
});

test('the suggested row to add: clear below a pivot first, then above', () => {
  const m = fmat([[1, 1, 1, 4], [2, 1, -1, 3], [1, -1, 2, 1]]);
  assert.equal(suggestSource(m, 1, 3), 0); // R2's x entry is under R1's pivot
  assert.equal(suggestSource(m, 2, 3), 0);
  const ref = fmat([[1, 1, 1, 4], [0, 1, 3, 5], [0, 0, 1, 1]]);
  assert.equal(suggestSource(ref, 0, 3), 1); // clear R1's y entry with R2 (pivot in y)
  assert.equal(suggestSource(ref, 1, 3), 2); // clear R2's z entry with R3
  // a row with no pivot is never suggested as the source
  const z = fmat([[0, 0, 0], [1, 2, 3]]);
  assert.equal(suggestSource(z, 0, 2), 1);
});

test('multiply prefill makes the pivot 1', () => {
  const m = fmat([[0, 3, 6], [0, 0, 0]]);
  assert.equal(suggestScaleK(m, 0, 2)!.toString(), '1/3');
  assert.equal(suggestScaleK(m, 1, 2), null);
  assert.equal(suggestScaleK(fmat([[-7, 1, 0]]), 0, 2)!.toString(), '-1/7');
});

test('undo: every operation followed by its inverse gives back the matrix exactly', () => {
  const m = fmat([[2, 1, -1, 8], [-3, -1, 2, -11], [-2, 1, 2, -3]]);
  const ops: RowOp[] = [
    { kind: 'swap', i: 0, j: 2 },
    { kind: 'scale', i: 1, k: F(-2, 3) },
    { kind: 'add', i: 2, j: 0, k: F(5, 7) },
  ];
  for (const op of ops) assert.equal(str(applyOp(applyOp(m, op), inverseOp(op))), str(m));
  // a whole Gauss–Jordan run undone in reverse
  const { ops: run, states } = gaussJordanSteps(m, 3);
  let a = states[states.length - 1];
  for (const op of [...run].reverse()) a = applyOp(a, inverseOp(op));
  assert.equal(str(a), str(m));
});

test('operations that are not allowed say why', () => {
  assert.match(opProblem({ kind: 'scale', i: 0, k: F(0) }, 2)!, /by 0/);
  assert.match(opProblem({ kind: 'scale', i: 0, k: F(1) }, 2)!, /by 1/);
  assert.match(opProblem({ kind: 'add', i: 1, j: 1, k: F(2) }, 2)!, /different row/);
  assert.match(opProblem({ kind: 'add', i: 1, j: 0, k: F(0) }, 2)!, /0 times/);
  assert.match(opProblem({ kind: 'swap', i: 0, j: 3 }, 2)!, /row of this matrix/);
  assert.equal(opProblem({ kind: 'swap', i: 0, j: 1 }, 2), null);
  assert.equal(opProblem({ kind: 'add', i: 0, j: 1, k: F(-1, 2) }, 2), null);
});

test('row colours follow rows through swaps (rowPermutation)', () => {
  const m = fmat([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
  assert.deepEqual(rowPermutation(m, applyOp(m, { kind: 'swap', i: 0, j: 2 })), [2, 1, 0]);
  assert.deepEqual(rowPermutation(m, m), [0, 1, 2]);
  assert.equal(rowPermutation(m, applyOp(m, { kind: 'scale', i: 1, k: F(2) })), null);
  // equal rows keep their own places when they can
  const d = fmat([[1, 1, 1], [1, 1, 1], [0, 1, 2]]);
  assert.deepEqual(rowPermutation(d, d), [0, 1, 2]);
});

test('equations and expressions in TeX', () => {
  assert.equal(eqTex(fmat([[2, 1, 4]])[0], 2), '2x + y = 4');
  assert.equal(eqTex(fmat([[1, -1, 2, 1]])[0], 3), 'x - y + 2z = 1');
  assert.equal(eqTex(fmat([[0, -1, -3, -5]])[0], 3), '-y - 3z = -5');
  assert.equal(eqTex([F(1, 2), F(0), F(3)], 2), '\\tfrac{1}{2}x = 3');
  assert.equal(eqTex(fmat([[0, 0, 0]])[0], 2), '0 = 0');
  assert.equal(linTex([F(0), F(0), F(-2)], ['x', 'y', 'z'], F(3)), '3 - 2z');
  assert.equal(linTex([F(0), F(0), F(1)], ['x', 'y', 'z']), 'z');
});

test('reading the solutions from the matrix', () => {
  const unique = readSolution(fmat([[1, 0, 1], [0, 1, 2]]), 2);
  assert.deepEqual(unique, { kind: 'unique', tex: 'x = 1,\\quad y = 2' });
  assert.equal(readSolution(fmat([[1, -1, -1], [0, 1, 2]]), 2).kind, 'not-yet');
  const none = readSolution(fmat([[1, 2, 4], [0, 0, -5]]), 2);
  assert.deepEqual(none, { kind: 'none', row: 1, tex: '0 = -5' });
  // the shared-line puzzle (c91 p3) once reduced: z free, x = z, y = 3 − 2z
  const R = gaussJordanSteps(fmat([[1, 1, 1, 3], [2, 1, 0, 3], [3, 2, 1, 6]]), 3).states.at(-1)!;
  const inf = readSolution(R, 3);
  assert.equal(inf.kind, 'infinite');
  if (inf.kind === 'infinite') {
    assert.deepEqual(inf.free, [2]);
    assert.equal(inf.tex, 'x = z,\\quad y = 3 - 2z');
  }
  assert.deepEqual(pivotCells(R, 3), [[0, 0], [1, 1]]);
});

test('the showcase puzzles: par and that the steps end where they should', () => {
  const cases: [number[][], number, 'rref' | 'ref', number][] = [
    [[[2, 1, 4], [1, -1, -1]], 2, 'rref', 4],
    [[[1, 1, 1, 4], [2, 1, -1, 3], [1, -1, 2, 1]], 3, 'rref', 8],
    [[[1, 1, 1, 3], [2, 1, 0, 3], [3, 2, 1, 6]], 3, 'rref', 5],
    [[[1, 2, 4], [2, 4, 3]], 2, 'ref', 1],
  ];
  for (const [aug, n, target, par] of cases) {
    const r = (target === 'rref' ? gaussJordanSteps : gaussSteps)(fmat(aug), n);
    assert.equal(r.ops.length, par);
    if (target === 'rref') assert.ok(isRREF(r.states.at(-1)!, n));
  }
});

test('a player who presses A on a row and accepts the filled-in values reaches reduced row echelon form', () => {
  // the player's plan: press A on the first row where the suggested addition clears an entry under a
  // pivot above it, or an entry over a pivot to its right; else press M where a pivot is not 1; else swap rows into order
  const nextOp = (m: FMat, n: number): RowOp | null => {
    for (let i = 0; i < m.length; i++) {
      const j = suggestSource(m, i, n);
      const li = leadCol(m[i], n), lj = leadCol(m[j], n);
      if (li < 0 || lj < 0) continue;
      const s = suggestAddK(m, i, j, n);
      if (s.clears && ((lj === li && j < i) || lj > li)) return { kind: 'add', i, j, k: s.k };
    }
    for (let i = 0; i < m.length; i++) {
      const k = suggestScaleK(m, i, n);
      if (k && !k.isOne()) return { kind: 'scale', i, k };
    }
    const lc = m.map((r) => { const c = leadCol(r, n); return c < 0 ? Infinity : c; });
    const i = lc.findIndex((c, r) => r > 0 && c < lc[r - 1]);
    return i > 0 ? { kind: 'swap', i: i - 1, j: i } : null;
  };
  const systems = [
    [[1, 1, 1, 4], [2, 1, -1, 3], [1, -1, 2, 1]],
    [[1, 1, 1, 3], [2, 1, 0, 3], [3, 2, 1, 6]],
    [[2, 1, 4], [1, -1, -1]],
    [[0, 1, 2, 1], [1, 0, 1, 2], [2, 3, 1, 0]],
    [[1, 2, 4], [2, 4, 3]],
  ];
  for (const aug of systems) {
    const n = aug[0].length - 1;
    let m = fmat(aug);
    let steps = 0;
    for (; steps < 40 && !isRREF(m, n); steps++) {
      const op = nextOp(m, n);
      assert.ok(op, `stuck at ${str(m)}`);
      assert.equal(opProblem(op!, m.length), null);
      m = applyOp(m, op!);
    }
    assert.ok(isRREF(m, n), str(m));
    assert.ok(steps <= 2 * gaussJordanSteps(fmat(aug), n).ops.length + 2, `${steps} steps`);
  }
});

// ------------------------------------------------------------------ geometry

const solves = (h: { n: Vec; c: number }, p: Vec) => close(dot(h.n, p), h.c, 1e-9);

test('a row operation turns the plane about the solution: the point stays on it the whole way', () => {
  const m = fmat([[1, 1, 1, 4], [2, 1, -1, 3], [1, -1, 2, 1]]);
  const sol = [1, 2, 1];
  const ops: RowOp[] = [{ kind: 'add', i: 1, j: 0, k: F(-2) }, { kind: 'add', i: 2, j: 1, k: F(3, 2) }, { kind: 'scale', i: 0, k: F(-1) }];
  for (const op of ops) {
    const after = applyOp(m, op);
    const tw = hingeTween(rowHyper(m[op.i], 3), rowHyper(after[op.i], 3))!;
    assert.ok(tw);
    for (let t = 0; t <= 1.0001; t += 0.125) {
      const h = tw.at(t);
      close(Math.hypot(...h.n), 1);
      solves(h, sol);
    }
    // it ends on the new plane
    const end = normHyper(rowHyper(after[op.i], 3))!;
    const at1 = tw.at(1);
    const sgn = Math.sign(dot(end.n, at1.n));
    end.n.forEach((x, i) => close(x * sgn, at1.n[i]));
    close(end.c * sgn, at1.c);
    if (op.kind === 'scale') assert.equal(tw.kind, 'same');
    else { assert.equal(tw.kind, 'rotate'); solves(normHyper(rowHyper(m[op.i], 3))!, tw.hinge!); }
  }
});

test('lines in 2-D turn about their meeting point; parallel rows slide; 0 = c rows fade', () => {
  const a = rowHyper([1, -1, -1], 2), b = rowHyper([3, 0, 3], 2); // x − y = −1 → 3x = 3
  const tw = hingeTween(a, b)!;
  assert.equal(tw.kind, 'rotate');
  close(tw.hinge![0], 1); close(tw.hinge![1], 2);
  for (let t = 0; t <= 1.0001; t += 0.25) solves(tw.at(t), [1, 2]);
  // the turn is at an even rate
  const ang = (t: number) => Math.atan2(tw.at(t).n[1], tw.at(t).n[0]);
  close(ang(0.5) - ang(0), ang(1) - ang(0.5), 1e-9);
  const slide = hingeTween(rowHyper([1, 2, 4], 2), rowHyper([-2, -4, -3], 2))!;
  assert.equal(slide.kind, 'slide');
  close(slide.at(0.5).c, (4 / Math.sqrt(5) + 1.5 / Math.sqrt(5)) / 2);
  assert.equal(hingeTween(rowHyper([1, 2, 4], 2), rowHyper([0, 0, -5], 2)), null);
});

test('plane frames: level u, v up the slope, both in the plane', () => {
  for (const n0 of [[1, 1, 1], [2, 1, -1], [1, -1, 2], [0, 0, 1], [0, 0, -3], [1, 0, 0]]) {
    const n = normHyper({ n: n0, c: 0 })!.n;
    const [u, v] = planeFrame(n);
    close(Math.hypot(...u), 1); close(Math.hypot(...v), 1);
    close(dot(u, v), 0); close(dot(u, n), 0); close(dot(v, n), 0);
    close(u[2], 0);
    assert.ok(v[2] >= -1e-12);
  }
});

test('where two planes meet, clipped to a patch', () => {
  const a = normHyper(rowHyper([1, 0, 0, 1], 3))!, b = normHyper(rowHyper([0, 1, 0, 2], 3))!;
  const L = planePlaneLine(a, b)!;
  solves(a, L.q); solves(b, L.q);
  close(Math.abs(L.d[2]), 1);
  assert.equal(planePlaneLine(a, normHyper(rowHyper([2, 0, 0, 5], 3))!), null);
  // a square of half-size 3 around (1, 2, 1) in plane a, cut by the line x = 1, y = 2 (along z)
  const c = projectTo(a, [1, 2, 1]);
  const [u, v] = planeFrame(a.n);
  const r = clipToSquare(L.q, L.d, c, u, v, 3)!;
  close(Math.abs(r[1] - r[0]), 6);
  assert.equal(clipToSquare([0, 50, 0], [0, 0, 1], c, u, v, 3), null);
});
