// Chapter 18, the trajectory problem: every fixture's maths (each kept line is A v = λ v, each mission has the
// stated unique launch), the judges (kept / turned, multiplier part by part, plan sorting, typed numbers),
// the progress rule, and the generated rounds (whole numbers, two distinct kept lines, missions reachable).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../site/src/singular/content/chapters/c18-eigen/traj-logic.ts';
import { P1_A, P1_LINES } from '../../site/src/singular/content/chapters/c18-eigen/logic.ts';
import { det, matVec, mpow, veq, type Mat } from '../../site/src/singular/math/la.ts';

const kept = (M: Mat, v: number[], m: number) => assert.ok(veq(matVec(M, v), v.map((x) => x * m), 1e-12), `${JSON.stringify(M)} ${v} ×${m}`);

test('the opening pulse is the old p1 matrix: (1, 1) ×3 and (1, −1) ×1; (1, 0) is turned to (2, 1)', () => {
  assert.deepEqual(T.PULSE_A, P1_A);
  for (const [v, m] of P1_LINES) kept(T.PULSE_A, v, m);
  assert.deepEqual(T.pulseOf(T.PULSE_A, [1, 0]), [2, 1]);
  assert.equal(T.keeps(T.PULSE_A, [1, 0]), false);
  assert.ok(Math.abs(T.lineTurnDeg(T.PULSE_A, [1, 0]) - 26.565) < 0.01);
  for (const v of [[0, 1], [1, 2]]) assert.equal(T.keeps(T.PULSE_A, v), false, `${v}`);
  for (const [v, m] of [[[1, 1], 3], [[2, 2], 3], [[-3, -3], 3], [[1, -1], 1], [[-2, 2], 1], [[0.5, 0.5], 3]] as [number[], number][]) {
    assert.equal(T.multiplierOf(T.PULSE_A, v), m, `${v}`);
  }
  assert.equal(T.keeps(T.PULSE_A, [0, 0]), false, 'the zero vector has no line');
});

test('multiplier answers are judged part by part; (2, 2) is the same line as (1, 1), twice as long', () => {
  const w = T.checkMult(T.PULSE_A, [1, 1], 2);
  assert.equal(w.ok, false); assert.deepEqual(w.scaled, [2, 2]); assert.deepEqual(w.image, [3, 3]); assert.deepEqual(w.bad, [0, 1]);
  assert.equal(T.checkMult(T.PULSE_A, [1, 1], 3).ok, true);
  assert.equal(T.checkMult(T.PULSE_A, [1, -1], 1).ok, true);
  assert.equal(T.checkMult(T.PULSE_A, [1, -1], -1).ok, false);
  // a zero component cannot fail: only the other part is judged
  assert.deepEqual(T.checkMult(T.PULSE_FLIP, [0, 3], 1).bad, [1]);
  assert.equal(T.checkMult(T.PULSE_FLIP, [0, 3], -1).ok, true);
  assert.equal(T.checkMult(T.PULSE_FLAT, [0, 1], 0).ok, true);
  assert.ok(T.onLineOf([1, 1], [2, 2]));
  assert.equal(T.multipleOf([2, 2], [1, 1]), 2);
  assert.equal(T.multipleOf([-1, -1], [1, 1]), -1);
  assert.equal(T.onLineOf([1, 1], [1, -1]), false);
});

test('typed numbers: minus signs, fractions, decimal commas; junk is refused', () => {
  const ok: [string, number][] = [['3', 3], ['-1', -1], ['−2', -2], ['+3', 3], ['.5', 0.5], ['3.', 3], ['3/4', 0.75], ['-2/3', -2 / 3], ['1,5', 1.5], [' 4 ', 4], ['-0', 0]];
  for (const [s, x] of ok) assert.equal(T.parseEntry(s), x, s);
  for (const s of ['', '-', '1e3', '2/0', 'abc', '1.2.3', '--1']) assert.equal(T.parseEntry(s), null, s);
});

test('the missions have the launches the spec states, and only those (each pulse is invertible)', () => {
  assert.deepEqual(T.launchFor(T.M1), [1, 1]);
  assert.deepEqual(T.path(T.M1.M, [1, 1], 2), [[1, 1], [3, 3], [9, 9]]);
  assert.ok(T.reaches(T.M1, [1, 1]));
  for (const v of [[3, 3], [9, 9], [2, 1], [1, -1], [0, 0]]) assert.equal(T.reaches(T.M1, v), false, `${v}`);
  assert.deepEqual(T.launchFor(T.SOLO), [2, 1]);
  kept(T.SOLO_B, [1, 1], 3); kept(T.SOLO_B, [2, 1], 4);
  assert.deepEqual(matVec(mpow(T.SOLO_B, 2), [2, 1]), [32, 16]);
  assert.ok(T.reaches(T.SOLO, [2, 1]) && !T.reaches(T.SOLO, [8, 4]) && !T.reaches(T.SOLO, [1, 1]));
  assert.deepEqual(T.launchFor(T.R6), [0, 3]);
  assert.deepEqual(T.launchFor(T.R10), [-1, 1]);
  for (const ms of [T.M1, T.SOLO, T.R6, T.R10]) assert.notEqual(det(ms.M), 0);
});

