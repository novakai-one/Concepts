// The picture of a linear system, kept in sync with a RowOpsBoard: each row of [A | b] is a line
// (2 unknowns) or a plane (3 unknowns) in its row's colour, and the solutions are drawn in yellow
// (a glowing point, or a glowing line when there are infinitely many).
//
// The teaching point: a row operation changes one line or plane but never the solutions. When a row
// changes, its line / plane turns about the place where the old and new versions meet (a point in 2-D,
// a line in 3-D). Every solution lies there, so the yellow point stays fixed while the row turns
// through it. A faint copy of the old position fades out so the turn is visible.
import type { PuzzleCtx, V3 } from '../game/types';
import type { Object3D, Sprite } from 'three';
import { Frac, fmat, type FMat } from '../math/frac';
import { classify, rref, type Classification } from '../math/rref';
import { PlanePatch } from '../gfx/shapes';
import { FatLine, FatSegments } from '../gfx/lines';
import { Dot, glowSprite } from '../gfx/markers';
import { Label } from '../gfx/label';
import { shockwave } from '../gfx/fx';
import { C } from '../core/theme';
import { animate, ease, type Handle } from '../core/tween';
import { rowColor, type RowOpsBoard } from './rowops';
import { defaultNames, eqTex, fracText, rowPermutation } from './rowops-logic';
import {
  add, clipToSquare, dot, hingeTween, normHyper, planeFrame, planePlaneLine, projectTo, rowHyper, scale, sub, unit,
  type HingeTween, type Hyper, type Vec,
} from './system-geom';

export interface SystemViewOpts {
  n: 2 | 3;
  /** The starting augmented matrix [A | b]. */
  aug: (number | Frac)[][];
  /** Follow this board: every operation on it animates here. */
  board?: RowOpsBoard;
  /** Unknown names in TeX (default x, y, z). */
  varNames?: string[];
  /** Equation labels on the lines / planes (default true). */
  labels?: boolean;
  /** Move the camera to the picture (default true). */
  frame?: boolean;
  /** Shift the picture right by this many pixels, clear of the dock (default: from the board's dock). */
  shiftPx?: number;
  /** Side length of each plane patch in 3-D (default 7). */
  planeSize?: number;
  /** Animation length when a row changes, in ms (default 900; the board passes its own). */
  ms?: number;
}

interface RowGfx {
  id: number;
  color: string;
  row: Frac[];
  /** The line / plane (unit normal) once animations finish; null when the row reads 0 = c. */
  hyper: Hyper | null;
  /** What is on screen right now (mid-animation too); null when hidden. */
  shown: Hyper | null;
  line: FatLine | null;
  glow: FatLine | null;
  plane: PlanePatch | null;
  label: Label | null;
}

interface Change { g: RowGfx; tw: HingeTween | null; from: Hyper | null; to: Hyper | null; ghost: { setOpacity(a: number): void; dispose(): void } | null }

const sameRow = (a: Frac[], b: Frac[]) => a.length === b.length && a.every((x, i) => x.eq(b[i]));
const bump = (k: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, k)));

export class SystemView {
  readonly n: 2 | 3;
  readonly names: string[];
  private readonly p: PuzzleCtx;
  private readonly o: SystemViewOpts;
  private m: FMat;
  private ids: number[];
  private readonly rows: RowGfx[] = [];
  private focus: Vec;
  private cls: Classification;
  private readonly half: number;
  private pairs: FatSegments | null = null;
  private dot: Dot | null = null;
  private aura: Sprite | null = null;
  private solLabel: Label | null = null;
  private solLine: FatLine | null = null;
  private solGlow: FatLine | null = null;
  private drop: FatLine | null = null;
  private anim: { handle: Handle; finish: () => void } | null = null;
  private readonly ghosts = new Set<{ dispose(): void }>();
  private pulseT = -1;
  /** 2-D: where along its line each label sits (world units from the point nearest the focus). */
  private readonly labelT = new Map<number, number>();
  /** 3-D: where on its patch each label sits, in half-sizes along the patch edges (u, v). */
  private readonly labelAB = new Map<number, [number, number]>();
  private shift = 0;
  private disposed = false;
  private camReady = false;
  private solDir: Vec | null = null;

