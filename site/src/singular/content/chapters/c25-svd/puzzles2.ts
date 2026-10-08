// Chapter 25 puzzles 5–7: one layer of the test move and Teo's voice rebuilt layer by layer (p5, LAYER),
// the Collapse pulse to six decimals (p6: Show more decimals runs the player's svd; the constellation star
// for the two-decimal model), and the shortest least-squares answer (p7 [S]).
import { CanvasTexture, LinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import type { PuzzleDef } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { FatLine } from '../../../gfx/lines';
import { Dot } from '../../../gfx/markers';
import { InfLine } from '../../../gfx/shapes';
import { Knob, ellipsePts } from '../../../kit/geom';
import { PointCloud } from '../../../kit/data';
import { h, button, inline } from '../../../ui/ui';
import { parseNum } from '../../../ui/widgets';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { lightStar, linkStars } from '../../../game/caseboard';
import { isPlayerFn, pylib } from '../../../game/build';
import { rng } from '../../../game/lawcheck';
import { matVec, norm, type Mat, type Vec } from '../../../math/la';
import { ptag, tag, v3 } from '../c24-spectral/act9';
import { checklist, msgLine } from '../c24-spectral/puzzles';
import { deg, rad } from '../c24-spectral/logic';
import {
  FITTED, K_OPTIONS, P5_E, P5_K, P7_A, P7_B, P7_START, P7_XPLUS, SV2, SV_C2, TEO, TEO_COLS, TEO_ROWS, TEO_SV, THIN,
  crewSvd, errStretch, fmtD, heard, isClear, layerError, p5Won, p5bWon, p6Won, p7Won, rebuild, storage, svdCanon, svdOk,
} from './logic';
import { SV_C } from '../../truth';
import { S } from './script';

const CHANNEL = 800;

// ------------------------------------------------------------------ the spectrogram, drawn into a canvas

const CMAP = [[4, 9, 22], [10, 44, 92], [24, 110, 170], [89, 225, 255], [232, 246, 255]];
function shade(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t)) * (CMAP.length - 1), i = Math.min(CMAP.length - 2, Math.floor(x)), f = x - i;
  return [0, 1, 2].map((k) => Math.round(CMAP[i][k] + (CMAP[i + 1][k] - CMAP[i][k]) * f)) as [number, number, number];
}
const VMAX = Math.max(...TEO.X.flat().map(Math.abs));
export function paintSpec(cv: HTMLCanvasElement, X: Mat): void {
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(TEO_COLS, TEO_ROWS);
  for (let i = 0; i < TEO_ROWS; i++) for (let j = 0; j < TEO_COLS; j++) {
    const [r, g, b] = shade((X[TEO_ROWS - 1 - i][j] / VMAX) * 1.25 + 0.08);
    const k = (i * TEO_COLS + j) * 4;
    img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// ------------------------------------------------------------------ p5 · one layer, then Teo's voice (LAYER)

export const p5: PuzzleDef = {
  id: 'c25-p5',
  title: 'How few layers carry his voice?',
  goal: '**First, the test move.** Keep only the first layer of $A$, $A_1 = \\sigma_1\\mathbf u_1\\mathbf v_1^{\\mathsf T}$. Turn $\\mathbf x$ round the circle and **lock** where the miss $(A - A_1)\\mathbf x$ is largest.',
  subgoals: ['The largest miss of one layer', 'Teo’s voice: the fewest layers that are clear'],
  hints: [
    'What is left over, $A - A_1$, is the second layer $\\sigma_2\\mathbf u_2\\mathbf v_2^{\\mathsf T}$. It flattens the circle onto a segment.',
    'Its longest reach is at $\\mathbf x = \\mathbf v_2 = (1, -1)/\\sqrt2$: a miss of $\\sigma_2 = \\sqrt5 \\approx 2.24$. For the voice, watch the bars: they drop off after the eighth.',
    'Lock $\\mathbf x$ at $-45°$. Then pick 8 layers: $8 \\times (64 + 32 + 1) = 776$ numbers, inside the channel’s 800, and his words are clear.',
  ],
  par: 4,
  onWin: S.p5Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view2D({ center: [0, 0], height: 7.4, ms: 0 });
    const grid = p.grid({ main: 0.16, base: 0, axis: 0.38 });
    const ck = checklist(['The largest miss of one layer', 'Teo’s voice: the fewest clear layers']);
    const msg = msgLine();
    const done = [false, false];
    let won = false;
    const tick = (i: number) => { if (!done[i]) { done[i] = true; p.subgoal(i); ck.tick(i); } if (done.every(Boolean) && !won) { won = true; sfx.success(); p.win(); } };
    // ---- part A: the miss of one layer
    const partA: { dispose(): void }[] = [];
    const ring = new FatLine(p.g.stage, ellipsePts([[1, 0], [0, 1]], 1, 128), { color: C.white, width: 1.3, opacity: 0.42, dashed: true, dashSize: 0.08, gapSize: 0.06 });
    const seg = new FatLine(p.g.stage, ellipsePts(P5_E, 1, 128), { color: C.result, width: 2, opacity: 0.5 });
    p.add(ring.object, seg.object); partA.push(ring, seg);
    const x = new Arrow([0, 0, 0.02], [1, 0, 0.02], { color: C.v, width: 0.045, label: '$\\mathbf x$' });
    const ex = new Arrow([0, 0, 0.01], [0, 0, 0.01], { color: C.result, width: 0.06, label: '$(A - A_1)\\mathbf x$' });
    p.add(x, ex); partA.push(x, ex);
    let theta = 60;
    const tol = d === 'cadet' ? 0.05 : d === 'navigator' ? 0.02 : 0.01;
    const r = p.readout('One layer kept');
    const paintA = () => {
      const t = rad(theta), xv = [Math.cos(t), Math.sin(t)], y = matVec(P5_E, xv);
      x.setTo([xv[0], xv[1], 0.02]);
      ex.setTo([y[0], y[1], 0.01]);
      ex.object.visible = norm(y) > 0.04;
      r.row('x', '$\\mathbf x$ at', `${Math.round(((theta % 360) + 360) % 360)}°`, C.v);
      r.row('m', 'miss $|(A - A_1)\\mathbf x|$', fmtD(errStretch(theta)), C.result);
    };
    const knob = new Knob(p, [Math.cos(rad(theta)), Math.sin(rad(theta)), 0.03], {
      color: C.v, size: 0.07,
      constrain: (q) => { let a = deg(Math.atan2(q.y, q.x)); if (d === 'cadet') a = Math.round(a / 5) * 5; theta = a; q.set(Math.cos(rad(a)), Math.sin(rad(a)), 0.03); return q; },
      onMove: () => paintA(),
    });
    // part B opens once part A is locked: Show me and solve wait on this, not on the dock's style
    let voiceP: Promise<void> | null = null;
    const lockA = () => {
      if (done[0]) return;
      p.move();
      if (p5bWon(theta, tol)) {
        tick(0); sfx.snap();
        msg.say(`Largest miss ${fmtD(errStretch(theta))} $= \\sigma_2 = \\sqrt5$, at $\\mathbf v_2$. Keeping one layer misses by at most the next singular value.`, 'good');
        voiceP = toVoice();
      } else { sfx.miss(); msg.say(`A miss of ${fmtD(errStretch(theta))} here. Somewhere it is larger.`, 'bad'); }
    };
    const btnA = button('Lock the largest miss', () => lockA(), { cls: 'primary small' });
    // ---- part B: Teo's voice
    const canvas = document.createElement('canvas');
    canvas.width = TEO_COLS; canvas.height = TEO_ROWS;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace; texture.minFilter = LinearFilter; texture.magFilter = LinearFilter;
    // between the dock (left) and the readout (right)
    const plane = new Mesh(new PlaneGeometry(4, 5), new MeshBasicMaterial({ map: texture, transparent: true, opacity: 0 }));
    plane.position.set(1, 0.1, 0.05);
    plane.visible = false;
    p.add(plane);
    p.onDispose(() => { plane.geometry.dispose(); (plane.material as MeshBasicMaterial).dispose(); texture.dispose(); });
    let k = 1;
    const bars = h('div', { class: 'a9-bars' });
    const maxS = TEO_SV[0];
    const barEls = TEO_SV.map((s) => { const b = h('div', { class: 'b', style: `height:${Math.max(2, (100 * s) / maxS)}%` }); bars.append(b); return b; });
    const words = h('div', { class: 'a9-words' });
    const meterFill = h('span');
    const meterMark = h('i', { style: `left:${(100 * CHANNEL) / storage(TEO_COLS)}%` });
    const meterVal = h('span', { class: 'val' });
    const meter = h('div', { class: 'a9-meter' }, 'numbers a second', h('div', { class: 'bar' }, meterFill, meterMark), meterVal);
    const chips = h('div', { class: 'a9-chips' });
    const chipEls = new Map<number, HTMLButtonElement>();
    for (const kk of K_OPTIONS) {
      const b = h('button', { class: 'a9-chip', type: 'button' }, `${kk} layer${kk === 1 ? '' : 's'}`) as HTMLButtonElement;
      b.addEventListener('click', () => { setK(kk); p.move(); sfx.click(); });
      chips.append(b); chipEls.set(kk, b);
    }
    const sendBtn = button('Send to Wren’s speaker', () => send(), { cls: 'primary small' });
    const partBEl = h('div', { class: 'a9-col' }, h('div', { class: 'a9-kick' }, 'Teo’s singular values · the kept layers are yellow'), bars, chips, meter, words, h('div', { class: 'a9-btns' }, sendBtn));
    partBEl.style.display = 'none';
    let lblK: ReturnType<typeof tag> | null = null;
    const setK = (kk: number) => {
      k = kk;
      paintSpec(canvas, rebuild(k));
      texture.needsUpdate = true;
      barEls.forEach((b, i) => { b.classList.toggle('on', i < k); b.classList.toggle('cut', i >= k); });
      chipEls.forEach((b, kk2) => b.classList.toggle('on', kk2 === k));
      const st = storage(k);
      meterFill.style.width = `${Math.min(100, (100 * st) / storage(TEO_COLS))}%`;
      meterFill.style.background = st > CHANNEL ? C.orange : C.accent;
      meterVal.textContent = `${st}`;
      const err = layerError(k);
      words.textContent = heard(err);
      words.classList.toggle('clear', isClear(k));
      r.row('k', 'layers kept', `${k}`, C.result);
      r.row('s', 'numbers a second', `${st} of ${CHANNEL}`, st > CHANNEL ? C.orange : C.white);
      r.row('e', 'what is lost', `${fmtD(100 * err, 1)}%`, isClear(k) ? C.good : C.orange);
      lblK?.set(`rebuilt from ${k} layer${k === 1 ? '' : 's'}`);
    };
    const toVoice = async () => {
      await wait(p.g.headless ? 5 : 900);
      for (const x0 of partA) x0.dispose();
      knob.dispose();
      grid.object.visible = false;
      btnA.remove();
      r.hideRow('x'); r.hideRow('m');
      p.setGoal('**Now Teo’s voice:** one second, 64 frequencies by 32 time slices. Rebuild it from its largest layers $\\sigma\\mathbf u\\mathbf v^{\\mathsf T}$. Send the **fewest** layers that make his words clear and fit the channel’s 800 numbers a second.');
      plane.visible = true;
      lblK = ptag(p, '', [1.4, 2.95, 0], 'c');
      ptag(p, 'time →', [2.3, -2.7, 0], 'dim');
      ptag(p, 'frequency ↑', [-0.45, 2.95, 0], 'dim');
      const kick = r.el.querySelector('.kicker');
      if (kick) kick.textContent = 'Teo’s channel';
      setK(1);
      partBEl.style.display = '';
      await animate(p.g.headless ? 1 : 700, (q) => { (plane.material as MeshBasicMaterial).opacity = q; }, ease.out);
    };
    const send = () => {
      if (!done[0] || won) return;
      p.move();
      if (p5Won(k)) { tick(1); msg.say(`Eight layers: ${storage(P5_K)} numbers a second, and every word comes through.`, 'good'); return; }
      sfx.miss();
      if (!isClear(k)) { msg.say(`${k} layer${k === 1 ? '' : 's'}: most of his words are static. His singular values are still large after layer ${k}.`, 'bad'); p.bark('lantern', `${fmtD(100 * layerError(k), 0)} percent of the signal lost. Not intelligible.`); }
      else if (storage(k) > CHANNEL) msg.say(`Clear, but ${storage(k)} numbers a second will not fit through 800. Fewer layers would do.`, 'bad');
      else msg.say('Clear, but fewer layers would do.', 'bad');
    };
    p.dock().append(ck.el, h('div', { class: 'a9-btns' }, btnA), partBEl, msg.el);
    paintA();
    const goTo = async (to: number, ms: number) => {
      const t0 = theta;
      await animate(ms, (q) => { theta = t0 + (to - t0) * q; knob.at([Math.cos(rad(theta)), Math.sin(rad(theta)), 0.03]); paintA(); }, ease.inOut);
      theta = to; knob.at([Math.cos(rad(theta)), Math.sin(rad(theta)), 0.03]); paintA();
    };
    return {
      async showMe() {
        // part A may already be locked (Show me pressed during part B): then only part B is shown
        if (!done[0]) { await goTo(-45, 1300); lockA(); }
        await voiceP;
        for (const kk of [2, 4, 8]) { setK(kk); await wait(700); }
        send();
      },
      async solve() { if (!done[0]) { theta = -45; paintA(); lockA(); } await voiceP; setK(8); send(); },
      async wrong() { theta = 45; paintA(); lockA(); },
    };
  },
};

// ------------------------------------------------------------------ p6 · the Collapse pulse, exactly

/** Show more decimals: the stretches of the fitted pulse, from the player's svd when it is written. */
export async function moreDecimals(): Promise<{ S: number[]; mine: boolean }> {
  const backup = crewSvd(FITTED)[1];
  if (!isPlayerFn('svd')) return { S: backup, mine: false };
  try {
    const r = await Promise.race([pylib.call<[Vec[], number[], Vec[]]>('svd', FITTED), new Promise<null>((res) => setTimeout(() => res(null), 8000))]);
    if (r && svdOk(r)) return { S: r[1], mine: true };
  } catch { /* the backup runs */ }
  return { S: backup, mine: false };
}

export const p6: PuzzleDef = {
  id: 'c25-p6',
  title: 'Is the stern flat, or thin?',
  goal: 'The fitted Collapse pulse squeezes a ball of buoys into a sheet. Press **Show more decimals**. Then set the stern’s thickness as a fraction of its old thickness.',
  subgoals: ['Show more decimals', 'Set the stern’s thickness'],
  hints: [
    'Two decimals hide everything below 0.005. Ask for six.',
    'The smallest stretch is the thickness: what was 1 thick is now $\\sigma_3$ thick.',
    'Type $1/750$ (or 0.001333). Not 0: zero would mean flat.',
  ],
  par: 3,
  view: '3d',
  onWin: S.p6Win,
  setup(p) {
    // three-quarter view: the sheet's broad face, seen at a slant, with its thin direction across the screen
    void p.g.stage.view3D({ target: [0.3, 0, 0], distance: 23, azimuth: 160, elevation: 17, ms: 0 });
    const r0 = rng(7500);
    const pts: number[][] = [];
    while (pts.length < 900) { const q = [r0() * 2 - 1, r0() * 2 - 1, r0() * 2 - 1]; const n = norm(q); if (n > 0.2 && n <= 1) pts.push(q.map((x) => (x / n) * 1.6)); }
    const cloud = new PointCloud(p, { points: pts, color: C.accent, size: 0.035, glow: 0.3, core: 1.3, opacity: 0.85 });
    void animate(p.g.headless ? 1 : 1600, (k) => cloud.set(pts.map((q) => matVec(FITTED.map((row, i) => row.map((x, j) => (i === j ? 1 : 0) + (x - (i === j ? 1 : 0)) * k)), q))), ease.inOut);
    const d0 = svdCanon(FITTED);
    const axes = d0.us.map((u, i) => { const a = new Arrow([0, 0, 0], v3(u.map((x) => x * 1.6 * Math.max(SV_C[i], 0.02))), { color: [C.v, C.w, C.u][i], width: 0.04 }); p.add(a); return a; });
    const labels = d0.us.map((u, i) => ptag(p, `σ${i + 1} = ${SV2[i]}`, v3(u.map((x) => x * (1.6 * Math.max(SV_C[i], 0.25) + 0.5))), ['g', 'r', 'b'][i]));
    const table = h('div', { class: 'a9-table' },
      h('span', { class: 'h' }, ''), h('span', { class: 'h' }, 'σ₁'), h('span', { class: 'h' }, 'σ₂'), h('span', { class: 'h' }, 'σ₃'));
    const rowFit = [h('span', null, 'fitted pulse'), ...SV2.map((s, i) => h('span', { class: i === 2 ? 'thin' : '' }, s))];
    table.append(...rowFit);
    const msg = msgLine();
    const ck = checklist(['Show more decimals', 'The stern’s thickness']);
    const done = [false, false];
    let won = false;
    const tick = (i: number) => { if (!done[i]) { done[i] = true; p.subgoal(i); ck.tick(i); } };
    const input = h('input', { class: 'cell a9-num', inputmode: 'decimal', placeholder: '?', 'aria-label': 'stern thickness as a fraction of its old thickness' }) as HTMLInputElement;
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') check(); });
    let busy = false;
    const more = async () => {
      if (busy || done[0]) return;
      busy = true;
      p.move();
      msg.say('Running the decomposition…');
      const { S: sv, mine } = await moreDecimals();
      busy = false;
      rowFit.slice(1).forEach((el, i) => { el.textContent = fmtD(sv[i], 6); });
      labels.forEach((l, i) => l.set(`σ${i + 1} = ${fmtD(sv[i], 6)}${i === 2 ? ' · thin, not flat' : ''}`));
      sfx.discover();
      msg.say(`${mine ? 'Computed with your `svd`.' : 'Computed with LANTERN’s backup routine. Once you write your `svd`, it reruns these decimals.'} The third stretch is not zero.`, 'good');
      tick(0);
    };
    const check = () => {
      if (won) return;
      const v = parseNum(input.value);
      if (v === null) return;
      p.move();
      if (!done[0]) { msg.say('Show more decimals first. Two decimals cannot tell thin from flat.', 'bad'); sfx.miss(); return; }
      if (Math.abs(v) < 1e-12) { sfx.miss(); msg.say('Zero says the stern is gone. The third stretch is not zero.', 'bad'); p.bark('lantern', 'Thickness zero would mean rank 2. The fitted pulse has rank 3.'); return; }
      if (p6Won(v)) {
        tick(1); won = true;
        input.classList.remove('bad'); input.style.borderColor = C.good;
        msg.say(`The stern is ${fmtD(THIN, 6)} of its old thickness: **one seven-hundred-and-fiftieth**. Thin, not flat.`, 'good');
        // the star belongs to the two-decimal model: its smallest singular value is exactly 0
        table.append(h('span', null, 'two-decimal model'), ...SV_C2.map((s, i) => h('span', { class: i === 2 ? 'thin' : '' }, i === 2 ? '0 exactly' : fmtD(s, 6))));
        lightStar('sv0');
        linkStars('sv0', 'eig0');
        p.g.toast('The smallest singular value is 0: for the two-decimal model, not for the pulse', 'Constellation · a star lights');
        sfx.star(2);
        void axes;
        p.win();
      } else { input.classList.add('bad'); sfx.miss(); msg.say(`${fmtD(v, 6)} is not it. The decimals say ${fmtD(THIN, 6)}.`, 'bad'); }
    };
    p.dock().append(table, h('div', { class: 'a9-btns' }, button('Show more decimals', () => void more(), { cls: 'primary small' })),
      h('label', { class: 'a9-row' }, h('span', { html: inline('stern thickness (old = 1):') }), input, button('Set', () => check(), { cls: 'small' })), ck.el, msg.el);
    return {
      async showMe() { await more(); input.value = '1/750'; await wait(500); check(); },
      async solve() { await more(); input.value = '1/750'; check(); },
      async wrong() { await more(); input.value = '0'; check(); },
    };
  },
};

// ------------------------------------------------------------------ p7 [S] · the shortest of the closest answers

export const p7: PuzzleDef = {
  id: 'c25-p7',
  title: 'Which input lands closest, and is the shortest?',
  goal: '$A = \\begin{bmatrix} 1 & 1 \\\\ 1 & 1 \\end{bmatrix}$ sends every input onto the line $y = x$, so nothing lands on $\\mathbf b = (2, 0)$. Drag the input $\\mathbf x$ so $A\\mathbf x$ lands as close to $\\mathbf b$ as it can, using the **shortest** $\\mathbf x$.',
  subgoals: ['Land as close to b as anything can', 'The shortest input that does'],
  hints: [
    'The closest point to $(2, 0)$ on the line $y = x$ is $(1, 1)$. Every $\\mathbf x$ with $x_1 + x_2 = 1$ lands there.',
    'Of all the points on the line $x_1 + x_2 = 1$, the shortest arrow is the one at a right angle to the line.',
    '$\\mathbf x = (0.5, 0.5)$. It is $V\\Sigma^+U^{\\mathsf T}\\mathbf b$: flip the one non-zero stretch, leave the zero at zero.',
  ],
  par: 3,
  onWin: S.p7Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view2D({ center: [0.8, 0.5], height: 6.4, ms: 0 });
    p.grid({ main: 0.22, base: 0.05, axis: 0.42 });
    const colLine = new InfLine(p.g.stage, [0, 0, 0], [1, 1, 0], { color: C.result, width: 1.4, opacity: 0.4, dashed: true, length: 12 });
    const solLine = new InfLine(p.g.stage, [0.5, 0.5, 0], [1, -1, 0], { color: C.v, width: 1.4, opacity: 0, dashed: true, length: 12 });
    p.add(colLine.object, solLine.object); p.onDispose(() => { colLine.dispose(); solLine.dispose(); });
    ptag(p, 'every $A\\mathbf x$ lands here', [2.4, 2.75, 0], 'y');
    const bDot = new Dot([P7_B[0], P7_B[1], 0.02], { color: C.w, size: 0.09 });
    p.add(bDot);
    ptag(p, '$\\mathbf b$', [P7_B[0] + 0.25, P7_B[1] - 0.25, 0], 'r');
    const ax = new Arrow([0, 0, 0.01], [0, 0, 0.01], { color: C.result, width: 0.05, label: '$A\\mathbf x$' });
    p.add(ax);
    const step = d === 'cadet' ? 0.5 : d === 'navigator' ? 0.25 : 0.05;
    const tol = d === 'commander' ? 0.03 : 0.06;
    let x: Vec = P7_START.slice();
    const r = p.readout('Input and output');
    const msg = msgLine();
    const done = [false, false];
    let won = false;
    const paint = () => {
      const y = matVec(P7_A, x);
      ax.setTo([y[0], y[1], 0.01]);
      ax.object.visible = norm(y) > 0.05;
      r.row('x', '$\\mathbf x$', `(${fmtD(x[0])}, ${fmtD(x[1])})`, C.v);
      r.row('y', '$A\\mathbf x$', `(${fmtD(y[0])}, ${fmtD(y[1])})`, C.result);
      r.row('m', 'miss $|A\\mathbf x - \\mathbf b|$', fmtD(norm([y[0] - 2, y[1]])));
      r.row('l', 'length $|\\mathbf x|$', fmtD(norm(x)));
    };
    const xh = new Knob(p, [x[0], x[1], 0.03], {
      color: C.v, size: 0.075,
      constrain: (q) => { q.set(Math.round(q.x / step) * step, Math.round(q.y / step) * step, 0.03); return q; },
      onMove: (pos) => { x = [pos[0], pos[1]]; xArrow.setTo([x[0], x[1], 0.02]); paint(); },
      onEnd: () => check(),
    });
    const xArrow = new Arrow([0, 0, 0.02], [x[0], x[1], 0.02], { color: C.v, width: 0.04, label: '$\\mathbf x$' });
    p.add(xArrow);
    const check = () => {
      if (won) return;
      if (Math.abs(x[0] + x[1] - 1) <= tol) {
        if (!done[0]) { done[0] = true; p.subgoal(0); sfx.snap(); void animate(500, (k) => solLine.line.setOpacity(0.55 * k), ease.out); msg.say('Closest: $A\\mathbf x = (1, 1)$. Every $\\mathbf x$ on the green line lands there too. Which one is shortest?', 'good'); }
        if (p7Won(x, tol)) { done[1] = true; p.subgoal(1); won = true; sfx.success(); msg.say(`$\\mathbf x = (0.5, 0.5)$, length ${fmtD(norm(P7_XPLUS))}: at a right angle to the line of answers.`, 'good'); p.win(); }
      }
    };
    p.dock().append(h('div', { class: 'a9-note' }, 'Drag the tip of the green input. Its image lands on the dashed line.'), msg.el);
    paint();
    const go = async (to: Vec, ms: number) => { const a = x.slice(); await animate(ms, (k) => { x = [a[0] + (to[0] - a[0]) * k, a[1] + (to[1] - a[1]) * k]; xh.at([x[0], x[1], 0.03]); xArrow.setTo([x[0], x[1], 0.02]); paint(); }, ease.inOut); check(); };
    return {
      async showMe() { await go(P7_START, 10); await go([1, 0], 900); await go([0.5, 0.5], 900); },
      async solve() { await go([1, 0], 1); await go([0.5, 0.5], 1); },
      async wrong() { await go([1, 0], 1); },
    };
  },
};

