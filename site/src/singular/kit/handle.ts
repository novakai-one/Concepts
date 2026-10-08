// A vector you can grab: an arrow whose tip follows the pointer, with snapping, constraints,
// tick sounds as it crosses grid points, and a change callback. The standard way puzzles let the
// player set a vector.
import { Vector3 } from 'three';
import { Arrow, type ArrowOpts } from '../gfx/arrow';
import type { PuzzleCtx, V3 } from '../game/types';
import { sfx } from '../audio/sfx';

export interface HandleOpts extends ArrowOpts {
  from?: V3;
  to: V3;
  /** Override snapping (default: the difficulty's snap). */
  snap?: number | null;
  /** Restrict where the tip may go (e.g. onto a line). */
  constrain?: (p: Vector3) => Vector3;
  /** Keep the tip on z = 0 even in 3-D views. */
  planar?: boolean;
  /** Called while dragging. */
  onChange?: (tip: V3) => void;
  /** Called when the drag ends (count a move here). */
  onCommit?: (tip: V3) => void;
  /** Count a move automatically on each drag end (default true). */
  countMoves?: boolean;
  /** Clamp each coordinate to ±limit. */
  limit?: number;
}

export class VectorHandle {
  readonly arrow: Arrow;
  private readonly o: HandleOpts;
  private lastKey = '';
  enabled = true;

  constructor(p: PuzzleCtx, o: HandleOpts) {
    this.o = o;
    this.arrow = new Arrow(o.from ?? [0, 0, 0], o.to, { handle: true, ...o });
    p.add(this.arrow);
    const handle = p.g.drag.add({
      target: this.arrow.grab,
      getPos: () => this.arrow.to.clone(),
      snap: () => (o.snap !== undefined ? o.snap : p.snap()),
      constrain: (q) => {
        let r = q;
        if (o.limit) r = new Vector3(clamp(r.x, o.limit), clamp(r.y, o.limit), clamp(r.z, o.limit));
        if (o.planar || p.g.stage.mode === '2d') r.z = this.arrow.to.z;
        return o.constrain ? o.constrain(r) : r;
      },
      planar: o.planar,
      onMove: (q) => {
        if (!this.enabled) return;
        this.arrow.setTo(q);
        const k = `${Math.round(q.x * 2)},${Math.round(q.y * 2)},${Math.round(q.z * 2)}`;
        if (k !== this.lastKey) { this.lastKey = k; sfx.tick(q.y + q.z); }
        o.onChange?.(this.tip);
      },
      onEnd: () => {
        if (!this.enabled) return;
        if (o.countMoves !== false) p.move();
        o.onCommit?.(this.tip);
      },
    });
    p.onDispose(() => handle.remove());
  }

  get tip(): V3 { return [this.arrow.to.x, this.arrow.to.y, this.arrow.to.z]; }
  get tail(): V3 { return [this.arrow.from.x, this.arrow.from.y, this.arrow.from.z]; }
  /** The vector itself (tip − tail). */
  get vec(): V3 { const t = this.tip, f = this.tail; return [t[0] - f[0], t[1] - f[1], t[2] - f[2]]; }

  set(to: V3, from?: V3): void { this.arrow.set(from ?? this.tail, to); this.o.onChange?.(this.tip); }

  /** Animate the tip to a place (Show me), then fire onChange/onCommit. */
  async moveTo(to: V3, ms = 900, from?: V3): Promise<void> {
    await this.arrow.moveTo(to, ms, from);
    this.o.onChange?.(this.tip);
    this.o.onCommit?.(this.tip);
  }

  setEnabled(on: boolean): void { this.enabled = on; this.arrow.showHandle(on); }
}

const clamp = (x: number, l: number) => Math.max(-l, Math.min(l, x));

/** True if two points are within tol of each other. */
export function near(a: V3 | number[], b: V3 | number[], tol = 0.05): boolean {
  return Math.hypot(a[0] - b[0], a[1] - b[1], (a[2] ?? 0) - (b[2] ?? 0)) <= tol;
}
