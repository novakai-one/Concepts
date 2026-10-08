// Chapter 18 puzzles 2–4 (p1 is the trajectory problem, traj-puzzles.ts): the one line a shear keeps (p2),
// the λ dial flattens A − λI at each λ (p3 [D]), and T keeps no real line at all (p4).
import type { PuzzleCtx, PuzzleDef } from '../../../game/types';
import type { Grid2D } from '../../../gfx/grid';
import { Parallelogram, InfLine, Outline2D } from '../../../gfx/shapes';
import { Sweep } from '../../../kit/geom';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { h, button, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { answer } from '../../../game/caseboard';
import { Tpartial } from '../../truth';
import { det, identity, matMul, matVec, meq, type Mat } from '../../../math/la';
import { LineHunt, PolyPlot, niceDir, ptag, v3, sg, fslider } from './parts';
import {
  P2_A, P3_A, P3_ROOTS, P4_T, SWEEP_FULL, charAt, fmt2, fmtN, nullLine, rootsWon, shift, texM,
} from './logic';
import { S } from './script';
import { tcol } from './traj-text';

const tolDeg = (p: PuzzleCtx) => (p.difficulty === 'cadet' ? 3 : p.difficulty === 'navigator' ? 2 : 1);
const hunt = (p: PuzzleCtx, M: Mat, o: { radius?: number; start?: number; title?: string; view?: { center: [number, number]; height: number }; onChange?: () => void } = {}) => new LineHunt(p, {
  M, radius: o.radius ?? 1.25, start: o.start, tolDeg: tolDeg(p), mode: p.difficulty === 'commander' ? 'typed' : 'drag', autoLock: p.difficulty === 'cadet',
  typedStretch: p.difficulty !== 'cadet', stretchTol: p.difficulty === 'commander' ? 0.01 : 0.05, title: o.title, view: o.view, onChange: o.onChange,
  plain: true, labels: { x: '$\\mathbf v$', mx: '$A\\mathbf v$' },
});

/** The plain grid for the line hunts (the test arrow and its image do the talking). */
const quietGrid = (p: PuzzleCtx) => p.grid({ main: 0.32, base: 0, axis: 0.5 });

/** Grid2D draws a violet line where a flattened grid lands; here violet means "sent to the origin", so hide it. */
export function hideLandingLine(g: Grid2D): void {
  const set0 = g.set.bind(g);
  g.set = (M: Mat, T?: [number, number]) => { set0(M, T); g.mesh.children.forEach((c) => { c.visible = false; }); };
  g.mesh.children.forEach((c) => { c.visible = false; });
}

/** The readout shared by the hunts: the multiplication A v, live, and how many lines are found. */
function huntReadout(p: PuzzleCtx, hu: () => LineHunt, title: string, extra?: (r: ReturnType<PuzzleCtx['readout']>) => void, M?: Mat) {
  const r = p.readout(title);
  const num = (v: number) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2));
  const paint = () => {
    const x = hu();
    const xv = x.x, yv = x.image;
    if (M) r.eq(`A\\mathbf v = ${texM(M)}\\begin{bmatrix} ${num(xv[0])} \\\\ ${num(xv[1])} \\end{bmatrix} = \\begin{bmatrix} ${num(yv[0])} \\\\ ${num(yv[1])} \\end{bmatrix}`);
    r.row('locked', 'lines found', String(x.rows.filter((k) => k.ok).length));
    extra?.(r);
  };
  return { r, paint };
}

// p1 (the opening encounter) is the trajectory problem: traj-puzzles.ts.

// ------------------------------------------------------------------ p2 · a shear

