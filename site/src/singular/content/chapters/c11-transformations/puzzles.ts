// Chapter 11 puzzles (GDD §6.6): read the pulse, build a pulse, why two arrows fix everything [D],
// the spire numbers (3-D), both ways [H], rows or columns, and the standard moves [S].
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { BuoyField } from '../../../gfx/buoys';
import { Beacon, Dot, Pad } from '../../../gfx/markers';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { VectorHandle } from '../../../kit/handle';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { MatrixInput, VectorInput } from '../../../ui/widgets';
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { col, identity, matVec, type Mat } from '../../../math/la';
import { T3partial, T2partial } from './honest';
import { Bench2, Bench3, FlatGrid, GREY, playMove, ride } from './bench';
import { commitButton, dockButton, fadeOut, Gap, pause, step, tipToTail, TurnArc } from './parts';
import {
  BOW, BOW_REAL, BOW_SPIRE, fmtN, fmtV, ILSE_NINE, MEASURED, meqTol, near, p1Won, P1_BUOY, P1_ENTRYWISE, P1_LAND, P1_ROWS,
  p2Won, P2_ANSWER, P2_PROBES, P2_TARGETS, P3_DECOYS, P3_ORDER, P3_TARGETS, P3_TILES, p3TilesRight, p4Subgoals, PULSE,
  PULSE_E1, PULSE_E2, P5_A, P5_AX, P5_BEACON, P5_BEACON_LAND, P5_BENCH, P5_STEPS, p6Subgoals, P7_TARGETS, READ_COLS,
  READ_ROWS, SLIDE, slideEvidence, SPIRES_NOW, splitParts, tolFor, turnSense, VOL_REAL, VOL_SPIRE, warp, warpEvidence, WARP_K,
  type P4State, type P6State,
} from './logic';
import { S } from './script';

const v3 = (v: readonly number[]): V3 => [v[0], v[1], v[2] ?? 0];
const texM = (M: Mat) => `\\begin{bmatrix}${M.map((r) => r.map((x) => fmtN(x).replace('−', '-')).join(' & ')).join(' \\\\ ')}\\end{bmatrix}`;

/** Buoys on the floor that can also ride a 3-D flip (dims 3, z = 0). */
export function floorBuoys(p: PuzzleCtx, extent: number, size = 0.05): BuoyField {
  const pts: V3[] = [];
  for (let x = -extent; x <= extent; x++) for (let y = -extent; y <= extent; y++) pts.push([x, y, 0]);
  const b = new BuoyField(p.g.stage, { points: pts, dims: 3, size });
  p.add(b);
  return b;
}
const mat3of2 = (W: Mat): Mat => [[W[0][0], W[0][1], 0], [W[1][0], W[1][1], 0], [0, 0, 1]];

// ================================================================== c11-p1 · read the pulse

export const p1: PuzzleDef = {
  id: 'c11-p1',
  title: 'Where did the buoy from (3, 2) land?',
  goal: 'The pulse sent the buoy one step along the first grid arrow to **(1, 1)**. The buoy one step along the second went to **(−2, −1)**. Drag the **yellow** marker to where the buoy from **(3, 2)** landed. Then **Replay the pulse**.',
  predict: {
    prompt: 'Where did the buoy from (3, 2) land?',
    choices: [{ id: 'mix', text: '(−1, 1)' }, { id: 'rows', text: '(5, −8)' }, { id: 'entry', text: '(3, −2)' }, { id: 'still', text: 'It stayed at (3, 2)' }],
    answer: 'mix',
    reveal: '(3, 2) is 3 steps along the first grid arrow and 2 along the second. The pulse keeps that mix: $3\\,\\cg{(1, 1)} + 2\\,\\cr{(-2, -1)} = \\cy{(-1, 1)}$.',
  },
  hints: [
    '(3, 2) is 3 steps along the first grid arrow, then 2 steps along the second.',
    'After the pulse, each step along the first grid arrow is a step of (1, 1). Each step along the second is a step of (−2, −1).',
    '3 × (1, 1) + 2 × (−2, −1) = (3 − 4, 3 − 2) = (−1, 1).',
  ],
  par: 1,
  onWin: S.p1Win,
  setup(p) {
    p.g.stage.view2D({ center: [0.6, 1.3], height: 10, ms: 0 });
    const tol = tolFor(p.difficulty);
    const grid = p.grid({ base: 0.2, main: 0.45, axis: 0.6 });
    const ghost = new FlatGrid(p.g.stage, { extent: 9, color: C.result, opacity: 0.22, axisColor: C.result, width: 1.3 });
    ghost.set(PULSE);
    ghost.show(p.difficulty === 'cadet');
    p.add(ghost);
    const buoys = floorBuoys(p, 6);
    const iB = buoys.indexOf([3, 2, 0]);
    buoys.highlight([iB], C.white, 1);
    buoys.highlight([buoys.indexOf([1, 0, 0])], C.v, 0.9);
    buoys.highlight([buoys.indexOf([0, 1, 0])], C.w, 0.9);
    const tagB = new Label('from (3, 2)', [3, 2.38, 0], { className: 'coord' });
    p.add(tagB.object);
    p.onDispose(() => tagB.dispose());
    const greys = [new Arrow([0, 0, 0], [1, 0, 0], { color: GREY, width: 0.03, glow: 0.4 }), new Arrow([0, 0, 0], [0, 1, 0], { color: GREY, width: 0.03, glow: 0.4 })];
    const a1 = new Arrow([0, 0, 0], v3(PULSE_E1), { color: C.v, label: '$(1, 1)$' });
    const a2 = new Arrow([0, 0, 0], v3(PULSE_E2), { color: C.w, label: '$(-2, -1)$' });
    p.add(...greys, a1, a2);
    const vin = new VectorInput({ dim: 2, values: [2, -2], label: '\\text{marker} =', step: p.difficulty === 'commander' ? 0.1 : 0.5, onChange: (v) => marker.set([v[0], v[1], 0]), onSubmit: () => void commit() });
    const marker = new VectorHandle(p, {
      to: [2, -2, 0], color: C.result, label: '?', planar: true, limit: 6,
      onChange: (t) => vin.set([t[0], t[1]]),
    });
    p.dock().appendChild(vin.el);
    const gap = new Gap(p);
    let busy = false, misses = 0;
    const pulseTo = (k0: number, k1: number, ms: number, fast = false) => step(fast, ms, (k) => {
      const W = T2partial(k0 + (k1 - k0) * k);
      grid.set(W);
      buoys.set(mat3of2(W));
      const q = matVec(W, P1_BUOY);
      tagB.at([q[0], q[1] + 0.38, 0]);
    });
    const commit = async (fast = false) => {
      if (busy || p.won) return;
      busy = true;
      btn.disabled = true;
      p.move();
      gap.hide();
      const m = marker.tip;
      sfx.collapse();
      void p.g.stage.shockwave([0, 0, 0], fast ? 300 : 1800, 0.7);
      await pulseTo(0, 1, 2000, fast);
      tagB.set('landed');
      if (p1Won(m, tol)) {
        tagB.show(false);
        a1.setLabel(''); a2.setLabel('');
        marker.setEnabled(false);
        marker.set(v3(P1_LAND));
        marker.arrow.setLabel('$(-1, 1)$');
        ghost.show(false);
        await fadeOut(greys, fast ? 0 : 300);
        await tipToTail(p, [v3(PULSE_E1), v3(PULSE_E2)], [P1_BUOY[0], P1_BUOY[1]], [C.v, C.w], fast ? 0 : 360);
        void marker.arrow.pulse();
        sfx.success();
        p.win();
        busy = false;
        return;
      }
      misses++;
      sfx.miss();
      gap.show(m, P1_LAND, 'gap');
      const why = near(m, P1_ROWS, 0.3) ? ' (5, −8) reads the rows as landing spots. The landing spots are the columns.'
        : near(m, P1_ENTRYWISE, 0.3) ? ' (3, −2) multiplies number by number. Each step is a whole landing arrow.'
        : near(m, P1_BUOY, 0.3) ? ' Only the origin stays put.' : '';
      p.bark('lantern', `The buoy landed at (−1, 1). Your marker is at ${fmtV(m)}.${why}`);
      if (p.difficulty === 'navigator') ghost.show(true);
      if (misses >= 2 && p.difficulty !== 'commander') ghost.show(true);
      await pause(fast, 1600);
      await pulseTo(1, 0, 1200, fast);
      tagB.set('from (3, 2)');
      busy = false;
      btn.disabled = false;
    };
    const btn = commitButton(p, 'Replay the pulse', () => void commit());
    return {
      async showMe() { await marker.moveTo(v3(P1_LAND), 900); await commit(); },
      async solve() { marker.set(v3(P1_LAND)); await commit(true); },
      async wrong() { marker.set(v3(P1_ROWS)); await commit(true); },
    };
  },
};

