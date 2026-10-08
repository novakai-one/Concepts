// Chapter 3 staging: the cold open (a spare thruster that adds nothing), the holotable, and the end
// of Act I (the Lantern lifts off the plane; the Meridian comes into view, every frame sheared).
import { Box3, Group, Matrix4, Vector3, type Object3D } from 'three';
import type { Game, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Beacon } from '../../../gfx/markers';
import { loadModel } from '../../../gfx/models';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { music } from '../../../audio/music';
import { fadeBlack, letterbox, titleCard, stamp } from '../../../kit/cine';
import { makeAnchor, makeLantern } from '../../common/set';
import { bridgeShot } from '../../common/shots';
import { answer } from '../../../game/caseboard';
import { ReachGlow } from '../c02-span/reach';
import { own, to3 } from '../c02-span/rig';
import { THRUST3, SIGNAL, SPARE_BAD } from './logic';
import { S } from './script';

const T0 = to3(THRUST3[0]), T1 = to3(THRUST3[1]);

/** Drive the camera each frame from a function of time; returns a stop function. */
function cam(g: Game, f: (t: number) => { pos: V3; look: V3 }): () => void {
  g.stage.disposeControls();
  g.stage.mode = '3d';
  let t = 0;
  const place = () => { const c = f(t); g.stage.camera.position.set(...c.pos); g.stage.camera.up.set(0, 0, 1); g.stage.camera.lookAt(...c.look); };
  place();
  return g.stage.tick((dt) => { t += dt; place(); });
}

/** Tie a stop function to an object in the world, so clearing the world stops it. */
function tie(o: Object3D, stop: () => void): void {
  const prev = o.userData.dispose as (() => void) | undefined;
  o.userData.dispose = () => { stop(); prev?.(); };
}

/** Cold open: fire all three thrusters, spare included, and stay on the plane. */
export async function coldOpen(g: Game): Promise<void> {
  await fadeBlack(g, true, 10);
  g.stage.clearWorld();
  g.mood('explore');
  const glow = new ReachGlow(g.stage, { cell: 0.13 });
  glow.setArrows([T0, T1]);
  glow.fill([[-2.5, 3.5], [-2.5, 3.5]], { spread: 0.1 });
  const signal = new Beacon(g.stage, to3(SIGNAL), { color: '#59e1ff', label: 'signal' });
  const ship = makeLantern(g.stage, 0.24);
  ship.face([1, 1, 2]);
  const spare = own(new Arrow([0, 0, 0], to3(SPARE_BAD), { color: C.u, width: 0.045, label: 'spare' }));
  g.stage.world.add(glow.object, signal.object, ship.object, spare.object);
  const stop = cam(g, (t) => {
    const a = -1.05 + t * 0.025, e = 0.32 - Math.min(0.2, t * 0.012), d = 16;
    return { pos: [1 + d * Math.cos(e) * Math.cos(a), 1.5 + d * Math.cos(e) * Math.sin(a), 2 + d * Math.sin(e)], look: [1, 1.5, 2] };
  });
  tie(glow.mesh, stop);
  await fadeBlack(g, false, 1200);
  await letterbox(g, true, 500);
  void titleCard(g, 'Chapter 3', 'Is one of these thrusters wasted?', 3600);
  await g.say(S.open.slice(0, 3));
  // fire all three: 1 of each; the trail stays on the plane
  await ship.ready;
  let at: V3 = [0, 0, 0];
  for (const leg of [T0, T1, to3(SPARE_BAD)]) {
    const from = at, to: V3 = [at[0] + leg[0], at[1] + leg[1], at[2] + leg[2]];
    ship.face(leg);
    ship.setThrust(1);
    sfx.thrust(0.6);
    await animate(1100, (k) => ship.object.position.set(from[0] + leg[0] * k, from[1] + leg[1] * k, from[2] + leg[2] * k), ease.inOut);
    ship.setThrust(0.2);
    at = to;
  }
  await g.say(S.open.slice(3));
  await letterbox(g, false, 500);
}

