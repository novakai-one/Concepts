// The Act IX set piece, Thin, Not Gone (GDD §6.11): try the raw inverse on a test cluster (sp1), try to undo
// the two-decimal model (sp2), choose how many readings to average (sp3), brace along the principal axes (sp4),
// write the undo for today in the Anchor's grid (sp5), the optional split into two gentler pulses (sp7 [S]),
// and the Unfold itself (sp6): the stern fills back out of a sheet along C^(1−t), never flat on the way.
import type { PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { Dot } from '../../../gfx/markers';
import { InfLine, PlanePatch } from '../../../gfx/shapes';
import { Knob } from '../../../kit/geom';
import { PointCloud } from '../../../kit/data';
import { Slider, parseNum } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { tex } from '../../../../lib/md';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { music } from '../../../audio/music';
import { rng } from '../../../game/lawcheck';
import { makeAnchor } from '../../common/set';
import { C2 } from '../../truth';
import { det, dot, matVec, norm, normalize, type Mat, type Vec } from '../../../math/la';
import { arkSet, ptag, tag, unfoldPath, v3 } from '../c24-spectral/act9';
import { checklist, msgLine } from '../c24-spectral/puzzles';
import { symEig } from '../c24-spectral/logic';
import {
  AMPLIFY, C2_BACK, CARDS, CONDITION, HOLD_LIMIT, NOISE, RAW_ERROR, READINGS, SP2_DIRS, SP4_THETA, SP5_REF, SPIRE_LENGTHS,
  SPLIT_BEST, TEAR, THIN_DIR, braceFrame, fmtD, fmtN, mixedStress, railProduct, sp1Won, sp2Won, sp3Won, sp4Won, sp5Won, sp7Won,
  splitStretch, unfoldError, unfoldGrade,
} from './logic';
import { S } from './script';

/** What the player set during the set piece (the reference when a step was skipped). */
export const SP = { N: READINGS, braced: true, settings: true };

function gauss(r: () => number): number { const u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// ------------------------------------------------------------------ sp1 · try it raw

export const sp1: PuzzleDef = {
  id: 'c25-sp1',
  title: 'What does the raw undo do to a test cluster?',
  goal: 'The undo is built from readings with noise of 0.01. **Fire it** at the cluster of test buoys. Then drag the yellow ring along the thin line to where the cluster landed, and **measure** how far off it is.',
  subgoals: ['Fire the raw undo', 'Measure how far off the cluster landed'],
  predict: {
    prompt: 'Each reading is off by 0.01 along the thin line, where the pulse squeezed by 1/750. How far off will the cluster land?',
    choices: [{ id: 'a', text: '0.01' }, { id: 'b', text: '0.75' }, { id: 'c', text: '7.5' }, { id: 'd', text: '750' }],
    answer: 'c',
    reveal: 'The undo stretches the thin line by 750, errors and all: $0.01 \\times 750 = 7.5$.',
  },
  hints: [
    'The undo of the pulse stretches the thin direction by $1/\\sigma_3 = 750$.',
    'The error along that direction grows from 0.01 to $0.01 \\times 750$.',
    'Drag the ring 7.5 along the line and measure.',
  ],
  par: 3,
  view: '3d',
  onWin: S.sp1Win,
  setup(p) {
    const d = p.difficulty;
    // the set piece starts here: forget a previous run's choices (a skipped step uses the reference)
    Object.assign(SP, { N: READINGS, braced: true, settings: true });
    void p.g.stage.view3D({ target: [1.6, 1.6, -1.0], distance: 20, azimuth: -28, elevation: 18, ms: 0 });
    const c0: V3 = [0, 0, 0.6];
    const right: V3 = [Math.sin((28 * Math.PI) / 180), Math.cos((28 * Math.PI) / 180), 0];   // screen right for this camera
    const line = new InfLine(p.g.stage, c0, v3(THIN_DIR), { color: C.white, width: 1.4, opacity: 0.4, dashed: true, length: 30 });
    p.add(line.object); p.onDispose(() => line.dispose());
    ptag(p, 'the thin line, about (1, 1, −1)', [0, 1, 2].map((i) => c0[i] + THIN_DIR[i] * 3.75 + right[i] * 1.3) as V3, 'dim');
    const r0 = rng(251);
    const ball: number[][] = [];
    while (ball.length < 70) { const q = [r0() * 2 - 1, r0() * 2 - 1, r0() * 2 - 1]; if (norm(q) <= 1) ball.push(q.map((x, i) => c0[i] + x * 0.45)); }
    const home = new PointCloud(p, { points: ball, color: C.white, size: 0.035, opacity: 0.35, glow: 0.2, core: 1 });
    const cluster = new PointCloud(p, { points: ball, color: C.accent, size: 0.05, glow: 0.4, core: 1.4 });
    ptag(p, 'where the cluster should be', [c0[0] + right[0] * 1.6, c0[1] + right[1] * 1.6, c0[2] + 0.7], 'c');
    void home;
    let fired = false, won = false;
    const r = p.readout('The raw undo');
    r.row('n', 'reading noise', fmtD(NOISE, 2));
    r.row('a', 'stretch along the thin line', `× ${fmtN(Math.round(AMPLIFY))}`);
    const msg = msgLine();
    const tol = d === 'cadet' ? 0.6 : d === 'navigator' ? 0.4 : 0.25;
    let dist = 1.2;
    const at = (s: number): V3 => [c0[0] + THIN_DIR[0] * s, c0[1] + THIN_DIR[1] * s, c0[2] + THIN_DIR[2] * s];
    const ruler = new FatLine(p.g.stage, [c0, at(dist)], { color: C.result, width: 2.2, opacity: 0.9 });
    p.add(ruler.object); p.onDispose(() => ruler.dispose());
    const ring = new Knob(p, at(dist), {
      color: C.result, size: 0.1,
      constrain: (q) => { const s = (q.x - c0[0]) * THIN_DIR[0] + (q.y - c0[1]) * THIN_DIR[1] + (q.z - c0[2]) * THIN_DIR[2]; dist = Math.max(0, Math.min(12, d === 'cadet' ? Math.round(s * 2) / 2 : s)); const w = at(dist); q.set(w[0], w[1], w[2]); return q; },
      onMove: () => paint(),
    });
    const paint = () => { ruler.setPoints([c0, at(dist)]); r.row('d', 'ring distance', fmtD(dist, 2), C.result); };
    const fire = async () => {
      if (fired) return;
      fired = true;
      p.move();
      p.subgoal(0);
      sfx.whoosh(1.4);
      const off = THIN_DIR.map((x) => x * RAW_ERROR);
      await cluster.to(ball.map((q) => q.map((x, i) => x + off[i])), p.g.headless ? 10 : 1800, C.orange);
      p.g.stage.nudge(0.1);
      sfx.alarm();
      msg.say('The cluster flew off along the thin line. Measure how far.', 'bad');
    };
    const measure = () => {
      if (won) return;
      p.move();
      if (!fired) { msg.say('Fire the undo first.', 'bad'); sfx.miss(); return; }
      if (sp1Won(dist, tol)) { won = true; p.subgoal(1); sfx.success(); msg.say(`${fmtD(RAW_ERROR, 1)} off: the noise, ${fmtD(NOISE, 2)}, times ${fmtN(Math.round(AMPLIFY))}. The largest stretch is 3.00, the smallest 0.0013: their ratio is about ${fmtN(Math.round(CONDITION))}.`, 'good'); p.win(); }
      else { sfx.miss(); msg.say(`The ring is ${fmtD(dist, 2)} out. The cluster is ${dist < RAW_ERROR ? 'further' : 'nearer'}.`, 'bad'); }
    };
    p.dock().append(h('div', { class: 'a9-btns' }, button('Fire the raw undo', () => void fire(), { cls: 'primary small' }), button('Measure', () => measure(), { cls: 'small' })), msg.el);
    paint();
    const goTo = async (s: number, ms: number) => { const s0 = dist; await animate(ms, (k) => { dist = s0 + (s - s0) * k; ring.at(at(dist)); paint(); }, ease.inOut); };
    return {
      async showMe() { await fire(); await goTo(RAW_ERROR, 1300); measure(); },
      async solve() { await fire(); dist = RAW_ERROR; ring.at(at(dist)); paint(); measure(); },
      async wrong() { await fire(); dist = 0.75; paint(); measure(); },
    };
  },
};

// ------------------------------------------------------------------ sp2 · try the exact model

export const sp2: PuzzleDef = {
  id: 'c25-sp2',
  title: 'Can the two-decimal model be undone?',
  goal: 'The test lattice lies flat under the two-decimal model $C_2$. Try to **undo** it. Then bring it back with $V\\Sigma^+U^{\\mathsf T}$, and find **two different points** that come back as one.',
  subgoals: ['Try to undo the model', 'Bring it back with the flipped stretches', 'Two different points that come back as one'],
  hints: [
    '$\\det C_2 = 0$: it has no inverse.',
    '$V\\Sigma^+U^{\\mathsf T}$ flips the stretches 3 and 1, and leaves the zero at zero. The lattice comes back as a sheet.',
    'Move point $\\mathbf b$ away from $\\mathbf a$ along $(1, 1, -1)$: $C_2$ sends that direction to the origin, so both land on one spot.',
  ],
  par: 5,
  view: '3d',
  onWin: S.sp2Win,
  setup(p) {
    void p.g.stage.view3D({ target: [0, 0, 0.2], distance: 11, azimuth: -50, elevation: 20, ms: 0 });
    const grid: number[][] = [];
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) for (let k = -2; k <= 2; k++) grid.push([i * 0.45, j * 0.45, k * 0.45]);
    const cloud = new PointCloud(p, { points: grid.map((q) => matVec(C2, q)), color: C.accent, size: 0.04, glow: 0.3, core: 1.3, opacity: 0.85 });
    const plane = new PlanePatch(p.g.stage, [0, 0, 0], [1, 1, -1], { color: '#9fb6d8', size: 5, opacity: 0.5 });
    p.add(plane);
    const nul = new InfLine(p.g.stage, [0, 0, 0], [1, 1, -1], { color: C.violet, width: 2, opacity: 0.6, dashed: true, length: 9 });
    p.add(nul.object); p.onDispose(() => nul.dispose());
    ptag(p, 'null space of $C_2$', [1.9, 1.9, -1.6], 'vi');
    const ck = checklist(['Try to undo $C_2$', 'Bring it back with $V\\Sigma^+U^{\\mathsf T}$', 'Two points that come back as one']);
    const msg = msgLine();
    const done = [false, false, false];
    let won = false;
    const tick = (i: number) => { if (!done[i]) { done[i] = true; p.subgoal(i); ck.tick(i); } if (done.every(Boolean) && !won) { won = true; sfx.success(); p.win(); } };
    const r = p.readout('The two-decimal model');
    r.row('d', '$\\det C_2$', fmtD(det(C2), 2));
    const undo = () => {
      p.move();
      sfx.miss(); p.g.stage.flash(0.15, 300);
      p.bark('lantern', 'No inverse. Rank 2.');
      msg.say('No inverse: $\\det C_2 = 0$. Rank 2. A whole line of directions went to the origin.', 'bad');
      tick(0);
    };
    let back = false;
    const plus = async () => {
      if (back) return;
      back = true;
      p.move();
      sfx.whoosh(1.2);
      await cloud.to(grid.map((q) => matVec(C2_BACK, q)), p.g.headless ? 10 : 1500, C.accent);
      msg.say('Back, but as a **sheet**: every point lost its $(1, 1, -1)$ part. The stretch that was exactly 0 cannot be flipped.');
      tick(1);
      pair.style.display = '';
    };
    // two points: a fixed, b = a + s·d
    const a: Vec = [0.9, -0.4, 0.5];
    let dirI = 0, s = 1;
    const dA = new Dot(v3(a), { color: C.v, size: 0.1 });
    const dB = new Dot(v3(a), { color: C.w, size: 0.1 });
    const lA = new Dot([0, 0, 0], { color: C.v, size: 0.07 });
    const lB = new Dot([0, 0, 0], { color: C.w, size: 0.07 });
    const link = new FatSegments(p.g.stage, [[[0, 0, 0], [0, 0, 0]]], { color: C.white, width: 1.1, opacity: 0.5, dashed: true, dashSize: 0.08, gapSize: 0.06 });
    p.add(dA, dB, lA, lB, link.object); p.onDispose(() => link.dispose());
    [dA, dB, lA, lB].forEach((x) => { x.object.visible = false; });
    const tA = tag('$\\mathbf a$', [0, 0, 0], 'g', [12, -14]), tB = tag('$\\mathbf b$', [0, 0, 0], 'r', [12, -14]);
    p.add(tA.object, tB.object); p.onDispose(() => { tA.dispose(); tB.dispose(); });
    tA.show(false); tB.show(false);
    const bPt = (): Vec => a.map((x, i) => x + s * SP2_DIRS[dirI][i] * (dirI === 3 ? 1 / Math.sqrt(3) : 1));
    const paintPair = () => {
      const b = bPt();
      const ya = matVec(C2, a), yb = matVec(C2, b);
      dA.at(v3(a)); dB.at(v3(b)); lA.at(v3(ya)); lB.at(v3(yb));
      tA.at(v3(a)); tB.at(v3(b));
      link.setSegments([[v3(a), v3(ya)], [v3(b), v3(yb)]]);
      const same = norm(ya.map((x, i) => x - yb[i])) < 1e-9;
      r.row('a', '$C_2\\mathbf a$', `(${ya.map((x) => fmtD(x)).join(', ')})`, C.v);
      r.row('b', '$C_2\\mathbf b$', `(${yb.map((x) => fmtD(x)).join(', ')})`, same ? C.v : C.w);
      if (sp2Won(a, b)) { msg.say('Two different points, one landing spot. Coming back, both get the same answer, so **no undo can tell them apart**. Exactly zero: gone, by anyone.', 'good'); tick(2); }
    };
    const chips = h('div', { class: 'a9-chips' });
    const dirNames = ['$(1, 0, 0)$', '$(0, 1, 0)$', '$(1, -1, 0)$', '$(1, 1, -1)$'];
    dirNames.forEach((n, i) => { const b = h('button', { class: `a9-chip ${i === 0 ? 'on' : ''}`, type: 'button', html: inline(n) }); b.addEventListener('click', () => { dirI = i; p.move(); chips.querySelectorAll('button').forEach((x, k) => x.classList.toggle('on', k === i)); paintPair(); }); chips.append(b); });
    const slider = new Slider({ label: 'distance from $\\mathbf a$', min: 0, max: 2, step: 0.25, value: s, format: (x) => fmtD(x), onInput: (x) => { s = x; paintPair(); } });
    const pair = h('div', { class: 'a9-col' }, h('div', { class: 'a9-kick' }, 'Point b = a + a step along'), chips, slider.el);
    pair.style.display = 'none';
    const showPair = () => { [dA, dB, lA, lB].forEach((x) => { x.object.visible = true; }); tA.show(true); tB.show(true); paintPair(); };
    const btnPlus = button('Bring it back', () => void plus().then(showPair), { cls: 'small' });
    btnPlus.innerHTML = inline('Bring it back with $V\\Sigma^+U^{\\mathsf T}$');
    const btnUndo = button('Undo', () => undo(), { cls: 'small primary' });
    btnUndo.innerHTML = inline('Undo with $C_2^{-1}$');
    p.dock().append(h('div', { class: 'a9-btns' }, btnUndo, btnPlus), pair, ck.el, msg.el);
    return {
      async showMe() { undo(); await wait(600); await plus(); showPair(); await wait(500); dirI = 3; chips.querySelectorAll('button').forEach((x, k) => x.classList.toggle('on', k === 3)); paintPair(); await wait(300); for (const v of [0.5, 1, 1.5]) { s = v; slider.set(v, false); paintPair(); await wait(250); } },
      async solve() { undo(); await plus(); showPair(); dirI = 3; s = 1; paintPair(); },
      async wrong() { undo(); await plus(); showPair(); dirI = 0; s = 1; paintPair(); },
    };
  },
};

// ------------------------------------------------------------------ sp3 · clean the readings

export const sp3: PuzzleDef = {
  id: 'c25-sp3',
  title: 'How many readings, averaged, keep the stern from tearing?',
  goal: 'Averaging $N$ readings divides the noise by $\\sqrt N$. After the undo, the error is $0.01 \\times 750/\\sqrt N$. The frame tears above **0.3**, and Teo can hold still for at most 700 readings. Choose $N$.',
  subgoals: ['An error of at most 0.3, in time'],
  hints: [
    'Solve $0.01 \\times 750/\\sqrt N \\le 0.3$: $7.5/\\sqrt N \\le 0.3$.',
    '$\\sqrt N \\ge 7.5/0.3 = 25$.',
    '$N = 25^2 = 625$.',
  ],
  par: 2,
  onWin: S.sp3Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view2D({ center: [0, 0.2], height: 5.4, ms: 0 });
    // the thin line drawn across the screen (scaled ×6), the tear limit as a band, the averaged readings as dots
    const SC = 6;
    const band = new FatSegments(p.g.stage, [[[-TEAR * SC, -1.4, 0], [-TEAR * SC, 1.4, 0]], [[TEAR * SC, -1.4, 0], [TEAR * SC, 1.4, 0]]], { color: C.orange, width: 2, opacity: 0.8, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    const axis = new FatLine(p.g.stage, [[-5, 0, 0], [5, 0, 0]], { color: C.white, width: 1.2, opacity: 0.4 });
    p.add(band.object, axis.object); p.onDispose(() => { band.dispose(); axis.dispose(); });
    // inside the two lines, clear of the objective card
    ptag(p, 'tear limit', [TEAR * SC - 0.45, 1.65, 0], 'o'); ptag(p, 'tear limit', [-TEAR * SC + 0.45, 1.65, 0], 'o');
    ptag(p, 'error along the thin line (× 6)', [0, -1.75, 0], 'dim');
    const r0 = rng(625);
    const zs = Array.from({ length: 90 }, () => [gauss(r0), (r0() - 0.5) * 2.4]);
    const dots = new PointCloud(p, { points: zs.map(() => [0, 0, 0]), color: C.accent, size: 0.05, glow: 0.35, core: 1.3 });
    let N = d === 'cadet' ? 25 : 100;
    const r = p.readout('Averaged readings');
    const msg = msgLine();
    let won = false;
    const paint = () => {
      const e = unfoldError(N);
      dots.set(zs.map(([g, y]) => [Math.max(-4.8, Math.min(4.8, g * e * SC * 0.55)), y, 0.01]));
      dots.setColor(e <= TEAR + 1e-6 ? C.accent : C.orange);
      r.row('n', 'readings $N$', `${N}`, C.result);
      if (d !== 'commander') r.row('e', 'error after the undo', fmtD(e, 3), e <= TEAR + 1e-6 ? C.good : C.orange);
      r.row('h', 'Teo holds still for', `${N} of ${HOLD_LIMIT}`, N <= HOLD_LIMIT ? C.white : C.orange);
    };
    const commit = () => {
      if (won) return;
      p.move();
      if (sp3Won(N)) { won = true; SP.N = N; p.subgoal(0); msg.say(`$0.01 \\times 750/\\sqrt{${N}} = ${fmtD(unfoldError(N), 2)}$: inside the tear limit. ${N === READINGS ? 'The fewest that will do.' : ''}`, 'good'); p.win(); return; }
      sfx.miss();
      if (N > HOLD_LIMIT) msg.say(`${N} readings take too long: Teo cannot hold still that long. Fewer will do.`, 'bad');
      else msg.say(`Error ${fmtD(unfoldError(N), 2)}: above 0.3, the frame tears. More readings.`, 'bad');
    };
    let inpRef: HTMLInputElement | null = null;
    if (d === 'cadet') {
      const sl = new Slider({ label: 'readings $N$', min: 25, max: 1000, step: 25, value: N, format: (x) => `${x}`, onInput: (x) => { N = x; paint(); } });
      sl.el.addEventListener('change', () => p.move());
      p.dock().append(sl.el, h('div', { class: 'a9-btns' }, button('Start the count', () => commit(), { cls: 'primary small' })), msg.el);
    } else {
      const inp = h('input', { class: 'cell a9-num', inputmode: 'numeric', value: String(N), 'aria-label': 'number of readings' }) as HTMLInputElement;
      const set = () => { const v = parseNum(inp.value); if (v === null || v < 1) return; N = Math.round(v); paint(); };
      inp.addEventListener('input', set);
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { set(); commit(); } });
      p.dock().append(h('label', { class: 'a9-row' }, h('span', { html: inline('readings $N =$') }), inp, button('Start the count', () => { set(); commit(); }, { cls: 'primary small' })), msg.el);
      inpRef = inp;
    }
    paint();
    const setN = (v: number) => { N = v; if (inpRef) inpRef.value = String(v); paint(); };
    return {
      async showMe() { for (const v of [100, 400, 625]) { setN(v); await wait(600); } commit(); },
      solve() { setN(READINGS); commit(); },
      wrong() { setN(25); commit(); },
    };
  },
};

