// Chapter 17 puzzles 4–7: replay Ilse's quarter turn in the Anchor's grid on the three-slot rail (p4), find
// what she meant to enter (p5), what does not change between the two descriptions (p6 [D]), and the
// spire bench's bow forecast run again in 3-D (p7 [S]).
import type { PuzzleCtx, PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot, Pad } from '../../../gfx/markers';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { Outline2D, Parallelogram } from '../../../gfx/shapes';
import { MatrixInput, Slider } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { P, P2, P2inv, Pinv, R2, S_now, T } from '../../truth';
import { col, identity, matMul, matVec, meq, type Mat } from '../../../math/la';
import { Vector3 } from 'three';
import { COPPER, CopperGrid, SHIP_GRID, tag } from './grids';
import { Rail, playCards, type Rider } from './rail';
import {
  B1, B2, BOW, BOW3, BOW3_REAL, BOW3_SPIRE, BOW_REAL, BOW_SPIRE, ILSE_MEANT2, P6, P6_ORDER, P6_PAR, TURN_B1, TURN_B2, anchorOf, fmtV,
  measures, p4Won, p5Won, p6MarksRight, p7Won, settingFromLandings, shipMove, texM, texSmall, T3partial, type Card, type Measure,
} from './logic';
import { S } from './script';

const v3 = (v: readonly number[], z = 0): V3 => [v[0], v[1], z];
const W2 = (W: Mat, v: readonly number[], z = 0): V3 => { const q = matVec(W, v as number[]); return [q[0], q[1], z]; };

/** An L-shaped deck plate on the ground layer: no mirror symmetry, so a turn and a lean look different. */
const PLATE: [number, number][] = [[0, 0], [1, 0], [1, 0.45], [0.45, 0.45], [0.45, 1], [0, 1]];

// ------------------------------------------------------------------ the replay bench shared by p4 and p5

const CARD_P: Card = { id: 'P', name: 'P · arms as columns', M: P2 };
const CARD_PI: Card = { id: 'Pinv', name: 'P⁻¹', M: P2inv };
const CARD_R: Card = { id: 'R', name: 'Ilse’s R', M: R2 };
const SLOTS = [
  { id: 'into', label: 'into the Anchor’s grid', copper: true },
  { id: 'spire', label: 'the spire numbers' },
  { id: 'back', label: 'back to the ship’s grid' },
];
const STAGE_TEXT = ['1 · into the Anchor’s grid: the same points, counted in the Anchor’s arms', '2 · the spire numbers act', '3 · back to the ship’s grid'];

/** The picture the rail moves: our grid, the Anchor's copper grid, the arms, the deck plate and the bow. */
function replayBench(p: PuzzleCtx, o: { center: [number, number]; height: number }) {
  void p.g.stage.view2D({ center: o.center, height: o.height, ms: 0 });
  const grid = p.grid(SHIP_GRID);
  const copper = new CopperGrid(p.g.stage, { M: P2 });
  p.add(copper);
  const a1 = new Arrow([0, 0, 0.01], v3(B1, 0.01), { color: C.v, width: 0.055, label: '$\\mathbf b_1$' });
  const a2 = new Arrow([0, 0, 0.01], v3(B2, 0.01), { color: C.w, width: 0.055, label: '$\\mathbf b_2$' });
  const plate = new Outline2D(p.g.stage, PLATE, { color: C.white, opacity: 0.14 });
  const bow = new Dot([1, 0, 0.05], { color: C.white, size: 0.1 });
  const bowTag = tag('bow', [1, 0, 0], 'w', [0, 24]);
  p.add(plate, a1, a2, bow, bowTag.object);
  p.onDispose(() => bowTag.dispose());
  const top = o.center[1] + o.height / 2 - 0.55;
  const caption = new Label('', [o.center[0], top, 0], { className: 'c17-stage' });
  caption.show(false);
  p.add(caption.object);
  p.onDispose(() => caption.dispose());
  const rider: Rider = (W) => {
    grid.set(W);
    copper.set(matMul(W, P2));
    a1.set([0, 0, 0.01], W2(W, B1, 0.01));
    a2.set([0, 0, 0.01], W2(W, B2, 0.01));
    plate.set(W);
    const b = W2(W, BOW, 0.05);
    bow.at(b); bowTag.at([b[0], b[1], 0]);
  };
  rider(identity(2));
  return {
    rider, caption,
    say(i: number) { caption.show(i >= 0); if (i >= 0) caption.set(STAGE_TEXT[i]); },
  };
}

