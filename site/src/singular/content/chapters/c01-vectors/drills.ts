// Chapter 1: three practice drills of ten short rounds (adding, multiplying, length), on the kit's drill
// shell. Every round is one equation with one box (a number, or a stacked vector) and Check; rounds of the
// form "? v = w" also offer "No number works", in every such round, so the button never gives the answer away.
// The chart shows what the typed answer gives; it never shows the answer before a Check.
import type { PuzzleDef } from '../../../game/types';
import { button, h, inline } from '../../../ui/ui';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import type { Pad } from '../../../gfx/markers';
import {
  PlaneView, runDrill, hideHint, focusSoon, NumCell, VecField, same, add, mul, onLineOf, multipleOf,
  tv, tmul, tnorm, UNREAD, UNREAD_M, type Round, type Vec,
} from '../../../kit/plain';
import { B, DRILL, FILL, G, Y, sumSq, tmulParts, tparts, tplus, tpt, troot, tsq } from './text';
import { VecNField, circle, clearExtras, dock, hold, legsAt, otherOrder, stretch, tipToTail } from './parts';

// ------------------------------------------------------------------ one equation, one box

interface Spec<T extends number | Vec> {
  id: string;
  name: string;
  goal: string;
  /** TeX around the box (no $). */
  left?: string;
  right?: string;
  /** 'num': one number; 2 or 3: a stacked vector with that many parts. */
  box: 'num' | 2 | 3;
  /** Colour of the typed numbers: yellow (the result, default), green or blue (the arrow it draws). */
  boxKind?: 'y' | 'g' | 'b';
  /** The answer; null when no number works. */
  answer: T | null;
  /** Offer "No number works" (every round of the form ? v = w). */
  none?: boolean;
  draw?(view: PlaneView): void;
  frame?: Vec[];
  play?(view: PlaneView, x: T): Promise<unknown>;
  judge?(x: T): boolean;
  good(x: T): string;
  bad(x: T): string;
  ghost?(x: T): Vec | null;
  /** "No number works" pressed when it is right: the message and the picture. */
  noneGood?: string;
  noneShow?(view: PlaneView): void;
  hints: string[];
}

function boxRound<T extends number | Vec>(s: Spec<T>): Round {
  return {
    id: s.id, name: s.name, goal: s.goal,
    start(rc) {
      const { view, d, p } = rc;
      let busy = false, done = false;
      const fire = () => void onCheck();
      const cell = s.box === 'num' ? new NumCell({ aria: 'the number in the equation', onEnter: fire, cls: 'm', placeholder: '?' }) : null;
      const f2 = s.box === 2 ? new VecField({ label: '', onEnter: fire, aria: ['first number of the answer', 'second number of the answer'] }) : null;
      const f3 = s.box === 3 ? new VecNField(3, { onEnter: fire }) : null;
      const go = button('Check', fire, { cls: 'primary small' });
      const tex = (t?: string) => (t ? h('span', { class: 'k', html: inline(`$${t}$`) }) : null);
      const kind = s.boxKind && s.boxKind !== 'y' ? ` c01-box-${s.boxKind}` : '';
      const row = h('div', { class: `tj-row pk-eq${kind}` }, tex(s.left), cell?.el ?? f2?.el ?? f3!.el, tex(s.right), go);
      const none = s.none ? button(DRILL.none, () => void onNone(), { cls: 'small' }) : null;
      d.body.append(row, ...(none ? [h('div', { class: 'tj-row' }, none)] : []));
      const enable = (on: boolean) => { cell?.enable(on); f2?.enable(on); f3?.enable(on); go.disabled = !on; if (none) none.disabled = !on; };
      const read = (): T | null => {
        const x = cell ? cell.value() : f2 ? f2.get() : f3!.get();
        if (x === null) d.msg(cell ? UNREAD_M : UNREAD, 'warn');
        return x as T | null;
      };
      const set = (x: T) => { if (cell) cell.set(x as number); else if (f2) f2.set(x as Vec); else f3!.set(x as Vec); };
      clearExtras(view);
      s.draw?.(view);
      void view.frame(s.frame ?? [[3, 3], [-3, -3]], { ms: 0 });
      focusSoon(p, cell ?? f2 ?? f3!);

      const onCheck = async () => {
        if (busy || done || !rc.live()) return;
        const x = read();
        if (x === null) return;
        busy = true; enable(false);
        p.move();
        d.msg('');
        try {
          view.ghost(null);
          clearExtras(view);
          if (s.play) await s.play(view, x);
          if (!rc.live()) return;
          const ok = s.answer !== null && (s.judge ? s.judge(x) : same(x, s.answer));
          if (ok) { done = true; sfx.success(); d.msg(s.good(x), 'good'); rc.complete(); return; }
          rc.att.wrong++;
          sfx.miss();
          const g = s.ghost?.(x);
          if (g) view.ghost(g);
          d.msg(s.bad(x), 'bad');
        } finally { busy = false; if (rc.live()) enable(!done); }
      };
      const onNone = async () => {
        if (busy || done || !rc.live()) return;
        p.move();
        if (s.answer !== null) { rc.att.wrong++; sfx.miss(); d.msg(DRILL.someWorks, 'warn'); return; }
        done = true; enable(false);
        view.ghost(null);
        s.noneShow?.(view);
        sfx.success();
        d.msg(s.noneGood ?? '', 'good');
        rc.complete();
      };
      return {
        hints: () => (done ? [] : s.hints),
        async show() {
          while (busy) await wait(20);
          if (done) return;
          if (s.answer === null) { await onNone(); return; }
          set(s.answer); await onCheck();
          while (busy) await wait(20);
        },
      };
    },
  };
}

