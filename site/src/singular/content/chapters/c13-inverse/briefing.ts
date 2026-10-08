// Chapter 13 Briefing (GDD §6.6 Ch 13): Say it, three Doubts (two false, one true, shown mixed), the
// Law, LANTERN's Procedure for [A | I], and Ilse's page.
import type { CompareDef, DoubtDef, Game, LawDef, ProcedureDef, PuzzleCtx, SayItDef, V3 } from '../../../game/types';
import { Label } from '../../../gfx/label';
import { MatrixInput } from '../../../ui/widgets';
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { Grid2D } from '../../../gfx/grid';
import { FatSegments } from '../../../gfx/lines';
import { rint } from '../../../game/lawcheck';
import { det, identity, inverse, matMul, type Mat } from '../../../math/la';
import { fnum } from '../../../math/frac';
import { VectorHandle } from '../../../kit/handle';
import { FlatGrid, playMove } from './play';
import { FramePlan, BOW_CORNERS, PLAN_COLOR } from './frames';
import {
  flipCanUndo, fmtN, inverseOfProductClaim, lawCore, nonzeroHasUndo, PROC_A, runProcedure, texM, type InvCase,
} from './logic';
import { landingLineColour } from './puzzles';

const rows2 = (M: Mat) => `rows ${M.map((r) => `(${r.map(fmtN).join(', ')})`).join(' and ')}`;

export const sayit: SayItDef = {
  id: 'c13', who: 'bram',
  ask: 'Why does $(AB)^{-1}$ reverse the order?',
  frames: {
    see: 'The frame took ___ first and ___ second. The undo that worked took off ___ first.',
    means: 'The move done last is undone ___, because ___.',
    called: 'The move that sends every point back is called the ___.',
    cue: 'When you need to go back, think ___, and first check that ___.',
  },
  wordBank: ['turn', 'shear', 'first', 'last', 'undo', 'inverse', 'ghost', 'flattened', 'two points on one spot', 'identity'],
};

// ------------------------------------------------------------------ a shared holotable scene: one 2×2 move, its frames, its columns

interface MoveScene {
  M(): Mat;
  set(M: Mat): void;
  /** Play M on the frames from the as-built plan, honestly; then (optional) play U after it. */
  play(U?: Mat | null): Promise<Mat>;
}

function moveScene(p: PuzzleCtx, M0: Mat, label = 'M'): MoveScene {
  p.g.stage.view2D({ center: [0.4, 0.3], height: 9.5, ms: 0 });
  const grid = p.grid({ base: 0.42, main: 0.55, axis: 0.55 });
  landingLineColour(grid);
  const flat = new FlatGrid(p.g.stage);
  const ghost = new FramePlan(p.g.stage, { color: '#8fa3c4', opacity: 0.55, fill: 0, dashed: true, width: 1.6 }, 0.004);
  const plan = new FramePlan(p.g.stage, {}, 0.01);
  p.add(flat, ghost, plan);
  ghost.set(identity(2));
  let M = M0.map((r) => r.slice());
  const r = p.readout('The move');
  const show = () => { r.row('M', `$${label}$`, `$${texM(M)}$`); grid.set(M); plan.set(M); plan.setColor(PLAN_COLOR); };
  const input = new MatrixInput({ rows: 2, cols: 2, values: M, colourCols: true, label: `${label} =`, step: 1, onChange: (m) => { M = m; c1.arrow.setTo([m[0][0], m[1][0], 0]); c2.arrow.setTo([m[0][1], m[1][1], 0]); show(); } });
  const mk = (j: 0 | 1, color: string) => new VectorHandle(p, {
    to: [M[0][j], M[1][j], 0], color, snap: p.snap() ?? 0.5, planar: true, limit: 4, countMoves: false,
    onChange: (t) => { M[0][j] = t[0]; M[1][j] = t[1]; input.set(M); show(); },
  });
  const c1 = mk(0, C.v), c2 = mk(1, C.w);
  p.dock().append(h('div', { class: 'kicker' }, 'Drag the column tips or type the move'), input.el);
  show();
  return {
    M: () => M.map((x) => x.slice()),
    set(X: Mat) { M = X.map((x) => x.slice()); input.set(M); c1.arrow.setTo([M[0][0], M[1][0], 0]); c2.arrow.setTo([M[0][1], M[1][1], 0]); show(); },
    async play(U?: Mat | null) {
      const view = { g: p.g, grid, flat };
      grid.set(identity(2)); plan.set(identity(2));
      let W = await playMove(view, M, identity(2), 700, [(X) => plan.set(X)], false);
      if (U) { await wait(120); W = await playMove(view, U, W, 700, [(X) => plan.set(X)], false); }
      const home = Math.max(...BOW_CORNERS.map((c) => Math.hypot(W[0][0] * c[0] + W[0][1] * c[1] - c[0], W[1][0] * c[0] + W[1][1] * c[1] - c[1])));
      plan.setColor(U && home < 1e-6 ? C.good : PLAN_COLOR);
      return W;
    },
  };
}