// ================================================================== c11-p2 · build a pulse

export const p2: PuzzleDef = {
  id: 'c11-p2',
  title: 'Can you build a pulse from two columns?',
  goal: 'Drag the column tips $\\cg{\\mathbf a_1}$ and $\\cr{\\mathbf a_2}$, or type the matrix. Send **(1, 1)** to **(3, 3)** and keep **(1, −1)** where it is. Then **Pulse**.',
  hints: [
    '(1, 1) is one step along each grid arrow, so it lands on $\\mathbf a_1 + \\mathbf a_2$. That must be (3, 3).',
    '(1, −1) lands on $\\mathbf a_1 - \\mathbf a_2$. That must be (1, −1).',
    'Add the two: $2\\mathbf a_1 = (4, 2)$. So $\\mathbf a_1 = (2, 1)$ and $\\mathbf a_2 = (1, 2)$.',
  ],
  par: 2,
  onWin: S.p2Win,
  setup(p) {
    p.g.stage.view2D({ center: [1.2, 0.9], height: 10, ms: 0 });
    const tol = tolFor(p.difficulty);
    // Cadet sees the images follow the tips from the start; Navigator after the first Pulse (GDD §7.1).
    const live = p.difficulty === 'cadet';
    const probes = P2_PROBES.map((q, i) => new Dot(v3(q), { color: C.white, size: 0.09, label: i === 0 ? '(1, 1)' : '(1, −1)', labelOffset: [0, 18] }));
    const pads = P2_TARGETS.map((t, i) => new Pad(p.g.stage, v3(t), { label: i === 0 ? 'send (1, 1) here' : 'keep (1, −1) here', radius: i === 0 ? 0.32 : 0.42, color: '#9fd8ff' }));
    const images = P2_PROBES.map(() => new Dot([0, 0, 0], { color: C.result, size: 0.11 }));
    const leaders = P2_PROBES.map(() => new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 0]], { color: C.result, width: 1.4, dashed: true, opacity: 0.6 }));
    p.add(...pads, ...probes, ...images, ...leaders.map((l) => l.object));
    p.onDispose(() => leaders.forEach((l) => l.dispose()));
    let shown = live;
    const place = (M: Mat) => {
      P2_PROBES.forEach((q, i) => {
        const im = matVec(M, q);
        images[i].at(v3(im));
        leaders[i].setPoints([v3(q), v3(im)]);
        images[i].setOpacity(shown ? 1 : 0);
        leaders[i].setOpacity(shown ? 0.6 : 0);
      });
    };
    const bench = new Bench2(p, {
      draggable: true, grey: true, input: true, live,
      onChange: (M) => place(M),
      onCommit: (M) => { if (p2Won(M, tol)) void commit(); },
    });
    const gap = new Gap(p);
    let busy = false;
    const commit = async (fast = false) => {
      if (busy || p.won) return;
      busy = true;
      gap.hide();
      const M = bench.get();
      shown = true;
      const riders = P2_PROBES.map((q, i) => ride(q, (x) => { images[i].at(x); leaders[i].setPoints([v3(q), x]); images[i].setOpacity(1); leaders[i].setOpacity(0.6); }));
      await bench.play(M, fast ? 0 : 1500, riders);
      if (!live) bench.showGrid(M);
      if (p2Won(M, tol)) {
        pads.forEach((pd) => void pd.hit());
        bench.setDraggable(false);
        sfx.success();
        p.win();
      } else {
        sfx.miss();
        const i = near(matVec(M, P2_PROBES[0]), P2_TARGETS[0], tol) ? 1 : 0;
        const got = matVec(M, P2_PROBES[i]);
        gap.show(got, P2_TARGETS[i], 'gap');
        p.bark('lantern', `${i === 0 ? '(1, 1)' : '(1, −1)'} landed on ${fmtV(got)}. The target is ${fmtV(P2_TARGETS[i])}.`);
        if (!live) await pause(fast, 900);
      }
      busy = false;
    };
    commitButton(p, 'Pulse', () => { p.move(); void commit(); });
    place(bench.get());
    return {
      async showMe() { await bench.to(P2_ANSWER); await commit(); },
      async solve() { bench.set(P2_ANSWER); await commit(true); },
      // a misconception: the targets typed in as the columns
      async wrong() { bench.set([[3, 1], [3, -1]]); await commit(true); },
    };
  },
};

