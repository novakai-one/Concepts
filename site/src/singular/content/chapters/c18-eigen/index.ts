// Chapter 18: "Which vectors stay on their line?" (GDD §6.9, N20), the first chapter of Act VII.
// Eigenvectors and eigenvalues, in plain maths (docs/singular/ch18-plain-style.md). Game 1: vectors A keeps on
// their line and the number it multiplies each by; the name; A²v on a target; ten practice rounds; a
// challenge. Then the one line a shear keeps, the λ dial flattens A − λI at each eigenvalue (the
// characteristic polynomial), a rotation keeps no real line (complex eigenvalues), a 3 × 3 by hand, Vell's
// lines. Briefing with LANTERN's Procedure; builds eig2 and power_iteration; the line finder runs on the
// player's power_iteration.
import type { Beat, ChapterDef } from '../../../game/types';
import { bridgeShot } from '../../common/shots';
import { p3 } from './puzzles';
import { p2, p4, p7 } from './find';
import { m1, p1, solo } from './traj-puzzles';
import { drill } from './drill';
import { p5, p6 } from './puzzles2';
import { compare, doubtEvery, doubtTrace, doubtZero, law, procedure, sayit } from './briefing';
import { buildEig2, buildPower } from './build';
import { coda, coldOpen, fieldShot, finder, whyVisual } from './scenes';
import { S } from './script';
import { S as SAVE } from '../../../core/save';
import type { Seen } from './traj-text';
import { GAME1_NAME } from './game1-copy';

const IN_SHORT_ANSWER = 'A matrix turns most vectors. An **eigenvector** stays on its own line: $A\\mathbf v = \\lambda\\mathbf v$. The number $\\lambda$ is its **eigenvalue**. The eigenvalues are the roots of $\\det(A - \\lambda I) = 0$. A rotation has no real eigenvectors.';
// The card before Game 1 states the problem only: the player finds the answer by trying vectors.
const IN_SHORT_PROBLEM = GAME1_NAME.inShort;

// Named only after the player has found two eigenvectors and typed both numbers (Game 1).
// "saw" quotes the equations the player found.
const seen = () => SAVE().flags['c18-seen'] as Seen | undefined;
const NAME_EIG: Beat = {
  kind: 'name', id: 'name-eigen', entry: {
    id: 'eigenvector', term: 'eigenvector', question: GAME1_NAME.question, nodes: ['N20'],
    get saw() { return GAME1_NAME.saw(seen()); },
    means: GAME1_NAME.means,
    name: GAME1_NAME.name,
    formula: GAME1_NAME.formula,
    why: GAME1_NAME.why,
    use: GAME1_NAME.use,
  },
};

const NAME_CHAR: Beat = {
  kind: 'name', id: 'name-char', entry: {
    id: 'characteristic-polynomial', term: 'characteristic polynomial', question: 'How do we find λ without searching?', nodes: ['N20'],
    saw: 'The grid of $A - \\lambda I$ went flat at exactly two values, $\\lambda = 5$ and $\\lambda = 2$. There, $\\det(A - \\lambda I)$ was 0.',
    means: 'If $A\\mathbf v = \\lambda\\mathbf v$, then $(A - \\lambda I)\\mathbf v = \\mathbf 0$. A matrix that sends a vector (not zero) to zero squashes the plane flat, so its determinant is 0.',
    name: '$\\det(A - \\lambda I)$ is the **characteristic polynomial** of $A$. Its roots are the eigenvalues.',
    formula: '\\begin{gathered} \\det(A - \\lambda I) = (4 - \\lambda)(3 - \\lambda) - 2 \\\\ = \\lambda^2 - 7\\lambda + 10 = (\\lambda - 5)(\\lambda - 2) \\end{gathered}',
    use: 'Engineers find the frequencies a bridge vibrates at by solving a characteristic equation.',
  },
};

