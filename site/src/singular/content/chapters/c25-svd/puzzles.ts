// Chapter 25 puzzles 1–4: turn a perpendicular input cross until its outputs are perpendicular too (p1, UNFOLD),
// where the axes come from: AᵀA (p2 [D]), the three moves on the rail (p3), and the SVD of a 3 × 2 by hand (p4 [H]).
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { FatLine } from '../../../gfx/lines';
import { PlanePatch } from '../../../gfx/shapes';
import { AngleArc, Knob, RightAngle, UnitCircleImage, ellipsePts } from '../../../kit/geom';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { Slider, VectorInput } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { dot, matVec, norm, type Mat, type Vec } from '../../../math/la';
import { ptag, v3 } from '../c24-spectral/act9';
import { checklist, msgLine } from '../c24-spectral/puzzles';
import { deg, rad, texM } from '../c24-spectral/logic';
import {
  P1_A, P1_DET, P1_SIGMA, P2_AAT, P2_ATA, P2_ATAV1, P2_ATAV2, P2_DECOYS, P2_EIG, P2_ORDER, P2_ROWCOL, P2_TILES, P3_T1, P3_T2,
  P4_A, P4_AAT_CORNER, P4_ATA, P4_EIG, P4_NO_CROSS, P4_SIGMA, P4_U, P4_V, fmtD, fmtN, outputsAngle, p1Won, p2Dot, p2OrderFault,
  p3Err, p3Won, threeMoves,
} from './logic';
import { S } from './script';

const circlePts = (r = 1, z = 0): V3[] => Array.from({ length: 129 }, (_, i) => { const a = (i / 128) * Math.PI * 2; return [r * Math.cos(a), r * Math.sin(a), z] as V3; });

/** The unit circle (dashed) and its image under A (dashed yellow), for the 2-D SVD pictures. */
function circleAndImage(p: PuzzleCtx, A: Mat, o: { image?: boolean } = {}) {
  const c = new FatLine(p.g.stage, circlePts(1, 0.001), { color: C.white, width: 1.3, opacity: 0.42, dashed: true, dashSize: 0.09, gapSize: 0.07 });
  p.add(c.object); p.onDispose(() => c.dispose());
  if (o.image === false) return;
  const e = new FatLine(p.g.stage, ellipsePts(A, 1, 160), { color: C.result, width: 1.6, opacity: 0.55, dashed: true, dashSize: 0.16, gapSize: 0.1 });
  p.add(e.object); p.onDispose(() => e.dispose());
}

// ------------------------------------------------------------------ p1 · circle to ellipse (UNFOLD)

