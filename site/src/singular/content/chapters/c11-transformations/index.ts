// Chapter 11: "Where does a matrix send each vector?" (GDD §6.6, nodes N12 and N13).
// Games 1–3 (apply.ts): A v = ?, find A, is there a matrix? Ten typed rounds each, then the name
// "linear transformation". Then the spire clue, A x both ways, Ilse's nine numbers as columns,
// the Briefing, and the pulse-forecast install.
import type { ChapterDef, Game } from '../../../game/types';
import { answer, pin } from '../../../game/caseboard';
import { glowSprite } from '../../../gfx/markers';
import { BuoyField } from '../../../gfx/buoys';
import { sfx } from '../../../audio/sfx';
import { bridgeShot, shipExterior } from '../../common/shots';
import { makeAnchor } from '../../common/set';
import { coldOpen, fourPulses, installForecast, spireScene } from './cine';
import { p4, p5, p6, p7 } from './puzzles';
import { p1, p2, p3 } from './apply';
import { sayit, doubtTwo, doubtOrigin, law, compare } from './briefing';
import { buildMatvec } from './build';
import { S } from './script';

/** The Anchor seen from above, the light at the origin, the ground layer around it. */
async function originShot(g: Game): Promise<void> {
  const b = new BuoyField(g.stage, { extent: 6, size: 0.045 });
  g.stage.world.add(b.object);
  const a = await makeAnchor(g.stage, 0.5);
  a.position.z = 0.1;
  const lamp = glowSprite('#fff4d6', 1.4, 0.9);
  lamp.position.set(0, 0, 0.05);
  g.stage.world.add(lamp);
  b.highlight([b.indexOf([0, 0, 0])], '#fff4d6', 1);
  await g.stage.view3D({ target: [0, 0, 0.4], distance: 9, azimuth: -100, elevation: 48, orbit: false, ms: 0 });
}

async function caseLinear(g: Game): Promise<void> {
  await originShot(g);
  await g.say(S.caseLinear.slice(0, 2), {
    onLine: (_l, i) => {
      if (i !== 1) return;
      answer('linear', 'Each pulse is a **linear transformation**. The origin is no steps along either grid arrow, so it lands on the origin: $A\\mathbf 0 = \\mathbf 0$ for every matrix. Straight lines stay straight because every point lands at the same mix of the landing spots.', 'c11');
      g.toast('Why did everything move except the point under the Anchor?', 'Case board · answered');
      sfx.discover();
    },
  });
  await g.say(S.caseLinear.slice(2));
}

async function clueAndFourth(g: Game): Promise<void> {
  await shipExterior(g, { anchor: true, ark: true });
  await g.say(S.clue.slice(0, 2), {
    onLine: (_l, i) => {
      if (i !== 1) return;
      if (pin('spires', 'Why did the prediction from the spires miss when the volume prediction matched?', 'c11')) g.toast('Why did the prediction from the spires miss when the volume prediction matched?', 'Case board');
      sfx.discover();
    },
  });
  await g.say(S.clue.slice(2));
  await fourPulses(g);
  await g.say(S.fourth, {
    onLine: (_l, i) => {
      if (i !== 2) return;
      if (pin('fourth', 'Why does every fourth pulse bring the ground layer home?', 'c11')) g.toast('Why does every fourth pulse bring the ground layer home?', 'Case board');
      sfx.discover();
    },
  });
}

async function nineAnswered(g: Game): Promise<void> {
  answer('nine', 'Three landing spots, one per spire, read as columns: a quarter turn of the grid. **Still open:** the measured pulse also leans the grid, so it is not the same move.', 'c11');
  g.toast('What do Ilse’s nine numbers mean? (in part)', 'Case board');
}

