// Chapter 20 pictures: the flow board (sections as compartments, one light per drone, every hour each drone
// moves by the chain's shares) and the triangle of all splits (a split of the drones is a point; every
// start's path is drawn hour by hour).
import { BufferAttribute, BufferGeometry, Color, Points, PointsMaterial, Vector3 } from 'three';
import type { PuzzleCtx, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { Label } from '../../../gfx/label';
import { FatLine } from '../../../gfx/lines';
import { C } from '../../../core/theme';
import { animate, ease } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { rng } from '../../../game/lawcheck';
import { matVec, type Mat, type Vec } from '../../../math/la';
import { ptag } from '../c18-eigen/parts';
import { TRI, apportion, fmtN, triPoint, triSplit } from './logic';

export { TRI, apportion, triPoint, triSplit };

const SECTION_COLORS = ['#9fd8ff', '#c9b49a', '#ffd166'];
export const SECTIONS_AT: [number, number][] = [[-3, -1.2], [3, -1.2], [0, 2.2]];

/** Frame the three sections to the right of the dock and below the readout. */
export const boardView = (p: PuzzleCtx, cx = -2.6): Promise<void> => p.g.stage.view2D({ center: [cx, 0.5], height: 10, ms: 0 });

export interface FlowOpts { P: Mat; x0: Vec; names: string[]; centres?: [number, number][]; total?: number; w?: number; hgt?: number }

/** Compartments with one light per drone; each hour every drone moves by the shares in its own column. */
export class FlowBoard {
  P: Mat;
  x: Vec;
  readonly n: number;
  readonly total: number;
  private readonly at: number[];        // compartment of each particle
  private readonly spot: number[][];    // its resting place
  private readonly pos: Float32Array;
  private readonly geo: BufferGeometry;
  private readonly r: () => number;
  private readonly counts: Label[] = [];
  private readonly arrows: Arrow[] = [];
  private readonly shareTags: Label[] = [];
  readonly centres: [number, number][];
  private readonly w: number;
  private readonly hgt: number;
  constructor(private readonly p: PuzzleCtx, o: FlowOpts) {
    this.P = o.P.map((r) => r.slice());
    this.x = o.x0.slice();
    this.n = o.names.length;
    this.total = o.total ?? Math.round(o.x0.reduce((a, b) => a + b, 0));
    this.centres = o.centres ?? SECTIONS_AT.slice(0, this.n);
    this.w = o.w ?? 2.6; this.hgt = o.hgt ?? 1.5;
    this.r = rng(2020 + this.n);
    // the compartments
    this.centres.forEach(([cx, cy], i) => {
      const hw = this.w / 2, hh = this.hgt / 2, k = 0.22;
      const pts: V3[] = [[cx - hw + k, cy - hh, 0], [cx + hw - k, cy - hh, 0], [cx + hw, cy - hh + k, 0], [cx + hw, cy + hh - k, 0], [cx + hw - k, cy + hh, 0], [cx - hw + k, cy + hh, 0], [cx - hw, cy + hh - k, 0], [cx - hw, cy - hh + k, 0], [cx - hw + k, cy - hh, 0]];
      const box = new FatLine(p.g.stage, pts, { color: SECTION_COLORS[i % 3], width: 1.8, opacity: 0.75 });
      p.add(box.object); p.onDispose(() => box.dispose());
      ptag(p, o.names[i], [cx, cy + hh + 0.32, 0], '', [0, 0]);
      const cnt = ptag(p, '', [cx, cy - hh - 0.34, 0], 'y');
      this.counts.push(cnt);
    });
    // one light per drone
    this.at = new Array(this.total).fill(0);
    this.spot = Array.from({ length: this.total }, () => [0, 0]);
    this.pos = new Float32Array(this.total * 3);
    this.geo = new BufferGeometry();
    this.geo.setAttribute('position', new BufferAttribute(this.pos, 3));
    const mat = new PointsMaterial({ color: new Color('#bfe9ff').multiplyScalar(1.5), size: 0.085, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false });
    const pts = new Points(this.geo, mat);
    p.add(pts);
    p.onDispose(() => { this.geo.dispose(); mat.dispose(); });
    this.set(this.x);
  }

  private randomSpot(i: number): number[] {
    const [cx, cy] = this.centres[i];
    return [cx + (this.r() - 0.5) * (this.w - 0.35), cy + (this.r() - 0.5) * (this.hgt - 0.35)];
  }
  private writePos(k: number, q: number[]): void { this.pos[3 * k] = q[0]; this.pos[3 * k + 1] = q[1]; this.pos[3 * k + 2] = 0.02; }
  private flush(): void { (this.geo.attributes.position as BufferAttribute).needsUpdate = true; }
  private paintCounts(): void { this.counts.forEach((l, i) => l.set(fmtN(Math.round(this.x[i] * 10) / 10))); }

  /** Lights per compartment. */
  count(): number[] { const c = new Array(this.n).fill(0); for (const a of this.at) c[a]++; return c; }

  /** Place the drones for an arrangement at once. */
  set(x: readonly number[]): void {
    this.x = x.slice();
    const want = apportion(x, this.total);
    let k = 0;
    want.forEach((m, i) => { for (let t = 0; t < m; t++, k++) { this.at[k] = i; this.spot[k] = this.randomSpot(i); this.writePos(k, this.spot[k]); } });
    this.flush();
    this.paintCounts();
  }

  /** One hour: from each compartment, its drones leave by the shares in its column (whole drones). */
  async hour(ms = 900): Promise<void> {
    const c = this.count();
    const dest = new Array(this.total).fill(0);
    for (let j = 0; j < this.n; j++) {
      const flows = apportion(this.P.map((row) => row[j]), c[j]);
      const mine = this.at.map((a, k) => (a === j ? k : -1)).filter((k) => k >= 0);
      for (let s = mine.length - 1; s > 0; s--) { const t = Math.floor(this.r() * (s + 1)); [mine[s], mine[t]] = [mine[t], mine[s]]; }
      let q = 0;
      flows.forEach((f, i) => { for (let t = 0; t < f; t++) dest[mine[q++]] = i; });
    }
    const from = this.spot.map((s) => s.slice());
    const to = dest.map((i, k) => (i === this.at[k] ? this.spot[k] : this.randomSpot(i)));
    if (ms > 1) sfx.whoosh(ms / 1400);
    // ms ≤ 1 (solvers, fast runs): no frames at all, the drones land at once
    if (ms > 1) await animate(ms, (t) => { for (let k = 0; k < this.total; k++) { if (dest[k] === this.at[k]) continue; const lift = Math.sin(Math.PI * t) * 0.6; this.writePos(k, [from[k][0] + (to[k][0] - from[k][0]) * t, from[k][1] + (to[k][1] - from[k][1]) * t + lift]); } this.flush(); }, ease.inOut);
    for (let k = 0; k < this.total; k++) { this.at[k] = dest[k]; this.spot[k] = to[k]; this.writePos(k, to[k]); }
    this.flush();
    this.x = matVec(this.P, this.x);
    this.paintCounts();
  }

  /** Arrows for the shares leaving compartment j (null: none). */
  showShares(j: number | null): void {
    for (const a of this.arrows) { a.object.removeFromParent(); a.dispose(); }
    for (const l of this.shareTags) l.dispose();
    this.arrows.length = 0; this.shareTags.length = 0;
    if (j === null) return;
    const [jx, jy] = this.centres[j];
    for (let i = 0; i < this.n; i++) {
      const s = this.P[i][j];
      if (i === j) {
        const tg = new Label(`stay ${Math.round(s * 100)}%`, [jx, jy, 0.05], { className: 'a7-tag r' });
        this.p.add(tg.object); this.shareTags.push(tg);
        continue;
      }
      if (s < 1e-9) continue;
      const [ix, iy] = this.centres[i];
      const d = new Vector3(ix - jx, iy - jy, 0).normalize();
      const nrm = new Vector3(-d.y, d.x, 0).multiplyScalar(0.22);
      const a0: V3 = [jx + d.x * 1.25 + nrm.x, jy + d.y * 0.95 + nrm.y, 0.04];
      const a1: V3 = [ix - d.x * 1.25 + nrm.x, iy - d.y * 0.95 + nrm.y, 0.04];
      const ar = new Arrow(a0, a1, { color: C.w, width: 0.04 });
      this.p.add(ar); this.arrows.push(ar);
      const tg = new Label(`${Math.round(s * 100)}%`, [(a0[0] + a1[0]) / 2 + nrm.x * 1.6, (a0[1] + a1[1]) / 2 + nrm.y * 1.6, 0.05], { className: 'a7-tag r' });
      this.p.add(tg.object); this.shareTags.push(tg);
    }
  }
}

// ------------------------------------------------------------------ the triangle of all splits

/** The triangle of splits, with the path of each start drawn hour by hour. */
export class Simplex {
  readonly paths: { line: FatLine; end: Dot; start: Dot }[] = [];
  constructor(private readonly p: PuzzleCtx, private P: Mat, names: string[]) {
    const pts: V3[] = [...TRI, TRI[0]].map(([x, y]) => [x, y, 0]);
    const edge = new FatLine(p.g.stage, pts, { color: '#8fb8e8', width: 1.6, opacity: 0.6 });
    p.add(edge.object); p.onDispose(() => edge.dispose());
    const off: [number, number][] = [[-30, 16], [30, 16], [0, -22]];
    TRI.forEach(([x, y], i) => ptag(p, `all at ${names[i]}`, [x, y, 0], 'dim', off[i]));
  }
  setP(P: Mat): void { this.P = P; }
  /** Draw a path from a start for `hours` hours; returns where it ends. */
  path(i: number, x0: readonly number[], hours: number, color: string): Vec {
    let x = x0.slice();
    const pts: V3[] = [triPoint(x)];
    for (let k = 0; k < hours; k++) { x = matVec(this.P, x); pts.push(triPoint(x)); }
    let q = this.paths[i];
    if (!q) {
      const line = new FatLine(this.p.g.stage, [pts[0], pts[0]], { color, width: 1.8, opacity: 0.8 });
      const start = new Dot(pts[0], { color, size: 0.09 });
      const end = new Dot(pts[0], { color: C.result, size: 0.1 });
      this.p.add(line.object, start, end); this.p.onDispose(() => line.dispose());
      q = this.paths[i] = { line, end, start };
    }
    q.line.setPoints(pts.map((t) => [t[0], t[1], 0.01] as V3));
    q.start.at([pts[0][0], pts[0][1], 0.03]);
    q.end.at([pts[pts.length - 1][0], pts[pts.length - 1][1], 0.04]);
    return x;
  }
  /** Animate a path being drawn, hour by hour. */
  async grow(i: number, x0: readonly number[], hours: number, color: string, ms: number): Promise<Vec> {
    let end: Vec = x0.slice();
    for (let k = 1; k <= hours; k++) { end = this.path(i, x0, k, color); if (ms > 1) await new Promise((r) => window.setTimeout(r, ms / hours)); }
    return end;
  }
}
