// The Lantern's bridge for dialogue scenes: a local copy of common/shots.ts bridgeShot with one fix.
// The shared version registers its camera tick after `await loadModel`, and sets the world's dispose
// hook only then. When a beat ends before the model arrives (lines skipped, a fast test), the world is
// cleared first, the tick is never removed, and it keeps steering the camera through the next beat.
// Here the hook is in place before the await, and nothing is started once the set has been cleared.
import { AmbientLight, Group, PointLight } from 'three';
import type { Game } from '../../../game/types';
import { loadModel } from '../../../gfx/models';
import { Lattice3D } from '../../../gfx/shapes';

export async function bridgeShot(g: Game): Promise<void> {
  const root = new Group();
  const offs: (() => void)[] = [];
  root.userData.dispose = () => { offs.splice(0).forEach((f) => f()); };
  g.stage.world.add(root);
  const m = await loadModel('bridge');
  if (!root.parent) return; // the beat already moved on
  if (m) { m.rotation.x = Math.PI / 2; root.add(m); }
  const holo = new Lattice3D(g.stage, { extent: 1, color: '#59e1ff', opacity: 0.9 });
  holo.object.scale.setScalar(0.35);
  holo.object.position.set(0, 0, 1.5);
  root.add(holo.object);
  const lamp = new PointLight('#59e1ff', 6, 6);
  lamp.position.set(0, 0, 1.6);
  root.add(lamp, new AmbientLight('#223355', 0.4));
  let t0 = 0;
  offs.push(g.stage.tick((dt) => {
    t0 += dt;
    holo.object.rotation.z += dt * 0.3;
    if (g.stage.controls) return;
    const a = -2.2 + Math.sin(t0 * 0.05) * 0.5;
    g.stage.camera.position.set(3.3 * Math.cos(a), 3.3 * Math.sin(a), 2.3); // stays inside the 12 × 8 room
    g.stage.camera.up.set(0, 0, 1);
    g.stage.camera.lookAt(0, 0, 1.3);
  }));
  offs.push(() => holo.dispose());
  g.stage.mode = '3d';
  g.stage.disposeControls();
}
