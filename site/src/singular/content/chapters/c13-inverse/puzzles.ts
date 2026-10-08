// Chapter 13 puzzles (GDD §6.6 Ch 13): the undo bench. p1 undo a quarter turn, p2 undo by landing
// spots, p3 square the bow, p4 [D][H] why [A | I] works, p5 undo a chain, p6 the one that cannot be
// undone, p7 [S] LU.
import { Vector3 } from 'three';
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import type { Grid2D } from '../../../gfx/grid';
import { Pad, Dot } from '../../../gfx/markers';
import { Arrow } from '../../../gfx/arrow';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { Lattice3D, Parallelepiped } from '../../../gfx/shapes';
import { Label } from '../../../gfx/label';
import { h, button } from '../../../ui/ui';
import { MatrixInput, VectorInput } from '../../../ui/widgets';
import { StepWorksheet } from '../../../kit/steps';
import { VectorHandle } from '../../../kit/handle';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { burst } from '../../../gfx/fx';
import { det, identity, matMul, matVec, mlerp, type Mat } from '../../../math/la';
import { gaussJordanSteps, opTex, type RowOp } from '../../../math/rref';
import { UndoBench, colsOf } from './bench';
import { AugBoard } from './augboard';
import { FlatGrid, playMove } from './play';
import { FramePlan, BOW_CORNERS, PLAN_COLOR } from './frames';
import {
  I2, P1_A, P1_SAME_WAY, P1_UNDO, P2_A, P2_TO_E1, P2_TO_E2, P2_ENTRY_RECIP, p2ColumnOk, P3_A, P3_UNDO,
  P4_A, P4_B, P4_INV, P4_REF_OPS, P4_X, P5_CARDS, P5_FRAME, P5_REF, P5_WRONG, p5Won, P6_A, P6_PAIR, p6Won,
  P7_A, P7_L, P7_MULT, P7_U, elementary, fmtN, fmtV, leftOf, texM, tolFor, meqTol, stillFlat, rightOf,
} from './logic';
import { S } from './script';

const v3 = (v: readonly number[]): V3 => [v[0], v[1], v[2] ?? 0];
const previewFor = (p: PuzzleCtx) => (p.difficulty === 'cadet' ? 'live' : p.difficulty === 'navigator' ? 'after-fire' : 'never') as 'live' | 'after-fire' | 'never';

/** The kit grid draws a flattened grid's landing line in violet; violet is kept for Chapter 15. */
export function landingLineColour(grid: Grid2D, color: string = C.result): void {
  for (const ch of grid.mesh.children) {
    const mat = (ch as unknown as { material?: { color?: { set: (c: string) => void } } }).material;
    mat?.color?.set(color);
  }
}

/** The readout every undo-bench puzzle shows: the damage, the undo, and U·A after a Fire. */
function benchReadout(p: PuzzleCtx, title: string, name: string, A: Mat) {
  const r = p.readout(title);
  r.row('A', `the damage $${name}$`, `$${texM(A)}$`);
  return {
    r,
    update(U: Mat, fired: boolean) {
      r.row('U', 'your undo $U$', `$${texM(U.map((x) => x.map((y) => Math.round(y * 100) / 100)))}$`, C.result);
      r.eq(fired ? `U\\,${name} = ${texM(matMul(U, A).map((x) => x.map((y) => Math.round(y * 100) / 100)))}` : null);
    },
  };
}

// ------------------------------------------------------------------ p1 · undo a quarter turn

export const p1: PuzzleDef = {
  id: 'c13-p1',
  title: 'How do we undo a quarter turn?',
  goal: 'The practice frame took a **quarter turn**. Build the undo: drag where it sends the two grid arrows (green, red), or type it. **Fire** it. The frames must land on their dashed ghost.',
  predict: {
    prompt: 'The frame was turned a quarter turn anticlockwise. Which move puts every joint back?',
    choices: [{ id: 'back', text: 'A quarter turn the other way' }, { id: 'again', text: 'The same quarter turn again' }, { id: 'flip', text: 'A flip over the x-axis' }],
    answer: 'back',
    reveal: 'A quarter turn clockwise sends $(1, 0)$ to $(0, -1)$ and $(0, 1)$ to $(1, 0)$. The same turn again makes a half turn, and a flip leaves the frame mirrored.',
  },
  hints: [
    'The quarter turn sent $(1, 0)$ to $(0, 1)$. The undo must send $(0, 1)$ back to $(1, 0)$.',
    'Turn the other way: the undo sends $(1, 0)$ to $(0, -1)$ and $(0, 1)$ to $(1, 0)$.',
    'Green tip at $(0, -1)$, red tip at $(1, 0)$. Fire.',
  ],
  par: 3,
  onWin: S.p1Win,
  setup(p) {
    p.g.stage.view2D({ center: [0.4, 0.2], height: 9.5, ms: 0 });
    const ro = benchReadout(p, 'Practice frame', 'A', P1_A);
    let fired = false;
    const bench = new UndoBench(p, {
      A: P1_A, tol: tolFor(p.difficulty), preview: previewFor(p), snap: p.snap(),
      onChange: (U) => ro.update(U, false),
      onFire: (U, ok) => {
        fired = true;
        ro.update(U, true);
        if (ok) p.win();
        else if (meqTol(U, P1_SAME_WAY, 0.05)) p.bark('lantern', 'That turns the same way again. The frames made a half turn.');
        else p.bark('lantern', `The frames landed off their ghost. Your undo sent (1, 0) to ${fmtV([U[0][0], U[1][0]])}.`);
      },
    });
    ro.update(bench.U, fired);
    landingLineColour(bench.grid);
    return {
      async showMe() { await bench.setU(P1_UNDO, 800); await bench.fire(); },
      async solve() { await bench.setU(P1_UNDO, 0); await bench.fire(); },
      async wrong() { await bench.setU(P1_SAME_WAY, 0); await bench.fire(); },
    };
  },
};

