// The plane chart for "a matrix moves the grid": the faint original grid, the moved grid, the two columns of
// A (where [1;0] and [0;1] land: green and red), and a vector drawn as its steps along them, tip to tail.
// When the grid moves, everything drawn on it moves with it, so the player sees that v = x₁e₁ + x₂e₂ lands
// on x₁a₁ + x₂a₂. Moves that are not matrices (a slide, a bend) are drawn the same way, on a bent grid.
// Pixel sizes stay constant while the camera zooms; the picture is framed in the space right of the dock.
import './plane.css';
import type { PuzzleCtx } from '../game/types';
import type { Grid2D } from '../gfx/grid';
import { Arrow } from '../gfx/arrow';
import { FatLine, FatSegments } from '../gfx/lines';
import { Label } from '../gfx/label';
import { Dot, Pad } from '../gfx/markers';
import { C } from '../core/theme';
import { animate, ease } from '../core/tween';
import { identity, interpMat2, matVec, type Mat, type Vec } from '../math/la';

type V3 = [number, number, number];
/** A move of the plane: a matrix, or any map (for moves that are not matrices). */
export type Move = Mat | ((q: Vec) => Vec);
/** A dot on the grid and a way to change its label. */
export interface Rider { dot: Dot; label(s: string): void }
const isMat = (m: Move): m is Mat => Array.isArray(m);
const I2 = identity(2);
const v3 = (v: Vec, z = 0): V3 => [v[0], v[1], z];
const Z = { bent: 0.004, path: 0.012, arrow: 0.03, dot: 0.05 };
const REF_PPU = 60;
/** The moved grid: quiet, so the arrows on it read first. */
const LOOK = { main: 0.36, axis: 0.55 };

export class Plane {
  readonly grid: Grid2D;
  /** The move on screen now (as a map), and its matrix when it is one. */
  private cur: (q: Vec) => Vec = (q) => q.slice();
  M: Mat | null = I2;
  private readonly p: PuzzleCtx;
  private readonly bent: FatSegments;
  private readonly bentAxes: FatSegments;
  private readonly cols: [Arrow, Arrow];
  private readonly vec: Arrow;
  private readonly legs: [FatLine, FatLine];
  private readonly vTag: Label;
  private vecOf: Vec | null = null;
  private vecDone = false;
  private steps = false;
  private ticks: Dot[] = [];
  private riders: { q: Vec; dot: Dot }[] = [];
  private rings: Pad[] = [];
  private tags: Label[] = [];
  private riderTags: Label[] = [];
  private gaps: FatLine[] = [];
  private ppu = REF_PPU;
  private framed: { pts: Vec[]; min: number } = { pts: [], min: 3 };

  constructor(p: PuzzleCtx) {
    this.p = p;
    const st = p.g.stage;
    this.grid = p.grid({ base: 0.32, main: LOOK.main, axis: LOOK.axis });
    this.grid.set(I2);
    // a bent grid, for moves that are not matrices (hidden otherwise)
    this.bent = new FatSegments(st, [], { color: C.grid, width: 1.3, opacity: 0.8 });
    this.bentAxes = new FatSegments(st, [], { color: C.axis, width: 2, opacity: 0.9 });
    this.bent.object.visible = false;
    this.bentAxes.object.visible = false;
    p.add(this.bent.object, this.bentAxes.object);
    p.onDispose(() => { this.bent.dispose(); this.bentAxes.dispose(); });
    this.cols = [
      new Arrow(v3([0, 0], Z.arrow), v3([1, 0], Z.arrow), { color: C.v, width: 0.05 }),
      new Arrow(v3([0, 0], Z.arrow), v3([0, 1], Z.arrow), { color: C.w, width: 0.05 }),
    ];
    this.vec = new Arrow(v3([0, 0], Z.arrow + 0.004), v3([1, 0], Z.arrow + 0.004), { color: C.white, width: 0.05 });
    this.vec.setOpacity(0);
    p.add(...this.cols, this.vec);
    const leg = (c: string) => { const l = new FatLine(st, [[0, 0, Z.path], [0, 0, Z.path]], { color: c, width: 3, opacity: 0, dashed: true, intensity: 1.2 }); p.add(l); return l; };
    this.legs = [leg(C.v), leg(C.w)];
    this.vTag = new Label('', [0, 0, Z.dot], { className: 'pl-tag' });
    this.vTag.show(false);
    p.add(this.vTag.object);
    p.onDispose(() => this.vTag.dispose());
    p.tick(() => this.rescale());
    const off = st.onResize(() => { if (this.framed.pts.length) void this.frame(this.framed.pts, { min: this.framed.min, ms: 0 }); });
    p.onDispose(off);
  }

