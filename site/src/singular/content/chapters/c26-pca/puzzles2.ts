// Chapter 26 puzzles 5–7: how many components to keep from the record's twelve (p5), lay out the transmission
// on two components (p6: a spiral of star positions with one path through it), and spread, not labels (p7 [S]).
import type { PuzzleDef, V3 } from '../../../game/types';
import { FatSegments } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { InfLine } from '../../../gfx/shapes';
import { Knob } from '../../../kit/geom';
import { PointCloud } from '../../../kit/data';
import { h, button } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { RECORD_SV } from '../../truth';
import { dot, normalize } from '../../../math/la';
import { ptag, tag, v3 } from '../c24-spectral/act9';
import { msgLine } from '../c24-spectral/puzzles';
import { deg, rad } from '../c24-spectral/logic';
import {
  P5_K, P7_A, P7_B, P7_EIG, REC_D, fmtD, keptShare, p5Won, p6Won, p7Gap, p7Won, pairShare, record, scores,
} from './logic';
import { S } from './script';

// ------------------------------------------------------------------ p5 · how many to keep

export const p5: PuzzleDef = {
  id: 'c26-p5',
  title: 'How many components keep 95%?',
  goal: 'The bars are the record’s twelve singular values, after the mean is taken away. Each component keeps its singular value **squared**. Keep the **fewest** components that hold at least **95%** of the squared total.',
  subgoals: ['The fewest components that keep 95%'],
  hints: [
    'Square them: 81, 49, 2.25, 1, … The total is about 134.9.',
    'One component keeps 81/134.9 = 60%. Two keep (81 + 49)/134.9.',
    'Keep 2: 96.4%.',
  ],
  par: 2,
  onWin: S.p5Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view2D({ center: [-1.2, 2.0], height: 8, ms: 0 });   // clear of the objective card and the dock
    // the bars in the world: tall, labelled, kept ones yellow
    const W = 0.5, X0 = -((REC_D - 1) * W) / 2;
    const segs = new FatSegments(p.g.stage, [[[0, 0, 0], [0, 0, 0]]], { color: C.result, width: 16, opacity: 0.95 });
    const rest = new FatSegments(p.g.stage, [[[0, 0, 0], [0, 0, 0]]], { color: '#5d6b85', width: 16, opacity: 0.8 });
    p.add(segs.object, rest.object); p.onDispose(() => { segs.dispose(); rest.dispose(); });
    const H = 4.4 / RECORD_SV[0];
    RECORD_SV.forEach((s, i) => { const l = new Label(fmtD(s, 1), [X0 + i * W, s * H + 0.32, 0], { className: 'a9-tag dim' }); p.add(l.object); p.onDispose(() => l.dispose()); });
    ptag(p, 'singular values of the centred record', [0, -0.55, 0], 'dim');
    let k = 1;
    const meterFill = h('span');
    const meterMark = h('i', { style: 'left:95%' });
    const meterVal = h('span', { class: 'val' });
    const meter = h('div', { class: 'a9-meter' }, 'kept', h('div', { class: 'bar' }, meterFill, meterMark), meterVal);
    if (d === 'commander') meter.style.display = 'none';
    const r = p.readout('Components kept');
    const msg = msgLine();
    let won = false;
    const paint = () => {
      const on: [V3, V3][] = [], off: [V3, V3][] = [];
      RECORD_SV.forEach((s, i) => (i < k ? on : off).push([[X0 + i * W, 0, 0], [X0 + i * W, s * H, 0]]));
      segs.setSegments(on.length ? on : [[[0, 0, -9], [0, 0, -9]]]);
      rest.setSegments(off.length ? off : [[[0, 0, -9], [0, 0, -9]]]);
      meterFill.style.width = `${100 * keptShare(k)}%`;
      meterFill.style.background = keptShare(k) >= 0.95 ? C.good : C.accent;
      meterVal.textContent = `${fmtD(100 * keptShare(k), 1)}%`;
      r.row('k', 'components kept', `${k}`, C.result);
      if (d !== 'commander') r.row('s', 'share of the squared total', `${fmtD(100 * keptShare(k), 1)}%`, keptShare(k) >= 0.95 ? C.good : C.white);
    };
    const chips = h('div', { class: 'a9-chips' });
    const chipEls: HTMLButtonElement[] = [];
    for (let kk = 1; kk <= REC_D; kk++) {
      const b = h('button', { class: `a9-chip ${kk === 1 ? 'on' : ''}`, type: 'button' }, String(kk)) as HTMLButtonElement;
      b.addEventListener('click', () => { k = kk; p.move(); chipEls.forEach((x, i) => x.classList.toggle('on', i + 1 === kk)); paint(); sfx.click(); });
      chips.append(b); chipEls.push(b);
    }
    const keep = () => {
      if (won) return;
      p.move();
      if (p5Won(k)) { won = true; p.subgoal(0); msg.say(`${k} components keep ${fmtD(100 * keptShare(k), 1)}%: the fewest that reach 95%.`, 'good'); p.win(); return; }
      sfx.miss();
      msg.say(keptShare(k) < 0.95 ? `${fmtD(100 * keptShare(k), 1)}%: not yet 95%.` : `${fmtD(100 * keptShare(k), 1)}% is enough, but fewer components would do. The link carries two numbers per entry.`, 'bad');
    };
    p.dock().append(h('div', { class: 'a9-kick' }, 'Keep the first k components'), chips, meter, h('div', { class: 'a9-btns' }, button('Keep these', () => keep(), { cls: 'primary small' })), msg.el);
    paint();
    const setK = (kk: number) => { k = kk; chipEls.forEach((x, i) => x.classList.toggle('on', i + 1 === kk)); paint(); };
    return {
      async showMe() { setK(1); await wait(600); setK(P5_K); await wait(500); keep(); },
      solve() { setK(P5_K); keep(); },
      wrong() { setK(3); keep(); },
    };
  },
};

