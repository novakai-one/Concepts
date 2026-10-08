// Chapter 7 puzzles (GDD §6.4, Ch 7): the path bead and the glass wall. Every win test is a pure
// function in logic.ts; the scenes draw paths, beads, the door's plane and its normal.
import { DoubleSide, Mesh, MeshBasicMaterial, Plane, PlaneGeometry, Quaternion, Vector3 } from 'three';
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { InfLine, PlanePatch } from '../../../gfx/shapes';
import { burst } from '../../../gfx/fx';
import { makeLantern } from '../../common/set';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { h, inline, button } from '../../../ui/ui';
import { Slider, VectorInput } from '../../../ui/widgets';
import { VectorHandle } from '../../../kit/handle';
import { AngleArc, Knob, RightAngle } from '../../../kit/geom';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { cross, dot, norm, vsub } from '../../../math/la';
import { Bead, DoorWall, FlatRing, PathLine, lab, normalArrow, v3 } from './parts';
import {
  DEB1_D, DEB1_P, DOOR_CENTRE, DOOR_K, DOOR_N, DOOR_P, HOLD, HOLD_DIST, HOLD_FOOT, HOLD_LINE_DIST, HOLD_LINE_T, HULL_N, P1_CLEAR, P1_CROSS,
  P1_DIR, P2_D1, P2_D2, P2_GAP, P2_P1, P2_P2, P2_TS, P4_DIR, P7_START, WELD_COS, WELD_DEG, WELD_DIR, WELD_POINT, along, debrisAt,
  dist, fmt, inPlaneDirs, insideDoor, num, ourAt, p1MinAt, p1MinGap, p1Won, p2Link, p2Won, p3Accept, p3OrderOk, p4Hit, p4Won, p5LineWon,
  p5PlaneWon, p7Won, rayPlane,
} from './logic';
import { S } from './script';
import { until } from '../c06-volume/stage';

const DEBRIS = '#c9b08f';

function flourish(p: PuzzleCtx, at: V3, color: string = C.result): void {
  sfx.success();
  void burst(p.g.stage, at, color, 60, 2.2, false);
}

/** An invisible sheet over the door's whole plane, for clicking points onto it (from either side). */
function wallPicker(p: PuzzleCtx): Mesh {
  const m = new Mesh(new PlaneGeometry(14, 14), new MeshBasicMaterial({ visible: false, side: DoubleSide }));
  m.position.set(...v3(DOOR_CENTRE));
  m.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...v3(DOOR_N)).normalize()));
  p.add(m);
  p.onDispose(() => { m.geometry.dispose(); m.material.dispose(); });
  return m;
}
const doorPlane = new Plane(new Vector3(...v3(DOOR_N)).normalize(), -DOOR_K / norm(DOOR_N));

// ------------------------------------------------------------------ p1 Same place, same time?

export const p1: PuzzleDef = {
  id: 'c07-p1',
  title: 'Our paths cross. Do we?',
  goal: 'Our path is $t(1, 1, 0)$; the debris follows $(4, 0, 0) + t(-1, 1, 0)$, $t$ in minutes. **Play** the minutes and watch. Then change our **speed** so we pass the crossing clear of the debris.',
  subgoals: ['Play the planned speed', 'Pass the crossing clear of the debris'],
  predict: {
    prompt: 'The two paths cross at $(2, 2, 0)$. At the planned speed, will we hit the debris there?',
    choices: [{ id: 'yes', text: 'Yes: we both reach it at minute 2' }, { id: 'no', text: 'No: we reach it at different minutes' }, { id: 'never', text: 'The paths never cross' }],
    answer: 'yes',
    reveal: 'At the planned speed we reach $(2, 2, 0)$ at minute 2, and so does the debris. A new speed changes **when** we pass the crossing, not **where**: our path is the same line.',
  },
  hints: [
    'Play at the planned speed first. Watch where the two ships meet, and at which minute.',
    'Our path stays the same line at any speed. Only the minute we reach $(2, 2, 0)$ changes.',
    'Set the speed to 2: we pass the crossing at minute 1, while the debris is still a step away.',
  ],
  par: 3,
  view: '3d',
  onWin: S.p1Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [2.2, 2, 0], distance: 15, azimuth: -92, elevation: 58, ms: 0 });
    p.grid({ base: 0.1, main: 0.2, axis: 0.35 });
    const step = p.difficulty === 'cadet' ? 0.5 : 0.25;
    let k = 1, t = 0;
    const mins = [1, 2, 3, 4];
    const ours = new PathLine(p, [0, 0, 0], v3(P1_DIR), { color: C.v, t0: 0, t1: 8, ticks: mins, tickLabels: true });
    new PathLine(p, v3(DEB1_P), v3(DEB1_D), { color: DEBRIS, t0: -0.5, t1: 7, ticks: mins, tickLabels: true });
    const ring = new FlatRing(p, v3(P1_CROSS), [0, 0, 1], { r: 0.26 });
    lab(p, 'crossing', [P1_CROSS[0] + 0.6, P1_CROSS[1] + 0.25, 0], { className: 'small' });
    const ship = makeLantern(p.g.stage, 0.13);
    p.add(ship);
    ship.face(v3(P1_DIR));
    ship.setThrust(0.6);
    const rock = new Dot(v3(DEB1_P), { color: DEBRIS, size: 0.15, glow: 0.5 });
    p.add(rock);
    const gapLine = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.orange, width: 2, dashed: true, opacity: 0 });
    p.add(gapLine);
    p.onDispose(() => gapLine.dispose());
    const r = p.readout('Minute by minute');
    const place = () => {
      const a = ourAt(k, t), b = debrisAt(t);
      ship.object.position.set(a[0], a[1], 0.12);
      rock.at([b[0], b[1], 0.05]);
      ours.setTicks([0, 0, 0], v3(P1_DIR), mins.map((m) => m * k));
      r.row('t', 'minute', num(Math.round(t * 100) / 100));
      r.row('us', 'us: $t\\,k(1, 1, 0)$', fmt(a.map((x) => Math.round(x * 100) / 100)), C.v);
      r.row('deb', 'debris', fmt(b.map((x) => Math.round(x * 100) / 100)), DEBRIS);
      r.row('gap', 'gap now', num(Math.round(dist(a, b) * 100) / 100));
    };
    const speed = new Slider({ label: 'speed $k$', min: 0.5, max: 2, step, value: 1, format: (x) => `${num(x)}×`, onInput: (x) => { k = x; place(); } });
    speed.el.querySelector('input')!.addEventListener('change', () => p.move());
    const clock = new Slider({ label: 'minute', min: 0, max: 4, step: 0.05, value: 0, onInput: (x) => { t = x; place(); } });
    let won = false, busy = false;
    const play = async (ms = 3400) => {
      if (won || busy) return;
      busy = true;
      p.move();
      gapLine.setOpacity(0);
      ship.setThrust(1);
      await animate(ms, (x) => { t = 4 * x; clock.set(t, false); place(); }, ease.linear);
      const best = p1MinGap(k), bestT = Math.max(0, Math.min(4, p1MinAt(k)));
      ship.setThrust(0.6);
      r.row('min', 'closest pass', `${num(Math.round(best * 100) / 100)} at minute ${num(Math.round(bestT * 100) / 100)}`, best < P1_CLEAR ? C.orange : C.good);
      busy = false;
      if (Math.abs(k - 1) < 1e-9) p.subgoal(0);
      if (p1Won(k)) {
        won = true;
        p.subgoal(1);
        ring.setColor(C.good); void ring.pulse();
        flourish(p, v3(P1_CROSS));
        p.win();
        return;
      }
      const a = ourAt(k, bestT), b = debrisAt(bestT);
      gapLine.setPoints([[a[0], a[1], 0.08], [b[0], b[1], 0.08]]);
      gapLine.setOpacity(best > 0.02 ? 0.9 : 0);
      sfx.miss();
      p.g.stage.nudge(0.12);
      ring.setColor(C.orange);
      p.bark('lantern', best < 0.02
        ? 'Collision at minute 2, at (2, 2, 0). Both paths reach the crossing at the same minute.'
        : `Closest pass ${num(Math.round(best * 100) / 100)} at minute ${num(Math.round(bestT * 100) / 100)}. We need at least 0.5.`);
      t = 0; clock.set(0, false); place();
    };
    p.dock().append(speed.el, clock.el, button('Play', () => void play(), { cls: 'primary small' }));
    place();
    return {
      async showMe() { await play(2600); speed.set(2, false); k = 2; place(); await wait(300); await play(2600); },
      async solve() { k = 2; speed.set(2, false); await play(0); },
      async wrong() { k = 1; await play(0); },
    };
  },
};

