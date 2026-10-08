// Act VIII staging (Chapters 21–23): the Meridian with its stern folded flat by the real Collapse pulse C
// (applied to the stern's own vertices), a low star casting long light, the Anchor far off, the Lantern
// beside the stern, the stern hatch, and the drones. Plus small helpers for scene cameras.
import {
  Box3, DirectionalLight, DoubleSide, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3, type Object3D,
} from 'three';
import type { Game, V3 } from '../../../game/types';
import { loadModel, type Ship } from '../../../gfx/models';
import { glowSprite } from '../../../gfx/markers';
import { makeAnchor, makeLantern } from '../../common/set';
import { bridgeShot } from '../../common/shots';
import { C as COLLAPSE } from '../../truth';
import './c21.css';

/** Thrown when the player leaves a cinematic part-way: stop quietly. */
export class Gone extends Error {}

export interface Set8 {
  root: Group;
  ark: Group | null;
  lantern: Ship | null;
  anchor: Group | null;
  /** The stern hatch (world position), when the ark is in the set. */
  hatch: Vector3;
  hatchLight: Object3D | null;
  drones: Object3D[];
  alive(): boolean;
  check(): void;
  tick(fn: (dt: number, t: number) => void): void;
}

/** The star sits low on the horizon in Act VIII, so light comes in long and flat. */
export const STAR: V3 = [-0.85, -0.45, 0.08];

function about(M: number[][], c: V3): Matrix4 {
  const m = new Matrix4().set(M[0][0], M[0][1], M[0][2], 0, M[1][0], M[1][1], M[1][2], 0, M[2][0], M[2][1], M[2][2], 0, 0, 0, 0, 1);
  return new Matrix4().makeTranslation(c[0], c[1], c[2]).multiply(m).multiply(new Matrix4().makeTranslation(-c[0], -c[1], -c[2]));
}

export interface Set8Opts {
  ark?: { at: V3; scale?: number } | null;
  anchor?: { at: V3; scale?: number } | null;
  lantern?: { at: V3; face: V3; scale?: number } | null;
  /** Draw the hatch light on the stern sheet. */
  hatch?: boolean;
  /** Small drone lights scattered around the stern. */
  drones?: number;
}

/** The Act VIII exterior. Clears the world first, so a scene, card or name beat never stacks two sets. */
export async function set8(g: Game, o: Set8Opts = {}): Promise<Set8> {
  g.stage.clearWorld();
  const root = new Group();
  root.name = 'act8-set';
  g.stage.world.add(root);
  const offs: (() => void)[] = [];
  root.userData.dispose = () => { offs.splice(0).forEach((f) => f()); };
  const alive = () => !!root.parent;
  const set: Set8 = {
    root, ark: null, lantern: null, anchor: null, hatch: new Vector3(-21, -9, 0), hatchLight: null, drones: [], alive,
    check: () => { if (!alive()) throw new Gone(); },
    // a tick asked for after the set was cleared (the beat ended during loading) would never be removed
    tick: (fn) => { if (alive()) offs.push(g.stage.tick(fn)); },
  };
  const sd = new Vector3(...STAR).normalize();
  const star = new DirectionalLight('#ffd6a8', 2.8);
  star.position.copy(sd.clone().multiplyScalar(120));
  root.add(star, star.target);
  const glow = glowSprite('#ffcf9c', 170, 0.85);
  glow.position.copy(sd.clone().multiplyScalar(900));
  root.add(glow);
  if (o.ark !== null) {
    const a = o.ark ?? { at: [0, 0, 0] };
    const ark = new Group();
    ark.position.set(...a.at);
    root.add(ark);
    const model = await loadModel('meridian');
    // the beat ended while the model loaded: the set is already cleared, add nothing more
    if (!alive()) return set;
    let stern: Object3D | null = null;
    if (model) {
      model.rotation.x = Math.PI / 2;
      model.scale.setScalar(a.scale ?? 1);
      const M = about(COLLAPSE, [-21, 0, 0]);
      const sheet = new MeshStandardMaterial({ color: '#5d6472', metalness: 0.7, roughness: 0.36, side: DoubleSide, emissive: '#1a1d24', emissiveIntensity: 0.55 });
      model.traverse((n) => {
        if (n.name === 'aft') stern = n;
        if (n.name !== 'aft' && n.name !== 'truss_aft') return;
        n.updateMatrix();
        n.matrixAutoUpdate = false;
        n.matrix.premultiply(M);
        n.matrixWorldNeedsUpdate = true;
        n.traverse((m) => { if ((m as Mesh).isMesh) (m as Mesh).material = sheet; });
      });
      ark.userData.dispose = () => sheet.dispose();
      ark.add(model);
    }
    set.ark = ark;
    // the hatch: on the stern sheet, on the side that faces the star and the Lantern
    ark.updateMatrixWorld(true);
    if (stern) {
      const box = new Box3().setFromObject(stern);
      if (!box.isEmpty()) {
        const c = box.getCenter(new Vector3());
        set.hatch.set(c.x - 0.15 * (box.max.x - box.min.x), box.min.y + 0.22 * (box.max.y - box.min.y), c.z);
      }
    }
    if (o.hatch) {
      const h = new Group();
      const core = glowSprite('#bfe9ff', 2.2, 1);
      const halo = glowSprite('#59e1ff', 7, 0.55);
      h.add(core, halo);
      h.position.copy(set.hatch);
      root.add(h);
      set.hatchLight = h;
      let t = 0;
      set.tick((dt) => { t += dt; halo.material.opacity = 0.4 + 0.2 * Math.sin(t * 2.4); });
    }
    const n = o.drones ?? 0;
    for (let i = 0; i < n; i++) {
      const s = glowSprite(i % 5 === 0 ? '#ffd166' : '#cfe3ff', 0.9, 0.85);
      const ph = i * 2.399, rr = 9 + (i % 7) * 2.2;
      const base = set.hatch.clone().add(new Vector3(Math.cos(ph) * rr, Math.sin(ph) * rr * 0.6 - 6, Math.sin(ph * 1.7) * 6));
      s.position.copy(base);
      root.add(s);
      set.drones.push(s);
      set.tick((_dt, tt) => { s.position.set(base.x + Math.sin(tt * 0.3 + ph) * 0.8, base.y + Math.cos(tt * 0.25 + ph) * 0.8, base.z + Math.sin(tt * 0.4 + ph) * 0.5); });
    }
  }
  if (o.anchor !== null) {
    const an = o.anchor ?? { at: [-170, 120, -20] };
    const anchor = await makeAnchor(g.stage, an.scale ?? 7, root);
    if (!alive()) return set;
    anchor.position.set(...an.at);
    set.anchor = anchor;
  }
  if (o.lantern) {
    const ship = makeLantern(g.stage, o.lantern.scale ?? 1.4);
    root.add(ship.object);
    ship.object.position.set(...o.lantern.at);
    ship.face(o.lantern.face);
    ship.setThrust(0.15);
    set.lantern = ship;
  }
  return set;
}