/** A dashed outline of where a move puts the deck plate, and a ring where it puts the bow. */
function ghostOf(p: PuzzleCtx, M: Mat, label: string, color: string = C.result) {
  const pts = PLATE.map(([x, y]) => W2(M, [x, y], 0.02));
  const line = new FatLine(p.g.stage, [...pts, pts[0]], { color, width: 1.8, dashed: true, opacity: 0.85, dashSize: 0.1, gapSize: 0.07 });
  const b = W2(M, BOW);
  const ring = new Pad(p.g.stage, b, { color, radius: 0.24 });
  const t = tag(label, b, color === C.result ? 'y' : 'dim', [0, -26]);
  p.add(line.object, ring, t.object);
  p.onDispose(() => { line.dispose(); t.dispose(); });
  return { ring, show(v: boolean) { line.object.visible = v; ring.object.visible = v; t.show(v); } };
}

// ------------------------------------------------------------------ p4 · replay what happened

export const p4: PuzzleDef = {
  id: 'c17-p4',
  title: 'What does a quarter turn do when the Anchor reads it in its own grid?',
  goal: 'Put three cards on the rail: **into** the Anchor’s grid, Ilse’s **spire numbers** $R$, **back** to ours. **Replay** it. It must match the measured pulse: the dashed yellow plate.',
  predict: {
    prompt: `Ilse’s numbers are a quarter turn. The Anchor reads them in its own grid. Where does the bow at $${fmtV(BOW)}$ go?`,
    choices: [{ id: 'turn', text: `$${fmtV(BOW_SPIRE)}$: a quarter turn` }, { id: 'real', text: `$${fmtV(BOW_REAL)}$` }, { id: 'swap', text: `$${fmtV(matVec(ILSE_MEANT2, BOW))}$` }],
    answer: 'real',
    reveal: `$${fmtV(BOW_REAL)}$, where the bow really went. In the Anchor’s numbers the bow is $(1, 0)$. A quarter turn sends that to the Anchor’s $(0, 1)$: one $\\mathbf b_2$, which is $(1, 1)$ in ours.`,
  },
  hints: [
    'Into the Anchor’s grid means: our numbers in, the Anchor’s numbers out. $P$ goes the other way, so the first card is $P^{-1}$.',
    'The right-hand slot acts first. The spire numbers act in the middle, in the Anchor’s grid.',
    'Right to left: $P^{-1}$, then $R$, then $P$. The rail makes $PRP^{-1}$.',
  ],
  par: 4,
  onWin: S.p4Win,
  setup(p) {
    const bench = replayBench(p, { center: [-0.4, 0.4], height: 8.6 });
    const measured = ghostOf(p, T, 'measured');
    const spire = ghostOf(p, R2, 'spire forecast', '#8a96ad');
    const rail = new Rail({ slots: SLOTS, palette: [CARD_P, CARD_PI, CARD_R], onChange: () => { if (!busy && !won) { bench.rider(identity(2)); msg.className = 'c17-msg'; } paint(); } });
    const r = p.readout('The replay');
    const d = p.difficulty;
    let replayed = false;
    const paint = () => {
      const M = rail.product();
      r.row('meas', 'measured pulse', `$${texSmall(T)}$`, C.result);
      r.row('rail', 'your rail makes', M && (d === 'cadet' || replayed) ? `$${texSmall(M)}$` : '?', C.white);
      r.row('bow', 'bow lands at', M && (d === 'cadet' || replayed) ? fmtV(matVec(M, BOW)) : '?', C.white);
    };
    paint();
    // commander: type the single matrix your rail makes before the replay
    const typed = d === 'commander' ? new MatrixInput({ rows: 2, cols: 2, values: identity(2), label: '\\text{one matrix} =', step: 1 }) : null;
    if (typed) typed.el.classList.add('c17-in');
    const msg = h('div', { class: 'c17-msg' }, d === 'commander' ? 'Type the one matrix your three cards make, then replay.' : 'Replay plays the cards right to left on the picture.');
    let busy = false, won = false;
    const replay = async (fast = false) => {
      if (busy || won) return;
      if (!rail.full) { sfx.miss(); msg.className = 'c17-msg bad'; msg.textContent = 'Fill all three slots first.'; return; }
      const M = rail.product()!;
      if (typed && !meq(typed.get(), M, 1e-6)) { p.move(); sfx.miss(); msg.className = 'c17-msg bad'; msg.textContent = 'That is not the one matrix these three cards make. Multiply right to left.'; return; }
      busy = true;
      p.move();
      measured.show(false); spire.show(false);
      if (fast) bench.rider(M);
      else await playCards(rail.cards as Card[], [bench.rider], { ms: p.g.headless ? 20 : 1500, rail, onStage: (i) => bench.say(i), pause: 250 });
      bench.say(-1);
      measured.show(true); spire.show(true);
      replayed = true; paint();
      busy = false;
      if (p4Won(rail.cards.map((c) => c!.M))) {
        won = true; void measured.ring.hit(C.result); sfx.success();
        msg.className = 'c17-msg good'; msg.textContent = `It matches the measured pulse exactly. The bow lands on ${fmtV(BOW_REAL)}.`;
        p.win(); return;
      }
      sfx.miss();
      const land = matVec(M, BOW);
      msg.className = 'c17-msg bad';
      msg.textContent = meq(M, ILSE_MEANT2, 1e-9)
        ? `The bow lands at ${fmtV(land)}, not ${fmtV(BOW_REAL)}. The first card must turn our numbers into the Anchor’s: that is P⁻¹.`
        : `This rail sends the bow to ${fmtV(land)}. The measured pulse sent it to ${fmtV(BOW_REAL)}.`;
      p.bark('lantern', `Replay lands the bow at ${fmtV(land)}. Measured: ${fmtV(BOW_REAL)}.`);
    };
    p.dock().append(rail.el, h('div', { class: 'c17-btns' }, ...(typed ? [typed.el] : []), button('Replay', () => void replay(), { cls: 'primary small' })), msg);
    const right = [CARD_PI, CARD_R, CARD_P];
    return {
      async showMe() { for (let i = 0; i < 3; i++) { rail.set(right.slice(0, i + 1)); await wait(250); } typed?.set(T); await replay(); },
      async solve() { rail.set(right); typed?.set(T); await replay(true); },
      async wrong() { rail.set([CARD_P, CARD_R, CARD_PI]); typed?.set(ILSE_MEANT2); await replay(true); },
    };
  },
};

