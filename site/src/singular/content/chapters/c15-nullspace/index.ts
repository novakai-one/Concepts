// Chapter 15: "Where can anything land, and what went to zero?" (GDD §6.7, N17) → column space,
// onto, null space, one-to-one, subspace. Act V opens beside the flattened stern: 2,000 test buoys go
// through the two-decimal model C₂ and land on one plane; a pile of debris sits at the origin; Vell
// arrives. Every puzzle uses the two-decimal model, and LANTERN names it that way every time.
import type { Beat, ChapterDef, Game } from '../../../game/types';
import { bridgeShot } from '../../common/shots';
import { p1, p2, p3, p4 } from './puzzles';
import { p5, p6, p7 } from './puzzles2';
import { compare, doubtAnywhere, doubtPlane, doubtSame, law, sayit, teo } from './briefing';
import { buildColSpace, buildNullSpace } from './build';
import { close, coldOpen, pileShot, scanSet, sternShot } from './scenes';
import { tv } from './space';
import { S } from './script';

const IN_SHORT = 'What can this move reach, and what does it send to the origin?\n\nIt reaches **every mix of its columns**. A whole line or plane of starting points can land on the origin, and two starts land together exactly when they differ by one of those.';

/** Behind a naming card: the scan, with the test buoys already on their plane. */
const flatScan = async (g: Game) => {
  const sc = await scanSet(g, { buoys: 1200, flat: true });
  let az = -60;
  sc.set.tick((dt) => { az += dt * 2; const a = (az * Math.PI) / 180, r = 12.5, e = 0.3; g.stage.camera.position.set(r * Math.cos(e) * Math.cos(a), r * Math.cos(e) * Math.sin(a), r * Math.sin(e) + 0.4); g.stage.camera.up.set(0, 0, 1); g.stage.camera.lookAt(0, 0, 0.3); });
  g.stage.disposeControls();
  g.stage.mode = '3d';
};

const NAME_COL: Beat = {
  kind: 'name', id: 'name-col', entry: {
    id: 'column-space', term: 'column space', question: 'Where can this move put anything?', nodes: ['N17'], visual: flatScan,
    saw: 'Two thousand buoys went in from every direction around the origin. Every one landed on a single plane, $z = x + y$. The columns of the two-decimal model, $(1, 0, 1)$, $(0, 1, 1)$ and $(1, 1, 2)$, lie on that plane too.',
    means: 'A landing is $A\\mathbf x = x_1\\mathbf a_1 + x_2\\mathbf a_2 + x_3\\mathbf a_3$: a mix of the columns. So **every landing is in the span of the columns**, and every point of that span is a landing.',
    name: 'The **column space** of $A$, written $\\operatorname{Col} A$, is the span of the columns of $A$: every point $A\\mathbf x$ can land on. Books also call it the range.',
    formula: '\\operatorname{Col} A = \\operatorname{span}\\{\\cg{\\mathbf a_1}, \\cr{\\mathbf a_2}, \\cb{\\mathbf a_3}\\} \\qquad \\operatorname{Col} C_2:\\ z = x + y',
    why: 'Matrix times vector is a mix of the columns, with the entries of $\\mathbf x$ as the weights. Every choice of weights is a landing.',
    cue: 'When you see **“what can it reach?”**, think **column space**.',
    use: 'The column space of a linear model is every prediction it can make. An answer outside it is out of reach for every setting of the weights.',
  },
};

