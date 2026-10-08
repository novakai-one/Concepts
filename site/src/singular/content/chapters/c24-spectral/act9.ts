// Act IX pictures shared by Chapters 24–26: scene tags, the energy surface z = xᵀSx with a rolling probe
// (DESCEND), and the exterior set: the ark with its stern as a sheet (the real Collapse pulse C on the
// stern's own vertices) that can be moved by any matrix (the Unfold plays C^(1−t): never flat on the way),
// brace lines along the stern's principal axes, the Anchor and the Lantern.
import './act9.css';
import {
  BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3,
  type Material, type Object3D,
} from 'three';
import type { Game, PuzzleCtx, V3 } from '../../../game/types';
import { Label } from '../../../gfx/label';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { Dot, glowSprite } from '../../../gfx/markers';
import { loadModel, type Ship } from '../../../gfx/models';
import { Composite } from '../../../kit/geom';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { makeAnchor, makeLantern } from '../../common/set';
import { C as COLLAPSE } from '../../truth';
import { matVec, type Mat, type Vec } from '../../../math/la';
import { RIM, quadForm, roll, symEig, type Roll } from './logic';

export const v3 = (v: readonly number[], z = 0): V3 => [v[0], v[1], (v[2] ?? 0) + z];

/** Thrown when the player leaves a cinematic part-way: stop quietly. */
export class Gone extends Error {}

/** A pill label. kind: '' (white), 'y', 'g', 'r', 'b', 'vi', 'o', 'c', 'dim'. */
export function tag(text: string, at: V3, kind = '', offset: [number, number] = [0, 0]): Label {
  return new Label(text, at, { className: `a9-tag ${kind}`, offset });
}
/** A label added to a puzzle (disposed with it). */
export function ptag(p: PuzzleCtx, text: string, at: V3, kind = '', offset: [number, number] = [0, 0]): Label {
  const l = tag(text, at, kind, offset);
  p.add(l.object);
  p.onDispose(() => l.dispose());
  return l;
}
/** Anything with dispose(), added to the world and cleaned with it (cinematics). */
export function inWorld<T extends { object: Object3D; dispose(): void }>(g: Game, x: T, parent: Object3D = g.stage.world): T {
  parent.add(x.object);
  const old = x.object.userData.dispose as (() => void) | undefined;
  x.object.userData.dispose = () => { old?.(); x.dispose(); };
  return x;
}

// ================================================================== the energy surface (DESCEND)

const LOW = new Color('#081a36'), MID = new Color('#174f92'), HIGH = new Color('#58aef5');
function heightColor(t: number): Color {
  // t in [−1, 1]: below the floor dark, above it light
  const c = new Color();
  if (t < 0) c.copy(MID).lerp(LOW, Math.min(1, -t));
  else c.copy(MID).lerp(HIGH, Math.min(1, t));
  return c;
}

export interface SurfaceOpts {
  S: Mat;
  /** Disc radius (default RIM). */
  R?: number;
  /** Height of the tallest point above the floor (default 2.2). Fixed when the matrix changes. */
  height?: number;
  /** Largest |eigenvalue| the height is scaled for (default: the starting matrix's). */
  scaleFor?: number;
  /** Draw the survey grid on the surface (default true). */
  grid?: boolean;
  /** Draw the turned grid's own two axes on the surface (cyan). */
  gridAxes?: boolean;
  theta?: number;
}

/**
 * z = k·xᵀSx over a disc, shaded by height, with the survey grid drawn on it (turnable), the floor rim,
 * optional eigenvector axes (lifted onto the surface), and a probe that rolls downhill.
 */
export class Surface extends Composite {
  S: Mat;
  readonly R: number;
  readonly k: number;
  theta: number;
  private readonly geo = new BufferGeometry();
  private readonly mat: MeshStandardMaterial;
  private readonly mesh: Mesh;
  private readonly wire: FatSegments | null = null;
  private readonly axesL: FatLine[] = [];
  private readonly gridAxes: FatLine[] = [];
  readonly probe: Dot;
  private readonly trail: FatLine;
  private readonly rings = 30;
  private readonly segs = 84;
  private axesOn = false;

