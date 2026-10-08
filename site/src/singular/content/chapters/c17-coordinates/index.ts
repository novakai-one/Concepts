// Chapter 17: "Same point, different grid: what are its numbers now?" (GDD §6.8, N19), the whole of Act VI.
// Coordinates relative to a basis, the change-of-coordinates matrix and change of basis, similar matrices;
// the copper second grid and the three-slot rail. Then the act's set piece (set the spires right), Ilse
// alive at the origin, the Act VI Review (Ilse, live) and Teo's callback T2.
import type { Beat, ChapterDef, Game } from '../../../game/types';
import { answer } from '../../../game/caseboard';
import { sfx } from '../../../audio/sfx';
import { bridgeShot } from '../../common/shots';
import { T } from '../../truth';
import { p1, p2, p3 } from './puzzles';
import { p4, p5, p6, p7 } from './puzzles2';
import { review, sp } from './setpiece';
import { compare, doubtArea, doubtMotion, doubtRight, law, sayit, teo } from './briefing';
import { buildFromCoords, buildInGrid, buildToCoords } from './build';
import { anchorShot, clearCine, clearShot, coldOpen, gridsShot, reveal, sternShot, streamShot } from './scenes';
import { texM } from './logic';
import { S } from './script';

const IN_SHORT_ANSWER = 'Its numbers are the amounts of each grid arrow you need to reach it. Change the arrows and the numbers change; **the point does not move**. To do a move written in another grid: translate in, move, translate back.';
const IN_SHORT = `Same point, different grid: what are its numbers now?\n\n${IN_SHORT_ANSWER}`;

const closeCase = (id: string, text: string, q: string) => async (g: Game) => {
  answer(id, text, 'c17');
  g.toast(q, 'Case board · answered');
  sfx.discover();
  await anchorShot(g);
};

const NAME_COORDS: Beat = {
  kind: 'name', id: 'name-coords', entry: {
    id: 'coordinates', term: 'coordinates', question: 'How do I name a point in someone else’s grid?', nodes: ['N19'], visual: anchorShot,
    saw: 'The buoy at $(3, 2)$ in our numbers sat on a copper crossing: one step of $\\mathbf b_1 = (1, 0)$, then two of $\\mathbf b_2 = (1, 1)$. The buoy never moved. Only the arrows we counted in changed.',
    means: 'A point’s numbers depend on the grid you count in. In a grid whose arrows are not on one line, every point has exactly one set of numbers: the amounts of each arrow that reach it.',
    name: 'The **coordinates** of $\\mathbf x$ relative to a basis $\\mathcal B = \\{\\mathbf b_1, \\mathbf b_2\\}$ are the weights $c_1, c_2$ with $c_1\\mathbf b_1 + c_2\\mathbf b_2 = \\mathbf x$, written $[\\mathbf x]_\\mathcal B$. With the basis arrows as the columns of $P_\\mathcal B$: $\\mathbf x = P_\\mathcal B[\\mathbf x]_\\mathcal B$.',
    formula: '[\\mathbf x]_\\mathcal B = \\begin{bmatrix} 1 \\\\ 2 \\end{bmatrix} \\iff 1\\cg{\\begin{bmatrix} 1 \\\\ 0 \\end{bmatrix}} + 2\\cr{\\begin{bmatrix} 1 \\\\ 1 \\end{bmatrix}} = \\cy{\\begin{bmatrix} 3 \\\\ 2 \\end{bmatrix}}',
    why: 'A basis reaches every point with none wasted, so the weights exist and are unique: two different sets would subtract to a loop. Finding them is solving $P_\\mathcal B\\mathbf c = \\mathbf x$.',
    cue: 'When you see **“its numbers in that grid”**, think **coordinates: solve $P\\mathbf c = \\mathbf x$**.',
    use: 'A game engine stores each model’s points in the model’s own grid, and the camera reads them in its own.',
  },
};

const NAME_COB: Beat = {
  kind: 'name', id: 'name-cob', entry: {
    id: 'change-of-basis', term: 'change of basis', question: 'How do I do a move that is written in another grid?', nodes: ['N19'],
    visual: closeCase('nine', 'A quarter turn, $R$, written for our grid. The Anchor reads its spire numbers in its own slanted grid, so it played $PRP^{-1}$: the measured pulse, which leans everything. Right numbers, wrong grid.', 'What do Ilse’s nine numbers mean?'),
    saw: `On the rail, Ilse’s quarter turn $R$ sat between two translations: into the Anchor’s grid ($P^{-1}$), then back to ours ($P$). Played right to left, it matched the measured pulse exactly: $PRP^{-1} = ${texM(T)}$. The bow went to $(1, 1)$, not $(0, 1)$.`,
    means: 'The same four numbers move space differently in different grids. To do a move written in another grid: translate in, move, translate back. The right-hand matrix acts first.',
    name: 'The matrix $P_\\mathcal B$, whose columns are the basis arrows, is the **change-of-coordinates matrix**: it turns $\\mathcal B$-coordinates into standard ones, and $P_\\mathcal B^{-1}$ turns them back. Rewriting points and moves in a new basis is a **change of basis**.',
    formula: '\\mathbf x = P_\\mathcal B[\\mathbf x]_\\mathcal B, \\qquad [\\mathbf x]_\\mathcal B = P_\\mathcal B^{-1}\\mathbf x, \\qquad P_{\\mathcal C\\leftarrow\\mathcal B} = P_\\mathcal C^{-1}P_\\mathcal B',
    why: 'Read $PRP^{-1}\\mathbf x$ right to left: $P^{-1}\\mathbf x$ is $\\mathbf x$ in the Anchor’s numbers, $R$ moves it there, $P$ writes the result in ours. Between two bases, go through ours: $P_\\mathcal B$ in, $P_\\mathcal C^{-1}$ out.',
    cue: 'When you see **a move written in someone else’s grid**, think **translate in, move, translate back**.',
    use: 'A robot arm chains one change of basis per joint to know where its hand is.',
  },
};

