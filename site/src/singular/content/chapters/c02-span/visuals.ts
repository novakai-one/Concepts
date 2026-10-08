// Chapter 2, the pictures behind the two name cards (drawn in the part of the screen the card leaves free).
//   linear combination: −v and 2w tip to tail, the yellow sum [0;5].
//   span: dots a·v + b·w filling the plane for v = [2;1], w = [1;3]; the same dots on one line for w = [−4;−2].
import type { Game, V3 } from '../../../game/types';
import { Grid2D } from '../../../gfx/grid';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { Label } from '../../../gfx/label';
import { FatLine } from '../../../gfx/lines';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import type { Vec } from '../../../kit/plain';
import { V, W, WL } from './text';

/**
 * A 2-D view whose centre sits in the free part of the screen (the name card covers the right on wide screens).
 * width: units that must fit across a narrow screen (nothing cut at the edges on a phone).
 */
async function frameFree(g: Game, centre: [number, number], height: number, width = 0): Promise<number> {
  const Wd = g.stage.size.x, H = g.stage.size.y;
  if (Wd < 900 && width) height = Math.max(height, (width * H) / Wd);
  const ppu = H / height;
  const freeCx = Wd >= 900 ? (Wd - 600) / 2 : Wd / 2;
  await g.stage.view2D({ center: [centre[0] + (Wd / 2 - freeCx) / ppu, centre[1]], height, ms: 0 });
  return ppu;
}

function base(g: Game, axis = 0.5): void {
  g.stage.clearWorld();
  const grid = new Grid2D(g.stage, { main: axis ? 0.3 : 0.16, base: 0, axis });
  grid.mesh.userData.dispose = () => grid.dispose();
  g.stage.world.add(grid.object);
}

const v3 = (v: Vec, z = 0.02): V3 => [v[0], v[1], z];
function tag(g: Game, text: string, cls: string, at: Vec, off: [number, number]): Label {
  const l = new Label(text, v3(at), { className: `a7-tag pk-tag ${cls}`, offset: off });
  g.stage.world.add(l.object);
  return l;
}

/** −v, then 2w from its tip, then the yellow sum: [0;5]. */
export async function lcVisual(g: Game): Promise<void> {
  base(g);
  const ppu = await frameFree(g, [-0.6, 2], 9);
  const w = 3.2 / ppu;
  const mv: Vec = [-V[0], -V[1]], s: Vec = [0, 5];
  const a = new Arrow(v3([0, 0]), v3([0, 0]), { color: C.v, width: w });
  const b = new Arrow(v3(mv), v3(mv), { color: C.w, width: w });
  const y = new Arrow(v3([0, 0]), v3([0, 0]), { color: C.result, width: w });
  g.stage.world.add(a.object, b.object, y.object);
  const la = tag(g, '$-\\mathbf v$', 'g', [mv[0] / 2, mv[1] / 2], [0, 18]);
  const lb = tag(g, '$2\\mathbf w$', 'c02-r', [(mv[0] + s[0]) / 2, (mv[1] + s[1]) / 2], [-30, 0]);
  la.show(false); lb.show(false);
  const root = a.object;
  void (async () => {
    await wait(250);
    await animate(600, (k) => a.setTo(v3([mv[0] * k, mv[1] * k])), ease.inOut);
    if (!root.parent) return;
    la.show(true);
    await animate(700, (k) => b.setTo(v3([mv[0] + 2 * W[0] * k, mv[1] + 2 * W[1] * k])), ease.inOut);
    if (!root.parent) return;
    lb.show(true);
    await animate(600, (k) => y.setTo(v3([s[0] * k, s[1] * k])), ease.out);
  })();
}

/** Left: dots a·v + b·w for v = [2;1], w = [1;3] fill the plane. Right: with w = [−4;−2] they stay on one line. */
export async function spanVisual(g: Game): Promise<void> {
  base(g, 0);
  const gap = 6;
  const ppu = await frameFree(g, [0, 0.3], 12, 13);
  const width = 3 / ppu;
  const L: Vec = [-gap / 2, 0], Rt: Vec = [gap / 2, 0];
  const at = (o: Vec, p: Vec): Vec => [o[0] + p[0], o[1] + p[1]];
  // each panel has its own axes through its own origin
  const axes: FatLine[] = [];
  for (const o of [L, Rt]) {
    axes.push(new FatLine(g.stage, [v3(at(o, [-2.8, 0]), 0.001), v3(at(o, [2.8, 0]), 0.001)], { color: '#9fc4ff', width: 1.3, opacity: 0.5 }));
    axes.push(new FatLine(g.stage, [v3(at(o, [0, -2.8]), 0.001), v3(at(o, [0, 2.8]), 0.001)], { color: '#9fc4ff', width: 1.3, opacity: 0.5 }));
  }
  for (const l of axes) { l.object.userData.dispose = () => l.dispose(); g.stage.world.add(l.object); }
  const arrows = (o: Vec, w: Vec) => {
    g.stage.world.add(new Arrow(v3(o), v3(at(o, V)), { color: C.v, width }).object, new Arrow(v3(o), v3(at(o, w)), { color: C.w, width }).object);
  };
  arrows(L, W);
  arrows(Rt, WL);
  tag(g, 'a plane', 'pk-w', at(L, [0, -2.7]), [0, 12]);
  tag(g, 'a line', 'pk-w', at(Rt, [0, -2.7]), [0, 12]);
  const inBox = (p: Vec) => Math.abs(p[0]) <= 2.6 && Math.abs(p[1]) <= 2.6;
  const left: Vec[] = [], right: Vec[] = [];
  for (let a = -3; a <= 3; a += 0.5) for (let b = -2; b <= 2; b += 0.5) {
    const p: Vec = [a * V[0] + b * W[0], a * V[1] + b * W[1]];
    if (inBox(p)) left.push(p);
  }
  for (let c = -1.25; c <= 1.25 + 1e-9; c += 0.125) right.push([c * V[0], c * V[1]]);
  left.sort((p, q) => Math.hypot(...p) - Math.hypot(...q));
  right.sort((p, q) => Math.abs(p[0]) - Math.abs(q[0]));
  const root = axes[0].object;
  const dot = (o: Vec, p: Vec) => { const d = new Dot(v3(at(o, p), 0.005), { color: C.result, size: 0.045, glow: 1 }); d.setOpacity(0.8); g.stage.world.add(d.object); };
  void (async () => {
    await wait(300);
    const n = Math.max(left.length, right.length);
    for (let i = 0; i < n && root.parent; i++) {
      if (left[i]) dot(L, left[i]);
      if (right[Math.floor((i * right.length) / n)] && Math.floor((i * right.length) / n) !== Math.floor(((i - 1) * right.length) / n)) dot(Rt, right[Math.floor((i * right.length) / n)]);
      await wait(22);
    }
  })();
}
