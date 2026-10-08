// Chapter 6 puzzles (GDD §6.4, Ch 6): the strut box. Every win test is a pure function in logic.ts;
// the scenes here draw the crystal, the base, the raised arrow and the height.
import { Vector3 } from 'three';
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Label } from '../../../gfx/label';
import { Dot } from '../../../gfx/markers';
import { PlanePatch } from '../../../gfx/shapes';
import { burst } from '../../../gfx/fx';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { h, inline, button } from '../../../ui/ui';
import { Slider } from '../../../ui/widgets';
import { VectorHandle } from '../../../kit/handle';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { rng, rint } from '../../../game/lawcheck';
import { StrutBox, Tetra } from './crystal';
import { until } from './stage';
import {
  C_A, C_AB, C_B, C_C0, C_K, C_MID, CL_P, CL_Q, CL_R, CL_S, CL_S_BENT, CL_TRAP, H_A, H_B, H_C, N7, N7_LOG0, N7_NAMES, P1_SPOTS,
  P1_U, P1_U0, P1_V, P1_VOLUME, P1_W, P1_W0, P2, P4, P6, boxVol, braceVol, fmt, isCyclicOfRule, logVol, num, p1Accept, p1Won,
  p2OrderOk, p3Won, p5NextSwap, p5Won, sixTets, swapLog, triple,
} from './logic';
import { S } from './script';

const v3 = (v: readonly number[]): V3 => [v[0], v[1], v[2] ?? 0];
const BLUE = C.u;

function lab(p: PuzzleCtx, text: string, at: V3, o: { color?: string; size?: number; className?: string; offset?: [number, number] } = {}): Label {
  const l = new Label(text, at, o);
  p.add(l);
  return l;
}

/** The holotable floor: a faint grid on z = 0. */
function floor(p: PuzzleCtx): void { p.grid({ base: 0.08, main: 0.14, axis: 0.3 }); }

/** A short win flourish at a point. */
function flourish(p: PuzzleCtx, at: V3, color: string = C.result): void {
  sfx.success();
  void burst(p.g.stage, at, color, 60, 2.2, false);
}

// ------------------------------------------------------------------ p1 Slide the top

export const p1: PuzzleDef = {
  id: 'c06-p1',
  title: 'Does a leaning box lose volume?',
  goal: 'Press **Pulse** and watch the box lean. Then drag the **blue** strut\'s tip to **three new places** where the box still holds **24**.',
  subgoals: ['Let the pulse lean the box', 'Three new places that still hold 24'],
  predict: {
    prompt: 'The box is 2 along, 3 across and 4 up, so it holds $2 \\times 3 \\times 4 = 24$. The pulse will lean it over. What happens to the space inside?',
    choices: [{ id: 'same', text: 'It still holds 24' }, { id: 'less', text: 'It holds less' }, { id: 'more', text: 'It holds more' }],
    answer: 'same',
    reveal: 'It still holds **24**. The base keeps its area, 6, and the top stays **4 above it**. Leaning slides the top along its own level; it does not lower it.',
  },
  hints: [
    'Drag the blue tip sideways: it slides on its own level, 4 above the floor. Watch the volume.',
    'Hold **Shift** while dragging and the tip moves up or down instead. The volume follows the height.',
    'Try the tips $(2, 1, 4)$, $(-1, 2, 4)$ and $(0, -1, 4)$.',
  ],
  par: 4,
  view: '3d',
  onWin: S.p1Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [1.2, 1.4, 2.6], distance: 21, azimuth: -62, elevation: 21, ms: 0 });
    floor(p);
    const cadet = p.difficulty === 'cadet';
    // the height tolerance (GDD: ±0.05, commander ±0.01); the volume tolerance is base area 6 times it
    const tol = p.difficulty === 'commander' ? 0.01 : 0.05;
    let gone = false;
    p.onDispose(() => { gone = true; });
    let w: V3 = v3(P1_W0), u: V3 = v3(P1_U0);
    const av = new Arrow([0, 0, 0], v3(P1_V), { color: C.v, label: '$\\mathbf v$' });
    const aw = new Arrow([0, 0, 0], w, { color: C.w, label: '$\\mathbf w$' });
    p.add(av, aw);
    const box = new StrutBox(p, v3(P1_V), w, u, { numbers: cadet });
    const deck = new PlanePatch(p.g.stage, [1, 1, 4], [0, 0, 1], { color: BLUE, size: 7, opacity: 0.1 });
    deck.setOpacity(0);
    p.add(deck);
    const deckLab = lab(p, 'every tip on this level holds 24', [-2.2, -2, 4.05], { className: 'small', color: '#9fc8ff' });
    deckLab.show(false);
    const r = p.readout('Strut box');
    const spots: V3[] = [];
    const ghosts: Arrow[] = [];
    const show = () => {
      r.row('vol', 'volume', num(boxVol(u, P1_V, w)), C.result);
      if (cadet) { r.row('b', 'base area', '6'); r.row('h', 'height', num(u[2])); }
      r.row('n', 'new places that hold 24', `${spots.length} of 3`);
    };
    let pulsed = false;
    let won = false;
    const hu = new VectorHandle(p, {
      to: u, color: BLUE, label: '$\\mathbf u$', limit: 5,
      onChange: (t) => { u = t; box.set(v3(P1_V), w, u); show(); },
      onCommit: (t) => accept(t),
    });
    hu.setEnabled(false);
    const showDeck = () => { if (!cadet) void animate(500, (k) => deck.setOpacity(k), ease.out); deckLab.show(true); };
    if (cadet) { deck.setOpacity(0.6); }
    const accept = (t: V3) => {
      if (won || !pulsed) return;
      if (p1Accept(spots, t, tol)) {
        spots.push(t);
        const gh = new Arrow([0, 0, 0], t, { color: BLUE, opacity: 0.35, width: 0.03 });
        p.add(gh); ghosts.push(gh);
        sfx.snap(); sfx.star(Math.min(2, spots.length - 1));
        if (spots.length === 1) showDeck();
        show();
        if (p1Won(spots)) { won = true; hu.setEnabled(false); p.subgoal(1); flourish(p, t); p.win(); }
        return;
      }
      const vol = boxVol(t, P1_V, w);
      if (Math.abs(vol - P1_VOLUME) > tol * P2.base) { sfx.miss(); p.bark('lantern', `Volume ${num(vol)}. The tip is ${num(t[2])} above the base, so the box holds 6 × ${num(t[2])}.`); }
      else p.bark('lantern', 'Still 24, but that spot is too close to one already counted. Find a new one.');
    };
    const pulse = async () => {
      if (pulsed) return;
      pulsed = true;
      p.move();
      pulseBtn.disabled = true;
      sfx.whoosh(1.4);
      void p.g.stage.shockwave([0, 0, 0], 1400, 0.5);
      const w0 = w, u0 = u;
      await animate(1400, (k) => {
        if (gone) return;
        w = [w0[0] + (P1_W[0] - w0[0]) * k, 3, 0];
        u = [u0[0] + (P1_U[0] - u0[0]) * k, u0[1] + (P1_U[1] - u0[1]) * k, 4];
        aw.setTo(w); hu.arrow.setTo(u); box.set(v3(P1_V), w, u); show();
      }, ease.inOut);
      if (gone) return;
      w = v3(P1_W); u = v3(P1_U);
      hu.setEnabled(true);
      p.subgoal(0);
      p.bark('lantern', 'The pulse leaned the box. Volume: 24.');
    };
    const pulseBtn = button('Pulse', () => void pulse(), { cls: 'primary small' });
    p.dock().append(h('div', { style: 'font-size:13px;color:var(--ink-2);max-width:280px', html: inline('Drag the blue tip to slide it. **Shift**-drag to raise or lower it.') }), pulseBtn);
    show();
    const place = async (t: V3, ms: number) => { if (ms) await hu.moveTo(t, ms); else { hu.set(t); accept(t); } };
    return {
      async showMe() { await pulse(); for (const s of P1_SPOTS) { if (won) break; await place(v3(s), 650); } },
      async solve() { await pulse(); for (const s of P1_SPOTS) await place(v3(s), 0); },
      async wrong() { await pulse(); await place([1, 1, 3], 0); await place([2, 2, 2], 0); },
    };
  },
};

