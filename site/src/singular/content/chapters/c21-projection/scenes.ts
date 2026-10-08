// Chapter 21 cinematics: the tether planner (install) parks the Lantern at the nearest point of its plane
// with the player's `project`, and the tether reaches the hatch.
import type { Game, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Beacon } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { PlanePatch } from '../../../gfx/shapes';
import { makeLantern } from '../../common/set';
import { letterbox } from '../../../kit/cine';
import { h, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { isPlayerFn, pylib } from '../../../game/build';
import { gramSchmidt } from '../../../math/la';
import { HATCH, HATCH_FOOT, THR, THR1, THR2, near } from './logic';
import { Gone, hatchShot } from './stage';
import { S } from './script';

/** Run the player's `project` on the hatch (falls back to LANTERN's backup on any error or after 8 s). */
export async function tetherPlan(): Promise<{ mine: boolean; point: number[] }> {
  if (!isPlayerFn('project')) return { mine: false, point: HATCH_FOOT };
  try {
    const r = await Promise.race([pylib.call<number[]>('project', THR, HATCH), new Promise<null>((res) => setTimeout(() => res(null), 8000))]);
    if (r && r.length === 3 && near(r, HATCH_FOOT, 1e-6)) return { mine: true, point: r };
  } catch { /* fall back */ }
  return { mine: false, point: HATCH_FOOT };
}

export async function close(g: Game): Promise<void> {
  const alive = { v: true };
  const check = () => { if (!alive.v) throw new Gone(); };
  try {
    g.stage.clearWorld();
    g.mood('explore');
    await g.stage.view3D({ target: [0.45, 0.45, 0.35], distance: 10, azimuth: -62, elevation: 21, ms: 0, orbit: false });
    const W = g.stage.world;
    const patch = new PlanePatch(g.stage, [0, 0, 0], [1, 1, -1], { color: C.u, size: 4, opacity: 0.13 });
    const [e1, e2] = gramSchmidt([THR1, THR2]);
    patch.setSpan([0, 0, 0], e1 as V3, e2 as V3);
    const a1 = new Arrow([0, 0, 0], THR1 as V3, { color: C.v, width: 0.035 });
    const a2 = new Arrow([0, 0, 0], THR2 as V3, { color: C.w, width: 0.035 });
    const hatch = new Beacon(g.stage, HATCH as V3, { color: C.accent });
    const ship = makeLantern(g.stage, 0.07);
    ship.object.position.set(0, 0, 0);
    ship.face([1, 1, 0]);
    ship.setThrust(0.2);
    const tether = new FatLine(g.stage, [[0, 0, 0], [0, 0, 0]], { color: C.result, width: 2.4, intensity: 1.3 });
    tether.object.visible = false;
    const lh = new Label('hatch', HATCH as V3, { className: 'a8-pt c', offset: [0, 24] });
    W.add(patch.object, a1.object, a2.object, hatch.object, ship.object, tether.object, lh.object);
    patch.object.userData.dispose = () => patch.dispose();
    tether.object.userData.dispose = () => tether.dispose();
    alive.v = true;
    const stillHere = () => { if (!patch.object.parent) alive.v = false; check(); };
    await letterbox(g, true, 400);
    const panel = h('div', { class: 'glass' }, h('div', { class: 'kicker' }, 'Tether planner'));
    const line = h('div', { class: 'a8-msg' }, 'Starting…');
    panel.append(line);
    panel.style.cssText = 'position:absolute;left:24px;top:84px;padding:12px 16px;max-width:360px;pointer-events:none';
    g.ui.scene.appendChild(panel);
    try {
      await g.say(S.close);
      stillHere();
      const { mine, point } = await tetherPlan();
      stillHere();
      line.innerHTML = inline(mine ? 'Running on: **your** `project`' : 'Running on: LANTERN backup');
      await g.say(mine ? S.closeMine : S.closeBackup);
      stillHere();
      const foot = point as V3;
      sfx.thrust();
      await ship.flyTo(foot, g.headless ? 50 : 1800);
      stillHere();
      tether.object.visible = true;
      await animate(g.headless ? 20 : 900, (k) => tether.setPoints([foot, [foot[0] + (HATCH[0] - foot[0]) * k, foot[1] + (HATCH[1] - foot[1]) * k, foot[2] + (HATCH[2] - foot[2]) * k]]), ease.out);
      sfx.snap();
      line.innerHTML = inline(`Parked at (1/3, 1/3, 2/3). Tether **1.155** of 1.2.`);
      await wait(g.headless ? 10 : 900);
      stillHere();
    } finally {
      panel.remove();
      await letterbox(g, false, 300);
    }
    g.stage.clearWorld();
    await hatchShot(g);
    await g.say(S.closeAfter);
  } catch (e) {
    if (!(e instanceof Gone)) throw e;
  }
}
