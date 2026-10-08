// Chapter 4 puzzles (GDD §6.4, Ch 4): the dish meter. The win test of each puzzle is a pure function
// in logic.ts; the scenes here draw the shadow, the right angle and the readings.
import { Group, Quaternion, Vector3 } from 'three';
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { InfLine } from '../../../gfx/shapes';
import { burst } from '../../../gfx/fx';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { h, inline, button } from '../../../ui/ui';
import { Slider, VectorInput, parseNum } from '../../../ui/widgets';
import { VectorHandle } from '../../../kit/handle';
import { AngleArc, Knob, RightAngle, Shadow } from '../../../kit/geom';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { angle, cross, dot, norm, type Vec } from '../../../math/la';
import { nice } from '../../../math/frac';
import { loadModel } from '../../../gfx/models';
import { makeLantern } from '../../common/set';
import { Gauge, addGauges, chime, fmtNum } from './meter';
import { alongX } from './ark';
import {
  P3_COEFFS, P3_V, P3_W, P4_HEADING, P4_SPINE, P5_CANDS, P5_T, P6_OVERSHOOT_SCALE, P6_STEPS, P6_U, P6_V, P7_READINGS, P7_SHAKES, SIGNAL,
  axisReadings, cauchySchwarz, cosSide, deg, fmt, lockAccepted, meter, p1Won, p2Won, p3OrderOk, p4Won, p5Won, p6Won,
  p7Won, rotateAbout, type Cand,
} from './logic';
import { S } from './script';

const GREY = '#8f9bb3';
/** A number for a sum: negatives in brackets. */
const pn = (x: number) => (x < 0 ? `(${nice(x)})` : nice(x));
const v3 = (v: readonly number[]): V3 => [v[0], v[1], v[2] ?? 0];
const unit = (v: readonly number[]): V3 => { const l = Math.hypot(v[0], v[1], v[2] ?? 0) || 1; return [v[0] / l, v[1] / l, (v[2] ?? 0) / l]; };
const addS = (a: readonly number[], b: readonly number[], s = 1): V3 => [a[0] + s * b[0], a[1] + s * b[1], (a[2] ?? 0) + s * (b[2] ?? 0)];

function lab(p: PuzzleCtx, text: string, at: V3, o: { color?: string; size?: number; className?: string } = {}): Label {
  const l = new Label(text, at, o);
  p.add(l);
  return l;
}

/** A small "turn" ease used for wins: the arrow glows twice. */
async function glow(a: Arrow): Promise<void> { await a.pulse(500, 3.2); }

// ------------------------------------------------------------------ p1 [F][D] Read the pattern

export const p1: PuzzleDef = {
  id: 'c04-p1',
  title: 'What will the dish read for (3, 1)?',
  goal: 'Against the signal $\\mathbf s = (2, 4)$, the grid arrow $(1, 0)$ reads **2** and $(0, 1)$ reads **4**. Build the dish arrow $(3, 1)$: **3** of the first plus **1** of the second. Watch the reading.',
  predict: {
    prompt: 'The grid arrow $(1, 0)$ reads **2** and $(0, 1)$ reads **4**. What will the dish read for $(3, 1)$?',
    choices: [{ id: '10', text: '10' }, { id: '14', text: '14' }, { id: '7', text: '7' }],
    answer: '10',
    reveal: '3 of $(1, 0)$ reads $3 \\times 2 = 6$. 1 of $(0, 1)$ reads $1 \\times 4 = 4$. The two shadows add along the signal\'s line: $6 + 4 = 10$. **Multiply matching parts and add.**',
  },
  hints: [
    'Dial $a$ stretches $(1, 0)$ and dial $b$ stretches $(0, 1)$. The dish arrow is $a(1, 0) + b(0, 1)$.',
    'Each piece casts its own shadow on the signal\'s line, and the shadows add. Watch the two yellow pieces.',
    'Set $a = 3$ and $b = 1$.',
  ],
  par: 2,
  onWin: S.p1Win,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [1.7, 3.25], height: 8.4, ms: 0 });
    const s: V3 = v3(SIGNAL);
    const su = unit(s), sn: V3 = [su[1], -su[0], 0];
    p.add(new InfLine(p.g.stage, [0, 0, 0], s, { color: C.w, width: 1.3, opacity: 0.3 }));
    const sig = new Arrow([0, 0, 0], s, { color: C.w, label: '$\\mathbf s$' });
    const pa = new Arrow([0, 0, 0], [1, 0, 0], { color: GREY, width: 0.028, opacity: 0.85 });
    const pb = new Arrow([1, 0, 0], [1, 1, 0], { color: GREY, width: 0.028, opacity: 0.85 });
    const sh1 = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.result, width: 7, intensity: 1.3 });
    const sh2 = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: '#fff1c2', width: 7, intensity: 1.2, opacity: 0.9 });
    const drop1 = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.white, width: 1.3, opacity: 0.45, dashed: true, dashSize: 0.1, gapSize: 0.08 });
    const drop2 = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.white, width: 1.6, opacity: 0.8, dashed: true, dashSize: 0.12, gapSize: 0.08 });
    p.add(sig, pa, pb, sh1, sh2, drop1, drop2);
    const mark = new RightAngle(p, [0, 0, 0], su, sn, 0.2);
    const la = lab(p, '', [0, 0, 0], { color: C.result, size: 15 });
    const lb = lab(p, '', [0, 0, 0], { color: '#fff1c2', size: 15 });
    const step = p.difficulty === 'cadet' ? 1 : 0.5;
    let a = 1, b = 1;
    const r = p.readout('Dish meter');
    r.row('e1', '$(1, 0)$ reads', '2');
    r.row('e2', '$(0, 1)$ reads', '4');
    const gauge = new Gauge('reading of $\\mathbf d$ against $\\mathbf s$', { max: 16 });
    addGauges(r, gauge);
    const foot = (q: readonly number[]) => { const k = dot(q as Vec, s); return [su[0] * k / norm(s), su[1] * k / norm(s), 0] as V3; };
    const off = (q: V3, k = 0.13): V3 => addS(q, sn, k);
    const draw = () => {
      const d: V3 = [a, b, 0];
      pa.set([0, 0, 0], [a, 0, 0]); pb.set([a, 0, 0], d);
      const f1 = foot([a, 0]), fd = foot(d);
      sh1.setPoints([off([0, 0, 0]), off(f1)]); sh2.setPoints([off(f1), off(fd)]);
      sh1.setOpacity(Math.abs(a) > 1e-9 ? 1 : 0); sh2.setOpacity(Math.abs(b) > 1e-9 ? 0.9 : 0);
      drop1.setPoints([[a, 0, 0], f1]); drop1.setOpacity(Math.abs(a) > 1e-9 ? 0.45 : 0);
      drop2.setPoints([d, fd]); drop2.setOpacity(norm([d[0] - fd[0], d[1] - fd[1]]) > 0.05 ? 0.8 : 0);
      mark.set(fd, su, unit([d[0] - fd[0], d[1] - fd[1], 0]));
      mark.show(norm([d[0] - fd[0], d[1] - fd[1]]) > 0.35);
      la.at(off(scaleMid([0, 0, 0], f1), 0.5)); la.set(`${nice(a)} × 2`); la.show(Math.abs(a) > 1e-9);
      lb.at(off(scaleMid(f1, fd), 0.5)); lb.set(`${nice(b)} × 4`); lb.show(Math.abs(b) > 1e-9);
      const rd = 2 * a + 4 * b;
      r.row('d', 'dish arrow $\\mathbf d$', fmt([a, b]), C.v);
      gauge.set(rd);
      r.eq(`${pn(a)} \\times 2 + ${pn(b)} \\times 4 = ${nice(rd)}`);
    };
    const scaleMid = (x: V3, y: V3): V3 => [(x[0] + y[0]) / 2, (x[1] + y[1]) / 2, 0];
    let won = false;
    const check = async () => {
      if (won || !p1Won(a, b)) return;
      won = true;
      dh.setEnabled(false);
      chime();
      await Promise.all([glow(sig), animate(500, (k) => { sh1.setColor(C.result, 1.3 + 1.5 * Math.sin(k * Math.PI)); sh2.setColor('#fff1c2', 1.2 + 1.5 * Math.sin(k * Math.PI)); }, ease.linear)]);
      p.win();
    };
    const dh = new VectorHandle(p, {
      to: [1, 1, 0], color: C.v, label: '$\\mathbf d$', snap: step, limit: 4,
      onChange: (t) => { a = t[0]; b = t[1]; sa.set(a, false); sb.set(b, false); draw(); },
      onCommit: () => void check(),
    });
    const sa = new Slider({ label: '$a$, amount of $(1, 0)$', min: -4, max: 4, step, value: 1, onInput: (x) => { a = x; dh.arrow.setTo([a, b, 0]); draw(); } });
    const sb = new Slider({ label: '$b$, amount of $(0, 1)$', min: -4, max: 4, step, value: 1, onInput: (x) => { b = x; dh.arrow.setTo([a, b, 0]); draw(); } });
    for (const sl of [sa, sb]) sl.el.querySelector('input')!.addEventListener('change', () => { p.move(); void check(); });
    p.dock().append(sa.el, sb.el);
    draw();
    const setTo = async (aa: number, bb: number, ms: number) => {
      const a0 = a, b0 = b;
      await animate(ms, (k) => { a = a0 + (aa - a0) * k; b = b0 + (bb - b0) * k; dh.arrow.setTo([a, b, 0]); draw(); }, ease.inOut);
      a = aa; b = bb; sa.set(a, false); sb.set(b, false); dh.arrow.setTo([a, b, 0]); draw();
    };
    return {
      async showMe() { await setTo(3, 0, 700); await wait(250); await setTo(3, 1, 600); await check(); },
      async solve() { await setTo(3, 1, 0); await check(); },
      async wrong() { await setTo(1, 3, 0); await check(); },
    };
  },
};

