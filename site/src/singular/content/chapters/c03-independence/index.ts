// Chapter 3: "Is one of these thrusters wasted?" (GDD §6.3, node N04) → linearly dependent,
// linearly independent, trivial combination. Mount, prune and loop; the Act I set piece (Lift),
// Bram's Act I Review, NumPy card I, and the Meridian coming into view, sheared.
import type { ChapterDef } from '../../../game/types';
import { S } from './script';
import { p1, p2, p3, p4, p5, p6, lift } from './puzzles';
import { sayit, doubtZero, doubtApart, law, compare, why, reviewThree, reviewOneWay, reviewDeck, reviewZero } from './briefing';
import { buildFindLoop } from './build';
import { coldOpen, holotable, reveal } from './scenes';

const IN_SHORT = 'Is one of these thrusters wasted? It is wasted when the others can already reach its tip. Then some firing of all of them, not all zero, brings the ship back where it started.';

const ch: ChapterDef = {
  id: 'c03',
  act: 1,
  num: 3,
  title: 'Is one of these thrusters wasted?',
  subtitle: 'Arrows that add nothing new',
  nodes: ['N04'],
  palette: 'default',
  music: 'explore',
  script: S,
  inShort: IN_SHORT,
  prereqs: ['c02'],
  catchup: 'Two arrows that point different ways reach a whole plane through the start: every stretch of one plus a stretch of the other. Two thrusters on the Lantern reach the plane z = x + y. The ark’s signal is off it.',
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    {
      kind: 'card', id: 'inshort', card: {
        kind: 'inshort', title: 'Is one of these thrusters wasted?',
        body: 'Is one of these thrusters wasted?\n\nIt is wasted when **the others can already reach its tip**. Then some firing of all of them, not all zero, brings the ship back where it started.',
      },
    },
    { kind: 'scene', id: 'holo', lines: S.holo, setup: holotable },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    {
      kind: 'name', id: 'name-dependent', entry: {
        id: 'linear-dependence', term: 'linearly dependent', question: 'Is one of these thrusters wasted?', nodes: ['N04'],
        saw: 'Fired by 2, 3 and −1, the arrows $\\mathbf u$, $\\mathbf v$ and $\\mathbf w$ took the ship out and brought it back to the start. The three legs closed into a triangle.',
        means: 'Move $\\mathbf w$ to the other side: $2\\mathbf u + 3\\mathbf v = \\mathbf w$. The first two already reach the tip of the third, so $\\mathbf w$ adds no new direction. A loop with dials not all zero and a wasted arrow are the same fact.',
        name: 'Arrows are **linearly dependent** when some dials, not all zero, bring the ship back to the start. A set of arrows is **linearly independent** when none of them can be built from the rest: the only way back is every dial at zero, the $\\text{trivial combination}$.',
        formula: '2\\,\\cg{\\mathbf u} + 3\\,\\cr{\\mathbf v} - 1\\,\\cb{\\mathbf w} = \\mathbf 0 \\qquad c_1\\mathbf v_1 + \\dots + c_k\\mathbf v_k = \\mathbf 0 \\;\\text{only when every } c = 0',
        why: 'A loop with one non-zero dial $c_j$ lets you move that arrow across and divide by $-c_j$: it is a combination of the rest.',
        cue: 'When you can **remove something and lose nothing**, think **dependent**.',
        use: 'In a regression, a column that is a combination of other columns adds nothing new, and the weights stop being unique.',
      },
    },
    { kind: 'scene', id: 'p2-intro', lines: S.p2 },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    { kind: 'scene', id: 'p3-intro', lines: S.p3 },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    { kind: 'scene', id: 'p4-intro', lines: S.p4 },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    { kind: 'scene', id: 'p5-intro', lines: S.p5, setup: holotable },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    { kind: 'scene', id: 'p6-intro', lines: S.p6 },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-zero', doubt: doubtZero },
    { kind: 'doubt', id: 'd-apart', doubt: doubtApart },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: why },
    { kind: 'build', id: 'build-find-loop', build: buildFindLoop },
    { kind: 'scene', id: 'lift-intro', lines: S.lift },
    { kind: 'puzzle', id: 'sp', puzzle: lift },
    { kind: 'scene', id: 'review-intro', lines: S.review, setup: holotable },
    { kind: 'review', id: 'c03-review', review: { id: 'c03-review', who: 'bram', title: 'Act I Review', claims: [reviewThree, reviewDeck, reviewOneWay, reviewZero] } },
    { kind: 'cinematic', id: 'reveal', run: reveal },
  ],
};

export default ch;
