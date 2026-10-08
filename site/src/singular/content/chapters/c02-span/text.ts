// Chapter 2: every word the player reads (docs/singular/ch18-plain-style.md). Plain maths, the way a textbook
// writes it: vectors stacked, a number multiplying a vector on its left. No story words.
// "Linear combination" and "weights" are not used before their name card; "span" not before its own.
import { tv, tn, type Vec } from '../../../kit/plain';
import { G, R, tcombo, trows } from './parts';

// ------------------------------------------------------------------ the numbers

export const V: Vec = [2, 1];
export const W: Vec = [1, 3];
/** The two targets of the first try-it: 2v + 1w and −1v + 2w. */
export const T1: Vec = [5, 5];
export const T2: Vec = [0, 5];
export const W1: [number, number] = [2, 1];
export const W2: [number, number] = [-1, 2];
/** The span try-it: w on the line through v. */
export const WL: Vec = [-4, -2];
export const TL: Vec = [0, 3];
/** By hand. */
export const TH: Vec = [4, 7];
export const WH: [number, number] = [1, 2];
/** 3-D (Chapter 3 opens with the same v and w). */
export const VD: Vec = [1, 0, 1];
export const WD: Vec = [0, 1, 1];
export const T3A: Vec = [2, 3, 5];
export const W3A: [number, number] = [2, 3];
export const T3B: Vec = [1, 1, 0];

const v1 = tv(V), w1 = tv(W);

// ------------------------------------------------------------------ cards

export const TITLE = 'What can two vectors make?';
export const IN_SHORT = 'Which vectors can you make as $a\\mathbf v + b\\mathbf w$? Try numbers.';

export const WRAP = {
  title: 'Linear combinations and span',
  body: [
    `- $\\operatorname{span}\\{\\mathbf v, \\mathbf w\\}$ is every $a\\mathbf v + b\\mathbf w$.`,
    '- It is the whole plane if $\\mathbf v$ and $\\mathbf w$ are on different lines, one line if they are on one line, and just $\\mathbf 0$ if both are $\\mathbf 0$.',
    '- In 3-D, two vectors span at most a plane.',
    '',
    'A linear model’s predictions are linear combinations of its columns, so they lie in their span. A target off the span cannot be hit exactly.',
  ].join('\n'),
};

export const CATCHUP = `A vector is a column of numbers: $${v1}$ is 2 across and 1 up. $3\\mathbf v$ is $\\mathbf v$ stretched 3 times along its line; a negative number flips it. $\\mathbf v + \\mathbf w$ puts $\\mathbf w$ at the tip of $\\mathbf v$.`;

// ------------------------------------------------------------------ try it: a v + b w

export const TRY = {
  title: 'Find a and b',
  goal: `Find $a$ and $b$ so that $a${G(V)} + b${R(W)}$ is the vector on the right.`,
  subgoals: [`$= ${tv(T1)}$`, `$= ${tv(T2)}$`],
  help: `Green is $\\mathbf v = ${v1}$. Red is $\\mathbf w = ${w1}$. Yellow is $a\\mathbf v + b\\mathbf w$.\n\nDecimals ($0.5$), fractions ($1/2$) and negatives work.`,
  start: 'Type a number in each box.',
  live: (a: number, b: number, s: Vec, t: Vec) => `$${tcombo(a, V, b, W)} = ${tv(s)}$, not $${tv(t)}$.`,
  hit: (a: number, b: number, t: Vec) => `$${tcombo(a, V, b, W)} = ${trows(a, V, b, W)} = ${tv(t)}$.`,
  next: `Now make $${tv(T2)}$.`,
  hints1: ['Change one number at a time. Watch the yellow tip.', 'Top row: $2a + b = 5$. Bottom row: $a + 3b = 5$.', 'Try $a = 2$ and $b = 1$.'],
  hints2: [`$${tv(T2)}$ is straight up, but both vectors point right. One number must be negative.`, 'Top row: $2a + b = 0$, so $b = -2a$.', 'Try $a = -1$ and $b = 2$.'],
};

// ------------------------------------------------------------------ name: linear combination

export const NAME_LC = {
  question: 'What is $a\\mathbf v + b\\mathbf w$?',
  saw: `You found $${tcombo(2, V, 1, W)} = ${tv(T1)}$ and $${tcombo(-1, V, 2, W)} = ${tv(T2)}$.`,
  means: 'Multiply each vector by a number, then add.',
  name: '$a\\mathbf v + b\\mathbf w$ is a **linear combination** of $\\mathbf v$ and $\\mathbf w$. The numbers $a$ and $b$ are its **weights**.',
  formula: `-1\\,${G(V)} + 2\\,${R(W)} = \\cy{${tv(T2)}}`,
  why: 'Each row on its own: $-1 \\cdot 2 + 2 \\cdot 1 = 0$ and $-1 \\cdot 1 + 2 \\cdot 3 = 5$.',
};

// ------------------------------------------------------------------ practice 1: find the weights

export const DRILL1 = {
  title: 'Practice: ten short rounds',
  goal: 'Ten short rounds: find the weights.',
  both: 'Find the weights $a$ and $b$.',
  one: (n: string) => `Find the weight $${n}$.`,
  check: 'Check',
  none: 'No weights work',
  right: (a: number, v: Vec, b: number, w: Vec, t: Vec) => `$${tcombo(a, v, b, w)} = ${trows(a, v, b, w)} = ${tv(t)}$.`,
  wrong: (a: number, v: Vec, b: number, w: Vec, s: Vec, t: Vec) => `$${tcombo(a, v, b, w)} = ${tv(s)}$, not $${tv(t)}$.`,
  also: (a: number, v: Vec, b: number, w: Vec, t: Vec) => `Right. Another answer also works: $${tcombo(a, v, b, w)} = ${tv(t)}$.`,
  noneRight: 'Right. Top row: $a + 2b = 1$. Bottom row: $2a + 4b = 0$. But $2a + 4b = 2(a + 2b) = 2$.',
  noneWrong: 'Some weights do work here. Top row: $a + 2b = 3$.',
};

