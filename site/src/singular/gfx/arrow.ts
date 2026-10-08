// A glowing arrow from one point to another (2-D on the z = 0 plane, or full 3-D).
// The shaft is a cylinder and the head a cone, so seen from above it reads as a flat arrow,
// and in 3-D it has real depth and shading.
import {
  Color, ConeGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3,
  MeshBasicMaterial, RingGeometry, DoubleSide,
} from 'three';
import type { V3 } from '../core/stage';
import { animate, ease } from '../core/tween';
import { Label } from './label';

export interface ArrowOpts {
  color?: string;
  width?: number;        // shaft radius in world units
  label?: string;        // may contain $tex$
  labelColor?: string;
  labelAt?: 'tip' | 'mid';
  labelGap?: number;     // distance from the tip to a tip label (default 0.38): more for a tall label beside a drag ring
  opacity?: number;
  glow?: number;         // emissive strength (bloom)
  handle?: boolean;      // show a grab ring at the tip
}

const UP = new Vector3(0, 1, 0);
const shaftGeo = new CylinderGeometry(1, 1, 1, 18, 1, false).translate(0, 0.5, 0);
const headGeo = new ConeGeometry(1, 1, 24, 1, false).translate(0, 0.5, 0);
const tipGeo = new SphereGeometry(1, 16, 12);

export class Arrow {
  readonly group = new Group();
  readonly from = new Vector3();
  readonly to = new Vector3();
  private readonly shaft: Mesh<CylinderGeometry, MeshStandardMaterial>;
  private readonly head: Mesh<ConeGeometry, MeshStandardMaterial>;
  private readonly hitbox: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly ring: Mesh<RingGeometry, MeshBasicMaterial> | null = null;
  label: Label | null = null;
  private labelAt: 'tip' | 'mid';
  private labelGap: number;
  width: number;
  color: string;

  constructor(from: V3, to: V3, o: ArrowOpts = {}) {
    this.color = o.color ?? '#ffffff';
    this.width = o.width ?? 0.05;
    this.labelAt = o.labelAt ?? 'tip';
    this.labelGap = o.labelGap ?? 0.38;
    const mat = () => new MeshStandardMaterial({
      color: new Color(this.color), emissive: new Color(this.color), emissiveIntensity: o.glow ?? 0.85,
      roughness: 0.35, metalness: 0.15, transparent: (o.opacity ?? 1) < 1, opacity: o.opacity ?? 1,
    });
    this.shaft = new Mesh(shaftGeo, mat());
    this.head = new Mesh(headGeo, mat());
    this.group.add(this.shaft, this.head);
    // invisible grab target at the tip (bigger than the arrowhead, so it is easy to grab)
    this.hitbox = new Mesh(tipGeo, new MeshBasicMaterial({ visible: false }));
    this.hitbox.scale.setScalar(0.42);
    this.hitbox.userData.arrow = this;
    this.group.add(this.hitbox);
    if (o.handle) {
      this.ring = new Mesh(new RingGeometry(0.2, 0.26, 40), new MeshBasicMaterial({ color: new Color(this.color).multiplyScalar(1.4), transparent: true, opacity: 0.85, side: DoubleSide, depthWrite: false }));
      this.group.add(this.ring);
    }
    if (o.label) {
      this.label = new Label(o.label, [0, 0, 0], { color: o.labelColor ?? this.color, className: 'g-label-vec' });
      this.group.add(this.label.object);
    }
    this.set(from, to);
  }

  get object(): Group { return this.group; }
  /** The mesh to raycast against when dragging the tip. */
  get grab(): Mesh { return this.hitbox; }