// ------------------------------------------------------------------ p2 Never crossing (skew lines)

export const p2: PuzzleDef = {
  id: 'c07-p2',
  title: 'Two paths that are not parallel: where do they meet?',
  goal: 'Our path runs along $\\cg{(1, 0, 0)}$ through the origin. The debris runs along $\\cr{(0, 1, 0)}$ through $(0, 1, 2)$. Slide one bead on each path until the link between them is at a **right angle to both**.',
  hints: [
    'The link reads against each path\'s direction. Make both readings 0.',
    'Our bead at $(t, 0, 0)$, the debris bead at $(0, 1 + s, 2)$: the link is $(-t, 1 + s, 2)$.',
    '$t = 0$ and $s = -1$: the link is $(0, 0, 2)$, straight up, 2 long.',
  ],
  par: 3,
  view: '3d',
  onWin: S.p2Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [0.2, 0.4, 1.4], distance: 14, azimuth: -48, elevation: 18, ms: 0 });
    p.grid({ base: 0.08, main: 0.16, axis: 0.3 });
    const cmd = p.difficulty === 'commander';
    const snap = cmd ? 0.05 : 0.25;
    new PathLine(p, v3(P2_P1), v3(P2_D1), { color: C.v, t0: -6, t1: 6 });
    new PathLine(p, v3(P2_P2), v3(P2_D2), { color: C.w, t0: -6, t1: 6 });
    let ta = 2, sb = 1;
    const link = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.result, width: 3, intensity: 1.4 });
    p.add(link);
    p.onDispose(() => link.dispose());
    const lenLab = lab(p, '', [0, 0, 0], { className: 'small', color: C.result });
    const ra = new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 0, 1], 0.24);
    const rb = new RightAngle(p, [0, 0, 0], [0, 1, 0], [0, 0, 1], 0.24);
    const r = p.readout('The link');
    const show = () => {
      const a = along(P2_P1, P2_D1, ta) as V3, b = along(P2_P2, P2_D2, sb) as V3;
      const l = p2Link(ta, sb);
      link.setPoints([a, b]);
      lenLab.at([(a[0] + b[0]) / 2 + 0.25, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
      lenLab.set(num(Math.round(norm(l) * 100) / 100));
      const r1 = dot(l, P2_D1), r2 = dot(l, P2_D2);
      ra.set(a, v3(P2_D1), v3(l)); ra.show(Math.abs(r1) < 0.03);
      rb.set(b, v3(P2_D2), v3(vsub([0, 0, 0], l))); rb.show(Math.abs(r2) < 0.03);
      r.row('l', 'link', fmt(l.map((x) => Math.round(x * 100) / 100)), C.result);
      if (!cmd) {
        r.row('r1', 'reads against $(1, 0, 0)$', num(Math.round(r1 * 100) / 100), Math.abs(r1) < 0.03 ? C.good : C.v);
        r.row('r2', 'reads against $(0, 1, 0)$', num(Math.round(r2 * 100) / 100), Math.abs(r2) < 0.03 ? C.good : C.w);
      }
      r.row('len', 'length', num(Math.round(norm(l) * 100) / 100));
    };
    let won = false;
    const finish = async () => {
      if (won) return;
      won = true;
      link.setColor(C.result, 2.4);
      p.add(new Arrow([1.6, 0, 0], [1.6, 0, 1], { color: '#fff1c2', width: 0.035 }));
      lab(p, '$(1, 0, 0)\\times(0, 1, 0)$', [1.95, 0, 1.25], { className: 'small', color: '#fff1c2' });
      flourish(p, [0, 0, 1]);
      p.win();
    };
    const check = () => { if (!cmd && p2Won(ta, sb)) void finish(); };
    const ba = new Bead(p, v3(P2_P1), v3(P2_D1), ta, { color: C.v, snap, min: -4, max: 4, onMove: (t) => { ta = t; show(); }, onEnd: check });
    const bb = new Bead(p, v3(P2_P2), v3(P2_D2), sb, { color: C.w, snap, min: -4, max: 3, onMove: (s) => { sb = s; show(); }, onEnd: check });
    show();
    const glide = async (t: number, s: number, ms: number) => {
      const t0 = ta, s0 = sb;
      await animate(ms, (k) => { ta = t0 + (t - t0) * k; sb = s0 + (s - s0) * k; ba.at(v3(P2_P1), v3(P2_D1), ta); bb.at(v3(P2_P2), v3(P2_D2), sb); show(); }, ease.inOut);
    };
    let solveCmd: () => void = () => {};
    if (cmd) {
      const ws = new StepWorksheet(p, {
        title: 'The gap from the formula',
        steps: [
          { prompt: '$\\mathbf d_1\\times\\mathbf d_2 = (1, 0, 0)\\times(0, 1, 0)$', answer: v3(cross(P2_D1, P2_D2)) },
          { prompt: '$(\\mathbf p_2 - \\mathbf p_1)\\cdot(\\mathbf d_1\\times\\mathbf d_2)$', answer: 2 },
          { prompt: 'The gap: $\\dfrac{|(\\mathbf p_2 - \\mathbf p_1)\\cdot(\\mathbf d_1\\times\\mathbf d_2)|}{\\|\\mathbf d_1\\times\\mathbf d_2\\|}$', answer: P2_GAP, mistakes: [[Math.sqrt(5), 'That is the length of $\\mathbf p_2 - \\mathbf p_1$: the gap is only its part along $\\mathbf d_1\\times\\mathbf d_2$.']] },
        ],
        onDone: () => { void glide(P2_TS[0], P2_TS[1], 900).then(finish); },
      });
      solveCmd = () => ws.solve();
    }
    return {
      async showMe() { if (cmd) { solveCmd(); return; } await glide(P2_TS[0], P2_TS[1], 1200); check(); },
      async solve() { if (cmd) { solveCmd(); await until(() => won); return; } await glide(P2_TS[0], P2_TS[1], 0); check(); },
      async wrong() { await glide(0, 0, 0); check(); },
    };
  },
};

