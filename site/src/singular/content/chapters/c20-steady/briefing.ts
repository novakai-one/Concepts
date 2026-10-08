// Chapter 20 Briefing (GDD §6.9 Ch 20): Say it, three Doubts (two false, one true), the Law, LANTERN's
// Procedure (steady state by repetition) and Ilse's page.
import type { CompareDef, DoubtDef, Game, LawDef, ProcedureDef, PuzzleCtx, SayItDef, V3 } from '../../../game/types';
import { Dot } from '../../../gfx/markers';
import { Label } from '../../../gfx/label';
import { FatLine } from '../../../gfx/lines';
import { Arrow } from '../../../gfx/arrow';
import { C } from '../../../core/theme';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { rint } from '../../../game/lawcheck';
import { matVec, type Mat, type Vec } from '../../../math/la';
import { DRONES, DRONES_STEADY } from '../../truth';
import { ptag, fslider } from '../c18-eigen/parts';
import { FlowBoard, Simplex, triPoint, triSplit } from './board';
import {
  LAW_CORE, PROC_REF, STATIONS, TOTAL, fmtN, fmtV, movingAtSteady, procShares, randChain, runProc, settlesHolds, startMattersHolds,
  steadyOf, stillMovingHolds, type ChainCase,
} from './logic';

export const sayit: SayItDef = {
  id: 'c20', who: 'bram',
  ask: 'Why must a matrix whose columns sum to 1 have eigenvalue 1?',
  frames: {
    see: 'However the drones started, after many hours the bars landed on ___, and one more hour left them ___.',
    means: 'The settled arrangement is an ___ with eigenvalue ___. The other eigenvalues are smaller than 1, so their parts ___.',
    called: 'The matrix of shares is a ___ matrix; repeating it is a ___ chain; the settled arrangement is the ___ vector.',
    cue: 'When you see “fixed chances of moving between states”, think ___.',
  },
  wordBank: ['bars', 'unchanged', 'eigenvector', '1', 'shrink away', 'columns add to 1', 'transition', 'Markov', 'steady-state'],
};

// ------------------------------------------------------------------ (F) "Where they end up depends on where they start."

/** The triangle of splits with two draggable starts and their paths. */
export function twoStarts(p: PuzzleCtx, P0: Mat, a0: Vec, b0: Vec) {
  void p.g.stage.view2D({ center: [0, 2.6], height: 11.2, ms: 0 });
  let P = P0;
  const sx = new Simplex(p, P, STATIONS);
  const r = p.readout('Two starts, 60 hours');
  let a = a0.slice(), b = b0.slice();
  const mk = (color: string) => {
    const ring = new Arrow([0, 0, 0.06], [0, 0, 0.06], { color, handle: true });
    p.add(ring);
    return ring;
  };
  const ra = mk(C.v), rb = mk(C.w);
  const paint = () => {
    sx.setP(P);
    const ea = sx.path(0, a, 60, C.v), eb = sx.path(1, b, 60, C.w);
    const qa = triPoint(a), qb = triPoint(b);
    ra.set([qa[0], qa[1], 0.06], [qa[0], qa[1], 0.06]); rb.set([qb[0], qb[1], 0.06], [qb[0], qb[1], 0.06]);
    r.row('a', 'start A', fmtV(a.map((x) => Math.round(x))), C.v);
    r.row('b', 'start B', fmtV(b.map((x) => Math.round(x))), C.w);
    r.row('ea', 'A after 60 hours', fmtV(ea.map((x) => Math.round(x * 10) / 10)), C.result);
    r.row('eb', 'B after 60 hours', fmtV(eb.map((x) => Math.round(x * 10) / 10)), C.result);
  };
  for (const [ring, set] of [[ra, (v: Vec) => { a = v; }], [rb, (v: Vec) => { b = v; }]] as [Arrow, (v: Vec) => void][]) {
    p.g.drag.add({
      target: ring.grab, getPos: () => ring.to.clone(), snap: () => null, planar: true,
      constrain: (q) => { const s = triPoint(triSplit([q.x, q.y], TOTAL)); q.set(s[0], s[1], 0.06); return q; },
      onMove: (q) => { set(triSplit([q.x, q.y], TOTAL)); paint(); },
      onEnd: () => p.move(),
    });
  }
  paint();
  return {
    get a() { return a; }, get b() { return b; }, get P() { return P; },
    set(na: Vec, nb: Vec, nP: Mat = P) { a = na.slice(); b = nb.slice(); P = nP; paint(); },
  };
}
const randSplit = (r: () => number): Vec => { const x = [rint(r, 0, 10), rint(r, 0, 10), rint(r, 0, 10)]; const s = x.reduce((u, v) => u + v, 0) || 1; return x.map((t) => (t / s) * TOTAL); };

