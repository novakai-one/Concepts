// Chapter 25 Briefing (GDD §6.11 Ch 25): Say it, three Doubts (two false, one true), the Law, Ilse's page, and
// Teach Teo T5 (GDD §4.4), which comes before the set piece: why a flattened thing cannot be undone, and why
// Teo can be. The doubt scenes are reused by the Act IX Review in Chapter 26.
import type { CompareDef, DoubtDef, Game, LawDef, PuzzleCtx, SayItDef, TeoDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { FatLine } from '../../../gfx/lines';
import { Dot } from '../../../gfx/markers';
import { Parallelogram, PlanePatch } from '../../../gfx/shapes';
import { UnitCircleImage } from '../../../kit/geom';
import { MatrixView } from '../../../kit/matrixview';
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { rint } from '../../../game/lawcheck';
import { det, eig2, matVec, type Mat } from '../../../math/la';
import { inWorld, tag, v3 } from '../c24-spectral/act9';
import { texSmall } from '../c24-spectral/logic';
import { C2 } from '../../truth';
import {
  LAW_ANSWER, LAW_CORE, P4_A, RAW_ERROR, READINGS, TEO_DECOYS, TEO_REF, TEO_TILES, THIN_DIR, fmtD, runTeo, squareOnlyHolds,
  svDetHolds, svIsEigHolds, svdCanon, unfoldError, type LayerCase,
} from './logic';

export const sayit: SayItDef = {
  id: 'c25', who: 'bram',
  ask: 'Why are the vectors $A\\mathbf v_i$ perpendicular to each other?',
  frames: {
    see: 'The input cross was at a right angle, and at one position its two ___ were at a right angle too.',
    means: '$A\\mathbf v_1\\cdot A\\mathbf v_2 = \\mathbf v_1^{\\mathsf T}A^{\\mathsf T}A\\,\\mathbf v_2$, and $A^{\\mathsf T}A$ is ___, so its eigenvectors are ___.',
    called: 'The lengths $\\sigma_i$ are the ___; writing $A = U\\Sigma V^{\\mathsf T}$ is the ___.',
    cue: 'When you see “compress” or “how unstable is this inverse”, think ___.',
  },
  wordBank: ['images', 'perpendicular', 'symmetric', 'eigenvectors', 'AᵀA', 'singular values', 'turn', 'stretch', 'layers', 'SVD'],
};

const half = (r: () => number, lo: number, hi: number) => rint(r, lo * 2, hi * 2) / 2;
const randM = (r: () => number): Mat => [[half(r, -2, 2), half(r, -2, 2)], [half(r, -2, 2), half(r, -2, 2)]];

/** A draggable 2 × 2 with its circle-to-ellipse picture and both kinds of numbers in a readout. */
function ellipseScene(p: PuzzleCtx, M0: Mat, title: string, extra?: (M: Mat, r: ReturnType<PuzzleCtx['readout']>) => void) {
  void p.g.stage.view2D({ center: [0.3, 0.3], height: 8.6, ms: 0 });
  const r = p.readout(title);
  let ci: UnitCircleImage | null = null;
  const paint = (M: Mat) => {
    if (!ci) ci = new UnitCircleImage(p, { M, grid: null, labels: false });
    else ci.setM(M);
    ci.set(3);
    const s = svdCanon(M).S, e = eig2(M);
    r.row('m', '$A$', `$${texSmall(M)}$`);
    r.row('s', 'singular values', `${fmtD(s[0])} and ${fmtD(s[1])}`, C.result);
    r.row('e', 'eigenvalues', e.kind === 'real' ? `${fmtD(e.values[0])} and ${fmtD(e.values[1])}` : `$${fmtD(e.re)} \\pm ${fmtD(e.im)}i$`);
    extra?.(M, r);
  };
  const mv = new MatrixView(p, { M: M0, draggable: true, snap: 0.5, labels: true, grid: { main: 0.2, base: 0.06, axis: 0.42 }, onChange: (M) => paint(M) });
  paint(mv.get());
  return mv;
}

// ------------------------------------------------------------------ (F) "Singular values are the eigenvalues."

export const doubtEig: DoubtDef = {
  id: 'c25-d-eig', who: 'bram', isTrue: false,
  claim: 'Singular values are the eigenvalues under another name. Same numbers.',
  reason: 'They agree for a symmetric matrix with eigenvalues of 0 or more, and not in general. $\\begin{bmatrix} 3 & 0 \\\\ 4 & 5 \\end{bmatrix}$ has eigenvalues 3 and 5, and singular values 6.71 and 2.24: the singular values are the square roots of the eigenvalues of $A^{\\mathsf T}A$.',
  goal: 'Drag the grid arrows to set a move. The yellow oval is the unit circle’s image. **Challenge it** (a move whose singular values are not its eigenvalues) or **Back it**.',
  view: '2d',
  setup(p) {
    const mv = ellipseScene(p, [[2, 1], [1, 2]], 'Two kinds of numbers');
    const edges: Mat[] = [[[3, 0], [4, 5]], [[1, 1], [0, 1]]];
    return {
      holds: () => svIsEigHolds(mv.get()),
      describe: () => { const M = mv.get(), s = svdCanon(M).S, e = eig2(M); return `$A = ${texSmall(M)}$: singular values ${fmtD(s[0])} and ${fmtD(s[1])}, eigenvalues ${e.kind === 'real' ? `${fmtD(e.values[0])} and ${fmtD(e.values[1])}` : 'not real'}`; },
      randomize(rr, edge) { mv.set(edge !== undefined ? edges[edge] : (() => { const b = half(rr, 0, 2); return [[half(rr, 1, 3), b], [b, half(rr, 1, 3)]]; })()); },
      edgeCases: edges.length,
      async showMe(stance) { await mv.to(stance === 'challenge' ? [[3, 0], [4, 5]] : [[2, 1], [1, 2]], 900); },
    };
  },
};

// ------------------------------------------------------------------ (F) "The SVD only exists for square matrices."

export const doubtSquare: DoubtDef = {
  id: 'c25-d-square', who: 'bram', isTrue: false,
  claim: 'This turn-stretch-turn business only works for square matrices. A 3 × 2 has no such thing.',
  reason: 'Every matrix has an SVD. The 3 × 2 $\\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\\\ 1 & 0 \\end{bmatrix}$ turns the flat circle by $V^{\\mathsf T}$, stretches by $\\sqrt3$ and 1, and sets the result into space along $\\mathbf u_1, \\mathbf u_2$: $A = U\\Sigma V^{\\mathsf T}$ with $U$ 3 × 2.',
  goal: 'Pick a shape. The flat circle and its image are drawn, with the axes the SVD finds. **Challenge it** (a matrix that is not square, with its SVD on screen) or **Back it**.',
  view: '3d',
  setup(p) {
    void p.g.stage.view3D({ target: [0.4, 0.2, 0.3], distance: 8.4, azimuth: -52, elevation: 24, ms: 0 });
    const shapes: { name: string; A: Mat }[] = [
      { name: '2 × 2', A: [[2, 1], [0.5, 1.5]] },
      { name: '3 × 2', A: P4_A },
      { name: 'another 3 × 2', A: [[2, 0], [1, 1], [0, 1]] },
    ];
    let A = shapes[0].A;
    const circ = new FatLine(p.g.stage, Array.from({ length: 129 }, (_, i) => { const a = (i / 128) * Math.PI * 2; return [Math.cos(a), Math.sin(a), 0.005] as V3; }), { color: C.white, width: 1.3, opacity: 0.5, dashed: true, dashSize: 0.09, gapSize: 0.07 });
    const img = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 0]], { color: C.result, width: 2.2 });
    const a1 = new Arrow([0, 0, 0], [1, 0, 0], { color: C.v, width: 0.055, label: '$\\sigma_1\\mathbf u_1$' });
    const a2 = new Arrow([0, 0, 0], [0, 1, 0], { color: C.w, width: 0.055, label: '$\\sigma_2\\mathbf u_2$' });
    p.add(circ.object, img.object, a1, a2); p.onDispose(() => { circ.dispose(); img.dispose(); });
    const r = p.readout('Its SVD');
    const paint = () => {
      const pts = Array.from({ length: 129 }, (_, i) => { const a = (i / 128) * Math.PI * 2; return v3(matVec(A, [Math.cos(a), Math.sin(a)])); });
      img.setPoints(pts);
      const d = svdCanon(A);
      a1.setTo(v3(d.us[0].map((x) => x * d.S[0]))); a2.setTo(v3(d.us[1].map((x) => x * d.S[1])));
      r.row('m', '$A$', `$${texSmall(A)}$ (${A.length} × ${A[0].length})`);
      r.row('s', 'singular values', `${fmtD(d.S[0])} and ${fmtD(d.S[1])}`, C.result);
      r.row('u', '$U$, $\\Sigma$, $V$', `${A.length}×2, 2×2, 2×2`);
    };
    const chips = h('div', { class: 'a9-chips' });
    const pick = (i: number) => { A = shapes[i].A; chips.querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === i)); paint(); };
    shapes.forEach((s, i) => { const b = h('button', { class: `a9-chip ${i === 0 ? 'on' : ''}`, type: 'button' }, s.name); b.addEventListener('click', () => { pick(i); p.move(); }); chips.append(b); });
    p.dock().append(h('div', { class: 'a9-kick' }, 'The matrix'), chips);
    paint();
    return {
      holds: () => squareOnlyHolds(A),
      describe: () => `a ${A.length} × ${A[0].length} matrix: SVD with singular values ${svdCanon(A).S.map((x) => fmtD(x)).join(' and ')}`,
      randomize(rr, edge) { if (edge !== undefined) pick(edge === 0 ? 1 : 2); else { A = randM(rr); chips.querySelectorAll('button').forEach((b) => b.classList.remove('on')); paint(); } },
      edgeCases: 2,
      async showMe(stance) { pick(stance === 'challenge' ? 1 : 0); },
    };
  },
};

