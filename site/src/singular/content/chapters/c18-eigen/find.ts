// Chapter 18, puzzles 2 and 4: "find the eigenvectors of M" with Game 1's controls. Type v, press Apply M,
// and when M v stays on its line fill in the box in M v = ☐ v. The player decides when there are no more
// ("There is none"); the grid then moves, so they see which points stay on their line.
//   p2  the shear A: one line.
//   p4  T: no line at all; then T applied again and again brings an L home after four (T⁴ = I).
//   p7  (optional) row reduce A to U, then find U's eigenvectors: not A's.
import type { PuzzleCtx, PuzzleDef, PuzzleRuntime } from '../../../game/types';
import { Outline2D } from '../../../gfx/shapes';
import { h, button, inline } from '../../../ui/ui';
import { sfx } from '../../../audio/sfx';
import { animate, ease, wait } from '../../../core/tween';
import { identity, matMul, matVec, meq, type Mat, type Vec } from '../../../math/la';
import { Tpartial } from '../../truth';
import { checkMult, cleanV, isZero, keeps, keptLines, multiplierOf, onLineOf } from './traj-logic';
import { NumCell, TrajView, VecField, hideHint, trajDock, type TrajDock } from './traj';
import { ROWRED, SHEAR, TURN, TURN_L, UNREAD, UNREAD_M, ZERO, tmul, tv, wrongMult, type FindText } from './traj-text';
import { P2_A, P3_A, P4_T, P7_U, texM } from './logic';
import { sg } from './parts';
import { S } from './script';

interface FindOpts {
  M: Mat;
  name: string;
  text: FindText;
  /** With no line found, misses before "There is none" is offered (none: only after a find). */
  offerAfter?: number;
  /** No "There is none" button: the puzzle ends when every line is found (a 2 × 2 with two lines). */
  autoDone?: boolean;
  /** A chart already on screen (p7 starts with A, then row reduces it to U). */
  view?: TrajView;
  /** After "There is none" and the moving grid. */
  onDone(view: TrajView, d: TrajDock): void | Promise<void>;
}

