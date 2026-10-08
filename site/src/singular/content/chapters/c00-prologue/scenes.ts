// Prologue: the two short cinematics and the picture behind the name card and the close.
//   call  the ark; nine numbers fill in column by column as a bracketed matrix; the move passes and the
//         whole ship leans; the game title.
//   grid  a grid grows from the origin; one line.
import { Group, Matrix4 } from 'three';
import type { Game } from '../../../game/types';
import { Grid2D } from '../../../gfx/grid';
import { Dot, glowSprite } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, NumberBoard, stamp, titleCard } from '../../../kit/cine';
import { loadModel } from '../../../gfx/models';
import type { Mat } from '../../../math/la';
import { Tpartial } from '../../truth';
import { GAME_TITLE } from '../../meta';
import { inputs, mv, STEPS } from './logic';
import { S } from './script';
import './c00.css';

/** The move in 3-D at angle θ (z untouched): P R(θ) P⁻¹. */
const lean3 = (theta: number): Matrix4 => {
  const M = Tpartial(theta);
  return new Matrix4().set(M[0][0], M[0][1], 0, 0, M[1][0], M[1][1], 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
};

/** The origin: a soft glow (as on every chart). */
function originGlow(size = 0.3): Group {
  const o = new Group();
  o.add(glowSprite(C.accent, 2.4, 0.35), glowSprite('#bfe9ff', 0.9, 0.9));
  o.scale.setScalar(size);
  o.position.set(0, 0, 0.05);
  return o;
}

// ------------------------------------------------------------------ call

export async function coldOpen(g: Game): Promise<void> {
  // the holder doubles as this run's marker: a teardown clears the world and takes it with it
  const holder = new Group();
  holder.matrixAutoUpdate = false;
  g.stage.world.add(holder);
  const alive = () => holder.parent === g.stage.world;
  await fadeBlack(g, true, 10);
  if (!alive()) return;
  g.mood('void');
  void stamp(g, 'Three years ago', 3600);
  const ark = await loadModel('meridian');
  if (!alive()) return;
  if (ark) { ark.rotation.x = Math.PI / 2; holder.add(ark); }
  void g.stage.view3D({ target: [0, 0, 0], distance: 85, azimuth: -120, elevation: 16, orbit: false, ms: 0 });
  await fadeBlack(g, false, 1800);
  if (!alive()) return;
  const board = new NumberBoard(g, 3, 3);
  board.el.classList.add('corner', 'c00-mat');
  const talk = g.say(S.call);
  // R by columns: cells in reading order are row-major
  const cells = ['0', '−1', '0', '1', '0', '0', '0', '0', '1'];
  const byColumn = [0, 3, 6, 1, 4, 7, 2, 5, 8];
  for (let k = 0; k < 9; k++) {
    await wait(k % 3 === 0 ? 650 : 380);
    if (!alive()) return;
    board.set(byColumn[k], cells[byColumn[k]]);
    sfx.tick(k % 3);
  }
  await wait(700);
  if (!alive()) return;
  // the move passes: every part of the ship leans the same way at once
  void g.stage.shockwave([0, 0, 0], 2400, 0.8);
  sfx.whoosh(2.4);
  await animate(2600, (k) => { holder.matrix.copy(lean3((k * Math.PI) / 2)); holder.matrixWorldNeedsUpdate = true; }, ease.inOut);
  if (!alive()) return;
  await talk;
  if (!alive()) return;
  await board.hide();
  if (!alive()) return;
  await fadeBlack(g, true, 900);
  if (!alive()) return;
  holder.removeFromParent();
  await titleCard(g, '', GAME_TITLE, 2600);
}

// ------------------------------------------------------------------ grid

export async function gridOpen(g: Game): Promise<void> {
  g.stage.clearWorld();
  g.mood('explore');
  await g.stage.view2D({ center: [0, 0], height: 10, ms: 0 });
  const grid = new Grid2D(g.stage, { main: 0.34, base: 0, axis: 0, fade: 0.01 });
  grid.mesh.userData.dispose = () => grid.dispose();
  g.stage.world.add(grid.object);
  const alive = () => grid.mesh.parent === g.stage.world;
  const origin = originGlow(0);
  g.stage.world.add(origin);
  await fadeBlack(g, false, 700);
  if (!alive()) return;
  void titleCard(g, 'Prologue', 'Where did everything go?', 2400);
  sfx.warp();
  // the grid grows out from the origin, then the axes, then the origin itself
  await animate(1800, (k) => grid.setLook({ fade: 0.01 + 40 * k * k }), ease.out);
  if (!alive()) return;
  await grid.fadeTo({ axis: 0.55 }, 500);
  if (!alive()) return;
  await animate(500, (k) => origin.scale.setScalar(0.3 * k), ease.out);
  if (!alive()) return;
  sfx.discover();
  await g.say(S.grid);
}

// ------------------------------------------------------------------ the picture behind the name card and the close

/**
 * The first puzzle's three rows, moved by A again: the grid from I to A, each green point to its yellow
 * landing spot. `right`: room to leave on the right for a card (px, desktop only).
 */
export async function rowsVisual(g: Game, o: { right?: number } = {}): Promise<void> {
  g.stage.clearWorld();
  const W = g.stage.size.x, H = g.stage.size.y;
  const height = 11;
  const ppu = H / height;
  // the content's box: x from −5 to 4, y from −1 to 4; centred in the part of the screen the card leaves free
  const free = W >= 900 && o.right ? W - o.right : W;
  const cx = -0.5 + (W / 2 - free / 2) / ppu;
  await g.stage.view2D({ center: [cx, 1.5], height, ms: 0 });
  const grid = new Grid2D(g.stage, { main: 0.34, base: 0.12, axis: 0.55 });
  grid.mesh.userData.dispose = () => grid.dispose();
  const set0 = grid.set.bind(grid);
  grid.set = (M: Mat, T?: [number, number]) => { set0(M, T); grid.mesh.children.forEach((c) => { c.visible = false; }); };
  g.stage.world.add(grid.object, originGlow(26 / ppu));
  const alive = () => grid.mesh.parent === g.stage.world;
  const rows = STEPS.map((s) => [...inputs(s.q), [s.q.row.b[0] + s.q.ask * s.q.row.s[0], s.q.row.b[1] + s.q.ask * s.q.row.s[1]]]);
  const dots = rows.flat().map((p) => { const d = new Dot([p[0], p[1], 0.06], { color: C.v, size: 0.075, glow: 1.3 }); d.object.scale.setScalar(60 / ppu); g.stage.world.add(d.object); return { p, d }; });
  const lines = rows.map((r) => {
    const l = new FatLine(g.stage, [[0, 0, 0.008], [1, 0, 0.008]], { color: C.result, width: 1.4, opacity: 0.4, intensity: 1.1 });
    l.object.userData.dispose = () => l.dispose();
    g.stage.world.add(l.object);
    return { r, l };
  });
  const draw = (M: Mat) => {
    grid.set(M);
    for (const { p, d } of dots) { const q = mv(M, p); d.at([q[0], q[1], 0.06]); }
    for (const { r, l } of lines) {
      const a = mv(M, r[0]), b = mv(M, r[r.length - 1]);
      const u = [b[0] - a[0], b[1] - a[1]], n = Math.hypot(u[0], u[1]) || 1;
      l.setPoints([[a[0] - (u[0] / n) * 60, a[1] - (u[1] / n) * 60, 0.008], [a[0] + (u[0] / n) * 60, a[1] + (u[1] / n) * 60, 0.008]]);
    }
  };
  draw(Tpartial(0));
  void (async () => {
    await wait(g.headless ? 1 : 500);
    if (!alive()) return;
    await animate(g.headless ? 1 : 2400, (k) => { if (alive()) draw(Tpartial((k * Math.PI) / 2)); }, ease.inOut);
    if (!alive()) return;
    draw(Tpartial(Math.PI / 2));
    for (const { d } of dots) d.setColor(C.result);
  })();
}
