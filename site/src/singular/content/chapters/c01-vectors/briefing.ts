// Chapter 1 Briefing (GDD §6.3 Ch 1): Say it, two Doubts (one false, one true), the Law, Ilse's page.
import { Vector3 } from 'three';
import type { CompareDef, DoubtDef, LawDef, SayItDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { Parallelogram, InfLine } from '../../../gfx/shapes';
import { Slider } from '../../../ui/widgets';
import { C } from '../../../core/theme';
import { nice } from '../../../math/frac';
import { animate, ease } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { VectorHandle } from '../../../kit/handle';
import { ordersDiffer, negFlipHolds, lawCore, type OrderCase } from './logic';
import { rint } from '../../../game/lawcheck';

const fmt = (v: number[]) => `(${nice(v[0])}, ${nice(v[1])})`;

export const sayit: SayItDef = {
  id: 'c01', who: 'bram',
  ask: 'Why is the arrow from P to Q equal to Q minus P?',
  frames: {
    see: 'The arrow starts at ___ and its tip is at ___.',
    means: 'To get from P to Q, each part of the move is ___ minus ___.',
    called: 'This arrow is called a ___.',
    cue: 'When you see "from here to there", think ___.',
  },
  wordBank: ['tail', 'tip', 'start', 'end', 'across', 'up', 'minus', 'vector', 'end minus start'],
};


export const doubtOrder: DoubtDef = {
  id: 'c01-d-order', who: 'bram', isTrue: false,
  claim: 'East then north lands somewhere different from north then east. Different route, different place.',
  reason: 'Each direction adds on its own. Across, $a_1 + b_1$ is the same number as $b_1 + a_1$; up works the same way. So both orders end at the same point, and the two routes trace two sides each of one parallelogram.',
  goal: 'Set any two burns. Then **Challenge it** (a case where both orders meet) or **Back it** (a case where they do not).',
  view: '2d',
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [1.5, 1.5], height: 9, ms: 0 });
    const a = new VectorHandle(p, { to: [3, 0, 0], color: C.v, label: '$\\mathbf a$', countMoves: false });
    const b = new VectorHandle(p, { to: [0, 2, 0], color: C.w, label: '$\\mathbf b$', countMoves: false });
    const a2 = new Arrow([0, 0, 0], [0, 0, 0], { color: C.v, opacity: 0.55, width: 0.035 });
    const b2 = new Arrow([0, 0, 0], [0, 0, 0], { color: C.w, opacity: 0.55, width: 0.035 });
    const par = new Parallelogram(p.g.stage, [3, 0, 0], [0, 2, 0], { color: C.result, opacity: 0 });
    par.setOpacity(0, 0);
    const meet = new Dot([3, 2, 0], { color: C.result, size: 0.12 });
    meet.setOpacity(0);
    p.add(par, a2, b2, meet);
    const vecs = () => ({ av: a.vec, bv: b.vec });
    return {
      holds: () => { const { av, bv } = vecs(); return ordersDiffer(av, bv); },
      describe: () => { const { av, bv } = vecs(); return `a = ${fmt(av)}, b = ${fmt(bv)}: both orders end at ${fmt([av[0] + bv[0], av[1] + bv[1]])}`; },
      async play() {
        const { av, bv } = vecs();
        const end: V3 = [av[0] + bv[0], av[1] + bv[1], 0];
        b2.set(av, av); a2.set(bv, bv); meet.setOpacity(0); par.set(av as V3, bv as V3); par.setOpacity(0, 0);
        await Promise.all([b2.moveTo(end, 600, av as V3), a2.moveTo(end, 600, bv as V3)]);
        meet.at([end[0], end[1], 0.05]); meet.setOpacity(1); sfx.snap();
        await animate(350, (k) => par.setOpacity(0.15 * k, 0.7 * k), ease.out);
      },
      randomize(r) {
        let av: V3, bv: V3;
        do { av = [rint(r, -4, 4), rint(r, -3, 4), 0]; bv = [rint(r, -4, 4), rint(r, -3, 4), 0]; } while (Math.abs(av[0] * bv[1] - av[1] * bv[0]) < 2);
        a.set(av, [0, 0, 0]); b.set(bv, [0, 0, 0]);
      },
      edgeCases: 0,
      async showMe() { a.set([3, 0, 0], [0, 0, 0]); await b.moveTo([0, 2, 0], 400, [0, 0, 0]); },
    };
  },
};

