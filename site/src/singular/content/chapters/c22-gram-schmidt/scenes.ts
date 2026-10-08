// Chapter 22 staging and cinematics: the holotable with LANTERN's drifting attitude frame (horizon leaning,
// star egg-shaped), and the Drift fix (install) that re-squares it with the player's `gram_schmidt`.
import { Group } from 'three';
import type { Game, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { bridgeShot } from '../../common/shots';
import { letterbox } from '../../../kit/cine';
import { h, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { isPlayerFn, pylib } from '../../../game/build';
import { normalize, type Vec } from '../../../math/la';
import { DRIFT, DRIFT_FIXED, DRIFT_NAMES, fmtN, horizonLean, near } from './logic';
import { Gone } from '../c21-projection/stage';
import { S } from './script';

const v3 = (v: readonly number[]): V3 => [v[0], v[1], v[2] ?? 0];

/** Run the Drift fix on the player's `gram_schmidt` (LANTERN's backup on any error or after 8 s). */
export async function driftFix(frame: Vec[] = DRIFT): Promise<{ mine: boolean; frame: Vec[] }> {
  if (!isPlayerFn('gram_schmidt')) return { mine: false, frame: DRIFT_FIXED };
  try {
    const r = await Promise.race([pylib.call<number[][]>('gram_schmidt', frame), new Promise<null>((res) => setTimeout(() => res(null), 8000))]);
    if (r && r.length === 3 && r.every((q, i) => near(q, DRIFT_FIXED[i], 1e-6))) return { mine: true, frame: r };
  } catch { /* fall back */ }
  return { mine: false, frame: DRIFT_FIXED };
}

/** The attitude frame on the holotable: three arrows, the drawn horizon and the star. Returns an updater. */
export function frameHolo(g: Game, frame: Vec[]): { set(f: Vec[]): void; alive(): boolean } {
  const W = g.stage.world;
  const cols = [C.v, C.w, C.u];
  const arrows = frame.map((v, i) => new Arrow([0, 0, 0], v3(v), { color: cols[i], label: DRIFT_NAMES[i] }));
  const level = new FatLine(g.stage, [[-3, 0, 0], [4, 0, 0]], { color: C.white, width: 1.1, opacity: 0.3, dashed: true, dashSize: 0.14, gapSize: 0.1 });
  const horizon = new FatLine(g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.accent, width: 2.6, intensity: 1.3 });
  const star = new FatLine(g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.result, width: 2.4, intensity: 1.4 });
  const lab = new Label('', [0.4, 0, -0.7], { className: 'a8-pt c' });
  W.add(...arrows.map((a) => a.object), level.object, horizon.object, star.object, lab.object);
  for (const l of [level, horizon, star]) l.object.userData.dispose = () => l.dispose();
  const set = (f: Vec[]) => {
    f.forEach((v, i) => arrows[i].set([0, 0, 0], v3(v)));
    const fw = normalize(f[1]);
    horizon.setPoints([v3(fw.map((x) => -3 * x)), v3(fw.map((x) => 4 * x))]);
    const up = f[0], fwd = f[1];
    star.setPoints(Array.from({ length: 97 }, (_, i) => { const a = (i / 96) * Math.PI * 2; return [1.9 + 0.5 * (Math.cos(a) * fwd[0] + Math.sin(a) * up[0]), 0.01, 1.55 + 0.5 * (Math.cos(a) * fwd[2] + Math.sin(a) * up[2])] as V3; }));
    lab.set(`horizon lean ${fmtN(horizonLean(f[1]), 2)}°`);
  };
  set(frame);
  return { set, alive: () => !!level.object.parent };
}

/** Scene staging for the cold open: the bridge, then the frame hologram over the holotable. */
export async function driftShot(g: Game): Promise<void> {
  g.stage.clearWorld();
  await g.stage.view3D({ target: [1.0, 0, 0.75], distance: 8.6, azimuth: -90, elevation: 14, ms: 0, orbit: false });
  frameHolo(g, DRIFT);
  let t = 0;
  const off = g.stage.tick((dt) => {
    t += dt;
    if (g.stage.controls) return;
    const a = (-90 + Math.sin(t * 0.12) * 6) * (Math.PI / 180);
    g.stage.camera.position.set(1.0 + 8.6 * Math.cos(0.24) * Math.cos(a), 8.6 * Math.cos(0.24) * Math.sin(a), 0.75 + 8.6 * Math.sin(0.24));
    g.stage.camera.up.set(0, 0, 1);
    g.stage.camera.lookAt(1.0, 0, 0.75);
  });
  const holder = new Group();
  holder.userData.dispose = () => off();
  g.stage.world.add(holder);
}

/** The Drift fix: the frame re-squares on the player's code; the horizon stands up. */
export async function install(g: Game): Promise<void> {
  try {
    g.stage.clearWorld();
    g.mood('explore');
    await g.stage.view3D({ target: [1.0, 0, 0.75], distance: 8.6, azimuth: -90, elevation: 14, ms: 0, orbit: false });
    const holo = frameHolo(g, DRIFT);
    const check = () => { if (!holo.alive()) throw new Gone(); };
    await letterbox(g, true, 400);
    const panel = h('div', { class: 'glass' }, h('div', { class: 'kicker' }, 'Drift fix'));
    const line = h('div', { class: 'a8-msg' }, 'Starting…');
    panel.append(line);
    panel.style.cssText = 'position:absolute;left:24px;top:84px;padding:12px 16px;max-width:360px;pointer-events:none';
    g.ui.scene.appendChild(panel);
    try {
      await g.say(S.install);
      check();
      const { mine, frame } = await driftFix();
      check();
      line.innerHTML = inline(mine ? 'Running on: **your** `gram_schmidt`' : 'Running on: LANTERN backup');
      await g.say(mine ? S.installMine : S.installBackup);
      check();
      sfx.whoosh(1);
      await animate(g.headless ? 20 : 1600, (k) => holo.set(DRIFT.map((v, i) => v.map((x, a) => x + (frame[i][a] - x) * k))), ease.inOut);
      sfx.success();
      line.innerHTML = inline('Frame square. Horizon lean **0°**. Star round.');
      await wait(g.headless ? 10 : 900);
      check();
      await g.say(S.installAfter);
    } finally {
      panel.remove();
      await letterbox(g, false, 300);
    }
    g.stage.clearWorld();
    await bridgeShot(g);
  } catch (e) {
    if (!(e instanceof Gone)) throw e;
  }
}
