// Chapter 22 Briefing (GDD §6.10 Ch 22): Say it, three Doubts (two false, one true), the Law, LANTERN's
// Procedure (Gram–Schmidt run literally), Ilse's page, and Teach Teo T4 (aim his suit antenna).
// The Gram–Schmidt plane scene is exported for the Act VIII Review (Chapter 23).
import type { CompareDef, DoubtDef, DoubtScene, Game, LawDef, ProcedureDef, PuzzleCtx, SayItDef, TeoDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { Outline2D, PlanePatch } from '../../../gfx/shapes';
import { VectorHandle } from '../../../kit/handle';
import { RightAngle, rightAnglePts } from '../../../kit/geom';
import { C } from '../../../core/theme';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { rint } from '../../../game/lawcheck';
import { col, cross, det, dot, fromCols, gramSchmidt, matVec, norm, normalize, vscale, type Mat, type Vec } from '../../../math/la';
import {
  PROC_REF, PROC_X, TEO_HEADINGS, TEO_REF, TEO_SIGNAL, angleDeg, det1Holds, fmtN, fmtV, gsPlaneHolds, lawCore, perpHolds,
  procMessage, runProcedure, runTeo, teoReply, texM, type QCase,
} from './logic';

const v3 = (v: readonly number[], z = 0): V3 => [v[0], v[1], v[2] ?? z];

export const sayit: SayItDef = {
  id: 'c22', who: 'bram',
  ask: 'Why is $Q^{\\mathsf T}Q = I$ when the columns are orthonormal?',
  frames: {
    see: 'Each arrow lost its ___ on the arrows already done, then was scaled to ___.',
    means: 'Entry $(i, j)$ of $Q^{\\mathsf T}Q$ is the dot product of column ___ with column ___: 1 when they are the same, ___ when they are different.',
    called: 'Building such arrows is called the ___ process.',
    cue: 'When a basis is skewed and you want easy coordinates, think ___.',
  },
  wordBank: ['shadow', 'finished arrow', 'one unit long', 'right angle', 'dot product', 'zero', 'Gram–Schmidt', 'orthonormal', 'transpose'],
};

// ------------------------------------------------------------------ a 2 × 2 move you can drag (Doubts 1 and 2)

function moveScene(p: PuzzleCtx, o: { start: Mat; holds: (M: Mat) => boolean; cases: Mat[]; edges: Mat[]; showMe: Mat; describe?: (M: Mat) => string }): DoubtScene {
  p.grid({ base: 0.14, main: 0.36, axis: 0.6 });
  void p.g.stage.view2D({ center: [0.4, 0.6], height: 7, ms: 0 });
  const sq = new Outline2D(p.g.stage, [[0, 0], [1, 0], [1, 1], [0, 1]], { color: C.accent, opacity: 0.16 });
  const circ: V3[] = [];
  for (let i = 0; i <= 120; i++) { const a = (i / 120) * Math.PI * 2; circ.push([Math.cos(a), Math.sin(a), 0.01]); }
  const ghost = new FatLine(p.g.stage, circ, { color: C.white, width: 1.1, opacity: 0.3, dashed: true, dashSize: 0.08, gapSize: 0.06 });
  const ring = new FatLine(p.g.stage, circ, { color: C.result, width: 2.2, intensity: 1.2 });
  p.add(sq, ghost, ring);
  const r = p.readout('The move');
  let M: Mat = o.start.map((x) => x.slice());
  const sync = () => {
    M = fromCols([h1.vec.slice(0, 2), h2.vec.slice(0, 2)]);
    sq.set(M);
    ring.setPoints(circ.map((q) => v3(matVec(M, [q[0], q[1]]), 0.01)));
    const a = col(M, 0), b = col(M, 1);
    r.row('d', '$\\det$', fmtN(det(M)), C.white);
    r.row('l', 'column lengths', `${fmtN(norm(a))}, ${fmtN(norm(b))}`, Math.abs(norm(a) - 1) < 1e-9 && Math.abs(norm(b) - 1) < 1e-9 ? C.good : C.orange);
    r.row('a', 'angle between columns', norm(a) * norm(b) > 1e-9 ? `${fmtN(angleDeg(a, b), 1)}°` : '—', Math.abs(dot(a, b)) < 1e-9 ? C.good : C.orange);
  };
  const h1 = new VectorHandle(p, { to: v3(col(M, 0)), color: C.v, label: '$A\\mathbf e_1$', snap: p.snap() ?? 0.5, countMoves: false, limit: 3, onChange: () => sync() });
  const h2 = new VectorHandle(p, { to: v3(col(M, 1)), color: C.w, label: '$A\\mathbf e_2$', snap: p.snap() ?? 0.5, countMoves: false, limit: 3, onChange: () => sync() });
  const setM = (A: Mat) => { h1.set(v3(col(A, 0)), [0, 0, 0]); h2.set(v3(col(A, 1)), [0, 0, 0]); sync(); };
  sync();
  return {
    holds: () => o.holds(M),
    describe: () => o.describe?.(M) ?? `$A = ${texM(M)}$: det ${fmtN(det(M))}, columns ${fmtN(norm(col(M, 0)))} and ${fmtN(norm(col(M, 1)))} long, ${fmtN(angleDeg(col(M, 0), col(M, 1)), 1)}° apart`,
    randomize(rr, edge) { setM(edge !== undefined ? o.edges[edge] : o.cases[rint(rr, 0, o.cases.length - 1)]); },
    edgeCases: o.edges.length,
    async showMe() { setM(o.showMe); await wait(200); },
  };
}

const DET1: Mat[] = [[[1, 1], [0, 1]], [[1, 0], [1, 1]], [[2, 1], [1, 1]], [[1, 2], [0, 1]], [[1, -1], [1, 0]], [[2, 3], [1, 2]], [[1, 0], [-2, 1]], [[3, 2], [1, 1]]];
const PERP: Mat[] = [[[2, 0], [0, 2]], [[1, -1], [1, 1]], [[2, 0], [0, 1]], [[1, 2], [2, -1]], [[0, -2], [1, 0]], [[3, 0], [0, 0.5]], [[1, 1], [-1, 1]], [[2, -1], [1, 2]]];

export const doubtDet: DoubtDef = {
  id: 'c22-d-det', who: 'bram', isTrue: false,
  claim: 'Any move with determinant 1 is safe. It keeps area, so it keeps everything.',
  reason: 'Determinant 1 keeps area, not lengths. The shear $\\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\end{bmatrix}$ has determinant 1, but its second column is 1.41 long and the circle becomes an ellipse. A safe move needs columns one unit long and at a right angle.',
  goal: 'Drag the two columns. Yellow: the unit circle after the move. **Challenge it** (determinant 1, and the circle bends) or **Back it**.',
  view: '2d',
  setup(p) {
    return moveScene(p, { start: [[1, 0], [0, 1]], holds: det1Holds, cases: DET1, edges: [[[1, 1], [0, 1]], [[2, 0], [0, 0.5]]], showMe: [[1, 1], [0, 1]] });
  },
};

export const doubtPerp: DoubtDef = {
  id: 'c22-d-perp', who: 'bram', isTrue: false,
  claim: 'Columns at a right angle are enough. Square columns, safe move.',
  reason: 'At a right angle is half of it. $\\begin{bmatrix} 1 & 1 \\\\ -1 & 1 \\end{bmatrix}$ has columns at 90°, each 1.41 long: it turns the circle and makes it bigger. The columns must also be one unit long: orthonormal.',
  goal: 'Drag the two columns. **Challenge it** (columns at a right angle, and the circle still changes) or **Back it**.',
  view: '2d',
  setup(p) {
    return moveScene(p, { start: [[1, 0], [0, 1]], holds: perpHolds, cases: PERP, edges: [[[1, 1], [-1, 1]], [[2, 0], [0, 2]]], showMe: [[2, 0], [0, 2]] });
  },
};

// ------------------------------------------------------------------ (T) "Gram–Schmidt keeps the plane the arrows span."

/** Two arrows you can drag in 3-D, the plane they span, and what Gram–Schmidt makes of them. */
export function gsPlaneScene(p: PuzzleCtx, o: { holds: (x1: Vec, x2: Vec) => boolean }): DoubtScene {
  void p.g.stage.view3D({ target: [0.3, 0.3, 0.4], distance: 11, azimuth: -55, elevation: 28, ms: 0 });
  p.grid({ base: 0.1, main: 0.2, axis: 0.45 });
  const patch = new PlanePatch(p.g.stage, [0, 0, 0], [0, 0, 1], { color: C.u, size: 5, opacity: 0.12 });
  p.add(patch);
  const q1 = new Arrow([0, 0, 0], [1, 0, 0], { color: C.result, width: 0.04, label: '$\\mathbf q_1$' });
  const q2 = new Arrow([0, 0, 0], [0, 1, 0], { color: C.result, width: 0.04, label: '$\\mathbf q_2$' });
  p.add(q1, q2);
  const mark = new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 1, 0], 0.18, { color: C.result });
  const r = p.readout('Gram–Schmidt');
  const sync = () => {
    const a = x1.vec, b = x2.vec;
    const n = cross(a, b);
    const ok = norm(n) > 1e-6;
    patch.object.visible = ok;
    const qs = gramSchmidt([a, b]);
    if (ok) { const [e1, e2] = gramSchmidt([a, b]); patch.setSpan([0, 0, 0], v3(e1), v3(e2)); }
    q1.object.visible = qs.length > 0; q2.object.visible = qs.length > 1;
    if (qs[0]) q1.set([0, 0, 0], v3(qs[0]));
    if (qs[1]) { q2.set([0, 0, 0], v3(qs[1])); mark.set([0, 0, 0], v3(qs[0]), v3(qs[1])); }
    mark.show(qs.length > 1);
    const un = ok ? normalize(n) : [0, 0, 1];
    r.row('n', '$\\mathbf q_1$ against the plane’s normal', qs[0] ? fmtN(dot(qs[0], un), 3) : '—', C.good);
    r.row('m', '$\\mathbf q_2$ against the plane’s normal', qs[1] ? fmtN(dot(qs[1], un), 3) : '—', C.good);
  };
  const x1 = new VectorHandle(p, { to: [2, 0, 1], color: C.v, label: '$\\mathbf x_1$', countMoves: false, limit: 3, onChange: () => sync() });
  const x2 = new VectorHandle(p, { to: [1, 2, 0], color: C.w, label: '$\\mathbf x_2$', countMoves: false, limit: 3, onChange: () => sync() });
  sync();
  return {
    holds: () => o.holds(x1.vec, x2.vec),
    describe: () => { const qs = gramSchmidt([x1.vec, x2.vec]); return `$\\mathbf x_1 = ${fmtV(x1.vec)}$, $\\mathbf x_2 = ${fmtV(x2.vec)}$: $\\mathbf q_1 = ${fmtV(qs[0] ?? [0, 0, 0])}$, $\\mathbf q_2 = ${fmtV(qs[1] ?? [0, 0, 0])}$, both in the plane of $\\mathbf x_1$ and $\\mathbf x_2$`; },
    randomize(rr, edge) {
      const cases: [V3, V3][] = [[[1, 0, 0], [1, 0.1, 0]], [[1, 0, 0], [0, 2, 0]], [[3, 1, 1], [1, 1, 2]]];
      let a: V3, b: V3;
      if (edge !== undefined) [a, b] = cases[edge];
      else do { a = [rint(rr, -2, 2), rint(rr, -2, 2), rint(rr, -2, 2)]; b = [rint(rr, -2, 2), rint(rr, -2, 2), rint(rr, -2, 2)]; } while (norm(cross(a, b)) < 1);
      x1.set(a, [0, 0, 0]); x2.set(b, [0, 0, 0]); sync();
    },
    edgeCases: 3,
    async showMe() { x1.set([2, 0, 1], [0, 0, 0]); await x2.moveTo([1, 2, 0], 500, [0, 0, 0]); sync(); },
  };
}