// ------------------------------------------------------------------ p3 [D][H] Write the door

const P3_TILE_DEFS = [
  { id: 't1', text: 'Pick a point $P$ on the plane and the arrow $\\mathbf n$ straight out of it.' },
  { id: 't2', text: 'A point $X$ is on the plane exactly when the arrow $X - P$ lies flat in it.' },
  { id: 't3', text: 'Flat in the plane means at a right angle to $\\mathbf n$: $\\mathbf n\\cdot(X - P) = 0$.' },
  { id: 't4', text: 'Expand: $\\mathbf n\\cdot X = \\mathbf n\\cdot P$.' },
  { id: 't5', text: 'With $\\mathbf n = (a, b, c)$ and $X = (x, y, z)$: $ax + by + cz = d$, where $d = \\mathbf n\\cdot P$.' },
];
const P3_DECOY = [{ id: 'x1', text: 'A point $X$ is on the plane exactly when $X$ itself is at a right angle to $\\mathbf n$.' }];

export const p3: PuzzleDef = {
  id: 'c07-p3',
  title: 'What equation does every point of the door obey?',
  goal: 'The door\'s normal $\\mathbf n = (6, 3, 2)$ stands at corner **P**. **Click three points on the door**: each arrow from P reads against $\\mathbf n$. Then write the door\'s equation.',
  subgoals: ['Test three points on the door', 'Write the door\'s equation'],
  hints: [
    'Click anywhere on the lit triangle. LANTERN draws the arrow from P to your point and its reading against $\\mathbf n$.',
    'Every reading is 0: $\\mathbf n\\cdot(X - P) = 0$. Expand it: $6x + 3y + 2z = \\mathbf n\\cdot P$.',
    '$\\mathbf n\\cdot P = (6, 3, 2)\\cdot(1, 0, 0) = 6$, so the door is $6x + 3y + 2z = 6$.',
  ],
  par: 6,
  view: '3d',
  onWin: S.p3Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [0.5, 0.7, 1.3], distance: 12, azimuth: 72, elevation: 26, ms: 0 });
    p.grid({ base: 0.06, main: 0.12, axis: 0.3 });
    const d = p.difficulty;
    const door = new DoorWall(p, { wall: 0.45, wallSize: 7 });
    normalArrow(p, v3(DOOR_P), v3(DOOR_N), 1.6, '$\\mathbf n = (6, 3, 2)$');
    const picker = wallPicker(p);
    const tests: V3[] = [];
    const flags = [false, false];
    let won = false;
    const tick = async (i: number) => {
      if (flags[i]) return;
      flags[i] = true; p.subgoal(i);
      if (flags[0] && flags[1] && !won) { won = true; door.glow(true); flourish(p, v3(DOOR_CENTRE), '#ffd9a0'); p.win(); }
    };
    const r = p.readout('Readings against n');
    r.row('n0', 'points tested on the door', '0 of 3');
    const test = (x: V3) => {
      if (won) return;
      p.move();
      const reading = dot(v3(DOOR_N), vsub(x, DOOR_P));
      if (!insideDoor(x, 0.02)) {
        sfx.tick(2);
        p.bark('lantern', `On the door's plane but outside the door. It reads ${num(Math.round(reading * 100) / 100)} too: every point of the plane does.`);
        return;
      }
      if (!p3Accept(tests, x)) { p.bark('lantern', 'Too close to a point already tested. Pick another spot.'); return; }
      tests.push(x);
      const a = new Arrow(v3(DOOR_P), x, { color: C.result, width: 0.03 });
      const mk = new RightAngle(p, v3(DOOR_P), v3(DOOR_N), vsub(x, DOOR_P) as V3, 0.18);
      void mk;
      p.add(a, new Dot(x, { color: C.result, size: 0.07 }));
      sfx.snap();
      r.row(`x${tests.length}`, `X${tests.length} = ${fmt(x.map((c) => Math.round(c * 100) / 100))}`, `$\\mathbf n\\cdot(X - P) = 0$`, C.good);
      r.row('n0', 'points tested on the door', `${Math.min(3, tests.length)} of 3`);
      if (tests.length >= 3) void tick(0);
    };
    const onClick = (e: PointerEvent) => {
      if (p.g.drag.dragging || e.button !== 0) return;
      if (!p.g.stage.pick(e.clientX, e.clientY, [picker])) return;
      const at = p.g.stage.toPlane(e.clientX, e.clientY, doorPlane);
      if (at) test([at.x, at.y, at.z]);
    };
    p.g.stage.renderer.domElement.addEventListener('pointerdown', onClick);
    p.onDispose(() => p.g.stage.renderer.domElement.removeEventListener('pointerdown', onClick));
    const eqDone = () => { r.row('eq', 'the door', '$6x + 3y + 2z = 6$', '#ffd9a0'); void tick(1); };
    const steps = [
      { prompt: 'The numbers in front of $x$, $y$, $z$: $(a, b, c) = \\mathbf n$', answer: v3(DOOR_N) },
      { prompt: '$d = \\mathbf n\\cdot P = (6, 3, 2)\\cdot(1, 0, 0)$', answer: DOOR_K, mistakes: [[0, 'That is $\\mathbf n\\cdot(0, 0, 0)$. The door does not pass through the origin; use $P$.']] as [number, string][] },
      { prompt: 'Check $R = (0, 0, 3)$: $6\\cdot 0 + 3\\cdot 0 + 2\\cdot 3$', answer: 6 },
    ];
    let solveEq: () => void;
    if (d === 'commander') {
      const dock = p.dock();
      const msg = h('div', { class: 'c-muted', style: 'font-size:13px;min-height:18px' });
      const fin = h('div');
      let ws: StepWorksheet | null = null;
      const openLast = () => { if (!ws) ws = new StepWorksheet(p, { title: 'The last line: $6x + 3y + 2z = d$', steps: [steps[1]], onDone: eqDone, mount: fin }); };
      const tiles = new TileOrder(p, {
        tiles: P3_TILE_DEFS, decoys: P3_DECOY, title: 'Where the equation comes from · order the steps', submitLabel: 'Check the order', mount: dock,
        onSubmit: (o) => {
          p.move();
          if (o.includes('x1')) { sfx.miss(); msg.innerHTML = inline('$X$ itself is an arrow from the origin. The door is not through the origin: use the arrow $X - P$, which lies in the door.'); return; }
          if (!p3OrderOk(o)) { sfx.miss(); msg.innerHTML = inline('Not in that order. Each step must follow from the one before.'); return; }
          sfx.snap(); msg.innerHTML = inline('The steps hold. Now the last line.'); openLast();
        },
      });
      dock.append(msg, fin);
      solveEq = () => { tiles.set(P3_TILE_DEFS.map((t) => t.id)); openLast(); ws!.solve(); };
    } else {
      const ws = new StepWorksheet(p, { title: 'The door\'s equation', steps, onDone: eqDone });
      solveEq = () => ws.solve();
    }
    return {
      async showMe() { for (const x of [[0, 0, 3], [0.5, 1, 0], [0.25, 0.5, 1.5]] as V3[]) { test(x); await wait(400); } solveEq(); },
      async solve() { for (const x of [[0, 0, 3], [0.5, 1, 0], [0.25, 0.5, 1.5]] as V3[]) test(x); solveEq(); },
      wrong() { test([1, 1, 1]); test([0, 0, 3]); },
    };
  },
};

