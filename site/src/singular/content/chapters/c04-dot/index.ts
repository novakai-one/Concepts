// Chapter 4: "How much do two arrows point the same way?" (GDD §6.4, N05) → dot product, orthogonal,
// angle between vectors, projection onto a line, unit vector, component along, norm.
// Act II opens: the dish hunts the ark's faint beacon among loud echoes; the beacon matcher (cosine
// similarity, the playable AI use) locks it at the end.
import type { Beat, ChapterDef, Game } from '../../../game/types';
import { arkShot } from './ark';
import { p1, p2, p3, p4, p5, p6, p7 } from './puzzles';
import { sayit, doubtZero, doubtTurn, law, compare } from './briefing';
import { buildDot, buildLength, buildAngle, buildShadow } from './build';
import { coldOpen, install } from './scenes';
import { S } from './script';

const shot = (v: number) => async (g: Game) => { await arkShot(g, v); };

const IN_SHORT = 'How much does one arrow point along another? **Multiply matching parts and add.** The number is the length of one arrow\'s shadow on the other, times that other arrow\'s length. It is zero exactly at a right angle.';

const NAME_DOT: Beat = {
  kind: 'name', id: 'name-dot', entry: {
    id: 'dot-product', term: 'dot product', question: 'How much does one arrow point along another?', nodes: ['N05'], visual: shot(1),
    saw: 'The dish reading of $(3, 1)$ against $(2, 4)$ was $3 \\times 2 + 1 \\times 4 = 10$: each grid arrow\'s reading, scaled and added. The direction $(2, -1)$ read exactly **0**, at a right angle to the signal.',
    means: 'Multiply matching parts and add. The number is the length of one arrow\'s shadow on the other\'s line, times the other\'s length. **Big and positive**: they point the same way. **Zero**: a right angle. **Negative**: they point apart.',
    name: 'This number is the **dot product** $\\mathbf v\\cdot\\mathbf w$. It is one number, not an arrow. Two arrows whose dot product is 0 are **orthogonal**: at a right angle, or one of them is the zero vector.',
    formula: '\\cg{\\mathbf v}\\cdot\\cr{\\mathbf w} = \\cg{v_1}\\cr{w_1} + \\cg{v_2}\\cr{w_2} + \\cg{v_3}\\cr{w_3} \\qquad \\begin{bmatrix}3\\\\1\\end{bmatrix}\\cdot\\begin{bmatrix}2\\\\4\\end{bmatrix} = 6 + 4 = 10',
    why: 'The reading of $a(1, 0) + b(0, 1)$ is $a$ times the reading of $(1, 0)$ plus $b$ times the reading of $(0, 1)$, because shadows add along a line. Those two readings are the signal\'s own parts.',
    cue: 'When you see **“how aligned”** or **“at a right angle?”**, think **dot product**.',
    use: 'One neuron in a network computes a dot product: its weights times its inputs, added.',
  },
};

const NAME_ANGLE: Beat = {
  kind: 'name', id: 'name-angle', entry: {
    id: 'angle-between', term: 'angle between vectors', question: 'What angle do two arrows make?', nodes: ['N05'], visual: shot(2),
    saw: 'For every pair you dragged, $v_1w_1 + v_2w_2$ and $\\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta$ showed the same number.',
    means: 'Expanding $\\|\\mathbf v - \\mathbf w\\|^2$ and the law of cosines describe the same side of one triangle, so their last terms match. The dot product is both lengths times the cosine of the angle between them.',
    name: 'The **angle between vectors** $\\mathbf v$ and $\\mathbf w$ is the $\\theta$ from 0° to 180° with $\\cos\\theta = \\dfrac{\\mathbf v\\cdot\\mathbf w}{\\|\\mathbf v\\|\\|\\mathbf w\\|}$.',
    formula: '\\cg{\\mathbf v}\\cdot\\cr{\\mathbf w} = \\|\\cg{\\mathbf v}\\|\\,\\|\\cr{\\mathbf w}\\|\\cos\\theta \\qquad \\cos\\theta = \\frac{5}{\\sqrt{10}\\,\\sqrt{5}} = \\frac{1}{\\sqrt 2},\\quad \\theta = 45^\\circ',
    why: 'Lengths are never negative, so the sign of $\\mathbf v\\cdot\\mathbf w$ is the sign of $\\cos\\theta$: positive under 90°, zero at 90°, negative over 90°.',
    cue: 'When you see **“what angle?”** between two arrows, think **dot product over both lengths**.',
    use: 'Cosine similarity: search engines and language models rank matches by the cosine of the angle between two long arrows of numbers.',
  },
};

