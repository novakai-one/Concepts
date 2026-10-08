// Chapter 1: every word the player reads. Plain maths, written the way a textbook writes it
// (docs/singular/ch18-plain-style.md): vectors stacked, a number multiplying a vector on its left.
// No story words. "Vector addition", "scalar multiple" and "length" are named only after the player found them.
import { tn, tnp, tnb, tv, tmul, tnorm, type Vec } from '../../../kit/plain';

// ------------------------------------------------------------------ TeX helpers

/** TeX in braces: KaTeX keeps it on one line (a phone breaks only between the equations). */
const nb = (t: string): string => `{${t}}`;
/** Green, blue and yellow TeX, matching the arrows on the chart. */
export const G = (s: string): string => `\\cg{${s}}`;
export const B = (s: string): string => `\\htmlClass{c01-b}{${s}}`;
export const Y = (s: string): string => `\\cy{${s}}`;
/** A column worked out part by part: [4 + (−1); −1 + 3]. */
export const tparts = (vs: Vec[], op: '+' | '-' = '+'): string => {
  const rows = vs[0].map((_, i) => vs.map((v, j) => (j === 0 ? tnp(v[i]) : tnb(v[i]))).join(` ${op} `));
  return `\\begin{bmatrix}${rows.join(' \\\\ ')}\\end{bmatrix}`;
};
/** c times each part: [3 · 2; 3 · 1]. */
export const tmulParts = (c: number, v: Vec): string =>
  `\\begin{bmatrix}${v.map((x) => `${tnb(c)} \\cdot ${tnb(x)}`).join(' \\\\ ')}\\end{bmatrix}`;
/** u + v + w written out. */
export const tplus = (vs: Vec[], op: '+' | '-' = '+'): string => vs.map(tv).join(` ${op} `);
/** 6^2 + 8^2 (negatives in brackets). */
export const tsq = (v: Vec): string => v.map((x) => `${tnb(x)}^2`).join(' + ');
export const sumSq = (v: Vec): number => v.reduce((s, x) => s + x * x, 0);
/** A whole-number root as a number, otherwise √n. */
export const troot = (n: number): string => { const r = Math.sqrt(n); return Math.abs(r - Math.round(r)) < 1e-9 ? tn(Math.round(r)) : `\\sqrt{${tn(n)}}`; };
/** A point (only a position): (3, 2). */
export const tpt = (p: Vec): string => `(${p.map(tn).join(', ')})`;
const col = (...rows: string[]): string => `\\begin{bmatrix}${rows.join(' \\\\ ')}\\end{bmatrix}`;

// ------------------------------------------------------------------ the chapter

export const TITLE = 'What is a vector?';
export const IN_SHORT = 'Two numbers make a vector. What happens when you add two vectors, or multiply one by a number?';

// ------------------------------------------------------------------ 1 · a vector

const across = (x: number): string => (x > 0 ? `${tn(x)} right` : x < 0 ? `${tn(-x)} left` : '0 across');
const upDown = (y: number): string => (y > 0 ? `${tn(y)} up` : y < 0 ? `${tn(-y)} down` : '0 up');

export const VEC = {
  title: 'A vector',
  targets: [[3, 2], [-2, 1], [0, -3]] as Vec[],
  goal: 'Type $\\mathbf v$ so its tip lands on each point.',
  subgoals: ['Tip on $(3, 2)$', 'Tip on $(-2, 1)$', 'Tip on $(0, -3)$'],
  ask: (t: Vec) => `Put the tip of $\\mathbf v$ on $${tpt(t)}$.`,
  hit: (v: Vec) => `$\\mathbf v = ${tv(v)}$: ${across(v[0])}, ${upDown(v[1])}.`,
  off: (v: Vec, t: Vec) => `$\\mathbf v = ${tv(v)}$: ${across(v[0])}, ${upDown(v[1])}. Not on $${tpt(t)}$.`,
  hints: (t: Vec) => ['The first number moves the tip across. The second moves it up.', `Try $\\mathbf v = ${tv(t)}$.`],
};

// ------------------------------------------------------------------ 2 · adding

