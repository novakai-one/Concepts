// Chapter 24: "Which moves only stretch along perpendicular axes?" (GDD §6.11, N26), the first chapter of
// Act IX. Symmetric matrices and the spectral theorem (brace lines at right angles, and why), quadratic
// forms in their principal axes (turn the grid until the mixed term vanishes), bowl or saddle from the
// signs of the eigenvalues, a 3 × 3 with a repeated eigenvalue by hand, the extremes on the unit circle,
// and the Flip. Builds quad_form and sym_eigen; the brace planner runs on the player's sym_eigen.
import type { Beat, ChapterDef } from '../../../game/types';
import { bridgeShot } from '../../common/shots';
import { arkShot, sternShot } from './act9';
import { p1, p2, p3, p4 } from './puzzles';
import { p5, p6, p7 } from './puzzles2';
import { compare, doubtBowl, doubtCircle, doubtReal, law, sayit } from './briefing';
import { buildQuadForm, buildSymEigen } from './build';
import { braces, coldOpen } from './scenes';
import { S } from './script';

const IN_SHORT_ANSWER = 'Which moves only stretch along perpendicular axes? Moves whose matrix equals its own transpose. In those axes a height formula has **no mixed term**, so the signs of the stretches tell a bowl from a saddle.';

const NAME_SPECTRAL: Beat = {
  kind: 'name', id: 'name-spectral', entry: {
    id: 'spectral-theorem', term: 'spectral theorem', question: 'Which moves only stretch along perpendicular axes?', nodes: ['N26'],
    saw: 'The brace lines of the symmetric panel met at a right angle: $(1, 1)$ with stress 4 and $(1, -1)$ with stress 2. Bram shook five more symmetric panels: a right angle every time. Chapter 18’s matrix, which is not symmetric, kept two lines 72° apart.',
    means: 'A symmetric matrix only stretches, along perpendicular axes. In the grid of those axes it is a diagonal matrix: **turn, stretch, turn back**.',
    name: 'The **spectral theorem**: every symmetric matrix has real eigenvalues and a full set of perpendicular unit eigenvectors. So $S = QDQ^{\\mathsf T}$ with $Q$ an orthogonal matrix, and $S$ is **orthogonally diagonalisable**.',
    formula: '\\begin{bmatrix} 3 & 1 \\\\ 1 & 3 \\end{bmatrix} = \\cg{Q}\\begin{bmatrix} 4 & 0 \\\\ 0 & 2 \\end{bmatrix}\\cg{Q}^{\\mathsf T}, \\qquad \\cg{Q} = \\tfrac{1}{\\sqrt 2}\\begin{bmatrix} 1 & 1 \\\\ 1 & -1 \\end{bmatrix}',
    why: '$\\lambda(\\mathbf v\\cdot\\mathbf w) = (S\\mathbf v)\\cdot\\mathbf w = \\mathbf v\\cdot(S^{\\mathsf T}\\mathbf w) = \\mathbf v\\cdot(S\\mathbf w) = \\mu(\\mathbf v\\cdot\\mathbf w)$. With $\\lambda \\neq \\mu$, $\\mathbf v\\cdot\\mathbf w = 0$. Unit eigenvectors as columns make $Q^{\\mathsf T}Q = I$.',
    cue: 'When you see a **symmetric matrix**, think **perpendicular eigenvectors**: turn, stretch, turn back.',
    use: 'The spread of any cloud of data is described by a symmetric matrix, so its main directions are always at right angles.',
  },
};

