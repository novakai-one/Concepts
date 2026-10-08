// Chapter 10 puzzles: finish the job (p1), a line of answers (p2), the lying meter (p3), a plane of
// answers (p4 [H]), k and m (p5 [H]), one answer plus the zero-right-side answers (p6 [D]), and the
// Act III set piece (power to the pod bay).
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, MeshBasicMaterial } from 'three';
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { RowOpsBoard } from '../../../kit/rowops';
import { SystemView } from '../../../kit/system';
import { StepWorksheet, TileOrder, type Step } from '../../../kit/steps';
import { VectorHandle } from '../../../kit/handle';
import { fmat, Frac } from '../../../math/frac';
import { applyOp, gaussJordanSteps, type RowOp } from '../../../math/rref';
import { Slider } from '../../../ui/widgets';
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { sfx } from '../../../audio/sfx';
import { animate, ease, wait } from '../../../core/tween';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { PlanePatch } from '../../../gfx/shapes';
import { PlaneSet } from '../c08-systems/planes';
import { hasFalseRow, kindOf, num, pt, somePoint } from '../c08-systems/act3';
import { watchSteps } from '../c09-elimination/puzzles';
import {
  P1, P2, P3, P4, P6, PAR, SP, flowsAt, p1Won, p3Consistent, p3Presses, p3Rows, p4Point, p5Reduced, p5Rows, p6Won, pipesOk, spBurn,
  spConsistent, spDroneWon, spFlowsOk, spHit, totalLoad, distToP2Line,
} from './logic';
import { S } from './script';
import { normLine } from '../../lines';
import '../c08-systems/act3.css';

const X = ['x_1', 'x_2', 'x_3'];
const tolOf = (p: PuzzleCtx) => (p.difficulty === 'commander' ? 0.01 : 0.05);

/** Pipe bars (0 … max) in a readout; returns a painter. */
function pipes(p: PuzzleCtx, title: string, names: string[], max: number) {
  const r = p.readout(title);
  const rows = names.map((n) => {
    const fill = h('span', { class: 'fill' });
    const v = h('span', { class: 'pv' }, '—');
    const el = h('div', { class: 'c10-pipe' }, h('span', { html: n }), h('span', { class: 'bar' }, fill), v);
    return { el, fill, v };
  });
  r.el.insertBefore(h('div', { class: 'c10-pipes' }, ...rows.map((x) => x.el)), r.el.children[1] ?? null);
  return {
    r,
    paint(vals: number[]) {
      vals.forEach((x, i) => {
        const over = x < -1e-9 || x > max + 1e-9;
        rows[i].el.classList.toggle('over', over);
        rows[i].fill.style.width = `${Math.max(0, Math.min(1, x / max)) * 100}%`;
        rows[i].v.textContent = num(x);
      });
    },
  };
}

// ------------------------------------------------------------------ p1: finish the job

export const p1: PuzzleDef = {
  id: 'c10-p1',
  title: 'Can we skip the climb?',
  goal: 'Keep going past the staircase: make every **pivot 1**, with **zeros above and below** it. Then each row names one unknown.',
  subgoals: ['Zeros above every pivot', 'Every row names one unknown'],
  hints: [
    'Clear above the second pivot first: drag row 2 onto row 1.',
    'Then clear above the third pivot: drag row 3 onto row 1, and row 3 onto row 2.',
    'R1 → R1 − 2R2, R1 → R1 + 3R3, R2 → R2 − 2R3.',
  ],
  par: P1.par,
  view: '3d',
  onWin: S.p1Win,
  setup(p) {
    const board = new RowOpsBoard(p, { aug: P1.aug, n: 3, title: 'The power board' });
    board.el.classList.add('c10-norref');
    new SystemView(p, { n: 3, aug: P1.aug, board });
    const r = p.readout('The planes');
    r.note('Each step turns one plane about the yellow point. Finished, every plane stands square to one axis.');
    const paint = () => { r.row('ops', 'Steps so far', String(board.moves())); r.row('par', 'Fewest needed', String(P1.par)); };
    paint();
    board.subscribe(() => {
      paint();
      const m = board.get();
      p.subgoal(0, m[0][1].isZero() && m[0][2].isZero() && m[1][2].isZero());
      p.subgoal(1, p1Won(m));
      if (p1Won(m)) p.win();
    });
    const ops = () => gaussJordanSteps(board.get(), 3).ops;
    return {
      async showMe() { await board.play(ops(), 800); },
      async solve() { await board.play(ops(), 30); },
      async wrong() { await board.apply({ kind: 'add', i: 0, j: 1, k: new Frac(-2) }, false); },
    };
  },
};

// ------------------------------------------------------------------ p2: a line of answers

