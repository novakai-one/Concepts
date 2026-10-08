// Chapter 20 puzzles 1–4: the transition matrix from the shares (p1), where the drones settle, solved on the
// row board (p2 [H] [X9]), every start ends there (p3), and why 1 is always an eigenvalue (p4 [D]).
import type { PuzzleCtx, PuzzleDef } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { Lattice3D } from '../../../gfx/shapes';
import { RowOpsBoard } from '../../../kit/rowops';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { MatrixInput } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { rng, rint } from '../../../game/lawcheck';
import { fmat } from '../../../math/frac';
import { gaussJordanSteps, isRREF } from '../../../math/rref';
import { matVec, transpose, type Mat, type Vec } from '../../../math/la';
import { DRONES, DRONES_START, DRONES_STEADY } from '../../truth';
import { Bars, ptag, sg, fslider } from '../c18-eigen/parts';
import { fmt2 } from '../c18-eigen/logic';
import { FlowBoard, Simplex, boardView, triPoint } from './board';
import {
  HOURS, ONES, P1_HOUR1, P1_HOUR2, P1_ROWS, P2_AUG, P3_STARTS, P4_DECOYS, P4_ORDER, P4_TILES, STATIONS, TOTAL, colSums, fmtN, fmtV,
  isStochastic, p1Won, settlesTo, shiftDet,
} from './logic';
import { S } from './script';

const round = (v: readonly number[]) => v.map((x) => Math.round(x * 10) / 10);
const msgBox = () => {
  const el = h('div', { class: 'a7-msg' });
  return { el, say: (t: string, k: '' | 'good' | 'bad' = '') => { el.className = `a7-msg ${k}`; el.innerHTML = inline(t); } };
};

/** The flow board with readout rows per section. */
export function board(p: PuzzleCtx, P: Mat, x0: Vec, title: string) {
  void boardView(p);
  const fb = new FlowBoard(p, { P, x0, names: STATIONS });
  const r = p.readout(title);
  const bars = new Bars(STATIONS.map((s, i) => ({ id: s, name: s, color: [C.accent, '#c9b49a', C.result][i] })), TOTAL);
  r.el.append(bars.el);
  const paint = () => { fb.x.forEach((x, i) => bars.set(STATIONS[i], x)); };
  paint();
  return { fb, r, paint, bars };
}

// ------------------------------------------------------------------ p1 · one hour