// ------------------------------------------------------------------ (T) "For a square matrix, the singular values multiply to |det|."

export const doubtDet: DoubtDef = {
  id: 'c25-d-det', who: 'bram', isTrue: true,
  claim: 'For a square matrix, multiply the singular values and you get the size of the determinant.',
  reason: '$A = U\\Sigma V^{\\mathsf T}$, and turns (or flips) keep areas, so $|\\det A| = |\\det U|\\,\\det\\Sigma\\,|\\det V^{\\mathsf T}| = \\sigma_1\\sigma_2$. The unit circle’s image, an oval with half-axes $\\sigma_1$ and $\\sigma_2$, has area $\\pi\\sigma_1\\sigma_2 = \\pi|\\det A|$.',
  goal: 'Drag the grid arrows. The yellow parallelogram has area $|\\det A|$. **Back it** (Bram will shake it) or **Challenge it**.',
  view: '2d',
  setup(p) {
    let par: Parallelogram | null = null;
    const mv = ellipseScene(p, [[2, 1], [0, 1.5]], 'Stretches and area', (M, r) => {
      if (!par) { par = new Parallelogram(p.g.stage, [M[0][0], M[1][0], 0], [M[0][1], M[1][1], 0], { color: C.result, opacity: 0.12 }); p.add(par); }
      par.set([M[0][0], M[1][0], 0], [M[0][1], M[1][1], 0]);
      const s = svdCanon(M).S;
      r.row('p', '$\\sigma_1\\sigma_2$', fmtD(s[0] * s[1]), C.result);
      r.row('d', '$|\\det A|$', fmtD(Math.abs(det(M))), C.result);
    });
    const edges: Mat[] = [[[1, 2], [2, 4]], [[0, 1], [1, 0]], [[1, 1.5], [0, 1]]];
    return {
      holds: () => svDetHolds(mv.get()),
      describe: () => { const M = mv.get(), s = svdCanon(M).S; return `$A = ${texSmall(M)}$: $\\sigma_1\\sigma_2 = ${fmtD(s[0] * s[1])}$, $|\\det A| = ${fmtD(Math.abs(det(M)))}$`; },
      randomize(rr, edge) { mv.set(edge !== undefined ? edges[edge] : randM(rr)); },
      edgeCases: edges.length,
      async showMe() { await mv.to([[3, 0], [4, 5]].map((r) => r.map((x) => x / 2)), 900); },
    };
  },
};

