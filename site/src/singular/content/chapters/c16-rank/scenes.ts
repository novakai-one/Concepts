// Chapter 16 cinematics: Vell's cutter scans the stern (cold open), the survey scanner runs on the
// player's rank (install), and the act's low point (Vell's verdict, the airlock, a nine-day-old log).
import { AdditiveBlending, Color, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, PointLight, Vector3, type Sprite } from 'three';
import type { Game } from '../../../game/types';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { music } from '../../../audio/music';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { h, inline } from '../../../ui/ui';
import { glowSprite } from '../../../gfx/markers';
import { isPlayerFn, pylib } from '../../../game/build';
import { C2 } from '../../truth';
import { Gone, actSet, aimAt, camTo, fireScan, makeCutter, scanSet } from '../c15-nullspace/scenes';
import { Counter } from './counter';
import { crew } from './logic';
import { S } from './script';

/** The cutter near the stern, its scan plane sweeping the sheet. */
async function cutterSet(g: Game) {
  const set = await actSet(g, { ark: { at: [0, 0, 0] }, anchor: { at: [-150, 95, -18], scale: 7 }, lantern: { at: [-30, -40, 6], face: [0.3, 1, 0], scale: 1.5 } });
  const cutter = makeCutter(1.1);
  cutter.position.set(-62, -30, 16);
  aimAt(cutter, [-21, 0, 0]);
  set.root.add(cutter);
  set.tick((_dt, t) => cutter.traverse((n) => { if (n.userData.blink) (n as Sprite).material.opacity = Math.sin(t * 5) > 0.6 ? 0.95 : 0.15; }));
  return { set, cutter };
}

