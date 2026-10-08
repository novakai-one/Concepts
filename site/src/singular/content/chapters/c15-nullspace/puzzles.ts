// Chapter 15 puzzles 1–4: the landing plane, possible landings, the inputs sent to the origin (with
// the row board), and two starts with one landing.
import { Vector3 } from 'three';
import type { PuzzleDef, PuzzleCtx, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot, glowSprite } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { VectorHandle } from '../../../kit/handle';
import { RowOpsBoard } from '../../../kit/rowops';
import { SystemView } from '../../../kit/system';
import { StepWorksheet } from '../../../kit/steps';
import { Slider, VectorInput } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { burst } from '../../../gfx/fx';
import { gaussJordanSteps } from '../../../math/rref';
import { fmat } from '../../../math/frac';
import { C2 } from '../../truth';
import {
  COLS, NULL_DIR, P2_GAP_TARGET, P2_INPUTS, P2_TARGETS, P3_READ, P4_A, P4_B, P4_LAND, P4_PARTICULAR, P4_TARGET,
  ballStarts, countOnPlane, diffOnNull, fmtN, fmtV, land, len, p1Won, p2GapOk, p2Hit, p3Won, planeHeight, reachable,
  threeStartsOk, violetPreview, winTol, type Diff, type P3,
} from './logic';
import { GlowLine, LandCloud, Probe, Room, Sheet, VIOLET, tv, twinView, violetGlow } from './space';
import { S } from './script';

const d = (p: PuzzleCtx) => p.difficulty as Diff;
const stepFor = (p: PuzzleCtx) => (p.difficulty === 'cadet' ? 1 : p.difficulty === 'navigator' ? 0.5 : 0.25);
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const planeTex = (n0: readonly number[]) => {
  // whole-number normals are shown in lowest terms: (0, 0, 2) reads z = 0
  const whole = n0.every((x) => Math.abs(x - Math.round(x)) < 1e-9);
  const g = whole ? n0.map((x) => Math.abs(Math.round(x))).reduce((a, b) => gcd(a, b), 0) : 1;
  const n = g > 1 ? n0.map((x) => Math.round(x) / g) : n0;
  const terms: string[] = [];
  ['x', 'y', 'z'].forEach((v, i) => {
    const c = Math.round(n[i] * 100) / 100;
    if (Math.abs(c) < 1e-9) return;
    const mag = Math.abs(c) === 1 ? '' : String(Math.abs(c));
    terms.push(`${terms.length ? (c < 0 ? ' - ' : ' + ') : c < 0 ? '-' : ''}${mag}${v}`);
  });
  return terms.length ? `${terms.join('')} = 0` : '\\text{(no plane)}';
};
const ptTag = (text: string, at: V3, cls = '', offset: [number, number] = [0, -22]) => new Label(text, at, { className: `act5-pt ${cls}`, offset });

// ------------------------------------------------------------------ p1 The landing plane

