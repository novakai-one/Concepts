// Chapter 19: "Where will everything be after fifty pulses?" (GDD §6.9, N21). Diagonalisation and matrix
// powers: forecast in the grid of lines that hold, fifty pulses as three moves (the inner P⁻¹P pairs
// cancel), by hand, the shear that has too few lines, a two-site system settling, Fibonacci by squaring.
// Builds mat_pow and diagonalise2; Vell's fifty-pulse forecast runs on the player's mat_pow. Teach Teo T3.
import type { Beat, ChapterDef } from '../../../game/types';
import { bridgeShot } from '../../common/shots';
import { exteriorShot, fieldShot } from '../c18-eigen/scenes';
import { p1, p2, p3 } from './puzzles';
import { p4, p5, p6 } from './puzzles2';
import { compare, doubtAnchor, doubtDistinct, doubtInv, law, sayit, teo } from './briefing';
import { buildDiag2, buildMatPow } from './build';
import { coldOpen, forecast } from './scenes';
import { S } from './script';

const IN_SHORT_ANSWER = 'Where is a point after fifty pulses? Write it in the grid of **lines that hold**. Each part only stretches, so fifty pulses multiply each part by its stretch fifty times.';

const NAME_DIAG: Beat = {
  kind: 'name', id: 'name-diag', entry: {
    id: 'diagonalisation', term: 'diagonalisation', question: 'How do we repeat a move fifty times without fifty multiplications?', nodes: ['N21'],
    saw: 'Fifty copies of $PDP^{-1}$ stood on the rail. Every $P^{-1}P$ in the middle cancelled to $I$, leaving $PD^{50}P^{-1}$. Played on the cloud, every piece slid onto the line $(1, 1)$.',
    means: 'In the grid of its eigenvectors the move only stretches each axis. Repeating it repeats the stretching: **one power per axis**.',
    name: 'Writing $A = PDP^{-1}$, with eigenvectors as the columns of $P$ and their eigenvalues on the diagonal of $D$ in the same order, is **diagonalisation**. A matrix that can be written this way is **diagonalisable**.',
    formula: 'A = P\\,D\\,P^{-1} \\qquad A^{k} = P\\,D^{k}\\,P^{-1} \\qquad D^{50} = \\begin{bmatrix} 1 & 0 \\\\ 0 & 0.5^{50} \\end{bmatrix}',
    why: '$AP = PD$ says, column by column, $A\\mathbf v_i = \\lambda_i\\mathbf v_i$. If $P$ has an inverse, $A = PDP^{-1}$, and in $A^k$ each $P^{-1}P$ in the middle is $I$.',
    cue: 'When you see $A^{100}$ or **“after n steps”**, think **re-grid first**.',
    use: 'Whether a recurrent network’s signal grows or fades over many steps is read off the powers of its weight matrix’s eigenvalues.',
  },
};

const NAME_GEOM: Beat = {
  kind: 'name', id: 'name-geom', entry: {
    id: 'geometric-multiplicity', term: 'geometric multiplicity', question: 'When are there not enough lines?', nodes: ['N21'],
    saw: 'Both columns for the shear landed on the one line it keeps. $\\det P = 0$: rejected. Its λ = 1 is a double root, with one line.',
    means: 'A repeated eigenvalue can have fewer independent eigenvectors than its count as a root, and then there are too few lines for a grid. A quarter turn has no real line at all; with complex numbers it can be diagonalised.',
    name: 'The number of independent eigenvectors for λ (the dimension of its eigenspace) is its **geometric multiplicity**. A matrix is diagonalisable exactly when every eigenvalue’s geometric multiplicity equals its algebraic multiplicity.',
    formula: '\\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\end{bmatrix}:\\quad \\lambda = 1,\\ \\text{algebraic } 2,\\ \\text{geometric } 1',
    why: 'Different real eigenvalues always give independent lines, so $n$ different real eigenvalues are enough. With a repeated one, count the null space of $A - \\lambda I$.',
    cue: 'When an eigenvalue repeats, think **count its lines**: geometric against algebraic multiplicity.',
    use: '`np.linalg.eig` gives no warning for a shear. Its two eigenvector columns come back almost on one line, so $P$ is nearly flat: $PD^{50}P^{-1}$ returns $I$ instead of $A^{50}$, and forecasting by powers of $D$ silently fails.',
  },
};