export async function coldOpen(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('void');
    const { set } = await cutterSet(g);
    set.check();
    // the scan plane: a thin sheet of light that sweeps along the stern
    const beamMat = new MeshBasicMaterial({ color: new Color('#cfe3ff').multiplyScalar(1.4), transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, blending: AdditiveBlending });
    const beam = new Mesh(new PlaneGeometry(1, 60), beamMat);
    beam.rotation.y = Math.PI / 2;
    beam.scale.set(1, 1, 1);
    set.root.add(beam);
    set.root.userData.dispose = ((d0: () => void) => () => { d0(); beamMat.dispose(); beam.geometry.dispose(); })(set.root.userData.dispose as () => void);
    await camTo(g, set, [-60, -108, 24], [-38, -10, 4], 0);
    void fadeBlack(g, false, 1600);
    await letterbox(g, true, 600);
    set.check();
    void stamp(g, 'Survey Authority cutter, beside the stern', 4200);
    void camTo(g, set, [-56, -100, 20], [-36, -8, 4], 14000);
    const sweep = animate(9000, (k) => { beam.position.set(-48 + 52 * k, 0, 0); beamMat.opacity = 0.16 * Math.sin(Math.PI * k); }, ease.inOut);
    await g.say(S.open.slice(0, 2));
    set.check();
    await sweep;
    set.check();
    await g.say(S.open.slice(2));
    set.check();
    await titleCard(g, 'Chapter 16', 'How many directions survived?', 3000);
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

/** Scene staging: the cutter holding beside the stern. */
export async function cutterShot(g: Game): Promise<void> {
  const { set } = await cutterSet(g);
  let t = 0;
  set.tick((dt) => { t += dt; const a = -2.05 + t * 0.015; g.stage.camera.position.set(-44 + 86 * Math.cos(a), -18 + 86 * Math.sin(a), 18 + Math.sin(t * 0.1)); g.stage.camera.up.set(0, 0, 1); g.stage.camera.lookAt(-44, -18, 7); });
  g.stage.disposeControls();
  g.stage.mode = '3d';
}

async function rankWithLibrary(): Promise<{ mine: boolean; kept: number }> {
  const backup = crew.rank(C2);
  if (!isPlayerFn('rank')) return { mine: false, kept: backup };
  try {
    const r = await Promise.race([pylib.call<number>('rank', C2), new Promise<null>((res) => setTimeout(() => res(null), 8000))]);
    if (r === backup) return { mine: true, kept: r };
  } catch { /* fall back */ }
  return { mine: false, kept: backup };
}

export async function install(g: Game): Promise<void> {
  try {
    g.stage.clearWorld();
    const sc = await scanSet(g, { buoys: 1000 });
    sc.set.check();
    let az = -60;
    sc.set.tick((dt) => { az += dt * 2.2; const a = (az * Math.PI) / 180, r = 12, e = 0.32; g.stage.camera.position.set(r * Math.cos(e) * Math.cos(a), r * Math.cos(e) * Math.sin(a), r * Math.sin(e) + 0.4); g.stage.camera.up.set(0, 0, 1); g.stage.camera.lookAt(0, 0, 0.3); });
    g.stage.disposeControls();
    g.stage.mode = '3d';
    await letterbox(g, true, 500);
    const job = rankWithLibrary();
    const panel = h('div', { class: 'glass act5-panel' }, h('div', { class: 'kicker' }, 'Survey scanner'));
    const runOn = h('div', { class: 'line' }, 'Starting…');
    const counter = new Counter({ n: 3, rows: 3, labels: ['x', 'y', 'z'], title: 'Directions into the pulse' });
    panel.append(runOn, counter.el);
    g.ui.scene.appendChild(panel);
    const { mine, kept } = await job;
    sc.set.check();
    runOn.innerHTML = inline(mine ? 'Running on: **your** `rank`' : 'Running on: LANTERN backup');
    const said = g.say(mine ? S.installMine : S.installBackup);
    await wait(600);
    await fireScan(sc, 2200);
    sc.set.check();
    for (let j = 0; j < 3; j++) { counter.set(['kept', 'kept', 'flat'].slice(0, j + 1).concat(new Array(2 - j).fill(null)) as ('kept' | 'flat' | null)[]); sfx.tick(j); await wait(350); }
    counter.setNote(`Rank ${kept}, nullity ${3 - kept}: ${kept} + ${3 - kept} = 3.`);
    sfx.success();
    await said; // the install line finishes before the next one opens
    await g.say(S.install);
    sc.set.check();
    panel.remove();
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

export async function lowPoint(g: Game): Promise<void> {
  let corner: HTMLElement | null = null;
  try {
    g.stage.clearWorld();
    g.mood('void');
    music.setIntensity(0.1);
    const { set } = await cutterSet(g);
    set.check();
    await camTo(g, set, [-66, -96, 14], [-44, -28, 8], 0);
    await fadeBlack(g, false, 900);
    await letterbox(g, true, 600);
    void camTo(g, set, [-62, -90, 12], [-43, -28, 8], 12000);
    await g.say(S.low);
    set.check();
    // the airlock: close on the Lantern, one warm light
    await fadeBlack(g, true, 700);
    const ship = set.lantern!;
    const lamp = new PointLight('#ffe2b8', 6, 8);
    const glow = glowSprite('#ffe2b8', 1.2, 0.8);
    const at = ship.object.localToWorld(new Vector3(-0.6, 0.9, 0.3));
    lamp.position.copy(at); glow.position.copy(at);
    set.root.add(lamp, glow);
    await camTo(g, set, [at.x - 6, at.y - 7, at.z + 2.4], [at.x, at.y, at.z], 0);
    await fadeBlack(g, false, 900);
    void camTo(g, set, [at.x - 5, at.y - 6, at.z + 2], [at.x, at.y, at.z], 9000);
    corner = h('div', { class: 'act5-corner' }, 'Determinant 0.00 (two decimal places)');
    g.ui.scene.appendChild(corner);
    void corner.offsetWidth;
    corner.classList.add('on');
    await g.say(S.lowAirlock);
    set.check();
    await wait(1200);
    sfx.open();
    await g.say(S.log);
    set.check();
    await wait(800);
    await fadeBlack(g, true, 1200);
    corner.remove();
    await letterbox(g, false, 10);
    await fadeBlack(g, false, 10);
  } catch (e) { corner?.remove(); if (!(e instanceof Gone)) throw e; }
}
