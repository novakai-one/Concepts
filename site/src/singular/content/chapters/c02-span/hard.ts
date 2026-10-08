// Chapter 2, the harder puzzles.
//   p3: a[2;1] + b[1;3] = [4;7] by hand. The rows of the vector equation light up one at a time and become
//       two equations; then the player types a and b.
//   p4: the same question in 3-D with v = [1;0;1], w = [0;1;1]: [2;3;5] is in the span; [1;1;0] is not (rows
//       1 and 2 fix a and b, row 3 disagrees). The view turns edge-on: the plane, and the point below it.
import { Vector3 } from 'three';
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { PlanePatch } from '../../../gfx/shapes';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { h } from '../../../ui/ui';
import {
  PlaneView, plainDock, eqRow, freshObjective, focusSoon, hideHint, hinter, fresh, record, same, tv, tn,
  UNREAD_M, type Vec,
} from '../../../kit/plain';
import { G, R, combo, eqLine, fast, givens, k, playCombo, plain, primary, tmulName, weightCell } from './parts';
import { D3, HAND, T3A, T3B, TH, V, VD, W, WD, W3A, WH } from './text';

const KEY = 'c02';
const pause = (p: PuzzleCtx, ms = 1300) => wait(p.g.headless ? 30 : ms);

// ------------------------------------------------------------------ p3 · by hand

/** A column with one entry lit (yellow), the rest in its own colour ('' for none). */
function col(v: Vec, c: 'g' | 'r' | '', lit: number): string {
  const body = `\\begin{bmatrix}${v.map((x, i) => (i === lit ? `\\cy{${tn(x)}}` : tn(x))).join(' \\\\ ')}\\end{bmatrix}`;
  return c ? `\\c${c}{${body}}` : body;
}

export const byHand: PuzzleDef = {
  id: 'c02-p3', title: HAND.title, goal: HAND.goal, hints: HAND.hints, par: 3,
  setup(p) {
    freshObjective(p, HAND.goal);
    const view = new PlaneView(p);
    const d = plainDock(p);
    givens(view, V, W, ['v', 'w']);
    const pad = view.target(TH);
    void view.frame([V, W, TH, [-1, 0]], { ms: 0 });
    let att = fresh(), busy = false, done = false;

    const ca = weightCell('a', () => cb.focus()), cb = weightCell('b', () => void check());
    const go = primary('Check', () => void check());
    const vEl = k(col(V, 'g', -1)), wEl = k(col(W, 'r', -1)), tEl = k(`= ${col(TH, '', -1)}`);
    const top = h('div', { class: 'c02-rowq' }, k(HAND.top));
    const bottom = h('div', { class: 'c02-rowq' }, k(HAND.bottom));
    d.body.append(eqLine([ca, vEl, '+', cb, wEl, tEl], go), h('div', { class: 'c02-rows' }, top, bottom));

    const light = (i: number) => {
      vEl.innerHTML = k(col(V, 'g', i)).innerHTML;
      wEl.innerHTML = k(col(W, 'r', i)).innerHTML;
      tEl.innerHTML = k(`= ${col(TH, '', i)}`).innerHTML;
      top.classList.toggle('lit', i === 0);
      bottom.classList.toggle('lit', i === 1);
    };
    // the rows of the vector equation become two equations, one at a time
    void (async () => {
      await pause(p, 700);
      light(0); top.classList.add('on'); sfx.tick(0.5);
      await pause(p, 1600);
      light(1); bottom.classList.add('on'); sfx.tick(0.8);
      await pause(p, 1600);
      light(-1);
      if (!done) d.msg(HAND.ask);
      focusSoon(p, ca);
    })();

    async function check(x?: [number, number]): Promise<void> {
      if (busy || done) return;
      if (x) { ca.set(x[0]); cb.set(x[1]); }
      const a = ca.value(), b = cb.value();
      if (a === null || b === null) { d.msg(UNREAD_M, 'warn'); return; }
      busy = true; go.disabled = true;
      p.move(); d.msg('');
      try {
        top.classList.add('on'); bottom.classList.add('on');
        const end = await playCombo(view, a, V, b, W, { names: ['v', 'w'] });
        if (same(end, TH)) {
          done = true;
          hideHint(p);
          d.msg(HAND.right(a, b), 'good');
          await view.arrive(pad);
          sfx.success();
          record(KEY, 'p3', att);
          await pause(p);
          p.win();
          return;
        }
        att.wrong++;
        view.miss(end, TH);
        d.msg(HAND.wrong(a, b, end), 'bad');
      } finally { busy = false; go.disabled = done; }
    }
    const hint = hinter(() => (done ? [] : HAND.hints), () => { att.help++; });
    const all = async () => { while (busy) await wait(20); att.help++; await check(WH); while (!p.won) await wait(20); };
    return { hint, showMe: all, solve: all, async wrong() { await check([2, 0]); } };
  },
};

