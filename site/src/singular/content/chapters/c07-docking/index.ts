// Chapter 7: "Where does our path meet the door?" (GDD §6.4, N08) → parametric equation of a line,
// direction vector, skew lines, Cartesian equation of a plane. The path bead and the glass wall;
// door picking; then the end of Act II: the docking set piece, Bram's Act II Review and Ilse's oldest
// log (the engine shows NumPy card II after this chapter).
import type { Beat, ChapterDef } from '../../../game/types';
import { p1, p2, p3, p4, p5, p6, p7 } from './puzzles';
import { setPiece } from './setpiece';
import { sayit, doubtCross, doubtNormal, law, compare } from './briefing';
import { reviewCross, reviewDot, reviewPlane, reviewSwap } from './review';
import { buildDistToPlane, buildRayPlane } from './build';
import { close, coldOpen, install, shot } from './scenes';
import { S } from './script';

const IN_SHORT = 'How do I describe a straight path or a flat wall with numbers? **A path is a point plus any multiple of a direction.** A wall is every point whose arrow from a fixed point is at a right angle to one arrow sticking out of it.';

const NAME_LINE: Beat = {
  kind: 'name', id: 'name-line', entry: {
    id: 'parametric-line', term: 'parametric equation of a line', question: 'How do I write a straight path with numbers?', nodes: ['N08'], visual: shot(0),
    saw: 'Each path was a starting point plus minutes times a step: ours $t(1, 1, 0)$, the debris $(4, 0, 0) + t(-1, 1, 0)$. They cross at $(2, 2, 0)$. Changing our speed changed **when** we passed the crossing, not **where**.',
    means: 'A straight path is a point plus any multiple of a direction. Turning the dial $t$ slides a point along it. Two paths can share a point without the ships being there at the same minute.',
    name: '$\\mathbf r = \\mathbf p + t\\mathbf d$ is the **parametric (vector) equation of a line**. $\\mathbf p$ is a point on it and $\\mathbf d$ is its **direction vector**. Any non-zero multiple of $\\mathbf d$ gives the same line.',
    formula: '\\mathbf r = \\mathbf p + t\\,\\cg{\\mathbf d} \\qquad (4, 0, 0) + 2\\,\\cg{(-1, 1, 0)} = \\cy{(2, 2, 0)}',
    why: 'Every point of the line is reached from $\\mathbf p$ by some amount of $\\mathbf d$: a scalar multiple of one arrow, added to a point.',
    cue: 'When you see **“a straight path through a point”**, think **point plus $t$ times direction**.',
    use: 'Every ray a renderer sends from the camera through a pixel is $\\mathbf p + t\\mathbf d$.',
  },
};

const NAME_SKEW: Beat = {
  kind: 'name', id: 'name-skew', entry: {
    id: 'skew-lines', term: 'skew lines', question: 'Can two paths that are not parallel miss each other?', nodes: ['N08'], visual: shot(1),
    saw: 'Our path along $(1, 0, 0)$ and the debris along $(0, 1, 0)$ point different ways, yet never meet: one runs 2 above the other. The shortest link between them is at a right angle to both, along $(1, 0, 0)\\times(0, 1, 0) = (0, 0, 1)$, and it is 2 long.',
    means: 'In 3-D, two lines can miss without being parallel. The gap between them is measured along the arrow at a right angle to both directions: their cross product.',
    name: 'Lines that are not parallel and never meet are **skew lines**.',
    formula: '\\begin{gathered}\\text{gap} = \\frac{|(\\mathbf p_2 - \\mathbf p_1)\\cdot(\\cg{\\mathbf d_1}\\times\\htmlClass{c-red}{\\mathbf d_2})|}{\\|\\cg{\\mathbf d_1}\\times\\htmlClass{c-red}{\\mathbf d_2}\\|} \\\\[4pt] \\frac{|(0, 1, 2)\\cdot(0, 0, 1)|}{1} = 2\\end{gathered}',
    why: 'The cross product points across both lines. The shadow of any arrow from one line to the other on that direction is the gap.',
    cue: 'When two lines **never meet and are not parallel**, think **skew**: measure the gap along $\\mathbf d_1\\times\\mathbf d_2$.',
    use: 'Robot arms and physics engines check how close two moving rods come with this gap.',
  },
};

