// Chapter 2: story numbers, pure win checks, doubt predicates, the Law, and the builds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as L from '../../site/src/singular/content/chapters/c02-span/logic.ts';
import { buildLincomb, buildReachable } from '../../site/src/singular/content/chapters/c02-span/build.ts';
import { checkLaw, rng, rint } from '../../site/src/singular/game/lawcheck.ts';
import { combo, cross, dot, norm, solve, veq, vscale } from '../../site/src/singular/math/la.ts';
import { C2, HATCH } from '../../site/src/singular/content/truth.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('p2, p3, p4: the dials the GDD gives land on the beacons, and only those', () => {
  for (const [t, d] of [[L.P2_TARGET, L.P2_DIALS], [L.P3_TARGET, L.P3_DIALS], [L.P4_TARGET, L.P4_DIALS]]) {
    assert.ok(veq(combo(d, [L.V, L.W]), t));
    const s = solve([[L.V[0], L.W[0]], [L.V[1], L.W[1]]], t);
    assert.equal(s.kind, 'unique');
    if (s.kind === 'unique') assert.ok(veq(s.x, d), 'unique weights');
  }
  assert.deepEqual(L.P2_DIALS, [2, 1]);
  assert.deepEqual(L.P3_DIALS, [-1, 2]);
  assert.deepEqual(L.P4_DIALS, [1, 2]);
  // the misconception attempts miss
  assert.ok(!L.landedOn(combo([1, 2], [L.V, L.W]), L.P2_TARGET));
  assert.ok(!L.landedOn(combo([0, 1.5], [L.V, L.W]), L.P3_TARGET), 'no negative dial cannot reach (0, 5)');
  // p4 by substitution: b = 4 − 2a; a + 3(4 − 2a) = 7 → −5a = −5
  assert.equal(7 - 12, -5);
  assert.equal(4 - 2 * 1, 2);
});

test('p1 [F]: only k = 4 collapses the glow; a beacon off the line wins, one on it does not', () => {
  const hits: number[] = [];
  for (let k = -3; k <= 8; k += 0.5) if (L.p1Collapsed(k)) hits.push(k);
  assert.deepEqual(hits, [4]);
  assert.equal(L.spanDim([L.P1_V, L.p1W(4)]), 1);
  assert.equal(L.spanDim([L.P1_V, L.p1W(3)]), 2);
  assert.ok(L.p1Won(4, [2, 0]));
  assert.ok(!L.p1Won(4, [-2, -4]), 'the starting beacon is on the line');
  assert.ok(!L.p1Won(3, [2, 0]), 'not collapsed: everything is reachable');
  assert.ok(L.p1Collapsed(4.04, 0.05) && !L.p1Collapsed(4.04, 0.01), 'commander tolerance is tighter');
});

test('p5: the backup thruster is −2 times thruster two; the pair reaches one line', () => {
  assert.ok(veq(L.BACKUP, vscale(L.V, -2)));
  assert.equal(L.spanDim([L.V, L.BACKUP]), 1);
  assert.ok(L.p5Won([0, 3]));
  assert.ok(!L.p5Won([4, 2]), 'the starting beacon is on the line');
  assert.ok(!L.p5Won([-2, -1]));
  const f = L.nearestInSpan([L.V], [0, 3]);
  close(dot(f, [-1, 2]), 0);
});

test('p1, p5: a beacon LANTERN calls "on the line" is reached exactly; the just-off ones are out of reach and do not win', () => {
  // the navigator half-grid within ±6 (the pad snaps to 0.5)
  const grid: number[][] = [];
  for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) grid.push([i / 2, j / 2]);
  let near1 = 0, near5 = 0;
  for (const q of grid) {
    // p1: the line through v = (1, 2); LANTERN's weight t = (x + 2y) / 5
    const d1 = L.distToSpan([L.P1_V], q);
    if (d1 < 1e-6) assert.ok(veq(vscale(L.P1_V, (q[0] + 2 * q[1]) / 5), q), `p1 ${q}: t v rebuilds it`);
    else {
      assert.ok(!veq(vscale(L.P1_V, (q[0] + 2 * q[1]) / 5), q), `p1 ${q}: off the line, no t reaches it`);
      if (d1 < 0.3) { near1++; assert.ok(!L.p1Won(4, q), `p1 ${q}: too close to win`); }
      else assert.ok(L.p1Won(4, q));
    }
    // p5: the line through v = (2, 1); LANTERN's weights come from weights2
    const d5 = L.distToSpan([L.V], q);
    if (d5 < 1e-6) {
      const ab = L.weights2(L.V, L.BACKUP, q, 0.5);
      assert.ok(veq(combo(ab, [L.V, L.BACKUP]), q), `p5 ${q}: the stated dials rebuild it`);
    } else if (d5 < 0.3) { near5++; assert.ok(!L.p5Won(q), `p5 ${q}: too close to win`); }
    else assert.ok(L.p5Won(q));
  }
  assert.equal(near1, 24);
  assert.equal(near5, 24);
  close(L.distToSpan([L.P1_V], [0.5, 0.5]), 1 / Math.sqrt(20), 1e-12);
  close(L.distToSpan([L.V], [0.5, 0.5]), 1 / Math.sqrt(20), 1e-12);
});

