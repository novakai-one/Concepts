// Chapter 26 Briefing (GDD §6.11 Ch 26): Say it, three Doubts (two false, one true), the Law, LANTERN's PCA
// Procedure (CENTRE → COVARIANCE → EIGENVECTORS → SORT → KEEP → PROJECT, run literally on an off-centre cloud),
// Ilse's page, and the Act IX Review: Ilse's four claims after the Unfold.
import type { CompareDef, DoubtDef, Game, LawDef, ProcedureDef, PuzzleCtx, ReviewDef, SayItDef } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { InfLine } from '../../../gfx/shapes';
import { Grid2D } from '../../../gfx/grid';
import { Knob } from '../../../kit/geom';
import { PointCloud } from '../../../kit/data';
import { MatrixView } from '../../../kit/matrixview';
import { VectorHandle } from '../../../kit/handle';
import { Slider } from '../../../ui/widgets';
import { C } from '../../../core/theme';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { rint } from '../../../game/lawcheck';
import { det, inverse, norm, type Mat, type Vec } from '../../../math/la';
import { AMPLIFY, DET_C, SV_C } from '../../truth';
import { inWorld, tag, v3 } from '../c24-spectral/act9';
import { deg, rad, symEig, texSmall } from '../c24-spectral/logic';
import { svdCanon } from '../c25-svd/logic';
import {
  LAW_ANSWER, LAW_CORE, PROC_CLOUD, PROC_DECOYS, PROC_REF, PROC_TILES, cloudWith, colsHolds, condHolds, condRatio, covariance, fmtD,
  lsqLikePcaHolds, meanOf, momentsAbout, negSvHolds, runProc, swingHolds, symSvHolds, tinyDetHolds, type CloudCase,
} from './logic';
import { worldCloud } from './world';

export const sayit: SayItDef = {
  id: 'c26', who: 'bram',
  ask: 'Why is the direction of largest spread an eigenvector of the covariance matrix?',
  frames: {
    see: 'Turning a line through the centred cloud, the shadows spread out most along ___.',
    means: 'The spread along a unit arrow $\\mathbf w$ is $\\mathbf w^{\\mathsf T}C\\,\\mathbf w$, a ___ form, and $C$ is ___. So the largest value is the largest ___, at its eigenvector.',
    called: 'These directions are the ___; keeping a few of them is ___.',
    cue: 'When you see “too many dimensions”, think ___.',
  },
  wordBank: ['centre', 'the long way of the cloud', 'quadratic', 'symmetric', 'eigenvalue', 'principal components', 'PCA', 'explained variance', 'dimensionality reduction'],
};

// ------------------------------------------------------------------ a cloud the player can shape (angle and length)

function shapedCloud(p: PuzzleCtx, o: { angle: number; s1: number; mean?: Vec; onChange?: (X: number[][]) => void }) {
  let angle = o.angle, s1 = o.s1;
  const s2 = 0.18;
  let mean = o.mean ?? [0, 0];
  const make = () => cloudWith(90, mean, (() => { const a = rad(angle), c = Math.cos(a), s = Math.sin(a); return [[c * c * s1 + s * s * s2, c * s * (s1 - s2)], [c * s * (s1 - s2), s * s * s1 + c * c * s2]]; })(), 4242);
  let X = make();
  const cloud = new PointCloud(p, { points: X, color: C.accent, size: 0.05, glow: 0.3, core: 1.3, opacity: 0.85 });
  const R = () => 0.8 + Math.sqrt(s1) * 1.1;
  const knob = new Knob(p, [mean[0] + R() * Math.cos(rad(angle)), mean[1] + R() * Math.sin(rad(angle)), 0.03], {
    color: C.v, size: 0.07, countMoves: false,
    onMove: (q) => { const dx = q[0] - mean[0], dy = q[1] - mean[1]; angle = deg(Math.atan2(dy, dx)); const l = Math.hypot(dx, dy); s1 = Math.max(0.4, Math.min(4, ((l - 0.8) / 1.1) ** 2)); update(); },
  });
  const update = () => { X = make(); cloud.set(X); o.onChange?.(X); };
  return {
    get X() { return X; },
    set(a: number, len: number, m?: Vec) { angle = a; s1 = len; if (m) mean = m; update(); knob.at([mean[0] + R() * Math.cos(rad(angle)), mean[1] + R() * Math.sin(rad(angle)), 0.03]); },
    setMean(m: Vec) { mean = m; update(); knob.at([mean[0] + R() * Math.cos(rad(angle)), mean[1] + R() * Math.sin(rad(angle)), 0.03]); },
  };
}

