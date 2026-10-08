// Chapter 1: the Fast-lane opener (p1), the by-hand puzzle (p4 [H]) and the derivation (p6 [D]).
import { Vector3 } from 'three';
import type { PuzzleDef, V3 } from '../../../game/types';
import { BurnChain } from '../../../kit/flight';
import { near } from '../../../kit/handle';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { Pad, Dot } from '../../../gfx/markers';
import { Arrow } from '../../../gfx/arrow';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { Slider } from '../../../ui/widgets';
import { C } from '../../../core/theme';
import { nice } from '../../../math/frac';
import { S } from './script';
import { P4_PAR, p4Burn } from './logic';

const fmt = (v: number[]) => `(${nice(v[0])}, ${nice(v[1])})`;


export const p1: PuzzleDef = {
  id: 'c01-p1',
  title: 'Two thrusters, whole pulses: can you reach the beacon?',
  goal: 'Thruster A pushes along **(2, 1)**, thruster B along **(1, 2)**, in whole pulses. Set the pulses so the ship stops on the beacon at (7, 8). One **Fire**.',
  hints: ['Each pulse of A moves the ship 2 across and 1 up. Each pulse of B moves it 1 across and 2 up.', 'Across: 2a + b = 7. Up: a + 2b = 8.', '2 pulses of A and 3 of B.'],
  par: 1,
  onWin: S.p1Win,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [3.5, 4], height: 11, ms: 0 });
    const pad = new Pad(p.g.stage, [7, 8, 0], { label: 'beacon' });
    p.add(pad);
    let a = 1, b = 1;
    const r = p.readout('Pulses');
    const chain = new BurnChain(p, {
      free: [[2, 1, 0], [1, 2, 0]], labels: ['$a\\cg{\\mathbf v}$', '$b\\cr{\\mathbf w}$'], snap: null,
      constrain: (i, q, tail) => {
        // a dragged tip stays on its thruster's line, in whole pulses
        const d = i === 0 ? [2, 1] : [1, 2];
        const t = Math.max(0, Math.min(6, Math.round(((q.x - tail[0]) * d[0] + (q.y - tail[1]) * d[1]) / 5)));
        if (i === 0) { a = t; sa.set(t, false); } else { b = t; sb.set(t, false); }
        show();
        return new Vector3(tail[0] + d[0] * t, tail[1] + d[1] * t, 0);
      },
      onArrive: (end) => (near(end, [7, 8, 0]) ? (void pad.hit(), p.win(), 'win') : 'miss'),
    });
    const show = () => { r.row('a', 'pulses of A', String(a), C.v); r.row('b', 'pulses of B', String(b), C.w); r.row('e', 'ship ends at', fmt([2 * a + b, a + 2 * b]), C.result); };
    const sa = new Slider({ label: 'pulses of A', min: 0, max: 6, step: 1, value: 1, onInput: (x) => { a = x; chain.setBurn(0, [2 * a, a, 0]); show(); } });
    const sb = new Slider({ label: 'pulses of B', min: 0, max: 6, step: 1, value: 1, onInput: (x) => { b = x; chain.setBurn(1, [b, 2 * b, 0]); show(); } });
    p.dock().prepend(sa.el, sb.el);
    show();
    return {
      async showMe() { a = 2; b = 3; sa.set(2, false); sb.set(3, false); await chain.moveBurn(0, [4, 2, 0], 500); await chain.moveBurn(1, [3, 6, 0], 500); show(); await chain.fire(); },
      async wrong() { a = 3; b = 2; chain.setBurn(0, [6, 3, 0]); chain.setBurn(1, [2, 4, 0]); await chain.fire(); },
    };
  },
};

// ------------------------------------------------------------------ p4 [H] From P to Q

export const P0: V3 = [1, 4, 0];
export const Q0: V3 = [6, 1, 0];

