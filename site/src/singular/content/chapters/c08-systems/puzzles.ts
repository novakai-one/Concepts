// Chapter 8 puzzles: the twin view (p1), the pod (p2), never two (p3 [D]), the prism (p4) and the
// ballast tanks (p5 [H]). Win checks are pure functions in logic.ts.
import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot, Pad } from '../../../gfx/markers';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { Slider } from '../../../ui/widgets';
import { h, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { sfx } from '../../../audio/sfx';
import { animate, ease, wait } from '../../../core/tween';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { PlaneSet, type Host } from './planes';
import { Marker3D, placeInput } from './marker';
import {
  add, distToRow, glowTol, num, onAll, pt, residuals, rowTex, scale, sub, winTol, type Aug, type Diff,
} from './act3';
import {
  P1, P2, P3, P3_PAR, P4, P5, P5_STEPS, lookingDown, p1Tip, p1Weights, p1Won, p2Won, p3C, p3OrderOk, p3Pair, p3Region, p3SweepDone,
} from './logic';
import { S } from './script';
import './act3.css';

const diff = (p: PuzzleCtx): Diff => p.difficulty;

/** Light each plane the point sits on; returns how many. */
function glowPlanes(set: PlaneSet, rows: Aug, x: number[], tol: number): number {
  let n = 0;
  rows.forEach((r, i) => { const on = distToRow(r, x) <= tol; set.setGlow(i, on ? 1 : 0); if (on) n++; });
  return n;
}

/** The "how far off is each equation" readout (the numbers the Ch 8 build `check` returns). */
function offReadout(p: PuzzleCtx, title: string, rows: Aug) {
  const r = p.readout(title);
  const grid = h('div', { class: 'c08-off' });
  r.el.insertBefore(grid, r.el.children[1] ?? null);
  const colors = [C.v, C.w, C.u];
  return (x: number[], tol: number) => {
    const res = residuals(rows, x);
    grid.replaceChildren(...rows.flatMap((row, i) => {
      const ok = Math.abs(res[i]) / Math.max(1e-9, Math.hypot(...row.slice(0, -1))) <= tol;
      const k = h('span', { class: 'k', html: `<span style="color:${colors[i]}">${inline(`$${rowTex(row)}$`)}</span>` });
      const v = h('span', { class: `v${ok ? ' ok' : ''}` }, ok ? 'on it' : `off by ${num(res[i])}`);
      return [k, v];
    }));
  };
}

// ------------------------------------------------------------------ p1: two lines first (the twin view)

/** Row panel and column panel: where each sits in the world, the box each shows, and the column panel's scale. */
type Box = [number, number, number, number];
export interface TwinCfg { rows: Aug; rowO: number[]; rowBox: Box; colO: number[]; colBox: Box; colK: number }
const P1_TWIN: TwinCfg = { rows: P1.rows, rowO: [-8.5, -1.5], rowBox: [-1, -2, 6, 5], colO: [1.5, -0.5], colBox: [-1, -3, 7, 4], colK: 1 };
/** p1's panels with other rows (the row picture / column picture card). */
export const twinCfg = (rows: Aug): TwinCfg => ({ ...P1_TWIN, rows });
/** Row lines in blue and violet: green and red belong to columns 1 and 2, so a row line never shares a column arrow's colour. */
const TWIN_ROW_COLORS = [C.u, C.violet];
const toW = (o: number[], v: number[], z = 0, k = 1): V3 => [v[0] * k + o[0], v[1] * k + o[1], z];

/** Frame, faint grid and axes for one panel (k: world units per panel unit). */
function panel(host: Host, o: number[], b: Box, caption: string, k = 1): Label {
  const st = host.g.stage;
  const W = (v: number[], z: number) => toW(o, v, z, k);
  const corners = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]].map((c) => W(c, -0.01));
  const frame = new FatLine(st, corners, { color: '#59e1ff', width: 1.4, opacity: 0.4 });
  const segs: [V3, V3][] = [];
  const step = k < 0.6 ? 2 : 1;
  for (let x = Math.ceil(b[0] / step) * step; x <= b[2]; x += step) if (x !== 0) segs.push([W([x, b[1]], -0.02), W([x, b[3]], -0.02)]);
  for (let y = Math.ceil(b[1] / step) * step; y <= b[3]; y += step) if (y !== 0) segs.push([W([b[0], y], -0.02), W([b[2], y], -0.02)]);
  const grid = new FatSegments(st, segs, { color: C.grid, width: 1, opacity: 0.3 });
  const axes = new FatSegments(st, [[W([b[0], 0], -0.015), W([b[2], 0], -0.015)], [W([0, b[1]], -0.015), W([0, b[3]], -0.015)]], { color: C.axis, width: 1.4, opacity: 0.55 });
  const cap = new Label(caption, toW(o, [(b[0] + b[2]) / 2, b[3]], 0, k).map((x, i) => (i === 1 ? x + 0.55 : x)) as V3, { className: 'c08-cap' });
  host.add(frame.object, grid.object, axes.object, cap.object);
  host.onDispose(() => { frame.dispose(); grid.dispose(); axes.dispose(); cap.dispose(); });
  return cap;
}

