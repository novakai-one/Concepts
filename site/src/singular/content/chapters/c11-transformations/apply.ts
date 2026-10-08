// Chapter 11, games 1–3, ten typed rounds each (Commander: no dragging).
//   1. A v = ?      type A v, apply A, watch v's steps along [1;0] and [0;1] become steps along the columns.
//   2. Find A       two equations A u = w; type A, apply it, the two points must land in their rings.
//   3. Is there a matrix?  a rule T moves the grid; type the matrix, or show with one number why none exists.
// Words follow docs/singular/ch18-plain-style.md: maths words, stacked vectors, one equation per question.
import type { PuzzleCtx, PuzzleDef } from '../../../game/types';
import { h, button, inline } from '../../../ui/ui';
import { sfx } from '../../../audio/sfx';
import { wait } from '../../../core/tween';
import { C } from '../../../core/theme';
import type { Mat, Vec } from '../../../math/la';
import { MatField, VecField, tcol, tn, typedDock, type TypedDock } from '../../../kit/typed';
import { runRounds, type Round, type RoundCtx } from '../../../kit/rounds';
import { Plane, type Rider } from '../../../kit/plane';
import {
  G1, G2, G3, apply, columns, evidencePoint, g1Answer, g1Right, g2Answer, g2Misses, g3Mismatch, same, usedRows,
  type ApplyRound, type FindRound, type MoveRound,
} from './apply-logic';
import { S } from './script';

/** Red text in TeX (\\cr is a row break inside a matrix, so it is not used here). */
const red = (s: string): string => `\\htmlClass{c-red}{${s}}`;
/** A matrix with column 1 green and column 2 red (the colours of the column arrows on the chart). */
export const texMc = (M: Mat): string => `\\begin{bmatrix}\\cg{${tn(M[0][0])}} & ${red(tn(M[0][1]))} \\\\ \\cg{${tn(M[1][0])}} & ${red(tn(M[1][1]))}\\end{bmatrix}`;
const E1 = tcol([1, 0]), E2 = tcol([0, 1]);
/** x₁ a₁ + x₂ a₂ with the columns coloured. */
const mix = (v: Vec, A: Mat): string => {
  const [a1, a2] = columns(A);
  const sgn = v[1] < 0 ? '-' : '+';
  return `${tn(v[0])}\\cg{${tcol(a1)}} ${sgn} ${tn(Math.abs(v[1]))}${red(tcol(a2))}`;
};
const UNREAD = 'Type a number in each box.';

/** Shared set-up: the chart, the dock, Apply and Show-me plumbing for one game. */
function game(p: PuzzleCtx, key: string, rounds: (pl: Plane, d: TypedDock) => Round[], note: string) {
  const pl = new Plane(p);
  const d = typedDock(p, null, undefined, 'A', { texM: texMc });
  return runRounds(p, { key, d, rounds: rounds(pl, d), reset: () => { pl.clear(); pl.showColumns(false); d.setMatrix(null); }, summaryNote: note });
}

/** Lock the controls while the chart moves; unlock after. */
async function busy<T>(els: { enable(on: boolean): void }[], btns: HTMLButtonElement[], f: () => Promise<T>): Promise<T> {
  els.forEach((e) => e.enable(false)); btns.forEach((b) => (b.disabled = true));
  try { return await f(); } finally { els.forEach((e) => e.enable(true)); btns.forEach((b) => (b.disabled = false)); }
}

// ================================================================== game 1 · A v = ?

