// Chapter 24 puzzles 1–4: the brace lines of a symmetric panel and why they meet at right angles (p1 [D]),
// turning the survey grid until the mixed term vanishes (p2), bowl or saddle with a rolling probe (p3),
// and orthogonally diagonalising a 3 × 3 with a repeated eigenvalue, by hand (p4 [H]).
import { Group } from 'three';
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { FatLine } from '../../../gfx/lines';
import { InfLine, PlanePatch } from '../../../gfx/shapes';
import { Knob, RightAngle } from '../../../kit/geom';
import { StepWorksheet, TileOrder, type Step } from '../../../kit/steps';
import { Slider } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { rng } from '../../../game/lawcheck';
import { dot, normalize, type Mat } from '../../../math/la';
import { LineHunt } from '../c18-eigen/parts';
import { Surface, ptag, tag, v3 } from './act9';
import {
  P1_DECOYS, P1_NONSYM, P1_NONSYM_LINES, P1_ORDER, P1_S, P1_TILES, P2_S, P3_BOWL, P3_SADDLE, P4_S,
  RIM, SHAPE_WORD, fmt2, fmtN, fmtV, formIn, lineDeg, lines2, p2Zero, p3EscapeWon, p3SettleWon, rad, randSym2,
  shapeOf, symEig, texM, type Shape,
} from './logic';
import { S } from './script';

const tolDeg = (p: PuzzleCtx) => (p.difficulty === 'cadet' ? 3 : p.difficulty === 'navigator' ? 2 : 1);

/** A message line in the dock. */
export function msgLine(): { el: HTMLElement; say: (t: string, k?: '' | 'good' | 'bad') => void } {
  const el = h('div', { class: 'a9-msg' });
  return { el, say: (t, k = '') => { el.className = `a9-msg ${k}`; el.innerHTML = inline(t); } };
}

/** A short checklist of stages (ticked as they are done). */
export function checklist(items: string[]): { el: HTMLElement; tick: (i: number) => void } {
  const rows = items.map((t) => h('div', null, '○ ', h('span', { html: inline(t) })));
  const el = h('div', { class: 'a9-checks' }, ...rows);
  return { el, tick: (i) => { const r = rows[i]; if (r && !r.classList.contains('ok')) { r.classList.add('ok'); r.firstChild!.textContent = '✓ '; } } };
}

// ------------------------------------------------------------------ p1 [D] · stress lines, and why they are perpendicular

