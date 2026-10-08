// The strut box: the slanted crystal three struts build, with the pieces the chapter lays on it:
// the base (the parallelogram of v and w), the arrow straight out of the base (v × w), and the
// height (u's shadow on that arrow). The crystal is yellow when the struts are logged right-handed
// and orange when they are the other way round (the kit's colour for a flipped box).
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Mesh, MeshStandardMaterial } from 'three';
import type { PuzzleCtx, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { FatSegments } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { Parallelepiped, Parallelogram } from '../../../gfx/shapes';
import { Shadow } from '../../../kit/geom';
import { C } from '../../../core/theme';
import { animate, ease } from '../../../core/tween';
import { cross, norm } from '../../../math/la';
import { baseArea, boxVol, height, num } from './logic';

export interface StrutBoxOpts {
  origin?: V3;
  /** Draw the base parallelogram (on the floor of the box). */
  base?: boolean;
  /** Draw v × w straight out of the base (its length is the base area). */
  normal?: boolean;
  /** Draw the height: u's shadow on the line of v × w. */
  height?: boolean;
  /** Write base area and height on the box (cadet). */
  numbers?: boolean;
  opacity?: number;
}

const z3 = (v: readonly number[]): V3 => [v[0], v[1], v[2] ?? 0];

export class StrutBox {
  readonly group = new Group();
  readonly box: Parallelepiped;
  readonly base: Parallelogram | null = null;
  readonly normal: Arrow | null = null;
  readonly shadow: Shadow | null = null;
  readonly baseLabel: Label | null = null;
  readonly heightLabel: Label | null = null;
  v: V3; w: V3; u: V3;

  constructor(p: PuzzleCtx, v: V3, w: V3, u: V3, o: StrutBoxOpts = {}) {
    this.v = v; this.w = w; this.u = u;
    this.group.position.set(...(o.origin ?? [0, 0, 0]));
    p.add(this.group);
    this.box = new Parallelepiped(p.g.stage, v, w, u, { color: C.result, opacity: o.opacity ?? 0.17 });
    this.group.add(this.box.object);
    p.onDispose(() => this.box.dispose());
    if (o.base) {
      this.base = new Parallelogram(p.g.stage, v, w, { color: '#fff1c2', opacity: 0.2, edge: 2.5 });
      this.group.add(this.base.object);
      p.onDispose(() => this.base?.dispose());
    }
    if (o.normal) {
      this.normal = new Arrow([0, 0, 0], [0, 0, 1], { color: '#fff1c2', width: 0.04, label: '$\\mathbf v\\times\\mathbf w$' });
      this.group.add(this.normal.object);
      p.onDispose(() => this.normal?.dispose());
    }
    if (o.height) {
      this.shadow = new Shadow(p, { onto: [0, 0, 1], of: u, color: C.result, lineColor: '#fff1c2', label: 'height' });
      this.group.add(this.shadow.object);
    }
    if (o.numbers) {
      this.baseLabel = new Label('', [0, 0, 0], { className: 'small', color: '#fff1c2' });
      this.heightLabel = new Label('', [0, 0, 0], { className: 'small', color: C.result });
      this.group.add(this.baseLabel.object, this.heightLabel.object);
      p.onDispose(() => { this.baseLabel?.dispose(); this.heightLabel?.dispose(); });
    }
    this.set(v, w, u);
  }

  get object(): Group { return this.group; }
  get volume(): number { return boxVol(this.u, this.v, this.w); }

  set(v: V3, w: V3, u: V3): void {
    this.v = z3(v); this.w = z3(w); this.u = z3(u);
    this.box.set(this.v, this.w, this.u);
    const vol = this.volume;
    this.box.setColor(vol < -1e-9 ? C.orange : C.result);
    this.base?.set(this.v, this.w);
    const n = cross(this.v, this.w) as V3;
    const nl = norm(n);
    if (this.normal) {
      this.normal.object.visible = nl > 1e-6;
      if (nl > 1e-6) this.normal.set([0, 0, 0], n);
    }
    if (this.shadow) {
      this.shadow.show(nl > 1e-6);
      if (nl > 1e-6) this.shadow.set(this.u, n);
    }
    if (this.baseLabel && this.heightLabel) {
      const c: V3 = [(this.v[0] + this.w[0]) / 2, (this.v[1] + this.w[1]) / 2, (this.v[2] + this.w[2]) / 2];
      this.baseLabel.at([c[0], c[1] - 0.25, c[2] - 0.05]);
      this.baseLabel.set(`base area ${num(baseArea(this.v, this.w))}`);
      const h = height(this.u, this.v, this.w);
      const top: V3 = nl > 1e-6 ? [n[0] / nl * h * 0.5, n[1] / nl * h * 0.5, n[2] / nl * h * 0.5] : [0, 0, 0];
      this.heightLabel.at([top[0] - 0.55, top[1] - 0.35, top[2]]);
      this.heightLabel.set(`height ${num(h)}`);
      this.heightLabel.show(nl > 1e-6);
    }
  }

  /** Animate the struts to new places (the honest straight-line path of each strut tip). */
  async to(v: V3, w: V3, u: V3, ms = 900, each?: (v: V3, w: V3, u: V3) => void): Promise<void> {
    const v0 = this.v, w0 = this.w, u0 = this.u;
    const L = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    await animate(ms, (k) => { const a = L(v0, v, k), b = L(w0, w, k), c = L(u0, u, k); this.set(a, b, c); each?.(a, b, c); }, ease.inOut);
  }

  show(on: boolean): void { this.group.visible = on; }
}

/** A tetrahedron on four points: a translucent fill and its six edges. */
export class Tetra {
  readonly group = new Group();
  readonly fill: Mesh<BufferGeometry, MeshStandardMaterial>;
  readonly edges: FatSegments;
  pts: V3[];
  private level = 0;

  constructor(p: PuzzleCtx, pts: readonly V3[], o: { color?: string; fill?: number; edge?: number } = {}) {
    const color = o.color ?? C.result;
    this.pts = pts.map((q) => z3(q));
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(12), 3));
    g.setIndex([0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3]);
    this.fill = new Mesh(g, new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, transparent: true, opacity: o.fill ?? 0, side: DoubleSide, depthWrite: false, roughness: 0.6 }));
    this.edges = new FatSegments(p.g.stage, [], { color, width: 2, intensity: 1.3, opacity: o.edge ?? 0.9 });
    this.group.add(this.fill, this.edges.object);
    p.add(this.group);
    p.onDispose(() => this.dispose());
    this.set(this.pts);
    this.level = o.fill ?? 0;
  }

  get object(): Group { return this.group; }
  /** The centre of the four corners. */
  get centre(): V3 { return [0, 1, 2].map((i) => (this.pts[0][i] + this.pts[1][i] + this.pts[2][i] + this.pts[3][i]) / 4) as V3; }

  set(pts: readonly V3[]): void {
    this.pts = pts.map((q) => z3(q));
    const pos = this.fill.geometry.getAttribute('position') as BufferAttribute;
    pos.set(this.pts.flat());
    pos.needsUpdate = true;
    this.fill.geometry.computeVertexNormals();
    this.fill.geometry.computeBoundingSphere();
    const P = this.pts;
    this.edges.setSegments([[P[0], P[1]], [P[0], P[2]], [P[0], P[3]], [P[1], P[2]], [P[1], P[3]], [P[2], P[3]]]);
  }

  setFill(a: number): void { this.level = a; this.fill.material.opacity = a; }
  async fillTo(a: number, ms = 700): Promise<void> { const a0 = this.level; await animate(ms, (k) => this.setFill(a0 + (a - a0) * k), ease.out); }
  setEdge(a: number): void { this.edges.setOpacity(a); }
  setColor(c: string): void { this.fill.material.color.set(c); this.fill.material.emissive.set(c); this.edges.material.color = new Color(c).multiplyScalar(1.3); }
  dispose(): void { this.fill.geometry.dispose(); this.fill.material.dispose(); this.edges.dispose(); this.group.removeFromParent(); }
}
