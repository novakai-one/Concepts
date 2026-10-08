// Chapter 25: "What does any matrix do to a circle?" (GDD §6.11, N27), the climax. Singular values and the
// SVD (an input cross that lands perpendicular; AᵀA; turn, stretch, turn; a 3 × 2 by hand), low-rank layers
// (Teo's voice through a thin channel), the Collapse pulse to six decimals (thin, not gone), the Briefing,
// svd and low_rank, Teach Teo T5, and the Act IX set piece: the Unfold. The title's third meaning pays off.
import type { Beat, ChapterDef } from '../../../game/types';
import { bridgeShot } from '../../common/shots';
import { sternShot } from '../c24-spectral/act9';
import { p1, p2, p3, p4 } from './puzzles';
import { p5, p6, p7 } from './puzzles2';
import { sp1, sp2, sp3, sp4, sp5, sp6, sp7 } from './setpiece';
import { compare, doubtDet, doubtEig, doubtSquare, law, sayit, teo } from './briefing';
import { buildLowRank, buildSvd } from './build';
import { after, coldOpen, teoChannel, thin } from './scenes';
import { S } from './script';
import { AMPLIFY, CONDITION, NOISE, SV_C } from '../../truth';
import { braceFrame, fmtD } from './logic';

const IN_SHORT_ANSWER = 'It turns some perpendicular pair of arrows into another perpendicular pair, stretched. So any matrix is **a turn, a stretch along axes, and a turn**. The biggest stretches carry most of the picture.';

const NAME_SV: Beat = {
  kind: 'name', id: 'name-sv', entry: {
    id: 'singular-value', term: 'singular value', question: 'What does any matrix do to a circle?', nodes: ['N27'],
    saw: 'Turning the input cross, the two images met at a right angle only with the inputs at $(1, 1)/\\sqrt2$ and $(1, -1)/\\sqrt2$. They landed along $(1, 3)$ and $(3, -1)$, 6.71 and 2.24 long: the long and short half-axes of the oval.',
    means: 'Every matrix has a perpendicular pair of input directions that it sends to a perpendicular pair of output directions. The right angle survives; the pair can turn (or flip), and each arrow is stretched by its own amount.',
    name: 'The lengths $\\sigma_1 \\ge \\sigma_2 \\ge 0$ are the **singular values** of $A$. The inputs $\\mathbf v_1, \\mathbf v_2$ are the **right singular vectors**; the unit output directions $\\mathbf u_1, \\mathbf u_2$ are the **left singular vectors**: $A\\mathbf v_i = \\sigma_i\\mathbf u_i$.',
    formula: 'A\\cg{\\mathbf v_1} = \\sigma_1\\cg{\\mathbf u_1}, \\quad A\\cr{\\mathbf v_2} = \\sigma_2\\cr{\\mathbf u_2}, \\qquad \\sigma_1\\sigma_2 = |\\det A| = 15',
    why: 'The unit circle lands on an oval whose longest and shortest half-axes are $\\sigma_1$ and $\\sigma_2$. For a square matrix the area scale is $|\\det A| = \\sigma_1\\sigma_2$.',
    cue: 'When you see **“how much does this move stretch, at most and at least?”**, think **singular values**.',
    use: 'The largest singular value of a network’s weight matrix bounds how much one layer can amplify its input; training methods keep it in check.',
  },
};

const NAME_SVD: Beat = {
  kind: 'name', id: 'name-svd', entry: {
    id: 'singular-value-decomposition', term: 'singular value decomposition', question: 'Is every move a turn, a stretch and a turn?', nodes: ['N27'],
    saw: 'On the rail: turn by $-45°$, stretch by 6.71 and 2.24 along the axes, turn by 71.57°. The circle stayed a circle, became an upright oval, then tilted into place.',
    means: 'Any matrix is a turn (or a flip), a stretch along perpendicular axes, and another turn. The stretches are the singular values.',
    name: 'The **singular value decomposition** is $A = U\\Sigma V^{\\mathsf T}$. $V$ holds the right singular vectors as columns, $\\Sigma$ the singular values on its diagonal, $U$ the left singular vectors. Every matrix has one, square or not.',
    formula: 'A = \\cg{U}\\,\\Sigma\\,\\cr{V}^{\\mathsf T} \\qquad AV = U\\Sigma \\qquad \\sigma_i^2 = \\text{eigenvalues of } A^{\\mathsf T}A',
    why: '$A\\mathbf v_i = \\sigma_i\\mathbf u_i$ for each column is $AV = U\\Sigma$. $V$ is orthogonal, so $V^{-1} = V^{\\mathsf T}$, and $A = U\\Sigma V^{\\mathsf T}$. The $\\mathbf v_i$ are the eigenvectors of the symmetric $A^{\\mathsf T}A$, so they are perpendicular.',
    cue: 'When you see **any** matrix, square or not, think **turn, stretch, turn**.',
    use: 'Search engines and recommender systems split huge tables of ratings and words this way to find a few hidden directions.',
  },
};

