// Chapter 17 Briefing (GDD §6.8 Ch 17): Say it, three Doubts (two false, one true), the Law, Ilse's page,
// and the Teach Teo callback T2 (GDD §4.4). Also the grid-with-handles scene the Review reuses.
import type { CompareDef, DoubtDef, LawDef, PuzzleCtx, SayItDef, TeoDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot, Pad, glowSprite } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { Grid2D } from '../../../gfx/grid';
import { Outline2D, Parallelogram } from '../../../gfx/shapes';
import { VectorHandle } from '../../../kit/handle';
import { MatrixInput } from '../../../ui/widgets';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { rint } from '../../../game/lawcheck';
import { P2, R2, T } from '../../truth';
import { col, det, fromCols, matVec, type Mat } from '../../../math/la';
import { AnchorPath, COPPER, CopperGrid, SHIP_GRID, tag } from './grids';
import {
  B1, B2, P1_SHIP, PC, TEO_HATCH, TEO_POS, TEO_REF, teoView, anchorOf, fmtN, fmtV, inGrid, lawCore, motionIn, namesPoints,
  needsRightHolds, runTeo, sameMotionHolds, similarAreaHolds, texSmall, type GridCase,
} from './logic';

const v3 = (v: readonly number[], z = 0): V3 => [v[0], v[1], z];
const deg = (a: readonly number[], b: readonly number[]) => {
  const d = Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]) || 1))));
  return Math.round((d * 180) / Math.PI);
};

export const sayit: SayItDef = {
  id: 'c17', who: 'bram',
  ask: 'Why is the matrix of $T$ in basis $\\mathcal B$ equal to $P^{-1}AP$ and not $PAP^{-1}$?',
  frames: {
    see: 'The same buoy had numbers ___ in our grid and ___ in the Anchor’s grid. The buoy did not ___.',
    means: 'To do a move written in another grid: translate ___, move, translate ___. The matrix on the ___ acts first.',
    called: 'The numbers are called ___. Two descriptions of one move are called ___ matrices.',
    cue: 'When two people give the same point different numbers, think ___.',
  },
  wordBank: ['copper grid', 'Anchor’s arms', 'buoy', 'did not move', 'translate in', 'translate back', 'right-hand', 'coordinates', 'similar', 'change of basis'],
};

// ------------------------------------------------------------------ a grid you can drag (Doubts and the Review)

/** Our grid, a copper grid on two draggable arrows b₁ (green) and b₂ (red). */
export function gridHandles(p: PuzzleCtx, G0: Mat, o: { onChange?: (G: Mat) => void; labels?: [string, string] } = {}) {
  p.grid(SHIP_GRID);
  const copper = new CopperGrid(p.g.stage, { M: G0 });
  p.add(copper);
  const listeners: ((G: Mat) => void)[] = o.onChange ? [o.onChange] : [];
  let G: Mat = G0.map((r) => r.slice());
  const sync = () => {
    G = fromCols([h1.vec.slice(0, 2), h2.vec.slice(0, 2)]);
    copper.segs.object.visible = Math.abs(det(G)) > 1e-6;
    if (copper.segs.object.visible) copper.set(G);
    listeners.forEach((f) => f(G));
  };
  const h1 = new VectorHandle(p, { to: v3(col(G0, 0)), color: C.v, label: o.labels?.[0] ?? '$\\mathbf b_1$', countMoves: false, limit: 4, onChange: () => sync() });
  const h2 = new VectorHandle(p, { to: v3(col(G0, 1)), color: C.w, label: o.labels?.[1] ?? '$\\mathbf b_2$', countMoves: false, limit: 4, onChange: () => sync() });
  return {
    copper,
    get G(): Mat { return G; },
    set(M: Mat) { h1.arrow.setTo(v3(col(M, 0))); h2.arrow.setTo(v3(col(M, 1))); sync(); },
    /** Animate to a new grid, each arrow straight (a shear stays a shear). */
    async to(M: Mat, ms = 800) {
      const a0 = h1.vec, b0 = h2.vec, a1 = col(M, 0), b1 = col(M, 1);
      await animate(ms, (k) => { h1.arrow.setTo([a0[0] + (a1[0] - a0[0]) * k, a0[1] + (a1[1] - a0[1]) * k, 0]); h2.arrow.setTo([b0[0] + (b1[0] - b0[0]) * k, b0[1] + (b1[1] - b0[1]) * k, 0]); sync(); }, ease.inOut);
      this.set(M);
    },
    onChange(f: (G: Mat) => void) { listeners.push(f); f(G); },
  };
}