const NAME_SIMILAR: Beat = {
  kind: 'name', id: 'name-similar', entry: {
    id: 'similar', term: 'similar matrices', question: 'When are two matrices one move?', nodes: ['N19'],
    visual: closeCase('spires', 'The spire numbers are written in the Anchor’s grid, so a position forecast has to translate in and back. Area scaling does not depend on the grid: $\\det(PSP^{-1}) = \\det S$. So the volume forecast was exact.', 'Why did the prediction from the spires miss when the volume prediction matched?'),
    saw: 'Side by side, $R$ in the Anchor’s grid and $T = PRP^{-1}$ in ours had the same area scale (1), the same sum down the diagonal (0), and both brought every point home after four pulses. Their entries and the landing of $(1, 0)$ differed.',
    means: 'They are one move, described in two grids. Whatever does not depend on the grid comes out the same. That is why the spire numbers forecast the volume exactly and the position wrongly.',
    name: '$A$ and $B$ are **similar matrices** when $B = P^{-1}AP$ for some invertible $P$: two descriptions of one move in two grids.',
    formula: 'B = P^{-1}AP \\implies \\det B = \\det P^{-1}\\,\\det A\\,\\det P = \\det A, \\qquad B^4 = P^{-1}A^4P',
    why: '$\\det P^{-1} = 1/\\det P$, so the two outer factors cancel. In a repeat the inner $PP^{-1}$ pairs cancel, which is why four pulses bring both home.',
    cue: 'When two matrices might be **one move in two grids**, compare what a grid cannot change: area scale, the sum down the diagonal.',
    use: 'Numerical libraries change basis on purpose: a messy matrix can be a plain stretch in the right grid. That idea runs the next act.',
  },
};

const WHY = 'Every game engine keeps a grid per object, one for the world and one for the camera. A point on a ship model is stored in the ship’s own numbers. To draw it, the engine turns them into world numbers and then into the camera’s: one matrix each. Robot arms do the same, joint by joint. Doing a move in another frame is always three steps: **translate in, move, translate back**.\n\nThe spire translator you install next does exactly that for the Anchor. With your `to_coords` and `in_grid`, it converts every ship-grid move into the Anchor’s grid before the spires are set.';

const ch: ChapterDef = {
  id: 'c17',
  act: 6,
  num: 17,
  title: 'Same point, different grid: what are its numbers now?',
  subtitle: 'Naming points in another grid',
  nodes: ['N19'],
  palette: 'copper',
  music: 'explore',
  script: S,
  inShort: IN_SHORT,
  prereqs: ['c16', 'c13', 'c11'],
  catchup: 'A matrix’s **columns** are where the grid arrows land, and $A\\mathbf x$ mixes them with the numbers of $\\mathbf x$ as weights. A **basis** reaches every point with no arrow wasted. Story so far: the stern is flat, Vell holds the Anchor, and Ilse’s nine numbers forecast a quarter turn while the measured pulse leans the grid.',
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'Same point, different grid: what are its numbers now?', body: IN_SHORT_ANSWER } },
    { kind: 'scene', id: 'p1-intro', lines: S.p1Intro, setup: anchorShot },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    NAME_COORDS,
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: anchorShot },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: gridsShot },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: anchorShot },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    NAME_COB,
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: anchorShot },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: anchorShot },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    NAME_SIMILAR,
    { kind: 'scene', id: 'p7-intro', lines: S.p7Intro, setup: anchorShot },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'scene', id: 'brief-intro', lines: S.briefing, setup: bridgeShot },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-right', doubt: doubtRight },
    { kind: 'doubt', id: 'd-area', doubt: doubtArea },
    { kind: 'doubt', id: 'd-motion', doubt: doubtMotion },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When two people give the same point different numbers, think **change of basis**.' } },
    { kind: 'build', id: 'build-to-coords', build: buildToCoords },
    { kind: 'build', id: 'build-from-coords', build: buildFromCoords },
    { kind: 'build', id: 'build-in-grid', build: buildInGrid },
    { kind: 'cinematic', id: 'reveal', run: reveal },
    { kind: 'scene', id: 'sp-intro', lines: S.spIntro, setup: streamShot },
    { kind: 'puzzle', id: 'sp', puzzle: sp },
    { kind: 'cinematic', id: 'clear', run: clearCine },
    { kind: 'scene', id: 'review-intro', lines: S.reviewIntro, setup: clearShot },
    { kind: 'review', id: 'c17-review', review },
    { kind: 'scene', id: 'close', lines: S.close, setup: sternShot },
    { kind: 'teo', id: 'c17-teo', teo },
    { kind: 'scene', id: 'teo-sent', lines: S.teoSent, setup: clearShot },
  ],
};

export default ch;