export const doubtFlip: DoubtDef = {
  id: 'c01-d-flip', who: 'bram', isTrue: true,
  claim: 'A negative amount flips the arrow, but it stays on the same line.',
  reason: 'Multiplying both parts by the same number keeps the ratio across : up, so the arrow stays on its line. A negative number changes the sign of both parts, so it points the other way.',
  goal: 'Set an arrow and a negative amount. **Back it** (Bram will shake it) or **Challenge it** (find a case that turns off the line).',
  view: '2d',
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [0, 0], height: 10, ms: 0 });
    const v = new VectorHandle(p, { to: [2, 1, 0], color: C.v, label: '$\\mathbf v$', countMoves: false });
    const kv = new Arrow([0, 0, 0], [-4, -2, 0], { color: C.result, label: '$k\\mathbf v$' });
    const line = new InfLine(p.g.stage, [0, 0, 0], [2, 1, 0], { color: '#7d8aa5', width: 1.2, opacity: 0.5, dashed: true });
    p.add(kv, line.object);
    p.onDispose(() => line.dispose());
    let k = -2;
    const upd = () => {
      const t = v.vec;
      kv.setTo([k * t[0], k * t[1], 0]);
      if (Math.hypot(t[0], t[1]) > 1e-6) line.set([0, 0, 0], t);
    };
    const slider = new Slider({ label: 'amount $k$', min: -3, max: 3, step: 0.5, value: k, onInput: (x) => { k = x; upd(); } });
    p.dock().appendChild(slider.el);
    p.tick(() => upd());
    return {
      holds: () => negFlipHolds(v.vec, k),
      describe: () => `v = ${fmt(v.vec)}, k = ${nice(k)}, kv = ${fmt([k * v.vec[0], k * v.vec[1]])}`,
      randomize(r, edge) {
        const cases: [V3, number][] = [[[3, -1, 0], -1], [[0, 2, 0], -3]];
        if (edge !== undefined) { const [vv, kk] = cases[edge]; v.set(vv, [0, 0, 0]); k = kk; }
        else { let vv: V3; do { vv = [rint(r, -4, 4), rint(r, -4, 4), 0]; } while (vv[0] === 0 && vv[1] === 0); v.set(vv, [0, 0, 0]); k = -[0.5, 1, 1.5, 2, 2.5, 3][rint(r, 0, 5)]; }
        slider.set(k, false); upd();
      },
      edgeCases: 2,
      async showMe() { k = -2; slider.set(k, false); await v.moveTo([2, 1, 0], 400, [0, 0, 0]); upd(); },
    };
  },
};

export const law: LawDef<OrderCase> = {
  ...lawCore,
  frame: ['Doing $\\cg{\\mathbf v}$ then $\\cr{\\mathbf w}$ lands ', { slot: 'where' }, ' doing $\\cr{\\mathbf w}$ then $\\cg{\\mathbf v}$, ', { slot: 'when' }, '.'],
  slots: {
    where: { options: [{ id: 'same', text: 'at the same point as' }, { id: 'diff', text: 'at a different point from' }] },
    when: { options: [
      { id: 'always', text: 'always' },
      { id: 'parallel', text: 'exactly when the arrows are parallel' },
      { id: 'positive', text: 'exactly when every part is positive' },
      { id: 'short', text: 'exactly when both arrows are shorter than 3' },
    ] },
  },
  draw(g, c) {
    const v = c.v, w = c.w;
    const end: V3 = [v[0] + w[0], v[1] + w[1], 0];
    g.stage.world.add(
      new Arrow([0, 0, 0], [v[0], v[1], 0], { color: C.v }).object,
      new Arrow([v[0], v[1], 0], end, { color: C.w }).object,
      new Arrow([0, 0, 0], [w[0], w[1], 0], { color: C.w, opacity: 0.55, width: 0.035 }).object,
      new Arrow([w[0], w[1], 0], end, { color: C.v, opacity: 0.55, width: 0.035 }).object,
      new Dot(end, { color: C.result, size: 0.12 }).object,
    );
    void new Vector3();
  },
  reason: {
    ask: 'Your Law survived. **Why** does the order never matter?',
    options: [
      { id: 'a', text: 'Each direction adds on its own: across, $v_1 + w_1 = w_1 + v_1$; up, $v_2 + w_2 = w_2 + v_2$.', right: true, why: 'Yes. Two numbers give the same sum in either order, and vectors add part by part. That is the whole reason.' },
      { id: 'b', text: 'The ship flies straight to the end point either way.', right: false, why: 'The two routes are different paths: one goes along v first, the other along w first. They meet at the end because the totals match.' },
      { id: 'c', text: 'The two routes are the same length.', right: false, why: 'They are the same length, but that would not put them at the same point: many different points are the same distance away.' },
    ],
  },
};

export const compare: CompareDef = {
  id: 'c01',
  page: 'An arrow from **P** to **Q** says how far to move along each axis to get from P to Q.\n\nIts parts are differences, axis by axis: across $q_1 - p_1$, up $q_2 - p_2$. So the arrow is **Q − P**: end minus start.\n\nThe same arrow drawn from any other start is the same move. Doing one move after another adds the parts, so the order does not change where you end.',
  formula: '\\overrightarrow{PQ} = Q - P = \\begin{bmatrix} q_1 - p_1 \\\\ q_2 - p_2 \\end{bmatrix}',
  keyIdeas: [
    'Did you say the arrow is a move, not a place?',
    'Did you say each part is end minus start, one axis at a time?',
    'Did you say the same arrow from any start is the same move?',
  ],
};