/** A random grid for the Shake: whole numbers, never flat. */
export function randGrid(r: () => number, lo = -2, hi = 2): Mat {
  let G: Mat;
  do { G = [[rint(r, lo, hi), rint(r, lo, hi)], [rint(r, lo, hi), rint(r, lo, hi)]]; } while (Math.abs(det(G)) < 1);
  return G;
}

// ------------------------------------------------------------------ (F) "A grid needs right angles to name points."

export const doubtRight: DoubtDef = {
  id: 'c17-d-right', who: 'bram', isTrue: false,
  claim: 'A grid needs right angles to name points. Lean the arrows and the numbers stop meaning anything.',
  reason: 'Any two arrows that are not on one line reach every point, with exactly one set of amounts. The Anchor’s arms are 45° apart and still name the buoy $(3, 2)$: one $\\mathbf b_1$ and two $\\mathbf b_2$. Right angles make the numbers easy to read off; they are not needed.',
  goal: 'Drag the grid arrows. The yellow point is named by the amounts of each arrow that reach it. **Challenge it** (a slanted grid that still names it) or **Back it**.',
  view: '2d',
  setup(p) {
    void p.g.stage.view2D({ center: [1.4, 1.8], height: 8.5, ms: 0 });
    const pt = new Dot(v3(P1_SHIP, 0.05), { color: C.result, size: 0.12 });
    p.add(pt);
    const path = new AnchorPath(p, [[1, 0], [0, 1]], { showTag: false });
    const r = p.readout('The grid');
    const gh = gridHandles(p, [[1, 0], [0, 1]]);
    gh.onChange((G) => {
      const b1 = col(G, 0), b2 = col(G, 1);
      const named = namesPoints(b1, b2);
      path.setGrid(G);
      if (named) { path.show(true); path.set(anchorOf(P1_SHIP, G)!); } else path.show(false);
      r.row('ang', 'angle between the arrows', named ? `${deg(b1, b2)}°` : 'on one line', named ? C.white : C.orange);
      r.row('num', 'numbers of the point', named ? fmtV(anchorOf(P1_SHIP, G)!) : 'none: one line cannot reach it', named ? COPPER : C.orange);
    });
    return {
      holds: () => needsRightHolds(col(gh.G, 0), col(gh.G, 1)),
      describe: () => { const G = gh.G, b1 = col(G, 0), b2 = col(G, 1); return namesPoints(b1, b2) ? `arrows ${fmtV(b1)} and ${fmtV(b2)}, ${deg(b1, b2)}° apart: the point ${fmtV(P1_SHIP)} is ${fmtV(anchorOf(P1_SHIP, G)!)} in this grid` : `arrows ${fmtV(b1)} and ${fmtV(b2)} lie on one line and name nothing off it`; },
      randomize(rr, edge) { gh.set(edge === 0 ? P2 : randGrid(rr)); },
      edgeCases: 1,
      async showMe() { await gh.to(P2, 900); },
    };
  },
};

// ------------------------------------------------------------------ (T) "Two similar matrices scale area by the same amount."

