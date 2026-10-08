// Chapter 13: puzzle numbers, pure win checks (reference wins, misconceptions do not), the honest
// playback (no false flattening), Doubt predicates, the Law, the Procedure and the crew inverse.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../site/src/singular/content/chapters/c13-inverse/logic.ts';
import { framesOf, plan2 } from '../../site/src/singular/content/chapters/c13-inverse/honest.ts';
import { S } from '../../site/src/singular/content/chapters/c13-inverse/script.ts';
import { checkLaw, rng } from '../../site/src/singular/game/lawcheck.ts';
import { det, identity, inverse, matMul, matVec, meq, mpow } from '../../site/src/singular/math/la.ts';
import { T, T3, R2 } from '../../site/src/singular/content/truth.ts';
import { Frac } from '../../site/src/singular/math/frac.ts';
import { gaussJordanSteps, opTex, type RowOp } from '../../site/src/singular/math/rref.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const I2 = identity(2);

test('p1: the undo of a quarter turn is a quarter turn back; turning again is a half turn', () => {
  assert.ok(meq(L.P1_A, R2));
  assert.ok(meq(L.P1_UNDO, [[0, 1], [-1, 0]]));
  assert.ok(L.p1Won(L.P1_UNDO));
  assert.ok(L.p1Won([[0.02, 1], [-1, 0.03]]) && !L.p1Won([[0.02, 1], [-1, 0.03]], 0.01));
  assert.ok(!L.p1Won(L.P1_SAME_WAY), 'turning the same way again');
  assert.ok(meq(matMul(L.P1_SAME_WAY, L.P1_A), [[-1, 0], [0, -1]]));
  assert.ok(!L.p1Won([[0, 1], [1, 0]]), 'a flip is not the undo');
});

test('p2: (1, −1) and (−1, 2) land on e₁ and e₂; as columns they undo A from either side', () => {
  assert.deepEqual(matVec(L.P2_A, L.P2_TO_E1), [1, 0]);
  assert.deepEqual(matVec(L.P2_A, L.P2_TO_E2), [0, 1]);
  assert.ok(L.p2ColumnOk(0, [1, -1]) && L.p2ColumnOk(1, [-1, 2]));
  assert.ok(!L.p2ColumnOk(0, [1, 0]) && !L.p2ColumnOk(1, [0, 1]));
  assert.ok(L.p2Won(L.P2_UNDO));
  assert.ok(meq(matMul(L.P2_UNDO, L.P2_A), I2), 'undo after the move too');
  assert.ok(!L.p2Won(L.P2_A) && !L.p2Won(L.P2_ENTRY_RECIP), 'the move itself, and one over each entry');
});

test('p3: the undo of the routine pulse T is [[−1, 2], [−1, 1]], which is also T³', () => {
  assert.ok(meq(L.P3_A, T));
  assert.ok(meq(L.P3_UNDO, [[-1, 2], [-1, 1]]));
  assert.ok(L.p3Won(L.P3_UNDO));
  assert.ok(meq(mpow(T, 3), L.P3_UNDO), 'three more routine pulses');
  assert.ok(!L.p3Won(T) && !L.p3Won([[1, 2], [1, 1]]), 'T itself, and T with the minus signs dropped');
  close(det(T3), 0.8, 1e-12);
  assert.ok(S.close.some((l) => !Array.isArray(l) && l.text.includes('times 0.8')), 'the close names the volume factor from truth.ts');
  assert.ok(S.p3Win.some((l) => !Array.isArray(l) && l.text.includes('(−1, −1) and (2, 1)')), 'the win line names the columns of T⁻¹');
});