// ------------------------------------------------------------------ (F) Every matrix that is not all zeros has an undo

export const doubtNonzero: DoubtDef = {
  id: 'c13-d-nonzero', who: 'bram', isTrue: false,
  claim: 'Every matrix that is not all zeros has an undo.',
  reason: 'A matrix can have non-zero entries and still flatten the plane. $\\begin{bmatrix}1 & 0\\\\ 0 & 0\\end{bmatrix}$ sends $(3, 1)$ and $(3, -2)$ both to $(3, 0)$. No move can send $(3, 0)$ back to two places, so there is no undo.',
  goal: 'Set a move with at least one non-zero entry. **Challenge it** (a move with no undo) or **Back it** (Bram will shake it).',
  view: '2d',
  setup(p) {
    const sc = moveScene(p, [[2, 1], [1, 1]]);
    return {
      holds: () => nonzeroHasUndo(sc.M()),
      describe: () => {
        const M = sc.M();
        if (M.every((r) => r.every((x) => Math.abs(x) < 1e-9))) return `M with ${rows2(M)}: it is all zeros, so it flattens everything to one point. The claim is only about moves that are not all zeros, so it says nothing here`;
        return `M with ${rows2(M)}: ${Math.abs(det(M)) < 1e-9 ? 'the grid is flattened to a line, so two points land on one spot and nothing undoes it' : 'no two points land together, and it has an undo'}`;
      },
      async play() { const U = inverse(sc.M()); await sc.play(U && Math.abs(det(sc.M())) > 1e-9 ? U : null); },
      randomize(r, edge) {
        const edges: Mat[] = [[[1, 0], [0, 0]], [[1, 2], [2, 4]], [[3, -3], [-1, 1]]];
        if (edge !== undefined) { sc.set(edges[edge]); return; }
        let M: Mat;
        do { M = [[rint(r, -3, 3), rint(r, -3, 3)], [rint(r, -3, 3), rint(r, -3, 3)]]; } while (M.every((x) => x.every((y) => y === 0)));
        sc.set(M);
      },
      edgeCases: 3,
      async showMe() { sc.set([[1, 0], [0, 0]]); await wait(200); },
    };
  },
};

// ------------------------------------------------------------------ (F) (AB)⁻¹ = A⁻¹B⁻¹

