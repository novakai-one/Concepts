// Chapter 18 puzzles 5 and 6: a 3 × 3 by hand (p5 [H] [X8]) and the lines of Vell's matrix V (p6).
// p7 (row reducing first) is in find.ts. Plain maths: docs/singular/ch18-plain-style.md.
import type { PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { InfLine, Lattice3D } from '../../../gfx/shapes';
import { StepWorksheet } from '../../../kit/steps';
import { VectorInput, parseNum } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { matVec, norm, normalize, type Mat, type Vec } from '../../../math/la';
import { niceDir, ptag, v3, sg } from './parts';
import {
  P5_A, P5_BLOCK_C, P5_TRI, P5_TRI_VALUES, P5_VALUES, P5_VECS, P6_CANDIDATES, P6_LINES, P6_V, eigenLines, fmtN,
  lineAngleDeg, p6Won, texM, trace, type Lock,
} from './logic';
import { S } from './script';
import { tcol, tmul } from './traj-text';

const det3 = (M: Mat) => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);

// ------------------------------------------------------------------ p5 [H] [X8] · a 3 × 3 by hand

export const p5: PuzzleDef = {
  id: 'c18-p5',
  title: 'Find the eigenvalues of a 3 × 3 by hand',
  goal: 'Find the eigenvalues of $A$ by hand: the $\\lambda$ where $\\det(A - \\lambda I) = 0$. Then an eigenvector for each.',
  subgoals: ['$\\det(A - \\lambda I)$', 'The eigenvalues and eigenvectors', 'Check: their sum and product', 'A triangular matrix'],
  hints: [
    'Expand along the first row. Only $2 - \\lambda$ is left, times $\\det\\begin{bmatrix} 3 - \\lambda & 4 \\\\ 4 & -3 - \\lambda \\end{bmatrix}$.',
    '$(3 - \\lambda)(-3 - \\lambda) - 16 = \\lambda^2 - 25$. So $\\lambda = 2$, $5$ or $-5$.',
    `For $\\lambda = 5$: $-2y + 4z = 0$, so $${tcol([0, 2, 1])}$. For $\\lambda = -5$: $8y + 4z = 0$, so $${tcol([0, 1, -2])}$.`,
  ],
  par: 7,
  view: '3d',
  onWin: S.p5Win,
  setup(p) {
    void p.g.stage.view3D({ target: [0, 0, 0], distance: 15, azimuth: -52, elevation: 24 });
    const lat = new Lattice3D(p.g.stage, { extent: 2, opacity: 0.1 });
    p.add(lat);
    // the three lines that hold, each with a unit arrow v and its image Av (revealed as the steps are solved)
    const BASE = 0.6;
    const parts = P5_VECS.map((v, i) => {
      const u = normalize(v);
      const line = new InfLine(p.g.stage, [0, 0, 0], u as V3, { color: C.violet, width: 2.2, opacity: 0.7, length: 7 });
      // green: an arrow on the line; yellow: where A sends it (λ times as long)
      const a = new Arrow([0, 0, 0], v3(u.map((x) => x * BASE)), { color: C.v, width: 0.05 });
      const img = new Arrow([0, 0, 0], v3(u.map((x) => x * BASE * P5_VALUES[i])), { color: C.result, width: 0.035, opacity: 0.85 });
      const tg = ptag(p, `$\\lambda = ${fmtN(P5_VALUES[i]).replace('−', '-')}$`, v3(u.map((x) => x * BASE * P5_VALUES[i] + (P5_VALUES[i] < 0 ? -0.4 : 0.4) * x)), 'vi', [0, -16]);
      p.add(line.object, a, img); p.onDispose(() => line.dispose());
      for (const o of [line.object, a.group, img.group]) o.visible = false;
      tg.show(false);
      return { line, a, img, tg, shown: false };
    });
    const reveal = async (i: number) => {
      const q = parts[i];
      if (q.shown) return;
      q.shown = true;
      for (const o of [q.line.object, q.a.group, q.img.group]) o.visible = true;
      q.tg.show(true);
      const tip = P5_VECS[i].map((x) => x / norm(P5_VECS[i]) * BASE);
      await animate(p.g.headless ? 1 : 700, (k) => q.img.setTo(v3(tip.map((x) => x * (1 + (P5_VALUES[i] - 1) * k)))), ease.out);
      sfx.snap();
    };
    const r = p.readout('');
    r.row('A', '$A$', `$${texM(P5_A)}$`);
    // the triangular one waits until its own step opens
    r.row('U', '$B$', `$${texM(P5_TRI)}$`);
    r.hideRow('U');
    // Cadet: LANTERN shows the trace and det A from the start, and the sum and product once the eigenvalues
    // are in. Navigator and Commander work the checks by hand: each pair shows only once its check is right.
    const cadet = p.difficulty === 'cadet';
    const shown = { tr: cadet, det: cadet, sum: false, prod: false };
    const SUM = P5_VALUES.reduce((a, b) => a + b, 0), PROD = P5_VALUES.reduce((a, b) => a * b, 1);
    // each pair shows only once it is known, so the readout starts as just A
    const paint = () => {
      r.row('tr', 'trace of $A$ (sum of the diagonal)', fmtN(trace(P5_A)));
      r.row('det', '$\\det A$', fmtN(det3(P5_A)));
      r.row('sum', '$\\lambda_1 + \\lambda_2 + \\lambda_3$', fmtN(SUM), C.result);
      r.row('prod', '$\\lambda_1 \\lambda_2 \\lambda_3$', fmtN(PROD), C.result);
      for (const k of ['tr', 'det', 'sum', 'prod'] as const) r.hideRow(k, !shown[k]);
    };
    const showAll = () => { shown.tr = shown.det = shown.sum = shown.prod = true; paint(); };
    paint();
    const done = [false, false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; sg(p, i); } };
    // Two worksheets, so Commander's one check (a worksheet's last step) falls on the 3 × 3 itself, and the
    // triangular read-off is checked on its own. The first ends on the last eigenvector; the second opens
    // once it is right.
    const STEP = { c: 0, values: 1, tr: 2, det: 3, v5: 4, vm5: 5 };
    const steps = [
      { prompt: '$\\det(A - \\lambda I) = (2 - \\lambda)(\\lambda^2 + c)$: $c =$', answer: P5_BLOCK_C, mistakes: [[-9, 'Take away $4 \\cdot 4 = 16$ as well: $-9 - 16$.'], [7, 'The product of the diagonal is $(3)(-3) = -9$, then take away 16.']] as [number, string][] },
      { prompt: 'The eigenvalues, largest first', answer: P5_VALUES, mistakes: [[[5, 2, 5], '$\\lambda^2 = 25$ has two roots: 5 and −5.'], [[2, 5, -5], 'Largest first: 5, 2, −5.']] as [number[], string][] },
      { prompt: 'Check: $\\lambda_1 + \\lambda_2 + \\lambda_3$ (the trace of $A$)', answer: SUM },
      { prompt: 'Check: $\\lambda_1\\lambda_2\\lambda_3$ ($\\det A$)', answer: PROD, mistakes: [[50, 'One of the three is negative.']] as [number, string][] },
      { prompt: `For $\\lambda = 5$, an eigenvector is $\\begin{bmatrix}0 \\\\ 2 \\\\ z\\end{bmatrix}$: $z =$`, answer: P5_VECS[0][2], mistakes: [[-4, 'That one is for $\\lambda = -5$. For $\\lambda = 5$: $-2y + 4z = 0$.']] as [number, string][] },
      { prompt: `For $\\lambda = -5$, an eigenvector is $\\begin{bmatrix}0 \\\\ 1 \\\\ z\\end{bmatrix}$: $z =$`, answer: P5_VECS[2][2], mistakes: [[2, '$A + 5I$ has the row $\\begin{bmatrix}0 & 8 & 4\\end{bmatrix}$: $8 + 4z = 0$.']] as [number, string][] },
    ];
    let tri: StepWorksheet | null = null;
    const openTri = () => {
      if (tri) return tri;
      r.hideRow('U', false);
      p.setGoal('Last: $B$ is triangular (zeros below the diagonal). Find its eigenvalues.');
      // the finished sheet folds to one line, so the new step has the dock (its answers live on in the readout and the picture)
      const summary = h('div', { class: 'a7-msg good', html: inline(`$A$: $\\lambda = ${P5_VALUES.map(fmtN).join(', ').replace(/−/g, '-')}$. ✓`) });
      summary.style.display = 'none';
      p.dock().append(summary);
      if (!p.g.headless) window.setTimeout(() => { ws.el.style.display = 'none'; summary.style.display = ''; }, 1500);
      tri = new StepWorksheet(p, {
        title: 'By hand',
        steps: [{ prompt: 'The eigenvalues of $B$, top to bottom', answer: P5_TRI_VALUES }],
        onDone: () => {
          tick(3);
          r.note('For a triangular matrix, $\\det(B - \\lambda I)$ is the product of the diagonal. So the eigenvalues are the diagonal entries.');
          p.win();
        },
      });
      return tri;
    };
    const ws = new StepWorksheet(p, {
      title: 'By hand',
      steps,
      onDone: () => {
        void (async () => { for (const i of [1, 0, 2]) await reveal(i); })();
        showAll();
        tick(0); tick(1); tick(2);
        openTri();
      },
    });
    // keyed on each step's own row, not on how many rows are right (the steps can be done in any order)
    const watch = () => {
      const rows = ws.el.querySelectorAll('.ws-row');
      const ok = (i: number) => !!rows[i]?.classList.contains('ok');
      if (ok(STEP.c)) tick(0);
      if (ok(STEP.values)) { void reveal(1); if (cadet) { shown.sum = shown.prod = true; } }
      if (ok(STEP.tr)) shown.tr = shown.sum = true;
      if (ok(STEP.det)) shown.det = shown.prod = true;
      if (ok(STEP.tr) && ok(STEP.det)) tick(2);
      if (ok(STEP.v5)) void reveal(0);
      if (ok(STEP.vm5)) void reveal(2);
      if (ok(STEP.v5) && ok(STEP.vm5)) tick(1);
      paint();
    };
    ws.el.addEventListener('change', watch);
    ws.el.addEventListener('keyup', watch);
    ws.el.addEventListener('click', () => window.setTimeout(watch, 30));
    return {
      async showMe() {
        await ws.showMe(420); watch(); await openTri().showMe(420);
        if (!p.g.headless) {
          const why = h('div', { class: 'a7-msg good', html: inline('$\\det(A - \\lambda I) = (2 - \\lambda)\\big((3 - \\lambda)(-3 - \\lambda) - 16\\big) = (2 - \\lambda)(\\lambda^2 - 25)$. So $\\lambda = 2$, $5$ or $-5$.') });
          p.dock().append(why);
        }
      },
      solve() { ws.solve(); openTri().solve(); },
      wrong() { ws.wrong(); tri?.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p6 · Vell's lines

export const p6: PuzzleDef = {
  id: 'c18-p6',
  title: 'Which lines does V keep?',
  goal: '$V$ is a 3 × 3 matrix. Find the three lines it keeps, and the $\\lambda$ of each.',
  subgoals: ['Find the first line, and its λ', 'Find the second line, and its λ', 'Find the third line, and its λ'],
  hints: [
    'You want $V\\mathbf v$ to be a number times $\\mathbf v$. Divide each number of $V\\mathbf v$ by the matching number of $\\mathbf v$: they must agree.',
    `Each row of $V$ adds up to $1$. Try $${tcol([1, 1, 1])}$.`,
    `Try $${tcol([1, -1, 0])}$ and $${tcol([1, 1, -2])}$.`,
  ],
  par: 10, // testing vectors is how this is solved: exploring must not cost stars
  view: '3d',
  onWin: S.p6Win,
  setup(p) {
    const d = p.difficulty;
    const typedMode = d === 'commander';
    const VIEW = { distance: 10, azimuth: -38, elevation: 22 };
    void p.g.stage.view3D({ target: [0, 0, 0], ...VIEW });
    const lat = new Lattice3D(p.g.stage, { extent: 2, opacity: 0.12 });
    p.add(lat);
    // green: the vector v at its true length; yellow: V v; the dashed line through green is where yellow must land
    let x: Vec = [1, 0, 0];
    // yellow is thinner and labelled mid-shaft, so green still shows when the two coincide (λ = 1)
    const probe = new Arrow([0, 0, 0], v3(x), { color: C.v, width: 0.05, label: '$\\mathbf v$' });
    const img = new Arrow([0, 0, 0], v3(matVec(P6_V, x)), { color: C.result, width: 0.03, label: '$V\\mathbf v$', labelAt: 'mid' });
    const xLine = new InfLine(p.g.stage, [0, 0, 0], v3(x), { color: C.v, width: 1.4, opacity: 0.55, dashed: true });
    p.add(xLine.object, img, probe); p.onDispose(() => xLine.dispose());
    const shown: InfLine[] = [];
    const r2 = (t: number) => Math.round(t * 100) / 100 + 0;
    const r = p.readout('');
    r.row('V', '$V$', '$\\dfrac{1}{60}\\begin{bmatrix} 37 & 7 & 16 \\\\ 7 & 37 & 16 \\\\ 16 & 16 & 28 \\end{bmatrix}$');
    const locks: (Lock & { ok: boolean; line: number })[] = [];
    const paint = () => {
      r.eq(`V${tcol(x)} = ${tcol(matVec(P6_V, x).map(r2))}`);
      r.row('n', 'lines found', String(locks.filter((k) => k.ok).length));
    };
    const list = h('div', { class: 'a7-locks' });
    const log = h('div', { class: 'a7-log' });
    const msgEl = h('div', { class: 'a7-msg' });
    const msg = (t: string, k: '' | 'good' | 'bad' = '') => { msgEl.className = `a7-msg ${k}`; msgEl.innerHTML = inline(t); };
    let won = false;
    const winCheck = () => {
      const n = locks.filter((k) => k.ok).length;
      [0, 1, 2].forEach((i) => sg(p, i, n > i));
      paint();
      if (!won && p6Won(locks.filter((k) => k.ok))) {
        won = true; sfx.success();
        msg(`Three lines: $\\lambda = 1$, $0.5$ and $0.2$. Apply $V$ many times: the $0.5$ and $0.2$ parts shrink away. Everything ends on the line through $${tcol([1, 1, 1])}$.`, 'good');
        p.win();
      }
    };
    /** Zoom out so a long typed vector stays on screen (keeping the player's angle); back in when it fits. */
    const fit = (v: Vec) => {
      if (p.g.headless) return;
      const need = Math.max(VIEW.distance, 4.6 * Math.max(...v.map(Math.abs)));
      const cam = p.g.stage.camera.position;
      const dist = cam.length();
      if (Math.abs(need - dist) / dist < 0.08) return;
      void p.g.stage.view3D({ target: [0, 0, 0], distance: need, azimuth: (Math.atan2(cam.y, cam.x) * 180) / Math.PI, elevation: (Math.asin(cam.z / dist) * 180) / Math.PI, ms: 500 });
    };
    const test = async (dir: Vec, fast = false) => {
      if (norm(dir) < 1e-9) { msg('The zero vector has no line. Type a vector that is not zero.', 'bad'); sfx.miss(); return; }
      p.move();
      typed?.set(dir.slice());
      const x0 = x.slice(), y0 = matVec(P6_V, x0);
      x = dir.slice();
      const y = matVec(P6_V, x);
      xLine.set([0, 0, 0], v3(x));
      fit(x);
      await animate(fast ? 1 : 800, (k) => {
        probe.set([0, 0, 0], v3(x0.map((t, i) => t + (x[i] - t) * k)));
        img.set([0, 0, 0], v3(y0.map((t, i) => t + (y[i] - t) * k)));
      }, ease.inOut);
      paint();
      const lines = eigenLines(P6_V);
      const hit = lines.findIndex((l) => lineAngleDeg(l.dir, dir) < 0.5);
      if (hit < 0) {
        // the log keeps the last two misses with their numbers (a found line has its own row below)
        log.prepend(h('div', { class: 'a7-logrow', html: inline(`$V${tcol(x)} = ${tcol(y.map(r2))}$ · turned`) }));
        while (log.children.length > 2) log.lastElementChild?.remove();
        sfx.miss(); msg('Yellow is off the dashed line: $V$ turns this vector.', 'bad'); return;
      }
      if (locks.some((k) => k.line === hit)) { msg('You found that line already. Look for another.'); return; }
      const val = lines[hit].value;
      const lock = { dir: lines[hit].dir, stretch: d === 'cadet' ? val : NaN, ok: d === 'cadet', line: hit };
      locks.push(lock);
      const line = new InfLine(p.g.stage, [0, 0, 0], v3(lines[hit].dir), { color: C.violet, width: 2.2, opacity: 0.7, length: 6 });
      p.add(line.object); p.onDispose(() => line.dispose()); shown.push(line);
      const nd = niceDir(lines[hit].dir);
      const st = h('span', { class: 'st' }, lock.ok ? '✓' : '');
      const row = h('div', { class: `a7-lock ${lock.ok ? 'ok' : ''}` });
      if (d === 'cadet') row.append(h('span', { class: 'd', html: inline(`$V${tcol(nd)} = ${tmul(val, nd)}$`) }), st);
      else {
        const inp = h('input', { class: 'cell', inputmode: 'decimal', 'aria-label': 'the number in the equation', placeholder: '?' }) as HTMLInputElement;
        const chk = () => {
          const v = parseNum(inp.value);
          if (v === null) return;
          p.move();
          lock.stretch = v; lock.ok = Math.abs(v - val) < (d === 'commander' ? 0.005 : 0.02);
          row.classList.toggle('ok', lock.ok); st.textContent = lock.ok ? '✓' : '';
          if (lock.ok) sfx.snap(); else sfx.miss();
          const left = 3 - locks.filter((k) => k.ok).length;
          if (lock.ok && left > 0) msg(`Right: $V${tcol(nd)} = ${tmul(val, nd)}$. ${left === 1 ? 'One line left.' : 'Two lines left.'}`, 'good');
          else if (!lock.ok) msg(`$${tmul(v, nd)} = ${tcol(nd.map((t) => r2(t * v)))}$, not $${tcol(matVec(P6_V, nd).map(r2))}$.`, 'bad');
          winCheck();
        };
        inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') chk(); });
        inp.addEventListener('change', chk);
        row.append(h('span', { class: 'd', html: inline(`$V${tcol(nd)} =$`) }), inp, h('span', { class: 'd', html: inline(`$${tcol(nd)}$`) }), st);
        inputs.set(hit, inp);
        if (!fast) window.setTimeout(() => inp.focus(), 30);
      }
      list.append(row);
      sfx.snap();
      msg(d === 'cadet' ? 'On its line.' : 'On its line. Fill in the box:', 'good');
      winCheck();
    };
    const inputs = new Map<number, HTMLInputElement>();
    const pick = h('div', { class: 'a7-btns' });
    let typed: VectorInput | null = null;
    if (typedMode) {
      typed = new VectorInput({ dim: 3, values: [1, 0, 0], label: '\\mathbf v =', step: 1, onSubmit: (v) => void test(v) });
      typed.el.classList.add('a7-in');
      pick.append(typed.el, button(inline('Apply $V$'), () => void test(typed!.get()), { cls: 'primary small', html: true }));
    } else {
      pick.append(h('span', { class: 'k', html: inline('Apply $V$ to:') }), ...P6_CANDIDATES.map((c) => button(inline(`$${tcol(c)}$`), () => void test(c), { cls: 'small tj-vbtn', html: true })));
    }
    p.dock().append(pick, msgEl, list, log);
    paint();
    msg(typedMode ? 'Type a vector $\\mathbf v$ and press **Apply $V$**. Drag the picture to turn it.' : 'Pick a vector $\\mathbf v$. Drag the picture to turn it.');
    const fill = () => {
      for (const k of locks) {
        const inp = inputs.get(k.line);
        if (!inp || k.ok) continue;
        inp.value = fmtN(Math.round(eigenLines(P6_V)[k.line].value * 100) / 100);
        inp.dispatchEvent(new Event('change'));
      }
    };
    // Show me runs the search a person would: two misses, the three hits, then the reason
    const reason = `Each row of $V$ adds up to $1$, so $V${tcol([1, 1, 1])} = ${tcol([1, 1, 1])}$. Swapping the first two numbers of $\\mathbf v$ swaps the first two of $V\\mathbf v$, so $V${tcol([1, -1, 0])} = 0.5${tcol([1, -1, 0])}$.`;
    return {
      async showMe() {
        const ms = p.g.headless ? 1 : 1100;
        for (const dir of [[1, 0, 0], [1, 1, 0]]) { await test(dir); await wait(ms); }
        for (const [dir] of P6_LINES) { await test(dir); await wait(ms); }
        fill();
        if (!p.g.headless) msg(reason, 'good');
      },
      async solve() { for (const [dir] of P6_LINES) await test(dir, true); fill(); },
      async wrong() { await test([1, 0, 0], true); await test([1, 1, 0], true); },
    };
  },
};
