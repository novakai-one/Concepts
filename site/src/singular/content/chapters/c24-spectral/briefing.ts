// Chapter 24 Briefing (GDD §6.11 Ch 24): Say it, three Doubts (two false, one true), the Law, Ilse's page.
// The doubt scenes are reused by the Act IX Review in Chapter 26 where they fit.
import type { CompareDef, DoubtDef, LawDef, PuzzleCtx, SayItDef } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { FatLine } from '../../../gfx/lines';
import { InfLine } from '../../../gfx/shapes';
import { Knob, Sweep, rad as krad } from '../../../kit/geom';
import { MatrixView } from '../../../kit/matrixview';
import { Slider } from '../../../ui/widgets';
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { rint } from '../../../game/lawcheck';
import { eig2, type Mat } from '../../../math/la';
import { PolyPlot } from '../c18-eigen/parts';
import { Surface, v3 } from './act9';
import {
  LAW_ANSWER, LAW_CORE, SHAPE_WORD, circleMaxHolds, circleValue, deg, fmt2, fmtN, lines2, posBowlHolds, rad,
  realEigHolds, shapeOf, symEig, texM, texSmall, type EigCase,
} from './logic';

export const sayit: SayItDef = {
  id: 'c24', who: 'bram',
  ask: 'Why are eigenvectors of a symmetric matrix with different eigenvalues perpendicular?',
  frames: {
    see: 'The brace lines of a ___ panel always met at a ___.',
    means: 'Moving $S$ across the dot product does not change it, because $S^{\\mathsf T} = S$. So $\\lambda(\\mathbf v\\cdot\\mathbf w) = \\mu(\\mathbf v\\cdot\\mathbf w)$, and with $\\lambda \\neq \\mu$, $\\mathbf v\\cdot\\mathbf w$ must be ___.',
    called: 'Writing $S = QDQ^{\\mathsf T}$ is the ___ theorem. A height formula $\\mathbf x^{\\mathsf T}S\\mathbf x$ is a ___.',
    cue: 'When you see a symmetric matrix, think ___.',
  },
  wordBank: ['symmetric', 'right angle', 'perpendicular', 'transpose', 'dot product', 'zero', 'spectral', 'quadratic form', 'bowl', 'saddle', 'eigenvalue signs'],
};

// ------------------------------------------------------------------ a symmetric matrix set by three sliders

function symSliders(p: PuzzleCtx, S0: Mat, onChange: (S: Mat) => void, range = 3) {
  let [a, b, c] = [S0[0][0], S0[0][1], S0[1][1]];
  const M = (): Mat => [[a, b], [b, c]];
  const mk = (label: string, v: number, set: (x: number) => void) => {
    const s = new Slider({ label, min: -range, max: range, step: 0.5, value: v, format: (x) => fmtN(x), onInput: (x) => { set(x); onChange(M()); } });
    return s;
  };
  const sa = mk('$a$', a, (x) => { a = x; }), sb = mk('$b$', b, (x) => { b = x; }), sc = mk('$c$', c, (x) => { c = x; });
  p.dock().append(h('div', { class: 'a9-kick' }, 'S = [[a, b], [b, c]]'), sa.el, sb.el, sc.el);
  return {
    get: M,
    set(S: Mat) { a = S[0][0]; b = S[0][1]; c = S[1][1]; sa.set(a, false); sb.set(b, false); sc.set(c, false); onChange(M()); },
  };
}

const half = (r: () => number, lo: number, hi: number) => rint(r, lo * 2, hi * 2) / 2;
const randSymHalf = (r: () => number, lo = -3, hi = 3): Mat => { const b = half(r, lo, hi); return [[half(r, lo, hi), b], [b, half(r, lo, hi)]]; };

// ------------------------------------------------------------------ (F) "Positive entries mean a bowl."