const sub = (a: Vec, b: Vec): Vec => a.map((x, i) => x - b[i]);
const sumAll = (vs: Vec[]): Vec => vs.reduce((s, v) => s.map((x, i) => x + v[i]));
const pads = new WeakMap<PlaneView, Pad>();
const ring = (view: PlaneView, at: Vec) => pads.set(view, view.target(at));
/** The tip ended at `end`: on the ring, or a miss with a dashed gap to it. */
async function land(view: PlaneView, end: Vec, at: Vec): Promise<void> {
  const pad = pads.get(view);
  if (same(end, at)) { if (pad) await view.arrive(pad); } else view.miss(end, at);
}

// ------------------------------------------------------------------ adding: ten rounds

/** a + b (+ c) = [ ]: the sum is drawn tip to tail, the typed answer is a ghost ring. */
function sumRound(id: string, name: string, vs: Vec[], o: { goal?: string; left?: string; labels?: string[]; both?: boolean; good?: (s: Vec) => string; hints?: string[] } = {}): Round {
  const s = sumAll(vs);
  // named givens (round 9): the message writes their numbers out
  const lhs = o.left ? `${o.left} = ${tplus(vs)}` : tplus(vs);
  const colour = (v: Vec, i: number) => (i === 0 ? G(tv(v)) : i === 1 ? B(tv(v)) : tv(v));
  return boxRound<Vec>({
    id, name, goal: o.goal ?? FILL,
    left: `${o.left ?? vs.map(colour).join(' + ')} =`, box: vs[0].length as 2 | 3, answer: s,
    draw: vs[0].length === 2 ? (view) => vs.forEach((v, i) => view.arrow(`g${i}`, (['g', 'b', 'w'] as const)[i]).set(v, [0, 0]).label(o.labels?.[i] ?? '')) : undefined,
    frame: vs[0].length === 2 ? [...vs, s, vs.slice(0, 2).reduce((a, b) => add(a, b))] : undefined,
    play: vs[0].length === 2 ? async (view) => { await tipToTail(view, vs, { labels: o.labels }); if (o.both) await otherOrder(view, vs[0], vs[1]); } : undefined,
    ghost: vs[0].length === 2 ? (x) => x : undefined,
    good: () => (o.good ? o.good(s) : o.left ? `$${lhs} = ${tv(s)}$.` : `$${lhs} = ${tparts(vs)} = ${tv(s)}$.`),
    bad: (x) => `$${lhs} = ${tparts(vs)}$, not $${tv(x)}$.`,
    hints: o.hints ?? ['Add the top numbers, then the bottom numbers.', `Try $${tv(s)}$.`],
  });
}

