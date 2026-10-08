// Epilogue: Ilse's six questions (GDD §4.8). Each is a claim the player settles by building a case:
// three true, three false, played in mixed order by the review engine.
import type { DoubtDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { InfLine, Parallelogram } from '../../../gfx/shapes';
import { Slider } from '../../../ui/widgets';
import { C } from '../../../core/theme';
import { nice } from '../../../math/frac';
import { det, type Mat, type Vec } from '../../../math/la';
import { VectorHandle } from '../../../kit/handle';
import { Knob, RightAngle } from '../../../kit/geom';
import { rint } from '../../../game/lawcheck';
import * as L from './logic';

const fmt = (v: number[]) => `(${nice(v[0])}, ${nice(v[1])})`;
const v3 = (v: number[]): V3 => [v[0], v[1], 0];
const cols = (a: number[], b: number[]): Mat => [[a[0], b[0]], [a[1], b[1]]];

// ------------------------------------------------------------------ Q1 (F)

export const q1: DoubtDef = {
  id: 'c27-q1', who: 'ilse', isTrue: false,
  claim: 'A move that squashes area to zero can still be undone, if you are clever about it.',
  reason: 'If the area goes to zero, the plane is flattened onto a line (or a point). Then some start other than the origin lands on the origin, exactly where the origin lands. Two starts, one landing: no undo can know which one to send it back to. That is why a zero determinant means no inverse.',
  goal: 'Drag the two column arrows. **Back it** or **Challenge it**.',
  view: '2d',
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [1, 1], height: 10, ms: 0 });
    // a singular move must be exact (|det| ≤ 1e-9): snap even on Commander, as in Ch 13 and Ch 14
    const a = new VectorHandle(p, { to: [2, 0, 0], color: C.v, label: '$A\\mathbf e_1$', snap: p.snap() ?? 0.5, limit: 4, countMoves: false });
    const b = new VectorHandle(p, { to: [1, 2, 0], color: C.w, label: '$A\\mathbf e_2$', snap: p.snap() ?? 0.5, limit: 4, countMoves: false });
    const par = new Parallelogram(p.g.stage, [2, 0, 0], [1, 2, 0], { color: C.result, opacity: 0.16 });
    const lost = new Arrow([0, 0, 0], [1, 0, 0], { color: C.violet, label: 'lands on 0', width: 0.04 });
    p.add(par, lost);
    const r = p.readout('The move');
    const upd = () => {
      const M = cols(a.vec, b.vec);
      par.set(v3(a.vec), v3(b.vec));
      const n = L.lostStart(M);
      lost.object.visible = !!n;
      if (n) { const k = 2 / Math.hypot(...n); lost.setTo([n[0] * k, n[1] * k, 0]); }
      r.row('d', 'area factor (det)', nice(det(M)), Math.abs(det(M)) < 1e-9 ? C.violet : C.result);
    };
    p.tick(upd);
    return {
      holds: () => L.q1Holds(cols(a.vec, b.vec)),
      describe: () => {
        const M = cols(a.vec, b.vec), n = L.lostStart(M);
        return n ? `columns ${fmt(a.vec)} and ${fmt(b.vec)}: det 0, and the start ${fmt(n)} lands on the origin, exactly where the origin lands` : `columns ${fmt(a.vec)} and ${fmt(b.vec)}: det ${nice(det(M))}, so this move can be undone`;
      },
      randomize(rr, edge) {
        const E: [number[], number[]][] = [[[1, 2], [2, 4]], [[0, 0], [1, 3]]];
        if (edge !== undefined) { a.set(v3(E[edge][0]), [0, 0, 0]); b.set(v3(E[edge][1]), [0, 0, 0]); return; }
        a.set([rint(rr, -3, 3), rint(rr, -3, 3), 0], [0, 0, 0]); b.set([rint(rr, -3, 3), rint(rr, -3, 3), 0], [0, 0, 0]);
      },
      edgeCases: 2,
      async showMe() { a.set([2, 1, 0], [0, 0, 0]); await b.moveTo([4, 2, 0], 500, [0, 0, 0]); },
    };
  },
};

// ------------------------------------------------------------------ Q2 (T)