test('p4: [A | I] → [I | A⁻¹] with the five reference moves; the same moves solve A X = B', () => {
  assert.ok(meq(L.P4_INV, [[0.5, -0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, 0.5]]));
  const end = L.playOps(L.augWithI(L.P4_A), L.P4_REF_OPS);
  assert.ok(L.leftIsI(end, 3));
  assert.ok(meq(L.rightOf(end, 3), L.P4_INV));
  // the stack of elementary matrices is the inverse
  const stack = L.P4_REF_OPS.reduce((acc, op) => matMul(L.elementary(op, 3), acc), identity(3));
  assert.ok(meq(stack, L.P4_INV));
  assert.ok(meq(matMul(stack, L.P4_A), identity(3)));
  // A X = B with the same moves
  const endB = L.playOps(L.P4_A.map((r, i) => [...r, ...L.P4_B[i]]), L.P4_REF_OPS);
  assert.ok(meq(L.rightOf(endB, 3), [[1, 0], [0, 0], [2, 1]]));
  assert.ok(meq(matMul(L.P4_A, L.P4_X), L.P4_B));
  assert.ok(L.p4TypedOk(L.P4_INV) && !L.p4TypedOk(L.P4_A) && !L.p4TypedOk(identity(3)));
  // stopping after clearing below leaves the left half unfinished
  assert.ok(!L.leftIsI(L.playOps(L.augWithI(L.P4_A), L.P4_REF_OPS.slice(0, 3)), 3));
  close(det(L.P4_A), 2);
});

test('p4 Show me: finishing from the player\'s partial moves still writes A⁻¹ and solves A X = B', () => {
  const add = (i: number, j: number, k: number): RowOp => ({ kind: 'add', i, j, k: new Frac(k) });
  // the bug: the five reference moves on top of R3 − R1 do not reach I
  const off = L.playOps(L.augWithI(L.P4_A), [add(2, 0, -1), ...L.P4_REF_OPS]);
  assert.ok(!L.leftIsI(off, 3));
  for (const start of [[add(2, 0, -1)], [add(2, 0, -1), { kind: 'swap', i: 0, j: 1 } as RowOp], [{ kind: 'scale', i: 1, k: new Frac(-3) } as RowOp]]) {
    const mid = L.playOps(L.augWithI(L.P4_A), start);
    const rest = gaussJordanSteps(mid, 3).ops;
    const end = L.playOps(mid, rest);
    assert.ok(L.leftIsI(end, 3), `left half from ${JSON.stringify(start.map(opTex))}`);
    assert.ok(meq(L.rightOf(end, 3), L.P4_INV));
    // the replay runs the player's moves plus the continuation on [A | B]
    const endB = L.playOps(L.P4_A.map((r, i) => [...r, ...L.P4_B[i]]), [...start, ...rest]);
    assert.ok(meq(L.rightOf(endB, 3), L.P4_X));
  }
  // nothing left to play once the left half is I
  assert.equal(gaussJordanSteps(L.playOps(L.augWithI(L.P4_A), L.P4_REF_OPS), 3).ops.length, 0);
  // the readout label keeps the half as a fraction: R_3 → ½ R_3, not "1/2R3"
  assert.match(opTex(L.P4_REF_OPS[2]), /frac\{1\}\{2\}/);
});

test('p5: turned then sheared is undone shear first: (SR)⁻¹ = R⁻¹S⁻¹', () => {
  assert.ok(meq(L.P5_FRAME, matMul(L.SHEAR, L.TURN)));
  assert.ok(L.p5Won(L.P5_REF));
  assert.ok(!L.p5Won(L.P5_WRONG), 'turn undone first');
  assert.ok(!L.p5Won(['turn', 'shear']) && !L.p5Won(['shear', 'turn']) && !L.p5Won(['undo-shear']));
  assert.ok(meq(L.chainOf(L.P5_REF), inverse(L.P5_FRAME)!));
});

