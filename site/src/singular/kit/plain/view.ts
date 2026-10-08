// Plain maths kit: the chart. Chapter 18's TrajView without the matrix, the ship or the story: a grid, a
// glowing origin, named arrows that each have their own tail (so tip to tail works), dashed lines through a
// point, ruler ticks, target rings, ghost rings, labelled and painted dots, and the legs of a length.
// Sizes stay the same in pixels at any zoom, and frame() fits the picture into the screen area the dock and
// the HUD leave free. Colours as in Chapter 18: green typed vector, yellow result, copper found, orange wrong.
import './plain.css';
import { Group } from 'three';
import type { PuzzleCtx } from '../../game/types';
import type { Grid2D } from '../../gfx/grid';
import { Arrow } from '../../gfx/arrow';
import { FatLine } from '../../gfx/lines';
import { Label } from '../../gfx/label';
import { Dot, Pad, glowSprite } from '../../gfx/markers';
import { burst, shockwave } from '../../gfx/fx';
import { C } from '../../core/theme';
import { animate, ease } from '../../core/tween';
import { sfx } from '../../audio/sfx';
import { isZero, type Vec } from './logic';
import { tn } from './tex';
import { addTipToTail, combine, length, scale, type MoveOpts } from './moves';

export const COPPER = '#c9844f';
/** g green (a typed vector), b blue (a second typed vector), y yellow (the result), c copper (found), o orange (wrong), w white. */
export type Kind = 'g' | 'b' | 'y' | 'c' | 'o' | 'w';
export const COLORS: Record<Kind, string> = { g: C.v, b: C.u, y: C.result, c: COPPER, o: C.orange, w: C.white };
const TAG: Record<Kind, string> = { g: 'g', b: 'b', y: 'y', c: 'tj-copper', o: 'o', w: 'pk-w' };

const Z = { paint: 0.004, line: 0.01, arrow: 0.03, dot: 0.05 };
const L = 400; // half-length of a line (reads as infinite)
const v3 = (v: Vec, z = 0): [number, number, number] => [v[0], v[1], z];
const len = (v: Vec) => Math.hypot(v[0], v[1]);
const unit = (v: Vec): Vec => { const n = len(v); return n < 1e-12 ? [1, 0] : [v[0] / n, v[1] / n]; };

export interface FrameOpts {
  /** Smallest half-extent shown around the content, in world units (default 3). */
  min?: number;
  /** Points farther than this from the origin are left out of the framing. */
  cap?: number;
  ms?: number;
}

/** A named arrow with its own tail. Made by view.arrow(id, kind); hidden by view.clear(). */
export class VecArrow {
  /** The vector itself (tip minus tail). */
  vec: Vec = [0, 0];
  /** Where the tail sits. */
  from: Vec = [0, 0];
  /** The vector last given to set/grow: scaleTo(c) draws c times this. */
  base: Vec = [0, 0];
  /** Label at the middle of the shaft (beside it) or just past the tip. */
  at: 'mid' | 'tip';
  /** Which side of the shaft a 'mid' label sits on: 1 left, -1 right, 0 away from the other arrows. */
  side = 0;
  visible = false;
  text = '';
  constructor(readonly id: string, public kind: Kind, readonly arrow: Arrow, readonly tag: Label, private readonly onMove: () => void, at: 'mid' | 'tip', private readonly z: number) { this.at = at; }
  /** Change the colour (an id reused in a later round may need another one). */
  setKind(kind: Kind): void {
    if (kind === this.kind) return;
    this.kind = kind;
    this.arrow.setColor(COLORS[kind]);
    this.tag.el.className = `g-label a7-tag pk-tag ${TAG[kind]}`;
  }

