// Chapter 16 puzzles 5–7: bend profiles are vectors too (the rate-of-bend matrix), why kept +
// flattened = columns (six matrices and the Shake), and completing a set of arrows to reach all of 3-D.
import type { PuzzleDef, PuzzleCtx, V3 } from '../../../game/types';
import { Lattice3D, Parallelepiped } from '../../../gfx/shapes';
import { VectorHandle } from '../../../kit/handle';
import { StepWorksheet, TileOrder, type Step } from '../../../kit/steps';
import { MatrixInput } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { tex } from '../../../../lib/md';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { rng } from '../../../game/lawcheck';
import { col, det, fromCols, rrefNum, transpose, type Mat } from '../../../math/la';
import { GlowLine, Room, Sheet, tv } from '../c15-nullspace/space';
import { Counter } from './counter';
import { COL_COLORS } from './puzzles';
import {
  D, P2_A, P5_DET, P5_LANDS, P5_NULL, P5_PROFILE, P5_RATE, P5_SET, P6_DECOYS, P6_LAST, P6_TILES, P7_GIVEN, fmtN, fmtV, freeArrows, len,
  p6Argument, p6Matrix, p6OrderOk, p7Won, pivotCols, profileAt, tagsOk, type Diff, type Tag,
} from './logic';
import { S } from './script';

const d = (p: PuzzleCtx) => p.difficulty as Diff;

// ------------------------------------------------------------------ p5 [H] Strut bend profiles are vectors too

function plotSvg(): { el: SVGSVGElement; draw(p: readonly number[], q: readonly number[] | null): void } {
  const NS = 'http://www.w3.org/2000/svg';
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('class', 'act5-plot');
  el.setAttribute('viewBox', '0 0 300 120');
  const t0 = -1, t1 = 2, y0 = -8, y1 = 11;
  const X = (t: number) => ((t - t0) / (t1 - t0)) * 290 + 5;
  const Y = (y: number) => 115 - ((y - y0) / (y1 - y0)) * 110;
  const ax = document.createElementNS(NS, 'path');
  ax.setAttribute('class', 'ax');
  ax.setAttribute('d', `M5 ${Y(0)} H295 M${X(0)} 5 V115`);
  const pp = document.createElementNS(NS, 'path'); pp.setAttribute('class', 'p');
  const qq = document.createElementNS(NS, 'path'); qq.setAttribute('class', 'd');
  el.append(ax, pp, qq);
  const path = (c: readonly number[]) => Array.from({ length: 61 }, (_, i) => { const t = t0 + ((t1 - t0) * i) / 60; return `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(profileAt(c, t)).toFixed(1)}`; }).join(' ');
  return {
    el,
    draw(p, q) { pp.setAttribute('d', path(p)); qq.setAttribute('d', q ? path(q) : ''); },
  };
}