export const doubtBowl: DoubtDef = {
  id: 'c24-d-bowl', who: 'bram', isTrue: false,
  claim: 'Positive numbers everywhere in the matrix, so the surface is a bowl. Positive entries mean a bowl.',
  reason: 'The shape comes from the eigenvalues, not the entries. $\\begin{bmatrix} 1 & 2 \\\\ 2 & 1 \\end{bmatrix}$ has every entry positive and eigenvalues 3 and $-1$: along $(1, -1)$ the height is $1 - 4 + 1 = -2$. A saddle.',
  goal: 'Set the entries with the sliders. The surface is $z = \\mathbf x^{\\mathsf T}S\\mathbf x$. **Challenge it** (every entry positive, and not a bowl) or **Back it**.',
  view: '3d',
  setup(p) {
    void p.g.stage.view3D({ target: [0, 0, 0], distance: 10.5, azimuth: -60, elevation: 28, ms: 0 });
    const surf = new Surface(p, { S: [[2, 1], [1, 2]], scaleFor: 5, height: 2 });
    surf.showAxes(true);
    const r = p.readout('The surface');
    const paint = (S: Mat) => {
      surf.setS(S);
      const e = symEig(S);
      r.row('m', '$S$', `$${texM(S)}$`);
      r.row('p', 'every entry positive', S.every((row) => row.every((x) => x > 0)) ? 'yes' : 'no');
      r.row('l', 'eigenvalues', e.values.map(fmt2).join(' and '), C.result);
      r.row('s', 'shape', SHAPE_WORD[shapeOf(S)], shapeOf(S) === 'bowl' ? C.white : C.orange);
    };
    const sl = symSliders(p, [[2, 1], [1, 2]], paint);
    paint(sl.get());
    const edges: Mat[] = [[[1, 2], [2, 1]], [[1, 3], [3, 2]]];
    return {
      holds: () => posBowlHolds(sl.get()),
      describe: () => { const S = sl.get(); return `$S = ${texSmall(S)}$: eigenvalues ${symEig(S).values.map(fmt2).join(' and ')}, ${SHAPE_WORD[shapeOf(S)]}`; },
      randomize(rr, edge) { sl.set(edge !== undefined ? edges[edge] : (() => { const b = half(rr, 0.5, 3); return [[half(rr, 0.5, 3), b], [b, half(rr, 0.5, 3)]]; })()); },
      edgeCases: edges.length,
      async showMe(stance) { sl.set(stance === 'challenge' ? [[1, 2], [2, 1]] : [[2, 1], [1, 2]]); },
    };
  },
};

// ------------------------------------------------------------------ (T) "On the unit circle, xᵀSx is never larger than the largest eigenvalue."

export function circleScene(p: PuzzleCtx, S0: Mat, t0: number) {
  void p.g.stage.view2D({ center: [0.6, 0.2], height: 6.2, ms: 0 });
  p.grid({ main: 0.18, base: 0, axis: 0.4 });
  let S = S0, t = t0;
  const circ: V3s = [];
  for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; circ.push([Math.cos(a), Math.sin(a), 0]); }
  const ring = new FatLine(p.g.stage, circ, { color: C.white, width: 1.3, opacity: 0.4, dashed: true, dashSize: 0.08, gapSize: 0.06 });
  p.add(ring.object); p.onDispose(() => ring.dispose());
  const axes = [0, 1].map((i) => { const L = new InfLine(p.g.stage, [0, 0, 0], [1, 0, 0], { color: [C.v, C.w][i], width: 1.6, opacity: 0.45, dashed: true, length: 6 }); p.add(L.object); p.onDispose(() => L.dispose()); return L; });
  const arrow = new Arrow([0, 0, 0.02], [1, 0, 0.02], { color: C.result, width: 0.045, label: '$\\mathbf x$' });
  p.add(arrow);
  const r = p.readout('On the unit circle');
  let plot: PolyPlot | null = null;
  let plotFor: Mat | null = null;
  const plotBox = h('div');
  const knob = new Knob(p, [Math.cos(t), Math.sin(t), 0.03], {
    color: C.result, size: 0.07, countMoves: false,
    constrain: (q) => { const a = Math.atan2(q.y, q.x); t = a; q.set(Math.cos(a), Math.sin(a), 0.03); return q; },
    onMove: () => paint(),
  });
  const paint = () => {
    const e = symEig(S);
    e.vectors.forEach((v, i) => axes[i].set([0, 0, 0], v3(v)));
    arrow.setTo([Math.cos(t), Math.sin(t), 0.02]);
    knob.at([Math.cos(t), Math.sin(t), 0.03]);
    const v = circleValue(S, t);
    r.row('m', '$S$', `$${texM(S)}$`);
    r.row('x', '$\\mathbf x^{\\mathsf T}S\\mathbf x$', fmt2(v), C.result);
    r.row('l', 'largest eigenvalue', fmt2(e.values[0]), v > e.values[0] + 1e-9 ? C.orange : C.white);
    if (!plot || plotFor !== S) {
      plotFor = S;
      plot = new PolyPlot({ lo: 0, hi: 360, ymin: Math.min(-1, e.values[1] - 0.5), ymax: Math.max(1, e.values[0] + 0.5), fn: (a) => circleValue(S, rad(a)), label: 'xᵀSx round the circle', ticks: [90, 180, 270] });
      plotBox.replaceChildren(plot.el);
    }
    plot.at(((deg(t) % 360) + 360) % 360);
  };
  return {
    plotBox, paint,
    get S() { return S; }, get t() { return t; },
    set(S1: Mat, t1: number) { S = S1; t = t1; paint(); },
  };
}
type V3s = [number, number, number][];