  get tip(): Vec { return [this.from[0] + this.vec[0], this.from[1] + this.vec[1]]; }
  private draw(): void {
    this.arrow.set(v3(this.from, this.z), v3(this.tip, this.z));
  }
  /** Place at once: the vector `vec` with its tail at `from` (default: where the tail already is). */
  set(vec: Vec, from?: Vec): this {
    if (from) this.from = from.slice();
    this.vec = vec.slice();
    this.base = vec.slice();
    this.visible = true;
    this.arrow.setOpacity(1);
    this.draw();
    this.onMove();
    return this;
  }
  /** Draw the vector from its tail outwards (tip to tail: pass the other arrow's tip as `from`). */
  async grow(vec: Vec, o: { from?: Vec; ms?: number } = {}): Promise<void> {
    if (o.from) this.from = o.from.slice();
    this.base = vec.slice();
    this.visible = true;
    this.arrow.setOpacity(1);
    const showTag = this.tag.object.visible;
    this.tag.show(false);
    await animate(o.ms ?? 520, (k) => { this.vec = [vec[0] * k, vec[1] * k]; this.draw(); }, ease.inOut);
    this.vec = vec.slice();
    this.draw();
    if (showTag || this.text) this.tag.show(!!this.text);
    this.onMove();
  }
  /** Stretch to c times the base vector (through zero when c < 0). Returns the new vector. */
  async scaleTo(c: number, o: { ms?: number } = {}): Promise<Vec> {
    const b = this.base, k0 = len(b) < 1e-12 ? 1 : (this.vec[0] * b[0] + this.vec[1] * b[1]) / (b[0] * b[0] + b[1] * b[1]);
    const ms = o.ms ?? Math.min(1100, 420 + 160 * Math.abs(c - k0));
    this.tag.show(false);
    let crossed = false;
    await animate(ms, (t) => {
      const k = k0 + (c - k0) * t;
      if (!crossed && k * k0 < 0) { crossed = true; sfx.flip(); }
      this.vec = [b[0] * k, b[1] * k];
      this.draw();
    }, ease.inOut);
    this.vec = [b[0] * c, b[1] * c];
    this.draw();
    if (this.text) this.tag.show(true);
    this.onMove();
    return this.vec.slice();
  }
  /** Slide the whole arrow so its tail sits at `from` (the vector does not change). */
  async slide(from: Vec, ms = 450): Promise<void> {
    const f0 = this.from.slice();
    await animate(ms, (k) => { this.from = [f0[0] + (from[0] - f0[0]) * k, f0[1] + (from[1] - f0[1]) * k]; this.draw(); this.onMove(); }, ease.inOut);
  }
  /** The label (markdown with $TeX$); '' hides it. */
  label(md: string): this {
    this.text = md;
    if (md) this.tag.set(md);
    this.tag.show(!!md && this.visible);
    this.onMove();
    return this;
  }
  hide(): void { this.visible = false; this.arrow.setOpacity(0); this.tag.show(false); }
}

interface LineH { core: FatLine; glow: FatLine }
interface Marked { dot: Dot; at: Vec }

export class PlaneView {
  readonly p: PuzzleCtx;
  readonly grid: Grid2D;
  ppu = 60;
  private readonly origin = new Group();
  private readonly arrows = new Map<string, VecArrow>();
  private lines: LineH[] = [];
  private ticks: FatLine[] = [];
  private rulerOf: { v: Vec; k: number; from: Vec } | null = null;
  private pads: { pad: Pad; at: Vec }[] = [];
  private marks: Marked[] = [];
  private paints: Marked[] = [];
  private notes: Label[] = [];
  private legLines: FatLine[] = [];
  private readonly missLine: FatLine;
  private readonly ghostPad: Pad;
  private readonly ghostTag: Label;
  private framed: { pts: Vec[]; o: FrameOpts } = { pts: [], o: {} };
  private view: { c: [number, number]; h: number } | null = null;

  constructor(p: PuzzleCtx) {
    this.p = p;
    const st = p.g.stage;
    this.grid = p.grid({ main: 0.34, base: 0, axis: 0.55 });
    // the origin: a soft glow
    this.origin.add(glowSprite(C.accent, 2.4, 0.35), glowSprite('#bfe9ff', 0.9, 0.9));
    this.origin.position.set(0, 0, Z.dot);
    p.add(this.origin);
    this.missLine = new FatLine(st, [[0, 0, Z.line], [0, 0, Z.line]], { color: C.orange, width: 2, opacity: 0, dashed: true });
    p.add(this.missLine);
    this.ghostPad = new Pad(st, [0, 0, Z.dot], { color: '#e8f1ff', radius: 0.32 });
    this.ghostPad.object.visible = false;
    p.add(this.ghostPad);
    this.ghostTag = this.label('', 'tj-ghost');
    p.tick(() => this.rescale());
    const off = st.onResize(() => { if (this.framed.pts.length) void this.frame(this.framed.pts, { ...this.framed.o, ms: 0 }); });
    p.onDispose(off);
  }