export interface Twin {
  set(xy: number[]): void;
  /** A different system (the Shake). */
  setRows(rows: Aug): void;
  xy: number[]; rows: Aug; cfg: TwinCfg;
  rowDot: Dot; tipDot: Dot; pad: Pad; planes: PlaneSet; eqn: Label;
  tip(): number[]; weights(q: number[]): number[] | null;
}

/** Draw the twin view: rows as lines on the left, columns as arrows on the right, linked. */
export function drawTwin(host: Host, start: number[], cfg: TwinCfg = P1_TWIN): Twin {
  const st = host.g.stage;
  const { rowO: RO, colO: CO, colBox: CB, colK: K } = cfg;
  const RC = (v: number[], z = 0) => toW(RO, v, z);
  const CC = (v: number[], z = 0) => toW(CO, v, z, K);
  panel(host, RO, cfg.rowBox, '<b>Rows</b> · each equation is a line');
  const colCap = panel(host, CO, CB, '', K);
  const planes = new PlaneSet(host, { n: 2, rows: cfg.rows, box: cfg.rowBox, showSolution: false, focus: start, colors: TWIN_ROW_COLORS });
  planes.root.position.set(RO[0], RO[1], 0);
  const rowDot = new Dot(RC(start, 0.05), { color: C.result, size: 0.13, glow: 2 });
  const rowTag = new Label('', [0, 0, 0], { className: 'c08-pt off', offset: [0, -24] });
  rowDot.group.add(rowTag.object);
  host.onDispose(() => rowTag.dispose());
  // columns: faint single arrows, then x copies of green and y copies of red, tip to tail
  const a1 = new Arrow(CC([0, 0]), CC([1, 0]), { color: C.v, opacity: 0.4, width: 0.03, label: '$\\mathbf a_1$' });
  const a2 = new Arrow(CC([0, 0]), CC([0, 1]), { color: C.w, opacity: 0.4, width: 0.03, label: '$\\mathbf a_2$' });
  const g1 = new Arrow(CC([0, 0]), CC([1, 1]), { color: C.v, width: 0.055 });
  const g2 = new Arrow(CC([1, 1]), CC([1, 1]), { color: C.w, width: 0.055 });
  const pad = new Pad(st, CC([0, 0]), { color: '#9fd8ff', radius: 0.3 });
  const tipDot = new Dot(CC([0, 0], 0.05), { color: C.result, size: 0.13, glow: 2 });
  const eqn = new Label('', toW(CO, [(CB[0] + CB[2]) / 2, CB[1]], 0, K).map((x, i) => (i === 1 ? x - 0.6 : x)) as V3, { className: 'c08-eqn' });
  host.add(a1, a2, g1, g2, pad, rowDot, tipDot, eqn);
  const cols = () => [[tw.rows[0][0], tw.rows[1][0]], [tw.rows[0][1], tw.rows[1][1]]];
  const b = () => [tw.rows[0][2], tw.rows[1][2]];
  const tw: Twin = {
    xy: start.slice(), rows: cfg.rows.map((r) => r.slice()), cfg, rowDot, tipDot, pad, planes, eqn,
    tip: () => add(scale(cols()[0], tw.xy[0]), scale(cols()[1], tw.xy[1])),
    weights(q: number[]) {
      const [[a, c], [bb, d]] = cols();
      const D = a * d - c * bb;
      if (Math.abs(D) < 1e-12) return null;
      return [(q[0] * d - c * q[1]) / D, (a * q[1] - bb * q[0]) / D];
    },
    setRows(rows: Aug) {
      tw.rows = rows.map((r) => r.slice());
      void planes.setRows(rows, 0);
      const [c1, c2] = cols();
      a1.set(CC([0, 0]), CC(c1)); a2.set(CC([0, 0]), CC(c2));
      pad.at(CC(b(), 0));
      colCap.set(`<b>Columns</b> · mix two arrows to reach ${pt(b())}`);
      tw.set(tw.xy);
    },
    set(xy: number[]) {
      tw.xy = xy.slice();
      planes.setAvoid([xy]);
      const [x] = xy;
      rowDot.at(RC(xy, 0.05));
      const m1 = scale(cols()[0], x), tip = tw.tip();
      g1.set(CC([0, 0], 0.01), CC(m1, 0.01));
      g2.set(CC(m1, 0.01), CC(tip, 0.01));
      tipDot.at(CC(tip, 0.05));
      const both = onAll(tw.rows, xy, 0.02);
      rowTag.set(pt(xy));
      rowTag.el.classList.toggle('off', !both);
      tw.rows.forEach((r, i) => planes.setGlow(i, distToRow(r, xy) <= 0.02 ? 1 : 0));
      const [c1, c2] = cols();
      eqn.set(`<span style="color:${C.v}">${num(xy[0])}·${pt(c1)}</span> + <span style="color:${C.w}">${num(xy[1])}·${pt(c2)}</span> = <span style="color:${C.result}">${pt(tip)}</span>`);
    },
  };
  tw.setRows(cfg.rows);
  return tw;
}

