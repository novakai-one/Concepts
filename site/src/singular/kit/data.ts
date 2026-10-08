// Data pictures: many glowing points, a line fitted through them, projection onto a plane in 3-D,
// and the principal directions of a point cloud. Same kit style as geom.ts.
import {
  BufferAttribute, BufferGeometry, CircleGeometry, Color, DoubleSide, Group, InstancedBufferAttribute, InstancedMesh, Mesh,
  MeshBasicMaterial, NormalBlending, PlaneGeometry, RingGeometry, ShaderMaterial, Vector3,
} from 'three';
import type { PuzzleCtx, V3 } from '../game/types';
import { Arrow } from '../gfx/arrow';
import { FatLine, FatSegments } from '../gfx/lines';
import { Label } from '../gfx/label';
import { PlanePatch } from '../gfx/shapes';
import { C } from '../core/theme';
import { animate, ease } from '../core/tween';
import { gramSchmidt, type Vec } from '../math/la';
import { VectorHandle } from './handle';
import { Composite, Knob, RightAngle } from './geom';
import {
  add3, bestLine, len3, lineThrough, planeSplit, principal, residuals as resid, scale3, shadowsOnLine, spreadAlong,
  ssr as sumSq, sub3, to3, unit3,
} from './geom-math';

// ================================================================== PointCloud

const vert = /* glsl */`
uniform float uSize; uniform float uHalo;
varying vec2 vUv; varying vec3 vColor;
void main() {
  vUv = position.xy;
#ifdef USE_INSTANCING_COLOR
  vColor = instanceColor;
#else
  vColor = vec3(1.0);
#endif
  float s = length(instanceMatrix[0].xyz);
  vec4 c = modelViewMatrix * vec4(instanceMatrix[3].xyz, 1.0);
  c.xy += position.xy * uSize * uHalo * s;   // camera-facing quad
  gl_Position = projectionMatrix * c;
}`;

const frag = /* glsl */`
uniform float uOpacity; uniform float uHalo; uniform float uCore; uniform float uGlow;
varying vec2 vUv; varying vec3 vColor;
void main() {
  float r = length(vUv) * uHalo;              // distance from the centre in core radii
  if (r > uHalo) discard;
  float core = 1.0 - smoothstep(0.72, 1.0, r);
  float glow = exp(-r * r * 0.6) * uGlow;
  float a = clamp(core + glow * (1.0 - core), 0.0, 1.0) * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor * mix(1.15, uCore, core), a);
}`;

export interface PointCloudOpts {
  /** 2-D ([x, y]) or 3-D ([x, y, z]) points. */
  points: number[][];
  color?: string;
  /** Per-point colours (overrides color). */
  colors?: string[];
  /** Radius of each point's bright core in world units (default 0.07). */
  size?: number;
  opacity?: number;
  /** Strength of the soft halo (default 0.4). */
  glow?: number;
  /** Brightness of each core (default 1.6; above 1 blooms). */
  core?: number;
}

const HALO = 3;

/**
 * Many glowing points in one draw call (an InstancedMesh of camera-facing quads with a round,
 * glowing shader). Thousands of points stay at full frame rate.
 */
export class PointCloud {
  readonly group = new Group();
  mesh: InstancedMesh<PlaneGeometry, ShaderMaterial>;
  private readonly geo = new PlaneGeometry(2, 2);
  private readonly mat: ShaderMaterial;
  private pos = new Float32Array(0);
  private scales = new Float32Array(0);
  private base: Color[] = [];
  private n = 0;
  private hi: number | null = null;
  color: string;

