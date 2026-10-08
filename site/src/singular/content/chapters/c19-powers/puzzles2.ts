// Chapter 19 puzzles 4–6: the shear has too few lines to make a grid (p4), two sites settle at the line
// with stretch 1 while the gap shrinks by 0.7 a step (p5), and Fibonacci by repeated squaring (p6 [S]).
import { Vector3 } from 'three';
import type { PuzzleDef } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { InfLine, Parallelogram } from '../../../gfx/shapes';
import { VectorHandle } from '../../../kit/handle';
import { parseNum } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { answer, pin } from '../../../game/caseboard';
import { matVec, type Vec } from '../../../math/la';
import { ptag, v3, sg, fslider } from '../c18-eigen/parts';
import { hideLandingLine } from '../c18-eigen/puzzles';
import { fmt2 } from '../c18-eigen/logic';
import {
  F50, FIB_PAR, FIB_START, P4_SHEAR, P5_LONG, P5_M, P5_RATIO, P5_START, PHI, fibOp, fibPlan, fibPow, fibWon, fmtN, fmtV, gap, p4Rejected,
  p5Won, shearKeeps, type FibState,
} from './logic';
import { S } from './script';

// ------------------------------------------------------------------ p4 · not enough lines

export const p4: PuzzleDef = {
  id: 'c19-p4',
  title: 'Can the shear be written in a grid of lines that hold?',
  goal: 'Build $P$ for the shear from its lines that hold: drag the two columns $\\mathbf p_1$, $\\mathbf p_2$ onto lines the shear keeps, then **Build P**. If the rail rejects it, **pin the evidence**.',
  subgoals: ['Both columns on lines the shear keeps', 'Build $P$', 'Pin the evidence'],
  hints: [
    'The shear keeps one line: the first axis. Any non-zero arrow on it is an eigenvector.',
    'Put both columns on the first axis, for example $(1, 0)$ and $(2, 0)$. Then press **Build P**.',
    'Both columns on one line: $\\det P = 0$, so there is no $P^{-1}$. The shear cannot be written as $PDP^{-1}$.',
  ],
  par: 4,
  onWin: S.p4Win,
  setup(p) {
    void p.g.stage.view2D({ center: [0.8, 0.6], height: 7.6, ms: 0 });
    const grid = p.grid({ main: 0.32, base: 0.1, axis: 0.5 });
    hideLandingLine(grid);
    grid.set(P4_SHEAR);
    const axis = new InfLine(p.g.stage, [0, 0, 0.002], [1, 0, 0], { color: C.violet, width: 2.2, opacity: 0.7 });
    p.add(axis.object); p.onDispose(() => axis.dispose());
    ptag(p, 'the one line the shear keeps', [-2.4, 0, 0], 'vi', [0, 22]);
    const box = new Parallelogram(p.g.stage, [1, 1, 0], [0, 1, 0], { color: C.result, opacity: 0.14 });
    p.add(box);
    const r = p.readout('Columns of P');
    const msgEl = h('div', { class: 'a7-msg' });
    const msg = (t: string, k: '' | 'good' | 'bad' = '') => { msgEl.className = `a7-msg ${k}`; msgEl.innerHTML = inline(t); };
    let built = false, pinned = false;
    const paint = () => {
      const a = h1.vec.slice(0, 2), b = h2.vec.slice(0, 2);
      box.set(v3(a), v3(b));
      const d = a[0] * b[1] - a[1] * b[0];
      box.setColor(Math.abs(d) < 1e-9 ? C.orange : C.result);
      for (const [k, v] of [['a', a], ['b', b]] as [string, Vec][]) r.row(k, k === 'a' ? '$\\mathbf p_1$ kept?' : '$\\mathbf p_2$ kept?', shearKeeps(v) ? `yes: ${fmtV(v)}` : `no: sent to ${fmtV(matVec(P4_SHEAR, v))}`, shearKeeps(v) ? C.violet : C.orange);
      r.row('d', '$\\det P$', fmtN(d), Math.abs(d) < 1e-9 ? C.orange : C.white);
      sg(p, 0, shearKeeps(a) && shearKeeps(b));
    };
    // a tip that comes close to the kept line lands on it exactly (Commander drags with no snap)
    const onAxis = (q: Vector3) => (Math.abs(q.y) <= 0.05 ? new Vector3(q.x, 0, q.z) : q);
    const h1: VectorHandle = new VectorHandle(p, { to: [1, 1, 0], color: C.v, label: '$\\mathbf p_1$', limit: 3, constrain: onAxis, onChange: () => paint() });
    const h2: VectorHandle = new VectorHandle(p, { to: [0, 1, 0], color: C.w, label: '$\\mathbf p_2$', limit: 3, constrain: onAxis, onChange: () => paint() });
    const build = () => {
      if (built) return;
      p.move();
      const a = h1.vec.slice(0, 2), b = h2.vec.slice(0, 2);
      const bad = [a, b].findIndex((v) => !shearKeeps(v));
      if (bad >= 0) { sfx.miss(); msg(`$\\mathbf p_${bad + 1}$ is turned by the shear: it lands at ${fmtV(matVec(P4_SHEAR, [a, b][bad]))}. A column of $P$ has to be a line that holds.`, 'bad'); p.bark('lantern', `Column ${bad + 1} is not a line that holds.`); return; }
      if (!p4Rejected(a, b)) return;
      built = true;
      sg(p, 1);
      sfx.collapse();
      p.g.stage.nudge(0.12);
      msg('**Rejected.** Both columns lie on one line: $\\det P = 0$, so $P^{-1}$ does not exist. The shear has one line, and a grid needs two.', 'bad');
      pinBtn.disabled = false;
      pinBtn.classList.add('primary');
    };
    const doPin = () => {
      if (!built || pinned) return;
      pinned = true;
      p.move();
      pin('c19-shear', 'Can every move be written as stretches along lines that hold?', 'c19');
      answer('c19-shear', 'No. The shear $\\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\end{bmatrix}$ keeps one line, so any $P$ built from its eigenvectors has both columns on that line: $\\det P = 0$ and no $P^{-1}$. A quarter turn has no real line at all; it can be written that way only with complex numbers.', 'c19');
      p.g.toast('Can every move be written as stretches along lines that hold?', 'Case board · evidence pinned');
      sfx.discover();
      sg(p, 2);
      msg('Pinned. The quarter turn fails too, with real numbers: it keeps no real line. With complex numbers it can be written this way.', 'good');
      p.win();
    };
    const buildBtn = button('Build P', build, { cls: 'primary small' });
    const pinBtn = button('Pin the evidence to the case board', doPin, { cls: 'small' });
    pinBtn.disabled = true;
    p.dock().append(h('div', { class: 'a7-btns' }, buildBtn, pinBtn), msgEl);
    msg('Drag the tips of $\\mathbf p_1$ and $\\mathbf p_2$. Each must stay on its own line under the shear.');
    paint();
    return {
      async showMe() { await h1.moveTo([1, 0, 0], 700); await h2.moveTo([2, 0, 0], 700); paint(); build(); doPin(); },
      solve() { h1.set([1, 0, 0]); h2.set([2, 0, 0]); paint(); build(); doPin(); },
      wrong() { h1.set([1, 0, 0]); h2.set([0, 1, 0]); paint(); build(); doPin(); },
    };
  },
};

