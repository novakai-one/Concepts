// Chapter 25 cinematics: the cold open (the braced stern; Teo's voice will not fit his channel), the act beat
// after Show more decimals (thin, not gone: the case board's "Is the stern gone?" closes), right after the
// builds Show more decimals rerun on the player's svd and Teo's channel rebuilt from eight layers by the
// player's low_rank before T5, and the story out after the Unfold: Teo's voice comes through clear, and the
// 750× pulse has cracked the Anchor.
import { CanvasTexture, LinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from 'three';
import type { Game } from '../../../game/types';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { answer } from '../../../game/caseboard';
import { isPlayerFn, pylib } from '../../../game/build';
import { wait } from '../../../core/tween';
import { CAST } from '../../cast';
import { bridgeShot } from '../../common/shots';
import type { Mat } from '../../../math/la';
import { arkSet, crackAnchor, drift, Gone, sternShot, tag } from '../c24-spectral/act9';
import { BRACE_LINES } from '../c24-spectral/act9';
import { P5_K, TEO, TEO_COLS, TEO_ROWS, THIN, fmtD, rebuild } from './logic';
import { moreDecimals, paintSpec } from './puzzles2';
import { S } from './script';

export async function coldOpen(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('explore');
    const set = await sternShot(g, { braces: true });
    void fadeBlack(g, false, 1500);
    await letterbox(g, true, 600);
    void titleCard(g, 'Chapter 25', 'What does any matrix do to a circle?', 3600);
    void stamp(g, 'The stern, braced along its principal axes', 4000);
    await g.say(S.open.slice(0, 2));
    set.check();
    await g.say(S.open.slice(2));
    set.check();
    await letterbox(g, false, 400);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

/** After Show more decimals: Vell concedes one number; the case board closes "Is the stern gone?". */
export async function thin(g: Game): Promise<void> {
  try {
    g.stage.clearWorld();
    const set = await sternShot(g, { braces: true });
    await letterbox(g, true, 400);
    const tg = tag(`thickness ${fmtD(THIN, 6)} · thin, not flat`, [-21, 0, 9], 'c');
    set.root.add(tg.object);
    tg.object.userData.dispose = () => tg.dispose();
    await g.say(S.thin.slice(0, 2));
    set.check();
    answer('stern', `**Thin, not gone.** The fitted pulse’s smallest singular value is ${fmtD(THIN, 6)} = 1/750, not 0: the stern is 1/750 of its old thickness. An undo exists; it multiplies every error along the thin line by 750. Only the two-decimal model, with a smallest singular value of exactly 0, is gone by anyone.`, 'c25');
    g.toast('Is the stern gone? Thin, not gone.', 'Case board · answered');
    sfx.discover();
    await g.say(S.thin.slice(2));
    set.check();
    await letterbox(g, false, 300);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

/** Teo's channel, rebuilt from eight layers: the player's low_rank if it is written (install). */
async function rebuildVoice(): Promise<{ X: Mat; mine: boolean }> {
  const backup = rebuild(P5_K);
  if (!isPlayerFn('low_rank')) return { X: backup, mine: false };
  try {
    const r = await Promise.race([pylib.call<Mat>('low_rank', TEO.X, P5_K), new Promise<null>((res) => setTimeout(() => res(null), 9000))]);
    if (r && r.length === TEO_ROWS && r.every((row, i) => row.every((x, j) => Math.abs(x - backup[i][j]) < 1e-4))) return { X: r, mine: true };
  } catch { /* the backup runs */ }
  return { X: backup, mine: false };
}

export async function teoChannel(g: Game): Promise<void> {
  try {
    g.stage.clearWorld();
    await bridgeShot(g);
    await letterbox(g, true, 400);
    // the svd install: p6 ran before the build, so Show more decimals reruns here on the player's svd
    const svdJob = isPlayerFn('svd') ? moreDecimals() : null;
    const job = rebuildVoice();
    // the spectrogram, floating over the holotable (hidden while the decimals are read)
    const canvas = document.createElement('canvas');
    canvas.width = TEO_COLS; canvas.height = TEO_ROWS;
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace; tex.minFilter = LinearFilter; tex.magFilter = LinearFilter;
    const plane = new Mesh(new PlaneGeometry(1.1, 0.9), new MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92 }));
    plane.position.set(0, 0, 1.95);
    plane.rotation.x = Math.PI / 2;
    plane.userData.dispose = () => { plane.geometry.dispose(); (plane.material as MeshBasicMaterial).dispose(); tex.dispose(); };
    g.stage.world.add(plane);
    const live = () => !!plane.parent;
    const turn = g.stage.tick((dt) => { plane.rotation.z += dt * 0.25; });
    plane.userData.dispose = ((d) => () => { turn(); d(); })(plane.userData.dispose as () => void);
    if (svdJob) {
      plane.visible = false;
      const { mine: svdMine } = await svdJob;
      if (!live()) return;
      if (svdMine) { sfx.discover(); await g.say(S.svdRerun); if (!live()) return; }
      plane.visible = true;
    }
    await g.say(S.teoAsk);
    if (!live()) return;
    const { X, mine } = await job;
    if (!live()) return;
    paintSpec(canvas, X);
    tex.needsUpdate = true;
    sfx.discover();
    await g.say(mine ? (isPlayerFn('svd') ? S.teoMineBoth : S.teoMine) : S.teoBackup);
    if (!live()) return;
    await g.say(S.teoAsk2);
    await letterbox(g, false, 300);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

/** The story out: Teo's voice clear for the first time; then the Anchor's core cracks. */
export async function after(g: Game): Promise<void> {
  const teo = CAST.teo;
  const noise = teo.noise;
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('triumph');
    const set = await arkSet(g, { stern: 'whole', anchor: { at: [-150, 95, -18], scale: 7 }, lantern: { at: [-34, -26, 7], face: [0.4, 1, 0], scale: 1.3 } });
    set.braces(BRACE_LINES, { opacity: 0.45 });
    const stop = drift(g, set, [-16, 4, 0], 92, 16, -120, 1.2);
    void fadeBlack(g, false, 1600);
    await letterbox(g, true, 600);
    await g.say(S.after.slice(0, 1));
    set.check();
    // his voiceprint resolves: the channel carries every layer now
    teo.noise = 0.08;
    await g.say(S.after.slice(1));
    teo.noise = noise;
    set.check();
    // the 750× pulse cracked the Anchor
    sfx.alarm();
    if (set.anchor) crackAnchor(g, set.anchor, { radius: 0.62 * 7, count: 9 });
    stop();
    void g.stage.moveCamera(new Vector3(-92, 22, 14), new Vector3(-150, 95, -12), new Vector3(0, 0, 1), g.headless ? 1 : 2600);
    await wait(g.headless ? 1 : 2200);
    set.check();
    g.mood('tension');
    await g.say(S.crack);
    set.check();
    await letterbox(g, false, 400);
  } catch (e) { if (!(e instanceof Gone)) throw e; } finally { teo.noise = noise; }
}
