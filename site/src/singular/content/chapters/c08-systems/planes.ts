// PlaneSet: the row picture of a linear system for Act III. Each row of [A | b] is a line (2 unknowns)
// or a plane (3 unknowns) in its row colour; where pairs of planes meet is drawn in white; the
// solutions (a point or a line) in yellow, optionally. Rows glow on request (a marker sitting on them).
//
// Unlike kit/system.ts (SystemView, which follows a RowOpsBoard and assumes every change is a row
// operation), PlaneSet takes any new rows: the solution markers are recomputed after every change,
// and they can be hidden while the player is still hunting for the point (Chapter 8).
import { Group, type Object3D, type Sprite } from 'three';
import type { Game, V3 } from '../../../game/types';
import { PlanePatch } from '../../../gfx/shapes';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { Dot, glowSprite } from '../../../gfx/markers';
import { Label } from '../../../gfx/label';
import { C } from '../../../core/theme';
import { animate, ease, type Handle } from '../../../core/tween';
import {
  add, clipToSquare, dot, hingeTween, normHyper, planeFrame, planePlaneLine, projectTo, rowHyper, scale, sub, unit,
  type HingeTween, type Hyper, type Vec,
} from '../../../kit/system-geom';
import { classifyAug, pt, rowTex, type Aug } from './act3';

/** Row colours by row index: green, red, blue (the kit's colours). */
export const PLANE_COLORS = [C.v, C.w, C.u, C.violet, C.orange];

/** What PlaneSet needs from its owner: a puzzle context, a Doubt scene, or a bare cinematic host. */
export interface Host {
  g: Game;
  add(...objs: (Object3D | { object: Object3D })[]): void;
  onDispose(fn: () => void): void;
  tick(fn: (dt: number, t: number) => void): void;
}

export interface PlaneSetOpts {
  n: 2 | 3;
  rows: Aug;
  names?: string[];
  /** Equation labels on each line / plane (default true). */
  labels?: boolean;
  /** Draw the solutions in yellow (default true). */
  showSolution?: boolean;
  /** Coordinates label next to a single solution point (default true). */
  solutionLabel?: boolean;
  /** 3-D: white lines where pairs of planes meet (default true). */
  pairs?: boolean;
  /** 3-D: side of each square plane patch (default 8). */
  size?: number;
  /** Centre of the picture (default: the solution, or the point nearest the origin). */
  focus?: number[];
  /** 2-D: clip lines to this box [x0, y0, x1, y1] (default: long lines). */
  box?: [number, number, number, number];
  /** Draw x, y, z axes and a floor grid in 3-D (default true). */
  axes?: boolean;
  colors?: string[];
  /** Plane fill strength (default 1). */
  opacity?: number;
}

interface RowG {
  row: number[];
  hyper: Hyper | null;
  shown: Hyper | null;
  color: string;
  line: FatLine | null;
  glowLine: FatLine | null;
  plane: PlanePatch | null;
  label: Label | null;
  glow: number;
  vis: number;
}

const bump = (k: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, k)));

export class PlaneSet {
  readonly n: 2 | 3;
  readonly root = new Group();
  readonly names: string[];
  private rowsG: RowG[] = [];
  private m: Aug;
  private readonly o: PlaneSetOpts;
  private readonly host: Host;
  private focus: number[];
  private readonly half: number;
  private pairs: FatSegments | null = null;
  private sol: { dot: Dot; aura: Sprite; label: Label | null } | null = null;
  private solLine: { line: FatLine; glow: FatLine } | null = null;
  private showSol: boolean;
  private anim: Handle | null = null;
  private pendingEnd: (() => void) | null = null;
  private readonly labelAB = new Map<number, [number, number]>();
  private readonly labelT = new Map<number, number>();
  private pulseT = -1;
  private disposed = false;
  private fadeK = 1;

