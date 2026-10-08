// Chapter 18, the trajectory problem (docs/singular/ch18-trajectory-spec.md): the scene and the dock widgets
// shared by Scenes 1–6. The ship launches from the Anchor along the player's vector; each navigation pulse
// moves every point by the matrix at once (the grid deforms and the ship is carried with it, in a straight
// line from v to A v). Green is the launch vector, yellow the transformed one, copper a kept line,
// orange off course, violet a collapse onto the Anchor.
import './traj.css';
import { Group } from 'three';
import type { PuzzleCtx } from '../../../game/types';
import type { Grid2D } from '../../../gfx/grid';
import { Arrow } from '../../../gfx/arrow';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { Dot, Pad, glowSprite } from '../../../gfx/markers';
import { Ship } from '../../../gfx/models';
import { burst, shockwave } from '../../../gfx/fx';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { h, button, inline } from '../../../ui/ui';
import { identity, matVec, mlerp, type Mat, type Vec } from '../../../math/la';
import { cleanV, isZero, lineAngle, onLineOf, outcomeOf, parseEntry, signedDeg, type Attempt, type Outcome } from './traj-logic';
import { fdeg, fv, tn, tv, tpow } from './traj-text';
import { S, save } from '../../../core/save';
import { fmtN, texM } from './logic';

export const COPPER = '#c9844f';
const Z = { line: 0.01, trail: 0.02, arrow: 0.03, dot: 0.05, ship: 0.15 };
const I2 = identity(2);
const L = 400; // half-length of a line through the Anchor (reads as infinite)
const v3 = (v: Vec, z = 0): [number, number, number] => [v[0], v[1], z];
const len = (v: Vec) => Math.hypot(v[0], v[1]);
const unit = (v: Vec): Vec => { const n = len(v); return n < 1e-12 ? [1, 0] : [v[0] / n, v[1] / n]; };

export { fv, tn, tv };

interface LockLine { dir: Vec; m: number | null; core: FatLine; glow: FatLine; tag: Label; at?: Vec }

export interface FrameOpts {
  /** Smallest half-extent shown around the content, in world units. */
  min?: number;
  /** Points farther than this from the Anchor are left out of the framing. */
  cap?: number;
  ms?: number;
}

/**
 * The trajectory scene. Owns the grid look, the Anchor, the ship, the launch line, both arrows, the
 * off-course arc, ruler marks, copper kept lines, waypoints and flight dots. Sizes follow the zoom, so the
 * picture reads the same on a phone and a desktop.
 */
/** Optional per-game labels; anything left out keeps the shared default. */
export interface TrajLabels {
  /** A label at the origin (none by default). */
  anchor?: string;
  offCourse?: string;
  turnAngle?: (deg: number) => string;
  vec?: (v: Vec) => string;
  /** The matrix's name in the chart labels (A v, B v). */
  name?: string;
  /** Show λ on the found lines (off before the name card). */
  lockTags?: boolean;
}

export class TrajView {
  M: Mat;
  private readonly labels: TrajLabels;
  readonly grid: Grid2D;
  ppu = 60;
  /** Where the ship is, relative to the Anchor. */
  pos: Vec = [0, 0];
  /** The current launch vector (null before the first launch). */
  launchV: Vec | null = null;
  private readonly p: PuzzleCtx;
  private readonly ship: Ship;
  private readonly anchor = new Group();
  private readonly routeCore: FatLine;
  private readonly routeGlow: FatLine;
  private readonly spark: FatLine;
  private readonly green: Arrow;
  private readonly yellow: Arrow;
  private readonly trail: FatLine;
  private readonly prev: FatLine;
  private readonly newDir: FatLine;
  private readonly arc: FatLine;
  private readonly miss: FatLine;
  private readonly gTag: Label;
  private readonly yTag: Label;
  private readonly arcTag: Label;
  private readonly note: Label;
  private readonly ghostPad: Pad;
  private readonly ghostTag: Label;
  private ticks: FatLine[] = [];
  private dots: Dot[] = [];
  private locks: LockLine[] = [];
  private pads: { pad: Pad; at: Vec }[] = [];
  private framed: { pts: Vec[]; o: FrameOpts } = { pts: [], o: {} };
  private arcFrom: Vec | null = null;
  private arcTo: Vec | null = null;
  private half = 6;
  private pxPerUnit = 60;
  private view: { c: [number, number]; h: number } | null = null;
  private box = { x0: -6, x1: 6, y0: -6, y1: 6, m: 0.5 };

