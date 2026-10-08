// Chapter 5 puzzles (GDD §6.4, Ch 5): RAISE an arrow straight out of two edges. The win test of each
// puzzle is a pure function in logic.ts.
import {
  BufferAttribute, BufferGeometry, Color, ConeGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, Quaternion, Vector3,
} from 'three';
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { InfLine, Parallelogram } from '../../../gfx/shapes';
import { Dot } from '../../../gfx/markers';
import { burst } from '../../../gfx/fx';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { h, inline, button } from '../../../ui/ui';
import { Slider, VectorInput } from '../../../ui/widgets';
import { VectorHandle } from '../../../kit/handle';
import { AngleArc, RightAngle } from '../../../kit/geom';
import { StepWorksheet } from '../../../kit/steps';
import { angle, cross, dot, norm } from '../../../math/la';
import { nice } from '../../../math/frac';
import { makeLantern } from '../../common/set';
import { Gauge, addGauges, chime, fmtNum } from '../c04-dot/meter';
import {
  DOOR, DOOR_P, DOOR_Q, DOOR_R, HULL_TRIS, P1_AREA, P1_V, P1_W, P2_TURN, P3_A, P3_B, P3_N, P3_SQ, P6_V, P7_A, P7_B,
  P7_C, applyRule, deg, fmt, headingAfter, hullTriangles, outwardCount, outwardReading, p1Won, p2Won, p3Answer, p3Won,
  p5Won, p6W, p6Won, p7Won, raised, rotateAbout, triNormal, turns, type Order, type Rule, type Tri,
} from './logic';
import { S } from './script';

const FROST = '#e8f0ff';
const v3 = (v: readonly number[]): V3 => [v[0], v[1], v[2] ?? 0];
const unit = (v: readonly number[]): V3 => { const l = Math.hypot(v[0], v[1], v[2] ?? 0) || 1; return [v[0] / l, v[1] / l, (v[2] ?? 0) / l]; };
const tolOf = (p: PuzzleCtx) => (p.difficulty === 'commander' ? 0.01 : 0.05);

function lab(p: PuzzleCtx, text: string, at: V3, o: { color?: string; size?: number; className?: string } = {}): Label {
  const l = new Label(text, at, o);
  p.add(l);
  return l;
}

/** The panel two edges shade, with its edges (frosted white, like the unit square). */
function panel(p: PuzzleCtx, a: V3, b: V3, opacity = 0.2): Parallelogram {
  const par = new Parallelogram(p.g.stage, a, b, { color: FROST, opacity, edge: 1.4 });
  p.add(par);
  return par;
}

/** A dashed drop from a 3-D tip to the floor and a dot there: depth cue for dragging in 3-D. */
function floorGuide(p: PuzzleCtx): (tip: V3) => void {
  const line = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 1]], { color: C.white, width: 1.2, opacity: 0.35, dashed: true, dashSize: 0.12, gapSize: 0.1 });
  const dot0 = new Dot([0, 0, 0], { color: C.white, size: 0.05, glow: 0.6 });
  p.add(line, dot0);
  return (t) => {
    const show = Math.abs(t[2]) > 0.05;
    line.setOpacity(show ? 0.35 : 0); dot0.setOpacity(show ? 0.7 : 0);
    line.setPoints([t, [t[0], t[1], 0]]); dot0.at([t[0], t[1], 0]);
  };
}

/** A curled arrow around an axis: the turning sense of the right-hand rule. */
function curl(p: PuzzleCtx, axis: V3, at: number, r: number, color = C.white): Group {
  const g = new Group();
  const k = unit(axis);
  const e1 = unit(Math.abs(k[2]) < 0.9 ? cross(k, [0, 0, 1]) : cross(k, [1, 0, 0]));
  const e2 = v3(cross(k, e1));
  const pts: V3[] = [];
  const span = Math.PI * 1.6;
  for (let i = 0; i <= 48; i++) {
    const t = (span * i) / 48;
    pts.push([0, 1, 2].map((j) => k[j] * at + r * (e1[j] * Math.cos(t) + e2[j] * Math.sin(t))) as V3);
  }
  const line = new FatLine(p.g.stage, pts, { color, width: 2.4, intensity: 1.4 });
  const head = new Mesh(new ConeGeometry(0.09, 0.26, 16), new MeshBasicMaterial({ color: new Color(color).multiplyScalar(1.6) }));
  const end = pts[pts.length - 1], prev = pts[pts.length - 3];
  head.position.set(...end);
  head.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(end[0] - prev[0], end[1] - prev[1], end[2] - prev[2]).normalize());
  g.add(line.object, head);
  p.add(g);
  p.onDispose(() => { line.dispose(); head.geometry.dispose(); head.material.dispose(); });
  return g;
}

// ------------------------------------------------------------------ p1 [D] Find the axis (RAISE)

