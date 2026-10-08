// Chapter 11 cinematics and scene stagings: the Anchor with its spire tips lit in the column colours,
// the ground layer of buoys, the routine pulse played honestly (P R(θ) P⁻¹, determinant 1 at every
// frame), four pulses in a row, and the pulse-forecast install that runs the player's matvec.
import { Group, Vector3, type Object3D } from 'three';
import type { Game, V3 } from '../../../game/types';
import { BuoyField } from '../../../gfx/buoys';
import { glowSprite } from '../../../gfx/markers';
import { Label } from '../../../gfx/label';
import { Lattice3D } from '../../../gfx/shapes';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { makeAnchor, makeLantern, SPIRES } from '../../common/set';
import { isPlayerFn, pylib } from '../../../game/build';
import { matVec, type Mat } from '../../../math/la';
import { T3partial, T2partial } from './honest';
import { PULSE } from './logic';
import { FlatGrid } from './bench';
import { S } from './script';

/** Light the Anchor's spire tips green, red and blue (the three columns). Returns the tip positions. */
export async function anchorWithTips(g: Game, scale: number, parent: Object3D = g.stage.world): Promise<{ root: Group; tips: V3[] }> {
  const root = await makeAnchor(g.stage, scale, parent);
  root.updateMatrixWorld(true);
  const tips: V3[] = [];
  for (let i = 1; i <= 3; i++) {
    const n = root.getObjectByName(`spire_${i}_tip`);
    const p = n ? n.getWorldPosition(new Vector3()) : new Vector3(...SPIRES[i - 1]).normalize().multiplyScalar(2.2 * scale);
    tips.push([p.x, p.y, p.z]);
  }
  const colors = [C.v, C.w, C.u];
  tips.forEach((t, i) => {
    const s = glowSprite(colors[i], 0.9 * Math.max(0.6, scale), 0.95);
    s.position.set(...t);
    root.parent?.add(s);
    const core = glowSprite('#ffffff', 0.25 * Math.max(0.6, scale), 0.9);
    core.position.set(...t);
    root.parent?.add(core);
  });
  return { root, tips };
}

/** The ground layer: buoys on z = 0 around the Anchor, with e₁ and e₂ tagged. */
function groundLayer(g: Game, extent = 6): BuoyField {
  const b = new BuoyField(g.stage, { extent, size: 0.05 });
  g.stage.world.add(b.object);
  return b;
}

const tag = (b: BuoyField) => {
  b.highlight([b.indexOf([1, 0, 0])], C.v, 1);
  b.highlight([b.indexOf([0, 1, 0])], C.w, 1);
};

/** Slow camera drift around a target. Stops when stopped, or when `owner` leaves the scene. */
function drift(g: Game, target: V3, dist: number, elev: number, az0: number, degPerSec: number, owner: Object3D): () => void {
  let az = az0;
  const t = new Vector3(...target);
  g.stage.disposeControls();
  g.stage.mode = '3d';
  const place = () => {
    const a = (az * Math.PI) / 180, e = (elev * Math.PI) / 180;
    g.stage.camera.position.set(t.x + dist * Math.cos(e) * Math.cos(a), t.y + dist * Math.cos(e) * Math.sin(a), t.z + dist * Math.sin(e));
    g.stage.camera.up.set(0, 0, 1);
    g.stage.camera.lookAt(t);
  };
  place();
  const off = g.stage.tick((dt) => {
    if (!owner.parent) { off(); return; }
    az += dt * degPerSec;
    place();
  });
  return off;
}

/** One routine pulse on a 2-D buoy field (honest: P R(θ) P⁻¹). Starts from M0. */
export async function pulse2(g: Game, b: BuoyField, M0: Mat = [[1, 0], [0, 1]], ms = 2200): Promise<void> {
  sfx.collapse();
  g.stage.flash(0.16, 400);
  g.stage.nudge(0.25);
  void g.stage.shockwave([0, 0, 0], ms, 0.9);
  await animate(ms, (k) => {
    const W = T2partial(k);
    b.set([[W[0][0] * M0[0][0] + W[0][1] * M0[1][0], W[0][0] * M0[0][1] + W[0][1] * M0[1][1]], [W[1][0] * M0[0][0] + W[1][1] * M0[1][0], W[1][0] * M0[0][1] + W[1][1] * M0[1][1]]]);
  }, ease.inOut);
}

