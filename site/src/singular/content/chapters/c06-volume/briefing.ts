// Chapter 6 Briefing (GDD §6.4 Ch 6): Say it, two Doubts (one false, one true), the Law, Ilse's page.
// swapDoubt() is reused by the Act II Review in Chapter 7.
import type { CompareDef, DoubtDef, Game, LawDef, SayItDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Label } from '../../../gfx/label';
import { Parallelepiped } from '../../../gfx/shapes';
import { C } from '../../../core/theme';
import { animate, ease } from '../../../core/tween';
import { VectorHandle } from '../../../kit/handle';
import { rint } from '../../../game/lawcheck';
import { StrutBox } from './crystal';
import { besidePanel } from './stage';
import { P1_U0, P1_V, P1_W0, boxVol, fmt, lawCore, leanLoses, num, swapFlips, triple, type CopCase } from './logic';

const v3 = (v: readonly number[]): V3 => [v[0], v[1], v[2] ?? 0];
const BLUE = C.u;

export const sayit: SayItDef = {
  id: 'c06', who: 'bram',
  ask: 'Why does a zero triple product mean one arrow is a combination of the other two?',
  frames: {
    see: 'The box on ___, ___ and ___ has base area ___ and height ___.',
    means: 'Zero volume means the height is ___ or the base has no ___, so the three arrows lie in one ___, so one of them is built from ___.',
    called: 'Base area times height, with a sign, is called the ___.',
    cue: 'When asked whether four points lie on one plane, think ___.',
  },
  wordBank: ['strut', 'base', 'height', 'area', 'shadow', 'flat', 'plane', 'zero', 'combination', 'scalar triple product', 'coplanar', 'edge arrows'],
};

// ------------------------------------------------------------------ (F) Lean the third strut over and you lose volume

export const doubtLean: DoubtDef = {
  id: 'c06-d-lean', who: 'bram', isTrue: false,
  claim: 'Lean the third strut over and you lose volume.',
  reason: 'Volume is base area times height. Leaning the strut while its tip stays at the same height keeps the height, so the box keeps its volume: tipped to $(2, 1, 4)$ it still holds 24. Only lowering the tip loses volume.',
  goal: 'The upright box holds **24**. Drag the **blue** strut (**Shift**-drag for height). Then **Challenge it** (a leaned strut that keeps its volume) or **Back it** (Bram will shake it).',
  view: '3d',
  async setup(p) {
    await p.g.stage.view3D({ target: [1, 1.3, 3.0], distance: 21, azimuth: -60, elevation: 21, ms: 0 });
    p.grid({ base: 0.08, main: 0.14, axis: 0.3 });
    const v = v3(P1_V), w = v3(P1_W0);
    let u: V3 = v3(P1_U0);
    p.add(new Arrow([0, 0, 0], v, { color: C.v, label: '$\\mathbf v$' }), new Arrow([0, 0, 0], w, { color: C.w, label: '$\\mathbf w$' }));
    p.add(new Arrow([0, 0, 0], v3(P1_U0), { color: BLUE, opacity: 0.3, width: 0.025 }));
    const box = new StrutBox(p, v, w, u, { numbers: p.difficulty === 'cadet' });
    const r = p.readout('Strut box');
    const show = () => {
      box.set(v, w, u);
      const leaned = Math.hypot(u[0], u[1]) > 1e-9;
      r.row('up', 'upright', '24');
      r.row('now', 'now', num(boxVol(u, v, w)), C.result);
      r.row('lean', 'leaned', leaned ? 'yes' : 'no');
    };
    const hu = new VectorHandle(p, { to: u, color: BLUE, label: '$\\mathbf u$', limit: 5, countMoves: false, onChange: (t) => { u = t; show(); } });
    show();
    const set = (t: V3) => { hu.set(t, [0, 0, 0]); u = t; show(); };
    const edges: V3[] = [[2, 1, 4], [-1, 2, 4], [1, 1, 5]];
    return {
      holds: () => leanLoses(u),
      describe: () => `the strut tipped to ${fmt(u)}: ${Math.hypot(u[0], u[1]) > 1e-9 ? 'leaned' : 'upright'}, volume ${num(boxVol(u, v, w))} (upright: 24)`,
      randomize(rr, edge) {
        if (edge !== undefined) { set(edges[edge]); return; }
        let t: V3;
        do { t = [rint(rr, -2, 2), rint(rr, -2, 2), rint(rr, 2, 5)]; } while (t[0] === 0 && t[1] === 0);
        set(t);
      },
      edgeCases: edges.length,
      async showMe(stance) { await hu.moveTo(stance === 'challenge' ? [2, 1, 4] : [2, 0, 3], 700, [0, 0, 0]); u = hu.vec; show(); },
    };
  },
};