export const p1: PuzzleDef = {
  id: 'c05-p1',
  title: 'Which arrow sticks straight out of the panel?',
  goal: 'Edges $\\mathbf v = (2, 0, 0)$ and $\\mathbf w = (1, 3, 0)$ shade a panel. **Raise** the yellow arrow $\\mathbf n$ so it reads **0** against both edges and is **as long as the panel\'s area**. Drag its tip (hold **Shift** to drag up or down) or type it.',
  hints: [
    'Reading 0 against an edge means a right angle to it. An arrow at a right angle to both floor edges stands straight up or straight down.',
    'The panel is a parallelogram: base 2, height 3.',
    'Area 6, straight up: $\\mathbf n = (0, 0, 6)$.',
  ],
  par: 3,
  view: '3d',
  onWin: S.p1Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [1.0, 1.2, 2.9], distance: 21, azimuth: -58, elevation: 20, ms: 0 });
    p.grid({ base: 0.1, main: 0.18, axis: 0.4 });
    const v = v3(P1_V), w = v3(P1_W);
    panel(p, v, w);
    p.add(new Arrow([0, 0, 0], v, { color: C.v, label: '$\\mathbf v$' }), new Arrow([0, 0, 0], w, { color: C.w, label: '$\\mathbf w$' }));
    if (p.difficulty !== 'commander') lab(p, 'area 6', [1.5, 1.5, 0.05], { className: 'small' });
    const ra = new RightAngle(p, [0, 0, 0], v, [0, 0, 1], 0.32, { color: C.white });
    const rb = new RightAngle(p, [0, 0, 0], w, [0, 0, 1], 0.32, { color: C.white });
    ra.show(false); rb.show(false);
    const guide = floorGuide(p);
    const r = p.readout('RAISE');
    const gv = new Gauge('reading of $\\mathbf n$ against $\\mathbf v$', { max: 12 });
    const gw = new Gauge('reading of $\\mathbf n$ against $\\mathbf w$', { max: 30 });
    addGauges(r, gv, gw);
    const tol = tolOf(p);
    let n: V3 = [1, 1, 2];
    let won = false;
    const ghost = new Arrow([0, 0, 0], [0, 0, -6], { color: C.result, width: 0.03, opacity: 0, label: '$(0, 0, -6)$' });
    ghost.setOpacity(0);
    p.add(ghost);
    // the gap a miss leaves: the sideways part of n, or the missing (or extra) length along n
    const gap = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 1]], { color: C.orange, width: 1.8, opacity: 0, dashed: true, dashSize: 0.14, gapSize: 0.1 });
    p.add(gap);
    let warnedLen = false;
    // cadet: both meters read live while dragging; navigator and commander read them when the arrow is set
    const live = p.difficulty === 'cadet';
    const meters = (t: V3, quiet = false) => {
      const hv = gv.set(dot(t, v), undefined, tol), hw = gw.set(dot(t, w), undefined, tol);
      if ((hv || hw) && norm(t) > 0.1 && !quiet) chime();
      ra.show(Math.abs(dot(t, v)) <= tol && norm(t) > 0.3); ra.set([0, 0, 0], v, t);
      rb.show(Math.abs(dot(t, w)) <= tol && norm(t) > 0.3); rb.set([0, 0, 0], w, t);
    };
    const upd = (t: V3) => {
      n = t;
      gap.setOpacity(0);
      guide(t);
      if (live) meters(t);
      r.row('n', '$\\mathbf n$', fmt(t.map((x) => Math.round(x * 100) / 100)), C.result);
      r.row('len', 'length of $\\mathbf n$', fmtNum(norm(t)));
      if (p.difficulty !== 'commander') r.row('area', 'area of the panel', nice(P1_AREA));
      vin.set(t.map((x) => Math.round(x * 100) / 100));
    };
    /** A miss teaches: the two readings, or the length against the area, and the gap drawn. */
    const miss = () => {
      const rv = dot(n, v), rw = dot(n, w), L = norm(n);
      sfx.miss();
      if (Math.abs(rv) > tol || Math.abs(rw) > tol) {
        p.bark('lantern', `Reads ${fmtNum(rv)} against v and ${fmtNum(rw)} against w. Both must read 0.`);
        gap.setPoints([n, [0, 0, n[2]]]);
        gap.setOpacity(0.8);
        return;
      }
      const area = p.difficulty === 'commander' ? ' It must be as long as the panel\'s area.' : ` The panel's area is ${nice(P1_AREA)}.`;
      p.bark('lantern', `Reads 0 against both edges, but it is ${fmtNum(L)} long.${area}`);
      if (L > 1e-6 && p.difficulty !== 'commander') { gap.setPoints([n, v3(n.map((x) => (x * P1_AREA) / L))]); gap.setOpacity(0.8); }
    };
    /** `explicit`: the Raise button or a typed arrow. A drag release only speaks up once, for the near miss. */
    const commit = async (explicit = false) => {
      const hit = !won && p1Won(n, tol);
      const nearMiss = !hit && !won && Math.abs(dot(n, v)) <= tol && Math.abs(dot(n, w)) <= tol;
      const speak = !hit && !won && (explicit || (nearMiss && !warnedLen));
      meters(n, speak);
      if (speak) { if (nearMiss) warnedLen = true; miss(); }
      if (!hit) return;
      won = true;
      nh.setEnabled(false);
      chime();
      void burst(p.g.stage, n, C.result, 50, 2, false);
      await animate(600, (k) => ghost.setOpacity(0.45 * k), ease.out);
      r.note('$(0, 0, -6)$ also reads 0 against both and is 6 long. The **order** of the edges picks one of the two.');
      p.win();
    };
    const vin = new VectorInput({ dim: 3, values: n, onSubmit: (x) => { nh.set(v3(x)); p.move(); void commit(true); } });
    const nh = new VectorHandle(p, { to: n, color: C.result, label: '$\\mathbf n$', limit: 8, onChange: upd, onCommit: () => void commit() });
    p.dock().append(h('div', { style: 'display:flex;gap:10px;align-items:center;font-size:14px' }, h('span', { html: inline('$\\mathbf n =$') }), vin.el,
      button('Raise', () => { nh.set(v3(vin.get())); p.move(); void commit(true); }, { cls: 'primary small' })));
    upd(n);
    meters(n);
    return {
      // the demo passes through (0, 0, 2) on the way up: no near-miss bark for it
      async showMe() { warnedLen = true; await nh.moveTo([0, 0, 2], 700); await nh.moveTo([0, 0, 6], 800); },
      async solve() { nh.set([0, 0, 6]); await commit(true); },
      async wrong() { nh.set([0, 0, 5]); await commit(true); nh.set([6, 0, 0]); await commit(true); },
    };
  },
};