export const doubtArea: DoubtDef = {
  id: 'c17-d-area', who: 'bram', isTrue: true,
  claim: 'Write a move in any grid you like. It still scales area by the same amount.',
  reason: 'Written in the grid with arrows $P$, the move $A$ becomes $P^{-1}AP$, and $\\det(P^{-1}AP) = \\det P^{-1}\\cdot\\det A\\cdot\\det P = \\det A$ because $\\det P^{-1} = 1/\\det P$. Area scaling does not depend on the grid you count in: that is why the spire numbers forecast the volume exactly.',
  goal: 'Set a move $A$ and drag the grid arrows. The yellow tile is what $A$ does to a square of our grid; the copper tile, to a cell of the copper grid. **Back it** (Bram will shake it) or **Challenge it**.',
  view: '2d',
  setup(p) {
    void p.g.stage.view2D({ center: [0.6, 1.2], height: 9, ms: 0 });
    let A: Mat = T.map((r) => r.slice());
    const ours = new Parallelogram(p.g.stage, [1, 0, 0], [0, 1, 0], { color: C.result, opacity: 0.16 });
    const cell = new Parallelogram(p.g.stage, [1, 0, 0], [0, 1, 0], { color: COPPER, opacity: 0.14 });
    p.add(ours, cell);
    const r = p.readout('Area scale');
    const gh = gridHandles(p, P2);
    const draw = () => {
      const G = gh.G;
      ours.set(v3(col(A, 0), 0.01), v3(col(A, 1), 0.01));
      const ok = Math.abs(det(G)) > 1e-6;
      cell.group.visible = ok;
      if (ok) cell.set(v3(matVec(A, col(G, 0)), 0.012), v3(matVec(A, col(G, 1)), 0.012));
      const B = inGrid(A, G);
      r.row('a', '$A$, in our grid', `$${texSmall(A)}$`, C.result);
      r.row('aa', 'its area scale', `× ${fmtN(det(A))}`, C.result);
      r.row('b', '$P^{-1}AP$, in the copper grid', B ? `$${texSmall(B.map((x) => x.map((y) => Math.round(y * 1000) / 1000)))}$` : 'no grid', COPPER);
      r.row('bb', 'its area scale', B ? `× ${fmtN(det(B))}` : '·', COPPER);
    };
    gh.onChange(() => draw());
    const mi = new MatrixInput({ rows: 2, cols: 2, values: A, label: 'A =', step: 1, onChange: (m) => { A = m; draw(); } });
    mi.el.classList.add('c17-in');
    p.dock().append(mi.el);
    draw();
    const edges: [Mat, Mat][] = [[[[1, 2], [2, 4]], P2], [[[0, 1], [1, 0]], PC], [T, [[3, 0], [1, 1]]]];
    return {
      holds: () => similarAreaHolds(A, gh.G),
      describe: () => { const B = inGrid(A, gh.G); return B ? `$A$ scales area by ${fmtN(det(A))}; in the grid ${fmtV(col(gh.G, 0))}, ${fmtV(col(gh.G, 1))} it is ${texFree(B)}, which scales area by ${fmtN(det(B))}` : 'the grid arrows lie on one line'; },
      randomize(rr, edge) {
        if (edge !== undefined) { const [a, g] = edges[edge]; A = a.map((x) => x.slice()); gh.set(g); }
        else { A = [[rint(rr, -2, 2), rint(rr, -2, 2)], [rint(rr, -2, 2), rint(rr, -2, 2)]]; gh.set(randGrid(rr)); }
        mi.set(A); draw();
      },
      edgeCases: edges.length,
      async showMe() { A = T.map((x) => x.slice()); mi.set(A); await gh.to(P2, 600); draw(); },
    };
  },
};
const texFree = (M: Mat) => `(${M.map((r) => r.map((x) => fmtN(Math.round(x * 1000) / 1000)).join(', ')).join('; ')})`;

// ------------------------------------------------------------------ (F) "Same numbers, same motion."

const PLATE: [number, number][] = [[0, 0], [1, 0], [1, 0.45], [0.45, 0.45], [0.45, 1], [0, 1]];