const NAME_QUAD: Beat = {
  kind: 'name', id: 'name-quad', entry: {
    id: 'quadratic-form', term: 'quadratic form', question: 'How do I read a height formula without its mixed term?', nodes: ['N26'],
    saw: 'In the ship’s grid the panel’s energy was $2x^2 + 2xy + 2y^2$. Turning the survey grid by 45° made the $xy$ term vanish: $3u^2 + v^2$.',
    means: 'A height formula made of squares and products of the coordinates is a symmetric matrix in disguise. In the grid of its eigenvectors the mixed term is gone, and the eigenvalues are the numbers in front of the squares.',
    name: 'A **quadratic form** is $\\mathbf x^{\\mathsf T}S\\mathbf x$ with $S$ symmetric. The lines of the eigenvectors of $S$ are its **principal axes**. In them, $\\mathbf x^{\\mathsf T}S\\mathbf x = \\lambda_1y_1^2 + \\lambda_2y_2^2$.',
    formula: '2x^2 + 2xy + 2y^2 = \\begin{bmatrix} x & y \\end{bmatrix}\\begin{bmatrix} 2 & 1 \\\\ 1 & 2 \\end{bmatrix}\\begin{bmatrix} x \\\\ y \\end{bmatrix} = 3u^2 + v^2',
    why: 'Put $\\mathbf x = Q\\mathbf y$: $\\mathbf x^{\\mathsf T}S\\mathbf x = \\mathbf y^{\\mathsf T}Q^{\\mathsf T}SQ\\,\\mathbf y = \\mathbf y^{\\mathsf T}D\\mathbf y$. The $2xy$ is shared by two entries, so each off-diagonal entry is half of it.',
    cue: 'When you see $\\mathbf x^{\\mathsf T}A\\mathbf x$, or squares mixed with an $xy$ term, think **quadratic form**: find the principal axes.',
    use: 'Near its lowest point, a model’s loss is close to a quadratic form. Its principal axes are the directions where training moves fastest and slowest.',
  },
};

const NAME_DEF: Beat = {
  kind: 'name', id: 'name-definite', entry: {
    id: 'positive-definite', term: 'positive definite', question: 'Bowl or saddle?', nodes: ['N26'],
    saw: '$\\begin{bmatrix} 1 & 2 \\\\ 2 & 1 \\end{bmatrix}$ had every entry positive and eigenvalues 3 and $-1$: a saddle, and the probe left along $(1, -1)$. $3x^2 + 4xy + 3y^2$ had eigenvalues 5 and 1: a bowl, and the probe came to rest at the bottom.',
    means: 'The signs of the eigenvalues decide the shape, not the signs of the entries.',
    name: 'A symmetric $S$ is **positive definite** when $\\mathbf x^{\\mathsf T}S\\mathbf x > 0$ for every $\\mathbf x \\neq \\mathbf 0$: all eigenvalues positive, a bowl. **Negative definite**: all negative, an upside-down bowl. **Indefinite**: both signs, a saddle. **Positive semidefinite**: none negative, some may be zero.',
    formula: '\\underbrace{3y_1^2 - y_2^2}_{\\text{saddle}} \\qquad \\underbrace{5y_1^2 + y_2^2}_{\\text{bowl}} \\qquad \\mathbf x^{\\mathsf T}S\\mathbf x > 0 \\iff \\text{all } \\lambda > 0',
    why: 'In the principal axes each term is $\\lambda_iy_i^2$. If every λ is positive, every direction climbs. One negative λ, and that direction falls.',
    cue: 'When you need **bowl or saddle**, think **signs of the eigenvalues**.',
    use: 'A positive definite matrix of second derivatives marks a true minimum. Saddle points, with eigenvalues of both signs, slow down neural-network training.',
  },
};