const A3U: Vec = [5, 0], A3T: Vec = [2, 3];
const A4V: Vec = [1, 3], ZERO: Vec = [0, 0];
const A7U: Vec = [4, 2], A7V: Vec = [5, -1];
const A8P: Vec = [1, 4], A8Q: Vec = [6, 1];
const A9U: Vec = [3, 1], A9V: Vec = [-1, 2];

const ADD_ROUNDS: Round[] = [
  sumRound('a1', 'two vectors', [[3, 1], [1, 2]]),
  sumRound('a2', 'with negatives', [[2, -1], [-3, 4]]),
  boxRound<Vec>({
    id: 'a3', name: 'the missing vector', goal: FILL,
    left: `${G(tv(A3U))} +`, right: `= ${Y(tv(A3T))}`, box: 2, boxKind: 'b', answer: sub(A3T, A3U),
    draw: (view) => { view.arrow('u', 'g').set(A3U, [0, 0]); ring(view, A3T); },
    frame: [A3U, A3T],
    play: async (view, x) => { const s = await tipToTail(view, [A3U, x]); await land(view, s, A3T); },
    good: (x) => `$${tplus([A3U, x])} = ${tparts([A3U, x])} = ${tv(A3T)}$.`,
    bad: (x) => `$${tplus([A3U, x])} = ${tv(add(A3U, x))}$, not $${tv(A3T)}$.`,
    hints: ['Top: $5 + \\square = 2$. Bottom: $0 + \\square = 3$.', `Try $${tv(sub(A3T, A3U))}$.`],
  }),
  boxRound<Vec>({
    id: 'a4', name: 'back to zero', goal: FILL,
    right: `+ ${B(tv(A4V))} = ${Y(tv(ZERO))}`, box: 2, boxKind: 'g', answer: [-1, -3],
    draw: (view) => { view.arrow('v', 'b').set(A4V, [0, 0]); ring(view, ZERO); },
    frame: [A4V, [-1, -3]],
    play: async (view, x) => { const s = await tipToTail(view, [x, A4V]); await land(view, s, ZERO); },
    good: (x) => `$${tplus([x, A4V])} = ${tparts([x, A4V])} = ${tv(ZERO)}$.`,
    bad: (x) => `$${tplus([x, A4V])} = ${tv(add(x, A4V))}$, not $${tv(ZERO)}$.`,
    hints: ['Top: $\\square + 1 = 0$. Bottom: $\\square + 3 = 0$.', 'Try $\\begin{bmatrix}-1 \\\\ -3\\end{bmatrix}$.'],
  }),
  sumRound('a5', 'the other order', [[-3, 4], [2, -1]], { both: true, good: (s) => `$${tplus([[-3, 4], [2, -1]])} = ${tparts([[-3, 4], [2, -1]])} = ${tv(s)}$. Round 2 gave the same.` }),
  sumRound('a6', 'three vectors', [[2, 5], [-3, 1], [4, -2]]),
  boxRound<Vec>({
    id: 'a7', name: 'subtracting', goal: FILL,
    left: `${G(tv(A7U))} - ${B(tv(A7V))} =`, box: 2, answer: sub(A7U, A7V),
    draw: (view) => { view.arrow('u', 'g').set(A7U, [0, 0]); view.arrow('v', 'b').set(A7V, [0, 0]); },
    frame: [A7U, A7V],
    // the typed answer from the tip of v: it lands on the tip of u only when v + answer = u
    play: async (view, x) => {
      view.clear();
      view.arrow('u', 'g').set(A7U, [0, 0]); view.arrow('v', 'b').set(A7V, [0, 0]);
      await view.arrow('d', 'y').grow(x, { from: A7V, ms: 520 });
      if (!same(add(A7V, x), A7U)) view.miss(add(A7V, x), A7U);
    },
    good: () => `$${tplus([A7U, A7V], '-')} = ${tparts([A7U, A7V], '-')} = ${tv(sub(A7U, A7V))}$.`,
    bad: (x) => `$${tplus([A7U, A7V], '-')} = ${tparts([A7U, A7V], '-')}$, not $${tv(x)}$.`,
    hints: ['Subtract the top numbers, then the bottom numbers.', `Try $${tv(sub(A7U, A7V))}$.`],
  }),
  boxRound<Vec>({
    id: 'a8', name: 'from P to Q', goal: `$P = ${tpt(A8P)}$ and $Q = ${tpt(A8Q)}$.`,
    left: 'Q - P =', box: 2, answer: sub(A8Q, A8P),
    draw: (view) => { view.mark(A8P, '$P$'); view.mark(A8Q, '$Q$', 'w', true); },
    frame: [A8P, A8Q],
    // the typed vector drawn from P: it ends on Q only when it is Q − P
    play: async (view, x) => {
      view.clear();
      view.mark(A8P, '$P$'); view.mark(A8Q, '$Q$', 'w', true);
      await view.arrow('d', 'y').grow(x, { from: A8P, ms: 520 });
      if (!same(add(A8P, x), A8Q)) view.miss(add(A8P, x), A8Q);
    },
    good: () => `$Q - P = ${tparts([A8Q, A8P], '-')} = ${tv(sub(A8Q, A8P))}$.`,
    bad: (x) => `$Q - P = ${tparts([A8Q, A8P], '-')}$, not $${tv(x)}$.`,
    hints: ['End minus start: $Q - P$, part by part.', `Try $${tv(sub(A8Q, A8P))}$.`],
  }),
  sumRound('a9', 'read from the grid', [A9U, A9V], {
    goal: 'Read $\\mathbf u$ and $\\mathbf v$ from the grid.', left: '\\mathbf u + \\mathbf v', labels: ['$\\mathbf u$', '$\\mathbf v$'],
    hints: ['Count the squares: $\\mathbf u$ goes 3 right and 1 up.', `$\\mathbf u = ${tv(A9U)}$ and $\\mathbf v = ${tv(A9V)}$.`, `Try $${tv(add(A9U, A9V))}$.`],
  }),
  sumRound('a10', 'three numbers each', [[1, 2, 0], [2, -1, 3]]),
];