// ------------------------------------------------------------------ p6 · send it

export const p6: PuzzleDef = {
  id: 'c26-p6',
  title: 'Which two numbers per entry go out?',
  goal: 'The link carries **two numbers per entry**. Put one component in each channel and look at the record as the other end will see it. Then lock the layout.',
  subgoals: ['Lock a layout that keeps the most'],
  hints: [
    'Each channel sends one component: every entry’s coordinate along it.',
    'The share readout says how much of the record the layout keeps.',
    'Components 1 and 2: 96.4%. The entries lie on a spiral.',
  ],
  par: 3,
  onWin: S.p6Win,
  setup(p) {
    void p.g.stage.view2D({ center: [0, 0], height: 8.4, ms: 0 });
    const rec = record();
    const cloud = new PointCloud(p, { points: rec.X.map(() => [0, 0, 0]), color: C.accent, size: 0.02, glow: 0.25, core: 1.2, opacity: 0.8 });
    const path = new PointCloud(p, { points: rec.path.map(() => [0, 0, 0]), color: C.result, size: 0.05, glow: 0.5, core: 1.6 });
    const pathLine = new FatSegments(p.g.stage, [[[0, 0, 0], [0, 0, 0]]], { color: C.result, width: 3, opacity: 0.9 });
    pathLine.object.traverse((o) => { o.renderOrder = 6; o.frustumCulled = false; });   // over the dense arms
    p.add(pathLine.object); p.onDispose(() => pathLine.dispose());
    const ax = [tag('', [3.75, -0.35, 0], 'dim'), tag('', [0, 3.4, 0], 'dim')];
    ax.forEach((t) => { p.add(t.object); p.onDispose(() => t.dispose()); });
    let chosen: number[] = [];
    const r = p.readout('The layout');
    const msg = msgLine();
    let won = false;
    const preview = async (ms: number) => {
      if (chosen.length < 2) { cloud.setOpacity(chosen.length ? 0.35 : 0.15); path.group.visible = false; pathLine.object.visible = false; }
      const comps = chosen.length === 2 ? chosen : chosen.length === 1 ? [chosen[0], chosen[0]] : [10, 11];
      const sc = scores(comps);
      const m = Math.max(...sc.map((q) => Math.max(Math.abs(q[0]), Math.abs(q[1])))) || 1;
      const s = 3.3 / m;
      const pts = sc.map((q) => [q[0] * s, chosen.length === 1 ? 0 : q[1] * s, 0]);
      await cloud.to(pts, ms);
      if (chosen.length === 2) {
        cloud.setOpacity(0.8);
        const pp = rec.path.map((i) => pts[i]);
        path.set(pp); path.group.visible = true;
        const segs: [V3, V3][] = [];
        for (let i = 1; i < pp.length; i++) segs.push([[pp[i - 1][0], pp[i - 1][1], 0.03], [pp[i][0], pp[i][1], 0.03]]);
        pathLine.setSegments(segs); pathLine.object.visible = true;
      }
      ax[0].set(chosen[0] !== undefined ? `component ${chosen[0] + 1} →` : '');
      ax[1].set(chosen[1] !== undefined ? `component ${chosen[1] + 1} ↑` : '');
      r.row('c', 'components in the channels', chosen.length ? chosen.map((c) => `${c + 1}`).join(' and ') : 'none', C.result);
      r.row('s', 'share of the record kept', chosen.length === 2 ? `${fmtD(100 * pairShare(chosen), 1)}%` : '—', chosen.length === 2 && pairShare(chosen) > 0.95 ? C.good : C.white);
    };
    const chips = h('div', { class: 'a9-chips' });
    const chipEls: HTMLButtonElement[] = [];
    RECORD_SV.forEach((sv, i) => {
      const b = h('button', { class: 'a9-chip', type: 'button' }, `${i + 1} · ${fmtD(sv, 1)}`) as HTMLButtonElement;
      b.addEventListener('click', () => {
        if (won) return;
        p.move(); sfx.click();
        if (chosen.includes(i)) chosen = chosen.filter((c) => c !== i);
        else chosen = [...chosen, i].slice(-2);
        chipEls.forEach((x, k) => x.classList.toggle('on', chosen.includes(k)));
        void preview(p.g.headless ? 1 : 700);
      });
      chips.append(b); chipEls.push(b);
    });
    const lock = () => {
      if (won) return;
      p.move();
      if (chosen.length < 2) { msg.say('Two channels: choose two components.', 'bad'); sfx.miss(); return; }
      if (p6Won(chosen)) { won = true; p.subgoal(0); msg.say(`Components 1 and 2 keep ${fmtD(100 * pairShare(chosen), 1)}% of the record. The entries lie on a spiral, with one path marked.`, 'good'); p.win(); return; }
      sfx.miss();
      msg.say(`This layout keeps ${fmtD(100 * pairShare(chosen), 1)}% of the record. Another keeps much more.`, 'bad');
    };
    p.dock().append(h('div', { class: 'a9-kick' }, 'Components (singular value) · two channels'), chips, h('div', { class: 'a9-btns' }, button('Lock the layout', () => lock(), { cls: 'primary small' })), msg.el);
    void preview(0);
    const pick = async (ids: number[]) => { chosen = ids; chipEls.forEach((x, k) => x.classList.toggle('on', chosen.includes(k))); await preview(p.g.headless ? 1 : 900); };
    return {
      async showMe() { await pick([10, 11]); await wait(500); await pick([0, 1]); await wait(400); lock(); },
      async solve() { await pick([0, 1]); lock(); },
      async wrong() { await pick([0, 2]); lock(); },
    };
  },
};

