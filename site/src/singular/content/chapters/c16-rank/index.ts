// Chapter 16: "How many directions survived?" (GDD §6.7, N18) → basis, dimension, rank, nullity,
// rank–nullity, vector space; in the set piece, row space, left null space, the four fundamental
// subspaces and the Invertible Matrix Theorem; then Vell's review (the Act V Review) and the low point.
import type { Beat, ChapterDef } from '../../../game/types';
import { bridgeShot } from '../../common/shots';
import { pileShot, sternShot } from '../c15-nullspace/scenes';
import { p1, p2, p3, p4 } from './puzzles';
import { p5, p6, p7 } from './puzzles2';
import { review, sp1, sp2 } from './setpiece';
import { compare, doubtOneBasis, doubtReduced, doubtTwo, law, sayit } from './briefing';
import { buildBasis, buildRank } from './build';
import { coldOpen, cutterShot, install, lowPoint } from './scenes';
import { S } from './script';

const IN_SHORT = 'How many directions survive?\n\nEach input direction is either **kept** or **flattened**. Kept plus flattened is always the number of inputs.';

const NAME_BASIS: Beat = {
  kind: 'name', id: 'name-basis', entry: {
    id: 'basis', term: 'basis and dimension', question: 'How few arrows still reach everything?', nodes: ['N18'], visual: sternShot,
    saw: 'Four strut arrows covered the stern sheet. Any two of them, not on one line, still covered it. One arrow reached only a line. Every way you picked, the fewest was two.',
    means: 'Two arrows reach the plane with none wasted: each adds a direction the other cannot. A third arrow on the plane is a mix of the first two, so it adds nothing.',
    name: 'A **basis** of a subspace is a set of arrows that reaches the whole subspace with none wasted: it spans the subspace and is linearly independent. Every basis of the same subspace has the same number of arrows: its **dimension**.',
    formula: '\\{\\cg{(1, 0, 1)},\\ \\cr{(0, 1, 1)}\\} \\text{ is a basis of the plane } z = x + y, \\qquad \\dim = 2',
    why: 'Each vector has exactly one set of weights in a basis: two different sets would subtract to a loop, and a basis has none. If one basis had more arrows than another, every arrow of the bigger one would be a mix of the smaller one. More weight lists than entries always loop (like four arrows in 3-D), and the same weights make a loop in the bigger set, so it could not be a basis.',
    cue: 'When you see **“the fewest arrows that still reach”**, think **basis**.',
    use: 'An image compressor stores a picture as weights on a small basis of patterns instead of every pixel.',
  },
};

const NAME_RANK: Beat = {
  kind: 'name', id: 'name-rank', entry: {
    id: 'rank', term: 'rank and nullity', question: 'How many directions survive, and how many are flattened?', nodes: ['N18'],
    saw: 'The scanner matrix reduced to pivots in columns 1 and 3: two directions kept. Columns 2 and 4 were free, and each gave one arrow to the origin, $(-2, 1, 0, 0)$ and $(-1, 0, -2, 1)$. The counter read $2 + 2 = 4$.',
    means: 'Each pivot column keeps one output direction. Each free column flattens one input direction: one arrow of the null space. Every column is one or the other, never both.',
    name: 'The **rank** of $A$ is its number of pivot columns: $\\dim \\operatorname{Col} A$. The **nullity** is its number of free columns: $\\dim \\operatorname{Nul} A$. The **rank–nullity theorem**: rank + nullity = the number of columns.',
    formula: '\\operatorname{rank} A + \\dim \\operatorname{Nul} A = n \\qquad \\htmlClass{c-yellow}{2} + \\htmlClass{c-learn}{2} = 4',
    why: 'Reduce $A$. Each column has a pivot or it is free, never both. The pivots count the kept directions; the free columns count the null space arrows.',
    cue: 'When you see **“how many solutions or free choices?”**, count the pivots.',
    use: 'LoRA fine-tunes large language models with low-rank updates: a few kept directions instead of millions of numbers.',
  },
};

const NAME_VS: Beat = {
  kind: 'name', id: 'name-vs', entry: {
    id: 'vector-space', term: 'vector space', question: 'What else adds and stretches like arrows?', nodes: ['N18'],
    saw: 'A bend profile $a + bt + ct^2$ was stored as $(a, b, c)$. Profiles added and stretched like arrows. The rate-of-bend rule became a matrix, built from where $1$, $t$ and $t^2$ landed, and it sent the constant profiles to zero.',
    means: 'Spans, bases, null spaces and rank work for any objects that add and stretch by the same rules as arrows: curves, signals, matrices.',
    name: 'A **vector space** is any set where adding and stretching follow the same rules as arrows. Every one gets every tool in this game. Polynomials of degree at most 2 form one, with basis $1, t, t^2$: dimension 3.',
    formula: 'D = \\begin{bmatrix} 0 & 1 & 0 \\\\ 0 & 0 & 2 \\\\ 0 & 0 & 0 \\end{bmatrix}, \\qquad D\\begin{bmatrix} 5 \\\\ -3 \\\\ 2 \\end{bmatrix} = \\begin{bmatrix} -3 \\\\ 4 \\\\ 0 \\end{bmatrix}',
    why: 'The rate of bend of a sum is the sum of the rates, and of a stretch is the stretch of the rate. So the rule is fixed by where the basis lands, like any matrix.',
    cue: 'When you see **“things that add and stretch”**, think **vector space**: the same tools apply.',
    use: 'Audio software treats a sound as a long vector of samples; an equaliser is a matrix acting on it.',
  },
};