  constructor(p: PuzzleCtx, o: PointCloudOpts) {
    this.color = o.color ?? C.accent;
    this.mat = new ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending: NormalBlending,
      uniforms: { uSize: { value: o.size ?? 0.07 }, uHalo: { value: HALO }, uOpacity: { value: o.opacity ?? 1 }, uCore: { value: o.core ?? 1.6 }, uGlow: { value: o.glow ?? 0.4 } },
    });
    this.mesh = this.makeMesh(Math.max(16, o.points.length));
    this.set(o.points, o.colors);
    p.add(this);
  }

  get object(): Group { return this.group; }
  get count(): number { return this.n; }
  /** Copies of the current positions. */
  get points(): V3[] { return Array.from({ length: this.n }, (_, i) => [this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]] as V3); }
  point(i: number): V3 { return [this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]]; }

  private makeMesh(cap: number): InstancedMesh<PlaneGeometry, ShaderMaterial> {
    const m = new InstancedMesh(this.geo, this.mat, cap);
    m.instanceColor = new InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    m.frustumCulled = false;
    m.renderOrder = 3;
    this.group.add(m);
    return m;
  }

  /** Replace every point (and optionally the colours). */
  set(points: number[][], colors?: string[]): void {
    const n = points.length;
    if (n > this.mesh.instanceMatrix.count) {
      this.mesh.removeFromParent();
      this.mesh.dispose();
      this.mesh = this.makeMesh(Math.ceil(n * 1.25));
    }
    if (this.pos.length < n * 3) { this.pos = new Float32Array(n * 3); }
    const sc = new Float32Array(n).fill(1);
    for (let i = 0; i < n; i++) { const q = points[i]; this.pos[i * 3] = q[0]; this.pos[i * 3 + 1] = q[1]; this.pos[i * 3 + 2] = q[2] ?? 0; }
    this.scales = sc;
    this.n = n;
    this.mesh.count = n;
    if (colors || this.base.length !== n) this.base = Array.from({ length: n }, (_, i) => new Color(colors?.[i] ?? this.color));
    this.hi = null;
    this.writeColors();
    this.writeMatrices();
  }

  private writeMatrices(): void {
    const a = this.mesh.instanceMatrix.array as Float32Array;
    for (let i = 0; i < this.n; i++) {
      const s = this.scales[i], k = i * 16;
      a[k] = s; a[k + 1] = 0; a[k + 2] = 0; a[k + 3] = 0;
      a[k + 4] = 0; a[k + 5] = s; a[k + 6] = 0; a[k + 7] = 0;
      a[k + 8] = 0; a[k + 9] = 0; a[k + 10] = s; a[k + 11] = 0;
      a[k + 12] = this.pos[i * 3]; a[k + 13] = this.pos[i * 3 + 1]; a[k + 14] = this.pos[i * 3 + 2]; a[k + 15] = 1;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  private writeColors(): void {
    const c = this.mesh.instanceColor!.array as Float32Array;
    for (let i = 0; i < this.n; i++) { const b = this.base[i]; c[i * 3] = b.r; c[i * 3 + 1] = b.g; c[i * 3 + 2] = b.b; }
    if (this.hi !== null && this.hi < this.n) { const w = this.base[this.hi].clone().lerp(new Color('#ffffff'), 0.55).multiplyScalar(1.6); c.set([w.r, w.g, w.b], this.hi * 3); }
    this.mesh.instanceColor!.needsUpdate = true;
  }

  /** Move one point. */
  setPoint(i: number, q: number[]): void {
    this.pos[i * 3] = q[0]; this.pos[i * 3 + 1] = q[1]; this.pos[i * 3 + 2] = q[2] ?? 0;
    this.writeMatrices();
  }

  /** Slide every point in a straight line to new places (same count). */
  async to(points: number[][], ms = 900, colorTo?: string): Promise<void> {
    if (points.length !== this.n) { this.set(points); return; }
    const from = this.pos.slice(0, this.n * 3);
    const c0 = this.base.map((c) => c.clone());
    const c1 = colorTo ? new Color(colorTo) : null;
    await animate(ms, (k) => {
      for (let i = 0; i < this.n; i++) for (let a = 0; a < 3; a++) this.pos[i * 3 + a] = from[i * 3 + a] + ((points[i][a] ?? 0) - from[i * 3 + a]) * k;
      if (c1) { this.base.forEach((c, i) => c.copy(c0[i]).lerp(c1, k)); this.writeColors(); }
      this.writeMatrices();
    }, ease.inOut);
    if (c1) this.color = colorTo!;
  }

  /** Make point i stand out (bigger and brighter); null clears it. */
  highlight(i: number | null): void {
    if (this.hi !== null && this.hi < this.n) this.scales[this.hi] = 1;
    this.hi = i !== null && i >= 0 && i < this.n ? i : null;
    if (this.hi !== null) this.scales[this.hi] = 1.9;
    this.writeColors();
    this.writeMatrices();
  }

  /** One colour for every point. */
  setColor(c: string): void { this.color = c; this.base = Array.from({ length: this.n }, () => new Color(c)); this.writeColors(); }
  setColorAt(i: number, c: string): void { if (i < this.n) { this.base[i] = new Color(c); this.writeColors(); } }
  setOpacity(a: number): void { this.mat.uniforms.uOpacity.value = a; this.group.visible = a > 0.001; }
  setSize(s: number): void { this.mat.uniforms.uSize.value = s; }

  dispose(): void { this.mesh.dispose(); this.geo.dispose(); this.mat.dispose(); this.group.removeFromParent(); }
}

// ================================================================== FitLine

export interface FitLineOpts {
  points: number[][];
  /** Starting slope and intercept of y = m x + c. */
  m?: number;
  c?: number;
  /** Two handles on the line the player can drag up and down (default true). */
  draggable?: boolean;
  /** x positions of the two handles (default: 20% in from each end of the data). */
  handleX?: [number, number];
  /** Draw each squared residual as a faint square (its area is the residual squared). Toggle with showSquares(). */
  squares?: boolean;
  onChange?(m: number, c: number): void;
  onCommit?(m: number, c: number): void;
}

/**
 * A line y = m x + c through a set of points. Each point has a vertical residual segment to the line
 * (green above, red below), and the sum of squared residuals is kept live. Drag the two handles to
 * move the line; bestFit() is the least-squares line.
 */
export class FitLine extends Composite {
  readonly cloud: PointCloud;
  readonly h1: Knob | null = null;
  readonly h2: Knob | null = null;
  m: number;
  c: number;
  pts: number[][];
  private readonly line: FatLine;
  private readonly up: FatSegments;
  private readonly down: FatSegments;
  private readonly sq: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly sqUp: FatSegments;
  private readonly sqDown: FatSegments;
  private sqOn: boolean;
  private hx: [number, number];
  private readonly o: FitLineOpts;

  constructor(p: PuzzleCtx, o: FitLineOpts) {
    super(p);
    this.o = o;
    this.pts = o.points.map((q) => q.slice());
    const st = p.g.stage;
    const xs = this.pts.map((q) => q[0]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    this.hx = o.handleX ?? [x0 + 0.2 * (x1 - x0), x1 - 0.2 * (x1 - x0)];
    const start = { m: o.m ?? 0, c: o.c ?? 0 };
    this.m = start.m; this.c = start.c;
    this.sqOn = !!o.squares;
    this.sq = new Mesh(new BufferGeometry(), new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.05, side: DoubleSide, depthWrite: false }));
    this.group.add(this.sq);
    this.parts.push({ dispose: () => { this.sq.geometry.dispose(); this.sq.material.dispose(); } });
    this.sqUp = this.own(new FatSegments(st, [[[0, 0, 0], [0, 0, 0]]], { color: C.v, width: 1, opacity: 0.4 }));
    this.sqDown = this.own(new FatSegments(st, [[[0, 0, 0], [0, 0, 0]]], { color: C.w, width: 1, opacity: 0.4 }));
    this.up = this.own(new FatSegments(st, [[[0, 0, 0], [0, 0, 0]]], { color: C.v, width: 2, opacity: 0.85 }));
    this.down = this.own(new FatSegments(st, [[[0, 0, 0], [0, 0, 0]]], { color: C.w, width: 2, opacity: 0.85 }));
    this.line = this.own(new FatLine(st, [[0, 0, 0], [1, 0, 0]], { color: C.result, width: 3, intensity: 1.35 }));
    this.cloud = this.own(new PointCloud(p, { points: this.pts, color: C.white, size: 0.075 }));
    if (o.draggable !== false) {
      const mk = (j: 0 | 1) => new Knob(p, [this.hx[j], this.yAt(this.hx[j]), 0.02], {
        color: C.result,
        constrain: (q) => new Vector3(this.hx[j], Math.max(-12, Math.min(12, q.y)), 0.02),
        onMove: () => this.fromHandles(),
        onEnd: () => o.onCommit?.(this.m, this.c),
      });
      this.h1 = this.own(mk(0));
      this.h2 = this.own(mk(1));
    }
    this.set(this.m, this.c, false);
  }

  /** y on the line at x. */
  yAt(x: number): number { return this.m * x + this.c; }
  /** Residuals y − (m x + c) for every point. */
  get residuals(): number[] { return resid(this.pts, this.m, this.c); }
  /** Sum of squared residuals for the current line. */
  get ssr(): number { return sumSq(this.pts, this.m, this.c); }
  /** The least-squares line (via la.leastSquares on [x 1]·[m c]ᵀ ≈ y). */
  bestFit(): { m: number; c: number } { return bestLine(this.pts) ?? { m: 0, c: 0 }; }
  /** The smallest possible sum of squared residuals. */
  get bestSsr(): number { const b = this.bestFit(); return sumSq(this.pts, b.m, b.c); }

  private fromHandles(): void {
    if (!this.h1 || !this.h2) return;
    const L = lineThrough(this.hx[0], this.h1.pos[1], this.hx[1], this.h2.pos[1]);
    this.set(L.m, L.c, true, false);
  }

  /** Set the line. */
  set(m: number, c: number, notify = true, moveHandles = true): void {
    this.m = m; this.c = c;
    this.line.setPoints([[-40, -40 * m + c, 0.01], [40, 40 * m + c, 0.01]]);
    const up: [V3, V3][] = [], down: [V3, V3][] = [], edgeUp: [V3, V3][] = [], edgeDown: [V3, V3][] = [];
    const quads: number[] = [], cols: number[] = [], idx: number[] = [];
    const cu = new Color(C.v), cd = new Color(C.w);
    this.pts.forEach((q) => {
      const y = this.yAt(q[0]), r = q[1] - y;
      if (Math.abs(r) < 1e-4) return;
      (r > 0 ? up : down).push([[q[0], q[1], 0], [q[0], y, 0]]);
      if (this.sqOn) {
        // a square with the residual as its left side: its area is the residual squared
        const s = Math.abs(r), base = quads.length / 3, x2 = q[0] + s;
        quads.push(q[0], q[1], 0, x2, q[1], 0, x2, y, 0, q[0], y, 0);
        const cc = r > 0 ? cu : cd;
        for (let k = 0; k < 4; k++) cols.push(cc.r, cc.g, cc.b);
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        (r > 0 ? edgeUp : edgeDown).push([[q[0], q[1], 0], [x2, q[1], 0]], [[x2, q[1], 0], [x2, y, 0]], [[x2, y, 0], [q[0], y, 0]]);
      }
    });
    this.up.object.visible = up.length > 0;
    this.down.object.visible = down.length > 0;
    if (up.length) this.up.setSegments(up);
    if (down.length) this.down.setSegments(down);
    this.sq.visible = this.sqOn && quads.length > 0;
    this.sqUp.object.visible = this.sqOn && edgeUp.length > 0;
    this.sqDown.object.visible = this.sqOn && edgeDown.length > 0;
    if (this.sqOn) {
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(new Float32Array(quads), 3));
      g.setAttribute('color', new BufferAttribute(new Float32Array(cols), 3));
      g.setIndex(idx);
      this.sq.geometry.dispose();
      this.sq.geometry = g;
      if (edgeUp.length) this.sqUp.setSegments(edgeUp);
      if (edgeDown.length) this.sqDown.setSegments(edgeDown);
    }
    if (moveHandles) {
      this.h1?.at([this.hx[0], this.yAt(this.hx[0]), 0.02]);
      this.h2?.at([this.hx[1], this.yAt(this.hx[1]), 0.02]);
    }
    if (notify) this.o.onChange?.(m, c);
  }

  /** Animate the line to y = m x + c. */
  async to(m: number, c: number, ms = 1200): Promise<void> {
    const m0 = this.m, c0 = this.c;
    // move the two handle points in straight lines (reads better than lerping m and c)
    const [xa, xb] = this.hx;
    const ya0 = m0 * xa + c0, yb0 = m0 * xb + c0, ya1 = m * xa + c, yb1 = m * xb + c;
    await animate(ms, (k) => { const L = lineThrough(xa, ya0 + (ya1 - ya0) * k, xb, yb0 + (yb1 - yb0) * k); this.set(L.m, L.c); }, ease.inOut);
    this.set(m, c);
  }

  /** Show me: animate to the least-squares line, then fire onCommit. */
  async showBest(ms = 1400): Promise<void> {
    const b = this.bestFit();
    await this.to(b.m, b.c, ms);
    this.o.onCommit?.(this.m, this.c);
  }

  /** Use new data (keeps the line). */
  setPoints(points: number[][]): void {
    this.pts = points.map((q) => q.slice());
    this.cloud.set(this.pts);
    this.set(this.m, this.c);
  }

  setDraggable(on: boolean): void { this.h1?.setEnabled(on); this.h2?.setEnabled(on); }

  /** Show or hide the squares on the residuals. */
  showSquares(on: boolean): void { this.sqOn = on; this.set(this.m, this.c, false, false); }
  get squaresShown(): boolean { return this.sqOn; }
}