// ------------------------------------------------------------------ (F) "Keep the two biggest columns."

export const doubtCols: DoubtDef = {
  id: 'c26-d-cols', who: 'bram', isTrue: false,
  claim: 'Why build new numbers? Keep the columns of the record with the most spread. Same thing.',
  reason: 'Only when the cloud lies along the axes. Tilt it, and its spread is shared between the columns: the best single column keeps less than the first principal component, which is a combination of every column.',
  goal: 'Shape the cloud with the green handle. The readout compares the best single column with the first principal component (one number kept). **Challenge it** or **Back it**.',
  view: '2d',
  setup(p) {
    void p.g.stage.view2D({ center: [0, 1.3], height: 9, ms: 0 });   // the cloud sits below the claim panel
    p.grid({ main: 0.14, base: 0, axis: 0.42 });
    const r = p.readout('One number per reading');
    const paint = (X: number[][]) => {
      const Cv = covariance(X), e = symEig(Cv);
      const best = Cv[0][0] >= Cv[1][1] ? 'first column (x)' : 'second column (y)';
      r.row('c', `best column: ${best}`, fmtD(Math.max(Cv[0][0], Cv[1][1])), Math.max(Cv[0][0], Cv[1][1]) >= e.values[0] - 1e-6 ? C.white : C.orange);
      r.row('p', 'first principal component', fmtD(e.values[0]), C.result);
    };
    const sc = shapedCloud(p, { angle: 0, s1: 2.5, onChange: paint });
    paint(sc.X);
    return {
      holds: () => colsHolds(sc.X),
      describe: () => { const Cv = covariance(sc.X), e = symEig(Cv); return `the best column keeps a spread of ${fmtD(Math.max(Cv[0][0], Cv[1][1]))}, the first principal component ${fmtD(e.values[0])}`; },
      randomize(rr, edge) { if (edge !== undefined) sc.set([45, 30][edge], 2.5); else sc.set(rint(rr, 0, 179), 0.6 + rr() * 3); },
      edgeCases: 2,
      async showMe(stance) { sc.set(stance === 'challenge' ? 40 : 0, 2.5); },
    };
  },
};

// ------------------------------------------------------------------ (F) "PCA fits data the way least squares does."

/** A line's angle in degrees, folded into [0, 180): the readout and the verdict text use the same one. */
const mod180 = (a: number) => ((a % 180) + 180) % 180;

export const doubtLsq: DoubtDef = {
  id: 'c26-d-lsq', who: 'bram', isTrue: false,
  claim: 'The first principal component is the line of best fit from Chapter 23. Same line, new name.',
  reason: 'Least squares makes the **vertical** distances small, to predict y from x. The first principal component makes the **perpendicular** distances small and treats both numbers alike. For a tilted, spread-out cloud the two lines differ.',
  goal: 'Shape the cloud with the green handle. Yellow: the first principal component. Orange: the least-squares line. **Challenge it** (the two lines differ) or **Back it**.',
  view: '2d',
  setup(p) {
    void p.g.stage.view2D({ center: [0, 1.3], height: 9, ms: 0 });   // the cloud sits below the claim panel
    p.grid({ main: 0.14, base: 0, axis: 0.42 });
    const pc = new InfLine(p.g.stage, [0, 0, 0.01], [1, 0, 0], { color: C.result, width: 2.4, opacity: 0.9, length: 20 });
    const ls = new InfLine(p.g.stage, [0, 0, 0.012], [1, 0, 0], { color: C.orange, width: 2, opacity: 0.9, length: 20, dashed: true });
    p.add(pc.object, ls.object); p.onDispose(() => { pc.dispose(); ls.dispose(); });
    const r = p.readout('Two lines');
    const paint = (X: number[][]) => {
      const Cv = covariance(X), m = meanOf(X), e = symEig(Cv);
      pc.set(v3(m, 0.01), v3(e.vectors[0]));
      ls.set(v3(m, 0.012), [1, Cv[0][1] / Cv[0][0], 0]);
      const a1 = deg(Math.atan2(e.vectors[0][1], e.vectors[0][0])), a2 = deg(Math.atan(Cv[0][1] / Cv[0][0]));
      r.row('p', 'first principal component at', `${fmtD(mod180(a1), 1)}°`, C.result);
      r.row('l', 'least-squares line at', `${fmtD(mod180(a2), 1)}°`, C.orange);
    };
    const sc = shapedCloud(p, { angle: 0, s1: 2.5, onChange: paint });
    paint(sc.X);
    return {
      holds: () => lsqLikePcaHolds(sc.X),
      describe: () => { const Cv = covariance(sc.X), e = symEig(Cv); return `the first principal component runs at ${fmtD(mod180(deg(Math.atan2(e.vectors[0][1], e.vectors[0][0]))), 1)}°, the least-squares line at ${fmtD(mod180(deg(Math.atan(Cv[0][1] / Cv[0][0]))), 1)}°`; },
      randomize(rr, edge) { if (edge !== undefined) sc.set([40, 60][edge], [1, 0.6][edge]); else sc.set(rint(rr, 0, 179), 0.5 + rr() * 3); },
      edgeCases: 2,
      async showMe(stance) { sc.set(stance === 'challenge' ? 40 : 0, 1); },
    };
  },
};

