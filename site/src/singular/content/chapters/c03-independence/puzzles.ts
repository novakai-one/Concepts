// Chapter 3 puzzles (GDD §6.3 Ch 3): p1 [F] fire all, go nowhere; p2 the wasted spare; p3 pick a
// mount; p4 prune; p5 [D] four arrows always loop; p6 [S] three in the plane; SP-I Lift.
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { VectorHandle } from '../../../kit/handle';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { Arrow } from '../../../gfx/arrow';
import { Beacon, Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { PlanePatch } from '../../../gfx/shapes';
import { burst } from '../../../gfx/fx';
import { h, button } from '../../../ui/ui';
import { ChoiceCards } from '../../../ui/widgets';
import { C } from '../../../core/theme';
import { nice } from '../../../math/frac';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { cross } from '../../../math/la';
import { rng } from '../../../game/lawcheck';
import { ReachGlow } from '../c02-span/reach';
import { DialRig, fmtV, fmtDial, to3, tolFor, dialStep } from '../c02-span/rig';
import {
  P1_U, P1_V, P1_W, P1_LOOP, THRUST3, SIGNAL, SPARE_BAD, SPARE_BAD_DIALS, MOUNTS, P3_MOUNT, P3_DIALS, P3_FUEL, PRUNE,
  SP_ARROWS, SP_TARGET, SP_FUEL, SP_DIALS, isLoop, fuel, p2Won, p3Won, p4Won, spWon, spanDim, bramFour, planeLoop,
} from './logic';
import { S } from './script';

const T0 = to3(THRUST3[0]), T1 = to3(THRUST3[1]);
const ORIGIN: V3 = [0, 0, 0];
const near3 = (a: V3, b: number[], tol: number) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - (b[2] ?? 0)) <= tol;
const flare = (p: PuzzleCtx, at: V3, color: string = C.good) => { void burst(p.g.stage, at, color, 60, 2.6, false); };

/** A closed loop drawn as a bright yellow polygon through the chain's corners. */
function loopTrace(p: PuzzleCtx, vs: V3[], dials: number[]): FatLine {
  const pts: V3[] = [ORIGIN];
  let at = ORIGIN;
  vs.forEach((v, i) => { at = [at[0] + dials[i] * v[0], at[1] + dials[i] * v[1], at[2] + dials[i] * v[2]]; pts.push(at); });
  const line = new FatLine(p.g.stage, pts, { color: C.result, width: 3.2, intensity: 1.8, opacity: 0.95 });
  p.add(line.object);
  p.onDispose(() => line.dispose());
  return line;
}

/** The plane two arrows reach, drawn by LANTERN (cadet assist). */
function planeOf(p: PuzzleCtx, a: V3, b: V3, size = 9): PlanePatch {
  const pl = new PlanePatch(p.g.stage, ORIGIN, to3(cross(a, b)), { color: '#7d8aa5', size, opacity: 0.12 });
  pl.setSpan(ORIGIN, a, b);
  p.add(pl);
  return pl;
}

// ------------------------------------------------------------------ p1 [F] fire all, go nowhere