export const doubtCircle: DoubtDef = {
  id: 'c24-d-circle', who: 'bram', isTrue: true,
  claim: 'Walk any arrow round the unit circle. xᵀSx never goes above the largest eigenvalue of S.',
  reason: 'Write $\\mathbf x$ in the eigenvector grid: $\\mathbf x^{\\mathsf T}S\\mathbf x = \\lambda_1y_1^2 + \\lambda_2y_2^2$ with $y_1^2 + y_2^2 = 1$. That is a weighted average of the eigenvalues, so it is never more than the largest one, and it equals it at that eigenvector.',
  goal: 'Set $S$ with the sliders and drag $\\mathbf x$ round the circle. **Back it** (Bram will shake it) or **Challenge it** (find a point above the largest eigenvalue).',
  view: '2d',
  setup(p) {
    const sc = circleScene(p, [[2, 1], [1, 2]], rad(45));
    const sl = symSliders(p, [[2, 1], [1, 2]], (S) => sc.set(S, sc.t));
    p.dock().append(sc.plotBox);
    sc.paint();
    const edges: [Mat, number][] = [[[[2, 1], [1, 2]], rad(45)], [[[-1, 0], [0, -2]], rad(30)], [[[3, 0], [0, 3]], rad(200)]];
    return {
      holds: () => circleMaxHolds(sc.S, [Math.cos(sc.t), Math.sin(sc.t)]),
      describe: () => `$S = ${texSmall(sc.S)}$, $\\mathbf x$ at ${Math.round(((deg(sc.t) % 360) + 360) % 360)}°: $\\mathbf x^{\\mathsf T}S\\mathbf x = ${fmt2(circleValue(sc.S, sc.t))}$, largest eigenvalue ${fmt2(symEig(sc.S).values[0])}`,
      randomize(rr, edge) {
        const [S1, t1] = edge !== undefined ? edges[edge] : [randSymHalf(rr), rr() * Math.PI * 2];
        sl.set(S1); sc.set(S1, t1);
      },
      edgeCases: edges.length,
      async showMe() { sl.set([[2, 1], [1, 2]]); sc.set([[2, 1], [1, 2]], rad(45)); },
    };
  },
};

// ------------------------------------------------------------------ (F) "Every real matrix has real eigenvalues."

export const doubtReal: DoubtDef = {
  id: 'c24-d-real', who: 'bram', isTrue: false,
  claim: 'Every matrix of real numbers has real eigenvalues. Symmetric or not, makes no difference.',
  reason: 'A quarter turn keeps no real line, so it has no real eigenvalue: $\\begin{bmatrix} 0 & -1 \\\\ 1 & 0 \\end{bmatrix}$ gives $\\lambda^2 + 1 = 0$, so $\\lambda = \\pm i$. Symmetric matrices always have real eigenvalues; other matrices need not.',
  goal: 'Drag the grid arrows to set a matrix. The sweep lights every line it keeps. **Challenge it** (a real matrix with no real eigenvalue) or **Back it**.',
  view: '2d',
  setup(p) {
    void p.g.stage.view2D({ center: [0.4, 0.4], height: 10, ms: 0 });
    const r = p.readout('Its eigenvalues');
    const sw = new Sweep(p, { M: [[2, 1], [1, 2]], radius: 1.4, start: krad(120), labels: false, trace: false });
    const paint = (M: Mat) => {
      sw.setM(M);
      const e = eig2(M);
      r.row('m', '$A$', `$${texM(M)}$`);
      r.row('e', 'eigenvalues', e.kind === 'real' ? `${fmt2(e.values[0])} and ${fmt2(e.values[1])}` : `$${fmt2(e.re)} \\pm ${fmt2(e.im)}i$`, e.kind === 'real' ? C.result : C.orange);
      r.row('k', 'real lines kept', e.kind === 'real' ? (lines2(M) ? '2' : '1 or every line') : 'none', e.kind === 'real' ? C.white : C.orange);
    };
    const mv = new MatrixView(p, { M: [[2, 1], [1, 2]], draggable: true, snap: 0.5, labels: true, grid: { main: 0.3, base: 0.08, axis: 0.5 }, onChange: (M) => paint(M) });
    paint(mv.get());
    const edges: Mat[] = [[[0, -1], [1, 0]], [[1, -2], [1, -1]]];
    return {
      holds: () => realEigHolds(mv.get()),
      describe: () => { const M = mv.get(), e = eig2(M); return `$A = ${texSmall(M)}$: ${e.kind === 'real' ? `eigenvalues ${fmt2(e.values[0])} and ${fmt2(e.values[1])}` : `eigenvalues $${fmt2(e.re)} \\pm ${fmt2(e.im)}i$, not real`}`; },
      randomize(rr, edge) { mv.set(edge !== undefined ? edges[edge] : [[half(rr, -2, 2), half(rr, -2, 2)], [half(rr, -2, 2), half(rr, -2, 2)]]); },
      edgeCases: edges.length,
      async showMe(stance) { await mv.to(stance === 'challenge' ? [[0, -1], [1, 0]] : [[2, 1], [1, 2]], 900); },
    };
  },
};