  constructor(host: Host, o: PlaneSetOpts) {
    this.host = host;
    this.o = o;
    this.n = o.n;
    this.names = o.names ?? ['x', 'y', 'z'];
    this.m = o.rows.map((r) => r.slice());
    this.half = (o.size ?? 8) / 2;
    this.showSol = o.showSolution !== false;
    this.focus = o.focus ? o.focus.slice() : this.findFocus();
    host.add(this.root);
    if (this.n === 3 && o.axes !== false) this.buildAxes();
    this.m.forEach((row, i) => this.rowsG.push(this.makeRow(row, i)));
    if (this.n === 3 && o.pairs !== false) {
      this.pairs = new FatSegments(host.g.stage, [], { color: '#f2f6ff', width: 1.8, intensity: 1.5, opacity: 0.75 });
      this.root.add(this.pairs.object);
    }
    this.buildSolution();
    this.drawAll();
    host.tick((_dt, t) => this.breathe(t));
    host.onDispose(() => this.dispose());
  }

  // ------------------------------------------------------------------ public

  get rows(): Aug { return this.m.map((r) => r.slice()); }
  get center(): V3 { return [this.focus[0], this.focus[1], this.n === 3 ? this.focus[2] : 0]; }
  classification() { return classifyAug(this.m); }

  /** Show new rows. Each changed row turns about the line (or point) it shares with its old place. */
  setRows(rows: Aug, ms = 700): Promise<void> {
    this.finish();
    const old = this.rowsG.map((g) => g.hyper);
    // rows added or removed: rebuild
    if (rows.length !== this.m.length) {
      for (const g of this.rowsG) this.disposeRow(g);
      this.m = rows.map((r) => r.slice());
      this.rowsG = this.m.map((r, i) => this.makeRow(r, i));
      this.rebuildSolution();
      this.drawAll();
      return Promise.resolve();
    }
    const solBefore = JSON.stringify(this.solutionKey());
    const changes: { g: RowG; tw: HingeTween | null; from: Hyper | null; to: Hyper | null }[] = [];
    rows.forEach((row, i) => {
      const g = this.rowsG[i];
      if (row.every((x, c) => Math.abs(x - g.row[c]) < 1e-12)) return;
      g.row = row.slice();
      const to = normHyper(rowHyper(row, this.n));
      const from = old[i];
      const tw = from && to ? hingeTween(from, to) : null;
      changes.push({ g, tw, from, to });
    });
    this.m = rows.map((r) => r.slice());
    if (!changes.length) return Promise.resolve();
    for (const c of changes) this.labelRow(c.g);
    const end = () => {
      for (const c of changes) c.g.hyper = c.tw ? c.tw.at(1) : c.to;
      if (JSON.stringify(this.solutionKey()) !== solBefore) this.rebuildSolution();
      this.drawAll();
      this.placeLabels(); // the planes moved: find label spots clear of each other again
    };
    if (ms <= 0) { end(); return Promise.resolve(); }
    this.pendingEnd = end;
    // hide the old solution while rows move if it is about to change
    const solChanges = JSON.stringify(this.solutionKey()) !== solBefore;
    if (solChanges) this.fadeSolution(0);
    const h = animate(ms, (k) => {
      for (const c of changes) {
        const glow = bump(k);
        if (c.tw) this.drawRow(c.g, c.tw.at(k), 1, glow);
        else if (c.from && !c.to) this.drawRow(c.g, c.from, 1 - k, glow);
        else if (!c.from && c.to) this.drawRow(c.g, c.to, k, glow);
      }
      this.drawPairs();
    }, ease.inOut);
    this.anim = h;
    this.pulseT = 0;
    return h.then(() => { if (this.anim === h) { this.anim = null; this.pendingEnd = null; end(); } });
  }

  /** Extra glow on row i (0..1): a marker sitting on its plane. */
  setGlow(i: number, k: number): void {
    const g = this.rowsG[i];
    if (!g || Math.abs(g.glow - k) < 1e-3) return;
    g.glow = k;
    this.drawRow(g, g.shown ?? g.hyper, g.vis, 0);
    g.label?.el.classList.toggle('c08-on', k > 0.5);
  }

  /** Hide or show row i (fade). */
  setRowVisible(i: number, on: boolean): void {
    const g = this.rowsG[i];
    if (!g) return;
    g.vis = on ? 1 : 0;
    this.drawRow(g, g.hyper, g.vis, 0);
    this.drawPairs();
  }

  /** Show or hide the yellow solution markers. */
  showSolution(on: boolean): void {
    this.showSol = on;
    this.rebuildSolution();
  }