// ------------------------------------------------------------------ p5 · what she meant to enter

export const p5: PuzzleDef = {
  id: 'c17-p5',
  title: 'Which spire numbers turn our grid a clean quarter turn?',
  goal: 'The Anchor will read your setting $S$ in its own grid: the rail plays $PSP^{-1}$. Find $S$ so the replay turns our grid a **clean quarter turn**: the plate lands on the dashed one.',
  hints: [
    'The columns of $S$ are where the Anchor’s arms must land, written in the Anchor’s numbers.',
    `A clean quarter turn sends $\\mathbf b_1$ to $${fmtV(TURN_B1)}$ and $\\mathbf b_2$ to $${fmtV(TURN_B2)}$ in our numbers. In the Anchor’s numbers those are $${fmtV(anchorOf(TURN_B1)!)}$ and $${fmtV(anchorOf(TURN_B2)!)}$.`,
    `$S = P^{-1}RP = ${texM(ILSE_MEANT2)}$.`,
  ],
  par: 3,
  onWin: S.p5Win,
  setup(p) {
    const bench = replayBench(p, { center: [-0.6, 0.6], height: 8.6 });
    const target = ghostOf(p, R2, 'clean turn');
    const d = p.difficulty;
    let Sm: Mat = R2.map((r) => r.slice());
    const card = (): Card => ({ id: 'S', name: 'your setting S', M: Sm });
    const rail = new Rail({ slots: [{ ...SLOTS[0], fixed: CARD_PI }, SLOTS[1], { ...SLOTS[2], fixed: CARD_P }] });
    rail.setCard(1, card());
    const r = p.readout('Your setting');
    let replayed = false;
    const paint = () => {
      r.row('s', 'setting $S$, the Anchor’s numbers', `$${texSmall(Sm)}$`, COPPER);
      const M = shipMove(Sm);
      const show = d === 'cadet' || (d === 'navigator' && replayed);
      r.row('m', 'the move in our grid, $PSP^{-1}$', show ? `$${texSmall(M)}$` : '?', C.white);
      r.row('b', 'bow lands at', show ? fmtV(matVec(M, BOW)) : '?', C.white);
    };
    let shown = false;
    /** After a missed replay, the picture stays until the setting changes. */
    const back = () => { if (shown && !busy && !won) { shown = false; bench.rider(identity(2)); handles.forEach((x) => { x.object.visible = true; }); } };
    const input = new MatrixInput({ rows: 2, cols: 2, values: Sm, colourCols: true, label: 'S =', step: d === 'commander' ? 0.5 : 1, onChange: (m) => { back(); Sm = m; rail.setCard(1, card()); syncHandles(); paint(); }, onSubmit: () => void replay() });
    input.el.classList.add('c17-in');
    // cadet: drag where each arm lands (in our grid); the setting reads their Anchor numbers
    const handles: Arrow[] = [];
    const syncHandles = () => {
      const L = matMul(P2, Sm);
      handles.forEach((hd, j) => hd.setTo([L[0][j], L[1][j], 0.03]));
    };
    if (d === 'cadet') {
      [C.v, C.w].forEach((color, j) => {
        const L = matMul(P2, Sm);
        const hd = new Arrow([0, 0, 0.03], [L[0][j], L[1][j], 0.03], { color, handle: true, opacity: 0.75, width: 0.04, label: j ? '$S$: where $\\mathbf b_2$ lands' : '$S$: where $\\mathbf b_1$ lands' });
        p.add(hd);
        handles.push(hd);
        p.g.drag.add({
          target: hd.grab, getPos: () => hd.to.clone(), snap: () => null,
          constrain: (q) => { const c = anchorOf([q.x, q.y])!.map((x) => Math.max(-4, Math.min(4, Math.round(x)))); const t = matVec(P2, c); return new Vector3(t[0], t[1], 0.03); },
          onMove: (q) => {
            back();
            hd.setTo([q.x, q.y, 0.03]);
            const L = handles.map((x) => [x.to.x, x.to.y]);
            Sm = settingFromLandings(L[0], L[1]).map((row) => row.map((x) => Math.round(x * 1e6) / 1e6));
            input.set(Sm); rail.setCard(1, card()); paint(); sfx.tick(q.y);
          },
          onEnd: () => p.move(),
        });
      });
    }
    const msg = h('div', { class: 'c17-msg' }, d === 'cadet' ? 'Drag where each arm should land, or type $S$. Then replay.' : 'Type the setting $S$, then replay.');
    msg.innerHTML = d === 'cadet' ? 'Drag where each arm should land, or type <i>S</i>. Then replay.' : 'Type the setting <i>S</i> in the Anchor’s numbers, then replay.';
    let busy = false, won = false;
    const replay = async (fast = false) => {
      if (busy || won) return;
      busy = true;
      p.move();
      handles.forEach((x) => { x.object.visible = false; });
      target.show(false);
      if (fast) bench.rider(shipMove(Sm));
      else await playCards(rail.cards as Card[], [bench.rider], { ms: p.g.headless ? 20 : 1300, rail, onStage: (i) => bench.say(i), pause: 200 });
      bench.say(-1);
      target.show(true);
      replayed = true; paint();
      busy = false;
      if (p5Won(Sm)) {
        won = true; void target.ring.hit(C.result); sfx.success();
        msg.className = 'c17-msg good'; msg.textContent = 'A clean quarter turn of our grid: the plate lands on the dashed one.';
        p.win(); return;
      }
      sfx.miss();
      const M = shipMove(Sm);
      msg.className = 'c17-msg bad';
      msg.textContent = meq(Sm, R2, 1e-9)
        ? 'That is Ilse’s original setting: read in the Anchor’s grid it leans our grid. The measured pulse again.'
        : `This setting moves our grid by ${fmtV(col(M, 0))}, ${fmtV(col(M, 1))}: the bow lands at ${fmtV(matVec(M, BOW))}. A clean turn sends it to ${fmtV(BOW_SPIRE)}.`;
      p.bark('lantern', `The bow lands at ${fmtV(matVec(M, BOW))}. A clean quarter turn sends it to ${fmtV(BOW_SPIRE)}.`);
      shown = true;
    };
    p.dock().append(rail.el, h('div', { class: 'c17-btns' }, input.el, button('Replay', () => void replay(), { cls: 'primary small' })), msg);
    paint();
    return {
      async showMe() { Sm = ILSE_MEANT2.map((x) => x.slice()); input.set(Sm); rail.setCard(1, card()); syncHandles(); paint(); await wait(300); await replay(); },
      async solve() { Sm = ILSE_MEANT2.map((x) => x.slice()); input.set(Sm); rail.setCard(1, card()); paint(); await replay(true); },
      async wrong() { Sm = R2.map((x) => x.slice()); input.set(Sm); rail.setCard(1, card()); await replay(true); },
    };
  },
};

