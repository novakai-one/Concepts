// Chapter 17 pictures: the Anchor's grid as copper dashed lines over the ship's grid, and the Anchor's
// path to a point (c₁ of the first arm, then c₂ of the second, tip to tail). Every change of grid is
// animated honestly (interpMat2: a shear slides straight, a turn turns, nothing passes through flat).
import './c17.css';
import { Group } from 'three';
import type { Stage, V3 } from '../../../core/stage';
import type { PuzzleCtx } from '../../../game/types';
import { FatSegments } from '../../../gfx/lines';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { Label } from '../../../gfx/label';
import { C } from '../../../core/theme';
import { animate, ease } from '../../../core/tween';
import { col, det, interpMat2, type Mat } from '../../../math/la';
import { fmtN } from './logic';
import { niceTex } from '../../../math/frac';

const texNum = (x: number) => niceTex(x);

/** The Anchor's colour: copper, used for nothing else. */
export const COPPER = '#ef9a5c';
/** The ship's own grid, drawn pale (the white lattice of buoys). */
export const SHIP_GRID = { color: '#b7c6e0', main: 0.4, base: 0, axis: 0.55, width: 1.2 };
/** Vell's cutter grid: a pale parchment dotted grid (not a maths colour, not a speaker colour). */
export const VELL_GRID = '#efe2c4';

/** Clip the line p + t·d to the square |x − cx| ≤ h, |y − cy| ≤ h. Null when it misses. */
export function clipLine(p: readonly number[], d: readonly number[], cx: number, cy: number, h: number): [V3, V3] | null {
  let t0 = -Infinity, t1 = Infinity;
  for (const [pi, di, lo, hi] of [[p[0], d[0], cx - h, cx + h], [p[1], d[1], cy - h, cy + h]] as const) {
    if (Math.abs(di) < 1e-9) { if (pi < lo || pi > hi) return null; continue; }
    let a = (lo - pi) / di, b = (hi - pi) / di;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
  }
  if (!(t1 > t0)) return null;
  return [[p[0] + t0 * d[0], p[1] + t0 * d[1], 0], [p[0] + t1 * d[0], p[1] + t1 * d[1], 0]];
}

export interface CopperGridOpts { M?: Mat; half?: number; center?: [number, number]; origin?: [number, number]; dashed?: boolean; color?: string; opacity?: number; width?: number; dash?: number; gap?: number; z?: number; n?: number }

/** A grid drawn as dashed lines: every whole-number line of the grid whose arrows are the columns of M. */
export class CopperGrid {
  readonly segs: FatSegments;
  readonly group = new Group();
  M: Mat;
  private readonly o: Required<Pick<CopperGridOpts, 'half' | 'center' | 'z' | 'n' | 'origin'>>;

  constructor(stage: Stage, o: CopperGridOpts = {}) {
    this.o = { half: o.half ?? 14, center: o.center ?? [0, 0], z: o.z ?? 0.004, n: o.n ?? 30, origin: o.origin ?? [0, 0] };
    this.M = (o.M ?? [[1, 0], [0, 1]]).map((r) => r.slice());
    this.segs = new FatSegments(stage, [], { color: o.color ?? COPPER, width: o.width ?? 1.6, opacity: o.opacity ?? 0.85, dashed: o.dashed !== false, dashSize: o.dash ?? 0.2, gapSize: o.gap ?? 0.13, intensity: 1.15 });
    this.segs.object.renderOrder = 1;
    this.group.add(this.segs.object);
    // cleaned up with the world (clearWorld) when it was added without a puzzle context
    this.group.userData.dispose = () => this.segs.dispose();
    this.set(this.M);
  }

  get object(): Group { return this.group; }

  set(M: Mat): void {
    this.M = M.map((r) => r.slice());
    if (Math.abs(det(M)) < 1e-6) return;
    const u = col(M, 0), v = col(M, 1);
    const { half, center, z, n, origin: og } = this.o;
    const out: [V3, V3][] = [];
    for (let k = -n; k <= n; k++) {
      for (const [p, d] of [[[og[0] + k * u[0], og[1] + k * u[1]], v], [[og[0] + k * v[0], og[1] + k * v[1]], u]] as const) {
        const s = clipLine(p, d, og[0] + center[0], og[1] + center[1], half);
        if (s) out.push([[s[0][0], s[0][1], z], [s[1][0], s[1][1], z]]);
      }
    }
    this.segs.setSegments(out);
  }

  /** Animate to a new grid. 'linear' moves each arrow straight (a shear stays a shear); turns turn. */
  async to(M: Mat, ms = 1400, mode: 'linear' | 'auto' = 'auto'): Promise<void> {
    const M0 = this.M.map((r) => r.slice());
    await animate(ms, (k) => this.set(interpMat2(M0, M, k, mode)), ease.inOut);
    this.set(M);
  }

  setOpacity(a: number): void { this.segs.setOpacity(a); }
  async fade(to: number, ms = 600): Promise<void> {
    const from = this.segs.material.opacity;
    await animate(ms, (k) => this.setOpacity(from + (to - from) * k), ease.inOut);
  }
  dispose(): void { this.segs.dispose(); this.group.removeFromParent(); }
}