// ------------------------------------------------------------------ sp4 · brace

export const sp4: PuzzleDef = {
  id: 'c25-sp4',
  title: 'Where do the braces go?',
  goal: 'One brace sits on the stern’s hinge, $(1, -1, 0)$. Turn the other two about it until the stress readout shows **no mixed stress**: the braces on the principal axes of the Collapse pulse.',
  subgoals: ['No mixed stress'],
  hints: [
    'The mixed stress is $\\mathbf q_1^{\\mathsf T}C\\,\\mathbf q_3$. It is zero only when both braces are eigenvectors of $C$.',
    'The first brace should end up close to $(1, 1, 2)$: about 35° from straight up.',
    'Turn to 35.2°, or the nearest the slider allows.',
  ],
  par: 2,
  view: '3d',
  onWin: S.sp4Win,
  async setup(p) {
    const d = p.difficulty;
    const set = await arkSet(p.g, { stern: 'flat', anchor: null });
    p.add(set.root);
    void p.g.stage.view3D({ target: [-21, 0, 0], distance: 34, azimuth: -118, elevation: 18, ms: 0 });
    let theta = 0;
    const step = d === 'cadet' ? 1 : d === 'navigator' ? 0.5 : 0.1;
    const tol = d === 'cadet' ? 0.6 : d === 'navigator' ? 0.3 : 0.08;
    const r = p.readout('Stress on the braces');
    const msg = msgLine();
    let won = false;
    const paint = () => {
      const fr = braceFrame(theta);
      set.braces(fr);
      const m = mixedStress(theta);
      r.row('t', 'braces turned by', `${fmtD(theta, d === 'commander' ? 1 : 1)}°`, C.accent);
      // green exactly when the braces are inside the level's tolerance (the slider step cannot reach 0.000)
      r.row('m', 'mixed stress $\\mathbf q_1^{\\mathsf T}C\\,\\mathbf q_3$', fmtD(m, 3), sp4Won(theta, tol) ? C.good : C.orange);
    };
    const sl = new Slider({ label: 'turn the braces', min: 0, max: 90, step, value: theta, format: (x) => `${fmtD(x, 1)}°`, onInput: (x) => { theta = x; paint(); } });
    const check = () => { if (won) return; if (sp4Won(theta, tol)) { won = true; SP.braced = true; p.subgoal(0); msg.say(`Mixed stress ${fmtD(mixedStress(theta), 3)}: small enough that each brace only pushes or pulls.`, 'good'); p.win(); } else msg.say(`Mixed stress ${fmtD(mixedStress(theta), 3)}. Keep turning.`); };
    sl.el.addEventListener('change', () => { p.move(); check(); });
    p.dock().append(sl.el, msg.el);
    paint();
    return {
      async showMe() { const t0 = theta; await animate(1500, (k) => { theta = t0 + (Math.round(SP4_THETA / step) * step - t0) * k; sl.set(theta, false); paint(); }, ease.inOut); theta = SP4_THETA; paint(); check(); },
      solve() { theta = SP4_THETA; sl.set(theta, false); paint(); check(); },
      wrong() { theta = 0; paint(); check(); },
    };
  },
};