/** The find-the-eigenvectors panel and chart. Returns the hint and Show me runtime. */
function findEigen(p: PuzzleCtx, o: FindOpts): { runtime: PuzzleRuntime; view: TrajView; d: TrajDock } {
  const { M, name, text: X } = o;
  const view = o.view ?? new TrajView(p, M, { name });
  view.M = M;
  const d = trajDock(p, M, undefined, name);
  const field = new VecField({ value: null, onEnter: () => void test() });
  const go = button(inline(`Apply $${name}$`), () => void test(), { cls: 'primary small', html: true });
  const none = button(X.none, () => void claimNone(), { cls: 'small' });
  none.hidden = true;
  const q = h('div', { class: 'tj-q' });
  q.hidden = true;
  const chips = h('div', { class: 'tj-lines' });
  d.body.append(h('div', { class: 'tj-row' }, field.el, go, none), q, chips);
  d.msg(X.start);
  void view.frame([[2, 2], [-2, -2]], { ms: 0, min: 3.2 });
  if (!p.g.headless) window.setTimeout(() => field.focus(), 80);

  const lines = keptLines(M);
  const found: Vec[] = [];
  let asking: { v: Vec; fill(): void } | null = null;
  let misses = 0, busy = false, done = false;

  const offer = () => {
    if (!none.hidden || o.autoDone) return false;
    none.hidden = false;
    return true;
  };

  const ask = (v: Vec, idx: number) => {
    const w = cleanV(matVec(M, v));
    const cell = new NumCell({ aria: 'the number in the equation', onEnter: () => check(), cls: 'm', placeholder: '?' });
    q.replaceChildren(
      h('div', { class: 't', html: inline(X.kept(v)) }),
      h('div', { class: 'tj-row' }, h('span', { class: 'k', html: inline(`$${name}${tv(v)} = ${tv(w)} =$`) }), cell.el, h('span', { class: 'k', html: inline(`$${tv(v)}$`) }), button('Check', () => check(), { cls: 'primary small' })),
    );
    q.hidden = false;
    // one thing at a time: the vector row waits while the question is open
    d.root.classList.add('tj-asking');
    d.msg('');
    const check = () => {
      if (asking?.v !== v) return;
      const m = cell.value();
      if (m === null) { d.msg(UNREAD_M, 'warn'); return; }
      p.move();
      const vd = checkMult(M, v, m);
      if (!vd.ok) { sfx.miss(); view.ghost(vd.scaled); d.msg(wrongMult(v, vd), 'bad'); return; }
      view.ghost(null);
      asking = null;
      view.setLockValue(idx, m);
      void view.flashLock(idx, 900);
      sfx.success();
      found.push(v.slice());
      chips.append(h('span', { class: 'tj-chip', html: inline(`$${name}${tv(v)} = ${tmul(m, v)}$`) }));
      q.hidden = true;
      d.root.classList.remove('tj-asking');
      hideHint(p);
      sg(p, 0, true);
      offer();
      d.msg(X.found(v, m), 'good');
      if (o.autoDone && found.length >= lines.length) { void finish(); return; }
      if (!p.g.headless) window.setTimeout(() => field.focus(), 60);
    };
    asking = { v, fill: () => { cell.set(multiplierOf(M, v) ?? 0); check(); } };
    if (!p.g.headless) window.setTimeout(() => cell.focus(), 40);
  };

  const test = async (vIn?: Vec) => {
    if (busy || done || asking) return;
    if (vIn) field.set(vIn);
    const v = field.get();
    if (!v) { d.msg(UNREAD, 'warn'); return; }
    if (isZero(v)) { view.clear(); sfx.miss(); d.msg(ZERO, 'warn'); return; }
    busy = true;
    go.disabled = true;
    try {
      const w = cleanV(matVec(M, v));
      await view.frame([v, w], { min: 3.2 });
      view.clear();
      await view.launch(v);
      await wait(140);
      await view.pulse();
      if (!keeps(M, v)) {
        await view.showTurned(v, w);
        misses++;
        const offered = !found.length && o.offerAfter !== undefined && misses >= o.offerAfter && offer();
        d.msg(`${X.turned(v, w)}${offered ? ` ${X.noneOffer}` : ''}`, 'warn');
        return;
      }
      const base = found.find((f) => onLineOf(f, v));
      if (base) {
        await view.showKept(v, w, { quiet: true, ruler: true });
        void view.flashLock(view.lockOf(v), 900);
        d.msg(X.dupe(v, base), '');
        return;
      }
      await view.showKept(v, w, { ruler: true });
      hideHint(p);
      ask(v, view.lock(v, null));
    } finally {
      busy = false;
      go.disabled = done;
    }
  };

  const claimNone = async () => {
    if (busy || done || asking) return;
    p.move();
    if (found.length < lines.length) { sfx.miss(); d.msg(X.noneEarly, 'warn'); return; }
    await finish();
  };

  /** Every line found: the grid moves, so the player sees which points stay on their line. */
  const finish = async () => {
    done = true;
    busy = true;
    field.enable(false);
    go.disabled = true;
    none.disabled = true;
    hideHint(p);
    d.msg('');
    view.clear();
    // the proof: the whole grid moves; points on a found line stay on it, every other point leaves its line
    await view.showcase(p.g.headless ? 200 : 2200);
    sg(p, 1, true);
    d.msg(X.done, 'good');
    busy = false;
    await o.onDone(view, d);
  };

  /** The line not yet found, if any. */
  const nextLine = (): Vec | null => lines.map((l) => l.dir).find((dir) => !found.some((f) => onLineOf(f, dir))) ?? null;

  const step = async () => {
    while (busy) await wait(20);
    if (done) return;
    if (asking) { asking.fill(); return; }
    const n = nextLine();
    // Show me tries a vector that turns first, as a person would
    if (!misses && !found.length) { await test([1, 1]); return; }
    if (n) { await test(n); return; }
    await claimNone();
  };

  const hint = (() => {
    let key = '', n = 0;
    return (): { text: string; left: number } | null => {
      if (done) return null;
      const hs = asking ? X.hints.ask(asking.v, matVec(M, asking.v)) : found.length ? X.hints.other : X.hints.find;
      if (!hs.length) return null;
      const k = hs.join('|');
      if (k !== key) { key = k; n = 0; }
      const i = Math.min(n, hs.length - 1);
      if (n < hs.length) n++;
      // the last search hint names the button: make sure it is there
      if (!asking && !found.length && o.offerAfter !== undefined && i === hs.length - 1) offer();
      return { text: hs[i], left: hs.length - n };
    };
  })();

  const all = async () => { for (let i = 0; i < 12 && !done; i++) await step(); };
  return {
    view, d,
    runtime: { hint, showStep: step, showMe: all, solve: all, async wrong() { await test([1, 1]); } },
  };
}

// ------------------------------------------------------------------ p2 · a shear

export const p2: PuzzleDef = {
  id: 'c18-p2',
  title: SHEAR.title,
  goal: SHEAR.goal,
  subgoals: SHEAR.subgoals,
  hints: SHEAR.hints.find,
  par: 3, // trying vectors is free; the number in the box and "There is none" are the moves
  onWin: S.p2Win,
  setup(p) {
    const f = findEigen(p, { M: P2_A, name: 'A', text: SHEAR, onDone: () => p.win() });
    const rt = f.runtime;
    return { ...rt, async showMe() { await rt.showMe(); while (!p.won) await wait(20); }, async solve() { await rt.solve?.(); while (!p.won) await wait(20); } };
  },
};