// ------------------------------------------------------------------ p2 The silent direction

export const p2: PuzzleDef = {
  id: 'c04-p2',
  title: 'Which way does the dish read nothing?',
  goal: 'Drag the dish arrow $\\mathbf d$ to a **whole-number** direction that reads **exactly 0** against the signal $\\mathbf s = (2, 4)$.',
  predict: {
    prompt: 'Turn the dish away from the signal. Where will the reading be exactly **0**?',
    choices: [{ id: 'right', text: 'At a right angle to the signal' }, { id: 'opposite', text: 'Pointing straight away from it' }, { id: 'never', text: 'Nowhere: it only gets small' }],
    answer: 'right',
    reveal: 'At a right angle the shadow shrinks to a point, so the reading is **0**. Pointing straight away gives the most **negative** reading: the shadow points back along the line.',
  },
  hints: [
    'Watch the yellow shadow on the signal\'s line. Make it shrink to a point.',
    'The reading is $2d_1 + 4d_2$. You need $2d_1 + 4d_2 = 0$.',
    'Try $\\mathbf d = (2, -1)$: $2 \\times 2 + 4 \\times (-1) = 0$.',
  ],
  par: 2,
  onWin: S.p2Win,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [0.6, 2.8], height: 10, ms: 0 });
    const s: V3 = v3(SIGNAL);
    const sig = new Arrow([0, 0, 0], s, { color: C.w, label: '$\\mathbf s$' });
    p.add(sig);
    const sh = new Shadow(p, { onto: s, of: [3, 1, 0], label: 'shadow' });
    const arc = new AngleArc(p, [0, 0, 0], [3, 1, 0], s, { label: p.difficulty === 'commander' ? '' : '$\\theta$', radius: 0.55, opacity: 0.7 });
    const silent = new InfLine(p.g.stage, [0, 0, 0], [2, -1, 0], { color: C.white, width: 1.4, opacity: 0, dashed: true });
    p.add(silent);
    const silentLab = lab(p, 'every arrow on this line reads 0', [-2.6, 2.3, 0], { className: 'small' });
    silentLab.show(false);
    const r = p.readout('Dish meter');
    const gauge = new Gauge('reading of $\\mathbf d$ against $\\mathbf s$', { max: 25 });
    addGauges(r, gauge);
    let warnedNeg = false, warnedZero = false, won = false;
    const upd = (t: V3) => {
      sh.set(t, s);
      arc.set(t, s);
      const rd = dot(t, s);
      r.row('d', 'dish arrow $\\mathbf d$', fmt(t.slice(0, 2)), C.v);
      r.row('f', 'reading', `$${pn(t[0])} \\times 2 + ${pn(t[1])} \\times 4 = ${nice(rd)}$`);
      if (p.difficulty === 'cadet') r.row('th', 'angle $\\theta$', norm(t) > 1e-9 ? `${Math.round(deg(angle(t, s)))}°` : '—');
      if (gauge.set(rd) && norm(t) > 1e-9) chime();
    };
    const commit = async (t: V3) => {
      if (won) return;
      if (norm(t) < 1e-9) {
        if (!warnedZero) { warnedZero = true; sfx.miss(); p.bark('lantern', 'The dish arrow has no length. It reads 0, but it points nowhere. Find a direction.'); }
        return;
      }
      if (dot(t, s) < 0 && !warnedNeg) { warnedNeg = true; p.bark('lantern', 'Negative reading. The shadow points back along the signal\'s line.'); }
      if (!p2Won(t)) return;
      won = true;
      dh.setEnabled(false);
      await animate(700, (k) => { silent.line.setOpacity(0.55 * k); }, ease.out);
      silentLab.show(true);
      p.win();
    };
    const dh = new VectorHandle(p, { to: [3, 1, 0], color: C.v, label: '$\\mathbf d$', snap: 1, limit: 5, onChange: upd, onCommit: (t) => void commit(t) });
    upd(dh.tip);
    return {
      async showMe() { await dh.moveTo([2, -1, 0], 1100); },
      async solve() { dh.set([2, -1, 0]); await commit(dh.tip); },
      async wrong() { dh.set([0, 0, 0]); await commit(dh.tip); dh.set([-2, -4, 0]); await commit(dh.tip); },
    };
  },
};