// ================================================================== Projector3D

export interface Projector3DOpts {
  /** The plane is every combination of a and b. */
  a: V3;
  b: V3;
  /** The vector to project. */
  v: V3;
  /** Let the player drag v's tip (Shift-drag for height). */
  draggable?: boolean;
  /** Show the projection and residual from the start (default true; false to reveal() later). */
  showProjection?: boolean;
  /** Labels (default on). */
  labels?: boolean;
  /** Side of the square plane patch (default 7). */
  size?: number;
  onChange?(v: V3): void;
  onCommit?(v: V3): void;
}

/**
 * Projection of a 3-D vector onto the plane spanned by a and b: the plane patch, a and b (blue), v
 * (green), its projection p (yellow) lying in the plane, and the dashed residual v − p standing
 * straight up from the plane with a right-angle mark at p.
 */
export class Projector3D extends Composite {
  readonly plane: PlanePatch;
  readonly va: Arrow;
  readonly vb: Arrow;
  readonly vArrow: Arrow;
  readonly handle: VectorHandle | null = null;
  readonly proj: Arrow;
  readonly mark: RightAngle;
  private readonly resid: FatLine;
  private readonly lr: Label | null = null;
  a: V3;
  b: V3;
  v: V3;
  private shown: boolean;
  private readonly o: Projector3DOpts;