export const doubtOrder: DoubtDef = {
  id: 'c13-d-order', who: 'bram', isTrue: false,
  claim: 'The undo of $AB$ is $A^{-1}B^{-1}$. Undo each move and keep the order.',
  reason: 'In $AB$ the move $B$ acts first and $A$ last. The move done last comes off first: $(AB)^{-1} = B^{-1}A^{-1}$, which undoes $A$ first. The claim writes $A^{-1}B^{-1}$, which undoes $B$ first, and that only works when $A$ and $B$ give the same result in either order.',
  goal: 'Set two moves $A$ and $B$. **Challenge it** (a pair where undoing $B$ first, then $A$, leaves the frames off their ghost) or **Back it** (Bram will shake it).',
  view: '2d',
  setup(p) {
    p.g.stage.view2D({ center: [0.4, 0.3], height: 10, ms: 0 });
    const grid = p.grid({ base: 0.42, main: 0.55, axis: 0.55 });
    landingLineColour(grid);
    const flat = new FlatGrid(p.g.stage);
    const ghost = new FramePlan(p.g.stage, { color: '#8fa3c4', opacity: 0.55, fill: 0, dashed: true, width: 1.6 }, 0.004);
    const plan = new FramePlan(p.g.stage, {}, 0.01);
    const gap = new FatSegments(p.g.stage, [], { color: C.orange, width: 2, opacity: 0.9, dashed: true });
    gap.setOpacity(0);
    p.add(flat, ghost, plan, gap.object);
    p.onDispose(() => gap.dispose());
    ghost.set(identity(2));
    let A: Mat = [[1, 1], [0, 1]], B: Mat = [[0, -1], [1, 0]];
    const r = p.readout('The pair');
    const ia = new MatrixInput({ rows: 2, cols: 2, values: A, colourCols: true, label: 'A =', step: 1, onChange: (m) => { A = m; show(); } });
    const ib = new MatrixInput({ rows: 2, cols: 2, values: B, colourCols: true, label: 'B =', step: 1, onChange: (m) => { B = m; show(); } });
    const show = () => {
      const AB = matMul(A, B);
      grid.set(AB); plan.set(AB); plan.setColor(PLAN_COLOR); gap.setOpacity(0);
      r.row('AB', '$AB$ ($B$ first)', `$${texM(AB)}$`);
      const iA = inverse(A), iB = inverse(B);
      r.row('claim', 'claimed undo $A^{-1}B^{-1}$', iA && iB ? `$${texM(matMul(iA, iB).map((x) => x.map((y) => Math.round(y * 100) / 100)))}$` : 'no undo for one of them');
    };
    p.dock().append(h('div', { class: 'kicker' }, 'Two moves (each needs an undo)'), h('div', { style: 'display:flex;gap:14px;flex-wrap:wrap' }, ia.el, ib.el));
    show();
    const setPair = (a: Mat, b: Mat) => { A = a; B = b; ia.set(a); ib.set(b); show(); };
    return {
      holds: () => inverseOfProductClaim(A, B),
      describe: () => {
        const noA = !inverse(A) || Math.abs(det(A)) < 1e-9, noB = !inverse(B) || Math.abs(det(B)) < 1e-9;
        const head = `A with ${rows2(A)}, B with ${rows2(B)}`;
        if (noA || noB) return `${head}: ${noA && noB ? 'neither has an undo' : noA ? 'A has no undo' : 'B has no undo'}, so the claim (which needs both undos) says nothing about this pair`;
        return `${head}: ${inverseOfProductClaim(A, B) ? 'undoing B first, then A, happens to work here' : 'undoing B first, then A, leaves the frames off their ghost'}`;
      },
      async play() {
        const iA = inverse(A), iB = inverse(B);
        if (!iA || !iB || Math.abs(det(A)) < 1e-9 || Math.abs(det(B)) < 1e-9) return;
        const view = { g: p.g, grid, flat };
        grid.set(identity(2)); plan.set(identity(2)); gap.setOpacity(0);
        let W = await playMove(view, matMul(A, B), identity(2), 650, [(X) => plan.set(X)], false);
        W = await playMove(view, matMul(iA, iB), W, 650, [(X) => plan.set(X)], false);
        const off = BOW_CORNERS.map((c) => [W[0][0] * c[0] + W[0][1] * c[1], W[1][0] * c[0] + W[1][1] * c[1]]);
        if (off.some((q, i) => Math.hypot(q[0] - BOW_CORNERS[i][0], q[1] - BOW_CORNERS[i][1]) > 1e-6)) {
          gap.setSegments(off.map((q, i) => [[q[0], q[1], 0.03], [BOW_CORNERS[i][0], BOW_CORNERS[i][1], 0.03]] as [V3, V3]));
          gap.setOpacity(0.9);
          sfx.miss();
        } else { plan.setColor(C.good); }
      },
      randomize(r, edge) {
        const edges: [Mat, Mat][] = [[[[1, 1], [0, 1]], [[0, -1], [1, 0]]], [[[2, 0], [0, 1]], [[1, 1], [0, 1]]]];
        if (edge !== undefined) { setPair(...edges[edge]); return; }
        const inv = (): Mat => { let M: Mat; do { M = [[rint(r, -2, 2), rint(r, -2, 2)], [rint(r, -2, 2), rint(r, -2, 2)]]; } while (Math.abs(det(M)) < 1e-9); return M; };
        setPair(inv(), inv());
      },
      edgeCases: 2,
      async showMe() { setPair([[1, 1], [0, 1]], [[0, -1], [1, 0]]); await wait(200); },
    };
  },
};

// ------------------------------------------------------------------ (T) A move that flips the grid over can still be undone