  constructor(p: PuzzleCtx, private readonly o: SurfaceOpts) {
    super(p);
    this.S = o.S.map((r) => r.slice());
    this.R = o.R ?? RIM;
    const big = o.scaleFor ?? Math.max(1e-9, ...symEig(this.S).values.map(Math.abs));
    this.k = (o.height ?? 2.2) / (big * this.R * this.R);
    this.theta = o.theta ?? 0;
    const n = (this.rings + 1) * this.segs + 1;
    this.geo.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    this.geo.setAttribute('color', new BufferAttribute(new Float32Array(n * 3), 3));
    const idx: number[] = [];
    const id = (r: number, s: number) => 1 + (r - 1) * this.segs + (s % this.segs);
    for (let s = 0; s < this.segs; s++) idx.push(0, id(1, s), id(1, s + 1));
    for (let r = 1; r < this.rings + 1; r++) for (let s = 0; s < this.segs; s++) {
      if (r === this.rings) continue;
      idx.push(id(r, s), id(r + 1, s), id(r + 1, s + 1), id(r, s), id(r + 1, s + 1), id(r, s + 1));
    }
    this.geo.setIndex(idx);
    this.mat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05, side: DoubleSide, transparent: true, opacity: 0.78, depthWrite: false, emissive: new Color('#06122a'), emissiveIntensity: 0.5 });
    this.mesh = new Mesh(this.geo, this.mat);
    this.mesh.renderOrder = 1;
    this.group.add(this.mesh);
    this.parts.push({ dispose: () => { this.geo.dispose(); this.mat.dispose(); } });
    const st = p.g.stage;
    // the floor rim (the plane the surface stands on)
    const rim: V3[] = [];
    for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; rim.push([this.R * Math.cos(a), this.R * Math.sin(a), 0]); }
    this.own(new FatLine(st, rim, { color: C.white, width: 1.2, opacity: 0.25, dashed: true, dashSize: 0.12, gapSize: 0.1 }));
    if (o.grid !== false) {
      this.wire = this.own(new FatSegments(st, [[[0, 0, 0], [0, 0, 0]]], { color: '#bfe3ff', width: 1.1, opacity: 0.5 }));
      if (o.gridAxes) for (let i = 0; i < 2; i++) this.gridAxes.push(this.own(new FatLine(st, [[0, 0, 0], [0, 0, 0]], { color: C.accent, width: 2.4, intensity: 1.2, opacity: 0.95 })));
    }
    for (let i = 0; i < 2; i++) { const L = this.own(new FatLine(st, [[0, 0, 0], [0, 0, 0]], { color: [C.v, C.w][i], width: 2.6, intensity: 1.2 })); L.object.visible = false; this.axesL.push(L); }
    this.trail = this.own(new FatLine(st, [[0, 0, 0], [0, 0, 0]], { color: C.result, width: 2, opacity: 0.8 }));
    this.trail.object.visible = false;
    this.probe = new Dot([0, 0, 0], { color: C.result, size: 0.11, glow: 0.8 });
    this.group.add(this.probe.object);
    this.parts.push(this.probe);
    this.probe.object.visible = false;
    this.rebuild();
  }

  /** Height of the surface above (x, y). */
  z(x: number, y: number): number { return this.k * quadForm(this.S, [x, y]); }
  at(x: readonly number[], lift = 0): V3 { return [x[0], x[1], this.z(x[0], x[1]) + lift]; }

  setS(S: Mat): void { this.S = S.map((r) => r.slice()); this.rebuild(); }
  setTheta(t: number): void { this.theta = t; this.drawGrid(); }
  showAxes(on: boolean): void { this.axesOn = on; this.drawAxes(); }
  setOpacity(a: number): void { this.mat.opacity = a; }

  private rebuild(): void {
    const pos = this.geo.attributes.position as BufferAttribute, col = this.geo.attributes.color as BufferAttribute;
    const H = this.o.height ?? 2.2;
    const put = (i: number, x: number, y: number) => {
      const z = this.z(x, y);
      pos.setXYZ(i, x, y, z);
      const c = heightColor(z / H);
      col.setXYZ(i, c.r, c.g, c.b);
    };
    put(0, 0, 0);
    for (let r = 1; r <= this.rings; r++) for (let s = 0; s < this.segs; s++) {
      const rr = (this.R * r) / this.rings, a = (s / this.segs) * Math.PI * 2;
      put(1 + (r - 1) * this.segs + s, rr * Math.cos(a), rr * Math.sin(a));
    }
    pos.needsUpdate = true; col.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();
    this.drawGrid();
    this.drawAxes();
  }

  /** Lines of the turned survey grid, lying on the surface. */
  private drawGrid(): void {
    if (!this.wire) return;
    const segs: [V3, V3][] = [];
    const u = [Math.cos(this.theta), Math.sin(this.theta)], v = [-Math.sin(this.theta), Math.cos(this.theta)];
    const step = 0.4, N = Math.floor(this.R / step);
    for (const [a, b] of [[u, v], [v, u]]) {
      for (let k = -N; k <= N; k++) {
        const c = k * step;
        const half = Math.sqrt(Math.max(0, this.R * this.R - c * c));
        let prev: V3 | null = null;
        for (let i = 0; i <= 28; i++) {
          const s = -half + (2 * half * i) / 28;
          const x = a[0] * c + b[0] * s, y = a[1] * c + b[1] * s;
          const q: V3 = [x, y, this.z(x, y) + 0.015];
          if (prev) segs.push([prev, q]);
          prev = q;
        }
      }
    }
    this.wire.setSegments(segs);
    [u, v].forEach((d, i) => {
      const pts: V3[] = [];
      for (let k = 0; k <= 40; k++) { const s = -this.R + (2 * this.R * k) / 40; pts.push(this.at([d[0] * s, d[1] * s], 0.03)); }
      this.gridAxes[i]?.setPoints(pts);
    });
  }

  private drawAxes(): void {
    const e = symEig(this.S);
    this.axesL.forEach((L, i) => {
      L.object.visible = this.axesOn && !!e.vectors[i];
      if (!L.object.visible) return;
      const d = e.vectors[i];
      const pts: V3[] = [];
      for (let k = 0; k <= 40; k++) { const s = -this.R + (2 * this.R * k) / 40; pts.push(this.at([d[0] * s, d[1] * s], 0.03)); }
      L.setPoints(pts);
    });
  }

  /** Put the probe at a floor point (on the surface). */
  place(x: readonly number[]): void {
    this.probe.object.visible = true;
    this.probe.at(this.at(x, 0.08));
  }

  /** Release the probe at x0: it rolls downhill along the real path. Resolves with the path. */
  async release(x0: readonly number[], msPerUnit = 900, headless = false): Promise<Roll> {
    const r = roll(this.S, x0, { rim: this.R });
    this.place(x0);
    this.trail.object.visible = true;
    const pts = r.path.map((x) => this.at(x, 0.05));
    const n = pts.length;
    const ms = headless ? 30 : Math.min(5200, Math.max(1600, n * 14 + msPerUnit));
    await animate(ms, (k) => {
      const i = Math.min(n - 1, Math.floor(k * (n - 1)));
      this.probe.at([pts[i][0], pts[i][1], pts[i][2] + 0.03]);
      this.trail.setPoints(pts.slice(0, Math.max(2, i + 1)));
    }, ease.linear);
    return r;
  }

  hideTrail(): void { this.trail.object.visible = false; }
}