export const p1: PuzzleDef = {
  id: 'c15-p1',
  title: 'Where did every buoy land?',
  goal: 'Two thousand test buoys went through the two-decimal model. Tilt the **plane** with its normal arrow $\\mathbf n$ until **every** landed buoy is on it.',
  subgoals: ['Every landed buoy on your plane'],
  predict: {
    prompt: 'The buoys started in a ball around the origin. What shape do their landings make?',
    choices: [{ id: 'ball', text: 'A squashed ball' }, { id: 'plane', text: 'A flat patch of one plane' }, { id: 'line', text: 'A line' }],
    answer: 'plane',
    reveal: 'A flat patch of one plane through the origin. Every landing is a mix of the three columns, and the three columns lie on one plane: $(1, 1, 2)$ is $(1, 0, 1) + (0, 1, 1)$.',
  },
  hints: [
    'Drag the tip of the white arrow $\\mathbf n$; hold **Shift** to change its height. Or type it in the panel. The plane is at right angles to $\\mathbf n$.',
    'The sheet of buoys rises 1 in $z$ for every step in $x$, and 1 for every step in $y$: it is $z = x + y$.',
    '$z = x + y$ is $x + y - z = 0$, so $\\mathbf n = (1, 1, -1)$.',
  ],
  par: 3,
  view: '3d',
  onWin: S.p1Win,
  setup(p) {
    const room = new Room(p, { extent: 4, floor: true });
    void p.g.stage.view3D({ target: [0.2, 0.2, 1.1], distance: 14, azimuth: -60, elevation: 18, ms: 0 });
    const starts = ballStarts(2000);
    const landed = starts.map(land);
    const cloud = new LandCloud(p, room, starts);
    const sheet = new Sheet(room, [0, 0, 1], { color: '#9fd8ff', size: 7, opacity: 0.1 });
    sheet.setOpacity(0.45);
    const r = p.readout('Your plane');
    let n: V3 = [0, 0, 2];
    let done = false;
    let flattened = false;
    const lit = new Set<number>();
    const tol = winTol(d(p));
    const input = new VectorInput({ dim: 3, values: n, label: '\\mathbf n =', step: p.snap() ?? 0.1, onChange: (v) => { set(v as V3, true); }, onSubmit: (v) => { p.move(); set(v as V3, true); check(); } });
    const show = () => {
      const on = countOnPlane(n, landed);
      r.row('eq', 'plane', `$${planeTex(n)}$`);
      r.row('n', 'normal $\\mathbf n$', fmtV(n));
      r.row('on', 'landed buoys on it', `${on} of 2000`, on === 2000 ? C.result : undefined);
      if (!flattened) return;
      // light the buoys that lie on the plane
      const l = len(n);
      let changed = false;
      landed.forEach((q, i) => { const on1 = l > 1e-9 && Math.abs(q[0] * n[0] + q[1] * n[1] + q[2] * n[2]) / l <= 0.06; if (on1 !== lit.has(i)) { changed = true; if (on1) lit.add(i); else lit.delete(i); } });
      if (changed) cloud.paint((i) => (lit.has(i) ? C.result : '#9fd8ff'));
    };
    const set = (v: V3, fromInput = false) => {
      n = v.map((x) => Math.round(x * 1e6) / 1e6) as V3;
      sheet.set(n);
      if (!fromInput) input.set(n);
      else handle.set(room.w(n), [0, 0, 0]);
      show();
    };
    const handle = new VectorHandle(p, {
      to: room.w(n), color: C.white, label: '$\\mathbf n$', limit: 3,
      onChange: (tip) => set(room.l(tip)),
      onCommit: () => check(),
    });
    const thrusters: Arrow[] = [];
    const check = () => {
      if (done || !p1Won(n, 0.02 * (tol / 0.05))) {
        if (!done && len(n) > 0.2) {
          const on = countOnPlane(n, landed);
          if (on < 2000) p.bark('lantern', `${on} of 2000 landed buoys are on that plane.`);
        }
        return;
      }
      done = true;
      handle.setEnabled(false);
      sheet.setColor(C.result);
      sheet.setOpacity(1);
      cloud.paint(() => C.result);
      sfx.success();
      p.subgoal(0);
      COLS.slice(0, 2).forEach((c, i) => {
        const a = room.arrow(c, { color: i === 0 ? C.v : C.w, label: i === 0 ? '$(1, 0, 1)$' : '$(0, 1, 1)$' });
        thrusters.push(a);
        void a.grow(700);
      });
      p.win();
    };
    p.dock().append(h('div', { class: 'act5-row' }, h('span', { class: 'k' }, 'Normal'), input.el),
      h('div', { class: 'act5-msg', html: inline('The plane goes through the origin, at right angles to $\\mathbf n$.') }));
    show();
    // the buoys go through the two-decimal model
    const flatten = (async () => {
      await wait(500);
      sfx.collapse();
      await cloud.to(C2, 2200);
      flattened = true;
      show();
    })();
    return {
      async showMe() {
        await flatten;
        await handle.moveTo(room.w([1, 1, -1]), 900, [0, 0, 0]);
        set([1, 1, -1]);
        check();
      },
      async solve() { await flatten; set([1, 1, -1]); check(); },
      async wrong() { await flatten; set([0, 0, 1]); check(); },
    };
  },
};

// ------------------------------------------------------------------ p2 Possible landings