export const doubtFlip: DoubtDef = {
  id: 'c13-d-flip', who: 'bram', isTrue: true,
  claim: 'A move that flips the grid over can still be undone.',
  reason: 'Turning the grid over does not put two points on one spot: the frames come out mirrored, not flattened. So every landing spot came from one start, and the move that sends each spot back is the undo. A flip over $y = x$ is its own undo.',
  goal: 'Set a move that turns the frames over (the hangar door ends up on the other side). **Back it** (Bram plays its undo and shakes it) or **Challenge it** (find a flip with no undo).',
  view: '2d',
  setup(p) {
    const sc = moveScene(p, [[0, 1], [1, 0]]);
    return {
      holds: () => flipCanUndo(sc.M()),
      describe: () => {
        const M = sc.M(), d = det(M);
        return `M with ${rows2(M)}: ${d < -1e-9 ? 'it turns the frames over, and its undo brings them back' : d > 1e-9 ? 'it does not turn the frames over' : 'it flattens the plane, which is not a flip'}`;
      },
      async play() {
        const M = sc.M();
        const U = Math.abs(det(M)) > 1e-9 ? inverse(M) : null;
        await sc.play(det(M) < 0 ? U : null);
      },
      randomize(r, edge) {
        const edges: Mat[] = [[[0, 1], [1, 0]], [[-1, 0], [0, 1]], [[1, 2], [3, 4]]];
        if (edge !== undefined) { sc.set(edges[edge]); return; }
        let M: Mat;
        do { M = [[rint(r, -3, 3), rint(r, -3, 3)], [rint(r, -3, 3), rint(r, -3, 3)]]; } while (det(M) >= 0);
        sc.set(M);
      },
      edgeCases: 3,
      async showMe() { sc.set([[0, 1], [1, 0]]); await wait(200); },
    };
  },
};

// ------------------------------------------------------------------ the Law

export const law: LawDef<InvCase> = {
  ...lawCore,
  frame: ['$A$ ', { slot: 'kind' }, ' exactly when ', { slot: 'cond' }, '.'],
  slots: {
    kind: { options: [{ id: 'inverse', text: 'is invertible' }, { id: 'singular', text: 'has no inverse' }] },
    cond: { options: [
      { id: 'apart', text: 'no two points land on one spot' },
      { id: 'no-zero', text: 'no entry is zero' },
      { id: 'not-zero', text: 'it is not all zeros' },
      { id: 'no-flip', text: 'it does not turn the grid over' },
    ] },
  },
  describe(c: InvCase) {
    const lands = Math.abs(det(c.M)) < 1e-9;
    return `$A = ${texM(c.M)}$: ${lands ? 'two different points land on one spot, so it has no inverse' : 'no two points land together, and it has an inverse'}`;
  },
  draw(g: Game, c: InvCase) {
    // the Law panel sits in the middle of the screen: draw the case to its right, zoomed to fit it
    const ext = Math.max(...[[-2.5, -1], [-2.5, 1], [2, -1], [2, 1], [3, 0]].map(([x, y]) => Math.hypot(c.M[0][0] * x + c.M[0][1] * y, c.M[1][0] * x + c.M[1][1] * y)));
    const hgt = Math.max(11, 2.3 * ext);
    void g.stage.view2D({ center: [-0.42 * hgt, 0.04 * hgt], height: hgt, ms: 0 });
    const grid = new FlatGrid(g.stage, { extent: 6 });
    grid.set(c.M);
    grid.show(true);
    const plan = new FramePlan(g.stage, {}, 0.01);
    plan.set(c.M);
    const ghost = new FramePlan(g.stage, { color: '#8fa3c4', opacity: 0.5, fill: 0, dashed: true, width: 1.4 }, 0.004);
    const lab = new Label(`$A = ${texM(c.M)}$`, [0, -0.31 * hgt, 0], { color: C.white, size: 17 });
    g.stage.world.add(grid.object, plan.object, ghost.object, lab.object);
  },
  reason: {
    ask: 'Your Law survived. **Why** does an inverse exist exactly when no two points land on one spot?',
    options: [
      { id: 'a', text: 'If two points land on one spot, a move sends that spot to one place, so it cannot send it back to both. If no two land together, nothing is flattened, and the move that sends each spot back to its start is the inverse.', right: true, why: 'Yes. Two starts on one spot cannot both be sent home. When no two collide, every spot has exactly one start to return to.' },
      { id: 'b', text: 'A zero entry loses information, so it cannot be undone.', right: false, why: 'The identity has two zero entries and is its own inverse. $\\begin{bmatrix}1 & 1\\\\ 1 & 1\\end{bmatrix}$ has none and flattens the plane.' },
      { id: 'c', text: 'Only the all-zeros matrix sends points together.', right: false, why: '$\\begin{bmatrix}1 & 2\\\\ 2 & 4\\end{bmatrix}$ is not all zeros, yet it sends $(2, 0)$ and $(0, 1)$ both to $(2, 4)$.' },
    ],
  },
};

// ------------------------------------------------------------------ the Procedure: LANTERN runs your steps on [A | I]

const procHtml = (m: ReturnType<typeof runProcedure>['steps'][number]['m'], n: number) => {
  const rows = fnum(m).map((r) => `${r.slice(0, n).map(fmtN).join(' & ')} & ${r.slice(n).map(fmtN).join(' & ')}`).join(' \\\\ ');
  return `$\\left[\\begin{array}{${'c'.repeat(n)}|${'c'.repeat(n)}}${rows}\\end{array}\\right]$`;
};

