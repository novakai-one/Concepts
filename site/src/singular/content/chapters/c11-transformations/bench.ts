// The spire bench (GDD §3.5, §6.6): drag where the grid arrows land; the lattice follows.
// Bench2 is the ground layer (2×2), Bench3 the full lattice (3×3). Both use e₁, e₂, e₃ notation and
// label the columns a₁, a₂, a₃ (the kit's MatrixView labels î, ĵ, which the course drops in Part D).
// playMove() animates a move honestly (honest.ts): smooth stages by polar split, mirror flips as a
// half-turn through 3-D with the camera tilted so the flip reads as a flip, never as a flattening.
import { Group } from 'three';
import type { PuzzleCtx, V3 } from '../../../game/types';
import type { Game } from '../../../game/types';
import type { Stage } from '../../../core/stage';
import { Grid2D, type GridOpts } from '../../../gfx/grid';
import { FatSegments } from '../../../gfx/lines';
import { Arrow } from '../../../gfx/arrow';
import { Lattice3D } from '../../../gfx/shapes';
import { MatrixInput } from '../../../ui/widgets';
import { VectorHandle } from '../../../kit/handle';
import { C } from '../../../core/theme';
import { animate, ease } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { identity, matMul, type Mat } from '../../../math/la';
import { embed, flipAt, plan2, smoothAt, stageEnd } from './honest';

export const GREY = '#8f9bb3';
export const RESULT = C.result;
const col2 = (M: Mat, j: number): V3 => [M[0][j], M[1][j], 0];
const col3 = (M: Mat, j: number): V3 => [M[0][j], M[1][j], M[2][j]];

// ------------------------------------------------------------------ a finite grid moved by any 3×3

/** Grid lines of the floor (z = 0) from −n to n, moved by a 2×2 or 3×3 (used for flips and ghosts). */
export class FlatGrid {
  readonly group = new Group();
  private readonly lines: FatSegments;
  private readonly axes: FatSegments;
  constructor(stage: Stage, o: { extent?: number; color?: string; opacity?: number; dashed?: boolean; width?: number; axisColor?: string } = {}) {
    const n = o.extent ?? 7;
    const segs: [V3, V3][] = [];
    for (let c = -n; c <= n; c++) {
      if (c === 0) continue;
      segs.push([[c, -n, 0], [c, n, 0]], [[-n, c, 0], [n, c, 0]]);
    }
    this.lines = new FatSegments(stage, segs, { color: o.color ?? C.grid, width: o.width ?? 1.2, opacity: o.opacity ?? 0.55, dashed: o.dashed, dashSize: 0.18, gapSize: 0.14 });
    this.axes = new FatSegments(stage, [[[-n, 0, 0], [n, 0, 0]], [[0, -n, 0], [0, n, 0]]], { color: o.axisColor ?? C.axis, width: (o.width ?? 1.2) * 1.6, opacity: Math.min(1, (o.opacity ?? 0.55) * 1.4), dashed: o.dashed, dashSize: 0.18, gapSize: 0.14 });
    this.group.add(this.lines.object, this.axes.object);
    this.group.matrixAutoUpdate = false;
    this.set(identity(2));
  }
  get object(): Group { return this.group; }
  /** Move the grid by M, then shift it by t (a shift is not a linear move: the origin goes too). */
  set(M: Mat, t: readonly number[] = [0, 0, 0]): void {
    const m = M.length === 2 ? embed(M) : M;
    this.group.matrix.set(m[0][0], m[0][1], m[0][2], t[0], m[1][0], m[1][1], m[1][2], t[1], m[2][0], m[2][1], m[2][2], t[2] ?? 0, 0, 0, 0, 1);
    this.group.matrixWorldNeedsUpdate = true;
  }
  show(v: boolean): void { this.group.visible = v; }
  setOpacity(a: number): void { this.lines.setOpacity(0.55 * a); this.axes.setOpacity(Math.min(1, 0.77 * a)); this.group.visible = a > 0.001; }
  dispose(): void { this.lines.dispose(); this.axes.dispose(); this.group.removeFromParent(); }
}

// ------------------------------------------------------------------ honest playback