/** Move the camera (z up) to look at a point from a place. */
export async function camTo(g: Game, set: { alive(): boolean }, pos: V3, look: V3, ms: number): Promise<void> {
  g.stage.disposeControls();
  g.stage.mode = '3d';
  if (!set.alive()) return;
  await g.stage.moveCamera(new Vector3(...pos), new Vector3(...look), new Vector3(0, 0, 1), ms);
}

/** A slow camera drift around a point (for dialogue scenes). */
export function drift(g: Game, set: Set8, o: { look: V3; r: number; h: number; a0: number; speed?: number }): void {
  let t = 0;
  set.tick((dt) => {
    t += dt;
    const a = o.a0 + t * (o.speed ?? 0.018);
    g.stage.camera.position.set(o.look[0] + o.r * Math.cos(a), o.look[1] + o.r * Math.sin(a), o.look[2] + o.h + Math.sin(t * 0.1) * 0.8);
    g.stage.camera.up.set(0, 0, 1);
    g.stage.camera.lookAt(...o.look);
  });
  g.stage.disposeControls();
  g.stage.mode = '3d';
}

/** Scene staging: the Lantern holding beside the stern hatch, camera drifting. */
export async function hatchShot(g: Game): Promise<void> {
  const set = await set8(g, { lantern: { at: [-30, -27, 2], face: [0.4, 1, 0.05], scale: 1.4 }, hatch: true });
  if (!set.alive()) return;
  const h = set.hatch;
  drift(g, set, { look: [(h.x - 30) / 2, (h.y - 27) / 2, 0], r: 62, h: 14, a0: -2.2 });
}

/** Scene staging: the stern sheet from further out, drones logging around it. */
export async function dronesShot(g: Game): Promise<void> {
  const set = await set8(g, { lantern: { at: [-34, -30, 3], face: [0.5, 1, 0], scale: 1.4 }, hatch: true, drones: 24 });
  if (!set.alive()) return;
  drift(g, set, { look: [-20, -6, 0], r: 62, h: 14, a0: -2.0, speed: 0.012 });
}

/** Scene staging: the bridge holotable (the common bridgeShot) on a cleared world, so the Act VIII set of an
 *  earlier scene, card or name beat does not keep running under it. */
export async function holotableShot(g: Game): Promise<void> {
  g.stage.clearWorld();
  await bridgeShot(g);
}