// ------------------------------------------------------------------ (T) "Without centring, the first direction swings toward the mean."

export const doubtSwing: DoubtDef = {
  id: 'c26-d-swing', who: 'bram', isTrue: true,
  claim: 'Skip the centring and the first direction swings toward the mean.',
  reason: 'Without centring, the matrix is $X^{\\mathsf T}X/(n - 1) = C + \\tfrac{n}{n - 1}\\mathbf m\\mathbf m^{\\mathsf T}$: the covariance matrix plus a stretch along the mean $\\mathbf m$. Adding it pulls the top eigenvector toward the line of $\\mathbf m$, and never away. Far from the origin, it points almost straight at the cloud.',
  goal: 'Drag the cloud’s middle (white) and shape it (green handle). Orange: the first direction without centring, through the origin. Yellow: with centring. **Back it** (Bram will shake it) or **Challenge it**.',
  view: '2d',
  setup(p) {
    void p.g.stage.view2D({ center: [1.5, 2.2], height: 10, ms: 0 });
    p.grid({ main: 0.14, base: 0, axis: 0.42 });
    const raw = new InfLine(p.g.stage, [0, 0, 0.012], [1, 0, 0], { color: C.orange, width: 2, opacity: 0.9, length: 26, dashed: true });
    const cen = new InfLine(p.g.stage, [0, 0, 0.01], [1, 0, 0], { color: C.result, width: 2.2, opacity: 0.9, length: 26 });
    p.add(raw.object, cen.object); p.onDispose(() => { raw.dispose(); cen.dispose(); });
    const r = p.readout('Two first directions');
    let mean: Vec = [3, 1.5];
    const paint = (X: number[][]) => {
      const m = meanOf(X);
      const a = symEig(momentsAbout(X, [0, 0])).vectors[0], b = symEig(covariance(X)).vectors[0];
      raw.set([0, 0, 0.012], v3(a)); cen.set(v3(m, 0.01), v3(b));
      const ang = (u: Vec) => { const t = Math.acos(Math.min(1, Math.abs(u[0] * m[0] + u[1] * m[1]) / (norm(u) * norm(m) || 1))); return deg(t); };
      r.row('r', 'not centred: angle to the mean', `${fmtD(ang(a), 1)}°`, C.orange);
      r.row('c', 'centred: angle to the mean', `${fmtD(ang(b), 1)}°`, C.result);
    };
    const sc = shapedCloud(p, { angle: 70, s1: 1.5, mean, onChange: paint });
    const mk = new Knob(p, v3(mean, 0.04), { color: C.white, size: 0.08, countMoves: false, onMove: (q) => { mean = [q[0], q[1]]; sc.setMean(mean); } });
    paint(sc.X);
    const edges: [number, number, Vec][] = [[0, 2, [3, 0]], [90, 2, [3, 0]], [30, 1.5, [0, 0]]];
    return {
      holds: () => swingHolds(sc.X),
      describe: () => { const X = sc.X, m = meanOf(X); return `mean (${fmtD(m[0], 1)}, ${fmtD(m[1], 1)}): without centring the first direction is ${fmtD(deg(Math.acos(Math.min(1, Math.abs(symEig(momentsAbout(X, [0, 0])).vectors[0].reduce((s, x, i) => s + x * m[i], 0)) / (norm(m) || 1)))), 1)}° off the mean’s line`; },
      randomize(rr, edge) {
        if (edge !== undefined) { const [a, l, m] = edges[edge]; mean = m; mk.at(v3(m, 0.04)); sc.set(a, l, m); return; }
        mean = [rr() * 8 - 4, rr() * 6 - 3]; mk.at(v3(mean, 0.04)); sc.set(rint(rr, 0, 179), 0.5 + rr() * 3, mean);
      },
      edgeCases: edges.length,
      async showMe() { mean = [3, 1.5]; mk.at(v3(mean, 0.04)); sc.set(70, 1.5, mean); },
    };
  },
};

