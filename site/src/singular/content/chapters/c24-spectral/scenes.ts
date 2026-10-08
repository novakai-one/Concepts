// Chapter 24 cinematics: the cold open (Act IX title; the Lantern on station beside the flat stern), the
// brace planner (install: the stern's stress matrix, the Collapse pulse as the fit reads it, is split into
// three perpendicular brace lines by the player's sym_eigen), Vell's symmetric pulse named again.
import type { Game } from '../../../game/types';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { isPlayerFn, pylib } from '../../../game/build';
import { wait } from '../../../core/tween';
import { arkSet, drift, Gone, sternShot, tag } from './act9';
import { BRACES, STRESS, braceOk, crewSymEigen, lineDeg } from './logic';
import { S } from './script';
import type { Vec } from '../../../math/la';

export async function coldOpen(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('void');
    const set = await arkSet(g, { stern: 'flat', lantern: { at: [-36, -26, 7], face: [0.5, 1, 0.05], scale: 1.3 } });
    const stop1 = drift(g, set, [-14, 4, 0], 112, 19, -132, 1.3);
    void fadeBlack(g, false, 1600);
    await letterbox(g, true, 600);
    void titleCard(g, 'Act IX · Singular', 'Which moves only stretch along perpendicular axes?', 3800);
    void stamp(g, 'Beside the *Meridian*’s stern · the drones have finished their readings', 4400);
    await g.say(S.open.slice(0, 4));
    set.check();
    // the camera closes in on the sheet while Bram asks for the brace lines
    stop1();
    drift(g, set, [-21, 0, 0], 52, 20, -100, 1.5);
    await g.say(S.open.slice(4));
    set.check();
    await letterbox(g, false, 400);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

/** The brace planner: which eigenvectors did it use, and were they the player's? */
async function planner(): Promise<{ dirs: Vec[]; mine: boolean }> {
  const backup = crewSymEigen(STRESS)[1];
  if (!isPlayerFn('sym_eigen')) return { dirs: backup, mine: false };
  try {
    const r = await Promise.race([pylib.call<[number[], number[][]]>('sym_eigen', STRESS), new Promise<null>((res) => setTimeout(() => res(null), 8000))]);
    if (r && r[1]?.length === 3 && braceOk(r[1]) && r[0].every((x, i) => Math.abs(x - BRACES.values[i]) < 1e-6)) return { dirs: r[1], mine: true };
  } catch { /* the backup runs */ }
  return { dirs: backup, mine: false };
}

export async function braces(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('explore');
    const set = await sternShot(g);
    void fadeBlack(g, false, 900);
    await letterbox(g, true, 500);
    const job = planner();
    await g.say(S.bracesIntro);
    set.check();
    const { dirs, mine } = await job;
    set.check();
    // the braces grow out from the stern's centre, one line at a time
    for (let i = 1; i <= 3; i++) {
      set.braces(dirs.slice(0, i));
      sfx.star(i - 1);
      await wait(g.headless ? 1 : 750);
    }
    set.check();
    const tg = tag(`three braces · ${Math.round(lineDeg(dirs[0], dirs[1]))}° to each other`, [-21, 0, 11], 'c');
    set.root.add(tg.object);
    tg.object.userData.dispose = () => tg.dispose();
    await g.say(mine ? S.bracesMine : S.bracesBackup);
    set.check();
    await g.say(S.bracesOut);
    set.check();
    await letterbox(g, false, 400);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}