// ------------------------------------------------------------------ the Law

export const law: LawDef<LayerCase> = {
  ...LAW_CORE,
  frame: ['The best rank-$k$ picture of $A$ keeps the $k$ layers with ', { slot: 'which' }, '. What it leaves out stretches by at most ', { slot: 'err' }, '.'],
  slots: {
    which: { options: [{ id: 'largest', text: 'the largest singular values' }, { id: 'first', text: 'the first-listed singular values' }, { id: 'smallest', text: 'the smallest singular values' }] },
    err: { options: [{ id: 'next', text: 'σₖ₊₁, the largest one left out' }, { id: 'zero', text: 'nothing: the picture is exact' }, { id: 'sum', text: 'the sum of the singular values left out' }] },
  },
  answer: LAW_ANSWER,
  cadetSlots: ['which'],
  draw(g: Game, c: LayerCase) {
    const sorted = c.sigmas.slice().sort((a, b) => b - a);
    const keep = new Set(sorted.slice(0, c.k));
    c.sigmas.forEach((s, i) => {
      const x = -2 + (4 * i) / Math.max(1, c.sigmas.length - 1);
      g.stage.world.add(new FatLine(g.stage, [[x, -2, 0], [x, -2 + s * 0.45, 0]], { color: keep.has(s) ? C.result : C.muted, width: 10 }).object);
    });
  },
  reason: {
    ask: 'Your Law survived. **Why** the largest, and why is the miss $\\sigma_{k+1}$?',
    options: [
      { id: 'a', text: '$A - A_k$ is the sum of the layers left out, $\\sum_{i > k}\\sigma_i\\mathbf u_i\\mathbf v_i^{\\mathsf T}$: its own SVD. Its largest stretch is its largest singular value, $\\sigma_{k+1}$. Leaving out smaller layers leaves a smaller miss.', right: true, why: 'Yes. The left-over layers are perpendicular to each other, so what is left over is itself an SVD with the singular values you dropped. The biggest of them is the biggest miss.' },
      { id: 'b', text: 'The first layers computed are always the most accurate.', right: false, why: 'Order of computing has nothing to do with it. A list of layers in any order gives the same matrix; only their sizes decide how much each one carries.' },
      { id: 'c', text: 'Each layer is a rank-one matrix, so any $k$ of them make rank $k$.', right: false, why: 'True, and it says nothing about which $k$ is best. Keeping the three smallest layers of Teo’s voice gives rank 3 and pure static.' },
    ],
  },
};

