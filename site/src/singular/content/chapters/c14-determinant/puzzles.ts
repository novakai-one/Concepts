// Chapter 14 puzzles (GDD §6.6 Ch 14): the unit tile. p1 shape a hold, p2 [D] where ad − bc comes
// from, p3 products and scalings, p4 [D][H] cofactor expansion, p5 [H] row reduction and the k that
// flattens, p7 [S] Cramer's rule. (The Collapse, p6, is in collapse.ts.)
import { DoubleSide, Group, Mesh, MeshBasicMaterial, Shape, ShapeGeometry, Vector2, Vector3, Color } from 'three';
import type { PuzzleDef, V3 } from '../../../game/types';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { Arrow } from '../../../gfx/arrow';
import { Parallelogram, Parallelepiped } from '../../../gfx/shapes';
import { Slider } from '../../../ui/widgets';
import { h, button } from '../../../ui/ui';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { VectorHandle } from '../../../kit/handle';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { burst } from '../../../gfx/fx';
import { det, identity, matMul, mscale, type Mat } from '../../../math/la';
import { FlatGrid, playMove } from '../c13-inverse/play';
import { embed } from '../c13-inverse/honest';
import { landingLineColour } from '../c13-inverse/puzzles';
import { UnitTile } from './tile';
import {
  det2, fmtN, P1_AREA, P1_EXAMPLE, P1_STAB, p1HoldOk, stabPath, P2_BOX, P2_M, P2_PIECES, P2_STEPS, p2OrderOk, pieceOut, P3_A, P3_B,
  P3_SWAP, P3_UNIT, p3FlipOk, p3ProductOk, p3ScaleOk, scaledArea, P4_M3, P4_M4, P4_MINOR2, P4_MINOR3, cofactor,
  minorOf, P5_M, P5_DIAG, P5_DET, P5_K, p5ShieldOk, shield, P7_A, P7_B, P7_X, replaceCol, texM, tolFor,
} from './logic';
import { S } from './script';

const col2 = (M: Mat, j: number): V3 => [M[0][j], M[1][j], 0];
const col3 = (M: Mat, j: number): V3 => [M[0][j], M[1][j], M[2][j]];
const r2 = (M: Mat) => M.map((r) => r.map((x) => Math.round(x * 100) / 100));

// ------------------------------------------------------------------ p1 · shape a hold

export const p1: PuzzleDef = {
  id: 'c14-p1',
  title: 'Can you shape a hold of area exactly 6?',
  goal: 'The white tile is one grid square, moved by your two columns. Drag the **green** and **red** tips until the tile reads **area 6**. Then apply the stabiliser and watch the areas.',
  subgoals: ['The tile reads area 6', 'Apply the stabiliser: shapes change, areas do not'],
  hints: [
    'A parallelogram\'s area is its base times its height. Lay the green column flat along the x-axis.',
    'Green at $(3, 0)$ gives a base of 3. The red column then needs a height of 2.',
    'Green $(3, 0)$, red $(1, 2)$: area $3 \\times 2 = 6$.',
  ],
  par: 3,
  onWin: S.p1Win,
  setup(p) {
    p.g.stage.view2D({ center: [1.2, 1.3], height: 9.5, ms: 0 });
    const grid = p.grid({ base: 0.42, main: 0.55, axis: 0.55 });
    landingLineColour(grid);
    const flat = new FlatGrid(p.g.stage);
    const hold = new UnitTile(p.g.stage, { name: 'area' });
    const square = new UnitTile(p.g.stage, { at: [-3, 1], name: 'area', color: '#cfe0ff' });
    square.setOpacity(0);
    p.add(flat, hold, square);
    const tol = tolFor(p.difficulty);
    let M: Mat = identity(2);
    let phase: 'shape' | 'stab' = 'shape';
    const r = p.readout('The hold');
    const show = () => {
      grid.set(M); hold.set(M);
      r.row('c', 'columns', `(${fmtN(M[0][0])}, ${fmtN(M[1][0])}) and (${fmtN(M[0][1])}, ${fmtN(M[1][1])})`);
      r.row('a', 'hold area', fmtN(Math.round(det2(M) * 100) / 100), Math.abs(det2(M) - P1_AREA) <= tol ? C.good : undefined);
    };
    const stabBtn = button('Apply the stabiliser', () => void stabilise(), { cls: 'primary' });
    stabBtn.hidden = true;
    const commit = () => {
      if (phase !== 'shape') return;
      if (p1HoldOk(M, tol)) {
        phase = 'stab';
        p.subgoal(0);
        sfx.success();
        handles.forEach((x) => x.setEnabled(false));
        stabBtn.hidden = false;
        p.dock().append(stabBtn);
        p.setGoal('The hold reads 6. Apply the stabiliser $\\begin{bmatrix} 2 & 1 \\\\ 1 & 1 \\end{bmatrix}$ to everything, the hold and one plain grid square, and watch their areas.');
        void animate(400, (k) => square.setOpacity(k));
        grid.set(identity(2));
        hold.set(M);
      } else if (Math.abs(det2(M)) > 0.1) p.bark('lantern', `Area ${fmtN(Math.round(det2(M) * 100) / 100)}. The hold needs 6.`);
    };
    const handles = ([0, 1] as const).map((j) => new VectorHandle(p, {
      to: col2(M, j), color: j === 0 ? C.v : C.w, label: j === 0 ? '$\\mathbf a_1$' : '$\\mathbf a_2$', snap: p.snap(), planar: true, limit: 5,
      onChange: (t) => { M[0][j] = t[0]; M[1][j] = t[1]; show(); },
      onCommit: () => commit(),
    }));
    let stabbing = false;
    const stabilise = async () => {
      if (phase !== 'stab' || stabbing) return;
      stabbing = true;
      stabBtn.disabled = true;
      p.move();
      const M0 = M.map((x) => x.slice());
      handles.forEach((x) => { x.arrow.object.visible = false; });
      r.row('c', 'hold columns', 'moving with the grid');
      r.row('s', 'grid square area', '1');
      void p.g.stage.view2D({ center: [2.4, 1.8], height: 14, ms: 1200 });
      // played as P1_STAB^k (det 1 on every frame), not through playMove's (1 − k)I + kY, whose area swells to 1.25 mid-move
      const frame = (k: number) => {
        const W = stabPath(k);
        grid.set(W); flat.set(W);
        const H = matMul(embed(W), embed(M0));
        hold.set(H); square.set(embed(W));
        r.row('a', 'hold area', fmtN(Math.round(det(H) * 100) / 100));
      };
      sfx.whoosh(1.8);
      await animate(1800, frame, ease.inOut);
      frame(1);
      r.row('s', 'grid square area', fmtN(det2(P1_STAB)), C.good);
      const BM = matMul(P1_STAB, M0);
      r.row('c', 'hold columns', `(${fmtN(BM[0][0])}, ${fmtN(BM[1][0])}) and (${fmtN(BM[0][1])}, ${fmtN(BM[1][1])})`);
      p.subgoal(1);
      void burst(p.g.stage, [1, 1, 0.05], C.good, 50, 3);
      p.win();
    };
    show();
    return {
      async showMe() {
        await Promise.all([handles[0].moveTo(col2(P1_EXAMPLE, 0), 700), handles[1].moveTo(col2(P1_EXAMPLE, 1), 700)]);
        await wait(300);
        await stabilise();
      },
      async solve() { handles[0].set(col2(P1_EXAMPLE, 0)); handles[1].set(col2(P1_EXAMPLE, 1)); commit(); await stabilise(); },
      wrong() { handles[0].set([2, 0, 0]); handles[1].set([0, 2, 0]); commit(); },
    };
  },
};