  constructor(p: PuzzleCtx, M: Mat, labels: TrajLabels = {}) {
    this.p = p;
    this.M = M;
    this.labels = labels;
    const st = p.g.stage;
    this.grid = p.grid({ main: 0.34, base: 0, axis: 0.55 });
    // Grid2D draws a violet landing line when a pulse flattens space; the ship and the effects show that here
    const set0 = this.grid.set.bind(this.grid);
    this.grid.set = (A: Mat, T?: [number, number]) => { set0(A, T); this.grid.mesh.children.forEach((c) => { c.visible = false; }); };
    this.grid.set(I2);

    // the Anchor: the point no pulse moves
    const core = glowSprite('#bfe9ff', 0.9, 0.9);
    const halo = glowSprite(C.accent, 2.4, 0.35);
    this.anchor.add(halo, core);
    this.anchor.position.set(0, 0, Z.dot);
    p.add(this.anchor);
    if (labels.anchor) {
      const aTag = new Label(labels.anchor, [0, 0, Z.dot], { className: 'small tj-anchor', offset: [0, 18] });
      this.anchor.add(aTag.object);
      p.onDispose(() => aTag.dispose());
    }

    const line = (o: ConstructorParameters<typeof FatLine>[2], pts: [number, number, number][] = [[0, 0, Z.line], [0, 0, Z.line]]) => {
      const l = new FatLine(st, pts, o);
      p.add(l);
      return l;
    };
    this.prev = line({ color: '#9fb4d6', width: 1.4, opacity: 0, dashed: true });
    this.routeGlow = line({ color: C.v, width: 10, opacity: 0, intensity: 1 });
    this.routeCore = line({ color: C.v, width: 1.8, opacity: 0, intensity: 1.2, dashed: true });
    this.spark = line({ color: '#eafff2', width: 5, opacity: 0, intensity: 2.2 });
    this.newDir = line({ color: C.result, width: 1.4, opacity: 0, dashed: true });
    this.arc = line({ color: C.orange, width: 2.6, opacity: 0, intensity: 1.4 });
    this.miss = line({ color: C.orange, width: 2, opacity: 0, dashed: true });
    // the ship's track while a pulse carries it (neutral: yellow is kept for the transformed vector itself)
    this.trail = line({ color: '#d9e6ff', width: 1.6, opacity: 0, intensity: 1 });

    this.green = new Arrow([0, 0, Z.arrow], [0, 0, Z.arrow], { color: C.v, width: 0.05 });
    this.yellow = new Arrow([0, 0, Z.arrow + 0.005], [0, 0, Z.arrow + 0.005], { color: C.result, width: 0.05 });
    this.green.setOpacity(0); this.yellow.setOpacity(0);
    p.add(this.green, this.yellow);

    const tag = (kind: string) => {
      const t = new Label('', [0, 0, Z.dot], { className: `a7-tag ${kind}` });
      p.add(t.object); p.onDispose(() => t.dispose());
      t.show(false);
      return t;
    };
    this.gTag = tag('g');
    this.yTag = tag('y');
    this.arcTag = tag('o');
    this.note = tag('o tj-note');
    this.ghostTag = tag('tj-ghost');

    this.ghostPad = new Pad(st, [0, 0, Z.dot], { color: '#e8f1ff', radius: 0.32 });
    this.ghostPad.object.visible = false;
    p.add(this.ghostPad);

    this.ship = new Ship(st, { model: 'lantern', scale: 0.16 });
    this.ship.group.position.set(0, 0, Z.ship);
    this.ship.face([1, 0, 0]);
    // hidden until the first vector: a ship pointing one way at the start suggests a direction
    this.ship.group.visible = false;
    p.add(this.ship);
    void this.ship.ready.then(() => this.ship.setThrust(0.15));

    // sizes follow the zoom; the framing follows the window
    p.tick(() => this.rescale());
    const off = st.onResize(() => { if (this.framed.pts.length) void this.frame(this.framed.pts, { ...this.framed.o, ms: 0 }); });
    p.onDispose(off);
  }

  // ---------------------------------------------------------------- framing

