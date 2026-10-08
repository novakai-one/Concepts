// Chapter 14: "Why is the ark getting smaller?" (GDD §6.6, node N16) → determinant, signed area,
// orientation reversal, minor, cofactor, cofactor expansion, triangular matrix (Cramer's rule in the
// stretch puzzle). The unit tile rides the grid; the Act IV Review; then the Collapse: your forecast,
// no undo, braces that all lose the same fraction, the sealed mid-section, and the stern folds flat.
import type { Beat, ChapterDef } from '../../../game/types';
import { bridgeShot } from '../c13-inverse/bridge';
import { p1, p2, p3, p4, p5, p7 } from './puzzles';
import { p6 } from './collapse';
import { sayit, doubtDouble, doubtSum, doubtNoInverse, law, compare, review } from './briefing';
import { buildDet, buildDet3 } from './build';
import { coldOpen, collapse, spireVolume, sternShot, strikeShot } from './scenes';
import { S } from './script';

const IN_SHORT = '**What happens to area and volume?** Every square of the grid scales by the same factor, with a minus sign if the grid flips. Zero means space was flattened.';

const NAME_DET: Beat = {
  kind: 'name', id: 'name-determinant', entry: {
    id: 'determinant', term: 'determinant', question: 'What happens to the area?', nodes: ['N16'],
    saw: 'The hold with columns $(3, 0)$ and $(1, 2)$ had area 6, and the stabiliser changed its shape but not its area: every grid square kept area 1. In the $4 \\times 3$ box, taking away the six corner pieces left $12 - 3 - 2 - 2 = 5 = 3 \\cdot 2 - 1 \\cdot 1$.',
    means: 'A move scales **every** area by one factor: the area of the image of the unit square. For columns $(a, c)$ and $(b, d)$ that area is $ad - bc$. A minus sign means the grid is turned over. Zero means the plane is flattened.',
    name: 'The **determinant** $\\det A$ is the factor by which $A$ scales area (or volume), with a minus sign if it turns the grid over. It is the **signed area** of the image of the unit square.',
    formula: '\\det\\begin{bmatrix} \\cg{a} & \\htmlClass{c-red}{b} \\\\ \\cg{c} & \\htmlClass{c-red}{d} \\end{bmatrix} = \\cg{a}\\cr{d} - \\cr{b}\\cg{c} \\qquad \\det\\begin{bmatrix} \\cg{3} & \\htmlClass{c-red}{1} \\\\ \\cg{1} & \\htmlClass{c-red}{2} \\end{bmatrix} = 6 - 1 = \\cy{5}',
    why: 'The box is $(a + b)(c + d)$. Take away two triangles of $\\tfrac12 ac$, two of $\\tfrac12 bd$ and two rectangles of $bc$: $(a + b)(c + d) - ac - bd - 2bc = ad - bc$.',
    cue: 'When you see **“area”**, **“volume”** or **“flattened”**, think **determinant**.',
    use: 'Generative models called normalising flows track how much each layer stretches or squeezes volume with this number.',
  },
};

const NAME_ORIENT: Beat = {
  kind: 'name', id: 'name-orientation', entry: {
    id: 'orientation-reversal', term: 'orientation reversal', question: 'What do products, scalings and flips do to area?', nodes: ['N16'],
    saw: '$A$ doubled area and $B$ tripled it; both in a row made the tile read 6. Doubling every entry of a move made its area 4 times larger. The swap $(0, 1)$, $(1, 0)$ turned the tile over: its amber back showed and it read $-1$.',
    means: 'Scale factors of moves in a row **multiply**. Scaling every entry by $k$ stretches all $n$ columns, so the factor is $k^n$. A **negative** determinant means the move turns the grid over: the tile\'s corners, anticlockwise before, come out clockwise.',
    name: 'A move with a negative determinant is an **orientation reversal**: it turns the grid over, like a mirror.',
    formula: '\\begin{gathered} \\det(AB) = \\det A\\,\\det B \\qquad \\det(kA) = k^n \\det A \\\\[6pt] \\det A^{-1} = \\frac{1}{\\det A} \\qquad \\det A^{T} = \\det A \\end{gathered}',
    why: '$A^{-1}A = I$ and $\\det I = 1$, so $\\det A^{-1} \\det A = 1$. For $A^T$: $ad - bc$ reads the same with rows and columns swapped.',
    cue: 'When you see **two moves in a row**, think **multiply their determinants**.',
    use: 'Graphics engines test the sign of a 2 × 2 determinant to tell whether a triangle faces the camera or has been turned away.',
  },
};

