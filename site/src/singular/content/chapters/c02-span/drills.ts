// Chapter 2, practice. Same picture every round: v green and w red on the origin, the target ring. Check plays the
// answer: v stretches to a·v, w moves to its tip and stretches to b·w, the yellow sum grows. A wrong answer shows
// the calculation next to the target. The kit's runDrill runs the rounds (Round n of N, summary, Finish).
//   drill1: find the weights, ten rounds (whole numbers, one weight given, negatives, fractions, many, none).
//   drill2: span, six rounds (a line, in the span or not, line or plane, doubling, flipping).
import type { PuzzleDef } from '../../../game/types';
import { h } from '../../../ui/ui';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import {
  PlaneView, plainDock, eqRound, runDrill, focusSoon, hideHint, same, mul, lin, tv, tn, tnp, rng, pickInt, independent,
  UNREAD_M, type NumCell, type Round, type RoundCtx, type Vec,
} from '../../../kit/plain';
import { G, R, eqLine, fast, givens, playCombo, primary, plain, redArrow, tmulName, weightCell } from './parts';
import { DRILL1, DRILL2, V, W } from './text';

// ------------------------------------------------------------------ a round: a v + b w = t

interface ComboSpec {
  id: string;
  name: string;
  v: Vec;
  w: Vec;
  t: Vec;
  /** A weight that is given (its box is replaced by the number). */
  a?: number;
  b?: number;
  /** The weights, or null when none work. */
  ans: [number, number] | null;
  /** Many weights work: accept any pair that hits t. */
  many?: boolean;
  /** Offer "No weights work". */
  none?: boolean;
  hints: string[];
}

function comboRound(s: ComboSpec): Round {
  const goal = s.a !== undefined ? DRILL1.one('b') : s.b !== undefined ? DRILL1.one('a') : DRILL1.both;
  return {
    id: s.id, name: s.name, goal,
    start(rc: RoundCtx) {
      const { view, d, p } = rc;
      let busy = false, done = false;
      givens(view, s.v, s.w);
      const pad = view.target(s.t);
      const pts: Vec[] = [s.v, s.w, s.t];
      if (s.ans) pts.push(mul(s.ans[0], s.v));
      void view.frame(pts, { ms: 0, min: 3 });
      const ca: NumCell | null = s.a === undefined ? weightCell('a', () => (cb ? cb.focus() : check())) : null;
      const cb: NumCell | null = s.b === undefined ? weightCell('b', () => check()) : null;
      const go = primary(DRILL1.check, () => check());
      const noneBtn = s.none ? plain(DRILL1.none, () => pickNone()) : null;
      d.body.append(eqLine([
        ...(ca ? [ca, G(s.v)] : [`${tnp(s.a!)}${G(s.v)}`]), '+',
        ...(cb ? [cb, R(s.w)] : [`${tnp(s.b!)}${R(s.w)}`]), `= ${tv(s.t)}`,
      ], go));
      if (noneBtn) d.body.append(h('div', { class: 'tj-row' }, noneBtn));
      focusSoon(p, ca ?? cb!);

      const lock = (on: boolean) => { go.disabled = !on; ca?.enable(on); cb?.enable(on); if (noneBtn) noneBtn.disabled = !on; };
      /** hit: false when the answer is that no weights work (the target stays unmarked). */
      const right = (msg: string, hit = true) => {
        done = true;
        sfx.success();
        if (hit) void pad.hit();
        d.msg(msg, 'good');
        rc.complete();
      };
      async function check(x?: [number, number]): Promise<void> {
        if (busy || done || !rc.live()) return;
        if (x) { ca?.set(x[0]); cb?.set(x[1]); }
        const a = ca ? ca.value() : s.a!, b = cb ? cb.value() : s.b!;
        if (a === null || b === null) { d.msg(UNREAD_M, 'warn'); return; }
        busy = true; lock(false);
        p.move();
        d.msg('');
        try {
          const end = await playCombo(view, a, s.v, b, s.w);
          if (!rc.live()) return;
          view.paint(end, 'y');
          const hitT = same(end, s.t);
          if (hitT && s.many) {
            const other: [number, number] = same([a, b], s.ans!) ? [1, 1] : s.ans!;
            right(DRILL1.also(other[0], s.v, other[1], s.w, s.t));
            return;
          }
          if (hitT) { right(DRILL1.right(a, s.v, b, s.w, s.t)); return; }
          rc.att.wrong++;
          view.miss(end, s.t);
          d.msg(DRILL1.wrong(a, s.v, b, s.w, end, s.t), 'bad');
        } finally { busy = false; if (rc.live()) lock(!done); }
      }
      function pickNone(): void {
        if (busy || done || !rc.live()) return;
        p.move();
        if (!s.ans) {
          view.line(s.v, { kind: 'y' });
          right(DRILL1.noneRight, false);
          lock(false);
          return;
        }
        rc.att.wrong++;
        sfx.miss();
        d.msg(DRILL1.noneWrong, 'bad');
      }
      return {
        hints: () => (done ? [] : s.hints),
        async show() {
          while (busy) await wait(20);
          if (done) return;
          if (s.ans) await check(s.ans); else pickNone();
          while (busy) await wait(20);
        },
      };
    },
  };
}