export const p4: PuzzleDef = {
  id: 'c01-p4',
  title: 'From P to Q: what is the burn, and how long is the tether?',
  goal: 'The ship is at **P = (1, 4)**; the dock is at **Q = (6, 1)**. Work out the burn by hand, then **Fire**. Then drop markers halfway and a quarter of the way.',
  subgoals: ['Work out Q − P and how long the tether must be', 'Fly to the dock', 'Drop the halfway marker', 'Drop the quarter-way marker'],
  hints: ['Each part of the burn is end minus start: across 6 − 1, up 1 − 4.', 'The tether runs along the straight side of the triangle: √(5² + (−3)²) = √34.', 'Halfway is P + ½(Q − P); a quarter of the way is P + ¼(Q − P).'],
  par: P4_PAR,
  onWin: S.p4Win,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [3.5, 2.5], height: 8, ms: 0 });
    const lp = new Label('P', [P0[0] - 0.35, P0[1] + 0.3, 0], { className: 'tag' });
    const pad = new Pad(p.g.stage, Q0, { label: 'dock Q' });
    p.add(lp.object, pad);
    p.onDispose(() => lp.dispose());
    const flags = [false, false, false, false];
    const tick = (i: number) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); } if (flags.every(Boolean)) p.win(); };
    const chain = new BurnChain(p, {
      start: P0, free: [[0, 0.001, 0]], labels: ['$Q - P$'], fireLabel: 'Fire',
      onArrive: (end) => (near(end, Q0) ? (void pad.hit(), tick(1), 'ok') : 'miss'),
    });
    chain.free[0].setEnabled(false);
    if (chain.fireBtn) chain.fireBtn.disabled = true;
    // markers the player drags along the route (snap to quarters)
    const half = new Dot([1, 1, 0.05], { color: C.result, size: 0.12, label: 'halfway' });
    const quarter = new Dot([2, 0.5, 0.05], { color: C.result, size: 0.1, label: 'quarter' });
    p.add(half, quarter);
    const targets: [Dot, V3, number][] = [[half, [3.5, 2.5, 0], 2], [quarter, [2.25, 3.25, 0], 3]];
    for (const [dot, target, i] of targets) {
      p.g.drag.add({
        target: dot.mesh, getPos: () => dot.group.position.clone(), snap: () => 0.25,
        onMove: (q) => dot.at([q.x, q.y, 0.05]),
        onEnd: () => { p.move(); const q = dot.group.position; if (near([q.x, q.y, 0], target)) { dot.setColor(C.good); tick(i); } },
      });
    }
    // Two worksheets, so the burn Q − P is its own final step and is checked on every difficulty
    // (Commander checks only a worksheet's last step). The tether opens once the burn is right.
    const burn = p4Burn(P0, Q0);
    let tether: StepWorksheet | null = null;
    const openTether = () => {
      if (tether) return tether;
      tether = new StepWorksheet(p, {
        steps: [
          { prompt: 'Tether length: $\\sqrt{5^2 + (-3)^2}$', answer: Math.sqrt(34), tol: 0.01, mistakes: [[8, '5 + 3 is the zig-zag route. The tether is the straight side of the triangle.'], [2, 'Square the parts before adding.']] },
        ],
        onDone: () => {
          chain.setBurn(0, [burn[0], burn[1], 0]);
          if (chain.fireBtn) chain.fireBtn.disabled = false;
          tick(0);
          p.bark('lantern', 'Burn set to (5, −3). Tether 5.83. Fire when ready.');
        },
      });
      return tether;
    };
    const ws = new StepWorksheet(p, {
      steps: [
        {
          prompt: 'Burn $Q - P = (6 - 1,\\ 1 - 4)$', answer: burn,
          mistakes: [[[-5, 3], 'That is start minus end. The burn goes from P to Q: end minus start.'], [[5, 3], 'Q is below P, so the up part is negative.']],
        },
      ],
      onDone: () => { chain.setBurn(0, [burn[0], burn[1], 0]); openTether(); },
    });
    return {
      async showMe() {
        await ws.showMe(300);
        await openTether().showMe(300);
        await chain.fire();
        half.at([3.5, 2.5, 0.05]); half.setColor(C.good); tick(2);
        quarter.at([2.25, 3.25, 0.05]); quarter.setColor(C.good); tick(3);
      },
      wrong() { ws.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p6 [D] Where length comes from

export const p6: PuzzleDef = {
  id: 'c01-p6',
  title: 'Where does the length of a 3-D arrow come from?',
  goal: 'The arrow **(2, 3, 6)** needs a tether exactly its length. Use the right triangle on the floor, then the one standing up. Set the tether.',
  hints: ['On the floor, the shadow of the arrow is (2, 3, 0). Its length squared is 2² + 3² = 13.', 'The floor diagonal and the height 6 make a second right triangle.', '√(13 + 36) = √49 = 7.'],
  view: '3d',
  par: 3,
  onWin: S.p6Win,
  setup(p) {
    void p.g.stage.view3D({ target: [1, 1.5, 2.5], distance: 14, azimuth: -55, elevation: 22, ms: 0 });
    const v: V3 = [2, 3, 6];
    const arrow = new Arrow([0, 0, 0], v, { color: C.v, label: '$(2, 3, 6)$' });
    const floor = new FatLine(p.g.stage, [[0, 0, 0], [2, 0, 0], [2, 3, 0], [0, 0, 0]], { color: '#9fb6d8', width: 1.6, dashed: true });
    const up = new FatLine(p.g.stage, [[2, 3, 0], [2, 3, 6]], { color: '#9fb6d8', width: 1.6, dashed: true });
    const diag = new Arrow([0, 0, 0], [2, 3, 0], { color: C.result, opacity: 0.8, width: 0.03, label: '$\\sqrt{13}$', labelAt: 'mid' });
    p.add(arrow, floor.object, up.object, diag);
    p.onDispose(() => { floor.dispose(); up.dispose(); });
    let won = false;
    const finish = () => { if (!won) { won = true; void arrow.pulse(); p.win(); } };
    const d = p.difficulty;
    let ws: StepWorksheet | null = null;
    let slider: Slider | null = null;
    if (d === 'cadet') {
      // watch, plus one drag: set the tether slider; LANTERN shows the squares
      const r = p.readout('Pythagoras twice');
      r.row('f', 'floor: $2^2 + 3^2$', '13');
      r.row('t', 'then: $13 + 6^2$', '49');
      // checked when the player lets go (change), not on every step the thumb passes
      const sl = new Slider({ label: 'tether', min: 0, max: 12, step: 0.5, value: 4 });
      sl.el.addEventListener('change', () => {
        if (won) return;
        p.move();
        if (Math.abs(sl.get() - 7) < 1e-9) finish();
        else p.bark('lantern', 'Not yet. The tether must be the square root of 49.');
      });
      slider = sl;
      p.dock().appendChild(sl.el);
    } else {
      const steps = [
        { prompt: 'Floor diagonal squared: $2^2 + 3^2$', answer: 13 },
        { prompt: 'Whole length squared: $13 + 6^2$', answer: 49, mistakes: [[19, 'Square the height too: 6² = 36.']] as [number, string][] },
        { prompt: 'Tether length: $\\sqrt{49}$', answer: 7, mistakes: [[11, '2 + 3 + 6 is the zig-zag route along the edges.']] as [number, string][] },
      ];
      if (d === 'commander') {
        // order the steps first, then type them
        const tiles = new TileOrder(p, {
          title: 'Order the steps',
          tiles: [
            { id: 'floor', text: 'Square the floor parts and add: the floor diagonal squared' },
            { id: 'up', text: 'Add the height squared: the whole length squared' },
            { id: 'root', text: 'Take the square root' },
          ],
          submitLabel: 'Check order',
          onSubmit: (o) => { p.move(); if (o.join() === 'floor,up,root') { tiles.el.remove(); ws = new StepWorksheet(p, { steps, onDone: finish }); } else p.bark('lantern', 'That order does not give a length. Start on the floor.'); },
        });
      } else {
        ws = new StepWorksheet(p, { steps, onDone: finish });
      }
    }
    return {
      async showMe() {
        if (slider) { slider.set(7, false); finish(); return; }
        if (!ws) ws = new StepWorksheet(p, { steps: [{ prompt: 'Tether length: $\\sqrt{2^2 + 3^2 + 6^2}$', answer: 7 }], onDone: finish });
        await ws.showMe(300);
      },
    };
  },
};
