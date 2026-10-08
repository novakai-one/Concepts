// Chapter 6: puzzle numbers, pure win checks, doubt predicates, the Law, the strut scan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../site/src/singular/content/chapters/c06-volume/logic.ts';
import { checkLaw, rng } from '../../site/src/singular/game/lawcheck.ts';
import { cross, dot, norm, rank, vadd, vscale } from '../../site/src/singular/math/la.ts';
import { S } from '../../site/src/singular/content/chapters/c06-volume/script.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('p1: the upright box holds 24; the pulse leans it and it still holds 24; the tip slides in z = 4', () => {
  close(L.boxVol(L.P1_U0, L.P1_V, L.P1_W0), 24);
  close(L.boxVol(L.P1_U, L.P1_V, L.P1_W), 24);
  close(L.boxVol(L.P1_U0, L.P1_V, L.P1_W), 24, 1e-9);
  for (const s of L.P1_SPOTS) close(L.boxVol(s, L.P1_V, L.P1_W), 24);
  const spots: number[][] = [];
  for (const s of L.P1_SPOTS) { assert.ok(L.p1Accept(spots, s), `${s}`); spots.push(s); }
  assert.ok(L.p1Won(spots));
  assert.ok(!L.p1Accept([], [1, 1, 3]), 'a lower tip holds 18, not 24');
  close(L.boxVol([1, 1, 3], L.P1_V, L.P1_W), 18);
  assert.ok(!L.p1Accept([], L.P1_U), 'the starting spot does not count');
  assert.ok(!L.p1Accept([[2, 1, 4]], [2.2, 1, 4]), 'the same spot twice does not count');
});

test('p1: the volume tolerance is base area 6 times the height tolerance (±0.05; commander ±0.01)', () => {
  // a tip 3.92 up reads 23.52: not 24 at any difficulty
  assert.ok(!L.p1Accept([], [2, 1, 3.92]), '23.52 is not 24 (height off by 0.08)');
  assert.ok(!L.p1Accept([], [2, 1, 3.92], 0.01));
  // 3.96 up reads 23.76: within ±0.05 in height, not within ±0.01
  assert.ok(L.p1Accept([], [2, 1, 3.96]));
  assert.ok(!L.p1Accept([], [2, 1, 3.96], 0.01));
  assert.ok(L.p1Accept([], [2, 1, 3.995], 0.01));
  close(L.baseArea(L.P1_V, L.P1_W), 6);
});

test('p2: base 6 (|v × w|), height 4 (shadow on the unit normal), volume 24 = u · (v × w); tile orders', () => {
  assert.deepEqual(L.P2.cross, [0, 0, 6]);
  close(L.P2.base, 6); close(L.P2.height, 4); close(L.P2.volume, 24); close(L.P2.triple, 24);
  close(L.baseArea(L.P1_V, L.P1_W) * L.height(L.P1_U, L.P1_V, L.P1_W), L.boxVol(L.P1_U, L.P1_V, L.P1_W));
  const r = rng(3);
  for (let i = 0; i < 100; i++) {
    const v = [r() * 6 - 3, r() * 6 - 3, r() * 6 - 3], w = [r() * 6 - 3, r() * 6 - 3, r() * 6 - 3], u = [r() * 6 - 3, r() * 6 - 3, r() * 6 - 3];
    close(L.baseArea(v, w) * L.height(u, v, w), L.boxVol(u, v, w), 1e-9);
  }
  assert.ok(L.p2OrderOk(['t1', 't2', 't3', 't4', 't5']));
  assert.ok(L.p2OrderOk(['t2', 't1', 't3', 't4', 't5']));
  assert.ok(L.p2OrderOk(['t2', 't3', 't1', 't4', 't5']));
  assert.ok(!L.p2OrderOk(['t1', 't3', 't2', 't4', 't5']), 'the height needs the unit normal first');
  assert.ok(!L.p2OrderOk(['t1', 't2', 't3', 't5', 't4']));
  assert.ok(!L.p2OrderOk(['t1', 't2', 'x1', 't4', 't5']), 'the decoy (height = |u|) is not a step');
});