function applyRound(pl: Plane, r: ApplyRound): Round {
  const want = apply(r.A, r.v);
  const goal = r.reverse
    ? `$A\\mathbf v = ${tcol(want)}$. Find $\\mathbf v$.`
    : `$\\mathbf v = ${tcol(r.v)}$. Find $A\\mathbf v$.`;
  return {
    name: r.reverse ? `A v = ${fmtList(want)}, find v` : `A ${fmtList(r.v)}`,
    goal,
    start(rc: RoundCtx) {
      const { p, d } = rc;
      d.setMatrix(r.A);
      const [a1, a2] = columns(r.A);
      const field = new VecField({ value: null, label: r.reverse ? '$\\mathbf v =$' : '$A\\mathbf v =$', neutral: true, onEnter: () => void go(), aria: ['top number', 'bottom number'] });
      const btn = button(inline('Apply $A$'), () => void go(), { cls: 'primary small', html: true });
      d.body.append(h('div', { class: 'tj-row' }, field.el, btn));
      // before: v as its steps along [1;0] (green) and [0;1] (red); reverse rounds show only the target
      const setBefore = () => {
        pl.reset(); pl.clearMarks();
        if (r.reverse) { pl.showVector(null); pl.ring(want, C.result); } else pl.showVector(r.v, '$\\mathbf v$');
      };
      setBefore();
      void pl.frame([r.v, want, a1, a2, [1, 1]], { ms: 0 });
      if (!p.g.headless) window.setTimeout(() => field.focus(), 60);
      let running = false, done = false;
      const go = async () => {
        if (running || done || !rc.alive()) return;
        const t = field.get();
        if (!t) { d.msg(UNREAD, 'warn'); return; }
        running = true;
        p.move();
        d.msg('');
        await busy([field], [btn], async () => {
          setBefore();
          const v = r.reverse ? t : r.v;
          if (r.reverse) { pl.showVector(v, '$\\mathbf v$'); await wait(p.g.headless ? 0 : 700); }
          else pl.ring(t, C.white, 'your answer');
          // keep the typed answer in view
          await pl.frame([r.v, want, a1, a2, [1, 1], t, apply(r.A, v)], { ms: 300 });
          await pl.apply(r.A, 1800);
          if (!rc.alive()) return;
          pl.markResult('$A\\mathbf v$');
          // the answer, as steps along the columns: the same colours as the calculation below
          pl.showSteps(true);
          const got = apply(r.A, v);
          if (g1Right(r, t)) {
            done = true;
            if (!r.reverse) pl.clearMarks();
            sfx.success();
            d.msg(`$A${tcol(v)} = ${mix(v, r.A)} = \\cy{${tcol(got)}}$`, 'good');
            rc.complete();
            return;
          }
          rc.att.wrong++;
          sfx.miss();
          if (r.reverse) {
            pl.gap(got, want);
            d.msg(`$A${tcol(t)} = ${mix(t, r.A)} = ${tcol(got)}$, not $${tcol(want)}$.`, 'bad');
          } else {
            pl.gap(t, got);
            const rows = usedRows(r, t) ? ' That used the rows of $A$ as columns.' : '';
            d.msg(`$A${tcol(v)} = ${mix(v, r.A)} = \\cy{${tcol(got)}}$, not $${tcol(t)}$.${rows}`, 'bad');
          }
        });
        running = false;
      };
      return {
        async show() { field.set(g1Answer(r)); await go(); },
        hints: () => r.reverse
          ? [
            `$A\\mathbf v = x_1\\cg{${tcol(a1)}} + x_2${red(tcol(a2))}$. Find $x_1, x_2$ that make it $${tcol(want)}$.`,
            `Top: $${tn(a1[0])}x_1 + ${tn(a2[0])}x_2 = ${tn(want[0])}$. Bottom: $${tn(a1[1])}x_1 + ${tn(a2[1])}x_2 = ${tn(want[1])}$.`.replace(/\+ -/g, '- '),
            `$\\mathbf v = ${tcol(r.v)}$: $${mix(r.v, r.A)} = ${tcol(want)}$.`,
          ]
          : [
            `$${tcol(r.v)} = ${tn(r.v[0])}${E1} + ${tn(r.v[1])}${E2}$.`.replace(/\+ -/g, '- '),
            `$A${E1} = \\cg{${tcol(a1)}}$, column 1 of $A$. $A${E2} = ${red(tcol(a2))}$, column 2.`,
            `$A${tcol(r.v)} = ${mix(r.v, r.A)} = \\cy{${tcol(want)}}$.`,
          ],
      };
    },
  };
}
const fmtList = (v: Vec) => `[${v.map((x) => tn(x).replace('-', '−')).join('; ')}]`;