export const p2: PuzzleDef = {
  id: 'c18-p2',
  title: 'How many lines does a shear keep?',
  goal: 'A shear, $A = \\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\end{bmatrix}$. Drag green ($\\mathbf v$) **all the way round**. **Lock** each line where yellow ($A\\mathbf v$) stays on the green line, and type its $\\lambda$.',
  subgoals: ['Turn $\\mathbf v$ all the way round', 'Lock every line $A$ keeps, with its $\\lambda$'],
  predict: {
    prompt: 'The first matrix kept two lines. How many lines does this shear keep? $A = \\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\end{bmatrix}$',
    choices: [{ id: 'none', text: 'None' }, { id: 'one', text: 'One' }, { id: 'two', text: 'Two' }],
    answer: 'one',
    reveal: 'One. A shear slides every row of the grid sideways, so only the $x$-axis stays on itself.',
  },
  hints: [
    '**Sweep once** turns $\\mathbf v$ all the way round for you.',
    'The $x$-axis does not move: $A\\begin{bmatrix}1\\\\0\\end{bmatrix} = \\begin{bmatrix}1\\\\0\\end{bmatrix}$.',
    'Lock $\\begin{bmatrix}1\\\\0\\end{bmatrix}$ with $\\lambda = 1$. Then sweep the whole circle: there is no other line.',
  ],
  par: 3,
  onWin: S.p2Win,
  setup(p) {
    void p.g.stage.view2D({ center: [0.5, 0.9], height: 8.8, ms: 0 });
    quietGrid(p);
    let won = false;
    const check = () => {
      paint();
      const swept = h2.sweep.coverage >= SWEEP_FULL;
      sg(p, 0, swept);
      sg(p, 1, h2.done);
      if (swept && h2.done && !won) { won = true; sfx.success(); h2.say('One line, and the whole circle checked. There is no second line.', 'good'); p.win(); }
    };
    const view2 = { center: [0.5, 0.9] as [number, number], height: 8.8 };
    if (p.difficulty === 'commander') p.setGoal('A shear, $A = \\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\end{bmatrix}$. **Type a vector** and press **Apply $A$**. Find each line where $A\\mathbf v$ stays on the line of $\\mathbf v$, and type its $\\lambda$. Then press **Sweep once** to check the whole circle.');
    // green starts off the x-axis (the line the shear keeps), so the player finds it
    const h2: LineHunt = hunt(p, P2_A, { radius: 1.3, start: Math.PI / 3, view: view2, onChange: () => check() });
    const { paint } = huntReadout(p, () => h2, '', (r) => r.row('cov', 'circle checked', `${Math.round(h2.sweep.coverage * 100)}%`, h2.sweep.coverage >= SWEEP_FULL ? C.good : C.white), P2_A);
    h2.say(p.difficulty === 'commander' ? 'Type a vector and press **Apply $A$**.'
      : p.difficulty === 'cadet' ? 'Drag green round. A line locks when yellow stays on it.'
        : 'Drag green round. When yellow is on the same line as green, press **Lock this line**.');
    paint();
    p.tick(() => { if (!won) paint(); });
    if (p.difficulty === 'commander') {
      // typed arrows do not sweep; give the full turn its own button
      h2.el.querySelector('.a7-row')?.append(button('Sweep once', () => { p.move(); void h2.sweep.animateSweep(6000).then(check); }, { cls: 'small ghost' }));
    }
    return {
      async showMe() { await h2.sweep.animateSweep(p.g.headless ? 40 : 5000); await h2.showMe(); check(); },
      async solve() { await h2.sweep.animateSweep(40); await h2.showMe(10); check(); },
      wrong() { h2.lock([1, 1]); },
    };
  },
};

// ------------------------------------------------------------------ p3 [D] · the λ dial

/** The commander's derivation tiles (the reason, in order). */
export const P3_TILES = [
  { id: 'a', text: '$A\\mathbf v = \\lambda\\mathbf v$ for a vector $\\mathbf v \\neq \\mathbf 0$' },
  { id: 'b', text: '$A\\mathbf v - \\lambda I\\mathbf v = \\mathbf 0$, so $(A - \\lambda I)\\mathbf v = \\mathbf 0$' },
  { id: 'c', text: '$A - \\lambda I$ sends a vector (not zero) to zero, so it squashes the plane flat' },
  { id: 'd', text: 'A matrix that squashes the plane flat has determinant 0: $\\det(A - \\lambda I) = 0$' },
];
export const P3_DECOYS = [{ id: 'x', text: '$\\det A = \\lambda$' }];
export const P3_ORDER = ['a', 'b', 'c', 'd'];

