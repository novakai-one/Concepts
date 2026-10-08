// Blender-made models (glTF in public/singular/models/) with engine glow, and a fallback shape
// so a scene still works if a model fails to load.
import {
  AdditiveBlending, Box3, Color, ConeGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Vector3,
  type Material,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Stage, V3 } from '../core/stage';
import { animate, ease } from '../core/tween';
import { glowSprite } from './markers';

const loader = new GLTFLoader();
const cache = new Map<string, Promise<Object3D | null>>();
let base = './models/';
export function setModelBase(url: string): void { base = url.endsWith('/') ? url : `${url}/`; }

/** Load a model once; every call returns a fresh clone. Resolves to null if it cannot be loaded. */
export async function loadModel(name: string): Promise<Object3D | null> {
  let p = cache.get(name);
  if (!p) {
    // a .glb, or the same model as glTF JSON for hosts that cannot serve .glb (tools/singular/artifact.mjs)
    p = loader.loadAsync(`${base}${name}.glb`).catch(() => loader.loadAsync(`${base}${name}.json`)).then((g) => {
      g.scene.traverse((o) => {
        const m = o as Mesh;
        if (!m.isMesh) return;
        const mats = (Array.isArray(m.material) ? m.material : [m.material]) as Material[];
        for (const mat of mats) {
          const s = mat as MeshStandardMaterial;
          // emissive parts from Blender come through as emissive; push them into bloom range
          if (s.emissive && s.emissive.getHex() !== 0) s.emissiveIntensity = Math.max(s.emissiveIntensity, 2.5);
          if (s.envMapIntensity !== undefined) s.envMapIntensity = 1.2;
        }
      });
      return g.scene as Object3D;
    }).catch(() => null);
    cache.set(name, p);
  }
  const m = await p;
  if (!m) return null;
  // each copy gets its own materials (geometry stays shared), so tinting one ark never tints another
  const c = m.clone(true);
  c.traverse((o) => {
    const mesh = o as Mesh;
    if (mesh.isMesh) mesh.material = Array.isArray(mesh.material) ? mesh.material.map((x) => x.clone()) : (mesh.material as Material).clone();
  });
  return c;
}

export function preloadModels(names: string[]): void { names.forEach((n) => { void loadModel(n); }); }

/** A flame cone + glow at an engine nozzle. Flickers each frame. */
export class Exhaust {
  readonly group = new Group();
  private readonly cone: Mesh<ConeGeometry, MeshBasicMaterial>;
  private readonly glow;
  power = 1;
  private off: () => void;

  constructor(stage: Stage, o: { color?: string; size?: number } = {}) {
    const color = o.color ?? '#7ec8ff';
    const s = o.size ?? 0.25;
    this.cone = new Mesh(new ConeGeometry(s, s * 5, 20, 1, true).translate(0, -s * 2.5, 0),
      new MeshBasicMaterial({ color: new Color(color).multiplyScalar(2.2), transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false }));
    this.glow = glowSprite(color, s * 6, 0.9);
    this.group.add(this.cone, this.glow);
    this.group.userData.dispose = () => this.dispose();
    this.off = stage.tick((_dt, t) => {
      const f = 0.85 + 0.15 * Math.sin(t * 43) * Math.sin(t * 17.3);
      this.cone.scale.set(1, Math.max(0.01, this.power * f), 1);
      this.cone.material.opacity = 0.55 * Math.min(1, this.power);
      this.glow.material.opacity = 0.9 * Math.min(1, this.power) * f;
      this.group.visible = this.power > 0.01;
    });
  }
  get object(): Group { return this.group; }
  dispose(): void { this.off(); this.cone.geometry.dispose(); this.cone.material.dispose(); this.glow.material.dispose(); this.group.removeFromParent(); }
}

/**
 * A ship in the world. `forward` is the model's nose direction after loading (Blender exports
 * with +X forward, Y up; the stage is Z up, so the loader rotates it).
 */