export const p1: PuzzleDef = {
  id: 'c24-p1',
  title: 'Where does the stress push straight along the arrow?',
  goal: 'Turn the green test arrow $\\mathbf x$ round. $S\\mathbf x$ is yellow. **Lock** each brace line, where $S\\mathbf x$ lies on the line of $\\mathbf x$, with its stress. Then Bram shakes it, and you build the reason.',
  subgoals: ['Lock both brace lines, with their stress', 'Bram shakes five symmetric panels', 'Where the right angle comes from'],
  predict: {
    prompt: 'The panel’s matrix $\\begin{bmatrix} 3 & 1 \\\\ 1 & 3 \\end{bmatrix}$ is symmetric. What angle will its two brace lines make?',
    choices: [{ id: '90', text: 'A right angle' }, { id: '45', text: '45°' }, { id: 'any', text: 'It depends on the numbers' }],
    answer: '90',
    reveal: 'A right angle: $(1, 1)$ and $(1, -1)$. For a symmetric matrix this happens every time, and the puzzle ends with the reason.',
  },
  hints: [
    'Watch the small arc between $\\mathbf x$ and $S\\mathbf x$. It closes on a brace line.',
    'Try $\\mathbf x$ along the diagonal: $S(1, 1) = (4, 4)$, four times $(1, 1)$.',
    'Lock $(1, 1)$ with stress 4 and $(1, -1)$ with stress 2. The reason: $\\lambda(\\mathbf v\\cdot\\mathbf w) = (S\\mathbf v)\\cdot\\mathbf w = \\mathbf v\\cdot(S\\mathbf w) = \\mu(\\mathbf v\\cdot\\mathbf w)$.',
  ],
  par: 6,
  onWin: S.p1Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view2D({ center: [0.9, 0], height: 9.2, ms: 0 });
    p.grid({ main: 0.2, base: 0, axis: 0.42 });
    const ck = checklist(['Both brace lines', 'Bram’s shake', 'The reason']);
    const msg = msgLine();
    const done = [false, false, false];
    let won = false;
    const tick = (i: number) => { if (!done[i]) { done[i] = true; p.subgoal(i); ck.tick(i); } if (done.every(Boolean) && !won) { won = true; sfx.success(); p.win(); } };
    const r = p.readout('Panel one');
    r.row('S', '$S$', `$${texM(P1_S)}$`);
    // braces drawn along locked lines
    const braceG = new Group();
    p.add(braceG);
    let mark: RightAngle | null = null;
    const drawBraces = () => {
      for (const c of [...braceG.children]) { c.removeFromParent(); (c.userData.dispose as (() => void) | undefined)?.(); }
      const dirs = hunt.locks.map((l) => normalize(l.dir));
      dirs.forEach((u, i) => {
        const L = new FatLine(p.g.stage, [v3(u.map((x) => -3.4 * x), -0.01), v3(u.map((x) => 3.4 * x), -0.01)], { color: '#c9d4e6', width: 9, intensity: 1, opacity: 0.22 });
        void i;
        L.object.userData.dispose = () => L.dispose();
        braceG.add(L.object);
      });
      if (dirs.length === 2 && !mark) {
        mark = new RightAngle(p, [0, 0, 0.01], v3(dirs[0]), v3(dirs[1]), 0.34, { color: C.white, opacity: 0.85 });
        ptag(p, `${Math.round(lineDeg(dirs[0], dirs[1]))}°`, v3(normalize([dirs[0][0] + dirs[1][0], dirs[0][1] + dirs[1][1]]).map((x) => x * 0.85)), '', [0, 0]);
      }
    };
    const hunt: LineHunt = new LineHunt(p, {
      M: P1_S, radius: 1.3, tolDeg: tolDeg(p), mode: d === 'commander' ? 'typed' : 'drag', autoLock: d === 'cadet',
      typedStretch: d !== 'cadet', stretchTol: d === 'commander' ? 0.01 : 0.05, title: 'Brace lines', labels: { x: '$\\mathbf x$', mx: '$S\\mathbf x$' },
      onChange: () => { drawBraces(); if (hunt.done && !done[0]) { tick(0); void shake(); } },
    });

    // ---- stage 2: Bram shakes five symmetric panels, then the λ-dial matrix from Chapter 18
    const shakeG = new Group();
    p.add(shakeG);
    let shaking: Promise<void> | null = null;
    const showPair = (M: Mat, kind: 'ok' | 'bad') => {
      for (const c of [...shakeG.children]) { c.removeFromParent(); (c.userData.dispose as (() => void) | undefined)?.(); }
      const L = lines2(M);
      if (!L) return;
      L.forEach((u, i) => {
        const line = new InfLine(p.g.stage, [0, 0, 0.02], v3(u), { color: kind === 'ok' ? [C.v, C.w][i] : C.orange, width: 2.6, opacity: 0.9, length: 7 });
        line.object.userData.dispose = () => line.dispose();
        shakeG.add(line.object);
      });
      const ang = lineDeg(L[0], L[1]);
      const tg = tag(`${Math.round(ang)}°`, v3(normalize([L[0][0] + L[1][0], L[0][1] + L[1][1]]).map((x) => x * 1.15)), kind === 'ok' ? '' : 'o');
      tg.object.userData.dispose = () => tg.dispose();
      shakeG.add(tg.object);
      r.row('m', kind === 'ok' ? 'Bram’s panel' : 'Chapter 18’s λ-dial matrix', `$${texM(M)}$`, kind === 'ok' ? C.white : C.orange);
      r.row('a', 'angle between its lines', `${fmt2(ang)}°`, kind === 'ok' ? C.good : C.orange);
    };
    const shake = (): Promise<void> => {
      if (shaking) return shaking;
      shaking = (async () => {
        hunt.sweep.group.visible = false;
        braceG.visible = false;
        const rr = rng(2424);
        msg.say('Bram shakes it: five random symmetric panels.');
        for (let i = 0; i < 5; i++) {
          showPair(randSym2(rr), 'ok');
          sfx.tick(i);
          await wait(p.g.headless ? 5 : 700);
        }
        showPair(P1_NONSYM, 'bad');
        sfx.miss();
        msg.say(`Not symmetric: Chapter 18’s matrix keeps ${fmtV(P1_NONSYM_LINES[0])} and ${fmtV(P1_NONSYM_LINES[1])}, 72° apart. **Five cases were evidence. Now the reason.**`);
        await wait(p.g.headless ? 5 : 1500);
        hunt.sweep.group.visible = true;
        braceG.visible = true;
        for (const c of [...shakeG.children]) { c.removeFromParent(); (c.userData.dispose as (() => void) | undefined)?.(); }
        r.hideRow('m'); r.hideRow('a');
        tick(1);
        startReason();
      })();
      return shaking;
    };

    // ---- stage 3: the reason, by level
    const box = h('div', { class: 'a9-col' });
    let ws: StepWorksheet | null = null, tiles: TileOrder | null = null, last: StepWorksheet | null = null;
    let reasonStarted = false;
    const reasonDone = () => { msg.say('$(\\lambda - \\mu)(\\mathbf v\\cdot\\mathbf w) = 0$ with $\\lambda \\neq \\mu$: so $\\mathbf v\\cdot\\mathbf w = 0$. **Perpendicular, for every symmetric matrix.**', 'good'); tick(2); };
    const steps: Step[] = [
      { prompt: '$S\\mathbf a$ for $\\mathbf a = (2, 1)$', answer: [7, 5] },
      { prompt: '$(S\\mathbf a)\\cdot\\mathbf b$ for $\\mathbf b = (1, 3)$', answer: 22 },
      { prompt: '$\\mathbf a\\cdot(S\\mathbf b)$: the same, because $S^{\\mathsf T} = S$', answer: 22 },
      { prompt: 'The same two numbers for Chapter 18’s $A = \\begin{bmatrix} 4 & 1 \\\\ 2 & 3 \\end{bmatrix}$: $(A\\mathbf a)\\cdot\\mathbf b$, then $\\mathbf a\\cdot(A\\mathbf b)$', answer: [30, 25], mistakes: [[[25, 30], 'First $(A\\mathbf a)\\cdot\\mathbf b$: $A\\mathbf a = (9, 7)$, and $(9, 7)\\cdot(1, 3) = 30$.']] },
      { prompt: 'Brace lines: $4(\\mathbf v\\cdot\\mathbf w) = 2(\\mathbf v\\cdot\\mathbf w)$. So $\\mathbf v\\cdot\\mathbf w =$', answer: 0 },
    ];
    const submitTiles = (o: string[]) => {
      p.move();
      if (o.join() !== P1_ORDER.join()) { sfx.miss(); msg.say('Not in that order. Start from $A\\mathbf v = \\lambda\\mathbf v$, and move $A$ across the dot one step at a time.', 'bad'); return; }
      sfx.snap();
      msg.say('Right. Now the last line.', 'good');
      if (!last) last = new StepWorksheet(p, { title: 'The last line · only the answer is checked', steps: [{ prompt: '$(\\lambda - \\mu)(\\mathbf v\\cdot\\mathbf w) = 0$ with $\\lambda = 4$, $\\mu = 2$: $\\mathbf v\\cdot\\mathbf w =$', answer: 0 }], mount: box, onDone: reasonDone });
    };
    const lines = ['$\\lambda(\\mathbf v\\cdot\\mathbf w) = (S\\mathbf v)\\cdot\\mathbf w$', '$= \\mathbf v\\cdot(S^{\\mathsf T}\\mathbf w)$', '$= \\mathbf v\\cdot(S\\mathbf w)$, because $S^{\\mathsf T} = S$', '$= \\mu(\\mathbf v\\cdot\\mathbf w)$'];
    const startReason = () => {
      if (reasonStarted) return;
      reasonStarted = true;
      hunt.el.style.display = 'none';
      p.dock().append(box);
      if (d === 'cadet') {
        void (async () => {
          for (const l of lines) { box.append(h('div', { class: 'a9-row', html: inline(l) })); sfx.tick(1); await wait(p.g.headless ? 2 : 650); }
          reasonDone();
        })();
      } else if (d === 'navigator') {
        ws = new StepWorksheet(p, { title: 'Where the right angle comes from · each step is checked', steps, mount: box, onDone: reasonDone });
      } else {
        tiles = new TileOrder(p, { tiles: P1_TILES, decoys: P1_DECOYS, mount: box, title: 'Why the brace lines meet at a right angle: put the reason in order', submitLabel: 'Check the order', onSubmit: (o) => submitTiles(o) });
      }
    };
    p.dock().append(ck.el, msg.el);
    if (d === 'commander') msg.say('Type an arrow and test it.');
    const finishReason = async (fast: boolean) => {
      while (!ws && !tiles && d !== 'cadet' && !won) await wait(10);
      if (ws) { if (fast) ws.solve(); else await ws.showMe(320); }
      if (tiles) {
        tiles.set(P1_ORDER);
        submitTiles(P1_ORDER);
        const lw = last as StepWorksheet | null;
        if (lw) { if (fast) lw.solve(); else await lw.showMe(300); }
      }
      while (!won) await wait(10);
    };
    return {
      async showMe() { await hunt.showMe(); await shake(); await finishReason(false); },
      async solve() { await hunt.showMe(10); await shake(); await finishReason(true); },
      wrong() { hunt.lock([1, 0]); },
    };
  },
};