test('p6 [D]: R = P + t(Q − P) has dials (1 − t, t); the unlocked thrusters reach z = x + y; the signal is off it', () => {
  for (const t of [-1, 0, 0.5, 1, 2, 2.5]) {
    const R = combo([1 - t, t], [L.V, L.W]);
    assert.ok(veq(R, combo(L.p6Dials(t), [L.V, L.W])));
    assert.ok(veq(R, [L.V[0] + t * (L.W[0] - L.V[0]), L.V[1] + t * (L.W[1] - L.V[1])]));
  }
  assert.ok(veq(combo(L.p6Dials(L.P6_T), [L.V, L.W]), [0, 5]));
  assert.deepEqual(L.p6Dials(2), [-1, 2]);
  assert.deepEqual(L.THRUST3, [[1, 0, 1], [0, 1, 1]]);
  assert.deepEqual(L.THRUST3, [[C2[0][0], C2[1][0], C2[2][0]], [C2[0][1], C2[1][1], C2[2][1]]], 'the thrusters are the first two columns of the two-decimal model');
  assert.ok(veq(combo(L.BEACON3_DIALS, L.THRUST3), L.BEACON3));
  assert.ok(veq(L.PLANE_N, [-1, -1, 1]));
  for (const [a, b] of [[2, 3], [-1, 4], [0.5, -2]]) { const p = combo([a, b], L.THRUST3); close(p[2], p[0] + p[1]); }
  assert.deepEqual(L.SIGNAL, HATCH);
  close(L.distToSpan(L.THRUST3, L.SIGNAL), 2 / Math.sqrt(3), 1e-12);
  assert.ok(L.distToSpan(L.THRUST3, [1, 1, 2]) < 1e-12, 'from above, (1, 1) is reached at height 2');
  // the Show me camera is edge-on; the opening 3-D view is not
  const e = (14 * Math.PI) / 180;
  const a = [1 / Math.SQRT2, -1 / Math.SQRT2, 0], b = [1 / Math.sqrt(6), 1 / Math.sqrt(6), 2 / Math.sqrt(6)];
  const dir = a.map((x, i) => Math.cos(e) * x + Math.sin(e) * b[i]);
  assert.ok(L.edgeOn(dir.map((x) => -x)));
  const az = (-62 * Math.PI) / 180, el = (24 * Math.PI) / 180;
  assert.ok(!L.edgeOn([-Math.cos(el) * Math.cos(az), -Math.cos(el) * Math.sin(az), -Math.sin(el)]));
});

test('p7 [S]: amber is a mix of the three lamps; pure green is off the warm–cool plane', () => {
  assert.ok(veq(combo(L.AMBER_DIALS, [L.LAMP_GREEN, L.LAMP_RED, L.LAMP_BLUE]), L.AMBER));
  assert.ok(L.p7OffPlane([0, 1, 0]));
  assert.ok(!L.p7OffPlane([0.5, 0.5, 0.5]), 'grey is half warm plus half cool');
  assert.ok(!L.p7OffPlane([1, 1, 1].map((x) => x * 0.8)));
  assert.ok(!L.p7OffPlane([1.2, 0, 0]), 'outside the colour cube');
  assert.ok(norm(cross(L.LAMP_WARM, L.LAMP_COOL)) > 0);
});

test('p7 [S]: on the 0.1 probe grid every colour is either exactly a mix (weights in 0..1) or counts as off the plane', () => {
  const n = [0.5, -1, 0.5];
  let off = 0, onPlane = 0, justOff = 0;
  for (let r = 0; r <= 10; r++) for (let g = 0; g <= 10; g++) for (let b = 0; b <= 10; b++) {
    const probe = [r / 10, g / 10, b / 10];
    const d = L.distToSpan([L.LAMP_WARM, L.LAMP_COOL], probe);
    if (L.p7OffPlane(probe)) {
      off++;
      if (d < 0.05) justOff++;
      continue;
    }
    // not off: LANTERN names the weights, so they must rebuild the probe, and a lamp has no negative weight
    assert.ok(d < 1e-6, `${probe}: distance ${d} is neither on nor off`);
    const [wa, wb] = L.weights2(L.LAMP_WARM, L.LAMP_COOL, probe);
    assert.ok(veq(combo([wa, wb], [L.LAMP_WARM, L.LAMP_COOL]), probe), `${probe}: the weights rebuild it`);
    assert.ok(wa >= -1e-9 && wa <= 1 + 1e-9 && wb >= -1e-9 && wb <= 1 + 1e-9, `${probe}: weights ${wa}, ${wb} in 0..1`);
    onPlane++;
  }
  assert.equal(off + onPlane, 1331);
  assert.equal(justOff, 120, 'the 120 probes with n·p = ±0.05 count as off the plane');
  close(Math.abs(dot(n, [0, 0, 0.1])) / norm(n), 0.05 / Math.sqrt(1.5), 1e-12);
  assert.ok(L.p7OffPlane([0, 0, 0.1]), 'a touch of blue alone is off the plane');
  assert.ok(L.P7_OFF < 0.05 / Math.sqrt(1.5));
});