test('p3: Section C is flat (a × b = (2, −4, 2), volume 0, c = ½a + ½b); the brace k = 4 gives 6', () => {
  assert.deepEqual(L.C_AB, [2, -4, 2]);
  close(L.braceVol(1), 0);
  assert.deepEqual(vadd(vscale(L.C_A, 0.5), vscale(L.C_B, 0.5)), L.C_C0);
  assert.equal(rank([L.C_A, L.C_B, L.C_C0]), 2);
  close(L.braceVol(L.C_K), 6);
  assert.ok(L.p3Won(4));
  assert.ok(!L.p3Won(3), 'k = 3 holds 4');
  assert.ok(!L.p3Won(-2), 'k = −2 logs −6: the other side of the base');
  close(L.braceVol(-2), -6);
});

test('p3: the plane patch is anchored on the plane of a and b (through the origin and the flat c)', () => {
  assert.deepEqual(L.C_MID, [0.75, 0.75, 0.75]);
  close(dot(L.C_AB, L.C_MID), 0);
  for (const q of [L.C_A, L.C_B, L.C_C0]) close(dot(L.C_AB, q), 0);
});

test('p4: the clamps share a plane (edge arrows from P enclose 0); positions from the origin give −1; bent S gives 1/3', () => {
  assert.deepEqual(L.P4.e1, [1, 1, 0]); assert.deepEqual(L.P4.e2, [0, 1, 1]); assert.deepEqual(L.P4.e3, [1, 2, 1]);
  assert.deepEqual(L.P4.cross, [-1, 1, -1]);
  close(L.P4.triple, 0);
  assert.ok(L.coplanar4(L.CL_P, L.CL_Q, L.CL_R, L.CL_S));
  close(L.CL_TRAP, -1);
  assert.ok(Math.abs(L.CL_TRAP) > 0.5, 'the trap gives the wrong verdict');
  assert.deepEqual(L.P4.bent, [1, 2, 3]);
  assert.deepEqual(L.P4.crossBent, [1, 1, -1]);
  close(L.P4.box, 2);
  close(L.P4.tet, 1 / 3);
  close(L.tetVol(L.CL_P, L.CL_Q, L.CL_R, L.CL_S_BENT), 1 / 3);
  assert.ok(!L.coplanar4(L.CL_P, L.CL_Q, L.CL_R, L.CL_S_BENT));
});

test('p5: the log (across, along, up) reads −24; swapping the first two restores the rule and +24; every swap flips the sign', () => {
  close(L.logVol(L.N7_LOG0), -24);
  close(L.logVol([0, 1, 2]), 24);
  for (const [i, j] of [[0, 1], [1, 2], [0, 2]]) close(L.logVol(L.swapLog(L.N7_LOG0, i, j)), 24);
  assert.ok(L.p5Won(L.swapLog(L.N7_LOG0, 0, 1)));
  assert.ok(!L.p5Won(L.swapLog(L.N7_LOG0, 1, 2)), 'positive, but a turn of the rule, not the rule');
  assert.ok(L.isCyclicOfRule(L.swapLog(L.N7_LOG0, 1, 2)));
  assert.ok(!L.p5Won(L.N7_LOG0));
});

test('p5: Show me reaches the rule from every log the player can reach, in at most two swaps', () => {
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const start of perms) {
    let order = start.slice();
    let n = 0;
    while (!L.p5Won(order) && n < 3) {
      const [i, j] = L.p5NextSwap(order);
      assert.ok(i >= 0 && j >= 0 && i !== j, `${order}`);
      order = L.swapLog(order, i, j);
      n++;
    }
    assert.ok(L.p5Won(order), `from ${start}`);
    assert.ok(n <= 2, `from ${start}: ${n} swaps`);
    close(L.logVol(order), 24);
  }
  // after the player's Swap 2 ↔ 3 (or 1 ↔ 3) from the first log, a fixed Swap 1 ↔ 2 would not win
  assert.ok(!L.p5Won(L.swapLog(L.swapLog(L.N7_LOG0, 1, 2), 0, 1)));
  assert.ok(!L.p5Won(L.swapLog(L.swapLog(L.N7_LOG0, 0, 2), 0, 1)));
});

