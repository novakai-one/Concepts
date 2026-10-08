// Chapter 17 staging: the Anchor on the ground layer with its arms measured (cold open), shots for the
// scenes, the core's light (Ilse is alive), the ark in the debris stream, and the ark clear of it after
// the one unlocked pulse (fired once, in the set piece). Every move on screen is the real matrix: the
// copper grid shears from square to the measured arms (a straight slide), the ark turns a true quarter
// turn about the Anchor.
import { Group, Vector3, type Sprite } from 'three';
import type { Game, V3 } from '../../../game/types';
import { BuoyField } from '../../../gfx/buoys';
import { Arrow } from '../../../gfx/arrow';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { glowSprite } from '../../../gfx/markers';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { arcPts } from '../../../kit/geom-math';
import { answer } from '../../../game/caseboard';
import { makeAnchor } from '../../common/set';
import { P2, R } from '../../truth';
import { identity, type Mat } from '../../../math/la';
import { CopperGrid, VELL_GRID } from './grids';
import { arkModel, debrisStream } from './setpiece';
import { ARK, ARK_AFTER, B1, B2, B2_LEN, PC, STREAM_X, fmtV } from './logic';
import { S } from './script';

/** Thrown when the player leaves a cinematic part-way: stop quietly. */
class Gone extends Error {}

interface Set6 { root: Group; alive(): boolean; check(): void; tick(f: (dt: number, t: number) => void): void }

function newSet(g: Game): Set6 {
  const root = new Group();
  g.stage.world.add(root);
  const offs: (() => void)[] = [];
  root.userData.dispose = () => offs.splice(0).forEach((f) => f());
  const alive = () => !!root.parent;
  return {
    root, alive, check: () => { if (!alive()) throw new Gone(); },
    // a callback whose set has left the world (the player jumped away mid-cinematic) removes itself
    tick: (f) => { const off = g.stage.tick((dt, t) => { if (!root.parent) { off(); return; } f(dt, t); }); offs.push(off); },
  };
}

/** Camera on a slow orbit around a point (z up); stops when the set leaves the world. */
function drift(g: Game, set: Set6, target: V3, dist: number, elev: number, az0: number, degPerSec: number): void {
  let az = az0;
  g.stage.disposeControls();
  g.stage.mode = '3d';
  const t = new Vector3(...target);
  const place = () => {
    const a = (az * Math.PI) / 180, e = (elev * Math.PI) / 180;
    g.stage.camera.position.set(t.x + dist * Math.cos(e) * Math.cos(a), t.y + dist * Math.cos(e) * Math.sin(a), t.z + dist * Math.sin(e));
    g.stage.camera.up.set(0, 0, 1);
    g.stage.camera.lookAt(t);
  };
  place();
  set.tick((dt) => { if (g.stage.controls) return; az += dt * degPerSec; place(); });
}

/** The ground layer under the Anchor: the lattice of buoys, the copper grid, the Anchor and Ilse's lamp. */
async function groundStage(g: Game, o: { copper?: Mat; arms?: boolean; vell?: boolean; lamp?: number } = {}) {
  const set = newSet(g);
  const buoys = new BuoyField(g.stage, { extent: 6, size: 0.045, color: '#cfe0ff' });
  set.root.add(buoys.object);
  set.root.userData.dispose = ((d0: () => void) => () => { d0(); buoys.dispose(); })(set.root.userData.dispose as () => void);
  const copper = new CopperGrid(g.stage, { M: o.copper ?? P2, half: 6.5, n: 14 });
  set.root.add(copper.object);
  let vell: CopperGrid | null = null;
  if (o.vell) { vell = new CopperGrid(g.stage, { M: PC, half: 6.5, n: 10, color: VELL_GRID, dash: 0.05, gap: 0.12, opacity: 0.7, width: 1.3 }); set.root.add(vell.object); }
  const anchor = await makeAnchor(g.stage, 0.55, set.root);
  anchor.position.z = 0.02;
  const lamp = glowSprite('#ffe9c4', 0.9, o.lamp ?? 0.55);
  lamp.position.set(0, 0, 0.08);
  set.root.add(lamp);
  const arms: Arrow[] = [];
  if (o.arms) {
    arms.push(new Arrow([0, 0, 0.02], [B1[0], B1[1], 0.02], { color: C.v, width: 0.05, label: '$\\mathbf b_1$' }));
    arms.push(new Arrow([0, 0, 0.02], [B2[0], B2[1], 0.02], { color: C.w, width: 0.05, label: '$\\mathbf b_2$' }));
    set.root.add(...arms.map((a) => a.object));
    for (const a of arms) a.object.userData.dispose = () => a.dispose();
  }
  return { set, buoys, copper, vell, anchor, lamp, arms };
}

