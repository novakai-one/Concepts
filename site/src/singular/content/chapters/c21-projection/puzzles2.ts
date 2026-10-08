// Chapter 21 puzzles 5–8: projection onto a plane by hand [H], remove the hum, twice is once, and the
// projection matrix of a plane [S].
import type { PuzzleDef } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { InfLine } from '../../../gfx/shapes';
import { Projector3D, PointCloud } from '../../../kit/data';
import { VectorHandle } from '../../../kit/handle';
import { StepWorksheet } from '../../../kit/steps';
import { h, button } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { rng } from '../../../game/lawcheck';
import { dot, identity, matMul, matVec, meq, mlerp, norm, vsub, type Mat } from '../../../math/la';
import { DropLine } from './drop';
import {
  P5_A1, P5_A2, P5_ATA, P5_ATB, P5_B, P5_LEFT, P5_P, P5_X, P6_D, P6_KEEP, P6_S, P6_T, P7, P7_DIR, P7_NULL, P8, P8_INV,
  fmtN, fmtV, near, p6Won, p7NullOk, texM, tolFor,
} from './logic';
import { stepFor, tag, typedRow, v3 } from './puzzles';
import { S } from './script';

// ------------------------------------------------------------------ p5 [H] Projection onto a plane, any basis

export const p5: PuzzleDef = {
  id: 'c21-p5',
  title: 'What is the nearest point when the arrows are not square?',
  goal: 'The plane is spanned by $\\mathbf a_1 = (1, 1, 0)$ and $\\mathbf a_2 = (0, 1, 1)$, the columns of $A$. Find the point nearest $\\cg{\\mathbf b} = (1, 2, 3)$ by hand.',
  hints: [
    'The leftover $\\mathbf b - A\\hat{\\mathbf x}$ must read 0 against both columns: $A^{\\mathsf T}(\\mathbf b - A\\hat{\\mathbf x}) = \\mathbf 0$. So $A^{\\mathsf T}A\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b$.',
    '$A^{\\mathsf T}A = \\begin{bmatrix} 2 & 1 \\\\ 1 & 2 \\end{bmatrix}$ and $A^{\\mathsf T}\\mathbf b = (3, 5)$. Solve for the two weights.',
    'The weights are $(1/3, 7/3)$; the point is $\\frac13\\mathbf a_1 + \\frac73\\mathbf a_2 = (1/3, 8/3, 7/3)$.',
  ],
  par: 6,
  view: '3d',
  onWin: S.p5Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [0.4, 1.3, 1.3], distance: 10.5, azimuth: 30, elevation: 20, ms: 0 });
    p.grid({ base: 0.1, main: 0.2, axis: 0.45 });
    const pr = new Projector3D(p, { a: v3(P5_A1), b: v3(P5_A2), v: v3(P5_B), showProjection: false, labels: false, size: 6 });
    tag(p, '$\\mathbf a_1$', v3(P5_A1), 'b', [14, 16]);
    tag(p, '$\\mathbf a_2$', v3(P5_A2), 'b', [-16, -14]);
    tag(p, '$\\mathbf b$', v3(P5_B), 'g', [0, -20]);
    const r = p.readout('By hand');
    r.eq('A^{\\mathsf T}A\\,\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b');
    let done = false;
    const finish = async () => {
      if (done) return;
      done = true;
      r.row('x', 'weights $\\hat{\\mathbf x}$', fmtV(P5_X), C.result);
      r.row('p', 'nearest point $\\mathbf p$', fmtV(P5_P), C.result);
      r.row('d1', 'leftover $\\cdot\\,\\mathbf a_1$', fmtN(dot(P5_LEFT, P5_A1)), C.good);
      r.row('d2', 'leftover $\\cdot\\,\\mathbf a_2$', fmtN(dot(P5_LEFT, P5_A2)), C.good);
      p.win();
      await pr.reveal(1200);
      tag(p, '$\\mathbf p$', v3(P5_P), 'y', [18, 14]);
    };
    const ws = new StepWorksheet(p, {
      steps: [
        { prompt: '$A^{\\mathsf T}A$', answer: P5_ATA, mistakes: [[[[1, 1], [1, 1]], 'Each entry is a column dotted with a column: $\\mathbf a_1\\cdot\\mathbf a_1 = 2$.']] },
        { prompt: '$A^{\\mathsf T}\\mathbf b$', answer: [P5_ATB] },
        { prompt: 'weights $\\hat{\\mathbf x}$ from $A^{\\mathsf T}A\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b$', answer: [P5_X], mistakes: [[[3, 5], 'That is $A^{\\mathsf T}\\mathbf b$ itself. Solve the 2 × 2 system.']] },
        { prompt: 'nearest point $\\mathbf p = A\\hat{\\mathbf x}$', answer: [P5_P], mistakes: [[[1, 2, 0], 'Deleting a coordinate only works when the plane is a floor or a wall.']] },
        { prompt: 'leftover $\\mathbf b - \\mathbf p$', answer: [P5_LEFT] },
      ],
      onDone: () => { void finish(); },
    });
    return {
      async showMe() { await ws.showMe(350); await finish(); },
      async solve() { ws.solve(); await finish(); },
      wrong() { ws.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p6 Remove the hum

export const p6: PuzzleDef = {
  id: 'c21-p6',
  title: 'How do we take the hum out of Teo’s channel?',
  goal: 'The channel reads $\\cg{\\mathbf s} = (4, 3)$. The Anchor’s hum always points along $\\cr{\\mathbf d} = (0.6, 0.8)$. Drop $\\mathbf s$ onto the hum’s line, then **Remove the hum**: keep only the part at a right angle to it.',
  predict: {
    prompt: 'The arrow $\\mathbf d$ is one unit long. How far along the hum’s line does the shadow of $\\mathbf s$ reach?',
    choices: [{ id: 'five', text: '5, the length of $\\mathbf s$' }, { id: 'four8', text: '4.8' }, { id: 'three', text: '3' }],
    answer: 'four8',
    reveal: '$\\mathbf s\\cdot\\mathbf d = 4(0.6) + 3(0.8) = 4.8$. $\\mathbf d$ is one unit long, so the reading is the shadow length.',
  },
  hints: [
    'Drag the probe until the dashed leftover meets the hum’s line at a right angle.',
    'The shadow is $(\\mathbf s\\cdot\\mathbf d)\\,\\mathbf d = 4.8\\,(0.6, 0.8) = (2.88, 3.84)$.',
    'Keep $\\mathbf s$ minus its shadow: $(4, 3) - (2.88, 3.84) = (1.12, -0.84)$.',
  ],
  par: 3,
  onWin: S.p6Win,
  setup(p) {
    p.grid();
    void p.g.stage.view2D({ center: [2.2, 1.8], height: 7.6, ms: 0 });
    const tol = tolFor(p.difficulty);
    const sA = new Arrow([0, 0, 0], v3(P6_S), { color: C.v, label: '$\\mathbf s$' });
    const dA = new Arrow([0, 0, 0.01], v3(P6_D, 0.01), { color: C.w, label: '$\\mathbf d$', width: 0.06 });
    p.add(sA, dA);
    const r = p.readout('Teo’s channel');
    const meter = h('div', { class: 'a8-meter' }, h('span', null, 'static'), h('span', { class: 'bar warn' }, h('span', { style: 'width:90%' })));
    const msg = h('div', { class: 'a8-msg' });
    let done = false;
    const keepA = new Arrow([0, 0, 0.02], [0, 0, 0.02], { color: C.result, label: '$\\mathbf s - \\text{hum}$' });
    keepA.object.visible = false;
    p.add(keepA);
    const show = (t: number) => {
      r.row('t', 'shadow length along $\\mathbf d$', fmtN(t), C.result);
      r.row('a', 'part along the hum', fmtV([P6_D[0] * t, P6_D[1] * t]), C.result);
    };
    const dl = new DropLine(p, {
      dir: v3(P6_D), target: v3(P6_S), t0: 0.8, step: stepFor(p, 0.4, 0.2), magnet: p.difficulty === 'cadet' ? 0.3 : 0, range: [-1, 7], lineColor: C.w,
      onMove: (t) => show(t),
    });
    show(dl.t);
    const finish = async (keep: number[]) => {
      if (done) return;
      done = true;
      dl.setEnabled(false);
      show(P6_T);
      keepA.object.visible = true;
      (meter.querySelector('.bar span') as HTMLElement).style.width = '72%';
      r.row('k', 'kept', fmtV(keep), C.result);
      r.row('kd', 'kept $\\cdot\\,\\mathbf d$', fmtN(dot(keep, P6_D)), C.good);
      msg.className = 'a8-msg good';
      msg.textContent = 'Hum removed. The static dropped one step.';
      p.win();
      await keepA.moveTo(v3(keep, 0.02), 700, [0, 0, 0.02]);
    };
    const remove = () => {
      p.move();
      const keep = vsub(P6_S, [P6_D[0] * dl.t, P6_D[1] * dl.t]);
      if (p6Won(keep, tol)) { void finish(keep); return; }
      sfx.miss();
      keepA.object.visible = true;
      keepA.set([0, 0, 0.02], v3(keep, 0.02));
      msg.className = 'a8-msg bad';
      msg.textContent = `Kept ${fmtV(keep)}. It still reads ${fmtN(dot(keep, P6_D))} against the hum: some hum is left in it.`;
      p.bark('lantern', 'Hum still present. The part removed was not the shadow.');
    };
    p.dock().append(meter, h('div', { class: 'a8-btns' }, button('Remove the hum', remove, { cls: 'primary small' })), msg);
    const typed = p.difficulty === 'commander'
      ? typedRow(p, { dim: 2, label: '\\mathbf s - \\text{hum} =', prompt: 'Or type the part to keep exactly:', check: (v) => near(v, P6_KEEP, 1e-6) && (dl.set(P6_T), void finish(P6_KEEP), true) })
      : null;
    return {
      async showMe() { await dl.moveTo(P6_T, 900); await wait(200); remove(); },
      async solve() { dl.set(P6_T); show(P6_T); if (typed) { typed.set(P6_KEEP); typed.submit(); } else await finish(P6_KEEP); },
      wrong() { dl.set(5); remove(); },
    };
  },
};

// ------------------------------------------------------------------ p7 Twice is once

const BUOYS: number[][] = [];
for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) if (x || y) BUOYS.push([x, y]);

export const p7: PuzzleDef = {
  id: 'c21-p7',
  title: 'What happens if we drop everything twice?',
  goal: '$P = \\frac15\\begin{bmatrix} 1 & 2 \\\\ 2 & 4 \\end{bmatrix}$ drops every point onto the line through $(1, 2)$. Apply it, then apply it again. Then find an arrow it sends to the origin.',
  subgoals: ['Apply P', 'Apply P a second time', 'Drag the green arrow to one that P sends to the origin'],
  predict: {
    prompt: 'After the first application, what will the second one do to the buoys?',
    choices: [{ id: 'nothing', text: 'Nothing moves' }, { id: 'closer', text: 'They slide closer to the origin' }, { id: 'back', text: 'They go back where they started' }],
    answer: 'nothing',
    reveal: 'Nothing moves: every buoy is already on the line, and a point on the line is its own nearest point. $P^2 = P$.',
  },
  hints: [
    'Press **Apply P** twice. Watch which buoys move the second time.',
    'An arrow at a right angle to the line has no shadow on it. $P$ sends it to the origin.',
    'Try $\\mathbf x = (2, -1)$: it reads 0 against $(1, 2)$.',
  ],
  par: 3,
  onWin: S.p7Win,
  setup(p) {
    p.grid();
    void p.g.stage.view2D({ center: [0.2, 0.5], height: 9, ms: 0 });
    const tol = tolFor(p.difficulty);
    let M: Mat = identity(2);
    let applied = 0;
    const dots = BUOYS.map((b) => new Dot(v3(b, 0.03), { color: C.accent, size: 0.07, glow: 1.1 }));
    p.add(...dots);
    const dirLine = new InfLine(p.g.stage, [0, 0, 0], v3(P7_DIR), { color: C.result, width: 1.4, opacity: 0.4, dashed: true });
    const nullLine = new InfLine(p.g.stage, [0, 0, 0], v3(P7_NULL), { color: C.violet, width: 3, opacity: 0 });
    p.add(dirLine, nullLine);
    const r = p.readout('The matrix P');
    r.eq('P = \\tfrac15\\begin{bmatrix} 1 & 2 \\\\ 2 & 4 \\end{bmatrix}');
    r.row('det', '$\\det P$', '0');
    const flags = [false, false, false];
    const tick = (i: number) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); } if (flags.every(Boolean)) { r.note('$P^2 = P$, and $P$ flattens the line through $(2, -1)$ to the origin. Dropping twice is dropping once.'); p.win(); } };
    const px = new Arrow([0, 0, 0.02], [0, 0, 0.02], { color: C.result, label: '$P\\mathbf x$' });
    p.add(px);
    const x = new VectorHandle(p, {
      to: [-2, -1, 0], color: C.v, label: '$\\mathbf x$', limit: 4,
      onChange: (tip) => {
        const q = matVec(P7, [tip[0], tip[1]]);
        px.set([0, 0, 0.02], v3(q, 0.02));
        px.object.visible = norm(q) > 0.03;
        r.row('px', '$P\\mathbf x$', fmtV(q), C.result);
      },
      onCommit: (tip) => {
        if (p7NullOk([tip[0], tip[1]], tol)) {
          void animate(600, (k) => nullLine.line.setOpacity(0.9 * k), ease.out);
          sfx.discover();
          tick(2);
        }
      },
    });
    x.set([-2, -1, 0]);
    const apply = async () => {
      p.move();
      const from = M, to = matMul(P7, M);
      sfx.whoosh(0.8);
      await animate(900, (k) => { const A = mlerp(from, to, k); dots.forEach((d, i) => d.at(v3(matVec(A, BUOYS[i]), 0.03))); }, ease.inOut);
      const moved = !meq(from, to, 1e-9);
      M = to;
      applied++;
      if (applied === 1) { tick(0); p.bark('lantern', 'Every buoy dropped onto the line through (1, 2).'); }
      else if (!moved) { tick(1); r.row('pp', '$P^2$', 'equals $P$', C.good); p.bark('lantern', 'Second application. No buoy moved.'); }
    };
    p.dock().append(h('div', { class: 'a8-btns' }, button('Apply P', () => void apply(), { cls: 'primary small' })));
    return {
      async showMe() {
        while (applied < 2) await apply();
        await x.moveTo(v3(P7_NULL), 800);
      },
      async solve() { while (applied < 2) await apply(); x.set(v3(P7_NULL)); if (p7NullOk(P7_NULL, tol)) { nullLine.line.setOpacity(0.9); tick(2); } },
      async wrong() { await apply(); x.set([1, 2, 0]); },
    };
  },
};

