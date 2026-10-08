// Chapter 3: every word the player reads (docs/singular/ch18-plain-style.md). Vectors stacked, a number on the left
// of its vector, one short sentence plus the calculation. "Dependent" and "independent" appear only from the name
// card on.
import type { Vec } from '../../../kit/plain';
import { tn, tv } from '../../../kit/plain';

export const V: Vec = [1, 0, 1];
export const W: Vec = [0, 1, 1];
/** u = v + 2w: in the plane of v and w. */
export const U: Vec = [1, 2, 3];

export const TITLE = 'Can the other vectors already make this one?';

/** c times a vector, the number always written (the player typed it): 1[1;0;1], −2[0;1;1]. */
export const tc = (c: number, v: Vec | string): string => `${tn(c)}${typeof v === 'string' ? v : tv(v)}`;
/** A sum of terms c·v with the signs tidied: 2[..] − 1[..] + 3[..]. */
export function tsumc(terms: [number, Vec | string][]): string {
  return terms.map(([c, v], i) => {
    const x = typeof v === 'string' ? v : tv(v);
    if (i === 0) return `${tn(c)}${x}`;
    return `${c < 0 ? '-' : '+'} ${tn(Math.abs(c))}${x}`;
  }).join(' ');
}
/** A stacked column of symbols: [a; b; c]. */
export const tcol = (...xs: string[]): string => `\\begin{bmatrix}${xs.join(' \\\\ ')}\\end{bmatrix}`;

export const INSHORT = {
  title: TITLE,
  body: '$\\mathbf u$ stayed in the plane of $\\mathbf v$ and $\\mathbf w$.',
};

export const CATCHUP = 'A linear combination $a\\mathbf v + b\\mathbf w$ scales $\\mathbf v$ and $\\mathbf w$ and adds them. Two vectors on different lines reach a whole plane through the origin: their span.';

// ------------------------------------------------------------------ try it: a v + b w = u, then back to 0

export const TRY = {
  title: 'Make u from v and w',
  goal: 'Find $a$ and $b$ so that $a\\mathbf v + b\\mathbf w = \\mathbf u$.',
  subgoals: ['$a\\mathbf v + b\\mathbf w = \\mathbf u$', 'Back to $\\mathbf 0$'],
  head: `$\\mathbf v = ${tv(V)},\\ \\mathbf w = ${tv(W)},\\ \\mathbf u = ${tv(U)}$`,
  start: 'Type $a$ and $b$.',
  go: 'Draw',
  miss: (a: number, b: number, s: Vec) => `$${tsumc([[a, V], [b, W]])} = ${tv(s)}$, not $${tv(U)}$.`,
  hit: `$1${tv(V)} + 2${tv(W)} = ${tv(U)}$. So $\\mathbf v + 2\\mathbf w = \\mathbf u$.`,
  goal2: 'Fill in the box: $\\mathbf v + 2\\mathbf w + \\boxed{?}\\,\\mathbf u = \\mathbf 0$.',
  left2: '\\mathbf v + 2\\mathbf w +{}',
  right2: '\\mathbf u = \\mathbf 0',
  miss2: (c: number, end: Vec) => `$\\mathbf v + 2\\mathbf w ${c < 0 ? '-' : '+'} ${tn(Math.abs(c))}\\mathbf u = ${tv(end)}$, not $\\mathbf 0$.`,
  hit2: '$\\mathbf v + 2\\mathbf w - \\mathbf u = \\mathbf 0$. Back at the origin.',
  hints1: [
    'Top numbers first: $a \\cdot 1 + b \\cdot 0 = 1$.',
    'So $a = 1$. Middle numbers: $1 \\cdot 0 + b \\cdot 1 = 2$.',
    'Try $a = 1$ and $b = 2$.',
  ],
  hints2: [
    '$\\mathbf v + 2\\mathbf w$ ends at the tip of $\\mathbf u$. Go back along $\\mathbf u$.',
    'Try $-1$.',
  ],
};

// ------------------------------------------------------------------ the name card

export const NAME = {
  question: TITLE,
  saw: 'You found $\\mathbf v + 2\\mathbf w - \\mathbf u = \\mathbf 0$: the numbers $1$, $2$, $-1$ give $\\mathbf 0$.',
  means: '$\\mathbf u = \\mathbf v + 2\\mathbf w$. The other two already make $\\mathbf u$, so it adds nothing new.',
  name: 'Vectors are **linearly dependent** when some numbers, not all $0$, give $\\mathbf 0$. When only all $0$ gives $\\mathbf 0$, they are **linearly independent**.',
  formula: 'c_1\\mathbf v_1 + c_2\\mathbf v_2 + \\dots + c_k\\mathbf v_k = \\mathbf 0',
  why: 'Dependent: true with some $c_i \\neq 0$. Independent: true only with every $c_i = 0$.',
  use: 'In data, a column made from other columns adds no new information.',
};

// ------------------------------------------------------------------ the wrap-up

export const WRAP = {
  title: 'Linear independence',
  body: [
    '- $c_1\\mathbf v_1 + \\dots + c_k\\mathbf v_k = \\mathbf 0$ only when every $c_i = 0$: **independent**. Otherwise **dependent**.',
    '- $n + 1$ vectors in $\\mathbb R^n$ are always dependent.',
    '- A set that contains $\\mathbf 0$ is always dependent.',
    '',
    '**Why it matters.** A data column made from other columns adds nothing new, and a model cannot tell which of them to use.',
  ].join('\n'),
};

// ------------------------------------------------------------------ the practice shells

export const DRILL = { title: 'Practice: ten short rounds', goal: 'Ten short rounds.' };
export const MORE = { title: 'Harder cases', goal: 'Four short rounds.' };
export const FIND = 'Find the number.';
export const UNREAD_N = 'Type one number, like $2$, $-1$ or $0.5$.';