export const p1: PuzzleDef = {
  id: 'c08-p1',
  title: 'Where do the two lines meet?',
  goal: 'Find the one point on **both lines**. Drag the yellow point on the left, or the yellow tip on the right: they move together. The tip must land on the ring at (5, 1).',
  hints: [
    'On the left, slide the point along the blue line, x + y = 5, until it also touches the violet line, x − y = 1.',
    'On the right, the tip is x of the green arrow plus y of the red arrow. Across: x + y = 5. Up: x − y = 1.',
    'The point is (3, 2): 3 of the green arrow and 2 of the red arrow reach (5, 1).',
  ],
  par: 2,
  view: '2d',
  onWin: S.p1Win,
  setup(p) {
    p.g.stage.view2D({ center: [-0.5, 0.7], height: 14, ms: 0 });
    const tw = drawTwin(p, [1, 0]);
    const tol = winTol(diff(p));
    const step = () => p.snap();
    const snapW = (v: number[]) => { const s = step(); return s ? v.map((x) => Math.round(x / s) * s) : v; };
    const { rowO: RO, colO: CO, rowBox: RB } = P1_TWIN;
    const clampRow = (v: number[]) => [Math.max(RB[0], Math.min(RB[2], v[0])), Math.max(RB[1], Math.min(RB[3], v[1]))];
    let won = false;
    const check = () => {
      if (won || !p1Won(tw.xy, tol)) return;
      won = true;
      void tw.pad.hit();
      sfx.success();
      p.win();
    };
    const hit = (d: Dot) => { const m = new Mesh(new SphereGeometry(0.42, 12, 8), new MeshBasicMaterial({ visible: false })); d.group.add(m); p.onDispose(() => { m.geometry.dispose(); m.material.dispose(); }); return m; };
    const rowHit = hit(tw.rowDot), tipHit = hit(tw.tipDot);
    const h1 = p.g.drag.add({
      target: rowHit, getPos: () => new Vector3(...toW(RO, tw.xy)), snap: () => null,
      constrain: (q) => { const v = snapW(clampRow([q.x - RO[0], q.y - RO[1]])); return new Vector3(...toW(RO, v)); },
      onMove: (q) => { tw.set([q.x - RO[0], q.y - RO[1]]); sfx.tick(q.y); },
      onEnd: () => { p.move(); check(); },
    });
    const h2 = p.g.drag.add({
      target: tipHit, getPos: () => new Vector3(...toW(CO, p1Tip(tw.xy[0], tw.xy[1]))), snap: () => null,
      constrain: (q) => { const w = snapW(clampRow(p1Weights([q.x - CO[0], q.y - CO[1]]))); return new Vector3(...toW(CO, p1Tip(w[0], w[1]))); },
      onMove: (q) => { tw.set(p1Weights([q.x - CO[0], q.y - CO[1]])); sfx.tick(q.y); },
      onEnd: () => { p.move(); check(); },
    });
    p.onDispose(() => { h1.remove(); h2.remove(); });
    if (diff(p) === 'commander') {
      const inp = placeInput(p, 'Point (x, y)', 2, tw.xy, (v) => { tw.set(v); check(); });
      p.dock().append(inp.el, h('div', { class: 'c08-hint' }, 'No snapping on Commander: type the exact point.'));
    }
    return {
      async showMe() {
        const from = tw.xy.slice();
        await animate(1100, (k) => tw.set(add(from, scale(sub(P1.answer, from), k))), ease.inOut);
        tw.set(P1.answer);
        check();
      },
      solve() { tw.set(P1.answer); check(); },
      wrong() { tw.set([5, 1]); check(); },
    };
  },
};

