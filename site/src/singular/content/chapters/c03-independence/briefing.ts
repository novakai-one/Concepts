// Chapter 3 Briefing (GDD §6.3 Ch 3): Say it, two Doubts (one true, one false), the Law, Ilse's
// page, the Why-it-matters card, the Act I Review (four claims by Bram) and NumPy card I.
import type { CardDef, CompareDef, DoubtDef, Game, LawDef, PuzzleCtx, SayItDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Beacon, Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { PlanePatch } from '../../../gfx/shapes';
import { burst } from '../../../gfx/fx';
import { C } from '../../../core/theme';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { combo, cross } from '../../../math/la';
import { rint } from '../../../game/lawcheck';
import { DialRig, fmtV, to3, own } from '../c02-span/rig';
import { VectorHandle } from '../../../kit/handle';
import {
  THRUST3, SP_ARROWS, spanDim, dependent, loopOf, pairwiseApart, zeroLoopHolds, apartUsefulHolds, threeMoreHolds,
  oneWayHolds, deckHolds, zeroIndependentHolds, lawCore, isLoop, isZero, parallel, type SetCase,
} from './logic';

const ORIGIN: V3 = [0, 0, 0];
const T0 = to3(THRUST3[0]), T1 = to3(THRUST3[1]);
const SHAPES = ['a point', 'a line', 'a plane', 'all of space'];
const COLORS = [C.v, C.w, C.u, '#d7e0f0'];

/** Random arrows in 3-D with small whole-number parts. */
const rv = (r: () => number): V3 => [rint(r, -2, 2), rint(r, -2, 2), rint(r, -1, 2)];
function independentPair(r: () => number): [V3, V3] { for (;;) { const a = rv(r), b = rv(r); if (spanDim([a, b]) === 2) return [a, b]; } }
function independentThree(r: () => number): V3[] { for (;;) { const a = [rv(r), rv(r), rv(r)]; if (spanDim(a) === 3) return a; } }

/** Three draggable arrows in 3-D (Shift-drag for height); the plane of the first two drawn faintly. */
function threeHandles(p: PuzzleCtx, start: V3[], names = ['\\mathbf a', '\\mathbf b', '\\mathbf c']) {
  const plane = new PlanePatch(p.g.stage, ORIGIN, [0, 0, 1], { color: '#7d8aa5', size: 8, opacity: 0.1 });
  p.add(plane);
  const hs = start.map((t, i) => new VectorHandle(p, { to: t, color: COLORS[i], label: `$${names[i]}$`, snap: 1, countMoves: true, onChange: () => draw() }));
  const draw = () => {
    const [a, b] = hs.map((x) => x.vec as V3);
    const n = cross(a, b);
    plane.object.visible = Math.hypot(n[0], n[1], n[2]) > 1e-9;
    if (plane.object.visible) plane.setSpan(ORIGIN, a, b);
  };
  draw();
  return { hs, vecs: () => hs.map((x) => x.vec as V3), set: (vs: V3[]) => { vs.forEach((v, i) => hs[i].set(v, ORIGIN)); draw(); }, draw };
}

export const sayit: SayItDef = {
  id: 'c03', who: 'bram',
  ask: 'Why must four vectors in 3D be dependent?',
  frames: {
    see: 'When I fired all of the arrows with the right dials, the ship ___.',
    means: 'Four arrows in 3-D always have a loop, because ___.',
    called: 'Arrows with a loop like that are called ___.',
    cue: 'When I can remove something and lose nothing, I think ___.',
  },
  wordBank: ['loop', 'back to the start', 'not all zero', 'reach', 'every point', 'wasted', 'plane', 'all of space', 'three directions'],
};

// ------------------------------------------------------------------ (T) the zero arrow

export const doubtZero: DoubtDef = {
  id: 'c03-d-zero', who: 'bram', isTrue: true,
  claim: 'Any set with the zero arrow in it has a loop.',
  reason: 'Fire the zero arrow by 1 and every other arrow by 0. The dials are not all zero, and the ship has not moved: a loop. It works for any other arrows at all.',
  goal: 'Two thrusters and a dead one: the zero arrow. Find dials, not all zero, that bring the ship back, and **Fire**. Then **Back it** (Bram will shake the other arrows) or **Challenge it**.',
  view: '3d',
  setup(p) {
    void p.g.stage.view3D({ target: [0.3, 0.3, 1.9], distance: 14, azimuth: -55, elevation: 24, ms: 0 });
    let vs: V3[] = [T0, T1, [0, 0, 0]];
    const zero = new Dot(ORIGIN, { color: C.u, size: 0.12, label: 'zero arrow', labelOffset: [0, 22] });
    p.add(zero);
    const rig = new DialRig(p, {
      arrows: vs, dims: 3, names: ['a', 'b', 'c'], tags: ['thruster two', 'thruster three', 'zero arrow'], dials: [1, 1, 0], range: [-3, 3], step: 1,
      preview: 'live', readoutTitle: 'Three arrows, one of them zero', glow: false,
      onArrive: (end, d) => { if (isLoop(vs, d)) { sfx.success(); void burst(p.g.stage, ORIGIN, C.result, 50, 2, false); } else p.bark('lantern', `Ended at ${fmtV(end)}.`); return 'ok'; },
    });
    return {
      holds: () => zeroLoopHolds(vs),
      describe: () => `arrows ${vs.map(fmtV).join(', ')}: dials (0, 0, 1) fire them and the ship stays at the start`,
      async play() { await wait(p.g.headless ? 10 : 300); },
      randomize(r, edge) {
        if (edge === 0) vs = [[1, 2, 0], [-2, -4, 0], [0, 0, 0]];
        else if (edge === 1) vs = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        else { const [a, b] = independentPair(r); vs = [a, b, [0, 0, 0]]; }
        void rig.setArrows(vs);
        rig.setDials([0, 0, 1], false);
      },
      edgeCases: 2,
      async showMe() { await rig.moveDials([0, 0, 1], 700); await rig.fire(); },
    };
  },
};

// ------------------------------------------------------------------ (F) pairwise apart means useful

export const doubtApart: DoubtDef = {
  id: 'c03-d-apart', who: 'bram', isTrue: false,
  claim: 'No two of these three lie on one line, so all three must be useful.',
  reason: 'Three arrows can lie on three different lines and still lie in one plane. Then the third is a combination of the other two: it is wasted, and there is a loop.',
  goal: 'Drag the arrow tips (Shift-drag for height). **Challenge it** with three arrows, no two on one line, that still have a loop. **Back it** if you think none exist.',
  view: '3d',
  setup(p) {
    void p.g.stage.view3D({ target: [0.5, 0.6, 2.3], distance: 15, azimuth: -55, elevation: 24, ms: 0 });
    const H = threeHandles(p, [T0, T1, [1, 1, 1]]);
    const r = p.readout('Three arrows');
    const read = () => {
      const vs = H.vecs();
      r.row('p', 'no two on one line', pairwiseApart(vs) ? 'yes' : 'no');
      r.row('s', 'they reach', SHAPES[spanDim(vs)], C.result);
      const l = dependent(vs) ? loopOf(vs) : null;
      r.row('l', 'a loop', l ? `dials ${fmtV(l)}` : 'none');
    };
    read();
    p.tick(() => read());
    return {
      holds: () => apartUsefulHolds(H.vecs()),
      describe: () => {
        const vs = H.vecs();
        const l = dependent(vs) ? loopOf(vs) : null;
        const head = `arrows ${vs.map(fmtV).join(', ')}`;
        if (!l) return `${head}: only all-zero dials bring the ship back`;
        if (vs.some((v) => isZero(v))) return `${head}: one of them is the zero arrow, so the claim does not apply (dials ${fmtV(l)} bring the ship back)`;
        if (!pairwiseApart(vs)) return `${head}: two of them lie on one line, so the claim does not apply (dials ${fmtV(l)} bring the ship back)`;
        return `${head}: no two on one line, yet dials ${fmtV(l)} bring the ship back`;
      },
      async play() { await wait(p.g.headless ? 10 : 250); },
      randomize(rr, edge) {
        if (edge === 0) H.set([T0, T1, [1, 2, 3]]);
        else H.set(independentThree(rr));
      },
      edgeCases: 1,
      async showMe() { await H.hs[2].moveTo([1, 2, 3], 900, ORIGIN); H.draw(); },
    };
  },
};

// ------------------------------------------------------------------ the Law

export const law: LawDef<SetCase> = {
  ...lawCore,
  frame: ['A set of arrows is ', { slot: 'kind' }, ' exactly when ', { slot: 'cond' }, '.'],
  slots: {
    kind: { options: [{ id: 'dep', text: 'linearly dependent' }, { id: 'indep', text: 'linearly independent' }] },
    cond: {
      options: [
        { id: 'loop', text: 'some dials, not all zero, return the ship to the start' },
        { id: 'onlyzero', text: 'only all-zero dials return the ship to the start' },
        { id: 'parallel', text: 'two of the arrows are parallel' },
        { id: 'zero', text: 'one arrow is the zero vector' },
        { id: 'many', text: 'there are more arrows than directions' },
      ],
    },
  },
  cadetSlots: ['kind', 'cond'],
  draw(g: Game, c: SetCase) {
    const vs = c.vs.map(to3);
    vs.forEach((v, i) => { if (Math.hypot(...v) > 1e-9) g.stage.world.add(own(new Arrow(ORIGIN, v, { color: COLORS[i], label: `$\\mathbf a_${i + 1}$` })).object); });
    if (vs.some((v) => Math.hypot(...v) < 1e-9)) g.stage.world.add(new Dot([0, 0, 0.02], { color: C.u, size: 0.1 }).object);
    const l = dependent(c.vs) ? loopOf(c.vs) : null;
    if (l) {
      const pts: V3[] = [ORIGIN];
      let at = ORIGIN;
      vs.forEach((v, i) => { at = [at[0] + l[i] * v[0], at[1] + l[i] * v[1], 0]; pts.push(at); });
      const line = new FatLine(g.stage, pts.map((q) => [q[0], q[1], 0.02] as V3), { color: C.result, width: 3, intensity: 1.6, opacity: 0.9 });
      line.object.userData.dispose = () => line.dispose();
      g.stage.world.add(line.object);
    }
  },
  reason: {
    ask: 'Your Law survived. **Why** is a loop the same as a wasted arrow?',
    options: [
      { id: 'move', text: 'If $c_1\\mathbf a_1 + \\dots + c_k\\mathbf a_k = \\mathbf 0$ with some $c_j \\neq 0$, move $c_j\\mathbf a_j$ across and divide by $-c_j$: $\\mathbf a_j$ is a combination of the others.', right: true, why: 'Yes. A loop with a non-zero dial on one arrow says that arrow can be built from the rest, so removing it loses nothing. And a wasted arrow gives a loop: build it from the others, then fire it backwards.' },
      { id: 'parallel', text: 'A loop means two arrows are parallel, and a parallel arrow is wasted.', right: false, why: 'Three arrows in one plane, no two on one line, still have a loop. A loop needs no parallel pair.' },
      { id: 'count', text: 'A loop means there are more arrows than directions.', right: false, why: 'Two parallel arrows in 3-D have a loop, and two is fewer than three directions. Counting alone does not decide it.' },
    ],
  },
};

// ------------------------------------------------------------------ Ilse's page

export const compare: CompareDef = {
  id: 'c03',
  page: 'A set of arrows is **linearly dependent** when some dials, not all zero, bring the ship back to the start. It is **linearly independent** when only the all-zero firing does that: the $\\text{trivial combination}$.\n\nA loop and a wasted arrow are the same fact. If $c_1\\mathbf a_1 + \\dots + c_k\\mathbf a_k = \\mathbf 0$ with $c_j \\neq 0$, then $\\mathbf a_j$ is a combination of the others: removing it does not shrink the span.\n\nThree arrows that point different ways can still be dependent: they may lie in one plane. Any set with the zero arrow is dependent. If three of the arrows already loop, dial 0 on the fourth makes it a loop of all four; otherwise the three are independent and reach every point, so the fourth is reachable from them. Either way, four arrows in 3-D are always dependent.',
  formula: 'c_1\\cg{\\mathbf a_1} + c_2\\cr{\\mathbf a_2} + c_3\\cb{\\mathbf a_3} = \\mathbf 0 \\;\\text{ only when }\\; c_1 = c_2 = c_3 = 0',
  keyIdeas: [
    'Did you say a loop needs dials that are not all zero?',
    'Did you say a dependent arrow is one the others can already reach, so removing it loses nothing?',
    'Did you say why four arrows in 3-D always loop: either three of them already loop, or those three reach every point, the fourth tip included?',
  ],
};

// ------------------------------------------------------------------ Why it matters: the thruster audit

export const why: CardDef = {
  kind: 'why',
  title: 'Why it matters',
  body: 'A regression fits weights to columns of data. If one column is a combination of the others, it adds nothing new, and the weights stop being unique: shift weight between the columns along the loop and the predictions do not change. Statisticians call this multicollinearity, and it is the first thing to check.\n\nThe thruster audit now runs on every mount: it searches for a loop and flags the thruster that is wasted.',
  cue: 'When you can **remove something and lose nothing**, think **dependent**.',
  visual: async (g: Game) => {
    g.stage.clearWorld();
    SP_ARROWS.forEach((v, i) => g.stage.world.add(own(new Arrow(ORIGIN, to3(v), { color: i === 3 ? C.orange : COLORS[i], label: i === 3 ? 'wasted: 2v − w' : `$${['\\mathbf v', '\\mathbf w', '\\mathbf u'][i]}$` })).object));
    const pl = new PlanePatch(g.stage, ORIGIN, [-1, -1, 1], { color: '#7d8aa5', size: 7, opacity: 0.12 });
    pl.setSpan(ORIGIN, T0, T1);
    pl.object.userData.dispose = () => pl.dispose();
    g.stage.world.add(pl.object);
    await g.stage.view3D({ target: [0.6, 0, 2.2], distance: 13, azimuth: -45, elevation: 22, ms: 0, orbit: false });
    let az = -45;
    const off = g.stage.tick((dt) => {
      az += dt * 3;
      const a = (az * Math.PI) / 180, e = (22 * Math.PI) / 180;
      g.stage.camera.position.set(0.6 + 13 * Math.cos(e) * Math.cos(a), 13 * Math.cos(e) * Math.sin(a), 0.9 + 13 * Math.sin(e));
      g.stage.camera.up.set(0, 0, 1);
      g.stage.camera.lookAt(0.6, 0, 0.9);
    });
    const prev = pl.object.userData.dispose as () => void;
    pl.object.userData.dispose = () => { off(); prev(); };
  },
};

// ------------------------------------------------------------------ Act I Review (Bram, four claims)

/** (F) "Three arrows always reach more than two." */
export const reviewThree: DoubtDef = {
  id: 'c03-r-three', who: 'bram', isTrue: false,
  claim: 'Three arrows always reach more than two.',
  reason: 'Not when the third lies in the plane of the first two. Then all three reach the same plane as the first two alone: the spare on day one did exactly that.',
  goal: 'Drag the tips (Shift-drag for height). **Challenge it** with three arrows that reach no more than the first two. **Back it** if you think that cannot happen.',
  view: '3d',
  setup(p) {
    void p.g.stage.view3D({ target: [0.5, 0.6, 2.3], distance: 15, azimuth: -55, elevation: 24, ms: 0 });
    const H = threeHandles(p, [T0, T1, [0, 0, 2]]);
    const r = p.readout('Reach');
    p.tick(() => { const vs = H.vecs(); r.row('2', 'first two reach', SHAPES[spanDim(vs.slice(0, 2))]); r.row('3', 'all three reach', SHAPES[spanDim(vs)], C.result); });
    return {
      holds: () => threeMoreHolds(H.vecs()),
      describe: () => { const vs = H.vecs(); return `arrows ${vs.map(fmtV).join(', ')}: the first two reach ${SHAPES[spanDim(vs.slice(0, 2))]}, all three reach ${SHAPES[spanDim(vs)]}`; },
      randomize(rr, edge) { if (edge === 0) H.set([T0, T1, [1, 2, 3]]); else H.set(independentThree(rr)); },
      edgeCases: 1,
      async showMe() { await H.hs[2].moveTo([2, -1, 1], 900, ORIGIN); H.draw(); },
    };
  },
};

/** (F) "If you can reach a point, there is only one way to reach it." */
export const reviewOneWay: DoubtDef = {
  id: 'c03-r-oneway', who: 'bram', isTrue: false,
  claim: 'If you can reach a point, there is only one way to reach it.',
  reason: 'When one arrow is wasted, there is a loop. Add the loop to any firing and you land on the same point with different dials. Independent arrows give one way only.',
  goal: 'Thrusters two, three and the wasted spare. Land on the crate at (2, 3, 5) **twice, with different dials**. Then **Challenge it**.',
  view: '3d',
  setup(p) {
    void p.g.stage.view3D({ target: [1, 1.5, 3.7], distance: 17, azimuth: -58, elevation: 20, ms: 0 });
    let vs: V3[] = [T0, T1, [1, 2, 3]];
    let crate: V3 = [2, 3, 5];
    let firings: number[][] = [];
    const box = new Beacon(p.g.stage, crate, { color: C.orange, label: 'crate' });
    p.add(box);
    const r0 = p.readout('Firings that hit the crate');
    const list = () => r0.row('f', 'landed with', firings.length ? firings.map((f) => fmtV(f)).join('  and  ') : 'none yet', C.result);
    const rig = new DialRig(p, {
      arrows: vs, dims: 3, names: ['a', 'b', 'c'], tags: ['thruster two', 'thruster three', 'spare'], dials: [0, 0, 0], range: [-4, 4], step: 1,
      preview: 'live', readoutTitle: null, glow: { cell: 0.12 },
      onArrive: (end, d) => {
        if (Math.hypot(end[0] - crate[0], end[1] - crate[1], end[2] - crate[2]) <= 0.05) {
          if (!firings.some((f) => f.every((x, i) => Math.abs(x - d[i]) < 1e-9))) firings.push(d.slice());
          list();
          return 'ok';
        }
        rig.gap.show(end, crate);
        return 'miss';
      },
    });
    list();
    return {
      holds: () => oneWayHolds(vs, crate, firings),
      describe: () => `arrows ${vs.map(fmtV).join(', ')}, crate ${fmtV(crate)}: ${firings.length > 1 ? `dials ${firings.map(fmtV).join(' and ')} both land on it` : firings.length ? `one firing, ${fmtV(firings[0])}` : 'no firing yet'}`,
      randomize(rr, edge) {
        if (edge === 0) {
          vs = [T0, T1, [1, 2, 3]];
          crate = [2, 3, 5];
          firings = [[2, 3, 0], [1, 1, 1]];
        } else {
          vs = independentThree(rr);
          const c = [rint(rr, -2, 2), rint(rr, -2, 2), rint(rr, -2, 2)];
          crate = to3(combo(c, vs));
          firings = [c];
        }
        void rig.setArrows(vs);
        rig.glow?.clear();
        box.at(crate);
        list();
      },
      edgeCases: 1,
      async showMe() {
        firings = [];
        for (const d of [[2, 3, 0], [1, 1, 1]]) { await rig.moveDials(d, 600); await rig.fire(); }
      },
    };
  },
};

/** (T) "Two arrows that are not on one line reach every point of a flat deck." */
export const reviewDeck: DoubtDef = {
  id: 'c03-r-deck', who: 'bram', isTrue: true,
  claim: 'Two arrows that are not on one line reach every point of a flat deck.',
  reason: 'On a flat deck, two arrows that are not on one line span the whole plane: any point splits into a stretch of one plus a stretch of the other.',
  goal: 'Set two arrows on the deck. Drag the yellow tip anywhere: the dials follow. **Back it** (Bram will shake the arrows) or **Challenge it** with a point you cannot reach.',
  view: '2d',
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [0.5, 0.5], height: 11, ms: 0 });
    const H = [[2, 1, 0], [-1, 2, 0]].map((t, i) => new VectorHandle(p, { to: t as V3, color: COLORS[i], label: `$${['\\mathbf v', '\\mathbf w'][i]}$`, onChange: () => sync() }));
    const rig = new DialRig(p, {
      arrows: H.map((x) => x.vec as V3), dims: 2, names: ['a', 'b'], dials: [1.5, 1], range: [-6, 6], preview: 'live', ship: false, fireLabel: null,
      dragTip: true, baseArrows: false, readoutTitle: 'Two arrows on the deck', glow: { cell: 0.12 },
    });
    const sync = () => { void rig.setArrows(H.map((x) => x.vec as V3)); };
    return {
      holds: () => deckHolds(H[0].vec, H[1].vec),
      describe: () => `v = ${fmtV(H[0].vec.slice(0, 2))}, w = ${fmtV(H[1].vec.slice(0, 2))}: ${parallel(H[0].vec, H[1].vec) ? 'they lie on one line, so the claim does not apply' : 'together they reach the whole deck'}`,
      async play() { await rig.moveDials([rig.dials[0] + 0.5, rig.dials[1] - 0.5], p.g.headless ? 10 : 300); },
      randomize(rr, edge) {
        let a: V3, b: V3;
        if (edge === 0) { a = [3, 0, 0]; b = [0, 2, 0]; }
        else do { a = [rint(rr, -3, 3), rint(rr, -3, 3), 0]; b = [rint(rr, -3, 3), rint(rr, -3, 3), 0]; } while (spanDim([a, b]) < 2);
        H[0].set(a, ORIGIN); H[1].set(b, ORIGIN);
        sync();
      },
      edgeCases: 1,
      async showMe() { await rig.moveDials([-2, 1.5], 700); await rig.moveDials([1, -2], 700); },
    };
  },
};

