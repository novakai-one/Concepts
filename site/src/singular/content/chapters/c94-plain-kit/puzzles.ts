// Chapter 94 (developer): the plain maths kit at work. Five short puzzles, each one the kit's pattern:
// read the boxes → lock → frame and animate → judge with pure logic → one line in the dock.
import type { PuzzleDef } from '../../../game/types';
import { button, h, inline } from '../../../ui/ui';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import {
  PlaneView, plainDock, NumCell, VecField, eqRow, eqRound, runDrill, freshObjective, focusSoon, hideHint, hinter,
  fresh, record, same, isZero, mul, add, lin, norm, tv, tsum, tmul, tlin, wrongVec, UNREAD, UNREAD_M, type Vec,
} from '../../../kit/plain';
import { ADD, COMBO, DRILL, LEN, SCALE, T1, T2, T3, U3, V2, V3, V4 } from './text';

const KEY = 'c94';
const pause = (p: { g: { headless: boolean } }) => wait(p.g.headless ? 50 : 1200);

// ------------------------------------------------------------------ 1 · u + v, tip to tail

export const add2: PuzzleDef = {
  id: 'c94-add', title: ADD.title, goal: ADD.goal, hints: ADD.hints, par: 3,
  setup(p) {
    freshObjective(p, ADD.goal);
    const view = new PlaneView(p);
    const d = plainDock(p, { head: ADD.head });
    const pad = view.target(T1);
    const fu = new VecField({ label: '$\\mathbf u =$', onEnter: () => void draw() });
    const fv = new VecField({ label: '$\\mathbf v =$', kind: 'b', onEnter: () => void draw() });
    const go = button(ADD.go, () => void draw(), { cls: 'primary small' });
    d.body.append(h('div', { class: 'tj-row' }, fu.el, fv.el, go));
    d.msg(ADD.start);
    void view.frame([[3, 3], [-1, -1]], { ms: 0 });
    focusSoon(p, fu);
    let att = fresh(), busy = false, done = false;

    const draw = async (uv?: [Vec, Vec]) => {
      if (busy || done) return;
      if (uv) { fu.set(uv[0]); fv.set(uv[1]); }
      const u = fu.get(), v = fv.get();
      if (!u || !v) { d.msg(UNREAD, 'warn'); return; }
      if (isZero(u) || isZero(v)) { sfx.miss(); d.msg(ADD.zero, 'warn'); return; }
      busy = true; go.disabled = true; p.move(); d.msg('');
      try {
        const s = await view.addTipToTail(u, v);
        if (same(s, T1)) {
          done = true;
          await view.arrive(pad);
          sfx.success();
          d.msg(ADD.hit(u, v, s), 'good');
          record(KEY, 'add', att);
          await pause(p);
          p.win();
          return;
        }
        att.wrong++;
        view.miss(s, T1);
        d.msg(ADD.miss(u, v, s), 'bad');
      } finally { busy = false; go.disabled = done; }
    };
    const hint = hinter(() => (done ? [] : ADD.hints), () => { att.help++; });
    const all = async () => { while (busy) await wait(20); att.help++; await draw([[3, -1], [1, 2]]); while (!p.won) await wait(20); };
    return { hint, showMe: all, solve: all, async wrong() { await draw([[2, 1], [1, 2]]); } };
  },
};

// ------------------------------------------------------------------ 2 · c v = a given vector