// ================================================================== c11-p3 [D] · why two arrows fix everything

export const p3: PuzzleDef = {
  id: 'c11-p3',
  title: 'Why do two landing spots fix every point?',
  goal: 'Drag the white point $\\mathbf x$ off both axes. Then **Pulse** it and watch its two parts.',
  subgoals: ['Split a point and pulse it', 'Write where it lands, and why', 'Build the shear and the quarter turn', 'Pin what the bench cannot do'],
  hints: [
    'Any point off both axes works. Its two grey parts are $x_1\\mathbf e_1$ and $x_2\\mathbf e_2$.',
    'Each part lands on its own landing arrow, stretched: $x_1 T(\\mathbf e_1)$ and $x_2 T(\\mathbf e_2)$. Add them.',
    'Shear: columns (1, 0) and (1, 1). Quarter turn: columns (0, 1) and (−1, 0).',
    'The slid grid’s axes cross at (3, 0): the origin moved. In the warp, pin any curved line away from the middle.',
  ],
  par: 10,
  onWin: S.p3Win,
  setup(p) {
    p.g.stage.view2D({ center: [0.7, 0.7], height: 10, ms: 0 });
    const tol = tolFor(p.difficulty);
    const d = p.difficulty;
    let stage: 'split' | 'why' | 'build' | 'slide' | 'warp' | 'done' = 'split';
    const bench = new Bench2(p, { M: PULSE, draggable: true, grey: true, greyLabels: false, input: true, live: false, labels: ['$T(\\mathbf e_1)$', '$T(\\mathbf e_2)$'], snap: p.snap(),
      onChange: () => { if (stage === 'build') void checkBuild(fastMode); },
      onCommit: () => { if (stage === 'build') void checkBuild(fastMode); },
    });
    bench.setDraggable(false);
    if (bench.input) bench.input.el.hidden = true;
    // ---- stage A: the split
    const xh = new VectorHandle(p, { to: [2, 2, 0], color: C.white, label: '$\\mathbf x$', snap: 1, limit: 3, planar: true, onChange: () => drawParts() });
    const part1 = new Arrow([0, 0, 0], [2, 0, 0], { color: GREY, width: 0.04, label: '$x_1\\mathbf e_1$', labelAt: 'mid' });
    const part2 = new Arrow([2, 0, 0], [2, 2, 0], { color: GREY, width: 0.04, label: '$x_2\\mathbf e_2$', labelAt: 'mid' });
    const land = new Arrow([0, 0, 0], [0, 0, 0], { color: C.result, label: '$T(\\mathbf x)$' });
    land.setOpacity(0);
    p.add(part1, part2, land);
    const r = p.readout('The split');
    const drawParts = () => {
      const x = xh.vec;
      part1.set([0, 0, 0], [x[0], 0, 0]);
      part2.set([x[0], 0, 0], [x[0], x[1], 0]);
      r.row('x', '$\\mathbf x$', fmtV([x[0], x[1]]));
      r.row('s', 'split', `$${fmtN(x[0])}\\,\\mathbf e_1 + ${fmtN(x[1])}\\,\\mathbf e_2$`.replace(/−/g, '-'));
    };
    drawParts();
    let busy = false;
    const pulseBtn = commitButton(p, 'Pulse', () => void pulseX());
    const pulseX = async (fast = false): Promise<boolean> => {
      if (busy || stage !== 'split') return false;
      busy = true;
      p.move();
      const x = xh.vec;
      const sp = splitParts(x);
      xh.setEnabled(false);
      sfx.collapse();
      await step(fast, 2000, (k) => {
        const W = T2partial(k);
        bench.grid.set(W);
        const e1 = matVec(W, [x[0], 0]), all = matVec(W, [x[0], x[1]]);
        part1.set([0, 0, 0], v3(e1));
        part2.set(v3(e1), v3(all));
        xh.arrow.setTo(v3(all));
      });
      part1.setColor(C.v); part2.setColor(C.w);
      part1.setLabel(`$${fmtN(x[0])}\\,T(\\mathbf e_1)$`.replace(/−/g, '-'));
      part2.setLabel(`$${fmtN(x[1])}\\,T(\\mathbf e_2)$`.replace(/−/g, '-'));
      land.set([0, 0, 0], v3(sp.land));
      land.setOpacity(1);
      xh.arrow.setOpacity(0);
      r.row('l', '$T(\\mathbf x)$', fmtV(sp.land), C.result);
      if (Math.abs(x[0]) < 1e-9 || Math.abs(x[1]) < 1e-9) {
        p.bark('bram', 'Pick a point off both axes, so both parts show.');
        sfx.miss();
        await pause(fast, 1200);
        bench.grid.set(identity(2));
        part1.setColor(GREY); part2.setColor(GREY);
        part1.setLabel('$x_1\\mathbf e_1$'); part2.setLabel('$x_2\\mathbf e_2$');
        land.setOpacity(0); xh.arrow.setOpacity(1); xh.set([x[0], x[1], 0]); xh.setEnabled(true);
        drawParts();
        r.hideRow('l');
        busy = false;
        return false;
      }
      sfx.success();
      p.subgoal(0);
      pulseBtn.hidden = true;
      busy = false;
      enterWhy(x);
      return true;
    };
    // ---- stage B: where it lands, and why
    let ws: StepWorksheet | null = null;
    let tiles: TileOrder | null = null;
    let fastMode = false;
    let building: Promise<void> | null = null;
    const whyDone = () => { p.subgoal(1); building = enterBuild(); };
    const enterWhy = (x: number[]) => {
      stage = 'why';
      const [a, b] = [x[0], x[1]];
      const sp = splitParts(x);
      const steps = [
        { prompt: `$T(${fmtN(a)}\\,\\mathbf e_1) = ${fmtN(a)}\\,T(\\mathbf e_1) = ${fmtN(a)}\\,\\cg{(1, 1)}$`.replace(/−/g, '-'), answer: sp.a1 },
        { prompt: `$T(${fmtN(b)}\\,\\mathbf e_2) = ${fmtN(b)}\\,T(\\mathbf e_2) = ${fmtN(b)}\\,\\cr{(-2, -1)}$`.replace(/−/g, '-'), answer: sp.a2 },
        { prompt: 'Add the two parts: $T(\\mathbf x)$', answer: sp.land, mistakes: [[[a * 1, b * -1], 'Number by number is not the rule. Each part is a whole landing arrow, stretched.']] as [number[], string][] },
      ];
      p.setGoal('The pulse keeps sums and stretches. Write where each part lands, then where $\\mathbf x$ lands.');
      if (d === 'commander') {
        p.setGoal('Put the reasons in order. Then write where $\\mathbf x$ lands.');
        tiles = new TileOrder(p, {
          title: 'Why the two landing spots are enough', tiles: P3_TILES, decoys: P3_DECOYS, submitLabel: 'Check order',
          onSubmit: (o) => {
            p.move();
            if (p3TilesRight(o)) { tiles?.el.remove(); ws = new StepWorksheet(p, { steps: [steps[2]], onDone: whyDone }); }
            else { sfx.miss(); p.bark('lantern', o.includes('entry') ? 'Number by number is not a property of the move. Use sums and stretches.' : 'Split first, then sums, then stretches, then the landing spot.'); }
          },
        });
      } else {
        ws = new StepWorksheet(p, { steps, onDone: whyDone });
      }
    };
    // ---- stage C: build the shear and the quarter turn
    let target = 0;
    const ghost = new FlatGrid(p.g.stage, { extent: 9, color: C.white, opacity: 0.22, axisColor: C.white, width: 1.4 });
    ghost.show(false);
    p.add(ghost);
    const rings = [new Pad(p.g.stage, [0, 0, 0], { color: C.v, radius: 0.26 }), new Pad(p.g.stage, [0, 0, 0], { color: C.w, radius: 0.26 })];
    rings.forEach((x) => { x.object.visible = false; });
    p.add(...rings);
    const showTarget = () => {
      const M = P3_TARGETS[target].M;
      ghost.set(M); ghost.show(true);
      rings.forEach((x, j) => { x.at(v3(col(M, j))); x.object.visible = true; x.reset(j === 0 ? C.v : C.w); });
      p.setGoal(`Drag the column tips (or type the matrix) to match the dashed grid: **${P3_TARGETS[target].name}**.`);
    };
    const enterBuild = async () => {
      stage = 'build';
      ws?.el.remove();
      await fadeOut([part1, part2, land], fastMode ? 0 : 300);
      xh.arrow.setOpacity(0);
      bench.arrow(0).setLabel('$\\mathbf a_1$'); bench.arrow(1).setLabel('$\\mathbf a_2$');
      bench.set(identity(2));
      bench.setLive(true);
      bench.setDraggable(true);
      if (bench.input) bench.input.el.hidden = false;
      r.row('x', 'target', P3_TARGETS[0].name); r.hideRow('s'); r.hideRow('l');
      showTarget();
    };
    let checking: Promise<void> | null = null;
    const checkBuild = (fast = false): Promise<void> => {
      if (checking) return checking;
      if (stage !== 'build' || !meqTol(bench.get(), P3_TARGETS[target].M, tol)) return Promise.resolve();
      checking = matched(fast).finally(() => { checking = null; });
      return checking;
    };
    const matched = async (fast: boolean) => {
      rings.forEach((x) => void x.hit());
      sfx.success();
      p.bark('lantern', `${P3_TARGETS[target].name[0].toUpperCase()}${P3_TARGETS[target].name.slice(1)} matched. Two columns, every grid line.`);
      await pause(fast, 700);
      target++;
      if (target < P3_TARGETS.length) { showTarget(); r.row('x', 'target', P3_TARGETS[target].name); }
      else { ghost.show(false); rings.forEach((x) => { x.object.visible = false; }); p.subgoal(2); enterSlide(); }
    };
    // ---- stage D: the slide and the curved warp
    const impostor = new FlatGrid(p.g.stage, { extent: 8, color: C.orange, opacity: 0.55, axisColor: C.orange });
    impostor.show(false);
    p.add(impostor);
    const warpSegs: [V3, V3][] = [];
    for (let c = -4; c <= 4; c++) {
      for (let x = -5; x < 5; x += 0.25) warpSegs.push([v3(warp([x, c])), v3(warp([x + 0.25, c]))]);
      warpSegs.push([v3(warp([c, -5])), v3(warp([c, 5]))]);
    }
    const warpGrid = new FatSegments(p.g.stage, warpSegs, { color: C.orange, width: 1.3, opacity: 0.6 });
    warpGrid.object.visible = false;
    p.add(warpGrid.object);
    p.onDispose(() => warpGrid.dispose());
    const pin = new Dot([-1.5, -3, 0.05], { color: C.orange, size: 0.13, label: 'evidence pin', labelOffset: [0, 20] });
    pin.object.visible = false;
    pin.mesh.visible = false;
    p.add(pin);
    const evidence = new Gap(p);
    const chord = new Gap(p);
    const pinDrag = p.g.drag.add({
      target: pin.mesh, getPos: () => pin.group.position.clone(), snap: () => 0.25,
      onMove: (q) => pin.at([q.x, q.y, 0.05]),
      onEnd: () => { p.move(); const q = pin.group.position; void dropPin([q.x, q.y]); },
    });
    p.onDispose(() => pinDrag.remove());
    const enterSlide = () => {
      stage = 'slide';
      bench.set(identity(2));
      bench.grid.setLook({ main: 0.3 });
      impostor.set(identity(2), [SLIDE[0], SLIDE[1], 0]);
      impostor.show(true);
      pin.object.visible = true;
      pin.mesh.visible = true;
      r.row('x', 'impostor', 'everything slides 3 right');
      p.setGoal('Orange: **everything slides 3 to the right**. Try to match it with the column tips: you cannot. Drag the **evidence pin** to the place that shows why.');
    };
    const dropPin = async (q: number[], fast = false) => {
      if (stage === 'slide') {
        if (slideEvidence(q)) {
          pin.at([SLIDE[0], SLIDE[1], 0.05]);
          evidence.show([0, 0, 0], v3(SLIDE), 'the origin moved');
          sfx.success();
          p.bark('lantern', 'The slid grid has its origin at (3, 0). Every move on the bench keeps the origin at (0, 0).');
          await pause(fast, 1500);
          stage = 'warp';
          impostor.show(false);
          warpGrid.object.visible = true;
          pin.at([-1.5, -3, 0.05]);
          r.row('x', 'impostor', 'the curved warp');
          p.setGoal('Orange: **the curved warp**. Its origin stays put. Drag the **evidence pin** onto what the bench can never do.');
        } else { sfx.miss(); p.bark('lantern', `The pin is at ${fmtV(q)}. Find where the orange grid’s two axes cross.`); }
      } else if (stage === 'warp') {
        const c = warpEvidence(q);
        if (c !== null) {
          pin.at([q[0], q[1], 0.05]);
          const a = warp([-3, c]), b = warp([3, c]);
          chord.show(v3(a), v3(b), 'this grid line bent');
          evidence.hide();
          sfx.success();
          stage = 'done';
          p.subgoal(3);
          p.win();
        } else { sfx.miss(); p.bark('lantern', 'Pin a grid line that is no longer straight, away from the middle.'); }
      }
    };
    const solveAll = async (fast: boolean) => {
      fastMode = fast;
      if (stage === 'split') { xh.set([2, 1, 0]); drawParts(); await pulseX(fast); }
      if (stage === 'why') {
        if (tiles) { tiles.set(P3_ORDER); tiles.el.remove(); ws = new StepWorksheet(p, { steps: [{ prompt: 'Add the two parts: $T(\\mathbf x)$', answer: splitParts(xh.vec).land }], onDone: whyDone }); }
        if (fast) ws?.solve(); else await ws?.showMe(350);
      }
      if (building) await building;
      while (stage === 'build') {
        const M = P3_TARGETS[target].M;
        await bench.to(M, fast ? 0 : 900);
        await checkBuild(fast);
      }
      if (stage === 'slide') { if (!fast) await animate(700, (k) => pin.at([-1.5 + 4.5 * k, -3 + 3 * k, 0.05])); await dropPin(SLIDE, fast); }
      if (stage === 'warp') { const q = warp([2.5, 1]); if (!fast) await animate(700, (k) => pin.at([-1.5 + 4 * k, -3 + (q[1] + 3) * k, 0.05])); await dropPin(q, fast); }
    };
    void WARP_K;
    return {
      showMe: () => solveAll(false),
      solve: () => solveAll(true),
      async wrong() { xh.set([2, 0, 0]); drawParts(); await pulseX(true); },
    };
  },
};