// ------------------------------------------------------------------ p2: find the pod

export const p2: PuzzleDef = {
  id: 'c08-p2',
  title: 'Where is Teo\'s pod?',
  goal: 'Move the marker until it sits on **all three planes**. Each plane lights up when the marker is on it.',
  predict: {
    prompt: 'Three slanted planes. How many points sit on all three?',
    choices: [{ id: 'one', text: 'One point' }, { id: 'line', text: 'A whole line of points' }, { id: 'none', text: 'None' }],
    answer: 'one',
    reveal: 'One. The white lines, where each pair of planes meets, all cross at a single point: $(5, 3, -2)$.',
  },
  hints: [
    'The white lines show where each pair of planes meets. The pod is where they cross.',
    'The red plane, $2y + 5z = -4$, has no $x$ in it. Try $z = -2$: then $2y = 6$.',
    'The pod is at (5, 3, −2).',
  ],
  par: 4,
  view: '3d',
  onWin: S.p2Win,
  setup(p) {
    const d = diff(p);
    const planes = new PlaneSet(p, { n: 3, rows: P2.rows, showSolution: false, solutionLabel: false, size: 9, focus: P2.pod });
    void planes.frame({ distance: 23 });
    const off = offReadout(p, 'How far off each equation is', P2.rows);
    let won = false;
    const update = (x: number[]) => {
      const n = glowPlanes(planes, P2.rows, x, glowTol(d));
      off(x, glowTol(d));
      marker.setColor(n === 3 ? C.result : '#e8f1ff');
    };
    const check = (x: number[]) => {
      if (won || !p2Won(x, glowTol(d))) return; // the distance at which the planes light: lit on all three always wins
      won = true;
      planes.showSolution(true);
      sfx.success();
      p.win();
    };
    const marker = new Marker3D(p, { pos: P2.start, onMove: update, onEnd: check });
    const inp = placeInput(p, 'Marker (x, y, z)', 3, P2.start, (v) => { marker.set(v); update(v); check(v); });
    p.dock().append(inp.el, h('div', { class: 'c08-hint' }, 'Drag the marker across. Hold Shift and drag to move it up or down. Or type the point and press Enter.'));
    update(marker.pos);
    return {
      async showMe() { await marker.moveTo(P2.pod, 1400); inp.set(P2.pod); },
      solve() { marker.set(P2.pod); update(P2.pod); check(P2.pod); },
      wrong() { marker.set([5, 3, 0]); update([5, 3, 0]); check([5, 3, 0]); },
    };
  },
};

// ------------------------------------------------------------------ p3 [D]: never two

const P3_TILES = [
  { id: 'a', text: 'At A, each equation reads its own right side.' },
  { id: 'b', text: 'At B, each equation reads its own right side.' },
  { id: 'step', text: 'Walking from A towards B, each equation\'s reading changes by the same amount every step.' },
  { id: 'zero', text: 'That amount is (right side − right side) per whole step from A to B: zero.' },
  { id: 'line', text: 'So every point on the line through A and B is on every plane.' },
];
const P3_DECOYS = [{ id: 'mid', text: 'Only the point halfway between A and B is checked, so only it counts.' }];

