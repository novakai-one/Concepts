// Act V picture kit, shared by Chapters 15 and 16: a "room" (a small coordinate space drawn at an
// offset, so input space and output space can sit side by side), planes and lines through a room's
// origin, the violet null-space glow, probes that follow the pointer with snapping in room units,
// and the cloud of test buoys.
import { Vector3, type Object3D, type Sprite } from 'three';
import type { Game, PuzzleCtx, V3 } from '../../../game/types';
import { Arrow, type ArrowOpts } from '../../../gfx/arrow';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { PlanePatch } from '../../../gfx/shapes';
import { BuoyField } from '../../../gfx/buoys';
import { glowSprite } from '../../../gfx/markers';
import { Knob } from '../../../kit/geom';
import { PointCloud } from '../../../kit/data';
import { C } from '../../../core/theme';
import { animate, ease } from '../../../core/tween';
import { cross, normalize } from '../../../math/la';
import './act5.css';

export const VIOLET = C.violet;
/** Violet in TeX (the null space's colour; nowhere else). */
export const tv = (s: string): string => `\\htmlClass{c-learn}{${s}}`;

type Host = PuzzleCtx | Game;
const stageOf = (h: Host) => ('g' in h ? h.g.stage : h.stage);
function addTo(h: Host, ...objs: (Object3D | { object: Object3D })[]): void {
  if ('g' in h) { h.add(...objs); return; }
  for (const o of objs) h.stage.world.add('isObject3D' in o ? (o as Object3D) : (o as { object: Object3D }).object);
}

export interface RoomOpts {
  origin?: V3;
  /** World units per room unit. */
  scale?: number;
  /** Half-size of the axes and floor grid, in room units. */
  extent?: number;
  /** Caption over the room ("inputs", "landings"). */
  title?: string;
  /** Floor grid on z = 0 (default true). */
  floor?: boolean;
  /** Axis letters (default x, y, z). */
  names?: [string, string, string];
}

/** A coordinate space drawn at an offset and scale in the world. */
export class Room {
  readonly origin: V3;
  readonly s: number;
  readonly extent: number;
  readonly caption: Label | null = null;
  readonly host: Host;
  private readonly parts: { dispose(): void }[] = [];

  constructor(host: Host, o: RoomOpts = {}) {
    this.host = host;
    this.origin = o.origin ?? [0, 0, 0];
    this.s = o.scale ?? 1;
    this.extent = o.extent ?? 3;
    const st = stageOf(host);
    const E = this.extent;
    const ax = new FatSegments(st, [
      [this.w([-E, 0, 0]), this.w([E, 0, 0])], [this.w([0, -E, 0]), this.w([0, E, 0])], [this.w([0, 0, -E * 0.75]), this.w([0, 0, E])],
    ], { color: C.axis, width: 1.4, opacity: 0.5 });
    this.own(ax);
    if (o.floor !== false) {
      const segs: [V3, V3][] = [];
      for (let k = -E; k <= E; k++) {
        if (k === 0) continue;
        segs.push([this.w([k, -E, 0]), this.w([k, E, 0])], [this.w([-E, k, 0]), this.w([E, k, 0])]);
      }
      this.own(new FatSegments(st, segs, { color: C.grid, width: 1, opacity: 0.16 }));
    }
    const names = o.names ?? ['x', 'y', 'z'];
    const ends: V3[] = [[E + 0.45, 0, 0], [0, E + 0.45, 0], [0, 0, E + 0.4]];
    ends.forEach((e, i) => this.own(new Label(`$${names[i]}$`, this.w(e), { className: 'rob-axis' })));
    if (o.title) this.caption = this.own(new Label(o.title, this.w([0, -E - 0.9, 0]), { className: 'act5-cap' }));
  }

  /** Room point → world point. */
  w(v: readonly number[]): V3 { return [this.origin[0] + this.s * v[0], this.origin[1] + this.s * v[1], this.origin[2] + this.s * (v[2] ?? 0)]; }
  /** World point → room point. */
  l(q: Vector3 | readonly number[]): V3 {
    const a = q instanceof Vector3 ? [q.x, q.y, q.z] : q;
    return [(a[0] - this.origin[0]) / this.s, (a[1] - this.origin[1]) / this.s, (a[2] - this.origin[2]) / this.s];
  }
  get center(): V3 { return this.w([0, 0, this.extent * 0.25]); }

  own<T extends { dispose(): void; object: Object3D }>(x: T): T {
    addTo(this.host, x);
    this.parts.push(x);
    return x;
  }

  arrow(to: readonly number[], o: ArrowOpts & { from?: readonly number[] } = {}): Arrow {
    const a = new Arrow(this.w(o.from ?? [0, 0, 0]), this.w(to), { width: 0.045 * Math.min(1.2, this.s + 0.2), ...o });
    return this.own(a);
  }
  /** Move an arrow drawn with arrow() (room units). */
  setArrow(a: Arrow, to: readonly number[], from: readonly number[] = [0, 0, 0]): void { a.set(this.w(from), this.w(to)); }

