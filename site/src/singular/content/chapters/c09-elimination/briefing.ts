// Chapter 9 Briefing (GDD §6.5 Ch 9): Say it, three Doubts (two false, one true), the Law, LANTERN's
// Procedure (the row machine), Ilse's page.
import type { CompareDef, DoubtDef, Game, LawDef, ProcedureDef } from '../../../game/types';
import type { SayItDef } from '../../../game/types';
import { RowOpsBoard } from '../../../kit/rowops';
import { fmat, type FMat } from '../../../math/frac';
import { Frac } from '../../../math/frac';
import { Slider } from '../../../ui/widgets';
import { h, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { PlaneSet, boxFrame, worldHost } from '../c08-systems/planes';
import { kindOf, pivotPositions, pt, rowTex, somePoint, type Aug } from '../c08-systems/act3';
import {
  D_REF_START, D_SCALE_START, D_SWAP_START, LAW_C09, PROC_CASE, PROC_DECOYS, PROC_REFERENCE, PROC_TILES, applyLawOp,
  bramRef, refRandom, rowMachine, scaleHolds, scaleRandom, scaleRow, swapHolds, swapRandom, twoRefHolds, type C09Case,
} from './logic';
import { looseCtx, type LooseCtx } from './ctx';
import '../c08-systems/act3.css';

const nums = (m: FMat): Aug => m.map((r) => r.map((x) => x.value()));
/** Rows by identity (the board keeps a row's colour when it moves), so a swap moves no plane. */
const byId = (m: Aug, order: number[]): Aug => { const out: Aug = []; order.forEach((id, pos) => { out[id] = m[pos]; }); return out; };
/** The scale doubt's lines stay inside this frame, below the cards. */
const D_SCALE_BOX: [number, number, number, number] = [-3.5, -2.1, 5.5, 2.8];
const meet = (m: Aug) => { const k = kindOf(m); return k === 'one' ? `meet at ${pt(somePoint(m)!)}` : k === 'many' ? 'meet along a line' : 'never all meet'; };

export const sayit: SayItDef = {
  id: 'c09', who: 'bram',
  ask: 'Why does adding a multiple of one equation to another not change the solutions?',
  frames: {
    see: 'When I added a multiple of one row to another, one plane ___ and the yellow point ___.',
    means: 'A point that makes two equations true also makes their ___ true, and the step can be ___, so no solution is gained or lost.',
    called: 'The grid of numbers is the ___ matrix; the three moves are ___ operations; the staircase is ___ form.',
    cue: 'When you see a system to solve by hand, think ___.',
  },
  wordBank: ['turned', 'stayed', 'combination', 'undone', 'true', 'augmented', 'row', 'row echelon', 'pivot', 'staircase', 'back substitution'],
};

/** A board in the dock with the planes beside it, the planes following the board by row identity. */
function boardScene(p: Parameters<DoubtDef['setup']>[0], aug: Aug, o: ConstructorParameters<typeof RowOpsBoard>[1] extends infer T ? Partial<T> : never) {
  const board = new RowOpsBoard(p, { aug, n: 3, showSolution: false, ...o });
  board.el.classList.add('c10-norref'); // the reduced form is Chapter 10's
  const planes = new PlaneSet(p, { n: 3, rows: aug });
  void planes.frame({ distance: 23 });
  board.subscribe((m, _op, ms) => { void planes.setRows(byId(nums(m), board.order()), ms); if (ms > 0) planes.pulse(); });
  // a new case (Bram's shake): centre the planes and the camera on its meeting point
  const aim = (rows: Aug) => { const x = somePoint(rows); if (x) void planes.refocus(x, 250); };
  return { board, planes, aim };
}

export const doubtSwap: DoubtDef = {
  id: 'c09-d-swap', who: 'bram', isTrue: false,
  claim: 'Swapping two rows changes the answer. You have moved the equations around.',
  reason: 'A swap only changes the order the equations are listed in. Every plane stays exactly where it was, so the point on all of them is the same point.',
  goal: 'Swap two rows with ⇅ and watch the planes. **Challenge it** with your swap, or **Back it** and let Bram shake it.',
  view: '3d',
  setup(p) {
    let orig = D_SWAP_START;
    // swaps only: the board's add/multiply help would not apply here
    const { board, aim } = boardScene(p, orig, { ops: ['swap'], title: 'The fan-beam board', keyHelp: false });
    let swapped = false;
    board.subscribe((_m, op) => { if (op?.kind === 'swap') swapped = true; });
    const cur = () => nums(board.get());
    return {
      holds: () => swapHolds(orig, cur(), swapped),
      describe: () => swapped ? `after the swap the planes still ${meet(cur())}, as before` : 'no rows swapped yet',
      randomize(r, edge) { const c = swapRandom(r, edge ?? -1); orig = c.orig; board.set(c.cur); swapped = true; aim(c.orig); },
      edgeCases: 1,
      async showMe() { if (!swapped) await board.apply({ kind: 'swap', i: 0, j: 2 }); },
    };
  },
};

export const doubtScale: DoubtDef = {
  id: 'c09-d-scale', who: 'bram', isTrue: false,
  claim: 'Multiplying a row by any number keeps the solutions. Any number at all.',
  reason: 'Multiplying by 0 turns the row into 0 = 0, which every point satisfies: that equation is erased and the solutions grow. It cannot be undone, which is why scaling by 0 is not a row operation.',
  goal: 'Pick a number $k$ and multiply row 2 by it. Watch the red line. **Challenge it** with a number that changes the solutions, or **Back it**.',
  view: '2d',
  setup(p) {
    let m = D_SCALE_START.map((r) => r.slice()), i = 1, k = 2;
    const planes = new PlaneSet(p, { n: 2, rows: scaleRow(m, i, k), names: ['x', 'y'], box: D_SCALE_BOX });
    boxFrame(p, D_SCALE_BOX);
    void planes.frame({ height: 9, target: [1, 1.5] });
    const r = p.readout('Row 2 times k');
    const paint = () => {
      const s = scaleRow(m, i, k);
      r.row('row', `row ${i + 1} becomes`, `$${k === 0 ? '0 = 0' : rowTex(s[i], ['x', 'y'])}$`, i === 0 ? C.v : C.w);
      r.row('m', 'The lines', meet(s), C.result);
    };
    const sk = new Slider({ label: `multiply row 2 by $k$`, min: -3, max: 3, step: 0.5, value: k, onInput: (v) => { k = v; p.move(); void planes.setRows(scaleRow(m, i, k), 400); paint(); } });
    p.dock().append(sk.el);
    paint();
    const set = async (c: { m: Aug; i: number; k: number }, ms: number) => { m = c.m; i = c.i; k = c.k; sk.set(k, false); await planes.setRows(scaleRow(m, i, k), ms); paint(); };
    return {
      holds: () => scaleHolds(m, i, k),
      describe: () => `k = ${k}: the lines ${meet(scaleRow(m, i, k))}; before, they ${meet(m)}`,
      randomize: (rr, edge) => set(scaleRandom(rr, edge ?? -1), 200),
      edgeCases: 1,
      async showMe() { await set({ m: D_SCALE_START, i: 1, k: 0 }, 700); },
    };
  },
};

export const doubtTwoRef: DoubtDef = {
  id: 'c09-d-tworef', who: 'bram', isTrue: true,
  claim: 'Two people can reach different row echelon forms from the same board, and still find the pivots in the same places.',
  reason: 'Different row operations give different staircases, but none of them changes which mixes of the columns add up to zero: a mix that zeroes every old row also zeroes every combination of them, and each step can be undone. A column can be made from the columns to its left exactly when it has no pivot. So every staircase of the same board has its pivots in the same columns.',
  goal: 'Bram\'s staircase is on the right. Reach a **different** staircase with the board, then compare where the pivots are. **Back it** (Bram shakes it) or **Challenge it**.',
  view: '3d',
  setup(p) {
    let start = D_REF_START;
    let bram = bramRef(start);
    const { board, aim } = boardScene(p, start, { title: 'Your board' });
    const r = p.readout('Bram\'s staircase');
    const box = h('div');
    r.el.insertBefore(box, r.el.children[1] ?? null);
    const paint = () => {
      const tex = `\\left[\\begin{array}{ccc|c} ${bram.map((row) => row.map((x, c) => { const t = x.toTex(); return pivotPositions(bram, 3).includes(c) && row.slice(0, c).every((y) => y.isZero()) && !x.isZero() ? `\\boxed{${t}}` : t; }).join(' & ')).join(' \\\\ ')} \\end{array}\\right]`;
      box.innerHTML = inline(`$${tex}$`);
      const mine = board.get();
      r.row('piv', 'Pivot columns', `Bram ${pivotPositions(bram, 3).map((c) => c + 1).join(', ')} · yours ${board.isREF() ? pivotPositions(mine, 3).map((c) => c + 1).join(', ') : 'not a staircase yet'}`);
    };
    board.subscribe(() => paint());
    paint();
    return {
      holds: () => twoRefHolds(board.get(), bram),
      describe: () => board.isREF() ? `your staircase has pivots in columns ${pivotPositions(board.get(), 3).map((c) => c + 1).join(', ')}; Bram's in ${pivotPositions(bram, 3).map((c) => c + 1).join(', ')}` : 'your board is not a staircase yet',
      randomize(rr, edge) { const c = refRandom(rr, edge ?? -1); start = c.m; bram = bramRef(start); board.set(c.mine); paint(); aim(start); },
      edgeCases: 2,
      async showMe() {
        board.reset();
        await board.play([
          { kind: 'add', i: 1, j: 0, k: new Frac(-2) }, { kind: 'add', i: 2, j: 0, k: new Frac(-1) },
          { kind: 'add', i: 2, j: 1, k: new Frac(-1) }, { kind: 'add', i: 0, j: 1, k: new Frac(1) },
        ], 500);
      },
    };
  },
};

/** One Proving Ground case: the planes after the operation, and where they meet. */
function drawCase(g: Game, c: C09Case): void {
  const n = c.aug[0].length - 1 as 2 | 3;
  const after = applyLawOp(c.aug, c.op);
  const host = worldHost(g);
  const focus = somePoint(c.aug) ?? new Array(n).fill(0);
  if (n === 3) { if (g.stage.mode !== '3d') void g.stage.view3D({ target: [focus[0], focus[1], focus[2]], distance: 24, azimuth: -55, elevation: 24, ms: 0, orbit: false }); }
  else void g.stage.view2D({ center: [focus[0], focus[1]], height: 12, ms: 0 });
  new PlaneSet(host, { n, rows: after, labels: false, size: 9, focus, axes: false });
}

export const law: LawDef<C09Case> = {
  ...LAW_C09,
  // the subject names the three moves (scaling by any number), so the 'scale0' cases fall inside it:
  // under the chapter's definition a row operation never scales by 0, and 'keeps always' would be true
  frame: ['Swapping two rows, multiplying a row by a number, or adding a multiple of one row to another ', { slot: 'does' }, ' the solution set ', { slot: 'when' }, '.'],
  slots: {
    does: { options: [{ id: 'keeps', text: 'keeps' }, { id: 'changes', text: 'changes' }] },
    when: { options: [{ id: 'always', text: 'always' }, { id: 'unless0', text: 'unless it multiplies a row by zero' }] },
  },
  cadetSlots: ['does'],
  draw: drawCase,
  reason: {
    ask: 'Your Law survived. **Why** do these moves keep the solution set (when no row is multiplied by 0)?',
    options: [
      { id: 'comb', right: true, text: 'A point that makes the old equations true makes any combination of them true, and each operation can be undone by another, so no point is gained or lost.', why: 'Yes. Swapping, scaling by a non-zero number and adding a multiple all have an undo. Scaling by 0 does not: the equation is gone.' },
      { id: 'look', right: false, text: 'The planes look the same afterwards.', why: 'They do not: a plane visibly turns when you add a multiple of another row. What stays is the point they share.' },
      { id: 'numbers', right: false, text: 'Row operations keep every number in the row.', why: 'They change the numbers, often all of them. The solutions stay because combinations of true equations are true.' },
    ],
  },
};

// ------------------------------------------------------------------ the Procedure: LANTERN's row machine

let active: { ctx: LooseCtx; el: HTMLElement; off: () => void } | null = null;
function cleanup(): void {
  if (!active) return;
  active.off();
  active.ctx.disposeAll();
  active.el.remove();
  document.querySelector('.brief.procedure')?.classList.remove('c09-aside');
  active = null;
}

export const procedure: ProcedureDef = {
  id: 'c09-proc',
  title: 'The row machine',
  brief: 'Put the steps in order. LANTERN runs them **literally** on the deck six relays, whose first row starts with 0.',
  tiles: PROC_TILES,
  decoys: PROC_DECOYS,
  reference: PROC_REFERENCE,
  async run(g, tileIds) {
    cleanup();
    const res = rowMachine(tileIds, PROC_CASE);
    g.stage.clearWorld();
    const el = h('div', { class: 'dock glass c09-procdock' });
    el.style.pointerEvents = 'auto';
    g.ui.scene.appendChild(el);
    // the tile panel moves left while LANTERN's board shows on the right, so neither covers the other
    document.querySelector('.brief.procedure')?.classList.add('c09-aside');
    const ctx = looseCtx(g, el);
    // tidy up once the Procedure step is gone (the engine lends no dispose hook)
    const off = g.stage.tick(() => { if (!document.querySelector('.brief.procedure')) cleanup(); });
    active = { ctx, el, off };
    const board = new RowOpsBoard(ctx, { aug: PROC_CASE, n: 3, mount: el, title: 'LANTERN runs your steps', showSolution: false, keyHelp: false });
    board.setEnabled(false);
    board.el.classList.add('c10-norref');
    const caption = h('div', { class: 'c09-caption' });
    el.appendChild(caption);
    const planes = new PlaneSet(ctx, { n: 3, rows: PROC_CASE });
    void planes.frame({ distance: 26, shiftPx: 330, ms: 500 }); // below the board, right of the tile panel
    board.subscribe((m, _op, ms) => { void planes.setRows(byId(nums(m), board.order()), ms); });
    const fast = g.headless;
    for (const st of res.steps) {
      caption.innerHTML = inline(`**LANTERN:** ${st.text}`);
      if (st.kind === 'op') await board.apply(st.op, true, fast ? 0 : 650);
      else if (st.kind === 'set') { board.set(st.m); sfx.miss(); await wait(fast ? 0 : 600); }
      else await wait(fast ? 0 : 450);
    }
    caption.innerHTML = inline(`**LANTERN:** ${res.message}`);
    if (!res.ok) { sfx.miss(); g.stage.nudge(0.08); } else { planes.pulse(); }
    void fmat;
    return { ok: res.ok, message: res.message };
  },
};

export const compare: CompareDef = {
  id: 'c09',
  page: 'Write a system as its **augmented matrix**: one row per equation, the numbers in front of the unknowns, a bar, the right side.\n\nA **row operation** replaces equations by combinations of them: swap two rows, multiply a row by a non-zero number, or add a multiple of one row to another. A point that makes the old equations true makes any combination of them true, and every row operation can be undone by another one. So the solution set never changes: one plane turns about where it meets the others, and the meeting point stays.\n\n**Gaussian elimination** uses this to clear below each **pivot**, column by column, until the matrix is a staircase (**row echelon form**). Then **back substitution** reads the bottom row, which has one unknown, and climbs. A row $[\\,0\\;0\\;0 \\mid c\\,]$ with $c \\ne 0$ says $0 = c$: no solution.',
  formula: '\\left[\\begin{array}{ccc|c} 1 & 2 & 1 & 8 \\\\ 2 & 5 & 4 & 24 \\\\ 1 & 3 & 4 & 19 \\end{array}\\right] \\to \\left[\\begin{array}{ccc|c} 1 & 2 & 1 & 8 \\\\ 0 & 1 & 2 & 8 \\\\ 0 & 0 & 1 & 3 \\end{array}\\right] \\Rightarrow \\cy{z = 3,\\ y = 2,\\ x = 1}',
  keyIdeas: [
    'Did you say that a combination of true equations is true?',
    'Did you say that every row operation can be undone (and that scaling by 0 cannot)?',
    'Did you say to clear below each pivot, then read from the bottom up?',
  ],
};