export const doubtStart: DoubtDef = {
  id: 'c20-d-start', who: 'bram', isTrue: false,
  claim: 'Where the drones end up depends on where they start. Start them at the Stern and they’ll stay near the Stern.',
  reason: 'Not for this chain. Write any start as the steady arrangement plus parts along the other eigenvectors. Those parts have eigenvalues 0.6 and 0.5, so they shrink away hour by hour, and only the steady part is left: $(150, 90, 60)$ from every start.',
  goal: 'Drag the two starts (green and red) anywhere in the triangle of splits. **Challenge it** (two starts that end at the same place) or **Back it**.',
  view: '2d',
  setup(p) {
    const sc = twoStarts(p, DRONES, [0, 0, TOTAL], [TOTAL, 0, 0]);
    return {
      holds: () => startMattersHolds(DRONES, sc.a, sc.b),
      describe: () => `starts ${fmtV(sc.a.map((x) => Math.round(x)))} and ${fmtV(sc.b.map((x) => Math.round(x)))} both end at ${fmtV(DRONES_STEADY)}`,
      randomize(r) { sc.set(randSplit(r), randSplit(r)); },
      edgeCases: 0,
      async showMe() { sc.set([0, 0, TOTAL], [TOTAL, 0, 0]); },
    };
  },
};

// ------------------------------------------------------------------ (F) "Every chain settles."

/** Two bays with a stay share each: Bay 1's drones over 30 hours, plotted. */
export function baysScene(p: PuzzleCtx) {
  void p.g.stage.view2D({ center: [2.6, 1.95], height: 5.6, ms: 0 });
  const axes = new FatLine(p.g.stage, [[0, 2.2, 0], [0, 0, 0], [5.6, 0, 0]], { color: '#8fb8e8', width: 1.4, opacity: 0.6 });
  const half = new FatLine(p.g.stage, [[0, 1, 0], [5.6, 1, 0]], { color: C.result, width: 1.2, opacity: 0.35, dashed: true });
  const graph = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.v, width: 2.2, opacity: 0.95 });
  p.add(axes.object, half.object, graph.object);
  p.onDispose(() => { axes.dispose(); half.dispose(); graph.dispose(); });
  ptag(p, 'all in Bay 1', [0, 2, 0], 'dim', [-48, 0]);
  ptag(p, 'half', [0, 1, 0], 'dim', [-28, 0]);
  ptag(p, 'hours →', [5.6, 0, 0], 'dim', [0, 18]);
  let a = 0, b = 0;
  const r = p.readout('Two bays');
  const P = (): Mat => [[a, 1 - b], [1 - a, b]];
  const paint = () => {
    let x: Vec = [1, 0];
    const pts: V3[] = [[0, 2, 0.01]];
    for (let k = 1; k <= 30; k++) { x = matVec(P(), x); pts.push([(k * 5.6) / 30, x[0] * 2, 0.01]); }
    graph.setPoints(pts);
    r.row('a', 'Bay 1 stay share', `${Math.round(a * 100)}%`, C.w);
    r.row('b', 'Bay 2 stay share', `${Math.round(b * 100)}%`, C.w);
    r.row('s', 'settles?', settlesHolds(P()) ? 'yes' : 'no: it swings forever', settlesHolds(P()) ? C.good : C.orange);
  };
  const sa = fslider({ label: 'Bay 1 stay', min: 0, max: 0.9, step: 0.1, value: 0, format: (v) => `${Math.round(v * 100)}%`, onInput: (v) => { a = v; paint(); } });
  const sb = fslider({ label: 'Bay 2 stay', min: 0, max: 0.9, step: 0.1, value: 0, format: (v) => `${Math.round(v * 100)}%`, onInput: (v) => { b = v; paint(); } });
  p.dock().append(sa.el, sb.el);
  paint();
  return { P, set(na: number, nb: number) { a = na; b = nb; sa.set(na, false); sb.set(nb, false); paint(); } };
}

