// Chapter 2, the two try-it puzzles. Type a and b; the picture follows as you type: a·v from the origin, b·w from
// its tip, the yellow sum. Each try leaves a small dot. No Fire, no Check: the equation is the control.
//   p1: make [5;5], then [0;5] (a negative weight).
//   p2: w on the line through v. The dots stay on one line; the target is off it: "No weights work".
import type { PuzzleCtx, PuzzleDef } from '../../../game/types';
import { h } from '../../../ui/ui';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import {
  PlaneView, plainDock, eqRow, freshObjective, focusSoon, hideHint, hinter, fresh, record, same, tv,
  type NumCell, type PlainDock, type Vec,
} from '../../../kit/plain';
import { G, R, LiveCombo, combo, eqLine, k, plain, reader, weightCell } from './parts';
import { SPAN, T1, T2, TL, TRY, V, W, W1, W2, WL } from './text';

const KEY = 'c02';
const pause = (p: PuzzleCtx, ms = 1300) => wait(p.g.headless ? 30 : ms);

/** The shared try-it machinery: two boxes in the equation, the live picture, dots, reframing. */
function liveEq(p: PuzzleCtx, view: PlaneView, d: PlainDock, v: Vec, w: Vec, rhs: Vec, onPair: (a: number, b: number, s: Vec) => void) {
  const live = new LiveCombo(view, v, w);
  const ca: NumCell = weightCell('a', () => cb.focus());
  const cb: NumCell = weightCell('b', () => { flush(); ca.focus(); });
  const ra = reader(ca), rb = reader(cb);
  const right = k(`= ${tv(rhs)}`);
  const row = eqLine([ca, G(v), '+', cb, R(w), right]);
  let framed: Vec[] = [];
  let timer = 0;
  let lastKey = '';
  let on = true;

  const reframe = (pts: Vec[], ms = 300) => { framed = pts; void view.frame(pts, { ms, cap: 40, min: 3 }); };
  const inView = (q: Vec) => {
    const xs = framed.map((x) => x[0]), ys = framed.map((x) => x[1]);
    return q[0] >= Math.min(0, ...xs) - 0.5 && q[0] <= Math.max(0, ...xs) + 0.5 && q[1] >= Math.min(0, ...ys) - 0.5 && q[1] <= Math.max(0, ...ys) + 0.5;
  };
  /** Leave a dot for the pair on screen (once it has stood still for a moment, or on Enter). */
  const flush = () => {
    window.clearTimeout(timer);
    const a = ra(), b = rb();
    if (!on || a === null || b === null) return;
    const key = `${a}|${b}`;
    if (key === lastKey) return;
    lastKey = key;
    const s = combo(a, v, b, w);
    view.paint(s, 'y');
    p.move();
    const av: Vec = [a * v[0], a * v[1]];
    const out = [s, av].filter((q) => !inView(q));
    if (out.length) reframe([...framed, ...out]);
  };
  const update = () => {
    if (!on) return;
    const a = ra(), b = rb();
    void live.to(a, b);
    window.clearTimeout(timer);
    if (a === null || b === null) return;
    timer = window.setTimeout(flush, 650);
    onPair(a, b, combo(a, v, b, w));
  };
  for (const c of [ca, cb]) c.input.addEventListener('input', update);
  p.onDispose(() => window.clearTimeout(timer));
  return {
    live, ca, cb, row, reframe,
    get framed() { return framed; },
    setRight(t: Vec) { right.innerHTML = k(`= ${tv(t)}`).innerHTML; },
    enable(x: boolean) { on = x; ca.enable(x); cb.enable(x); },
    clear() { ca.clear(); cb.clear(); lastKey = ''; void live.to(null, null); },
    /** Type a and b as a player would (Show me, solve). */
    async type(a: number, b: number) {
      ca.set(a); update(); await wait(p.g.headless ? 5 : 450);
      cb.set(b); update(); await wait(p.g.headless ? 5 : 450);
      flush();
    },
    flush,
  };
}

// ------------------------------------------------------------------ p1 · a v + b w = [5;5], then [0;5]