export const p2: PuzzleDef = {
  id: 'c15-p2',
  title: 'Which beacons can the pulse reach?',
  goal: 'Set the three amounts and **Land** a test buoy on each beacon the pulse can reach. One ping is off the landing plane: show how far it sits **below** the plane, straight up.',
  subgoals: ['Land on (1, 2, 3)', 'Land on (0, 0, 0)', 'Land on (2, −1, 1)', 'Show how far (1, 1, 1) sits below the plane, straight up'],
  predict: {
    prompt: 'Which ping can no start reach?',
    choices: [{ id: 'a', text: '$(1, 2, 3)$' }, { id: 'b', text: '$(1, 1, 1)$' }, { id: 'c', text: '$(0, 0, 0)$' }, { id: 'd', text: '$(2, -1, 1)$' }],
    answer: 'b',
    reveal: '$(1, 1, 1)$. On the landing plane $z = x + y$, above $(1, 1)$ the height is 2. The ping sits at height 1, so no mix of the columns lands there.',
  },
  hints: [
    'The landing is $x_1$ of column 1, then $x_2$ of column 2, then $x_3$ of column 3, tip to tail. Column 3 is columns 1 and 2 together, so you can leave $x_3 = 0$.',
    'For $(1, 2, 3)$: 1 of $(1, 0, 1)$ and 2 of $(0, 1, 1)$. For $(2, -1, 1)$: 2 and $-1$. For the origin: nothing at all.',
    'Above $(1, 1)$ the plane is at height $1 + 1 = 2$. Slide the gap arrow straight up from $(1, 1, 1)$ until it touches: 1 straight up.',
  ],
  par: 7,
  view: '3d',
  onWin: S.p2Win,
  setup(p) {
    const room = new Room(p, { extent: 3, scale: 0.95 });
    void p.g.stage.view3D({ target: [0.7, 0.7, 2.1], distance: 13, azimuth: -62, elevation: 16, ms: 0 });
    const sheet = new Sheet(room, [1, 1, -1], { color: C.result, size: 6, opacity: 0.1 });
    sheet.setOpacity(0.38);
    // the four pings
    const keyOf = (t: readonly number[]) => t.join(',');
    const order = ['1,2,3', '0,0,0', '2,-1,1'];
    const pings = P2_TARGETS.map((t) => {
      const dot = new Dot(room.w(t), { color: C.accent, size: 0.09 });
      const halo = glowSprite(C.accent, 0.9, 0.45);
      halo.position.set(...room.w(t));
      const tag = ptTag(fmtV(t), room.w(t), '', keyOf(t) === '0,0,0' ? [30, 18] : [0, -24]);
      p.add(dot, halo, tag);
      return { t, dot, halo, tag, done: false };
    });
    // the column chain, the landing and its arrow
    const chain = [0, 1, 2].map((i) => room.arrow([0, 0, 0], { color: [C.v, C.w, C.u][i], width: 0.04 }));
    const landArrow = room.arrow([0, 0, 0], { color: C.result, width: 0.03, opacity: 0.85 });
    const buoy = new Dot(room.w([0, 0, 0]), { color: C.result, size: 0.1 });
    p.add(buoy);
    // the gap arrow from (1, 1, 1) up toward the plane
    const gapLine = new FatLine(p.g.stage, [room.w(P2_GAP_TARGET), room.w(P2_GAP_TARGET)], { color: C.white, width: 2.4, opacity: 0.9, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    const gapTag = new Label('', room.w(P2_GAP_TARGET), { className: 'act5-note', offset: [0, -26] });
    p.add(gapLine, gapTag);
    gapTag.show(false);

    let x: P3 = [0, 0, 0];
    let fired = false;
    let gap = 0;
    const tol = winTol(d(p));
    const step = stepFor(p);
    const flags = [false, false, false, false];
    const tick = (i: number) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); } if (flags.every(Boolean)) void finish(); };
    const showChain = d(p) === 'cadet' || (d(p) === 'navigator' && fired);
    const r = p.readout('Test buoy');
    const draw = (visible: boolean) => {
      let at: number[] = [0, 0, 0];
      chain.forEach((a, i) => {
        const nxt = at.map((v, k) => v + x[i] * COLS[i][k]);
        room.setArrow(a, nxt, at);
        a.setOpacity(visible && Math.abs(x[i]) > 1e-9 ? 1 : 0);
        at = nxt;
      });
      room.setArrow(landArrow, at);
      landArrow.setOpacity(visible && len(at) > 1e-6 ? 0.85 : 0);
      buoy.at(room.w(at));
      buoy.setOpacity(visible ? 1 : 0);
      r.row('x', 'amounts $(x_1, x_2, x_3)$', fmtV(x));
      r.row('l', 'lands at', visible ? fmtV(land(x)) : '?', C.result);
    };
    const showNow = () => d(p) === 'cadet' || (d(p) === 'navigator' && fired);
    const sliders = [0, 1, 2].map((i) => new Slider({
      label: `$x_${i + 1}$ of ${['$(1, 0, 1)$', '$(0, 1, 1)$', '$(1, 1, 2)$'][i]}`, min: -3, max: 3, step, value: 0,
      onInput: (v) => { x[i] = v; draw(showNow()); },
    }));
    sliders.forEach((s, i) => { (s.el.querySelector('span') as HTMLElement).style.color = [C.v, C.w, C.u][i]; });
    const fire = async () => {
      p.move();
      fired = true;
      const end = land(x);
      // the buoy runs the chain, tip to tail
      buoy.setOpacity(1);
      let at: number[] = [0, 0, 0];
      chain.forEach((a) => a.setOpacity(0));
      for (let i = 0; i < 3; i++) {
        const nxt = at.map((v, k) => v + x[i] * COLS[i][k]);
        if (Math.abs(x[i]) > 1e-9) {
          chain[i].setOpacity(1);
          const from = at.slice();
          await animate(360, (k) => { const q = from.map((v, kk) => v + (nxt[kk] - v) * k); room.setArrow(chain[i], q, from); buoy.at(room.w(q)); }, ease.inOut);
        }
        at = nxt;
      }
      draw(true);
      sfx.snap();
      const hit = pings.find((q) => !q.done && reachable(q.t) && p2Hit(x, q.t, tol));
      if (hit) {
        hit.done = true;
        hit.dot.setColor(C.good);
        hit.halo.material.color.set(C.good);
        hit.tag.el.classList.add('g');
        void burst(p.g.stage, room.w(hit.t), C.good, 40, 2.4, false);
        sfx.success();
        tick(order.indexOf(keyOf(hit.t)));
      } else if (len(end.map((v, k) => v - P2_GAP_TARGET[k])) < 1.2) {
        p.bark('lantern', `Landed at ${fmtV(end)}. Every landing is on the plane; (1, 1, 1) is not.`);
      } else if (!pings.some((q) => p2Hit(x, q.t, tol))) {
        sfx.miss();
        p.bark('lantern', `Landed at ${fmtV(end)}. No beacon there.`);
      }
      if (d(p) === 'commander') window.setTimeout(() => { if (!p.won) draw(false); }, 1600);
    };
    const gapSlider = new Slider({
      label: 'straight up from $(1, 1, 1)$', min: 0, max: 2, step: d(p) === 'commander' ? 0.05 : 0.25, value: 0,
      onInput: (v) => { gap = v; drawGap(); },
    });
    const drawGap = () => {
      const top: V3 = [P2_GAP_TARGET[0], P2_GAP_TARGET[1], P2_GAP_TARGET[2] + gap];
      gapLine.setPoints([room.w(P2_GAP_TARGET), room.w(top)]);
      gapLine.setOpacity(gap > 0.01 ? 0.9 : 0);
      gapTag.show(gap > 0.01);
      gapTag.at(room.w(top));
      gapTag.set(`${fmtN(gap)} straight up`);
      r.row('g', 'plane above $(1, 1)$', `height ${fmtN(planeHeight(1, 1))}`);
    };
    gapSlider.el.querySelector('input')!.addEventListener('change', () => {
      p.move();
      if (p2GapOk(gap, tol)) {
        if (!flags[3]) {
          gapLine.setColor(C.white, 1.6);
          gapTag.set('1 straight up: the ping is 1 below the plane');
          const echo = pings.find((q) => keyOf(q.t) === '1,1,1')!;
          echo.dot.setColor('#8f9bb3'); echo.halo.material.opacity = 0.15; echo.tag.set('(1, 1, 1) · echo'); echo.tag.el.classList.add('dim');
          sfx.success();
        }
        tick(3);
      } else if (gap > 0.01) p.bark('lantern', `At height ${fmtN(1 + gap)} the gap arrow has not met the plane. The plane is at height 2 there.`);
    });
    const finish = async () => { p.win(); };
    const landBtn = button('Land', () => void fire(), { cls: 'primary small' });
    p.dock().append(...sliders.map((s) => s.el), h('div', { class: 'act5-btns' }, landBtn), h('hr', { class: 'act5-sep' }), gapSlider.el);
    draw(showChain);
    drawGap();
    const setX = (v: P3) => { x = v.slice() as P3; sliders.forEach((s, i) => s.set(v[i], false)); draw(showNow()); };
    return {
      async showMe() {
        for (const k of order) {
          if (pings.find((q) => keyOf(q.t) === k)!.done) continue;
          const target = P2_INPUTS[k];
          const from = x.slice();
          await animate(500, (t) => setX(from.map((v, i) => v + (target[i] - v) * t) as P3), ease.inOut);
          setX(target);
          await fire();
          await wait(250);
        }
        if (!flags[3]) {
          await animate(700, (t) => { gap = t; gapSlider.set(gap, false); drawGap(); }, ease.inOut);
          gapSlider.el.querySelector('input')!.dispatchEvent(new Event('change'));
        }
      },
      async solve() {
        for (const k of order) { setX(P2_INPUTS[k]); await fire(); }
        gap = 1; gapSlider.set(1, false); drawGap();
        gapSlider.el.querySelector('input')!.dispatchEvent(new Event('change'));
      },
      async wrong() {
        // the misconception: aim straight at (1, 1, 1) with amounts (1, 1, 1)
        setX([1, 1, 1]); await fire();
      },
    };
  },
};

