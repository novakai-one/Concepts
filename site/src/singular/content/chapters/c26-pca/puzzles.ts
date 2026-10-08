// Chapter 26 puzzles 1–4: the widest shadow (a line through a cloud, then a plane through a pancake; p1), centre
// first (p2), why the best direction is an eigenvector of the covariance matrix (p3 [D]), and PCA by hand (p4 [H]).
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { Dot } from '../../../gfx/markers';
import { InfLine, PlanePatch } from '../../../gfx/shapes';
import { Knob } from '../../../kit/geom';
import { PointCloud } from '../../../kit/data';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { Slider } from '../../../ui/widgets';
import { h, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { dot, matVec, norm, normalize, type Vec } from '../../../math/la';
import { ptag, tag, v3 } from '../c24-spectral/act9';
import { checklist, msgLine } from '../c24-spectral/puzzles';
import { deg, rad, symEig, texM } from '../c24-spectral/logic';
import {
  P1_CLOUD, P1B_REF, P2_CLOUD, P2_MEAN, P3_C, P3_CLOUD, P3_DECOYS, P3_EIG, P3_FORM_TOL, P3_ORDER, P3_SHARE, P3_TILES, P3_W0,
  P3_W0_SPREAD, P3_Y2, P3_Y2_TOL, P4_CENTRED, P4_COV, P4_EIG, P4_MEAN, P4_PROJ, P4_SHARE, P4_X, PANCAKE, PANCAKE_BEST, TOL2,
  bestAbout, covariance, fmtD, normalFrom, p1Won, p1bWon, p2FromMean, p2Turn, p2Won, p3Won, perpOn, planeKeeps, spreadOn, totalSpread,
} from './logic';
import { S } from './script';

/** A line through a cloud: its shadows (yellow) on the line and a few perpendicular drops. */
function shadowLine(p: PuzzleCtx, X: number[][], drops = 50) {
  const line = new InfLine(p.g.stage, [0, 0, 0.01], [1, 0, 0], { color: C.result, width: 1.2, opacity: 0.5, length: 20 });
  const shadows = new PointCloud(p, { points: X.map(() => [0, 0, 0]), color: C.result, size: 0.034, glow: 0.08, core: 1.2, opacity: 0.75 });
  const seg = new FatSegments(p.g.stage, [[[0, 0, 0], [0, 0, 0]]], { color: C.result, width: 1, opacity: 0.35 });
  p.add(line.object, seg.object); p.onDispose(() => { line.dispose(); seg.dispose(); });
  return {
    set(c: readonly number[], dir: readonly number[]) {
      const u = normalize(dir as number[]);
      line.set(v3(c, 0.01), v3(u));
      const sh = X.map((x) => { const t = (x[0] - c[0]) * u[0] + (x[1] - c[1]) * u[1]; return [c[0] + t * u[0], c[1] + t * u[1], 0.02]; });
      shadows.set(sh);
      const segs: [V3, V3][] = [];
      for (let i = 0; i < X.length; i += Math.max(1, Math.floor(X.length / drops))) segs.push([v3(X[i], 0.005), v3(sh[i], 0.005)]);
      seg.setSegments(segs);
    },
    show(on: boolean) { line.object.visible = on; shadows.group.visible = on; seg.object.visible = on; },
  };
}

// ------------------------------------------------------------------ p1 · the widest shadow

export const p1: PuzzleDef = {
  id: 'c26-p1',
  title: 'Which line keeps the readings most spread out?',
  goal: 'Turn the yellow line through the cloud (drag its handle). The yellow dots are the shadows of the readings on it. Make their **spread** as large as it can be.',
  subgoals: ['The line of most spread', 'The plane of most spread through the pancake'],
  predict: {
    prompt: 'Turning the line changes two numbers: how spread out the shadows are, and how far the readings are from the line. As one grows, the other…',
    choices: [{ id: 'shrinks', text: 'shrinks by the same amount' }, { id: 'grows', text: 'grows too' }, { id: 'none', text: 'is not related' }],
    answer: 'shrinks',
    reveal: 'Each reading’s distance from the centre, squared, is its shadow squared plus its distance to the line squared (Pythagoras). So the two always add to the same total.',
  },
  hints: [
    'Watch the two readouts: they always add to the same total.',
    'Line the line up with the long way of the cloud.',
    'About 28° above the first axis. Then tilt the plane until it lies flat in the pancake.',
  ],
  par: 4,
  onWin: S.p1Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view2D({ center: [0.6, 0], height: 8.6, ms: 0 });
    p.grid({ main: 0.12, base: 0, axis: 0.3 });
    const cloud = new PointCloud(p, { points: P1_CLOUD, color: C.accent, size: 0.045, glow: 0.3, core: 1.3, opacity: 0.85 });
    const sl = shadowLine(p, P1_CLOUD);
    const best = symEig(covariance(P1_CLOUD));
    if (d === 'cadet') { const ghost = new InfLine(p.g.stage, [0, 0, 0], v3(best.vectors[0]), { color: C.result, width: 1.2, opacity: 0.22, dashed: true, length: 20 }); p.add(ghost.object); p.onDispose(() => ghost.dispose()); }
    const R = 3.1;
    let theta = -40;
    const tot = totalSpread(P1_CLOUD);
    const r = p.readout('Spread');
    const msg = msgLine();
    const ck = checklist(['The line of most spread', 'The plane of most spread']);
    const done = [false, false];
    let won = false;
    const tick = (i: number) => { if (!done[i]) { done[i] = true; p.subgoal(i); ck.tick(i); } if (done.every(Boolean) && !won) { won = true; sfx.success(); p.win(); } };
    const frac = d === 'cadet' ? 0.98 : 0.99;
    const paint = () => {
      const u = [Math.cos(rad(theta)), Math.sin(rad(theta))];
      sl.set([0, 0], u);
      const s = spreadOn(P1_CLOUD, [0, 0], u), q = perpOn(P1_CLOUD, [0, 0], u);
      r.row('a', 'line at', `${Math.round(((theta % 180) + 180) % 180)}°`, C.result);
      r.row('s', 'spread of the shadows', fmtD(s), C.result);
      r.row('q', 'distance to the line, squared', fmtD(q));
      r.row('t', 'together', fmtD(s + q), C.good);
    };
    const knob = new Knob(p, [R * Math.cos(rad(theta)), R * Math.sin(rad(theta)), 0.03], {
      color: C.result, size: 0.08,
      constrain: (q) => { let a = deg(Math.atan2(q.y, q.x)); if (d === 'cadet') a = Math.round(a / 2) * 2; theta = a; q.set(R * Math.cos(rad(a)), R * Math.sin(rad(a)), 0.03); return q; },
      onMove: () => paint(),
      onEnd: () => { if (!done[0] && p1Won([Math.cos(rad(theta)), Math.sin(rad(theta))], frac)) { tick(0); sfx.snap(); msg.say(`Spread ${fmtD(spreadOn(P1_CLOUD, [0, 0], [Math.cos(rad(theta)), Math.sin(rad(theta))]))} out of ${fmtD(tot)}: as much as one line keeps. Now a plane.`, 'good'); void toPlane(); } },
    });
    // ---- stage B: the pancake in 3-D
    let turn = 0, tilt = 70;
    const stageB = h('div', { class: 'a9-col' });
    stageB.style.display = 'none';
    let pc: PointCloud | null = null, sh: PointCloud | null = null, plane: PlanePatch | null = null;
    const paintB = () => {
      if (!plane || !sh) return;
      const n = normalFrom(turn, tilt);
      plane.set([0, 0, 0], v3(n));
      sh.set(PANCAKE.map((x) => { const t = dot(x, n); return x.map((v, i) => v - t * n[i]); }));
      const kept = planeKeeps(n);
      r.row('k', `spread kept (at most ${fmtD(PANCAKE_BEST, 0)})`, `${fmtD(kept)}`, kept >= 0.95 * PANCAKE_BEST ? C.good : C.result);
      r.row('p', 'share', `${fmtD((100 * kept) / PANCAKE_BEST, 0)}%`, kept >= 0.95 * PANCAKE_BEST ? C.good : C.white);
    };
    const toPlane = async () => {
      await wait(p.g.headless ? 5 : 1100);
      cloud.dispose(); sl.show(false); knob.dispose();
      r.hideRow('a'); r.hideRow('s'); r.hideRow('q'); r.hideRow('t');
      await p.g.stage.view3D({ target: [0.6, 0, 0], distance: 21, azimuth: -60, elevation: 26, ms: p.g.headless ? 0 : 900 });
      p.setGoal('**A plane keeps two numbers per reading.** Tilt the viewing plane through the pancake of 500 readings until it keeps at least **95%** of the most a plane can keep.');
      pc = new PointCloud(p, { points: PANCAKE, color: C.accent, size: 0.05, glow: 0.3, core: 1.3, opacity: 0.85 });
      sh = new PointCloud(p, { points: PANCAKE, color: C.result, size: 0.035, glow: 0.2, core: 1.2, opacity: 0.6 });
      plane = new PlanePatch(p.g.stage, [0, 0, 0], [0, 0, 1], { color: C.result, size: 8, opacity: 0.16 });
      p.add(plane);
      stageB.style.display = '';
      paintB();
      void pc;
    };
    const s1 = new Slider({ label: 'turn the plane', min: -180, max: 180, step: 1, value: turn, format: (x) => `${x}°`, onInput: (x) => { turn = x; paintB(); } });
    const s2 = new Slider({ label: 'tilt the plane', min: 0, max: 90, step: 1, value: tilt, format: (x) => `${x}°`, onInput: (x) => { tilt = x; paintB(); } });
    const checkB = () => { if (done[0] && !done[1] && p1bWon(normalFrom(turn, tilt))) { tick(1); msg.say(`The plane lies along the pancake: ${fmtD((100 * planeKeeps(normalFrom(turn, tilt))) / PANCAKE_BEST, 0)}% of the most a plane can keep.`, 'good'); } };
    [s1, s2].forEach((s) => s.el.addEventListener('change', () => { p.move(); checkB(); }));
    stageB.append(s1.el, s2.el);
    p.dock().append(ck.el, stageB, msg.el);
    paint();
    const goTo = async (to: number, ms: number) => { const a0 = theta; await animate(ms, (k) => { theta = a0 + (to - a0) * k; knob.at([R * Math.cos(rad(theta)), R * Math.sin(rad(theta)), 0.03]); paint(); }, ease.inOut); };
    const bestDeg = deg(Math.atan2(best.vectors[0][1], best.vectors[0][0]));
    const planeTo = async (ms: number) => { const t0 = turn, l0 = tilt; await animate(ms, (k) => { turn = t0 + (Math.round(P1B_REF.turn) - t0) * k; tilt = l0 + (Math.round(P1B_REF.tilt) - l0) * k; s1.set(Math.round(turn), false); s2.set(Math.round(tilt), false); paintB(); }, ease.inOut); turn = Math.round(P1B_REF.turn); tilt = Math.round(P1B_REF.tilt); paintB(); checkB(); };
    return {
      async showMe() { await goTo(bestDeg, 1400); knob.at([R * Math.cos(rad(theta)), R * Math.sin(rad(theta)), 0.03]); if (!done[0]) { tick(0); void toPlane(); } while (!plane) await wait(20); await planeTo(1600); },
      async solve() { theta = bestDeg; paint(); tick(0); await toPlane(); await planeTo(1); },
      wrong() { theta = bestDeg + 60; paint(); },
    };
  },
};