// ------------------------------------------------------------------ p7 [S] · spread, not labels

export const p7: PuzzleDef = {
  id: 'c26-p7',
  title: 'Does the first direction tell the two kinds apart?',
  goal: 'Two kinds of debris, side by side. The dashed line is the first principal direction. Turn the yellow line until the shadows of the two kinds **do not overlap**.',
  subgoals: ['A line whose shadows separate the two kinds'],
  hints: ['The first direction runs along both groups: their shadows pile on top of each other.', 'Try the direction across the groups.', 'The second principal direction, along the first axis.'],
  par: 2,
  onWin: S.p7Win,
  setup(p) {
    void p.g.stage.view2D({ center: [0, 0], height: 9.6, ms: 0 });
    p.grid({ main: 0.12, base: 0, axis: 0.3 });
    const ca = new PointCloud(p, { points: P7_A, color: '#c9d4e6', size: 0.05, glow: 0.3, core: 1.3 });
    const cb = new PointCloud(p, { points: P7_B, color: C.orange, size: 0.05, glow: 0.3, core: 1.3 });
    void ca; void cb;
    const first = new InfLine(p.g.stage, [0, 0, 0], v3(P7_EIG.vectors[0]), { color: C.white, width: 1.4, opacity: 0.45, dashed: true, length: 20 });
    const line = new InfLine(p.g.stage, [0, 0, 0.01], [1, 0, 0], { color: C.result, width: 1.4, opacity: 0.6, length: 20 });
    p.add(first.object, line.object); p.onDispose(() => { first.dispose(); line.dispose(); });
    ptag(p, 'first direction', [0.75, -3.9, 0], 'dim');
    const sa = new PointCloud(p, { points: P7_A.map(() => [0, 0, 0]), color: '#c9d4e6', size: 0.035, opacity: 0.7 });
    const sb = new PointCloud(p, { points: P7_B.map(() => [0, 0, 0]), color: C.orange, size: 0.035, opacity: 0.7 });
    const R = 3.6;
    let theta = 80;
    const r = p.readout('The two kinds');
    const msg = msgLine();
    let won = false;
    const paint = () => {
      const u = [Math.cos(rad(theta)), Math.sin(rad(theta))];
      line.set([0, 0, 0.01], v3(u));
      const proj = (P: number[][]) => P.map((x) => { const t = dot(x, u); return [t * u[0], t * u[1], 0.02]; });
      sa.set(proj(P7_A)); sb.set(proj(P7_B));
      const gap = p7Gap(u);
      r.row('g', gap > 0 ? 'gap between the shadows' : 'overlap of the shadows', fmtD(Math.abs(gap)), gap > 0 ? C.good : C.orange);
    };
    const knob = new Knob(p, [R * Math.cos(rad(theta)), R * Math.sin(rad(theta)), 0.03], {
      color: C.result, size: 0.08,
      constrain: (q) => { const a = deg(Math.atan2(q.y, q.x)); theta = a; q.set(R * Math.cos(rad(a)), R * Math.sin(rad(a)), 0.03); return q; },
      onMove: () => paint(),
      onEnd: () => check(),
    });
    const check = () => { if (won) return; if (p7Won([Math.cos(rad(theta)), Math.sin(rad(theta))])) { won = true; p.subgoal(0); msg.say('Separated, along the second direction. The first direction has the most spread. The labels of the two kinds play no part in it.', 'good'); p.win(); } };
    p.dock().append(h('div', { class: 'a9-note' }, 'Drag the yellow handle to turn the line. The small dots are the shadows of each kind on it.'), msg.el);
    paint();
    void normalize;
    return {
      async showMe() { const a0 = theta; await animate(1300, (k) => { theta = a0 + (0 - a0) * k; knob.at([R * Math.cos(rad(theta)), R * Math.sin(rad(theta)), 0.03]); paint(); }, ease.inOut); check(); },
      solve() { theta = 0; knob.at([R, 0, 0.03]); paint(); check(); },
      wrong() { theta = 90; knob.at([0, R, 0.03]); paint(); check(); },
    };
  },
};