const NAME_COFACTOR: Beat = {
  kind: 'name', id: 'name-cofactor', entry: {
    id: 'cofactor-expansion', term: 'cofactor expansion', question: 'How do we compute a 3 × 3 or 4 × 4 determinant by hand?', nodes: ['N16'],
    saw: 'Along the row you chose in the $3 \\times 3$, the sum came to 8, the volume of the box its columns make. The $4 \\times 4$ took two single entries: $1 \\cdot 1 \\cdot (-1) = -1$.',
    means: 'Each entry times its cofactor, added along one row or column. Choose the row or column with the most zeros. For a **triangular** matrix the expansion leaves the product of the diagonal, which is why row reduction works: adding a multiple of a row changes nothing, a swap flips the sign.',
    name: 'The **minor** $M_{ij}$ is the determinant of what is left after deleting row $i$ and column $j$. The **cofactor** is $C_{ij} = (-1)^{i+j}M_{ij}$. **Cofactor expansion** along row $i$: $\\det A = \\sum_j a_{ij}C_{ij}$. A **triangular matrix** has only zeros below (or only zeros above) its diagonal; its determinant is the product of the diagonal.',
    formula: '\\begin{gathered} \\det A = a_{11}C_{11} + a_{12}C_{12} + a_{13}C_{13} \\qquad \\begin{bmatrix} + & - & + \\\\ - & + & - \\\\ + & - & + \\end{bmatrix} \\\\[6pt] 2 \\cdot 5 - 1 \\cdot 2 + 0 \\cdot 1 = 8 \\end{gathered}',
    why: 'The $3 \\times 3$ determinant is $\\mathbf a_1 \\cdot (\\mathbf a_2 \\times \\mathbf a_3)$, the scalar triple product of the columns. Written out, it is the expansion down column 1: the cross product\'s components are the minors down column 1, the middle one with a minus sign (the $+\\,-\\,+$ pattern), which makes them the cofactors $C_{11}, C_{21}, C_{31}$. Since $\\det A^{T} = \\det A$, the rows give the same number, and that is the row-1 expansion above.',
    cue: 'When you see a **row or column full of zeros**, think **expand along it**.',
    use: 'For big matrices, libraries never expand cofactors (that takes $n!$ steps). They row reduce and multiply the pivots, in about $n^3$ steps.',
  },
};

const WHY = 'A generative model called a **normalising flow** turns simple random noise into images by a chain of invertible layers. To know how likely each image is, it must track how much every layer stretches or squeezes volume: the **determinant** of each layer, multiplied along the chain.\n\nThe hull volume tracker on the *Lantern* does the same with the routine pulse. Write `det` and the Collapse forecast runs on yours.';

const ch: ChapterDef = {
  id: 'c14',
  act: 4,
  num: 14,
  title: 'Why is the ark getting smaller?',
  subtitle: 'How a move scales area and volume',
  nodes: ['N16'],
  palette: 'violet',
  music: 'tension',
  prereqs: ['c13', 'c06'],
  catchup: 'The **scalar triple product** $\\mathbf a \\cdot (\\mathbf b \\times \\mathbf c)$ is the signed volume of the box on three arrows; it is 0 exactly when they are coplanar. The **inverse** undoes a move, and exists exactly when no two points land together. Story so far: the bow is square again, but every routine pulse takes a fifth of the ark\'s volume.',
  inShort: IN_SHORT,
  script: S,
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'Why is the ark getting smaller?', body: IN_SHORT } },
    { kind: 'scene', id: 'p1-intro', lines: S.p1Intro, setup: sternShot },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    { kind: 'cinematic', id: 'spire-volume', run: spireVolume },
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: (g) => bridgeShot(g) },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    NAME_DET,
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    NAME_ORIENT,
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: (g) => bridgeShot(g) },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    NAME_COFACTOR,
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: (g) => bridgeShot(g) },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    { kind: 'scene', id: 'p7-intro', lines: S.p7Intro, setup: (g) => bridgeShot(g) },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    { kind: 'scene', id: 'brief', lines: S.brief, setup: (g) => bridgeShot(g) },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-double', doubt: doubtDouble },
    { kind: 'doubt', id: 'd-noinverse', doubt: doubtNoInverse },
    { kind: 'doubt', id: 'd-sum', doubt: doubtSum },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When you see **“area”**, **“volume”**, **“flattened”** or **“can this be undone”**, think **determinant**.' } },
    { kind: 'build', id: 'build-det', build: buildDet },
    { kind: 'build', id: 'build-det3', build: buildDet3 },
    { kind: 'scene', id: 'review-intro', lines: S.reviewIntro, setup: (g) => bridgeShot(g) },
    { kind: 'review', id: 'c14-review', review },
    { kind: 'scene', id: 'strike', lines: S.strike, setup: strikeShot },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'cinematic', id: 'collapse', run: collapse },
  ],
};

export default ch;
