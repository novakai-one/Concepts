// Chapter 20 cinematics: the cold open (the ark's drones, the stern that needs a hundred of them), the install
// (the drone allocation runs on the player's steady_state), Vell standing down after the forecast, and the
// act beat: Ilse's pod docks and Vell's drones reroute to the stern.
import { Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3, type Points } from 'three';
import type { Game } from '../../../game/types';
import { Label } from '../../../gfx/label';
import { glowSprite } from '../../../gfx/markers';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { answer } from '../../../game/caseboard';
import { isPlayerFn, pylib } from '../../../game/build';
import { Gone, exteriorSet, fieldSet, orbit } from '../c18-eigen/scenes';
import { V, VELL_CUTTER } from '../../truth';
import { matVec, mpow, veq, type Vec } from '../../../math/la';
import { P5_BEST, TOTAL, designP, fmtV, steadyOf } from './logic';
import { S } from './script';

const check = (s: { alive(): boolean }) => { if (!s.alive()) throw new Gone(); };
const orbitShot = (g: Game, set: { tick(f: (dt: number) => void): void }, c: [number, number, number], r: number, z: number, a0: number, w: number) => {
  let t = 0;
  set.tick((dt) => { t += dt; if (g.stage.controls) return; const a = a0 + t * w; g.stage.camera.position.set(c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), z); g.stage.camera.up.set(0, 0, 1); g.stage.camera.lookAt(c[0], c[1], c[2]); });
  g.stage.disposeControls();
  g.stage.mode = '3d';
};

/** Gather a share of the drone lights towards the stern (x ≈ −22) over ms. */
async function droneDrift(drones: Points | null, share: number, ms: number): Promise<void> {
  if (!drones) return;
  const base = drones.userData.base as number[][];
  const n = base.length, m = Math.round(n * share);
  const from = base.map((b) => b[0]);
  await animate(ms, (k) => { for (let i = 0; i < m; i++) base[i][0] = from[i] + (-24 + (i % 9) - from[i]) * k; }, ease.inOut);
}

export async function coldOpen(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('explore');
    const { set, drones } = await exteriorSet(g, { drones: TOTAL });
    orbitShot(g, set, [-6, 2, 2], 62, 18, -2.4, 0.02);
    void fadeBlack(g, false, 1200);
    await letterbox(g, true, 500);
    void titleCard(g, 'Chapter 20', 'Where do the drones settle?', 3400);
    void stamp(g, `The Meridian · ${TOTAL} maintenance drones`, 3800);
    await g.say(S.open, { onLine: async (_l, i) => { if (i === 1) await droneDrift(drones, 0.2, g.headless ? 1 : 2400); } });
    check(set);
    await letterbox(g, false, 400);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

/** Scene staging: the ark with its drones. */
export async function dronesShot(g: Game): Promise<void> {
  const { set } = await exteriorSet(g, { drones: TOTAL });
  if (!set.alive()) return;
  orbitShot(g, set, [-6, 2, 2], 66, 20, -1.9, 0.012);
}

async function allocation(): Promise<{ q: Vec; mine: boolean }> {
  const P = designP(P5_BEST / 100);
  const backup = steadyOf(P)!;
  if (!isPlayerFn('steady_state')) return { q: backup, mine: false };
  try {
    const r = await Promise.race([pylib.call<number[]>('steady_state', P), new Promise<null>((res) => setTimeout(() => res(null), 8000))]);
    if (r && veq(r, backup, 1e-6)) return { q: r, mine: true };
  } catch { /* the backup runs */ }
  return { q: backup, mine: false };
}

export async function install(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('explore');
    const { set, drones } = await exteriorSet(g, { drones: TOTAL });
    orbitShot(g, set, [-8, 0, 2], 58, 16, -2.2, 0.018);
    void fadeBlack(g, false, 900);
    await letterbox(g, true, 500);
    const job = allocation();
    await g.say(S.allocIntro);
    check(set);
    const { q, mine } = await job;
    check(set);
    const tag = new Label(`Bow ${Math.round(q[0] * TOTAL)} · Mid ${Math.round(q[1] * TOTAL)} · Stern ${Math.round(q[2] * TOTAL)}`, [0, 0, 22], { className: 'a7-board' });
    tag.object.userData.dispose = () => tag.dispose();
    set.root.add(tag.object);
    sfx.discover();
    await Promise.all([g.say(mine ? S.allocMine : S.allocBackup), droneDrift(drones, q[2], g.headless ? 1 : 3200)]);
    check(set);
    await letterbox(g, false, 400);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

/** After the forecast: Vell reads it in silence, then stands down. */
export async function standDown(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('void');
    const f = await fieldSet(g, { lines: true });
    f.set(mpow(V, 50));
    f.cutterAt(matVec(mpow(V, 50), VELL_CUTTER));
    orbit(g, f, [1.5, 1.5, 1.5], 13, 22, -40, 1.6);
    const tag = new Label(`cutter ${fmtV(VELL_CUTTER)} → ${fmtV([2, 2, 2])} · volume × 10⁻⁵⁰`, [2, 2, 3.6], { className: 'a7-board' });
    tag.object.userData.dispose = () => tag.dispose();
    f.root.add(tag.object);
    void fadeBlack(g, false, 900);
    await letterbox(g, true, 600);
    // silence: the forecast hangs there before he answers
    await wait(g.headless ? 1 : 2600);
    check(f);
    await g.say(S.standDown);
    check(f);
    answer('vell50', 'Vell’s pulse keeps three lines, with stretches 1, 0.5 and 0.2. After fifty pulses only the part along $(1, 1, 1)$ is left: his own cutter, at $(4, 2, 0) = 2(1, 1, 1) + 1(1, -1, 0) + 1(1, 1, -2)$, ends at $(2, 2, 2)$, and every volume is multiplied by $0.1^{50} = 10^{-50}$. He withdrew the setting.', 'c20');
    g.toast('Where does everything end up after fifty of Vell’s pulses?', 'Case board · answered');
    g.mood('explore');
    await letterbox(g, false, 400);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

/** The act beat: Ilse's pod crosses from the Anchor and docks; the drones gather at the stern. */
export async function arrival(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('triumph');
    const { set, drones } = await exteriorSet(g, { drones: TOTAL });
    const pod = new Group();
    const shell = new Mesh(new SphereGeometry(1.1, 20, 14), new MeshStandardMaterial({ color: '#cfd6e2', metalness: 0.6, roughness: 0.35 }));
    shell.scale.set(1.5, 1, 1);
    const lamp = glowSprite('#ffe9c4', 5, 0.85);
    pod.add(shell, lamp);
    pod.userData.dispose = () => { shell.geometry.dispose(); (shell.material as MeshStandardMaterial).dispose(); };
    set.root.add(pod);
    const from = new Vector3(-120, 80, -14), to = new Vector3(24, -30, 8);
    pod.position.copy(from);
    orbitShot(g, set, [-30, 20, 0], 100, 26, -1.7, 0.01);
    void fadeBlack(g, false, 1100);
    await letterbox(g, true, 500);
    void stamp(g, 'From the Anchor’s core · one pod', 3800);
    const fly = animate(g.headless ? 1 : 9000, (k) => { pod.position.lerpVectors(from, to, k); pod.lookAt(to); }, ease.inOut);
    await g.say(S.close, { onLine: async (_l, i) => { if (i === 0) await droneDrift(drones, 1 / 3, g.headless ? 1 : 3000); } });
    await fly;
    check(set);
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}