const NAME_PROJ: Beat = {
  kind: 'name', id: 'name-projection', entry: {
    id: 'projection', term: 'projection', question: 'Where does the shadow of one arrow land on another\'s line?', nodes: ['N05'], visual: shot(3),
    saw: 'The shadow of $(3, 4)$ on the line through $(2, 1)$ landed at $(4, 2)$: $\\frac{10}{5} = 2$ times $(2, 1)$. The gap $(-1, 2)$ read 0 against $(2, 1)$.',
    means: 'Divide by $\\mathbf u\\cdot\\mathbf u$, not by $\\|\\mathbf u\\|$: once to turn the reading into a shadow length, once more to turn $\\mathbf u$ into a direction one unit long.',
    name: 'The shadow is the **projection** of $\\mathbf v$ onto the line through $\\mathbf u$. An arrow of length 1 is a **unit vector**, such as $\\mathbf u / \\|\\mathbf u\\|$. The signed shadow length $\\mathbf v\\cdot\\mathbf u / \\|\\mathbf u\\|$ is the **component** of $\\mathbf v$ **along** $\\mathbf u$. Books also call length the **norm**.',
    formula: '\\operatorname{proj}_{\\cr{\\mathbf u}}\\cg{\\mathbf v} = \\frac{\\cg{\\mathbf v}\\cdot\\cr{\\mathbf u}}{\\cr{\\mathbf u}\\cdot\\cr{\\mathbf u}}\\,\\cr{\\mathbf u} = \\frac{10}{5}\\begin{bmatrix}2\\\\1\\end{bmatrix} = \\cy{\\begin{bmatrix}4\\\\2\\end{bmatrix}}',
    why: 'Shadow length $\\frac{\\mathbf v\\cdot\\mathbf u}{\\|\\mathbf u\\|}$ times the unit direction $\\frac{\\mathbf u}{\\|\\mathbf u\\|}$ is $\\frac{\\mathbf v\\cdot\\mathbf u}{\\|\\mathbf u\\|^2}\\mathbf u$, and $\\|\\mathbf u\\|^2 = \\mathbf u\\cdot\\mathbf u$.',
    cue: 'When you see **“the closest point on a line”** or **“the part along”**, think **projection**.',
    use: 'Least squares, later in this course, is a projection: the closest point a model can reach.',
  },
};

const WHY = 'The search box on every phone, and the language models behind chat assistants, store each document, word or image as a long arrow of numbers. To find the best match they rank candidates by the **cosine of the angle**: the dot product divided by both lengths. A long arrow that points the wrong way does not win.\n\nThat is the meter you fixed in *Which one is the ark?* Next, your own `dot` ranks 200 signatures on the ark\'s bearing and finds the beacon.';

const ch: ChapterDef = {
  id: 'c04',
  act: 2,
  num: 4,
  title: 'How much do two arrows point the same way?',
  subtitle: 'The dish meter',
  nodes: ['N05'],
  palette: 'teal',
  music: 'explore',
  script: S,
  inShort: IN_SHORT,
  prereqs: ['c01'],
  catchup: 'An arrow is a move: so far along each axis. Its **length** is Pythagoras on its parts: $(3, 4)$ is $\\sqrt{9 + 16} = 5$ long. Story so far: the *Lantern* climbed out of the debris plane and found the colony ark *Meridian*, its frames leaning.',
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'How much do two arrows point the same way?', body: IN_SHORT } },
    { kind: 'scene', id: 'p1-intro', lines: S.p1Intro, setup: shot(0) },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: shot(1) },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    NAME_DOT,
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: shot(2) },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    NAME_ANGLE,
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: shot(3) },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: shot(0) },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: shot(2) },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    NAME_PROJ,
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'scene', id: 'brief-intro', lines: S.briefing, setup: shot(1) },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-zero', doubt: doubtZero },
    { kind: 'doubt', id: 'd-turn', doubt: doubtTurn },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When you see **“how aligned”**, **“angle”** or **“perpendicular”**, think **dot product**.' } },
    { kind: 'build', id: 'build-dot', build: buildDot },
    { kind: 'build', id: 'build-length', build: buildLength },
    { kind: 'build', id: 'build-angle', build: buildAngle },
    { kind: 'build', id: 'build-shadow', build: buildShadow },
    { kind: 'cinematic', id: 'install', run: install },
  ],
};

export default ch;