export const p5: PuzzleDef = {
  id: 'c16-p5',
  title: 'Is a bend profile a vector too?',
  goal: 'A bend profile $a + bt + ct^2$ is stored as $(a, b, c)$. The rate-of-bend rule sends it to $b + 2ct$. Build the rule’s **matrix** from where $1$, $t$ and $t^2$ land, then use it.',
  subgoals: ['The matrix of the rate-of-bend rule', 'Apply it, and find the profiles it flattens', 'Check a new set of three profiles'],
  hints: [
    'The rate of bend of $1$ is $0$; of $t$ is $1$; of $t^2$ is $2t$. As numbers $(a, b, c)$: $(0, 0, 0)$, $(1, 0, 0)$, $(0, 2, 0)$. Those are the columns.',
    '$D(5, -3, 2) = 5(0,0,0) - 3(1,0,0) + 2(0,2,0) = (-3, 4, 0)$: the profile $-3 + 4t$. Constant profiles $(a, 0, 0)$ have no bend rate.',
    '$1 + t \\to (1, 1, 0)$, $t + t^2 \\to (0, 1, 1)$, $1 + t^2 \\to (1, 0, 1)$. The determinant of those columns is $1 \\cdot 1 + 1 \\cdot 1 = 2$, not 0.',
  ],
  par: 10,
  view: '3d',
  onWin: S.p5Win,
  setup(p) {
    const room = new Room(p, { extent: 2, scale: 1.2, names: ['a', 'b', 'c'], title: 'profiles as numbers (a, b, c)' });
    void p.g.stage.view3D({ target: [0.3, 0.3, 0.6], distance: 11.5, azimuth: -58, elevation: 22, ms: 0 });
    const lat = new Lattice3D(p.g.stage, { extent: 2, color: '#59e1ff', opacity: 0.16 });
    lat.object.scale.setScalar(room.s);
    p.add(lat);
    // the basis arrows are 1, t and t² until they land; only then are they D(1), D(t), D(t²)
    const names = ['$D(1)$', '$D(t)$', '$D(t^2)$'];
    const basis = [0, 1, 2].map((j) => room.arrow([0, 1, 2].map((k) => (k === j ? 1 : 0)), { color: COL_COLORS[j], label: ['$1$', '$t$', '$t^2$'][j] }));
    const nul = new GlowLine(room, P5_NULL, { half: 2.6 });
    nul.setOpacity(0);
    const r = p.readout('Strut bend');
    const plot = plotSvg();
    r.el.appendChild(plot.el);
    r.note(`$\\htmlClass{c-green}{p(t) = 5 - 3t + 2t^2}$, dashed: its rate of bend`);
    plot.draw(P5_PROFILE, null);
    const flags = [false, false, false];
    const landing = async (ms: number) => {
      await Promise.all([
        lat.to(D, ms),
        ...basis.map((a, j) => animate(ms, (k) => room.setArrow(a, [0, 1, 2].map((i) => (i === j ? 1 : 0) + (P5_LANDS[j][i] - (i === j ? 1 : 0)) * k)), ease.inOut)),
      ]);
      basis.forEach((a, j) => { a.setLabel(names[j]); a.setOpacity(len(P5_LANDS[j]) > 1e-9 ? 1 : 0); });
    };
    // cadet and navigator watch the basis land first; commander builds the matrix without it
    const intro = d(p) === 'commander' ? Promise.resolve() : (async () => { await wait(700); await landing(2000); })();
    const steps: Step[] = [
      { prompt: 'Where does $1$ land? (its rate of bend, as $(a, b, c)$)', answer: P5_LANDS[0], mistakes: [[[1, 0, 0], 'A constant does not bend at a rate: its rate is 0.']] },
      { prompt: 'Where does $t$ land?', answer: P5_LANDS[1] },
      { prompt: 'Where does $t^2$ land?', answer: P5_LANDS[2], mistakes: [[[0, 0, 2], 'The rate of $t^2$ is $2t$: that is $b = 2$, stored second.'], [[2, 0, 0], 'The rate of $t^2$ is $2t$, not 2: the 2 goes with $t$.']] },
      { prompt: 'So the rule’s matrix $D$ is', answer: D, mistakes: [[transpose(D), 'The columns are where $1$, $t$ and $t^2$ land, not the rows.']] },
      { prompt: '$D$ applied to $5 - 3t + 2t^2$, as numbers:', answer: P5_RATE, mistakes: [[[-3, 2, 0], 'The $t^2$ part gives $2 \\cdot 2 = 4$ in the $t$ slot.']] },
      { prompt: 'A profile with no rate of bend, first number 1:', answer: P5_NULL },
      { prompt: 'Determinant of the columns for $1 + t$, $t + t^2$, $1 + t^2$:', answer: P5_DET, mistakes: [[0, 'Those columns are $(1, 1, 0)$, $(0, 1, 1)$, $(1, 0, 1)$. Expand along the first row: $1 \\cdot 1 - 0 + 1 \\cdot 1$.']] },
    ];
    // A worksheet on Commander checks only its last row. D, its action, its null space and the basis check
    // must each be right before the subgoals tick, so on Commander each of them ends a sheet of its own;
    // where 1, t and t² land stays the player's own unchecked working above D.
    const groups = d(p) === 'commander' ? [[0, 1, 2, 3], [4], [5], [6]] : [[0, 1, 2, 3, 4, 5, 6]];
    const stack = h('div', { class: 'ws-stack', style: 'display:flex;flex-direction:column;gap:8px' });
    p.dock().appendChild(stack);
    let pending = groups.length;
    const sheets = groups.map((g, k) => {
      const ws = new StepWorksheet(p, {
        steps: g.map((i) => steps[i]),
        mount: stack,
        title: d(p) === 'commander' ? 'By hand · only D and the answers below it are checked' : undefined,
        onDone: () => { if (--pending === 0) void finish(); },
      });
      if (k) ws.el.querySelector('.kicker')?.remove();
      return ws;
    });
    const finish = async () => {
      flags.forEach((_, i) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); } });
      sfx.success();
      p.win();
      if (d(p) === 'commander') await landing(900);
      else await intro;
      ['$1 + t$', '$t + t^2$', '$1 + t^2$'].forEach((label, j) => { const a = room.arrow(col(P5_SET, j), { color: C.white, width: 0.03, opacity: 0.6, label }); void a.grow(500); });
      void nul.fadeIn(800);
      plot.draw(P5_PROFILE, P5_RATE);
      r.note(`$\\htmlClass{c-green}{5 - 3t + 2t^2}$ has rate of bend $\\htmlClass{c-yellow}{-3 + 4t}$. The constant profiles, $${tv('(a, 0, 0)')}$, are flattened.`);
    };
    return {
      async showMe() { for (const ws of sheets) await ws.showMe(380); },
      solve() { sheets.forEach((ws) => ws.solve()); },
      wrong() { sheets.forEach((ws) => ws.wrong()); },
    };
  },
};