export const p3: PuzzleDef = {
  id: 'c08-p3',
  title: 'Can there be exactly two?',
  goal: 'Wren says exactly two spots sit on all three planes. Put markers **A** and **B** on all three planes, at two different spots. Then slide **C** along the line through them.',
  subgoals: ['A on all three planes', 'B on all three planes, somewhere else', 'C between A and B, and beyond them, still on every plane', 'Say why, in numbers'],
  hints: [
    'The three planes share one line: the bright white line. Any point on it is on all three planes.',
    'Try A = (1, 0, 2) and B = (2, 1, 0). Then slide C with the dial.',
    'Every point A + t(B − A) is on every plane: each equation reads 3 + t(3 − 3) = 3 on plane 1, and the same on the others.',
  ],
  par: P3_PAR,
  view: '3d',
  onWin: S.p3Win,
  setup(p) {
    const d = diff(p);
    const tol = glowTol(d); // the distance at which the markers light: '✓ all 3' always ticks the subgoal
    const planes = new PlaneSet(p, { n: 3, rows: P3.rows, showSolution: false, size: 8, focus: [1, 0, 2] });
    void planes.frame({ distance: 22 });
    const done = [false, false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; p.subgoal(i); } if (done.every(Boolean)) { sfx.success(); p.win(); } };
    const r = p.readout('Markers');
    let phase: 'place' | 'slide' | 'why' = 'place';
    const seen = new Set<string>();
    let t = 0.5;
    const markers: Marker3D[] = [];
    const paint = () => {
      const [A, B] = markers.map((m) => m.pos);
      const onA = onAll(P3.rows, A, tol), onB = onAll(P3.rows, B, tol);
      markers[0].setColor(onA ? C.result : '#e8f1ff');
      markers[1].setColor(onB ? C.result : '#e8f1ff');
      r.row('a', 'A', `${pt(A)}${onA ? ' ✓ all 3' : ''}`, onA ? C.result : undefined);
      r.row('b', 'B', `${pt(B)}${onB ? ' ✓ all 3' : ''}`, onB ? C.result : undefined);
      if (phase !== 'place') {
        const Cp = p3C(A, B, t);
        r.row('c', 'C', `${pt(Cp)} ${onAll(P3.rows, Cp, 4 * tol) ? '✓ all 3' : 'off'}`, C.result);
        r.row('t', 'C = A + t(B − A)', `t = ${num(t)}`);
      }
    };
    const placed = () => {
      const [A, B] = markers.map((m) => m.pos);
      if (onAll(P3.rows, A, tol)) tick(0);
      if (p3Pair(A, B, tol)) { tick(1); if (phase === 'place') startSlide(); }
      paint();
    };
    markers.push(new Marker3D(p, { pos: P3.startA, name: 'A', onMove: paint, onEnd: placed }));
    markers.push(new Marker3D(p, { pos: P3.startB, name: 'B', onMove: paint, onEnd: placed }));
    const iA = placeInput(p, 'A (x, y, z)', 3, P3.startA, (v) => { markers[0].set(v); placed(); });
    const iB = placeInput(p, 'B (x, y, z)', 3, P3.startB, (v) => { markers[1].set(v); placed(); });
    const dock = p.dock();
    dock.append(iA.el, iB.el, h('div', { class: 'c08-hint' }, 'Drag a marker across; hold Shift to drag it up or down. Or type a point and press Enter.'));
    // C, on the line through A and B
    let cDot: Dot | null = null;
    let slider: Slider | null = null;
    const moveC = (nt: number) => {
      t = nt;
      const [A, B] = markers.map((m) => m.pos);
      const Cp = p3C(A, B, t);
      cDot?.at([Cp[0], Cp[1], Cp[2]]);
      glowPlanes(planes, P3.rows, Cp, 4 * tol);
      const reg = p3Region(t);
      if (reg && onAll(P3.rows, Cp, 4 * tol)) seen.add(reg);
      paint();
      if (phase === 'slide' && p3SweepDone(seen)) { tick(2); startWhy(); }
    };
    let guide: FatLine | null = null;
    function startSlide(): void {
      phase = 'slide';
      markers.forEach((m) => m.setDraggable(false));
      const [A, B] = markers.map((m) => m.pos);
      const a = p3C(A, B, -1.6), b = p3C(A, B, 2.6);
      guide = new FatLine(p.g.stage, [[a[0], a[1], a[2]], [b[0], b[1], b[2]]], { color: C.result, width: 1.6, opacity: 0.55, dashed: true });
      p.add(guide.object);
      p.onDispose(() => guide?.dispose());
      cDot = new Dot([0, 0, 0], { color: C.result, size: 0.16, glow: 2.4, label: 'C' });
      p.add(cDot);
      // one move per gesture (a drag fires many input events); startWhy may remove the slider mid-drag
      let counted = false;
      slider = new Slider({ label: 'slide C: $t$', min: -1.5, max: 2.5, step: 0.05, value: 0.5, onInput: (x) => { if (!counted) { p.move(); counted = true; } moveC(x); } });
      for (const ev of ['change', 'pointerup']) slider.el.addEventListener(ev, () => { counted = false; });
      dock.replaceChildren(slider.el, h('div', { class: 'c08-hint' }, 't = 0 is A, t = 1 is B. Go between them, then past them.'));
      moveC(0.5);
      p.bark('lantern', 'Marker C rides the line through A and B. Slide it.');
    }
    let ws: StepWorksheet | null = null;
    let tiles: TileOrder | null = null;
    function startWhy(): void {
      phase = 'why';
      if (d === 'cadet') { tick(3); return; }
      const [A, B] = markers.map((m) => m.pos);
      const rA = residuals([P3.rows[0]], A)[0] + 3, rB = residuals([P3.rows[0]], B)[0] + 3;
      const steps = [
        { prompt: `Plane 1 reads $x + y + z$. At A ${pt(A)} it reads`, answer: rA },
        { prompt: `At B ${pt(B)} it reads`, answer: rB },
        { prompt: 'At $A + t(B - A)$ it reads $3 + t(3 - 3)$. For every $t$, that is', answer: 3, mistakes: [[0, 'That is the change, $t(3 - 3)$. Add it to the 3 you start with.']] as [number, string][] },
      ];
      if (d === 'navigator') {
        ws = new StepWorksheet(p, { title: 'Why, in numbers · each step is checked', steps, onDone: () => tick(3), mount: dock });
        dock.replaceChildren(ws.el);
      } else {
        const last = { prompt: 'Plane 2 reads $x - y$. At $A + 5(B - A)$ it reads', answer: 1 };
        let ordered = false, typed = false;
        const msg = h('div', { class: 'c09-msg' });
        ws = new StepWorksheet(p, { title: 'The last line', steps: [last], onDone: () => { typed = true; if (ordered) tick(3); }, mount: h('div') });
        tiles = new TileOrder(p, {
          tiles: P3_TILES, decoys: P3_DECOYS, title: 'Put the reasons in order', submitLabel: 'Check order', mount: h('div'),
          onSubmit: (o) => {
            p.move();
            if (p3OrderOk(o)) { ordered = true; msg.className = 'c09-msg good'; msg.textContent = 'That is the argument.'; sfx.snap(); if (typed) tick(3); }
            else { msg.className = 'c09-msg bad'; msg.textContent = o.includes('mid') ? 'The halfway point is one point on the line. The argument covers every point.' : 'Not in that order. Start from what is true at A and B.'; sfx.miss(); }
          },
        });
        dock.replaceChildren(tiles.el, msg, ws.el);
      }
    }
    paint();
    const solveAll = async (ms: number) => {
      if (phase === 'place') {
        if (ms) await Promise.all([markers[0].moveTo([1, 0, 2], ms), markers[1].moveTo([2, 1, 0], ms)]);
        else { markers[0].set([1, 0, 2]); markers[1].set([2, 1, 0]); }
        iA.set([1, 0, 2]); iB.set([2, 1, 0]);
        placed();
      }
      if (phase === 'slide') {
        for (const target of [0.5, 2.2, -0.8, 0.5]) {
          if (phase !== 'slide') break;
          const from = t;
          if (ms) await animate(ms * 0.7, (k) => { const v = from + (target - from) * k; slider?.set(v, false); moveC(v); }, ease.inOut);
          else { slider?.set(target, false); moveC(target); }
        }
      }
      if (phase === 'why' && !done[3]) {
        if (tiles) { tiles.set(P3_TILES.map((x) => x.id)); (tiles.el.querySelector('.btn.primary') as HTMLButtonElement | null)?.click(); }
        if (ws) { if (ms) await ws.showMe(300); else ws.solve(); }
      }
    };
    return {
      showMe: () => solveAll(800),
      solve: () => solveAll(0),
      wrong() { markers[0].set([1, 0, 2]); markers[1].set([1, 0, 2]); placed(); },
    };
  },
};

