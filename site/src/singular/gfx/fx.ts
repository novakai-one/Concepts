// Particle effects: success bursts, sparks along a path, a shockwave ring.
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, MeshBasicMaterial, Points, RingGeometry,
  ShaderMaterial,
} from 'three';
import type { Stage, V3 } from '../core/stage';
import { animate, ease } from '../core/tween';

const vert = /* glsl */`
attribute float aLife; attribute float aSize;
varying float vLife;
uniform float uPixelRatio;
void main(){ vLife = aLife; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = aSize * uPixelRatio * (8.0 / -mv.z) * 6.0; gl_Position = projectionMatrix * mv; }`;
const frag = /* glsl */`
uniform vec3 uColor; varying float vLife;
void main(){ vec2 c = gl_PointCoord - 0.5; float r = length(c); float a = exp(-r*r*18.0) * vLife; if (a < 0.01) discard; gl_FragColor = vec4(uColor * (1.0 + 2.0 * vLife) * a, a); }`;

/** A burst of sparks from a point. Resolves when the sparks have faded. */
export async function burst(stage: Stage, at: V3, color = '#3ddc84', count = 70, speed = 3.2, planar = true): Promise<void> {
  const pos = new Float32Array(count * 3), vel = new Float32Array(count * 3), life = new Float32Array(count), size = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos.set(at, i * 3);
    const th = Math.random() * Math.PI * 2;
    const ph = planar ? 0 : (Math.random() - 0.5) * Math.PI;
    const s = speed * (0.35 + Math.random() * 0.75);
    vel.set([Math.cos(th) * Math.cos(ph) * s, Math.sin(th) * Math.cos(ph) * s, (planar ? 0.15 : 1) * Math.sin(ph) * s + (planar ? Math.random() * 0.4 : 0)], i * 3);
    life[i] = 1;
    size[i] = 0.6 + Math.random() * 1.4;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aLife', new BufferAttribute(life, 1));
  g.setAttribute('aSize', new BufferAttribute(size, 1));
  const m = new ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uColor: { value: new Color(color) }, uPixelRatio: { value: stage.renderer.getPixelRatio() } },
  });
  const pts = new Points(g, m);
  stage.fx.add(pts);
  let last = 0;
  await animate(1100, (k) => {
    const dt = (k - last) * 1.1;
    last = k;
    for (let i = 0; i < count; i++) {
      for (let a = 0; a < 3; a++) {
        pos[i * 3 + a] += vel[i * 3 + a] * dt;
        vel[i * 3 + a] *= 1 - 2.2 * dt;
      }
      life[i] = Math.max(0, 1 - k * (0.8 + (i % 7) * 0.05));
    }
    g.attributes.position.needsUpdate = true;
    g.attributes.aLife.needsUpdate = true;
  }, ease.linear);
  pts.removeFromParent();
  g.dispose();
  m.dispose();
}

/** An expanding ring on the plane. */
export async function shockwave(stage: Stage, at: V3, color = '#59e1ff', radius = 3, ms = 900): Promise<void> {
  const ring = new Mesh(new RingGeometry(0.9, 1, 96), new MeshBasicMaterial({ color: new Color(color).multiplyScalar(1.8), transparent: true, opacity: 0.9, side: DoubleSide, depthWrite: false, blending: AdditiveBlending }));
  ring.position.set(...at);
  stage.fx.add(ring);
  await animate(ms, (k) => {
    ring.scale.setScalar(0.05 + radius * k);
    ring.material.opacity = 0.9 * (1 - k);
  }, ease.out);
  ring.removeFromParent();
  ring.geometry.dispose();
  ring.material.dispose();
}

/** Win feedback at a point: burst + ring + a small flash. */
export async function celebrate(stage: Stage, at: V3, color = '#3ddc84'): Promise<void> {
  stage.flash(0.08, 300);
  await Promise.all([burst(stage, at, color), shockwave(stage, at, color, 2.4)]);
}
