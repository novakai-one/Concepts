// The transformable grid. It is a shader on one big plane: each pixel works out which point of the
// ORIGINAL plane landed on it (q = M⁻¹·p) and lights up if q is on a whole-number line. So the
// picture is exactly "every grid line, moved by M", at any zoom, with no edges.
// When M squashes the plane (det = 0) the moved grid has no inverse; the lines fade out and a
// single bright line (the column space) takes over.
import { Color, DoubleSide, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from 'three';
import type { Stage } from '../core/stage';
import { C, hdr } from '../core/theme';
import { animate, ease } from '../core/tween';
import { det, identity, interpMat2, type Mat, normalize, col, norm } from '../math/la';
import { FatLine } from './lines';

const vert = /* glsl */`
varying vec2 vP;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xy; gl_Position = projectionMatrix * viewMatrix * w; }`;

const frag = /* glsl */`
precision highp float;
varying vec2 vP;
uniform mat2 uMinv; uniform vec2 uT;
uniform float uBase; uniform float uMain; uniform float uAxis; uniform float uSub; uniform float uCollapse;
uniform vec3 uColBase; uniform vec3 uColMain; uniform vec3 uColAxis;
uniform float uFade; uniform vec2 uCenter; uniform float uWidth;

// coverage of whole-number lines of q, with fade when lines are packed tighter than a few pixels
vec2 lineCov(vec2 q, float w){
  vec2 fw = max(fwidth(q), vec2(1e-6));
  vec2 g = abs(fract(q - 0.5) - 0.5) / fw;
  vec2 dens = 1.0 - smoothstep(0.10, 0.30, fw);
  return (1.0 - smoothstep(w * 0.5, w * 0.5 + 1.0, g)) * dens;
}
float axisCov(float q, float w){
  float fw = max(fwidth(q), 1e-6);
  float dens = 1.0 - smoothstep(0.25, 0.6, fw);
  return (1.0 - smoothstep(w * 0.5, w * 0.5 + 1.0, abs(q) / fw)) * dens;
}

void main(){
  float fade = 1.0 - smoothstep(uFade * 0.55, uFade, length(vP - uCenter));
  vec3 col = vec3(0.0); float a = 0.0;

  // the original grid, faint
  vec2 b = lineCov(vP, uWidth * 0.8);
  float base = max(b.x, b.y) * uBase;
  col += uColBase * base; a = max(a, base);

  // the moved grid
  vec2 q = uMinv * (vP - uT);
  float live = 1.0 - uCollapse;
  vec2 m = lineCov(q, uWidth);
  float main = max(m.x, m.y) * uMain * live;
  vec2 s = lineCov(q * 2.0, uWidth * 0.6);
  float sub = max(s.x, s.y) * uSub * live * 0.35;
  float ax = max(axisCov(q.x, uWidth * 1.8), axisCov(q.y, uWidth * 1.8)) * uAxis * live;

  col = mix(col, uColMain, clamp(main + sub, 0.0, 1.0));
  a = max(a, main + sub);
  col = mix(col, uColAxis, clamp(ax, 0.0, 1.0));
  a = max(a, ax);

  a *= fade;
  if (a < 0.003) discard;
  gl_FragColor = vec4(col, a);
}`;

export interface GridOpts {
  base?: number;     // opacity of the faint original grid (0..1)
  main?: number;     // opacity of the moved grid
  axis?: number;     // opacity of the moved axes
  sub?: number;      // half-unit lines
  color?: string;
  fade?: number;     // radius (world units) where the grid fades out
  width?: number;    // line width in pixels
}

export class Grid2D {
  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly collapseLine: FatLine;
  M: Mat = identity(2);
  T: [number, number] = [0, 0];

  constructor(private readonly stage: Stage, o: GridOpts = {}) {
    const mat = new ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, side: DoubleSide,
      uniforms: {
        uMinv: { value: [1, 0, 0, 1] }, uT: { value: new Vector2() },
        uBase: { value: o.base ?? 0.3 }, uMain: { value: o.main ?? 0.62 }, uAxis: { value: o.axis ?? 0.8 },
        uSub: { value: o.sub ?? 0 }, uCollapse: { value: 0 },
        uColBase: { value: new Color(C.gridFaint).multiplyScalar(2.6) },
        uColMain: { value: new Color(o.color ?? C.grid) },
        uColAxis: { value: hdr(C.axis, 1.15) },
        uFade: { value: o.fade ?? 40 }, uCenter: { value: new Vector2() }, uWidth: { value: o.width ?? 1.3 },
      },
    });
    this.mesh = new Mesh(new PlaneGeometry(600, 600), mat);
    this.mesh.renderOrder = -1;
    this.collapseLine = new FatLine(stage, [[-50, 0, 0], [50, 0, 0]], { color: C.violet, width: 4, intensity: 2.2 });
    this.collapseLine.object.visible = false;
    this.mesh.add(this.collapseLine.object);
    this.mesh.position.z = -0.002;
    this.offTick = stage.tick(() => {
      const t = stage.target;
      mat.uniforms.uCenter.value.set(t.x, t.y);
    });
    // removed with the world (clearWorld) or by dispose(): either way the per-frame callback goes too
    this.mesh.userData.dispose = () => this.offTick();
    this.set(this.M);
  }

  get object(): Mesh { return this.mesh; }

  /** Show the grid moved by M (and optionally shifted by T, which breaks linearity: the origin moves). */
  set(M: Mat, T: [number, number] = this.T): void {
    this.M = M.map((r) => r.slice());
    this.T = [T[0], T[1]];
    const u = this.mesh.material.uniforms;
    u.uT.value.set(T[0], T[1]);
    const d = det(M);
    const c1 = col(M, 0), c2 = col(M, 1);
    const scale = Math.max(1e-9, norm(c1) * norm(c2));
    const flatness = Math.abs(d) / scale; // |sin| of the angle between the columns
    if (Math.abs(d) > 1e-10) {
      // GLSL mat2 is column-major: [m00, m10, m01, m11]
      const inv = [M[1][1] / d, -M[1][0] / d, -M[0][1] / d, M[0][0] / d];
      u.uMinv.value = inv;
    }
    const collapse = 1 - Math.min(1, flatness / 0.06);
    u.uCollapse.value = Math.abs(d) <= 1e-10 ? 1 : Math.max(0, collapse) * 0.85;
    // the column space line
    const dir = norm(c1) > 1e-9 ? normalize(c1) : norm(c2) > 1e-9 ? normalize(c2) : null;
    const show = collapse > 0.02 && dir !== null;
    this.collapseLine.object.visible = show;
    if (show && dir) {
      this.collapseLine.setPoints([[T[0] - dir[0] * 60, T[1] - dir[1] * 60, 0.001], [T[0] + dir[0] * 60, T[1] + dir[1] * 60, 0.001]]);
      this.collapseLine.setOpacity(Math.min(1, collapse * 1.2));
    }
  }

  /** Animate from the current matrix to M ('auto' turns rotations by angle; 'linear' moves every entry straight). */
  async to(M: Mat, ms = 1400, T?: [number, number], mode: 'linear' | 'polar' | 'auto' = 'auto'): Promise<void> {
    const M0 = this.M.map((r) => r.slice());
    const T0: [number, number] = [this.T[0], this.T[1]];
    const T1 = T ?? T0;
    await animate(ms, (k) => this.set(interpMat2(M0, M, k, mode), [T0[0] + (T1[0] - T0[0]) * k, T0[1] + (T1[1] - T0[1]) * k]), ease.inOut);
    this.set(M, T1);
  }

  setLook(o: GridOpts): void {
    const u = this.mesh.material.uniforms;
    if (o.base !== undefined) u.uBase.value = o.base;
    if (o.main !== undefined) u.uMain.value = o.main;
    if (o.axis !== undefined) u.uAxis.value = o.axis;
    if (o.sub !== undefined) u.uSub.value = o.sub;
    if (o.color !== undefined) u.uColMain.value = new Color(o.color);
    if (o.fade !== undefined) u.uFade.value = o.fade;
    if (o.width !== undefined) u.uWidth.value = o.width;
  }

  async fadeTo(o: { base?: number; main?: number; axis?: number }, ms = 600): Promise<void> {
    const u = this.mesh.material.uniforms;
    const from = { base: u.uBase.value as number, main: u.uMain.value as number, axis: u.uAxis.value as number };
    await animate(ms, (k) => {
      if (o.base !== undefined) u.uBase.value = from.base + (o.base - from.base) * k;
      if (o.main !== undefined) u.uMain.value = from.main + (o.main - from.main) * k;
      if (o.axis !== undefined) u.uAxis.value = from.axis + (o.axis - from.axis) * k;
    });
  }

  private readonly offTick: () => void;

  dispose(): void {
    this.offTick();
    this.collapseLine.dispose();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.removeFromParent();
  }

  /** Not used by the shader, kept for callers that need the stage. */
  get owner(): Stage { return this.stage; }
}