  constructor(p: PuzzleCtx, o: Projector3DOpts) {
    super(p);
    this.o = o;
    this.a = to3(o.a); this.b = to3(o.b); this.v = to3(o.v);
    this.shown = o.showProjection !== false;
    const st = p.g.stage;
    const lab = o.labels !== false;
    this.plane = this.own(new PlanePatch(st, [0, 0, 0], [0, 0, 1], { color: C.u, size: o.size ?? 7, opacity: 0.14 }));
    this.va = this.own(new Arrow([0, 0, 0], this.a, { color: C.u, label: lab ? '$\\mathbf a$' : undefined }));
    this.vb = this.own(new Arrow([0, 0, 0], this.b, { color: C.u, label: lab ? '$\\mathbf b$' : undefined }));
    this.resid = this.own(new FatLine(st, [[0, 0, 0], [1, 0, 0]], { color: C.white, width: 1.8, opacity: 0.85, dashed: true, dashSize: 0.14, gapSize: 0.1 }));
    this.mark = this.own(new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 0, 1], 0.3));
    this.proj = this.own(new Arrow([0, 0, 0], [1, 0, 0], { color: C.result, label: lab ? '$\\mathbf p$' : undefined }));
    if (lab) this.lr = this.own(new Label('$\\mathbf v - \\mathbf p$', [0, 0, 0], { color: C.white, size: 17 }));
    if (o.draggable) {
      this.handle = new VectorHandle(p, {
        to: this.v, color: C.v, label: lab ? '$\\mathbf v$' : undefined, snap: null, limit: 6,
        onChange: (tip) => { this.set(tip, false); o.onChange?.(tip); },
        onCommit: (tip) => o.onCommit?.(tip),
      });
      this.vArrow = this.handle.arrow;
      this.group.add(this.vArrow.object);
    } else {
      this.vArrow = this.own(new Arrow([0, 0, 0], this.v, { color: C.v, label: lab ? '$\\mathbf v$' : undefined }));
    }
    this.setPlane(this.a, this.b);
  }

  /** The projection of v onto the plane. */
  get p(): V3 { return planeSplit(this.v, this.a, this.b).p; }
  /** The residual v − p (perpendicular to the plane). */
  get r(): V3 { return planeSplit(this.v, this.a, this.b).r; }
  /** Unit normal of the plane. */
  get normal(): V3 { return planeSplit(this.v, this.a, this.b).n; }
  /** Distance from v's tip to the plane. */
  get distance(): number { return len3(this.r); }

  /** Change the plane. */
  setPlane(a: V3, b: V3): void {
    this.a = to3(a); this.b = to3(b);
    const [e1, e2] = gramSchmidt([this.a, this.b]) as Vec[];
    if (e1 && e2) this.plane.setSpan([0, 0, 0], to3(e1), to3(e2));
    this.va.set([0, 0, 0], this.a);
    this.vb.set([0, 0, 0], this.b);
    this.set(this.v, false);
  }

  /** Move v. */
  set(v: V3, moveArrow = true): void {
    this.v = to3(v);
    if (moveArrow) {
      if (this.handle) this.handle.arrow.set([0, 0, 0], this.v);
      else this.vArrow.set([0, 0, 0], this.v);
    }
    this.draw(planeSplit(this.v, this.a, this.b).p, this.v, this.shown ? 1 : 0, this.shown ? 1 : 0);
  }

  /** Draw the projection part-way: drop goes from v's tip a fraction kd of the way down; p grows to kp. */
  private draw(p: V3, v: V3, kd: number, kp: number): void {
    const rl = len3(sub3(v, p));
    const dropEnd = add3(v, sub3(p, v), kd);
    this.resid.object.visible = kd > 0.001 && rl > 0.04;
    if (this.resid.object.visible) this.resid.setPoints([v, dropEnd]);
    const tip = scale3(p, kp);
    this.proj.object.visible = kp > 0.001 && len3(tip) > 0.03;
    this.proj.set([0, 0, 0], tip);
    const along = len3(p) > 1e-6 ? unit3(p) : unit3(this.a);
    this.mark.show(kd >= 0.999 && kp >= 0.999 && rl > 0.35);
    this.mark.set(p, along, sub3(v, p));
    if (this.lr) {
      this.lr.show(kd >= 0.999 && rl > 0.8);
      // beside the dashed line, on the side away from the origin (clear of a, b and v)
      this.lr.at(add3(add3(p, sub3(v, p), 0.5), along, 0.5));
    }
  }

  /** Show the projection: the drop comes down from v's tip, then p grows along the plane. */
  async reveal(ms = 1400): Promise<void> {
    const p = this.p, v = this.v;
    this.shown = true;
    await animate(ms * 0.5, (k) => this.draw(p, v, k, 0), ease.inOut);
    await animate(ms * 0.5, (k) => this.draw(p, v, 1, k), ease.out);
    this.draw(p, v, 1, 1);
  }

  /** Hide the projection (for puzzles that ask the player to find it). */
  hideProjection(): void { this.shown = false; this.set(this.v, false); }

  /** Animate v to a new place. */
  async moveTo(v: V3, ms = 900): Promise<void> {
    const v0 = this.v;
    await animate(ms, (k) => this.set(add3(v0, sub3(v, v0), k)), ease.inOut);
    this.o.onCommit?.(this.v);
  }
}

