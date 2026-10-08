// Chapter 7 Briefing (GDD §6.4 Ch 7): Say it, two Doubts (one false, one true), the Law, Ilse's page.
import type { CompareDef, DoubtDef, Game, LawDef, SayItDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { PlanePatch } from '../../../gfx/shapes';
import { C } from '../../../core/theme';
import { RightAngle } from '../../../kit/geom';
import { Slider } from '../../../ui/widgets';
import { rint } from '../../../game/lawcheck';
import { dot, norm, vadd, vscale, vsub } from '../../../math/la';
import { PathLine, v3 } from './parts';
import { besidePanel } from '../c06-volume/stage';
import { closestTs, coeffsOut, fmt, footOnPlane, inPlaneDirs, lawCore, mustCross, num, planeEq, skewDist, along, type PlaneCase } from './logic';

export const sayit: SayItDef = {
  id: 'c07', who: 'bram',
  ask: 'Why does $ax + by + cz = d$ describe a flat plane and not a curved surface?',
  frames: {
    see: 'Every arrow from ___ to a point on the door reads ___ against the normal.',
    means: 'So the door is every point X with n · (X − P) = ___. Expanding gives ___, and the numbers in front of x, y, z are ___.',
    called: 'ax + by + cz = d is called the ___ of the plane.',
    cue: 'When you see "where does this path hit that surface", think ___.',
  },
  wordBank: ['normal', 'right angle', 'zero', 'arrow from P', 'flat', 'dot product', 'Cartesian equation', 'substitute the path'],
};

// ------------------------------------------------------------------ (F) Two lines in space that aren't parallel have to cross

export const doubtCross: DoubtDef = {
  id: 'c07-d-cross', who: 'bram', isTrue: false,
  claim: 'Two lines in space that aren\'t parallel have to cross.',
  reason: 'On a flat deck, yes. In space, one line can pass above the other: our path along $(1, 0, 0)$ and the debris along $(0, 1, 0)$, 2 above it, point different ways and never meet. Such lines are **skew**.',
  goal: 'Set the debris line\'s **turn** and **height**. **Challenge it** (two lines, not parallel, that never meet) or **Back it** (Bram will shake it).',
  view: '3d',
  async setup(p) {
    await p.g.stage.view3D({ target: [0, 0, 1.2], distance: 15, azimuth: -50, elevation: 20, ms: 0 });
    p.grid({ base: 0.08, main: 0.16, axis: 0.3 });
    const p1: V3 = [0, 0, 0], d1: V3 = [1, 0, 0];
    let ang = 90, hgt = 0;
    const p2 = (): V3 => [0, 1, hgt];
    const d2 = (): V3 => [Math.cos((ang * Math.PI) / 180), Math.sin((ang * Math.PI) / 180), 0];
    new PathLine(p, p1, d1, { color: C.v, t0: -6, t1: 6 });
    const l2 = new PathLine(p, p2(), d2(), { color: C.w, t0: -6, t1: 6 });
    const link = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 0]], { color: C.result, width: 2.6, dashed: true, intensity: 1.3 });
    p.add(link);
    p.onDispose(() => link.dispose());
    const meet = new Dot([0, 0, 0], { color: C.result, size: 0.1 });
    p.add(meet);
    const r = p.readout('Two lines');
    const show = () => {
      l2.set(p2(), d2(), -6, 6);
      const g = skewDist(p1, d1, p2(), d2());
      const ts = closestTs(p1, d1, p2(), d2());
      r.row('par', 'parallel', g === null ? 'yes' : 'no');
      r.row('gap', 'closest gap', g === null ? '—' : num(Math.round(g * 100) / 100), C.result);
      if (ts) {
        const a = along(p1, d1, ts[0]) as V3, b = along(p2(), d2(), ts[1]) as V3;
        link.setPoints([a, b]); link.setOpacity(g! > 0.02 ? 0.9 : 0);
        meet.at(a); meet.group.visible = g! <= 0.02;
      } else { link.setOpacity(0); meet.group.visible = false; }
    };
    const sa = new Slider({ label: 'debris turn', min: 0, max: 180, step: 15, value: ang, format: (x) => `${x}°`, onInput: (x) => { ang = x; show(); } });
    const sh = new Slider({ label: 'debris height', min: -3, max: 3, step: p.difficulty === 'cadet' ? 1 : 0.5, value: hgt, onInput: (x) => { hgt = x; show(); } });
    p.dock().append(sa.el, sh.el);
    show();
    const setBoth = (a: number, z: number) => { ang = a; hgt = z; sa.set(a, false); sh.set(z, false); show(); };
    return {
      holds: () => mustCross(p1, d1, p2(), d2()),
      describe: () => `the debris line through ${fmt(p2())}, turned ${ang}°: ${skewDist(p1, d1, p2(), d2()) === null ? 'parallel' : `not parallel, closest gap ${num(Math.round(skewDist(p1, d1, p2(), d2())! * 100) / 100)}`}`,
      randomize(rr, edge) {
        const edges: [number, number][] = [[90, 2], [45, -1]];
        if (edge !== undefined) { setBoth(...edges[edge]); return; }
        let a: number;
        do { a = rint(rr, 1, 11) * 15; } while (a === 180);
        setBoth(a, rint(rr, -2, 2));
      },
      edgeCases: 2,
      async showMe(stance) { setBoth(90, stance === 'challenge' ? 2 : 0); },
    };
  },
};

