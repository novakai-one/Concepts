// Chapter 2 puzzles (GDD §6.3 Ch 2): p1 [F], p2, p3, p4 [H], p5, p6 [D] (the gimbals unlock), p7 [S].
import { Vector3 } from 'three';
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { VectorHandle } from '../../../kit/handle';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { Arrow } from '../../../gfx/arrow';
import { Beacon, Dot, Pad } from '../../../gfx/markers';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { InfLine } from '../../../gfx/shapes';
import { burst } from '../../../gfx/fx';
import { h, inline, button } from '../../../ui/ui';
import { parseNum } from '../../../ui/widgets';
import { C } from '../../../core/theme';
import { nice } from '../../../math/frac';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { music } from '../../../audio/music';
import { ReachGlow } from './reach';
import { DialRig, Gap, fmtV, fmtN, tolFor, to3 } from './rig';
import {
  V, W, P1_V, P1_K, p1W, p1Collapsed, P2_TARGET, P2_DIALS, P3_TARGET, P3_DIALS, P4_TARGET, P4_DIALS, BACKUP,
  P6_T, p6Dials, THRUST3, BEACON3, BEACON3_DIALS, SIGNAL, PLANE_N, edgeOn, distToSpan, nearestInSpan,
  weights2, landedOn, LAMP_GREEN, LAMP_RED, LAMP_BLUE, AMBER, AMBER_DIALS, LAMP_WARM, LAMP_COOL, p7OffPlane,
} from './logic';
import { S } from './script';

const V3_: V3 = to3(V);
const W3_: V3 = to3(W);

/** A beacon pad the player can drag around the deck. Calls onDrop with its position. */
function dragPad(p: PuzzleCtx, at: V3, onDrop: (q: V3) => void, label = 'beacon'): Pad {
  const pad = new Pad(p.g.stage, at, { label, color: '#59e1ff' });
  p.add(pad);
  p.g.drag.add({
    target: pad.group, getPos: () => pad.group.position.clone(), snap: () => p.snap() ?? 0.1,
    onMove: (q) => pad.at([q.x, q.y, 0]),
    onEnd: () => { p.move(); const q = pad.group.position; onDrop([q.x, q.y, 0]); },
  });
  return pad;
}

/** LANTERN's line for a beacon just off the line (p1, p5): out of reach, but the gap is too small to see. */
const nearMiss = (d: number): string => `Just off the line, by ${d.toFixed(2)}: the pair cannot reach it, but the gap is too small to see. Drag it further off.`;

/** A soft extra point light on a beacon when it is reached. */
function flare(p: PuzzleCtx, at: V3, color: string = C.good): void { void burst(p.g.stage, at, color, 60, 2.6, p.g.stage.mode === '2d'); }

// ------------------------------------------------------------------ p1 [F] every k that breaks it

