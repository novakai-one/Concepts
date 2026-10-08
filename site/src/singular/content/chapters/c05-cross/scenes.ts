// Chapter 5 staging: the cold open (the ark tumbling, half its hull rendering dark) and the story-out
// install (hull lighting: every hull triangle of the Meridian gets its normal from its corners, then is
// turned to face out with a dot product, in one sweep from bow to stern).
import {
  AdditiveBlending, BufferAttribute, Color, DoubleSide, Matrix3, Matrix4, Mesh, MeshBasicMaterial, RingGeometry, Vector3,
  type BufferGeometry, type Group, type Material, type MeshStandardMaterial, type Object3D,
} from 'three';
import type { Game, V3 } from '../../../game/types';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { h, inline } from '../../../ui/ui';
import { pylib } from '../../../game/build';
import { rng } from '../../../game/lawcheck';
import { CamRig, STAR_DIR, arkSet, type ArkOpts, type ArkSet } from '../c04-dot/ark';
import { crew } from './logic';
import { S } from './script';

class Gone extends Error {}
const check = (set: ArkSet) => { if (!set.alive()) throw new Gone(); };

/** Where the Lantern meets the ark in Chapter 5 (the ark tumbles about a tilted axis). */
export const TUMBLE: V3 = [0.25, 0.35, 1];
/** The ark's tumble rate in degrees per second: 360 / 1.5 = 240 s, one turn every four minutes (S.open). */
export const TUMBLE_DPS = 1.5;
export const ARK_OPTS: ArkOpts = {
  at: [0, 0, 0], spine: [1, 0.1, 0.05], shear: 0.16, debris: 8, starLight: 2.8,
  tumble: { axis: TUMBLE, dps: TUMBLE_DPS },
  lantern: { at: [-30, -40, 6], face: [0.6, 0.8, -0.1], scale: 1.3, thrust: 0.25 },
};

// ------------------------------------------------------------------ the hull's normals

interface HullMesh { geo: BufferGeometry; normals: Float32Array; pos: Float32Array; colors: Float32Array; toWorld: Matrix3; order: number[]; x: Float32Array; done: number; out: number; faceN: Float32Array | null }

/**
 * Prepare every mesh of the ark for the hull-lighting bake. The corrupted record: in half of the
 * panels (runs of 40 triangles) every vertex normal points into the hull, so those panels render dark
 * (their baked light term starts low). `out` counts the faces whose normals already face out.
 */