// ------------------------------------------------------------------ p2 · undo by landing spots

export const p2: PuzzleDef = {
  id: 'c13-p2',
  title: 'Which points did the move send to the grid arrows?',
  goal: 'The move sends $(1, 0)$ to $(2, 1)$ and $(0, 1)$ to $(1, 1)$. Drag the **green** point until the move lands it on $\\mathbf e_1$, and the **red** point until it lands on $\\mathbf e_2$, or type them. Those two points are the undo\'s columns.',
  subgoals: ['The green point lands on e₁ = (1, 0)', 'The red point lands on e₂ = (0, 1)', 'Play the undo, then the move: every point comes back'],
  hints: [
    'The yellow dot shows where the move sends your point. Move the green point until its yellow dot sits on the ring at $(1, 0)$.',
    'The move sends $(x, y)$ to $(2x + y,\\ x + y)$. For $(1, 0)$: $x + y = 0$ and $2x + y = 1$.',
    'Green at $(1, -1)$. Red at $(-1, 2)$.',
  ],
  par: 4,
  onWin: S.p2Win,
  setup(p) {
    p.g.stage.view2D({ center: [0.6, 0.6], height: 8.5, ms: 0 });
    const grid = p.grid({ base: 0.42, main: 0.55, axis: 0.55 });
    grid.set(I2);
    const flat = new FlatGrid(p.g.stage);
    p.add(flat);
    const tol = tolFor(p.difficulty);
    const pads = [new Pad(p.g.stage, [1, 0, 0], { label: '$\\mathbf e_1$', color: C.v, radius: 0.3 }), new Pad(p.g.stage, [0, 1, 0], { label: '$\\mathbf e_2$', color: C.w, radius: 0.3 })];
    p.add(...pads);
    const lands = [new Dot([-1, -1, 0.04], { color: C.result, size: 0.08 }), new Dot([3, 2, 0.04], { color: C.result, size: 0.08 })];
    const links = [0, 1].map(() => new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.result, width: 1.5, opacity: 0.7, dashed: true, dashSize: 0.1, gapSize: 0.08 }));
    p.add(...lands, ...links.map((l) => l.object));
    p.onDispose(() => links.forEach((l) => l.dispose()));
    const r = p.readout('Where the move sends your points');
    r.row('A', 'the move $A$', `$${texM(P2_A)}$`);
    const done = [false, false];
    let U: Mat = identity(2);
    let playing = false;
    let typing = false;
    const handles: VectorHandle[] = [];
    // typed entry (GDD §7.1: commander drags freely and types exact values); its columns are the two points
    const input = new MatrixInput({
      rows: 2, cols: 2, values: colsOf([0, -1], [1, 1]), colourCols: true, label: 'U =', step: p.snap() ?? 0.5,
      onChange: (m) => {
        if (playing) { input.set(U); return; }
        typing = true;
        try { handles[0].set([m[0][0], m[1][0], 0]); handles[1].set([m[0][1], m[1][1], 0]); } finally { typing = false; }
      },
      onSubmit: () => void play(),
    });
    const lockInput = (on: boolean) => { for (const i of [0, 1]) for (const j of [0, 1]) input.setLocked(i, j, on); };
    const sync = () => {
      U = colsOf(handles[0].tip, handles[1].tip);
      if (!typing) input.set(U);
      for (const j of [0, 1] as const) {
        const tip = handles[j].tip;
        const L = matVec(P2_A, [tip[0], tip[1]]);
        lands[j].at([L[0], L[1], 0.04]);
        links[j].setPoints([[tip[0], tip[1], 0.02], [L[0], L[1], 0.02]]);
        r.row(`l${j}`, j === 0 ? 'green point lands at' : 'red point lands at', fmtV(L), j === 0 ? C.v : C.w);
        const ok = p2ColumnOk(j, tip, tol);
        if (ok && !done[j]) { done[j] = true; void pads[j].hit(j === 0 ? C.v : C.w); p.subgoal(j); sfx.snap(); }
        if (!ok && done[j]) { done[j] = false; pads[j].reset(j === 0 ? C.v : C.w); p.subgoal(j, false); }
      }
      r.row('U', 'the undo $U$ (your two points)', `$${texM(U.map((x) => x.map((y) => Math.round(y * 100) / 100)))}$`, C.result);
      playBtn.disabled = !(done[0] && done[1]) || playing;
    };
    for (const j of [0, 1] as const) {
      handles.push(new VectorHandle(p, {
        to: j === 0 ? [0, -1, 0] : [1, 1, 0], color: j === 0 ? C.v : C.w, label: j === 0 ? '$U\\mathbf e_1$' : '$U\\mathbf e_2$',
        snap: p.snap(), planar: true, limit: 4, onChange: () => sync(),
      }));
    }
    const plan = new FramePlan(p.g.stage, {}, 0.01);
    const ghost = new FramePlan(p.g.stage, { color: '#8fa3c4', opacity: 0.5, fill: 0, dashed: true, width: 1.6 }, 0.004);
    plan.setOpacity(0);
    ghost.setOpacity(0);
    p.add(ghost, plan);
    const play = async () => {
      if (playing || !(done[0] && done[1])) return;
      playing = true;
      p.move();
      sync();
      handles.forEach((x) => x.setEnabled(false));
      lockInput(true);
      lands.forEach((d) => d.setOpacity(0));
      links.forEach((l) => l.setOpacity(0));
      ghost.set(I2); plan.set(I2);
      await animate(300, (k) => { ghost.setOpacity(k); plan.setOpacity(k); });
      const view = { g: p.g, grid, flat };
      const W = await playMove(view, U, I2, 1300, [(M) => plan.set(M)]);
      await wait(250);
      const W2 = await playMove(view, P2_A, W, 1300, [(M) => plan.set(M)]);
      if (meqTol(W2, I2, tol)) {
        plan.setColor(C.good);
        sfx.success();
        void burst(p.g.stage, [0.3, 0, 0.05], C.good, 60, 3);
        p.subgoal(2);
        p.win();
      } else {
        sfx.miss();
        p.bark('lantern', 'The move after your undo did not bring the frames home.');
        handles.forEach((x) => x.setEnabled(true));
        lockInput(false);
        playing = false;
      }
    };
    const playBtn = button('Play the undo, then the move', () => void play(), { cls: 'primary' });
    playBtn.disabled = true;
    p.dock().append(
      h('div', { class: 'kicker' }, 'The undo\'s columns'),
      h('div', { style: 'display:flex;gap:14px;align-items:center;flex-wrap:wrap' }, input.el, playBtn),
      h('div', { class: 'c-muted', style: 'font-size:13px;max-width:400px;line-height:1.4' }, 'Each point is where the undo sends a grid arrow: drag the tips or type the columns. The yellow dot is where the move sends it back.'));
    sync();
    const setBoth = async (a: V3, b: V3, ms: number) => {
      if (ms > 0) await Promise.all([handles[0].moveTo(a, ms), handles[1].moveTo(b, ms)]);
      else { handles[0].set(a); handles[1].set(b); }
      sync();
    };
    return {
      async showMe() { await setBoth(v3(P2_TO_E1), v3(P2_TO_E2), 900); await play(); },
      async solve() { await setBoth(v3(P2_TO_E1), v3(P2_TO_E2), 0); await play(); },
      async wrong() { await setBoth(v3([P2_ENTRY_RECIP[0][0], P2_ENTRY_RECIP[1][0]]), v3([P2_ENTRY_RECIP[0][1], P2_ENTRY_RECIP[1][1]]), 0); await play(); },
    };
  },
};