// ================================================================== PCAView

/** A white ring with a "mean" tag, drawn on top of the points. */
class MeanMark {
  readonly group = new Group();
  private readonly ring: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly core: Mesh<CircleGeometry, MeshBasicMaterial>;
  readonly label: Label;
  constructor(pos: V3, text = 'mean') {
    const mat = () => new MeshBasicMaterial({ color: new Color(C.white).multiplyScalar(1.3), transparent: true, depthTest: false, depthWrite: false, side: DoubleSide });
    this.ring = new Mesh(new RingGeometry(0.12, 0.165, 40), mat());
    this.core = new Mesh(new CircleGeometry(0.045, 20), mat());
    this.ring.renderOrder = this.core.renderOrder = 12;
    this.label = new Label(text, [0, 0, 0], { className: 'tag', offset: [0, 28] });
    this.group.add(this.ring, this.core, this.label.object);
    this.at(pos);
  }
  get object(): Group { return this.group; }
  at(p: V3): void { this.group.position.set(...p); }
  dispose(): void {
    this.ring.geometry.dispose(); this.ring.material.dispose(); this.core.geometry.dispose(); this.core.material.dispose();
    this.label.dispose(); this.group.removeFromParent();
  }
}

export interface PCAViewOpts {
  /** 2-D or 3-D points. */
  points: number[][];
  color?: string;
  /** Point size (default 0.04). */
  size?: number;
  /** Arrow length = scale · √eigenvalue (default 2: two standard deviations). */
  scale?: number;
  /** Labels on the principal directions (default true). */
  labels?: boolean;
}

