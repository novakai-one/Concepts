// The player moves a 2-D chart: one finger (or the mouse) drags empty chart to pan, two fingers pinch
// to zoom, the wheel or trackpad zooms around the cursor. 3-D views use OrbitControls instead (stage.ts).
// A handle grab never reaches this: DragManager and the puzzles' own grabbers stop the pointerdown on the
// canvas, and this listens on the canvas's parent. A tap still reaches the puzzle: panning starts only
// after the pointer has moved more than SLOP pixels.
import type { Stage } from './stage';

const SLOP = 8;

interface Pt { x: number; y: number; x0: number; y0: number }

export class ViewNav {
  private readonly pts = new Map<number, Pt>();
  private panning = false;

  /** `busy`: true while something else owns the pointer (a handle is being dragged). */
  constructor(private readonly stage: Stage, private readonly busy: () => boolean) {
    const box = stage.container;
    box.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e));
    box.addEventListener('wheel', (e) => this.wheel(e), { passive: false });
  }

  /** Only a straight 2-D view without orbit controls is moved here. */
  private get on(): boolean { return this.stage.mode === '2d' && !this.stage.controls; }

  private down(e: PointerEvent): void {
    if (!this.on || (e.pointerType === 'mouse' && e.button !== 0)) return;
    this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    // a second finger: pinch at once (two fingers are never a tap)
    if (this.pts.size >= 2) this.start();
  }

  private start(): void {
    this.panning = true;
    this.stage.renderer.domElement.style.cursor = 'grabbing';
  }

  private stop(): void {
    this.pts.clear();
    if (this.panning) this.stage.renderer.domElement.style.cursor = '';
    this.panning = false;
  }

  private move(e: PointerEvent): void {
    const p = this.pts.get(e.pointerId);
    if (!p) return;
    if (!this.on || this.busy()) { this.stop(); return; }
    if (!this.panning) {
      if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) <= SLOP) return;
      this.start();
    }
    const to = { x: e.clientX, y: e.clientY };
    const other = [...this.pts.entries()].find(([id]) => id !== e.pointerId)?.[1];
    if (!other) this.stage.userMove(p, to);
    else {
      // pinch: the midpoint pans, the finger spread zooms around it
      const d0 = Math.hypot(p.x - other.x, p.y - other.y), d1 = Math.hypot(to.x - other.x, to.y - other.y);
      const m0 = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 }, m1 = { x: (to.x + other.x) / 2, y: (to.y + other.y) / 2 };
      this.stage.userMove(m0, m1, d0 > 1 && d1 > 1 ? d1 / d0 : 1);
    }
    p.x = to.x; p.y = to.y;
  }

  private up(e: PointerEvent): void {
    if (!this.pts.delete(e.pointerId)) return;
    if (!this.pts.size) this.stop();
  }

  private wheel(e: WheelEvent): void {
    if (!this.on || this.busy()) return;
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    // a trackpad pinch arrives as a wheel with ctrlKey and small steps
    const k = Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015));
    const at = { x: e.clientX, y: e.clientY };
    this.stage.userMove(at, at, k);
  }
}
