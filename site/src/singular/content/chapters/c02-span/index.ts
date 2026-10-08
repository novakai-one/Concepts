// Chapter 2: "What can two thrusters reach?" (GDD §6.3, node N03) → linear combination, weight, span.
// Two dials on two thrust arrows; every point the yellow tip visits glows, so the reachable set
// paints itself in. At the end the gimbals unlock, the camera leaves top-down for the first time,
// and the Meridian's signal turns out to sit off the plane the two thrusters reach.
import type { ChapterDef } from '../../../game/types';
import { S } from './script';
import { p1, p2, p3, p4, p5, p6, p7 } from './puzzles';
import { sayit, doubtDouble, doubtFlip, law, compare, why } from './briefing';
import { buildLincomb, buildReachable } from './build';
import { coldOpen, holotable, closeOut } from './scenes';

const IN_SHORT = 'Which points can two thrusters reach? Every point you get by stretching each thrust arrow by any amount, forward or back, and adding. Two arrows that point different ways reach a whole plane; two on one line reach only that line.';

const ch: ChapterDef = {
  id: 'c02',
  act: 1,
  num: 2,
  title: 'What can two thrusters reach?',
  subtitle: 'What two arrows reach',
  nodes: ['N03'],
  palette: 'default',
  music: 'explore',
  script: S,
  inShort: IN_SHORT,
  prereqs: ['c01'],
  catchup: 'A vector is an arrow: so far across, so far up. Multiplying it by a number stretches it along its own line, and a negative number flips it. Adding two vectors puts them tip to tail. Two thrusters are still working.',
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    {
      kind: 'card', id: 'inshort', card: {
        kind: 'inshort', title: 'What can two thrusters reach?',
        body: 'Which points can two thrusters reach?\n\nEvery point you get by **stretching each thrust arrow by any amount, forward or back, and adding**. Two arrows that point different ways reach a whole plane. Two on one line reach only that line.',
      },
    },
    { kind: 'scene', id: 'holo', lines: S.holo, setup: holotable },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    { kind: 'scene', id: 'thrusters', lines: S.thrusters },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    { kind: 'scene', id: 'p3-intro', lines: S.p3 },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    {
      kind: 'name', id: 'name-lincomb', entry: {
        id: 'linear-combination', term: 'linear combination', question: 'Where do two dials send the ship?', nodes: ['N03'],
        saw: 'Two dials set how far each thruster pushes. The ship flew $a$ of $\\mathbf v$, then $b$ of $\\mathbf w$, and stopped at the yellow tip. (5, 5) took dials 2 and 1. (0, 5) took −1 and 2: one thruster fired backwards.',
        means: 'Every landing point is one stretch of $\\mathbf v$ plus one stretch of $\\mathbf w$. The dials can be any numbers: zero, fractions, negatives.',
        name: 'A **linear combination** of $\\mathbf v$ and $\\mathbf w$ is $a\\mathbf v + b\\mathbf w$: stretch each arrow by some amount and add them. The amounts $a$ and $b$ are the **weights**.',
        formula: '\\cy{\\begin{bmatrix}0\\\\5\\end{bmatrix}} = -1\\,\\cg{\\begin{bmatrix}2\\\\1\\end{bmatrix}} + 2\\,\\cr{\\begin{bmatrix}1\\\\3\\end{bmatrix}}',
        why: 'Each part works on its own. Across: $-1 \\cdot 2 + 2 \\cdot 1 = 0$. Up: $-1 \\cdot 1 + 2 \\cdot 3 = 5$.',
        cue: 'When you see **“so much of this plus so much of that”**, think **linear combination**.',
        use: 'A linear model’s prediction is a linear combination of its input numbers. Training picks the weights.',
      },
    },
    { kind: 'scene', id: 'p4-intro', lines: S.p4 },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    { kind: 'scene', id: 'failover', lines: S.failover },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    {
      kind: 'name', id: 'name-span', entry: {
        id: 'span', term: 'span', question: 'Which points can two thrusters reach?', nodes: ['N03'],
        saw: 'With $\\mathbf v = (2, 1)$ and $\\mathbf w = (1, 3)$ the glow kept spreading wherever the dials went. With the backup, $\\mathbf w = (-4, -2)$, the glow stayed on one line through the start, however the dials turned.',
        means: 'The reachable points have no edges: the weights can be as large as you like, and negative. They always include the start, where both weights are zero. Two arrows that point different ways reach a whole plane; two on one line reach that line.',
        name: 'The **span** of $\\mathbf v$ and $\\mathbf w$ is every point you can reach by stretching $\\mathbf v$ and $\\mathbf w$ and adding them together: every linear combination $a\\mathbf v + b\\mathbf w$.',
        formula: '\\operatorname{span}\\{\\cg{\\mathbf v}, \\cr{\\mathbf w}\\} = \\{\\, a\\,\\cg{\\mathbf v} + b\\,\\cr{\\mathbf w} \\;:\\; a, b \\text{ any numbers} \\,\\}',
        why: 'Setting both weights to 0 gives the origin, so a span always contains the origin.',
        cue: 'When you see **“can I make this from these?”**, think **span**.',
        use: 'A linear model can only output points in the span of its input columns. A target off that span cannot be fitted exactly.',
      },
    },
    { kind: 'scene', id: 'gimbals', lines: S.gimbals },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'scene', id: 'p7-intro', lines: S.p7 },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-double', doubt: doubtDouble },
    { kind: 'doubt', id: 'd-flip', doubt: doubtFlip },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: why },
    { kind: 'build', id: 'build-lincomb', build: buildLincomb },
    { kind: 'build', id: 'build-reachable', build: buildReachable },
    { kind: 'cinematic', id: 'close', run: closeOut },
  ],
};

export default ch;