// ------------------------------------------------------------------ p2 · centre first

export const p2: PuzzleDef = {
  id: 'c26-p2',
  title: 'Why does the best line point at the cloud?',
  goal: 'The line of most spread is found about the white pivot. With the pivot at the origin, it points **at** the cloud. Drag the pivot to where the line runs **along** the cloud.',
  subgoals: ['The line runs along the cloud'],
  hints: [
    'About the origin, the biggest thing in every reading is how far the cloud is from the origin.',
    'Put the pivot in the middle of the cloud: at its mean reading.',
    `The mean is (${P2_MEAN[0]}, ${P2_MEAN[1]}).`,
  ],
  par: 2,
  onWin: S.p2Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view2D({ center: [1.8, 1.2], height: 8.4, ms: 0 });
    p.grid({ main: 0.18, base: 0, axis: 0.42 });
    new PointCloud(p, { points: P2_CLOUD, color: C.accent, size: 0.045, glow: 0.3, core: 1.3, opacity: 0.85 });
    const line = new InfLine(p.g.stage, [0, 0, 0.01], [1, 0, 0], { color: C.result, width: 2.2, opacity: 0.85, length: 24 });
    p.add(line.object); p.onDispose(() => line.dispose());
    const meanDot = new Dot(v3(P2_MEAN, 0.03), { color: C.white, size: 0.06 });
    p.add(meanDot);
    meanDot.object.visible = d === 'cadet';
    if (d === 'cadet') ptag(p, 'mean', [P2_MEAN[0] + 0.35, P2_MEAN[1] + 0.3, 0], 'dim');
    let c: Vec = [0, 0];
    const tol = d === 'cadet' ? 0.2 : d === 'navigator' ? 0.12 : 0.06;
    let prevD = p2FromMean(c);   // 3.88 at the origin: each miss is judged against the one before
    const r = p.readout('About the pivot');
    const msg = msgLine();
    let won = false;
    const paint = () => {
      const b = bestAbout(c);
      line.set(v3(c, 0.01), v3(b));
      r.row('c', 'pivot', `(${fmtD(c[0])}, ${fmtD(c[1])})`, C.white);
      r.row('s', 'spread along the line', fmtD(spreadOn(P2_CLOUD, c, b)), C.result);
      r.row('a', 'line at', `${Math.round(((deg(Math.atan2(b[1], b[0])) % 180) + 180) % 180)}°`);
    };
    const knob = new Knob(p, [0, 0, 0.04], {
      color: C.white, size: 0.09, snap: d === 'cadet' ? 0.1 : d === 'navigator' ? 0.05 : null,
      onMove: (q) => { c = [q[0], q[1]]; paint(); },
      onEnd: () => check(),
    });
    const check = () => {
      if (won) return;
      if (p2Won(c, tol)) { won = true; meanDot.object.visible = true; p.subgoal(0); msg.say('At the mean, the line runs along the cloud: **centre first**, then look for spread.', 'good'); p.win(); }
      else {
        const dNow = p2FromMean(c);
        if (norm(c) < 0.3) msg.say('About the origin, the line points at the cloud.');
        else msg.say(`${dNow < prevD - 1e-6 ? 'Closer.' : 'Further from the middle of the cloud.'} The line turned ${Math.round(p2Turn(c))}° from where it started.`);
        prevD = dNow;
      }
    };
    p.dock().append(msg.el);
    paint();
    msg.say('About the origin, the line points at the cloud.');
    return {
      async showMe() { await knob.moveTo(v3(P2_MEAN, 0.04), 1500); c = P2_MEAN.slice(); paint(); p.move(); check(); },
      solve() { knob.at(v3(P2_MEAN, 0.04)); c = P2_MEAN.slice(); paint(); check(); },
      wrong() { c = [1, 1]; paint(); check(); },
    };
  },
};

