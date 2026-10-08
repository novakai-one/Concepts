// Chapter 22 puzzles 1–4: square up two, square up three [H], coordinates by dot products [D], safe moves.
import { Vector3 } from 'three';
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { Label } from '../../../gfx/label';
import { FatLine } from '../../../gfx/lines';
import { Grid2D } from '../../../gfx/grid';
import { Outline2D } from '../../../gfx/shapes';
import { Knob, RightAngle, Shadow } from '../../../kit/geom';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { VectorInput, parseNum } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { tex } from '../../../../lib/md';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { det, dot, identity, matVec, mlerp, norm, transpose, vscale, vsub, type Mat, type Vec } from '../../../math/la';
import {
  MOVES, P1_B1, P1_B2, P1_C, P1_Q1, P1_Q2, P2_C21, P2_C31, P2_C32, P2_LEN2, P2_Q, P2_Q_TOL, P2_V1, P2_V2, P2_V3, P2_X, P3_C, P3_Q, P3_Q1,
  P3_Q2, P3_X, SAFE, angleDeg, fmtN, fmtV, maxOffDot, near, p1Q1Ok, p1Q2Ok, p3Won, p4Won, tolFor,
} from './logic';
import { S } from './script';
import '../c21-projection/c21.css';

export const v3 = (v: readonly number[], z = 0): V3 => [v[0], v[1], v[2] ?? z];

/** A knob that slides along the line through the origin in direction d (2-D); its arrow from the origin is drawn. */
function stretchKnob(p: PuzzleCtx, d: Vec, o: { k0: number; step: number | null; magnetK?: number; color: string; label: string; onMove(k: number): void; onEnd(k: number): void }) {
  const arrow = new Arrow([0, 0, 0.02], v3(vscale(d, o.k0), 0.02), { color: o.color, label: o.label });
  p.add(arrow);
  let k = o.k0;
  const knob = new Knob(p, v3(vscale(d, k), 0.02), {
    color: o.color,
    constrain: (q) => {
      let t = (q.x * d[0] + q.y * d[1]) / dot(d, d);
      if (o.step) t = Math.round(t / o.step) * o.step;
      if (o.magnetK !== undefined && Math.abs(t - o.magnetK) * norm(d) < 0.15) t = o.magnetK;
      k = Math.max(0, Math.min(1.4, t));
      return new Vector3(d[0] * k, d[1] * k, 0.02);
    },
    onMove: () => { arrow.set([0, 0, 0.02], v3(vscale(d, k), 0.02)); o.onMove(k); },
    onEnd: () => o.onEnd(k),
  });
  return {
    arrow, knob,
    get k() { return k; },
    set(kk: number) { k = kk; knob.at(v3(vscale(d, k), 0.02)); arrow.set([0, 0, 0.02], v3(vscale(d, k), 0.02)); o.onMove(k); },
    async moveTo(kk: number, ms = 700) { const k0 = k; await animate(ms, (t) => this.set(k0 + (kk - k0) * t), ease.inOut); o.onEnd(k); },
  };
}

/** The unit circle, dashed. */
function unitCircle(p: PuzzleCtx, color: string = C.white, opacity = 0.4) {
  const pts: V3[] = [];
  for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; pts.push([Math.cos(a), Math.sin(a), 0.005]); }
  const l = new FatLine(p.g.stage, pts, { color, width: 1.3, opacity, dashed: true, dashSize: 0.08, gapSize: 0.06 });
  p.add(l);
  return l;
}

// ------------------------------------------------------------------ p1 Square up two

