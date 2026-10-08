// Chapter 5: "Which way is straight out of this panel?" (GDD §6.4, N06) → cross product, right-hand rule,
// normal vector. The ark tumbles and half its hull renders dark; RAISE finds the turning axis, and the
// hull-lighting install relights the Meridian from the player's normals.
import type { Beat, ChapterDef, Game } from '../../../game/types';
import { arkShot } from '../c04-dot/ark';
import { p1, p2, p3, p4, p5, p6, p7 } from './puzzles';
import { sayit, doubtSwap, doubtDouble, law, compare } from './briefing';
import { buildCross, buildNormal, buildArea } from './build';
import { TUMBLE, TUMBLE_DPS, coldOpen, corruptHull, install } from './scenes';
import { S } from './script';

/** Dialogue staging: the tumbling ark, its hull half dark until the install. */
const shot = (v: number) => async (g: Game) => {
  const set = await arkShot(g, v, { tumble: { axis: TUMBLE, dps: TUMBLE_DPS }, starLight: 2.8 });
  if (set.model) corruptHull(set.model, set.ark);
};

const IN_SHORT = 'Which way is straight out of a panel, and how big is it? **One arrow is at a right angle to both edges and as long as the panel\'s area.** Swap the edges and it points the other way.';

const NAME_CROSS: Beat = {
  kind: 'name', id: 'name-cross', entry: {
    id: 'cross-product', term: 'cross product', question: 'Which way is straight out of a panel, and how big is it?', nodes: ['N06'], visual: shot(1),
    saw: 'Out of the panel on $(2, 0, 0)$ and $(1, 3, 0)$ rose $(0, 0, 6)$: it read 0 against both edges and was as long as the area, 6. Raising in the other order gave $(0, 0, -6)$ and spun the *Lantern* the wrong way.',
    means: 'One arrow carries two facts: its **direction** is straight out of the panel, and its **length** is the panel\'s area. The order of the edges picks which side.',
    name: 'The **cross product** $\\mathbf v\\times\\mathbf w$ is the arrow at a right angle to both $\\mathbf v$ and $\\mathbf w$, as long as the parallelogram they make. The **right-hand rule** picks the side: curl your fingers from $\\mathbf v$ to $\\mathbf w$, and your thumb points along $\\mathbf v\\times\\mathbf w$. Any arrow straight out of a panel is a **normal vector** of it.',
    formula: '\\cg{\\mathbf v}\\times\\cr{\\mathbf w} = \\begin{bmatrix} v_2w_3 - v_3w_2 \\\\ v_3w_1 - v_1w_3 \\\\ v_1w_2 - v_2w_1 \\end{bmatrix} \\qquad \\text{triangle area} = \\tfrac12\\|\\cg{\\mathbf v}\\times\\cr{\\mathbf w}\\|',
    why: 'Each part skips its own axis and is a 2 × 2 pattern of the other two. The next puzzle builds it from $\\mathbf n\\cdot\\mathbf v = 0$ and $\\mathbf n\\cdot\\mathbf w = 0$.',
    cue: 'When you need **a direction at a right angle to two others**, or **an area in 3-D**, think **cross product**.',
    use: 'Every 3-D renderer finds the way each triangle faces with $(B - A)\\times(C - A)$, then lights it.',
  },
};

const WHY = 'Every 3-D game and film renderer lights a triangle by the dot product of its **normal** with the direction to the light, and the normal is a cross product of two edges: $(B - A)\\times(C - A)$. The corners must be listed in one fixed order; get it wrong and the triangle renders dark, or the renderer skips it as a back face.\n\nThat is the rule you fixed in *Why is half the hull dark?* Next, your `normal` lights the *Meridian*.';

const ch: ChapterDef = {
  id: 'c05',
  act: 2,
  num: 5,
  title: 'Which way is straight out of this panel?',
  subtitle: 'Straight out of two edges',
  nodes: ['N06'],
  palette: 'teal',
  music: 'explore',
  script: S,
  inShort: IN_SHORT,
  prereqs: ['c04'],
  catchup: 'The **dot product** multiplies matching parts and adds. It is zero exactly when two arrows are at a right angle, or one of them is the zero vector: $(2, 4)\\cdot(2, -1) = 4 - 4 = 0$. Story so far: the dish locked the *Meridian*\'s beacon among two hundred echoes. The ark is tumbling.',
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'Which way is straight out of this panel?', body: IN_SHORT } },
    { kind: 'scene', id: 'p1-intro', lines: S.p1Intro, setup: shot(0) },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: shot(3) },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    NAME_CROSS,
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: shot(2) },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: shot(1) },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: shot(0) },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: shot(2) },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'scene', id: 'brief-intro', lines: S.briefing, setup: shot(3) },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-double', doubt: doubtDouble },
    { kind: 'doubt', id: 'd-swap', doubt: doubtSwap },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When you need **a direction at a right angle to two others**, or **an area in 3-D**, think **cross product**.' } },
    { kind: 'build', id: 'build-cross', build: buildCross },
    { kind: 'build', id: 'build-normal', build: buildNormal },
    { kind: 'build', id: 'build-area', build: buildArea },
    { kind: 'cinematic', id: 'install', run: install },
  ],
};

export default ch;
