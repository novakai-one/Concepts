// Chapter 15 Briefing (GDD §6.7 Ch 15): Say it, three Doubts (two false, one true), the Law, Ilse's
// page, and the first Teach Teo callback (T1, GDD §4.4) as a Procedure LANTERN plays word for word.
import type { CompareDef, DoubtDef, Game, LawDef, SayItDef, TeoDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { InfLine, Parallelepiped, PlanePatch } from '../../../gfx/shapes';
import { Slider, VectorInput } from '../../../ui/widgets';
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { rint } from '../../../game/lawcheck';
import { col, cross, matVec, rank, vsub } from '../../../math/la';
import { C2 } from '../../truth';
import {
  NULL_DIR, TEO_DECOYS, TEO_ENDS, TEO_NODE, TEO_REF, TEO_TILES, aboveLandingPlane, anywhereHolds, fmtN, fmtV, land, lawCore, len,
  planeIsSubspace, runTeo, sameLandingHolds, type P3, type SolveCase,
} from './logic';
import { GlowLine, Probe, Room, Sheet, VIOLET, inWorld, tv, twinView } from './space';

export const sayit: SayItDef = {
  id: 'c15', who: 'bram',
  ask: 'Why does every solution of $A\\mathbf x = \\mathbf b$ differ from another by a null space vector?',
  frames: {
    see: 'The starts ___ and ___ both landed on ___.',
    means: 'If $A\\mathbf a = A\\mathbf b$, then $A(\\mathbf a - \\mathbf b) =$ ___, so $\\mathbf a - \\mathbf b$ is in the ___.',
    called: 'Every input the matrix sends to the origin is in its ___.',
    cue: 'When you see "how many solutions?", think ___.',
  },
  wordBank: ['violet line', 'landing plane', '(1, 1, −1)', 'difference', 'origin', 'null space', 'column space', 'subspace', 'one solution plus the null space'],
};

// ------------------------------------------------------------------ (F) the pulse can land a point anywhere

export const doubtAnywhere: DoubtDef = {
  id: 'c15-d-anywhere', who: 'bram', isTrue: false,
  claim: 'Start a point in the right place and the pulse can land it anywhere.',
  reason: 'Every landing is a mix of the columns, so it lies on the landing plane $z = x + y$. The point $(1, 1, 1)$ is off that plane: no start lands there.',
  goal: 'Drag the white **target** anywhere (Shift-drag for height). **Challenge it** with a target no start can reach, or **Back it** (Bram will shake it).',
  view: '3d',
  setup(p) {
    const room = new Room(p, { extent: 3 });
    void p.g.stage.view3D({ target: [0.4, 0.4, 1.7], distance: 12.5, azimuth: -60, elevation: 18, ms: 0 });
    const sheet = new Sheet(room, [1, 1, -1], { color: C.result, size: 6, opacity: 0.12 });
    sheet.setOpacity(0.35);
    const r = p.readout('Target');
    const reachA = room.arrow([0, 0, 0], { color: C.result, width: 0.04 });
    const gap = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 0]], { color: C.white, width: 1.8, opacity: 0.85, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    const tag = new Label('', [0, 0, 0], { className: 'act5-pt', offset: [0, -26] });
    p.add(gap, tag);
    let t: P3 = [1, 2, 3];
    const draw = () => {
      const ok = anywhereHolds(t);
      room.setArrow(reachA, t);
      reachA.setOpacity(ok && len(t) > 1e-6 ? 1 : 0);
      const on: P3 = [t[0], t[1], t[0] + t[1]];
      gap.setPoints([room.w(t), room.w(on)]);
      gap.setOpacity(ok ? 0 : 0.85);
      tag.at(room.w(t));
      tag.set(ok ? `${fmtV(t)} · a landing` : `${fmtV(t)} · no start lands here`);
      tag.el.classList.toggle('y', ok);
      r.row('t', 'target', fmtV(t));
      r.row('s', 'a start that lands there', ok ? fmtV([t[0], t[1], 0]) : 'none', ok ? C.result : undefined);
      r.row('o', 'straight up or down to the landing plane', fmtN(Math.abs(aboveLandingPlane(t))));
    };
    const probe = new Probe(p, room, t, { color: C.white, label: 'target', countMoves: false, onMove: (x) => { t = x; draw(); } });
    draw();
    const setT = (x: P3) => { t = x; probe.set(x); draw(); };
    return {
      holds: () => anywhereHolds(t),
      describe: () => (anywhereHolds(t) ? `target ${fmtV(t)}: the start ${fmtV([t[0], t[1], 0])} lands there` : `target ${fmtV(t)}: it is ${fmtN(Math.abs(aboveLandingPlane(t)))} ${aboveLandingPlane(t) < 0 ? 'below the landing plane, straight up' : 'above the landing plane, straight down'}, so no start lands there`),
      randomize(rr, edge) {
        const edges: P3[] = [[1, 1, 1], [0, 0, 1]];
        if (edge !== undefined) { setT(edges[edge]); return; }
        setT([rint(rr, -2, 2), rint(rr, -2, 2), rint(rr, -2, 3)]);
      },
      edgeCases: 2,
      async showMe(stance) { await probe.moveTo(stance === 'challenge' ? [1, 1, 1] : [1, 2, 3], 800); t = probe.pos; draw(); },
    };
  },
};

