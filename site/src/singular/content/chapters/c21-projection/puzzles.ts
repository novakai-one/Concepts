// Chapter 21 puzzles 1–4: onto a line, the hatch from day one, the sum of shadows [D], and the trap.
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Beacon, Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { Shadow } from '../../../kit/geom';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { VectorInput } from '../../../ui/widgets';
import { h, button } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { dot, norm, vsub } from '../../../math/la';
import { DropLine, DropPlane } from './drop';
import {
  HATCH, HATCH_DIST, HATCH_FOOT, P1_A, P1_B, P1_DIST, P1_FOOT, P1_LEFT, P3_B, P3_C, P3_LEFT, P3_P, P3_S1, P3_S2, P3_U1, P3_U2,
  P4_B, P4_K1, P4_K2, P4_OVERLAP, P4_S1, P4_S2, P4_WRONG, TETHER, THR1, THR2, fmtN, fmtV, near, p1Won, p2Won,
  p3Won, p4FootOk, p4OverlapOk, tolFor,
} from './logic';
import { S } from './script';

export const v3 = (v: readonly number[], z = 0): V3 => [v[0], v[1], v[2] ?? z];
export const tag = (p: PuzzleCtx, text: string, at: V3, cls = '', offset: [number, number] = [0, -22]) => {
  const l = new Label(text, at, { className: `a8-pt ${cls}`, offset });
  p.add(l);
  return l;
};
/** Snap step by difficulty: cadet a, navigator b, commander free. */
export const stepFor = (p: PuzzleCtx, cadet: number, nav: number): number | null => (p.difficulty === 'cadet' ? cadet : p.difficulty === 'navigator' ? nav : null);

/** A typed answer row for Commander ("type it exactly"): a vector input and a Check button. */
export function typedRow(p: PuzzleCtx, o: { dim: number; label: string; prompt: string; check: (v: number[]) => boolean; onWrong?: (v: number[]) => string }) {
  const msg = h('div', { class: 'a8-msg' });
  const vi = new VectorInput({ dim: o.dim, label: o.label, onSubmit: () => submit() });
  const submit = () => {
    p.move();
    const v = vi.get();
    if (o.check(v)) { msg.className = 'a8-msg good'; msg.textContent = 'Exactly.'; sfx.snap(); return true; }
    msg.className = 'a8-msg bad'; msg.textContent = o.onWrong?.(v) ?? 'Not this point.'; sfx.miss();
    return false;
  };
  p.dock().append(h('div', { class: 'a8-note' }, o.prompt), h('div', { class: 'a8-row a8-in' }, vi.el, button('Check', () => void submit(), { cls: 'small' })), msg);
  return { vi, submit, set: (v: number[]) => vi.set(v) };
}

// ------------------------------------------------------------------ p1 Onto a line