/** Something that rides a move: receives the world matrix (3×3) at every frame. */
export type Rider = (W: Mat) => void;

export interface MoveView {
  grid?: Grid2D;          // the shader grid (shows 2×2 frames)
  flat: FlatGrid;         // used during flips
  g: Game;
}

/** Tilt the camera so a flip about direction u reads in 3-D, run fn, then tilt back. */
async function tilted(g: Game, u: [number, number], fn: () => Promise<void>): Promise<void> {
  const t = g.stage.target;
  const h = g.stage.planeHalfHeight() * 2;
  if (g.stage.mode !== '2d') { await fn(); return; }
  // look across the mirror line, from the side of its normal, at 55° elevation
  const az = (Math.atan2(u[0], -u[1]) * 180) / Math.PI;
  await g.stage.view3D({ target: [t.x, t.y, 0], distance: h * 1.05, azimuth: az, elevation: 58, orbit: false, ms: 450 });
  await fn();
  await g.stage.view2D({ center: [t.x, t.y], height: h, ms: 450 });
}

/**
 * Play the move S on top of the current state M0 (the grid shows M0 to begin with), stage by stage.
 * Riders follow every frame. Resolves on the final state S·M0.
 */
export async function playMove(v: MoveView, S: Mat, M0: Mat = identity(2), ms = 1500, riders: Rider[] = [], sound = true): Promise<Mat> {
  let cur = M0;
  const stages = plan2(S);
  if (ms <= 0) {
    // instant (tests): the final frame only
    cur = matMul(S, M0);
    v.grid?.set(cur);
    v.flat.set(cur);
    riders.forEach((r) => r(embed(cur)));
    return cur;
  }
  const each = ms / stages.length;
  for (const st of stages) {
    if (st.kind === 'smooth') {
      if (sound) sfx.whoosh(each / 1000);
      await animate(each, (k) => {
        const W = matMul(smoothAt(st, k), cur);
        v.grid?.set(W);
        v.flat.set(W);
        riders.forEach((r) => r(embed(W)));
      }, ease.inOut);
    } else {
      const look = v.grid ? saveLook(v.grid) : null;
      const flatWas = v.flat.group.visible;
      v.grid?.setLook({ main: 0, axis: 0 });
      v.flat.show(true);
      const from = cur;
      await tilted(v.g, st.u, async () => {
        if (sound) sfx.warp();
        await animate(each * 1.3, (k) => {
          const W = flipAt(st, k, from);
          v.flat.set(W);
          riders.forEach((r) => r(W));
        }, ease.inOut);
      });
      if (look && v.grid) v.grid.setLook(look);
      v.flat.show(flatWas);
    }
    cur = matMul(stageEnd(st), cur);
    v.grid?.set(cur);
    v.flat.set(cur);
    riders.forEach((r) => r(embed(cur)));
  }
  return cur;
}

function saveLook(g: Grid2D): GridOpts {
  const u = g.mesh.material.uniforms;
  return { main: u.uMain.value as number, axis: u.uAxis.value as number };
}

/** A point riding a move: base position p (2-D or 3-D), call with the world matrix. */
export const ride = (p: readonly number[], set: (q: V3) => void): Rider => (W) => {
  const x = [p[0], p[1], p[2] ?? 0];
  set([0, 1, 2].map((i) => W[i][0] * x[0] + W[i][1] * x[1] + W[i][2] * x[2]) as V3);
};

// ------------------------------------------------------------------ Bench2

export interface Bench2Opts {
  M?: Mat;
  draggable?: boolean;
  /** Labels of the two column arrows (default a₁, a₂). null: no labels. */
  labels?: [string, string] | null;
  /** Grey arrows e₁, e₂ (the grid arrows before the move). */
  grey?: boolean;
  greyLabels?: boolean;
  /** The moved grid follows the columns live (default true). */
  live?: boolean;
  input?: boolean;
  inputLabel?: string;
  snap?: number | null;
  limit?: number;
  grid?: GridOpts;
  onChange?: (M: Mat) => void;
  onCommit?: (M: Mat) => void;
}

