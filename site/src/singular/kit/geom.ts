// Geometry pictures: right-angle marks, angle arcs, the shadow (projection) of one arrow on
// another, the eigenvector sweep, and the SVD story of a circle becoming an ellipse.
// Same style as the rest of the kit: construct with the puzzle context `p`; everything is added
// to the world and cleaned up with the puzzle; animations return promises.
import {
  BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, RingGeometry,
  SphereGeometry, Vector3, type Object3D, type Sprite,
} from 'three';
import type { PuzzleCtx, V3 } from '../game/types';
import type { Grid2D } from '../gfx/grid';
import { Arrow } from '../gfx/arrow';
import { FatLine, FatSegments } from '../gfx/lines';
import { Label } from '../gfx/label';
import { glowSprite } from '../gfx/markers';
import { C } from '../core/theme';
import { animate, ease, type Handle } from '../core/tween';
import { sfx } from '../audio/sfx';
import { niceTex } from '../math/frac';
import { mclone, matVec, type Mat } from '../math/la';
import {
  add3, arcFrame, arcPts, bisector, eigenDirs2, ellipsePts, labelSpot, len3, lineAngleDist, markArc, rad, rightAnglePts,
  scale3, shadowFoot, shadowLength, smoothstep, sub3, svdPath, svdRot2, to3, unit3, wrapAngle, type EigenDirs, type Svd2,
} from './geom-math';

export * from './geom-math';

interface Disposable { dispose(): void }

/** Shared base for kit pictures: a group in the world plus parts disposed with it (and with the puzzle). */
export abstract class Composite {
  readonly group = new Group();
  protected readonly parts: Disposable[] = [];
  protected readonly ctx: PuzzleCtx;
  constructor(p: PuzzleCtx) {
    this.ctx = p;
    p.add(this.group);
    p.onDispose(() => this.dispose());
  }
  get object(): Group { return this.group; }
  /** Put a part in this picture's group and dispose it with the picture. */
  protected own<T extends Disposable & { object: Object3D }>(x: T, parent: Group = this.group): T {
    parent.add(x.object);
    this.parts.push(x);
    return x;
  }
  show(v: boolean): void { this.group.visible = v; }
  dispose(): void { for (const x of this.parts.splice(0)) x.dispose(); this.group.removeFromParent(); }
}

const flat = (v: readonly number[]): V3 => to3(v);

// ================================================================== Knob

export interface KnobOpts {
  color?: string;
  size?: number;
  label?: string;
  labelOffset?: [number, number];
  /** Grid snapping for the drag (default: free). */
  snap?: number | null;
  /** Final say on where the knob may go (e.g. stay on a line or a plane). */
  constrain?: (q: Vector3) => Vector3;
  /** Drag on z = 0 even in 3-D views. */
  planar?: boolean;
  onMove?: (pos: V3) => void;
  onEnd?: (pos: V3) => void;
  /** Count a move on each drag end (default true). */
  countMoves?: boolean;
}

/** A glowing point the player can drag (a ring marks it as grabbable). */
export class Knob {
  readonly group = new Group();
  private readonly core: Mesh<SphereGeometry, MeshStandardMaterial>;
  private readonly ring: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly halo: Sprite;
  private readonly hit: Mesh<SphereGeometry, MeshBasicMaterial>;
  readonly label: Label | null = null;
  enabled = true;

  constructor(p: PuzzleCtx, at: V3, o: KnobOpts = {}) {
    const color = o.color ?? C.result;
    const s = o.size ?? 0.085;
    this.core = new Mesh(new SphereGeometry(s, 20, 14), new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, roughness: 0.4 }));
    this.ring = new Mesh(new RingGeometry(s * 2.3, s * 2.9, 44), new MeshBasicMaterial({ color: new Color(color).multiplyScalar(1.4), transparent: true, opacity: 0.85, side: DoubleSide, depthWrite: false }));
    this.halo = glowSprite(color, s * 7, 0.4);
    this.hit = new Mesh(new SphereGeometry(0.36, 12, 8), new MeshBasicMaterial({ visible: false }));
    this.group.add(this.core, this.ring, this.halo, this.hit);
    if (o.label) {
      this.label = new Label(o.label, [0, 0, 0], { color, offset: o.labelOffset ?? [0, -28] });
      this.group.add(this.label.object);
    }
    this.group.position.set(...at);
    p.add(this);
    let last = '';
    const h = p.g.drag.add({
      target: this.hit,
      getPos: () => this.group.position.clone(),
      snap: () => (o.snap === undefined ? null : o.snap),
      constrain: o.constrain,
      planar: o.planar,
      onMove: (q) => {
        if (!this.enabled) return;
        this.group.position.copy(q);
        const k = `${Math.round(q.x * 4)},${Math.round(q.y * 4)},${Math.round(q.z * 4)}`;
        if (k !== last) { last = k; sfx.tick(q.y + q.z); }
        o.onMove?.(this.pos);
      },
      onEnd: () => {
        if (!this.enabled) return;
        if (o.countMoves !== false) p.move();
        o.onEnd?.(this.pos);
      },
    });
    p.onDispose(() => h.remove());
  }

  get object(): Group { return this.group; }
  get pos(): V3 { const q = this.group.position; return [q.x, q.y, q.z]; }
  at(pos: V3): void { this.group.position.set(...pos); }
  /** Animate to a place (does not fire the callbacks). */
  async moveTo(pos: V3, ms = 700): Promise<void> {
    const a = this.group.position.clone(), b = new Vector3(...pos);
    await animate(ms, (k) => this.group.position.lerpVectors(a, b, k), ease.inOut);
  }
  setEnabled(on: boolean): void { this.enabled = on; this.ring.visible = on; }
  setColor(c: string): void { this.core.material.color.set(c); this.core.material.emissive.set(c); this.ring.material.color = new Color(c).multiplyScalar(1.4); this.halo.material.color.set(c); }
  dispose(): void {
    this.core.geometry.dispose(); this.core.material.dispose();
    this.ring.geometry.dispose(); this.ring.material.dispose();
    this.hit.geometry.dispose(); this.hit.material.dispose();
    this.halo.material.dispose();
    this.label?.dispose();
    this.group.removeFromParent();
  }
}