  constructor(p: PuzzleCtx, o: SystemViewOpts) {
    this.p = p;
    this.o = o;
    this.n = o.n;
    this.names = o.varNames ?? defaultNames(o.n);
    this.m = fmat(o.aug);
    this.ids = this.m.map((_, i) => i);
    this.half = (o.planeSize ?? 7) / 2;
    this.cls = classify(this.m, this.n);
    this.focus = this.findFocus();
    const stage = p.g.stage;

    if (this.n === 2) p.grid();
    else this.buildAxes();

    // the solutions (under the rows)
    this.buildSolution();

    // one line / plane per row
    this.m.forEach((row, id) => {
      const color = rowColor(id);
      const g: RowGfx = { id, color, row, hyper: normHyper(rowHyper(row, this.n)), shown: null, line: null, glow: null, plane: null, label: null };
      if (this.n === 2) {
        g.glow = new FatLine(stage, [[0, 0, 0], [1, 0, 0]], { color, width: 10, intensity: 1.2, opacity: 0.16 });
        g.line = new FatLine(stage, [[0, 0, 0], [1, 0, 0]], { color, width: 3.2, intensity: 1.5, opacity: 0.95 });
        p.add(g.glow, g.line);
      } else {
        g.plane = new PlanePatch(stage, [0, 0, 0], [0, 0, 1], { color, size: this.half * 2, opacity: 0.13 });
        p.add(g.plane);
      }
      if (o.labels !== false) {
        g.label = new Label('', [0, 0, 0], { className: 'rob-eq', color });
        p.add(g.label);
      }
      this.rows.push(g);
    });
    if (this.n === 3) {
      this.pairs = new FatSegments(stage, [], { color: '#f2f6ff', width: 1.8, intensity: 1.5, opacity: 0.75 });
      p.add(this.pairs);
    }
    this.drawAll();

    // the yellow point breathes; it pulses after each row operation
    p.tick((_dt, t) => {
      if (!this.aura) return;
      let k = 0.5 + 0.5 * Math.sin(t * 2.6);
      if (this.pulseT >= 0) {
        if (this.pulseT === 0) this.pulseT = t;
        const e = (t - this.pulseT) / 0.9;
        if (e >= 1) this.pulseT = -1; else k += 1.6 * bump(e);
      }
      this.aura.material.opacity = 0.32 + 0.22 * k;
      this.aura.scale.setScalar((this.n === 3 ? 1.25 : 1.0) * (1 + 0.18 * k));
    });

    if (o.frame !== false) this.frameCamera();
    if (o.board) {
      const off = o.board.subscribe((m, _op, ms) => { void this.update(m, o.board!.order(), ms); });
      p.onDispose(off);
    }
    // place the labels once the rest of the puzzle UI (readout, cards) is on screen
    window.setTimeout(() => { if (!this.disposed) this.drawAll(); }, 60);
    p.onDispose(() => {
      this.disposed = true;
      this.anim?.handle.cancel();
      this.anim = null;
      for (const g of this.ghosts) g.dispose();
      this.ghosts.clear();
    });
  }

  // ------------------------------------------------------------------ public API

  /** The current matrix. */
  get(): FMat { return this.m.map((r) => r.slice()); }

  /** Solutions of the system (the same before and after any row operation). */
  classification(): Classification { return this.cls; }

  /** The point the picture is centred on: the solution, or the solution nearest the origin. */
  get center(): V3 { return [this.focus[0], this.focus[1], this.focus[2] ?? 0]; }