  /** The screen rectangle not covered by the HUD and the dock (CSS px). */
  private freeRect(): { l: number; t: number; r: number; b: number } {
    const W = this.p.g.stage.size.x, H = this.p.g.stage.size.y;
    const rect = (sel: string) => {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el || el.hidden) return null;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? r : null;
    };
    const tl = rect('.hud-tl'), tr = rect('.hud-tr'), dock = rect('.dock.tj-dock');
    if (W >= 760) {
      // desktop: the picture sits right of the dock and the objective card
      const left = Math.max(dock ? dock.right : 0, tl ? tl.right : 0) + 24;
      if (W - left >= 380) return { l: left, t: (tr ? tr.bottom : 60) + 16, r: W - 24, b: H - 64 };
      return { l: 16, t: (tl ? tl.bottom : 70) + 12, r: W - 16, b: (dock ? dock.top : H - 80) - 12 };
    }
    // phone: between the objective card and the dock
    const top = Math.max(tl ? tl.bottom : 0, tr ? tr.bottom : 0) + 10;
    const bottom = (dock ? dock.top : H - 60) - 10;
    return { l: 10, t: top, r: W - 10, b: Math.max(top + 160, bottom) };
  }

  /** Frame these points (and the Anchor) in the free part of the screen. */
  async frame(pts: Vec[], o: FrameOpts = {}): Promise<void> {
    this.framed = { pts: pts.map((q) => q.slice()), o };
    this.watchDock();
    const st = this.p.g.stage;
    const W = st.size.x, H = st.size.y;
    const cap = o.cap ?? Infinity;
    const use = [[0, 0], ...pts.filter((q) => len(q) <= cap)];
    let x0 = Math.min(...use.map((q) => q[0])), x1 = Math.max(...use.map((q) => q[0]));
    let y0 = Math.min(...use.map((q) => q[1])), y1 = Math.max(...use.map((q) => q[1]));
    const min = o.min ?? 3;
    const grow = (a: number, b: number): [number, number] => { const c = (a + b) / 2, w = Math.max(b - a, 2 * min); return [c - w / 2, c + w / 2]; };
    [x0, x1] = grow(x0, x1); [y0, y1] = grow(y0, y1);
    const R0 = this.freeRect();
    // extra room at the bottom: waypoint and stop labels hang below their points
    const R = { ...R0, b: R0.b - 22 };
    const pad = 46;
    const rw = Math.max(80, R.r - R.l - 2 * pad), rh = Math.max(80, R.b - R.t - 2 * pad);
    const s = Math.min(rw / (x1 - x0), rh / (y1 - y0));
    const bx = (x0 + x1) / 2, by = (y0 + y1) / 2;
    const rx = (R.l + R.r) / 2, ry = (R.t + R.b) / 2;
    const cx = bx - (rx - W / 2) / s, cy = by + (ry - H / 2) / s;
    const height = H / s;
    this.half = Math.max(x1 - x0, y1 - y0) / 2;
    // the free rectangle in world units (labels are kept inside it)
    const wx = (sx: number) => cx + (sx - W / 2) / s, wy = (sy: number) => cy - (sy - H / 2) / s;
    this.box = { x0: wx(R.l), x1: wx(R.r), y0: wy(R.b), y1: wy(R.t), m: 56 / s };
    this.pxPerUnit = s;
    this.placeLockTags();
    this.grid.setLook({ fade: Math.max(40, height * 1.4) });
    const last = this.view;
    const same = last && Math.abs(last.h - height) / height < 0.04 && Math.hypot(last.c[0] - cx, last.c[1] - cy) * s < 12;
    this.view = { c: [cx, cy], h: height };
    await st.view2D({ center: [cx, cy], height, ms: same ? 0 : o.ms ?? 450 });
  }

  /** On phones the dock sits under the picture: when it grows or shrinks, frame again. */
  private watching = false;
  private watchDock(): void {
    if (this.watching) return;
    const dock = document.querySelector<HTMLElement>('.dock.tj-dock');
    if (!dock || typeof ResizeObserver === 'undefined') return;
    this.watching = true;
    let t = 0, lastH = dock.offsetHeight;
    // on phones the hint box sits right above the dock (traj.css), so it needs the dock's height
    const root = document.documentElement.style;
    const setH = () => root.setProperty('--tj-dock-h', `${dock.offsetHeight}px`);
    setH();
    const ro = new ResizeObserver(() => {
      setH();
      if (this.p.g.stage.size.x >= 760 || Math.abs(dock.offsetHeight - lastH) < 24) return;
      lastH = dock.offsetHeight;
      window.clearTimeout(t);
      t = window.setTimeout(() => { if (this.framed.pts.length) void this.frame(this.framed.pts, { ...this.framed.o, ms: 250 }); }, 120);
    });
    ro.observe(dock);
    this.p.onDispose(() => { ro.disconnect(); window.clearTimeout(t); root.removeProperty('--tj-dock-h'); });
  }

  /** Keep pixel sizes constant while the camera zooms. */
  private rescale(): void {
    const st = this.p.g.stage;
    const ppu = st.size.y / (2 * st.planeHalfHeight());
    if (!isFinite(ppu) || ppu <= 0 || Math.abs(ppu - this.ppu) / this.ppu < 0.004) return;
    this.ppu = ppu;
    const w = 3.1 / ppu;
    for (const a of [this.green, this.yellow]) { a.width = w; a.set(a.from.clone(), a.to.clone()); }
    this.ship.group.scale.setScalar(50 / ppu);
    this.anchor.scale.setScalar(26 / ppu);
    this.ghostPad.object.scale.setScalar(44 / ppu);
    for (const { pad } of this.pads) pad.object.scale.setScalar(52 / ppu);
    for (const d of this.dots) d.object.scale.setScalar(60 / ppu);
    if (this.rulerOf) this.ruler(this.rulerOf[0], this.rulerOf[1]);
    for (const l of [this.routeCore, this.newDir, this.miss, this.prev, ...this.locks.map((x) => x.core)]) { l.material.dashSize = 9 / ppu; l.material.gapSize = 7 / ppu; }
    if (this.arcFrom && this.arcTo) this.drawArc(this.arcFrom, this.arcTo);
    this.placeTags();
  }

  // ---------------------------------------------------------------- labels

  private place(t: Label, at: Vec, dir: Vec, side: number, out = 10): void {
    t.at(v3(at, Z.dot));
    const u = unit(isZero(dir) ? [1, 0] : dir);
    const px = (-u[1] * side * 30) + u[0] * out, py = (u[0] * side * 30) + u[1] * out;
    t.el.style.translate = `${px.toFixed(1)}px ${(-py).toFixed(1)}px`;
  }

  private placeTags(): void {
    // green's tag on the side away from yellow, yellow's on the side away from green (the angle between stays clear)
    const v = this.launchV, w = this.pos;
    const cr = v && !isZero(w) ? v[0] * w[1] - v[1] * w[0] : 0;
    const side = Math.abs(cr) > 1e-9 * (1 + len(w)) ? Math.sign(cr) : 1;
    // labels sit beside the arrow tips, clear of the arrowhead and the ship
    if (v) this.place(this.gTag, v, v, -side, 22);
    if (this.yTag.object.visible) this.place(this.yTag, w, isZero(w) ? [0, -1] : w, side, 34);
  }

  // ---------------------------------------------------------------- the attempt

  /** Clear the last attempt: arrows, arcs, dots, tags; the ship back at the Anchor. Keeps copper lines and waypoints. */
  clear(keepPrev = false): void {
    if (keepPrev && this.trailPts.length > 1) { this.prev.setPoints(this.trailPts.map((q) => v3(q, Z.trail))); this.prev.setOpacity(0.35); } else this.prev.setOpacity(0);
    this.trailPts = [];
    for (const l of [this.routeCore, this.routeGlow, this.spark, this.newDir, this.arc, this.miss, this.trail]) l.setOpacity(0);
    this.green.setOpacity(0); this.yellow.setOpacity(0);
    for (const t of [this.gTag, this.yTag, this.arcTag, this.note, this.ghostTag]) t.show(false);
    this.ghostPad.object.visible = false;
    this.arcFrom = this.arcTo = null;
    this.clearTicks();
    for (const d of this.dots) d.dispose();
    this.dots = [];
    this.launchV = null;
    this.pos = [0, 0];
    this.applied = 0;
    this.ship.group.position.set(0, 0, Z.ship);
  }

  /** How many times the matrix has been applied since the last launch. */
  private applied = 0;
  private vLabel(v: Vec): string { return `$\\mathbf v = ${this.vtex(v)}$`; }
  private wLabel(w: Vec): string { return `$${tpow(this.labels.name ?? 'A', this.applied)}\\mathbf v = ${this.vtex(w)}$`; }

  private trailPts: Vec[] = [];

  /** Show the launch line: the line through the Anchor along v, lit, dashed. */
  showRoute(v: Vec): void {
    const u = unit(v);
    const pts: [number, number, number][] = [[-u[0] * L, -u[1] * L, Z.line], [u[0] * L, u[1] * L, Z.line]];
    this.routeCore.setPoints(pts); this.routeGlow.setPoints(pts);
    this.routeCore.material.dashed = true;
    this.routeCore.setColor(C.v, 1.2);
    this.routeCore.setOpacity(0.7); this.routeGlow.setOpacity(0.1);
  }

  /** Before any launch: the intended route and the green launch arrow for v, the ship resting at the Anchor. */
  preview(v: Vec): void {
    this.clear();
    if (isZero(v)) return;
    this.showRoute(v);
    this.launchV = v.slice();
    this.green.set([0, 0, Z.arrow], v3(v, Z.arrow));
    this.green.setOpacity(1);
    this.ship.face([v[0], v[1], 0]);
    this.gTag.set(this.vLabel(v));
    this.gTag.show(true);
    this.placeTags();
  }

  /** The ship flies from the Anchor to v; the green arrow grows with it. */
  async launch(v: Vec, ms = 520): Promise<void> {
    this.launchV = v.slice();
    this.applied = 0;
    this.showRoute(v);
    if (isZero(v)) return;
    const s = this.ship;
    s.group.visible = true;
    s.face([v[0], v[1], 0]);
    s.setThrust(1.1);
    sfx.thrust(0.5);
    this.green.setOpacity(1);
    await animate(ms, (k) => {
      const q = [v[0] * k, v[1] * k];
      s.group.position.set(q[0], q[1], Z.ship);
      this.green.set([0, 0, Z.arrow], v3(q, Z.arrow));
    }, ease.inOut);
    s.setThrust(0.2);
    this.pos = v.slice();
    this.trailPts = [v.slice()];
    this.gTag.set(this.vLabel(v));
    this.gTag.show(true);
    this.placeTags();
  }

  /** One pulse: every point moves from p to A p together. The ship is carried from its position in a straight line. */
  async pulse(ms = 820): Promise<Vec> {
    const st = this.p.g.stage;
    const from = this.pos.slice();
    const to = cleanV(matVec(this.M, from));
    sfx.pulse(ms / 1000);
    void st.shockwave([0, 0, 0], ms + 200, 0.45);
    this.grid.setLook({ base: 0.1 });
    this.yellow.set([0, 0, Z.arrow + 0.005], v3(from, Z.arrow + 0.005));
    this.yellow.setOpacity(1);
    this.yTag.show(false);
    this.trail.setOpacity(0.45);
    const before = this.trailPts.slice();
    let crossed = false;
    await animate(ms, (k) => {
      const Mt = mlerp(I2, this.M, k);
      this.grid.set(Mt);
      const q = matVec(Mt, from);
      this.ship.group.position.set(q[0], q[1], Z.ship);
      if (len(q) > 1e-3 * Math.max(1, len(from))) this.ship.face([q[0], q[1], 0]);
      this.yellow.setTo(v3(q, Z.arrow + 0.005));
      this.trail.setPoints([...before, q].map((x) => v3(x, Z.trail)));
      if (!crossed && q[0] * from[0] + q[1] * from[1] < 0) {
        crossed = true;
        sfx.flip();
        void shockwave(st, [0, 0, Z.dot], '#ffffff', 36 / this.ppu, 520);
      }
    }, ease.inOut);
    this.grid.set(this.M);
    this.pos = to;
    this.trailPts = [...before, to];
    this.trail.setPoints(this.trailPts.map((x) => v3(x, Z.trail)));
    this.ship.group.position.set(to[0], to[1], Z.ship);
    if (isZero(to)) {
      // collapse: the displacement is gone; the ship sits on the Anchor
      sfx.collapse();
      st.flash(0.12, 380);
      void shockwave(st, [0, 0, Z.dot], C.violet, 70 / this.ppu, 800);
      this.yellow.setOpacity(0);
    }
    this.applied++;
    this.yTag.set(this.wLabel(to));
    this.yTag.show(true);
    this.placeTags();
    this.settling = this.settleGrid();
    return to;
  }

  private settling: Promise<void> = Promise.resolve();
  /** Resolves when the grid has come to rest after the last pulse (chain the next pulse after this). */
  settled(): Promise<void> { return this.settling; }

  /** After a pulse the field rests: the moved grid fades out and the plain grid fades back in (no motion backwards). */
  private async settleGrid(): Promise<void> {
    await this.grid.fadeTo({ main: 0, axis: 0 }, 260);
    this.grid.set(I2);
    this.grid.setLook({ base: 0 });
    await this.grid.fadeTo({ main: 0.34, axis: 0.55 }, 300);
  }

  /** Kept: the line turns solid and lights, a spark runs along it, a chord rings. Optional ruler marks at k·v. */
  async showKept(v: Vec, w: Vec, o: { ruler?: boolean; quiet?: boolean } = {}): Promise<void> {
    this.newDir.setOpacity(0);
    this.routeCore.material.dashed = false;
    this.routeCore.setOpacity(0.95);
    this.routeGlow.setOpacity(0.32);
    if (o.ruler) this.ruler(v, w);
    if (o.quiet) { sfx.snap(); return; }
    sfx.align();
    const st = this.p.g.stage;
    if (!isZero(w)) void burst(st, v3(w, Z.dot), '#c9ffd9', 46, 160 / this.ppu);
    const u = unit(v), far = this.half * 2.4;
    this.spark.setOpacity(0.9);
    await animate(620, (k) => {
      const a = far * k, b = Math.max(0, far * k - far * 0.25);
      this.spark.setPoints([[u[0] * b, u[1] * b, Z.line + 0.002], [u[0] * a + 1e-4, u[1] * a, Z.line + 0.002]]);
      this.spark.setOpacity(0.9 * (1 - k * 0.7));
      this.routeGlow.setOpacity(0.32 + 0.3 * Math.sin(k * Math.PI));
    }, ease.out);
    this.spark.setOpacity(0);
    this.routeGlow.setOpacity(0.24);
  }

  /** Turned: yellow's own line, the orange angle between the lines and a short warning. */
  async showTurned(v: Vec, w: Vec): Promise<number> {
    const u = unit(w);
    this.newDir.setPoints([[-u[0] * L, -u[1] * L, Z.line], [u[0] * L, u[1] * L, Z.line]]);
    this.newDir.setOpacity(0.5);
    const deg = lineAngle(v, w);
    this.drawArc(v, w);
    this.arcTag.set(this.turnTag(deg));
    this.arcTag.show(true);
    sfx.offcourse();
    this.p.g.stage.nudge(0.04);
    this.note.set(this.labels.offCourse ?? 'off course');
    this.note.show(true);
    this.place(this.note, this.pos, this.pos, -1);
    this.note.el.style.translate = `0px -34px`;
    await wait(900);
    this.note.show(false);
    return deg;
  }

  private vtex(v: Vec): string { return this.labels.vec?.(v) ?? tv(v); }
  /** A applied k times, as TeX: A, A^2. */
  pow(k: number): string { return tpow(this.labels.name ?? 'A', k); }
  private turnTag(deg: number): string { return this.labels.turnAngle?.(deg) ?? `turned ${fdeg(deg)}`; }

  /** The angle between green's line and yellow's line, drawn to the nearer end of yellow's (dashed) line. */
  private drawArc(v: Vec, w0: Vec): void {
    const w: Vec = v[0] * w0[0] + v[1] * w0[1] < 0 ? [-w0[0], -w0[1]] : w0;
    this.arcFrom = v; this.arcTo = w;
    const r = Math.min(54 / this.ppu, 0.45 * Math.min(len(v), Math.max(len(w), 1e-9)) || 54 / this.ppu);
    const a0 = Math.atan2(v[1], v[0]);
    const d = (signedDeg(v, w) * Math.PI) / 180;
    const n = 28;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (d * i) / n; pts.push([r * Math.cos(a), r * Math.sin(a), Z.line + 0.004]); }
    this.arc.setPoints(pts);
    this.arc.setOpacity(0.95);
    const mid = a0 + d / 2;
    if (this.dots.length) {
      // a multi-pulse path has stop labels inside the angle: the tag goes on the far side of the Anchor
      this.arcTag.at([0, 0, Z.dot]);
      this.arcTag.el.style.translate = `${(-Math.cos(mid) * 78).toFixed(0)}px ${(Math.sin(mid) * 30 - 12).toFixed(0)}px`;
    } else {
      this.arcTag.at([r * 1.5 * Math.cos(mid), r * 1.5 * Math.sin(mid), Z.dot]);
      this.arcTag.el.style.translate = `${(Math.cos(mid) * 30).toFixed(0)}px ${(-Math.sin(mid) * 14).toFixed(0)}px`;
    }
  }

  /** Unlabelled marks at whole multiples of v up to w: the true stretch made countable. */
  ruler(v: Vec, w: Vec): void {
    this.clearTicks();
    if (isZero(v)) return;
    this.rulerOf = [v.slice(), w.slice()];
    const k = (w[0] * v[0] + w[1] * v[1]) / (v[0] * v[0] + v[1] * v[1]);
    const n = Math.min(12, Math.floor(Math.abs(k) + 1e-9));
    const u = unit(v), nrm = [-u[1], u[0]], half = 9 / this.ppu;
    for (let i = 1; i <= n; i++) {
      const q = v.map((x) => x * i * Math.sign(k || 1));
      const t = new FatLine(this.p.g.stage, [[q[0] - nrm[0] * half, q[1] - nrm[1] * half, Z.arrow + 0.02], [q[0] + nrm[0] * half, q[1] + nrm[1] * half, Z.arrow + 0.02]], { color: '#fff4e6', width: 2.4, intensity: 1.6, opacity: 0.95 });
      this.p.add(t);
      this.ticks.push(t);
    }
  }
  private rulerOf: [Vec, Vec] | null = null;

  private clearTicks(): void { for (const t of this.ticks) t.dispose(); this.ticks = []; this.rulerOf = null; }

  /** A ring where the player predicts the ship will land, with a label. */
  ghost(at: Vec | null, label = ''): void {
    if (!at) { this.ghostPad.object.visible = false; this.ghostTag.show(false); return; }
    this.ghostPad.at(v3(at, Z.dot - 0.004));
    this.ghostPad.object.visible = true;
    this.ghostPad.reset('#e8f1ff');
    if (label) {
      this.ghostTag.set(label);
      this.ghostTag.at(v3(at, Z.dot));
      this.ghostTag.el.style.translate = '0px 26px';
      this.ghostTag.show(true);
    } else this.ghostTag.show(false);
  }

  // ---------------------------------------------------------------- kept lines (copper)

  /** Draw a kept line in copper, labelled with its multiplier (or ×? while unknown). Returns its index. */
  lock(dir: Vec, m: number | null): number {
    const st = this.p.g.stage;
    const u = unit(dir);
    const pts: [number, number, number][] = [[-u[0] * L, -u[1] * L, Z.line - 0.003], [u[0] * L, u[1] * L, Z.line - 0.003]];
    const glow = new FatLine(st, pts, { color: COPPER, width: 11, opacity: 0.16, intensity: 1 });
    // dashed while its multiplier is unknown, solid once it is locked
    const core = new FatLine(st, pts, { color: COPPER, width: 2.6, opacity: 0.9, intensity: 1.3, dashed: true, dashSize: 9 / this.ppu, gapSize: 7 / this.ppu });
    this.p.add(glow); this.p.add(core);
    const tag = new Label('', [0, 0, Z.dot], { className: 'a7-tag tj-copper' });
    this.p.add(tag.object); this.p.onDispose(() => tag.dispose());
    const l: LockLine = { dir: dir.slice(), m, core, glow, tag };
    this.locks.push(l);
    this.setLockValue(this.locks.length - 1, m);
    return this.locks.length - 1;
  }

  setLockValue(i: number, m: number | null): void {
    const l = this.locks[i];
    if (!l) return;
    l.m = m;
    l.core.material.dashed = m === null;
    l.tag.set(m === null ? '$\\lambda = {?}$' : `$\\lambda = ${tn(m)}$`);
    this.placeLockTag(l);
  }

  private placeLockTags(): void {
    for (const l of this.locks) l.at = undefined;
    for (const l of this.locks) this.placeLockTag(l);
  }

  /** Put a copper tag on its line inside the free rectangle, as far as it can get from the points in the picture. */
  private placeLockTag(l: LockLine): void {
    const u = unit(l.dir);
    const B = this.box;
    // how far the line runs inside the free rectangle, each way from the Anchor
    const reach = (sgn: number) => {
      let t = Infinity;
      const d = [u[0] * sgn, u[1] * sgn];
      if (d[0] > 1e-9) t = Math.min(t, (B.x1 - B.m) / d[0]); else if (d[0] < -1e-9) t = Math.min(t, (B.x0 + B.m) / d[0]);
      if (d[1] > 1e-9) t = Math.min(t, (B.y1 - B.m) / d[1]); else if (d[1] < -1e-9) t = Math.min(t, (B.y0 + B.m) / d[1]);
      return Math.max(0, t);
    };
    const avoid: Vec[] = [[0, 0], ...this.framed.pts, ...this.pads.map((q) => q.at), ...this.locks.filter((o) => o !== l && o.at).map((o) => o.at!)];
    const px = this.pxPerUnit;
    // no room either way: the end of the longer side, clear of the Anchor's own label
    const rn = reach(-1), rp = reach(1);
    let best: { t: number; score: number } = { t: rn > rp ? -rn : rp, score: -Infinity };
    for (const sgn of [-1, 1]) {
      const r = sgn < 0 ? rn : rp;
      for (const f of [0.92, 0.75, 0.58, 0.42]) {
        const t = sgn * r * f;
        if (Math.abs(t) * px < 70) continue;
        const q: Vec = [u[0] * t, u[1] * t];
        // distance in px to the nearest point of interest; the side away from launches wins a tie
        const score = Math.min(...avoid.map((a) => Math.hypot(a[0] - q[0], a[1] - q[1]) * px)) + (sgn < 0 ? 12 : 0);
        if (score > best.score) best = { t, score };
      }
    }
    l.at = [u[0] * best.t, u[1] * best.t];
    // a line that barely crosses the picture has no room for a legible tag: the line alone shows until it does
    l.tag.show(this.labels.lockTags !== false && Math.max(rn, rp) * px >= 90);
    l.tag.at([l.at[0], l.at[1], Z.dot]);
    l.tag.el.style.translate = `${(-u[1] * 26).toFixed(0)}px ${(-u[0] * 26).toFixed(0)}px`;
  }

  /** Which locked line (if any) v lies on. */
  lockOf(v: Vec): number {
    return this.locks.findIndex((l) => onLineOf(l.dir, v));
  }

  get lockCount(): number { return this.locks.length; }

  /** Brighten a locked line for a moment (a duplicate landed on it). */
  async flashLock(i: number, ms = 700): Promise<void> {
    const l = this.locks[i];
    if (!l) return;
    await animate(ms, (k) => { l.glow.setOpacity(0.16 + 0.5 * Math.sin(k * Math.PI)); }, ease.linear);
    l.glow.setOpacity(0.16);
  }

  /** Remove every copper line. */
  clearLocks(): void {
    for (const l of this.locks) { l.core.dispose(); l.glow.dispose(); l.tag.dispose(); }
    this.locks = [];
  }

  // ---------------------------------------------------------------- waypoints and flights

  /** A waypoint ring with a label. */
  waypoint(at: Vec, label: string): Pad {
    const pad = new Pad(this.p.g.stage, v3(at, Z.dot - 0.006), { label });
    pad.object.scale.setScalar(52 / this.ppu);
    this.p.add(pad);
    this.pads.push({ pad, at: at.slice() });
    return pad;
  }

  clearWaypoints(): void {
    for (const { pad } of this.pads) pad.dispose();
    this.pads = [];
  }

  /** A marked stop on the flight (after pulse k). `below` puts the label under the dot (alternate close stops). */
  mark(at: Vec, label: string, color = '#e8f1ff', below = false): void {
    // a stop on a waypoint ring: the label clears the ring
    const onPad = this.pads.some((q) => Math.hypot(q.at[0] - at[0], q.at[1] - at[1]) < 1e-9);
    const d = new Dot(v3(at, Z.dot), { color, size: 0.06, label, labelOffset: [0, onPad ? -34 : below ? 20 : -16] });
    d.object.scale.setScalar(60 / this.ppu);
    this.p.add(d);
    this.dots.push(d);
  }

  /** Launch, then n pulses, marking each stop. Returns every position. */
  async fly(v: Vec, n: number, o: { marks?: boolean; gap?: number } = {}): Promise<Vec[]> {
    await this.launch(v);
    const out = [v.slice()];
    for (let k = 1; k <= n; k++) {
      if (o.marks !== false && k > 1) this.mark(out[k - 1], `$${this.pow(k - 1)}\\mathbf v$`, undefined, k % 2 === 1);
      await wait(o.gap ?? 160);
      out.push(await this.pulse());
    }
    return out;
  }

  /** The dashed orange gap between where the ship ended and where it needed to be. */
  showMiss(end: Vec, target: Vec): void {
    this.miss.setPoints([v3(end, Z.line + 0.006), v3(target, Z.line + 0.006)]);
    this.miss.setOpacity(0.9);
  }

  /** Docking payoff at a waypoint. */
  async arrive(pad: Pad, at: Vec): Promise<void> {
    const st = this.p.g.stage;
    sfx.arrive();
    st.flash(0.1, 320);
    st.nudge(0.06);
    void burst(st, v3(at, Z.dot), '#9ff7ff', 80, 220 / this.ppu);
    void shockwave(st, v3(at, Z.dot), C.accent, 120 / this.ppu, 900);
    // the yellow tag now names the same point: drop the target's label so the two do not overlap
    pad.label?.show(false);
    await pad.hit(C.v);
  }

  /** A heading scan: yellow's direction only, drawn as a line (no flight, no length). */
  async scan(v: Vec): Promise<{ w: Vec; kept: boolean; deg: number }> {
    this.clear();
    this.launchV = v.slice();
    this.showRoute(v);
    this.gTag.set(this.vLabel(v));
    this.gTag.show(true);
    this.green.set([0, 0, Z.arrow], v3(v, Z.arrow));
    this.green.setOpacity(1);
    this.placeTags();
    const w = cleanV(matVec(this.M, v));
    sfx.whoosh(0.5);
    const kept = onLineOf(v, w) && !isZero(v);
    const u = unit(isZero(w) ? v : w);
    await animate(420, (k) => {
      const a = L * k;
      this.newDir.setPoints([[0, 0, Z.line], [u[0] * a, u[1] * a, Z.line]]);
      this.newDir.setOpacity(0.75);
    }, ease.out);
    this.newDir.setPoints([[-u[0] * L, -u[1] * L, Z.line], [u[0] * L, u[1] * L, Z.line]]);
    if (kept) { this.newDir.setOpacity(0); await this.showKept(v, w, { quiet: true }); return { w, kept, deg: 0 }; }
    this.drawArc(v, w);
    const deg = lineAngle(v, w);
    this.arcTag.set(this.turnTag(deg));
    this.arcTag.show(true);
    sfx.offcourse();
    return { w, kept, deg };
  }

  /** The finale: points on the kept lines slide along them while the grid moves; other points swing. */
  async showcase(ms = 1600): Promise<void> {
    const st = this.p.g.stage;
    const on: Vec[] = [], offs: Vec[] = [];
    for (const l of this.locks) { const u = l.dir; for (const k of [-2, -1, 1, 2]) on.push([u[0] * k, u[1] * k]); }
    for (const q of [[1, 0], [0, 1], [-1, 0], [0, -1], [2, 1], [-2, -1]]) if (this.lockOf(q) < 0) offs.push(q);
    const mk = (q: Vec, color: string) => { const d = new Dot(v3(q, Z.dot), { color, size: 0.06, glow: 1.6 }); d.object.scale.setScalar(60 / this.ppu); this.p.add(d); return d; };
    // every dot must stay in the picture at the end of the pulse too
    await this.frame([...on, ...offs].flatMap((q) => [q, matVec(this.M, q)]), { min: 3 });
    const dOn = on.map((q) => mk(q, '#f2b27c')), dOff = offs.map((q) => mk(q, '#c3cde0'));
    for (const l of this.locks) l.glow.setOpacity(0.4);
    sfx.pulse(ms / 2000);
    void st.shockwave([0, 0, 0], ms, 0.35);
    const go = (a: Mat, b: Mat) => animate(ms / 2, (k) => {
      const Mt = mlerp(a, b, k);
      this.grid.set(Mt);
      dOn.forEach((d, i) => d.at(v3(matVec(Mt, on[i]), Z.dot)));
      dOff.forEach((d, i) => d.at(v3(matVec(Mt, offs[i]), Z.dot)));
    }, ease.inOut);
    await go(I2, this.M);
    await wait(450);
    // rest as after any pulse: fade, never run backwards
    await Promise.all([this.settleGrid(), animate(300, (k) => { for (const d of [...dOn, ...dOff]) d.setOpacity(1 - k); }, ease.linear)]);
    for (const d of [...dOn, ...dOff]) d.dispose();
    for (const l of this.locks) l.glow.setOpacity(0.2);
  }
}