/** A tag on a point: a small pill of text. kind: 'y' yellow, 'cu' copper, 'w' white, 'dim'. */
export function tag(text: string, at: V3, kind = 'w', offset: [number, number] = [0, -24]): Label {
  return new Label(text, at, { className: `c17-pt ${kind}`, offset });
}

/**
 * The Anchor's path to a point: c₁ of the first arm (green) from the origin, then c₂ of the second
 * arm (red) from its tip, and a yellow dot where it ends. Arms are the columns of M (default the Anchor's).
 * Each segment's label sits on its right-hand side (seen along the arrow), so the two never share a spot.
 */
export class AnchorPath {
  readonly a1: Arrow;
  readonly a2: Arrow;
  readonly end: Dot;
  readonly endTag: Label;
  private readonly l1: Label;
  private readonly l2: Label;
  private readonly names: [string, string];
  private readonly showTag: boolean;
  private visible = true;
  c: number[] = [0, 0];
  constructor(p: PuzzleCtx, private M: Mat, o: { names?: [string, string]; tagKind?: string; showTag?: boolean } = {}) {
    this.names = o.names ?? ['\\mathbf b_1', '\\mathbf b_2'];
    this.showTag = o.showTag !== false;
    this.a1 = new Arrow([0, 0, 0], [0, 0, 0], { color: C.v, width: 0.045 });
    this.a2 = new Arrow([0, 0, 0], [0, 0, 0], { color: C.w, width: 0.045 });
    this.l1 = new Label('', [0, 0, 0], { color: C.v, className: 'g-label-vec c17-seg' });
    this.l2 = new Label('', [0, 0, 0], { color: C.w, className: 'g-label-vec c17-seg' });
    this.end = new Dot([0, 0, 0.03], { color: C.result, size: 0.1 });
    this.endTag = tag('', [0, 0, 0], o.tagKind ?? 'y', [0, 26]);
    p.add(this.a1, this.a2, this.end);
    p.add(this.endTag.object, this.l1.object, this.l2.object);
    p.onDispose(() => { this.endTag.dispose(); this.l1.dispose(); this.l2.dispose(); });
    this.set([0, 0]);
  }
  setGrid(M: Mat): void { this.M = M; this.set(this.c); }
  /** Where the path ends (ship numbers). */
  get tip(): V3 { const [u, v] = [col(this.M, 0), col(this.M, 1)]; return [this.c[0] * u[0] + this.c[1] * v[0], this.c[0] * u[1] + this.c[1] * v[1], 0]; }
  set(c: readonly number[]): void {
    this.c = [c[0], c[1]];
    this.labels(c);
    this.place(col(this.M, 0), col(this.M, 1));
    const t = this.tip;
    this.endTag.set(`${fmtN(t[0])}, ${fmtN(t[1])}`);
  }
  /** Walk the path: the first arm grows, then the second from its tip. */
  async walk(c: readonly number[], ms = 650): Promise<void> {
    this.set([0, 0]);
    this.labels(c);
    this.show(true);
    const u = col(this.M, 0), v = col(this.M, 1);
    await animate(ms, (k) => { this.c = [c[0] * k, 0]; this.place(u, v); }, ease.out);
    await animate(ms, (k) => { this.c = [c[0], c[1] * k]; this.place(u, v); }, ease.out);
    this.set(c);
  }
  private labels(c: readonly number[]): void {
    this.l1.set(`$${texNum(c[0])}\\,${this.names[0]}$`);
    this.l2.set(`$${texNum(c[1])}\\,${this.names[1]}$`);
  }
  private place(u: number[], v: number[]): void {
    const m: V3 = [this.c[0] * u[0], this.c[0] * u[1], 0.02];
    const t: V3 = [m[0] + this.c[1] * v[0], m[1] + this.c[1] * v[1], 0.02];
    this.a1.set([0, 0, 0.02], m);
    this.a2.set(m, t);
    this.end.at([t[0], t[1], 0.04]);
    this.endTag.at([t[0], t[1], 0]);
    // labels: halfway along each segment, on the side away from the other segment
    const d1 = [m[0], m[1]], d2 = [t[0] - m[0], t[1] - m[1]];
    const side = (a: V3, b: V3, l: Label, away: number[]) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      l.show(this.visible && L > 0.25);
      if (L < 1e-6) return;
      let n = [dy / L, -dx / L];
      if (n[0] * away[0] + n[1] * away[1] > 0) n = [-n[0], -n[1]];
      l.at([(a[0] + b[0]) / 2 + n[0] * 0.36, (a[1] + b[1]) / 2 + n[1] * 0.36, 0.02]);
    };
    side([0, 0, 0], m, this.l1, d2);
    side(m, t, this.l2, [-d1[0], -d1[1]]);
  }
  show(v: boolean): void {
    this.visible = v;
    for (const o of [this.a1.object, this.a2.object, this.end.object]) o.visible = v;
    this.endTag.show(v && this.showTag);
    this.place(col(this.M, 0), col(this.M, 1));
  }
}
