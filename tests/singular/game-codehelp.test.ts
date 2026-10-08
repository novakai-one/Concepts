import { test } from 'node:test';
import assert from 'node:assert/strict';
import { headerEnd, signatureOf, assembleParts, dealOrder, fillAnswers, deriveFill, composeFill, testHint, failurePattern, BLANK } from '../../site/src/singular/game/codehelp.ts';

const ADD = 'def add(v, w):\n    """Return the vector for move v followed by move w."""\n    return [a + b for a, b in zip(v, w)]\n';
const LEN = 'def length(v):\n    """Return the length of vector v."""\n    total = 0\n    for x in v:\n        total += x * x\n    return math.sqrt(total)\n';
const MULTI = 'def f(x):\n    """Line one.\n\n    More text.\n    """\n    y = x + 1\n    return y\n';

test('header ends after the docstring (one line and multi-line)', () => {
  assert.equal(headerEnd(ADD.split('\n')), 1);
  assert.equal(headerEnd(MULTI.split('\n')), 4);
  assert.equal(headerEnd(['def g():', '    return 1']), 0);
});

test('Write mode keeps the signature and docstring and nothing of the body', () => {
  const s = signatureOf(LEN);
  assert.ok(s.startsWith('def length(v):\n    """Return the length of vector v."""\n'));
  assert.ok(!s.includes('total'));
});

test('Assemble splits header and body; the deal is never already solved', () => {
  const p = assembleParts(LEN);
  assert.deepEqual(p.head, ['def length(v):', '    """Return the length of vector v."""']);
  assert.equal(p.body.length, 4);
  for (let seed = 1; seed < 50; seed++) assert.notDeepEqual(dealOrder(p.body, seed), p.body);
});

test('Fill: template answers are recovered from the solution, and composing them gives the solution back', () => {
  const tpl = 'def scale(c, v):\n    """Return the vector v stretched by the number c."""\n    return [___ for x in v]\n';
  const sol = 'def scale(c, v):\n    """Return the vector v stretched by the number c."""\n    return [c * x for x in v]\n';
  const a = fillAnswers(tpl, sol);
  assert.deepEqual(a, ['c * x']);
  assert.equal(composeFill(tpl, a!), sol);
});

test('Fill derived from the solution blanks returns and assignments, and round-trips', () => {
  for (const sol of [ADD, LEN, MULTI]) {
    const d = deriveFill(sol);
    assert.ok(d, sol);
    assert.ok(d!.template.includes(BLANK));
    assert.equal(composeFill(d!.template, d!.answers).trimEnd(), sol.trimEnd());
  }
  assert.deepEqual(deriveFill(ADD)!.answers, ['a + b']);
  assert.deepEqual(deriveFill(LEN)!.answers, ['0', 'x * x', 'math.sqrt(total)']);
});

test('plain-word hints', () => {
  assert.match(testHint('IndexError: list index out of range (line 3)', '[1, 2]')!, /past the end/);
  assert.match(testHint('null', '[3, 2]')!, /return/);
  assert.match(testHint('[1, 2, 3]', '[1, 2]')!, /3 numbers/);
  assert.match(testHint('[-5, 3]', '[5, -3]')!, /wrong sign/);
  assert.equal(testHint('[1, 2]', '[1, 3]'), null);
});

test('failure patterns need every failing case and few passing cases', () => {
  const fail = [[[-1, 2]], [[3, -4]], [[-2, -2]]];
  assert.match(failurePattern(fail, [[[1, 2]], [[3, 4]]])!, /negative/);
  assert.equal(failurePattern(fail, [[[-1, 1]], [[-3, 4]], [[2, 2]]]), null);
  assert.equal(failurePattern(fail.slice(0, 2), []), null);
});
