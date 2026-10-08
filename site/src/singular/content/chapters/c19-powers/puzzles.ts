// Chapter 19 puzzles 1–3: forecast fifty pulses from the grid of lines that hold (p1), fifty pulses written
// as three moves with the inner pairs cancelling (p2 [D]), and diagonalising by hand (p3 [H] [X8]).
import { BufferAttribute, BufferGeometry, Color, Points, PointsMaterial, Vector3 } from 'three';
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { InfLine } from '../../../gfx/shapes';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { VectorInput } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { tex } from '../../../../lib/md';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { rng } from '../../../game/lawcheck';
import { identity, matMul, matVec, mlerp, type Mat, type Vec } from '../../../math/la';
import { LineGrid, ptag, v3, sg } from '../c18-eigen/parts';
import { hideLandingLine } from '../c18-eigen/puzzles';
import { fmt2, texSmall } from '../c18-eigen/logic';
import {
  P1_FORECAST, P1_PULSES, P1_START, P2_D, P2_DECOYS, P2_ORDER, P2_P, P2_PINV, P2_TILES, P2_V50, P3_A, P3_C, P3_D, P3_P, P3_PINV,
  P3_RESULT, P3_SUB_D4, V2, cancelPairs, fmtN, fmtV, forecast2, p1Won, repeatFactors, type Factor,
} from './logic';
import { S } from './script';
import './c19.css';

const tolOf = (p: PuzzleCtx) => (p.difficulty === 'commander' ? 0.01 : 0.05);

/** A cloud of debris points on the plane, moved by a matrix from where it started. */
export class Cloud2D {
  readonly points: Points;
  private readonly pos: Float32Array;
  readonly start: Vec[];
  M: Mat = identity(2);
  constructor(p: PuzzleCtx, o: { n?: number; r?: number; seed?: number; color?: string } = {}) {
    const n = o.n ?? 260, R = o.r ?? 3.2, r = rng(o.seed ?? 19);
    this.start = [];
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = R * Math.sqrt(r()); this.start.push([d * Math.cos(a) + 0.6, d * Math.sin(a) + 0.4]); }
    this.pos = new Float32Array(n * 3);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(this.pos, 3));
    const mat = new PointsMaterial({ color: new Color(o.color ?? '#c9b49a').multiplyScalar(1.3), size: 0.075, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false });
    this.points = new Points(geo, mat);
    p.add(this.points);
    p.onDispose(() => { geo.dispose(); mat.dispose(); });
    this.set(identity(2));
  }
  set(M: Mat): void {
    this.M = M;
    this.start.forEach((s, i) => { const q = matVec(M, s); this.pos[3 * i] = q[0]; this.pos[3 * i + 1] = q[1]; this.pos[3 * i + 2] = 0.005; });
    (this.points.geometry.attributes.position as BufferAttribute).needsUpdate = true;
  }
}

/** The grid of lines that hold for V₂: (1, 1) and (1, −1), violet dashed. */
const eigenGrid = (p: PuzzleCtx, P: Mat, opacity = 0.55) => { const g = new LineGrid(p.g.stage, P, { half: 7, n: 10, opacity }); p.add(g); return g; };

// ------------------------------------------------------------------ p1 · press five times