// ------------------------------------------------------------------ p2 [D] Base times height

const P2_TILE_DEFS = [
  { id: 't1', text: 'The base is the parallelogram of $\\mathbf v$ and $\\mathbf w$. Its area is $\\|\\mathbf v\\times\\mathbf w\\|$.' },
  { id: 't2', text: '$\\mathbf v\\times\\mathbf w$ points straight out of the base, so $\\mathbf n = \\dfrac{\\mathbf v\\times\\mathbf w}{\\|\\mathbf v\\times\\mathbf w\\|}$ is one unit long and straight out.' },
  { id: 't3', text: 'The height is the shadow of $\\mathbf u$ on $\\mathbf n$: $\\mathbf u\\cdot\\mathbf n$.' },
  { id: 't4', text: 'Volume $=$ base area $\\times$ height $= \\|\\mathbf v\\times\\mathbf w\\|\\;\\dfrac{\\mathbf u\\cdot(\\mathbf v\\times\\mathbf w)}{\\|\\mathbf v\\times\\mathbf w\\|}$.' },
  { id: 't5', text: 'The lengths cancel: volume $= \\mathbf u\\cdot(\\mathbf v\\times\\mathbf w)$.' },
];
const P2_DECOY = [{ id: 'x1', text: 'The height is the length of the third strut, $\\|\\mathbf u\\|$.' }];