test('doubt (F) doubling: the doubled dials always land on Bram’s place (the edge case breaks the claim)', () => {
  const r = rng(42);
  for (let i = 0; i < 200; i++) {
    const v = [rint(r, -3, 3), rint(r, -3, 3), rint(r, -3, 3)], w = [rint(r, -3, 3), rint(r, -3, 3), rint(r, -3, 3)];
    const bram = [rint(r, -3, 3) / 2, rint(r, -3, 3) / 2];
    assert.equal(L.doubledNewHolds(v, w, bram, [2 * bram[0], 2 * bram[1]]), false);
  }
  // the canonical construction: dials (3, 2) land on Bram's place 1.5·2v + 1·2w
  assert.equal(L.doubledNewHolds(L.THRUST3[0], L.THRUST3[1], [1.5, 1], [3, 2]), false);
  assert.equal(L.doubledNewHolds(L.THRUST3[0], L.THRUST3[1], [1.5, 1], [1, 1]), true, 'a case that agrees with the claim');
});

test('doubt (T) one thruster backwards: the same reach for every case, zero and parallel included', () => {
  const r = rng(7);
  for (let i = 0; i < 300; i++) {
    const v = [rint(r, -3, 3), rint(r, -3, 3), rint(r, -2, 2)], w = [rint(r, -3, 3), rint(r, -3, 3), rint(r, -2, 2)];
    assert.ok(L.flippedSameHolds(v, w));
  }
  for (const [v, w] of [[[1, 0, 1], [0, 0, 0]], [[1, 2, 0], [-2, -4, 0]], [[0, 0, 0], [1, -1, 2]], [[0, 0, 0], [0, 0, 0]]]) assert.ok(L.flippedSameHolds(v, w));
});

test('Law: the target survives 500 cases; exactly the true fillings survive; forgetting the zero vector breaks', () => {
  assert.equal(checkLaw(L.lawCore, L.lawCore.answer).survived, true);
  const TRUE = new Set(['plane/apart', 'line/onelineNZ', 'point/zero']);
  for (const shape of ['plane', 'line', 'point']) for (const cond of ['apart', 'oneline', 'onelineNZ', 'differ', 'apartOrZero', 'zero']) {
    const r = checkLaw(L.lawCore, { shape, cond });
    assert.equal(r.survived, TRUE.has(`${shape}/${cond}`), `${shape}/${cond}: ${r.counterexample ?? 'survived'}`);
  }
  const forgot = checkLaw(L.lawCore, { shape: 'line', cond: 'oneline' });
  assert.equal(forgot.survived, false);
  assert.match(forgot.counterexample!, /v = \(0, 0\), w = \(0, 0\)/);
});

test('builds: the crew versions pass every listed test', () => {
  for (const t of buildLincomb.tests) assert.deepEqual(L.lincombCrew(...(t.args as [number[], number[][]])), t.expect, t.name);
  for (const t of buildReachable.tests) {
    const got = L.reachableCrew(...(t.args as [number[], number[], number[]]));
    if (t.expect === null) assert.equal(got, null, t.name);
    else assert.ok(got && veq(got, t.expect as number[]), t.name);
  }
  assert.equal(L.reachableCrew([1, 0], [0, 1], [13.7, 0]), null, 'outside the brute-force range');
  assert.deepEqual(buildLincomb.uses, ['scale', 'add']);
});

test('builds: the Python solutions pass their tests (python3)', { skip: spawnSync('python3', ['--version']).status !== 0 }, () => {
  const lib = 'import math\ndef add(v, w):\n    return [a + b for a, b in zip(v, w)]\ndef scale(c, v):\n    return [c * x for x in v]\n';
  const close = 'def close(a, b, tol=1e-6):\n    if a is None or b is None: return a is b\n    if isinstance(a, (int, float)): return abs(a - b) <= tol\n    return len(a) == len(b) and all(close(x, y, tol) for x, y in zip(a, b))\n';
  for (const b of [buildLincomb, buildReachable]) {
    const src = `${lib}${b.solution}\n${close}import json, time\nout = []\nt0 = time.time()\nfor t in json.loads(${JSON.stringify(JSON.stringify(b.tests))}):\n    out.append(close(${b.fn}(*t['args']), t['expect']))\nprint(json.dumps({'ok': out, 'secs': time.time() - t0}))\n`;
    const r = spawnSync('python3', ['-I', '-c', src], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const res = JSON.parse(r.stdout) as { ok: boolean[]; secs: number };
    assert.ok(res.ok.every(Boolean), `${b.fn}: ${JSON.stringify(res.ok)}`);
    assert.ok(res.secs < 2, `${b.fn} took ${res.secs.toFixed(2)} s natively`);
  }
});
