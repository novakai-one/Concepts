// Burns: arrows drawn tip to tail from the ship. The player drags the tips; Fire flies the ship
// along the chain. A burn is a vector: how far to move along each axis.
import { Vector3 } from 'three';
import type { PuzzleCtx, V3 } from '../game/types';
import { Arrow } from '../gfx/arrow';
import { Ship } from '../gfx/models';
import { C } from '../core/theme';
import { VectorHandle } from './handle';
import { button } from '../ui/ui';
import { sfx } from '../audio/sfx';
import { animate, ease, wait } from '../core/tween';
import { FatLine } from '../gfx/lines';

export interface BurnChainOpts {
  start?: V3;
  /** Burns already fired (drawn first, grey, not draggable). */
  fixed?: V3[];
  /** The player's burns (initial vectors). */
  free: V3[];
  colors?: string[];
  labels?: string[];
  /** Show the yellow arrow from start to the end of the chain. */
  result?: boolean | string;
  /** Show the ship (default true). */
  ship?: boolean;
  /** Fire button label (default "Fire"). Pass null for no button. */
  fireLabel?: string | null;
  snap?: number | null;
  /** Restrict where burn i's tip may go (e.g. onto one line). Receives the tip in world coordinates. */
  constrain?: (i: number, tip: Vector3, tail: V3) => Vector3;
  /** The fixed burns already happened: the ship starts at their end and flies only the free burns. */
  fixedFlown?: boolean;
  onChange?: (end: V3, burns: V3[]) => void;
  /**
   * Called when the ship arrives after Fire. Return 'win' (or true) to end the puzzle, 'ok' for a good
   * arrival that is not the end (the ship returns to the start without a miss sound), anything else = miss.
   */
  onArrive?: (end: V3, burns: V3[]) => boolean | 'win' | 'ok' | 'miss' | void;
}

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

export class BurnChain {
  readonly start: V3;
  readonly fixed: Arrow[] = [];
  readonly free: VectorHandle[] = [];
  readonly resultArrow: Arrow | null = null;
  ship: Ship | null = null;
  private trail: FatLine | null = null;
  private readonly o: BurnChainOpts;
  private flying = false;
  readonly fireBtn: HTMLButtonElement | null = null;

  constructor(private readonly p: PuzzleCtx, o: BurnChainOpts) {
    this.o = o;
    this.start = o.start ?? [0, 0, 0];
    let at = this.start;
    for (const v of o.fixed ?? []) {
      const a = new Arrow(at, add(at, v), { color: '#9aa7bd', width: 0.04, opacity: 0.9 });
      p.add(a);
      this.fixed.push(a);
      at = add(at, v);
    }
    const colors = o.colors ?? [C.v, C.w, C.u];
    o.free.forEach((v, i) => {
      const tail = at;
      const h = new VectorHandle(p, {
        from: tail, to: add(tail, v), color: colors[i % colors.length], label: o.labels?.[i], snap: o.snap,
        constrain: o.constrain ? (q) => o.constrain!(i, q, this.free[i]?.tail ?? tail) : undefined,
        onChange: () => this.relayout(i),
        onCommit: () => {},
        countMoves: false,
      });
      this.free.push(h);
      at = add(tail, v);
    });
    if (o.result) {
      this.resultArrow = new Arrow(this.start, at, { color: C.result, width: 0.035, opacity: 0.85, label: typeof o.result === 'string' ? o.result : undefined, labelAt: 'mid' });
      p.add(this.resultArrow);
    }
    if (o.ship !== false) {
      this.ship = new Ship(p.g.stage, { model: 'lantern', scale: 0.16 });
      this.ship.group.position.set(...this.shipHome());
      this.ship.group.position.z = 0.15;
      p.add(this.ship);
      const first = this.burns()[0];
      if (first) this.ship.face(first);
    }
    if (o.fireLabel !== null) {
      this.fireBtn = button(o.fireLabel ?? 'Fire', () => void this.fire(), { cls: 'primary', kbd: 'F' });
      p.dock().appendChild(this.fireBtn);
      const onKey = (e: KeyboardEvent) => {
        if ((e.key === 'f' || e.key === 'F') && !this.fireBtn?.disabled && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !p.g.dialogue.active) void this.fire();
      };
      document.addEventListener('keydown', onKey);
      p.onDispose(() => document.removeEventListener('keydown', onKey));
    }
    this.relayout(-1);
  }

