// Chapter 9 puzzles: the staircase (p1), climbing back (p2), zero on top (p3), the sandbox of
// forbidden moves (p4 [D]), the gain k (p5 [H]) and the power board by hand (p6 [H]).
import type { PuzzleCtx, PuzzleDef, Prediction } from '../../../game/types';
import { RowOpsBoard } from '../../../kit/rowops';
import { SystemView } from '../../../kit/system';
import { StepWorksheet, TileOrder, type Step } from '../../../kit/steps';
import { fmat, type FMat } from '../../../math/frac';
import { gaussSteps, type RowOp } from '../../../math/rref';
import { Frac } from '../../../math/frac';
import { Slider, parseNum } from '../../../ui/widgets';
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { sfx } from '../../../audio/sfx';
import { FatLine } from '../../../gfx/lines';
import { wait } from '../../../core/tween';
import { PlaneSet, boxFrame } from '../c08-systems/planes';
import { placeInput } from '../c08-systems/marker';
import { classifyAug, num, pt, sameSolutions, somePoint, type Aug } from '../c08-systems/act3';
import {
  P1, P3, P4, P4_FORBIDDEN, addRow, expectedRow, p4AppliedK, firstColumnCleared, noFractions, p1Won, p3Won, p5Kind, p5Reduced, p5Rows, p6Final,
} from './logic';
import { S } from './script';
import '../c08-systems/act3.css';

type Box = [number, number, number, number];
/** 2-D sandboxes keep their lines inside a frame, clear of the goal card, the dock and the title. */
const P4_BOX: Box = [-1.3, -2.2, 5.2, 5];
const P5_BOX: Box = [-2.5, -4, 7, 3.3];

const num2 = (m: FMat): Aug => m.map((r) => r.map((x) => x.value()));

/** Hide the coordinates label of the yellow point while this puzzle is mounted (the player reads it). */
function hideSolutionLabel(p: PuzzleCtx): void {
  document.body.classList.add('c09-hide-sol');
  p.onDispose(() => document.body.classList.remove('c09-hide-sol'));
}

/** Call onStep(i) once for each worksheet step that is right (checked, or typed right on Commander). */
export function watchSteps(p: PuzzleCtx, ws: StepWorksheet, steps: Step[], onStep: (i: number) => void): void {
  const seen = new Set<number>();
  const flat = (a: Step['answer']) => (typeof a === 'number' ? [a] : (a as number[] | number[][]).flat());
  p.tick(() => {
    const rows = [...ws.el.querySelectorAll('.ws-row')];
    rows.forEach((row, i) => {
      if (seen.has(i)) return;
      const vals = [...row.querySelectorAll('input')].map((x) => parseNum((x as HTMLInputElement).value));
      const want = flat(steps[i].answer);
      const typedRight = vals.length === want.length && vals.every((v, k) => v !== null && Math.abs(v - want[k]) < 1e-6);
      if (row.classList.contains('ok') || typedRight) { seen.add(i); onStep(i); }
    });
  });
}

/**
 * Before the naming beats (augmented matrix, row operation, pivot): plain words on the board's own labels,
 * and key help for the moves this board allows (add and swap; no multiply).
 */
function plainBoard(board: RowOpsBoard): void {
  board.el.querySelector('.rob-rowlist')?.setAttribute('aria-label', 'Rows of the board');
  board.el.querySelector('.rob-hist')?.setAttribute('aria-label', 'Steps so far');
  board.el.querySelector('.rob-undo')?.setAttribute('title', 'Undo the last step (U or Ctrl+Z)');
  const keys = board.el.querySelector('.rob-keys');
  if (keys) keys.textContent = 'Keys: ↑ ↓ choose a row · A add · Alt+↑ ↓ swap · U undo';
}

/** The par / steps readout used by the board puzzles. */
function stepsReadout(p: PuzzleCtx, board: RowOpsBoard, par: number, note: string) {
  const r = p.readout('The planes');
  r.note(note);
  const paint = () => { r.row('ops', 'Steps so far', String(board.moves())); r.row('par', 'Fewest needed', String(par)); };
  paint();
  board.subscribe(() => paint());
  return r;
}

// ------------------------------------------------------------------ p1: make the staircase

const stayPredict: Prediction = {
  prompt: 'You replace row 2 with (row 2 − 2 × row 1). What happens to the yellow light where the three planes meet?',
  choices: [{ id: 'stay', text: 'It stays where it is' }, { id: 'slide', text: 'It slides along a plane' }, { id: 'gone', text: 'The planes stop meeting' }],
  answer: 'stay',
  reveal: 'It stays. The point makes rows 1 and 2 true, so it also makes (row 2 − 2 × row 1) true. Plane 2 turns about the line it shares with plane 1, and the point is on that line.',
};