// ------------------------------------------------------------------ p2 [D] · where ad − bc comes from

const PIECE_COLOURS: Record<string, string> = { 'tri-a': '#6fc7d9', 'tri-b': '#8f9ff0', rect: '#b7a6d6' };

export const p2: PuzzleDef = {
  id: 'c14-p2',
  title: 'Where does ad − bc come from?',
  goal: 'The columns $(3, 1)$ and $(1, 2)$ make a parallelogram inside a $4 \\times 3$ box. Drag the six corner pieces out of the box until only the parallelogram is left.',
  subgoals: ['Take every corner piece out of the box', 'Read what is left'],
  hints: [
    'Each piece outside the box is gone from the count. Drag them anywhere outside the dashed box.',
    'The box is $(a + b)(c + d) = 4 \\times 3 = 12$. Two triangles of $1.5$, two of $1$, two rectangles of $1$.',
    '$12 - 3 - 2 - 2 = 5 = 3 \\cdot 2 - 1 \\cdot 1$.',
  ],
  par: 6,
  onWin: S.p2Win,
  setup(p) {
    p.g.stage.view2D({ center: [1.6, 0.6], height: 7.6, ms: 0 });
    p.grid({ base: 0.42, main: 0.5, axis: 0.8 });
    const [W, H] = P2_BOX;
    const box = new FatLine(p.g.stage, [[0, 0, 0.01], [W, 0, 0.01], [W, H, 0.01], [0, H, 0.01], [0, 0, 0.01]], { color: C.white, width: 2, opacity: 0.8, dashed: true, dashSize: 0.14, gapSize: 0.1 });
    const par = new Parallelogram(p.g.stage, col2(P2_M, 0), col2(P2_M, 1), { color: C.result, opacity: 0.22 });
    const a1 = new Arrow([0, 0, 0], col2(P2_M, 0), { color: C.v, width: 0.04, label: '$(a, c)$' });
    const a2 = new Arrow([0, 0, 0], col2(P2_M, 1), { color: C.w, width: 0.04, label: '$(b, d)$' });
    p.add(box.object, par, a1, a2);
    p.onDispose(() => box.dispose());
    const tray: V3[] = [[5.3, 2.6, 0], [6.7, 2.6, 0], [5.3, 1.3, 0], [6.7, 1.3, 0], [5.3, 0, 0], [6.7, 0, 0]];
    interface P { id: string; kind: string; area: number; pts: [number, number][]; g: Group; off: Vector3; out: boolean; label: Label; mesh: Mesh }
    const pieces: P[] = P2_PIECES.map((pc) => {
      const g = new Group();
      const shape = new Shape(pc.pts.map(([x, y]) => new Vector2(x, y)));
      const color = PIECE_COLOURS[pc.kind];
      const mesh = new Mesh(new ShapeGeometry(shape), new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: 0.42, side: DoubleSide, depthWrite: false }));
      mesh.position.z = 0.02;
      const edge = new FatLine(p.g.stage, [...pc.pts, pc.pts[0]].map(([x, y]) => [x, y, 0.025] as V3), { color, width: 1.6, intensity: 1.2, opacity: 0.9 });
      const cx = pc.pts.reduce((s, q) => s + q[0], 0) / pc.pts.length, cy = pc.pts.reduce((s, q) => s + q[1], 0) / pc.pts.length;
      const label = new Label(fmtN(pc.area), [cx, cy, 0.05], { className: 'small' });
      g.add(mesh, edge.object, label.object);
      p.add(g);
      p.onDispose(() => { edge.dispose(); label.dispose(); });
      return { id: pc.id, kind: pc.kind, area: pc.area, pts: pc.pts, g, off: new Vector3(), out: false, label, mesh };
    });
    const centre = (pc: P): Vector3 => new Vector3(pc.pts.reduce((s, q) => s + q[0], 0) / pc.pts.length, pc.pts.reduce((s, q) => s + q[1], 0) / pc.pts.length, 0);
    const r = p.readout('What is left in the box');
    let typedDone = p.difficulty === 'cadet';
    const paint = () => {
      const removed = pieces.filter((x) => x.out);
      const take = removed.reduce((s, x) => s + x.area, 0);
      r.row('box', 'the box $(a + b)(c + d)$', `${P2_STEPS.box}`);
      r.row('out', 'taken out', removed.length ? removed.map((x) => fmtN(x.area)).join(' + ') : '0');
      r.row('left', 'left in the box', fmtN(P2_STEPS.box - take), removed.length === 6 ? C.result : undefined);
      r.eq(removed.length === 6 ? `${P2_STEPS.box} - 3 - 2 - 2 = 5 = \\cg{3}\\cdot\\cr{2} - \\cr{1}\\cdot\\cg{1} = ad - bc` : null);
    };
    let slot = 0;
    const takeOut = async (pc: P, ms = 450) => {
      if (pc.out) return;
      pc.out = true;
      const target = tray[slot++ % tray.length];
      const c = centre(pc);
      const from = pc.off.clone();
      const to = new Vector3(target[0] - c.x, target[1] - c.y, 0);
      sfx.snap();
      await animate(ms, (k) => { pc.g.position.lerpVectors(from, to, k); }, ease.out);
      pc.off.copy(to);
      paint();
      check();
    };
    const check = () => {
      if (pieces.every((x) => x.out)) { p.subgoal(0); if (typedDone && !p.won) { p.subgoal(1); void animate(700, (k) => par.setOpacity(0.22 + 0.25 * Math.sin(k * Math.PI)), ease.inOut); sfx.success(); p.win(); } }
    };
    let autoFly = false;
    for (const pc of pieces) {
      p.g.drag.add({
        target: pc.mesh, getPos: () => centre(pc).add(pc.off),
        onMove: (q) => { const c = centre(pc); pc.off.set(q.x - c.x, q.y - c.y, 0); pc.g.position.copy(pc.off); },
        onEnd: () => {
          p.move();
          if (!pc.out && pieceOut(pc.pts, [pc.off.x, pc.off.y])) {
            pc.out = true; slot++; sfx.snap(); paint(); check();
            if (p.difficulty === 'cadet' && !autoFly) {
              autoFly = true;
              void (async () => { for (const x of pieces) if (!x.out) { await takeOut(x, 380); await wait(80); } })();
            }
          }
        },
      });
    }
    // navigator: typed steps, each one takes its pieces out; commander: order the steps, then type the last line
    // each step owns its slips: 7 on the box is 4 + 3; 7 on the last line is everything taken out
    const stepsFor: { prompt: string; answer: number; kinds: string[]; mistakes: [number, string][] }[] = [
      { prompt: 'The box: $(a + b)(c + d) = 4 \\times 3$', answer: P2_STEPS.box, kinds: [], mistakes: [[7, 'Multiply the sides: the box is $4 \\times 3$.']] },
      { prompt: 'Two triangles on $(a, c)$: $2 \\times \\tfrac12 \\cdot 3 \\cdot 1$', answer: P2_STEPS.triA, kinds: ['tri-a'], mistakes: [] },
      { prompt: 'Two triangles on $(b, d)$: $2 \\times \\tfrac12 \\cdot 1 \\cdot 2$', answer: P2_STEPS.triB, kinds: ['tri-b'], mistakes: [] },
      { prompt: 'Two rectangles: $2 \\times b \\cdot c$', answer: P2_STEPS.rects, kinds: ['rect'], mistakes: [] },
      { prompt: 'Left: $12 - 3 - 2 - 2$', answer: P2_STEPS.left, kinds: [], mistakes: [[7, 'That is everything taken out. Take it away from the box.']] },
    ];
    let ws: StepWorksheet | null = null;
    const watch = (el: HTMLElement, kindsAt: string[][]) => {
      const obs = new MutationObserver(() => {
        el.querySelectorAll('.ws-row').forEach((row, i) => {
          if (row.classList.contains('ok')) for (const k of kindsAt[i] ?? []) for (const pc of pieces) if (pc.kind === k) void takeOut(pc);
        });
      });
      obs.observe(el, { subtree: true, attributes: true, attributeFilter: ['class'] });
      p.onDispose(() => obs.disconnect());
    };
    if (p.difficulty === 'navigator') {
      ws = new StepWorksheet(p, { steps: stepsFor.map(({ prompt, answer, mistakes }) => ({ prompt, answer, mistakes })), onDone: () => { typedDone = true; pieces.forEach((x) => void takeOut(x)); check(); } });
      watch(ws.el, stepsFor.map((s) => s.kinds));
    } else if (p.difficulty === 'commander') {
      const tiles = new TileOrder(p, {
        title: 'Order the steps',
        tiles: [
          { id: 'box', text: 'Start from the box: $(a + b)(c + d)$' },
          { id: 'tri-a', text: 'Take away two triangles of $\\tfrac12 ac$' },
          { id: 'tri-b', text: 'Take away two triangles of $\\tfrac12 bd$' },
          { id: 'rects', text: 'Take away two rectangles of $bc$' },
        ],
        submitLabel: 'Check order',
        onSubmit: (o) => {
          p.move();
          if (!p2OrderOk(o)) { sfx.miss(); p.bark('lantern', 'Start from the box. Then take the pieces away.'); return; }
          tiles.el.remove();
          ws = new StepWorksheet(p, { title: 'The last line', steps: [{ prompt: 'Area left, $ad - bc$ for $(3, 1)$ and $(1, 2)$:', answer: P2_STEPS.left }], onDone: () => { typedDone = true; pieces.forEach((x) => void takeOut(x)); check(); } });
        },
      });
    }
    paint();
    return {
      async showMe() {
        if (ws) await ws.showMe(300);
        else if (p.difficulty === 'commander') { typedDone = true; }
        for (const pc of pieces) { await takeOut(pc, 380); await wait(60); }
        typedDone = true;
        check();
      },
      async solve() {
        typedDone = true;
        for (const pc of pieces) { pc.out = true; pc.off.set(10, 0, 0); pc.g.position.copy(pc.off); }
        paint();
        check();
      },
      wrong() { for (const pc of pieces.slice(0, 4)) { pc.out = true; } paint(); check(); },
    };
  },
};