// ------------------------------------------------------------------ p3 [H] Land on the origin

export const p3: PuzzleDef = {
  id: 'c15-p3',
  title: 'Which starts land on the point that never moves?',
  goal: 'Move the green **probe** in the input space until it lands on the origin, without sitting on the origin itself. Then read the same starts from the **row board**.',
  subgoals: ['A start other than the origin that lands on the origin', 'Reduce $[\\,C_2 \\mid \\mathbf 0\\,]$ to reduced row echelon form', 'Read the line of starts from the free variable'],
  hints: [
    'You need amounts of the three columns that cancel: $x_1(1, 0, 1) + x_2(0, 1, 1) + x_3(1, 1, 2) = (0, 0, 0)$. Column 3 is column 1 plus column 2.',
    'Column 1 + column 2 − column 3 = 0, so the probe at $(1, 1, -1)$ lands on the origin. Hold **Shift** to drag it down, or type it.',
    'On the board: $R_3 \\to R_3 - R_1$, then $R_3 \\to R_3 - R_2$. Then $z$ is free: with $z = 1$, $x = -1$ and $y = -1$.',
  ],
  par: 9,
  view: '3d',
  onWin: S.p3Win,
  setup(p) {
    const tol = winTol(d(p));
    const flags = [false, false, false];
    const tick = (i: number) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); } if (flags.every(Boolean)) void finish(); };
    const finish = async () => { p.win(); };
    // ---- stage 1: two rooms
    const stage1: { dispose(): void }[] = [];
    const left = new Room(p, { origin: [-3.9, 0, 0], scale: 0.72, extent: 3, title: 'starts' });
    const right = new Room(p, { origin: [3.9, 0, 0], scale: 0.72, extent: 3, title: 'landings' });
    stage1.push(left, right);
    void twinView(p, { distance: 15.5 });
    const sheet = new Sheet(right, [1, 1, -1], { color: C.result, size: 5, opacity: 0.1 });
    sheet.setOpacity(0.3);
    const lArrow = right.arrow([0, 0, 0], { color: C.result, width: 0.04 });
    const lDot = new Dot(right.w([0, 0, 0]), { color: C.result, size: 0.1 });
    const sArrow = left.arrow([0, 0, 0], { color: C.v, width: 0.04, opacity: 0.85 });
    const halo = glowSprite(VIOLET, 1.6, 0);
    const pile = violetGlow(p, right, [0, 0, 0], 1.2, 0);
    p.add(lDot, halo);
    stage1.push({ dispose: () => { lDot.dispose(); halo.removeFromParent(); pile.removeFromParent(); } });
    const r = p.readout('Probe');
    let x: P3 = [1, 0, 1];
    let line: GlowLine | null = null;
    const draw = () => {
      const y = land(x);
      left.setArrow(sArrow, x);
      sArrow.setOpacity(len(x) > 1e-6 ? 0.85 : 0);
      right.setArrow(lArrow, y);
      lArrow.setOpacity(len(y) > 0.04 ? 1 : 0);
      lDot.at(right.w(y));
      halo.position.set(...left.w(x));
      halo.material.opacity = d(p) === 'cadet' && !flags[0] ? 0.85 * violetPreview(x) : flags[0] ? 0.8 : 0;
      r.row('s', 'start', fmtV(x), C.v);
      r.row('l', 'lands at', fmtV(y), C.result);
      r.row('d', 'distance from the origin', fmtN(len(y)));
    };
    const input = new VectorInput({ dim: 3, values: x, label: '\\text{start} =', step: p.snap() ?? 0.1, onChange: (v) => { x = v as P3; probe.set(x); draw(); }, onSubmit: () => { p.move(); check(); } });
    const probe = new Probe(p, left, x, { color: C.v, onMove: (v) => { x = v; input.set(v); draw(); }, onEnd: () => check() });
    const check = () => {
      if (flags[0]) return;
      if (!p3Won(x, tol)) {
        if (len(x) < 0.3) p.bark('lantern', 'That start is the origin itself. It never moves. Find another.');
        return;
      }
      tick(0);
      sfx.success();
      p.bark('lantern', `Lands on the origin. So does every start on the line through ${fmtV(x)}.`);
      line = new GlowLine(left, NULL_DIR);
      stage1.push(line);
      void line.fadeIn(900);
      pile.material.opacity = 0.75;
      probe.knob.setEnabled(false);
      probe.knob.setColor(VIOLET);
      draw();
      // the board must not come up on the next beat or a reset puzzle (Skip, Reset): cancel at disposal
      const timer = window.setTimeout(() => { if (!p.won && !boardUp) void toBoard(); }, p.g.headless ? 10 : 1600);
      p.onDispose(() => window.clearTimeout(timer));
    };
    p.dock().append(h('div', { class: 'act5-row' }, h('span', { class: 'k' }, 'Probe'), input.el),
      h('div', { class: 'act5-msg' }, 'Drag the green probe (Shift-drag for height), or type a start.'));
    draw();

    // ---- stage 2: the row board and the three planes
    let boardUp = false;
    let board: RowOpsBoard | null = null;
    let ws: StepWorksheet | null = null;
    const toBoard = async () => {
      if (boardUp) return;
      boardUp = true;
      for (const o of stage1.splice(0)) o.dispose();
      probe.knob.setEnabled(false);
      probe.knob.at([0, 0, -999]);
      p.dock().replaceChildren();
      p.setGoal('Reduce $[\\,C_2 \\mid \\mathbf 0\\,]$: each row is a plane through the origin. Then read the starts that land on the origin from the **free variable**.');
      const aug = C2.map((row) => [...row, 0]);
      board = new RowOpsBoard(p, { aug, n: 3, title: 'Augmented matrix [ C₂ | 0 ]' });
      const view = new SystemView(p, { n: 3, aug, board });
      // the solutions of C₂ x = 0 are the violet line: recolour the kit's solution line
      const sv = view as unknown as { solLine: FatLine | null; solGlow: FatLine | null; solLabel: Label | null };
      sv.solLine?.setColor(VIOLET, 2);
      sv.solGlow?.setColor(VIOLET, 1.3);
      sv.solLabel?.set('every start on this line lands on the origin');
      sv.solLabel?.el.classList.add('act5-pt', 'v');
      r.row('s', 'start', fmtV(x), VIOLET);
      r.hideRow('l'); r.hideRow('d');
      const wsBox = h('div', {});
      wsBox.hidden = true;
      r.el.appendChild(wsBox);
      ws = new StepWorksheet(p, {
        mount: wsBox,
        steps: [
          { prompt: 'Row 1 reads $x + z = 0$. Set the free variable $z = 1$: $x =$', answer: P3_READ.x, mistakes: [[1, 'Move $z$ across: $x = -z$.']] },
          { prompt: 'Row 2 reads $y + z = 0$. With $z = 1$: $y =$', answer: P3_READ.y, mistakes: [[1, 'Move $z$ across: $y = -z$.']] },
          { prompt: 'Every start that lands on the origin is $t$ times the start with $z = 1$:', answer: [...P3_READ.dir], mistakes: [[[1, 1, -1], 'That is the same line, but read it with $z = 1$: $(-1, -1, 1)$.']] },
        ],
        onDone: () => { tick(2); },
      });
      board.subscribe(() => {
        if (board!.isRREF() && !flags[1]) {
          tick(1);
          wsBox.hidden = false;
          r.note(`Reduced: $x + z = 0$, $y + z = 0$, $0 = 0$. $${tv('z')}$ is free.`);
        }
      });
    };
    return {
      async showMe() {
        if (!flags[0]) { await probe.moveTo([1, 1, -1], 900); x = [1, 1, -1]; input.set(x); draw(); check(); }
        await toBoard();
        await wait(300);
        if (!flags[1]) await board!.play(gaussJordanSteps(fmat(board!.get()), 3).ops, 700);
        await ws!.showMe(450);
      },
      async solve() {
        if (!flags[0]) { x = [1, 1, -1]; probe.set(x); input.set(x); draw(); check(); }
        await toBoard();
        if (!flags[1]) await board!.play(gaussJordanSteps(fmat(board!.get()), 3).ops, 30);
        ws!.solve();
      },
      async wrong() { x = [1, 1, 1]; probe.set(x); draw(); check(); },
    };
  },
};