  /** Fade the whole picture (0..1), e.g. for a cinematic reveal. */
  setFade(k: number): void {
    this.fadeK = k;
    for (const g of this.rowsG) this.drawRow(g, g.shown ?? g.hyper, g.vis, 0);
    this.pairs?.setOpacity(0.75 * k);
  }

  /** Pulse the solution point (a row operation just happened and it did not move). */
  pulse(): void { this.pulseT = 0; }

  /** Move the picture's centre (patches re-centre on it). */
  setFocus(f: number[]): void { this.focus = f.slice(); this.drawAll(); }

  /** 3-D: move the focus and the camera's aim to f, keeping the current view direction and distance. */
  async refocus(f: number[], ms = 300): Promise<void> {
    this.setFocus(f);
    if (this.n !== 3) return;
    const st = this.host.g.stage;
    const off = st.camera.position.clone().sub(st.target);
    const d = off.length();
    if (d < 1e-6) return;
    const az = (Math.atan2(off.y, off.x) * 180) / Math.PI, el = (Math.asin(off.z / d) * 180) / Math.PI;
    await st.view3D({ target: [f[0], f[1], f[2]], distance: d, azimuth: az, elevation: el, ms });
    this.placeLabels();
  }

  /** Choose label places that avoid the panels; call once the camera has settled. */
  placeLabels(): void {
    if (this.disposed) return;
    if (this.n === 3) this.placeLabels3D(); else this.placeLabels2D();
    for (const g of this.rowsG) if (g.label && g.hyper) g.label.at(this.labelPos(g, g.shown ?? g.hyper));
  }

  /**
   * The camera direction that shows every plane at a slant (not edge-on, not face-on), as in
   * SystemView. Returns azimuth / elevation in degrees.
   */
  bestView(): { azimuth: number; elevation: number } {
    const normals = this.rowsG.map((g) => g.hyper?.n).filter((x): x is Vec => !!x);
    const k = this.classification();
    const line = k.kind === 'infinite' && k.directions.length === 1 ? unit(k.directions[0].map((v) => v.value())) : null;
    const out = (x: number, lo: number, hi: number) => Math.max(0, lo - x) + Math.max(0, x - hi);
    let best = { azimuth: -58, elevation: 24 }, bestScore = -Infinity;
    for (let az = -180; az < 180; az += 3) {
      for (let el = 14; el <= 40; el += 2) {
        const A = (az * Math.PI) / 180, E = (el * Math.PI) / 180;
        const c = [Math.cos(E) * Math.cos(A), Math.cos(E) * Math.sin(A), Math.sin(E)];
        let s = 0;
        for (const n of normals) s -= out(Math.abs(dot(c, n)), 0.3, 0.8);
        if (line) s -= 1.5 * out(Math.abs(dot(c, line)), 0.55, 0.85);
        s -= 0.0004 * Math.abs(((az + 58 + 540) % 360) - 180) + 0.001 * Math.abs(el - 24);
        if (s > bestScore) { bestScore = s; best = { azimuth: az, elevation: el }; }
      }
    }
    return best;
  }

  /**
   * Put the camera on the picture. 3-D: the best slanted view (or the one given), orbit on.
   * shiftPx moves the picture right, clear of the dock.
   */
  async frame(o: { azimuth?: number; elevation?: number; distance?: number; height?: number; shiftPx?: number; ms?: number; target?: number[] } = {}): Promise<void> {
    const st = this.host.g.stage;
    const shift = o.shiftPx ?? (st.size.x > 900 ? Math.min(st.size.x * 0.16, 230) : 0);
    if (shift) {
      const off = st.onResize((w, h) => st.camera.setViewOffset(w, h, -shift, 0, w, h));
      this.host.onDispose(() => { off(); st.camera.clearViewOffset(); });
    }
    const t = (o.target ?? this.center) as number[];
    if (this.n === 3) {
      const v = o.azimuth !== undefined ? { azimuth: o.azimuth, elevation: o.elevation ?? 24 } : this.bestView();
      await st.view3D({ target: [t[0], t[1], t[2] ?? 0], distance: o.distance ?? 21, ...v, ms: o.ms ?? 800 });
    } else {
      await st.view2D({ center: [t[0], t[1]], height: o.height ?? 10, ms: o.ms ?? 600 });
    }
    window.setTimeout(() => this.placeLabels(), 40);
  }

