// Chapter 21 Briefing (GDD §6.10 Ch 21): Say it, three Doubts (two false, one true), the Law, Ilse's page.
// The twice-projected scene is exported for the Act VIII Review (Chapter 23).
import type { CompareDef, DoubtDef, DoubtScene, Game, LawDef, PuzzleCtx, SayItDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Beacon, Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { InfLine, PlanePatch } from '../../../gfx/shapes';
import { VectorHandle } from '../../../kit/handle';
import { RightAngle } from '../../../kit/geom';
import { C } from '../../../core/theme';
import { rint } from '../../../game/lawcheck';
import { cross, dot, fromCols, gramSchmidt, norm, proj, vadd, vsub, type Vec } from '../../../math/la';
import { DropPlane } from './drop';
import {
  HATCH, HATCH_FOOT, HATCH_UP, THR1, THR2, fmtN, fmtV, lawCore, project, shadowSumHolds, straightUpHolds, twiceHolds,
  type PlaneCase,
} from './logic';

const v3 = (v: readonly number[], z = 0): V3 => [v[0], v[1], v[2] ?? z];
const tag = (p: PuzzleCtx, text: string, at: V3, cls = '', offset: [number, number] = [0, -22]) => { const l = new Label(text, at, { className: `a8-pt ${cls}`, offset }); p.add(l); return l; };

export const sayit: SayItDef = {
  id: 'c21', who: 'bram',
  ask: 'Why does the shortest error arrow have to be perpendicular to the plane?',
  frames: {
    see: 'The dashed leftover from the ___ to the plane was shortest when it met the plane at ___.',
    means: 'For any other point of the plane, the leftover is the long side of a ___ triangle, so it is ___.',
    called: 'The nearest point is called the ___ of the point onto the plane.',
    cue: 'When you see "closest" or "best approximation", think ___.',
  },
  wordBank: ['hatch', 'tether', 'plane', 'right angle', 'leftover', 'shadow', 'Pythagoras', 'longer', 'orthogonal projection', 'drop a perpendicular'],
};

// ------------------------------------------------------------------ (F) "The closest point on the plane is straight up from the hatch."

export const doubtUp: DoubtDef = {
  id: 'c21-d-up', who: 'bram', isTrue: false,
  claim: 'The closest point on the plane is straight up from the hatch. Shortest way to a plane is straight up.',
  reason: 'Straight up from the hatch, $(1, 1, 2)$, is 2 away. The nearest point is where the leftover is at a right angle to the plane: $(1/3, 1/3, 2/3)$, 1.155 away. Straight up only works when the plane is the floor.',
  goal: 'The white ring is straight up from the hatch, on the plane. Drag the yellow point across the plane. **Challenge it** (a point nearer than the ring) or **Back it**.',
  view: '3d',
  async setup(p) {
    await p.g.stage.view3D({ target: [0.5, 0.5, 0.6], distance: 10.5, azimuth: -62, elevation: 21, ms: 0 });
    p.grid({ base: 0.1, main: 0.2, axis: 0.45 });
    let target: V3 = v3(HATCH);
    const beacon = new Beacon(p.g.stage, target, { color: C.accent });
    p.add(beacon);
    const ring = new Dot(v3(HATCH_UP), { color: C.white, size: 0.1 });
    const upLine = new FatLine(p.g.stage, [target, v3(HATCH_UP)], { color: C.white, width: 1.4, opacity: 0.55, dashed: true, dashSize: 0.12, gapSize: 0.09 });
    p.add(ring, upLine);
    const lu = tag(p, 'straight up', v3(HATCH_UP), 'dim', [0, -22]);
    const r = p.readout('Two candidates');
    const dp = new DropPlane(p, {
      a: v3(THR1), b: v3(THR2), target, w0: [1, 1], step: p.snap() ? p.snap()! / 2 : null, range: 3, size: 6, labels: ['$\\mathbf t_1$', '$\\mathbf t_2$'],
      onMove: () => show(),
    });
    const up = () => v3([target[0], target[1], target[0] + target[1]]);
    const show = () => {
      r.row('u', 'straight up: distance', fmtN(norm(vsub(target, up()))), C.white);
      r.row('q', 'your point: distance', fmtN(norm(vsub(target, dp.p))), C.result);
    };
    const setTarget = (t: V3) => {
      target = t; dp.target = t; beacon.at(t);
      ring.at(up()); upLine.setPoints([t, up()]); lu.at(up());
      dp.draw(); show();
    };
    show();
    const scene: DoubtScene = {
      holds: () => straightUpHolds(target, dp.p),
      describe: () => `the point ${fmtV(dp.p)} is ${fmtN(norm(vsub(target, dp.p)))} from ${fmtV(target)}; straight up, ${fmtV(up())}, is ${fmtN(norm(vsub(target, up())))} away`,
      randomize(rr, edge) {
        const cases: V3[] = [[1, 1, 0], [0, 0, 3]];
        let t: V3;
        if (edge !== undefined) t = cases[edge];
        else do { t = [rint(rr, -2, 2), rint(rr, -2, 2), rint(rr, -2, 3)]; } while (Math.abs(t[2] - t[0] - t[1]) < 1);
        setTarget(t);
        const foot = project(fromCols([THR1, THR2]), t);
        dp.set(dp.weightsOf(foot));
        show();
      },
      edgeCases: 2,
      async showMe() { setTarget(v3(HATCH)); await dp.moveTo(dp.weightsOf(HATCH_FOOT), 800); show(); },
    };
    return scene;
  },
};

// ------------------------------------------------------------------ (F) "Adding the shadows works for any basis."

export const doubtShadows: DoubtDef = {
  id: 'c21-d-shadows', who: 'bram', isTrue: false,
  claim: 'Adding the two shadows gives the nearest point. Works for any two arrows that span the floor.',
  reason: 'Only when the two arrows are at a right angle. With $(1, 0, 0)$ and $(1, 1, 0)$, the shadows of $(2, 3, 4)$ add to $(4.5, 2.5, 0)$; the nearest point is $(2, 3, 0)$. Both shadows push along the first arrow, 2 and 2.5 more, so they overlap and do not add up to the nearest point. With arrows at a right angle the overlap is 0.',
  goal: 'Drag the two floor arrows. The yellow point is the sum of the shadows of $\\mathbf b$; the white ring is the true nearest point. **Challenge it** (they differ) or **Back it**.',
  view: '3d',
  async setup(p) {
    await p.g.stage.view3D({ target: [1.6, 1.4, 1.4], distance: 14, azimuth: -64, elevation: 26, ms: 0 });
    p.grid({ base: 0.12, main: 0.24, axis: 0.5 });
    const b: V3 = [2, 3, 4];
    p.add(new Arrow([0, 0, 0], b, { color: C.white, label: '$\\mathbf b$' }));
    const foot = new Dot([2, 3, 0.02], { color: C.white, size: 0.1 });
    p.add(foot);
    tag(p, 'nearest point (2, 3, 0)', [2, 3, 0], 'dim', [0, 24]);
    const sumDot = new Dot([0, 0, 0.03], { color: C.result, size: 0.12 });
    const s1 = new Arrow([0, 0, 0.02], [1, 0, 0.02], { color: C.result, width: 0.035, opacity: 0.8 });
    const s2 = new Arrow([0, 0, 0.02], [1, 0, 0.02], { color: C.result, width: 0.035, opacity: 0.8 });
    p.add(sumDot, s1, s2);
    const r = p.readout('Sum of the shadows');
    const k1 = new VectorHandle(p, { to: [2, 0, 0], color: C.v, label: '$\\mathbf k_1$', planar: true, countMoves: false, limit: 4, onChange: () => sync() });
    const k2 = new VectorHandle(p, { to: [0, 2, 0], color: C.w, label: '$\\mathbf k_2$', planar: true, countMoves: false, limit: 4, onChange: () => sync() });
    const sync = () => {
      const a = k1.vec, c = k2.vec;
      const ok = norm(cross(a, c)) > 1e-6;
      const p1 = proj(b, a), p2 = proj(b, c), sum = vadd(p1, p2);
      s1.set([0, 0, 0.02], v3([p1[0], p1[1]], 0.02)); s2.set([0, 0, 0.02], v3([p2[0], p2[1]], 0.02));
      sumDot.at(v3([sum[0], sum[1]], 0.03));
      r.row('a', 'angle between the arrows', ok ? `${Math.round((Math.acos(Math.max(-1, Math.min(1, dot(a, c) / (norm(a) * norm(c))))) * 180) / Math.PI)}°` : 'on one line', ok ? C.white : C.orange);
      r.row('s', 'sum of the shadows', fmtV(sum), C.result);
      r.row('f', 'nearest point', '(2, 3, 0)');
    };
    sync();
    return {
      holds: () => shadowSumHolds(k1.vec, k2.vec, b),
      describe: () => { const a = k1.vec, c = k2.vec; return `arrows ${fmtV(a)} and ${fmtV(c)}: the shadows add to ${fmtV(vadd(proj(b, a), proj(b, c)))}, the nearest point is (2, 3, 0)`; },
      randomize(rr, edge) {
        const cases: [V3, V3][] = [[[1, 0, 0], [1, 1, 0]], [[2, 1, 0], [1, 2, 0]]];
        let a: V3, c: V3;
        if (edge !== undefined) [a, c] = cases[edge];
        else do { a = [rint(rr, -3, 3), rint(rr, -3, 3), 0]; c = [rint(rr, -3, 3), rint(rr, -3, 3), 0]; } while (Math.abs(a[0] * c[1] - a[1] * c[0]) < 1);
        k1.set(a, [0, 0, 0]); k2.set(c, [0, 0, 0]); sync();
      },
      edgeCases: 2,
      async showMe() { k1.set([1, 0, 0], [0, 0, 0]); await k2.moveTo([1, 1, 0], 700, [0, 0, 0]); sync(); },
    };
  },
};

// ------------------------------------------------------------------ (T) "Projecting twice lands on the same point as projecting once."

/** A line through the origin (drag its arrow), a point x (drag it), its shadow and the shadow of the shadow. */
export function twiceScene(p: PuzzleCtx, o: { holds: (d: Vec, x: Vec) => boolean; describe: (d: Vec, x: Vec) => string }): DoubtScene {
  p.grid();
  void p.g.stage.view2D({ center: [0.6, 0.8], height: 8.5, ms: 0 });
  const line = new InfLine(p.g.stage, [0, 0, 0], [2, 1, 0], { color: C.w, width: 1.4, opacity: 0.45 });
  p.add(line);
  const once = new Arrow([0, 0, 0.02], [1, 0, 0.02], { color: C.result, label: '$P\\mathbf x$' });
  const twice = new Dot([0, 0, 0.05], { color: C.white, size: 0.13 });
  const drop = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.white, width: 1.6, opacity: 0.8, dashed: true, dashSize: 0.12, gapSize: 0.09 });
  p.add(once, twice, drop);
  const mark = new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 1, 0], 0.22);
  const ltw = new Label('$P(P\\mathbf x)$', [0, 0, 0], { className: 'a8-pt', offset: [0, 24] });
  p.add(ltw);
  const r = p.readout('Once and twice');
  const d = new VectorHandle(p, { to: [2, 1, 0], color: C.w, label: '$\\mathbf d$', countMoves: false, limit: 4, onChange: () => sync() });
  const x = new VectorHandle(p, { to: [1, 3, 0], color: C.v, label: '$\\mathbf x$', countMoves: false, limit: 4, onChange: () => sync() });
  const dv = () => [d.vec[0], d.vec[1]], xv = () => [x.vec[0], x.vec[1]];
  const sync = () => {
    const dd = dv(), xx = xv();
    if (norm(dd) > 1e-6) line.set([0, 0, 0], v3(dd));
    const p1 = proj(xx, dd), p2 = proj(p1, dd);
    once.set([0, 0, 0.02], v3(p1, 0.02)); once.object.visible = norm(p1) > 0.03;
    twice.at(v3(p2, 0.05)); ltw.at(v3(p2));
    drop.setPoints([v3(xx), v3(p1)]); drop.object.visible = norm(vsub(xx, p1)) > 0.04;
    mark.show(norm(vsub(xx, p1)) > 0.3 && norm(p1) > 0.3); mark.set(v3(p1), v3([-p1[0], -p1[1]]), v3(vsub(xx, p1)));
    r.row('o', 'once: $P\\mathbf x$', fmtV(p1), C.result);
    r.row('t', 'twice: $P(P\\mathbf x)$', fmtV(p2), C.white);
    r.row('m', 'moved by the second drop', fmtN(norm(vsub(p2, p1))));
  };
  sync();
  return {
    holds: () => o.holds(dv(), xv()),
    describe: () => o.describe(dv(), xv()),
    randomize(rr, edge) {
      const cases: [V3, V3][] = [[[2, 1, 0], [4, 2, 0]], [[2, 1, 0], [-1, 2, 0]], [[1, 3, 0], [3, -2, 0]]];
      let dd: V3, xx: V3;
      if (edge !== undefined) [dd, xx] = cases[edge];
      else { do { dd = [rint(rr, -3, 3), rint(rr, -3, 3), 0]; } while (dd[0] === 0 && dd[1] === 0); xx = [rint(rr, -3, 3), rint(rr, -3, 3), 0]; }
      d.set(dd, [0, 0, 0]); x.set(xx, [0, 0, 0]); sync();
    },
    edgeCases: 3,
    async showMe() { d.set([2, 1, 0], [0, 0, 0]); await x.moveTo([1, 3, 0], 600, [0, 0, 0]); sync(); },
  };
}

