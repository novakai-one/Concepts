// DROP (GDD §3.5): from a target, drop a perpendicular onto a line or a plane through the origin. The player
// drags a probe point along the line (or across the plane); the leftover arrow from the probe to the target
// is drawn dashed, and when it is perpendicular it snaps yellow with a right-angle mark at its foot.
// Used by Chapters 21–23.
import { Vector3 } from 'three';
import type { PuzzleCtx, V3 } from '../../../game/types';
import { Composite, Knob, RightAngle } from '../../../kit/geom';
import { add3, len3, rayPlane, scale3, sub3, to3, unit3 } from '../../../kit/geom-math';
import { FatLine } from '../../../gfx/lines';
import { Arrow } from '../../../gfx/arrow';
import { PlanePatch } from '../../../gfx/shapes';
import { C } from '../../../core/theme';
import { animate, ease } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { cross, dot, gramSchmidt } from '../../../math/la';

/** The point of the line through the origin along d closest to the ray from `from` through `through` (as a multiple of d). */
export function lineParamFromRay(from: readonly number[], through: readonly number[], d: readonly number[]): number {
  const u = sub3(through, from);
  const dd = dot(to3(d), to3(d)), uu = dot(u, u), du = dot(to3(d), u);
  const w0 = sub3([0, 0, 0], from);
  const den = dd * uu - du * du;
  if (Math.abs(den) < 1e-12) return dot(to3(through), to3(d)) / dd;
  // minimise |t d − (from + s u)|
  return (uu * dot(to3(d), sub3([0, 0, 0], w0)) - du * dot(u, sub3([0, 0, 0], w0))) / den;
}

const snapTo = (x: number, step: number | null) => (step ? Math.round(x / step) * step : x);

export interface DropLineOpts {
  /** Direction of the line through the origin. */
  dir: V3;
  /** The point the perpendicular drops from. */
  target: V3;
  /** Starting probe: t · dir. */
  t0: number;
  /** Snap step for t (null: free). */
  step: number | null;
  /** Snap onto the foot when within this many world units (cadet's right-angle snap). */
  magnet?: number;
  /** Range for t. */
  range?: [number, number];
  /** Draw the line (default true). */
  showLine?: boolean;
  lineColor?: string;
  probeColor?: string;
  onMove?(t: number, p: V3): void;
  onEnd?(t: number, p: V3): void;
}

/** A probe on a line, its leftover to the target, and the right-angle snap. */
export class DropLine extends Composite {
  readonly knob: Knob;
  readonly leftover: FatLine;
  readonly mark: RightAngle;
  readonly line: FatLine | null = null;
  t: number;
  dir: V3;
  target: V3;
  private wasSquare = false;
  private readonly o: DropLineOpts;