const NAME_LOWRANK: Beat = {
  kind: 'name', id: 'name-lowrank', entry: {
    id: 'low-rank-approximation', term: 'low-rank approximation', question: 'How few numbers carry the picture?', nodes: ['N27'],
    saw: 'Teo’s voice was 64 by 32 numbers. Rebuilt from its largest layers $\\sigma\\mathbf u\\mathbf v^{\\mathsf T}$, his words were static at 4 layers and clear at 8: his singular values drop off a cliff after the eighth. For the test move, keeping one layer missed by at most $\\sigma_2 = 2.24$.',
    means: 'Every matrix is a sum of layers, each one column times one row, sorted by size. The biggest few carry most of the picture, and what is left out misses by the next singular value.',
    name: 'Each layer $\\sigma_i\\mathbf u_i\\mathbf v_i^{\\mathsf T}$ is a **rank-one matrix**. Keeping the $k$ largest gives the **low-rank approximation** $A_k$, the closest matrix of rank $k$ to $A$.',
    formula: 'A_k = \\sigma_1\\mathbf u_1\\mathbf v_1^{\\mathsf T} + \\cdots + \\sigma_k\\mathbf u_k\\mathbf v_k^{\\mathsf T}, \\qquad \\text{storage } k(m + n + 1)',
    why: 'The left-over $A - A_k$ is the sum of the dropped layers: its own SVD, so its largest stretch is $\\sigma_{k+1}$. No other rank-$k$ matrix does better.',
    cue: 'When you see **“compress”** or **“approximate with fewer numbers”**, think **keep the largest layers**.',
    use: 'Image compression, and LoRA: fine-tuning a language model with a low-rank update instead of the full matrix.',
  },
};

const NAME_COND: Beat = {
  kind: 'name', id: 'name-cond', entry: {
    id: 'condition-number', term: 'condition number', question: 'How badly can an inverse blow up an error?', nodes: ['N27'],
    saw: `The raw undo, built from readings with noise ${NOISE}, threw the test cluster ${fmtD(NOISE * AMPLIFY, 1)} off along the thin line: the noise times ${Math.round(AMPLIFY)}.`,
    means: 'An inverse divides by each singular value, so it multiplies an error in the thinnest direction by $1/\\sigma_{\\min}$. Compared with how it treats the largest direction, that is the most a solver can blow up errors relative to the answer.',
    name: 'The **condition number** of $A$ is $\\sigma_{\\max}/\\sigma_{\\min}$. Large means a solver can multiply small errors in the data into large errors in the answer.',
    formula: `\\kappa = \\frac{\\sigma_{\\max}}{\\sigma_{\\min}} = \\frac{${fmtD(SV_C[0], 4)}}{${fmtD(SV_C[2], 6)}} \\approx ${Math.round(CONDITION)}, \\qquad ${NOISE} \\times ${Math.round(AMPLIFY)} = ${fmtD(NOISE * AMPLIFY, 1)}`,
    why: '$C^{-1} = V\\Sigma^{-1}U^{\\mathsf T}$: the thin direction is stretched by $1/\\sigma_3$. Relative errors grow by at most $\\sigma_1/\\sigma_3$.',
    cue: 'When you see **“how unstable is this inverse?”**, think **condition number**.',
    use: 'Solvers report it as a warning: a condition number near $10^{16}$ means every digit of a double-precision answer can be noise.',
  },
};

const NAME_PINV: Beat = {
  kind: 'name', id: 'name-pinv', entry: {
    id: 'pseudoinverse', term: 'pseudoinverse', question: 'What is the best any undo can do with an exact zero?', nodes: ['N27'],
    saw: 'The two-decimal model had no inverse: rank 2. Its $V\\Sigma^+U^{\\mathsf T}$ brought every point back onto a sheet, with its $(1, 1, -1)$ part set to zero. Two points a step apart along $(1, 1, -1)$ landed together, and came back together.',
    means: 'Where a stretch is exactly zero, nothing can be recovered by anyone. The best an undo can do is give back what was kept.',
    name: 'The **pseudoinverse** $A^+ = V\\Sigma^+U^{\\mathsf T}$ flips every non-zero singular value and leaves the zeros at zero. $A^+\\mathbf b$ is the shortest of the least-squares answers.',
    formula: 'C_2^+ = V\\Sigma^+U^{\\mathsf T}, \\qquad \\Sigma = \\operatorname{diag}(3, 1, 0) \\quad\\Rightarrow\\quad \\Sigma^+ = \\operatorname{diag}(\\tfrac13, 1, 0)',
    why: 'Exactly zero: gone, by anyone. Tiny: still there, under noise multiplied by $1/\\sigma$.',
    cue: 'When a matrix has **no inverse** but you still need the best answer, think **pseudoinverse**.',
    use: 'Least-squares solvers use it when the columns are dependent: `np.linalg.pinv`.',
  },
};

