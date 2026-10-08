// Chapter 24 puzzles 5–7: the highest and lowest energy on the unit circle (p5), the Flip: spin the Lantern
// about one of its principal axes and hold it for ten simulated minutes (p6), and the optional surfaces:
// an upside-down bowl, a trough, the stress block's lowest point on a sphere (p7 [S]).
import { Group, Quaternion, Vector3 } from 'three';
import type { PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { FatLine } from '../../../gfx/lines';
import { Knob } from '../../../kit/geom';
import { Slider, VectorInput } from '../../../ui/widgets';
import { h, button } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { makeLantern } from '../../common/set';
import { INERTIA } from '../../truth';
import { norm, normalize, type Mat } from '../../../math/la';
import { PolyPlot } from '../c18-eigen/parts';
import { Surface, ptag, tag, v3 } from './act9';
import {
  AXES, HOLD_DEG, P5_S, SHAPE_WORD, SPIN_MINUTES, circleValue, deg, fmt2, fmtN, fmtV, lineDeg, p5Won, p7CapWon,
  p7SphereValue, p7SphereWon, p7TroughWon, rad, shapeOf, spin, symEig, texM, type SpinRun,
} from './logic';
import { checklist, msgLine } from './puzzles';
import { S } from './script';

// ------------------------------------------------------------------ p5 · highest and lowest on the circle

export const p5: PuzzleDef = {
  id: 'c24-p5',
  title: 'Where on the circle is the energy highest, and where lowest?',
  goal: 'Drag the probe round the circle one unit out. The yellow curve is the surface above it. **Lock** the point of highest energy and the point of lowest energy.',
  subgoals: ['Lock the highest point', 'Lock the lowest point'],
  predict: {
    prompt: 'On the unit circle, $E = \\mathbf x^{\\mathsf T}\\begin{bmatrix} 2 & 1 \\\\ 1 & 2 \\end{bmatrix}\\mathbf x$. What is the largest value it reaches?',
    choices: [{ id: '3', text: '3' }, { id: '4', text: '4' }, { id: '6', text: '6' }],
    answer: '3',
    reveal: 'The largest eigenvalue, 3, at the eigenvector $(1, 1)/\\sqrt2$. The smallest is 1, at $(1, -1)/\\sqrt2$.',
  },
  hints: [
    'The plot under the controls is $E$ all the way round. Find its peak and its dip.',
    'The peak is on a diagonal: $E = 2 + \\sin 2\\theta$, largest at 45°.',
    'Lock 45°, where $E = 3$, and $-45°$ (or 135°), where $E = 1$.',
  ],
  par: 4,
  view: '3d',
  onWin: S.p5Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view3D({ target: [0, 0, 0.8], distance: 8.6, azimuth: -70, elevation: 30, ms: 0 });
    const surf = new Surface(p, { S: P5_S, R: 1.9, height: 2.6, grid: true });
    surf.showAxes(d === 'cadet');
    surf.setOpacity(0.72);
    // the unit circle on the floor and lifted onto the surface
    const floor: V3[] = [], lifted: V3[] = [];
    for (let i = 0; i <= 160; i++) { const a = (i / 160) * Math.PI * 2; floor.push([Math.cos(a), Math.sin(a), 0.01]); lifted.push(surf.at([Math.cos(a), Math.sin(a)], 0.04)); }
    const fl = new FatLine(p.g.stage, floor, { color: C.white, width: 1.4, opacity: 0.5, dashed: true, dashSize: 0.08, gapSize: 0.06 });
    const up = new FatLine(p.g.stage, lifted, { color: C.result, width: 2.6, intensity: 1.2 });
    const stem = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 1]], { color: C.result, width: 1.4, opacity: 0.7, dashed: true, dashSize: 0.06, gapSize: 0.05 });
    p.add(fl.object, up.object, stem.object);
    p.onDispose(() => { fl.dispose(); up.dispose(); stem.dispose(); });
    const arrow = new Arrow([0, 0, 0.02], [1, 0, 0.02], { color: C.v, width: 0.04, label: '$\\mathbf x$' });
    p.add(arrow);
    const step = d === 'cadet' ? 5 : d === 'navigator' ? 1 : 0;
    const tol = d === 'cadet' ? 3 : d === 'navigator' ? 2 : 1;
    let t = rad(160);
    const r = p.readout('Energy on the circle');
    const e = symEig(P5_S);
    const plot = new PolyPlot({ lo: 0, hi: 360, ymin: 0, ymax: 3.6, fn: (a) => circleValue(P5_S, rad(a)), label: 'E around the circle', ticks: [90, 180, 270] });
    const msg = msgLine();
    const locks: number[] = [];
    const done = [false, false];
    let won = false;
    const paint = () => {
      const x = [Math.cos(t), Math.sin(t)];
      surf.place(x);
      stem.setPoints([[x[0], x[1], 0.01], surf.at(x, 0.02)]);
      arrow.setTo([x[0], x[1], 0.02]);
      const a = ((deg(t) % 360) + 360) % 360;
      plot.at(a);
      r.row('a', 'probe at', `${Math.round(a)}°`, C.v);
      r.row('e', '$E = \\mathbf x^{\\mathsf T}S\\mathbf x$', fmt2(circleValue(P5_S, t)), C.result);
      if (d !== 'commander') r.row('l', 'eigenvalues of $S$', e.values.map(fmtN).join(' and '));
    };
    const knob = new Knob(p, [Math.cos(t), Math.sin(t), 0.02], {
      color: C.v, size: 0.075, planar: true,
      constrain: (q) => { let a = Math.atan2(q.y, q.x); if (step) a = rad(Math.round(deg(a) / step) * step); t = a; q.set(Math.cos(a), Math.sin(a), 0.02); return q; },
      onMove: () => paint(),
    });
    const lock = () => {
      if (won) return;
      p.move();
      const v = circleValue(P5_S, t);
      const x = [Math.cos(t), Math.sin(t)];
      const isMax = lineDeg(x, e.vectors[0]) <= tol, isMin = lineDeg(x, e.vectors[1]) <= tol;
      if (!isMax && !isMin) {
        sfx.miss();
        msg.say(`$E = ${fmt2(v)}$ here. The curve still ${circleValue(P5_S, t + 0.05) > v ? 'rises' : 'falls'} on one side: not a peak or a dip.`, 'bad');
        return;
      }
      locks.push(t);
      const i = isMax ? 0 : 1;
      const tg = ptag(p, `${isMax ? 'highest' : 'lowest'} · ${fmt2(v)}`, surf.at(x, 0.35), isMax ? 'y' : 'c');
      void tg;
      if (!done[i]) { done[i] = true; p.subgoal(i); }
      sfx.snap();
      msg.say(isMax ? `Highest: $E = ${fmt2(v)}$, the largest eigenvalue, along its eigenvector $(1, 1)$.` : `Lowest: $E = ${fmt2(v)}$, the smallest eigenvalue, along $(1, -1)$.`, 'good');
      if (p5Won(locks, tol) && !won) { won = true; sfx.success(); p.win(); }
    };
    p.dock().append(plot.el, h('div', { class: 'a9-btns' }, button('Lock this point', () => lock(), { cls: 'primary small' })), msg.el);
    paint();
    const goTo = async (a: number, ms: number) => {
      const a0 = t;
      let dA = a - a0; dA = Math.atan2(Math.sin(dA), Math.cos(dA));
      await animate(ms, (k) => { t = a0 + dA * k; knob.at([Math.cos(t), Math.sin(t), 0.02]); paint(); }, ease.inOut);
      t = a; knob.at([Math.cos(t), Math.sin(t), 0.02]); paint();
    };
    return {
      async showMe() { await goTo(rad(45), 1200); lock(); await goTo(rad(-45), 1200); lock(); },
      solve() { t = rad(45); paint(); lock(); t = rad(135); paint(); lock(); },
      wrong() { t = rad(90); paint(); lock(); },
    };
  },
};