export const p1: PuzzleDef = {
  id: 'c21-p1',
  title: 'Which point of the line is nearest?',
  goal: 'Drag the yellow probe along the line through $\\cr{\\mathbf a} = (1, 2)$. Park it at the point nearest to $\\cg{\\mathbf b} = (3, 1)$.',
  predict: {
    prompt: 'How far is $\\mathbf b = (3, 1)$ from the line through $(1, 2)$?',
    choices: [{ id: 'r5', text: '$\\sqrt 5 \\approx 2.24$' }, { id: 'two', text: '2' }, { id: 'r10', text: '$\\sqrt{10} \\approx 3.16$' }],
    answer: 'r5',
    reveal: 'The leftover $(2, -1)$ is the shortest arrow from the line to $\\mathbf b$. Its length is $\\sqrt{4 + 1} = \\sqrt 5 \\approx 2.24$. $\\sqrt{10}$ is the distance from the origin.',
  },
  hints: [
    'Watch the dashed leftover arrow from the probe to $\\mathbf b$. It is shortest where it makes a right angle with the line.',
    'At the right angle, the leftover reads 0 against $\\mathbf a$: $(\\mathbf b - \\mathbf p)\\cdot\\mathbf a = 0$.',
    'The nearest point is $(1, 2)$: the tip of $\\mathbf a$ itself.',
  ],
  par: 2,
  onWin: S.p1Win,
  setup(p) {
    p.grid();
    void p.g.stage.view2D({ center: [1.2, 1.3], height: 8, ms: 0 });
    const tol = tolFor(p.difficulty);
    const aA = new Arrow([0, 0, 0], v3(P1_A), { color: C.w, label: '$\\mathbf a$' });
    const bA = new Arrow([0, 0, 0], v3(P1_B), { color: C.v, label: '$\\mathbf b$' });
    p.add(aA, bA);
    const r = p.readout('Probe');
    let done = false;
    const show = (t: number) => {
      const q = [P1_A[0] * t, P1_A[1] * t];
      const l = vsub(P1_B, q);
      r.row('p', 'probe $\\mathbf p$', fmtV(q), C.result);
      r.row('d', 'distance to $\\mathbf b$', fmtN(norm(l)));
      r.row('dot', 'leftover $\\cdot\\,\\mathbf a$', fmtN(dot(l, P1_A)), Math.abs(dot(l, P1_A)) < 1e-6 ? C.good : C.white);
    };
    const finish = () => {
      if (done) return;
      done = true;
      dl.setEnabled(false);
      tag(p, `leftover ${fmtV(P1_LEFT)} · length ${fmtN(P1_DIST)}`, v3([(P1_FOOT[0] + P1_B[0]) / 2, (P1_FOOT[1] + P1_B[1]) / 2]), 'y', [86, 6]);
      r.note('At the nearest point the leftover is at a right angle to the line. Any other point of the line is further away.');
      p.win();
    };
    const dl = new DropLine(p, {
      dir: v3(P1_A), target: v3(P1_B), t0: -0.75, step: stepFor(p, 0.25, 0.25), magnet: p.difficulty === 'cadet' ? 0.3 : 0, range: [-1.25, 2.25],
      onMove: (t) => show(t),
      onEnd: (t) => { if (p1Won(t, tol)) finish(); else if (p.difficulty !== 'cadet') sfx.tick(t); },
    });
    show(dl.t);
    const typed = p.difficulty === 'commander'
      ? typedRow(p, { dim: 2, label: '\\mathbf p =', prompt: 'Or type the nearest point exactly:', check: (v) => near(v, P1_FOOT, 1e-6) && (dl.set(1), show(1), finish(), true) })
      : null;
    return {
      async showMe() { await dl.moveTo(1, 900); if (!done) finish(); },
      solve() { dl.set(1); show(1); if (typed) { typed.set(P1_FOOT); typed.submit(); } else finish(); },
      wrong() { dl.set(3); show(3); },
    };
  },
};

// ------------------------------------------------------------------ p2 Get close enough (the hatch, TT16)

