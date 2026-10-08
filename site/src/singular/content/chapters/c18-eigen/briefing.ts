// Chapter 18 Briefing (GDD §6.9 Ch 18): Say it, three Doubts (two false, one true), the Law, LANTERN's
// Procedure (it runs your steps literally on a new case) and Ilse's page. The doubt scenes are reused by
// the Act VII Review in Chapter 20.
import type { CompareDef, DoubtDef, Game, LawDef, ProcedureDef, PuzzleCtx, SayItDef } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { Label } from '../../../gfx/label';
import { Grid2D } from '../../../gfx/grid';
import { InfLine } from '../../../gfx/shapes';
import { MatrixView } from '../../../kit/matrixview';
import { VectorHandle } from '../../../kit/handle';
import { Sweep, rad } from '../../../kit/geom';
import { button, h, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { rint } from '../../../game/lawcheck';
import { T, R2 } from '../../truth';
import { det, eig2, matVec, norm, type Mat } from '../../../math/la';
import { ptag, v3, fslider } from './parts';
import { hideLandingLine } from './puzzles';
import {
  LAW_CORE, PROC_A, PROC_REF, eigSum, everyLineHolds, fmt2, fmtN, isRealEigenvalue, nullLine, runProc, shift, texM, texSmall, trace,
  traceSumHolds, zeroArrowHolds, type EigCase,
} from './logic';
import { tcol } from './traj-text';

export const sayit: SayItDef = {
  id: 'c18', who: 'bram',
  ask: 'To find the eigenvalues, why do we solve $\\det(A - \\lambda I) = 0$, and not $(A - \\lambda I)\\mathbf v = \\mathbf 0$ straight away?',
  frames: {
    see: 'Most vectors were ___ by $A$. A few stayed on their own ___.',
    means: 'If $A\\mathbf v = \\lambda\\mathbf v$, then $A - \\lambda I$ sends $\\mathbf v$ to the ___. So $A - \\lambda I$ ___ space, and its ___ is zero.',
    called: 'Those vectors are called ___. The numbers $\\lambda$ are called ___.',
    cue: 'When you see “repeated” or “long run”, think ___.',
  },
  wordBank: ['turned', 'line', 'origin', 'flattens', 'determinant', 'eigenvector', 'eigenvalue', 'zero vector'],
};

/** Random whole-number 2 × 2 for the Shake (not the zero matrix). */
export function randMat(r: () => number, k = 2): Mat {
  let M: Mat;
  do { M = [[rint(r, -k, k), rint(r, -k, k)], [rint(r, -k, k), rint(r, -k, k)]]; } while (M.every((row) => row.every((x) => x === 0)));
  return M;
}
const texFree = (M: Mat) => `$${texSmall(M)}$`;

/** The column arrows in plain grey-blue: green is kept for the vector v. */
const COLS: [string, string] = ['#9db3d6', '#9db3d6'];
/** The columns are named the way the instruction names them. */
const COL_LABELS: [string, string] = [`$A${tcol([1, 0])}$`, `$A${tcol([0, 1])}$`];

/** A matrix the player drags (its columns), with the line hunt's sweep running on it. */
export function sweepScene(p: PuzzleCtx, M0: Mat) {
  void p.g.stage.view2D({ center: [0.4, 2], height: 9.6, ms: 0 });
  let sw: Sweep | null = null;
  const r = p.readout('');
  // declared before the MatrixView: its constructor reports the first matrix through onChange
  const paint = (M: Mat) => {
    const e = eig2(M);
    r.row('m', '$A$', `$${texM(M)}$`);
    r.row('l', 'lines kept', e.kind === 'real' ? (Math.abs(e.values[0] - e.values[1]) < 1e-9 && !(M[0][1] === 0 && M[1][0] === 0) ? 'one' : 'yes') : 'none', e.kind === 'real' ? C.violet : C.orange);
  };
  const mv = new MatrixView(p, { M: M0, draggable: true, labels: COL_LABELS, colors: COLS, snap: 0.5, grid: { main: 0.3, base: 0.08, axis: 0.5 }, onChange: (M) => { sw?.setM(M); paint(M); } });
  hideLandingLine(mv.grid);
  sw = new Sweep(p, { M: M0, radius: 1.5, start: rad(100), xLine: true, labels: { x: '$\\mathbf v$', mx: '$A\\mathbf v$' } });
  paint(M0);
  return {
    mv, get sweep() { return sw!; },
    async to(M: Mat, ms = 700) { await mv.to(M, ms); sw!.setM(M); paint(M); },
    set(M: Mat) { mv.set(M); sw!.setM(M); paint(M); },
  };
}

// ------------------------------------------------------------------ (F) "Every matrix has some line it doesn't turn."

export const doubtEvery: DoubtDef = {
  id: 'c18-d-every', who: 'bram', isTrue: false,
  claim: 'Every matrix has some line it doesn’t turn. Sweep far enough and you’ll find it.',
  reason: 'A turn by any angle except 0° or 180° keeps no line. (The half turn flips every vector: $\\lambda = -1$.) For the quarter turn, $\\det(A - \\lambda I) = \\lambda^2 + 1$ is never $0$ for a real $\\lambda$: its eigenvalues are $\\pm i$. $T$ is the same.',
  goal: `Drag the tips of $A${tcol([1, 0])}$ and $A${tcol([0, 1])}$ to change $A$. A line lights up when $A\\mathbf v$ stays on it. **Challenge it**: find an $A$ that keeps no line. Or **Back it**.`,
  view: '2d',
  setup(p) {
    const sc = sweepScene(p, [[2, 1], [1, 2]]);
    const edges: Mat[] = [R2, T];
    return {
      holds: () => everyLineHolds(sc.mv.get()),
      describe: () => { const M = sc.mv.get(); return everyLineHolds(M) ? `$A =$ ${texFree(M)} keeps at least one line` : `$A =$ ${texFree(M)} turns every vector: no line kept`; },
      async play() { await sc.sweep.animateSweep(p.g.headless ? 20 : 2400); },
      randomize(r, edge) { sc.set(edge !== undefined ? edges[edge] : randMat(r)); },
      edgeCases: edges.length,
      async showMe(stance) { await sc.to(stance === 'challenge' ? R2 : [[2, 1], [1, 2]], 900); await sc.sweep.animateSweep(p.g.headless ? 20 : 2400); },
    };
  },
};

// ------------------------------------------------------------------ (F) "The zero vector is an eigenvector of every matrix."

const ZA: Mat = [[2, 1], [1, 2]];

export const doubtZero: DoubtDef = {
  id: 'c18-d-zero', who: 'bram', isTrue: false,
  claim: 'The zero vector is an eigenvector of every matrix. $A\\mathbf 0 = \\lambda\\mathbf 0$, after all.',
  reason: '$A\\mathbf 0 = \\lambda\\mathbf 0$ holds for **every** $\\lambda$. If $\\mathbf 0$ counted, every number would be an eigenvalue of every matrix. So an eigenvector must not be zero. (An eigenvalue can be $0$. An eigenvector cannot be $\\mathbf 0$.)',
  goal: 'Drag green ($\\mathbf v$) and set $\\lambda$. Yellow is $A\\mathbf v$, violet is $\\lambda\\mathbf v$. **Challenge it**: find a case where it fails. Or **Back it**.',
  view: '2d',
  setup(p) {
    void p.g.stage.view2D({ center: [0.6, 0.4], height: 8.6, ms: 0 });
    p.grid({ main: 0.3, base: 0.08, axis: 0.5 });
    let l = 3;
    const ax = new Arrow([0, 0, 0], [0, 0, 0], { color: C.result, width: 0.045, label: '$A\\mathbf v$' });
    const lx = new Arrow([0, 0, 0.01], [0, 0, 0.01], { color: C.violet, width: 0.03, opacity: 0.85, label: '$\\lambda\\mathbf v$' });
    p.add(ax, lx);
    const origin = ptag(p, '', [0, 0, 0], 'dim', [0, 34]);
    const r = p.readout('');
    r.row('A', '$A$', `$${texM(ZA)}$`);
    const xh = new VectorHandle(p, { to: [1, 0, 0], color: C.v, label: '$\\mathbf v$', countMoves: false, limit: 3, onChange: () => paint() });
    const paint = () => {
      const x = xh.vec.slice(0, 2);
      const y = matVec(ZA, x);
      ax.setTo([y[0], y[1], 0]);
      lx.set([0, 0, 0.01], [l * x[0], l * x[1], 0.01]);
      const zero = norm(x) < 1e-9;
      origin.set(zero ? '$\\mathbf v = \\mathbf 0$: $A\\mathbf 0 = \\lambda\\mathbf 0 = \\mathbf 0$' : '');
      origin.show(zero);
      for (const a of [ax, lx, xh.arrow]) a.label?.show(!zero);
      r.row('x', '$\\mathbf v$', `$${tcol(x.map((t) => Math.round(t * 100) / 100 + 0))}$`, C.v);
      r.row('eq', '$A\\mathbf v = \\lambda\\mathbf v$?', Math.hypot(y[0] - l * x[0], y[1] - l * x[1]) < 1e-9 ? 'yes' : 'no');
      r.row('d', '$\\det(A - \\lambda I)$', fmtN(Math.round(((ZA[0][0] - l) * (ZA[1][1] - l) - ZA[0][1] * ZA[1][0]) * 100) / 100));
      r.row('st', `is $${fmtN(l).replace('−', '-')}$ an eigenvalue of $A$?`, isRealEigenvalue(ZA, l) ? 'yes' : 'no', isRealEigenvalue(ZA, l) ? C.violet : C.orange);
    };
    const slider = fslider({ label: '$\\lambda$', min: -2, max: 5, step: 0.5, value: l, format: (x) => fmtN(x), onInput: (x) => { l = x; paint(); } });
    p.dock().append(slider.el, h('div', { class: 'a7-btns' }, button(inline('Set $\\mathbf v = \\mathbf 0$'), () => { xh.set([0, 0, 0]); paint(); }, { cls: 'small', html: true })));
    paint();
    const setCase = (x: number[], lam: number) => { l = lam; slider.set(lam, false); xh.set([x[0], x[1], 0]); paint(); };
    const edges: [number[], number][] = [[[0, 0], 4], [[0, 0], -1]];
    return {
      holds: () => zeroArrowHolds(ZA, xh.vec.slice(0, 2), l),
      describe: () => {
        const x = xh.vec.slice(0, 2), lt = fmtN(l).replace('−', '-');
        return norm(x) < 1e-9
          ? `$\\mathbf v = \\mathbf 0$ and $\\lambda = ${lt}$: $A\\mathbf 0 = ${lt}\\cdot\\mathbf 0$, ${isRealEigenvalue(ZA, l) ? `and $${lt}$ is an eigenvalue of $A$` : `yet $${lt}$ is not an eigenvalue of $A$: $A - ${lt}I$ does not flatten`}`
          : `$\\mathbf v = ${tcol(x.map((t) => Math.round(t * 100) / 100 + 0))}$ is not $\\mathbf 0$`;
      },
      randomize(rr, edge) {
        if (edge !== undefined) { const [x, lam] = edges[edge]; setCase(x, lam); return; }
        const zero = rr() < 0.4;
        setCase(zero ? [0, 0] : [rint(rr, -2, 2) || 1, rint(rr, -2, 2)], rint(rr, -4, 10) / 2);
      },
      edgeCases: edges.length,
      async showMe(stance) {
        if (stance === 'challenge') { l = 4; slider.set(4, false); await xh.moveTo([0, 0, 0], 700); paint(); }
        else { l = 3; slider.set(3, false); await xh.moveTo([1, 1, 0], 700); paint(); }
      },
    };
  },
};

// ------------------------------------------------------------------ (T) "The eigenvalues add up to the trace."

export const doubtTrace: DoubtDef = {
  id: 'c18-d-trace', who: 'bram', isTrue: true,
  claim: 'The eigenvalues add up to the trace. Every time.',
  reason: '$\\det(A - \\lambda I) = \\lambda^2 - (a + d)\\lambda + (ad - bc)$, and a quadratic $(\\lambda - \\lambda_1)(\\lambda - \\lambda_2)$ has $-(\\lambda_1 + \\lambda_2)$ in that place. So $\\lambda_1 + \\lambda_2 = a + d$, the trace, for every 2 × 2. Complex pairs too: $p + qi$ and $p - qi$ add to $2p = a + d$.',
  goal: `Drag the tips of $A${tcol([1, 0])}$ and $A${tcol([0, 1])}$ to change $A$. Compare $\\lambda_1 + \\lambda_2$ with the trace, $a + d$. **Back it** or **Challenge it**.`,
  view: '2d',
  setup(p) {
    void p.g.stage.view2D({ center: [0.4, 0.9], height: 9.6, ms: 0 });
    const r = p.readout('');
    const paint = (M: Mat) => {
      const e = eig2(M);
      r.row('m', '$A$', `$${texM(M)}$`);
      r.row('e', 'eigenvalues', e.kind === 'real' ? `${fmt2(e.values[0])} and ${fmt2(e.values[1])}` : `$${fmt2(e.re)} \\pm ${fmt2(e.im)}i$`, C.violet);
      r.row('s', '$\\lambda_1 + \\lambda_2$', fmt2(eigSum(M)), C.result);
      r.row('t', 'trace, $a + d$', fmt2(trace(M)), C.result);
    };
    const mv = new MatrixView(p, { M: [[2, 1], [1, 2]], draggable: true, snap: 0.5, labels: COL_LABELS, colors: COLS, onChange: (M) => paint(M) });
    hideLandingLine(mv.grid);
    paint(mv.get());
    const edges: Mat[] = [R2, [[1, 1], [0, 1]], T, [[2, 1], [2, 1]]];
    return {
      holds: () => traceSumHolds(mv.get()),
      describe: () => { const M = mv.get(); return `$A =$ ${texFree(M)}: $\\lambda_1 + \\lambda_2 = ${fmt2(eigSum(M)).replace('−', '-')}$, trace $${fmt2(trace(M)).replace('−', '-')}$`; },
      randomize(rr, edge) { mv.set(edge !== undefined ? edges[edge] : randMat(rr, 2)); },
      edgeCases: edges.length,
      async showMe() { await mv.to([[4, 1], [2, 3]], 900); },
    };
  },
};

// ------------------------------------------------------------------ the Law

export const law: LawDef<EigCase> = {
  ...LAW_CORE,
  frame: ['$\\lambda$ is an **eigenvalue** of $A$ exactly when $A - \\lambda I$ is ', { slot: 'cond' }, '.'],
  slots: {
    cond: { options: [
      { id: 'singular', text: 'singular: it flattens space' },
      { id: 'zero', text: 'the zero matrix' },
      { id: 'invertible', text: 'invertible' },
      { id: 'diag', text: 'zero somewhere on its diagonal' },
    ] },
  },
  cadetSlots: ['cond'],
  draw(g: Game, c: EigCase) {
    const S0 = shift(c.A, c.l);
    const W = g.stage.world;
    const a1 = new Arrow([0, 0, 0], [S0[0][0], S0[1][0], 0], { color: C.v, width: 0.05 });
    const a2 = new Arrow([0, 0, 0], [S0[0][1], S0[1][1], 0], { color: C.w, width: 0.05 });
    W.add(a1.object, a2.object);
    const nl = Math.abs(det(S0)) < 1e-7 ? nullLine(c.A, c.l) : null;
    if (nl) for (let k = -6; k <= 6; k++) W.add(new Dot([nl[0] * k * 0.5, nl[1] * k * 0.5, 0.02], { color: C.violet, size: 0.06 }).object);
  },
  reason: {
    ask: 'Your Law survived. **Why** is λ an eigenvalue exactly when $A - \\lambda I$ is singular?',
    options: [
      { id: 'a', text: '$A\\mathbf v = \\lambda\\mathbf v$ with $\\mathbf v \\neq \\mathbf 0$ says $(A - \\lambda I)\\mathbf v = \\mathbf 0$: a non-zero vector goes to $\\mathbf 0$. A matrix does that exactly when it flattens space.', right: true, why: 'Yes. Moving $\\lambda\\mathbf v$ across turns $A\\mathbf v = \\lambda\\mathbf v$ into $(A - \\lambda I)\\mathbf v = \\mathbf 0$. Only a matrix that flattens space sends a non-zero vector to $\\mathbf 0$. So we set $\\det(A - \\lambda I) = 0$.' },
      { id: 'b', text: 'Taking away $\\lambda$ from the diagonal makes $A - \\lambda I$ zero at each eigenvalue.', right: false, why: `Not zero, only flat. For $A = \\begin{bmatrix} 2 & 1 \\\\ 1 & 2 \\end{bmatrix}$ and $\\lambda = 3$, $A - 3I = \\begin{bmatrix} -1 & 1 \\\\ 1 & -1 \\end{bmatrix}$: not the zero matrix, but it sends $${tcol([1, 1])}$ to $\\mathbf 0$.` },
      { id: 'c', text: 'The eigenvalues are the diagonal entries, so $A - \\lambda I$ has a zero on its diagonal.', right: false, why: 'Only for a triangular matrix. For $A = \\begin{bmatrix} 4 & 1 \\\\ 2 & 3 \\end{bmatrix}$, $A - 4I$ has a $0$ on its diagonal but does not flatten: $4$ is not an eigenvalue. The eigenvalues are $5$ and $2$.' },
    ],
  },
};

// ------------------------------------------------------------------ the Procedure

export const PROC_TILES = [
  { id: 'form', text: 'FORM $A - \\lambda I$: take $\\lambda$ off each diagonal entry', py: 'S = [[A[0][0] - lam, A[0][1]], [A[1][0], A[1][1] - lam]]' },
  { id: 'det0', text: 'SET $\\det(A - \\lambda I) = 0$', py: '# (a - lam)(d - lam) - b c = 0' },
  { id: 'solve', text: 'SOLVE FOR $\\lambda$: the roots of the equation', py: 'lams = roots(lam**2 - tr*lam + det)' },
  { id: 'foreach', text: 'FOR EACH $\\lambda$:', py: 'for lam in lams:' },
  { id: 'null', text: 'FIND THE NULL SPACE of $A - \\lambda I$', py: '    vs = null_space(S)' },
  { id: 'exclude', text: 'EXCLUDE THE ZERO VECTOR', py: '    vs = [v for v in vs if any(v)]' },
];
export const PROC_DECOYS = [
  { id: 'rowred', text: 'ROW REDUCE $A$ FIRST', py: 'A = row_echelon(A)' },
  { id: 'direct', text: 'SOLVE $(A - \\lambda I)\\mathbf v = \\mathbf 0$ STRAIGHT AWAY', py: 'v = solve(S, [0, 0])' },
];

export const procedure: ProcedureDef = {
  id: 'c18-proc',
  title: 'Eigenvalues and eigenvectors, step by step',
  brief: 'Put the steps in order. The computer runs them exactly as written on $A = \\begin{bmatrix} 2 & 2 \\\\ 1 & 3 \\end{bmatrix}$ and lists every eigenvalue with its eigenvectors.',
  tiles: PROC_TILES,
  decoys: PROC_DECOYS,
  reference: PROC_REF,
  async run(g, ids) {
    const res = runProc(ids);
    g.stage.clearWorld();
    await g.stage.view2D({ center: [0, -1.6], height: 12, ms: 300 });
    const grid = new Grid2D(g.stage, { main: 0.5, base: 0.12, axis: 0.7 });
    hideLandingLine(grid);
    grid.mesh.userData.dispose = () => grid.dispose();
    const board = new Label('', [0, 3.9, 0], { className: 'a7-board step' });
    g.stage.world.add(grid.object, board.object);
    grid.set(PROC_A);
    const ms = g.headless ? 5 : 650;
    for (const s of res.steps) {
      board.set(s.label);
      if (s.M) {
        const M0 = grid.M;
        await animate(g.headless ? 1 : 500, (k) => grid.set(M0.map((r, i) => r.map((x, j) => x + (s.M![i][j] - x) * k))), ease.inOut);
      }
      if (s.line) {
        const L = new InfLine(g.stage, [0, 0, 0.003], v3(s.line), { color: C.violet, width: 2.6, opacity: 0.9 });
        L.object.userData.dispose = () => L.dispose();
        g.stage.world.add(L.object);
        sfx.collapse();
      } else sfx.tick(1);
      await wait(ms);
      if (s.M && s.lambda !== undefined) grid.set(PROC_A);
    }
    if (res.ok) {
      for (const [i, v] of [[1, 1], [2, -1]].entries()) {
        const u = v.map((x) => (x * 0.9) / Math.hypot(v[0], v[1]));
        const lam = [4, 1][i];
        const a = new Arrow([0, 0, 0.02], v3(u, 0.02), { color: C.v, width: 0.05 });
        const b = new Arrow([0, 0, 0.01], v3(u.map((x) => x * lam), 0.01), { color: C.result, width: 0.035, opacity: 0.85 });
        g.stage.world.add(a.object, b.object);
        g.stage.world.add(new Label(`$\\lambda = ${fmtN(lam)}$`, v3(u.map((x) => x * Math.max(lam, 1.6))), { className: 'a7-tag vi', offset: [0, -20] }).object);
      }
      board.set('Every eigenvalue, each with its line.');
      sfx.success();
    } else {
      board.set('Stopped. See the message.');
      g.stage.nudge(0.1);
    }
    return { ok: res.ok, message: res.message };
  },
};

// ------------------------------------------------------------------ Ilse's page

export const compare: CompareDef = {
  id: 'c18',
  page: 'An **eigenvector** of $A$ is a non-zero vector that $A$ keeps on its own line: $A\\mathbf v = \\lambda\\mathbf v$. The number $\\lambda$ is its **eigenvalue**. If $|\\lambda| > 1$ the vector gets longer, if $|\\lambda| < 1$ shorter, and if $\\lambda < 0$ it flips.\n\nTo find them, move $\\lambda\\mathbf v$ across: $(A - \\lambda I)\\mathbf v = \\mathbf 0$. A non-zero vector goes to $\\mathbf 0$ only if $A - \\lambda I$ flattens space, that is, when $\\det(A - \\lambda I) = 0$. That equation has only $\\lambda$ in it, so we can solve it. Solving $(A - \\lambda I)\\mathbf v = \\mathbf 0$ first gets us nowhere: for almost every $\\lambda$ the only answer is $\\mathbf v = \\mathbf 0$.\n\nFor each root $\\lambda$, the eigenvectors are the non-zero vectors in the null space of $A - \\lambda I$.\n\nA turn by any angle except 0° or 180° keeps no real line, so its eigenvalues are complex: a pair $p \\pm qi$. The eigenvalues add up to the trace and multiply to the determinant.',
  formula: 'A\\mathbf v = \\lambda\\mathbf v,\\ \\mathbf v \\neq \\mathbf 0 \\iff (A - \\lambda I)\\mathbf v = \\mathbf 0,\\ \\mathbf v \\neq \\mathbf 0 \\iff \\det(A - \\lambda I) = 0',
  keyIdeas: [
    'Did you say an eigenvector stays on its own line, and $A$ only multiplies it by a number?',
    'Did you say why the determinant: a non-zero vector sent to $\\mathbf 0$ means $A - \\lambda I$ flattens space?',
    'Did you say what a turn does: no real line (unless it is a half turn), complex eigenvalues?',
  ],
};
