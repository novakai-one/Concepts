// Prologue: the chart. The kit's PlaneView (grid, origin, framing, arrows, ghost ring) plus what the kit
// lacks: the whole grid moves by a matrix and carries a row of points with it (Chapter 18's TrajView.pulse
// idea, without the ship). Green: a point before the move. Yellow: where it lands. A faint dashed line runs
// through the row, so the picture shows the line staying straight.
import type { PuzzleCtx } from '../../../game/types';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { Dot } from '../../../gfx/markers';
import { C } from '../../../core/theme';
import { animate, animSpeed, ease } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { identity, interpMat2, type Mat } from '../../../math/la';
import { PlaneView, isZero, tv, type Vec } from '../../../kit/plain';
import { mv } from './logic';

const I: Mat = identity(2);
const Z = { line: 0.008, dot: 0.06 };
const FAR = 400;

/** How the grid gets from I to M: frame by frame, a matrix. */
export type Path = (k: number) => Mat;
export { instant };
export const pathTo = (M: Mat): Path => (k) => interpMat2(I, M, k, 'auto');

interface Pt { p: Vec; dot: Dot; tag: Label | null }

/** The solver runs at test speed: skip the motion and show where everything ends (no frames to wait for). */
const instant = () => animSpeed() >= 100;
const unit = (v: Vec): Vec => { const n = Math.hypot(v[0], v[1]); return n < 1e-12 ? [1, 0] : [v[0] / n, v[1] / n]; };

export class MoveChart {
  readonly view: PlaneView;
  /** The matrix the grid shows now. */
  M: Mat = I;
  private path: Path = () => I;
  private pts: Pt[] = [];
  private extra: Pt | null = null;
  /** Faint green dots left where the points started (apply with keep). */
  private starts: Dot[] = [];
  private readonly line: FatLine;
  private gen = 0;

  constructor(readonly p: PuzzleCtx) {
    this.view = new PlaneView(p);
    const grid = this.view.grid;
    // a move that flips the plane passes through flat: no violet landing line here, the grid just thins out
    const set0 = grid.set.bind(grid);
    grid.set = (M: Mat, T?: [number, number]) => { set0(M, T); grid.mesh.children.forEach((c) => { c.visible = false; }); };
    grid.set(I);
    this.line = new FatLine(p.g.stage, [[0, 0, Z.line], [1, 0, Z.line]], { color: C.v, width: 1.4, opacity: 0, intensity: 1.1, dashed: true, dashSize: 0.15, gapSize: 0.12 });
    p.add(this.line);
    p.tick(() => this.rescale());
    // runDrill resets the view between rounds: the points and the moved grid go too
    const reset0 = this.view.reset.bind(this.view);
    this.view.reset = () => { reset0(); this.clear(); this.home(); };
  }

  private rescale(): void {
    const ppu = this.view.ppu;
    for (const q of this.all()) q.dot.object.scale.setScalar(60 / ppu);
    for (const d of this.starts) d.object.scale.setScalar(60 / ppu);
    this.line.material.dashSize = 9 / ppu;
    this.line.material.gapSize = 7 / ppu;
  }
  private all(): Pt[] { return this.extra ? [...this.pts, this.extra] : this.pts; }

  private dot(at: Vec, color: string): Dot {
    const d = new Dot([at[0], at[1], Z.dot], { color, size: 0.075, glow: 1.3 });
    d.object.scale.setScalar(60 / this.view.ppu);
    this.p.add(d);
    return d;
  }
  private tag(kind: 'g' | 'y'): Label {
    const t = new Label('', [0, 0, Z.dot], { className: `a7-tag pk-tag ${kind}` });
    this.p.add(t.object);
    this.p.onDispose(() => t.dispose());
    t.show(false);
    return t;
  }

  /** Put a label beside a point, on the side of the row away from the origin (dir: the row's direction). */
  private place(t: Label, at: Vec, dir: Vec, mid: Vec): void {
    const u = unit(isZero(dir) ? [1, 0] : dir);
    let n: Vec = [-u[1], u[0]];
    const side = n[0] * mid[0] + n[1] * mid[1];
    if (Math.abs(side) < 1e-6) { if (n[1] < -1e-9 || (Math.abs(n[1]) <= 1e-9 && n[0] > 0)) n = [-n[0], -n[1]]; } else if (side < 0) n = [-n[0], -n[1]];
    t.at([at[0], at[1], Z.dot]);
    const w = t.el.offsetWidth || 36, h = t.el.offsetHeight || 46;
    const ext = Math.abs(n[0]) * w / 2 + Math.abs(n[1]) * h / 2 + 10;
    t.el.style.translate = `${(n[0] * ext).toFixed(1)}px ${(-n[1] * ext).toFixed(1)}px`;
  }

  private labelRow(pts: Pt[], kind: 'g' | 'y', at: (q: Pt) => Vec): void {
    if (!pts.length) return;
    const ps = pts.map(at);
    const dir: Vec = ps.length > 1 ? [ps[ps.length - 1][0] - ps[0][0], ps[ps.length - 1][1] - ps[0][1]] : ps[0];
    const mid: Vec = [ps.reduce((s, q) => s + q[0], 0) / ps.length, ps.reduce((s, q) => s + q[1], 0) / ps.length];
    pts.forEach((q, i) => {
      if (!q.tag) return;
      q.tag.el.className = `g-label a7-tag pk-tag ${kind}`;
      q.tag.set(`$${tv(ps[i])}$`);
      q.tag.show(true);
      this.place(q.tag, ps[i], dir, mid);
    });
  }