export const p1: PuzzleDef = {
  id: 'c03-p1',
  title: 'Can firing all three thrusters bring the ship back to the start?',
  style: 'mastery',
  view: '3d',
  goal: 'Set the three dials so the ship fires all three arrows, $\\cg{\\mathbf u}$, $\\cr{\\mathbf v}$ and $\\cb{\\mathbf w}$, and comes back to where it started. The dials may not all be zero. **Fire**.',
  subgoals: ['Find the dials', 'Fire all three and come back to the start'],
  hints: [
    'Try $c_3 = -1$: fire $\\mathbf w$ backwards. Then $c_1\\mathbf u + c_2\\mathbf v$ has to equal $\\mathbf w = (2, 3, 7)$.',
    'Across: only $\\mathbf u$ pushes across, so $c_1 = 2$. Up: only $\\mathbf v$ pushes up, so $c_2 = 3$.',
    'Dials 2, 3, −1. Check the height: $2 \\cdot 2 + 3 \\cdot 1 = 7$.',
  ],
  par: 2,
  onWin: S.p1Win,
  setup(p) {
    void p.g.stage.view3D({ target: [1, 1.2, 3.2], distance: 19, azimuth: -128, elevation: 30, ms: 0 });
    const d = p.difficulty;
    const vs = [to3(P1_U), to3(P1_V), to3(P1_W)];
    if (d === 'cadet') planeOf(p, vs[0], vs[1], 12);
    const flags = [d === 'cadet', false];
    const tick = (i: number) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); } if (flags[0] && flags[1]) p.win(); };
    if (d === 'cadet') { p.subgoal(0); p.setGoal(p1.goal + '\n\nLANTERN draws the plane $\\cg{\\mathbf u}$ and $\\cr{\\mathbf v}$ reach. Look where $\\cb{\\mathbf w}$ lies.'); }
    const rig = new DialRig(p, {
      arrows: vs, dims: 3, names: ['c_1', 'c_2', 'c_3'], symbols: ['\\mathbf u', '\\mathbf v', '\\mathbf w'], dials: [1, 1, 1], range: [-4, 4],
      readoutTitle: 'Three arrows', glow: { cell: 0.11 },
      onArrive: (end, dials) => {
        if (isLoop(vs, dials, tolFor(p))) { loopTrace(p, vs, dials); flare(p, ORIGIN, C.result); tick(1); return flags[0] ? 'win' : 'ok'; }
        if (dials.every((x) => Math.abs(x) < 1e-9)) { p.bark('lantern', 'All three dials are zero. The ship never moved. Find a firing that moves and comes back.'); return 'miss'; }
        rig.gap.show(end, ORIGIN, 'to the start');
        p.bark('lantern', `Ended at ${fmtV(end)}, not back at the start.`);
        return 'miss';
      },
    });
    let ws: StepWorksheet | null = null;
    if (d !== 'cadet') {
      ws = new StepWorksheet(p, {
        steps: [
          { prompt: 'Set $c_3 = -1$. Then $c_1\\mathbf u + c_2\\mathbf v = \\mathbf w$. Across: $c_1 \\cdot 1 + c_2 \\cdot 0 = 2$, so $c_1 =$', answer: 2 },
          { prompt: 'Up: $c_1 \\cdot 0 + c_2 \\cdot 1 = 3$, so $c_2 =$', answer: 3 },
          { prompt: 'Height check: $2c_1 + c_2 =$', answer: 7, mistakes: [[5, 'u is 2 high and v is 1 high: 2 × 2 + 3 × 1.']] },
          { prompt: 'The loop dials $(c_1, c_2, c_3) =$', answer: P1_LOOP, mistakes: [[[2, 3, 1], 'w is fired backwards to come home: c₃ = −1.']] },
        ],
        onDone: () => { tick(0); p.bark('lantern', 'Dials 2, 3, −1. Set them and Fire.'); },
      });
      // the worksheet sits above the dials in the dock
      p.dock().prepend(ws.el);
    }
    return {
      async showMe() { if (ws) await ws.showMe(280); await rig.moveDials(P1_LOOP, 1000); await rig.fire(); },
      async solve() { ws?.solve(); rig.setDials(P1_LOOP); await rig.fire(); },
      async wrong() { ws?.wrong(); rig.setDials([0, 0, 0]); await rig.fire(); },
    };
  },
};

// ------------------------------------------------------------------ p2 why can't we reach it?

export const p2: PuzzleDef = {
  id: 'c03-p2',
  title: 'Why does the spare not get us off the plane?',
  view: '3d',
  goal: 'The spare pushes along $\\cb{(1, 2, 3)}$. Use only thrusters two and three: set their dials so the ship lands on the tip of the spare’s arrow. **Fire**.',
  predict: {
    prompt: 'Can thrusters two and three alone land on the tip of the spare’s arrow, (1, 2, 3)?',
    choices: [{ id: 'yes', text: 'Yes' }, { id: 'no', text: 'No: the spare points somewhere new' }],
    answer: 'yes',
    reveal: '$1\\,\\cg{(1, 0, 1)} + 2\\,\\cr{(0, 1, 1)} = \\cb{(1, 2, 3)}$. The spare’s arrow lies in the plane the other two already reach.',
  },
  hints: ['Every point the two thrusters reach is $(a, b, a + b)$.', 'For (1, 2, 3): $a = 1$, $b = 2$, and $1 + 2 = 3$ fits.', 'Dials 1 and 2.'],
  par: 2,
  onWin: S.p2Win,
  setup(p) {
    void p.g.stage.view3D({ target: [0.8, 1, 1.4], distance: 15, azimuth: -55, elevation: 22, ms: 0 });
    const spare = new Arrow(ORIGIN, to3(SPARE_BAD), { color: C.u, label: 'spare' });
    const signal = new Beacon(p.g.stage, to3(SIGNAL), { label: 'signal', color: '#59e1ff' });
    p.add(spare, signal);
    const rig = new DialRig(p, {
      arrows: [T0, T1], dims: 3, names: ['a', 'b'], tags: ['thruster two', 'thruster three'], dials: [1, 1], range: [-4, 4],
      dragTip: true, readoutTitle: 'Thrusters two and three', glow: { cell: 0.11 },
      onArrive: (end) => {
        if (p2Won(end, tolFor(p))) {
          const back = new Arrow(to3(SPARE_BAD), ORIGIN, { color: C.u, opacity: 0.7, width: 0.035 });
          p.add(back);
          loopTrace(p, [T0, T1, to3(SPARE_BAD)], [1, 2, -1]);
          flare(p, to3(SPARE_BAD), C.u);
          p.win();
          void rig.shipTo(ORIGIN, 900);
          return 'win';
        }
        rig.gap.show(end, to3(SPARE_BAD));
        p.bark('lantern', `Landed at ${fmtV(end)}. The spare’s tip is at (1, 2, 3).`);
        return 'miss';
      },
    });
    rig.glow?.fill([[-2, 3], [-2, 3]], { spread: 1.5 });
    return {
      async showMe() { await rig.moveDials(SPARE_BAD_DIALS, 1000); await rig.fire(); for (let i = 0; i < 200 && !p.won; i++) await wait(20); },
      async solve() { rig.setDials(SPARE_BAD_DIALS); await rig.fire(); for (let i = 0; i < 200 && !p.won; i++) await wait(20); },
      async wrong() { rig.setDials([1, 1]); await rig.fire(); },
    };
  },
};