// ------------------------------------------------------------------ multiplying: ten rounds

/** ? v = t, with "No number works" (t may be off the line through v). */
function multRound(id: string, name: string, v: Vec, t: Vec, hints: string[]): Round {
  const c = onLineOf(v, t) ? multipleOf(t, v) : null;
  return boxRound<number>({
    id, name, goal: FILL,
    right: `${G(tv(v))} = ${Y(tv(t))}`, box: 'num', answer: c, none: true,
    draw: (view) => { view.arrow('v', 'g').set(v, [0, 0]); ring(view, t); },
    frame: [v, t],
    play: async (view, x) => { const w = await stretch(view, x, v); await land(view, w, t); },
    good: (x) => `$${tmul(x, v)} = ${tmulParts(x, v)} = ${tv(t)}$.`,
    bad: (x) => `$${tmul(x, v)} = ${tv(mul(x, v))}$, not $${tv(t)}$.`,
    noneGood: DRILL.noneRight(v, t),
    noneShow: (view) => { view.clear(); view.arrow('v', 'g').set(v, [0, 0]); view.line(v); },
    hints,
  });
}
/** k v = [ ]. */
function timesRound(id: string, name: string, k: number, v: Vec, left?: string): Round {
  const w = mul(k, v);
  const form = left ?? tmul(k, '\\square');
  const lhs = form.replace('\\square', tv(v));
  return boxRound<Vec>({
    id, name, goal: FILL,
    left: `${form.replace('\\square', G(tv(v)))} =`, box: 2, answer: w,
    draw: (view) => { view.arrow('v', 'g').set(v, [0, 0]); },
    frame: [v, w],
    play: (view) => stretch(view, k, v),
    ghost: (x) => x,
    good: () => `$${lhs} = ${tmulParts(k, v)} = ${tv(w)}$.`,
    bad: (x) => `$${lhs} = ${tmulParts(k, v)}$, not $${tv(x)}$.`,
    hints: ['Multiply each number by the same number.', `Try $${tv(w)}$.`],
  });
}

