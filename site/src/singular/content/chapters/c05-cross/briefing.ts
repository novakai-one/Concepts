// Chapter 5 Briefing (GDD §6.4 Ch 5): Say it, two Doubts (one false, one true), the Law, Ilse's page.
import type { CompareDef, DoubtDef, Game, LawDef, SayItDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Label } from '../../../gfx/label';
import { Parallelogram } from '../../../gfx/shapes';
import { C } from '../../../core/theme';
import { nice } from '../../../math/frac';
import { cross, norm } from '../../../math/la';
import { animate, ease } from '../../../core/tween';
import { button } from '../../../ui/ui';
import { VectorHandle } from '../../../kit/handle';
import { rint } from '../../../game/lawcheck';
import { Gauge, addGauges } from '../c04-dot/meter';
import { doubleDoubles, fmt, lawCore, parallelogramArea, swapSame, type CrossCase } from './logic';

const v3 = (v: readonly number[]): V3 => [v[0], v[1], v[2] ?? 0];
const FROST = '#e8f0ff';

export const sayit: SayItDef = {
  id: 'c05', who: 'bram',
  ask: 'Why is $\\mathbf v \\times \\mathbf v = \\mathbf 0$?',
  frames: {
    see: 'When the two edges point the same way, the panel between them has ___.',
    means: 'The cross product is as long as the ___, so for an arrow with itself it is ___.',
    called: 'The arrow at a right angle to both edges, as long as the area, is the ___.',
    cue: 'When you need a direction at a right angle to two others, think ___.',
  },
  wordBank: ['panel', 'area', 'zero', 'no width', 'right angle', 'both edges', 'cross product', 'normal vector', 'right-hand rule'],
};

/** Two edge handles on the floor, the panel, and a raised arrow (shared by both doubts). */
function edges(p: Parameters<DoubtDef['setup']>[0], v0: V3, w0: V3, onChange: () => void) {
  const par = new Parallelogram(p.g.stage, v0, w0, { color: FROST, opacity: 0.18, edge: 1.3 });
  p.add(par);
  const st = { v: v0, w: w0 };
  const snap = p.snap() ?? 0.5;
  const hv = new VectorHandle(p, { to: v0, color: C.v, label: '$\\mathbf v$', snap, limit: 4, countMoves: false, onChange: (t) => { st.v = t; par.set(st.v, st.w); onChange(); } });
  const hw = new VectorHandle(p, { to: w0, color: C.w, label: '$\\mathbf w$', snap, limit: 4, countMoves: false, onChange: (t) => { st.w = t; par.set(st.v, st.w); onChange(); } });
  const set = (v: V3, w: V3) => { hv.set(v, [0, 0, 0]); hw.set(w, [0, 0, 0]); };
  return { st, par, hv, hw, set };
}

// ------------------------------------------------------------------ (F) v × w and w × v are the same arrow

export const doubtSwap: DoubtDef = {
  id: 'c05-d-swap', who: 'bram', isTrue: false,
  claim: '$\\mathbf v \\times \\mathbf w$ and $\\mathbf w \\times \\mathbf v$ are the same arrow. Same two edges, same panel.',
  reason: 'Same panel, same length, opposite side. Swapping the edges swaps the curl of the right-hand rule, so $\\mathbf w\\times\\mathbf v = -(\\mathbf v\\times\\mathbf w)$: $(2, 0, 0)\\times(1, 3, 0) = (0, 0, 6)$ but $(1, 3, 0)\\times(2, 0, 0) = (0, 0, -6)$.',
  goal: 'Set two edges $\\mathbf v$ and $\\mathbf w$. Both orders are raised. **Challenge it** (they differ) or **Back it** (Bram will shake it).',
  view: '3d',
  async setup(p) {
    await p.g.stage.view3D({ target: [0.8, 0.8, 0.6], distance: 19, azimuth: -60, elevation: 22, ms: 0 });
    p.grid({ base: 0.1, main: 0.16, axis: 0.4 });
    const vw = new Arrow([0, 0, 0], [0, 0, 1], { color: C.result, label: '$\\mathbf v\\times\\mathbf w$ (½ size)' });
    const wv = new Arrow([0, 0, 0], [0, 0, -1], { color: C.result, opacity: 0.55, width: 0.04, label: '$\\mathbf w\\times\\mathbf v$ (½ size)' });
    p.add(vw, wv);
    const r = p.readout('Both orders');
    const upd = () => {
      const a = v3(cross(e.st.v, e.st.w)), b = v3(cross(e.st.w, e.st.v));
      vw.set([0, 0, 0], v3(a.map((x) => x / 2))); wv.set([0, 0, 0], v3(b.map((x) => x / 2)));
      vw.object.visible = norm(a) > 0.02; wv.object.visible = norm(b) > 0.02;
      r.row('a', '$\\mathbf v\\times\\mathbf w$', fmt(a), C.result);
      r.row('b', '$\\mathbf w\\times\\mathbf v$', fmt(b), C.result);
      r.row('s', 'the same arrow?', swapSame(e.st.v, e.st.w) ? 'yes' : 'no');
    };
    const e = edges(p, [2, 0, 0], [1, 3, 0], () => upd());
    upd();
    return {
      holds: () => swapSame(e.st.v, e.st.w),
      describe: () => `v = ${fmt(e.st.v)}, w = ${fmt(e.st.w)}: v × w = ${fmt(cross(e.st.v, e.st.w))}, w × v = ${fmt(cross(e.st.w, e.st.v))}`,
      async play() { await Promise.all([vw.grow(400), wv.grow(400)]); },
      randomize(rr, edge) {
        const cases: [V3, V3][] = [[[2, 0, 0], [1, 3, 0]], [[1, 2, 0], [0, 1, 3]]];
        if (edge !== undefined) { e.set(...cases[edge]); return; }
        const rv = (): V3 => [rint(rr, -3, 3), rint(rr, -3, 3), rint(rr, 0, 2)];
        e.set(rv(), rv());
      },
      edgeCases: 2,
      async showMe() { e.set([2, 0, 0], [1, 3, 0]); await vw.grow(500); },
    };
  },
};

