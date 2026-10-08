// The Act II Review (GDD §6.4, end of Ch 7): Bram's four claims, mixed true and false, each answered
// by construction. The fourth (true) reuses Chapter 6's swap scene.
import type { DoubtDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { PlanePatch } from '../../../gfx/shapes';
import { C } from '../../../core/theme';
import { VectorHandle } from '../../../kit/handle';
import { Knob, RightAngle } from '../../../kit/geom';
import { rint } from '../../../game/lawcheck';
import { cross, dot, norm, vsub } from '../../../math/la';
import { swapDoubt } from '../c06-volume/briefing';
import { crossZeroMeansZero, dotZeroHasZeroPart, fmt, num, threePointsOnePlane } from './logic';
import { v3 } from './parts';

// ------------------------------------------------------------------ (F) dot product zero means a zero part

export const reviewDot: DoubtDef = {
  id: 'c07-r-dot', who: 'bram', isTrue: false,
  claim: 'If two arrows have dot product zero, one of them has a zero part.',
  reason: 'A dot product of zero means a right angle, not a missing part. $(2, 1)\\cdot(-1, 2) = -2 + 2 = 0$, and in 3-D $(1, 2, 2)\\cdot(2, 1, -2) = 2 + 2 - 4 = 0$: no part is zero in either pair.',
  goal: 'Drag $\\cg{\\mathbf v}$ and $\\cr{\\mathbf w}$ on the deck. **Challenge it** (a right angle with no zero part) or **Back it** (Bram will shake it).',
  view: '3d',
  async setup(p) {
    await p.g.stage.view3D({ target: [0.3, 0.9, 0], distance: 12, azimuth: -90, elevation: 72, ms: 0 });
    p.grid({ base: 0.1, main: 0.2, axis: 0.4 });
    let v: V3 = [1, 0, 0], w: V3 = [0, 2, 0];
    const mark = new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 1, 0], 0.3);
    const r = p.readout('Two arrows');
    const show = () => {
      const d = dot(v, w);
      mark.set([0, 0, 0], v, w);
      mark.show(Math.abs(d) < 1e-9 && norm(v) > 1e-9 && norm(w) > 1e-9);
      r.row('v', '$\\mathbf v$', fmt(v.slice(0, 2)), C.v);
      r.row('w', '$\\mathbf w$', fmt(w.slice(0, 2)), C.w);
      r.row('d', '$\\mathbf v\\cdot\\mathbf w$', num(d), Math.abs(d) < 1e-9 ? C.good : C.result);
      r.row('z', 'a zero part?', [...v.slice(0, 2), ...w.slice(0, 2)].some((x) => Math.abs(x) < 1e-9) ? 'yes' : 'no');
    };
    const hv = new VectorHandle(p, { to: v, color: C.v, label: '$\\mathbf v$', planar: true, snap: 1, limit: 4, countMoves: false, onChange: (t) => { v = t; show(); } });
    const hw = new VectorHandle(p, { to: w, color: C.w, label: '$\\mathbf w$', planar: true, snap: 1, limit: 4, countMoves: false, onChange: (t) => { w = t; show(); } });
    show();
    const set = (a: V3, b: V3) => { hv.set(a, [0, 0, 0]); hw.set(b, [0, 0, 0]); v = a; w = b; show(); };
    return {
      holds: () => dotZeroHasZeroPart(v.slice(0, 2), w.slice(0, 2)),
      describe: () => `v = ${fmt(v.slice(0, 2))}, w = ${fmt(w.slice(0, 2))}: v · w = ${num(dot(v, w))}`,
      randomize(rr, edge) {
        const edges: [V3, V3][] = [[[2, 1, 0], [-1, 2, 0]], [[3, 1, 0], [-1, 3, 0]]];
        if (edge !== undefined) { set(...edges[edge]); return; }
        const a: V3 = [rint(rr, -3, 3), rint(rr, -3, 3), 0];
        set(a, rr() < 0.6 ? [-a[1] * (rr() < 0.5 ? 1 : -1), a[0] * (rr() < 0.5 ? 1 : -1), 0] : [rint(rr, -3, 3), rint(rr, -3, 3), 0]);
      },
      edgeCases: 2,
      async showMe(stance) { if (stance === 'challenge') set([2, 1, 0], [-1, 2, 0]); else set([1, 0, 0], [0, 2, 0]); },
    };
  },
};