// ================================================================== c11-p4 · the spire numbers (3-D)

export const p4: PuzzleDef = {
  id: 'c11-p4',
  title: 'Do the spire numbers predict the pulse?',
  goal: 'Build the **spire numbers** on the bench: each tip is a column. Drag the tips (Shift for height) or type them.',
  subgoals: ['Build the spire numbers', 'Place the spire forecast for the bow', 'Build the measured pulse', 'Place the measured forecast for the bow'],
  hints: [
    'Each spire tip is where one grid arrow lands, so it goes in as a column: $\\cg{(0, 1, 0)}$, $\\cr{(-1, 0, 0)}$, $\\cb{(0, 0, 0.8)}$.',
    'The bow is at (1, 0, 0): one step along $\\mathbf e_1$. Any matrix sends it to its first column.',
    'Spire forecast: (0, 1, 0). Measured columns: (1, 1, 0), (−2, −1, 0), (0, 0, 0.8). Measured forecast: (1, 1, 0).',
  ],
  view: '3d',
  par: 8,
  onWin: S.p4Win,
  setup(p) {
    void p.g.stage.view3D({ target: [0, 0.3, 0.3], distance: 9.5, azimuth: -64, elevation: 30, ms: 0 });
    const tol = tolFor(p.difficulty);
    const buoys = new BuoyField(p.g.stage, { extent: 2, dims: 3, size: 0.038, color: '#7fa6cf' });
    p.add(buoys);
    const st: P4State = { spire: null, spireMark: null, real: null, realMark: null };
    let ready = false;
    let phase: 'spire' | 'spireMark' | 'real' | 'realMark' | 'fire' | 'done' = 'spire';
    const bow = new Dot([1, 0, 0], { color: C.white, size: 0.1, label: 'bow', labelOffset: [-34, 26], glow: 1 });
    p.add(bow);
    const ghost = new Dot([1, 0, 0], { color: C.result, size: 0.09 });
    ghost.setOpacity(0);
    p.add(ghost);
    const bench = new Bench3(p, {
      draggable: true, input: true, live: p.difficulty !== 'commander', extent: 1, snap: p.difficulty === 'commander' ? null : 0.1,
      inputLabel: 'A =',
      onChange: (M) => { if (!ready) return; if (p.difficulty === 'cadet' && (phase === 'spireMark' || phase === 'realMark')) { ghost.at(v3(matVec(M, BOW))); } check(); },
      onCommit: () => { if (ready) check(); },
    });
    const r = p.readout('Spire bench');
    r.row('t1', 'tip 1', '(0, 1, 0)', C.v);
    r.row('t2', 'tip 2', '(−1, 0, 0)', C.w);
    r.row('t3', 'tip 3', '(0, 0, 0.8)', C.u);
    const mk = (label: string) => new VectorHandle(p, {
      to: [1, 0, 0], color: C.result, label, limit: 3, snap: p.snap() ?? 0.1,
      onCommit: (t) => placeMark(t),
    });
    const marks: VectorHandle[] = [];
    const gap = new Gap(p);
    const check = () => {
      const M = bench.get();
      if (phase === 'spire' && meqTol(M, SPIRES_NOW, tol)) {
        st.spire = M; p.subgoal(0); sfx.success(); phase = 'spireMark';
        bench.setDraggable(false);
        marks.push(mk('spire forecast'));
        if (p.difficulty === 'cadet') { ghost.at(v3(matVec(M, BOW))); ghost.setOpacity(0.55); }
        p.setGoal('The spire numbers are on the bench. Drag the **yellow** arrow to where they send the bow at (1, 0, 0).');
      } else if (phase === 'real' && meqTol(M, MEASURED, tol)) {
        st.real = M; p.subgoal(2); sfx.success(); phase = 'realMark';
        bench.setDraggable(false);
        marks.push(mk('measured forecast'));
        if (p.difficulty === 'cadet') { ghost.at(v3(matVec(M, BOW))); ghost.setOpacity(0.55); }
        p.setGoal('Now drag the second **yellow** arrow to where the measured pulse sends the bow.');
      }
    };
    const placeMark = (t: V3) => {
      if (phase === 'spireMark') {
        if (near(t, BOW_SPIRE, tol)) {
          st.spireMark = t; p.subgoal(1); sfx.snap(); marks[0].setEnabled(false); marks[0].set(v3(BOW_SPIRE));
          ghost.setOpacity(0);
          phase = 'real';
          bench.set(identity(3));
          bench.setDraggable(true);
          r.row('m1', 'measured, $\\mathbf e_1$ lands', '(1, 1, 0)', C.v);
          r.row('m2', 'measured, $\\mathbf e_2$ lands', '(−2, −1, 0)', C.w);
          r.row('m3', 'measured, $\\mathbf e_3$ lands', '(0, 0, 0.8)', C.u);
          p.setGoal('LANTERN measured the pulse from the lattice. Build the **measured pulse** on the bench: its landing spots are the columns.');
        } else { sfx.miss(); p.bark('lantern', `These columns do not send (1, 0, 0) to ${fmtV(t)}. The bow is one step along $\\mathbf e_1$.`); }
      } else if (phase === 'realMark') {
        if (near(t, BOW_REAL, tol)) {
          st.realMark = t; p.subgoal(3); sfx.snap(); marks[1].setEnabled(false); marks[1].set(v3(BOW_REAL));
          ghost.setOpacity(0);
          phase = 'fire';
          fireBtn.hidden = false;
          p.setGoal('Two forecasts for the bow. **Fire the pulse** and see which one it lands on.');
        } else { sfx.miss(); p.bark('lantern', `The measured pulse does not send (1, 0, 0) to ${fmtV(t)}. Read its first column.`); }
      }
    };
    const fire = async (fast = false) => {
      if (phase !== 'fire' || !p4Subgoals(st, tol).every(Boolean)) return;
      phase = 'done';
      fireBtn.hidden = true;
      p.move();
      bench.show(false);
      sfx.collapse();
      void p.g.stage.shockwave([0, 0, 0], fast ? 300 : 2000, 0.8);
      await step(fast, 2200, (k) => {
        const W = T3partial(k);
        buoys.set(W);
        bow.at(v3(matVec(W, BOW)));
      });
      marks[0].arrow.setLabel('spire');
      marks[1].arrow.setLabel('measured');
      gap.show(BOW_SPIRE, BOW_REAL, 'misses by 1');
      r.row('vs', 'volume, spire forecast', `× ${fmtN(VOL_SPIRE)}`);
      r.row('vr', 'volume, measured', `× ${fmtN(VOL_REAL)}`, C.result);
      // look down on the floor so the two forecasts separate
      await p.g.stage.view3D({ target: [0.5, 0.6, 0], distance: 7.5, azimuth: -90, elevation: 66, ms: fast ? 0 : 900 });
      sfx.success();
      p.win();
    };
    const fireBtn = commitButton(p, 'Fire the pulse', () => void fire());
    fireBtn.hidden = true;
    ready = true;
    const solveAll = async (fast: boolean) => {
      if (phase === 'spire') { await bench.to(SPIRES_NOW, fast ? 0 : 1200); check(); }
      if (phase === 'spireMark') { if (fast) marks[0].set(v3(BOW_SPIRE)); else await marks[0].arrow.moveTo(v3(BOW_SPIRE), 700); placeMark(v3(BOW_SPIRE)); }
      if (phase === 'real') { await bench.to(MEASURED, fast ? 0 : 1200); check(); }
      if (phase === 'realMark') { if (fast) marks[1].set(v3(BOW_REAL)); else await marks[1].arrow.moveTo(v3(BOW_REAL), 700); placeMark(v3(BOW_REAL)); }
      await fire(fast);
    };
    return {
      showMe: () => solveAll(false),
      solve: () => solveAll(true),
      async wrong() { bench.set(MEASURED); check(); },
    };
  },
};

