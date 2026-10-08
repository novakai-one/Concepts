// Story set pieces shared by chapters: the Anchor, the Lantern, the ark, debris.
// Each uses the Blender model when it is available and a simple stand-in when it is not.
import {
  Color, CylinderGeometry, Group, Mesh, MeshStandardMaterial, OctahedronGeometry, Quaternion, Vector3, type Object3D,
} from 'three';
import type { Stage, V3 } from '../../core/stage';
import { loadModel, Ship } from '../../gfx/models';

/** The three spire directions of the Anchor (not at right angles). */
export const SPIRES: V3[] = [[1, 0.2, 0.1], [0.3, 1, 0], [0, 0.2, 1]];

/** The Anchor at the origin. Resolves once the model (or stand-in) is in place. */
export async function makeAnchor(stage: Stage, scale = 1, parent: Object3D = stage.world): Promise<Group> {
  const g = new Group();
  parent.add(g);
  const m = await loadModel('anchor');
  if (m) {
    m.rotation.x = Math.PI / 2;
    m.scale.setScalar(scale);
    g.add(m);
  } else {
    const black = new MeshStandardMaterial({ color: '#07080c', metalness: 0.9, roughness: 0.18 });
    const seam = new MeshStandardMaterial({ color: '#b9a8ff', emissive: new Color('#b9a8ff'), emissiveIntensity: 2.2 });
    const core = new Mesh(new OctahedronGeometry(0.55 * scale, 0), black);
    g.add(core);
    for (const d of SPIRES) {
      const dir = new Vector3(...d).normalize();
      const len = 2.2 * scale;
      const sp = new Mesh(new CylinderGeometry(0.02 * scale, 0.11 * scale, len, 6), black);
      sp.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir));
      sp.position.copy(dir.clone().multiplyScalar(len / 2));
      g.add(sp);
      const line = new Mesh(new CylinderGeometry(0.008 * scale, 0.008 * scale, len * 0.9, 4), seam);
      line.quaternion.copy(sp.quaternion);
      line.position.copy(sp.position);
      g.add(line);
    }
  }
  return g;
}

/** The survey tug Lantern. Nose along +X. */
export function makeLantern(stage: Stage, scale = 0.16): Ship {
  return new Ship(stage, { model: 'lantern', scale });
}

export function place(o: Object3D, p: V3): void { o.position.set(p[0], p[1], p[2]); }
