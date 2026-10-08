// Chapter 3: the calm 3-D chart. The old chapter's 3-D picture (arrows from the origin, chains drawn tip to tail)
// without the ship, dials, glow or readout: named arrows with quiet labels (u, v, w), a faint floor, an optional
// faint plane, a target dot and a ghost ring. The camera fits the picture into the part of the screen the dock and
// the HUD leave free (a view offset, so turning still turns about the picture) and sways slowly until the player
// drags it. MixView is the kit's PlaneView with this chart inside, so one practice shell can mix 2-D and 3-D rounds.
import { Group, type Object3D } from 'three';
import type { Game, PuzzleCtx, V3 } from '../../../game/types';
import type { Stage } from '../../../core/stage';
import { Arrow } from '../../../gfx/arrow';
import { Label } from '../../../gfx/label';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { Dot, Pad } from '../../../gfx/markers';
import { C } from '../../../core/theme';
import { animate, ease } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { PlaneView, COPPER, type FrameOpts, type Vec } from '../../../kit/plain';

export type K = 'g' | 'b' | 'y' | 'w' | 'c';
const COL: Record<K, string> = { g: C.v, b: C.u, y: C.result, w: '#e8f1ff', c: COPPER };
// the kit's quiet label classes (no dark box on a calm screen)
const TAG: Record<K, string> = { g: 'g', b: 'b', y: 'y', w: 'pk-w', c: 'tj-copper' };
/** The white vector glows less: on a dark screen a white glow outshines the coloured ones. */
const glow = (k: K): number => (k === 'w' ? 0.3 : 0.7);

