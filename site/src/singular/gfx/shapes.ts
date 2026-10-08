// Areas, volumes, planes and outlines.
import {
  BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  ShapeGeometry, Shape, Vector2,
} from 'three';
import type { Stage, V3 } from '../core/stage';
import { animate, ease } from '../core/tween';
import { cross, normalize, type Mat } from '../math/la';
import { FatLine, FatSegments } from './lines';

/** Filled parallelogram on edges a and b from an origin (2-D or 3-D). Its area is |a × b|. */
export class Parallelogram {
  readonly group = new Group();
  private readonly fill: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly edges: FatLine;
  a: V3 = [1, 0, 0];
  b: V3 = [0, 1, 0];
  o: V3 = [0, 0, 0];

  constructor(stage: Stage, a: V3, b: V3, opts: { color?: string; opacity?: number; origin?: V3; edge?: number } = {}) {
    const color = opts.color ?? '#ffd166';
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(12), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.fill = new Mesh(g, new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: opts.opacity ?? 0.22, side: DoubleSide, depthWrite: false }));
    this.edges = new FatLine(stage, [[0, 0, 0], [1, 0, 0]], { color, width: opts.edge ?? 2, intensity: 1.3, opacity: 0.9 });
    this.group.add(this.fill, this.edges.object);
    this.set(a, b, opts.origin);
  }
  get object(): Group { return this.group; }

  set(a: V3, b: V3, origin: V3 = this.o): void {
    this.a = a; this.b = b; this.o = origin;
    const o = origin;
    const p1: V3 = [o[0] + a[0], o[1] + a[1], o[2] + a[2]];
    const p2: V3 = [p1[0] + b[0], p1[1] + b[1], p1[2] + b[2]];
    const p3: V3 = [o[0] + b[0], o[1] + b[1], o[2] + b[2]];
    const pos = this.fill.geometry.getAttribute('position') as BufferAttribute;
    pos.set([...o, ...p1, ...p2, ...p3]);
    pos.needsUpdate = true;
    this.fill.geometry.computeBoundingSphere();
    this.edges.setPoints([o, p1, p2, p3, o]);
  }

  setColor(c: string): void { this.fill.material.color.set(c); this.edges.setColor(c, 1.3); }
  setOpacity(fill: number, edge = 0.9): void { this.fill.material.opacity = fill; this.edges.setOpacity(edge); this.group.visible = fill + edge > 0.001; }

  async morph(a: V3, b: V3, ms = 700): Promise<void> {
    const a0 = this.a, b0 = this.b;
    await animate(ms, (k) => this.set(
      [0, 1, 2].map((i) => a0[i] + (a[i] - a0[i]) * k) as V3,
      [0, 1, 2].map((i) => b0[i] + (b[i] - b0[i]) * k) as V3,
    ), ease.inOut);
  }

  dispose(): void { this.fill.geometry.dispose(); this.fill.material.dispose(); this.edges.dispose(); this.group.removeFromParent(); }
}

/** The box spanned by three edge vectors. Its volume is the scalar triple product a · (b × c). */
export class Parallelepiped {
  readonly group = new Group();
  private readonly fill: Mesh<BufferGeometry, MeshStandardMaterial>;
  private readonly edges: FatSegments;
  vecs: [V3, V3, V3] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

  constructor(stage: Stage, a: V3, b: V3, c: V3, opts: { color?: string; opacity?: number } = {}) {
    const color = opts.color ?? '#ffd166';
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(8 * 3), 3));
    // 6 faces, 2 triangles each
    g.setIndex([0, 1, 3, 0, 3, 2, 4, 6, 7, 4, 7, 5, 0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6, 0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3]);
    this.fill = new Mesh(g, new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, transparent: true, opacity: opts.opacity ?? 0.2, side: DoubleSide, depthWrite: false, roughness: 0.6 }));
    this.edges = new FatSegments(stage, [], { color, width: 2, intensity: 1.3, opacity: 0.9 });
    this.group.add(this.fill, this.edges.object);
    this.set(a, b, c);
  }
  get object(): Group { return this.group; }

  set(a: V3, b: V3, c: V3): void {
    this.vecs = [a, b, c];
    const P: V3[] = [];
    for (let i = 0; i < 8; i++) {
      const s = [(i >> 2) & 1, (i >> 1) & 1, i & 1]; // i = 4·[a] + 2·[b] + [c]
      P.push([0, 1, 2].map((k) => s[0] * a[k] + s[1] * b[k] + s[2] * c[k]) as V3);
    }
    const pos = this.fill.geometry.getAttribute('position') as BufferAttribute;
    pos.set(P.flat());
    pos.needsUpdate = true;
    this.fill.geometry.computeVertexNormals();
    this.fill.geometry.computeBoundingSphere();
    const E: [number, number][] = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]];
    this.edges.setSegments(E.map(([i, j]) => [P[i], P[j]]));
  }

  async morph(a: V3, b: V3, c: V3, ms = 800): Promise<void> {
    const [a0, b0, c0] = this.vecs;
    const L = (x: V3, y: V3, k: number) => [0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * k) as V3;
    await animate(ms, (k) => this.set(L(a0, a, k), L(b0, b, k), L(c0, c, k)), ease.inOut);
  }

  setColor(c: string): void { this.fill.material.color.set(c); this.fill.material.emissive.set(c); this.edges.material.color = new Color(c).multiplyScalar(1.3); }
  dispose(): void { this.fill.geometry.dispose(); this.fill.material.dispose(); this.edges.dispose(); this.group.removeFromParent(); }
}

