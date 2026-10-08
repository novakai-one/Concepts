// Act VII staging (shared with Chapters 19 and 20): the ark beside the Anchor with Vell's cutter on station,
// and the holotable field (debris around the Anchor, in buoy units) that Vell's pulse V moves. Every
// motion of the field is the real matrix, played honestly: one pulse slides from I to V in a straight
// line (its stretches go from 1 to 1, 0.5, 0.2 and never through 0), and repeats are pulse after pulse.
// Chapter 18's cinematics are at the bottom: the cold open, the λ dial on C₂ (the constellation's
// star "0 is an eigenvalue"), and the line finder that runs on the player's power_iteration.
import { BufferAttribute, BufferGeometry, Color, Group, Points, PointsMaterial, Vector3, type Sprite } from 'three';
import type { Game, V3 } from '../../../game/types';
import { glowSprite } from '../../../gfx/markers';
import { Arrow } from '../../../gfx/arrow';
import { Label } from '../../../gfx/label';
import { Grid2D } from '../../../gfx/grid';
import { InfLine, Lattice3D } from '../../../gfx/shapes';
import { loadModel } from '../../../gfx/models';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, titleCard } from '../../../kit/cine';
import { lightStar, pin } from '../../../game/caseboard';
import { isPlayerFn, pylib } from '../../../game/build';
import { rng } from '../../../game/lawcheck';
import { makeAnchor } from '../../common/set';
import { actSet, aimAt, makeCutter, type ActSet } from '../c15-nullspace/scenes';
import { C2, V, VELL_CUTTER } from '../../truth';
import { det, identity, matMul, matVec, mlerp, mpow, normalize, type Mat, type Vec } from '../../../math/la';
import { lineFinder, lineFinderOk } from './logic';
import { S } from './script';

/** Thrown when the player leaves a cinematic part-way: stop quietly. */
export class Gone extends Error {}
const check = (set: { alive(): boolean }) => { if (!set.alive()) throw new Gone(); };

// ------------------------------------------------------------------ the exterior: ark, Anchor, Lantern, cutter

/** The ark (stern still flat), the Anchor, the Lantern, Vell's cutter on station. */
export async function exteriorSet(g: Game, o: { drones?: number } = {}): Promise<{ set: ActSet; cutter: Group; drones: Points | null }> {
  const set = await actSet(g, { ark: { at: [0, 0, 0] }, anchor: { at: [-120, 80, -14], scale: 6.5 }, lantern: { at: [26, -34, 8], face: [-0.6, 1, 0], scale: 1.4 } });
  const cutter = makeCutter(1.2);
  // the beat moved on while the models loaded: register nothing on a set that is already gone
  if (!set.alive()) return { set, cutter, drones: null };
  cutter.position.set(-70, 46, 4);
  aimAt(cutter, [-120, 80, -14]);
  set.root.add(cutter);
  set.tick((_dt, t) => cutter.traverse((n) => { if (n.userData.blink) (n as Sprite).material.opacity = Math.sin(t * 5) > 0.6 ? 0.95 : 0.15; }));
  let drones: Points | null = null;
  if (o.drones) {
    // the ark's drones: small lights drifting in loose shells around the hull
    const n = o.drones, r = rng(2020);
    const pos = new Float32Array(n * 3), base: number[][] = [];
    for (let i = 0; i < n; i++) { const x = -30 + r() * 62, a = r() * Math.PI * 2, rad = 9 + r() * 6; base.push([x, rad * Math.cos(a), rad * Math.sin(a), r() * 6]); }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    const mat = new PointsMaterial({ color: new Color('#bfe9ff').multiplyScalar(1.6), size: 0.55, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false });
    drones = new Points(geo, mat);
    drones.userData.base = base;
    set.root.add(drones);
    const old = set.root.userData.dispose as () => void;
    set.root.userData.dispose = () => { old(); geo.dispose(); mat.dispose(); };
    set.tick((_dt, t) => {
      for (let i = 0; i < n; i++) { const [x, y, z, ph] = base[i]; const a = 0.08 * t + ph; pos[3 * i] = x + Math.sin(a * 0.7) * 1.2; pos[3 * i + 1] = y * Math.cos(0.05 * t) - z * Math.sin(0.05 * t); pos[3 * i + 2] = y * Math.sin(0.05 * t) + z * Math.cos(0.05 * t) + Math.sin(a) * 0.6; }
      geo.attributes.position.needsUpdate = true;
    });
  }
  return { set, cutter, drones };
}