// ------------------------------------------------------------------ p5 · two sites

export const p5: PuzzleDef = {
  id: 'c19-p5',
  title: 'Where do two sites settle, and how fast?',
  goal: 'Each step, 10% of site A moves to B and 20% of site B moves to A. Everyone starts at A. **Forecast** the long run from the line with stretch 1, then **step** and measure how the gap shrinks.',
  subgoals: ['Forecast the long run', 'Run at least three steps', 'The gap shrinks by what factor each step?'],
  predict: {
    prompt: 'Everyone starts at site A. After many steps, what share is at site A?',
    choices: [{ id: 'all', text: 'All of it' }, { id: 'half', text: 'Half' }, { id: 'two', text: 'Two thirds' }, { id: 'none', text: 'It never settles' }],
    answer: 'two',
    reveal: 'Two thirds. The line with stretch 1 is $(2, 1)$: scaled so the shares add to 1, $(2/3, 1/3)$. Its other line, $(1, -1)$, has stretch 0.7, so the gap shrinks by 0.7 each step.',
  },
  hints: [
    'The shares that do not change solve $M\\mathbf q = \\mathbf q$: $0.9a + 0.2b = a$, so $0.2b = 0.1a$, $a = 2b$.',
    'With $a + b = 1$: $a = 2/3$, $b = 1/3$. Type $2/3$ if you like.',
    'The gap is the part along $(1, -1)$, which has stretch 0.7: each step it is 0.7 of what it was.',
  ],
  par: 5,
  onWin: S.p5Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view2D({ center: [0.3, 0.55], height: 1.75, ms: 0 });
    const seg = new FatLine(p.g.stage, [[1, 0, 0], [0, 1, 0]], { color: C.white, width: 2, opacity: 0.55 });
    const l1 = new InfLine(p.g.stage, [0, 0, 0.001], [2, 1, 0], { color: C.violet, width: 1.6, opacity: 0.45, length: 4 });
    const l2 = new InfLine(p.g.stage, [P5_LONG[0], P5_LONG[1], 0.001], [1, -1, 0], { color: C.violet, width: 1.2, opacity: 0.25, length: 4 });
    p.add(seg.object, l1.object, l2.object);
    p.onDispose(() => { seg.dispose(); l1.dispose(); l2.dispose(); });
    ptag(p, 'stretch 1 · (2, 1)', [0.92, 0.46, 0], 'vi', [0, -16]);
    ptag(p, 'all at A', [1, 0, 0], 'dim', [0, 18]);
    ptag(p, 'all at B', [0, 1, 0], 'dim', [-30, 0]);
    const ax = new FatLine(p.g.stage, [[0, 0, 0], [1.05, 0, 0]], { color: '#8fb8e8', width: 1.2, opacity: 0.5 });
    const ay = new FatLine(p.g.stage, [[0, 0, 0], [0, 1.05, 0]], { color: '#8fb8e8', width: 1.2, opacity: 0.5 });
    p.add(ax.object, ay.object); p.onDispose(() => { ax.dispose(); ay.dispose(); });
    ptag(p, 'share at A →', [0.5, 0, 0], 'dim', [0, 18]);
    ptag(p, 'share at B ↑', [0, 0.5, 0], 'dim', [-52, 0]);
    let x: Vec = P5_START.slice();
    let k = 0;
    const dot = new Dot(v3(x, 0.01), { color: C.result, size: 0.022 });
    const gapA = new Arrow(v3(P5_LONG, 0.004), v3(x, 0.004), { color: C.orange, width: 0.007 });
    const fc = new Dot([0.5, 0.5, 0.01], { color: C.accent, size: 0.018 });
    p.add(dot, gapA, fc);
    fc.setOpacity(0);
    let share: number | null = null;
    const ratios: number[] = [];
    const r = p.readout('Two sites');
    r.row('m', 'shares each step', '$\\left[\\begin{smallmatrix} 0.9 & 0.2 \\\\ 0.1 & 0.8 \\end{smallmatrix}\\right]$');
    const msgEl = h('div', { class: 'a7-msg' });
    const msg = (t: string, kd: '' | 'good' | 'bad' = '') => { msgEl.className = `a7-msg ${kd}`; msgEl.innerHTML = inline(t); };
    let ratioIn: HTMLInputElement | null = null, ratioOk = false, won = false;
    const paint = () => {
      r.row('k', 'steps', String(k), C.accent);
      r.row('x', 'shares now (A, B)', `(${fmt2(x[0])}, ${fmt2(x[1])})`, C.result);
      r.row('g', 'gap to your forecast', share === null ? '·' : fmt2(Math.hypot(x[0] - share, x[1] - (1 - share))), C.orange);
      if (d === 'cadet' && ratios.length) r.row('q', 'gap now ÷ gap before', fmt2(ratios[ratios.length - 1]), C.orange);
    };
    const check = () => {
      const fOk = share !== null && Math.abs(share - P5_LONG[0]) <= (d === 'commander' ? 0.005 : 0.02);
      sg(p, 0, fOk);
      sg(p, 1, k >= 3);
      if (d === 'cadet' && k >= 3) ratioOk = true;
      sg(p, 2, ratioOk);
      if (!won && fOk && k >= 3 && ratioOk && p5Won(share!, k, P5_RATIO)) { won = true; sfx.success(); msg('Two thirds at A. The gap is 0.7 of itself every step: the other line’s stretch.', 'good'); p.win(); }
    };
    // one step at a time: a press while the dot moves does nothing. Commander: forecasts are committed blind.
    let busy = false, stepping: Promise<void> = Promise.resolve();
    const stepBtn = button('Step', () => void stepOnce(p.g.headless ? 1 : 650), { cls: 'primary small' });
    const gateStep = () => { stepBtn.disabled = busy || (d === 'commander' && share === null); };
    const setShare = (s: number) => {
      share = Math.max(0, Math.min(1, s));
      fc.setOpacity(1); fc.at([share, 1 - share, 0.01]);
      paint(); check(); gateStep();
    };
    const stepOnce = (ms: number): Promise<void> => {
      if (busy) return stepping;
      busy = true; gateStep();
      stepping = (async () => {
        try {
          const from = x.slice(), to = matVec(P5_M, from);
          const g0 = gap(k);
          p.move();
          await animate(ms, (t) => { const q = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]; dot.at(v3(q, 0.01)); gapA.set(v3(P5_LONG, 0.004), v3(q, 0.004)); }, ease.inOut);
          x = to; k++;
          ratios.push(gap(k) / g0);
          sfx.tick(k);
          paint(); check();
        } finally { busy = false; gateStep(); }
      })();
      return stepping;
    };
    const controls = h('div', { class: 'a7-row' });
    let showShare = (_v: number) => {};
    if (d === 'commander') {
      const inp = h('input', { class: 'cell a7-num', inputmode: 'decimal', 'aria-label': 'forecast share at site A', placeholder: '?' }) as HTMLInputElement;
      const go = () => { const v = parseNum(inp.value); if (v !== null) { p.move(); setShare(v); } };
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') go(); });
      inp.addEventListener('change', go);
      controls.append(h('span', { class: 'k' }, 'Forecast: share at A ='), inp);
      showShare = (v) => { inp.value = fmtN(Math.round(v * 1000) / 1000); };
    } else {
      const sl = fslider({ label: 'forecast: share at A', min: 0, max: 1, step: d === 'cadet' ? 1 / 6 : 1 / 12, value: 0.5, format: (v) => fmtN(Math.round(v * 12) / 12), onInput: (v) => setShare(v) });
      sl.el.addEventListener('change', () => p.move());
      controls.append(sl.el);
      showShare = (v) => sl.set(v, false);
    }
    const stepRow = h('div', { class: 'a7-btns' }, stepBtn);
    const ratioRow = h('div', { class: 'a7-row' });
    if (d !== 'cadet') {
      ratioIn = h('input', { class: 'cell a7-num', inputmode: 'decimal', 'aria-label': 'gap ratio per step', placeholder: '?' }) as HTMLInputElement;
      const go = () => {
        const v = parseNum(ratioIn!.value); if (v === null) return;
        p.move();
        if (k < 3) { msg('Run three steps first, and watch the orange gap.', 'bad'); return; }
        ratioOk = Math.abs(v - P5_RATIO) <= 0.005;
        if (ratioOk) sfx.snap(); else { sfx.miss(); msg(`Divide the gap after a step by the gap before it. Gaps so far: ${[0, 1, 2, 3].slice(0, k + 1).map((j) => fmt2(gap(j))).join(', ')}.`, 'bad'); }
        check();
      };
      ratioIn.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') go(); });
      ratioIn.addEventListener('change', go);
      ratioRow.append(h('span', { class: 'k' }, 'Each step, the gap is multiplied by'), ratioIn);
    }
    p.dock().append(controls, stepRow, ratioRow, msgEl);
    paint(); gateStep();
    return {
      async showMe() {
        showShare(P5_LONG[0]); setShare(P5_LONG[0]);
        for (let i = 0; i < 3; i++) await stepOnce(p.g.headless ? 1 : 600);
        if (ratioIn) { ratioIn.value = String(P5_RATIO); ratioIn.dispatchEvent(new Event('change')); }
      },
      async solve() {
        showShare(P5_LONG[0]); setShare(P5_LONG[0]);
        for (let i = 0; i < 3; i++) await stepOnce(1);
        if (ratioIn) { ratioIn.value = String(P5_RATIO); ratioIn.dispatchEvent(new Event('change')); }
      },
      async wrong() { setShare(1); for (let i = 0; i < 3; i++) await stepOnce(1); if (ratioIn) { ratioIn.value = '0.9'; ratioIn.dispatchEvent(new Event('change')); } },
    };
  },
};