const rowsHint = (v: Vec, w: Vec, t: Vec) => `Top row: $${tn(v[0])}a ${w[0] < 0 ? '-' : '+'} ${tn(Math.abs(w[0]))}b = ${tn(t[0])}$. Bottom row: $${tn(v[1])}a ${w[1] < 0 ? '-' : '+'} ${tn(Math.abs(w[1]))}b = ${tn(t[1])}$.`.replace(/\b1([ab])/g, '$1').replace(/ 0[ab] [+-] /g, ' ');
const tryHint = (a: number, b: number) => `Try $a = ${tn(a)}$ and $b = ${tn(b)}$.`;

const ROUNDS1: Round[] = [
  comboRound({ id: 'w1', name: 'whole numbers', v: [1, 0], w: [0, 1], t: [3, 2], ans: [3, 2],
    hints: ['Top row: $a \\cdot 1 + b \\cdot 0 = 3$.', tryHint(3, 2)] }),
  comboRound({ id: 'w2', name: 'one weight given', v: V, w: W, t: [4, 2], a: 2, ans: [2, 0],
    hints: [`$2${tv(V)} = ${tv([4, 2])}$ already.`, 'Try $b = 0$.'] }),
  comboRound({ id: 'w3', name: 'one weight given', v: [1, 1], w: [1, -1], t: [4, 2], a: 3, ans: [3, 1],
    hints: [`$3${tv([1, 1])} = ${tv([3, 3])}$. What is left to add?`, 'Try $b = 1$.'] }),
  comboRound({ id: 'w4', name: 'both weights', v: V, w: W, t: [3, 4], ans: [1, 1],
    hints: [rowsHint(V, W, [3, 4]), tryHint(1, 1)] }),
  comboRound({ id: 'w5', name: 'a negative weight', v: [1, 2], w: [3, 1], t: [-1, 3], ans: [2, -1],
    hints: [rowsHint([1, 2], [3, 1], [-1, 3]), 'One weight is negative.', tryHint(2, -1)] }),
  comboRound({ id: 'w6', name: 'fractions', v: [2, 0], w: [0, 2], t: [1, 3], ans: [0.5, 1.5],
    hints: ['Top row: $2a = 1$. Bottom row: $2b = 3$.', tryHint(0.5, 1.5)] }),
  comboRound({ id: 'w7', name: 'a negative weight', v: [1, 1], w: [1, -1], t: [0, 4], ans: [2, -2],
    hints: [rowsHint([1, 1], [1, -1], [0, 4]), tryHint(2, -2)] }),
  comboRound({ id: 'w8', name: 'both weights', v: [3, 1], w: [1, 2], t: [5, 5], ans: [1, 2],
    hints: [rowsHint([3, 1], [1, 2], [5, 5]), 'From the top row, $b = 5 - 3a$.', tryHint(1, 2)] }),
  comboRound({ id: 'w9', name: 'many answers', v: [1, 2], w: [2, 4], t: [3, 6], ans: [3, 0], many: true, none: true,
    hints: [`$${tv([2, 4])} = 2${tv([1, 2])}$: both vectors are on one line.`, 'Top row: $a + 2b = 3$. Many pairs work.', tryHint(3, 0)] }),
  comboRound({ id: 'w10', name: 'no answer', v: [1, 2], w: [2, 4], t: [1, 0], ans: null, none: true,
    hints: [`$${tv([2, 4])} = 2${tv([1, 2])}$: every combination is on one line.`, 'Top row: $a + 2b = 1$. Bottom row: $2a + 4b = 0$. Can both hold?', 'Press **No weights work**.'] }),
];