test('p6: (0, 3, 0) × (1, 1, 4) = (12, 0, −3); the box holds 24; the six tetrahedra hold 4 each; piece 0 is the housing', () => {
  assert.deepEqual(L.P6.cross, [12, 0, -3]);
  close(L.P6.box, 24); close(L.P6.housing, 4);
  const six = L.sixTets(L.H_A, L.H_B, L.H_C);
  assert.equal(six.length, 6);
  for (const t of six) close(L.tetOf(t), 4, 1e-9);
  close(six.reduce((s, t) => s + L.tetOf(t), 0), 24, 1e-9);
  assert.deepEqual(six[0], [[0, 0, 0], L.H_A, L.H_B, L.H_C]);
  const r = rng(9);
  for (let i = 0; i < 50; i++) {
    const a = [r() * 4 - 2, r() * 4 - 2, r() * 4 - 2], b = [r() * 4 - 2, r() * 4 - 2, r() * 4 - 2], c = [r() * 4 - 2, r() * 4 - 2, r() * 4 - 2];
    const box = Math.abs(L.triple(a, b, c));
    for (const t of L.sixTets(a, b, c)) close(L.tetOf(t), box / 6, 1e-9);
  }
});

test('p7: the three turns of the order agree; a swap does not', () => {
  const r = rng(5);
  for (let i = 0; i < 200; i++) {
    const u = [r() * 6 - 3, r() * 6 - 3, r() * 6 - 3], v = [r() * 6 - 3, r() * 6 - 3, r() * 6 - 3], w = [r() * 6 - 3, r() * 6 - 3, r() * 6 - 3];
    assert.ok(L.cyclicSame(u, v, w));
  }
  close(L.triple([1, 0, 0], [0, 1, 0], [0, 0, 1]), 1);
  close(L.triple([0, 1, 0], [1, 0, 0], [0, 0, 1]), -1);
});

test('doubt (F) leaning loses volume: a lean with the tip at the same height keeps 24 and breaks it', () => {
  assert.equal(L.leanLoses([2, 1, 4]), false, 'the canonical counterexample');
  assert.equal(L.leanLoses([1, 1, 5]), false, 'leaning and lifting gains volume');
  assert.equal(L.leanLoses([0, 0, 4]), true, 'not leaned: the claim says nothing');
  assert.equal(L.leanLoses([3, 0, 2]), true, 'leaned and lower: it did lose volume');
  // the Shake's random leans find a counterexample quickly
  const r = rng(77);
  let broke = false;
  for (let i = 0; i < 10 && !broke; i++) broke = !L.leanLoses([Math.round(r() * 6 - 3), Math.round(r() * 6 - 3), 2 + Math.round(r() * 3)]);
  assert.ok(broke);
});

test('doubt (T) a swap flips the sign: holds on random struts and on the edge cases', () => {
  const r = rng(13);
  for (let i = 0; i < 300; i++) {
    const a = [r() * 8 - 4, r() * 8 - 4, r() * 8 - 4], b = [r() * 8 - 4, r() * 8 - 4, r() * 8 - 4], c = [r() * 8 - 4, r() * 8 - 4, r() * 8 - 4];
    assert.ok(L.swapFlips(a, b, c));
  }
  assert.ok(L.swapFlips([1, 1, 0], [1, 0, 0], [0, 1, 0]));
  assert.ok(L.swapFlips([0, 0, 0], [1, 2, 3], [3, 1, 2]));
  assert.ok(L.swapFlips([2, 4, 6], [1, 2, 3], [0, 1, 5]));
});

