// A field of glowing points on whole-number positions (a lattice of light). A matrix moves every
// point at once, so the field shows a linear transformation directly. Points can be picked,
// highlighted and connected. Instanced: thousands of points in one draw call.
import {
  AdditiveBlending, Color, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshBasicMaterial,
  PlaneGeometry, ShaderMaterial, SphereGeometry, Group,
} from 'three';
import type { Stage, V3 } from '../core/stage';
import { animate, ease } from '../core/tween';
import { interpMat2, mlerp, type Mat } from '../math/la';

const CORE_DIM = 0.7, CORE_LIT = 1.8;

const haloVert = /* glsl */`
uniform float uHalo;
attribute vec3 aColor; attribute float aGlow;
varying vec2 vUv; varying vec3 vColor; varying float vGlow;
void main(){
  vUv = uv; vColor = aColor; vGlow = aGlow;
  vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  // camera-facing quad
  c.xy += position.xy * (0.55 + 0.6 * aGlow) * uHalo;
  gl_Position = projectionMatrix * c;
}`;
const haloFrag = /* glsl */`
varying vec2 vUv; varying vec3 vColor; varying float vGlow;
void main(){ vec2 d = vUv - 0.5; float a = exp(-dot(d,d) * 16.0) * (0.3 + 0.7 * vGlow); if (a < 0.01) discard; gl_FragColor = vec4(vColor * a, a); }`;

export interface BuoyOpts {
  /** Whole-number positions from -extent..extent on each axis. */
  extent?: number;
  /** 2 = a plane of points (z = 0), 3 = a cube of points. */
  dims?: 2 | 3;
  color?: string;
  size?: number;
  /** Halo size multiplier (default 1). Use less than 1 for dense clouds, where halos merge into blobs. */
  halo?: number;
  /** Explicit positions instead of a lattice. */
  points?: V3[];
}

export class BuoyField {
  readonly group = new Group();
  readonly base: V3[];
  private readonly cores: InstancedMesh;
  private readonly halos: InstancedMesh;
  private readonly colors: Float32Array;
  private readonly glows: Float32Array;
  private readonly baseColor: Color;
  M: Mat;
  private readonly dims: 2 | 3;
  private readonly tmp = new Matrix4();