export const p2: PuzzleDef = {
  id: 'c10-p2',
  title: 'How can the power be routed?',
  goal: 'Reduce the flows until every pivot is 1 with zeros above and below. One column has **no pivot**: its dial slides the yellow point along the line. Route the power so **every pipe carries between 0 and 5**.',
  subgoals: ['Every pivot 1, zeros above and below', 'Find the column with no pivot', 'Every pipe between 0 and 5'],
  hints: [
    'Drag row 1 onto row 3, then row 2 onto row 3: the bottom row becomes all zeros.',
    'Then clear above the second pivot. The third column, $x_3$, has no pivot: call its value t. Then $x_1 = 3 + t$ and $x_2 = 1 + t$.',
    'Any t from 0 to 2 keeps every pipe between 0 and 5. t = 0 gives the least total load: 4.',
  ],
  par: PAR.p2,
  view: '3d',
  onWin: S.p2Win,
  setup(p) {
    const d = p.difficulty;
    const board = new RowOpsBoard(p, { aug: P2.aug, n: 3, varNames: X, showSolution: false, title: 'Pod bay conduits' });
    new SystemView(p, { n: 3, aug: P2.aug, board, varNames: X });
    const bars = pipes(p, 'Pipes (units)', ['<i>x</i><sub>1</sub>', '<i>x</i><sub>2</sub>', '<i>x</i><sub>3</sub>'], P2.max);
    // the panel keeps its final height from the start, so the 3-D labels placed around it stay clear
    bars.r.row('load', 'Total load', '—', C.result);
    bars.r.note('Reduce the board first. Then a dial appears, and each of its values routes the power one way.');
    const done = [false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; p.subgoal(i); } };
    // the dial starts with pipe 3 below 0: the player turns it to route the power
    let t = P2.dial.start;
    let dot: Dot | null = null;
    let slider: Slider | null = null;
    let least = false;
    /** Paint the flows at t (no checks). */
    const moveT = (v: number) => {
      t = v;
      const f = flowsAt(t);
      dot?.at([f[0], f[1], f[2]]);
      bars.paint(f);
      bars.r.row('load', 'Total load', num(totalLoad(t)), C.result);
    };
    /** A setting chosen by the player (or Show me): check the pipes. */
    const routed = () => {
      if (Math.abs(t) < 1e-9 && !least) { least = true; const l = normLine(S.p2Least[0]); p.bark(l.who, l.text); }
      if (pipesOk(t)) { tick(2); if (done.every(Boolean)) { sfx.success(); p.win(); } }
    };
    const startDial = () => {
      tick(1);
      dot = new Dot(flowsAt(t) as V3, { color: C.result, size: 0.16, glow: 2.6 });
      p.add(dot);
      const step = P2.dial.step[d] ?? 0.25;
      // one drag of the dial (or one key press) counts one move, counted as it starts so a winning drag is in the score
      let counted = false;
      slider = new Slider({ label: 'dial $t = x_3$', min: P2.dial.min, max: P2.dial.max, step, value: t, onInput: (v) => { if (!counted) { counted = true; p.move(); } moveT(v); routed(); } });
      const input = slider.el.querySelector('input')!;
      const fresh = () => { counted = false; };
      input.addEventListener('pointerdown', fresh);
      input.addEventListener('keydown', fresh);
      input.addEventListener('change', fresh);
      dock.append(slider.el);
      bars.r.note('Each value of t is one way to route the power. Every plane stays satisfied. Turn the dial until every pipe is between 0 and 5.');
      moveT(t);
    };
    const dock = p.dock();
    let picker: HTMLElement | null = null;
    let ws: StepWorksheet | null = null;
    const startPick = () => {
      tick(0);
      if (d === 'cadet') { p.bark('lantern', 'Column three has no pivot. Its dial appears.'); startDial(); return; }
      if (d === 'navigator') {
        const msg = h('div', { class: 'c09-msg' });
        picker = h('div', null, h('div', { class: 'kicker' }, 'Which column has no pivot?'), h('div', { class: 'c10-cols' }, ...X.map((nm, i) => {
          const b = h('button', { class: 'btn small', type: 'button', html: `x<sub>${i + 1}</sub>` }) as HTMLButtonElement;
          b.addEventListener('click', () => {
            p.move();
            if (i === P2.free) { b.classList.add('picked'); msg.className = 'c09-msg good'; msg.textContent = 'No pivot in column 3. Its value can be anything: that is the dial.'; sfx.snap(); picker?.querySelectorAll('button').forEach((x) => { (x as HTMLButtonElement).disabled = true; }); startDial(); }
            else { msg.className = 'c09-msg bad'; msg.textContent = `Column ${i + 1} has a pivot: row ${i + 1} fixes $x_${i + 1}$ once the others are known.`.replace(/\$x_(\d)\$/, 'x$1'); sfx.miss(); }
            void nm;
          });
          return b;
        })), msg);
        dock.append(picker);
        return;
      }
      const steps: Step[] = [{ prompt: 'With $x_3 = t$: $x_1 = \\_ + t$', answer: 3 }, { prompt: '$x_2 = \\_ + t$', answer: 1 }];
      ws = new StepWorksheet(p, { steps, mount: dock, title: 'Write every answer first', onDone: () => startDial() });
    };
    board.subscribe(() => { if (!done[0] && board.isRREF()) startPick(); });
    const run = async (ms: number) => {
      if (!done[0]) await board.play(gaussJordanSteps(board.get(), 3).ops, ms ? 700 : 30);
      while (!done[0]) await wait(10);
      if (!done[1]) {
        if (picker) (picker.querySelectorAll('button')[P2.free] as HTMLButtonElement).click();
        if (ws) { if (ms) await ws.showMe(400); else ws.solve(); }
      }
      const from = t;
      if (ms) await animate(900, (k) => { const v = from * (1 - k); slider?.set(v, false); moveT(v); }, ease.inOut);
      slider?.set(0, false);
      moveT(0);
      routed();
    };
    return { showMe: () => run(1), solve: () => run(0) };
  },
};