export const p1: PuzzleDef = {
  id: 'c02-p1',
  title: 'For which k do the two arrows reach only a line?',
  style: 'mastery',
  goal: 'The glow marks every point $\\cg{\\mathbf v} = (1, 2)$ and $\\cr{\\mathbf w} = (2, k)$ can reach. Drag the tip of $\\cr{\\mathbf w}$ up or down until the glow collapses to a line. Then drag the beacon to a point the pair **cannot** reach.',
  subgoals: ['Collapse the glow to a line', 'Place the beacon where the pair cannot reach'],
  predict: {
    prompt: 'How many values of $k$ make the glow a single line?',
    choices: [{ id: 'none', text: 'None' }, { id: 'one', text: 'Exactly one' }, { id: 'two', text: 'Two' }, { id: 'all', text: 'Every value' }],
    answer: 'one',
    reveal: 'Exactly one: $k = 4$. Then $\\cr{\\mathbf w} = (2, 4) = 2\\,\\cg{\\mathbf v}$, on the same line through the start as $\\cg{\\mathbf v}$.',
  },
  hints: [
    'The glow is a line when $\\cr{\\mathbf w}$ lies on the same line through the start as $\\cg{\\mathbf v}$.',
    '$\\cg{\\mathbf v}$ goes 1 across for every 2 up. $\\cr{\\mathbf w}$ goes 2 across, so it needs 4 up.',
    'Set $k = 4$. Then drag the beacon off the glowing line, for example to (2, 0).',
  ],
  par: 2,
  onWin: S.p1Win,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [0.5, 1.2], height: 12, ms: 0 });
    const cmd = p.difficulty === 'commander';
    if (cmd) p.setGoal('First, by hand: type the value of $k$ that puts $\\cr{\\mathbf w} = (2, k)$ on the line of $\\cg{\\mathbf v} = (1, 2)$. Then drag the tip of $\\cr{\\mathbf w}$ to it and watch the glow. Then drag the beacon to a point the pair **cannot** reach.');
    const R = 9;
    const glow = new ReachGlow(p.g.stage, { cell: 0.34, capacity: 16000 });
    p.add(glow);
    let k = 1;
    let typedOk = !cmd;
    let collapsed = false;
    let won = false;
    const gainFor = (kk: number) => {
      const d = Math.abs(P1_V[0] * kk - P1_V[1] * 2);
      const L = 2 * R * (Math.hypot(1, 2) + Math.hypot(2, kk)) * 0.6;
      return 0.24 * Math.max(0.1, Math.min(0.55, Math.sqrt(Math.max(d * (2 * R) ** 2, L * 0.6) / (3 * (2 * R) ** 2))));
    };
    const place = (kk: number) => { glow.setArrows([to3(P1_V), to3(p1W(kk))]); glow.setGain(gainFor(kk)); };
    place(k);
    glow.fill([[-R, R], [-R, R]], { step: [0.19, 0.19], spread: 1.6 });
    const v = new Arrow([0, 0, 0], to3(P1_V), { color: C.v, label: '$\\mathbf v$' });
    p.add(v);
    const r = p.readout('Two arrows');
    const gap = new Gap(p);
    const show = () => {
      r.row('v', '$\\mathbf v$', fmtV(P1_V), C.v);
      r.row('w', '$\\mathbf w$', fmtV(p1W(k)), C.w);
      r.row('k', '$k$', fmtN(k));
      r.row('g', 'the glow is', collapsed ? 'one line' : 'the whole deck', C.result);
    };
    const check = () => {
      if (won || !collapsed || !typedOk) return;
      const b = pad.group.position;
      const q: number[] = [b.x, b.y];
      if (distToSpan([P1_V], q) >= 0.3) {
        won = true;
        const foot = nearestInSpan([P1_V], q);
        gap.show(to3(foot), [q[0], q[1], 0], 'out of reach');
        void pad.hit();
        p.subgoal(1);
        p.win();
      }
    };
    const w = new VectorHandle(p, {
      to: to3(p1W(k)), color: C.w, label: '$\\mathbf w$', snap: cmd ? 0.1 : undefined,
      constrain: (q) => new Vector3(2, Math.max(-3, Math.min(8, Math.round(q.y * 100) / 100)), 0),
      onChange: (tip) => {
        k = tip[1];
        place(k);
        const now = p1Collapsed(k, tolFor(p));
        if (now && !collapsed) { sfx.snap(); if (typedOk) p.subgoal(0); p.bark('lantern', '$\\mathbf w = (2, 4)$ is 2 times $\\mathbf v$. The glow is one line.'); }
        if (!now && collapsed) { p.subgoal(0, false); gap.clear(); }
        collapsed = now;
        show();
      },
      onCommit: () => check(),
    });
    const pad = dragPad(p, [-2, -4, 0], (q) => {
      if (won) return;
      if (!collapsed || !typedOk) {
        const [a, b] = weights2(P1_V, p1W(k), q.slice(0, 2));
        p.bark('lantern', collapsed ? 'First type the value of $k$.' : `Reachable: $${nice(a)}\\,\\mathbf v + ${nice(b)}\\,\\mathbf w$ lands there. The glow covers the whole deck.`);
        sfx.miss();
        return;
      }
      const q2 = q.slice(0, 2);
      const off = distToSpan([P1_V], q2);
      if (off < 1e-6) {
        gap.clear();
        const t = (q[0] * 1 + q[1] * 2) / 5;
        p.bark('lantern', `On the line: $${nice(t)}\\,\\mathbf v$ reaches it.`);
        sfx.miss();
        return;
      }
      if (off < 0.3) {
        // off the line, so out of reach, but too close to see: say so, never claim it is reachable
        gap.show(to3(nearestInSpan([P1_V], q2)), [q[0], q[1], 0]);
        p.bark('lantern', nearMiss(off));
        sfx.miss();
        return;
      }
      check();
    });
    if (cmd) {
      const cell = h('input', { class: 'cell', inputmode: 'decimal', style: 'width:80px', 'aria-label': 'the value of k', placeholder: 'k' }) as HTMLInputElement;
      const msg = h('span', { class: 'c-muted', style: 'font-size:13px' });
      const go = () => {
        const x = parseNum(cell.value);
        if (x === null) return;
        if (Math.abs(x - P1_K) < 1e-9) {
          const first = !typedOk;
          typedOk = true; cell.classList.remove('bad'); cell.style.borderColor = C.good; msg.textContent = '1 · k = 2 · 2';
          // w may already sit on k = 4, so the collapse will not fire again: tick the subgoal here
          if (first && collapsed) p.subgoal(0);
          void w.moveTo([2, P1_K, 0], 700);
        } else { sfx.miss(); cell.classList.add('bad'); cell.style.borderColor = ''; msg.textContent = `With k = ${fmtN(x)}, w = (2, ${fmtN(x)}) leaves v's line.`; }
      };
      cell.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') go(); });
      cell.addEventListener('change', go);
      p.dock().append(h('label', { style: 'display:flex;gap:10px;align-items:center;font-size:14px', html: '' }, h('span', { html: inline('Every $k$ that makes a line: $k =$') }), cell), msg);
    }
    show();
    const solveTo = async (ms: number) => {
      typedOk = true;
      await w.moveTo([2, P1_K, 0], ms);
      await animate(ms, (t) => pad.at([-2 + 4 * t, -4 + 4 * t, 0]), ease.inOut);
      check();
    };
    return {
      async showMe() { await solveTo(900); },
      async solve() { await solveTo(10); },
      async wrong() { typedOk = true; await w.moveTo([2, 3, 0], 10); pad.at([2, 0, 0]); check(); },
    };
  },
};

// ------------------------------------------------------------------ p2, p3: dials to a beacon