// ------------------------------------------------------------------ p2 · turn the grid

export const p2: PuzzleDef = {
  id: 'c24-p2',
  title: 'In which grid does the mixed term vanish?',
  goal: 'The surface is $E = 2x^2 + 2xy + 2y^2$ over the panel. Turn the **survey grid** (cyan $\\mathbf u$, $\\mathbf v$) until the $uv$ term in $E$ reads **0**.',
  subgoals: ['Turn the grid until the mixed term is 0', 'The matrix of the energy, and its eigenvalues'],
  hints: [
    'The readout writes $E$ in the turned grid. Watch the middle number, the $uv$ term, as you turn.',
    'The surface climbs steepest along one diagonal and most gently along the other. Turn the grid until its axes lie along them.',
    'Turn to 45°: $E = 3u^2 + v^2$. The matrix of $E$ is $\\begin{bmatrix} 2 & 1 \\\\ 1 & 2 \\end{bmatrix}$ (the $2xy$ split in half), with eigenvalues 3 and 1.',
  ],
  par: 3,
  view: '3d',
  onWin: S.p2Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view3D({ target: [0, 0, 0.6], distance: 9.6, azimuth: -62, elevation: 34, ms: 0 });
    const surf = new Surface(p, { S: P2_S, theta: rad(10), gridAxes: true });
    surf.showAxes(d === 'cadet');
    let theta = 10;
    const step = d === 'cadet' ? 5 : d === 'navigator' ? 1 : 0.5;
    const ua = new Arrow([0, 0, 0.01], [1, 0, 0.01], { color: C.accent, width: 0.045, label: '$\\mathbf u$' });
    const va = new Arrow([0, 0, 0.01], [0, 1, 0.01], { color: C.accent, width: 0.045, label: '$\\mathbf v$', opacity: 0.8 });
    p.add(ua, va);
    const r = p.readout('Energy in the turned grid');
    const msg = msgLine();
    const done = [false, d === 'cadet'];
    let won = false;
    const check = () => {
      if (p2Zero(theta)) { if (!done[0]) { done[0] = true; p.subgoal(0); sfx.snap(); msg.say(`No mixed term: $E = ${fmtN(formIn(P2_S, rad(theta)).a)}u^2 + ${fmtN(formIn(P2_S, rad(theta)).c)}v^2$.`, 'good'); } }
      if (done[1]) p.subgoal(1);
      if (done[0] && done[1] && !won) { won = true; sfx.success(); p.win(); }
    };
    const paint = () => {
      const t = rad(theta);
      surf.setTheta(t);
      ua.setTo([1.5 * Math.cos(t), 1.5 * Math.sin(t), 0.01]);
      va.setTo([-1.5 * Math.sin(t), 1.5 * Math.cos(t), 0.01]);
      const f = formIn(P2_S, t);
      const zero = p2Zero(theta);
      r.row('t', 'grid turned by', `${fmtN(Math.round(theta * 10) / 10)}°`, C.accent);
      r.row('e', '$E$', `$${fmt2(f.a)}u^2 ${f.b < 0 ? '-' : '+'} {\\color{${zero ? C.good : C.orange}}${fmt2(Math.abs(f.b))}}\\,uv + ${fmt2(f.c)}v^2$`);
      r.row('b', 'mixed term', fmt2(f.b), zero ? C.good : C.orange);
    };
    const slider = new Slider({ label: 'turn the grid', min: 0, max: 90, step, value: theta, format: (x) => `${fmtN(x)}°`, onInput: (x) => { theta = x; paint(); } });
    slider.el.addEventListener('change', () => { p.move(); check(); });
    p.dock().append(h('div', { class: 'a9-row' }, slider.el), msg.el);
    let ws: StepWorksheet | null = null;
    if (d !== 'cadet') {
      ws = new StepWorksheet(p, {
        title: d === 'navigator' ? 'The energy as a matrix · each step is checked' : 'The energy as a matrix · only the answer is checked',
        steps: [
          { prompt: 'The symmetric matrix of $2x^2 + 2xy + 2y^2$', answer: P2_S, mistakes: [[[[2, 2], [0, 2]], 'Split the $2xy$ in half: 1 above the diagonal and 1 below.'], [[[2, 2], [2, 2]], 'Split the $2xy$ in half: each off-diagonal entry is 1.']] },
          { prompt: 'Its eigenvalues, larger first', answer: [3, 1] },
        ],
        onDone: () => { done[1] = true; check(); },
      });
    }
    paint();
    const goTo = async (x: number, ms: number) => {
      const x0 = theta;
      await animate(ms, (k) => { theta = x0 + (x - x0) * k; slider.set(Math.round(theta / step) * step, false); paint(); }, ease.inOut);
      theta = x; slider.set(x, false); paint();
    };
    return {
      async showMe() { await goTo(45, 1600); p.move(); check(); if (ws) await ws.showMe(400); check(); },
      async solve() { theta = 45; slider.set(45, false); paint(); check(); ws?.solve(); check(); },
      wrong() { theta = 30; slider.set(30, false); paint(); check(); },
    };
  },
};