// ------------------------------------------------------------------ p2 Which order?

export const p2: PuzzleDef = {
  id: 'c05-p2',
  title: 'Which way round does the Lantern spin?',
  goal: 'The heading is $\\mathbf v$ (green); the ark lies along $\\mathbf w$ (red). Choose the **order** of the edges, which picks the raised arrow, then **Spin** the *Lantern* about it. The heading must swing onto the target.',
  predict: {
    prompt: 'Raising from green then red gives $(0, 0, 6)$; from red then green gives $(0, 0, -6)$. Which one turns the heading toward the ark?',
    choices: [{ id: 'vw', text: 'Green then red: $(0, 0, 6)$' }, { id: 'wv', text: 'Red then green: $(0, 0, -6)$' }, { id: 'both', text: 'Either one' }],
    answer: 'vw',
    reveal: 'Spinning about $(0, 0, 6)$ turns anticlockwise seen from above: from $\\mathbf v$ toward $\\mathbf w$. The other arrow turns the same amount the other way, and lands $143°$ from the ark.',
  },
  hints: [
    'Both raised arrows stand on the same line. They point opposite ways, so they spin the ship opposite ways.',
    'Curl the fingers of your right hand from the first edge to the second: the thumb points along the raised arrow, and the ship turns the way the fingers curl.',
    'Choose **green then red**.',
  ],
  par: 2,
  view: '3d',
  onWin: S.p2Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [0.6, 1.0, 2.6], distance: 19, azimuth: -70, elevation: 24, ms: 0 });
    p.grid({ base: 0.1, main: 0.18, axis: 0.4 });
    const v = v3(P1_V), w = v3(P1_W);
    panel(p, v, w, 0.14);
    const ship = makeLantern(p.g.stage, 0.24);
    p.add(ship);
    ship.setThrust(0.12);
    ship.face([1, 0, 0]);
    const q0 = ship.object.quaternion.clone();
    const target = new Dot(v3(w.map((x) => x * 1.9)), { color: '#59e1ff', size: 0.16, glow: 2, label: 'the ark', labelOffset: [0, -22] });
    p.add(target);
    const head = new Arrow([0, 0, 0.02], v, { color: C.v, label: '$\\mathbf v$' });
    p.add(head, new Arrow([0, 0, 0.02], w, { color: C.w, label: '$\\mathbf w$' }));
    const axisA = new Arrow([0, 0, 0], [0, 0, 6], { color: C.result, label: ' ' });
    axisA.setOpacity(0);
    p.add(axisA);
    const arc = new AngleArc(p, [0, 0, 0.02], v, w, { radius: 0.8, opacity: 0.6, label: `$${Math.round(deg(P2_TURN))}°$` });
    const gap = new AngleArc(p, [0, 0, 0.03], v, w, { label: ' ', radius: 1.2, color: C.orange, fill: 0.12 });
    gap.show(false);
    let order: Order | null = null;
    let busy = false;
    const blind = p.difficulty === 'commander';
    const r = p.readout('Spin axis');
    const showAxis = () => {
      if (!order) return;
      const n = v3(raised(order));
      axisA.set([0, 0, 0], n);
      axisA.setLabel(order === 'vw' ? '$\\mathbf v$ then $\\mathbf w$' : '$\\mathbf w$ then $\\mathbf v$');
      axisA.setOpacity(blind ? 0 : 1);
      r.row('o', 'order', order === 'vw' ? 'green, then red' : 'red, then green');
      r.row('n', 'raised arrow', blind ? '?' : fmt(n), C.result);
    };
    r.row('turn', 'turn by', `${Math.round(deg(P2_TURN))}°`);
    const bVW = button('Green, then red', () => { order = 'vw'; p.move(); sync(); showAxis(); }, { cls: 'small' });
    const bWV = button('Red, then green', () => { order = 'wv'; p.move(); sync(); showAxis(); }, { cls: 'small' });
    const sync = () => { bVW.classList.toggle('primary', order === 'vw'); bWV.classList.toggle('primary', order === 'wv'); };
    let rhr: Group | null = null;
    const setTurn = (o: Order, t: number) => {
      const k = new Vector3(...unit(raised(o)));
      ship.object.quaternion.copy(new Quaternion().setFromAxisAngle(k, t).multiply(q0));
      head.set([0, 0, 0.02], v3(rotateAbout(P1_V, raised(o), t)));
    };
    const spin = async () => {
      if (busy || p.won) return;
      if (!order) { p.bark('wren', 'Pick an order first. Which edge comes first?'); return; }
      busy = true;
      p.move();
      const o = order;
      if (blind) { axisA.setOpacity(1); r.row('n', 'raised arrow', fmt(raised(o)), C.result); }
      gap.show(false);
      arc.show(false);
      sfx.thrust(1.2);
      ship.setThrust(0.7);
      await animate(1500, (k) => setTurn(o, P2_TURN * k), ease.inOut);
      ship.setThrust(0.12);
      if (p2Won(o)) {
        chime();
        rhr = curl(p, [0, 0, 1], 2.2, 0.75, C.white);
        lab(p, 'fingers curl from $\\mathbf v$ to $\\mathbf w$; the thumb points along the raised arrow', [-2.6, -1.2, 2.6], { className: 'small' });
        void burst(p.g.stage, v3(w.map((x) => x * 1.9)), '#59e1ff', 60, 2.5, false);
        void rhr;
        p.win();
      } else {
        const now = headingAfter(o);
        gap.set(v3(now), w);
        gap.setLabel(`$${Math.round(deg(angle(now, P1_W)))}°$`);
        gap.show(true);
        sfx.miss();
        p.bark('lantern', `Spun the wrong way. The heading is now ${Math.round(deg(angle(now, P1_W)))}° from the ark.`);
        await wait(1100);
        await animate(800, (k) => setTurn(o, P2_TURN * (1 - k)), ease.inOut);
        arc.show(true);
      }
      busy = false;
    };
    p.dock().append(h('div', { class: 'kicker' }, 'Order of the edges'), h('div', { style: 'display:flex;gap:8px' }, bVW, bWV), button('Spin', () => void spin(), { cls: 'primary small' }));
    return {
      async showMe() { order = 'vw'; sync(); showAxis(); await wait(300); await spin(); },
      async solve() { order = 'vw'; showAxis(); await spin(); },
      async wrong() { order = 'wv'; showAxis(); await spin(); },
    };
  },
};

