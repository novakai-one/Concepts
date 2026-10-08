// The undo bench (GDD §3.5, Ch 13): the moved grid over a faint ghost of the original, the bow frame
// plan where the move left it and a dashed ghost where it was built. The player builds the undo U by
// dragging where U sends the two grid arrows (green, red) or by typing it; Fire plays U on top of the
// damage, honestly, and the frames either land on their ghost or stay where they landed with the gap drawn.
import type { PuzzleCtx, V3 } from '../../../game/types';
import type { Grid2D } from '../../../gfx/grid';
import { FatSegments } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { MatrixInput } from '../../../ui/widgets';
import { h, button } from '../../../ui/ui';
import { VectorHandle } from '../../../kit/handle';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { burst } from '../../../gfx/fx';
import { fromCols, identity, matMul, matVec, type Mat } from '../../../math/la';
import { FlatGrid, playMove } from './play';
import { BOW_CORNERS, FramePlan, PLAN_COLOR } from './frames';
import { fmtV, texM, undoes } from './logic';

export interface UndoBenchOpts {
  /** The damage: the move already applied to the frames. */
  A: Mat;
  /** The undo to start from (default: the identity, "do nothing"). */
  U0?: Mat;
  /** Readout title. */
  title?: string;
  /** Called after Fire with the outcome. */
  onFire?: (U: Mat, ok: boolean) => void;
  /** Called whenever U changes. */
  onChange?: (U: Mat) => void;
  /** Win tolerance. */
  tol: number;
  /** Show the dashed preview of U·A while building (cadet always; navigator after the first Fire). */
  preview: 'live' | 'after-fire' | 'never';
  /** Drag snapping for U's columns. */
  snap: number | null;
  /** Extra text under the matrix input (markdown-free plain line). */
  hint?: string;
}

const col = (M: Mat, j: number): V3 => [M[0][j], M[1][j], 0];

export class UndoBench {
  readonly grid: Grid2D;
  readonly flat: FlatGrid;
  readonly plan: FramePlan;
  readonly ghost: FramePlan;
  readonly preview: FramePlan;
  readonly c1: VectorHandle;
  readonly c2: VectorHandle;
  readonly input: MatrixInput;
  readonly fireBtn: HTMLButtonElement;
  private readonly gap: FatSegments;
  private readonly gapLabel: Label;
  private readonly p: PuzzleCtx;
  private readonly o: UndoBenchOpts;
  U: Mat;
  /** What the frames show now (2×2). */
  W: Mat;
  private fired = false;
  private busy = false;
  private landed = false;
  /** Off once the puzzle moves past the bench (c13-p6's probe): no drags, no typing, no Fire. */
  private enabled = true;

  constructor(p: PuzzleCtx, o: UndoBenchOpts) {
    this.p = p;
    this.o = o;
    this.U = (o.U0 ?? identity(2)).map((r) => r.slice());
    this.W = o.A.map((r) => r.slice());
    this.grid = p.grid({ base: 0.42, main: 0.55, axis: 0.45 });
    this.grid.set(o.A);
    this.flat = new FlatGrid(p.g.stage);
    p.add(this.flat);
    this.ghost = new FramePlan(p.g.stage, { color: '#8fa3c4', opacity: 0.55, fill: 0, dashed: true, width: 1.6 }, 0.004);
    this.ghost.set(identity(2));
    this.preview = new FramePlan(p.g.stage, { color: C.result, opacity: 0.8, fill: 0, dashed: true, width: 1.8, door: false }, 0.006);
    this.preview.setOpacity(0);
    this.plan = new FramePlan(p.g.stage, {}, 0.01);
    this.plan.set(o.A);
    this.gap = new FatSegments(p.g.stage, [], { color: C.orange, width: 2, opacity: 0.9, dashed: true, dashSize: 0.12, gapSize: 0.1 });
    this.gap.setOpacity(0);
    this.gapLabel = new Label('', [0, 0, 0], { className: 'small' });
    this.gapLabel.show(false);
    p.add(this.ghost, this.preview, this.plan, this.gap.object, this.gapLabel.object);
    p.onDispose(() => { this.gap.dispose(); this.gapLabel.dispose(); });

    // U's columns: where the undo sends the two grid arrows
    const mk = (j: 0 | 1, color: string, label: string) => new VectorHandle(p, {
      to: col(this.U, j), color, label, snap: o.snap, planar: true, limit: 4,
      onChange: (tip) => { this.U[0][j] = tip[0]; this.U[1][j] = tip[1]; this.changed(false); },
      onCommit: () => this.committed(),
    });
    this.c1 = mk(0, C.v, '$U\\mathbf e_1$');
    this.c2 = mk(1, C.w, '$U\\mathbf e_2$');

    this.input = new MatrixInput({
      rows: 2, cols: 2, values: this.U, colourCols: true, label: 'U =', step: o.snap ?? 0.5,
      onChange: (m) => {
        // a locked cell still takes arrow keys, so put the value back
        if (!this.enabled) { this.input.set(this.U); return; }
        this.U = m; this.c1.arrow.setTo(col(m, 0)); this.c2.arrow.setTo(col(m, 1)); this.changed(true);
      },
      onSubmit: () => void this.fire(),
    });
    this.fireBtn = button('Fire the undo', () => void this.fire(), { cls: 'primary', kbd: 'Space' });
    const onKey = (e: KeyboardEvent) => {
      if (!this.enabled || e.key !== ' ' || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || p.g.dialogue.active) return;
      e.preventDefault();
      void this.fire();
    };
    document.addEventListener('keydown', onKey);
    p.onDispose(() => document.removeEventListener('keydown', onKey));
    p.dock().append(
      h('div', { class: 'kicker' }, 'The undo'),
      h('div', { style: 'display:flex;gap:14px;align-items:center;flex-wrap:wrap' }, this.input.el, this.fireBtn),
      h('div', { class: 'c-muted', style: 'font-size:12.5px;line-height:1.4;max-width:420px' }, o.hint ?? 'Drag the green and red tips: where the undo sends the two grid arrows. Or type the numbers.'));
    this.paint();
  }