// ================================================================== c11-p5 [H] · both ways

export const p5: PuzzleDef = {
  id: 'c11-p5',
  title: 'Where does the sensor send (3, 1, 2), worked both ways?',
  goal: 'The sensor’s rule is $A = ' + texM(P5_A) + '$ and $\\mathbf x = (3, 1, 2)$. We write where $\\mathbf x$ lands as $A\\mathbf x$. Work it out by hand both ways, then drag the **yellow** arrow onto it.',
  subgoals: ['Work out A x row by row and down the columns', 'Place A x', 'Send the beacon through the 3-D bench'],
  hints: [
    'Row view: row 1 is (1, 0, 2), so entry 1 is 1·3 + 0·1 + 2·2. Column view: 3 of $\\cg{\\mathbf a_1}$, 1 of $\\cr{\\mathbf a_2}$, 2 of $\\cb{\\mathbf a_3}$.',
    'Both views give (7, −1). Drag the yellow arrow there.',
    'The 3-D bench sends (1, 1, 1) to the three columns added: (1, 0, 0) + (1, 1, 0) + (0, 1, 1) = (2, 2, 1). Hold Shift to drag up.',
  ],
  par: 10,
  onWin: S.p5Win,
  setup(p) {
    p.g.stage.view2D({ center: [2.45, 0.3], height: 11, ms: 0 });
    const tol = tolFor(p.difficulty);
    const grid = p.grid({ base: 0.32, main: 0, axis: 0.8 });
    const cols = [0, 1, 2].map((j) => v3(col(P5_A, j)));
    const colors = [C.v, C.w, C.u];
    const colArrows = cols.map((c, j) => new Arrow([0, 0, 0], c, { color: colors[j], label: `$\\mathbf a_${j + 1}$`, width: 0.045 }));
    p.add(...colArrows);
    const r = p.readout('Hull sensor');
    r.eq(`A = ${texM(P5_A)}\\quad \\mathbf x = \\begin{bmatrix}3\\\\1\\\\2\\end{bmatrix}`);
    r.row('size', 'rule', '2 rows, 3 columns: three numbers in, two out');
    let flags = [false, false, false];
    let stage: 'flat' | 'space' | 'done' = 'flat';
    let fastMode = false;
    let spaceReady: Promise<void> | null = null;
    let chain: Arrow[] = [];
    const tick = (i: number) => {
      if (flags[i]) return;
      flags = flags.map((f, k) => (k === i ? true : f));
      p.subgoal(i);
      if (flags[0] && flags[1] && stage === 'flat') spaceReady = enterSpace(fastMode);
    };
    const res = new VectorHandle(p, {
      to: [2, 2, 0], color: C.result, label: '$A\\mathbf x$', planar: true, limit: 8,
      onCommit: (t) => {
        if (stage !== 'flat') return;
        if (near(t, P5_AX, tol)) { res.set(v3(P5_AX)); res.setEnabled(false); sfx.success(); tick(1); }
        else { sfx.miss(); p.bark('lantern', `That is ${fmtV(t)}. Work out both entries first.`); }
      },
    });
    const ws = new StepWorksheet(p, {
      steps: [P5_STEPS[4], P5_STEPS[5], P5_STEPS[0], P5_STEPS[1], P5_STEPS[2], P5_STEPS[3]],
      onDone: () => {
        tick(0);
        void tipToTail(p, cols, [3, 1, 2], colors, fastMode ? 0 : 260).then((a) => { chain = a; if (stage !== 'flat') a.forEach((x) => x.setOpacity(0)); });
      },
    });
    // ---- the 3-D bench
    let bench3: Bench3 | null = null;
    let beacon: Beacon | null = null;
    let land: VectorHandle | null = null;
    let vin: VectorInput | null = null;
    let busy = false;
    const enterSpace = async (fast = false) => {
      stage = 'space';
      await pause(fast, 900);
      grid.setLook({ base: 0, main: 0, axis: 0 });
      [...colArrows, ...chain].forEach((a) => a.setOpacity(0));
      res.arrow.setOpacity(0);
      ws.el.remove();
      await p.g.stage.view3D({ target: [0.9, 0.9, 0.6], distance: 9, azimuth: -60, elevation: 26, ms: fast ? 0 : 1100 });
      bench3 = new Bench3(p, { M: P5_BENCH, extent: 1 });
      bench3.lattice.set(identity(3));
      beacon = new Beacon(p.g.stage, v3(P5_BEACON), { color: C.white, label: 'beacon' });
      p.add(beacon);
      land = new VectorHandle(p, { to: [1, 1, 1], color: C.result, label: '?', limit: 3, snap: p.snap() ?? 0.1, onChange: (t) => vin?.set([t[0], t[1], t[2]]) });
      vin = new VectorInput({ dim: 3, values: [1, 1, 1], label: '\\text{landing} =', step: 0.5, onChange: (v) => land?.set([v[0], v[1], v[2]]), onSubmit: () => void pulse3() });
      p.dock().appendChild(vin.el);
      commitButton(p, 'Pulse', () => void pulse3());
      r.eq(`\\text{bench} = ${texM(P5_BENCH)}`);
      r.hideRow('size');
      p.setGoal('The 3-D bench has columns $\\cg{(1, 0, 0)}$, $\\cr{(1, 1, 0)}$, $\\cb{(0, 1, 1)}$. Put the **yellow** arrow where the beacon (1, 1, 1) lands (Shift-drag for height, or type it). Then **Pulse**.');
    };
    const pulse3 = async (fast = false) => {
      if (busy || stage !== 'space' || !bench3 || !land || !beacon) return;
      busy = true;
      p.move();
      const guess = land.tip;
      const b3 = bench3, bc = beacon;
      sfx.whoosh(1.4);
      await step(fast, 1500, (k) => {
        const W = identity(3).map((row, i) => row.map((x, j) => x + (P5_BENCH[i][j] - x) * k));
        b3.lattice.set(W);
        bc.at(v3(matVec(W, P5_BEACON)));
      });
      if (near(guess, P5_BEACON_LAND, tol)) {
        stage = 'done';
        land.setEnabled(false);
        land.set(v3(P5_BEACON_LAND));
        land.arrow.setLabel('$(2, 2, 1)$');
        sfx.success();
        tick(2);
        p.win();
      } else {
        sfx.miss();
        p.bark('lantern', `The beacon landed at (2, 2, 1). Your arrow is at ${fmtV(guess)}.`);
        await pause(fast, 1200);
        b3.lattice.set(identity(3));
        bc.at(v3(P5_BEACON));
      }
      busy = false;
    };
    const solveAll = async (fast: boolean) => {
      fastMode = fast;
      if (stage === 'flat') {
        if (!flags[1]) { if (fast) res.set(v3(P5_AX)); else await res.arrow.moveTo(v3(P5_AX), 600); res.setEnabled(false); tick(1); }
        if (fast) ws.solve(); else await ws.showMe(320);
      }
      if (spaceReady) await spaceReady;
      if (!land) return;
      if (fast) land.set(v3(P5_BEACON_LAND)); else await land.arrow.moveTo(v3(P5_BEACON_LAND), 700);
      await pulse3(fast);
    };
    return {
      showMe: () => solveAll(false),
      solve: () => solveAll(true),
      wrong() { ws.wrong(); },
    };
  },
};