test('practice fixtures: signed and zero multipliers, a shear, an unseen pulse', () => {
  kept(T.PULSE_S, [1, 1], 4); kept(T.PULSE_S, [1, -1], 2); kept(T.PULSE_S, [-1, 1], 2);
  kept(T.PULSE_FLIP, [0, 1], -1); kept(T.PULSE_FLIP, [1, 0], 2);
  kept(T.PULSE_FLAT, [0, 1], 0); kept(T.PULSE_FLAT, [2, 1], 2);
  assert.equal(det(T.PULSE_FLAT), 0);
  kept(T.PULSE_SHEAR, [1, 0], 1);
  assert.equal(T.keptLines(T.PULSE_SHEAR).length, 1, 'a shear keeps one line');
  kept(T.PULSE_NEW, [1, 1], 2); kept(T.PULSE_NEW, [2, 1], 3);
  assert.deepEqual(T.keptLines(T.PULSE_NEW).map((l) => [l.dir, l.m]), [[[2, 1], 3], [[1, 1], 2]]);
  assert.deepEqual(T.keptLines(T.PULSE_FLAT).map((l) => [l.dir, l.m]), [[[2, 1], 2], [[0, 1], 0]]);
  // round 1: exactly one plan holds
  assert.deepEqual(T.R1_PLANS.filter((v) => T.keeps(T.PULSE_A, v)), [[-2, -2]]);
  // round 3: one duplicate, one new line, one turned
  assert.deepEqual(T.R3_PLANS.map((v) => T.classifyPlan(T.PULSE_A, T.R3_OPEN, v)), ['turns', 'same', 'new']);
  // round 8: (1, 0) holds through three pulses; (1, 1) drifts off
  assert.deepEqual(T.path(T.PULSE_SHEAR, [1, 0], T.R8_PULSES), [[1, 0], [1, 0], [1, 0], [1, 0]]);
  assert.deepEqual(T.path(T.PULSE_SHEAR, [1, 1], T.R8_PULSES)[3], [4, 1]);
  // no two rounds share a pulse except where the spec reuses one on purpose (rounds 1–3: A; 4, 5, 10: S)
  const names = [T.PULSE_A, T.PULSE_S, T.PULSE_FLIP, T.PULSE_FLAT, T.PULSE_SHEAR, T.PULSE_NEW, T.SOLO_B].map((M) => JSON.stringify(M));
  assert.equal(new Set(names).size, names.length);
});

test('progress: help makes it assisted; a wrong commit fixed without help is corrected', () => {
  assert.equal(T.outcomeOf({ help: 0, wrong: 0 }), 'independent');
  assert.equal(T.outcomeOf({ help: 0, wrong: 2 }), 'corrected');
  assert.equal(T.outcomeOf({ help: 1, wrong: 0 }), 'assisted');
  assert.equal(T.outcomeOf({ help: 1, wrong: 3 }), 'assisted');
});

test('generated rounds: whole entries, two distinct whole multipliers on whole-number lines, reachable missions', () => {
  const seen = new Set<string>();
  for (let s = 1; s <= 400; s++) {
    const g = T.genPulse(s);
    assert.ok(g.M.flat().every((x) => Number.isInteger(x) && Math.abs(x) <= 9), JSON.stringify(g.M));
    assert.notEqual(g.lines[0].m, g.lines[1].m);
    for (const l of g.lines) { kept(g.M, l.dir, l.m); assert.ok(l.dir.every(Number.isInteger)); }
    assert.equal(T.onLineOf(g.lines[0].dir, g.lines[1].dir), false);
    seen.add(JSON.stringify(g.M));
    const ms = T.genMission(s);
    assert.ok(T.reaches(ms, ms.launch));
    assert.deepEqual(T.launchFor(ms), ms.launch);
  }
  assert.ok(seen.size >= 20, `only ${seen.size} different pulses`);
});

test('an older save resting past the Chapter 18 name card resumes at the same content', async () => {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); },
  } as Storage;
  const { loadSave } = await import('../../site/src/singular/core/save.ts');
  const put = (last: { chapter: string; beat: number }, flags: Record<string, unknown> = {}) =>
    store.set('la-game-v1', JSON.stringify({ v: 1, settings: {}, last, chapters: {}, flags }));
  put({ chapter: 'c18', beat: 6 });
  assert.deepEqual(loadSave().last, { chapter: 'c18', beat: 9 }, 'old layout: the shear puzzle (c18-p2) moved from beat 6 to 9');
  put({ chapter: 'c18', beat: 4 });
  assert.deepEqual(loadSave().last, { chapter: 'c18', beat: 4 }, 'the name card did not move');
  put({ chapter: 'c18', beat: 6 }, { 'c18-layout-2': true });
  assert.deepEqual(loadSave().last, { chapter: 'c18', beat: 6 }, 'a new-layout save is left alone');
  put({ chapter: 'c17', beat: 6 });
  assert.deepEqual(loadSave().last, { chapter: 'c17', beat: 6 }, 'other chapters are left alone');
  delete (globalThis as { localStorage?: unknown }).localStorage;
});