// ------------------------------------------------------------------ cold open: Bram measures the Anchor's arms

export async function coldOpen(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('explore');
    const st = await groundStage(g, { copper: identity(2) });
    const { set, copper } = st;
    set.check();
    copper.setOpacity(0);
    drift(g, set, [0.6, 0.5, 0], 8.8, 50, -100, 2.2);
    void fadeBlack(g, false, 1400);
    await letterbox(g, true, 500);
    void titleCard(g, 'Act VI · The Wrong Grid', 'Same point, different grid: what are its numbers now?', 3600);
    void stamp(g, 'Under the Anchor · the ground layer', 4200);
    const a1 = new Arrow([0, 0, 0.03], [0, 0, 0.03], { color: C.v, width: 0.055, label: '$\\mathbf b_1$' });
    const a2 = new Arrow([0, 0, 0.03], [0, 0, 0.03], { color: C.w, width: 0.055, label: '$\\mathbf b_2$' });
    set.root.add(a1.object, a2.object);
    for (const a of [a1, a2]) { a.object.userData.dispose = () => a.dispose(); a.setOpacity(0); }
    const len = new Label('', [0, 0, 0], { className: 'c17-pt r', offset: [26, -10] });
    const ang = new Label('', [0, 0, 0], { className: 'c17-pt', offset: [0, 0] });
    len.show(false); ang.show(false);
    set.root.add(len.object, ang.object);
    len.object.userData.dispose = () => len.dispose();
    ang.object.userData.dispose = () => ang.dispose();
    let arc: FatLine | null = null;
    await g.say(S.open, {
      onLine: async (_l, i) => {
        set.check();
        if (i === 1) { await copper.fade(0.8, 900); }                       // LANTERN's square drawing
        if (i === 2) { a1.setOpacity(1); await a1.moveTo([B1[0], B1[1], 0.03], 900); sfx.snap(); }
        if (i === 3) {
          a2.setOpacity(1);
          await a2.moveTo([0, 1, 0.03], 700);
          await wait(250);
          // the measured second arm: the copper grid slides from square to the Anchor's (a shear, never flat)
          sfx.whoosh(1.4);
          await Promise.all([a2.moveTo([B2[0], B2[1], 0.03], 1400), copper.to(P2, 1400, 'linear')]);
          sfx.discover();
        }
        if (i === 4) {
          len.at([B2[0] / 2, B2[1] / 2, 0.03]); len.set(B2_LEN.toFixed(2)); len.show(true);
          arc = new FatLine(g.stage, arcPts([0, 0, 0.03], [1, 0, 0], [B2[0], B2[1], 0], 0.55, 30), { color: C.white, width: 1.8, opacity: 0.85 });
          arc.object.userData.dispose = () => arc?.dispose();
          set.root.add(arc.object);
          ang.at([0.8, 0.28, 0.03]); ang.set('45°'); ang.show(true);
          sfx.tick(2);
        }
      },
    });
    set.check();
    await letterbox(g, false, 400);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

// ------------------------------------------------------------------ shots for the scenes

/** The Anchor's grid in copper over the lattice, its arms lit; the camera drifts. */
export async function anchorShot(g: Game): Promise<void> {
  const { set } = await groundStage(g, { arms: true });
  drift(g, set, [0.8, 0.6, 0], 9.5, 55, -110, 2);
}

/** The Anchor's grid and Vell's grid (pale dotted) over the lattice. */
export async function gridsShot(g: Game): Promise<void> {
  const { set } = await groundStage(g, { arms: false, vell: true });
  drift(g, set, [0.8, 0.6, 0], 10, 58, -95, 1.6);
}

/** The ark, its stern still flat, seen close (Teo's channel). */
export async function sternShot(g: Game): Promise<void> {
  const set = newSet(g);
  const ark = await arkModel(1);
  set.root.add(ark);
  const glow = glowSprite('#ffd2a1', 220, 0.7);
  glow.position.set(-600, -500, 200);
  set.root.add(glow);
  let t = 0;
  set.tick((dt) => {
    t += dt;
    if (g.stage.controls) return;
    const a = -2.5 + t * 0.02;
    g.stage.camera.position.set(-22 + 36 * Math.cos(a), 36 * Math.sin(a), 9 + Math.sin(t * 0.12));
    g.stage.camera.up.set(0, 0, 1);
    g.stage.camera.lookAt(-20, 0, 0);
  });
  g.stage.disposeControls();
  g.stage.mode = '3d';
}

/** The ground layer in miniature: the Anchor, the debris stream along x = 3, and the ark at `at`. */
async function streamStage(g: Game, at: readonly number[] = ARK, turned = false) {
  const st = await groundStage(g, { arms: false, lamp: 0.9 });
  debrisStream(st.set.root, (f) => st.set.tick(f));
  const line = new FatLine(g.stage, [[STREAM_X, -8, 0.01], [STREAM_X, 8, 0.01]], { color: '#c9b49a', width: 1.4, dashed: true, opacity: 0.5, dashSize: 0.25, gapSize: 0.15 });
  line.object.userData.dispose = () => line.dispose();
  st.set.root.add(line.object);
  const holder = new Group();
  holder.matrixAutoUpdate = false;
  st.set.root.add(holder);
  const ark = new Group();
  ark.position.set(ARK[0], ARK[1], 0.15);
  holder.add(ark);
  void arkModel(0.021).then((m) => { m.rotation.z = Math.PI / 2; ark.add(m); });
  const setTurn = (M: Mat) => { holder.matrix.set(M[0][0], M[0][1], M[0][2], 0, M[1][0], M[1][1], M[1][2], 0, M[2][0], M[2][1], M[2][2], 0, 0, 0, 0, 1); holder.matrixWorldNeedsUpdate = true; };
  setTurn(turned ? R : identity(3));
  return { ...st, holder, setTurn };
}

export async function streamShot(g: Game): Promise<void> {
  const { set } = await streamStage(g);
  drift(g, set, [1.6, 1.2, 0], 10.5, 42, -120, 1.8);
}

export async function clearShot(g: Game): Promise<void> {
  const { set } = await streamStage(g, ARK_AFTER, true);
  drift(g, set, [0.6, 1.6, 0], 10.5, 40, -135, 1.5);
}

// ------------------------------------------------------------------ Ilse is alive

export async function reveal(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('void');
    const { set, lamp, copper } = await groundStage(g, { arms: false, lamp: 0.35 });
    set.check();
    copper.setOpacity(0.35);
    drift(g, set, [0, 0, 0.4], 6.2, 24, -70, 1.4);
    void fadeBlack(g, false, 1600);
    await letterbox(g, true, 600);
    void stamp(g, 'The Anchor’s base · the point that never moves', 4200);
    await g.say(S.reveal, {
      onLine: async (_l, i) => {
        set.check();
        if (i === 4) {
          // the light at the origin answers on the live channel
          sfx.discover();
          await animate(1600, (k) => { lamp.scale.setScalar(0.9 + 1.4 * k); (lamp as Sprite).material.opacity = 0.35 + 0.6 * k; }, ease.out);
        }
      },
    });
    set.check();
    g.mood('explore');
    await g.say(S.live, {
      onLine: async (_l, i) => {
        set.check();
        if (i === 3) {
          answer('light', 'Dr Ilse Varga’s lamp. She has lived three years in the core, under the Anchor, at the origin: the one point no pulse can move.', 'c17');
          g.toast('What is the light at the point that never moves?', 'Case board · answered');
        }
      },
    });
    set.check();
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

// ------------------------------------------------------------------ after the one unlocked pulse

/**
 * The aftermath. The set piece already checked the setting (the spire translator) and fired the one
 * unlocked pulse, so the ark is already turned: this scene starts from (−1, 3, 0) and does not fire again.
 */
export async function clearCine(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    const st = await streamStage(g, ARK_AFTER, true);
    st.set.check();
    drift(g, st.set, [0.6, 1.6, 0], 9.5, 36, -135, 1.2);
    void fadeBlack(g, false, 1200);
    await letterbox(g, true, 500);
    st.set.check();
    const tagEl = new Label(`ark ${fmtV(ARK_AFTER)}`, [ARK_AFTER[0], ARK_AFTER[1], 0], { className: 'c17-pt w', offset: [0, 30] });
    tagEl.object.userData.dispose = () => tagEl.dispose();
    st.set.root.add(tagEl.object);
    g.mood('triumph');
    sfx.success();
    await g.say(S.clear);
    st.set.check();
    await letterbox(g, false, 400);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