export const doubtPlane: DoubtDef = {
  id: 'c22-d-plane', who: 'bram', isTrue: true,
  claim: 'Gram–Schmidt keeps the plane. The square arrows span the same plane as the skewed ones.',
  reason: '$\\mathbf q_1$ is $\\mathbf x_1$ scaled, and $\\mathbf q_2$ is $\\mathbf x_2$ minus a multiple of $\\mathbf q_1$, scaled: both are mixes of $\\mathbf x_1$ and $\\mathbf x_2$, so both lie in their plane. Going back, $\\mathbf x_1$ and $\\mathbf x_2$ are mixes of $\\mathbf q_1$ and $\\mathbf q_2$ (that is $A = QR$). Same plane.',
  goal: 'Drag $\\cg{\\mathbf x_1}$ and $\\cr{\\mathbf x_2}$ (Shift-drag for height). The blue patch is their plane; yellow, what Gram–Schmidt makes. **Back it** (Bram will shake it) or **Challenge it**.',
  view: '3d',
  setup(p) { return gsPlaneScene(p, { holds: gsPlaneHolds }); },
};

// ------------------------------------------------------------------ the Law

function drawQ(g: Game, c: QCase): void {
  const Q = c.Q;
  const cols3 = [C.v, C.w, C.u];
  const W = g.stage.world;
  if (Q.length === 2) {
    void g.stage.view2D({ center: [0, 0], height: 7, ms: 0 });
  } else {
    void g.stage.view3D({ target: [0, 0, 0.3], distance: 7, azimuth: -55, elevation: 24, ms: 0, orbit: false });
  }
  Q[0].forEach((_, j) => W.add(new Arrow([0, 0, 0], v3(col(Q, j)), { color: cols3[j] ?? C.white }).object));
  const ring: V3[] = [];
  for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2; ring.push([Math.cos(a), Math.sin(a), 0]); }
  const l = new FatLine(g.stage, ring, { color: C.white, width: 1, opacity: 0.3, dashed: true, dashSize: 0.08, gapSize: 0.06 });
  l.object.userData.dispose = () => l.dispose();
  W.add(l.object);
}

