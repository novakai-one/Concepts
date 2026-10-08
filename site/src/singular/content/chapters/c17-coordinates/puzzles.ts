// Chapter 17 puzzles 1–3: a buoy's numbers in the Anchor's grid (p1), a point from the Anchor's numbers
// (p2), and by hand from the Anchor's grid to Vell's (p3 [H]). The Anchor's grid is copper over ours.
import { Vector3 } from 'three';
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { VectorInput } from '../../../ui/widgets';
import { h, button } from '../../../ui/ui';
import { StepWorksheet } from '../../../kit/steps';
import { C } from '../../../core/theme';
import { sfx } from '../../../audio/sfx';
import { P2 } from '../../truth';
import type { Mat } from '../../../math/la';
import { AnchorPath, COPPER, CopperGrid, SHIP_GRID, VELL_GRID, tag } from './grids';
import {
  B1, B2, P1_ANCHOR, P1_SHIP, P2_ANCHOR, P2_SHIP, P3_ANCHOR, P3_CONVERT, P3_MISTAKES, P3_SHIP, P3_VELL, PC, PCinv, anchorOf,
  fmtV, p1Won, p2Won, reach,
} from './logic';
import { S } from './script';

const v3 = (v: readonly number[], z = 0): V3 => [v[0], v[1], z];
const tol = (p: PuzzleCtx) => (p.difficulty === 'commander' ? 0.01 : 0.05);

/** The ship's grid, the Anchor's grid in copper, and the Anchor's two arms. */
export function anchorBench(p: PuzzleCtx, o: { center?: [number, number]; height?: number; arms?: boolean } = {}) {
  void p.g.stage.view2D({ center: o.center ?? [1.6, 1.0], height: o.height ?? 8.5, ms: 0 });
  p.grid(SHIP_GRID);
  const copper = new CopperGrid(p.g.stage, { M: P2 });
  p.add(copper);
  const arms: Arrow[] = [];
  if (o.arms !== false) {
    arms.push(new Arrow([0, 0, 0.01], v3(B1, 0.01), { color: C.v, width: 0.06, label: '$\\mathbf b_1$' }));
    arms.push(new Arrow([0, 0, 0.01], v3(B2, 0.01), { color: C.w, width: 0.06, label: '$\\mathbf b_2$' }));
    p.add(...arms);
  }
  return { copper, arms, dim: (on: boolean) => arms.forEach((a) => a.setOpacity(on ? 0.35 : 1)) };
}

/** The key to the two grids, at the foot of a readout. */
const legend = (r: { note(md: string | null): void }) => r.note('Dashed copper lines: the Anchor’s grid. Pale lines: ours.');

/** Typed Anchor numbers plus a Walk button and a message line (all levels). */
function numbersEntry(p: PuzzleCtx, o: { label: string; onWalk: (c: number[]) => void | Promise<void> }) {
  const input = new VectorInput({ dim: 2, values: [0, 0], label: o.label, step: p.difficulty === 'commander' ? 0.25 : p.difficulty === 'navigator' ? 0.5 : 1, onSubmit: (c) => void o.onWalk(c) });
  input.el.classList.add('c17-in');
  const walk = button('Walk the Anchor’s path', () => void o.onWalk(input.get()), { cls: 'primary small' });
  const msg = h('div', { class: 'c17-msg' });
  p.dock().append(h('div', { class: 'c17-row' }, input.el, walk), msg);
  return { input, walk, msg, say: (t: string, kind: '' | 'good' | 'bad' = '') => { msg.className = `c17-msg ${kind}`; msg.innerHTML = t; } };
}

/** A dashed gap from where a path ended to where it should have. */
function gapLine(p: PuzzleCtx) {
  const g = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 0]], { color: C.orange, width: 3.5, intensity: 1.5, opacity: 0.95 });
  g.object.visible = false;
  p.add(g.object);
  p.onDispose(() => g.dispose());
  return { show(a: readonly number[], b: readonly number[]) { g.setPoints([v3(a, 0.03), v3(b, 0.03)]); g.object.visible = true; }, hide() { g.object.visible = false; } };
}

// ------------------------------------------------------------------ p1 · the buoy's numbers in the Anchor's grid

