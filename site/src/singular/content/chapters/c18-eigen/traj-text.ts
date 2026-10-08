// Chapter 18, Scenes 4–6 (two applications of A, ten practice rounds, the challenge): every string the player
// reads, as markdown with $TeX$. Plain maths, written the way a textbook writes it (docs/singular/ch18-plain-style.md):
// vectors stacked, a number multiplying a vector on its left, the matrix on the left of the vector.
// Game 1's words (Scenes 1–3) are in game1-copy.ts. Plain data and pure functions, no DOM.
import type { Vec } from '../../../math/la.ts';
import { fmtN } from './logic.ts';
import type { MultVerdict } from './traj-logic.ts';

/** A number as TeX (ASCII minus). */
export const tn = (x: number): string => fmtN(x).replace(/−/g, '-');
/** A number as TeX with every digit the player typed (2.9999 stays 2.9999, never 3.00). */
export const tnp = (x: number): string => {
  const short = tn(x);
  return Math.abs(parseFloat(short) - x) < 1e-12 ? short : String(parseFloat(x.toPrecision(10)));
};
/** A vector as a stacked TeX column, every typed digit kept: \begin{bmatrix}1 \\ -1\end{bmatrix}. */
export const tcol = (v: Vec): string => `\\begin{bmatrix}${v.map(tnp).join(' \\\\ ')}\\end{bmatrix}`;
/** Every vector in maths is a column. */
export const tv = tcol;
/** A vector as plain text, for screen readers only: (1, −1). */
export const fv = (v: Vec): string => `(${v.map(fmtN).join(', ')})`;
/** m v, the number on the left: 3 [1; 1]; 1 v is just v, −1 v is −v. */
export const tmul = (m: number, v: Vec): string => `${Math.abs(m - 1) < 1e-12 ? '' : Math.abs(m + 1) < 1e-12 ? '-' : tnp(m)}${tv(v)}`;
/** A applied k times: A, A^2, A^3. */
export const tpow = (name: string, k: number): string => (k === 1 ? name : `${name}^{${k}}`);
/** The chain v → A v → A² v, each arrow labelled with the matrix. */
export const tchain = (pts: Vec[], name = 'A'): string => pts.map(tv).join(` \\xrightarrow{${name}} `);

/** An angle for the player: whole degrees, one decimal below 1°. */
export function fdeg(d: number): string {
  if (d >= 0.95) return `${Math.round(d)}°`;
  return d >= 0.05 ? `${d.toFixed(1)}°` : 'less than 0.1°';
}

/** A wrong number in a box: what it gives, next to what is true. */
export function wrongMult(v: Vec, w: MultVerdict): string {
  return `$${tmul(w.m, v)} = ${tv(w.scaled)}$, not $${tv(w.image)}$.`;
}

export const ZERO = `$${tv([0, 0])}$ has no line. Type a vector that is not zero.`;
export const UNREAD = 'Type one number in each box, like $2$, $-1$ or $0.5$.';
export const UNREAD_M = 'Type one number, like $2$, $-1$ or $0.5$.';

// ------------------------------------------------------------------ Scene 4: A applied twice

const T9 = tv([9, 9]);
export const M1T = {
  title: 'Apply A twice to hit the target',
  goal: `Find $\\mathbf v$ so that $A^2\\mathbf v = ${T9}$. ($A^2\\mathbf v$ means $A(A\\mathbf v)$: apply $A$, then apply it again.)`,
  subgoals: ['Hit the target'],
  go: 'Apply $A$ twice',
  start: `Find $\\mathbf v$ so that $A^2\\mathbf v = ${T9}$. Your two lines from before are drawn.`,
  hit: (pts: Vec[]) => `$${tchain(pts)}$. On target.`,
  miss: (pts: Vec[]) => `$${tchain(pts)}$. Not the target.`,
  missOnLine: 'Right line. How much does $A^2$ multiply by?',
  hints: [
    `The target is on the line through $${tv([1, 1])}$, where $\\lambda = 3$.`,
    `On that line each $A$ multiplies by 3, so $A^2$ multiplies by $9$. Which $\\mathbf v$ gives $9\\mathbf v = ${T9}$?`,
    `Try $\\mathbf v = ${tv([1, 1])}$.`,
  ],
  win: 'On the line of an eigenvector, each $A$ multiplies by $\\lambda$. So $A^2\\mathbf v = \\lambda^2\\mathbf v$.',
};