const NAME_ONTO: Beat = {
  kind: 'name', id: 'name-onto', entry: {
    id: 'onto', term: 'onto transformation', question: 'Does this move reach every point?', nodes: ['N17'],
    saw: 'Three of the four pings were landings. $(1, 1, 1)$ was not: it sits 1 below the landing plane, and no start lands there.',
    means: '$A\\mathbf x = \\mathbf b$ has a solution exactly when $\\mathbf b$ is in the column space. The two-decimal model misses every point off its plane.',
    name: 'A linear transformation is **onto** when its column space is every output: each point is a landing. The two-decimal model is not onto.',
    formula: '\\text{onto} \\iff \\operatorname{Col} A = \\mathbb R^m \\iff \\text{a pivot in every row}',
    why: 'A row of zeros in the reduced form of $A$ reads $0 = c$ for some right-hand sides, and those have no solution. A pivot in every row leaves no such row.',
    cue: 'When you see **“can every target be hit?”**, think **onto**.',
    use: 'A robot arm whose motors are onto can put its gripper at any nearby point. One that is not has places it can never touch.',
  },
};

const NAME_NUL: Beat = {
  kind: 'name', id: 'name-nul', entry: {
    id: 'null-space', term: 'null space', question: 'What does this move send to the origin?', nodes: ['N17'], visual: pileShot,
    saw: 'The probe lit violet at $(1, 1, -1)$: column 1 + column 2 − column 3 = $\\mathbf 0$. Every start on the line through it landed on the origin. The row board read the same line from the free variable: $t\\,(-1, -1, 1)$.',
    means: 'The inputs that land on the origin are the solutions of $A\\mathbf x = \\mathbf 0$. Reduce $A$, give each free variable a value, and read the pivot variables from their rows.',
    name: 'The **null space** of $A$, written $\\operatorname{Nul} A$, is every input the matrix sends to the origin.',
    formula: `\\operatorname{Nul} A = \\{\\mathbf x : A\\mathbf x = \\mathbf 0\\} \\qquad \\operatorname{Nul} C_2 = \\{\\, t\\,${tv('(1, 1, -1)')} \\,\\}`,
    why: 'Column 1 + column 2 − column 3 = 0 is a dependence among the columns. Its weights $(1, 1, -1)$ are an input that lands on the origin, and so is every stretch of it.',
    cue: 'When you see **“what goes to zero?”**, think **null space**.',
    use: 'Directions in a layer\'s input that its weight matrix sends to zero are invisible to the next layer of a neural network.',
  },
};

const NAME_ONE: Beat = {
  kind: 'name', id: 'name-one', entry: {
    id: 'one-to-one', term: 'one-to-one transformation', question: 'Can two different starts land together?', nodes: ['N17'],
    saw: '$(2, 0, 1)$ and $(3, 1, 0)$ both landed on $(3, 1, 4)$. Their difference $(1, 1, -1)$ is on the violet line. Every start on the line through $(1, 2, 0)$ along $(1, 1, -1)$ landed on $(1, 2, 3)$.',
    means: 'If $A\\mathbf a = A\\mathbf b$ then $A(\\mathbf a - \\mathbf b) = \\mathbf 0$. Two starts land together **exactly when they differ by a null space vector**, so whenever $A\\mathbf x = \\mathbf b$ has a solution, its solution set is one solution plus the null space.',
    name: 'A linear transformation is **one-to-one** when no two different starts land together: its null space is only $\\mathbf 0$. The two-decimal model is not one-to-one.',
    formula: `\\text{one-to-one} \\iff \\operatorname{Nul} A = \\{\\mathbf 0\\} \\iff \\text{a pivot in every column} \\qquad \\mathbf x = \\cy{\\mathbf p} + t\\,${tv('\\mathbf n')}`,
    why: 'A free variable gives a whole line of solutions to $A\\mathbf x = \\mathbf 0$. With a pivot in every column there is no free variable, so $\\mathbf 0$ is the only one.',
    cue: 'When you see **“is the answer unique?”**, think **is the null space only $\\mathbf 0$?**',
    use: 'An encoder that is one-to-one never gives two different inputs the same code, so nothing it stores is lost.',
  },
};

