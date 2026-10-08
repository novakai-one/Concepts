// Chapter 6 staging: the cold open (the hull's box frames, squeezed by the pulses) and the story-out
// install (the strut scan reads 5,000 hull nodes and finds Section C flat).
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, PointsMaterial, Vector3 } from 'three';
import type { Game } from '../../../game/types';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { h, inline } from '../../../ui/ui';
import { glowTexture } from '../../../gfx/markers';
import { burst } from '../../../gfx/fx';
import { C } from '../../../core/theme';
import { isPlayerFn, libSource } from '../../../game/build';
import { callPython } from '../../../game/pyrunner';
import { CamRig, Gone, check, hullSet, hullShot, type HullSet } from './stage';
import { SECTION_C, hullNodes, scanVerdict, triple, type HullNode } from './logic';
import { S } from './script';

/** Glowing points at the hull nodes, in the ark's own frame (they lean with the hull). */
class NodeCloud {
  readonly points: Points<BufferGeometry, PointsMaterial>;
  private readonly col: Float32Array;
  constructor(set: HullSet, nodes: readonly HullNode[], size = 0.32) {
    const pos = new Float32Array(nodes.length * 3);
    nodes.forEach((n, i) => pos.set(n.pos, i * 3));
    this.col = new Float32Array(nodes.length * 3);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('color', new BufferAttribute(this.col, 3));
    const m = new PointsMaterial({ size, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, sizeAttenuation: true });
    this.points = new Points(g, m);
    set.frame.add(this.points);
  }
  paint(i: number, c: Color, k = 1): void { this.col.set([c.r * k, c.g * k, c.b * k], i * 3); }
  flush(): void { (this.points.geometry.getAttribute('color') as BufferAttribute).needsUpdate = true; }
}

const CYAN = new Color('#59e1ff');
const AMBER = new Color('#ffd166');
const FLAT = new Color(C.orange);

// ------------------------------------------------------------------ dialogue shots

export const shot = (variant: number) => async (g: Game): Promise<void> => { await hullShot(g, variant); };

// ------------------------------------------------------------------ cold open