// ------------------------------------------------------------------ p8 [S] One matrix for the plane

const CLOUD: number[][] = (() => { const r = rng(21); return Array.from({ length: 70 }, () => [r() * 5 - 2, r() * 5 - 1.5, r() * 4 - 0.5]); })();

export const p8: PuzzleDef = {
  id: 'c21-p8',
  title: 'Can one matrix drop every point onto the plane?',
  style: 'mastery',
  goal: 'For the plane of $\\mathbf a_1 = (1, 1, 0)$ and $\\mathbf a_2 = (0, 1, 1)$, build $P = A(A^{\\mathsf T}A)^{-1}A^{\\mathsf T}$. Then drop a cloud of buoys with it, twice.',
  hints: [
    '$A^{\\mathsf T}A = \\begin{bmatrix} 2 & 1 \\\\ 1 & 2 \\end{bmatrix}$; its inverse is $\\frac13\\begin{bmatrix} 2 & -1 \\\\ -1 & 2 \\end{bmatrix}$.',
    'Multiply $A$ (3 × 2) by the inverse (2 × 2), then by $A^{\\mathsf T}$ (2 × 3): a 3 × 3 matrix.',
    `$P = \\frac13\\begin{bmatrix} 2 & 1 & -1 \\\\ 1 & 2 & 1 \\\\ -1 & 1 & 2 \\end{bmatrix}$.`,
  ],
  par: 4,
  view: '3d',
  onWin: S.p8Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [0.4, 1.0, 1.1], distance: 12, azimuth: 30, elevation: 22, ms: 0 });
    const pr = new Projector3D(p, { a: v3(P5_A1), b: v3(P5_A2), v: v3(P5_B), showProjection: true, labels: false, size: 6 });
    void pr;
    const cloud = new PointCloud(p, { points: CLOUD, color: C.accent, size: 0.035, glow: 0.22, core: 1.25 });
    const r = p.readout('One matrix');
    r.row('n', 'buoys', '70 in a cloud');
    let built = false, drops = 0, done = false;
    let pts: number[][] = CLOUD.map((q) => q.slice());
    const drop = async () => {
      if (!built) { p.bark('lantern', 'Finish the matrix first.'); sfx.miss(); return; }
      p.move();
      const before = pts;
      const after = before.map((q) => matVec(P8, q));
      const moved = Math.max(...before.map((q, i) => norm(vsub(q, after[i]))));
      pts = after;
      drops++;
      if (drops >= 2 && moved < 1e-9 && !done) {
        done = true;
        r.row('pp', '$P^2 - P$', '0', C.good);
        r.row('pt', '$P^{\\mathsf T} - P$', '0', C.good);
        p.bark('lantern', 'Second drop. No buoy moved.');
        p.win();
      }
      await cloud.to(after, 900, C.result);
      if (drops === 1) p.bark('lantern', 'Seventy buoys dropped onto the plane.');
    };
    const ws = new StepWorksheet(p, {
      steps: [
        { prompt: '$(A^{\\mathsf T}A)^{-1}$', answer: P8_INV },
        { prompt: '$P = A(A^{\\mathsf T}A)^{-1}A^{\\mathsf T}$', answer: P8, mistakes: [[identity(3), 'The identity keeps every point where it is. This matrix drops points onto a plane.']] },
      ],
      onDone: () => { built = true; r.eq(`P = \\tfrac13${texM(P8.map((row) => row.map((x) => x * 3)))}`); sfx.success(); },
    });
    void ws;
    p.dock().append(h('div', { class: 'a8-btns' }, button('Drop with P', () => void drop(), { cls: 'primary small' })));
    return {
      async showMe() { await ws.showMe(300); await drop(); await drop(); },
      async solve() { ws.solve(); await drop(); await drop(); },
      wrong() { ws.wrong(); },
    };
  },
};