// ------------------------------------------------------------------ sp5 · write it for today, in the Anchor's grid

export const sp5: PuzzleDef = {
  id: 'c25-sp5',
  title: 'What do the spires have to read?',
  goal: 'Today the Collapse reads $RCR^{-1}$ in the ship’s grid, and the spires read the Anchor’s grid. Build the spire settings on the rail (the right-hand card acts first), then **test** them.',
  subgoals: ['Settings that undo today’s Collapse, in the Anchor’s grid'],
  hints: [
    'Undo today’s Collapse in the ship’s grid: $RC^{-1}R^{-1}$ (undo the inside move, in the turned frame).',
    'The spires take Anchor numbers in and give Anchor numbers out: $P$ first, then the ship-grid undo, then $P^{-1}$.',
    'Rail: $P^{-1}\\;R\\;C^{-1}\\;R^{-1}\\;P$.',
  ],
  par: 6,
  view: '3d',
  onWin: S.sp5Win,
  async setup(p) {
    void p.g.stage.view3D({ target: [0.4, 0, 1.4], distance: 10, azimuth: -55, elevation: 18, ms: 0 });
    const anchor = await makeAnchor(p.g.stage, 0.32);
    p.add(anchor);
    const spires = [0, 1, 2].map((j) => { const a = new Arrow([0, 0, 0], [0, 0, 0.001], { color: [C.v, C.w, C.u][j], width: 0.06 }); p.add(a); a.object.visible = false; return a; });
    const lbl = [0, 1, 2].map(() => { const t = tag('', [0, 0, 0], 'dim'); p.add(t.object); p.onDispose(() => t.dispose()); t.show(false); return t; });
    ptag(p, 'spire tips · lengths not to scale', [0, 0, -1.4], 'dim');
    let cards: string[] = [];
    const track = h('div', { class: 'a9-track' });
    const pal = h('div', { class: 'a9-palette' });
    const r = p.readout('The spire settings');
    const msg = msgLine();
    let won = false;
    const showSpires = (M: Mat | null) => {
      const cols = [0, 1, 2].map((j) => (M ? [M[0][j], M[1][j], M[2][j]] : [0, 0, 1]));
      spires.forEach((a, j) => {
        a.object.visible = !!M;
        if (!M) { lbl[j].show(false); return; }
        const c = cols[j], L = norm(c);
        const shown = L < 1e-9 ? 0.001 : 0.9 + 1.5 * Math.log10(1 + L);
        const u = L < 1e-9 ? [0, 0, 1] : normalize(c);
        a.setTo(v3(u.map((x) => x * shown)));
        lbl[j].at(v3(u.map((x) => x * (shown + 0.45))));
        // spires that point (almost) the same way share one label: the drawing cannot separate them
        const twin = [0, 1, 2].find((k) => k !== j && norm(cols[k]) > 1e-9 && L > 1e-9 && Math.abs(dot(normalize(cols[k]), u)) > Math.cos((3 * Math.PI) / 180));
        if (twin !== undefined && twin < j) { lbl[j].show(false); return; }
        lbl[j].set(twin === undefined ? `spire ${j + 1} · ${fmtD(L, 1)}` : `spires ${j + 1} and ${twin + 1} · ${fmtD(L, 1)} and ${fmtD(norm(cols[twin]), 1)}`);
        lbl[j].show(true);
      });
    };
    const render = () => {
      track.replaceChildren(...(cards.length ? cards.map((id, k) => { const c = CARDS.find((x) => x.id === id)!; const b = h('button', { class: `a9-card ${id.startsWith('P') ? 'cu' : ''}`, type: 'button', title: c.name, html: tex(c.tex) }); b.addEventListener('click', () => { cards.splice(k, 1); sfx.back(); render(); }); return b; }) : [h('span', { class: 'empty' }, 'Empty rail')]));
      pal.querySelectorAll('button').forEach((b) => b.classList.toggle('used', false));
      const M = cards.length ? railProduct(cards) : null;
      showSpires(M);
      if (M) r.row('m', 'product', `$\\begin{bmatrix}${M.map((row) => row.map((x) => fmtD(x, Math.abs(x) > 10 ? 0 : 1).replace('−', '-')).join(' & ')).join(' \\\\ ')}\\end{bmatrix}$`);
      else r.row('m', 'product', '—');
    };
    for (const c of CARDS) {
      const b = h('button', { class: `a9-card ${c.id.startsWith('P') ? 'cu' : ''}`, type: 'button', title: c.name, html: tex(c.tex) });
      b.addEventListener('click', () => { if (cards.length >= 5) { sfx.miss(); return; } cards = [c.id, ...cards]; p.move(); sfx.click(); render(); });
      pal.append(b);
    }
    const test = () => {
      if (won) return;
      p.move();
      if (!cards.length) { msg.say('Put cards on the rail first.', 'bad'); return; }
      if (sp5Won(cards)) { won = true; SP.settings = true; p.subgoal(0); msg.say(`It undoes today’s Collapse, read in the Anchor’s grid. Spire lengths ${SPIRE_LENGTHS.map((x) => fmtD(x, 1)).join(', ')}.`, 'good'); p.win(); return; }
      sfx.miss();
      const ids = cards.join(' ');
      if (ids === 'Cinv') msg.say('That undoes the Collapse as it was, in the ship’s grid. Today the stern is turned a quarter: $RCR^{-1}$. And the spires read the Anchor’s grid.', 'bad');
      else if (ids === 'R Cinv Rinv') msg.say('Right for today, in the ship’s grid. The spires read the Anchor’s numbers: convert it with $P$ and $P^{-1}$.', 'bad');
      else if (ids === 'Pinv Cinv P') msg.say('In the Anchor’s grid, but for the frame at the Collapse. Today the stern reads $RCR^{-1}$.', 'bad');
      else if (cards.includes('C')) msg.say('That card is the Collapse itself. The settings must undo it.', 'bad');
      else msg.say('Applied to today’s stern and read in the Anchor’s grid, that does not give the identity. Check the order: the right-hand card acts first.', 'bad');
      p.bark('lantern', 'Test failed. Settings do not undo today’s Collapse.');
    };
    p.dock().append(h('div', { class: 'a9-rail' }, h('div', { class: 'a9-kick' }, 'Cards · click to put one on the rail'), pal, track, h('div', { class: 'a9-order' }, 'The right-hand card acts first. Click a card on the rail to take it off.')),
      h('div', { class: 'a9-btns' }, button('Test on today’s stern', () => test(), { cls: 'primary small' }), button('Clear', () => { cards = []; render(); }, { cls: 'ghost small' })), msg.el);
    render();
    return {
      async showMe() { cards = []; render(); for (const id of [...SP5_REF].reverse()) { cards = [id, ...cards]; render(); sfx.click(); await wait(450); } test(); },
      solve() { cards = SP5_REF.slice(); render(); test(); },
      wrong() { cards = ['Cinv']; render(); test(); },
    };
  },
};

