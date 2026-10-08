// Chapter 12 puzzles (GDD §6.6 Ch 12): the pair as one, order, the row–column rule [H], moving a
// matrix across a dot product [D], zero from non-zero, three layers in one matrix, grouping [S].
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { BuoyField } from '../../../gfx/buoys';
import { Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { VectorHandle } from '../../../kit/handle';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { MatrixInput } from '../../../ui/widgets';
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';

import { sfx } from '../../../audio/sfx';
import { col, dot, identity, matMul, matVec, transpose, type Mat } from '../../../math/la';
import { Bench2, FlatGrid, playMove, ride, type MoveView } from '../c11-transformations/bench';
import { commitButton, dockButton, Gap, pause, tipToTail } from '../c11-transformations/parts';
import { tolFor } from '../c11-transformations/logic';
import { Rail, Tracer, playRail, texMat } from './rail';
import {
  CARDS, flipTwiceHome, fmtN, fmtV, fuse, meqTol, moverShake, newTry, ordersApart, P1_AB, P1_BA, p1Won, P3_A, P3_AB, P3_B, P3_COLS,
  P3_STEPS, P4_AB, P4_AB_MOVER, P4_B, P4_DECOYS, P4_MOVER, P4_ORDER, P4_RULE_TWICE, P4_TILES, P6_CARDS, P6_FUSED, p6Won, P7_CARDS,
  RING, BLOB, ringSeparated, shakePairs, zeroFromNonZero,
} from './logic';
import { S } from './script';

const v3 = (v: readonly number[]): V3 => [v[0], v[1], v[2] ?? 0];

function view(p: PuzzleCtx, grid = p.grid({ base: 0.28 })): MoveView {
  const flat = new FlatGrid(p.g.stage, { extent: 9 });
  flat.show(false);
  p.add(flat);
  return { grid, flat, g: p.g };
}

// ================================================================== c12-p1 · the pair as one

export const p1: PuzzleDef = {
  id: 'c12-p1',
  title: 'Which single matrix does the shear, then the turn?',
  goal: 'The rail holds the shear (on the right: it acts first) and the quarter turn. **Play the rail** and watch where $\\mathbf e_1$ and $\\mathbf e_2$ end up. Then build **one** matrix that does both, and **Fuse**.',
  hints: [
    'Follow $\\mathbf e_1$: the shear leaves it at (1, 0). The turn takes (1, 0) to (0, 1).',
    'Follow $\\mathbf e_2$: the shear sends it to (1, 1). The turn takes (1, 1) to (−1, 1).',
    'The single matrix has columns (0, 1) and (−1, 1).',
  ],
  par: 3,
  onWin: S.p1Win,
  setup(p) {
    p.g.stage.view2D({ center: [0.3, 0.5], height: 7.5, ms: 0 });
    const tol = tolFor(p.difficulty);
    const blind = p.difficulty === 'commander';
    if (blind) p.setGoal('The rail holds the shear (on the right: it acts first) and the quarter turn. Build **one** matrix that does both and **Fuse**. Then **Play the rail** to compare.');
    const v = view(p);
    const bench = new Bench2(p, { draggable: p.difficulty === 'cadet', input: true, live: true, inputLabel: 'M =' });
    const tracer = new Tracer(p);
    tracer.show(false);
    const ghost = new FlatGrid(p.g.stage, { extent: 9, color: C.white, opacity: 0.22, axisColor: C.white, width: 1.4 });
    ghost.show(false);
    p.add(ghost);
    const rail = new Rail({ cards: [CARDS.shear, CARDS.turn] });
    p.dock().prepend(rail.el);
    const gap = new Gap(p);
    let played = false, busy = false, committed = false;
    const showBench = (on: boolean) => { bench.arrow(0).object.visible = on; bench.arrow(1).object.visible = on; };
    // the rail's animation alone: no busy check and no move counted (the caller holds `busy`)
    const runRail = async (fast: boolean) => {
      showBench(false);
      tracer.show(true);
      await playRail(v, rail, rail.matrices(), { ms: fast ? 0 : p.difficulty === 'cadet' ? 1900 : 1300, tracer, pause: fast ? 0 : 300 });
      played = true;
      await pause(fast, 700);
      tracer.a1.object.visible = false; tracer.a2.object.visible = false;
      v.grid!.set(bench.get());
      showBench(true);
    };
    const playIt = async (fast = false) => {
      if (busy) return;
      if (blind && !committed) { sfx.miss(); p.bark('lantern', 'Commander: enter your single matrix and Fuse first. Then play the rail to compare.'); return; }
      busy = true;
      p.move();
      await runRail(fast);
      busy = false;
    };
    const fuseIt = async (fast = false) => {
      if (busy || p.won) return;
      busy = true;
      p.move();
      committed = true;
      gap.hide();
      const M = bench.get();
      showBench(false);
      await playMove(v, M, identity(2), fast ? 0 : 1500, [bench.arrow(0) && ((W) => { bench.arrow(0).setTo([W[0][0], W[1][0], 0]); bench.arrow(1).setTo([W[0][1], W[1][1], 0]); })]);
      showBench(true);
      ghost.set(P1_BA);
      ghost.show(true);
      if (p1Won(M, tol)) {
        bench.setDraggable(false);
        sfx.success();
        p.win();
      } else {
        sfx.miss();
        const j = meqTol([[M[0][0]], [M[1][0]]], [[P1_BA[0][0]], [P1_BA[1][0]]], tol) ? 1 : 0;
        gap.show(col(M, j), col(P1_BA, j), 'gap');
        const swapped = meqTol(M, P1_AB, tol);
        p.bark('lantern', swapped ? 'That matrix does the turn first, then the shear. The rail does the shear first.'
          : `The dashed grid is the rail’s result. Your column ${j + 1} is ${fmtV(col(M, j))}; the rail sends $\\mathbf e_${j + 1}$ to ${fmtV(col(P1_BA, j))}.`);
        // still busy: the button cannot be pressed again during the replay, and it is not a move
        if (!played && !blind) await runRail(fast);
      }
      busy = false;
    };
    const row = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' });
    p.dock().appendChild(row);
    dockButton(p, 'Play the rail', () => void playIt(), row, 'small');
    commitButton(p, 'Fuse', () => void fuseIt(), row);
    const solveAll = async (fast: boolean) => {
      if (!blind && !played) await playIt(fast);
      if (fast) bench.set(P1_BA); else await bench.to(P1_BA, 900);
      await fuseIt(fast);
    };
    return { showMe: () => solveAll(false), solve: () => solveAll(true), async wrong() { bench.set(P1_AB); await fuseIt(true); } };
  },
};

// ================================================================== c12-p2 · order

export const p2: PuzzleDef = {
  id: 'c12-p2',
  title: 'Does the order of two moves matter?',
  goal: 'Drag the white point anywhere. Play it **shear, then turn**, and **turn, then shear**. Show a point that lands in two different places.',
  subgoals: ['Find a point that lands in different places', 'Flip over y = x twice: does the grid come back?'],
  hints: [
    'Try (1, 0). Shear then turn: (1, 0) → (1, 0) → (0, 1). Turn then shear: (1, 0) → (0, 1) → (1, 1).',
    'Any point except the origin shows it.',
    'Put the flip over $y = x$ on the rail twice, then play it.',
  ],
  par: 5,
  onWin: S.p2Win,
  setup(p) {
    p.g.stage.view2D({ center: [0.3, 0.6], height: 7.5, ms: 0 });
    const v = view(p);
    const pt = new VectorHandle(p, { to: [1, 0, 0], color: C.white, label: '$\\mathbf p$', snap: p.snap() ?? 0.25, limit: 3, planar: true });
    const lands = [new Dot([0, 0, 0], { color: C.result, size: 0.11, label: 'shear, then turn', labelOffset: [0, -22] }), new Dot([0, 0, 0], { color: C.white, size: 0.1, label: 'turn, then shear', labelOffset: [0, 22] })];
    lands.forEach((d) => d.setOpacity(0));
    p.add(...lands);
    const mover = new Dot([1, 0, 0.02], { color: C.white, size: 0.08 });
    mover.setOpacity(0);
    p.add(mover);
    const gap = new Gap(p);
    const tracer = new Tracer(p);
    tracer.show(false);
    let stage: 'order' | 'flip' | 'done' = 'order';
    const playedFor: [number[] | null, number[] | null] = [null, null];
    const rail1 = new Rail({ cards: [CARDS.shear, CARDS.turn] });
    const rail2 = new Rail({ palette: [CARDS.flip, CARDS.turn, CARDS.shear], max: 3 });
    p.dock().append(rail1.el);
    let busy = false;
    const playOrder = async (which: 0 | 1, fast = false) => {
      if (busy || stage !== 'order') return;
      busy = true;
      p.move();
      const q = pt.vec.slice(0, 2);
      const cards = which === 0 ? [CARDS.shear, CARDS.turn] : [CARDS.turn, CARDS.shear];
      rail1.set(cards);
      mover.at(v3(q)); mover.setOpacity(1);
      await playRail(v, rail1, cards.map((c) => c.M), { ms: fast ? 0 : 1100, riders: [ride(q, (x) => mover.at([x[0], x[1], 0.02]))] });
      mover.setOpacity(0);
      const land = matVec(which === 0 ? P1_BA : P1_AB, q);
      lands[which].at(v3(land)); lands[which].setOpacity(1);
      playedFor[which] = q;
      sfx.snap();
      await pause(fast, 500);
      v.grid!.set(identity(2));
      const [a, b] = playedFor;
      if (a && b && Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9) {
        if (ordersApart(a)) {
          gap.show(matVec(P1_BA, a), matVec(P1_AB, a), 'order matters');
          p.subgoal(0);
          sfx.success();
          enterFlip();
        } else if (Math.hypot(a[0], a[1]) < 1e-9) p.bark('lantern', 'The origin lands on the origin both ways. Try another point.');
        else p.bark('lantern', 'They do land in different places, but too close together to see. Try a point further from the origin.');
      } else if (a && b) p.bark('lantern', 'Play both orders with the same point.');
      busy = false;
    };
    const enterFlip = () => {
      stage = 'flip';
      rail1.el.remove(); orderRow.remove();
      p.dock().prepend(rail2.el);
      flipRow.hidden = false;
      p.setGoal('Now put the **flip over $y = x$** on the rail **twice** and play it. Where does the grid end up?');
    };
    const playFlip = async (fast = false) => {
      if (busy || stage !== 'flip') return;
      const Ms = rail2.matrices();
      if (!Ms.length) { sfx.miss(); return; }
      busy = true;
      p.move();
      gap.hide();
      lands.forEach((d) => d.setOpacity(0));
      pt.arrow.setOpacity(0);
      tracer.show(true);
      const end = await playRail(v, rail2, Ms, { ms: fast ? 0 : 1300, tracer });
      if (flipTwiceHome(Ms)) {
        stage = 'done';
        p.subgoal(1);
        sfx.success();
        p.win();
      } else {
        sfx.miss();
        p.bark('lantern', `$\\mathbf e_1$ ended at ${fmtV(col(end, 0))} and $\\mathbf e_2$ at ${fmtV(col(end, 1))}. Two flips over $y = x$, nothing else.`);
      }
      busy = false;
    };
    const orderRow = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' });
    p.dock().appendChild(orderRow);
    dockButton(p, 'Play: shear, then turn', () => void playOrder(0), orderRow, 'small primary');
    dockButton(p, 'Play: turn, then shear', () => void playOrder(1), orderRow, 'small');
    const flipRow = h('div', { style: 'display:flex;gap:8px' });
    flipRow.hidden = true;
    p.dock().appendChild(flipRow);
    commitButton(p, 'Play the rail', () => void playFlip(), flipRow);
    const solveAll = async (fast: boolean) => {
      if (stage === 'order') {
        if (fast) pt.set([1, 0, 0]); else await pt.moveTo([1, 0, 0], 400);
        await playOrder(0, fast); await playOrder(1, fast);
      }
      if (stage === 'flip') { rail2.set([CARDS.flip, CARDS.flip]); await playFlip(fast); }
    };
    return { showMe: () => solveAll(false), solve: () => solveAll(true), async wrong() { pt.set([0, 0, 0]); await playOrder(0, true); await playOrder(1, true); } };
  },
};

// ================================================================== c12-p3 [H] · the row–column rule

export const p3: PuzzleDef = {
  id: 'c12-p3',
  title: 'What is the single rule, entry by entry?',
  goal: `Two sensor rules in a row: $A = ${texMat(P3_A)}$ after $B = ${texMat(P3_B)}$. Work out the product $AB$ by hand. Each column of $AB$ is $A$ applied to a column of $B$.`,
  hints: [
    'Column 1 of $AB$ is $A$ times (1, 2, 0): 1 of (1, 0), 2 of (2, 1), 0 of (0, 3).',
    'Entry (row $i$, column $j$) is row $i$ of $A$ dotted with column $j$ of $B$.',
    '$AB$ has columns (5, 2) and (2, 13).',
  ],
  par: 5,
  onWin: S.p3Win,
  setup(p) {
    p.g.stage.view2D({ center: [2.2, 7.1], height: 16.4, ms: 0 });
    p.grid({ base: 0.3, main: 0, axis: 0.8 });
    const cols = [0, 1, 2].map((j) => v3(col(P3_A, j)));
    const colors = [C.v, C.w, C.u];
    p.add(...cols.map((c, j) => new Arrow([0, 0, 0], c, { color: colors[j], label: `$\\mathbf a_${j + 1}$`, width: 0.07 })));
    const r = p.readout('Two rules in a row');
    r.eq(`A = ${texMat(P3_A)}\\quad B = ${texMat(P3_B)}`);
    r.row('size', 'sizes', '2 × 3 times 3 × 2 is 2 × 2');
    let fastMode = false;
    const ws = new StepWorksheet(p, {
      steps: P3_STEPS,
      onDone: async () => {
        const fast = fastMode;
        for (let j = 0; j < 2; j++) {
          await tipToTail(p, cols, col(P3_B, j), colors, fast ? 0 : 200);
          const res = new Arrow([0, 0, 0], v3(P3_COLS[j]), { color: C.result, label: `$A\\mathbf b_${j + 1}$`, width: 0.07 });
          p.add(res);
          sfx.snap();
        }
        r.row('ab', '$AB$', `columns ${fmtV(P3_COLS[0])}, ${fmtV(P3_COLS[1])}`, C.result);
        sfx.success();
        p.win();
      },
    });
    return { async showMe() { await ws.showMe(350); }, solve() { fastMode = true; ws.solve(); }, wrong() { ws.wrong(); } };
  },
};

// ================================================================== c12-p4 [D] · moving a matrix across a dot product

export const p4: PuzzleDef = {
  id: 'c12-p4',
  title: 'Which matrix moves B to the other side of a dot product?',
  goal: 'Type a matrix $M$ so that $(B\\mathbf x)\\cdot\\mathbf y = \\mathbf x\\cdot(M\\mathbf y)$ for **every** $\\mathbf x$ and $\\mathbf y$. Drag $\\mathbf x$ and $\\mathbf y$ to test it. Then let Bram shake 200 pairs.',
  subgoals: ['Find the matrix that moves B across', 'Survive Bram’s 200 pairs', 'Move AB across: use the rule twice'],
  hints: [
    'Try $\\mathbf x = \\mathbf e_1$ and $\\mathbf y = \\mathbf e_2$: the left side is entry (2, 1) of $B$, the right side is entry (1, 2) of $M$.',
    'Every entry of $M$ is an entry of $B$ from the mirrored place: rows of $B$ become columns of $M$.',
    '$M$ has rows (1, 0) and (2, 1). For $AB$, the movers come in the other order: the mover of $B$ times the mover of $A$, $M_B M_A$ (so $M_A$ acts on $\\mathbf y$ first).',
  ],
  par: 6,
  onWin: S.p4Win,
  setup(p) {
    p.g.stage.view2D({ center: [0.9, 0.9], height: 9, ms: 0 });
    p.grid({ base: 0.28, main: 0.35 });
    const d = p.difficulty;
    let M: Mat = identity(2);
    const x = new VectorHandle(p, { to: [2, 1, 0], color: C.v, label: '$\\mathbf x$', snap: 1, limit: 4, planar: true, onChange: () => upd() });
    const y = new VectorHandle(p, { to: [0, 2, 0], color: C.w, label: '$\\mathbf y$', snap: 1, limit: 4, planar: true, onChange: () => upd() });
    const bx = new Arrow([0, 0, 0], [0, 0, 0], { color: C.v, opacity: 0.55, width: 0.035, label: '$B\\mathbf x$' });
    const my = new Arrow([0, 0, 0], [0, 0, 0], { color: C.w, opacity: 0.55, width: 0.035, label: '$M\\mathbf y$', labelAt: 'mid' });
    p.add(bx, my);
    const r = p.readout('Both sides');
    r.eq(`B = ${texMat(P4_B)}`);
    const upd = () => {
      const xv = x.vec.slice(0, 2), yv = y.vec.slice(0, 2);
      const bxv = matVec(P4_B, xv), myv = matVec(M, yv);
      bx.setTo(v3(bxv)); my.setTo(v3(myv));
      const L = dot(bxv, yv), R = dot(xv, myv);
      r.row('l', '$(B\\mathbf x)\\cdot\\mathbf y$', fmtN(L), C.v);
      r.row('r', '$\\mathbf x\\cdot(M\\mathbf y)$', fmtN(R), Math.abs(L - R) < 1e-9 ? C.result : C.orange);
    };
    const input = new MatrixInput({ rows: 2, cols: 2, values: M, label: 'M =', step: 1, onChange: (m) => { M = m; upd(); }, onSubmit: () => void shake() });
    p.dock().appendChild(input.el);
    upd();
    let stage: 'mover' | 'twice' | 'done' = 'mover';
    let busy = false;
    const shake = async (fast = false) => {
      if (busy || stage !== 'mover') return;
      busy = true;
      p.move();
      const pairs = shakePairs();
      const bad = moverShake(P4_B, M, pairs);
      // flicker through some of the pairs on the holotable
      const show = pairs.slice(0, fast ? 2 : 14);
      for (const [xv, yv] of show) {
        x.set(v3(xv)); y.set(v3(yv)); upd(); sfx.tick(xv[0] + yv[1]);
        await pause(fast, 110);
        if (bad && bad[0] === xv) break;
      }
      if (bad) {
        x.set(v3(bad[0])); y.set(v3(bad[1])); upd();
        sfx.miss();
        p.bark('bram', `Held for some. Not for x = ${fmtV(bad[0])}, y = ${fmtV(bad[1])}.`);
        busy = false;
        return;
      }
      p.subgoal(0); p.subgoal(1);
      sfx.success();
      p.bark('bram', 'Two hundred pairs. Not one miss.');
      busy = false;
      enterTwice();
    };
    const shakeBtn = commitButton(p, 'Shake 200 pairs', () => void shake());
    // ---- the rule twice
    let ws: StepWorksheet | null = null;
    let tiles: TileOrder | null = null;
    const done = () => { stage = 'done'; p.subgoal(2); sfx.success(); p.win(); };
    const steps = [
      { prompt: `$A$ is the quarter turn $${texMat(CARDS.turn.M)}$. The product $AB$`, answer: P4_AB },
      { prompt: 'The matrix that moves $AB$ across: rows of $AB$ become columns', answer: P4_AB_MOVER },
      { prompt: 'The mover of $B$ times the mover of $A$', answer: P4_RULE_TWICE, mistakes: [[matMul(transpose(CARDS.turn.M), P4_MOVER), 'That is the mover of A times the mover of B. Move A across first, then B: the mover of B ends up on the left.']] as [Mat, string][] },
    ];
    const enterTwice = () => {
      stage = 'twice';
      shakeBtn.hidden = true;
      // back to the starting pair, and slide the holotable clear of the worksheet
      x.set([2, 1, 0]); y.set([0, 2, 0]); upd();
      void p.g.stage.view2D({ center: [-1.8, 1.5], height: 9, ms: 600 });
      input.el.style.opacity = '0.6';
      r.row('m', 'mover of $B$', `rows ${fmtV(P4_MOVER[0])}, ${fmtV(P4_MOVER[1])}`, C.result);
      if (d === 'commander') {
        p.setGoal('Two moves in a row, $AB$. Order the steps that move $AB$ across, then type its mover for the quarter turn $A$.');
        tiles = new TileOrder(p, {
          title: 'Move AB across', tiles: P4_TILES, decoys: P4_DECOYS, submitLabel: 'Check order',
          onSubmit: (o) => {
            p.move();
            if (o.join() === P4_ORDER.join()) { tiles?.el.remove(); tiles = null; ws = new StepWorksheet(p, { steps: [steps[2]], onDone: done }); }
            else { sfx.miss(); p.bark('lantern', o.includes('same') ? 'Each move crosses on its own: A first, because it is outside.' : 'Start from the left side, move A across, then B.'); }
          },
        });
      } else {
        p.setGoal('Two moves in a row, $AB$. Work out the matrix that moves $AB$ across, and compare it with the movers of $B$ and $A$.');
        ws = new StepWorksheet(p, { steps, onDone: done });
      }
    };
    const solveAll = async (fast: boolean) => {
      if (stage === 'mover') { M = P4_MOVER; input.set(M); upd(); await shake(fast); }
      if (stage === 'twice') {
        if (tiles) { tiles.set(P4_ORDER); tiles.el.remove(); tiles = null; ws = new StepWorksheet(p, { steps: [steps[2]], onDone: done }); }
        if (fast) ws?.solve(); else await ws?.showMe(350);
      }
    };
    return {
      showMe: () => solveAll(false), solve: () => solveAll(true),
      // a misconception: B itself moves across
      async wrong() { M = P4_B; input.set(M); upd(); await shake(true); },
    };
  },
};

// ================================================================== c12-p5 · zero from non-zero

export const p5: PuzzleDef = {
  id: 'c12-p5',
  title: 'Can two moves that are not zero make zero?',
  goal: 'Put **two** moves on the rail, neither of them zero, so that together they send **every** point to the origin. **Play the rail**.',
  hints: [
    'A flattening move sends a whole line of points to the origin.',
    'Flatten onto the $x$-axis first. Which second move sends the whole $x$-axis to the origin?',
    'Onto the $x$-axis, then onto the $y$-axis.',
  ],
  par: 3,
  onWin: S.p5Win,
  setup(p) {
    p.g.stage.view2D({ center: [0.2, 0.9], height: 7.5, ms: 0 });
    const v = view(p);
    const buoys = new BuoyField(p.g.stage, { extent: 3, dims: 3, size: 0.05, points: (() => { const pts: V3[] = []; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) pts.push([a, b, 0]); return pts; })() });
    p.add(buoys);
    const tracer = new Tracer(p);
    const rail = new Rail({ palette: [CARDS.turn, CARDS.shear, CARDS.flip, CARDS.px, CARDS.py, CARDS.stretch], max: 2 });
    p.dock().appendChild(rail.el);
    let busy = false;
    const play = async (fast = false) => {
      if (busy || p.won) return;
      const Ms = rail.matrices();
      if (Ms.length !== 2) { sfx.miss(); p.bark('lantern', 'Two moves on the rail, please.'); return; }
      busy = true;
      p.move();
      buoys.set(identity(3));
      const end = await playRail(v, rail, Ms, { ms: fast ? 0 : 1300, tracer, riders: [(W) => buoys.set(W)] });
      if (zeroFromNonZero(Ms)) { sfx.collapse(); p.win(); }
      else {
        sfx.miss();
        p.bark('lantern', `Not every point is at the origin: $\\mathbf e_1$ ended at ${fmtV(col(end, 0))}, $\\mathbf e_2$ at ${fmtV(col(end, 1))}.`);
        await pause(fast, 1400);
        buoys.set(identity(3)); v.grid!.set(identity(2)); tracer.reset();
      }
      busy = false;
    };
    commitButton(p, 'Play the rail', () => void play());
    const solveAll = async (fast: boolean) => { rail.set([CARDS.px, CARDS.py]); await play(fast); };
    return { showMe: () => solveAll(false), solve: () => solveAll(true), async wrong() { rail.set([CARDS.px, CARDS.px]); await play(true); } };
  },
};