export const p1: PuzzleDef = {
  id: 'c19-p1',
  title: 'Where is this piece after fifty pulses?',
  goal: `The yellow piece starts at **${fmtV(P1_START)}**. Press the pulse a few times if you like. Then put the **forecast** marker where it will be after **fifty** pulses, and run them.`,
  subgoals: ['Place the forecast for fifty pulses', 'Run fifty pulses and land on it'],
  predict: {
    prompt: `The pulse keeps $(1, 1)$ with stretch 1 and $(1, -1)$ with stretch 0.5. Where is ${fmtV(P1_START)} after fifty pulses?`,
    choices: [{ id: 'o', text: '$(0, 0)$: at the Anchor' }, { id: 'r', text: '$(2, 2)$' }, { id: 's', text: '$(3, 1)$: it stays' }, { id: 'f', text: 'Far away along $(1, 1)$' }],
    answer: 'r',
    reveal: '$(2, 2)$. In the grid of lines that hold, $(3, 1) = 2\\cdot(1, 1) + 1\\cdot(1, -1)$. Each pulse keeps the first part and halves the second, so after fifty the second part is $0.5^{50}$: nothing you could see.',
  },
  hints: [
    'Turn on **re-grid**: the violet dashed lines are the grid of lines that hold. Count the piece’s steps along each.',
    '$(3, 1) = 2\\cdot(1, 1) + 1\\cdot(1, -1)$. The first part is stretched by 1 every pulse, the second by 0.5.',
    'After fifty pulses: $2\\cdot(1, 1) + 0.5^{50}\\cdot(1, -1) \\approx (2, 2)$.',
  ],
  par: 3,
  onWin: S.p1Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view2D({ center: [1.6, 1.2], height: 8.6, ms: 0 });
    const grid = p.grid({ main: 0.32, base: 0.08, axis: 0.5 });
    hideLandingLine(grid);
    const cloud = new Cloud2D(p);
    const eg = eigenGrid(p, P2_P, 0.5);
    let regrid = d === 'cadet';
    eg.object.visible = regrid;
    const piece = new Dot(v3(P1_START, 0.04), { color: C.result, size: 0.12 });
    const trail = new FatLine(p.g.stage, [v3(P1_START, 0.02), v3(P1_START, 0.02)], { color: C.result, width: 1.6, opacity: 0.6, dashed: true, dashSize: 0.08, gapSize: 0.06 });
    p.add(piece, trail.object); p.onDispose(() => trail.dispose());
    const pt = ptag(p, `start ${fmtV(P1_START)}`, v3(P1_START), 'y', [0, 26]);
    // the forecast marker: drag it or type it
    let marker: Vec | null = null;
    const ring = new Arrow([4, -1, 0.06], [4, -1, 0.06], { color: C.accent, handle: true });
    const mdot = new Dot([4, -1, 0.06], { color: C.accent, size: 0.1 });
    const mt = ptag(p, 'forecast', [4, -1, 0], '', [0, -24]);
    p.add(ring, mdot);
    let k = 0, cur: Vec = P1_START.slice(), won = false, busy = false;
    const path: V3[] = [v3(P1_START, 0.02)];
    const r = p.readout('Pulses');
    const msgEl = h('div', { class: 'a7-msg' });
    const msg = (t: string, kind: '' | 'good' | 'bad' = '') => { msgEl.className = `a7-msg ${kind}`; msgEl.innerHTML = inline(t); };
    const paint = () => {
      r.row('k', 'pulses so far', String(k), C.accent);
      r.row('x', 'the piece', `(${fmt2(cur[0])}, ${fmt2(cur[1])})`, C.result);
      if (regrid) {
        const c1 = (cur[0] + cur[1]) / 2, c2 = (cur[0] - cur[1]) / 2;
        r.row('c', 'in the grid of lines that hold', `${fmt2(c1)}·(1, 1) + ${c2 < 1e-3 && c2 > 0 ? c2.toExponential(1).replace('e', '×10^') : fmt2(c2)}·(1, −1)`, C.violet);
      } else r.hideRow('c');
      r.row('f', 'your forecast', marker ? `(${fmt2(marker[0])}, ${fmt2(marker[1])})` : 'not placed', C.accent);
    };
    const placeMarker = (q: Vec) => {
      marker = [q[0], q[1]];
      ring.set(v3(q, 0.06), v3(q, 0.06)); mdot.at(v3(q, 0.06)); mt.at(v3(q)); mt.set(`forecast ${fmtV(marker.map((x) => Math.round(x * 100) / 100))}`);
      input.set(marker);
      if (!won) sg(p, 0, true);
      paint();
      gates();
    };
    const input = new VectorInput({ dim: 2, values: [4, -1], label: '\\text{forecast} =', step: p.snap() ?? 0.25, onSubmit: (q) => { p.move(); placeMarker(q); } });
    input.el.classList.add('a7-in');
    p.g.drag.add({
      target: ring.grab, getPos: () => new Vector3(...(marker ? v3(marker, 0.06) : v3([4, -1], 0.06))), snap: () => p.snap(), planar: true,
      constrain: (q) => new Vector3(Math.max(-3, Math.min(6, q.x)), Math.max(-3, Math.min(5, q.y)), 0.06),
      onMove: (q) => { ring.set([q.x, q.y, 0.06], [q.x, q.y, 0.06]); mdot.at([q.x, q.y, 0.06]); mt.at([q.x, q.y, 0]); },
      onEnd: () => { p.move(); placeMarker([ring.to.x, ring.to.y]); },
    });
    /** One honest pulse: every point slides from x to V₂x in a straight line (stretches 1 and 1 → 0.5, never flat). */
    const pulse = async (ms: number) => {
      const M0 = cloud.M;
      const from = cur.slice();
      if (ms > 1) sfx.whoosh(ms / 1000);
      await animate(ms, (t) => { const Mt = mlerp(identity(2), V2, t); cloud.set(matMul(Mt, M0)); const q = matVec(Mt, from); piece.at(v3(q, 0.04)); }, ease.inOut);
      cloud.set(matMul(V2, M0));
      cur = matVec(V2, from);
      k++;
      piece.at(v3(cur, 0.04));
      path.push(v3(cur, 0.02));
      trail.setPoints(path);
      pt.at(v3(cur)); pt.set(k ? `after ${k}` : `start ${fmtV(P1_START)}`);
      paint();
    };
    const run = async (n: number, msEach: number) => {
      if (busy || won) return;
      if (k + n > P1_PULSES) n = P1_PULSES - k;
      if (n <= 0) return;
      busy = true;
      p.move();
      for (let i = 0; i < n; i++) await pulse(msEach);
      busy = false;
      if (k >= P1_PULSES) finish();
    };
    /** The same pulses with no animation (solver and headless Show me): one redraw at the end. */
    const jump = (n: number) => {
      if (busy || won) return;
      n = Math.min(n, P1_PULSES - k);
      if (n <= 0) return;
      p.move();
      let M = cloud.M;
      for (let i = 0; i < n; i++) { M = matMul(V2, M); cur = matVec(V2, cur); k++; path.push(v3(cur, 0.02)); }
      cloud.set(M);
      piece.at(v3(cur, 0.04));
      trail.setPoints(path);
      pt.at(v3(cur)); pt.set(`after ${k}`);
      paint();
      if (k >= P1_PULSES) finish();
    };
    const finish = () => {
      cur = forecast2(P1_START, P1_PULSES);
      if (!marker) { msg('Fifty pulses run. Place a forecast first next time: it is the forecast that counts.', 'bad'); return; }
      if (p1Won(marker, k, tolOf(p))) {
        won = true; sg(p, 1); sfx.success();
        msg(`The piece is at ${fmtV(P1_FORECAST)}: on your forecast.`, 'good');
        p.win();
      } else {
        sfx.miss();
        const gapLine = new FatLine(p.g.stage, [v3(marker, 0.05), v3(cur, 0.05)], { color: C.orange, width: 3, opacity: 0.9 });
        p.add(gapLine.object); p.onDispose(() => gapLine.dispose());
        msg(`The piece ended at ${fmtV(P1_FORECAST)}. Your forecast was ${fmtV(marker.map((x) => Math.round(x * 100) / 100))}. ${Math.hypot(marker[0], marker[1]) < 0.3 ? 'The (1, 1) part has stretch 1: it never shrinks.' : 'Write the start in the grid of lines that hold first.'}`, 'bad');
        p.bark('lantern', `Fifty pulses: ${fmtV(P1_FORECAST)}. Forecast off by ${fmt2(Math.hypot(marker[0] - P1_FORECAST[0], marker[1] - P1_FORECAST[1]))}.`);
        reset(false);
      }
    };
    const reset = (clear = true) => {
      k = 0; cur = P1_START.slice(); cloud.set(identity(2)); piece.at(v3(cur, 0.04)); path.splice(1); trail.setPoints([path[0], path[0]]);
      pt.at(v3(cur)); pt.set(`start ${fmtV(P1_START)}`);
      if (clear) msg('');
      paint(); gates();
    };
    const b1 = button('Pulse once', () => void run(1, 700), { cls: 'small' });
    const b5 = button('Five pulses', () => void run(5, 380), { cls: 'small' });
    const b50 = button('Run to fifty', () => void run(P1_PULSES, 60), { cls: 'primary small' });
    const bReset = button('Reset', () => { if (!busy) reset(); }, { cls: 'small ghost' });
    const reg = button('Re-grid: lines that hold', () => { regrid = !regrid; eg.object.visible = regrid; reg.classList.toggle('on', regrid); paint(); }, { cls: 'small ghost' });
    reg.classList.toggle('on', regrid);
    const gates = () => {
      // commander: forecasts are committed blind (no pulses before the forecast is placed)
      const blind = d === 'commander' && !marker;
      b1.disabled = blind; b5.disabled = blind; b50.disabled = blind;
    };
    p.dock().append(h('div', { class: 'a7-row' }, input.el, button('Place forecast', () => { p.move(); placeMarker(input.get()); }, { cls: 'small' })),
      h('div', { class: 'a7-btns' }, b1, b5, b50, bReset, reg), msgEl);
    msg(d === 'commander' ? 'Commit the forecast first: the pulses unlock once it is placed.' : 'Drag the cyan ring, or type the forecast and place it.');
    paint(); gates();
    return {
      async showMe() {
        if (!regrid) reg.click();
        await ring.moveTo(v3(P1_FORECAST, 0.06), 800);
        placeMarker(P1_FORECAST);
        if (p.g.headless) jump(P1_PULSES); else await run(P1_PULSES, 50);
      },
      solve() { placeMarker(P1_FORECAST); jump(P1_PULSES); },
      wrong() { placeMarker([0, 0]); jump(P1_PULSES); },
    };
  },
};