// ------------------------------------------------------------------ p3 [D] Where the formula comes from

export const p3: PuzzleDef = {
  id: 'c05-p3',
  title: 'Where do the three numbers come from?',
  goal: 'Edges $\\mathbf a = (1, 2, 0)$ and $\\mathbf b = (0, 1, 3)$. Every $\\mathbf n$ with $\\mathbf n\\cdot\\mathbf a = 0$ and $\\mathbf n\\cdot\\mathbf b = 0$ lies on the glowing line. Find the one the **2 × 2 pattern** gives, and its length.',
  hints: [
    '$\\mathbf n\\cdot\\mathbf a = n_1 + 2n_2 = 0$ and $\\mathbf n\\cdot\\mathbf b = n_2 + 3n_3 = 0$. Two equations, three unknowns: a whole line of answers.',
    'Each part of the pattern skips its own axis: first part $a_2b_3 - a_3b_2$, second $a_3b_1 - a_1b_3$, third $a_1b_2 - a_2b_1$.',
    'The pattern gives $(6, -3, 1)$; its squared length is $5 \\times 10 - 2^2 = 46$.',
  ],
  par: 6,
  view: '3d',
  onWin: S.p3Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [1.6, 0.4, 1.4], distance: 22, azimuth: -40, elevation: 22, ms: 0 });
    p.grid({ base: 0.1, main: 0.16, axis: 0.4 });
    const a = v3(P3_A), b = v3(P3_B);
    panel(p, a, b, 0.2);
    p.add(new Arrow([0, 0, 0], a, { color: C.v, label: '$\\mathbf a$' }), new Arrow([0, 0, 0], b, { color: C.w, label: '$\\mathbf b$' }));
    const line = new InfLine(p.g.stage, [0, 0, 0], v3(P3_N), { color: C.result, width: 1.6, opacity: 0.35, dashed: true });
    p.add(line);
    const ghost = new Arrow([0, 0, 0], v3(P3_N), { color: C.result, width: 0.03, opacity: p.difficulty === 'cadet' ? 0.35 : 0, label: p.difficulty === 'cadet' ? 'the 2 × 2 pattern' : '' });
    p.add(ghost);
    const nA = new Arrow([0, 0, 0], v3(p3Answer(0.4)), { color: C.result, label: '$\\mathbf n$' });
    p.add(nA);
    const r = p.readout('Two equations');
    r.row('e1', '$\\mathbf n\\cdot\\mathbf a = 0$', '$n_1 + 2n_2 = 0$');
    r.row('e2', '$\\mathbf n\\cdot\\mathbf b = 0$', '$n_2 + 3n_3 = 0$');
    const ga = new Gauge('reading against $\\mathbf a$', { max: 10 });
    const gb = new Gauge('reading against $\\mathbf b$', { max: 10 });
    addGauges(r, ga, gb);
    let t = 0.4;
    let done: Promise<void> | null = null;
    const upd = () => {
      const n = p3Answer(t);
      nA.set([0, 0, 0], v3(n));
      ga.set(dot(n, P3_A)); gb.set(dot(n, P3_B));
      r.row('n', '$\\mathbf n$', fmt(n.map((x) => Math.round(x * 100) / 100)), C.result);
      r.row('l', 'length squared', fmtNum(dot(n, n)));
      if (p.difficulty === 'cadet') r.row('pat', 'the 2 × 2 pattern', fmt(P3_N));
    };
    const finish = (): Promise<void> => (done ??= (async () => {
      const t0 = t;
      await animate(700, (k) => { t = t0 + (1 - t0) * k; upd(); }, ease.inOut);
      t = 1; upd();
      p.add(new RightAngle(p, [0, 0, 0], a, v3(P3_N), 0.4), new RightAngle(p, [0, 0, 0], b, v3(P3_N), 0.4));
      r.note(`$\\mathbf a\\times\\mathbf b = (6, -3, 1)$, length $\\sqrt{${P3_SQ}} \\approx ${Math.sqrt(P3_SQ).toFixed(2)}$: the area of the panel.`);
      chime();
      p.win();
    })());
    let solveD: () => Promise<void>;
    if (p.difficulty === 'cadet') {
      const slider = new Slider({ label: 'slide $\\mathbf n$ along the line', min: -1.5, max: 1.5, step: 0.05, value: t, format: (x) => x.toFixed(2), onInput: (x) => { t = x; upd(); } });
      slider.el.querySelector('input')!.addEventListener('change', () => { p.move(); if (p3Won(t)) void finish(); else if (Math.abs(t + 1) < 0.03) p.bark('lantern', 'Right length, other way. The pattern\'s first part is +6.'); });
      p.dock().append(h('div', { class: 'kicker' }, 'Watch, then one drag'), slider.el, h('div', { class: 'c-muted', style: 'font-size:13px' }, 'Both readings stay 0 everywhere on the line. Stop on the 2 × 2 pattern.'));
      solveD = async () => { t = 1; slider.set(1, false); await finish(); };
    } else {
      const ws = new StepWorksheet(p, {
        title: p.difficulty === 'navigator' ? 'By hand · each step is checked' : 'By hand · only the last line is checked',
        steps: [
          { prompt: 'Take $n_3 = 1$. From $n_2 + 3n_3 = 0$: $n_2 =$', answer: -3 },
          { prompt: 'From $n_1 + 2n_2 = 0$: $n_1 =$', answer: 6 },
          { prompt: 'The pattern $(a_2b_3 - a_3b_2,\\ a_3b_1 - a_1b_3,\\ a_1b_2 - a_2b_1)$', answer: [6, -3, 1], mistakes: [[[-6, 3, -1], 'That is $\\mathbf b \\times \\mathbf a$: the order flipped every sign.']] },
          { prompt: '$\\|\\mathbf a\\|^2\\|\\mathbf b\\|^2 - (\\mathbf a\\cdot\\mathbf b)^2 = 5 \\cdot 10 - 2^2$', answer: P3_SQ, mistakes: [[50, 'Subtract $(\\mathbf a\\cdot\\mathbf b)^2 = 4$.'], [48, 'Square the dot product: $2^2 = 4$.']] },
        ],
        onDone: () => void finish(),
      });
      solveD = async () => { ws.solve(); await done; };
    }
    upd();
    return {
      async showMe() { await solveD(); },
      async solve() { await solveD(); },
      async wrong() { t = -1; upd(); },
    };
  },
};

