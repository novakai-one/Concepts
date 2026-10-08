// Prologue: every word the player reads, in plain maths (docs/singular/ch18-plain-style.md).
// Vectors stacked, a number on the left of a vector, the matrix on the left of the vector. One short sentence
// plus the calculation. "Linear transformation" is used only from the name card on.
import type { Mat } from '../../../math/la';
import { tmul, tn, tv, type Vec } from '../../../kit/plain';
import { answer, askP, inputs, landed, stepsOf, type Question } from './logic';

/** A 2 × 2 matrix as TeX. */
export const tm = (M: Mat): string => `\\begin{bmatrix}${M.map((r) => r.map(tn).join(' & ')).join(' \\\\ ')}\\end{bmatrix}`;
export const head = (M: Mat): string => `$A = ${tm(M)}$`;

export const HELP = 'Green: a point before $A$. Yellow: where $A$ moves it.\n\nDecimals ($0.5$) and fractions ($1/2$) work.';

/** A wrong answer: the two steps it makes, side by side. */
export function wrongSteps(q: Question, g: Vec): string {
  const st = stepsOf(q, g);
  if (st.kind === 'between') return `$${tv(g)} - ${tv(st.lo)} = ${tv(st.a)}$, but $${tv(st.hi)} - ${tv(g)} = ${tv(st.b)}.$`;
  const known = st.kind === 'ahead' ? `${tv(st.from)} - ${tv(st.prev)}` : `${tv(st.prev)} - ${tv(st.from)}`;
  const mine = st.kind === 'ahead' ? `${tv(g)} - ${tv(st.from)}` : `${tv(st.from)} - ${tv(g)}`;
  // the full stop inside the TeX, so it never wraps onto a line of its own
  const end = st.k !== 1 ? `$, $\\text{not } ${tmul(st.k, st.s)}.$` : '.$';
  return `$${known} = ${tv(st.s)}$, but $${mine} = ${tv(st.d)}${end}`;
}

/** A right answer: the equation, then two or three words. */
export function right(q: Question): string {
  const ans = answer(q);
  const st = stepsOf(q, ans);
  const words = q.ask === 0 && !q.row.b[0] && !q.row.b[1] ? 'The origin stays.' : st.kind === 'between' ? 'Halfway.' : 'Equal steps.';
  return `$A${tv(askP(q))} = ${tv(ans)}$. ${words}`;
}

/** Hints: the step, then the sum that gives the answer. */
export function hintsFor(q: Question): string[] {
  const ans = answer(q);
  const st = stepsOf(q, ans);
  if (st.kind === 'between') {
    return [`The answer is halfway between $${tv(st.lo)}$ and $${tv(st.hi)}$.`, `$${tv(st.lo)} + ${tv(st.a)} = ${tv(ans)}$.`];
  }
  const two = st.k !== 1 ? `${tmul(st.k, st.s)}` : tv(st.s);
  return st.kind === 'ahead'
    ? [`Each step is $${tv(st.s)}$.`, `$${tv(st.from)} + ${two} = ${tv(ans)}$.`]
    : [`Each step is $${tv(st.s)}$. Step back.`, `$${tv(st.from)} - ${two} = ${tv(ans)}$.`];
}

/** The given points of a practice round, as equations. */
export const givens = (q: Question): string => {
  const ps = inputs(q), qs = landed(q);
  return ps.map((p, i) => `$A${tv(p)} = ${tv(qs[i])}${i === ps.length - 1 ? '.' : ''}$`).join(' and ');
};

// ------------------------------------------------------------------ the first puzzle

export const P1 = {
  title: 'What does A do?',
  goal: 'Press **Apply $A$** and watch the points. Then fill in the box.',
  subgoals: ['First row of points', 'Second row of points', 'The origin'],
  apply: 'Apply $A$',
  next: 'Next',
  hintApply: 'Press **Apply $A$**.',
};

// ------------------------------------------------------------------ practice

export const DRILL = {
  title: 'Practice: ten short rounds',
  goal: 'Ten short rounds.',
};

// ------------------------------------------------------------------ name card and close

/** A p = q as one unbreakable piece of TeX. */
const found = (p: Vec, q: Vec): string => `$\{A${tv(p)} = ${tv(q)}\}$`;

export const NAME = {
  id: 'linear-transformation-first-look',
  term: 'linear transformation',
  question: 'What did $A$ do to the grid?',
  saw: `$A$ moved every point at once. You found ${found([4, 0], [4, 4])}, ${found([3, 4], [-5, -1])} and ${found([0, 0], [0, 0])}.`,
  means: 'Straight lines stayed straight. Equal steps stayed equal steps. The origin stayed where it was: $A\\mathbf 0 = \\mathbf 0.$',
  name: 'A move of the plane with these three facts is a **linear transformation**.',
  use: 'Each layer of a neural network starts with a linear transformation of its input.',
};

export const CLOSE = {
  title: 'What $A$ does',
  body: [
    '- Straight lines stay straight.',
    '- Equal steps stay equal: ${A(\\mathbf p + t\\mathbf s) = A\\mathbf p + t\\,A\\mathbf s}$ for a start $\\mathbf p$ and a step $\\mathbf s.$',
    '- The origin stays: $A\\mathbf 0 = \\mathbf 0.$',
    '',
    '**Still open:** what do the numbers in $A$ mean?',
  ].join('\n'),
};

export const IN_SHORT = 'A matrix $A$ moves every point of the plane at once. Straight lines stay straight, equal steps stay equal, and the origin stays where it is.';
