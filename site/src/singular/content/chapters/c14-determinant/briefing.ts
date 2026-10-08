// Chapter 14 Briefing (GDD §6.6 Ch 14): Say it, three Doubts (two false, one true, shown mixed), the
// Law, Ilse's page, and the Act IV Review (Bram's four claims, before the forecast).
import type { CompareDef, DoubtDef, DoubtScene, Game, LawDef, PuzzleCtx, ReviewDef, SayItDef, V3 } from '../../../game/types';
import { Label } from '../../../gfx/label';
import { Arrow } from '../../../gfx/arrow';
import { Grid2D } from '../../../gfx/grid';
import { MatrixInput } from '../../../ui/widgets';
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { wait } from '../../../core/tween';
import { rint } from '../../../game/lawcheck';
import { det, identity, inverse, madd, matMul, mscale, type Mat } from '../../../math/la';
import { VectorHandle } from '../../../kit/handle';
import { FlatGrid, playMove } from '../c13-inverse/play';
import { landingLineColour } from '../c13-inverse/puzzles';
import { UnitTile } from './tile';
import {
  commutes, det2, detAdds, doublingDoubles, flipUndo, fmtN, lawCore, noInverseDetZero, noZeroHasUndo, texM, type DetCase,
} from './logic';

const rows2 = (M: Mat) => `rows ${M.map((r) => `(${r.map(fmtN).join(', ')})`).join(' and ')}`;
const col2 = (M: Mat, j: number): V3 => [M[0][j], M[1][j], 0];
const rnd2 = (r: () => number, lo = -3, hi = 3): Mat => [[rint(r, lo, hi), rint(r, lo, hi)], [rint(r, lo, hi), rint(r, lo, hi)]];

export const sayit: SayItDef = {
  id: 'c14', who: 'bram',
  ask: 'Why does adding a multiple of one column to another not change the determinant?',
  frames: {
    see: 'When I slid the ___ column along the ___ column, the parallelogram leaned but its ___ stayed the same.',
    means: 'Sliding the top edge keeps the base and the ___, so the area does not change. The determinant is ___.',
    called: 'The signed area factor of a matrix is called its ___.',
    cue: 'When you see "area", "volume", "flattened" or "can this be undone", think ___.',
  },
  wordBank: ['tile', 'base', 'height', 'shear', 'area', 'volume', 'flip', 'flattened', 'determinant', 'ad − bc'],
};

// ------------------------------------------------------------------ a shared holotable scene: one 2×2 move and its tile

interface TileScene { M(): Mat; set(M: Mat): void; play(U?: Mat | null): Promise<void>; tile: UnitTile; grid: Grid2D }

function tileScene(p: PuzzleCtx, M0: Mat, label = 'M', readTitle = 'The move'): TileScene {
  p.g.stage.view2D({ center: [0.6, 0.6], height: 9.5, ms: 0 });
  const grid = p.grid({ base: 0.42, main: 0.55, axis: 0.55 });
  landingLineColour(grid);
  const flat = new FlatGrid(p.g.stage);
  const tile = new UnitTile(p.g.stage, { name: 'area' });
  p.add(flat, tile);
  let M = M0.map((r) => r.slice());
  const r = p.readout(readTitle);
  const show = () => { grid.set(M); tile.set(M); r.row('M', `$${label}$`, `$${texM(M)}$`); r.row('d', `$\\det ${label}$`, fmtN(Math.round(det2(M) * 1000) / 1000), det2(M) < -1e-9 ? '#ffb35c' : undefined); };
  const input = new MatrixInput({ rows: 2, cols: 2, values: M, colourCols: true, label: `${label} =`, step: 1, onChange: (m) => { M = m; c1.arrow.setTo(col2(m, 0)); c2.arrow.setTo(col2(m, 1)); show(); } });
  const mk = (j: 0 | 1, color: string) => new VectorHandle(p, {
    to: col2(M, j), color, snap: p.snap() ?? 0.5, planar: true, limit: 4, countMoves: false,
    onChange: (t) => { M[0][j] = t[0]; M[1][j] = t[1]; input.set(M); show(); },
  });
  const c1 = mk(0, C.v), c2 = mk(1, C.w);
  p.dock().append(h('div', { class: 'kicker' }, 'Drag the column tips or type the move'), input.el);
  show();
  return {
    tile, grid,
    M: () => M.map((x) => x.slice()),
    set(X: Mat) { M = X.map((x) => x.slice()); input.set(M); c1.arrow.setTo(col2(M, 0)); c2.arrow.setTo(col2(M, 1)); show(); },
    async play(U?: Mat | null) {
      const view = { g: p.g, grid, flat };
      grid.set(identity(2)); tile.set(identity(2));
      let W = await playMove(view, M, identity(2), 650, [(X) => tile.set(X)], false);
      if (U) { await wait(100); W = await playMove(view, U, W, 650, [(X) => tile.set(X)], false); }
      tile.set(W);
    },
  };
}