// ------------------------------------------------------------------ (F) any plane is a subspace

export const doubtPlane: DoubtDef = {
  id: 'c15-d-plane', who: 'bram', isTrue: false,
  claim: 'Any plane is a subspace.',
  reason: 'A subspace must contain the origin: stretch any of its arrows by 0 and you land there. The plane $x + y - z = 1$ misses the origin, so it is not a subspace. Only planes through the origin are.',
  goal: 'Set a plane: its normal and how far it sits from the origin. **Challenge it** with a plane that is not a subspace, or **Back it** (Bram will shake it).',
  view: '3d',
  setup(p) {
    const room = new Room(p, { extent: 3 });
    void p.g.stage.view3D({ target: [0.3, 0.3, 1.4], distance: 12.5, azimuth: -58, elevation: 20, ms: 0 });
    const st = p.g.stage;
    const patch = room.own(new PlanePatch(st, [0, 0, 0], [0, 0, 1], { color: '#9fd8ff', size: 6.5, opacity: 0.14 }));
    const o = new Dot(room.w([0, 0, 0]), { color: C.white, size: 0.09, label: 'origin', labelOffset: [-34, 18] });
    const miss = new FatLine(st, [[0, 0, 0], [0, 0, 0]], { color: C.white, width: 1.8, opacity: 0.85, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    const tag = new Label('', [0, 0, 0], { className: 'act5-pt', offset: [86, -30] });
    p.add(o, miss, tag);
    const r = p.readout('Plane');
    let n: P3 = [1, 1, -1];
    let c = 0;
    const eq = () => {
      const terms = ['x', 'y', 'z'].map((v, i) => ({ v, k: n[i] })).filter((x) => Math.abs(x.k) > 1e-9);
      return terms.map((x, i) => `${i === 0 ? (x.k < 0 ? '−' : '') : x.k < 0 ? ' − ' : ' + '}${Math.abs(x.k) === 1 ? '' : fmtN(Math.abs(x.k))}${x.v}`).join('') + ` = ${fmtN(c)}`;
    };
    const draw = () => {
      const l = len(n);
      if (l < 1e-9) {
        // 0x + 0y + 0z = c is not a plane (all of space when c = 0, nothing otherwise)
        patch.object.visible = false;
        miss.setOpacity(0);
        tag.at(room.w([0, 0, 0]));
        tag.set('no plane');
        tag.el.classList.remove('g');
        r.row('eq', 'plane', 'none: the normal is 0');
        r.row('o', 'contains the origin', '—');
        return;
      }
      patch.object.visible = true;
      const foot = n.map((x) => (x * c) / (l * l)) as P3;
      patch.set(room.w(foot), n);
      const through = planeIsSubspace(n, c);
      miss.setPoints([room.w([0, 0, 0]), room.w(foot)]);
      miss.setOpacity(through ? 0 : 0.85);
      tag.at(room.w(foot));
      tag.set(through ? 'through the origin' : 'misses the origin');
      tag.el.classList.toggle('g', through);
      r.row('eq', 'plane', eq());
      r.row('o', 'contains the origin', through ? 'yes' : 'no', through ? C.good : '#ffb347');
    };
    const input = new VectorInput({ dim: 3, values: n, label: '\\text{normal} =', step: 1, onChange: (v) => { n = v as P3; draw(); } });
    const slider = new Slider({ label: 'right-hand side', min: -3, max: 3, step: 0.5, value: c, onInput: (x) => { c = x; draw(); } });
    p.dock().append(h('div', { class: 'act5-row act5-small' }, input.el), slider.el);
    draw();
    const set = (nn: P3, cc: number) => { n = nn; c = cc; input.set(nn); slider.set(cc, false); draw(); };
    const normals: P3[] = [[0, 0, 1], [1, 1, -1], [1, 0, 0], [1, 2, 1], [0, 1, -1], [2, -1, 1]];
    return {
      holds: () => planeIsSubspace(n, c),
      describe: () => (len(n) < 1e-9
        ? `no plane: the normal is the zero vector (0x + 0y + 0z = ${fmtN(c)} is ${Math.abs(c) < 1e-9 ? 'all of space' : 'empty'})`
        : `the plane ${eq()} ${planeIsSubspace(n, c) ? 'passes through the origin' : 'misses the origin, so it is not a subspace'}`),
      randomize(rr, edge) {
        const edges: [P3, number][] = [[[0, 0, 1], 1], [[1, 1, -1], 1]];
        if (edge !== undefined) { set(...edges[edge]); return; }
        set(normals[rint(rr, 0, normals.length - 1)], rint(rr, -2, 2));
      },
      edgeCases: 2,
      async showMe(stance) {
        const c0 = c, c1 = stance === 'challenge' ? 1 : 0;
        n = [1, 1, -1]; input.set(n);
        await animate(700, (k) => { c = c0 + (c1 - c0) * k; slider.set(c, false); draw(); }, ease.inOut);
        set(n, c1);
      },
    };
  },
};

// ------------------------------------------------------------------ (T) two starts with one landing differ by an arrow sent to the origin

export const doubtSame: DoubtDef = {
  id: 'c15-d-same', who: 'bram', isTrue: true,
  claim: 'If two starts land on the same point, their difference lands on the origin.',
  reason: 'The pulse is linear: $A(\\mathbf a - \\mathbf b) = A\\mathbf a - A\\mathbf b$. If the two landings are equal, that is $\\mathbf 0$. So the difference is in the null space.',
  goal: 'Set two starts $\\mathbf a$ (green) and $\\mathbf b$ (red). **Back it** with two starts that land together (Bram will shake it), or **Challenge it**.',
  view: '3d',
  setup(p) {
    const left = new Room(p, { origin: [-3.9, 0, 0], scale: 0.7, extent: 3, title: 'starts' });
    const right = new Room(p, { origin: [3.9, 0, 0], scale: 0.7, extent: 3, title: 'landings' });
    void twinView(p, { distance: 15.5, target: [0, 0, 1.4] });
    const sheet = new Sheet(right, [1, 1, -1], { color: C.result, size: 5, opacity: 0.1 });
    sheet.setOpacity(0.3);
    const nul = new GlowLine(left, NULL_DIR, { opacity: 0.45 });
    let a: P3 = [2, 0, 1], b: P3 = [3, 1, 0];
    const la = new Dot([0, 0, 0], { color: C.v, size: 0.1 }), lb = new Dot([0, 0, 0], { color: C.w, size: 0.08 });
    const diff = left.arrow([0, 0, 0], { color: VIOLET, label: '$\\mathbf a - \\mathbf b$' });
    const diffLand = new Dot(right.w([0, 0, 0]), { color: VIOLET, size: 0.07 });
    p.add(la, lb, diffLand);
    const r = p.readout('Two starts');
    const draw = () => {
      const A = land(a), B = land(b);
      la.at(right.w(A)); lb.at(right.w(B));
      const dv = vsub(a, b) as P3;
      left.setArrow(diff, dv);
      const same = len(vsub(A, B)) < 1e-6;
      diff.setOpacity(same && len(dv) > 1e-6 ? 1 : 0);
      diffLand.setOpacity(same ? 1 : 0);
      nul.setOpacity(same ? 0.9 : 0.35);
      r.row('a', '$\\mathbf a$ lands at', fmtV(A), C.v);
      r.row('b', '$\\mathbf b$ lands at', fmtV(B), C.w);
      r.row('d', '$\\mathbf a - \\mathbf b$ lands at', fmtV(land(dv)), same ? VIOLET : undefined);
    };
    const ia = new VectorInput({ dim: 3, values: a, label: '\\mathbf a =', step: 1, onChange: (v) => { a = v as P3; pa.set(a); draw(); } });
    const ib = new VectorInput({ dim: 3, values: b, label: '\\mathbf b =', step: 1, onChange: (v) => { b = v as P3; pb.set(b); draw(); } });
    const pa = new Probe(p, left, a, { color: C.v, label: 'a', countMoves: false, onMove: (x) => { a = x; ia.set(x); draw(); } });
    const pb = new Probe(p, left, b, { color: C.w, label: 'b', countMoves: false, onMove: (x) => { b = x; ib.set(x); draw(); } });
    p.dock().append(h('div', { class: 'act5-vecs act5-small' }, ia.el, ib.el));
    draw();
    const set = (x: P3, y: P3) => { a = x; b = y; pa.set(x); pb.set(y); ia.set(x); ib.set(y); draw(); };
    return {
      holds: () => sameLandingHolds(C2, a, b),
      describe: () => {
        const same = len(vsub(land(a), land(b))) < 1e-6;
        return `starts ${fmtV(a)} and ${fmtV(b)} land on ${fmtV(land(a))} and ${fmtV(land(b))}${same ? `; their difference ${fmtV(vsub(a, b))} lands on ${fmtV(land(vsub(a, b)))}` : ': different landings'}`;
      },
      randomize(rr, edge) {
        const edges: [P3, P3][] = [[[1, 0, 0], [1, 0, 0]], [[1, 1, -1], [-2, -2, 2]], [[0, 2, 1], [2, 4, -1]]];
        if (edge !== undefined) { set(...edges[edge]); return; }
        const x: P3 = [rint(rr, -2, 2), rint(rr, -2, 2), rint(rr, -2, 2)];
        const t = [-2, -1, 1, 2][rint(rr, 0, 3)];
        const y: P3 = rr() < 0.75 ? [x[0] + t, x[1] + t, x[2] - t] : [rint(rr, -2, 2), rint(rr, -2, 2), rint(rr, -2, 2)];
        set(x, y);
      },
      edgeCases: 3,
      async showMe() { await Promise.all([pa.moveTo([2, 0, 1], 600), pb.moveTo([3, 1, 0], 600)]); set([2, 0, 1], [3, 1, 0]); },
    };
  },
};

// ------------------------------------------------------------------ the Law

const drawCase = (g: Game, c: SolveCase) => {
  const m = c.A.length;
  const cols = c.A[0].map((_, j) => col(c.A, j));
  const to3 = (v: number[]): V3 => [v[0], v[1], m === 3 ? v[2] : 0];
  const L = Math.max(2, ...cols.map((v) => len(v)), len(c.b));
  if (m === 3) void g.stage.view3D({ target: [0, 0, 0.5], distance: 3.4 * L + 4, azimuth: -60, elevation: 22, ms: 0, orbit: false });
  else void g.stage.view2D({ center: [0, 0], height: 2.6 * L + 2, ms: 0 });
  const add = (o: { object: import('three').Object3D; dispose(): void }) => inWorld(g, o);
  const rk = rank(c.A);
  if (m === 3 && rk === 2) {
    const js = [0, 1, 2].filter((j) => j < cols.length);
    let n: number[] = [0, 0, 1];
    for (let i = 0; i < js.length; i++) for (let k = i + 1; k < js.length; k++) { const x = cross(cols[i], cols[k]); if (len(x) > 1e-9) n = x; }
    add(new PlanePatch(g.stage, [0, 0, 0], n as V3, { color: C.result, size: 2.4 * L, opacity: 0.12 }));
  } else if (rk === 1) {
    const d0 = cols.find((v) => len(v) > 1e-9)!;
    add(new InfLine(g.stage, [0, 0, 0], to3(d0), { color: C.result, width: 2, opacity: 0.5, dashed: true }));
  }
  cols.forEach((v, j) => { if (len(v) > 1e-9) add(new Arrow([0, 0, 0], to3(v), { color: [C.v, C.w, C.u][j] ?? C.u, label: `$\\mathbf a_${j + 1}$` })); });
  add(new Arrow([0, 0, 0], to3(c.b), { color: C.white, label: '$\\mathbf b$', width: 0.04 }));
};

export const law: LawDef<SolveCase> = {
  ...lawCore,
  frame: ['$A\\mathbf x = \\mathbf b$ has a solution exactly when $\\mathbf b$ is ', { slot: 'rel' }, ' the ', { slot: 'space' }, ' of $A$.'],
  slots: {
    rel: { options: [{ id: 'in', text: 'in' }, { id: 'notin', text: 'not in' }, { id: 'perp', text: 'at right angles to' }] },
    space: { options: [{ id: 'col', text: 'column space' }, { id: 'null', text: 'null space' }] },
  },
  cadetSlots: ['space'],
  draw: drawCase,
  reason: {
    ask: 'Your Law survived. **Why** does a solution exist exactly when $\\mathbf b$ is in the column space?',
    options: [
      { id: 'a', text: '$A\\mathbf x = x_1\\mathbf a_1 + \\dots + x_n\\mathbf a_n$ is a mix of the columns. A solution gives weights that make $\\mathbf b$; weights that make $\\mathbf b$ are a solution.', right: true, why: 'Yes. Solving $A\\mathbf x = \\mathbf b$ asks which mix of the columns makes $\\mathbf b$. The column space is every mix.' },
      { id: 'b', text: 'If $A$ sends $\\mathbf b$ to the origin, a solution exists.', right: false, why: 'That is about $\\mathbf b$ as an input. The question is whether $\\mathbf b$ is an output. For a 2 × 3 matrix, $\\mathbf b$ is not even the right size to be an input.' },
      { id: 'c', text: 'A matrix with no zero entries reaches every point.', right: false, why: '$\\begin{bmatrix}1 & 1\\\\ 1 & 1\\end{bmatrix}$ has no zero entries, but both columns are $(1, 1)$, so it only reaches the line $y = x$ and misses $(1, 0)$. Reach is the span of the columns, not the entries.' },
    ],
  },
};

export const compare: CompareDef = {
  id: 'c15',
  page: 'The **column space** $\\operatorname{Col} A$ is the span of the columns: every point $A\\mathbf x$ can reach. So $A\\mathbf x = \\mathbf b$ has a solution **exactly when $\\mathbf b$ is in $\\operatorname{Col} A$**.\n\nThe **null space** $\\operatorname{Nul} A$ is every input the matrix sends to the origin: the solutions of $A\\mathbf x = \\mathbf 0$. Reduce $A$ and read one arrow per free variable.\n\nIf $A\\mathbf a = A\\mathbf b$, then $A(\\mathbf a - \\mathbf b) = A\\mathbf a - A\\mathbf b = \\mathbf 0$. So two solutions of $A\\mathbf x = \\mathbf b$ always differ by a null space vector. When $\\mathbf b$ is in $\\operatorname{Col} A$, the solution set is **one solution plus the null space**: one point, a line, a plane or all of space. When it is not, there is no solution.\n\nBoth are **subspaces**: each contains $\\mathbf 0$ and every sum and stretch of its vectors.',
  formula: '\\mathbf x = \\cy{\\mathbf p} + \\tv{\\mathbf n}, \\qquad A\\tv{\\mathbf n} = \\mathbf 0'.replace(/\\tv\{([^}]*)\}/g, (_, s: string) => tv(s)),
  keyIdeas: [
    'Did you say the difference of two solutions lands on the origin?',
    'Did you say why: $A(\\mathbf a - \\mathbf b) = A\\mathbf a - A\\mathbf b$?',
    'Did you say what that means for how many solutions there are?',
  ],
};

// ------------------------------------------------------------------ Teach Teo (T1)

export const teo: TeoDef = {
  id: 'c15-teo',
  ask: 'Are my struts still holding volume?',
  title: 'Answer Teo’s last message',
  brief: 'Order the steps of a short message for the stern channel. LANTERN plays it on his struts the way he would follow it, word for word: node $(2, 1, 1)$; strut ends $(3, 2, 1)$, $(2, 2, 2)$, $(3, 3, 2)$.',
  tiles: TEO_TILES,
  decoys: TEO_DECOYS,
  reference: TEO_REF,
  async run(g, ids) {
    g.stage.clearWorld();
    void g.stage.view3D({ target: [2.3, 1.9, 1.1], distance: 9.5, azimuth: -55, elevation: 20, ms: 500, orbit: true });
    const res = runTeo(ids);
    inWorld(g, new Dot(TEO_NODE, { color: C.white, size: 0.11, label: 'Teo’s node', labelOffset: [0, 24] }));
    for (const e of TEO_ENDS) inWorld(g, new Dot(e, { color: '#c8d0e0', size: 0.07 }));
    // the struts themselves (grey rods)
    for (const e of TEO_ENDS) inWorld(g, new FatLine(g.stage, [TEO_NODE, e], { color: '#8f9bb3', width: 5, opacity: 0.55 }));
    await wait(500);
    const tail: V3 = res.usedPositions ? [0, 0, 0] : TEO_NODE;
    const vs = TEO_ENDS.map((e) => (res.usedPositions ? e : (vsub(e, TEO_NODE) as V3)));
    const arrows = vs.map((v, i) => new Arrow(tail, [tail[0] + v[0], tail[1] + v[1], tail[2] + v[2]], { color: [C.v, C.w, C.u][i], width: 0.045 }));
    for (const a of arrows) { inWorld(g, a); await a.grow(350); }
    if (res.vol !== null && !ids.includes('x2')) {
      const box = new Parallelepiped(g.stage, [0, 0, 0], [0, 0, 0], [0, 0, 0], { color: res.flat ? VIOLET : C.result, opacity: 0.16 });
      box.group.position.set(...tail);
      inWorld(g, box);
      await animate(900, (k) => box.set(vs[0].map((x) => x * k) as V3, vs[1].map((x) => x * k) as V3, vs[2].map((x) => x * k) as V3), ease.out);
      inWorld(g, new Label(`volume ${fmtN(res.vol)}`, [tail[0] + 1.6, tail[1] + 2.2, tail[2] + 2.0], { className: `act5-pt ${res.flat ? 'v' : 'y'}` }));
    }
    sfx[res.ok ? 'success' : 'miss']();
    const lead = '**Followed word for word:**';
    if (res.ok) return { ok: true, message: `${lead} he takes the strut arrows from his node, (1, 1, 0), (0, 1, 1) and (1, 2, 1). Crosses the first two: (1, −1, 1). Dots with the third: **0**. He reads zero as flat and keeps his weight off those struts.` };
    if (ids.includes('x2')) return { ok: false, message: `${lead} he adds the three arrows and measures the length. A length is not a volume: a flat box can have a long diagonal. He would lean on them. Cross two arrows, then dot with the third.` };
    if (res.missing === 'k2' || res.missing === 'k3') return { ok: false, message: `${lead} he has three arrows and no way to turn them into one number. He stops. Say to **cross two, then dot with the third**: the volume of the box they make.` };
    if (res.usedPositions && res.vol !== null) return { ok: false, message: `${lead} he takes the end points as they are: (3, 2, 1), (2, 2, 2), (3, 3, 2). Cross and dot: **${fmtN(res.vol)}**. Not zero, so he trusts struts that hold no volume. The struts start at his node: say to take each end **minus the node**.` };
    if (res.missing === 'k4') return { ok: false, message: `${lead} he gets 0 and does not know what it means. Say that **zero means flat**: no volume, keep off them.` };
    return { ok: false, message: `${lead} the steps come in the wrong order. Measure from the node, cross, dot, then read zero as flat.` };
  },
};

export { matVec };
