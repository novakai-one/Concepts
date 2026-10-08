// Chapter 13: "How do we undo a move?" (GDD §6.6, node N15) → inverse, invertible, elementary matrix,
// singular, non-singular (LU in the stretch puzzle). The undo bench squares the Meridian's bow frames;
// [A | I] writes the inverse down; one move flattens space, and the title card returns.
import type { Beat, ChapterDef } from '../../../game/types';
import { bridgeShot } from './bridge';
import { T } from '../../truth';
import { p1, p2, p3, p4, p5, p6, p7 } from './puzzles';
import { sayit, doubtNonzero, doubtFlip, doubtOrder, law, procedure, compare } from './briefing';
import { buildIdentity, buildInverse } from './build';
import { bowShot, coldOpen, install, singularTitle, threePulses } from './scenes';
import { P2_A, P5_FRAME, P6_A } from './logic';
import { S } from './script';

const IN_SHORT = '**How do I undo a move?** Build the move that sends every landing spot back. It exists exactly when no two points landed on the same spot.';

const NAME_INVERSE: Beat = {
  kind: 'name', id: 'name-inverse', entry: {
    id: 'inverse', term: 'inverse', question: 'How do I undo a move?', nodes: ['N15'],
    saw: 'The quarter turn came undone with a quarter turn the other way. For the move with columns $(2, 1)$ and $(1, 1)$, the points $(1, -1)$ and $(-1, 2)$ landed on $\\mathbf e_1$ and $\\mathbf e_2$. As columns, they made the undo, and the move after the undo left every point where it started.',
    means: 'The undo sends every landing spot back to the point that came from there. **Its columns are the points the move sends to $\\mathbf e_1$ and $\\mathbf e_2$.** Undo then move, or move then undo: either way every point ends where it started.',
    name: 'The **inverse** of $A$, written $A^{-1}$, is the move that sends every point back: $A^{-1}A = AA^{-1} = I$. A matrix that has an inverse is **invertible**.',
    formula: '\\begin{gathered} A^{-1}A = AA^{-1} = I \\qquad \\begin{bmatrix} \\cg{2} & \\htmlClass{c-red}{1} \\\\ \\cg{1} & \\htmlClass{c-red}{1} \\end{bmatrix}^{-1} = \\begin{bmatrix} \\cg{1} & \\htmlClass{c-red}{-1} \\\\ \\cg{-1} & \\htmlClass{c-red}{2} \\end{bmatrix} \\\\[6pt] \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}^{-1} = \\frac{1}{ad - bc}\\begin{bmatrix} d & -b \\\\ -c & a \\end{bmatrix} \\end{gathered}',
    why: 'Multiply to check: $\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}\\begin{bmatrix} d & -b \\\\ -c & a \\end{bmatrix} = (ad - bc)\\,I$, so dividing by $ad - bc$ leaves $I$. The number $ad - bc$ gets its own name in the next chapter.',
    cue: 'When you need to **go back**, think **inverse**.',
    use: 'A 3-D game turns a mouse click into a ray into the scene with the inverse of the camera matrix.',
  },
};

const NAME_ELEMENTARY: Beat = {
  kind: 'name', id: 'name-elementary', entry: {
    id: 'elementary-matrix', term: 'elementary matrix', question: 'Why does row reducing [A | I] write down the inverse?', nodes: ['N15'],
    saw: 'Each row operation on $[A \\mid I]$ moved the box: adding a multiple of a row sheared it, scaling a row stretched it. Five operations made it the unit cube, and the right half was the undo. The turned, then sheared frame came back only when the shear came off first.',
    means: 'A row operation is a move: multiplying on the left by the matrix you get when you do that operation to $I$. **If $E_1, \\dots, E_k$ turn $A$ into $I$, their product is $A^{-1}$, and doing them to $I$ writes it down.**',
    name: 'An **elementary matrix** $E$ is the identity matrix with one row operation done to it. Doing that row operation to any matrix is multiplying it by $E$ on the left.',
    formula: '\\begin{gathered} E_k\\cdots E_2E_1A = I \\;\\Rightarrow\\; A^{-1} = E_k\\cdots E_2E_1 \\\\[6pt] [A \\mid I] \\to [I \\mid A^{-1}] \\qquad (AB)^{-1} = B^{-1}A^{-1} \\end{gathered}',
    why: 'Check the order: $(B^{-1}A^{-1})(AB) = B^{-1}(A^{-1}A)B = B^{-1}B = I$. The move done last, $A$, is undone first.',
    cue: 'When you see **[A | I]**, think **every row operation is a move, and the right half keeps the record**.',
    use: 'Numerical libraries keep the record of elimination and reuse it for each new right-hand side.',
  },
};