/** More rounds: new v, w and weights each time. */
function extra1(n: number): Round {
  const r = rng(7919 * n + 13);
  let v: Vec = [1, 0], w: Vec = [0, 1];
  for (let i = 0; i < 40; i++) {
    v = [pickInt(r, -3, 3), pickInt(r, -3, 3)];
    w = [pickInt(r, -3, 3), pickInt(r, -3, 3)];
    if (independent(v, w)) break;
  }
  const a = pickInt(r, -3, 3, [0]), b = pickInt(r, -3, 3);
  const t = lin(a, v, b, w);
  return comboRound({ id: `x${n}`, name: 'more', v, w, t, ans: [a, b], hints: [rowsHint(v, w, t), tryHint(a, b)] });
}

export const drill1: PuzzleDef = {
  id: 'c02-drill1', title: DRILL1.title, goal: DRILL1.goal, hints: [], par: 12,
  setup(p) {
    const view = new PlaneView(p);
    const d = plainDock(p);
    hideHint(p);
    return runDrill(p, { key: 'c02-drill1', rounds: ROUNDS1, extra: extra1, view, d, frame: [[4, 4], [-3, -3]] });
  },
};

// ------------------------------------------------------------------ practice 2: span

/** A round answered by one of a few buttons. */
function choiceRound(s: {
  id: string; name: string; goal: string; frame: Vec[];
  draw(view: PlaneView): void;
  options: { label: string; right: boolean }[];
  /** The reason (the calculation), shown after any pick; then() draws what it says. */
  good: string; bad: string;
  then?(view: PlaneView, live: () => boolean): Promise<void> | void;
  hints: string[];
}): Round {
  return {
    id: s.id, name: s.name, goal: s.goal,
    start(rc) {
      const { view, d, p } = rc;
      let done = false, shown = false;
      s.draw(view);
      void view.frame(s.frame, { ms: 0, min: 3 });
      const btns = s.options.map((o) => plain(o.label, () => pick(o.right)));
      d.body.append(h('div', { class: 'tj-row' }, ...btns));
      const pick = (ok: boolean) => {
        if (done || !rc.live()) return;
        p.move();
        if (!shown && s.then) { shown = true; void s.then(view, rc.live); }
        if (ok) {
          done = true;
          for (const b of btns) b.disabled = true;
          sfx.success();
          d.msg(s.good, 'good');
          rc.complete();
          return;
        }
        rc.att.wrong++;
        sfx.miss();
        d.msg(s.bad, 'bad');
      };
      return { hints: () => (done ? [] : s.hints), async show() { if (!done) pick(true); } };
    },
  };
}

const L1: Vec = [1, 2], L2: Vec = [2, 4];
const VW = `$\\mathbf v = ${tv(V)}$, $\\mathbf w = ${tv(W)}$.`;
const span12 = `\\operatorname{span}\\left\\{${G(L1)}, ${R(L2)}\\right\\}`;