// ------------------------------------------------------------------ Ilse's page

export const compare: CompareDef = {
  id: 'c25',
  page: 'Every matrix turns some perpendicular set of input directions into perpendicular output directions, stretched: $A\\mathbf v_i = \\sigma_i\\mathbf u_i$. The reason: $A\\mathbf v_i\\cdot A\\mathbf v_j = \\mathbf v_i^{\\mathsf T}A^{\\mathsf T}A\\,\\mathbf v_j$, and $A^{\\mathsf T}A$ is **symmetric**, so its eigenvectors are perpendicular; with $A^{\\mathsf T}A\\mathbf v_j = \\sigma_j^2\\mathbf v_j$ the product is $\\sigma_j^2(\\mathbf v_i\\cdot\\mathbf v_j) = 0$.\n\nSo any matrix is a **turn, a stretch along axes, and a turn**: $A = U\\Sigma V^{\\mathsf T}$, square or not.\n\nWritten as layers, $A = \\sum\\sigma_i\\mathbf u_i\\mathbf v_i^{\\mathsf T}$. Keeping the $k$ largest gives the closest rank-$k$ matrix, and it misses by $\\sigma_{k+1}$. A singular value of exactly 0 flattens; a tiny one squashes thin, and an inverse multiplies errors in that direction by $1/\\sigma$.',
  formula: 'A = U\\Sigma V^{\\mathsf T} = \\sum_i \\sigma_i\\,\\mathbf u_i\\mathbf v_i^{\\mathsf T}, \\qquad \\sigma_i^2 = \\text{eigenvalues of } A^{\\mathsf T}A',
  keyIdeas: [
    'Did you say that $A\\mathbf v_i\\cdot A\\mathbf v_j$ becomes $\\mathbf v_i^{\\mathsf T}A^{\\mathsf T}A\\,\\mathbf v_j$?',
    'Did you say that $A^{\\mathsf T}A$ is symmetric, so its eigenvectors are perpendicular?',
    'Did you say why keeping the largest layers keeps the most of the picture?',
  ],
};

// ------------------------------------------------------------------ Teach Teo T5 (GDD §4.4)

/** Teo's reply, played as he would follow the message. */
export function teoReply(ids: readonly string[]): { ok: boolean; message: string } {
  const r = runTeo(ids);
  const lead = '**Played as Teo would follow it.**';
  switch (r.fault) {
    case null: return { ok: true, message: `${lead} He holds still through all ${READINGS} readings; the error falls to ${fmtD(unfoldError(READINGS), 1)}. *“So flat would have been gone. Thin only needs quiet. I can do quiet.”*` };
    case 'zero': return { ok: false, message: `${lead} *“Zero is zero. Then I am gone.”* He stops answering for a minute. Zero to two decimal places is not the real thing: tell him what his stretch is, not what it rounds to.` };
    case 'one': return { ok: false, message: `${lead} He holds still for one reading. The undo multiplies its noise by 750, and the test cluster lands ${fmtD(RAW_ERROR, 1)} off. One reading is not enough.` };
    case 'k1': return { ok: false, message: `${lead} *“So anything flat can be undone? Then why did everyone say the stern was gone?”* Your message never says what exactly flat means: two points on one spot, and no undo.` };
    case 'k2': return { ok: false, message: `${lead} *“If I am flat, how can you undo me? And why hold still?”* Say that thin is not flat: an undo exists, and it multiplies every error along the thin line by 750.` };
    case 'k3': return { ok: false, message: `${lead} He knows the undo is risky and not what to do about it. He shifts during the readings, and the test cluster lands ${fmtD(RAW_ERROR, 1)} off. Say to average ${READINGS} readings, and to hold still until the count ends.` };
    default: return { ok: false, message: `${lead} He hears “hold still” before he knows why, and asks what for. Put the reasons first: flat, then thin, then the readings.` };
  }
}