// ------------------------------------------------------------------ p4 [H] [X4] The hangar door

export const p4: PuzzleDef = {
  id: 'c05-p4',
  title: 'Which way does the hangar door face, and how big is it?',
  goal: 'The door\'s corners are $P = (1, 0, 0)$, $Q = (0, 2, 0)$, $R = (0, 0, 3)$. Work out its normal $(Q - P)\\times(R - P)$ and its area by hand, for the patch order.',
  hints: [
    'The edges start at $P$: $Q - P = (-1, 2, 0)$ and $R - P = (-1, 0, 3)$.',
    'Cross them: $(2 \\cdot 3 - 0 \\cdot 0,\\ 0 \\cdot (-1) - (-1) \\cdot 3,\\ (-1) \\cdot 0 - 2 \\cdot (-1)) = (6, 3, 2)$.',
    'Its length is $\\sqrt{36 + 9 + 4} = 7$. The door is half the parallelogram: $3.5$.',
  ],
  par: 6,
  view: '3d',
  onWin: S.p4Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [0.9, 0.9, 1.2], distance: 13, azimuth: 30, elevation: 24, ms: 0 });
    p.grid({ base: 0.1, main: 0.16, axis: 0.45 });
    const P = v3(DOOR_P), Q = v3(DOOR_Q), R = v3(DOOR_R);
    // the door: a frosted triangle with a cyan edge
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array([...P, ...Q, ...R]), 3));
    const tri = new Mesh(g, new MeshBasicMaterial({ color: new Color(FROST), transparent: true, opacity: 0.2, side: DoubleSide, depthWrite: false }));
    p.add(tri);
    p.onDispose(() => { g.dispose(); tri.material.dispose(); });
    p.add(new FatLine(p.g.stage, [P, Q, R, P], { color: '#59e1ff', width: 2.2, intensity: 1.4 }));
    lab(p, '$P$', [P[0] + 0.3, P[1] - 0.25, 0], { size: 18 }); lab(p, '$Q$', [Q[0], Q[1] + 0.3, 0], { size: 18 }); lab(p, '$R$', [R[0] - 0.3, R[1], R[2] + 0.25], { size: 18 });
    const ePQ = new Arrow(P, Q, { color: C.v, label: '$Q - P$', labelAt: 'mid' });
    const ePR = new Arrow(P, R, { color: C.w, label: '$R - P$', labelAt: 'mid' });
    const cen: V3 = [(P[0] + Q[0] + R[0]) / 3, (P[1] + Q[1] + R[1]) / 3, (P[2] + Q[2] + R[2]) / 3];
    const nA = new Arrow(cen, [cen[0] + 6 / 7 * 2, cen[1] + 3 / 7 * 2, cen[2] + 2 / 7 * 2], { color: C.result, label: 'normal $(6, 3, 2)$, scaled' });
    const showEdges = p.difficulty === 'cadet';
    ePQ.setOpacity(showEdges ? 1 : 0); ePR.setOpacity(showEdges ? 1 : 0); nA.setOpacity(0);
    p.add(ePQ, ePR, nA);
    const r = p.readout('Patch order · hangar door');
    r.row('n', 'normal', '—'); r.row('a', 'area', '—');
    let finished: Promise<void> | null = null;
    const ws = new StepWorksheet(p, {
      steps: [
        { prompt: '$Q - P$', answer: DOOR.pq, mistakes: [[[1, -2, 0], 'That points from $Q$ to $P$. The edge from $P$ to $Q$ is $Q - P$.']] },
        { prompt: '$R - P$', answer: DOOR.pr, mistakes: [[[1, 0, -3], 'That points from $R$ to $P$. Use $R - P$.']] },
        { prompt: '$(Q - P)\\times(R - P)$', answer: DOOR.n, mistakes: [[[6, 0, 0], 'That crosses the corner positions $Q$ and $R$. The edges start at $P$.'], [[-6, -3, -2], 'That is $(R - P)\\times(Q - P)$: the order flipped it, so it points into the ark.']] },
        { prompt: 'its length', answer: DOOR.len },
        { prompt: 'the door\'s area', answer: DOOR.area, mistakes: [[7, '7 is the parallelogram on the two edges. The door is the triangle: half of it.']] },
      ],
      onDone: () => void finish(),
    });
    p.tick(() => {
      const ok = ws.el.querySelectorAll('.ws-row.ok').length;
      if (ok >= 1) ePQ.setOpacity(1);
      if (ok >= 2) ePR.setOpacity(1);
    });
    const finish = (): Promise<void> => (finished ??= (async () => {
      ePQ.setOpacity(1); ePR.setOpacity(1);
      nA.setOpacity(1);
      await nA.grow(700);
      p.add(new RightAngle(p, cen, unit([Q[0] - P[0], Q[1] - P[1], 0]), [6, 3, 2], 0.25));
      r.row('n', 'normal', fmt(DOOR.n), C.result);
      r.row('a', 'area', nice(DOOR.area));
      r.note('Order checked: the normal points out of the ark.');
      tri.material.color = new Color('#59e1ff');
      chime();
      p.win();
    })());
    return {
      async showMe() { await ws.showMe(380); await finished; },
      async solve() { ws.solve(); await finished; },
      async wrong() { ws.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p5 The inside-out hull

const LIGHT = unit([-0.45, -0.3, 0.84]);
const FILL = unit([0.6, 0.7, -0.2]);
const HULL_BASE = new Color('#b7c3d6');

/** Colour every triangle from its own normal (corner order) and the light: inward normals render dark. */
function bake(geo: BufferGeometry, tris: Tri[], panel: number[]): void {
  const pos = geo.getAttribute('position') as BufferAttribute;
  const col = geo.getAttribute('color') as BufferAttribute;
  tris.forEach((t, i) => {
    for (let k = 0; k < 3; k++) pos.setXYZ(i * 3 + k, t[k][0], t[k][1], t[k][2]);
    const n = triNormal(t);
    const l = norm(n) || 1;
    const lam = Math.max(0, (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / l);
    const fill = Math.max(0, (n[0] * FILL[0] + n[1] * FILL[1] + n[2] * FILL[2]) / l);
    const plate = 0.86 + 0.14 * (((panel[i] * 7) % 5) / 4);
    const b = (0.04 + 0.78 * lam) * plate;
    const c = 0.16 * fill;
    for (let k = 0; k < 3; k++) col.setXYZ(i * 3 + k, HULL_BASE.r * b + c * 0.2, HULL_BASE.g * b + c * 0.6, HULL_BASE.b * b + c);
  });
  pos.needsUpdate = true;
  col.needsUpdate = true;
}

export const p5: PuzzleDef = {
  id: 'c05-p5',
  title: 'Why is half the hull dark?',
  goal: 'Each triangle\'s normal is $(B - A)\\times(C - A)$, from its corner order. Fix the corner-order rule so **every** normal reads **positive** against the arrow from the hull\'s centre to the triangle. Then **Apply**.',
  hints: [
    'A normal that faces out of the hull points the same way as the arrow from the centre to the triangle: a positive reading.',
    'Swapping two corners flips the normal. Swap only the triangles that read the wrong way.',
    'Swap B and C when the reading is **negative**.',
  ],
  par: 2,
  view: '3d',
  onWin: S.p5Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [0, 0, 0.4], distance: 30, azimuth: -62, elevation: 22, ms: 0 });
    const hull = hullTriangles();
    let tris = hull.tris;
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(tris.length * 9), 3));
    geo.setAttribute('color', new BufferAttribute(new Float32Array(tris.length * 9), 3));
    const mesh = new Mesh(geo, new MeshBasicMaterial({ vertexColors: true, side: DoubleSide }));
    p.add(mesh);
    p.onDispose(() => { geo.dispose(); mesh.material.dispose(); });
    bake(geo, tris, hull.panel);
    geo.computeBoundingSphere();
    // sample normals along the top seam: white facing out, amber facing in
    const samples = Array.from({ length: 24 }, (_, k) => Math.floor((k + 0.5) * (tris.length / 24)));
    const sampleArrows = samples.map(() => new Arrow([0, 0, 0], [1, 0, 0], { color: C.white, width: 0.035 }));
    p.add(...sampleArrows);
    const centre = new Dot([0, 0, 0], { color: '#59e1ff', size: 0.12, label: 'centre' });
    p.add(centre);
    const showSamples = () => samples.forEach((i, k) => {
      const t = tris[i];
      const c: V3 = [0, 1, 2].map((j) => (t[0][j] + t[1][j] + t[2][j]) / 3) as V3;
      const n = unit(triNormal(t));
      const out = outwardReading(t) > 0;
      sampleArrows[k].set(c, [c[0] + n[0] * 1.1, c[1] + n[1] * 1.1, c[2] + n[2] * 1.1]);
      sampleArrows[k].setColor(out ? C.white : C.orange);
    });
    showSamples();
    const spin = new Group();
    void spin;
    p.tick((dt) => { mesh.rotation.x += dt * 0.12; sampleArrows.forEach((a) => { a.object.rotation.x = mesh.rotation.x; }); });
    const r = p.readout('Hull model');
    const gauge = new Gauge('triangles facing out', { max: HULL_TRIS });
    addGauges(r, gauge);
    const status = () => { const n = outwardCount(tris); gauge.set(n - HULL_TRIS / 2, `${n.toLocaleString('en')} of ${HULL_TRIS.toLocaleString('en')}`); return n; };
    gauge.max = HULL_TRIS / 2;
    status();
    const sel = h('select', { class: 'law-slot', 'aria-label': 'when to swap' },
      h('option', { value: '' }, '…'), h('option', { value: 'negative' }, 'negative'), h('option', { value: 'positive' }, 'positive'), h('option', { value: 'zero' }, 'exactly zero')) as HTMLSelectElement;
    sel.addEventListener('keydown', (e) => e.stopPropagation());
    const apply = async (rule: Rule) => {
      if (p.won) return;
      p.move();
      sfx.whoosh(0.8);
      const before = outwardCount(tris);
      tris = applyRule(tris, rule);
      // light the change as a sweep from bow to stern
      const next = tris;
      const old = hull.tris;
      void old;
      await animate(900, (k) => {
        const cut = -8 + 16 * k;
        bake(geo, next.map((t, i) => (t[0][0] <= cut ? t : prevTris[i])), hull.panel);
      }, ease.inOut);
      bake(geo, tris, hull.panel);
      prevTris = tris;
      showSamples();
      const now = status();
      if (p5Won(tris)) { chime(); void burst(p.g.stage, [0, 0, 3.4], C.white, 80, 4, false); p.win(); return; }
      sfx.miss();
      if (rule === 'positive') p.bark('lantern', `Swapped every triangle that read positive. ${now === 0 ? 'Now every triangle faces in.' : `${now.toLocaleString('en')} face out.`}`);
      else if (rule === 'zero') p.bark('lantern', 'No triangle reads exactly zero. Nothing was swapped.');
      else p.bark('lantern', `${before.toLocaleString('en')} faced out before; ${now.toLocaleString('en')} now.`);
    };
    let prevTris = tris;
    p.dock().append(
      h('div', { class: 'kicker' }, 'Corner-order rule'),
      h('div', { style: 'font-size:14px;line-height:1.7', html: inline('For each triangle $ABC$: normal $\\mathbf n = (B - A)\\times(C - A)$; reading $= \\mathbf n\\cdot(\\text{triangle} - \\text{centre})$.') }),
      h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:14px' }, 'Swap B and C when the reading is', sel,
        button('Apply', () => { const v = sel.value as Rule; if (v) void apply(v); else p.bark('lantern', 'Choose when to swap.'); }, { cls: 'primary small' })));
    return {
      async showMe() { sel.value = 'negative'; await apply('negative'); },
      async solve() { sel.value = 'negative'; await apply('negative'); },
      async wrong() { await apply('positive'); },
    };
  },
};

