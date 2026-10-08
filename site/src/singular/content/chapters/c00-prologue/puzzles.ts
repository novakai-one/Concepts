// Prologue puzzles. p1: press Apply A, watch three rows of points move with the grid, then fill in where the
// next point lands (three short steps: the next point twice, then the origin). drill: ten short rounds, each a
// new matrix. Trying is free; only a checked answer is a move. Words: text.ts.
import type { PuzzleDef } from '../../../game/types';
import { h, button, inline } from '../../../ui/ui';
import { sfx } from '../../../audio/sfx';
import { wait } from '../../../core/tween';
import {
  NumCell, eqRow, focusSoon, freshObjective, fresh, hideHint, hinter, plainDock, record, runDrill, same, sg, tn, tv,
  UNREAD_M, type PlainDock, type Round, type Vec,
} from '../../../kit/plain';
import { Tpartial } from '../../truth';
import { A, ROUNDS, STEPS, answer, askP, inputs, landed, stepsOf, type Question } from './logic';
import { MoveChart, instant } from './chart';
import { DRILL, HELP, P1, givens, head, hintsFor, right, wrongSteps } from './text';

const KEY = 'c00';
/** The pulse from the story, at constant area on the way (P R(θ) P⁻¹). */
const pulsePath = (k: number) => Tpartial((k * Math.PI) / 2);

/** Frame every point a question can show: the givens, where they land, the asked point and its answer. */
const allPts = (q: Question): Vec[] => [...inputs(q), ...landed(q), askP(q), answer(q)];

/** On a wrong answer: the ring where the guess is, a yellow known step and the guess's orange step(s). */
function showSteps(ch: MoveChart, q: Question, g: Vec): void {
  const view = ch.view;
  view.clear();
  view.ghost(g);
  const st = stepsOf(q, g);
  if (st.kind === 'between') {
    view.arrow('a', 'o').set(st.a, st.lo);
    view.arrow('b', 'o').set(st.b, g);
    return;
  }
  if (st.kind === 'ahead') { view.arrow('s', 'y').set(st.s, st.prev); view.arrow('d', 'o').set(st.d, st.from); }
  else { view.arrow('s', 'y').set(st.s, st.from); view.arrow('d', 'o').set(st.d, g); }
}

// ------------------------------------------------------------------ a vector with one box (the other entry shown)

interface PartRow { el: HTMLElement; set(v: Vec): void; check(): void; enable(on: boolean): void; focus(): void }

/** `A[p] = [ fixed ; box ]` (box: which entry is typed) and Check. onCheck gets the whole vector. */
function partRow(o: { left: string; box: 0 | 1; fixed: number; d: PlainDock; onCheck(v: Vec): void }): PartRow {
  const cell = new NumCell({ aria: o.box === 0 ? 'first number of the answer' : 'second number of the answer', onEnter: () => row.check(), cls: 'm', placeholder: '?' });
  const fix = h('span', { class: 'c00-fix', html: inline(`$${tn(o.fixed)}$`) });
  const col = h('span', { class: 'tj-col' }, ...(o.box === 0 ? [cell.el, fix] : [fix, cell.el]));
  const go = button('Check', () => row.check(), { cls: 'primary small' });
  const el = h('div', { class: 'tj-row pk-eq' }, h('span', { class: 'k', html: inline(`$${o.left}$`) }), h('span', { class: 'tj-vec' }, col), go);
  const row: PartRow = {
    el,
    set: (v) => cell.set(v[o.box]),
    check: () => {
      if (go.disabled) return;
      const x = cell.value();
      if (x === null) { o.d.msg(UNREAD_M, 'warn'); return; }
      o.onCheck(o.box === 0 ? [x, o.fixed] : [o.fixed, x]);
    },
    enable: (on) => { cell.enable(on); go.disabled = !on; },
    focus: () => cell.focus(),
  };
  return row;
}

// ------------------------------------------------------------------ p1: what does A do?