// ------------------------------------------------------------------ (T) The numbers in front of x, y and z point straight out of the plane

export const doubtNormal: DoubtDef = {
  id: 'c07-d-normal', who: 'bram', isTrue: true,
  claim: 'The numbers in front of x, y and z point straight out of the plane.',
  reason: 'Take two points $X$ and $Y$ of the plane: $\\mathbf n\\cdot X = d$ and $\\mathbf n\\cdot Y = d$. Subtract: $\\mathbf n\\cdot(X - Y) = 0$. Every arrow lying in the plane reads 0 against $(a, b, c)$, so $(a, b, c)$ is at a right angle to the plane.',
  goal: 'Set $a$, $b$, $c$ and $d$. The arrow $(a, b, c)$ stands on the plane beside two arrows that lie in it. **Back it** (Bram will shake it) or **Challenge it**.',
  view: '3d',
  async setup(p) {
    await p.g.stage.view3D({ target: [0.73, 0.37, 0.74], distance: 16, azimuth: -55, elevation: 22, ms: 0 });
    p.grid({ base: 0.06, main: 0.12, axis: 0.3 });
    let n: V3 = [6, 3, 2], k = 6;
    let look: V3 = [0, 0, 0];
    const plane = new PlanePatch(p.g.stage, [0, 0, 0], [0, 0, 1], { color: '#8fd3ff', size: 6, opacity: 0.12 });
    p.add(plane);
    const na = new Arrow([0, 0, 0], [0, 0, 1], { color: '#fff1c2', width: 0.045, label: '$(a, b, c)$' });
    const ia = new Arrow([0, 0, 0], [1, 0, 0], { color: C.white, width: 0.03, opacity: 0.8 });
    const ib = new Arrow([0, 0, 0], [0, 1, 0], { color: C.white, width: 0.03, opacity: 0.8 });
    p.add(na, ia, ib);
    const m1 = new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 0, 1], 0.25);
    const m2 = new RightAngle(p, [0, 0, 0], [0, 1, 0], [0, 0, 1], 0.25);
    const eq = new Label('', [0, 0, -2.4], { color: C.white, size: 18 });
    p.add(eq);
    const r = p.readout('The plane and its numbers');
    const show = () => {
      if (norm(n) < 1e-9) { r.row('eq', 'plane', 'none: (a, b, c) is zero'); return; }
      const x0 = footOnPlane([0, 0, 0], n, k) as V3;
      // keep the plane in view: the camera follows the point of the plane nearest the origin
      if (Math.hypot(x0[0] - look[0], x0[1] - look[1], x0[2] - look[2]) > 0.5) { look = x0; void p.g.stage.view3D({ target: [x0[0], x0[1], x0[2] + 0.5], distance: 16, azimuth: -55, elevation: 22, ms: 250 }); }
      const [a, b] = inPlaneDirs(n);
      plane.setSpan(x0, v3(a), v3(b));
      const u = vscale(n, 2 / norm(n));
      na.set(x0, v3(vadd(x0, u)));
      ia.set(x0, v3(vadd(x0, vscale(a, 1.6)))); ib.set(x0, v3(vadd(x0, vscale(vadd(a, b), 1.2))));
      m1.set(x0, v3(a), v3(u)); m2.set(x0, v3(vadd(a, b)), v3(u));
      eq.set(planeEq(n, k));
      r.row('eq', 'plane', planeEq(n, k));
      r.row('r1', 'first arrow in it reads', num(Math.round(dot(n, a) * 1000) / 1000), C.good);
      r.row('r2', 'second arrow in it reads', num(Math.round(dot(n, vadd(a, b)) * 1000) / 1000), C.good);
    };
    const mk = (label: string, i: number, lo: number, hi: number) => new Slider({ label, min: lo, max: hi, step: 1, value: i < 3 ? n[i] : k, onInput: (x) => { if (i < 3) { n = [...n] as V3; n[i] = x; } else k = x; show(); } });
    const ss = [mk('$a$', 0, -6, 6), mk('$b$', 1, -6, 6), mk('$c$', 2, -6, 6), mk('$d$', 3, -9, 9)];
    p.dock().append(...ss.map((s) => s.el));
    show();
    const set = (nn: V3, kk: number) => { n = nn; k = kk; [...nn, kk].forEach((x, i) => ss[i].set(x, false)); show(); };
    return {
      holds: () => coeffsOut(n, k),
      describe: () => `the plane ${planeEq(n, k)}: arrows lying in it read 0 against ${fmt(n)}`,
      randomize(rr, edge) {
        const edges: [V3, number][] = [[[6, 3, 2], 6], [[1, -1, 0], 0], [[0, 0, 1], 4]];
        if (edge !== undefined) { set(...edges[edge]); return; }
        let nn: V3;
        do { nn = [rint(rr, -5, 5), rint(rr, -5, 5), rint(rr, -5, 5)]; } while (norm(nn) < 1e-9);
        set(nn, rint(rr, -8, 8));
      },
      edgeCases: 3,
      async showMe() { set([6, 3, 2], 6); },
    };
  },
};