// ------------------------------------------------------------------ p2 [D] · fifty as three moves

const FTEX: Record<Factor, string> = { P: 'P', D: 'D', Pi: 'P^{-1}', I: 'I' };

/** The rail of factors as DOM chips, with the cancelling animated (each P⁻¹P pair turns to I, then vanishes). */
class FactorStrip {
  readonly el: HTMLElement;
  private chips: { f: Factor; el: HTMLElement }[] = [];
  constructor(private factors: Factor[], private readonly more: boolean) {
    this.el = h('div', { class: 'c19-strip' });
    this.render();
  }
  private render(): void {
    this.chips = this.factors.map((f) => ({ f, el: h('span', { class: `c19-chip ${f}`, html: tex(FTEX[f]) }) }));
    const parts: HTMLElement[] = [];
    let i = 0;
    for (const c of this.chips) { if (i > 0 && i % 3 === 0 && this.factors.length > 4) parts.push(h('span', { class: 'c19-dot' }, '·')); parts.push(c.el); i++; }
    if (this.more) parts.push(h('span', { class: 'c19-more' }, '⋯ fifty copies'));
    this.el.replaceChildren(...parts);
  }
  /** Turn each side-by-side P⁻¹P into I, then remove the I's and gather the D's. */
  async cancel(ms: number): Promise<void> {
    for (let i = 0; i + 1 < this.chips.length; i++) {
      if (this.chips[i].f === 'Pi' && this.chips[i + 1].f === 'P') {
        this.chips[i].el.classList.add('pair'); this.chips[i + 1].el.classList.add('pair');
        sfx.tick(i);
        await wait(ms);
        this.chips[i].el.innerHTML = tex('I'); this.chips[i + 1].el.classList.add('gone');
        this.chips[i].el.classList.add('id');
        await wait(ms * 0.6);
      }
    }
    await wait(ms);
    this.factors = cancelPairs(this.factors);
    const nD = this.factors.filter((f) => f === 'D').length;
    this.chips = [];
    this.el.replaceChildren(
      h('span', { class: 'c19-chip P', html: tex('P') }),
      h('span', { class: 'c19-chip D big', html: tex(this.more ? 'D^{50}' : `D^{${nD}}`) }),
      h('span', { class: 'c19-chip Pi', html: tex('P^{-1}') }),
    );
    sfx.snap();
  }
}