export const p1: PuzzleDef = {
  id: 'c11-p1',
  title: 'Where does A send v?',
  goal: 'Type $A\\mathbf v$, then apply $A$.',
  hints: ['Each round has its own hints.'],
  par: 14,
  onWin: S.p1Win,
  setup: (p) => game(p, 'c11-g1', (pl) => G1.map((r) => applyRound(pl, r)),
    `$A\\mathbf v = x_1\\cg{\\mathbf a_1} + x_2${red('\\mathbf a_2')}$: the numbers of $\\mathbf v$ are the weights on the columns of $A$.`),
};

// ================================================================== game 2 · find A

function findRound(pl: Plane, r: FindRound): Round {
  const [u1, u2] = r.u, [w1, w2] = r.w;
  const A = g2Answer(r);
  const eq = `$A${tcol(u1)} = ${tcol(w1)}, \\quad A\\cb{${tcol(u2)}} = \\cb{${tcol(w2)}}$`;
  return {
    name: `A ${fmtList(u1)} = ${fmtList(w1)}, A ${fmtList(u2)} = ${fmtList(w2)}`,
    goal: `${eq}. Find $A$.`,
    start(rc: RoundCtx) {
      const { p, d } = rc;
      const field = new MatField({ onEnter: () => void go() });
      const btn = button(inline('Apply $A$'), () => void go(), { cls: 'primary small', html: true });
      d.body.append(h('div', { class: 'tj-row' }, field.el, btn));
      // each point is labelled with its vector, each ring with its target: the colours of the two equations
      let dots: Rider[] = [];
      const setBefore = () => {
        pl.clear(); pl.showColumns(false);
        // a point that is its own target is named once, by its ring
        dots = [pl.rider(u1, C.white, same(u1, w1) ? '' : `$${tcol(u1)}$`), pl.rider(u2, C.u, same(u2, w2) ? '' : `$${tcol(u2)}$`, 'b')];
        pl.ring(w1, C.white, `$${tcol(w1)}$`); pl.ring(w2, C.u, `$${tcol(w2)}$`, 'b');
      };
      setBefore();
      const [a1, a2] = columns(A);
      void pl.frame([u1, u2, w1, w2, a1, a2, [1, 1]], { ms: 0 });
      if (!p.g.headless) window.setTimeout(() => field.focus(), 60);
      let running = false, done = false;
      const go = async () => {
        if (running || done || !rc.alive()) return;
        const T = field.get();
        if (!T) { d.msg(UNREAD, 'warn'); return; }
        running = true;
        p.move();
        d.msg('');
        await busy([field], [btn], async () => {
          setBefore();
          await pl.frame([u1, u2, w1, w2, a1, a2, [1, 1], ...T[0].map((_, j) => [T[0][j], T[1][j]]), apply(T, u1), apply(T, u2)], { ms: 300 });
          dots.forEach((x) => x.label(''));
          await pl.apply(T, 1800);
          if (!rc.alive()) return;
          dots[0].label(`$A${tcol(u1)}$`); dots[1].label(`$A${tcol(u2)}$`);
          const miss = g2Misses(r, T);
          if (!miss.length) {
            done = true;
            sfx.success();
            d.msg(`$A = ${texMc(T)}$: $A${tcol(u1)} = ${mix(u1, T)} = ${tcol(w1)}$.`, 'good');
            rc.complete();
            return;
          }
          rc.att.wrong++;
          sfx.miss();
          for (const m of miss) pl.gap(m.got, r.w[m.i]);
          d.msg(miss.map((m) => `$A${tcol(r.u[m.i])} = ${mix(r.u[m.i], T)} = ${tcol(m.got)}$, not $${tcol(r.w[m.i])}$.`).join(' '), 'bad');
        });
        running = false;
      };
      return {
        async show() { field.set(A); await go(); },
        hints: () => [
          `$A${tcol([1, 0])} = \\cg{\\mathbf a_1}$ and $A${tcol([0, 1])} = ${red('\\mathbf a_2')}$, the columns of $A$. So $A\\begin{bmatrix}p\\\\q\\end{bmatrix} = p\\,\\cg{\\mathbf a_1} + q\\,${red('\\mathbf a_2')}$.`,
          `$${tn(u1[0])}\\cg{\\mathbf a_1} + ${tn(u1[1])}${red('\\mathbf a_2')} = ${tcol(w1)}$ and $${tn(u2[0])}\\cg{\\mathbf a_1} + ${tn(u2[1])}${red('\\mathbf a_2')} = ${tcol(w2)}$.`.replace(/\+ -/g, '- '),
          `$\\cg{\\mathbf a_1} = ${tcol(a1)}$, $${red('\\mathbf a_2')} = ${tcol(a2)}$, so $A = ${texMc(A)}$.`,
        ],
      };
    },
  };
}