// ------------------------------------------------------------------ dock widgets

/** One typed number with a ± key (phone keypads often have no minus) and Enter to submit. */
export class NumCell {
  readonly el: HTMLElement;
  readonly input: HTMLInputElement;
  private readonly comma: boolean;
  constructor(o: { value?: string; aria: string; onEnter?: () => void; cls?: string; placeholder?: string; comma?: boolean; signTitle?: string }) {
    this.comma = o.comma ?? true;
    this.input = h('input', {
      class: `cell tj-cell ${o.cls ?? ''}`, type: 'text', inputmode: 'decimal', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
      enterkeyhint: 'go', 'aria-label': o.aria, placeholder: o.placeholder ?? '', value: o.value ?? '',
    }) as HTMLInputElement;
    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); o.onEnter?.(); }
    });
    this.input.addEventListener('input', () => this.input.classList.remove('bad'));
    this.input.addEventListener('focus', () => this.input.select());
    const pm = button('±', () => {
      const t = this.input.value.trim();
      this.input.value = t.startsWith('-') || t.startsWith('−') ? t.slice(1) : `-${t}`;
      this.input.classList.remove('bad');
    }, { cls: 'ghost small tj-pm', title: o.signTitle ?? 'Change the sign' });
    this.el = h('span', { class: 'tj-num' }, this.input, pm);
  }
  /** The typed number, or null (and marked) if it cannot be read. */
  value(): number | null {
    const x = parseEntry(this.input.value, { comma: this.comma });
    this.input.classList.toggle('bad', x === null);
    return x;
  }
  set(x: number | string): void { this.input.value = typeof x === 'number' ? fmtN(x).replace(/−/g, '-') : x; this.input.classList.remove('bad'); }
  focus(): void { this.input.focus(); }
  enable(on: boolean): void { this.input.disabled = !on; (this.el.querySelector('button') as HTMLButtonElement).disabled = !on; }
}