// ------------------------------------------------------------------ p3 [D] · why an eigenvector

export const p3: PuzzleDef = {
  id: 'c26-p3',
  title: 'Why is the best direction an eigenvector?',
  goal: 'The spread of the shadows along a unit arrow $\\mathbf w$ is $\\mathbf w^{\\mathsf T}C\\,\\mathbf w$, where $C = X_c^{\\mathsf T}X_c/(n - 1) = \\begin{bmatrix} 4 & 2 \\\\ 2 & 3 \\end{bmatrix}$ is built from the centred readings. Turn $\\mathbf w$ to the **largest** spread, then build the reason.',
  subgoals: ['The largest spread', 'Why it is an eigenvector'],
  hints: [
    'Watch $C\\mathbf w$ (yellow): at the best direction it lies along $\\mathbf w$ itself.',
    'The largest value of $\\mathbf w^{\\mathsf T}C\\mathbf w$ on the unit circle is the largest eigenvalue (Chapter 24): $(7 + \\sqrt{17})/2 \\approx 5.56$.',
    'Turn $\\mathbf w$ to about 38°: spread 5.56 of a total 7, 79%.',
  ],
  par: 4,
  onWin: S.p3Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view2D({ center: [0.6, 0.2], height: 11, ms: 0 });
    p.grid({ main: 0.12, base: 0, axis: 0.3 });
    new PointCloud(p, { points: P3_CLOUD, color: C.accent, size: 0.045, glow: 0.3, core: 1.3, opacity: 0.6 });
    const sl = shadowLine(p, P3_CLOUD, 30);
    const W = 1.6;
    const ring = new FatLine(p.g.stage, Array.from({ length: 129 }, (_, i) => { const a = (i / 128) * Math.PI * 2; return [W * Math.cos(a), W * Math.sin(a), 0.01] as V3; }), { color: C.v, width: 1.3, opacity: 0.4, dashed: true, dashSize: 0.09, gapSize: 0.07 });
    p.add(ring.object); p.onDispose(() => ring.dispose());
    const wA = new Arrow([0, 0, 0.03], [W, 0, 0.03], { color: C.v, width: 0.05, label: '$\\mathbf w$' });
    const cw = new Arrow([0, 0, 0.02], [W, 0, 0.02], { color: C.result, width: 0.045, opacity: 0.85, label: '$C\\mathbf w$' });
    p.add(cw, wA);
    let theta = 150;
    const tol = d === 'cadet' ? 3 : d === 'navigator' ? 2 : 1;
    const r = p.readout('Spread along w');
    r.row('c', '$C$', `$${texM(P3_C)}$`);
    const msg = msgLine();
    const ck = checklist(['The largest spread', 'Why it is an eigenvector']);
    const done = [false, false];
    let won = false;
    const tick = (i: number) => { if (!done[i]) { done[i] = true; p.subgoal(i); ck.tick(i); } if (done.every(Boolean) && !won) { won = true; sfx.success(); p.win(); } };
    const paint = () => {
      const u = [Math.cos(rad(theta)), Math.sin(rad(theta))];
      sl.set([0, 0], u);
      wA.setTo([W * u[0], W * u[1], 0.03]);
      const y = matVec(P3_C, u);
      cw.setTo([y[0] * W * 0.42, y[1] * W * 0.42, 0.02]);
      const s = spreadOn(P3_CLOUD, [0, 0], u);
      r.row('s', '$\\mathbf w^{\\mathsf T}C\\,\\mathbf w$', fmtD(s), C.result);
      r.row('t', 'of the total', `${fmtD(100 * s / 7, 0)}% of 7`);
    };
    const knob = new Knob(p, [W * Math.cos(rad(theta)), W * Math.sin(rad(theta)), 0.04], {
      color: C.v, size: 0.075,
      constrain: (q) => { let a = deg(Math.atan2(q.y, q.x)); if (d === 'cadet') { const target = deg(Math.atan2(P3_EIG.vectors[0][1], P3_EIG.vectors[0][0])); const m = ((((a - target) % 180) + 270) % 180) - 90; if (Math.abs(m) < 4) a -= m; } theta = a; q.set(W * Math.cos(rad(a)), W * Math.sin(rad(a)), 0.04); return q; },
      onMove: () => paint(),
      onEnd: () => { if (!done[0] && p3Won([Math.cos(rad(theta)), Math.sin(rad(theta))], tol)) { tick(0); sfx.snap(); msg.say(`Largest spread ${fmtD(P3_EIG.values[0])}, ${fmtD(100 * P3_SHARE, 0)}% of the total, and $C\\mathbf w$ lies along $\\mathbf w$: an eigenvector.`, 'good'); startReason(); } },
    });
    const box = h('div', { class: 'a9-col' });
    let started = false, ws: StepWorksheet | null = null, tiles: TileOrder | null = null, last: StepWorksheet | null = null;
    const reasonDone = () => tick(1);
    const submitTiles = (o: string[]) => {
      p.move();
      if (o.join() !== P3_ORDER.join()) { sfx.miss(); msg.say('Not in that order. Start with what the spread along $\\mathbf w$ is.', 'bad'); return; }
      sfx.snap(); msg.say('Right. Now the last line.', 'good');
      if (!last) last = new StepWorksheet(p, { title: 'The last line · only the answer is checked', steps: [{ prompt: 'The largest spread: the largest eigenvalue of $C$ (two decimals)', answer: P3_EIG.values[0], tol: 0.006 }], mount: box, onDone: reasonDone });
    };
    const startReason = () => {
      if (started) return;
      started = true;
      if (d === 'cadet') {
        void (async () => {
          for (const l of ['The spread along $\\mathbf w$ is $\\mathbf w^{\\mathsf T}C\\,\\mathbf w$: a quadratic form', '$C$ is symmetric: in its eigenvector grid, $\\lambda_1y_1^2 + \\lambda_2y_2^2$', 'Largest when $\\mathbf w$ is the first eigenvector: $\\lambda_1$']) { box.append(h('div', { class: 'a9-row', html: inline(l) })); sfx.tick(1); await wait(p.g.headless ? 2 : 650); }
          reasonDone();
        })();
      } else if (d === 'navigator') {
        // the derivation, typed at one direction w: its spread as a quadratic form, the same spread in C's
        // eigenvector grid, and the largest value that form can take on the unit circle
        const tile = (id: string) => P3_TILES.find((t) => t.id === id)?.text ?? '';
        const w0 = `$\\mathbf w = (${P3_W0.join(', ')})$`;
        const [q1, q2] = P3_EIG.vectors.map((q) => `(${q.map((x) => fmtD(x)).join(', ')})`);
        ws = new StepWorksheet(p, {
          title: 'Where it comes from · each step is checked', mount: box,
          onDone: () => { msg.say(`Step 4 gave ${fmtD(P3_W0_SPREAD, 0)} again: in the eigenvector grid the spread is $\\lambda_1y_1^2 + \\lambda_2y_2^2$, and it is largest, $\\lambda_1$, at $\\mathbf w = \\mathbf q_1$: the first eigenvector.`, 'good'); reasonDone(); },
          steps: [
            { prompt: `The spread along $\\mathbf w$ is the quadratic form $\\mathbf w^{\\mathsf T}C\\,\\mathbf w$. At ${w0}, it is`, answer: P3_W0_SPREAD },
            { prompt: 'The eigenvalues of $C$, larger first (two decimals)', answer: [[P3_EIG.values[0], P3_EIG.values[1]]], tol: TOL2 },
            { prompt: `${tile('b')}. Here $\\mathbf q_1 = ${q1}$, $\\mathbf q_2 = ${q2}$, and ${w0} has $y_1 = \\mathbf w\\cdot\\mathbf q_1$, $y_2 = \\mathbf w\\cdot\\mathbf q_2$. Its $y_1^2$ and $y_2^2$ (two decimals)`, answer: [P3_Y2.slice()], tol: P3_Y2_TOL },
            { prompt: 'So for this $\\mathbf w$, $\\lambda_1y_1^2 + \\lambda_2y_2^2$ is (two decimals)', answer: P3_EIG.values[0] * P3_Y2[0] + P3_EIG.values[1] * P3_Y2[1], tol: P3_FORM_TOL },
            { prompt: `${tile('c')}. With $y_1^2 + y_2^2 = 1$, the largest $\\lambda_1y_1^2 + \\lambda_2y_2^2$ can be (two decimals)`, answer: P3_EIG.values[0], tol: TOL2 },
          ],
        });
      } else {
        tiles = new TileOrder(p, { tiles: P3_TILES, decoys: P3_DECOYS, mount: box, title: 'Why the direction of most spread is an eigenvector: put the reason in order', submitLabel: 'Check the order', onSubmit: (o) => submitTiles(o) });
      }
    };
    p.dock().append(ck.el, msg.el, box);
    paint();
    const bestDeg = deg(Math.atan2(P3_EIG.vectors[0][1], P3_EIG.vectors[0][0]));
    const goTo = async (to: number, ms: number) => { const a0 = theta; await animate(ms, (k) => { theta = a0 + (to - a0) * k; knob.at([W * Math.cos(rad(theta)), W * Math.sin(rad(theta)), 0.04]); paint(); }, ease.inOut); };
    const finish = async (fast: boolean) => {
      tick(0); startReason();
      if (ws) { if (fast) ws.solve(); else await ws.showMe(400); }
      if (tiles) { tiles.set(P3_ORDER); submitTiles(P3_ORDER); const lw = last as StepWorksheet | null; if (lw) { if (fast) lw.solve(); else await lw.showMe(300); } }
      while (!won) await wait(10);
    };
    return {
      async showMe() { await goTo(bestDeg + (theta > bestDeg + 90 ? 180 : 0), 1500); p.move(); await finish(false); },
      async solve() { theta = bestDeg; knob.at([W * Math.cos(rad(theta)), W * Math.sin(rad(theta)), 0.04]); paint(); await finish(true); },
      wrong() { theta = 0; paint(); },
    };
  },
};