// ------------------------------------------------------------------ p3 · products and scalings

export const p3: PuzzleDef = {
  id: 'c14-p3',
  title: 'What happens to area when moves multiply, scale and flip?',
  goal: '$A$ doubles every area and $B$ triples it. Play **both** on the tile, in either order, and read its area.',
  subgoals: ['Both moves: read the area', 'Scale by one number k: area exactly 4', 'Turn the tile over without changing its size'],
  predict: {
    prompt: '$A$ doubles every area and $B$ triples it. What does $AB$ do to area?',
    choices: [{ id: '5', text: 'Adds them: times 5' }, { id: '6', text: 'Multiplies them: times 6' }, { id: '9', text: 'Times 9' }],
    answer: '6',
    reveal: 'Times 6. $B$ makes every square 3, then $A$ doubles each of those: $\\det(AB) = \\det A \\det B = 2 \\times 3$.',
  },
  hints: [
    'Apply $A$ and $B$ once each. The tile reads the area after both.',
    'Scaling every entry by $k$ stretches both columns by $k$, so the area goes up by $k \\times k$. For area 4, $k \\times k = 4$.',
    '$k = 2$. Then drag the columns to $(0, 1)$ and $(1, 0)$: the swap turns the tile over and reads $-1$.',
  ],
  par: 5,
  onWin: S.p3Win,
  setup(p) {
    p.g.stage.view2D({ center: [0.8, 1.2], height: 9.5, ms: 0 });
    const grid = p.grid({ base: 0.42, main: 0.55, axis: 0.55 });
    landingLineColour(grid);
    const flat = new FlatGrid(p.g.stage);
    const tile = new UnitTile(p.g.stage, { name: 'area' });
    p.add(flat, tile);
    const tol = tolFor(p.difficulty);
    let phase = 0;
    let W: Mat = identity(2);
    const applied: string[] = [];
    let busy = false;
    const r = p.readout('The tile');
    r.row('A', '$A$ (area times 2)', `$${texM(P3_A)}$`);
    r.row('B', '$B$ (area times 3)', `$${texM(P3_B)}$`);
    const dock = p.dock();
    const box = h('div', { style: 'display:flex;flex-direction:column;gap:10px' });
    dock.append(box);
    const playOn = async (id: 'A' | 'B') => {
      if (busy || phase !== 0) return;
      busy = true;
      p.move();
      applied.push(id);
      W = await playMove({ g: p.g, grid, flat }, id === 'A' ? P3_A : P3_B, W, 1300, [(X) => tile.set(X)]);
      tile.set(W);
      r.row('seq', 'played (first acts first)', applied.join(', then '));
      busy = false;
      if (p3ProductOk(applied)) { sfx.success(); p.subgoal(0); await wait(500); toScale(); }
      else if (applied.length >= 2) { p.bark('lantern', `Area ${fmtN(det2(W))}. That is not one of each. Reset and play A once and B once.`); }
    };
    const reset0 = () => { if (busy) return; applied.length = 0; W = identity(2); grid.set(W); tile.set(W); r.row('seq', 'played (first acts first)', 'nothing yet'); };
    const phase0 = () => {
      box.replaceChildren(h('div', { class: 'kicker' }, 'Play the moves on the tile'),
        h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, button('Play A', () => void playOn('A'), { cls: 'primary small' }), button('Play B', () => void playOn('B'), { cls: 'primary small' }), button('Reset', () => reset0(), { cls: 'ghost small' })));
      r.row('seq', 'played (first acts first)', 'nothing yet');
    };
    let k = 1;
    let slider: Slider | null = null;
    const toScale = () => {
      phase = 1;
      p.setGoal('Now one move with area 1. Scale **every entry** by one number $k$ so the tile reads **area 4**.');
      W = P3_UNIT;
      grid.set(W); tile.set(W);
      r.row('seq', 'the move', `$k\\,${texM(P3_UNIT)}$`);
      r.note('In 3-D, doubling every entry multiplies volume by 2 × 2 × 2 = 8.');
      const step = p.difficulty === 'commander' ? 0.25 : 0.5;
      slider = new Slider({ label: 'scale $k$', min: 0.5, max: 4, step, value: 1, onInput: (x) => { k = x; W = mscale(P3_UNIT, k); grid.set(W); tile.set(W); } });
      const check = button('Check', () => checkScale(), { cls: 'primary small' });
      box.replaceChildren(h('div', { class: 'kicker' }, 'Scale every entry'), slider.el, check);
    };
    const checkScale = () => {
      if (phase !== 1) return;
      p.move();
      if (p3ScaleOk(k, tol)) { sfx.success(); p.subgoal(1); toFlip(); return; }
      sfx.miss();
      p.bark('lantern', Math.abs(k - 4) < 1e-9 ? 'k = 4 makes the area 16. Both columns stretched by 4: 4 × 4.' : `Area ${fmtN(scaledArea(k))}. Every entry times ${fmtN(k)} stretches both columns: the area goes up ${fmtN(k)} × ${fmtN(k)}.`);
    };
    let handles: VectorHandle[] = [];
    let M: Mat = identity(2);
    const toFlip = () => {
      phase = 2;
      p.setGoal('Last: drag the columns to a move that **turns the tile over** and keeps its size: **area −1**.');
      W = identity(2); M = identity(2);
      grid.set(W); tile.set(W);
      r.note(null);
      r.row('seq', 'the move', `$${texM(M)}$`);
      box.replaceChildren(h('div', { class: 'kicker' }, 'Drag the green and red tips'), h('div', { class: 'c-muted', style: 'font-size:13px' }, 'The tile shows its amber back when it is turned over.'));
      handles = ([0, 1] as const).map((j) => new VectorHandle(p, {
        to: col2(M, j), color: j === 0 ? C.v : C.w, snap: p.snap(), planar: true, limit: 4,
        onChange: (t) => { M[0][j] = t[0]; M[1][j] = t[1]; grid.set(M); tile.set(M); r.row('seq', 'the move', `$${texM(r2(M))}$`); },
        onCommit: () => void commitFlip(),
      }));
    };
    const commitFlip = async () => {
      if (phase !== 2 || busy) return;
      if (!p3FlipOk(M, tol)) { if (det2(M) < -0.1) p.bark('lantern', `Turned over, area ${fmtN(Math.round(det2(M) * 100) / 100)}. Keep the size: −1.`); return; }
      busy = true;
      p.subgoal(2);
      // replay the move from the start, honestly: the tile turns over through 3-D
      handles.forEach((x) => x.arrow.setOpacity(0.3));
      grid.set(identity(2)); tile.set(identity(2));
      const end = await playMove({ g: p.g, grid, flat }, M, identity(2), 1600, [(X) => tile.set(X)]);
      tile.set(end);
      sfx.success();
      p.win();
    };
    phase0();
    /**
     * Show me / solve from whatever the player has done: wait out a running move, then reach the scaling
     * step (a product already played has its toScale pending; anything else is reset and replayed B, A).
     * Returns false when the flip is already playing (the win is on its way).
     */
    const reachScale = async (): Promise<boolean> => {
      for (let i = 0; i < 400 && busy && phase < 2; i++) await wait(25);
      if (phase === 2 && busy) return false;
      if (phase === 0 && p3ProductOk(applied)) { for (let i = 0; i < 400 && phase === 0; i++) await wait(25); }
      else if (phase === 0) { reset0(); await playOn('B'); await playOn('A'); }
      return true;
    };
    return {
      async showMe() {
        if (!(await reachScale())) return;
        await wait(300);
        if (phase === 1) { slider?.set(2, true); await wait(400); k = 2; checkScale(); await wait(300); }
        if (handles.length === 0) toFlip();
        await Promise.all([handles[0].moveTo(col2(P3_SWAP, 0), 600), handles[1].moveTo(col2(P3_SWAP, 1), 600)]);
      },
      async solve() {
        if (!(await reachScale())) return;
        if (phase === 1) { k = 2; checkScale(); }
        if (handles.length === 0) toFlip();
        handles[0].set(col2(P3_SWAP, 0)); handles[1].set(col2(P3_SWAP, 1));
        M = P3_SWAP.map((x) => x.slice());
        await commitFlip();
      },
      async wrong() { await playOn('A'); await playOn('A'); },
    };
  },
};