export const p1: PuzzleDef = {
  id: 'c09-p1',
  title: 'Can we untangle the meters?',
  goal: 'Turn the board into a **staircase**: zeros under the first number of row 1, then a zero under the first number of row 2. Drag a row onto another to subtract a multiple of it.',
  subgoals: ['Zeros under the first number of row 1', 'A zero under the first number of row 2'],
  predict: stayPredict,
  hints: [
    'Drag row 1 onto row 2. The board fills in −2: that makes a 0 under the first number.',
    'Then drag row 1 onto row 3, and row 2 onto row 3.',
    'R2 → R2 − 2R1, then R3 → R3 − R1, then R3 → R3 − R2.',
  ],
  par: P1.par,
  view: '3d',
  onWin: S.p1Win,
  setup(p) {
    hideSolutionLabel(p);
    // p1 comes before "row operation" and "pivot" are named: no multiply (its composer speaks of pivots)
    const board = new RowOpsBoard(p, { aug: P1.aug, n: 3, title: 'The power board', showSolution: false, ops: ['add', 'swap'] });
    board.el.classList.add('c09-nochips');
    plainBoard(board);
    new SystemView(p, { n: 3, aug: P1.aug, board, varNames: ['x', 'y', 'z'] });
    stepsReadout(p, board, P1.par, 'Each step turns one plane about the yellow light. The light does not move.');
    const check = () => {
      const m = board.get();
      p.subgoal(0, firstColumnCleared(m));
      p.subgoal(1, p1Won(m));
      if (p1Won(m)) p.win();
    };
    board.subscribe(() => check());
    const ops = () => gaussSteps(board.get(), 3).ops;
    return {
      async showMe() { await board.play(ops(), 800); },
      async solve() { await board.play(ops(), 30); },
      async wrong() { await board.apply({ kind: 'add', i: 1, j: 0, k: new Frac(-2) }, false); },
    };
  },
};

// ------------------------------------------------------------------ p2: climb back

const genLamps = (p: PuzzleCtx) => {
  const r = p.readout('Generators');
  const lamps = [0, 1, 2].map((i) => {
    const v = h('span', { class: 'gv' }, '—');
    const el = h('div', { class: 'c09-gen' }, h('span', { class: 'lamp' }), h('span', { class: 'gk' }, `G${i + 1}`), v);
    return { el, v };
  });
  r.el.insertBefore(h('div', { class: 'c09-gens' }, ...lamps.map((l) => l.el)), r.el.children[1] ?? null);
  return (i: number, value: number) => { lamps[i].el.classList.add('on'); lamps[i].v.textContent = `${num(value)} u`; sfx.success(); };
};

