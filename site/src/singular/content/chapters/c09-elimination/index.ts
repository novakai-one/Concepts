// Chapter 9: "How do we untangle the equations without changing the answer?" (N10) → augmented
// matrix, row operations, row echelon form, pivots, back substitution, Gaussian elimination.
import type { ChapterDef } from '../../../game/types';
import { p1, p2, p3, p4, p5, p6 } from './puzzles';
import { sayit, doubtSwap, doubtScale, doubtTwoRef, law, procedure, compare } from './briefing';
import { buildRowEchelon, buildBackSub } from './build';
import { coldOpen, closing, boardScene } from './cine';
import { bridgeShot } from '../../common/shots';
import { S } from './script';
import '../c08-systems/act3.css';

const IN_SHORT = 'How do we untangle the equations without changing the answer?\n\nCombine whole equations. Each step turns one plane about where it meets the others, so **the meeting point never moves**. Keep going until the bottom equation has one unknown.';

const ch: ChapterDef = {
  id: 'c09',
  act: 3,
  num: 9,
  title: 'How do we untangle the equations without changing the answer?',
  subtitle: 'Row operations and the staircase',
  nodes: ['N10'],
  palette: 'gold',
  music: 'explore',
  inShort: IN_SHORT,
  prereqs: ['c08'],
  catchup: 'Each equation in three unknowns is a plane, and a solution is a point on every plane. Three planes can meet at one point, along a line, in a whole plane (when all three are the same plane), or nowhere.\n\nStory so far: Teo\'s pod is in bay three, deck five, and the bay has no power. The power board is on deck seven.',
  script: S,
  beats: [
    { kind: 'cinematic', id: 'cold', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', visual: boardScene, title: 'How do we untangle the equations without changing the answer?', body: IN_SHORT } },
    { kind: 'scene', id: 'board', lines: S.board, setup: boardScene },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    {
      kind: 'name', id: 'name-augmented', entry: {
        id: 'augmented-matrix', term: 'augmented matrix', question: 'What is the board we have been working on?', nodes: ['N10'], visual: boardScene,
        saw: 'Each row of the board held one meter\'s equation: its three numbers, a bar, then the reading. Every step changed whole rows, and the yellow point never moved.',
        means: 'The letters x, y and z only label the columns. Working on the numbers is the same as working on the equations.',
        name: 'A **matrix** is a grid of numbers. The **coefficient matrix** holds the numbers in front of the unknowns; the **augmented matrix** adds the right sides as one more column, after a bar. A **row operation** is one of three moves: **swap** two rows, **scale** a row by a number that is not 0, or **replace** a row by itself plus a multiple of another row.',
        formula: '\\left[\\begin{array}{ccc|c} 1 & 2 & 1 & 8 \\\\ 2 & 5 & 4 & 24 \\\\ 1 & 3 & 4 & 19 \\end{array}\\right] \\xrightarrow{\\;R_2 - 2R_1\\;} \\left[\\begin{array}{ccc|c} 1 & 2 & 1 & 8 \\\\ 0 & 1 & 2 & 8 \\\\ 1 & 3 & 4 & 19 \\end{array}\\right]',
        why: 'A point that makes two equations true makes any combination of them true. Each row operation can be undone by another, so no point is gained or lost.',
        cue: 'When you see a system to solve, think **augmented matrix**.',
        use: 'Every linear solver stores a system this way: one grid of numbers in memory.',
      },
    },
    {
      kind: 'name', id: 'name-ref', entry: {
        id: 'row-echelon-form', term: 'row echelon form', question: 'What shape were we aiming for?', nodes: ['N10'], visual: boardScene,
        saw: 'After three steps, each row started further right than the row above, with zeros under each first number. The bottom row read z = 3.',
        means: 'A staircase lets you read the bottom equation, which has one unknown, and then climb.',
        name: 'A matrix is in **row echelon form** when each row\'s first non-zero number sits to the right of the one in the row above, and any rows of zeros are at the bottom. Each of those first numbers is a **pivot**; its column is a **pivot column**.',
        formula: '\\left[\\begin{array}{ccc|c} \\boxed{1} & 2 & 1 & 8 \\\\ 0 & \\boxed{1} & 2 & 8 \\\\ 0 & 0 & \\boxed{1} & 3 \\end{array}\\right]',
        why: 'The zeros under each pivot mean that row has no $x$ (then no $y$). The bottom row has one unknown left.',
        cue: 'When you need to read off an answer, think **staircase first**.',
        use: 'Statistics packages reduce to this shape before they solve, and so does the computer algebra in your calculator.',
      },
    },
    { kind: 'scene', id: 'climb', lines: S.climb, setup: boardScene },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    {
      kind: 'name', id: 'name-backsub', entry: {
        id: 'back-substitution', term: 'back substitution', question: 'How do we read the answer from a staircase?', nodes: ['N10'], visual: boardScene,
        saw: 'The bottom row gave z. Putting z into the row above gave y. Putting both into the top row gave x. Each generator lit in turn.',
        means: 'Each row above the bottom has exactly one new unknown once the ones below it are known.',
        name: '**Back substitution** solves the bottom row first, then puts each value into the row above. Row operations to a staircase followed by back substitution is **Gaussian elimination**. Two matrices joined by row operations are **row equivalent**: they have the same solutions.',
        formula: 'z = 3, \\quad y = 8 - 2(3) = 2, \\quad x = 8 - 2(2) - 3 = 1',
        why: 'Once $z$ is known, row 2 has one unknown. Once $y$ and $z$ are known, row 1 has one unknown.',
        cue: 'When the matrix is a staircase, think **climb back from the bottom**.',
        use: '`numpy.linalg.solve` does Gaussian elimination, then back substitution, in compiled code.',
      },
    },
    { kind: 'scene', id: 'zero', lines: S.zero, setup: boardScene },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    { kind: 'scene', id: 'sandbox', lines: S.sandbox, setup: boardScene },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    { kind: 'scene', id: 'gain', lines: S.gain, setup: boardScene },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    { kind: 'scene', id: 'hand', lines: S.hand, setup: boardScene },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'scene', id: 'brief', lines: S.brief, setup: bridgeShot },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-swap', doubt: doubtSwap },
    { kind: 'doubt', id: 'd-tworef', doubt: doubtTwoRef },
    { kind: 'doubt', id: 'd-scale', doubt: doubtScale },
    { kind: 'law', id: 'law', law },
    { kind: 'scene', id: 'proc-intro', lines: S.proc, setup: boardScene },
    { kind: 'procedure', id: 'procedure', procedure },
    { kind: 'compare', id: 'compare', compare },
    {
      kind: 'card', id: 'why', card: {
        kind: 'why', visual: boardScene, title: 'Why it matters',
        body: 'Gaussian elimination on $n$ equations takes about $\\tfrac23 n^3$ arithmetic operations (about $\\tfrac13 n^3$ multiplications and as many subtractions). Make the system 4 times bigger and it takes about $4^3 = 64$ times longer: a million unknowns would need about $7\\times10^{17}$ operations and 8 TB of memory, far beyond a laptop, which is why large problems use specialised solvers.\n\nLibraries also swap the **largest** entry into each pivot position (partial pivoting): dividing by a tiny pivot blows rounding errors up. Power routing on the ark now runs on your elimination.',
        cue: 'When you see a system to solve by hand, think **augmented matrix, staircase, climb back**.',
      },
    },
    { kind: 'build', id: 'build-row-echelon', build: buildRowEchelon },
    { kind: 'build', id: 'build-back-sub', build: buildBackSub },
    { kind: 'cinematic', id: 'close', run: closing },
  ],
};

export default ch;