const ROUNDS2: Round[] = [
  eqRound<number>({
    id: 's1', name: 'a span that is a line',
    goal: `$\\operatorname{span}\\left\\{${G(L1)}, \\cr{\\begin{bmatrix}2 \\\\ k\\end{bmatrix}}\\right\\}$ is a line. Find $k$.`,
    left: 'k =', answer: 4,
    draw: (view) => { view.arrow('v', 'g').set(L1, [0, 0]); },
    frame: [L1, [2, 4], [2, -1]],
    play: async (view, k) => {
      view.clear();
      view.arrow('v', 'g').set(L1, [0, 0]);
      view.line(L1, { kind: 'g' });
      await redArrow(view, 'w').grow([2, k], { from: [0, 0], ms: 420 });
    },
    good: () => `$${tv([2, 4])} = 2${tv(L1)}$: on the line through $${tv(L1)}$.`,
    bad: (k) => `$2${tv(L1)} = ${tv([2, 4])}$, not $${tv([2, k])}$.`,
    hints: ['The two vectors must be on one line.', `$\\begin{bmatrix}2 \\\\ k\\end{bmatrix} = 2${tv(L1)}$.`, 'Try $k = 4$.'],
  }),
  eqRound<number>({
    id: 's2', name: 'in the span',
    goal: `Is $${tv([3, 6])}$ in $${span12}$? Fill in the box.`,
    left: `${tv([3, 6])} =`, right: G(L1), answer: 3,
    draw: (view) => { givens(view, L1, L2); view.target([3, 6]); },
    frame: [L1, L2, [3, 6]],
    play: async (view, c) => {
      view.clear();
      redArrow(view, 'w').set(L2, [0, 0]);
      const g = view.arrow('v', 'g').set(L1, [0, 0]);
      await g.scaleTo(c);
    },
    good: () => `$3${tv(L1)} = ${tv([3, 6])}$: it is in the span.`,
    bad: (c) => `$${tnp(c)}${tv(L1)} = ${tv(mul(c, L1))}$, not $${tv([3, 6])}$.`,
    hints: ['Which number times $1$ gives $3$?', 'Try $3$.'],
  }),
  choiceRound({
    id: 's3', name: 'in the span or not',
    goal: `Is $${tv([3, 1])}$ in $${span12}$?`,
    frame: [L1, L2, [3, 1]],
    draw: (view) => { givens(view, L1, L2); view.target([3, 1]); },
    options: [{ label: DRILL2.yes, right: false }, { label: DRILL2.no, right: true }],
    good: `No. $a${G(L1)} + b${R(L2)} = (a + 2b)${tv(L1)}$: always on the line through $${tv(L1)}$.`,
    bad: `$a${G(L1)} + b${R(L2)} = (a + 2b)${tv(L1)}$: always on the line through $${tv(L1)}$.`,
    then: (view) => view.line(L1, { kind: 'y' }),
    hints: [`$${tv(L2)} = 2${tv(L1)}$.`, `Is $${tv([3, 1])}$ on the line through $${tv(L1)}$?`, 'No.'],
  }),
  choiceRound({
    id: 's4', name: 'line or plane',
    goal: `$\\operatorname{span}\\left\\{${G([1, 0])}, ${R([0, 1])}\\right\\}$ is a line or a plane?`,
    frame: [[3, 3], [-3, -3]],
    draw: (view) => { givens(view, [1, 0], [0, 1]); },
    options: [{ label: DRILL2.line, right: false }, { label: DRILL2.plane, right: true }],
    good: `A plane. $a${G([1, 0])} + b${R([0, 1])} = \\begin{bmatrix}a \\\\ b\\end{bmatrix}$ is any vector.`,
    bad: `$a${G([1, 0])} + b${R([0, 1])} = \\begin{bmatrix}a \\\\ b\\end{bmatrix}$ is any vector.`,
    then: async (view, live) => {
      for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) { if (!live()) return; view.paint([a, b], 'y'); if (!fast()) await wait(14); }
    },
    hints: ['The two vectors point along different lines.', '$a$ and $b$ can be any numbers, so $\\begin{bmatrix}a \\\\ b\\end{bmatrix}$ is any vector.'],
  }),
  doubled(),
  flipped(),
];

