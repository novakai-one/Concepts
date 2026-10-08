// Honest playback of a move of the plane on screen (GDD §9.3, §11.3), shared by Chapters 13 and 14.
// Smooth stages move the shader grid and every rider; a mirror flip plays as a half-turn through 3-D
// (the camera tilts so it reads as a turn-over, never as a flattening), on a finite line grid.
import { Group } from 'three';
import type { Game, V3 } from '../../../game/types';
import type { Stage } from '../../../core/stage';
import type { Grid2D } from '../../../gfx/grid';
import { FatSegments } from '../../../gfx/lines';
import { C } from '../../../core/theme';
import { animate, ease } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { identity, matMul, type Mat } from '../../../math/la';
import { embed, flipAt, plan2, smoothAt, stageEnd } from './honest';

/** A 3×3 (or 2×2, embedded) as the matrix of a Group (column-major via set()). */
export function setGroupMatrix(g: Group, M: Mat, t: readonly number[] = [0, 0, 0]): void {
  const m = embed(M);
  g.matrix.set(m[0][0], m[0][1], m[0][2], t[0] ?? 0, m[1][0], m[1][1], m[1][2], t[1] ?? 0, m[2][0], m[2][1], m[2][2], t[2] ?? 0, 0, 0, 0, 1);
  g.matrixWorldNeedsUpdate = true;
}

/** Grid lines of the floor from −n to n, moved by any 3×3 (used while a flip turns the floor over). */
export class FlatGrid {
  readonly group = new Group();
  private readonly lines: FatSegments;
  private readonly axes: FatSegments;
  constructor(stage: Stage, o: { extent?: number; color?: string; opacity?: number } = {}) {
    const n = o.extent ?? 8;
    const segs: [V3, V3][] = [];
    for (let c = -n; c <= n; c++) if (c !== 0) segs.push([[c, -n, 0], [c, n, 0]], [[-n, c, 0], [n, c, 0]]);
    this.lines = new FatSegments(stage, segs, { color: o.color ?? C.grid, width: 1.2, opacity: o.opacity ?? 0.55 });
    this.axes = new FatSegments(stage, [[[-n, 0, 0], [n, 0, 0]], [[0, -n, 0], [0, n, 0]]], { color: C.axis, width: 2, opacity: 0.75 });
    this.group.add(this.lines.object, this.axes.object);
    this.group.matrixAutoUpdate = false;
    this.group.visible = false;
    this.group.userData.dispose = () => { this.lines.dispose(); this.axes.dispose(); };
  }
  get object(): Group { return this.group; }
  set(M: Mat): void { setGroupMatrix(this.group, M); }
  show(v: boolean): void { this.group.visible = v; }
}

/** Something that rides the move: receives the 3×3 world matrix every frame. */
export type Rider = (W: Mat) => void;

export interface MoveView { g: Game; grid?: Grid2D; flat?: FlatGrid }

/** Tilt the camera so a turn-over about the floor direction u reads in 3-D, run fn, then tilt back. */
async function tilted(g: Game, u: [number, number], fn: () => Promise<void>): Promise<void> {
  if (g.stage.mode !== '2d') { await fn(); return; }
  const t = g.stage.target;
  const hgt = g.stage.planeHalfHeight() * 2;
  const az = (Math.atan2(u[0], -u[1]) * 180) / Math.PI;
  await g.stage.view3D({ target: [t.x, t.y, 0], distance: hgt * 1.05, azimuth: az, elevation: 58, orbit: false, ms: 420 });
  await fn();
  await g.stage.view2D({ center: [t.x, t.y], height: hgt, ms: 420 });
}

/**
 * Play the move S on top of the state M0 (2×2), stage by stage. Riders follow every frame. Resolves
 * with the final state S·M0. ms is the total length.
 */
export async function playMove(v: MoveView, S: Mat, M0: Mat = identity(2), ms = 1500, riders: Rider[] = [], sound = true): Promise<Mat> {
  let cur = M0;
  const stages = plan2(S);
  const each = ms / stages.length;
  for (const st of stages) {
    if (st.kind === 'smooth') {
      if (sound) sfx.whoosh(each / 1000);
      await animate(each, (k) => {
        const W = matMul(smoothAt(st, k), cur);
        v.grid?.set(W);
        v.flat?.set(W);
        riders.forEach((r) => r(embed(W)));
      }, ease.inOut);
    } else {
      const from = cur;
      // the shader grid keeps its faint original; its moved lines hand over to the line grid
      const u = v.grid?.mesh.material.uniforms;
      const look = u ? { main: u.uMain.value as number, axis: u.uAxis.value as number } : null;
      v.grid?.setLook({ main: 0, axis: 0 });
      v.flat?.show(true);
      await tilted(v.g, st.u, async () => {
        if (sound) sfx.warp();
        await animate(each * 1.3, (k) => {
          const W = flipAt(st, k, from);
          v.flat?.set(W);
          riders.forEach((r) => r(W));
        }, ease.inOut);
      });
      v.flat?.show(false);
      if (look) v.grid?.setLook({ main: look.main, axis: look.axis });
    }
    cur = matMul(stageEnd(st), cur);
    v.grid?.set(cur);
    v.flat?.set(cur);
    riders.forEach((r) => r(embed(cur)));
  }
  return cur;
}