const M_V: Vec = [2, 1];
const M10U: Vec = [1, 3], M10V: Vec = [1, -1];
const MUL_ROUNDS: Round[] = [
  timesRound('m1', 'a number times a vector', 3, M_V),
  multRound('m2', 'find the number', M_V, [8, 4], ['$\\square \\cdot 2 = 8$.', 'Try $4$.']),
  multRound('m3', 'a negative number', M_V, [-6, -3], ['The point is on the other side of the origin.', 'Try $-3$.']),
  multRound('m4', 'a fraction', [4, -2], [2, -1], ['$\\square \\cdot 4 = 2$.', 'Try $0.5$.']),
  timesRound('m5', 'zero', 0, [5, -7]),
  multRound('m6', 'off the line', [1, 3], [2, 5], ['Top: $\\square \\cdot 1 = 2$. Bottom: $\\square \\cdot 3 = 5$.', 'No number does both: press **No number works**.']),
  timesRound('m7', 'minus one', -1, [3, -2], '-1\\square'),
  multRound('m8', 'negative and a fraction', [-2, 6], [5, -15], ['$\\square \\cdot (-2) = 5$.', 'Try $-2.5$.']),
  multRound('m9', 'off the line again', [3, 1], [6, 3], ['Top: $\\square \\cdot 3 = 6$. Bottom: $\\square \\cdot 1 = 3$.', 'No number does both: press **No number works**.']),
  boxRound<Vec>({
    id: 'm10', name: 'multiply, then add', goal: FILL,
    left: `2${G(tv(M10U))} + ${B(tv(M10V))} =`, box: 2, answer: add(mul(2, M10U), M10V),
    draw: (view) => { view.arrow('u', 'g').set(M10U, [0, 0]); view.arrow('v', 'b').set(M10V, [0, 0]); },
    frame: [M10U, mul(2, M10U), add(mul(2, M10U), M10V)],
    play: (view) => view.combine(2, M10U, 1, M10V, { bare: true, noFrame: true }),
    ghost: (x) => x,
    good: () => `$2${tv(M10U)} + ${tv(M10V)} = ${tv(mul(2, M10U))} + ${tv(M10V)} = ${tv(add(mul(2, M10U), M10V))}$.`,
    bad: (x) => `$2${tv(M10U)} + ${tv(M10V)} = ${tv(mul(2, M10U))} + ${tv(M10V)}$, not $${tv(x)}$.`,
    hints: [`First $2${tv(M10U)} = ${tv(mul(2, M10U))}$.`, `Try $${tv(add(mul(2, M10U), M10V))}$.`],
  }),
];

// ------------------------------------------------------------------ length: ten rounds

/** ‖v‖ = ?: v and its legs; a Check draws the circle of the typed radius (the tip is on it only when right). */
function lenRound(id: string, name: string, v: Vec, o: { judge?: (x: number) => boolean; hints?: string[] } = {}): Round {
  // the kit's norm() is 2-D only
  const n = Math.round(Math.sqrt(sumSq(v)) * 1e9) / 1e9;
  const flat = v.length === 2;
  return boxRound<number>({
    id, name, goal: FILL,
    left: `${tnorm(v)} =`, box: 'num', answer: n,
    draw: flat ? (view) => { view.arrow('v', 'g').set(v, [0, 0]); void view.legs(v, 300); } : undefined,
    frame: flat ? [v, [v[0], 0]] : undefined,
    play: flat ? async (view, x) => { circle(view, [0, 0], x); await hold(250); } : undefined,
    judge: o.judge,
    good: () => DRILL.lenRight(tnorm(v), v),
    bad: (x) => DRILL.lenWrong(x, v),
    hints: o.hints ?? ['Square each number, add, take the square root.', `$\\sqrt{${tsq(v)}} = ${troot(sumSq(v))}$.`],
  });
}