export const q2: DoubtDef = {
  id: 'c27-q2', who: 'ilse', isTrue: true,
  claim: 'For a symmetric matrix you can always find two lines that do not turn, at right angles to each other.',
  reason: 'Take two such lines with different stretches λ and μ. For a symmetric S, (S x) · y = x · (S y), so λ (x · y) = μ (x · y). With λ ≠ μ that forces x · y = 0. When λ = μ every direction holds, and you can pick two at right angles.',
  goal: 'Set a symmetric matrix with the sliders. **Back it** (then it is shaken) or **Challenge it** with a symmetric matrix where no two lines that hold are at right angles.',
  view: '2d',
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [0, 0], height: 9, ms: 0 });
    let a = 2, b = 1, d = 2;
    const l1 = new InfLine(p.g.stage, [0, 0, 0], [1, 1, 0], { color: C.result, width: 2.2 });
    const l2 = new InfLine(p.g.stage, [0, 0, 0], [1, -1, 0], { color: C.u, width: 2.2 });
    p.add(l1.object, l2.object);
    p.onDispose(() => { l1.dispose(); l2.dispose(); });
    const mark = new RightAngle(p, [0, 0, 0], [1, 1, 0], [1, -1, 0], 0.4);
    const r = p.readout('S = [[a, b], [b, d]]');
    const upd = () => {
      const { values, dirs } = L.symEigenDirs(a, b, d);
      l1.set([0, 0, 0], v3(dirs[0])); l2.set([0, 0, 0], v3(dirs[1]));
      mark.set([0, 0, 0], v3(dirs[0]), v3(dirs[1]));
      const ang = (Math.acos(Math.min(1, Math.abs(dirs[0][0] * dirs[1][0] + dirs[0][1] * dirs[1][1]))) * 180) / Math.PI;
      r.row('s', 'S', `[[${nice(a)}, ${nice(b)}], [${nice(b)}, ${nice(d)}]]`);
      r.row('l', 'stretches', `${nice(+values[0].toFixed(3))} and ${nice(+values[1].toFixed(3))}`);
      r.row('g', 'angle between the lines', `${Math.round(ang)}°`, C.result);
    };
    const sl = (label: string, v: number, set: (x: number) => void) => new Slider({ label, min: -3, max: 3, step: 0.5, value: v, onInput: (x) => { set(x); upd(); } });
    const sa = sl('a', a, (x) => { a = x; }), sb = sl('b (both corners)', b, (x) => { b = x; }), sd = sl('d', d, (x) => { d = x; });
    p.dock().append(sa.el, sb.el, sd.el);
    upd();
    const setAll = (x: number, y: number, z: number) => { a = x; b = y; d = z; sa.set(x, false); sb.set(y, false); sd.set(z, false); upd(); };
    return {
      holds: () => L.q2Holds(a, b, d),
      describe: () => `S = [[${nice(a)}, ${nice(b)}], [${nice(b)}, ${nice(d)}]]: ${L.q2EqualStretch(a, b, d) ? 'stretches equal: every line holds; these two are one perpendicular pair' : 'the two lines meet at a right angle'}`,
      randomize(rr, edge) {
        const E = [[2, 0, 2], [3, 1, 3]];
        if (edge !== undefined) { setAll(E[edge][0], E[edge][1], E[edge][2]); return; }
        setAll(rint(rr, -6, 6) / 2, rint(rr, -6, 6) / 2, rint(rr, -6, 6) / 2);
      },
      edgeCases: 2,
      async showMe() { setAll(2, 1, 2); },
    };
  },
};

// ------------------------------------------------------------------ Q3 (T)