export const p1: PuzzleDef = {
  id: 'c25-p1',
  title: 'Which two arrows land at a right angle?',
  goal: 'The white circle lands on the yellow oval under $A = \\begin{bmatrix} 3 & 0 \\\\ 4 & 5 \\end{bmatrix}$. **Turn the input cross** (green $\\mathbf v_1$, red $\\mathbf v_2$, always at a right angle) until their images $A\\mathbf v_1$ and $A\\mathbf v_2$ are at a right angle too.',
  predict: {
    prompt: 'Turn a perpendicular pair of arrows round the circle. Will their two images ever be perpendicular?',
    choices: [{ id: 'yes', text: 'Yes, for one position of the cross' }, { id: 'no', text: 'No, $A$ is not symmetric' }, { id: 'always', text: 'Always' }],
    answer: 'yes',
    reveal: 'Yes. Every matrix has one such cross (here at 45°). The images lie on the oval’s long and short axes.',
  },
  hints: [
    'Watch the angle between the two images. It swings above and below 90° as the cross turns.',
    'The oval leans along $(1, 3)$. Try the cross on the diagonals.',
    'Turn $\\mathbf v_1$ to $(1, 1)/\\sqrt2$ (45°). Then $A\\mathbf v_1 = (3, 9)/\\sqrt2$ and $A\\mathbf v_2 = (3, -1)/\\sqrt2$: perpendicular.',
  ],
  par: 2,
  onWin: S.p1Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view2D({ center: [0.4, 0.9], height: 18, ms: 0 });
    p.grid({ main: 0.16, base: 0, axis: 0.38 });
    circleAndImage(p, P1_A);
    const tol = d === 'cadet' ? 0.6 : d === 'navigator' ? 1 : 0.5;
    let theta = 100;
    const v1 = new Arrow([0, 0, 0.02], [1, 0, 0.02], { color: C.v, width: 0.05, label: '$\\mathbf v_1$' });
    const v2 = new Arrow([0, 0, 0.02], [0, 1, 0.02], { color: C.w, width: 0.05, label: '$\\mathbf v_2$' });
    const a1 = new Arrow([0, 0, 0.01], [1, 0, 0.01], { color: C.v, width: 0.07, label: '$A\\mathbf v_1$' });
    const a2 = new Arrow([0, 0, 0.01], [0, 1, 0.01], { color: C.w, width: 0.07, label: '$A\\mathbf v_2$' });
    p.add(a1, a2, v1, v2);
    const arc = new AngleArc(p, [0, 0, 0.005], [1, 0, 0], [0, 1, 0], { radius: 0.9, opacity: 0.6, fill: 0.08 });
    let mark: RightAngle | null = null;
    const r = p.readout('The cross and its images');
    const msg = msgLine();
    let won = false;
    const paint = () => {
      const t = rad(theta);
      const x1 = [Math.cos(t), Math.sin(t)], x2 = [-Math.sin(t), Math.cos(t)];
      const y1 = matVec(P1_A, x1), y2 = matVec(P1_A, x2);
      v1.setTo([x1[0], x1[1], 0.02]); v2.setTo([x2[0], x2[1], 0.02]);
      a1.setTo([y1[0], y1[1], 0.01]); a2.setTo([y2[0], y2[1], 0.01]);
      arc.set(v3(y1), v3(y2));
      const ang = outputsAngle(theta);
      const ok = p1Won(theta, tol);
      if (ok && !mark) mark = new RightAngle(p, [0, 0, 0.012], v3(y1), v3(y2), 0.42, { color: C.white, opacity: 0.9 });
      if (mark) { mark.set([0, 0, 0.012], v3(y1), v3(y2)); mark.object.visible = ok; }
      r.row('i', 'input cross at', `${fmtD(((theta % 360) + 360) % 360, 1)}°`, C.v);
      r.row('a', 'angle between the images', `${fmtD(ang, 1)}°`, ok ? C.good : C.orange);
      r.row('l', '$|A\\mathbf v_1|$ and $|A\\mathbf v_2|$', `${fmtD(norm(y1))} and ${fmtD(norm(y2))}`, C.result);
      if (ok) r.row('p', 'their product', `${fmtD(norm(y1) * norm(y2))} = $|\\det A|$ = ${fmtN(Math.abs(P1_DET))}`, C.good);
      else r.hideRow('p', true);
      if (ok) r.hideRow('p', false);
    };
    const knob = new Knob(p, [Math.cos(rad(theta)) * 1, Math.sin(rad(theta)), 0.03], {
      color: C.v, size: 0.075,
      constrain: (q) => {
        let a = deg(Math.atan2(q.y, q.x));
        if (d === 'cadet') { const m = (((a - 45) % 90) + 90) % 90; const off = m > 45 ? m - 90 : m; if (Math.abs(off) <= 5) a -= off; }
        theta = a; const t = rad(a); q.set(Math.cos(t), Math.sin(t), 0.03); return q;
      },
      onMove: () => paint(),
      onEnd: () => check(),
    });
    const check = () => {
      if (won) return;
      if (p1Won(theta, tol)) {
        won = true;
        sfx.success();
        msg.say(`Perpendicular in, perpendicular out: lengths ${fmtD(P1_SIGMA[0])} and ${fmtD(P1_SIGMA[1])}, along $(1, 3)$ and $(3, -1)$.`, 'good');
        void a1.pulse(); void a2.pulse();
        p.win();
      } else msg.say(`The images are ${fmtD(outputsAngle(theta), 1)}° apart. Keep turning.`);
    };
    p.dock().append(h('div', { class: 'a9-note' }, 'Drag the green arrow’s tip round the circle. The red one follows at a right angle.'), msg.el);
    paint();
    const goTo = async (to: number, ms: number) => {
      const t0 = theta;
      await animate(ms, (k) => { theta = t0 + (to - t0) * k; knob.at([Math.cos(rad(theta)), Math.sin(rad(theta)), 0.03]); paint(); }, ease.inOut);
      theta = to; knob.at([Math.cos(rad(theta)), Math.sin(rad(theta)), 0.03]); paint();
    };
    return {
      async showMe() { await goTo(45, 1600); p.move(); check(); },
      solve() { theta = 45; knob.at([Math.cos(rad(theta)), Math.sin(rad(theta)), 0.03]); paint(); check(); },
      wrong() { theta = 90; paint(); check(); },
    };
  },
};