// ------------------------------------------------------------------ the Law

export const law: LawDef<CloudCase> = {
  ...LAW_CORE,
  frame: ['The first principal component is the eigenvector of ', { slot: 'matrix' }, ' with ', { slot: 'which' }, ' eigenvalue.'],
  slots: {
    matrix: { options: [{ id: 'cov', text: 'the covariance matrix' }, { id: 'raw', text: 'XᵀX/(n − 1), with the mean not taken away' }] },
    which: { options: [{ id: 'largest', text: 'the largest' }, { id: 'smallest', text: 'the smallest' }] },
  },
  answer: LAW_ANSWER,
  cadetSlots: ['matrix'],
  draw(g: Game, c: CloudCase) {
    const m = meanOf(c.X), e = symEig(covariance(c.X));
    worldCloud(g, { points: c.X.map((x) => [x[0] * 0.6, x[1] * 0.6, 0]), color: C.accent, size: 0.05 });
    inWorld(g, new Arrow(v3(m.map((x) => x * 0.6)), v3(m.map((x, i) => (x + e.vectors[0][i] * 2) * 0.6)), { color: C.result }));
  },
  reason: {
    ask: 'Your Law survived. **Why** the covariance matrix, and why its largest eigenvalue?',
    options: [
      { id: 'a', text: 'The spread along a unit $\\mathbf w$ is $\\mathbf w^{\\mathsf T}C\\,\\mathbf w$ with $C$ the covariance matrix of the centred readings. $C$ is symmetric, so this is largest, $\\lambda_1$, along its top eigenvector.', right: true, why: 'Yes. Centring makes the spread measured about the cloud’s own middle; the quadratic form does the rest, exactly as on the brace panels.' },
      { id: 'b', text: 'The first column of the data is always the most important one.', right: false, why: 'No column is special: a principal component mixes every column, weighted by the eigenvector.' },
      { id: 'c', text: 'Without the mean taken away, the top eigenvector shows the spread equally well.', right: false, why: 'Without centring, the biggest thing measured is where the cloud is: the top eigenvector swings toward the mean.' },
    ],
  },
};

// ------------------------------------------------------------------ LANTERN's procedure

function procMessage(fault: ReturnType<typeof runProc>['fault']): string {
  switch (fault) {
    case null: return 'LANTERN ran your steps exactly: centred the readings, built $C$, found its eigenvectors, sorted them, kept the first, projected. Every reading now has **one number**, along the long way of the cloud.';
    case 'centre': return 'You never told me to centre first. I measured spread about the origin, and the first direction **points at the cloud, toward the mean**, not along it.';
    case 'sort': return 'You did not say to sort. I kept the first eigenvector in the order I found them: the direction of **least** spread.';
    case 'keep': return 'You never said how many to keep. I sent every number of every reading: two per reading, and the channel holds one.';
    case 'project': return 'You chose the directions and never projected onto them. Nothing was sent.';
    case 'stuck': return 'I have no directions: your steps never build the covariance matrix and its eigenvectors.';
    case 'cols': return 'I kept the column with the most spread. The cloud is tilted, so that column keeps less than its first principal component.';
    case 'vert': return 'I fitted a line by vertical distances. That line predicts y from x; it is not the direction of most spread.';
    default: return 'The steps are out of order. Centre, then covariance, then eigenvectors, then sort, keep and project.';
  }
}