export const ADD_U: Vec = [4, -1], ADD_T: Vec = [3, 2], ADD_V: Vec = [-1, 3];
export const ADD = {
  title: 'Adding vectors',
  goal: 'Fill in the box.',
  left: `${G(tv(ADD_U))} +`,
  right: `= ${Y(tv(ADD_T))}`,
  right1: (v: Vec) => `$${tplus([ADD_U, v])} = ${tparts([ADD_U, v])} = ${tv(ADD_T)}$.`,
  other: (v: Vec) => `The other order gives the same: $${nb(`${tplus([v, ADD_U])} = ${tv(ADD_T)}`)}$.`,
  wrong: (v: Vec, s: Vec) => `$${tplus([ADD_U, v])} = ${tparts([ADD_U, v])} = ${tv(s)}$, not $${tv(ADD_T)}$.`,
  hints: ['Top numbers: $4 + \\square = 3$.', 'Bottom numbers: $-1 + \\square = 2$.', `Try $${tv(ADD_V)}$.`],
};

export const NAME_VECTOR = {
  question: 'What is a vector?',
  saw: `You found $${G(tv(ADD_U))} + ${B(tv(ADD_V))} = ${Y(tv(ADD_T))}$, in either order.`,
  means: 'The first number says how far across, the second how far up.',
  name: 'A **vector** is a list of numbers written as a column. To **add vectors**, add the matching numbers.',
  formula: `${col('a', 'b')} + ${col('c', 'd')} = ${col('a + c', 'b + d')}`,
  why: 'The order does not matter: $\\mathbf u + \\mathbf v = \\mathbf v + \\mathbf u$.',
};

// ------------------------------------------------------------------ 3 · a number times a vector

export const MUL_V: Vec = [2, 1];
export const MUL = {
  title: 'A number times a vector',
  goal: 'Fill in the box, or press **No number works**.',
  targets: [[6, 3], [-4, -2], [3, 2]] as Vec[],
  answers: [3, -2, null] as (number | null)[],
  subgoals: [`$\\square${tv(MUL_V)} = ${tv([6, 3])}$`, `$\\square${tv(MUL_V)} = ${tv([-4, -2])}$`, `$\\square${tv(MUL_V)} = ${tv([3, 2])}$`],
  none: 'No number works',
  right: (c: number, t: Vec) => `$${tmul(c, MUL_V)} = ${tmulParts(c, MUL_V)} = ${tv(t)}$.`,
  wrong: (c: number, w: Vec, t: Vec) => `$${tmul(c, MUL_V)} = ${tv(w)}$, not $${tv(t)}$.`,
  someWorks: 'A number works here. Try one.',
  noneRight: `Right: $${nb(`c${tv(MUL_V)} = ${col('2c', 'c')}`)}$ needs $2c = 3$ and $c = 2$.`,
  hints: [
    ['$\\square \\cdot 2 = 6$.', 'Try $3$.'],
    ['The point is on the other side of the origin.', 'Try $-2$.'],
    ['Top: $\\square \\cdot 2 = 3$. Bottom: $\\square \\cdot 1 = 2$.', 'No number does both: press **No number works**.'],
  ],
};

export const NAME_SCALAR = {
  question: 'What does a number do to a vector?',
  saw: `You found $${nb(`3${tv(MUL_V)} = ${tv([6, 3])}`)}$ and $${nb(`-2${tv(MUL_V)} = ${tv([-4, -2])}`)}$.\n\nNo number gave $${tv([3, 2])}$.`,
  means: 'Multiplying by a number stretches the vector along its line. A negative number flips it.',
  name: 'A plain number is a **scalar**. $k\\mathbf v$ is a **scalar multiple** of $\\mathbf v$.',
  formula: `k${col('a', 'b')} = ${col('ka', 'kb')}`,
  why: 'Every $k\\mathbf v$ lies on the line through $\\mathbf v$.',
};

// ------------------------------------------------------------------ 4 · length

export const LEN_V: Vec = [3, 4];
export const LEN = {
  title: 'The length of a vector',
  goal: 'Find the length.',
  left: `${tnorm(LEN_V)} =`,
  right: `$${tnorm(LEN_V)} = \\sqrt{3^2 + 4^2} = \\sqrt{25} = 5$.`,
  seven: '$3 + 4 = 7$ goes along the two dashed sides. The vector goes straight across: $\\sqrt{3^2 + 4^2}$.',
  wrong: (x: number) => `$${tnb(x)}^2 = ${tn(x * x)}$, but $3^2 + 4^2 = 25$.`,
  hints: ['The vector and the two dashed sides make a right triangle.', '$\\sqrt{3^2 + 4^2}$.', '$\\sqrt{3^2 + 4^2} = \\sqrt{25} = 5$.'],
};