export const p2: PuzzleDef = {
  id: 'c21-p2',
  title: 'How close to the hatch can two thrusters get us?',
  goal: 'The thrusters reach the plane spanned by $\\cg{(1, 0, 1)}$ and $\\cr{(0, 1, 1)}$. Drag the *Lantern* (yellow) across it and park at the point nearest the hatch. The tether is **1.2** long.',
  predict: {
    prompt: 'From the plane, will the 1.2 tether reach the hatch at $(1, 1, 0)$?',
    choices: [{ id: 'yes', text: 'Yes' }, { id: 'no', text: 'No, it is too far' }, { id: 'flat', text: 'Only if the plane were the floor' }],
    answer: 'yes',
    reveal: 'Yes, with 0.045 to spare: the nearest point of the plane is 1.155 away. From where the *Lantern* started, at the origin, the hatch was 1.41 away.',
  },
  hints: [
    'The dashed tether runs from the *Lantern* to the hatch. Make it as short as you can.',
    'At the nearest point the tether stands straight out of the plane: at a right angle to both thruster arrows.',
    'Park at $(1/3, 1/3, 2/3)$: one third of each thruster.',
  ],
  par: 3,
  view: '3d',
  onWin: S.p2Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [0.45, 0.45, 0.3], distance: 11, azimuth: -62, elevation: 21, ms: 0 });
    p.grid({ base: 0.1, main: 0.2, axis: 0.45 });
    const tol = tolFor(p.difficulty);
    const hatch = new Beacon(p.g.stage, v3(HATCH), { color: C.accent });
    p.add(hatch);
    tag(p, 'hatch (1, 1, 0)', v3(HATCH), 'c', [0, 24]);
    const r = p.readout('Tether');
    let done = false;
    const show = (q: V3) => {
      const d = norm(vsub(HATCH, q));
      r.row('q', 'the *Lantern* at', fmtV(q, 3), C.result);
      r.row('d', 'tether needed', fmtN(d, 3), d <= TETHER ? C.good : C.orange);
      r.row('t', 'tether length', '1.2');
    };
    const ship = tag(p, 'Lantern', [0, 0, 0], 'y', [0, 22]);
    const finish = async () => {
      if (done) return;
      done = true;
      dp.setEnabled(false);
      r.note(`The tether is at a right angle to the plane. ${fmtN(HATCH_DIST, 3)} is less than 1.2: it reaches.`);
      sfx.success();
      p.win();
    };
    const dp = new DropPlane(p, {
      a: v3(THR1), b: v3(THR2), target: v3(HATCH), w0: [0, 0], step: stepFor(p, 1 / 3, 1 / 6), magnet: p.difficulty === 'cadet' ? 0.22 : 0, range: 2, size: 4,
      labels: ['$\\mathbf t_1$', '$\\mathbf t_2$'],
      onMove: (_w, q) => { show(q); ship.at(q); },
      onEnd: (_w, q) => { if (p2Won(q, tol)) void finish(); },
    });
    show(dp.p);
    const typed = p.difficulty === 'commander'
      ? typedRow(p, { dim: 3, label: '\\mathbf p =', prompt: 'Or type the parking point exactly (fractions like 1/3 are fine):', check: (v) => near(v, HATCH_FOOT, 1e-6) && (dp.set([1 / 3, 1 / 3]), ship.at(v3(HATCH_FOOT)), show(v3(HATCH_FOOT)), void finish(), true), onWrong: (v) => (Math.abs(v[2] - v[0] - v[1]) > 1e-6 ? 'That point is off the plane: its height is not across plus up.' : 'On the plane, but not the nearest point.') })
      : null;
    return {
      async showMe() { await dp.moveTo([1 / 3, 1 / 3], 1000); ship.at(dp.p); await finish(); },
      solve() { dp.set([1 / 3, 1 / 3]); ship.at(dp.p); show(dp.p); if (typed) { typed.set(HATCH_FOOT); typed.submit(); } else void finish(); },
      wrong() { dp.set([1, 1]); show(dp.p); },
    };
  },
};

// ------------------------------------------------------------------ p3 [D] Sum of shadows, perpendicular basis