// ------------------------------------------------------------------ p3 · square the bow

export const p3: PuzzleDef = {
  id: 'c13-p3',
  title: 'What move squares the bow?',
  goal: 'The bow frames took the routine pulse $T$: $(1, 0)$ to $(1, 1)$, $(0, 1)$ to $(-2, -1)$. Build $T^{-1}$ and **Fire** it. The frames must land on the dashed plan they were built to.',
  predict: {
    prompt: 'The pulse sent $(1, 0)$ to $(1, 1)$. Where must the inverse send $(1, 1)$?',
    choices: [{ id: 'e1', text: 'To $(1, 0)$' }, { id: 'neg', text: 'To $(-1, -1)$' }, { id: 'same', text: 'It stays at $(1, 1)$' }],
    answer: 'e1',
    reveal: 'The inverse sends every landing spot back to where it came from: $(1, 1)$ back to $(1, 0)$.',
  },
  hints: [
    'Find the points the pulse sends to $(1, 0)$ and to $(0, 1)$, as with the last frame. They are the columns of $T^{-1}$.',
    'The pulse sends $(x, y)$ to $(x - 2y,\\ x - y)$. Landing on $(1, 0)$ needs $x = y$ and $x - 2y = 1$: the point $(-1, -1)$.',
    'Columns $(-1, -1)$ and $(2, 1)$. Fire.',
  ],
  par: 3,
  onWin: S.p3Win,
  setup(p) {
    p.g.stage.view2D({ center: [-0.2, 0], height: 10.5, ms: 0 });
    const ro = benchReadout(p, 'The bow frames', 'T', P3_A);
    const bench = new UndoBench(p, {
      A: P3_A, tol: tolFor(p.difficulty), preview: previewFor(p), snap: p.snap(),
      hint: 'Drag where the inverse sends the two grid arrows, or type it. Fire when ready.',
      onChange: (U) => ro.update(U, false),
      onFire: (U, ok) => {
        ro.update(U, true);
        if (ok) { p.win(); return; }
        const UA = matMul(U, P3_A);
        p.bark('lantern', `The frames landed off their plan. (1, 0) went to ${fmtV([UA[0][0], UA[1][0]])}, (0, 1) to ${fmtV([UA[0][1], UA[1][1]])}.`);
      },
    });
    ro.update(bench.U, false);
    return {
      async showMe() { await bench.setU(P3_UNDO, 900); await bench.fire(); },
      async solve() { await bench.setU(P3_UNDO, 0); await bench.fire(); },
      async wrong() { await bench.setU([[1, 2], [1, 1]], 0); await bench.fire(); },
    };
  },
};