export const tryLC: PuzzleDef = {
  id: 'c02-p1', title: TRY.title, goal: TRY.goal, subgoals: TRY.subgoals, hints: TRY.hints1, par: 10,
  setup(p) {
    freshObjective(p, TRY.goal, 2);
    const view = new PlaneView(p);
    const d = plainDock(p, { help: TRY.help });
    const targets = [T1, T2], answers = [W1, W2];
    let stage = 0, busy = false;
    let pad = view.target(T1);
    let att = fresh();

    const hit = async (a: number, b: number) => {
      busy = true;
      eq.flush();
      eq.enable(false);
      await eq.live.to(a, b, 120);
      hideHint(p);
      d.msg(TRY.hit(a, b, targets[stage]), 'good');
      await view.arrive(pad);
      sfx.success();
      p.subgoal(stage);
      record(KEY, `p1-${stage}`, att);
      await pause(p, 1800);
      if (stage === 1) { p.win(); return; }
      stage = 1;
      att = fresh();
      view.removeTarget(pad);
      pad = view.target(T2);
      eq.setRight(T2);
      eq.clear();
      eq.enable(true);
      busy = false;
      d.msg(TRY.next);
      focusSoon(p, eq.ca);
    };
    const eq = liveEq(p, view, d, V, W, T1, (a, b, s) => {
      if (busy) return;
      if (same(s, targets[stage])) { void hit(a, b); return; }
      d.msg(TRY.live(a, b, s, targets[stage]));
    });
    d.body.append(eq.row);
    d.msg(TRY.start);
    eq.reframe([V, W, T1, T2, [-1.5, -1]], 0);
    focusSoon(p, eq.ca);

    const hint = hinter(() => (busy ? [] : stage === 0 ? TRY.hints1 : TRY.hints2), () => { att.help++; });
    const all = async () => {
      for (let i = 0; i < 2 && !p.won; i++) {
        while (busy && !p.won) await wait(20);
        if (p.won) break;
        att.help++;
        const [a, b] = answers[stage];
        await eq.type(a, b);
        while (busy && !p.won) await wait(20);
      }
      while (!p.won) await wait(20);
    };
    return { hint, showMe: all, solve: all, async wrong() { await eq.type(1, 2); } };
  },
};

// ------------------------------------------------------------------ p2 · w on the line through v

export const trySpan: PuzzleDef = {
  id: 'c02-p2', title: SPAN.title, goal: SPAN.goal, hints: SPAN.hints, par: 8,
  setup(p) {
    freshObjective(p, SPAN.goal);
    const view = new PlaneView(p);
    const d = plainDock(p, { help: SPAN.help });
    view.target(TL);
    let asking = false, done = false;
    let att = fresh();

    const eq = liveEq(p, view, d, V, WL, TL, (a, b, s) => { if (!asking) d.msg(SPAN.live(a, b, s)); });
    const noneBtn = plain(SPAN.none, () => none());
    d.body.append(eq.row, h('div', { class: 'tj-row' }, noneBtn));
    d.msg(SPAN.start);
    eq.reframe([V, WL, TL, [4, 2], [-2, 3]], 0);
    focusSoon(p, eq.ca);

    const ask = eqRow({
      left: SPAN.askLeft, right: SPAN.askRight, d,
      onCheck: (c) => {
        if (done) return;
        p.move();
        if (same(c, -2)) {
          done = true;
          ask.enable(false);
          sfx.success();
          hideHint(p);
          d.msg(SPAN.done, 'good');
          record(KEY, 'p2', att);
          void pause(p, 1500).then(() => p.win());
          return;
        }
        att.wrong++;
        sfx.miss();
        d.msg(SPAN.askBad(c), 'bad');
      },
    });
    ask.el.hidden = true;
    d.body.append(ask.el);

    function none(): void {
      if (asking) return;
      asking = true;
      p.move();
      eq.flush();
      eq.enable(false);
      void eq.live.to(null, null);
      noneBtn.disabled = true;
      hideHint(p);
      view.line(V, { kind: 'y' });
      sfx.snap();
      eq.row.classList.add('c02-done');
      noneBtn.parentElement!.hidden = true;
      ask.el.hidden = false;
      d.msg(SPAN.why, 'good');
      focusSoon(p, ask);
    }

    const hint = hinter(() => (done ? [] : asking ? SPAN.askHints : SPAN.hints), () => { att.help++; });
    const all = async () => {
      att.help++;
      if (!asking) {
        await eq.type(1, 1);
        await eq.type(-1, 1);
        none();
        await wait(p.g.headless ? 5 : 600);
      }
      if (!done) { ask.set(-2); ask.check(); }
      while (!p.won) await wait(20);
    };
    return { hint, showMe: all, solve: all, async wrong() { await eq.type(1, 1); } };
  },
};