// ------------------------------------------------------------------ p6 No axis

export const p6: PuzzleDef = {
  id: 'c05-p6',
  title: 'What sticks out of a panel with no width?',
  goal: 'Struts $\\mathbf v = (2, 4, 6)$ and $\\mathbf w$ make a panel; the yellow arrow is $\\mathbf v\\times\\mathbf w$. Close the angle between the struts to **0** and watch the arrow.',
  predict: {
    prompt: 'As the angle between the struts closes to 0, what happens to the raised arrow?',
    choices: [{ id: 'shrink', text: 'It shrinks to nothing' }, { id: 'same', text: 'It keeps its length' }, { id: 'flip', text: 'It flips over' }],
    answer: 'shrink',
    reveal: 'Its length is the panel\'s area, $\\|\\mathbf v\\|\\|\\mathbf w\\|\\sin\\theta$. At $\\theta = 0$ the panel has no width, so $(2, 4, 6)\\times(1, 2, 3) = (0, 0, 0)$.',
  },
  hints: ['Drag the dial all the way to 0°.', 'At 0° the second strut lies along the first: $(1, 2, 3)$ is half of $(2, 4, 6)$.', 'Set the angle to 0.'],
  par: 1,
  view: '3d',
  onWin: S.p6Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [1.0, 1.8, 3.4], distance: 24, azimuth: -28, elevation: 14, ms: 0 });
    p.grid({ base: 0.1, main: 0.16, axis: 0.4 });
    const v = v3(P6_V);
    let th = 50;
    const par = panel(p, v, v3(p6W(th)), 0.22);
    const vA = new Arrow([0, 0, 0], v, { color: C.v, label: '$\\mathbf v$' });
    const wA = new Arrow([0, 0, 0], v3(p6W(th)), { color: C.w, label: '$\\mathbf w$' });
    const nA = new Arrow([0, 0, 0], [0, 0, 1], { color: C.result, label: '$\\mathbf v\\times\\mathbf w$, drawn ¼ size' });
    p.add(vA, wA, nA);
    const arc = new AngleArc(p, [0, 0, 0], v, v3(p6W(th)), { radius: 1.6, label: '$\\theta$' });
    const r = p.readout('Raised arrow');
    const gArea = new Gauge('area of the panel', { max: 30 });
    addGauges(r, gArea);
    const upd = () => {
      const w = v3(p6W(th));
      const n = v3(cross(P6_V, w));
      par.set(v, w);
      wA.set([0, 0, 0], w);
      nA.set([0, 0, 0], [n[0] / 4, n[1] / 4, n[2] / 4]);
      nA.object.visible = norm(n) > 0.02;
      arc.set(v, w);
      gArea.set(norm(n));
      r.row('th', 'angle between the struts', `${Math.round(th)}°`);
      r.row('w', '$\\mathbf w$', fmt(w.map((x) => Math.round(x * 100) / 100)), C.w);
      r.row('n', '$\\mathbf v\\times\\mathbf w$', fmt(n.map((x) => Math.round(x * 100) / 100)), C.result);
    };
    const finish = async () => {
      if (p.won || !p6Won(th)) return;
      sfx.collapse();
      chime();
      await wait(300);
      p.win();
    };
    const slider = new Slider({ label: 'angle $\\theta$', min: 0, max: 60, step: 1, value: th, format: (x) => `${Math.round(x)}°`, onInput: (x) => { th = x; upd(); } });
    slider.el.querySelector('input')!.addEventListener('change', () => { p.move(); void finish(); });
    p.dock().append(slider.el);
    upd();
    return {
      async showMe() { const t0 = th; await animate(2200, (k) => { th = t0 * (1 - k); slider.set(th, false); upd(); }, ease.inOut); th = 0; upd(); await finish(); },
      async solve() { th = 0; slider.set(0, false); upd(); await finish(); },
      async wrong() { th = 5; slider.set(5, false); upd(); await finish(); },
    };
  },
};