  constructor(private readonly stage: Stage, o: BuoyOpts = {}) {
    this.dims = o.dims ?? 2;
    const n = o.extent ?? 5;
    const pts: V3[] = o.points ?? [];
    if (!o.points) {
      for (let x = -n; x <= n; x++) for (let y = -n; y <= n; y++) {
        if (this.dims === 2) pts.push([x, y, 0]);
        else for (let z = -n; z <= n; z++) pts.push([x, y, z]);
      }
    }
    this.base = pts;
    this.M = this.dims === 2 ? [[1, 0], [0, 1]] : [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    this.baseColor = new Color(o.color ?? '#9fd8ff');
    const s = o.size ?? 0.06;
    // Plain buoys stay just under the bloom threshold (their own halo is the glow): three's bloom blur
    // is box-shaped, so a whole lattice of blooming points shows soft squares. Lit buoys bloom.
    this.cores = new InstancedMesh(new SphereGeometry(s, 10, 8), new MeshBasicMaterial({ color: '#ffffff' }), pts.length);
    this.cores.instanceMatrix.setUsage(DynamicDrawUsage);
    for (let i = 0; i < pts.length; i++) this.cores.setColorAt(i, this.baseColor.clone().multiplyScalar(CORE_DIM));
    this.colors = new Float32Array(pts.length * 3);
    this.glows = new Float32Array(pts.length);
    for (let i = 0; i < pts.length; i++) { this.colors.set([this.baseColor.r, this.baseColor.g, this.baseColor.b], i * 3); this.glows[i] = 0; }
    const haloMat = new ShaderMaterial({ uniforms: { uHalo: { value: o.halo ?? 1 } }, vertexShader: haloVert, fragmentShader: haloFrag, transparent: true, depthWrite: false, blending: AdditiveBlending });
    const quad = new PlaneGeometry(1, 1);
    quad.setAttribute('aColor', new InstancedBufferAttribute(this.colors, 3));
    quad.setAttribute('aGlow', new InstancedBufferAttribute(this.glows, 1));
    this.halos = new InstancedMesh(quad, haloMat, pts.length);
    this.halos.instanceMatrix.setUsage(DynamicDrawUsage);
    this.halos.frustumCulled = false;
    this.cores.frustumCulled = false;
    this.group.add(this.halos, this.cores);
    this.apply();
  }

  get object(): Group { return this.group; }
  get count(): number { return this.base.length; }

  /** Where point i is now. */
  pos(i: number): V3 {
    const p = this.base[i], M = this.M;
    if (this.dims === 2) return [M[0][0] * p[0] + M[0][1] * p[1], M[1][0] * p[0] + M[1][1] * p[1], p[2]];
    return [0, 1, 2].map((r) => M[r][0] * p[0] + M[r][1] * p[1] + M[r][2] * p[2]) as V3;
  }

  /** Index of the lattice point that started at p (or -1). */
  indexOf(p: V3): number {
    return this.base.findIndex((q) => q[0] === p[0] && q[1] === p[1] && (q[2] ?? 0) === (p[2] ?? 0));
  }

  private apply(): void {
    for (let i = 0; i < this.base.length; i++) {
      const [x, y, z] = this.pos(i);
      this.tmp.makeTranslation(x, y, z);
      this.cores.setMatrixAt(i, this.tmp);
      this.halos.setMatrixAt(i, this.tmp);
    }
    this.cores.instanceMatrix.needsUpdate = true;
    this.halos.instanceMatrix.needsUpdate = true;
  }

  set(M: Mat): void { this.M = M.map((r) => r.slice()); this.apply(); }

  async to(M: Mat, ms = 1400, mode: 'linear' | 'auto' = 'auto'): Promise<void> {
    const M0 = this.M.map((r) => r.slice());
    await animate(ms, (k) => { this.M = this.dims === 2 ? interpMat2(M0, M, k, mode) : mlerp(M0, M, k); this.apply(); }, ease.inOut);
    this.set(M);
  }

  /** Light some points in a colour (glow 0..1). Pass null colour to reset to the base colour. */
  highlight(idx: number[], color: string | null, glow = 1): void {
    const c = color ? new Color(color) : this.baseColor;
    const core = c.clone().multiplyScalar(color ? CORE_DIM + (CORE_LIT - CORE_DIM) * glow : CORE_DIM);
    for (const i of idx) { this.colors.set([c.r, c.g, c.b], i * 3); this.glows[i] = color ? glow : 0; this.cores.setColorAt(i, core); }
    if (this.cores.instanceColor) this.cores.instanceColor.needsUpdate = true;
    (this.halos.geometry.getAttribute('aColor') as InstancedBufferAttribute).needsUpdate = true;
    (this.halos.geometry.getAttribute('aGlow') as InstancedBufferAttribute).needsUpdate = true;
  }

  clearHighlights(): void { this.highlight([...this.base.keys()], null); }

  /** The point nearest the pointer (within `px` screen pixels), or -1. */
  pick(clientX: number, clientY: number, px = 18): number {
    const r = this.stage.renderer.domElement.getBoundingClientRect();
    const mx = clientX - r.left, my = clientY - r.top;
    let best = -1, bd = px * px;
    for (let i = 0; i < this.base.length; i++) {
      const s = this.stage.toScreen(this.pos(i));
      const d = (s.x - mx) ** 2 + (s.y - my) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  dispose(): void {
    this.cores.geometry.dispose(); (this.cores.material as MeshBasicMaterial).dispose();
    this.halos.geometry.dispose(); (this.halos.material as ShaderMaterial).dispose();
    this.group.removeFromParent();
  }
}
