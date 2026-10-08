// A point the player places in 3-D: a glowing dot with a dashed drop line and a ring on the floor
// (so its height reads at a glance), a coordinates tag, and dragging (across; Shift for up and down).
import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';
import type { PuzzleCtx, V3 } from '../../../game/types';
import { Dot, Pad } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { VectorInput } from '../../../ui/widgets';
import { h } from '../../../ui/ui';
import { sfx } from '../../../audio/sfx';
import { animate, ease } from '../../../core/tween';
import { pt } from './act3';

export interface MarkerOpts {
  pos: number[];
  color?: string;
  /** Short name shown before the coordinates, e.g. "A". */
  name?: string;
  draggable?: boolean;
  /** Snap step (default: the difficulty's). */
  snap?: () => number | null;
  /** Keep the point somewhere (e.g. on a line). */
  constrain?: (p: number[]) => number[];
  onMove?: (p: number[]) => void;
  onEnd?: (p: number[]) => void;
  /** Clamp each coordinate to ±limit (default 9). */
  limit?: number;
}

export class Marker3D {
  pos: number[];
  readonly dot: Dot;
  private readonly hit: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly drop: FatLine;
  private readonly floor: Pad;
  private readonly tag: Label;
  private readonly o: MarkerOpts;
  private color: string;
  private handle: { enabled: boolean } | null = null;

  constructor(p: PuzzleCtx, o: MarkerOpts) {
    this.o = o;
    this.pos = o.pos.slice();
    this.color = o.color ?? '#e8f1ff';
    this.dot = new Dot(this.v3(), { color: this.color, size: 0.15, glow: 1.8 });
    this.hit = new Mesh(new SphereGeometry(0.42, 12, 8), new MeshBasicMaterial({ visible: false }));
    this.dot.group.add(this.hit);
    this.drop = new FatLine(p.g.stage, [this.v3(), this.v3()], { color: this.color, width: 1.4, opacity: 0.55, dashed: true, dashSize: 0.14, gapSize: 0.1 });
    this.floor = new Pad(p.g.stage, [0, 0, 0], { color: this.color, radius: 0.2 });
    this.tag = new Label('', [0, 0, 0], { className: 'c08-tag', offset: [0, -24] });
    this.dot.group.add(this.tag.object);
    p.add(this.dot, this.floor);
    p.add(this.drop.object);
    p.onDispose(() => { this.drop.dispose(); this.tag.dispose(); this.hit.geometry.dispose(); this.hit.material.dispose(); });
    if (o.draggable !== false) {
      const handle = p.g.drag.add({
        target: this.hit,
        getPos: () => new Vector3(...this.v3()),
        snap: o.snap ?? (() => p.snap()),
        constrain: (q) => {
          const L = o.limit ?? 9;
          let v = [q.x, q.y, q.z].map((x) => Math.max(-L, Math.min(L, x)));
          if (o.constrain) v = o.constrain(v);
          return new Vector3(v[0], v[1], v[2]);
        },
        onMove: (q) => { this.set([q.x, q.y, q.z]); sfx.tick(q.z); o.onMove?.(this.pos); },
        onEnd: () => { p.move(); o.onEnd?.(this.pos); },
      });
      p.onDispose(() => handle.remove());
      this.handle = handle;
    }
    this.set(this.pos);
  }

  private v3(p = this.pos): V3 { return [p[0], p[1], p[2] ?? 0]; }

  set(p: number[]): void {
    this.pos = p.slice();
    const v = this.v3();
    this.dot.at(v);
    this.drop.setPoints([v, [v[0], v[1], 0]]);
    this.drop.setOpacity(Math.abs(v[2]) > 0.05 ? 0.55 : 0);
    this.floor.at([v[0], v[1], 0.01]);
    this.tag.set(`${this.o.name ? `${this.o.name} ` : ''}${pt(this.pos)}`);
  }

  setColor(c: string): void {
    if (c === this.color) return;
    this.color = c;
    this.dot.setColor(c);
    this.drop.setColor(c);
  }

  /** Stop (or allow) dragging. */
  setDraggable(on: boolean): void { if (this.handle) this.handle.enabled = on; }

  show(on: boolean): void {
    this.dot.group.visible = on;
    this.floor.group.visible = on;
    this.drop.object.visible = on && Math.abs(this.pos[2]) > 0.05;
  }

  /** Glide to a point (Show me), then report it like a drag. */
  async moveTo(to: number[], ms = 900): Promise<void> {
    const from = this.pos.slice();
    await animate(ms, (k) => { this.set(from.map((x, i) => x + (to[i] - x) * k)); this.o.onMove?.(this.pos); }, ease.inOut);
    this.set(to);
    this.o.onMove?.(this.pos);
    this.o.onEnd?.(this.pos);
  }
}

/** A typed (x, y, z) entry for a marker, with a Place button; Enter places too. */
export function placeInput(p: PuzzleCtx, label: string, dim: number, start: number[], onPlace: (v: number[]) => void): { el: HTMLElement; set(v: number[]): void } {
  const vi = new VectorInput({ dim, values: start, onSubmit: (v) => { p.move(); onPlace(v); } });
  const btn = h('button', { class: 'btn small', type: 'button' }, 'Place') as HTMLButtonElement;
  btn.addEventListener('click', (e) => { e.stopPropagation(); p.move(); onPlace(vi.get()); });
  const el = h('div', { class: 'c08-place' }, h('span', { class: 'c08-place-k' }, label), vi.el, btn);
  // typing in the cells must not trigger the puzzle's keys (H, R)
  el.addEventListener('keydown', (e) => e.stopPropagation());
  return { el, set: (v) => vi.set(v) };
}