export const p2: PuzzleDef = {
  id: 'c06-p2',
  title: 'Where does the volume come from?',
  goal: 'The leaned box: $\\cg{\\mathbf v} = (2, 0, 0)$, $\\cr{\\mathbf w} = (1, 3, 0)$, $\\cb{\\mathbf u} = (1, 1, 4)$. Build its volume from **base area × height**.',
  hints: [
    'The base is the parallelogram of $\\mathbf v$ and $\\mathbf w$. Its area is the length of $\\mathbf v\\times\\mathbf w$.',
    'The height is how far $\\mathbf u$ reaches straight out of the base: its shadow on the unit arrow along $\\mathbf v\\times\\mathbf w$.',
    '$\\mathbf v\\times\\mathbf w = (0, 0, 6)$, so the base area is 6 and the height is 4. The length 6 cancels: $\\mathbf u\\cdot(\\mathbf v\\times\\mathbf w) = 24$.',
  ],
  par: 6,
  view: '3d',
  onWin: S.p2Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [1.2, 1.4, 3.1], distance: 23, azimuth: -55, elevation: 18, ms: 0 });
    floor(p);
    const d = p.difficulty;
    let u: V3 = v3(P1_U);
    p.add(new Arrow([0, 0, 0], v3(P1_V), { color: C.v, label: '$\\mathbf v$' }), new Arrow([0, 0, 0], v3(P1_W), { color: C.w, label: '$\\mathbf w$' }));
    const box = new StrutBox(p, v3(P1_V), v3(P1_W), u, { base: true, normal: true, height: true, numbers: d === 'cadet' });
    const r = p.readout('Base × height');
    let shown = d === 'cadet';
    const show = () => {
      const vol = boxVol(u, P1_V, P1_W);
      const q = (x: number) => (shown ? num(x) : '?');
      r.row('b', 'base area $\\|\\mathbf v\\times\\mathbf w\\|$', q(P2.base));
      r.row('h', 'height (shadow of $\\mathbf u$)', q(vol / P2.base), C.result);
      r.row('v', 'base area × height', q(vol));
      r.row('t', '$\\mathbf u\\cdot(\\mathbf v\\times\\mathbf w)$', q(vol), C.result);
    };
    let won = false;
    const finish = async () => {
      if (won) return;
      won = true;
      shown = true; show();
      await animate(700, (k) => box.box.setColor(k > 0.5 ? C.result : '#fff1c2'), ease.linear);
      flourish(p, [1.5, 2, 2]);
      p.win();
    };
    const hu = new VectorHandle(p, {
      to: u, color: BLUE, label: '$\\mathbf u$', limit: 6,
      onChange: (t) => { u = t; box.set(v3(P1_V), v3(P1_W), u); show(); },
      onCommit: () => { if (d === 'cadet' && revealed) void finish(); },
    });
    // the pieces arrive one at a time (cadet watches them)
    const layers = [box.base!.object, box.normal!.object, box.shadow!.object];
    let revealed = d !== 'cadet';
    // a Skip during the reveal must not bark or tick over the next beat
    let gone = false;
    p.onDispose(() => { gone = true; });
    if (d === 'cadet') {
      layers.forEach((o) => { o.visible = false; });
      r.hideRow('h'); r.hideRow('v'); r.hideRow('t');
      hu.setEnabled(false);
      void (async () => {
        const steps: [number, string, string[]][] = [
          [0, 'The base: the parallelogram of v and w. Its area is 6.', []],
          [1, 'Raised straight out of the base: v × w = (0, 0, 6). Its length is the base area.', []],
          [2, 'The height: the shadow of u on that arrow. 4.', ['h']],
        ];
        for (const [i, text, rows] of steps) {
          await wait(p.g.headless ? 10 : 1300);
          if (p.won || gone) return;
          layers[i].visible = true;
          rows.forEach((k) => r.hideRow(k, false));
          sfx.tick(i);
          p.bark('lantern', text);
        }
        await wait(p.g.headless ? 10 : 1200);
        if (p.won || gone) return;
        r.hideRow('v', false); r.hideRow('t', false);
        revealed = true;
        hu.setEnabled(true);
        p.setGoal('Base area × height, and $\\mathbf u\\cdot(\\mathbf v\\times\\mathbf w)$: the same number. **Shift**-drag the **blue** tip up or down and watch both change together.');
      })();
    } else hu.setEnabled(false);
    show();
    let solveD: () => void | Promise<void> = async () => {};
    const navSteps = [
      { prompt: '$\\mathbf v\\times\\mathbf w = (2, 0, 0)\\times(1, 3, 0)$', answer: P2.cross, mistakes: [[[0, 0, -6], 'That is $\\mathbf w\\times\\mathbf v$: the order flips it.']] as [number[], string][] },
      { prompt: 'Base area $\\|\\mathbf v\\times\\mathbf w\\|$', answer: P2.base },
      { prompt: 'Height: the shadow of $\\mathbf u$ on the unit arrow $(0, 0, 1)$', answer: P2.height, mistakes: [[Math.sqrt(18), 'That is the length of $\\mathbf u$. The strut leans; the height is how far it reaches straight up.']] as [number, string][] },
      { prompt: 'Volume: base area × height', answer: P2.volume },
      { prompt: '$\\mathbf u\\cdot(\\mathbf v\\times\\mathbf w)$, in one step', answer: P2.triple },
    ];
    if (d === 'navigator') {
      const ws = new StepWorksheet(p, { title: 'Where it comes from · each step is checked', steps: navSteps, onDone: () => void finish() });
      solveD = () => ws.solve();
    } else if (d === 'commander') {
      const dock = p.dock();
      const msg = h('div', { class: 'c-muted', style: 'font-size:13px;min-height:18px' });
      const fin = h('div');
      let ws: StepWorksheet | null = null;
      const openLast = () => {
        if (ws) return;
        ws = new StepWorksheet(p, { title: 'The last line', steps: [{ prompt: 'So this box holds $\\mathbf u\\cdot(\\mathbf v\\times\\mathbf w) =$', answer: P2.triple, mistakes: [[Math.sqrt(18) * 6, 'That uses the length of $\\mathbf u$ as the height.']] }], onDone: () => void finish(), mount: fin });
      };
      const tiles = new TileOrder(p, {
        tiles: P2_TILE_DEFS, decoys: P2_DECOY, title: 'Where it comes from · put the steps in order', submitLabel: 'Check the order', mount: dock,
        onSubmit: (order) => {
          p.move();
          if (order.includes('x1')) { sfx.miss(); msg.innerHTML = inline('The strut leans, so its length is not the height. The height is its shadow on the unit arrow straight out of the base.'); return; }
          if (!p2OrderOk(order)) { sfx.miss(); msg.innerHTML = inline('Not in that order. The height needs the unit arrow first; the volume needs both the base and the height.'); return; }
          sfx.snap();
          msg.innerHTML = inline('The steps hold. Now the last line.');
          openLast();
        },
      });
      dock.append(msg, fin);
      solveD = () => { tiles.set(P2_TILE_DEFS.map((t) => t.id)); openLast(); ws!.solve(); };
    }
    return {
      async showMe() {
        if (d === 'cadet') { while (!revealed) await wait(50); await hu.moveTo([1, 1, 5], 700); await finish(); return; }
        await solveD();
      },
      async solve() {
        if (d === 'cadet') { revealed = true; layers.forEach((o) => { o.visible = true; }); hu.set([1, 1, 5]); await finish(); return; }
        await solveD();
      },
      wrong() { hu.set([1, 1, 3]); },
    };
  },
};

