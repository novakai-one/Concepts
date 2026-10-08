// Chapter 23 puzzles 5–7: fit the Collapse pulse (the Act VIII set piece), what's left over (the knock),
// and a curved fit solved two ways [S].
import { Vector3 } from 'three';
import type { PuzzleDef, V3 } from '../../../game/types';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { Parallelogram, PlanePatch } from '../../../gfx/shapes';
import { PointCloud } from '../../../kit/data';
import { Knob } from '../../../kit/geom';
import { VectorInput } from '../../../ui/widgets';
import { h, button } from '../../../ui/ui';
import { tex } from '../../../../lib/md';
import { C } from '../../../core/theme';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { col, leastSquares, type Mat } from '../../../math/la';
import {
  C2, COLLAPSE, FIT, KNOCK, KNOCK_END, KNOCK_START, LEFTOVER, P3_PTS, P7_EXACT, P7_FIT0, P7_NE, P7_QR, errOf, fmtN, fmtV,
  p5ReadOk, p6Won, qrSolve,
} from './logic';
import { tag, v3 } from './puzzles';
import { S } from './script';

// ------------------------------------------------------------------ p5 [SP] Fit the Collapse pulse

export const p5: PuzzleDef = {
  id: 'c23-p5',
  title: 'What is the Collapse pulse, past two decimals?',
  goal: 'Twenty drones: white is where each was before the pulse, yellow where it was after. Fit the pulse one row at a time: row $i$ is the best answer to $X\\mathbf c = $ (coordinate $i$ of the after-positions). Then read where $\\mathbf e_3$ lands.',
  subgoals: ['Set up the fit: what goes in A, what goes in b', 'Fit all three rows of the pulse', 'Read the third column: where e₃ lands'],
  hints: [
    'The pulse sends each before-position $\\mathbf x$ to $C\\mathbf x$. Row $i$ of $C$ times $\\mathbf x$ is coordinate $i$ of the after-position: twenty equations, three unknowns.',
    'So $A$ is the 20 × 3 matrix of before-positions, and $\\mathbf b$ is coordinate $i$ of the after-positions. Fit each row.',
    'The third column of the fitted pulse is $(1, 1, 2.004)$.',
  ],
  par: 7,
  view: '3d',
  onWin: S.spWin,
  async setup(p) {
    await p.g.stage.view3D({ target: [0, 0, 0.2], distance: 15, azimuth: -58, elevation: 22, ms: 0 });
    p.grid({ base: 0.08, main: 0.16, axis: 0.4 });
    const d = p.difficulty;
    const X = FIT.X, Y = FIT.Y;
    new PointCloud(p, { points: X, color: C.white, size: 0.07 });
    new PointCloud(p, { points: Y, color: C.result, size: 0.07 });
    const pairs = new FatSegments(p.g.stage, X.map((x, k) => [v3(x), v3(Y[k])] as [V3, V3]), { color: C.white, width: 1, opacity: 0.18 });
    p.add(pairs);
    const sheet = new PlanePatch(p.g.stage, [0, 0, 0], [1, 1, -1], { color: C.u, size: 9, opacity: 0.08 });
    p.add(sheet);
    tag(p, 'before', v3(X[0]), 'dim', [0, -18]);
    tag(p, 'after', v3(Y[0]), 'y', [0, -18]);
    const r = p.readout('The Collapse fit');
    const F: (number[] | null)[] = [null, null, null];
    const flags = [false, false, false];
    let decimals = 3;
    const tick = (i: number) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); } if (flags.every(Boolean)) finish(); };
    let done = false;
    const showF = () => {
      const M = F.map((row) => row ?? [NaN, NaN, NaN]);
      const t = `C_{\\text{fit}} = \\begin{bmatrix} ${M.map((row) => row.map((x) => (Number.isNaN(x) ? '\\cdot' : fmtN(x, decimals).replace('−', '-'))).join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;
      fitEq.innerHTML = tex(t, true);
    };
    const finish = () => {
      if (done) return;
      done = true;
      r.row('c3', 'third column, fitted', fmtV(col(F as Mat, 2), 3), C.result);
      r.row('c2', 'two-decimal model', fmtV(col(C2, 2), 2), C.white);
      r.note('Each row was its own best fit. The fit sees the third column at 2.004: the stern is not flat, only thin.');
      p.win();
    };
    // 1. set up
    let setA = d === 'cadet', setB = d === 'cadet';
    const msg = h('div', { class: 'a8-msg' });
    const chooseA = (which: 'before' | 'after') => { p.move(); if (which === 'before') { setA = true; msg.className = 'a8-msg good'; msg.textContent = 'A: the twenty before-positions, one per row.'; } else { sfx.miss(); msg.className = 'a8-msg bad'; msg.textContent = 'The pulse acts on the before-positions. They go in A.'; } if (setA && setB) { tick(0); render(); } };
    const chooseB = (which: 'after' | 'before') => { p.move(); if (which === 'after') { setB = true; msg.className = 'a8-msg good'; msg.textContent = 'b: one coordinate of the after-positions, one row of the pulse at a time.'; } else { sfx.miss(); msg.className = 'a8-msg bad'; msg.textContent = 'b holds what the pulse produced: the after-positions.'; } if (setA && setB) { tick(0); render(); } };
    // 2. fit
    let method: 'ne' | 'qr' = 'ne';
    const fitRow = async (i: number) => {
      if (!setA || !setB) { sfx.miss(); msg.textContent = 'Set up A and b first.'; return; }
      p.move();
      if (d === 'commander' && method !== 'qr') { sfx.miss(); msg.className = 'a8-msg bad'; msg.textContent = 'Commander: solve through QR. Forming AᵀA squares how much the columns can magnify rounding.'; return; }
      const b = col(Y, i);
      F[i] = method === 'qr' ? qrSolve(X, b) : leastSquares(X, b)!;
      sfx.snap();
      showF();
      if (F.every(Boolean)) { tick(1); if (d === 'cadet') { tick(2); } }
      render();
    };
    // 3. read the third column
    const readIn = new VectorInput({ dim: 3, label: 'C\\mathbf e_3 =' });
    const read = () => {
      p.move();
      if (!F.every(Boolean)) { sfx.miss(); msg.textContent = 'Fit all three rows first.'; return; }
      if (p5ReadOk(readIn.get())) { msg.className = 'a8-msg good'; msg.textContent = 'Where e₃ lands: the third column.'; sfx.success(); tick(2); }
      else { sfx.miss(); msg.className = 'a8-msg bad'; msg.textContent = 'Not this. Where e₃ lands is the third column of the fitted matrix, three decimals.'; }
    };
    const fitEq = h('div', { class: 'eq' });
    const panel = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    const render = () => {
      const kids: HTMLElement[] = [];
      if (d !== 'cadet' && !flags[0]) {
        kids.push(h('div', { class: 'a8-row' }, h('span', { class: 'k' }, 'A ='), button('before-positions', () => chooseA('before'), { cls: `small ${setA ? '' : 'ghost'}` }), button('after-positions', () => chooseA('after'), { cls: 'small ghost' })));
        kids.push(h('div', { class: 'a8-row' }, h('span', { class: 'k' }, 'b ='), button('after, one coordinate', () => chooseB('after'), { cls: `small ${setB ? '' : 'ghost'}` }), button('before, one coordinate', () => chooseB('before'), { cls: 'small ghost' })));
      } else {
        if (d === 'commander') kids.push(h('div', { class: 'a8-row' }, h('span', { class: 'k' }, 'solve by'), button('normal equations', () => { method = 'ne'; render(); }, { cls: `small ${method === 'ne' ? '' : 'ghost'}` }), button('QR: R c = Qᵀ b', () => { method = 'qr'; render(); }, { cls: `small ${method === 'qr' ? '' : 'ghost'}` })));
        kids.push(h('div', { class: 'a8-btns' }, ...[0, 1, 2].map((i) => button(F[i] ? `row ${i + 1} fitted` : `Fit row ${i + 1}`, () => void fitRow(i), { cls: `small ${F[i] ? 'ghost' : 'primary'}` }))));
        if (d !== 'cadet' && F.every(Boolean)) kids.push(h('div', { class: 'a8-row a8-in' }, readIn.el, button('Read', read, { cls: 'small' })));
      }
      kids.push(h('div', { class: 'a8-btns' }, button(decimals === 3 ? 'Show more decimals' : 'Fewer decimals', () => { decimals = decimals === 3 ? 6 : 3; showF(); render(); }, { cls: 'small ghost' })));
      panel.replaceChildren(...kids);
    };
    r.el.appendChild(fitEq);
    p.dock().append(panel, msg);
    if (d === 'cadet') tick(0);
    showF(); render();
    const ref = async () => {
      if (!flags[0]) { chooseA('before'); chooseB('after'); }
      method = 'qr';
      for (let i = 0; i < 3; i++) await fitRow(i);
      if (!flags[2]) {
        const v = col(COLLAPSE, 2).map((x) => Math.round(x * 1000) / 1000);
        readIn.set(v);
        // show all three decimals in the cells (the default display rounds to two)
        readIn.el.querySelectorAll('input').forEach((inp, i) => { (inp as HTMLInputElement).value = String(v[i]); });
        read();
      }
    };
    return {
      async showMe() { await ref(); },
      async solve() { await ref(); },
      wrong() { chooseA('after'); },
    };
  },
};

// ------------------------------------------------------------------ p6 What's left over

const SP = 0.18, AMP = 140;
const sx = (b: number) => (b - 30) * SP;           // a sample boundary (0..60) on the axis
const sampleX = (i: number) => sx(i + 0.5);

export const p6: PuzzleDef = {
  id: 'c23-p6',
  title: 'Is anything left over that is not noise?',
  goal: 'The leftover of the Collapse fit, sixty numbers in the order they were recorded. Drag the two markers to the **start** and **end** of the part that is not random.',
  predict: {
    prompt: 'If the fit is the whole story, what should the leftover look like?',
    choices: [{ id: 'noise', text: 'Small and random everywhere' }, { id: 'zero', text: 'Exactly zero' }, { id: 'line', text: 'A straight line' }],
    answer: 'noise',
    reveal: 'Small and random: every reading carries noise of about 0.002. Anything with a shape in the leftover is something the fit did not explain.',
  },
  hints: [
    'Most bars are tiny. Look for a stretch where they stand tall in a pattern.',
    'The tall bars come in groups: three single bars, three triple bars, three single bars.',
    `The pattern runs from sample ${KNOCK_START} to sample ${KNOCK_END - 1}. Put one marker right before the first tall bar and one right after the last.`,
  ],
  par: 3,
  onWin: S.p6Win,
  setup(p) {
    p.grid({ base: 0.06, main: 0.12, axis: 0.3 });
    void p.g.stage.view2D({ center: [0, 1.6], height: 7.2, ms: 0 });
    const d = p.difficulty;
    const tol = d === 'commander' ? 0 : 1;
    const bars = new FatSegments(p.g.stage, LEFTOVER.map((e, i) => [[sampleX(i), 0, 0.01], [sampleX(i), e * AMP, 0.01]] as [V3, V3]), { color: C.accent, width: 13, intensity: 1.1 });
    const axis = new FatLine(p.g.stage, [[sx(0), 0, 0], [sx(60), 0, 0]], { color: C.white, width: 1.2, opacity: 0.5 });
    p.add(bars, axis);
    tag(p, 'sample 0', [sx(0), -0.35, 0], 'dim', [20, 8]);
    tag(p, 'sample 59', [sx(60), -0.35, 0], 'dim', [-24, 8]);
    tag(p, 'noise size 0.002', [sx(5), 0.002 * AMP + 0.2, 0], 'dim', [30, -6]);
    const shade = new Parallelogram(p.g.stage, [1, 0, 0], [0, 3.0, 0], { color: C.result, opacity: 0.08, origin: [sx(10), -0.5, -0.01] });
    p.add(shade);
    let a = 10, b = 50;
    const r = p.readout('Your marks');
    const mk = (start: boolean) => new Knob(p, [sx(start ? a : b), -0.5, 0.02], {
      color: C.result, label: start ? 'start' : 'end', labelOffset: [0, 26],
      constrain: (q) => { const v = Math.max(0, Math.min(60, Math.round(q.x / SP + 30))); if (start) a = Math.min(v, b - 1); else b = Math.max(v, a + 1); return new Vector3(sx(start ? a : b), -0.5, 0.02); },
      onMove: () => draw(),
      onEnd: () => check(),
    });
    let done = false;
    const draw = () => {
      shade.set([sx(b) - sx(a), 0, 0], [0, 3.0, 0], [sx(a), -0.5, -0.01]);
      r.row('s', 'from sample', String(a), C.result);
      r.row('e', 'to sample', String(b - 1), C.result);
    };
    const check = () => {
      if (done || !p6Won(a, b, tol)) return;
      done = true;
      kA.setEnabled(false); kB.setEnabled(false);
      r.note('Three short, three long, three short. Not noise.');
      p.win();
      if (!p.g.headless) void play();
    };
    const kA = mk(true), kB = mk(false);
    draw();
    // play the leftover as sound: a playhead runs across; every tall bar taps
    const head = new FatLine(p.g.stage, [[sx(0), -0.4, 0.02], [sx(0), 2.6, 0.02]], { color: C.white, width: 1.5, opacity: 0 });
    p.add(head);
    let playing = false, gone = false;
    p.onDispose(() => { gone = true; });
    const play = async () => {
      if (playing || gone) return;
      playing = true;
      p.move();
      head.setOpacity(0.7);
      for (let i = 0; i < 60; i++) {
        // the player may move on mid-playback: stop drawing on (and tapping from) a torn-down puzzle
        if (gone) break;
        head.setPoints([[sampleX(i), -0.4, 0.02], [sampleX(i), 2.6, 0.02]]);
        if (Math.abs(LEFTOVER[i]) > 0.006) sfx.tick(KNOCK[i - KNOCK_START] === 'L' ? 1 : 4);
        await wait(p.g.headless ? 1 : 110);
      }
      if (gone) return;
      head.setOpacity(0);
      playing = false;
    };
    if (d !== 'commander') p.dock().append(h('div', { class: 'a8-btns' }, button('Play the leftover as sound', () => void play(), { cls: 'small' })));
    else p.dock().append(h('div', { class: 'a8-note' }, 'Commander: no sound. Read it from the bars.'));
    const move = async (k: Knob, to: number) => { await k.moveTo([sx(to), -0.5, 0.02], 600); };
    return {
      async showMe() { a = KNOCK_START; b = KNOCK_END; await Promise.all([move(kA, a), move(kB, b)]); draw(); check(); },
      solve() { a = KNOCK_START; b = KNOCK_END; kA.at([sx(a), -0.5, 0.02]); kB.at([sx(b), -0.5, 0.02]); draw(); check(); },
      wrong() { a = 5; b = 55; kA.at([sx(a), -0.5, 0.02]); kB.at([sx(b), -0.5, 0.02]); draw(); check(); },
    };
  },
};

// ------------------------------------------------------------------ p7 [S] A curved fit, two ways

export const p7: PuzzleDef = {
  id: 'c23-p7',
  title: 'Does the way you solve a fit change the answer?',
  style: 'mastery',
  goal: 'Fit a parabola $y = c_0 + c_1 t + c_2 t^2$ to the five readings. Then the same readings, logged at hours 300 to 304: solve through the normal equations and through QR, and pick the more accurate.',
  subgoals: ['Fit the parabola', 'Solve the hour-300 version through the normal equations', 'Solve it through QR', 'Pick the more accurate answer'],
  hints: [
    'Three unknowns: $A$ has columns 1, $t$ and $t^2$.',
    'At hours 300 to 304 the columns $1$, $t$, $t^2$ point almost the same way. $A^{\\mathsf T}A$ then loses about twice as many digits as $A$ itself.',
    'QR keeps about 14 digits, the normal equations about 6. Pick QR.',
  ],
  par: 4,
  onWin: S.p7Win,
  setup(p) {
    p.grid();
    void p.g.stage.view2D({ center: [1.1, 2.75], height: 8.2, ms: 0 });
    new PointCloud(p, { points: P3_PTS, color: C.white, size: 0.08 });
    const curve = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.result, width: 2.4 });
    curve.object.visible = false;
    p.add(curve);
    const r = p.readout('Two ways');
    const flags = [false, false, false, false];
    const tick = (i: number) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); } if (flags.every(Boolean)) p.win(); };
    const msg = h('div', { class: 'a8-msg' });
    const fit = () => {
      p.move();
      const pp: V3[] = [];
      for (let t = -0.5; t <= 4.25; t += 0.05) pp.push([t, P7_FIT0[0] + P7_FIT0[1] * t + P7_FIT0[2] * t * t, 0.01]);
      curve.setPoints(pp); curve.object.visible = true;
      r.row('p', 'parabola', `$${fmtN(P7_FIT0[0], 3)} + ${fmtN(P7_FIT0[1], 3)}t ${fmtN(P7_FIT0[2], 3).startsWith('−') ? '-' : '+'} ${fmtN(Math.abs(P7_FIT0[2]), 3)}t^2$`, C.result);
      tick(0);
    };
    const show = (k: string, label: string, x: number[]) => {
      const c = errOf(x) < 1e-9 ? C.good : C.orange;
      r.row(k, label, x[0].toFixed(6).replace('-', '−'), c);
      r.row(`${k}-e`, 'its error', errOf(x).toExponential(0).replace('-', '−'), c);
    };
    const ne = () => { p.move(); show('ne', '$c_0$ by normal equations', P7_NE); tick(1); };
    const qr = () => { p.move(); show('qr', '$c_0$ by QR', P7_QR); tick(2); };
    const pick = (which: 'ne' | 'qr') => {
      p.move();
      if (!flags[1] || !flags[2]) { msg.textContent = 'Solve both ways first.'; sfx.miss(); return; }
      if (which === 'qr') { msg.className = 'a8-msg good'; msg.textContent = 'QR. It never forms AᵀA, so it loses only about half as many digits.'; tick(3); }
      else { msg.className = 'a8-msg bad'; msg.textContent = 'The normal equations are off in the sixth digit: forming AᵀA squared how much the near-parallel columns magnify rounding.'; sfx.miss(); }
    };
    r.row('ex', 'hour-300 exact $c_0$', P7_EXACT[0].toFixed(6).replace('-', '−'));
    p.dock().append(
      h('div', { class: 'a8-btns' }, button('Fit the parabola', fit, { cls: 'small' }), button('Hours 300–304: normal equations', ne, { cls: 'small' }), button('Hours 300–304: QR', qr, { cls: 'small' })),
      h('div', { class: 'a8-row' }, h('span', { class: 'k' }, 'More accurate:'), button('normal equations', () => pick('ne'), { cls: 'small ghost' }), button('QR', () => pick('qr'), { cls: 'small ghost' })),
      msg);
    return {
      async showMe() { fit(); await wait(300); ne(); await wait(300); qr(); await wait(300); pick('qr'); },
      solve() { fit(); ne(); qr(); pick('qr'); },
      wrong() { fit(); ne(); qr(); pick('ne'); },
    };
  },
};