// ------------------------------------------------------------------ p4 [D][H] · why [A | I] works

const col3 = (M: Mat, j: number): V3 => [M[0][j], M[1][j], M[2][j]];

/** Animate a 3×3 from M0 to E·M0 without false flattening: shears and positive scalings in a straight line; swaps and flips jump. */
async function stepLattice(E: Mat, M0: Mat, set: (M: Mat) => void, ms = 650): Promise<Mat> {
  const M1 = matMul(E, M0);
  if (det(E) <= 0) { set(M1); sfx.whoosh(0.3); await wait(ms * 0.5); return M1; }
  await animate(ms, (k) => set(matMul(mlerp(identity(3), E, k), M0)), ease.inOut);
  set(M1);
  return M1;
}

export const p4: PuzzleDef = {
  id: 'c13-p4',
  title: 'Why does row reducing [A | I] write down the undo?',
  goal: 'Row reduce **[A | I]** until the left half is the identity. Each row operation is a move of the grid: watch it act on the box. Then run the same moves on **[A | B]**.',
  subgoals: ['Left half: the identity. Right half: the undo', 'Solve A X = B with the same moves'],
  hints: [
    'Clear the 1 at the bottom left: add −1 times R1 to R3.',
    'Then add R2 to R3, and multiply R3 by 1/2. Now clear upwards: R2 − R3, then R1 − R2.',
    'Five moves: R3 − R1, R3 + R2, ½·R3, R2 − R3, R1 − R2.',
  ],
  view: '3d',
  par: 7,
  onWin: S.p4Win,
  async setup(p) {
    void p.g.stage.view3D({ target: [0.3, 0.5, 0.2], distance: 9.2, azimuth: -52, elevation: 24, ms: 0 });
    const lattice = new Lattice3D(p.g.stage, { extent: 2, opacity: 0.7 });
    const box = new Parallelepiped(p.g.stage, col3(P4_A, 0), col3(P4_A, 1), col3(P4_A, 2), { color: C.result, opacity: 0.16 });
    const arrows = [C.v, C.w, C.u].map((c, j) => new Arrow([0, 0, 0], col3(P4_A, j), { color: c, width: 0.045 }));
    p.add(lattice, box, ...arrows);
    let M: Mat = P4_A.map((r) => r.slice());
    const setM = (X: Mat) => { M = X; lattice.set(X); box.set(col3(X, 0), col3(X, 1), col3(X, 2)); arrows.forEach((a, j) => a.setTo(col3(X, j))); };
    setM(P4_A);
    const r = p.readout('Each row operation is a move');
    r.row('m', 'left half (the box)', `$${texM(P4_A)}$`);
    r.note('The box is where the left half sends the unit cube. A row operation $E$ moves it to $E$ times the left half.');
    const ops: RowOp[] = [];
    let fast = false;
    const flags = [false, false];
    const tick = (i: number) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); } if (flags[0] && flags[1]) p.win(); };
    let queue: Promise<unknown> = Promise.resolve();
    let typed: StepWorksheet | null = null;
    const replayBtn = button('Run the same moves on [A | B]', () => void replay(), { cls: 'primary small' });
    replayBtn.hidden = true;
    const showStack = () => {
      const n = ops.length;
      r.row('m', 'left half (the box)', `$${texM(leftOf(board.get(), 3))}$`);
      const last = ops[n - 1];
      if (last) r.row('E', `$E_{${n}}$: $${opTex(last)}$`, `$${texM(elementary(last, 3))}$`, C.result);
      r.eq(n ? `${ops.map((_, i) => `E_{${n - i}}`).join('')}\\,A = \\text{left half}` : null);
    };
    const board = new AugBoard(p, {
      left: P4_A, right: identity(3), prefill: p.difficulty === 'cadet',
      onChange: (m, op) => {
        if (op) ops.push(op); else ops.pop();
        const E = op ? elementary(op, 3) : null;
        const target = leftOf(m, 3);
        if (fast) setM(target);
        else queue = queue.then(async () => { if (E) await stepLattice(E, M, setM); else setM(target); });
        showStack();
        if (board.leftIsI() && !flags[0]) {
          if (p.difficulty === 'commander' && !typed?.done) { p.bark('lantern', 'Left half done. On this setting, type the inverse below: I check only A times it.'); return; }
          tick(0);
          replayBtn.hidden = false;
          p.bark('lantern', `The right half is the undo. Doing the same ${ops.length} moves to I wrote it down.`);
        }
      },
    });
    if (p.difficulty === 'commander') {
      typed = new StepWorksheet(p, {
        title: 'Type $A^{-1}$ (LANTERN checks only that $A$ times it is $I$)',
        steps: [{ prompt: '$A^{-1} =$', answer: P4_INV, tol: 1e-6 }],
        onDone: () => {
          // the typed answer alone does not finish [D]: the row operations must write it down
          if (!board.leftIsI()) { p.bark('lantern', 'A times your matrix is I. Now do it with row operations: reduce the left half of [A | I].'); return; }
          tick(0);
          replayBtn.hidden = false;
          p.bark('lantern', `Checked: A times your matrix is I, and your ${ops.length} moves wrote it down on the right.`);
        },
      });
    }
    const replay = async (instant = false) => {
      if (!flags[0] || flags[1]) return;
      // only the player's own moves: the ones that turned the left half of [A | I] into I
      if (!board.leftIsI() || !ops.length) { p.bark('lantern', 'Reduce [A | I] first: the left half must be the identity.'); return; }
      replayBtn.disabled = true;
      p.move();
      const moves = ops.slice();
      board.set(P4_A, P4_B, 'B');
      setM(P4_A);
      ops.length = 0;
      await board.play(moves, instant ? 0 : 420);
      await queue;
      const X = rightOf(board.get(), 3);
      r.row('X', 'right half now', `$X = ${texM(X)}$`, C.result);
      // the same moves that turned A into I turn B into A⁻¹B, exactly
      if (meqTol(X, P4_X, 1e-9)) {
        p.bark('lantern', `Same moves, new right half: X. Check: A times X is B.`);
        tick(1);
      }
    };
    /** The rest of the reduction from where the board is now (the reference five from a fresh board). */
    const finishOps = (): RowOp[] => (ops.length ? gaussJordanSteps(board.get(), 3).ops : P4_REF_OPS);
    p.dock().append(replayBtn);
    showStack();
    return {
      async showMe() {
        // continue from the player's moves (A is invertible, so the left half always reaches I)
        await queue;
        await board.play(finishOps(), 700);
        await queue;
        if (typed && !typed.done) { await typed.showMe(200); }
        await wait(200);
        await replay();
      },
      async solve() {
        fast = true;
        await board.play(finishOps(), 0);
        if (typed && !typed.done) typed.solve();
        await replay(true);
      },
      async wrong() {
        // the misconception: clear below only, then read the right half
        fast = true;
        await board.play(P4_REF_OPS.slice(0, 3), 0);
      },
    };
  },
};