// ------------------------------------------------------------------ p6 · the Flip

export const p6: PuzzleDef = {
  id: 'c24-p6',
  title: 'Which axis will the Lantern spin about steadily?',
  goal: 'Type a spin axis for the *Lantern* and press **Spin**. A docking drone nudges her. She must hold the axis for **ten minutes**.',
  subgoals: ['Hold a spin axis for ten minutes'],
  predict: {
    prompt: 'The *Lantern* has three axes at right angles, with moments 2, 6 and 9. Spun about which one will she **not** hold steady?',
    choices: [{ id: 'small', text: 'The long axis (2)' }, { id: 'mid', text: 'The wing axis (6)' }, { id: 'big', text: 'The deck axis (9)' }],
    answer: 'mid',
    reveal: 'The middle one, the wing axis $(1, -1, 0)$ with moment 6. A small nudge grows, and she flips end over end. The largest and smallest moments hold.',
  },
  hints: [
    'Spin her about an eigenvector of the inertia matrix: any other axis wobbles.',
    'The eigenvectors are $(1, 1, 0)$ with 2, $(1, -1, 0)$ with 6 and $(0, 0, 1)$ with 9.',
    'Spin about $(0, 0, 1)$, the largest moment, or $(1, 1, 0)$, the smallest. Not the middle one.',
  ],
  par: 2,
  view: '3d',
  onWin: S.p6Win,
  setup(p) {
    const d = p.difficulty;
    void p.g.stage.view3D({ target: [0, 0, 0], distance: 11, azimuth: -55, elevation: 22, ms: 0 });
    const holder = new Group();
    p.add(holder);
    const ship = makeLantern(p.g.stage, 0.62);
    ship.face([1, 1, 0]);
    ship.setThrust(0);
    holder.add(ship.object);
    p.onDispose(() => ship.dispose());
    // the principal axes, carried with the ship
    const axesG = new Group();
    holder.add(axesG);
    if (d !== 'commander') {
      AXES.forEach((a, i) => {
        const u = a.dir.map((x) => x * 2.4);
        const L = new FatLine(p.g.stage, [v3(u.map((x) => -x)), v3(u)], { color: '#9fb6d8', width: 1.4, opacity: 0.55, dashed: true, dashSize: 0.12, gapSize: 0.08 });
        L.object.userData.dispose = () => L.dispose();
        axesG.add(L.object);
        if (d === 'cadet') { const tg = tag(`${a.name} · ${fmtN(a.I)}`, v3(u.map((x) => x * 1.08)), 'dim'); tg.object.userData.dispose = () => tg.dispose(); axesG.add(tg.object); void i; }
      });
    }
    const spinArrow = new Arrow([0, 0, 0], [0, 0, 0.001], { color: C.result, width: 0.024, glow: 0.3, opacity: 0.7, label: '$\\boldsymbol\\omega$' });
    p.add(spinArrow);
    spinArrow.object.visible = false;
    const trail = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 0]], { color: C.accent, width: 1.6, opacity: 0.75 });
    p.add(trail.object);
    p.onDispose(() => trail.dispose());
    trail.object.visible = false;
    const r = p.readout('The Lantern');
    r.row('I', 'inertia matrix', `$${texM(INERTIA)}$`);
    const msg = msgLine();
    const input = new VectorInput({ dim: 3, values: [1, 0, 0], label: '\\text{axis} =', step: 1, onSubmit: () => void go() });
    input.el.classList.add('a9-in');
    const chips = h('div', { class: 'a9-chips' });
    if (d === 'cadet') {
      for (const a of AXES) {
        const dir = a.dir.map((x) => (Math.abs(x) < 1e-9 ? 0 : Math.sign(x)));
        const b = h('button', { class: 'a9-chip', type: 'button' }, `${a.name} ${fmtV(dir)}`);
        b.addEventListener('click', () => { input.set(dir); sfx.click(); });
        chips.append(b);
      }
    }
    let busy = false;
    let won = false;
    let last: SpinRun | null = null;
    const nose = new Vector3(1, 1, 0).normalize().multiplyScalar(1.6);
    const play = async (axis: number[], run: SpinRun) => {
      const n = run.samples.length;
      const ms = p.g.headless ? 40 : 12000;
      const pts: V3[] = [];
      spinArrow.object.visible = true;
      trail.object.visible = true;
      const q = new Quaternion();
      let lastI = -1;
      await animate(ms, (k) => {
        const i = Math.min(n - 1, Math.floor(k * (n - 1)));
        if (i === lastI) return;
        lastI = i;
        const s = run.samples[i];
        q.set(s.q[1], s.q[2], s.q[3], s.q[0]);
        holder.quaternion.copy(q);
        const tip = nose.clone().applyQuaternion(q);
        pts.push([tip.x, tip.y, tip.z]);
        if (pts.length > 2) trail.setPoints(pts.slice(-260));
        const w = normalize(s.w);
        const wv = new Vector3(w[0], w[1], w[2]).applyQuaternion(q).multiplyScalar(2.2);
        spinArrow.setTo([wv.x, wv.y, wv.z]);
        const drift = deg(Math.acos(Math.max(-1, Math.min(1, w[0] * axis[0] + w[1] * axis[1] + w[2] * axis[2]))));
        r.row('t', 'time', `${(s.t / 60).toFixed(1)} min`, C.accent);
        r.row('d', 'spin axis has moved', `${Math.round(drift)}°`, drift <= HOLD_DEG ? C.good : C.orange);
      }, ease.linear);
    };
    const go = async () => {
      if (busy || won) return;
      const a = input.get();
      if (norm(a) < 1e-9) { msg.say('The zero arrow is not an axis. Type a direction.', 'bad'); sfx.miss(); return; }
      busy = true;
      p.move();
      const axis = normalize(a);
      msg.say(`Spinning about ${fmtV(a)}. A drone docks.`);
      ship.setThrust(0.6);
      sfx.whoosh(1.5);
      last = spin(axis, { every: 1 });
      await play(axis, last);
      ship.setThrust(0);
      busy = false;
      const near = AXES.find((x) => lineDeg(x.dir, axis) < 0.5);
      if (last.held) {
        won = true;
        msg.say(`Held for ${SPIN_MINUTES} minutes: the axis moved ${fmt2(last.maxDrift)}° at most. ${near ? `The ${near.name}, moment ${fmtN(near.I)}: ${near.I === AXES[2].I ? 'the largest' : 'the smallest'}.` : ''}`, 'good');
        p.subgoal(0);
        p.win();
      } else if (near && near.I === AXES[1].I) {
        sfx.miss();
        p.g.stage.nudge(0.12);
        msg.say(`**The Flip.** At minute ${((last.flipAt ?? 0) / 60).toFixed(1)} she turned end over end, and back. The wing axis has the **middle** moment, 6: a small nudge grows. Try the largest or the smallest.`, 'bad');
        p.bark('lantern', `Spin axis reversed at minute ${((last.flipAt ?? 0) / 60).toFixed(1)}. The ship flipped end over end.`);
        void p.g.say(S.p6Flip);
      } else {
        sfx.miss();
        msg.say(`The axis wandered ${Math.round(last.maxDrift)}°. ${fmtV(a)} is not one of her principal axes: spun about it, she wobbles.`, 'bad');
        p.bark('lantern', `Spin axis moved ${Math.round(last.maxDrift)} degrees. Not a principal axis.`);
      }
    };
    p.dock().append(h('div', { class: 'a9-row' }, input.el, button('Spin', () => void go(), { cls: 'primary small' })), ...(d === 'cadet' ? [chips] : []), msg.el);
    return {
      async showMe() { input.set([0, 0, 1]); await go(); },
      async solve() { input.set([0, 0, 1]); await go(); },
      async wrong() { input.set([1, -1, 0]); await go(); },
    };
  },
};