/** (F) "An arrow of length zero can belong to an independent set." */
export const reviewZero: DoubtDef = {
  id: 'c03-r-zero', who: 'bram', isTrue: false,
  claim: 'An arrow of length zero can belong to an independent set.',
  reason: 'Put dial 1 on the zero arrow and 0 on every other: the dials are not all zero and the ship goes nowhere. That is a loop, so any set with the zero arrow is dependent.',
  goal: 'Bram’s set: thruster two and the zero arrow. Find dials, not all zero, that bring the ship back, and **Fire**. Then **Challenge it**.',
  view: '3d',
  setup(p) {
    void p.g.stage.view3D({ target: [0.4, 0, 1.8], distance: 12, azimuth: -55, elevation: 24, ms: 0 });
    let vs: V3[] = [T0, [0, 0, 0]];
    let shown: number[] = [0, 0];
    const zero = new Dot(ORIGIN, { color: C.w, size: 0.12, label: 'zero arrow', labelOffset: [0, 22] });
    p.add(zero);
    const rig = new DialRig(p, {
      arrows: vs, dims: 3, names: ['a', 'b'], tags: ['thruster two', 'zero arrow'], dials: [1, 0], range: [-3, 3], step: 1,
      preview: 'live', readoutTitle: 'Bram’s set', glow: false,
      onArrive: (_e, d) => { shown = d.slice(); if (isLoop(vs, d)) { sfx.success(); void burst(p.g.stage, ORIGIN, C.result, 50, 2, false); p.bark('lantern', `Dials ${fmtV(d)}: not all zero, and the ship never left the start.`); } return 'ok'; },
    });
    return {
      holds: () => zeroIndependentHolds(vs, shown),
      describe: () => `arrows ${vs.map(fmtV).join(', ')}, fired with dials ${fmtV(shown)}${isLoop(vs, shown) ? ': the ship is back at the start' : ''}`,
      randomize(rr, edge) {
        vs = [rv(rr), [0, 0, 0]];
        if (Math.hypot(...vs[0]) < 1e-9) vs[0] = [1, 0, 1];
        shown = edge === 0 ? [0, 1] : [rint(rr, 1, 2), 0];
        void rig.setArrows(vs);
        rig.setDials(shown, false);
      },
      edgeCases: 1,
      async showMe() { await rig.moveDials([0, 1], 700); await rig.fire(); },
    };
  },
};

// ------------------------------------------------------------------ NumPy card I

export const numpy: CardDef = {
  kind: 'numpy',
  title: 'In NumPy: the reach question',
  body: 'Stack the thrusters as the columns of one array: `T = np.column_stack([v, w, u])`.\n\n- `np.linalg.matrix_rank(T)` counts the independent directions: **2** for thrusters two and three alone, **3** once the new mount is on. Add the spare and it stays 3: the spare adds nothing.\n- `np.linalg.solve(T, [4, -1, 6])` returns the dials for the ark’s approach point, `[4., -1., 1.5]`, in one call.\n\nYour `reachable` tries 40,401 dial settings and stops at −10 to 10. NumPy solves for the dials directly in compiled code (LAPACK, with row swaps for accuracy), and handles any size. You will build that method yourself in Chapter 10.',
};