export const procedure: ProcedureDef = {
  id: 'c26-proc',
  title: 'Principal component analysis, step by step',
  brief: 'Order the steps. LANTERN runs them literally on an off-centre cloud of readings and keeps **one** number per reading.',
  tiles: PROC_TILES,
  decoys: PROC_DECOYS,
  reference: PROC_REF,
  async run(g, ids) {
    const res = runProc(ids);
    g.stage.clearWorld();
    await g.stage.view2D({ center: [-1.4, 0.6], height: 9, ms: 400 });   // right of the step panel
    const grid = new Grid2D(g.stage, { main: 0.14, base: 0, axis: 0.42 });
    grid.mesh.userData.dispose = () => grid.dispose();
    g.stage.world.add(grid.object);
    const fast = g.headless;
    const step = inWorld(g, tag('LANTERN runs your steps', [1.6, 3.6, 0], 'c'));
    const pts = PROC_CLOUD.map((x) => [x[0], x[1], 0]);
    const cloudG = worldCloud(g, { points: pts, color: C.accent, size: 0.05, glow: 0.3 });
    const m = meanOf(PROC_CLOUD);
    let shown = pts;
    const has = (id: string) => ids.includes(id);
    if (has('centre') && res.fault !== 'centre') {
      step.set('Centre: the mean reading is taken away');
      shown = PROC_CLOUD.map((x) => [x[0] - m[0], x[1] - m[1], 0]);
      await cloudG.to(shown, fast ? 1 : 900);
    }
    if (res.dir) {
      step.set(res.fault === 'centre' ? 'Eigenvectors of XᵀX/(n − 1), not centred' : res.fault === 'sort' ? 'Kept the first eigenvector found' : 'The first principal direction');
      inWorld(g, new InfLine(g.stage, [0, 0, 0.01], v3(res.dir), { color: res.ok ? C.result : C.orange, width: 1.4, opacity: 0.6, length: 22 }));
      await wait(fast ? 1 : 600);
      if (res.ok || res.fault === 'keep') {
        step.set(res.ok ? 'Project: one number per reading' : 'Sent every number: nothing kept out');
        if (res.ok) {
          const u = res.dir;
          await cloudG.to(shown.map((x) => { const t = x[0] * u[0] + x[1] * u[1]; return [t * u[0], t * u[1], 0]; }), fast ? 1 : 1100, C.result);
        }
      }
    }
    if (res.fault === 'vert') {
      const Cv = covariance(PROC_CLOUD);
      inWorld(g, new InfLine(g.stage, v3(m, 0.01), [1, Cv[0][1] / Cv[0][0], 0], { color: C.orange, width: 2, opacity: 0.9, length: 22, dashed: true }));
    }
    if (res.fault === 'cols') inWorld(g, new InfLine(g.stage, v3(m, 0.01), [1, 0, 0], { color: C.orange, width: 2, opacity: 0.9, length: 22, dashed: true }));
    sfx[res.ok ? 'success' : 'miss']();
    if (!res.ok) step.set('LANTERN’s report');
    return { ok: res.ok, message: procMessage(res.fault) };
  },
};

// ------------------------------------------------------------------ Ilse's page

export const compare: CompareDef = {
  id: 'c26',
  page: '**Centre** the readings first: take the mean reading away, so the cloud sits around the origin. Otherwise the biggest thing measured is where the cloud is.\n\nThe spread of the shadows on a unit direction $\\mathbf w$ is $\\frac{1}{n-1}\\|X_c\\mathbf w\\|^2 = \\mathbf w^{\\mathsf T}C\\,\\mathbf w$, with $C = \\frac{1}{n-1}X_c^{\\mathsf T}X_c$ the **covariance matrix**. That is a quadratic form, and $C$ is symmetric, so its largest value is the largest eigenvalue, along its eigenvector. The next is the largest at right angles to it, and so on.\n\nThese directions are the **principal components**: the right singular vectors of $X_c$, with spreads $\\sigma_i^2/(n-1)$. Keeping the first $k$ keeps the share $\\sum_{i\\le k}\\lambda_i/\\sum\\lambda_i$ of the spread, and gives the closest $k$-dimensional picture by perpendicular distance. Least squares used vertical distances; this uses perpendicular ones.',
  formula: 'C = \\tfrac{1}{n-1}X_c^{\\mathsf T}X_c, \\qquad \\max_{\\|\\mathbf w\\| = 1}\\mathbf w^{\\mathsf T}C\\,\\mathbf w = \\lambda_1, \\qquad \\text{kept} = \\frac{\\lambda_1 + \\cdots + \\lambda_k}{\\lambda_1 + \\cdots + \\lambda_d}',
  keyIdeas: [
    'Did you say to centre the readings first, and what goes wrong if you do not?',
    'Did you say that the spread along a direction is the quadratic form $\\mathbf w^{\\mathsf T}C\\,\\mathbf w$?',
    'Did you say why its largest value is at the top eigenvector, and how to choose how many to keep?',
  ],
};