// ------------------------------------------------------------------ p5 · undo a chain

export const p5: PuzzleDef = {
  id: 'c13-p5',
  title: 'In which order do we undo two moves?',
  goal: 'This frame was **turned**, then **sheared**. Put two undo cards in the slots: the first slot acts first. **Fire**. The frames must land on their ghost.',
  predict: {
    prompt: 'The frame was turned, then sheared. Which undo acts first?',
    choices: [{ id: 'shear', text: 'Undo the shear first' }, { id: 'turn', text: 'Undo the turn first' }, { id: 'either', text: 'Either order works' }],
    answer: 'shear',
    reveal: 'The shear went on last, so it comes off first: $(S R)^{-1} = R^{-1} S^{-1}$. The move next to the point acts first, so $S^{-1}$ sits on the right.',
  },
  hints: [
    'Undoing the turn first leaves the shear tangled with it. Take off the move that went on last.',
    'The shear was done last. Its undo acts first.',
    'First slot: undo the shear. Second slot: undo the turn.',
  ],
  par: 2,
  onWin: S.p5Win,
  setup(p) {
    p.g.stage.view2D({ center: [0.2, 0.3], height: 9, ms: 0 });
    const grid = p.grid({ base: 0.42, main: 0.55, axis: 0.55 });
    landingLineColour(grid);
    const flat = new FlatGrid(p.g.stage);
    const ghost = new FramePlan(p.g.stage, { color: '#8fa3c4', opacity: 0.55, fill: 0, dashed: true, width: 1.6 }, 0.004);
    const plan = new FramePlan(p.g.stage, {}, 0.01);
    const gap = new FatSegments(p.g.stage, [], { color: C.orange, width: 2, opacity: 0.9, dashed: true, dashSize: 0.12, gapSize: 0.1 });
    gap.setOpacity(0);
    p.add(flat, ghost, plan, gap.object);
    p.onDispose(() => gap.dispose());
    ghost.set(I2);
    const reset = () => { grid.set(P5_FRAME); plan.set(P5_FRAME); plan.setColor(PLAN_COLOR); gap.setOpacity(0); };
    reset();
    const r = p.readout('The frame\'s two moves');
    r.row('R', 'first: the turn $R$', `$${texM(P5_CARDS.turn.M)}$`);
    r.row('S', 'then: the shear $S$', `$${texM(P5_CARDS.shear.M)}$`);
    r.eq('\\text{frame} = S\\,R');
    const slots: (string | null)[] = [null, null];
    let landed = false, busy = false;
    const slotEls = [0, 1].map((i) => h('button', { class: 'chip', type: 'button', style: 'min-width:150px;justify-content:center' }, i === 0 ? '1st: empty' : '2nd: empty') as HTMLButtonElement);
    const cardEls = new Map<string, HTMLButtonElement>();
    const paint = () => {
      slotEls.forEach((el, i) => { const id = slots[i]; el.textContent = `${i === 0 ? '1st' : '2nd'}: ${id ? P5_CARDS[id].label : 'empty'}`; el.style.borderColor = id ? C.result : ''; });
      cardEls.forEach((b, id) => { b.disabled = slots.includes(id); });
      const filled = slots.filter(Boolean) as string[];
      r.row('U', 'your undo, first on the right', filled.length === 2 ? `$${P5_CARDS[filled[1]].tex}\\,${P5_CARDS[filled[0]].tex}$` : '…', C.result);
      fire.disabled = filled.length < 2 || busy;
    };
    const afterChange = () => { if (landed) { landed = false; reset(); } paint(); };
    slotEls.forEach((el, i) => el.addEventListener('click', () => { if (busy) return; slots[i] = null; sfx.back(); afterChange(); }));
    for (const id of Object.keys(P5_CARDS)) {
      const b = button(P5_CARDS[id].label, () => {
        if (busy) return;
        const k = slots.indexOf(null);
        if (k < 0) return;
        slots[k] = id;
        afterChange();
      }, { cls: 'small' });
      cardEls.set(id, b);
    }
    const doFire = async (): Promise<void> => {
      const ids = slots.filter(Boolean) as string[];
      if (ids.length < 2 || busy || p.won) return;
      if (landed) reset();
      busy = true;
      paint();
      p.move();
      let W = P5_FRAME;
      for (const id of ids) { W = await playMove({ g: p.g, grid, flat }, P5_CARDS[id].M, W, 1100, [(M) => plan.set(M)]); await wait(150); }
      landed = true;
      busy = false;
      if (p5Won(ids)) {
        plan.setColor(C.good);
        sfx.success();
        void burst(p.g.stage, [0.3, 0, 0.05], C.good, 60, 3);
        p.win();
      } else {
        sfx.miss();
        gap.setSegments(BOW_CORNERS.map((c) => { const q = matVec(W, c); return [[q[0], q[1], 0.03], [c[0], c[1], 0.03]] as [V3, V3]; }));
        gap.setOpacity(0.9);
        const both = ids.every((x) => x.startsWith('undo'));
        p.bark('lantern', both ? 'Both undos, wrong order. Undoing the turn first leaves the shear wrapped round it.' : 'One of those cards is not an undo. The frames moved further away.');
      }
      paint();
    };
    const fire = button('Fire', () => void doFire(), { cls: 'primary' });
    p.dock().append(
      h('div', { class: 'kicker' }, 'Undo cards'),
      h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, ...cardEls.values()),
      h('div', { class: 'kicker', style: 'margin-top:4px' }, 'Slots (the first acts first; click a slot to empty it)'),
      h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, ...slotEls, fire));
    paint();
    const place = (ids: string[]) => { slots[0] = ids[0]; slots[1] = ids[1]; afterChange(); };
    return {
      async showMe() { place(P5_REF); await wait(400); await doFire(); },
      async solve() { place(P5_REF); await doFire(); },
      async wrong() { place(P5_WRONG); await doFire(); },
    };
  },
};