test('p6: (2, 0) and (0, 1) both land on (2, 4); no undo unflattens it', () => {
  assert.deepEqual(L.P6_LAND, [2, 4]);
  assert.deepEqual(matVec(L.P6_A, L.P6_PAIR[1]), [2, 4]);
  assert.ok(L.p6Won(L.P6_PAIR[0], L.P6_PAIR[1]));
  assert.ok(L.p6Won([1, 1], [3, 0]) && L.p6Won([-1, 1], [1, 0]));
  assert.ok(!L.p6Won([2, 0], [2, 0]), 'the same point twice');
  assert.ok(!L.p6Won([2, 0], [0, 2]));
  close(det(L.P6_A), 0);
  assert.equal(inverse(L.P6_A), null);
  const r = rng(13);
  for (let i = 0; i < 50; i++) assert.ok(L.stillFlat([[r() * 6 - 3, r() * 6 - 3], [r() * 6 - 3, r() * 6 - 3]]));
});

test('p7 [S]: L U = A with the multipliers 2, 4, 3', () => {
  assert.ok(meq(matMul(L.P7_L, L.P7_U), L.P7_A));
  const won = S.p7Win.map((l) => (Array.isArray(l) ? l[1] : l.text)).join(' ');
  assert.ok(!/joint/.test(won), 'P7_A is not a joint\'s matrix');
  assert.match(won, /new right-hand side/, 'answers Bram: L and U are reused for each new right-hand side');
});

test('story: the bow damage is the last pulse, not years of build-up (T⁴ = I on the ground layer)', () => {
  assert.ok(meq(mpow(T, 4), I2));
  const open = S.open.map((l) => (Array.isArray(l) ? l[1] : l.text)).join(' ');
  assert.ok(!/years/i.test(open), 'the ground layer comes home every fourth pulse');
});

test('honest playback: no frame flattens or flips unless the move itself does', () => {
  const area = (W: number[][]) => W[0][0] * W[1][1] - W[0][1] * W[1][0];
  for (const S2 of [L.P1_UNDO, L.P3_UNDO, L.P2_UNDO, L.SHEAR, inverse(L.SHEAR)!, T, [[2, 0], [0, 3]], [[1, 2], [3, 7]]]) {
    const frames = framesOf(S2, I2, 40);
    assert.ok(frames.every((W) => area(W) > 1e-6), `a frame of ${JSON.stringify(S2)} went flat`);
    assert.ok(meq(frames[frames.length - 1].map((r) => r.slice(0, 2)).slice(0, 2), S2, 1e-9));
  }
  // a flip plays as a half-turn through 3-D: the frames keep their size (det of the 3×3 is ±det S)
  for (const F of [[[0, 1], [1, 0]], [[-1, 0], [0, 1]], [[1, 2], [3, 4]]]) {
    const st = plan2(F);
    assert.equal(st[st.length - 1].kind, 'flip');
    const frames = framesOf(F, I2, 40);
    const d3 = (W: number[][]) => det(W);
    assert.ok(frames.every((W) => Math.abs(d3(W)) > 1e-6), 'no flat in-between in 3-D');
    assert.ok(meq(frames[frames.length - 1].map((r) => r.slice(0, 2)).slice(0, 2), F, 1e-9));
  }
  // a flattening move is flat only at the very end
  const fr = framesOf(L.P6_A, I2, 40);
  assert.ok(fr.slice(0, -1).every((W) => area(W) > 1e-9));
  close(area(fr[fr.length - 1]), 0, 1e-9);
});