export const law: LawDef<QCase> = {
  ...lawCore,
  frame: ['$Q^{\\mathsf T}Q = I$ exactly when the ', { slot: 'part' }, ' of $Q$ are ', { slot: 'prop' }, '.'],
  slots: {
    part: { options: [{ id: 'cols', text: 'columns' }, { id: 'rows', text: 'rows' }] },
    prop: { options: [{ id: 'both', text: 'one unit long and at right angles to each other' }, { id: 'perp', text: 'at right angles to each other' }, { id: 'unit', text: 'one unit long' }] },
  },
  draw: drawQ,
  reason: {
    ask: 'Your Law survived 500 matrices. **Why** does it hold?',
    options: [
      { id: 'entries', text: 'Entry $(i, j)$ of $Q^{\\mathsf T}Q$ is column $i$ dotted with column $j$. That is 1 on the diagonal exactly when each column is one unit long, and 0 elsewhere exactly when the columns are at right angles.', right: true, why: 'Yes. $Q^{\\mathsf T}Q$ is a table of every dot product between columns. $I$ asks for 1s and 0s, which is the definition of orthonormal.' },
      { id: 'rows', text: 'Transposing swaps rows and columns, so rows and columns always behave the same.', right: false, why: 'Only for a square $Q$. A 3 × 2 $Q$ can have orthonormal columns while its three rows cannot be orthonormal in 2-D.' },
      { id: 'det', text: 'Because $\\det(Q^{\\mathsf T}Q) = 1$.', right: false, why: 'Many matrices have determinant 1 without being $I$: a shear does. The entries must be 1s and 0s.' },
      { id: 'perp', text: 'Columns at right angles make every off-diagonal entry 0, and that is all $I$ needs.', right: false, why: '$I$ also needs 1s on the diagonal: each column dotted with itself, its length squared, must be 1.' },
    ],
  },
};

