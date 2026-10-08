// Deep-space backdrop: a nebula on an inside-out sphere and a twinkling starfield.
// Both sit in stage.sky, which follows the camera, so they read as infinitely far away.
import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Color, Mesh, Points, ShaderMaterial, SphereGeometry,
} from 'three';
import type { Stage } from '../core/stage';
import { ACT_PALETTES, type ActPalette } from '../core/theme';
import { animate, ease } from '../core/tween';

const nebulaVert = /* glsl */`
varying vec3 vDir;
void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const nebulaFrag = /* glsl */`
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uTime; uniform float uIntensity; uniform float uWarp;
varying vec3 vDir;
// 3-D value noise + fbm
float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++){ s += a * noise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float t = uTime * 0.004;
  vec3 q = d * 2.2 + vec3(t, -t * 0.7, t * 0.4);
  float w = fbm(q + uWarp * fbm(q * 1.7));
  float n1 = fbm(q * 1.3 + w * 1.6);
  float n2 = fbm(q * 2.6 - w);
  float band = exp(-pow(d.z * 2.2 + 0.25 * sin(d.x * 3.0), 2.0));        // a soft galactic band
  vec3 col = uA * smoothstep(0.35, 0.95, n1) * 1.4;
  col += uB * smoothstep(0.45, 1.0, n2) * 1.2;
  col += uC * pow(max(0.0, n1 * n2 * 2.0 - 0.3), 2.0) * 2.0;
  col *= 0.55 + 0.9 * band;
  // dark dust lanes
  col *= 0.55 + 0.45 * smoothstep(0.25, 0.65, fbm(q * 3.1 + 4.0));
  gl_FragColor = vec4(col * uIntensity, 1.0);
}`;

const starVert = /* glsl */`
attribute float aSize; attribute float aPhase; attribute vec3 aColor;
uniform float uTime; uniform float uPixelRatio;
varying vec3 vColor; varying float vTw;
void main(){
  vColor = aColor;
  vTw = 0.75 + 0.25 * sin(uTime * (0.6 + aPhase * 2.0) + aPhase * 40.0);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPixelRatio;
  gl_Position = projectionMatrix * mv;
}`;

const starFrag = /* glsl */`
varying vec3 vColor; varying float vTw;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  float core = smoothstep(0.5, 0.0, r);
  float glow = exp(-r * r * 26.0);
  float spike = max(0.0, 1.0 - abs(c.x) * 18.0) * max(0.0, 1.0 - abs(c.y) * 2.2) + max(0.0, 1.0 - abs(c.y) * 18.0) * max(0.0, 1.0 - abs(c.x) * 2.2);
  float a = (core * 0.6 + glow + spike * 0.25) * vTw;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor * a, a);
}`;

export class Backdrop {
  private readonly nebula: Mesh<SphereGeometry, ShaderMaterial>;
  private readonly stars: Points<BufferGeometry, ShaderMaterial>;
  palette: ActPalette = ACT_PALETTES.default;

  constructor(stage: Stage, count = 5200) {
    const nm = new ShaderMaterial({
      vertexShader: nebulaVert, fragmentShader: nebulaFrag, side: BackSide, depthWrite: false,
      uniforms: {
        uA: { value: new Color(this.palette.nebulaA) }, uB: { value: new Color(this.palette.nebulaB) },
        uC: { value: new Color(this.palette.nebulaC) }, uTime: { value: 0 }, uIntensity: { value: 1 }, uWarp: { value: 1.2 },
      },
    });
    this.nebula = new Mesh(new SphereGeometry(1500, 48, 32), nm);
    this.nebula.renderOrder = -10;
    stage.sky.add(this.nebula);

    const pos = new Float32Array(count * 3), size = new Float32Array(count), phase = new Float32Array(count), col = new Float32Array(count * 3);
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const temps = [new Color('#9bb0ff'), new Color('#cad7ff'), new Color('#f8f7ff'), new Color('#fff4ea'), new Color('#ffd2a1'), new Color('#ffb56c')];
    for (let i = 0; i < count; i++) {
      // uniform on a sphere, with extra density near a band
      let z = rnd() * 2 - 1;
      if (rnd() < 0.35) z *= 0.25;
      const th = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
      const R = 900 + rnd() * 400;
      pos.set([R * r * Math.cos(th), R * r * Math.sin(th), R * z], i * 3);
      const big = rnd();
      size[i] = big > 0.995 ? 9 + rnd() * 6 : big > 0.96 ? 4.5 + rnd() * 3 : 1.6 + rnd() * 2.2;
      phase[i] = rnd();
      const c = temps[Math.floor(rnd() * temps.length)].clone().multiplyScalar(big > 0.96 ? 1.6 : 1.0);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aSize', new BufferAttribute(size, 1));
    g.setAttribute('aPhase', new BufferAttribute(phase, 1));
    g.setAttribute('aColor', new BufferAttribute(col, 3));
    const sm = new ShaderMaterial({
      vertexShader: starVert, fragmentShader: starFrag, transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) } },
    });
    this.stars = new Points(g, sm);
    this.stars.renderOrder = -9;
    stage.sky.add(this.stars);

    stage.tick((_dt, t) => {
      nm.uniforms.uTime.value = t;
      sm.uniforms.uTime.value = t;
    });
  }

  /** Blend to another act palette. */
  async setPalette(name: keyof typeof ACT_PALETTES | ActPalette, ms = 1500): Promise<void> {
    const p = typeof name === 'string' ? ACT_PALETTES[name] : name;
    const u = this.nebula.material.uniforms;
    const from = [u.uA.value.clone(), u.uB.value.clone(), u.uC.value.clone()] as Color[];
    const to = [new Color(p.nebulaA), new Color(p.nebulaB), new Color(p.nebulaC)];
    this.palette = p;
    await animate(ms, (k) => {
      u.uA.value.lerpColors(from[0], to[0], k);
      u.uB.value.lerpColors(from[1], to[1], k);
      u.uC.value.lerpColors(from[2], to[2], k);
    }, ease.inOut);
  }

  setIntensity(x: number): void { this.nebula.material.uniforms.uIntensity.value = x; }
  setWarp(x: number): void { this.nebula.material.uniforms.uWarp.value = x; }
}