export const doubtSettles: DoubtDef = {
  id: 'c20-d-settles', who: 'bram', isTrue: false,
  claim: 'Every chain settles eventually. Give it enough hours.',
  reason: 'The swap $\\left[\\begin{smallmatrix} 0 & 1 \\\\ 1 & 0 \\end{smallmatrix}\\right]$ never settles: all the drones change bay every hour, forever. Its eigenvalues are 1 and −1, and the −1 part flips sign every hour without shrinking. A chain settles from every start when its other eigenvalues are smaller than 1 in size; a regular chain always is.',
  goal: 'Set each bay’s stay share. The green line is Bay 1’s share of the drones, hour by hour. **Challenge it** (a chain that never settles) or **Back it**.',
  view: '2d',
  setup(p) {
    const sc = baysScene(p);
    sc.set(0.3, 0.2);
    return {
      holds: () => settlesHolds(sc.P()),
      describe: () => { const P = sc.P(); return `stay shares ${Math.round(P[0][0] * 100)}% and ${Math.round(P[1][1] * 100)}%: ${settlesHolds(P) ? 'it settles' : 'every hour the drones swap bays: it never settles'}`; },
      randomize(r, edge) { if (edge === 0 || r() < 0.55) sc.set(0, 0); else sc.set(rint(r, 0, 9) / 10, rint(r, 0, 9) / 10); },
      edgeCases: 1,
      async showMe(stance) { sc.set(stance === 'challenge' ? 0 : 0.3, stance === 'challenge' ? 0 : 0.2); },
    };
  },
};

// ------------------------------------------------------------------ (T) "Steady state does not mean the drones stop moving."

export const doubtMoving: DoubtDef = {
  id: 'c20-d-moving', who: 'bram', isTrue: true,
  claim: 'Settled doesn’t mean the drones stop. They keep moving; only the counts stop changing.',
  reason: `At $(150, 90, 60)$, ${fmtN(movingAtSteady(DRONES))} drones change section every hour. The flows balance: as many arrive in each section as leave it, so $P\\mathbf q = \\mathbf q$ while the drones keep moving.`,
  goal: 'The drones sit at the settled arrangement. **Run an hour** and count who moves. **Back it** (Bram will shake in other chains) or **Challenge it**.',
  view: '2d',
  setup(p) {
    // the whole board below the doubt card
    void p.g.stage.view2D({ center: [-2.2, 2.85], height: 13, ms: 0 });
    let P = DRONES.map((r) => r.slice());
    const fb = new FlowBoard(p, { P, x0: steadyOf(P, TOTAL)!, names: STATIONS });
    const r = p.readout('Settled, and moving');
    const paint = () => {
      fb.x.forEach((x, i) => r.row(`s${i}`, STATIONS[i], fmtN(Math.round(x * 10) / 10), C.result));
      r.row('m', 'drones moving per hour', fmtN(Math.round(movingAtSteady(P) * 10) / 10), C.w);
    };
    paint();
    return {
      holds: () => stillMovingHolds(P),
      describe: () => `the chain settles at ${fmtV(steadyOf(P, TOTAL)!.map((x) => Math.round(x * 10) / 10))}, and ${fmtN(Math.round(movingAtSteady(P)))} drones still change section every hour`,
      async play() { await fb.hour(p.g.headless ? 1 : 1100); paint(); },
      randomize(rr) { P = randChain(rr, 3, 1); fb.P = P; fb.set(steadyOf(P, TOTAL)!); paint(); },
      edgeCases: 0,
      async showMe() { await fb.hour(p.g.headless ? 1 : 1100); paint(); },
    };
  },
};

