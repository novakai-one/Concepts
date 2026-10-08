// [SP] Act VII set piece · The fiftieth pulse (GDD §6.9): uses Acts IV (volume), VI (coordinates in another
// grid) and VII (lines that hold, powers). Then the Act VII Review, by Vell.
import { BufferAttribute, BufferGeometry, Color, Points, PointsMaterial } from 'three';
import type { DoubtDef, PuzzleDef, ReviewDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { InfLine, Lattice3D } from '../../../gfx/shapes';
import { MatrixInput, VectorInput, parseNum } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { rint, rng } from '../../../game/lawcheck';
import { identity, matMul, matVec, mlerp, mpow, normalize, type Mat, type Vec } from '../../../math/la';
import { V, VELL_CUTTER, DRONES } from '../../truth';
import { fieldSet, type Field } from '../c18-eigen/scenes';
import { ptag, sg } from '../c18-eigen/parts';
import { everyLineHolds, fmt2, texSmall } from '../c18-eigen/logic';
import { randMat, sweepScene } from '../c18-eigen/briefing';
import { diagScene } from '../c19-powers/briefing';
import { diagonalisable2 } from '../c19-powers/logic';
import { twoStarts } from './briefing';
import {
  SP_AFTER, SP_CANDIDATES, SP_COORDS, SP_DET, SP_EXP, SP_GRID, SP_LINES, TOTAL, fmtN, fmtV, randChain, spCoordsOk, spDetOk, spForecastOk, spLineOk,
  eigvalsWithMult3, startMattersHolds, triangularHolds,
} from './logic';
import { S } from './script';

const v3 = (v: readonly number[]): V3 => [v[0], v[1], v[2] ?? 0];

export const sp: PuzzleDef = {
  id: 'c20-sp',
  title: 'Where is Vell’s own cutter after fifty pulses?',
  goal: 'Vell’s pulse $V$ is about to be locked in for fifty repeats. Build the forecast he cannot argue with, one step at a time.',
  subgoals: ['Its three lines that hold', 'The cutter (4, 2, 0) in the grid of those lines', 'The cutter after fifty pulses', 'Volume: per pulse, and after fifty', 'Where the drones he needs would be'],
  hints: [
    'The lines are the ones you found in the line hunt: stretches 1, 0.5 and 0.2.',
    '$(4, 2, 0) = 2(1, 1, 1) + 1(1, -1, 0) + 1(1, 1, -2)$. After fifty pulses: $2\\cdot 1^{50}(1, 1, 1) + 0.5^{50}(\\ldots) + 0.2^{50}(\\ldots) \\approx (2, 2, 2)$.',
    'Volume is multiplied by $\\det V = 1 \\times 0.5 \\times 0.2 = 0.1$ each pulse: $10^{-50}$ after fifty.',
  ],
  par: 9,
  view: '3d',
  onWin: S.spWin,
  async setup(p) {
    void p.g.stage.view3D({ target: [1, 0.8, 0.6], distance: 17, azimuth: -62, elevation: 24 });
    const f: Field = await fieldSet(p.g, { lines: false, cutter: true, n: 700 });
    const done = [false, false, false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; sg(p, i); } };
    const r = p.readout('The fiftieth pulse');
    r.row('V', '$V$', '$\\tfrac{1}{60}\\left[\\begin{smallmatrix} 37 & 7 & 16 \\\\ 7 & 37 & 16 \\\\ 16 & 16 & 28 \\end{smallmatrix}\\right]$');
    r.row('c', 'cutter now', fmtV(VELL_CUTTER), C.white);
    const msgEl = h('div', { class: 'a7-msg' });
    const msg = (t: string, k: '' | 'good' | 'bad' = '') => { msgEl.className = `a7-msg ${k}`; msgEl.innerHTML = inline(t); };
    const stage = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    p.dock().append(stage, msgEl);
    let step = 0;
    let won = false;
    // one animated step at a time: a double click or Enter plus a click must not run a step twice
    let busy = false;
    const next = () => { step++; render(); if (step >= 5 && !won) { won = true; sfx.success(); p.win(); } };

    // 1 · lines
    const found = new Set<number>();
    const lineObjs: InfLine[] = [];
    const pickLine = (c: Vec) => {
      if (step !== 0) return;
      p.move();
      const i = SP_LINES.findIndex(([w]) => spLineOk(c) && Math.abs(normalize(c).reduce((s, x, k) => s + x * normalize(w)[k], 0)) > 0.999);
      if (i < 0) { sfx.miss(); msg(`$V$ turns ${fmtV(c)} off its line: $V${fmtV(c)} = ${fmtV(matVec(V, c).map((x) => Math.round(x * 100) / 100))}$.`, 'bad'); return; }
      if (found.has(i)) return;
      found.add(i);
      const L = new InfLine(p.g.stage, [0, 0, 0], normalize(SP_LINES[i][0]) as V3, { color: C.violet, width: 2.4, opacity: 0.8, length: 9 });
      p.add(L.object); p.onDispose(() => L.dispose()); lineObjs.push(L);
      ptag(p, `× ${fmtN(SP_LINES[i][1])}`, v3(normalize(SP_LINES[i][0]).map((x) => x * 5.2)), 'vi');
      sfx.snap();
      if (found.size === 3) { tick(0); r.row('l', 'lines', '(1, 1, 1) ×1 · (1, −1, 0) ×0.5 · (1, 1, −2) ×0.2', C.violet); msg('Three lines. Any arrow with some part along $(1, 1, 1)$ is turned towards it.', 'good'); next(); }
      else render();
    };
    // 2 · coordinates
    const cIn = new VectorInput({ dim: 3, values: [0, 0, 0], label: '\\mathbf c =', step: 1, onSubmit: () => checkC() });
    cIn.el.classList.add('a7-in');
    const path: Arrow[] = [];
    const checkC = async () => {
      if (step !== 1 || busy) return;
      p.move();
      const c = cIn.get();
      if (!spCoordsOk(c)) { sfx.miss(); msg(`${fmtN(c[0])}(1, 1, 1) + ${fmtN(c[1])}(1, −1, 0) + ${fmtN(c[2])}(1, 1, −2) = ${fmtV(matVec(SP_GRID, c))}, not (4, 2, 0).`, 'bad'); return; }
      busy = true;
      let at: Vec = [0, 0, 0];
      for (const [k, [w]] of SP_LINES.entries()) {
        const to = at.map((x, i) => x + c[k] * w[i]);
        const a = new Arrow(v3(at), v3(at), { color: [C.v, C.w, C.u][k], width: 0.06 });
        p.add(a); path.push(a);
        await a.moveTo(v3(to), p.g.headless ? 1 : 500, v3(at));
        at = to;
      }
      tick(1); sfx.snap();
      r.row('cc', 'cutter in that grid', fmtV(SP_COORDS), C.violet);
      msg('$(4, 2, 0) = 2(1, 1, 1) + 1(1, -1, 0) + 1(1, 1, -2)$.', 'good');
      busy = false;
      next();
    };
    // 3 · forecast
    const fIn = new VectorInput({ dim: 3, values: [0, 0, 0], label: 'V^{50}\\mathbf c =', step: 1, onSubmit: () => void checkF() });
    fIn.el.classList.add('a7-in');
    const checkF = async (fast = false) => {
      if (step !== 2 || busy) return;
      p.move();
      const x = fIn.get();
      if (!spForecastOk(x, p.difficulty === 'commander' ? 0.01 : 0.05)) {
        sfx.miss();
        msg(Math.hypot(x[0], x[1], x[2]) < 0.3 ? 'Not the origin: the part along $(1, 1, 1)$ has stretch 1, so it never shrinks.' : 'Stretch each part by its own λ fifty times: $2 \\cdot 1^{50}$, $1 \\cdot 0.5^{50}$, $1 \\cdot 0.2^{50}$.', 'bad');
        return;
      }
      busy = true;
      path.forEach((a) => a.setOpacity(0.25));
      // fifty honest pulses: the field and the cutter, pulse after pulse
      let cur: Mat = identity(3);
      if (!fast) sfx.whoosh(3);
      // (the solver and headless runs skip the frames and land at once)
      if (!fast && !p.g.headless) {
        for (let k = 1; k <= 50; k++) {
          const M0 = cur;
          await animate(60, (t) => { const M = matMul(mlerp(identity(3), V, t), M0); f.set(M); f.cutterAt(matVec(M, VELL_CUTTER)); }, ease.linear);
          cur = mpow(V, k);
        }
      }
      cur = mpow(V, 50);
      f.set(cur); f.cutterAt(SP_AFTER);
      tick(2); sfx.discover();
      r.row('f', 'cutter after fifty', fmtV(SP_AFTER.map((x) => Math.round(x))), C.result);
      msg('The cutter ends at $(2, 2, 2)$: on the line it gathers everything onto.', 'good');
      busy = false;
      next();
    };
    // 4 · volume
    const dIn = h('input', { class: 'cell a7-num', inputmode: 'decimal', 'aria-label': 'volume factor per pulse', placeholder: '?' }) as HTMLInputElement;
    const eIn = h('input', { class: 'cell a7-num', inputmode: 'decimal', 'aria-label': 'power of ten after fifty pulses', placeholder: '?' }) as HTMLInputElement;
    const checkD = () => {
      if (step !== 3) return;
      const dv = parseNum(dIn.value), ev = parseNum(eIn.value);
      if (dv === null || ev === null) return;
      p.move();
      if (!spDetOk(dv)) { sfx.miss(); msg('Volume per pulse is the determinant: the product of the stretches, $1 \\times 0.5 \\times 0.2$.', 'bad'); return; }
      if (Math.abs(ev - SP_EXP) > 1e-9) { sfx.miss(); msg('Fifty pulses multiply the volume by $0.1^{50} = 10^{?}$.', 'bad'); return; }
      tick(3); sfx.snap();
      r.row('d', 'volume', `× ${fmtN(SP_DET)} each pulse · × 10⁻⁵⁰ after fifty`, C.orange);
      msg('A box of volume 1 around the cutter ends with volume $10^{-50}$: flatter than the stern.', 'good');
      next();
    };
    for (const inp of [dIn, eIn]) { inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') checkD(); }); inp.addEventListener('change', checkD); }
    // 5 · the drones
    let drones: Points | null = null;
    const forecastDrones = async (fast = false) => {
      if (step !== 4 || busy) return;
      busy = true;
      p.move();
      const R = rng(77), n = 160, start: Vec[] = [];
      for (let i = 0; i < n; i++) start.push([VELL_CUTTER[0] + (R() - 0.5) * 3, VELL_CUTTER[1] + (R() - 0.5) * 3, VELL_CUTTER[2] + (R() - 0.5) * 2]);
      const pos = new Float32Array(n * 3);
      const geo = new BufferGeometry(); geo.setAttribute('position', new BufferAttribute(pos, 3));
      const mat = new PointsMaterial({ color: new Color('#bfe9ff').multiplyScalar(1.7), size: 0.12, sizeAttenuation: true, transparent: true, depthWrite: false });
      drones = new Points(geo, mat); p.add(drones); p.onDispose(() => { geo.dispose(); mat.dispose(); });
      const put = (M: Mat) => { start.forEach((s, i) => { const q = matVec(M, s); pos[3 * i] = q[0]; pos[3 * i + 1] = q[1]; pos[3 * i + 2] = q[2]; }); (geo.attributes.position as BufferAttribute).needsUpdate = true; };
      put(identity(3));
      await wait(fast || p.g.headless ? 1 : 500);
      await animate(fast || p.g.headless ? 1 : 2400, (t) => put(mpow(V, Math.round(50 * t))), ease.inOut);
      put(mpow(V, 50));
      tick(4); sfx.collapse();
      msg('His drones, his crew, his cutter: all on one line, crushed by $10^{-50}$.', 'good');
      busy = false;
      next();
    };
    const render = () => {
      const items = [
        ['Lines that hold: test the candidates', () => h('div', { class: 'a7-btns' }, ...SP_CANDIDATES.map((c) => button(fmtV(c), () => pickLine(c), { cls: `small ${[...found].some((i) => Math.abs(normalize(SP_LINES[i][0]).reduce((s, x, k) => s + x * normalize(c)[k], 0)) > 0.999) ? 'on' : ''}` })))],
        ['The cutter in the grid of those lines', () => h('div', { class: 'a7-row' }, cIn.el, button('Walk it', () => void checkC(), { cls: 'primary small' }))],
        ['Forecast: the cutter after fifty pulses', () => h('div', { class: 'a7-row' }, fIn.el, button('Run fifty pulses', () => void checkF(), { cls: 'primary small' }))],
        ['Volume', () => h('div', { class: 'a7-row' }, h('span', { class: 'k' }, 'each pulse ×'), dIn, h('span', { class: 'k' }, 'after fifty × 10^'), eIn)],
        ['The drones he needs, around his cutter', () => h('div', { class: 'a7-btns' }, button('Forecast his drones', () => void forecastDrones(), { cls: 'primary small' }))],
      ] as [string, () => HTMLElement][];
      const list = h('div', { class: 'a7-checks' }, ...items.map(([t], i) => h('div', { class: i < step ? 'ok' : '' }, `${i < step ? '✓' : i === step ? '▸' : '·'} ${t}`)));
      stage.replaceChildren(list, step < 5 ? items[step][1]() : h('span'));
    };
    render();
    msg('Test the candidate lines through the Anchor.');
    const solveAll = async (fast: boolean) => {
      for (const [w] of SP_LINES) { pickLine(w); if (!fast) await wait(300); }
      cIn.set(SP_COORDS); await checkC();
      fIn.set([2, 2, 2]); await checkF(fast);
      dIn.value = '0.1'; eIn.value = String(SP_EXP); checkD();
      await forecastDrones(fast);
    };
    return {
      showMe: () => solveAll(false),
      solve: () => solveAll(true),
      async wrong() { for (const [w] of SP_LINES) pickLine(w); cIn.set(SP_COORDS); await checkC(); fIn.set([0, 0, 0]); await checkF(true); },
    };
  },
};

// ------------------------------------------------------------------ Act VII Review (Vell)

const texFree = (M: Mat) => `(${M.map((r) => r.map((x) => fmtN(x)).join(', ')).join('; ')})`;

/** (F) "Every real matrix has a real eigenvector." */
const vellReal: DoubtDef = {
  id: 'c20-r-real', who: 'vell', isTrue: false,
  claim: 'Every real matrix has a real eigenvector. Something must hold still.',
  reason: 'A turn holds nothing still except the origin. The quarter turn $\\left[\\begin{smallmatrix} 0 & -1 \\\\ 1 & 0 \\end{smallmatrix}\\right]$ has $\\det(A - \\lambda I) = \\lambda^2 + 1$: no real root, eigenvalues $\\pm i$, no real eigenvector.',
  goal: 'Drag the grid arrows to set a move; the sweep shows every line it keeps. **Challenge it** or **Back it**.',
  view: '2d',
  setup(p) {
    const sc = sweepScene(p, [[2, 1], [1, 2]]);
    const edges: Mat[] = [[[0, -1], [1, 0]], [[1, -2], [1, -1]]];
    return {
      holds: () => everyLineHolds(sc.mv.get()),
      describe: () => { const M = sc.mv.get(); return everyLineHolds(M) ? `$A$ = ${texFree(M)} has a real eigenvector` : `$A$ = ${texFree(M)} turns every arrow: no real eigenvector`; },
      async play() { await sc.sweep.animateSweep(p.g.headless ? 20 : 2400); },
      randomize(r, edge) { sc.set(edge !== undefined ? edges[edge] : randMat(r)); },
      edgeCases: edges.length,
      async showMe(stance) { await sc.to(stance === 'challenge' ? [[0, -1], [1, 0]] : [[2, 1], [1, 2]], 900); await sc.sweep.animateSweep(p.g.headless ? 20 : 2400); },
    };
  },
};

/** (F) "Every matrix can be diagonalised." */
const vellDiag: DoubtDef = {
  id: 'c20-r-diag', who: 'vell', isTrue: false,
  claim: 'Every matrix can be diagonalised. Pick the right grid and any move is only stretches.',
  reason: 'The shear $\\left[\\begin{smallmatrix} 1 & 1 \\\\ 0 & 1 \\end{smallmatrix}\\right]$ keeps one line, so there is no second eigenvector to make a grid with: geometric multiplicity 1, algebraic multiplicity 2. A turn has no real eigenvector at all.',
  goal: 'Drag the grid arrows. When there are two independent lines that hold, they are drawn as a violet grid. **Challenge it** or **Back it**.',
  view: '2d',
  setup(p) {
    const sc = diagScene(p, [[2, 1], [1, 2]], 'Diagonalisable?');
    const edges: Mat[] = [[[1, 1], [0, 1]], [[0, -1], [1, 0]]];
    return {
      holds: () => diagonalisable2(sc.mv.get()),
      describe: () => { const M = sc.mv.get(); return `$A$ = ${texFree(M)} is ${diagonalisable2(M) ? '' : 'not '}diagonalisable`; },
      randomize(r, edge) { sc.mv.set(edge !== undefined ? edges[edge] : randMat(r)); sc.paint(sc.mv.get()); },
      edgeCases: edges.length,
      async showMe(stance) { await sc.mv.to(stance === 'challenge' ? [[1, 1], [0, 1]] : [[2, 1], [1, 2]], 900); },
    };
  },
};

/** (T) "The steady state of a regular chain does not depend on the start." */
const vellStart: DoubtDef = {
  id: 'c20-r-start', who: 'vell', isTrue: true,
  claim: 'The steady state of a regular chain does not depend on where you start.',
  reason: 'In a regular chain every eigenvalue except 1 is smaller than 1 in size. Write the start as the steady state plus parts along the other eigenvectors: those parts shrink away, whatever the start was.',
  goal: 'Drag the two starts. **Back it** (Vell will shake in other regular chains and starts) or **Challenge it**.',
  view: '2d',
  setup(p) {
    const sc = twoStarts(p, DRONES, [0, 0, TOTAL], [TOTAL, 0, 0]);
    const split = (r: () => number): Vec => { const x = [rint(r, 0, 10), rint(r, 0, 10), rint(r, 0, 10)]; const s = x.reduce((a, b) => a + b, 0) || 1; return x.map((t) => (t / s) * TOTAL); };
    return {
      holds: () => !startMattersHolds(sc.P, sc.a, sc.b),
      describe: () => `two starts under the chain ${texFree(sc.P.map((r) => r.map((x) => Math.round(x * 100) / 100)))} end at the same arrangement`,
      randomize(r) { sc.set(split(r), split(r), randChain(r, 3, 1)); },
      edgeCases: 0,
      async showMe() { sc.set([0, 0, TOTAL], [TOTAL, 0, 0], DRONES); },
    };
  },
};

/** (T) "The eigenvalues of a triangular matrix are on its diagonal." */
const vellTri: DoubtDef = {
  id: 'c20-r-tri', who: 'vell', isTrue: true,
  claim: 'The eigenvalues of a triangular matrix are the numbers on its diagonal.',
  reason: '$A - \\lambda I$ is still triangular, and a triangular determinant is the product down its diagonal: $(a_{11} - \\lambda)(a_{22} - \\lambda)(a_{33} - \\lambda)$. It is zero exactly when λ is a diagonal entry.',
  goal: 'Type an upper triangular matrix (the zeros below the diagonal stay). The readout compares its eigenvalues with its diagonal. **Back it** (Vell will shake it) or **Challenge it**.',
  view: '3d',
  setup(p) {
    void p.g.stage.view3D({ target: [0, 0, 0], distance: 13, azimuth: -50, elevation: 24 });
    let U: Mat = [[3, 1, 2], [0, -1, 4], [0, 0, 2]];
    const lat = new Lattice3D(p.g.stage, { extent: 2, opacity: 0.22 });
    p.add(lat);
    const r = p.readout('Triangular');
    const scale = (M: Mat) => { const m = Math.max(1, ...M.flat().map(Math.abs)); return M.map((row) => row.map((x) => x / m)); };
    const paint = () => {
      lat.set(scale(U));
      // from det(A − λI) = 0, with multiplicity: a repeated diagonal entry shows every copy
      const ev = eigvalsWithMult3(U).map((x) => Math.round(x * 1000) / 1000);
      r.row('m', '$A$', `$${texSmall(U)}$`);
      r.row('d', 'its diagonal', [U[0][0], U[1][1], U[2][2]].slice().sort((a, b) => b - a).map(fmtN).join(', '), C.result);
      r.row('e', 'its eigenvalues', ev.map((x) => fmt2(x)).join(', '), C.violet);
    };
    const locked = [[false, false, false], [true, false, false], [true, true, false]];
    const mi = new MatrixInput({ rows: 3, cols: 3, values: U, locked, label: 'A =', step: 1, onChange: (m) => { U = m.map((row, i) => row.map((x, j) => (j < i ? 0 : x))); paint(); } });
    mi.el.classList.add('a7-in');
    p.dock().append(mi.el);
    paint();
    const rand = (rr: () => number): Mat => [[rint(rr, -4, 4), rint(rr, -4, 4), rint(rr, -4, 4)], [0, rint(rr, -4, 4), rint(rr, -4, 4)], [0, 0, rint(rr, -4, 4)]];
    const edges: Mat[] = [[[2, 5, 1], [0, 2, 3], [0, 0, 2]], [[0, 1, 0], [0, 0, 1], [0, 0, 0]]];
    return {
      holds: () => triangularHolds(U),
      describe: () => `$A$ = ${texFree(U)}: diagonal ${[U[0][0], U[1][1], U[2][2]].map(fmtN).join(', ')}`,
      randomize(rr, edge) { U = edge !== undefined ? edges[edge] : rand(rr); mi.set(U); paint(); },
      edgeCases: edges.length,
      async showMe() { U = [[3, 1, 2], [0, -1, 4], [0, 0, 2]]; mi.set(U); paint(); },
    };
  },
};

export const review: ReviewDef = {
  id: 'c20-review', who: 'vell', title: 'Act VII Review',
  claims: [vellReal, vellStart, vellDiag, vellTri],
};

