// Chapter 9 staging: the power board on deck seven, drawn as LANTERN's scan: three generators (wire
// cylinders that fill with light at their output) and three meters, the planes of the meter equations.
import { AdditiveBlending, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import type { Game, V3 } from '../../../game/types';
import { Label } from '../../../gfx/label';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, stamp } from '../../../kit/cine';
import { isPlayerFn, pylib } from '../../../game/build';
import { C } from '../../../core/theme';
import { HOLO, orbit, scanLattice } from '../c08-systems/cine';
import { PlaneSet, worldHost, type Host } from '../c08-systems/planes';
import { P1, backSub, rowEchelonCrew } from './logic';
import { S } from './script';

/** Three generators side by side; light(i, k) fills generator i to fraction k. */
export function generators(host: Host, at: V3): { light(i: number, k: number, ms?: number): Promise<void>; group: Group } {
  const group = new Group();
  group.position.set(...at);
  const fills: Mesh<CylinderGeometry, MeshBasicMaterial>[] = [];
  for (let i = 0; i < 3; i++) {
    const shell = new Mesh(new CylinderGeometry(0.55, 0.55, 2.4, 14, 4, true), new MeshBasicMaterial({ color: new Color(HOLO), wireframe: true, transparent: true, opacity: 0.35, depthWrite: false, blending: AdditiveBlending }));
    shell.rotation.x = Math.PI / 2;
    shell.position.set((i - 1) * 1.8, 0, 1.2);
    const fill = new Mesh(new CylinderGeometry(0.45, 0.45, 1, 18, 1), new MeshBasicMaterial({ color: new Color(C.result).multiplyScalar(1.6), transparent: true, opacity: 0.75, depthWrite: false }));
    fill.rotation.x = Math.PI / 2;
    fill.scale.set(1, 0.001, 1);
    fill.position.set((i - 1) * 1.8, 0, 0.001);
    const tag = new Label(`G${i + 1}`, [(i - 1) * 1.8, 0, -0.45], { className: 'c08-tag' });
    group.add(shell, fill, tag.object);
    fills.push(fill);
    host.onDispose(() => { shell.geometry.dispose(); shell.material.dispose(); fill.geometry.dispose(); fill.material.dispose(); tag.dispose(); });
  }
  host.add(group);
  return {
    group,
    async light(i, k, ms = 900) {
      const f = fills[i];
      const h0 = f.scale.y, h1 = Math.max(0.001, 2.4 * k);
      sfx.snap();
      await animate(ms, (t) => { const hh = h0 + (h1 - h0) * t; f.scale.y = hh; f.position.z = hh / 2; }, ease.out);
    },
  };
}

export async function coldOpen(g: Game): Promise<void> {
  g.stage.clearWorld();
  await fadeBlack(g, true, 10);
  g.mood('void');
  const host = worldHost(g);
  scanLattice(host, [0, 0, 1.5], 1.3, 0.18);
  const gens = generators(host, [0, 4, 0]);
  void gens;
  const planes = new PlaneSet(host, { n: 3, rows: P1.aug, labels: false, showSolution: false, size: 7, focus: P1.answer, axes: false });
  planes.setFade(0);
  orbit(host, [0, 2, 1.6], 17, 22, -110, 2.5);
  await fadeBlack(g, false, 1200);
  await letterbox(g, true, 500);
  void stamp(g, '*Meridian* · deck seven · power board', 4000);
  await g.say(S.cold, {
    onLine: async (_l, i) => {
      if (i === 2) void animate(1600, (k) => planes.setFade(k), ease.out);
      if (i === 4) { sfx.alarm(); g.stage.nudge(0.05); }
    },
  });
  await letterbox(g, false, 500);
}

export async function closing(g: Game): Promise<void> {
  g.stage.clearWorld();
  g.mood('explore');
  const host = worldHost(g);
  scanLattice(host, [0, 0, 1.2], 1.0, 0.14);
  const gens = generators(host, [0, 0, 0]);
  orbit(host, [0, 0, 1.2], 13, 20, -90, 3);
  // power routing runs on the player's row_echelon and back_sub when both pass their tests
  let out: number[] = backSub(rowEchelonCrew(P1.aug)) ?? P1.answer;
  let mine = false;
  if (isPlayerFn('row_echelon') && isPlayerFn('back_sub')) {
    try {
      const timeout = <T,>(pr: Promise<T>) => Promise.race([pr, new Promise<null>((r) => window.setTimeout(() => r(null), 8000))]);
      const ref = await timeout(pylib.call<number[][]>('row_echelon', P1.aug));
      const x = ref ? await timeout(pylib.call<number[]>('back_sub', ref)) : null;
      if (Array.isArray(x) && x.length === 3 && x.every((v, i) => Math.abs(v - P1.answer[i]) < 1e-6)) { out = x; mine = true; }
    } catch { /* LANTERN keeps its backup */ }
  }
  await g.say(mine ? S.closeYours : S.closeBackup);
  for (let i = 0; i < 3; i++) { await gens.light(i, out[i] / 3, 800); await wait(150); }
  sfx.success();
  void g.stage.shockwave([0, 0, 1], 1200, 0.5);
  await g.say(S.close);
}

/** Backdrop for Chapter 9's scenes and cards: the generators on deck seven, dark. */
export async function boardScene(g: Game): Promise<void> {
  g.stage.clearWorld();
  const host = worldHost(g);
  scanLattice(host, [0, 0, 1.2], 1.0, 0.12);
  generators(host, [0, 0, 0]);
  orbit(host, [0, 0, 1.2], 13, 20, -90, 2.2);
}
