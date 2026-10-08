// Chapter 7 pictures: the hangar door (Chapter 5's triangle) on its glass wall, glowing paths with
// minute ticks, beads that slide along a path, and a ring that lies flat on a plane.
import {
  BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, Quaternion, RingGeometry, Vector3,
} from 'three';
import type { PuzzleCtx, V3 } from '../../../game/types';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { PlanePatch } from '../../../gfx/shapes';
import { Arrow } from '../../../gfx/arrow';
import { Knob } from '../../../kit/geom';
import { C } from '../../../core/theme';
import { animate, ease } from '../../../core/tween';
import { DOOR_CENTRE, DOOR_K, DOOR_N, DOOR_P, DOOR_Q, DOOR_R, along, footOnPlane } from './logic';

export const v3 = (v: readonly number[]): V3 => [v[0], v[1], v[2] ?? 0];
const unit = (v: readonly number[]): V3 => { const l = Math.hypot(v[0], v[1], v[2] ?? 0) || 1; return [v[0] / l, v[1] / l, (v[2] ?? 0) / l]; };
export const GLASS = '#8fd3ff';
export const DOOR = '#ffd9a0';

export function lab(p: PuzzleCtx, text: string, at: V3, o: { color?: string; size?: number; className?: string; offset?: [number, number] } = {}): Label {
  const l = new Label(text, at, o);
  p.add(l);
  return l;
}

/** The hangar door: a lit triangle with its corners named, on a faint glass wall (its whole plane). */
export class DoorWall {
  readonly group = new Group();
  readonly fill: Mesh<BufferGeometry, MeshBasicMaterial>;
  readonly edge: FatLine;
  readonly wall: PlanePatch;
  readonly labels: Label[] = [];

  constructor(p: PuzzleCtx, o: { wall?: number; wallSize?: number; names?: boolean; fill?: number } = {}) {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array([...DOOR_P, ...DOOR_Q, ...DOOR_R]), 3));
    g.setIndex([0, 1, 2]);
    this.fill = new Mesh(g, new MeshBasicMaterial({ color: new Color(DOOR), transparent: true, opacity: o.fill ?? 0.22, side: DoubleSide, depthWrite: false }));
    this.edge = new FatLine(p.g.stage, [DOOR_P, DOOR_Q, DOOR_R, DOOR_P].map(v3), { color: DOOR, width: 2.6, intensity: 1.4 });
    this.wall = new PlanePatch(p.g.stage, v3(DOOR_CENTRE), v3(DOOR_N), { color: GLASS, size: o.wallSize ?? 9, opacity: 0.1 });
    this.wall.setOpacity(o.wall ?? 0.7);
    this.group.add(this.wall.object, this.fill, this.edge.object);
    p.add(this.group);
    p.onDispose(() => { this.wall.dispose(); this.edge.dispose(); g.dispose(); this.fill.material.dispose(); });
    if (o.names !== false) {
      const off: V3[] = [[0.25, -0.3, 0], [0, 0.35, 0.05], [-0.25, -0.2, 0.25]];
      [DOOR_P, DOOR_Q, DOOR_R].forEach((q, i) => {
        const l = new Label(['P', 'Q', 'R'][i], [q[0] + off[i][0], q[1] + off[i][1], q[2] + off[i][2]], { className: 'tag', color: DOOR });
        this.group.add(l.object);
        this.labels.push(l);
      });
      p.onDispose(() => this.labels.forEach((l) => l.dispose()));
    }
  }

  get object(): Group { return this.group; }
  /** Snap a point onto the door's plane. */
  static onWall(q: Vector3): Vector3 { const f = footOnPlane([q.x, q.y, q.z], DOOR_N, DOOR_K); return new Vector3(f[0], f[1], f[2]); }
  glow(on: boolean): void { this.edge.setColor(DOOR, on ? 2.4 : 1.4); this.fill.material.opacity = on ? 0.4 : 0.22; }
}

/** A ring lying flat on a plane (normal n), e.g. the door's centre mark. */
export class FlatRing {
  readonly mesh: Mesh<RingGeometry, MeshBasicMaterial>;
  constructor(p: PuzzleCtx, at: V3, n: V3, o: { color?: string; r?: number; opacity?: number } = {}) {
    const r = o.r ?? 0.22;
    this.mesh = new Mesh(new RingGeometry(r * 0.72, r, 48), new MeshBasicMaterial({ color: new Color(o.color ?? C.white).multiplyScalar(1.6), transparent: true, opacity: o.opacity ?? 0.9, side: DoubleSide, depthWrite: false }));
    this.mesh.position.set(...at);
    this.mesh.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...unit(n))));
    p.add(this.mesh);
    p.onDispose(() => { this.mesh.geometry.dispose(); this.mesh.material.dispose(); });
  }
  setColor(c: string): void { this.mesh.material.color = new Color(c).multiplyScalar(1.8); }
  async pulse(): Promise<void> { await animate(600, (k) => this.mesh.scale.setScalar(1 + 0.8 * Math.sin(k * Math.PI)), ease.out); }
}