/** A launch vector: v = (x, y), green. */
export class VecField {
  readonly el: HTMLElement;
  readonly x: NumCell;
  readonly y: NumCell;
  constructor(o: { value?: Vec | null; label?: string; onEnter?: () => void; aria?: [string, string]; signTitle?: string; column?: boolean }) {
    // null: both boxes start empty (nothing suggests a direction)
    const v = o.value === undefined ? [1, 0] : o.value;
    const txt = (i: number) => (v ? fmtN(v[i]).replace(/−/g, '-') : '');
    const [ax, ay] = o.aria ?? ['first number of v', 'second number of v'];
    // one number per box: "1,1" in a part is a whole vector typed in one box, so it is refused, not read as 1.1
    this.x = new NumCell({ value: txt(0), aria: ax, onEnter: o.onEnter, cls: 'c0', comma: false, signTitle: o.signTitle });
    this.y = new NumCell({ value: txt(1), aria: ay, onEnter: o.onEnter, cls: 'c0', comma: false, signTitle: o.signTitle });
    const label = h('span', { class: 'tj-vl', html: inline(o.label ?? '$\\mathbf v =$') });
    // column (the default): the two boxes stacked inside square brackets, written like the matrix
    this.el = o.column !== false
      ? h('span', { class: 'tj-vec' }, label, h('span', { class: 'tj-col' }, this.x.el, this.y.el))
      : h('span', { class: 'tj-vec' }, label, h('span', { class: 'tj-par' }, '('), this.x.el, h('span', { class: 'tj-par' }, ','), this.y.el, h('span', { class: 'tj-par' }, ')'));
  }
  /** Both parts, or null (cells that cannot be read are marked). */
  get(): Vec | null {
    const a = this.x.value(), b = this.y.value();
    return a === null || b === null ? null : [a, b];
  }
  set(v: Vec): void { this.x.set(v[0]); this.y.set(v[1]); }
  enable(on: boolean): void { this.x.enable(on); this.y.enable(on); }
  focus(): void { this.x.focus(); }
}

