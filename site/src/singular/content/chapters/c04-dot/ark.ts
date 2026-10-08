// Act II staging shared by Chapters 4 and 5: the Meridian in the star's low light, the Lantern, drifting
// debris, beacon pings, the dish beam and a scripted camera. Everything hangs off one root group in the
// world, so clearing the world (a beat change) removes it and stops its per-frame work.
import {
  AdditiveBlending, CanvasTexture, Color, ConeGeometry, DirectionalLight, Group, Matrix4, Mesh, MeshBasicMaterial, Object3D,
  PointLight, Quaternion, SphereGeometry, Sprite, SpriteMaterial, Vector3,
} from 'three';
import type { Game, V3 } from '../../../game/types';
import { loadModel, type Ship } from '../../../gfx/models';
import { glowSprite } from '../../../gfx/markers';
import { animate, ease } from '../../../core/tween';
import { makeLantern } from '../../common/set';
import { rng } from '../../../game/lawcheck';

export const STAR_DIR: V3 = [-0.55, -0.75, 0.22];
export const STAR_COLOR = '#ffd2a1';

export interface ArkOpts {
  /** Where the ark's centre sits and which way its spine points. */
  at?: V3;
  spine?: V3;
  /** Model scale: 1 is 60 units long (1.2 km). */
  scale?: number;
  /** Lean of the box frames along the spine (the Act I shear). */
  shear?: number;
  /** Slow tumble about this axis (degrees per second). */
  tumble?: { axis: V3; dps: number } | null;
  lantern?: { at: V3; face: V3; scale?: number; thrust?: number } | null;
  debris?: number;
  /** Extra light on the hull from the low star. */
  starLight?: number;
  /** Direction toward the star (its glow sits far away that way). */
  starDir?: V3;
}

export interface ArkSet {
  root: Group;
  /** Positioned and oriented group; the model sits inside the shear group. */
  ark: Group;
  model: Object3D | null;
  lantern: Ship | null;
  /** False once the world has been cleared under the set (the player moved on). */
  alive(): boolean;
  /** Per-frame work owned by the set. */
  tick(fn: (dt: number, t: number) => void): void;
}

/** Quaternion turning +X onto d. */
export function alongX(d: V3): Quaternion {
  return new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), new Vector3(...d).normalize());
}

export async function arkSet(g: Game, o: ArkOpts = {}): Promise<ArkSet> {
  const root = new Group();
  root.name = 'act2-set';
  g.stage.world.add(root);
  const offs: (() => void)[] = [];
  root.userData.dispose = () => { offs.splice(0).forEach((f) => f()); };
  const alive = () => !!root.parent;
  // a set already cleared (the player moved on while a model loaded) takes no new per-frame work
  const tick = (fn: (dt: number, t: number) => void) => { if (alive()) offs.push(g.stage.tick(fn)); };

  // the low star: a warm key light and a glow far away in its direction
  const sd = new Vector3(...(o.starDir ?? STAR_DIR)).normalize();
  const star = new DirectionalLight(STAR_COLOR, o.starLight ?? 2.4);
  star.position.copy(sd.clone().multiplyScalar(100));
  root.add(star, star.target);
  const glow = glowSprite(STAR_COLOR, 160, 0.9);
  glow.position.copy(sd.clone().multiplyScalar(900));
  const core = glowSprite('#fff4e0', 40, 1);
  core.position.copy(glow.position);
  root.add(glow, core);

  // the ark
  const ark = new Group();
  ark.position.set(...(o.at ?? [0, 0, 0]));
  ark.quaternion.copy(alongX(o.spine ?? [1, 0, 0]));
  root.add(ark);
  const shear = new Group();
  shear.matrixAutoUpdate = false;
  shear.matrix.copy(new Matrix4().set(1, 0, o.shear ?? 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1));
  ark.add(shear);
  const nd = o.debris ?? 0;
  const [model, ...debrisModels] = await Promise.all([loadModel('meridian'), ...Array.from({ length: nd }, (_, i) => loadModel(`debris_${i % 6}`))]);
  if (model) {
    model.rotation.x = Math.PI / 2;
    model.scale.setScalar(o.scale ?? 1);
    shear.add(model);
    const rings = ['ring_1', 'ring_2', 'ring_3'].map((n) => model.getObjectByName(n)).filter(Boolean) as Object3D[];
    tick((dt) => rings.forEach((r, i) => { r.rotation.x += dt * (0.1 + 0.02 * i); }));
    // the hangar lights and windows glow a little warmer in the star's light
    const lamp = new PointLight('#ffcf9a', 30, 40 * (o.scale ?? 1));
    lamp.position.set(20 * (o.scale ?? 1), 0, 0);
    ark.add(lamp);
  }
  if (o.tumble) {
    const ax = new Vector3(...o.tumble.axis).normalize();
    const rate = (o.tumble.dps * Math.PI) / 180;
    tick((dt) => { ark.quaternion.premultiply(new Quaternion().setFromAxisAngle(ax, rate * dt)); });
  }

  // debris drifting between the ships
  const r = rng(91);
  for (let i = 0; i < nd; i++) {
    const m = debrisModels[i];
    if (!m) continue;
    const p = new Vector3((r() - 0.5) * 70, (r() - 0.2) * 60, (r() - 0.5) * 26);
    m.position.copy(p);
    m.scale.setScalar(0.5 + r() * 1.6);
    m.rotation.set(r() * 6, r() * 6, r() * 6);
    const spin = new Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.4);
    root.add(m);
    tick((dt) => { m.rotation.x += spin.x * dt; m.rotation.y += spin.y * dt; m.rotation.z += spin.z * dt; });
  }

  let lantern: Ship | null = null;
  if (o.lantern) {
    lantern = makeLantern(g.stage, o.lantern.scale ?? 0.5);
    lantern.object.position.set(...o.lantern.at);
    lantern.face(o.lantern.face);
    root.add(lantern.object);
    lantern.setThrust(o.lantern.thrust ?? 0.12);
    const base = lantern.object.position.z;
    const ls = lantern;
    tick((_dt, t) => { ls.object.position.z = base + 0.06 * Math.sin(t * 0.7); });
  }
  return { root, ark, model, lantern, alive, tick };
}