export const p2: PuzzleDef = {
  id: 'c19-p2',
  title: 'Why are fifty pulses only three moves?',
  goal: 'Write the pulse as three moves, $V = PDP^{-1}$: into the grid of lines that hold, stretch, back out. Fifty pulses put fifty copies on the rail. **Cancel** what sits in the middle and play what is left.',
  subgoals: ['Cancel every $P^{-1}P$ in the middle', 'Where the formula comes from', 'Play $PD^{50}P^{-1}$ on the cloud'],
  hints: [
    'Next to each other, $P^{-1}P = I$: translating into the grid and straight back out does nothing.',
    'With the middle gone, the $D$’s stand together: $D\\,D \\cdots D = D^{50} = \\begin{bmatrix} 1 & 0 \\\\ 0 & 0.5^{50} \\end{bmatrix}$.',
    '$V^{50} = PD^{50}P^{-1} \\approx \\begin{bmatrix} 0.5 & 0.5 \\\\ 0.5 & 0.5 \\end{bmatrix}$: every point lands on the line $(1, 1)$.',
  ],
  par: 5,
  onWin: S.p2Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view2D({ center: [1.0, 0.6], height: 8.6, ms: 0 });
    const grid = p.grid({ main: 0.3, base: 0.08, axis: 0.5 });
    hideLandingLine(grid);
    const cloud = new Cloud2D(p, { seed: 23 });
    eigenGrid(p, P2_P, 0.5);
    for (const [dir, lab] of [[[1, 1], 'λ = 1'], [[1, -1], 'λ = 0.5']] as [Vec, string][]) ptag(p, lab, v3(dir.map((x) => x * 3.2)), 'vi', [0, -16]);
    const r = p.readout('Fifty pulses');
    r.row('P', '$P$ (columns: lines that hold)', `$${texSmall(P2_P)}$`, C.violet);
    r.row('D', '$D$ (their stretches)', `$${texSmall(P2_D)}$`, C.violet);
    r.row('V', '$V^{50} = PD^{50}P^{-1}$', '?', C.result);
    const strip = new FactorStrip(repeatFactors(3), true);
    const msgEl = h('div', { class: 'a7-msg' });
    const msg = (t: string, kind: '' | 'good' | 'bad' = '') => { msgEl.className = `a7-msg ${kind}`; msgEl.innerHTML = inline(t); };
    const done = [false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; sg(p, i); } };
    let derived = d === 'cadet', cancelled = false, played = false, busy = false;
    const winCheck = () => { if (cancelled && derived && played && !p.won) { sfx.success(); msg('Fifty pulses, three moves. Every piece lands on the line $(1, 1)$.', 'good'); p.win(); } };
    const cancelBtn = button('Cancel the middle pairs', () => void cancel(p.g.headless ? 1 : 520), { cls: 'primary small' });
    const cancel = async (ms: number) => {
      if (cancelled || busy) return;
      busy = true; p.move();
      await strip.cancel(ms);
      cancelled = true; busy = false; tick(0);
      if (d === 'cadet') tick(1);   // cadet watches the cancelling: that is where the formula comes from
      cancelBtn.disabled = true;
      msg('Each $P^{-1}P$ in the middle is $I$. What is left: $PD^{50}P^{-1}$.', 'good');
      if (derived) await play(p.g.headless ? 1 : 2600);
    };
    /** P D⁵⁰ P⁻¹, played honestly: the (1, −1) part of every point shrinks smoothly from 1 to 0.5⁵⁰. */
    const play = async (ms: number) => {
      if (played || !cancelled || !derived) return;
      played = true;
      if (ms > 1) sfx.whoosh(ms / 1000);
      await animate(ms, (t) => { const s = 0.5 ** (50 * t); cloud.set(matMul(matMul(P2_P, [[1, 0], [0, s]]), P2_PINV)); }, ease.inOut);
      cloud.set(P2_V50);
      r.row('V', '$V^{50} = PD^{50}P^{-1}$', `$${texSmall(P2_V50.map((row) => row.map((x) => Math.round(x * 1000) / 1000)))}$`, C.result);
      tick(2);
      winCheck();
    };
    const box = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    let ws: StepWorksheet | null = null, tiles: TileOrder | null = null, last: StepWorksheet | null = null;
    let submitTiles: ((o: string[]) => void) | null = null;
    const onDerived = () => { derived = true; tick(1); if (cancelled) void play(p.g.headless ? 1 : 2600); winCheck(); };
    if (d === 'navigator') {
      ws = new StepWorksheet(p, {
        title: 'Where the formula comes from · each step is checked', mount: box, onDone: onDerived,
        steps: [
          { prompt: '$P$: the lines that hold as columns, stretch 1 first', answer: P2_P, mistakes: [[[[1, 1], [-1, 1]], 'Columns, not rows: the first column is $(1, 1)$, the second $(1, -1)$.']] as [Mat, string][] },
          { prompt: '$D$: the stretches, in the same order', answer: P2_D, mistakes: [[[[0.5, 0], [0, 1]], 'Same order as the columns of $P$: 1 first.']] as [Mat, string][] },
          { prompt: '$P^{-1}$', answer: P2_PINV },
          { prompt: '$V^{50} = PD^{50}P^{-1}$ (round $0.5^{50}$ to 0)', answer: [[0.5, 0.5], [0.5, 0.5]], tol: 1e-6 },
        ],
      });
    } else if (d === 'commander') {
      const submit = (o: string[]) => {
        p.move();
        if (o.join() !== P2_ORDER.join()) { sfx.miss(); msg('Not in that order. Start from one pulse, $V = PDP^{-1}$, and repeat it.', 'bad'); return; }
        sfx.snap(); msg('Right. Now the last line.', 'good');
        if (!last) last = new StepWorksheet(p, { title: 'The last line · only the answer is checked', mount: box, onDone: onDerived, steps: [{ prompt: '$V^{50} = PD^{50}P^{-1}$ (round $0.5^{50}$ to 0)', answer: [[0.5, 0.5], [0.5, 0.5]], tol: 1e-6 }] });
      };
      submitTiles = submit;
      tiles = new TileOrder(p, { tiles: P2_TILES, decoys: P2_DECOYS, mount: box, title: 'Why A^k = P D^k P⁻¹: put the reason in order', submitLabel: 'Check the order', onSubmit: submit });
    }
    r.el.append(h('div', { class: 'a7-kick' }, 'Fifty pulses on the rail'), strip.el, h('div', { class: 'a7-btns' }, cancelBtn));
    p.dock().append(box, msgEl);
    msg(d === 'cadet' ? 'Press **Cancel the middle pairs** and watch what is left.' : 'Cancel the middle, and show where the formula comes from.');
    const derive = async (fast: boolean) => {
      if (ws) { if (fast) ws.solve(); else await ws.showMe(380); }
      if (tiles) {
        tiles.set(P2_ORDER);
        submitTiles?.(P2_ORDER);
        const lw = last as StepWorksheet | null;
        if (lw) { if (fast) lw.solve(); else await lw.showMe(300); }
      }
    };
    return {
      async showMe() { await cancel(520); await derive(false); await play(2600); },
      async solve() { await cancel(1); await derive(true); await play(1); },
    };
  },
};