export const q3: DoubtDef = {
  id: 'c27-q3', who: 'ilse', isTrue: true,
  claim: 'The best fit leaves an error at right angles to the column. That is all least squares is: a shadow.',
  reason: 'Slide the point p along the column. Its distance to b is smallest exactly when the error b − p meets the column at a right angle (Pythagoras: any other p adds a second side). So the best fit is the shadow of b, and a · (b − p) = 0 is the normal equation.',
  goal: 'Drag the column **a** and the target **b**. **Back it** or **Challenge it** with a case where the error is not at right angles.',
  view: '2d',
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [1.5, 1.5], height: 9, ms: 0 });
    const a = new VectorHandle(p, { to: [3, 1, 0], color: C.v, label: '$\\mathbf a$', countMoves: false });
    const b = new VectorHandle(p, { to: [1, 3, 0], color: C.w, label: '$\\mathbf b$', countMoves: false });
    const line = new InfLine(p.g.stage, [0, 0, 0], [3, 1, 0], { color: '#7d8aa5', width: 1.2, opacity: 0.5, dashed: true });
    const pt = new Dot([0, 0, 0.05], { color: C.result, size: 0.11, label: 'best p' });
    const err = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.result, width: 2, dashed: true });
    p.add(line.object, pt, err.object);
    p.onDispose(() => { line.dispose(); err.dispose(); });
    const mark = new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 1, 0], 0.3);
    const r = p.readout('Best fit');
    const upd = () => {
      const { x, p: q, e } = L.bestFit(a.vec, b.vec);
      if (Math.hypot(a.vec[0], a.vec[1]) > 1e-9) line.set([0, 0, 0], v3(a.vec));
      pt.at([q[0], q[1], 0.05]);
      err.setPoints([v3(q), v3(b.vec)]);
      mark.set(v3(q), [-a.vec[0], -a.vec[1], 0], v3(e));
      r.row('x', 'best multiple x', nice(+x.toFixed(4)));
      r.row('e', 'a · (b − p)', nice(+(a.vec[0] * e[0] + a.vec[1] * e[1]).toFixed(6)), C.result);
    };
    p.tick(upd);
    return {
      holds: () => L.q3Holds(a.vec, b.vec),
      describe: () => { const { e } = L.bestFit(a.vec, b.vec); return `a = ${fmt(a.vec)}, b = ${fmt(b.vec)}: error ${fmt(e.map((x) => +x.toFixed(3)))}, at right angles to a`; },
      randomize(rr) {
        let av: V3; do { av = [rint(rr, -3, 3), rint(rr, -3, 3), 0]; } while (!av[0] && !av[1]);
        a.set(av, [0, 0, 0]); b.set([rint(rr, -3, 3), rint(rr, -3, 3), 0], [0, 0, 0]);
      },
      edgeCases: 0,
      async showMe() { a.set([3, 1, 0], [0, 0, 0]); await b.moveTo([1, 3, 0], 400, [0, 0, 0]); },
    };
  },
};

// ------------------------------------------------------------------ Q4 (T)

export const q4: DoubtDef = {
  id: 'c27-q4', who: 'ilse', isTrue: true,
  claim: 'Any matrix sends two particular right-angled arrows to two arrows that are still at right angles.',
  reason: 'Choose v₁ and v₂ as the eigenvectors of AᵀA (at right angles, because AᵀA is symmetric). Then (A v₁) · (A v₂) = v₁ · (AᵀA v₂) = σ₂² (v₁ · v₂) = 0. Those two arrows are the right singular vectors; A v₁ and A v₂ point along the left ones.',
  goal: 'Drag the columns of **A**. The faint arrows are v₁ and v₂; the bright ones are where A sends them. **Back it** or **Challenge it**.',
  view: '2d',
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [1, 1.5], height: 11, ms: 0 });
    const c1 = new VectorHandle(p, { to: [3, 4, 0], color: C.v, label: '$A\\mathbf e_1$', countMoves: false });
    const c2 = new VectorHandle(p, { to: [0, 5, 0], color: C.w, label: '$A\\mathbf e_2$', countMoves: false });
    const v1 = new Arrow([0, 0, 0], [1, 0, 0], { color: C.result, opacity: 0.45, width: 0.03, label: '$\\mathbf v_1$' });
    const v2 = new Arrow([0, 0, 0], [0, 1, 0], { color: C.u, opacity: 0.45, width: 0.03, label: '$\\mathbf v_2$' });
    const a1 = new Arrow([0, 0, 0], [1, 0, 0], { color: C.result, label: '$A\\mathbf v_1$' });
    const a2 = new Arrow([0, 0, 0], [0, 1, 0], { color: C.u, label: '$A\\mathbf v_2$' });
    p.add(v1, v2, a1, a2);
    const mark = new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 1, 0], 0.35);
    const r = p.readout('Where A sends them');
    const upd = () => {
      const A = cols(c1.vec, c2.vec);
      const { v, Av, s } = L.svdArrows(A);
      v1.setTo(v3(v[0])); v2.setTo(v3(v[1])); a1.setTo(v3(Av[0])); a2.setTo(v3(Av[1]));
      mark.set([0, 0, 0], v3(Av[0]), v3(Av[1]));
      r.row('s', 'stretches σ₁, σ₂', `${nice(+s[0].toFixed(3))}, ${nice(+s[1].toFixed(3))}`);
      r.row('d', '(A v₁) · (A v₂)', nice(+(Av[0][0] * Av[1][0] + Av[0][1] * Av[1][1]).toFixed(6)), C.result);
    };
    p.tick(upd);
    return {
      holds: () => L.q4Holds(cols(c1.vec, c2.vec)),
      describe: () => `A with columns ${fmt(c1.vec)} and ${fmt(c2.vec)}: A v₁ and A v₂ meet at a right angle`,
      randomize(rr, edge) {
        if (edge !== undefined) { c1.set([1, 2, 0], [0, 0, 0]); c2.set([2, 4, 0], [0, 0, 0]); return; }
        c1.set([rint(rr, -3, 3), rint(rr, -3, 3), 0], [0, 0, 0]); c2.set([rint(rr, -3, 3), rint(rr, -3, 3), 0], [0, 0, 0]);
      },
      edgeCases: 1,
      async showMe() { c1.set([3, 4, 0], [0, 0, 0]); await c2.moveTo([0, 5, 0], 400, [0, 0, 0]); },
    };
  },
};

