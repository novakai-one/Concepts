// The reach glow (GDD §3.5 "Reach glow, SWEEP"): every point the yellow tip has visited glows, so
// the set of reachable points paints itself in.
//
// One instanced draw call of soft, camera-facing points with additive blending. Each point stores
// its dial settings (c₁, c₂, c₃), not its position: the vertex shader places it at
// origin + c₁·A₁ + c₂·A₂ + c₃·A₃ from the current arrows (uniforms). So when an arrow moves, the
// whole glow moves with it, exactly as the reachable set does (it folds onto a line when the arrows
// line up). Fresh points flare and settle; a cell grid in dial space keeps one point per cell, so
// painting over the same place costs nothing and the brightness stays even.
import {
  AdditiveBlending, Color, DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, Mesh,
  PlaneGeometry, ShaderMaterial, Vector3,
} from 'three';
import type { Stage, V3 } from '../../../core/stage';
import { animate, ease } from '../../../core/tween';

const vert = /* glsl */`
attribute vec3 aCoef; attribute float aBorn;
uniform vec3 uA0; uniform vec3 uA1; uniform vec3 uA2; uniform vec3 uOrigin;
uniform float uTime; uniform float uSize; uniform float uLife;
varying vec2 vUv; varying float vA;
void main(){
  vec3 p = uOrigin + aCoef.x * uA0 + aCoef.y * uA1 + aCoef.z * uA2;
  float age = uTime - aBorn;
  float grow = smoothstep(0.0, 0.22, age);
  float flare = 1.0 + 2.4 * exp(-age * 3.2);
  float life = uLife > 0.0 ? 1.0 - smoothstep(uLife * 0.45, uLife, age) : 1.0;
  vA = grow * flare * life;
  vUv = position.xy * 2.0;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  mv.xy += position.xy * uSize * (0.8 + 0.6 * exp(-age * 2.6));
  gl_Position = projectionMatrix * mv;
}`;

const frag = /* glsl */`
uniform vec3 uColor; uniform float uGain;
varying vec2 vUv; varying float vA;
void main(){
  float r2 = dot(vUv, vUv);
  if (r2 >= 1.0) discard;
  // a small bright core (the point the tip visited) inside a wide faint halo (the glow of the set)
  float core = exp(-r2 * 30.0);
  float halo = exp(-r2 * 3.2) * (1.0 - r2);
  float a = (core + 0.09 * halo) * vA * uGain;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
}`;

export interface ReachGlowOpts {
  color?: string;
  /** Maximum number of glowing points (a ring buffer: the oldest are reused). */
  capacity?: number;
  /** Spacing of points in world units (one point per cell). */
  cell?: number;
  /** Point radius in world units. */
  size?: number;
  /** Seconds a point lives (0 = forever). */
  life?: number;
  /** Overall brightness. */
  gain?: number;
  /** Colour intensity (above 1 feeds the bloom). */
  intensity?: number;
}

export class ReachGlow {
  readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  private readonly coef: InstancedBufferAttribute;
  private readonly born: InstancedBufferAttribute;
  private readonly cap: number;
  private readonly keys: (string | null)[];
  private readonly seen = new Map<string, number>();
  private head = 0;
  private filled = 0;
  private dirtyLo = Infinity;
  private dirtyHi = -1;
  private wrapped = false;
  private now = 0;
  private arrows: V3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  readonly cellWorld: number;
  private readonly off: () => void;
  baseGain: number;