// ------------------------------------------------------------------ p4 Hit the centre

export const p4: PuzzleDef = {
  id: 'c07-p4',
  title: 'Which path from here meets the door at its centre?',
  goal: 'We sit at the origin. Aim the path $t\\,\\cg{\\mathbf d}$ (drag the tip, **Shift**-drag for height, or type $\\mathbf d$) so it meets the door at its **centre**, then **Fly**.',
  subgoals: ['Aim the path at the centre', 'Fly it'],
  hints: [
    'The yellow bead marks where the path meets the door\'s plane. Move it onto the centre ring.',
    'The centre is the average of the corners: $\\tfrac13(P + Q + R) = (\\tfrac13, \\tfrac23, 1)$. Any arrow along it works.',
    'Three times the centre: $\\mathbf d = (1, 2, 3)$. Then $18t = 6$, so $t = \\tfrac13$.',
  ],
  par: 3,
  view: '3d',
  onWin: S.p4Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [0.6, 0.9, 1.3], distance: 12.5, azimuth: -28, elevation: 22, ms: 0 });
    p.grid({ base: 0.06, main: 0.12, axis: 0.3 });
    const dlev = p.difficulty;
    const door = new DoorWall(p, { wall: 0.45 });
    const ring = new FlatRing(p, v3(DOOR_CENTRE), v3(DOOR_N), { r: 0.2, color: C.white });
    lab(p, 'centre', [DOOR_CENTRE[0] + 0.35, DOOR_CENTRE[1] + 0.35, DOOR_CENTRE[2] + 0.3], { className: 'small' });
    const ship = makeLantern(p.g.stage, 0.12);
    p.add(ship);
    ship.setThrust(0.3);
    let d: V3 = [1, 1, 1];
    const path = new PathLine(p, [0, 0, 0], d, { color: C.v, t0: 0, t1: 6, dashed: true, opacity: 0.7 });
    const bead = new Dot([0, 0, 0], { color: C.result, size: 0.09 });
    p.add(bead);
    const tLab = lab(p, '', [0, 0, 0], { className: 'small', color: C.result });
    const r = p.readout('The path');
    const show = () => {
      ship.face(norm(d) > 1e-9 ? d : [1, 0, 0]);
      path.set([0, 0, 0], d, 0, 6 / Math.max(0.3, norm(d)) * 1.2);
      const hit = p4Hit(d);
      bead.group.visible = !!hit;
      r.row('d', '$\\mathbf d$', fmt(d), C.v);
      if (hit) {
        bead.at(v3(hit.at));
        r.row('hit', 'meets the door\'s plane at', fmt(hit.at.map((x) => Math.round(x * 100) / 100)), C.result);
        tLab.at([hit.at[0] - 0.3, hit.at[1] - 0.3, hit.at[2]]);
        tLab.set(dlev === 'cadet' ? `t = ${num(Math.round(hit.t * 1000) / 1000)}` : '');
        tLab.show(dlev === 'cadet');
      } else { r.row('hit', 'meets the door\'s plane at', 'never, going forward'); tLab.show(false); }
      ring.setColor(p4Won(d) ? C.good : C.white);
    };
    const hd = new VectorHandle(p, { to: d, color: C.v, label: '$\\mathbf d$', limit: 4, onChange: (t) => { d = t; input.set(d); show(); } });
    const input = new VectorInput({ dim: 3, values: d, label: '\\mathbf d =', step: dlev === 'commander' ? 0.25 : 0.5, onChange: (v) => { d = v3(v); hd.arrow.setTo(d); show(); } });
    let typed = dlev === 'cadet';
    let won = false, busy = false;
    let ws: StepWorksheet | null = null;
    const fly = async () => {
      if (won || busy) return;
      const hit = p4Hit(d);
      if (!p4Won(d)) {
        p.move();
        sfx.miss();
        p.bark('lantern', hit ? `That path meets the door's plane at ${fmt(hit.at.map((x) => Math.round(x * 100) / 100))}, not at the centre (1/3, 2/3, 1).` : 'That path never meets the door going forward.');
        return;
      }
      p.subgoal(0);
      if (!typed) {
        if (!ws) {
          const nd = dot(v3(DOOR_N), d);
          p.setGoal(`Aimed at the centre. Before we fly: where along the path does it meet the door? Substitute $t\\,\\mathbf d$ into $6x + 3y + 2z = 6$.`);
          ws = new StepWorksheet(p, {
            title: 'Substitute the path into the plane',
            steps: [
              { prompt: `$6d_1 + 3d_2 + 2d_3$ for $\\mathbf d = ${fmt(d).replace(/−/g, '-')}$`, answer: nd },
              { prompt: `$t = 6 \\,/\\, ${num(nd).replace('−', '-')}$`, answer: 6 / nd },
            ],
            onDone: () => { typed = true; void fly(); },
          });
        }
        return;
      }
      busy = true;
      p.move();
      hd.setEnabled(false);
      ship.setThrust(1.2);
      sfx.thrust(1);
      const end = v3(hit!.at);
      await animate(1500, (k) => ship.object.position.set(end[0] * k, end[1] * k, end[2] * k), ease.inOut);
      ship.setThrust(0.2);
      won = true;
      p.subgoal(1);
      door.glow(true); void ring.pulse();
      flourish(p, end, '#ffd9a0');
      p.win();
    };
    p.dock().append(input.el, button('Fly', () => void fly(), { cls: 'primary small', kbd: 'F' }));
    show();
    const set = (v: V3) => { d = v; hd.arrow.setTo(d); input.set(d); show(); };
    return {
      async showMe() { await hd.moveTo(v3(P4_DIR), 900); d = v3(P4_DIR); input.set(d); show(); await fly(); if (ws && !typed) { await ws.showMe(300); } await until(() => won); },
      async solve() { set(v3(P4_DIR)); await fly(); if (ws && !typed) ws.solve(); await until(() => won); },
      async wrong() { set([1, 1, 1]); await fly(); },
    };
  },
};

