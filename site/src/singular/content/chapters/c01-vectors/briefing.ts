// Chapter 1's two old Doubts, kept only for the prototype chapter (c90-proto), which imports them.
// Chapter 1 itself no longer plays them.
import type { DoubtDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { Parallelogram, InfLine } from '../../../gfx/shapes';
import { Slider } from '../../../ui/widgets';
import { C } from '../../../core/theme';
import { nice } from '../../../math/frac';
import { animate, ease } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { VectorHandle } from '../../../kit/handle';
import { ordersDiffer, negFlipHolds } from './logic';
import { rint } from '../../../game/lawcheck';

const fmt = (v: number[]) => `(${nice(v[0])}, ${nice(v[1])})`;

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