// ================================================================== RightAngle

export interface MarkOpts { color?: string; opacity?: number; width?: number }

/** The small square that marks a right angle at `at` between two directions (2-D or 3-D). */
export class RightAngle {
  readonly line: FatLine;
  size: number;
  private opacity: number;
  private on = true;

  constructor(p: PuzzleCtx, at: V3, dirA: V3, dirB: V3, size = 0.26, o: MarkOpts = {}) {
    this.size = size;
    this.opacity = o.opacity ?? 0.9;
    this.line = new FatLine(p.g.stage, rightAnglePts(at, dirA, dirB, size), { color: o.color ?? C.white, width: o.width ?? 1.6, opacity: this.opacity });
    p.add(this);
    this.set(at, dirA, dirB);
  }

  get object(): FatLine['object'] { return this.line.object; }

  /** Move the mark. It hides itself when either direction has no length. */
  set(at: V3, dirA: V3, dirB: V3): void {
    const ok = len3(dirA) > 1e-6 && len3(dirB) > 1e-6;
    this.line.object.visible = ok && this.on;
    if (ok) this.line.setPoints(rightAnglePts(at, dirA, dirB, this.size));
  }

  show(v: boolean): void { this.on = v; this.line.object.visible = v; }
  setOpacity(a: number): void { this.line.setOpacity(this.opacity * a); }
  dispose(): void { this.line.dispose(); }
}

// ================================================================== AngleArc

export interface AngleArcOpts {
  /** e.g. '$\\theta$' (shown at the middle of the arc, outside it). */
  label?: string;
  color?: string;
  radius?: number;
  /** Opacity of the filled wedge (0 = no fill). */
  fill?: number;
  width?: number;
  opacity?: number;
}

const ARC_N = 40;

/** An arc between two directions at a point, with an optional label. Updatable with set(a, b). */
export class AngleArc {
  readonly group = new Group();
  private readonly line: FatLine;
  private readonly wedge: Mesh<BufferGeometry, MeshBasicMaterial>;
  readonly label: Label | null = null;
  at: V3;
  a: V3;
  b: V3;
  radius: number;
  private on = true;
  private valid = false;

  constructor(p: PuzzleCtx, at: V3, a: V3, b: V3, o: AngleArcOpts = {}) {
    const color = o.color ?? C.white;
    this.at = at; this.a = a; this.b = b;
    this.radius = o.radius ?? 0.6;
    this.line = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 0]], { color, width: o.width ?? 1.8, opacity: o.opacity ?? 0.85, intensity: 1.1 });
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array((ARC_N + 2) * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < ARC_N; i++) idx.push(0, i + 1, i + 2);
    g.setIndex(idx);
    this.wedge = new Mesh(g, new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: o.fill ?? 0.1, side: DoubleSide, depthWrite: false }));
    this.wedge.visible = (o.fill ?? 0.1) > 0;
    this.group.add(this.wedge, this.line.object);
    if (o.label) {
      this.label = new Label(o.label, [0, 0, 0], { color, size: 17 });
      this.group.add(this.label.object);
    }
    p.add(this);
    this.set(a, b, at);
  }

  get object(): Group { return this.group; }
  /** The angle between the two directions (radians, 0..π). */
  get angle(): number { return arcFrame(this.a, this.b).angle; }

  set(a: V3, b: V3, at: V3 = this.at): void {
    this.a = a; this.b = b; this.at = at;
    const ok = len3(a) > 1e-6 && len3(b) > 1e-6;
    const th = ok ? arcFrame(a, b).angle : 0;
    this.valid = ok && th > 1e-3;
    this.group.visible = this.valid && this.on;
    if (!this.valid) return;
    const pts = arcPts(at, a, b, this.radius, ARC_N);
    this.line.setPoints(pts);
    const pos = this.wedge.geometry.getAttribute('position') as BufferAttribute;
    pos.set([...at, ...pts.flat()]);
    pos.needsUpdate = true;
    this.wedge.geometry.computeBoundingSphere();
    if (this.label) {
      this.label.show(th > rad(9));
      this.label.at(add3(at, bisector(a, b), this.radius + 0.3));
    }
  }

  setLabel(s: string): void { this.label?.set(s); }
  setRadius(r: number): void { this.radius = r; this.set(this.a, this.b, this.at); }
  show(v: boolean): void { this.on = v; this.group.visible = v && this.valid; }
  dispose(): void { this.line.dispose(); this.wedge.geometry.dispose(); this.wedge.material.dispose(); this.label?.dispose(); this.group.removeFromParent(); }
}

