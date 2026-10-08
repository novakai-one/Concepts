// Chapter 14 staging: the cold open (a routine pulse squeezes the whole ark, played honestly as
// P · (R(θ) with heights × (1 − 0.2t)) · P⁻¹; Teo on the stern channel), the spire-volume clue (two unit
// cubes, both ending at volume 0.8), the debris strike on the Anchor, and the Collapse itself: the real
// pulse C on the real stern, (1 − t)I + tC, which only becomes a sheet at the very end.
import { CircleGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial } from 'three';
import type { Game, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Label } from '../../../gfx/label';
import { Parallelepiped, Lattice3D } from '../../../gfx/shapes';
import { glowSprite } from '../../../gfx/markers';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { music } from '../../../audio/music';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { pin } from '../../../game/caseboard';
import { makeAnchor } from '../../common/set';
import { P, Pinv, S_now, T3 } from '../../truth';
import { det, identity, matMul, mlerp, type Mat } from '../../../math/la';
import { CamRig, Deform, Gone, check, meridianSet } from '../c13-inverse/ark';
import { PULSE, SPIRES, fmtN } from './logic';
import { S } from './script';

/** The spire numbers partway (t from 0 to 1): a quarter turn of the floor, heights × (1 − 0.2t). Determinant 1 − 0.2t, never 0. */
export const Spartial = (t: number): Mat => {
  const th = (t * Math.PI) / 2;
  return [[Math.cos(th), -Math.sin(th), 0], [Math.sin(th), Math.cos(th), 0], [0, 0, 1 + (S_now[2][2] - 1) * t]];
};
/** The measured routine pulse partway: P · Spartial(t) · P⁻¹ (similar, so the same volume factor at every frame). */
export const T3partial = (t: number): Mat => matMul(matMul(P, Spartial(t)), Pinv);

const ARK_PARTS = ['bow', 'truss_fore', 'hub', 'ring_1', 'ring_2', 'ring_3', 'truss_aft', 'aft'];
const STERN_PARTS = ['truss_aft', 'aft'];
const STERN_CENTRE: V3 = [-19, 0, 0];

// ------------------------------------------------------------------ cold open