// ------------------------------------------------------------------ p3 pick a mount

const MOUNT_NAMES = ['A', 'B', 'C'];

export const p3: PuzzleDef = {
  id: 'c03-p3',
  title: 'Where should the spare be bolted?',
  view: '3d',
  goal: 'Bolt the spare at one of three mounts. Then reach the **signal (1, 1, 0)** with total fuel at most **3**. Fuel is the sum of the dial sizes: $|a| + |b| + |c|$.',
  subgoals: ['Pick a mount that adds a new direction', 'Reach the signal with fuel at most 3'],
  predict: {
    prompt: 'Which mount adds nothing new to thrusters two and three?',
    choices: MOUNTS.map((m, i) => ({ id: MOUNT_NAMES[i], text: `Mount ${MOUNT_NAMES[i]}: ${fmtV(m)}` })),
    answer: 'A',
    reveal: '$(2, -1, 1) = 2\\,(1, 0, 1) - (0, 1, 1)$: mount A lies in the plane the other two reach. B and C both lift the ship off it.',
  },
  hints: [
    'Mount A is 2 of thruster two minus 1 of thruster three. It cannot lift the ship off the plane.',
    'With mount C, $(0, 0, 2)$: the first two dials set across and up, the third fixes the height.',
    'Mount C, dials 1, 1, −1: fuel 3.',
  ],
  par: 3,
  onWin: S.p3Win,
  setup(p) {
    void p.g.stage.view3D({ target: [0.6, 0.6, 0.8], distance: 15, azimuth: -52, elevation: 22, ms: 0 });
    if (p.difficulty === 'cadet') planeOf(p, T0, T1, 8);
    const signal = new Beacon(p.g.stage, to3(SIGNAL), { label: 'signal (1, 1, 0)', color: '#59e1ff' });
    p.add(signal);
    let mount = -1;
    const rig = new DialRig(p, {
      arrows: [T0, T1, to3(MOUNTS[0])], dims: 3, names: ['a', 'b', 'c'], tags: ['thruster two', 'thruster three', 'spare'], dials: [0, 0, 0],
      bolted: [true, true, false], range: [-3, 3], readoutTitle: 'Three thrusters', glow: { cell: 0.12 },
      beforeFire: () => (mount < 0 ? 'Bolt the spare at a mount first.' : null),
      onChange: (d) => rig?.readout?.row('f', 'fuel', `${fmtDial(fuel(d))} of ${P3_FUEL}`, fuel(d) > P3_FUEL ? C.orange : undefined),
      onArrive: (end, dials) => {
        if (p3Won(mount, dials, tolFor(p))) { flare(p, to3(SIGNAL)); p.subgoal(1); p.win(); return 'win'; }
        if (near3(end, SIGNAL, tolFor(p))) { p.bark('lantern', `On the signal, but fuel used: ${fmtDial(fuel(dials))}. The limit is ${P3_FUEL}.`); return 'miss'; }
        rig.gap.show(end, to3(SIGNAL));
        p.bark('lantern', mount === 0 ? 'Mount A’s arrow is 2 of thruster two minus 1 of thruster three. Every landing stays on the old plane.' : `Landed at ${fmtV(end)}.`);
        return 'miss';
      },
    });
    const btns = MOUNTS.map((m, i) => button(`Mount ${MOUNT_NAMES[i]} ${fmtV(m)}`, () => choose(i), { cls: 'small' }));
    p.dock().prepend(h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, ...btns));
    function choose(i: number): void {
      if (rig.busy || p.won) return;
      mount = i;
      p.move();
      btns.forEach((b, k) => b.classList.toggle('primary', k === i));
      void rig.setArrows([T0, T1, to3(MOUNTS[i])]);
      rig.glow?.clear();
      rig.setBolted(2, true);
      if (spanDim([THRUST3[0], THRUST3[1], MOUNTS[i]]) === 3) p.subgoal(0); else p.subgoal(0, false);
      sfx.snap();
    }
    rig.readout?.row('f', 'fuel', `0 of ${P3_FUEL}`);
    return {
      async showMe() { choose(P3_MOUNT); await rig.moveDials(P3_DIALS, 1000); await rig.fire(); },
      async solve() { choose(P3_MOUNT); rig.setDials(P3_DIALS); await rig.fire(); },
      async wrong() { choose(1); rig.setDials([-1, -1, 2]); await rig.fire(); },
    };
  },
};