// ------------------------------------------------------------------ p5 How far out?

export const p5: PuzzleDef = {
  id: 'c07-p5',
  title: 'How far is the holding point from the door, and from the path?',
  goal: 'Holding point $(3, 3, 3)$. Drag the **yellow** foot on the door\'s plane until the drop from the holding point is **straight**: at a right angle to the plane. Then slide the **green** bead on the approach path $t(1, 2, 3)$ until its drop is at a right angle to the path.',
  subgoals: ['The drop to the door\'s plane', 'The drop to the approach path'],
  hints: [
    'The shortest drop to a plane runs along the normal $\\mathbf n = (6, 3, 2)$. The right-angle mark appears when you are there.',
    'To the plane: $\\dfrac{\\mathbf n\\cdot(3, 3, 3) - 6}{\\|\\mathbf n\\|} = \\dfrac{27}{7}$. To the path: the bead\'s drop reads 0 against $(1, 2, 3)$ at $t = \\tfrac97$, and its length is $\\dfrac{\\|Q\\times\\mathbf d\\|}{\\|\\mathbf d\\|}$.',
    'The foot on the plane is about $(-0.31, 1.35, 1.90)$; the bead goes to $t = \\tfrac97 \\approx 1.29$.',
  ],
  // two drags, then on Navigator seven checked steps by hand
  par: 9,
  view: '3d',
  onWin: S.p5Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [1.2, 1.6, 2.2], distance: 15, azimuth: -12, elevation: 16, ms: 0 });
    p.grid({ base: 0.06, main: 0.12, axis: 0.3 });
    const cadet = p.difficulty === 'cadet';
    new DoorWall(p, { wall: 0.6, wallSize: 10 });
    p.add(new Dot(v3(HOLD), { color: C.white, size: 0.11, label: 'holding point', labelOffset: [0, -22] }));
    new PathLine(p, [0, 0, 0], v3(P4_DIR), { color: C.v, t0: -0.3, t1: 2.2, dashed: true, opacity: 0.75 });
    const drop1 = new FatLine(p.g.stage, [v3(HOLD), v3(HOLD)], { color: C.result, width: 2.4, dashed: true, intensity: 1.3 });
    const drop2 = new FatLine(p.g.stage, [v3(HOLD), v3(HOLD)], { color: C.v, width: 2.4, dashed: true, intensity: 1.3 });
    p.add(drop1, drop2);
    p.onDispose(() => { drop1.dispose(); drop2.dispose(); });
    const l1 = lab(p, '', [0, 0, 0], { className: 'small', color: C.result });
    const l2 = lab(p, '', [0, 0, 0], { className: 'small', color: C.v });
    const [ia] = inPlaneDirs(v3(DOOR_N));
    const m1 = new RightAngle(p, [0, 0, 0], v3(ia), [0, 0, 1], 0.22);
    const m2 = new RightAngle(p, [0, 0, 0], v3(P4_DIR), [0, 0, 1], 0.22);
    m1.show(false); m2.show(false);
    let F: V3 = v3(DOOR_CENTRE);
    let tb = 0.6;
    const flags = [false, false];
    /** Each distance's exact value is shown once it is worked out (Cadet: drawn, nothing to type). */
    const typed = [cadet, cadet];
    let won = false;
    const r = p.readout('Clearances');
    const show = () => {
      const B = along([0, 0, 0], P4_DIR, tb) as V3;
      drop1.setPoints([v3(HOLD), F]); drop2.setPoints([v3(HOLD), B]);
      const d1 = dist(HOLD, F), d2 = dist(HOLD, B);
      const mid = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      l1.at(mid(v3(HOLD), F)); l1.set(num(Math.round(d1 * 100) / 100));
      l2.at(mid(v3(HOLD), B)); l2.set(num(Math.round(d2 * 100) / 100));
      const on1 = p5PlaneWon(F), on2 = p5LineWon(tb);
      m1.set(F, v3(ia), vsub(HOLD, F) as V3); m1.show(on1);
      m2.set(B, v3(P4_DIR), vsub(HOLD, B) as V3); m2.show(on2);
      // Navigator and Commander work each distance out by hand: the exact value shows once it is typed
      r.row('a', 'to the door\'s plane', on1 && typed[0] ? `27/7 ≈ ${HOLD_DIST.toFixed(2)}` : num(Math.round(d1 * 100) / 100), on1 ? C.good : C.result);
      r.row('b', 'to the approach path', on2 && typed[1] ? `√(27/7) ≈ ${HOLD_LINE_DIST.toFixed(2)}` : num(Math.round(d2 * 100) / 100), on2 ? C.good : C.v);
      if (cadet) r.row('n', 'shortest drops', 'at right angles');
    };
    const tickOff = (i: number) => {
      if (flags[i]) return;
      flags[i] = true; p.subgoal(i); sfx.snap();
      (i === 0 ? drop1 : drop2).setColor(i === 0 ? C.result : C.v, 2.2);
      if (flags[0] && flags[1] && !won) { won = true; flourish(p, v3(HOLD)); p.win(); }
    };
    // ---- the by-hand steps (Navigator: each checked; Commander: only the answer), opened when a drop snaps
    const sheets = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    const ws: (StepWorksheet | null)[] = [null, null];
    const qd = cross(HOLD, P4_DIR);
    const typedDone = (i: number) => { typed[i] = true; show(); tickOff(i); };
    const openSheet = (i: number) => {
      if (ws[i]) return;
      // a finished sheet's answer is in the readout: fold it away so the dock stays short
      ws.forEach((w) => { if (w?.done) w.el.style.display = 'none'; });
      if (i === 0) {
        foot.setEnabled(false);
        ws[0] = new StepWorksheet(p, {
          title: 'The drop to the door\'s plane, by hand',
          mount: sheets,
          steps: [
            { prompt: '$\\mathbf n\\cdot(Q - P)$ for $Q = (3, 3, 3)$, $P = (1, 0, 0)$', answer: dot(DOOR_N, vsub(HOLD, DOOR_P)), mistakes: [[dot(DOOR_N, HOLD), 'That is $\\mathbf n\\cdot Q$. Take away $\\mathbf n\\cdot P = 6$: the door does not pass through the origin.']] },
            { prompt: '$\\|\\mathbf n\\| = \\|(6, 3, 2)\\|$', answer: norm(DOOR_N), mistakes: [[dot(DOOR_N, DOOR_N), 'That is $\\|\\mathbf n\\|^2$. Take its square root.']] },
            { prompt: 'Distance $\\dfrac{|\\mathbf n\\cdot(Q - P)|}{\\|\\mathbf n\\|}$ (a fraction)', answer: HOLD_DIST, mistakes: [[dot(DOOR_N, vsub(HOLD, DOOR_P)), 'That is the drop measured in units of $\\mathbf n$. Divide by $\\|\\mathbf n\\|$.'], [HOLD_DIST, 'The right size. Type it exactly, as a fraction $a/b$.']] },
          ],
          onDone: () => typedDone(0),
        });
      } else {
        bead.knob.setEnabled(false);
        slider.el.style.display = 'none';
        ws[1] = new StepWorksheet(p, {
          title: 'The drop to the path through the origin, by hand',
          mount: sheets,
          steps: [
            { prompt: '$Q\\times\\mathbf d = (3, 3, 3)\\times(1, 2, 3)$', answer: v3(qd), mistakes: [[v3(vsub([0, 0, 0], qd)), 'That is $\\mathbf d\\times Q$: the same length, the other way. Keep the order $Q\\times\\mathbf d$.']] },
            { prompt: '$\\|Q\\times\\mathbf d\\|^2$', answer: dot(qd, qd) },
            { prompt: '$\\|\\mathbf d\\|^2 = \\|(1, 2, 3)\\|^2$', answer: dot(P4_DIR, P4_DIR) },
            { prompt: 'Distance squared $\\dfrac{\\|Q\\times\\mathbf d\\|^2}{\\|\\mathbf d\\|^2}$ (a fraction)', answer: dot(qd, qd) / dot(P4_DIR, P4_DIR), mistakes: [[HOLD_LINE_DIST, 'That is the distance itself. This step wants its square, exactly.'], [dot(qd, qd) / dot(P4_DIR, P4_DIR), 'The right size. Type it exactly, as a fraction $a/b$.']] },
          ],
          onDone: () => typedDone(1),
        });
      }
    };
    /** A drop has snapped straight: Cadet is done with it; Navigator and Commander work it out by hand. */
    const snapped = (i: number) => { if (flags[i]) return; if (cadet) tickOff(i); else openSheet(i); };
    const magnet = cadet ? 0.45 : 0.25;
    const foot = new Knob(p, F, {
      color: C.result, size: 0.09,
      constrain: (q) => { const w = DoorWall.onWall(q); return dist([w.x, w.y, w.z], HOLD_FOOT) < magnet ? new Vector3(...v3(HOLD_FOOT)) : w; },
      onMove: (q) => { F = q; show(); },
      onEnd: () => { if (p5PlaneWon(F)) snapped(0); },
    });
    const bead = new Bead(p, [0, 0, 0], v3(P4_DIR), tb, { color: C.v, min: -0.2, max: 2.2, magnet: { at: HOLD_LINE_T, within: cadet ? 0.12 : 0.06 }, onMove: (t) => { tb = t; slider.set(Math.round(t * 100) / 100, false); show(); }, onEnd: () => { if (p5LineWon(tb)) snapped(1); } });
    const slider = new Slider({ label: 'bead $t$', min: 0, max: 2.2, step: 0.01, value: tb, onInput: (x) => { tb = Math.abs(x - HOLD_LINE_T) < (cadet ? 0.05 : 0.02) ? HOLD_LINE_T : x; bead.at([0, 0, 0], v3(P4_DIR), tb); show(); } });
    slider.el.querySelector('input')!.addEventListener('change', () => { p.move(); if (p5LineWon(tb)) snapped(1); });
    const note = cadet ? 'Drag the yellow foot on the glass. Slide the green bead, or use the dial.' : 'Drag the yellow foot on the glass. Slide the green bead, or use the dial. When a drop snaps straight, work out its length by hand.';
    p.dock().append(h('div', { style: 'font-size:13px;color:var(--ink-2);max-width:300px', html: inline(note) }), slider.el, sheets);
    show();
    const go = async (ms: number, sheet: (w: StepWorksheet) => Promise<void> | void) => {
      if (!flags[0]) {
        if (!ws[0]) {
          const F0 = F;
          await animate(ms, (k) => { F = [F0[0] + (HOLD_FOOT[0] - F0[0]) * k, F0[1] + (HOLD_FOOT[1] - F0[1]) * k, F0[2] + (HOLD_FOOT[2] - F0[2]) * k]; foot.at(F); show(); }, ease.inOut);
          F = v3(HOLD_FOOT); foot.at(F); show(); snapped(0);
        }
        if (ws[0] && !ws[0].done) await sheet(ws[0]);
      }
      if (!flags[1]) {
        if (!ws[1]) {
          const t0 = tb;
          await animate(ms, (k) => { tb = t0 + (HOLD_LINE_T - t0) * k; bead.at([0, 0, 0], v3(P4_DIR), tb); slider.set(Math.round(tb * 100) / 100, false); show(); }, ease.inOut);
          tb = HOLD_LINE_T; bead.at([0, 0, 0], v3(P4_DIR), tb); slider.set(Math.round(tb * 100) / 100, false); show(); snapped(1);
        }
        if (ws[1] && !ws[1].done) await sheet(ws[1]);
      }
    };
    return {
      async showMe() { await go(900, (w) => w.showMe(350)); await until(() => won); },
      async solve() { await go(0, (w) => w.solve()); await until(() => won); },
      wrong() { F = v3(DOOR_CENTRE); foot.at(F); show(); if (p5PlaneWon(F)) snapped(0); },
    };
  },
};

