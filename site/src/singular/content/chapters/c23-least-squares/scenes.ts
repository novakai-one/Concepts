// Chapter 23 cinematics: the cold open (the Drift fix runs at the start of the watch on the player's
// gram_schmidt; the drones log the stern) and the act beat, The Residual: the Collapse fit and its residual
// plot run on the player's least_squares, and the knock is in their own residuals.
import type { Game, V3 } from '../../../game/types';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { letterbox, stamp } from '../../../kit/cine';
import { h, inline } from '../../../ui/ui';
import { tex } from '../../../../lib/md';
import { C } from '../../../core/theme';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { answer } from '../../../game/caseboard';
import { isPlayerFn, pylib } from '../../../game/build';
import { col, type Mat } from '../../../math/la';
import { driftFix } from '../c22-gram-schmidt/scenes';
import { Gone, dronesShot } from '../c21-projection/stage';
import { FIT, FITTED, KNOCK, KNOCK_START, fmtN, leftoverOf, near } from './logic';
import { S } from './script';

export async function coldOpen(g: Game): Promise<void> {
  try {
    g.stage.clearWorld();
    g.mood('explore');
    await dronesShot(g);
    const alive = () => g.stage.world.children.length > 0;
    await letterbox(g, true, 500);
    void stamp(g, 'Beside the stern of the *Meridian* · start of the watch', 4200);
    const panel = h('div', { class: 'glass' }, h('div', { class: 'kicker' }, 'Drift fix'));
    const line = h('div', { class: 'a8-msg' }, 'Running…');
    panel.append(line);
    panel.style.cssText = 'position:absolute;left:24px;top:84px;padding:12px 16px;max-width:360px;pointer-events:none';
    g.ui.scene.appendChild(panel);
    try {
      await g.say(S.drift);
      const { mine } = await driftFix();
      if (!alive()) throw new Gone();
      line.innerHTML = inline(mine ? 'Running on: **your** `gram_schmidt`' : 'Running on: LANTERN backup');
      await g.say(mine ? S.driftMine : S.driftBackup);
    } finally { panel.remove(); }
    await g.say(S.open);
    await letterbox(g, false, 400);
  } catch (e) {
    if (!(e instanceof Gone)) throw e;
  }
}

/** Run the Collapse fit on the player's least_squares: one call per row of the pulse. */
export async function collapseFit(): Promise<{ who: 'yours' | 'backup'; F: Mat }> {
  const cases = [0, 1, 2].map((i) => [FIT.X, col(FIT.Y, i)]);
  try {
    const r = await Promise.race([pylib.map<number[]>('least_squares', cases), new Promise<null>((res) => setTimeout(() => res(null), 12000))]);
    if (r && r.values.length === 3 && r.values.every((row, i) => row && near(row, FITTED[i], 1e-6))) return { who: r.who, F: r.values };
  } catch { /* fall back */ }
  return { who: 'backup', F: FITTED };
}

export async function residualBeat(g: Game): Promise<void> {
  try {
    g.stage.clearWorld();
    g.mood('tension');
    await g.stage.view2D({ center: [0, 1.6], height: 7.2, ms: 0 });
    const W = g.stage.world;
    const SP = 0.18, AMP = 140;
    const sx = (i: number) => (i + 0.5 - 30) * SP;
    const axis = new FatLine(g.stage, [[sx(-0.5), 0, 0], [sx(59.5), 0, 0]], { color: C.white, width: 1.2, opacity: 0.5 });
    axis.object.userData.dispose = () => axis.dispose();
    W.add(axis.object);
    const alive = () => !!axis.object.parent;
    await letterbox(g, true, 400);
    const panel = h('div', { class: 'glass' }, h('div', { class: 'kicker' }, 'Collapse fit'));
    const line = h('div', { class: 'a8-msg' }, 'Starting…');
    const eq = h('div', { class: 'eq' });
    panel.append(line, eq);
    panel.style.cssText = 'position:absolute;left:24px;top:84px;padding:12px 16px;max-width:380px;pointer-events:none';
    g.ui.scene.appendChild(panel);
    try {
      await g.say(S.install);
      if (!alive()) throw new Gone();
      const mineBefore = isPlayerFn('least_squares');
      const { who, F } = await collapseFit();
      if (!alive()) throw new Gone();
      line.innerHTML = inline(who === 'yours' ? 'Running on: **your** `least_squares`' : mineBefore ? 'Your `least_squares` disagreed with the backup. Using LANTERN backup.' : 'Running on: LANTERN backup');
      eq.innerHTML = tex(`C\\mathbf e_3 = (${col(F, 2).map((x) => fmtN(x, 3)).join(',\\ ')})`, true);
      await g.say(who === 'yours' ? S.installMine : S.installBackup);
      // the residual plot from this fit, bar by bar, the knock tapping as it appears
      const res = leftoverOf(F);
      const bars = new FatSegments(g.stage, [[[0, 0, 0], [0, 0, 0]]], { color: C.accent, width: 13, intensity: 1.1 });
      bars.object.userData.dispose = () => bars.dispose();
      W.add(bars.object);
      const segs: [V3, V3][] = [];
      for (let i = 0; i < res.length; i++) {
        segs.push([[sx(i), 0, 0.01], [sx(i), res[i] * AMP, 0.01]]);
        bars.setSegments(segs);
        if (Math.abs(res[i]) > 0.006) { const k = KNOCK[i - KNOCK_START]; sfx.tick(k === 'L' ? 1 : 4); }
        await wait(g.headless ? 1 : 90);
        if (!alive()) throw new Gone();
      }
      const lab = new Label('three short · three long · three short', [sx(30), 2.7, 0], { className: 'a8-pt y' });
      W.add(lab.object);
      await g.say(S.residual);
      answer('teo', 'Alive, inside the flattened stern. His knocks are in the leftover of the Collapse fit: three short, three long, three short, every ninety seconds, in time with our messages.', 'c23');
      g.toast('Where is Teo?', 'Case board · answered');
      sfx.discover();
      await wait(g.headless ? 10 : 1200);
    } finally {
      panel.remove();
      await letterbox(g, false, 300);
    }
  } catch (e) {
    if (!(e instanceof Gone)) throw e;
  }
}