const WHY = 'A photo is a matrix of brightness. Keep its 50 largest layers and you store a small fraction of the numbers, and the eye cannot tell. **Recommender systems** split a huge table of users and ratings into a few layers of hidden taste. **LoRA** fine-tunes a language model by learning a low-rank update instead of the full weight matrix.\n\nAnd the ratio $\\sigma_{\\max}/\\sigma_{\\min}$ is how a solver warns you that its answer may be noise: the set piece names it.\n\nNext, your `svd` reruns the Collapse pulse’s six decimals, and your `low_rank` rebuilds Teo’s voice.';

const ch: ChapterDef = {
  id: 'c25',
  act: 9,
  num: 25,
  title: 'What does any matrix do to a circle?',
  subtitle: 'Singular values and low rank',
  nodes: ['N27'],
  palette: 'void',
  music: 'explore',
  script: S,
  inShort: `What does any matrix do to a circle?\n\n${IN_SHORT_ANSWER}`,
  prereqs: ['c24', 'c22', 'c16'],
  catchup: 'A **symmetric** matrix stretches along perpendicular axes, its eigenvectors. An **orthogonal** matrix only turns (or flips). The **rank** counts the directions that survive. Story so far: the stern is braced along its principal axes; LANTERN reads the Collapse pulse’s smallest stretch as zero, to two decimal places.',
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'What does any matrix do to a circle?', body: IN_SHORT_ANSWER } },
    { kind: 'scene', id: 'p1-intro', lines: S.p1Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    NAME_SV,
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    NAME_SVD,
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: (g) => { void sternShot(g, { braces: true }); } },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    NAME_LOWRANK,
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: (g) => { void sternShot(g, { braces: true }); } },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'cinematic', id: 'thin', run: thin },
    { kind: 'scene', id: 'p7-intro', lines: S.p7Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'scene', id: 'brief-intro', lines: S.briefing, setup: bridgeShot },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-eig', doubt: doubtEig },
    { kind: 'doubt', id: 'd-square', doubt: doubtSquare },
    { kind: 'doubt', id: 'd-det', doubt: doubtDet },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When you see **“compress”**, **“approximate with fewer numbers”** or **“how unstable is this inverse”**, think **SVD**.' } },
    { kind: 'build', id: 'build-svd', build: buildSvd },
    { kind: 'build', id: 'build-low-rank', build: buildLowRank },
    { kind: 'cinematic', id: 'teo-channel', run: teoChannel },
    { kind: 'teo', id: 'c25-teo', teo },
    { kind: 'scene', id: 'teo-sent', lines: S.teoSent, setup: (g) => { void sternShot(g, { braces: true }); } },
    { kind: 'scene', id: 'sp1-intro', lines: S.sp1Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'sp1', puzzle: sp1 },
    NAME_COND,
    { kind: 'scene', id: 'sp2-intro', lines: S.sp2Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'sp2', puzzle: sp2 },
    NAME_PINV,
    { kind: 'scene', id: 'sp3-intro', lines: S.sp3Intro, setup: (g) => { void sternShot(g, { braces: true }); } },
    { kind: 'puzzle', id: 'sp3', puzzle: sp3 },
    // two braces swung aside for the drones (S.sp4Intro): the picture matches sp4's start, the hinge brace on its axis
    { kind: 'scene', id: 'sp4-intro', lines: S.sp4Intro, setup: (g) => { void sternShot(g).then((set) => set.braces(braceFrame(0))); } },
    { kind: 'puzzle', id: 'sp4', puzzle: sp4 },
    { kind: 'scene', id: 'sp5-intro', lines: S.sp5Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'sp5', puzzle: sp5 },
    { kind: 'scene', id: 'sp7-intro', lines: S.sp7Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'sp7', puzzle: sp7 },
    { kind: 'scene', id: 'sp6-intro', lines: S.sp6Intro, setup: (g) => { void sternShot(g, { braces: true }); } },
    { kind: 'puzzle', id: 'sp6', puzzle: sp6 },
    { kind: 'cinematic', id: 'after', run: after },
  ],
};

export default ch;