export const p1: PuzzleDef = {
  id: 'c20-p1',
  title: 'Which matrix moves the drones for one hour?',
  goal: 'All 300 drones are at the Bow. Fill in the matrix: **column** $j$ lists where the drones **from** section $j$ go (top to bottom: to Bow, to Mid, to Stern). Then **run one hour**.',
  subgoals: ['Every column adds to 1', 'One hour: the right counts'],
  predict: {
    prompt: 'One hour takes the Bow’s 300 drones to $(240, 30, 30)$. Where are they after the **second** hour?',
    choices: [{ id: 'a', text: '$(204, 51, 45)$' }, { id: 'b', text: '$(192, 54, 54)$' }, { id: 'c', text: '$(180, 60, 60)$' }],
    answer: 'a',
    reveal: `$(204, 51, 45)$. The Mid and Stern drones move by their own shares: $0.8 \\cdot 240 + 0.2 \\cdot 30 + 0.2 \\cdot 30 = 204$ to the Bow, and so on.`,
  },
  hints: [
    'Click **From Bow**, **From Mid**, **From Stern** to see each section’s shares. A section’s shares fill its **column**.',
    'From the Bow: 80% stay, 10% to Mid, 10% to Stern. That is the first column: $(0.8, 0.1, 0.1)$.',
    'The columns are $(0.8, 0.1, 0.1)$, $(0.2, 0.7, 0.1)$, $(0.2, 0.2, 0.6)$.',
  ],
  par: 3,
  onWin: S.p1Win,
  setup(p) {
    const d = p.difficulty;
    const { fb, paint } = board(p, DRONES, DRONES_START, 'The drones');
    const msg = msgBox();
    let from = 0;
    fb.showShares(from);
    const start: Mat = d === 'cadet' ? DRONES.map((r, i) => r.map((x, j) => (i === j ? x : 0))) : [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    let M: Mat = start.map((r) => r.slice());
    const sums = h('div', { class: 'a7-row c20-sums' });
    const paintSums = () => {
      if (d === 'commander') return;
      sums.replaceChildren(h('span', { class: 'k' }, 'column sums'), ...colSums(M).map((s, j) => h('span', { class: `c20-sum ${Math.abs(s - 1) < 1e-9 ? 'ok' : ''}` }, `${STATIONS[j]} ${fmtN(Math.round(s * 100) / 100)}`)));
    };
    const mi = new MatrixInput({ rows: 3, cols: 3, values: M, colourCols: true, label: 'P =', step: 0.1, onChange: (m) => { M = m; paintSums(); sg(p, 0, isStochastic(M)); } });
    mi.el.classList.add('a7-in');
    let ran = false, busy = false;
    const run = async (fast = false) => {
      if (busy || ran) return;
      p.move();
      if (!isStochastic(M)) {
        const y = matVec(M, DRONES_START);
        const tot = y.reduce((a, b) => a + b, 0);
        sfx.miss();
        const bad = colSums(M).findIndex((s) => Math.abs(s - 1) > 1e-9);
        msg.say(`This matrix sends the 300 Bow drones to ${fmtV(round(y))}: ${fmtN(Math.round(tot * 10) / 10)} drones. ${Math.abs(tot - TOTAL) > 1e-6 ? 'Drones would appear from nowhere, or vanish.' : ''} The ${STATIONS[bad]} column adds to ${fmtN(Math.round(colSums(M)[bad] * 100) / 100)}; every column must add to 1.`, 'bad');
        p.bark('lantern', `${fmtN(Math.round(tot))} drones after one hour. There are ${TOTAL}.`);
        return;
      }
      busy = true;
      fb.P = M.map((r) => r.slice());
      fb.showShares(null);
      await fb.hour(fast ? 1 : 1300);
      paint();
      busy = false;
      if (p1Won(M)) {
        ran = true;
        sg(p, 0); sg(p, 1);
        sfx.success();
        msg.say(`One hour: ${fmtV(P1_HOUR1)}. A second hour: ${fmtV(P1_HOUR2)}.`, 'good');
        if (!fast) { await wait(500); await fb.hour(1100); paint(); }
        p.win();
      } else {
        sfx.miss();
        // the first column that is not the told shares (the Bow's alone decides the first hour from the Bow)
        const wrongCol = DRONES[0].findIndex((_, j) => DRONES.some((row, i) => Math.abs(row[j] - M[i][j]) > 1e-9));
        msg.say(wrongCol > 0
          ? `The board shows ${fmtV(round(fb.x))}, as the shares say: from the Bow only the Bow column counts, and it is right. The ${STATIONS[wrongCol]} column is not. Click **From ${STATIONS[wrongCol]}** and check which column holds its shares.`
          : `The board shows ${fmtV(round(fb.x))}. The shares say ${fmtV(P1_HOUR1)}. Check which column holds each section’s shares.`, 'bad');
        // the told shares stay the board's: the From buttons show them, never the matrix that missed
        fb.P = DRONES.map((r) => r.slice());
        fb.set(DRONES_START); fb.showShares(from); paint();
      }
    };
    const fromBtns = STATIONS.map((s, j) => button(`From ${s}`, () => { from = j; fb.showShares(j); fromBtns.forEach((b, k) => b.classList.toggle('on', k === j)); }, { cls: 'small ghost' }));
    fromBtns[0].classList.add('on');
    p.dock().append(h('div', { class: 'a7-btns' }, h('span', { class: 'k' }, 'Shares:'), ...fromBtns), h('div', { class: 'a7-row' }, mi.el, button('Run one hour', () => void run(), { cls: 'primary small' })), sums, msg.el);
    paintSums();
    msg.say(d === 'cadet' ? 'The stays are filled in. Add where the leavers go.' : 'The red arrows show where one section’s drones go each hour.');
    return {
      async showMe() { mi.set(DRONES, true); await wait(400); await run(); },
      async solve() { mi.set(DRONES, true); await run(true); },
      async wrong() { mi.set(P1_ROWS, true); await run(true); },
    };
  },
};

// ------------------------------------------------------------------ p2 [H] [X9] · where it settles

export const p2: PuzzleDef = {
  id: 'c20-p2',
  title: 'Which arrangement does one more hour leave unchanged?',
  goal: 'Reduce $10(P - I)\\mathbf q = \\mathbf 0$ on the row board (same answers as $P - I$, whole numbers). Scale $\\mathbf q$ to **300** drones, then run 40 hours.',
  subgoals: ['Reduce the row board', '$\\mathbf q$, scaled to 300 drones', 'Forty hours land on it'],
  hints: [
    'Clear the first column, then the second. The third column has no pivot: $q_3$ is free.',
    'The reduced rows say $q_1 = 2.5q_3$ and $q_2 = 1.5q_3$. With $q_3 = 1$: $(2.5, 1.5, 1)$, which adds to 5.',
    'Scale by $300 / 5 = 60$: $(150, 90, 60)$.',
  ],
  par: 6,
  onWin: S.p2Win,
  setup(p) {
    const d = p.difficulty;
    void boardView(p, -2.85);
    const fb = new FlowBoard(p, { P: DRONES, x0: DRONES_START, names: STATIONS });
    const r = p.readout('The drones');
    const bars = new Bars(STATIONS.map((s, i) => ({ id: s, name: s, color: [C.accent, '#c9b49a', C.result][i] })), TOTAL);
    r.el.append(bars.el);
    const paint = () => fb.x.forEach((x, i) => bars.set(STATIONS[i], x));
    paint();
    const msg = msgBox();
    const rob = new RowOpsBoard(p, { aug: P2_AUG, n: 3, varNames: ['q_1', 'q_2', 'q_3'], title: 'The row board: 10(P − I) q = 0' });
    let reduced = d === 'commander';
    rob.subscribe((m) => { if (isRREF(m, 3)) { reduced = true; sg(p, 0); } });
    let typed = false, ran = false;
    const runHours = async (fast: boolean) => {
      if (ran) return;
      ran = true;
      for (let k = 0; k < HOURS; k++) { await fb.hour(fast ? 1 : k < 4 ? 600 : 90); paint(); }
      if (settlesTo(DRONES, DRONES_START, DRONES_STEADY)) {
        sg(p, 2); sfx.success();
        msg.say(`Forty hours: ${fmtV(round(fb.x))}. On $\\mathbf q$. Drones still move every hour; the counts no longer change.`, 'good');
        p.win();
      }
    };
    let fastRun = false, running: Promise<void> | null = null;
    const check = () => { if (typed && reduced) running = runHours(p.g.headless || fastRun); else if (typed && !reduced) msg.say('Right answer. Finish reducing the row board too, so the reading is yours.', 'bad'); };
    // one by-hand step: the board's reduced rows give q with q₃ = 1; scaling it to 300 drones is the player's
    const steps = [
      { prompt: 'With $q_3 = 1$, $\\mathbf q = (q_1, q_2, 1)$. Scaled so the three add to 300:', answer: DRONES_STEADY, mistakes: [[[2.5, 1.5, 1], 'That is $\\mathbf q$ with $q_3 = 1$: it adds to 5. Scale it to 300.'], [[0.5, 0.3, 0.2], 'Those are the shares. Scale to 300 drones.'], [[250, 150, 100], 'They add to 500. Scale so they add to 300.']] as [number[], string][] },
    ];
    const ws = new StepWorksheet(p, { steps, mount: p.dock(), onDone: () => { typed = true; sg(p, 1); check(); } });
    rob.subscribe(() => { if (typed) check(); });
    p.dock().append(msg.el);
    const ops = () => gaussJordanSteps(fmat(P2_AUG), 3).ops;
    return {
      async showMe() { await rob.play(ops(), 700); await ws.showMe(400); },
      async solve() { await rob.play(ops(), 1); fastRun = true; ws.solve(); if (running) await running; },
      wrong() { ws.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p3 · different starts

export const p3: PuzzleDef = {
  id: 'c20-p3',
  title: 'Does it matter where the drones start?',
  goal: 'Each point of the triangle is a split of the 300 drones. Run 40 hours from **all at the Bow**, **all at the Stern** and **an even split**. Then let Bram shake in random starts.',
  subgoals: ['All at the Bow', 'All at the Stern', 'An even split', 'Random starts'],
  predict: {
    prompt: 'Vell wants every drone to start at the Stern. Where do they end up after 40 hours?',
    choices: [{ id: 'a', text: 'Mostly at the Stern' }, { id: 'b', text: 'At $(150, 90, 60)$, like the Bow start' }, { id: 'c', text: 'Evenly spread' }],
    answer: 'b',
    reveal: 'At $(150, 90, 60)$. The other eigenvalues, 0.6 and 0.5, shrink every other part of the start away. Only the part along the steady arrangement survives.',
  },
  hints: ['Press the three start buttons.', 'Every path ends on the same yellow point: $(150, 90, 60)$.', 'Then press **Shake: random starts**.'],
  par: 4,
  onWin: S.p3Win,
  setup(p) {
    void p.g.stage.view2D({ center: [0, 1.5], height: 10.5, ms: 0 });
    const sx = new Simplex(p, DRONES, STATIONS);
    const q = triPoint(DRONES_STEADY);
    const star = new Dot([q[0], q[1], 0.05], { color: C.result, size: 0.13 });
    p.add(star);
    ptag(p, fmtV(DRONES_STEADY), q, 'y', [0, 22]);
    const r = p.readout('Forty hours');
    const msg = msgBox();
    const done = [false, false, false, false];
    const names = ['all at the Bow', 'all at the Stern', 'an even split'];
    names.forEach((n, i) => r.row(`s${i}`, n, 'not run yet'));
    const colors = [C.v, C.w, C.u];
    let busy = false;
    const go = async (i: number, fast = false) => {
      if (busy || done[i]) return;
      busy = true; p.move();
      const end = await sx.grow(i, P3_STARTS[i], HOURS, colors[i], fast ? 1 : 1400);
      busy = false;
      r.row(`s${i}`, names[i], fmtV(end.map((x) => Math.round(x))), colors[i]);
      if (settlesTo(DRONES, P3_STARTS[i], DRONES_STEADY)) { done[i] = true; sg(p, i); sfx.snap(); }
      if (done[0] && done[1] && done[2]) msg.say('Three starts, one end. Now the random ones.', 'good');
    };
    const shake = async (fast = false) => {
      if (busy || !(done[0] && done[1] && done[2]) || done[3]) { if (!done[3]) msg.say('Run the three starts first.', 'bad'); return; }
      busy = true; p.move();
      const R = rng(2077);
      for (let k = 0; k < 5; k++) {
        const x = [rint(R, 0, 10), rint(R, 0, 10), rint(R, 0, 10)];
        const s = x.reduce((a, b) => a + b, 0) || 1;
        await sx.grow(3 + k, x.map((t) => (t / s) * TOTAL), HOURS, '#9aa7bd', fast ? 1 : 700);
      }
      busy = false;
      done[3] = true; sg(p, 3);
      sfx.success();
      msg.say('Every start ends at $(150, 90, 60)$. The start does not matter.', 'good');
      p.win();
    };
    p.dock().append(h('div', { class: 'a7-btns' }, ...names.map((n, i) => button(n[0].toUpperCase() + n.slice(1), () => void go(i), { cls: 'small' })), button('Shake: random starts', () => void shake(), { cls: 'primary small' })), msg.el);
    return {
      async showMe() { for (let i = 0; i < 3; i++) await go(i); await shake(); },
      async solve() { for (let i = 0; i < 3; i++) await go(i, true); await shake(true); },
      async wrong() { await go(0, true); },
    };
  },
};

// ------------------------------------------------------------------ p4 [D] · why 1 is always an eigenvalue

export const p4: PuzzleDef = {
  id: 'c20-p4',
  title: 'Why does every such matrix have eigenvalue 1?',
  goal: '**1.** Send the all-ones arrow $\\mathbf 1$ through $P^{\\mathsf T}$. **2.** Turn the λ dial on $P$ until $P - \\lambda I$ flattens at $\\lambda = 1$, and lock it. **3.** Say why.',
  subgoals: ['$P^{\\mathsf T}\\mathbf 1 = \\mathbf 1$', 'Lock $\\lambda = 1$ on the dial', 'Where the formula comes from'],
  hints: [
    'Row $j$ of $P^{\\mathsf T}$ is column $j$ of $P$, and each column adds to 1. So each entry of $P^{\\mathsf T}\\mathbf 1$ is 1.',
    'So $P^{\\mathsf T} - I$ sends $\\mathbf 1$ to the origin and flattens space. A matrix and its transpose have the same determinant, so $P - I$ flattens too.',
    'Stop the dial at λ = 1 and lock it. (It also flattens at 0.6 and 0.5: the other eigenvalues.)',
  ],
  par: 4,
  view: '3d',
  onWin: S.p4Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view3D({ target: [0, 0, 0.3], distance: 12, azimuth: -55, elevation: 22 });
    const lat = new Lattice3D(p.g.stage, { extent: 2, opacity: 0.32, color: C.violet });
    p.add(lat);
    const one = new Arrow([0, 0, 0], [1.6, 1.6, 1.6], { color: C.white, width: 0.05, label: '$\\mathbf 1$' });
    const img = new Arrow([0, 0, 0], [1.6, 1.6, 1.6], { color: C.result, width: 0.04 });
    p.add(one, img);
    img.setOpacity(0);
    let l = 0;
    const shifted = (x: number): Mat => DRONES.map((r, i) => r.map((v, j) => v - (i === j ? x : 0)));
    const r = p.readout('The dial on P');
    const msg = msgBox();
    const done = [false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; sg(p, i); } };
    let derived = d === 'cadet';
    const winCheck = () => { if (derived) tick(2); if (done[0] && done[1] && derived && !p.won) { sfx.success(); msg.say('Columns add to 1, so $P^{\\mathsf T}\\mathbf 1 = \\mathbf 1$; a transpose keeps the determinant, so $\\det(P - I) = 0$.', 'good'); p.win(); } };
    const paint = () => {
      lat.set(shifted(l));
      r.row('l', 'λ', fmtN(Math.round(l * 100) / 100), C.accent);
      r.row('d', '$\\det(P - \\lambda I)$', fmt2(shiftDet(DRONES, l)), Math.abs(shiftDet(DRONES, l)) < 1e-9 ? C.violet : C.white);
      r.row('s', 'column sums of $P$', colSums(DRONES).map((s) => fmtN(Math.round(s * 100) / 100)).join(', '));
    };
    const applyT = async (fast = false) => {
      if (done[0]) return;
      p.move();
      const y = matVec(transpose(DRONES), ONES);
      img.setOpacity(1);
      await animate(fast ? 1 : 1100, (t) => img.set([0, 0, 0.02], [1.6 * (1 + (y[0] - 1) * t), 1.6 * (1 + (y[1] - 1) * t), 1.6 * (1 + (y[2] - 1) * t) + 0.02]), ease.inOut);
      r.row('pt', '$P^{\\mathsf T}\\mathbf 1$', fmtV(y.map((x) => Math.round(x * 1000) / 1000)), C.result);
      tick(0); sfx.snap();
      msg.say('$P^{\\mathsf T}\\mathbf 1 = \\mathbf 1$: each row of $P^{\\mathsf T}$ is a column of $P$, and each adds to 1.', 'good');
      winCheck();
    };
    const lock = (x: number) => {
      if (Math.abs(shiftDet(DRONES, x)) > 1e-9) { sfx.miss(); msg.say(`At λ = ${fmtN(x)} the lattice still has volume ${fmt2(shiftDet(DRONES, x))}.`, 'bad'); return; }
      if (Math.abs(x - 1) > 1e-9) { sfx.snap(); msg.say(`Flat at λ = ${fmtN(x)} too: another eigenvalue of the drone chain. The one every such matrix has is 1.`); return; }
      sfx.collapse(); p.g.stage.nudge(0.06);
      tick(1);
      msg.say('Flat at λ = 1. The arrangement it sends to the origin is the steady one: $(150, 90, 60)$, scaled.', 'good');
      winCheck();
    };
    const step = d === 'commander' ? 0.01 : 0.05;
    const slider = fslider({ label: 'dial $\\lambda$', min: -0.2, max: 1.4, step, value: 0, format: (x) => fmtN(Math.round(x * 100) / 100), onInput: (x) => { l = x; paint(); if (d === 'cadet' && Math.abs(x - 1) < 1e-9) lock(1); } });
    slider.el.addEventListener('change', () => p.move());
    const box = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    let ws: StepWorksheet | null = null, tiles: TileOrder | null = null, last: StepWorksheet | null = null;
    let submit: ((o: string[]) => void) | null = null;
    const onDerived = () => { derived = true; winCheck(); };
    if (d === 'navigator') {
      ws = new StepWorksheet(p, {
        title: 'Where the formula comes from · each step is checked', mount: box, onDone: onDerived,
        steps: [
          { prompt: 'The column sums of $P$', answer: [1, 1, 1] },
          { prompt: '$P^{\\mathsf T}\\mathbf 1$', answer: [1, 1, 1], mistakes: [[[1.2, 1, 0.8], 'That is $P\\mathbf 1$: row sums. Use $P^{\\mathsf T}$, whose rows are the columns of $P$.']] as [number[], string][] },
          { prompt: '$\\det(P^{\\mathsf T} - I) = \\det(P - I) =$', answer: 0 },
        ],
      });
    } else if (d === 'commander') {
      submit = (o: string[]) => {
        p.move();
        if (o.join() !== P4_ORDER.join()) { sfx.miss(); msg.say('Not in that order. Start from the column sums.', 'bad'); return; }
        sfx.snap(); msg.say('Right. Now the last line.', 'good');
        if (!last) last = new StepWorksheet(p, { title: 'The last line · only the answer is checked', mount: box, onDone: onDerived, steps: [{ prompt: '$\\det(P - I) =$', answer: 0 }] });
      };
      tiles = new TileOrder(p, { tiles: P4_TILES, decoys: P4_DECOYS, mount: box, title: 'Why 1 is an eigenvalue: put the reason in order', submitLabel: 'Check the order', onSubmit: submit });
    }
    p.dock().append(h('div', { class: 'a7-btns' }, button('Send 1 through Pᵀ', () => void applyT(), { cls: 'primary small' })), h('div', { class: 'a7-row' }, slider.el, d === 'cadet' ? null : button('Lock λ', () => { p.move(); lock(l); }, { cls: 'small' })), box, msg.el);
    paint();
    const derive = async (fast: boolean) => {
      if (ws) { if (fast) ws.solve(); else await ws.showMe(380); }
      if (tiles) { tiles.set(P4_ORDER); submit?.(P4_ORDER); const lw = last as StepWorksheet | null; if (lw) { if (fast) lw.solve(); else await lw.showMe(300); } }
    };
    const goTo = async (x: number, ms: number) => { const x0 = l; await animate(ms, (t) => { l = x0 + (x - x0) * t; paint(); }, ease.inOut); l = x; slider.set(x, false); paint(); };
    return {
      async showMe() { await applyT(); await goTo(1, 1400); lock(1); await derive(false); },
      async solve() { await applyT(true); l = 1; slider.set(1, false); paint(); lock(1); await derive(true); },
      async wrong() { await applyT(true); l = 0.6; slider.set(0.6, false); paint(); lock(0.6); },
    };
  },
};

