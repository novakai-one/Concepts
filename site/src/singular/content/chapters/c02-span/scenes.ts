// Chapter 2 staging: the cold open (two thrusters on a flat deck, a signal pinging ahead), the
// holotable, and the story-out (the signal below the plane the thrusters reach).
import { Vector3 } from 'three';
import type { Game, V3 } from '../../../game/types';
import { BuoyField } from '../../../gfx/buoys';
import { Arrow } from '../../../gfx/arrow';
import { Beacon } from '../../../gfx/markers';
import { shockwave } from '../../../gfx/fx';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, titleCard } from '../../../kit/cine';
import { makeLantern } from '../../common/set';
import { bridgeShot } from '../../common/shots';
import { pin } from '../../../game/caseboard';
import { ReachGlow } from './reach';
import { to3, own } from './rig';
import { V, W, THRUST3, SIGNAL } from './logic';
import { S } from './script';

const V3_ = to3(V), W3_ = to3(W);

/** Cold open: the Lantern on the flat deck, two thrust arrows, a few burns lighting the glow, a signal pinging ahead. */
export async function coldOpen(g: Game): Promise<void> {
  await fadeBlack(g, true, 10);
  g.stage.clearWorld();
  g.mood('explore');
  await g.stage.view2D({ center: [1.8, 1.6], height: 11, ms: 0 });
  const buoys = new BuoyField(g.stage, { extent: 10 });
  const glow = new ReachGlow(g.stage, { cell: 0.1 });
  glow.setArrows([V3_, W3_]);
  const ship = makeLantern(g.stage, 0.2);
  ship.object.position.set(0, 0, 0.15);
  ship.face(V3_);
  const av = own(new Arrow([0, 0, 0], V3_, { color: C.v, width: 0.04, opacity: 0.8, label: 'thruster two' }));
  const aw = own(new Arrow([0, 0, 0], W3_, { color: C.w, width: 0.04, opacity: 0.8, label: 'thruster three' }));
  g.stage.world.add(buoys.object, glow.object, av.object, aw.object, ship.object);
  await fadeBlack(g, false, 1400);
  await letterbox(g, true, 500);
  void titleCard(g, 'Chapter 2', 'What can two thrusters reach?', 3600);
  let alive = true;
  void (async () => {
    await wait(1500);
    while (alive && ship.object.parent) { sfx.tick(6); void shockwave(g.stage, [7.5, 5.2, 0], '#59e1ff', 2.4, 1700); await wait(2700); }
  })();
  const flying = (async () => {
    await ship.ready;
    await wait(2200);
    let c = [0, 0];
    for (const n of [[1, 0], [1, 1], [0, 1.4], [-0.8, 1.4], [-0.8, 0.4], [0.6, 0.4], [0.6, -0.5], [0, 0]]) {
      if (!alive || !ship.object.parent) return;
      const c0 = c.slice();
      const p0: V3 = [c0[0] * V[0] + c0[1] * W[0], c0[0] * V[1] + c0[1] * W[1], 0.15];
      const p1: V3 = [n[0] * V[0] + n[1] * W[0], n[0] * V[1] + n[1] * W[1], 0.15];
      ship.face([p1[0] - p0[0], p1[1] - p0[1], 0]);
      ship.setThrust(1);
      let last = 0;
      await animate(1500, (k) => {
        ship.object.position.set(p0[0] + (p1[0] - p0[0]) * k, p0[1] + (p1[1] - p0[1]) * k, 0.15);
        glow.trail([c0[0] + (n[0] - c0[0]) * last, c0[1] + (n[1] - c0[1]) * last], [c0[0] + (n[0] - c0[0]) * k, c0[1] + (n[1] - c0[1]) * k]);
        last = k;
      }, ease.inOut);
      ship.setThrust(0.15);
      c = n.slice();
      await wait(250);
    }
  })();
  await g.say(S.open);
  alive = false;
  await Promise.race([flying, wait(800)]);
  await letterbox(g, false, 500);
}

/** The holotable on the bridge. */
export async function holotable(g: Game): Promise<void> {
  g.stage.clearWorld();
  await bridgeShot(g);
}

/** Story-out: the plane the thrusters reach, the signal below it; the camera turns edge-on. */
export async function closeSet(g: Game): Promise<void> {
  g.stage.clearWorld();
  g.mood('explore');
  const glow = new ReachGlow(g.stage, { cell: 0.12 });
  glow.setArrows(THRUST3.map(to3));
  glow.fill([[-3, 3], [-3, 3]], { spread: 2.2 });
  const signal = new Beacon(g.stage, to3(SIGNAL), { color: '#59e1ff', label: 'Meridian signal' });
  const ship = makeLantern(g.stage, 0.22);
  ship.face([1, 1, 2]);
  ship.setThrust(0.15);
  g.stage.world.add(glow.object, signal.object, ship.object);
  g.stage.disposeControls();
  g.stage.mode = '3d';
  const T = new Vector3(0.6, 0.6, 0.8);
  const d0 = new Vector3(Math.cos(-0.9) * 0.88, Math.sin(-0.9) * 0.88, 0.47).normalize();
  const e = (12 * Math.PI) / 180;
  const d1 = new Vector3(1, -1, 0).normalize().multiplyScalar(Math.cos(e)).add(new Vector3(1, 1, 2).normalize().multiplyScalar(Math.sin(e))).normalize();
  let t = 0;
  const off = g.stage.tick((dt) => {
    t += dt;
    const k = ease.inOut(Math.min(1, t / 11));
    const dir = d0.clone().lerp(d1, k).normalize();
    g.stage.camera.position.copy(T.clone().add(dir.multiplyScalar(17)));
    g.stage.camera.up.set(0, 0, 1);
    g.stage.camera.lookAt(T);
  });
  glow.mesh.userData.dispose = (() => { const d = glow.mesh.userData.dispose as () => void; return () => { off(); d(); }; })();
}

/** Story-out as a cinematic: the edge-on turn, Wren's line, and the Act I question pinned. */
export async function closeOut(g: Game): Promise<void> {
  await closeSet(g);
  await letterbox(g, true, 600);
  await g.say(S.close, {
    onLine: (_l, i) => {
      if (i === 3 && pin('reach-signal', 'The *Meridian*’s signal is off the plane our two thrusters reach. How do we get to it?', 'c02')) {
        sfx.discover();
        g.toast('The signal is off the plane our thrusters reach. How do we get to it?', 'Case board');
      }
    },
  });
  await wait(600);
  await letterbox(g, false, 500);
}