// ------------------------------------------------------------------ the Law

export const law: LawDef<ChainCase> = {
  ...LAW_CORE,
  frame: ['If every **column** of $P$ adds to 1 (no entry negative), then ', { slot: 'then' }, '.'],
  slots: {
    then: { options: [
      { id: 'eig1', text: '1 is an eigenvalue of P' },
      { id: 'settles', text: 'the chain settles from every start' },
      { id: 'smaller', text: 'every other eigenvalue is smaller than 1 in size' },
      { id: 'unique', text: 'exactly one arrangement never changes' },
    ] },
  },
  cadetSlots: ['then'],
  draw(g: Game, c: ChainCase) {
    const W = g.stage.world;
    const n = c.P.length;
    const at: [number, number][] = n === 2 ? [[-2, 0], [2, 0]] : [[-2.4, -1], [2.4, -1], [0, 2]];
    at.forEach(([x, y], j) => {
      W.add(new Dot([x, y, 0], { color: C.result, size: 0.2 }).object);
      for (let i = 0; i < n; i++) {
        if (i === j || c.P[i][j] < 0.02) continue;
        const [tx, ty] = at[i];
        const d = [tx - x, ty - y], L = Math.hypot(d[0], d[1]), u = [d[0] / L, d[1] / L], nr = [-u[1] * 0.15, u[0] * 0.15];
        W.add(new Arrow([x + u[0] * 0.4 + nr[0], y + u[1] * 0.4 + nr[1], 0], [tx - u[0] * 0.4 + nr[0], ty - u[1] * 0.4 + nr[1], 0], { color: C.w, width: 0.02 + 0.05 * c.P[i][j] }).object);
      }
    });
  },
  reason: {
    ask: 'Your Law survived. **Why** must 1 be an eigenvalue?',
    options: [
      { id: 'a', text: 'Each column adds to 1, so each row of $P^{\\mathsf T}$ adds to 1 and $P^{\\mathsf T}\\mathbf 1 = \\mathbf 1$. So $\\det(P^{\\mathsf T} - I) = 0$, and $P - I$ has the same determinant as its transpose.', right: true, why: 'Yes. The all-ones arrow is an eigenvector of $P^{\\mathsf T}$ with eigenvalue 1, and $P$ and $P^{\\mathsf T}$ share their characteristic polynomial. So $P$ has eigenvalue 1 too, with the steady arrangement as its eigenvector.' },
      { id: 'b', text: 'Because the chain always settles, and the settled arrangement is an eigenvector.', right: false, why: 'The swap never settles, yet 1 is still one of its eigenvalues. The eigenvalue comes from the column sums, not from settling.' },
      { id: 'c', text: 'Because $P\\mathbf 1 = \\mathbf 1$: each row adds to 1.', right: false, why: 'The rows need not add to 1. In the drone chain the Bow row adds to 1.2. It is the columns that add to 1, which is a statement about $P^{\\mathsf T}$.' },
    ],
  },
};

// ------------------------------------------------------------------ the Procedure

export const PROC_TILES = [
  { id: 'start', text: 'START ANYWHERE: all 300 drones at the Bow', py: 'x = [300, 0, 0]' },
  { id: 'apply', text: 'APPLY $P$: one hour', py: '    x = matvec(P, x)' },
  { id: 'rescale', text: 'RESCALE TO ADD TO 1', py: '    x = [t / sum(x) for t in x]' },
  { id: 'repeat', text: 'REPEAT the steps above UNTIL THE CHANGE IS UNDER 0.001', py: 'while change > 0.001: ...' },
];
export const PROC_DECOYS = [
  { id: 'len', text: 'RESCALE TO LENGTH 1', py: '    x = [t / length(x) for t in x]' },
  { id: 'solve0', text: 'SOLVE $P\\mathbf q = \\mathbf 0$', py: 'q = solve(P, [0, 0, 0])' },
];