// ------------------------------------------------------------------ p3 · bowl or saddle

export const p3: PuzzleDef = {
  id: 'c24-p3',
  title: 'Bowl or saddle?',
  goal: '**Panel three**, $\\begin{bmatrix} 1 & 2 \\\\ 2 & 1 \\end{bmatrix}$. Drag the yellow probe to a start and **Release** it. Make it leave the panel along the line $(1, -1)$.',
  subgoals: ['Panel three: the probe escapes along the line (1, −1)', 'Panel four: the probe comes to rest at the lowest point'],
  predict: {
    prompt: 'Every entry of $\\begin{bmatrix} 1 & 2 \\\\ 2 & 1 \\end{bmatrix}$ is positive. What shape is its surface $z = \\mathbf x^{\\mathsf T}S\\mathbf x$?',
    choices: [{ id: 'bowl', text: 'A bowl' }, { id: 'saddle', text: 'A saddle' }, { id: 'cap', text: 'An upside-down bowl' }],
    answer: 'saddle',
    reveal: 'A saddle. Its eigenvalues are 3, along $(1, 1)$, and $-1$, along $(1, -1)$: up one way, down the other. Along $(1, -1)$ the height is $1 - 4 + 1 = -2$.',
  },
  hints: [
    'The surface climbs along one diagonal and falls along the other. A probe rolls downhill.',
    'Start anywhere off the line $(1, 1)$. On that line the probe can balance at the middle.',
    'Start at $(0.6, 0.2)$ and release. Then, on panel four, release the probe anywhere: a bowl brings it to the bottom.',
  ],
  par: 4,
  view: '3d',
  onWin: S.p3Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view3D({ target: [0, 0, 0.2], distance: 10, azimuth: -58, elevation: 30, ms: 0 });
    const surf = new Surface(p, { S: P3_SADDLE, scaleFor: 5, height: 2.2 });
    surf.showAxes(d === 'cadet');
    const r = p.readout('The panel');
    const msg = msgLine();
    let stage: 'saddle' | 'bowl' = 'saddle';
    let busy = false;
    const done = [false, false];
    let won = false;
    let bowlTyped = d === 'cadet';
    let classified = d !== 'commander';
    const paint = () => {
      const M = stage === 'saddle' ? P3_SADDLE : P3_BOWL;
      const e = symEig(M);
      // panel four's matrix, eigenvalues and shape are what its worksheet asks for: hidden until it is done
      const hideBowl = stage === 'bowl' && !bowlTyped;
      r.row('m', '$S$', hideBowl ? '?' : `$${texM(M)}$`);
      if (classified && !hideBowl) r.row('l', 'eigenvalues', e.values.map(fmtN).join(' and '), C.result);
      else r.row('l', 'eigenvalues', '?');
      r.row('s', 'shape', classified && !hideBowl ? SHAPE_WORD[shapeOf(M)] : '?');
    };
    // the probe's start: a knob on the floor
    const knob = new Knob(p, [0.9, 1.0, 0.02], { color: C.result, size: 0.08, planar: true, constrain: (q) => { const l = Math.hypot(q.x, q.y); const s = l > RIM * 0.85 ? (RIM * 0.85) / l : 1; q.set(q.x * s, q.y * s, 0.02); return q; }, onMove: (x) => surf.place(x), countMoves: true });
    surf.place(knob.pos);
    const release = async () => {
      if (busy || won || !classified) return;
      if (stage === 'bowl' && !bowlTyped) { msg.say('First the matrix of the form and its eigenvalues.', 'bad'); sfx.miss(); return; }
      busy = true;
      p.move();
      knob.setEnabled(false);
      sfx.whoosh(1.2);
      const res = await surf.release(knob.pos.slice(0, 2), 900, p.g.headless);
      busy = false;
      knob.setEnabled(true);
      if (stage === 'saddle') {
        if (p3EscapeWon(res)) {
          done[0] = true; p.subgoal(0); sfx.snap();
          msg.say(`Escaped along $(1, -1)$: the eigenvalue there is $-1$, so the surface falls that way. **A saddle**, with every entry positive.`, 'good');
          await wait(p.g.headless ? 5 : 900);
          await toBowl();
        } else if (res.exit) {
          sfx.miss(); msg.say('It left the panel, but not along $(1, -1)$. Try again.', 'bad');
        } else {
          sfx.miss(); msg.say('It balanced at the middle: you started it on the line $(1, 1)$, the one line where the saddle curves up. Start it off that line.', 'bad');
          p.bark('lantern', 'Probe balanced on the line (1, 1). Unstable.');
        }
      } else if (p3SettleWon(res)) {
        done[1] = true; p.subgoal(1); sfx.success();
        msg.say('It rests at the lowest point, $(0, 0)$. Eigenvalues 5 and 1, both positive: **a bowl**.', 'good');
        if (!won) { won = true; p.win(); }
      } else { sfx.miss(); msg.say('It has not come to rest yet. Release it again.', 'bad'); }
    };
    // the bowl's form, typed (navigator and commander)
    const box = h('div', { class: 'a9-col' });
    let bowlWs: StepWorksheet | null = null;
    const toBowl = async () => {
      stage = 'bowl';
      p.setGoal('**Panel four**: $3x^2 + 4xy + 3y^2$. Write it as a matrix, then release the probe from anywhere. Where does it come to rest?');
      surf.hideTrail();
      await animate(p.g.headless ? 5 : 1400, (k) => surf.setS(P3_SADDLE.map((row, i) => row.map((x, j) => x + (P3_BOWL[i][j] - x) * k))), ease.inOut);
      surf.setS(P3_BOWL);
      surf.place(knob.pos.slice(0, 2));
      paint();
      if (d !== 'cadet') {
        bowlWs = new StepWorksheet(p, {
          title: d === 'navigator' ? 'Panel four as a matrix · each step is checked' : 'Panel four as a matrix · only the answer is checked',
          steps: [
            { prompt: 'The symmetric matrix of $3x^2 + 4xy + 3y^2$', answer: P3_BOWL, mistakes: [[[[3, 4], [4, 3]], 'The $4xy$ is shared by two entries: split it in half, 2 and 2.'], [[[3, 4], [0, 3]], 'Split the $4xy$ in half: 2 above the diagonal and 2 below.']] },
            { prompt: 'Its eigenvalues, larger first', answer: [5, 1] },
          ],
          mount: box,
          onDone: () => { bowlTyped = true; paint(); msg.say('Both eigenvalues positive. Release the probe.'); },
        });
      }
    };
    // commander: classify before the surface appears
    const chips = h('div', { class: 'a9-chips' });
    if (d === 'commander') {
      surf.setOpacity(0);
      surf.group.visible = false;
      msg.say('Commit to a shape before the surface appears.');
      (['bowl', 'saddle', 'cap'] as Shape[]).forEach((s) => {
        const b = h('button', { class: 'a9-chip', type: 'button' }, SHAPE_WORD[s]) as HTMLButtonElement;
        b.addEventListener('click', () => {
          if (classified) return;
          classified = true;
          p.move();
          b.classList.add('on');
          chips.querySelectorAll('button').forEach((x) => { (x as HTMLButtonElement).disabled = true; });
          const right = s === shapeOf(P3_SADDLE);
          msg.say(right ? 'Committed: a saddle. Now show it with the probe.' : `Committed: ${SHAPE_WORD[s]}. The eigenvalues are 3 and $-1$: one of each sign. The surface says otherwise.`, right ? 'good' : 'bad');
          if (!right) sfx.miss(); else sfx.snap();
          surf.group.visible = true;
          void animate(p.g.headless ? 5 : 800, (k) => surf.setOpacity(0.88 * k), ease.out);
          paint();
        });
        chips.append(b);
      });
    }
    p.dock().append(...(d === 'commander' ? [h('div', { class: 'a9-kick' }, 'Your call'), chips] : []), h('div', { class: 'a9-btns' }, button('Release the probe', () => void release(), { cls: 'primary small' })), box, msg.el);
    paint();
    const go = async (x: V3, fast: boolean) => { if (fast) { knob.at(x); surf.place(x); } else { await knob.moveTo(x, 700); surf.place(x); } await release(); };
    const commit = () => { if (!classified) (chips.querySelectorAll('button')[1] as HTMLButtonElement).click(); };
    return {
      async showMe() {
        commit();
        if (!done[0]) await go([0.6, 0.2, 0.02], false);
        while (stage !== 'bowl') await wait(20);
        if (bowlWs && !bowlTyped) await (bowlWs as StepWorksheet).showMe(400);
        await go([1.4, -0.9, 0.02], false);
      },
      async solve() {
        commit();
        if (!done[0]) await go([0.6, 0.2, 0.02], true);
        while (stage !== 'bowl') await wait(5);
        if (bowlWs && !bowlTyped) (bowlWs as StepWorksheet).solve();
        await go([1.4, -0.9, 0.02], true);
      },
      async wrong() { commit(); await go([0.8, 0.8, 0.02], true); },
    };
  },
};