// ------------------------------------------------------------------ p4 [H] · by hand

export const p4: PuzzleDef = {
  id: 'c26-p4',
  title: 'Four readings, by hand',
  goal: 'Readings $(6, 6)$, $(2, 4)$, $(5, 7)$, $(3, 3)$. Centre them, build the covariance matrix, find the first principal direction and how much it keeps, and project.',
  hints: [
    'The mean is the average of each column: $(16/4, 20/4)$.',
    'Covariance: $\\frac{1}{n - 1}X_c^{\\mathsf T}X_c$ with $n = 4$: $\\frac13\\begin{bmatrix} 10 & 8 \\\\ 8 & 10 \\end{bmatrix}$. Eigenvalues 6 and $\\frac23$.',
    'First direction $(1, 1)/\\sqrt2$, keeping $6/(6 + \\frac23) = 90\\%$. Projections: $(2 + 1)/\\sqrt2 = 2.12$, then $-2.12$, $2.12$, $-2.12$.',
  ],
  par: 7,
  onWin: S.p4Win,
  setup(p) {
    void p.g.stage.view2D({ center: [2.6, 4.6], height: 8.2, ms: 0 });   // the readings sit right of the worksheet
    p.grid({ main: 0.2, base: 0, axis: 0.42 });
    const dots = P4_X.map((x) => { const dd = new Dot(v3(x, 0.02), { color: C.accent, size: 0.1 }); p.add(dd); return dd; });
    P4_X.forEach((x) => ptag(p, `(${x[0]}, ${x[1]})`, [x[0] + 0.15, x[1] + 0.42, 0], 'dim'));
    const mean = new Dot(v3(P4_MEAN, 0.03), { color: C.white, size: 0.08 });
    p.add(mean); mean.object.visible = false;
    const line = new InfLine(p.g.stage, v3(P4_MEAN, 0.01), v3(P4_EIG.vectors[0]), { color: C.result, width: 1.3, opacity: 0, length: 14 });
    p.add(line.object); p.onDispose(() => line.dispose());
    let finished = false;
    const finale = async () => {
      if (finished) return;
      finished = true;
      mean.object.visible = true;
      await animate(p.g.headless ? 1 : 600, (k) => line.line.setOpacity(0.6 * k), ease.out);
      const u = P4_EIG.vectors[0];
      await Promise.all(dots.map((dd, i) => { const t = P4_PROJ[i]; const to: V3 = [P4_MEAN[0] + t * u[0], P4_MEAN[1] + t * u[1], 0.03]; const from = v3(P4_X[i], 0.02); return animate(p.g.headless ? 1 : 900, (k) => dd.at([from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, 0.03]), ease.inOut); }));
      dots.forEach((dd) => dd.setColor(C.result));
      [1, -1].forEach((s) => { const tg = tag(`${s > 0 ? '+' : '−'}3/√2`, [P4_MEAN[0] + s * 2.12 * u[0] + 0.45, P4_MEAN[1] + s * 2.12 * u[1] - 0.3, 0], 'y'); p.add(tg.object); p.onDispose(() => tg.dispose()); });
      sfx.success();
      p.win();
    };
    const ws = new StepWorksheet(p, {
      onDone: () => void finale(),
      steps: [
        { prompt: 'The mean reading', answer: [P4_MEAN] },
        { prompt: 'The centred readings, one per column', answer: [P4_CENTRED.map((r) => r[0]), P4_CENTRED.map((r) => r[1])] },
        { prompt: 'The covariance matrix $\\frac{1}{n - 1}X_c^{\\mathsf T}X_c$ (fractions or two decimals)', answer: P4_COV, tol: TOL2, mistakes: [[[[2.5, 2], [2, 2.5]], 'Divide by $n - 1 = 3$, not by $n = 4$.'], [[[10, 8], [8, 10]], 'That is $X_c^{\\mathsf T}X_c$. Divide by $n - 1 = 3$.']] },
        { prompt: 'Its eigenvalues, larger first (fractions or two decimals)', answer: [[P4_EIG.values[0], P4_EIG.values[1]]], tol: TOL2 },
        { prompt: 'The first principal direction (first entry 1)', answer: [[1, 1]] },
        { prompt: 'The share it keeps (percent)', answer: Math.round(100 * P4_SHARE), tol: 0.5 },
        { prompt: 'Each reading’s coordinate along it (two decimals)', answer: [P4_PROJ], tol: 0.006 },
      ],
    });
    return {
      async showMe() { await ws.showMe(420); while (!finished) await wait(10); await wait(p.g.headless ? 1 : 1500); },
      async solve() { ws.solve(); while (!p.won) await wait(5); },
      wrong() { ws.wrong(); },
    };
  },
};