  /**
   * Show a new matrix. Rows that changed turn to their new place about the hinge they share with
   * their old place. `order` gives each position's row identity (colour); without it a pure reordering
   * is detected and other changes keep the colours where they are.
   */
  update(mIn: (number | Frac)[][], order?: number[], ms = this.o.ms ?? 900): Promise<void> {
    const m = fmat(mIn);
    if (m.length !== this.m.length) throw new Error('SystemView.update: row count changed');
    let ids: number[];
    if (order) ids = order.slice();
    else {
      const perm = rowPermutation(this.m, m);
      const changed = m.filter((r, i) => !sameRow(r, this.m[i])).length;
      ids = perm ? perm.map((k) => this.ids[k]) : changed <= 1 ? this.ids.slice() : m.map((_, i) => i);
    }
    this.finishAnim();
    const cls = classify(m, this.n);
    if (cls.kind !== this.cls.kind) { // a different system (set(), not a row operation): rebuild the markers
      this.cls = cls;
      this.focus = this.findFocus();
      this.rebuildSolution();
    }
    const changes: Change[] = [];
    ids.forEach((id, pos) => {
      const g = this.rows[id];
      const row = m[pos];
      if (sameRow(g.row, row)) return;
      g.row = row;
      const to = normHyper(rowHyper(row, this.n));
      const from = g.hyper;
      const tw = from && to ? hingeTween(from, to) : null;
      if (tw?.kind === 'same') { g.hyper = tw.at(1); return; }
      changes.push({ g, tw, from, to, ghost: null });
    });
    this.m = m;
    this.ids = ids;
    if (!changes.length || ms <= 0) {
      for (const c of changes) c.g.hyper = c.tw ? c.tw.at(1) : c.to;
      this.drawAll();
      return Promise.resolve();
    }
    // a faint copy of each old position, fading out
    for (const c of changes) if (c.from) c.ghost = this.makeGhost(c.g, c.from);
    const finish = () => {
      for (const c of changes) {
        c.g.hyper = c.tw ? c.tw.at(1) : c.to;
        if (c.ghost) { c.ghost.dispose(); this.ghosts.delete(c.ghost); }
      }
      this.drawAll();
    };
    const handle = animate(ms, (k) => {
      for (const c of changes) {
        const glow = bump(k);
        if (c.tw) this.drawRow(c.g, c.tw.at(k), 1, glow);
        else if (c.from && !c.to) this.drawRow(c.g, c.from, 1 - k, glow);
        else if (!c.from && c.to) this.drawRow(c.g, c.to, k, glow);
        c.ghost?.setOpacity(0.55 * (1 - k));
      }
      this.drawPairs();
    }, ease.inOut);
    this.anim = { handle, finish };
    this.pulse();
    return handle.then(() => this.finishAnim());
  }

  /** Show a matrix immediately (no animation). */
  set(m: (number | Frac)[][], order?: number[]): void { void this.update(m, order, 0); }

  // ------------------------------------------------------------------ drawing

  private finishAnim(): void {
    const a = this.anim;
    if (!a) return;
    this.anim = null;
    a.handle.cancel();
    a.finish();
  }

  private findFocus(): Vec {
    const n = this.n;
    const c = this.cls;
    if (c.kind === 'unique') return c.x.map((v) => v.value());
    if (c.kind === 'infinite') {
      // the solution nearest the origin: remove the parts of the particular solution along the free directions
      let p = c.particular.map((v) => v.value());
      const basis: Vec[] = [];
      for (const d0 of c.directions) {
        let d = d0.map((v) => v.value());
        for (const b of basis) d = sub(d, scale(b, dot(d, b)));
        const u = unit(d);
        if (u) basis.push(u);
      }
      for (const b of basis) p = sub(p, scale(b, dot(p, b)));
      return p;
    }
    // no solution: the average of the points of each line / plane nearest the origin
    const pts = this.m.map((r) => normHyper(rowHyper(r, n))).filter((h): h is Hyper => !!h).map((h) => projectTo(h, new Array(n).fill(0)));
    if (!pts.length) return new Array(n).fill(0);
    return scale(pts.reduce((a, b) => add(a, b)), 1 / pts.length);
  }

  private v3(v: Vec, z = 0): V3 { return [v[0], v[1], this.n === 3 ? v[2] : z]; }

  private drawAll(): void {
    for (const g of this.rows) this.labelRow(g);
    if (this.n === 2) this.placeLabels2D(); else this.placeLabels3D();
    for (const g of this.rows) this.drawRow(g, g.hyper, g.hyper ? 1 : 0, 0);
    this.drawPairs();
  }