export const p3: PuzzleDef = {
  id: 'c21-p3',
  title: 'When do two shadows add up to the nearest point?',
  goal: 'The plane is spanned by $\\cg{\\mathbf u_1} = (1, 1, 0)$ and $\\cr{\\mathbf u_2} = (0, 0, 1)$, at a right angle. Find the point of the plane nearest the beacon $\\mathbf b = (3, 1, 2)$ from the two shadows.',
  hints: [
    'The shadow of $\\mathbf b$ on $\\mathbf u_1$ is $\\frac{\\mathbf b\\cdot\\mathbf u_1}{\\mathbf u_1\\cdot\\mathbf u_1}\\mathbf u_1 = \\frac{4}{2}\\mathbf u_1$.',
    'The shadow on $\\mathbf u_2$ is $\\frac{2}{1}\\mathbf u_2 = (0, 0, 2)$. Add the two shadows.',
    'The nearest point is $(2, 2, 2)$. The leftover $(1, -1, 0)$ reads 0 against both arrows.',
  ],
  par: 3,
  view: '3d',
  onWin: S.p3Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [1.5, 1.2, 1.1], distance: 13, azimuth: 13, elevation: 20, ms: 0 });
    p.grid({ base: 0.1, main: 0.2, axis: 0.45 });
    const d = p.difficulty;
    const tol = tolFor(d);
    const bA = new Arrow([0, 0, 0], v3(P3_B), { color: C.white, label: '$\\mathbf b$' });
    p.add(bA);
    const sh1 = new Shadow(p, { of: v3(P3_B), onto: v3(P3_U1), lineColor: C.v });
    const sh2 = new Shadow(p, { of: v3(P3_B), onto: v3(P3_U2), lineColor: C.w });
    sh1.setOpacity(0); sh2.setOpacity(0);
    const r = p.readout('Two shadows');
    let done = false;
    const showShadows = async (ms = 700) => {
      await animate(ms, (k) => sh1.setOpacity(k), ease.out);
      r.row('s1', 'shadow on $\\mathbf u_1$', fmtV(P3_S1), C.result);
      await animate(ms, (k) => sh2.setOpacity(k), ease.out);
      r.row('s2', 'shadow on $\\mathbf u_2$', fmtV(P3_S2), C.result);
    };
    const finish = async () => {
      if (done) return;
      done = true;
      dp.setEnabled(false);
      dp.set([2, 2]);
      r.row('sum', 'their sum', fmtV(P3_P), C.result);
      r.row('left', 'leftover $\\mathbf b - \\mathbf p$', fmtV(P3_LEFT));
      r.note('The leftover reads 0 against $\\mathbf u_1$ and against $\\mathbf u_2$: the sum of the shadows is the nearest point.');
      p.win();
    };
    // the probe on the plane: weights s on u1 and t on u2
    const dp = new DropPlane(p, {
      a: v3(P3_U1), b: v3(P3_U2), target: v3(P3_B), w0: [0.5, 0.5], step: d === 'cadet' ? 1 : d === 'navigator' ? 0.5 : null, magnet: d === 'cadet' ? 0.3 : 0, range: 3, size: 6,
      labels: ['$\\mathbf u_1$', '$\\mathbf u_2$'],
      onEnd: (_w, q) => { if (d === 'cadet' && p3Won(q, tol)) void finish(); },
    });
    dp.leftover.object.visible = false;
    let ws: StepWorksheet | null = null;
    let tiles: TileOrder | null = null;
    // the nearest point, written with the weights only: the player works the numbers out (Navigator in the rows
    // above it, Commander in their own working after ordering the tiles)
    const pStep = { prompt: 'nearest point $\\mathbf p = c_1\\mathbf u_1 + c_2\\mathbf u_2$', answer: [P3_P], mistakes: [[[3, 1, 0], 'That deletes the height. The plane is not the floor.']] as [number[], string][] };
    const steps = [
      { prompt: '$\\mathbf b\\cdot\\mathbf u_1$', answer: 4, mistakes: [[3, 'Multiply matching parts: $3 \\cdot 1 + 1 \\cdot 1 + 2 \\cdot 0$.']] as [number, string][] },
      { prompt: '$\\mathbf u_1\\cdot\\mathbf u_1$', answer: 2, mistakes: [[Math.SQRT2, 'Not the length: the dot product of $\\mathbf u_1$ with itself.']] as [number, string][] },
      { prompt: '$\\mathbf b\\cdot\\mathbf u_2$', answer: 2 },
      { prompt: '$\\mathbf u_2\\cdot\\mathbf u_2$', answer: 1 },
      { prompt: '$\\mathbf u_2\\cdot\\mathbf u_1$', answer: 0, mistakes: [[1, 'Multiply matching parts: $0 \\cdot 1 + 0 \\cdot 1 + 1 \\cdot 0$. This 0 is what removes the cross term $c_2\\,\\mathbf u_2\\cdot\\mathbf u_1$.']] as [number, string][] },
      { prompt: '$c_1$ from $\\mathbf b\\cdot\\mathbf u_1 - c_1\\,\\mathbf u_1\\cdot\\mathbf u_1 - c_2\\,\\mathbf u_2\\cdot\\mathbf u_1 = 0$', answer: P3_C[0], mistakes: [[4, 'That is $\\mathbf b\\cdot\\mathbf u_1$ itself. Divide by $\\mathbf u_1\\cdot\\mathbf u_1$.']] as [number, string][] },
      { prompt: '$c_2$ from $\\mathbf b\\cdot\\mathbf u_2 - c_1\\,\\mathbf u_1\\cdot\\mathbf u_2 - c_2\\,\\mathbf u_2\\cdot\\mathbf u_2 = 0$', answer: P3_C[1] },
      pStep,
      { prompt: 'leftover $\\mathbf b - \\mathbf p$', answer: [P3_LEFT] },
    ];
    if (d === 'cadet') {
      void showShadows();
      p.setGoal('The two yellow shadows are drawn. Drag the yellow point on the plane to where the two shadows add up, tip to tail.');
    } else if (d === 'navigator') {
      ws = new StepWorksheet(p, {
        steps, onDone: () => { void showShadows(300).then(finish); },
      });
    } else {
      const TILES = [
        { id: 'write', text: 'Write the nearest point as $\\mathbf p = c_1\\mathbf u_1 + c_2\\mathbf u_2$.' },
        { id: 'perp', text: 'The leftover $\\mathbf b - \\mathbf p$ reads 0 against $\\mathbf u_1$.' },
        { id: 'expand', text: 'Expand: $\\mathbf b\\cdot\\mathbf u_1 - c_1\\,\\mathbf u_1\\cdot\\mathbf u_1 - c_2\\,\\mathbf u_2\\cdot\\mathbf u_1 = 0$.' },
        { id: 'cross', text: '$\\mathbf u_2\\cdot\\mathbf u_1 = 0$, so the last term goes.' },
        { id: 'solve', text: 'So $c_1 = \\frac{\\mathbf b\\cdot\\mathbf u_1}{\\mathbf u_1\\cdot\\mathbf u_1}$: the shadow on $\\mathbf u_1$. The same for $c_2$.' },
      ];
      const REF = TILES.map((t) => t.id);
      tiles = new TileOrder(p, {
        title: 'Why the shadows add: order the steps', tiles: TILES, submitLabel: 'Check order',
        onSubmit: (o) => {
          p.move();
          if (o.join() === REF.join()) {
            tiles!.el.remove();
            ws = new StepWorksheet(p, { title: 'The last line', steps: [pStep], onDone: () => { void showShadows(300).then(finish); } });
          } else { sfx.miss(); p.bark('lantern', 'That order does not reach the formula. Start by writing what you are looking for.'); }
        },
      });
    }
    return {
      async showMe() {
        if (d === 'cadet') { await dp.moveTo([2, 2], 900); await finish(); return; }
        if (tiles) { tiles.set(['write', 'perp', 'expand', 'cross', 'solve']); tiles.el.remove(); ws = new StepWorksheet(p, { title: 'The last line', steps: [pStep], onDone: () => { void showShadows(300).then(finish); } }); }
        await ws!.showMe(250);
        await wait(700);
        await finish();
      },
      async solve() {
        if (d === 'cadet') { dp.set([2, 2]); await finish(); return; }
        if (tiles) { tiles.el.remove(); ws = new StepWorksheet(p, { title: 'The last line', steps: [pStep], onDone: () => {} }); }
        ws!.solve();
        await finish();
      },
      wrong() { if (d === 'cadet') dp.set([3, 0]); else ws?.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p4 The trap: a skewed basis

export const p4: PuzzleDef = {
  id: 'c21-p4',
  title: 'Why did adding the shadows miss?',
  goal: 'The floor is spanned by $\\cg{\\mathbf k_1} = (1, 0, 0)$ and $\\cr{\\mathbf k_2} = (1, 1, 0)$: not at a right angle. Adding the two shadows of $\\mathbf b = (2, 3, 4)$ lands on the orange point. Find the true nearest point, then draw the overlap.',
  subgoals: ['Drop the true perpendicular: drag the yellow point to the floor point nearest the beacon', 'Draw the overlap: drop the tip of the second shadow onto the first arrow’s line'],
  predict: {
    prompt: 'The sum of the shadows lands at $(4.5, 2.5, 0)$. Is that the nearest point of the floor to $(2, 3, 4)$?',
    choices: [{ id: 'yes', text: 'Yes, the shadows always add up' }, { id: 'no', text: 'No' }],
    answer: 'no',
    reveal: 'No. The floor point nearest $(2, 3, 4)$ is straight below it, $(2, 3, 0)$, 4 away. The sum is 4.74 away. Both shadows push along $\\mathbf k_1$, 2 and 2.5 more, so they overlap and do not add up to the nearest point. With arrows at a right angle the overlap is 0.',
  },
  hints: [
    'This plane is the floor. The point of the floor nearest $(2, 3, 4)$ is straight below it.',
    'For the overlap, drag the second probe along the line of $\\mathbf k_1$ until the dashed line from the tip of the second shadow meets it at a right angle.',
    'The nearest point is $(2, 3, 0)$. The overlap is $(2.5, 0, 0)$: the second shadow already pushes 2.5 along $\\mathbf k_1$, on top of the first shadow’s 2.',
  ],
  par: 3,
  view: '3d',
  onWin: S.p4Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [2, 1.4, 1.4], distance: 15, azimuth: -70, elevation: 24, ms: 0 });
    p.grid({ base: 0.12, main: 0.24, axis: 0.5 });
    const d = p.difficulty;
    const tol = tolFor(d);
    const bA = new Arrow([0, 0, 0], v3(P4_B), { color: C.white, label: '$\\mathbf b$' });
    p.add(bA);
    // the two shadows from the origin, and their sum (the far corner of their parallelogram)
    const s1 = new Arrow([0, 0, 0.02], v3(P4_S1, 0.02), { color: C.result, width: 0.04, opacity: 0.85 });
    const s2 = new Arrow([0, 0, 0.02], v3(P4_S2, 0.02), { color: C.result, width: 0.04, opacity: 0.85 });
    const sumSides = new FatLine(p.g.stage, [v3(P4_S1, 0.02), v3(P4_WRONG, 0.02), v3(P4_S2, 0.02)], { color: C.result, width: 1.3, opacity: 0.45, dashed: true, dashSize: 0.12, gapSize: 0.1 });
    const wrongDot = new Dot(v3(P4_WRONG, 0.02), { color: C.orange, size: 0.11 });
    const wrongLeft = new FatLine(p.g.stage, [v3(P4_WRONG), v3(P4_B)], { color: C.orange, width: 1.6, opacity: 0.75, dashed: true, dashSize: 0.14, gapSize: 0.1 });
    p.add(s1, s2, sumSides, wrongDot, wrongLeft);
    tag(p, 'sum of the shadows (4.5, 2.5, 0)', v3(P4_WRONG), 'o', [0, 24]);
    const r = p.readout('The trap');
    r.row('sum', 'sum of the shadows', fmtV(P4_WRONG), C.orange);
    r.row('sd', 'its distance to $\\mathbf b$', fmtN(norm(vsub(P4_B, P4_WRONG))), C.orange);
    const flags = [false, false];
    const tick = (i: number) => {
      if (!flags[i]) { flags[i] = true; p.subgoal(i); }
      if (flags.every(Boolean)) {
        overlapBar.setOpacity(1);
        r.note('Both shadows push along $\\mathbf k_1$: 2 from the first, 2.5 more from the second. With arrows at a right angle that overlap would be 0.');
        p.win();
      }
    };
    const dp = new DropPlane(p, {
      a: v3(P4_K1), b: v3(P4_K2), target: v3(P4_B), w0: [2, 2.5], step: d === 'cadet' ? 1 : d === 'navigator' ? 0.5 : null, magnet: d === 'cadet' ? 0.3 : 0,
      range: 5, showPlane: false, labels: ['$\\mathbf k_1$', '$\\mathbf k_2$'],
      onMove: (_w, q) => { r.row('q', 'your point', fmtV(q), C.result); r.row('qd', 'its distance to $\\mathbf b$', fmtN(norm(vsub(P4_B, q))), C.result); },
      onEnd: (_w, q) => { if (p4FootOk(q, tol)) { dp.setEnabled(false); sfx.success(); tick(0); } },
    });
    // the overlap probe: on the line of k1, dropping from the tip of the second shadow
    const ov = new DropLine(p, {
      dir: v3(P4_K1), target: v3(P4_S2), t0: 0.6, step: d === 'cadet' ? 0.5 : d === 'navigator' ? 0.25 : null, magnet: d === 'cadet' ? 0.3 : 0, range: [-1, 5], showLine: false, probeColor: C.orange,
      onEnd: (t) => { if (p4OverlapOk([t, 0, 0], tol)) { ov.setEnabled(false); r.row('ov', 'overlap along $\\mathbf k_1$', fmtV(P4_OVERLAP), C.orange); sfx.success(); tick(1); } },
    });
    const overlapBar = new FatLine(p.g.stage, [[0, 0, 0.03], [P4_S1[0], 0, 0.03]], { color: C.orange, width: 6, opacity: 0, intensity: 1.3 });
    p.add(overlapBar);
    return {
      async showMe() {
        if (!flags[0]) await dp.moveTo([-1, 3], 1000);
        if (!flags[1]) await ov.moveTo(2.5, 900);
      },
      solve() { dp.set([-1, 3]); dp.setEnabled(false); tick(0); ov.set(2.5); tick(1); },
      wrong() { dp.set([2, 2.5]); ov.set(2); },
    };
  },
};