// ------------------------------------------------------------------ cold open

export async function coldOpen(g: Game): Promise<void> {
  await fadeBlack(g, true, 10);
  g.mood('tension');
  const b = groundLayer(g, 7);
  b.object.visible = false;
  const { root } = await anchorWithTips(g, 0.9);
  root.position.z = 0.05;
  const stopDrift = drift(g, [0, 0, 0.6], 8.5, 16, -70, 3.2, b.object);
  await fadeBlack(g, false, 1400);
  await letterbox(g, true, 500);
  void titleCard(g, 'Act IV · The Pulse', 'What did the pulse do to the grid?', 3400);
  void stamp(g, 'Under the Anchor · the *Lantern* holds station', 4200);
  await g.say(S.open.slice(0, 3));
  stopDrift();
  // pull up and back so the ground layer is visible
  b.object.visible = true;
  b.object.scale.setScalar(0.001);
  void animate(1400, (k) => b.object.scale.setScalar(Math.max(0.001, k)), ease.out);
  await g.stage.view3D({ target: [0, 0, 0], distance: 15, azimuth: -95, elevation: 62, orbit: false, ms: 1800 });
  await g.say(S.open.slice(3), {
    onLine: () => { tag(b); sfx.discover(); },
  });
  await wait(300);
  await pulse2(g, b);
  await wait(500);
  await letterbox(g, false, 400);
  await g.say(S.afterPulse);
}

// ------------------------------------------------------------------ the spire readings (scene before p4)

export async function spireScene(g: Game): Promise<void> {
  // clear the origin shot (buoy field, small Anchor, lamp) before the large Anchor is built
  g.stage.clearWorld();
  const holder = new Group();
  g.stage.world.add(holder);
  const { tips } = await anchorWithTips(g, 1.1, holder);
  const readings = ['(0, 1, 0)', '(−1, 0, 0)', '(0, 0, 0.8)'];
  const colors = [C.v, C.w, C.u];
  const labels = tips.map((t, i) => {
    const l = new Label(`<span style="color:${colors[i]}">tip ${i + 1}</span> ${readings[i]}`, [t[0], t[1], t[2] + 0.45], { className: 'coord' });
    holder.add(l.object);
    return l;
  });
  const lat = new Lattice3D(g.stage, { extent: 2, opacity: 0.35 });
  holder.add(lat.object);
  const stop = drift(g, [0.4, 0.4, 0.8], 9, 20, -58, 4, holder);
  // labels are DOM elements: remove them with the set (clearing the world does not reach them)
  holder.userData.dispose = () => { stop(); lat.dispose(); labels.forEach((l) => l.dispose()); };
}

// ------------------------------------------------------------------ four pulses: the ground layer comes home

export async function fourPulses(g: Game): Promise<void> {
  g.stage.clearWorld();
  // the ground layer (z = 0) and the top layer (z = 2) of a small lattice; the rest stays faint
  const pts: V3[] = [];
  for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) for (const z of [0, 2]) pts.push([x, y, z]);
  const b = new BuoyField(g.stage, { points: pts, dims: 3, size: 0.06 });
  g.stage.world.add(b.object);
  const ground = b.base.map((p, i) => (p[2] === 0 ? i : -1)).filter((i) => i >= 0);
  const top = b.base.map((p, i) => (p[2] === 2 ? i : -1)).filter((i) => i >= 0);
  b.highlight(ground, C.white, 0.25);
  b.highlight(top, C.orange, 0.25);
  b.highlight([b.indexOf([1, 0, 0])], C.v, 0.6);
  // where the ground layer started: a faint fixed grid
  const home = new FlatGrid(g.stage, { extent: 2, color: C.white, opacity: 0.35, dashed: true, axisColor: C.white });
  g.stage.world.add(home.object);
  const lat = new Lattice3D(g.stage, { extent: 2, opacity: 0.12 });
  g.stage.world.add(lat.object);
  home.object.userData.dispose = () => home.dispose();
  lat.object.userData.dispose = () => lat.dispose();
  const counter = new Label('', [0, 0, 3.2], { className: 'tag' });
  g.stage.world.add(counter.object);
  g.stage.disposeControls();
  await g.stage.view3D({ target: [0, 0, 0.8], distance: 15, azimuth: -62, elevation: 34, orbit: false, ms: 900 });
  let M: Mat = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let n = 1; n <= 4; n++) {
    counter.set(`pulse ${n}`);
    const M0 = M;
    sfx.collapse();
    void g.stage.shockwave([0, 0, 0], 1400, 0.6);
    await animate(1400, (k) => {
      const W = mul3(T3partial(k), M0);
      b.set(W);
      lat.set(W);
    }, ease.inOut);
    M = mul3(T3partial(1), M0);
    await wait(350);
  }
  counter.set('pulse 4 · the ground layer is home');
  sfx.discover();
  b.highlight(ground, C.result, 0.6);
  await wait(700);
}

