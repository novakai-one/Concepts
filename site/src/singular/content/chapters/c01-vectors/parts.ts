// Chapter 1: small helpers the kit does not have (kept here so the shared kit stays untouched).
// - VecNField: a stacked vector box with any number of parts (3-D rounds).
// - tipToTail / stretch: the kit's moves without labels or the dashed line, so the chart is never an answer key.
// - extras: dashed lines the chart's clear() does not know about (circles, legs from a point), cleared per round.
// - dock: the kit's dock, lifted above the phone "Solved" card so the last message stays readable.
// - card pictures: a quiet grid behind the cards, and the player's own picture behind each name card.
import type { Object3D } from 'three';
import type { Game, PuzzleCtx } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { Dot } from '../../../gfx/markers';
import { Grid2D } from '../../../gfx/grid';
import { C } from '../../../core/theme';
import { animSpeed, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { h } from '../../../ui/ui';
import { COLORS, NumCell, isZero, cleanV, plainDock, type Kind, type PlainDock, type PlaneView, type Vec } from '../../../kit/plain';
import './c01.css';

/** The test solver runs at a high animation speed: then draw at once (every await costs a frame). */
export const fast = (): boolean => animSpeed() >= 100;
/** A pause the player can read in; none for the solver. */
export const hold = (ms: number): Promise<void> => (fast() ? Promise.resolve() : wait(ms));

/** The kit's dock, marked as this chapter's: on phones c01.css lifts it above the "Solved" card. */
export function dock(p: PuzzleCtx): PlainDock {
  const d = plainDock(p);
  p.dock().classList.add('c01-dock');
  return d;
}

// ------------------------------------------------------------------ a vector box with n parts

export class VecNField {
  readonly el: HTMLElement;
  readonly cells: NumCell[];
  constructor(n: number, o: { onEnter?: () => void } = {}) {
    this.cells = Array.from({ length: n }, (_, i) => new NumCell({ aria: `part ${i + 1} of the answer`, onEnter: o.onEnter, cls: 'c0', comma: false }));
    this.el = h('span', { class: 'tj-vec' }, h('span', { class: 'tj-col' }, ...this.cells.map((c) => c.el)));
  }
  get(): Vec | null {
    const xs = this.cells.map((c) => c.value());
    return xs.some((x) => x === null) ? null : (xs as number[]);
  }
  set(v: Vec): void { v.forEach((x, i) => this.cells[i].set(x)); }
  enable(on: boolean): void { for (const c of this.cells) c.enable(on); }
  focus(): void { this.cells[0].focus(); }
}

// ------------------------------------------------------------------ extra lines on the chart

const EXTRA = new WeakMap<PlaneView, { dispose(): void }[]>();
function keep<T extends { dispose(): void; object: Object3D }>(view: PlaneView, o: T): T {
  const list = EXTRA.get(view) ?? [];
  EXTRA.set(view, list);
  view.p.add(o.object);
  list.push(o);
  return o;
}
/** Remove the circles and legs drawn by this file. */
export function clearExtras(view: PlaneView): void {
  for (const o of EXTRA.get(view) ?? []) o.dispose();
  EXTRA.set(view, []);
}

const dashed = (view: PlaneView, pts: Vec[], color: string, opacity = 0.9): FatLine =>
  keep(view, new FatLine(view.p.g.stage, pts.map((q) => [q[0], q[1], 0.014] as [number, number, number]), {
    color, width: 2, opacity, intensity: 1.3, dashed: true, dashSize: 9 / view.ppu, gapSize: 7 / view.ppu,
  }));

/** A dashed circle of radius r around `at`: every point at that distance. */
export function circle(view: PlaneView, at: Vec, r: number): void {
  if (!(r > 0)) return;
  const pts: Vec[] = Array.from({ length: 121 }, (_, i) => { const t = (i / 120) * Math.PI * 2; return [at[0] + r * Math.cos(t), at[1] + r * Math.sin(t)]; });
  dashed(view, pts, '#e8f1ff', 0.55);
}

/** The two legs under v, starting at `from`: across, then up, each with its length. */
export function legsAt(view: PlaneView, from: Vec, v: Vec): void {
  const a: Vec = [from[0] + v[0], from[1]], b: Vec = [from[0] + v[0], from[1] + v[1]];
  if (Math.abs(v[0]) > 1e-9) { dashed(view, [from, a], '#fff4e6'); view.note([from[0] + v[0] / 2, from[1]], String(Math.abs(v[0])), { cls: 'g-label pk-leg', dy: v[1] >= 0 ? 14 : -14 }); }
  if (Math.abs(v[1]) > 1e-9) { dashed(view, [a, b], '#fff4e6'); view.note([a[0], from[1] + v[1] / 2], String(Math.abs(v[1])), { cls: 'g-label pk-leg', dx: v[0] >= 0 ? 16 : -16 }); }
}

// ------------------------------------------------------------------ moves without labels

/** Draw the vectors tip to tail from `from`, then their sum from `from` in yellow. Returns the sum. */
export async function tipToTail(view: PlaneView, vs: Vec[], o: { kinds?: Kind[]; labels?: string[]; from?: Vec; sum?: boolean; ms?: number } = {}): Promise<Vec> {
  view.clear();
  const from = o.from ?? [0, 0];
  const kinds = o.kinds ?? ['g', 'b', 'w'];
  let at = from.slice();
  for (let i = 0; i < vs.length; i++) {
    const a = view.arrow(`c01-${i}`, kinds[i] ?? 'w');
    a.label(o.labels?.[i] ?? '');
    if (fast()) a.set(vs[i], at); else await a.grow(vs[i], { from: at, ms: o.ms ?? 480 });
    at = [at[0] + vs[i][0], at[1] + vs[i][1]];
    await hold(110);
  }
  const s = cleanV([at[0] - from[0], at[1] - from[1]]);
  if (o.sum !== false && !isZero(s)) { const S = view.arrow('c01-sum', 'y'); if (fast()) S.set(s, from); else await S.grow(s, { from, ms: o.ms ?? 480 }); }
  sfx.snap();
  return s;
}

/** The other order too: v from the start, then u from its tip, a little fainter. Together a parallelogram. */
export async function otherOrder(view: PlaneView, u: Vec, v: Vec, kinds: [Kind, Kind] = ['g', 'b']): Promise<void> {
  const B2 = view.arrow('c01-o2', kinds[1]), A2 = view.arrow('c01-o1', kinds[0]);
  if (fast()) { B2.set(v, [0, 0]); A2.set(u, v); } else { await B2.grow(v, { from: [0, 0], ms: 480 }); B2.arrow.setOpacity(0.55); await A2.grow(u, { from: v, ms: 480 }); }
  B2.arrow.setOpacity(0.55);
  A2.arrow.setOpacity(0.55);
  sfx.snap();
}

/** v in green, then c·v in yellow stretching along it (ticks at whole multiples). No dashed line. */
export async function stretch(view: PlaneView, c: number, v: Vec): Promise<Vec> {
  view.clear();
  const V = view.arrow('c01-v', 'g'), R = view.arrow('c01-cv', 'y');
  V.set(v, [0, 0]);
  if (fast()) R.set(cleanV(v.map((x) => c * x)), [0, 0]);
  else { R.set(v, [0, 0]); await wait(120); await R.scaleTo(c); }
  view.ruler(v, c);
  sfx.snap();
  return cleanV(v.map((x) => c * x));
}

// ------------------------------------------------------------------ pictures behind the cards

type V3 = [number, number, number];
const v3 = (v: Vec): V3 => [v[0], v[1], 0.02];

/** A grid framed on these points, left of the name card on a wide screen. Returns pixels per unit. */
async function chart(g: Game, pts: Vec[], o: { card?: boolean } = {}): Promise<{ ppu: number; add(...x: Object3D[]): void }> {
  g.stage.clearWorld();
  const W = g.stage.size.x, H = g.stage.size.y;
  const use = [[0, 0], ...pts];
  let x0 = Math.min(...use.map((q) => q[0])), x1 = Math.max(...use.map((q) => q[0]));
  let y0 = Math.min(...use.map((q) => q[1])), y1 = Math.max(...use.map((q) => q[1]));
  const grow = (a: number, b: number): [number, number] => { const c = (a + b) / 2, w = Math.max(b - a, 4); return [c - w / 2, c + w / 2]; };
  [x0, x1] = grow(x0, x1); [y0, y1] = grow(y0, y1);
  const wide = W >= 900 && o.card !== false;
  const R = wide ? { l: 40, t: 90, r: W - 620, b: H - 90 } : { l: 20, t: 90, r: W - 20, b: H - 90 };
  const pad = 60;
  const s = Math.min((R.r - R.l - 2 * pad) / (x1 - x0), (R.b - R.t - 2 * pad) / (y1 - y0));
  const cx = (x0 + x1) / 2 - ((R.l + R.r) / 2 - W / 2) / s, cy = (y0 + y1) / 2 + ((R.t + R.b) / 2 - H / 2) / s;
  await g.stage.view2D({ center: [cx, cy], height: H / s, ms: 0 });
  const grid = new Grid2D(g.stage, { main: 0.3, base: 0, axis: 0.5, fade: Math.max(40, (H / s) * 1.4) });
  grid.mesh.userData.dispose = () => grid.dispose();
  g.stage.world.add(grid.object);
  // straight into the world, so clearWorld() also removes the labels' elements
  return { ppu: s, add: (...x) => { g.stage.world.add(...x); } };
}

function arrow(ppu: number, from: Vec, v: Vec, kind: Kind, opacity = 1): Object3D {
  return new Arrow(v3(from), v3([from[0] + v[0], from[1] + v[1]]), { color: COLORS[kind], width: 3.1 / ppu, opacity }).object;
}
function line(g: Game, ppu: number, pts: Vec[], color: string, opacity = 0.8): Object3D {
  const l = new FatLine(g.stage, pts.map(v3), { color, width: 2, opacity, dashed: true, dashSize: 9 / ppu, gapSize: 7 / ppu });
  l.object.userData.dispose = () => l.dispose();
  return l.object;
}
function leg(at: Vec, text: string, dx: number, dy: number): Object3D {
  const t = new Label(text, v3(at), { className: 'g-label pk-leg' });
  t.el.style.translate = `${dx}px ${dy}px`;
  return t.object;
}

/** A quiet grid behind a centred card. */
export async function gridShot(g: Game): Promise<void> {
  await chart(g, [[4, 3], [-4, -3]], { card: false });
}

/** Behind "vector": u, v tip to tail, both orders, and u + v. */
export function addShot(u: Vec, v: Vec): (g: Game) => Promise<void> {
  return async (g) => {
    const s: Vec = [u[0] + v[0], u[1] + v[1]];
    const c = await chart(g, [u, v, s]);
    c.add(arrow(c.ppu, [0, 0], u, 'g'), arrow(c.ppu, u, v, 'b'), arrow(c.ppu, [0, 0], v, 'b', 0.55), arrow(c.ppu, v, u, 'g', 0.55), arrow(c.ppu, [0, 0], s, 'y'));
  };
}

/** Behind "scalar multiple": the line through v, v, the multiples found, and the point off the line. */
export function lineShot(v: Vec, found: Vec[], off: Vec): (g: Game) => Promise<void> {
  return async (g) => {
    const c = await chart(g, [...found, off]);
    const L = 40, n = Math.hypot(v[0], v[1]), d: Vec = [v[0] / n * L, v[1] / n * L];
    c.add(line(g, c.ppu, [[-d[0], -d[1]], d], C.v, 0.5));
    for (const f of found) c.add(arrow(c.ppu, [0, 0], f, 'y', 0.8));
    c.add(arrow(c.ppu, [0, 0], v, 'g'));
    for (const f of found) { const dot = new Dot(v3(f), { color: C.result, size: 4.5 / c.ppu }); c.add(dot.object); }
    const o = new Dot(v3(off), { color: '#ffb347', size: 4.5 / c.ppu });
    c.add(o.object);
  };
}

/** Behind "length": v and the right triangle under it. */
export function triangleShot(v: Vec): (g: Game) => Promise<void> {
  return async (g) => {
    const c = await chart(g, [v, [v[0], 0]]);
    c.add(line(g, c.ppu, [[0, 0], [v[0], 0], v], '#fff4e6', 0.9));
    c.add(arrow(c.ppu, [0, 0], v, 'g'));
    c.add(leg([v[0] / 2, 0], String(Math.abs(v[0])), 0, v[1] >= 0 ? 14 : -14), leg([v[0], v[1] / 2], String(Math.abs(v[1])), v[0] >= 0 ? 22 : -22, 0));
  };
}
