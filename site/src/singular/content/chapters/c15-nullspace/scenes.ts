// Act V staging (shared with Chapter 16): the Meridian with its stern folded flat by the real Collapse
// pulse C (applied to the stern's own vertices), the Anchor, the Lantern, Vell's cutter, the debris
// pile at the origin, and LANTERN's scan room. Chapter 15's cinematics are at the bottom.
import {
  Box3, BoxGeometry, ConeGeometry, DirectionalLight, DoubleSide, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3, type Object3D, type Sprite,
} from 'three';
import type { Game, V3 } from '../../../game/types';
import { loadModel, type Ship } from '../../../gfx/models';
import { glowSprite } from '../../../gfx/markers';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { music } from '../../../audio/music';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { h, inline } from '../../../ui/ui';
import { isPlayerFn, pylib } from '../../../game/build';
import { rng } from '../../../game/lawcheck';
import { makeAnchor, makeLantern } from '../../common/set';
import { C as COLLAPSE, C2 } from '../../truth';
import { ballStarts, crew, parallel, NULL_DIR } from './logic';
import { LandCloud, Room, VIOLET } from './space';
import { S } from './script';

/** Thrown when the player leaves a cinematic part-way: stop quietly. */
export class Gone extends Error {}

export interface ActSet {
  root: Group;
  ark: Group | null;
  lantern: Ship | null;
  anchor: Group | null;
  alive(): boolean;
  check(): void;
  tick(fn: (dt: number, t: number) => void): void;
}

const STAR: V3 = [-0.6, -0.7, 0.25];

/** A Matrix4 from a 3 × 3 matrix, acting about a centre point. */
function about(M: number[][], c: V3): Matrix4 {
  const m = new Matrix4().set(M[0][0], M[0][1], M[0][2], 0, M[1][0], M[1][1], M[1][2], 0, M[2][0], M[2][1], M[2][2], 0, 0, 0, 0, 1);
  return new Matrix4().makeTranslation(c[0], c[1], c[2]).multiply(m).multiply(new Matrix4().makeTranslation(-c[0], -c[1], -c[2]));
}

/** Point an object's +x (its nose) from where it is toward a target. */
export function aimAt(o: Object3D, target: V3): void {
  const d = new Vector3(...target).sub(o.position).normalize();
  o.quaternion.setFromUnitVectors(new Vector3(1, 0, 0), d);
}

/** Length of the cutter at scale 1 (the old wedge's, x −3.5..6.7), so every caller's scale frames it the same. */
const CUTTER_LEN = 10.2;

/**
 * Vell's cutter (tools/singular/blender/cutter.py), nose along +x, with blinking white running lights
 * (`userData.blink` sprites) and engine glows. Returns at once with a dark wedge as the fallback; the
 * model replaces it when it loads (`userData.ready` resolves then).
 */