// ------------------------------------------------------------------ p6 [D] · what did not change

/** Half the width of each room in the twin view (world units). */
const ROOM_HALF = 1.75;

interface Room { origin: V3; tile: Parallelogram; land: Arrow; rider: Dot; trail: FatSegments; M: Mat }

function room(p: PuzzleCtx, origin: V3, M: Mat, o: { title: string; cls: string; copper: boolean }): Room {
  const H = ROOM_HALF;
  const lines = new CopperGrid(p.g.stage, { M: identity(2), origin: [origin[0], origin[1]], half: H, color: o.copper ? COPPER : SHIP_GRID.color, dashed: o.copper, opacity: o.copper ? 0.75 : 0.4, width: o.copper ? 1.5 : 1.1, n: 4 });
  p.add(lines);
  if (!o.copper) { const cu = new CopperGrid(p.g.stage, { M: P2, origin: [origin[0], origin[1]], half: H, opacity: 0.35, width: 1.2, n: 8 }); p.add(cu); }
  const axes = new FatSegments(p.g.stage, [[[origin[0] - H, origin[1], 0.002], [origin[0] + H, origin[1], 0.002]], [[origin[0], origin[1] - H, 0.002], [origin[0], origin[1] + H, 0.002]]], { color: o.copper ? COPPER : C.axis, width: 1.6, opacity: 0.55 });
  p.add(axes.object);
  p.onDispose(() => axes.dispose());
  const cap = new Label(o.title, [origin[0], origin[1] + H + 0.38, 0], { className: o.cls });
  p.add(cap.object);
  p.onDispose(() => cap.dispose());
  const tile = new Parallelogram(p.g.stage, [1, 0, 0], [0, 1, 0], { color: C.result, opacity: 0.16, origin: [origin[0], origin[1], 0.01] });
  const land = new Arrow([origin[0], origin[1], 0.02], [origin[0], origin[1], 0.02], { color: C.result, width: 0.045 });
  const rider = new Dot([origin[0] + 1, origin[1], 0.05], { color: C.white, size: 0.09 });
  const trail = new FatSegments(p.g.stage, [], { color: C.white, width: 1.3, dashed: true, opacity: 0.6, dashSize: 0.1, gapSize: 0.08 });
  p.add(tile, land, rider, trail.object);
  p.onDispose(() => trail.dispose());
  rider.setOpacity(0);
  return { origin, tile, land, rider, trail, M };
}

