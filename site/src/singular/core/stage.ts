// The 3-D stage every scene draws into: renderer, camera, bloom, DOM labels, render loop, picking.
// 2-D puzzles live on the z = 0 plane and are viewed straight down (no distortion: the plane is
// parallel to the screen). 3-D puzzles tilt the same camera, so the plane becomes the floor.
import {
  ACESFilmicToneMapping, AmbientLight, Clock, DirectionalLight, Group, HalfFloatType, HemisphereLight, Mesh, Object3D,
  PerspectiveCamera, Plane, PMREMGenerator, Raycaster, Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
  type Material, type Texture,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { animate, ease, stepTweens, lerp } from './tween';

export type V3 = [number, number, number];

export interface View2D { center?: [number, number]; height?: number; ms?: number }
export interface View3D { target?: V3; distance?: number; azimuth?: number; elevation?: number; ms?: number; orbit?: boolean }

const FOV = 32;

/** Vignette + film grain + subtle chromatic edge: the final look of every frame. */
const FinishShader = {
  uniforms: {
    tDiffuse: { value: null as Texture | null }, uTime: { value: 0 }, uVignette: { value: 0.32 }, uGrain: { value: 0.035 }, uFlash: { value: 0 },
    uWaveC: { value: new Vector2(0.5, 0.5) }, uWaveR: { value: -1 }, uWaveAmp: { value: 0 }, uAspect: { value: 1 },
  },
  vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uVignette; uniform float uGrain; uniform float uFlash;
    uniform vec2 uWaveC; uniform float uWaveR; uniform float uWaveAmp; uniform float uAspect;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      // shockwave ring: push pixels outward near the ring front
      float ring = 0.0;
      if (uWaveR > 0.0) {
        vec2 w = (uv - uWaveC) * vec2(uAspect, 1.0);
        float dist = length(w);
        float k = (dist - uWaveR) / 0.06;
        ring = exp(-k * k) * uWaveAmp;
        // light only: no pixel displacement, so straight lines on screen stay straight during a pulse
      }
      vec2 d = uv - 0.5;
      float r2 = dot(d,d);
      vec2 off = d * (0.0022 * r2 * 4.0 + ring * 0.003);
      vec4 c = texture2D(tDiffuse, uv);
      c.r = texture2D(tDiffuse, uv + off).r;
      c.b = texture2D(tDiffuse, uv - off).b;
      c.rgb += vec3(0.35, 0.75, 1.0) * ring * 0.3;
      c.rgb *= 1.0 - uVignette * smoothstep(0.08, 0.55, r2);
      c.rgb += (hash(vUv * 1000.0 + uTime) - 0.5) * uGrain;
      c.rgb = mix(c.rgb, vec3(1.0), uFlash);
      gl_FragColor = c;
    }`,
};

export class Stage {
  readonly container: HTMLElement;
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  /** Puzzle content. Cleared between puzzles. */
  readonly world = new Group();
  /** Effects (particles, flashes). */
  readonly fx = new Group();
  /** Things that follow the camera (sky). */
  readonly sky = new Group();
  readonly labels: CSS2DRenderer;
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  readonly finish: ShaderPass;
  controls: OrbitControls | null = null;
  readonly size = new Vector2(1, 1);
  private readonly ticks = new Set<(dt: number, t: number) => void>();
  private readonly resizers = new Set<(w: number, h: number) => void>();
  private readonly clock = new Clock();
  private readonly ray = new Raycaster();
  private lookTarget = new Vector3();
  private shake = 0;
  private running = false;
  mode: '2d' | '3d' = '2d';
  /** Frames per second, smoothed (for the debug overlay and quality auto-tune). */
  fps = 60;
  /** Lower the resolution / bloom when the frame rate stays low. */
  autoQuality = true;
  private slowFor = 0;
  private qualityStep = 0;

  constructor(container: HTMLElement, opts: { quality?: 'high' | 'low' } = {}) {
    this.container = container;
    const low = opts.quality === 'low';
    this.renderer = new WebGLRenderer({ antialias: !low, powerPreference: 'high-performance', alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(0x04050b, 1);
    this.renderer.domElement.className = 'stage-canvas';
    container.appendChild(this.renderer.domElement);

    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'stage-labels';
    container.appendChild(this.labels.domElement);

    this.camera = new PerspectiveCamera(FOV, 1, 0.05, 3000);
    this.camera.position.set(0, 0, 20);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(this.sky, this.world, this.fx);
    this.scene.add(new AmbientLight(0x8899cc, 0.55));
    this.scene.add(new HemisphereLight(0xbfd8ff, 0x10121c, 0.6));
    const key = new DirectionalLight(0xffffff, 2.2);
    key.position.set(6, -8, 14);
    this.scene.add(key);
    const rim = new DirectionalLight(0x59e1ff, 1.2);
    rim.position.set(-10, 12, -4);
    this.scene.add(rim);

    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;

    this.composer = new EffectComposer(this.renderer);
    this.composer.renderTarget1.texture.type = HalfFloatType;
    this.composer.renderTarget2.texture.type = HalfFloatType;
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new Vector2(256, 256), low ? 0.4 : 0.6, 0.2, 0.7);
    // Weight the coarse mips down: on dense lattices their large texels show as soft squares.
    this.bloom.compositeMaterial.uniforms.bloomFactors.value = [1.0, 0.9, 0.62, 0.3, 0.1];
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.finish = new ShaderPass(FinishShader);
    this.composer.addPass(this.finish);

    const ro = new ResizeObserver(() => this.resize());
    ro.observe(container);
    this.resize();
  }

  resize(): void {
    const w = Math.max(1, this.container.clientWidth), h = Math.max(1, this.container.clientHeight);
    this.size.set(w, h);
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.labels.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    for (const f of this.resizers) f(w, h);
  }

  /** Line materials and the like need the canvas size in pixels. */
  onResize(f: (w: number, h: number) => void): () => void {
    this.resizers.add(f);
    f(this.size.x, this.size.y);
    return () => this.resizers.delete(f);
  }

  /** Register a per-frame callback; returns an unsubscribe function. */
  tick(f: (dt: number, t: number) => void): () => void {
    this.ticks.add(f);
    return () => this.ticks.delete(f);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      this.frame();
    };
    requestAnimationFrame(loop);
  }

  stop(): void { this.running = false; }

  /** Render one frame (the test harness calls this directly when it needs a deterministic frame). */
  frame(): void {
    const dt = Math.min(0.1, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    if (dt > 0) this.fps = lerp(this.fps, 1 / dt, 0.05);
    if (this.autoQuality && document.visibilityState === 'visible') {
      this.slowFor = this.fps < 32 ? this.slowFor + dt : Math.max(0, this.slowFor - dt * 2);
      if (this.slowFor > 4 && this.qualityStep < 2) { this.lowerQuality(); this.slowFor = 0; }
    }
    stepTweens(performance.now());
    for (const f of [...this.ticks]) f(dt, t);
    if (this.controls) this.controls.update();
    if (this.shake > 0.0005) {
      const s = this.shake;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
      this.shake *= Math.pow(0.02, dt);
    }
    this.sky.position.copy(this.camera.position);
    (this.finish.uniforms.uTime as { value: number }).value = t;
    this.composer.render(dt);
    this.labels.render(this.scene, this.camera);
  }

  /** One step down: first pixel ratio 1, then no bloom. */
  lowerQuality(): void {
    this.qualityStep++;
    if (this.qualityStep === 1) {
      this.renderer.setPixelRatio(1);
      this.resize();
    } else {
      this.bloom.enabled = false;
    }
  }

  // ---------- camera ----------

  /** Straight-down view of the z = 0 plane showing `height` world units vertically. */
  async view2D(o: View2D = {}): Promise<void> {
    const [cx, cy] = o.center ?? [0, 0];
    const height = o.height ?? 10;
    const dist = height / 2 / Math.tan((FOV * Math.PI) / 360);
    this.disposeControls();
    this.mode = '2d';
    await this.moveCamera(new Vector3(cx, cy, dist), new Vector3(cx, cy, 0), new Vector3(0, 1, 0), o.ms ?? 0);
  }

  /** Orbiting 3-D view. z is up; the 2-D plane becomes the floor. Azimuth/elevation in degrees. */
  async view3D(o: View3D = {}): Promise<void> {
    const target = new Vector3(...(o.target ?? [0, 0, 0]));
    const d = o.distance ?? 16;
    const az = ((o.azimuth ?? -60) * Math.PI) / 180, el = ((o.elevation ?? 28) * Math.PI) / 180;
    const pos = new Vector3(
      target.x + d * Math.cos(el) * Math.cos(az),
      target.y + d * Math.cos(el) * Math.sin(az),
      target.z + d * Math.sin(el),
    );
    this.disposeControls();
    this.mode = '3d';
    await this.moveCamera(pos, target, new Vector3(0, 0, 1), o.ms ?? 0);
    if (o.orbit !== false) this.enableOrbit(target);
  }

  enableOrbit(target: Vector3 = this.lookTarget): void {
    this.disposeControls();
    const c = new OrbitControls(this.camera, this.renderer.domElement);
    c.target.copy(target);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.enablePan = false;
    c.minDistance = 4;
    c.maxDistance = 60;
    c.rotateSpeed = 0.7;
    c.update();
    this.controls = c;
  }

  disposeControls(): void {
    if (this.controls) { this.controls.dispose(); this.controls = null; }
  }

  /** Tween the camera to a new position / look target / up vector. */
  private camGen = 0;
  async moveCamera(pos: Vector3, target: Vector3, up: Vector3, ms: number): Promise<void> {
    const p0 = this.camera.position.clone(), t0 = this.lookTarget.clone(), u0 = this.camera.up.clone();
    // a newer camera move wins: an older animation still running stops touching the camera
    const gen = ++this.camGen;
    const apply = (k: number) => {
      if (gen !== this.camGen) return;
      this.camera.position.lerpVectors(p0, pos, k);
      this.lookTarget.lerpVectors(t0, target, k);
      this.camera.up.lerpVectors(u0, up, k).normalize();
      this.camera.lookAt(this.lookTarget);
    };
    if (ms <= 0) { apply(1); return; }
    await animate(ms, apply, ease.inOut);
  }

  get target(): Vector3 { return this.lookTarget.clone(); }

  /** Visible half-height of the z = 0 plane at the current camera distance (2-D mode). */
  planeHalfHeight(): number {
    return Math.abs(this.camera.position.z) * Math.tan((FOV * Math.PI) / 360);
  }

  nudge(amount = 0.15): void { this.shake = Math.max(this.shake, amount); }

  /** A ring of light expanding from a world point (it never bends the picture: lines stay straight). */
  async shockwave(at: V3 = [0, 0, 0], ms = 1600, amp = 1): Promise<void> {
    const u = this.finish.uniforms as Record<string, { value: unknown }>;
    const p = this.toScreen(at);
    (u.uWaveC.value as Vector2).set(p.x / this.size.x, 1 - p.y / this.size.y);
    u.uAspect.value = this.size.x / this.size.y;
    await animate(ms, (k) => { u.uWaveR.value = 0.02 + k * 1.6; u.uWaveAmp.value = amp * (1 - k) * Math.min(1, k * 8); }, ease.out);
    u.uWaveR.value = -1;
    u.uWaveAmp.value = 0;
  }

  flash(strength = 0.35, ms = 380): void {
    const u = this.finish.uniforms.uFlash as { value: number };
    void animate(ms, (k) => { u.value = strength * (1 - k); }, ease.out);
  }

  // ---------- picking ----------

  private ndc(clientX: number, clientY: number): Vector2 {
    const r = this.renderer.domElement.getBoundingClientRect();
    return new Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  }

  /** Where the pointer ray meets a plane (default: z = 0). */
  toPlane(clientX: number, clientY: number, plane = new Plane(new Vector3(0, 0, 1), 0)): Vector3 | null {
    this.ray.setFromCamera(this.ndc(clientX, clientY), this.camera);
    const out = new Vector3();
    return this.ray.ray.intersectPlane(plane, out);
  }

  /** Objects under the pointer (meshes only). */
  pick(clientX: number, clientY: number, objects: Object3D[]): Object3D | null {
    this.ray.setFromCamera(this.ndc(clientX, clientY), this.camera);
    const hits = this.ray.intersectObjects(objects, true);
    return hits.length ? hits[0].object : null;
  }

  /** World point → CSS pixels relative to the canvas. */
  toScreen(p: V3 | Vector3): { x: number; y: number } {
    const v = Array.isArray(p) ? new Vector3(...p) : p.clone();
    v.project(this.camera);
    return { x: ((v.x + 1) / 2) * this.size.x, y: ((1 - v.y) / 2) * this.size.y };
  }

  /** Remove and dispose everything in the puzzle layer. */
  clearWorld(): void {
    clearGroup(this.world);
    clearGroup(this.fx);
  }
}

export function clearGroup(g: Object3D): void {
  for (const child of [...g.children]) {
    g.remove(child);
    disposeDeep(child);
  }
}

export function disposeDeep(o: Object3D): void {
  const owners: (() => void)[] = [];
  o.traverse((n) => {
    // CSS2D labels only remove their DOM element when they themselves are removed, not their parent
    const el = (n as Object3D & { isCSS2DObject?: boolean; element?: HTMLElement }).element;
    if ((n as { isCSS2DObject?: boolean }).isCSS2DObject && el) el.remove();
    const d = (n.userData as { dispose?: () => void }).dispose;
    if (typeof d === 'function') owners.push(d);
    const m = n as Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as Material | Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else if (mat) mat.dispose();
  });
  (o as Object3D & { dispose?: () => void }).dispose?.();
  // objects that own per-frame callbacks (ships, pads, beacons) clean themselves up
  for (const f of owners) { try { f(); } catch { /* already disposed */ } }
}