// ================================================================== the ark: the stern as a sheet, unfolding

/** A Matrix4 from a 3 × 3 matrix acting about a centre point. */
export function about(M: Mat, c: V3): Matrix4 {
  const m = new Matrix4().set(M[0][0], M[0][1], M[0][2], 0, M[1][0], M[1][1], M[1][2], 0, M[2][0], M[2][1], M[2][2], 0, 0, 0, 0, 1);
  return new Matrix4().makeTranslation(c[0], c[1], c[2]).multiply(m).multiply(new Matrix4().makeTranslation(-c[0], -c[1], -c[2]));
}
/** The stern's centre in the ark model's own frame (where the Collapse pulse acts). */
export const STERN_C: V3 = [-21, 0, 0];

/** M(t) = C^(1 − t): the true inverse applied a fraction t of the way. Never flat: its stretches are λᵢ^(1 − t). */
export function unfoldPath(t: number, M: Mat = COLLAPSE): Mat {
  const e = symEig(M);
  const n = M.length;
  const out: Mat = Array.from({ length: n }, () => new Array(n).fill(0));
  e.values.forEach((l, k) => { const s = Math.pow(l, 1 - t); const q = e.vectors[k]; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out[i][j] += s * q[i] * q[j]; });
  return out;
}

export interface ArkSet {
  root: Group;
  ark: Group | null;
  model: Object3D | null;
  anchor: Group | null;
  lantern: Ship | null;
  alive(): boolean;
  check(): void;
  tick(fn: (dt: number, t: number) => void): void;
  /** Move the stern by M (about its centre, in the ark's own frame). */
  setStern(M: Mat): void;
  /** Brace lines through the stern's centre (ark frame); null removes them. */
  braces(dirs: Vec[] | null, o?: { length?: number; opacity?: number }): void;
}