// ------------------------------------------------------------------ p3 Section C

export const p3: PuzzleDef = {
  id: 'c06-p3',
  title: 'Is Section C still holding volume?',
  goal: 'A node in Section C: $\\cg{\\mathbf a} = (2, 1, 0)$, $\\cr{\\mathbf b} = (0, 1, 2)$, $\\cb{\\mathbf c} = (1, 1, 1)$. Read its volume. Then set the brace $k$ in $\\cb{\\mathbf c} = (1, 1, k)$ so the box holds **6**.',
  predict: {
    prompt: 'Before LANTERN draws the box: do these three struts hold any space?',
    choices: [{ id: 'flat', text: 'No: they lie flat' }, { id: 'some', text: 'Yes, a little' }, { id: 'lots', text: 'Yes, plenty' }],
    answer: 'flat',
    reveal: '$\\mathbf c = \\tfrac12\\mathbf a + \\tfrac12\\mathbf b$: the third strut lies in the plane of the first two. The base has area $\\|\\mathbf a\\times\\mathbf b\\| = \\sqrt{24}$, but the height is 0, so the box holds **0**. Raising $\\mathbf c$ to $(1, 1, 4)$ gives it height: $(2, -4, 2)\\cdot(1, 1, 4) = 6$.',
  },
  hints: [
    'The volume is $(\\mathbf a\\times\\mathbf b)\\cdot\\mathbf c$. Start with $\\mathbf a\\times\\mathbf b$.',
    '$\\mathbf a\\times\\mathbf b = (2, -4, 2)$. With $\\mathbf c = (1, 1, k)$ the volume is $2 - 4 + 2k$.',
    '$2k - 2 = 6$, so $k = 4$.',
  ],
  par: 2,
  view: '3d',
  onWin: S.p3Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [1, 1.2, 2.6], distance: 19, azimuth: 0, elevation: 24, ms: 0 });
    floor(p);
    const d = p.difficulty;
    let k = 1;
    const c = (): V3 => [1, 1, k];
    p.add(new Arrow([0, 0, 0], v3(C_A), { color: C.v, label: '$\\mathbf a$' }), new Arrow([0, 0, 0], v3(C_B), { color: C.w, label: '$\\mathbf b$' }));
    const ac = new Arrow([0, 0, 0], c(), { color: BLUE, label: '$\\mathbf c$' });
    p.add(ac);
    const box = new StrutBox(p, v3(C_A), v3(C_B), c(), { numbers: d === 'cadet' });
    // the plane of a and b, through the origin (anchored at C_MID, the centre of 0, a, b and the flat c)
    const plane = new PlanePatch(p.g.stage, v3(C_MID), v3(C_AB), { color: '#9fb6d8', size: 5, opacity: 0.08 });
    p.add(plane);
    // the Call it asks before the box is drawn: box, plane and volume appear with the first brace
    box.show(false); plane.setOpacity(0);
    let drawn = false;
    const draw = () => {
      if (drawn) return;
      drawn = true;
      box.show(true);
      if (d !== 'commander') plane.setOpacity(0.5);
    };
    const r = p.readout('Section C · one node');
    const show = (withVol: boolean) => {
      r.row('c', '$\\mathbf c$', fmt(c()), BLUE);
      if (withVol) r.row('v', 'volume $(\\mathbf a\\times\\mathbf b)\\cdot\\mathbf c$', num(braceVol(k)), C.result);
    };
    show(false);
    let won = false;
    const brace = async (kk: number, ms = 1100) => {
      if (won) return;
      p.move();
      const k0 = k;
      draw();
      sfx.thrust(0.6);
      await animate(ms, (t) => { k = k0 + (kk - k0) * t; ac.setTo(c()); box.set(v3(C_A), v3(C_B), c()); show(d !== 'commander' || t > 0.99); }, ease.inOut);
      k = kk;
      show(true);
      if (p3Won(k)) {
        won = true;
        // the old flat strut stays as a ghost: half of a plus half of b
        p.add(new Arrow([0, 0, 0], v3(C_C0), { color: BLUE, opacity: 0.3, width: 0.025 }));
        lab(p, 'old $\\mathbf c = \\tfrac12\\mathbf a + \\tfrac12\\mathbf b$', [1.6, 0.9, 1.25], { className: 'small', color: '#9fc8ff' });
        plane.setOpacity(0.35);
        flourish(p, c(), BLUE);
        p.win();
      } else {
        sfx.miss();
        const vol = braceVol(k);
        p.bark('lantern', vol < 0 ? `Volume ${num(vol)}: the third strut is on the other side of the base. The brace needs +6.` : `Volume ${num(vol)}. The brace needs 6.`);
      }
    };
    let solveD: () => void | Promise<void>;
    if (d === 'cadet') {
      const slider = new Slider({ label: 'brace $k$', min: 0, max: 6, step: 0.5, value: 1, onInput: (x) => { draw(); k = x; ac.setTo(c()); box.set(v3(C_A), v3(C_B), c()); show(true); } });
      p.dock().append(slider.el, button('Brace', () => void brace(k, 300), { cls: 'primary small' }));
      solveD = async () => { slider.set(C_K, false); await brace(C_K, 400); };
    } else {
      const ws = new StepWorksheet(p, {
        title: d === 'navigator' ? 'By hand · each step is checked' : 'By hand · only the answer is checked',
        steps: [
          { prompt: '$\\mathbf a\\times\\mathbf b = (2, 1, 0)\\times(0, 1, 2)$', answer: C_AB, mistakes: [[[-2, 4, -2], 'That is $\\mathbf b\\times\\mathbf a$: the order flips it.']] },
          { prompt: 'Volume now: $(\\mathbf a\\times\\mathbf b)\\cdot(1, 1, 1)$', answer: braceVol(1) },
          { prompt: 'With the brace, $(\\mathbf a\\times\\mathbf b)\\cdot(1, 1, k) = 2 - 4 + 2k$. For a volume of 6, $k =$', answer: C_K, mistakes: [[-2, 'That gives $-6$: the third strut on the other side of the base. The brace needs $+6$.'], [3, 'Then the volume is $2 \\times 3 - 2 = 4$.']] },
        ],
        onDone: () => void brace(C_K),
      });
      solveD = () => ws.solve();
    }
    return {
      async showMe() { await solveD(); },
      async solve() { await solveD(); },
      async wrong() { await brace(3, 0); },
    };
  },
};

