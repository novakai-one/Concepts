// Chapter 26: "What should we keep?" (GDD §6.11, N28), the end of Act IX. The widest shadow (spread and
// perpendicular distance add to the same total), centre first, why the best direction is an eigenvector of the
// covariance matrix, PCA by hand, how many components to keep, the transmission laid out on two components,
// spread is not labels; the Briefing with LANTERN's PCA Procedure; covariance and pca; the record goes out
// projected by the player's pca and the Anchor's core goes dark; Ilse's Act IX Review; the hand-off to the Epilogue.
import type { Beat, ChapterDef } from '../../../game/types';
import { bridgeShot } from '../../common/shots';
import { p1, p2, p3, p4 } from './puzzles';
import { p5, p6, p7 } from './puzzles2';
import { compare, doubtCols, doubtLsq, doubtSwing, law, procedure, review, sayit } from './briefing';
import { buildCovariance, buildPca } from './build';
import { close, coldOpen, send } from './scenes';
import { P2_MEAN, P3_EIG, P3_SHARE, SQ, SQ_TOTAL, fmtD, keptShare } from './logic';
import { S } from './script';
import { AMPLIFY } from '../../truth';

const IN_SHORT_ANSWER = 'Which directions in a cloud of data matter? The ones along which the **centred** cloud spreads most. Keep a few of them and you keep most of the shape.';

const pct = (x: number, d = 1) => `${fmtD(100 * x, d)}%`;
const pctM = (x: number, d = 1) => `${fmtD(100 * x, d)}\\%`;
const v2 = (v: readonly number[], d = 2) => `(${v.map((x) => fmtD(x, d)).join(', ')})`;

const NAME_CENTRE: Beat = {
  kind: 'name', id: 'name-centre', entry: {
    id: 'mean-centring', term: 'mean-centring', question: 'Why take the mean away first?', nodes: ['N28'],
    saw: `With the pivot at the origin, the line of most spread pointed at the cloud, toward its mean ${v2(P2_MEAN, 1)}. With the pivot on the mean, it ran along the cloud.`,
    means: 'Spread measured about a point far from the cloud is mostly the distance to the cloud. Take the mean reading away first, and what is left is the shape.',
    name: 'Taking the mean reading away from every reading is **mean-centring**. The centred readings $X_c$ have mean zero: the cloud sits around the origin.',
    formula: '\\bar{\\mathbf x} = \\tfrac1n\\left(\\mathbf x_1 + \\cdots + \\mathbf x_n\\right), \\qquad \\mathbf x_i \\;\\to\\; \\mathbf x_i - \\bar{\\mathbf x}',
    why: 'About the origin, the spread along a unit arrow $\\mathbf u$ gains an extra $\\tfrac{n}{n-1}(\\bar{\\mathbf x}\\cdot\\mathbf u)^2$, the squared shadow of the mean. That extra is largest along the mean, so it swings the top direction toward the mean.',
    cue: 'When you see **data far from the origin**, think **centre it first**.',
    use: 'Every data pipeline centres its columns first; most libraries do it for you.',
  },
};

const NAME_COV: Beat = {
  kind: 'name', id: 'name-cov', entry: {
    id: 'covariance-matrix', term: 'covariance matrix', question: 'Why is the direction of most spread an eigenvector?', nodes: ['N28'],
    saw: `Turning $\\mathbf w$ round the unit circle, the spread $\\mathbf w^{\\mathsf T}C\\,\\mathbf w$ peaked at ${fmtD(P3_EIG.values[0])} along ${v2(P3_EIG.vectors[0])}, ${pct(P3_SHARE, 0)} of the total 7: the top eigenvector of $C = \\left[\\begin{smallmatrix} 4 & 2 \\\\ 2 & 3 \\end{smallmatrix}\\right]$.`,
    means: 'One symmetric matrix holds the spread of the cloud in every direction at once. Its eigenvectors are the directions of most and least spread.',
    name: 'For centred readings $X_c$ (one per row), $C = \\frac{1}{n-1}X_c^{\\mathsf T}X_c$ is the **covariance matrix**. Its diagonal holds the spread of each column (each number in a reading); entry $(i, j)$ says how the $i$-th and $j$-th numbers move together across the readings. Its unit eigenvectors, largest eigenvalue first, are the **principal components**.',
    formula: `C = \\tfrac{1}{n-1}X_c^{\\mathsf T}X_c, \\qquad \\max_{\\|\\mathbf w\\| = 1}\\mathbf w^{\\mathsf T}C\\,\\mathbf w = \\lambda_1 \\approx ${fmtD(P3_EIG.values[0])}`,
    why: 'The spread along $\\mathbf w$ is $\\frac{1}{n-1}\\|X_c\\mathbf w\\|^2 = \\mathbf w^{\\mathsf T}C\\,\\mathbf w$, a quadratic form, and $C$ is symmetric: on the unit circle it is largest at the top eigenvector (Chapter 24). These are the right singular vectors of $X_c$ (Chapter 25).',
    cue: 'When you see **“which way does the data vary most?”**, think **top eigenvector of the covariance matrix**.',
    use: 'Portfolio risk is $\\mathbf w^{\\mathsf T}C\\,\\mathbf w$: the covariance matrix of the assets’ returns, with the portfolio weights as $\\mathbf w$.',
  },
};