export class Bench2 {
  readonly grid: Grid2D;
  readonly flat: FlatGrid;
  readonly cols: (VectorHandle | Arrow)[];
  readonly greys: Arrow[] = [];
  readonly input: MatrixInput | null = null;
  M: Mat;
  live: boolean;
  private readonly p: PuzzleCtx;
  private readonly o: Bench2Opts;

  constructor(p: PuzzleCtx, o: Bench2Opts = {}) {
    this.p = p;
    this.o = o;
    this.M = (o.M ?? identity(2)).map((r) => r.slice());
    this.live = o.live ?? true;
    this.grid = p.grid(o.grid ?? { base: 0.3 });
    this.flat = new FlatGrid(p.g.stage, { extent: 9 });
    this.flat.show(false);
    p.add(this.flat);
    if (o.grey) {
      const gl = o.greyLabels !== false;
      this.greys = [
        new Arrow([0, 0, 0], [1, 0, 0], { color: GREY, width: 0.032, label: gl ? '$\\mathbf e_1$' : undefined, labelAt: 'mid', glow: 0.4 }),
        new Arrow([0, 0, 0], [0, 1, 0], { color: GREY, width: 0.032, label: gl ? '$\\mathbf e_2$' : undefined, labelAt: 'mid', glow: 0.4 }),
      ];
      p.add(...this.greys);
    }
    const labels = o.labels === undefined ? ['$\\mathbf a_1$', '$\\mathbf a_2$'] : o.labels;
    const colors = [C.v, C.w];
    this.cols = [0, 1].map((j) => {
      const label = labels ? labels[j] : undefined;
      if (o.draggable) {
        return new VectorHandle(p, {
          to: col2(this.M, j), color: colors[j], label, snap: o.snap, planar: true, limit: o.limit ?? 6,
          onChange: (tip) => { this.M[0][j] = tip[0]; this.M[1][j] = tip[1]; this.sync(false); },
          onCommit: () => o.onCommit?.(this.get()),
        });
      }
      const a = new Arrow([0, 0, 0], col2(this.M, j), { color: colors[j], label });
      p.add(a);
      return a;
    });
    if (o.input) {
      this.input = new MatrixInput({
        rows: 2, cols: 2, values: this.M, colourCols: true, label: o.inputLabel ?? 'A =', step: p.difficulty === 'commander' ? 0.1 : 0.5,
        onChange: (m) => { this.M = m; this.sync(true, false); },
        onSubmit: () => { p.move(); o.onCommit?.(this.get()); },
      });
      p.dock().appendChild(this.input.el);
    }
    this.sync(true, false);
  }

  get(): Mat { return this.M.map((r) => r.slice()); }
  arrow(j: number): Arrow { const c = this.cols[j]; return c instanceof VectorHandle ? c.arrow : c; }

  private sync(moveArrows = true, updateInput = true): void {
    if (this.live) this.grid.set(this.M);
    if (moveArrows) this.cols.forEach((_, j) => this.arrow(j).setTo(col2(this.M, j)));
    if (updateInput) this.input?.set(this.M);
    this.o.onChange?.(this.get());
  }

  set(M: Mat): void { this.M = M.map((r) => r.slice()); this.sync(); }

  /** Show the moved grid for M without touching the columns (e.g. after a blind commit). */
  showGrid(M: Mat): void { this.grid.set(M); }

  setLive(on: boolean): void { this.live = on; if (on) this.grid.set(this.M); else this.grid.set(identity(2)); }

  setDraggable(on: boolean): void { for (const c of this.cols) if (c instanceof VectorHandle) c.setEnabled(on); }

  /** Show me: the columns glide to M (the grid follows), then onCommit fires. */
  async to(M: Mat, ms = 1100): Promise<void> {
    if (ms <= 0) { this.set(M); return; }
    const M0 = this.get();
    sfx.whoosh(ms / 1000);
    await animate(ms, (k) => {
      this.M = M0.map((r, i) => r.map((x, j) => x + (M[i][j] - x) * k));
      this.sync(true, false);
    }, ease.inOut);
    this.M = M.map((r) => r.slice());
    this.sync();
  }

  async showMe(M: Mat, ms = 1100): Promise<void> { await this.to(M, ms); this.o.onCommit?.(this.get()); }