  private label(text: string, cls: string): Label {
    const t = new Label(text, [0, 0, Z.dot], { className: cls });
    this.p.add(t.object);
    this.p.onDispose(() => t.dispose());
    t.show(false);
    return t;
  }

  // ---------------------------------------------------------------- framing (Chapter 18's, unchanged)

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
      const left = Math.max(dock ? dock.right : 0, tl ? tl.right : 0) + 24;
      if (W - left >= 380) return { l: left, t: (tr ? tr.bottom : 60) + 16, r: W - 24, b: H - 64 };
      return { l: 16, t: (tl ? tl.bottom : 70) + 12, r: W - 16, b: (dock ? dock.top : H - 80) - 12 };
    }
    const top = Math.max(tl ? tl.bottom : 0, tr ? tr.bottom : 0) + 10;
    const bottom = (dock ? dock.top : H - 60) - 10;
    return { l: 10, t: top, r: W - 10, b: Math.max(top + 160, bottom) };
  }

  /** Fit these points, the origin and every target ring into the free part of the screen. */
  async frame(pts: Vec[], o: FrameOpts = {}): Promise<void> {
    this.framed = { pts: pts.map((q) => q.slice()), o };
    this.watchDock();
    const st = this.p.g.stage;
    const W = st.size.x, H = st.size.y;
    const cap = o.cap ?? Infinity;
    const use = [[0, 0], ...this.pads.map((q) => q.at), ...pts].filter((q) => len(q) <= cap);
    let x0 = Math.min(...use.map((q) => q[0])), x1 = Math.max(...use.map((q) => q[0]));
    let y0 = Math.min(...use.map((q) => q[1])), y1 = Math.max(...use.map((q) => q[1]));
    const min = o.min ?? 3;
    const grow = (a: number, b: number): [number, number] => { const c = (a + b) / 2, w = Math.max(b - a, 2 * min); return [c - w / 2, c + w / 2]; };
    [x0, x1] = grow(x0, x1); [y0, y1] = grow(y0, y1);
    const R0 = this.freeRect();
    const R = { ...R0, b: R0.b - 22 };
    const pad = 46;
    const rw = Math.max(80, R.r - R.l - 2 * pad), rh = Math.max(80, R.b - R.t - 2 * pad);
    const s = Math.min(rw / (x1 - x0), rh / (y1 - y0));
    const bx = (x0 + x1) / 2, by = (y0 + y1) / 2;
    const rx = (R.l + R.r) / 2, ry = (R.t + R.b) / 2;
    const cx = bx - (rx - W / 2) / s, cy = by + (ry - H / 2) / s;
    const height = H / s;
    this.grid.setLook({ fade: Math.max(40, height * 1.4) });
    const last = this.view;
    // after the player's own pan or zoom, glide back rather than jump
    const same = last && !st.userMoved && Math.abs(last.h - height) / height < 0.04 && Math.hypot(last.c[0] - cx, last.c[1] - cy) * s < 12;
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
    for (const a of this.arrows.values()) { a.arrow.width = w; a.arrow.set(a.arrow.from.clone(), a.arrow.to.clone()); }
    this.origin.scale.setScalar(26 / ppu);
    this.ghostPad.object.scale.setScalar(44 / ppu);
    for (const { pad } of this.pads) pad.object.scale.setScalar(52 / ppu);
    for (const { dot } of this.marks) dot.object.scale.setScalar(60 / ppu);
    for (const { dot } of this.paints) dot.object.scale.setScalar(44 / ppu);
    if (this.rulerOf) this.drawRuler();
    for (const l of [this.missLine, ...this.legLines, ...this.lines.map((x) => x.core)]) { l.material.dashSize = 9 / ppu; l.material.gapSize = 7 / ppu; }
    this.placeTags();
  }

  // ---------------------------------------------------------------- arrows

  /** The arrow with this id (made on first use). Kind sets its colour; `at` where its label sits. */
  arrow(id: string, kind: Kind = 'g', o: { at?: 'mid' | 'tip' } = {}): VecArrow {
    const old = this.arrows.get(id);
    if (old) { old.setKind(kind); if (o.at) old.at = o.at; return old; }
    const z = Z.arrow + this.arrows.size * 0.002;
    const a = new Arrow([0, 0, z], [0, 0, z], { color: COLORS[kind], width: 3.1 / this.ppu });
    a.setOpacity(0);
    this.p.add(a);
    const tag = this.label('', `a7-tag pk-tag ${TAG[kind]}`);
    const va = new VecArrow(id, kind, a, tag, () => this.placeTags(), o.at ?? 'mid', z);
    this.arrows.set(id, va);
    return va;
  }

  /** Labels: past the tip, or beside the middle of the shaft on the side away from the other arrows. */
  private placeTags(): void {
    const shown = [...this.arrows.values()].filter((a) => a.visible && a.text);
    const mids = [...this.arrows.values()].filter((a) => a.visible && !isZero(a.vec)).map((a) => ({ a, m: [a.from[0] + a.vec[0] / 2, a.from[1] + a.vec[1] / 2] as Vec }));
    for (const a of shown) {
      const u = unit(isZero(a.vec) ? [1, 0] : a.vec);
      const w = a.tag.el.offsetWidth || 60, h = a.tag.el.offsetHeight || 22;
      if (a.at === 'tip' || isZero(a.vec)) {
        a.tag.at(v3(a.tip, Z.dot));
        const ext = Math.abs(u[0]) * w / 2 + Math.abs(u[1]) * h / 2 + 10;
        a.tag.el.style.translate = `${(u[0] * ext).toFixed(1)}px ${(-u[1] * ext).toFixed(1)}px`;
        continue;
      }
      const mid: Vec = [a.from[0] + a.vec[0] / 2, a.from[1] + a.vec[1] / 2];
      const n: Vec = [-u[1], u[0]];
      let side = a.side;
      if (!side) {
        const others = mids.filter((x) => x.a !== a);
        if (others.length) {
          const c = others.reduce((s, x) => [s[0] + x.m[0] / others.length, s[1] + x.m[1] / others.length], [0, 0]);
          const d = n[0] * (mid[0] - c[0]) + n[1] * (mid[1] - c[1]);
          side = Math.abs(d) < 1e-9 ? 1 : Math.sign(d);
        } else side = n[1] > 1e-9 || (Math.abs(n[1]) <= 1e-9 && n[0] < 0) ? 1 : -1;
      }
      const ext = Math.abs(n[0]) * w / 2 + Math.abs(n[1]) * h / 2 + 8;
      a.tag.at(v3(mid, Z.dot));
      a.tag.el.style.translate = `${(n[0] * side * ext).toFixed(1)}px ${(-n[1] * side * ext).toFixed(1)}px`;
    }
  }

  // ---------------------------------------------------------------- lines, rulers, legs

  /** A dashed line along `dir` through `at` (default the origin): every multiple of dir. Cleared by clear(). */
  line(dir: Vec, o: { at?: Vec; kind?: Kind; solid?: boolean } = {}): void {
    if (isZero(dir)) return;
    const u = unit(dir), at = o.at ?? [0, 0], col = COLORS[o.kind ?? 'g'];
    const pts: [number, number, number][] = [[at[0] - u[0] * L, at[1] - u[1] * L, Z.line], [at[0] + u[0] * L, at[1] + u[1] * L, Z.line]];
    const glow = new FatLine(this.p.g.stage, pts, { color: col, width: 10, opacity: 0.1, intensity: 1 });
    const core = new FatLine(this.p.g.stage, pts, { color: col, width: 1.8, opacity: 0.7, intensity: 1.2, dashed: !o.solid, dashSize: 9 / this.ppu, gapSize: 7 / this.ppu });
    this.p.add(glow); this.p.add(core);
    this.lines.push({ core, glow });
  }

  /** Short ticks at the whole multiples 1·v, 2·v, … up to k·v (negative k: −1·v, −2·v, …), starting at `from`. */
  ruler(v: Vec, k: number, from: Vec = [0, 0]): void {
    this.clearTicks();
    if (isZero(v)) return;
    this.rulerOf = { v: v.slice(), k, from: from.slice() };
    this.drawRuler();
  }
  private drawRuler(): void {
    for (const t of this.ticks) t.dispose();
    this.ticks = [];
    const r = this.rulerOf;
    if (!r) return;
    const n = Math.min(12, Math.floor(Math.abs(r.k) + 1e-9));
    const u = unit(r.v), nrm = [-u[1], u[0]], half = 9 / this.ppu, sg = Math.sign(r.k || 1);
    for (let i = 1; i <= n; i++) {
      const q = [r.from[0] + r.v[0] * i * sg, r.from[1] + r.v[1] * i * sg];
      const t = new FatLine(this.p.g.stage, [[q[0] - nrm[0] * half, q[1] - nrm[1] * half, Z.arrow + 0.02], [q[0] + nrm[0] * half, q[1] + nrm[1] * half, Z.arrow + 0.02]], { color: '#fff4e6', width: 2.4, intensity: 1.6, opacity: 0.95 });
      this.p.add(t);
      this.ticks.push(t);
    }
  }
  private clearTicks(): void { for (const t of this.ticks) t.dispose(); this.ticks = []; this.rulerOf = null; }

  /** The two legs under v: along the x-axis to [x; 0], then up to v, each with its length. Animated. */
  async legs(v: Vec, ms = 700): Promise<void> {
    const st = this.p.g.stage;
    // bright enough to read on top of the x-axis
    const mk = () => { const l = new FatLine(st, [[0, 0, Z.line + 0.004], [0, 0, Z.line + 0.004]], { color: '#fff4e6', width: 2.4, opacity: 0.95, intensity: 1.4, dashed: true, dashSize: 9 / this.ppu, gapSize: 7 / this.ppu }); this.p.add(l); this.legLines.push(l); return l; };
    const a = mk(), b = mk();
    const z = Z.line + 0.004;
    await animate(ms / 2, (k) => a.setPoints([[0, 0, z], [v[0] * k, 0, z]]), ease.out);
    if (Math.abs(v[0]) > 1e-9) this.note([v[0] / 2, 0], tn(Math.abs(v[0])), { cls: 'pk-leg', dy: v[1] >= 0 ? 14 : -14 });
    await animate(ms / 2, (k) => b.setPoints([[v[0], 0, z], [v[0], v[1] * k, z]]), ease.out);
    if (Math.abs(v[1]) > 1e-9) this.note([v[0], v[1] / 2], tn(Math.abs(v[1])), { cls: 'pk-leg', dx: v[0] >= 0 ? 16 : -16 });
  }

  /** A free label at a point (markdown with $TeX$), cleared by clear(). Offsets in px. */
  note(at: Vec, md: string, o: { kind?: Kind; cls?: string; dx?: number; dy?: number } = {}): Label {
    const t = this.label(md, o.cls ?? `a7-tag pk-tag ${TAG[o.kind ?? 'w']}`);
    t.at(v3(at, Z.dot));
    t.el.style.translate = `${o.dx ?? 0}px ${o.dy ?? 0}px`;
    t.show(true);
    this.notes.push(t);
    return t;
  }

  // ---------------------------------------------------------------- targets, ghosts, dots

  /** A target ring with an optional label. Stays until reset() (frame() always keeps it in view). */
  target(at: Vec, label = ''): Pad {
    const pad = new Pad(this.p.g.stage, v3(at, Z.dot - 0.006), { label: label || undefined });
    pad.object.scale.setScalar(52 / this.ppu);
    this.p.add(pad);
    this.pads.push({ pad, at: at.slice() });
    return pad;
  }
  removeTarget(pad: Pad): void { pad.dispose(); this.pads = this.pads.filter((q) => q.pad !== pad); }

  /** The payoff when the tip lands on a target. */
  async arrive(pad: Pad): Promise<void> {
    const st = this.p.g.stage;
    const at = this.pads.find((q) => q.pad === pad)?.at ?? [0, 0];
    sfx.arrive();
    st.flash(0.1, 320);
    void burst(st, v3(at, Z.dot), '#9ff7ff', 80, 220 / this.ppu);
    void shockwave(st, v3(at, Z.dot), C.accent, 120 / this.ppu, 900);
    pad.label?.show(false);
    await pad.hit(C.v);
  }

  /** Missed: an orange dot where the tip ended and a dashed gap to where it needed to be. */
  miss(end: Vec, at: Vec): void {
    sfx.offcourse();
    this.missLine.setPoints([v3(end, Z.line + 0.006), v3(at, Z.line + 0.006)]);
    this.missLine.setOpacity(0.9);
    this.mark(end, '', 'o');
  }

  /** A dashed ring where a typed answer would put the tip (null hides it). */
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

  /** A dot with a label (cleared by clear()). `below` puts the label under it. */
  mark(at: Vec, label = '', kind: Kind = 'w', below = false): Dot {
    const d = new Dot(v3(at, Z.dot), { color: kind === 'o' ? '#ffb347' : COLORS[kind], size: 0.06, label: label || undefined, labelOffset: [0, below ? 20 : -18] });
    d.object.scale.setScalar(60 / this.ppu);
    this.p.add(d);
    this.marks.push({ dot: d, at: at.slice() });
    return d;
  }

  /** A small dot that stays through clear() (only reset() removes it): tips painted one by one fill in a span. */
  paint(at: Vec, kind: Kind = 'y'): void {
    if (this.paints.some((q) => Math.hypot(q.at[0] - at[0], q.at[1] - at[1]) < 1e-9)) return;
    const d = new Dot(v3(at, Z.paint), { color: COLORS[kind], size: 0.06, glow: 1 });
    d.object.scale.setScalar(44 / this.ppu);
    d.setOpacity(0.75);
    this.p.add(d);
    this.paints.push({ dot: d, at: at.slice() });
  }
  get painted(): Vec[] { return this.paints.map((q) => q.at.slice()); }

  // ---------------------------------------------------------------- clearing

  /** Drop the last attempt: arrows, lines, ticks, legs, notes, marks, the miss and the ghost. Keeps targets and paint. */
  clear(): void {
    for (const a of this.arrows.values()) { a.hide(); a.text = ''; a.side = 0; }
    for (const l of this.lines) { l.core.dispose(); l.glow.dispose(); }
    this.lines = [];
    this.clearTicks();
    for (const l of this.legLines) l.dispose();
    this.legLines = [];
    for (const t of this.notes) t.dispose();
    this.notes = [];
    for (const { dot } of this.marks) dot.dispose();
    this.marks = [];
    this.missLine.setOpacity(0);
    this.ghost(null);
  }
  /** Drop everything, targets and paint too (a new round). */
  reset(): void {
    this.clear();
    for (const { pad } of this.pads) pad.dispose();
    this.pads = [];
    for (const { dot } of this.paints) dot.dispose();
    this.paints = [];
  }

  // ---------------------------------------------------------------- moves (moves.ts)

  /** u, then v from u's tip, then u + v from the origin. Returns u + v. */
  addTipToTail(u: Vec, v: Vec, o?: MoveOpts): Promise<Vec> { return addTipToTail(this, u, v, o); }
  /** v, then c·v along v's line (through zero when c < 0), with ticks at whole multiples. Returns c·v. */
  scale(c: number, v: Vec, o?: MoveOpts): Promise<Vec> { return scale(this, c, v, o); }
  /** a·u, then b·v from its tip, then a·u + b·v from the origin. Returns the sum. */
  combine(a: number, u: Vec, b: number, v: Vec, o?: MoveOpts): Promise<Vec> { return combine(this, a, u, b, v, o); }
  /** v, its two legs, and ‖v‖ = √(x² + y²). Returns the length. */
  length(v: Vec, o?: MoveOpts): Promise<number> { return length(this, v, o); }
}