// ------------------------------------------------------------------ p4 [D][H] · cofactor expansion

const SIGN = (i: number, j: number) => ((i + j) % 2 ? '-' : '+');
const texRowHi = (M: Mat, row: number) => `\\begin{bmatrix}${M.map((r, i) => r.map((x) => (i === row ? `\\cy{${fmtN(x).replace('−', '-')}}` : fmtN(x).replace('−', '-'))).join(' & ')).join(' \\\\ ')}\\end{bmatrix}`;

export const p4: PuzzleDef = {
  id: 'c14-p4',
  title: 'How do we compute a 3 × 3 determinant by hand?',
  goal: 'Choose a row. For each entry, type its sign from the $+\\,-\\,+$ pattern times the determinant of what is left when you cross out its row and column. Add the entries times those numbers. Then the $4 \\times 4$.',
  subgoals: ['The 3 × 3, expanded along a row', 'The 4 × 4, using rows and columns with one non-zero entry'],
  hints: [
    'Cross out the entry\'s row and column. Take the determinant of the $2 \\times 2$ left over. The sign at row $i$, column $j$ is $+$ when $i + j$ is even.',
    'Along row 1: $2 \\cdot \\det\\begin{bmatrix}3&1\\\\1&2\\end{bmatrix} - 1 \\cdot \\det\\begin{bmatrix}1&1\\\\0&2\\end{bmatrix} + 0 = 2 \\cdot 5 - 1 \\cdot 2 = 8$.',
    'Row 1 gives $5, -2, 1$; total 8. The $4 \\times 4$: $1 \\cdot 1 \\cdot (1 \\cdot 2 - 3 \\cdot 1) = -1$.',
  ],
  view: '3d',
  par: 9,
  onWin: S.p4Win,
  setup(p) {
    void p.g.stage.view3D({ target: [1.5, 2.5, 1.5], distance: 15.5, azimuth: -50, elevation: 22, ms: 0 });
    const box = new Parallelepiped(p.g.stage, col3(P4_M3, 0), col3(P4_M3, 1), col3(P4_M3, 2), { color: C.result, opacity: 0.16 });
    const arrows = [C.v, C.w, C.u].map((c, j) => new Arrow([0, 0, 0], col3(P4_M3, j), { color: c, width: 0.045 }));
    const vol = new Label(`volume ${fmtN(det(P4_M3))}`, [1.6, 2.6, 1.8], { className: 'small' });
    vol.show(false);
    p.add(box, ...arrows, vol.object);
    p.onDispose(() => vol.dispose());
    const r = p.readout('Expanding along a row');
    r.row('M', '$M$', `$${texM(P4_M3)}$`);
    r.note('The determinant is the signed volume of the box the three columns make: the scalar triple product of the columns. Writing that product out gives the $+\\,-\\,+$ pattern, and any row or column gives the same number.');
    const flags = [false, false];
    const dock = p.dock();
    const chooser = h('div', { style: 'display:flex;gap:6px;align-items:center;flex-wrap:wrap' }, h('span', { class: 'kicker' }, 'Expand along'));
    const host = h('div');
    dock.append(chooser, host);
    let ws: StepWorksheet | null = null;
    let row = -1;
    const rowBtns = [0, 1, 2].map((i) => button(`row ${i + 1}`, () => choose(i), { cls: 'small' }));
    chooser.append(...rowBtns);
    const done3 = () => {
      flags[0] = true;
      p.subgoal(0);
      vol.show(true);
      sfx.success();
      chooser.remove();
      start4();
    };
    const choose = (i: number) => {
      if (flags[0]) return;
      row = i;
      rowBtns.forEach((b, k) => { b.classList.toggle('primary', k === i); });
      r.row('M', '$M$', `$${texRowHi(P4_M3, i)}$`);
      host.replaceChildren();
      const steps = [0, 1, 2].map((j) => {
        const mi = minorOf(P4_M3, i, j);
        const c = cofactor(P4_M3, i, j);
        return {
          prompt: `Entry $(${i + 1}, ${j + 1})$: $${SIGN(i, j)}\\det${texM(mi)}$`, answer: c,
          mistakes: Math.abs(c) > 1e-9 ? [[-c, `Check the sign: position (${i + 1}, ${j + 1}) has ${SIGN(i, j)} in the $+\\,-\\,+$ pattern.`]] as [number, string][] : [],
        };
      });
      const entries = P4_M3[i].map((a) => fmtN(a).replace('−', '-')).join(', ');
      steps.push({ prompt: `Add each entry of row ${i + 1}, $${entries}$, times its number above: $\\det M =$`, answer: P4_M3[i].reduce((s, a, j) => s + a * cofactor(P4_M3, i, j), 0), mistakes: [] });
      ws = new StepWorksheet(p, { steps, onDone: done3, mount: host });
    };
    const start4 = () => {
      r.row('M', '$N$', `$${texRowHi(P4_M4, 1)}$`);
      r.note('Row 2 of $N$ has one non-zero entry, so one term is enough. The $3 \\times 3$ left over has a middle column with one non-zero entry.');
      p.setGoal('The $4 \\times 4$ $N$. Expand along row 2 (one non-zero entry), then along the middle column of the $3 \\times 3$ left over.');
      void animate(500, (k) => { box.group.visible = k < 0.5; arrows.forEach((a) => a.setOpacity(1 - k)); });
      vol.show(false);
      ws = new StepWorksheet(p, {
        title: p.difficulty === 'commander' ? 'By hand · only the answer is checked' : undefined,
        steps: [
          { prompt: `Row 2 has one non-zero entry, $1$, sign $+$. What is left is $${texM(P4_MINOR3)}$. Its middle column has one non-zero entry, $1$, sign $+$. What is left of that: $\\det${texM(P4_MINOR2)} =$`, answer: det(P4_MINOR2), mistakes: [[1, 'It is 1 · 2 − 3 · 1.']] },
          { prompt: '$\\det N = 1 \\cdot 1 \\cdot (\\text{what is left}) =$', answer: det(P4_M4) },
        ],
        onDone: () => { flags[1] = true; p.subgoal(1); sfx.success(); p.win(); },
        mount: host,
      });
      host.replaceChildren(ws.el);
    };
    if (p.difficulty !== 'commander') choose(0);
    else host.append(h('div', { class: 'c-muted', style: 'font-size:13px' }, 'Pick the row you want. A row with a zero saves a step.'));
    return {
      async showMe() {
        if (row < 0) choose(0);
        await ws?.showMe(250);
        await wait(300);
        await ws?.showMe(250);
      },
      solve() { if (row < 0) choose(0); ws?.solve(); ws?.solve(); },
      wrong() { if (row < 0) choose(0); ws?.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p5 [H] · row reduction, and the k that flattens

export const p5: PuzzleDef = {
  id: 'c14-p5',
  title: 'How do we find a determinant by row reduction, and which k flattens the shield?',
  goal: 'Row reduce $M$ to a triangle. A swap flips the sign; adding a multiple of a row changes nothing. Multiply the pivots. Then find the $k$ that flattens the shield generator.',
  subgoals: ['det M by row reduction, with the sign tracked', 'The k that flattens the shield'],
  hints: [
    'The top-left entry is 0, so swap R1 and R2 first. That flips the sign.',
    'Then $R_3 - 2R_1$ and $R_3 + \\tfrac12 R_2$ leave the diagonal $1, 2, -\\tfrac32$. Multiply them and flip the sign.',
    'det M = 3. For the shield, $2 \\cdot 6 - 3k = 0$: $k = 4$.',
  ],
  view: '3d',
  par: 6,
  onWin: S.p5Win,
  setup(p) {
    void p.g.stage.view3D({ target: [0.3, 0.7, 0.9], distance: 15, azimuth: -55, elevation: 24, ms: 0 });
    const box = new Parallelepiped(p.g.stage, col3(P5_M, 0), col3(P5_M, 1), col3(P5_M, 2), { color: C.result, opacity: 0.16 });
    const arrows = [C.v, C.w, C.u].map((c, j) => new Arrow([0, 0, 0], col3(P5_M, j), { color: c, width: 0.045 }));
    p.add(box, ...arrows);
    const r = p.readout('Determinant by row reduction');
    r.row('M', '$M$', `$${texM(P5_M)}$`);
    r.note('A swap turns the box over: the sign flips. Adding a multiple of one row to another is a shear: no change. A triangle\'s determinant is the product of its diagonal.');
    const host = h('div');
    p.dock().append(host);
    const tol = tolFor(p.difficulty);
    let k = 0;
    let slider: Slider | null = null;
    let tile: UnitTile | null = null;
    const toShield = async () => {
      p.subgoal(0);
      sfx.success();
      await p.g.stage.view2D({ center: [0.6, 1.4], height: 11, ms: 600 });
      box.group.visible = false; arrows.forEach((a) => a.setOpacity(0));
      const grid = p.grid({ base: 0.42, main: 0.55, axis: 0.55 });
      landingLineColour(grid);
      tile = new UnitTile(p.g.stage, { name: 'area' });
      p.add(tile);
      const upd = () => { const S2 = shield(k); grid.set(S2); tile!.set(S2); r.row('M', 'shield generator', `$${texM(S2)}$`); };
      r.note('Its area factor is $2 \\cdot 6 - 3k$. Drag $k$ until the grid collapses onto a line.');
      p.setGoal('The shield generator $\\begin{bmatrix} 2 & k \\\\ 3 & 6 \\end{bmatrix}$. Drag $k$ until its grid collapses: area 0.');
      const step = p.difficulty === 'commander' ? 0.1 : 0.5;
      let won = false;
      slider = new Slider({
        label: '$k$', min: -2, max: 8, step, value: 0, onInput: (x) => {
          k = x; upd();
          if (!won && p5ShieldOk(k, tol)) { won = true; sfx.collapse(); p.g.stage.nudge(0.2); p.subgoal(1); p.win(); }
        },
      });
      host.replaceChildren(h('div', { class: 'kicker' }, 'Shield generator'), slider.el);
      upd();
    };
    const ws = new StepWorksheet(p, {
      mount: host,
      steps: [
        { prompt: 'The pivot spot of column 1 holds 0. Swap $R_1$ and $R_2$. The sign of the determinant is now', answer: -1, mistakes: [[1, 'A swap turns the box over: the sign flips.']] },
        { prompt: '$R_3 \\to R_3 - 2R_1$, then $R_3 \\to R_3 + \\tfrac12 R_2$. The diagonal of the triangle:', answer: P5_DIAG, mistakes: [[[1, 2, -3], 'Adding half of R2 leaves −3/2 in the corner: −2 + ½ · 1.']] },
        { prompt: '$\\det M = (\\text{sign}) \\times (\\text{product of the diagonal})$', answer: P5_DET, mistakes: [[-3, 'Keep the sign from the swap.']] },
      ],
      onDone: () => void toShield(),
    });
    return {
      async showMe() { await ws.showMe(300); for (let i = 0; i < 200 && !slider; i++) await wait(20); await wait(600); slider?.set(P5_K, true); },
      async solve() { ws.solve(); for (let i = 0; i < 200 && !slider; i++) await wait(20); slider?.set(P5_K, true); },
      wrong() { ws.wrong(); },
    };
  },
};

// ------------------------------------------------------------------ p7 [S] · Cramer's rule

export const p7: PuzzleDef = {
  id: 'c14-p7',
  title: 'Can areas solve equations?',
  goal: 'Solve $A\\mathbf x = \\mathbf b$ for $A = \\begin{bmatrix} 2 & 1 \\\\ 1 & 1 \\end{bmatrix}$, $\\mathbf b = (5, 3)$ with areas only. The tile with columns $\\mathbf x$ and $\\mathbf e_2$ has area $x_1$; $A$ sends it to the tile with columns $\\mathbf b$ and $\\mathbf a_2$: the columns of $A_1(\\mathbf b)$, which is $A$ with column 1 replaced by $\\mathbf b$.',
  hints: [
    '$A$ multiplies every area by $\\det A$. So $\\det A \\cdot x_1$ is the area of the tile with columns $\\mathbf b$ and $\\mathbf a_2$.',
    '$\\det\\begin{bmatrix}5&1\\\\3&1\\end{bmatrix} = 2$ and $\\det A = 1$, so $x_1 = 2$.',
    '$x_1 = 2$, $x_2 = \\det\\begin{bmatrix}2&5\\\\1&3\\end{bmatrix} / 1 = 1$.',
  ],
  par: 5,
  onWin: S.p7Win,
  setup(p) {
    p.g.stage.view2D({ center: [2.4, 2.4], height: 10, ms: 0 });
    p.grid({ base: 0.42, main: 0.5, axis: 0.8 });
    const A1b = replaceCol(P7_A, 0, P7_B);
    const img = new Parallelogram(p.g.stage, col2(A1b, 0), col2(A1b, 1), { color: C.result, opacity: 0.2 });
    const bArrow = new Arrow([0, 0, 0], [P7_B[0], P7_B[1], 0], { color: C.result, width: 0.045, label: '$\\mathbf b$' });
    const a2 = new Arrow([0, 0, 0], col2(P7_A, 1), { color: C.w, width: 0.045, label: '$\\mathbf a_2$' });
    const lab = new Label(`area ${fmtN(det2(A1b))}`, [3.2, 2.3, 0.05], { className: 'small' });
    const xTile = new Parallelogram(p.g.stage, [P7_X[0], P7_X[1], 0], [0, 1, 0], { color: C.v, opacity: 0 });
    xTile.setOpacity(0, 0);
    p.add(img, bArrow, a2, lab.object, xTile);
    p.onDispose(() => lab.dispose());
    const r = p.readout('Cramer, from areas');
    r.row('A', '$A$', `$${texM(P7_A)}$`);
    r.row('b', '$\\mathbf b$', '(5, 3)');
    r.eq('x_1 = \\frac{\\det A_1(\\mathbf b)}{\\det A}');
    const ws = new StepWorksheet(p, {
      steps: [
        { prompt: 'Area of the tile with columns $\\mathbf b$, $\\mathbf a_2$: $\\det\\begin{bmatrix}5&1\\\\3&1\\end{bmatrix}$', answer: det2(A1b) },
        { prompt: '$\\det A$', answer: det2(P7_A) },
        { prompt: '$x_1 = \\det A_1(\\mathbf b) / \\det A$', answer: P7_X[0] },
        { prompt: '$x_2 = \\det\\begin{bmatrix}2&5\\\\1&3\\end{bmatrix} / \\det A$', answer: P7_X[1] },
      ],
      onDone: () => {
        xTile.setOpacity(0.18, 0.9);
        r.row('x', '$\\mathbf x$', '(2, 1)', C.good);
        r.eq('2\\,(2, 1) + 1\\,(1, 1) = (5, 3)');
        void burst(p.g.stage, [P7_X[0], P7_X[1], 0.05], C.good, 40, 2);
        p.win();
      },
    });
    return { async showMe() { await ws.showMe(350); }, solve() { ws.solve(); }, wrong() { ws.wrong(); } };
  },
};
