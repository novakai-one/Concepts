// Chapter 11 Briefing (GDD §6.6 Ch 11): Say it, two Doubts (one false, one true), the Law, Ilse's page.
import type { CompareDef, DoubtDef, LawDef, SayItDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { Label } from '../../../gfx/label';
import { VectorHandle } from '../../../kit/handle';
import { C } from '../../../core/theme';
import { sfx } from '../../../audio/sfx';
import { rint } from '../../../game/lawcheck';
import { col, det, identity, matVec, type Mat } from '../../../math/la';
import { Bench2, FlatGrid, GREY, playMove, ride } from './bench';
import { floorBuoys } from './puzzles';
import { d1Holds, d1Predict, d2Holds, fmtV, lawCore, PULSE, type LawCase } from './logic';

const v3 = (v: readonly number[]): V3 => [v[0], v[1], v[2] ?? 0];
const emb = (W: Mat): Mat => [[W[0][0], W[0][1], 0], [W[1][0], W[1][1], 0], [0, 0, 1]];

export const sayit: SayItDef = {
  id: 'c11', who: 'bram',
  ask: 'Why do two arrows, where $\\mathbf e_1$ lands and where $\\mathbf e_2$ lands, fix the whole transformation? And what is $A\\mathbf e_2$, and why?',
  frames: {
    see: 'When I drag the tips of ___ and ___, the whole grid ___.',
    means: 'Every point is ___ of $\\mathbf e_1$ plus ___ of $\\mathbf e_2$, so it lands at ___.',
    called: 'This move is a ___. Its matrix has the ___ as columns.',
    cue: 'When you see a matrix, ask ___.',
  },
  wordBank: ['grid arrows', 'landing spots', 'columns', 'mix', 'origin', 'straight', 'evenly spaced', 'linear transformation', 'matrix', 'second column'],
};

// ------------------------------------------------------------------ (F) two buoys are not enough

/** A random move that keeps the grid's orientation (the Shake plays it smoothly). */
function randomMove(r: () => number): Mat {
  let M: Mat;
  do { M = [[rint(r, -2, 2), rint(r, -2, 2)], [rint(r, -2, 2), rint(r, -2, 2)]]; } while (det(M) < 1);
  return M;
}

export const doubtTwo: DoubtDef = {
  id: 'c11-d-two', who: 'bram', isTrue: false,
  claim: 'Two buoys can’t tell you where every buoy goes. You’d need to watch them all.',
  reason: 'Two buoys that point different ways fix every buoy. Every buoy is a mix of those two. A pulse keeps the mix, so each buoy lands at the same mix of their landing spots. Only two buoys on one line through the origin leave the rest unknown.',
  goal: 'Drag the **green** and **red** arrows to tag two buoys. LANTERN predicts every other buoy from those two landings, then the pulse fires. **Challenge it** (two buoys that do fix everything) or **Back it** (two that do not).',
  view: '2d',
  setup(p) {
    p.g.stage.view2D({ center: [0.4, 0.3], height: 10, ms: 0 });
    const grid = p.grid({ base: 0.25, main: 0.4 });
    const flat = new FlatGrid(p.g.stage, { extent: 9 });
    flat.show(false);
    p.add(flat);
    const buoys = floorBuoys(p, 4, 0.045);
    const ghosts = floorBuoys(p, 4, 0.085);
    ghosts.clearHighlights();
    ghosts.highlight([...ghosts.base.keys()], C.result, 0.15);
    ghosts.object.visible = false;
    let A: Mat = PULSE;
    const u = new VectorHandle(p, { to: [1, 0, 0], color: C.v, label: '$\\mathbf u$', snap: 1, planar: true, limit: 3, countMoves: false });
    const w = new VectorHandle(p, { to: [0, 1, 0], color: C.w, label: '$\\mathbf w$', snap: 1, planar: true, limit: 3, countMoves: false });
    const note = new Label('', [0, -3.6, 0], { className: 'coord' });
    p.add(note.object);
    p.onDispose(() => note.dispose());
    const cs = () => ({ u: u.vec.slice(0, 2), w: w.vec.slice(0, 2), A, x: [0, 0] });
    return {
      holds: () => d1Holds(cs()),
      describe: () => {
        const c = cs();
        return d1Holds(c)
          ? `buoys ${fmtV(c.u)} and ${fmtV(c.w)} are on one line through the origin, so buoys off that line are not predicted`
          : `buoys ${fmtV(c.u)} and ${fmtV(c.w)} point different ways, and every buoy landed on the spot predicted from their two landings`;
      },
      async play() {
        const c = cs();
        grid.set(identity(2)); buoys.set(identity(3));
        ghosts.object.visible = false;
        note.set('');
        // predicted spots for every buoy from the two landings (when they point different ways)
        if (!d1Holds(c)) {
          // each ghost sits where LANTERN predicts that buoy lands, from the two tagged landings only
          const pred = ghosts.base.map((q) => d1Predict({ ...c, x: [q[0], q[1]] })!);
          ghosts.set(emb(A));
          ghosts.object.visible = pred.every((q, i) => Math.hypot(q[0] - ghosts.pos(i)[0], q[1] - ghosts.pos(i)[1]) < 1e-6);
          note.set('yellow: predicted from the two tagged landings only');
        } else note.set('one line through the origin: buoys off it are not predicted');
        await playMove({ grid, flat, g: p.g }, A, identity(2), p.g.headless ? 200 : 1300, [(W) => buoys.set(W)], false);
        sfx.snap();
      },
      randomize(r, edge) {
        if (edge === 0) { u.set([1, 1, 0], [0, 0, 0]); w.set([2, 2, 0], [0, 0, 0]); A = PULSE; return; }
        let a: V3, b: V3;
        do { a = [rint(r, -3, 3), rint(r, -3, 3), 0]; b = [rint(r, -3, 3), rint(r, -3, 3), 0]; } while ((a[0] === 0 && a[1] === 0) || (b[0] === 0 && b[1] === 0) || Math.abs(a[0] * b[1] - a[1] * b[0]) < 1);
        u.set(a, [0, 0, 0]); w.set(b, [0, 0, 0]);
        A = randomMove(r);
      },
      edgeCases: 1,
      async showMe() { A = PULSE; u.set([1, 0, 0], [0, 0, 0]); await w.moveTo([0, 1, 0], 400, [0, 0, 0]); },
    };
  },
};

// ------------------------------------------------------------------ (T) the point under the Anchor never moves

export const doubtOrigin: DoubtDef = {
  id: 'c11-d-origin', who: 'bram', isTrue: true,
  claim: 'No pulse can ever move the point under the Anchor.',
  reason: 'A pulse is a linear transformation. The origin is 0 of $\\mathbf e_1$ plus 0 of $\\mathbf e_2$. So it lands on 0 of each landing spot: the origin. That holds for every matrix, even one that flattens the grid.',
  goal: 'Set any pulse on the bench: drag the column tips anywhere. **Back it** (Bram shakes the bench) or **Challenge it** (find a pulse that moves the white buoy).',
  view: '2d',
  setup(p) {
    p.g.stage.view2D({ center: [0.4, 0.3], height: 10, ms: 0 });
    const bench = new Bench2(p, { M: PULSE, draggable: true, grey: true, live: false, snap: 0.5, limit: 3 });
    const buoys = floorBuoys(p, 4, 0.045);
    const o = buoys.indexOf([0, 0, 0]);
    buoys.highlight([o], C.white, 1);
    const tag = new Label('under the Anchor', [0, -0.45, 0], { className: 'coord' });
    p.add(tag.object);
    p.onDispose(() => tag.dispose());
    const ring = new Dot([0, 0, 0.02], { color: C.white, size: 0.16, glow: 0.4 });
    ring.setOpacity(0.35);
    p.add(ring);
    const greys = bench.greys;
    void greys;
    return {
      holds: () => d2Holds({ A: bench.get() }),
      describe: () => {
        const M = bench.get();
        return `columns ${fmtV(col(M, 0))} and ${fmtV(col(M, 1))}: the buoy under the Anchor landed on ${fmtV(matVec(M, [0, 0]))}`;
      },
      async play() {
        const M = bench.get();
        bench.grid.set(identity(2)); buoys.set(identity(3));
        await playMove({ grid: bench.grid, flat: bench.flat, g: p.g }, M, identity(2), p.g.headless ? 200 : 1300, [(W) => buoys.set(W), ride([0, 0], (q) => tag.at([q[0], q[1] - 0.45, 0]))], false);
        sfx.snap();
      },
      randomize(r, edge) {
        const edges: Mat[] = [[[0, 0], [0, 0]], [[1, 2], [2, 4]], [[0, 1], [1, 0]], [[-1, 0], [0, -1]]];
        if (edge !== undefined) { bench.set(edges[edge]); return; }
        bench.set([[rint(r, -6, 6) / 2, rint(r, -6, 6) / 2], [rint(r, -6, 6) / 2, rint(r, -6, 6) / 2]]);
      },
      edgeCases: 4,
      async showMe() { await bench.to(PULSE, 500); },
    };
  },
};

// ------------------------------------------------------------------ the Law

export const law: LawDef<LawCase> = {
  ...lawCore,
  frame: ['The ', { slot: 'part' }, ' of $A$ are where $\\mathbf e_1$ and $\\mathbf e_2$ land, ', { slot: 'when' }, '.'],
  slots: {
    part: { options: [{ id: 'cols', text: 'columns' }, { id: 'rows', text: 'rows' }] },
    when: {
      options: [
        { id: 'always', text: 'always' },
        { id: 'turn', text: 'exactly when the grid turns' },
        { id: 'kept', text: 'exactly when nothing is flattened' },
      ],
    },
  },
  cadetSlots: ['part', 'when'],
  draw(g, c) {
    const A = c.A;
    g.stage.world.add(
      new Arrow([0, 0, 0], [1, 0, 0], { color: GREY, width: 0.03, glow: 0.4 }).object,
      new Arrow([0, 0, 0], [0, 1, 0], { color: GREY, width: 0.03, glow: 0.4 }).object,
      new Arrow([0, 0, 0], v3(col(A, 0)), { color: C.v }).object,
      new Arrow([0, 0, 0], v3(col(A, 1)), { color: C.w }).object,
      new Arrow([0, 0, 0], v3(A[0]), { color: C.white, opacity: 0.45, width: 0.03 }).object,
      new Arrow([0, 0, 0], v3(A[1]), { color: C.white, opacity: 0.45, width: 0.03 }).object,
    );
  },
  reason: {
    ask: 'Your Law survived. **Why** is the first column always where $\\mathbf e_1$ lands?',
    options: [
      { id: 'a', text: '$\\mathbf e_1 = (1, 0)$ is 1 of the first grid arrow and 0 of the second. So it lands on the first column.', right: true, why: 'Yes. $A\\mathbf e_1$ mixes the columns with weights 1 and 0, which picks out the first column whole. The same goes for $\\mathbf e_2$ and the second column.' },
      { id: 'b', text: 'Matrices are read row by row, so the first row comes first.', right: false, why: 'Reading order does not move points. For the shear with columns (1, 0) and (1, 1), $\\mathbf e_1$ lands on (1, 0), the first column. The first row is (1, 1).' },
      { id: 'c', text: 'Because the grid arrows are at right angles.', right: false, why: 'Right angles are not needed. The bench sheared and flattened the grid, and the columns were still the landing spots.' },
    ],
  },
};

export const compare: CompareDef = {
  id: 'c11',
  page: 'A **linear transformation** moves every point at once. It keeps the origin fixed and keeps grid lines straight, parallel and evenly spaced.\n\nEvery point is a mix of the grid arrows: $\\mathbf x = x_1\\mathbf e_1 + x_2\\mathbf e_2$. The move keeps sums and stretches, so $\\mathbf x$ lands on $x_1 T(\\mathbf e_1) + x_2 T(\\mathbf e_2)$. **Two landing spots fix every point.**\n\nThe **matrix** writes the landing spots as its columns. $A\\mathbf x$ is the mix of the columns with the numbers of $\\mathbf x$ as weights. Entry $i$ of $A\\mathbf x$ is row $i$ dotted with $\\mathbf x$. So $A\\mathbf e_2$ is the second column.',
  formula: 'A\\mathbf x = x_1\\cg{\\mathbf a_1} + x_2\\cr{\\mathbf a_2} \\qquad A\\mathbf e_2 = \\cr{\\mathbf a_2}',
  keyIdeas: [
    'Did you say the origin stays fixed and grid lines stay straight, parallel and evenly spaced?',
    'Did you say every point is a mix of $\\mathbf e_1$ and $\\mathbf e_2$, so it lands at the same mix of their landing spots?',
    'Did you say the columns of the matrix are the landing spots, so $A\\mathbf e_2$ is the second column?',
  ],
};