// ------------------------------------------------------------------ p3 [D] The law of cosines

const P3_TILES = [
  { id: 't1', text: 'Write the gap\'s length squared: $\\|\\mathbf v-\\mathbf w\\|^2 = (v_1-w_1)^2+(v_2-w_2)^2$.' },
  { id: 't2', text: 'Multiply out: $v_1^2+v_2^2+w_1^2+w_2^2-2(v_1w_1+v_2w_2)$.' },
  { id: 't3', text: 'Group the terms: $\\|\\mathbf v\\|^2+\\|\\mathbf w\\|^2-2\\,\\mathbf v\\cdot\\mathbf w$.' },
  { id: 't4', text: 'The law of cosines for the same side: $\\|\\mathbf v\\|^2+\\|\\mathbf w\\|^2-2\\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta$.' },
  { id: 't5', text: 'Match the last terms: $\\mathbf v\\cdot\\mathbf w=\\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta$.' },
];
const P3_DECOY = [{ id: 'x1', text: 'Multiply out: $(v_1-w_1)^2 = v_1^2-w_1^2$.' }];

export const p3: PuzzleDef = {
  id: 'c04-p3',
  title: 'Why does the dot product measure the angle?',
  goal: 'Two readouts: $v_1w_1 + v_2w_2$ and $\\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta$. Drag $\\mathbf v$ or $\\mathbf w$ and compare them. Then show where the match comes from, below.',
  subgoals: ['Drag $\\mathbf v$ or $\\mathbf w$ and compare the two readouts', 'Show where the match comes from'],
  hints: [
    'The yellow arrow $\\mathbf v - \\mathbf w$ closes the triangle. Its length squared can be worked out two ways.',
    'Multiply out $(v_1 - w_1)^2 + (v_2 - w_2)^2$. The middle terms are $-2v_1w_1$ and $-2v_2w_2$.',
    'Both ways give $\\|\\mathbf v\\|^2 + \\|\\mathbf w\\|^2 - 2(\\ldots)$. What is left in the brackets must match: $\\mathbf v\\cdot\\mathbf w = \\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta$.',
  ],
  par: 8,
  onWin: S.p3Win,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [-2.0, 1.6], height: 7.6, ms: 0 });
    const done = [false, false];
    const tickSub = (i: number) => { if (!done[i]) { done[i] = true; p.subgoal(i); } if (done.every(Boolean)) p.win(); };
    const diff = new Arrow([1, 2, 0], [3, 1, 0], { color: C.result, label: '$\\mathbf v - \\mathbf w$', labelAt: 'mid' });
    p.add(diff);
    const arc = new AngleArc(p, [0, 0, 0], v3(P3_V), v3(P3_W), { label: '$\\theta$', radius: 0.6 });
    const r = p.readout('Two readouts');
    let vv: V3 = v3(P3_V), ww: V3 = v3(P3_W);
    const upd = () => {
      diff.set(ww, vv);
      arc.set(vv, ww);
      r.row('v', '$\\mathbf v$', fmt(vv.slice(0, 2)), C.v);
      r.row('w', '$\\mathbf w$', fmt(ww.slice(0, 2)), C.w);
      r.row('dp', '$v_1w_1 + v_2w_2$', fmtNum(dot(vv, ww)));
      const th = deg(angle(vv, ww));
      r.row('cs', '$\\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta$', fmtNum(cosSide(vv, ww)));
      if (p.difficulty !== 'commander') r.row('th', 'angle $\\theta$ (from the picture)', `${Math.round(th)}°`);
    };
    const hv = new VectorHandle(p, { to: vv, color: C.v, label: '$\\mathbf v$', limit: 3.8, onChange: (t) => { vv = t; upd(); }, onCommit: () => tickSub(0) });
    new VectorHandle(p, { to: ww, color: C.w, label: '$\\mathbf w$', limit: 3.8, onChange: (t) => { ww = t; upd(); }, onCommit: () => tickSub(0) });
    upd();
    // the derivation, by difficulty (GDD §7.1)
    const dock = p.dock();
    dock.style.maxWidth = 'min(600px, calc(100vw - 40px))';
    let solveDerivation: () => Promise<void> = async () => {};
    const finish = () => tickSub(1);
    if (p.difficulty === 'cadet') {
      // watch the expansion appear, then drag the one matching term
      const lines = [
        '$\\|\\mathbf v-\\mathbf w\\|^2 = (v_1-w_1)^2+(v_2-w_2)^2$',
        '$\\phantom{\\|\\mathbf v-\\mathbf w\\|^2} = \\|\\mathbf v\\|^2+\\|\\mathbf w\\|^2-2\\,(v_1w_1+v_2w_2)$',
        'Law of cosines: $\\|\\mathbf v-\\mathbf w\\|^2 = \\|\\mathbf v\\|^2+\\|\\mathbf w\\|^2-2\\,\\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta$',
      ];
      const box = h('div', { style: 'display:flex;flex-direction:column;gap:6px;font-size:14px' });
      const els = lines.map((l) => { const e = h('div', { html: inline(l), style: 'opacity:0;transition:opacity .6s' }); box.append(e); return e; });
      const slot = h('span', { style: 'display:inline-block;min-width:150px;padding:4px 10px;border:1px dashed var(--line-2);border-radius:8px;text-align:center;color:var(--ink-2)' }, 'drop a term here');
      const matchRow = h('div', { style: 'display:flex;align-items:center;gap:10px;font-size:15px;opacity:0;transition:opacity .6s' }, h('span', { html: inline('So $v_1w_1 + v_2w_2 =$') }), slot);
      const msg = h('div', { class: 'c-muted', style: 'font-size:13px;min-height:18px' });
      const chips: [string, string, boolean, string][] = [
        ['cos', '$\\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta$', true, ''],
        ['vv', '$\\|\\mathbf v\\|^2$', false, '$\\|\\mathbf v\\|^2$ is on both lines already. It cancels.'],
        ['gap', '$\\|\\mathbf v-\\mathbf w\\|$', false, 'That is the side both lines start from, not a term to match.'],
      ];
      let placed = false;
      const place = (id: string) => {
        if (placed) return;
        const c = chips.find((x) => x[0] === id)!;
        p.move();
        if (c[2]) {
          placed = true;
          slot.innerHTML = inline(c[1]);
          slot.style.borderStyle = 'solid'; slot.style.borderColor = C.good; slot.style.color = C.white;
          msg.innerHTML = inline('Both lines are $\\|\\mathbf v\\|^2+\\|\\mathbf w\\|^2-2(\\ldots)$, so the brackets match.');
          chime();
          finish();
        } else { sfx.miss(); msg.innerHTML = inline(c[3]); }
      };
      const chipRow = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;opacity:0;transition:opacity .6s' }, ...chips.map(([id, t]) => {
        const b = h('button', { class: 'chip', type: 'button', draggable: 'true', html: inline(t) });
        b.addEventListener('click', () => place(id));
        b.addEventListener('dragstart', (e) => (e as DragEvent).dataTransfer?.setData('text/plain', id));
        return b;
      }));
      slot.addEventListener('dragover', (e) => e.preventDefault());
      slot.addEventListener('drop', (e) => { e.preventDefault(); place((e as DragEvent).dataTransfer?.getData('text/plain') ?? ''); });
      dock.append(h('div', { class: 'kicker' }, 'Where it comes from · watch, then drag one term'), box, matchRow, chipRow, msg);
      const reveal = async (ms: number) => { for (const e of [...els, matchRow, chipRow]) { e.style.opacity = '1'; await wait(ms); } };
      void reveal(700);
      solveDerivation = async () => { await reveal(0); place('cos'); };
    } else if (p.difficulty === 'navigator') {
      // the expansion for any pair: the player supplies each number in front of a term
      const ws = new StepWorksheet(p, {
        title: 'Where it comes from · type the number in each box',
        steps: [
          { prompt: 'Multiply out one part: $(v_1-w_1)^2 = v_1^2 + \\square\\,v_1w_1 + w_1^2$', answer: P3_COEFFS.cross, mistakes: [
            [0, '$(v_1-w_1)^2$ is not $v_1^2+w_1^2$: the middle term is missing, and that is where $\\mathbf v\\cdot\\mathbf w$ comes from.'],
            [-1, 'There are two middle terms: $v_1\\cdot(-w_1)$ and $(-w_1)\\cdot v_1$.'],
            [2, 'Check the sign: $v_1\\cdot(-w_1)$ is negative.'],
          ] },
          { prompt: 'Do the same for $(v_2-w_2)^2$ and group: $\\|\\mathbf v-\\mathbf w\\|^2 = \\|\\mathbf v\\|^2+\\|\\mathbf w\\|^2 + \\square\\,(v_1w_1+v_2w_2)$', answer: P3_COEFFS.grouped, mistakes: [
            [-4, 'Each part gives its own middle term. Take the common number out of $-2v_1w_1 - 2v_2w_2$.'],
            [2, 'Check the sign: both middle terms are negative.'],
          ] },
          { prompt: 'The law of cosines has $-2\\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta$ in that place, so $v_1w_1+v_2w_2 = \\square\\,\\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta$', answer: P3_COEFFS.match, mistakes: [
            [-2, 'Both lines have $-2$ in front. Divide both sides by $-2$.'],
            [2, 'Both lines have $-2$ in front. Divide both sides by $-2$.'],
            [-1, 'Dividing both sides by $-2$ cancels the minus signs too.'],
          ] },
        ],
        onDone: finish,
      });
      solveDerivation = async () => ws.solve();
    } else {
      const fin = h('div');
      let ws: StepWorksheet | null = null;
      const msg = h('div', { class: 'c-muted', style: 'font-size:13px;min-height:18px' });
      const openLast = () => {
        if (ws) return;
        ws = new StepWorksheet(p, {
          title: 'The last line',
          steps: [{ prompt: 'So the angle between $(3, 1)$ and $(1, 2)$ is', answer: 45, suffix: 'degrees', tol: 0.5, mistakes: [[0.71, 'That is $\\cos\\theta$. Turn it into an angle.'], [0.7071, 'That is $\\cos\\theta$. Turn it into an angle.']] }],
          onDone: finish,
          mount: fin,
        });
      };
      const tiles = new TileOrder(p, {
        tiles: P3_TILES, decoys: P3_DECOY, title: 'Where it comes from · put the steps in order', submitLabel: 'Check the order',
        onSubmit: (order) => {
          p.move();
          if (order.includes('x1')) { sfx.miss(); msg.innerHTML = inline('$(v_1-w_1)^2$ is not $v_1^2-w_1^2$: the middle term $-2v_1w_1$ is missing, and that is where $\\mathbf v\\cdot\\mathbf w$ comes from.'); return; }
          if (!p3OrderOk(order)) { sfx.miss(); msg.innerHTML = inline('Not in that order. Each line must follow from the one before; the match comes last.'); return; }
          msg.innerHTML = inline('The steps hold. Now the last line.');
          chime();
          openLast();
        },
        mount: dock,
      });
      dock.append(msg, fin);
      solveDerivation = async () => { tiles.set(P3_TILES.map((t) => t.id)); openLast(); ws!.solve(); };
    }
    return {
      async showMe() { await hv.moveTo([4, 0.5, 0], 700); await hv.moveTo(v3(P3_V), 600); await solveDerivation(); },
      async solve() { hv.set(v3(P3_V)); tickSub(0); await solveDerivation(); },
      async wrong() { /* dragging alone never completes the derivation */ hv.set([2, 2, 0]); },
    };
  },
};