const mul3 = (A: Mat, B: Mat): Mat => A.map((r) => B[0].map((_, j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));

// ------------------------------------------------------------------ install: the pulse forecast

/**
 * The forecast for every buoy: one batched Python call (pylib.map) over all of them when the player's
 * matvec has passed its tests; LANTERN's backup (the TypeScript crew version) otherwise. The result is
 * checked against the backup; on any disagreement or delay the backup is used, and LANTERN says so.
 */
async function forecast(pts: number[][]): Promise<{ out: number[][]; who: 'mine' | 'crew' | 'mismatch' }> {
  const crew = pts.map((p) => matVec(PULSE, p));
  if (!isPlayerFn('matvec')) return { out: crew, who: 'crew' };
  try {
    const timeout = new Promise<null>((r) => window.setTimeout(() => r(null), 12000));
    const res = await Promise.race([pylib.map<number[]>('matvec', pts.map((p) => [PULSE, p])), timeout]);
    if (!res || res.who !== 'yours' || res.values.length !== pts.length) return { out: crew, who: 'mismatch' };
    const bad = res.values.filter((m, i) => !Array.isArray(m) || m.length !== 2 || Math.abs(m[0] - crew[i][0]) > 1e-6 || Math.abs(m[1] - crew[i][1]) > 1e-6).length;
    return bad ? { out: crew, who: 'mismatch' } : { out: res.values, who: 'mine' };
  } catch {
    return { out: crew, who: 'mismatch' };
  }
}

export async function installForecast(g: Game): Promise<void> {
  g.stage.clearWorld();
  g.mood('puzzle');
  const n = 22; // 45 × 45 = 2,025 buoys
  const b = new BuoyField(g.stage, { extent: n, size: 0.1 });
  g.stage.world.add(b.object);
  const anchor = await makeAnchor(g.stage, 1.2);
  anchor.position.z = 0.05;
  const ship = makeLantern(g.stage, 0.45);
  g.stage.world.add(ship.object);
  ship.object.position.set(-14, -11, 2.2);
  ship.face([1, 0.7, 0]);
  void g.stage.view3D({ target: [0, 0, 0], distance: 58, azimuth: -90, elevation: 64, orbit: false, ms: 1200 });
  await g.say(S.install);
  const pts = b.base.map((p) => [p[0], p[1]]);
  const { out, who } = await forecast(pts);
  const ghosts = new BuoyField(g.stage, { points: out.map((q) => [q[0], q[1], 0] as V3), color: C.result, size: 0.15 });
  ghosts.object.scale.setScalar(0.001);
  g.stage.world.add(ghosts.object);
  sfx.discover();
  await animate(700, (k) => ghosts.object.scale.setScalar(Math.max(0.001, k)), ease.out);
  await g.say(who === 'mine' ? S.installMine : who === 'crew' ? S.installCrew : S.installMismatch);
  await pulse2(g, b, [[1, 0], [0, 1]], 2600);
  b.highlight([...b.base.keys()], C.result, 0.9);
  sfx.success();
  await g.say(S.landed);
}