// ------------------------------------------------------------------ the Act IX Review (Ilse, after the Unfold)

const half = (r: () => number, lo: number, hi: number) => rint(r, lo * 2, hi * 2) / 2;

const reviewTiny: DoubtDef = {
  id: 'c26-r-tiny', who: 'ilse', isTrue: false,
  claim: 'A tiny determinant means no inverse.',
  reason: `Only exactly zero means no inverse. The Collapse pulse had determinant ${fmtD(DET_C, 4)} and an inverse that unfolded the stern; it multiplied errors by ${Math.round(AMPLIFY)}, which is why the readings had to be clean.`,
  goal: 'Set $\\varepsilon$. The matrix is $\\begin{bmatrix} 1 & 1 \\\\ 1 & 1 + \\varepsilon \\end{bmatrix}$; the readout tries its inverse. **Challenge it** (a tiny determinant, and an inverse that works) or **Back it**.',
  view: '2d',
  setup(p) {
    void p.g.stage.view2D({ center: [0.6, 0.6], height: 7, ms: 0 });
    let eps = 0.5;
    const M = (): Mat => [[1, 1], [1, 1 + eps]];
    const r = p.readout('Its inverse');
    const mv = new MatrixView(p, { M: M(), labels: true, grid: { main: 0.3, base: 0.08, axis: 0.5 } });
    const paint = () => {
      const A = M(); mv.set(A);
      const inv = inverse(A);
      r.row('d', '$\\det A$', fmtD(det(A), 3), Math.abs(det(A)) < 0.05 ? C.orange : C.white);
      r.row('i', '$A^{-1}$', inv && Math.abs(det(A)) > 1e-12 ? `$${texSmall(inv.map((row) => row.map((x) => Math.round(x * 10) / 10)))}$` : 'none', inv ? C.result : C.orange);
      r.row('c', '$AA^{-1} = I$?', inv && Math.abs(det(A)) > 1e-12 ? 'yes' : '—', C.good);
    };
    const sl = new Slider({ label: '$\\varepsilon$', min: 0, max: 0.5, step: 0.001, value: eps, format: (x) => fmtD(x, 3), onInput: (x) => { eps = x; paint(); } });
    p.dock().append(sl.el);
    paint();
    const edges = [0.004, 0.01];
    return {
      holds: () => tinyDetHolds(M()),
      describe: () => `$\\varepsilon = ${fmtD(eps, 3)}$: $\\det A = ${fmtD(det(M()), 3)}$, ${Math.abs(det(M())) > 1e-12 ? 'and $A^{-1}$ exists' : 'no inverse'}`,
      randomize(rr, edge) { eps = edge !== undefined ? edges[edge] : Math.round((0.1 + rr() * 0.4) * 1000) / 1000; sl.set(eps); },
      edgeCases: edges.length,
      async showMe(stance) { eps = stance === 'challenge' ? 0.004 : 0.5; sl.set(eps); },
    };
  },
};

