// A 2×2 matrix shown the way the game always shows it: the moved grid, plus the two arrows that
// say where î and ĵ land (the columns: green = column 1, red = column 2). Optionally the player can
// drag the column tips to set the matrix, and/or type it into a matrix input. Everything stays in sync.
import type { PuzzleCtx, V3 } from '../game/types';
import { Grid2D, type GridOpts } from '../gfx/grid';
import { Arrow } from '../gfx/arrow';
import { Parallelogram } from '../gfx/shapes';
import { C } from '../core/theme';
import { MatrixInput } from '../ui/widgets';
import { VectorHandle } from './handle';
import { animate, ease } from '../core/tween';
import { det, interpMat2, type Mat } from '../math/la';
import { sfx } from '../audio/sfx';

export interface MatrixViewOpts {
  M?: Mat;                       // starting matrix (default identity)
  draggable?: boolean;           // drag the column tips
  input?: boolean;               // show a typed matrix input in the dock
  showArea?: boolean;            // shade the unit square's image (area = |det|)
  labels?: boolean | [string, string]; // label the columns (true: Ae₁ and Ae₂; or the two labels)
  colors?: [string, string];     // the two column colours (default green and red)
  grid?: GridOpts;
  onChange?: (M: Mat) => void;
  onCommit?: (M: Mat) => void;
  snap?: number | null;
}

export class MatrixView {
  readonly grid: Grid2D;
  readonly c1: VectorHandle | Arrow;
  readonly c2: VectorHandle | Arrow;
  readonly area: Parallelogram | null = null;
  readonly input: MatrixInput | null = null;
  M: Mat;
  private readonly o: MatrixViewOpts;

  constructor(p: PuzzleCtx, o: MatrixViewOpts = {}) {
    this.o = o;
    this.M = (o.M ?? [[1, 0], [0, 1]]).map((r) => r.slice());
    this.grid = p.grid(o.grid);
    if (o.showArea) {
      this.area = new Parallelogram(p.g.stage, [this.M[0][0], this.M[1][0], 0], [this.M[0][1], this.M[1][1], 0], { color: C.result, opacity: 0.18 });
      p.add(this.area);
    }
    const [l1, l2] = o.labels === false ? [undefined, undefined] : Array.isArray(o.labels) ? o.labels : ['$A\\mathbf e_1$', '$A\\mathbf e_2$'];
    if (o.draggable) {
      const mk = (j: 0 | 1, color: string, label?: string) => new VectorHandle(p, {
        to: [this.M[0][j], this.M[1][j], 0], color, label, labelGap: Array.isArray(o.labels) ? 0.8 : undefined, snap: o.snap, planar: true, limit: 9,
        onChange: (tip) => { this.M[0][j] = tip[0]; this.M[1][j] = tip[1]; this.sync(false); },
        onCommit: () => o.onCommit?.(this.get()),
      });
      this.c1 = mk(0, o.colors?.[0] ?? C.v, l1);
      this.c2 = mk(1, o.colors?.[1] ?? C.w, l2);
    } else {
      this.c1 = new Arrow([0, 0, 0], [this.M[0][0], this.M[1][0], 0], { color: o.colors?.[0] ?? C.v, label: l1 });
      this.c2 = new Arrow([0, 0, 0], [this.M[0][1], this.M[1][1], 0], { color: o.colors?.[1] ?? C.w, label: l2 });
      p.add(this.c1, this.c2);
    }
    if (o.input) {
      this.input = new MatrixInput({
        rows: 2, cols: 2, values: this.M, colourCols: true, label: 'A =', step: p.difficulty === 'commander' ? 0.1 : 0.5,
        onChange: (m) => { this.M = m; this.sync(true, false); },
        onSubmit: () => { p.move(); o.onCommit?.(this.get()); },
      });
      p.dock().appendChild(this.input.el);
    }
    this.sync(true, false);
  }

  get(): Mat { return this.M.map((r) => r.slice()); }
  get det(): number { return det(this.M); }

  private arrowOf(x: VectorHandle | Arrow): Arrow { return x instanceof VectorHandle ? x.arrow : x; }

  /** Push the matrix to the grid, arrows, area and input. */
  private sync(moveArrows = true, updateInput = true): void {
    this.grid.set(this.M);
    const a: V3 = [this.M[0][0], this.M[1][0], 0], b: V3 = [this.M[0][1], this.M[1][1], 0];
    if (moveArrows) { this.arrowOf(this.c1).setTo(a); this.arrowOf(this.c2).setTo(b); }
    this.area?.set(a, b);
    if (this.area) this.area.setColor(det(this.M) < 0 ? C.orange : C.result);
    if (updateInput) this.input?.set(this.M);
    this.o.onChange?.(this.get());
  }

  /** Set immediately. */
  set(M: Mat): void { this.M = M.map((r) => r.slice()); this.sync(); }

  /** Animate from the current matrix to M (every entry moves in a straight line). */
  async to(M: Mat, ms = 1400, sound = true, mode: 'linear' | 'polar' | 'auto' = 'auto'): Promise<void> {
    const M0 = this.get();
    if (sound) sfx.whoosh(ms / 1000);
    await animate(ms, (k) => { this.M = interpMat2(M0, M, k, mode); this.sync(true, false); }, ease.inOut);
    this.M = M.map((r) => r.slice());
    this.sync();
  }

  /** Show me: animate to M, then fire onCommit. */
  async showMe(M: Mat, ms = 1400): Promise<void> {
    await this.to(M, ms);
    this.o.onCommit?.(this.get());
  }

  setDraggable(on: boolean): void {
    for (const c of [this.c1, this.c2]) if (c instanceof VectorHandle) c.setEnabled(on);
  }
}

/** Where a point lands under M (2-D). */
export function apply2(M: Mat, v: number[]): V3 {
  return [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1], 0];
}