  // ------------------------------------------------------------------ rows

  private makeRow(row: number[], i: number): RowG {
    const color = (this.o.colors ?? PLANE_COLORS)[i % (this.o.colors ?? PLANE_COLORS).length];
    const stage = this.host.g.stage;
    const g: RowG = { row: row.slice(), hyper: normHyper(rowHyper(row, this.n)), shown: null, color, line: null, glowLine: null, plane: null, label: null, glow: 0, vis: 1 };
    if (this.n === 2) {
      g.glowLine = new FatLine(stage, [[0, 0, 0], [1, 0, 0]], { color, width: 10, intensity: 1.2, opacity: 0.16 });
      g.line = new FatLine(stage, [[0, 0, 0], [1, 0, 0]], { color, width: 3.2, intensity: 1.5, opacity: 0.95 });
      this.root.add(g.glowLine.object, g.line.object);
    } else {
      g.plane = new PlanePatch(stage, [0, 0, 0], [0, 0, 1], { color, size: this.half * 2, opacity: 0.13 });
      this.root.add(g.plane.object);
    }
    if (this.o.labels !== false) {
      g.label = new Label('', [0, 0, 0], { className: 'rob-eq c08-eq', color });
      this.root.add(g.label.object);
    }
    this.labelRow(g);
    return g;
  }

  private disposeRow(g: RowG): void {
    g.line?.dispose(); g.glowLine?.dispose(); g.plane?.dispose(); g.label?.dispose();
  }

  private labelRow(g: RowG): void {
    if (!g.label) return;
    const zero = g.row.slice(0, this.n).every((x) => Math.abs(x) < 1e-12);
    g.label.set(zero ? '' : `$${rowTex(g.row, this.names)}$`);
  }

  private drawAll(): void {
    for (const g of this.rowsG) this.drawRow(g, g.hyper, g.vis, 0);
    this.drawPairs();
  }

  private drawRow(g: RowG, h: Hyper | null, vis: number, glow: number): void {
    g.shown = h && vis > 0.001 ? h : null;
    const lit = g.glow;
    if (this.n === 2) {
      if (!h || vis <= 0.001) { g.line!.setOpacity(0); g.glowLine!.setOpacity(0); g.label?.show(false); return; }
      const p0 = projectTo(h, this.focus);
      const d = [-h.n[1], h.n[0]];
      let a: Vec, b: Vec;
      const box = this.o.box;
      if (box) {
        const seg = clipBox(p0, d, box);
        if (!seg) { g.line!.setOpacity(0); g.glowLine!.setOpacity(0); g.label?.show(false); return; }
        [a, b] = seg;
      } else { a = sub(p0, scale(d, 60)); b = add(p0, scale(d, 60)); }
      const pts: V3[] = [[a[0], a[1], 0.02], [b[0], b[1], 0.02]];
      g.line!.setPoints(pts);
      g.glowLine!.setPoints(pts);
      g.line!.setOpacity(0.95 * vis);
      g.line!.material.linewidth = 3.2 + 1.6 * glow + 1.4 * lit;
      g.glowLine!.setOpacity((0.16 + 0.3 * glow + 0.3 * lit) * vis);
    } else {
      const pl = g.plane!;
      if (!h || vis <= 0.001) { pl.setOpacity(0); pl.group.visible = false; g.label?.show(false); return; }
      pl.group.visible = true;
      const c = projectTo(h, this.focus);
      const [u, v] = planeFrame(h.n);
      pl.setSpan(this.v3(c), this.v3(u), this.v3(v));
      pl.setOpacity(vis * this.fadeK * (this.o.opacity ?? 1) * (1 + 0.9 * glow + 1.3 * lit));
    }
    if (g.label) {
      const empty = !g.label.el.textContent;
      g.label.show(vis > 0.5 && !empty);
      g.label.at(this.labelPos(g, h));
    }
  }

  private v3(v: Vec, z = 0): V3 { return [v[0], v[1], this.n === 3 ? v[2] : z]; }