// ------------------------------------------------------------------ (F) Double every number and you double the area

export const doubtDouble: DoubtDef = {
  id: 'c14-d-double', who: 'bram', isTrue: false,
  claim: 'Double every number in a 2 × 2 and you double the area.',
  reason: 'Doubling every number doubles **both** columns. Each column stretches the tile by 2, so the area goes up $2 \\times 2 = 4$ times: $\\det(2M) = 4\\det M$. In 3-D it is $2 \\times 2 \\times 2 = 8$. The claim holds only for a flat move, where 4 × 0 = 2 × 0.',
  goal: 'Set a move $M$. The amber outline is $2M$. **Challenge it** (a move where doubling does not double the area) or **Back it** (Bram will shake it).',
  view: '2d',
  setup(p) {
    const sc = tileScene(p, [[1, 0], [0, 1]]);
    const big = new UnitTile(p.g.stage, { name: '2M: area', color: '#ffd9a8' });
    p.add(big);
    const showBig = () => big.set(mscale(sc.M(), 2));
    p.tick(() => showBig());
    return {
      holds: () => doublingDoubles(sc.M()),
      describe: () => { const M = sc.M(); return `M with ${rows2(M)}: area ${fmtN(det2(M))}, and 2M has area ${fmtN(det2(mscale(M, 2)))}, not ${fmtN(2 * det2(M))}`; },
      randomize(r, edge) {
        const edges: Mat[] = [[[1, 0], [0, 1]], [[2, 1], [1, 1]]];
        if (edge !== undefined) { sc.set(edges[edge]); return; }
        sc.set(rnd2(r, -2, 2));
      },
      edgeCases: 2,
      async showMe() { sc.set([[1, 0], [0, 1]]); await wait(200); },
    };
  },
};

// ------------------------------------------------------------------ (F) det(A + B) = det A + det B

function sumScene(p: PuzzleCtx): DoubtScene {
  p.g.stage.view2D({ center: [0.8, 0.8], height: 9.5, ms: 0 });
  const grid = p.grid({ base: 0.42, main: 0.55, axis: 0.55 });
  landingLineColour(grid);
  const tile = new UnitTile(p.g.stage, { name: 'A + B: area' });
  p.add(tile);
  let A: Mat = [[1, 0], [0, 1]], B: Mat = [[1, 0], [0, 1]];
  const r = p.readout('Two moves and their sum');
  const show = () => {
    const S2 = madd(A, B);
    grid.set(S2); tile.set(S2);
    r.row('a', '$\\det A$', fmtN(det2(A)));
    r.row('b', '$\\det B$', fmtN(det2(B)));
    r.row('s', '$\\det A + \\det B$', fmtN(det2(A) + det2(B)));
    r.row('ab', '$\\det(A + B)$', fmtN(det2(S2)), C.result);
  };
  const ia = new MatrixInput({ rows: 2, cols: 2, values: A, colourCols: true, label: 'A =', step: 1, onChange: (m) => { A = m; show(); } });
  const ib = new MatrixInput({ rows: 2, cols: 2, values: B, colourCols: true, label: 'B =', step: 1, onChange: (m) => { B = m; show(); } });
  p.dock().append(h('div', { class: 'kicker' }, 'Two moves (the grid shows A + B)'), h('div', { style: 'display:flex;gap:14px;flex-wrap:wrap' }, ia.el, ib.el));
  show();
  const set = (a: Mat, b: Mat) => { A = a; B = b; ia.set(a); ib.set(b); show(); };
  return {
    holds: () => detAdds(A, B),
    describe: () => `A with ${rows2(A)}, B with ${rows2(B)}: det(A + B) = ${fmtN(det2(madd(A, B)))}, det A + det B = ${fmtN(det2(A) + det2(B))}`,
    randomize(rr, edge) {
      const edges: [Mat, Mat][] = [[[[1, 0], [0, 1]], [[1, 0], [0, 1]]], [[[2, 0], [0, 1]], [[1, 0], [0, 3]]]];
      if (edge !== undefined) { set(...edges[edge]); return; }
      set(rnd2(rr, -2, 2), rnd2(rr, -2, 2));
    },
    edgeCases: 2,
    async showMe() { set([[1, 0], [0, 1]], [[1, 0], [0, 1]]); await wait(200); },
  };
}