// ------------------------------------------------------------------ Q5 (T)

export const q5: DoubtDef = {
  id: 'c27-q5', who: 'ilse', isTrue: true,
  claim: 'Every transition matrix has a stretch of exactly 1: some mix of states it leaves alone.',
  reason: 'Each column adds to 1, so the rows of Aᵀ each add to 1, and Aᵀ sends (1, 1) to itself. So 1 is an eigenvalue of Aᵀ, and A and Aᵀ have the same eigenvalues (same determinant of A − λI). The arrow A leaves alone is the steady state.',
  goal: 'Set the chances with the sliders (each column adds to 1). **Back it** or **Challenge it**.',
  view: '2d',
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [0.5, 0.5], height: 3.2, ms: 0 });
    let pp = 0.9, qq = 0.6;
    const s = new Arrow([0, 0, 0], [0.8, 0.2, 0], { color: C.result, label: 'steady $\\mathbf s$' });
    const As = new Arrow([0, 0, 0], [0.8, 0.2, 0], { color: C.result, opacity: 0.5, width: 0.06 });
    const x = new Arrow([0, 0, 0], [0.2, 0.8, 0], { color: C.u, opacity: 0.7, width: 0.025, label: '$\\mathbf x$' });
    const Ax = new Arrow([0, 0, 0], [0.2, 0.8, 0], { color: C.u, label: '$A\\mathbf x$' });
    p.add(s, As, x, Ax);
    const r = p.readout('Transition A');
    const upd = () => {
      const A = L.transition(pp, qq);
      const st = L.steady(pp, qq);
      s.setTo(v3(st)); As.setTo(v3([A[0][0] * st[0] + A[0][1] * st[1], A[1][0] * st[0] + A[1][1] * st[1]]));
      const xx = [0.2, 0.8];
      Ax.setTo(v3([A[0][0] * xx[0] + A[0][1] * xx[1], A[1][0] * xx[0] + A[1][1] * xx[1]]));
      r.row('a', 'A', `[[${nice(pp)}, ${nice(+(1 - qq).toFixed(2))}], [${nice(+(1 - pp).toFixed(2))}, ${nice(qq)}]]`);
      r.row('d', 'det(A − I)', nice(+det([[pp - 1, 1 - qq], [1 - pp, qq - 1]]).toFixed(9)), C.result);
      r.row('s', 'steady state', fmt(st.map((v) => +v.toFixed(3))));
    };
    const sp = new Slider({ label: 'stay in state 1', min: 0, max: 1, step: 0.1, value: pp, onInput: (v) => { pp = v; upd(); } });
    const sq = new Slider({ label: 'stay in state 2', min: 0, max: 1, step: 0.1, value: qq, onInput: (v) => { qq = v; upd(); } });
    p.dock().append(sp.el, sq.el);
    upd();
    const setAll = (a: number, b: number) => { pp = a; qq = b; sp.set(a, false); sq.set(b, false); upd(); };
    return {
      holds: () => L.q5Holds(pp, qq),
      describe: () => `stay chances ${nice(pp)} and ${nice(qq)}: det(A − I) = 0, so 1 is a stretch`,
      randomize(rr, edge) {
        const E = [[1, 1], [0, 0]];
        if (edge !== undefined) { setAll(E[edge][0], E[edge][1]); return; }
        setAll(rint(rr, 0, 10) / 10, rint(rr, 0, 10) / 10);
      },
      edgeCases: 2,
      async showMe() { setAll(0.9, 0.6); },
    };
  },
};