// ------------------------------------------------------------------ (T) Double one edge and the length doubles

export const doubtDouble: DoubtDef = {
  id: 'c05-d-double', who: 'bram', isTrue: true,
  claim: 'Double one edge and the cross product\'s length doubles.',
  reason: 'Doubling one edge doubles the panel\'s base and keeps its height, so the area doubles, and the cross product is as long as the area. Part by part: $(2\\mathbf v)\\times\\mathbf w = 2(\\mathbf v\\times\\mathbf w)$.',
  goal: 'Set two edges and press **Double v** to see it. **Back it** (Bram will shake it) or **Challenge it** (a case where the length does not double).',
  view: '3d',
  async setup(p) {
    await p.g.stage.view3D({ target: [1.2, 1, 0.8], distance: 21, azimuth: -55, elevation: 24, ms: 0 });
    p.grid({ base: 0.1, main: 0.16, axis: 0.4 });
    const n1 = new Arrow([0, 0, 0], [0, 0, 1], { color: C.result, label: '$\\mathbf v\\times\\mathbf w$ (½ size)' });
    const n2 = new Arrow([0, 0, 0], [0, 0, 2], { color: C.result, opacity: 0, width: 0.04, label: '$(2\\mathbf v)\\times\\mathbf w$ (½ size)' });
    const v2 = new Arrow([0, 0, 0], [1, 0, 0], { color: C.v, opacity: 0, width: 0.035, label: '$2\\mathbf v$' });
    n2.setOpacity(0); v2.setOpacity(0);
    const par2 = new Parallelogram(p.g.stage, [1, 0, 0], [0, 1, 0], { color: FROST, opacity: 0, edge: 1.1 });
    par2.setOpacity(0, 0);
    p.add(n1, n2, v2, par2);
    const r = p.readout('Lengths');
    const g1 = new Gauge('$\\|\\mathbf v\\times\\mathbf w\\|$', { max: 40 });
    const g2 = new Gauge('$\\|(2\\mathbf v)\\times\\mathbf w\\|$', { max: 40 });
    addGauges(r, g1, g2);
    const upd = () => {
      const a = v3(cross(e.st.v, e.st.w)), b = v3(cross(e.st.v.map((x) => 2 * x), e.st.w));
      n1.set([0, 0, 0], v3(a.map((x) => x / 2))); n2.set([0, 0, 0], v3(b.map((x) => x / 2)));
      v2.set([0, 0, 0], v3(e.st.v.map((x) => 2 * x)));
      par2.set(v3(e.st.v.map((x) => 2 * x)), e.st.w);
      g1.set(norm(a)); g2.set(norm(b));
      r.row('ratio', 'second ÷ first', norm(a) > 1e-9 ? nice(Math.round((norm(b) / norm(a)) * 1000) / 1000) : 'both 0');
    };
    const e = edges(p, [2, 0, 0], [1, 2, 0], () => upd());
    const play = async () => {
      upd();
      await animate(600, (k) => { n2.setOpacity(0.6 * k); v2.setOpacity(0.6 * k); par2.setOpacity(0.12 * k, 0.6 * k); }, ease.out);
    };
    p.dock().append(button('Double v', () => void play(), { cls: 'small primary' }));
    upd();
    return {
      holds: () => doubleDoubles(e.st.v, e.st.w),
      describe: () => `v = ${fmt(e.st.v)}, w = ${fmt(e.st.w)}: |v × w| = ${nice(Math.round(norm(cross(e.st.v, e.st.w)) * 100) / 100)}, |2v × w| = ${nice(Math.round(norm(cross(e.st.v.map((x) => 2 * x), e.st.w)) * 100) / 100)}`,
      play,
      randomize(rr, edge) {
        const cases: [V3, V3][] = [[[1, 2, 0], [2, 4, 0]], [[0, 0, 0], [1, 2, 1]], [[2, 0, 0], [0, 2, 0]]];
        if (edge !== undefined) { e.set(...cases[edge]); return; }
        const rv = (): V3 => [rint(rr, -3, 3), rint(rr, -3, 3), rint(rr, 0, 2)];
        e.set(rv(), rv());
      },
      edgeCases: 3,
      async showMe() { e.set([2, 0, 0], [1, 2, 0]); await play(); },
    };
  },
};