// ------------------------------------------------------------------ p4 · 3-D

const add3 = (a: number[], b: number[]): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (c: number, a: number[]): V3 => [c * a[0], c * a[1], c * a[2]];
const mid3 = (f: number[], t: number[]): V3 => [(f[0] + t[0]) / 2, (f[1] + t[1]) / 2, (f[2] + t[2]) / 2];

/** Keep the picture in the part of the screen the dock leaves free (desktop: right of it; phone: above it). */
function centreAboveDock(p: PuzzleCtx): void {
  const st = p.g.stage;
  const cam = st.camera;
  const apply = () => {
    const W = st.size.x, H = st.size.y;
    const dock = document.querySelector<HTMLElement>('.dock.tj-dock');
    const r = dock && !dock.hidden ? dock.getBoundingClientRect() : null;
    let cx = W / 2, cy = H / 2;
    if (r && r.width > 0) {
      if (W >= 760) cx = (Math.min(W, r.right + 24) + W) / 2;
      else cy = (Math.max(160, r.top) + 100) / 2; // between the title (top 100 px) and the dock
    }
    cam.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
    cam.updateProjectionMatrix();
  };
  const off = st.onResize(() => apply());
  const dock = document.querySelector<HTMLElement>('.dock.tj-dock');
  const ro = dock && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => apply()) : null;
  if (dock && ro) ro.observe(dock);
  p.onDispose(() => { off(); ro?.disconnect(); cam.clearViewOffset(); cam.updateProjectionMatrix(); });
}