export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul3 = (k: number, a: V3): V3 => [k * a[0], k * a[1], k * a[2]];
export const to3 = (v: Vec): V3 => [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
const len3 = (a: V3): number => Math.hypot(a[0], a[1], a[2]);

// ------------------------------------------------------------------ where the chart lives (a puzzle or a cinematic)

export interface Host {
  stage: Stage;
  add(o: Object3D): void;
  onDispose(f: () => void): void;
  tick(f: (dt: number) => void): void;
  headless: boolean;
}

export function puzzleHost(p: PuzzleCtx): Host {
  return { stage: p.g.stage, add: (o) => p.add(o), onDispose: (f) => p.onDispose(f), tick: (f) => p.tick(f), headless: p.g.headless };
}

/** For cinematics and card visuals: everything hangs off one group, removed (and cleaned up) by clearWorld. */
export function worldHost(g: Game): Host & { alive(): boolean } {
  const root = new Group();
  const offs: (() => void)[] = [];
  root.userData.dispose = () => offs.splice(0).forEach((f) => { try { f(); } catch { /* gone */ } });
  g.stage.world.add(root);
  return {
    stage: g.stage, headless: g.headless,
    add: (o) => root.add(o), onDispose: (f) => offs.push(f), tick: (f) => offs.push(g.stage.tick(f)),
    alive: () => !!root.parent,
  };
}

// ------------------------------------------------------------------ an arrow with its own tail and a quiet label

export class Arrow3 {
  from: V3 = [0, 0, 0];
  vec: V3 = [0, 0, 0];
  visible = false;
  text = '';
  constructor(readonly kind: K, readonly arrow: Arrow, readonly tag: Label) {}
  get tip(): V3 { return add3(this.from, this.vec); }
  private draw(): void { this.arrow.set(this.from, this.tip); }
  set(vec: V3, from: V3 = this.from): this {
    this.from = from.slice() as V3; this.vec = vec.slice() as V3; this.visible = true;
    this.arrow.setOpacity(1); this.arrow.setGlow(glow(this.kind)); this.draw(); this.showTag();
    return this;
  }
  async grow(vec: V3, o: { from?: V3; ms?: number } = {}): Promise<void> {
    if (o.from) this.from = o.from.slice() as V3;
    this.visible = true;
    this.arrow.setOpacity(1);
    this.arrow.setGlow(glow(this.kind));
    this.tag.show(false);
    await animate(o.ms ?? 600, (k) => { this.vec = mul3(k, vec); this.draw(); }, ease.inOut);
    this.vec = vec.slice() as V3;
    this.draw();
    this.showTag();
  }
  label(md: string): this { this.text = md; if (md) this.tag.set(md); this.showTag(); return this; }
  dim(a: number): void { this.arrow.setOpacity(a); this.arrow.setGlow(glow(this.kind) * a * a); this.tag.el.style.opacity = String(Math.max(a, 0.5)); }
  hide(): void { this.visible = false; this.arrow.setOpacity(0); this.tag.show(false); }
  private showTag(): void { this.tag.show(this.visible && !!this.text && len3(this.vec) > 1e-9); }
}

// ------------------------------------------------------------------ the chart

export interface FitOpts {
  /** Camera direction, degrees (z is up). */
  az?: number;
  el?: number;
  ms?: number;
  /** Which part of the screen: the part the dock and HUD leave free (default), all of it, or left of a name card. */
  rect?: 'free' | 'full' | 'card';
  /** Sway the camera slowly about the picture until the player drags it (default true). */
  sway?: boolean;
  /** Zoom factor (above 1 shows the picture bigger). */
  zoom?: number;
}

export class Space {
  readonly h: Host;
  readonly root = new Group();
  private readonly arrows = new Map<string, Arrow3>();
  private temp: { dispose(): void }[] = [];
  private rings: Pad[] = [];
  private gapLine: FatLine | null = null;
  private ghostPad: Pad | null = null;
  private floor: FatSegments | null = null;
  on = false;
  private fitPts: V3[] = [];
  private fitO: FitOpts = {};
  private swayT = 0;
  private swaying = false;
  private base = { az: -60, el: 24, d: 10, c: [0, 0, 0] as V3 };
  /** Pixels per world unit at the picture's centre (for sizes that stay the same on screen). */
  private px = 60;

  constructor(h: Host) {
    this.h = h;
    h.add(this.root);
    h.tick((dt) => this.frameTick(dt));
    h.onDispose(() => this.leave());
    const off = h.stage.onResize(() => { if (this.on) void this.fit(this.fitPts, { ...this.fitO, ms: 0 }, true); });
    h.onDispose(off);
    this.watchDock();
  }

  // ---------------------------------------------------------------- things on the chart

  arrow(id: string, kind: K = 'g'): Arrow3 {
    const old = this.arrows.get(id);
    if (old && old.kind === kind) return old;
    if (old) { old.arrow.dispose(); old.tag.dispose(); }
    const a = new Arrow([0, 0, 0], [0, 0, 0], { color: COL[kind], width: this.width(), glow: glow(kind) });
    a.setOpacity(0);
    const tag = new Label('', [0, 0, 0], { className: `a7-tag pk-tag c03-tag ${TAG[kind]}` });
    tag.show(false);
    this.root.add(a.object, tag.object);
    const x = new Arrow3(kind, a, tag);
    this.arrows.set(id, x);
    return x;
  }

  /** A faint parallelogram of the plane through the origin spanned by a and b, with lines at whole multiples. */
  plane(a: V3, b: V3, o: { n?: number; opacity?: number } = {}): { setOpacity(k: number): void; dispose(): void } {
    const n = o.n ?? 3, op = o.opacity ?? 0.22;
    const segs: [V3, V3][] = [];
    for (let k = -n; k <= n; k++) {
      segs.push([add3(mul3(k, b), mul3(-n, a)), add3(mul3(k, b), mul3(n, a))]);
      segs.push([add3(mul3(k, a), mul3(-n, b)), add3(mul3(k, a), mul3(n, b))]);
    }
    const lines = new FatSegments(this.h.stage, segs, { color: '#9fb4d8', width: 1, opacity: op });
    this.root.add(lines.object);
    const item = { setOpacity: (k: number) => lines.setOpacity(op * k), dispose: () => lines.dispose() };
    this.temp.push(item);
    return item;
  }

  /** A target: a ring that faces the camera. */
  ring(at: V3, color = '#e8f1ff'): Pad {
    const pad = new Pad(this.h.stage, at, { color, radius: 0.3 });
    pad.object.scale.setScalar(this.ringScale());
    this.root.add(pad.object);
    this.rings.push(pad);
    return pad;
  }

  /** A small glowing dot (the end of a chain). */
  dot(at: V3, kind: K = 'y'): Dot {
    const d = new Dot(at, { color: COL[kind], size: 0.09, glow: 1.6 });
    d.object.scale.setScalar(55 / this.px);
    this.root.add(d.object);
    this.temp.push(d);
    return d;
  }

  /** A dashed orange line from where a chain ended to where it had to go. */
  gap(from: V3 | null, to?: V3): void {
    this.gapLine?.dispose();
    this.gapLine = null;
    if (!from || !to) return;
    this.gapLine = new FatLine(this.h.stage, [from, to], { color: C.orange, width: 2, dashed: true, intensity: 1.2, opacity: 0.9, dashSize: 0.12, gapSize: 0.08 });
    this.root.add(this.gapLine.object);
  }

  /** A dashed white ring where a typed answer puts the tip (null hides it). */
  ghost(at: V3 | null): void {
    this.ghostPad?.dispose();
    this.ghostPad = null;
    if (!at) return;
    this.ghostPad = new Pad(this.h.stage, at, { color: '#e8f1ff', radius: 0.26 });
    this.ghostPad.object.scale.setScalar(this.ringScale());
    this.root.add(this.ghostPad.object);
  }

  /** Arrows drawn tip to tail from the origin, one after another. Returns where the chain ends. */
  async chain(parts: { id: string; v: V3; kind: K; dim?: boolean }[], o: { ms?: number; from?: V3 } = {}): Promise<V3> {
    let at: V3 = o.from ?? [0, 0, 0];
    for (const pt of parts) {
      const A = this.arrow(pt.id, pt.kind);
      A.label('');
      if (len3(pt.v) < 1e-9) { A.hide(); continue; }
      await A.grow(pt.v, { from: at, ms: o.ms ?? 560 });
      if (pt.dim) A.dim(0.4);
      at = add3(at, pt.v);
      sfx.snap();
    }
    return at;
  }

  /** Drop the last attempt (chains, dots, rings, the gap, the ghost). Keeps the floor. */
  clear(): void {
    for (const a of this.arrows.values()) { a.hide(); a.text = ''; }
    for (const t of this.temp.splice(0)) t.dispose();
    for (const r of this.rings.splice(0)) r.dispose();
    this.gap(null);
    this.ghost(null);
  }

  // ---------------------------------------------------------------- the camera

  /** Turn the 3-D chart on: a faint floor, then fit the camera to these points. */
  async enter(pts: V3[], o: FitOpts = {}): Promise<void> {
    this.on = true;
    this.root.visible = true;
    this.showFloor(true);
    await this.fit(pts, o);
  }

  /** Back to nothing: clear the chart, stop the sway, give the camera back. */
  leave(): void {
    this.clear();
    this.on = false;
    this.swaying = false;
    this.root.visible = false;
    this.showFloor(false);
    this.h.stage.camera.clearViewOffset();
  }

  /** Show or hide the faint floor (a round with its own plane hides it: one grid at a time). */
  setFloor(on: boolean): void { this.showFloor(on); }

  private showFloor(on: boolean): void {
    if (on && !this.floor) {
      // a faint square floor (z = 0) for depth
      const segs: [V3, V3][] = [];
      const n = 4;
      for (let k = -n; k <= n; k++) { segs.push([[k, -n, 0], [k, n, 0]]); segs.push([[-n, k, 0], [n, k, 0]]); }
      this.floor = new FatSegments(this.h.stage, segs, { color: '#3a7bd5', width: 1, opacity: 0.22 });
      this.root.add(this.floor.object);
      this.h.onDispose(() => { this.floor?.dispose(); });
    }
    if (this.floor) this.floor.object.visible = on;
  }

  /** The screen rectangle not covered by the HUD and the dock (CSS px). */
  private freeRect(rect: FitOpts['rect']): { l: number; t: number; r: number; b: number } {
    const st = this.h.stage;
    const W = st.size.x, H = st.size.y;
    if (rect === 'full') return { l: 0, t: 0, r: W, b: H };
    if (rect === 'card') return W >= 760 ? { l: 0, t: 40, r: W - 610, b: H - 40 } : { l: 0, t: 0, r: W, b: H * 0.4 };
    const box = (sel: string) => {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el || el.hidden) return null;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? r : null;
    };
    const tl = box('.hud-tl'), tr = box('.hud-tr'), dock = box('.dock.tj-dock');
    if (W >= 760) {
      const left = Math.max(dock ? dock.right : 0, 0) + 16;
      return { l: left, t: (tl ? Math.min(tl.bottom, 120) : 60) + 8, r: W - 16, b: H - 60 };
    }
    const top = Math.max(tl ? tl.bottom : 0, tr ? tr.bottom : 0) + 8;
    const bottom = (dock ? dock.top : H - 60) - 8;
    return { l: 6, t: top, r: W - 6, b: Math.max(top + 160, bottom) };
  }

  /** Fit the camera to these points (and the origin) in the free part of the screen. */
  async fit(pts: V3[], o: FitOpts = {}, keepAngle = false): Promise<void> {
    this.fitPts = pts.map((q) => q.slice() as V3);
    this.fitO = { ...o };
    const st = this.h.stage;
    const W = st.size.x, H = st.size.y;
    const all: V3[] = [[0, 0, 0], ...pts];
    const lo = [0, 1, 2].map((i) => Math.min(...all.map((q) => q[i])));
    const hi = [0, 1, 2].map((i) => Math.max(...all.map((q) => q[i])));
    const c: V3 = [0, 1, 2].map((i) => (lo[i] + hi[i]) / 2) as V3;
    const r = Math.max(1.2, ...all.map((q) => len3([q[0] - c[0], q[1] - c[1], q[2] - c[2]])));
    const R = this.freeRect(o.rect);
    const f = H / (2 * Math.tan((st.camera.fov * Math.PI) / 360));
    const avail = Math.max(70, Math.min(R.r - R.l, R.b - R.t) / 2 - 16);
    const d = (r * f) / avail / (o.zoom ?? 1);
    const az = keepAngle ? this.base.az : o.az ?? -60, el = keepAngle ? this.base.el : o.el ?? 24;
    this.base = { az, el, d, c };
    this.px = f / d;
    await st.view3D({ target: c, distance: d, azimuth: az, elevation: el, ms: o.ms ?? 0 });
    const ctl = st.controls;
    if (ctl) {
      ctl.minDistance = d * 0.4;
      ctl.maxDistance = d * 3;
      ctl.addEventListener('start', () => { this.swaying = false; });
    }
    const rx = (R.l + R.r) / 2, ry = (R.t + R.b) / 2;
    st.camera.setViewOffset(W, H, W / 2 - rx, H / 2 - ry, W, H);
    this.resize();
    if (!keepAngle) { this.swaying = o.sway !== false && !this.h.headless; this.swayT = 0; }
  }

  /** Put the camera at this angle about the picture (degrees). */
  private place(az = this.base.az, el = this.base.el): void {
    const { c, d } = this.base;
    const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180;
    const cam = this.h.stage.camera;
    cam.position.set(c[0] + d * Math.cos(e) * Math.cos(a), c[1] + d * Math.cos(e) * Math.sin(a), c[2] + d * Math.sin(e));
    cam.lookAt(c[0], c[1], c[2]);
  }

  /** Turn the camera about the picture to a new angle; the sway (if on) carries on from there. */
  async turn(az: number, el: number, ms: number): Promise<void> {
    const a0 = this.base.az, e0 = this.base.el, was = this.swaying;
    this.swaying = false;
    await animate(ms, (k) => { this.base.az = a0 + (az - a0) * k; this.base.el = e0 + (el - e0) * k; this.place(); }, ease.inOut);
    this.swayT = 0;
    this.swaying = was;
  }

  /** Start or stop the slow sway. */
  sway(on: boolean): void { this.swaying = on && !this.h.headless; this.swayT = 0; }

  /** Re-fit after the screen or the dock changed size (keeps the angle). */
  refit(): void { if (this.on) void this.fit(this.fitPts, { ...this.fitO, ms: 0 }, true); }

  private watchDock(): void {
    if (typeof ResizeObserver === 'undefined') return;
    let watched: HTMLElement | null = null, lastH = 0, t = 0;
    const ro = new ResizeObserver(() => {
      if (!watched || this.h.stage.size.x >= 760 || Math.abs(watched.offsetHeight - lastH) < 24) return;
      lastH = watched.offsetHeight;
      window.clearTimeout(t);
      t = window.setTimeout(() => this.refit(), 120);
    });
    // the dock may be made after the chart: look for it once a second
    const look = window.setInterval(() => {
      const dock = document.querySelector<HTMLElement>('.dock.tj-dock');
      if (dock && dock !== watched) { ro.disconnect(); watched = dock; lastH = dock.offsetHeight; ro.observe(dock); }
    }, 500);
    this.h.onDispose(() => { ro.disconnect(); window.clearInterval(look); window.clearTimeout(t); });
  }

  private width(): number { return 3.2 / this.px; }
  private ringScale(): number { return 50 / this.px; }

  private resize(): void {
    const w = this.width();
    for (const a of this.arrows.values()) { a.arrow.width = w; a.arrow.set(a.arrow.from.clone(), a.arrow.to.clone()); }
    for (const r of this.rings) r.object.scale.setScalar(this.ringScale());
    this.ghostPad?.object.scale.setScalar(this.ringScale());
  }

  private frameTick(dt: number): void {
    if (!this.on) return;
    const st = this.h.stage;
    // the sway: a slow turn back and forth about the picture
    if (this.swaying && st.controls) {
      this.swayT += dt;
      this.place(this.base.az + 24 * Math.sin((this.swayT * 2 * Math.PI) / 18));
    }
    // rings face the camera
    for (const r of [...this.rings, ...(this.ghostPad ? [this.ghostPad] : [])]) r.object.quaternion.copy(st.camera.quaternion);
    // labels just past the tip, along the arrow as it looks on screen
    for (const a of this.arrows.values()) {
      if (!a.visible || !a.text) continue;
      const p0 = st.toScreen(a.from), p1 = st.toScreen(a.tip);
      let dx = p1.x - p0.x, dy = p1.y - p0.y;
      const n = Math.hypot(dx, dy) || 1;
      dx /= n; dy /= n;
      const w = a.tag.el.offsetWidth || 20, hh = a.tag.el.offsetHeight || 20;
      const ext = (Math.abs(dx) * w) / 2 + (Math.abs(dy) * hh) / 2 + 8;
      a.tag.at(a.tip);
      a.tag.el.style.translate = `${(dx * ext).toFixed(1)}px ${(dy * ext).toFixed(1)}px`;
    }
  }
}

// ------------------------------------------------------------------ the kit's chart with a 3-D chart inside

/** One chart for a practice shell that mixes 2-D rounds (the kit's PlaneView) and 3-D rounds (space). */
export class MixView extends PlaneView {
  readonly space: Space;
  /** Runs on every reset (a new round, the summary). */
  onReset: (() => void) | null = null;
  constructor(p: PuzzleCtx) {
    super(p);
    this.space = new Space(puzzleHost(p));
    this.space.leave();
  }
  override reset(): void {
    super.reset();
    this.space?.leave();
    // the 2-D grid back as the kit set it
    this.grid.setLook({ main: 0.34, base: 0, axis: 0.55 });
    this.grid.object.visible = true;
    this.onReset?.();
  }
  /** A 3-D round: hide the flat grid and fit the 3-D chart. */
  async enter3(pts: V3[], o: FitOpts = {}): Promise<void> {
    this.grid.object.visible = false;
    await this.space.enter(pts, o);
  }
  override async frame(pts: Vec[], o: FrameOpts = {}): Promise<void> {
    if (this.space?.on) { this.space.refit(); return; }
    return super.frame(pts, o);
  }
}