const NAME_SINGULAR: Beat = {
  kind: 'name', id: 'name-singular', entry: {
    id: 'singular', term: 'singular', question: 'Can every move be undone?', nodes: ['N15'],
    saw: 'The move with columns $(1, 2)$ and $(2, 4)$ sent both grid arrows onto one line. $(2, 0)$ and $(0, 1)$ both landed on $(2, 4)$. Every undo you fired left the frames on a line.',
    means: 'If two different points land on one spot, a move sends that spot to one place, so no move can send it back to both. **A matrix has an inverse exactly when no two points land together: when it does not flatten space.**',
    name: 'A matrix that flattens space is **singular**: it has no inverse. A matrix that has an inverse is **non-singular**, another word for invertible.',
    formula: '\\begin{bmatrix} \\cg{1} & \\htmlClass{c-red}{2} \\\\ \\cg{2} & \\htmlClass{c-red}{4} \\end{bmatrix}\\begin{bmatrix} 2 \\\\ 0 \\end{bmatrix} = \\begin{bmatrix} \\cg{1} & \\htmlClass{c-red}{2} \\\\ \\cg{2} & \\htmlClass{c-red}{4} \\end{bmatrix}\\begin{bmatrix} 0 \\\\ 1 \\end{bmatrix} = \\cy{\\begin{bmatrix} 2 \\\\ 4 \\end{bmatrix}}',
    why: 'Here $ad - bc = 1 \\cdot 4 - 2 \\cdot 2 = 0$: the 2 × 2 formula would divide by zero, and row reducing $[A \\mid I]$ leaves a row of zeros on the left.',
    cue: 'Before you invert, **check that nothing is flattened**.',
    use: 'A solver that meets a column with no pivot reports a singular matrix instead of a wrong answer.',
  },
};

const WHY = 'Clicking on a 3-D scene: the point on the screen goes back through the **inverse of the camera matrix** to become a ray into the world, and the first thing the ray meets is what you clicked. The holotable picks what you click that way.\n\nSolvers rarely build $A^{-1}$ itself. To solve $A\\mathbf x = \\mathbf b$ they eliminate on $[A \\mid \\mathbf b]$ directly: fewer steps and smaller rounding errors. The inverse is for when you need the undo itself, like the bow jacks.';

const ch: ChapterDef = {
  id: 'c13',
  act: 4,
  num: 13,
  title: 'How do we undo a move?',
  subtitle: 'Undoing a move',
  nodes: ['N15'],
  palette: 'violet',
  music: 'explore',
  prereqs: ['c12', 'c10'],
  catchup: 'Doing one move after another multiplies their matrices, and the matrix on the right acts first: $BA$ means $A$, then $B$. The **identity matrix** $I$ leaves every point where it is. Story so far: the crew can read the routine pulse from the lattice; the *Meridian* has taken three years of it.',
  inShort: IN_SHORT,
  script: S,
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'How do we undo a move?', body: IN_SHORT } },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: bowShot(P2_A) },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    NAME_INVERSE,
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: bowShot(T) },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    { kind: 'cinematic', id: 'three', run: threePulses },
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: (g) => bridgeShot(g) },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: bowShot(P5_FRAME) },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    NAME_ELEMENTARY,
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: bowShot(P6_A) },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'cinematic', id: 'title', run: singularTitle },
    NAME_SINGULAR,
    { kind: 'scene', id: 'p7-intro', lines: S.p7Intro, setup: (g) => bridgeShot(g) },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'scene', id: 'brief', lines: S.brief, setup: (g) => bridgeShot(g) },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-nonzero', doubt: doubtNonzero },
    { kind: 'doubt', id: 'd-flip', doubt: doubtFlip },
    { kind: 'doubt', id: 'd-order', doubt: doubtOrder },
    { kind: 'law', id: 'law', law },
    { kind: 'procedure', id: 'procedure', procedure },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When you need to **go back**, think **inverse**, and first check that nothing was flattened.' } },
    { kind: 'build', id: 'build-identity', build: buildIdentity },
    { kind: 'build', id: 'build-inverse', build: buildInverse },
    { kind: 'cinematic', id: 'install', run: install },
  ],
};

export default ch;
