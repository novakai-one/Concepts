// Chapter 16 Briefing (GDD §6.7 Ch 16): Say it, three Doubts (two false, one true), the Law, Ilse's page.
import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three';
import type { CompareDef, DoubtDef, Game, LawDef, SayItDef } from '../../../game/types';
import { Label } from '../../../gfx/label';
import { MatrixInput, Slider } from '../../../ui/widgets';
import { C } from '../../../core/theme';
import { wait } from '../../../core/tween';
import { rint } from '../../../game/lawcheck';
import { col, cross, rank, rrefNum, type Mat } from '../../../math/la';
import { Probe, Room, Sheet, VIOLET, inWorld } from '../c15-nullspace/space';
import { COL_COLORS } from './puzzles';
import {
  fmtV, lawCore, len, nullity, oneBasisHolds, planeBasis, randRankMat, reducedColsHold, spanRank, twoArrowsHolds, type P3, type ShapeCase,
} from './logic';

export const sayit: SayItDef = {
  id: 'c16', who: 'bram',
  ask: 'Why can a $3 \\times 5$ matrix never be one-to-one?',
  frames: {
    see: 'Every column was ___ or ___, and the counter always read ___.',
    means: 'Three rows hold at most ___ pivots, so at least ___ of the five columns are free, and the null space holds ___.',
    called: 'Kept directions are counted by the ___; flattened ones by the ___.',
    cue: 'When you see "how many solutions or free choices?", think ___.',
  },
  wordBank: ['kept', 'flattened', 'pivot', 'free column', 'rank', 'nullity', 'rank + nullity = columns', 'at most 3', 'more than the origin'],
};

/** A plane-of-arrows scene: the plane z = x + y and arrows that stay on it. */
function planeScene(p: Parameters<DoubtDef['setup']>[0]) {
  const room = new Room(p, { extent: 3, scale: 0.85 });
  void p.g.stage.view3D({ target: [0.3, 0.3, 0.8], distance: 12, azimuth: -58, elevation: 22, ms: 0 });
  const plane = new Sheet(room, [1, 1, -1], { color: C.result, size: 6.5, opacity: 0.12 });
  plane.setOpacity(0.6);
  const fit = (x: P3): P3 => { const a = Math.max(-2, Math.min(2, Math.round(x[0]))), b = Math.max(-2, Math.min(2, Math.round(x[1]))); return [a, b, a + b]; };
  return { room, fit };
}

// ------------------------------------------------------------------ (F) reduced columns as a basis for Col A

