// Small scene parts shared by Chapters 11 and 12: the commit button (Space), the white dashed gap a
// miss leaves behind, a turning arc with a head (which way round a move turns the grid), and a
// tip-to-tail chain of column copies (A x drawn as a mix of the columns).
import type { PuzzleCtx, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { Dot } from '../../../gfx/markers';
import { button } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';

/** An animation, or (fast: tests and Show-me-free solves) the final frame at once, with no frame awaited. */
export function step(fast: boolean, ms: number, fn: (k: number) => void, e = ease.inOut): Promise<void> {
  if (fast || ms <= 0) { fn(1); return Promise.resolve(); }
  return animate(ms, fn, e);
}
/** A pause that is skipped in fast mode. */
export const pause = (fast: boolean, ms: number): Promise<void> => (fast || ms <= 0 ? Promise.resolve() : wait(ms));

/** A primary dock button that also fires on Space (outside text fields). */
export function commitButton(p: PuzzleCtx, label: string, fn: () => void, mount?: HTMLElement): HTMLButtonElement {
  const b = button(label, fn, { cls: 'primary', kbd: 'Space' });
  (mount ?? p.dock()).appendChild(b);
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== ' ' || p.won || b.disabled || b.hidden) return;
    const t = e.target as HTMLElement | null;
    if (t && ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(t.tagName)) return;
    if (p.g.dialogue.active) return;
    e.preventDefault();
    fn();
  };
  document.addEventListener('keydown', onKey);
  p.onDispose(() => document.removeEventListener('keydown', onKey));
  return b;
}

/** A plain dock button (secondary). */
export function dockButton(p: PuzzleCtx, label: string, fn: () => void, mount?: HTMLElement, cls = 'small'): HTMLButtonElement {
  const b = button(label, fn, { cls });
  (mount ?? p.dock()).appendChild(b);
  return b;
}

/** The white dashed gap between where you said and where it went. */
export class Gap {
  private readonly line: FatLine;
  private readonly label: Label;
  private readonly end: Dot;
  constructor(p: PuzzleCtx) {
    this.line = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 0]], { color: C.white, width: 2, dashed: true, opacity: 0.9, dashSize: 0.14, gapSize: 0.1 });
    this.label = new Label('', [0, 0, 0], { className: 'coord' });
    this.end = new Dot([0, 0, 0], { color: C.white, size: 0.05, glow: 0.8 });
    p.add(this.line.object, this.label.object, this.end);
    p.onDispose(() => { this.line.dispose(); this.label.dispose(); });
    this.hide();
  }
  show(from: readonly number[], to: readonly number[], text = 'gap'): void {
    const a: V3 = [from[0], from[1], from[2] ?? 0], b: V3 = [to[0], to[1], to[2] ?? 0];
    this.line.setPoints([a, b]);
    this.line.setOpacity(0.9);
    this.end.at(b);
    this.end.setOpacity(1);
    const mid: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const d = [b[0] - a[0], b[1] - a[1]];
    const n = Math.hypot(d[0], d[1]) || 1;
    // put the label on the upper side of the dashed line (labels at the line's ends sit below it less often)
    let nx = -d[1] / n, ny = d[0] / n;
    if (ny < 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }
    this.label.at([mid[0] + nx * 0.38, mid[1] + ny * 0.38, mid[2] + 0.05]);
    this.label.set(text);
    this.label.show(true);
  }
  hide(): void { this.line.setOpacity(0); this.end.setOpacity(0); this.label.show(false); }
}

/** An arc around the origin from the direction of `a` turning `sense` (+1 counterclockwise) to `b`, with a head. */
export class TurnArc {
  private readonly line: FatLine;
  private readonly head: Arrow;
  private readonly label: Label;
  constructor(p: PuzzleCtx, private readonly radius: number, color: string, text: string, dashed = false) {
    this.line = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 0]], { color, width: 2.2, dashed, opacity: 0.95, intensity: 1.2 });
    this.head = new Arrow([0, 0, 0], [0.01, 0, 0], { color, width: 0.03, glow: 1 });
    this.label = new Label(text, [0, 0, 0], { className: 'coord', color });
    p.add(this.line.object, this.head, this.label.object);
    p.onDispose(() => { this.line.dispose(); this.label.dispose(); });
    this.show(false);
  }
  set(a: readonly number[], b: readonly number[], sense: number): void {
    const a0 = Math.atan2(a[1], a[0]);
    let a1 = Math.atan2(b[1], b[0]);
    if (sense > 0) { while (a1 <= a0 + 1e-6) a1 += 2 * Math.PI; } else { while (a1 >= a0 - 1e-6) a1 -= 2 * Math.PI; }
    const n = 48, r = this.radius;
    const pts: V3[] = [];
    for (let i = 0; i <= n; i++) { const t = a0 + ((a1 - a0) * i) / n; pts.push([r * Math.cos(t), r * Math.sin(t), 0.02]); }
    this.line.setPoints(pts);
    const end = pts[n], before = pts[n - 3];
    this.head.set(before, end);
    const mid = (a0 + a1) / 2;
    this.label.at([(r + 0.45) * Math.cos(mid), (r + 0.45) * Math.sin(mid), 0]);
    this.show(true);
  }
  setText(t: string): void { this.label.set(t); }
  show(v: boolean): void { this.line.object.visible = v; this.head.object.visible = v; this.label.show(v); }
}

/**
 * Draw A x as copies of the columns tip to tail: weights[j] copies of column j (whole copies drawn
 * one by one when the weight is a whole number, otherwise one scaled copy). Resolves when drawn.
 */
export async function tipToTail(p: PuzzleCtx, cols: V3[], weights: number[], colors: string[], ms = 380): Promise<Arrow[]> {
  const out: Arrow[] = [];
  let at: V3 = [0, 0, 0];
  for (let j = 0; j < cols.length; j++) {
    const w = weights[j];
    if (Math.abs(w) < 1e-9) continue;
    const whole = Math.abs(w - Math.round(w)) < 1e-9 && Math.abs(w) <= 4;
    const pieces = whole ? Math.abs(Math.round(w)) : 1;
    const stepW = whole ? Math.sign(w) : w;
    for (let k = 0; k < pieces; k++) {
      const to: V3 = [at[0] + cols[j][0] * stepW, at[1] + cols[j][1] * stepW, at[2] + cols[j][2] * stepW];
      const a = new Arrow(at, ms > 0 ? at : to, { color: colors[j], width: 0.036, opacity: 0.85 });
      p.add(a);
      out.push(a);
      if (ms > 0) { sfx.tick(out.length); await a.moveTo(to, ms, at); }
      at = to;
    }
    if (ms > 0) await wait(80);
  }
  return out;
}

/** Fade a set of arrows out (and remove them). */
export async function fadeOut(arrows: Arrow[], ms = 400): Promise<void> {
  if (ms > 0) await animate(ms, (k) => arrows.forEach((a) => a.setOpacity(1 - k)), ease.out);
  arrows.forEach((a) => a.dispose());
}