export const procedure: ProcedureDef = {
  id: 'c13-proc',
  title: 'Inverse by [A | I]',
  brief: 'Order the steps LANTERN does **for each column, left to right**. It runs them literally on $[A \\mid I]$ for a new $A$, then checks that $A$ times the right half is $I$.',
  tiles: [
    { id: 'find', text: 'FIND PIVOT: the entry on the diagonal in this column', py: 'p = col' },
    { id: 'swap', text: 'SWAP IF ZERO: if the pivot is 0, swap in a lower row that is not 0 there', py: 'if M[p][col] == 0: swap(M, p, below(M, col))' },
    { id: 'scale', text: 'SCALE TO 1: divide the pivot row by the pivot', py: 'M[p] = [x / M[p][col] for x in M[p]]' },
    { id: 'clear', text: 'CLEAR BELOW AND ABOVE: subtract (entry) × (pivot row) from every other row', py: 'for r in others: M[r] = [a - M[r][col] * b for a, b in zip(M[r], M[p])]' },
    { id: 'both', text: 'APPLY TO BOTH HALVES: every step changes the whole row, right half too', py: 'width = 2 * n' },
  ],
  decoys: [
    { id: 'clear-below', text: 'CLEAR BELOW ONLY: subtract from the rows under the pivot', py: 'for r in range(p + 1, n): ...' },
    { id: 'left-only', text: 'APPLY TO THE LEFT HALF ONLY: the right half is the answer, so leave it alone', py: 'width = n' },
  ],
  reference: ['find', 'swap', 'scale', 'clear', 'both'],
  async run(g, tileIds) {
    const res = runProcedure(tileIds, PROC_A);
    g.stage.clearWorld();
    // the step panel sits on the left: put the board and the grid's origin on the right
    await g.stage.view2D({ center: [-3.4, 0.4], height: 9, ms: 300 });
    const grid = new Grid2D(g.stage, { base: 0.42, main: 0.6 });
    landingLineColour(grid);
    const board = new Label('', [0, 3.2, 0], { color: C.white, size: 20 });
    const step = new Label('', [0, 2.1, 0], { color: C.accent, size: 15 });
    for (const l of [board, step]) Object.assign(l.el.style, { background: 'rgba(6, 10, 22, 0.78)', padding: '4px 10px', borderRadius: '8px' });
    g.stage.world.add(grid.object, board.object, step.object);
    const n = PROC_A.length;
    // the grid shows the left half as a move: it ends square when the left half is I
    for (const s of res.steps) {
      board.set(procHtml(s.m, n));
      step.set(s.label);
      const L = fnum(s.m).map((r) => r.slice(0, n));
      grid.set(L);
      sfx.tick(1);
      await wait(g.headless ? 5 : 650);
    }
    if (res.ok) {
      const X = fnum(res.steps[res.steps.length - 1].m).map((r) => r.slice(n));
      step.set(`Right half: $A^{-1} = ${texM(X)}$. Check: $A\\,A^{-1} = I$.`);
      sfx.success();
      await animate(g.headless ? 5 : 500, (k) => grid.setLook({ main: 0.6 + 0.3 * k }), ease.out);
    } else {
      step.set(res.message.length > 70 ? 'LANTERN stopped. See the message.' : res.message);
      g.stage.nudge(0.1);
    }
    return { ok: res.ok, message: res.message };
  },
};

// ------------------------------------------------------------------ Ilse's page

export const compare: CompareDef = {
  id: 'c13',
  page: 'The **inverse** $A^{-1}$ is the move that returns every point to where it started: $A^{-1}A = AA^{-1} = I$.\n\nIt exists exactly when the move does **not flatten space**. If two different points land on one spot, no move can send that spot back to both, so there is no inverse. Such a matrix is **singular**.\n\nTo find it, row reduce $[A \\mid I]$. Each row operation is a move $E$. If $E_k \\cdots E_1 A = I$, then $E_k \\cdots E_1 = A^{-1}$, and doing the same operations to $I$ writes that product down: $[A \\mid I] \\to [I \\mid A^{-1}]$.\n\nTo undo two moves, undo the last one first: $(AB)^{-1} = B^{-1}A^{-1}$.',
  formula: 'A^{-1} = \\frac{1}{ad - bc}\\begin{bmatrix} d & -b \\\\ -c & a \\end{bmatrix} \\qquad (AB)^{-1} = B^{-1}A^{-1}',
  keyIdeas: [
    'Did you say the inverse sends every point back to where it started?',
    'Did you say it exists exactly when no two points land on one spot?',
    'Did you say why the order reverses: the move done last is undone first?',
  ],
};