export const doubtReduced: DoubtDef = {
  id: 'c16-d-reduced', who: 'bram', isTrue: false,
  claim: 'Use the columns of the reduced matrix as a basis for the column space. Same matrix, tidier numbers.',
  reason: 'Row operations keep the pivot **positions** but change the columns. For $A$ with columns $(1, 2, 3)$, $(0, 1, 1)$, $(1, 3, 4)$ the reduced pivot columns span the floor $z = 0$, while the columns of $A$ span $z = x + y$. Take the pivot columns of $A$ itself.',
  goal: 'Set a 3 × 3 matrix. Yellow: the plane of its columns. Pale: the plane of the reduced form’s pivot columns. **Challenge it** with a matrix where they differ, or **Back it**.',
  view: '3d',
  setup(p) {
    const room = new Room(p, { extent: 3, scale: 0.7 });
    void p.g.stage.view3D({ target: [0.3, 0.3, 0.8], distance: 12, azimuth: -60, elevation: 20, ms: 0 });
    let A: Mat = [[1, 0, 0], [0, 1, 0], [0, 0, 0]];
    const arrows = [0, 1, 2].map((j) => room.arrow([0, 0, 0], { color: COL_COLORS[j], label: `$\\mathbf a_${j + 1}$` }));
    const colP = new Sheet(room, [0, 0, 1], { color: C.result, size: 6, opacity: 0.12 });
    const redP = new Sheet(room, [0, 0, 1], { color: '#9fd8ff', size: 6, opacity: 0.12 });
    const r = p.readout('Two planes');
    const planeOf = (vs: number[][], s: Sheet) => {
      let best: number[] | null = null;
      for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) { const n = cross(vs[i], vs[j]); if (len(n) > 1e-9 && (!best || len(n) > len(best))) best = n; }
      s.patch.object.visible = !!best && spanRank(vs) === 2;
      if (best) { s.set(best); s.setOpacity(0.85); }
    };
    const draw = () => {
      arrows.forEach((a, j) => { room.setArrow(a, col(A, j)); a.setOpacity(len(col(A, j)) > 1e-9 ? 1 : 0); });
      const { R, pivots } = rrefNum(A);
      planeOf([0, 1, 2].map((j) => col(A, j)), colP);
      planeOf(pivots.map((j) => col(R, j)), redP);
      r.row('rk', 'rank', String(rank(A)));
      r.row('same', 'the same plane', reducedColsHold(A) ? 'yes' : 'no', reducedColsHold(A) ? C.good : '#ffb347');
    };
    const mi = new MatrixInput({ rows: 3, cols: 3, values: A, label: 'A =', step: 1, colourCols: true, onChange: (m) => { A = m; draw(); } });
    p.dock().append(mi.el);
    draw();
    const set = (M: Mat) => { A = M.map((x) => x.slice()); mi.set(A); draw(); };
    return {
      holds: () => reducedColsHold(A),
      describe: () => `${reducedColsHold(A) ? 'the reduced pivot columns span the same plane as the columns' : 'the reduced pivot columns span a different plane from the columns of A'}: columns ${[0, 1, 2].map((j) => fmtV(col(A, j))).join(', ')}`,
      randomize(rr, edge) { set(edge === 0 ? [[1, 0, 1], [2, 1, 3], [3, 1, 4]] : randRankMat(rr, 3, 3, 2)); },
      edgeCases: 1,
      async showMe() { set([[1, 0, 1], [2, 1, 3], [3, 1, 4]]); await wait(200); },
    };
  },
};

// ------------------------------------------------------------------ (F) a subspace has only one basis

export const doubtOneBasis: DoubtDef = {
  id: 'c16-d-onebasis', who: 'bram', isTrue: false,
  claim: 'A subspace has only one basis.',
  reason: 'The plane $z = x + y$ has $(1, 0, 1), (0, 1, 1)$ as a basis, and also $(1, 1, 2), (2, 1, 3)$, and infinitely many more. Every one of them has two arrows.',
  goal: 'The green and red arrows are a basis of the plane. Drag the **white** pair along the plane. **Challenge it** with a second, different basis, or **Back it**.',
  view: '3d',
  setup(p) {
    const { room, fit } = planeScene(p);
    const P1: P3[] = [[1, 0, 1], [0, 1, 1]];
    P1.forEach((v, i) => room.arrow(v, { color: [C.v, C.w][i], label: `$${fmtV(v).replace(/−/g, '-')}$` }));
    let q: P3[] = [[1, 0, 1], [0, 1, 1]];
    const qa = q.map((v, i) => room.arrow(v, { color: C.white, width: 0.032, label: i ? '$\\mathbf q_2$' : '$\\mathbf q_1$' }));
    const r = p.readout('Two pairs');
    const draw = () => {
      q.forEach((v, i) => { room.setArrow(qa[i], v); qa[i].setOpacity(len(v) > 1e-9 ? 1 : 0); });
      r.row('q', 'white pair', `${fmtV(q[0])}, ${fmtV(q[1])}`);
      r.row('b', 'a basis of the plane', planeBasis(q[0], q[1]) ? 'yes' : 'no', planeBasis(q[0], q[1]) ? C.good : '#ffb347');
    };
    const probes = q.map((v, i) => new Probe(p, room, v, { color: C.white, snap: null, fit, countMoves: false, onMove: (x) => { q[i] = x; draw(); } }));
    draw();
    const set = (a: P3, b: P3) => { q = [a, b]; probes[0].set(a); probes[1].set(b); draw(); };
    return {
      holds: () => oneBasisHolds(P1, q),
      describe: () => `the white pair ${fmtV(q[0])}, ${fmtV(q[1])} ${planeBasis(q[0], q[1]) ? (oneBasisHolds(P1, q) ? 'is the same basis' : 'is a second basis of the same plane') : 'is not a basis of the plane'}`,
      randomize(rr) {
        const pick = (): P3 => { const a = rint(rr, -2, 2), b = rint(rr, -2, 2); return [a, b, a + b]; };
        let a = pick(), b = pick();
        for (let k = 0; k < 20 && !planeBasis(a, b); k++) { a = pick(); b = pick(); }
        set(a, b);
      },
      edgeCases: 0,
      async showMe() { await Promise.all([probes[0].moveTo([1, 1, 2], 600), probes[1].moveTo([2, 1, 3], 600)]); set([1, 1, 2], [2, 1, 3]); },
    };
  },
};

