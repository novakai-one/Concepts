// A 3×3 matrix shown in 3-D: the moved lattice plus the three column arrows (where î, ĵ, k̂ land:
// green, red, blue). Optional: drag the column tips (Shift-drag for height), a typed 3×3 input,
// and the image of the unit cube (its volume is |det|).
import type { PuzzleCtx, V3 } from '../game/types';
import { Lattice3D, Parallelepiped } from '../gfx/shapes';
import { Arrow } from '../gfx/arrow';
import { C } from '../core/theme';
import { MatrixInput } from '../ui/widgets';
import { VectorHandle } from './handle';
import { animate, ease } from '../core/tween';
import { det, mlerp, type Mat } from '../math/la';
import { sfx } from '../audio/sfx';

export interface MatrixView3Opts {
  M?: Mat;
  draggable?: boolean;
  input?: boolean;
  showVolume?: boolean;
  labels?: boolean;
  extent?: number;
  onChange?: (M: Mat) => void;
  onCommit?: (M: Mat) => void;
  snap?: number | null;
}

const col = (M: Mat, j: number): V3 => [M[0][j], M[1][j], M[2][j]];

export class MatrixView3 {
  readonly lattice: Lattice3D;
  readonly cols: (VectorHandle | Arrow)[];
  readonly box: Parallelepiped | null = null;
  readonly input: MatrixInput | null = null;
  M: Mat;
  private readonly o: MatrixView3Opts;

  constructor(p: PuzzleCtx, o: MatrixView3Opts = {}) {
    this.o = o;
    this.M = (o.M ?? [[1, 0, 0], [0, 1, 0], [0, 0, 1]]).map((r) => r.slice());
    this.lattice = new Lattice3D(p.g.stage, { extent: o.extent ?? 3 });
    p.add(this.lattice);
    if (o.showVolume) {
      this.box = new Parallelepiped(p.g.stage, col(this.M, 0), col(this.M, 1), col(this.M, 2), { color: C.result, opacity: 0.16 });
      p.add(this.box);
    }
    const colors = [C.v, C.w, C.u];
    const labels = ['$A\\mathbf e_1$', '$A\\mathbf e_2$', '$A\\mathbf e_3$'];
    this.cols = [0, 1, 2].map((j) => {
      const label = o.labels === false ? undefined : labels[j];
      if (o.draggable) {
        return new VectorHandle(p, {
          to: col(this.M, j), color: colors[j], label, snap: o.snap, limit: 6,
          onChange: (tip) => { for (let i = 0; i < 3; i++) this.M[i][j] = tip[i]; this.sync(false); },
          onCommit: () => o.onCommit?.(this.get()),
        });
      }
      const a = new Arrow([0, 0, 0], col(this.M, j), { color: colors[j], label });
      p.add(a);
      return a;
    });
    if (o.input) {
      this.input = new MatrixInput({
        rows: 3, cols: 3, values: this.M, colourCols: true, label: 'A =', step: p.difficulty === 'commander' ? 0.1 : 0.5,
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

  private sync(moveArrows = true, updateInput = true): void {
    this.lattice.set(this.M);
    if (moveArrows) this.cols.forEach((c, j) => this.arrowOf(c).setTo(col(this.M, j)));
    if (this.box) {
      this.box.set(col(this.M, 0), col(this.M, 1), col(this.M, 2));
      this.box.setColor(det(this.M) < 0 ? C.orange : C.result);
    }
    if (updateInput) this.input?.set(this.M);
    this.o.onChange?.(this.get());
  }

  set(M: Mat): void { this.M = M.map((r) => r.slice()); this.sync(); }

  async to(M: Mat, ms = 1600, sound = true): Promise<void> {
    const M0 = this.get();
    if (sound) sfx.whoosh(ms / 1000);
    await animate(ms, (k) => { this.M = mlerp(M0, M, k); this.sync(true, false); }, ease.inOut);
    this.M = M.map((r) => r.slice());
    this.sync();
  }

  async showMe(M: Mat, ms = 1600): Promise<void> {
    await this.to(M, ms);
    this.o.onCommit?.(this.get());
  }
}

export function apply3(M: Mat, v: number[]): V3 {
  return [0, 1, 2].map((i) => M[i][0] * v[0] + M[i][1] * v[1] + M[i][2] * v[2]) as V3;
}