const at = (rm: Room, v: readonly number[], z = 0.02): V3 => [rm.origin[0] + v[0], rm.origin[1] + v[1], z];

/** One measurement played on both rooms. */
async function playMeasure(id: Measure['id'], rooms: Room[], fast: boolean): Promise<void> {
  const ms = fast ? 10 : 800;
  if (id === 'det') {
    await Promise.all(rooms.map((rm) => rm.tile.morph(v3(col(rm.M, 0)), v3(col(rm.M, 1)), ms)));
  } else if (id === 'land') {
    rooms.forEach((rm) => rm.land.set(at(rm, [0, 0]), at(rm, [0, 0])));
    await Promise.all(rooms.map((rm) => rm.land.moveTo(at(rm, matVec(rm.M, [1, 0])), ms)));
  } else if (id === 'four') {
    for (const rm of rooms) { rm.rider.setOpacity(1); rm.rider.at(at(rm, [1, 0], 0.05)); rm.trail.setSegments([]); }
    const segs: [V3, V3][][] = rooms.map(() => []);
    for (let k = 0; k < 4; k++) {
      await Promise.all(rooms.map(async (rm, i) => {
        const a = matVec(mpow2(rm.M, k), [1, 0]);
        // honest: the point rides the move partway (a turn for R, P R(θ) P⁻¹ for T)
        await animate(fast ? 10 : 520, (t) => { const q = matVec(partial(rm.M, t), a); rm.rider.at(at(rm, q, 0.05)); }, ease.inOut);
        const b = matVec(mpow2(rm.M, k + 1), [1, 0]);
        segs[i].push([at(rm, a, 0.03), at(rm, b, 0.03)]);
        rm.trail.setSegments(segs[i]);
      }));
      sfx.tick(k);
    }
  } else {
    await wait(fast ? 10 : 250);
  }
}
/** The same measurement's end state, at once (Show me and tests do not wait for frames). */
function snapMeasure(id: Measure['id'], rooms: Room[]): void {
  for (const rm of rooms) {
    if (id === 'det') rm.tile.set(v3(col(rm.M, 0)), v3(col(rm.M, 1)), at(rm, [0, 0], 0.01));
    if (id === 'land') rm.land.set(at(rm, [0, 0]), at(rm, matVec(rm.M, [1, 0])));
    if (id === 'four') {
      rm.rider.setOpacity(1); rm.rider.at(at(rm, [1, 0], 0.05));
      rm.trail.setSegments([0, 1, 2, 3].map((k) => [at(rm, matVec(mpow2(rm.M, k), [1, 0]), 0.03), at(rm, matVec(mpow2(rm.M, k + 1), [1, 0]), 0.03)] as [V3, V3]));
    }
  }
}
const mpow2 = (M: Mat, k: number): Mat => { let out = identity(2); for (let i = 0; i < k; i++) out = matMul(M, out); return out; };
/** The honest in-between of one pulse: R turns; T = P R P⁻¹ turns in the Anchor's grid. */
const partial = (M: Mat, t: number): Mat => {
  const th = (t * Math.PI) / 2;
  const rot = [[Math.cos(th), -Math.sin(th)], [Math.sin(th), Math.cos(th)]];
  return meq(M, R2, 1e-9) ? rot : matMul(matMul(P2, rot), P2inv);
};