  /** Where the ship waits before firing. */
  shipHome(): V3 {
    if (!this.o.fixedFlown) return this.start;
    let at = this.start;
    for (const a of this.fixed) at = [a.to.x, a.to.y, a.to.z];
    return at;
  }

  /** All burn vectors in order (fixed then free). */
  burns(): V3[] {
    return [...this.fixed.map((a) => sub([a.to.x, a.to.y, a.to.z], [a.from.x, a.from.y, a.from.z])), ...this.free.map((h) => h.vec)];
  }

  end(): V3 { return this.burns().reduce((s, v) => add(s, v), this.start); }

  /** After burn i changed: keep every later burn's vector, move its tail to the new tip. */
  private relayout(i: number): void {
    let at = this.start;
    for (const a of this.fixed) at = [a.to.x, a.to.y, a.to.z];
    this.free.forEach((h, k) => {
      if (k > i) { const v = h.vec; h.arrow.set(at, add(at, v)); }
      at = h.tip;
    });
    this.resultArrow?.set(this.start, at);
    this.o.onChange?.(at, this.burns());
  }

  /** Set the player's burn i to a vector (Show me). */
  setBurn(i: number, v: V3): void {
    const h = this.free[i];
    h.arrow.set(h.tail, add(h.tail, v));
    this.relayout(i);
  }

  /** Animate burn i to a vector. */
  async moveBurn(i: number, v: V3, ms = 800): Promise<void> {
    const h = this.free[i];
    const from = h.vec;
    await animate(ms, (k) => {
      h.arrow.set(h.tail, add(h.tail, [from[0] + (v[0] - from[0]) * k, from[1] + (v[1] - from[1]) * k, from[2] + (v[2] - from[2]) * k]));
      this.relayout(i);
    }, ease.inOut);
  }

  /** Fly the ship along the chain. Counts one move. Resolves after onArrive. */
  async fire(): Promise<boolean> {
    if (this.flying || this.p.won) return false;
    this.flying = true;
    this.p.move();
    this.free.forEach((h) => h.setEnabled(false));
    const ship = this.ship;
    const pts: V3[] = [this.shipHome()];
    for (const v of this.o.fixedFlown ? this.free.map((h) => h.vec) : this.burns()) pts.push(add(pts[pts.length - 1], v));
    this.trail?.dispose();
    this.trail = new FatLine(this.p.g.stage, pts.slice(0, 1).map((q) => [q[0], q[1], 0.05] as V3).concat([[pts[0][0], pts[0][1], 0.05]]), { color: '#bfe8ff', width: 2, opacity: 0.55 });
    this.p.add(this.trail.object);
    this.p.onDispose(() => this.trail?.dispose());
    const flown: V3[] = [[pts[0][0], pts[0][1], 0.05]];
    if (ship) {
      await ship.ready;
      for (let k = 1; k < pts.length; k++) {
        const a = new Vector3(...pts[k - 1]), b = new Vector3(...pts[k]);
        const d = b.clone().sub(a);
        if (d.lengthSq() < 1e-9) continue;
        ship.face([d.x, d.y, 0]);
        sfx.thrust(0.5);
        ship.setThrust(1);
        const ms = 380 + 260 * Math.min(4, d.length());
        await animate(ms, (t) => {
          const q = a.clone().lerp(b, t);
          ship.group.position.set(q.x, q.y, 0.15);
          this.trail!.setPoints([...flown, [q.x, q.y, 0.05]]);
        }, ease.inOut);
        flown.push([b.x, b.y, 0.05]);
        ship.setThrust(0.2);
      }
    }
    const end = this.end();
    const r = this.o.onArrive?.(end, this.burns());
    const won = r === true || r === 'win';
    if (!won) {
      if (r === 'ok') sfx.success(); else sfx.miss();
      await wait(r === 'ok' ? 900 : 700);
      await this.rewind();
    }
    this.free.forEach((h) => h.setEnabled(true));
    this.flying = false;
    return won;
  }

  /** Put the ship back at the start. */
  async rewind(ms = 600): Promise<void> {
    const ship = this.ship;
    this.trail?.setOpacity(0);
    if (!ship) return;
    const home = this.shipHome();
    const a = ship.group.position.clone(), b = new Vector3(home[0], home[1], 0.15);
    await animate(ms, (t) => ship.group.position.lerpVectors(a, b, t), ease.inOut);
    const first = (this.o.fixedFlown ? this.free.map((h) => h.vec) : this.burns())[0];
    if (first) ship.face(first);
  }
}