export const doubtTwice: DoubtDef = {
  id: 'c21-d-twice', who: 'bram', isTrue: true,
  claim: 'Drop a point onto a line, then drop the result again. It lands on the same point as the first drop.',
  reason: 'After one drop the point is on the line, and a point on the line is its own nearest point: its leftover is the zero vector. So $P(P\\mathbf x) = P\\mathbf x$ for every $\\mathbf x$: $P^2 = P$.',
  goal: 'Drag the line’s arrow $\\cr{\\mathbf d}$ and the point $\\cg{\\mathbf x}$. Yellow: one drop. White: a second drop. **Back it** (Bram will shake it) or **Challenge it**.',
  view: '2d',
  setup(p) {
    return twiceScene(p, {
      holds: (d, x) => twiceHolds(d, x),
      describe: (d, x) => `$\\mathbf d = ${fmtV(d)}$, $\\mathbf x = ${fmtV(x)}$: once ${fmtV(proj(x, d))}, twice ${fmtV(proj(proj(x, d), d))}`,
    });
  },
};

// ------------------------------------------------------------------ the Law

/** A camera direction that sees the plane at about 40°, so both the plane and the leftover read. */
function viewFor(n: Vec): { azimuth: number; elevation: number } {
  // the normal's sign is arbitrary: take the one pointing up, so the camera sits above the plane at a slant
  const u = n.map((x) => (n[2] < 0 ? -x : x) / norm(n));
  let w = cross(u, [0, 0, 1]);
  if (norm(w) < 1e-6) w = [1, 0, 0];
  w = w.map((x) => x / norm(w));
  const c = u.map((x, i) => 0.6 * x + 0.8 * w[i]);
  if (c[2] < 0.15) { c[2] = Math.abs(c[2]) + 0.25; }
  const cn = norm(c);
  return { azimuth: (Math.atan2(c[1], c[0]) * 180) / Math.PI, elevation: (Math.asin(c[2] / cn) * 180) / Math.PI };
}