// ------------------------------------------------------------------ p6 [S] · Fibonacci by repeated squaring

export const p6: PuzzleDef = {
  id: 'c19-p6',
  title: 'What is the fiftieth Fibonacci number, in ten products or fewer?',
  goal: '$M = \\begin{bmatrix} 1 & 1 \\\\ 1 & 0 \\end{bmatrix}$: $M^n$ holds the Fibonacci numbers $F_{n+1}, F_n$. Build $R = M^{50}$. **Square** doubles $B$’s power; **Take B** multiplies it into $R$. Par: 10 products.',
  subgoals: ['$R = M^{50}$', 'In ten products or fewer'],
  hints: [
    '50 = 32 + 16 + 2. Square $B$ to get $M^2$, $M^4$, …, $M^{32}$, and take the ones you need.',
    'Square ($M^2$), take it; square, square, square ($M^{16}$), take; square ($M^{32}$), take.',
    'That is 5 squarings and 2 products into $R$: 7 products in all. $F_{50} = 12{,}586{,}269{,}025$.',
  ],
  par: FIB_PAR,
  onWin: S.p6Win,
  setup(p) {
    void p.g.stage.view2D({ center: [1.2, 0.5], height: 6.2, ms: 0 });
    const grid = p.grid({ main: 0.25, base: 0, axis: 0.45 });
    hideLandingLine(grid);
    const L1 = new InfLine(p.g.stage, [0, 0, 0.002], [PHI, 1, 0], { color: C.violet, width: 2, opacity: 0.6, dashed: true });
    p.add(L1.object); p.onDispose(() => L1.dispose());
    ptag(p, 'stretch 1.618', [2.6, 2.6 / PHI, 0], 'vi', [0, -16]);
    const col = new Arrow([0, 0, 0.01], [2.4, 0, 0.01], { color: C.result, width: 0.05, label: '$(F_{r+1}, F_r)$' });
    p.add(col);
    let s: FibState = { ...FIB_START };
    const r = p.readout('Repeated squaring');
    const msgEl = h('div', { class: 'a7-msg' });
    const msg = (t: string, kd: '' | 'good' | 'bad' = '') => { msgEl.className = `a7-msg ${kd}`; msgEl.innerHTML = inline(t); };
    const big = (x: number) => x.toLocaleString('en-GB');
    let won = false;
    const paint = () => {
      const R = fibPow(s.r);
      r.row('b', '$B$', `$M^{${s.b}}$`, C.violet);
      r.row('r', '$R$', `$M^{${s.r}}$`, C.result);
      r.row('n', 'products so far', `${s.products} (par ${FIB_PAR})`, s.products <= FIB_PAR ? C.white : C.orange);
      r.row('f', '$F_r$ (top right of $R$)', s.r ? big(R[0][1]) : '0', C.result);
      r.row('q', '$F_{r+1} \\div F_r$', s.r ? (R[0][0] / R[0][1]).toFixed(6) : '·');
      const v = s.r ? [R[0][0], R[1][0]] : [1, 0];
      const n = Math.hypot(v[0], v[1]);
      col.setTo([2.4 * v[0] / n, 2.4 * v[1] / n, 0.01]);
    };
    const act = (op: 'square' | 'take' | 'once') => {
      if (won) return;
      p.move();
      const next = fibOp(s, op);
      if (next.r > 50 || next.b > 64) { sfx.miss(); msg(next.r > 50 ? `That would make $M^{${next.r}}$: past 50. Start over, or take a smaller power.` : 'B is already past any power you need.', 'bad'); return; }
      s = next;
      sfx.tick(Math.log2(s.b));
      paint();
      if (fibWon(s)) {
        won = true;
        sg(p, 0); sg(p, 1, s.products <= FIB_PAR);
        sfx.success();
        msg(`$R = M^{50}$: $F_{50} = ${big(F50)}$, in ${s.products} products. The ratio of neighbours has settled at the larger stretch, 1.618.`, 'good');
        p.win();
      }
    };
    const reset = () => { if (won) return; s = { ...FIB_START }; paint(); msg(''); };
    p.dock().append(
      h('div', { class: 'a7-btns' },
        button('Square B', () => act('square'), { cls: 'primary small' }),
        button('Take B into R', () => act('take'), { cls: 'small' }),
        button('R × M (one step)', () => act('once'), { cls: 'small ghost' }),
        button('Start over', reset, { cls: 'small ghost' })),
      msgEl);
    paint();
    const plan = fibPlan(50);
    return {
      // the plan is from R = I, B = M: start over first, whatever the player has pressed
      async showMe() { reset(); for (const op of plan) { act(op); await new Promise((res) => window.setTimeout(res, p.g.headless ? 1 : 450)); } },
      solve() { reset(); for (const op of plan) act(op); },
      wrong() { for (let i = 0; i < 6; i++) act('square'); act('take'); },
    };
  },
};