// ------------------------------------------------------------------ p3: the lying meter

export const p3: PuzzleDef = {
  id: 'c10-p3',
  title: 'Is one of the meters lying?',
  goal: 'Meter three now reads 4. Reduce the board until a row says something impossible. Then change **one meter** so the pipes can agree again.',
  subgoals: ['A row reads 0 = 1', 'Change one meter so a solution exists'],
  predict: {
    prompt: 'Meter three reads 4 instead of 3. How many ways can the power flow now?',
    choices: [{ id: 'none', text: 'None' }, { id: 'one', text: 'Exactly one' }, { id: 'many', text: 'Still infinitely many' }],
    answer: 'none',
    reveal: 'None. Row 3 is row 1 plus row 2 on the left, so its right side must be 2 + 1 = 3. With 4 the rows contradict each other: reducing ends in $0 = 1$.',
  },
  hints: [
    'Drag row 1 onto row 3, then row 2 onto row 3. Read the bottom row.',
    'It reads $0 = 1$: no flows make that true. Meter three should equal meter one plus meter two.',
    'Set meter three back to 3 (or meter one to 3, or meter two to 2).',
  ],
  par: 3,
  view: '3d',
  onWin: S.p3Win,
  setup(p) {
    let b = P3.b.slice();
    const board = new RowOpsBoard(p, { aug: p3Rows(b), n: 3, varNames: X, title: 'Pod bay conduits' });
    new SystemView(p, { n: 3, aug: p3Rows(b), board, varNames: X });
    const done = [false, false];
    const r = p.readout('Meters');
    const box = h('div', { class: 'c10-meters' });
    r.el.insertBefore(box, r.el.children[1] ?? null);
    // every row operation so far: set() clears the board's history, so each replay banks what was done since the last one
    let ops: RowOp[] = [];
    const replay = () => {
      // the same row operations, applied to the board with the new meter readings
      ops = ops.concat(board.history());
      let m = fmat(p3Rows(b));
      for (const op of ops) m = applyOp(m, op);
      board.set(m);
    };
    const steppers = b.map((_, i) => {
      const v = h('span', { class: 'sv' }, String(b[i]));
      const mk = (dv: number, lab: string) => {
        const btn = h('button', { class: 'btn small', type: 'button' }, lab) as HTMLButtonElement;
        btn.addEventListener('click', () => {
          if (!done[0]) { p.bark('bram', 'Reduce the board first. Find out which meter it is.'); sfx.miss(); return; }
          p.move();
          b[i] = Math.max(0, Math.min(6, b[i] + dv));
          v.textContent = String(b[i]);
          replay();
          if (p3Consistent(b)) { done[1] = true; p.subgoal(1); sfx.success(); p.win(); }
        });
        return btn;
      };
      box.append(h('span', { html: `meter ${i + 1}` }), h('span', { class: 'c10-step' }, mk(-1, '−'), v, mk(1, '+')));
      return v;
    });
    void steppers;
    board.subscribe(() => { if (!done[0] && hasFalseRow(board.get())) { done[0] = true; p.subgoal(0); sfx.snap(); } });
    const run = async (ms: number) => {
      if (!done[0]) await board.play(gaussJordanSteps(board.get(), 3).ops, ms ? 700 : 30);
      while (!done[0]) await wait(10);
      if (ms) await wait(500);
      // press the real meter buttons until the meters agree (b₃ = b₁ + b₂), from whatever they read now;
      // from the start (2, 1, 4) that is one press: meter three down to 3
      const btns = box.querySelectorAll('button');
      for (const i of p3Presses(b)) {
        if (p.won) break;
        (btns[i] as HTMLButtonElement).click();
        if (ms) await wait(350);
      }
    };
    return { showMe: () => run(1), solve: () => run(0) };
  },
};

// ------------------------------------------------------------------ p4 [H]: a plane of answers

