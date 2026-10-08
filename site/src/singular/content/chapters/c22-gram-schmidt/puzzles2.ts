// Chapter 22 puzzles 5–7: fix the Drift (re-square LANTERN's attitude frame), QR by hand [H], and classical
// against modified Gram–Schmidt on nearly parallel arrows [S].
import type { PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { RightAngle } from '../../../kit/geom';
import { StepWorksheet } from '../../../kit/steps';
import { h, button } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { dot, matMul, norm, normalize, vscale, vsub, type Vec } from '../../../math/la';
import {
  DRIFT, DRIFT_NAMES, P6_QR, P6_R, P7_X, P2_Q, angleDeg, classicalGS, driftFixed, fmtN, fmtV, horizonLean, modifiedGS, starRatio,
} from './logic';
import { v3 } from './puzzles';
import { S } from './script';

// ------------------------------------------------------------------ p5 Fix the Drift

/** Points of the star ring drawn through the frame: center + r(cos θ · forward + sin θ · up). */
const starPts = (up: Vec, fwd: Vec, c: V3, r: number): V3[] => Array.from({ length: 97 }, (_, i) => {
  const a = (i / 96) * Math.PI * 2;
  return [c[0] + r * (Math.cos(a) * fwd[0] + Math.sin(a) * up[0]), c[1] + r * (Math.cos(a) * fwd[1] + Math.sin(a) * up[1]), c[2] + r * (Math.cos(a) * fwd[2] + Math.sin(a) * up[2])];
});

export const p5: PuzzleDef = {
  id: 'c22-p5',
  title: 'Can we stand the horizon back up?',
  goal: 'LANTERN’s frame: **up** (green) 1.03 long, **forward** (red) 0.98, **side** (blue) 1.01; up and forward are 88.6° apart. Square it up: subtract shadows on finished arrows, scale to length 1. The horizon must stand level and the star round.',
  predict: {
    prompt: 'Which arrow should be squared first, so that the horizon ends level?',
    choices: [{ id: 'up', text: 'Up, the one the star tracker checks' }, { id: 'fwd', text: 'Forward, the one the horizon is drawn along' }, { id: 'any', text: 'It makes no difference' }],
    answer: 'up',
    reveal: 'Up. The first arrow only gets scaled, so it keeps its direction. Start with the one you trust; every later arrow is squared against it.',
  },
  hints: [
    'Scale **up** to length 1 first: it becomes the first finished arrow.',
    'Forward leans toward up. Subtract forward’s shadow on up, then scale forward to length 1.',
    'Side is already at a right angle to both: scale it to length 1. Order: scale up; forward minus its shadow on up; scale forward; scale side.',
  ],
  par: 5,
  view: '3d',
  onWin: S.p5Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [1.0, 0, 0.75], distance: 8.6, azimuth: -90, elevation: 14, ms: 0 });
    const d = p.difficulty;
    const names = DRIFT_NAMES;
    const cols = [C.v, C.w, C.u];
    let frame: Vec[] = DRIFT.map((v) => v.slice());
    const finished: number[] = [];
    // the true level, faint; the drawn horizon along forward; the star ring through the frame
    const level = new FatLine(p.g.stage, [[-3, 0, 0], [4, 0, 0]], { color: C.white, width: 1.1, opacity: 0.3, dashed: true, dashSize: 0.14, gapSize: 0.1 });
    const horizon = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.accent, width: 2.6, intensity: 1.3 });
    const star = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.result, width: 2.4, intensity: 1.4 });
    const starGhost = new FatLine(p.g.stage, starPts([0, 0, 1], [1, 0, 0], [1.9, 0.01, 1.55], 0.5), { color: C.white, width: 1, opacity: 0.25, dashed: true, dashSize: 0.06, gapSize: 0.05 });
    p.add(level, horizon, star, starGhost);
    const lh = new Label('horizon', [3.2, 0, 0], { className: 'a8-cap', offset: [0, -16] });
    const ls = new Label('star', [1.9, 0, 2.25], { className: 'a8-cap' });
    p.add(lh, ls);
    const arrows = frame.map((v, i) => new Arrow([0, 0, 0], v3(v), { color: cols[i], label: names[i] }));
    p.add(...arrows);
    const marks = [0, 1, 2].map(() => { const m = new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 1, 0], 0.16, { color: C.result }); m.show(false); return m; });
    const r = p.readout('Attitude frame');
    let done = false;
    const blind = d === 'commander';
    const draw = () => {
      frame.forEach((v, i) => arrows[i].set([0, 0, 0], v3(v)));
      const fwd = frame[1], up = frame[0];
      const f = normalize(fwd);
      horizon.setPoints([v3(vscale(f, -3)), v3(vscale(f, 4))]);
      star.setPoints(starPts(up, fwd, [1.9, 0.01, 1.55], 0.5));
      [[0, 1], [0, 2], [1, 2]].forEach(([i, j], k) => { const sq = Math.abs(dot(frame[i], frame[j])) < 1e-9; marks[k].show(sq && finished.includes(i) && finished.includes(j)); marks[k].set([0, 0, 0], v3(frame[i]), v3(frame[j])); });
      const lean = horizonLean(fwd), ratio = starRatio(up, fwd);
      if (!blind || done) {
        r.row('lean', 'horizon lean', `${fmtN(lean, 2)}°`, Math.abs(lean) < 1e-4 ? C.good : C.orange);
        r.row('star', 'star: long axis ÷ short axis', fmtN(ratio, 3), Math.abs(ratio - 1) < 1e-6 ? C.good : C.orange);
      } else {
        r.row('lean', 'horizon lean', 'hidden until you commit');
      }
      frame.forEach((v, i) => r.row(`l${i}`, `${names[i]}: length`, fmtN(norm(v), 3), Math.abs(norm(v) - 1) < 1e-9 ? C.good : C.white));
      r.row('a01', 'up ∠ forward', `${fmtN(angleDeg(frame[0], frame[1]), 2)}°`);
    };
    const msg = h('div', { class: 'a8-msg' });
    const rows = h('div', { style: 'display:flex;flex-direction:column;gap:6px' });
    const check = () => {
      if (done) return;
      if (driftFixed(frame)) {
        done = true;
        draw();
        msg.className = 'a8-msg good'; msg.textContent = 'Square, unit, level.';
        r.note('Up kept its direction; every later arrow was squared against the finished ones.');
        p.win();
      } else if (finished.length === 3) {
        sfx.miss();
        msg.className = 'a8-msg bad';
        const sq = Math.max(Math.abs(dot(frame[0], frame[1])), Math.abs(dot(frame[0], frame[2])), Math.abs(dot(frame[1], frame[2]))) < 1e-9;
        msg.textContent = !sq ? 'All three are one unit long, but some pair still leans: subtract every shadow on the finished arrows.' : 'Square and unit, but the horizon still leans: the first finished arrow keeps its direction. Start from up.';
        if (blind) { r.row('lean', 'horizon lean', `${fmtN(horizonLean(frame[1]), 2)}°`, C.orange); }
      }
    };
    const scaleOp = async (i: number) => {
      p.move();
      const to = normalize(frame[i]);
      const from = frame[i].slice();
      await animate(400, (k) => { frame[i] = from.map((x, a) => x + (to[a] - x) * k); draw(); }, ease.inOut);
      frame[i] = to;
      if (!finished.includes(i)) finished.push(i);
      sfx.snap();
      draw(); render(); check();
    };
    const subOp = async (i: number, j: number) => {
      p.move();
      const q = frame[j];
      const c = dot(frame[i], q) / dot(q, q);
      const from = frame[i].slice(), to = vsub(frame[i], vscale(q, c));
      await animate(500, (k) => { frame[i] = from.map((x, a) => x + (to[a] - x) * k); draw(); }, ease.inOut);
      frame[i] = to;
      const at = finished.indexOf(i);
      if (at >= 0 && Math.abs(c) > 1e-12) finished.splice(at, 1);
      msg.className = 'a8-msg'; msg.textContent = `Subtracted ${fmtN(c, 4)} of ${names[j]} from ${names[i]}.`;
      draw(); render(); check();
    };
    const render = () => {
      rows.replaceChildren(...frame.map((_, i) => {
        const subs = finished.filter((j) => j !== i).map((j) => {
          const c = dot(frame[i], frame[j]) / dot(frame[j], frame[j]);
          return button(`− shadow on ${names[j]}${d === 'cadet' ? ` (${fmtN(c, 3)})` : ''}`, () => void subOp(i, j), { cls: 'small ghost' });
        });
        return h('div', { class: 'a8-row' }, h('span', { class: 'k', style: `min-width:62px;color:${cols[i]}` }, names[i]), ...subs, button('Scale to length 1', () => void scaleOp(i), { cls: 'small' }));
      }));
    };
    p.dock().append(h('div', { class: 'a8-note' }, 'Finished arrows are the ones you have scaled to length 1. Shadows can only be taken on finished arrows.'), rows, msg);
    draw(); render();
    const ref = async () => { await scaleOp(0); await subOp(1, 0); await scaleOp(1); await scaleOp(2); };
    return {
      async showMe() { await ref(); },
      async solve() { await ref(); },
      async wrong() { await scaleOp(1); await subOp(0, 1); await scaleOp(0); await scaleOp(2); },
    };
  },
};

