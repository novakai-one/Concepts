// Chapter 1: the "try it" puzzles. Each one: type numbers, watch the chart, read one line of calculation.
// 1 a vector (the tip follows the boxes), 2 adding (v drawn from the tip of u while typing), 3 a number times
// a vector (each right answer leaves a dot on one line; the third has no answer), 4 length (the 3-4 triangle),
// and two harder cases: halfway from P to Q, and a length in 3-D.
import type { PuzzleCtx, PuzzleDef } from '../../../game/types';
import { button, h, inline } from '../../../ui/ui';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { C } from '../../../core/theme';
import { Arrow } from '../../../gfx/arrow';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import type { Pad } from '../../../gfx/markers';
import {
  PlaneView, VecField, eqRow, freshObjective, focusSoon, hinter, sg, fresh, record, same, add, mul,
  UNREAD, tv, type EqRow, type Vec,
} from '../../../kit/plain';
import { ADD, ADD_T, ADD_U, ADD_V, G, LEN, LEN3, LEN3_V, LEN_V, MID, MID_P, MID_Q, MUL, MUL_V, VEC, Y, tpt } from './text';
import { circle, clearExtras, dock, hold, otherOrder, stretch, tipToTail } from './parts';

const KEY = 'c01';
const pause = (p: PuzzleCtx, ms = 1300) => (p.g.headless ? wait(50) : hold(ms));
const k = (tex: string) => h('span', { class: 'k', html: inline(`$${tex}$`) });

// ------------------------------------------------------------------ 1 · a vector: the tip follows the boxes

export const pVector: PuzzleDef = {
  id: 'c01-vector', title: VEC.title, goal: VEC.goal, subgoals: VEC.subgoals, hints: VEC.hints(VEC.targets[0]), par: 3,
  setup(p) {
    freshObjective(p, VEC.goal, 3);
    const view = new PlaneView(p);
    const d = dock(p);
    const ask = h('div', { class: 'tj-goal' });
    const f = new VecField({ onEnter: () => enter() });
    d.body.append(ask, h('div', { class: 'tj-row' }, f.el));
    const V = view.arrow('v', 'g');
    const att = fresh();
    let stage = 0, pad: Pad | null = null, busy = false;
    const T = () => VEC.targets[stage];
    void view.frame(VEC.targets, { ms: 0 });

    const begin = (i: number) => {
      stage = i;
      ask.innerHTML = inline(VEC.ask(T()));
      if (pad) view.removeTarget(pad);
      pad = view.target(T(), `$${tpt(T())}$`);
      f.clear(); f.enable(true); V.hide(); d.msg('');
      focusSoon(p, f);
    };
    // the vector follows what is typed (an empty box counts as 0 until both are typed)
    const follow = () => {
      if (busy) return;
      const x = f.x.peek(), y = f.y.peek();
      if (x === null && y === null) { V.hide(); return; }
      V.set([x ?? 0, y ?? 0], [0, 0]).label('$\\mathbf v$');
      if (x !== null && y !== null && same([x, y], T())) void hit();
    };
    for (const c of [f.x, f.y]) c.input.addEventListener('input', follow);
    const hit = async () => {
      busy = true; f.enable(false); p.move();
      const t = T();
      await view.arrive(pad!);
      sfx.success();
      d.msg(VEC.hit(t), 'good');
      sg(p, stage);
      await pause(p, 1600);
      busy = false;
      if (stage < 2) begin(stage + 1); else { record(KEY, 'vector', att); p.win(); }
    };
    // Enter with the tip elsewhere: say where it is
    const enter = () => {
      if (busy) return;
      const v = f.get();
      if (!v) { d.msg(UNREAD, 'warn'); return; }
      if (same(v, T())) return;
      p.move(); att.wrong++; sfx.miss();
      d.msg(VEC.off(v, T()), 'bad');
    };
    begin(0);
    const hint = hinter(() => (busy ? [] : VEC.hints(T())), () => { att.help++; });
    const all = async () => {
      att.help++;
      while (!p.won) {
        while (busy) await wait(20);
        if (p.won) break;
        f.set(T()); follow();
        await wait(20);
      }
    };
    return { hint, showMe: all, solve: all, async wrong() { f.set([2, 3]); enter(); } };
  },
};

// ------------------------------------------------------------------ 2 · adding: [4;−1] + [ ] = [3;2]

