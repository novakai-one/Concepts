// Pointer dragging of objects on the stage (mouse, pen and touch through pointer events).
// 2-D: points move on the z = 0 plane. 3-D: points move on a horizontal plane through them;
// hold Shift to move straight up or down instead.
import { Plane, Vector3, type Object3D } from 'three';
import type { Stage } from './stage';

export interface DragOpts {
  target: Object3D;
  /** Current position of the dragged point (used to build the drag plane in 3-D). */
  getPos: () => Vector3;
  onMove: (p: Vector3) => void;
  onStart?: () => void;
  onEnd?: () => void;
  /** Round to this step (e.g. 1 for whole numbers, 0.5 for halves). */
  snap?: () => number | null;
  /** Final say on where the point may go (e.g. stay on a line). */
  constrain?: (p: Vector3) => Vector3;
  /** Only move on the z = 0 plane even in 3-D views. */
  planar?: boolean;
}

export interface DragHandle { remove(): void; enabled: boolean }

export class DragManager {
  private readonly items = new Set<DragOpts & DragHandle>();
  private active: (DragOpts & DragHandle) | null = null;
  private plane = new Plane();
  private vertical = false;
  private grabOffset = new Vector3();
  /** True while anything is being dragged (other systems can ignore clicks). */
  dragging = false;
  /** The handle last grabbed: arrow keys nudge it. */
  private last: (DragOpts & DragHandle) | null = null;
  private nudgeTimer = 0;

  constructor(private readonly stage: Stage) {
    const el = stage.renderer.domElement;
    el.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', () => this.up());
    window.addEventListener('pointercancel', () => this.up());
    window.addEventListener('keydown', (e) => this.key(e));
  }

  /** Arrow keys move the last grabbed handle one snap step (Shift: five steps; PageUp/Down: height in 3-D). */
  private key(e: KeyboardEvent): void {
    const item = this.last;
    if (!item || !this.items.has(item) || !item.enabled || this.active) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON' || t.isContentEditable)) return;
    const dirs: Record<string, [number, number, number]> = {
      ArrowLeft: [-1, 0, 0], ArrowRight: [1, 0, 0], ArrowUp: [0, 1, 0], ArrowDown: [0, -1, 0], PageUp: [0, 0, 1], PageDown: [0, 0, -1],
    };
    const d = dirs[e.key];
    if (!d) return;
    if (d[2] && this.stage.mode === '2d') return;
    e.preventDefault();
    const step = (item.snap?.() ?? 0.1) * (e.shiftKey ? 5 : 1);
    let p = item.getPos().add(new Vector3(d[0] * step, d[1] * step, d[2] * step));
    const s = item.snap?.();
    if (s) p.set(Math.round(p.x / s) * s, Math.round(p.y / s) * s, Math.round(p.z / s) * s);
    if (item.constrain) p = item.constrain(p);
    item.onMove(p);
    window.clearTimeout(this.nudgeTimer);
    this.nudgeTimer = window.setTimeout(() => { if (this.items.has(item)) item.onEnd?.(); }, 650);
  }

  add(o: DragOpts): DragHandle {
    const item = Object.assign(o, {
      enabled: true,
      remove: () => { this.items.delete(item); if (this.active === item) this.up(); },
    });
    this.items.add(item);
    if (!this.last) this.last = item;
    return item;
  }

  clear(): void { this.items.clear(); this.active = null; this.last = null; this.dragging = false; }

  private hit(e: PointerEvent): (DragOpts & DragHandle) | null {
    const list = [...this.items].filter((i) => i.enabled && i.target.visible !== false);
    if (!list.length) return null;
    const obj = this.stage.pick(e.clientX, e.clientY, list.map((i) => i.target));
    if (!obj) return null;
    return list.find((i) => i.target === obj || isAncestor(i.target, obj)) ?? null;
  }

  private down(e: PointerEvent): void {
    const item = this.hit(e);
    if (!item) return;
    e.preventDefault();
    e.stopPropagation();
    this.active = item;
    this.last = item;
    this.dragging = true;
    this.vertical = e.shiftKey && this.stage.mode === '3d' && !item.planar;
    const p = item.getPos();
    this.setPlane(p, item);
    const at = this.stage.toPlane(e.clientX, e.clientY, this.plane);
    this.grabOffset.copy(at ? p.clone().sub(at) : new Vector3());
    if (this.vertical) this.grabOffset.set(0, 0, this.grabOffset.z);
    if (this.stage.controls) this.stage.controls.enabled = false;
    this.stage.renderer.domElement.style.cursor = 'grabbing';
    item.onStart?.();
  }

  private setPlane(p: Vector3, item: DragOpts): void {
    if (this.stage.mode === '2d' || item.planar) {
      this.plane.set(new Vector3(0, 0, 1), -(item.planar ? 0 : p.z));
    } else if (this.vertical) {
      // vertical plane through p facing the camera
      const n = new Vector3().subVectors(this.stage.camera.position, p);
      n.z = 0;
      if (n.lengthSq() < 1e-6) n.set(0, 1, 0);
      n.normalize();
      this.plane.setFromNormalAndCoplanarPoint(n, p);
    } else {
      this.plane.setFromNormalAndCoplanarPoint(new Vector3(0, 0, 1), p);
    }
  }

  private move(e: PointerEvent): void {
    if (!this.active) {
      // hover feedback
      if (e.buttons === 0 && this.items.size) {
        const over = this.hit(e);
        const el = this.stage.renderer.domElement;
        const want = over ? 'grab' : '';
        if (el.style.cursor !== want && el.style.cursor !== 'grabbing') el.style.cursor = want;
      }
      return;
    }
    const at = this.stage.toPlane(e.clientX, e.clientY, this.plane);
    if (!at) return;
    const cur = this.active.getPos();
    let p = at.add(this.grabOffset);
    if (this.vertical) p = new Vector3(cur.x, cur.y, p.z);
    const s = this.active.snap?.();
    if (s) p.set(Math.round(p.x / s) * s, Math.round(p.y / s) * s, Math.round(p.z / s) * s);
    if (this.active.constrain) p = this.active.constrain(p);
    this.active.onMove(p);
  }

  private up(): void {
    if (!this.active) return;
    const item = this.active;
    this.active = null;
    this.dragging = false;
    if (this.stage.controls) this.stage.controls.enabled = true;
    this.stage.renderer.domElement.style.cursor = '';
    item.onEnd?.();
  }
}

function isAncestor(a: Object3D, b: Object3D): boolean {
  let n: Object3D | null = b.parent;
  while (n) { if (n === a) return true; n = n.parent; }
  return false;
}