// ------------------------------------------------------------------ (T) Swapping two struts flips the sign of the volume

/** A Doubt scene: three struts; the volume in their order and with the first two swapped. */
export function swapDoubt(id: string, claim: string): DoubtDef {
  return {
    id, who: 'bram', isTrue: true, claim,
    reason: '$\\mathbf b\\cdot(\\mathbf a\\times\\mathbf c)$ is a turn of $\\mathbf a\\cdot(\\mathbf c\\times\\mathbf b)$, and turning the order round keeps the number. And $\\mathbf c\\times\\mathbf b = -\\,\\mathbf b\\times\\mathbf c$, so the swapped order reads minus $\\mathbf a\\cdot(\\mathbf b\\times\\mathbf c)$. The box is the same box; only the sign, its orientation, changes. A flat box reads 0 either way.',
    goal: 'Drag the struts. Compare $\\cg{\\mathbf a}\\cdot(\\cr{\\mathbf b}\\times\\cb{\\mathbf c})$ with the swapped order $\\cr{\\mathbf b}\\cdot(\\cg{\\mathbf a}\\times\\cb{\\mathbf c})$. **Back it** (Bram will shake it) or **Challenge it**.',
    view: '3d',
    async setup(p) {
      await p.g.stage.view3D({ target: [0.9, 1, 2.6], distance: 20, azimuth: -58, elevation: 22, ms: 0 });
      p.grid({ base: 0.08, main: 0.14, axis: 0.3 });
      let a: V3 = [2, 0, 0], b: V3 = [1, 3, 0], c: V3 = [1, 1, 4];
      const box = new StrutBox(p, b, c, a);
      const r = p.readout('Two orders');
      const show = () => {
        box.set(b, c, a);
        const x = triple(a, b, c), y = triple(b, a, c);
        r.row('o', '$\\mathbf a\\cdot(\\mathbf b\\times\\mathbf c)$', num(x), x < -1e-9 ? C.orange : C.result);
        r.row('s', '$\\mathbf b\\cdot(\\mathbf a\\times\\mathbf c)$', num(y), y < -1e-9 ? C.orange : C.result);
      };
      const ha = new VectorHandle(p, { to: a, color: C.v, label: '$\\mathbf a$', limit: 4, countMoves: false, onChange: (t) => { a = t; show(); } });
      const hb = new VectorHandle(p, { to: b, color: C.w, label: '$\\mathbf b$', limit: 4, countMoves: false, onChange: (t) => { b = t; show(); } });
      const hc = new VectorHandle(p, { to: c, color: BLUE, label: '$\\mathbf c$', limit: 4, countMoves: false, onChange: (t) => { c = t; show(); } });
      show();
      const setAll = (x: V3, y: V3, z: V3) => { ha.set(x, [0, 0, 0]); hb.set(y, [0, 0, 0]); hc.set(z, [0, 0, 0]); a = x; b = y; c = z; show(); };
      const edges: [V3, V3, V3][] = [[[1, 0, 0], [0, 1, 0], [1, 1, 0]], [[1, 2, 0], [2, 4, 0], [0, 1, 3]], [[0, 0, 0], [1, 2, 3], [3, 1, 2]]];
      return {
        holds: () => swapFlips(a, b, c),
        describe: () => `a = ${fmt(a)}, b = ${fmt(b)}, c = ${fmt(c)}: a · (b × c) = ${num(triple(a, b, c))}, b · (a × c) = ${num(triple(b, a, c))}`,
        async play() {
          // the box turns inside out and back: the same box, the other sign
          await animate(320, (k) => { const s = Math.abs(Math.cos(k * Math.PI)); box.box.set(b, c, [a[0] * s, a[1] * s, a[2] * s]); box.box.setColor(k > 0.5 ? (triple(b, a, c) < 0 ? C.orange : C.result) : (triple(a, b, c) < 0 ? C.orange : C.result)); }, ease.inOut);
          show();
        },
        randomize(rr, edge) {
          if (edge !== undefined) { setAll(...edges[edge]); return; }
          const rv = (): V3 => [rint(rr, -3, 3), rint(rr, -3, 3), rint(rr, -1, 4)];
          setAll(rv(), rv(), rv());
        },
        edgeCases: edges.length,
        async showMe() { setAll([2, 0, 0], [1, 3, 0], [1, 1, 4]); },
      };
    },
  };
}

export const doubtSwap = swapDoubt('c06-d-swap', 'Swapping two struts flips the sign of the volume.');

// ------------------------------------------------------------------ the Law