export const procedure: ProcedureDef = {
  id: 'c20-proc',
  title: 'Where the drones settle, by repetition',
  brief: 'Order the steps. LANTERN runs them exactly as written on the drone chain and reports the shares that one more hour leaves unchanged.',
  tiles: PROC_TILES,
  decoys: PROC_DECOYS,
  reference: PROC_REF,
  async run(g, ids) {
    const res = runProc(ids);
    g.stage.clearWorld();
    await g.stage.view2D({ center: [-2.35, -1.45], height: 7.5, ms: 300 });
    const W = g.stage.world;
    const step = new Label('LANTERN runs your steps', [0, 1.75, 0], { className: 'a7-board step' });
    W.add(step.object);
    // three bars, redrawn for each pass
    const bars = STATIONS.map((s, i) => {
      const bar = new Arrow([-2 + 2 * i, -1.2, 0], [-2 + 2 * i, -1.2, 0], { color: [C.accent, '#c9b49a', C.result][i], width: 0.18 });
      W.add(bar.object, new Label(s, [-2 + 2 * i, -1.6, 0], { className: 'a7-tag dim' }).object);
      return bar;
    });
    const scaleOf = (x: Vec) => { const s = x.reduce((a, b) => a + b, 0); return s > 2 ? 1 / TOTAL : 1; };
    const show = (x: Vec) => bars.forEach((b, i) => b.setTo([-2 + 2 * i, -1.2 + Math.max(0.001, x[i] * scaleOf(x) * 2.2), 0]));
    const shown = res.trace.slice(0, 14);
    for (const [k, x] of shown.entries()) {
      show(x);
      step.set(`pass ${k + 1}: ${fmtV(x.map((t) => (Math.abs(t) > 2 ? Math.round(t) : Math.round(t * 1000) / 1000)))}`);
      sfx.tick(k % 6);
      await wait(g.headless ? 1 : 260);
    }
    if (res.result) show(res.result);
    if (res.ok) { step.set(`Settled after ${res.repeats} repeats: ${procShares(res.result!)}, to three decimals`); sfx.success(); }
    else { step.set('LANTERN stopped. See the message.'); g.stage.nudge(0.1); }
    return { ok: res.ok, message: res.message };
  },
};

// ------------------------------------------------------------------ Ilse's page

export const compare: CompareDef = {
  id: 'c20',
  page: 'A **Markov chain** repeats one **transition matrix** $P$ on a **probability vector**: entries that are not negative and add to 1. Column $j$ of $P$ lists where whatever is at state $j$ goes, so each column adds to 1, and $\\mathbf x_{k+1} = P\\mathbf x_k$.\n\nA **steady-state vector** is a probability vector $P$ leaves unchanged: $P\\mathbf q = \\mathbf q$, an eigenvector with eigenvalue 1. One always exists. Each column adds to 1, so $P^{\\mathsf T}\\mathbf 1 = \\mathbf 1$; $P$ and $P^{\\mathsf T}$ have the same characteristic polynomial, so 1 is an eigenvalue of $P$ as well.\n\nIn a **regular** chain (some power of $P$ has no zero entry) every other eigenvalue is smaller than 1 in size. Their parts shrink away, so every start ends at the same $\\mathbf q$. The drones keep moving; only the counts stop changing. The swap is not regular: its eigenvalue −1 never lets it settle.',
  formula: 'P\\mathbf q = \\mathbf q,\\quad \\sum_i q_i = 1 \\qquad P^{\\mathsf T}\\mathbf 1 = \\mathbf 1 \\implies \\det(P - I) = \\det(P^{\\mathsf T} - I) = 0',
  keyIdeas: [
    'Did you say the steady state is an eigenvector with eigenvalue 1?',
    'Did you say why 1 must be an eigenvalue: the columns add to 1, so $P^{\\mathsf T}\\mathbf 1 = \\mathbf 1$?',
    'Did you say why the start does not matter for a regular chain: the other eigenvalues shrink their parts away?',
  ],
};