export interface ArkSetOpts {
  stern?: 'flat' | 'whole';
  ark?: { at: V3; scale?: number } | null;
  anchor?: { at: V3; scale?: number } | null;
  lantern?: { at: V3; face: V3; scale?: number } | null;
}

/** The Act IX exterior: the ark (stern flat or whole), the Anchor, the Lantern, a low warm star. */
export async function arkSet(g: Game, o: ArkSetOpts = {}): Promise<ArkSet> {
  const root = new Group();
  root.name = 'act9-set';
  g.stage.world.add(root);
  const offs: (() => void)[] = [];
  const disposers: (() => void)[] = [];
  root.userData.dispose = () => { offs.splice(0).forEach((f) => f()); disposers.splice(0).forEach((f) => f()); };
  const alive = () => !!root.parent;
  const glow = glowSprite('#ffd2a1', 150, 0.75);
  glow.position.set(-500, -620, 220);
  root.add(glow);
  let model: Object3D | null = null;
  let ark: Group | null = null;
  const sternNodes: { n: Object3D; base: Matrix4; mats: Map<Mesh, Material | Material[]> }[] = [];
  const sheet = new MeshStandardMaterial({ color: '#59606d', metalness: 0.7, roughness: 0.38, side: DoubleSide, emissive: '#1a1d24', emissiveIntensity: 0.6 });
  disposers.push(() => sheet.dispose());
  let sheetOn = false;
  const braceGroup = new Group();
  if (o.ark !== null) {
    const a = o.ark ?? { at: [0, 0, 0] as V3 };
    ark = new Group();
    ark.position.set(...a.at);
    root.add(ark);
    model = await loadModel('meridian');
    if (model) {
      model.rotation.x = Math.PI / 2;
      model.scale.setScalar(a.scale ?? 1);
      model.traverse((n) => {
        if (n.name !== 'aft' && n.name !== 'truss_aft') return;
        n.updateMatrix();
        n.matrixAutoUpdate = false;
        const mats = new Map<Mesh, Material | Material[]>();
        n.traverse((m) => { if ((m as Mesh).isMesh) mats.set(m as Mesh, (m as Mesh).material); });
        sternNodes.push({ n, base: n.matrix.clone(), mats });
      });
      model.add(braceGroup);
      ark.add(model);
    }
  }
  const setStern = (M: Mat) => {
    // the stern reads as one sheet while it is thinner than a hundredth of its old thickness
    const thin = Math.min(...symEig(M).values.map(Math.abs)) < 0.01;
    for (const s of sternNodes) {
      s.n.matrix.copy(s.base).premultiply(about(M, STERN_C));
      s.n.matrixWorldNeedsUpdate = true;
      if (thin !== sheetOn) s.mats.forEach((mat, mesh) => { mesh.material = thin ? sheet : mat; });
    }
    sheetOn = thin;
  };
  setStern(o.stern === 'whole' ? [[1, 0, 0], [0, 1, 0], [0, 0, 1]] : COLLAPSE);
  const braces = (dirs: Vec[] | null, bo: { length?: number; opacity?: number } = {}) => {
    for (const c of [...braceGroup.children]) { c.removeFromParent(); (c.userData.dispose as (() => void) | undefined)?.(); }
    if (!dirs) return;
    const L = bo.length ?? 8;
    dirs.forEach((d, i) => {
      const u = new Vector3(...v3(d)).normalize();
      const a: V3 = [STERN_C[0] - u.x * L, STERN_C[1] - u.y * L, STERN_C[2] - u.z * L], b: V3 = [STERN_C[0] + u.x * L, STERN_C[1] + u.y * L, STERN_C[2] + u.z * L];
      const line = new FatLine(g.stage, [a, b], { color: [C.v, C.w, C.u][i % 3], width: 4, intensity: 1.6, opacity: bo.opacity ?? 0.95 });
      line.object.userData.dispose = () => line.dispose();
      braceGroup.add(line.object);
      for (const end of [a, b]) { const s = glowSprite([C.v, C.w, C.u][i % 3], 2.2, 0.7); s.position.set(...end); braceGroup.add(s); }
    });
  };
  let anchor: Group | null = null;
  if (o.anchor !== null) {
    const an = o.anchor ?? { at: [-150, 95, -18] as V3, scale: 7 };
    anchor = await makeAnchor(g.stage, an.scale ?? 7, root);
    anchor.position.set(...an.at);
  }
  let lantern: Ship | null = null;
  if (o.lantern) {
    lantern = makeLantern(g.stage, o.lantern.scale ?? 1.4);
    root.add(lantern.object);
    lantern.object.position.set(...o.lantern.at);
    lantern.face(o.lantern.face);
    lantern.setThrust(0.15);
  }
  return {
    root, ark, model, anchor, lantern, alive,
    check: () => { if (!alive()) throw new Gone(); },
    tick: (fn) => { if (alive()) offs.push(g.stage.tick(fn)); },
    setStern, braces,
  };
}