// ------------------------------------------------------------------ LANTERN's Procedure (vector machine)

const PROC_TILES = [
  { id: 'each', text: 'For each arrow, in order:', py: 'for x in arrows:' },
  { id: 'sub', text: 'Subtract its shadow on each earlier finished arrow.', py: '    for q in done: x = sub(x, shadow(x, q))' },
  { id: 'scale', text: 'Scale it to length 1.', py: '    done.append(scale(1 / length(x), x))' },
];
const PROC_DECOYS = [
  { id: 'subfirst', text: 'Subtract its shadow on the first finished arrow.', py: '    x = sub(x, shadow(x, done[0]))' },
  { id: 'suborig', text: 'Subtract its shadow on each earlier original arrow.', py: '    for y in arrows[:i]: x = sub(x, shadow(x, y))' },
];

export const procedure: ProcedureDef = {
  id: 'c22-proc',
  title: 'Square up three arrows',
  brief: 'Order the steps. LANTERN runs them literally on a new case: $(2, 0, 0)$, $(1, 2, 0)$, $(1, 1, 2)$.',
  tiles: PROC_TILES,
  decoys: PROC_DECOYS,
  reference: PROC_REF,
  async run(g, ids) {
    const res = runProcedure(ids);
    const msg = procMessage(ids);
    g.stage.clearWorld();
    await g.stage.view3D({ target: [-1.1, -0.7, 0.6], distance: 8, azimuth: -52, elevation: 22, ms: g.headless ? 0 : 500, orbit: false });
    const W = g.stage.world;
    const cols = [C.v, C.w, C.u];
    const ghosts = PROC_X.map((x, i) => new Arrow([0, 0, 0], v3(x), { color: cols[i], opacity: 0.3, width: 0.03 }));
    const arrows = PROC_X.map((x, i) => new Arrow([0, 0, 0], v3(x), { color: cols[i], label: `$\\mathbf x_${i + 1}$` }));
    W.add(...ghosts.map((a) => a.object), ...arrows.map((a) => a.object));
    const ms = g.headless ? 5 : 420;
    for (const s of res.steps) {
      if (s.onto) {
        const shadow = vscale(s.onto, dot(s.before, s.onto) / dot(s.onto, s.onto));
        const sa = new Arrow([0, 0, 0], v3(shadow), { color: C.result, width: 0.03, opacity: 0.8 });
        W.add(sa.object);
        await wait(ms * 0.6);
        await arrows[s.arrow].moveTo(v3(s.after), ms, [0, 0, 0]);
        sa.object.removeFromParent(); sa.dispose();
      } else {
        await arrows[s.arrow].moveTo(v3(s.after), ms, [0, 0, 0]);
        sfx.tick(s.arrow);
      }
    }
    res.out.forEach((v, i) => arrows[i].setLabel(`$\\mathbf q_${i + 1}$`));
    if (msg.ok) {
      [[0, 1], [0, 2], [1, 2]].forEach(([i, j]) => {
        const m = new FatLine(g.stage, rightAnglePts([0, 0, 0], res.out[i], res.out[j], 0.16), { color: C.result, width: 1.6 });
        m.object.userData.dispose = () => m.dispose();
        W.add(m.object);
      });
    } else {
      arrows[2].setColor(C.orange);
    }
    sfx[msg.ok ? 'success' : 'miss']();
    return msg;
  },
};