const reviewNeg: DoubtDef = {
  id: 'c26-r-neg', who: 'ilse', isTrue: false,
  claim: 'Singular values can be negative. A move that flips space must have a negative one.',
  reason: 'Singular values are lengths, $\\sigma_i = |A\\mathbf v_i|$, so they are never negative. A flip goes into $U$ or $V$: one of them is a reflection, and every $\\sigma$ stays positive.',
  goal: 'Drag the grid arrows. The readout shows the determinant’s sign and the singular values. **Challenge it** (a flip with no negative singular value) or **Back it**.',
  view: '2d',
  setup(p) {
    void p.g.stage.view2D({ center: [0.4, 0.4], height: 8, ms: 0 });
    const r = p.readout('Flip and stretches');
    const paint = (M: Mat) => {
      const s = svdCanon(M).S;
      r.row('d', '$\\det A$', fmtD(det(M)), det(M) < 0 ? C.orange : C.white);
      r.row('f', 'flips space', det(M) < 0 ? 'yes' : 'no');
      r.row('s', 'singular values', `${fmtD(s[0])} and ${fmtD(s[1])}`, C.result);
    };
    const mv = new MatrixView(p, { M: [[2, 1], [0, 1]], draggable: true, snap: 0.5, labels: true, showArea: true, onChange: (M) => paint(M) });
    paint(mv.get());
    const edges: Mat[] = [[[0, 1], [1, 0]], [[1, 0], [0, -2]]];
    return {
      holds: () => negSvHolds(mv.get()),
      describe: () => { const M = mv.get(), s = svdCanon(M).S; return `$\\det A = ${fmtD(det(M))}$, singular values ${fmtD(s[0])} and ${fmtD(s[1])}`; },
      randomize(rr, edge) { mv.set(edge !== undefined ? edges[edge] : [[half(rr, 0.5, 2), half(rr, -1, 1)], [half(rr, -1, 1), half(rr, 0.5, 2)]]); },
      edgeCases: edges.length,
      async showMe(stance) { await mv.to(stance === 'challenge' ? [[0, 1], [1, 0]] : [[2, 1], [0, 1]], 900); },
    };
  },
};

const reviewCond: DoubtDef = {
  id: 'c26-r-cond', who: 'ilse', isTrue: true,
  claim: 'The condition number says how much a solver can multiply errors.',
  reason: 'Solving $A\\mathbf x = \\mathbf b$ divides by the singular values. A small error in $\\mathbf b$ grows by at most $1/\\sigma_{\\min}$, while $\\mathbf x$ shrinks from $\\mathbf b$ by at most $1/\\sigma_{\\max}$: relative errors grow by at most $\\sigma_{\\max}/\\sigma_{\\min}$. The worst case is $\\mathbf b$ along $\\mathbf u_1$ and the error along $\\mathbf u_n$.',
  goal: 'Drag $\\mathbf b$ (green). The red arrow from its tip is a fixed error; Ilse’s shake changes it. The readout compares how much the relative error grew with the condition number. **Back it** (Ilse will shake it) or **Challenge it**.',
  view: '2d',
  setup(p) {
    void p.g.stage.view2D({ center: [0.6, 1.6], height: 9, ms: 0 });   // b stays below the claim panel
    p.grid({ main: 0.16, base: 0, axis: 0.42 });
    let A: Mat = [[2, 1], [1, 1.2]];
    let db: Vec = [0.3, -0.4];
    const r = p.readout('Errors in, errors out');
    const errA = new Arrow([0, 0, 0.02], [0, 0, 0.02], { color: C.w, width: 0.035, label: 'error' });
    p.add(errA);
    const bH = new VectorHandle(p, { to: [2, 1, 0], color: C.v, label: '$\\mathbf b$', countMoves: false, limit: 4, onChange: () => paint() });
    const paint = () => {
      const b = bH.vec.slice(0, 2);
      errA.set([b[0], b[1], 0.02], [b[0] + db[0], b[1] + db[1], 0.02]);
      const s = svdCanon(A).S;
      r.row('a', '$A$', `$${texSmall(A)}$`);
      r.row('k', 'condition number', fmtD(s[0] / s[1]), C.result);
      if (norm(b) > 1e-9 && inverse(A)) r.row('g', 'relative error grew by', fmtD(condRatio(A, b, db)), condHolds(A, b, db) ? C.good : C.orange);
    };
    paint();
    const edges: [Mat, Vec, Vec][] = (() => {
      const M: Mat = [[1, 1], [1, 1.1]];
      const d = svdCanon(M);
      return [[M, d.us[0].map((x) => x * 2), d.us[1].map((x) => x * 0.2)], [[[3, 0], [0, 0.5]], [2, 0], [0, 0.1]]];
    })();
    return {
      holds: () => condHolds(A, bH.vec.slice(0, 2), db),
      describe: () => { const b = bH.vec.slice(0, 2); return `$A = ${texSmall(A)}$: relative error grew by ${fmtD(condRatio(A, b, db))}, condition number ${fmtD(svdCanon(A).S[0] / svdCanon(A).S[1])}`; },
      randomize(rr, edge) {
        if (edge !== undefined) { const [M, b, e] = edges[edge]; A = M; db = e; bH.set(v3(b)); paint(); return; }
        do { A = [[half(rr, -2, 2), half(rr, -2, 2)], [half(rr, -2, 2), half(rr, -2, 2)]]; } while (Math.abs(det(A)) < 0.25);
        db = [rr() * 0.6 - 0.3, rr() * 0.6 - 0.3];
        bH.set([rint(rr, -3, 3) || 1, rint(rr, -1, 3), 0]);   // keep b on screen
        paint();
      },
      edgeCases: edges.length,
      async showMe() { await bH.moveTo([2, 1, 0], 600); paint(); },
    };
  },
};