// ------------------------------------------------------------------ the Law

export const law: LawDef<PlaneCase> = {
  ...lawCore,
  frame: ['In $ax + by + cz = d$, the arrow $(a, b, c)$ is ', { slot: 'rel' }, ' the plane, ', { slot: 'when' }, '.'],
  slots: {
    rel: { options: [
      { id: 'perp', text: 'perpendicular to' },
      { id: 'inside', text: 'lying inside' },
      { id: 'deg45', text: 'at 45° to' },
    ] },
    when: { options: [
      { id: 'always', text: 'always' },
      { id: 'd0', text: 'exactly when d is zero' },
    ] },
  },
  cadetSlots: ['rel'],
  draw(g: Game, c: PlaneCase) {
    void g.stage.view3D({ target: besidePanel(g, c.x, 22, -55), distance: 22, azimuth: -55, elevation: 24, ms: 0, orbit: false });
    const [a, b] = inPlaneDirs(c.n);
    const pp = new PlanePatch(g.stage, v3(c.x), [0, 0, 1], { color: '#8fd3ff', size: 5, opacity: 0.12 });
    pp.setSpan(v3(c.x), v3(a), v3(b));
    const u = vscale(c.n, 2 / norm(c.n));
    const lab = new Label(`${planeEq(c.n, c.k)}: the arrow reads ${num(dot(c.n, vsub(c.y, c.x)))}`, v3(vadd(c.x, [0, 0, -2.2])), { color: C.white, size: 16 });
    const tip = v3(vadd(c.x, vscale(u, 1.2)));
    g.stage.world.add(pp.object, new Arrow(v3(c.x), v3(vadd(c.x, u)), { color: '#fff1c2' }).object, new Label('(a, b, c)', tip, { color: '#fff1c2', size: 16 }).object,
      new Arrow(v3(c.x), v3(c.y), { color: C.result }).object, new Dot(v3(c.x), { color: C.white, size: 0.08 }).object, lab.object);
  },
  reason: {
    ask: 'Your Law survived. **Why** do the numbers in front of x, y and z point straight out of the plane?',
    options: [
      { id: 'a', text: 'Two points $X$, $Y$ of the plane both give $\\mathbf n\\cdot X = d$ and $\\mathbf n\\cdot Y = d$. Subtracting, $\\mathbf n\\cdot(X - Y) = 0$: every arrow in the plane reads 0 against $\\mathbf n = (a, b, c)$.', right: true, why: 'Yes. A dot product of zero is a right angle, and $X - Y$ can be any arrow lying in the plane.' },
      { id: 'b', text: '$(a, b, c)$ is a point of the plane.', right: false, why: 'For the door, $6\\cdot 6 + 3\\cdot 3 + 2\\cdot 2 = 49$, not 6: $(6, 3, 2)$ is not on it. It is an arrow, not a point.' },
      { id: 'c', text: 'Because the plane passes through the origin.', right: false, why: '$6x + 3y + 2z = 6$ misses the origin, and $(6, 3, 2)$ still points straight out of it. The value of $d$ only slides the plane.' },
    ],
  },
};

export const compare: CompareDef = {
  id: 'c07',
  page: 'A **line** is a point plus any multiple of a direction: $\\mathbf r = \\mathbf p + t\\mathbf d$. Turning $t$ slides a point along it.\n\nA **plane** is every point $X$ whose arrow from a fixed point $P$ is at a right angle to one arrow $\\mathbf n$ sticking out of it: $\\mathbf n\\cdot(X - P) = 0$. That is a dot product equal to zero. Expanded it reads $ax + by + cz = k$, with the number $k = \\mathbf n\\cdot P$ (the Law called it $d$): one linear equation, so the surface is flat. The numbers $(a, b, c)$ are $\\mathbf n$.\n\nTo find where a path meets a plane, substitute $\\mathbf p + t\\mathbf d$ into the equation and solve for $t$. Two lines in space can miss without being parallel: skew lines.',
  formula: '\\mathbf n\\cdot(X - P) = 0 \\iff ax + by + cz = k \\qquad t = \\frac{k - \\mathbf n\\cdot\\mathbf p}{\\mathbf n\\cdot\\mathbf d}',
  keyIdeas: [
    'Did you say the plane is every point whose arrow from P is at a right angle to the normal?',
    'Did you say the numbers in front of x, y and z are the normal?',
    'Did you say why one linear equation gives something flat?',
  ],
};
