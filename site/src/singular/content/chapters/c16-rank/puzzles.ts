// Chapter 16 puzzles 1–4: the fewest arrows with the same reach, counting kept and flattened
// directions on the row board, the reduced-columns trap, and orders the counter refuses.
import type { PuzzleDef, PuzzleCtx } from '../../../game/types';
import { FatLine } from '../../../gfx/lines';
import { RowOpsBoard } from '../../../kit/rowops';
import { StepWorksheet } from '../../../kit/steps';
import { MatrixInput } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { sfx } from '../../../audio/sfx';
import { gaussJordanSteps } from '../../../math/rref';
import { fmat } from '../../../math/frac';
import { col, cross, rank, type Mat } from '../../../math/la';
import { GlowLine, Room, Sheet } from '../c15-nullspace/space';
import { Counter } from './counter';
import {
  P1_ARROWS, P2_A, P2_NULL, P3_CANDS, fmtV, len, nullity, p1Reach, p1Won, p2Won, p3Won, p4BarA, p4BarB, p4BuildOk, pivotCols,
  spanRank, stickOut, type Diff, type Tag,
} from './logic';
import { S } from './script';

const d = (p: PuzzleCtx) => p.difficulty as Diff;
export const COL_COLORS = [C.v, C.w, C.u, '#c8d0e0', '#e3b8ff'];
const SUB = '₁₂₃₄₅₆₇₈₉';

/** The span of some arrows drawn in a room: a yellow plane, a yellow line, or nothing. */
export class Reach {
  private readonly sheet: Sheet;
  private readonly line: GlowLine;
  constructor(room: Room, o: { color?: string; size?: number } = {}) {
    this.sheet = new Sheet(room, [0, 0, 1], { color: o.color ?? C.result, size: o.size ?? 6, opacity: 0.12 });
    this.line = new GlowLine(room, [1, 0, 0], { color: o.color ?? C.result, opacity: 0.8 });
    this.set([]);
  }
  /** Returns the dimension shown (0, 1, 2 or 3). */
  set(vs: readonly (readonly number[])[]): number {
    const r = spanRank(vs);
    this.sheet.patch.object.visible = r === 2;
    this.line.setOpacity(r === 1 ? 0.8 : 0);
    if (r === 2) {
      let best: number[] = [0, 0, 1];
      for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) { const n = cross([...vs[i]], [...vs[j]]); if (len(n) > len(best) * 0.5 && len(n) > 1e-9) best = n; }
      this.sheet.set(best);
      this.sheet.setOpacity(0.9);
    } else if (r === 1) this.line.set(vs.find((v) => len(v) > 1e-9)!);
    return r;
  }
}

// ------------------------------------------------------------------ p1 Smallest set