/** The holotable on the bridge. */
export async function holotable(g: Game): Promise<void> {
  g.stage.clearWorld();
  await bridgeShot(g);
}

/** Wrap a model so a shear matrix applies to it: root (position) → shear → model. */
function sheared(model: Object3D, k: number): { root: Group; setShear: (k: number) => void } {
  const root = new Group();
  const shear = new Group();
  shear.matrixAutoUpdate = false;
  shear.add(model);
  root.add(shear);
  const setShear = (s: number) => {
    // every vertical frame leans along the hull: x' = x + s·z
    shear.matrix.copy(new Matrix4().set(1, 0, s, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1));
    shear.matrixWorldNeedsUpdate = true;
  };
  setShear(k);
  return { root, setShear };
}

/** End of Act I: the Lantern climbs off the plane and the Meridian comes into view, sheared. */
export async function reveal(g: Game): Promise<void> {
  await fadeBlack(g, true, 600);
  g.stage.clearWorld();
  music.stop(1.2);
  // the old plane below, fading as the ship climbs
  const glow = new ReachGlow(g.stage, { cell: 0.3, size: 0.8 });
  glow.setArrows([T0, T1]);
  glow.fill([[-6, 6], [-6, 6]], { spread: 0.1 });
  const ship = makeLantern(g.stage, 0.5);
  ship.face([0.6, 0.2, 1]);
  ship.setThrust(1);
  g.stage.world.add(glow.object, ship.object);
  const anchor = await makeAnchor(g.stage, 5);
  anchor.position.set(-60, -70, -20);
  // the ark, sheared, far ahead and above
  const m = await loadModel('meridian');
  let ark: ReturnType<typeof sheared> | null = null;
  if (m) {
    m.rotation.x = Math.PI / 2;
    const box = new Box3().setFromObject(m);
    const size = box.getSize(new Vector3()), centre = box.getCenter(new Vector3());
    m.position.sub(centre);
    const s = 70 / Math.max(size.x, size.y, size.z);
    ark = sheared(m, 0.32);
    ark.root.scale.setScalar(s);
    ark.root.position.set(40, 70, 46);
    ark.root.rotation.z = -0.5;
    g.stage.world.add(ark.root);
  }
  let shipZ = 0;
  let k = 0; // 0: behind the climbing ship; 1: looking past it at the ark
  const ARK = new Vector3(40, 70, 46);
  const shipPos = () => new Vector3(shipZ * 0.35, shipZ * 0.15, shipZ);
  const stop = cam(g, () => {
    const sp = shipPos();
    const look = sp.clone().add(new Vector3(0.5, 0.4, 0.6)).lerp(ARK, ease.inOut(k));
    const pos = sp.clone().add(new Vector3(-5.5, -7.5, 1.2).lerp(new Vector3(-7, -10, 2.4), ease.inOut(k)));
    return { pos: [pos.x, pos.y, pos.z], look: [look.x, look.y, look.z] };
  });
  tie(glow.mesh, stop);
  glow.setGain(0.2);
  const climb = g.stage.tick((dt) => { shipZ += dt * 1.6; ship.object.position.copy(shipPos()); glow.setGain(Math.max(0, 0.2 - shipZ * 0.02)); });
  tie(ship.object, climb);
  await fadeBlack(g, false, 1400);
  await letterbox(g, true, 600);
  sfx.whoosh(2);
  await wait(2600);
  g.mood('void');
  void stamp(g, 'Off the plane · approach to the colony ark *Meridian*', 4200);
  // swing the view past the ship to the ark (awaited, so the lines start on the ark)
  await animate(5500, (x) => { k = x; }, ease.linear);
  sfx.discover();
  await g.say(S.reveal, {
    onLine: (_l, i) => {
      if (i === 3) {
        answer('reach-signal', 'A third thruster mounted off the plane adds a new direction. Three thrusters that point in three independent directions reach every point, so the *Lantern* lifted off the plane to the ark.', 'c03');
        g.toast('Answered: how do we get to the signal?', 'Case board');
      }
    },
  });
  await wait(800);
  await letterbox(g, false, 600);
}