// ------------------------------------------------------------------ p4 prune

const PRUNE_COLORS = [C.v, C.w, C.u, '#d7e0f0'];

export const p4: PuzzleDef = {
  id: 'c03-p4',
  title: 'Which thruster can go without losing any reach?',
  view: '3d',
  goal: 'Four thrusters on the rack; the glow is everything they reach together: all of space. **Unbolt one** so that the glow stays all of space.',
  hints: ['A thruster can go when the others already reach its tip.', '(1, 1, 0) is (1, 0, 0) plus (0, 1, 0).', 'Unbolt (1, 1, 0), or (1, 0, 0), or (0, 1, 0). Only (0, 0, 1) pushes up.'],
  par: 1,
  onWin: S.p4Win,
  setup(p) {
    void p.g.stage.view3D({ target: [0.2, 0.2, 0.9], distance: 10, azimuth: -50, elevation: 24, ms: 0 });
    const bolted = [true, true, true, true];
    const arrows = PRUNE.map((v, i) => new Arrow(ORIGIN, to3(v), { color: PRUNE_COLORS[i], label: `$${fmtV(v).replace(/−/g, '-')}$` }));
    p.add(...arrows);
    const glow = new ReachGlow(p.g.stage, { cell: 0.2, size: 0.3, gain: 0.3 });
    p.add(glow);
    const box: [number, number] = [-2, 2];
    const r = p.readout('Thrusters on the rack');
    const paint = () => {
      glow.clear();
      const on = PRUNE.filter((_, i) => bolted[i]);
      const dim = spanDim(on);
      if (dim === 3) { glow.setArrows([[1, 0, 0], [0, 1, 0], [0, 0, 1]]); glow.scatter(2600, [box, box, box], () => true, 1.4, 5); }
      else { glow.setArrows([[1, 0, 0], [0, 1, 0], [0, 0, 1]]); glow.fill([box, box, [0, 0]], { step: [0.12, 0.12, 1], spread: 1.2 }); }
      PRUNE.forEach((v, i) => r.row(`a${i}`, fmtV(v), bolted[i] ? 'bolted' : 'unbolted', bolted[i] ? PRUNE_COLORS[i] : C.muted));
      r.row('s', 'the glow is', dim === 3 ? 'all of space' : 'the floor plane', C.result);
    };
    let won = false;
    const btns = PRUNE.map((v, i) => button(`Unbolt ${fmtV(v)}`, () => toggle(i), { cls: 'small' }));
    p.dock().append(h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:6px' }, ...btns));
    function toggle(i: number): void {
      if (won) return;
      p.move();
      const was = bolted[i];
      bolted.fill(true);
      bolted[i] = !was;
      arrows.forEach((a, k) => a.setOpacity(bolted[k] ? 1 : 0.12));
      btns.forEach((b, k) => { b.textContent = bolted[k] ? `Unbolt ${fmtV(PRUNE[k])}` : `Bolt ${fmtV(PRUNE[k])} back`; });
      sfx.snap();
      paint();
      if (p4Won(bolted)) { won = true; sfx.success(); p.win(); return; }
      if (!bolted[3]) p.bark('lantern', 'Without (0, 0, 1) nothing pushes up or down. The glow is the floor plane.');
    }
    // clicking an arrow's tip toggles it too
    const el = p.g.stage.renderer.domElement;
    const onDown = (e: PointerEvent) => {
      const hit = p.g.stage.pick(e.clientX, e.clientY, arrows.map((a) => a.grab));
      const i = arrows.findIndex((a) => a.grab === hit);
      if (i >= 0) toggle(i);
    };
    el.addEventListener('pointerdown', onDown);
    p.onDispose(() => el.removeEventListener('pointerdown', onDown));
    paint();
    return {
      async showMe() { await wait(400); toggle(2); },
      async wrong() { toggle(3); },
    };
  },
};

// ------------------------------------------------------------------ p5 [D] four arrows always loop

const P5_TILES = [
  { id: 'split', text: 'If $\\mathbf a_1, \\mathbf a_2, \\mathbf a_3$ already have a loop, give $\\mathbf a_4$ dial 0: that is a loop of all four. Otherwise…' },
  { id: 'indep', text: '…they point in three independent directions.' },
  { id: 'reach', text: 'So they reach every point in space, including the tip of $\\mathbf a_4$.' },
  { id: 'combo', text: 'So $\\mathbf a_4 = c_1\\mathbf a_1 + c_2\\mathbf a_2 + c_3\\mathbf a_3$ for some dials.' },
  { id: 'move', text: 'Move $\\mathbf a_4$ across: $c_1\\mathbf a_1 + c_2\\mathbf a_2 + c_3\\mathbf a_3 - \\mathbf a_4 = \\mathbf 0$.' },
  { id: 'loop', text: 'The dial on $\\mathbf a_4$ is $-1$, not zero: a loop.' },
];
const P5_DECOY = { id: 'decoy', text: 'Among four arrows, two are always parallel.' };
/** Navigator: the general reason, chosen before the loop is typed. */
const P5_WHY = [
  { id: 'reach', text: 'The first three reach every point, so $\\mathbf a_4$ is reachable from them: $\\mathbf a_4 = c_1\\mathbf a_1 + c_2\\mathbf a_2 + c_3\\mathbf a_3$.' },
  { id: 'parallel', text: 'Two of the arrows are parallel.' },
  { id: 'zero', text: '$\\mathbf a_4$ is the zero arrow.' },
];
const P5_WHY_WRONG: Record<string, string> = {
  parallel: 'Bram’s four arrows have no parallel pair. The loop comes from reach, not from parallels.',
  zero: 'a₄ ends away from the start, so it is not the zero arrow. The loop comes from reach.',
};

export const p5: PuzzleDef = {
  id: 'c03-p5',
  title: 'Why do four arrows in 3-D always loop?',
  view: '3d',
  goal: 'Bram shook the holotable and picked four arrows. Use the first three to land on the tip of the fourth (white), then **Fire**. LANTERN closes the loop.',
  subgoals: ['Land on the tip of the fourth arrow', 'Write the loop'],
  hints: [
    'Three arrows that point in three independent directions reach every point, so the white tip is reachable.',
    'Watch the yellow tip while you turn one dial at a time. Get one coordinate right, then the next.',
    'Show me finds the dials.',
  ],
  onWin: S.p5Win,
  setup(p) {
    const d = p.difficulty;
    const four = bramFour(rng(Math.floor(Math.random() * 1e9)), d);
    const A = four.arrows.map(to3);
    const mid: V3 = [0, 1, 2].map((k) => A.reduce((s, a) => s + a[k], 0) / 8) as V3;
    void p.g.stage.view3D({ target: mid, distance: 13, azimuth: -55, elevation: 24, ms: 0 });
    const loop = [...four.dials, -1];
    const a4 = new Arrow(ORIGIN, A[3], { color: '#e8f1ff', label: '$\\mathbf a_4$' });
    const ring = new Dot(A[3], { color: '#e8f1ff', size: 0.1, glow: 1.6 });
    p.add(a4, ring);
    const flags = [false, false];
    let closed = false;
    const tick = (i: number) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); } if (flags[0] && flags[1] && closed) p.win(); };
    const rig = new DialRig(p, {
      arrows: A.slice(0, 3), dims: 3, names: ['c_1', 'c_2', 'c_3'], symbols: ['\\mathbf a_1', '\\mathbf a_2', '\\mathbf a_3'], dials: [0, 0, 0], range: [-3, 3],
      step: d === 'commander' ? 0.5 : 1, preview: 'live', readoutTitle: 'Bram’s four arrows', glow: { cell: 0.13 },
      onArrive: (end) => {
        if (near3(end, A[3], tolFor(p))) {
          const back = new Arrow(A[3], ORIGIN, { color: '#e8f1ff', opacity: 0.75, width: 0.035, label: '$-\\mathbf a_4$', labelAt: 'mid' });
          p.add(back);
          loopTrace(p, A, loop);
          closed = true;
          tick(0);
          if (d === 'cadet') { p.bark('lantern', `Loop: dials ${loop.map((x) => nice(x)).join(', ')}. Not all zero, and the ship is back at the start.`); tick(1); }
          void rig.shipTo(ORIGIN, 1100).then(() => flare(p, ORIGIN, C.result));
          return 'win';
        }
        rig.gap.show(end, A[3]);
        return 'miss';
      },
    });
    rig.readout?.row('a4', '$\\mathbf a_4$', fmtV(A[3]), '#e8f1ff');
    let ws: StepWorksheet | null = null;
    let tiles: TileOrder | null = null;
    let pickWhy: ((id: string) => void) | null = null;
    const loopSheet = (steps: ConstructorParameters<typeof StepWorksheet>[1]['steps']) => {
      ws = new StepWorksheet(p, { steps, onDone: () => tick(1) });
      p.dock().prepend(ws.el);
    };
    if (d === 'navigator') {
      // first the general reason (a choice), then the loop for Bram's arrows (typed)
      const box = h('div', { class: 'worksheet' }, h('div', { class: 'kicker' }, 'Why do Bram’s four arrows always have a loop?'));
      const cards = new ChoiceCards(P5_WHY, (id) => pickWhy?.(id));
      box.append(cards.el);
      p.dock().prepend(box);
      pickWhy = (id) => {
        p.move();
        if (id !== 'reach') { cards.mark(id, 'wrong'); p.bark('lantern', P5_WHY_WRONG[id]); return; }
        // the dock is tall: the answered choice gives way to the worksheet, and LANTERN says it
        box.remove();
        pickWhy = null;
        p.bark('lantern', 'Right. The first three reach every point, so they reach the tip of a₄. Now write the loop.');
        loopSheet([
          { prompt: 'Dials that land on the tip of $\\mathbf a_4$: $(c_1, c_2, c_3) =$', answer: four.dials },
          { prompt: 'The dial on $\\mathbf a_4$ in the loop: $c_4 =$', answer: -1, mistakes: [[1, 'The ship comes home along a₄ backwards: c₄ = −1.']] },
          { prompt: 'The loop dials $(c_1, c_2, c_3, c_4) =$', answer: loop },
        ]);
      };
    } else if (d === 'commander') {
      tiles = new TileOrder(p, {
        title: 'Why is there always a loop? Order the steps', tiles: P5_TILES, decoys: [P5_DECOY], submitLabel: 'Check order',
        onSubmit: (o) => {
          p.move();
          if (o.join() === P5_TILES.map((x) => x.id).join()) {
            tiles!.el.remove(); tiles = null;
            loopSheet([{ prompt: 'The loop for Bram’s arrows, exactly: $(c_1, c_2, c_3, c_4) =$', answer: loop }]);
          } else if (o.includes('decoy')) p.bark('lantern', 'Bram’s four arrows have no parallel pair. The loop comes from reach, not from parallels.');
          else p.bark('lantern', 'That order does not follow. Start with the case where the first three already loop.');
        },
      });
      p.dock().prepend(tiles.el);
    } else {
      p.setGoal('Bram shook the holotable and picked four arrows. LANTERN sets two dials. Turn the third so the yellow tip lands on the white tip, then **Fire**.');
      void (async () => { await wait(300); await rig.moveDials([four.dials[0], four.dials[1], 0], 900); })();
    }
    // Bram's shake: the arrows jitter through random sets, then settle on his four
    let quick = false;
    const shaken = (async () => {
      const r = rng(17);
      const saved = A.map((a) => a.slice() as V3);
      for (let k = 0; k < 5 && !quick; k++) {
        const jitter = saved.map(() => [r() * 4 - 2, r() * 4 - 2, r() * 3 - 1] as V3);
        void rig.setArrows(jitter.slice(0, 3));
        a4.set(ORIGIN, jitter[3]);
        sfx.tick(k);
        await wait(110);
      }
      void rig.setArrows(saved.slice(0, 3));
      a4.set(ORIGIN, saved[3]);
      rig.glow?.clear();
    })();
    const run = async (fast: boolean) => {
      quick = fast;
      await shaken;
      if (!fast) await wait(500);
      if (pickWhy) { pickWhy('reach'); if (!fast) await wait(600); }
      if (tiles) { tiles.set(P5_TILES.map((x) => x.id)); if (!fast) await wait(600); tiles.el.remove(); tiles = null; loopSheet([{ prompt: 'The loop for Bram’s arrows, exactly: $(c_1, c_2, c_3, c_4) =$', answer: loop }]); }
      if (fast) rig.setDials(four.dials); else await rig.moveDials(four.dials, 1100);
      await rig.fire();
      if (ws) { if (fast) ws.solve(); else await ws.showMe(300); }
      for (let i = 0; i < 300 && !p.won; i++) await wait(20);
    };
    return {
      async showMe() { await run(false); },
      async solve() { await run(true); },
      async wrong() { rig.setDials([0, 0, 0]); await rig.fire(); },
    };
  },
};