// ------------------------------------------------------------------ p4 · T keeps no line; T⁴ = I

const PLATE: [number, number][] = [[0, 0], [1, 0], [1, 0.4], [0.4, 0.4], [0.4, 1], [0, 1]];
const texR = (M: Mat) => texM(M.map((row) => row.map((x) => Math.round(x * 100) / 100 + 0)));

export const p4: PuzzleDef = {
  id: 'c18-p4',
  title: TURN.title,
  goal: TURN.goal,
  subgoals: TURN.subgoals,
  hints: TURN.hints.find,
  par: 8, // trying vectors and applying T is how this is solved: exploring must not cost stars
  onWin: S.p4Win,
  setup(p) {
    let k = 0, M = identity(2), busy = false, won = false;
    let applyT: ((fast?: boolean) => Promise<void>) | null = null;

    const partB = (view: TrajView, d: TrajDock) => {
      const plate = new Outline2D(p.g.stage, PLATE, { color: '#e8f1ff', opacity: 0.12 });
      const home = new Outline2D(p.g.stage, PLATE, { color: '#7d8aa5', opacity: 0.05 });
      p.add(home, plate);
      const showM = (A: Mat) => { view.grid.set(A); plate.set(A); };
      const btn = button(inline(TURN_L.apply), () => void applyT?.(), { cls: 'primary small', html: true });
      d.body.replaceChildren(h('div', { class: 'tj-row' }, btn));
      void view.frame([[1.6, 1.6], [-1.6, -1.6]], { min: 2.2 });
      d.msg(`${TURN.done} ${TURN_L.start}`);
      applyT = async (fast = false) => {
        if (busy || won) return;
        busy = true;
        p.move();
        const M0 = M;
        if (!fast) sfx.whoosh(0.9);
        // T is a quarter turn of its own slanted grid: animate along that turn
        await animate(fast ? 1 : 900, (t) => showM(matMul(Tpartial((t * Math.PI) / 2), M0)), ease.inOut);
        M = matMul(P4_T, M0);
        k += 1;
        showM(M);
        const homeNow = meq(M, identity(2), 1e-9);
        d.msg(TURN_L.step(k, texR(M), homeNow, meq(M, [[-1, 0], [0, -1]], 1e-9)), homeNow ? 'good' : '');
        busy = false;
        if (homeNow) {
          won = true;
          btn.disabled = true;
          sg(p, 1, true);
          sfx.success();
          p.win();
        }
      };
    };

    const f = findEigen(p, { M: P4_T, name: 'T', text: TURN, offerAfter: 2, onDone: (view, d) => partB(view, d) });
    const rt = f.runtime;
    const finish = async (fast: boolean) => {
      while (!applyT) { await rt.showStep?.(); await wait(fast ? 5 : 400); }
      for (let i = k; i < 4 && !won; i++) { await applyT(fast); await wait(fast ? 5 : 700); }
    };
    return {
      hint: () => (applyT ? { text: TURN_L.start, left: 0 } : rt.hint?.() ?? null),
      showStep: async () => { if (applyT) await applyT(); else await rt.showStep?.(); },
      async showMe() { await finish(p.g.headless); },
      async solve() { await finish(true); },
      async wrong() { await rt.wrong?.(); },
    };
  },
};

// ------------------------------------------------------------------ p7 [S] · row reduce first?

export const p7: PuzzleDef = {
  id: 'c18-p7',
  title: ROWRED.title,
  goal: ROWRED.goal,
  subgoals: ROWRED.subgoals,
  hints: [ROWRED.before],
  par: 6,
  onWin: S.p7Win,
  setup(p) {
    const view = new TrajView(p, P3_A, { name: 'U' });
    const d = trajDock(p, P3_A, undefined, 'A');
    void view.frame([[2, 2], [-2, -2]], { ms: 0, min: 3.2 });
    let rt: PuzzleRuntime | null = null;
    const reduce = () => {
      if (rt) return;
      p.move();
      sfx.whoosh(1);
      sg(p, 0, true);
      // the dock is rebuilt for U, with U's matrix and the vector row
      rt = findEigen(p, { M: P7_U, name: 'U', text: ROWRED, view, autoDone: true, onDone: () => p.win() }).runtime;
    };
    d.body.append(h('div', { class: 'tj-row' }, button(inline(ROWRED.reduce), reduce, { cls: 'primary small', html: true })));
    d.msg(ROWRED.before);
    const all = async () => { reduce(); await rt!.solve?.(); while (!p.won) await wait(20); };
    return {
      hint: () => (rt ? rt.hint?.() ?? null : { text: ROWRED.before, left: 0 }),
      showStep: async () => { if (!rt) reduce(); else await rt.showStep?.(); },
      showMe: all,
      solve: all,
    };
  },
};