function beaconPuzzle(o: { id: string; title: string; goal: string; target: number[]; dials: number[]; wrongDials: number[]; center: [number, number]; onWin: PuzzleDef['onWin']; predict?: PuzzleDef['predict']; hints: string[] }): PuzzleDef {
  return {
    id: o.id, title: o.title, goal: o.goal, predict: o.predict, hints: o.hints, par: 2, onWin: o.onWin,
    setup(p) {
      p.grid();
      p.g.stage.view2D({ center: o.center, height: 11, ms: 0 });
      const target = to3(o.target);
      const pad = new Pad(p.g.stage, target, { label: 'beacon' });
      p.add(pad);
      const rig = new DialRig(p, {
        arrows: [V3_, W3_], dims: 2, names: ['a', 'b'], tags: ['thruster two', 'thruster three'], dials: [1, 1], range: [-4, 4],
        dragTip: true, guides: true, readoutTitle: 'Two thrusters',
        onArrive: (end) => {
          if (landedOn(end, target, tolFor(p))) { void pad.hit(); flare(p, target); p.win(); return 'win'; }
          rig.gap.show(end, target);
          p.bark('lantern', `Landed at ${fmtV(end.slice(0, 2))}. The beacon is at ${fmtV(o.target)}.`);
          return 'miss';
        },
      });
      return {
        async showMe() { await rig.moveDials(o.dials, 1100); await rig.fire(); },
        async solve() { rig.setDials(o.dials); await rig.fire(); },
        async wrong() { rig.setDials(o.wrongDials); await rig.fire(); },
      };
    },
  };
}

export const p2 = beaconPuzzle({
  id: 'c02-p2', title: 'Can two thrusters reach the beacon?',
  goal: 'Turn the two dials. The ship fires $a$ of thruster two, then $b$ of thruster three. Land on the beacon at **(5, 5)**, then **Fire**.',
  target: P2_TARGET, dials: P2_DIALS, wrongDials: [1, 2], center: [2.4, 2.4], onWin: S.p2Win,
  hints: ['Across: $2a + b$ must be 5. Up: $a + 3b$ must be 5.', 'Try whole numbers: $a = 2$ gives 4 across and 2 up from thruster two.', '$a = 2$, $b = 1$.'],
});

export const p3 = beaconPuzzle({
  id: 'c02-p3', title: 'Can they reach a beacon straight up?',
  goal: 'Land on the beacon at **(0, 5)**, then **Fire**.',
  target: P3_TARGET, dials: P3_DIALS, wrongDials: [0, 1.5], center: [0.6, 2.4], onWin: S.p3Win,
  predict: {
    prompt: 'Both thrusters push to the right. Can they land the ship on (0, 5), straight up from the start?',
    choices: [{ id: 'yes', text: 'Yes' }, { id: 'no', text: 'No: every push moves the ship right' }, { id: 'third', text: 'Only with a third thruster' }],
    answer: 'yes',
    reveal: 'Yes: $-1\\,\\cg{(2, 1)} + 2\\,\\cr{(1, 3)} = (0, 5)$. A negative dial fires a thruster backwards.',
  },
  hints: ['Across must come to 0: $2a + b = 0$. Up must be 5: $a + 3b = 5$.', 'If across is $2a + b = 0$, then $b = -2a$. One of the dials is negative.', '$a = -1$, $b = 2$.'],
});

// ------------------------------------------------------------------ p4 [H] is (4, 7) reachable?

export const p4: PuzzleDef = {
  id: 'c02-p4',
  title: 'Is (4, 7) a linear combination of v and w?',
  goal: 'Find the weights by hand: solve $2a + b = 4$ and $a + 3b = 7$ by substitution. Then type the dials and **Fire**.',
  subgoals: ['Find the weights by hand', 'Land on (4, 7)'],
  hints: ['Across gives $b = 4 - 2a$. Put that into $a + 3b = 7$.', '$a + 12 - 6a = 7$, so $-5a = -5$.', '$a = 1$, then $b = 4 - 2 = 2$.'],
  par: 6,
  onWin: S.p4Win,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [1.4, 3.3], height: 12, ms: 0 });
    const target = to3(P4_TARGET);
    const pad = new Pad(p.g.stage, target, { label: 'beacon' });
    p.add(pad);
    const flags = [false, false];
    const tick = (i: number) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); } if (flags[0] && flags[1]) p.win(); };
    const ws = new StepWorksheet(p, {
      steps: [
        { prompt: 'Across: $b = 4 - 2a$. Into $a + 3b = 7$: $a + 12 - 6a = 7$, so $-5a =$', answer: -5, mistakes: [[5, 'Take 12 from both sides: 7 − 12 = −5.'], [19, '12 moves to the other side with a minus sign: 7 − 12.']] },
        { prompt: 'So $a =$', answer: 1, mistakes: [[-1, '−5a = −5. Divide both sides by −5.']] },
        { prompt: 'Then $b = 4 - 2a =$', answer: 2, mistakes: [[6, 'b = 4 − 2 × 1, not 4 + 2.']] },
        { prompt: 'Check: $1\\,\\cg{\\begin{bmatrix}2\\\\1\\end{bmatrix}} + 2\\,\\cr{\\begin{bmatrix}1\\\\3\\end{bmatrix}} =$', answer: [4, 7] },
      ],
      onDone: () => {
        tick(0);
        if (p.difficulty !== 'commander') rig.setPreview(true);
        p.bark('lantern', 'Weights $a = 1$, $b = 2$. Set the dials and Fire.');
      },
    });
    const rig = new DialRig(p, {
      arrows: [V3_, W3_], dims: 2, names: ['a', 'b'], tags: ['thruster two', 'thruster three'], dials: [0, 0], range: [-4, 4],
      sliders: p.difficulty === 'cadet', preview: p.difficulty === 'cadet' ? 'auto' : 'never', guides: true, readoutTitle: 'Two thrusters',
      onArrive: (end) => {
        if (landedOn(end, target, tolFor(p))) { void pad.hit(); flare(p, target); tick(1); return flags[0] ? 'win' : 'ok'; }
        rig.gap.show(end, target);
        p.bark('lantern', `Landed at ${fmtV(end.slice(0, 2))}.`);
        return 'miss';
      },
    });
    return {
      async showMe() { await ws.showMe(250); await rig.moveDials(P4_DIALS, 700); await rig.fire(); },
      async solve() { ws.solve(); rig.setDials(P4_DIALS); await rig.fire(); },
      async wrong() { ws.wrong(); rig.setDials([2, 0]); await rig.fire(); },
    };
  },
};