// ================================================================== c11-p6 · rows or columns?

export const p6: PuzzleDef = {
  id: 'c11-p6',
  title: 'Did Ilse mean her numbers as columns or as rows?',
  goal: 'Type Ilse’s nine numbers into both readings. The ground layer is enough: the third spire reads (0, 0, 1) either way. **Turn the grid** with each. Then **Load** the reading that turns the grid the same way round as the pulse.',
  subgoals: ['Build the spires as columns', 'Build the spires as rows', 'Load the reading that turns the grid the same way round as the pulse'],
  hints: [
    'As columns: the first spire (0, 1, 0) is the first column, the second spire (−1, 0, 0) the second column.',
    'As rows: the first spire is the first row, the second spire the second row.',
    'The pulse turns $\\mathbf e_1$ counterclockwise. The columns reading does too; the rows reading turns it clockwise.',
  ],
  par: 5,
  onWin: S.p6Win,
  setup(p) {
    p.g.stage.view2D({ center: [0.4, 0.2], height: 8, ms: 0 });
    const tol = tolFor(p.difficulty);
    const grid = p.grid({ base: 0.3, main: 0.55 });
    const flat = new FlatGrid(p.g.stage, { extent: 9 });
    flat.show(false);
    p.add(flat);
    const e1 = new Arrow([0, 0, 0], [1, 0, 0], { color: C.v, label: '$\\mathbf e_1$', width: 0.045 });
    p.add(e1);
    const pulseArc = new TurnArc(p, 1.7, C.white, 'the pulse', true);
    pulseArc.set([1, 0], col(PULSE, 0), turnSense(PULSE));
    const readArc = new TurnArc(p, 1.15, C.result, '');
    const r = p.readout('Ilse’s nine numbers');
    r.row('s1', 'first spire', ILSE_NINE.slice(0, 3).map(fmtN).join(', '));
    r.row('s2', 'second spire', ILSE_NINE.slice(3, 6).map(fmtN).join(', '));
    r.row('s3', 'third spire', ILSE_NINE.slice(6, 9).map(fmtN).join(', '));
    r.note('Dashed white: the way round the measured pulse turned the grid in the cold open.');
    const st: P6State = { cols: null, rows: null, loaded: null };
    let busy = false;
    const play = async (M: Mat, which: string, fast = false) => {
      if (busy) return;
      busy = true;
      p.move();
      readArc.show(false);
      grid.set(identity(2));
      e1.setTo([1, 0, 0]);
      await playMove({ grid, flat, g: p.g }, M, identity(2), fast ? 0 : 1500, [ride([1, 0], (q) => e1.setTo(q))]);
      const s = turnSense(M);
      if (s !== 0) { readArc.setText(which === 'cols' ? 'as columns' : 'as rows'); readArc.set([1, 0], col(M, 0), s); }
      busy = false;
    };
    const card = (title: string, key: 'cols' | 'rows', want: Mat) => {
      const input = new MatrixInput({ rows: 2, cols: 2, values: [[0, 0], [0, 0]], colourCols: key === 'cols', label: key === 'cols' ? 'C =' : 'R =', step: 1 });
      const msg = h('div', { class: 'c-muted', style: 'font-size:12.5px;min-height:16px' });
      const turn = dockButton(p, 'Turn the grid', () => {
        const M = input.get();
        if (!meqTol(M, want, tol)) {
          sfx.miss();
          msg.textContent = key === 'cols' ? 'Not yet: each spire goes down a column.' : 'Not yet: each spire goes across a row.';
          return;
        }
        msg.textContent = '';
        if (!st[key]) { st[key] = M; p.subgoal(key === 'cols' ? 0 : 1); sfx.success(); }
        void play(M, key);
      }, undefined, 'small');
      const load = dockButton(p, 'Load', () => void loadIt(key, input.get(), msg), undefined, 'small ghost');
      const box = h('div', { class: 'glass', style: 'padding:10px 12px;display:flex;flex-direction:column;gap:8px;min-width:200px' },
        h('div', { class: 'kicker' }, title), input.el, h('div', { style: 'display:flex;gap:6px' }, turn, load), msg);
      return { box, input, msg };
    };
    const loadIt = async (key: 'cols' | 'rows', M: Mat, msg: HTMLElement, fast = false) => {
      if (p.won) return;
      if (!st.cols || !st.rows) { sfx.miss(); msg.textContent = 'Build and turn both readings first.'; return; }
      p.move();
      if (key === 'cols' && meqTol(M, READ_COLS, tol)) {
        st.loaded = M;
        await play(M, key, fast);
        if (p6Subgoals(st, tol).every(Boolean)) { p.subgoal(2); sfx.success(); p.win(); }
      } else if (key === 'rows') {
        sfx.miss();
        p.bark('lantern', 'That reading turns $\\mathbf e_1$ clockwise. The pulse turned it counterclockwise.');
      } else { sfx.miss(); msg.textContent = 'These are not the spires as columns.'; }
    };
    const cC = card('Spires as columns', 'cols', READ_COLS);
    const cR = card('Spires as rows', 'rows', READ_ROWS);
    p.dock().appendChild(h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' }, cC.box, cR.box));
    const solveAll = async (fast: boolean) => {
      cC.input.set(READ_COLS); cR.input.set(READ_ROWS);
      st.cols = READ_COLS; p.subgoal(0);
      await play(READ_COLS, 'cols', fast);
      st.rows = READ_ROWS; p.subgoal(1);
      await play(READ_ROWS, 'rows', fast);
      await loadIt('cols', READ_COLS, cC.msg, fast);
    };
    return {
      showMe: () => solveAll(false),
      solve: () => solveAll(true),
      async wrong() { cC.input.set(READ_COLS); cR.input.set(READ_ROWS); st.cols = READ_COLS; st.rows = READ_ROWS; await loadIt('rows', READ_ROWS, cR.msg, true); },
    };
  },
};

// ================================================================== c11-p7 [S] · rotation, reflection, projection

export const p7: PuzzleDef = {
  id: 'c11-p7',
  title: 'Can you build a turn, a flip and a flattening?',
  goal: 'Optional. Build each move on the bench from its description. **Pulse** to test it.',
  subgoals: ['Turn by 30°', 'Flip over the line y = x', 'Flatten onto the x-axis'],
  hints: [
    'Turning by 30° sends $\\mathbf e_1$ to (cos 30°, sin 30°) ≈ (0.866, 0.5) and $\\mathbf e_2$ to (−0.5, 0.866). Type them.',
    'The flip over $y = x$ swaps the two grid arrows: columns (0, 1) and (1, 0).',
    'Flattening onto the $x$-axis keeps $\\mathbf e_1$ and sends $\\mathbf e_2$ to the origin: columns (1, 0) and (0, 0).',
  ],
  par: 6,
  onWin: S.p7Win,
  setup(p) {
    p.g.stage.view2D({ center: [0.6, 0.4], height: 8, ms: 0 });
    const tol = p.difficulty === 'commander' ? 0.01 : 0.02;
    const bench = new Bench2(p, { draggable: true, grey: true, input: true, snap: p.snap() === null ? null : 0.5 });
    const ghost = new FlatGrid(p.g.stage, { extent: 8, color: C.white, opacity: 0.22, axisColor: C.white, width: 1.4 });
    p.add(ghost);
    let i = 0;
    const show = () => {
      const t = P7_TARGETS[i];
      ghost.set(t.M);
      ghost.show(p.difficulty !== 'commander');
      p.setGoal(`Optional. **${t.text}** Build it on the bench (drag or type), then **Pulse**.${p.difficulty === 'commander' ? '' : ' The dashed grid shows the target.'}`);
    };
    show();
    let busy = false;
    const commit = async (fast = false) => {
      if (busy || p.won) return;
      busy = true;
      p.move();
      const M = bench.get();
      ghost.show(false);
      bench.setLive(false);
      await bench.play(M, fast ? 0 : 1600);
      bench.setLive(true);
      if (meqTol(M, P7_TARGETS[i].M, tol)) {
        sfx.success();
        p.subgoal(i);
        i++;
        if (i >= P7_TARGETS.length) { p.win(); busy = false; return; }
        await pause(fast, 600);
        bench.set(identity(2));
      } else {
        sfx.miss();
        p.bark('lantern', `Not this move yet. $\\mathbf e_1$ landed on ${fmtV(col(M, 0))}, $\\mathbf e_2$ on ${fmtV(col(M, 1))}.`);
      }
      show();
      busy = false;
    };
    commitButton(p, 'Pulse', () => void commit());
    const solveAll = async (fast: boolean) => {
      while (i < P7_TARGETS.length) {
        const M = P7_TARGETS[i].M;
        await bench.to(M, fast ? 0 : 900);
        await commit(fast);
      }
    };
    return { showMe: () => solveAll(false), solve: () => solveAll(true), async wrong() { bench.set([[0, -1], [1, 0]]); await commit(true); } };
  },
};