// ------------------------------------------------------------------ p6 [H] QR

const R2 = Math.SQRT2;
export const p6: PuzzleDef = {
  id: 'c22-p6',
  title: 'How do the skewed arrows come back from the square ones?',
  goal: '$A$ has columns $\\cg{\\mathbf a_1} = (1, 1, 0)$ and $\\cr{\\mathbf a_2} = (1, 0, 1)$. Its square arrows are $\\mathbf q_1 = \\frac{1}{\\sqrt2}(1, 1, 0)$, $\\mathbf q_2 = \\frac{1}{\\sqrt6}(1, -1, 2)$. Find $R = Q^{\\mathsf T}A$ by hand (decimals to three places).',
  hints: [
    'Entry $(i, j)$ of $Q^{\\mathsf T}A$ is $\\mathbf q_i\\cdot\\mathbf a_j$: how much of $\\mathbf a_j$ points along $\\mathbf q_i$.',
    '$\\mathbf q_1\\cdot\\mathbf a_1 = 2/\\sqrt2 = \\sqrt2$, $\\mathbf q_1\\cdot\\mathbf a_2 = 1/\\sqrt2$, $\\mathbf q_2\\cdot\\mathbf a_1 = 0$.',
    '$\\mathbf q_2\\cdot\\mathbf a_2 = 3/\\sqrt6 \\approx 1.225$. $R = \\begin{bmatrix} 1.414 & 0.707 \\\\ 0 & 1.225 \\end{bmatrix}$.',
  ],
  par: 5,
  view: '3d',
  onWin: S.p6Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [0.4, 0.2, 0.5], distance: 5.6, azimuth: -46, elevation: 20, ms: 0 });
    p.grid({ base: 0.1, main: 0.2, axis: 0.45 });
    const a1 = new Arrow([0, 0, 0], [1, 1, 0], { color: C.v, label: '$\\mathbf a_1$' });
    const a2 = new Arrow([0, 0, 0], [1, 0, 1], { color: C.w, label: '$\\mathbf a_2$' });
    const q1 = new Arrow([0, 0, 0], v3(P2_Q[0]), { color: C.result, width: 0.04, label: '$\\mathbf q_1$' });
    const q2 = new Arrow([0, 0, 0], v3(P2_Q[1]), { color: C.result, width: 0.04, label: '$\\mathbf q_2$' });
    p.add(a1, a2, q1, q2);
    new RightAngle(p, [0, 0, 0], v3(P2_Q[0]), v3(P2_Q[1]), 0.14, { color: C.result });
    const r = p.readout('Back to the skewed arrows');
    r.eq('Q = \\begin{bmatrix} 1/\\sqrt2 & 1/\\sqrt6 \\\\ 1/\\sqrt2 & -1/\\sqrt6 \\\\ 0 & 2/\\sqrt6 \\end{bmatrix}');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const QR = matMul(P6_QR.Q, P6_R);
      r.eq('R = \\begin{bmatrix} \\sqrt2 & 1/\\sqrt2 \\\\ 0 & 3/\\sqrt6 \\end{bmatrix}');
      r.row('qr', '$QR$, column 1', fmtV(QR.map((row) => row[0])), C.v);
      r.row('qr2', '$QR$, column 2', fmtV(QR.map((row) => row[1])), C.w);
      r.note('$R$ is upper triangular: $\\mathbf a_1$ is built from $\\mathbf q_1$ alone, $\\mathbf a_2$ from $\\mathbf q_1$ and $\\mathbf q_2$.');
      p.win();
    };
    const T = 0.002;
    const ws = new StepWorksheet(p, {
      steps: [
        { prompt: '$\\mathbf q_1\\cdot\\mathbf a_1$', answer: R2, tol: T, mistakes: [[2, 'Divide by $\\sqrt2$: $\\mathbf q_1$ is one unit long.']] },
        { prompt: '$\\mathbf q_1\\cdot\\mathbf a_2$', answer: 1 / R2, tol: T },
        { prompt: '$\\mathbf q_2\\cdot\\mathbf a_1$', answer: 0, tol: T },
        { prompt: '$\\mathbf q_2\\cdot\\mathbf a_2$', answer: 3 / Math.sqrt(6), tol: T, mistakes: [[3, 'Divide by $\\sqrt6$.']] },
        { prompt: '$R = Q^{\\mathsf T}A$', answer: P6_R, tol: T },
      ],
      onDone: finish,
    });
    return {
      async showMe() { await ws.showMe(300); finish(); },
      solve() { ws.solve(); finish(); },
      wrong() { ws.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p7 [S] Classical against modified

export const p7: PuzzleDef = {
  id: 'c22-p7',
  title: 'Does the order of subtraction matter in the machine?',
  style: 'mastery',
  goal: 'Three arrows that point almost the same way: $(1, 10^{-8}, 0)$, $(1, 0, 10^{-8})$, $(1, 0, 0)$. Square them **classically** (subtract the shadows of the original arrow) and **modified** (subtract each shadow from what is left). Then say which stayed square.',
  subgoals: ['Run the classical version', 'Run the modified version', 'Pick the version whose last two arrows are at a right angle'],
  hints: [
    'On paper the two versions give the same arrows. In the machine, numbers keep only about 16 digits.',
    'Read the angle between $\\mathbf q_2$ and $\\mathbf q_3$ after each run.',
    'Classical ends 45° apart; modified ends at 90°. Pick modified.',
  ],
  par: 3,
  view: '3d',
  onWin: S.p7Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [0.4, 0, 0.1], distance: 6.5, azimuth: -58, elevation: 24, ms: 0 });
    p.grid({ base: 0.1, main: 0.2, axis: 0.45 });
    const ins = new Arrow([0, 0, 0], [1.6, 0, 0], { color: C.white, width: 0.045 });
    p.add(ins, new Label('three inputs, almost on top of each other', [1.6, 0, 0], { className: 'a8-pt dim', offset: [0, 26] }));
    const q2 = new Arrow([0, 0, 0], [0, 0, 0], { color: C.result, label: '$\\mathbf q_2$' });
    const q3 = new Arrow([0, 0, 0], [0, 0, 0], { color: C.orange, label: '$\\mathbf q_3$' });
    q2.object.visible = q3.object.visible = false;
    p.add(q2, q3);
    const r = p.readout('Angle between the last two arrows');
    const flags = [false, false, false];
    const tick = (i: number) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); } if (flags.every(Boolean)) p.win(); };
    const run = async (which: 'c' | 'm') => {
      p.move();
      const qs = which === 'c' ? classicalGS(P7_X) : modifiedGS(P7_X);
      q2.object.visible = q3.object.visible = true;
      sfx.whoosh(0.5);
      await Promise.all([q2.moveTo(v3(qs[1]), 600, [0, 0, 0]), q3.moveTo(v3(qs[2]), 600, [0, 0, 0])]);
      const a = angleDeg(qs[1], qs[2]);
      r.row(which, which === 'c' ? 'classical' : 'modified', `${fmtN(a, 1)}°`, Math.abs(a - 90) < 1e-3 ? C.good : C.orange);
      q3.setColor(Math.abs(a - 90) < 1e-3 ? C.result : C.orange);
      tick(which === 'c' ? 0 : 1);
    };
    const msg = h('div', { class: 'a8-msg' });
    const pick = (which: 'c' | 'm') => {
      p.move();
      if (!flags[0] || !flags[1]) { msg.textContent = 'Run both versions first.'; sfx.miss(); return; }
      if (which === 'm') { msg.className = 'a8-msg good'; msg.textContent = 'Modified. Each subtraction uses what is left, so the error from the first one is removed by the second.'; tick(2); }
      else { msg.className = 'a8-msg bad'; msg.textContent = 'Classical ended 45° apart: both shadows were taken from the original arrow, and the tiny error in q₂ was never removed.'; sfx.miss(); }
    };
    p.dock().append(
      h('div', { class: 'a8-btns' }, button('Run classical', () => void run('c'), { cls: 'small' }), button('Run modified', () => void run('m'), { cls: 'small' })),
      h('div', { class: 'a8-row' }, h('span', { class: 'k' }, 'Which stayed square?'), button('Classical', () => pick('c'), { cls: 'small ghost' }), button('Modified', () => pick('m'), { cls: 'small ghost' })),
      msg);
    return {
      async showMe() { await run('c'); await run('m'); pick('m'); },
      async solve() { await run('c'); await run('m'); pick('m'); },
      async wrong() { await run('c'); await run('m'); pick('c'); },
    };
  },
};
