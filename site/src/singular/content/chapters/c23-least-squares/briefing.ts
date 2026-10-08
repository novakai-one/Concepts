// Chapter 23 Briefing (GDD §6.10 Ch 23): Say it, three Doubts (two false, one true), the Law, Ilse's page,
// and the Act VIII Review (Ilse: four claims, mixed).
import { Vector3 } from 'three';
import type { CompareDef, DoubtDef, DoubtScene, Game, LawDef, PuzzleCtx, ReviewDef, SayItDef, V3 } from '../../../game/types';
import { Dot } from '../../../gfx/markers';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { Knob } from '../../../kit/geom';
import { C } from '../../../core/theme';
import { rint } from '../../../game/lawcheck';
import { gsPlaneScene } from '../c22-gram-schmidt/briefing';
import { gsPlaneHolds } from '../c22-gram-schmidt/logic';
import { twiceScene } from '../c21-projection/briefing';
import { twiceHolds } from '../c21-projection/logic';
import {
  curveFits, curveHolds, exactHolds, fitLine, fmtN, fmtV, lawCore, lineTex, perpHolds, perpLine, randPts, residualHolds, residualPerp, throughCount,
  throughHolds, type FitCase,
} from './logic';

const v3 = (v: readonly number[], z = 0): V3 => [v[0], v[1], v[2] ?? z];

export const sayit: SayItDef = {
  id: 'c23', who: 'bram',
  ask: 'What is perpendicular to what in least squares, and in which space?',
  frames: {
    see: 'On the board the leftovers were ___ segments. In data space the readings were one arrow and every line was a point of a ___.',
    means: 'The best line is the point of that plane nearest the readings: its leftover is perpendicular to every ___ of $A$.',
    called: 'The answer is called the ___; the leftover is the ___; $A^{\\mathsf T}A\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b$ are the ___.',
    cue: 'When you see more equations than unknowns, or noisy data, think ___.',
  },
  wordBank: ['vertical', 'plane', 'column', 'data space', 'least-squares solution', 'residual', 'normal equations', 'right angle', 'nearest point'],
};

// ------------------------------------------------------------------ readings you can drag (Doubts and the Review)

/** Readings at t = 0, 1, … you can drag up and down; the best line (yellow) and its vertical leftovers. */
export function readingsScene(p: PuzzleCtx, o: {
  start: number[][]; extra?: (g: { pts: number[][]; r: ReturnType<PuzzleCtx['readout']> }) => void; holds: (pts: number[][]) => boolean; describe: (pts: number[][]) => string;
  cases: (r: () => number) => number[][]; edges: number[][][]; showMe: number[][]; perp?: boolean; title?: string;
}): DoubtScene & { pts(): number[][] } {
  p.grid();
  const n = o.start.length;
  void p.g.stage.view2D({ center: [(n - 1) / 2, 4.4], height: 12, ms: 0 });
  let pts = o.start.map((q) => q.slice());
  const line = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.result, width: 2.6, intensity: 1.3 });
  const up = new FatSegments(p.g.stage, [[[0, 0, 0], [0, 0, 0]]], { color: C.v, width: 2, opacity: 0.85 });
  const down = new FatSegments(p.g.stage, [[[0, 0, 0], [0, 0, 0]]], { color: C.w, width: 2, opacity: 0.85 });
  const perpL = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.white, width: 1.6, opacity: 0.8, dashed: true, dashSize: 0.14, gapSize: 0.1 });
  perpL.object.visible = !!o.perp;
  p.add(line, up, down, perpL);
  const r = p.readout(o.title ?? 'The best line');
  const knobs = pts.map((q, i) => new Knob(p, [q[0], q[1], 0.02], {
    color: C.white, size: 0.09, countMoves: false,
    constrain: (qq) => { const y = Math.max(-1, Math.min(6, Math.round(qq.y * 4) / 4)); pts[i] = [pts[i][0], y]; return new Vector3(pts[i][0], y, 0.02); },
    onMove: () => sync(),
  }));
  const sync = () => {
    const f = fitLine(pts);
    line.setPoints([[-3, f[0] - 3 * f[1], 0.01], [n + 2, f[0] + (n + 2) * f[1], 0.01]]);
    const u: [V3, V3][] = [], dn: [V3, V3][] = [];
    for (const [t, y] of pts) { const yl = f[0] + f[1] * t; if (Math.abs(y - yl) > 1e-4) (y > yl ? u : dn).push([[t, y, 0], [t, yl, 0]]); }
    up.object.visible = u.length > 0; down.object.visible = dn.length > 0;
    if (u.length) up.setSegments(u); if (dn.length) down.setSegments(dn);
    if (o.perp) { const pl = perpLine(pts); perpL.object.visible = !!pl; if (pl) perpL.setPoints([[-3, pl[0] - 3 * pl[1], 0.01], [n + 2, pl[0] + (n + 2) * pl[1], 0.01]]); }
    r.row('l', 'best line', lineTex(f[0], f[1]), C.result);
    o.extra?.({ pts, r });
  };
  const setPts = (q: number[][]) => { pts = q.map((x) => x.slice()); knobs.forEach((k, i) => k.at([pts[i][0], pts[i][1], 0.02])); sync(); };
  sync();
  return {
    pts: () => pts,
    holds: () => o.holds(pts),
    describe: () => o.describe(pts),
    randomize(rr, edge) { setPts((edge !== undefined ? o.edges[edge] : o.cases(rr)).map(([t, y]) => [t, Math.max(-1, Math.min(6, y))])); },
    edgeCases: o.edges.length,
    async showMe() { setPts(o.showMe); },
  };
}
const ptsText = (pts: number[][]) => pts.map((q) => fmtN(q[1])).join(', ');