// ------------------------------------------------------------------ (T) every basis of a plane has two arrows

export const doubtTwo: DoubtDef = {
  id: 'c16-d-two', who: 'bram', isTrue: true,
  claim: 'Every basis of a plane has exactly two arrows.',
  reason: 'One arrow reaches only a line. Three arrows on a plane are dependent: one is a mix of the other two. So a set that reaches the plane with none wasted has exactly two: that number is the plane’s dimension.',
  goal: 'Choose how many arrows (1, 2 or 3) and drag them along the plane. **Back it** (Bram will shake it), or **Challenge it** with a basis of another size.',
  view: '3d',
  setup(p) {
    const { room, fit } = planeScene(p);
    let k = 2;
    let vs: P3[] = [[1, 0, 1], [0, 1, 1], [1, 1, 2]];
    const arrows = vs.map((v, i) => room.arrow(v, { color: COL_COLORS[i], label: `$\\mathbf v_${i + 1}$` }));
    const r = p.readout('Your set');
    const draw = () => {
      arrows.forEach((a, i) => { room.setArrow(a, vs[i]); a.setOpacity(i < k && len(vs[i]) > 1e-9 ? 1 : 0); });
      probes.forEach((q, i) => { q.knob.object.visible = i < k; q.knob.setEnabled(i < k); });
      const set = vs.slice(0, k);
      const reach = spanRank(set);
      r.row('n', 'arrows', String(k));
      r.row('r', 'reach', reach === 2 ? 'the whole plane' : reach === 1 ? 'one line' : 'the origin');
      r.row('w', 'none wasted', spanRank(set) === k ? 'yes' : 'no');
      r.row('b', 'a basis of the plane', reach === 2 && spanRank(set) === k ? 'yes' : 'no', reach === 2 && spanRank(set) === k ? C.good : undefined);
    };
    const probes = vs.map((v, i) => new Probe(p, room, v, { color: COL_COLORS[i], snap: null, fit, countMoves: false, onMove: (x) => { vs[i] = x; draw(); } }));
    const slider = new Slider({ label: 'arrows', min: 1, max: 3, step: 1, value: k, onInput: (x) => { k = x; draw(); } });
    p.dock().append(slider.el);
    draw();
    const set = (n: number, list: P3[]) => { k = n; slider.set(n, false); list.forEach((v, i) => { vs[i] = v; probes[i].set(v); }); draw(); };
    return {
      holds: () => twoArrowsHolds(vs.slice(0, k)),
      describe: () => `${k} arrow${k > 1 ? 's' : ''} ${vs.slice(0, k).map((v) => fmtV(v)).join(', ')}: ${spanRank(vs.slice(0, k)) === 2 && spanRank(vs.slice(0, k)) === k ? 'a basis, with two arrows' : 'not a basis of the plane'}`,
      randomize(rr, edge) {
        const pick = (): P3 => { const a = rint(rr, -2, 2), b = rint(rr, -2, 2); return [a, b, a + b]; };
        if (edge === 0) { set(3, [[1, 0, 1], [0, 1, 1], [1, 1, 2]]); return; }
        if (edge === 1) { set(1, [[1, 1, 2], [0, 1, 1], [1, 0, 1]]); return; }
        set(rint(rr, 1, 3), [pick(), pick(), pick()]);
      },
      edgeCases: 2,
      async showMe() { set(2, [[1, 0, 1], [0, 1, 1], [1, 1, 2]]); await wait(200); },
    };
  },
};