/**
 * A point cloud with its mean marked and its principal directions drawn as arrows from the mean
 * (length scale·√eigenvalue). setProbe(dir) shows the shadows of every point on a line through the
 * mean; project() slides the points themselves onto the first direction.
 */
export class PCAView extends Composite {
  readonly cloud: PointCloud;
  readonly axes: Arrow[] = [];
  readonly meanMark: MeanMark;
  pca: { mean: number[]; values: number[]; vectors: number[][] };
  pts: number[][];
  private readonly shadows: PointCloud;
  private readonly probeLine: FatLine;
  private readonly drops: FatSegments;
  private readonly axisGroup = new Group();
  private readonly o: PCAViewOpts;
  private probeDir: V3 | null = null;
  projected = false;

  constructor(p: PuzzleCtx, o: PCAViewOpts) {
    super(p);
    this.o = o;
    this.pts = o.points.map((q) => q.slice());
    this.pca = principal(this.pts);
    const st = p.g.stage;
    this.probeLine = this.own(new FatLine(st, [[0, 0, 0], [1, 0, 0]], { color: C.result, width: 1.6, opacity: 0.55 }));
    this.drops = this.own(new FatSegments(st, [[[0, 0, 0], [0, 0, 0]]], { color: C.result, width: 1, opacity: 0 }));
    this.drops.object.visible = false;
    this.cloud = this.own(new PointCloud(p, { points: this.pts, color: o.color ?? C.accent, size: o.size ?? 0.04, glow: 0.28, core: 1.3, opacity: 0.9 }));
    this.shadows = this.own(new PointCloud(p, { points: this.pts, color: C.result, size: (o.size ?? 0.04) * 0.75, glow: 0.2, core: 1.2, opacity: 0.75 }));
    this.group.add(this.axisGroup);
    this.meanMark = this.own(new MeanMark(to3(this.pca.mean)));
    this.buildAxes();
    this.setProbe(null);
  }