// ------------------------------------------------------------------ p5 the backup thruster

export const p5: PuzzleDef = {
  id: 'c02-p5',
  title: 'What can the backup pair reach?',
  goal: 'Thruster three now pushes along $\\cr{\\mathbf w} = (-4, -2)$. Turn both dials and watch the glow. Then drag the beacon to a point this pair **cannot** reach.',
  subgoals: ['Turn the dials: see what the glow covers', 'Place the beacon where the pair cannot reach'],
  predict: {
    prompt: 'Thruster two pushes along (2, 1), the backup along (−4, −2). What will the glow cover?',
    choices: [{ id: 'plane', text: 'The whole deck, as before' }, { id: 'line', text: 'One line' }, { id: 'between', text: 'Only the region between the two arrows' }],
    answer: 'line',
    reveal: '$(-4, -2) = -2\\,(2, 1)$. Both thrusters push along one line through the start, so every combination stays on it.',
  },
  hints: ['Move both dials a long way, forward and back. Where does the yellow tip go?', 'Every push is along the line through (2, 1). The tip never leaves it.', 'Drag the beacon to (0, 3): it is off the line.'],
  par: 3,
  onWin: S.p5Win,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [0.5, 0.8], height: 11, ms: 0 });
    let painted = false;
    let won = false;
    const rig = new DialRig(p, {
      arrows: [V3_, to3(BACKUP)], dims: 2, names: ['a', 'b'], tags: ['thruster two', 'backup'], dials: [1, 0], range: [-4, 4],
      preview: 'live', dragTip: true, readoutTitle: 'Two thrusters', fireLabel: null,
      onChange: () => {
        if (!painted && (rig?.glow?.count ?? 0) > 70) { painted = true; p.subgoal(0); p.bark('lantern', 'Every dial setting lands on one line through the start.'); }
      },
    });
    const pad = dragPad(p, [4, 2, 0], (q) => {
      if (won) return;
      const q2 = q.slice(0, 2);
      const d = distToSpan([V], q2);
      if (d < 1e-6) {
        rig.gap.clear();
        const [a, b] = weights2(V, BACKUP, q2, rig.dials[1]);
        void rig.moveDials([a, b], 600);
        p.bark('lantern', `On the line: $a = ${nice(a)}$, $b = ${nice(b)}$ reaches it.`);
        sfx.miss();
        return;
      }
      if (d < 0.3) {
        // off the line, so out of reach, but too close to see: say so, never claim it is reachable
        rig.gap.show(to3(nearestInSpan([V], q2)), [q[0], q[1], 0]);
        p.bark('lantern', nearMiss(d));
        sfx.miss();
        return;
      }
      if (!painted) { p.bark('lantern', 'Turn the dials first. Watch where the glow goes.'); sfx.miss(); return; }
      won = true;
      const foot = nearestInSpan([V], q.slice(0, 2));
      const [a, b] = weights2(V, BACKUP, foot, rig.dials[1]);
      void rig.moveDials([a, b], 500);
      rig.gap.show(to3(foot), [q[0], q[1], 0], 'out of reach');
      void pad.hit();
      p.subgoal(1);
      p.win();
    });
    const run = async (ms: number) => {
      await rig.moveDials([-3, 0], ms);
      await rig.moveDials([-3, -2], ms * 0.7);
      await rig.moveDials([3, 1], ms * 1.2);
      if (!painted) { painted = true; p.subgoal(0); }
      await animate(ms * 0.6, (t) => pad.at([4 - 4 * t, 2 + t, 0]), ease.inOut);
      const q = pad.group.position;
      won = true;
      const foot = nearestInSpan([V], [q.x, q.y]);
      rig.gap.show(to3(foot), [q.x, q.y, 0], 'out of reach');
      void pad.hit();
      p.subgoal(1);
      p.win();
    };
    return {
      async showMe() { await run(900); },
      async solve() { await run(10); },
      async wrong() { painted = true; pad.at([-2, -1, 0]); },
    };
  },
};

// ------------------------------------------------------------------ p6 [D] why the glow is flat; first height

const STAGE1_TILES = [
  { id: 'pq', text: '$P = a_1\\mathbf v + b_1\\mathbf w$ and $Q = a_2\\mathbf v + b_2\\mathbf w$ are reachable.' },
  { id: 'r', text: 'A point on the line through them is $R = P + t\\,(Q - P)$.' },
  { id: 'mix', text: '$R = \\big(a_1 + t(a_2 - a_1)\\big)\\,\\mathbf v + \\big(b_1 + t(b_2 - b_1)\\big)\\,\\mathbf w$.' },
  { id: 'so', text: 'So $R$ is a stretch of $\\mathbf v$ plus a stretch of $\\mathbf w$: reachable, for every $t$.' },
];
const STAGE1_DECOY = { id: 'decoy', text: 'So $R$ is reachable only for $t$ between 0 and 1.' };