// ------------------------------------------------------------------ sp7 [S] · two gentler pulses

export const sp7: PuzzleDef = {
  id: 'c25-sp7',
  title: 'Can the undo fire as two gentler pulses?',
  goal: 'Split the undo into two pulses: $C^{-t}$, then $C^{-(1 - t)}$. Each stretches the thin line by $750^t$ and $750^{1-t}$. Choose $t$ so that **neither** pulse stretches more than it must.',
  subgoals: ['Two pulses, each as gentle as possible'],
  hints: ['The two stretches multiply to 750.', 'The larger of the two is smallest when they are equal.', '$t = 0.5$: each is $\\sqrt{750} \\approx 27.4$.'],
  par: 2,
  onWin: S.sp7Win,
  setup(p) {
    void p.g.stage.view2D({ center: [0, 0], height: 6, ms: 0 });
    let t = 0.2;
    const barsEl = h('div', { class: 'a9-col' });
    const mk = (name: string) => { const fill = h('span'); const val = h('span', { class: 'val' }); const el = h('div', { class: 'a9-meter' }, h('span', { style: 'min-width:90px', html: inline(name) }), h('div', { class: 'bar' }, fill), val); barsEl.append(el); return { fill, val }; };
    const b1 = mk('first pulse'), b2 = mk('second pulse');
    // the stern's thickness through the two pulses (a strip, drawn to scale up to 1)
    const strip = new FatSegments(p.g.stage, [[[-3, 0, 0], [3, 0, 0]]], { color: C.accent, width: 3 });
    p.add(strip.object); p.onDispose(() => strip.dispose());
    ptag(p, 'the stern whole · thickness 1', [0, 1.12, 0], 'dim');
    ptag(p, `the stern today · 1/${Math.round(AMPLIFY)}`, [0, -1.15, 0], 'dim');
    const midTag = ptag(p, '', [0, -0.6, 0], 'c');
    const r = p.readout('Two pulses');
    const msg = msgLine();
    let won = false;
    const paint = () => {
      const s1 = AMPLIFY ** t, s2 = AMPLIFY ** (1 - t);
      midTag.set(`after the first pulse · ${fmtD(s1, 1)} times thicker`);
      const yMid = -0.9 + Math.max(0.02, (s1 / AMPLIFY) * 1.8);
      midTag.at([0, yMid + (yMid > 0.5 ? -0.25 : 0.25), 0]);
      b1.fill.style.width = `${(100 * Math.log(s1)) / Math.log(AMPLIFY)}%`; b1.val.textContent = `× ${fmtD(s1, 1)}`;
      b2.fill.style.width = `${(100 * Math.log(s2)) / Math.log(AMPLIFY)}%`; b2.val.textContent = `× ${fmtD(s2, 1)}`;
      r.row('t', '$t$', fmtD(t, 2), C.accent);
      r.row('m', 'larger stretch', `× ${fmtD(splitStretch(t), 1)}`, sp7Won(t) ? C.good : C.orange);
      const th1 = (1 / AMPLIFY) * s1;
      strip.setSegments([[[-3, -0.9, 0], [3, -0.9, 0]], [[-3, -0.9 + Math.max(0.02, th1 * 1.8), 0], [3, -0.9 + Math.max(0.02, th1 * 1.8), 0]], [[-3, 0.9, 0], [3, 0.9, 0]]]);
    };
    const sl = new Slider({ label: 'split $t$', min: 0, max: 1, step: 0.05, value: t, format: (x) => fmtD(x, 2), onInput: (x) => { t = x; paint(); } });
    sl.el.addEventListener('change', () => { p.move(); if (!won && sp7Won(t)) { won = true; p.subgoal(0); msg.say(`Both pulses stretch by ${fmtD(SPLIT_BEST, 1)}: the square root of 750.`, 'good'); p.win(); } });
    p.dock().append(sl.el, barsEl, msg.el);
    paint();
    return {
      async showMe() { await animate(1000, (k) => { t = 0.2 + 0.3 * k; sl.set(Math.round(t * 20) / 20, false); paint(); }, ease.inOut); t = 0.5; sl.el.dispatchEvent(new Event('change')); },
      solve() { t = 0.5; sl.set(t); sl.el.dispatchEvent(new Event('change')); },
      wrong() { t = 0.3; sl.set(t); sl.el.dispatchEvent(new Event('change')); },
    };
  },
};