/** A straight path p + t d, drawn from t0 to t1, with optional tick marks at whole t. */
export class PathLine {
  readonly line: FatLine;
  readonly ticks: FatSegments | null = null;
  readonly tickLabels: Label[] = [];
  p: V3; d: V3;
  constructor(pc: PuzzleCtx, p: V3, d: V3, o: { color?: string; t0?: number; t1?: number; ticks?: number[]; width?: number; opacity?: number; dashed?: boolean; tickLabels?: boolean } = {}) {
    this.p = p; this.d = d;
    this.line = new FatLine(pc.g.stage, [along(p, d, o.t0 ?? -20) as V3, along(p, d, o.t1 ?? 20) as V3], { color: o.color ?? C.white, width: o.width ?? 2, intensity: 1.3, opacity: o.opacity ?? 0.8, dashed: o.dashed });
    pc.add(this.line.object);
    pc.onDispose(() => this.line.dispose());
    if (o.ticks) {
      const ticks = new FatSegments(pc.g.stage, [], { color: o.color ?? C.white, width: 2, opacity: 0.85 });
      this.ticks = ticks;
      pc.add(ticks.object);
      pc.onDispose(() => ticks.dispose());
      if (o.tickLabels) {
        for (const t of o.ticks) {
          const l = new Label(String(t), [0, 0, 0], { className: 'small', color: o.color ?? C.white });
          this.tickLabels.push(l);
          pc.add(l);
        }
      }
      this.setTicks(p, d, o.ticks);
    }
  }
  set(p: V3, d: V3, t0 = -20, t1 = 20): void { this.p = p; this.d = d; this.line.setPoints([along(p, d, t0) as V3, along(p, d, t1) as V3]); }
  /** Short marks across the path at each t (and their labels). */
  setTicks(p: V3, d: V3, ts: number[]): void {
    if (!this.ticks) return;
    const u = unit(d);
    const side: V3 = Math.abs(u[2]) > 0.9 ? [1, 0, 0] : unit([-u[1], u[0], 0]);
    const s = 0.14;
    this.ticks.setSegments(ts.map((t) => { const c = along(p, d, t); return [[c[0] - side[0] * s, c[1] - side[1] * s, c[2] - side[2] * s], [c[0] + side[0] * s, c[1] + side[1] * s, c[2] + side[2] * s]] as [V3, V3]; }));
    this.tickLabels.forEach((l, i) => { const c = along(p, d, ts[i]); l.at([c[0] + side[0] * 0.6, c[1] + side[1] * 0.6, c[2] + side[2] * 0.6]); });
  }
  setColor(c: string, k = 1.3): void { this.line.setColor(c, k); }
  setOpacity(a: number): void { this.line.setOpacity(a); }
}

/** A bead on a path: a knob that only slides along p + t d (and reports t). */
export class Bead {
  readonly knob: Knob;
  t: number;
  constructor(pc: PuzzleCtx, p: V3, d: V3, t: number, o: { color?: string; label?: string; snap?: number | null; min?: number; max?: number; magnet?: { at: number; within: number }; onMove?: (t: number) => void; onEnd?: (t: number) => void } = {}) {
    this.t = t;
    const dd = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
    const tOf = (q: Vector3) => {
      let k = ((q.x - p[0]) * d[0] + (q.y - p[1]) * d[1] + (q.z - p[2]) * d[2]) / dd;
      if (o.snap) k = Math.round(k / o.snap) * o.snap;
      if (o.magnet && Math.abs(k - o.magnet.at) <= o.magnet.within) k = o.magnet.at;
      return Math.max(o.min ?? -1e9, Math.min(o.max ?? 1e9, k));
    };
    this.knob = new Knob(pc, along(p, d, t) as V3, {
      color: o.color ?? C.result, label: o.label, size: 0.1,
      constrain: (q) => { const k = tOf(q); return new Vector3(...along(p, d, k)); },
      onMove: (q) => { this.t = tOf(new Vector3(...q)); o.onMove?.(this.t); },
      onEnd: () => o.onEnd?.(this.t),
    });
  }
  get pos(): V3 { return this.knob.pos; }
  /** Put the bead at t (no callbacks). */
  at(p: V3, d: V3, t: number): void { this.t = t; this.knob.at(along(p, d, t) as V3); }
}

/** An arrow drawn shorter than its true length (label says the true numbers). */
export function normalArrow(p: PuzzleCtx, at: V3, n: V3, len: number, label: string, color = '#fff1c2'): Arrow {
  const u = unit(n);
  const tip: V3 = [at[0] + u[0] * len, at[1] + u[1] * len, at[2] + u[2] * len];
  const a = new Arrow(at, tip, { color, width: 0.04 });
  p.add(a);
  lab(p, label, [tip[0] + u[0] * 0.3, tip[1] + u[1] * 0.3, tip[2] + u[2] * 0.3 + 0.15], { className: 'small', color });
  return a;
}