// ------------------------------------------------------------------ (F) "The best line goes through as many points as it can."

export const doubtThrough: DoubtDef = {
  id: 'c23-d-through', who: 'bram', isTrue: false,
  claim: 'The best line goes through as many readings as it can. Two at least.',
  reason: 'The best line makes the total square area smallest, and that usually means missing every reading a little. For 1, 2, 2, 4 the best line $y = 0.9 + 0.9t$ passes through none of them; a line through two of them leaves more area.',
  goal: 'Drag the readings up and down. The yellow line is the best line. **Challenge it** (readings whose best line passes through fewer than two) or **Back it**.',
  view: '2d',
  setup(p) {
    return readingsScene(p, {
      start: [[0, 1], [1, 2], [2, 3], [3, 4]],
      holds: throughHolds,
      describe: (pts) => { const f = fitLine(pts); return `readings ${ptsText(pts)}: the best line passes through ${throughCount(pts, f[0], f[1])} of them`; },
      cases: (r) => randPts(r, 4, 1),
      edges: [[[0, 1], [1, 2], [2, 2], [3, 4]], [[0, 1], [1, 3], [2, 2], [3, 5]]],
      showMe: [[0, 1], [1, 2], [2, 2], [3, 4]],
    });
  },
};

// ------------------------------------------------------------------ (F) "Least squares makes the perpendicular distances small."

export const doubtPerp: DoubtDef = {
  id: 'c23-d-perp', who: 'bram', isTrue: false,
  claim: 'Least squares makes the perpendicular distances from the readings to the line as small as it can.',
  reason: 'It makes the **vertical** leftovers small: each reading’s miss in $y$. The line that makes perpendicular distances smallest (dashed) is usually a different line: the two agree only when the readings lie on one line, or when the best line is level and the readings spread wider across than up and down. The right angle in least squares is in data space, between the leftover arrow and the columns of $A$.',
  goal: 'Drag the readings. Yellow: the least-squares line. Dashed: the line with the smallest perpendicular distances. **Challenge it** (they differ) or **Back it**.',
  view: '2d',
  setup(p) {
    return readingsScene(p, {
      start: [[0, 1], [1, 2], [2, 3], [3, 4]], perp: true, title: 'Two lines',
      holds: perpHolds,
      describe: (pts) => { const a = fitLine(pts), b = perpLine(pts); return `readings ${ptsText(pts)}: least squares ${lineTex(a[0], a[1])}, smallest perpendicular distances ${b ? lineTex(b[0], b[1]) : 'a vertical line'}`; },
      cases: (r) => randPts(r, 4, 2),
      edges: [[[0, 1], [1, 2], [2, 2], [3, 4]], [[0, 0], [1, 3], [2, 1], [3, 4]]],
      showMe: [[0, 1], [1, 2], [2, 2], [3, 4]],
    });
  },
};

// ------------------------------------------------------------------ (T) "If the readings fit exactly, least squares returns that answer."