  // ---------------------------------------------------------------- framing

  /** The screen above the dock, full width, below the top HUD (CSS px): the origin sits mid-screen. */
  private freeRect(): { l: number; t: number; r: number; b: number } {
    const W = this.p.g.stage.size.x, H = this.p.g.stage.size.y;
    const rect = (sel: string) => {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el || el.hidden) return null;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? r : null;
    };
    const tl = rect('.hud-tl'), tr = rect('.hud-tr'), dock = rect('.dock.tj-dock');
    const top = Math.max(tl ? tl.bottom : 0, tr ? tr.bottom : 0) + 10;
    const bottom = (dock ? dock.top : H - 60) - 10;
    return { l: 10, t: top, r: W - 10, b: Math.max(top + 160, bottom) };
  }

  /** Frame these points with the origin in the middle of the free part of the screen. */
  async frame(pts: Vec[], o: { min?: number; ms?: number } = {}): Promise<void> {
    const min = o.min ?? 3;
    this.framed = { pts: pts.map((q) => q.slice()), min };
    const st = this.p.g.stage;
    const W = st.size.x, H = st.size.y;
    // a wild typed answer must not zoom the grid away to nothing
    const use = pts.map((q) => q.map((x) => Math.max(-12, Math.min(12, x))));
    const mx = Math.max(min, ...use.map((q) => Math.abs(q[0]))), my = Math.max(min, ...use.map((q) => Math.abs(q[1])));
    const R = this.freeRect();
    const pad = 36;
    const rw = Math.max(80, R.r - R.l - 2 * pad), rh = Math.max(80, R.b - R.t - 2 * pad);
    const s = Math.min(rw / (2 * mx), rh / (2 * my));
    const rx = (R.l + R.r) / 2, ry = (R.t + R.b) / 2;
    const cx = -(rx - W / 2) / s, cy = (ry - H / 2) / s;
    this.grid.setLook({ fade: Math.max(40, (H / s) * 1.4) });
    await st.view2D({ center: [cx, cy], height: H / s, ms: o.ms ?? 400 });
  }

  /** Keep pixel sizes constant while the camera zooms. */
  private rescale(): void {
    const st = this.p.g.stage;
    const ppu = st.size.y / (2 * st.planeHalfHeight());
    if (!isFinite(ppu) || ppu <= 0 || Math.abs(ppu - this.ppu) / this.ppu < 0.004) return;
    this.ppu = ppu;
    const w = 3.1 / ppu;
    for (const a of [...this.cols, this.vec]) { a.width = w; a.set(a.from.clone(), a.to.clone()); }
    const k = REF_PPU / ppu;
    for (const d of [...this.ticks, ...this.riders.map((r) => r.dot)]) d.object.scale.setScalar(k);
    for (const r of this.rings) r.object.scale.setScalar(k);
    for (const l of [...this.legs, ...this.gaps]) { l.material.dashSize = 9 / ppu; l.material.gapSize = 6 / ppu; }
  }

  // ---------------------------------------------------------------- the move

  /** Show the plane moved by m at once (I: the plain grid). */
  show(m: Move): void {
    if (isMat(m)) {
      this.M = m.map((r) => r.slice());
      this.bent.object.visible = false; this.bentAxes.object.visible = false;
      this.grid.setLook(LOOK);
      this.setLinear(m);
    }
    else { this.M = null; this.setMap(m, 1); }
    this.redraw();
  }

  /** Animate from the plain grid to the move m. Everything on the grid rides with it. */
  async apply(m: Move, ms = 1600): Promise<void> {
    const t = this.p.g.headless ? 1 : ms;
    if (isMat(m)) {
      this.bent.object.visible = false; this.bentAxes.object.visible = false;
      this.grid.setLook(LOOK);
      await animate(t, (k) => { this.setLinear(interpMat2(I2, m, k, 'auto')); this.redraw(); }, ease.inOut);
      this.M = m.map((r) => r.slice());
      this.setLinear(m);
    } else {
      this.M = null;
      await animate(t, (k) => { this.setMap(m, k); this.redraw(); }, ease.inOut);
      this.setMap(m, 1);
    }
    this.redraw();
  }

  /** Back to the plain grid (no animation). */
  reset(): void { this.show(I2); }

  private setLinear(W: Mat): void {
    this.grid.set(W);
    this.cur = (q) => matVec(W, q);
  }

  /** A map shown part way (k from 0 to 1): every point moves in a straight line from q to f(q). */
  private setMap(f: (q: Vec) => Vec, k: number): void {
    this.grid.set(I2);
    // only the faint original grid stays; the bent grid is drawn as lines
    this.grid.setLook({ main: 0, axis: 0 });
    const g = (q: Vec): Vec => { const r = f(q); return [q[0] + (r[0] - q[0]) * k, q[1] + (r[1] - q[1]) * k]; };
    this.cur = g;
    const n = 10, step = 0.25;
    const segs: [V3, V3][] = [], axes: [V3, V3][] = [];
    for (let c = -n; c <= n; c++) {
      const out = c === 0 ? axes : segs;
      for (let s = -n; s < n; s += step) {
        out.push([v3(g([s, c]), Z.bent), v3(g([s + step, c]), Z.bent)]);
        out.push([v3(g([c, s]), Z.bent), v3(g([c, s + step]), Z.bent)]);
      }
    }
    this.bent.setSegments(segs);
    this.bentAxes.setSegments(axes);
    this.bent.object.visible = true;
    this.bentAxes.object.visible = true;
  }

  /** Where the point q (of the plain grid) is now. */
  at(q: Vec): Vec { return this.cur(q); }

  // ---------------------------------------------------------------- what rides on the grid

  /**
   * Draw v as its two steps: x₁ along [1;0] (green, a dot at each whole step), then x₂ along [0;1] (red).
   * With `done`, the arrow is yellow (the result A v), otherwise white (v).
   */
  showVector(v: Vec | null, label = ''): void {
    this.vecOf = v ? v.slice() : null;
    this.steps = false;
    this.vecDone = false;
    this.vTag.set(label);
    this.vTag.show(!!v && !!label);
    for (const d of this.ticks) d.object.removeFromParent();
    this.ticks = [];
    if (v) {
      const mk = (q: Vec, c: string) => { const d = new Dot(v3(q, Z.dot), { color: c, size: 0.045, glow: 1.2 }); d.object.scale.setScalar(REF_PPU / this.ppu); this.p.add(d); (d as Dot & { q: Vec }).q = q; return d; };
      const whole = (x: number) => Array.from({ length: Math.floor(Math.abs(x) + 1e-9) }, (_, i) => (i + 1) * Math.sign(x));
      for (const k of whole(v[0])) this.ticks.push(mk([k, 0], C.v));
      for (const k of whole(v[1])) this.ticks.push(mk([v[0], k], C.w));
    }
    this.vec.setColor(C.white);
    this.vTag.el.classList.remove('y');
    this.redraw();
  }

  /** The vector arrow turns yellow and takes a new label (it has landed: A v). */
  markResult(label = ''): void {
    this.vecDone = true;
    this.vec.setColor(C.result);
    this.vTag.el.classList.add('y');
    this.vTag.set(label);
    this.vTag.show(!!label);
    this.redraw();
  }

  /** A small label on a chart object, `dy` px below it (negative: above). Colour class: '' (white), 'b' (blue), 'y'. */
  private tag(obj: { add(o: Label['object']): unknown }, text: string, dy: number, cls: string, list: Label[]): Label {
    const t = new Label(text, [0, 0, 0], { className: `pl-tag ${cls}`, offset: [0, dy] });
    obj.add(t.object);
    t.show(!!text);
    this.p.onDispose(() => t.dispose());
    list.push(t);
    return t;
  }

  /** A dot that rides on the grid (a point the question is about), with a label above it that can change. */
  rider(q: Vec, color: string = C.white, label = '', cls = ''): Rider {
    const d = new Dot(v3(q, Z.dot), { color, size: 0.06, glow: 1.4 });
    d.object.scale.setScalar(REF_PPU / this.ppu);
    this.p.add(d);
    const t = this.tag(d.object, label, -40, cls, this.riderTags);
    this.riders.push({ q: q.slice(), dot: d });
    this.redraw();
    return { dot: d, label: (s: string) => { t.set(s); t.show(!!s); } };
  }

  /** A ring at a fixed place on the screen (a target, or the player's answer), with a label below it. */
  ring(at: Vec, color: string = C.white, label = '', cls = ''): Pad {
    const r = new Pad(this.p.g.stage, v3(at, Z.dot), { color, radius: 0.3 });
    r.object.scale.setScalar(REF_PPU / this.ppu);
    if (label) this.tag(r.object, label, 48, cls, this.tags);
    this.p.add(r);
    this.rings.push(r);
    return r;
  }

  /** A dashed orange line between where something landed and where it should be. */
  gap(a: Vec, b: Vec): void {
    const l = new FatLine(this.p.g.stage, [v3(a, Z.path), v3(b, Z.path)], { color: C.orange, width: 2, opacity: 0.9, dashed: true });
    l.material.dashSize = 9 / this.ppu; l.material.gapSize = 6 / this.ppu;
    this.p.add(l);
    this.gaps.push(l);
  }

  /** Remove rings and gaps. */
  clearMarks(): void {
    for (const t of this.tags) t.dispose();
    for (const r of this.rings) r.object.removeFromParent();
    this.tags = [];
    for (const g of this.gaps) { g.object.removeFromParent(); g.dispose(); }
    this.rings = []; this.gaps = [];
  }

  /** Remove the vector, riders, rings and gaps; the grid back to plain. */
  clear(): void {
    this.showVector(null);
    this.vec.setOpacity(0);
    for (const r of this.riders) r.dot.object.removeFromParent();
    for (const t of this.riderTags) t.dispose();
    this.riders = []; this.riderTags = [];
    this.clearMarks();
    this.bent.object.visible = false; this.bentAxes.object.visible = false;
    this.grid.setLook(LOOK);
    this.show(I2);
  }

  /** v's steps on or off: x₁ steps along the first column (green), then x₂ along the second (red). */
  showSteps(on: boolean): void { this.steps = on; this.redraw(); }

  /** Column arrows on or off (off while a question would be answered by reading them). */
  showColumns(on: boolean): void { this.cols.forEach((a) => a.setOpacity(on ? 1 : 0)); }

  private redraw(): void {
    const o = this.cur([0, 0]);
    this.cols[0].set(v3(o, Z.arrow), v3(this.cur([1, 0]), Z.arrow));
    this.cols[1].set(v3(o, Z.arrow), v3(this.cur([0, 1]), Z.arrow));
    const v = this.vecOf;
    if (v) {
      const mid = this.cur([v[0], 0]), end = this.cur(v);
      this.legs[0].setPoints(this.polyline([0, 0], [v[0], 0]));
      this.legs[1].setPoints(this.polyline([v[0], 0], v));
      this.legs[0].setOpacity(this.steps && Math.abs(v[0]) > 1e-9 ? 0.95 : 0);
      this.legs[1].setOpacity(this.steps && Math.abs(v[1]) > 1e-9 ? 0.95 : 0);
      this.vec.set(v3(o, Z.arrow + 0.004), v3(end, Z.arrow + 0.004));
      this.vec.setOpacity(Math.hypot(end[0] - o[0], end[1] - o[1]) > 1e-6 ? 1 : 0);
      // the label sits just past the tip, along the arrow, so it never covers the lines
      const dx = end[0] - o[0], dy = end[1] - o[1], len = Math.hypot(dx, dy);
      const [ux, uy] = len > 1e-6 ? [dx / len, dy / len] : [mid[0] - o[0] > 0 ? 1 : 0, 1];
      this.vTag.at(v3(end, Z.dot));
      this.vTag.el.style.translate = `${Math.round(ux * 22)}px ${Math.round(-uy * 18)}px`;
      for (const d of this.ticks) { d.at(v3(this.cur((d as Dot & { q: Vec }).q), Z.dot)); d.object.visible = this.steps; }
    } else {
      this.legs.forEach((l) => l.setOpacity(0));
      this.vec.setOpacity(0);
      this.vTag.show(false);
    }
    void this.vecDone;
    for (const r of this.riders) r.dot.at(v3(this.cur(r.q), Z.dot));
  }

  /** A straight piece of the plain grid, as it is drawn now (bent by a map, straight under a matrix). */
  private polyline(a: Vec, b: Vec): V3[] {
    const n = this.M ? 1 : 16;
    return Array.from({ length: n + 1 }, (_, i) => v3(this.cur([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]), Z.path));
  }
}