export const p1: PuzzleDef = {
  id: 'c17-p1',
  title: 'What are this buoy’s numbers in the Anchor’s grid?',
  goal: `The yellow buoy is at **${fmtV(P1_SHIP)}** in our numbers. How many of the Anchor’s first arm $\\cg{\\mathbf b_1}$, then of its second arm $\\cr{\\mathbf b_2}$, reach it? Enter them and **walk** the Anchor’s path.`,
  predict: {
    prompt: `The buoy is at $${fmtV(P1_SHIP)}$ in our numbers. What are its numbers in the Anchor’s grid?`,
    choices: [{ id: 'same', text: `$${fmtV(P1_SHIP)}$: a point keeps its numbers` }, { id: 'right', text: `$${fmtV(P1_ANCHOR)}$` }, { id: 'far', text: `$${fmtV(reach(P1_SHIP))}$` }],
    answer: 'right',
    reveal: `$${fmtV(P1_ANCHOR)}$: one $\\mathbf b_1 = (1, 0)$ and two $\\mathbf b_2 = (1, 1)$ make $(1 + 2, 0 + 2) = ${fmtV(P1_SHIP)}$. The buoy did not move. Only the arrows we count in changed, so its numbers changed.`,
  },
  hints: [
    'Every step along $\\mathbf b_2 = (1, 1)$ also goes one up. The buoy is 2 up, so it needs 2 of $\\mathbf b_2$.',
    'Two of $\\mathbf b_2$ reach $(2, 2)$. From there, how many of $\\mathbf b_1 = (1, 0)$ are left to reach $(3, 2)$?',
    `One of $\\mathbf b_1$ and two of $\\mathbf b_2$: enter $${fmtV(P1_ANCHOR)}$.`,
  ],
  par: 2,
  onWin: S.p1Win,
  setup(p) {
    const bench = anchorBench(p, { center: [1.4, 1.6] });
    const buoy = new Dot(v3(P1_SHIP, 0.05), { color: C.result, size: 0.12 });
    const bt = tag(`ours ${fmtV(P1_SHIP)}`, v3(P1_SHIP), 'y', [0, -26]);
    p.add(buoy, bt.object);
    p.onDispose(() => bt.dispose());
    const path = new AnchorPath(p, P2, { showTag: false });
    path.show(false);
    const gap = gapLine(p);
    const r = p.readout('One buoy, two sets of numbers');
    const live = p.difficulty === 'cadet';
    const paint = (c: number[] | null) => {
      r.row('ship', 'our numbers', fmtV(P1_SHIP), C.white);
      r.row('anc', 'the Anchor’s numbers', c ? fmtV(c) : '?', COPPER);
      r.row('reach', 'the Anchor’s path ends at', c ? fmtV(reach(c)) : '·', C.result);
    };
    paint(live ? [0, 0] : null);
    legend(r);
    let won = false;
    let follow: (() => void) | null = null;
    const finish = () => { if (won) return; won = true; sfx.success(); gap.hide(); bt.set(`ours ${fmtV(P1_SHIP)} · Anchor ${fmtV(P1_ANCHOR)}`); entry.say(`The Anchor’s path ends on the buoy. In the Anchor’s numbers it is ${fmtV(P1_ANCHOR)}.`, 'good'); p.win(); };
    const tryC = async (c: number[], animate = true) => {
      p.move();
      bench.dim(true);
      if (animate) await path.walk(c, p.g.headless ? 10 : 520); else { path.show(true); path.set(c); }
      follow?.();
      paint(c);
      if (p1Won(c, tol(p))) { finish(); return; }
      sfx.miss();
      gap.show(reach(c), P1_SHIP);
      const same = c[0] === P1_SHIP[0] && c[1] === P1_SHIP[1];
      entry.say(same
        ? `Our numbers, counted in the Anchor’s arms, reach ${fmtV(reach(c))}. The Anchor’s arms are not ours.`
        : `${fmtV(c)} in the Anchor’s numbers reaches ${fmtV(reach(c))}. The buoy is at ${fmtV(P1_SHIP)}.`, 'bad');
      p.bark('lantern', `The path ends at ${fmtV(reach(c))}. The buoy is at ${fmtV(P1_SHIP)}.`);
    };
    const entry = numbersEntry(p, { label: '\\text{Anchor} =', onWalk: (c) => tryC(c) });
    // cadet: drag the end of the Anchor's path; it snaps to the copper crossings, both readouts live
    if (live) {
      path.show(true);
      path.set([0, 0]);
      const handle = new Dot([0, 0, 0.06], { color: C.result, size: 0.16 });
      const ring = new Arrow([0, 0, 0.06], [0, 0, 0.06], { color: C.result, handle: true });
      p.add(handle, ring);
      bench.dim(true);
      follow = () => { const t = path.tip; handle.at([t[0], t[1], 0.06]); ring.set([t[0], t[1], 0.06], [t[0], t[1], 0.06]); };
      p.g.drag.add({
        target: ring.grab, getPos: () => new Vector3(...path.tip), snap: () => null,
        constrain: (q) => { const c = anchorOf([q.x, q.y])!.map((x) => Math.max(-6, Math.min(6, Math.round(x)))); const t = reach(c); return new Vector3(t[0], t[1], 0.06); },
        onMove: (q) => { const c = anchorOf([q.x, q.y])!.map((x) => Math.round(x)); path.set(c); handle.at([q.x, q.y, 0.06]); ring.set([q.x, q.y, 0.06], [q.x, q.y, 0.06]); paint(c); entry.input.set(c); sfx.tick(c[1]); },
        onEnd: () => { p.move(); if (p1Won(path.c, 0.05)) finish(); },
      });
      entry.say('Drag the yellow ring: it moves along the copper grid. Or enter the numbers and walk.');
    } else {
      entry.say('Count along the copper lines from the Anchor’s base, at the origin.');
    }
    return {
      async showMe() { entry.input.set(P1_ANCHOR); await tryC(P1_ANCHOR); },
      async solve() { entry.input.set(P1_ANCHOR); await tryC(P1_ANCHOR, false); },
      async wrong() { await tryC(P1_SHIP, false); },
    };
  },
};