const SUM_REASON = 'Areas do not add like that. With $A = B = I$: $\\det A + \\det B = 1 + 1 = 2$, but $A + B = 2I$ doubles both columns, so $\\det(A + B) = 4$. The determinant multiplies along a chain of moves, $\\det(AB) = \\det A \\det B$; it does not add over sums.';

export const doubtSum: DoubtDef = {
  id: 'c14-d-sum', who: 'bram', isTrue: false,
  claim: 'det(A + B) = det A + det B.',
  reason: SUM_REASON,
  goal: 'Type two moves. **Challenge it** (a pair where the sum\'s area factor is not the sum of theirs) or **Back it** (Bram will shake it).',
  view: '2d',
  setup: (p) => sumScene(p),
};

// ------------------------------------------------------------------ (T) A matrix with no inverse has determinant zero

export const doubtNoInverse: DoubtDef = {
  id: 'c14-d-noinverse', who: 'bram', isTrue: true,
  claim: 'A matrix with no inverse has determinant zero.',
  reason: 'No inverse means two different points land on one spot, so a whole line of arrows is crushed to the origin and the plane is flattened. A flattened tile has no area, so the area factor is 0.',
  goal: 'Build a move with **no inverse** (flatten the grid). **Back it** (Bram shakes it with other flat moves) or **Challenge it** (a move with no inverse and a determinant that is not 0).',
  view: '2d',
  setup(p) {
    const sc = tileScene(p, [[1, 2], [2, 4]]);
    return {
      holds: () => noInverseDetZero(sc.M()),
      describe: () => { const M = sc.M(); return `M with ${rows2(M)}: ${Math.abs(det(M)) < 1e-9 ? 'no inverse, and det M = 0' : `it has an inverse (det M = ${fmtN(det2(M))})`}`; },
      async play() { await sc.play(); },
      randomize(r, edge) {
        const edges: Mat[] = [[[0, 0], [0, 0]], [[1, 2], [2, 4]], [[0, 0], [3, 1]]];
        if (edge !== undefined) { sc.set(edges[edge]); return; }
        // a flat move: the second column a multiple of the first
        const a = [rint(r, -3, 3), rint(r, -3, 3)];
        const k = rint(r, -2, 2);
        sc.set([[a[0], k * a[0]], [a[1], k * a[1]]]);
      },
      edgeCases: 3,
      async showMe() { sc.set([[1, 2], [2, 4]]); await wait(200); },
    };
  },
};

// ------------------------------------------------------------------ the Law

export const law: LawDef<DetCase> = {
  ...lawCore,
  frame: ['$\\det A$ is ', { slot: 'value' }, ' exactly when ', { slot: 'cond' }, '.'],
  slots: {
    value: { options: [{ id: 'zero', text: 'zero' }, { id: 'one', text: 'one' }] },
    cond: { options: [
      { id: 'flat', text: 'A flattens space: two different points land on one spot' },
      { id: 'zero-entry', text: 'A has a zero entry' },
      { id: 'flip', text: 'A turns the grid over' },
      { id: 'same-area', text: 'A keeps every area the same size' },
    ] },
  },
  draw(g: Game, c: DetCase) {
    const M = c.M;
    let hgt = 9;
    if (M.length === 2) {
      // the Law panel sits in the middle of the screen: draw the case to its right, zoomed to fit it
      const ext = Math.max(Math.hypot(M[0][0], M[1][0]), Math.hypot(M[0][1], M[1][1]), Math.hypot(M[0][0] + M[0][1], M[1][0] + M[1][1]));
      hgt = Math.max(9, 2.6 * ext);
      void g.stage.view2D({ center: [-0.46 * hgt, 0.04 * hgt], height: hgt, ms: 0 });
      const grid = new FlatGrid(g.stage, { extent: 6 });
      grid.set(M);
      grid.show(true);
      const tile = new UnitTile(g.stage, { name: 'det' });
      tile.set(M);
      g.stage.world.add(grid.object, tile.object);
    } else {
      void g.stage.view3D({ target: [-4.1, -2.9, 0.5], distance: 14, azimuth: -55, elevation: 24, ms: 0, orbit: false }); // origin right of the panel
      g.stage.world.add(...[C.v, C.w, C.u].map((cl, j) => new Arrow([0, 0, 0], [M[0][j], M[1][j], M[2][j]], { color: cl, width: 0.05 }).object));
    }
    g.stage.world.add(new Label(`det A = ${fmtN(det(M))}`, M.length === 2 ? [0, -0.31 * hgt, 0] : [0, 0, -2.5], { color: C.white, size: 17 }).object);
  },
  reason: {
    ask: 'Your Law survived. **Why** is the determinant zero exactly when space is flattened?',
    options: [
      { id: 'a', text: '$\\det A$ is the factor by which $A$ scales area (or volume). A flattened tile has no area, so the factor is 0. If nothing is flattened, the unit square goes to a parallelogram with some area, so the factor is not 0.', right: true, why: 'Yes. The determinant is the area of the image of the unit square, signed. Zero area is exactly a flattened image.' },
      { id: 'b', text: 'A zero entry makes one of the products in $ad - bc$ vanish.', right: false, why: 'One product vanishing is not both cancelling. $\\begin{bmatrix}1 & 0\\\\ 0 & 1\\end{bmatrix}$ has two zeros and determinant 1.' },
      { id: 'c', text: 'The determinant is zero when the columns are short.', right: false, why: 'Short columns give a small area, not zero: $(0.1, 0)$ and $(0, 0.1)$ give $0.01$. Zero needs the columns on one line.' },
    ],
  },
};