  /** Place the arrow. */
  set(from: V3 | Vector3, to: V3 | Vector3): void {
    this.from.copy(Array.isArray(from) ? new Vector3(...from) : from);
    this.to.copy(Array.isArray(to) ? new Vector3(...to) : to);
    const d = new Vector3().subVectors(this.to, this.from);
    const len = d.length();
    const r = this.width;
    const headLen = Math.min(r * 6.5, len * 0.45);
    const headR = r * 2.7 * Math.min(1, len / (r * 6.5 * 1.2) + 0.25);
    const vis = len > 1e-4;
    this.shaft.visible = this.head.visible = vis;
    if (vis) {
      const q = new Quaternion().setFromUnitVectors(UP, d.clone().normalize());
      this.shaft.position.copy(this.from);
      this.shaft.quaternion.copy(q);
      this.shaft.scale.set(r, Math.max(1e-4, len - headLen * 0.9), r);
      this.head.position.copy(this.from).addScaledVector(d, (len - headLen) / len);
      this.head.quaternion.copy(q);
      this.head.scale.set(headR, headLen, headR);
    }
    this.hitbox.position.copy(this.to);
    if (this.ring) this.ring.position.copy(this.to).setZ(this.to.z + 0.002);
    if (this.label) {
      if (this.labelAt === 'mid') {
        const mid = new Vector3().addVectors(this.from, this.to).multiplyScalar(0.5);
        // nudge perpendicular (in the xy-plane) so the label does not sit on the shaft
        const perp = new Vector3(-d.y, d.x, 0).normalize().multiplyScalar(0.35);
        this.label.object.position.copy(mid).add(perp);
      } else {
        const ext = len > 1e-4 ? d.clone().normalize().multiplyScalar(this.labelGap) : new Vector3(0.3, 0.3, 0);
        this.label.object.position.copy(this.to).add(ext);
      }
    }
  }

  setTo(to: V3 | Vector3): void { this.set(this.from.clone(), to); }

  /** Set (or first create) the label. */
  setLabel(s: string): void {
    if (!this.label) {
      if (!s) return;
      this.label = new Label(s, [0, 0, 0], { color: this.color, className: 'g-label-vec' });
      this.group.add(this.label.object);
      this.set(this.from.clone(), this.to.clone());
      return;
    }
    this.label.set(s);
  }

  setColor(c: string): void {
    this.color = c;
    for (const m of [this.shaft.material, this.head.material]) { m.color.set(c); m.emissive.set(c); }
    if (this.ring) this.ring.material.color = new Color(c).multiplyScalar(1.4);
    if (this.label) this.label.el.style.color = c;
  }

  setOpacity(a: number): void {
    for (const m of [this.shaft.material, this.head.material]) { m.transparent = a < 1; m.opacity = a; }
    if (this.label) this.label.el.style.opacity = String(a);
    this.group.visible = a > 0.001;
  }

  setGlow(g: number): void { this.shaft.material.emissiveIntensity = g; this.head.material.emissiveIntensity = g; }

  showHandle(v: boolean): void { if (this.ring) this.ring.visible = v; }

  /** Animate the tip (and optionally the tail) to new places. */
  async moveTo(to: V3, ms = 600, from?: V3): Promise<void> {
    const f0 = this.from.clone(), t0 = this.to.clone();
    const f1 = from ? new Vector3(...from) : f0.clone(), t1 = new Vector3(...to);
    await animate(ms, (k) => this.set(f0.clone().lerp(f1, k), t0.clone().lerp(t1, k)), ease.inOut);
  }

  /** Grow from zero length. */
  async grow(ms = 500): Promise<void> {
    const f = this.from.clone(), t = this.to.clone();
    await animate(ms, (k) => this.set(f, f.clone().lerp(t, k)), ease.out);
  }

  /** Pulse the glow (feedback). */
  async pulse(ms = 600, peak = 3): Promise<void> {
    const base = this.shaft.material.emissiveIntensity;
    await animate(ms, (k) => this.setGlow(base + (peak - base) * Math.sin(k * Math.PI)), ease.linear);
    this.setGlow(base);
  }

  dispose(): void {
    this.shaft.material.dispose();
    this.head.material.dispose();
    this.hitbox.material.dispose();
    if (this.ring) { this.ring.geometry.dispose(); this.ring.material.dispose(); }
    this.label?.dispose();
    this.group.removeFromParent();
  }
}