export const p6: PuzzleDef = {
  id: 'c17-p6',
  title: 'What stays the same when the grid changes?',
  goal: 'Left: the spire numbers $R$ in the Anchor’s grid. Right: the measured pulse $T = PRP^{-1}$ in ours. **Measure** each row, mark it **same** or **different**. Then show **why** the area scale cannot change.',
  subgoals: ['Measure and mark all five rows', 'Why the area scale is the same in every grid'],
  hints: [
    'Measure first: each row plays on both sides. Then compare the two numbers.',
    'Area, the sum down the diagonal and the fourth pulse match. The entries and the landing of $(1, 0)$ do not.',
    `$\\det(P^{-1}AP) = \\det P^{-1}\\cdot\\det A\\cdot\\det P$, and $\\det P^{-1} = 1/\\det P$. For Vell’s grid: $\\tfrac12 \\cdot 1 \\cdot 2 = 1$.`,
  ],
  par: P6_PAR, // fewest moves: 5 measurements + 5 marks, then cadet 2, navigator 4 checked lines, commander tiles + 1 line
  onWin: S.p6Win,
  setup(p) {
    void p.g.stage.view2D({ center: [0, 0], height: 11, ms: 0 });
    const rooms = [
      room(p, [-1.45, 1.75, 0], R2, { title: 'In the Anchor’s grid · R', cls: 'c17-cap cu', copper: true }),
      room(p, [2.5, 1.75, 0], T, { title: 'In our grid · T = P R P⁻¹', cls: 'c17-cap', copper: false }),
    ];
    const list = measures();
    const marks: Partial<Record<Measure['id'], 'same' | 'diff'>> = {};
    const measured = new Set<string>();
    const flags = [false, false];
    let reasonShown = false;
    const r = p.readout('The two descriptions');
    r.row('R', 'spire numbers $R$', `$${texSmall(R2)}$`, COPPER);
    r.row('T', 'measured pulse $T$', `$${texSmall(T)}$`, C.white);
    const table = h('div', { class: 'c17-meas' },
      h('span', { class: 'h' }, 'measurement'), h('span', { class: 'h c17-cu' }, 'Anchor’s'), h('span', { class: 'h' }, 'ours'), h('span', { class: 'h' }, 'mark'));
    const rowEls = new Map<string, { lbl: HTMLElement; a: HTMLElement; b: HTMLElement; same: HTMLButtonElement; diff: HTMLButtonElement }>();
    let busy = false;
    const measure = async (m: Measure, instant = false) => {
      if (busy || measured.has(m.id)) return;
      busy = true;
      p.move();
      if (instant) snapMeasure(m.id, rooms); else await playMeasure(m.id, rooms, p.g.headless);
      measured.add(m.id);
      const e = rowEls.get(m.id)!;
      e.a.innerHTML = inline(m.a); e.b.innerHTML = inline(m.b);
      e.same.disabled = false; e.diff.disabled = false;
      busy = false;
    };
    const mark = (m: Measure, v: 'same' | 'diff') => {
      if (!measured.has(m.id)) { sfx.miss(); p.bark('lantern', 'Measure it first. Click the row.'); return; }
      p.move();
      marks[m.id] = v;
      const e = rowEls.get(m.id)!;
      e.same.classList.toggle('on', v === 'same'); e.diff.classList.toggle('on', v === 'diff');
      const right = (v === 'same') === m.same;
      e.lbl.classList.toggle('lit', right && m.same);
      if (!right) { sfx.miss(); p.bark('lantern', m.same ? `Both read ${m.a.replace(/\$/g, '')}. They match.` : `${m.id === 'entries' ? 'The entries differ' : `Anchor’s ${m.a}, ours ${m.b}`}. They do not match.`); }
      else sfx.snap();
      if (p6MarksRight(marks) && !flags[0]) { flags[0] = true; p.subgoal(0); showReason(); }
    };
    for (const m of list) {
      const lbl = h('button', { class: 'btn ghost small', type: 'button', html: inline(m.label), title: 'Measure on both sides' }) as HTMLButtonElement;
      lbl.addEventListener('click', () => void measure(m));
      const a = h('span', { class: 'v cu' }, '·'), b = h('span', { class: 'v' }, '·');
      const same = h('button', { class: 'btn small same', type: 'button', disabled: true }, 'same') as HTMLButtonElement;
      const diff = h('button', { class: 'btn small diff', type: 'button', disabled: true }, 'different') as HTMLButtonElement;
      same.addEventListener('click', () => mark(m, 'same'));
      diff.addEventListener('click', () => mark(m, 'diff'));
      rowEls.set(m.id, { lbl, a, b, same, diff });
      table.append(lbl, a, b, h('span', { class: 'marks' }, same, diff));
    }
    p.dock().append(h('div', { class: 'kicker' }, 'Measure both sides (click a row), then mark it'), table);
    // the reason, by difficulty: watch + one drag / typed steps / tiles then the last line
    let ws: StepWorksheet | null = null;
    let slider: Slider | null = null;
    const finish = () => { if (flags[1]) return; flags[1] = true; p.subgoal(1); r.note('Two descriptions of one move share everything that does not depend on the grid: area scale, the sum down the diagonal, how many pulses bring it home.'); p.win(); };
    const steps = [
      { prompt: 'Vell’s grid: $\\det P_C$', answer: P6.detPC },
      { prompt: '$\\det P_C^{-1} = 1/\\det P_C$', answer: P6.detPCinv, mistakes: [[P6.detPC, 'Undoing a doubling of area halves it.']] as [number, string][] },
      { prompt: '$\\det T$', answer: P6.detT },
      { prompt: '$\\det(P_C^{-1}TP_C) = \\det P_C^{-1}\\cdot\\det T\\cdot\\det P_C$', answer: P6.detSim, mistakes: [[2, 'Multiply all three: the ½ and the 2 cancel.'], [0.5, 'Multiply all three: the ½ and the 2 cancel.']] as [number, string][] },
    ];
    const reasonBox = h('div', { class: 'c17-reason' });
    const showReason = () => {
      if (reasonShown) return;
      reasonShown = true;
      r.el.append(h('hr'), h('div', { class: 'kicker' }, 'Why the area scale is the same'), reasonBox);
      if (p.difficulty === 'cadet') {
        reasonBox.append(h('div', { class: 'c17-msg', html: inline('Through Vell’s grid: $P_C$ doubles area, $T$ keeps it, $P_C^{-1}$ halves it. Set the area after all three.') }));
        slider = new Slider({ label: 'area after all three', min: 0, max: 4, step: 0.5, value: 2, onInput: (x) => { p.move(); if (Math.abs(x - 1) < 1e-9) finish(); } });
        reasonBox.append(slider.el);
      } else if (p.difficulty === 'navigator') {
        ws = new StepWorksheet(p, { steps, onDone: finish, mount: reasonBox });
      } else {
        const tiles = new TileOrder(p, {
          title: 'Order the reason',
          tiles: [
            { id: 'product', text: 'The determinant of a product is the product of the determinants.' },
            { id: 'inverse', text: '$\\det P^{-1} = 1/\\det P$: undoing a move undoes its area scale.' },
            { id: 'cancel', text: 'So $\\det(P^{-1}AP) = \\tfrac{1}{\\det P}\\cdot\\det A\\cdot\\det P = \\det A$.' },
          ],
          submitLabel: 'Check order', mount: reasonBox,
          onSubmit: (o) => {
            p.move();
            if (o.join() === P6_ORDER.join()) { tiles.el.remove(); ws = new StepWorksheet(p, { steps: [steps[3]], onDone: finish, mount: reasonBox }); }
            else p.bark('lantern', 'That order does not reach the end. Start from the product rule.');
          },
        });
        void tiles;
      }
    };
    return {
      async showMe() {
        for (const m of list) { await measure(m); mark(m, m.same ? 'same' : 'diff'); await wait(150); }
        if (slider) { (slider as Slider).set(1, false); finish(); return; }
        if (!ws) ws = new StepWorksheet(p, { steps: [steps[3]], onDone: finish, mount: reasonBox });
        await ws.showMe(300);
      },
      async solve() {
        for (const m of list) { await measure(m, true); mark(m, m.same ? 'same' : 'diff'); }
        if (slider) { finish(); return; }
        if (!ws) ws = new StepWorksheet(p, { steps: [steps[3]], onDone: finish, mount: reasonBox });
        ws.solve();
      },
      async wrong() {
        for (const m of list) { await measure(m, true); mark(m, m.same ? 'diff' : 'same'); }
      },
    };
  },
};