/** A finite square patch of a plane in 3-D, given a point on it and its normal (or two directions). */
export class PlanePatch {
  readonly group = new Group();
  private readonly fill: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly edges: FatLine;
  private readonly gridLines: FatSegments;
  size: number;

  constructor(stage: Stage, point: V3, normal: V3, opts: { color?: string; size?: number; opacity?: number } = {}) {
    const color = opts.color ?? '#4da3ff';
    this.size = opts.size ?? 6;
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(12), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.fill = new Mesh(g, new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: opts.opacity ?? 0.16, side: DoubleSide, depthWrite: false }));
    this.edges = new FatLine(stage, [[0, 0, 0], [1, 0, 0]], { color, width: 1.6, intensity: 1.2, opacity: 0.8 });
    this.gridLines = new FatSegments(stage, [], { color, width: 1, opacity: 0.25 });
    this.group.add(this.fill, this.edges.object, this.gridLines.object);
    this.set(point, normal);
  }
  get object(): Group { return this.group; }

  /** Place the plane through `point` with normal `n`. */
  set(point: V3, n: V3): void {
    const nn = normalize(n);
    // two directions in the plane
    const helper: V3 = Math.abs(nn[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const u = normalize(cross(nn, helper));
    const v = normalize(cross(nn, u));
    this.setSpan(point, u as V3, v as V3);
  }

  /** Place the plane through `point` spanned by directions u and v. */
  setSpan(point: V3, u: V3, v: V3): void {
    const h = this.size / 2;
    const uu = normalize(u), vv = normalize(v);
    const P = (s: number, t: number): V3 => [0, 1, 2].map((i) => point[i] + s * uu[i] + t * vv[i]) as V3;
    const corners = [P(-h, -h), P(h, -h), P(h, h), P(-h, h)];
    const pos = this.fill.geometry.getAttribute('position') as BufferAttribute;
    pos.set(corners.flat());
    pos.needsUpdate = true;
    this.fill.geometry.computeBoundingSphere();
    this.edges.setPoints([...corners, corners[0]]);
    const segs: [V3, V3][] = [];
    for (let k = -h + 1; k < h; k++) { segs.push([P(k, -h), P(k, h)]); segs.push([P(-h, k), P(h, k)]); }
    this.gridLines.setSegments(segs);
  }

  setOpacity(a: number): void { this.fill.material.opacity = 0.16 * a; this.edges.setOpacity(0.8 * a); this.gridLines.setOpacity(0.25 * a); }
  dispose(): void { this.fill.geometry.dispose(); this.fill.material.dispose(); this.edges.dispose(); this.gridLines.dispose(); this.group.removeFromParent(); }
}

/** A long straight line through a point along a direction (reads as infinite). */
export class InfLine {
  readonly line: FatLine;
  constructor(stage: Stage, point: V3, dir: V3, opts: { color?: string; width?: number; length?: number; dashed?: boolean; opacity?: number } = {}) {
    const L = opts.length ?? 60;
    this.line = new FatLine(stage, InfLine.pts(point, dir, L), { color: opts.color ?? '#b388ff', width: opts.width ?? 2.5, intensity: 1.4, dashed: opts.dashed, opacity: opts.opacity ?? 0.9 });
    this.length = L;
  }
  private length: number;
  static pts(p: V3, d: V3, L: number): V3[] {
    const n = normalize(d);
    return [[p[0] - n[0] * L, p[1] - n[1] * L, p[2] - n[2] * L], [p[0] + n[0] * L, p[1] + n[1] * L, p[2] + n[2] * L]];
  }
  get object() { return this.line.object; }
  set(point: V3, dir: V3): void { this.line.setPoints(InfLine.pts(point, dir, this.length)); }
  dispose(): void { this.line.dispose(); }
}

/**
 * A flat outline shape (e.g. a ship silhouette or the letter F) drawn on the plane and moved by a
 * 2×2 matrix. A shape with no mirror symmetry shows when a matrix flips orientation.
 */
export class Outline2D {
  readonly group = new Group();
  private readonly fill: Mesh<ShapeGeometry, MeshBasicMaterial>;
  private readonly edge: FatLine;
  M: Mat = [[1, 0], [0, 1]];
  offset: [number, number] = [0, 0];

  constructor(stage: Stage, pts: [number, number][], opts: { color?: string; opacity?: number } = {}) {
    const color = opts.color ?? '#59e1ff';
    const shape = new Shape(pts.map(([x, y]) => new Vector2(x, y)));
    this.fill = new Mesh(new ShapeGeometry(shape), new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: opts.opacity ?? 0.25, side: DoubleSide, depthWrite: false }));
    this.edge = new FatLine(stage, [...pts, pts[0]].map(([x, y]) => [x, y, 0] as V3), { color, width: 2.2, intensity: 1.4 });
    this.group.add(this.fill, this.edge.object);
    this.group.matrixAutoUpdate = false;
  }
  get object(): Group { return this.group; }

  /** Move the outline by M (then shift by offset). */
  set(M: Mat, offset: [number, number] = this.offset): void {
    this.M = M; this.offset = offset;
    const m = new Matrix4().set(M[0][0], M[0][1], 0, offset[0], M[1][0], M[1][1], 0, offset[1], 0, 0, 1, 0, 0, 0, 0, 1);
    this.group.matrix.copy(m);
    this.group.matrixWorldNeedsUpdate = true;
  }

  async to(M: Mat, ms = 1200): Promise<void> {
    const M0 = this.M;
    await animate(ms, (k) => this.set(M0.map((r, i) => r.map((x, j) => x + (M[i][j] - x) * k))), ease.inOut);
  }

  dispose(): void { this.fill.geometry.dispose(); this.fill.material.dispose(); this.edge.dispose(); this.group.removeFromParent(); }
}

