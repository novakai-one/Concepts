// Chapter 10: "What if there is no single answer?" (N11) → reduced row echelon form, free and basic
// variables, parametric vector form, homogeneous systems, particular solutions. Ends Act III: the set
// piece (power to the pod bay), Bram's Act III Review, the NumPy card, and Teo's empty pod.
import type { ChapterDef } from '../../../game/types';
import { p1, p2, p3, p4, p5, p6, setPiece } from './puzzles';
import { sayit, doubtOne, doubtFree, doubtRhs, law, compare, review } from './briefing';
import { buildRref, buildSolve, buildReachable } from './build';
import { coldOpen, closing } from './cine';
import { scanScene } from '../c08-systems/cine';
import { bridgeShot } from '../../common/shots';
import { S } from './script';
import '../c08-systems/act3.css';

const bay = scanScene('bay');

const IN_SHORT = 'What does the answer look like when there are infinitely many?\n\n**One answer plus any amount of each free direction.** A row that says 0 = 1 means no answer at all.';

const ch: ChapterDef = {
  id: 'c10',
  act: 3,
  num: 10,
  title: 'What if there is no single answer?',
  subtitle: 'Every solution at once',
  nodes: ['N11'],
  palette: 'gold',
  music: 'explore',
  inShort: IN_SHORT,
  prereqs: ['c09', 'c02'],
  catchup: 'Row operations (swap, scale by a number that is not 0, add a multiple of a row) never change where the planes meet. A staircase of rows can be read from the bottom up.\n\nStory so far: power is back on deck seven. Teo\'s pod is in bay three, and the feed to the bay still needs routing.',
  script: S,
  beats: [
    { kind: 'cinematic', id: 'cold', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', visual: bay, title: 'What if there is no single answer?', body: IN_SHORT } },
    { kind: 'scene', id: 'finish', lines: S.finish, setup: bay },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    {
      kind: 'name', id: 'name-rref', entry: {
        id: 'rref', term: 'reduced row echelon form', question: 'How far should we reduce?', nodes: ['N11'], visual: bay,
        saw: 'Three more steps cleared above each pivot. Every plane turned until it stood square to one axis, and each row read off one unknown: x = 1, y = 2, z = 3.',
        means: 'Nothing is left to climb. Each row names one unknown directly.',
        name: 'In **reduced row echelon form** every pivot is 1, with zeros above and below it. Each system reduces to exactly one such form, whatever order of steps you take.',
        formula: '\\left[\\begin{array}{ccc|c} 1 & 2 & 1 & 8 \\\\ 0 & 1 & 2 & 8 \\\\ 0 & 0 & 1 & 3 \\end{array}\\right] \\to \\left[\\begin{array}{ccc|c} 1 & 0 & 0 & \\cy{1} \\\\ 0 & 1 & 0 & \\cy{2} \\\\ 0 & 0 & 1 & \\cy{3} \\end{array}\\right]',
        why: 'Clearing above a pivot uses the same move as clearing below it: subtract a multiple of the pivot row.',
        cue: 'When you want to read every answer straight off the rows, think **reduced row echelon form**.',
        use: 'Computer algebra systems give the reduced form as their fingerprint of a system: two systems with the same one have the same answers.',
      },
    },
    { kind: 'scene', id: 'line', lines: S.line, setup: bay },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    {
      kind: 'name', id: 'name-free', entry: {
        id: 'free-variable', term: 'free variable', question: 'What is the dial?', nodes: ['N11'], visual: bay,
        saw: 'The bottom row turned to zeros and the third column had no pivot. Turning its dial slid the yellow point along a line, and every plane stayed satisfied.',
        means: 'A column with no pivot is an unknown no row pins down. Choose it, and the rows fix the others.',
        name: 'An unknown whose column has a pivot is a **basic variable**; one whose column has no pivot is a **free variable**. A free variable\'s value is a **parameter**, often called $t$. Writing every answer as a point plus parameters times directions is the **parametric vector form**.',
        formula: '\\begin{bmatrix} x_1 \\\\ x_2 \\\\ x_3 \\end{bmatrix} = \\cy{\\begin{bmatrix} 3 \\\\ 1 \\\\ 0 \\end{bmatrix}} + t \\begin{bmatrix} 1 \\\\ 1 \\\\ 1 \\end{bmatrix}',
        why: 'The reduced rows read $x_1 = 3 + x_3$ and $x_2 = 1 + x_3$. Call $x_3 = t$ and collect by $t$.',
        cue: 'When you see a column with no pivot, think **a free dial**.',
        use: 'A robot arm with more joints than it needs has free variables: joint motions that keep the hand still.',
      },
    },
    { kind: 'scene', id: 'liar', lines: S.liar, setup: bay },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    { kind: 'scene', id: 'plane', lines: S.plane, setup: bay },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    { kind: 'scene', id: 'km', lines: S.km, setup: bay },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    { kind: 'scene', id: 'shift', lines: S.shift, setup: bay },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    {
      kind: 'name', id: 'name-homogeneous', entry: {
        id: 'homogeneous', term: 'homogeneous system', question: 'Why were the two lines parallel?', nodes: ['N11'], visual: bay,
        saw: 'With every meter at 0 the answers formed a line through the origin. One arrow, from the origin to any point of the real answers, moved that line exactly onto the real one.',
        means: 'Every answer is one answer plus an answer of the zero-meter system. The difference of two answers reads 0 on every meter.',
        name: 'A system with every right side 0 is **homogeneous**. Its answer $\\mathbf x = \\mathbf 0$ is the $\\text{trivial solution}$. Any one answer of the full system is a **particular solution**.',
        formula: '\\mathbf x = \\cy{\\mathbf p} + \\mathbf h, \\qquad A\\text{-rows at } \\mathbf p \\text{ read } \\mathbf b, \\quad \\text{at } \\mathbf h \\text{ read } \\mathbf 0',
        why: 'Each equation adds: at $\\mathbf p + \\mathbf h$ it reads $b + 0 = b$. And at the difference of two answers it reads $b - b = 0$.',
        cue: 'When you see "describe all solutions", think **one particular solution plus the homogeneous ones**.',
        use: 'With more weights than data points, a model that can fit the data exactly has a whole line (or plane) of perfect fits: one fit plus anything the data cannot see.',
      },
    },
    { kind: 'scene', id: 'brief', lines: S.brief, setup: bridgeShot },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-one', doubt: doubtOne },
    { kind: 'doubt', id: 'd-rhs', doubt: doubtRhs },
    { kind: 'doubt', id: 'd-free', doubt: doubtFree },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    {
      kind: 'card', id: 'why', card: {
        kind: 'why', visual: bay, title: 'Why it matters',
        body: 'When a model has more weights than data points and the data do not contradict each other, infinitely many weight settings fit the data perfectly: one fit plus a whole free direction. (Two identical inputs with different targets cannot both be fit; more weights allow a line of fits, they do not promise one.) Training needs a **rule to pick one**.\n\nYou used such a rule on the pod bay flows: of all the routings, $t = 0$ gave the least total load. Machine learning\'s rules (keep the weights small, prefer the simplest fit) play the same part.',
        cue: 'When you see “how many solutions” or “describe all solutions”, think **reduce, then count pivots**.',
      },
    },
    { kind: 'build', id: 'build-rref', build: buildRref },
    { kind: 'build', id: 'build-solve', build: buildSolve },
    { kind: 'build', id: 'build-reachable', build: buildReachable },
    { kind: 'scene', id: 'sp-intro', lines: S.sp, setup: bay },
    { kind: 'puzzle', id: 'sp', puzzle: setPiece },
    { kind: 'scene', id: 'review-intro', lines: S.review, setup: bay },
    { kind: 'review', id: 'c10-review', review },
    { kind: 'cinematic', id: 'close', run: closing },
  ],
};

export default ch;
