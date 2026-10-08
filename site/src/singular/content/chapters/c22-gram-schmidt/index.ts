// Chapter 22: "Can we build a square grid from a skewed one?" (GDD §6.10, N24): orthonormal bases,
// Gram–Schmidt, orthogonal matrices, QR. SQUARE: subtract each arrow's shadows on the finished arrows, then
// scale to length 1. The Drift: LANTERN's attitude frame has crept out of square since the Collapse.
import type { Beat, ChapterDef } from '../../../game/types';
import { bridgeShot } from '../../common/shots';
import { p1, p2, p3, p4 } from './puzzles';
import { p5, p6, p7 } from './puzzles2';
import { compare, doubtDet, doubtPerp, doubtPlane, law, procedure, sayit, teo } from './briefing';
import { buildGramSchmidt, buildQr } from './build';
import { driftShot, install } from './scenes';
import { hatchShot } from '../c21-projection/stage';
import { S } from './script';

const IN_SHORT_ANSWER = 'Take the arrows one at a time; remove each one’s shadows on the arrows already done; make it one unit long.';
const IN_SHORT = `Can we build a square grid from a skewed one?\n\n${IN_SHORT_ANSWER}`;

const NAME_GS: Beat = {
  kind: 'name', id: 'name-gram-schmidt', entry: {
    id: 'gram-schmidt', term: 'Gram–Schmidt process', question: 'How do skewed arrows become a square grid?', nodes: ['N24'], visual: bridgeShot,
    saw: '$(1, 1, 0)$, $(1, 0, 1)$ and $(0, 1, 1)$ became $\\frac{1}{\\sqrt2}(1, 1, 0)$, $\\frac{1}{\\sqrt6}(1, -1, 2)$ and $\\frac{1}{\\sqrt3}(-1, 1, 1)$. Each arrow lost its shadows on the arrows already finished, then was scaled. Every pair read 0; every arrow was one unit long.',
    means: 'What is left of an arrow after its shadows on the finished arrows are removed reads 0 against each of them. Scaling makes it one unit long. Taken in order, the arrows become a square grid for the same space.',
    name: 'Vectors that are perpendicular in pairs and each of length 1 form an **orthonormal set**; as a basis, an **orthonormal basis**. Building one from any basis, arrow by arrow, is the **Gram–Schmidt process**.',
    formula: '\\mathbf v_k = \\mathbf x_k - \\sum_{j<k}\\frac{\\mathbf x_k\\cdot\\mathbf v_j}{\\mathbf v_j\\cdot\\mathbf v_j}\\,\\mathbf v_j, \\qquad \\mathbf q_k = \\frac{\\mathbf v_k}{\\|\\mathbf v_k\\|}',
    why: 'Dot $\\mathbf v_k$ with an earlier $\\mathbf v_i$: the other earlier arrows are already perpendicular to $\\mathbf v_i$, so only $\\mathbf x_k\\cdot\\mathbf v_i - \\frac{\\mathbf x_k\\cdot\\mathbf v_i}{\\mathbf v_i\\cdot\\mathbf v_i}\\mathbf v_i\\cdot\\mathbf v_i = 0$ is left.',
    cue: 'When a basis is **skewed** and you want easy coordinates, think **Gram–Schmidt**.',
    use: 'A camera’s right, up and forward arrows are squared up this way every frame in a game engine.',
  },
};

const NAME_ORTHOGONAL: Beat = {
  kind: 'name', id: 'name-orthogonal-matrix', entry: {
    id: 'orthogonal-matrix', term: 'orthogonal matrix', question: 'Which moves keep every length and angle?', nodes: ['N24'],
    saw: 'Under the turn, the flip and the swap the circle landed on itself and the square kept side 1. Their columns were one unit long and at a right angle. $\\begin{bmatrix} 2 & 0 \\\\ 0 & 0.5 \\end{bmatrix}$ kept area but not lengths; $\\begin{bmatrix} 1 & 1 \\\\ -1 & 1 \\end{bmatrix}$ kept the shape but made both 1.41 times bigger: its columns were at a right angle, but 1.41 long.',
    means: 'A move keeps every length and angle exactly when its columns, where the grid arrows land, are an orthonormal set. Undoing it is reading coordinates in its grid: one dot product each.',
    name: 'A square matrix $Q$ with orthonormal columns is an **orthogonal matrix**. It satisfies $Q^{\\mathsf T}Q = I$, so $Q^{-1} = Q^{\\mathsf T}$, and $\\det Q = \\pm 1$.',
    formula: 'Q^{\\mathsf T}Q = I, \\qquad Q^{-1} = Q^{\\mathsf T}, \\qquad Q\\mathbf x\\cdot Q\\mathbf y = \\mathbf x^{\\mathsf T}Q^{\\mathsf T}Q\\mathbf y = \\mathbf x\\cdot\\mathbf y',
    why: 'Entry $(i, j)$ of $Q^{\\mathsf T}Q$ is $\\mathbf q_i\\cdot\\mathbf q_j$: 1 on the diagonal, 0 elsewhere. Dot products survive the move, so lengths and angles do too.',
    cue: 'When you see **“keeps lengths and angles”**, or a rotation drifting, think **orthogonal matrix: $Q^{-1} = Q^{\\mathsf T}$**.',
    use: 'Robots re-square their rotation matrices every few steps; without it, rounding slowly stretches the robot’s idea of space.',
  },
};

