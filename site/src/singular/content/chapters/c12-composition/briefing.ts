// Chapter 12 Briefing (GDD §6.6 Ch 12): Say it, three Doubts (two false, one true), the Law, Ilse's page.
import type { CompareDef, DoubtDef, LawDef, PuzzleCtx, SayItDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { BuoyField } from '../../../gfx/buoys';
import { Dot } from '../../../gfx/markers';
import { VectorHandle } from '../../../kit/handle';
import { MatrixInput, Slider } from '../../../ui/widgets';
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { sfx } from '../../../audio/sfx';
import { rint } from '../../../game/lawcheck';
import { identity, matMul, matVec, type Mat } from '../../../math/la';
import { FlatGrid, ride, type MoveView } from '../c11-transformations/bench';
import { Gap } from '../c11-transformations/parts';
import { playRail } from './rail';
import { CARDS, d1Holds, d2Holds, d2Random, d3Holds, fmtN, fmtV, lawCore, PX, PY, shearBy, turnBy, type LawCase } from './logic';

const v3 = (v: readonly number[]): V3 => [v[0], v[1], v[2] ?? 0];
const fmtM = (M: Mat) => `[${M.map((r) => r.map(fmtN).join(', ')).join('; ')}]`;

function moveView(p: PuzzleCtx, withGrid = true): MoveView {
  const flat = new FlatGrid(p.g.stage, { extent: 9 });
  flat.show(false);
  p.add(flat);
  return { grid: withGrid ? p.grid({ base: 0.28, main: 0.45 }) : undefined, flat, g: p.g };
}
function floor(p: PuzzleCtx, n = 3): BuoyField {
  const pts: V3[] = [];
  for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) pts.push([a, b, 0]);
  const f = new BuoyField(p.g.stage, { points: pts, dims: 3, size: 0.045 });
  p.add(f);
  return f;
}

export const sayit: SayItDef = {
  id: 'c12', who: 'bram',
  ask: 'Why is column $j$ of $AB$ equal to $A$ times column $j$ of $B$?',
  frames: {
    see: 'I followed $\\mathbf e_1$ through ___, then ___. It ended at ___.',
    means: 'Column $j$ of $AB$ is where ___ ends up after ___, then ___.',
    called: 'Doing one move after another is ___. Its matrix is the ___.',
    cue: 'When you see “do this, then that”, think ___.',
  },
  wordBank: ['first', 'then', 'right-hand', 'column', 'lands', 'ends up', 'composition', 'matrix product', 'order matters'],
};

// ------------------------------------------------------------------ (F) shear then turn = turn then shear