export const pAdd: PuzzleDef = {
  id: 'c01-add', title: ADD.title, goal: ADD.goal, hints: ADD.hints, par: 1,
  setup(p) {
    freshObjective(p, ADD.goal);
    const view = new PlaneView(p);
    const d = dock(p);
    const pad = view.target(ADD_T);
    const f = new VecField({ label: '', onEnter: () => void check() });
    const go = button('Check', () => void check(), { cls: 'primary small' });
    d.body.append(h('div', { class: 'tj-goal', html: inline(ADD.goal) }), h('div', { class: 'tj-row c01-eq' }, k(ADD.left), f.el, k(ADD.right), go));
    const att = fresh();
    let busy = false, done = false, lastMiss: Vec | null = null, dirty = false;
    const givens = () => { view.clear(); view.arrow('u', 'g').set(ADD_U, [0, 0]); if (lastMiss) view.ghost(lastMiss); };
    givens();
    void view.frame([ADD_U, ADD_T, [ADD_U[0], ADD_T[1]]], { ms: 0 });
    focusSoon(p, f);

    // while typing, v is drawn from the tip of u
    const follow = () => {
      if (busy || done) return;
      if (dirty) { givens(); dirty = false; d.msg(''); }
      const x = f.x.peek(), y = f.y.peek();
      const V = view.arrow('v', 'b');
      if (x === null && y === null) { V.hide(); return; }
      V.set([x ?? 0, y ?? 0], ADD_U);
    };
    for (const c of [f.x, f.y]) c.input.addEventListener('input', follow);

    const check = async (v0?: Vec) => {
      if (busy || done) return;
      if (v0) f.set(v0);
      const v = f.get();
      if (!v) { d.msg(UNREAD, 'warn'); return; }
      busy = true; go.disabled = true; p.move(); d.msg('');
      try {
        const s = await tipToTail(view, [ADD_U, v]);
        if (same(s, ADD_T)) {
          done = true;
          await view.arrive(pad);
          sfx.success();
          d.msg(ADD.right1(v), 'good');
          await pause(p, 1500);
          await otherOrder(view, ADD_U, v);
          d.msg(ADD.other(v), 'good');
          record(KEY, 'add', att);
          await pause(p, 1500);
          p.win();
          return;
        }
        att.wrong++;
        view.miss(s, ADD_T);
        d.msg(ADD.wrong(v, s), 'bad');
        lastMiss = s; dirty = true;
      } finally { busy = false; go.disabled = done; }
    };
    const hint = hinter(() => (done ? [] : ADD.hints), () => { att.help++; });
    const all = async () => { while (busy) await wait(20); att.help++; await check(ADD_V); while (!p.won) await wait(20); };
    return { hint, showMe: all, solve: all, async wrong() { await check([1, 3]); } };
  },
};

// ------------------------------------------------------------------ 3 · a number times a vector

export const pMul: PuzzleDef = {
  id: 'c01-mul', title: MUL.title, goal: MUL.goal, subgoals: MUL.subgoals, hints: MUL.hints[0], par: 3,
  setup(p) {
    freshObjective(p, MUL.goal, 3);
    const view = new PlaneView(p);
    const d = dock(p);
    const att = fresh();
    let stage = 0, busy = false, pad: Pad | null = null;
    const T = () => MUL.targets[stage];
    const rowHost = h('div');
    const none = button(MUL.none, () => void pickNone(), { cls: 'small' });
    d.body.append(rowHost, h('div', { class: 'tj-row' }, none));
    let row!: EqRow<number>;
    void view.frame([...MUL.targets, MUL_V], { ms: 0 });

    const givens = () => { view.clear(); view.arrow('v', 'g').set(MUL_V, [0, 0]); };
    const begin = (i: number) => {
      stage = i;
      if (pad) view.removeTarget(pad);
      pad = view.target(T());
      givens();
      row = eqRow({ right: `${G(tv(MUL_V))} = ${Y(tv(T()))}`, d, onCheck: (c) => void check(c) });
      rowHost.replaceChildren(row.el);
      busy = false; none.disabled = false;
      d.msg('');
      focusSoon(p, row);
    };
    const next = async () => {
      sg(p, stage);
      await pause(p, 1600);
      if (stage < 2) begin(stage + 1); else { record(KEY, 'mul', att); p.win(); }
    };
    const lock = (on: boolean) => { busy = on; row.enable(!on); none.disabled = on; };

    const check = async (c: number) => {
      if (busy) return;
      lock(true); p.move(); d.msg(''); view.ghost(null);
      let advance = false;
      try {
        const w = await stretch(view, c, MUL_V);
        const ans = MUL.answers[stage];
        if (ans !== null && same(c, ans)) {
          await view.arrive(pad!);
          view.paint(T(), 'y');
          sfx.success();
          d.msg(MUL.right(c, T()), 'good');
          advance = true;
          return;
        }
        att.wrong++;
        view.miss(w, T());
        d.msg(MUL.wrong(c, w, T()), 'bad');
      } finally {
        if (advance) await next(); else lock(false);
      }
    };
    const pickNone = async () => {
      if (busy) return;
      lock(true); p.move();
      if (MUL.answers[stage] !== null) {
        att.wrong++; sfx.miss();
        d.msg(MUL.someWorks, 'warn');
        lock(false);
        return;
      }
      givens();
      view.line(MUL_V);
      view.mark(T(), '', 'o');
      sfx.success();
      d.msg(MUL.noneRight, 'good');
      await next();
    };
    begin(0);
    const hint = hinter(() => (busy ? [] : MUL.hints[stage]), () => { att.help++; });
    const all = async () => {
      att.help++;
      while (!p.won) {
        while (busy) await wait(20);
        if (p.won) break;
        const ans = MUL.answers[stage];
        if (ans === null) await pickNone(); else { row.set(ans); row.check(); }
        await wait(20);
      }
    };
    return { hint, showMe: all, solve: all, async wrong() { row.set(2); row.check(); } };
  },
};