/** 3(2v) + 1(2w) = [ ]v + [ ]w: doubling v and w reaches nothing new. */
function doubled(): Round {
  const t = lin(6, V, 2, W);
  return {
    id: 's5', name: 'doubling v and w',
    goal: `${VW} Fill in the boxes.`,
    start(rc) {
      const { view, d, p } = rc;
      let busy = false, done = false;
      givens(view, V, W, ['v', 'w']);
      const pad = view.target(t);
      void view.frame([V, W, t, mul(6, V)], { ms: 0 });
      const ca = weightCell('a', () => cb.focus()), cb = weightCell('b', () => void check());
      const go = primary('Check', () => void check());
      d.body.append(eqLine(['3(2\\mathbf v) + 1(2\\mathbf w) =', ca, '\\mathbf v', '+', cb, '\\mathbf w'], go));
      focusSoon(p, ca);
      const tex = (a: number, b: number) => `${tmulName(a, 'v')} ${b < 0 ? '-' : '+'} ${tmulName(Math.abs(b), 'w')}`;
      async function check(x?: [number, number]): Promise<void> {
        if (busy || done || !rc.live()) return;
        if (x) { ca.set(x[0]); cb.set(x[1]); }
        const a = ca.value(), b = cb.value();
        if (a === null || b === null) { d.msg(UNREAD_M, 'warn'); return; }
        busy = true; go.disabled = true;
        p.move(); d.msg('');
        try {
          const end = await playCombo(view, a, V, b, W, { names: ['v', 'w'] });
          if (!rc.live()) return;
          if (same([a, b], [6, 2])) {
            done = true; sfx.success(); void pad.hit();
            d.msg(`$3(2\\mathbf v) + 1(2\\mathbf w) = 6\\mathbf v + 2\\mathbf w = ${tv(t)}$: still a linear combination of $\\mathbf v$ and $\\mathbf w$.`, 'good');
            rc.complete();
            return;
          }
          rc.att.wrong++;
          view.miss(end, t);
          d.msg(`$${tex(a, b)} = ${tv(end)}$, not $3(2\\mathbf v) + 1(2\\mathbf w) = ${tv(t)}$.`, 'bad');
        } finally { busy = false; go.disabled = done; }
      }
      return {
        hints: () => (done ? [] : ['$3(2\\mathbf v) = 6\\mathbf v$.', 'Try $6$ and $2$.']),
        async show() { while (busy) await wait(20); if (!done) await check([6, 2]); },
      };
    },
  };
}

/** −v + [ ](−w) = [0;5]: flipping w reaches nothing new. */
function flipped(): Round {
  const mw = mul(-1, W), t: Vec = [0, 5];
  const tex = (x: number) => `-\\mathbf v ${x < 0 ? '-' : '+'} ${tnp(Math.abs(x))}(-\\mathbf w)`;
  return eqRound<number>({
    id: 's6', name: 'flipping w',
    goal: `${VW} Fill in the box.`,
    left: '-\\mathbf v + {}', right: `(-\\mathbf w) = ${tv(t)}`, answer: -2,
    draw: (view) => { givens(view, V, mw, ['v', '-\\mathbf w']); view.target(t); },
    frame: [V, mw, t, [-2, 1]],
    play: (view, x) => playCombo(view, -1, V, x, mw),
    good: () => `$-\\mathbf v - 2(-\\mathbf w) = -\\mathbf v + 2\\mathbf w = ${tv(t)}$.`,
    bad: (x) => `$${tex(x)} = ${tv(lin(-1, V, x, mw))}$, not $${tv(t)}$.`,
    hints: [`You made $${tv(t)}$ before: $-\\mathbf v + 2\\mathbf w$.`, '$2\\mathbf w = -2(-\\mathbf w)$.', 'Try $-2$.'],
  });
}

export const drill2: PuzzleDef = {
  id: 'c02-drill2', title: DRILL2.title, goal: DRILL2.goal, hints: [], par: 8,
  setup(p) {
    const view = new PlaneView(p);
    const d = plainDock(p);
    hideHint(p);
    return runDrill(p, { key: 'c02-drill2', rounds: ROUNDS2, view, d, frame: [[4, 4], [-3, -3]] });
  },
};