export const p1: PuzzleDef = {
  id: 'c22-p1',
  title: 'Can two skewed arrows become a square pair?',
  goal: 'From $\\cg{\\mathbf b_1} = (3, 4)$ and $\\cr{\\mathbf b_2} = (2, 1)$, build $\\mathbf q_1$ and $\\mathbf q_2$: one unit long and at a right angle.',
  subgoals: ['Scale b₁ to length 1: that is q₁', 'Subtract the shadow of b₂ on q₁', 'Scale what is left to length 1: that is q₂'],
  hints: [
    '$\\mathbf b_1$ is 5 long. One fifth of it is one unit long: drag its tip onto the dashed unit circle.',
    'The shadow of $\\mathbf b_2$ on $\\mathbf q_1$ is $(\\mathbf b_2\\cdot\\mathbf q_1)\\,\\mathbf q_1$, and $\\mathbf b_2\\cdot\\mathbf q_1 = 1.2 + 0.8 = 2$.',
    '$\\mathbf q_1 = (0.6, 0.8)$ and $\\mathbf q_2 = (2, 1) - 2(0.6, 0.8) = (0.8, -0.6)$.',
  ],
  par: 3,
  onWin: S.p1Win,
  setup(p) {
    p.grid();
    void p.g.stage.view2D({ center: [1.4, 1.5], height: 7, ms: 0 });
    const d = p.difficulty, tol = tolFor(d);
    unitCircle(p);
    const b2 = new Arrow([0, 0, 0], v3(P1_B2), { color: C.w, label: '$\\mathbf b_2$' });
    p.add(b2);
    const ghost1 = new Arrow([0, 0, 0], v3(P1_B1), { color: C.v, opacity: 0.35, width: 0.035 });
    p.add(ghost1);
    const r = p.readout('Square up');
    const flags = [false, false, false];
    const tick = (i: number) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); } if (flags.every(Boolean)) { r.note('$\\mathbf q_1\\cdot\\mathbf q_2 = 0$ and both are one unit long.'); p.win(); } };
    const sh = new Shadow(p, { of: v3(P1_B2), onto: v3(P1_Q1), lineColor: C.v });
    sh.setOpacity(0);
    const mark = new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 1, 0], 0.18, { color: C.result });
    mark.show(false);
    const msg = h('div', { class: 'a8-msg' });
    const coefIn = h('input', { class: 'cell', style: 'width:72px', inputmode: 'decimal', 'aria-label': 'shadow coefficient', placeholder: '?' }) as HTMLInputElement;
    const subBtn = button('Subtract the shadow', () => void subtract(), { cls: 'small' });
    const scaleBtn = button('Scale to length 1', () => void scaleSecond(), { cls: 'small' });
    subBtn.disabled = true; scaleBtn.disabled = true;
    let left: Vec = P1_B2.slice();
    const show = (k: number) => {
      const q = vscale(P1_B1, k);
      r.row('q1', '$\\mathbf q_1$', fmtV(q), C.v);
      r.row('l1', 'its length', fmtN(norm(q)), Math.abs(norm(q) - 1) < 1e-9 ? C.good : C.white);
    };
    const doneQ1 = () => {
      if (flags[0]) return;
      sk.knob.setEnabled(false);
      sk.arrow.setLabel('$\\mathbf q_1$');
      tick(0);
      if (d === 'cadet') { void animate(500, (k) => sh.setOpacity(k), ease.out); subBtn.disabled = false; msg.textContent = 'The shadow of b₂ on q₁ is drawn. Subtract it.'; }
      else if (d === 'navigator') { coefIn.disabled = false; coefIn.focus(); msg.textContent = 'Type the shadow amount, b₂ · q₁. Then subtract.'; }
    };
    const sk = stretchKnob(p, P1_B1, {
      k0: 1, step: d === 'commander' ? null : 0.05, magnetK: d === 'cadet' ? P1_Q1[0] / P1_B1[0] : undefined, color: C.v, label: '$\\mathbf b_1$',
      onMove: (k) => show(k),
      onEnd: (k) => { if (p1Q1Ok(vscale(P1_B1, k), tol)) doneQ1(); },
    });
    show(1);
    const subtract = async (coef = P1_C) => {
      if (!flags[0] || flags[1]) return;
      p.move();
      sh.setOpacity(1);
      const to = vsub(P1_B2, vscale(P1_Q1, coef));
      await animate(700, (k) => b2.set([0, 0, 0], v3([P1_B2[0] + (to[0] - P1_B2[0]) * k, P1_B2[1] + (to[1] - P1_B2[1]) * k])), ease.inOut);
      left = to;
      await animate(300, (k) => sh.setOpacity(1 - k), ease.in);
      b2.setLabel('$\\mathbf b_2 - 2\\mathbf q_1$');
      mark.set([0, 0, 0], v3(P1_Q1), v3(left)); mark.show(true);
      r.row('v', 'what is left', fmtV(left), C.w);
      r.row('vd', 'its reading against $\\mathbf q_1$', fmtN(dot(left, P1_Q1)), C.good);
      r.row('vl', 'its length', fmtN(norm(left)));
      tick(1);
      subBtn.disabled = true; scaleBtn.disabled = false;
      msg.textContent = 'At a right angle to q₁. Now scale it to length 1.';
    };
    const scaleSecond = async () => {
      if (!flags[1] || flags[2]) return;
      p.move();
      const q2 = vscale(left, 1 / norm(left));
      b2.set([0, 0, 0], v3(q2));
      b2.setLabel('$\\mathbf q_2$');
      void b2.pulse();
      r.row('q2', '$\\mathbf q_2$', fmtV(q2), C.w);
      msg.textContent = `It was ${fmtN(norm(left))} long already: nothing to scale.`;
      if (p1Q2Ok(q2, tol)) tick(2);
    };
    const tryCoef = () => {
      const v = parseNum(coefIn.value);
      if (v === null) return;
      p.move();
      if (Math.abs(v - P1_C) < 1e-6) { coefIn.style.borderColor = C.good; void subtract(v); return; }
      sfx.miss();
      msg.className = 'a8-msg bad';
      msg.textContent = Math.abs(v - 10) < 1e-6 ? 'That is b₂ · b₁. Use the finished arrow q₁, one unit long.' : Math.abs(v - 0.4) < 1e-6 ? 'That is the amount of b₁. The shadow is measured in units of q₁.' : 'Not this amount. Dot b₂ with q₁.';
    };
    coefIn.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') tryCoef(); });
    coefIn.addEventListener('change', tryCoef);
    coefIn.disabled = true;
    if (d === 'commander') {
      const q1In = new VectorInput({ dim: 2, label: '\\mathbf q_1 =' });
      const q2In = new VectorInput({ dim: 2, label: '\\mathbf q_2 =' });
      const check = () => {
        p.move();
        const a = q1In.get(), b = q2In.get();
        if (!flags[0] && near(a, P1_Q1, 1e-6)) { sk.set(0.2); doneQ1(); }
        if (flags[0] && near(b, P1_Q2, 1e-6)) { void subtract().then(scaleSecond); msg.className = 'a8-msg good'; msg.textContent = 'Exactly.'; return; }
        sfx.miss(); msg.className = 'a8-msg bad';
        msg.textContent = !flags[0] ? 'q₁ must point along b₁ and be one unit long.' : Math.abs(dot(b, P1_Q1)) > 1e-6 ? `That reads ${fmtN(dot(b, P1_Q1))} against q₁: not at a right angle.` : 'At a right angle, but not one unit long, or not built from b₂.';
      };
      p.dock().append(h('div', { class: 'a8-note' }, 'Type both arrows exactly (decimals or fractions).'), h('div', { class: 'a8-row a8-in' }, q1In.el, q2In.el, button('Check', check, { cls: 'small' })), msg);
    } else {
      const row = d === 'navigator' ? [h('span', { class: 'k', html: inline('$\\mathbf b_2\\cdot\\mathbf q_1 =$') }), coefIn] : [subBtn];
      p.dock().append(h('div', { class: 'a8-row a8-in' }, ...row, scaleBtn), msg);
    }
    return {
      async showMe() {
        await sk.moveTo(0.2, 800);
        await wait(300);
        await subtract();
        await wait(300);
        await scaleSecond();
      },
      async solve() { sk.set(0.2); doneQ1(); await subtract(); await scaleSecond(); },
      wrong() { sk.set(0.4); },
    };
  },
};