const NAME_SUB: Beat = {
  kind: 'name', id: 'name-sub', entry: {
    id: 'subspace', term: 'subspace', question: 'What kind of set can be a landing set?', nodes: ['N17'],
    saw: 'The landing plane and the violet line kept every sum and every stretch. The shifted plane missed the origin, the two axes let a sum escape, and the quarter let a stretch by −1 escape.',
    means: 'A set that holds the origin, every sum of its arrows and every stretch of them is a span: the origin alone, a line or a plane through the origin, or all of space.',
    name: 'A **subspace** is a set of vectors that contains $\\mathbf 0$ and is **closed under addition and scalar multiplication**: sums and stretches of its vectors stay in it. $\\operatorname{Col} A$ and $\\operatorname{Nul} A$ are subspaces.',
    formula: '\\mathbf 0 \\in H, \\qquad \\mathbf u, \\mathbf v \\in H \\Rightarrow \\mathbf u + \\mathbf v \\in H, \\qquad c\\,\\mathbf u \\in H',
    why: '$A(\\mathbf u + \\mathbf v) = A\\mathbf u + A\\mathbf v = \\mathbf 0 + \\mathbf 0$ and $A(c\\mathbf u) = c\\,\\mathbf 0$, so the null space is closed. Each row dotted with a null space vector gives 0: the null space is at right angles to every row.',
    cue: 'When you see **“is this set a subspace?”**, test the origin, one sum and one stretch.',
    use: 'A linear model searches a subspace: every combination of the features it was given, and nothing else.',
  },
};

const WHY = 'A robot arm with more motors than it needs has a **null space**: motor commands that move the joints and leave the hand where it is. Arm controllers use it to swing an elbow clear of an obstacle while the gripper holds on, as you did with the salvage arm.\n\nIts **column space** is every place the hand can go. Next, your own `null_space` sorts the debris: pieces whose starts differ by a null space arrow landed together.';

const ch: ChapterDef = {
  id: 'c15',
  act: 5,
  num: 15,
  title: 'Where can anything land, and what went to zero?',
  subtitle: 'Where things land, and what goes to the origin',
  nodes: ['N17'],
  palette: 'ember',
  music: 'tension',
  script: S,
  inShort: IN_SHORT,
  prereqs: ['c10', 'c11'],
  catchup: 'A matrix moves every point: $A\\mathbf x$ is $x_1$ of column 1, plus $x_2$ of column 2, plus $x_3$ of column 3. Reducing $[A \\mid \\mathbf 0]$ leaves one free variable for each column without a pivot. Story so far: the Collapse pulse folded the *Meridian*\'s stern flat. Teo was inside.',
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'Where can anything land, and what went to zero?', body: IN_SHORT } },
    { kind: 'scene', id: 'p1-intro', lines: S.p1Intro, setup: sternShot },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    NAME_COL,
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: sternShot },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    NAME_ONTO,
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: pileShot },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    NAME_NUL,
    { kind: 'scene', id: 'nul-line', lines: S.nulLine, setup: pileShot },
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: pileShot },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    NAME_ONE,
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: bridgeShot },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    NAME_SUB,
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: sternShot },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'scene', id: 'p7-intro', lines: S.p7Intro, setup: sternShot },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'scene', id: 'brief-intro', lines: S.briefing, setup: bridgeShot },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-anywhere', doubt: doubtAnywhere },
    { kind: 'doubt', id: 'd-same', doubt: doubtSame },
    { kind: 'doubt', id: 'd-plane', doubt: doubtPlane },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When you see **“what can it reach?”**, think **column space**. When you see **“what does it send to the origin?”**, think **null space**.' } },
    { kind: 'build', id: 'build-null', build: buildNullSpace },
    { kind: 'build', id: 'build-col', build: buildColSpace },
    { kind: 'scene', id: 'teo-ask', lines: S.teoAsk, setup: bridgeShot },
    { kind: 'teo', id: 'c15-teo', teo },
    { kind: 'scene', id: 'teo-sent', lines: S.teoSent, setup: sternShot },
    { kind: 'cinematic', id: 'close', run: close },
  ],
};

export default ch;