const NAME_QR: Beat = {
  kind: 'name', id: 'name-qr', entry: {
    id: 'qr', term: 'QR factorisation', question: 'How do the skewed arrows come back from the square ones?', nodes: ['N24'],
    saw: '$A$ with columns $(1, 1, 0)$ and $(1, 0, 1)$ came back as $Q$ times $R = \\begin{bmatrix} \\sqrt2 & 1/\\sqrt2 \\\\ 0 & 3/\\sqrt6 \\end{bmatrix}$. The first column needed only $\\mathbf q_1$; the second needed $\\mathbf q_1$ and $\\mathbf q_2$.',
    means: 'Gram–Schmidt builds each square arrow from the skewed ones before it, so each skewed arrow is a mix of the square arrows up to its own. The amounts sit in an upper triangular matrix.',
    name: 'Writing $A = QR$, with $Q$ having orthonormal columns and $R$ upper triangular with a positive diagonal, is the **QR factorisation** of $A$. $R = Q^{\\mathsf T}A$.',
    formula: 'A = QR, \\qquad R = Q^{\\mathsf T}A = \\begin{bmatrix} \\mathbf q_1\\cdot\\mathbf a_1 & \\mathbf q_1\\cdot\\mathbf a_2 \\\\ 0 & \\mathbf q_2\\cdot\\mathbf a_2 \\end{bmatrix}',
    why: 'Multiply $A = QR$ on the left by $Q^{\\mathsf T}$: $Q^{\\mathsf T}Q = I$ leaves $R$. Below the diagonal, $\\mathbf q_i\\cdot\\mathbf a_j = 0$ for $i > j$, because $\\mathbf a_j$ lies in the span of $\\mathbf q_1, \\dots, \\mathbf q_j$.',
    cue: 'When you need to solve with a tall, skewed matrix accurately, think **QR**.',
    use: 'Solvers for tall systems (more equations than unknowns) find the closest point of the column space by factoring the matrix as $QR$, instead of forming $A^{\\mathsf T}A$.',
  },
};

const WHY = 'Every game, drone and robot keeps its orientation as a rotation matrix and updates it by multiplying in small turns. Each multiplication rounds a little, and after thousands of frames the matrix is no longer a rotation: objects shear and stretch. The fix runs every few frames: **Gram–Schmidt on the columns**. That is the Drift you fixed in *Can we stand the horizon back up?*\n\nThe same squaring builds a camera’s right, up and forward arrows, and sits inside accurate solvers for tall systems as **QR**. The Drift fix you install next runs on your own `gram_schmidt`.';

const ch: ChapterDef = {
  id: 'c22',
  act: 8,
  num: 22,
  title: 'Can we build a square grid from a skewed one?',
  subtitle: 'Squaring up a basis',
  nodes: ['N24'],
  palette: 'default',
  music: 'explore',
  script: S,
  inShort: IN_SHORT,
  prereqs: ['c21', 'c13', 'c04'],
  catchup: 'The **shadow** of $\\mathbf x$ on an arrow $\\mathbf q$ one unit long is $(\\mathbf x\\cdot\\mathbf q)\\,\\mathbf q$, and what is left reads 0 against $\\mathbf q$. With arrows at right angles, the nearest point of their plane is the sum of the shadows. Story so far: the *Lantern* is tethered to the stern hatch; LANTERN’s attitude frame has drifted since the Collapse.',
  beats: [
    { kind: 'scene', id: 'open', lines: S.open, setup: driftShot },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'Can we build a square grid from a skewed one?', body: IN_SHORT_ANSWER } },
    { kind: 'scene', id: 'p1-intro', lines: S.p1Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    NAME_GS,
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: hatchShot },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    NAME_ORTHOGONAL,
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: driftShot },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    NAME_QR,
    { kind: 'scene', id: 'p7-intro', lines: S.p7Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'scene', id: 'brief-intro', lines: S.briefing, setup: bridgeShot },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-det', doubt: doubtDet },
    { kind: 'doubt', id: 'd-plane', doubt: doubtPlane },
    { kind: 'doubt', id: 'd-perp', doubt: doubtPerp },
    { kind: 'law', id: 'law', law },
    { kind: 'procedure', id: 'procedure', procedure },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When a basis is skewed and you want easy coordinates, or a rotation drifts, think **Gram–Schmidt**.' } },
    { kind: 'build', id: 'build-gram-schmidt', build: buildGramSchmidt },
    { kind: 'build', id: 'build-qr', build: buildQr },
    { kind: 'cinematic', id: 'install', run: install },
    { kind: 'scene', id: 'teo-ask', lines: S.teoAsk, setup: hatchShot },
    { kind: 'teo', id: 'c22-teo', teo },
    { kind: 'scene', id: 'teo-sent', lines: S.teoSent, setup: hatchShot },
  ],
};

export default ch;