// ------------------------------------------------------------------ p2 [H] Square up three

export const p2: PuzzleDef = {
  id: 'c22-p2',
  title: 'Can three skewed arrows become a square frame?',
  goal: 'Square up $\\cg{\\mathbf x_1} = (1, 1, 0)$, $\\cr{\\mathbf x_2} = (1, 0, 1)$ and $\\mathbf x_3 = (0, 1, 1)$ (blue), in order. Remove each arrow’s shadows on the ones already done, then scale.',
  hints: [
    '$\\mathbf v_1 = \\mathbf x_1$. The shadow amount of $\\mathbf x_2$ on it is $\\frac{\\mathbf x_2\\cdot\\mathbf v_1}{\\mathbf v_1\\cdot\\mathbf v_1} = \\frac12$.',
    '$\\mathbf v_2 = (1/2, -1/2, 1)$. For $\\mathbf x_3$ subtract $\\frac12\\mathbf v_1$ and $\\frac{\\mathbf x_3\\cdot\\mathbf v_2}{\\mathbf v_2\\cdot\\mathbf v_2}\\mathbf v_2 = \\frac13\\mathbf v_2$.',
    '$\\mathbf v_3 = (-2/3, 2/3, 2/3)$. The lengths squared are $2$, $3/2$ and $4/3$. Divide each $\\mathbf v_i$ by the square root of its length squared: that is $\\mathbf q_i$.',
  ],
  par: 7,
  view: '3d',
  onWin: S.p2Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [0.25, 0.3, 0.45], distance: 6.4, azimuth: 58, elevation: 38, ms: 0 });
    p.grid({ base: 0.1, main: 0.2, axis: 0.45 });
    const cols = [C.v, C.w, C.u];
    const arrows = P2_X.map((x, i) => new Arrow([0, 0, 0], v3(x), { color: cols[i], label: `$\\mathbf x_${i + 1}$` }));
    p.add(...arrows);
    const marks = [0, 1, 2].map(() => { const m = new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 1, 0], 0.16, { color: C.result }); m.show(false); return m; });
    const r = p.readout('Square up three');
    let fin: Promise<void> | null = null;
    const finish = () => (fin ??= (async () => {
      sfx.whoosh(0.6);
      await Promise.all([arrows[1].moveTo(v3(P2_V2), 700, [0, 0, 0]), arrows[2].moveTo(v3(P2_V3), 700, [0, 0, 0])]);
      arrows[1].setLabel('$\\mathbf v_2$'); arrows[2].setLabel('$\\mathbf v_3$');
      await wait(300);
      await Promise.all(P2_Q.map((q, i) => arrows[i].moveTo(v3(q), 700, [0, 0, 0])));
      arrows.forEach((a, i) => a.setLabel(`$\\mathbf q_${i + 1}$`));
      [[0, 1], [0, 2], [1, 2]].forEach(([i, j], k) => { marks[k].set([0, 0, 0], v3(P2_Q[i]), v3(P2_Q[j])); marks[k].show(true); });
      r.row('q1', '$\\mathbf q_1$', '$\\tfrac{1}{\\sqrt2}(1, 1, 0)$', C.v);
      r.row('q2', '$\\mathbf q_2$', '$\\tfrac{1}{\\sqrt6}(1, -1, 2)$', C.w);
      r.row('q3', '$\\mathbf q_3$', '$\\tfrac{1}{\\sqrt3}(-1, 1, 1)$', C.u);
      r.row('dot', 'largest dot product between two', maxOffDot(P2_Q).toExponential(0).replace('-', '−'), C.good);
      r.row('len', 'lengths', P2_Q.map((q) => fmtN(norm(q), 3)).join(', '), C.good);
      p.win();
    })());
    const ws = new StepWorksheet(p, {
      steps: [
        { prompt: '$\\frac{\\mathbf x_2\\cdot\\mathbf v_1}{\\mathbf v_1\\cdot\\mathbf v_1}$, with $\\mathbf v_1 = \\mathbf x_1$', answer: P2_C21, mistakes: [[1, 'Divide by $\\mathbf v_1\\cdot\\mathbf v_1 = 2$, not by 1.']] },
        { prompt: '$\\mathbf v_2 = \\mathbf x_2 - \\tfrac12\\mathbf v_1$', answer: [P2_V2] },
        { prompt: '$\\frac{\\mathbf x_3\\cdot\\mathbf v_1}{\\mathbf v_1\\cdot\\mathbf v_1}$', answer: P2_C31 },
        { prompt: '$\\frac{\\mathbf x_3\\cdot\\mathbf v_2}{\\mathbf v_2\\cdot\\mathbf v_2}$', answer: P2_C32, mistakes: [[1 / 2, 'That is the shadow on the original $\\mathbf x_2$. Use the finished $\\mathbf v_2$.'], [2 / 3, 'Divide by $\\mathbf v_2\\cdot\\mathbf v_2 = 3/2$.']] },
        { prompt: '$\\mathbf v_3 = \\mathbf x_3 - \\tfrac12\\mathbf v_1 - \\tfrac13\\mathbf v_2$', answer: [P2_V3], mistakes: [[[-1 / 2, 1 / 2, 1], 'Only the shadow on $\\mathbf v_1$ is gone. Subtract the one on $\\mathbf v_2$ too.']] },
        { prompt: 'lengths squared $\\|\\mathbf v_1\\|^2, \\|\\mathbf v_2\\|^2, \\|\\mathbf v_3\\|^2$', answer: [P2_LEN2] },
        { prompt: '$\\mathbf q_1, \\mathbf q_2, \\mathbf q_3$ as rows, each $\\mathbf v_i/\\|\\mathbf v_i\\|$ (two decimals)', answer: P2_Q, tol: P2_Q_TOL, mistakes: [[[P2_V1, P2_V2, P2_V3], 'Those are the $\\mathbf v_i$. Divide each by its length: $\\sqrt2$, $\\sqrt{3/2}$, $\\sqrt{4/3}$.']] },
      ],
      onDone: () => { void finish(); },
    });
    return {
      async showMe() { await ws.showMe(300); await finish(); },
      async solve() { ws.solve(); await finish(); },
      wrong() { ws.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p3 [D] Coordinates by dot products

export const p3: PuzzleDef = {
  id: 'c22-p3',
  title: 'How do you read a point in a square grid?',
  goal: 'Ilse’s record uses the square grid $\\cg{\\mathbf q_1} = (3/5, 4/5)$, $\\cr{\\mathbf q_2} = (-4/5, 3/5)$. Find the numbers of the point $\\mathbf x = (5, 5)$ in her grid, and why one dot product each is enough. Write $Q$ for the matrix with columns $\\mathbf q_1$ and $\\mathbf q_2$.',
  hints: [
    'Each number is the shadow length of $\\mathbf x$ on that arrow: $\\mathbf x\\cdot\\mathbf q_1$ and $\\mathbf x\\cdot\\mathbf q_2$.',
    '$\\mathbf x\\cdot\\mathbf q_1 = 3 + 4 = 7$ and $\\mathbf x\\cdot\\mathbf q_2 = -4 + 3 = -1$.',
    'Dotting $\\mathbf x = c_1\\mathbf q_1 + c_2\\mathbf q_2$ with $\\mathbf q_1$ leaves $c_1$ alone, because $\\mathbf q_1\\cdot\\mathbf q_1 = 1$ and $\\mathbf q_2\\cdot\\mathbf q_1 = 0$. The same holds for $c_2$. With $Q = [\\,\\mathbf q_1\\ \\mathbf q_2\\,]$, that is $Q^{\\mathsf T}Q = I$.',
  ],
  par: 4,
  onWin: S.p3Win,
  setup(p) {
    p.grid({ base: 0.15, main: 0.32, axis: 0.5 });
    void p.g.stage.view2D({ center: [1.6, 2.3], height: 10.5, ms: 0 });
    const d = p.difficulty;
    const qg = new Grid2D(p.g.stage, { base: 0, main: 0.5, axis: 0.85, color: '#d08a5a', width: 1.2 });
    qg.set(P3_Q);
    p.add(qg);
    const q1 = new Arrow([0, 0, 0.02], v3(P3_Q1, 0.02), { color: C.v, label: '$\\mathbf q_1$' });
    const q2 = new Arrow([0, 0, 0.02], v3(P3_Q2, 0.02), { color: C.w, label: '$\\mathbf q_2$' });
    const xd = new Dot(v3(P3_X, 0.03), { color: C.white, size: 0.11 });
    p.add(q1, q2, xd);
    p.add(new Label('$\\mathbf x = (5, 5)$', v3(P3_X), { className: 'a8-pt', offset: [0, -24] }));
    const r = p.readout('Ilse’s grid');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      r.row('c', 'numbers in her grid', fmtV(P3_C), C.result);
      r.row('d1', '$\\mathbf x\\cdot\\mathbf q_1$', '7', C.v);
      r.row('d2', '$\\mathbf x\\cdot\\mathbf q_2$', '−1', C.w);
      r.eq('Q^{\\mathsf T}Q = \\begin{bmatrix} \\mathbf q_1\\cdot\\mathbf q_1 & \\mathbf q_1\\cdot\\mathbf q_2 \\\\ \\mathbf q_2\\cdot\\mathbf q_1 & \\mathbf q_2\\cdot\\mathbf q_2 \\end{bmatrix} = I');
      p.win();
    };
    // the probe: a knob that snaps to the crossings of Ilse's grid; its numbers are read live
    let c: Vec = [0, 0];
    const probe = new Arrow([0, 0, 0.03], [0, 0, 0.03], { color: C.result, label: '$c_1\\mathbf q_1 + c_2\\mathbf q_2$' });
    probe.object.visible = false;
    p.add(probe);
    const showC = () => { r.row('c', 'knob in her numbers', fmtV(c), C.result); probe.set([0, 0, 0.03], v3(matVec(P3_Q, c), 0.03)); probe.object.visible = norm(c) > 0.01; };
    const knob = new Knob(p, [0, 0, 0.03], {
      color: C.result,
      constrain: (q) => {
        const cc = matVec(transpose(P3_Q), [q.x, q.y]);
        c = cc.map((x) => Math.round(x));
        const w = matVec(P3_Q, c);
        return new Vector3(w[0], w[1], 0.03);
      },
      onMove: () => showC(),
      onEnd: () => { if (d === 'cadet' && p3Won(c)) finish(); },
    });
    showC();
    let ws: StepWorksheet | null = null;
    let tiles: TileOrder | null = null;
    const sh1 = new Shadow(p, { of: v3(P3_X), onto: v3(P3_Q1), lineColor: C.v });
    const sh2 = new Shadow(p, { of: v3(P3_X), onto: v3(P3_Q2), lineColor: C.w });
    if (d !== 'cadet') { sh1.setOpacity(0); sh2.setOpacity(0); }
    const reveal = async () => { await animate(500, (k) => { sh1.setOpacity(k); sh2.setOpacity(k); }, ease.out); };
    const steps = [
      { prompt: 'the first number $c_1 = \\mathbf x\\cdot\\mathbf q_1$', answer: 7, mistakes: [[5, 'That is a coordinate in our grid. Dot with $\\mathbf q_1$.']] as [number, string][] },
      { prompt: 'the second number $c_2 = \\mathbf x\\cdot\\mathbf q_2$', answer: -1 },
      { prompt: 'Why: dot $\\mathbf x = c_1\\mathbf q_1 + c_2\\mathbf q_2$ with $\\mathbf q_1$, giving $\\mathbf x\\cdot\\mathbf q_1 = c_1\\,\\mathbf q_1\\cdot\\mathbf q_1 + c_2\\,\\mathbf q_2\\cdot\\mathbf q_1$. So $\\mathbf q_1\\cdot\\mathbf q_1 =$', answer: 1 },
      { prompt: '$\\mathbf q_2\\cdot\\mathbf q_1 =$ (so only $c_1$ is left)', answer: 0 },
      { prompt: 'the same for $c_2$ needs every $\\mathbf q_i\\cdot\\mathbf q_j$. With $Q = [\\,\\mathbf q_1\\ \\mathbf q_2\\,]$, $Q^{\\mathsf T}Q =$', answer: identity(2) },
    ];
    if (d === 'cadet') {
      r.row('d1', '$\\mathbf x\\cdot\\mathbf q_1$', '7', C.v);
      r.row('d2', '$\\mathbf x\\cdot\\mathbf q_2$', '−1', C.w);
      p.setGoal('The shadows of $\\mathbf x = (5, 5)$ on $\\mathbf q_1$ and $\\mathbf q_2$ are drawn, with their dot products. Drag the yellow knob along Ilse’s copper grid onto $\\mathbf x$ and read its numbers.');
    } else if (d === 'navigator') {
      ws = new StepWorksheet(p, { steps, onDone: () => { void reveal().then(finish); } });
    } else {
      const TILES = [
        { id: 'write', text: 'Write $\\mathbf x = c_1\\mathbf q_1 + c_2\\mathbf q_2$.' },
        { id: 'dot', text: 'Dot both sides with $\\mathbf q_1$: $\\mathbf x\\cdot\\mathbf q_1 = c_1\\,\\mathbf q_1\\cdot\\mathbf q_1 + c_2\\,\\mathbf q_2\\cdot\\mathbf q_1$.' },
        { id: 'ortho', text: '$\\mathbf q_1\\cdot\\mathbf q_1 = 1$ and $\\mathbf q_2\\cdot\\mathbf q_1 = 0$, so $c_1 = \\mathbf x\\cdot\\mathbf q_1$. The same for $c_2$.' },
        { id: 'stack', text: 'Stack the dot products: $\\mathbf c = Q^{\\mathsf T}\\mathbf x$, so $Q^{\\mathsf T}Q = I$ and $Q^{-1} = Q^{\\mathsf T}$.' },
      ];
      const REF = TILES.map((t) => t.id);
      tiles = new TileOrder(p, {
        title: 'Why one dot product is enough: order the steps', tiles: TILES, submitLabel: 'Check order',
        onSubmit: (o) => {
          p.move();
          if (o.join() === REF.join()) { tiles!.el.remove(); ws = new StepWorksheet(p, { title: 'The last line', steps: [{ prompt: 'the numbers $\\mathbf c = Q^{\\mathsf T}\\mathbf x$', answer: [P3_C] }], onDone: () => { void reveal().then(finish); } }); }
          else { sfx.miss(); p.bark('lantern', 'That order does not reach the reason. Start by writing x in Ilse’s grid.'); }
        },
      });
    }
    return {
      async showMe() {
        if (d === 'cadet') { const w = matVec(P3_Q, P3_C); await knob.moveTo([w[0], w[1], 0.03], 900); c = P3_C.slice(); showC(); finish(); return; }
        if (tiles) { tiles.el.remove(); ws = new StepWorksheet(p, { title: 'The last line', steps: [{ prompt: 'the numbers $\\mathbf c = Q^{\\mathsf T}\\mathbf x$', answer: [P3_C] }], onDone: () => {} }); }
        await ws!.showMe(300); await reveal(); finish();
      },
      solve() {
        if (d === 'cadet') { c = P3_C.slice(); const w = matVec(P3_Q, c); knob.at([w[0], w[1], 0.03]); showC(); finish(); return; }
        if (tiles) { tiles.el.remove(); ws = new StepWorksheet(p, { title: 'The last line', steps: [{ prompt: 'the numbers', answer: [P3_C] }], onDone: () => {} }); }
        ws!.solve(); finish();
      },
      wrong() { if (d === 'cadet') { c = [5, 5]; showC(); } else ws?.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p4 Safe moves

const SQUARE: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];

export const p4: PuzzleDef = {
  id: 'c22-p4',
  title: 'Which moves keep every length and angle?',
  goal: 'Apply each move to the unit circle and the square (click its card). **Pin** every move under which the unit circle lands back on the dashed unit circle and the square keeps sides of length 1.',
  predict: {
    prompt: '$\\begin{bmatrix} 2 & 0 \\\\ 0 & 0.5 \\end{bmatrix}$ keeps every area. Does it keep the circle a circle?',
    choices: [{ id: 'yes', text: 'Yes' }, { id: 'no', text: 'No' }],
    answer: 'no',
    reveal: 'No. It stretches across by 2 and squashes up by a half: the circle becomes a long ellipse with the same area. Keeping area is not keeping lengths.',
  },
  hints: [
    'A safe move keeps the grid arrows one unit long and at a right angle: check both columns.',
    'The shear and $\\begin{bmatrix} 2 & 0 \\\\ 0 & 0.5 \\end{bmatrix}$ change lengths. $\\begin{bmatrix} 1 & 1 \\\\ -1 & 1 \\end{bmatrix}$ has columns at a right angle, but 1.41 long.',
    'Pin the turn, the flip and the swap.',
  ],
  par: 9,
  onWin: S.p4Win,
  setup(p) {
    const grid = p.grid({ base: 0.12, main: 0.4, axis: 0.6 });
    void p.g.stage.view2D({ center: [0.3, 0.2], height: 6.5, ms: 0 });
    const sq = new Outline2D(p.g.stage, SQUARE, { color: C.accent, opacity: 0.16 });
    p.add(sq);
    const circ: V3[] = [];
    for (let i = 0; i <= 120; i++) { const a = (i / 120) * Math.PI * 2; circ.push([Math.cos(a), Math.sin(a), 0.01]); }
    const ghost = new FatLine(p.g.stage, circ, { color: C.white, width: 1.2, opacity: 0.35, dashed: true, dashSize: 0.08, gapSize: 0.06 });
    const ring = new FatLine(p.g.stage, circ, { color: C.result, width: 2.2, intensity: 1.2 });
    const e1 = new Arrow([0, 0, 0.02], [1, 0, 0.02], { color: C.v, label: '$A\\mathbf e_1$' });
    const e2 = new Arrow([0, 0, 0.02], [0, 1, 0.02], { color: C.w, label: '$A\\mathbf e_2$' });
    p.add(ghost, ring, e1, e2);
    const r = p.readout('The move');
    r.row('n', 'move', 'click a card');
    let M: Mat = identity(2);
    const pinned = new Set<string>();
    const seen = new Set<string>();
    const set = (A: Mat) => {
      M = A;
      grid.set(A); sq.set(A);
      ring.setPoints(circ.map((q) => v3(matVec(A, [q[0], q[1]]), 0.01)));
      e1.set([0, 0, 0.02], v3([A[0][0], A[1][0]], 0.02)); e2.set([0, 0, 0.02], v3([A[0][1], A[1][1]], 0.02));
    };
    const readouts = (m: typeof MOVES[number]) => {
      const a = [m.M[0][0], m.M[1][0]], b = [m.M[0][1], m.M[1][1]];
      r.row('n', 'move', m.note);
      r.row('l', 'column lengths', `${fmtN(norm(a))}, ${fmtN(norm(b))}`, Math.abs(norm(a) - 1) < 1e-9 && Math.abs(norm(b) - 1) < 1e-9 ? C.good : C.orange);
      r.row('a', 'angle between columns', `${fmtN(angleDeg(a, b), 1)}°`, Math.abs(dot(a, b)) < 1e-9 ? C.good : C.orange);
      r.row('d', '$\\det$', fmtN(det(m.M)));
    };
    const cards = h('div', { class: 'a8-cards' });
    const els = new Map<string, { card: HTMLElement; pin: HTMLElement }>();
    let busy = false;
    const apply = async (m: typeof MOVES[number]) => {
      if (busy) return;
      busy = true;
      p.move();
      seen.add(m.id);
      els.forEach((e, id) => { e.card.classList.toggle('on', id === m.id); e.card.classList.toggle('seen', seen.has(id)); });
      const A0 = M;
      sfx.whoosh(0.6);
      await animate(500, (k) => set(mlerp(A0, identity(2), k)), ease.inOut);
      await animate(900, (k) => set(mlerp(identity(2), m.M, k)), ease.inOut);
      if (p.difficulty !== 'commander') readouts(m);
      busy = false;
    };
    const check = () => { if (p4Won([...pinned])) { r.note('The turn, the flip and the swap keep every length and every angle. Their columns are one unit long and at a right angle.'); p.win(); } };
    const togglePin = (id: string) => {
      p.move();
      if (pinned.has(id)) pinned.delete(id); else pinned.add(id);
      const e = els.get(id)!;
      e.pin.classList.toggle('on', pinned.has(id));
      e.pin.textContent = pinned.has(id) ? 'pinned safe' : 'pin';
      sfx.click();
      if (id === 'grow' && pinned.has(id)) p.bark('lantern', 'Still a circle, but a bigger one: the lengths changed.');
      check();
    };
    for (const m of MOVES) {
      const pin = h('span', { class: 'pin', role: 'button', tabindex: '0' }, 'pin');
      const card = h('button', { class: 'a8-card', type: 'button', 'aria-label': `apply ${m.note}` }, h('span', { class: 'm', html: tex(m.tex, false) }), pin);
      card.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('.pin')) { togglePin(m.id); return; } void apply(m); });
      els.set(m.id, { card, pin });
      cards.appendChild(card);
    }
    p.dock().append(h('div', { class: 'a8-note' }, 'Click a card to apply its move. Click its pin to mark it safe.'), cards);
    set(identity(2));
    return {
      async showMe() { for (const m of MOVES) { await apply(m); if (SAFE.includes(m.id) && !pinned.has(m.id)) togglePin(m.id); await wait(250); } },
      solve() { for (const id of SAFE) if (!pinned.has(id)) togglePin(id); },
      wrong() { togglePin('turn'); togglePin('squash'); togglePin('swap'); },
    };
  },
};
