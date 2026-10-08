// Chapter 4 Briefing (GDD §6.4 Ch 4): Say it, two Doubts (one false, one true), the Law, Ilse's page.
import type { CompareDef, DoubtDef, Game, LawDef, SayItDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Label } from '../../../gfx/label';
import { Slider } from '../../../ui/widgets';
import { C } from '../../../core/theme';
import { nice } from '../../../math/frac';
import { dot, norm, type Vec } from '../../../math/la';
import { animate, ease, wait } from '../../../core/tween';
import { VectorHandle } from '../../../kit/handle';
import { AngleArc, Shadow } from '../../../kit/geom';
import { rint } from '../../../game/lawcheck';
import { Gauge, addGauges, chime } from './meter';
import { fmt, lawCore, turn2, turnKeepsReading, zeroMeansGone, type DotCase } from './logic';

const v3 = (v: readonly number[]): V3 => [v[0], v[1], v[2] ?? 0];

export const sayit: SayItDef = {
  id: 'c04', who: 'bram',
  ask: 'Why does $\\mathbf v \\cdot \\mathbf w$ change sign at 90°?',
  frames: {
    see: 'The shadow of ___ on the line of ___ shrinks to a point at ___, then points ___.',
    means: 'The dot product is the shadow\'s length times ___, so its sign is the sign of ___.',
    called: 'Multiplying matching parts and adding is called the ___.',
    cue: 'When you see "how aligned" or "at a right angle?", think ___.',
  },
  wordBank: ['shadow', 'signal line', 'dish arrow', 'right angle', '90°', 'backwards', 'length', 'cos θ', 'dot product', 'orthogonal'],
};

// ------------------------------------------------------------------ (F) A reading of zero means the signal's gone

export const doubtZero: DoubtDef = {
  id: 'c04-d-zero', who: 'bram', isTrue: false,
  claim: 'A reading of zero means the signal\'s gone.',
  reason: 'A zero reading does not need the signal gone. A dish arrow at a right angle reads 0, and so does a zero dish arrow. The signal can be as strong as you like: $(2, 4)\\cdot(2, -1) = 4 - 4 = 0$.',
  goal: 'Set a signal $\\mathbf s$ and a dish arrow $\\mathbf d$. **Challenge it** (a zero reading with the signal still there) or **Back it** (Bram will shake it).',
  view: '2d',
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [0.6, 1.9], height: 10.5, ms: 0 });
    const r = p.readout('Dish meter');
    const gauge = new Gauge('reading $\\mathbf d\\cdot\\mathbf s$', { max: 25 });
    addGauges(r, gauge);
    let s: V3 = [2, 4, 0], d: V3 = [3, 1, 0];
    const sh = new Shadow(p, { onto: s, of: d });
    const upd = () => {
      sh.set(d, s);
      r.row('s', 'signal $\\mathbf s$', fmt(s.slice(0, 2)), C.w);
      r.row('d', 'dish $\\mathbf d$', fmt(d.slice(0, 2)), C.v);
      r.row('sl', 'signal strength $\\|\\mathbf s\\|$', norm(s) > 1e-9 ? norm(s).toFixed(2) : '0 (gone)');
      if (gauge.set(dot(s, d)) && norm(s) > 1e-9 && norm(d) > 1e-9) chime();
    };
    const hs = new VectorHandle(p, { to: s, color: C.w, label: '$\\mathbf s$', snap: p.snap() ?? 0.5, limit: 4.5, countMoves: false, onChange: (t) => { s = t; upd(); } });
    const hd = new VectorHandle(p, { to: d, color: C.v, label: '$\\mathbf d$', snap: p.snap() ?? 0.5, limit: 4.5, countMoves: false, onChange: (t) => { d = t; upd(); } });
    upd();
    const setBoth = (sv: V3, dv: V3) => { hs.set(sv, [0, 0, 0]); hd.set(dv, [0, 0, 0]); };
    return {
      holds: () => zeroMeansGone(d, s),
      describe: () => `signal ${fmt(s.slice(0, 2))}, dish ${fmt(d.slice(0, 2))}: reading ${nice(dot(s, d))}${Math.abs(dot(s, d)) < 1e-9 && norm(s) > 1e-9 ? ', and the signal is still there' : ''}`,
      async play() { await sh.to(d, s, 250); },
      randomize(rr, edge) {
        const edges: [V3, V3][] = [[[2, 4, 0], [2, -1, 0]], [[3, 0, 0], [0, -2, 0]]];
        if (edge !== undefined) { setBoth(...edges[edge]); return; }
        let sv: V3;
        do { sv = [rint(rr, -4, 4), rint(rr, -4, 4), 0]; } while (sv[0] === 0 && sv[1] === 0);
        let dv: V3;
        if (rr() < 0.5) { const k = rint(rr, 1, 2) * (rr() < 0.5 ? -1 : 1); dv = [-sv[1] * k, sv[0] * k, 0]; if (Math.max(Math.abs(dv[0]), Math.abs(dv[1])) > 4) dv = [-sv[1], sv[0], 0]; }
        else dv = [rint(rr, -4, 4), rint(rr, -4, 4), 0];
        setBoth(sv, dv);
      },
      edgeCases: 2,
      async showMe(stance) {
        hs.set([2, 4, 0], [0, 0, 0]);
        await hd.moveTo(stance === 'challenge' ? [2, -1, 0] : [3, 1, 0], 700, [0, 0, 0]);
      },
    };
  },
};