// ------------------------------------------------------------------ p6 [H] The weld seam

export const p6: PuzzleDef = {
  id: 'c07-p6',
  title: 'Where does the door\'s plate meet the hull, and at what angle?',
  goal: 'The door\'s plane $6x + 3y + 2z = 6$ meets the hull plate $x - y = 0$. Work out the **weld seam** (a point and a direction) and the **angle** between the plates, by hand.',
  hints: [
    'The seam lies in both planes, so its direction is at a right angle to both normals: $\\mathbf n_1\\times\\mathbf n_2$.',
    'For a point on both, try $x = y = 0$: the hull plate holds, and the door gives $2z = 6$.',
    'The angle between the plates is the angle between their normals: $\\cos\\theta = \\dfrac{\\mathbf n_1\\cdot\\mathbf n_2}{\\|\\mathbf n_1\\|\\|\\mathbf n_2\\|} = \\dfrac{3}{7\\sqrt2}$.',
  ],
  par: 7,
  view: '3d',
  onWin: S.p6Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [0.4, 0.4, 2.6], distance: 17, azimuth: -5, elevation: 24, ms: 0 });
    const door = new DoorWall(p, { wall: 0.5, wallSize: 6.5 });
    void door;
    const hull = new PlanePatch(p.g.stage, v3(WELD_POINT), v3(HULL_N), { color: '#c8b9a6', size: 6.5, opacity: 0.12 });
    hull.setOpacity(0.6);
    p.add(hull);
    lab(p, 'hull plate $x - y = 0$', [1.6, 1.6, 5.4], { className: 'small', color: '#c8b9a6' });
    lab(p, 'door plane', [2.6, 1.2, -0.4], { className: 'small', color: '#8fd3ff' });
    normalArrow(p, v3(DOOR_CENTRE), v3(DOOR_N), 1.2, '$\\mathbf n_1 = (6, 3, 2)$');
    normalArrow(p, [1.2, 1.2, 4.6], v3(HULL_N), 1.2, '$\\mathbf n_2 = (1, -1, 0)$', '#e8dccb');
    const seam = new InfLine(p.g.stage, v3(WELD_POINT), v3(WELD_DIR), { color: C.result, width: 3.2, opacity: 0, length: 4 });
    p.add(seam);
    p.onDispose(() => seam.dispose());
    const r = p.readout('Weld seam');
    let won = false;
    const done = async () => {
      if (won) return;
      won = true;
      sfx.whoosh(1);
      await animate(1000, (k) => { seam.line.setOpacity(k); }, ease.out);
      p.add(new Dot(v3(WELD_POINT), { color: C.result, size: 0.09, label: '(0, 0, 3)', labelOffset: [26, -10] }));
      // n1 · n2 = 3 > 0: the arc between n1 and n2 is the 72.4° the player typed (−n1 would draw 107.6°)
      const arc = new AngleArc(p, v3(WELD_POINT), v3(DOOR_N), v3(HULL_N), { label: `$${WELD_DEG.toFixed(1)}°$`, radius: 0.7 });
      void arc;
      r.row('dir', 'seam direction', fmt(WELD_DIR), C.result);
      r.row('pt', 'through', fmt(WELD_POINT));
      r.row('ang', 'angle between the plates', `${WELD_DEG.toFixed(1)}°`);
      flourish(p, v3(WELD_POINT));
      p.win();
    };
    const ws = new StepWorksheet(p, {
      steps: [
        { prompt: 'Seam direction: $\\mathbf n_1\\times\\mathbf n_2 = (6, 3, 2)\\times(1, -1, 0)$', answer: v3(WELD_DIR), mistakes: [[[-2, -2, 9], 'That is $\\mathbf n_2\\times\\mathbf n_1$: it runs along the same seam, the other way. Keep the order $\\mathbf n_1\\times\\mathbf n_2$.']] },
        { prompt: 'A point on both plates with $x = y = 0$', answer: v3(WELD_POINT) },
        { prompt: '$\\mathbf n_1\\cdot\\mathbf n_2$', answer: dot(v3(DOOR_N), v3(HULL_N)) },
        { prompt: '$\\|\\mathbf n_1\\| = \\|(6, 3, 2)\\|$', answer: norm(DOOR_N) },
        { prompt: '$\\|\\mathbf n_2\\| = \\|(1, -1, 0)\\|$ (two decimals)', answer: norm(HULL_N), tol: 0.006 },
        { prompt: '$\\cos\\theta = \\dfrac{\\mathbf n_1\\cdot\\mathbf n_2}{\\|\\mathbf n_1\\|\\,\\|\\mathbf n_2\\|}$ (two decimals)', answer: WELD_COS, tol: 0.006, mistakes: [[3 / 7, 'That is $\\mathbf n_1\\cdot\\mathbf n_2$ over $\\|\\mathbf n_1\\|$ alone. Divide by $\\|\\mathbf n_2\\|$ too.']] },
        { prompt: '$\\theta$ in degrees (one decimal)', answer: WELD_DEG, tol: 0.15, suffix: '°', mistakes: [[0.3, 'That is $\\cos\\theta$. Turn it into an angle.']] },
      ],
      onDone: () => void done(),
    });
    return {
      async showMe() { await ws.showMe(350); },
      async solve() { ws.solve(); await until(() => won); },
      wrong() { ws.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p7 [S] No single hit

export const p7: PuzzleDef = {
  id: 'c07-p7',
  title: 'Can a path never meet the door\'s plane?',
  goal: 'From $(2, 2, 2)$, set a direction $\\cg{\\mathbf d}$ so the hit test reports **no single hit**. LANTERN solves $\\mathbf n\\cdot(\\mathbf p + t\\mathbf d) = 6$ for $t$.',
  hints: [
    'Watch the bottom of the fraction: $t = \\dfrac{6 - \\mathbf n\\cdot\\mathbf p}{\\mathbf n\\cdot\\mathbf d}$.',
    'Make $\\mathbf n\\cdot\\mathbf d = 6d_1 + 3d_2 + 2d_3$ equal 0: the path runs alongside the plane.',
    'Try $\\mathbf d = (1, -2, 0)$.',
  ],
  par: 2,
  view: '3d',
  style: 'mastery',
  onWin: S.p7Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [1, 1.2, 1.7], distance: 13.5, azimuth: -30, elevation: 22, ms: 0 });
    p.grid({ base: 0.06, main: 0.12, axis: 0.3 });
    new DoorWall(p, { wall: 0.6, wallSize: 10 });
    const start = v3(P7_START);
    p.add(new Dot(start, { color: C.white, size: 0.1, label: '$(2, 2, 2)$', labelOffset: [0, -22] }));
    let d: V3 = [-1, -1, 0];
    const path = new PathLine(p, start, d, { color: C.v, t0: -6, t1: 6, dashed: true, opacity: 0.75 });
    const bead = new Dot([0, 0, 0], { color: C.result, size: 0.09 });
    p.add(bead);
    const r = p.readout('Hit test');
    const np = dot(v3(DOOR_N), start);
    /** The zero arrow is no direction at all: the same test p7Won uses. */
    const zero = () => norm(d) <= 1e-9;
    const show = () => {
      path.set(start, d, -6, 6);
      const nd = dot(v3(DOOR_N), d);
      const t = rayPlane(start, d, DOOR_N, DOOR_K);
      const z = zero();
      r.row('nd', '$\\mathbf n\\cdot\\mathbf d$', num(Math.round(nd * 100) / 100), z ? C.orange : Math.abs(nd) < 1e-9 ? C.good : C.v);
      r.row('t', '$t = \\dfrac{6 - ' + np + '}{\\mathbf n\\cdot\\mathbf d}$', z ? 'no path: d is the zero arrow' : t === null ? 'no single hit' : num(Math.round(t * 100) / 100), z ? C.orange : t === null ? C.good : C.result);
      bead.group.visible = !z && t !== null && Math.abs(t) < 8;
      if (t !== null) bead.at(along(start, d, t) as V3);
    };
    let won = false;
    const check = () => {
      if (won || !p7Won(d)) return;
      won = true;
      path.setColor(C.good, 1.8);
      flourish(p, start, C.good);
      p.win();
    };
    const hd = new VectorHandle(p, { from: start, to: [start[0] + d[0], start[1] + d[1], start[2] + d[2]], color: C.v, label: '$\\mathbf d$', limit: 6, onChange: () => { d = hd.vec; input.set(d); show(); }, onCommit: check });
    const input = new VectorInput({ dim: 3, values: d, label: '\\mathbf d =', step: 1, onChange: (v) => { d = v3(v); hd.arrow.setTo([start[0] + d[0], start[1] + d[1], start[2] + d[2]]); show(); }, onSubmit: () => { p.move(); check(); } });
    const test = () => {
      p.move(); check();
      if (won) return;
      sfx.miss();
      if (zero()) { p.bark('lantern', 'd is the zero arrow: there is no path to test.'); return; }
      // any nonzero d with no single hit wins, so here the path has one hit
      const t = rayPlane(start, d, DOOR_N, DOOR_K)!;
      p.bark('lantern', `n · d = ${num(dot(v3(DOOR_N), d))}. One hit, at t = ${num(Math.round(t * 100) / 100)}.`);
    };
    p.dock().append(input.el, button('Test', test, { cls: 'primary small' }));
    show();
    return {
      async showMe() { await hd.moveTo([start[0] + 1, start[1] - 2, start[2]], 800, start); d = [1, -2, 0]; input.set(d); show(); check(); },
      async solve() { d = [1, -2, 0]; hd.arrow.setTo([3, 0, 2]); input.set(d); show(); check(); },
      wrong() { d = [1, 0, 0]; show(); check(); },
    };
  },
};