const NAME_COMPLEX: Beat = {
  kind: 'name', id: 'name-complex', entry: {
    id: 'complex-eigenvalues', term: 'complex eigenvalues', question: 'What are the eigenvalues of a rotation?', nodes: ['N20'],
    saw: '$T$ turned every vector, so it has no eigenvectors. Applied four times, it brought the L back: $T^4 = I$.',
    means: '$\\det(T - \\lambda I) = \\lambda^2 + 1$ is never $0$ for a real number $\\lambda$. A rotation (by any angle except 0° or 180°) keeps no line.',
    name: 'The roots of $\\lambda^2 + 1 = 0$ are $\\lambda = \\pm i$, where $i^2 = -1$. Roots like these are **complex eigenvalues**.',
    formula: '\\lambda^2 + 1 = 0 \\;\\Rightarrow\\; \\lambda = \\pm i, \\qquad i^4 = 1 \\;\\Rightarrow\\; T^4 = I',
    use: 'Complex eigenvalues mean rotation. They show up wherever something oscillates.',
  },
};

const NAME_MULT: Beat = {
  kind: 'name', id: 'name-mult', entry: {
    id: 'algebraic-multiplicity', term: 'algebraic multiplicity', question: 'What if an eigenvalue appears twice?', nodes: ['N20'],
    saw: 'The 3 × 3 had three different eigenvalues, 5, 2 and −5, with one line each. The shear’s polynomial was $(1 - \\lambda)^2$: the root 1 twice, but only one line.',
    means: 'A root can repeat. Counting repeats (and complex roots), an $n \\times n$ matrix has $n$ eigenvalues. A repeated root does not always have as many lines.',
    name: 'The number of times λ is a root of the characteristic polynomial is its **algebraic multiplicity**. The shear’s $\\lambda = 1$ has algebraic multiplicity 2.',
    formula: '\\det\\left(\\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\end{bmatrix} - \\lambda I\\right) = (1 - \\lambda)^2',
    why: 'For a triangular matrix, the eigenvalues are the numbers on the diagonal, repeats included.',
  },
};

const WHY = 'Apply one matrix many times and only its eigenvalues matter. Along an eigenvector, $n$ applications multiply by $\\lambda^n$: bigger than 1 in size and it **explodes**, smaller and it **fades**. That is why gradients explode or vanish in recurrent networks, which apply one matrix at every step.\n\nApplying the matrix again and again (and rescaling) swings almost any vector onto the line with the largest $|\\lambda|$, as on the screen now. That is your next function, `power_iteration`.';

const ch: ChapterDef = {
  id: 'c18',
  act: 7,
  num: 18,
  title: 'Which vectors stay on their line?',
  subtitle: 'Eigenvectors and eigenvalues',
  nodes: ['N20'],
  palette: 'teal',
  music: 'explore',
  script: S,
  inShort: `Which vectors stay on their line?\n\n${IN_SHORT_ANSWER}`,
  calm: true,
  prereqs: ['c17', 'c16', 'c15', 'c14'],
  catchup: 'A matrix moves every point. Its columns are where $\\begin{bmatrix}1\\\\0\\end{bmatrix}$ and $\\begin{bmatrix}0\\\\1\\end{bmatrix}$ land. A matrix squashes the plane flat exactly when its determinant is 0, and then some vector (not zero) lands on the origin.',
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'Which vectors stay on their line?', body: IN_SHORT_PROBLEM } },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    NAME_EIG,
    { kind: 'puzzle', id: 'm1', puzzle: m1 },
    { kind: 'puzzle', id: 'drill', puzzle: drill },
    { kind: 'puzzle', id: 'solo', puzzle: solo },
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    NAME_CHAR,
    { kind: 'cinematic', id: 'coda', run: coda },
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    NAME_COMPLEX,
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    NAME_MULT,
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: fieldShot },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'scene', id: 'p7-intro', lines: S.p7Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'scene', id: 'brief-intro', lines: S.briefing, setup: bridgeShot },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-every', doubt: doubtEvery },
    { kind: 'doubt', id: 'd-trace', doubt: doubtTrace },
    { kind: 'doubt', id: 'd-zero', doubt: doubtZero },
    { kind: 'law', id: 'law', law },
    { kind: 'procedure', id: 'procedure', procedure },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When you see **“repeated”** or **“long run”**, think **eigenvectors**.', visual: whyVisual } },
    { kind: 'build', id: 'build-eig2', build: buildEig2 },
    { kind: 'build', id: 'build-power', build: buildPower },
    { kind: 'cinematic', id: 'finder', run: finder },
  ],
};

export default ch;