  get mean(): V3 { return to3(this.pca.mean); }
  /** The first principal direction (unit). */
  get first(): V3 { return to3(this.pca.vectors[0]); }
  /** Share of the total spread that lies along the first direction (0..1). */
  get explained(): number { const s = this.pca.values.reduce((a, b) => a + b, 0); return s > 0 ? this.pca.values[0] / s : 0; }
  /** Spread (variance) of the shadows on the line through the mean along dir. */
  spread(dir: V3): number { return spreadAlong(this.pts, this.pca.mean, dir.slice(0, this.pca.mean.length)); }

  private buildAxes(): void {
    for (const a of this.axes.splice(0)) a.dispose();
    const cols = [C.v, C.w, C.u];
    const s = this.o.scale ?? 2;
    // flat data: lift the arrows a little so they draw over the points
    const m = add3(this.mean, [0, 0, this.pca.mean.length < 3 ? 0.1 : 0]);
    this.pca.vectors.forEach((v, i) => {
      const len = s * Math.sqrt(this.pca.values[i]);
      if (len < 0.05) return;
      const a = new Arrow(m, add3(m, to3(v), len), { color: cols[i] ?? C.white, width: 0.045, label: this.o.labels === false ? undefined : `$\\mathbf p_${i + 1}$` });
      this.axisGroup.add(a.object);
      this.axes.push(a);
    });
  }