const reviewSym: DoubtDef = {
  id: 'c26-r-sym', who: 'ilse', isTrue: true,
  claim: 'For a symmetric matrix with positive eigenvalues, the singular values are the eigenvalues. The Collapse pulse was one.',
  reason: `A symmetric matrix is $QDQ^{\\mathsf T}$. With every eigenvalue positive, that already is an SVD: $U = V = Q$, $\\Sigma = D$. So the singular values ${SV_C.map((x) => fmtD(x, 4)).join(', ')} of the Collapse pulse were its eigenvalues.`,
  goal: 'Set a symmetric matrix with the sliders. **Back it** (Ilse will shake it) or **Challenge it**.',
  view: '2d',
  setup(p) {
    void p.g.stage.view2D({ center: [0.8, 2.4], height: 10, ms: 0 });   // the arrows stay below the claim panel
    const r = p.readout('Eigenvalues and singular values');
    let S: Mat = [[1, 1.41], [1.41, 2.004]];
    const mv = new MatrixView(p, { M: S, labels: true, grid: { main: 0.3, base: 0.08, axis: 0.5 } });
    const paint = () => {
      mv.set(S);
      const e = symEig(S), s = svdCanon(S).S;
      r.row('m', '$S$', `$${texSmall(S, 2)}$`);
      r.row('e', 'eigenvalues', e.values.map((x) => fmtD(x, 3)).join(' and '), e.values.every((x) => x > 0) ? C.result : C.orange);
      r.row('s', 'singular values', s.map((x) => fmtD(x, 3)).join(' and '), C.result);
    };
    let [a, b, c] = [S[0][0], S[0][1], S[1][1]];
    const set = () => { S = [[a, b], [b, c]]; paint(); };
    const mk = (label: string, v: number, f: (x: number) => void) => new Slider({ label, min: -3, max: 3, step: 0.01, value: v, format: (x) => fmtD(x), onInput: (x) => { f(x); set(); } });
    const sa = mk('$a$', a, (x) => { a = x; }), sb = mk('$b$', b, (x) => { b = x; }), sc = mk('$c$', c, (x) => { c = x; });
    p.dock().append(sa.el, sb.el, sc.el);
    paint();
    const edges: Mat[] = [[[1, Math.SQRT2], [Math.SQRT2, 2.004]], [[2, 0], [0, 2]], [[3, 1], [1, 3]]];
    const put = (M: Mat) => { [a, b, c] = [M[0][0], M[0][1], M[1][1]]; sa.set(a, false); sb.set(b, false); sc.set(c, false); set(); };
    return {
      holds: () => symSvHolds(S),
      describe: () => `$S = ${texSmall(S, 2)}$: eigenvalues ${symEig(S).values.map((x) => fmtD(x, 3)).join(' and ')}, singular values ${svdCanon(S).S.map((x) => fmtD(x, 3)).join(' and ')}`,
      randomize(rr, edge) { if (edge !== undefined) { put(edges[edge]); return; } const q = half(rr, -1.5, 1.5); put([[half(rr, 0.5, 3) + Math.abs(q), q], [q, half(rr, 0.5, 3) + Math.abs(q)]]); },
      edgeCases: edges.length,
      async showMe() { put([[3, 1], [1, 3]]); },
    };
  },
};

export const review: ReviewDef = {
  id: 'c26-review', who: 'ilse', title: 'Act IX Review',
  claims: [reviewTiny, reviewCond, reviewNeg, reviewSym],
};