// ------------------------------------------------------------------ Ilse's page

export const compare: CompareDef = {
  id: 'c14',
  page: 'The **determinant** $\\det A$ is the factor by which $A$ scales every area (in 3-D, every volume), with a minus sign if it turns the grid over. Every square of the grid becomes a copy of one parallelogram, so they all scale by the same factor: the area of the image of the unit square.\n\nFor $2 \\times 2$, the parallelogram on $(a, c)$ and $(b, d)$ fills its $(a + b) \\times (c + d)$ box except for six corner pieces: $\\det = ad - bc$. For $3 \\times 3$ it is the scalar triple product of the columns, worked out by **cofactor expansion** along any row or column.\n\nAdding a multiple of one column to another slides the parallelogram along a side: base and height stay, so the area stays. Swapping two columns turns the grid over: the sign flips. Scale factors of two moves in a row multiply: $\\det(AB) = \\det A \\det B$.\n\n**Zero means space is flattened**, and then there is no inverse.',
  formula: '\\det\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} = ad - bc \\qquad \\det(AB) = \\det A\\,\\det B \\qquad \\det(kA) = k^n \\det A',
  keyIdeas: [
    'Did you say what happens to area: every area scales by the same factor?',
    'Did you say what zero means: space is flattened and there is no inverse?',
    'Did you say what a negative sign means: the grid is turned over?',
  ],
};

// ------------------------------------------------------------------ the Act IV Review (Bram, before the forecast)

const reviewCommute: DoubtDef = {
  id: 'c14-r-commute', who: 'bram', isTrue: false,
  claim: 'A B is the same move as B A.',
  reason: 'Order matters. A shear then a quarter turn sends the tile somewhere else from a quarter turn then a shear: $AB \\ne BA$ in general.',
  goal: 'Type two moves. The solid tile is $AB$ ($B$ first), the amber outline $BA$. **Challenge it** (a pair where they differ) or **Back it** (Bram will shake it).',
  view: '2d',
  setup(p) {
    p.g.stage.view2D({ center: [0.6, 0.6], height: 9.5, ms: 0 });
    const grid = p.grid({ base: 0.42, main: 0.55, axis: 0.55 });
    landingLineColour(grid);
    const ab = new UnitTile(p.g.stage, { name: 'AB' });
    const ba = new UnitTile(p.g.stage, { name: 'BA', color: '#ffd9a8', opacity: 0.18 });
    p.add(ab, ba);
    let A: Mat = [[1, 1], [0, 1]], B: Mat = [[1, 0], [0, 1]];
    const r = p.readout('Both orders');
    const show = () => { const X = matMul(A, B), Y = matMul(B, A); grid.set(X); ab.set(X); ba.set(Y); r.row('ab', '$AB$', `$${texM(X)}$`); r.row('ba', '$BA$', `$${texM(Y)}$`); };
    const ia = new MatrixInput({ rows: 2, cols: 2, values: A, colourCols: true, label: 'A =', step: 1, onChange: (m) => { A = m; show(); } });
    const ib = new MatrixInput({ rows: 2, cols: 2, values: B, colourCols: true, label: 'B =', step: 1, onChange: (m) => { B = m; show(); } });
    p.dock().append(h('div', { class: 'kicker' }, 'Two moves'), h('div', { style: 'display:flex;gap:14px;flex-wrap:wrap' }, ia.el, ib.el));
    show();
    const set = (a: Mat, b: Mat) => { A = a; B = b; ia.set(a); ib.set(b); show(); };
    return {
      holds: () => commutes(A, B),
      describe: () => `A with ${rows2(A)}, B with ${rows2(B)}: AB = ${rows2(matMul(A, B))}, BA = ${rows2(matMul(B, A))}`,
      randomize(rr, edge) {
        const edges: [Mat, Mat][] = [[[[1, 1], [0, 1]], [[0, -1], [1, 0]]], [[[1, 0], [1, 1]], [[2, 0], [0, 1]]]];
        if (edge !== undefined) { set(...edges[edge]); return; }
        set(rnd2(rr, -2, 2), rnd2(rr, -2, 2));
      },
      edgeCases: 2,
      async showMe() { set([[1, 1], [0, 1]], [[0, -1], [1, 0]]); await wait(200); },
    };
  },
};