// ------------------------------------------------------------------ the Law: rank + nullity = the number of columns

const drawCase = (g: Game, c: ShapeCase) => {
  const n = c.A[0].length, r = rank(c.A), f = nullity(c.A);
  void g.stage.view3D({ target: [n / 2, 0, 0.3], distance: 3 + n * 1.6, azimuth: -90, elevation: 24, ms: 0, orbit: false });
  const W = g.stage.world;
  for (let j = 0; j < n; j++) {
    const kept = j < r;
    const m = new Mesh(new BoxGeometry(0.8, 0.8, kept ? 0.8 : 0.08), new MeshStandardMaterial({ color: kept ? C.result : VIOLET, emissive: kept ? C.result : VIOLET, emissiveIntensity: 0.5, transparent: true, opacity: 0.85 }));
    m.position.set(j + 0.5, 0, kept ? 0.4 : 0.04);
    W.add(m);
  }
  inWorld(g, new Label(`${c.A.length} × ${n}: rank ${r} + nullity ${f} = ${n}`, [n / 2, 0, 1.5], { className: 'act5-pt' }));
};

export const law: LawDef<ShapeCase> = {
  ...lawCore,
  frame: ['For every matrix $A$: rank $A$ ', { slot: 'op' }, ' nullity $A$ = the number of ', { slot: 'count' }, ' of $A$.'],
  slots: {
    op: { options: [{ id: 'plus', text: '+' }, { id: 'times', text: '×' }, { id: 'minus', text: '−' }] },
    count: { options: [{ id: 'cols', text: 'columns' }, { id: 'rows', text: 'rows' }, { id: 'entries', text: 'non-zero entries' }] },
  },
  cadetSlots: ['count'],
  draw: drawCase,
  reason: {
    ask: 'Your Law survived. **Why** do rank and nullity always add up to the number of columns?',
    options: [
      { id: 'a', text: 'Reduce $A$. Each column is a pivot column (one kept direction) or a free column (one null space arrow), never both. So pivots + free columns = columns.', right: true, why: 'Yes. Rank counts the pivot columns, nullity counts the free ones, and every column is exactly one of the two.' },
      { id: 'b', text: 'Each zero row of the reduced form is one free variable.', right: false, why: 'Free variables come from columns without pivots, not from zero rows. A 2 × 4 matrix of rank 2 has no zero rows and two free columns.' },
      { id: 'c', text: 'Rank counts independent rows, so rank + nullity = rows.', right: false, why: 'The null space lives among the inputs: one coordinate per **column**. For a 2 × 3 of rank 2, rank + nullity = 3, not 2.' },
    ],
  },
};

export const compare: CompareDef = {
  id: 'c16',
  page: 'A **basis** of a subspace is a set of arrows that reaches all of it with none wasted. Every basis of the same subspace has the same number of arrows: its **dimension**.\n\nReduce $A$. The **rank** is the number of pivot columns: the directions the matrix keeps, $\\dim \\operatorname{Col} A$. The **nullity** is the number of free columns: the directions it flattens, $\\dim \\operatorname{Nul} A$. Every column is one or the other, so **rank + nullity = number of columns**.\n\nA $3 \\times 5$ matrix has at most 3 pivots (one per row), so at least 2 columns are free. Its null space holds more than $\\mathbf 0$: two different inputs land together, so it is never one-to-one.\n\nFor a basis of $\\operatorname{Col} A$ take the pivot columns of $A$ itself, not of its reduced form.',
  formula: '\\operatorname{rank} A + \\dim \\operatorname{Nul} A = n',
  keyIdeas: [
    'Did you say each column is kept or flattened, never both?',
    'Did you say three rows allow at most three pivots?',
    'Did you say a free column means more than $\\mathbf 0$ in the null space?',
  ],
};