// ------------------------------------------------------------------ p7 [S] · the bow forecast, run again (3-D)

const CARD3_P: Card = { id: 'P3', name: 'P', M: P };
const CARD3_PI: Card = { id: 'Pinv3', name: 'P⁻¹', M: Pinv };
const CARD3_S: Card = {
  id: 'S3', name: 'spire numbers now', M: S_now,
  // a turn in the ground layer while heights shrink to 0.8: never flat on the way
  at: (t) => { const th = (t * Math.PI) / 2, hh = 1 + (S_now[2][2] - 1) * t; return [[Math.cos(th), -Math.sin(th), 0], [Math.sin(th), Math.cos(th), 0], [0, 0, hh]]; },
};

export const p7: PuzzleDef = {
  id: 'c17-p7',
  title: 'Does the translated forecast land where the bow went?',
  goal: 'The spire bench forecast the bow at $(0, 1, 0)$ and missed. Put the three 3-D cards on the rail, **Forecast**, then watch the recorded pulse.',
  hints: [
    'Same rail as before, now with all three spires: into the Anchor’s grid, the spire numbers now, back to ours.',
    'Right to left: $P^{-1}$, then the spire numbers, then $P$.',
    'The forecast is $PS P^{-1}(1, 0, 0) = (1, 1, 0)$.',
  ],
  view: '3d',
  par: 4,
  style: 'mastery',
  onWin: S.p7Win,
  setup(p) {
    void p.g.stage.view3D({ target: [0.4, 0.5, 0.35], distance: 7.2, azimuth: -72, elevation: 34, ms: 0 });
    p.grid({ ...SHIP_GRID, fade: 6 });
    const copper = new CopperGrid(p.g.stage, { M: P2, half: 3.2, n: 8 });
    p.add(copper);
    const arms = [col(P, 0), col(P, 1), col(P, 2)].map((v, j) => new Arrow([0, 0, 0], v3(v, v[2]) as V3, { color: [C.v, C.w, C.u][j], width: 0.04, label: `$\\mathbf b_${j + 1}$` }));
    arms.forEach((a, j) => a.set([0, 0, 0], col(P, j) as V3));
    p.add(...arms);
    const bow = new Dot(BOW3 as V3, { color: C.white, size: 0.09 });
    const bt = tag('bow', BOW3 as V3, 'w', [0, 24]);
    const old = new Dot(BOW3_SPIRE as V3, { color: '#8a96ad', size: 0.08 });
    const ot = tag('spire forecast', BOW3_SPIRE as V3, 'dim', [0, -24]);
    const fc = new Dot([0, 0, 0], { color: C.result, size: 0.12 });
    const ft = tag('forecast', [0, 0, 0], 'y', [0, -24]);
    p.add(bow, bt.object, old, ot.object, fc, ft.object);
    p.onDispose(() => { bt.dispose(); ot.dispose(); ft.dispose(); });
    fc.setOpacity(0); ft.show(false);
    const gap = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 0]], { color: C.orange, width: 2, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    gap.object.visible = false;
    p.add(gap.object);
    p.onDispose(() => gap.dispose());
    const rail = new Rail({ slots: SLOTS, palette: [CARD3_P, CARD3_PI, CARD3_S] });
    const msg = h('div', { class: 'c17-msg' }, 'Forecast places a yellow marker. Then the recorded pulse plays.');
    let busy = false, won = false;
    const forecast = async (fast = false) => {
      if (busy || won) return;
      if (!rail.full) { sfx.miss(); msg.textContent = 'Fill all three slots first.'; return; }
      busy = true;
      p.move();
      const M = rail.product()!;
      const f = matVec(M, BOW3);
      fc.at(f as V3); fc.setOpacity(1); ft.at(f as V3); ft.show(true); ft.set(`forecast ${fmtV(f)}`);
      sfx.snap();
      bow.at(BOW3 as V3); bt.at(BOW3 as V3); gap.object.visible = false;
      if (fast) { bow.at(BOW3_REAL as V3); bt.at(BOW3_REAL as V3); }
      else {
        await wait(p.g.headless ? 10 : 500);
        // the recorded pulse, played honestly: P · (turn, heights × 0.8) · P⁻¹
        await animate(p.g.headless ? 20 : 2000, (t) => { const q = matVec(T3partial(t), BOW3); bow.at(q as V3); bt.at(q as V3); }, ease.inOut);
      }
      busy = false;
      if (p7Won(rail.cards.map((c) => c!.M))) {
        won = true; sfx.success();
        msg.className = 'c17-msg good'; msg.textContent = `The bow landed on the forecast: ${fmtV(BOW3_REAL)}.`;
        p.win(); return;
      }
      sfx.miss();
      gap.setPoints([f as V3, BOW3_REAL as V3]); gap.object.visible = true;
      msg.className = 'c17-msg bad'; msg.textContent = `Forecast ${fmtV(f)}. The bow landed at ${fmtV(BOW3_REAL)}.`;
    };
    p.dock().append(rail.el, h('div', { class: 'c17-btns' }, button('Forecast', () => void forecast(), { cls: 'primary small' })), msg);
    const right = [CARD3_PI, CARD3_S, CARD3_P];
    return {
      async showMe() { rail.set(right); await wait(300); await forecast(); },
      async solve() { rail.set(right); await forecast(true); },
      async wrong() { rail.set([CARD3_S]); rail.set([CARD3_S, CARD3_P, CARD3_PI]); await forecast(true); },
    };
  },
};