  /** The dashed preview shows where U would send the frames. */
  private paint(): void {
    const show = this.o.preview === 'live' || (this.o.preview === 'after-fire' && this.fired);
    const UA = matMul(this.U, this.o.A);
    this.preview.set(UA);
    this.preview.setOpacity(show && !this.landed ? 1 : 0);
  }

  private changed(fromInput: boolean): void {
    if (!fromInput) this.input.set(this.U);
    void this.backToDamage();
    this.paint();
    this.o.onChange?.(this.U.map((r) => r.slice()));
  }

  private committed(): void { sfx.snap(); }

  /** After a miss, the frames go back to the damage (the jacks release) as soon as U changes. */
  private async backToDamage(): Promise<void> {
    if (!this.landed || this.busy) return;
    this.landed = false;
    this.gap.setOpacity(0);
    this.gapLabel.show(false);
    this.plan.setColor(PLAN_COLOR);
    await animate(160, (k) => this.plan.setOpacity(1 - k), ease.out);
    this.W = this.o.A.map((r) => r.slice());
    this.plan.set(this.W);
    this.grid.set(this.W);
    await animate(220, (k) => this.plan.setOpacity(k), ease.out);
    this.paint();
  }

  /** Set U (Show me / tests), moving the handles and the input. */
  async setU(U: Mat, ms = 700): Promise<void> {
    await this.backToDamage();
    if (ms > 0) await Promise.all([this.c1.arrow.moveTo(col(U, 0), ms), this.c2.arrow.moveTo(col(U, 1), ms)]);
    this.U = U.map((r) => r.slice());
    this.c1.arrow.setTo(col(U, 0));
    this.c2.arrow.setTo(col(U, 1));
    this.input.set(this.U);
    this.paint();
    this.o.onChange?.(this.U.map((r) => r.slice()));
  }

  /** Play U on top of the damage. Resolves true when every point is back. */
  async fire(): Promise<boolean> {
    if (this.busy || this.p.won || !this.enabled) return false;
    if (this.landed) await this.backToDamage();
    this.busy = true;
    this.p.move();
    this.fired = true;
    this.preview.setOpacity(0);
    this.c1.setEnabled(false);
    this.c2.setEnabled(false);
    this.fireBtn.disabled = true;
    try {
      this.W = await playMove({ g: this.p.g, grid: this.grid, flat: this.flat }, this.U, this.o.A, 1500, [(W) => this.plan.set(W)]);
      this.landed = true;
      const ok = undoes(this.U, this.o.A, this.o.tol);
      if (ok) {
        this.plan.setColor(C.good);
        sfx.success();
        void burst(this.p.g.stage, [0.25, 0, 0.05], C.good, 70, 3);
      } else {
        sfx.miss();
        this.showGap();
      }
      this.o.onFire?.(this.U.map((r) => r.slice()), ok);
      return ok;
    } finally {
      this.busy = false;
      this.c1.setEnabled(this.enabled);
      this.c2.setEnabled(this.enabled);
      this.fireBtn.disabled = !this.enabled;
      if (!this.p.won) this.paint();
    }
  }

  /** Draw where three corners of the frames landed against where they were built. */
  private showGap(): void {
    const segs: [V3, V3][] = BOW_CORNERS.map((c) => {
      const q = matVec(this.W, c);
      return [[q[0], q[1], 0.03], [c[0], c[1], 0.03]] as [V3, V3];
    });
    this.gap.setSegments(segs);
    this.gap.setOpacity(0.9);
    const nose = matVec(this.W, [3, 0]);
    this.gapLabel.at([nose[0], nose[1] + 0.45, 0]);
    this.gapLabel.set(`nose at ${fmtV(nose)}, built at (3, 0)`);
    this.gapLabel.show(true);
  }

  /** U·A as TeX, for readouts. */
  productTex(): string { return texM(matMul(this.U, this.o.A).map((r) => r.map((x) => Math.round(x * 1000) / 1000))); }
  undoTex(): string { return texM(this.U.map((r) => r.map((x) => Math.round(x * 1000) / 1000))); }

  /** Where A sends each of U's columns (for the "undo by landing spots" check). */
  landings(): [V3, V3] {
    const a = matVec(this.o.A, [this.U[0][0], this.U[1][0]]), b = matVec(this.o.A, [this.U[0][1], this.U[1][1]]);
    return [[a[0], a[1], 0], [b[0], b[1], 0]];
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.c1.setEnabled(on);
    this.c2.setEnabled(on);
    this.fireBtn.disabled = !on;
    for (const i of [0, 1]) for (const j of [0, 1]) this.input.setLocked(i, j, !on);
  }

  /** A short pause the tests can wait on. */
  static async settle(ms = 200): Promise<void> { await wait(ms); }
}

export const colsOf = (a: readonly number[], b: readonly number[]): Mat => fromCols([[a[0], a[1]], [b[0], b[1]]]);