// ------------------------------------------------------------------ p2 [D] · where the axes come from

export const p2: PuzzleDef = {
  id: 'c25-p2',
  title: 'Why do those two land at a right angle?',
  goal: '$\\mathbf v_1 = (1, 1)/\\sqrt2$ stays put. Drag $\\mathbf v_2$ round the circle and watch $A\\mathbf v_1\\cdot A\\mathbf v_2$. Then build the reason from $A^{\\mathsf T}A$.',
  subgoals: ['Make the dot product of the images 0', 'Where the right angle comes from'],
  hints: [
    'The readout shows $A\\mathbf v_1\\cdot A\\mathbf v_2$ and $45(\\mathbf v_1\\cdot\\mathbf v_2)$ side by side. They are always equal.',
    '$A\\mathbf v_1\\cdot A\\mathbf v_2 = \\mathbf v_1^{\\mathsf T}(A^{\\mathsf T}A)\\mathbf v_2$, and $\\mathbf v_1$ is an eigenvector of $A^{\\mathsf T}A$ with eigenvalue 45.',
    '$A^{\\mathsf T}A = \\begin{bmatrix} 25 & 20 \\\\ 20 & 25 \\end{bmatrix}$, eigenvalues 45 and 5. Put $\\mathbf v_2$ at $(1, -1)/\\sqrt2$: the dot product is 0.',
  ],
  par: 4,
  onWin: S.p2Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view2D({ center: [-1.2, 0.8], height: 17, ms: 0 });
    p.grid({ main: 0.16, base: 0, axis: 0.38 });
    circleAndImage(p, P1_A);
    const R2 = Math.SQRT1_2;
    let theta = 160;
    const v1 = new Arrow([0, 0, 0.02], [R2, R2, 0.02], { color: C.v, width: 0.05, label: '$\\mathbf v_1$' });
    const v2 = new Arrow([0, 0, 0.02], [0, 1, 0.02], { color: C.w, width: 0.05, label: '$\\mathbf v_2$' });
    const y1 = matVec(P1_A, [R2, R2]);
    const a1 = new Arrow([0, 0, 0.01], [y1[0], y1[1], 0.01], { color: C.v, width: 0.07, label: '$A\\mathbf v_1$' });
    const a2 = new Arrow([0, 0, 0.01], [0, 1, 0.01], { color: C.w, width: 0.07, label: '$A\\mathbf v_2$' });
    p.add(a1, a2, v1, v2);
    let mark: RightAngle | null = null;
    const r = p.readout('Dot products');
    const msg = msgLine();
    const ck = checklist(['$A\\mathbf v_1\\cdot A\\mathbf v_2 = 0$', 'The reason']);
    const done = [false, false];
    let won = false;
    const tick = (i: number) => { if (!done[i]) { done[i] = true; p.subgoal(i); ck.tick(i); } if (done.every(Boolean) && !won) { won = true; sfx.success(); p.win(); } };
    const paint = () => {
      const t = rad(theta);
      const x2 = [Math.cos(t), Math.sin(t)], y2 = matVec(P1_A, x2);
      v2.setTo([x2[0], x2[1], 0.02]); a2.setTo([y2[0], y2[1], 0.01]);
      const dd = p2Dot(theta), vv = dot([R2, R2], x2);
      const zero = Math.abs(dd) < 0.05;
      if (zero && !mark) mark = new RightAngle(p, [0, 0, 0.012], v3(y1), v3(y2), 0.42, { color: C.white, opacity: 0.9 });
      if (mark) { mark.set([0, 0, 0.012], v3(y1), v3(y2)); mark.object.visible = zero; }
      r.row('a', '$A\\mathbf v_1\\cdot A\\mathbf v_2$', fmtD(dd), zero ? C.good : C.result);
      r.row('b', '$45\\,(\\mathbf v_1\\cdot\\mathbf v_2)$', fmtD(45 * vv), zero ? C.good : C.white);
      r.row('c', '$\\mathbf v_1\\cdot\\mathbf v_2$', fmtD(vv));
    };
    const tolDot = d === 'commander' ? 0.03 : 0.08;
    const knob = new Knob(p, [Math.cos(rad(theta)), Math.sin(rad(theta)), 0.03], {
      color: C.w, size: 0.075,
      constrain: (q) => { let a = deg(Math.atan2(q.y, q.x)); if (d === 'cadet') { const m = (((a + 45) % 180) + 180) % 180; const off = m > 90 ? m - 180 : m; if (Math.abs(off) <= 5) a -= off; } theta = a; q.set(Math.cos(rad(a)), Math.sin(rad(a)), 0.03); return q; },
      onMove: () => paint(),
      onEnd: () => { if (Math.abs(p2Dot(theta)) <= tolDot * 45) { tick(0); sfx.snap(); msg.say('Zero: $A\\mathbf v_1\\cdot A\\mathbf v_2 = 45\\,(\\mathbf v_1\\cdot\\mathbf v_2)$, so the images meet at a right angle exactly when the inputs do.', 'good'); startReason(); } },
    });
    // the reason, by level
    const box = h('div', { class: 'a9-col' });
    let started = false, ws: StepWorksheet | null = null, tiles: TileOrder | null = null, last: StepWorksheet | null = null;
    const reasonDone = () => tick(1);
    const TILE_MISS: Record<string, string> = {
      decoy: '$A$ itself is not symmetric. It is $A^{\\mathsf T}A$ that is.',
      missing: 'Use every true step.',
      repeat: 'Use each step once.',
      last: 'The right angle is the conclusion. It goes last.',
      order: 'Write the dot product as $\\mathbf v_1^{\\mathsf T}A^{\\mathsf T}A\\,\\mathbf v_2$ first.',
    };
    const submitTiles = (o: string[]) => {
      p.move();
      const fault = p2OrderFault(o);
      if (fault) { sfx.miss(); msg.say(TILE_MISS[fault], 'bad'); return; }
      sfx.snap(); msg.say('Right. Now the last line.', 'good');
      if (!last) last = new StepWorksheet(p, { title: 'The last line · only the answer is checked', steps: [{ prompt: '$A(1, 1)\\cdot A(1, -1)$', answer: 0 }], mount: box, onDone: reasonDone });
    };
    const startReason = () => {
      if (started) return;
      started = true;
      if (d === 'cadet') {
        void (async () => {
          for (const l of ['$A\\mathbf v_1\\cdot A\\mathbf v_2 = \\mathbf v_1^{\\mathsf T}A^{\\mathsf T}A\\,\\mathbf v_2$', '$A^{\\mathsf T}A = \\begin{bmatrix} 25 & 20 \\\\ 20 & 25 \\end{bmatrix}$ is symmetric: eigenvalues 45 and 5', '$= 5\\,(\\mathbf v_1\\cdot\\mathbf v_2) = 0$ for its perpendicular eigenvectors']) { box.append(h('div', { class: 'a9-row', html: inline(l) })); sfx.tick(1); await wait(p.g.headless ? 2 : 650); }
          reasonDone();
        })();
      } else if (d === 'navigator') {
        ws = new StepWorksheet(p, {
          title: 'Where the axes come from · each step is checked', mount: box, onDone: reasonDone,
          steps: [
            { prompt: '$A^{\\mathsf T}A$', answer: P2_ATA, mistakes: [
              [P2_ROWCOL, 'The diagonal is right, but the corners dot row 1 with row 2. Entries of $A^{\\mathsf T}A$ dot column $i$ with column $j$: $(3, 4)\\cdot(0, 5) = 20$.'],
              [P2_AAT, 'That is $AA^{\\mathsf T}$: rows dotted with rows. $A^{\\mathsf T}A$ dots each column of $A$ with each column.'],
            ] },
            { prompt: 'Its eigenvalues, larger first: the squares of the lengths', answer: P2_EIG },
            { prompt: '$A^{\\mathsf T}A\\,(1, 1)$ and $A^{\\mathsf T}A\\,(1, -1)$, one down each column: each is a multiple of its input', answer: [[P2_ATAV1[0], P2_ATAV2[0]], [P2_ATAV1[1], P2_ATAV2[1]]], mistakes: [
              [[[P2_ATAV1[0], P2_ATAV1[1]], [P2_ATAV2[0], P2_ATAV2[1]]], 'Those are the two answers written across the rows. Write each one down its own column.'],
            ] },
            { prompt: 'Its eigenvectors are perpendicular: $(1, 1)^{\\mathsf T}A^{\\mathsf T}A\\,(1, -1) = 5\\,\\big((1, 1)\\cdot(1, -1)\\big) =$', answer: 0 },
            { prompt: 'And $A(1, 1)\\cdot A(1, -1) = (1, 1)^{\\mathsf T}A^{\\mathsf T}A\\,(1, -1)$, the same number. Check it: $(3, 9)\\cdot(3, -1) =$', answer: 0 },
          ],
        });
      } else {
        tiles = new TileOrder(p, { tiles: P2_TILES, decoys: P2_DECOYS, mount: box, title: 'Why the images meet at a right angle: put the reason in order', submitLabel: 'Check the order', onSubmit: (o) => submitTiles(o) });
      }
    };
    p.dock().append(ck.el, msg.el, box);
    paint();
    const goTo = async (to: number, ms: number) => {
      const t0 = theta;
      await animate(ms, (k) => { theta = t0 + (to - t0) * k; knob.at([Math.cos(rad(theta)), Math.sin(rad(theta)), 0.03]); paint(); }, ease.inOut);
      theta = to; knob.at([Math.cos(rad(theta)), Math.sin(rad(theta)), 0.03]); paint();
    };
    const finish = async (fast: boolean) => {
      tick(0); startReason();
      if (ws) { if (fast) ws.solve(); else await ws.showMe(380); }
      if (tiles) { tiles.set(P2_ORDER); submitTiles(P2_ORDER); const lw = last as StepWorksheet | null; if (lw) { if (fast) lw.solve(); else await lw.showMe(300); } }
      while (!won) await wait(10);
    };
    return {
      async showMe() { await goTo(-45, 1500); p.move(); await finish(false); },
      async solve() { theta = -45; knob.at([Math.cos(rad(theta)), Math.sin(rad(theta)), 0.03]); paint(); await finish(true); },
      wrong() { theta = 0; paint(); },
    };
  },
};

