// Chapter 20: "Where do the drones settle?" (GDD §6.9, N22), the end of Act VII. Markov chains and steady
// states on the flow board: the transition matrix from the shares, the steady state on the row board,
// every start ends there, why 1 is always an eigenvalue, designing the Stern's rule, the swap that never
// settles, PageRank. Briefing with LANTERN's Procedure; build steady_state (the drone allocation runs on
// it); the act's set piece (the fiftieth pulse), Vell stands down, the Act VII Review, Ilse comes aboard.
import type { Beat, ChapterDef } from '../../../game/types';
import { bridgeShot } from '../../common/shots';
import { exteriorShot, fieldShot } from '../c18-eigen/scenes';
import { p1, p2, p3, p4 } from './puzzles';
import { p5, p6, p7 } from './puzzles2';
import { compare, doubtMoving, doubtSettles, doubtStart, law, procedure, sayit } from './briefing';
import { review, sp } from './setpiece';
import { buildSteady } from './build';
import { arrival, coldOpen, dronesShot, install, standDown } from './scenes';
import { S } from './script';

const IN_SHORT_ANSWER = 'Where do the drones settle? At the arrangement **one more hour leaves unchanged**. Every other part of the arrangement shrinks away each hour.';

const NAME_MARKOV: Beat = {
  kind: 'name', id: 'name-markov', entry: {
    id: 'markov-chain', term: 'Markov chain', question: 'How do we write down fixed shares moving between places?', nodes: ['N22'],
    saw: 'Each column of the matrix held one section’s shares, and each column added to 1. One hour sent $(300, 0, 0)$ to $(240, 30, 30)$, and a second to $(204, 51, 45)$: every drone accounted for.',
    means: 'A list of shares that are not negative and add to 1 says where things are. A matrix whose columns are such lists moves them on by one step.',
    name: 'A **probability vector** has entries that are not negative and add to 1. A **transition matrix** (or stochastic matrix) has probability vectors as its columns: column $j$ lists where whatever is at state $j$ goes. Repeating one transition matrix, $\\mathbf x_{k+1} = P\\mathbf x_k$, is a **Markov chain**.',
    formula: 'P = \\begin{bmatrix} \\cg{0.8} & \\htmlClass{c-red}{0.2} & \\cb{0.2} \\\\ \\cg{0.1} & \\htmlClass{c-red}{0.7} & \\cb{0.2} \\\\ \\cg{0.1} & \\htmlClass{c-red}{0.1} & \\cb{0.6} \\end{bmatrix} \\qquad P\\begin{bmatrix} 300 \\\\ 0 \\\\ 0 \\end{bmatrix} = \\cy{\\begin{bmatrix} 240 \\\\ 30 \\\\ 30 \\end{bmatrix}}',
    why: 'Many CS texts write the state as a row and multiply on the right: $\\mathbf x_{k+1}^{\\mathsf T} = \\mathbf x_k^{\\mathsf T}P^{\\mathsf T}$. Those texts call $P^{\\mathsf T}$ the transition matrix, so there the **rows** add to 1.',
    cue: 'When you see **“fixed chances of moving between states”**, think **transition matrix**.',
    use: 'A text model that picks the next word from the current one, and many reinforcement-learning worlds, are Markov chains.',
  },
};

const NAME_STEADY: Beat = {
  kind: 'name', id: 'name-steady', entry: {
    id: 'steady-state-vector', term: 'steady-state vector', question: 'Which arrangement does the chain leave alone?', nodes: ['N22'],
    saw: '$(P - I)\\mathbf q = \\mathbf 0$ on the row board gave $\\mathbf q = t(2.5, 1.5, 1)$; scaled to 300 drones, $(150, 90, 60)$. Forty hours from the Bow landed on it, and the drones kept moving.',
    means: 'One more hour leaves this arrangement unchanged: $P\\mathbf q = \\mathbf q$. It is an eigenvector with eigenvalue 1, scaled so its entries add to 1.',
    name: 'A **steady-state vector** of a Markov chain is a probability vector $\\mathbf q$ with $P\\mathbf q = \\mathbf q$.',
    formula: '(P - I)\\mathbf q = \\mathbf 0:\\quad \\mathbf q = \\begin{bmatrix} 0.5 \\\\ 0.3 \\\\ 0.2 \\end{bmatrix}, \\quad 300\\,\\mathbf q = \\cy{\\begin{bmatrix} 150 \\\\ 90 \\\\ 60 \\end{bmatrix}}',
    why: '$P\\mathbf q = \\mathbf q$ is $(P - I)\\mathbf q = \\mathbf 0$: the null space of $P - I$. When that null space is one line, as here, any non-zero vector in it, rescaled to add to 1, is the steady state.',
    cue: 'When you see **“in the long run”** for a chain, think **solve $(P - I)\\mathbf q = \\mathbf 0$**.',
    use: 'Queueing models size servers from the steady state of a chain of “how many are waiting”.',
  },
};

