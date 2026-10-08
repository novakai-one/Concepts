// Things that sit at points: target pads, glowing dots, 3-D beacons.
import {
  AdditiveBlending, CanvasTexture, Color, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, RingGeometry, SphereGeometry, Sprite, SpriteMaterial, CircleGeometry,
} from 'three';
import type { Stage, V3 } from '../core/stage';
import { animate, ease } from '../core/tween';
import { Label } from './label';

let glowTex: CanvasTexture | null = null;
/** Soft round glow texture shared by sprites. */
export function glowTexture(): CanvasTexture {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.2, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = new CanvasTexture(c);
  return glowTex;
}

export function glowSprite(color: string, size = 1, opacity = 0.8): Sprite {
  const s = new Sprite(new SpriteMaterial({ map: glowTexture(), color: new Color(color), transparent: true, opacity, blending: AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size);
  return s;
}

/** A target ring on the plane. Pulses while waiting; flashes when reached. */
export class Pad {
  readonly group = new Group();
  private readonly ring: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly inner: Mesh<CircleGeometry, MeshBasicMaterial>;
  private readonly halo: Sprite;
  readonly label: Label | null = null;
  private off: () => void;
  done = false;

  constructor(stage: Stage, pos: V3, o: { color?: string; radius?: number; label?: string } = {}) {
    const color = o.color ?? '#59e1ff';
    const r = o.radius ?? 0.32;
    this.ring = new Mesh(new RingGeometry(r * 0.78, r, 48), new MeshBasicMaterial({ color: new Color(color).multiplyScalar(1.5), transparent: true, opacity: 0.95, side: DoubleSide, depthWrite: false }));
    this.inner = new Mesh(new CircleGeometry(r * 0.78, 48), new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: 0.12, side: DoubleSide, depthWrite: false }));
    this.halo = glowSprite(color, r * 4, 0.35);
    this.group.add(this.inner, this.ring, this.halo);
    this.group.position.set(...pos);
    if (o.label) {
      this.label = new Label(o.label, [0, -r - 0.32, 0], { className: 'small' });
      this.group.add(this.label.object);
    }
    this.group.userData.dispose = () => this.dispose();
    this.off = stage.tick((_dt, t) => {
      if (this.done) return;
      const k = 0.5 + 0.5 * Math.sin(t * 3.2);
      this.ring.scale.setScalar(1 + 0.08 * k);
      this.halo.material.opacity = 0.2 + 0.25 * k;
    });
  }

  get object(): Group { return this.group; }
  at(p: V3): void { this.group.position.set(...p); }

  async hit(color = '#3ddc84'): Promise<void> {
    this.done = true;
    this.ring.material.color = new Color(color).multiplyScalar(2);
    this.inner.material.color = new Color(color);
    this.halo.material.color = new Color(color);
    await animate(500, (k) => {
      this.ring.scale.setScalar(1 + 0.6 * ease.out(k));
      this.inner.material.opacity = 0.12 + 0.4 * (1 - k);
      this.halo.material.opacity = 0.9 * (1 - k) + 0.3;
    }, ease.linear);
    this.ring.scale.setScalar(1.15);
  }

  reset(color = '#59e1ff'): void {
    this.done = false;
    this.ring.material.color = new Color(color).multiplyScalar(1.5);
    this.inner.material.color = new Color(color);
    this.halo.material.color = new Color(color);
  }

  dispose(): void {
    this.off();
    this.ring.geometry.dispose(); this.ring.material.dispose();
    this.inner.geometry.dispose(); this.inner.material.dispose();
    this.halo.material.dispose();
    this.label?.dispose();
    this.group.removeFromParent();
  }
}

/** A glowing point. */
export class Dot {
  readonly group = new Group();
  readonly mesh: Mesh<SphereGeometry, MeshStandardMaterial>;
  private readonly halo: Sprite;
  readonly label: Label | null = null;

  constructor(pos: V3, o: { color?: string; size?: number; label?: string; glow?: number; labelOffset?: [number, number] } = {}) {
    const color = o.color ?? '#ffffff';
    const s = o.size ?? 0.09;
    this.mesh = new Mesh(new SphereGeometry(s, 20, 14), new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: o.glow ?? 1.4, roughness: 0.4 }));
    this.halo = glowSprite(color, s * 7, 0.45);
    this.group.add(this.mesh, this.halo);
    this.group.position.set(...pos);
    if (o.label) {
      this.label = new Label(o.label, [0, 0, 0], { className: 'small', offset: o.labelOffset ?? [0, -20] });
      this.group.add(this.label.object);
    }
  }
  get object(): Group { return this.group; }
  at(p: V3): void { this.group.position.set(...p); }
  setColor(c: string): void { this.mesh.material.color.set(c); this.mesh.material.emissive.set(c); this.halo.material.color.set(c); }
  setOpacity(a: number): void {
    this.mesh.material.transparent = a < 1; this.mesh.material.opacity = a; this.halo.material.opacity = 0.45 * a;
    this.group.visible = a > 0.001;
  }
  dispose(): void {
    this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.halo.material.dispose();
    this.label?.dispose(); this.group.removeFromParent();
  }
}

/** A 3-D beacon: a bright core, a halo and a faint vertical beam down to the floor (z = 0). */
export class Beacon {
  readonly group = new Group();
  private readonly core: Mesh<SphereGeometry, MeshStandardMaterial>;
  private readonly beam: Mesh<CylinderGeometry, MeshBasicMaterial>;
  private beamOn = true;
  private readonly halo: Sprite;
  readonly label: Label | null = null;
  private off: () => void;

  constructor(stage: Stage, pos: V3, o: { color?: string; label?: string; beam?: boolean } = {}) {
    const color = o.color ?? '#59e1ff';
    this.core = new Mesh(new SphereGeometry(0.14, 24, 16), new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.2 }));
    this.halo = glowSprite(color, 1.3, 0.6);
    this.beam = new Mesh(new CylinderGeometry(0.015, 0.015, 1, 8, 1, true), new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: 0.35, depthWrite: false }));
    this.beam.rotation.x = Math.PI / 2;
    this.beamOn = o.beam !== false;
    this.beam.visible = this.beamOn;
    this.group.add(this.core, this.halo, this.beam);
    if (o.label) {
      this.label = new Label(o.label, [0, 0, 0.45], { className: 'tag' });
      this.group.add(this.label.object);
    }
    this.at(pos);
    this.group.userData.dispose = () => this.dispose();
    this.off = stage.tick((_dt, t) => { this.halo.material.opacity = 0.45 + 0.2 * Math.sin(t * 2.4); });
  }
  get object(): Group { return this.group; }
  at(p: V3): void {
    this.group.position.set(...p);
    const h = Math.abs(p[2]);
    this.beam.visible = this.beamOn && h > 0.05;
    this.beam.scale.set(1, Math.max(h, 0.001), 1);
    this.beam.position.set(0, 0, -p[2] / 2);
  }
  dispose(): void {
    this.off();
    this.core.geometry.dispose(); this.core.material.dispose();
    this.beam.geometry.dispose(); this.beam.material.dispose();
    this.halo.material.dispose(); this.label?.dispose();
    this.group.removeFromParent();
  }
}