// ================================================================== Shadow (projection onto a line)

export interface ShadowOpts {
  /** The vector w (or any direction) whose line we project onto. */
  onto: V3;
  /** The vector v being projected. */
  of: V3;
  /** Colour of the projected arrow (default yellow: the result). */
  color?: string;
  /** Label for the projected arrow, e.g. '$\\mathrm{proj}_{\\mathbf w}\\mathbf v$'. */
  label?: string;
  /** Colour of the faint line through w (default w's red). */
  lineColor?: string;
  /** Lift the projected arrow above the plane so it draws over w (default 0.03). */
  lift?: number;
}

/**
 * The projection picture: the faint line through w, a dashed drop from v's tip straight onto
 * that line, the projected arrow (yellow) along w, and a right-angle mark at the foot.
 */
export class Shadow extends Composite {
  readonly arrow: Arrow;
  readonly mark: RightAngle;
  readonly label: Label | null = null;
  private readonly line: FatLine;
  private readonly drop: FatLine;
  private readonly lift: number;
  v: V3;
  w: V3;

  constructor(p: PuzzleCtx, o: ShadowOpts) {
    super(p);
    this.v = flat(o.of); this.w = flat(o.onto);
    this.lift = o.lift ?? 0.03;
    const st = p.g.stage;
    this.line = this.own(new FatLine(st, [[0, 0, 0], [1, 0, 0]], { color: o.lineColor ?? C.w, width: 1.5, opacity: 0.4 }));
    this.drop = this.own(new FatLine(st, [[0, 0, 0], [1, 0, 0]], { color: C.white, width: 1.7, opacity: 0.8, dashed: true, dashSize: 0.13, gapSize: 0.09 }));
    this.mark = this.own(new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 1, 0], 0.24));
    this.arrow = this.own(new Arrow([0, 0, 0], [1, 0, 0], { color: o.color ?? C.result, width: 0.05, glow: 1 }));
    if (o.label) {
      this.label = new Label(o.label, [0, 0, 0], { color: o.color ?? C.result, size: 19 });
      this.own(this.label);
    }
    this.set(this.v, this.w);
  }

  /** Signed length of the shadow: v·w / |w| (negative when it points away from w). */
  get value(): number { return shadowLength(this.v, this.w); }
  /** Where the drop from v's tip meets the line (the tip of the projected arrow). */
  get foot(): V3 { return shadowFoot(this.v, this.w); }
  /** v minus its shadow (perpendicular to w). */
  get residual(): V3 { return sub3(this.v, this.foot); }

  set(v: V3, w: V3 = this.w): void {
    this.v = flat(v); this.w = flat(w);
    const wl = len3(this.w);
    this.line.object.visible = wl > 1e-6;
    if (wl > 1e-6) { const d = unit3(this.w); this.line.setPoints([scale3(d, -60), scale3(d, 60)]); }
    const f = this.foot;
    const r = sub3(this.v, f);
    const fl = len3(f), rl = len3(r);
    // the projected arrow (slightly lifted so it reads on top of w)
    this.arrow.object.visible = fl > 0.02;
    this.arrow.set([0, 0, this.lift], [f[0], f[1], f[2] + this.lift]);
    // the drop and the right angle (hidden when v already lies on the line)
    this.drop.object.visible = rl > 0.04;
    if (rl > 0.04) this.drop.setPoints([this.v, f]);
    const along = fl > 1e-6 ? unit3(f) : unit3(this.w);
    this.mark.show(rl > 0.3 && wl > 1e-6);
    this.mark.set(f, along, r);
    if (this.label) {
      this.label.show(fl > 0.6);
      // halfway along the shadow, on the side away from v
      const side = rl > 1e-6 ? unit3(r) : flat([-along[1], along[0], 0]);
      this.label.at(add3(scale3(f, 0.5), side, -0.42));
    }
  }

  /** Animate v (and optionally w) to new places. */
  async to(v: V3, w: V3 = this.w, ms = 800): Promise<void> {
    const v0 = this.v, w0 = this.w;
    await animate(ms, (k) => this.set(add3(v0, sub3(v, v0), k), add3(w0, sub3(w, w0), k)), ease.inOut);
  }

  setOpacity(a: number): void {
    this.arrow.setOpacity(a); this.drop.setOpacity(0.8 * a); this.line.setOpacity(0.4 * a); this.mark.setOpacity(a);
    if (this.label) this.label.el.style.opacity = String(a);
  }
}

// ================================================================== Sweep (eigenvector hunt)