// ------------------------------------------------------------------ p4 [H] · orthogonally diagonalise, with a repeated eigenvalue

export const p4: PuzzleDef = {
  id: 'c24-p4',
  title: 'Three braces at right angles, when an eigenvalue repeats',
  goal: 'Orthogonally diagonalise the stress block $S$ (in the readout) by hand: its eigenvalues, a perpendicular pair inside the plane of the repeated one (Gram–Schmidt), and the check $S = \\sum \\lambda_i\\mathbf q_i\\mathbf q_i^{\\mathsf T}$.',
  hints: [
    'Every row of $S$ adds to 4, so $S(1, 1, 1) = 4(1, 1, 1)$. The trace is 6, so the other two eigenvalues add to 2.',
    '$S - I$ has every entry 1: it sends every arrow with $x + y + z = 0$ to the origin. That whole plane has eigenvalue 1.',
    'Shadow of $(1, 0, -1)$ on $(1, -1, 0)$: $c = \\frac{1}{2}$. Leftover $(\\frac12, \\frac12, -1)$, along $(1, 1, -2)$. Entry $(1, 2)$: $\\frac43 - \\frac12 + \\frac16 = 1$.',
  ],
  par: 7,
  view: '3d',
  onWin: S.p4Win,
  setup(p) {
    void p.g.stage.view3D({ target: [0.3, 0.4, 0.1], distance: 10, azimuth: -38, elevation: 22, ms: 0 });   // the (1, 1, 1) label clears the readout
    const plane = new PlanePatch(p.g.stage, [0, 0, 0], [1, 1, 1], { color: '#9fb6d8', size: 4.6, opacity: 0.8 });
    p.add(plane);
    ptag(p, 'x + y + z = 0 · eigenvalue 1', [1.9, 1.3, -3.2 + 0.2], 'dim');
    const L = 1.7;
    const q1 = new Arrow([0, 0, 0], v3(normalize([1, 1, 1]).map((x) => x * L)), { color: C.v, label: '$(1, 1, 1)$' });
    const a2 = new Arrow([0, 0, 0], v3(normalize([1, -1, 0]).map((x) => x * L)), { color: C.w, label: '$(1, -1, 0)$' });
    const start = new Arrow([0, 0, 0], v3(normalize([1, 0, -1]).map((x) => x * L)), { color: C.white, opacity: 0.55, width: 0.03, label: '$(1, 0, -1)$' });
    const sh = new Arrow([0, 0, 0], [0, 0, 0], { color: C.result, width: 0.04 });
    const a3 = new Arrow([0, 0, 0], [0, 0, 0], { color: C.u, label: '$(1, 1, -2)$' });
    p.add(q1, a2, start, sh, a3);
    a3.object.visible = false;
    sh.object.visible = false;
    const r = p.readout('The stress block');
    r.row('S', '$S$', `$${texM(P4_S)}$`);
    r.row('t', 'trace', '6');
    const marks: RightAngle[] = [];
    let finished = false;
    const finale = async () => {
      if (finished) return;
      finished = true;
      // the shadow of (1, 0, −1) on (1, −1, 0), then what is left: along (1, 1, −2)
      const s0 = normalize([1, 0, -1]).map((x) => x * L);
      const u2 = normalize([1, -1, 0]);
      const shadow = u2.map((x) => x * dot(s0, u2));
      sh.object.visible = true;
      await sh.moveTo(v3(shadow), p.g.headless ? 1 : 700);
      const left = s0.map((x, i) => x - shadow[i]);
      a3.object.visible = true;
      a3.set(v3(shadow), v3(shadow));
      await a3.moveTo(v3(s0), p.g.headless ? 1 : 700);
      await wait(p.g.headless ? 1 : 300);
      const leftU = normalize(left).map((x) => x * L);
      await a3.moveTo(v3(leftU), p.g.headless ? 1 : 800, [0, 0, 0]);
      start.object.visible = false; sh.object.visible = false;
      const dirs = [normalize([1, 1, 1]), normalize([1, -1, 0]), normalize([1, 1, -2])];
      for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) marks.push(new RightAngle(p, [0, 0, 0], v3(dirs[i]), v3(dirs[j]), 0.28, { color: C.white, opacity: 0.8 }));
      r.row('q', '$Q$', `$\\left[\\begin{smallmatrix} 1/\\sqrt3 & 1/\\sqrt2 & 1/\\sqrt6 \\\\ 1/\\sqrt3 & -1/\\sqrt2 & 1/\\sqrt6 \\\\ 1/\\sqrt3 & 0 & -2/\\sqrt6 \\end{smallmatrix}\\right]$`);
      r.row('d', '$D$', '$\\left[\\begin{smallmatrix} 4 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 1 \\end{smallmatrix}\\right]$', C.result);
      r.note('$QDQ^{\\mathsf T} = S$: three braces at right angles.');
      sfx.success();
      p.win();
    };
    const ws = new StepWorksheet(p, {
      steps: [
        { prompt: 'The eigenvalues of $S$, largest first (a repeat is written twice)', answer: [[4, 1, 1]], mistakes: [[[[4, 1, 0]], 'The three eigenvalues add up to the trace, 6.'], [[[4, 2, 0]], 'Try $S - I$: every entry is 1, so it flattens a whole plane.']] },
        { prompt: 'An eigenvector for 4 (first entry 1)', answer: [[1, 1, 1]] },
        { prompt: 'In the plane $x + y + z = 0$, start from $(1, 0, -1)$. Its shadow on $(1, -1, 0)$ is $c\\,(1, -1, 0)$: $c =$', answer: 0.5, mistakes: [[1, 'Divide by $(1, -1, 0)\\cdot(1, -1, 0) = 2$.']] },
        { prompt: 'What is left: $(1, 0, -1) - c\\,(1, -1, 0)$', answer: [[0.5, 0.5, -1]] },
        { prompt: 'Lengths of $(1, 1, 1)$, $(1, -1, 0)$, $(1, 1, -2)$, to divide by (two decimals)', answer: [[Math.sqrt(3), Math.SQRT2, Math.sqrt(6)]], tol: 0.006 },
        { prompt: 'Check one entry: row 1, column 2 of $4\\mathbf q_1\\mathbf q_1^{\\mathsf T} + \\mathbf q_2\\mathbf q_2^{\\mathsf T} + \\mathbf q_3\\mathbf q_3^{\\mathsf T}$', answer: 1, mistakes: [[0, 'Each piece is $\\lambda\\,q_iq_j$: $4\\cdot\\frac13 + 1\\cdot(-\\frac12) + 1\\cdot\\frac16$.']] },
      ],
      onDone: () => void finale(),
    });
    return {
      async showMe() { await ws.showMe(420); while (!finished) await wait(10); await wait(p.g.headless ? 1 : 2600); },
      async solve() { ws.solve(); while (!p.won) await wait(5); },
      wrong() { ws.wrong(); },
    };
  },
};