// ------------------------------------------------------------------ try it: span

export const SPAN = {
  title: 'Find a and b, or show none work',
  goal: `Find $a$ and $b$, or press **No weights work**.`,
  help: `Green is $\\mathbf v = ${v1}$. Red is $\\mathbf w = ${tv(WL)}$. Each yellow dot is one $a\\mathbf v + b\\mathbf w$ you tried.`,
  start: 'Type a number in each box. Each try leaves a dot.',
  live: (a: number, b: number, s: Vec) => `$${tcombo(a, V, b, WL)} = ${tv(s)}$, not $${tv(TL)}$.`,
  none: 'No weights work',
  /** Pressed: the follow-up question. */
  why: 'Right. Why? Fill in the box.',
  askLeft: `${R(WL)} =`,
  askRight: G(V),
  askBad: (c: number) => `$${tn(c)}${G(V)} = ${tv([c * V[0], c * V[1]])}$, not $${tv(WL)}$.`,
  done: `$${R(WL)} = -2${G(V)}$: $\\mathbf w$ is on the line through $\\mathbf v$, so every $a\\mathbf v + b\\mathbf w$ is too.`,
  hints: ['Look at the dots. Where do they all lie?', `Every dot is on one line through $\\mathbf 0$. Is $${tv(TL)}$ on it?`, 'Press **No weights work**.'],
  askHints: [`$${tv(WL)}$ points the opposite way to $${v1}$.`, `$-2 \\cdot 2 = -4$ and $-2 \\cdot 1 = -2$.`],
};

// ------------------------------------------------------------------ name: span

export const NAME_SPAN = {
  question: 'Which vectors are $a\\mathbf v + b\\mathbf w$?',
  saw: `With $\\mathbf w = ${tv(WL)}$, every $a\\mathbf v + b\\mathbf w$ fell on one line. With $\\mathbf w = ${w1}$, you made $${tv(T1)}$ and $${tv(T2)}$, off that line.`,
  means: 'Two vectors on different lines make every vector in the plane. Two on one line make only that line.',
  name: 'The **span** of $\\mathbf v$ and $\\mathbf w$ is the set of all their linear combinations.',
  formula: '\\operatorname{span}\\{\\cg{\\mathbf v}, \\cr{\\mathbf w}\\} = \\{\\, a\\cg{\\mathbf v} + b\\cr{\\mathbf w} \\,\\}',
  why: '$a$ and $b$ are any numbers. Every span contains $\\mathbf 0$: take $a = b = 0$.',
};

// ------------------------------------------------------------------ practice 2: span

export const DRILL2 = {
  title: 'Practice: six short rounds',
  goal: 'Six short rounds on span.',
  yes: 'Yes', no: 'No', line: 'Line', plane: 'Plane',
};

// ------------------------------------------------------------------ harder: by hand

export const HAND = {
  title: 'Harder: find a and b by hand',
  goal: `Find $a$ and $b$ by hand: $a${G(V)} + b${R(W)} = ${tv(TH)}$.`,
  top: '2a + b = 4',
  bottom: 'a + 3b = 7',
  ask: 'Solve the two equations. Type $a$ and $b$.',
  right: (a: number, b: number) => `$${tcombo(a, V, b, W)} = ${trows(a, V, b, W)} = ${tv(TH)}$.`,
  wrong: (a: number, b: number, s: Vec) => `$${tcombo(a, V, b, W)} = ${tv(s)}$, not $${tv(TH)}$.`,
  hints: ['From the top row: $b = 4 - 2a$.', 'Put it in the bottom row: $a + 3(4 - 2a) = 7$, so $-5a = -5$.', '$a = 1$ and $b = 2$.'],
};

// ------------------------------------------------------------------ harder: 3-D

export const D3 = {
  title: 'Harder: two vectors in 3-D',
  goal: 'Find $a$ and $b$. Then decide if the second vector is in the span.',
  subgoals: [`$= ${tv(T3A)}$`, `$= ${tv(T3B)}$`],
  start: 'Type $a$ and $b$. Drag the picture to turn it.',
  right1: (a: number, b: number) => `$${tcombo(a, VD, b, WD)} = ${trows(a, VD, b, WD)} = ${tv(T3A)}$. Now this one.`,
  wrong: (a: number, b: number, s: Vec, t: Vec) => `$${tcombo(a, VD, b, WD)} = ${tv(s)}$, not $${tv(t)}$.`,
  none: 'No weights work',
  noneBad: 'Some weights do work here. Row 1 gives $a$, row 2 gives $b$.',
  ask: 'Right. Rows 1 and 2 give $a = 1$ and $b = 1$. Row 3:',
  askLeft: '1 \\cdot 1 + 1 \\cdot 1 =',
  askBad: (x: number) => `$1 \\cdot 1 + 1 \\cdot 1 = 2$, not $${tn(x)}$.`,
  done: `$${tv(T3B)}$ is not in the span: it is below the plane.`,
  hints1: ['Read the rows: row 1 is $a$, row 2 is $b$.', '$a = 2$ and $b = 3$. Row 3 checks: $2 + 3 = 5$.'],
  hints2: ['Rows 1 and 2 fix $a$ and $b$. Does row 3 agree?', 'Rows 1 and 2 give $a = 1$, $b = 1$. Row 3 gives $1 + 1 = 2$, not $0$.', 'Press **No weights work**.'],
  askHints: ['Add them up.'],
};