// ------------------------------------------------------------------ p6 · the one that cannot be undone

export const p6: PuzzleDef = {
  id: 'c13-p6',
  title: 'Can every move be undone?',
  goal: 'This frame\'s move sent both grid arrows to one line. Try an undo, or declare that none exists. Then prove it: put **two different points** where the move lands them **on the same spot**.',
  subgoals: ['Try an undo, or declare that none exists', 'Two different points land on one spot'],
  hints: [
    'Every point lands on one line through the origin. Many starts must share each landing spot.',
    'The move sends $(x, y)$ to $(x + 2y,\\ 2x + 4y) = (x + 2y)(1, 2)$. Any two starts with the same $x + 2y$ land together.',
    'Put one point at $(2, 0)$ and the other at $(0, 1)$. Both land on $(2, 4)$.',
  ],
  par: 4,
  onWin: S.p6Win,
  setup(p) {
    p.g.stage.view2D({ center: [0.6, 0.8], height: 10, ms: 0 });
    const tol = tolFor(p.difficulty);
    let phase: 'undo' | 'probe' = 'undo';
    const ro = benchReadout(p, 'The last frame', 'A', P6_A);
    const bench = new UndoBench(p, {
      A: P6_A, tol, preview: previewFor(p), snap: p.snap(),
      onChange: (U) => ro.update(U, false),
      onFire: (U) => {
        ro.update(U, true);
        p.bark('lantern', stillFlat(U) ? 'Still flat. Every joint lies on one line, whatever the undo.' : 'Still flat.');
      },
    });
    landingLineColour(bench.grid);
    ro.update(bench.U, false);
    // probes: two start points and where the move lands them
    const starts: V3[] = [[-1, 1, 0], [2, -1, 0]];
    const colours = [C.v, C.w];
    const dots = starts.map((s, i) => new Dot([s[0], s[1], 0.05], { color: colours[i], size: 0.13 }));
    const lands = starts.map(() => new Dot([0, 0, 0.06], { color: C.result, size: 0.1 }));
    const links = starts.map(() => new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.result, width: 1.5, opacity: 0.75, dashed: true, dashSize: 0.1, gapSize: 0.08 }));
    const tag = new Label('', [0, 0, 0], { className: 'small' });
    tag.show(false);
    [...dots, ...lands].forEach((d) => d.setOpacity(0));
    links.forEach((l) => l.setOpacity(0));
    p.add(...dots, ...lands, ...links.map((l) => l.object), tag.object);
    p.onDispose(() => { links.forEach((l) => l.dispose()); tag.dispose(); });
    const r2 = p.readout('Two starts');
    r2.el.hidden = true;
    // commander drags freely, so the two starts can also be typed exactly (GDD §7.1)
    let typing = false;
    const startIns: VectorInput[] | null = p.difficulty === 'commander'
      ? starts.map((s, i) => new VectorInput({
        dim: 2, values: [s[0], s[1]], label: i === 0 ? '\\text{green} =' : '\\text{red} =', step: 0.5,
        onChange: (v) => {
          if (phase !== 'probe' || p.won) { startIns?.[i].set([starts[i][0], starts[i][1]]); return; }
          starts[i] = [v[0], v[1], 0];
          typing = true;
          try { syncProbe(); } finally { typing = false; }
        },
      }))
      : null;
    const startsBox = startIns ? h('div', { style: 'display:flex;gap:14px;align-items:center;flex-wrap:wrap' }, ...startIns.map((x) => x.el)) : null;
    if (startsBox) startsBox.hidden = true;
    const syncProbe = () => {
      starts.forEach((s, i) => {
        const L = matVec(P6_A, [s[0], s[1]]);
        if (startIns && !typing) startIns[i].set([s[0], s[1]]);
        dots[i].at([s[0], s[1], 0.05]);
        lands[i].at([L[0], L[1], 0.06]);
        links[i].setPoints([[s[0], s[1], 0.03], [L[0], L[1], 0.03]]);
        r2.row(`s${i}`, `${i === 0 ? 'green' : 'red'} start ${fmtV([s[0], s[1]])} lands at`, fmtV(L), colours[i]);
      });
      if (phase === 'probe' && p6Won(starts[0], starts[1], tol)) {
        const L = matVec(P6_A, [starts[0][0], starts[0][1]]);
        tag.at([L[0] + 0.6, L[1] + 0.35, 0]);
        tag.set(`both land at ${fmtV(L)}`);
        tag.show(true);
        lands.forEach((d) => d.setColor(C.orange));
        sfx.collapse();
        p.subgoal(1);
        p.win();
      }
    };
    const toProbe = async () => {
      if (phase === 'probe') return;
      phase = 'probe';
      p.move();
      p.subgoal(0);
      bench.setEnabled(false);
      bench.c1.arrow.setOpacity(0.25);
      bench.c2.arrow.setOpacity(0.25);
      declare.disabled = true;
      ro.r.el.hidden = true;
      r2.el.hidden = false;
      if (startsBox) startsBox.hidden = false;
      await animate(300, (k) => { [...dots, ...lands].forEach((d) => d.setOpacity(k)); links.forEach((l) => l.setOpacity(0.75 * k)); });
      p.setGoal(`Drag the **green** and **red** points${startIns ? ', or type them' : ''}. Put two different points where the move lands them **on the same spot**.`);
      syncProbe();
    };
    starts.forEach((_, i) => {
      p.g.drag.add({
        target: dots[i].mesh, getPos: () => new Vector3(...starts[i]), snap: () => p.snap(),
        constrain: (q) => new Vector3(Math.max(-4, Math.min(4, q.x)), Math.max(-4, Math.min(4, q.y)), 0),
        onMove: (q) => { if (phase !== 'probe' || p.won) return; starts[i] = [q.x, q.y, 0]; syncProbe(); sfx.tick(q.y); },
        onEnd: () => { if (phase === 'probe') p.move(); },
      });
    });
    const declare = button('Declare: no undo exists', () => void toProbe(), { cls: 'small' });
    p.dock().append(declare);
    if (startsBox) p.dock().append(startsBox);
    syncProbe();
    const putPair = async (a: V3, b: V3, ms: number) => {
      if (ms > 0) {
        const a0 = starts[0].slice() as V3, b0 = starts[1].slice() as V3;
        await animate(ms, (k) => {
          starts[0] = [a0[0] + (a[0] - a0[0]) * k, a0[1] + (a[1] - a0[1]) * k, 0];
          starts[1] = [b0[0] + (b[0] - b0[0]) * k, b0[1] + (b[1] - b0[1]) * k, 0];
          if (k < 1) { dots.forEach((d, i) => d.at([starts[i][0], starts[i][1], 0.05])); }
        });
      }
      starts[0] = a; starts[1] = b;
      syncProbe();
    };
    return {
      async showMe() { await bench.setU([[0, 1], [-1, 0]], 600); await bench.fire(); await toProbe(); await putPair(v3(P6_PAIR[0]), v3(P6_PAIR[1]), 900); },
      async solve() { await toProbe(); await putPair(v3(P6_PAIR[0]), v3(P6_PAIR[1]), 0); },
      async wrong() { await toProbe(); await putPair([2, 0, 0], [0, 2, 0], 0); },
    };
  },
};