  /** Screen rectangles of the panels and buttons over the picture. */
  private uiBlocks(): DOMRect[] {
    return [...document.querySelectorAll('.l-scene > *, .hud-tl, .hud-br, .hud-tr')]
      .map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
  }

  /**
   * 3-D: once the camera has settled, put each plane's label at the spot on its patch's rim that is on
   * screen, clear of the panels and apart from the other labels (it then moves with its plane).
   */
  private placeLabels3D(): void {
    if (!this.camReady) return;
    const st = this.p.g.stage;
    st.camera.updateMatrixWorld();
    const W = st.size.x, H = st.size.y;
    const blocks = this.uiBlocks();
    const fp = st.toScreen(this.center);
    const placed: { x: number; y: number; w: number; h: number }[] = [{ x: fp.x, y: fp.y + 14, w: 130, h: 56 }];
    const free = (x: number, y: number, w: number, h: number) => {
      if (x - w / 2 < 10 || x + w / 2 > W - 10 || y - h / 2 < 10 || y + h / 2 > H - 10) return false;
      if (blocks.some((r) => x + w / 2 > r.left - 6 && x - w / 2 < r.right + 6 && y + h / 2 > r.top - 6 && y - h / 2 < r.bottom + 6)) return false;
      return placed.every((q) => Math.abs(q.x - x) > (q.w + w) / 2 + 4 || Math.abs(q.y - y) > (q.h + h) / 2 + 2);
    };
    const size = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return [Math.max(r.width, 110), Math.max(r.height, 24)]; };
    const cands: [number, number][] = [[0.75, 0.85], [-0.75, 0.85], [0, 0.9], [0.9, 0.35], [-0.9, 0.35], [0.9, -0.35], [-0.9, -0.35], [0.75, -0.85], [-0.75, -0.85], [0, -0.9], [0.45, 0.45], [-0.45, 0.45]];
    for (const g of this.rows) {
      const h = g.hyper;
      if (!h || !g.label) continue;
      const [bw, bh] = size(g.label.el);
      const c = projectTo(h, this.focus);
      const [u, v] = planeFrame(h.n);
      const at = (ab: [number, number]) => st.toScreen(this.v3(add(c, add(scale(u, ab[0] * this.half), scale(v, ab[1] * this.half)))));
      const cur = this.labelAB.get(g.id);
      const pick = (cur ? [cur, ...cands] : cands).find((ab) => { const q = at(ab); return free(q.x, q.y, bw, bh); }) ?? cur ?? cands[0];
      this.labelAB.set(g.id, pick);
      const q = at(pick);
      placed.push({ x: q.x, y: q.y, w: bw, h: bh });
    }
    if (this.solLabel && this.solDir) {
      const [bw, bh] = size(this.solLabel.el);
      const L = this.half * 1.25;
      const ts = [0.92, -0.92, 0.7, -0.7, 0.5, -0.5];
      const pt = (t: number): V3 => this.v3(add(this.focus, scale(this.solDir!, t * L)));
      const t = ts.find((t) => { const q = st.toScreen(pt(t)); return free(q.x, q.y - 18, bw, bh); }) ?? ts[0];
      this.solLabel.at(pt(t));
    }
  }

  /**
   * 2-D: choose where each equation label sits along its line so that it is on screen, clear of the
   * panels, and apart from the other labels. Uses the final camera (centred on the focus, shifted).
   */
  private placeLabels2D(): void {
    const st = this.p.g.stage;
    const W = st.size.x, H = st.size.y;
    const ppu = H / 10;
    const toPx = (v: Vec) => [W / 2 + this.shift + (v[0] - this.focus[0]) * ppu, H / 2 - (v[1] - this.focus[1]) * ppu];
    const blocks = this.uiBlocks();
    const fp = toPx(this.focus);
    const placed: number[][] = [fp];
    const cands = [2.8, -2.8, 3.6, -3.6, 2.1, -2.1, 4.4, -4.4, 5.2, -5.2, 6, -6];
    for (const g of this.rows) {
      const h = g.hyper;
      if (!h || !g.label) continue;
      const p0 = projectTo(h, this.focus);
      const d = [-h.n[1], h.n[0]];
      const nn = h.n[1] >= 0 ? h.n : scale(h.n, -1);
      const fits = (t: number) => {
        const w = add(add(p0, scale(d, t)), scale(nn, 0.38));
        const [x, y] = toPx(w);
        const bw = 150, bh = 34;
        if (x - bw / 2 < 12 || x + bw / 2 > W - 12 || y - bh / 2 < 12 || y + bh / 2 > H - 12) return false;
        if (blocks.some((r) => x + bw / 2 > r.left - 8 && x - bw / 2 < r.right + 8 && y + bh / 2 > r.top - 8 && y - bh / 2 < r.bottom + 8)) return false;
        return placed.every((q) => Math.abs(q[0] - x) > bw * 0.8 || Math.abs(q[1] - y) > bh * 1.4);
      };
      const cur = this.labelT.get(g.id);
      const t = (cur !== undefined ? [cur, ...cands] : cands).find(fits) ?? cur ?? 2.8;
      this.labelT.set(g.id, t);
      placed.push(toPx(add(p0, scale(d, t))));
    }
  }

  /** Place one row's line / plane at hyperplane h with visibility vis (0..1) and extra glow (0..1). */
  private drawRow(g: RowGfx, h: Hyper | null, vis: number, glow: number): void {
    g.shown = h && vis > 0.001 ? h : null;
    if (this.n === 2) {
      if (!h || vis <= 0.001) { g.line!.setOpacity(0); g.glow!.setOpacity(0); g.label?.show(false); return; }
      const p0 = projectTo(h, this.focus);
      const d = [-h.n[1], h.n[0]];
      const L = 60;
      const pts: V3[] = [[p0[0] - d[0] * L, p0[1] - d[1] * L, 0.02], [p0[0] + d[0] * L, p0[1] + d[1] * L, 0.02]];
      g.line!.setPoints(pts);
      g.glow!.setPoints(pts);
      g.line!.setOpacity(0.95 * vis);
      g.line!.material.linewidth = 3.2 + 1.6 * glow;
      g.glow!.setOpacity((0.16 + 0.3 * glow) * vis);
    } else {
      const pl = g.plane!;
      if (!h || vis <= 0.001) { pl.setOpacity(0); pl.group.visible = false; g.label?.show(false); return; }
      pl.group.visible = true;
      const c = projectTo(h, this.focus);
      const [u, v] = planeFrame(h.n);
      pl.setSpan(this.v3(c), this.v3(u), this.v3(v));
      pl.setOpacity(vis * (1 + 0.9 * glow));
    }
    if (g.label) {
      g.label.show(vis > 0.5);
      g.label.at(this.labelPos(g, h));
      g.label.el.style.opacity = String(Math.min(1, vis));
    }
  }

  private labelPos(g: RowGfx, h: Hyper): V3 {
    if (this.n === 2) {
      const p0 = projectTo(h, this.focus);
      const d = [-h.n[1], h.n[0]];
      const t = this.labelT.get(g.id) ?? 2.8;
      const nn = h.n[1] >= 0 ? h.n : scale(h.n, -1);
      const w = add(add(p0, scale(d, t)), scale(nn, 0.38));
      return [w[0], w[1], 0.05];
    }
    const c = projectTo(h, this.focus);
    const [u, v] = planeFrame(h.n);
    const [a, b] = this.labelAB.get(g.id) ?? [[0.75, 0.85], [-0.75, 0.85], [0, -0.9]][g.id % 3];
    return this.v3(add(c, add(scale(u, a * this.half), scale(v, b * this.half))));
  }

  private labelRow(g: RowGfx): void {
    if (!g.label) return;
    const zero = g.row.slice(0, this.n).every((x) => x.isZero());
    if (zero) { g.label.show(false); return; }
    g.label.set(`$${eqTex(g.row, this.n, this.names)}$`);
  }

  /** In 3-D: where each pair of planes meets (clipped to both patches). */
  private drawPairs(): void {
    if (!this.pairs) return;
    const segs: [V3, V3][] = [];
    const live = this.rows.map((g) => g.shown).filter((h): h is Hyper => !!h);
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
    this.pairs.setSegments(segs);
    this.pairs.object.visible = segs.length > 0;
  }

  private makeGhost(g: RowGfx, h: Hyper): { setOpacity(a: number): void; dispose(): void } {
    const stage = this.p.g.stage;
    let ghost: { setOpacity(a: number): void; dispose(): void; object: Object3D };
    if (this.n === 2) {
      const p0 = projectTo(h, this.focus);
      const d = [-h.n[1], h.n[0]];
      const L = 60;
      const line = new FatLine(stage, [[p0[0] - d[0] * L, p0[1] - d[1] * L, 0.015], [p0[0] + d[0] * L, p0[1] + d[1] * L, 0.015]],
        { color: g.color, width: 2, intensity: 1.1, opacity: 0.55, dashed: true, dashSize: 0.22, gapSize: 0.16 });
      ghost = line;
    } else {
      const pl = new PlanePatch(stage, [0, 0, 0], [0, 0, 1], { color: g.color, size: this.half * 2, opacity: 0.16 });
      const c = projectTo(h, this.focus);
      const [u, v] = planeFrame(h.n);
      pl.setSpan(this.v3(c), this.v3(u), this.v3(v));
      ghost = { object: pl.object, setOpacity: (a: number) => pl.setOpacity(a), dispose: () => pl.dispose() };
    }
    stage.world.add(ghost.object);
    this.ghosts.add(ghost);
    return ghost;
  }

  // ------------------------------------------------------------------ the solutions

  private buildSolution(): void {
    const p = this.p, stage = p.g.stage;
    const c = this.cls;
    if (c.kind === 'unique') {
      const s = this.v3(this.focus, 0.06);
      this.aura = glowSprite(C.result, 1, 0.5);
      this.aura.position.set(...s);
      p.add(this.aura);
      this.dot = new Dot(s, { color: C.result, size: this.n === 3 ? 0.13 : 0.11, glow: 2.2 });
      p.add(this.dot);
      const coords = c.x.map((v) => fracText(v)).join(', ');
      this.solLabel = new Label(`(${coords})`, s, { className: 'rob-sol', offset: [0, 26] });
      p.add(this.solLabel);
      if (this.n === 3 && Math.abs(s[2]) > 0.05) {
        this.drop = new FatLine(stage, [s, [s[0], s[1], 0]], { color: C.result, width: 1.4, opacity: 0.45, dashed: true, dashSize: 0.12, gapSize: 0.1 });
        p.add(this.drop);
      }
    } else if (c.kind === 'infinite' && c.directions.length === 1) {
      const d = unit(c.directions[0].map((v) => v.value()))!;
      this.solDir = d;
      const L = this.n === 2 ? 60 : this.half * 1.25;
      const a = this.v3(sub(this.focus, scale(d, L)), 0.01), b = this.v3(add(this.focus, scale(d, L)), 0.01);
      this.solGlow = new FatLine(stage, [a, b], { color: C.result, width: 14, intensity: 1.3, opacity: 0.22 });
      this.solLine = new FatLine(stage, [a, b], { color: C.result, width: this.n === 2 ? 2 : 4, intensity: 2.2, opacity: this.n === 2 ? 0.6 : 0.95 });
      p.add(this.solGlow, this.solLine);
      if (this.n === 3) {
        this.solLabel = new Label('every point on this line is a solution', this.v3(add(this.focus, scale(d, L * 0.92))), { className: 'rob-sol', offset: [0, -18] });
        p.add(this.solLabel);
      }
    }
  }

  private rebuildSolution(): void {
    for (const o of [this.aura, this.dot, this.solLabel, this.solLine, this.solGlow, this.drop]) {
      if (!o) continue;
      const d = (o as { dispose?: () => void }).dispose;
      if (d) d.call(o); else (o as Sprite).removeFromParent();
    }
    this.aura = null; this.dot = null; this.solLabel = null; this.solLine = null; this.solGlow = null; this.drop = null; this.solDir = null;
    this.buildSolution();
  }

  /** A ring and a brighter glow at the solution point: it has not moved. */
  private pulse(): void {
    if (this.cls.kind !== 'unique') return;
    this.pulseT = 0;
    void shockwave(this.p.g.stage, this.v3(this.focus, 0.04), C.result, 1.1, 800);
  }

  // ------------------------------------------------------------------ scene

  private buildAxes(): void {
    const p = this.p, stage = p.g.stage;
    p.grid({ base: 0.12, main: 0.2, axis: 0.35, fade: 9 });
    const L = 4.5;
    const axes = new FatSegments(stage, [[[-L, 0, 0], [L, 0, 0]], [[0, -L, 0], [0, L, 0]], [[0, 0, -L * 0.7], [0, 0, L * 0.9]]], { color: C.axis, width: 1.2, opacity: 0.35 });
    p.add(axes);
    const names = this.names;
    const ends: V3[] = [[L + 0.35, 0, 0], [0, L + 0.35, 0], [0, 0, L * 0.9 + 0.35]];
    ends.forEach((e, i) => p.add(new Label(`$${names[i]}$`, e, { className: 'rob-axis' })));
  }

  /**
   * 3-D: the camera direction (azimuth / elevation in degrees) that shows every plane at a slant:
   * |camera · normal| inside [0.3, 0.8] for each plane (not edge-on, not face-on), checked for the
   * starting rows and, more lightly, the reduced rows. A solution line is seen at a slant too, so it
   * shows its length and the planes fan out around it. Ties go to the usual view.
   */
  private bestView(): { azimuth: number; elevation: number } {
    const normals = (m: FMat) => m.map((r) => normHyper(rowHyper(r, 3))).filter((h): h is Hyper => !!h).map((h) => h.n);
    const start = normals(this.m);
    const end = normals(rref(this.m, 3));
    const line = this.solDir;
    const out = (x: number, lo: number, hi: number) => Math.max(0, lo - x) + Math.max(0, x - hi);
    let best = { azimuth: -58, elevation: 24 }, bestScore = -Infinity;
    for (let az = -180; az < 180; az += 3) {
      for (let el = 14; el <= 40; el += 2) {
        const A = (az * Math.PI) / 180, E = (el * Math.PI) / 180;
        const c = [Math.cos(E) * Math.cos(A), Math.cos(E) * Math.sin(A), Math.sin(E)];
        let s = 0;
        for (const n of start) s -= out(Math.abs(dot(c, n)), 0.3, 0.8);
        for (const n of end) s -= 0.3 * out(Math.abs(dot(c, n)), 0.2, 0.9);
        if (line) s -= 1.5 * out(Math.abs(dot(c, line)), 0.55, 0.85);
        s -= 0.0004 * Math.abs(((az + 58 + 540) % 360) - 180) + 0.001 * Math.abs(el - 24);
        if (s > bestScore) { bestScore = s; best = { azimuth: az, elevation: el }; }
      }
    }
    return best;
  }

  private frameCamera(): void {
    const stage = this.p.g.stage;
    const f = this.center;
    if (this.n === 3) {
      void stage.view3D({ target: f, distance: 21, ...this.bestView(), ms: 900 }).then(() => {
        this.camReady = true;
        if (!this.disposed) this.drawAll();
      });
    } else void stage.view2D({ center: [f[0], f[1]], height: 10, ms: 700 });
    let shift = this.o.shiftPx;
    if (shift === undefined) {
      const dock = this.o.board?.el.closest('.dock') ?? this.o.board?.el;
      const r = dock?.getBoundingClientRect();
      shift = r && r.width > 0 && stage.size.x > 900 ? Math.min(stage.size.x * 0.22, r.right / 2) : 0;
    }
    if (!shift) return;
    this.shift = shift;
    const px = shift;
    const off = stage.onResize((w, h) => { stage.camera.setViewOffset(w, h, -px, 0, w, h); });
    this.p.onDispose(() => { off(); stage.camera.clearViewOffset(); });
  }
}
