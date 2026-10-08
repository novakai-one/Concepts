// Chapter 26 cinematics: the cold open (the Anchor, cracked by the 750× pulse, holds a record it cannot keep),
// the transmission (install: the record is projected onto two components by the player's pca, streamed to the
// Lantern, and the core goes dark; the other end sees the spiral), and the close: the act ends, Teo's voice
// clear, and Ilse's line hands over to the Epilogue.
import { Vector3, type Material, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import type { Game, V3 } from '../../../game/types';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { isPlayerFn, pylib } from '../../../game/build';
import { animate, wait } from '../../../core/tween';
import { C } from '../../../core/theme';
import { FatSegments } from '../../../gfx/lines';
import { CAST } from '../../cast';
import { AMPLIFY } from '../../truth';
import { arkSet, BRACE_LINES, crackAnchor, drift, Gone, inWorld, tag, type ArkSet } from '../c24-spectral/act9';
import { REC_N, crewPca, record } from './logic';
import { S } from './script';
import { worldCloud } from './world';

const ANCHOR_AT: V3 = [-150, 95, -18];
const ANCHOR_SCALE = 7;
const LANTERN_AT: V3 = [-127, 77, -13];
const MID: V3 = [-138, 86, -15];
const toward = (a: V3, b: V3): V3 => [b[0] - a[0], b[1] - a[1], b[2] - a[2]];

/** The Anchor with the Lantern on station beside it. */
function anchorSet(g: Game): Promise<ArkSet> {
  return arkSet(g, { stern: 'whole', anchor: { at: ANCHOR_AT, scale: ANCHOR_SCALE }, lantern: { at: LANTERN_AT, face: toward(LANTERN_AT, ANCHOR_AT), scale: 1.3 } });
}

/** Dim every glowing part of the Anchor (on its own copies of the materials, so other scenes keep theirs). */
function darken(g: Game, anchor: Object3D, ms: number, to = 0.04): Promise<void> {
  const mats: { m: MeshStandardMaterial; e0: number }[] = [];
  anchor.traverse((n) => {
    const mesh = n as Mesh;
    if (!mesh.isMesh) return;
    const swap = (m: Material) => {
      const c = m.clone();
      const sm = c as MeshStandardMaterial;
      if (sm.emissive) mats.push({ m: sm, e0: sm.emissiveIntensity });
      return c;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
  });
  return animate(g.headless ? 1 : ms, (k) => { for (const { m, e0 } of mats) m.emissiveIntensity = e0 * (1 - (1 - to) * k); });
}

export async function coldOpen(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('tension');
    const set = await anchorSet(g);
    if (set.anchor) crackAnchor(g, set.anchor, { radius: 0.62 * ANCHOR_SCALE, count: 9 });
    drift(g, set, MID, 62, 13, -128, 1.2);
    void fadeBlack(g, false, 1600);
    await letterbox(g, true, 600);
    void titleCard(g, 'Chapter 26', 'What should we keep?', 3600);
    void stamp(g, `The Anchor · cracked by the ${Math.round(AMPLIFY)}× pulse`, 4200);
    await g.say(S.open.slice(0, 2));
    set.check();
    await g.say(S.open.slice(2));
    set.check();
    await letterbox(g, false, 400);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

// ------------------------------------------------------------------ the transmission (install)

/** The record projected onto two components: the player's pca if it is written and agrees, else the crew's. */
async function transmit(): Promise<{ Y: number[][]; mine: boolean }> {
  const X = record().X;
  const backup = crewPca(X, 2);
  if (!isPlayerFn('pca')) return { Y: backup, mine: false };
  try {
    const r = await Promise.race([pylib.map<number[][]>('pca', [[X, 2]]), new Promise<null>((res) => setTimeout(() => res(null), 60000))]);
    const Y = r?.who === 'yours' ? r.values[0] : null;
    if (Y && Y.length === X.length && Y.every((row, i) => row.length === 2 && Math.abs(row[0] - backup[i][0]) < 1e-6 && Math.abs(row[1] - backup[i][1]) < 1e-6)) return { Y, mine: true };
  } catch { /* the backup runs */ }
  return { Y: backup, mine: false };
}

/** Packets streaming from the Anchor's core to the Lantern. Returns a stop that fades them out. */
function stream(g: Game, set: ArkSet): (ms: number) => Promise<void> {
  const N = 160;
  const a = new Vector3(...ANCHOR_AT), b = new Vector3(...LANTERN_AT);
  const side = new Vector3().subVectors(b, a).cross(new Vector3(0, 0, 1)).normalize();
  const jitter = Array.from({ length: N }, (_, i) => [Math.sin(i * 12.9898) * 0.9, Math.cos(i * 78.233) * 0.9]);
  const at = (t: number, i: number): number[] => {
    const p = new Vector3().lerpVectors(a, b, t);
    const w = Math.sin(Math.PI * t);
    p.addScaledVector(side, jitter[i][0] * w).add(new Vector3(0, 0, jitter[i][1] * w));
    return [p.x, p.y, p.z];
  };
  const cloud = worldCloud(g, { points: Array.from({ length: N }, (_, i) => at(i / N, i)), color: C.accent, size: 0.32, glow: 0.3, core: 1.6, opacity: 0.85 }, set.root);
  let clock = 0, level = 1;
  set.tick((dt) => {
    clock += dt * 0.45;
    cloud.set(Array.from({ length: N }, (_, i) => at((i / N + clock) % 1, i)));
    cloud.setOpacity(0.85 * level);
  });
  return async (ms) => { await animate(g.headless ? 1 : ms, (k) => { level = 1 - k; }); };
}

export async function send(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('tension');
    const set = await anchorSet(g);
    const cracks = set.anchor ? crackAnchor(g, set.anchor, { radius: 0.62 * ANCHOR_SCALE, count: 9 }) : null;
    const stopDrift = drift(g, set, MID, 58, 12, -112, 1.1);
    void fadeBlack(g, false, 900);
    await letterbox(g, true, 500);
    const job = transmit();
    await g.say(S.sendIntro);
    set.check();
    const { Y, mine } = await job;
    set.check();
    const fadeStream = stream(g, set);
    sfx.discover();
    await g.say(mine ? S.sendMine : S.sendBackup);
    set.check();
    await wait(g.headless ? 1 : 2600);
    set.check();
    // the core goes dark
    sfx.alarm();
    await Promise.all([fadeStream(1600), cracks ? cracks.fade(2000) : Promise.resolve(), set.anchor ? darken(g, set.anchor, 2400) : Promise.resolve()]);
    set.check();
    stopDrift();
    g.mood('void');
    await g.say(S.sendOut.slice(0, 1));
    set.check();
    // what the other end sees: every entry as two numbers
    await fadeBlack(g, true, g.headless ? 1 : 500);
    set.check();
    g.stage.clearWorld();
    await g.stage.view2D({ center: [0, 0], height: 8.4, ms: 0 });
    const rec = record();
    const m = Math.max(...Y.map((q) => Math.max(Math.abs(q[0]), Math.abs(q[1])))) || 1;
    const k = 3.3 / m;
    const pts = Y.map((q) => [q[0] * k, q[1] * k, 0]);
    const cloud = worldCloud(g, { points: pts, color: C.accent, size: 0.02, glow: 0.25, core: 1.2, opacity: 0.8 });
    const live = () => !!cloud.object.parent;
    const pp = rec.path.map((i) => pts[i] as V3);
    worldCloud(g, { points: pp, color: C.result, size: 0.05, glow: 0.5, core: 1.6 });
    const segs: [V3, V3][] = [];
    for (let i = 1; i < pp.length; i++) segs.push([[pp[i - 1][0], pp[i - 1][1], 0.03], [pp[i][0], pp[i][1], 0.03]]);
    const pathLine = inWorld(g, new FatSegments(g.stage, [[[0, 0, 0], [0, 0, 0]]], { color: C.result, width: 3, opacity: 0.9 }));
    pathLine.setSegments(segs);
    pathLine.object.traverse((o) => { o.renderOrder = 6; o.frustumCulled = false; });   // over the dense arms
    inWorld(g, tag(`Received · ${REC_N.toLocaleString('en-GB')} entries, two numbers each`, [0, 3.6, 0], 'c'));
    await fadeBlack(g, false, g.headless ? 1 : 700);
    if (!live()) return;
    await g.say(S.sendOut.slice(1));
    if (!live()) return;
    await letterbox(g, false, 400);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

// ------------------------------------------------------------------ the close: the end of Act IX

export async function close(g: Game): Promise<void> {
  const teo = CAST.teo;
  const noise = teo.noise;
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('explore');
    const set = await arkSet(g, { stern: 'whole', anchor: { at: ANCHOR_AT, scale: ANCHOR_SCALE }, lantern: { at: [-34, -26, 7], face: [0.4, 1, 0], scale: 1.3 } });
    set.braces(BRACE_LINES, { opacity: 0.35 });
    if (set.anchor) await darken(g, set.anchor, 0);
    drift(g, set, [-40, 20, -4], 128, 15, -128, 0.9);
    void fadeBlack(g, false, 1400);
    await letterbox(g, true, 600);
    // the stern is whole: Teo's voice comes through every layer of his channel
    teo.noise = 0.08;
    await g.say(S.close.slice(0, 2));
    teo.noise = noise;
    set.check();
    await g.say(S.close.slice(2));
    set.check();
    await wait(g.headless ? 1 : 900);
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; } finally { teo.noise = noise; }
}