// ------------------------------------------------------------------ p4 Turn to the ark (3-D)

export const p4: PuzzleDef = {
  id: 'c04-p4',
  title: 'How far must the Lantern turn to line up with the ark?',
  goal: 'Our heading is $\\mathbf h = (1, 1, 0)$. The ark\'s spine runs along $\\mathbf s = (1, 0, 1)$. Set the turn and press **Turn**. It must land within **1°**.',
  hints: [
    '$\\cos\\theta = \\dfrac{\\mathbf h\\cdot\\mathbf s}{\\|\\mathbf h\\|\\|\\mathbf s\\|}$.',
    '$\\mathbf h\\cdot\\mathbf s = 1 \\cdot 1 + 1 \\cdot 0 + 0 \\cdot 1 = 1$ and $\\|\\mathbf h\\| = \\|\\mathbf s\\| = \\sqrt 2$, so $\\cos\\theta = \\frac{1}{2}$.',
    'The angle whose cosine is $\\frac12$ is $60°$.',
  ],
  par: 1,
  view: '3d',
  onWin: S.p4Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [0.55, 0.35, 0.45], distance: 7.2, azimuth: -72, elevation: 18, ms: 0 });
    p.grid({ base: 0.1, main: 0.16, axis: 0.35 });
    const H = v3(P4_HEADING), Sp = v3(P4_SPINE);
    const axis = unit(cross(P4_HEADING, P4_SPINE));
    // the ark far off, loaded in the background (the puzzle does not wait for it)
    const g0 = new Group();
    g0.quaternion.copy(alongX(Sp));
    g0.position.set(-5, 46, 1);
    p.add(g0);
    void loadModel('meridian').then((ark) => {
      if (!ark || !g0.parent) return;
      ark.rotation.x = Math.PI / 2;
      ark.scale.setScalar(0.2);
      g0.add(ark);
    });
    const ship = makeLantern(p.g.stage, 0.13);
    p.add(ship);
    ship.setThrust(0.15);
    const q0 = new Quaternion();
    void ship.ready.then(() => { ship.face(H); q0.copy(ship.object.quaternion); });
    ship.face(H); q0.copy(ship.object.quaternion);
    const spineLine = new InfLine(p.g.stage, [0, 0, 0], Sp, { color: C.w, width: 1.2, opacity: 0.35, dashed: true });
    p.add(spineLine);
    const hA = new Arrow([0, 0, 0], H, { color: C.v, label: '$\\mathbf h$' });
    const sA = new Arrow([0, 0, 0], Sp, { color: C.w, label: '$\\mathbf s$' });
    p.add(hA, sA);
    const showAngle = p.difficulty === 'cadet';
    const arc = new AngleArc(p, [0, 0, 0], H, Sp, { label: showAngle ? '$60°$' : p.difficulty === 'navigator' ? '$\\theta$' : '', radius: 0.8 });
    const gap = new AngleArc(p, [0, 0, 0], H, Sp, { label: ' ', radius: 0.85, color: C.orange, fill: 0.12 });
    gap.show(false);
    const r = p.readout('Heading and spine');
    r.row('h', '$\\mathbf h$', fmt(P4_HEADING), C.v);
    r.row('s', '$\\mathbf s$', fmt(P4_SPINE), C.w);
    if (p.difficulty !== 'commander') {
      r.row('hs', '$\\mathbf h\\cdot\\mathbf s$', nice(dot(P4_HEADING, P4_SPINE)));
      r.row('hl', '$\\|\\mathbf h\\|$, $\\|\\mathbf s\\|$', `${norm(P4_HEADING).toFixed(2)}, ${norm(P4_SPINE).toFixed(2)}`);
    }
    if (showAngle) r.row('th', 'angle between them', '60°');
    let turn = 30;
    const input = h('input', { class: 'cell', style: 'width:72px', inputmode: 'decimal', value: '30', 'aria-label': 'turn in degrees' }) as HTMLInputElement;
    const slider = new Slider({ label: 'turn by', min: 0, max: 180, step: 1, value: turn, format: (x) => `${Math.round(x)}°`, onInput: (x) => { turn = x; input.value = String(Math.round(x)); preview(); } });
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { const v = parseNum(input.value); if (v !== null) { turn = Math.max(0, Math.min(180, v)); slider.set(turn, false); void go(); } } });
    const preview = () => { /* the dial only sets the amount; nothing moves until Turn */ };
    let busy = false, won = false;
    const setHeading = (t: number) => {
      const q = new Quaternion().setFromAxisAngle(new Vector3(...axis), t);
      ship.object.quaternion.copy(q.clone().multiply(q0));
      hA.setTo(v3(rotateAbout(P4_HEADING, axis, t)));
    };
    const go = async () => {
      if (busy || won) return;
      busy = true;
      p.move();
      gap.show(false);
      sfx.thrust(0.9);
      ship.setThrust(0.8);
      const t1 = (turn * Math.PI) / 180;
      await animate(1400, (k) => setHeading(t1 * k), ease.inOut);
      ship.setThrust(0.15);
      if (p4Won(turn)) {
        won = true;
        setHeading((60 * Math.PI) / 180);
        arc.show(false);
        sA.setOpacity(0.45);
        void glow(hA);
        spineLine.line.setColor(C.white, 1.6);
        void burst(p.g.stage, v3(Sp), C.result, 50, 2, false);
        chime();
        p.win();
      } else {
        const now = rotateAbout(P4_HEADING, axis, t1);
        const left = Math.round(deg(angle(now, P4_SPINE)));
        gap.set(v3(now), Sp);
        gap.setLabel(`$${left}°$`);
        gap.show(true);
        sfx.miss();
        p.bark('lantern', turn < 60 ? `Turned ${Math.round(turn)}°. The spine is ${left}° further.` : `Turned ${Math.round(turn)}°. That is ${left}° past the spine.`);
        await wait(900);
        await animate(700, (k) => setHeading(t1 * (1 - k)), ease.inOut);
      }
      busy = false;
    };
    p.dock().append(slider.el, h('div', { style: 'display:flex;gap:10px;align-items:center' },
      h('label', { style: 'display:flex;gap:8px;align-items:center;font-size:14px' }, 'or type', input, '°'),
      button('Turn', () => void go(), { cls: 'primary small' })));
    return {
      async showMe() { turn = 60; slider.set(60, false); input.value = '60'; await go(); },
      async solve() { turn = 60; await go(); },
      async wrong() { turn = 45; await go(); },
    };
  },
};