// ------------------------------------------------------------------ p3 [H] [X8] · diagonalise by hand

export const p3: PuzzleDef = {
  id: 'c19-p3',
  title: 'Where does (1, 1) go after ten repeats?',
  goal: 'By hand: write $A = \\begin{bmatrix} 3 & 1 \\\\ 0 & 2 \\end{bmatrix}$ as $PDP^{-1}$, put $(1, 1)$ in the grid of lines that hold, and take **one power per direction** for $A^{10}(1, 1)$. Then the same for last chapter’s 3 × 3.',
  subgoals: ['$P$, $D$ and $P^{-1}$', '$A^{10}(1, 1)$ with one power per direction', 'The 3 × 3: $A^4$ in its own grid'],
  hints: [
    '$A$ is triangular: its stretches are 3 and 2. $A - 3I = \\begin{bmatrix} 0 & 1 \\\\ 0 & -1 \\end{bmatrix}$ keeps $(1, 0)$; $A - 2I = \\begin{bmatrix} 1 & 1 \\\\ 0 & 0 \\end{bmatrix}$ keeps $(1, -1)$.',
    '$P = \\begin{bmatrix} 1 & 1 \\\\ 0 & -1 \\end{bmatrix}$ is its own inverse. $P^{-1}(1, 1) = (2, -1)$: $(1, 1) = 2(1, 0) - 1(1, -1)$.',
    '$A^{10}(1, 1) = 2\\cdot 3^{10}(1, 0) - 2^{10}(1, -1) = (117074, 1024)$. The 3 × 3 has stretches 2, 5, −5: $D^4 = \\mathrm{diag}(16, 625, 625)$.',
  ],
  par: 7,
  onWin: S.p3Win,
  setup(p) {
    void p.g.stage.view2D({ center: [0.9, 0.2], height: 7.4, ms: 0 });
    const grid = p.grid({ main: 0.4, base: 0.1, axis: 0.6 });
    hideLandingLine(grid);
    grid.set(P3_A);
    for (const [dir, lab] of [[[1, 0], 'λ = 3 · (1, 0)'], [[1, -1], 'λ = 2 · (1, −1)']] as [Vec, string][]) {
      const L = new InfLine(p.g.stage, [0, 0, 0.002], v3(dir), { color: C.violet, width: 1.8, opacity: 0.55, dashed: true });
      p.add(L.object); p.onDispose(() => L.dispose());
      ptag(p, lab, v3(dir.map((x) => x * 3.4 / Math.hypot(dir[0], dir[1]))), 'vi', [0, -18]);
    }
    const x = new Dot([1, 1, 0.04], { color: C.result, size: 0.1 });
    p.add(x);
    ptag(p, '(1, 1)', [1, 1, 0], 'y', [44, 4]);
    const a1 = new Arrow([0, 0, 0.02], [0, 0, 0.02], { color: C.v, width: 0.045, label: `$${fmtN(P3_C[0])}\\,\\mathbf p_1$` });
    const a2 = new Arrow([0, 0, 0.02], [0, 0, 0.02], { color: C.w, width: 0.045, label: `$${fmtN(P3_C[1])}\\,\\mathbf p_2$` });
    p.add(a1, a2);
    a1.setOpacity(0); a2.setOpacity(0);
    const r = p.readout('One power per direction');
    const paint = (n: number) => {
      r.row('P', '$P$', n >= 1 ? `$${texSmall(P3_P)}$` : '?', C.violet);
      r.row('D', '$D$', n >= 2 ? `$${texSmall(P3_D)}$` : '?', C.violet);
      r.row('c', '$(1, 1)$ in that grid', n >= 4 ? fmtV(P3_C) : '?', C.result);
      r.row('x', '$A^{10}(1, 1)$', n >= 5 ? fmtV(P3_RESULT) : '?', C.result);
    };
    paint(0);
    let drawn = false;
    const drawPath = async () => {
      if (drawn) return; drawn = true;
      const m1 = [P3_C[0] * P3_P[0][0], P3_C[0] * P3_P[1][0]];
      a1.setOpacity(1); a2.setOpacity(1);
      await a1.moveTo(v3(m1, 0.02), p.g.headless ? 1 : 600);
      a2.set(v3(m1, 0.02), v3(m1, 0.02));
      await a2.moveTo([1, 1, 0.02], p.g.headless ? 1 : 600, v3(m1, 0.02));
      sfx.snap();
    };
    const done = [false, false, false];
    const tick = (i: number) => { if (!done[i]) { done[i] = true; sg(p, i); } };
    const STEPS = [
      { prompt: '$P$: lines that hold as columns (λ = 3 first; first entries 1)', answer: P3_P, mistakes: [[[[1, 0], [1, -1]], 'Columns, not rows: $(1, 0)$ is the first column.']] as [Mat, string][] },
      { prompt: 'The diagonal of $D$, in the same order', answer: [P3_D[0][0], P3_D[1][1]], mistakes: [[[2, 3], 'Same order as the columns of $P$: 3 first.']] as [Vec, string][] },
      { prompt: '$P^{-1}$', answer: P3_PINV, mistakes: [[[[1, 1], [0, 1]], 'Check: $P P^{-1}$ must be $I$. Here $P$ is its own inverse.']] as [Mat, string][] },
      { prompt: '$(1, 1)$ in the grid of lines that hold: $P^{-1}(1, 1)$', answer: P3_C, mistakes: [[[1, 1], 'Those are its numbers in our grid. Multiply by $P^{-1}$.']] as [Vec, string][] },
      { prompt: '$A^{10}(1, 1) = 2\\cdot 3^{10}\\,\\mathbf p_1 - 1\\cdot 2^{10}\\,\\mathbf p_2$', answer: P3_RESULT, mistakes: [[[59049, 1024], 'Two of $\\mathbf p_1$: $2 \\cdot 59049 - 1024$ across.']] as [Vec, string][] },
      { prompt: 'Last chapter’s 3 × 3 has stretches 2, 5, −5. In its own grid, the diagonal of $A^4 = D^4$', answer: [P3_SUB_D4[0][0], P3_SUB_D4[1][1], P3_SUB_D4[2][2]], mistakes: [[[16, 625, -625], '$(-5)^4$: an even power of a negative number is positive.']] as [Vec, string][] },
    ];
    // three short sheets in turn (the dock stays short): P, D, P⁻¹ · the grid and the ten repeats · the 3 × 3
    const STAGES: [number, number, string][] = [[0, 3, 'the move in its own grid'], [3, 5, 'one power per direction'], [5, 6, 'last chapter’s 3 × 3']];
    const box = h('div', { class: 'a7-stage' });
    p.dock().append(box);
    let stage = 0;
    let ws!: StepWorksheet;
    const ok = () => STAGES[stage][0] + ws.el.querySelectorAll('.ws-row.ok').length;
    const watch = () => {
      const n = Math.max(ok(), STAGES[stage][0]);
      paint(n);
      if (n >= 3) tick(0);
      if (n >= 4) void drawPath();
      if (n >= 5) tick(1);
    };
    const open = (k: number) => {
      stage = k;
      box.replaceChildren();
      const [a, b, title] = STAGES[k];
      const mode = p.difficulty === 'cadet' ? 'LANTERN computes, you choose' : p.difficulty === 'navigator' ? 'each step is checked' : 'only the answer is checked';
      ws = new StepWorksheet(p, {
        mount: box,
        title: `By hand ${k + 1}/3 · ${title} · ${mode}`,
        steps: STEPS.slice(a, b),
        onDone: () => {
          paint(b);
          if (b >= 3) tick(0);
          if (b >= 4) void drawPath();
          if (b >= 5) tick(1);
          if (k < STAGES.length - 1) { sfx.snap(); open(k + 1); return; }
          tick(2); r.note('Ten repeats, two powers: $3^{10}$ along $(1, 0)$ and $2^{10}$ along $(1, -1)$.'); p.win();
        },
      });
      ws.el.addEventListener('change', watch);
      ws.el.addEventListener('keyup', watch);
      ws.el.addEventListener('click', () => window.setTimeout(watch, 30));
    };
    open(0);
    return {
      async showMe() { while (!p.won) { const k = stage; await ws.showMe(420); watch(); if (stage === k && !p.won) break; } },
      solve() { for (let i = 0; i < STAGES.length && !p.won; i++) ws.solve(); },
      wrong() { ws.wrong(); },
    };
  },
};