export interface SweepOpts {
  /** The 2×2 matrix. */
  M: Mat;
  /** Length of the test arrow x (the circle it sweeps around). Default 1. */
  radius?: number;
  /** Starting angle of x (radians). */
  start?: number;
  /** Let the player drag x around the circle (default true). */
  draggable?: boolean;
  /** Labels for x and its image; false for none. */
  labels?: { x?: string; mx?: string } | false;
  /** Draw the faint trace of every image Mx so far (default true). */
  trace?: boolean;
  /** Draw the arc from x to Mx (default true). */
  arc?: boolean;
  /** Within this many degrees of an eigen-direction counts as found (default 2). */
  tol?: number;
  /** Draw the line through x (dashed): where Mx must land to count as "on its own line". */
  xLine?: boolean;
  /** Draw the circle x sweeps around (default true). */
  circle?: boolean;
  /** Label each found line with its λ (default true; off when the player must work the stretch out). */
  valueLabels?: boolean;
  onChange?: (t: number) => void;
  onCommit?: (t: number) => void;
  /** Called the first time x comes within tol of eigen-direction i. */
  onFound?: (i: number, angle: number, lambda: number) => void;
}

const TRACE_BINS = 360;

interface EigenLine { angle: number; value: number; core: FatLine; glow: FatLine; label: Label; level: number }

/**
 * The eigenvector hunt: a test arrow x (green) goes around a circle, its image Mx (yellow) is drawn
 * live, a faint trace collects every image (an ellipse), and each line where Mx lands on x's own
 * line lights up violet. A matrix with complex eigenvalues has no such line: nothing lights up.
 */
export class Sweep extends Composite {
  readonly x: Arrow;
  readonly mx: Arrow;
  readonly arc: AngleArc | null = null;
  readonly found = new Set<number>();
  M: Mat;
  t: number;
  readonly radius: number;
  private eig: EigenDirs;
  private lines: EigenLine[] = [];
  private readonly trace: FatSegments | null = null;
  private visited = new Uint8Array(TRACE_BINS);
  private readonly lx: Label | null = null;
  private readonly lmx: Label | null = null;
  private readonly o: SweepOpts;
  private readonly eigGroup = new Group();
  private job: Handle | null = null;
  private lastTickDeg = 0;
  /** A typed test arrow at its true length (setVector); null while x rides the circle. */
  private free: [number, number] | null = null;
  private readonly xl: FatLine | null = null;
  private readonly circ: FatLine;
  enabled = true;