export const p1: PuzzleDef = {
  id: 'c00-p1',
  title: P1.title,
  goal: P1.goal,
  subgoals: P1.subgoals,
  hints: [],
  par: 3,
  setup(p) {
    freshObjective(p, P1.goal, 3);
    const ch = new MoveChart(p);
    const d = plainDock(p, { head: head(A), help: HELP });
    let i = 0;
    let phase: 'apply' | 'ask' | 'done' = 'apply';
    let busy = false;
    let att = fresh();
    let row: PartRow | null = null;

    const start = async (k: number) => {
      i = k;
      phase = 'apply';
      att = fresh();
      hideHint(p);
      d.msg('');
      const q = STEPS[k].q;
      const go = button(inline(P1.apply), () => void applyA(), { cls: 'primary small', html: true });
      d.body.replaceChildren(h('div', { class: 'tj-row' }, go));
      ch.view.clear();
      if (k > 0) { go.disabled = true; ch.clear(); await ch.settle(); go.disabled = false; }
      ch.points(inputs(q), { labels: true });
      void ch.view.frame(allPts(q), { ms: k ? 450 : 0, min: 3 });
      focusSoon(p, go);
    };

    const applyA = async () => {
      if (busy || phase !== 'apply') return;
      busy = true;
      try {
        const { q, box } = STEPS[i];
        d.body.querySelector('button')?.setAttribute('disabled', '');
        await ch.apply(A, { path: pulsePath, ms: 1700, flash: true, keep: true });
        if (p.won) return;
        ch.ask(askP(q));
        phase = 'ask';
        hideHint(p);
        const left = `A${tv(askP(q))} =`;
        if (box === null) {
          const r = eqRow({ vec: true, left, d, onCheck: (g) => void check(g) });
          row = { el: r.el, set: (v) => r.set(v), check: () => r.check(), enable: (on) => r.enable(on), focus: () => r.focus() };
        } else {
          row = partRow({ left, box, fixed: answer(q)[1 - box], d, onCheck: (g) => void check(g) });
        }
        d.body.replaceChildren(row.el);
        focusSoon(p, row);
      } finally { busy = false; }
    };

    const check = async (g: Vec) => {
      if (busy || phase !== 'ask' || !row) return;
      busy = true;
      row.enable(false);
      p.move();
      d.msg('');
      const q = STEPS[i].q;
      try {
        if (!same(g, answer(q))) {
          att.wrong++;
          sfx.miss();
          showSteps(ch, q, g);
          d.msg(wrongSteps(q, g), 'bad');
          return;
        }
        ch.view.clear();
        phase = 'done';
        await ch.land({ label: true });
        sfx.success();
        d.msg(right(q), 'good');
        record(KEY, `p1-${i + 1}`, att);
        sg(p, i);
        hideHint(p);
        if (i < STEPS.length - 1) {
          const next = button(P1.next, () => void start(i + 1), { cls: 'primary small' });
          d.body.append(h('div', { class: 'tj-row' }, next));
          focusSoon(p, next, 60);
        } else {
          if (!instant()) await wait(900);
          p.win();
        }
      } finally { busy = false; if (phase === 'ask') row?.enable(true); }
    };

    void start(0);

    const hint = hinter(() => (phase === 'apply' ? [P1.hintApply] : phase === 'ask' ? hintsFor(STEPS[i].q) : []), () => { att.help++; });
    // Show me / solve: each step with the real controls, awaiting each action (no polling)
    const all = async () => {
      while (busy) await wait(20);
      for (let guard = 0; guard < 12 && !p.won; guard++) {
        const ans = answer(STEPS[i].q);
        if (phase === 'apply') { att.help++; await applyA(); }
        if (phase === 'ask' && row) { att.help++; row.set(ans); await check(ans); }
        if (phase === 'done' && i < STEPS.length - 1) await start(i + 1);
      }
      while (!p.won) await wait(20);
    };
    return {
      hint, showMe: all, solve: all,
      async wrong() { while (busy) await wait(20); if (phase === 'apply') await applyA(); row?.set([9, 9]); row?.check(); },
    };
  },
};

// ------------------------------------------------------------------ practice: ten short rounds

function moveRound(ch: MoveChart, id: string, name: string, q: Question): Round {
  return {
    id, name, goal: givens(q),
    start(rc) {
      const { d, p } = rc;
      d.setHead(head(q.M));
      let busy = true, done = false;
      const r = eqRow({ vec: true, left: `A${tv(askP(q))} =`, d, onCheck: (g) => void check(g) });
      r.enable(false);
      d.body.append(r.el);
      ch.points(inputs(q));
      void ch.view.frame(allPts(q), { ms: 0, min: 3 });
      // the new matrix moves the grid, then the box opens
      const ready = (async () => {
        if (!instant()) await wait(450);
        if (!rc.live()) return;
        await ch.apply(q.M);
        if (!rc.live()) return;
        ch.ask(askP(q));
        busy = false;
        r.enable(true);
        focusSoon(p, r);
      })();
      const check = async (g: Vec) => {
        if (busy || done || !rc.live()) return;
        busy = true;
        r.enable(false);
        p.move();
        d.msg('');
        try {
          if (!same(g, answer(q))) {
            rc.att.wrong++;
            sfx.miss();
            showSteps(ch, q, g);
            d.msg(wrongSteps(q, g), 'bad');
            return;
          }
          done = true;
          ch.view.clear();
          await ch.land({ label: true, ms: 700 });
          if (!rc.live()) return;
          sfx.success();
          d.msg(right(q), 'good');
          rc.complete();
        } finally { busy = false; if (rc.live()) r.enable(!done); }
      };
      return {
        hints: () => (done ? [] : hintsFor(q)),
        async show() {
          await ready;
          while (busy && !done && rc.live()) await wait(20);
          if (done || !rc.live()) return;
          r.set(answer(q));
          await check(answer(q));
        },
      };
    },
  };
}

export const drill: PuzzleDef = {
  id: 'c00-drill',
  title: DRILL.title,
  goal: DRILL.goal,
  hints: [],
  par: 12,
  setup(p) {
    // one chart for every round (runDrill resets it between rounds)
    const ch = new MoveChart(p);
    const d = plainDock(p, { help: HELP });
    hideHint(p);
    // between rounds and on the results the last round's A goes too (each round sets its own)
    const reset0 = ch.view.reset.bind(ch.view);
    ch.view.reset = () => { reset0(); d.setHead(''); };
    return runDrill(p, { key: 'c00-drill', rounds: ROUNDS.map((x) => moveRound(ch, x.id, x.name, x.q)), view: ch.view, d, frame: [[3, 3], [-3, -3]] });
  },
};