  /** Show the principal-direction arrows (grow them in) or hide them. */
  async showAxes(on: boolean, ms = 700): Promise<void> {
    this.axisGroup.visible = on;
    if (on) await Promise.all(this.axes.map((a) => a.grow(ms)));
  }

  /** Show the shadows of all points on the line through the mean along dir (null hides them). Returns their spread. */
  setProbe(dir: V3 | null): number {
    this.probeDir = dir ? unit3(dir) : null;
    const on = !!this.probeDir && !this.projected;
    this.probeLine.object.visible = on;
    this.shadows.group.visible = on;
    if (!this.probeDir) return 0;
    const d = this.probeDir, m = this.mean;
    this.probeLine.setPoints([add3(m, d, -40), add3(m, d, 40)]);
    const sh = shadowsOnLine(this.pts, this.pca.mean, d.slice(0, this.pca.mean.length));
    this.shadows.set(sh);
    return this.spread(d);
  }

  /** Slide every point onto the line through the mean along the first direction (or along dir). */
  async project(ms = 1600, dir?: V3): Promise<void> {
    const d = dir ? unit3(dir) : this.first;
    const sh = shadowsOnLine(this.pts, this.pca.mean, d.slice(0, this.pca.mean.length));
    this.projected = true;
    this.setProbe(this.probeDir);
    this.probeLine.object.visible = true;
    const m = this.mean;
    this.probeLine.setPoints([add3(m, d, -40), add3(m, d, 40)]);
    this.drops.setSegments(this.pts.map((q, i) => [to3(q), to3(sh[i])] as [V3, V3]));
    this.drops.object.visible = true;
    this.drops.setOpacity(0.3);
    await Promise.all([
      this.cloud.to(sh, ms, C.result),
      animate(ms, (k) => this.drops.setOpacity(0.3 * (1 - k)), ease.in),
    ]);
    this.drops.object.visible = false;
  }

  /** Put the points back where they were. */
  async restore(ms = 900): Promise<void> {
    await this.cloud.to(this.pts, ms, this.o.color ?? C.accent);
    this.projected = false;
    this.setProbe(this.probeDir);
  }

  /** Use new points (recomputes the mean and directions). */
  set(points: number[][]): void {
    this.pts = points.map((q) => q.slice());
    this.pca = principal(this.pts);
    this.cloud.set(this.pts);
    this.meanMark.at(this.mean);
    this.buildAxes();
    this.setProbe(this.probeDir);
  }

  dispose(): void { for (const a of this.axes.splice(0)) a.dispose(); super.dispose(); }
}