export const p4: PuzzleDef = {
  id: 'c10-p4',
  title: 'What if one equation has three unknowns?',
  goal: 'Write every answer of $x + 2y - z = 4$ as a point plus two directions. Then turn the two dials to land on the **three marked points**.',
  subgoals: ['The point with $y = z = 0$', 'The direction for $y$', 'The direction for $z$', 'Land on all three marked points'],
  hints: [
    'Solve for x: $x = 4 - 2y + z$. With $y = z = 0$ the point is (4, 0, 0).',
    'Raise y by 1 (z stays 0): x falls by 2. Direction (−2, 1, 0). Raise z by 1: x rises by 1. Direction (1, 0, 1).',
    'The marked points need dials (1, 0), (0, 2) and (1, −2).',
  ],
  par: PAR.p4, // fewest moves: cadet 4, navigator 7, commander 5 (each checked line counts one)
  view: '3d',
  onWin: S.p4Win,
  setup(p) {
    const planes = new PlaneSet(p, { n: 3, rows: [P4.row], showSolution: false, size: 8.5, focus: [3, 0.5, 0] });
    void planes.frame({ distance: 27, azimuth: -70, elevation: 26 });
    const targets = P4.targets.map((q, i) => new Dot(q as V3, { color: '#e8f1ff', size: 0.14, glow: 1.6, label: 'ABC'[i] }));
    p.add(...targets);
    const visited = [false, false, false];
    const done = [false, false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; p.subgoal(i); } if (done.every(Boolean)) { sfx.success(); p.win(); } };
    const steps: Step[] = [
      { prompt: 'With $y = z = 0$, the point $\\mathbf p$ is', answer: P4.p },
      { prompt: 'Raise $y$ by 1 ($z$ stays 0): the direction $\\cg{\\mathbf d_1}$ is', answer: P4.d1, mistakes: [[[2, 1, 0], 'x must fall by 2 so that $x + 2y$ stays the same.']] },
      { prompt: 'Raise $z$ by 1 ($y$ stays 0): the direction $\\cr{\\mathbf d_2}$ is', answer: P4.d2, mistakes: [[[-1, 0, 1], 'x must rise by 1 so that $x - z$ stays the same.']] },
    ];
    const dock = p.dock();
    let s = 0, t = 0;
    let base: Dot | null = null, a1: Arrow | null = null, a2: Arrow | null = null, end: Dot | null = null;
    let ss: Slider | null = null, st: Slider | null = null;
    const update = () => {
      const p0 = P4.p, m1 = p4Point(s, 0), q = p4Point(s, t);
      a1?.set(p0 as V3, m1 as V3);
      a2?.set(m1 as V3, q as V3);
      end?.at(q as V3);
      P4.targets.forEach((tg, i) => {
        if (!visited[i] && Math.hypot(q[0] - tg[0], q[1] - tg[1], q[2] - tg[2]) < 1e-6) { visited[i] = true; targets[i].setColor(C.result); sfx.success(); }
      });
      if (visited.every(Boolean)) tick(3);
    };
    const startDials = () => {
      base = new Dot(P4.p as V3, { color: '#e8f1ff', size: 0.12, label: 'p' });
      a1 = new Arrow(P4.p as V3, P4.p as V3, { color: C.v, width: 0.05 });
      a2 = new Arrow(P4.p as V3, P4.p as V3, { color: C.w, width: 0.05 });
      end = new Dot(P4.p as V3, { color: C.result, size: 0.16, glow: 2.6 });
      p.add(base, a1, a2, end);
      const step = p.difficulty === 'cadet' ? 1 : 0.5;
      ss = new Slider({ label: 'dial $s$ (on $\\cg{\\mathbf d_1}$)', min: -3, max: 3, step, value: 0, onInput: (v) => { s = v; p.move(); update(); } });
      st = new Slider({ label: 'dial $t$ (on $\\cr{\\mathbf d_2}$)', min: -3, max: 3, step, value: 0, onInput: (v) => { t = v; p.move(); update(); } });
      dock.append(ss.el, st.el);
      update();
    };
    let started = false;
    const ws = new StepWorksheet(p, { steps, onDone: () => { [0, 1, 2].forEach((i) => tick(i)); if (!started) { started = true; startDials(); } } });
    watchSteps(p, ws, steps, (i) => tick(i));
    const go = async (sv: number, tv: number, ms: number) => {
      if (ms) await animate(ms, (k) => { const a = s + (sv - s) * k, b = t + (tv - t) * k; ss?.set(a, false); st?.set(b, false); s = a; t = b; update(); }, ease.inOut);
      s = sv; t = tv; ss?.set(sv, false); st?.set(tv, false); p.move(); update();
    };
    const run = async (ms: number) => {
      if (!started) { if (ms) await ws.showMe(400); else ws.solve(); }
      while (!started) await wait(10);
      for (const [sv, tv] of P4.dials) await go(sv, tv, ms);
    };
    return { showMe: () => run(900), solve: () => run(0), wrong() { ws.wrong(); } };
  },
};

// ------------------------------------------------------------------ p5 [H]: k and m