/** Scene staging: the ark and the cutter, the camera on a slow orbit. */
export async function exteriorShot(g: Game): Promise<void> {
  const { set } = await exteriorSet(g);
  if (!set.alive()) return; // skipped before the models loaded: leave the camera to the next beat
  let t = 0;
  set.tick((dt) => { t += dt; if (g.stage.controls) return; const a = -1.9 + t * 0.012; g.stage.camera.position.set(-40 + 95 * Math.cos(a), 20 + 95 * Math.sin(a), 22 + Math.sin(t * 0.1) * 2); g.stage.camera.up.set(0, 0, 1); g.stage.camera.lookAt(-40, 20, 0); });
  g.stage.disposeControls();
  g.stage.mode = '3d';
}

// ------------------------------------------------------------------ the holotable field

export interface Field {
  root: Group;
  alive(): boolean;
  tick(f: (dt: number, t: number) => void): void;
  /** Move every debris point by M (from where it started). */
  set(M: Mat): void;
  M: Mat;
  /** One honest pulse of V from the current state. */
  pulse(ms: number, P?: Mat): Promise<void>;
  cutter: Group;
  cutterAt(p: readonly number[]): void;
  lines: Group;
  start: Vec[];
}

const LINES: Vec[] = [[1, 1, 1], [1, -1, 0], [1, 1, -2]];

/** Debris points around the Anchor (buoy units), the cutter at (4, 2, 0), optional violet lines V keeps. */
export async function fieldSet(g: Game, o: { n?: number; lines?: boolean; cutter?: boolean } = {}): Promise<Field> {
  const root = new Group();
  g.stage.world.add(root);
  const offs: (() => void)[] = [];
  const disposers: (() => void)[] = [];
  root.userData.dispose = () => { offs.splice(0).forEach((f) => f()); disposers.splice(0).forEach((f) => f()); };
  const alive = () => !!root.parent;
  const anchor = await makeAnchor(g.stage, 0.32, root);
  anchor.position.set(0, 0, 0);
  const lamp = glowSprite('#ffe9c4', 0.6, 0.6);
  root.add(lamp);
  const n = o.n ?? 900, r = rng(1818);
  const start: Vec[] = [];
  for (let i = 0; i < n; i++) {
    let p: Vec;
    do { p = [r() * 12 - 6, r() * 12 - 6, r() * 8 - 4]; } while (Math.hypot(p[0], p[1], p[2] * 1.3) > 6 || Math.hypot(p[0], p[1], p[2]) < 0.8);
    start.push(p);
  }
  const pos = new Float32Array(n * 3);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  const mat = new PointsMaterial({ color: new Color('#c9b49a').multiplyScalar(1.3), size: 0.07, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false });
  const pts = new Points(geo, mat);
  root.add(pts);
  disposers.push(() => { geo.dispose(); mat.dispose(); });
  // a few real debris models among the points
  const big = new Group();
  root.add(big);
  const models: { o: Group; p: Vec }[] = [];
  void Promise.all([0, 1, 2, 3, 4, 5].map((i) => loadModel(`debris_${i}`))).then((ms) => {
    for (let i = 0; i < 18; i++) {
      const m = ms[i % 6]; if (!m) continue;
      const c = m.clone(true);
      c.scale.multiplyScalar(0.18 + r() * 0.12);
      c.rotation.set(r() * 6, r() * 6, r() * 6);
      const holder = new Group(); holder.add(c); big.add(holder);
      models.push({ o: holder, p: start[(i * 37) % n] });
    }
    field.set(field.M);
  });
  const lines = new Group();
  root.add(lines);
  if (o.lines) for (const d of LINES) {
    const L = new InfLine(g.stage, [0, 0, 0], normalize(d) as V3, { color: C.violet, width: 2, opacity: 0.6, length: 9 });
    disposers.push(() => L.dispose());
    lines.add(L.object);
  }
  const cutter = makeCutter(0.09);
  cutter.position.set(VELL_CUTTER[0], VELL_CUTTER[1], VELL_CUTTER[2]);
  cutter.visible = o.cutter !== false;
  root.add(cutter);
  offs.push(g.stage.tick((_dt, t) => cutter.traverse((q) => { if (q.userData.blink) (q as Sprite).material.opacity = Math.sin(t * 5) > 0.6 ? 0.95 : 0.15; })));
  const field: Field = {
    root, alive, start, lines, cutter, M: identity(3),
    tick: (f) => { offs.push(g.stage.tick(f)); },
    set(M: Mat) {
      field.M = M;
      for (let i = 0; i < n; i++) { const q = matVec(M, start[i]); pos[3 * i] = q[0]; pos[3 * i + 1] = q[1]; pos[3 * i + 2] = q[2]; }
      geo.attributes.position.needsUpdate = true;
      for (const m of models) { const q = matVec(M, m.p); m.o.position.set(q[0], q[1], q[2]); }
    },
    async pulse(ms: number, P: Mat = V) {
      const M0 = field.M;
      await animate(ms, (k) => field.set(matMul(mlerp(identity(3), P, k), M0)), ease.inOut);
      field.set(matMul(P, M0));
    },
    cutterAt(p) { cutter.position.set(p[0], p[1], p[2]); },
  };
  field.set(identity(3));
  return field;
}