const NAME_FOUR: Beat = {
  kind: 'name', id: 'name-four', entry: {
    id: 'four-subspaces', term: 'four fundamental subspaces', question: 'Where does every part of a matrix live?', nodes: ['N18'],
    saw: 'For Vell’s debris scanner $M$, in the inputs: the plane through the rows, and the null space along $(1, -2, 1)$, at right angles to it. In the outputs: the column space, and the line along $(2, -1, 0)$, at right angles to every column. Both planes held 2 directions.',
    means: 'Each input splits into a part in the plane of the rows and a part in the null space; the second part is flattened. The outputs split the same way around the column space.',
    name: 'The **row space** $\\operatorname{Row} A$ is the span of the rows. The **left null space** $\\operatorname{Nul} A^T$ is every output at right angles to every column. With $\\operatorname{Col} A$ and $\\operatorname{Nul} A$ they are the **four fundamental subspaces**.',
    formula: '\\dim \\operatorname{Row} A = \\dim \\operatorname{Col} A = \\operatorname{rank} A, \\qquad \\operatorname{Nul} A \\perp \\operatorname{Row} A, \\qquad \\operatorname{Nul} A^T \\perp \\operatorname{Col} A',
    why: 'Row operations keep the row space, and the pivots count independent rows and independent columns alike. Each entry of $A\\mathbf x$ is a row dotted with $\\mathbf x$: all zero exactly when $\\mathbf x$ is in the null space.',
    cue: 'When you see **the inputs and the outputs of one matrix**, think **four subspaces, two on each side**.',
    use: 'Recommendation systems split a ratings matrix into the directions that carry information and the ones that carry none.',
  },
};

const NAME_IMT: Beat = {
  kind: 'name', id: 'name-imt', entry: {
    id: 'imt', term: 'Invertible Matrix Theorem', question: 'Why are all these the same fact?', nodes: ['N18'], visual: pileShot,
    saw: 'On the two-decimal model, eleven statements lit together: the lattice flattens; the columns loop with weights $(1, 1, -1)$; $(1, 1, 1)$ is out of reach; column 3 has no pivot; the rank is 2; two starts land together; the triple product and the determinant are 0.',
    means: 'Every one of them says the same thing: **space is flattened**. For a square matrix, if one of them holds, all of them hold.',
    name: 'The **Invertible Matrix Theorem**: for an $n \\times n$ matrix $A$ these are all equivalent: $A$ is invertible; it has $n$ pivots; its reduced form is $I$; rank $A = n$; $\\operatorname{Nul} A = \\{\\mathbf 0\\}$; its columns are independent and reach every point; $A\\mathbf x = \\mathbf b$ has exactly one solution for every $\\mathbf b$; $\\det A \\ne 0$.',
    formula: '\\det A \\ne 0 \\iff \\operatorname{rank} A = n \\iff \\operatorname{Nul} A = \\{\\mathbf 0\\} \\iff A^{-1} \\text{ exists}',
    why: 'All of them come back to the pivots. $n$ pivots in an $n \\times n$ matrix means no free column (nothing flattened) and no zero row (every target reached).',
    cue: 'When you see **any one** of these facts about a square matrix, you know **all** of them.',
    use: 'A solver that finishes elimination with a column that has no pivot knows the system has no single answer, without checking anything else.',
  },
};

const WHY = 'Fine-tuning a large language model changes huge matrices of weights. **LoRA** stores each change as the product of two thin matrices: a **low-rank** update with only a few kept directions. It trains a few million numbers instead of billions.\n\nRank counts the directions that survive. The survey scanner you are about to run reports exactly that for the stern, with your own `rank`.';


const ch: ChapterDef = {
  id: 'c16',
  act: 5,
  num: 16,
  title: 'How many directions survived?',
  subtitle: 'Counting the directions that survive',
  nodes: ['N18'],
  palette: 'ember',
  music: 'tension',
  script: S,
  inShort: IN_SHORT,
  prereqs: ['c15', 'c10', 'c03'],
  catchup: 'The **column space** of $A$ is every point $A\\mathbf x$ reaches; the **null space** is every input it sends to the origin. Reducing $A$ leaves a pivot or a free variable in each column. Story so far: the stern is flat, Vell’s cutter has arrived, and Vell says anything flattened is gone.',
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'How many directions survived?', body: IN_SHORT } },
    { kind: 'scene', id: 'p1-intro', lines: S.p1Intro, setup: sternShot },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    NAME_BASIS,
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: cutterShot },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    NAME_RANK,
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: cutterShot },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: cutterShot },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: sternShot },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    NAME_VS,
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'scene', id: 'p7-intro', lines: S.p7Intro, setup: sternShot },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'scene', id: 'brief-intro', lines: S.briefing, setup: bridgeShot },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-reduced', doubt: doubtReduced },
    { kind: 'doubt', id: 'd-two', doubt: doubtTwo },
    { kind: 'doubt', id: 'd-onebasis', doubt: doubtOneBasis },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When you see **“how many solutions or free choices?”**, count the pivots.' } },
    { kind: 'build', id: 'build-rank', build: buildRank },
    { kind: 'build', id: 'build-basis', build: buildBasis },
    { kind: 'cinematic', id: 'install', run: install },
    { kind: 'scene', id: 'sp-intro', lines: S.spIntro, setup: cutterShot },
    { kind: 'puzzle', id: 'sp1', puzzle: sp1 },
    NAME_FOUR,
    { kind: 'scene', id: 'sp2-intro', lines: S.sp2Intro, setup: cutterShot },
    { kind: 'puzzle', id: 'sp2', puzzle: sp2 },
    NAME_IMT,
    { kind: 'scene', id: 'review-intro', lines: S.reviewIntro, setup: cutterShot },
    { kind: 'review', id: 'c16-review', review },
    { kind: 'cinematic', id: 'low', run: lowPoint },
  ],
};

export default ch;