export const doubtExact: DoubtDef = {
  id: 'c23-d-exact', who: 'bram', isTrue: true,
  claim: 'If the readings fit a line exactly, least squares gives back that exact line.',
  reason: 'If $A\\mathbf x = \\mathbf b$ has a solution, $\\mathbf b$ is already in the column space. Its nearest point is itself, the leftover is the zero vector, and $A^{\\mathsf T}A\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b$ is solved by that same $\\mathbf x$. With independent columns it is the only solution.',
  goal: 'Drag the two white handles to set a line. The readings sit exactly on it; yellow is the least-squares line. **Back it** (Bram will shake it) or **Challenge it**.',
  view: '2d',
  setup(p) {
    p.grid();
    void p.g.stage.view2D({ center: [1.5, 4.2], height: 12, ms: 0 });
    const ts = [0, 1, 2, 3];
    let c0 = 1, c1 = 0.5;
    const yl = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.result, width: 2.6, intensity: 1.3 });
    const truth = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.white, width: 1.4, opacity: 0.7, dashed: true, dashSize: 0.12, gapSize: 0.1 });
    const dots = ts.map(() => new Dot([0, 0, 0.03], { color: C.white, size: 0.09 }));
    p.add(yl, truth, ...dots);
    const r = p.readout('Exact readings');
    const sync = () => {
      const pts = ts.map((t) => [t, c0 + c1 * t]);
      dots.forEach((dd, i) => dd.at([pts[i][0], pts[i][1], 0.03]));
      const f = fitLine(pts);
      truth.setPoints([[-3, c0 - 3 * c1, 0.005], [6, c0 + 6 * c1, 0.005]]);
      yl.setPoints([[-3, f[0] - 3 * f[1], 0.01], [6, f[0] + 6 * f[1], 0.01]]);
      r.row('t', 'line of the readings', lineTex(c0, c1));
      r.row('f', 'least squares gives', lineTex(f[0], f[1]), C.result);
    };
    const kA = new Knob(p, [0, c0, 0.02], { color: C.white, countMoves: false, constrain: (q) => { c0 = Math.round(q.y * 4) / 4; return new Vector3(0, c0, 0.02); }, onMove: () => { c1 = (kB.pos[1] - c0) / 3; sync(); } });
    const kB = new Knob(p, [3, c0 + 3 * c1, 0.02], { color: C.white, countMoves: false, constrain: (q) => new Vector3(3, Math.round(q.y * 4) / 4, 0.02), onMove: (pos) => { c1 = (pos[1] - c0) / 3; sync(); } });
    sync();
    const set = (a: number, b: number) => { c0 = a; c1 = b; kA.at([0, c0, 0.02]); kB.at([3, c0 + 3 * c1, 0.02]); sync(); };
    return {
      holds: () => exactHolds(c0, c1, ts),
      describe: () => { const f = fitLine(ts.map((t) => [t, c0 + c1 * t])); return `readings on ${lineTex(c0, c1)}: least squares gives ${lineTex(f[0], f[1])}, leftover 0`; },
      randomize(rr, edge) { const cases: [number, number][] = [[2, 0], [4, -1.5], [-1, 1.5]]; if (edge !== undefined) set(...cases[edge]); else set(rint(rr, 0, 5) / 2, rint(rr, -1, 2) / 2); },
      edgeCases: 3,
      async showMe() { set(1, 0.5); },
    };
  },
};

// ------------------------------------------------------------------ the Law

function drawFit(g: Game, c: FitCase): void {
  void g.stage.view2D({ center: [2.5, 2], height: 8, ms: 0 });
  const f = fitLine(c.pts);
  const W = g.stage.world;
  const l = new FatLine(g.stage, [[-3, f[0] - 3 * f[1], 0.01], [9, f[0] + 9 * f[1], 0.01]], { color: C.result, width: 2.4 });
  l.object.userData.dispose = () => l.dispose();
  W.add(l.object);
  for (const [t, y] of c.pts) {
    const d = new Dot([t, y, 0.02], { color: C.white, size: 0.08 });
    const s = new FatLine(g.stage, [[t, y, 0], [t, f[0] + f[1] * t, 0]], { color: y > f[0] + f[1] * t ? C.v : C.w, width: 2 });
    s.object.userData.dispose = () => s.dispose();
    W.add(d.object, s.object);
  }
}