// ------------------------------------------------------------------ p6 [S] three in the plane

export const p6: PuzzleDef = {
  id: 'c03-p6',
  title: 'Stretch: can three arrows on a flat deck avoid a loop?',
  style: 'mastery',
  goal: 'Optional. Drag the three arrows anywhere on the deck. Press **Look for a loop**: LANTERN searches for dials, not all zero, that bring the ship back. Make it fail. (Three tries.)',
  hints: ['Try three arrows that point three different ways.', 'Two arrows that point different ways already reach every point of the deck, including the third tip.', 'There is always a loop. Three tries and Bram concedes.'],
  onWin: S.p6Win,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [0.5, 0.8], height: 11, ms: 0 });
    const handles = [[2, 1, 0], [-1, 2, 0], [1, -2, 0]].map((t, i) => new VectorHandle(p, { to: t as V3, color: [C.v, C.w, C.u][i], label: `$\\mathbf a_${i + 1}$` }));
    const rig = new DialRig(p, {
      arrows: handles.map((hh) => hh.vec), dims: 2, names: ['c_1', 'c_2', 'c_3'], symbols: ['\\mathbf a_1', '\\mathbf a_2', '\\mathbf a_3'], dials: [0, 0, 0],
      range: [-6, 6], preview: 'live', sliders: false, typed: false, fireLabel: null, baseArrows: false, readoutTitle: 'LANTERN’s loop search', glow: false,
    });
    let tries = 0;
    let last = '';
    let busy = false;
    const msg = h('div', { class: 'c-muted', style: 'font-size:13px' }, 'Tries: 0 of 3');
    let quick = false;
    const look = async () => {
      if (busy || p.won) return;
      const vs = handles.map((hh) => hh.vec);
      const key = vs.map((v) => v.map((x) => Math.round(x * 100)).join(',')).join(';');
      if (key === last) { p.bark('bram', 'Move them first. Same arrows, same loop.'); return; }
      busy = true;
      p.move();
      last = key;
      const l = planeLoop(vs)!;
      const m = Math.max(...l.map(Math.abs));
      const dl = m > 4 ? l.map((x) => (x * 4) / m) : l;
      await rig.setArrows(vs.map(to3));
      rig.setDials([0, 0, 0], false);
      if (quick) rig.setDials(dl); else { await rig.moveDials(dl, 700); await rig.fly(dl); }
      if (!quick) await rig.rewind(300);
      tries++;
      msg.textContent = `Tries: ${tries} of 3 · loop found: dials ${dl.map((x) => nice(x)).join(', ')}`;
      sfx.snap();
      busy = false;
      if (tries >= 3) p.win();
    };
    p.dock().append(button('Look for a loop', () => void look(), { cls: 'primary' }), msg);
    const sets: V3[][] = [[[2, 1, 0], [-1, 2, 0], [1, -2, 0]], [[3, 0, 0], [0, 2, 0], [-2, -2, 0]], [[1, 2, 0], [2, -1, 0], [-3, 1, 0]]];
    const run = async (fast: boolean) => {
      quick = fast;
      for (const s of sets) {
        if (p.won) break;
        s.forEach((t, i) => handles[i].set(t, ORIGIN));
        last = '';
        await look();
        if (!fast) await wait(400);
      }
    };
    return { async showMe() { await run(false); }, async solve() { await run(true); } };
  },
};