/** Camera on a slow drift around a point (z up); stops when the set leaves the world. */
export function drift(g: Game, set: { tick(fn: (dt: number, t: number) => void): void }, target: V3, dist: number, elev: number, az0: number, degPerSec: number): () => void {
  let az = az0, on = true;
  g.stage.disposeControls();
  g.stage.mode = '3d';
  const t = new Vector3(...target);
  const place = () => {
    const a = (az * Math.PI) / 180, e = (elev * Math.PI) / 180;
    g.stage.camera.position.set(t.x + dist * Math.cos(e) * Math.cos(a), t.y + dist * Math.cos(e) * Math.sin(a), t.z + dist * Math.sin(e));
    g.stage.camera.up.set(0, 0, 1);
    g.stage.camera.lookAt(t);
  };
  place();
  set.tick((dt) => { if (!on || g.stage.controls) return; az += dt * degPerSec; place(); });
  return () => { on = false; };
}

/** Scene staging: the flat stern from close by, the Lantern on station beside it. */
export async function sternShot(g: Game, o: { stern?: 'flat' | 'whole'; braces?: boolean } = {}): Promise<ArkSet> {
  const set = await arkSet(g, { stern: o.stern ?? 'flat', lantern: { at: [-34, -22, 6], face: [0.4, 1, 0], scale: 1.3 } });
  if (o.braces) set.braces(BRACE_LINES);
  drift(g, set, [-20, 0, 0], 62, 16, -112, 1.1);
  return set;
}
/** The ark, the Anchor far behind, a wide slow drift. */
export async function arkShot(g: Game, o: { stern?: 'flat' | 'whole' } = {}): Promise<ArkSet> {
  const set = await arkSet(g, { stern: o.stern ?? 'flat', lantern: { at: [-30, -30, 8], face: [0.5, 1, 0.1], scale: 1.4 } });
  drift(g, set, [-14, 6, 0], 105, 18, -125, 0.9);
  return set;
}
/** The stern's brace lines, in the ark's frame (the eigenvectors of its stress matrix). */
export const BRACE_LINES: Vec[] = symEig(COLLAPSE).vectors;

