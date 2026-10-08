// Chapter 10 Briefing (GDD §6.5 Ch 10): Say it, three Doubts, the Law, Ilse's page; and the Act III
// Review (Bram's four claims).
import type { CompareDef, DoubtDef, Game, LawDef, PuzzleCtx, ReviewDef, SayItDef, V3 } from '../../../game/types';
import { RowOpsBoard } from '../../../kit/rowops';
import { gaussJordanSteps } from '../../../math/rref';
import { MatrixInput, Slider } from '../../../ui/widgets';
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease } from '../../../core/tween';
import { Dot } from '../../../gfx/markers';
import { PlaneSet, worldHost } from '../c08-systems/planes';
import { kindOf, pt, rowTex, somePoint, type Aug } from '../c08-systems/act3';
import {
  D_FREE_COUNTER, D_FREE_START, D_ONE_COUNTER, D_ONE_START, D_RHS_START, LAW_C10, R1_COUNTER, R1_START, R2_START, R3_START,
  R4_SHOW, R4_START, freeCount, freeFromZeroHolds, freeRandom, oneAnswerHolds, oneRandom, r1Holds, r1Random, r2Holds, r2Random,
  r3Holds, r3Random, r4Holds, r4Random, rhsPivot, rhsPivotHolds, rhsRandom, zeroRows, type C10Case, type TwoCase,
} from './logic';
import '../c08-systems/act3.css';

const meetWords = (m: Aug) => { const k = kindOf(m); return k === 'one' ? `one point, ${pt(somePoint(m)!)}` : k === 'many' ? 'infinitely many points' : 'no point'; };
const eqs = (m: Aug) => m.map((r) => `$${rowTex(r)}$`).join(', ');

export const sayit: SayItDef = {
  id: 'c10', who: 'bram',
  ask: 'Why are all the solutions of a system one solution plus the solutions of the same system with zeros on the right?',
  frames: {
    see: 'The line of answers with every meter at 0 was ___ to the real line, and one ___ moved it onto it.',
    means: 'Each equation reads its right side at one solution and ___ along the zero-meter line, so adding them keeps the ___.',
    called: 'A column with no pivot gives a ___ variable. The system with zeros on the right is ___.',
    cue: 'When you see "describe all solutions", think ___.',
  },
  wordBank: ['parallel', 'arrow', '0', 'right side', 'free', 'pivot', 'homogeneous', 'particular solution', 'reduce, then count pivots'],
};

/** An editable system: a matrix of numbers in the dock, its planes in the world, where they meet. */
function systemEditor(p: PuzzleCtx, start: Aug, o: { label?: string; size?: number } = {}) {
  let rows = start.map((r) => r.slice());
  const f0 = somePoint(rows) ?? [0, 0, 0];
  const planes = new PlaneSet(p, { n: 3, rows, size: o.size ?? 7, focus: f0 });
  void planes.frame({ distance: 22, azimuth: -60, elevation: 22, target: f0 });
  const r = p.readout('The planes');
  const paint = () => r.row('m', 'They share', meetWords(rows), C.result);
  const box = h('div');
  let input: MatrixInput;
  const build = () => {
    input = new MatrixInput({ rows: rows.length, cols: 4, values: rows, onChange: (m) => { rows = m; void planes.setRows(rows, 300); paint(); } });
    box.replaceChildren(input.el);
  };
  build();
  p.dock().append(h('div', { class: 'kicker' }, o.label ?? 'Planes: x, y, z | right side'), box);
  paint();
  return {
    r,
    get rows() { return rows; },
    async set(m: Aug, ms = 400) {
      const reshape = m.length !== rows.length;
      rows = m.map((x) => x.slice());
      if (reshape) build(); else input.set(rows);
      await planes.setRows(rows, reshape ? 0 : ms);
      paint();
      // a new case: aim at where its planes meet (no common point: keep the view)
      const f = somePoint(rows);
      if (f) await planes.refocus(f, ms);
    },
  };
}

export const doubtOne: DoubtDef = {
  id: 'c10-d-one', who: 'bram', isTrue: false,
  claim: 'Three equations in three unknowns always have exactly one answer. Three planes, one point.',
  reason: 'Three planes can share a whole line, or form a tube with no common point. Counting equations does not decide it: the pivots do.',
  goal: 'Edit the three planes. **Challenge it** with three planes that do not meet at exactly one point, or **Back it** and let Bram shake it.',
  view: '3d',
  setup(p) {
    const ed = systemEditor(p, D_ONE_START);
    return {
      holds: () => oneAnswerHolds(ed.rows),
      describe: () => `${eqs(ed.rows)}: ${meetWords(ed.rows)}`,
      randomize: (r, edge) => ed.set(oneRandom(r, edge ?? -1), 200),
      edgeCases: 2,
      async showMe() { await ed.set(D_ONE_COUNTER, 700); },
    };
  },
};