export function makeCutter(scale = 1): Group {
  const g = new Group();
  const hull = new MeshStandardMaterial({ color: '#2b313d', metalness: 0.75, roughness: 0.32 });
  const trim = new MeshStandardMaterial({ color: '#4a5263', metalness: 0.6, roughness: 0.4 });
  const body = new Mesh(new BoxGeometry(7, 1.6, 0.9), hull);
  const nose = new Mesh(new ConeGeometry(0.95, 3.2, 4), hull);
  nose.rotation.z = -Math.PI / 2; nose.rotation.x = Math.PI / 4; nose.position.set(5.1, 0, 0); nose.scale.set(1, 1, 0.6);
  const spine = new Mesh(new BoxGeometry(5.2, 0.5, 0.5), trim); spine.position.set(-0.6, 0, 0.62);
  const finL = new Mesh(new BoxGeometry(2.6, 2.6, 0.12), trim); finL.position.set(-2.2, 1.6, 0); finL.rotation.z = 0.35;
  const finR = finL.clone(); finR.position.y = -1.6; finR.rotation.z = -0.35;
  const fallback = [body, nose, spine, finL, finR];
  g.add(...fallback);
  const glows = [-0.45, 0.45].map((y) => { const e = glowSprite('#cfe3ff', 1.6, 0.85); e.position.set(-3.7, y, 0); g.add(e); return e; });
  const lights = [2.7, -2.7].map((y) => { const l = glowSprite('#ffffff', 0.7, 0.9); l.position.set(-2.6, y, 0.1); l.userData.blink = true; g.add(l); return l; });
  g.scale.setScalar(scale);
  let gone = false;
  g.userData.dispose = () => { gone = true; hull.dispose(); trim.dispose(); };
  g.userData.ready = loadModel('cutter').then((m) => {
    if (!m || gone) return;
    m.rotation.x = Math.PI / 2; // glTF Y-up -> stage Z-up, nose stays +x
    m.scale.setScalar(CUTTER_LEN / new Box3().setFromObject(m).getSize(new Vector3()).x);
    g.add(m);
    fallback.forEach((f) => { f.visible = false; });
    // move the sprites onto the model's own nodes: running lights at the wing tips, a glow per bell
    g.updateMatrixWorld(true);
    const at = (n: Object3D) => g.worldToLocal(n.getWorldPosition(new Vector3()));
    const lightNodes = [m.getObjectByName('light_l'), m.getObjectByName('light_r')];
    lightNodes.forEach((n, i) => { if (n) lights[i].position.copy(at(n)); });
    const nozzles: Object3D[] = [];
    m.traverse((n) => { if (/^nozzle_\d+$/.test(n.name)) nozzles.push(n); });
    nozzles.sort((a, b) => a.name.localeCompare(b.name));
    nozzles.forEach((n, i) => {
      const e = glows[i] ?? glowSprite('#cfe3ff', 1.6, 0.85);
      if (!e.parent) { g.add(e); glows.push(e); }
      e.position.copy(at(n)).add(new Vector3(-0.12, 0, 0));
      e.scale.setScalar(1.5 * (n.parent?.scale.x ?? 1)); // the side bells are smaller
    });
    if (nozzles.length) glows.slice(nozzles.length).forEach((e) => { e.visible = false; });
  });
  return g;
}

export interface ActSetOpts {
  ark?: { at: V3; scale?: number; flat?: boolean } | null;
  anchor?: { at: V3; scale?: number } | null;
  lantern?: { at: V3; face: V3; scale?: number } | null;
  starLight?: number;
}

/** The Act V exterior: the ark (its stern folded flat), the Anchor, the Lantern, a low star. */
export async function actSet(g: Game, o: ActSetOpts = {}): Promise<ActSet> {
  const root = new Group();
  root.name = 'act5-set';
  g.stage.world.add(root);
  const offs: (() => void)[] = [];
  root.userData.dispose = () => { offs.splice(0).forEach((f) => f()); };
  const alive = () => !!root.parent;
  const set: ActSet = {
    root, ark: null, lantern: null, anchor: null, alive,
    check: () => { if (!alive()) throw new Gone(); },
    // a set already cleared (the player moved on while a model loaded) takes no new per-frame work
    tick: (fn) => { if (alive()) offs.push(g.stage.tick(fn)); },
  };
  const sd = new Vector3(...STAR).normalize();
  const star = new DirectionalLight('#ffd9b0', o.starLight ?? 2.4);
  star.position.copy(sd.clone().multiplyScalar(100));
  root.add(star, star.target);
  const glow = glowSprite('#ffd2a1', 150, 0.8);
  glow.position.copy(sd.clone().multiplyScalar(900));
  root.add(glow);
  if (o.ark !== null) {
    const a = o.ark ?? { at: [0, 0, 0] };
    const ark = new Group();
    ark.position.set(...a.at);
    root.add(ark);
    const model = await loadModel('meridian');
    if (model) {
      model.rotation.x = Math.PI / 2;
      model.scale.setScalar(a.scale ?? 1);
      if (a.flat !== false) {
        // the real Collapse pulse C on the stern's own vertices, about the stern's centre
        const M = about(COLLAPSE, [-21, 0, 0]);
        // the folded stern is 1/750 thick: one double-sided hull material, so its near-coplanar faces read as one sheet
        const sheet = new MeshStandardMaterial({ color: '#59606d', metalness: 0.7, roughness: 0.38, side: DoubleSide, emissive: '#1a1d24', emissiveIntensity: 0.6 });
        model.traverse((n) => {
          if (n.name !== 'aft' && n.name !== 'truss_aft') return;
          n.updateMatrix();
          n.matrixAutoUpdate = false;
          n.matrix.premultiply(M);
          n.matrixWorldNeedsUpdate = true;
          n.traverse((m) => { if ((m as Mesh).isMesh) (m as Mesh).material = sheet; });
        });
        ark.userData.dispose = () => sheet.dispose();
      }
      ark.add(model);
    }
    set.ark = ark;
  }
  if (o.anchor !== null) {
    const an = o.anchor ?? { at: [-140, 70, -12] };
    const anchor = await makeAnchor(g.stage, an.scale ?? 6, root);
    anchor.position.set(...an.at);
    set.anchor = anchor;
  }
  if (o.lantern) {
    const ship = makeLantern(g.stage, o.lantern.scale ?? 1.6);
    root.add(ship.object);
    ship.object.position.set(...o.lantern.at);
    ship.face(o.lantern.face);
    ship.setThrust(0.15);
    set.lantern = ship;
  }
  return set;
}