export const p2: PuzzleDef = {
  id: 'c11-p2',
  title: 'Which matrix does this?',
  goal: 'Type $A$, then apply it. Both points must land in their rings.',
  hints: ['Each round has its own hints.'],
  par: 14,
  onWin: S.p2Win,
  setup: (p) => game(p, 'c11-g2', (pl) => G2.map((r) => findRound(pl, r)),
    'The columns of $A$ are $A\\begin{bmatrix}1\\\\0\\end{bmatrix}$ and $A\\begin{bmatrix}0\\\\1\\end{bmatrix}$. Any two other equations fix them too.'),
};

// ================================================================== game 3 · is there a matrix?

function moveRound(pl: Plane, r: MoveRound): Round {
  const Tq = (q: Vec) => r.T(q).map((x) => Math.round(x * 1e9) / 1e9);
  const move = r.A ?? ((q: Vec) => r.T(q));
  const rule = `$T\\begin{bmatrix}x\\\\y\\end{bmatrix} = ${r.rule}$`;
  return {
    name: `${r.name}: ${r.A ? 'a matrix' : 'no matrix'}`,
    goal: `${rule}. Is there a matrix $A$ with $A\\mathbf x = T(\\mathbf x)$ for every $\\mathbf x$?`,
    start(rc: RoundCtx) {
      const { p, d } = rc;
      const field = new MatField({ onEnter: () => void check() });
      const play = button(inline('Play $T$'), () => void playT(), { cls: 'small', html: true });
      const chk = button(inline('Check $A$'), () => void check(), { cls: 'primary small', html: true });
      const none = button('No matrix does this', () => noMatrix(), { cls: 'small' });
      const ask = h('div', { class: 'tj-row' });
      ask.hidden = true;
      const rowA = h('div', { class: 'tj-row' }, field.el, chk), rowNone = h('div', { class: 'tj-row' }, none);
      d.body.append(h('div', { class: 'tj-row' }, play), rowA, rowNone, ask);
      let zero: Rider | null = null;
      // the origin stays marked by a grey ring, so a move of 0 shows even when the grid looks the same
      const setBefore = () => { pl.clear(); pl.showColumns(false); pl.ring([0, 0], C.muted, '$\\mathbf 0$'); zero = pl.rider([0, 0], C.white); };
      setBefore();
      void pl.frame([[2, 2], [-2, -2], Tq([1, 0]), Tq([0, 1]), Tq([2, 2]), Tq([-2, -2])], { ms: 0 });
      let running = false, done = false;
      const lock = <T>(f: () => Promise<T>) => busy([field], [play, chk, none], f);

      const playT = async () => {
        if (running || !rc.alive()) return;
        running = true;
        // the boxes stay open while T plays: the player can type while watching
        await busy([], [play, chk, none], async () => {
          setBefore();
          zero?.label('');
          await pl.apply(move, 2000);
          zero?.label('$T(\\mathbf 0)$');
        });
        running = false;
      };

      const check = async () => {
        if (running || done || !rc.alive()) return;
        const A = field.get();
        if (!A) { d.msg(UNREAD, 'warn'); return; }
        running = true;
        p.move();
        d.msg('');
        await lock(async () => {
          const mm = g3Mismatch(r, A);
          setBefore();
          // where A and T disagree: the point (blue) rides A; the ring is where T sends it
          const atZero = !!mm && same(mm.at, [0, 0]);
          const pt = mm && !atZero ? pl.rider(mm.at, C.u, `$${tcol(mm.at)}$`, 'b') : null;
          if (mm) pl.ring(mm.want, C.u, atZero ? '$T(\\mathbf 0)$' : `$T${tcol(mm.at)}$`, 'b');
          if (mm && !atZero) zero?.label('');
          pt?.label('');
          await pl.apply(A, 1800);
          if (!rc.alive()) return;
          if (atZero) zero?.label('$A\\mathbf 0$');
          else if (mm) pt?.label(`$A${tcol(mm.at)}$`);
          else zero?.label('');
          if (!mm) {
            done = true;
            sfx.success();
            const [a1, a2] = columns(A);
            d.msg(`$A = ${texMc(A)}$: its columns are $T${E1} = \\cg{${tcol(a1)}}$ and $T${E2} = ${red(tcol(a2))}$.`, 'good');
            rc.complete();
            return;
          }
          rc.att.wrong++;
          sfx.miss();
          pl.gap(mm.got, mm.want);
          const origin = same(mm.at, [0, 0]) ? ' Every matrix has $A\\mathbf 0 = \\mathbf 0$.' : '';
          d.msg(`$A${tcol(mm.at)} = ${tcol(mm.got)}$, but $T${tcol(mm.at)} = ${tcol(mm.want)}$.${origin}`, 'bad');
        });
        running = false;
      };

      const noMatrix = () => {
        if (running || done || !rc.alive()) return;
        p.move();
        if (r.A) {
          rc.att.wrong++;
          sfx.miss();
          d.msg(`There is one. Try the columns $T${E1}$ and $T${E2}$, and check.`, 'bad');
          return;
        }
        // a "no" must come with the number that proves it
        const e = r.evidence!;
        const ev = evidencePoint(r);
        const cell = new VecField({ value: null, label: `$T${tcol(ev.at)} =$`, neutral: true, onEnter: () => void prove(), aria: ['top number', 'bottom number'] });
        const ok = button('Check', () => void prove(), { cls: 'primary small' });
        const before = e.kind === 'origin' ? '' : `$${e.k === -1 ? '-' : tn(e.k)}\\,T${tcol(e.x)} = ${tcol(Tq(e.x).map((x) => x * e.k))}$. `;
        ask.replaceChildren(before ? h('div', { class: 'tj-goal', html: inline(before) }) : '', cell.el, ok);
        ask.hidden = false;
        rowA.hidden = true; rowNone.hidden = true;
        d.msg('');
        if (!p.g.headless) window.setTimeout(() => cell.focus(), 60);
        const prove = async () => {
          if (running || done || !rc.alive()) return;
          const t = cell.get();
          if (!t) { d.msg(UNREAD, 'warn'); return; }
          p.move();
          if (!same(t, ev.T)) {
            rc.att.wrong++;
            sfx.miss();
            d.msg(`Put $x = ${tn(ev.at[0])}$, $y = ${tn(ev.at[1])}$ into the rule for $T$.`, 'bad');
            return;
          }
          done = true;
          running = true;
          cell.enable(false); ok.disabled = true;
          // show it: the point rides T, and lands away from where a matrix would put it
          await lock(async () => {
            setBefore();
            const matrixAt = e.kind === 'origin' ? [0, 0] : Tq(e.x).map((x) => x * e.k);
            const k = e.kind === 'origin' ? '' : e.k === -1 ? '-' : tn(e.k);
            // the point rides T (blue); the ring is where a matrix would have to put it
            const pt = e.kind === 'origin' ? zero : pl.rider(ev.at, C.u, '', 'b');
            if (e.kind !== 'origin') zero?.label('');
            // (for 0, the grey ring already marks where every matrix sends it)
            if (e.kind !== 'origin') pl.ring(matrixAt, C.u, `$${k}\\,T${tcol(e.x)}$`, 'b');
            pt?.label('');
            await pl.apply(move, 1800);
            pt?.label(e.kind === 'origin' ? '$T(\\mathbf 0)$' : `$T${tcol(ev.at)}$`);
            pl.gap(ev.T, matrixAt);
          });
          running = false;
          sfx.success();
          d.msg(e.kind === 'origin'
            ? `$T(\\mathbf 0) = ${tcol(ev.T)}$, but every matrix has $A\\mathbf 0 = \\mathbf 0$. No matrix does this.`
            : `$T${tcol(ev.at)} = ${tcol(ev.T)} \\ne ${e.k === -1 ? '-' : tn(e.k)}\\,T${tcol(e.x)}$, but every matrix has $A(${e.k === -1 ? '-' : tn(e.k)}\\mathbf x) = ${e.k === -1 ? '-' : tn(e.k)}A\\mathbf x$. No matrix does this.`, 'good');
          rc.complete();
        };
        fill = async () => { cell.set(ev.T); await prove(); };
      };
      let fill: (() => Promise<void>) | null = null;

      // the move plays once at the start: watch the grid first
      void wait(p.g.headless ? 0 : 450).then(() => playT());
      return {
        async show() {
          while (running) await wait(30);
          if (r.A) { field.set(r.A); await check(); return; }
          if (!fill) noMatrix();
          await fill?.();
        },
        hints: () => {
          const watch = 'A matrix sends $\\mathbf 0$ to $\\mathbf 0$, and sends grid lines to straight, evenly spaced lines.';
          if (r.A) return [watch, `Its columns would be $T${E1}$ and $T${E2}$.`, `$A = ${texMc(r.A)}$.`];
          const ev = evidencePoint(r), e = r.evidence!;
          if (e.kind === 'origin') return [watch, 'Where does $T$ send $\\mathbf 0$?', `$T(\\mathbf 0) = ${tcol(ev.T)}$. No matrix does this.`];
          const k = e.k === -1 ? '-' : tn(e.k);
          return [watch, `Compare $T${tcol(ev.at)}$ with $${k}\\,T${tcol(e.x)}$.`, `$T${tcol(ev.at)} = ${tcol(ev.T)}$, but $${k}\\,T${tcol(e.x)} = ${tcol(Tq(e.x).map((x) => x * e.k))}$. No matrix does this.`];
        },
      };
    },
  };
}

export const p3: PuzzleDef = {
  id: 'c11-p3',
  title: 'Is there a matrix?',
  goal: 'Type the matrix of $T$, or show why there is none.',
  hints: ['Each round has its own hints.'],
  par: 14,
  onWin: S.p3Win,
  setup: (p) => game(p, 'c11-g3', (pl) => G3.map((r) => moveRound(pl, r)),
    'A matrix sends $\\mathbf 0$ to $\\mathbf 0$ and has $A(k\\mathbf x) = kA\\mathbf x$, $A(\\mathbf x + \\mathbf y) = A\\mathbf x + A\\mathbf y$.'),
};
