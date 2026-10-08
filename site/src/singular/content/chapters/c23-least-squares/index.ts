// Chapter 23: "What is the best answer when the readings disagree?" (GDD §6.10, N25): least squares and the
// normal equations. The fit board (each leftover a literal square) and the twin view (the same problem in
// data space). The Act VIII set piece fits the Collapse pulse to three decimals; the Residual: Teo is alive.
// Ends Act VIII with Ilse's Review (the NumPy card follows automatically).
import type { Beat, ChapterDef } from '../../../game/types';
import { bridgeShot } from '../../common/shots';
import { dronesShot, hatchShot } from '../c21-projection/stage';
import { p1, p2, p3, p4 } from './puzzles';
import { p5, p6, p7 } from './puzzles2';
import { compare, doubtExact, doubtPerp, doubtThrough, law, review, sayit } from './briefing';
import { buildLeastSquares } from './build';
import { coldOpen, residualBeat } from './scenes';
import { S } from './script';

const IN_SHORT_ANSWER = 'No exact answer fits all the readings. The best one makes its predictions the closest point to the readings, and the leftover is at a right angle to everything the model can produce.';
const IN_SHORT = `What is the best answer when the readings disagree?\n\n${IN_SHORT_ANSWER}`;

const NAME_LS: Beat = {
  kind: 'name', id: 'name-least-squares', entry: {
    id: 'least-squares', term: 'least-squares solution', question: 'What answer is wrong by the least?', nodes: ['N25'], visual: bridgeShot,
    saw: 'Readings 1, 2, 4 made one arrow $\\mathbf b = (1, 2, 4)$. Every line made a point of the plane of $(1, 1, 1)$ and $(0, 1, 2)$. The nearest point, $(5/6, 7/3, 23/6)$, was the best line $y = 5/6 + 1.5t$; its leftover $(1/6, -1/3, 1/6)$ read 0 against both columns.',
    means: 'When no mix of the columns hits $\\mathbf b$, take the nearest point the columns can reach: project $\\mathbf b$ onto the column space. The total square area on the board is the squared length of the leftover in data space.',
    name: 'The weights $\\hat{\\mathbf x}$ that make $A\\hat{\\mathbf x}$ nearest to $\\mathbf b$ are the **least-squares solution**. $\\mathbf b - A\\hat{\\mathbf x}$ is the **residual**. The equations $A^{\\mathsf T}A\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b$ are the **normal equations**.',
    formula: 'A^{\\mathsf T}A\\,\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b \\qquad \\begin{bmatrix} 3 & 3 \\\\ 3 & 5 \\end{bmatrix}\\hat{\\mathbf x} = \\begin{bmatrix} 7 \\\\ 10 \\end{bmatrix} \\Rightarrow \\hat{\\mathbf x} = \\cy{\\begin{bmatrix} 5/6 \\\\ 3/2 \\end{bmatrix}}',
    why: 'The residual must be perpendicular to every column (the nearest point, Chapter 21). Each column dotted with it is 0: that is $A^{\\mathsf T}(\\mathbf b - A\\hat{\\mathbf x}) = \\mathbf 0$. Multiply out and move $A^{\\mathsf T}A\\hat{\\mathbf x}$ across.',
    cue: 'When you see **more equations than unknowns** or **noisy data**, think **least squares: $A^{\\mathsf T}A\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b$**.',
    use: 'Linear regression, the first model in every machine-learning course, is this: one column per feature, one row per example.',
  },
};

const NAME_BEST: Beat = {
  kind: 'name', id: 'name-best-fit', entry: {
    id: 'line-of-best-fit', term: 'line of best fit', question: 'Which line describes the readings?', nodes: ['N25'],
    saw: 'For $(0, 1)$, $(1, 3)$, $(2, 2)$, $(3, 5)$, $(4, 4)$: $A^{\\mathsf T}A = \\begin{bmatrix} 5 & 10 \\\\ 10 & 30 \\end{bmatrix}$, $A^{\\mathsf T}\\mathbf b = (15, 38)$, and the line $y = 1.4 + 0.8t$ with total square area 3.6.',
    means: 'For a line $y = c_0 + c_1t$, $A$ has a column of 1s and a column of times. The normal equations need only the count $n$ and four sums: $\\sum t$, $\\sum t^2$, $\\sum y$ and $\\sum ty$.',
    name: 'The line $y = \\hat c_0 + \\hat c_1 t$ from the least-squares solution is the **line of best fit** (the regression line).',
    formula: '\\begin{bmatrix} n & \\sum t \\\\ \\sum t & \\sum t^2 \\end{bmatrix}\\begin{bmatrix} c_0 \\\\ c_1 \\end{bmatrix} = \\begin{bmatrix} \\sum y \\\\ \\sum t y \\end{bmatrix}',
    why: 'Row 1 of $A^{\\mathsf T}$ is all 1s, row 2 is the times; dotting them with the columns of $A$ and with $\\mathbf b$ gives exactly these sums.',
    cue: 'When you see **“fit a line to these points”**, think **two sums of $t$, two sums with $y$, one 2 × 2 system**.',
    use: 'Every spreadsheet’s trendline button solves exactly this 2 × 2 system.',
  },
};

const WHY = 'Linear regression, the starting point of machine learning, is least squares: one column per feature, one reading per row, weights from $A^{\\mathsf T}A\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b$. Training the same model by gradient descent on the squared error walks downhill to the same answer: the gradient is $2A^{\\mathsf T}(A\\mathbf x - \\mathbf b)$, zero exactly at the normal equations.\n\nAnd the leftover is never only waste. Looking at residuals is how you find what a model missed. You found a knock on a hull in *Is anything left over that is not noise?* The Collapse fit and its residual plot now run on your own `least_squares`.';

const ch: ChapterDef = {
  id: 'c23',
  act: 8,
  num: 23,
  title: 'What is the best answer when the readings disagree?',
  subtitle: 'The answer that is wrong by the least',
  nodes: ['N25'],
  palette: 'default',
  music: 'explore',
  script: S,
  inShort: IN_SHORT,
  prereqs: ['c21', 'c22', 'c16'],
  catchup: 'The nearest point of a plane to $\\mathbf b$ is where the leftover is perpendicular to the plane. With the plane’s arrows as the columns of $A$, that is $A^{\\mathsf T}(\\mathbf b - A\\hat{\\mathbf x}) = \\mathbf 0$. Story so far: the *Lantern* is tethered to the flattened stern, LANTERN’s frame is square again, and Teo’s channel answers nothing.',
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'What is the best answer when the readings disagree?', body: IN_SHORT_ANSWER } },
    { kind: 'scene', id: 'p1-intro', lines: S.p1Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    NAME_LS,
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    NAME_BEST,
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: hatchShot },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    { kind: 'scene', id: 'sp-intro', lines: S.spIntro, setup: dronesShot },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'scene', id: 'p7-intro', lines: S.p7Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'scene', id: 'brief-intro', lines: S.briefing, setup: bridgeShot },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-through', doubt: doubtThrough },
    { kind: 'doubt', id: 'd-exact', doubt: doubtExact },
    { kind: 'doubt', id: 'd-perp', doubt: doubtPerp },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When you see **“more equations than unknowns”** or **“noisy data”**, think **least squares**.' } },
    { kind: 'build', id: 'build-least-squares', build: buildLeastSquares },
    { kind: 'scene', id: 'review-intro', lines: S.reviewIntro, setup: bridgeShot },
    { kind: 'review', id: 'c23-review', review },
    { kind: 'cinematic', id: 'residual', run: residualBeat },
  ],
};

export default ch;