  dispose(): void { for (const p of this.parts.splice(0)) p.dispose(); }
}

/** A plane through a room's origin with normal n, as a glowing patch (room units). */
export class Sheet {
  readonly patch: PlanePatch;
  private readonly room: Room;
  n: V3;
  constructor(room: Room, n: readonly number[], o: { color?: string; size?: number; opacity?: number } = {}) {
    this.room = room;
    this.n = [n[0], n[1], n[2]];
    this.patch = room.own(new PlanePatch(stageOfRoom(room), room.w([0, 0, 0]), [0, 0, 1], { color: o.color ?? C.result, size: (o.size ?? 5) * room.s, opacity: o.opacity ?? 0.16 }));
    this.set(n);
  }
  get object(): Object3D { return this.patch.object; }
  /** Point the plane along a new normal (a zero normal hides it). */
  set(n: readonly number[]): void {
    this.n = [n[0], n[1], n[2]];
    const l = Math.hypot(n[0], n[1], n[2]);
    this.patch.object.visible = l > 1e-6;
    if (l < 1e-6) return;
    const nn = normalize([...n]);
    // keep the patch square with the axes where it can: the first edge along the floor
    let u = cross(nn, [0, 0, 1]);
    if (Math.hypot(...u) < 1e-6) u = [1, 0, 0];
    u = normalize(u);
    const v = normalize(cross(nn, u));
    this.patch.setSpan(this.room.w([0, 0, 0]), u as V3, v as V3);
  }
  /** Place the plane through two directions instead. */
  span(a: readonly number[], b: readonly number[]): void {
    const n = cross([...a], [...b]);
    if (Math.hypot(...n) < 1e-9) { this.patch.object.visible = false; return; }
    this.patch.object.visible = true;
    const u = normalize([...a]), v = normalize(cross(n, u));
    this.patch.setSpan(this.room.w([0, 0, 0]), u as V3, v as V3);
    this.n = n as V3;
  }
  setColor(c: string): void { this.patch.object.traverse((o) => { const m = (o as unknown as { material?: { color?: { set(c: string): void } } }).material; m?.color?.set(c); }); }
  setOpacity(a: number): void { this.patch.setOpacity(a); }
  dispose(): void { this.patch.dispose(); }
}

const stageOfRoom = (room: Room) => stageOf(room.host);

/** A line through a point of a room along d: a soft glow and a bright core (violet by default). */
export class GlowLine {
  readonly core: FatLine;
  readonly glow: FatLine;
  private readonly room: Room;
  private readonly half: number;
  constructor(room: Room, d: readonly number[], o: { color?: string; through?: readonly number[]; half?: number; width?: number; opacity?: number } = {}) {
    this.room = room;
    this.half = o.half ?? room.extent * 1.15;
    const st = stageOfRoom(room);
    const color = o.color ?? VIOLET;
    this.glow = room.own(new FatLine(st, [[0, 0, 0], [1, 0, 0]], { color, width: 14, intensity: 1.2, opacity: 0.2 * (o.opacity ?? 1) }));
    this.core = room.own(new FatLine(st, [[0, 0, 0], [1, 0, 0]], { color, width: o.width ?? 3.2, intensity: 1.9, opacity: 0.95 * (o.opacity ?? 1) }));
    this.set(d, o.through);
  }
  set(d: readonly number[], through: readonly number[] = [0, 0, 0]): void {
    const n = normalize([...d]);
    const h = this.half;
    const pts: V3[] = [this.room.w([through[0] - n[0] * h, through[1] - n[1] * h, through[2] - n[2] * h]), this.room.w([through[0] + n[0] * h, through[1] + n[1] * h, through[2] + n[2] * h])];
    this.core.setPoints(pts);
    this.glow.setPoints(pts);
  }
  setOpacity(a: number): void { this.core.setOpacity(0.95 * a); this.glow.setOpacity(0.2 * a); }
  async fadeIn(ms = 700): Promise<void> { this.setOpacity(0); await animate(ms, (k) => this.setOpacity(k), ease.out); }
  dispose(): void { this.core.dispose(); this.glow.dispose(); }
}