export function corruptHull(model: Object3D, ark: Group): { meshes: HullMesh[]; total: number } {
  const meshes: HullMesh[] = [];
  const r = rng(505);
  ark.updateWorldMatrix(true, true);
  const toArk = new Matrix4().copy(ark.matrixWorld).invert();
  let total = 0;
  model.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()) as BufferGeometry;
    if (!geo.getAttribute('normal')) geo.computeVertexNormals();
    m.geometry = geo;
    // a baked light term per vertex (1 until the bake): the material multiplies its colour by it
    const colors = new Float32Array(geo.getAttribute('position').count * 3).fill(1);
    geo.setAttribute('color', new BufferAttribute(colors, 3));
    const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((mt: Material) => { const c = mt.clone() as MeshStandardMaterial; c.vertexColors = true; return c; });
    m.material = Array.isArray(m.material) ? mats : mats[0];
    const nAttr = geo.getAttribute('normal') as BufferAttribute;
    const pAttr = geo.getAttribute('position') as BufferAttribute;
    const normals = nAttr.array as Float32Array;
    const pos = pAttr.array as Float32Array;
    const faces = pAttr.count / 3;
    total += faces;
    const M = new Matrix4().multiplyMatrices(toArk, m.matrixWorld);
    const x = new Float32Array(faces);
    const v = new Vector3();
    for (let f = 0; f < faces; f++) {
      v.set((pos[f * 9] + pos[f * 9 + 3] + pos[f * 9 + 6]) / 3, (pos[f * 9 + 1] + pos[f * 9 + 4] + pos[f * 9 + 7]) / 3, (pos[f * 9 + 2] + pos[f * 9 + 5] + pos[f * 9 + 8]) / 3).applyMatrix4(M);
      x[f] = v.x;
    }
    // flip half of the panels
    const panels = Math.ceil(faces / 40);
    const flip = Array.from({ length: panels }, () => r() < 0.5);
    for (let f = 0; f < faces; f++) if (flip[Math.floor(f / 40)]) for (let k = 0; k < 9; k++) normals[f * 9 + k] *= -1;
    nAttr.needsUpdate = true;
    // which faces already face out: every vertex normal agrees with the corner-order normal
    let out = 0;
    for (let f = 0; f < faces; f++) {
      const nf = windingNormal(pos, f * 9);
      let ok = true;
      for (let k = 0; k < 3; k++) {
        const q = f * 9 + k * 3;
        if (normals[q] * nf[0] + normals[q + 1] * nf[1] + normals[q + 2] * nf[2] < 0) { ok = false; colors[q] = 0.16; colors[q + 1] = 0.17; colors[q + 2] = 0.2; }
      }
      if (ok) out++;
    }
    const order = Array.from({ length: faces }, (_, f) => f).sort((a, b) => x[b] - x[a]);
    const toWorld = new Matrix3().getNormalMatrix(m.matrixWorld);
    meshes.push({ geo, normals, pos, colors, toWorld, order, x, done: 0, out, faceN: null });
  });
  return { meshes, total };
}

/** (B − A) × (C − A) for the face whose corners start at `o` (LANTERN's own check, before any bake). */
function windingNormal(p: Float32Array, o: number): number[] {
  const ux = p[o + 3] - p[o], uy = p[o + 4] - p[o + 1], uz = p[o + 5] - p[o + 2];
  const vx = p[o + 6] - p[o], vy = p[o + 7] - p[o + 1], vz = p[o + 8] - p[o + 2];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}

const LIGHT = new Vector3(...STAR_DIR).normalize();
const tmp = new Vector3();

/**
 * The bake for one face: its normal from the corner order (computed by `normal`, batched below), each
 * vertex normal turned to agree with it (dot > 0), then the star's light baked in from dot(normal, light).
 */
function fixFace(hm: HullMesh, f: number): void {
  const p = hm.pos, n = hm.normals, o = f * 9;
  const nf = hm.faceN ? [hm.faceN[f * 3], hm.faceN[f * 3 + 1], hm.faceN[f * 3 + 2]]
    : crew.normal([p[o], p[o + 1], p[o + 2]], [p[o + 3], p[o + 4], p[o + 5]], [p[o + 6], p[o + 7], p[o + 8]]);
  let turned = false;
  for (let k = 0; k < 3; k++) {
    const q = o + k * 3;
    if (n[q] * nf[0] + n[q + 1] * nf[1] + n[q + 2] * nf[2] < 0) { n[q] = -n[q]; n[q + 1] = -n[q + 1]; n[q + 2] = -n[q + 2]; turned = true; }
    tmp.set(n[q], n[q + 1], n[q + 2]).applyMatrix3(hm.toWorld).normalize();
    const lit = 0.78 + 0.42 * Math.max(0, tmp.dot(LIGHT));
    hm.colors[q] = lit * 1.02; hm.colors[q + 1] = lit; hm.colors[q + 2] = lit * 0.96;
  }
  if (turned) hm.out++;
}