/** The dock: one panel (phones get one scrolling strip above the HUD buttons). */
export interface TrajDock { root: HTMLElement; head: HTMLElement; body: HTMLElement; msg: (md: string, kind?: '' | 'good' | 'bad' | 'warn') => void; setMatrix: (M: Mat) => void }
export function trajDock(p: PuzzleCtx, M: Mat, extra?: HTMLElement, name = 'A', o: { matrixLabel?: string; matrixNote?: string } = {}): TrajDock {
  const dock = p.dock();
  dock.classList.add('tj-dock');
  const mat = h('span', { class: 'tj-mat' });
  const setMatrix = (A: Mat) => { mat.innerHTML = inline(`${o.matrixLabel ? `${o.matrixLabel} ` : ''}$${name} = ${texM(A)}$`); };
  setMatrix(M);
  const head = h('div', { class: 'tj-head' }, mat, extra ?? null);
  const note = o.matrixNote ? h('div', { class: 'tj-aside', html: inline(o.matrixNote) }) : null;
  const body = h('div', { class: 'tj-body' });
  const m = h('div', { class: 'tj-msg', 'aria-live': 'polite' });
  const root = h('div', { class: 'tj' }, head, note, body, m);
  dock.replaceChildren(root);
  const msg = (md: string, kind: '' | 'good' | 'bad' | 'warn' = '') => {
    m.className = `tj-msg ${kind}`;
    m.innerHTML = md ? inline(md) : '';
    // on phones the dock scrolls: keep the newest feedback in view
    if (md) requestAnimationFrame(() => m.scrollIntoView({ block: 'nearest' }));
  };
  return { root, head, body, msg, setMatrix };
}

