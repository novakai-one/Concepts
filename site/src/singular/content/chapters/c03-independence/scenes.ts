// Chapter 3 staging: the opening (v and w reach a plane; u lies in it), the picture behind the name card (the
// closed triangle v + 2w − u = 0), and the end of Act I (the Lantern lifts off the plane; the Meridian, sheared).
import { Box3, Group, Matrix4, Vector3, type Object3D } from 'three';
import type { Game, V3 } from '../../../game/types';
import { PlanePatch } from '../../../gfx/shapes';
import { loadModel } from '../../../gfx/models';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { music } from '../../../audio/music';
import { fadeBlack, letterbox, titleCard, stamp } from '../../../kit/cine';
import { makeAnchor, makeLantern } from '../../common/set';
import { answer } from '../../../game/caseboard';
import { Space, mul3, to3, worldHost } from './space';
import { TITLE, U, V, W } from './text';
import { VIEW } from './tryit';
import { S } from './script';

const V3v = to3(V), W3 = to3(W), U3 = to3(U);
const O: V3 = [0, 0, 0];

/** The opening, under 10 s, no words: v and w, the plane they reach, then u lands in that same plane. */
export async function coldOpen(g: Game): Promise<void> {
  await fadeBlack(g, true, 10);
  g.stage.clearWorld();
  g.mood('explore');
  const host = worldHost(g);
  const sp = new Space(host);
  await sp.enter([V3v, W3, U3], { rect: 'full', ...VIEW, sway: false, zoom: 0.75 });
  void fadeBlack(g, false, 900);
  void titleCard(g, 'Chapter 3', TITLE, 1800);
  await wait(2300);
  if (!host.alive()) return;
  await sp.arrow('v', 'g').label('$\\mathbf v$').grow(V3v, { from: O, ms: 700 });
  await sp.arrow('w', 'b').label('$\\mathbf w$').grow(W3, { from: O, ms: 700 });
  if (!host.alive()) return;
  // the plane they reach: every a v + b w
  const plane = sp.plane(V3v, W3, { n: 2, opacity: 0.26 });
  await animate(900, (k) => plane.setOpacity(k), ease.out);
  await wait(250);
  if (!host.alive()) return;
  await sp.arrow('u', 'w').label('$\\mathbf u$').grow(U3, { from: O, ms: 900 });
  sfx.snap();
  // turn so the plane tilts away: u stays flat in it
  await sp.turn(-60, 30, 2600);
  sp.sway(true);
  await wait(600);
}

/** Behind the name card: v, then 2w from its tip, then −u back to the origin. */
export async function triangleVisual(g: Game): Promise<void> {
  g.stage.clearWorld();
  // on a phone the card fills the screen: an arrow tip peeking above it reads as a glitch, so draw nothing
  if (g.stage.size.x < 760) return;
  const host = worldHost(g);
  const sp = new Space(host);
  await sp.enter([V3v, W3, U3], { rect: 'card', ...VIEW });
  void (async () => {
    await wait(300);
    if (!host.alive()) return;
    await sp.arrow('v', 'g').label('$\\mathbf v$').grow(V3v, { from: O, ms: 600 });
    if (!host.alive()) return;
    await sp.arrow('2w', 'b').label('$2\\mathbf w$').grow(mul3(2, W3), { from: V3v, ms: 700 });
    if (!host.alive()) return;
    await sp.arrow('-u', 'w').label('$-\\mathbf u$').grow(mul3(-1, U3), { from: U3, ms: 800 });
    sfx.snap();
  })();
}

// ------------------------------------------------------------------ the end of Act I (story; every line can be skipped)

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
  const plane = new PlanePatch(g.stage, O, [-1, -1, 1], { color: '#7d8aa5', size: 14, opacity: 0.1 });
  plane.setSpan(O, V3v, W3);
  plane.object.userData.dispose = () => plane.dispose();
  const ship = makeLantern(g.stage, 0.5);
  ship.face([0.6, 0.2, 1]);
  ship.setThrust(1);
  g.stage.world.add(plane.object, ship.object);
  const anchor = await makeAnchor(g.stage, 5);
  anchor.position.set(-60, -70, -20);
  // the ark, sheared, far ahead and above
  const m = await loadModel('meridian');
  if (m) {
    m.rotation.x = Math.PI / 2;
    const box = new Box3().setFromObject(m);
    const size = box.getSize(new Vector3()), centre = box.getCenter(new Vector3());
    m.position.sub(centre);
    const s = 70 / Math.max(size.x, size.y, size.z);
    const ark = sheared(m, 0.32);
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
  tie(ship.object, stop);
  const climb = g.stage.tick((dt) => { shipZ += dt * 1.6; ship.object.position.copy(shipPos()); plane.setOpacity(Math.max(0, 1 - shipZ * 0.1)); });
  tie(plane.object, climb);
  await fadeBlack(g, false, 1200);
  await letterbox(g, true, 500);
  sfx.whoosh(2);
  await wait(1000);
  g.mood('void');
  void stamp(g, 'Off the plane · approach to the colony ark *Meridian*', 3600);
  // swing the view past the ship to the ark (awaited, so the lines start on the ark)
  await animate(3500, (x) => { k = x; }, ease.linear);
  sfx.discover();
  await g.say(S.reveal, {
    onLine: (_l, i) => {
      if (i === 3) answer('reach-signal', 'A third vector off the plane adds a new direction. Three independent vectors reach every point, so the *Lantern* lifted off the plane to the ark.', 'c03');
    },
  });
  await wait(600);
  await letterbox(g, false, 600);
}