export const p6: PuzzleDef = {
  id: 'c02-p6',
  title: 'Why is the glow flat, and what changes when the gimbals unlock?',
  goal: 'P and Q are reachable. Slide R along the line through them: watch its dials.',
  subgoals: ['Show R stays reachable along the line', 'Light the beacon at (2, 3, 5)', 'Turn the view edge-on to the glow'],
  hints: [
    '$R = P + t\\,(Q - P) = (1 - t)\\,\\mathbf v + t\\,\\mathbf w$. For every $t$, the dials $1 - t$ and $t$ are numbers, so $R$ is a stretch of $\\mathbf v$ plus a stretch of $\\mathbf w$: reachable, even past Q.',
    'After the unlock: $a\\,(1, 0, 1) + b\\,(0, 1, 1) = (a, b, a + b)$. For (2, 3, 5) take $a = 2$, $b = 3$.',
    'Drag empty space to turn the view until the glowing plane is a thin line. The signal sits below it.',
  ],
  onWin: S.p6Win,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [1, 2.4], height: 10, ms: 0 });
    const d = p.difficulty;
    let stage = 1;
    let t = 0.5;
    const P3: V3 = to3(V), Q3: V3 = to3(W);
    const Rpos = (tt: number): V3 => [P3[0] + tt * (Q3[0] - P3[0]), P3[1] + tt * (Q3[1] - P3[1]), 0];
    // ---- stage 1 (flat deck)
    const glow1 = new ReachGlow(p.g.stage, { cell: 0.08 });
    glow1.setArrows([V3_, W3_]);
    p.add(glow1);
    const vA = new Arrow([0, 0, 0], V3_, { color: C.v, width: 0.035, opacity: 0.8, label: '$\\mathbf v$' });
    const wA = new Arrow([0, 0, 0], W3_, { color: C.w, width: 0.035, opacity: 0.8, label: '$\\mathbf w$' });
    const line = new InfLine(p.g.stage, P3, [Q3[0] - P3[0], Q3[1] - P3[1], 0], { color: '#e8f1ff', width: 1.4, opacity: 0.45, dashed: true });
    const dP = new Dot(P3, { color: '#e8f1ff', size: 0.1, label: 'P · dials (1, 0)', labelOffset: [52, 16] });
    const dQ = new Dot(Q3, { color: '#e8f1ff', size: 0.1, label: 'Q · dials (0, 1)', labelOffset: [58, 0] });
    const dR = new Dot(Rpos(t), { color: C.result, size: 0.14, glow: 2.2 });
    const lR = new Label('', Rpos(t), { className: 'small', color: C.result, offset: [64, -14] });
    p.add(vA, wA, line.object, dP, dQ, dR, lR.object);
    const stage1 = [vA, wA, dP, dQ, dR];
    p.onDispose(() => { line.dispose(); lR.dispose(); });
    const r = p.readout('A third point on the line');
    const show1 = () => {
      const dl = p6Dials(t);
      dR.at(Rpos(t)); lR.at(Rpos(t));
      lR.set(`R · dials (${fmtN(dl[0])}, ${fmtN(dl[1])})`);
      r.row('t', '$t$', fmtN(t));
      r.row('R', '$R$', fmtV(Rpos(t).slice(0, 2)), C.result);
      r.row('d', 'dials of $R$', `(${fmtN(dl[0])}, ${fmtN(dl[1])})`, C.result);
      r.eq('R = (1 - t)\\,\\cg{\\mathbf v} + t\\,\\cr{\\mathbf w}');
      r.note('For every $t$, $R$ is a stretch of $\\mathbf v$ plus a stretch of $\\mathbf w$, so $R$ stays reachable.');
    };
    const setT = (tt: number) => { const t0 = t; t = tt; glow1.trail(p6Dials(t0), p6Dials(t)); show1(); };
    show1();
    let s1done = false;
    const dragItem = p.g.drag.add({
      target: dR.mesh, getPos: () => new Vector3(...Rpos(t)),
      constrain: (q) => {
        const dx = Q3[0] - P3[0], dy = Q3[1] - P3[1];
        const tt = ((q.x - P3[0]) * dx + (q.y - P3[1]) * dy) / (dx * dx + dy * dy);
        const s = d === 'cadet' ? 0.5 : 0.25;
        const cl = Math.max(-1.5, Math.min(2.5, Math.round(tt / s) * s));
        return new Vector3(...Rpos(cl));
      },
      onMove: (q) => {
        const dx = Q3[0] - P3[0], dy = Q3[1] - P3[1];
        setT(((q.x - P3[0]) * dx + (q.y - P3[1]) * dy) / (dx * dx + dy * dy));
        sfx.tick(t * 2);
      },
      onEnd: () => { p.move(); if (d === 'cadet' && t >= P6_T - 1e-9) finishStage1(); },
    });
    let ws: StepWorksheet | null = null;
    let tiles: TileOrder | null = null;
    const lastLine = () => {
      ws = new StepWorksheet(p, { title: 'The last line', steps: [{ prompt: 'Dials of $R$ at $t = 2$:', answer: [-1, 2], mistakes: [[[1, 2], 'At t = 2, 1 − t = −1.']] }], onDone: () => finishStage1() });
    };
    if (d === 'navigator') {
      ws = new StepWorksheet(p, {
        steps: [
          { prompt: '$R = P + 2\\,(Q - P)$ with $P = (2, 1)$, $Q = (1, 3)$: $R =$', answer: [0, 5], mistakes: [[[3, -1], 'Q − P = (−1, 2). Add 2 of it to P.']] },
          { prompt: 'Dials of $R$: $(1 - t,\\ t)$ at $t = 2$:', answer: [-1, 2], mistakes: [[[1, 2], 'At t = 2, 1 − t = −1.']] },
          { prompt: 'Check: $-1\\,\\cg{\\mathbf v} + 2\\,\\cr{\\mathbf w} =$', answer: [0, 5] },
        ],
        onDone: () => finishStage1(),
      });
    } else if (d === 'commander') {
      tiles = new TileOrder(p, {
        title: 'Why is R reachable? Order the steps', tiles: STAGE1_TILES, decoys: [STAGE1_DECOY], submitLabel: 'Check order',
        onSubmit: (o) => {
          p.move();
          if (o.join() === STAGE1_TILES.map((x) => x.id).join()) { tiles!.el.remove(); tiles = null; lastLine(); }
          else if (o.includes('decoy')) p.bark('lantern', 'R at t = 2 is beyond Q, and its dials (−1, 2) still reach it. The steps never stop at 1.');
          else p.bark('lantern', 'That order does not follow. Start from what is reachable.');
        },
      });
    } else {
      p.setGoal('P and Q are reachable. Watch R slide from P to Q. Then drag R on past Q, to $t = 2$.');
      void (async () => { await wait(400); if (stage !== 1 || s1done) return; await animate(1600, (k) => { if (!s1done) setT(0.5 + k * 0.5); }, ease.inOut); })();
    }

    // ---- stage 2 (the gimbals unlock) and stage 3 (edge-on)
    let rig: DialRig | null = null;
    let beacon: Beacon | null = null;
    let signal: Beacon | null = null;
    let edgeFor = 0;
    let won = false;
    const target3: V3 = to3(BEACON3);
    /** Solve mode: every step happens at once (no waits), so the solver needs only a few frames. */
    let fast = false;
    const pause = async (ms: number) => { if (!fast) await wait(ms); };
    let s1p: Promise<void> | null = null;
    /** Stage 1 done: the same promise however often it is asked for (worksheet, drag, solver). */
    function finishStage1(): Promise<void> {
      s1p ??= (async () => {
        s1done = true;
        if (t !== P6_T) { if (fast) setT(P6_T); else await animate(500, (k) => setT(t + (P6_T - t) * k), ease.inOut); }
        p.subgoal(0);
        sfx.success();
        await pause(500);
        await unlock();
      })();
      return s1p;
    }
    async function unlock(): Promise<void> {
      stage = 2;
      dragItem.remove();
      p.dock().replaceChildren();
      p.bark('bram', 'Gimbals free. Hold on to something.');
      sfx.warp();
      p.g.mood('title');
      music.setIntensity(0.55);
      void glow1.fadeOut(900);
      for (const o of stage1) o.dispose();
      line.dispose(); lR.dispose();
      r.el.remove();
      await p.g.stage.view3D({ target: [1, 1.5, 1.6], distance: 16, azimuth: -62, elevation: 24, ms: fast ? 0 : 2600 });
      beacon = new Beacon(p.g.stage, target3, { label: 'beacon (2, 3, 5)' });
      p.add(beacon);
      rig = new DialRig(p, {
        arrows: [V3_, W3_], dims: 3, names: ['a', 'b'], tags: ['thruster two', 'thruster three'], dials: [1, 1], range: [-4, 5],
        dragTip: true, readoutTitle: 'Gimbals free', glow: { cell: 0.1 },
        onArrive: (end) => {
          if (landedOn(end, target3, tolFor(p))) { flare(p, target3); p.subgoal(1); stage3p = stage3(); return 'win'; }
          rig!.gap.show(end, target3);
          p.bark('lantern', `Landed at ${fmtV(end)}. Every landing has height across plus up.`);
          return 'miss';
        },
      });
      await rig.setArrows(THRUST3.map(to3), fast ? 0 : 1800);
      p.bark('lantern', 'Thruster two pushes along (1, 0, 1). Thruster three along (0, 1, 1).');
      p.setGoal('The gimbals are free. The thrusters now push along $\\cg{(1, 0, 1)}$ and $\\cr{(0, 1, 1)}$. Light the beacon at **(2, 3, 5)**. Drag empty space to turn the view.');
      rig.readout?.note('Every reachable point: $a\\,\\cg{(1, 0, 1)} + b\\,\\cr{(0, 1, 1)} = \\cy{(a,\\ b,\\ a + b)}$.');
    }
    let stage3p: Promise<void> | null = null;
    let drop: FatLine | null = null;
    let dropLabel: Label | null = null;
    const finish = () => {
      if (won) return;
      won = true;
      drop?.setOpacity(0.85); dropLabel?.show(true);
      sfx.success();
      p.subgoal(2);
      p.win();
    };
    const looking = () => { const f = p.g.stage.camera.getWorldDirection(new Vector3()); return edgeOn([f.x, f.y, f.z], PLANE_N); };
    async function stage3(): Promise<void> {
      if (stage === 3) return;
      stage = 3;
      if (!fast) await rig!.rewind(500);
      rig!.glow?.fill([[-2.5, 3.5], [-2.5, 3.5]], { spread: fast ? 0.1 : 1.6 });
      signal = new Beacon(p.g.stage, to3(SIGNAL), { label: 'Meridian signal (1, 1, 0)', color: '#59e1ff' });
      p.add(signal);
      drop = new FatLine(p.g.stage, [to3(SIGNAL), [1, 1, 2]], { color: C.orange, width: 2, dashed: true, opacity: 0.85 });
      dropLabel = new Label('2 below the plane', [1, 1, 1], { className: 'small', color: C.orange, offset: [70, 0] });
      drop.setOpacity(0); dropLabel.show(false);
      p.add(drop.object, dropLabel.object);
      const dd = drop, dl = dropLabel;
      p.onDispose(() => { dd.dispose(); dl.dispose(); });
      p.bark('lantern', 'Meridian signal located in three dimensions: (1, 1, 0).');
      p.setGoal('From above, (1, 1) looks reachable. Drag empty space to turn the view until the glowing plane is **edge-on**, a thin line. Where is the signal?');
      p.tick((dt) => {
        if (won || stage !== 3) return;
        if (looking()) edgeFor += dt; else edgeFor = 0;
        if (edgeFor > 0.35) finish();
      });
    }
    /** An edge-on camera: look along the plane, a little from above it. */
    async function edgeOnView(ms: number): Promise<void> {
      const T = new Vector3(1, 1, 1);
      const e = (14 * Math.PI) / 180;
      const a = new Vector3(1, -1, 0).normalize(), b = new Vector3(1, 1, 2).normalize();
      const dir = a.multiplyScalar(Math.cos(e)).add(b.multiplyScalar(Math.sin(e)));
      await p.g.stage.moveCamera(T.clone().add(dir.multiplyScalar(15)), T, new Vector3(0, 0, 1), ms);
      p.g.stage.enableOrbit(T);
    }
    const run = async (quick: boolean) => {
      fast = quick;
      if (stage === 1) {
        if (d === 'cadet') { if (!quick) await animate(900, (k) => setT(t + (P6_T - t) * k), ease.inOut); await finishStage1(); }
        else if (d === 'navigator') { if (quick) ws?.solve(); else await ws?.showMe(350); }
        else {
          if (tiles) { tiles.set(STAGE1_TILES.map((x) => x.id)); if (!quick) await wait(700); tiles.el.remove(); tiles = null; lastLine(); }
          if (quick) ws?.solve(); else await ws?.showMe(350);
        }
        await finishStage1();
      }
      if (stage === 2 && rig) {
        if (quick) rig.setDials(BEACON3_DIALS); else await rig.moveDials(BEACON3_DIALS, 1000);
        await rig.fire();
      }
      if (stage3p) await stage3p;
      await edgeOnView(quick ? 0 : 2200);
      if (quick && looking()) finish();
      for (let i = 0; i < 300 && !won; i++) await wait(20);
    };
    return {
      async showMe() { await run(false); },
      async solve() { await run(true); },
      async wrong() { if (d === 'navigator') ws?.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p7 [S] mixing light

const SC = 3; // world units per full lamp
export const p7: PuzzleDef = {
  id: 'c02-p7',
  title: 'Stretch: which colours can two lamps mix?',
  style: 'mastery',
  view: '3d',
  goal: 'Optional. The holotable mixes light from three lamps. Set the green, red and blue dials to match the **amber** swatch, then press **Mix**.',
  subgoals: ['Match the amber swatch with three lamps', 'With two lamps, find a colour they cannot mix'],
  hints: [
    'Amber is full red, a little more than half green, a little blue.',
    'Green 0.6, red 1, blue 0.2.',
    'With the warm and cool lamps, every mix has green equal to the average of red and blue. Pure green (0, 1, 0) breaks that.',
  ],
  onWin: S.p7Win,
  setup(p) {
    void p.g.stage.view3D({ target: [1.5, 1.5, 1.3], distance: 13, azimuth: -40, elevation: 22, ms: 0 });
    // the colour cube
    const corners: V3[] = [];
    for (let i = 0; i < 8; i++) corners.push([(i & 1) * SC, ((i >> 1) & 1) * SC, ((i >> 2) & 1) * SC]);
    const edges: [V3, V3][] = [];
    for (let i = 0; i < 8; i++) for (const b of [1, 2, 4]) if (!(i & b)) edges.push([corners[i], corners[i | b]]);
    const cube = new FatSegments(p.g.stage, edges, { color: '#9fb6d8', width: 1.2, opacity: 0.35 });
    p.add(cube.object);
    p.onDispose(() => cube.dispose());
    const css = (c: number[]) => `rgb(${c.map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255)).join(',')})`;
    const swatch = (c: number[], label: string) => h('div', { style: 'display:flex;align-items:center;gap:8px;font-size:13px' },
      h('span', { style: `display:inline-block;width:34px;height:20px;border-radius:5px;border:1px solid #fff4;background:${css(c)}` }), label);
    const target = new Dot(AMBER.map((x) => x * SC) as V3, { color: css(AMBER), size: 0.16, label: 'amber' });
    p.add(target);
    const mixSw = h('span', { style: 'display:inline-block;width:34px;height:20px;border-radius:5px;border:1px solid #fff4' });
    const swRow = h('div', { style: 'display:flex;gap:14px;align-items:center' }, swatch(AMBER, 'target'), h('span', { style: 'display:flex;align-items:center;gap:8px;font-size:13px' }, mixSw, 'your mix'));
    p.dock().appendChild(swRow);
    let part = 1;
    const colourOf = (tip: V3) => tip.map((x) => x / SC);
    const rig = new DialRig(p, {
      arrows: [to3(LAMP_GREEN.map((x) => x * SC)), to3(LAMP_RED.map((x) => x * SC)), to3(LAMP_BLUE.map((x) => x * SC))],
      dims: 3, names: ['g', 'r', 'b'], tags: ['green lamp', 'red lamp', 'blue lamp'], symbols: ['\\mathbf g', '\\mathbf r', '\\mathbf b'],
      dials: [0.5, 0.5, 0.5], range: [0, 1], step: p.difficulty === 'commander' ? 0.05 : 0.1, preview: 'live', ship: false, fireLabel: 'Mix',
      readoutTitle: 'Three lamps', glow: { cell: 0.09 },
      onChange: (_d, tip) => { mixSw.style.background = css(colourOf(tip)); },
      onArrive: (end) => {
        if (landedOn(end, AMBER.map((x) => x * SC), 0.05 * SC * (p.difficulty === 'commander' ? 0.5 : 1))) { p.subgoal(0); void toPart2(); return 'win'; }
        p.bark('lantern', `Your mix is ${fmtV(colourOf(end).map((x) => Math.round(x * 100) / 100))}. Amber is (1, 0.6, 0.2).`);
        return 'miss';
      },
    });
    mixSw.style.background = css(colourOf(rig.tip));
    let won = false;
    let probe: number[] = [0.5, 0.5, 0.5];
    let probeDot: Dot | null = null;
    let rig2: DialRig | null = null;
    async function toPart2(): Promise<void> {
      if (part === 2) return;
      part = 2;
      // the three-lamp rig is done: its F (Mix) key must not fly the amber mix again over the two-lamp scene
      rig.stop();
      sfx.success();
      await wait(600);
      rig.result.setOpacity(0); rig.tipDot.setOpacity(0);
      rig.chain.forEach((c) => c.setOpacity(0)); rig.base.forEach((b) => b.setOpacity(0));
      rig.readout?.el.remove();
      void rig.glow?.fadeOut(600);
      target.dispose();
      p.dock().replaceChildren();
      p.setGoal('The holotable switches to its two spare lamps: **warm** $(1, 0.5, 0)$ and **cool** $(0, 0.5, 1)$. The glow shows every colour they mix. Set the probe to a colour **off** that plane, then press **Check**.');
      rig2 = new DialRig(p, {
        arrows: [to3(LAMP_WARM.map((x) => x * SC)), to3(LAMP_COOL.map((x) => x * SC))], dims: 3, colors: ['#ffb347', '#7fd8ff'], names: ['a', 'b'], tags: ['warm', 'cool'],
        symbols: ['\\mathbf h', '\\mathbf c'], dials: [0.5, 0.5], range: [0, 1], step: 0.1, preview: 'live', ship: false, fireLabel: null,
        readoutTitle: 'Two lamps', glow: { cell: 0.08 }, sliders: false, typed: false,
      });
      rig2.glow?.fill([[0, 1], [0, 1]], { spread: 1 });
      probeDot = new Dot(probe.map((x) => x * SC) as V3, { color: css(probe), size: 0.16, label: 'probe' });
      p.add(probeDot);
      const sw = h('span', { style: `display:inline-block;width:34px;height:20px;border-radius:5px;border:1px solid #fff4;background:${css(probe)}` });
      const names = ['red', 'green', 'blue'];
      const rows = names.map((nm, i) => {
        const range = h('input', { type: 'range', min: 0, max: 1, step: 0.1, value: probe[i], 'aria-label': `probe ${nm}`, style: 'width:100%' }) as HTMLInputElement;
        range.addEventListener('input', () => { probe[i] = parseFloat(range.value); probeDot!.at(probe.map((x) => x * SC) as V3); probeDot!.setColor(css(probe)); sw.style.background = css(probe); });
        range.addEventListener('change', () => p.move());
        return h('label', { class: 'slider-row' }, h('span', null, `probe ${nm}`), range, h('span', null, ''));
      });
      const checkBtn = button('Check', () => check(), { cls: 'primary small' });
      p.dock().append(h('div', { style: 'display:flex;gap:10px;align-items:center;font-size:13px' }, sw, 'probe colour'), ...rows, checkBtn);
    }
    const gap = new Gap(p);
    function check(): void {
      if (won || part !== 2) return;
      p.move();
      if (p7OffPlane(probe)) {
        won = true;
        const foot = nearestInSpan([LAMP_WARM, LAMP_COOL], probe);
        gap.show(foot.map((x) => x * SC) as V3, probe.map((x) => x * SC) as V3, 'off the plane');
        p.subgoal(1);
        p.win();
      } else {
        // name the weights only when they rebuild the probe exactly (then both lie in 0..1)
        if (distToSpan([LAMP_WARM, LAMP_COOL], probe) < 1e-6) {
          const [a, b] = weights2(LAMP_WARM, LAMP_COOL, probe);
          p.bark('lantern', `That colour is a mix: ${nice(a)} warm plus ${nice(b)} cool.`);
        } else p.bark('lantern', 'Off the plane, but only just. Move it further off.');
        sfx.miss();
      }
    }
    const run = async (fast: boolean) => {
      if (part === 1) { await rig.moveDials(AMBER_DIALS, fast ? 10 : 1100); await rig.fire(); }
      for (let i = 0; i < 300 && !rig2; i++) await wait(20);
      probe = [0, 1, 0];
      probeDot?.at(probe.map((x) => x * SC) as V3); probeDot?.setColor(css(probe));
      check();
    };
    return {
      async showMe() { await run(false); },
      async solve() { await run(true); },
    };
  },
};