export const doubtFree: DoubtDef = {
  id: 'c10-d-free', who: 'bram', isTrue: false,
  claim: 'Free variables come from zero rows. Count the zero rows and you have counted the free variables.',
  reason: 'Free variables come from columns without a pivot. Two equations in three unknowns can have no zero row at all and still leave one unknown free.',
  goal: 'Choose two or three equations and edit them. **Challenge it** with a system whose free variables do not match its zero rows, or **Back it**.',
  view: '3d',
  setup(p) {
    const ed = systemEditor(p, D_FREE_START);
    const paint = () => { ed.r.row('f', 'Free variables', String(freeCount(ed.rows))); ed.r.row('z', 'Zero rows after reducing', String(zeroRows(ed.rows))); };
    const two = h('button', { class: 'btn small', type: 'button' }, 'Two equations') as HTMLButtonElement;
    const three = h('button', { class: 'btn small', type: 'button' }, 'Three equations') as HTMLButtonElement;
    two.addEventListener('click', () => { p.move(); void ed.set(ed.rows.slice(0, 2)).then(paint); });
    three.addEventListener('click', () => { p.move(); void ed.set(ed.rows.length === 3 ? ed.rows : [...ed.rows, ed.rows[0].map((x, i) => x + ed.rows[1][i])]).then(paint); });
    p.dock().prepend(h('div', { class: 'c09-btns' }, two, three));
    p.tick(() => paint());
    return {
      holds: () => freeFromZeroHolds(ed.rows),
      describe: () => `${ed.rows.length} equations: ${freeCount(ed.rows)} free variable${freeCount(ed.rows) === 1 ? '' : 's'}, ${zeroRows(ed.rows)} zero row${zeroRows(ed.rows) === 1 ? '' : 's'}`,
      randomize: (r, edge) => ed.set(freeRandom(r, edge ?? -1), 200),
      edgeCases: 1,
      async showMe() { await ed.set(D_FREE_COUNTER, 500); },
    };
  },
};

export const doubtRhs: DoubtDef = {
  id: 'c10-d-rhs', who: 'bram', isTrue: true,
  claim: 'If the right-hand column ends up with a pivot, there is no solution.',
  reason: 'A pivot in the right-hand column is a row $[\\,0\\;0\\;0 \\mid 1\\,]$, which says $0 = 1$. No point makes that true, and row operations never change the solutions.',
  goal: 'Reduce the board fully and look at the right-hand column. **Back it** (Bram shakes it with other systems) or **Challenge it** with a system that has a pivot there and still a solution.',
  view: '3d',
  setup(p) {
    const board = new RowOpsBoard(p, { aug: D_RHS_START, n: 3 });
    const planes = new PlaneSet(p, { n: 3, rows: D_RHS_START });
    void planes.frame({ distance: 23 });
    let orig = D_RHS_START;
    const nums = () => board.get().map((r) => r.map((x) => x.value()));
    board.subscribe((m, _op, ms) => { const by: Aug = []; board.order().forEach((id, pos) => { by[id] = m[pos].map((x) => x.value()); }); void planes.setRows(by, ms); });
    const r = p.readout('The right-hand column');
    // read the right-hand column only once the board is fully reduced: before that no row need say 0 = 1 yet
    p.tick(() => { r.row('piv', 'Has a pivot', !board.isRREF() ? 'reduce fully to see' : rhsPivot(nums()) ? 'yes: a row reads 0 = 1' : 'no'); r.row('s', 'Solutions', meetWords(orig)); });
    return {
      holds: () => rhsPivotHolds(nums()),
      describe: () => `${rhsPivot(nums()) ? 'a pivot in the right-hand column' : 'no pivot in the right-hand column'}: ${meetWords(nums())}`,
      randomize(rr, edge) { orig = rhsRandom(rr, edge ?? -1); board.set(orig); },
      edgeCases: 1,
      async showMe() { board.reset(); orig = D_RHS_START; await board.play(gaussJordanSteps(board.get()).ops, 500); },
    };
  },
};