// ------------------------------------------------------------------ p3 · three moves on the rail

export const p3: PuzzleDef = {
  id: 'c25-p3',
  title: 'Can any move be built from a turn, a stretch and a turn?',
  goal: 'Set the three moves on the rail (the right-hand one acts first): **turn** the circle, **stretch** it along the axes, **turn** again. Then **Play**. The circle must land on the dashed oval of $A$.',
  subgoals: ['The three moves land the circle on the oval'],
  hints: [
    'The first turn brings $\\mathbf v_1 = (1, 1)/\\sqrt2$ down onto the first axis: turn by $-45°$.',
    'The stretches are the lengths you found: $\\sqrt{45} \\approx 6.71$ and $\\sqrt5 \\approx 2.24$.',
    'The last turn takes the first axis onto $(1, 3)$: $\\arctan 3 \\approx 71.57°$.',
  ],
  par: 2,
  onWin: S.p3Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view2D({ center: [0.6, 1.0], height: 15.5, ms: 0 });
    const grid = p.grid({ main: 0.22, base: 0.05, axis: 0.4 });
    const target = new FatLine(p.g.stage, ellipsePts(P1_A, 1, 160), { color: C.result, width: 1.8, opacity: 0.6, dashed: true, dashSize: 0.18, gapSize: 0.1 });
    p.add(target.object); p.onDispose(() => target.dispose());
    ptag(p, 'the oval of $A$', [4.3, 4.2, 0], 'y');
    let ci: UnitCircleImage | null = null;
    const astep = d === 'cadet' ? 1 : d === 'navigator' ? 0.5 : 0.01;
    const tol = d === 'cadet' ? 0.15 : d === 'navigator' ? 0.08 : 0.03;
    let t1 = 0, t2 = 0;
    const s1In = new VectorInput({ dim: 2, values: [1, 1], label: '\\Sigma:\\ \\sigma_1, \\sigma_2 =', step: 0.01 });
    s1In.el.classList.add('a9-in');
    const sl1 = new Slider({ label: '$V^{\\mathsf T}$: first turn', min: -90, max: 90, step: astep, value: t1, format: (x) => `${fmtD(x, astep < 1 ? 2 : 0)}°`, onInput: (x) => { t1 = x; } });
    const sl2 = new Slider({ label: '$U$: last turn', min: -180, max: 180, step: astep, value: t2, format: (x) => `${fmtD(x, astep < 1 ? 2 : 0)}°`, onInput: (x) => { t2 = x; } });
    const r = p.readout('Your three moves');
    const msg = msgLine();
    let busy = false, won = false;
    const product = (): Mat => { const s = s1In.get(); return threeMoves(t1, s[0], s[1], t2); };
    const paintR = (M: Mat) => {
      r.row('m', '$U\\Sigma V^{\\mathsf T}$', `$${texM(M.map((row) => row.map((x) => Math.round(x * 100) / 100)))}$`);
      r.row('a', '$A$', `$${texM(P1_A)}$`, C.result);
      r.row('e', 'largest miss', fmtD(p3Err(M)), p3Err(M) <= tol ? C.good : C.orange);
    };
    const play = async () => {
      if (busy || won) return;
      busy = true;
      p.move();
      const M = product();
      paintR(M);
      if (!ci) ci = new UnitCircleImage(p, { M, grid, target: false, labels: true });
      else ci.setM(M);
      ci.set(0);
      await ci.play(['rotate', 'stretch', 'rotate'], { ms: p.g.headless ? 20 : 1300, pause: p.g.headless ? 0 : 250 });
      busy = false;
      if (p3Won(M, tol)) { won = true; p.subgoal(0); msg.say('Turn, stretch, turn: the circle landed on the oval of $A$.', 'good'); p.win(); }
      else { sfx.miss(); msg.say(`It missed the oval by up to ${fmtD(p3Err(M))}. Check each move: the first turn, the two stretches, the last turn.`, 'bad'); p.bark('lantern', `Largest miss ${fmtD(p3Err(M))}.`); }
    };
    const rail = h('div', { class: 'a9-col' },
      h('div', { class: 'a9-kick' }, 'The rail · right acts first: $U \\cdot \\Sigma \\cdot V^{\\mathsf T}$'),
      sl1.el, s1In.el, sl2.el,
      h('div', { class: 'a9-btns' }, button('Play the three moves', () => void play(), { cls: 'primary small' })));
    rail.querySelector('.a9-kick')!.innerHTML = inline('The rail · the right-hand move acts first: $U\\,\\Sigma\\,V^{\\mathsf T}$');
    p.dock().append(rail, msg.el);
    paintR(product());
    const setAll = (a: number, s: Vec, b: number) => { t1 = a; t2 = b; sl1.set(a, false); sl2.set(b, false); s1In.set(s); };
    return {
      async showMe() { setAll(P3_T1, [Number(fmtD(P1_SIGMA[0])), Number(fmtD(P1_SIGMA[1]))], Number(P3_T2.toFixed(2))); await play(); },
      async solve() { setAll(P3_T1, P1_SIGMA, P3_T2); await play(); },
      async wrong() { setAll(45, P1_SIGMA, P3_T2); await play(); },
    };
  },
};