export const law: LawDef<CopCase> = {
  ...lawCore,
  frame: ['Three arrows $\\cb{\\mathbf u}$, $\\cg{\\mathbf v}$, $\\cr{\\mathbf w}$ are **coplanar** exactly when ', { slot: 'cond' }, '.'],
  slots: {
    cond: { options: [
      { id: 'zero', text: 'u · (v × w) is zero' },
      { id: 'parallel', text: 'two of them are parallel' },
      { id: 'zerovec', text: 'one of them is the zero vector' },
      { id: 'cross', text: 'v × w is the zero vector' },
      { id: 'positive', text: 'u · (v × w) is positive' },
    ] },
  },
  cadetSlots: ['cond'],
  draw(g: Game, c: CopCase) {
    const L = Math.max(2, ...[c.u, c.v, c.w].map((x) => Math.hypot(x[0], x[1], x[2])));
    const mid = [0, 1, 2].map((i) => (c.u[i] + c.v[i] + c.w[i]) / 2);
    void g.stage.view3D({ target: besidePanel(g, mid, 7.5 * L, -58), distance: 7.5 * L, azimuth: -58, elevation: 24, ms: 0, orbit: false });
    const t = triple(c.u, c.v, c.w);
    const box = new Parallelepiped(g.stage, v3(c.v), v3(c.w), v3(c.u), { color: t < -1e-9 ? C.orange : C.result, opacity: 0.16 });
    const lab = new Label(`$\\mathbf u\\cdot(\\mathbf v\\times\\mathbf w) = ${num(t).replace('−', '-')}$`, [0, 0, -0.6 * L], { color: C.white, size: 18 });
    // labels go in at the top level: a label nested in an arrow would outlive the arrow when the world is cleared
    const tag = (s: string, at: readonly number[], color: string) => new Label(s, [at[0] * 1.12, at[1] * 1.12, at[2] * 1.12 + 0.2], { color, size: 17 }).object;
    g.stage.world.add(box.object, new Arrow([0, 0, 0], v3(c.v), { color: C.v }).object, new Arrow([0, 0, 0], v3(c.w), { color: C.w }).object,
      new Arrow([0, 0, 0], v3(c.u), { color: BLUE }).object, lab.object, tag('v', c.v, C.v), tag('w', c.w, C.w), tag('u', c.u, BLUE));
  },
  reason: {
    ask: 'Your Law survived. **Why** does a zero scalar triple product mean the three arrows lie in one plane?',
    options: [
      { id: 'a', text: '$\\mathbf u\\cdot(\\mathbf v\\times\\mathbf w)$ is base area times height. It is zero exactly when the height is zero ($\\mathbf u$ lies in the base plane) or the base has no area ($\\mathbf v$, $\\mathbf w$ on one line). Either way all three lie in one plane.', right: true, why: 'Yes. Zero volume means the box is flat, and a flat box is three arrows in one plane: one of them is built from the other two.' },
      { id: 'b', text: 'Because $\\mathbf v\\times\\mathbf w$ is then the zero vector.', right: false, why: '$\\mathbf v\\times\\mathbf w$ can be long while the product is zero. Section C had $\\mathbf a\\times\\mathbf b = (2, -4, 2)$ and the third strut in the plane: height 0.' },
      { id: 'c', text: 'Because three arrows in 3-D always lie in one plane.', right: false, why: '$(1, 0, 0)$, $(0, 1, 0)$ and $(0, 0, 1)$ make a cube that holds 1. Most sets of three arrows enclose space.' },
    ],
  },
};

export const compare: CompareDef = {
  id: 'c06',
  page: 'Three arrows from one corner build a slanted box, a **parallelepiped**. Its base is the parallelogram of $\\mathbf v$ and $\\mathbf w$, with area $\\|\\mathbf v\\times\\mathbf w\\|$. Its height is the shadow of $\\mathbf u$ on the unit arrow straight out of the base.\n\nBase area times height is $\\mathbf u\\cdot(\\mathbf v\\times\\mathbf w)$, the **scalar triple product**. Its sign is the box\'s **orientation**: which way round the arrows are listed. The space inside is its absolute value; a tetrahedron on the same three edges holds one sixth.\n\nIt is **zero exactly when the box is flat**: the three arrows are **coplanar**, and one of them is a combination of the other two. To test four points, use the three edge arrows from one of them.',
  formula: '\\mathbf u\\cdot(\\mathbf v\\times\\mathbf w) = \\|\\mathbf v\\times\\mathbf w\\|\\,\\big(\\mathbf u\\cdot\\mathbf n\\big) = \\text{base area}\\times\\text{height}',
  keyIdeas: [
    'Did you say the volume is base area times height?',
    'Did you say what zero means: flat, so one arrow is built from the other two?',
    'Did you say what a negative sign means?',
  ],
};