// ================================================================== c12-p6 · three layers, one matrix

export const p6: PuzzleDef = {
  id: 'c12-p6',
  title: 'Can three moves be one matrix, and what can no matrix do?',
  goal: 'The rail holds three moves. **Play the rail**, then build the **one** matrix that does all three, and **Fuse**.',
  subgoals: ['Fuse the three moves into one matrix', 'Try three different matrices on the ring and the blob'],
  hints: [
    'Follow $\\mathbf e_1$: stretch → (2, 0), shear → (2, 0), turn → (0, 2).',
    'Follow $\\mathbf e_2$: stretch → (0, 1), shear → (1, 1), turn → (−1, 1).',
    'Fused: columns (0, 2) and (−1, 1). For the ring: try any three matrices. The blob’s centre is the origin, and the origin never moves.',
  ],
  par: 8,
  onWin: S.p6Win,
  setup(p) {
    p.g.stage.view2D({ center: [0.2, 0.6], height: 8, ms: 0 });
    const tol = tolFor(p.difficulty);
    const v = view(p);
    const bench = new Bench2(p, { draggable: true, input: true, live: true, inputLabel: 'M =' });
    const tracer = new Tracer(p);
    tracer.show(false);
    const ghost = new FlatGrid(p.g.stage, { extent: 9, color: C.white, opacity: 0.22, axisColor: C.white, width: 1.4 });
    ghost.show(false);
    p.add(ghost);
    const rail = new Rail({ cards: [CARDS.stretch, CARDS.shear, CARDS.turn] });
    p.dock().prepend(rail.el);
    let stage: 'fuse' | 'ring' | 'done' = 'fuse';
    let busy = false;
    const showBench = (on: boolean) => { bench.arrow(0).object.visible = on; bench.arrow(1).object.visible = on; };
    const playIt = async (fast = false) => {
      if (busy || stage !== 'fuse') return;
      busy = true; p.move();
      showBench(false); tracer.show(true);
      await playRail(v, rail, P6_CARDS, { ms: fast ? 0 : 1200, tracer, pause: fast ? 0 : 250 });
      await pause(fast, 600);
      tracer.a1.object.visible = false; tracer.a2.object.visible = false;
      v.grid!.set(bench.get()); showBench(true);
      busy = false;
    };
    // ---- the ring and the blob
    const ringPts = new BuoyField(p.g.stage, { points: RING.map((q) => v3(q)), dims: 3, size: 0.075, color: '#cfe3ff' });
    const blobPts = new BuoyField(p.g.stage, { points: BLOB.map((q) => v3(q)), dims: 3, size: 0.075, color: C.orange });
    ringPts.highlight([...ringPts.base.keys()], C.white, 0.7);
    blobPts.highlight([...blobPts.base.keys()], C.orange, 0.8);
    ringPts.object.visible = false; blobPts.object.visible = false;
    p.add(ringPts, blobPts);
    const outline = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 0]], { color: C.white, width: 1.6, dashed: true, opacity: 0.6 });
    outline.setOpacity(0);
    p.add(outline.object);
    p.onDispose(() => outline.dispose());
    const centre = new Label('the blob’s centre: the origin', [0.9, -0.55, 0], { className: 'coord' });
    centre.show(false);
    p.add(centre.object);
    p.onDispose(() => centre.dispose());
    const tried: Mat[] = [];
    const counter = h('div', { class: 'c-muted', style: 'font-size:13px' });
    const fuseIt = async (fast = false) => {
      if (busy || stage !== 'fuse') return;
      busy = true; p.move();
      const M = bench.get();
      showBench(false);
      await playMove(v, M, identity(2), fast ? 0 : 1400, [(W) => { bench.arrow(0).setTo([W[0][0], W[1][0], 0]); bench.arrow(1).setTo([W[0][1], W[1][1], 0]); }]);
      showBench(true);
      ghost.set(P6_FUSED); ghost.show(true);
      if (p6Won(M, tol)) {
        p.subgoal(0); sfx.success();
        await pause(fast, 800);
        enterRing();
      } else {
        sfx.miss();
        p.bark('lantern', `The dashed grid is the rail’s result: $\\mathbf e_1$ at ${fmtV(col(P6_FUSED, 0))}, $\\mathbf e_2$ at ${fmtV(col(P6_FUSED, 1))}. Yours: ${fmtV(col(M, 0))}, ${fmtV(col(M, 1))}.`);
      }
      busy = false;
    };
    const enterRing = () => {
      stage = 'ring';
      ghost.show(false);
      rail.el.remove(); fuseRow.remove();
      ringPts.object.visible = true; blobPts.object.visible = true; centre.show(true);
      bench.set(identity(2));
      p.dock().appendChild(counter);
      counter.textContent = 'Tries: 0 of 3';
      ringRow.hidden = false;
      p.setGoal('Now try to build **any single matrix** that lifts the white ring clear of the orange blob, so one straight cut could separate them. **Try** three different matrices.');
    };
    const tryIt = async (fast = false) => {
      if (busy || stage !== 'ring') return;
      const M = bench.get();
      if (!newTry(tried, M)) { sfx.miss(); p.bark('lantern', 'You tried that matrix already. Change a column.'); return; }
      busy = true; p.move();
      tried.push(M);
      ringPts.set(identity(3)); blobPts.set(identity(3));
      outline.setOpacity(0);
      await playMove(v, M, identity(2), fast ? 0 : 1300, [(W) => { ringPts.set(W); blobPts.set(W); }, ride([0, 0], (q) => centre.at([q[0] + 0.9, q[1] - 0.55, 0]))]);
      const img = RING.map((q) => v3(matVec(M, q)));
      outline.setPoints([...img, img[0]]);
      outline.setOpacity(0.7);
      counter.textContent = `Tries: ${tried.length} of 3`;
      if (ringSeparated(M)) { p.bark('lantern', 'Separated.'); }
      else p.bark('lantern', 'The blob’s centre is still at the origin, inside the ring’s outline. No straight cut separates them.');
      sfx.snap();
      if (tried.length >= 3) { stage = 'done'; p.subgoal(1); sfx.success(); p.win(); }
      busy = false;
    };
    const fuseRow = h('div', { style: 'display:flex;gap:8px' });
    p.dock().appendChild(fuseRow);
    dockButton(p, 'Play the rail', () => void playIt(), fuseRow, 'small');
    commitButton(p, 'Fuse', () => void fuseIt(), fuseRow);
    const ringRow = h('div', { style: 'display:flex;gap:8px' });
    ringRow.hidden = true;
    p.dock().appendChild(ringRow);
    dockButton(p, 'Try this matrix', () => void tryIt(), ringRow, 'small primary');
    const tries: Mat[] = [[[2, 0], [0, 0.5]], [[1, 2], [0, 1]], [[1, 1], [1, 1]]];
    const solveAll = async (fast: boolean) => {
      if (stage === 'fuse') { if (fast) bench.set(P6_FUSED); else { await playIt(); await bench.to(P6_FUSED, 900); } await fuseIt(fast); }
      for (const M of tries) { if (stage !== 'ring') break; if (fast) bench.set(M); else await bench.to(M, 600); await tryIt(fast); }
    };
    return { showMe: () => solveAll(false), solve: () => solveAll(true), async wrong() { bench.set(fuse([CARDS.turn.M, CARDS.shear.M, CARDS.stretch.M])); await fuseIt(true); } };
  },
};