export const compare: CompareDef = {
  id: 'c22',
  page: 'In an **orthonormal basis** each coordinate is one dot product: dotting $\\mathbf x = c_1\\mathbf q_1 + c_2\\mathbf q_2$ with $\\mathbf q_1$ leaves $c_1$, because every other basis arrow is perpendicular and $\\mathbf q_1$ is one unit long.\n\nThe **Gram–Schmidt process** builds such a basis: take the arrows in order, remove from each its shadows on the arrows already finished, and scale what is left to length 1. The span of the first $k$ arrows never changes, so $A = QR$ with $R$ upper triangular.\n\nAn **orthogonal matrix** has orthonormal columns. It moves the grid without stretching or skewing it, so its inverse is its transpose.',
  formula: 'Q^{\\mathsf T}Q = \\begin{bmatrix} \\mathbf q_i\\cdot\\mathbf q_j \\end{bmatrix} = I, \\qquad Q^{-1} = Q^{\\mathsf T}, \\qquad \\mathbf v_k = \\mathbf x_k - \\sum_{j<k}(\\mathbf x_k\\cdot\\mathbf q_j)\\,\\mathbf q_j',
  keyIdeas: [
    'Did you say each entry of $Q^{\\mathsf T}Q$ is one column dotted with another?',
    'Did you say the shadows come off the finished arrows, every earlier one, before scaling?',
    'Did you say why the inverse is the transpose?',
  ],
};