const reviewSum: DoubtDef = { ...doubtSum, id: 'c14-r-sum', reason: SUM_REASON };

const reviewNoZero: DoubtDef = {
  id: 'c14-r-nozero', who: 'bram', isTrue: false,
  claim: 'A matrix with no zero entries always has an undo.',
  reason: 'Zero entries have nothing to do with it. $\\begin{bmatrix}1 & 1\\\\ 1 & 1\\end{bmatrix}$ has none, and it sends both grid arrows to $(1, 1)$: the plane is flattened, the determinant is 0, and there is no undo.',
  goal: 'Set a move with no zero entries. **Challenge it** (one with no undo) or **Back it** (Bram will shake it).',
  view: '2d',
  setup(p) {
    const sc = tileScene(p, [[2, 1], [1, 1]]);
    return {
      holds: () => noZeroHasUndo(sc.M()),
      describe: () => { const M = sc.M(); return `M with ${rows2(M)}: det M = ${fmtN(det2(M))}${Math.abs(det2(M)) < 1e-9 ? ', so there is no undo' : ''}`; },
      async play() { const M = sc.M(); await sc.play(Math.abs(det(M)) > 1e-9 ? inverse(M) : null); },
      randomize(r, edge) {
        const edges: Mat[] = [[[1, 1], [1, 1]], [[2, 4], [1, 2]], [[3, -3], [-1, 1]]];
        if (edge !== undefined) { sc.set(edges[edge]); return; }
        const nz = () => rint(r, 1, 3) * (r() < 0.5 ? -1 : 1);
        sc.set([[nz(), nz()], [nz(), nz()]]);
      },
      edgeCases: 3,
      async showMe() { sc.set([[1, 1], [1, 1]]); await wait(200); },
    };
  },
};

const reviewFlip: DoubtDef = {
  id: 'c14-r-flip', who: 'bram', isTrue: true,
  claim: 'A matrix that flips the grid can be undone.',
  reason: 'A flip has a negative determinant, and a negative number is not zero. Nothing is flattened, so every landing spot came from one start, and the inverse sends it back. Its determinant is $1 / \\det A$, negative too.',
  goal: 'Set a move that turns the tile over (its amber back shows). **Back it** (Bram plays its undo and shakes it) or **Challenge it** (a flip with no undo).',
  view: '2d',
  setup(p) {
    const sc = tileScene(p, [[0, 1], [1, 0]]);
    return {
      holds: () => flipUndo(sc.M()),
      describe: () => { const M = sc.M(), d = det2(M); return `M with ${rows2(M)}: det M = ${fmtN(d)}${d < 0 ? ', and its undo brings the tile back' : ', not a flip'}`; },
      async play() { const M = sc.M(); await sc.play(det(M) < 0 ? inverse(M) : null); },
      randomize(r, edge) {
        const edges: Mat[] = [[[0, 1], [1, 0]], [[-1, 0], [0, 1]], [[1, 2], [3, 4]]];
        if (edge !== undefined) { sc.set(edges[edge]); return; }
        let M: Mat;
        do { M = rnd2(r); } while (det(M) >= 0);
        sc.set(M);
      },
      edgeCases: 3,
      async showMe() { sc.set([[0, 1], [1, 0]]); await wait(200); },
    };
  },
};

export const review: ReviewDef = {
  id: 'c14-review', who: 'bram', title: 'Act IV Review',
  claims: [reviewCommute, reviewSum, reviewNoZero, reviewFlip],
};