// ------------------------------------------------------------------ (F) a × b = 0 means a or b is zero

export const reviewCross: DoubtDef = {
  id: 'c07-r-cross', who: 'bram', isTrue: false,
  claim: 'If a × b is the zero arrow, then a or b is the zero arrow.',
  reason: 'The cross product is as long as the parallelogram\'s area. Two arrows on one line make a parallelogram with no area: $(2, 4, 6)\\times(1, 2, 3) = (0, 0, 0)$, and neither arrow is zero.',
  goal: 'Drag $\\cg{\\mathbf a}$ and $\\cr{\\mathbf b}$ on the deck; $\\mathbf a\\times\\mathbf b$ rises out of it. **Challenge it** (a zero cross product from two arrows that are not zero) or **Back it**.',
  view: '3d',
  async setup(p) {
    await p.g.stage.view3D({ target: [0.5, 0.8, 1.5], distance: 13, azimuth: -60, elevation: 30, ms: 0 });
    p.grid({ base: 0.08, main: 0.16, axis: 0.3 });
    let a: V3 = [2, 0, 0], b: V3 = [1, 2, 0];
    const up = new Arrow([0, 0, 0], [0, 0, 1], { color: C.result, label: '$\\mathbf a\\times\\mathbf b$' });
    p.add(up);
    const r = p.readout('The raised arrow');
    const show = () => {
      const x = cross(a, b) as V3;
      up.set([0, 0, 0], [x[0] * 0.5, x[1] * 0.5, x[2] * 0.5]);
      r.row('a', '$\\mathbf a$', fmt(a), C.v);
      r.row('b', '$\\mathbf b$', fmt(b), C.w);
      r.row('x', '$\\mathbf a\\times\\mathbf b$ (drawn at half length)', fmt(x), C.result);
    };
    const ha = new VectorHandle(p, { to: a, color: C.v, label: '$\\mathbf a$', planar: true, snap: 1, limit: 4, countMoves: false, onChange: (t) => { a = t; show(); } });
    const hb = new VectorHandle(p, { to: b, color: C.w, label: '$\\mathbf b$', planar: true, snap: 1, limit: 4, countMoves: false, onChange: (t) => { b = t; show(); } });
    show();
    const set = (x: V3, y: V3) => { ha.set(x, [0, 0, 0]); hb.set(y, [0, 0, 0]); a = x; b = y; show(); };
    return {
      holds: () => crossZeroMeansZero(a, b),
      describe: () => `a = ${fmt(a)}, b = ${fmt(b)}: a × b = ${fmt(cross(a, b))}`,
      randomize(rr, edge) {
        const edges: [V3, V3][] = [[[1, 2, 0], [2, 4, 0]], [[3, -1, 0], [-3, 1, 0]]];
        if (edge !== undefined) { set(...edges[edge]); return; }
        const x: V3 = [rint(rr, -3, 3), rint(rr, -3, 3), 0];
        const k = rint(rr, -2, 2);
        set(x, rr() < 0.5 ? [x[0] * k, x[1] * k, 0] : [rint(rr, -3, 3), rint(rr, -3, 3), 0]);
      },
      edgeCases: 2,
      async showMe(stance) { if (stance === 'challenge') set([1, 2, 0], [2, 4, 0]); else set([2, 0, 0], [1, 2, 0]); },
    };
  },
};

// ------------------------------------------------------------------ (F) three points always fix exactly one plane