// ------------------------------------------------------------------ Teach Teo (T4): aim the suit antenna

const TEO_TILES = [
  { id: 'unit', text: 'Make each heading arrow one unit long: divide it by its length.' },
  { id: 'check', text: 'Use two headings that read 0 against each other: they are at a right angle.' },
  { id: 'read', text: 'Point along each heading and take its reading: shadow length × heading length.' },
  { id: 'aim', text: 'Aim along reading one × heading one, plus reading two × heading two.' },
];
const TEO_DECOYS = [
  { id: 'max', text: 'Aim along the heading with the biggest reading.' },
  { id: 'half', text: 'Aim halfway between your two headings.' },
];

export const teo: TeoDef = {
  id: 'c22-teo',
  ask: 'My suit antenna gives one reading per heading. How do I point it at your ship?',
  title: 'Teach Teo: point the antenna at the Lantern',
  brief: 'Order the steps; LANTERN plays them as Teo would. His dial’s headings: $(2, 0)$, $(1, 1)$, $(0, 1)$. A reading is the signal dotted with a heading.',
  tiles: TEO_TILES,
  decoys: TEO_DECOYS,
  reference: TEO_REF,
  async run(g, ids) {
    const res = runTeo(ids);
    const reply = teoReply(ids);
    g.stage.clearWorld();
    await g.stage.view2D({ center: [-0.7, 1.9], height: 7.2, ms: g.headless ? 0 : 500 });
    const W = g.stage.world;
    const cols = [C.v, C.w, C.u];
    const teoDot = new Dot([0, 0, 0.05], { color: C.white, size: 0.12 });
    const target = vscale(normalize(TEO_SIGNAL), 4.6);
    const ship = new Dot(v3(target, 0.05), { color: C.accent, size: 0.13 });
    const lt = new Label('Teo', [0, 0, 0], { className: 'a8-pt', offset: [-24, 18] });
    const ll = new Label('Lantern', v3(target), { className: 'a8-pt c', offset: [0, -22] });
    W.add(teoDot.object, ship.object, lt.object, ll.object);
    const ms = g.headless ? 5 : 450;
    const hs = TEO_HEADINGS.map((h0, i) => new Arrow([0, 0, 0.02], v3(h0, 0.02), { color: cols[i], width: 0.04 }));
    const hl = TEO_HEADINGS.map((h0, i) => new Label(fmtV(h0), v3(h0), { className: 'a8-pt', offset: [i === 0 ? 34 : -30, i === 0 ? 14 : -14] }));
    W.add(...hs.map((a) => a.object), ...hl.map((l) => l.object));
    await wait(ms);
    // his headings as he left them (one unit long, if he was told to)
    await Promise.all(hs.map((a, i) => a.moveTo(v3(res.headings[i], 0.02), ms, [0, 0, 0.02])));
    hl.forEach((l, i) => l.at(v3(res.headings[i])));
    if (res.readings) res.readings.forEach((x, i) => hl[i].set(`reads ${fmtN(x)}`));
    await wait(ms);
    if (res.aim) {
      const aim = new Arrow([0, 0, 0.04], [0, 0, 0.04], { color: res.off <= 1 ? C.result : C.orange, width: 0.045 });
      W.add(aim.object);
      await aim.moveTo(v3(vscale(normalize(res.aim), 4.6), 0.04), ms * 1.6, [0, 0, 0.04]);
      if (res.off > 1) {
        const gap = new FatLine(g.stage, [v3(vscale(normalize(res.aim), 4.6), 0.03), v3(target, 0.03)], { color: C.orange, width: 2, dashed: true, dashSize: 0.12, gapSize: 0.08 });
        gap.object.userData.dispose = () => gap.dispose();
        W.add(gap.object);
      }
    }
    sfx[reply.ok ? 'success' : 'miss']();
    return reply;
  },
};