test('doubt (T) the reason: b · (a × c) is a turn of a · (c × b), and c × b = −b × c', () => {
  const r = rng(21);
  for (let i = 0; i < 200; i++) {
    const a = [r() * 8 - 4, r() * 8 - 4, r() * 8 - 4], b = [r() * 8 - 4, r() * 8 - 4, r() * 8 - 4], c = [r() * 8 - 4, r() * 8 - 4, r() * 8 - 4];
    close(L.triple(b, a, c), L.triple(a, c, b), 1e-9);
    close(L.triple(a, c, b), -L.triple(a, b, c), 1e-9);
  }
  // the signed-volume card: node 7's struts (along, across, up)
  const [a, b, c] = L.N7;
  close(L.triple(a, b, c), 24); close(L.triple(b, a, c), -24); close(L.triple(a, c, b), -24);
});

test('Say it: zero volume with a base of no area, though the third arrow is not built from the other two', () => {
  const v = [1, 0, 0], w = [2, 0, 0], u = [0, 0, 1];
  close(L.triple(u, v, w), 0);
  close(L.baseArea(v, w), 0);
  assert.equal(rank([v, w, u]), 2, 'still one plane: v is half of w');
  assert.equal(rank([v, w]), 1);
});

test('Law: "coplanar exactly when u · (v × w) is zero" survives 500 cases; every near-miss breaks', () => {
  assert.equal(checkLaw(L.lawCore, L.lawCore.answer).survived, true);
  for (const cond of ['parallel', 'zerovec', 'positive', 'cross']) {
    assert.equal(checkLaw(L.lawCore, { cond }).survived, false, cond);
  }
  // the generator really mixes flat and solid cases
  const r = rng(1);
  let flat = 0;
  for (let i = 0; i < 400; i++) { const c = L.lawCore.gen(r); if (L.coplanar3(c.u, c.v, c.w)) flat++; }
  assert.ok(flat > 100 && flat < 300, `${flat} flat of 400`);
});

test('builds: the crew triple and coplanar agree with the puzzles', () => {
  close(L.crew.triple([2, 0, 0], [1, 3, 0], [1, 1, 4]), 24);
  close(L.crew.triple([1, 0, 0], [0, 1, 0], [0, 0, 1]), 1);
  assert.equal(L.crew.coplanar(L.CL_P, L.CL_Q, L.CL_R, L.CL_S), true);
  assert.equal(L.crew.coplanar(L.CL_P, L.CL_Q, L.CL_R, L.CL_S_BENT), false);
  const r = rng(2);
  let yes = 0;
  for (let i = 0; i < 200; i++) if (L.crew.coplanar(...(L.swarmPoints(r, false) as [number[], number[], number[], number[]]))) yes++;
  assert.ok(yes > 60 && yes < 160, `${yes} of 200 coplanar`);
});

test('strut scan: 5,000 nodes; exactly the Section C boxes are flat; the rest hold volume', () => {
  const nodes = L.hullNodes();
  assert.equal(nodes.length, 5000);
  const vols = nodes.map((n) => L.triple(n.struts[0], n.struts[1], n.struts[2]));
  const v = L.scanVerdict(vols);
  const inC = nodes.filter((n) => n.section === 'C').length;
  assert.equal(v.flatCount, inC);
  nodes.forEach((n, i) => assert.equal(v.flat[i], n.section === 'C'));
  assert.ok(inC > 400 && inC < 900, `${inC} nodes in Section C`);
  // turning a strut set into place on the hull keeps its volume
  for (const n of nodes.slice(0, 50)) assert.ok(norm(cross(n.struts[0], n.struts[1])) > 1, 'base has area');
  void dot;
  // LANTERN's line reports the count the scan computes
  const line = S.scan[0] as { text: string };
  assert.ok(line.text.includes(String(v.flatCount)), line.text);
});
