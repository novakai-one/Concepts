// Act II staging for Chapters 6 and 7: the Meridian's hull in the star's low light, the Lantern
// holding station, drifting debris and a scripted camera. Everything hangs off one root group in the
// world, so a beat change (clearWorld) removes it and stops its per-frame work.
import { DirectionalLight, Group, Matrix4, PointLight, Quaternion, Vector3, type Object3D } from 'three';
import type { Game, V3 } from '../../../game/types';
import { loadModel, type Ship } from '../../../gfx/models';
import { glowSprite } from '../../../gfx/markers';
import { animate, ease } from '../../../core/tween';
import { makeLantern } from '../../common/set';
import { rng } from '../../../game/lawcheck';

export const STAR_DIR: V3 = [-0.55, -0.75, 0.22];
const STAR_COLOR = '#ffd2a1';

export interface HullOpts {
  at?: V3;
  /** Which way the ark's spine points. */
  spine?: V3;
  /** Lean of the box frames along the spine (what the pulses did). */
  shear?: number;
  debris?: number;
  lantern?: { at: V3; face: V3; scale?: number; thrust?: number } | null;
  starLight?: number;
}

export interface HullSet {
  root: Group;
  /** Positioned and oriented; children inside `frame` lean with the hull. */
  ark: Group;
  frame: Group;
  model: Object3D | null;
  lantern: Ship | null;
  alive(): boolean;
  tick(fn: (dt: number, t: number) => void): void;
}

export function alongX(d: V3): Quaternion {
  return new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), new Vector3(...d).normalize());
}

export async function hullSet(g: Game, o: HullOpts = {}): Promise<HullSet> {
  const root = new Group();
  root.name = 'act2-hull';
  g.stage.world.add(root);
  const offs: (() => void)[] = [];
  root.userData.dispose = () => { offs.splice(0).forEach((f) => f()); };
  const alive = () => !!root.parent;
  // a set already cleared (the player moved on while a model loaded) takes no new per-frame work
  const tick = (fn: (dt: number, t: number) => void) => { if (alive()) offs.push(g.stage.tick(fn)); };

  const sd = new Vector3(...STAR_DIR).normalize();
  const star = new DirectionalLight(STAR_COLOR, o.starLight ?? 2.4);
  star.position.copy(sd.clone().multiplyScalar(100));
  root.add(star, star.target);
  const glow = glowSprite(STAR_COLOR, 160, 0.85);
  glow.position.copy(sd.clone().multiplyScalar(900));
  const core = glowSprite('#fff4e0', 40, 1);
  core.position.copy(glow.position);
  root.add(glow, core);

  const ark = new Group();
  ark.position.set(...(o.at ?? [0, 0, 0]));
  ark.quaternion.copy(alongX(o.spine ?? [1, 0, 0]));
  root.add(ark);
  const frame = new Group();
  frame.matrixAutoUpdate = false;
  frame.matrix.copy(new Matrix4().set(1, 0, o.shear ?? 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1));
  ark.add(frame);
  const model = await loadModel('meridian');
  if (model) {
    model.rotation.x = Math.PI / 2;
    frame.add(model);
    const rings = ['ring_1', 'ring_2', 'ring_3'].map((n) => model.getObjectByName(n)).filter(Boolean) as Object3D[];
    tick((dt) => rings.forEach((r, i) => { r.rotation.x += dt * (0.1 + 0.02 * i); }));
    const lamp = new PointLight('#ffcf9a', 30, 40);
    lamp.position.set(20, 0, 0);
    ark.add(lamp);
  }

  const r = rng(67);
  for (let i = 0; i < (o.debris ?? 0); i++) {
    const m = await loadModel(`debris_${i % 6}`);
    if (!m || !alive()) break;
    m.position.set((r() - 0.5) * 80, (r() - 0.3) * 60, (r() - 0.5) * 30);
    m.scale.setScalar(0.5 + r() * 1.5);
    m.rotation.set(r() * 6, r() * 6, r() * 6);
    const spin = new Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.4);
    root.add(m);
    tick((dt) => { m.rotation.x += spin.x * dt; m.rotation.y += spin.y * dt; m.rotation.z += spin.z * dt; });
  }

  let lantern: Ship | null = null;
  if (o.lantern) {
    lantern = makeLantern(g.stage, o.lantern.scale ?? 1.2);
    lantern.object.position.set(...o.lantern.at);
    lantern.face(o.lantern.face);
    root.add(lantern.object);
    lantern.setThrust(o.lantern.thrust ?? 0.15);
    const base = lantern.object.position.z;
    const ls = lantern;
    tick((_dt, t) => { ls.object.position.z = base + 0.06 * Math.sin(t * 0.7); });
  }
  return { root, ark, frame, model, lantern, alive, tick };
}