// ------------------------------------------------------------------ (T) Turn both arrows together and the reading does not change

export const doubtTurn: DoubtDef = {
  id: 'c04-d-turn', who: 'bram', isTrue: true,
  claim: 'Turn both arrows together and the reading does not change.',
  reason: 'Turning both arrows together keeps both lengths and the angle between them. The reading is $\\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta$, so it cannot change.',
  goal: 'Set $\\mathbf v$, $\\mathbf w$ and how far to turn them together. **Back it** (Bram will shake it) or **Challenge it** (find a turn that changes the reading).',
  view: '2d',
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [0, 0.9], height: 10.5, ms: 0 });
    let v: V3 = [3, 1, 0], w: V3 = [1, 2, 0], phi = 90;
    const tv = new Arrow([0, 0, 0], [1, 0, 0], { color: C.v, width: 0.04, opacity: 0.6, label: "$\\mathbf v'$" });
    const tw = new Arrow([0, 0, 0], [1, 0, 0], { color: C.w, width: 0.04, opacity: 0.6, label: "$\\mathbf w'$" });
    p.add(tv, tw);
    const arc0 = new AngleArc(p, [0, 0, 0], v, w, { radius: 0.5, opacity: 0.6 });
    const arc1 = new AngleArc(p, [0, 0, 0], v, w, { radius: 0.5, opacity: 0.6 });
    const r = p.readout('Before and after the turn');
    const g0 = new Gauge('before: $\\mathbf v\\cdot\\mathbf w$', { max: 20 });
    const g1 = new Gauge("after: $\\mathbf v'\\cdot\\mathbf w'$", { max: 20 });
    addGauges(r, g0, g1);
    let shown = phi;
    const draw = (ph: number) => {
      shown = ph;
      const a = v3(turn2(v, ph)), b = v3(turn2(w, ph));
      tv.set([0, 0, 0.01], a); tw.set([0, 0, 0.01], b);
      arc0.set(v, w); arc1.set(a, b);
      g0.set(dot(v, w)); g1.set(dot(a, b));
      r.row('phi', 'turned by', `${Math.round(ph)}°`);
    };
    const slider = new Slider({ label: 'turn both by', min: -180, max: 180, step: 5, value: phi, format: (x) => `${Math.round(x)}°`, onInput: (x) => { phi = x; draw(phi); } });
    p.dock().append(slider.el);
    const hv = new VectorHandle(p, { to: v, color: C.v, label: '$\\mathbf v$', snap: p.snap() ?? 0.5, limit: 4, countMoves: false, onChange: (t) => { v = t; draw(shown); } });
    const hw = new VectorHandle(p, { to: w, color: C.w, label: '$\\mathbf w$', snap: p.snap() ?? 0.5, limit: 4, countMoves: false, onChange: (t) => { w = t; draw(shown); } });
    draw(phi);
    const set = (vv: V3, ww: V3, ph: number) => { phi = ph; slider.set(ph, false); hv.set(vv, [0, 0, 0]); hw.set(ww, [0, 0, 0]); draw(0); };
    return {
      holds: () => turnKeepsReading(v, w, phi),
      describe: () => `v = ${fmt(v.slice(0, 2))}, w = ${fmt(w.slice(0, 2))}, turned ${Math.round(phi)}°: reading ${nice(dot(v, w))} before, ${nice(Math.round(dot(turn2(v, phi), turn2(w, phi)) * 1e6) / 1e6)} after`,
      async play() { await animate(450, (k) => draw(phi * k), ease.inOut); draw(phi); },
      randomize(rr, edge) {
        const edges: [V3, V3, number][] = [[[2, 1, 0], [0, 0, 0], 90], [[2, 1, 0], [-4, -2, 0], 180], [[1, 2, 0], [-2, 1, 0], 45]];
        if (edge !== undefined) { set(...edges[edge]); return; }
        set([rint(rr, -4, 4), rint(rr, -4, 4), 0], [rint(rr, -4, 4), rint(rr, -4, 4), 0], rint(rr, -35, 35) * 5);
      },
      edgeCases: 3,
      async showMe() { set([3, 1, 0], [1, 2, 0], 90); await wait(200); },
    };
  },
};