/** A Law case drawn on the holotable when it has 2 or 3 unknowns. */
function drawCase(g: Game, c: C10Case): void {
  const n = c.aug[0].length - 1;
  if (n !== 2 && n !== 3) return;
  const host = worldHost(g);
  const f = somePoint(c.aug) ?? new Array(n).fill(0);
  if (n === 3) { if (g.stage.mode !== '3d') void g.stage.view3D({ target: [f[0], f[1], f[2]], distance: 24, azimuth: -55, elevation: 24, ms: 0, orbit: false }); }
  else void g.stage.view2D({ center: [f[0], f[1]], height: 12, ms: 0 });
  new PlaneSet(host, { n: n as 2 | 3, rows: c.aug, labels: false, size: 9, focus: f, axes: false });
}

export const law: LawDef<C10Case> = {
  ...LAW_C10,
  frame: ['The number of free variables is ', { slot: 'count' }, '.'],
  slots: {
    count: { options: [
      { id: 'nopivot', text: 'the number of columns without a pivot' },
      { id: 'zerorows', text: 'the number of zero rows' },
      { id: 'diff', text: 'the number of unknowns minus the number of equations' },
    ] },
  },
  cadetSlots: ['count'],
  draw: drawCase,
  reason: {
    ask: 'Your Law survived. **Why** is it the columns without a pivot?',
    options: [
      { id: 'cols', right: true, text: 'In reduced row echelon form each pivot row fixes its pivot column\'s unknown from the others. An unknown whose column has no pivot is fixed by no row, so it can take any value.', why: 'Yes. Each row names one basic variable; every other unknown is free.' },
      { id: 'rows', right: false, text: 'Each zero row is an equation that was lost, and each lost equation frees one unknown.', why: 'Only when there are as many equations as unknowns. Two equations in three unknowns have no zero row and one free variable.' },
      { id: 'count', right: false, text: 'Unknowns minus equations is how many are left over.', why: 'Repeated equations add rows but no pivots: three copies of one line in two unknowns still leave one unknown free, not none.' },
    ],
  },
};

export const compare: CompareDef = {
  id: 'c10',
  page: 'Keep going past the staircase until every pivot is 1 and is the only non-zero entry in its column: **reduced row echelon form**. Then each row reads "basic variable = number − (free variables)".\n\nA column with **no pivot** gives a **free variable**: it can take any value, and the basic variables follow. Collecting by free variable gives the **parametric vector form**: one point plus any amount of each free direction.\n\nSubtract two solutions of the same system and every equation reads $b - b = 0$: the difference solves the **homogeneous** system (zeros on the right). So all solutions are one **particular solution** plus the solutions of the homogeneous system: a point, line or plane shifted away from the origin. A row $[\\,0\\;\\cdots\\;0 \\mid 1\\,]$ means no solution at all.',
  formula: '\\mathbf x = \\cy{\\begin{bmatrix}3\\\\1\\\\0\\end{bmatrix}} + t\\begin{bmatrix}1\\\\1\\\\1\\end{bmatrix}',
  keyIdeas: [
    'Did you say that free variables come from columns without a pivot?',
    'Did you say that the difference of two solutions solves the system with zeros on the right?',
    'Did you say that a row reading 0 = 1 means no solution?',
  ],
};

// ------------------------------------------------------------------ the Act III Review (Bram)

const review1: DoubtDef = {
  id: 'c10-r1', who: 'bram', isTrue: false,
  claim: 'More unknowns than equations always means infinitely many solutions.',
  reason: 'Two parallel planes are two equations in three unknowns with no solution at all. More unknowns than equations allows a line of solutions; it does not promise one.',
  goal: 'Edit the two planes. **Challenge it** or **Back it**.',
  view: '3d',
  setup(p) {
    const ed = systemEditor(p, R1_START);
    return {
      holds: () => r1Holds(ed.rows),
      describe: () => `${eqs(ed.rows)}: ${meetWords(ed.rows)}`,
      randomize: (r, edge) => ed.set(r1Random(r, edge ?? -1), 200),
      edgeCases: 1,
      async showMe() { await ed.set(R1_COUNTER, 600); },
    };
  },
};