export const teo: TeoDef = {
  id: 'c25-teo',
  ask: 'Why can’t a flattened thing be undone, and why can you undo me?',
  title: 'Teach Teo: thin, not gone',
  brief: 'Order the steps of a short message for the stern channel. Teo follows them exactly as written, then holds still, or does not.',
  tiles: TEO_TILES,
  decoys: TEO_DECOYS,
  reference: TEO_REF,
  async run(g, ids) {
    const res = runTeo(ids);
    const reply = teoReply(ids);
    g.stage.clearWorld();
    await g.stage.view3D({ target: [0, 0, 0.2], distance: 10.5, azimuth: -55, elevation: 22, ms: 400, orbit: true });
    const fast = g.headless;
    const sheet = inWorld(g, new PlanePatch(g.stage, [0, 0, 0], [1, 1, -1], { color: '#9fb6d8', size: 4.4, opacity: 0.7 }));
    void sheet;
    const step = inWorld(g, tag('Teo follows your message', [0, 0, 2.6], 'c'));
    const teoDot = inWorld(g, new Dot([0.4, -0.4, 0], { color: C.white, size: 0.1 }));
    const has = (id: string) => ids.includes(id);
    // flat: two points a step apart along (1, 1, −1) land on one spot
    if (has('flat')) {
      step.set('Exactly flat: two points, one landing spot');
      const a = [1.2, 0.2, 1.2], b = a.map((x, i) => x + [1, 1, -1][i] * 0.9);
      const da = inWorld(g, new Dot(v3(a), { color: C.v, size: 0.09 })), db = inWorld(g, new Dot(v3(b), { color: C.w, size: 0.09 }));
      const ya = matVec(C2, a), yb = matVec(C2, b);
      const s = 0.35;
      await animate(fast ? 1 : 900, (k) => { da.at(v3(a.map((x, i) => x + (ya[i] * s - x) * k))); db.at(v3(b.map((x, i) => x + (yb[i] * s - x) * k))); }, ease.inOut);
      sfx.collapse();
      await wait(fast ? 1 : 500);
    }
    // thin: the undo multiplies an error along the thin line by 750
    if (has('thin')) {
      step.set('Thin, not flat: the undo multiplies errors by 750');
      const err = inWorld(g, new Arrow([0.4, -0.4, 0], [0.4, -0.4, 0.001], { color: C.orange, width: 0.05 }));
      const end = [0.4, -0.4, 0].map((x, i) => x + THIN_DIR[i] * 3.2);
      await err.moveTo(v3(end), fast ? 1 : 1000);
      inWorld(g, tag('× 750', v3(end.map((x, i) => x + [0.3, 0.3, 0.2][i])), 'o'));
      await wait(fast ? 1 : 400);
    }
    // the readings: he holds still (or does not)
    if (has('avg') || has('one')) {
      const n = has('one') ? 1 : READINGS;
      const still = res.ok || res.fault === 'order';
      for (let i = 0; i <= 10; i++) {
        step.set(`Readings: ${Math.round((n * i) / 10)} of ${n}`);
        if (!still) teoDot.at([0.4 + (Math.sin(i * 2.1) * 0.25), -0.4 + Math.cos(i * 1.7) * 0.25, Math.sin(i) * 0.15]);
        sfx.tick(i % 5);
        await wait(fast ? 1 : 120);
      }
    } else if (res.fault === 'k3') {
      step.set('He does not know to hold still');
      for (let i = 0; i < 10; i++) { teoDot.at([0.4 + Math.sin(i * 2.1) * 0.25, -0.4 + Math.cos(i * 1.7) * 0.25, Math.sin(i) * 0.15]); await wait(fast ? 1 : 120); }
    }
    step.set(res.ok ? `Held still. Error ${fmtD(res.error, 1)}: inside the tear limit.` : res.fault === 'zero' ? 'He stops answering.' : `Error ${Number.isFinite(res.error) ? fmtD(res.error, 1) : '—'}`);
    sfx[reply.ok ? 'success' : 'miss']();
    return reply;
  },
};