export const p1: PuzzleDef = {
  id: 'c16-p1',
  title: 'How few arrows still cover the sheet?',
  goal: 'Four strut arrows lie on the stern sheet. **Unbolt** arrows until the fewest are left that still reach the **whole sheet**.',
  subgoals: ['The fewest arrows with the same reach'],
  predict: {
    prompt: 'How few of the four arrows can still reach every point of the sheet?',
    choices: [{ id: '1', text: 'One' }, { id: '2', text: 'Two' }, { id: '3', text: 'Three' }, { id: '4', text: 'All four' }],
    answer: '2',
    reveal: 'Two, as long as they are not on one line. One arrow reaches only a line; a third arrow on the same plane adds nothing new.',
  },
  hints: [
    'Click an arrow’s button to unbolt it. The yellow glow is everything the bolted arrows reach.',
    '$(1, 1, 2) = (1, 0, 1) + (0, 1, 1)$, and $(2, 1, 3) = 2(1, 0, 1) + (0, 1, 1)$: both add nothing new.',
    'Keep $(1, 0, 1)$ and $(0, 1, 1)$. Unbolt the other two.',
  ],
  par: 2,
  view: '3d',
  onWin: S.p1Win,
  setup(p) {
    const room = new Room(p, { extent: 3 });
    void p.g.stage.view3D({ target: [0.4, 0.3, 0.8], distance: 12.5, azimuth: -60, elevation: 20, ms: 0 });
    const reach = new Reach(room, { size: 7 });
    const arrows = P1_ARROWS.map((v, i) => room.arrow(v, { color: COL_COLORS[i], label: `$${fmtV(v).replace(/−/g, '-')}$` }));
    let keep = [0, 1, 2, 3];
    const r = p.readout('Strut arrows');
    const btns = P1_ARROWS.map((v, i) => {
      const b = button('', () => toggle(i), { cls: 'small' });
      b.innerHTML = inline(`$${fmtV(v).replace(/−/g, '-')}$`);
      b.style.color = COL_COLORS[i];
      return b;
    });
    const paint = () => {
      arrows.forEach((a, i) => a.setOpacity(keep.includes(i) ? 1 : 0.14));
      btns.forEach((b, i) => { b.setAttribute('aria-pressed', String(keep.includes(i))); b.title = keep.includes(i) ? 'Bolted: click to unbolt' : 'Unbolted: click to bolt'; });
      const dim = reach.set(keep.map((i) => P1_ARROWS[i]));
      r.row('k', 'arrows bolted', String(keep.length));
      r.row('r', 'reach', dim === 2 ? 'the whole sheet' : dim === 1 ? 'one line only' : 'the origin only', dim === 2 ? C.result : '#ffb347');
    };
    const toggle = (i: number) => {
      if (p.won) return;
      p.move();
      keep = keep.includes(i) ? keep.filter((x) => x !== i) : [...keep, i].sort();
      paint();
      if (p1Won(keep)) { sfx.success(); p.subgoal(0); p.win(); }
      else if (p1Reach(keep) < 2) { sfx.miss(); p.bark('lantern', keep.length === 1 ? 'One arrow reaches one line. The sheet is gone.' : 'Those arrows lie on one line. The sheet is gone.'); }
      else sfx.tick(keep.length);
    };
    p.dock().append(h('div', { class: 'act5-msg' }, 'Bolted arrows (click to unbolt):'), h('div', { class: 'act5-chips' }, ...btns));
    paint();
    return {
      async showMe() { for (const i of [2, 3]) { if (keep.includes(i)) { toggle(i); await new Promise((res) => window.setTimeout(res, 500)); } } },
      solve() { keep = [0, 1, 2, 3]; toggle(2); toggle(3); },
      wrong() { keep = [0, 1, 2, 3]; toggle(1); toggle(2); toggle(3); },
    };
  },
};

// ------------------------------------------------------------------ p2 [H] Count