// ------------------------------------------------------------------ camera

/** A scripted camera: position and look-at point, tweened. Takes the camera from the orbit controls. */
export class CamRig {
  readonly pos = new Vector3();
  readonly look = new Vector3();
  private sway = 0;
  constructor(g: Game, set: ArkSet, pos: V3, look: V3) {
    g.stage.disposeControls();
    g.stage.mode = '3d';
    this.pos.set(...pos);
    this.look.set(...look);
    set.tick((_dt, t) => {
      const cam = g.stage.camera;
      cam.position.copy(this.pos);
      if (this.sway) cam.position.add(new Vector3(Math.sin(t * 0.21), Math.cos(t * 0.17), Math.sin(t * 0.13)).multiplyScalar(this.sway));
      cam.up.set(0, 0, 1);
      cam.lookAt(this.look);
    });
  }
  /** A slow handheld drift (world units). */
  drift(amount: number): void { this.sway = amount; }
  async to(pos: V3, look: V3, ms: number, e = ease.inOut): Promise<void> {
    const p0 = this.pos.clone(), l0 = this.look.clone();
    const p1 = new Vector3(...pos), l1 = new Vector3(...look);
    await animate(ms, (k) => { this.pos.lerpVectors(p0, p1, k); this.look.lerpVectors(l0, l1, k); }, e);
  }
}

// ------------------------------------------------------------------ beacon pings

let ringTex: CanvasTexture | null = null;
function ringTexture(): CanvasTexture {
  if (ringTex) return ringTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(64, 64, 40, 64, 64, 62);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.55, 'rgba(255,255,255,0.9)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 128, 128);
  ringTex = new CanvasTexture(c);
  return ringTex;
}

/** A small glowing beacon that sends out ring pings. */
export class Ping {
  readonly group = new Group();
  private readonly core: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly halo: Sprite;
  private readonly rings: { s: Sprite; t: number }[] = [];
  level = 1;
  color: string;

  constructor(set: ArkSet, at: V3, o: { color?: string; size?: number; period?: number; phase?: number } = {}) {
    this.color = o.color ?? '#9fd8ff';
    const s = o.size ?? 0.35;
    this.core = new Mesh(new SphereGeometry(s * 0.35, 12, 8), new MeshBasicMaterial({ color: new Color(this.color).multiplyScalar(3) }));
    this.halo = glowSprite(this.color, s * 6, 0.7);
    this.group.add(this.core, this.halo);
    this.group.position.set(...at);
    set.root.add(this.group);
    const period = o.period ?? 2.6;
    let next = o.phase ?? Math.random() * period;
    set.tick((dt) => {
      next -= dt;
      if (next <= 0) { next += period; this.ring(); }
      for (const r of this.rings) {
        r.t += dt / 1.8;
        r.s.scale.setScalar(s * (2 + 26 * r.t));
        r.s.material.opacity = Math.max(0, 0.55 * (1 - r.t) * this.level);
        r.s.visible = r.t < 1;
      }
    });
    this.group.userData.dispose = () => { this.core.geometry.dispose(); this.core.material.dispose(); this.halo.material.dispose(); this.rings.forEach((r) => r.s.material.dispose()); };
  }