/** Move the camera (z up) to look at a point from a place. */
export async function camTo(g: Game, set: ActSet, pos: V3, look: V3, ms: number): Promise<void> {
  g.stage.disposeControls();
  g.stage.mode = '3d';
  if (!set.alive()) return;
  await g.stage.moveCamera(new Vector3(...pos), new Vector3(...look), new Vector3(0, 0, 1), ms);
}

/** LANTERN's scan room: the lattice of test buoys and the debris line around the origin. */
export interface ScanSet { set: ActSet; room: Room; buoys: LandCloud; debris: Object3D[]; pile: Sprite; starts: V3[] }

export const DEBRIS_TS: number[] = Array.from({ length: 41 }, (_, i) => -2.4 + (4.8 * i) / 40);

export async function scanSet(g: Game, o: { buoys?: number; flat?: boolean } = {}): Promise<ScanSet> {
  const set = await actSet(g, { ark: null, anchor: null });
  const room = new Room(g, { extent: 3, floor: true });
  const starts = ballStarts(o.buoys ?? 1400);
  const buoys = new LandCloud(g, room, starts, { size: 0.03 });
  set.root.add(buoys.object);
  if (o.flat) buoys.setMatrix(C2);
  // the debris: pieces spread along the line through (1, 1, −1)
  const debris: Object3D[] = [];
  const R = rng(1541);
  const proto = await Promise.all([0, 1, 2, 3, 4, 5].map((i) => loadModel(`debris_${i}`)));
  DEBRIS_TS.forEach((t, i) => {
    const m = proto[i % 6]?.clone(true) ?? new Mesh(new BoxGeometry(0.2, 0.14, 0.1), new MeshStandardMaterial({ color: '#6b7488' }));
    m.scale.multiplyScalar(0.11 + R() * 0.05);
    m.rotation.set(R() * 6, R() * 6, R() * 6);
    const p = o.flat ? [0, 0, 0] : NULL_DIR.map((x) => x * t);
    m.position.set(p[0], p[1], p[2]);
    m.userData.t = t;
    m.userData.jit = [R() - 0.5, R() - 0.5, R() - 0.5].map((x) => x * 0.34);
    if (o.flat) m.position.set(m.userData.jit[0], m.userData.jit[1], m.userData.jit[2]);
    set.root.add(m);
    debris.push(m);
  });
  const pile = glowSprite(VIOLET, 1.6, o.flat ? 0.75 : 0);
  set.root.add(pile);
  return { set, room, buoys, debris, pile, starts };
}

/** Send the scan's buoys and debris through the two-decimal model (honest: I → C₂ in a straight line). */
export async function fireScan(sc: ScanSet, ms = 2600): Promise<void> {
  const start = sc.debris.map((m) => m.position.clone());
  sfx.collapse();
  await Promise.all([
    sc.buoys.to(C2, ms),
    animate(ms, (k) => {
      const M = C2.map((r, i) => r.map((x, j) => (i === j ? 1 : 0) + (x - (i === j ? 1 : 0)) * k));
      sc.debris.forEach((m, i) => {
        const s = start[i];
        const p = [0, 1, 2].map((r) => M[r][0] * s.x + M[r][1] * s.y + M[r][2] * s.z);
        const j = m.userData.jit as number[];
        m.position.set(p[0] + j[0] * k, p[1] + j[1] * k, p[2] + j[2] * k);
      });
      sc.pile.material.opacity = 0.75 * ease.inOut(Math.max(0, (k - 0.6) / 0.4));
    }, ease.inOut),
  ]);
}