export const scale1: PuzzleDef = {
  id: 'c94-scale', title: SCALE.title, goal: SCALE.goal, hints: SCALE.hints, par: 2,
  setup(p) {
    freshObjective(p, SCALE.goal);
    const view = new PlaneView(p);
    const d = plainDock(p, { head: SCALE.head });
    const pad = view.target(T2);
    view.arrow('v', 'g').set(V2, [0, 0]).label('$\\mathbf v$');
    view.line(V2);
    let att = fresh(), busy = false, done = false;
    const row = eqRow({ right: SCALE.right, go: 'Draw', d, onCheck: (c) => void draw(c) });
    d.body.append(row.el);
    d.msg(SCALE.start);
    void view.frame([V2, [3, 3]], { ms: 0 });
    focusSoon(p, row);

    const draw = async (c: number) => {
      if (busy || done) return;
      busy = true; row.enable(false); p.move(); d.msg('');
      try {
        const w = await view.scale(c, V2);
        if (same(w, T2)) {
          done = true;
          await view.arrive(pad);
          sfx.success();
          d.msg(SCALE.hit(c, w), 'good');
          record(KEY, 'scale', att);
          await pause(p);
          p.win();
          return;
        }
        att.wrong++;
        view.miss(w, T2);
        d.msg(SCALE.miss(c, w), 'bad');
      } finally { busy = false; row.enable(!done); }
    };
    const hint = hinter(() => (done ? [] : SCALE.hints), () => { att.help++; });
    const all = async () => { while (busy) await wait(20); att.help++; row.set(-2); row.check(); while (!p.won) await wait(20); };
    return { hint, showMe: all, solve: all, async wrong() { row.set(2); row.check(); } };
  },
};

// ------------------------------------------------------------------ 3 · a u + b v = a given vector

export const combo: PuzzleDef = {
  id: 'c94-combo', title: COMBO.title, goal: COMBO.goal, hints: COMBO.hints, par: 4,
  setup(p) {
    freshObjective(p, COMBO.goal);
    const view = new PlaneView(p);
    const d = plainDock(p, { head: COMBO.head });
    const pad = view.target(T3);
    view.arrow('u', 'g').set(U3, [0, 0]).label('$\\mathbf u$');
    view.arrow('v', 'b').set(V3, [0, 0]).label('$\\mathbf v$');
    const a = new NumCell({ aria: 'a', onEnter: () => void draw(), cls: 'm', placeholder: 'a' });
    const b = new NumCell({ aria: 'b', onEnter: () => void draw(), cls: 'm', placeholder: 'b' });
    const go = button('Draw', () => void draw(), { cls: 'primary small' });
    const k = (t: string) => h('span', { class: 'k', html: inline(t) });
    d.body.append(h('div', { class: 'tj-row' }, a.el, k('$\\mathbf u\\ +$'), b.el, k(`$${COMBO.tail}$`), go));
    d.msg(COMBO.start);
    void view.frame([U3, V3, [3, 3]], { ms: 0 });
    focusSoon(p, a);
    let att = fresh(), busy = false, done = false;

    const draw = async (x?: [number, number]) => {
      if (busy || done) return;
      if (x) { a.set(x[0]); b.set(x[1]); }
      const s = a.value(), t = b.value();
      if (s === null || t === null) { d.msg(UNREAD_M, 'warn'); return; }
      busy = true; go.disabled = true; p.move(); d.msg('');
      try {
        const end = await view.combine(s, U3, t, V3);
        view.paint(end);
        if (same(end, T3)) {
          done = true;
          await view.arrive(pad);
          sfx.success();
          d.msg(COMBO.hit(s, t, end), 'good');
          record(KEY, 'combo', att);
          await pause(p);
          p.win();
          return;
        }
        att.wrong++;
        view.miss(end, T3);
        d.msg(COMBO.miss(s, t, end), 'bad');
      } finally { busy = false; go.disabled = done; }
    };
    const hint = hinter(() => (done ? [] : COMBO.hints), () => { att.help++; });
    const all = async () => { while (busy) await wait(20); att.help++; await draw([1, 2]); while (!p.won) await wait(20); };
    return { hint, showMe: all, solve: all, async wrong() { await draw([2, 1]); } };
  },
};

// ------------------------------------------------------------------ 4 · the length of v