// ------------------------------------------------------------------ 4 · the length of [3;4]

export const pLen: PuzzleDef = {
  id: 'c01-length', title: LEN.title, goal: LEN.goal, hints: LEN.hints, par: 1,
  setup(p) {
    freshObjective(p, LEN.goal);
    const view = new PlaneView(p);
    const d = dock(p);
    const att = fresh();
    let busy = false, done = false;
    const row = eqRow({ left: LEN.left, d, onCheck: (x) => void check(x) });
    d.body.append(h('div', { class: 'tj-goal', html: inline(LEN.goal) }), row.el);
    const draw = () => { view.clear(); clearExtras(view); view.arrow('v', 'g').set(LEN_V, [0, 0]); void view.legs(LEN_V, p.g.headless ? 0 : 500); };
    draw();
    void view.frame([LEN_V, [LEN_V[0], 0], [-2, -2]], { ms: 0 });
    focusSoon(p, row);

    const check = async (x: number) => {
      if (busy || done) return;
      busy = true; row.enable(false); p.move(); d.msg('');
      try {
        draw();
        // every point at distance x from the origin: the tip is on it only when x is the length
        circle(view, [0, 0], x);
        await hold(450);
        if (same(x, 5)) {
          done = true;
          sfx.success();
          view.mark(LEN_V, '', 'y');
          d.msg(LEN.right, 'good');
          record(KEY, 'length', att);
          await pause(p, 1600);
          p.win();
          return;
        }
        att.wrong++; sfx.miss();
        d.msg(same(x, 7) ? LEN.seven : LEN.wrong(x), 'bad');
      } finally { busy = false; row.enable(!done); }
    };
    const hint = hinter(() => (done ? [] : LEN.hints), () => { att.help++; });
    const all = async () => { while (busy) await wait(20); att.help++; row.set(5); row.check(); while (!p.won) await wait(20); };
    return { hint, showMe: all, solve: all, async wrong() { row.set(7); row.check(); } };
  },
};

// ------------------------------------------------------------------ 5 · halfway from P to Q