// ------------------------------------------------------------------ p5 Which one is the ark? (cosine similarity)

export const p5: PuzzleDef = {
  id: 'c04-p5',
  title: 'Which one is the ark?',
  goal: 'The ark\'s pattern is $\\mathbf t = (3, 4)$. LANTERN locks only on a meter reading of **1.00**: the same direction. Fix the meter, then lock the ark\'s beacon.',
  hints: [
    'A long signal reads high even when it points a different way. The meter has to stop caring about length.',
    'Divide the reading by the length of $\\mathbf t$ **and** by the length of the candidate. What is left is $\\cos\\theta$.',
    'Turn on both divisions; **a** reads 1.00. Lock **a**.',
  ],
  par: 3,
  onWin: S.p5Win,
  setup(p) {
    p.grid({ base: 0.1, main: 0.22 });
    p.g.stage.view2D({ center: [2.2, 10.2], height: 24.6, ms: 0 });
    const t = v3(P5_T);
    const keys: Cand[] = ['a', 'b', 'c'];
    const cand: Record<Cand, Arrow> = {} as Record<Cand, Arrow>;
    for (const k of keys) { cand[k] = new Arrow([0, 0, 0], v3(P5_CANDS[k]), { color: '#c3cde0', width: 0.12, label: `$\\mathbf ${k}$` }); p.add(cand[k]); }
    const tA = new Arrow([0, 0, 0], t, { color: C.w, width: 0.13 });
    p.add(tA);
    lab(p, '$\\mathbf t$', [2.1, 3.7, 0], { color: C.w, size: 22 });
    const arc = new AngleArc(p, [0, 0, 0], t, t, { label: ' ', radius: 2.4, color: C.orange, fill: 0.14, width: 2.2 });
    arc.show(false);
    let divT = false, divX = false, locked: Cand | null = null;
    const r = p.readout('Beacon meter');
    const gauges: Record<Cand, Gauge> = {} as Record<Cand, Gauge>;
    for (const k of keys) { gauges[k] = new Gauge(`signal $\\mathbf ${k} = ${fmt(P5_CANDS[k])}$`, { max: 80 }); addGauges(r, gauges[k]); }
    const btnT = button('÷ length of t', () => { divT = !divT; p.move(); sync(); }, { cls: 'small' });
    const btnX = button('÷ length of the signal', () => { divX = !divX; p.move(); sync(); }, { cls: 'small' });
    const sync = () => {
      btnT.classList.toggle('primary', divT); btnX.classList.toggle('primary', divX);
      const parts = ['\\mathbf t\\cdot\\mathbf x'];
      const den = [divT ? '\\|\\mathbf t\\|' : '', divX ? '\\|\\mathbf x\\|' : ''].filter(Boolean).join('\\,');
      r.eq(`\\text{meter} = ${den ? `\\dfrac{${parts[0]}}{${den}}` : parts[0]}`);
      const max = divT && divX ? 1 : divT ? 16 : divX ? 5 : 80;
      for (const k of keys) { gauges[k].max = max; gauges[k].set(meter(P5_CANDS[k], divT, divX), (divT && divX) ? meter(P5_CANDS[k], true, true).toFixed(2) : fmtNum(meter(P5_CANDS[k], divT, divX))); }
    };
    sync();
    const tryLock = async (k: Cand) => {
      if (p.won) return;
      p.move();
      locked = k;
      for (const c of keys) cand[c].setColor(c === k ? C.v : '#c3cde0');
      const th = Math.round(deg(angle(P5_T, P5_CANDS[k])));
      if (p5Won(k, divT, divX)) {
        arc.show(false);
        chime();
        await Promise.all([glow(cand[k]), glow(tA)]);
        void burst(p.g.stage, v3(P5_CANDS[k]), C.v, 60, 3, true);
        p.win();
        return;
      }
      sfx.miss();
      arc.set(t, v3(P5_CANDS[k]));
      arc.setLabel(th ? `$${th}°$` : '');
      arc.show(th > 0);
      const m = meter(P5_CANDS[k], divT, divX);
      if (!lockAccepted(k, divT, divX)) {
        p.bark('lantern', th ? `Lock refused. Signal ${k} reads ${divT && divX ? m.toFixed(2) : fmtNum(m)}, not 1.00. It points about ${th}° away from the pattern.` : `Lock refused. Signal ${k} reads ${fmtNum(m)}. Same direction, but this meter still counts length.`);
      }
    };
    p.dock().append(
      h('div', { class: 'kicker' }, 'Meter steps'),
      h('div', { style: 'font-size:13px;color:var(--ink-2)', html: inline('Always: multiply matching parts and add.') }),
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, btnT, btnX),
      h('div', { class: 'kicker', style: 'margin-top:4px' }, 'Lock'),
      h('div', { style: 'display:flex;gap:8px' }, ...keys.map((k) => button(`Lock ${k}`, () => void tryLock(k), { cls: 'small' }))));
    void locked;
    return {
      async showMe() { if (!divT) { divT = true; sync(); await wait(500); } if (!divX) { divX = true; sync(); await wait(600); } await tryLock('a'); },
      async solve() { divT = true; divX = true; sync(); await tryLock('a'); },
      async wrong() { divT = false; divX = false; sync(); await tryLock('c'); divX = true; sync(); await tryLock('a'); },
    };
  },
};

