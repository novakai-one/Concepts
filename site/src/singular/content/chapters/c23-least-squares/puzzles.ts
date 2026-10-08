// Chapter 23 puzzles 1–4: drag the line, see the right angle in data space [D], five readings by hand [H],
// and the curve through every reading.
import { Vector3 } from 'three';
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { Arrow } from '../../../gfx/arrow';
import { FitLine } from '../../../kit/data';
import { Knob } from '../../../kit/geom';
import { StepWorksheet, TileOrder, type Step } from '../../../kit/steps';
import { h, button } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { sfx } from '../../../audio/sfx';
import { dot, vsub } from '../../../math/la';
import { DropPlane } from '../c21-projection/drop';
import { MiniBoard } from './board';
import {
  P1_BEST, P1_FIT, P1_PTS, P2_ATA, P2_ATB, P2_B, P2_ONES, P2_R, P2_T, P2_TS, P2_X, P3_ATA, P3_ATB, P3_AREA, P3_FIT, P3_PTS,
  P4_BEST, P4_CURVE10, P4_FIT, P4_HANDLE_T, P4_HOUR, P4_PTS, P4_TARGET, area, curve5, fmtN, hourAt, lineTex, p1Won, p2Won, p4Near, p4Won,
  throughCount,
} from './logic';
import { S } from './script';
import '../c21-projection/c21.css';

export const v3 = (v: readonly number[], z = 0): V3 => [v[0], v[1], v[2] ?? z];
export const tag = (p: PuzzleCtx, text: string, at: V3, cls = '', offset: [number, number] = [0, -22]) => {
  const l = new Label(text, at, { className: `a8-pt ${cls}`, offset });
  p.add(l);
  return l;
};
const lineText = (c0: number, c1: number) => lineTex(c0, c1);

// ------------------------------------------------------------------ p1 Drag the line

export const p1: PuzzleDef = {
  id: 'c23-p1',
  title: 'Which line is wrong by the least?',
  goal: 'Four readings of one drone’s drift. Drag the two yellow handles. Each reading’s leftover is drawn as a square: make their **total area** as small as it goes.',
  predict: {
    prompt: 'Will the best line pass through any of the four readings?',
    choices: [{ id: 'two', text: 'Through at least two' }, { id: 'one', text: 'Through one' }, { id: 'none', text: 'Maybe through none' }],
    answer: 'none',
    reveal: 'Through none. The best line is $y = 0.9 + 0.9t$: it misses every reading a little, so that the total area of the squares is smallest (0.7).',
  },
  hints: [
    'A line through two readings leaves big squares at the others. Spread the misses out.',
    'At the best line, the leftovers above it and below it add to the same total length (not the same area). That is true for every line through the average reading $(1.5, 2.25)$. Keep the line through that point and tilt it until the total area stops shrinking.',
    'The best line is $y = 0.9 + 0.9t$: through $(0, 0.9)$ and $(3, 3.6)$.',
  ],
  par: 4,
  onWin: S.p1Win,
  setup(p) {
    p.grid();
    void p.g.stage.view2D({ center: [1.6, 3.2], height: 7.2, ms: 0 });
    const d = p.difficulty;
    const r = p.readout('The fit board');
    let ghost: FatLine | null = null;
    let done = false;
    const upd = () => {
      r.row('line', 'line', lineText(fl.c, fl.m), C.result);
      r.row('area', 'total square area', fmtN(fl.ssr, 3), fl.ssr <= P1_BEST * 1.01 ? C.good : C.white);
      if (d !== 'commander') { const over = (fl.ssr / P1_BEST - 1) * 100; r.row('gap', 'above the smallest by', `${over < 0.05 ? '0' : over.toFixed(over < 10 ? 1 : 0)}%`, over <= 1 ? C.good : C.orange); }
    };
    const fl: FitLine = new FitLine(p, {
      points: P1_PTS, m: 0, c: 2.25, squares: true, handleX: [0, 3],
      onChange: () => upd(),
      onCommit: (m, c) => {
        upd();
        if (d === 'cadet' && !ghost) {
          ghost = new FatLine(p.g.stage, [[-5, P1_FIT[0] - 5 * P1_FIT[1], 0.005], [8, P1_FIT[0] + 8 * P1_FIT[1], 0.005]], { color: C.result, width: 1.4, opacity: 0.35, dashed: true, dashSize: 0.12, gapSize: 0.1 });
          p.add(ghost);
          p.bark('lantern', 'The dashed line is the best one. Put yours on it.');
        }
        if (!done && p1Won(c, m)) {
          done = true;
          fl.setDraggable(false);
          r.note(`Smallest total area: 0.7. The best line passes through ${throughCount(P1_PTS, P1_FIT[0], P1_FIT[1])} of the four readings.`);
          p.win();
        }
      },
    });
    upd();
    return {
      async showMe() { await fl.showBest(1200); },
      solve() { fl.set(P1_FIT[1], P1_FIT[0]); upd(); if (!done && p1Won(fl.c, fl.m)) { done = true; fl.setDraggable(false); p.win(); } },
      wrong() { fl.set(1, 1); },
    };
  },
};