export const doubtOrder: DoubtDef = {
  id: 'c12-d-order', who: 'bram', isTrue: false,
  claim: 'Shear then turn is the same as turn then shear. Same two moves, same place.',
  reason: 'The order changes the result. Take the shear with columns (1, 0), (1, 1) and the quarter turn. (1, 0) lands on (0, 1) one way and on (1, 1) the other. A few pairs agree, such as a half turn with anything, but not in general.',
  goal: 'Set the shear amount, the turn and a point. Both orders play. **Challenge it** (a case where they land apart) or **Back it** (a case where they agree).',
  view: '2d',
  setup(p) {
    p.g.stage.view2D({ center: [0.3, 0.5], height: 8, ms: 0 });
    const v = moveView(p);
    let k = 0, deg = 90;
    const pt = new VectorHandle(p, { to: [1, 0, 0], color: C.white, label: '$\\mathbf p$', snap: 0.5, limit: 3, planar: true, countMoves: false });
    const dots = [new Dot([0, 0, 0], { color: C.result, size: 0.11, label: 'shear, then turn', labelOffset: [0, -22] }), new Dot([0, 0, 0], { color: C.white, size: 0.1, label: 'turn, then shear', labelOffset: [0, 22] })];
    dots.forEach((d) => d.setOpacity(0));
    p.add(...dots);
    const gap = new Gap(p);
    const sk = new Slider({ label: 'shear amount', min: -2, max: 2, step: 0.5, value: k, onInput: (x) => { k = x; } });
    const st = new Slider({ label: 'turn (degrees)', min: 0, max: 180, step: 15, value: deg, onInput: (x) => { deg = x; }, format: (x) => `${x}°` });
    p.dock().append(sk.el, st.el);
    const cs = () => ({ k, deg, p: pt.vec.slice(0, 2) });
    return {
      holds: () => d1Holds(cs()),
      describe: () => {
        const c = cs();
        const a = matVec(matMul(turnBy(c.deg), shearBy(c.k)), c.p), b = matVec(matMul(shearBy(c.k), turnBy(c.deg)), c.p);
        return `shear ${fmtN(c.k)}, turn ${c.deg}°, point ${fmtV(c.p)}: shear then turn lands on ${fmtV(a)}, turn then shear on ${fmtV(b)}`;
      },
      async play() {
        const c = cs();
        gap.hide();
        dots.forEach((d) => d.setOpacity(0));
        const ms = p.g.headless ? 60 : 650;
        for (const [i, Ms] of [[0, [shearBy(c.k), turnBy(c.deg)]], [1, [turnBy(c.deg), shearBy(c.k)]]] as [number, Mat[]][]) {
          dots[i].at(v3(c.p)); dots[i].setOpacity(1);
          await playRail(v, null, Ms, { ms, riders: [ride(c.p, (q) => dots[i].at([q[0], q[1], 0.02]))] });
        }
        v.grid?.set(identity(2));
        const a = matVec(matMul(turnBy(c.deg), shearBy(c.k)), c.p), b = matVec(matMul(shearBy(c.k), turnBy(c.deg)), c.p);
        if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 0.05) gap.show(a, b, 'apart');
        sfx.snap();
      },
      randomize(r, edge) {
        if (edge === 0) { k = 0; deg = 60; pt.set([2, 1, 0], [0, 0, 0]); }
        else if (edge === 1) { k = 1.5; deg = 180; pt.set([1, 2, 0], [0, 0, 0]); }
        else {
          k = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2][rint(r, 0, 7)];
          deg = [30, 45, 60, 90, 120, 135, 150][rint(r, 0, 6)];
          let q: V3; do { q = [rint(r, -2, 2), rint(r, -2, 2), 0]; } while (q[0] === 0 && q[1] === 0);
          pt.set(q, [0, 0, 0]);
        }
        sk.set(k, false); st.set(deg, false);
      },
      edgeCases: 2,
      async showMe() { k = 1; deg = 90; sk.set(k, false); st.set(deg, false); await pt.moveTo([1, 0, 0], 400, [0, 0, 0]); },
    };
  },
};

// ------------------------------------------------------------------ (F) AB = 0 forces A or B to be zero

export const doubtZero: DoubtDef = {
  id: 'c12-d-zero', who: 'bram', isTrue: false,
  claim: 'If two moves in a row send everything to the origin, one of them must be the zero move.',
  reason: 'Flatten onto the x-axis, then onto the y-axis. Neither move is zero, yet every point ends at the origin. The first move puts everything on the line that the second one crushes.',
  goal: 'Type two moves: $B$ acts first, then $A$. **Challenge it** (two moves, neither zero, that send everything to the origin) or **Back it**.',
  view: '2d',
  setup(p) {
    p.g.stage.view2D({ center: [0.2, 0.9], height: 8, ms: 0 });
    const v = moveView(p);
    const f = floor(p, 3);
    let A: Mat = [[1, 0], [0, 1]], B: Mat = [[1, 0], [0, 1]];
    const inA = new MatrixInput({ rows: 2, cols: 2, values: A, label: 'A =', step: 1, colourCols: true, onChange: (m) => { A = m; } });
    const inB = new MatrixInput({ rows: 2, cols: 2, values: B, label: 'B =', step: 1, colourCols: true, onChange: (m) => { B = m; } });
    p.dock().appendChild(h('div', { style: 'display:flex;gap:14px;flex-wrap:wrap;align-items:center' }, inB.el, h('span', { class: 'c-muted' }, 'first, then'), inA.el));
    return {
      holds: () => d2Holds(A, B),
      describe: () => `B = ${fmtM(B)}, then A = ${fmtM(A)}: together ${fmtM(matMul(A, B))}`,
      async play() {
        f.set(identity(3));
        await playRail(v, null, [B, A], { ms: p.g.headless ? 60 : 900, riders: [(W) => f.set(W)] });
        sfx.snap();
      },
      randomize(r, edge) {
        [A, B] = edge === 0 ? [PY, PX] : d2Random(r);
        inA.set(A); inB.set(B);
      },
      edgeCases: 1,
      async showMe() { A = PY; B = PX; inA.set(A); inB.set(B); },
    };
  },
};

