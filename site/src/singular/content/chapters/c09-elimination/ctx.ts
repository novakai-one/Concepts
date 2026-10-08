// A puzzle context for code that runs outside a puzzle (a Procedure's run(), a card's visual), so kit
// widgets that expect a PuzzleCtx (RowOpsBoard, PlaneSet) can be used there. Everything it creates is
// disposed by disposeAll(). The engine's runProcedure() lends no context, so this is a local stand-in.
import type { Object3D } from 'three';
import type { Game, PuzzleCtx } from '../../../game/types';
import { Grid2D, type GridOpts } from '../../../gfx/grid';
import { Readout } from '../../../ui/widgets';
import { sweepLabels } from '../c08-systems/planes';

export type LooseCtx = PuzzleCtx & { disposeAll(): void };

export function looseCtx(g: Game, mount: HTMLElement): LooseCtx {
  const disposers: (() => void)[] = [];
  const objs: Object3D[] = [];
  let moves = 0;
  let grid: Grid2D | null = null;
  const ctx: LooseCtx = {
    g,
    difficulty: g.settings.difficulty,
    snap: () => null,
    win() { /* not a puzzle */ },
    move(n = 1) { moves += n; },
    moves: () => moves,
    subgoal() { /* no objective card */ },
    setGoal() { /* no objective card */ },
    add(...items) {
      for (const o of items) {
        const obj = 'isObject3D' in o ? (o as Object3D) : (o as { object: Object3D }).object;
        g.stage.world.add(obj);
        objs.push(obj);
        const d = (o as { dispose?: () => void }).dispose;
        if (typeof d === 'function' && !('isObject3D' in o)) disposers.push(() => d.call(o));
      }
    },
    grid(o?: GridOpts) {
      if (!grid) { grid = new Grid2D(g.stage, o); g.stage.world.add(grid.object); const gr = grid; disposers.push(() => gr.dispose()); }
      return grid;
    },
    readout(title?: string) { const r = new Readout(title); mount.appendChild(r.el); return r; },
    dock: () => mount,
    onDispose(fn) { disposers.push(fn); },
    tick(fn) { const off = g.stage.tick(fn); disposers.push(() => { off(); }); },
    bark(who, text) { g.toast(text, who === 'lantern' ? 'LANTERN' : who); },
    get won() { return false; },
    disposeAll() {
      for (const f of disposers.splice(0)) { try { f(); } catch { /* already gone */ } }
      for (const o of objs.splice(0)) { sweepLabels(o); o.removeFromParent(); }
    },
  };
  return ctx;
}