// ================================================================== small motion helpers

/** Animate a 3 × 3 move on an object (about the origin) along M(t). */
export async function playMatrix(obj: Object3D, path: (t: number) => Mat, ms: number): Promise<void> {
  obj.matrixAutoUpdate = false;
  await animate(ms, (k) => { obj.matrix.copy(about(path(k), [0, 0, 0])); obj.matrixWorldNeedsUpdate = true; }, ease.inOut);
}

export async function pause(g: Game, ms: number): Promise<void> { await wait(g.headless ? 5 : ms); }

/** The image of a point under a 2 × 2, as a world point. */
export const img2 = (M: Mat, x: readonly number[], z = 0): V3 => { const y = matVec(M, x as number[]); return [y[0], y[1], z]; };

// ================================================================== the cracked Anchor (after the 750× pulse)

/** Jagged glowing cracks over the Anchor's core, flickering. Returns a stop function; stop.fade(ms) dims them out first. */
export function crackAnchor(g: Game, anchor: Object3D, o: { radius?: number; count?: number; seed?: number } = {}): (() => void) & { fade(ms: number): Promise<void> } {
  const R = o.radius ?? 0.62, n = o.count ?? 7;
  let s = o.seed ?? 750;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const group = new Group();
  const lines: FatLine[] = [];
  for (let k = 0; k < n; k++) {
    // a crack: a short random walk over the core's surface
    let th = rnd() * Math.PI * 2, ph = 0.3 + rnd() * 1.2;
    const pts: V3[] = [];
    for (let i = 0; i < 7; i++) {
      pts.push([R * Math.sin(ph) * Math.cos(th), R * Math.sin(ph) * Math.sin(th), R * Math.cos(ph) * 0.8]);
      th += (rnd() - 0.5) * 0.7; ph += (rnd() - 0.5) * 0.5;
    }
    const L = new FatLine(g.stage, pts, { color: '#ffb36b', width: 2.2, intensity: 2.2, opacity: 0.95 });
    lines.push(L);
    group.add(L.object);
  }
  const glow = glowSprite('#ff9f43', R * 4, 0.35);
  group.add(glow);
  anchor.add(group);
  let level = 1;
  const off = g.stage.tick((_dt, t) => {
    const f = 0.55 + 0.45 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 2.1));
    lines.forEach((L, i) => L.setOpacity(level * Math.max(0.15, f - (i % 3) * 0.12)));
    glow.material.opacity = level * (0.2 + 0.25 * f);
  });
  group.userData.dispose = () => { off(); lines.forEach((L) => L.dispose()); };
  let done = false;
  const stop = () => { if (done) return; done = true; off(); group.removeFromParent(); lines.forEach((L) => L.dispose()); };
  return Object.assign(stop, {
    async fade(ms: number) { await animate(g.headless ? 1 : ms, (k) => { level = 1 - k; }); stop(); },
  });
}