function drawCase(g: Game, c: PlaneCase): void {
  void g.stage.view3D({ target: [0, 0, 0.5], distance: 16, ...viewFor(cross(c.a, c.b)), ms: 0, orbit: false });
  const W = g.stage.world;
  const n = cross(c.a, c.b);
  const patch = new PlanePatch(g.stage, [0, 0, 0], v3(n), { color: C.u, size: 8, opacity: 0.13 });
  const [e1, e2] = gramSchmidt([c.a, c.b]);
  patch.setSpan([0, 0, 0], v3(e1), v3(e2));
  const pt = project(fromCols([c.a, c.b]), c.target);
  const left = new FatLine(g.stage, [v3(pt), v3(c.target)], { color: C.result, width: 2, dashed: true, dashSize: 0.14, gapSize: 0.09 });
  W.add(patch.object, new Arrow([0, 0, 0], v3(c.a), { color: C.v }).object, new Arrow([0, 0, 0], v3(c.b), { color: C.w }).object,
    new Dot(v3(c.target), { color: C.white, size: 0.12 }).object, new Dot(v3(pt), { color: C.result, size: 0.11 }).object, left.object);
  patch.object.userData.dispose = () => patch.dispose();
  left.object.userData.dispose = () => left.dispose();
}

export const law: LawDef<PlaneCase> = {
  ...lawCore,
  frame: ['A point $\\mathbf q$ of a plane through the origin is the nearest point to $\\mathbf b$ exactly when the leftover $\\mathbf b - \\mathbf q$ is ', { slot: 'rel' }, ' ', { slot: 'to' }, '.'],
  slots: {
    rel: { options: [{ id: 'perp', text: 'perpendicular to' }, { id: 'par', text: 'parallel to' }] },
    to: { options: [{ id: 'plane', text: 'every arrow in the plane' }, { id: 'first', text: 'the first arrow that spans the plane' }, { id: 'z', text: 'the $z$-axis (straight up)' }] },
  },
  draw: drawCase,
  reason: {
    ask: 'Your Law survived 500 planes. **Why** is the perpendicular point the nearest one?',
    options: [
      { id: 'pyth', text: 'For any other point $\\mathbf q$ of the plane, $\\mathbf p - \\mathbf q$ lies in the plane, so it is at a right angle to the leftover $\\mathbf b - \\mathbf p$. Pythagoras: $\\|\\mathbf b - \\mathbf q\\|^2 = \\|\\mathbf b - \\mathbf p\\|^2 + \\|\\mathbf p - \\mathbf q\\|^2$, which is bigger.', right: true, why: 'Yes. Every other point adds a second, perpendicular side to the triangle, and the long side grows. That is the whole reason.' },
      { id: 'straight', text: 'A perpendicular is the shortest line because it is straight.', right: false, why: 'Every leftover is a straight arrow. What makes this one shortest is the right angle with every direction in the plane, through Pythagoras.' },
      { id: 'up', text: 'The leftover points straight up, and up is the shortest way to any plane.', right: false, why: 'Straight up is perpendicular only to a floor. For $z = x + y$, straight up from the hatch is 2 away; the nearest point is 1.155 away.' },
      { id: 'first', text: 'At a right angle to the first arrow is enough; the second arrow follows.', right: false, why: 'A whole line of points in the plane has a leftover at a right angle to the first arrow. Only one of them is nearest: the one square to both.' },
    ],
  },
};