export const p3: PuzzleDef = {
  id: 'c18-p3',
  title: 'Find the eigenvalues with a dial',
  goal: 'If $A\\mathbf v = \\lambda\\mathbf v$, then $(A - \\lambda I)\\mathbf v = \\mathbf 0$. So $A - \\lambda I$ squashes the plane flat, and $\\det(A - \\lambda I) = 0$. **Turn the dial** λ: the grid shows $A - \\lambda I$, and the yellow square has area $\\det(A - \\lambda I)$. **Lock** each λ where the area is 0. There are two.',
  subgoals: ['Lock the first λ where the area is 0', 'Lock the second one', 'Then: work out why (opens once both are locked)'],
  predict: {
    prompt: '$A = \\begin{bmatrix} 4 & 1 \\\\ 2 & 3 \\end{bmatrix}$ and $A\\begin{bmatrix}1\\\\1\\end{bmatrix} = \\begin{bmatrix}5\\\\5\\end{bmatrix}$. What is $(A - 5I)\\begin{bmatrix}1\\\\1\\end{bmatrix}$?',
    choices: [{ id: 'zero', text: '$\\begin{bmatrix}0\\\\0\\end{bmatrix}$' }, { id: 'same', text: '$\\begin{bmatrix}5\\\\5\\end{bmatrix}$' }, { id: 'one', text: '$\\begin{bmatrix}1\\\\1\\end{bmatrix}$' }, { id: 'four', text: '$\\begin{bmatrix}4\\\\4\\end{bmatrix}$' }],
    answer: 'zero',
    reveal: '$\\begin{bmatrix}5\\\\5\\end{bmatrix} - 5\\begin{bmatrix}1\\\\1\\end{bmatrix} = \\begin{bmatrix}0\\\\0\\end{bmatrix}$. So $A - 5I$ sends a vector (not zero) to zero: it squashes the plane flat, and $\\lambda = 5$ is one of the two.',
  },
  hints: [
    'The yellow area is $\\det(A - \\lambda I)$. When it changes sign, it passed 0 on the way.',
    '$A - \\lambda I = \\begin{bmatrix} 4 - \\lambda & 1 \\\\ 2 & 3 - \\lambda \\end{bmatrix}$, so the area is $(4 - \\lambda)(3 - \\lambda) - 2$. When is that 0?',
    'Lock $\\lambda = 5$ and $\\lambda = 2$.',
  ],
  par: 14, // trying the dial (and, on Navigator, six checked steps) is how this is solved: exploring must not cost stars
  onWin: S.p3Win,
  setup(p) {
    const d = p.difficulty;
    // cadet: the dial locks by itself where the area is 0
    if (d === 'cadet') p.setGoal(p3.goal.replace('**Lock** each λ where the area is 0.', 'Stop the dial where the area is 0: it locks there by itself.'));
    // the origin sits low and left of centre: at λ = 0 the yellow square reaches (5, 5)
    void p.g.stage.view2D({ center: [0.3, 2], height: 12, ms: 0 });
    const grid = p.grid({ main: 0.55, base: 0.14, axis: 0.7 });
    hideLandingLine(grid);
    let l = 0; // λ = 0: the grid shows A itself
    // yellow: where A − λI sends one grid square; its area is det(A − λI)
    const sq = new Parallelogram(p.g.stage, [1, 0, 0], [0, 1, 0], { color: C.result, opacity: 0.26 });
    p.add(sq);
    const lines: InfLine[] = [];
    const lockTags: ReturnType<typeof ptag>[] = [];
    const live = new InfLine(p.g.stage, [0, 0, 0.004], [1, 1, 0], { color: C.violet, width: 3, opacity: 0 });
    p.add(live.object); p.onDispose(() => live.dispose());
    const r = p.readout('');
    const plot = new PolyPlot({ lo: -1, hi: 8.6, ymin: -4, ymax: 14, fn: (x) => charAt(P3_A, x), label: 'det(A − λI) against λ', ticks: [0, 2, 4, 6, 8] });
    const stops: number[] = [];
    const tol = 1e-6;
    let derived = d === 'cadet';
    const done = [false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; sg(p, i); } };
    let won = false;
    const winCheck = () => {
      if (stops.length >= 1) tick(0);
      if (stops.length >= 2) tick(1);
      if (derived) tick(2);
      if (!won && rootsWon(stops) && derived) { won = true; sfx.success(); msg('Flat at $\\lambda = 5$ and $\\lambda = 2$: the eigenvalues. The violet lines are their eigenvectors.', 'good'); p.win(); }
    };
    const msgEl = h('div', { class: 'a7-msg' });
    const msg = (t: string, k: '' | 'good' | 'bad' = '') => { msgEl.className = `a7-msg ${k}`; msgEl.innerHTML = inline(t); };
    const n2 = (x: number) => fmtN(Math.round(x * 100) / 100).replace('−', '-');
    const paint = () => {
      const S0 = shift(P3_A, l);
      grid.set(S0);
      sq.set([S0[0][0], S0[1][0], 0], [S0[0][1], S0[1][1], 0]);
      const dt = det(S0);
      const flat = Math.abs(dt) <= tol;
      const nl = flat ? nullLine(P3_A, l) : null;
      live.line.setOpacity(nl ? 0.95 : 0);
      if (nl) live.set([0, 0, 0.004], v3(nl));
      plot.at(l);
      r.row('d', 'yellow area, $\\det(A - \\lambda I)$', fmt2(dt), flat ? C.violet : C.result);
      // the link: the matrix on the grid, and its area worked out
      const [[a, b], [c, e]] = S0;
      r.eq(`\\begin{gathered} \\det\\begin{bmatrix} ${n2(a)} & ${n2(b)} \\\\ ${n2(c)} & ${n2(e)} \\end{bmatrix} \\\\ = (${n2(a)})(${n2(e)}) - (${n2(b)})(${n2(c)}) = ${n2(dt)} \\end{gathered}`);
    };
    const lockAt = (x: number, quiet = false) => {
      if (Math.abs(charAt(P3_A, x)) > tol) {
        if (!quiet) { sfx.miss(); msg(`At $\\lambda = ${fmtN(x)}$ the area is ${fmt2(charAt(P3_A, x))}, not 0.`, 'bad'); }
        return;
      }
      if (stops.some((s) => Math.abs(s - x) < 1e-9)) return;
      stops.push(x);
      plot.mark(x);
      const nl = nullLine(P3_A, x)!;
      const L = new InfLine(p.g.stage, [0, 0, 0.003], v3(nl), { color: C.violet, width: 2.2, opacity: 0.55, dashed: true });
      p.add(L.object); p.onDispose(() => L.dispose()); lines.push(L);
      const nd = niceDir(nl);
      // tag on the upper half of the line (the origin sits low): clear of the dock and the goal card
      const sgn = nd[1] > 0 ? 2.6 : -2.6;
      const tg = ptag(p, `$\\lambda = ${fmtN(x)}$`, v3([nd[0] * sgn / Math.hypot(nd[0], nd[1]), nd[1] * sgn / Math.hypot(nd[0], nd[1])]), 'vi', [0, -18]);
      lockTags.push(tg);
      sfx.collapse();
      p.g.stage.nudge(0.06);
      msg(`Flat at $\\lambda = ${fmtN(x)}$: the area is 0. $A - ${fmtN(x)}I$ sends the violet line to zero, so on it $A\\mathbf v = ${fmtN(x)}\\mathbf v$.`, 'good');
      if (d === 'cadet' && stops.length === 2) r.note('$A\\mathbf v = \\lambda\\mathbf v$ means $(A - \\lambda I)\\mathbf v = \\mathbf 0$: a vector (not zero) goes to zero, so $A - \\lambda I$ squashes the plane and $\\det(A - \\lambda I) = 0$.');
      if (stops.length === 2) openDerivation();
      winCheck();
    };
    const step = d === 'cadet' ? 0.5 : d === 'navigator' ? 0.25 : 0.05;
    const slider = fslider({ label: 'dial $\\lambda$', min: -1, max: 8, step, value: l, format: (x) => fmtN(x), onInput: (x) => { l = x; paint(); if (d === 'cadet') lockAt(l, true); } });
    const lockBtn = button('Lock λ', () => { p.move(); lockAt(l); }, { cls: 'primary small' });
    r.el.append(plot.el);
    const dialRow = h('div', { class: 'a7-row' }, slider.el, d === 'cadet' ? null : lockBtn);
    p.dock().append(dialRow, msgEl);
    slider.el.addEventListener('change', () => p.move());
    // the derivation, by level (GDD §7.1): cadet watches, navigator types the steps, commander orders the
    // reason first. It stays out of sight until both λ are locked, so the dial has the dock to itself.
    let ws: StepWorksheet | null = null, tiles: TileOrder | null = null, last: StepWorksheet | null = null;
    const submitTiles = (o: string[]) => {
      p.move();
      if (o.join() !== P3_ORDER.join()) { sfx.miss(); msg('Not in that order. Start from $A\\mathbf v = \\lambda\\mathbf v$.', 'bad'); return; }
      sfx.snap();
      msg('Right. Now the last line: solve $\\det(A - \\lambda I) = 0$.', 'good');
      if (!last) last = new StepWorksheet(p, { title: 'The last line · only the answer is checked', steps: [{ prompt: 'Solve $\\lambda^2 - 7\\lambda + 10 = 0$: the roots, larger first', answer: P3_ROOTS }], mount: box, onDone: () => { derived = true; winCheck(); } });
    };
    const steps = [
      { prompt: '$(4 - \\lambda)(3 - \\lambda) - 2 = \\lambda^2 + b\\lambda + c$: $b =$', answer: -7, mistakes: [[7, 'Multiply out: the λ terms are $-4\\lambda - 3\\lambda$.']] as [number, string][] },
      { prompt: '$c =$', answer: 10, mistakes: [[12, 'Take away the off-diagonal product $1 \\cdot 2 = 2$.']] as [number, string][] },
      { prompt: 'The larger root', answer: P3_ROOTS[0] },
      { prompt: 'The smaller root', answer: P3_ROOTS[1] },
      { prompt: '$(A - 5I)\\begin{bmatrix}1\\\\y\\end{bmatrix} = \\mathbf 0$: $y =$', answer: 1 },
      { prompt: '$(A - 2I)\\begin{bmatrix}1\\\\y\\end{bmatrix} = \\mathbf 0$: $y =$', answer: -2, mistakes: [[2, '$A - 2I = \\begin{bmatrix} 2 & 1 \\\\ 2 & 1 \\end{bmatrix}$: $2 + y = 0$.']] as [number, string][] },
    ];
    const box = h('div', { class: 'a7-deriv', style: 'display:none;flex-direction:column;gap:8px' });
    if (d === 'navigator') {
      ws = new StepWorksheet(p, { title: 'Now by hand', steps, mount: box, onDone: () => { derived = true; winCheck(); } });
    } else if (d === 'commander') {
      tiles = new TileOrder(p, { tiles: P3_TILES, decoys: P3_DECOYS, mount: box, title: 'Why the determinant is 0: put the steps in order', submitLabel: 'Check the order', onSubmit: (o) => submitTiles(o) });
    }
    if (ws || tiles) p.dock().append(box);
    function openDerivation() {
      if (box.style.display !== 'none' || (!ws && !tiles)) return;
      box.style.display = 'flex';
      // the dial has done its job: give the dock to the derivation, and the goal to what is left
      dialRow.style.display = 'none';
      p.setGoal(d === 'commander'
        ? 'Both found: $\\lambda = 5$ and $\\lambda = 2$. **Now the reason.** Put the steps in order, then solve the equation.'
        : 'Both found: $\\lambda = 5$ and $\\lambda = 2$. **Now work it out by hand**: multiply out $\\det(A - \\lambda I)$, solve it, and find each eigenvector.');
      if (!p.g.headless) window.setTimeout(() => msg(d === 'commander' ? 'Both found. Now put the steps below in order.' : 'Both found. Now work them out by hand, below.', 'good'), 1600);
    }
    paint();
    msg('Turn the dial. Lock each $\\lambda$ where the yellow area is 0.');
    const goTo = async (x: number, ms: number) => {
      const x0 = l;
      await animate(ms, (k) => { l = x0 + (x - x0) * k; slider.set(Math.round(l / step) * step, false); paint(); }, ease.inOut);
      l = x; slider.set(x, false); paint();
    };
    const finishDerivation = async (fast: boolean) => {
      if (ws) { if (fast) ws.solve(); else await ws.showMe(350); }
      if (tiles) {
        tiles.set(P3_ORDER);
        submitTiles(P3_ORDER);
        const lw = last as StepWorksheet | null;
        if (lw) { if (fast) lw.solve(); else await lw.showMe(300); }
      }
    };
    const reason = 'Why these two: $\\det(A - \\lambda I) = (4 - \\lambda)(3 - \\lambda) - 2 = \\lambda^2 - 7\\lambda + 10 = (\\lambda - 5)(\\lambda - 2)$. It is 0 only at $\\lambda = 5$ and $\\lambda = 2$.';
    return {
      async showMe() {
        // a search a person would run: two tries that miss, the sign change, then the two hits and the reason
        p.move();
        await goTo(1, 900);
        msg(`$\\lambda = 1$: the area is ${fmtN(charAt(P3_A, 1))}. Not flat.`); await wait(1100);
        await goTo(4, 1100);
        msg(`$\\lambda = 4$: the area is ${fmtN(charAt(P3_A, 4))}. It changed sign, so it passed 0 between 1 and 4.`); await wait(1500);
        for (const x of [2, 5]) { await goTo(x, 1100); lockAt(x); await wait(1300); }
        await finishDerivation(false);
        if (!p.g.headless) msg(reason, 'good');
      },
      async solve() { for (const x of P3_ROOTS) { l = x; slider.set(x, false); paint(); lockAt(x); } await finishDerivation(true); },
      wrong() { l = 4; slider.set(4, false); paint(); lockAt(4); },
    };
  },
};