  constructor(p: PuzzleCtx, o: SweepOpts) {
    super(p);
    this.o = o;
    this.M = mclone(o.M);
    this.radius = o.radius ?? 1;
    this.t = o.start ?? rad(100);
    this.eig = eigenDirs2(this.M);
    const st = p.g.stage;
    this.group.add(this.eigGroup);
    // the circle x moves on
    const circ: V3[] = [];
    for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; circ.push([this.radius * Math.cos(a), this.radius * Math.sin(a), 0]); }
    this.circ = this.own(new FatLine(st, circ, { color: C.v, width: 1.3, opacity: 0.32 }));
    this.circ.object.visible = o.circle !== false;
    if (o.xLine) this.xl = this.own(new FatLine(st, [[-60, 0, 0.01], [60, 0, 0.01]], { color: C.v, width: 1.4, opacity: 0.55, dashed: true }));
    if (o.trace !== false) {
      this.trace = this.own(new FatSegments(st, [[[0, 0, 0], [0, 0, 0]]], { color: C.result, width: 1.6, opacity: 0.5 }));
      this.trace.object.visible = false;
    }
    if (o.arc !== false) this.arc = this.own(new AngleArc(p, [0, 0, 0], [1, 0, 0], [0, 1, 0], { radius: Math.min(0.55, this.radius * 0.4), opacity: 0.6, fill: 0.07 }));
    this.mx = this.own(new Arrow([0, 0, 0], [1, 0, 0], { color: C.result, width: 0.05 }));
    this.x = this.own(new Arrow([0, 0, 0.03], [1, 0, 0.03], { color: C.v, width: 0.048, handle: o.draggable !== false }));
    if (o.labels !== false) {
      this.lx = this.own(new Label(o.labels?.x ?? '$\\mathbf x$', [0, 0, 0], { color: C.v, className: 'g-label-vec' }));
      this.lmx = this.own(new Label(o.labels?.mx ?? '$A\\mathbf x$', [0, 0, 0], { color: C.result, className: 'g-label-vec' }));
    }
    this.buildLines();
    if (o.draggable !== false) {
      const h = p.g.drag.add({
        target: this.x.grab,
        getPos: () => this.x.to.clone(),
        snap: () => null,
        constrain: (q) => { const a = Math.atan2(q.y, q.x); return new Vector3(this.radius * Math.cos(a), this.radius * Math.sin(a), 0.03); },
        onStart: () => { this.job?.cancel(); },
        onMove: (q) => { if (this.enabled) this.setAngle(Math.atan2(q.y, q.x)); },
        onEnd: () => { if (!this.enabled) return; p.move(); this.o.onCommit?.(this.t); },
      });
      p.onDispose(() => h.remove());
    }
    this.setAngle(this.t, false);
  }

  /** Angles (radians, in [0, π)) of the lines through the origin where Mx stays on x's line. */
  eigenAngles(): number[] { return this.eig.kind === 'lines' ? this.eig.angles.slice() : []; }
  /** The eigenvalue on each of those lines (same order as eigenAngles()). */
  eigenValues(): number[] { return this.eig.kind === 'lines' ? this.eig.values.slice() : this.eig.kind === 'all' ? [this.eig.value] : []; }
  /** 'lines' (1 or 2 directions), 'none' (complex eigenvalues) or 'all' (M = λI). */
  get kind(): EigenDirs['kind'] { return this.eig.kind; }

  /** The test vector x and its image Mx. */
  get xVec(): V3 { return this.free ? [this.free[0], this.free[1], 0] : [this.radius * Math.cos(this.t), this.radius * Math.sin(this.t), 0]; }
  get image(): V3 { return flat(matVec(this.M, this.xVec.slice(0, 2))); }

  /** The nearest eigen-direction to x and how far it is (radians, as lines). */
  nearest(): { i: number; dist: number } | null {
    if (this.eig.kind === 'all') return { i: 0, dist: 0 };
    let best: { i: number; dist: number } | null = null;
    this.eigenAngles().forEach((a, i) => { const d = lineAngleDist(this.t, a); if (!best || d < best.dist) best = { i, dist: d }; });
    return best;
  }
  /** True when x is within tol degrees of an eigen-direction. */
  get onEigen(): boolean { const n = this.nearest(); return !!n && n.dist <= rad(this.o.tol ?? 2); }

  private buildLines(): void {
    for (const l of this.lines) { l.core.dispose(); l.glow.dispose(); l.label.dispose(); }
    this.lines = [];
    const st = this.ctx.g.stage;
    const mk = (angle: number, value: number) => {
      const d: V3 = [Math.cos(angle), Math.sin(angle), 0];
      const pts: V3[] = [scale3(d, -60), scale3(d, 60)];
      const glow = new FatLine(st, pts, { color: C.violet, width: 12, opacity: 0, intensity: 1 });
      const core = new FatLine(st, pts, { color: C.violet, width: 2.6, opacity: 0, intensity: 1.8 });
      glow.object.renderOrder = 1;
      const r = Math.max(this.radius, Math.abs(value) * this.radius) + 0.95;
      const label = new Label(`$\\lambda = ${niceTex(value)}$`, add3(scale3(d, r), [-d[1], d[0], 0], 0.48), { color: C.violet, size: 17 });
      label.show(false);
      this.eigGroup.add(glow.object, core.object, label.object);
      this.lines.push({ angle, value, core, glow, label, level: 0 });
    };
    const e = this.eig;
    if (e.kind === 'lines') e.angles.forEach((a, i) => mk(a, e.values[i]));
    if (e.kind === 'all') mk(this.t, e.value);
  }

  /** Put x at angle t (radians), on the circle. */
  setAngle(t: number, notify = true): void {
    const prev = this.t;
    this.free = null;
    this.t = t;
    this.render(prev, notify);
  }

  /** Put x at a typed arrow, at its true length (not on the circle). */
  setVector(v: readonly number[], notify = true): void {
    const prev = this.t;
    this.free = [v[0], v[1]];
    if (Math.hypot(v[0], v[1]) > 1e-9) this.t = Math.atan2(v[1], v[0]);
    this.render(prev, notify);
  }

  /** Glide a typed arrow from where it is to v (a straight slide, not a turn). */
  async slideTo(v: readonly number[], ms = 600): Promise<void> {
    this.job?.cancel();
    const a = this.xVec;
    const job = animate(ms, (k) => this.setVector([a[0] + (v[0] - a[0]) * k, a[1] + (v[1] - a[1]) * k]), ease.inOut);
    this.job = job;
    await job;
    if (this.job === job) this.job = null;
    this.setVector(v);
  }

  private render(prev: number, notify: boolean): void {
    const t = this.t;
    const x = this.xVec, y = this.image;
    if (this.xl) {
      const d: V3 = [Math.cos(t), Math.sin(t), 0.01];
      this.xl.setPoints([scale3(d, -60), scale3(d, 60)]);
      this.xl.object.visible = len3(x) > 1e-6;
    }
    this.x.set([0, 0, 0.03], [x[0], x[1], 0.03]);
    this.mx.set([0, 0, 0], y);
    const yl = len3(y);
    this.mx.object.visible = yl > 0.02;
    this.arc?.show(yl >= 0.05);
    this.arc?.set(x, y);
    if (!this.free) this.markTrace(prev, t); // the trail records the sweep round the circle, not typed arrows
    this.updateGlow(notify);
    this.placeLabels(x, y);
    const dg = Math.round((t * 180) / Math.PI / 6);
    if (notify && dg !== this.lastTickDeg) { this.lastTickDeg = dg; sfx.tick(Math.sin(t) * 3); }
    if (notify) this.o.onChange?.(t);
  }

  private placeLabels(x: V3, y: V3): void {
    const segs: [V3, V3][] = [[[0, 0, 0], x], [[0, 0, 0], y]];
    // keep clear of the lines that are lit
    for (const l of this.lines) if (l.level > 0.05) { const d: V3 = [Math.cos(l.angle), Math.sin(l.angle), 0]; segs.push([scale3(d, -12), scale3(d, 12)]); }
    if (this.lx) this.lx.at(labelSpot(x, x, segs, [], 0.42, 0.34));
    if (this.lmx) {
      const spotX = this.lx ? [this.lx.object.position.x, this.lx.object.position.y] : x;
      this.lmx.show(len3(y) > 0.15);
      this.lmx.at(labelSpot(y, y, segs, [spotX], 0.42, 0.4));
    }
  }

  /** Mark the trace from angle prev to t the short way round (a drag can jump across ±π). */
  private markTrace(prev: number, t: number): void { this.markRange(prev, wrapAngle(t - prev)); }

  /** Mark the trace over d radians from angle a0 (d may be more than a half turn). */
  private markRange(a0: number, d: number): void {
    if (markArc(this.visited, a0, d)) this.redrawTrace();
  }

  private redrawTrace(): void {
    if (!this.trace) return;
    const segs: [V3, V3][] = [];
    const at = (b: number): V3 => { const a = (b / TRACE_BINS) * Math.PI * 2; return flat(matVec(this.M, [this.radius * Math.cos(a), this.radius * Math.sin(a)])); };
    for (let b = 0; b < TRACE_BINS; b++) if (this.visited[b]) segs.push([at(b), at(b + 1)]);
    this.trace.object.visible = segs.length > 0;
    if (segs.length) this.trace.setSegments(segs);
  }

  /** How much of the circle x has visited (0..1). */
  get coverage(): number { let n = 0; for (const v of this.visited) n += v; return n / TRACE_BINS; }

  private updateGlow(notify = true): void {
    const tol = rad(this.o.tol ?? 2);
    this.lines.forEach((l, i) => {
      if (this.eig.kind === 'all') {
        const d: V3 = [Math.cos(this.t), Math.sin(this.t), 0];
        l.core.setPoints([scale3(d, -60), scale3(d, 60)]);
        l.glow.setPoints([scale3(d, -60), scale3(d, 60)]);
        const r = Math.max(this.radius, Math.abs(l.value) * this.radius) + 0.95;
        l.label.at(add3(scale3(d, r), [-d[1], d[0], 0], 0.48));
      }
      const dist = this.eig.kind === 'all' ? 0 : lineAngleDist(this.t, l.angle);
      const near = 1 - smoothstep(rad(1), rad(8), dist);
      if (dist <= tol && !this.found.has(i)) {
        this.found.add(i);
        if (notify) { sfx.snap(); this.o.onFound?.(i, l.angle, l.value); }
      }
      this.setLevel(l, Math.max(this.found.has(i) ? 0.5 : 0, near));
      l.label.show(this.found.has(i) && this.o.valueLabels !== false);
    });
  }

  private setLevel(l: EigenLine, k: number): void {
    l.level = k;
    l.core.setOpacity(0.95 * k);
    l.glow.setOpacity(0.22 * k);
  }

  /** Sweep x once around the circle (or `turns` times). Resolves when done. */
  async animateSweep(ms = 4000, turns = 1): Promise<void> {
    this.job?.cancel();
    const t0 = this.t;
    let last = t0;
    const job = animate(ms, (k) => {
      // a slow frame can skip a long way: mark everything swept since the last frame
      const t = t0 + turns * 2 * Math.PI * k;
      this.markRange(last, t - last);
      last = t;
      this.setAngle(t);
    }, ease.linear);
    this.job = job;
    await job;
    if (this.job === job) this.job = null;
  }

  /** Turn x to angle t (the short way round). */
  async turnTo(t: number, ms = 900): Promise<void> {
    this.job?.cancel();
    const t0 = this.t;
    const d = wrapAngle(t - t0);
    const job = animate(ms, (k) => this.setAngle(t0 + d * k), ease.inOut);
    this.job = job;
    await job;
    if (this.job === job) this.job = null;
  }

  /**
   * Show me: visit each eigen-direction in turn (x ends on the last one, on the side closest to
   * where it started). With complex eigenvalues it sweeps all the way round and nothing lights up.
   */
  async showEigen(ms = 1000): Promise<void> {
    if (this.eig.kind === 'none') { await this.animateSweep(ms * 4); return; }
    if (this.eig.kind === 'all') { await this.animateSweep(ms * 2); return; }
    const order = this.eigenAngles().map((a, i) => ({ a, i })).sort((u, v) => lineAngleDist(this.t, u.a) - lineAngleDist(this.t, v.a)).reverse();
    for (const { a, i } of order) {
      // of the two directions on the line, go to the closer one
      const target = Math.abs(wrapAngle(a - this.t)) <= Math.PI / 2 ? a : a + Math.PI;
      await this.turnTo(target, ms);
      await this.pulse(i);
    }
    this.o.onCommit?.(this.t);
  }

  /** Flash eigen-line i. */
  async pulse(i: number, ms = 500): Promise<void> {
    const l = this.lines[i];
    if (!l) return;
    const base = l.level;
    await animate(ms, (k) => this.setLevel(l, base + (1.6 - base) * Math.sin(k * Math.PI)), ease.linear);
    this.setLevel(l, Math.max(base, 0.5));
  }

  /** Change the matrix (forgets the trace and found lines). */
  setM(M: Mat): void {
    this.M = mclone(M);
    this.eig = eigenDirs2(this.M);
    this.found.clear();
    this.visited.fill(0);
    this.buildLines();
    this.redrawTrace();
    this.setAngle(this.t, false);
  }

  setDraggable(on: boolean): void { this.enabled = on; this.x.showHandle(on); }

  dispose(): void {
    this.job?.cancel();
    for (const l of this.lines) { l.core.dispose(); l.glow.dispose(); l.label.dispose(); }
    this.lines = [];
    super.dispose();
  }
}