export const law: LawDef<FitCase> = {
  ...lawCore,
  frame: ['For the least-squares solution $\\hat{\\mathbf x}$, the residual $\\mathbf b - A\\hat{\\mathbf x}$ is ', { slot: 'rel' }, ' ', { slot: 'to' }, '.'],
  slots: {
    rel: { options: [{ id: 'perp', text: 'perpendicular to' }, { id: 'par', text: 'parallel to' }] },
    to: { options: [{ id: 'cols', text: 'every column of $A$' }, { id: 'line', text: 'the fitted line, in the picture of the readings' }, { id: 'b', text: 'the readings $\\mathbf b$' }] },
  },
  draw: drawFit,
  reason: {
    ask: 'Your Law survived 500 fits. **Why** is the residual perpendicular to every column?',
    options: [
      { id: 'nearest', text: '$A\\hat{\\mathbf x}$ is the point of the column space nearest $\\mathbf b$, so the leftover is perpendicular to the column space: one zero per column, $A^{\\mathsf T}(\\mathbf b - A\\hat{\\mathbf x}) = \\mathbf 0$.', right: true, why: 'Yes. Least squares is a projection: the nearest point of the column space, found by dropping a perpendicular in data space.' },
      { id: 'segments', text: 'The leftover segments are drawn at right angles to the line.', right: false, why: 'They are vertical. They meet the line at a right angle only when the line is level. The right angle is in data space, not on the board.' },
      { id: 'mean', text: 'The best line passes through the mean of the readings.', right: false, why: 'It does (that is the zero against the column of 1s), but that is one of the zeros, not the reason for all of them.' },
      { id: 'small', text: 'The residual is small, and small arrows are perpendicular to everything.', right: false, why: 'Only the zero vector is. A residual of length 1.9 can still be exactly perpendicular to every column, and that is what matters.' },
    ],
  },
};

export const compare: CompareDef = {
  id: 'c23',
  page: 'When $A\\mathbf x = \\mathbf b$ has no solution, the **least-squares solution** $\\hat{\\mathbf x}$ makes $A\\hat{\\mathbf x}$ the point of the column space nearest $\\mathbf b$. That point is where the **residual** $\\mathbf b - A\\hat{\\mathbf x}$ is perpendicular to every column: $A^{\\mathsf T}(\\mathbf b - A\\hat{\\mathbf x}) = \\mathbf 0$, which rearranges to the **normal equations** $A^{\\mathsf T}A\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b$.\n\nThe right angle lives in data space, $\\mathbb R^m$, one axis per reading. On the board the leftovers are vertical, not perpendicular to the line. With independent columns the answer is unique.',
  formula: 'A^{\\mathsf T}(\\mathbf b - A\\hat{\\mathbf x}) = \\mathbf 0 \\iff A^{\\mathsf T}A\\,\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b',
  keyIdeas: [
    'Did you say the residual is perpendicular to every column of $A$?',
    'Did you say the right angle is in data space, not between the leftovers and the line?',
    'Did you say $A\\hat{\\mathbf x}$ is the nearest point of the column space to $\\mathbf b$?',
  ],
};

// ------------------------------------------------------------------ the Act VIII Review (Ilse)

const NOISY: number[][] = [[0, 1.3], [1, 1.3], [2, 2.25], [3, 2.2], [4, 3.1]];
const NEXT: number[] = [5, 3.5];

const reviewCurve: DoubtDef = {
  id: 'c23-r-curve', who: 'ilse', isTrue: false,
  claim: 'A curve that passes through every reading is the best fit.',
  reason: 'It fits the noise as well as the trend. Through five readings the curve of degree 4 hits all five, then swings: at the next hour it misses by far more than the best line does. A model is for the readings you have not taken yet.',
  goal: 'Drag the five readings. Orange: the curve through all five. Yellow: the best line. The ring is the next hour’s reading. **Challenge it** (the curve misses the next reading by more) or **Back it**.',
  view: '2d',
  setup(p) {
    const curve = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.orange, width: 2, opacity: 0.85 });
    const ring = new Dot(v3(NEXT, 0.03), { color: C.accent, size: 0.12 });
    p.add(curve, ring);
    const scene = readingsScene(p, {
      start: NOISY, title: 'Line or curve',
      holds: (pts) => curveHolds(pts, NEXT),
      describe: (pts) => { const m = curveFits(pts, NEXT); return `readings ${ptsText(pts)}: at hour 5 the curve misses by ${fmtN(m.curve)}, the line by ${fmtN(m.line)}`; },
      extra: ({ pts, r: rr }) => {
        const ts = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
        const cp: V3[] = [];
        for (let t = -0.3; t <= 5.6; t += 0.05) {
          const y = ts.reduce((s, ti, i) => s + ys[i] * ts.reduce((pp, tj, j) => (j === i ? pp : (pp * (t - tj)) / (ti - tj)), 1), 0);
          if (y < -3 || y > 9) break;
          cp.push([t, y, 0.01]);
        }
        if (cp.length > 1) curve.setPoints(cp);
        const m = curveFits(pts, NEXT);
        rr.row('c', 'next hour: curve misses by', fmtN(m.curve), C.orange);
        rr.row('n', 'next hour: best line misses by', fmtN(m.line), C.result);
      },
      cases: (r) => { const q = randPts(r, 5, 1.2); return q; },
      edges: [NOISY, [[0, 1], [1, 2.5], [2, 2], [3, 3.5], [4, 3]]],
      showMe: NOISY,
    });
    return scene;
  },
};