/** Bake every face whose spine coordinate is past `cut` (the sweep runs from bow, +x, to stern). */
function bakeTo(hull: { meshes: HullMesh[] }, cut: number): { baked: number; out: number } {
  let baked = 0, out = 0;
  for (const hm of hull.meshes) {
    let moved = false;
    while (hm.done < hm.order.length && hm.x[hm.order[hm.done]] >= cut) { fixFace(hm, hm.order[hm.done]); hm.done++; moved = true; }
    if (moved) { (hm.geo.getAttribute('normal') as BufferAttribute).needsUpdate = true; (hm.geo.getAttribute('color') as BufferAttribute).needsUpdate = true; }
    baked += hm.done;
    out += hm.out;
  }
  return { baked, out };
}

const round = (x: number) => Math.round(x * 1e5) / 1e5;

/**
 * Every hull face's normal in one batched Python call (the player's `normal` when it is theirs, else
 * the reference). The answers are checked against LANTERN's TypeScript version; any disagreement, an
 * error, or no answer within 20 s, and the bake uses LANTERN's backup. The world never waits longer.
 */
async function faceNormals(hull: { meshes: HullMesh[]; total: number }): Promise<{ who: 'yours' | 'backup'; note: string }> {
  const cases: number[][][] = [];
  for (const hm of hull.meshes) {
    const p = hm.pos;
    for (let f = 0; f < p.length / 9; f++) {
      const o = f * 9;
      cases.push([[round(p[o]), round(p[o + 1]), round(p[o + 2])], [round(p[o + 3]), round(p[o + 4]), round(p[o + 5])], [round(p[o + 6]), round(p[o + 7]), round(p[o + 8])]]);
    }
  }
  try {
    const r = await Promise.race([
      pylib.map<number[]>('normal', cases),
      new Promise<null>((res) => window.setTimeout(() => res(null), 20000)),
    ]);
    if (!r || r.values.length !== cases.length) return { who: 'backup', note: 'Python did not answer in time.' };
    let bad = 0;
    r.values.forEach((v, i) => {
      const w = crew.normal(...(cases[i] as [number[], number[], number[]]));
      if (!Array.isArray(v) || v.length !== 3 || v.some((x, k) => Math.abs(x - w[k]) > 1e-6 * (1 + Math.abs(w[k])))) bad++;
    });
    if (bad) return { who: 'backup', note: `Your normal disagreed on ${bad.toLocaleString('en')} of ${cases.length.toLocaleString('en')} triangles.` };
    let i = 0;
    for (const hm of hull.meshes) {
      const faces = hm.pos.length / 9;
      hm.faceN = new Float32Array(faces * 3);
      for (let f = 0; f < faces; f++, i++) hm.faceN.set(r.values[i], f * 3);
    }
    return { who: r.who, note: '' };
  } catch { return { who: 'backup', note: '' }; }
}

/** A glowing ring that sweeps along the spine while the bake runs. */
function scanRing(set: ArkSet): { mesh: Mesh; at(x: number): void } {
  const geo = new RingGeometry(9, 12.5, 96);
  const mesh = new Mesh(geo, new MeshBasicMaterial({ color: new Color('#59e1ff').multiplyScalar(1.6), transparent: true, opacity: 0.32, side: DoubleSide, blending: AdditiveBlending, depthWrite: false }));
  mesh.rotation.y = Math.PI / 2;
  set.ark.add(mesh);
  mesh.userData.dispose = () => { geo.dispose(); mesh.material.dispose(); };
  return { mesh, at: (x: number) => { mesh.position.set(x, 0, 0); } };
}

// ------------------------------------------------------------------ cold open