export const len1: PuzzleDef = {
  id: 'c94-length', title: LEN.title, goal: LEN.goal, hints: LEN.hints, par: 2,
  setup(p) {
    freshObjective(p, LEN.goal);
    const view = new PlaneView(p);
    const d = plainDock(p, { head: LEN.head, help: LEN.help });
    view.arrow('v', 'g').set(V4, [0, 0]).label('$\\mathbf v$');
    let att = fresh(), busy = false, done = false;
    const row = eqRow({ left: LEN.left, d, onCheck: (x) => void check(x) });
    d.body.append(row.el);
    void view.frame([V4], { ms: 0 });
    focusSoon(p, row);

    const check = async (x: number) => {
      if (busy || done) return;
      busy = true; row.enable(false); p.move(); d.msg('');
      try {
        const ok = same(x, norm(V4));
        // a wrong number keeps the answer off the chart: the legs show, the length does not
        await view.length(V4, { hide: !ok });
        if (ok) {
          done = true;
          sfx.success();
          d.msg(LEN.hit, 'good');
          record(KEY, 'length', att);
          await pause(p);
          p.win();
          return;
        }
        att.wrong++;
        sfx.miss();
        d.msg(LEN.miss(x), 'bad');
      } finally { busy = false; row.enable(!done); }
    };
    const hint = hinter(() => (done ? [] : LEN.hints), () => { att.help++; });
    const all = async () => { while (busy) await wait(20); att.help++; row.set(5); row.check(); while (!p.won) await wait(20); };
    return { hint, showMe: all, solve: all, async wrong() { row.set(7); row.check(); } };
  },
};

// ------------------------------------------------------------------ 5 · three one-box rounds

const R1U: Vec = [2, 1], R1V: Vec = [1, 2];
const R2V: Vec = [2, 1], R2T: Vec = [-4, -2];
const R3U: Vec = [1, 1], R3V: Vec = [0, 2], R3T: Vec = [1, 5];

const ROUNDS = [
  eqRound<Vec>({
    id: 'r1', name: 'add two vectors', goal: 'Add the two vectors.',
    left: `${tsum(R1U, R1V)} =`, vec: true, answer: add(R1U, R1V),
    draw: (view) => { view.arrow('u', 'g').set(R1U, [0, 0]); view.arrow('v', 'b').set(R1V, [0, 0]); },
    frame: [R1U, R1V, add(R1U, R1V)],
    play: (view) => view.addTipToTail(R1U, R1V, { names: [tv(R1U), tv(R1V)], bare: true }),
    ghost: (x) => x,
    good: () => `$${tsum(R1U, R1V)} = ${tv(add(R1U, R1V))}$.`,
    bad: (x) => wrongVec(add(R1U, R1V), x, tsum(R1U, R1V)),
    hints: ['Add the top numbers, then the bottom numbers.', `$2 + 1 = 3$ and $1 + 2 = 3$.`],
  }),
  eqRound<number>({
    id: 'r2', name: 'a number times a vector', goal: 'Find the number.',
    left: `${tv(R2T)} =`, right: tv(R2V), answer: -2,
    draw: (view) => { view.target(R2T); view.arrow('v', 'g').set(R2V, [0, 0]); },
    frame: [R2V, R2T],
    play: (view, c) => view.scale(c, R2V, { bare: true }),
    good: (c) => `$${tmul(c, R2V)} = ${tv(R2T)}$.`,
    bad: (c) => wrongVec(mul(c, R2V), R2T, tmul(c, R2V)),
    hints: ['The ring is on the other side of the origin.', `Try $-2$.`],
  }),
  eqRound<number>({
    id: 'r3', name: 'a combination', goal: 'Find the number.',
    left: `${tv(R3T)} =`, right: `${tv(R3U)} + 2${tv(R3V)}`, answer: 1,
    draw: (view) => { view.target(R3T); },
    frame: [R3T, R3U, R3V],
    play: (view, a) => view.combine(a, R3U, 2, R3V, { bare: true }),
    good: (a) => `$${tlin(a, R3U, 2, R3V)} = ${tv(R3T)}$.`,
    bad: (a) => wrongVec(lin(a, R3U, 2, R3V), R3T, tlin(a, R3U, 2, R3V)),
    hints: ['Look at the top numbers: $? \\cdot 1 + 2 \\cdot 0 = 1$.', 'Try $1$.'],
  }),
];

export const drill: PuzzleDef = {
  id: 'c94-drill', title: DRILL.title, goal: DRILL.goal, hints: [], par: 4,
  setup(p) {
    const view = new PlaneView(p);
    const d = plainDock(p);
    hideHint(p);
    return runDrill(p, { key: 'c94-drill', rounds: ROUNDS, view, d });
  },
};