const ch: ChapterDef = {
  id: 'c11',
  act: 4,
  num: 11,
  title: 'Where does a matrix send each vector?',
  subtitle: 'Matrices as moves of the plane',
  nodes: ['N12', 'N13'],
  palette: 'violet',
  music: 'tension',
  prereqs: ['c02', 'c08'],
  calm: true,
  catchup: 'A **linear combination** of two vectors is so much of the first plus so much of the second, added tip to tail: $2\\begin{bmatrix}1\\\\3\\end{bmatrix} + 1\\begin{bmatrix}2\\\\-1\\end{bmatrix} = \\begin{bmatrix}4\\\\5\\end{bmatrix}$.',
  inShort: 'Where does a matrix $A$ send each vector $\\mathbf v$?',
  script: S,
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'Where does a matrix send each vector?', body: '**Where does a matrix $A$ send each vector $\\mathbf v$?**\n\nType $A\\mathbf v$, apply $A$, and watch the grid move.' } },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    {
      kind: 'name', id: 'name-linear', entry: {
        id: 'linear-transformation', term: 'linear transformation', question: 'Which moves are matrices?', nodes: ['N12'],
        saw: '$A\\begin{bmatrix}1\\\\0\\end{bmatrix}$ was column 1 of $A$ and $A\\begin{bmatrix}0\\\\1\\end{bmatrix}$ was column 2. Every $A\\mathbf v$ was $v_1$ of column 1 plus $v_2$ of column 2. A move that shifted $\\mathbf 0$, or bent the grid, had no matrix.',
        means: 'A matrix moves sums to sums and multiples to multiples. Two columns fix every point.',
        name: 'A **linear transformation** $T$ has $T(\\mathbf x + \\mathbf y) = T(\\mathbf x) + T(\\mathbf y)$ and $T(k\\mathbf x) = kT(\\mathbf x)$. Its **matrix** has columns $T(\\mathbf e_1)$ and $T(\\mathbf e_2)$, where $\\mathbf e_1 = \\begin{bmatrix}1\\\\0\\end{bmatrix}$, $\\mathbf e_2 = \\begin{bmatrix}0\\\\1\\end{bmatrix}$ are the **standard basis vectors**.',
        formula: 'A\\mathbf v = v_1\\,\\cg{T(\\mathbf e_1)} + v_2\\,\\cr{T(\\mathbf e_2)}',
        use: '3-D graphics turn, stretch and shear every vertex of a model with one matrix.',
      },
    },
    { kind: 'cinematic', id: 'case', run: caseLinear },
    { kind: 'scene', id: 'spires', lines: S.spires, setup: (g) => spireScene(g) },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    { kind: 'cinematic', id: 'clue', run: clueAndFourth },
    { kind: 'scene', id: 'sensor', lines: S.sensor },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    {
      kind: 'name', id: 'name-product', entry: {
        id: 'matrix-vector-product', term: 'matrix–vector product', question: 'Where does this one point land?', nodes: ['N13'],
        saw: 'The sensor’s rule had 2 rows and 3 columns. The weights (3, 1, 2) took 3 of the first column, 1 of the second and 2 of the third. Tip to tail they reached **(7, −1)**. Row by row gave the same: $(1, 0, 2)\\cdot(3, 1, 2) = 7$ and $(0, 1, -1)\\cdot(3, 1, 2) = -1$.',
        means: 'It is one sum, read two ways. Down the columns: a mix of the columns, with the numbers of $\\mathbf x$ as weights. Across the rows: entry $i$ is row $i$ dotted with $\\mathbf x$.',
        name: 'The **matrix–vector product** $A\\mathbf x$ is that mix of the columns of $A$. An $m \\times n$ matrix has $m$ rows and $n$ columns; $m \\times n$ is its **size**. It takes $\\mathbf x$ with $n$ numbers and returns $m$ numbers. The **matrix equation** $A\\mathbf x = \\mathbf b$ asks which weights on the columns reach $\\mathbf b$.',
        formula: 'A\\mathbf x = x_1\\cg{\\mathbf a_1} + x_2\\cr{\\mathbf a_2} + x_3\\cb{\\mathbf a_3} \\qquad (A\\mathbf x)_i = (\\text{row } i)\\cdot\\mathbf x',
        why: 'Write the column sum one entry at a time. Entry $i$ is $a_{i1}x_1 + a_{i2}x_2 + a_{i3}x_3$, which is row $i$ dotted with $\\mathbf x$.',
        cue: 'When you see $A\\mathbf x$, think **mix the columns, with the numbers of $\\mathbf x$ as weights**.',
        use: 'One layer of a neural network computes $W\\mathbf x$. Each output mixes the columns of $W$, weighted by the inputs.',
      },
    },
    { kind: 'scene', id: 'nine', lines: S.nine },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'cinematic', id: 'nine-case', run: nineAnswered },
    { kind: 'scene', id: 'kinds', lines: S.kinds },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    {
      kind: 'name', id: 'name-kinds', entry: {
        id: 'standard-moves', term: 'standard move matrices', question: 'Which moves can two columns make?', nodes: ['N12'],
        saw: 'The 30° turn sent $\\mathbf e_1$ to (0.866, 0.5). The flip over $y = x$ swapped the grid arrows. Flattening onto the $x$-axis sent $\\mathbf e_2$ to the origin.',
        means: 'Find where the grid arrows land and the matrix writes itself.',
        name: 'A **rotation matrix** turns the grid by an angle. A **reflection matrix** flips it over a line. A **shear matrix** slides lines along themselves, like (1, 0), (1, 1). A **scaling matrix** stretches each axis. A **projection matrix** drops every point straight onto a line. Points already on the line stay where they are, so doing it twice changes nothing.',
        formula: '\\begin{gathered} \\text{turn by } \\theta: \\begin{bmatrix} \\cg{\\cos\\theta} & \\htmlClass{c-red}{-\\sin\\theta} \\\\ \\cg{\\sin\\theta} & \\htmlClass{c-red}{\\cos\\theta} \\end{bmatrix} \\qquad \\text{flip over } y = x: \\begin{bmatrix} \\cg{0} & \\htmlClass{c-red}{1} \\\\ \\cg{1} & \\htmlClass{c-red}{0} \\end{bmatrix} \\\\ \\text{onto the } x\\text{-axis}: \\begin{bmatrix} \\cg{1} & \\htmlClass{c-red}{0} \\\\ \\cg{0} & \\htmlClass{c-red}{0} \\end{bmatrix} \\end{gathered}',
        why: 'Turning $\\mathbf e_1 = (1, 0)$ by $\\theta$ lands it on $(\\cos\\theta, \\sin\\theta)$; turning $\\mathbf e_2$ lands it on $(-\\sin\\theta, \\cos\\theta)$.',
        cue: 'When you see a described move, think **where do $\\mathbf e_1$ and $\\mathbf e_2$ go?**',
        use: 'Training images are turned, flipped and sheared with these matrices to make more examples.',
      },
    },
    { kind: 'scene', id: 'brief', lines: S.brief, setup: (g) => bridgeShot(g) },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-two', doubt: doubtTwo },
    { kind: 'doubt', id: 'd-origin', doubt: doubtOrigin },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why-card', card: { kind: 'why', title: 'Why it matters', body: 'One layer of a neural network computes $W\\mathbf x$: the input $\\mathbf x$ mixes the columns of $W$. A network stacks many such layers.\n\nThe pulse forecast is the same product, run on every buoy at once. Write `matvec` and the forecast runs on yours.', cue: 'When you see a **matrix**, ask **where do the grid arrows land?**' } },
    { kind: 'build', id: 'build-matvec', build: buildMatvec },
    { kind: 'cinematic', id: 'install', run: installForecast },
  ],
};

export default ch;