// ------------------------------------------------------------------ p4 [H] · SVD by hand, non-square

export const p4: PuzzleDef = {
  id: 'c25-p4',
  title: 'What does a 3 × 2 move do to a circle?',
  goal: '$A = \\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\\\ 1 & 0 \\end{bmatrix}$ lifts the flat circle into space. Find its SVD by hand: $A^{\\mathsf T}A$, the singular values, $V$, and $U$.',
  hints: [
    '$A^{\\mathsf T}A$ is 2 × 2: dot each column of $A$ with each column.',
    '$A^{\\mathsf T}A = \\begin{bmatrix} 2 & 1 \\\\ 1 & 2 \\end{bmatrix}$: eigenvalues 3 and 1, so $\\sigma = \\sqrt3$ and 1, with $\\mathbf v = (1, 1)/\\sqrt2$, $(1, -1)/\\sqrt2$.',
    '$\\mathbf u_i = A\\mathbf v_i/\\sigma_i$: $\\mathbf u_1 = (2, 1, 1)/\\sqrt6 \\approx (0.82, 0.41, 0.41)$, $\\mathbf u_2 = (0, -1, 1)/\\sqrt2 \\approx (0, -0.71, 0.71)$.',
  ],
  par: 5,
  view: '3d',
  onWin: S.p4Win,
  setup(p) {
    void p.g.stage.view3D({ target: [0.6, 0.3, 0.3], distance: 8.2, azimuth: -52, elevation: 26, ms: 0 });
    const floor = new PlanePatch(p.g.stage, [0, 0, 0], [0, 0, 1], { color: '#9fb6d8', size: 4.2, opacity: 0.45 });
    p.add(floor);
    const c = new FatLine(p.g.stage, circlePts(1, 0.005), { color: C.white, width: 1.4, opacity: 0.55, dashed: true, dashSize: 0.09, gapSize: 0.07 });
    const img: V3[] = circlePts(1).map((q) => v3(matVec(P4_A, [q[0], q[1]])));
    const e = new FatLine(p.g.stage, img, { color: C.result, width: 2.2, intensity: 1.1 });
    p.add(c.object, e.object); p.onDispose(() => { c.dispose(); e.dispose(); });
    ptag(p, 'the flat circle', [0.2, -1.35, 0], 'dim');
    const R2 = Math.SQRT1_2;
    const v1 = new Arrow([0, 0, 0.01], [R2, R2, 0.01], { color: C.v, width: 0.04, label: '$\\mathbf v_1$' });
    const v2 = new Arrow([0, 0, 0.01], [R2, -R2, 0.01], { color: C.w, width: 0.04, label: '$\\mathbf v_2$' });
    const u1 = new Arrow([0, 0, 0], v3(P4_U[0].map((x) => x * P4_SIGMA[0])), { color: C.v, width: 0.06, label: '$\\sigma_1\\mathbf u_1$' });
    const u2 = new Arrow([0, 0, 0], v3(P4_U[1].map((x) => x * P4_SIGMA[1])), { color: C.w, width: 0.06, label: '$\\sigma_2\\mathbf u_2$' });
    p.add(v1, v2, u1, u2);
    u1.object.visible = false; u2.object.visible = false;
    let finished = false;
    const finale = async () => {
      if (finished) return;
      finished = true;
      u1.object.visible = true; u2.object.visible = true;
      await Promise.all([u1.grow(p.g.headless ? 1 : 700), u2.grow(p.g.headless ? 1 : 700)]);
      new RightAngle(p, [0, 0, 0], v3(P4_U[0]), v3(P4_U[1]), 0.24, { color: C.white, opacity: 0.85 });
      sfx.success();
      p.win();
    };
    const ws = new StepWorksheet(p, {
      onDone: () => void finale(),
      steps: [
        { prompt: '$A^{\\mathsf T}A$', answer: P4_ATA, mistakes: [
          [P4_AAT_CORNER, 'That is the corner of $AA^{\\mathsf T}$: rows dotted with rows. $A^{\\mathsf T}A$ is 2 × 2: dot each column with each column.'],
          [P4_NO_CROSS, 'You dropped the cross term: column 1 dotted with column 2 is $(1, 0, 1)\\cdot(1, 1, 0) = 1$.'],
        ] },
        { prompt: 'Its eigenvalues, larger first', answer: P4_EIG },
        { prompt: 'The singular values $\\sigma_1, \\sigma_2$ (two decimals)', answer: P4_SIGMA, tol: 0.006, mistakes: [[[3, 1], 'Those are $\\sigma^2$. Take the square roots.']] },
        { prompt: '$V$: columns $\\mathbf v_1, \\mathbf v_2$, unit length, first entry positive (two decimals)', answer: [[P4_V[0][0], P4_V[1][0]], [P4_V[0][1], P4_V[1][1]]], tol: 0.006 },
        { prompt: '$U$: columns $\\mathbf u_i = A\\mathbf v_i/\\sigma_i$ (two decimals)', answer: [[P4_U[0][0], P4_U[1][0]], [P4_U[0][1], P4_U[1][1]], [P4_U[0][2], P4_U[1][2]]], tol: 0.006 },
      ],
    });
    return {
      async showMe() { await ws.showMe(450); while (!finished) await wait(10); },
      async solve() { ws.solve(); while (!p.won) await wait(5); },
      wrong() { ws.wrong(); },
    };
  },
};