/** A draggable point in a room: snaps in room units; Shift-drag changes height. */
export class Probe {
  readonly knob: Knob;
  private readonly room: Room;
  pos: V3;
  constructor(p: PuzzleCtx, room: Room, at: readonly number[], o: { color?: string; label?: string; snap?: number | null; limit?: number; fit?: (x: V3) => V3; size?: number; onMove?: (x: V3) => void; onEnd?: (x: V3) => void; countMoves?: boolean } = {}) {
    this.room = room;
    this.pos = [at[0], at[1], at[2]];
    const snap = o.snap === undefined ? p.snap() : o.snap;
    const lim = o.limit ?? room.extent;
    const toRoom = (q: Vector3): V3 => {
      let x = room.l(q);
      if (snap) x = x.map((c) => Math.round(c / snap) * snap) as V3;
      x = x.map((c) => Math.max(-lim, Math.min(lim, c))) as V3;
      return o.fit ? o.fit(x) : x;
    };
    this.knob = new Knob(p, room.w(at), {
      color: o.color ?? C.v, label: o.label, snap: null, countMoves: o.countMoves, size: o.size,
      constrain: (q) => new Vector3(...room.w(toRoom(q))),
      onMove: (w) => { this.pos = room.l(w).map((c) => Math.round(c * 1e6) / 1e6) as V3; o.onMove?.(this.pos); },
      onEnd: (w) => { this.pos = room.l(w).map((c) => Math.round(c * 1e6) / 1e6) as V3; o.onEnd?.(this.pos); },
    });
  }
  /** Place it (no callbacks). */
  set(x: readonly number[]): void { this.pos = [x[0], x[1], x[2]]; this.knob.at(this.room.w(x)); }
  async moveTo(x: readonly number[], ms = 700): Promise<void> {
    const a = this.pos;
    await animate(ms, (k) => this.set([a[0] + (x[0] - a[0]) * k, a[1] + (x[1] - a[1]) * k, a[2] + (x[2] - a[2]) * k]), ease.inOut);
    this.set(x);
  }
}

/** A field of test buoys at given starts, drawn in a room; move() sends them through a matrix. */
export function buoyCloud(host: Host, room: Room, starts: V3[], o: { color?: string; size?: number } = {}): BuoyField {
  const b = new BuoyField(stageOf(host), { points: starts, dims: 3, color: o.color ?? '#9fd8ff', size: o.size ?? 0.045 });
  b.object.position.set(...room.origin);
  b.object.scale.setScalar(room.s);
  addTo(host, b);
  return b;
}

/**
 * The test buoys: small glowing points at given starts, drawn in a room. setMatrix / to send them through
 * a matrix (honest: a straight line from where they are); paint colours each one.
 */
export class LandCloud {
  readonly pc: PointCloud;
  private M: number[][] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  private cols: string[];
  constructor(host: Host, private readonly room: Room, readonly starts: readonly (readonly number[])[], o: { color?: string; size?: number; glow?: number; opacity?: number } = {}) {
    const ctx = ('g' in host ? host : { add: (x: { object: Object3D }) => host.stage.world.add(x.object) }) as PuzzleCtx;
    this.cols = starts.map(() => o.color ?? '#9fd8ff');
    this.pc = new PointCloud(ctx, { points: this.points(this.M), colors: this.cols, size: o.size ?? 0.032, glow: o.glow ?? 0.22, opacity: o.opacity ?? 0.95, core: 1.35 });
  }
  get object(): Object3D { return this.pc.object; }
  /** World positions after the matrix M. */
  points(M: number[][]): V3[] {
    return this.starts.map((s) => this.room.w([0, 1, 2].map((r) => M[r][0] * s[0] + M[r][1] * s[1] + M[r][2] * s[2])));
  }
  setMatrix(M: number[][]): void { this.M = M.map((r) => r.slice()); this.pc.set(this.points(this.M), this.cols); }
  async to(M: number[][], ms = 1400): Promise<void> { await this.pc.to(this.points(M), ms); this.M = M.map((r) => r.slice()); }
  /** Colour every point (one colour each). */
  paint(color: (i: number) => string): void { this.cols = this.starts.map((_, i) => color(i)); this.pc.set(this.points(this.M), this.cols); }
  dispose(): void { this.pc.dispose(); }
}

/** A soft violet glow at a room point (the pile at the origin). */
export function violetGlow(host: Host, room: Room, at: readonly number[] = [0, 0, 0], size = 1.4, opacity = 0.7): Sprite {
  const s = glowSprite(VIOLET, size * room.s, opacity);
  s.position.set(...room.w(at));
  addTo(host, s);
  return s;
}

/** Camera for two rooms side by side (inputs left, landings right). */
export async function twinView(p: PuzzleCtx | Game, o: { distance?: number; elevation?: number; azimuth?: number; target?: V3; ms?: number } = {}): Promise<void> {
  const st = stageOf(p);
  await st.view3D({ target: o.target ?? [0, 0, 0.9], distance: o.distance ?? 15.5, azimuth: o.azimuth ?? -90, elevation: o.elevation ?? 20, ms: o.ms ?? 0 });
}

/**
 * Add a kit object straight to the world so that clearing the world disposes it fully (nested CSS2D
 * labels included: three only removes a label's element when the label itself is removed).
 */
export function inWorld<T extends { object: Object3D; dispose(): void }>(g: Game, x: T): T {
  x.object.userData.dispose = () => x.dispose();
  g.stage.world.add(x.object);
  return x;
}

/** A small TeX vector for readouts: (a, b, c) with true minus signs. */
export const vecTex = (v: readonly number[], f: (x: number) => string): string => `(${v.map(f).join(',\\ ')})`;