export const doubtMotion: DoubtDef = {
  id: 'c17-d-motion', who: 'bram', isTrue: false,
  claim: 'Same four numbers, same motion. It shouldn’t matter which grid reads them.',
  reason: 'Read in a grid with arrows $P$, the numbers $R$ move space by $PRP^{-1}$. In the Anchor’s grid Ilse’s quarter turn leans everything: the bow goes to $(1, 1)$, not $(0, 1)$. Same numbers, different motion.',
  goal: 'Ilse’s numbers $R$ act twice: read in our grid (white plate) and read in the copper grid (copper plate). Drag the copper grid’s arrows. **Challenge it** (the plates land apart) or **Back it**.',
  view: '2d',
  setup(p) {
    void p.g.stage.view2D({ center: [0.2, 0.6], height: 8.6, ms: 0 });
    const white = new Outline2D(p.g.stage, PLATE, { color: C.white, opacity: 0.16 });
    const copperPlate = new Outline2D(p.g.stage, PLATE, { color: COPPER, opacity: 0.2 });
    const start = new Outline2D(p.g.stage, PLATE, { color: '#7d8aa5', opacity: 0.06 });
    p.add(start, white, copperPlate);
    white.set(R2);
    const wt = tag('read in our grid', [0, 0, 0], 'w', [0, 0]);
    const ct = tag('read in the copper grid', [0, 0, 0], 'cu', [0, 0]);
    p.add(wt.object, ct.object);
    p.onDispose(() => { wt.dispose(); ct.dispose(); });
    const r = p.readout('Ilse’s numbers, read twice');
    r.row('R', 'the numbers $R$', `$${texSmall(R2)}$`, C.white);
    const gh = gridHandles(p, [[1, 0], [0, 1]]);
    gh.onChange((G) => {
      const m = motionIn(R2, G);
      const plateMid = (M: Mat): V3 => { const q = matVec(M, [0.5, 0.5]); return [q[0], q[1], 0]; };
      wt.at(plateMid(R2)); wt.el.style.translate = '0 -34px';
      if (m) { copperPlate.group.visible = true; copperPlate.set(m); ct.show(true); ct.at(plateMid(m)); ct.el.style.translate = '0 30px'; }
      else { copperPlate.group.visible = false; ct.show(false); }
      r.row('m', 'motion when the copper grid reads them', m ? `$${texSmall(m)}$` : 'no grid', COPPER);
      r.row('same', 'same motion', sameMotionHolds(R2, G) ? 'yes' : 'no', sameMotionHolds(R2, G) ? C.good : C.orange);
    });
    return {
      holds: () => sameMotionHolds(R2, gh.G),
      describe: () => { const m = motionIn(R2, gh.G); return m ? `read in the grid ${fmtV(col(gh.G, 0))}, ${fmtV(col(gh.G, 1))}, the numbers send $(1, 0)$ to ${fmtV(matVec(m, [1, 0]))}; read in ours, to $(0, 1)$` : 'the grid arrows lie on one line'; },
      randomize(rr, edge) { gh.set(edge === 0 ? P2 : randGrid(rr)); },
      edgeCases: 1,
      async showMe() { await gh.to(P2, 900); },
    };
  },
};

// ------------------------------------------------------------------ the Law

export const law: LawDef<GridCase> = {
  ...lawCore,
  frame: ['The matrix whose **columns** are the new grid arrows turns ', { slot: 'dir' }, ', ', { slot: 'when' }, '.'],
  slots: {
    dir: { options: [{ id: 'new-old', text: 'new numbers into old numbers' }, { id: 'old-new', text: 'old numbers into new numbers' }] },
    when: { options: [
      { id: 'always', text: 'always' },
      { id: 'right', text: 'only when the arrows are at right angles' },
      { id: 'unit', text: 'only when the arrows are one step long' },
    ] },
  },
  cadetSlots: ['dir'],
  draw(g, c) {
    const b1 = col(c.G, 0), b2 = col(c.G, 1);
    const x = matVec(c.G, c.c);
    const wrong = matVec(c.G, x);
    g.stage.world.add(
      new Arrow([0, 0, 0], v3(b1), { color: C.v }).object,
      new Arrow([0, 0, 0], v3(b2), { color: C.w }).object,
      new Arrow([0, 0, 0], v3(matVec(c.G, [c.c[0], 0])), { color: C.v, opacity: 0.45, width: 0.03 }).object,
      new Arrow(v3(matVec(c.G, [c.c[0], 0])), v3(x), { color: C.w, opacity: 0.45, width: 0.03 }).object,
      new Dot(v3(x, 0.03), { color: C.result, size: 0.12 }).object,
      new Dot(v3(wrong, 0.03), { color: C.orange, size: 0.08 }).object,
    );
  },
  reason: {
    ask: 'Your Law survived. **Why** does the matrix of new arrows turn new numbers into old ones?',
    options: [
      { id: 'a', text: '$P\\mathbf c = c_1\\mathbf b_1 + c_2\\mathbf b_2$: the new numbers weight the new arrows, and the arrows are written in old numbers, so the sum is the point in old numbers.', right: true, why: 'Yes. A matrix times a vector mixes its columns with the vector’s numbers as weights. Here the columns are the new arrows, so the mix is the point, in old numbers. Going the other way needs $P^{-1}$: solve $P\\mathbf c = \\mathbf x$.' },
      { id: 'b', text: 'Multiplying by $P$ moves the point onto the new grid.', right: false, why: 'The point never moves. $P\\mathbf c$ is the same point, written in the old numbers. Only its description changes.' },
      { id: 'c', text: 'Its columns are the new arrows, so it hands out numbers in the new grid.', right: false, why: 'Its columns are the new arrows **written in old numbers**. Feed it weights on the new arrows and old numbers come out. That is the most common mix-up.' },
    ],
  },
};