// ------------------------------------------------------------------ p2 · and back

export const p2: PuzzleDef = {
  id: 'c17-p2',
  title: 'Where is the point with the Anchor’s numbers (2, −1)?',
  goal: `The Anchor’s record lists a piece at **${fmtV(P2_ANCHOR)}** in the Anchor’s numbers. Put the yellow marker where that is in **our** grid, then **Check**.`,
  hints: [
    'The Anchor’s numbers say: 2 of $\\mathbf b_1$, then −1 of $\\mathbf b_2$, starting at the origin.',
    '$2\\mathbf b_1 = (2, 0)$. Then $-1\\,\\mathbf b_2 = (-1, -1)$ from there.',
    `$(2, 0) + (-1, -1) = ${fmtV(P2_SHIP)}$.`,
  ],
  par: 2,
  onWin: S.p2Win,
  setup(p) {
    const bench = anchorBench(p, { center: [1.2, 0.2] });
    const marker = new Dot([-1, -2, 0.06], { color: C.result, size: 0.13 });
    const ring = new Arrow([-1, -2, 0.06], [-1, -2, 0.06], { color: C.result, handle: true });
    const mt = tag('', [-1, -2, 0], 'y', [0, 26]);
    p.add(marker, ring, mt.object);
    p.onDispose(() => mt.dispose());
    const path = new AnchorPath(p, P2, { showTag: false });
    path.show(false);
    const gap = gapLine(p);
    const r = p.readout('The listed piece');
    const live = p.difficulty === 'cadet';
    let at: number[] = [-1, -2];
    let checked = false;
    const paint = () => {
      r.row('anc', 'listed, Anchor’s numbers', fmtV(P2_ANCHOR), COPPER);
      r.row('ship', 'marker, our numbers', fmtV(at), C.result);
      r.row('mine', 'marker, Anchor’s numbers', live || checked ? fmtV(anchorOf(at)!) : '?', COPPER);
      mt.at(v3(at)); mt.set(fmtV(at));
    };
    const place = (x: number[]) => { at = [x[0], x[1]]; marker.at(v3(at, 0.06)); ring.set(v3(at, 0.06), v3(at, 0.06)); input.set(at); paint(); };
    let won = false;
    const check = async (fast = false) => {
      p.move();
      bench.dim(true);
      if (fast) { path.show(true); path.set(P2_ANCHOR); } else await path.walk(P2_ANCHOR, p.g.headless ? 10 : 520);
      checked = true; paint();
      if (p2Won(at, tol(p))) { if (!won) { won = true; gap.hide(); sfx.success(); msg.className = 'c17-msg good'; msg.textContent = `The Anchor’s path ends on your marker: ${fmtV(P2_SHIP)}.`; p.win(); } return; }
      sfx.miss();
      gap.show(at, P2_SHIP);
      const same = Math.abs(at[0] - P2_ANCHOR[0]) < 1e-6 && Math.abs(at[1] - P2_ANCHOR[1]) < 1e-6;
      msg.className = 'c17-msg bad';
      msg.textContent = same
        ? `The Anchor’s path ends at ${fmtV(P2_SHIP)}. Your marker is on ${fmtV(P2_ANCHOR)}: the Anchor’s numbers placed in our grid.`
        : `The Anchor’s path ends at ${fmtV(P2_SHIP)}. Your marker is at ${fmtV(at)}.`;
      p.bark('lantern', `Two of the first arm and minus one of the second end at ${fmtV(P2_SHIP)}.`);
    };
    const input = new VectorInput({ dim: 2, values: at, label: '\\text{ours} =', step: p.snap() ?? 0.25, onChange: (x) => { at = x; marker.at(v3(at, 0.06)); ring.set(v3(at, 0.06), v3(at, 0.06)); gap.hide(); paint(); }, onSubmit: () => void check() });
    input.el.classList.add('c17-in');
    const msg = h('div', { class: 'c17-msg' }, live ? 'Drag the yellow ring. The readout shows its numbers both ways.' : 'Drag the ring or type our numbers. Check walks the Anchor’s path.');
    p.dock().append(h('div', { class: 'c17-row' }, input.el, button('Check', () => void check(), { cls: 'primary small' })), msg);
    p.g.drag.add({
      target: ring.grab, getPos: () => new Vector3(at[0], at[1], 0.06), snap: () => p.snap(), planar: true,
      constrain: (q) => new Vector3(Math.max(-5, Math.min(6, q.x)), Math.max(-4, Math.min(5, q.y)), 0.06),
      onMove: (q) => { place([q.x, q.y]); gap.hide(); sfx.tick(q.y); },
      onEnd: () => { p.move(); if (live && p2Won(at, 0.05)) void check(); },
    });
    paint();
    legend(r);
    return {
      async showMe() { await ring.moveTo(v3(P2_SHIP, 0.06), 700); place(P2_SHIP); await check(); },
      async solve() { place(P2_SHIP); await check(true); },
      async wrong() { place(P2_ANCHOR); await check(true); },
    };
  },
};