  constructor(stage: Stage, o: ReachGlowOpts = {}) {
    this.cap = o.capacity ?? 60000;
    this.cellWorld = o.cell ?? 0.09;
    this.keys = new Array(this.cap).fill(null);
    const g = new InstancedBufferGeometry();
    const quad = new PlaneGeometry(1, 1);
    g.index = quad.index;
    g.setAttribute('position', quad.getAttribute('position'));
    this.coef = new InstancedBufferAttribute(new Float32Array(this.cap * 3), 3);
    this.born = new InstancedBufferAttribute(new Float32Array(this.cap), 1);
    this.coef.setUsage(DynamicDrawUsage);
    this.born.setUsage(DynamicDrawUsage);
    g.setAttribute('aCoef', this.coef);
    g.setAttribute('aBorn', this.born);
    g.instanceCount = 0;
    this.baseGain = o.gain ?? 0.42;
    const mat = new ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: {
        uA0: { value: new Vector3(1, 0, 0) }, uA1: { value: new Vector3(0, 1, 0) }, uA2: { value: new Vector3(0, 0, 1) },
        uOrigin: { value: new Vector3() }, uTime: { value: 0 }, uSize: { value: o.size ?? this.cellWorld * 3.2 }, uLife: { value: o.life ?? 0 },
        uColor: { value: new Color(o.color ?? '#ffd166').multiplyScalar(o.intensity ?? 1.15) }, uGain: { value: this.baseGain },
      },
    });
    this.mesh = new Mesh(g, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.mesh.userData.dispose = () => this.dispose();
    this.off = stage.tick((_dt, t) => {
      this.now = t;
      mat.uniforms.uTime.value = t;
      this.flush();
    });
  }

  get object(): Mesh { return this.mesh; }
  /** Number of glowing points. */
  get count(): number { return this.filled; }
  /** The stage clock (seconds), for staggered births. */
  get time(): number { return this.now; }

  /** The arrows that place every point (up to three). Changing them moves the whole glow. */
  setArrows(arrows: V3[]): void {
    this.arrows = [0, 1, 2].map((i) => arrows[i] ?? [0, 0, 0]) as V3[];
    const u = this.mesh.material.uniforms;
    (u.uA0.value as Vector3).set(...this.arrows[0]);
    (u.uA1.value as Vector3).set(...this.arrows[1]);
    (u.uA2.value as Vector3).set(...this.arrows[2]);
  }

  setOrigin(o: V3): void { (this.mesh.material.uniforms.uOrigin.value as Vector3).set(...o); }
  setGain(g: number): void { this.mesh.material.uniforms.uGain.value = g; }
  setColor(c: string, intensity = 1.15): void { (this.mesh.material.uniforms.uColor.value as Color).set(c).multiplyScalar(intensity); }
  setSize(s: number): void { this.mesh.material.uniforms.uSize.value = s; }

  /** World position of a dial setting under the current arrows. */
  worldOf(c: number[]): V3 {
    const o = this.mesh.material.uniforms.uOrigin.value as Vector3;
    const p: V3 = [o.x, o.y, o.z];
    c.forEach((k, i) => { const a = this.arrows[i]; if (a) for (let j = 0; j < 3; j++) p[j] += k * a[j]; });
    return p;
  }

  /** Dial-space cell size so neighbouring points sit about `cellWorld` apart. */
  private cellCoef(i: number): number {
    const a = this.arrows[i];
    const n = Math.hypot(a[0], a[1], a[2]);
    return n > 1e-6 ? this.cellWorld / n : 1;
  }

  /** Light the point at this dial setting. Returns true if it was new. (`force` skips the one-per-cell check.) */
  deposit(c: number[], delay = 0, force = false): boolean {
    const c0 = c[0] ?? 0, c1 = c[1] ?? 0, c2 = c[2] ?? 0;
    const key = force ? null : `${Math.round(c0 / this.cellCoef(0))},${Math.round(c1 / this.cellCoef(1))},${Math.round(c2 / this.cellCoef(2))}`;
    if (key !== null && this.seen.has(key)) return false;
    const i = this.head;
    const old = this.keys[i];
    if (old !== null && this.seen.get(old) === i) this.seen.delete(old);
    this.keys[i] = key;
    if (key !== null) this.seen.set(key, i);
    this.coef.array[i * 3] = c0; this.coef.array[i * 3 + 1] = c1; this.coef.array[i * 3 + 2] = c2;
    this.born.array[i] = this.now + delay;
    this.dirtyLo = Math.min(this.dirtyLo, i);
    this.dirtyHi = Math.max(this.dirtyHi, i);
    this.head = (this.head + 1) % this.cap;
    if (this.head === 0) this.wrapped = true;
    this.filled = Math.min(this.cap, this.filled + 1);
    this.mesh.geometry.instanceCount = this.filled;
    return true;
  }

  /** Light every point along the straight dial path from c0 to c1 (the tip moves in a straight line). */
  trail(c0: number[], c1: number[]): number {
    const a = this.worldOf(c0), b = this.worldOf(c1);
    const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.min(4000, Math.max(1, Math.ceil(d / (this.cellWorld * 0.6))));
    let added = 0;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      if (this.deposit([0, 1, 2].map((i) => (c0[i] ?? 0) + ((c1[i] ?? 0) - (c0[i] ?? 0)) * t))) added++;
    }
    return added;
  }

  /**
   * Light a whole region of dial space at once (LANTERN's scan), blooming outward from the start.
   * ranges: [min, max] per dial (one, two or three dials); step in dial units (default from the cell).
   */
  fill(ranges: [number, number][], o: { step?: number[]; spread?: number; jitter?: number; seed?: number } = {}): void {
    const steps = ranges.map((_, i) => o.step?.[i] ?? this.cellCoef(i) * 0.95);
    const spread = o.spread ?? 1.4;
    let s = o.seed ?? 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const jit = o.jitter ?? 0.5;
    const counts = ranges.map(([lo, hi], i) => Math.max(1, Math.floor((hi - lo) / steps[i]) + 1));
    const total = counts.reduce((p, x) => p * x, 1);
    let maxR = 1e-6;
    for (const [lo, hi] of ranges) maxR = Math.max(maxR, Math.abs(lo), Math.abs(hi));
    for (let idx = 0; idx < total && idx < this.cap; idx++) {
      let rem = idx;
      const c = ranges.map(([lo], i) => { const k = rem % counts[i]; rem = Math.floor(rem / counts[i]); return lo + (k + (rnd() - 0.5) * jit) * steps[i]; });
      const r = Math.sqrt(c.reduce((p, x) => p + x * x, 0)) / maxR;
      this.deposit(c, spread * r * (0.85 + 0.3 * rnd()), true);
    }
  }

  /** Light n random dial settings inside the ranges whose points pass the filter (a cloud). */
  scatter(n: number, ranges: [number, number][], keep: (p: V3) => boolean = () => true, spread = 1.2, seed = 11): void {
    let s = seed;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    let tries = 0;
    for (let k = 0; k < n && tries < n * 20; tries++) {
      const c = ranges.map(([lo, hi]) => lo + (hi - lo) * rnd());
      if (!keep(this.worldOf(c))) continue;
      this.deposit(c, spread * rnd(), true);
      k++;
    }
  }

  /** Remove every point. */
  clear(): void {
    this.seen.clear();
    this.keys.fill(null);
    this.head = 0;
    this.filled = 0;
    this.wrapped = false;
    this.mesh.geometry.instanceCount = 0;
    this.setGain(this.baseGain);
  }

  /** Fade the glow out, then clear it. */
  async fadeOut(ms = 600): Promise<void> {
    const g0 = this.mesh.material.uniforms.uGain.value as number;
    await animate(ms, (k) => this.setGain(g0 * (1 - k)), ease.out);
    this.clear();
  }

  private flush(): void {
    if (this.dirtyHi < 0) return;
    for (const a of [this.coef, this.born]) {
      a.clearUpdateRanges();
      const n = a.itemSize;
      if (this.wrapped && this.dirtyLo === 0 && this.dirtyHi >= this.cap - 1) a.addUpdateRange(0, this.cap * n);
      else a.addUpdateRange(this.dirtyLo * n, (this.dirtyHi - this.dirtyLo + 1) * n);
      a.needsUpdate = true;
    }
    this.dirtyLo = Infinity;
    this.dirtyHi = -1;
  }

  dispose(): void {
    this.off();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.removeFromParent();
  }
}