// ------------------------------------------------------------------ p6 [D] Why kept + flattened = columns

const matTex = (A: Mat, piv: number[] | null) => {
  const n = A[0].length;
  const cell = (x: number, j: number) => {
    const s = fmtN(x).replace('−', '-');
    if (!piv) return s;
    return piv.includes(j) ? `\\htmlClass{c-yellow}{${s}}` : `\\htmlClass{c-learn}{${s}}`;
  };
  return `\\begin{bmatrix}${A.map((row) => row.slice(0, n).map((x, j) => cell(x, j)).join(' & ')).join(' \\\\ ')}\\end{bmatrix}`;
};

export const p6: PuzzleDef = {
  id: 'c16-p6',
  title: 'Why does kept + flattened always make the columns?',
  goal: 'For six matrices, tag every column **kept** (a pivot: one new output direction) or **flattened** (free: one arrow to the origin). Edit any matrix you like, or let the Shake deal one.',
  subgoals: ['Six matrices tagged right', 'The argument in order'],
  hints: [
    'Look at the reduced form beside the matrix. Each column either holds a pivot or it does not.',
    'Click a slot to cycle: kept, flattened, empty. Kept = pivot column. Flattened = free column: set that variable to 1 and the others free to 0 for one arrow to the origin.',
    'Every column is one or the other, never both: so kept + flattened is the number of columns, every time.',
  ],
  par: 30,
  view: '3d',
  onWin: S.p6Win,
  setup(p) {
    const R = rng(1606);
    const diff = d(p);
    // Cadet watches the argument; Navigator types it for one of its six matrices; Commander puts it in
    // order and types the last line for a matrix of a new shape.
    const flags = [false, false];
    const tick = (i: number) => {
      if (!flags[i]) { flags[i] = true; p.subgoal(i); }
      if (flags.every(Boolean) && !p.won) p.win();
    };
    let round = 0;
    let A: Mat = p6Matrix(0, R);
    // the reduced form's pivots are coloured on Cadet; otherwise only once the tags are checked right
    let reveal = false;
    // the latest matrix tagged right that has a free column (Navigator's argument is about it)
    let lastFree: Mat | null = null;
    const room = new Room(p, { origin: [2.2, 0, 0], extent: 3, scale: 0.55, title: 'the columns' });
    void p.g.stage.view3D({ target: [1.2, 0.3, 1.1], distance: 12.5, azimuth: -74, elevation: 18, ms: 0 });
    const arrows = [0, 1, 2, 3, 4].map((j) => room.arrow([0, 0, 0], { color: COL_COLORS[j], label: `$\\mathbf a_${j + 1}$` }));
    const r = p.readout('Matrix and its reduced form');
    const counter = new Counter({ n: A[0].length, rows: A.length, clickable: diff !== 'cadet', title: 'Tag each column' });
    const roundEl = h('div', { class: 'kicker' });
    const msg = h('div', { class: 'act5-msg' });
    const eq = h('div', { class: 'eq' });
    r.el.append(roundEl, eq, counter.el);
    let mi: MatrixInput;
    const show = () => {
      const { R: RR, pivots } = rrefNum(A);
      eq.innerHTML = tex(`A = ${matTex(A, null)} \;\\to\; ${matTex(RR, diff === 'cadet' || reveal ? pivots : null)}`, false);
      roundEl.textContent = `Matrix ${Math.min(round + 1, 6)} of 6 · ${A.length} × ${A[0].length}`;
      arrows.forEach((a, j) => {
        const on = A.length === 3 && j < A[0].length;
        if (on) room.setArrow(a, col(A, j));
        a.setOpacity(on && len(col(A, j)) > 1e-9 ? 1 : 0);
      });
    };
    const load = (M: Mat) => {
      A = M.map((x) => x.slice());
      reveal = false;
      counter.reshape(A[0].length, A.length);
      mi = new MatrixInput({ rows: A.length, cols: A[0].length, values: A, label: 'A =', step: 1, onChange: (m) => { A = m; reveal = false; counter.set(new Array(A[0].length).fill(null)); show(); } });
      matBox.replaceChildren(mi.el);
      show();
    };
    const matBox = h('div', { class: 'act5-small' });
    let driving = false;
    const check = () => {
      if (round >= 6) return;
      p.move();
      const tags = counter.tags();
      if (!tagsOk(A, tags)) {
        sfx.miss();
        const piv = pivotCols(A);
        const wrongAt = tags.findIndex((t, j) => t !== (piv.includes(j) ? 'kept' : 'flat'));
        msg.className = 'act5-msg bad';
        msg.innerHTML = inline(tags.some((t) => t === null) ? 'Tag every column first.' : `Column ${wrongAt + 1} ${piv.includes(wrongAt) ? 'holds a pivot: it keeps a direction' : 'has no pivot: it is free, so it is flattened'}.`);
        return;
      }
      const k = counter.kept, f = counter.flat;
      reveal = true;
      show();
      if (f) lastFree = A.map((x) => x.slice());
      round++;
      // the sixth matrix's arrows are left for Navigator's typed argument to find
      const list = f && !(round >= 6 && diff === 'navigator');
      msg.className = 'act5-msg good';
      msg.innerHTML = inline(`${k} kept + ${f} flattened = ${A[0].length} columns. ${list ? `Arrows to the origin: ${freeArrows(A).map((v) => fmtV(v)).join(', ')}.` : f ? '' : 'Nothing flattened.'}`);
      sfx.success();
      if (round >= 6) { tick(0); done(); return; }
      if (!driving) { const at = round; window.setTimeout(() => { if (round === at && round < 6) load(p6Matrix(round, R)); }, p.g.headless ? 0 : 900); }
    };
    const reduceBtn = button('Tag from the reduced form', () => { const piv = pivotCols(A); counter.set(A[0].map((_, j) => (piv.includes(j) ? 'kept' : 'flat') as Tag)); }, { cls: 'small' });
    reduceBtn.hidden = diff !== 'cadet';
    const btns = h('div', { class: 'act5-btns' }, reduceBtn, button('Check tags', check, { cls: 'primary small' }), button('Shake: deal a new matrix', () => { p.move(); load(p6Matrix(round + 2 + Math.floor(R() * 6), R)); }, { cls: 'small ghost' }));
    p.dock().append(matBox, btns, msg);
    load(A);
    let tiles: TileOrder | null = null;
    let ws: StepWorksheet | null = null;
    let ordered = false, typed = false;
    const both = () => { if (ordered && typed) { sfx.success(); tick(1); } };
    const done = () => {
      if (diff === 'cadet') { tick(1); return; }
      if (diff === 'navigator') {
        // the argument, typed for the last matrix with a free column (the scanner matrix if none had one)
        A = (lastFree ?? P2_A).map((x) => x.slice());
        const piv = pivotCols(A);
        counter.reshape(A[0].length, A.length);
        counter.set(A[0].map((_, j) => (piv.includes(j) ? 'kept' : 'flat') as Tag));
        show();
        roundEl.textContent = `Why it adds up · this ${A.length} × ${A[0].length}`;
        msg.className = 'act5-msg good';
        msg.innerHTML = inline('Six matrices tagged right. Now the reason, step by step, for the matrix shown with its reduced form.');
        const g = p6Argument(A);
        const flipped = g.arrow.map((x, i) => (piv.includes(i) && Math.abs(x) > 1e-12 ? -x : x));
        const steps: Step[] = [
          { prompt: 'Columns of the reduced form that hold a pivot, so the rank:', answer: g.rank, mistakes: A.length !== g.rank ? [[A.length, 'That counts rows. Count the columns that hold a pivot.']] : [] },
          {
            prompt: `Column ${g.freeCol + 1} is free. Set $x_{${g.freeCol + 1}} = 1$${g.nullity > 1 ? ' and the other free variables to 0' : ''}. The arrow $A$ sends to the origin:`,
            answer: g.arrow, tol: 0.01,
            mistakes: flipped.some((x, i) => x !== g.arrow[i]) ? [[flipped, `Each pivot variable is **minus** its row’s entry in column ${g.freeCol + 1} of the reduced form.`]] : [],
          },
          { prompt: 'Free columns, one arrow to the origin each, so the nullity:', answer: g.nullity },
          { prompt: 'Every column is one or the other, never both. Rank + nullity:', answer: g.n, mistakes: A.length !== g.n ? [[A.length, 'That is the number of rows. Count the columns.']] : [] },
        ];
        const box = h('div', {});
        ws = new StepWorksheet(p, { steps, mount: box, title: 'Why it adds up, for this matrix · each step is checked', onDone: () => { sfx.success(); tick(1); } });
        p.dock().replaceChildren(msg, box);
        return;
      }
      const tm = h('div', {});
      const tmsg = h('div', { class: 'act5-msg' });
      tiles = new TileOrder(p, {
        mount: tm, tiles: P6_TILES, decoys: P6_DECOYS, title: 'Now the argument, in order', submitLabel: 'Check order',
        onSubmit: (o) => {
          p.move();
          if (p6OrderOk(o)) { ordered = true; tmsg.className = 'act5-msg good'; tmsg.textContent = 'That is the argument.'; sfx.snap(); both(); }
          else {
            sfx.miss();
            tmsg.className = 'act5-msg bad';
            tmsg.textContent = o.includes('x1') ? 'Zero rows are not free variables: the scanner matrix had one zero row and two free columns.' : '';
            if (!o.includes('x1')) p.bark('lantern', 'Reduce first. Count pivots, count free columns, then add.');
          }
        },
      });
      ws = new StepWorksheet(p, {
        mount: h('div'), title: 'The last line',
        steps: [{
          prompt: `A ${P6_LAST.m} × ${P6_LAST.n} matrix has rank ${P6_LAST.rank}. Its nullity:`, answer: P6_LAST.nullity,
          mistakes: [[P6_LAST.m - P6_LAST.rank, 'That counts zero rows. The free variables are the columns without a pivot.'], [P6_LAST.n - P6_LAST.m, 'That is columns minus rows. The pivots, not the rows, decide which columns are free.']],
        }],
        onDone: () => { typed = true; both(); },
      });
      p.dock().replaceChildren(tm, tmsg, ws.el);
    };
    const autoRound = async (ms: number) => {
      driving = true;
      const piv = pivotCols(A);
      counter.set(A[0].map((_, j) => (piv.includes(j) ? 'kept' : 'flat') as Tag));
      if (ms) await wait(ms);
      check();
      if (round < 6) load(p6Matrix(round, R));
      driving = false;
    };
    const argue = async (ms: number) => {
      if (tiles && !ordered) { tiles.set(P6_TILES.map((x) => x.id)); (tiles.el.querySelector('.btn.primary') as HTMLButtonElement).click(); }
      if (ws && !ws.done) { if (ms) await ws.showMe(ms); else ws.solve(); }
    };
    return {
      async showMe() { while (round < 6) await autoRound(450); await argue(380); },
      async solve() { while (round < 6) await autoRound(0); await argue(0); },
      wrong() { counter.set(A[0].map(() => 'kept' as Tag)); check(); },
    };
  },
};