export const p5: PuzzleDef = {
  id: 'c10-p5',
  title: 'For which k and m does the last junction work?',
  goal: 'Type the reduced last row. Then turn $k$ and $m$ to find **all three** cases: one point, a whole line, nothing.',
  subgoals: ['Type the reduced last row', 'One solution', 'Infinitely many solutions', 'No solution'],
  hints: [
    'R2 − R1 gives (0, 1, 2 | 1). R3 − R1 gives (0, 2, k − 1 | m − 1). Then R3 − 2R2.',
    'The last row is $[\\,0\\;\\;0\\;\\;k - 5 \\mid m - 3\\,]$.',
    'One point: k not 5. A line: k = 5 and m = 3. Nothing: k = 5 and m not 3.',
  ],
  par: 6,
  view: '3d',
  onWin: S.p5Win,
  setup(p) {
    let k = 6, m = 3;
    const planes = new PlaneSet(p, { n: 3, rows: p5Rows(k, m), size: 8, focus: [0, 1, 0] });
    void planes.frame({ distance: 23 });
    const done = [false, false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; p.subgoal(i); } if (done.every(Boolean)) { sfx.success(); p.win(); } };
    const r = p.readout('The reduced last row');
    // until the row is typed, the readout keeps it in symbols and the dials stay hidden: the numbers would give it away
    let typed = false;
    const paint = (moved: boolean) => {
      const red = p5Reduced(k, m);
      r.row('row', 'last row', typed ? `[ 0  0  ${num(red[2])} | ${num(red[3])} ]` : '[ 0  0  k − ? | m − ? ]', C.u);
      const kind = kindOf(p5Rows(k, m));
      r.row('kind', 'The planes meet', kind === 'one' ? `at ${pt(somePoint(p5Rows(k, m))!)}` : kind === 'many' ? 'along a line' : 'nowhere', C.result);
      if (moved) tick(kind === 'one' ? 1 : kind === 'many' ? 2 : 3);
    };
    const upd = (moved: boolean) => { void planes.setRows(p5Rows(k, m), 300); paint(moved); };
    const sk = new Slider({ label: '$k$', min: 2, max: 8, step: 0.5, value: k, onInput: (v) => { if (!typed) return; k = v; p.move(); upd(true); } });
    const sm = new Slider({ label: '$m$', min: 0, max: 6, step: 1, value: m, onInput: (v) => { if (!typed) return; m = v; p.move(); upd(true); } });
    const steps: Step[] = [
      { prompt: 'Third number: $k - \\_$', answer: 5, mistakes: [[1, 'After R3 − R1 the entry is $k - 1$; then R3 − 2R2 takes away $2 \\times 2 = 4$ more.']] },
      { prompt: 'Right side: $m - \\_$', answer: 3 },
    ];
    const dock = p.dock();
    const ws = new StepWorksheet(p, {
      steps,
      onDone: () => {
        typed = true;
        tick(0);
        dock.append(sk.el, sm.el);
        r.note(null);
        paint(false);
      },
    });
    r.note('Type the reduced last row first. Then the $k$ and $m$ dials appear.');
    paint(false);
    const go = async (kk: number, mm: number, ms: number) => { k = kk; m = mm; sk.set(k, false); sm.set(m, false); p.move(); upd(true); await wait(ms); };
    return {
      async showMe() { await ws.showMe(400); await go(7, 3, 1000); await go(5, 3, 1200); await go(5, 4, 1200); },
      async solve() { ws.solve(); await go(7, 3, 0); await go(5, 3, 0); await go(5, 4, 0); },
      wrong() { ws.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p6 [D]: one answer plus the zero-right-side answers

const P6_TILES = [
  { id: 'p', text: 'At p, each equation reads its own right side.' },
  { id: 'h', text: 'At h, on the zero-meter line, each equation reads 0.' },
  { id: 'add', text: 'Readings add: at p + h each equation reads (right side) + 0.' },
  { id: 'all', text: 'So p + h solves the system, for every h on the zero-meter line.' },
  { id: 'diff', text: 'And two solutions differ by an arrow that reads 0 everywhere: it lies on the zero-meter line.' },
];
const P6_DECOYS = [{ id: 'origin', text: 'Every line of solutions passes through the origin.' }];

export const p6: PuzzleDef = {
  id: 'c10-p6',
  title: 'Why are the two lines parallel?',
  goal: 'The white line holds the answers with every meter at 0. Drag the **green arrow** so that the white line, moved by the arrow, lands on the yellow line of real answers.',
  subgoals: ['Land the moved line on the yellow line', 'Say why'],
  hints: [
    'The white line passes through the origin. Its moved copy passes through the arrow\'s tip.',
    'Put the tip on any point of the yellow line. Try (3, 1, 0).',
    'At (3, 1, 0) every equation reads its right side; along the white line every equation reads 0. Adding the two keeps the right side.',
  ],
  par: PAR.p6, // fewest moves: cadet 1, navigator 4, commander 3 (each checked line and the tile submit count one)
  view: '3d',
  onWin: S.p6Win,
  setup(p) {
    const d = p.difficulty;
    const tol = tolOf(p);
    const st = p.g.stage;
    const L = 9;
    const lineAt = (o: number[], dir: number[]): V3[] => [[o[0] - dir[0] * L, o[1] - dir[1] * L, o[2] - dir[2] * L], [o[0] + dir[0] * L, o[1] + dir[1] * L, o[2] + dir[2] * L]];
    const u = [1, 1, 1].map((x) => x / Math.sqrt(3));
    const axes = new FatSegments(st, [[[-5, 0, 0], [6, 0, 0]], [[0, -5, 0], [0, 6, 0]], [[0, 0, -4], [0, 0, 5]]], { color: C.axis, width: 1.2, opacity: 0.35 });
    const real = new FatLine(st, lineAt(P2.particular, u), { color: C.result, width: 4, intensity: 2, opacity: 0.95 });
    const realGlow = new FatLine(st, lineAt(P2.particular, u), { color: C.result, width: 14, opacity: 0.2 });
    const zero = new FatLine(st, lineAt([0, 0, 0], u), { color: '#e8f1ff', width: 2, opacity: 0.6, dashed: true, dashSize: 0.25, gapSize: 0.15 });
    const moved = new FatLine(st, lineAt([0, 0, 0], u), { color: '#e8f1ff', width: 2.6, opacity: 0.9, dashed: true, dashSize: 0.25, gapSize: 0.15 });
    p.add(axes.object, realGlow.object, real.object, zero.object, moved.object);
    p.onDispose(() => { axes.dispose(); real.dispose(); realGlow.dispose(); zero.dispose(); moved.dispose(); });
    const tagReal = new Label('answers of the pod bay flows', [P2.particular[0] + 2.6, P2.particular[1] + 2.6, 2.6], { className: 'c08-pt' });
    const tagZero = new Label('answers with every meter at 0', [2.2, 2.2, 2.2], { className: 'c08-pt off', offset: [-130, 0] }); // up the line, clear of the dock
    p.add(tagReal, tagZero);
    void st.view3D({ target: [1.5, 0.5, 0.5], distance: 20, azimuth: -100, elevation: 22, ms: 700 });
    const done = [false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; p.subgoal(i); } if (done.every(Boolean)) { sfx.success(); p.win(); } };
    const r = p.readout('The arrow');
    let whyStarted = false;
    const onTip = (tip: number[]) => {
      moved.setPoints(lineAt(tip, u));
      const dd = distToP2Line(tip);
      r.row('tip', 'tip', pt(tip), C.v);
      r.row('gap', 'gap to the yellow line', num(dd), dd <= tol ? C.result : undefined);
      moved.setColor(dd <= tol ? C.result : '#e8f1ff', dd <= tol ? 1.6 : 1);
    };
    const handle = new VectorHandle(p, {
      to: [1, -1, 0], color: C.v, label: '$\\mathbf p$',
      onChange: (q) => onTip(q),
      onCommit: (q) => { if (p6Won(q, tol)) { tick(0); if (!whyStarted) startWhy(); } },
    });
    onTip(handle.tip);
    let ws: StepWorksheet | null = null;
    let tiles: TileOrder | null = null;
    let ordered = false, typed = false;
    function startWhy(): void {
      whyStarted = true;
      p.bark('lantern', 'Any point of the yellow line works as the arrow.');
      if (d === 'cadet') { tick(1); return; }
      const dock = p.dock();
      const steps: Step[] = d === 'navigator' ? [
        { prompt: 'Row 1 reads $x_1 - x_2$. At $\\mathbf p = (3, 1, 0)$ it reads', answer: 2 },
        { prompt: 'At $\\mathbf h = (1, 1, 1)$, on the white line, it reads', answer: 0 },
        { prompt: 'At $\\mathbf p + \\mathbf h = (4, 2, 1)$ it reads', answer: 2 },
      ] : [{ prompt: 'Row 2 reads $x_2 - x_3$. At $\\mathbf p + 4\\mathbf h$ it reads', answer: 1 }];
      ws = new StepWorksheet(p, { steps, mount: h('div'), title: d === 'navigator' ? 'Why, in numbers · each step is checked' : 'The last line', onDone: () => { typed = true; if (d === 'navigator' || ordered) tick(1); } });
      if (d === 'commander') {
        const msg = h('div', { class: 'c09-msg' });
        tiles = new TileOrder(p, {
          tiles: P6_TILES, decoys: P6_DECOYS, title: 'Put the reasons in order', submitLabel: 'Check order', mount: h('div'),
          onSubmit: (o) => {
            p.move();
            if (o.join() === P6_TILES.map((x) => x.id).join()) { ordered = true; msg.className = 'c09-msg good'; msg.textContent = 'That is the argument.'; sfx.snap(); if (typed) tick(1); }
            else { msg.className = 'c09-msg bad'; msg.textContent = o.includes('origin') ? 'The yellow line misses the origin: (0, 0, 0) reads 0, not 2, on row 1.' : 'Not in that order. Start from what p and h each read.'; sfx.miss(); }
          },
        });
        dock.replaceChildren(tiles.el, msg, ws.el);
      } else dock.replaceChildren(ws.el);
    }
    const run = async (ms: number) => {
      if (!done[0]) { await handle.moveTo(P6.particular as V3, ms); }
      if (!done[1]) {
        if (tiles) { tiles.set(P6_TILES.map((x) => x.id)); (tiles.el.querySelector('.btn.primary') as HTMLButtonElement | null)?.click(); }
        if (ws) { if (ms) await ws.showMe(350); else ws.solve(); }
      }
    };
    return { showMe: () => run(1100), solve: () => run(0), async wrong() { await handle.moveTo([0, 0, 0], 0); } };
  },
};

// ------------------------------------------------------------------ the Act III set piece: power to the pod bay

export const setPiece: PuzzleDef = {
  id: 'c10-sp',
  title: 'Can we get power to the pod bay?',
  goal: 'Three jobs. **1.** Set the damaged meter m so the feed has solutions. **2.** Route the flows so each lies between 0 and 1. **3.** Send the drone with the spare fuse straight to the centre of the pod-bay door.',
  subgoals: ['The meter reads a value that has solutions', 'Every flow between 0 and 1', 'The drone\'s path meets the door at its centre'],
  hints: [
    'Row 3 minus row 1 is (0, 2, 4 | m − 1); minus twice (row 2 minus row 1) leaves (0, 0, 0 | m − 3). Only m = 3 works.',
    'The flows are (t, 1 − 2t, t). The middle one needs t at most 0.5.',
    'The door\'s centre is (1/3, 2/3, 1), along (1, 2, 3) from the drone. Thruster weights a = 1, b = 2 give a(1, 0, 1) + b(0, 1, 1) = (1, 2, 3).',
  ],
  par: 6,
  view: '3d',
  onWin: S.spWin,
  setup(p) {
    const d = p.difficulty;
    const tol = tolOf(p);
    const dock = p.dock();
    const done = [false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; p.subgoal(i); sfx.success(); } };
    let m = 5;
    const planes = new PlaneSet(p, { n: 3, rows: SP.rows(m), size: 8, focus: [0, 1, 0] });
    void planes.frame({ distance: 23 });
    const r = p.readout('Pod bay feed');
    const paintMeter = () => {
      const kind = kindOf(SP.rows(m));
      r.row('m', 'meter m', String(m), C.u);
      r.row('k', 'The planes meet', kind === 'none' ? 'nowhere' : kind === 'many' ? 'along a line' : 'at one point', C.result);
    };
    paintMeter();
    // The next phase starts a moment after the player lets go of a dial on a good value, and only if the value is
    // still good then and the puzzle is still mounted (dragging passes through good values; Skip may come first).
    let disposed = false;
    let pending = 0;
    p.onDispose(() => { disposed = true; window.clearTimeout(pending); });
    const schedule = (fn: () => void, ms: number, still: () => boolean) => {
      window.clearTimeout(pending);
      pending = window.setTimeout(() => { pending = 0; if (!disposed && still()) fn(); }, ms);
    };
    /** Run fn when the slider is let go (pointer released, or each key press). */
    const onRelease = (sl: Slider, fn: (v: number) => void) => {
      const input = sl.el.querySelector('input')!;
      input.addEventListener('change', () => fn(parseFloat(input.value)));
    };
    // phase 1: the meter (the live preview follows the drag; the check waits for the release)
    const sm = new Slider({ label: 'damaged meter $m$', min: 0, max: 6, step: 1, value: m, onInput: (v) => { m = v; p.move(); void planes.setRows(SP.rows(m), 400); paintMeter(); } });
    onRelease(sm, (v) => {
      m = v;
      if (spConsistent(m)) { tick(0); schedule(startFlows, 450, () => spConsistent(m)); }
      else { window.clearTimeout(pending); if (done[0]) { done[0] = false; p.subgoal(0, false); } }
    });
    dock.append(sm.el);
    // phase 2: the flows
    let t = 0.8;
    let bars: ReturnType<typeof pipes> | null = null;
    let dot: Dot | null = null;
    let st: Slider | null = null;
    let flowsStarted = false;
    /** Paint the flows at t (no checks). */
    const moveT = (v: number) => {
      t = v;
      const f = SP.flows(t);
      dot?.at([f[0], f[1], f[2]]);
      bars?.paint(f);
    };
    function startFlows(): void {
      if (flowsStarted) return;
      flowsStarted = true;
      sm.el.querySelector('input')!.disabled = true;
      r.el.remove();
      bars = pipes(p, 'Flows (each fuse rated 0 to 1)', ['f₁', 'f₂', 'f₃'], 1);
      dot = new Dot(SP.flows(t) as V3, { color: C.result, size: 0.15, glow: 2.6 });
      p.add(dot);
      const step = d === 'cadet' ? 0.25 : d === 'navigator' ? 0.1 : 0.05;
      st = new Slider({ label: 'dial $t$: flows $(t,\\ 1 - 2t,\\ t)$', min: -0.5, max: 1, step, value: t, onInput: (v) => { p.move(); moveT(v); } });
      onRelease(st, (v) => {
        moveT(v);
        if (spFlowsOk(t)) { tick(1); schedule(startDrone, 700, () => spFlowsOk(t)); }
        else { window.clearTimeout(pending); if (done[1]) { done[1] = false; p.subgoal(1, false); } }
      });
      dock.append(st.el);
      moveT(t);
    }
    // phase 3: the drone
    let a = 0, b = 1;
    let droneStarted = false;
    let burn: Arrow | null = null, au: Arrow | null = null, aw: Arrow | null = null, path: FatLine | null = null, hit: Dot | null = null, drone: Dot | null = null;
    let doorFill: Mesh<BufferGeometry, MeshBasicMaterial> | null = null;
    const paintDrone = () => {
      const u = spBurn(a, 0), w = spBurn(a, b);
      au?.set([0, 0, 0], u as V3);
      aw?.set(u as V3, w as V3);
      burn?.set([0, 0, 0], w as V3);
      const hp = spHit(a, b);
      if (hp && path && hit) { path.setPoints([[0, 0, 0], [hp[0] * 1.6, hp[1] * 1.6, hp[2] * 1.6]]); path.setOpacity(0.8); hit.at(hp as V3); hit.setOpacity(1); }
      else { path?.setOpacity(0); hit?.setOpacity(0); }
      const ok = spDroneWon(a, b, tol);
      hit?.setColor(ok ? C.result : C.orange);
      if (ok && !done[2]) { tick(2); void flyDrone(); }
    };
    async function flyDrone(): Promise<void> {
      const c = SP.door.centre as V3;
      const from = [0, 0, 0];
      await animate(1400, (k) => drone?.at([from[0] + (c[0] - from[0]) * k, from[1] + (c[1] - from[1]) * k, from[2] + (c[2] - from[2]) * k]), ease.inOut);
      if (doorFill) doorFill.material.opacity = 0.45;
      sfx.solved();
      void p.g.stage.shockwave(c, 900, 0.5);
      if (done.every(Boolean)) p.win();
    }
    function startDrone(): void {
      if (droneStarted) return;
      droneStarted = true;
      planes.dispose();
      dot?.group.removeFromParent();
      bars?.r.el.remove();
      dock.replaceChildren();
      const dd = SP.door;
      const tri: V3[] = [dd.P, dd.Q, dd.R, dd.P].map((q) => [q[0], q[1], q[2]]);
      const edge = new FatLine(p.g.stage, tri, { color: '#e8f1ff', width: 2.2, intensity: 1.3 });
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(new Float32Array([...dd.P, ...dd.Q, ...dd.R]), 3));
      doorFill = new Mesh(g, new MeshBasicMaterial({ color: new Color('#59e1ff'), transparent: true, opacity: 0.16, side: DoubleSide, depthWrite: false }));
      const glass = new PlanePatch(p.g.stage, dd.centre as V3, dd.n as V3, { color: '#7d8aa5', size: 6, opacity: 0.08 });
      const centre = new Dot(dd.centre as V3, { color: '#e8f1ff', size: 0.08, label: 'door centre', labelOffset: [-62, -16] });
      const lbl = new Label('pod-bay door: $6x + 3y + 2z = 6$', [1.4, 1.4, 2.4], { className: 'c08-pt off' });
      au = new Arrow([0, 0, 0], [0, 0, 0], { color: C.v, width: 0.04, label: '$a\\,\\mathbf u$' });
      aw = new Arrow([0, 0, 0], [0, 0, 0], { color: C.w, width: 0.04, label: '$b\\,\\mathbf w$' });
      burn = new Arrow([0, 0, 0], [0, 0, 0], { color: C.result, width: 0.03, opacity: 0.6 });
      path = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 0]], { color: C.result, width: 1.6, opacity: 0.8, dashed: true, dashSize: 0.12, gapSize: 0.08 });
      hit = new Dot([0, 0, 0], { color: C.orange, size: 0.11, glow: 2.4 });
      drone = new Dot([0, 0, 0], { color: '#ffb347', size: 0.13, glow: 2.8, label: 'drone' });
      p.add(edge.object, doorFill, glass, centre, lbl, au, aw, burn, path.object, hit, drone);
      p.onDispose(() => { edge.dispose(); path?.dispose(); doorFill?.geometry.dispose(); doorFill?.material.dispose(); });
      void p.g.stage.view3D({ target: [0.5, 0.9, 1.1], distance: 12, azimuth: -35, elevation: 22, ms: 900 });
      const step = d === 'cadet' ? 0.5 : d === 'navigator' ? 0.25 : 0.125;
      const sa = new Slider({ label: 'thruster $\\cg{\\mathbf u} = (1, 0, 1)$: weight $a$', min: -1, max: 3, step, value: a, onInput: (v) => { a = v; p.move(); paintDrone(); } });
      const sb = new Slider({ label: 'thruster $\\cr{\\mathbf w} = (0, 1, 1)$: weight $b$', min: -1, max: 3, step, value: b, onInput: (v) => { b = v; p.move(); paintDrone(); } });
      dock.append(sa.el, sb.el, h('div', { class: 'c08-hint' }, 'The drone flies straight along its burn. The orange dot is where that path meets the door\'s plane.'));
      dials = [sa, sb];
      paintDrone();
    }
    let dials: [Slider, Slider] | null = null;
    const run = async (ms: number) => {
      if (!flowsStarted) {
        if (!spConsistent(m)) { sm.set(3, false); m = 3; void planes.setRows(SP.rows(m), ms ? 600 : 0); paintMeter(); }
        tick(0); startFlows(); if (ms) await wait(900);
      }
      if (!droneStarted) {
        if (!spFlowsOk(t)) { st?.set(0.25, false); moveT(0.25); }
        tick(1);
      }
      startDrone();
      if (ms) await wait(900);
      a = 1; b = 2; dials?.[0].set(1, false); dials?.[1].set(2, false); p.move(); paintDrone();
      for (let i = 0; i < 400 && !p.won; i++) await wait(20);
    };
    return { showMe: () => run(1), solve: () => run(0) };
  },
};