// ================================================================== UnitCircleImage (the SVD story)

export type SvdMove = 'rotate' | 'stretch';
const MOVES: SvdMove[] = ['rotate', 'stretch', 'rotate'];

export interface UnitCircleImageOpts {
  M: Mat;
  /** Radius of the circle (default 1: the unit circle). */
  radius?: number;
  /** Move this grid along with the circle (e.g. p.grid()). */
  grid?: Grid2D | null;
  /** Show the final ellipse as a dashed outline from the start (default true). */
  target?: boolean;
  /** Labels on the axes (default true). */
  labels?: boolean;
  /** Called after each move with the stage reached (1, 2 or 3). */
  onStage?: (stage: number) => void;
}

/**
 * The unit circle and its image under M (an ellipse). The ellipse's axes are σ1·u1 and σ2·u2 (from
 * the SVD); they come from the perpendicular axes v1, v2 on the circle. play() splits M into three
 * moves: rotate (Vᵀ), stretch along the x- and y-axes (Σ), rotate (U).
 */
export class UnitCircleImage extends Composite {
  dec: Svd2;
  M: Mat;
  /** 0 = the circle, 1 = rotated, 2 = stretched, 3 = rotated again (the ellipse). Fractional while moving. */
  stage = 0;
  readonly radius: number;
  readonly a1: Arrow;
  readonly a2: Arrow;
  private readonly ghost1: Arrow;
  private readonly ghost2: Arrow;
  private readonly shape = new Group();
  private readonly fill: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly outline: FatLine;
  private readonly axes: FatSegments;
  private readonly target: FatLine | null = null;
  private readonly lv1: Label | null = null;
  private readonly lv2: Label | null = null;
  private readonly lu1: Label | null = null;
  private readonly lu2: Label | null = null;
  private readonly o: UnitCircleImageOpts;
  private busy: Promise<void> | null = null;