  constructor(p: PuzzleCtx, o: DropLineOpts) {
    super(p);
    this.o = o;
    this.dir = to3(o.dir); this.target = to3(o.target); this.t = o.t0;
    const st = p.g.stage;
    if (o.showLine !== false) {
      const u = unit3(this.dir);
      this.line = this.own(new FatLine(st, [scale3(u, -40), scale3(u, 40)], { color: o.lineColor ?? C.w, width: 1.5, opacity: 0.45 }));
    }
    this.leftover = this.own(new FatLine(st, [[0, 0, 0], [1, 0, 0]], { color: C.white, width: 2, opacity: 0.9, dashed: true, dashSize: 0.14, gapSize: 0.09 }));
    this.mark = this.own(new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 1, 0], 0.24, { color: C.result }));
    this.knob = new Knob(p, this.p, {
      color: o.probeColor ?? C.result,
      constrain: (q) => {
        const cam = p.g.stage.camera.position;
        const t = p.g.stage.mode === '2d' ? dot([q.x, q.y, q.z], this.dir) / dot(this.dir, this.dir) : lineParamFromRay([cam.x, cam.y, cam.z], [q.x, q.y, q.z], this.dir);
        this.t = this.clampSnap(t);
        return new Vector3(...this.p);
      },
      onMove: () => { this.draw(); o.onMove?.(this.t, this.p); },
      onEnd: () => o.onEnd?.(this.t, this.p),
    });
    this.parts.push(this.knob);
    this.group.add(this.knob.object);
    this.draw();
  }

  /** The probe point. */
  get p(): V3 { return scale3(this.dir, this.t); }
  /** The parameter of the foot of the perpendicular. */
  get tFoot(): number { return dot(this.target, this.dir) / dot(this.dir, this.dir); }
  get foot(): V3 { return scale3(this.dir, this.tFoot); }
  /** target − probe. */
  get left(): V3 { return sub3(this.target, this.p); }
  /** Is the leftover at a right angle to the line (within tol world units of the foot)? */
  square(tol = 0.02): boolean { return len3(sub3(this.p, this.foot)) <= tol; }

  private clampSnap(t: number): number {
    let s = snapTo(t, this.o.step);
    const m = this.o.magnet ?? 0;
    if (m > 0 && Math.abs(t - this.tFoot) * len3(this.dir) < m) s = this.tFoot;
    const [lo, hi] = this.o.range ?? [-8, 8];
    return Math.max(lo, Math.min(hi, s));
  }

  /** Redraw the leftover and the mark. */
  draw(): void {
    const p = this.p, l = this.left;
    const sq = this.square(1e-6) || (this.o.step === null && this.square(0.01));
    this.leftover.object.visible = len3(l) > 0.03;
    if (this.leftover.object.visible) this.leftover.setPoints([p, this.target]);
    this.leftover.setColor(sq ? C.result : C.white, sq ? 1.3 : 1);
    this.mark.show(sq && len3(l) > 0.3);
    this.mark.set(p, len3(p) > 1e-6 ? unit3(scale3(p, -1)) : unit3(this.dir), l);
    if (sq && !this.wasSquare) sfx.snap();
    this.wasSquare = sq;
  }

  /** Move the probe (no callbacks). */
  set(t: number): void { this.t = t; this.knob.at(this.p); this.draw(); }

  /** Animate the probe to t, then fire onMove and onEnd. */
  async moveTo(t: number, ms = 800): Promise<void> {
    const t0 = this.t;
    await animate(ms, (k) => this.set(t0 + (t - t0) * k), ease.inOut);
    this.set(t);
    this.o.onMove?.(this.t, this.p);
    this.o.onEnd?.(this.t, this.p);
  }

  setEnabled(on: boolean): void { this.knob.setEnabled(on); }
}

export interface DropPlaneOpts {
  /** The plane through the origin spanned by a and b. */
  a: V3;
  b: V3;
  target: V3;
  /** Starting weights (s, t): probe = s a + t b. */
  w0: [number, number];
  step: number | null;
  magnet?: number;
  /** Weights stay within ±range. */
  range?: number;
  /** Draw the plane patch (default true) and the spanning arrows (default true). */
  showPlane?: boolean;
  showArrows?: boolean;
  /** Patch size (default 7). */
  size?: number;
  /** Patch centre, a point of the plane (default the origin). */
  center?: V3;
  labels?: [string, string];
  onMove?(w: [number, number], p: V3): void;
  onEnd?(w: [number, number], p: V3): void;
}

/** A probe on a plane through the origin, its leftover to the target, and the right-angle snap. */
export class DropPlane extends Composite {
  readonly knob: Knob;
  readonly leftover: FatLine;
  readonly mark: RightAngle;
  readonly mark2: RightAngle;
  readonly patch: PlanePatch | null = null;
  readonly arrows: Arrow[] = [];
  w: [number, number];
  readonly a: V3;
  readonly b: V3;
  target: V3;
  readonly n: V3;
  private wasSquare = false;
  private readonly o: DropPlaneOpts;