  /** Play a move on the grid (honest), from the square grid unless `from` is given. */
  play(S: Mat, ms = 1500, riders: Rider[] = [], from: Mat = identity(2)): Promise<Mat> {
    return playMove({ grid: this.grid, flat: this.flat, g: this.p.g }, S, from, ms, riders);
  }
}

// ------------------------------------------------------------------ Bench3

export interface Bench3Opts {
  M?: Mat;
  draggable?: boolean;
  labels?: [string, string, string] | null;
  input?: boolean;
  inputLabel?: string;
  live?: boolean;
  extent?: number;
  snap?: number | null;
  limit?: number;
  onChange?: (M: Mat) => void;
  onCommit?: (M: Mat) => void;
}

export class Bench3 {
  readonly lattice: Lattice3D;
  readonly cols: (VectorHandle | Arrow)[];
  readonly input: MatrixInput | null = null;
  M: Mat;
  live: boolean;
  private readonly o: Bench3Opts;

  constructor(p: PuzzleCtx, o: Bench3Opts = {}) {
    this.o = o;
    this.M = (o.M ?? identity(3)).map((r) => r.slice());
    this.live = o.live ?? true;
    this.lattice = new Lattice3D(p.g.stage, { extent: o.extent ?? 2, opacity: 0.5 });
    p.add(this.lattice);
    const labels = o.labels === undefined ? ['$\\mathbf a_1$', '$\\mathbf a_2$', '$\\mathbf a_3$'] : o.labels;
    const colors = [C.v, C.w, C.u];
    this.cols = [0, 1, 2].map((j) => {
      const label = labels ? labels[j] : undefined;
      if (o.draggable) {
        return new VectorHandle(p, {
          to: col3(this.M, j), color: colors[j], label, snap: o.snap, limit: o.limit ?? 3,
          onChange: (tip) => { for (let i = 0; i < 3; i++) this.M[i][j] = tip[i]; this.sync(false); },
          onCommit: () => o.onCommit?.(this.get()),
        });
      }
      const a = new Arrow([0, 0, 0], col3(this.M, j), { color: colors[j], label });
      p.add(a);
      return a;
    });
    if (o.input) {
      this.input = new MatrixInput({
        rows: 3, cols: 3, values: this.M, colourCols: true, label: o.inputLabel ?? 'A =', step: p.difficulty === 'commander' ? 0.1 : 0.5,
        onChange: (m) => { this.M = m; this.sync(true, false); },
        onSubmit: () => { p.move(); o.onCommit?.(this.get()); },
      });
      p.dock().appendChild(this.input.el);
    }
    this.sync(true, false);
  }

  get(): Mat { return this.M.map((r) => r.slice()); }
  arrow(j: number): Arrow { const c = this.cols[j]; return c instanceof VectorHandle ? c.arrow : c; }

  private sync(moveArrows = true, updateInput = true): void {
    if (this.live) this.lattice.set(this.M);
    if (moveArrows) this.cols.forEach((_, j) => this.arrow(j).setTo(col3(this.M, j)));
    if (updateInput) this.input?.set(this.M);
    this.o.onChange?.(this.get());
  }

  set(M: Mat): void { this.M = M.map((r) => r.slice()); this.sync(); }
  setLive(on: boolean): void { this.live = on; this.lattice.set(on ? this.M : identity(3)); }
  setDraggable(on: boolean): void { for (const c of this.cols) if (c instanceof VectorHandle) c.setEnabled(on); }
  show(on: boolean): void { this.lattice.object.visible = on; this.cols.forEach((_, j) => { this.arrow(j).object.visible = on; }); }

  async to(M: Mat, ms = 1200): Promise<void> {
    if (ms <= 0) { this.set(M); return; }
    const M0 = this.get();
    sfx.whoosh(ms / 1000);
    await animate(ms, (k) => {
      this.M = M0.map((r, i) => r.map((x, j) => x + (M[i][j] - x) * k));
      this.sync(true, false);
    }, ease.inOut);
    this.M = M.map((r) => r.slice());
    this.sync();
  }

  async showMe(M: Mat, ms = 1200): Promise<void> { await this.to(M, ms); this.o.onCommit?.(this.get()); }
}