export const p2: PuzzleDef = {
  id: 'c09-p2',
  title: 'What does each generator give?',
  goal: 'Read the staircase from the **bottom row up**. Each value you find lights its generator.',
  hints: [
    'Row 3 reads $z = 3$.',
    'Row 2 reads $y + 2z = 8$. Put $z = 3$ in: $y = 8 - 6$.',
    'Row 1 reads $x + 2y + z = 8$. With $y = 2$ and $z = 3$: $x = 8 - 4 - 3 = 1$.',
  ],
  par: 3,
  view: '3d',
  onWin: S.p2Win,
  setup(p) {
    hideSolutionLabel(p);
    const board = new RowOpsBoard(p, { aug: P1.staircase, n: 3, title: 'The staircase', showSolution: false, keyHelp: false });
    board.setEnabled(false);
    board.el.classList.add('c09-static', 'c10-norref');
    new SystemView(p, { n: 3, aug: P1.staircase, board });
    const light = genLamps(p);
    const steps: Step[] = [
      { prompt: 'Row 3 reads $z = 3$. So $z =$', answer: 3 },
      { prompt: 'Row 2 reads $y + 2z = 8$. With $z = 3$, $y =$', answer: 2, mistakes: [[14, 'That adds $2z$. Move it across instead: $y = 8 - 2(3)$.']] },
      { prompt: 'Row 1 reads $x + 2y + z = 8$. With $y = 2$, $z = 3$, $x =$', answer: 1, mistakes: [[7, 'Take away both: $x = 8 - 2(2) - 3$.'], [15, 'Those are added. Move them across: $x = 8 - 4 - 3$.']] },
    ];
    const ws = new StepWorksheet(p, { steps, onDone: () => p.win() });
    watchSteps(p, ws, steps, (i) => light(2 - i, P1.answer[2 - i]));
    return {
      async showMe() { await ws.showMe(700); },
      solve() { ws.solve(); },
      wrong() { ws.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p3: zero on top

export const p3: PuzzleDef = {
  id: 'c09-p3',
  title: 'What if the first number is 0?',
  goal: 'Row 1 starts with 0, so it cannot clear the $x$ column. **Swap** first, then make the staircase. Then climb back and type the point.',
  subgoals: ['Row echelon form', 'Type the point where the planes meet'],
  hints: [
    'Press ⇅ between rows 1 and 2 to swap them.',
    'Clear the $x$ column under the new row 1, then the $y$ column under row 2.',
    'R1 ↔ R2, R3 → R3 − 2R1, R3 → R3 + ½R2. Then $z = 1$, $y = 2$, $x = 1$.',
  ],
  par: P3.par,
  view: '3d',
  onWin: S.p3Win,
  setup(p) {
    hideSolutionLabel(p);
    const board = new RowOpsBoard(p, { aug: P3.aug, n: 3, showSolution: false });
    board.el.classList.add('c10-norref');
    new SystemView(p, { n: 3, aug: P3.aug, board });
    stepsReadout(p, board, P3.par, 'A swap changes the order of the equations. Each plane stays exactly where it is.');
    let typed: number[] | null = null;
    const check = () => {
      const m = board.get();
      const ref = p3Won(m, P3.answer);
      p.subgoal(0, ref);
      if (p3Won(m, typed)) p.win();
    };
    const inp = placeInput(p, 'The point (x, y, z)', 3, [0, 0, 0], (v) => {
      typed = v;
      const ok = v.every((x, i) => Math.abs(x - P3.answer[i]) < 1e-9);
      p.subgoal(1, ok);
      if (!ok) { sfx.miss(); p.bark('lantern', `${pt(v)} is not on all three planes. Read the bottom row first.`); }
      check();
    });
    p.dock().append(inp.el);
    board.subscribe(() => check());
    const ops = () => gaussSteps(board.get(), 3).ops;
    const answer = () => { inp.set(P3.answer); typed = P3.answer.slice(); p.subgoal(1, true); check(); };
    return {
      async showMe() { await board.play(ops(), 800); await wait(300); answer(); },
      async solve() { await board.play(ops(), 30); answer(); },
      async wrong() { await board.play(ops(), 0); inp.set([1, 1, 2]); typed = [1, 1, 2]; check(); },
    };
  },
};

// ------------------------------------------------------------------ p4 [D]: break it on purpose

const P4_TILES = [
  { id: 'true', text: '(1, 2) makes row 1 true and row 2 true.' },
  { id: 'comb', text: 'Adding k × (a true equation) to a true equation gives a true equation.' },
  { id: 'new', text: 'So (1, 2) makes the new row 2 true: no solution is lost.' },
  { id: 'undo', text: 'Adding −k × row 1 brings the old row 2 back, so no new solution appears either.' },
  { id: 'same', text: 'So the solutions are exactly the same.' },
];
const P4_DECOYS = [{ id: 'zero', text: 'Multiplying a row by 0 can be undone the same way.' }];

/** A small static matrix [A | b] in the DOM, rows in their colours. */
function matEl(m: Aug, n: number, bad: boolean[][] = []): HTMLElement {
  const el = h('div', { class: 'c09-mat', style: `grid-template-columns: repeat(${n}, auto) auto` });
  m.forEach((row, i) => row.forEach((x, c) => el.appendChild(h('span', { class: `r${i}${c === n ? ' bar' : ''}${bad[i]?.[c] ? ' bad' : ''}` }, num(x)))));
  return el;
}

export const p4: PuzzleDef = {
  id: 'c09-p4',
  title: 'Which moves break the answer?',
  goal: 'In the sandbox, try each **forbidden** move and watch the yellow point. Undo each one. Then make one **legal** row operation and watch the point stay.',
  subgoals: ['Multiply a row by 0, then undo', 'Change one side only, then undo', 'Swap two columns, then undo', 'A legal row operation keeps the point', 'Say why'],
  hints: [
    'Press a forbidden move, watch what happens to the yellow point, then press Undo.',
    'For the legal move, pick a k and press Apply: row 2 becomes row 2 + k × row 1.',
    'A combination of true equations is true, and adding −k × row 1 undoes adding k × row 1.',
  ],
  par: 9,
  view: '2d',
  onWin: S.p4Win,
  setup(p) {
    const d = p.difficulty;
    let m: Aug = P4.aug.map((r) => r.slice());
    const planes = new PlaneSet(p, { n: 2, rows: m, names: ['x', 'y'], box: P4_BOX });
    boxFrame(p, P4_BOX);
    void planes.frame({ height: 9, target: [1, 1.5] });
    const trail = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 0]], { color: C.orange, width: 2, opacity: 0, dashed: true, dashSize: 0.16, gapSize: 0.1 });
    p.add(trail.object);
    p.onDispose(() => trail.dispose());
    const done = [false, false, false, false, d === 'cadet'];
    // Navigator: typed steps; Commander: order the reasons, then the last line
    let why: StepWorksheet | TileOrder | null = null;
    let ws: StepWorksheet | null = null;
    let ordered = false, typed = false;
    const box = h('div');
    let pending: string | null = null;
    // the "why" step replaces the sandbox controls, so it opens only once all four sandbox subgoals are
    // done (forbidden moves and the legal move in either order) and no forbidden move waits for Undo
    const tick = (i: number) => {
      if (!done[i]) { done[i] = true; p.subgoal(i); }
      if (d !== 'cadet' && !why && !pending && done.slice(0, 4).every(Boolean)) startWhy();
      if (done.every(Boolean)) { sfx.success(); p.win(); }
    };
    if (d === 'cadet') p.subgoal(4);
    const matBox = h('div');
    const msg = h('div', { class: 'c09-msg' });
    const paint = () => matBox.replaceChildren(matEl(m, 2));
    let saved: Aug | null = null;
    const where = (a: Aug) => { const k = classifyAug(a); return k.kind === 'unique' ? `the point ${pt(somePoint(a)!)}` : k.kind === 'infinite' ? 'a whole line' : 'nowhere'; };
    const show = async (next: Aug) => {
      const before = somePoint(m);
      m = next;
      paint();
      await planes.setRows(m, 700);
      const after = somePoint(m);
      if (before && after && classifyAug(m).kind === 'unique' && Math.hypot(after[0] - before[0], after[1] - before[1]) > 1e-9) {
        trail.setPoints([[before[0], before[1], 0.03], [after[0], after[1], 0.03]]); trail.setOpacity(0.9);
      } else trail.setOpacity(0);
    };
    const forbiddenBtns = P4_FORBIDDEN.map((f, i) => {
      const b = h('button', { class: 'btn small', type: 'button' }, f.label) as HTMLButtonElement;
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (pending) return;
        p.move();
        saved = m.map((r) => r.slice());
        pending = f.id;
        await show(f.apply(m));
        sfx.miss();
        g4.forEach((x) => { x.disabled = true; });
        undo.disabled = false;
        const text = f.id === 'zero' ? `Row 2 is now 0 = 0, true everywhere. Its line is gone. The answer is now ${where(m)}.`
          : f.id === 'side' ? `Only one side changed, so the equation is a different one. The point jumped to ${where(m).replace('the point ', '')}.`
          : `x and y traded places in both rows. The point jumped to ${where(m).replace('the point ', '')}.`;
        msg.className = 'c09-msg bad'; msg.textContent = text;
        p.bark('lantern', text);
        void i;
      });
      return b;
    });
    const undo = h('button', { class: 'btn small primary', type: 'button' }, 'Undo') as HTMLButtonElement;
    undo.disabled = true;
    undo.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!pending || !saved) return;
      const id = pending;
      p.move();
      await show(saved);
      trail.setOpacity(0);
      pending = null;
      undo.disabled = true;
      g4.forEach((x) => { x.disabled = false; });
      forbiddenBtns[P4_FORBIDDEN.findIndex((f) => f.id === id)].classList.add('done');
      msg.className = 'c09-msg';
      msg.textContent = id === 'zero' ? 'Restored from the saved copy. No row operation brings a row back from all zeros.' : 'Restored. The point is back at (1, 2).';
      tick(P4_FORBIDDEN.findIndex((f) => f.id === id));
    });
    let k = 2;
    const sk = new Slider({ label: 'row 2 → row 2 + $k$ × row 1', min: -3, max: 3, step: 1, value: k, onInput: (v) => { k = v; } });
    const apply = h('button', { class: 'btn small', type: 'button' }, 'Apply') as HTMLButtonElement;
    apply.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (pending) return;
      if (k === 0) { msg.className = 'c09-msg bad'; msg.textContent = 'Adding 0 × row 1 changes nothing. Pick another k.'; sfx.miss(); return; }
      p.move();
      await show(addRow(m, 1, 0, k));
      planes.pulse();
      sfx.success();
      msg.className = 'c09-msg good';
      msg.textContent = `Row 2 turned about (1, 2). The point stayed at ${where(m).replace('the point ', '')}.`;
      tick(3);
    });
    const g4 = [...forbiddenBtns, apply];
    p.dock().append(h('div', { class: 'kicker' }, 'Sandbox matrix'), matBox,
      h('div', { class: 'kicker' }, 'Forbidden moves'), h('div', { class: 'c09-btns' }, ...forbiddenBtns, undo),
      h('div', { class: 'kicker' }, 'A legal row operation'), h('div', { class: 'c09-row' }, sk.el, apply), msg);
    paint();
    function startWhy(): void {
      // the k on screen, read from the matrix, not the slider, which may have moved since (or Apply landed twice)
      const applied = p4AppliedK(m);
      const kk = applied || 2;
      const row = addRow(P4.aug, 1, 0, kk)[1];
      const tn = (x: number) => (x < 0 ? `(${x})` : String(x));
      const kw = kk < 0 ? `(−${-kk})` : String(kk);
      const steps: Step[] = d === 'navigator' ? [
        { prompt: 'At (1, 2), row 1 reads $2(1) + 2 =$', answer: 4 },
        { prompt: 'Row 2 reads $1 - 2 =$', answer: -1 },
        { prompt: `Row 2 + ${kw} × row 1 reads $-1 + ${tn(kk)}(4) =$`, answer: -1 + 4 * kk },
        { prompt: `${applied ? 'The new row 2 is' : 'With $k = 2$, the new row 2 would be'} $[\\,${row[0]}\\;\\;${row[1]} \\mid ${row[2]}\\,]$. At (1, 2) it reads $${tn(row[0])}(1) + ${row[1] === 1 ? '2' : `${tn(row[1])}(2)`} =$`, answer: -1 + 4 * kk },
        { prompt: `To undo row 2 + ${kw} × row 1, add this many times row 1:`, answer: -kk },
      ] : [{ prompt: 'To undo $R_2 \\to R_2 + 3R_1$, add this many times $R_1$:', answer: -3 }];
      ws = new StepWorksheet(p, { steps, mount: box, title: d === 'navigator' ? 'Why the point stays · each step is checked' : 'The last line', onDone: () => { typed = true; if (d === 'navigator' || ordered) tick(4); } });
      why = ws;
      if (d === 'commander') {
        const tmsg = h('div', { class: 'c09-msg' });
        const tiles = new TileOrder(p, {
          tiles: P4_TILES, decoys: P4_DECOYS, title: 'Put the reasons in order', submitLabel: 'Check order', mount: h('div'),
          onSubmit: (o) => {
            p.move();
            if (o.join() === P4_TILES.map((t) => t.id).join()) { ordered = true; tmsg.className = 'c09-msg good'; tmsg.textContent = 'That is the argument.'; sfx.snap(); if (typed) tick(4); }
            else { tmsg.className = 'c09-msg bad'; tmsg.textContent = o.includes('zero') ? 'A row of zeros cannot be undone: the equation is gone.' : 'Not in that order. Start from what (1, 2) makes true.'; sfx.miss(); }
          },
        });
        box.replaceChildren(tiles.el, tmsg, ws.el);
        why = tiles;
      }
      p.dock().replaceChildren(h('div', { class: 'kicker' }, 'Sandbox matrix'), matBox, box);
    }
    const solveAll = async (ms: number) => {
      const until = async (cond: () => boolean) => { for (let n = 0; n < 600 && !cond(); n++) await wait(10); };
      // a forbidden move still waiting for Undo: undo it first (this ticks its subgoal), so the pass below never stalls
      if (pending) { await until(() => !undo.disabled); undo.click(); await wait(ms ? 900 : 0); await until(() => pending === null); }
      for (const [i, b] of forbiddenBtns.entries()) {
        if (done[i]) continue;
        await until(() => !b.disabled && pending === null);
        b.click(); await wait(ms ? 1400 : 0);
        await until(() => !undo.disabled);
        undo.click(); await wait(ms ? 900 : 0);
        await until(() => pending === null && done[i]);
      }
      if (!done[3]) { await until(() => !apply.disabled); k = 2; sk.set(2, false); apply.click(); await wait(ms ? 900 : 0); await until(() => done[3]); }
      if (!done[4]) {
        if (why instanceof TileOrder) { why.set(P4_TILES.map((t) => t.id)); (why.el.querySelector('.btn.primary') as HTMLButtonElement | null)?.click(); }
        if (ws) { if (ms) await ws.showMe(350); else ws.solve(); }
      }
    };
    return {
      showMe: () => solveAll(1),
      solve: () => solveAll(0),
      async wrong() { forbiddenBtns[0].click(); await wait(50); },
    };
  },
};