export const p2: PuzzleDef = {
  id: 'c16-p2',
  title: 'How many directions does the scanner keep?',
  goal: 'Reduce $[\\,A \\mid \\mathbf 0\\,]$ to reduced row echelon form. Then count the kept and flattened directions, and write the two arrows that land on the origin.',
  subgoals: ['Reduced row echelon form', 'Count and read the free columns'],
  hints: [
    'Clear column 1: $R_2 \\to R_2 - 2R_1$, $R_3 \\to R_3 - 3R_1$. Then $R_3 \\to R_3 - R_2$.',
    'Pivots sit in columns 1 and 3: two kept directions. Columns 2 and 4 have no pivot: two free variables.',
    'With $x_2 = 1, x_4 = 0$: $x_1 = -2$, $x_3 = 0$. With $x_2 = 0, x_4 = 1$: $x_1 = -1$, $x_3 = -2$.',
  ],
  par: 7,
  view: '3d',
  onWin: S.p2Win,
  setup(p) {
    const flags = [false, false];
    const room = new Room(p, { origin: [2.6, 0, 0], extent: 3, scale: 0.62, title: 'the scanner’s columns' });
    void p.g.stage.view3D({ target: [0.9, 0.4, 1.2], distance: 13, azimuth: -72, elevation: 18, ms: 0 });
    const colsA = [0, 1, 2, 3].map((j) => room.arrow(col(P2_A, j), { color: COL_COLORS[j], label: `$\\mathbf a_${j + 1}$` }));
    const board = new RowOpsBoard(p, { aug: P2_A.map((r) => [...r, 0]), n: 4, varNames: ['x_1', 'x_2', 'x_3', 'x_4'], title: 'Augmented matrix [ A | 0 ]' });
    const r = p.readout('Survivor counter');
    const counter = new Counter({ n: 4, rows: 3, title: 'Each column: kept or flattened' });
    r.el.appendChild(counter.el);
    counter.setNote('Fills once the matrix is reduced.');
    const wsBox = h('div', {});
    wsBox.hidden = true;
    r.el.appendChild(wsBox);
    const fillCounter = () => {
      const piv = pivotCols(P2_A);
      counter.set([0, 1, 2, 3].map((j) => (piv.includes(j) ? 'kept' : 'flat') as Tag));
      counter.setNote('Pivot columns keep a direction. Free columns are flattened.');
      colsA.forEach((a, j) => a.setOpacity(piv.includes(j) ? 1 : 0.3));
    };
    const ws = new StepWorksheet(p, {
      mount: wsBox,
      steps: [
        { prompt: 'Kept directions (pivot columns):', answer: 2, mistakes: [[3, 'Three rows, but only two pivots: the third row reduced to zeros.']] },
        { prompt: 'Flattened directions (free columns):', answer: 2, mistakes: [[1, 'Count the columns without a pivot: columns 2 and 4.']] },
        { prompt: 'Free $x_2 = 1$, $x_4 = 0$. The arrow:', answer: P2_NULL[0], mistakes: [[[2, 1, 0, 0], 'Move the pivot terms across: $x_1 = -2x_2 - x_4$.']] },
        { prompt: 'Free $x_2 = 0$, $x_4 = 1$. The arrow:', answer: P2_NULL[1], mistakes: [[[1, 0, 2, 1], 'Move the pivot terms across: $x_1 = -x_4$, $x_3 = -2x_4$.']] },
      ],
      onDone: () => {
        fillCounter();
        if (!p2Won(2, 2, P2_NULL)) return;
        if (!flags[1]) { flags[1] = true; p.subgoal(1); }
        sfx.success();
        p.win();
      },
    });
    board.subscribe(() => {
      if (board.isRREF() && !flags[0]) {
        flags[0] = true;
        p.subgoal(0);
        wsBox.hidden = false;
        if (d(p) === 'cadet') fillCounter();
        else counter.setNote('Type the counts first; the counter fills when you have.');
      }
    });
    return {
      async showMe() {
        if (!flags[0]) await board.play(gaussJordanSteps(fmat(board.get()), 4).ops, 650);
        await ws.showMe(400);
      },
      async solve() {
        if (!flags[0]) await board.play(gaussJordanSteps(fmat(board.get()), 4).ops, 30);
        ws.solve();
      },
      async wrong() { if (!flags[0]) await board.play(gaussJordanSteps(fmat(board.get()), 4).ops, 30); ws.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p3 The trap

export const p3: PuzzleDef = {
  id: 'c16-p3',
  title: 'Which plane holds the scanner’s columns?',
  goal: 'Vell’s scanner took the **reduced** matrix’s pivot columns and drew their plane. The scanner’s own columns stick out of it. **Pick two arrows** whose plane holds every column of $A$.',
  subgoals: ['A plane that holds all four columns of A'],
  predict: {
    prompt: 'The reduced form’s pivot columns are $(1, 0, 0)$ and $(0, 1, 0)$. Do they span the same plane as the columns of $A$?',
    choices: [{ id: 'yes', text: 'Yes: row operations keep the plane' }, { id: 'no', text: 'No: row operations move the columns' }],
    answer: 'no',
    reveal: 'No. Row operations keep the solutions and the pivot **positions**, but they change the columns themselves. Take the pivot columns of $A$ as it was: $(1, 2, 3)$ and $(0, 1, 1)$.',
  },
  hints: [
    'The white dashed lines show how far each column of $A$ sticks out of the plane. All four must be zero.',
    'The reduced form tells you **which** columns hold pivots (1 and 3). Take those columns from $A$ itself.',
    'Pick $\\mathbf a_1 = (1, 2, 3)$ and $\\mathbf a_3 = (0, 1, 1)$.',
  ],
  par: 2,
  view: '3d',
  onWin: S.p3Win,
  setup(p) {
    const room = new Room(p, { extent: 3, scale: 0.85 });
    void p.g.stage.view3D({ target: [0.4, 0.6, 1.2], distance: 13.5, azimuth: -55, elevation: 18, ms: 0 });
    const plane = new Sheet(room, [0, 0, 1], { color: '#9fd8ff', size: 8, opacity: 0.12 });
    plane.setOpacity(0.8);
    const cols = [0, 1, 2, 3].map((j) => room.arrow(col(P2_A, j), { color: COL_COLORS[j], label: `$\\mathbf a_${j + 1}$` }));
    void cols;
    const gaps = [0, 1, 2, 3].map(() => { const f = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 0]], { color: C.white, width: 1.8, opacity: 0.85, dashed: true, dashSize: 0.1, gapSize: 0.07 }); p.add(f); return f; });
    const picked = [room.arrow([1, 0, 0], { color: C.result, width: 0.03, opacity: 0.85 }), room.arrow([0, 1, 0], { color: C.result, width: 0.03, opacity: 0.85 })];
    let pick: string[] = ['r1', 'r3'];
    const r = p.readout('The plane');
    const btns = P3_CANDS.map((c) => {
      const b = button('', () => choose(c.id), { cls: 'small' });
      b.innerHTML = inline(`$${c.from === 'A' ? '\\mathbf a' : '\\mathbf r'}_${c.j + 1}$ ${fmtV(c.v)}`);
      if (c.from === 'A') b.style.color = COL_COLORS[c.j];
      return { id: c.id, b };
    });
    const draw = () => {
      const vs = pick.map((id) => P3_CANDS.find((c) => c.id === id)!.v);
      vs.forEach((v, i) => room.setArrow(picked[i], v));
      picked.forEach((a, i) => a.setOpacity(vs[i] ? 0.85 : 0));
      let on = 0;
      if (vs.length === 2 && spanRank(vs) === 2) {
        plane.span(vs[0], vs[1]);
        plane.patch.object.visible = true;
        [0, 1, 2, 3].forEach((j) => {
          const v = col(P2_A, j);
          const out = stickOut(vs[0], vs[1], v);
          if (out < 1e-9) on++;
          const n = cross([...vs[0]], [...vs[1]]); const l = len(n);
          const foot = v.map((x, k) => x - (n[k] * (n[0] * v[0] + n[1] * v[1] + n[2] * v[2])) / (l * l));
          gaps[j].setPoints([room.w(v), room.w(foot)]);
          gaps[j].setOpacity(out > 0.04 ? 0.85 : 0);
        });
      } else {
        plane.patch.object.visible = false;
        gaps.forEach((g) => g.setOpacity(0));
      }
      btns.forEach(({ id, b }) => b.setAttribute('aria-pressed', String(pick.includes(id))));
      r.row('p', 'plane through', pick.map((id) => { const c = P3_CANDS.find((x) => x.id === id)!; return `${c.from === 'A' ? 'a' : 'r'}${SUB[c.j]}`; }).join(' and ') || '·');
      r.row('on', 'columns of $A$ on it', `${on} of 4`, on === 4 ? C.result : '#ffb347');
    };
    const choose = (id: string) => {
      if (p.won) return;
      p.move();
      pick = pick.includes(id) ? pick.filter((x) => x !== id) : [...pick, id].slice(-2);
      draw();
      if (p3Won(pick)) { plane.setColor(C.result); sfx.success(); p.subgoal(0); p.win(); }
      else if (pick.length === 2) { sfx.miss(); if (spanRank(pick.map((x) => P3_CANDS.find((c) => c.id === x)!.v)) < 2) p.bark('lantern', 'Those two arrows lie on one line. They make no plane.'); }
    };
    const rowA = h('div', { class: 'act5-chips' }, h('span', { class: 'act5-msg' }, 'Columns of A:'), ...btns.filter((x) => x.id.startsWith('a')).map((x) => x.b));
    const rowR = h('div', { class: 'act5-chips' }, h('span', { class: 'act5-msg' }, 'Columns of the reduced form:'), ...btns.filter((x) => x.id.startsWith('r')).map((x) => x.b));
    p.dock().append(h('div', { class: 'act5-msg', html: inline('Pick two arrows. The plane goes through both.') }), rowA, rowR);
    draw();
    return {
      async showMe() { pick = []; draw(); choose('a1'); await new Promise((res) => window.setTimeout(res, 500)); choose('a3'); },
      solve() { pick = ['a1']; choose('a3'); },
      wrong() { pick = ['r1']; choose('r3'); },
    };
  },
};

// ------------------------------------------------------------------ p4 Orders

export const p4: PuzzleDef = {
  id: 'c16-p4',
  title: 'Which scanners can be built?',
  goal: 'Build the first order: a 3 × 4 matrix that keeps **2** directions and flattens **2**. Then, for each order the counter refuses, **place the bar** that shows why.',
  subgoals: ['Build: 3 × 4, two kept, two flattened', 'Refuse: keeps 3, flattens 2, four columns', 'Refuse: a 3 × 5 that flattens nothing'],
  hints: [
    'Two kept directions: make two rows that are not multiples, and a third row that is a mix of them. Any 3 × 4 with two pivots has two free columns.',
    'Order 2: four columns hold kept + flattened = 4. If 3 are kept, only 1 is flattened, not 2. Order 3: three rows keep at most 3 of the 5 columns, so at least 2 are flattened.',
    'Bars: order 2, three kept and one flattened (or two and two). Order 3: three kept and two flattened.',
  ],
  par: 12,
  view: '3d',
  onWin: S.p4Win,
  setup(p) {
    const room = new Room(p, { origin: [2.4, 0, 0], extent: 3, scale: 0.6, title: 'columns of your scanner' });
    void p.g.stage.view3D({ target: [1.0, 0.4, 1.2], distance: 13, azimuth: -72, elevation: 18, ms: 0 });
    const reach = new Reach(room, { size: 7 });
    const arrows = [0, 1, 2, 3].map((j) => room.arrow([0, 0, 0], { color: COL_COLORS[j], label: `$\\mathbf a_${j + 1}$` }));
    const flags = [false, false, false];
    const tick = (i: number) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); sfx.success(); } if (flags.every(Boolean) && !p.won) p.win(); };
    let M: Mat = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]];
    const r = p.readout('Survivor counter');
    const live = new Counter({ n: 4, rows: 3, title: 'Your scanner' });
    r.el.appendChild(live.el);
    const showM = () => {
      const piv = pivotCols(M);
      live.set([0, 1, 2, 3].map((j) => (piv.includes(j) ? 'kept' : 'flat') as Tag));
      arrows.forEach((a, j) => { room.setArrow(a, col(M, j)); a.setOpacity(len(col(M, j)) > 1e-9 ? 1 : 0); });
      reach.set([0, 1, 2, 3].map((j) => col(M, j)));
    };
    const mi = new MatrixInput({ rows: 3, cols: 4, values: M, label: 'A =', step: 1, onChange: (m) => { M = m; showM(); } });
    const msg = h('div', { class: 'act5-msg' });
    const submit = () => {
      p.move();
      if (p4BuildOk(M)) { msg.className = 'act5-msg good'; msg.textContent = 'Built: 2 kept + 2 flattened = 4 columns.'; tick(0); stageOrders(); }
      else { msg.className = 'act5-msg bad'; msg.textContent = `This one keeps ${rank(M)} and flattens ${nullity(M)}. The order is 2 and 2.`; sfx.miss(); }
    };
    const part1 = h('div', { class: 'act5-row' }, mi.el, button('Build it', submit, { cls: 'primary small' }));
    p.dock().append(h('div', { class: 'kicker' }, 'Order 1 · 3 × 4, keeps 2, flattens 2'), part1, msg);
    showM();
    // the refused orders
    const bars: Counter[] = [];
    const stageOrders = () => {
      if (bars.length) return;
      const box = h('div', { style: 'display:flex;flex-direction:column;gap:10px' });
      const mk = (k: number, title: string, n: number, ok: (kept: number, flat: number) => boolean, msgOk: string) => {
        const m2 = h('div', { class: 'act5-msg' }, 'Click the slots: kept, flattened, empty.');
        const c = new Counter({ n, rows: 3, clickable: true, title, onChange: () => {} });
        const check = () => {
          p.move();
          if (ok(c.kept, c.flat)) { m2.className = 'act5-msg good'; m2.textContent = msgOk; tick(k); }
          else { m2.className = 'act5-msg bad'; m2.textContent = c.kept + c.flat !== n ? `Every one of the ${n} columns is kept or flattened: fill all ${n}.` : c.kept > 3 ? 'Three rows: at most three pivots, so at most three kept.' : 'That bar fits, but it does not show where the order breaks.'; sfx.miss(); }
        };
        bars.push(c);
        box.append(c.el, h('div', { class: 'act5-row' }, button('Place the bar', check, { cls: 'small' }), m2));
        return { c, check };
      };
      const a = mk(1, 'Order 2 · keeps 3, flattens 2, four columns', 4, p4BarA, 'Refused: 3 kept leaves 1 flattened. Kept + flattened must be 4.');
      const b = mk(2, 'Order 3 · a 3 × 5 that flattens nothing', 5, p4BarB, 'Refused: three rows keep at most 3 of 5. At least 2 are flattened.');
      orders = { a, b };
      p.dock().replaceChildren(h('div', { class: 'kicker' }, 'The counter refuses two orders. Show why.'), box);
      p.setGoal('The counter refuses two orders. For each, **place the bar**: mark every column kept or flattened, the way a real scanner would have to.');
    };
    let orders: { a: { c: Counter; check: () => void }; b: { c: Counter; check: () => void } } | null = null;
    const build = async (fast: boolean) => {
      const target: Mat = [[1, 2, 0, 1], [2, 4, 1, 4], [3, 6, 1, 5]];
      if (!fast) { for (let i = 0; i < 3; i++) { M = M.map((row, k) => (k === i ? target[i].slice() : row)); mi.set(M); showM(); await new Promise((res) => window.setTimeout(res, 300)); } }
      M = target.map((x) => x.slice()); mi.set(M); showM();
      submit();
      orders!.a.c.set(['kept', 'kept', 'kept', 'flat']); orders!.a.check();
      orders!.b.c.set(['kept', 'kept', 'kept', 'flat', 'flat']); orders!.b.check();
    };
    return {
      async showMe() { await build(false); },
      async solve() { await build(true); },
      wrong() { M = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]]; mi.set(M); showM(); submit(); },
    };
  },
};