// ------------------------------------------------------------------ p6 [H] Cast the shadow

export const p6: PuzzleDef = {
  id: 'c04-p6',
  title: 'Where does the shadow of v land on the line through u?',
  goal: 'Work out the shadow of $\\mathbf v = (3, 4)$ on the line through $\\mathbf u = (2, 1)$ by hand. Then drag the marker to the shadow\'s tip.',
  subgoals: ['Work it out by hand', 'Mark the shadow\'s tip'],
  hints: [
    'The shadow is $\\dfrac{\\mathbf v\\cdot\\mathbf u}{\\mathbf u\\cdot\\mathbf u}\\,\\mathbf u$: a number times $\\mathbf u$.',
    '$\\mathbf v\\cdot\\mathbf u = 6 + 4 = 10$ and $\\mathbf u\\cdot\\mathbf u = 4 + 1 = 5$, so the shadow is $2\\mathbf u$.',
    'The tip is $2 \\times (2, 1) = (4, 2)$. The gap $(3, 4) - (4, 2) = (-1, 2)$ reads 0 against $\\mathbf u$.',
  ],
  par: 7,
  onWin: S.p6Win,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [2.2, 3.0], height: 10, ms: 0 });
    const v = v3(P6_V), u = v3(P6_U);
    p.add(new InfLine(p.g.stage, [0, 0, 0], u, { color: C.w, width: 1.3, opacity: 0.35 }));
    p.add(new Arrow([0, 0, 0], u, { color: C.w }), new Arrow([0, 0, 0], v, { color: C.v, label: '$\\mathbf v$' }));
    lab(p, '$\\mathbf u$', [2.25, 0.6, 0], { color: C.w, size: 20 });
    const sh = new Shadow(p, { onto: u, of: v, lineColor: C.w });
    const showLive = p.difficulty === 'cadet';
    sh.show(showLive);
    const over = new Arrow([0, 0, 0], v3([P6_OVERSHOOT_SCALE * 2, P6_OVERSHOOT_SCALE]), { color: C.orange, width: 0.035, opacity: 0.8, label: 'overshoot', labelAt: 'mid' });
    over.setOpacity(0);
    p.add(over);
    const gapA = new Arrow([4, 2, 0], v, { color: C.white, width: 0.03, opacity: 0, label: 'gap', labelAt: 'mid' });
    gapA.setOpacity(0);
    p.add(gapA);
    const gapLine = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.white, width: 1.5, opacity: 0, dashed: true, dashSize: 0.12, gapSize: 0.08 });
    p.add(gapLine);
    const r = p.readout('Shadow');
    const flags = [false, false];
    let mark: V3 = [1, 0.5, 0];
    const tick = (i: number) => {
      if (!flags[i]) { flags[i] = true; p.subgoal(i); }
      if (p6Won(flags[0], mark)) void finish();
    };
    let finished: Promise<void> | null = null;
    const finish = (): Promise<void> => (finished ??= (async () => {
      knob.setEnabled(false);
      sh.show(true);
      gapLine.setOpacity(0);
      gapA.setOpacity(0.9);
      r.row('gap', 'gap $\\mathbf v - $ shadow', fmt(P6_STEPS.gap), C.white);
      r.row('gu', 'gap $\\cdot\\,\\mathbf u$', `$(-1)(2) + (2)(1) = 0$`);
      chime();
      await wait(300);
      p.win();
    })());
    // the marker rides the line through u
    const tStep = p.difficulty === 'cadet' ? 0.5 : p.difficulty === 'navigator' ? 0.25 : null;
    const knob = new Knob(p, mark, {
      color: C.result, label: 'mark',
      constrain: (q) => {
        let t = q.x * u[0] + q.y * u[1];
        t /= dot(P6_U, P6_U);
        if (tStep) t = Math.round(t / tStep) * tStep;
        t = Math.max(-1.5, Math.min(3.5, t));
        return new Vector3(t * u[0], t * u[1], 0.02);
      },
      onMove: (q) => { mark = q; },
      onEnd: (q) => {
        mark = q;
        const g = [v[0] - q[0], v[1] - q[1]];
        const reads = dot(g, P6_U);
        if (Math.abs(reads) > 0.05) {
          gapLine.setPoints([q, v]); gapLine.setOpacity(0.7);
          sfx.miss();
          p.bark('lantern', `The gap from your mark to the tip of v reads ${fmtNum(reads)} against u. A shadow's gap reads 0.`);
        } else { gapLine.setOpacity(0); tick(1); }
      },
    });
    const steps = [
      { prompt: '$\\mathbf v\\cdot\\mathbf u = 3\\cdot 2 + 4\\cdot 1$', answer: P6_STEPS.vu },
      { prompt: '$\\mathbf u\\cdot\\mathbf u = 2\\cdot 2 + 1\\cdot 1$', answer: P6_STEPS.uu, mistakes: [[Math.sqrt(5), 'That is the length of $\\mathbf u$. The formula divides by $\\mathbf u\\cdot\\mathbf u$, its length squared.'] as [number, string]] },
      { prompt: 'scale $= \\dfrac{\\mathbf v\\cdot\\mathbf u}{\\mathbf u\\cdot\\mathbf u}$', answer: P6_STEPS.scale, tol: 0.01, mistakes: [[P6_OVERSHOOT_SCALE, 'That divides by the length of $\\mathbf u$ once. The shadow would overshoot (drawn in orange).'] as [number, string]] },
      { prompt: 'shadow tip $=$ scale $\\times\\,\\mathbf u$', answer: P6_STEPS.tip },
    ];
    const ws = new StepWorksheet(p, { steps, onDone: () => tick(0) });
    // navigator: the shadow appears once v·u and u·u are typed; the overshoot trap is drawn when typed
    p.tick(() => {
      const ok = ws.el.querySelectorAll('.ws-row.ok').length;
      if (p.difficulty === 'navigator' && ok >= 2) sh.show(true);
    });
    ws.el.addEventListener('change', () => {
      const cells = [...ws.el.querySelectorAll('input')] as HTMLInputElement[];
      const sc = parseNum(cells[2]?.value ?? '');
      if (sc !== null && Math.abs(sc - P6_OVERSHOOT_SCALE) < 0.02) { over.setOpacity(0.85); sfx.miss(); }
    });
    r.row('v', '$\\mathbf v$', fmt(P6_V), C.v);
    r.row('u', '$\\mathbf u$', fmt(P6_U), C.w);
    p.tick(() => r.row('m', 'your mark', fmt(mark.slice(0, 2).map((x) => Math.round(x * 100) / 100))));
    return {
      async showMe() { await ws.showMe(350); await knob.moveTo([4, 2, 0.02], 800); mark = [4, 2, 0]; tick(1); },
      async solve() { ws.solve(); knob.at([4, 2, 0.02]); mark = [4, 2, 0]; tick(1); await finished; },
      async wrong() { ws.wrong(); knob.at([P6_OVERSHOOT_SCALE * 2, P6_OVERSHOOT_SCALE, 0.02]); mark = [P6_OVERSHOOT_SCALE * 2, P6_OVERSHOOT_SCALE, 0]; tick(1); },
    };
  },
};

