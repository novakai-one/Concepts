import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chainProblem } from '../../site/src/singular/game/chain.ts';
import { BROADCAST } from '../../site/src/singular/content/broadcast.ts';

const pages = BROADCAST.pages;
const ref = pages.map((p) => p.id);

test('twelve pages, unique ids, every need is a page', () => {
  assert.equal(pages.length, 12);
  assert.equal(new Set(ref).size, 12);
  for (const p of pages) for (const n of p.needs) assert.ok(ref.includes(n), `${p.id} needs ${n}`);
  for (const p of pages) for (const k of Object.keys(p.because ?? {})) assert.ok(ref.includes(k), `${p.id} because ${k}`);
});

test('the reference order respects every need; another valid order does too', () => {
  assert.equal(chainProblem(ref, pages), null);
  const alt = ['vector', 'dot', 'span', 'matrix', 'independence', 'determinant', 'solving', 'inverse', 'rank', 'lsq', 'eigen', 'svd'];
  assert.equal(chainProblem(alt, pages), null);
});

test('a page before its need is caught, naming both', () => {
  const bad = ref.slice();
  [bad[0], bad[1]] = [bad[1], bad[0]];
  assert.deepEqual(chainProblem(bad, pages), { page: 'span', need: 'vector' });
  const svdFirst = ['svd', ...ref.filter((x) => x !== 'svd')];
  assert.equal(chainProblem(svdFirst, pages)?.page, 'svd');
});