export const in3d: PuzzleDef = {
  id: 'c02-p4', title: D3.title, goal: D3.goal, subgoals: D3.subgoals, hints: D3.hints1, par: 4, view: '3d',
  setup(p) {
    freshObjective(p, D3.goal, 2);
    const st = p.g.stage;
    const narrow = st.size.x < 760;
    const LOOK: V3 = [1, 1.4, 2.1];
    void st.view3D({ target: LOOK, distance: narrow ? 26 : 17, azimuth: -100, elevation: 25, ms: 0 });
    p.grid({ main: 0.18, base: 0, axis: 0.4 });

    // the span: a patch of the plane through 0, v and w
    const plane = new PlanePatch(st, [0, 0, 0], [-1, -1, 1], { color: C.result, size: 5 });
    plane.setSpan(combo(1, VD, 1.5, WD) as V3, VD as V3, WD as V3);
    plane.setOpacity(0.32);
    p.add(plane);

    const Gv = new Arrow([0, 0, 0], VD as V3, { color: C.v, width: 0.055 });
    const Rw = new Arrow([0, 0, 0], WD as V3, { color: C.w, width: 0.055 });
    const Y = new Arrow([0, 0, 0], [0, 0, 0], { color: C.result, width: 0.06 });
    Y.setOpacity(0);
    p.add(Gv, Rw, Y);
    const tag = (text: string, cls: string, at: V3, off: [number, number]) => {
      const l = new Label(text, at, { className: `a7-tag pk-tag ${cls}`, offset: off });
      p.add(l.object);
      p.onDispose(() => l.dispose());
      return l;
    };
    const lv = tag('$\\mathbf v$', 'g', mid3([0, 0, 0], VD), [16, 8]);
    const lw = tag('$\\mathbf w$', 'c02-r', mid3([0, 0, 0], WD), [-16, -6]);

    const dashed = (color: string) => {
      const l = new FatLine(st, [[0, 0, 0], [0, 0, 0]], { color, width: 2, dashed: true, opacity: 0, dashSize: 0.14, gapSize: 0.1 });
      p.add(l);
      return l;
    };
    const missLine = dashed(C.orange);
    const drop = dashed('#e8f1ff');

    let pt = new Dot(T3A as V3, { color: '#e8f1ff', size: 0.08 });
    p.add(pt);
    let ptTag = tag(`$${tv(T3A)}$`, 'pk-w', T3A as V3, [44, 0]);

    const d = plainDock(p);
    let stage = 0, busy = false, asking = false, done = false;
    let att = fresh();
    const targets = [T3A, T3B];
    const ca = weightCell('a', () => cb.focus()), cb = weightCell('b', () => void check());
    const go = primary('Check', () => void check());
    const rhs = k(`= ${tv(T3A)}`);
    const row = eqLine([ca, G(VD), '+', cb, R(WD), rhs], go);
    const noneBtn = plain(D3.none, () => none());
    const noneRow = h('div', { class: 'tj-row' }, noneBtn);
    d.body.append(row, noneRow);
    d.msg(D3.start);
    focusSoon(p, ca);
    centreAboveDock(p);

    // a·v, then b·w from its tip, then the yellow sum
    /** v and w back on the origin, no sum. */
    const rest = () => {
      missLine.setOpacity(0);
      Y.setOpacity(0);
      Gv.set([0, 0, 0], VD as V3); lv.at(mid3([0, 0, 0], VD)); lv.set('$\\mathbf v$');
      Rw.set([0, 0, 0], WD as V3); lw.at(mid3([0, 0, 0], WD)); lw.set('$\\mathbf w$');
    };
    const play = async (a: number, b: number) => {
      const ms = 420;
      rest();
      if (fast()) {
        const av = mul3(a, VD), s = add3(av, mul3(b, WD));
        Gv.set([0, 0, 0], av); lv.at(mid3([0, 0, 0], av)); lv.set(Math.abs(a) < 1e-12 ? '' : `$${tmulName(a, 'v')}$`);
        Rw.set(av, s); lw.at(mid3(av, s)); lw.set(Math.abs(b) < 1e-12 ? '' : `$${tmulName(b, 'w')}$`);
        Y.setOpacity(1); Y.set([0, 0, 0], s);
        return s;
      }
      await animate(ms, (t) => { const c = 1 + (a - 1) * t; Gv.set([0, 0, 0], mul3(c, VD)); lv.at(mid3([0, 0, 0], mul3(c, VD))); });
      lv.set(Math.abs(a) < 1e-12 ? '' : `$${tmulName(a, 'v')}$`);
      const av = mul3(a, VD);
      await animate(ms * 0.8, (t) => { const f = mul3(t, av); Rw.set(f, add3(f, WD)); lw.at(mid3(f, add3(f, WD))); });
      await animate(ms, (t) => { const c = 1 + (b - 1) * t; Rw.set(av, add3(av, mul3(c, WD))); lw.at(mid3(av, add3(av, mul3(c, WD)))); });
      lw.set(Math.abs(b) < 1e-12 ? '' : `$${tmulName(b, 'w')}$`);
      const s = add3(av, mul3(b, WD));
      Y.setOpacity(1);
      await animate(ms * 0.8, (t) => Y.set([0, 0, 0], mul3(t, s)), ease.out);
      return s;
    };

    async function check(x?: [number, number]): Promise<void> {
      if (busy || done || asking) return;
      if (x) { ca.set(x[0]); cb.set(x[1]); }
      const a = ca.value(), b = cb.value();
      if (a === null || b === null) { d.msg(UNREAD_M, 'warn'); return; }
      busy = true; go.disabled = true;
      p.move(); d.msg('');
      try {
        const s = await play(a, b);
        const t = targets[stage];
        if (same(s, t)) {
          sfx.success();
          hideHint(p);
          d.msg(D3.right1(a, b), 'good');
          p.subgoal(0);
          record(KEY, 'p4-0', att);
          await pause(p, 1600);
          // the second vector
          stage = 1; att = fresh();
          rest();
          pt.dispose(); ptTag.dispose();
          pt = new Dot(T3B as V3, { color: '#e8f1ff', size: 0.08 });
          p.add(pt);
          ptTag = tag(`$${tv(T3B)}$`, 'pk-w', T3B as V3, [44, 0]);
          rhs.innerHTML = k(`= ${tv(T3B)}`).innerHTML;
          ca.clear(); cb.clear();
          focusSoon(p, ca);
          return;
        }
        att.wrong++;
        sfx.miss();
        missLine.setPoints([s, t as V3]);
        missLine.setOpacity(0.85);
        d.msg(D3.wrong(a, b, s, t), 'bad');
      } finally { busy = false; go.disabled = done || asking; }
    }

    const ask = eqRow({
      left: D3.askLeft, d,
      onCheck: (x) => {
        if (done) return;
        p.move();
        if (!same(x, 2)) { att.wrong++; sfx.miss(); d.msg(D3.askBad(x), 'bad'); return; }
        done = true;
        ask.enable(false);
        void finish();
      },
    });
    ask.el.hidden = true;
    d.body.append(ask.el);

    function none(): void {
      if (busy || done || asking) return;
      p.move();
      if (stage === 0) { att.wrong++; sfx.miss(); d.msg(D3.noneBad, 'bad'); return; }
      asking = true;
      go.disabled = true; noneBtn.disabled = true; ca.enable(false); cb.enable(false);
      row.classList.add('c02-done');
      noneRow.hidden = true;
      ask.el.hidden = false;
      hideHint(p);
      sfx.snap();
      d.msg(D3.ask, 'good');
      focusSoon(p, ask);
    }

    /** Rows 1 and 2 give 1v + 1w = [1;1;2]: on the plane, right above the point. Then look along the plane. */
    async function finish(): Promise<void> {
      sfx.success();
      p.subgoal(1);
      record(KEY, 'p4-1', att);
      d.msg(D3.done, 'good');
      await play(1, 1);
      drop.setPoints([T3B as V3, [1, 1, 2]]);
      drop.setOpacity(0.9);
      const T = new Vector3(1, 1, 1);
      const e = (14 * Math.PI) / 180;
      const a = new Vector3(1, -1, 0).normalize(), b = new Vector3(1, 1, 2).normalize();
      const dir = a.multiplyScalar(Math.cos(e)).add(b.multiplyScalar(Math.sin(e)));
      await st.moveCamera(T.clone().add(dir.multiplyScalar(narrow ? 21 : 15)), T, new Vector3(0, 0, 1), p.g.headless ? 0 : 2400);
      st.enableOrbit(T);
      await pause(p, 900);
      p.win();
    }

    const hint = hinter(() => (done ? [] : asking ? D3.askHints : stage === 0 ? D3.hints1 : D3.hints2), () => { att.help++; });
    const all = async () => {
      while (busy) await wait(20);
      att.help++;
      if (stage === 0) await check(W3A);
      while (busy || stage === 0) await wait(20);
      if (!asking) none();
      if (!done) { ask.set(2); ask.check(); }
      while (!p.won) await wait(20);
    };
    return { hint, showMe: all, solve: all, async wrong() { await check([1, 1]); } };
  },
};