export async function coldOpen(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('tension');
    const set = await meridianSet(g);
    check(set);
    const whole = new Deform(set, ARK_PARTS, [0, 0, 0]);
    const cam = new CamRig(g, set, [40, -92, 34], [0, 0, 0]);
    cam.drift(0.6);
    void fadeBlack(g, false, 1600);
    await letterbox(g, true, 600);
    check(set);
    void stamp(g, 'Colony ark *Meridian* · routine pulse', 4000);
    void cam.to([20, -84, 26], [-4, 0, 0], 26000, ease.linear);
    await g.say(S.open, {
      onLine: (_l, i) => {
        if (!set.alive()) return;
        if (i === 1) {
          void g.stage.shockwave([0, 0, 0], 2200, 0.8);
          sfx.whoosh(2.4);
          void animate(g.headless ? 10 : 2600, (k) => whole.set(T3partial(k)), ease.inOut);
          void stamp(g, `Hull volume × ${det(T3).toFixed(1)}`, 3600);
        }
        if (i === 2) sfx.alarm();
      },
    });
    check(set);
    await titleCard(g, 'Chapter 14', 'Why is the ark getting smaller?', 3000);
    check(set);
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

// ------------------------------------------------------------------ the spire-volume clue

export async function spireVolume(g: Game): Promise<void> {
  g.stage.clearWorld();
  await g.stage.view3D({ target: [0, 0, 0.4], distance: 11, azimuth: -90, elevation: 22, ms: 500, orbit: false });
  const root = new Group();
  g.stage.world.add(root);
  const make = (x: number, title: string) => {
    const grp = new Group();
    grp.position.set(x, 0, 0);
    const lat = new Lattice3D(g.stage, { extent: 1, opacity: 0.5 });
    const cube = new Parallelepiped(g.stage, [1, 0, 0], [0, 1, 0], [0, 0, 1], { color: C.result, opacity: 0.2 });
    const lab = new Label(title, [0.5, 0, 1.9], { className: 'small' });
    const vol = new Label('volume 1', [0.5, 0, -1.2], { color: C.white, size: 16 });
    grp.add(lat.object, cube.object, lab.object, vol.object);
    grp.userData.dispose = () => { lab.dispose(); vol.dispose(); };
    root.add(grp);
    return { lat, cube, vol };
  };
  const a = make(-2.4, 'spire numbers');
  const b = make(2.4, 'measured pulse');
  const col = (M: Mat, j: number): V3 => [M[0][j], M[1][j], M[2][j]];
  const play = async (o: ReturnType<typeof make>, f: (t: number) => Mat) => {
    sfx.whoosh(1.8);
    await animate(g.headless ? 10 : 2000, (k) => {
      const M = f(k);
      o.lat.set(M);
      o.cube.set(col(M, 0), col(M, 1), col(M, 2));
      o.vol.set(`volume ${det(M).toFixed(2)}`);
    }, ease.inOut);
    o.vol.set(`volume ${fmtN(det(f(1)))}`);
    sfx.snap();
  };
  let job: Promise<void> = Promise.resolve();
  await g.say(S.spireVolume, {
    onLine: (_l, i) => {
      if (i === 0) job = play(a, Spartial);
      if (i === 1) {
        job = job.then(() => play(b, T3partial));
        if (pin('spires', 'Why did the prediction from the spires miss when the volume prediction matched?', 'c14')) sfx.discover();
        g.toast('The spires predicted the volume exactly and the position wrongly.', 'Case board · clue sharpened');
      }
    },
  });
  await job;
}

// ------------------------------------------------------------------ the debris strike (scene setup before the forecast)

export async function strikeShot(g: Game): Promise<void> {
  const root = new Group();
  const offs: (() => void)[] = [];
  root.userData.dispose = () => { offs.splice(0).forEach((f) => f()); };
  g.stage.world.add(root);
  const anchor = await makeAnchor(g.stage, 0.55, root);
  if (!root.parent) return; // the beat already moved on
  anchor.position.z = -0.15;
  const tips = [C.v, C.w, C.u].map((c, j) => new Arrow([0, 0, 0], [SPIRES[0][j], SPIRES[1][j], SPIRES[2][j]], { color: c, width: j === 2 ? 0.03 : 0.045 }));
  const box = new Parallelepiped(g.stage, [SPIRES[0][0], SPIRES[1][0], SPIRES[2][0]], [SPIRES[0][1], SPIRES[1][1], SPIRES[2][1]], [SPIRES[0][2], SPIRES[1][2], SPIRES[2][2]], { color: C.orange, opacity: 0.25 });
  root.add(...tips.map((t) => t.object), box.object);
  const flash = glowSprite('#ffd2a1', 6, 0.0);
  flash.position.set(1.5, -1.5, 1.5);
  root.add(flash);
  g.stage.disposeControls();
  await g.stage.view3D({ target: [0.3, 0.5, 1], distance: 8.5, azimuth: -50, elevation: 18, ms: 0, orbit: false });
  if (!root.parent) return;
  sfx.collapse();
  g.stage.flash(0.3, 600);
  g.stage.nudge(0.3);
  void animate(900, (k) => { flash.material.opacity = 0.9 * (1 - k); }, ease.out);
  let az = -50;
  offs.push(g.stage.tick((dt) => {
    az += dt * 3;
    const a = (az * Math.PI) / 180, e = (18 * Math.PI) / 180, d = 8.5;
    g.stage.camera.position.set(0.3 + d * Math.cos(e) * Math.cos(a), 0.5 + d * Math.cos(e) * Math.sin(a), 1 + d * Math.sin(e));
    g.stage.camera.lookAt(0.3, 0.5, 1);
  }));
}

// ------------------------------------------------------------------ the Collapse

export async function collapse(g: Game): Promise<void> {
  try {
    g.stage.clearWorld();
    g.mood('tension');
    const set = await meridianSet(g);
    check(set);
    const stern = new Deform(set, STERN_PARTS, STERN_CENTRE);
    // the sealed bulkhead between the mid-section and the stern
    const disc = new Mesh(new CircleGeometry(3.1, 48), new MeshBasicMaterial({ color: '#ffb35c', transparent: true, opacity: 0.5, side: DoubleSide, depthWrite: false }));
    disc.rotation.y = Math.PI / 2;
    disc.position.set(-9.6, 0, 0);
    const glow = glowSprite('#ffb35c', 9, 0.5);
    glow.position.copy(disc.position);
    set.root.add(disc, glow);
    const cam = new CamRig(g, set, [-4, -62, 18], [-16, 0, 3]);
    cam.drift(0.35);
    await letterbox(g, true, 500);
    void stamp(g, 'The stern · frame six', 3200);
    await g.say(S.collapse);
    check(set);
    music.stop(1.2);
    await wait(g.headless ? 10 : 1800);
    check(set);
    // the pulse fires: the real matrix on the real hull, (1 − t)I + tC, flat only at the end
    void g.stage.shockwave([-19, 0, 0], 2800, 1.2);
    g.stage.flash(0.35, 700);
    g.stage.nudge(0.45);
    sfx.collapse();
    void cam.to([-2, -70, 30], [-20, 0, 8], 3600, ease.inOut);
    await animate(g.headless ? 10 : 3400, (k) => stern.set(mlerp(identity(3), PULSE, k)), ease.inOut);
    stern.set(PULSE);
    g.mood('void');
    check(set);
    await wait(g.headless ? 10 : 1500);
    await g.say(S.after, {
      onLine: (_l, i) => {
        if (i === 3) {
          g.toast('Stern channel · static', 'Comms');
          if (pin('stern', 'Is the stern gone?', 'c14')) sfx.discover();
          g.toast('Is the stern gone?', 'Case board');
        }
      },
    });
    check(set);
    await wait(g.headless ? 10 : 1200);
    await fadeBlack(g, true, 1600);
    await letterbox(g, false, 10);
    g.stage.clearWorld();
    await fadeBlack(g, false, 600);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

// ------------------------------------------------------------------ a scene setup: the ark from the stern side

export async function sternShot(g: Game): Promise<void> {
  const set = await meridianSet(g, { lantern: { at: [-30, -26, 6], face: [0.6, 0.8, 0], scale: 1.5 } });
  if (!set.alive()) return; // the beat already moved on
  const cam = new CamRig(g, set, [-46, -52, 16], [-12, 0, 2]);
  cam.drift(0.4);
  void cam.to([-40, -48, 14], [-10, 0, 2], 20000, ease.linear);
}
