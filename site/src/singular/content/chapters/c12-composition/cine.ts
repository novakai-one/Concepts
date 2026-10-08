// Chapter 12 cinematics: the routine pulse followed by the ark's stabiliser turn. The Anchor's pulse
// moves every point (the lattice and the hull); the stabiliser turns only the ark's own hull. The
// fused-forecast install runs the player's matmul and forecasts points on the hull.
import { Group } from 'three';
import type { Game, V3 } from '../../../game/types';
import { BuoyField } from '../../../gfx/buoys';
import { loadModel } from '../../../gfx/models';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { makeAnchor } from '../../common/set';
import { isPlayerFn, pylib } from '../../../game/build';
import { matMul, matVec, meq, type Mat } from '../../../math/la';
import { embed, T2partial } from '../c11-transformations/honest';
import { T } from '../../truth';
import { TURN } from './logic';
import { S } from './script';

const rot = (t: number): Mat => [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]];
const setM = (g: Group, W: Mat) => {
  const m = embed(W);
  g.matrix.set(m[0][0], m[0][1], 0, 0, m[1][0], m[1][1], 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  g.matrixWorldNeedsUpdate = true;
};

/**
 * Pulse (honest, P R(θ) P⁻¹), then the stabiliser's quarter turn (by angle). The pulse moves every
 * point, so onPulse(W) gets the pulse partway; the stabiliser turns only the ark, so onTurn(W) gets
 * the turn partway after the whole pulse. Both are called every frame.
 */
async function pulseThenTurn(g: Game, onPulse: (W: Mat) => void, onTurn: (W: Mat) => void, ms = 2200): Promise<void> {
  sfx.collapse();
  g.stage.flash(0.14, 400);
  void g.stage.shockwave([0, 0, 0], ms, 0.8);
  await animate(ms, (k) => onPulse(T2partial(k)), ease.inOut);
  await wait(450);
  sfx.whoosh(ms / 1000);
  await animate(ms, (k) => onTurn(matMul(rot((k * Math.PI) / 2), T)), ease.inOut);
}

// where arkHull places the Meridian: spine along x, model units scaled down
const HULL_AT: V3 = [2.6, 1.4, 1.1];
const HULL_SCALE = 0.035;
/**
 * Points on the hull, in model units (x along the spine, y across, z up), set just above the
 * surface so the model does not hide them: the bow tip, the top corners of the end frames of both
 * box-frame trusses, and the radiator wing tips.
 */
const HULL_NODES: V3[] = [
  [31.8, 0, 0],
  [15.7, 2.25, 2.55], [15.7, -2.25, 2.55], [9.3, 2.25, 2.55], [9.3, -2.25, 2.55],
  [-9.4, 2.25, 2.55], [-9.4, -2.25, 2.55], [-15.8, 2.25, 2.55], [-15.8, -2.25, 2.55],
  [-21.8, 10.8, 0.3], [-21.8, -10.8, 0.3],
];
const hullPoints = (): V3[] => HULL_NODES.map((q) => [0, 1, 2].map((i) => HULL_AT[i] + HULL_SCALE * q[i]) as V3);

async function arkHull(g: Game): Promise<Group> {
  const holder = new Group();
  holder.matrixAutoUpdate = false;
  g.stage.world.add(holder);
  const m = await loadModel('meridian');
  if (m) {
    m.rotation.x = Math.PI / 2;
    m.scale.setScalar(HULL_SCALE);
    m.position.set(...HULL_AT);
    holder.add(m);
  }
  return holder;
}

export async function coldOpen(g: Game): Promise<void> {
  await fadeBlack(g, true, 10);
  g.mood('tension');
  const b = new BuoyField(g.stage, { extent: 6, size: 0.045 });
  g.stage.world.add(b.object);
  const anchor = await makeAnchor(g.stage, 0.35);
  anchor.position.z = 0.05;
  const ark = await arkHull(g);
  await g.stage.view3D({ target: [0.8, 0.8, 0.4], distance: 16, azimuth: -100, elevation: 50, orbit: false, ms: 0 });
  await fadeBlack(g, false, 1200);
  await letterbox(g, true, 500);
  void titleCard(g, 'Chapter 12', 'What do two moves in a row do?', 3200);
  void stamp(g, 'The *Meridian* · a routine pulse, then the stabiliser', 4000);
  await g.say([S.open[0]], {
    // the pulse moves the lattice and the ark; the stabiliser turns the ark alone
    onLine: () => { void pulseThenTurn(g, (W) => { b.set(W); setM(ark, W); }, (W) => setM(ark, W)); },
  });
  await wait(3600);
  await letterbox(g, false, 400);
  await g.say(S.open.slice(1));
}

// ------------------------------------------------------------------ install: the fused forecast

async function fused(): Promise<{ F: Mat; who: 'mine' | 'crew' | 'mismatch' }> {
  const crew = matMul(TURN, T);
  if (!isPlayerFn('matmul')) return { F: crew, who: 'crew' };
  try {
    const timeout = new Promise<null>((r) => window.setTimeout(() => r(null), 8000));
    const res = await Promise.race([pylib.map<Mat>('matmul', [[TURN, T]]), timeout]);
    const mine = res && res.who === 'yours' ? res.values[0] : null;
    if (!mine || !Array.isArray(mine) || mine.length !== 2 || !meq(mine, crew, 1e-6)) return { F: crew, who: 'mismatch' };
    return { F: mine, who: 'mine' };
  } catch {
    return { F: crew, who: 'mismatch' };
  }
}

export async function installFused(g: Game): Promise<void> {
  g.stage.clearWorld();
  g.mood('puzzle');
  const b = new BuoyField(g.stage, { extent: 5, size: 0.055 });
  g.stage.world.add(b.object);
  const anchor = await makeAnchor(g.stage, 0.3);
  anchor.position.z = 0.02;
  const ark = await arkHull(g);
  const pts = hullPoints();
  const hull = new BuoyField(g.stage, { points: pts, color: '#ffffff', size: 0.045 });
  g.stage.world.add(hull.object);
  void g.stage.view3D({ target: [0.6, 0.6, 0.6], distance: 13, azimuth: -90, elevation: 70, orbit: false, ms: 900 });
  await g.say(S.install);
  const { F, who } = await fused();
  const ghosts = new BuoyField(g.stage, { points: pts.map((q) => { const r = matVec(F, [q[0], q[1]]); return [r[0], r[1], q[2]] as V3; }), color: C.result, size: 0.065 });
  ghosts.object.scale.setScalar(0.001);
  g.stage.world.add(ghosts.object);
  sfx.discover();
  await animate(700, (k) => ghosts.object.scale.setScalar(Math.max(0.001, k)), ease.out);
  await g.say(who === 'mine' ? S.installMine : who === 'crew' ? S.installCrew : S.installMismatch);
  // the pulse moves the lattice and the hull; the stabiliser turns the hull alone
  await pulseThenTurn(g, (W) => { b.set(W); hull.set(W); setM(ark, W); }, (W) => { hull.set(W); setM(ark, W); }, 2000);
  hull.highlight([...hull.base.keys()], C.result, 0.6);
  sfx.success();
  await g.say(S.landed);
}