// ------------------------------------------------------------------ p4 [H] Will the clamps latch?

export const p4: PuzzleDef = {
  id: 'c06-p4',
  title: 'Do the four clamps lie on one plane?',
  goal: 'Docking clamps at **P = (1, 0, 0)**, **Q = (2, 1, 0)**, **R = (1, 1, 1)**, **S = (2, 2, 1)** latch only if all four lie on one plane. Measure from **P**, by hand.',
  subgoals: ['Certify the clamps from P', 'After the strike: the tetrahedron PQRS'],
  hints: [
    'Use the three edge arrows from P: $Q - P$, $R - P$, $S - P$. The origin is not a clamp.',
    'Cross two edge arrows, then dot with the third. Zero means the box they make is flat.',
    'After the strike, $S - P = (1, 2, 3)$ and the box holds 2. The tetrahedron is one sixth of it: $\\tfrac13$.',
  ],
  par: 10,
  view: '3d',
  onWin: S.p4Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [1.4, 1, 1.2], distance: 14, azimuth: -52, elevation: 20, ms: 0 });
    floor(p);
    const names = ['P', 'Q', 'R', 'S'];
    const pts: V3[] = [CL_P, CL_Q, CL_R, CL_S].map(v3);
    const dots = pts.map((q, i) => new Dot(q, { color: '#e8f1ff', size: 0.09, label: names[i], labelOffset: [14, -16] }));
    p.add(...dots);
    // the trap, drawn first: LANTERN's arrows from the origin to Q, R and S
    const trapArrows = [CL_Q, CL_R, CL_S].map((q) => new Arrow([0, 0, 0], v3(q), { color: C.orange, opacity: 0.55, width: 0.025 }));
    p.add(...trapArrows);
    const trapBox = new StrutBox(p, v3(CL_Q), v3(CL_R), v3(CL_S), { opacity: 0.1 });
    trapBox.box.setColor(C.orange);
    const trapLab = lab(p, `from the origin: $Q\\cdot(R\\times S) = ${num(CL_TRAP).replace('−', '-')}$`, [1.3, -0.9, 0], { className: 'small', color: C.orange });
    const fadeTrap = () => animate(900, (k) => { trapArrows.forEach((a) => a.setOpacity(0.55 * (1 - k) + 0.15 * k)); trapBox.group.visible = k < 0.6; trapLab.el.style.opacity = String(1 - 0.6 * k); }, ease.inOut);
    // the edge arrows from P (the right way)
    const eCols = [C.v, C.w, BLUE];
    const edgeArrows = [CL_Q, CL_R, CL_S].map((q, i) => new Arrow(v3(CL_P), v3(q), { color: eCols[i], width: 0.04 }));
    edgeArrows.forEach((a) => a.setOpacity(0));
    p.add(...edgeArrows);
    const fromP = new StrutBox(p, v3(P4.e1), v3(P4.e2), v3(P4.e3), { origin: v3(CL_P) });
    fromP.show(false);
    const plane = new PlanePatch(p.g.stage, [1.5, 1, 0.5], v3(P4.cross), { color: '#9fb6d8', size: 4.5, opacity: 0.1 });
    plane.setOpacity(0);
    p.add(plane);
    const tet = new Tetra(p, [CL_P, CL_Q, CL_R, CL_S_BENT].map(v3), { color: C.result, fill: 0, edge: 0 });
    const r = p.readout('Clamps');
    r.row('trap', 'LANTERN, from the origin', `${num(CL_TRAP)}: not flat?`, C.orange);
    void (async () => {
      await wait(p.g.headless ? 5 : 2200);
      await fadeTrap();
      edgeArrows.forEach((a) => void animate(600, (k) => a.setOpacity(k), ease.out));
      r.row('e', 'edge arrows from P', 'green, red, blue');
    })();
    let phase = 0;
    let ws2: StepWorksheet | null = null;
    // solve() runs the same story with no frames to wait for (the machine may render slowly)
    let fast = false;
    const anim = (ms: number, fn: (k: number) => void, e = ease.inOut): Promise<void> => (fast ? (fn(1), Promise.resolve()) : animate(ms, fn, e));
    const latch = async () => {
      if (phase !== 0) return;
      phase = 1;
      p.subgoal(0);
      trapArrows.forEach((a) => a.setOpacity(0)); trapBox.group.visible = false; trapLab.show(false);
      fromP.show(true);
      await anim(600, (k) => plane.setOpacity(k * 0.9), ease.out);
      dots.forEach((dt) => dt.setColor(C.good));
      sfx.snap(); sfx.success();
      r.row('v', 'edge-arrow box', '0: one plane', C.good);
      p.bark('lantern', 'Edge arrows from P enclose 0. All four clamps share one plane. Latched.');
      await anim(p.g.headless ? 5 : 1400, () => {});
      // a debris strike bends S
      sfx.collapse();
      p.g.stage.nudge(0.25);
      void p.g.stage.shockwave(v3(CL_S), 900, 0.5);
      const s0 = v3(CL_S), s1 = v3(CL_S_BENT);
      await anim(900, (k) => {
        const s: V3 = [s0[0], s0[1], s0[2] + (s1[2] - s0[2]) * k];
        dots[3].at(s);
        edgeArrows[2].setTo(s);
        fromP.set(v3(P4.e1), v3(P4.e2), [s[0] - CL_P[0], s[1] - CL_P[1], s[2] - CL_P[2]]);
      }, ease.out);
      dots[3].setColor(C.orange);
      plane.setOpacity(0.25);
      r.row('v', 'edge-arrow box', 'S was bent to (2, 2, 3)', C.orange);
      tet.setEdge(0.9);
      p.setGoal('A debris strike bent **S** to **(2, 2, 3)**. The clamps no longer share a plane. How much space is in the tetrahedron **PQRS** now?');
      ws2 = new StepWorksheet(p, {
        title: 'After the strike',
        steps: [
          { prompt: '$(R - P)\\times(S - P) = (0, 1, 1)\\times(1, 2, 3)$', answer: P4.crossBent },
          { prompt: 'The box: $(Q - P)\\cdot\\big((R - P)\\times(S - P)\\big)$', answer: P4.box },
          { prompt: 'The tetrahedron PQRS (exactly; fractions like 2/6 are fine)', answer: P4.tet, mistakes: [[2, 'That is the whole box. The tetrahedron on the same three edges is one sixth of it.'], [1, 'Half the box is a prism; the tetrahedron is a third of that prism.'], [0.33, 'Close, but that is rounded. Type it exactly, as a fraction: one sixth of 2.']] },
        ],
        onDone: () => void done(),
      });
    };
    const done = async () => {
      if (phase !== 1) return;
      phase = 2;
      p.subgoal(1);
      fromP.show(false);
      if (fast) tet.setFill(0.45); else await tet.fillTo(0.45, 800);
      r.row('t', 'tetrahedron PQRS', num(P4.tet), C.result);
      flourish(p, tet.centre);
      p.win();
    };
    const ws1 = new StepWorksheet(p, {
      title: 'Measure from P',
      steps: [
        { prompt: '$Q - P$', answer: P4.e1, mistakes: [[v3(CL_Q), 'That is Q itself, measured from the origin. Subtract P.']] },
        { prompt: '$R - P$', answer: P4.e2 },
        { prompt: '$S - P$', answer: P4.e3 },
        { prompt: '$(R - P)\\times(S - P)$', answer: P4.cross },
        { prompt: '$(Q - P)\\cdot\\big((R - P)\\times(S - P)\\big)$', answer: P4.triple, mistakes: [[CL_TRAP, 'That is $Q\\cdot(R\\times S)$, from the origin. Use the edge arrows from P.']] },
      ],
      onDone: () => { ws1.el.remove(); void latch(); },
    });
    return {
      async showMe() { await ws1.showMe(300); await until(() => !!ws2); await ws2!.showMe(300); await until(() => phase === 2); },
      async solve() { fast = true; ws1.solve(); await until(() => !!ws2); ws2!.solve(); await until(() => phase === 2); },
      wrong() { ws1.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p5 Inside out

export const p5: PuzzleDef = {
  id: 'c06-p5',
  title: 'Why does one box log −24?',
  goal: 'Node 7 logs **−24**, though its box looks whole. The hull logs every node\'s struts **along, across, up**, and reads first $\\cdot$ (second $\\times$ third). Swap two struts in the log until it follows the rule.',
  predict: {
    prompt: 'Swap any two struts in node 7\'s log. What will the log read?',
    choices: [{ id: 'flip', text: '+24' }, { id: 'same', text: 'Still −24' }, { id: 'zero', text: '0' }],
    answer: 'flip',
    reveal: 'Every swap of two struts flips the sign, and the box itself does not move. The size, 24, is the space inside. The sign says **which way round** the struts are listed.',
  },
  hints: [
    'The log lists the struts as 1, 2, 3. Compare it with the rule: along, across, up.',
    'Read the log against the rule, place by place. Find a strut that is not where the rule puts it.',
    'Swap that strut into its place. If the log then reads +24 but in a turned-round order, swap once more. If the log still reads across, along, up: **Swap 1 ↔ 2**.',
  ],
  par: 1,
  view: '3d',
  onWin: S.p5Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [1.2, 1.3, 2.4], distance: 20, azimuth: -64, elevation: 22, ms: 0 });
    floor(p);
    let order = N7_LOG0.slice();
    const cols = [C.v, C.w, BLUE];
    const arrows = N7.map((s, i) => new Arrow([0, 0, 0], v3(s), { color: C.white, label: String(i + 1) }));
    p.add(...arrows);
    const box = new StrutBox(p, v3(N7[order[0]]), v3(N7[order[1]]), v3(N7[order[2]]));
    const r = p.readout('Node 7');
    const chips = h('div', { style: 'display:flex;flex-direction:column;gap:6px;min-width:260px' });
    const paint = () => {
      order.forEach((si, pos) => { arrows[si].setColor(cols[pos]); arrows[si].setLabel(`${pos + 1}`); });
      box.set(v3(N7[order[0]]), v3(N7[order[1]]), v3(N7[order[2]]));
      const vol = logVol(order);
      r.row('log', 'the log reads', `${vol > 0 ? '+' : ''}${num(vol)}`, vol > 0 ? C.result : C.orange);
      r.row('rule', 'rule', 'along, across, up');
      r.row('now', 'logged as', order.map((i) => N7_NAMES[i]).join(', '));
      chips.replaceChildren(...order.map((si, pos) => h('div', { style: `display:flex;gap:10px;align-items:center;font-size:14px;color:${cols[pos]}` },
        h('span', { style: 'font-family:var(--mono);min-width:16px' }, `${pos + 1}`), h('span', null, `${N7_NAMES[si]}  ${fmt(N7[si])}`))));
    };
    paint();
    let won = false, busy = false;
    const swap = async (i: number, j: number, ms = 700) => {
      if (won || busy) return;
      busy = true;
      p.move();
      const before = logVol(order);
      order = swapLog(order, i, j);
      sfx.whoosh(ms / 1000);
      // the crystal turns inside out: it pinches to its base and opens again, the other way round
      const [a, b] = [v3(N7[order[0]]), v3(N7[order[1]])];
      const c = v3(N7[order[2]]);
      await animate(ms, (k) => {
        const s = Math.cos(k * Math.PI);
        box.box.set(a, b, [c[0] * Math.abs(s), c[1] * Math.abs(s), c[2] * Math.abs(s)]);
        if (k > 0.5) paint();
      }, ease.inOut);
      paint();
      const vol = logVol(order);
      busy = false;
      if (p5Won(order)) { won = true; flourish(p, [1.5, 2, 2]); p.win(); return; }
      if (vol > 0 && isCyclicOfRule(order)) p.bark('lantern', `+24, but logged ${order.map((x) => N7_NAMES[x]).join(', ')}. That is the rule turned round, not the rule.`);
      else p.bark('lantern', `The sign flipped: ${num(before)} to ${num(vol)}. The box did not move.`);
    };
    const btn = (i: number, j: number) => button(`Swap ${i + 1} ↔ ${j + 1}`, () => void swap(i, j), { cls: 'small' });
    p.dock().append(h('div', { class: 'kicker' }, 'Node 7 log'), chips, h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, btn(0, 1), btn(1, 2), btn(0, 2)));
    // from any log the player has reached: put each place's strut there, one swap at a time (at most two)
    const fix = async (ms?: number) => {
      await until(() => !busy);
      for (let n = 0; n < 3 && !p5Won(order); n++) {
        const [i, j] = p5NextSwap(order);
        await swap(i, j, ms);
        await until(() => !busy);
      }
    };
    return {
      async showMe() { await fix(); },
      async solve() { await fix(0); },
      async wrong() { await swap(1, 2, 0); },
    };
  },
};