/** A scripted camera (position and look-at point, tweened). Takes the camera from the orbit controls. */
export class CamRig {
  readonly pos = new Vector3();
  readonly look = new Vector3();
  private sway = 0;
  constructor(g: Game, set: HullSet, pos: V3, look: V3) {
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
  drift(amount: number): void { this.sway = amount; }
  async to(pos: V3, look: V3, ms: number, e = ease.inOut): Promise<void> {
    const p0 = this.pos.clone(), l0 = this.look.clone();
    const p1 = new Vector3(...pos), l1 = new Vector3(...look);
    await animate(ms, (k) => { this.pos.lerpVectors(p0, p1, k); this.look.lerpVectors(l0, l1, k); }, e);
  }
}

/** Shots for dialogue scenes: the Lantern in the foreground, the ark's hull beyond, a slow orbit. */
const SHOTS: { center: V3; r: number; el: number; az: number; dps: number }[] = [
  { center: [-8, -16, 2], r: 30, el: 14, az: -120, dps: 1.4 },
  { center: [-14, -10, 4], r: 22, el: 22, az: -160, dps: -1.2 },
  { center: [6, -12, 1], r: 40, el: 8, az: -95, dps: 1.0 },
  { center: [18, -8, 2], r: 16, el: 12, az: -70, dps: 1.6 },
];

export async function hullShot(g: Game, variant = 0, o: Partial<HullOpts> = {}): Promise<HullSet> {
  g.stage.clearWorld();
  const set = await hullSet(g, {
    spine: [1, 0, 0], shear: 0.12, debris: 8,
    lantern: { at: [-6, -22, 3], face: [0.2, 1, 0.02], scale: 1.1, thrust: 0.15 }, ...o,
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

/** Thrown when the player leaves a beat mid-cinematic: stop quietly. */
export class Gone extends Error {}
export const check = (set: HullSet): void => { if (!set.alive()) throw new Gone(); };

/** Poll a condition in real time (not frames): solvers must not depend on the frame rate. */
export async function until(f: () => boolean, ms = 90000): Promise<void> {
  const t0 = performance.now();
  while (!f() && performance.now() - t0 < ms) await new Promise((r) => setTimeout(r, 30));
}

/**
 * A camera target that puts `target` beside the Law/Doubt panel instead of behind it: in the free right
 * column on a wide screen (the panel sits in the centre), or in the top half on a narrow one (the panel
 * moves to the bottom). The stage's FOV is 32° vertical.
 */
export function besidePanel(g: Game, target: readonly number[], distance: number, azimuth: number): V3 {
  const w = g.stage.size.x, h = Math.max(1, g.stage.size.y);
  const hh = distance * Math.tan((16 * Math.PI) / 180), hw = hh * (w / h);
  if (w > 1180) {
    const az = (azimuth * Math.PI) / 180, k = 0.64 * hw;
    return [target[0] + k * Math.sin(az), target[1] - k * Math.cos(az), target[2]];
  }
  return [target[0], target[1], target[2] - 0.4 * hh];
}