// ------------------------------------------------------------------ Q6 (F)

export const q6: DoubtDef = {
  id: 'c27-q6', who: 'ilse', isTrue: false,
  claim: 'A system of linear equations could have exactly two solutions. Two crossing points, say.',
  reason: 'Two straight lines meet in nothing, one point, or a whole line. If two different points x and y both solve A x = b, then A (x + t (y − x)) = b + t (b − b) = b for every t: the whole line through them solves it. So never exactly two.',
  goal: 'Each equation is a line through two knobs; the readout counts the points on both. **Back it** or **Challenge it**.',
  view: '2d',
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [1, 1], height: 9, ms: 0 });
    const ks = [[0, 2], [2, 0], [0, 0], [2, 2]].map((q, i) => new Knob(p, v3(q), { color: i < 2 ? C.v : C.w, snap: 0.5, countMoves: false, planar: true }));
    const l1 = new InfLine(p.g.stage, [0, 2, 0], [2, -2, 0], { color: C.v, width: 2.2 });
    const l2 = new InfLine(p.g.stage, [0, 0, 0], [2, 2, 0], { color: C.w, width: 2.2 });
    const meet = new Dot([1, 1, 0.05], { color: C.result, size: 0.12 });
    p.add(l1.object, l2.object, meet);
    p.onDispose(() => { l1.dispose(); l2.dispose(); });
    const r = p.readout('Two equations');
    const pts = (): [[Vec, Vec], [Vec, Vec]] => [[ks[0].pos.slice(0, 2) as Vec, ks[1].pos.slice(0, 2) as Vec], [ks[2].pos.slice(0, 2) as Vec, ks[3].pos.slice(0, 2) as Vec]];
    const upd = () => {
      const [a, b] = pts();
      const d1: V3 = [a[1][0] - a[0][0], a[1][1] - a[0][1], 0], d2: V3 = [b[1][0] - b[0][0], b[1][1] - b[0][1], 0];
      if (Math.hypot(d1[0], d1[1]) > 1e-9) l1.set(v3(a[0]), d1);
      if (Math.hypot(d2[0], d2[1]) > 1e-9) l2.set(v3(b[0]), d2);
      const sol = L.solutions(a, b);
      meet.object.visible = sol.count === 'one';
      if (sol.point) meet.at([sol.point[0], sol.point[1], 0.05]);
      r.row('n', 'solutions', sol.count === 'one' ? `one: ${fmt(sol.point!.map((x) => +x.toFixed(3)))}` : sol.count === 'many' ? 'every point of the line' : sol.count === 'none' ? 'none (parallel)' : 'move the knobs apart', sol.count === 'many' ? C.result : undefined);
    };
    p.tick(upd);
    return {
      holds: () => L.q6Holds(...pts()),
      describe: () => {
        const [a, b] = pts(); const sol = L.solutions(a, b);
        if (sol.count === 'many') { const m = [(a[0][0] + a[1][0]) / 2, (a[0][1] + a[1][1]) / 2]; return `both equations are the same line: ${fmt(a[0])} and ${fmt(a[1])} solve it, and so does ${fmt(m)} between them, and every point of the line`; }
        return sol.count === 'one' ? `the lines cross once, at ${fmt(sol.point!.map((x) => +x.toFixed(3)))}: one solution, not two` : 'the lines are parallel: no solution';
      },
      randomize(rr, edge) {
        if (edge !== undefined) { ks[0].at([0, 2, 0]); ks[1].at([2, 0, 0]); ks[2].at([1, 1, 0]); ks[3].at([3, -1, 0]); upd(); return; }
        for (const k of ks) k.at([rint(rr, -2, 4), rint(rr, -2, 4), 0]);
        upd();
      },
      edgeCases: 1,
      async showMe() { await Promise.all([ks[0].moveTo([0, 2, 0], 500), ks[1].moveTo([2, 0, 0], 500), ks[2].moveTo([1, 1, 0], 500), ks[3].moveTo([3, -1, 0], 500)]); upd(); },
    };
  },
};

export const SIX: DoubtDef[] = [q6, q2, q1, q3, q5, q4];