// ------------------------------------------------------------------ p2 [D] See the right angle (twin view)

export const p2: PuzzleDef = {
  id: 'c23-p2',
  title: 'Where is the right angle in a best fit?',
  goal: 'Readings 1, 2, 4 at $t = 0, 1, 2$ make one arrow $\\cg{\\mathbf b} = (1, 2, 4)$ in data space. Every line $y = c_0 + c_1 t$ makes a point $c_0(1, 1, 1) + c_1(0, 1, 2)$ on the blue plane. Find the point of the plane nearest $\\mathbf b$. The board shows the matching line.',
  hints: [
    'The total square area on the board is the squared length of the dashed leftover in data space. Shorten the leftover.',
    'At the nearest point the leftover reads 0 against both columns: $A^{\\mathsf T}(\\mathbf b - A\\hat{\\mathbf x}) = \\mathbf 0$, so $A^{\\mathsf T}A\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b$.',
    '$A^{\\mathsf T}A = \\begin{bmatrix} 3 & 3 \\\\ 3 & 5 \\end{bmatrix}$, $A^{\\mathsf T}\\mathbf b = (7, 10)$, so $\\hat{\\mathbf x} = (5/6, 3/2)$: the point $(5/6, 7/3, 23/6)$.',
  ],
  par: 4,
  view: '3d',
  onWin: S.p2Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [0.9, 1.2, 2.0], distance: 12.5, azimuth: 90, elevation: 35, ms: 0 });
    p.grid({ base: 0.1, main: 0.2, axis: 0.45 });
    const d = p.difficulty;
    const tol = d === 'commander' ? 0.01 : 0.05;
    const bA = new Arrow([0, 0, 0], v3(P2_B), { color: C.v, label: '$\\mathbf b$' });
    p.add(bA);
    tag(p, 'data space', [-1.8, 0, 0.3], 'dim');
    const board = new MiniBoard({ pts: P2_TS.map((t, i) => [t, P2_B[i]]), tRange: [-0.2, 2.3], yRange: [-0.5, 4.6], title: 'The same line, on the readings' });
    const r = p.readout('Twin view');
    let done = false;
    const show = (w: [number, number], q: V3) => {
      board.set(w[0], w[1]);
      const left = vsub(P2_B, q);
      r.row('line', 'line', lineText(w[0], w[1]), C.result);
      r.row('area', 'total square area', fmtN(area(P2_TS.map((t, i) => [t, P2_B[i]]), w[0], w[1]), 3));
      r.row('len', 'leftover length squared', fmtN(dot(left, left), 3));
      r.row('d1', 'leftover $\\cdot\\,(1, 1, 1)$', fmtN(dot(left, P2_ONES), 3), Math.abs(dot(left, P2_ONES)) < 1e-6 ? C.good : C.white);
      r.row('d2', 'leftover $\\cdot\\,(0, 1, 2)$', fmtN(dot(left, P2_T), 3), Math.abs(dot(left, P2_T)) < 1e-6 ? C.good : C.white);
    };
    const finish = () => {
      if (done) return;
      done = true;
      dp.set([P2_X[0], P2_X[1]]); dp.setEnabled(false); show(dp.w, dp.p);
      r.note('The best line is the nearest point of the plane. Its leftover is perpendicular to both columns: $A^{\\mathsf T}(\\mathbf b - A\\hat{\\mathbf x}) = \\mathbf 0$.');
      p.win();
    };
    // Navigator and Commander win in the worksheet: reaching the foot points there instead of going quiet
    let pointed = false;
    const dp = new DropPlane(p, {
      a: [1, 1, 1], b: [0, 1, 2], target: v3(P2_B), w0: [2, 0], step: d === 'commander' ? null : 1 / 6, magnet: d === 'cadet' ? 0.25 : 0, range: 3, size: 6, center: [0.6, 1.5, 2.4],
      labels: ['$(1, 1, 1)$', '$(0, 1, 2)$'],
      onMove: (w, q) => show(w, q),
      onEnd: (w) => {
        if (!p2Won(w, tol)) return;
        if (d === 'cadet') { finish(); return; }
        if (done || pointed) return;
        pointed = true;
        p.bark('lantern', d === 'navigator'
          ? 'There is the right angle: the leftover reads 0 against both columns. Write those two zeros out in the worksheet.'
          : 'There is the right angle. Now put the steps from it to the formula in order.');
      },
    });
    p.dock().append(board.el);
    show(dp.w, dp.p);
    let ws: StepWorksheet | null = null;
    let tiles: TileOrder | null = null;
    // Navigator: the player builds the normal equations from the right angle, one column at a time
    const STEPS: Step[] = [
      { prompt: 'The leftover $\\mathbf b - A\\mathbf x$, with $\\mathbf x = (c_0, c_1)$, reads 0 against $(1, 1, 1)$: $\\_\\,c_0 + \\_\\,c_1 = \\_$', answer: [[...P2_ATA[0], P2_ATB[0]]],
        mistakes: [[[[3, 3, 0]], 'The 0 is the whole leftover read against $(1, 1, 1)$. Move the $\\mathbf b$ part to the right: $1 + 2 + 4$.'], [[[-3, -3, -7]], 'Right equation, times $-1$. Write it with positive numbers.']] },
      { prompt: 'It reads 0 against $(0, 1, 2)$: $\\_\\,c_0 + \\_\\,c_1 = \\_$', answer: [[...P2_ATA[1], P2_ATB[1]]],
        mistakes: [[[[3, 5, 0]], 'Move the $\\mathbf b$ part to the right: $0 \\cdot 1 + 1 \\cdot 2 + 2 \\cdot 4$.'], [[[-3, -5, -10]], 'Right equation, times $-1$. Write it with positive numbers.']] },
      { prompt: 'Those two rows are $A^{\\mathsf T}A\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b$. Solve: $\\hat{\\mathbf x}$', answer: [P2_X] },
      { prompt: 'leftover $\\mathbf b - A\\hat{\\mathbf x}$', answer: [P2_R] },
    ];
    // Commander: the tiles derive the formula; the last line solves it
    const LAST = { prompt: '$\\hat{\\mathbf x}$ from $A^{\\mathsf T}A\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b$', answer: [P2_X] };
    const last = () => { tiles?.el.remove(); tiles = null; ws = new StepWorksheet(p, { title: 'The last line', steps: [LAST], onDone: finish }); };
    if (d === 'cadet') {
      p.setGoal('Drag the yellow point across the blue plane until the dashed leftover to $\\mathbf b$ is as short as it goes. The board shows the line that point stands for.');
    } else if (d === 'navigator') {
      p.setGoal('Drag the yellow point across the blue plane to see the right angle, then type where the formula comes from in the worksheet. The board shows the line that point stands for.');
      ws = new StepWorksheet(p, { title: 'Where the formula comes from · each step is checked', steps: STEPS, onDone: finish });
    } else {
      p.setGoal('Drag the yellow point across the blue plane to see the right angle. Then order the steps from that right angle to the formula, and solve its last line.');
      const TILES = [
        { id: 'point', text: 'Every line makes a point $A\\mathbf x$ of the column space.' },
        { id: 'perp', text: 'The best one is nearest $\\mathbf b$: its leftover $\\mathbf b - A\\hat{\\mathbf x}$ is perpendicular to every column.' },
        { id: 'dots', text: 'One zero per column: $A^{\\mathsf T}(\\mathbf b - A\\hat{\\mathbf x}) = \\mathbf 0$.' },
        { id: 'rearrange', text: 'Rearrange: $A^{\\mathsf T}A\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b$.' },
      ];
      const REF = TILES.map((t) => t.id);
      tiles = new TileOrder(p, {
        title: 'Where the formula comes from: order the steps', tiles: TILES, submitLabel: 'Check order',
        onSubmit: (o) => { p.move(); if (o.join() === REF.join()) last(); else { sfx.miss(); p.bark('lantern', 'That order does not reach the formula. Start from what a line makes in data space.'); } },
      });
    }
    return {
      async showMe() {
        if (d === 'cadet') { await dp.moveTo([P2_X[0], P2_X[1]], 1000); finish(); return; }
        if (!ws) last();
        await ws!.showMe(300); finish();
      },
      solve() {
        if (d === 'cadet') { dp.set([P2_X[0], P2_X[1]]); finish(); return; }
        if (!ws) last();
        ws!.solve(); finish();
      },
      wrong() { if (d === 'cadet') dp.set([1, 1]); else ws?.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p3 [H] Five readings by hand

export const p3: PuzzleDef = {
  id: 'c23-p3',
  title: 'What is the best line through five readings?',
  goal: 'Readings $(0, 1)$, $(1, 3)$, $(2, 2)$, $(3, 5)$, $(4, 4)$. Find the line $y = c_0 + c_1 t$ with the smallest total square area, by hand: $A$ has a column of 1s and a column of $t$.',
  hints: [
    '$A^{\\mathsf T}A = \\begin{bmatrix} n & \\sum t \\\\ \\sum t & \\sum t^2 \\end{bmatrix}$ and $A^{\\mathsf T}\\mathbf b = (\\sum y, \\sum ty)$.',
    '$A^{\\mathsf T}A = \\begin{bmatrix} 5 & 10 \\\\ 10 & 30 \\end{bmatrix}$, $A^{\\mathsf T}\\mathbf b = (15, 38)$. Solve the 2 × 2 system.',
    '$c_0 = 1.4$, $c_1 = 0.8$. The leftovers are $-0.4, 0.8, -1, 1.2, -0.6$; their squares add to 3.6.',
  ],
  par: 5,
  onWin: S.p3Win,
  setup(p) {
    p.grid();
    void p.g.stage.view2D({ center: [0.6, 2.8], height: 7.5, ms: 0 });
    const fl = new FitLine(p, { points: P3_PTS, m: 0, c: 3, squares: false, draggable: false });
    const r = p.readout('The fit board');
    r.eq('A^{\\mathsf T}A\\,\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b');
    let fin: Promise<void> | null = null;
    const finish = () => (fin ??= (async () => {
      r.row('line', 'line', lineText(P3_FIT[0], P3_FIT[1]), C.result);
      r.row('area', 'total square area', fmtN(P3_AREA, 2), C.good);
      p.win();
      fl.showSquares(true);
      await fl.to(P3_FIT[1], P3_FIT[0], 1100);
    })());
    const ws = new StepWorksheet(p, {
      steps: [
        { prompt: '$A^{\\mathsf T}A$', answer: P3_ATA, mistakes: [[[[5, 10], [10, 10]], 'The bottom right is $\\sum t^2 = 0 + 1 + 4 + 9 + 16$.']] },
        { prompt: '$A^{\\mathsf T}\\mathbf b$', answer: [P3_ATB], mistakes: [[[15, 15], 'The second entry is $\\sum t\\,y$, each reading times its time.']] },
        { prompt: 'intercept and slope $(c_0, c_1)$', answer: [P3_FIT] },
        { prompt: 'total square area', answer: P3_AREA, tol: 1e-6, mistakes: [[0, 'Five readings cannot all be on one line here: some area is left.']] },
      ],
      onDone: () => { void finish(); },
    });
    return {
      async showMe() { await ws.showMe(320); await finish(); },
      async solve() { ws.solve(); await finish(); },
      wrong() { ws.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p4 A curve through every reading

const SX = 0.3, SY = 0.25, Y0 = 396;
const W = (t: number, y: number): V3 => [t * SX, (y - Y0) * SY, 0];
const fromWorld = (m: number, c: number) => ({ c1: (m * SX) / SY, c0: c / SY + Y0 });
const toWorld = (c0: number, c1: number) => ({ m: (SY * c1) / SX, c: SY * (c0 - Y0) });

export const p4: PuzzleDef = {
  id: 'c23-p4',
  title: 'When will the drift pass 380 metres?',
  goal: 'Six hourly readings of the stern sheet’s drift. Fit the best line (drag its two handles), then drag the forecast marker along it to where the drift reaches **380 m**.',
  subgoals: ['Fit the best line to the six readings', 'Forecast the hour the line reaches 380 m'],
  hints: [
    'The readings drop about 1 metre an hour. Tilt the line to follow them.',
    'The best line is $y \\approx 411.98 - 1.006t$. Drag the marker along it to the dashed 380 m level.',
    '$411.98 - 1.006t = 380$ at $t \\approx 31.8$ hours.',
  ],
  par: 4,
  onWin: S.p4Win,
  setup(p) {
    p.grid({ base: 0.1, main: 0.18, axis: 0.35 });
    void p.g.stage.view2D({ center: [2.5, 0.25], height: 11.25, ms: 0 });
    const d = p.difficulty;
    const tol = d === 'cadet' ? 0.5 : d === 'navigator' ? 0.3 : 0.1;
    const pts = P4_PTS.map(([t, y]) => { const w = W(t, y); return [w[0], w[1]]; });
    const best = toWorld(P4_FIT[0], P4_FIT[1]);
    // the 380 m level and the axes' numbers
    const level = new FatLine(p.g.stage, [W(-3, P4_TARGET), W(40, P4_TARGET)], { color: C.orange, width: 1.6, opacity: 0.8, dashed: true, dashSize: 0.16, gapSize: 0.1 });
    p.add(level);
    tag(p, '380 m: inside the rig’s reach', W(6, P4_TARGET), 'o', [0, -16]);
    for (const hr of [0, 10, 20, 30]) tag(p, `hour ${hr}`, W(hr, 380), 'dim', [0, 28]);
    for (const m of [390, 400, 410]) tag(p, `${m} m`, W(-1.6, m), 'dim', [0, 0]);
    const r = p.readout('Forecast');
    let ghost: FatLine | null = null;
    let fitted = false, hour = 6, done = false, toldFit = false;
    // Within about 4 px (0.2 m) of the best line at both handles, the line snaps onto it: the 1% window is two
    // pixels wide and the 2D view has no zoom. Cadet snaps from twice as far, onto the dashed ghost.
    const snapM = (d === 'cadet' ? 0.1 : 0.05) / SY;
    const showLine = () => {
      const f = fromWorld(fl.m, fl.c), a = area(P4_PTS, f.c0, f.c1);
      r.row('line', 'line', lineTex(f.c0, f.c1, 3), C.result);
      r.row('area', 'total square area', fmtN(a, 3), a <= P4_BEST * 1.01 ? C.good : C.white);
      if (d !== 'commander') { const over = (a / P4_BEST - 1) * 100; r.row('gap', 'above the smallest by', `${over < 0.05 ? '0' : over.toFixed(over < 10 ? 1 : 0)}%`, over <= 1 ? C.good : C.orange); }
    };
    const fl: FitLine = new FitLine(p, {
      points: pts, m: (SY * -0.5) / SX, c: SY * (409 - Y0), squares: false, handleX: [P4_HANDLE_T[0] * SX, P4_HANDLE_T[1] * SX],
      onChange: () => { showLine(); placeMarker(); },
      onCommit: (m, c) => {
        const f = fromWorld(m, c);
        const ok = p4Near(f.c0, f.c1, snapM) || area(P4_PTS, f.c0, f.c1) <= P4_BEST * 1.01;
        if (d === 'cadet' && !ghost) {
          ghost = new FatLine(p.g.stage, [[-2, best.c - 2 * best.m, 0.005], [14, best.c + 14 * best.m, 0.005]], { color: C.result, width: 1.3, opacity: 0.35, dashed: true, dashSize: 0.12, gapSize: 0.1 });
          p.add(ghost);
        }
        if (ok) fl.set(best.m, best.c);
        if (ok && !fitted) { fitted = true; p.subgoal(0); sfx.success(); }
        if (!ok && fitted) { fitted = false; p.subgoal(0, false); }
        check();
      },
    });
    // the forecast marker rides on the line
    const marker = new Knob(p, W(hour, 409), {
      color: C.orange,
      constrain: (q) => { hour = Math.max(0, Math.min(40, Math.round((q.x / SX) * 10) / 10)); return new Vector3(...markerPos()); },
      onMove: () => showHour(),
      onEnd: () => check(true),
    });
    const markerPos = (): V3 => [hour * SX, fl.m * hour * SX + fl.c, 0.03];
    const placeMarker = () => { marker.at(markerPos()); showHour(); };
    const showHour = () => {
      const f = fromWorld(fl.m, fl.c);
      r.row('h', 'marker at hour', fmtN(hour, 1), C.orange);
      r.row('v', 'line’s drift there', `${fmtN(f.c0 + f.c1 * hour, 1)} m`, C.orange);
    };
    let curve: FatLine | null = null;
    const showCurve = () => {
      if (curve) return;
      const cp: V3[] = [];
      for (let t = 0; t <= 7.4; t += 0.05) { const y = curve5(t); const w = W(t, y); if (w[1] < -4.6) break; cp.push([w[0], w[1], 0.01]); }
      curve = new FatLine(p.g.stage, cp, { color: C.orange, width: 2, opacity: 0.85 });
      p.add(curve);
      const at = cp.find((q) => q[1] < -2) ?? cp[cp.length - 1];
      tag(p, `curve through all six: ${fmtN(P4_CURVE10, 0)} m at hour 10`, [at[0], at[1], 0], 'o', [150, 0]);
      p.bark('lantern', `The curve through every reading forecasts ${fmtN(P4_CURVE10, 0)} metres at hour ten.`);
    };
    const check = (fromMarker = false) => {
      if (done) return;
      const f = fromWorld(fl.m, fl.c), own = hourAt(f.c0, f.c1);
      if (!fitted) {
        if (fromMarker && !toldFit && (Math.abs(hour - own) <= 1 || Math.abs(hour - P4_HOUR) <= 1)) { toldFit = true; p.bark('lantern', 'That is where this line reaches 380 m. Fit the best line first: the forecast rides on it.'); }
        return;
      }
      if (!p4Won(f.c0, f.c1, hour, tol)) {
        if (fromMarker && Math.abs(hour - own) <= 1) p.bark('lantern', `Close. The line reaches 380 m a little ${hour < own ? 'later' : 'earlier'}.`);
        return;
      }
      done = true;
      p.subgoal(1);
      fl.setDraggable(false); marker.setEnabled(false);
      r.note(`Best line: the drift reaches 380 m at hour ${fmtN(P4_HOUR, 1)}.`);
      showCurve();
      p.win();
    };
    p.dock().append(h('div', { class: 'a8-btns' }, button('Try the curve through every reading', () => { p.move(); showCurve(); }, { cls: 'small ghost' })));
    showLine();
    placeMarker();
    return {
      async showMe() { await fl.showBest(1000); fitted = true; p.subgoal(0); hour = Math.round(P4_HOUR * 10) / 10; await marker.moveTo(markerPos(), 900); showHour(); check(); },
      solve() { fl.set(best.m, best.c); fitted = true; p.subgoal(0); hour = Math.round(P4_HOUR * 10) / 10; placeMarker(); check(); },
      wrong() { fl.set(best.m, best.c); fitted = true; hour = 10; placeMarker(); check(); },
    };
  },
};