  ring(): void {
    let r = this.rings.find((x) => x.t >= 1);
    if (!r) {
      const sp = new Sprite(new SpriteMaterial({ map: ringTexture(), color: new Color(this.color), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
      this.group.add(sp);
      r = { s: sp, t: 1 };
      this.rings.push(r);
    }
    r.t = 0;
  }

  setLevel(k: number): void {
    this.level = k;
    this.halo.material.opacity = 0.04 + 0.8 * k;
    this.core.material.color = new Color(this.color).multiplyScalar(0.2 + 3 * k);
  }

  setColor(c: string): void {
    this.color = c;
    this.halo.material.color = new Color(c);
    this.core.material.color = new Color(c).multiplyScalar(0.2 + 3 * this.level);
    this.rings.forEach((r) => { r.s.material.color = new Color(c); });
  }

  get pos(): V3 { const p = this.group.getWorldPosition(new Vector3()); return [p.x, p.y, p.z]; }
}

// ------------------------------------------------------------------ the dish beam

/** A soft cone of light from the dish toward a point. */
export class DishBeam {
  readonly mesh: Mesh<ConeGeometry, MeshBasicMaterial>;
  from = new Vector3();
  to = new Vector3();
  constructor(set: ArkSet, color = '#59e1ff') {
    const geo = new ConeGeometry(1, 1, 32, 1, true).translate(0, -0.5, 0).rotateX(Math.PI); // apex at the origin, opening along +Y
    this.mesh = new Mesh(geo, new MeshBasicMaterial({ color: new Color(color).multiplyScalar(1.2), transparent: true, opacity: 0.06, blending: AdditiveBlending, depthWrite: false, side: 2 }));
    this.mesh.visible = false;
    set.root.add(this.mesh);
    this.mesh.userData.dispose = () => { geo.dispose(); this.mesh.material.dispose(); };
  }
  aim(from: V3 | Vector3, to: V3 | Vector3, spread = 0.06): void {
    this.from.copy(Array.isArray(from) ? new Vector3(...from) : from);
    this.to.copy(Array.isArray(to) ? new Vector3(...to) : to);
    const d = this.to.clone().sub(this.from);
    const len = d.length();
    this.mesh.visible = len > 1e-3;
    this.mesh.position.copy(this.from);
    this.mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), d.normalize());
    this.mesh.scale.set(len * spread, len, len * spread);
  }
  async sweep(to: V3 | Vector3, ms = 900, spread = 0.06): Promise<void> {
    const a = this.to.clone(), b = Array.isArray(to) ? new Vector3(...to) : to.clone();
    await animate(ms, (k) => this.aim(this.from, a.clone().lerp(b, k), spread), ease.inOut);
  }
  setOpacity(a: number): void { this.mesh.material.opacity = a; }
}

// ------------------------------------------------------------------ a quiet establishing shot for dialogue scenes

/** Shots for dialogue scenes outside the ark: the Lantern in the foreground, the ark beyond, a slow orbit. */
const SHOTS: { center: V3; r: number; el: number; az: number; dps: number }[] = [
  { center: [-30, -30, 3], r: 34, el: 12, az: -120, dps: 1.6 },
  { center: [-24, -26, 6], r: 26, el: 20, az: -160, dps: -1.4 },
  { center: [-12, -18, 2], r: 46, el: 8, az: -95, dps: 1.1 },
  { center: [-34, -40, 4], r: 18, el: 16, az: -200, dps: 2.0 },
];

export async function arkShot(g: Game, variant = 0, o: Partial<ArkOpts> = {}): Promise<ArkSet> {
  g.stage.clearWorld();
  const set = await arkSet(g, {
    at: [0, 0, 0], spine: [1, 0.12, 0], shear: 0.16, debris: 8,
    lantern: { at: [-38, -44, 4], face: [0.62, 0.78, 0.04], scale: 1.4, thrust: 0.18 }, ...o,
  });
  const s = SHOTS[variant % SHOTS.length];
  const c = new Vector3(...s.center);
  let az = s.az;
  const cam = new CamRig(g, set, [0, 0, 0], s.center);
  const place = () => {
    const a = (az * Math.PI) / 180, e = (s.el * Math.PI) / 180;
    cam.pos.set(c.x + s.r * Math.cos(e) * Math.cos(a), c.y + s.r * Math.cos(e) * Math.sin(a), c.z + s.r * Math.sin(e));
  };
  place();
  set.tick((dt) => { az += dt * s.dps; place(); });
  return set;
}