export async function coldOpen(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('explore');
    const set = await hullSet(g, { spine: [1, 0, 0], shear: 0.12, debris: 12, starLight: 2.6, lantern: { at: [-10, -20, 3], face: [0.25, 1, 0.02], scale: 1.2, thrust: 0.18 } });
    check(set);
    const nodes = hullNodes(1400, 61);
    const cloud = new NodeCloud(set, nodes, 0.28);
    nodes.forEach((_, i) => cloud.paint(i, CYAN, 0));
    cloud.flush();
    const cam = new CamRig(g, set, [-58, -62, 18], [-6, -4, 0]);
    cam.drift(0.4);
    void fadeBlack(g, false, 1600);
    await letterbox(g, true, 600);
    check(set);
    void titleCard(g, 'Chapter 6', 'Is the hull still holding volume?', 3400);
    void stamp(g, 'Holding station off the *Meridian* · aft cargo truss', 4000);
    await cam.to([-40, -34, 9], [-12, 0, 0], 6000, ease.inOut);
    check(set);
    void cam.to([-24, -16, 5], [-12, 0, 0], 26000, ease.linear);
    await g.say(S.open, {
      onLine: (_l, i) => {
        if (!set.alive()) return;
        if (i === 1) {
          // the hull's nodes light up one after another along the spine
          void animate(2600, (k) => {
            const x = 28 - 56 * k;
            nodes.forEach((n, j) => { if (n.pos[0] > x) cloud.paint(j, CYAN, 0.55); });
            cloud.flush();
          }, ease.linear);
          sfx.discover();
        }
        if (i === 2) { sfx.whoosh(1.6); void g.stage.shockwave([0, 0, 0], 1800, 0.4); }
      },
    });
    check(set);
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

// ------------------------------------------------------------------ install: the strut scan

/** Every node's volume, from the player's `triple` when it is theirs and agrees with LANTERN's. */
async function scanWithLibrary(nodes: readonly HullNode[]): Promise<{ mine: boolean; vols: number[] }> {
  const crewVols = nodes.map((n) => triple(n.struts[0], n.struts[1], n.struts[2]));
  if (!isPlayerFn('triple')) return { mine: false, vols: crewVols };
  try {
    const lib = ['dot', 'cross', 'triple'].map((f) => libSource(f)).filter(Boolean).join('\n\n');
    const src = `${lib}\n\ndef __strut_scan(nodes):\n    return [triple(a, b, c) for a, b, c in nodes]\n`;
    const r = await callPython(src, '__strut_scan', [nodes.map((n) => n.struts)], 8000);
    const vols = r.value as number[] | undefined;
    if (r.error || !Array.isArray(vols) || vols.length !== nodes.length) return { mine: false, vols: crewVols };
    const agree = vols.every((x, i) => Math.abs(x - crewVols[i]) < 1e-6);
    return agree ? { mine: true, vols } : { mine: false, vols: crewVols };
  } catch { return { mine: false, vols: crewVols }; }
}

export async function install(g: Game): Promise<void> {
  try {
    g.stage.clearWorld();
    g.mood('explore');
    const set = await hullSet(g, { spine: [1, 0, 0], shear: 0.12, debris: 6, starLight: 2.6, lantern: { at: [-8, -22, 4], face: [0.2, 1, 0.02], scale: 1.1, thrust: 0.15 } });
    check(set);
    const nodes = hullNodes();
    const cloud = new NodeCloud(set, nodes);
    nodes.forEach((_, i) => cloud.paint(i, CYAN, 0.08));
    cloud.flush();
    const cam = new CamRig(g, set, [6, -64, 20], [0, 0, 0]);
    cam.drift(0.3);
    await letterbox(g, true, 500);
    const panel = h('div', { class: 'glass', style: 'position:absolute;right:24px;top:24px;width:min(320px,34vw);padding:14px 16px;display:flex;flex-direction:column;gap:6px;pointer-events:none' });
    const runOn = h('div', { style: 'font-size:13px;color:var(--ink-2)' }, 'Reading struts…');
    const count = h('div', { style: 'font-family:var(--mono);font-size:14px' }, '0 of 5000');
    const flatEl = h('div', { style: `font-family:var(--mono);font-size:14px;color:${C.orange}` }, 'flat: 0');
    panel.append(h('div', { class: 'kicker' }, 'Strut scan'), runOn, count, flatEl);
    g.ui.scene.appendChild(panel);
    const job = scanWithLibrary(nodes);
    await g.say(S.install);
    check(set);
    const { mine, vols } = await job;
    check(set);
    runOn.innerHTML = inline(mine ? 'Running on: **your** `triple`' : 'Running on: LANTERN backup');
    const said = g.say(mine ? S.installMine : S.installBackup);
    const v = scanVerdict(vols);
    // the scan sweeps from the bow to the stern
    const order = nodes.map((n, i) => [n.pos[0], i] as [number, number]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
    let done = 0, flatSeen = 0;
    void cam.to([-4, -42, 12], [-6, 0, 0], 5200, ease.inOut);
    await animate(g.headless ? 50 : 5200, (k) => {
      const upto = Math.floor(k * order.length);
      for (; done < upto; done++) {
        const i = order[done];
        if (v.flat[i]) { cloud.paint(i, FLAT, 1.4); flatSeen++; }
        else cloud.paint(i, v.ratio[i] < 0.8 ? AMBER : CYAN, 0.35 + 0.5 * v.ratio[i]);
        if (done % 160 === 0) sfx.tick((done / 160) % 5);
      }
      cloud.flush();
      count.textContent = `${Math.min(order.length, upto)} of ${order.length}`;
      flatEl.textContent = `flat: ${flatSeen}`;
    }, ease.linear);
    check(set);
    count.textContent = `${order.length} of ${order.length}`;
    flatEl.textContent = `flat: ${v.flatCount} · all in Section C`;
    // Section C glows: a burst at the aft truss, the camera closes in
    const mid = new Vector3((SECTION_C[0] + SECTION_C[1]) / 2, 0, 0);
    set.frame.localToWorld(mid);
    sfx.alarm();
    g.stage.flash(0.1, 400);
    void burst(g.stage, [mid.x, mid.y, mid.z], C.orange, 90, 6, false);
    void cam.to([-20, -24, 7], [mid.x, mid.y, mid.z], 14000, ease.inOut);
    await said; // the install line finishes before the next one opens
    await g.say(S.scan);
    check(set);
    panel.remove();
    await wait(200);
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}