// ------------------------------------------------------------------ the Law

export const law: LawDef<CrossCase> = {
  ...lawCore,
  frame: ['$\\cg{\\mathbf a} \\times \\cr{\\mathbf b}$ is perpendicular to ', { slot: 'perp' }, ', its length is ', { slot: 'len' }, ', and ', { slot: 'swap' }, '.'],
  slots: {
    perp: { options: [{ id: 'ab', text: 'a and b' }, { id: 'a', text: 'a only' }, { id: 'b', text: 'b only' }, { id: 'neither', text: 'neither of them' }] },
    len: { options: [{ id: 'area', text: 'the area of the parallelogram they make' }, { id: 'product', text: 'the product of their lengths' }] },
    swap: { options: [{ id: 'flips', text: 'swapping a and b flips it' }, { id: 'same', text: 'swapping a and b leaves it the same' }] },
  },
  cadetSlots: ['len', 'swap'],
  draw(g: Game, c: CrossCase) {
    const n = cross(c.a, c.b);
    const L = Math.max(norm(c.a), norm(c.b), Math.sqrt(norm(n)), 1.5);
    void g.stage.view3D({ target: [0, 0, L * 0.4], distance: 5.2 * L, azimuth: -60, elevation: 24, ms: 0, orbit: false });
    const par = new Parallelogram(g.stage, v3(c.a), v3(c.b), { color: FROST, opacity: 0.16, edge: 1.2 });
    const lab = new Label(`$\\mathbf a\\times\\mathbf b = ${fmt(n)}$, area ${nice(Math.round(parallelogramArea(c.a, c.b) * 100) / 100)}`, [0, 0, -0.9 * L], { color: C.white, size: 16 });
    const parts = [par, new Arrow([0, 0, 0], v3(c.a), { color: C.v, label: '$\\mathbf a$' }), new Arrow([0, 0, 0], v3(c.b), { color: C.w, label: '$\\mathbf b$' }), new Arrow([0, 0, 0], v3(n), { color: C.result }), lab];
    // clearing the world calls userData.dispose, which also removes the DOM labels
    for (const x of parts) { x.object.userData.dispose = () => x.dispose(); g.stage.world.add(x.object); }
  },
  reason: {
    ask: 'Your Law survived. **Why** is $\\mathbf a\\times\\mathbf b$ as long as the area, and not the product of the lengths?',
    options: [
      { id: 'a', text: '$\\|\\mathbf a\\times\\mathbf b\\|^2 = \\|\\mathbf a\\|^2\\|\\mathbf b\\|^2 - (\\mathbf a\\cdot\\mathbf b)^2 = \\|\\mathbf a\\|^2\\|\\mathbf b\\|^2\\sin^2\\theta$: base times height, squared.', right: true, why: 'Yes. The length is $\\|\\mathbf a\\|\\|\\mathbf b\\|\\sin\\theta$, which is the base $\\|\\mathbf a\\|$ times the height $\\|\\mathbf b\\|\\sin\\theta$. It equals the product of the lengths only at a right angle.' },
      { id: 'b', text: 'It is the product of the lengths, rounded down by the angle.', right: false, why: 'Nothing is rounded. The angle enters as $\\sin\\theta$: at 0° the length is exactly 0, at 90° it is the full product.' },
      { id: 'c', text: 'Because the arrow stands at a right angle to the panel.', right: false, why: 'That fixes its line, not its length. Every multiple of $\\mathbf a\\times\\mathbf b$ stands at a right angle too; only $\\mathbf a\\times\\mathbf b$ and its flip are as long as the area.' },
    ],
  },
};

export const compare: CompareDef = {
  id: 'c05',
  page: 'The **cross product** of two arrows in 3-D is an arrow $\\mathbf a\\times\\mathbf b$ at a right angle to both, so it points straight out of the panel they make. Any such arrow is a **normal vector** of the panel.\n\nIts length is the area of the parallelogram on $\\mathbf a$ and $\\mathbf b$: $\\|\\mathbf a\\times\\mathbf b\\| = \\|\\mathbf a\\|\\|\\mathbf b\\|\\sin\\theta$. A triangle is half of it.\n\nThe **right-hand rule** fixes which of the two directions: curl the fingers from $\\mathbf a$ to $\\mathbf b$; the thumb points along $\\mathbf a\\times\\mathbf b$. Swap the order and it flips: $\\mathbf b\\times\\mathbf a = -\\mathbf a\\times\\mathbf b$.\n\nTwo arrows on one line make a panel with no width, so $\\mathbf v\\times\\mathbf v = \\mathbf 0$.',
  formula: '\\cg{\\mathbf a}\\times\\cr{\\mathbf b} = (a_2b_3 - a_3b_2,\\ a_3b_1 - a_1b_3,\\ a_1b_2 - a_2b_1)',
  keyIdeas: [
    'Did you say it is an arrow at a right angle to both edges?',
    'Did you say its length is the area, so parallel edges give zero?',
    'Did you say the order matters: swapping flips it?',
  ],
};
