// Chapter 19 cinematics: the cold open (Vell's people would run fifty pulses one by one; the holotable runs
// a few, honestly), and the install: Vell's fifty-pulse forecast computed with the player's mat_pow and
// applied to every debris piece at once.
import type { Game } from '../../../game/types';
import { Label } from '../../../gfx/label';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { isPlayerFn, pylib } from '../../../game/build';
import { V } from '../../truth';
import { identity, matMul, mlerp, mpow, type Mat } from '../../../math/la';
import { Gone, exteriorSet, fieldSet, orbit } from '../c18-eigen/scenes';
import { V50, forecastOk } from './logic';
import { S } from './script';

const check = (s: { alive(): boolean }) => { if (!s.alive()) throw new Gone(); };

export async function coldOpen(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('explore');
    const { set, cutter } = await exteriorSet(g);
    let t = 0;
    set.tick((dt) => { t += dt; if (g.stage.controls) return; const a = -2.2 + t * 0.018; g.stage.camera.position.set(-55 + 70 * Math.cos(a), 30 + 70 * Math.sin(a), 20); g.stage.camera.up.set(0, 0, 1); g.stage.camera.lookAt(cutter.position.x * 0.5 - 25, cutter.position.y * 0.5 + 8, 0); });
    g.stage.disposeControls();
    g.stage.mode = '3d';
    void fadeBlack(g, false, 1200);
    await letterbox(g, true, 500);
    void titleCard(g, 'Chapter 19', 'Where will everything be after fifty pulses?', 3400);
    void stamp(g, 'The field around the ark', 3800);
    await g.say(S.open.slice(0, 3));
    check(set);
    await fadeBlack(g, true, 450);
    g.stage.clearWorld();
    const f = await fieldSet(g, { lines: true });
    orbit(g, f, [0, 0, 0], 16, 26, -64, 2.6);
    void fadeBlack(g, false, 600);
    await g.say(S.open.slice(3), {
      onLine: async () => {
        for (let i = 0; i < 4 && f.alive(); i++) { sfx.whoosh(0.7); await f.pulse(g.headless ? 1 : 900); await wait(g.headless ? 1 : 120); }
      },
    });
    check(f);
    await letterbox(g, false, 400);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

/** V⁵⁰ from the player's mat_pow if it passed and agrees; LANTERN's backup otherwise. */
async function forecastMatrix(): Promise<{ M: Mat; mine: boolean }> {
  if (!isPlayerFn('mat_pow')) return { M: V50, mine: false };
  try {
    const r = await Promise.race([pylib.call<number[][]>('mat_pow', V, 50), new Promise<null>((res) => setTimeout(() => res(null), 8000))]);
    if (r && forecastOk(r)) return { M: r, mine: true };
  } catch { /* the backup runs */ }
  return { M: V50, mine: false };
}

export async function forecast(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('tension');
    const f = await fieldSet(g, { lines: true, cutter: false });
    orbit(g, f, [0, 0, 0], 16, 24, -40, 2.2);
    void fadeBlack(g, false, 900);
    await letterbox(g, true, 500);
    const job = forecastMatrix();
    await g.say(S.forecastIntro);
    check(f);
    const { M, mine } = await job;
    check(f);
    await g.say(mine ? S.forecastMine : S.forecastBackup);
    check(f);
    // the forecast, played as fifty honest pulses, fast; the counter keeps time
    const tag = new Label('pulse 0 of 50', [0, 0, 5.2], { className: 'a7-board' });
    tag.object.userData.dispose = () => tag.dispose();
    f.root.add(tag.object);
    sfx.whoosh(3);
    let cur: Mat = identity(3);
    for (let k = 1; k <= 50 && f.alive(); k++) {
      const M0 = cur;
      await animate(g.headless ? 1 : 70, (s) => f.set(matMul(mlerp(identity(3), V, s), M0)), ease.linear);
      cur = mpow(V, k);
      f.set(cur);
      tag.set(`pulse ${k} of 50`);
    }
    check(f);
    f.set(M);
    tag.set('after 50 pulses: every piece on the line (1, 1, 1)');
    sfx.discover();
    await wait(g.headless ? 1 : 500);
    await g.say(S.forecastOut);
    check(f);
    await letterbox(g, false, 400);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}
