// Developer showcase for kit/geom.ts and kit/data.ts: one puzzle per picture.
// Not part of the story (open with ?chapter=c92 or from the dev chapter list).
import { Vector3 } from 'three';
import type { ChapterDef, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { FatLine } from '../../../gfx/lines';
import { Pad } from '../../../gfx/markers';
import { C } from '../../../core/theme';
import { button, h } from '../../../ui/ui';
import { nice } from '../../../math/frac';
import { angle, dot, type Mat } from '../../../math/la';
import { sfx } from '../../../audio/sfx';
import { animate, ease } from '../../../core/tween';
import { VectorHandle } from '../../../kit/handle';
import {
  AngleArc, Knob, Shadow, Sweep, UnitCircleImage, add3, bestLine, blob2, deg, len3, noisyLine, principal, rad,
  rayPlane, sub3, unit3,
} from '../../../kit/geom';
import { FitLine, PCAView, Projector3D } from '../../../kit/data';

const f2 = (x: number) => (Math.abs(x) < 0.005 ? '0' : x.toFixed(2));
const vec = (v: number[]) => `(${v.slice(0, 2).map((x) => nice(x)).join(', ')})`;
const texM = (M: Mat) => `A = \\begin{bmatrix} ${M.map((r) => r.map((x) => nice(x)).join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;

// ------------------------------------------------------------------ 1. Shadow

const shadow: PuzzleDef = {
  id: 'kg-shadow',
  title: 'How long is the shadow of v on w?',
  goal: 'Drag the tip of $\\mathbf v$ until its shadow on $\\mathbf w$ (the yellow arrow) is exactly **2** long.',
  hints: [
    'The dashed line drops from the tip of $\\mathbf v$ straight onto the line through $\\mathbf w$. The shadow ends where it lands.',
    'The shadow is $\\mathbf v\\cdot\\mathbf w / |\\mathbf w|$ long. Here $|\\mathbf w| = 5$, so you need $\\mathbf v\\cdot\\mathbf w = 10$, which is $3x + 4y = 10$.',
    'Put the tip of $\\mathbf v$ at $(2, 1)$: $6 + 4 = 10$.',
  ],
  par: 2,
  async setup(p) {
    await p.g.stage.view2D({ center: [1, 1.2], height: 10, ms: 0 });
    p.grid();
    const w: V3 = [3, 4, 0];
    const target = 2;
    const pad = new Pad(p.g.stage, [1.2, 1.6, 0], { radius: 0.26 });
    p.add(pad);
    const sh = new Shadow(p, { onto: w, of: [-2, 2, 0] });
    const wArrow = new Arrow([0, 0, 0], w, { color: C.w, label: '$\\mathbf w$' });
    p.add(wArrow);
    const arc = new AngleArc(p, [0, 0, 0], [-2, 2, 0], w, { label: '$\\theta$', radius: 0.6 });
    const r = p.readout('Shadow');
    const upd = (tip: V3) => {
      sh.set(tip, w);
      arc.set(tip, w);
      r.row('v', '$\\mathbf v$', vec(tip), C.v);
      r.row('w', '$\\mathbf w$', vec(w), C.w);
      r.row('dot', '$\\mathbf v\\cdot\\mathbf w$', nice(tip[0] * w[0] + tip[1] * w[1]));
      r.row('th', 'angle $\\theta$', `${Math.round(deg(angle(tip, w)))}°`);
      r.row('len', 'shadow length', f2(sh.value), C.result);
      r.eq('\\text{shadow} = \\frac{\\mathbf v\\cdot\\mathbf w}{|\\mathbf w|}');
    };
    const check = () => {
      if (Math.abs(sh.value - target) < 0.05) { void pad.hit(); p.win(); }
    };
    const v = new VectorHandle(p, { to: [-2, 2, 0], color: C.v, label: '$\\mathbf v$', limit: 7, onChange: upd, onCommit: check });
    upd(v.tip);
    return {
      async showMe() { await v.moveTo([2, 1, 0], 1000); },
    };
  },
};

// ------------------------------------------------------------------ 2. Sweep: find an eigen-direction

const SWEEP_M: Mat = [[1, 1], [0.5, 1.5]];

const sweep: PuzzleDef = {
  id: 'kg-sweep',
  title: 'Which arrows stay on their own line?',
  goal: 'Drag the green arrow $\\mathbf x$ around the circle. Stop where $A\\mathbf x$ lands on the same line as $\\mathbf x$.',
  hints: [
    'Watch the small arc between $\\mathbf x$ and $A\\mathbf x$. You want it to close up.',
    'When $\\mathbf x$ is close, a violet line lights up through the origin. Let go there.',
    'Try $\\mathbf x$ pointing up and to the right at 45°. Then $A\\mathbf x$ is twice as long, on the same line.',
  ],
  setup(p) {
    p.grid();
    const r = p.readout('Test arrow');
    r.eq(texM(SWEEP_M));
    const upd = () => {
      const x = sw.xVec, y = sw.image;
      r.row('ang', 'angle between $\\mathbf x$ and $A\\mathbf x$', `${Math.round(deg(angle(x, y)))}°`);
      r.row('len', 'length of $A\\mathbf x$ ÷ length of $\\mathbf x$', f2(len3(y) / len3(x)), C.result);
      r.row('found', 'lines found', `${sw.found.size} of ${sw.eigenAngles().length}`, C.violet);
    };
    const sw: Sweep = new Sweep(p, {
      M: SWEEP_M, radius: 1.6, start: rad(110),
      onChange: upd,
      onFound: () => upd(),
      onCommit: () => { upd(); if (sw.onEigen) p.win(); },
    });
    upd();
    const dock = p.dock();
    dock.append(h('div', { class: 'c-muted', style: 'font-size:13px' }, 'Or let the arrow go round by itself:'),
      button('Sweep once', () => { void sw.animateSweep(6000); }, { cls: 'small' }));
    return {
      async showMe() { await sw.showEigen(1100); },
    };
  },
};

// ------------------------------------------------------------------ 3. Sweep with no real eigen-direction

const ROT_M: Mat = [[0.8, -1.2], [0.9, 0.6]];

const noEigen: PuzzleDef = {
  id: 'kg-noeigen',
  title: 'Does every matrix have such a line?',
  goal: 'Sweep $\\mathbf x$ all the way round. Then answer below: is there a direction where $A\\mathbf x$ stays on the line of $\\mathbf x$?',
  hints: [
    'Press **Sweep once** and watch the arc between $\\mathbf x$ and $A\\mathbf x$.',
    'The arc never closes: $A\\mathbf x$ is always turned away from $\\mathbf x$. This matrix turns every arrow.',
    'Pick **No line**.',
  ],
  setup(p) {
    p.grid();
    const r = p.readout('Test arrow');
    r.eq(texM(ROT_M));
    let smallest = Infinity;
    const upd = () => {
      const a = deg(angle(sw.xVec, sw.image));
      smallest = Math.min(smallest, Math.min(a, 180 - a));
      r.row('ang', 'angle between $\\mathbf x$ and $A\\mathbf x$', `${Math.round(a)}°`);
      r.row('min', 'closest to the same line so far', `${Math.round(smallest)}°`, C.violet);
      r.row('cov', 'circle swept', `${Math.round(sw.coverage * 100)}%`);
    };
    const sw: Sweep = new Sweep(p, { M: ROT_M, radius: 1.4, start: rad(20), onChange: upd });
    upd();
    const dock = p.dock();
    const fb = h('div', { class: 'c-muted', style: 'font-size:13px;min-height:18px' });
    const yes = button('Yes, there is a line', () => {
      sfx.miss();
      fb.innerHTML = 'Sweep once and watch the smallest angle in the readout. It never reaches 0°.';
    }, { cls: 'small' });
    const no = button('No line', () => {
      no.classList.add('primary');
      fb.textContent = 'Right. Every arrow is turned off its line, so no direction stays put.';
      p.win();
    }, { cls: 'small' });
    dock.append(button('Sweep once', () => { void sw.animateSweep(6000); }, { cls: 'small' }),
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, yes, no), fb);
    return {
      async showMe() { await sw.showEigen(1000); no.click(); },
    };
  },
};

// ------------------------------------------------------------------ 4. SVD: rotate, stretch, rotate

const SVD_M: Mat = [[1.6, 0.9], [0.3, 1.2]];

const svdPuzzle: PuzzleDef = {
  id: 'kg-svd',
  title: 'How does a matrix turn a circle into an ellipse?',
  goal: 'Reach the dashed ellipse in three moves: **rotate**, **stretch**, **rotate**. Press the moves in order.',
  hints: [
    'The first move turns the circle so that $\\mathbf v_1$ lies on the x-axis.',
    'The stretch pulls along the x-axis by $\\sigma_1$ and along the y-axis by $\\sigma_2$. The last move turns the ellipse into place.',
    'Press 1, then 2, then 3.',
  ],
  async setup(p) {
    await p.g.stage.view2D({ height: 7.5, ms: 0 });
    const grid = p.grid({ base: 0.18, main: 0.4 });
    const r = p.readout('Three moves');
    r.eq(texM(SVD_M) + ' = U\\,\\Sigma\\,V^{\\mathsf T}');
    const names = ['the circle', 'rotated', 'stretched', 'rotated again'];
    const turn = (a: number) => `${Math.abs(Math.round(deg(a)))}° ${a < 0 ? 'clockwise' : 'anticlockwise'}`;
    const btns: HTMLButtonElement[] = [];
    const sync = () => {
      const k = Math.round(ci.stage);
      const d = ci.dec;
      r.row('st', 'now showing', names[k]);
      r.row('m1', '1 · rotate', turn(-d.theta));
      r.row('m2', '2 · stretch x and y by', `${f2(d.s[0])} and ${f2(d.s[1])}`, C.result);
      r.row('m3', '3 · rotate', turn(d.phi));
      btns.forEach((b, i) => { b.disabled = i !== k; b.classList.toggle('primary', i === k); });
    };
    const ci = new UnitCircleImage(p, {
      M: SVD_M, grid,
      onStage: (k) => { sync(); if (k === 3) p.win(); },
    });
    const dock = p.dock();
    const row = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' });
    (['1 · Rotate', '2 · Stretch', '3 · Rotate'] as const).forEach((t) => {
      const b = button(t, () => { btns.forEach((x) => { x.disabled = true; }); void ci.step().then(() => p.move()); }, { cls: 'small' });
      btns.push(b);
      row.append(b);
    });
    dock.append(row, button('Back to the circle', () => { void ci.reset().then(sync); }, { cls: 'small ghost' }));
    sync();
    return {
      async showMe() {
        if (ci.next === null) await ci.reset(300);
        const left = (['rotate', 'stretch', 'rotate'] as const).slice(Math.round(ci.stage));
        await ci.play([...left], { pause: 250 });
      },
    };
  },
};

// ------------------------------------------------------------------ 5. Fit a line

const FIT_PTS = noisyLine(12, { m: 0.55, c: 0.3, x0: -5.8, x1: 3.6, noise: 0.75, seed: 21 });
const FIT_BEST = bestLine(FIT_PTS)!;

const fit: PuzzleDef = {
  id: 'kg-fit',
  title: 'Which line passes closest to all the points?',
  goal: 'Drag the two yellow handles to move the line. Get the sum of squared residuals within **1%** of the smallest possible.',
  hints: [
    'Each green or red segment is a residual: how far a point is above or below the line. Green points are above it, red points below.',
    'Make the green and red segments balance out, then fine-tune the slope. Watch the readout drop.',
    `The best line is about $y = ${FIT_BEST.m.toFixed(2)}x ${FIT_BEST.c < 0 ? '-' : '+'} ${Math.abs(FIT_BEST.c).toFixed(2)}$. Show me moves the line there.`,
  ],
  setup(p) {
    p.grid();
    const r = p.readout('Fit');
    let fl!: FitLine;
    const upd = () => {
      const best = fl.bestSsr;
      const over = (fl.ssr / best - 1) * 100;
      r.row('line', 'line', `y = ${f2(fl.m)}x ${fl.c < 0 ? '−' : '+'} ${f2(Math.abs(fl.c))}`, C.result);
      r.row('ssr', 'sum of squared residuals', f2(fl.ssr));
      r.row('gap', 'above the smallest by', `${over < 0.05 ? '0' : over.toFixed(over < 10 ? 1 : 0)}%`, over <= 1 ? C.good : C.orange);
      r.eq('\\sum_i \\big(y_i - (m x_i + c)\\big)^2');
    };
    fl = new FitLine(p, {
      points: FIT_PTS, m: 0, c: -1.2,
      onChange: upd,
      onCommit: () => { upd(); if (fl.ssr <= fl.bestSsr * 1.01) p.win(); },
    });
    upd();
    const sqBtn = button('Show the squares', () => {
      fl.showSquares(!fl.squaresShown);
      sqBtn.textContent = fl.squaresShown ? 'Hide the squares' : 'Show the squares';
    }, { cls: 'small' });
    p.dock().append(h('div', { class: 'c-muted', style: 'font-size:13px' }, 'Each square has a residual as its side. Their total area is the sum of squared residuals.'), sqBtn);
    return {
      async showMe() { await fl.showBest(1400); },
    };
  },
};

// ------------------------------------------------------------------ 6. Closest point of a plane (3-D)

const PA: V3 = [2, 0, 1], PB: V3 = [-2, 0.5, -0.75], PV: V3 = [1.5, 0.5, 2.5];

const plane: PuzzleDef = {
  id: 'kg-plane',
  title: 'Which point of the plane is closest to v?',
  goal: 'Drag the yellow point around the blue plane. Find the spot closest to the tip of $\\mathbf v$.',
  view: '3d',
  hints: [
    'The dashed line runs from your point to the tip of $\\mathbf v$. Make it as short as you can.',
    'At the closest spot the dashed line stands straight up from the plane: it makes a right angle with every direction in the plane.',
    'The closest spot is $(2, 1, 1.5)$, which is $3\\mathbf a + 2\\mathbf b$.',
  ],
  async setup(p) {
    await p.g.stage.view3D({ distance: 14, azimuth: -40, elevation: 20, target: [0.6, 0.6, 0.9], ms: 0 });
    p.grid({ base: 0.12, main: 0.22, axis: 0.5 });
    const pr = new Projector3D(p, { a: PA, b: PB, v: PV, showProjection: false, size: 6.5 });
    const n = pr.normal;
    const best = pr.p;
    // an orthonormal pair in the plane, to keep the point on the visible patch
    const e1 = unit3(PA), e2 = unit3(sub3(PB, add3([0, 0, 0], e1, dot(PB, e1))));
    const lim = 3.1;
    const link = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.orange, width: 1.8, opacity: 0.9, dashed: true, dashSize: 0.14, gapSize: 0.1 });
    p.add(link);
    const r = p.readout('Distance');
    const upd = (q: V3) => {
      link.setPoints([q, PV]);
      r.row('q', 'your point', `(${q.map((x) => f2(x)).join(', ')})`, C.result);
      r.row('d', 'distance to the tip of $\\mathbf v$', f2(len3(sub3(PV, q))), C.orange);
    };
    let done = false;
    const finish = async () => {
      if (done) return;
      done = true;
      knob.setEnabled(false);
      p.win();
      await knob.moveTo(best, 250);
      link.setOpacity(0);
      await pr.reveal(1200);
      r.row('d', 'distance to the tip of $\\mathbf v$', f2(pr.distance), C.orange);
      r.note('The closest point is the projection $\\mathbf p$. The leftover $\\mathbf v - \\mathbf p$ is perpendicular to the plane.');
    };
    const knob: Knob = new Knob(p, [-1.5, 1.5, 0], {
      color: C.result,
      // the pointer ray meets the tilted plane: the point stays under the cursor
      constrain: (q) => {
        const cam = p.g.stage.camera.position;
        const hit = rayPlane([cam.x, cam.y, cam.z], [q.x, q.y, q.z], n, 0);
        if (!hit) return knob.group.position.clone();
        const s = Math.max(-lim, Math.min(lim, dot(hit, e1)));
        const t = Math.max(-lim, Math.min(lim, dot(hit, e2)));
        return new Vector3(...add3(add3([0, 0, 0], e1, s), e2, t));
      },
      onMove: upd,
      onEnd: (q) => { if (len3(sub3(q, best)) < 0.15) void finish(); },
    });
    upd(knob.pos);
    return {
      async showMe() { await knob.moveTo(best, 1000); upd(knob.pos); await finish(); },
    };
  },
};

// ------------------------------------------------------------------ 7. Principal directions

const CLOUD = blob2(1200, { s1: 1.9, s2: 0.55, angle: rad(28), mean: [0.4, -0.3], seed: 5 });
const blobFirst = () => principal(CLOUD).vectors[0];

const pcaPuzzle: PuzzleDef = {
  id: 'kg-pca',
  title: 'Which line keeps the points most spread out?',
  goal: 'Turn the yellow line around the mean by dragging its handle. Find the direction where the shadows of the points spread out the most.',
  hints: [
    'Each yellow dot on the line is the shadow of one point. The thick bar shows how far they spread.',
    'Line it up with the long direction of the cloud.',
    `The best line points about ${Math.round(deg(Math.atan2(blobFirst()[1], blobFirst()[0])))}° above the x-axis.`,
  ],
  setup(p) {
    p.grid({ base: 0.2, main: 0.35 });
    const view = new PCAView(p, { points: CLOUD });
    void view.showAxes(false);
    const m = view.mean, R = 3.2;
    const best = view.spread(view.first);
    const r = p.readout('Spread of the shadows');
    let dir: V3 = [Math.cos(rad(-50)), Math.sin(rad(-50)), 0];
    // within about 2° of the first principal direction (the readout turns green at the same point)
    const GOAL = 0.9985;
    let ratio = 0;
    const upd = () => {
      const s = view.setProbe(dir);
      ratio = s / best;
      r.row('a', 'line angle', `${Math.round(deg(Math.atan2(dir[1], dir[0])))}°`);
      r.row('s', 'spread (variance)', f2(s), C.result);
      r.row('pc', 'of the largest possible', `${(Math.floor(ratio * 1000) / 10).toFixed(1)}%`, ratio >= GOAL ? C.good : C.white);
    };
    const onDir = () => ratio >= GOAL;
    const finale = async () => {
      knob.setEnabled(false);
      view.setProbe(null);
      await view.showAxes(true, 600);
      await view.project(1600);
      r.note('The first principal direction keeps the most spread. Projecting onto it keeps as much of the cloud as one line can.');
      p.win();
    };
    const knob: Knob = new Knob(p, add3(m, dir, R), {
      color: C.result,
      constrain: (q) => { const d = unit3([q.x - m[0], q.y - m[1], 0]); return new Vector3(m[0] + d[0] * R, m[1] + d[1] * R, 0.02); },
      onMove: (q) => { dir = unit3(sub3(q, m)); upd(); },
      onEnd: () => { if (onDir()) { p.win(); void finale(); } },
    });
    upd();
    return {
      async showMe() {
        const f = view.first;
        const a0 = Math.atan2(dir[1], dir[0]);
        let a1 = Math.atan2(f[1], f[0]);
        if (Math.abs(a1 - a0) > Math.PI / 2) a1 += a1 < a0 ? Math.PI : -Math.PI;
        await animate(1100, (k) => {
          const a = a0 + (a1 - a0) * k;
          dir = [Math.cos(a), Math.sin(a), 0];
          knob.at(add3(m, dir, R));
          upd();
        }, ease.inOut);
        await finale();
      },
      async solve() {
        const f = view.first;
        dir = [f[0], f[1], 0];
        knob.at(add3(m, dir, R));
        upd();
        await finale();
      },
    };
  },
};

const ch: ChapterDef = {
  id: 'c92', act: 99, num: 92, dev: true,
  title: 'Kit test: projection, eigenvectors, SVD and data',
  subtitle: 'Showcase for kit/geom.ts and kit/data.ts',
  nodes: [],
  beats: [
    { kind: 'puzzle', id: 'p-shadow', puzzle: shadow },
    { kind: 'puzzle', id: 'p-sweep', puzzle: sweep },
    { kind: 'puzzle', id: 'p-noeigen', puzzle: noEigen },
    { kind: 'puzzle', id: 'p-svd', puzzle: svdPuzzle },
    { kind: 'puzzle', id: 'p-fit', puzzle: fit },
    { kind: 'puzzle', id: 'p-plane', puzzle: plane },
    { kind: 'puzzle', id: 'p-pca', puzzle: pcaPuzzle },
  ],
};
export default ch;