// ------------------------------------------------------------------ p4: the prism

export const p4: PuzzleDef = {
  id: 'c08-p4',
  title: 'What if the planes never all meet?',
  goal: 'Change the last right side from **4** to **5**. Then turn the view to look straight down the three white lines.',
  subgoals: ['The last right side is 5', 'Look straight down the three white lines'],
  predict: {
    prompt: 'The three planes share a line. Change the last right side from 4 to 5. Where will all three meet?',
    choices: [{ id: 'point', text: 'At one point' }, { id: 'line', text: 'Along a line' }, { id: 'none', text: 'Nowhere' }],
    answer: 'none',
    reveal: 'Nowhere. Plane 3 slides off the shared line. Each pair of planes still meets in a line, but the three lines run side by side. The three planes form a tube with no point on all three.',
  },
  hints: [
    'Use the + button next to plane 3. Watch the bright line split into three.',
    'Drag on empty space to turn the view. Turn until the three white lines shrink to three dots.',
    'The lines run along (1, 1, −2). Look from above and to the side, along that direction: press Show me to see the view.',
  ],
  par: 3,
  view: '3d',
  onWin: S.p4Win,
  setup(p) {
    let b3 = 4;
    const rowsFor = (b: number): Aug => [P3.rows[0], P3.rows[1], [2, 0, 1, b]];
    const planes = new PlaneSet(p, { n: 3, rows: rowsFor(4), showSolution: false, size: 8, focus: [1, 0, 2] });
    void planes.frame({ distance: 22, azimuth: -40, elevation: 18 });
    const stage = p.g.stage;
    const tri = new FatLine(stage, [[0, 0, 0], [1, 0, 0]], { color: '#e8f1ff', width: 1.6, opacity: 0, dashed: true, dashSize: 0.16, gapSize: 0.1 });
    p.add(tri.object);
    p.onDispose(() => tri.dispose());
    const done = [false, false];
    const sv = h('span', { class: 'sv' }, '4');
    const setB = (b: number) => {
      b3 = Math.max(2, Math.min(7, b));
      sv.textContent = String(b3);
      void planes.setRows(rowsFor(b3), 600);
      eq.innerHTML = `Plane 3: &nbsp;2x + z = <b>${b3}</b>`;
      if (b3 === 5 && !done[0]) { done[0] = true; p.subgoal(0); }
      triangle();
    };
    const triangle = () => {
      if (b3 === 4) { tri.setOpacity(0); return; }
      // the three lines where pairs meet, cut by the plane through the focus at a right angle to them
      const rows = rowsFor(b3);
      const dir = P4.dir, f = [1, 0, 2];
      const pts: V3[] = [];
      for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) {
        // solve rows i, j plus dir · x = dir · f
        const M = [rows[i], rows[j], [...dir, dir[0] * f[0] + dir[1] * f[1] + dir[2] * f[2]]];
        const x = solve3(M);
        if (x) pts.push([x[0], x[1], x[2]]);
      }
      if (pts.length === 3) { tri.setPoints([...pts, pts[0]]); tri.setOpacity(0.7); }
    };
    const ELEV = (Math.asin(2 / Math.sqrt(6)) * 180) / Math.PI;
    const minus = h('button', { class: 'btn small', type: 'button', onclick: () => { p.move(); setB(b3 - 1); } }, '−');
    const plus = h('button', { class: 'btn small', type: 'button', onclick: () => { p.move(); setB(b3 + 1); } }, '+');
    const eq = h('span', { html: 'Plane 3: &nbsp;2x + z = <b>4</b>' });
    p.dock().append(h('div', { class: 'c10-step', style: `color:${C.u}` }, eq, minus, sv, plus),
      h('div', { class: 'c08-hint' }, 'Drag on empty space to turn the view.'));
    let held = 0;
    const aligned = () => {
      const cam = stage.camera.position.clone().sub(stage.target);
      return lookingDown([cam.x, cam.y, cam.z]);
    };
    const winNow = () => {
      if (done[1]) return;
      done[1] = true; p.subgoal(1); sfx.success();
      // the cross-section: a bright triangle, the planes dimmed around it (moving closer only widens the walls)
      tri.setColor('#ffd166', 1.6);
      tri.material.linewidth = 3.2;
      planes.setFade(0.55);
      p.win();
    };
    p.tick((dt) => {
      if (done[1] || b3 !== 5) return;
      if (aligned()) { held += dt; if (held > 0.35) winNow(); } else held = 0;
    });
    const lookDown = async (ms: number) => {
      // camera on the line through the focus along −(1, 1, −2): azimuth −135°, elevation asin(2/√6)
      await stage.view3D({ target: [1, 0, 2], distance: 20, azimuth: -135, elevation: ELEV, ms });
    };
    return {
      async showMe() { if (b3 !== 5) { setB(5); await wait(700); } await lookDown(1600); await wait(500); if (aligned()) winNow(); },
      async solve() { if (b3 !== 5) setB(5); await lookDown(0); if (aligned()) winNow(); },
      wrong() { setB(4); },
    };
  },
};