// ------------------------------------------------------------------ the Law

export const law: LawDef<EigCase> = {
  ...LAW_CORE,
  frame: [{ slot: 'which' }, ': its eigenvectors ', { slot: 'pairs' }, ' are always ', { slot: 'rel' }, '.'],
  slots: {
    which: { options: [{ id: 'sym', text: 'A symmetric matrix' }, { id: 'real', text: 'A matrix with real eigenvalues' }, { id: 'any', text: 'Any square matrix' }] },
    pairs: { options: [{ id: 'diff', text: 'for different eigenvalues' }, { id: 'any', text: 'for any eigenvalues, the same one included' }] },
    rel: { options: [{ id: 'perp', text: 'perpendicular' }, { id: 'par', text: 'parallel' }] },
  },
  answer: LAW_ANSWER,
  cadetSlots: ['rel'],
  draw(g, c) {
    const L = lines2(c.A);
    if (!L) return;
    L.forEach((u, i) => g.stage.world.add(new Arrow([0, 0, 0], v3(u.map((x) => x * 2.2)), { color: [C.v, C.w][i] }).object));
  },
  reason: {
    ask: 'Your Law survived. **Why** are they perpendicular?',
    options: [
      { id: 'a', text: '$\\lambda(\\mathbf v\\cdot\\mathbf w) = (S\\mathbf v)\\cdot\\mathbf w = \\mathbf v\\cdot(S^{\\mathsf T}\\mathbf w) = \\mathbf v\\cdot(S\\mathbf w) = \\mu(\\mathbf v\\cdot\\mathbf w)$. With $\\lambda \\neq \\mu$, only $\\mathbf v\\cdot\\mathbf w = 0$ fits.', right: true, why: 'Yes. The transpose moves $S$ across the dot product; symmetry means it arrives unchanged. Two different stretches of one number force that number to be zero.' },
      { id: 'b', text: 'A symmetric matrix has a symmetric picture, mirrored across the diagonal.', right: false, why: 'Its entries are mirrored, not its picture: $\\begin{bmatrix} 3 & 0 \\\\ 0 & 1 \\end{bmatrix}$ is symmetric and its eigenvectors are the axes, nowhere near the diagonal.' },
      { id: 'c', text: 'Eigenvectors for different eigenvalues are always perpendicular.', right: false, why: 'Not for every matrix: Chapter 18’s $\\begin{bmatrix} 4 & 1 \\\\ 2 & 3 \\end{bmatrix}$ keeps $(1, 1)$ and $(1, -2)$, 72° apart. Symmetry is what makes the step work.' },
    ],
  },
};

// ------------------------------------------------------------------ Ilse's page

export const compare: CompareDef = {
  id: 'c24',
  page: 'A **symmetric** matrix ($S^{\\mathsf T} = S$) stretches space along **perpendicular** axes, its eigenvectors. If $S\\mathbf v = \\lambda\\mathbf v$ and $S\\mathbf w = \\mu\\mathbf w$, then $\\lambda(\\mathbf v\\cdot\\mathbf w) = (S\\mathbf v)\\cdot\\mathbf w = \\mathbf v\\cdot(S\\mathbf w) = \\mu(\\mathbf v\\cdot\\mathbf w)$, so different eigenvalues force $\\mathbf v\\cdot\\mathbf w = 0$.\n\nThe **spectral theorem** adds that the eigenvalues are real and there are always enough eigenvectors: $S = QDQ^{\\mathsf T}$, turn, stretch, turn back.\n\nIn those axes a **quadratic form** $\\mathbf x^{\\mathsf T}S\\mathbf x$ has no mixed term: $\\lambda_1y_1^2 + \\cdots + \\lambda_ny_n^2$. All eigenvalues positive: a bowl. Mixed signs: a saddle. All negative: an upside-down bowl. On the unit circle it ranges from the smallest eigenvalue to the largest.',
  formula: 'S = QDQ^{\\mathsf T} = \\sum_i \\lambda_i\\mathbf q_i\\mathbf q_i^{\\mathsf T}, \\qquad \\mathbf x^{\\mathsf T}S\\mathbf x = \\sum_i \\lambda_i y_i^2',
  keyIdeas: [
    'Did you say that symmetry lets $S$ move across the dot product unchanged?',
    'Did you say why different eigenvalues force the dot product to be zero?',
    'Did you say that the signs of the eigenvalues, not the entries, decide bowl or saddle?',
  ],
};