  constructor(p: PuzzleCtx, o: DropPlaneOpts) {
    super(p);
    this.o = o;
    this.a = to3(o.a); this.b = to3(o.b); this.target = to3(o.target); this.w = [...o.w0];
    this.n = unit3(cross(this.a, this.b));
    const st = p.g.stage;
    if (o.showPlane !== false) {
      const c0: V3 = o.center ?? [0, 0, 0];
      this.patch = this.own(new PlanePatch(st, c0, this.n, { color: C.u, size: o.size ?? 7, opacity: 0.13 }));
      const [e1, e2] = gramSchmidt([this.a, this.b]);
      this.patch.setSpan(c0, to3(e1), to3(e2));
    }
    if (o.showArrows !== false) {
      this.arrows.push(this.own(new Arrow([0, 0, 0], this.a, { color: C.v, label: o.labels?.[0] })));
      this.arrows.push(this.own(new Arrow([0, 0, 0], this.b, { color: C.w, label: o.labels?.[1] })));
    }
    this.leftover = this.own(new FatLine(st, [[0, 0, 0], [1, 0, 0]], { color: C.white, width: 2, opacity: 0.9, dashed: true, dashSize: 0.14, gapSize: 0.09 }));
    this.mark = this.own(new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 1, 0], 0.26, { color: C.result }));
    this.mark2 = this.own(new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 1, 0], 0.26, { color: C.result }));
    this.knob = new Knob(p, this.p, {
      color: C.result,
      constrain: (q) => {
        const cam = p.g.stage.camera.position;
        const hit = rayPlane([cam.x, cam.y, cam.z], [q.x, q.y, q.z], this.n, 0);
        if (hit) this.w = this.clampSnap(this.weightsOf(hit));
        return new Vector3(...this.p);
      },
      onMove: () => { this.draw(); o.onMove?.(this.w, this.p); },
      onEnd: () => o.onEnd?.(this.w, this.p),
    });
    this.parts.push(this.knob);
    this.group.add(this.knob.object);
    this.draw();
  }

  get p(): V3 { return add3(scale3(this.a, this.w[0]), this.b, this.w[1]); }
  /** Weights (s, t) of a point of the plane. */
  weightsOf(q: readonly number[]): [number, number] {
    const aa = dot(this.a, this.a), ab = dot(this.a, this.b), bb = dot(this.b, this.b);
    const qa = dot(to3(q), this.a), qb = dot(to3(q), this.b);
    const det = aa * bb - ab * ab;
    return [(qa * bb - qb * ab) / det, (aa * qb - ab * qa) / det];
  }
  /** Weights of the foot of the perpendicular. */
  get wFoot(): [number, number] { return this.weightsOf(this.target); }
  get foot(): V3 { const [s, t] = this.wFoot; return add3(scale3(this.a, s), this.b, t); }
  get left(): V3 { return sub3(this.target, this.p); }
  square(tol = 0.02): boolean { return len3(sub3(this.p, this.foot)) <= tol; }

  private clampSnap(w: [number, number]): [number, number] {
    let s: [number, number] = [snapTo(w[0], this.o.step), snapTo(w[1], this.o.step)];
    const m = this.o.magnet ?? 0;
    const pw = add3(scale3(this.a, w[0]), this.b, w[1]);
    if (m > 0 && len3(sub3(pw, this.foot)) < m) s = this.wFoot;
    const R = this.o.range ?? 4;
    return [Math.max(-R, Math.min(R, s[0])), Math.max(-R, Math.min(R, s[1]))];
  }

  draw(): void {
    const p = this.p, l = this.left;
    const sq = this.square(1e-6) || (this.o.step === null && this.square(0.01));
    this.leftover.object.visible = len3(l) > 0.03;
    if (this.leftover.object.visible) this.leftover.setPoints([p, this.target]);
    this.leftover.setColor(sq ? C.result : C.white, sq ? 1.3 : 1);
    const on = sq && len3(l) > 0.3;
    this.mark.show(on); this.mark2.show(on);
    this.mark.set(p, unit3(this.a), l);
    this.mark2.set(p, unit3(this.b), l);
    if (sq && !this.wasSquare) sfx.snap();
    this.wasSquare = sq;
  }

  set(w: [number, number]): void { this.w = [...w]; this.knob.at(this.p); this.draw(); }

  async moveTo(w: [number, number], ms = 900): Promise<void> {
    const w0 = this.w;
    await animate(ms, (k) => this.set([w0[0] + (w[0] - w0[0]) * k, w0[1] + (w[1] - w0[1]) * k]), ease.inOut);
    this.set(w);
    this.o.onMove?.(this.w, this.p);
    this.o.onEnd?.(this.w, this.p);
  }

  setEnabled(on: boolean): void { this.knob.setEnabled(on); }
}