// ------------------------------------------------------------------ p7 [S] Left or right at each waypoint?

export const p7: PuzzleDef = {
  id: 'c05-p7',
  title: 'Does the route turn left at every waypoint?',
  style: 'mastery',
  goal: 'A patrol loop runs $A \\to B \\to C \\to D \\to A$. At each waypoint the number $v_1w_2 - v_2w_1$ (the leg in, then the leg out) is a signed area: **positive** means a left turn. Drag $D$ so the loop turns **left** at $A$, $B$, $C$ and $D$.',
  hints: [
    'At $C$ the leg in is $C - B = (1, 3)$ and the leg out is $D - C$. The loop turns right there now.',
    'Pull $D$ up and to the left, so the loop goes round anticlockwise.',
    'Try $D = (1, 4)$: the four signed areas at $A$, $B$, $C$ and $D$ are 16, 12, 13 and 17.',
  ],
  par: 2,
  onWin: S.p7Win,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [2.2, 2.2], height: 9, ms: 0 });
    const A = v3(P7_A), B = v3(P7_B), Cc = v3(P7_C);
    let D: V3 = [7, 5, 0];
    const route = new FatLine(p.g.stage, [A, B, Cc, D, A], { color: '#59e1ff', width: 2.4, intensity: 1.3 });
    p.add(route);
    const names = ['A', 'B', 'C'];
    [A, B, Cc].forEach((q, i) => { p.add(new Dot(q, { color: C.white, size: 0.1 })); lab(p, `$${names[i]}$`, [q[0] - 0.35, q[1] - 0.35, 0], { size: 17 }); });
    const tags = [A, B, Cc, D].map(() => lab(p, '', [0, 0, 0], { size: 15 }));
    const r = p.readout('Signed area at each turn');
    const upd = () => {
      route.setPoints([A, B, Cc, D, A]);
      const t = turns(D);
      [A, B, Cc, D].forEach((q, i) => {
        const left = t[i] > 1e-9;
        tags[i].at([q[0] + 0.55, q[1] - 0.5, 0]);
        tags[i].set(t[i] === 0 ? 'straight' : left ? `left · ${nice(Math.round(t[i] * 100) / 100)}` : `right · ${nice(Math.round(t[i] * 100) / 100)}`);
        tags[i].el.style.color = left ? '#59e1ff' : C.orange;
        r.row(`t${i}`, `at ${['A', 'B', 'C', 'D'][i]}`, `${nice(Math.round(t[i] * 100) / 100)} · ${left ? 'left' : t[i] === 0 ? 'straight' : 'right'}`, left ? '#59e1ff' : C.orange);
      });
    };
    const dh = new VectorHandle(p, { to: D, color: C.result, label: '$D$', limit: 7, onChange: (t) => { D = t; upd(); }, onCommit: () => { if (p7Won(D)) { chime(); p.win(); } } });
    upd();
    return {
      async showMe() { await dh.moveTo([1, 4, 0], 1000); },
      async solve() { dh.set([1, 4, 0]); if (p7Won(D)) p.win(); },
      async wrong() { dh.set([7, 5, 0]); if (p7Won(D)) p.win(); },
    };
  },
};