// ------------------------------------------------------------------ p4 Same landing

export const p4: PuzzleDef = {
  id: 'c15-p4',
  title: 'Can two different starts land together?',
  goal: 'Fire the pulse at the two plates. Then lay the **difference** arrow from one start to the other. Then place **three different starts** that all land on $(1, 2, 3)$.',
  subgoals: ['Fire: see where both plates land', 'Lay the arrow from (2, 0, 1) to (3, 1, 0)', 'Three different starts that land on (1, 2, 3)'],
  predict: {
    prompt: 'Two plates started at $(2, 0, 1)$ and $(3, 1, 0)$. After the pulse, where are they?',
    choices: [{ id: 'same', text: 'On the same point' }, { id: 'apart', text: 'Apart, the same distance as before' }, { id: 'origin', text: 'Both on the origin' }],
    answer: 'same',
    reveal: 'Both on $(3, 1, 4)$. Their starts differ by $(1, 1, -1)$, and the pulse sends that arrow to the origin, so it adds nothing to the landing.',
  },
  hints: [
    'Press **Fire**. Then drag the tip of the white arrow (it starts at the first plate) onto the second plate.',
    'The difference is $(3, 1, 0) - (2, 0, 1) = (1, 1, -1)$: on the violet line. So any start plus a multiple of $(1, 1, -1)$ lands where that start lands.',
    '$(1, 2, 0)$ lands on $(1, 2, 3)$. So do $(2, 3, -1)$ and $(0, 1, 1)$.',
  ],
  par: 6,
  view: '3d',
  onWin: S.p4Win,
  setup(p) {
    const tol = winTol(d(p));
    const left = new Room(p, { origin: [-3.9, 0, 0], scale: 0.7, extent: 3, title: 'starts' });
    const right = new Room(p, { origin: [3.9, 0, 0], scale: 0.7, extent: 3, title: 'landings' });
    void twinView(p, { distance: 16.5, target: [0, 0, 1.5] });
    const sheet = new Sheet(right, [1, 1, -1], { color: C.result, size: 5, opacity: 0.1 });
    sheet.setOpacity(0.3);
    const flags = [false, false, false];
    const tick = (i: number) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); } };
    const plateA = new Dot(left.w(P4_A), { color: C.white, size: 0.1 });
    const plateB = new Dot(left.w(P4_B), { color: C.white, size: 0.1 });
    const tagA = ptTag('A (2, 0, 1)', left.w(P4_A), '', [-58, -22]);
    const tagB = ptTag('B (3, 1, 0)', left.w(P4_B), '', [52, 20]);
    p.add(plateA, plateB, tagA, tagB);
    const r = p.readout('Plates');
    r.row('a', 'A starts at', fmtV(P4_A));
    r.row('b', 'B starts at', fmtV(P4_B));
    // ---- 1. fire
    const arcs: FatLine[] = [];
    const arc = (from: V3, to: V3, color: string) => {
      const pts: V3[] = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        pts.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t + Math.sin(Math.PI * t) * 1.1]);
      }
      const f = new FatLine(p.g.stage, pts, { color, width: 1.4, opacity: 0.5, dashed: true, dashSize: 0.18, gapSize: 0.12 });
      p.add(f);
      arcs.push(f);
      return pts;
    };
    const landDot = new Dot(right.w(P4_LAND), { color: C.result, size: 0.12 });
    landDot.setOpacity(0);
    const landTag = ptTag('(3, 1, 4)', right.w(P4_LAND), 'y');
    landTag.show(false);
    p.add(landDot, landTag);
    const fire = async () => {
      if (flags[0]) return;
      p.move();
      sfx.whoosh(1.2);
      const pa = arc(left.w(P4_A), right.w(P4_LAND), C.white);
      const pb = arc(left.w(P4_B), right.w(P4_LAND), C.white);
      const ga = new Dot(pa[0], { color: C.white, size: 0.08 }), gb = new Dot(pb[0], { color: C.white, size: 0.08 });
      p.add(ga, gb);
      await animate(1300, (k) => { const i = Math.round(k * 40); ga.at(pa[i]); gb.at(pb[i]); }, ease.inOut);
      ga.dispose(); gb.dispose();
      landDot.setOpacity(1);
      landTag.show(true);
      void burst(p.g.stage, right.w(P4_LAND), C.result, 40, 2.2, false);
      sfx.snap();
      r.row('l', 'both land at', fmtV(P4_LAND), C.result);
      tick(0);
      diffHandle.setEnabled(true);
      p.setGoal('Both plates landed on $(3, 1, 4)$. Drag the white arrow\'s tip from plate A onto plate B: what is the difference of the two starts?');
    };
    // ---- 2. the difference arrow
    let diffTip: P3 = [P4_A[0] + 0.6, P4_A[1] - 0.6, P4_A[2] + 0.6];
    const diffHandle = new VectorHandle(p, {
      from: left.w(P4_A), to: left.w(diffTip), color: C.white, label: '$\\mathbf d$', snap: null,
      constrain: (q) => {
        const s = p.snap() ?? 0.25;
        const lq = left.l(q).map((c) => Math.round(c / s) * s) as P3;
        // snap onto plate B when near
        const nearB = len(lq.map((c, i) => c - P4_B[i])) < 0.45 ? P4_B : lq;
        const w = left.w(nearB);
        return new Vector3(w[0], w[1], w[2]);
      },
      onChange: (tip) => { diffTip = left.l(tip); r.row('d', 'difference B − A', fmtV(diffTip.map((c, i) => c - P4_A[i]))); },
      onCommit: () => checkDiff(),
    });
    diffHandle.setEnabled(false);
    let nul: GlowLine | null = null;
    const checkDiff = () => {
      if (flags[1]) return;
      if (!diffOnNull(P4_A, diffTip) || len(diffTip.map((c, i) => c - P4_B[i])) > 1e-6) {
        if (flags[0]) p.bark('lantern', 'Put the arrow\'s tip on plate B.');
        return;
      }
      tick(1);
      sfx.success();
      diffHandle.setEnabled(false);
      // the same arrow from the origin lies on the violet line
      nul = new GlowLine(left, NULL_DIR);
      void nul.fadeIn(800);
      const copy = left.arrow([1, 1, -1], { color: VIOLET, label: '$(1, 1, -1)$' });
      void copy.grow(700);
      const zero = new Dot(right.w([0, 0, 0]), { color: VIOLET, size: 0.08 });
      p.add(zero);
      r.row('d', 'difference B − A', `$${tv('(1, 1, -1)')}$`);
      r.row('z', 'the difference lands at', '(0, 0, 0)', VIOLET);
      startsUp();
    };
    // ---- 3. three starts for (1, 2, 3)
    const target = new Dot(right.w(P4_TARGET), { color: C.accent, size: 0.1 });
    const targetHalo = glowSprite(C.accent, 0.8, 0.4);
    targetHalo.position.set(...right.w(P4_TARGET));
    const targetTag = ptTag('(1, 2, 3)', right.w(P4_TARGET), '', [36, 0]);
    p.add(target, targetHalo, targetTag);
    target.setOpacity(0); targetHalo.visible = false; targetTag.show(false);
    let starts: P3[] = [[0, 0, 0], [1, 0, 0], [0, 1, 0]];
    const lands: Dot[] = [];
    const probes: Probe[] = [];
    const inputs: VectorInput[] = [];
    let solLine: GlowLine | null = null;
    const startsBox = h('div', { class: 'act5-vecs' });
    startsBox.hidden = true;
    const drawStarts = () => {
      starts.forEach((s, i) => { lands[i]?.at(right.w(land(s))); });
      const ok = starts.map((s) => len(land(s).map((c, k) => c - P4_TARGET[k])) <= tol);
      r.row('t', 'starts on (1, 2, 3)', `${ok.filter(Boolean).length} of 3`, ok.every(Boolean) ? C.result : undefined);
    };
    const checkStarts = () => {
      if (flags[2] || !flags[1]) return;
      if (!threeStartsOk(starts, P4_TARGET, tol)) {
        const ok = starts.filter((s) => len(land(s).map((c, k) => c - P4_TARGET[k])) <= tol).length;
        if (ok === 3) p.bark('lantern', 'Two of those starts are the same point. Spread them out.');
        return;
      }
      tick(2);
      sfx.success();
      solLine = new GlowLine(left, NULL_DIR, { color: C.result, through: P4_PARTICULAR, opacity: 0.8, width: 2.2 });
      void solLine.fadeIn(800);
      const tag = ptTag('every start on this line lands on (1, 2, 3)', left.w([-0.6, 0.4, 1.6]), 'y', [0, -24]);
      p.add(tag);
      probes.forEach((q) => q.knob.setEnabled(false));
      p.win();
    };
    const startsUp = () => {
      target.setOpacity(1); targetHalo.visible = true; targetTag.show(true);
      p.setGoal('Place **three different starts** that all land on $(1, 2, 3)$. Drag the green probes (Shift for height) or type them.');
      starts.forEach((s, i) => {
        const pr = new Probe(p, left, s, { color: C.v, label: String(i + 1), onMove: (v) => { starts[i] = v; inputs[i].set(v); drawStarts(); }, onEnd: () => checkStarts() });
        probes.push(pr);
        const dot = new Dot(right.w(land(s)), { color: C.result, size: 0.085 });
        p.add(dot);
        lands.push(dot);
        const vi = new VectorInput({ dim: 3, values: s, label: `${i + 1}:`, step: p.snap() ?? 0.1, onChange: (v) => { starts[i] = v as P3; pr.set(v); drawStarts(); }, onSubmit: () => { p.move(); checkStarts(); } });
        inputs.push(vi);
        startsBox.appendChild(vi.el);
      });
      startsBox.hidden = false;
      fireBtn.hidden = true;
      drawStarts();
    };
    const fireBtn = button('Fire the pulse', () => void fire(), { cls: 'primary small' });
    p.dock().append(h('div', { class: 'act5-btns' }, fireBtn), startsBox);
    const setStarts = (v: P3[]) => { starts = v.map((s) => s.slice() as P3); v.forEach((s, i) => { probes[i].set(s); inputs[i].set(s); }); drawStarts(); };
    const goal3: P3[] = [[1, 2, 0], [2, 3, -1], [0, 1, 1]];
    return {
      async showMe() {
        await fire();
        if (!flags[1]) { await diffHandle.moveTo(left.w(P4_B), 900, left.w(P4_A)); }
        await wait(300);
        for (let i = 0; i < 3; i++) { await probes[i].moveTo(goal3[i], 600); starts[i] = goal3[i]; inputs[i].set(goal3[i]); drawStarts(); }
        checkStarts();
      },
      async solve() {
        await fire();
        if (!flags[1]) { diffHandle.set(left.w(P4_B), left.w(P4_A)); diffTip = [...P4_B]; checkDiff(); }
        setStarts(goal3);
        checkStarts();
      },
      async wrong() {
        await fire();
        diffHandle.set(left.w(P4_B), left.w(P4_A)); diffTip = [...P4_B]; checkDiff();
        // the misconception: the same start three times
        setStarts([[1, 2, 0], [1, 2, 0], [1, 2, 0]]);
        checkStarts();
      },
    };
  },
};