const review2: DoubtDef = {
  id: 'c10-r2', who: 'bram', isTrue: false,
  claim: 'A system can have exactly two solutions.',
  reason: 'If A and B both solve it, every point A + t(B − A) does too: each equation reads its right side at both, so it reads that all along the line. Two solutions always bring infinitely many.',
  goal: 'A and B both solve this system. Slide **C** along the line through them. **Challenge it** once C shows a third solution, or **Back it**.',
  view: '3d',
  setup(p) {
    let c: TwoCase = { ...R2_START };
    const planes = new PlaneSet(p, { n: 3, rows: c.rows, showSolution: false, size: 8, focus: c.A });
    void planes.frame({ distance: 22 });
    const dA = new Dot(c.A as V3, { color: '#e8f1ff', size: 0.14, label: 'A' });
    const dB = new Dot(c.B as V3, { color: '#e8f1ff', size: 0.14, label: 'B' });
    const dC = new Dot(c.A as V3, { color: C.result, size: 0.17, glow: 2.6, label: 'C' });
    p.add(dA, dB, dC);
    const Cpt = () => c.A.map((x, i) => x + (c.B[i] - x) * c.t);
    const paint = () => { dA.at(c.A as V3); dB.at(c.B as V3); dC.at(Cpt() as V3); };
    const sl = new Slider({ label: 'C = A + $t$(B − A)', min: -1, max: 2, step: 0.25, value: 0, onInput: (v) => { c.t = v; p.move(); paint(); } });
    p.dock().append(sl.el);
    return {
      holds: () => r2Holds(c),
      describe: () => `C = ${pt(Cpt())}, with t = ${c.t}: ${r2Holds(c) ? 'C is A or B, so no third solution yet' : 'C solves every equation too: a third solution'}`,
      async randomize(r) { c = r2Random(r); await planes.setRows(c.rows, 0); sl.set(c.t, false); paint(); },
      edgeCases: 0,
      async showMe() { const t0 = c.t; await animate(700, (k) => { c.t = t0 + (0.5 - t0) * k; sl.set(c.t, false); paint(); }, ease.inOut); c.t = 0.5; paint(); },
    };
  },
};

const review3: DoubtDef = {
  id: 'c10-r3', who: 'bram', isTrue: false,
  claim: 'Multiplying a row by a negative number changes the answer.',
  reason: 'A negative number flips which side of the line is which, but the line itself stays put: $-x - y = -3$ is the same line as $x + y = 3$. Any non-zero multiple keeps the solutions.',
  goal: 'Multiply row 2 by a negative $k$ and watch its line. **Challenge it** or **Back it**.',
  view: '2d',
  setup(p) {
    let m = R3_START.map((r) => r.slice()), i = 1, k = -2;
    const scaled = () => m.map((row, q) => (q === i ? row.map((x) => x * k) : row.slice()));
    const planes = new PlaneSet(p, { n: 2, rows: scaled(), names: ['x', 'y'] });
    void planes.frame({ height: 9, target: [1, 1.5] });
    const r = p.readout(`Row ${i + 1} times k`);
    const paint = () => { r.row('row', `row ${i + 1} becomes`, `$${rowTex(scaled()[i], ['x', 'y'])}$`); r.row('m', 'The lines meet at', meetWords(scaled()), C.result); };
    const sk = new Slider({ label: 'multiply row 2 by $k$', min: -3, max: -0.5, step: 0.5, value: k, onInput: (v) => { k = v; p.move(); void planes.setRows(scaled(), 350); paint(); } });
    p.dock().append(sk.el);
    paint();
    return {
      holds: () => r3Holds(m, i, k),
      describe: () => `k = ${k}: the lines meet at ${meetWords(scaled())}, as before`,
      async randomize(rr) { const c = r3Random(rr); m = c.m; i = c.i; k = c.k; sk.set(k, false); await planes.setRows(scaled(), 0); paint(); },
      edgeCases: 0,
      async showMe() { k = -1; sk.set(k, false); await planes.setRows(scaled(), 600); paint(); },
    };
  },
};

const review4: DoubtDef = {
  id: 'c10-r4', who: 'bram', isTrue: true,
  claim: 'Three equations in three unknowns can have no solution.',
  reason: 'Three planes can form a tube: each pair meets in a line, the three lines run side by side, and no point is on all three. Reducing such a system ends in a row that says 0 = 1.',
  goal: 'Edit the three planes. **Back it** with three planes that share no point (Bram shakes the numbers, keeping your shape), or **Challenge it**.',
  view: '3d',
  setup(p) {
    const ed = systemEditor(p, R4_START);
    return {
      holds: () => r4Holds(ed.rows),
      describe: () => `${eqs(ed.rows)}: ${meetWords(ed.rows)}`,
      randomize: (r, edge) => ed.set(r4Random(r, edge ?? -1), 200),
      edgeCases: 1,
      async showMe() { await ed.set(R4_SHOW, 700); },
    };
  },
};

export const review: ReviewDef = { id: 'c10-review', who: 'bram', title: 'Act III Review', claims: [review1, review2, review3, review4] };
