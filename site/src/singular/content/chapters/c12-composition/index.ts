// Chapter 12: "What do two moves in a row do?" (GDD §6.6, node N14).
// The sequence rail: drop moves right to left; the grid plays them in order, then fuses them into
// one matrix. Composition is the matrix product; order matters; grouping does not; the transpose
// moves a matrix across a dot product. Builds: matmul (on your matvec) and transpose.
import type { ChapterDef } from '../../../game/types';
import { bridgeShot } from '../../common/shots';
import { coldOpen, installFused } from './cine';
import { p1, p2, p3, p4, p5, p6, p7 } from './puzzles';
import { sayit, doubtOrder, doubtZero, doubtGroup, law, compare } from './briefing';
import { buildMatmul, buildTranspose } from './build';
import { S } from './script';

const ch: ChapterDef = {
  id: 'c12',
  act: 4,
  num: 12,
  title: 'What do two moves in a row do?',
  subtitle: 'Two moves in a row',
  nodes: ['N14'],
  palette: 'violet',
  music: 'tension',
  prereqs: ['c11', 'c04'],
  catchup: 'A matrix lists where the grid arrows land, as columns. Where a point lands is the same mix of those columns: $A\\mathbf x = x_1\\mathbf a_1 + x_2\\mathbf a_2$. This chapter does two such moves in a row.',
  inShort: 'What single move does two moves in a row? Follow each grid arrow through both moves; where they end up are the columns of the single move. The move next to the point happens first, and order matters.',
  script: S,
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'What do two moves in a row do?', body: '**What single move does two moves in a row?**\n\nFollow each grid arrow through both moves. Where they end up are the columns of the single move. The move next to the point happens first, and order matters.' } },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    {
      kind: 'name', id: 'name-product', entry: {
        id: 'matrix-product', term: 'matrix product', question: 'What single move does two moves in a row?', nodes: ['N14'],
        saw: 'The shear left $\\mathbf e_1$ at (1, 0); the turn took it to (0, 1). The shear sent $\\mathbf e_2$ to (1, 1); the turn took it to (−1, 1). One matrix with those two columns did both moves at once.',
        means: 'Two moves in a row are one move. Its columns are where $\\mathbf e_1$ and $\\mathbf e_2$ end up after both.',
        name: 'Doing one move after another is **composition**. Its matrix is the **matrix product** $BA$: $A$ first, then $B$. The right-hand matrix acts first because it sits next to $\\mathbf x$: $BA\\mathbf x = B(A\\mathbf x)$.',
        formula: '\\underbrace{\\begin{bmatrix}0&-1\\\\1&0\\end{bmatrix}}_{\\text{turn}}\\underbrace{\\begin{bmatrix}1&1\\\\0&1\\end{bmatrix}}_{\\text{shear}} = \\begin{bmatrix}\\cg{0}&\\htmlClass{c-red}{-1}\\\\\\cg{1}&\\htmlClass{c-red}{1}\\end{bmatrix} \\qquad (BA)\\mathbf x = B(A\\mathbf x)',
        why: 'Column $j$ of $BA$ is where $\\mathbf e_j$ ends up. $A$ sends it to column $j$ of $A$, then $B$ moves that. So column $j$ of $BA$ is $B$ times column $j$ of $A$.',
        cue: 'When you see **“do this, then that”**, think **multiply, first move on the right**.',
        use: 'A graphics pipeline multiplies its model, view and projection matrices into one matrix, then moves millions of vertices with it.',
      },
    },
    { kind: 'scene', id: 'order', lines: S.order },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    {
      kind: 'name', id: 'name-identity', entry: {
        id: 'identity-matrix', term: 'identity matrix', question: 'Does the order of two moves matter?', nodes: ['N14'],
        saw: '(1, 0) landed on (0, 1) for shear then turn, and on (1, 1) for turn then shear. Two flips over $y = x$ put every point back where it started.',
        means: 'Swapping the order of two moves can change where the grid ends up. Some pairs cancel and leave the grid as it was.',
        name: 'The **identity matrix** $I$ leaves every point where it is: its columns are $\\mathbf e_1$ and $\\mathbf e_2$. The matrix product is **non-commutative**: $AB$ and $BA$ can differ.',
        formula: '\\begin{gathered}I = \\begin{bmatrix}\\cg{1}&\\htmlClass{c-red}{0}\\\\\\cg{0}&\\htmlClass{c-red}{1}\\end{bmatrix} \\qquad AB \\ne BA \\text{ in general} \\\\[6pt] \\underbrace{\\begin{bmatrix}0&1\\\\1&0\\end{bmatrix}\\begin{bmatrix}0&1\\\\1&0\\end{bmatrix}}_{\\text{flip over } y = x \\text{, twice}} = I\\end{gathered}',
        why: 'Shear then turn has columns (0, 1) and (−1, 1). Turn then shear has columns (1, 1) and (−1, 0). Different columns, different moves.',
        cue: 'When you see two moves swapped, think **check the order: it usually matters**.',
        use: 'In a game engine, “turn, then move forward” and “move forward, then turn” put a ship in different places.',
      },
    },
    { kind: 'scene', id: 'sensor', lines: S.sensor },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    { kind: 'scene', id: 'across', lines: S.across, setup: (g) => bridgeShot(g) },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    {
      kind: 'name', id: 'name-transpose', entry: {
        id: 'transpose', term: 'transpose', question: 'How does a matrix move across a dot product?', nodes: ['N14'],
        saw: 'Take $B$ with columns (1, 0) and (2, 1). The matrix that kept $(B\\mathbf x)\\cdot\\mathbf y = \\mathbf x\\cdot(M\\mathbf y)$ for 200 pairs had **the rows of $B$ as its columns**. For two moves in a row, the crossed-over matrices came in the other order.',
        means: 'A matrix can cross to the other arrow of a dot product if its rows are written as columns.',
        name: 'The **transpose** $A^T$ is $A$ with its rows written as columns. It is the matrix that moves to the other side of a dot product. A **symmetric matrix** equals its own transpose.',
        formula: '\\begin{gathered}(A\\mathbf x)\\cdot\\mathbf y = \\mathbf x\\cdot(A^T\\mathbf y) \\qquad (AB)^T = B^TA^T \\\\[6pt] \\begin{bmatrix}1&2\\\\0&1\\end{bmatrix}^T = \\begin{bmatrix}1&0\\\\2&1\\end{bmatrix}\\end{gathered}',
        why: 'A dot product is a row times a column: $\\mathbf u\\cdot\\mathbf v = \\mathbf u^T\\mathbf v$. Moving $A$ across, then $B$, gives $(AB\\mathbf x)\\cdot\\mathbf y = \\mathbf x\\cdot(B^TA^T\\mathbf y)$.',
        cue: 'When you see a matrix inside a dot product, think **move it across as its transpose**.',
        use: 'Training a neural network sends each error backwards through a layer with $W^T$.',
      },
    },
    { kind: 'scene', id: 'zero', lines: S.zero },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    { kind: 'scene', id: 'layers', lines: S.layers },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'scene', id: 'group', lines: S.group },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    {
      kind: 'name', id: 'name-associative', entry: {
        id: 'associative', term: 'associative', question: 'Does it matter which two moves you fuse first?', nodes: ['N14'],
        saw: 'Fusing the right-hand pair first and fusing the left-hand pair first left the grid in the same place.',
        means: 'Three moves done in order give the same result however you group them. Only the order of the moves matters.',
        name: 'The matrix product is **associative**: $(CB)A = C(BA)$.',
        formula: '(CB)A = C(BA) = CBA',
        why: 'Both groupings send $\\mathbf x$ through $A$, then $B$, then $C$: the same three moves in the same order.',
        cue: 'When you see a long product, think **group it any way you like, but keep the order**.',
        use: 'A renderer fuses a whole chain of moves once, then applies one matrix to every vertex.',
      },
    },
    { kind: 'scene', id: 'brief', lines: S.brief, setup: (g) => bridgeShot(g) },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-order', doubt: doubtOrder },
    { kind: 'doubt', id: 'd-group', doubt: doubtGroup },
    { kind: 'doubt', id: 'd-zero', doubt: doubtZero },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why-card', card: { kind: 'why', title: 'Why it matters', body: 'A graphics pipeline fuses its model, view and projection moves into **one matrix**, then moves every vertex once.\n\nStacked layers of a network with nothing between them fuse the same way: three layers of matrices are one matrix. That is why networks put a bend between layers. The fused forecast you are about to install does the same job for the pulse and the stabiliser.', cue: 'When you see **“do this, then that”**, think **multiply, first move on the right**.' } },
    { kind: 'build', id: 'build-matmul', build: buildMatmul },
    { kind: 'build', id: 'build-transpose', build: buildTranspose },
    { kind: 'cinematic', id: 'install', run: installFused },
  ],
};

export default ch;