const NAME_PCA: Beat = {
  kind: 'name', id: 'name-pca', entry: {
    id: 'principal-component-analysis', term: 'principal component analysis', question: 'How many directions should we keep?', nodes: ['N28'],
    saw: `The record’s twelve singular values: 9 and 7, then 1.5 and a tail. One component kept ${pct(keptShare(1))} of the squared total; two kept ${pct(keptShare(2))}.`,
    means: 'Each component keeps its share of the spread: its singular value squared, over the sum of all of them. A few large ones carry most of the shape.',
    name: 'That share is the **explained variance**. Centring, finding the principal components and keeping the first $k$ is **principal component analysis** (PCA). Replacing each reading by its $k$ coordinates along them is **dimensionality reduction**.',
    formula: `\\text{kept}(2) = \\frac{\\sigma_1^2 + \\sigma_2^2}{\\sigma_1^2 + \\cdots + \\sigma_{12}^2} = \\frac{${SQ[0]} + ${SQ[1]}}{${fmtD(SQ_TOTAL)}} \\approx ${pctM(keptShare(2))}`,
    why: 'The components are perpendicular, so their squared lengths add, as in Pythagoras: the total spread is $\\lambda_1 + \\cdots + \\lambda_d$, and leaving components out loses exactly their $\\lambda$’s. Keeping the $k$ largest gives the closest $k$-dimensional picture by perpendicular distance.',
    cue: 'When you see **“too many dimensions”** or **“most of the variation”**, think **PCA**.',
    use: 'Maps of high-dimensional data start here: the digits map on the AI Field Explorer site turns hundreds of numbers per picture into two.',
  },
};

const WHY = 'PCA is the first tool for **seeing** data with too many numbers per reading. Centre, find the directions of most spread, keep a few, and a cloud of hundreds of dimensions becomes a picture you can look at. The digits map on the AI Field Explorer site is one: each picture of a digit, hundreds of numbers, placed by two.\n\nIt also compresses and cleans: the small components are often noise. It finds **spread**, not meaning: the direction that tells two kinds apart can be a small one.\n\nThe record goes out next, projected by your `pca`.';

const ch: ChapterDef = {
  id: 'c26',
  act: 9,
  num: 26,
  title: 'What should we keep?',
  subtitle: 'Principal components',
  nodes: ['N28'],
  palette: 'void',
  music: 'explore',
  script: S,
  inShort: `What should we keep?\n\n${IN_SHORT_ANSWER}`,
  prereqs: ['c25', 'c24', 'c21'],
  catchup: `A **symmetric** matrix has perpendicular eigenvectors, and its quadratic form $\\mathbf x^{\\mathsf T}S\\mathbf x$ is largest on the unit circle along the top one. Any matrix is a turn, a stretch and a turn: $A = U\\Sigma V^{\\mathsf T}$, and its largest layers carry most of it. Story so far: the stern is unfolded and Teo is safe, but the ${Math.round(AMPLIFY)}× pulse cracked the Anchor.`,
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'What should we keep?', body: IN_SHORT_ANSWER } },
    { kind: 'scene', id: 'p1-intro', lines: S.p1Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    NAME_CENTRE,
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    NAME_COV,
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    NAME_PCA,
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'scene', id: 'p7-intro', lines: S.p7Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'scene', id: 'brief-intro', lines: S.briefing, setup: bridgeShot },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-cols', doubt: doubtCols },
    { kind: 'doubt', id: 'd-lsq', doubt: doubtLsq },
    { kind: 'doubt', id: 'd-swing', doubt: doubtSwing },
    { kind: 'law', id: 'law', law },
    { kind: 'procedure', id: 'procedure', procedure },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When you see **“too many dimensions”** or **“most of the variation”**, think **PCA**.' } },
    { kind: 'build', id: 'build-covariance', build: buildCovariance },
    { kind: 'build', id: 'build-pca', build: buildPca },
    { kind: 'cinematic', id: 'send', run: send },
    { kind: 'scene', id: 'review-intro', lines: S.reviewIntro, setup: bridgeShot },
    { kind: 'review', id: 'review', review },
    { kind: 'cinematic', id: 'close', run: close },
  ],
};

export default ch;