export const reviewPlane: DoubtDef = {
  id: 'c07-r-plane', who: 'bram', isTrue: false,
  claim: 'Three points always fix exactly one plane.',
  reason: 'Three points on one line fix only the line: every plane that turns about it passes through all three. The normal $(B - A)\\times(C - A)$ is then the zero arrow, so there is no single plane.',
  goal: 'Drag the three points (**Shift**-drag for height). **Challenge it** (three points that fix no single plane) or **Back it**.',
  view: '3d',
  async setup(p) {
    await p.g.stage.view3D({ target: [1, 1, 1.4], distance: 14, azimuth: -55, elevation: 24, ms: 0 });
    p.grid({ base: 0.08, main: 0.16, axis: 0.3 });
    const snap = p.difficulty === 'commander' ? 0.5 : 1;
    let A: V3 = [0, 0, 1], B: V3 = [2, 0, 1], Cc: V3 = [0, 2, 2];
    const planes = [0, 1, 2].map((i) => { const pp = new PlanePatch(p.g.stage, [0, 0, 0], [0, 0, 1], { color: i ? '#8fd3ff' : '#ffd9a0', size: 5, opacity: 0.12 }); p.add(pp); return pp; });
    let spin = 0;
    const r = p.readout('Planes through A, B, C');
    const show = () => {
      const n = cross(vsub(B, A), vsub(Cc, A));
      const line = norm(n) < 1e-9;
      const mid: V3 = [(A[0] + B[0] + Cc[0]) / 3, (A[1] + B[1] + Cc[1]) / 3, (A[2] + B[2] + Cc[2]) / 3];
      if (!line) { planes[0].set(mid, v3(n)); planes[0].setOpacity(1); planes[1].setOpacity(0); planes[2].setOpacity(0); }
      else {
        // a fan of planes turning about the line through the points
        let d = vsub(B, A);
        if (norm(d) < 1e-9) d = vsub(Cc, A);
        if (norm(d) < 1e-9) d = [1, 0, 0];
        const helper: V3 = Math.abs(d[2]) < 0.9 * norm(d) ? [0, 0, 1] : [1, 0, 0];
        const e1 = cross(d, helper), e2 = cross(d, e1);
        planes.forEach((pp, i) => {
          const t = spin + (i * Math.PI) / 3;
          const nn = [0, 1, 2].map((j) => Math.cos(t) * e1[j] / norm(e1) + Math.sin(t) * e2[j] / norm(e2)) as V3;
          pp.set(mid, nn); pp.setOpacity(0.8);
        });
      }
      r.row('n', '$(B - A)\\times(C - A)$', fmt(n), line ? C.orange : C.result);
      r.row('k', 'planes through all three', line ? 'every plane about their line' : 'exactly one');
    };
    const mk = (at: V3, label: string, set: (q: V3) => void) => new Knob(p, at, { label, color: C.white, snap, countMoves: false, onMove: (q) => { set(q); show(); } });
    const ka = mk(A, 'A', (q) => { A = q; });
    const kb = mk(B, 'B', (q) => { B = q; });
    const kc = mk(Cc, 'C', (q) => { Cc = q; });
    p.tick((dt) => { if (norm(cross(vsub(B, A), vsub(Cc, A))) < 1e-9) { spin += dt * 0.6; show(); } });
    show();
    const setAll = (a: V3, b: V3, c: V3) => { A = a; B = b; Cc = c; ka.at(a); kb.at(b); kc.at(c); show(); };
    return {
      holds: () => threePointsOnePlane(A, B, Cc),
      describe: () => `A = ${fmt(A)}, B = ${fmt(B)}, C = ${fmt(Cc)}: ${threePointsOnePlane(A, B, Cc) ? 'one plane' : 'all on one line, so no single plane'}`,
      randomize(rr, edge) {
        const edges: [V3, V3, V3][] = [[[0, 0, 1], [1, 1, 1], [2, 2, 1]], [[1, 0, 0], [1, 1, 1], [1, 2, 2]]];
        if (edge !== undefined) { setAll(...edges[edge]); return; }
        const rv = (): V3 => [rint(rr, -2, 3), rint(rr, -2, 3), rint(rr, 0, 3)];
        setAll(rv(), rv(), rv());
      },
      edgeCases: 2,
      async showMe(stance) { if (stance === 'challenge') setAll([0, 0, 1], [1, 1, 1], [2, 2, 1]); else setAll([0, 0, 1], [2, 0, 1], [0, 2, 2]); },
    };
  },
};

// ------------------------------------------------------------------ (T) swapping two struts flips the sign (Chapter 6's scene)

export const reviewSwap = swapDoubt('c07-r-swap', 'Swapping two struts flips the sign of the volume.');