/** Hide the runner's hint box (the stage it answered is over). */
export function hideHint(p: PuzzleCtx): void {
  const b = p.g.ui.scene.querySelector<HTMLElement>('.hint-box');
  if (b) b.hidden = true;
}

/** The result line: A v = w, and whether it stayed on its line. */
export function resultLine(v: Vec, w: Vec, kept: boolean, _deg = 0, name = 'A'): string {
  return `$${name}\\cg{${tv(v)}} = \\cy{${tv(w)}}$ · ${kept ? 'on its line' : 'off its line'}`;
}

/** Pulse-count pips: ● filled for pulses still to come. */
export function pips(n: number, used = 0): HTMLElement {
  return h('span', { class: 'tj-pips', 'aria-label': `${n - used} to go` }, ...Array.from({ length: n }, (_, i) => h('span', { class: `pip ${i < used ? 'used' : ''}` })));
}


// ------------------------------------------------------------------ progress record

const KEY = 'c18-traj';
/** Save how a stage was passed: independent, corrected or assisted (latest attempt). */
export function record(id: string, a: Attempt): Outcome {
  const f = ((S().flags[KEY] as Record<string, Outcome> | undefined) ??= {});
  f[id] = outcomeOf(a);
  S().flags[KEY] = f;
  save();
  return f[id];
}
/** Everything recorded so far. */
export function records(): Record<string, Outcome> {
  return { ...((S().flags[KEY] as Record<string, Outcome> | undefined) ?? {}) };
}