// ------------------------------------------------------------------ Scene 6: the challenge

export const SOLOT = {
  title: 'On your own: hit the target',
  goal: `Find $\\mathbf v$ so that $B^2\\mathbf v = ${tv([32, 16])}$. **Apply $B$** is a free test. **Apply $B$ twice** is your answer.`,
  subgoals: ['Hit the target'],
  start: `A new matrix $B$. Find $\\mathbf v$ so that $B^2\\mathbf v = ${tv([32, 16])}$.`,
  probe: (v: Vec, w: Vec, kept: boolean) => `$B${tv(v)} = ${tv(w)}$. ${kept ? 'On its line.' : 'Off its line.'}`,
  hit: (pts: Vec[]) => `$${tchain(pts, 'B')}$. On target.`,
  miss: (pts: Vec[]) => `$${tchain(pts, 'B')}$. Not the target.`,
  hints: [
    'Which line through the origin is the target on? Test a vector on that line.',
    `$${tv([32, 16])} = 16${tv([2, 1])}$. Work out $B${tv([2, 1])}$.`,
    `$B${tv([2, 1])} = ${tv([8, 4])} = 4${tv([2, 1])}$, so $B^2${tv([2, 1])} = 16${tv([2, 1])}$. Try $${tv([2, 1])}$.`,
  ],
  summary: (v: Vec, m: number, n: number, t: Vec) => `**Why it works.** $B${tv(v)} = ${tmul(m, v)}$, so $${tv(v)}$ is an eigenvector of $B$ with $\\lambda = ${tn(m)}$. Then $B^{${n}}${tv(v)} = ${tmul(m ** n, v)} = ${tv(t)}$.`,
  more: 'A new matrix, a new target.',
};

/** Labels for the results list. */
export const LOG_NAMES: Record<string, string> = {
  'p1-line1': 'First eigenvector',
  'p1-line2': 'Second eigenvector',
  m1: 'Apply A twice',
  'drill-1': 'Round 1 · pick the eigenvector',
  'drill-2': 'Round 2 · find λ',
  'drill-3': 'Round 3 · eigenvector or not',
  'drill-4': 'Round 4 · two eigenvectors',
  'drill-5': 'Round 5 · their λ',
  'drill-6': 'Round 6 · a negative λ',
  'drill-7': 'Round 7 · λ = 0',
  'drill-8': 'Round 8 · a shear',
  'drill-9': 'Round 9 · on your own',
  'drill-10': 'Round 10 · apply A three times',
  solo: 'On your own',
};
export const OUTCOME_NAMES = { independent: 'no help', corrected: 'after a mistake', assisted: 'with help' } as const;

// ------------------------------------------------------------------ Scene 5: ten practice rounds

const V11 = tv([1, 1]);