export const NAME_LENGTH = {
  question: 'How long is a vector?',
  saw: `You found $${tnorm(LEN_V)} = 5$: the long side of a right triangle with sides 3 and 4.`,
  means: 'Pythagoras gives the length.',
  name: 'The **length** of $\\mathbf v$ is written $\\|\\mathbf v\\|$.',
  formula: '\\|\\mathbf v\\| = \\sqrt{v_1^2 + v_2^2}',
  why: 'With three numbers: $\\sqrt{v_1^2 + v_2^2 + v_3^2}$.',
};

// ------------------------------------------------------------------ the three drills

export const FILL = 'Fill in the box.';
export const DRILL = {
  add: { title: 'Practice: adding, ten rounds', goal: 'Ten short rounds.' },
  mul: { title: 'Practice: multiplying, ten rounds', goal: 'Ten short rounds.' },
  len: { title: 'Practice: length, ten rounds', goal: 'Ten short rounds.' },
  none: 'No number works',
  someWorks: 'A number works here. Try one.',
  noneRight: (v: Vec, t: Vec) => `Right: $${nb(`c${tv(v)} = ${col(`${tnp(v[0])}c`, `${tnp(v[1])}c`)}`)}$ needs $${tnp(v[0])}c = ${tnp(t[0])}$ and $${tnp(v[1])}c = ${tnp(t[1])}$.`.replace(/\b1c/g, 'c'),
  /** A length: what the typed number gives, next to what is true. */
  lenWrong: (x: number, v: Vec, pre = '') => `${pre}$${tnb(x)}^2 = ${tn(x * x)}$, but $${tsq(v)} = ${tn(sumSq(v))}$.`,
  lenRight: (lhs: string, v: Vec, tail = '') => {
    const s = sumSq(v), r = Math.sqrt(s), whole = Math.abs(r - Math.round(r)) < 1e-9;
    const val = whole ? `\\sqrt{${tn(s)}} = ${tn(Math.round(r))}` : `\\sqrt{${tn(s)}} \\approx ${tn(Math.round(r * 1000) / 1000)}`;
    return `$${lhs} = \\sqrt{${tsq(v)}} = ${val}${tail}$.`;
  },
};

// ------------------------------------------------------------------ harder cases

export const MID_P: Vec = [1, 4], MID_Q: Vec = [6, 1];
export const MID = {
  title: 'Halfway from P to Q',
  goal: `$P = ${tpt(MID_P)}$ and $Q = ${tpt(MID_Q)}$. Find the point halfway.`,
  ask: `$P = ${tpt(MID_P)}$ and $Q = ${tpt(MID_Q)}$.`,
  left: 'P + \\tfrac12(Q - P) =',
  right: `$${nb(`${tv(MID_P)} + \\tfrac12${tv([5, -3])}`)} = ${nb(`${tv(MID_P)} + ${tv([2.5, -1.5])}`)} = ${tv([3.5, 2.5])}$.`,
  wrong: (x: Vec) => `$${nb(`P + \\tfrac12(Q - P) = ${tv(MID_P)} + \\tfrac12${tv([5, -3])}`)}$, not $${tv(x)}$.`,
  hints: [`$Q - P = ${tv([5, -3])}$.`, `$\\tfrac12${tv([5, -3])} = ${tv([2.5, -1.5])}$.`, `Try $${tv([3.5, 2.5])}$.`],
};

export const LEN3_V: Vec = [2, 3, 6];
export const LEN3 = {
  title: 'Length in 3-D',
  goal: 'Find the length.',
  left: `${tnorm(LEN3_V)} =`,
  right: `$${tnorm(LEN3_V)} = \\sqrt{(2^2 + 3^2) + 6^2} = \\sqrt{13 + 36} = 7$.`,
  wrong: (x: number) => `$${tnb(x)}^2 = ${tn(x * x)}$, but $2^2 + 3^2 + 6^2 = 49$.`,
  hints: ['On the floor: $2^2 + 3^2 = 13$.', 'Then up: $\\sqrt{13 + 6^2}$.', '$\\sqrt{13 + 36} = \\sqrt{49} = 7$.'],
};

// ------------------------------------------------------------------ wrap-up

export const WRAP = {
  title: 'Vectors',
  body: [
    '- $\\mathbf u + \\mathbf v$: add the matching numbers.',
    '- $k\\mathbf v$: multiply each number by $k$.',
    '- $\\|\\mathbf v\\| = \\sqrt{v_1^2 + v_2^2}$: the length.',
    '',
    'A game moves a point by adding a vector to it, many times a second. An image with 784 pixels is one vector with 784 numbers.',
  ].join('\n'),
};
