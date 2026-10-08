// Chapter 6: "Is the hull still holding volume?" (GDD §6.4, N07) → scalar triple product, coplanar,
// parallelepiped, tetrahedron volume, orientation, signed volume. The strut box: three struts build a
// slanted crystal; base area and height are laid on it; the strut scan finds Section C flat.
import type { Beat, ChapterDef } from '../../../game/types';
import { p1, p2, p3, p4, p5, p6, p7 } from './puzzles';
import { sayit, doubtLean, doubtSwap, law, compare } from './briefing';
import { buildCoplanar, buildTriple } from './build';
import { coldOpen, install, shot } from './scenes';
import { S } from './script';

const IN_SHORT = 'How much space do three struts enclose? **Base area times height.** Zero means the three struts lie flat in one plane.';

const NAME_TRIPLE: Beat = {
  kind: 'name', id: 'name-triple', entry: {
    id: 'scalar-triple-product', term: 'scalar triple product', question: 'How much space do three arrows enclose?', nodes: ['N07'], visual: shot(2),
    saw: 'Section C\'s third strut $(1, 1, 1)$ lay in the plane of the other two: it is $\\tfrac12(2, 1, 0) + \\tfrac12(0, 1, 2)$. The box was flat and held nothing. Raising it to $(1, 1, 4)$ gave the box height, and it held 6.',
    means: 'The space inside is **base area times height**: $\\|\\mathbf v\\times\\mathbf w\\|$ times the shadow of $\\mathbf u$ on the unit arrow straight out of the base. The two lengths cancel, leaving $\\mathbf u\\cdot(\\mathbf v\\times\\mathbf w)$. It is **zero exactly when** the three arrows lie in one plane: then one of them is a combination of the other two.',
    name: 'The number $\\mathbf u\\cdot(\\mathbf v\\times\\mathbf w)$ is the **scalar triple product**: the volume of the box three arrows make, with a sign for which way round they are. The slanted box is a **parallelepiped**. Arrows that lie in one plane are **coplanar**. A **tetrahedron** on the same three edges holds one sixth of the box.',
    formula: '\\begin{aligned}\\cb{\\mathbf u}\\cdot(\\cg{\\mathbf v}\\times\\htmlClass{c-red}{\\mathbf w}) &= u_1(v_2w_3 - v_3w_2) \\\\ &\\quad + u_2(v_3w_1 - v_1w_3) \\\\ &\\quad + u_3(v_1w_2 - v_2w_1)\\end{aligned}',
    why: 'Base area is $\\|\\mathbf v\\times\\mathbf w\\|$. The height is $\\mathbf u\\cdot\\dfrac{\\mathbf v\\times\\mathbf w}{\\|\\mathbf v\\times\\mathbf w\\|}$. Multiply them and the length cancels.',
    cue: 'When you see **“do these three arrows lie in one plane?”**, think **scalar triple product**.',
    use: 'Physics engines and mesh tools ask which side of a triangle a point is on with this number, and flag flat tetrahedra in simulation meshes.',
  },
};

const NAME_SIGNED: Beat = {
  kind: 'name', id: 'name-signed', entry: {
    id: 'signed-volume', term: 'signed volume', question: 'What does a negative volume mean?', nodes: ['N07'], visual: shot(1),
    saw: 'Node 7 logged $-24$. Swapping two struts in its log gave $+24$. The box never moved.',
    means: 'The size of the number is the space inside. The **sign** says which way round the three arrows are listed: $+$ when $\\mathbf u$ is on the same side of the base as $\\mathbf v\\times\\mathbf w$, $-$ when it is on the other side. Every swap of two arrows flips the sign. A negative result is not an error.',
    name: 'The sign is the box\'s **orientation**. The number with its sign, $\\mathbf u\\cdot(\\mathbf v\\times\\mathbf w)$, is the **signed volume**; the space inside is $|\\mathbf u\\cdot(\\mathbf v\\times\\mathbf w)|$.',
    formula: '\\begin{gathered}\\cg{\\mathbf a}, \\htmlClass{c-red}{\\mathbf b}, \\cb{\\mathbf c} = \\text{along, across, up} \\\\[4pt] \\cg{\\mathbf a}\\cdot(\\htmlClass{c-red}{\\mathbf b}\\times\\cb{\\mathbf c}) = 24 \\\\[2pt] \\htmlClass{c-red}{\\mathbf b}\\cdot(\\cg{\\mathbf a}\\times\\cb{\\mathbf c}) = \\cg{\\mathbf a}\\cdot(\\cb{\\mathbf c}\\times\\htmlClass{c-red}{\\mathbf b}) = -24 \\\\[4pt] \\text{tetrahedron} = \\tfrac16\\,|\\mathbf u\\cdot(\\mathbf v\\times\\mathbf w)|\\end{gathered}',
    why: 'Turning the order round ($\\mathbf u, \\mathbf v, \\mathbf w \\to \\mathbf v, \\mathbf w, \\mathbf u$) builds the same box the same way round, so the number does not change. Swapping the two arrows inside the cross product flips the sign, because $\\mathbf w\\times\\mathbf v = -\\,\\mathbf v\\times\\mathbf w$. Any other swap of two arrows is the order turned round (once or twice), then one swap inside the cross product.',
    cue: 'When a volume comes out **negative**, think **orientation**: the same box, listed the other way round.',
    use: 'Every 3-D model lists each triangle\'s corners in an agreed order, so the order fixes which side is out.',
  },
};

const WHY = 'Physics engines and mesh tools ask one question millions of times a second: **which side of this triangle is that point on?** The answer is the sign of a scalar triple product. A tetrahedron in a simulation mesh whose triple product is zero is flat, and solvers break on it, so meshing tools flag every one.\n\nThat is the strut scan: your `triple` reads all 5,000 hull nodes, and every flat box lights up.';

const ch: ChapterDef = {
  id: 'c06',
  act: 2,
  num: 6,
  title: 'Is the hull still holding volume?',
  subtitle: 'Volume from three struts',
  nodes: ['N07'],
  palette: 'teal',
  music: 'explore',
  script: S,
  inShort: IN_SHORT,
  prereqs: ['c03', 'c05'],
  catchup: 'Two edge arrows $\\mathbf v$ and $\\mathbf w$ make a parallelogram. Their **cross product** $\\mathbf v\\times\\mathbf w$ points straight out of it and is as long as its area: $(2, 0, 0)\\times(1, 3, 0) = (0, 0, 6)$. Story so far: the *Lantern* found the ark\'s beacon and matched its tumble. Its hull is a frame of boxes, leaning after every pulse.',
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'Is the hull still holding volume?', body: IN_SHORT } },
    { kind: 'scene', id: 'p1-intro', lines: S.p1Intro, setup: shot(0) },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: shot(1) },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: shot(2) },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    NAME_TRIPLE,
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: shot(3) },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: shot(0) },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    NAME_SIGNED,
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: shot(1) },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'scene', id: 'brief-intro', lines: S.briefing, setup: shot(3) },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-swap', doubt: doubtSwap },
    { kind: 'doubt', id: 'd-lean', doubt: doubtLean },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When asked **“do these four points lie on one plane?”**, think **scalar triple product of edge arrows**.' } },
    { kind: 'build', id: 'build-triple', build: buildTriple },
    { kind: 'build', id: 'build-coplanar', build: buildCoplanar },
    { kind: 'cinematic', id: 'install', run: install },
  ],
};

export default ch;