export class Ship {
  readonly group = new Group();
  model: Object3D | null = null;
  exhausts: Exhaust[] = [];
  readonly ready: Promise<void>;

  constructor(stage: Stage, o: { model?: string; scale?: number; engines?: V3[]; color?: string } = {}) {
    this.group.userData.dispose = () => this.dispose();
    this.ready = (async () => {
      const m = o.model ? await loadModel(o.model) : null;
      const body = m ?? fallbackShip(o.color);
      if (m) {
        // glTF is Y-up; the stage is Z-up. Rotate so model +X stays forward and +Y becomes +Z.
        body.rotation.x = Math.PI / 2;
      }
      body.scale.setScalar(o.scale ?? 1);
      this.group.add(body);
      this.model = body;
      // engines: explicit positions, or the model's own nozzle_* nodes (placed where the exhaust leaves)
      let engines: V3[] = (o.engines ?? []).map((e) => [e[0] * (o.scale ?? 1), e[1] * (o.scale ?? 1), e[2] * (o.scale ?? 1)] as V3);
      if (!o.engines && m) {
        this.group.updateMatrixWorld(true);
        const found: V3[] = [];
        body.traverse((n) => {
          if (/^nozzle/.test(n.name)) {
            const w = n.getWorldPosition(new Vector3());
            const l = this.group.worldToLocal(w);
            found.push([l.x, l.y, l.z]);
          }
        });
        engines = found;
      }
      if (!m && !o.engines) engines = [[-1.4 * (o.scale ?? 1), 0, 0]];
      for (const e of engines) {
        const ex = new Exhaust(stage, { size: 0.16 * (o.scale ?? 1) });
        ex.group.position.set(e[0], e[1], e[2]);
        ex.group.rotation.z = Math.PI / 2; // cone points along -X (behind the ship)
        this.group.add(ex.group);
        this.exhausts.push(ex);
      }
    })();
  }

  get object(): Group { return this.group; }

  setThrust(p: number): void { this.exhausts.forEach((e) => { e.power = p; }); }

  /** Point the nose (+X) along a direction in the world. */
  face(dir: V3): void {
    const d = new Vector3(...dir).normalize();
    const yaw = Math.atan2(d.y, d.x);
    const pitch = Math.asin(Math.max(-1, Math.min(1, d.z)));
    this.group.rotation.set(0, -pitch, yaw, 'ZYX');
  }

  /** Fly in a straight line from where it is to `to`, nose first. */
  async flyTo(to: V3, ms = 1600): Promise<void> {
    const a = this.group.position.clone(), b = new Vector3(...to);
    const d = b.clone().sub(a);
    if (d.lengthSq() > 1e-6) this.face([d.x, d.y, d.z]);
    this.setThrust(1.2);
    await animate(ms, (k) => { this.group.position.lerpVectors(a, b, k); }, ease.inOut);
    this.setThrust(0.25);
  }

  size(): Vector3 { return new Box3().setFromObject(this.group).getSize(new Vector3()); }

  dispose(): void { this.exhausts.forEach((e) => e.dispose()); this.group.removeFromParent(); }
}

/** A simple faceted ship (if the glTF is missing). Nose along +X. */
function fallbackShip(color = '#9aa7bd'): Object3D {
  const g = new Group();
  const hull = new Mesh(new ConeGeometry(0.45, 2.6, 6, 1), new MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.35 }));
  hull.rotation.z = -Math.PI / 2;
  g.add(hull);
  const wing = new Mesh(new ConeGeometry(0.9, 0.9, 3, 1), new MeshStandardMaterial({ color: '#2a3140', metalness: 0.5, roughness: 0.5 }));
  wing.rotation.z = -Math.PI / 2;
  wing.scale.set(1, 1, 0.12);
  wing.position.x = -0.5;
  g.add(wing);
  return g;
}