export const compare: CompareDef = {
  id: 'c17',
  page: '**Coordinates** are the weights on the grid arrows that reach a point. In the Anchor’s basis $\\mathcal B = \\{\\mathbf b_1, \\mathbf b_2\\}$ the buoy $(3, 2)$ has coordinates $(1, 2)$: $1\\mathbf b_1 + 2\\mathbf b_2 = (3, 2)$. The buoy never moved.\n\nThe matrix $P$ with columns $\\mathbf b_1, \\mathbf b_2$ turns $\\mathcal B$-numbers into standard ones, $\\mathbf x = P[\\mathbf x]_\\mathcal B$. Its inverse goes the other way.\n\nTo write a move $A$ in $\\mathcal B$: turn $\\mathcal B$-numbers into standard ones ($P$), move ($A$), turn back ($P^{-1}$). Right to left, $[A]_\\mathcal B = P^{-1}AP$. $PAP^{-1}$ answers the reverse question: what a move written in $\\mathcal B$ does to standard numbers. I wrote $R$ for our grid; the Anchor read it in $\\mathcal B$ and played $PRP^{-1}$.\n\nMatrices related this way are **similar**: one move, two descriptions. They share what does not depend on the grid: area scale, the sum down the diagonal, how many repeats bring every point home.',
  formula: '[\\mathbf x]_\\mathcal B = P^{-1}\\mathbf x, \\qquad [A]_\\mathcal B = P^{-1}AP, \\qquad \\det(P^{-1}AP) = \\det A',
  keyIdeas: [
    'Did you say the point does not move, only its numbers?',
    'Did you say which way $P$ goes: grid numbers in, standard numbers out?',
    'Did you say the right-hand matrix acts first, so $P$ sits on the right of $A$ in $P^{-1}AP$?',
  ],
};

// ------------------------------------------------------------------ Teach Teo T2 (GDD §4.4)

export const TEO_TILES = [
  { id: 'base', text: 'Measure from the Anchor’s base $(0, 0)$, the point that never moves: your arrow is your position minus the base.' },
  { id: 'cols', text: 'Write the Anchor’s arms $\\mathbf b_1 = (1, 0)$ and $\\mathbf b_2 = (1, 1)$ as the columns of $P$.' },
  { id: 'solve', text: '$P$ turns the Anchor’s numbers into ours. Go the other way: solve $P\\mathbf c$ = your arrow.' },
  { id: 'send', text: 'Send back $\\mathbf c$: how many of $\\mathbf b_1$, then how many of $\\mathbf b_2$.' },
];
export const TEO_DECOYS = [
  { id: 'mul', text: 'Multiply $P$ by your arrow.' },
  { id: 'rows', text: 'Write the Anchor’s arms as the rows of $P$.' },
];

/** Teo's reply to a message, played as he would follow it (the words Teo's channel would carry back). */
export function teoReply(ids: readonly string[]): { ok: boolean; message: string } {
  const res = runTeo(ids);
  const rep = res.report ? fmtV(res.report) : '';
  const end = res.reached ? fmtV(res.reached) : '';
  if (res.ok) return { ok: true, message: `Played as Teo would follow it: he measures from the base, ${fmtV(TEO_POS)}, solves $P\\mathbf c = ${fmtV(TEO_POS)}$ and sends **${rep}**. One $\\mathbf b_1$ and three $\\mathbf b_2$ from the base end on him. The Anchor can find him.` };
  switch (res.fault) {
    case 'hatch': return { ok: false, message: `He measures from the hatch beside him: his suit’s arrow ${fmtV(res.arrow ?? [])}. He sends **${rep}**, and the Anchor counts that from its base: it ends at ${end}, not on him. Say where to measure from: the Anchor’s base.` };
    case 'mul': return { ok: false, message: `He multiplies $P$ by his arrow and sends **${rep}**. Read in the Anchor’s grid that ends at ${end}. $P$ turns the Anchor’s numbers into ours; to go the other way he has to solve.` };
    case 'rows': return { ok: false, message: `He writes the arms as rows and sends **${rep}**. That ends at ${end}. The arms are the **columns** of $P$.` };
    case 'nomatrix': return { ok: false, message: `Your message says to solve with $P$ before it says what $P$ is. He sends his own numbers, **${rep}**, which the Anchor reads as ${end}.` };
    case 'noconvert': return { ok: false, message: `He sends the numbers he has, **${rep}**, unconverted. The Anchor reads them as amounts of its arms: ${end}, not him.` };
    default: return { ok: false, message: 'He works it out and keeps it. Your message never says to send it back.' };
  }
}

