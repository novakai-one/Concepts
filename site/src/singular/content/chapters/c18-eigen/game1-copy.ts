// Chapter 18, Game 1 (Scenes 1–3) and its name card: every word the player reads.
// Plain maths, written the way a textbook writes it (docs/singular/ch18-plain-style.md): vectors stacked,
// a number multiplying a vector on its left, the matrix on the left of the vector. No story words.
// Before the name card the words "eigenvector", "eigenvalue" and λ are not used.
import type { Vec } from '../../../math/la.ts';
import type { MultVerdict } from './traj-logic.ts';
import type { Line } from '../../lines';
import { tnp, tcol, tmul, type Seen } from './traj-text.ts';

const vt = tcol;
const col = (a: string, b: string): string => String.raw`\begin{bmatrix}${a} \\ ${b}\end{bmatrix}`;

/** A wrong number in the box: what it gives, next to what is true. */
export function game1WrongMultiplier(v: Vec, answer: MultVerdict): string {
  return `$${tmul(answer.m, v)} = ${vt(answer.scaled)}$, not $${vt(answer.image)}$.`;
}

export const GAME1 = {
  title: 'Find vectors that stay on their line',
  goal: 'Find a vector $\\mathbf v$ where $A\\mathbf v$ stays on the line through $\\mathbf v$. Then find one on a different line.',
  subgoals: [
    'Find a vector that stays on its line',
    'Fill in its number',
    'Find a second line, and its number',
  ],
  start: 'Type any vector $\\mathbf v$. Then press **Apply $A$**.',
  firstMiss: (v: Vec, w: Vec) => `$A${vt(v)} = ${vt(w)}$. It left the green line through $\\mathbf v$.`,
  edit: 'Find a $\\mathbf v$ where $A\\mathbf v$ stays on that line.',
  miss: (v: Vec, w: Vec) => `$A${vt(v)} = ${vt(w)}$. Off the line. Try another vector.`,
  kept: '$A\\mathbf v$ stayed on the line. Fill in the box:',
  right: (v: Vec, m: number) => `Right: $A${vt(v)} = ${tmul(m, v)}$.`,
  another: 'Now find a vector on a different line.',
  dupe: (v: Vec, base: Vec, k: number) => `$${vt(v)} = ${tmul(k, base)}$: the same line. Find a different line.`,
  dupePending: (v: Vec, base: Vec) => `$${vt(v)}$ is on the line of $${vt(base)}$. Fill in the box first.`,
  again: 'You found this line already. Find a different line.',
  againPending: 'Fill in the box first.',
  queued: 'A second line. Fill in the first box, then this one.',
  done: 'Both found. Watch: points on the two lines stay on them. Other points turn.',
  zero: `$${vt([0, 0])}$ has no line. Type a vector that is not zero.`,
  unreadVector: 'Type one number in each box, like $2$, $-1$ or $0.5$.',
  unreadMultiplier: 'Type one number, like $2$, $-1$ or $0.5$.',
  wrongMultiplier: game1WrongMultiplier,
  hints: {
    first: 'Type a number in each box, any numbers. Then press **Apply $A$**.',
    find1: [
      'You want yellow ($A\\mathbf v$) on the green line through $\\mathbf v$. It can be longer or shorter.',
      `For $\\mathbf v = ${col('a', 'b')}$, $A\\mathbf v = ${col('2a + b', 'a + 2b')}$. What if $a = b$?`,
      `Try $${vt([1, 1])}$.`,
    ],
    ask: (v: Vec, w: Vec) => {
      const i = v[0] !== 0 ? 0 : 1;
      return [
        `Which number times $${vt(v)}$ gives $${vt(w)}$?`,
        `$${tnp(w[i])} \\div ${tnp(v[i])}$. Check that it works for both numbers.`,
      ];
    },
    find2: (have: Vec) => Math.abs(have[0] - have[1]) < 1e-9 * (Math.abs(have[0]) + 1) ? [
      `Any number times $${vt(have)}$ is on the same line. Try a different direction.`,
      `Try $\\mathbf v = ${col('a', '-a')}$. What does $A$ do to it?`,
      `Try $${vt([1, -1])}$.`,
    ] : [
      `Any number times $${vt(have)}$ is on the same line. Try a different direction.`,
      `Try $\\mathbf v = ${col('a', 'a')}$. What does $A$ do to it?`,
      `Try $${vt([1, 1])}$.`,
    ],
  },
};

// Labels and help text on the Game 1 panel.
export const GAME1_UI = {
  vectorLabel: String.raw`$\mathbf v =$`,
  test: 'Apply $A$',
  check: 'Check',
  help: 'Green is $\\mathbf v$ and its line through the origin. Yellow is $A\\mathbf v$.\n\nDecimals ($0.5$) and fractions ($1/2$) work.',
  multiplierAria: 'The number in the equation',
  firstCoordinateAria: 'First number of v',
  secondCoordinateAria: 'Second number of v',
  signTitle: 'Change the sign',
  foundChip: (v: Vec, m: number) => String.raw`$A${vt(v)} = ${tmul(m, v)}$`,
};

// No dialogue around Game 1: the puzzle says everything the player needs.
export const GAME1_DIALOGUE: { intro: Line[]; win: Line[] } = { intro: [], win: [] };

/** The player's own two equations, or the standard ones after a Skip. */
const examples = (seen?: Seen): string => {
  const lines = seen?.lines?.length === 2 ? seen.lines : [[[1, 1], [3, 3], 3], [[1, -1], [1, -1], 1]] as [Vec, Vec, number][];
  return `You found ${lines.map(([v, , m]) => `$A${vt(v)} = ${tmul(m, v)}$`).join(' and ')}.`;
};

// The name card right after Game 1.
export const GAME1_NAME = {
  inShort: 'A matrix moves vectors. Most vectors come out pointing a new way. A few stay on their own line. Find them.',
  question: 'What is an eigenvector?',
  saw: examples,
  means: 'For these vectors, $A$ only multiplies by a number.',
  name: 'A vector like this is an **eigenvector** of $A$. The number is its **eigenvalue**, written $\\lambda$.',
  formula: String.raw`A\mathbf v = \lambda\mathbf v \qquad (\mathbf v \neq \mathbf 0)`,
  why: `Any multiple of an eigenvector is on the same line, with the same $\\lambda$: for example $2${vt([1, 1])}$ or $-${vt([1, 1])}$.`,
  use: 'Eigenvectors give the main directions in data (PCA), the ways a bridge vibrates, and Google’s PageRank.',
};