const NAME_SPECDEC: Beat = {
  kind: 'name', id: 'name-specdec', entry: {
    id: 'spectral-decomposition', term: 'spectral decomposition', question: 'How is a symmetric matrix built from its eigenvectors?', nodes: ['N26'],
    saw: 'The block had eigenvalue 4 along $(1, 1, 1)$ and 1 on the whole plane $x + y + z = 0$. Gram–Schmidt inside that plane gave $(1, -1, 0)$ and $(1, 1, -2)$. Adding $\\lambda\\,\\mathbf q\\mathbf q^{\\mathsf T}$ for the three gave back the block.',
    means: 'A symmetric matrix is a sum of simple pieces: each eigenvalue times the projection onto its unit eigenvector. A repeated eigenvalue gives a whole plane, and inside it any perpendicular pair will do.',
    name: 'Writing $S = \\lambda_1\\mathbf q_1\\mathbf q_1^{\\mathsf T} + \\cdots + \\lambda_n\\mathbf q_n\\mathbf q_n^{\\mathsf T}$ is the **spectral decomposition** of $S$. Each $\\mathbf q_i\\mathbf q_i^{\\mathsf T}$ is the projection matrix onto the line of $\\mathbf q_i$.',
    formula: 'S = 4\\,\\cg{\\mathbf q_1}\\cg{\\mathbf q_1}^{\\mathsf T} + 1\\,\\cr{\\mathbf q_2}\\cr{\\mathbf q_2}^{\\mathsf T} + 1\\,\\cb{\\mathbf q_3}\\cb{\\mathbf q_3}^{\\mathsf T}',
    why: '$QDQ^{\\mathsf T}$ multiplied out, column of $Q$ times row of $Q^{\\mathsf T}$, is $\\sum\\lambda_i\\mathbf q_i\\mathbf q_i^{\\mathsf T}$.',
    cue: 'When an eigenvalue of a symmetric matrix repeats, think **Gram–Schmidt inside its eigenspace**.',
    use: 'Keeping only the largest pieces of this sum is how a matrix is compressed. Chapter 25 does it for any matrix.',
  },
};

const WHY = 'Where the slope is zero, the loss of a neural network is close to a quadratic form, and its matrix of second derivatives is symmetric. **Positive definite** means a minimum: a bowl. **Indefinite** means a saddle, where training crawls, because the downhill direction is shallow.\n\nThe spread of a cloud of data is described by a symmetric matrix too (Chapter 26), so its main directions are always at right angles.\n\nThe brace planner, next, splits the stern’s stress matrix into its three brace lines with your `sym_eigen`.';

const ch: ChapterDef = {
  id: 'c24',
  act: 9,
  num: 24,
  title: 'Which moves only stretch along perpendicular axes?',
  subtitle: 'Symmetric matrices and quadratic forms',
  nodes: ['N26'],
  palette: 'void',
  music: 'explore',
  script: S,
  inShort: `Which moves only stretch along perpendicular axes?\n\n${IN_SHORT_ANSWER}`,
  prereqs: ['c23', 'c22', 'c18', 'c12'],
  catchup: 'An **eigenvector** is an arrow a matrix keeps on its own line; its **eigenvalue** is the stretch. A matrix is **symmetric** when it equals its transpose. **Gram–Schmidt** turns arrows into perpendicular unit arrows. Story so far: the drones fitted the Collapse pulse to three decimals, and Teo is alive inside the flat stern.',
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'Which moves only stretch along perpendicular axes?', body: IN_SHORT_ANSWER } },
    { kind: 'scene', id: 'p1-intro', lines: S.p1Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    NAME_SPECTRAL,
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    NAME_QUAD,
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    NAME_DEF,
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: (g) => { void sternShot(g); } },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    NAME_SPECDEC,
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: (g) => { void arkShot(g); } },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'scene', id: 'p7-intro', lines: S.p7Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'scene', id: 'brief-intro', lines: S.briefing, setup: bridgeShot },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-bowl', doubt: doubtBowl },
    { kind: 'doubt', id: 'd-circle', doubt: doubtCircle },
    { kind: 'doubt', id: 'd-real', doubt: doubtReal },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When you see a symmetric matrix, $\\mathbf x^{\\mathsf T}A\\mathbf x$ or **“energy”**, think **perpendicular eigenvectors and their signs**.' } },
    { kind: 'build', id: 'build-quad-form', build: buildQuadForm },
    { kind: 'build', id: 'build-sym-eigen', build: buildSymEigen },
    { kind: 'cinematic', id: 'braces', run: braces },
  ],
};

export default ch;