// ------------------------------------------------------------------ p7 [S] Hidden bearing (3-D)

export const p7: PuzzleDef = {
  id: 'c04-p7',
  title: 'Which arrow has these three readings?',
  style: 'mastery',
  goal: 'Along the three grid arrows, a hidden signal reads **3**, **−1** and **2**. Place the green arrow so its three readings match. Drag the tip (hold **Shift** to drag up or down), or type it.',
  hints: [
    'The reading along $(1, 0, 0)$ is $1\\cdot x + 0\\cdot y + 0\\cdot z = x$.',
    'Each reading along a grid arrow is one part of the arrow.',
    'The signal is $(3, -1, 2)$.',
  ],
  par: 3,
  view: '3d',
  onWin: S.p7Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [1.2, 0, 1], distance: 13, azimuth: -55, elevation: 24, ms: 0 });
    p.grid({ base: 0.1, main: 0.18, axis: 0.4 });
    const axes: V3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const names = ['$\\mathbf e_1$', '$\\mathbf e_2$', '$\\mathbf e_3$'];
    axes.forEach((e, i) => p.add(new Arrow([0, 0, 0], e, { color: GREY, width: 0.035, label: names[i] })));
    const shadows = axes.map(() => new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.result, width: 6, intensity: 1.3 }));
    const drops = axes.map(() => new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.white, width: 1.2, opacity: 0.45, dashed: true, dashSize: 0.12, gapSize: 0.1 }));
    p.add(...shadows, ...drops);
    const r = p.readout('Three readings');
    const gauges = ['along $\\mathbf e_1$ · want 3', 'along $\\mathbf e_2$ · want −1', 'along $\\mathbf e_3$ · want 2'].map((l) => { const g = new Gauge(l, { max: 4 }); addGauges(r, g); return g; });
    let tip: V3 = [1, 1, 1];
    let phase: 'place' | 'shake' | 'done' = 'place';
    const vin = new VectorInput({ dim: 3, values: tip, onSubmit: (v) => { dh.set(v3(v)); p.move(); void commit(); } });
    const upd = (t: V3) => {
      tip = t;
      const rd = axisReadings(t);
      rd.forEach((x, i) => gauges[i].set(x));
      axes.forEach((e, i) => {
        const f: V3 = [e[0] * rd[i], e[1] * rd[i], e[2] * rd[i]];
        shadows[i].setPoints([[0, 0, 0], f]); shadows[i].setOpacity(Math.abs(rd[i]) > 0.02 ? 1 : 0);
        drops[i].setPoints([t, f]);
      });
      vin.set(t.map((x) => Math.round(x * 100) / 100));
    };
    const dh = new VectorHandle(p, { to: tip, color: C.v, label: '$\\mathbf x$', limit: 5, onChange: upd, onCommit: () => void commit() });
    upd(tip);
    const caseA = new Arrow([0, 0, 0], [1, 0, 0], { color: C.v, opacity: 0 });
    const caseB = new Arrow([0, 0, 0], [0, 1, 0], { color: C.w, opacity: 0 });
    caseA.setOpacity(0); caseB.setOpacity(0);
    p.add(caseA, caseB);
    const commit = async (fast = false) => {
      if (phase !== 'place' || !p7Won(tip)) return;
      phase = 'shake';
      dh.setEnabled(false);
      chime();
      // Bram's Shake: is a shadow ever longer than its arrow?
      r.note('Bram shakes it: is $|\\mathbf v\\cdot\\mathbf w|$ ever more than $\\|\\mathbf v\\|\\|\\mathbf w\\|$?');
      const csG = new Gauge('$|\\mathbf v\\cdot\\mathbf w|$ out of $\\|\\mathbf v\\|\\|\\mathbf w\\|$', { max: 1 });
      addGauges(r, csG);
      let survived = 0;
      for (const [i, [sa, sb]] of P7_SHAKES.entries()) {
        const a = v3(sa), b = v3(sb);
        caseA.setOpacity(0.9); caseB.setOpacity(0.9);
        if (fast) { caseA.set([0, 0, 0], a); caseB.set([0, 0, 0], b); } else await Promise.all([caseA.moveTo(a, 300), caseB.moveTo(b, 300)]);
        const ratio = Math.abs(dot(a, b)) / (norm(a) * norm(b));
        csG.set(ratio, `${ratio.toFixed(2)} ≤ 1`);
        if (!cauchySchwarz(a, b)) break;
        survived++;
        sfx.tick(i);
        if (!fast) await wait(260);
      }
      // GDD §4.2: a Shake is evidence; the card says so and gives the reason
      r.note(`**Survived ${survived} cases.** That is evidence, not a proof. The reason: $\\mathbf v\\cdot\\mathbf w = \\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta$ (the law of cosines), and $|\\cos\\theta| \\le 1$, so the shadow $\\|\\mathbf v\\||\\cos\\theta|$ is never longer than $\\|\\mathbf v\\|$. The last pair is parallel, so its shadow is exactly as long as the arrow.`);
      phase = 'done';
      p.win();
    };
    p.dock().append(h('div', { style: 'display:flex;gap:10px;align-items:center;font-size:14px' }, h('span', { html: inline('$\\mathbf x =$') }), vin.el), h('div', { class: 'c-muted', style: 'font-size:12.5px' }, 'Press Enter in a box to place it.'));
    return {
      async showMe() { await dh.moveTo(v3(P7_READINGS), 1200); },
      async solve() { dh.set(v3(P7_READINGS)); await commit(true); },
      async wrong() { dh.set([2, -1, 3]); await commit(true); },
    };
  },
};