const reviewGs: DoubtDef = {
  id: 'c23-r-gs', who: 'ilse', isTrue: false,
  claim: 'Gram–Schmidt changes the plane the arrows span. Square arrows, different plane.',
  reason: 'Each square arrow is a mix of the original arrows, and each original arrow is a mix of the square ones ($A = QR$). Same plane, every time: Gram–Schmidt only changes which arrows describe it.',
  goal: 'Drag $\\cg{\\mathbf x_1}$ and $\\cr{\\mathbf x_2}$. The blue patch is their plane; yellow is what Gram–Schmidt makes. **Challenge it** or **Back it**.',
  view: '3d',
  setup(p) { return gsPlaneScene(p, { holds: (a, b) => !gsPlaneHolds(a, b) }); },
};

const reviewTwice: DoubtDef = {
  id: 'c23-r-twice', who: 'ilse', isTrue: false,
  claim: 'Drop a point onto a line twice and the second drop moves it further.',
  reason: 'After the first drop the point is on the line, and a point on the line is its own nearest point. The second drop moves nothing: $P^2 = P$.',
  goal: 'Drag the line’s arrow $\\cr{\\mathbf d}$ and the point $\\cg{\\mathbf x}$. Yellow: one drop. White: a second drop. **Challenge it** or **Back it**.',
  view: '2d',
  setup(p) {
    return twiceScene(p, {
      holds: (d, x) => !twiceHolds(d, x),
      describe: (d, x) => `$\\mathbf d = ${fmtV(d)}$, $\\mathbf x = ${fmtV(x)}$: the second drop moved it 0`,
    });
  },
};

const reviewResidual: DoubtDef = {
  id: 'c23-r-residual', who: 'ilse', isTrue: true,
  claim: 'The residual of a best fit is perpendicular to every column of $A$.',
  reason: '$A\\hat{\\mathbf x}$ is the nearest point of the column space to $\\mathbf b$, so the residual $\\mathbf b - A\\hat{\\mathbf x}$ is perpendicular to the whole column space: $A^{\\mathsf T}(\\mathbf b - A\\hat{\\mathbf x}) = \\mathbf 0$. Against the column of 1s the leftovers add to zero; against the column of $t$ they balance.',
  goal: 'Drag the readings. The readout dots the residual with each column of $A$: the 1s and the $t$s. **Back it** (Ilse will shake it) or **Challenge it**.',
  view: '2d',
  setup(p) {
    return readingsScene(p, {
      start: [[0, 1], [1, 2], [2, 2], [3, 4]], title: 'The best line',
      holds: residualHolds,
      describe: (pts) => { const d = residualPerp(pts); return `readings ${ptsText(pts)}: residual · (1, 1, 1, 1) = ${fmtN(d.ones, 6)}, residual · (0, 1, 2, 3) = ${fmtN(d.ts, 6)}`; },
      extra: ({ pts, r: rr }) => { const d = residualPerp(pts); rr.row('o', 'residual against the 1s', fmtN(d.ones, 6), C.good); rr.row('t', 'residual against $t$', fmtN(d.ts, 6), C.good); },
      cases: (r) => randPts(r, 4, 2),
      edges: [[[0, 1], [1, 2], [2, 3], [3, 4]], [[0, 5], [1, -1], [2, 4], [3, 0]], [[0, 0], [1, 0], [2, 0], [3, 6]]],
      showMe: [[0, 1], [1, 2], [2, 2], [3, 4]],
    });
  },
};

export const review: ReviewDef = {
  id: 'c23-review', who: 'ilse', title: 'Act VIII Review',
  claims: [reviewCurve, reviewGs, reviewResidual, reviewTwice],
};