test('Doubts: canonical constructions give the right verdict; the Shake finds the breaking case', () => {
  // (F) not all zeros ⇒ undo: the projection breaks it
  assert.ok(!L.nonzeroHasUndo([[1, 0], [0, 0]]) && !L.nonzeroHasUndo([[1, 2], [2, 4]]));
  assert.ok(L.nonzeroHasUndo([[2, 1], [1, 1]]) && L.nonzeroHasUndo([[0, 0], [0, 0]]));
  // (F) (AB)⁻¹ = A⁻¹B⁻¹: a shear and a turn break it; the true rule reverses the order
  const A = [[1, 1], [0, 1]], B = [[0, -1], [1, 0]];
  assert.ok(!L.inverseOfProductClaim(A, B));
  assert.ok(L.reversedRule(A, B));
  assert.ok(L.inverseOfProductClaim([[2, 0], [0, 3]], [[5, 0], [0, 1]]), 'pairs that commute agree with the claim');
  let broke = false;
  const r = rng(99);
  for (let i = 0; i < 5 && !broke; i++) {
    const m = () => { let M: number[][]; do { M = [[Math.floor(r() * 5) - 2, Math.floor(r() * 5) - 2], [Math.floor(r() * 5) - 2, Math.floor(r() * 5) - 2]]; } while (Math.abs(det(M)) < 1e-9); return M; };
    broke = !L.inverseOfProductClaim(m(), m());
  }
  assert.ok(broke, 'five random invertible pairs include one that breaks it');
  // (T) a flip can be undone: every random flip has an undo
  assert.ok(L.flipCanUndo([[0, 1], [1, 0]]) && L.flipCanUndo([[1, 2], [3, 4]]));
  for (let i = 0; i < 200; i++) {
    const M = [[Math.floor(r() * 7) - 3, Math.floor(r() * 7) - 3], [Math.floor(r() * 7) - 3, Math.floor(r() * 7) - 3]];
    assert.ok(L.flipCanUndo(M));
  }
});

test('Law: "A is invertible exactly when no two points land on one spot" survives; near-misses break', () => {
  assert.ok(checkLaw(L.lawCore, L.lawCore.answer).survived);
  assert.ok(checkLaw(L.lawCore, { kind: 'singular', cond: 'apart' }).survived === false);
  for (const cond of ['no-zero', 'not-zero', 'no-flip']) {
    assert.equal(checkLaw(L.lawCore, { kind: 'inverse', cond }).survived, false, cond);
    assert.equal(checkLaw(L.lawCore, { kind: 'singular', cond }).survived, false, `singular ${cond}`);
  }
});

test('Procedure: the reference order inverts the test case; dropping each key step fails', () => {
  const ok = L.runProcedure(L.PROC_REF);
  assert.ok(ok.ok, ok.message);
  assert.ok(meq(L.rightOf(ok.steps[ok.steps.length - 1].m, 2), L.PROC_INV));
  assert.ok(meq(L.PROC_INV, [[-0.5, 1], [0.5, 0]]));
  for (const drop of ['find', 'swap', 'scale', 'clear', 'both']) {
    const r = L.runProcedure(L.PROC_REF.filter((t) => t !== drop));
    assert.equal(r.ok, false, `dropping ${drop}`);
  }
  assert.equal(L.runProcedure(['find', 'swap', 'scale', 'both']).failed, 'left');
  assert.match(L.runProcedure(['find', 'swap', 'scale', 'clear']).message, /right half is still I/);
  assert.equal(L.runProcedure(['find', 'scale', 'swap', 'clear', 'both']).failed, 'divide', 'scale before swap');
  assert.equal(L.runProcedure(['find', 'swap', 'clear', 'scale', 'both']).ok, false, 'clear before scale');
  assert.equal(L.runProcedure([...L.PROC_REF, 'left-only']).ok, false, 'decoy: left half only');
  assert.equal(L.runProcedure(['find', 'swap', 'scale', 'clear-below', 'both']).ok, false, 'decoy: clear below only');
});

test('Build crew: inverse matches the library on invertible cases and returns null on flat ones', () => {
  const r = rng(5);
  let flat = 0;
  for (let i = 0; i < 300; i++) {
    const M = L.swarmMatrix(r, i % 3 === 0 ? 'cadet' : i % 3 === 1 ? 'navigator' : 'commander');
    const X = L.crewInverse(M);
    if (Math.abs(det(M)) < 1e-9) { assert.equal(X, null); flat++; continue; }
    assert.ok(X && meq(matMul(M, X), identity(M.length), 1e-9));
  }
  assert.ok(flat > 10, 'the swarm includes flat matrices');
  assert.ok(meq(L.crewIdentity(3), identity(3)));
});
