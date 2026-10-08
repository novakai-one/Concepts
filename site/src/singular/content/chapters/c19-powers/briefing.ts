// Chapter 19 Briefing (GDD §6.9 Ch 19): Say it, three Doubts (two false, one true), the Law, Ilse's page,
// and the Teach Teo callback T3 (GDD §4.4): solve his air-mix system by hand. The doubt scenes are
// reused by the Act VII Review in Chapter 20.
import type { CompareDef, DoubtDef, Game, LawDef, PuzzleCtx, SayItDef, TeoDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { Label } from '../../../gfx/label';
import { FatSegments } from '../../../gfx/lines';
import { MatrixView } from '../../../kit/matrixview';
import { VectorHandle } from '../../../kit/handle';
import { C } from '../../../core/theme';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { rint } from '../../../game/lawcheck';
import { det, eig2, inverse, matMul, matVec, mpow, type Mat, type Vec } from '../../../math/la';
import { LineGrid, v3 } from '../c18-eigen/parts';
import { hideLandingLine } from '../c18-eigen/puzzles';
import { fmt2, texSmall } from '../c18-eigen/logic';
import { randMat } from '../c18-eigen/briefing';
import {
  LAW_CORE, TEO_AUG, TEO_REF, TEO_X, V2, allAtAnchorHolds, crewDiag, diagInvHolds, diagonalisable2, distinctDiagHolds, fmtN, fmtV, runTeo,
  type PowCase,
} from './logic';

const texFree = (M: Mat) => `(${M.map((r) => r.map((x) => fmtN(x)).join(', ')).join('; ')})`;

export const sayit: SayItDef = {
  id: 'c19', who: 'bram',
  ask: 'Why do the $P^{-1}P$ pairs cancel in $A^k$?',
  frames: {
    see: 'In the grid of lines that ___, each pulse only ___ along the grid lines.',
    means: 'Repeating the move repeats the ___, so $A^k = P$ ___ $P^{-1}$. The largest ___ decides the long run.',
    called: 'Writing $A = PDP^{-1}$ is called ___.',
    cue: 'When you see $A^{100}$ or “after n steps”, think ___.',
  },
  wordBank: ['hold', 'stretches', 'translate in', 'translate back', 'cancel', 'D^k', 'eigenvalue', 'diagonalisation', 're-grid'],
};

// ------------------------------------------------------------------ (F) "After fifty pulses everything ends up at the Anchor."

export function anchorScene(p: PuzzleCtx, x0: Vec = [1, 2]) {
  void p.g.stage.view2D({ center: [0.8, 1.6], height: 8.6, ms: 0 });
  const grid = p.grid({ main: 0.3, base: 0.08, axis: 0.5 });
  hideLandingLine(grid);
  const eg = new LineGrid(p.g.stage, [[1, 1], [1, -1]], { half: 6, n: 8, opacity: 0.45 });
  p.add(eg);
  const end = new Dot([0, 0, 0.05], { color: C.result, size: 0.11 });
  const run = new Dot([0, 0, 0.05], { color: C.white, size: 0.07 });
  const trail = new FatSegments(p.g.stage, [[[0, 0, 0], [0, 0, 0]]], { color: C.result, width: 1.4, opacity: 0.6, dashed: true, dashSize: 0.08, gapSize: 0.06 });
  p.add(end, run, trail.object); p.onDispose(() => trail.dispose());
  const anchor = new Dot([0, 0, 0.03], { color: '#ffe9c4', size: 0.09 });
  p.add(anchor);
  const r = p.readout('Fifty pulses');
  r.row('V', 'the pulse', `$${texSmall(V2)}$`);
  const xh = new VectorHandle(p, { to: v3(x0), color: C.v, label: '$\\mathbf x$', countMoves: false, limit: 4, onChange: () => paint() });
  const after = (x: Vec) => matVec(mpow(V2, 50), x);
  const paint = () => {
    const x = xh.vec.slice(0, 2), y = after(x);
    end.at(v3(y, 0.05)); run.at(v3(x, 0.05));
    const segs: [V3, V3][] = [];
    let q = x;
    for (let i = 0; i < 12; i++) { const n = matVec(V2, q); segs.push([v3(q, 0.02), v3(n, 0.02)]); q = n; }
    trail.setSegments(segs);
    r.row('x', 'start $\\mathbf x$', fmtV(x.map((t) => Math.round(t * 100) / 100)), C.v);
    r.row('y', 'after fifty pulses', `(${fmt2(y[0])}, ${fmt2(y[1])})`, C.result);
    r.row('a', 'at the Anchor?', allAtAnchorHolds(x) ? 'yes' : 'no', allAtAnchorHolds(x) ? C.white : C.orange);
  };
  paint();
  return {
    xh, paint, after,
    async play() { let q = xh.vec.slice(0, 2); for (let i = 0; i < 12; i++) { q = matVec(V2, q); run.at(v3(q, 0.05)); await wait(p.g.headless ? 1 : 90); } },
    set(x: Vec) { xh.set(v3(x)); paint(); },
  };
}

export const doubtAnchor: DoubtDef = {
  id: 'c19-d-anchor', who: 'bram', isTrue: false,
  claim: 'After fifty pulses everything ends up at the Anchor. Shrink anything fifty times and it’s gone.',
  reason: 'Only the part along the line with stretch 0.5 shrinks away. The part along $(1, 1)$ has stretch 1: fifty pulses leave it exactly as it was. $(3, 1) = 2(1, 1) + 1(1, -1)$ ends at $(2, 2)$, not at the Anchor.',
  goal: 'Drag the start $\\mathbf x$. The yellow dot is where it is after fifty pulses. **Challenge it** (a start that does not end at the Anchor) or **Back it**.',
  view: '2d',
  setup(p) {
    const sc = anchorScene(p, [1, -1]);
    const edges: Vec[] = [[2, -2], [3, 1]];
    return {
      holds: () => allAtAnchorHolds(sc.xh.vec.slice(0, 2)),
      describe: () => { const x = sc.xh.vec.slice(0, 2), y = sc.after(x); return `start ${fmtV(x)} ends at (${fmt2(y[0])}, ${fmt2(y[1])}) after fifty pulses`; },
      play: () => sc.play(),
      randomize(r, edge) { sc.set(edge !== undefined ? edges[edge] : [rint(r, -3, 3), rint(r, -3, 3)]); },
      edgeCases: edges.length,
      async showMe(stance) { await sc.xh.moveTo(stance === 'challenge' ? [3, 1, 0] : [1, -1, 0], 700); sc.paint(); },
    };
  },
};

// ------------------------------------------------------------------ (F) "Diagonalisable means invertible."

/** A matrix the player drags, with the grid of its lines that hold drawn when there are two. */
export function diagScene(p: PuzzleCtx, M0: Mat, title: string) {
  void p.g.stage.view2D({ center: [0.4, 1.0], height: 9.2, ms: 0 });
  const eg = new LineGrid(p.g.stage, [[1, 0], [0, 1]], { half: 6, n: 8, opacity: 0.5 });
  p.add(eg);
  const r = p.readout(title);
  const paint = (M: Mat) => {
    const e = eig2(M);
    const dd = crewDiag(M);
    eg.object.visible = !!dd && Math.abs(det(dd[0])) > 1e-9;
    if (dd) eg.set(dd[0]);
    r.row('m', '$A$', `$${texSmall(M)}$`);
    r.row('e', 'eigenvalues', e.kind === 'real' ? `${fmt2(e.values[0])} and ${fmt2(e.values[1])}` : `$${fmt2(e.re)} \\pm ${fmt2(e.im)}i$`, C.violet);
    r.row('g', 'diagonalisable?', diagonalisable2(M) ? 'yes: two lines hold' : 'no', diagonalisable2(M) ? C.violet : C.orange);
    r.row('d', '$\\det A$', fmt2(det(M)), Math.abs(det(M)) < 1e-9 ? C.orange : C.white);
  };
  const mv = new MatrixView(p, { M: M0, draggable: true, snap: 0.5, labels: true, onChange: (M) => paint(M) });
  hideLandingLine(mv.grid);
  paint(mv.get());
  return { mv, paint };
}

export const doubtInv: DoubtDef = {
  id: 'c19-d-inv', who: 'bram', isTrue: false,
  claim: 'If a move can be written in a grid of lines that hold, it can be undone. Diagonalisable means invertible.',
  reason: 'The two questions are separate. $\\left[\\begin{smallmatrix} 0 & 0 \\\\ 0 & 1 \\end{smallmatrix}\\right]$ is already diagonal, so it is diagonalisable, and it flattens the plane onto a line: no inverse. The shear is the other way round: invertible, not diagonalisable.',
  goal: 'Drag the grid arrows to set a move. **Challenge it** (diagonalisable but flat) or **Back it**.',
  view: '2d',
  setup(p) {
    const sc = diagScene(p, [[2, 1], [1, 2]], 'Diagonalisable? Invertible?');
    const edges: Mat[] = [[[0, 0], [0, 1]], [[2, 1], [2, 1]]];
    return {
      holds: () => diagInvHolds(sc.mv.get()),
      describe: () => { const M = sc.mv.get(); return `$A$ = ${texFree(M)}: ${diagonalisable2(M) ? 'diagonalisable' : 'not diagonalisable'}, ${Math.abs(det(M)) > 1e-9 ? 'invertible' : 'det 0, so not invertible'}`; },
      randomize(r, edge) { sc.mv.set(edge !== undefined ? edges[edge] : randMat(r)); sc.paint(sc.mv.get()); },
      edgeCases: edges.length,
      async showMe(stance) { await sc.mv.to(stance === 'challenge' ? [[0, 0], [0, 1]] : [[2, 1], [1, 2]], 900); },
    };
  },
};

// ------------------------------------------------------------------ (T) "Two different real eigenvalues: always diagonalisable."

export const doubtDistinct: DoubtDef = {
  id: 'c19-d-distinct', who: 'bram', isTrue: true,
  claim: 'A 2 × 2 with two different real eigenvalues can always be written in a grid of its lines that hold.',
  reason: 'Each real eigenvalue gives a line that holds. Two different stretches cannot share a line (an arrow has one stretch), so the two lines are different and make a grid: $P$ has two independent columns, $\\det P \\neq 0$, and $A = PDP^{-1}$.',
  goal: 'Drag the grid arrows. When the eigenvalues are real and different, the violet dashed grid is built from the two lines that hold. **Back it** (Bram will shake it) or **Challenge it**.',
  view: '2d',
  setup(p) {
    const sc = diagScene(p, [[3, 1], [0, 2]], 'Two different real eigenvalues?');
    const edges: Mat[] = [[[1, 1], [0, 1]], [[0, -1], [1, 0]], [[2, 1], [0, 2]], [[2, 1], [2, 1]]];
    return {
      holds: () => distinctDiagHolds(sc.mv.get()),
      describe: () => { const M = sc.mv.get(), e = eig2(M); return e.kind === 'real' && Math.abs(e.values[0] - e.values[1]) > 1e-9 ? `$A$ = ${texFree(M)}: eigenvalues ${fmt2(e.values[0])} and ${fmt2(e.values[1])}, two lines, $\\det P = ${fmt2(det(crewDiag(M)![0]))}$` : `$A$ = ${texFree(M)} does not have two different real eigenvalues`; },
      randomize(r, edge) { sc.mv.set(edge !== undefined ? edges[edge] : randMat(r, 2)); sc.paint(sc.mv.get()); },
      edgeCases: edges.length,
      async showMe() { await sc.mv.to([[3, 1], [0, 2]], 900); },
    };
  },
};

// ------------------------------------------------------------------ the Law

export const law: LawDef<PowCase> = {
  ...LAW_CORE,
  frame: ['$(PMP^{-1})^k = PM^kP^{-1}$ ', { slot: 'scope' }, ', because ', { slot: 'why' }, '.'],
  slots: {
    scope: { options: [{ id: 'every', text: 'for every square M and invertible P' }, { id: 'diag', text: 'only when M is diagonal' }] },
    why: { options: [
      { id: 'cancel', text: 'each P⁻¹P in the middle cancels to I' },
      { id: 'diagM', text: 'M is diagonal' },
      { id: 'powers', text: 'the powers of P cancel: (PMP⁻¹)ᵏ = PᵏMᵏP⁻ᵏ' },
    ] },
  },
  cadetSlots: ['why'],
  draw(g: Game, c: PowCase) {
    const W = g.stage.world;
    const A = mpow(matMul(matMul(c.P, c.M), inverse(c.P)!), c.k);
    W.add(new Arrow([0, 0, 0], [c.P[0][0], c.P[1][0], 0], { color: C.violet, width: 0.035, opacity: 0.8 }).object);
    W.add(new Arrow([0, 0, 0], [c.P[0][1], c.P[1][1], 0], { color: C.violet, width: 0.035, opacity: 0.8 }).object);
    const s = Math.max(1, Math.abs(A[0][0]), Math.abs(A[1][0]), Math.abs(A[0][1]), Math.abs(A[1][1])) / 3;
    W.add(new Arrow([0, 0, 0.01], [A[0][0] / s, A[1][0] / s, 0.01], { color: C.v }).object);
    W.add(new Arrow([0, 0, 0.01], [A[0][1] / s, A[1][1] / s, 0.01], { color: C.w }).object);
  },
  reason: {
    ask: 'Your Law survived. **Why** do the pairs cancel for any $M$?',
    options: [
      { id: 'a', text: 'Written out, $PMP^{-1}\\,PMP^{-1}\\cdots PMP^{-1}$: each $P^{-1}P$ in the middle is $I$, so the $M$’s meet and only the outer $P$ and $P^{-1}$ are left.', right: true, why: 'Yes. Translating out of the grid and straight back in does nothing, so the copies of $M$ stand side by side: $PM^kP^{-1}$. When $M = D$ is diagonal, $D^k$ is one power per diagonal entry.' },
      { id: 'b', text: 'Because $D$ is diagonal, its powers are easy.', right: false, why: 'That makes $D^k$ quick to compute. The cancelling works for any $M$: a quarter turn in a slanted grid repeats the same way.' },
      { id: 'c', text: 'Because $P$ is invertible, $P^k$ and $P^{-k}$ cancel at the ends.', right: false, why: 'The $P$’s never meet each other: each one sits next to a $P^{-1}$. In general $(PMP^{-1})^k \\neq P^kM^kP^{-k}$.' },
    ],
  },
};

// ------------------------------------------------------------------ Ilse's page

export const compare: CompareDef = {
  id: 'c19',
  page: 'If $A$ has enough eigenvectors to make a grid, put them in the columns of $P$ and their eigenvalues on the diagonal of $D$, **in the same order**. Then $AP = PD$, so $A = PDP^{-1}$: translate into the grid of lines that hold, stretch along each axis, translate back. That is **diagonalisation**.\n\nRepeating the move repeats only the stretching. In $A^k = PDP^{-1}\\,PDP^{-1}\\cdots PDP^{-1}$ every $P^{-1}P$ in the middle is $I$, so $A^k = PD^kP^{-1}$, and $D^k$ raises each diagonal entry to the $k$-th power.\n\nWrite the start in the same grid, $\\mathbf x_0 = c_1\\mathbf v_1 + c_2\\mathbf v_2$. Then $\\mathbf x_k = c_1\\lambda_1^k\\mathbf v_1 + c_2\\lambda_2^k\\mathbf v_2$: the largest $|\\lambda|$ decides the long run.\n\nNot every move has enough lines. The shear keeps one; a turn keeps none with real numbers. Two different real eigenvalues always give two lines.',
  formula: 'A = PDP^{-1} \\implies A^k = PD^kP^{-1}, \\qquad \\mathbf x_k = c_1\\lambda_1^k\\mathbf v_1 + c_2\\lambda_2^k\\mathbf v_2',
  keyIdeas: [
    'Did you say the columns of $P$ are eigenvectors and $D$ holds their eigenvalues in the same order?',
    'Did you say why the pairs cancel: each $P^{-1}P$ in the middle is $I$?',
    'Did you say which eigenvalue decides the long run, and that some moves have too few lines?',
  ],
};

// ------------------------------------------------------------------ Teach Teo T3 (GDD §4.4)

export const TEO_TILES = [
  { id: 'whole', text: 'Every row operation changes the **whole** row, right-hand side included.' },
  { id: 'cols', text: 'Clear below each pivot, one column at a time, left to right.' },
  { id: 'back', text: 'Read from the bottom up: the last row gives one valve, then put it into the row above.' },
  { id: 'check', text: 'Check the three settings in all three gauges before you turn anything.' },
];
export const TEO_DECOYS = [
  { id: 'left', text: 'Change only the numbers on the left. The right-hand side is the answer, so leave it alone.' },
  { id: 'top', text: 'Read from the top row down.' },
];

const augTex = (m: number[][]) => `$\\left[\\begin{array}{ccc|c} ${m.map((r) => r.map((x) => fmtN(Math.round(x * 100) / 100).replace('−', '-')).join(' & ')).join(' \\\\ ')} \\end{array}\\right]$`;

/** The gauges as equations, inline (one line each when it wraps). */
const TEO_EQS = TEO_AUG.map((r) => {
  const terms = ['x', 'y', 'z'].map((v, i) => (r[i] === 1 ? v : `${fmtN(r[i])}${v}`));
  return `$${terms.join(' + ')} = ${fmtN(r[3])}$`;
}).join(', ');

/** Teo's reply, played as he would follow the message. */
export function teoReply(ids: readonly string[]): { ok: boolean; message: string } {
  const r = runTeo(ids);
  const set = r.x ? fmtV(r.x.map((t) => Math.round(t * 100) / 100)) : '';
  if (r.ok) return { ok: true, message: `Bottom row first: $z = 3$, $y = 2$, $x = 1$. ${r.checked ? 'All three gauges read right.' : 'The gauges read right.'}` };
  switch (r.fault) {
    case 'stuck': return { ok: false, message: 'He looks at the bottom gauge, $x + 2y + 3z = 14$: three unknowns. He cannot read anything off it. Your message never says how to clear the rows below each pivot.' };
    case 'rhs': return { ok: false, message: `He clears the left-hand numbers and leaves the right-hand side as it was. His valves come out at ${set}, and the gauges read ${fmtV(r.gauges!.map((t) => Math.round(t * 10) / 10))}, not (6, 11, 14). A row operation has to change the whole row, right side included.` };
    case 'top': return { ok: false, message: 'He starts at the top row: $x + y + z = 6$, still three unknowns. He asks which one to set first. The bottom row has only one.' };
    default: return { ok: false, message: 'He has the staircase and stops: which valve first? Your message never says where to start reading.' };
  }
}

export const teo: TeoDef = {
  id: 'c19-teo',
  ask: 'Dr Varga left me three gauge equations for the air mix. Can you solve them? By hand. My suit says I’m guessing.',
  title: 'Teach Teo: three valves, by hand',
  brief: `Order the steps of a short message. Teo follows them exactly as written on his three gauges, ${TEO_EQS}, valves $x, y, z$.`,
  tiles: TEO_TILES,
  decoys: TEO_DECOYS,
  reference: TEO_REF,
  async run(g, ids) {
    const res = runTeo(ids);
    const reply = teoReply(ids);
    g.stage.clearWorld();
    await g.stage.view2D({ center: [0.4, 1.2], height: 8, ms: 400 });
    const W = g.stage.world;
    const board = new Label(augTex(TEO_AUG), [5.7, 2.2, 0], { className: 'a7-board' });
    const step = new Label('Teo’s three gauges', [3.4, 4.3, 0], { className: 'a7-board step' });
    W.add(board.object, step.object);
    for (const s of res.steps) { step.set(s.label); board.set(augTex(s.aug)); sfx.tick(1); await wait(g.headless ? 2 : 650); }
    // three valves: his settings (bars) against the right ones (rings)
    const xs = [1.9, 2.8, 3.7], base = 0.9;
    TEO_X.forEach((t, i) => {
      W.add(new Dot([xs[i], base + t * 0.6, 0.02], { color: '#7d8aa5', size: 0.07 }).object);
      W.add(new Label(['x', 'y', 'z'][i], [xs[i], base - 0.35, 0], { className: 'a7-tag dim' }).object);
    });
    if (res.x) {
      for (let i = 0; i < 3; i++) {
        const v = Math.max(-1.2, Math.min(4.5, res.x[i]));
        const a = new Arrow([xs[i], base, 0.01], [xs[i], base, 0.01], { color: res.ok ? C.good : C.orange, width: 0.08 });
        W.add(a.object);
        await a.moveTo([xs[i], base + v * 0.6, 0.01], g.headless ? 1 : 450);
      }
    }
    step.set(res.ok ? 'Valves set. The mix holds.' : 'Teo’s reply');
    sfx[reply.ok ? 'success' : 'miss']();
    return reply;
  },
};