  private drawPairs(): void {
    if (!this.pairs) return;
    const segs: [V3, V3][] = [];
    const live = this.rowsG.map((g) => g.shown).filter((h): h is Hyper => !!h);
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      const L = planePlaneLine(a, b);
      if (!L) continue;
      let lo = -Infinity, hi = Infinity, ok = true;
      for (const h of [a, b]) {
        const c = projectTo(h, this.focus);
        const [u, v] = planeFrame(h.n);
        const r = clipToSquare(L.q, L.d, c, u, v, this.half);
        if (!r) { ok = false; break; }
        lo = Math.max(lo, r[0]); hi = Math.min(hi, r[1]);
      }
      if (!ok || lo >= hi) continue;
      segs.push([this.v3(add(L.q, scale(L.d, lo))), this.v3(add(L.q, scale(L.d, hi)))]);
    }
    this.pairs.setSegments(segs.length ? segs : [[[0, 0, -999], [0, 0, -999]]]);
    this.pairs.object.visible = segs.length > 0;
  }

  // ------------------------------------------------------------------ labels

  private labelPos(g: RowG, h: Hyper | null): V3 {
    if (!h) return [0, 0, -999];
    const i = this.rowsG.indexOf(g);
    if (this.n === 2) {
      const p0 = projectTo(h, this.focus);
      const d = [-h.n[1], h.n[0]];
      const nn = h.n[1] >= 0 ? h.n : scale(h.n, -1);
      if (this.o.box) {
        // inside a box: a fraction of the way along the visible piece of the line, clear of the
        // labels of the rows before it (two lines leaving the box together must not stack labels)
        const at = this.boxLabels(i);
        if (at) return [at[0], at[1], 0.05];
      }
      const t = this.labelT.get(i) ?? [2.6, -2.6, 3.4][i % 3];
      const w = add(add(p0, scale(d, t)), scale(nn, 0.4));
      return [w[0], w[1], 0.05];
    }
    const c = projectTo(h, this.focus);
    const [u, v] = planeFrame(h.n);
    const [a, b] = this.labelAB.get(i) ?? ([[0.72, 0.85], [-0.72, 0.85], [0.72, -0.85]][i % 3] as [number, number]);
    return this.v3(add(c, add(scale(u, a * this.half), scale(v, b * this.half))));
  }

  private avoidPts: number[][] = [];
  /** 2-D box mode: points whose tags the equation labels should stay clear of (used at the next placeLabels). */
  setAvoid(pts: number[][]): void { this.avoidPts = pts.map((q) => q.slice()); }

  /** 2-D box mode: label spots for rows 0 … i, each the first candidate clear of the earlier ones. */
  private boxLabels(i: number): number[] | null {
    const box = this.o.box!;
    const spots: (number[] | null)[] = [];
    for (let j = 0; j <= i && j < this.rowsG.length; j++) {
      const h = this.rowsG[j].shown;
      const seg = h ? clipBox(projectTo(h, this.focus), [-h.n[1], h.n[0]], box) : null;
      if (!h || !seg) { spots.push(null); continue; }
      const nn = h.n[1] >= 0 ? h.n : scale(h.n, -1);
      const cands = [[0.78, 0.8, 0.5][j % 3], 0.22, 0.62, 0.38, 0.9, 0.1];
      const pos = (f: number) => add(add(seg[0], scale(sub(seg[1], seg[0]), f)), scale(nn, 0.42));
      const clear = (w: number[]) => spots.every((q) => !q || Math.abs(q[0] - w[0]) > 1.7 || Math.abs(q[1] - w[1]) > 0.6)
        // and clear of a point's tag (drawn just above the point)
        && this.avoidPts.every((q) => Math.abs(q[0] - w[0]) > 1.5 || Math.abs(q[1] + 0.4 - w[1]) > 0.55);
      spots.push(cands.map(pos).find(clear) ?? pos(cands[0]));
    }
    return spots[i] ?? null;
  }

  private uiBlocks(): DOMRect[] {
    return [...document.querySelectorAll('.l-scene > *, .hud-tl, .hud-br, .hud-tr')]
      .map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
  }

  private placeLabels3D(): void {
    const st = this.host.g.stage;
    st.camera.updateMatrixWorld();
    const W = st.size.x, H = st.size.y;
    const blocks = this.uiBlocks();
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    if (this.sol) { const q = st.toScreen(this.v3(this.focus)); placed.push({ x: q.x, y: q.y + 14, w: 130, h: 50 }); }
    const free = (x: number, y: number, w: number, h: number) => {
      if (x - w / 2 < 10 || x + w / 2 > W - 10 || y - h / 2 < 10 || y + h / 2 > H - 10) return false;
      if (blocks.some((r) => x + w / 2 > r.left - 6 && x - w / 2 < r.right + 6 && y + h / 2 > r.top - 6 && y - h / 2 < r.bottom + 6)) return false;
      return placed.every((q) => Math.abs(q.x - x) > (q.w + w) / 2 + 4 || Math.abs(q.y - y) > (q.h + h) / 2 + 2);
    };
    const cands: [number, number][] = [[0.72, 0.85], [-0.72, 0.85], [0, 0.9], [0.9, 0.35], [-0.9, 0.35], [0.9, -0.35], [-0.9, -0.35], [0.72, -0.85], [-0.72, -0.85], [0, -0.9], [0.45, 0.45], [-0.45, 0.45], [0.45, -0.45], [-0.45, -0.45]];
    this.rowsG.forEach((g, i) => {
      const h = g.hyper;
      if (!h || !g.label) return;
      const r = g.label.el.getBoundingClientRect();
      const bw = Math.max(r.width, 110), bh = Math.max(r.height, 24);
      const c = projectTo(h, this.focus);
      const [u, v] = planeFrame(h.n);
      const at = (ab: [number, number]) => st.toScreen(this.v3(add(c, add(scale(u, ab[0] * this.half), scale(v, ab[1] * this.half)))));
      const pick = cands.find((ab) => { const q = at(ab); return free(q.x, q.y, bw, bh); }) ?? cands[i % cands.length];
      this.labelAB.set(i, pick);
      const q = at(pick);
      placed.push({ x: q.x, y: q.y, w: bw, h: bh });
    });
  }

  private placeLabels2D(): void {
    const st = this.host.g.stage;
    st.camera.updateMatrixWorld();
    const W = st.size.x, H = st.size.y;
    const blocks = this.uiBlocks();
    const placed: { x: number; y: number }[] = [];
    if (this.sol) { const q = st.toScreen(this.v3(this.focus)); placed.push({ x: q.x, y: q.y }); }
    const cands = [2.6, -2.6, 3.4, -3.4, 1.8, -1.8, 4.2, -4.2, 5, -5];
    this.rowsG.forEach((g, i) => {
      const h = g.hyper;
      if (!h || !g.label) return;
      const p0 = projectTo(h, this.focus);
      const d = [-h.n[1], h.n[0]];
      const nn = h.n[1] >= 0 ? h.n : scale(h.n, -1);
      const box = this.o.box;
      const fits = (t: number) => {
        const w = add(add(p0, scale(d, t)), scale(nn, 0.4));
        if (box && (w[0] < box[0] + 0.6 || w[0] > box[2] - 0.6 || w[1] < box[1] + 0.3 || w[1] > box[3] - 0.3)) return false;
        const q = st.toScreen([w[0], w[1], 0]);
        const bw = 140, bh = 32;
        if (q.x - bw / 2 < 12 || q.x + bw / 2 > W - 12 || q.y - bh / 2 < 12 || q.y + bh / 2 > H - 12) return false;
        if (blocks.some((r) => q.x + bw / 2 > r.left - 8 && q.x - bw / 2 < r.right + 8 && q.y + bh / 2 > r.top - 8 && q.y - bh / 2 < r.bottom + 8)) return false;
        return placed.every((o) => Math.abs(o.x - q.x) > bw * 0.85 || Math.abs(o.y - q.y) > bh * 1.3);
      };
      const t = cands.find(fits) ?? cands[i % 2];
      this.labelT.set(i, t);
      const w = add(add(p0, scale(d, t)), scale(nn, 0.4));
      placed.push(st.toScreen([w[0], w[1], 0]));
    });
  }

  // ------------------------------------------------------------------ solutions

  private solutionKey(): unknown {
    const k = this.classification();
    if (k.kind === 'unique') return ['u', ...k.x.map(String)];
    if (k.kind === 'infinite') return ['i', k.particular.map(String), k.directions.map((d) => d.map(String))];
    return ['n'];
  }

  private findFocus(): number[] {
    const k = classifyAug(this.m);
    if (k.kind === 'unique') return k.x.map((v) => v.value());
    if (k.kind === 'infinite') {
      let p = k.particular.map((v) => v.value());
      const basis: Vec[] = [];
      for (const d0 of k.directions) {
        let d = d0.map((v) => v.value());
        for (const b of basis) d = sub(d, scale(b, dot(d, b)));
        const u = unit(d);
        if (u) basis.push(u);
      }
      for (const b of basis) p = sub(p, scale(b, dot(p, b)));
      return p;
    }
    const pts = this.m.map((r) => normHyper(rowHyper(r, this.n))).filter((h): h is Hyper => !!h).map((h) => projectTo(h, new Array(this.n).fill(0)));
    if (!pts.length) return new Array(this.n).fill(0);
    return scale(pts.reduce((a, b) => add(a, b)), 1 / pts.length);
  }

  private buildSolution(): void {
    if (!this.showSol) return;
    const stage = this.host.g.stage;
    const k = this.classification();
    if (k.kind === 'unique') {
      const x = k.x.map((v) => v.value());
      const s = this.v3(x, 0.06);
      const aura = glowSprite(C.result, 1, 0.5);
      aura.position.set(...s);
      const d = new Dot(s, { color: C.result, size: this.n === 3 ? 0.13 : 0.11, glow: 2.2 });
      const label = this.o.solutionLabel === false ? null : new Label(pt(x), s, { className: 'rob-sol', offset: [0, 26] });
      this.root.add(aura, d.object);
      if (label) this.root.add(label.object);
      this.sol = { dot: d, aura, label };
    } else if (k.kind === 'infinite' && k.directions.length === 1) {
      const p = k.particular.map((v) => v.value());
      const dir = unit(k.directions[0].map((v) => v.value()))!;
      // centre the drawn piece on the point of the line nearest the focus
      const c = add(p, scale(dir, dot(sub(this.focus, p), dir)));
      const L = this.n === 2 ? 60 : this.half * 1.25;
      // 2-D with a box: the solution line stops at the box like the rows do
      const seg = this.n === 2 && this.o.box ? clipBox(c, dir, this.o.box) : null;
      const a = this.v3(seg ? seg[0] : sub(c, scale(dir, L)), 0.01), b = this.v3(seg ? seg[1] : add(c, scale(dir, L)), 0.01);
      const glow = new FatLine(stage, [a, b], { color: C.result, width: 14, intensity: 1.3, opacity: 0.22 });
      const line = new FatLine(stage, [a, b], { color: C.result, width: this.n === 2 ? 2.4 : 4, intensity: 2.2, opacity: this.n === 2 ? 0.7 : 0.95 });
      this.root.add(glow.object, line.object);
      this.solLine = { line, glow };
    }
  }

  private rebuildSolution(): void {
    if (this.sol) { this.sol.dot.dispose(); this.sol.aura.removeFromParent(); this.sol.aura.material.dispose(); this.sol.label?.dispose(); this.sol = null; }
    if (this.solLine) { this.solLine.line.dispose(); this.solLine.glow.dispose(); this.solLine = null; }
    this.buildSolution();
  }

  private fadeSolution(a: number): void {
    if (this.sol) { this.sol.dot.setOpacity(a); this.sol.aura.material.opacity = 0.5 * a; this.sol.label?.show(a > 0.5); }
    if (this.solLine) { this.solLine.line.setOpacity(0.95 * a); this.solLine.glow.setOpacity(0.22 * a); }
  }

  private breathe(t: number): void {
    if (!this.sol) return;
    let k = 0.5 + 0.5 * Math.sin(t * 2.6);
    if (this.pulseT >= 0) {
      if (this.pulseT === 0) this.pulseT = t;
      const e = (t - this.pulseT) / 0.9;
      if (e >= 1) this.pulseT = -1; else k += 1.6 * bump(e);
    }
    this.sol.aura.material.opacity = 0.32 + 0.22 * k;
    this.sol.aura.scale.setScalar((this.n === 3 ? 1.25 : 1.0) * (1 + 0.18 * k));
  }

  // ------------------------------------------------------------------ scene

  private buildAxes(): void {
    const stage = this.host.g.stage;
    const L = 4.5;
    const axes = new FatSegments(stage, [[[-L, 0, 0], [L, 0, 0]], [[0, -L, 0], [0, L, 0]], [[0, 0, -L * 0.7], [0, 0, L * 0.9]]], { color: C.axis, width: 1.2, opacity: 0.35 });
    this.root.add(axes.object);
    const ends: V3[] = [[L + 0.35, 0, 0], [0, L + 0.35, 0], [0, 0, L * 0.9 + 0.35]];
    ends.forEach((e, i) => { const l = new Label(`$${this.names[i]}$`, e, { className: 'rob-axis' }); this.root.add(l.object); });
    this.host.onDispose(() => axes.dispose());
  }

  private finish(): void {
    if (this.anim) { const a = this.anim; this.anim = null; a.cancel(); }
    const e = this.pendingEnd;
    this.pendingEnd = null;
    e?.();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.anim?.cancel();
    for (const g of this.rowsG) this.disposeRow(g);
    this.pairs?.dispose();
    this.rebuildSolutionDispose();
    sweepLabels(this.root);
    this.root.removeFromParent();
  }

  private rebuildSolutionDispose(): void {
    if (this.sol) { this.sol.dot.dispose(); this.sol.aura.material.dispose(); this.sol.label?.dispose(); this.sol = null; }
    if (this.solLine) { this.solLine.line.dispose(); this.solLine.glow.dispose(); this.solLine = null; }
  }
}

