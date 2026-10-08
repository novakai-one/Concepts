// Prologue: the routine pulse's numbers behind the two checks, and the lines that report them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { T, PROLOGUE_WHITE, PROLOGUE_CYAN } from '../../site/src/singular/content/truth.ts';
import { apply, lineThrough, nearAnchor, relayChain, STEP_COPIES } from '../../site/src/singular/content/chapters/c00-prologue/logic.ts';
import { S } from '../../site/src/singular/content/chapters/c00-prologue/script.ts';

type P = [number, number, number];
const lattice = (n: number): P[] => {
  const out: P[] = [];
  for (let x = -n; x <= n; x++) for (let y = -n; y <= n; y++) out.push([x, y, 0]);
  return out;
};
const moved = (q: P) => Math.hypot(apply(T, q)[0] - q[0], apply(T, q)[1] - q[1]);

test('the pulse leaves exactly one buoy where it was, the one at the origin, in every field the chapter draws', () => {
  for (const n of [7, 12, 16]) assert.deepEqual(lattice(n).filter((q) => moved(q) < 1e-9), [[0, 0, 0]], `extent ${n}`);
});

test('no line says every buoy (or point) moved without the exception', () => {
  const everyMoved = /\bevery (buoy|point)\b[^.]*\bmoved\b(?! except)/i;
  const movedEvery = /\bmoved every (buoy|point)\b(?! but one| except)/i;
  for (const l of Object.values(S).flat()) {
    assert.ok(!everyMoved.test(l.text) && !movedEvery.test(l.text), l.text);
  }
  // the prediction card, the win card and the chapter summary live in index.ts (it needs three, so read it as text)
  const src = readFileSync(new URL('../../site/src/singular/content/chapters/c00-prologue/index.ts', import.meta.url), 'utf8');
  for (const m of src.matchAll(/(prompt|reveal|inShort): '([^']*)'/g)) {
    assert.ok(!everyMoved.test(m[2]) && !movedEvery.test(m[2]), m[2]);
  }
  assert.ok(S.close.some((l) => l.who === 'lantern' && /except one/.test(l.text) && /under the Anchor/.test(l.text)));
});

test('p2: the white buoys stay on one line; the step and its copies cover exactly the three cyan gaps', () => {
  const whites = PROLOGUE_WHITE.map((q) => apply(T, q));
  const cyans = PROLOGUE_CYAN.map((q) => apply(T, q));
  assert.deepEqual(whites, [[-3, -2, 0], [-4, -2, 0], [-5, -2, 0]]);
  assert.ok(lineThrough(whites[0], whites[2], whites));
  // the wrong() attempt: a ruler through only two of the three
  assert.ok(!lineThrough(whites[0], apply(T, [0, 3]), whites));
  assert.equal(STEP_COPIES, cyans.length - 2, 'four buoys, three gaps: the step plus two copies');
  const chain = relayChain(cyans[0], cyans[1]);
  assert.equal(chain.length, cyans.length - 1);
  chain.forEach(([a, b], k) => { assert.deepEqual(a, cyans[k]); assert.deepEqual(b, cyans[k + 1]); });
});

test('p3: near the Anchor, the one buoy with no line is the origin; any wrong pick has a line to show', () => {
  const field = lattice(7);
  const patch = field.filter(nearAnchor);
  assert.ok(patch.some((q) => q[0] === 0 && q[1] === 0));
  assert.deepEqual(patch.filter((q) => moved(q) < 1e-9), [[0, 0, 0]]);
  // outside the patch buoys get no line although they moved (why the hints say "near the middle")
  for (const q of [[4, 0, 0], [-4, 0, 0], [3, -2, 0], [-2, -3, 0], [2, 3, 0], [-3, 2, 0]] as P[]) {
    assert.ok(!nearAnchor(q) && moved(q) >= 1, String(q));
  }
  // the line drawn for a wrong pick: every other buoy moved at least one grid step
  for (const q of field) if (q[0] || q[1]) assert.ok(moved(q) >= 1, String(q));
});