// ------------------------------------------------------------------ p7 [S] · LU

export const p7: PuzzleDef = {
  id: 'c13-p7',
  title: 'What if LANTERN kept the multipliers?',
  goal: 'Eliminate below the pivots of $A$ with no swaps. Type each multiplier you use. Then write them into $L$ under the diagonal of 1s.',
  hints: [
    'R2 − 2·R1 clears the 4. The multiplier is 2.',
    'R3 − 4·R1 clears the 8. Then R3 − 3·R2 clears the 3 left in the middle.',
    '$L$ has rows $(1, 0, 0)$, $(2, 1, 0)$, $(4, 3, 1)$.',
  ],
  view: '3d',
  par: 5,
  onWin: S.p7Win,
  setup(p) {
    // the box of U's columns: elimination leaves a staircase (A's own box is a needle 24 units tall)
    void p.g.stage.view3D({ target: [2.1, 1, 1], distance: 13, azimuth: -52, elevation: 24, ms: 0 });
    const box = new Parallelepiped(p.g.stage, col3(P7_U, 0), col3(P7_U, 1), col3(P7_U, 2), { color: C.result, opacity: 0.14 });
    const arrows = [C.v, C.w, C.u].map((c, j) => new Arrow([0, 0, 0], col3(P7_U, j), { color: c, width: 0.05 }));
    p.add(box, ...arrows);
    const r = p.readout('Elimination, multipliers kept');
    r.row('A', '$A$', `$${texM(P7_A)}$`);
    r.row('U', 'after elimination', `$U = ${texM(P7_U)}$`);
    r.note('Each row operation subtracts a multiple of a pivot row. LANTERN keeps each multiple in $L$. The box shows the columns of $U$.');
    const ws = new StepWorksheet(p, {
      steps: [
        { prompt: 'R2 − $\\ell_{21}$·R1 clears the 4: $\\ell_{21} =$', answer: P7_MULT.l21, mistakes: [[-2, 'The multiplier is what you subtract: 4 ÷ 2 = 2.']] },
        { prompt: 'R3 − $\\ell_{31}$·R1 clears the 8: $\\ell_{31} =$', answer: P7_MULT.l31 },
        { prompt: 'R3 − $\\ell_{32}$·R2 clears the 3: $\\ell_{32} =$', answer: P7_MULT.l32 },
        { prompt: '$L =$', answer: P7_L, mistakes: [[[[1, 0, 0], [-2, 1, 0], [-4, -3, 1]], 'L holds the multipliers as you subtracted them, without the minus signs.']] },
      ],
      onDone: () => {
        r.eq(`L\\,U = ${texM(matMul(P7_L, P7_U))} = A`);
        box.setColor(C.good);
        p.win();
      },
    });
    return {
      async showMe() { await ws.showMe(350); },
      solve() { ws.solve(); },
      wrong() { ws.wrong(); },
    };
  },
};

export { fmtN };