export const teo: TeoDef = {
  id: 'c17-teo',
  ask: 'Dr Varga says the Anchor counts on its own grid. Send me my position in it.',
  title: 'Teach Teo: where am I in the Anchor’s grid?',
  brief: `Teo follows your steps exactly. His suit shows ${fmtV(TEO_POS)} in our grid, and his arrow from the stern hatch.`,
  tiles: TEO_TILES,
  decoys: TEO_DECOYS,
  reference: TEO_REF,
  async run(g, ids) {
    const res = runTeo(ids);
    const reply = teoReply(ids);
    g.stage.clearWorld();
    // drawn on the right, beside the message panel, framed to the points this reply uses
    const pts: number[][] = [[0, 0], [...TEO_POS], [...TEO_HATCH]];
    if (res.arrow) { const f = res.from === 'hatch' ? TEO_HATCH : [0, 0]; pts.push([f[0] + res.arrow[0], f[1] + res.arrow[1]]); }
    if (res.reached) pts.push([...res.reached]);
    await g.stage.view2D({ ...teoView(g.stage.size.x, g.stage.size.y, pts), ms: 500 });
    const W = g.stage.world;
    const grid = new Grid2D(g.stage, SHIP_GRID);
    grid.mesh.userData.dispose = () => grid.dispose();
    const copper = new CopperGrid(g.stage, { M: P2 });
    W.add(grid.object, copper.object);
    const lamp = glowSprite('#ffe9c4', 0.9, 0.8);
    lamp.position.set(0, 0, 0.05);
    const teoDot = new Dot(v3(TEO_POS, 0.05), { color: C.white, size: 0.13 });
    const hatch = new Pad(g.stage, v3(TEO_HATCH), { color: '#59e1ff', radius: 0.22 });
    const labels = [
      new Label(`Teo ${fmtV(TEO_POS)}`, v3(TEO_POS), { className: 'c17-pt w', offset: [0, -26] }),
      new Label('stern hatch', v3(TEO_HATCH), { className: 'c17-pt dim', offset: [-6, -24] }),
      new Label('Anchor’s base', [0, 0, 0], { className: 'c17-pt cu', offset: [26, 24] }),
    ];
    W.add(lamp, teoDot.object, hatch.object, ...labels.map((l) => l.object));
    for (const l of labels) l.object.userData.dispose = () => l.dispose();
    const ms = g.headless ? 10 : 600;
    // the arrow he converts, from where he measured
    if (res.arrow) {
      const from = res.from === 'hatch' ? TEO_HATCH : [0, 0];
      const a = new Arrow(v3(from, 0.02), v3(from, 0.02), { color: C.white, width: 0.035, opacity: 0.8 });
      W.add(a.object);
      await a.moveTo(v3([from[0] + res.arrow[0], from[1] + res.arrow[1]], 0.02), ms);
    }
    await wait(g.headless ? 5 : 250);
    // his report, read by the Anchor: c₁ of b₁ then c₂ of b₂ from its base
    if (res.report) {
      const m = matVec(fromCols([B1, B2]), [res.report[0], 0]);
      const a1 = new Arrow([0, 0, 0.03], [0, 0, 0.03], { color: C.v, width: 0.05 });
      const a2 = new Arrow(v3(m, 0.03), v3(m, 0.03), { color: C.w, width: 0.05 });
      W.add(a1.object, a2.object);
      await a1.moveTo(v3(m, 0.03), ms);
      await a2.moveTo(v3(res.reached!, 0.03), ms);
      const end = new Dot(v3(res.reached!, 0.06), { color: res.ok ? C.result : C.orange, size: 0.11 });
      const lab = new Label(`sends ${fmtV(res.report)}`, v3(res.reached!), { className: `c17-pt ${res.ok ? 'y' : 'dim'}`, offset: [0, 26] });
      lab.object.userData.dispose = () => lab.dispose();
      W.add(end.object, lab.object);
      if (!res.ok) {
        const gap = new FatLine(g.stage, [v3(res.reached!, 0.04), v3(TEO_POS, 0.04)], { color: C.orange, width: 2, dashed: true, dashSize: 0.12, gapSize: 0.08 });
        gap.object.userData.dispose = () => gap.dispose();
        W.add(gap.object);
      }
    }
    sfx[reply.ok ? 'success' : 'miss']();
    return reply;
  },
};