/** Solve a 3 × 3 system [A | b] (numbers) by Cramer's rule; null when singular. */
function solve3(M: number[][]): number[] | null {
  const det = (a: number[][]) => a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  const A = M.map((r) => r.slice(0, 3)), b = M.map((r) => r[3]);
  const D = det(A);
  if (Math.abs(D) < 1e-12) return null;
  return [0, 1, 2].map((k) => det(A.map((r, i) => r.map((x, j) => (j === k ? b[i] : x)))) / D);
}

// ------------------------------------------------------------------ p5 [H]: from words to planes

export const p5: PuzzleDef = {
  id: 'c08-p5',
  title: 'What is in the ballast tanks?',
  goal: 'Turn each rule into an equation in $x$, $y$, $z$ (tonnes in tanks A, B, C). Each one you get right appears as a plane. Then read the same numbers down the columns, and set the three columns side by side.',
  hints: [
    '“B holds 1 more than A” is $y = x + 1$. Move $x$ to the left: $-x + y = 1$.',
    '“C holds 2 more than B” is $z = y + 2$, so $-y + z = 2$.',
    'The rows are (1, 1, 1 | 13), (−1, 1, 0 | 1), (0, −1, 1 | 2). The columns are (1, −1, 0), (1, 1, −1), (1, 0, 1). Side by side, the columns give back the rows.',
  ],
  par: 7,
  view: '3d',
  onWin: S.p5Win,
  setup(p) {
    const planes = new PlaneSet(p, { n: 3, rows: P5.rows, showSolution: false, size: 9, focus: P5.answer });
    P5.rows.forEach((_, i) => planes.setRowVisible(i, false));
    void planes.frame({ distance: 26 });
    const r = p.readout('The logbook rules');
    r.note('**Rule 1** · Together the tanks hold **13** tonnes.\n\n**Rule 2** · Tank B holds **1** tonne more than tank A.\n\n**Rule 3** · Tank C holds **2** tonnes more than tank B.');
    const steps = P5_STEPS;
    let shown = 0;
    const ws = new StepWorksheet(p, { steps, onDone: () => { reveal(3); sfx.success(); p.win(); } });
    ws.el.classList.add('c08-tanks'); // seven steps, the last a 3 × 3 grid: keep it short enough to clear the goal card
    const reveal = (n: number) => {
      for (let i = shown; i < Math.min(3, n); i++) { planes.setRowVisible(i, true); sfx.snap(); }
      if (n >= 3 && shown < 3) {
        planes.showSolution(true);
        window.setTimeout(() => planes.placeLabels(), 60);
        p.bark('lantern', 'All three planes meet at (3, 4, 6). Tanks A, B and C: 3, 4 and 6 tonnes.');
      }
      shown = Math.max(shown, Math.min(3, n));
    };
    // on Commander only the last step is checked, so reveal a plane once its row is typed right
    p.tick(() => {
      const rows = [...ws.el.querySelectorAll('.ws-row')].slice(0, 3);
      let n = 0;
      for (const [i, row] of rows.entries()) {
        const vals = [...row.querySelectorAll('input')].map((x) => Number((x as HTMLInputElement).value.replace('−', '-')));
        const want = (steps[i].answer as number[][])[0];
        if (row.classList.contains('ok') || (vals.length === 3 && vals.every((v, k) => v === want[k]))) n = i + 1; else break;
      }
      if (n > shown) reveal(n);
    });
    return {
      async showMe() { await ws.showMe(500); },
      solve() { ws.solve(); },
      wrong() { ws.wrong(); },
    };
  },
};

export { glowPlanes };