export async function coldOpen(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('tension');
    const set = await arkSet(g, ARK_OPTS);
    check(set);
    if (set.model) corruptHull(set.model, set.ark);
    const cam = new CamRig(g, set, [-58, -82, 20], [-4, -6, 0]);
    cam.drift(0.4);
    void fadeBlack(g, false, 1600);
    await letterbox(g, true, 700);
    check(set);
    void stamp(g, 'Alongside the *Meridian* · the ark is tumbling', 4200);
    await cam.to([-44, -60, 14], [0, -2, 0], 6000, ease.inOut);
    check(set);
    void cam.to([-22, -38, 9], [6, 0, 0], 30000, ease.linear);
    await g.say(S.open);
    check(set);
    await titleCard(g, 'Chapter 5', 'Which way is straight out of this panel?', 3000);
    check(set);
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

// ------------------------------------------------------------------ install: hull lighting

export async function install(g: Game): Promise<void> {
  try {
    g.stage.clearWorld();
    g.mood('explore');
    let dps = TUMBLE_DPS;
    const set = await arkSet(g, { ...ARK_OPTS, tumble: null });
    check(set);
    // the tumble, slowed to zero once the Lantern matches it
    const ax = new Vector3(...TUMBLE).normalize();
    set.tick((dt) => { set.ark.rotateOnWorldAxis(ax, (dps * Math.PI / 180) * dt); });
    const hull = set.model ? corruptHull(set.model, set.ark) : { meshes: [], total: 0 };
    const cam = new CamRig(g, set, [-50, -58, 18], [0, 0, 0]);
    cam.drift(0.3);
    await letterbox(g, true, 500);
    const panel = h('div', { class: 'glass', style: 'position:absolute;right:24px;top:24px;width:min(330px,36vw);padding:14px 16px;display:flex;flex-direction:column;gap:6px;pointer-events:none' });
    const runOn = h('div', { style: 'font-size:13px;color:var(--ink-2)' }, 'Checking…');
    const bar = h('div', { style: 'height:8px;border-radius:4px;background:#59e1ff;width:0%;box-shadow:0 0 10px #59e1ff88' });
    const count = h('div', { style: 'font-family:var(--mono);font-size:13px;color:var(--ink-2)' }, '');
    panel.append(h('div', { class: 'kicker' }, 'Hull lighting'), runOn, h('div', { style: 'height:8px;border-radius:4px;background:rgba(232,241,255,0.08)' }, bar), count);
    g.ui.scene.appendChild(panel);
    runOn.textContent = `Computing ${hull.total.toLocaleString('en')} normals…`;
    const facing = (n: number) => { count.textContent = `${n.toLocaleString('en')} of ${hull.total.toLocaleString('en')} triangles on the Meridian facing out`; };
    facing(bakeTo(hull, Infinity).out);
    const job = faceNormals(hull);
    await g.say(S.install);
    check(set);
    const { who, note } = await job;
    check(set);
    const mine = who === 'yours';
    runOn.innerHTML = inline(mine ? 'Lit by **your** `normal`, checked against LANTERN on every triangle' : `Lit by LANTERN's backup \`normal\`${note ? `. ${note}` : ''}`);
    const said = g.say(mine ? S.installMine : S.installBackup);
    // the sweep, bow to stern
    const ring = scanRing(set);
    const x0 = 34, x1 = -32;
    sfx.whoosh(4);
    void cam.to([-34, -46, 12], [-6, 0, 0], 5200, ease.inOut);
    await animate(5200, (k) => {
      const cut = x0 + (x1 - x0) * k;
      ring.at(cut);
      const b = bakeTo(hull, cut);
      bar.style.width = `${(100 * b.baked) / Math.max(1, hull.total)}%`;
      facing(b.out);
    }, ease.inOut);
    check(set);
    facing(bakeTo(hull, -Infinity).out);
    await animate(500, (k) => { (ring.mesh.material as MeshBasicMaterial).opacity = 0.32 * (1 - k); }, ease.out);
    sfx.success();
    g.stage.flash(0.1, 400);
    // match the tumble: the ark's turning slows to nothing in our frame
    void animate(4000, (k) => { dps = TUMBLE_DPS * (1 - k); }, ease.inOut);
    void cam.to([-20, -30, 8], [4, 2, 1], 22000, ease.linear);
    await wait(600);
    await said; // the install line finishes before the next one opens
    await g.say(S.lit);
    check(set);
    panel.remove();
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}