const L6: Vec = [3, 4];
const L7P: Vec = [1, 4], L7Q: Vec = [4, 8];
const LEN_ROUNDS: Round[] = [
  lenRound('l1', 'two numbers', [6, 8]),
  lenRound('l2', 'negative numbers', [-3, -4]),
  lenRound('l3', 'a bigger triangle', [5, 12]),
  lenRound('l4', 'one number is zero', [0, -7], { hints: ['One leg is $0$ long.', '$\\sqrt{0^2 + 7^2} = 7$.'] }),
  lenRound('l5', 'not a whole number', [1, 1], {
    judge: (x) => Math.abs(x - Math.SQRT2) < 0.006,
    hints: ['$\\sqrt{1^2 + 1^2} = \\sqrt 2$.', 'Two decimal places: $1.41$.'],
  }),
  boxRound<number>({
    id: 'l6', name: 'twice a vector', goal: FILL,
    left: `\\left\\|2${G(tv(L6))}\\right\\| =`, box: 'num', answer: 10,
    draw: (view) => { view.arrow('v', 'g').set(L6, [0, 0]); void view.legs(L6, 300); },
    frame: [mul(2, L6), [6, 0]],
    play: async (view, x) => { await stretch(view, 2, L6); await view.legs(mul(2, L6), 400); circle(view, [0, 0], x); await hold(250); },
    good: () => `$\\left\\|2${tv(L6)}\\right\\| = \\left\\|${tv(mul(2, L6))}\\right\\| = \\sqrt{6^2 + 8^2} = 10 = 2 \\cdot 5$.`,
    bad: (x) => DRILL.lenWrong(x, mul(2, L6), `$2${tv(L6)} = ${tv(mul(2, L6))}$. `),
    hints: [`$2${tv(L6)} = ${tv(mul(2, L6))}$.`, '$\\sqrt{6^2 + 8^2} = 10$.'],
  }),
  boxRound<number>({
    id: 'l7', name: 'from P to Q', goal: `$P = ${tpt(L7P)}$ and $Q = ${tpt(L7Q)}$.`,
    left: '\\|Q - P\\| =', box: 'num', answer: 5,
    draw: (view) => { view.mark(L7P, '$P$', 'w', true); view.mark(L7Q, '$Q$'); view.arrow('d', 'g').set(sub(L7Q, L7P), L7P); legsAt(view, L7P, sub(L7Q, L7P)); },
    frame: [L7P, L7Q, [0, 0]],
    play: async (view, x) => { legsAt(view, L7P, sub(L7Q, L7P)); circle(view, L7P, x); await hold(250); },
    good: () => `$Q - P = ${tv(sub(L7Q, L7P))}$, so $\\|Q - P\\| = \\sqrt{3^2 + 4^2} = 5$.`,
    bad: (x) => DRILL.lenWrong(x, sub(L7Q, L7P), `$Q - P = ${tv(sub(L7Q, L7P))}$. `),
    hints: [`$Q - P = ${tv(sub(L7Q, L7P))}$.`, '$\\sqrt{3^2 + 4^2} = 5$.'],
  }),
  lenRound('l8', 'a negative part', [12, -9]),
  lenRound('l9', 'three numbers', [1, 2, 2], { hints: ['Square each number, add, take the square root.', '$\\sqrt{1^2 + 2^2 + 2^2} = \\sqrt 9$.', 'Try $3$.'] }),
  lenRound('l10', 'three numbers again', [4, 4, 7], { hints: ['Square each number, add, take the square root.', '$\\sqrt{16 + 16 + 49} = \\sqrt{81}$.', 'Try $9$.'] }),
];

// ------------------------------------------------------------------ the three drill puzzles

function drillPuzzle(id: string, key: string, t: { title: string; goal: string }, rounds: Round[]): PuzzleDef {
  return {
    id, title: t.title, goal: t.goal, hints: [], par: rounds.length,
    setup(p) {
      const view = new PlaneView(p);
      const d = dock(p);
      hideHint(p);
      return runDrill(p, { key, rounds, view, d });
    },
  };
}

export const drillAdd = drillPuzzle('c01-drill-add', 'c01-drill-add', DRILL.add, ADD_ROUNDS);
export const drillMul = drillPuzzle('c01-drill-mul', 'c01-drill-mul', DRILL.mul, MUL_ROUNDS);
export const drillLen = drillPuzzle('c01-drill-len', 'c01-drill-len', DRILL.len, LEN_ROUNDS);