// ------------------------------------------------------------------ SP-I Lift (Act I set piece)

const SP_COLORS = [C.v, C.w, C.u, '#d7e0f0'];

export const lift: PuzzleDef = {
  id: 'c03-sp',
  title: 'Act I set piece: which three thrusters lift us to the ark?',
  view: '3d',
  goal: 'Four thrusters, power for **three**. Unbolt one, then set the dials so the ship reaches the ark’s approach point **(4, −1, 6)** with fuel at most **6.5**. **Fire**.',
  subgoals: ['Power three thrusters that still reach all of space', 'Reach (4, −1, 6) with fuel at most 6.5'],
  hints: [
    'The spare (2, −1, 1) is 2 of thruster two minus 1 of thruster three. It adds no new direction.',
    'Without the spare: $a(1, 0, 1) + b(0, 1, 1) + c(0, 0, 2) = (a,\\ b,\\ a + b + 2c)$.',
    'Unbolt the spare. Dials 4, −1, 1.5: fuel 6.5.',
  ],
  par: 3,
  onWin: S.liftWin,
  setup(p) {
    void p.g.stage.view3D({ target: [1.8, -0.2, 2.8], distance: 20, azimuth: -62, elevation: 18, ms: 0 });
    const approach = new Beacon(p.g.stage, to3(SP_TARGET), { label: 'approach point (4, −1, 6)', color: '#59e1ff' });
    p.add(approach);
    const step = p.difficulty === 'commander' ? dialStep(p) : 0.5;
    let won = false;
    const rig: DialRig = new DialRig(p, {
      arrows: SP_ARROWS.map(to3), dims: 3, colors: SP_COLORS, names: ['a', 'b', 'c', 'd'], symbols: ['\\mathbf v', '\\mathbf w', '\\mathbf u', '\\mathbf s'],
      tags: ['thruster two', 'thruster three', 'new mount', 'spare'], dials: [0, 0, 0, 0], range: [-5, 5], step, readoutTitle: 'Thruster rack',
      glow: { cell: 0.14 },
      beforeFire: (): string | null => (rig.bolted.filter(Boolean).length > 3 ? 'Power for three thrusters only. Unbolt one first.' : null),
      onChange: (d) => rig?.readout?.row('f', 'fuel', `${fmtDial(fuel(d))} of ${SP_FUEL}`, fuel(d) > SP_FUEL ? C.orange : undefined),
      onArrive: (end, dials) => {
        if (spWon(rig.bolted, dials, tolFor(p))) { won = true; flare(p, to3(SP_TARGET), '#59e1ff'); p.subgoal(1); p.win(); void climb(); return 'win'; }
        if (near3(end, SP_TARGET, tolFor(p))) { p.bark('lantern', `On the approach point, but fuel used: ${fmtDial(fuel(dials))}. The limit is ${SP_FUEL}.`); return 'miss'; }
        rig.gap.show(end, to3(SP_TARGET));
        p.bark('lantern', spanDim(SP_ARROWS.filter((_, i) => rig.bolted[i])) < 3 ? 'These three only reach a plane. The approach point is off it.' : `Landed at ${fmtV(end)}.`);
        return 'miss';
      },
    });
    const btns = SP_ARROWS.map((v, i) => button(`Unbolt ${['v', 'w', 'u', 's'][i]} ${fmtV(v)}`, () => toggle(i), { cls: 'small' }));
    p.dock().prepend(h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:6px' }, ...btns));
    function toggle(i: number): void {
      if (rig.busy || won) return;
      p.move();
      rig.setBolted(i, !rig.bolted[i]);
      btns[i].textContent = `${rig.bolted[i] ? 'Unbolt' : 'Bolt'} ${['v', 'w', 'u', 's'][i]} ${fmtV(SP_ARROWS[i])}`;
      btns[i].classList.toggle('primary', !rig.bolted[i]);
      rig.glow?.clear();
      const on = SP_ARROWS.filter((_, k) => rig.bolted[k]);
      if (on.length === 3 && spanDim(on) === 3) p.subgoal(0); else p.subgoal(0, false);
      if (on.length === 3 && spanDim(on) < 3) p.bark('lantern', 'Those three lie in one plane. The approach point is off it.');
      sfx.snap();
    }
    rig.readout?.row('f', 'fuel', `0 of ${SP_FUEL}`);
    async function climb(): Promise<void> {
      await wait(300);
      sfx.whoosh(1.4);
      await rig.shipTo([SP_TARGET[0] + 0.5, SP_TARGET[1] - 0.5, SP_TARGET[2] + 2.5], 1600);
    }
    return {
      async showMe() { toggle(3); await rig.moveDials(SP_DIALS, 1200); await rig.fire(); for (let i = 0; i < 300 && !p.won; i++) await wait(20); },
      async solve() { toggle(3); rig.setDials(SP_DIALS); await rig.fire(); for (let i = 0; i < 300 && !p.won; i++) await wait(20); },
      async wrong() { rig.setDials([4, -1, 1.5, 0]); await rig.fire(); },
    };
  },
};