// ------------------------------------------------------------------ Chapter 15 cinematics

export async function coldOpen(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('void');
    const set = await actSet(g, {
      ark: { at: [0, 0, 0] }, anchor: { at: [-150, 95, -18], scale: 7 },
      lantern: { at: [-24, -46, 6], face: [0.4, 0.9, -0.05], scale: 1.6 },
    });
    set.check();
    await camTo(g, set, [-74, -62, 16], [-18, 0, 2], 0);
    void fadeBlack(g, false, 1800);
    await letterbox(g, true, 700);
    set.check();
    void titleCard(g, 'Act V', 'Collapse', 3600);
    void stamp(g, 'Beside the stern of the *Meridian* · after the Collapse', 4600);
    void camTo(g, set, [-58, -52, 10], [-22, 0, 0], 9000);
    await wait(1800);
    set.check();
    await g.say(S.open.slice(0, 1));
    set.check();
    // cut to LANTERN's scan
    await fadeBlack(g, true, 500);
    g.stage.clearWorld();
    const sc = await scanSet(g, { buoys: 1400 });
    sc.set.check();
    let az = -62;
    sc.set.tick((dt) => { az += dt * 2.5; const a = (az * Math.PI) / 180, r = 13, e = 0.36; g.stage.camera.position.set(r * Math.cos(e) * Math.cos(a), r * Math.cos(e) * Math.sin(a), r * Math.sin(e) + 0.5); g.stage.camera.up.set(0, 0, 1); g.stage.camera.lookAt(0, 0, 0.4); });
    g.stage.disposeControls();
    g.stage.mode = '3d';
    await fadeBlack(g, false, 700);
    let fired: Promise<void> | null = null;
    await g.say(S.open.slice(1, 5), {
      onLine: (_l, i) => { if (i === 2 && !fired) fired = fireScan(sc, 2600); },
    });
    sc.set.check();
    if (!fired) fired = fireScan(sc, 600);
    await fired;
    sc.set.check();
    await g.say(S.open.slice(5));
    sc.set.check();
    await titleCard(g, 'Chapter 15', 'Where can anything land, and what went to zero?', 3000);
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

/** Scene staging: the debris pile at the origin in LANTERN's scan, the line it came from drawn faintly. */
export async function pileShot(g: Game): Promise<void> {
  const sc = await scanSet(g, { buoys: 900, flat: true });
  let az = -40;
  sc.set.tick((dt) => { az += dt * 3; const a = (az * Math.PI) / 180, r = 7.5, e = 0.3; g.stage.camera.position.set(r * Math.cos(e) * Math.cos(a), r * Math.cos(e) * Math.sin(a), r * Math.sin(e) + 0.3); g.stage.camera.up.set(0, 0, 1); g.stage.camera.lookAt(0, 0, 0); });
  g.stage.disposeControls();
  g.stage.mode = '3d';
}

/** Scene staging: the stern sheet from close by, the Lantern holding station. */
export async function sternShot(g: Game): Promise<void> {
  const set = await actSet(g, { ark: { at: [0, 0, 0] }, anchor: { at: [-150, 95, -18], scale: 7 }, lantern: { at: [-30, -24, 5], face: [0.3, 1, 0], scale: 1.4 } });
  let t = 0;
  set.tick((dt) => { t += dt; const a = -1.95 + t * 0.015; g.stage.camera.position.set(-14 + 70 * Math.cos(a), 70 * Math.sin(a), 16 + Math.sin(t * 0.1) * 1.5); g.stage.camera.up.set(0, 0, 1); g.stage.camera.lookAt(-14, 0, 0); });
  g.stage.disposeControls();
  g.stage.mode = '3d';
}

/** The sorter: which null space arrow did it use, and was it the player's? */
async function sorterArrow(): Promise<{ mine: boolean; dir: number[] }> {
  const backup = crew.null_space(C2)[0];
  if (!isPlayerFn('null_space')) return { mine: false, dir: backup };
  try {
    const r = await Promise.race([pylib.call<number[][]>('null_space', C2), new Promise<null>((res) => setTimeout(() => res(null), 8000))]);
    if (r && r.length === 1 && parallel(r[0], backup, 1e-6)) return { mine: true, dir: r[0] };
  } catch { /* fall back */ }
  return { mine: false, dir: backup };
}

export async function close(g: Game): Promise<void> {
  try {
    g.stage.clearWorld();
    g.mood('void');
    // the sorter, in the scan
    const sc = await scanSet(g, { buoys: 700 });
    sc.set.check();
    let az = -70;
    sc.set.tick((dt) => { az += dt * 2; const a = (az * Math.PI) / 180, r = 11, e = 0.32; g.stage.camera.position.set(r * Math.cos(e) * Math.cos(a), r * Math.cos(e) * Math.sin(a), r * Math.sin(e) + 0.4); g.stage.camera.up.set(0, 0, 1); g.stage.camera.lookAt(0, 0, 0.3); });
    g.stage.disposeControls();
    g.stage.mode = '3d';
    await letterbox(g, true, 500);
    const job = sorterArrow();
    const panel = h('div', { class: 'glass act5-panel' }, h('div', { class: 'kicker' }, 'Debris sorter'));
    const lineEl = (t: string) => h('div', { class: 'line', html: inline(t) });
    const runOn = lineEl('Starting…');
    panel.append(runOn);
    g.ui.scene.appendChild(panel);
    const { mine, dir } = await job;
    sc.set.check();
    runOn.innerHTML = inline(mine ? 'Running on: **your** `null_space`' : 'Running on: LANTERN backup');
    // light the pieces whose starts lie on the null space line, one by one, then fire
    let onLine = 0;
    for (const m of sc.debris) {
      const t = m.userData.t as number;
      const s = NULL_DIR.map((x) => x * t);
      if (Math.abs(t) < 1e-9 || parallel(s, dir, 1e-6)) onLine++;
    }
    const count = lineEl(`Pieces that started on the line through ${'$(1, 1, -1)$'}: **0**`);
    panel.append(count);
    const tagged = sc.debris.map((m) => { const s = glowSprite(VIOLET, 0.45, 0); m.add(s); s.scale.divideScalar(m.scale.x); return s; });
    await animate(1800, (k) => {
      const n = Math.round(k * onLine);
      tagged.forEach((s, i) => { s.material.opacity = i < n ? 0.9 : 0; });
      count.innerHTML = inline(`Pieces that started on the line through $(1, 1, -1)$: **${n}**`);
    }, ease.linear);
    sc.set.check();
    await fireScan(sc, 1800);
    sc.set.check();
    panel.append(lineEl(`Landed on the origin: **${onLine}** of ${sc.debris.length}`));
    sfx.success();
    await g.say([...(mine ? S.closeMine : S.closeBackup), ...S.close]);
    sc.set.check();
    panel.remove();
    // Vell
    await fadeBlack(g, true, 600);
    g.stage.clearWorld();
    const set = await actSet(g, { ark: { at: [0, 0, 0] }, anchor: { at: [-150, 95, -18], scale: 7 }, lantern: { at: [-26, -34, 5], face: [0.2, 1, 0], scale: 1.5 } });
    set.check();
    const cutter = makeCutter(1.5);
    const from: V3 = [-215, 45, 32], to: V3 = [-112, 12, 14];
    cutter.position.set(...from);
    aimAt(cutter, [-20, 0, 0]);
    set.root.add(cutter);
    set.tick((_dt, t) => cutter.traverse((n) => { if (n.userData.blink) (n as Sprite).material.opacity = (Math.sin(t * 5) > 0.6 ? 0.95 : 0.15); }));
    await camTo(g, set, [-30, -104, 20], [-70, 0, 8], 0);
    await fadeBlack(g, false, 900);
    music.setIntensity(0.2);
    const arrive = animate(9000, (k) => { cutter.position.set(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, from[2] + (to[2] - from[2]) * k); }, ease.out);
    void camTo(g, set, [-20, -118, 22], [-66, 0, 8], 9000);
    await g.say(S.vell.slice(0, 2));
    set.check();
    await arrive;
    await g.say(S.vell.slice(2));
    set.check();
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