// ------------------------------------------------------------------ the Law

export const law: LawDef<DotCase> = {
  ...lawCore,
  frame: ['$\\cg{\\mathbf v} \\cdot \\cr{\\mathbf w}$ is ', { slot: 'sign' }, ' exactly when ', { slot: 'angle' }, ' ', { slot: 'extra' }, '.'],
  slots: {
    sign: { options: [{ id: 'zero', text: 'zero' }, { id: 'positive', text: 'positive' }, { id: 'negative', text: 'negative' }] },
    angle: { options: [
      { id: 'right', text: 'the angle between them is 90°' },
      { id: 'acute', text: 'the angle between them is under 90°' },
      { id: 'obtuse', text: 'the angle between them is over 90°' },
      { id: 'equal', text: 'the two arrows have the same length' },
    ] },
    extra: { options: [{ id: 'none', text: '(and in no other case)' }, { id: 'orzero', text: 'or one of them is the zero vector' }] },
  },
  cadetSlots: ['angle', 'extra'],
  draw(g: Game, c: DotCase) {
    const v = v3(c.v), w = v3(c.w);
    const L = Math.max(norm(c.v), norm(c.w), 1);
    if (c.v.length === 3) void g.stage.view3D({ target: [0, 0, 1], distance: 4.2 * L, azimuth: -60, elevation: 24, ms: 0, orbit: false });
    else void g.stage.view2D({ center: [0, 0], height: 2.8 * L, ms: 0 });
    const lab = new Label(`$\\mathbf v\\cdot\\mathbf w = ${nice(dot(c.v as Vec, c.w as Vec))}$`, [0, -0.9 * L, 0], { color: C.white, size: 18 });
    const parts = [new Arrow([0, 0, 0], v, { color: C.v, label: '$\\mathbf v$' }), new Arrow([0, 0, 0], w, { color: C.w, label: '$\\mathbf w$' }), lab];
    // clearing the world calls userData.dispose, which also removes the DOM labels
    for (const x of parts) { x.object.userData.dispose = () => x.dispose(); g.stage.world.add(x.object); }
  },
  reason: {
    ask: 'Your Law survived. **Why** is the reading zero exactly at 90°, and why does it change sign there?',
    options: [
      { id: 'a', text: '$\\mathbf v\\cdot\\mathbf w = \\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta$. Lengths are never negative, so the sign is the sign of $\\cos\\theta$: positive under 90°, zero at 90°, negative over. A zero vector makes the product zero.', right: true, why: 'Yes. The law of cosines gave $\\mathbf v\\cdot\\mathbf w = \\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta$, and $\\cos\\theta$ changes sign at 90°.' },
      { id: 'b', text: 'At 90° the two arrows share no parts.', right: false, why: '$(2, 4)$ and $(2, -1)$ share the first part, 2, and still read 0. It is the sum $4 - 4$ that cancels.' },
      { id: 'c', text: 'The dot product is an arrow, and at 90° it shrinks to nothing.', right: false, why: 'The dot product is one number, not an arrow. Its sign comes from the cosine of the angle.' },
    ],
  },
};

export const compare: CompareDef = {
  id: 'c04',
  page: 'The **dot product** multiplies matching parts and adds: $\\mathbf v\\cdot\\mathbf w = v_1w_1 + v_2w_2 + v_3w_3$. It is **one number**.\n\nIt measures how much the arrows point the same way: the length of the shadow of $\\mathbf v$ on the line of $\\mathbf w$, times the length of $\\mathbf w$. Expanding $\\|\\mathbf v - \\mathbf w\\|^2$ and comparing it with the law of cosines gives $\\mathbf v\\cdot\\mathbf w = \\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta$.\n\nLengths are never negative, so the sign is the sign of $\\cos\\theta$: positive under 90°, **zero exactly at 90°** (or when one arrow is the zero vector), negative over 90°. Two arrows with dot product 0 are **orthogonal**.\n\nThe shadow of $\\mathbf v$ on the line through $\\mathbf u$ is $\\dfrac{\\mathbf v\\cdot\\mathbf u}{\\mathbf u\\cdot\\mathbf u}\\,\\mathbf u$.',
  formula: '\\cg{\\mathbf v}\\cdot\\cr{\\mathbf w} = v_1w_1 + v_2w_2 + v_3w_3 = \\|\\cg{\\mathbf v}\\|\\,\\|\\cr{\\mathbf w}\\|\\cos\\theta',
  keyIdeas: [
    'Did you say the dot product is one number, not an arrow?',
    'Did you say it is zero exactly at a right angle (or for a zero vector), and why the sign flips there?',
    'Did you say where the cosine comes from (the law of cosines)?',
  ],
};