// ================================================================== c12-p7 [S] · grouping on the rail

export const p7: PuzzleDef = {
  id: 'c12-p7',
  title: 'Does it matter which two you fuse first?',
  goal: 'Optional. **Fuse** the right-hand pair first and **Play**. Then **Reset the rail**, fuse the left-hand pair first and **Play**. Compare the two grids.',
  subgoals: ['Fuse the right-hand pair first, then play', 'Fuse the left-hand pair first, then play'],
  hints: ['Click **fuse** between two cards to make them one card.', 'Either way, the three moves still act in the same order.'],
  par: 6,
  onWin: S.p7Win,
  setup(p) {
    p.g.stage.view2D({ center: [0.2, 0.6], height: 8, ms: 0 });
    const v = view(p);
    const tracer = new Tracer(p);
    const ghost = new FlatGrid(p.g.stage, { extent: 9, color: C.white, opacity: 0.22, axisColor: C.white, width: 1.4 });
    ghost.show(false);
    p.add(ghost);
    const start = () => [{ ...CARDS.shear }, { ...CARDS.turn }, { ...CARDS.stretch }];
    let grouping: 'right' | 'left' | null = null;
    const results: Partial<Record<'right' | 'left', Mat>> = {};
    const rail = new Rail({ cards: start(), fusable: true, onFuse: (cards) => { grouping = cards[0].id.startsWith('fused') ? 'right' : 'left'; } });
    p.dock().prepend(rail.el);
    let busy = false;
    const play = async (fast = false) => {
      if (busy || p.won) return;
      if (!grouping || rail.cards.length !== 2) { sfx.miss(); p.bark('lantern', 'Fuse one pair first.'); return; }
      busy = true; p.move();
      const end = await playRail(v, rail, rail.matrices(), { ms: fast ? 0 : 1300, tracer });
      results[grouping] = end;
      p.subgoal(grouping === 'right' ? 0 : 1);
      ghost.set(end); ghost.show(true);
      if (results.left && results.right) {
        if (meqTol(results.left, results.right, 1e-9)) { sfx.success(); p.win(); }
      } else p.bark('lantern', `Final grid: $\\mathbf e_1$ at ${fmtV(col(end, 0))}, $\\mathbf e_2$ at ${fmtV(col(end, 1))}. Now group them the other way.`);
      busy = false;
    };
    const row = h('div', { style: 'display:flex;gap:8px' });
    p.dock().appendChild(row);
    dockButton(p, 'Reset the rail', () => { rail.set(start()); grouping = null; tracer.reset(); v.grid!.set(identity(2)); }, row, 'small ghost');
    commitButton(p, 'Play', () => void play(), row);
    const solveAll = async (fast: boolean) => {
      for (const g of ['right', 'left'] as const) {
        if (results[g]) continue;
        rail.set(start()); grouping = null;
        rail.fuseAt(g === 'right' ? 0 : 1);
        await play(fast);
      }
    };
    void P7_CARDS;
    return { showMe: () => solveAll(false), solve: () => solveAll(true), async wrong() { await play(true); } };
  },
};

void P3_AB; void P1_AB;