// ------------------------------------------------------------------ p3 [H] · between two skewed grids

/** Vell's cutter grid: pale dotted lines. */
function vellGrid(p: PuzzleCtx) {
  const g = new CopperGrid(p.g.stage, { M: PC, color: VELL_GRID, opacity: 0, width: 1.3, dash: 0.05, gap: 0.12, z: 0.003 });
  p.add(g);
  return g;
}

export const p3: PuzzleDef = {
  id: 'c17-p3',
  title: 'What is the Anchor’s (2, 1) in Vell’s numbers?',
  goal: `Vell’s cutter counts in $\\mathbf c_1 = (1, 1)$ and $\\mathbf c_2 = (-1, 1)$. By hand: turn the Anchor’s **${fmtV(P3_ANCHOR)}** into our numbers, then into Vell’s. Then write the **one matrix** that turns any Anchor numbers into Vell’s.`,
  subgoals: ['The Anchor’s (2, 1) in our numbers', 'The same point in Vell’s numbers', 'One matrix for every point'],
  hints: [
    '$P_B$ has the Anchor’s arms as columns: $P_B = \\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\end{bmatrix}$. It turns the Anchor’s numbers into ours: $P_B(2, 1) = 2\\mathbf b_1 + 1\\mathbf b_2$.',
    'Vell’s numbers $\\mathbf c$ solve $P_C\\mathbf c = (3, 1)$ with $P_C = \\begin{bmatrix} 1 & -1 \\\\ 1 & 1 \\end{bmatrix}$. Its inverse is $\\tfrac12\\begin{bmatrix} 1 & 1 \\\\ -1 & 1 \\end{bmatrix}$.',
    'Anchor numbers go into ours first ($P_B$), then into Vell’s ($P_C^{-1}$). The first move goes on the right: $P_C^{-1}P_B$.',
  ],
  par: 4,
  onWin: S.p3Win,
  setup(p) {
    const { copper } = anchorBench(p, { center: [1.4, 0.6], height: 8.5, arms: false });
    const vg = vellGrid(p);
    const point = new Dot(v3(P3_SHIP, 0.05), { color: C.result, size: 0.12 });
    const pt = tag(`Anchor ${fmtV(P3_ANCHOR)}`, v3(P3_SHIP), 'cu', [0, 30]);
    p.add(point, pt.object);
    p.onDispose(() => pt.dispose());
    const anc = new AnchorPath(p, P2, { showTag: false });
    const vel = new AnchorPath(p, PC, { showTag: false, names: ['\\mathbf c_1', '\\mathbf c_2'] });
    anc.show(false); vel.show(false);
    const r = p.readout('Three sets of numbers, one point');
    const paint = (k: number) => {
      r.row('a', 'the Anchor’s', fmtV(P3_ANCHOR), COPPER);
      r.row('s', 'ours', k >= 1 ? fmtV(P3_SHIP) : '?', C.white);
      r.row('v', 'Vell’s', k >= 2 ? fmtV(P3_VELL) : '?', VELL_GRID);
    };
    paint(0);
    legend(r);
    const done = [false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; p.subgoal(i); } };
    const ms = () => (p.g.headless ? 10 : 480);
    const steps = [
      { prompt: 'Our numbers: $P_B\\begin{bmatrix} 2 \\\\ 1 \\end{bmatrix} = 2\\mathbf b_1 + 1\\mathbf b_2$', answer: P3_SHIP, mistakes: [[P3_MISTAKES.ship, '$P_B$ turns the Anchor’s numbers into ours. That is $P_B^{-1}$, the other way.'], [P3_ANCHOR, 'Those are the Anchor’s numbers again. Add $2\\mathbf b_1$ and $1\\mathbf b_2$.']] as [number[], string][] },
      { prompt: 'Vell’s numbers: solve $P_C\\mathbf c = (3, 1)$', answer: P3_VELL, mistakes: [[P3_MISTAKES.vell, 'That is $P_C(3, 1)$: it turns Vell’s numbers into ours, the wrong way. Solve instead.']] as [number[], string][] },
      { prompt: '$P_C^{-1}$', answer: PCinv, mistakes: [[PC, 'That is $P_C$ itself. Its inverse undoes it.']] as [Mat, string][] },
      { prompt: 'Anchor in, Vell out: $P_C^{-1}P_B$', answer: P3_CONVERT, mistakes: [[P3_MISTAKES.backwards, 'That one turns Vell’s numbers into the Anchor’s: the other way.'], [P3_MISTAKES.order, 'Order: $P_B$ acts first, so it goes on the right.']] as [Mat, string][] },
    ];
    // the picture keeps up with the worksheet: each solved step draws its part
    let shown = 0;
    const show = async (k: number) => {
      if (k <= shown) return;
      shown = k;
      if (k >= 1) { tick(0); paint(1); await anc.walk(P3_ANCHOR, ms()); pt.set(`Anchor ${fmtV(P3_ANCHOR)} · ours ${fmtV(P3_SHIP)}`); }
      if (k >= 2) {
        anc.show(false);
        void copper.fade(0.25, ms());
        r.note('Faded copper: the Anchor’s grid. Pale dotted lines: Vell’s grid.');
        await vg.fade(0.75, ms());
        await vel.walk(P3_VELL, ms());
        pt.set(`ours ${fmtV(P3_SHIP)} · Vell ${fmtV(P3_VELL)}`);
        tick(1); paint(2);
      }
    };
    const watch = () => { const n = ws.el.querySelectorAll('.ws-row.ok').length; void show(n >= 2 ? 2 : n >= 1 ? 1 : 0); };
    const ws = new StepWorksheet(p, {
      steps,
      onDone: () => {
        tick(0); tick(1); tick(2); paint(2);
        r.eq('P_C^{-1}P_B\\begin{bmatrix} 2 \\\\ 1 \\end{bmatrix} = \\begin{bmatrix} 2 \\\\ -1 \\end{bmatrix}');
        r.note('One matrix, Anchor numbers in, Vell’s numbers out. No stop in our grid needed.');
        p.win();
        void show(2);
      },
    });
    ws.el.addEventListener('change', watch);
    ws.el.addEventListener('keyup', watch);
    ws.el.addEventListener('click', () => window.setTimeout(watch, 30));
    return {
      async showMe() { await ws.showMe(380); },
      solve() { ws.solve(); },
      wrong() { ws.wrong(); },
    };
  },
};