const NAME_PLANE: Beat = {
  kind: 'name', id: 'name-plane', entry: {
    id: 'cartesian-plane', term: 'Cartesian equation of a plane', question: 'What equation does every point of a flat wall obey?', nodes: ['N08'], visual: shot(2),
    saw: 'Every arrow from P to a point on the door read 0 against $\\mathbf n = (6, 3, 2)$. Expanding $\\mathbf n\\cdot(X - P) = 0$ gave $6x + 3y + 2z = 6$.',
    means: 'A plane is every point whose arrow from one fixed point is at a right angle to one arrow sticking out of it: a dot product equal to zero. The numbers in front of $x$, $y$ and $z$ are that arrow.',
    name: '$ax + by + cz = d$ is the **Cartesian equation of a plane**. The arrow $(a, b, c)$ is the plane\'s **normal**: it points straight out of it.',
    formula: '\\begin{gathered}\\mathbf n\\cdot(X - P) = 0 \\iff \\cy{6}x + \\cy{3}y + \\cy{2}z = 6 \\\\[4pt] \\text{distance from } Q = \\frac{|\\mathbf n\\cdot(Q - P)|}{\\|\\mathbf n\\|}\\end{gathered}',
    why: '$\\mathbf n\\cdot(X - P) = 0$ is $\\mathbf n\\cdot X = \\mathbf n\\cdot P$. Written out, $\\mathbf n\\cdot X$ is $ax + by + cz$, and $\\mathbf n\\cdot P$ is one number, $d$.',
    cue: 'When you see **$ax + by + cz = d$**, read off the **normal** $(a, b, c)$.',
    use: 'A linear classifier separates data with a plane $\\mathbf w\\cdot\\mathbf x + b = 0$; its weight vector $\\mathbf w$ is the normal.',
  },
};

const WHY = 'A renderer finds what each pixel shows by sending the line $\\mathbf p + t\\mathbf d$ from the camera through the pixel, and solving for the $t$ where it meets each surface\'s plane. That is **ray casting**, and clicking an object in any 3-D tool does the same.\n\nA **linear classifier** is a plane $\\mathbf w\\cdot\\mathbf x + b = 0$: which side a point falls on is the sign of a dot product with the normal.\n\nNext: your `ray_plane` turns a click on the hangar door into the docking marker.';


const ch: ChapterDef = {
  id: 'c07',
  act: 2,
  num: 7,
  title: 'Where does our path meet the door?',
  subtitle: 'Paths and walls',
  nodes: ['N08'],
  palette: 'teal',
  music: 'explore',
  script: S,
  inShort: IN_SHORT,
  prereqs: ['c04', 'c05'],
  catchup: 'Two arrows at a right angle have **dot product** 0, and the **cross product** of two edge arrows points straight out of their panel. The hangar door\'s corners give $(Q - P)\\times(R - P) = (6, 3, 2)$. Story so far: the *Lantern* matched the ark\'s tumble and checked its hull. Section C is flat; the rest holds.',
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'Where does our path meet the door?', body: IN_SHORT } },
    { kind: 'scene', id: 'p1-intro', lines: S.p1Intro, setup: shot(0) },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    NAME_LINE,
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: shot(1) },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    NAME_SKEW,
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: shot(2) },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    NAME_PLANE,
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: shot(3) },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: shot(0) },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: shot(1) },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'scene', id: 'brief-intro', lines: S.briefing, setup: shot(3) },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-cross', doubt: doubtCross },
    { kind: 'doubt', id: 'd-normal', doubt: doubtNormal },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When you see **“where does this path hit that surface”**, substitute the path into the plane\'s equation.' } },
    { kind: 'build', id: 'build-ray-plane', build: buildRayPlane },
    { kind: 'build', id: 'build-dist-to-plane', build: buildDistToPlane },
    { kind: 'cinematic', id: 'install', run: install },
    { kind: 'scene', id: 'sp-intro', lines: S.spIntro, setup: shot(2) },
    { kind: 'puzzle', id: 'sp', puzzle: setPiece },
    { kind: 'scene', id: 'review-intro', lines: S.review, setup: shot(3) },
    { kind: 'review', id: 'c07-review', review: { id: 'c07-review', who: 'bram', title: 'Act II Review', claims: [reviewDot, reviewCross, reviewSwap, reviewPlane] } },
    { kind: 'cinematic', id: 'close', run: close },
  ],
};

export default ch;