/** Camera on a slow orbit about a point (z up); stops when the set leaves the world. */
export function orbit(g: Game, f: { tick(fn: (dt: number) => void): void }, target: V3, dist: number, elev: number, az0: number, degPerSec: number): void {
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
  f.tick((dt) => { if (g.stage.controls) return; az += dt * degPerSec; place(); });
}

/** Scene staging: the holotable field, Vell's lines lit, the camera drifting. */
export async function fieldShot(g: Game): Promise<void> {
  const f = await fieldSet(g, { lines: true });
  if (!f.alive()) return;
  orbit(g, f, [0, 0, 0], 17, 26, -60, 2.2);
}

// ------------------------------------------------------------------ Chapter 18 · cold open

export async function coldOpen(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('explore');
    const { set, cutter } = await exteriorSet(g);
    let t = 0;
    set.tick((dt) => { t += dt; if (g.stage.controls) return; const a = -2.6 + t * 0.02; g.stage.camera.position.set(-70 + 60 * Math.cos(a), 46 + 60 * Math.sin(a), 18); g.stage.camera.up.set(0, 0, 1); g.stage.camera.lookAt(cutter.position.x * 0.6 - 20, cutter.position.y * 0.6 + 10, 0); });
    g.stage.disposeControls();
    g.stage.mode = '3d';
    void fadeBlack(g, false, 1400);
    await letterbox(g, true, 500);
    await titleCard(g, 'Chapter 18', 'Which vectors stay on their line?', 3000);
    check(set);
    // Vell's plan, shown on the holotable: his matrix applied once to the debris field
    await fadeBlack(g, true, 500);
    g.stage.clearWorld();
    const f = await fieldSet(g, { cutter: true });
    orbit(g, f, [0, 0, 0], 16, 24, -70, 2.5);
    void fadeBlack(g, false, 700);
    await g.say(S.open.slice(0, 1), {
      onLine: async () => {
        await wait(900);
        if (!f.alive()) return;
        sfx.whoosh(1.6);
        void g.stage.shockwave([0, 0, 0], 1800, 0.5);
        await f.pulse(g.headless ? 10 : 2600);
      },
    });
    check(f);
    await g.say(S.open.slice(1));
    check(f);
    await letterbox(g, false, 400);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

// ------------------------------------------------------------------ the coda: the λ dial on C₂ (the star "0 is an eigenvalue")

export async function coda(g: Game): Promise<void> {
  const root = new Group();
  try {
    g.stage.clearWorld();
    g.stage.world.add(root);
    const offs: (() => void)[] = [];
    root.userData.dispose = () => offs.splice(0).forEach((f) => f());
    const alive = () => !!root.parent;
    const lat = new Lattice3D(g.stage, { extent: 1, opacity: 0.4, color: C.violet });
    root.add(lat.object);
    lat.object.userData.dispose = () => lat.dispose();
    const tagL = new Label('', [0, 0, 3.4], { className: 'a7-board' });
    root.add(tagL.object);
    tagL.object.userData.dispose = () => tagL.dispose();
    orbit(g, { tick: (fn) => offs.push(g.stage.tick(fn)) }, [0, 0, 0.3], 15, 24, -50, 3);
    await letterbox(g, true, 400);
    const shiftC2 = (l: number): Mat => C2.map((r, i) => r.map((x, j) => x - (i === j ? l : 0)));
    const show = (l: number) => { lat.set(shiftC2(l)); tagL.set(`λ = ${l.toFixed(2)} · det(C₂ − λI) = ${det(shiftC2(l)).toFixed(2)}`); };
    show(0.6);
    await g.say(S.coda.slice(0, 1));
    if (!alive()) return;
    await animate(g.headless ? 10 : 3200, (k) => show(0.6 * (1 - k)), ease.inOut);
    lat.set(C2);
    tagL.set('λ = 0 · det C₂ = 0');
    sfx.collapse();
    g.stage.flash(0.15, 400);
    const L = new InfLine(g.stage, [0, 0, 0], normalize([1, 1, -1]) as V3, { color: C.violet, width: 3, opacity: 0.95, length: 8 });
    L.object.userData.dispose = () => L.dispose();
    root.add(L.object);
    lightStar('eig0');
    g.toast('0 is an eigenvalue', 'Constellation · a star lights');
    sfx.star(2);
    await g.say(S.coda.slice(1));
    await letterbox(g, false, 300);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

// ------------------------------------------------------------------ why it matters: an arrow swings onto the dominant line

export async function whyVisual(g: Game): Promise<void> {
  g.stage.clearWorld();
  await g.stage.view2D({ center: [-2.4, 0.2], height: 9, ms: 0 });
  const grid = new Grid2D(g.stage, { main: 0.25, base: 0, axis: 0.5 });
  grid.mesh.userData.dispose = () => grid.dispose();
  const A: Mat = [[2, 1], [1, 2]];
  const line = new InfLine(g.stage, [0, 0, 0], [1, 1, 0], { color: C.violet, width: 2, opacity: 0.5, dashed: true });
  line.object.userData.dispose = () => line.dispose();
  const a = new Arrow([0, 0, 0.01], [2.8, -1.2, 0.01], { color: C.v, width: 0.05 });
  g.stage.world.add(grid.object, line.object, a.object);
  const root = grid.object;
  let x: Vec = normalize([2, -1.4]);
  void (async () => {
    for (let k = 0; k < 40 && root.parent; k++) {
      await wait(g.headless ? 2 : 700);
      if (!root.parent) return;
      const y = normalize(matVec(A, x));
      const x0 = x;
      await animate(g.headless ? 1 : 420, (s) => { const z = normalize([x0[0] + (y[0] - x0[0]) * s, x0[1] + (y[1] - x0[1]) * s]); a.setTo([z[0] * 3, z[1] * 3, 0.01]); }, ease.inOut);
      x = y;
      if (k % 6 === 5) { x = normalize([Math.cos(k), Math.sin(k) * 1.3 - 0.4]); a.setTo([x[0] * 3, x[1] * 3, 0.01]); }
    }
  })();
}

// ------------------------------------------------------------------ the line finder (install) and the story out

async function finderRun(): Promise<{ v: Vec; mine: boolean }> {
  const backup = lineFinder();
  if (!isPlayerFn('power_iteration')) return { v: backup, mine: false };
  try {
    const r = await Promise.race([pylib.call<number[]>('power_iteration', V, VELL_CUTTER, 60), new Promise<null>((res) => setTimeout(() => res(null), 8000))]);
    if (r && lineFinderOk(r)) return { v: r, mine: true };
  } catch { /* the backup runs */ }
  return { v: backup, mine: false };
}

export async function finder(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('explore');
    const f = await fieldSet(g, { lines: false });
    orbit(g, f, [1, 0.6, 0.6], 15, 24, -72, 2);
    void fadeBlack(g, false, 900);
    await letterbox(g, true, 500);
    const job = finderRun();
    await g.say(S.finderIntro);
    check(f);
    // the arrow from the Anchor towards the cutter, swinging pulse by pulse onto the gathering line
    const arrow = new Arrow([0, 0, 0], [0, 0, 0], { color: C.v, width: 0.07 });
    f.root.add(arrow.object);
    arrow.object.userData.dispose = () => arrow.dispose();
    let x = normalize(VELL_CUTTER);
    await arrow.moveTo([x[0] * 4.4, x[1] * 4.4, x[2] * 4.4] as V3, g.headless ? 1 : 700);
    for (let k = 0; k < 9 && f.alive(); k++) {
      const y = normalize(matVec(mpow(V, 1), x));
      const x0 = x;
      await animate(g.headless ? 1 : 520, (s) => { const z = normalize(x0.map((t, i) => t + (y[i] - t) * s)); arrow.setTo([z[0] * 4.4, z[1] * 4.4, z[2] * 4.4]); }, ease.inOut);
      sfx.tick(k);
      x = y;
    }
    check(f);
    const { v, mine } = await job;
    check(f);
    const L = new InfLine(g.stage, [0, 0, 0], v.map(Math.abs) as V3, { color: C.violet, width: 3, opacity: 0.95, length: 9 });
    L.object.userData.dispose = () => L.dispose();
    f.root.add(L.object);
    sfx.discover();
    const tg = new Label('$\\begin{bmatrix}1\\\\1\\\\1\\end{bmatrix}$', [4.6, 4.6, 4.6], { className: 'a7-tag vi' });
    tg.object.userData.dispose = () => tg.dispose();
    f.root.add(tg.object);
    await g.say(mine ? S.finderMine : S.finderBackup);
    check(f);
    await g.say(S.close, {
      onLine: (_l, i) => {
        if (i === 3 && pin('vell50', 'Where does everything end up after Vell’s matrix is applied fifty times?', 'c18')) { g.toast('Where does everything end up after Vell’s matrix is applied fifty times?', 'Case board'); sfx.discover(); }
      },
    });
    check(f);
    await letterbox(g, false, 400);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}