// ------------------------------------------------------------------ p7 [S] Complete the set

export const p7: PuzzleDef = {
  id: 'c16-p7',
  title: 'Which third arrow reaches everything?',
  style: 'mastery',
  goal: 'The two thrusters push along $(1, 0, 1)$ and $(0, 1, 1)$: together they reach one plane. Drag the **blue** arrow so the three of them reach **every** point of space.',
  subgoals: ['Three arrows that reach all of 3-D'],
  hints: [
    'The box the three arrows make has volume 0 while the blue arrow lies on the plane. Lift it off.',
    'Any arrow off the plane $z = x + y$ works. Hold **Shift** to drag it up or down.',
    '$(0, 0, 1)$: straight up.',
  ],
  par: 2,
  view: '3d',
  onWin: S.p7Win,
  setup(p) {
    const room = new Room(p, { extent: 3 });
    void p.g.stage.view3D({ target: [0.4, 0.4, 0.8], distance: 11.5, azimuth: -58, elevation: 20, ms: 0 });
    const plane = new Sheet(room, [1, 1, -1], { color: C.result, size: 6, opacity: 0.12 });
    plane.setOpacity(0.6);
    P7_GIVEN.forEach((v, i) => room.arrow(v, { color: [C.v, C.w][i], label: `$${fmtV(v).replace(/−/g, '-')}$` }));
    const box = new Parallelepiped(p.g.stage, P7_GIVEN[0], P7_GIVEN[1], [1, 1, 2], { color: C.result, opacity: 0.14 });
    p.add(box);
    const lat = new Lattice3D(p.g.stage, { extent: 2, color: '#59e1ff', opacity: 0.0 });
    p.add(lat);
    lat.setOpacity(0);
    const r = p.readout('Three arrows');
    let v: V3 = [1, 1, 2];
    const draw = () => {
      box.set(P7_GIVEN[0], P7_GIVEN[1], v);
      const vol = det(fromCols([...P7_GIVEN, v]));
      r.row('v', 'blue arrow', fmtV(v), C.u);
      r.row('d', 'volume of their box', fmtN(vol), Math.abs(vol) > 1e-9 ? C.result : '#ffb347');
      r.row('r', 'they reach', Math.abs(vol) > 1e-9 ? 'every point' : 'one plane only');
    };
    const hnd = new VectorHandle(p, {
      to: v, color: C.u, label: '$\\mathbf u$', limit: 3,
      onChange: (t) => { v = t; draw(); },
      onCommit: () => check(),
    });
    const check = () => {
      if (p.won) return;
      if (p7Won(v)) {
        sfx.success();
        void animate(900, (k) => lat.setOpacity(k * 0.9), ease.out);
        p.subgoal(0);
        p.win();
      } else p.bark('lantern', 'Still on the plane. The box is flat.');
    };
    draw();
    return {
      async showMe() { await hnd.moveTo([0, 0, 1], 900); },
      solve() { hnd.set([0, 0, 1]); v = [0, 0, 1]; draw(); check(); },
      wrong() { hnd.set([2, -1, 1]); v = [2, -1, 1]; draw(); check(); },
    };
  },
};