const NAME_REGULAR: Beat = {
  kind: 'name', id: 'name-regular', entry: {
    id: 'regular-chain', term: 'regular chain', question: 'Which chains settle from every start?', nodes: ['N22'],
    saw: 'The swap never settled: 100, 0, 100, 0, for as long as it ran. With a stay share added, the bays settled at 50 and 50.',
    means: 'A chain settles from every start when every eigenvalue except 1 is smaller than 1 in size. The swap’s −1 flips sign every hour and never shrinks.',
    name: 'A Markov chain is **regular** when some power of its transition matrix has no zero entry. A regular chain has exactly one steady-state vector, and every start ends there.',
    formula: '\\begin{gathered} \\begin{bmatrix} 0 & 1 \\\\ 1 & 0 \\end{bmatrix}:\\ \\lambda = 1, -1 \\\\ \\begin{bmatrix} 0.1 & 0.9 \\\\ 0.9 & 0.1 \\end{bmatrix}:\\ \\lambda = 1, -0.8 \\end{gathered}',
    why: 'Write the start as $\\mathbf x_0 = c_1\\mathbf q + c_2\\mathbf v_2 + \\cdots$. Then $\\mathbf x_k = c_1\\mathbf q + c_2\\lambda_2^k\\mathbf v_2 + \\cdots$, and with $|\\lambda_2| < 1$ every part but $\\mathbf q$ dies away.',
    cue: 'When a chain will not settle, look for **another eigenvalue of size 1**.',
    use: 'PageRank adds a 15% random jump to every page precisely so the chain is regular.',
  },
};

const WHY = 'A web reader who follows random links, and sometimes jumps to a random page, is a Markov chain on the web. Where readers settle, the steady-state vector, ranked pages for Google’s first search engine: **PageRank** is the terminal puzzle you solved, on billions of pages, by repetition.\n\nThe drone allocation, next, runs on your `steady_state`.';

const ch: ChapterDef = {
  id: 'c20',
  act: 7,
  num: 20,
  title: 'Where do the drones settle?',
  subtitle: 'Fixed shares, repeated',
  nodes: ['N22'],
  palette: 'teal',
  music: 'explore',
  script: S,
  inShort: `Where do the drones settle?\n\n${IN_SHORT_ANSWER}`,
  prereqs: ['c19', 'c18'],
  catchup: 'An **eigenvector** with eigenvalue λ is an arrow a move only stretches by λ. Repeating a move multiplies each eigenvector part by its λ every time, so the eigenvalues largest in size (largest |λ|) decide the long run. Story so far: Vell plans fifty repeats of his pulse, and the crew has forecast where the debris goes.',
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'Where do the drones settle?', body: IN_SHORT_ANSWER } },
    { kind: 'scene', id: 'p1-intro', lines: S.p1Intro, setup: dronesShot },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    NAME_MARKOV,
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: dronesShot },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    NAME_STEADY,
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: exteriorShot },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: dronesShot },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    NAME_REGULAR,
    { kind: 'scene', id: 'p7-intro', lines: S.p7Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'scene', id: 'brief-intro', lines: S.briefing, setup: bridgeShot },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-start', doubt: doubtStart },
    { kind: 'doubt', id: 'd-moving', doubt: doubtMoving },
    { kind: 'doubt', id: 'd-settles', doubt: doubtSettles },
    { kind: 'law', id: 'law', law },
    { kind: 'procedure', id: 'procedure', procedure },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When you see **“fixed chances of moving between states”**, think **transition matrix, eigenvalue 1**.' } },
    { kind: 'build', id: 'build-steady', build: buildSteady },
    { kind: 'cinematic', id: 'install', run: install },
    { kind: 'scene', id: 'sp-intro', lines: S.spIntro, setup: fieldShot },
    { kind: 'puzzle', id: 'sp', puzzle: sp },
    { kind: 'cinematic', id: 'stand-down', run: standDown },
    { kind: 'scene', id: 'review-intro', lines: S.reviewIntro, setup: exteriorShot },
    { kind: 'review', id: 'c20-review', review },
    { kind: 'cinematic', id: 'arrival', run: arrival },
  ],
};

export default ch;