const NAME_DDS: Beat = {
  kind: 'name', id: 'name-dds', entry: {
    id: 'discrete-dynamical-system', term: 'discrete dynamical system', question: 'What is a rule repeated step after step?', nodes: ['N21'],
    saw: 'The two sites moved by the same shares every step. The point slid along $a + b = 1$ to $(2/3, 1/3)$, on the line with stretch 1, and the gap shrank to 0.7 of itself each step.',
    means: 'Repeating one matrix, step after step, can be forecast from its eigenvectors: each part of the start is multiplied by its own λ every step.',
    name: 'A **discrete dynamical system** is $\\mathbf x_{k+1} = A\\mathbf x_k$: the state after each step is $A$ times the state before.',
    formula: '\\begin{gathered} \\mathbf x_k = A^k\\mathbf x_0 = c_1\\lambda_1^k\\mathbf v_1 + c_2\\lambda_2^k\\mathbf v_2 \\\\ = \\cy{\\tfrac13\\begin{bmatrix} 2 \\\\ 1 \\end{bmatrix}} + \\tfrac13(0.7)^k\\begin{bmatrix} 1 \\\\ -1 \\end{bmatrix} \\end{gathered}',
    why: 'Write $\\mathbf x_0$ in the grid of lines that hold. Parts with $|\\lambda| < 1$ shrink away; a part with $\\lambda = 1$ stays; $|\\lambda| > 1$ grows.',
    cue: 'When you see **“every step, the same rule”**, think $\\mathbf x_{k+1} = A\\mathbf x_k$: the eigenvalues decide the long run.',
    use: 'Population models, web ranking and the hidden state of a recurrent network are discrete dynamical systems.',
  },
};

const WHY = 'Repeated squaring computes $A^{50}$ in fewer than ten products instead of 49, and $A^{1000000}$ in 27 instead of 999,999. That is how Fibonacci numbers are computed in $O(\\log n)$ steps.\n\nIn a graph’s link matrix, entry $(i, j)$ of $A^k$ counts the walks of length $k$ from $j$ to $i$. And whether a recurrent network’s signal grows or fades over many steps is decided by the powers of its eigenvalues: $|\\lambda|^k$.\n\nVell’s fifty-pulse forecast, next, runs on your `mat_pow`.';

const ch: ChapterDef = {
  id: 'c19',
  act: 7,
  num: 19,
  title: 'Where will everything be after fifty pulses?',
  subtitle: 'Repeating a move',
  nodes: ['N21'],
  palette: 'teal',
  music: 'explore',
  script: S,
  inShort: `Where will everything be after fifty pulses?\n\n${IN_SHORT_ANSWER}`,
  prereqs: ['c18', 'c17'],
  catchup: 'An **eigenvector** is an arrow a move keeps on its own line; its **eigenvalue** is the stretch. A move written in another grid is $P^{-1}AP$: translate in, move, translate back. Story so far: Vell plans fifty repeats of his pulse, whose lines are $(1, 1, 1)$, $(1, -1, 0)$ and $(1, 1, -2)$ with stretches 1, 0.5 and 0.2.',
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'Where will everything be after fifty pulses?', body: IN_SHORT_ANSWER } },
    { kind: 'scene', id: 'p1-intro', lines: S.p1Intro, setup: fieldShot },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    NAME_DIAG,
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    NAME_GEOM,
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: exteriorShot },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    NAME_DDS,
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'scene', id: 'brief-intro', lines: S.briefing, setup: bridgeShot },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-anchor', doubt: doubtAnchor },
    { kind: 'doubt', id: 'd-distinct', doubt: doubtDistinct },
    { kind: 'doubt', id: 'd-inv', doubt: doubtInv },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When you see $A^{100}$ or **“after n steps”**, think **re-grid first**.' } },
    { kind: 'build', id: 'build-mat-pow', build: buildMatPow },
    { kind: 'build', id: 'build-diag2', build: buildDiag2 },
    { kind: 'cinematic', id: 'forecast', run: forecast },
    { kind: 'scene', id: 'teo-ask', lines: S.teoAsk, setup: exteriorShot },
    { kind: 'teo', id: 'c19-teo', teo },
    { kind: 'scene', id: 'teo-sent', lines: S.teoSent, setup: exteriorShot },
  ],
};

export default ch;
