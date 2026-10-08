// Chapter 11 puzzles 4–7 (GDD §6.6; puzzles 1–3 are in apply.ts): the spire numbers (3-D), both ways [H], rows or columns, and the standard moves [S].
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { BuoyField } from '../../../gfx/buoys';
import { Beacon, Dot } from '../../../gfx/markers';
import { VectorHandle } from '../../../kit/handle';
import { StepWorksheet } from '../../../kit/steps';
import { MatrixInput, VectorInput } from '../../../ui/widgets';
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { sfx } from '../../../audio/sfx';
import { col, identity, matVec, type Mat } from '../../../math/la';
import { T3partial } from './honest';
import { Bench2, Bench3, FlatGrid, playMove, ride } from './bench';
import { commitButton, dockButton, Gap, pause, step, tipToTail, TurnArc } from './parts';
import { BOW, BOW_REAL, BOW_SPIRE, fmtN, fmtV, ILSE_NINE, MEASURED, meqTol, near, p4Subgoals, PULSE, P5_A, P5_AX, P5_BEACON, P5_BEACON_LAND, P5_BENCH, P5_STEPS, p6Subgoals, P7_TARGETS, READ_COLS, READ_ROWS, SPIRES_NOW, tolFor, turnSense, VOL_REAL, VOL_SPIRE, type P4State, type P6State } from './logic';
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