  /** The dashed line through two points (hidden when they coincide). */
  private drawLine(a: Vec, b: Vec): void {
    const d: Vec = [b[0] - a[0], b[1] - a[1]];
    if (Math.hypot(d[0], d[1]) < 1e-6) { this.line.setOpacity(0); return; }
    const u = unit(d);
    this.line.setPoints([[a[0] - u[0] * FAR, a[1] - u[1] * FAR, Z.line], [a[0] + u[0] * FAR, a[1] + u[1] * FAR, Z.line]]);
  }

  /** Green points (before the move) and the line through them. labels: show their values now (where they
   *  land is always labelled after the move). */
  points(ps: Vec[], o: { labels?: boolean } = {}): void {
    this.clear();
    this.pts = ps.map((q) => ({ p: q.slice(), dot: this.dot(q, C.v), tag: this.tag('g') }));
    if (o.labels) this.labelRow(this.pts, 'g', (q) => q.p);
    if (ps.length > 1) {
      this.line.setColor(C.v, 1.1);
      this.drawLine(ps[0], ps[ps.length - 1]);
      this.line.setOpacity(0.45);
    }
  }

  /** Move the whole grid from I to M and every point with it. The faint old grid stays underneath.
   *  keep: a faint green dot stays where each point started (unlabelled). */
  async apply(M: Mat, o: { path?: Path; ms?: number; flash?: boolean; keep?: boolean } = {}): Promise<void> {
    const my = ++this.gen;
    const st = this.p.g.stage;
    this.M = M;
    this.path = o.path ?? pathTo(M);
    const grid = this.view.grid;
    for (const q of this.pts) q.tag?.show(false);
    if (o.keep) this.starts = this.pts.map((q) => { const d = this.dot(q.p, C.v); d.setOpacity(0.4); return d; });
    grid.setLook({ base: 0.45 });
    const ms = o.ms ?? 1500;
    sfx.pulse(ms / 1000);
    if (o.flash) st.flash(0.08, 420);
    void st.shockwave([0, 0, 0], ms + 300, 0.3);
    const n = this.pts.length;
    if (!instant()) await animate(ms, (k) => {
      if (my !== this.gen) return;
      const Mt = this.path(k);
      grid.set(Mt);
      for (const q of this.pts) { const r = mv(Mt, q.p); q.dot.at([r[0], r[1], Z.dot]); }
      if (n > 1) this.drawLine(mv(Mt, this.pts[0].p), mv(Mt, this.pts[n - 1].p));
    }, ease.inOut);
    if (my !== this.gen) return;
    grid.set(M);
    for (const q of this.pts) { const r = mv(M, q.p); q.dot.at([r[0], r[1], Z.dot]); q.dot.setColor(C.result); }
    this.line.setColor(C.result, 1.1);
    this.labelRow(this.pts, 'y', (q) => mv(M, q.p));
    sfx.snap();
  }

  /** One more green point at p, labelled (the grid has moved; this point has not yet). */
  ask(p: Vec): void {
    this.extra?.dot.dispose();
    this.extra?.tag?.dispose();
    const tag = this.tag('g');
    this.extra = { p: p.slice(), dot: this.dot(p, C.v), tag };
    tag.set(`$${tv(p)}$`);
    tag.show(true);
    // beside the point, on the side away from the landed row
    const qs = this.pts.map((x) => mv(this.M, x.p));
    const mid: Vec = qs.length ? [qs.reduce((a, q) => a + q[0], 0) / qs.length, qs.reduce((a, q) => a + q[1], 0) / qs.length] : [0, 0];
    const away: Vec = [p[0] - mid[0], p[1] - mid[1]];
    const u = unit(isZero(away) ? [0, 1] : away);
    tag.at([p[0], p[1], Z.dot]);
    const ext = Math.abs(u[0]) * 18 + Math.abs(u[1]) * 23 + 10;
    tag.el.style.translate = `${(u[0] * ext).toFixed(1)}px ${(-u[1] * ext).toFixed(1)}px`;
  }

  /** The asked point moves to where M sends it, along the same path, and turns yellow (labelled). */
  async land(o: { label?: boolean; ms?: number } = {}): Promise<void> {
    const q = this.extra;
    if (!q) return;
    const my = this.gen;
    const end = mv(this.M, q.p);
    if (!instant()) await animate(o.ms ?? 900, (k) => {
      if (my !== this.gen) return;
      const r = mv(this.path(k), q.p);
      q.dot.at([r[0], r[1], Z.dot]);
      q.tag?.show(false);
    }, ease.inOut);
    if (my !== this.gen) return;
    q.dot.at([end[0], end[1], Z.dot]);
    q.dot.setColor(C.result);
    q.tag?.dispose();
    q.tag = null;
    if (o.label) {
      q.tag = this.tag('y');
      // beside the row it joins
      this.pts.push(q);
      this.extra = null;
      this.labelRow(this.pts, 'y', (x) => mv(this.M, x.p));
    }
  }

  /** Remove the points and the line (the grid stays as it is). */
  clear(): void {
    this.gen++;
    for (const q of this.all()) { q.dot.dispose(); q.tag?.dispose(); }
    for (const d of this.starts) d.dispose();
    this.pts = [];
    this.starts = [];
    this.extra = null;
    this.line.setOpacity(0);
  }

  /** The grid back to I at once. */
  home(): void {
    this.M = I;
    this.view.grid.set(I);
    this.view.grid.setLook({ base: 0, main: 0.34, axis: 0.55 });
  }

  /** The moved grid fades out and the plain grid fades back in (never runs backwards). */
  async settle(): Promise<void> {
    const grid = this.view.grid;
    if (instant()) { this.home(); return; }
    await grid.fadeTo({ main: 0, axis: 0, base: 0 }, 260);
    this.home();
    grid.setLook({ main: 0, axis: 0 });
    await grid.fadeTo({ main: 0.34, axis: 0.55 }, 300);
  }
}
