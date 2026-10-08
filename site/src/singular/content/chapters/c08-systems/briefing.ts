// Chapter 8 Briefing (GDD §6.5 Ch 8): Say it, two Doubts (one false, one true), the Law, Ilse's page.
import type { CompareDef, DoubtDef, Game, LawDef, SayItDef } from '../../../game/types';
import { MatrixInput, Slider } from '../../../ui/widgets';
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { sfx } from '../../../audio/sfx';
import { animate, ease } from '../../../core/tween';
import { PlaneSet, worldHost } from './planes';
import { drawTwin } from './puzzles';
import { directions, kindOf, onAll, pt, rowTex, type Aug } from './act3';
import { D1_COUNTER, D1_START, D2_SHOW, D2_START, LAW_C08, d1Holds, d1Random, d2Holds, d2Random, type C08Case } from './logic';
import './act3.css';

export const sayit: SayItDef = {
  id: 'c08', who: 'bram',
  ask: 'Why can\'t a system of linear equations have exactly two solutions?',
  frames: {
    see: 'Each equation is a ___. The solutions are where they all ___.',
    means: 'If two points are on every plane, then every point on the ___ through them is on every plane, because each plane is ___.',
    called: 'Equations that must all hold are a ___ of linear equations. A point on every plane is a ___.',
    cue: 'When several conditions must all hold, think ___.',
  },
  wordBank: ['plane', 'line', 'point', 'meet', 'flat', 'every', 'two', 'marker', 'system', 'solution', 'planes meeting'],
};

const meetWords = (rows: Aug) => {
  const k = kindOf(rows);
  if (k !== 'many') return k === 'one' ? 'they meet at one point' : 'they never meet';
  // one free direction: a line; two: one plane twice (or one row reads 0 = 0); three: every row reads 0 = 0
  const free = directions(rows).length;
  return free === 1 ? 'they meet along a whole line' : free === 2 ? 'they share a whole plane' : 'every point is on both';
};

export const doubtUnknowns: DoubtDef = {
  id: 'c08-d-unknowns', who: 'bram', isTrue: false,
  claim: 'More unknowns than equations means infinitely many solutions. Two planes in three dimensions always share a line.',
  reason: 'Two planes can be parallel: then no point is on both, however many unknowns there are. More unknowns than equations allows a line of solutions; it does not promise one.',
  goal: 'Edit the two planes (each row: the numbers in front of x, y, z, then the right side). **Challenge it** with two planes that share no point, or **Back it** and let Bram shake it.',
  view: '3d',
  setup(p) {
    let rows: Aug = D1_START.map((r) => r.slice());
    const planes = new PlaneSet(p, { n: 3, rows, size: 7, focus: [0, 0, 0] });
    void planes.frame({ distance: 22, azimuth: -20, elevation: 20 }); // both starting planes slanted, and x + y + z = c planes too
    const r = p.readout('Two planes, three unknowns');
    const paint = () => r.row('m', 'Where they meet', meetWords(rows), C.result);
    const input = new MatrixInput({ rows: 2, cols: 4, values: rows, onChange: (m) => { rows = m; void planes.setRows(rows, 300); paint(); } });
    p.dock().append(h('div', { class: 'kicker' }, 'Planes: x, y, z | right side'), input.el);
    paint();
    const set = async (m: Aug, ms = 500) => { rows = m.map((x) => x.slice()); input.set(rows); await planes.setRows(rows, ms); paint(); };
    return {
      holds: () => d1Holds(rows),
      describe: () => `planes $${rowTex(rows[0])}$ and $${rowTex(rows[1])}$: ${meetWords(rows)}`,
      randomize: (rng, edge) => set(d1Random(rng, edge ?? -1), 250),
      edgeCases: 1,
      async showMe() { await set(D1_COUNTER, 700); },
    };
  },
};