/** A 3-D lattice of lines (a cube of whole-number lines) moved by a 3×3 matrix. */
export class Lattice3D {
  readonly group = new Group();
  private readonly lines: FatSegments;
  private readonly axes: FatSegments;
  M: Mat = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

  constructor(stage: Stage, opts: { extent?: number; color?: string; opacity?: number } = {}) {
    const n = opts.extent ?? 3;
    const segs: [V3, V3][] = [];
    for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) {
      segs.push([[-n, a, b], [n, a, b]]);
      segs.push([[a, -n, b], [a, n, b]]);
      segs.push([[a, b, -n], [a, b, n]]);
    }
    this.lines = new FatSegments(stage, segs, { color: opts.color ?? '#3a7bd5', width: 1, opacity: opts.opacity ?? 0.22 });
    this.axes = new FatSegments(stage, [[[-n, 0, 0], [n, 0, 0]], [[0, -n, 0], [0, n, 0]], [[0, 0, -n], [0, 0, n]]], { color: '#8fb8e8', width: 2, opacity: 0.7 });
    this.group.add(this.lines.object, this.axes.object);
    this.group.matrixAutoUpdate = false;
  }
  get object(): Group { return this.group; }

  set(M: Mat): void {
    this.M = M;
    this.group.matrix.set(M[0][0], M[0][1], M[0][2], 0, M[1][0], M[1][1], M[1][2], 0, M[2][0], M[2][1], M[2][2], 0, 0, 0, 0, 1);
    this.group.matrixWorldNeedsUpdate = true;
  }

  async to(M: Mat, ms = 1400): Promise<void> {
    const M0 = this.M;
    await animate(ms, (k) => this.set(M0.map((r, i) => r.map((x, j) => x + (M[i][j] - x) * k))), ease.inOut);
  }

  setOpacity(a: number): void { this.lines.setOpacity(0.22 * a); this.axes.setOpacity(0.7 * a); }
  dispose(): void { this.lines.dispose(); this.axes.dispose(); this.group.removeFromParent(); }
}