export const pMid: PuzzleDef = {
  id: 'c01-mid', title: MID.title, goal: MID.goal, hints: MID.hints, par: 1,
  setup(p) {
    freshObjective(p, MID.goal);
    const view = new PlaneView(p);
    const d = dock(p);
    const att = fresh();
    const PQ: Vec = [MID_Q[0] - MID_P[0], MID_Q[1] - MID_P[1]];
    const M = add(MID_P, mul(0.5, PQ));
    let busy = false, done = false;
    const row = eqRow({ vec: true, left: MID.left, d, onCheck: (x) => void check(x) });
    d.body.append(h('div', { class: 'tj-goal', html: inline(MID.ask) }), row.el);
    const givens = () => {
      view.clear();
      view.mark(MID_P, '$P$', 'w');
      view.mark(MID_Q, '$Q$', 'w', true);
      const a = view.arrow('pq', 'w');
      a.set(PQ, MID_P);
      a.arrow.setOpacity(0.45);
    };
    givens();
    void view.frame([MID_P, MID_Q, [0, 0]], { ms: 0 });
    focusSoon(p, row);

    const check = async (x: Vec) => {
      if (busy || done) return;
      busy = true; row.enable(false); p.move(); d.msg('');
      try {
        givens();
        await view.arrow('half', 'g').grow(mul(0.5, PQ), { from: MID_P, ms: 600 });
        if (same(x, M)) {
          done = true;
          view.mark(M, '', 'y');
          sfx.success();
          d.msg(MID.right, 'good');
          record(KEY, 'mid', att);
          await pause(p, 1600);
          p.win();
          return;
        }
        att.wrong++; sfx.miss();
        view.ghost(x);
        d.msg(MID.wrong(x), 'bad');
      } finally { busy = false; row.enable(!done); }
    };
    const hint = hinter(() => (done ? [] : MID.hints), () => { att.help++; });
    const all = async () => { while (busy) await wait(20); att.help++; row.set(M); row.check(); while (!p.won) await wait(20); };
    return { hint, showMe: all, solve: all, async wrong() { row.set([2.5, -1.5]); row.check(); } };
  },
};

// ------------------------------------------------------------------ 6 · the length of [2;3;6], in 3-D

export const pLen3: PuzzleDef = {
  id: 'c01-length3', title: LEN3.title, goal: LEN3.goal, hints: LEN3.hints, par: 1, view: '3d',
  setup(p) {
    freshObjective(p, LEN3.goal);
    const st = p.g.stage;
    const phone = st.size.x < 760;
    void st.view3D({ target: phone ? [1, 1.5, 2.6] : [1.2, 1.5, 2.6], distance: phone ? 22 : 15, azimuth: -58, elevation: 20, ms: 0 });
    p.grid({ base: 0, main: 0.22, axis: 0.45 });
    const d = dock(p);
    const att = fresh();
    let busy = false, done = false;
    const row = eqRow({ left: LEN3.left, d, onCheck: (x) => void check(x) });
    d.body.append(h('div', { class: 'tj-goal', html: inline(LEN3.goal) }), row.el);
    focusSoon(p, row);
    const [a, b, c] = LEN3_V;
    type P3 = [number, number, number];
    const seg = (pts: P3[], color: string, op = 0.9, dashed = true) => { const l = new FatLine(st, pts, { color, width: 2, opacity: op, dashed, dashSize: 0.18, gapSize: 0.13 }); p.add(l); p.onDispose(() => l.dispose()); return l; };
    const lab = (text: string, at: P3) => { const t = new Label(text, at, { className: 'g-label pk-leg' }); p.add(t.object); p.onDispose(() => t.dispose()); };
    // the up axis, faint
    seg([[0, 0, 0], [0, 0, 7.5]], C.axis, 0.3, false);
    const v = new Arrow([0, 0, 0], [a, b, c], { color: C.v, width: 0.05 });
    p.add(v);
    // the floor triangle (sides 2 and 3), then the standing one (the floor diagonal and 6)
    seg([[0, 0, 0], [a, 0, 0], [a, b, 0]], '#fff4e6');
    seg([[0, 0, 0], [a, b, 0]], C.result, 0.8);
    seg([[a, b, 0], [a, b, c]], '#fff4e6');
    lab('2', [a / 2, -0.35, 0]);
    lab('3', [a + 0.35, b / 2, 0]);
    lab('6', [a + 0.35, b + 0.2, c / 2]);

    const check = async (x: number) => {
      if (busy || done) return;
      busy = true; row.enable(false); p.move(); d.msg('');
      try {
        if (same(x, 7)) {
          done = true;
          sfx.success();
          d.msg(LEN3.right, 'good');
          record(KEY, 'length3', att);
          await pause(p, 1600);
          p.win();
          return;
        }
        att.wrong++; sfx.miss();
        d.msg(LEN3.wrong(x), 'bad');
      } finally { busy = false; row.enable(!done); }
    };
    const hint = hinter(() => (done ? [] : LEN3.hints), () => { att.help++; });
    const all = async () => { while (busy) await wait(20); att.help++; row.set(7); row.check(); while (!p.won) await wait(20); };
    return { hint, showMe: all, solve: all, async wrong() { row.set(11); row.check(); } };
  },
};