// ------------------------------------------------------------------ p7 [S] · upside-down bowl, trough, sphere

export const p7: PuzzleDef = {
  id: 'c24-p7',
  title: 'Can you build an upside-down bowl, and a trough?',
  goal: 'Set the entries of $S = \\begin{bmatrix} a & b \\\\ b & c \\end{bmatrix}$ to make an **upside-down bowl**, then a **trough**. Then type an arrow where the stress block $\\left[\\begin{smallmatrix} 2 & 1 & 1 \\\\ 1 & 2 & 1 \\\\ 1 & 1 & 2 \\end{smallmatrix}\\right]$ is **lowest on the unit sphere**.',
  subgoals: ['An upside-down bowl', 'A trough: a whole line of lowest points', 'The stress block’s lowest point on the sphere'],
  hints: [
    'Upside-down bowl: both eigenvalues negative. Try $a$ and $c$ negative with $b = 0$.',
    'A trough needs one eigenvalue exactly 0 and the other positive: $ac - b^2 = 0$ with $a + c > 0$. Try $a = b = c = 1$.',
    'The block $\\begin{bmatrix} 2 & 1 & 1 \\\\ 1 & 2 & 1 \\\\ 1 & 1 & 2 \\end{bmatrix}$ has eigenvalue 1 on the plane $x + y + z = 0$. Type $(1, -1, 0)$.',
  ],
  view: '3d',
  onWin: S.p7Win,
  setup(p) {
    void p.g.stage.view3D({ target: [0, 0, 0], distance: 10.5, azimuth: -60, elevation: 26, ms: 0 });
    let a = 1, b = 0, c = 1;
    const M = (): Mat => [[a, b], [b, c]];
    const surf = new Surface(p, { S: M(), scaleFor: 4, height: 1.8 });
    surf.showAxes(true);
    const r = p.readout('Your surface');
    const ck = checklist(['Upside-down bowl', 'Trough', 'Lowest on the sphere']);
    const msg = msgLine();
    const done = [false, false, false];
    let won = false;
    const tick = (i: number) => { if (!done[i]) { done[i] = true; p.subgoal(i); ck.tick(i); sfx.snap(); } if (done.every(Boolean) && !won) { won = true; sfx.success(); p.win(); } };
    const paint = () => {
      const S0 = M();
      surf.setS(S0);
      const e = symEig(S0);
      r.row('m', '$S$', `$${texM(S0)}$`);
      r.row('l', 'eigenvalues', e.values.map(fmt2).join(' and '), C.result);
      r.row('s', 'shape', SHAPE_WORD[shapeOf(S0, 1e-6)]);
      if (p7CapWon(S0)) tick(0);
      if (p7TroughWon(S0)) tick(1);
    };
    const sl = (label: string, v: number, set: (x: number) => void) => {
      const s = new Slider({ label, min: -3, max: 3, step: 0.5, value: v, format: (x) => fmtN(x), onInput: (x) => { set(x); paint(); } });
      s.el.addEventListener('change', () => p.move());
      return s;
    };
    const sa = sl('$a$', a, (x) => { a = x; }), sb = sl('$b$', b, (x) => { b = x; }), sc = sl('$c$', c, (x) => { c = x; });
    const input = new VectorInput({ dim: 3, values: [1, 1, 1], label: '\\mathbf x =', step: 1, onSubmit: () => test() });
    input.el.classList.add('a9-in');
    const test = () => {
      const x = input.get();
      if (norm(x) < 1e-9) { msg.say('The zero arrow has no point on the sphere.', 'bad'); return; }
      p.move();
      const v = p7SphereValue(x);
      if (p7SphereWon(x)) { msg.say(`$\\mathbf x^{\\mathsf T}S\\mathbf x = ${fmt2(v)}$ at ${fmtV(x)}, scaled to length 1: the smallest eigenvalue. Every unit arrow with $x + y + z = 0$ gives the same.`, 'good'); tick(2); }
      else { sfx.miss(); msg.say(`$\\mathbf x^{\\mathsf T}S\\mathbf x = ${fmt2(v)}$ for ${fmtV(x)} scaled to length 1. Not the lowest.`, 'bad'); }
    };
    p.dock().append(sa.el, sb.el, sc.el, h('div', { class: 'a9-kick' }, 'The stress block on the unit sphere'), h('div', { class: 'a9-row' }, input.el, button('Test', () => test(), { cls: 'small primary' })), ck.el, msg.el);
    paint();
    const set = async (x: number, y: number, z: number, ms: number) => {
      const a0 = a, b0 = b, c0 = c;
      await animate(ms, (k) => { a = a0 + (x - a0) * k; b = b0 + (y - b0) * k; c = c0 + (z - c0) * k; surf.setS(M()); }, ease.inOut);
      a = x; b = y; c = z; sa.set(x, false); sb.set(y, false); sc.set(z, false); paint();
    };
    return {
      async showMe() { await set(-2, 0, -1, 1100); await wait(500); await set(1, 1, 1, 1100); await wait(400); input.set([1, -1, 0]); test(); },
      async solve() { await set(-2, 0, -1, 1); await set(1, 1, 1, 1); input.set([1, -1, 0]); test(); },
      wrong() { a = 1; b = 2; c = 1; paint(); },
    };
  },
};
