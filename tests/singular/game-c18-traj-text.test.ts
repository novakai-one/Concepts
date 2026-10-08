// Chapter 18, Game 1 and the practice: every string follows the plain-maths rules (docs/singular/ch18-plain-style.md),
// and nothing the player reads before the name card says "eigenvector", "eigenvalue" or λ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as X from '../../site/src/singular/content/chapters/c18-eigen/traj-text.ts';
import * as G from '../../site/src/singular/content/chapters/c18-eigen/game1-copy.ts';
import { checkMult, PULSE_A } from '../../site/src/singular/content/chapters/c18-eigen/traj-logic.ts';

const RULES: [string, RegExp][] = [
  ['banned word', /\b(simply|just|obviously|clearly|trivially|trivial)\b/i],
  ['story word', /\b(pulses?|Anchor|corridor|flight plan|launch plan|waypoints?|beacon|channel|calibrate|heading|LANTERN|arrows?)\b/i],
  ['exclamation', /[A-Za-z0-9)\]'"]!(\s|$)/],
  ['unrendered value', /\b(NaN|undefined|null|Infinity)\b|\[object/],
];
/** A vector written flat, like (1, 1) or (2, -1), inside or outside the maths. */
const FLAT = /\(\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*\)/;
const EARLY = /eigen|λ|\\lambda/i;

/** Sample arguments: a vector, a number, a flight path. */
const KINDS = [() => [1, 1], () => 3, () => [[1, 1], [3, 3], [9, 9]]];
/** Call a text function with the first argument mix that gives a clean string. */
function render(fn: (...a: unknown[]) => unknown): string[] {
  const n = fn.length;
  for (let mask = 0; mask < KINDS.length ** n; mask++) {
    const args = Array.from({ length: n }, (_, i) => KINDS[Math.floor(mask / KINDS.length ** i) % KINDS.length]());
    try {
      const out = fn(...args);
      const list = (Array.isArray(out) ? out : [out]).filter((s): s is string => typeof s === 'string');
      if (list.length && !list.some((s) => /NaN|undefined/.test(s))) return list;
    } catch { /* wrong mix, try the next */ }
  }
  throw new Error(`could not render ${fn.toString().slice(0, 80)}`);
}

/** Every string under a value, with its path. */
function walk(x: unknown, at: string, out: { at: string; s: string }[]): void {
  if (typeof x === 'string') out.push({ at, s: x });
  else if (typeof x === 'function') render(x as (...a: unknown[]) => unknown).forEach((s, i) => out.push({ at: `${at}()[${i}]`, s }));
  else if (Array.isArray(x)) x.forEach((y, i) => walk(y, `${at}[${i}]`, out));
  else if (x && typeof x === 'object') for (const [k, y] of Object.entries(x)) walk(y, `${at}.${k}`, out);
}

function strings(): { at: string; s: string }[] {
  const out: { at: string; s: string }[] = [];
  for (const k of ['M1T', 'SOLOT', 'DRILL', 'SHEAR', 'TURN', 'TURN_L', 'ROWRED', 'LOG_NAMES', 'OUTCOME_NAMES', 'ZERO', 'UNREAD', 'UNREAD_M'] as const) walk(X[k], k, out);
  // the wrong-number message takes a verdict, not a sample: it is checked through wrongMult below
  const { wrongMultiplier: _w, ...game1 } = G.GAME1;
  walk(game1, 'GAME1', out);
  walk(G.GAME1_UI, 'GAME1_UI', out);
  const { saw, ...name } = G.GAME1_NAME;
  walk(name, 'NAME', out);
  out.push({ at: 'NAME.saw()', s: saw() });
  for (const [v, m] of [[[1, 1], 2], [[1, 1], -3], [[1, -1], 2]] as [number[], number][]) {
    const vd = checkMult(PULSE_A, v, m);
    if (!vd.ok) out.push({ at: `wrongMult(${v}, ${m})`, s: X.wrongMult(v, vd) });
  }
  return out;
}

test('every Game 1 and practice string follows the plain-maths rules', () => {
  const all = strings();
  assert.ok(all.length > 100, `only ${all.length} strings found`);
  const hits: string[] = [];
  for (const { at, s } of all) {
    const prose = s.replace(/\$[^$]*\$/g, ' ');
    for (const [rule, re] of RULES) if (re.test(prose)) hits.push(`${at} · ${rule} · ${s}`);
    if (FLAT.test(s)) hits.push(`${at} · flat vector · ${s}`);
  }
  assert.deepEqual(hits, []);
});

test('nothing before the name card says eigenvector, eigenvalue or λ', () => {
  const early = strings().filter(({ at }) => /^(GAME1|ZERO|UNREAD|wrongMult)/.test(at));
  early.push({ at: 'inShort', s: G.GAME1_NAME.inShort });
  assert.ok(early.length > 20);
  assert.deepEqual(early.filter(({ s }) => EARLY.test(s)).map(({ at, s }) => `${at} · ${s}`), []);
});

test('a wrong number shows what it gives, next to what is true', () => {
  const s = X.wrongMult([1, 1], checkMult(PULSE_A, [1, 1], 2));
  assert.equal(s, '$2\\begin{bmatrix}1 \\\\ 1\\end{bmatrix} = \\begin{bmatrix}2 \\\\ 2\\end{bmatrix}$, not $\\begin{bmatrix}3 \\\\ 3\\end{bmatrix}$.');
  assert.match(X.wrongMult([1, 1], checkMult(PULSE_A, [1, 1], -1)), /^\$-\\begin\{bmatrix\}/, 'the number −1 is written as a minus sign');
});

test('the name card quotes the equations this player found', () => {
  const s = G.GAME1_NAME.saw({ lines: [[[2, -2], [2, -2], 1], [[1, 1], [3, 3], 3]] });
  assert.equal(s, 'You found $A\\begin{bmatrix}2 \\\\ -2\\end{bmatrix} = \\begin{bmatrix}2 \\\\ -2\\end{bmatrix}$ and $A\\begin{bmatrix}1 \\\\ 1\\end{bmatrix} = 3\\begin{bmatrix}1 \\\\ 1\\end{bmatrix}$.');
  assert.match(G.GAME1_NAME.saw(), /3\\begin\{bmatrix\}1 \\\\ 1\\end\{bmatrix\}/, 'default: the standard lines');
});

test('numbers read honestly', () => {
  assert.equal(X.fdeg(0.19), '0.2°');
  assert.equal(X.fdeg(0.019), 'less than 0.1°');
  assert.equal(X.tnp(2.9999), '2.9999');
  assert.equal(X.tnp(3), '3');
});