// ------------------------------------------------------------------ p4 · no line at all

const PLATE: [number, number][] = [[0, 0], [1, 0], [1, 0.4], [0.4, 0.4], [0.4, 1], [0, 1]];
const texT = texM(P4_T);
const texR = (M: Mat) => texM(M.map((row) => row.map((x) => Math.round(x * 100) / 100 + 0)));

export const p4: PuzzleDef = {
  id: 'c18-p4',
  title: 'Does T keep any line?',
  goal: `$T = ${texT}$. Turn $\\mathbf v$ all the way round. Does $T\\mathbf v$ ever stay on the line through $\\mathbf v$?`,
  subgoals: ['Turn $\\mathbf v$ all the way round', 'Apply $T$ until the L is back where it started'],
  hints: [
    'Press **Turn $\\mathbf v$ round**. Yellow never lands on the line through green: $T$ turns every vector.',
    '$\\det(T - \\lambda I) = \\lambda^2 + 1$. It is never $0$ for a real $\\lambda$. Its roots are $\\lambda = \\pm i$.',
    'Keep pressing **Apply $T$**. Count how many times it takes.',
  ],
  par: 8, // sweeping and applying T is how this is solved: exploring must not cost stars
  onWin: S.p4Win,
  setup(p) {
    void p.g.stage.view2D({ center: [0.4, 0.2], height: 8.4, ms: 0 });
    const grid = p.grid({ main: 0.22, base: 0, axis: 0.45 });
    const done = [false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; sg(p, i); } };
    const r = p.readout('');
    const msgEl = h('div', { class: 'a7-msg' });
    const msg = (t: string, k: '' | 'good' | 'bad' = '') => { msgEl.className = `a7-msg ${k}`; msgEl.innerHTML = inline(t); };
    const stageEl = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    p.dock().append(stageEl, msgEl);
    let won = false;
    let stage: 'A' | 'B' = 'A';
    const numT = (v: number) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2));

    // ---- stage A: v goes all the way round; Tv never lands on the line through v
    // v starts at (1, 1), off the grid axes, so its line shows; T sends it to (−1, 0)
    const sw = new Sweep(p, { M: P4_T, radius: Math.SQRT2, start: Math.PI / 4, xLine: true, labels: { x: '$\\mathbf v$', mx: '$T\\mathbf v$' } });
    const plot = new PolyPlot({ lo: -3, hi: 3, ymin: -1, ymax: 10, fn: (x) => charAt(P4_T, x), label: 'det(T − λI) = λ² + 1 against λ', ticks: [-2, -1, 0, 1, 2] });
    plot.at(0);
    const paintA = () => {
      const x = sw.xVec.slice(0, 2), y = matVec(P4_T, x);
      r.eq(`T\\mathbf v = ${texT}\\begin{bmatrix} ${numT(x[0])} \\\\ ${numT(x[1])} \\end{bmatrix} = \\begin{bmatrix} ${numT(y[0])} \\\\ ${numT(y[1])} \\end{bmatrix}`);
      r.row('cov', 'circle checked', `${Math.round(sw.coverage * 100)}%`, sw.coverage >= SWEEP_FULL ? C.good : C.white);
    };
    const nextBtn = button('Next', () => startB(), { cls: 'primary small' });
    const doneA = () => {
      if (done[0]) return;
      tick(0);
      paintA();
      msg('No line: $T$ turns every vector. $\\det(T - \\lambda I) = \\lambda^2 + 1$ is never $0$ for a real $\\lambda$. Its roots are $\\lambda = \\pm i$.', 'good');
      stageEl.replaceChildren(plot.el, h('div', { class: 'a7-row' }, nextBtn));
    };
    p.tick(() => { if (!done[0]) { paintA(); if (sw.coverage >= SWEEP_FULL) doneA(); } });
    stageEl.append(h('div', { class: 'a7-row' }, button(inline('Turn $\\mathbf v$ round'), () => { p.move(); void sw.animateSweep(5600); }, { cls: 'primary small', html: true }), h('span', { class: 'k' }, 'or drag green')));
    paintA();
    msg(`$T${tcol([1, 1])} = ${tcol([-1, 0])}$: off the line through $\\mathbf v$.`);

    // ---- stage B: apply T, one quarter turn of its slanted grid at a time; four bring the L home
    const plate = new Outline2D(p.g.stage, PLATE, { color: C.white, opacity: 0.12 });
    const home = new Outline2D(p.g.stage, PLATE, { color: '#7d8aa5', opacity: 0.05 });
    p.add(home, plate);
    for (const o of [plate.group, home.group]) o.visible = false;
    const showM = (M: Mat) => { grid.set(M); plate.set(M); };
    let M = identity(2), k = 0, busy = false;
    const powEq = () => r.eq(k === 0 ? 'I' : `T${k === 1 ? '' : `^{${k}}`} = ${texR(M)}${meq(M, identity(2), 1e-9) ? ' = I' : meq(M, [[-1, 0], [0, -1]], 1e-9) ? ' = -I' : ''}`);
    const applyT = async (fast = false) => {
      if (busy || won || stage !== 'B') return;
      busy = true;
      p.move();
      const M0 = M;
      if (!fast) sfx.whoosh(0.9);
      await animate(fast ? 1 : 900, (t) => showM(matMul(Tpartial((t * Math.PI) / 2), M0)), ease.inOut);
      M = matMul(P4_T, M0);
      k += 1;
      showM(M);
      powEq();
      busy = false;
      if (k === 4) {
        tick(1); won = true;
        sfx.success();
        msg('$T^4 = I$: the L is home. $T$ has $\\lambda = \\pm i$, and $i^4 = 1$.', 'good');
        answer('fourth', '$T$ keeps no real line: $\\lambda^2 + 1 = 0$ gives $\\lambda = \\pm i$. And $T^4 = I$, because $i^4 = 1$. So every fourth $T$ brings everything home.', 'c18');
        p.g.toast('Why does every fourth T bring everything home?', 'Case board · answered');
        p.win();
      } else if (k === 2) msg('$T^2 = -I$: every vector is flipped, like $i^2 = -1$.');
      else msg(k === 1 ? 'Not home yet.' : '$T^3 = -T$. Not home yet.');
    };
    const startB = () => {
      if (stage !== 'A') return;
      stage = 'B';
      sw.show(false);
      for (const o of [plate.group, home.group]) o.visible = true;
      M = identity(2); k = 0;
      showM(M);
      grid.setLook({ main: 0.5, base: 0.12 });
      p.setGoal(`$T = ${texT}$. Apply $T$ until the white L is back where it started.`);
      r.hideRow('cov');
      powEq();
      stageEl.replaceChildren(h('div', { class: 'a7-row' }, button(inline('Apply $T$'), () => void applyT(), { cls: 'primary small', html: true })));
      msg('Apply $T$ until the L is back on its outline.');
    };
    return {
      async showMe() {
        if (!done[0]) await sw.animateSweep(p.g.headless ? 40 : 4000);
        doneA();
        await wait(p.g.headless ? 5 : 2200);
        startB();
        for (let i = k; i < 4; i++) { await applyT(p.g.headless); await wait(p.g.headless ? 5 : 900); }
      },
      async solve() {
        await sw.animateSweep(40);
        doneA();
        startB();
        for (let i = 0; i < 4; i++) await applyT(true);
      },
      async wrong() {
        await sw.animateSweep(40);
        doneA();
        startB();
        await applyT(true);
        await applyT(true);
      },
    };
  },
};