// ------------------------------------------------------------------ sp6 · the Unfold

export const sp6: PuzzleDef = {
  id: 'c25-sp6',
  title: 'The Unfold',
  goal: 'Everything is set. **Commit**: the spires fire the undo, and the stern fills back out of the sheet. The hull must stay inside the tear limit.',
  subgoals: ['The stern unfolds inside the tear limit'],
  hints: ['Press Commit.', 'The readings, the braces and the settings were set in the steps before.', 'Commit.'],
  par: 1,
  view: '3d',
  onWin: S.sp6Win,
  async setup(p) {
    const set = await arkSet(p.g, { stern: 'flat', anchor: { at: [-150, 95, -18], scale: 7 }, lantern: { at: [-34, -26, 7], face: [0.4, 1, 0], scale: 1.3 } });
    p.add(set.root);
    set.braces([braceFrame(SP4_THETA)[0], braceFrame(SP4_THETA)[1], braceFrame(SP4_THETA)[2]], { opacity: 0.7 });
    void p.g.stage.view3D({ target: [-20, 0, 0], distance: 46, azimuth: -104, elevation: 16, ms: 0 });
    const g = unfoldGrade(SP);
    const ck = h('div', { class: 'a9-checks' },
      h('div', { class: 'ok', html: inline(`✓ readings averaged: ${SP.N} (error $${fmtD(unfoldError(SP.N), 2)}$)`) }),
      h('div', { class: SP.braced ? 'ok' : '', html: inline(`${SP.braced ? '✓' : '○'} braces on the principal axes`) }),
      h('div', { class: SP.settings ? 'ok' : '', html: inline(`${SP.settings ? '✓' : '○'} settings $P^{-1}RC^{-1}R^{-1}P$ in the spires`) }));
    const r = p.readout('The Unfold');
    const msg = msgLine();
    let busy = false, won = false;
    const paint = (t: number) => {
      const M = unfoldPath(t);
      const e = symEig(M);
      r.row('th', 'stern thickness', fmtD(e.values[2], 4), C.result);
      r.row('e', 'hull error', fmtD(g.error * Math.min(1, t * 1.2), 2), g.ok ? C.good : C.orange);
    };
    paint(0);
    const commit = async () => {
      if (busy || won) return;
      busy = true;
      p.move();
      music.stop(0.4);
      sfx.warp();
      p.g.stage.flash(0.2, 500);
      void p.g.stage.shockwave([-21, 0, 0], 2600, 0.8);
      const ms = p.g.headless ? 40 : 20000;
      await animate(ms, (k) => { set.setStern(unfoldPath(k)); paint(k); }, ease.inOut);
      set.setStern([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
      paint(1);
      busy = false;
      if (g.ok) { won = true; p.g.mood('triumph'); music.stinger(); sfx.solved(); msg.say(`Hull error ${fmtD(g.error, 2)}, inside 0.3. The stern is whole.`, 'good'); p.subgoal(0); p.win(); }
      else { sfx.miss(); msg.say(`Hull error ${fmtD(g.error, 2)}: above the tear limit.`, 'bad'); }
    };
    p.dock().append(h('div', { class: 'a9-kick' }, 'Set for the Unfold'), ck, h('div', { class: 'a9-btns' }, button('Commit', () => void commit(), { cls: 'primary' })), msg.el);
    return {
      async showMe() { await commit(); },
      async solve() { await commit(); },
    };
  },
};