  constructor(p: PuzzleCtx, o: UnitCircleImageOpts) {
    super(p);
    this.o = o;
    this.M = mclone(o.M);
    this.dec = svdRot2(this.M);
    this.radius = o.radius ?? 1;
    const st = p.g.stage, r = this.radius;
    // the moving shape: a filled circle drawn once and moved by the current matrix
    const circ: V3[] = [];
    for (let i = 0; i <= 160; i++) { const a = (i / 160) * Math.PI * 2; circ.push([r * Math.cos(a), r * Math.sin(a), 0]); }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, ...circ.flat()]), 3));
    const idx: number[] = [];
    for (let i = 0; i < 160; i++) idx.push(0, i + 1, i + 2);
    g.setIndex(idx);
    this.fill = new Mesh(g, new MeshBasicMaterial({ color: new Color(C.result), transparent: true, opacity: 0.06, side: DoubleSide, depthWrite: false }));
    this.outline = new FatLine(st, circ, { color: C.result, width: 2, intensity: 0.95 });
    this.parts.push({ dispose: () => { g.dispose(); this.fill.material.dispose(); } }, this.outline);
    this.shape.add(this.fill, this.outline.object);
    this.shape.matrixAutoUpdate = false;
    this.group.add(this.shape);
    // the circle itself stays behind, faint and dashed
    this.own(new FatLine(st, circ, { color: C.white, width: 1.3, opacity: 0.35, dashed: true, dashSize: 0.1, gapSize: 0.08 }));
    if (o.target !== false) this.target = this.own(new FatLine(st, ellipsePts(this.M, r, 160), { color: C.result, width: 1.4, opacity: 0.45, dashed: true, dashSize: 0.16, gapSize: 0.1 }));
    this.axes = this.own(new FatSegments(st, [[[0, 0, 0], [1, 0, 0]]], { color: C.white, width: 1.1, opacity: 0.35 }));
    // v1, v2 stay on the circle (faint); the bright copies ride along to σ1u1, σ2u2
    this.ghost1 = this.own(new Arrow([0, 0, 0], [1, 0, 0], { color: C.v, width: 0.04, opacity: 0.4, glow: 0.5 }));
    this.ghost2 = this.own(new Arrow([0, 0, 0], [0, 1, 0], { color: C.w, width: 0.04, opacity: 0.4, glow: 0.5 }));
    this.a1 = this.own(new Arrow([0, 0, 0], [1, 0, 0], { color: C.v, width: 0.05 }));
    this.a2 = this.own(new Arrow([0, 0, 0], [0, 1, 0], { color: C.w, width: 0.05 }));
    if (o.labels !== false) {
      const L = (s: string, c: string) => this.own(new Label(s, [0, 0, 0], { color: c, size: 19 }));
      this.lv1 = L('$\\mathbf v_1$', C.v); this.lv2 = L('$\\mathbf v_2$', C.w);
      this.lu1 = L('$\\sigma_1\\mathbf u_1$', C.v); this.lu2 = L('$\\sigma_2\\mathbf u_2$', C.w);
    }
    this.set(0);
  }

  /** The matrix that has been applied so far (I, Vᵀ, ΣVᵀ or M; in between while moving). */
  current(): Mat { return svdPath(this.dec, this.stage); }
  /** Which move comes next (null when all three are done). */
  get next(): SvdMove | null { return this.stage >= 3 - 1e-9 ? null : MOVES[Math.floor(this.stage + 1e-9)]; }

  /** Jump to a stage k ∈ [0, 3] (fractions are part-way through a move). */
  set(k: number): void {
    this.stage = Math.max(0, Math.min(3, k));
    const A = this.current();
    this.shape.matrix.set(A[0][0], A[0][1], 0, 0, A[1][0], A[1][1], 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    this.shape.matrixWorldNeedsUpdate = true;
    this.o.grid?.set(A);
    const r = this.radius;
    const v1 = scale3(this.dec.v1, r), v2 = scale3(this.dec.v2, r);
    const p1 = flat(matVec(A, v1.slice(0, 2))), p2 = flat(matVec(A, v2.slice(0, 2)));
    this.ghost1.set([0, 0, 0], v1); this.ghost2.set([0, 0, 0], v2);
    this.a1.set([0, 0, 0.02], [p1[0], p1[1], 0.02]); this.a2.set([0, 0, 0.02], [p2[0], p2[1], 0.02]);
    this.a1.object.visible = len3(p1) > 0.03; this.a2.object.visible = len3(p2) > 0.03;
    this.axes.setSegments([[scale3(p1, -1), p1], [scale3(p2, -1), p2]]);
    // labels: v1, v2 on the circle; σ1u1, σ2u2 once the ellipse is reached
    const segs: [V3, V3][] = [[[0, 0, 0], v1], [[0, 0, 0], v2], [[0, 0, 0], p1], [[0, 0, 0], p2]];
    const done = this.stage >= 3 - 1e-6;
    if (this.lv1 && this.lv2) {
      const s1 = labelSpot(v1, v1, segs), s2 = labelSpot(v2, v2, segs, [s1]);
      this.lv1.at(s1); this.lv2.at(s2);
      this.lv1.show(!done || len3(sub3(p1, v1)) > 0.5);
      this.lv2.show(!done || len3(sub3(p2, v2)) > 0.5);
      if (this.lu1 && this.lu2) {
        const avoid = [s1, s2];
        const t1 = labelSpot(p1, p1, segs, avoid, 0.5, 0.45);
        this.lu1.at(t1); this.lu2.at(labelSpot(p2, p2, segs, [...avoid, t1], 0.5, 0.45));
        this.lu1.show(done); this.lu2.show(done && len3(p2) > 0.25);
      }
    }
  }

  /** Play the next move (rotate, stretch, rotate). Resolves with the move played, or null if none is left. */
  async step(ms = 1300): Promise<SvdMove | null> {
    if (this.busy) await this.busy;
    const mv = this.next;
    if (!mv) return null;
    const k0 = Math.floor(this.stage + 1e-9);
    sfx.whoosh(ms / 1000);
    this.busy = animate(ms, (k) => this.set(k0 + k), ease.inOut);
    await this.busy;
    this.busy = null;
    this.set(k0 + 1);
    this.o.onStage?.(k0 + 1);
    return mv;
  }

  /**
   * Play moves in order from where it is now (starting again from the circle if all three are done).
   * Each named move must be the next one: ['rotate', 'stretch', 'rotate'] plays the whole story.
   */
  async play(steps: SvdMove[] = MOVES, o: { ms?: number; pause?: number } = {}): Promise<void> {
    if (this.next === null) this.set(0);
    for (const s of steps) {
      if (this.next !== s) throw new Error(`UnitCircleImage.play: next move is ${this.next}, not ${s}`);
      await this.step(o.ms ?? 1300);
      if (o.pause) await animate(o.pause, () => {}, ease.linear);
    }
  }

  /** Back to the circle. */
  async reset(ms = 700): Promise<void> {
    if (this.busy) await this.busy;
    const k0 = this.stage;
    if (ms > 0) await animate(ms, (k) => this.set(k0 * (1 - k)), ease.inOut);
    this.set(0);
  }

  /** Use a new matrix (back at the circle). */
  setM(M: Mat): void {
    this.M = mclone(M);
    this.dec = svdRot2(this.M);
    this.target?.setPoints(ellipsePts(this.M, this.radius, 160));
    this.set(0);
  }
}
