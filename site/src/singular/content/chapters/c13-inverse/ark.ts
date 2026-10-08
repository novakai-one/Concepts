// Act IV staging shared by Chapters 13 and 14: the Meridian under the violet light of the Fold, its
// sections as named in the model (bow, truss_fore, hub and rings, truss_aft, aft), a scripted camera,
// and a deform group that moves one section by an exact matrix about its own centre. Everything hangs
// off one root group in the world, so clearing the world removes it and stops its per-frame work.
import { Group, Matrix4, Object3D, PointLight, DirectionalLight, Vector3 } from 'three';
import type { Game, V3 } from '../../../game/types';
import { loadModel, type Ship } from '../../../gfx/models';
import { glowSprite } from '../../../gfx/markers';
import { animate, ease } from '../../../core/tween';
import { makeLantern } from '../../common/set';
import { embed } from './honest';
import type { Mat } from '../../../math/la';

export interface ArkSet {
  root: Group;
  model: Object3D | null;
  lantern: Ship | null;
  alive(): boolean;
  tick(fn: (dt: number, t: number) => void): void;
}

/** The Meridian at the origin, spine along +x (bow at +x), with the Fold's light. */
export async function meridianSet(g: Game, o: { lantern?: { at: V3; face: V3; scale?: number } } = {}): Promise<ArkSet> {
  const root = new Group();
  root.name = 'act4-set';
  g.stage.world.add(root);
  const offs: (() => void)[] = [];
  root.userData.dispose = () => { offs.splice(0).forEach((f) => f()); };
  // nothing starts once the set has been cleared (a beat that ended while a model was loading)
  const tick = (fn: (dt: number, t: number) => void) => { if (root.parent) offs.push(g.stage.tick(fn)); };
  const alive = () => !!root.parent;
  // a violet key light from the Fold, a warm fill from the hangar
  const key = new DirectionalLight('#d9c8ff', 1.6);
  key.position.set(-40, -60, 50);
  root.add(key, key.target);
  const glow = glowSprite('#b9a8ff', 260, 0.5);
  glow.position.set(-400, -600, 300);
  root.add(glow);
  const model = await loadModel('meridian');
  if (model) {
    model.rotation.x = Math.PI / 2;
    root.add(model);
    const rings = ['ring_1', 'ring_2', 'ring_3'].map((n) => model.getObjectByName(n)).filter(Boolean) as Object3D[];
    tick((dt) => rings.forEach((r, i) => { r.rotation.x += dt * (0.1 + 0.02 * i); }));
    const lamp = new PointLight('#ffcf9a', 30, 40);
    lamp.position.set(20, 0, 0);
    root.add(lamp);
  }
  let lantern: Ship | null = null;
  if (o.lantern) {
    lantern = makeLantern(g.stage, o.lantern.scale ?? 1.4);
    lantern.object.position.set(...o.lantern.at);
    lantern.face(o.lantern.face);
    lantern.setThrust(0.12);
    root.add(lantern.object);
    const base = o.lantern.at[2];
    const ls = lantern;
    tick((_dt, t) => { ls.object.position.z = base + 0.08 * Math.sin(t * 0.7); });
  }
  return { root, model, lantern, alive, tick };
}

/**
 * Take the named parts of the model into a group that moves them by M about `centre` (world
 * coordinates). The parts keep their place in the world until the matrix changes.
 */
export class Deform {
  readonly group = new Group();
  readonly centre: Vector3;
  constructor(set: ArkSet, names: string[], centre: V3) {
    this.centre = new Vector3(...centre);
    this.group.matrixAutoUpdate = false;
    set.root.add(this.group);
    set.root.updateMatrixWorld(true);
    for (const n of names) {
      const part = set.model?.getObjectByName(n);
      if (part) this.group.attach(part);
    }
    this.set([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  }
  /** Move the parts by M (3×3, or 2×2 on the floor) about the centre. */
  set(M: Mat): void {
    const m = embed(M);
    const c = this.centre;
    const L = new Matrix4().set(m[0][0], m[0][1], m[0][2], 0, m[1][0], m[1][1], m[1][2], 0, m[2][0], m[2][1], m[2][2], 0, 0, 0, 0, 1);
    this.group.matrix.copy(new Matrix4().makeTranslation(c.x, c.y, c.z).multiply(L).multiply(new Matrix4().makeTranslation(-c.x, -c.y, -c.z)));
    this.group.matrixWorldNeedsUpdate = true;
  }
}

/** A scripted camera: position and look-at point, tweened, with an optional slow drift. */
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
  drift(amount: number): void { this.sway = amount; }
  async to(pos: V3, look: V3, ms: number, e = ease.inOut): Promise<void> {
    const p0 = this.pos.clone(), l0 = this.look.clone();
    const p1 = new Vector3(...pos), l1 = new Vector3(...look);
    await animate(ms, (k) => { this.pos.lerpVectors(p0, p1, k); this.look.lerpVectors(l0, l1, k); }, e);
  }
}

/** Thrown when the player leaves a beat mid-cinematic: stop quietly. */
export class Gone extends Error {}
export const check = (set: ArkSet): void => { if (!set.alive()) throw new Gone(); };