// ------------------------------------------------------------------ (T) grouping does not matter

export const doubtGroup: DoubtDef = {
  id: 'c12-d-group', who: 'bram', isTrue: true,
  claim: 'Three moves give the same result however you group them.',
  reason: 'Either grouping sends every point through A, then B, then C: the same three moves in the same order. So (CB)A and C(BA) are the same matrix, for any three matrices.',
  goal: 'Type any three moves ($A$ acts first). Bram fuses them both ways. **Back it** (he will shake it) or **Challenge it** (find three that group differently).',
  view: '2d',
  setup(p) {
    p.g.stage.view2D({ center: [0.2, 0.9], height: 8, ms: 0 });
    const v = moveView(p);
    const ghost = new FlatGrid(p.g.stage, { extent: 9, color: C.white, opacity: 0.22, axisColor: C.white, width: 1.4 });
    ghost.show(false);
    p.add(ghost);
    const Ms: Mat[] = [CARDS.shear.M, CARDS.turn.M, CARDS.stretch.M];
    const inputs = ['A =', 'B =', 'C ='].map((label, i) => new MatrixInput({ rows: 2, cols: 2, values: Ms[i], label, step: 1, colourCols: true, onChange: (m) => { Ms[i] = m; } }));
    p.dock().appendChild(h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' }, ...[...inputs].reverse().map((x) => x.el)));
    const e1 = new Arrow([0, 0, 0], [1, 0, 0], { color: C.v, width: 0.04 }), e2 = new Arrow([0, 0, 0], [0, 1, 0], { color: C.w, width: 0.04 });
    p.add(e1, e2);
    return {
      holds: () => d3Holds(Ms[0], Ms[1], Ms[2]),
      describe: () => `A = ${fmtM(Ms[0])}, B = ${fmtM(Ms[1])}, C = ${fmtM(Ms[2])}: (CB)A = ${fmtM(matMul(matMul(Ms[2], Ms[1]), Ms[0]))}, C(BA) = ${fmtM(matMul(Ms[2], matMul(Ms[1], Ms[0])))}`,
      async play() {
        const ms = p.g.headless ? 60 : 800;
        const rider = (W: Mat) => { e1.setTo([W[0][0], W[1][0], W[2][0]]); e2.setTo([W[0][1], W[1][1], W[2][1]]); };
        const left = await playRail(v, null, [Ms[0], matMul(Ms[2], Ms[1])], { ms, riders: [rider] });
        ghost.set(left); ghost.show(true);
        await playRail(v, null, [matMul(Ms[1], Ms[0]), Ms[2]], { ms, riders: [rider] });
        sfx.snap();
      },
      randomize(r, edge) {
        const edges: Mat[][] = [[[[1, 2], [2, 4]], CARDS.turn.M, CARDS.shear.M], [[[0, 0], [0, 0]], CARDS.flip.M, CARDS.stretch.M], [CARDS.flip.M, CARDS.flip.M, PX]];
        const pick = edge !== undefined ? edges[edge] : [0, 1, 2].map(() => [[rint(r, -1, 1), rint(r, -1, 1)], [rint(r, -1, 1), rint(r, -1, 1)]]);
        pick.forEach((M, i) => { Ms[i] = M; inputs[i].set(M); });
      },
      edgeCases: 3,
      async showMe() { [CARDS.shear.M, CARDS.turn.M, CARDS.stretch.M].forEach((M, i) => { Ms[i] = M; inputs[i].set(M); }); },
    };
  },
};

// ------------------------------------------------------------------ the Law

export const law: LawDef<LawCase> = {
  ...lawCore,
  frame: ['In $AB\\mathbf x$, ', { slot: 'first' }, ' moves the grid first, ', { slot: 'when' }, '.'],
  slots: {
    first: { options: [{ id: 'B', text: '$B$' }, { id: 'A', text: '$A$' }] },
    when: { options: [{ id: 'always', text: 'always' }, { id: 'turns', text: 'only when $A$ and $B$ are both turns' }] },
  },
  cadetSlots: ['first', 'when'],
  draw(g, c) {
    const bx = matVec(c.B, c.x), abx = matVec(c.A, bx), bax = matVec(c.B, matVec(c.A, c.x));
    g.stage.world.add(
      new Arrow([0, 0, 0], v3(c.x), { color: C.white, width: 0.04 }).object,
      new Arrow([0, 0, 0], v3(bx), { color: C.v, opacity: 0.7, width: 0.035 }).object,
      new Arrow([0, 0, 0], v3(abx), { color: C.result }).object,
      new Arrow([0, 0, 0], v3(bax), { color: C.orange, opacity: 0.6, width: 0.035 }).object,
    );
  },
  reason: {
    ask: 'Your Law survived. **Why** does $B$ act first in $AB\\mathbf x$?',
    options: [
      { id: 'a', text: '$AB\\mathbf x$ means $A(B\\mathbf x)$: $B$ sits next to $\\mathbf x$, so it moves $\\mathbf x$ first, and then $A$ moves the result.', right: true, why: 'Yes. The matrix next to $\\mathbf x$ acts first. That is why column $j$ of $AB$ is $A$ times column $j$ of $B$: $\\mathbf e_j$ goes to $\\mathbf b_j$ first.' },
      { id: 'b', text: 'We read left to right, so $A$ acts first.', right: false, why: 'Reading order is not acting order. Shear first, then turn, sent (1, 0) to (0, 1). Turn first, then shear, sent it to (1, 1). Only one of those is $AB$.' },
      { id: 'c', text: 'It does not matter which acts first.', right: false, why: 'It usually does. The shear and the quarter turn give different matrices in the two orders.' },
    ],
  },
};

export const compare: CompareDef = {
  id: 'c12',
  page: 'Doing one move after another is **composition**. Its matrix is the **matrix product**: in $AB$, $B$ acts first, because $AB\\mathbf x = A(B\\mathbf x)$.\n\nColumn $j$ of $AB$ is where $\\mathbf e_j$ ends up. $B$ sends it to $\\mathbf b_j$, and $A$ sends that to $A\\mathbf b_j$. Read one entry at a time, $(AB)_{ij}$ is row $i$ of $A$ dotted with column $j$ of $B$.\n\n**Order matters**: $AB$ and $BA$ usually differ. **Grouping does not**: $(CB)A = C(BA)$. The **transpose** $A^T$ writes rows as columns. It moves $A$ across a dot product, so $(AB)^T = B^TA^T$.',
  formula: '\\begin{gathered}(AB)\\mathbf x = A(B\\mathbf x) \\qquad \\text{column } j \\text{ of } AB = A\\mathbf b_j \\\\[6pt] (A\\mathbf x)\\cdot\\mathbf y = \\mathbf x\\cdot(A^T\\mathbf y)\\end{gathered}',
  keyIdeas: [
    'Did you say the right-hand matrix acts first?',
    'Did you say column $j$ of $AB$ is where $\\mathbf e_j$ ends up: $A$ applied to column $j$ of $B$?',
    'Did you say the order of two moves can change where the grid ends up?',
  ],
};