export const doubtColumns: DoubtDef = {
  id: 'c08-d-columns', who: 'bram', isTrue: true,
  claim: 'If the column arrows can reach the right-hand side, then the lines or planes all meet. Every time.',
  reason: 'Weights x, y that make x·(column 1) + y·(column 2) equal the right side are the same numbers that make each row true. Reaching the right side in the column picture is landing on every line in the row picture.',
  goal: 'Set the weights so the yellow tip reaches the ring. Watch the point on the left. **Back it** (Bram will shake it) or **Challenge it** with a case where the tip reaches the ring but the lines miss.',
  view: '2d',
  setup(p) {
    p.g.stage.view2D({ center: [0.2, 1.9], height: 14.5, ms: 0 }); // panel captions below the settled doubt card
    const cfg = { rows: D2_START.rows, rowO: [-6.4, 0], rowBox: [-3, -3, 3, 3] as [number, number, number, number], colO: [3.6, 0], colBox: [-7, -7, 7, 7] as [number, number, number, number], colK: 3 / 7 };
    const tw = drawTwin(p, D2_START.w.slice(), cfg);
    const sx = new Slider({ label: 'weight $x$', min: -3, max: 3, step: 0.5, value: 0, onInput: (v) => { tw.set([v, tw.xy[1]]); p.move(); } });
    const sy = new Slider({ label: 'weight $y$', min: -3, max: 3, step: 0.5, value: 0, onInput: (v) => { tw.set([tw.xy[0], v]); p.move(); } });
    p.dock().append(sx.el, sy.el);
    const reaches = () => { const t = tw.tip(); return Math.hypot(t[0] - tw.rows[0][2], t[1] - tw.rows[1][2]) < 1e-6; };
    const glow = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 0]], { color: C.result, width: 2, opacity: 0 });
    p.add(glow.object);
    p.onDispose(() => glow.dispose());
    const setCase = (rows: Aug, w: number[]) => { tw.setRows(rows); tw.set(w); tw.planes.placeLabels(); sx.set(w[0], false); sy.set(w[1], false); };
    return {
      holds: () => d2Holds(tw.rows, tw.xy),
      describe: () => `rows $${rowTex(tw.rows[0], ['x', 'y'])}$ and $${rowTex(tw.rows[1], ['x', 'y'])}$, weights ${pt(tw.xy)}: ${reaches() ? `the tip reaches ${pt([tw.rows[0][2], tw.rows[1][2]])} and the point ${pt(tw.xy)} is ${onAll(tw.rows, tw.xy, 1e-6) ? 'on both lines' : 'off a line'}` : 'the tip misses the ring'}`,
      async play() { if (reaches()) { sfx.snap(); void tw.pad.hit(); await animate(300, () => {}, ease.linear); tw.pad.reset('#9fd8ff'); } },
      randomize: (rng, edge) => { const c = d2Random(rng, edge ?? -1); setCase(c.rows, c.w); },
      edgeCases: 1,
      async showMe() {
        setCase(D2_SHOW.rows, [0, 0]);
        const to = D2_SHOW.w;
        await animate(900, (k) => tw.set([to[0] * k, to[1] * k]), ease.inOut);
        setCase(D2_SHOW.rows, to);
      },
    };
  },
};

/** Draw one Proving Ground case: the planes, the two solutions (white), the test point (yellow or grey). */
function drawCase(g: Game, c: C08Case): void {
  if (g.stage.mode !== '3d') void g.stage.view3D({ target: c.p.map((x, i) => (x + c.q[i]) / 2) as [number, number, number], distance: 24, azimuth: -55, elevation: 24, ms: 0, orbit: false });
  const host = worldHost(g);
  new PlaneSet(host, { n: 3, rows: c.rows, labels: false, showSolution: false, size: 9, focus: c.p.map((x, i) => (x + c.q[i]) / 2), axes: false });
  const solves = onAll(c.rows, c.r, 1e-6);
  const dir = c.q.map((x, i) => x - c.p[i]);
  const L = 3;
  const a = c.p.map((x, i) => x - dir[i] * L), b = c.p.map((x, i) => x + dir[i] * (1 + L));
  const line = new FatLine(g.stage, [[a[0], a[1], a[2]], [b[0], b[1], b[2]]], { color: '#e8f1ff', width: 1.4, opacity: 0.5, dashed: true });
  host.add(line.object);
  host.onDispose(() => line.dispose());
  host.add(new Dot([c.p[0], c.p[1], c.p[2]], { color: '#e8f1ff', size: 0.14, label: 'p' }));
  host.add(new Dot([c.q[0], c.q[1], c.q[2]], { color: '#e8f1ff', size: 0.14, label: 'q' }));
  host.add(new Dot([c.r[0], c.r[1], c.r[2]], { color: solves ? C.result : '#7d8aa5', size: 0.17, glow: 2.4, label: solves ? 'solves' : 'does not solve' }));
}

export const law: LawDef<C08Case> = { ...LAW_C08, draw: drawCase };

export const compare: CompareDef = {
  id: 'c08',
  page: 'A **system of linear equations** asks for points that make every equation true at once. In three unknowns each equation $a_1x + a_2y + a_3z = b$ is a flat **plane** (in two unknowns, a line), so the **solutions** are the points on every plane.\n\nThree planes meet at one point, along a line, or nowhere, unless all three are the same plane, which then holds every solution. They never meet at exactly two points: if two points are on a plane, the whole line through them is on it, because a plane is flat. Two solutions bring the line through them, so a system has no solution, one, or infinitely many.\n\nThe same numbers read down the columns ask a second question: which weights on the column arrows reach the right side? The weights that do are the solutions. Row picture and column picture, one answer.',
  formula: '\\begin{aligned} x + y &= 5 \\\\ x - y &= 1 \\end{aligned} \\quad\\Longleftrightarrow\\quad x\\cg{\\begin{bmatrix}1\\\\1\\end{bmatrix}} + y\\cr{\\begin{bmatrix}1\\\\-1\\end{bmatrix}} = \\cy{\\begin{bmatrix}5\\\\1\\end{bmatrix}}',
  keyIdeas: [
    'Did you say that each equation is a plane (a line in two unknowns)?',
    'Did you say that a solution is a point on every plane at once?',
    'Did you say why two solutions bring the whole line through them?',
  ],
};
