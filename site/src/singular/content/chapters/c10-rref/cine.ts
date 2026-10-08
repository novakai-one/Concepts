// Chapter 10 staging: the pod bay conduits (cold open) and the end of Act III: power returns, Teo's
// pod opens, and it is empty.
import type { Game, V3 } from '../../../game/types';
import { Label } from '../../../gfx/label';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { music } from '../../../audio/music';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { isPlayerFn, pylib } from '../../../game/build';
import { pin } from '../../../game/caseboard';
import { AMBER, HOLO, Pod, orbit, scanLattice } from '../c08-systems/cine';
import { PlaneSet, worldHost } from '../c08-systems/planes';
import { P2, SP, solveCrew } from './logic';
import { S } from './script';

export async function coldOpen(g: Game): Promise<void> {
  g.stage.clearWorld();
  await fadeBlack(g, true, 10);
  g.mood('void');
  const host = worldHost(g);
  scanLattice(host, [3, 1, 0], 1.35, 0.18);
  const planes = new PlaneSet(host, { n: 3, rows: P2.aug, labels: false, showSolution: false, size: 8, focus: [3, 1, 0], axes: false });
  planes.setFade(0);
  orbit(host, [3, 1, 0], 18, 22, -120, 2.4);
  await fadeBlack(g, false, 1200);
  await letterbox(g, true, 500);
  void stamp(g, '*Meridian* · deck five · pod bay conduits', 4000);
  await g.say(S.cold, {
    onLine: async (_l, i) => {
      if (i === 3) void animate(1500, (k) => planes.setFade(k), ease.out);
      if (i === 4) { planes.showSolution(true); sfx.snap(); }
    },
  });
  await letterbox(g, false, 500);
}

/** The end of Act III: power to the bay, the pod opens, empty. Pins "Where is Teo?". */
export async function closing(g: Game): Promise<void> {
  g.stage.clearWorld();
  const host = worldHost(g);
  const at: V3 = [0, 0, 0];
  scanLattice(host, [0, 0, 0.3], 0.55, 0.12);
  const pod = new Pod(host, at, { light: AMBER, opacity: 0.55 });
  orbit(host, [0, 0, 0.2], 7.5, 26, -70, 2);
  // the flows are routed with the player's solve when it passes its tests
  let mine = false;
  if (isPlayerFn('solve')) {
    try {
      const out = await Promise.race([pylib.call<{ kind: string }>('solve', SP.rows(SP.m)), new Promise<null>((r) => window.setTimeout(() => r(null), 8000))]);
      mine = !!out && out.kind === solveCrew(SP.rows(SP.m)).kind;
    } catch { /* the backup routes it */ }
  }
  g.mood('void');
  await letterbox(g, true, 500);
  await g.say(mine ? S.closeYours : S.closeBackup);
  await g.say(S.close.slice(0, 3), {
    onLine: (_l, i) => { if (i === 0) { sfx.whoosh(1.6); void g.stage.shockwave(at, 1400, 0.4); pod.setLight(HOLO); } },
  });
  // the lid opens; inside: nothing
  sfx.thrust(1.4);
  await pod.open(2400);
  music.stop(1.5);
  await wait(900);
  await g.say(S.close.slice(3, 4));
  const note = new Label('<i>Woken by Dr Varga. Gone to the stern to brace the struts. — T.</i>', [0, 0, 1.1], { className: 'c10-note' });
  host.add(note.object);
  host.onDispose(() => note.dispose());
  await g.say(S.close.slice(4, 9));
  void titleCard(g, 'Act III ends', 'Where is Teo?', 3200);
  sfx.discover();
  if (pin('teo', 'Where is Teo?', 'c10')) g.toast('Where is Teo?', 'Case board');
  await g.say(S.close.slice(9));
  await letterbox(g, false, 600);
}