export const DRILL = {
  title: 'Practice: ten short rounds',
  goal: 'Ten short rounds.',
  roundGoal: (n: number, of: number, goal: string) => `**Round ${n}${of ? ` of ${of}` : ''}.** ${goal}`,
  next: 'Next round',
  doneRound: (out: string) => `Done · ${out}`,
  summary: (ind: number, cor: number, ass: number) => `**Practice done.** No help: ${ind}. After a mistake: ${cor}. With help: ${ass}.`,
  more: 'More rounds',
  finish: 'Finish',
  noHints: 'No hints in this round. **Show me** (under **More**) plays it for you.',
  r1: {
    name: 'pick the eigenvector',
    goal: 'Which of these is an eigenvector of $A$? Click one to apply $A$.',
    turned: (v: Vec, w: Vec) => `$A${tv(v)} = ${tv(w)}$. Off its line. Pick again.`,
    hit: (v: Vec, w: Vec, m: number) => `$A${tv(v)} = ${tv(w)} = ${tmul(m, v)}$. On its line.`,
    hints: [`An eigenvector of this $A$ is on the line through $${V11}$ or $${tv([1, -1])}$.`, `$${tv([-2, -2])} = -2${V11}$.`],
  },
  r2: {
    name: 'find λ',
    goal: 'Work out the number in the box. **Check** applies $A$.',
    hit: (v: Vec, w: Vec, m: number) => `$A${tv(v)} = ${tv(w)} = ${tmul(m, v)}$. Right.`,
    hints: (v: Vec, w: Vec) => [`Work out $A${tv(v)}$: each row of $A$ times $${tv(v)}$.`, `$A${tv(v)} = ${tv(w)}$. Which number times $${tv(v)}$ gives that?`],
  },
  r3: {
    name: 'eigenvector or not',
    goal: 'Is each vector an eigenvector of $A$? Then press **Check**.',
    opts: [['yes', 'Yes'], ['no', 'No']] as [string, string][],
    check: 'Check',
    whySame: (v: Vec, k: number) => `Yes. $${tv(v)} = ${tmul(k, [1, 1])}$: on the orange line.`,
    whyNew: (v: Vec, w: Vec, m: number) => `Yes. $A${tv(v)} = ${tmul(m, v)}$: a second line.`,
    whyTurns: (v: Vec, w: Vec) => `No. $A${tv(v)} = ${tv(w)}$: turned.`,
    wrong: 'Some are wrong (amber). Change them and press **Check** again.',
    hit: 'All right.',
    hints: ['Work out $A$ times each vector. Is the result a number times the vector?', `$A${tv([3, 1])} = ${tv([7, 5])}$, $A${tv([-4, -4])} = ${tv([-12, -12])}$, $A${tv([2, -2])} = ${tv([2, -2])}$.`],
    help: 'An eigenvector $\\mathbf v$ has $A\\mathbf v = \\lambda\\mathbf v$ for some number $\\lambda$.',
  },
  r4: {
    name: 'two eigenvectors',
    goal: 'A new matrix. Find two eigenvectors on different lines.',
    kept: (v: Vec) => `$A${tv(v)}$ is on the line through $${tv(v)}$: an eigenvector.`,
    same: (v: Vec, base: Vec) => `$${tv(v)}$ is on the line of $${tv(base)}$ again. Find a different line.`,
    turned: (v: Vec) => `$A${tv(v)}$ is off the line through $${tv(v)}$.`,
    hit: 'Both found. Next round: their $\\lambda$.',
    hints: ['Try the kind of vector that worked for the first matrix.', `Try $${V11}$ and $${tv([1, -1])}$.`],
  },
  r5: {
    name: 'their λ',
    goal: 'Work out both numbers from $A$. **Check** applies $A$.',
    one: (m: number) => `Right: $\\lambda = ${tn(m)}$.`,
    hit: 'Both right.',
    hints: (a: Vec, wa: Vec, b: Vec, wb: Vec) => [`Work out $A${tv(a)}$ and $A${tv(b)}$.`, `$A${tv(a)} = ${tv(wa)}$ and $A${tv(b)} = ${tv(wb)}$.`],
  },
  r6: {
    name: 'a negative λ',
    goal: `Find $\\mathbf v$ so that $A\\mathbf v = ${tv([0, -3])}$. Then find its $\\lambda$.`,
    go: 'Apply $A$',
    // the goal line above the controls already asks this
    start: '',
    hit: (pts: Vec[]) => `$${tchain(pts)}$. On target.`,
    miss: (pts: Vec[]) => `$${tchain(pts)}$. Not the target.`,
    ask: 'Fill in the box:',
    done: (m: number) => `$\\lambda = ${tn(m)}$. A negative $\\lambda$ flips the vector through the origin.`,
    hints: [`This $A$ doubles the first number and flips the sign of the second: $A\\begin{bmatrix}a\\\\b\\end{bmatrix} = \\begin{bmatrix}2a\\\\-b\\end{bmatrix}$.`, `Try $\\mathbf v = ${tv([0, 3])}$.`],
    askHints: (v: Vec, w: Vec) => [`$${tv(w)}$ points the opposite way to $${tv(v)}$, so $\\lambda$ is negative.`],
  },
  r7: {
    name: 'λ = 0',
    goal: `This $A$ squashes the plane onto a line. Find $\\mathbf v$ (not zero) so that $A\\mathbf v = ${tv([0, 0])}$. Then find its $\\lambda$.`,
    other: (v: Vec, w: Vec) => `$A${tv(v)} = ${tv(w)}$. On its line, but not zero.`,
    collapsed: (v: Vec) => `$A${tv(v)} = ${tv([0, 0])}$. Fill in the box:`,
    hints: [`$A\\begin{bmatrix}a\\\\b\\end{bmatrix} = \\begin{bmatrix}2a\\\\a\\end{bmatrix}$: the second number does not matter. When is that zero?`, `Try $${tv([0, 1])}$.`],
    askHints: (v: Vec) => [`$${tv([0, 0])} = \\lambda${tv(v)}$. Which $\\lambda$?`],
  },
  r8: {
    name: 'a shear',
    goal: 'Find a vector that stays on its line when $A$ is applied 3 times. Then find its $\\lambda$.',
    go: 'Apply $A$ 3 times',
    drift: (pts: Vec[]) => `$A^3${tv(pts[0])} = ${tv(pts[pts.length - 1])}$. Off its line.`,
    held: (v: Vec) => `$${tv(v)}$ stayed on its line. Fill in the box:`,
    hints: [`$A\\begin{bmatrix}a\\\\b\\end{bmatrix} = \\begin{bmatrix}a + b\\\\b\\end{bmatrix}$. When is that a number times $\\begin{bmatrix}a\\\\b\\end{bmatrix}$?`, `Try $${tv([1, 0])}$.`],
    askHints: ['$A\\mathbf v = \\mathbf v$ here. Which number leaves a vector as it is?'],
  },
  r9: {
    name: 'on your own',
    goal: 'Find two eigenvectors on different lines, and their $\\lambda$. No hints this round.',
  },
  r10: {
    name: 'apply A three times',
    goal: `Find $\\mathbf v$ so that $A^3\\mathbf v = ${tv([-8, 8])}$.`,
    go: 'Apply $A$ 3 times',
    start: '',
    hit: (pts: Vec[]) => `$${tchain(pts)}$. On target: each $A$ multiplies by $2$, and $2^3 = 8$.`,
    miss: (pts: Vec[]) => `$${tchain(pts)}$. Not the target.`,
    missOnLine: 'Right line. How much does $A^3$ multiply by?',
    hints: [`The target is on the line through $${tv([-1, 1])}$, where $\\lambda = 2$.`, `$A^3$ multiplies by $2^3 = 8$. Try $${tv([-1, 1])}$.`],
  },
  extraLines: {
    name: 'find both eigenvectors',
    goal: 'A new matrix. Find two eigenvectors on different lines, and their $\\lambda$.',
    hints: ['Look for $\\mathbf v$ where $A\\mathbf v$ is a number times $\\mathbf v$. Try small whole numbers.', 'For $\\mathbf v = \\begin{bmatrix}a\\\\b\\end{bmatrix}$, write $A\\mathbf v = \\lambda\\mathbf v$ as two equations and compare them.'],
  },
  extraMission: {
    name: 'apply A twice',
    goal: (t: Vec) => `A new matrix. Find $\\mathbf v$ so that $A^2\\mathbf v = ${tv(t)}$. **Apply $A$** is a free test.`,
    start: (_t: Vec) => '',
    hit: (pts: Vec[]) => `$${tchain(pts)}$. On target.`,
    miss: (pts: Vec[]) => `$${tchain(pts)}$. Not the target.`,
    hints: ['Which line through the origin is the target on? Test a vector on it.', 'If $A\\mathbf v = \\lambda\\mathbf v$, then $A^2\\mathbf v = \\lambda^2\\mathbf v$.'],
  },
  hunt: {
    test: 'Apply $A$',
    kept: (v: Vec) => `$${tv(v)}$ stayed on its line. Fill in the box:`,
    dupe: (v: Vec, base: Vec) => (v.every((x, i) => Math.abs(x - base[i]) < 1e-9)
      ? `You found $${tv(v)}$ already. Find a different line.`
      : `$${tv(v)}$ is on the line of $${tv(base)}$. Find a different line.`),
    turned: (v: Vec, w: Vec) => `$A${tv(v)} = ${tv(w)}$. Off its line.`,
    right: (v: Vec, m: number) => `Right: $A${tv(v)} = ${tmul(m, v)}$.`,
    another: 'Now find one on a different line.',
  },
};

// ------------------------------------------------------------------ what Game 1 recorded, for the name card

/** What Scenes 1–3 recorded: the first turned vector, the kept lines in the order found, the first multiple tested. */
export interface Seen { miss?: [Vec, Vec]; lines: [Vec, Vec, number][]; dupe?: [Vec, Vec, number] }