/**
 * Remove the DOM elements of every label (CSS2DObject) inside a group. three's CSS2DRenderer only
 * removes a label's element when the label itself is removed, not when a parent group is.
 */
export function sweepLabels(o: Object3D): void {
  o.traverse((n) => {
    const el = (n as Object3D & { element?: Element }).element;
    if (el instanceof Element) el.remove();
  });
}

/** A faint frame around a 2-D box: lines clipped to it end at a visible edge. */
export function boxFrame(host: Host, b: [number, number, number, number]): void {
  const f = new FatLine(host.g.stage, [[b[0], b[1], -0.01], [b[2], b[1], -0.01], [b[2], b[3], -0.01], [b[0], b[3], -0.01], [b[0], b[1], -0.01]], { color: '#59e1ff', width: 1.2, opacity: 0.3 });
  host.add(f.object);
  host.onDispose(() => f.dispose());
}

/** Clip the line p + s·d to an axis box; null when it misses. */
export function clipBox(p: number[], d: number[], box: [number, number, number, number]): [number[], number[]] | null {
  let lo = -Infinity, hi = Infinity;
  for (let k = 0; k < 2; k++) {
    const mn = box[k], mx = box[k + 2];
    if (Math.abs(d[k]) < 1e-12) { if (p[k] < mn || p[k] > mx) return null; continue; }
    let a = (mn - p[k]) / d[k], b = (mx - p[k]) / d[k];
    if (a > b) [a, b] = [b, a];
    lo = Math.max(lo, a); hi = Math.min(hi, b);
  }
  if (lo >= hi) return null;
  return [add(p, scale(d, lo)), add(p, scale(d, hi))];
}

/** A Host for cinematics and card visuals: objects go straight into the world (cleared by the runner). */
export function worldHost(g: Game): Host & { disposeAll(): void; holder: Group } {
  const fns: (() => void)[] = [];
  const holder = new Group();
  const disposeAll = () => { for (const f of fns.splice(0)) { try { f(); } catch { /* gone */ } } sweepLabels(holder); };
  holder.userData.dispose = disposeAll;
  g.stage.world.add(holder);
  return {
    g, holder,
    add: (...objs) => { for (const o of objs) holder.add('isObject3D' in o ? (o as Object3D) : (o as { object: Object3D }).object); },
    onDispose: (fn) => { fns.push(fn); },
    tick: (fn) => { const off = g.stage.tick(fn); fns.push(off as () => void); },
    disposeAll,
  };
}