// ------------------------------------------------------------------ p5 [H]: for which k?

export const p5: PuzzleDef = {
  id: 'c09-p5',
  title: 'For which gain k does it work?',
  goal: 'Type row 2 − 2 × row 1. Then two dials appear: drag $k$ and the right side to find **all three** cases: one point, a whole line, no point.',
  subgoals: ['Type $R_2 - 2R_1$', 'One solution', 'Infinitely many solutions', 'No solution'],
  hints: [
    'Row 2 − 2 × row 1: $2 - 2(1)$, then $k - 2(2)$, then the right side $6 - 2(3)$.',
    'The new row reads $(k - 4)y = c - 6$. If $k$ is not 4, you can divide by $k - 4$.',
    'One point: any $k$ but 4. A whole line: $k = 4$ and right side 6. No point: $k = 4$ and right side 7.',
  ],
  par: 6,
  view: '2d',
  onWin: S.p5Win,
  setup(p) {
    let k = 3, c = 6;
    const planes = new PlaneSet(p, { n: 2, rows: p5Rows(k, c), names: ['x', 'y'], focus: [3, 0], box: P5_BOX });
    boxFrame(p, P5_BOX);
    void planes.frame({ height: 11, target: [2.5, 0.5] });
    const done = [false, false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; p.subgoal(i); } if (done.every(Boolean)) { sfx.success(); p.win(); } };
    const r = p.readout('Row 2 − 2 × row 1');
    const paint = (moved: boolean) => {
      const red = p5Reduced(k, c);
      r.row('row', 'new row 2', `[ 0  ${num(red[1])} | ${num(red[2])} ]`, C.w);
      const kind = p5Kind(k, c);
      r.row('kind', 'The lines meet', kind === 'one' ? `at one point ${pt(somePoint(p5Rows(k, c))!)}` : kind === 'many' ? 'along a whole line' : 'nowhere', C.result);
      if (moved) tick(kind === 'one' ? 1 : kind === 'many' ? 2 : 3);
    };
    const upd = (moved: boolean) => { void planes.setRows(p5Rows(k, c), 250); paint(moved); window.setTimeout(() => planes.placeLabels(), 300); };
    const sk = new Slider({ label: 'gain $k$', min: 0, max: 8, step: 0.5, value: k, onInput: (v) => { k = v; p.move(); upd(true); } });
    const sc = new Slider({ label: 'right side of row 2', min: 4, max: 8, step: 1, value: c, onInput: (v) => { c = v; p.move(); upd(true); } });
    const steps: Step[] = [
      { prompt: 'First number: $2 - 2(1) =$', answer: 0 },
      { prompt: 'Second number: $k - 2(2) = k - $', answer: 4, mistakes: [[2, 'Twice row 1\'s second number is $2 \\times 2 = 4$.']] },
      { prompt: 'Right side: $6 - 2(3) =$', answer: 0 },
    ];
    // the dials appear once the new row is typed, so the three cases come from the reduced row, not from dragging
    r.note('Type the new row 2 first. Then two dials appear: the gain $k$ and the right side.');
    const ws = new StepWorksheet(p, { steps, onDone: () => { tick(0); r.note(null); p.dock().append(sk.el, sc.el); paint(false); } });
    const go = async (kk: number, cc: number, ms: number) => { k = kk; c = cc; sk.set(k, false); sc.set(c, false); p.move(); upd(true); await wait(ms); };
    return {
      async showMe() { await ws.showMe(400); await go(2, 6, 900); await go(4, 6, 1100); await go(4, 7, 1100); },
      async solve() { ws.solve(); await go(2, 6, 0); await go(4, 6, 0); await go(4, 7, 0); },
      wrong() { ws.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p6 [H]: by hand

/** The by-hand board: choose an operation, type the new row, apply. Navigator checks each row; Commander only the end. */
class HandBoard {
  m: Aug;
  readonly el: HTMLElement;
  private readonly matBox = h('div');
  private readonly msg = h('div', { class: 'c09-msg' });
  private readonly kind: HTMLSelectElement;
  private readonly target: HTMLSelectElement;
  private readonly source: HTMLSelectElement;
  private readonly kIn: HTMLInputElement;
  private readonly cells: HTMLInputElement[];
  private readonly typedBox: HTMLElement;
  private wrongs = 0;
  ops = 0;
  fractions = false;
  constructor(private readonly p: PuzzleCtx, start: Aug, private readonly onChange: (m: Aug, op: RowOp | null) => void, private readonly onDone: () => void) {
    this.m = start.map((r) => r.slice());
    const sel = (opts: [string, string][]) => { const s = h('select', { class: 'law-slot' }) as HTMLSelectElement; for (const [v, t] of opts) s.append(h('option', { value: v }, t)); return s; };
    this.kind = sel([['add', 'add a multiple of a row'], ['swap', 'swap two rows'], ['scale', 'multiply a row']]);
    this.target = sel([['0', '1'], ['1', '2'], ['2', '3']]);
    this.source = sel([['0', '1'], ['1', '2'], ['2', '3']]);
    this.target.value = '1';
    this.kIn = h('input', { class: 'cell', style: 'width:64px', value: '-2', 'aria-label': 'k', spellcheck: 'false' }) as HTMLInputElement;
    this.cells = [0, 1, 2, 3].map((i) => h('input', { class: 'cell', style: 'width:52px', 'aria-label': `new row entry ${i + 1}`, spellcheck: 'false' }) as HTMLInputElement);
    this.typedBox = h('div', { class: 'c09-row' }, h('span', null, 'New row:'), ...this.cells.slice(0, 3), h('span', null, '|'), this.cells[3]);
    const applyBtn = h('button', { class: 'btn small primary', type: 'button', onclick: () => this.apply() }, 'Apply');
    const doneBtn = h('button', { class: 'btn small', type: 'button', onclick: () => this.finish() }, 'Staircase done');
    const desc = h('div', { class: 'c09-row' });
    const syncUi = () => {
      const k = this.kind.value;
      if (k === 'add') desc.replaceChildren(h('span', null, 'Row'), this.target, h('span', null, '→ itself +'), this.kIn, h('span', null, '× row'), this.source);
      else if (k === 'scale') desc.replaceChildren(h('span', null, 'Row'), this.target, h('span', null, '→'), this.kIn, h('span', null, '× itself'));
      else desc.replaceChildren(h('span', null, 'Swap row'), this.target, h('span', null, 'with row'), this.source);
      this.typedBox.hidden = k === 'swap';
    };
    this.kind.addEventListener('change', syncUi);
    this.el = h('div', { class: 'c09-hand' }, h('div', { class: 'kicker' }, 'The power board, by hand'), this.matBox,
      h('div', { class: 'c09-row' }, h('span', null, 'Move:'), this.kind), desc, this.typedBox,
      h('div', { class: 'c09-row' }, applyBtn, p.difficulty === 'commander' ? doneBtn : null), this.msg);
    this.el.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') this.apply(); });
    syncUi();
    this.paint();
  }
  private paint(): void { this.matBox.replaceChildren(matEl(this.m, 3)); }
  private say(text: string, cls: 'good' | 'bad' | '' = ''): void { this.msg.className = `c09-msg ${cls}`; this.msg.textContent = text; }
  /** The operation described by the controls, or null. */
  private op(): RowOp | null {
    const i = Number(this.target.value), j = Number(this.source.value);
    if (this.kind.value === 'swap') return i === j ? null : { kind: 'swap', i: Math.min(i, j), j: Math.max(i, j) };
    const kv = parseNum(this.kIn.value);
    if (kv === null || kv === 0) return null;
    const k = Frac.from(kv);
    if (this.kind.value === 'scale') return { kind: 'scale', i, k };
    return i === j ? null : { kind: 'add', i, j, k };
  }
  /** Fill the controls and the typed row with an operation (Show me). */
  fill(op: RowOp, typedRow?: number[]): void {
    this.kind.value = op.kind;
    this.kind.dispatchEvent(new Event('change'));
    this.target.value = String(op.i);
    if (op.kind !== 'scale') this.source.value = String(op.kind === 'swap' ? op.j : op.j);
    if (op.kind !== 'swap') this.kIn.value = num(op.k.value()).replace('−', '-');
    const row = typedRow ?? (op.kind === 'swap' ? null : expectedRow(this.m, op));
    if (row) row.forEach((x, c) => { this.cells[c].value = num(x).replace('−', '-'); });
  }
  apply(): boolean {
    const op = this.op();
    if (!op) { this.say('Pick two different rows and a number that is not 0.', 'bad'); sfx.miss(); return false; }
    this.p.move();
    let next: Aug;
    if (op.kind === 'swap') next = this.m.map((r, q) => (q === op.i ? this.m[op.j] : q === op.j ? this.m[op.i] : r).slice());
    else {
      const typed = this.cells.map((c) => parseNum(c.value));
      if (typed.some((v) => v === null)) { this.say('Type all four numbers of the new row.', 'bad'); sfx.miss(); return false; }
      const want = expectedRow(this.m, op);
      const right = typed.every((v, c) => Math.abs((v as number) - want[c]) < 1e-9);
      if (!right && this.p.difficulty === 'navigator') {
        this.wrongs++;
        const off = typed.findIndex((v, c) => Math.abs((v as number) - want[c]) > 1e-9);
        const rule = op.kind === 'scale' ? 'Each entry is k × (the old entry), right side included.' : 'Each entry is (old entry) + k × (the other row\'s entry), right side included.';
        this.say(`Entry ${off + 1} is off. ${rule}`, 'bad');
        sfx.miss();
        return false;
      }
      next = this.m.map((r, q) => (q === op.i ? (typed as number[]) : r.slice()));
    }
    this.m = next;
    this.ops++;
    if (!noFractions(this.m)) this.fractions = true;
    this.paint();
    this.cells.forEach((c) => { c.value = ''; });
    this.say(this.p.difficulty === 'commander' ? 'Applied as typed.' : 'Right. Applied.', 'good');
    sfx.snap();
    this.onChange(this.m, op);
    if (this.p.difficulty === 'navigator' && p6Final(this.m)) this.onDone();
    return true;
  }
  finish(): void {
    this.p.move();
    if (p6Final(this.m)) { this.say('A staircase with the same answer as the original board.', 'good'); this.onDone(); }
    else if (!sameSolutions(this.m, P1.aug)) { this.say('This board no longer has the original answer: a row was typed wrong somewhere. Watch the yellow light: it moved.', 'bad'); sfx.miss(); }
    else { this.say('Same answer, but not a staircase yet: clear below each first number.', 'bad'); sfx.miss(); }
  }
}

export const p6: PuzzleDef = {
  id: 'c09-p6',
  title: 'Can you untangle it by hand?',
  goal: 'The power board again, with LANTERN\'s arithmetic off. Choose each row operation, **type the new row**, and apply it. Reach the staircase.',
  subgoals: ['Staircase, by hand'],
  hints: [
    'Row 2 → row 2 + (−2) × row 1. Each new entry is (row 2 entry) − 2 × (row 1 entry), right side too.',
    'Row 2 becomes 0, 1, 2 | 8. Then row 3 → row 3 + (−1) × row 1 gives 0, 1, 3 | 11.',
    'Last: row 3 → row 3 + (−1) × row 2 gives 0, 0, 1 | 3.',
  ],
  par: P1.par,
  view: '3d',
  onWin: S.p6Win,
  setup(p) {
    hideSolutionLabel(p);
    if (p.difficulty === 'cadet') {
      // Cadet: LANTERN computes each new row; the player chooses the operations
      const board = new RowOpsBoard(p, { aug: P1.aug, n: 3, title: 'The power board · LANTERN computes', showSolution: false });
      board.el.classList.add('c10-norref');
      new SystemView(p, { n: 3, aug: P1.aug, board });
      board.subscribe(() => { const m = board.get(); p.subgoal(0, p1Won(m)); if (p1Won(m)) { if (noFractions(num2(m))) p.bark('bram', 'And not one fraction on the board. Tidy.'); p.win(); } });
      return {
        async showMe() { await board.play(gaussSteps(board.get(), 3).ops, 800); },
        async solve() { await board.play(gaussSteps(board.get(), 3).ops, 30); },
      };
    }
    const planes = new PlaneSet(p, { n: 3, rows: P1.aug, solutionLabel: false });
    void planes.frame({ distance: 22 });
    const r = p.readout('The planes');
    r.note('Typed right, each step turns one plane about the yellow light. Typed wrong, the light moves.');
    const hb: HandBoard = new HandBoard(p, P1.aug, (m) => { void planes.setRows(m, 700); }, () => {
      p.subgoal(0);
      if (!hb.fractions) p.bark('bram', 'And not one fraction on the board. Tidy.');
      p.win();
    });
    p.dock().append(hb.el);
    const run = async (ms: number) => {
      for (const op of gaussSteps(fmat(hb.m), 3).ops) { hb.fill(op); if (ms) await wait(ms); hb.apply(); if (ms) await wait(ms); }
      if (p.difficulty === 'commander') hb.finish();
    };
    return {
      showMe: () => run(600),
      solve: () => run(0),
      wrong() { hb.fill({ kind: 'add', i: 1, j: 0, k: new Frac(-2) }, [0, 1, 2, 9]); hb.apply(); if (p.difficulty === 'commander') hb.finish(); },
    };
  },
};