export const compare: CompareDef = {
  id: 'c21',
  page: 'The **orthogonal projection** of $\\mathbf b$ onto a subspace $W$ is the point $\\mathbf p$ of $W$ nearest to $\\mathbf b$. It is the one point where the leftover $\\mathbf b - \\mathbf p$ is perpendicular to $W$: perpendicular to every arrow in it. Any other point $\\mathbf q$ of $W$ is further away, because $\\mathbf p - \\mathbf q$ lies in $W$ and Pythagoras adds its square.\n\nWith a **perpendicular** basis $\\mathbf u_1, \\mathbf u_2$, the projection is the sum of the shadows on each basis arrow. With a skewed basis the shadows overlap; then put the basis in the columns of $A$, solve $A^{\\mathsf T}A\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b$, and take $\\mathbf p = A\\hat{\\mathbf x}$.',
  formula: '\\mathbf p = \\frac{\\mathbf b\\cdot\\mathbf u_1}{\\mathbf u_1\\cdot\\mathbf u_1}\\mathbf u_1 + \\frac{\\mathbf b\\cdot\\mathbf u_2}{\\mathbf u_2\\cdot\\mathbf u_2}\\mathbf u_2 \\qquad A^{\\mathsf T}(\\mathbf b - A\\hat{\\mathbf x}) = \\mathbf 0',
  keyIdeas: [
    'Did you say the leftover is perpendicular to the whole plane, not only to one arrow?',
    'Did you say why every other point is further away (Pythagoras)?',
    'Did you say when adding the shadows works: a perpendicular basis?',
  ],
};