// ------------------------------------------------------------------ p6 [H] The sensor housing

export const p6: PuzzleDef = {
  id: 'c06-p6',
  title: 'How much does the sensor housing hold?',
  goal: 'The sensor housing is the tetrahedron on the struts $\\cg{(2, 0, 0)}$, $\\cr{(0, 3, 0)}$, $\\cb{(1, 1, 4)}$. Work out its volume by hand. Then split the box and fill the housing.',
  subgoals: ['Its volume, by hand', 'Split the box and fill the housing'],
  hints: [
    'First the box on the three struts: cross two of them, then dot with the third.',
    'The box holds 24. It splits into two prisms, and each prism into three tetrahedra of equal volume.',
    'One sixth of 24 is 4.',
  ],
  par: 5,
  view: '3d',
  onWin: S.p6Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [1.2, 1.5, 2.5], distance: 21, azimuth: -58, elevation: 20, ms: 0 });
    floor(p);
    const a = v3(H_A), b = v3(H_B), c = v3(H_C);
    p.add(new Arrow([0, 0, 0], a, { color: C.v, label: '$\\mathbf a$' }), new Arrow([0, 0, 0], b, { color: C.w, label: '$\\mathbf b$' }), new Arrow([0, 0, 0], c, { color: BLUE, label: '$\\mathbf c$' }));
    const box = new StrutBox(p, a, b, c, { opacity: 0.12 });
    const housing = new Tetra(p, [[0, 0, 0], a, b, c], { color: '#9fe8ff', fill: 0.08, edge: 0.95 });
    const hl = lab(p, 'housing', [0.5, 0.6, 1.5], { className: 'small', color: '#9fe8ff' });
    const r = p.readout('Sensor housing');
    let pieces: Tetra[] = [];
    let split = false, won = false, fastSplit = false;
    const centre: V3 = [(a[0] + b[0] + c[0]) / 2, (a[1] + b[1] + c[1]) / 2, (a[2] + b[2] + c[2]) / 2];
    const tints = ['#9fe8ff', '#ffd166', '#ffb86b', '#ffd166', '#ffb86b', '#ffd166'];
    const doSplit = async () => {
      if (split) return;
      split = true;
      p.subgoal(0);
      r.row('box', 'the box', num(P6.box));
      box.show(false); housing.setFill(0); housing.setEdge(0); hl.show(false);
      const six = sixTets(a, b, c).map((t) => t.map(v3));
      pieces = six.map((t, i) => new Tetra(p, t, { color: tints[i], fill: i === 0 ? 0.1 : 0.04, edge: i === 0 ? 0.95 : 0.45 }));
      sfx.whoosh(1);
      const go = (k: number) => {
        pieces.forEach((pc, i) => {
          const cc = pc.centre;
          const dir = new Vector3(cc[0] - centre[0], cc[1] - centre[1], cc[2] - centre[2]).normalize().multiplyScalar(1.05 * k);
          pc.group.position.copy(dir);
          void i;
        });
      };
      if (fastSplit) go(1); else await animate(p.g.headless ? 1 : 1100, go, ease.out);
      r.row('each', 'each of the six pieces', num(P6.housing), C.result);
      p.setGoal('The box split into **six tetrahedra** of equal volume. **Click the housing** (the corner piece at the node) to fill it.');
    };
    const fill = async (i: number) => {
      if (!split || won) return;
      p.move();
      const pc = pieces[i];
      if (fastSplit) pc.setFill(0.5); else await pc.fillTo(0.5, 500);
      if (i === 0) {
        won = true;
        p.subgoal(1);
        r.row('h', 'housing', `24 / 6 = ${num(P6.housing)}`, C.result);
        flourish(p, pc.centre, '#9fe8ff');
        p.win();
      } else {
        p.bark('lantern', 'That piece holds 4 too: every piece does. The housing is the corner piece at the node.');
        void pc.fillTo(0.12, 900);
      }
    };
    const onClick = (e: PointerEvent) => {
      if (!split || won || p.g.drag.dragging) return;
      const hit = p.g.stage.pick(e.clientX, e.clientY, pieces.map((x) => x.fill));
      const i = pieces.findIndex((x) => x.fill === hit);
      if (i >= 0) void fill(i);
    };
    p.g.stage.renderer.domElement.addEventListener('pointerdown', onClick);
    p.onDispose(() => p.g.stage.renderer.domElement.removeEventListener('pointerdown', onClick));
    const ws = new StepWorksheet(p, {
      steps: [
        { prompt: '$\\mathbf b\\times\\mathbf c = (0, 3, 0)\\times(1, 1, 4)$', answer: P6.cross },
        { prompt: 'The box: $\\mathbf a\\cdot(\\mathbf b\\times\\mathbf c)$', answer: P6.box },
        { prompt: 'The housing', answer: P6.housing, mistakes: [[24, 'That is the whole box. The housing is one of six equal pieces.'], [12, 'That is half the box: one prism. Each prism is three tetrahedra.'], [8, 'A third of the box: the box is two prisms, each three tetrahedra.']] },
      ],
      onDone: () => { void doSplit().then(() => { p.dock().append(button('Fill the housing', () => void fill(0), { cls: 'primary small' })); }); },
    });
    return {
      async showMe() { await ws.showMe(300); await until(() => split); await fill(0); },
      async solve() { fastSplit = true; ws.solve(); await until(() => split); await fill(0); },
      wrong() { ws.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p7 [S] Cyclic order

export const p7: PuzzleDef = {
  id: 'c06-p7',
  title: 'Does it matter which strut goes first?',
  goal: 'Set any three struts. Compare the three turns of the order: $\\cb{\\mathbf u}\\cdot(\\cg{\\mathbf v}\\times\\cr{\\mathbf w})$, $\\cg{\\mathbf v}\\cdot(\\cr{\\mathbf w}\\times\\cb{\\mathbf u})$, $\\cr{\\mathbf w}\\cdot(\\cb{\\mathbf u}\\times\\cg{\\mathbf v})$. Then let Bram **shake** them.',
  hints: ['Drag any tip. Watch the three turns.', 'All three turns build the same box with the same handedness.', 'Press **Shake**.'],
  par: 2,
  view: '3d',
  style: 'mastery',
  onWin: S.p7Win,
  async setup(p) {
    await p.g.stage.view3D({ target: [0.6, 0.6, 2.0], distance: 20, azimuth: -60, elevation: 22, ms: 0 });
    floor(p);
    let u: V3 = [1, 1, 3], v: V3 = [2, 0, 0], w: V3 = [0, 2, 1];
    const box = new StrutBox(p, v, w, u);
    const r = p.readout('Three turns of the order');
    const show = () => {
      box.set(v, w, u);
      r.row('a', '$\\mathbf u\\cdot(\\mathbf v\\times\\mathbf w)$', num(triple(u, v, w)), C.result);
      r.row('b', '$\\mathbf v\\cdot(\\mathbf w\\times\\mathbf u)$', num(triple(v, w, u)), C.result);
      r.row('c', '$\\mathbf w\\cdot(\\mathbf u\\times\\mathbf v)$', num(triple(w, u, v)), C.result);
      r.row('d', 'a swap: $\\mathbf v\\cdot(\\mathbf u\\times\\mathbf w)$', num(triple(v, u, w)), C.orange);
    };
    const hv = new VectorHandle(p, { to: v, color: C.v, label: '$\\mathbf v$', limit: 4, onChange: (t) => { v = t; show(); } });
    const hw = new VectorHandle(p, { to: w, color: C.w, label: '$\\mathbf w$', limit: 4, onChange: (t) => { w = t; show(); } });
    const hu = new VectorHandle(p, { to: u, color: BLUE, label: '$\\mathbf u$', limit: 4, onChange: (t) => { u = t; show(); } });
    show();
    const n = { cadet: 2, navigator: 5, commander: 10 }[p.difficulty];
    let won = false, busy = false;
    const shake = async (ms: number) => {
      if (won || busy) return;
      busy = true;
      p.move();
      const rr = rng(0x606 + p.moves());
      for (let i = 0; i < n; i++) {
        const rv = (): V3 => [rint(rr, -3, 3), rint(rr, -3, 3), rint(rr, -2, 4)];
        const [a, b, c] = [rv(), rv(), rv()];
        if (ms) await Promise.all([hv.arrow.moveTo(a, ms), hw.arrow.moveTo(b, ms), hu.arrow.moveTo(c, ms)]);
        else { hv.arrow.setTo(a); hw.arrow.setTo(b); hu.arrow.setTo(c); }
        v = a; w = b; u = c; show();
        sfx.tick(i % 5);
        if (ms) await wait(260);
      }
      busy = false;
      won = true;
      p.bark('bram', `${n} shakes. The three turns agreed every time.`);
      flourish(p, [0.5, 0.5, 1.5]);
      p.win();
    };
    p.dock().append(button('Shake', () => void shake(380), { cls: 'primary small' }));
    return {
      async showMe() { await shake(380); },
      async solve() { await shake(0); },
    };
  },
};
