// Developer showcase: every Blender model (tools/singular/blender/) in the real engine, one cinematic
// beat each, framed and slowly orbiting under the game's own lights, bloom and tone mapping.
// Open with ?chapter=c93 (or the test harness: node tests/singular/browser/game-flow.mjs c93 <outDir>).
import { Group, Vector3, type Object3D, type Sprite } from 'three';
import type { ChapterDef, Game, V3 } from '../../../game/types';
import { loadModel, Ship } from '../../../gfx/models';
import { wait } from '../../../core/tween';
import { makeCutter } from '../c15-nullspace/scenes';

const HOLD = 9000; // ms each asset stays on screen

/** Load a glTF model the way the game does (glTF Y-up -> stage Z-up: model +X stays forward). */
async function model(name: string): Promise<Object3D | null> {
  const m = await loadModel(name);
  if (m) m.rotation.x = Math.PI / 2;
  return m;
}

/** Drive the camera around `target` (z up) each frame; returns a stop function. */
function orbit(g: Game, target: V3, dist: number, elevDeg: number, az0Deg: number, degPerSec: number, lift = 0): () => void {
  let az = az0Deg;
  const t = new Vector3(...target);
  const place = () => {
    const a = (az * Math.PI) / 180, e = (elevDeg * Math.PI) / 180;
    g.stage.camera.position.set(t.x + dist * Math.cos(e) * Math.cos(a), t.y + dist * Math.cos(e) * Math.sin(a), t.z + dist * Math.sin(e) + lift);
    g.stage.camera.up.set(0, 0, 1);
    g.stage.camera.lookAt(t);
  };
  g.stage.disposeControls();
  g.stage.mode = '3d';
  place();
  return g.stage.tick((dt) => { az += dt * degPerSec; place(); });
}

/** Clear the world, run a showcase for HOLD ms, then clean up. Stops early if the world is
 *  cleared under it (the player or the test harness jumped to another beat). */
async function show(g: Game, title: string, build: (root: Group) => Promise<() => void>): Promise<void> {
  g.stage.clearWorld();
  const root = new Group();
  g.stage.world.add(root);
  g.toast(title, 'Asset');
  const stop = await build(root);
  let done = false;
  const finish = () => { if (!done) { done = true; stop(); offWatch(); } };
  const offWatch = g.stage.tick(() => { if (!root.parent) finish(); });
  for (let t = 0; t < HOLD && root.parent; t += 250) await wait(250);
  finish();
}

async function lantern(g: Game): Promise<void> {
  await show(g, '**lantern** · survey tug, pods + nozzles', async (root) => {
    // nozzle positions come from the model's nozzle_* nodes
    const probe = await model('lantern');
    const engines: V3[] = [];
    if (probe) {
      probe.updateMatrixWorld(true);
      for (const k of ['fl', 'fr', 'rl', 'rr']) {
        const n = probe.getObjectByName(`nozzle_${k}`);
        if (n) { const p = n.getWorldPosition(new Vector3()); engines.push([p.x, p.y, p.z]); }
      }
    }
    const ship = new Ship(g.stage, { model: 'lantern', scale: 1, engines });
    root.add(ship.object);
    await ship.ready;
    ship.setThrust(0.6);
    const stopOrbit = orbit(g, [0.2, 0, 0], 11, 22, -55, 16);
    const off = g.stage.tick(() => { ship.object.position.z = 0.06 * Math.sin(performance.now() / 1300); });
    return () => { stopOrbit(); off(); ship.dispose(); };
  });
}

async function cutter(g: Game): Promise<void> {
  await show(g, '**cutter** · Authority cutter, running lights + 3 nozzles', async (root) => {
    // the game's own makeCutter: the model, its blinking light_l / light_r sprites and nozzle glows
    const c = makeCutter(1);
    root.add(c);
    await (c.userData.ready as Promise<void>);
    const stopOrbit = orbit(g, [0, 0, 0], 16, 20, -50, 14);
    const off = g.stage.tick((_dt, t) => {
      c.position.z = 0.06 * Math.sin(t / 1.3);
      c.traverse((n) => { if (n.userData.blink) (n as Sprite).material.opacity = Math.sin(t * 5) > 0.6 ? 0.95 : 0.15; });
    });
    return () => { stopOrbit(); off(); };
  });
}

async function meridian(g: Game): Promise<void> {
  await show(g, '**meridian** · colony ark (rings spin)', async (root) => {
    const m = await model('meridian');
    if (m) root.add(m);
    const rings = ['ring_1', 'ring_2', 'ring_3'].map((n) => m?.getObjectByName(n)).filter(Boolean) as Object3D[];
    const stopOrbit = orbit(g, [0, 0, 0], 105, 18, -40, 7);
    const off = g.stage.tick((dt) => { rings.forEach((r, i) => { r.rotation.x += dt * (0.12 + 0.02 * i); }); });
    return () => { stopOrbit(); off(); };
  });
}

async function meridianClose(g: Game): Promise<void> {
  await show(g, '**meridian** · truss frames and hangar', async (root) => {
    const m = await model('meridian');
    if (m) root.add(m);
    const stopOrbit = orbit(g, [14, 0, 0], 34, 14, -70, 3);
    return () => { stopOrbit(); };
  });
}

async function anchor(g: Game): Promise<void> {
  await show(g, '**anchor** · monolith + spire_1..3', async (root) => {
    const m = await model('anchor');
    if (m) root.add(m);
    const stopOrbit = orbit(g, [0.55, 0.55, 0.7], 8.5, 16, -62, 14);
    return () => { stopOrbit(); };
  });
}

async function buoy(g: Game): Promise<void> {
  await show(g, '**buoy** · navigation buoy', async (root) => {
    const pts: V3[] = [[0, 0, 0], [-3.2, 2.6, -0.4], [3.4, 3.4, 0.3]];
    const ms: Object3D[] = [];
    for (const p of pts) {
      const m = await model('buoy');
      if (!m) continue;
      m.position.set(...p);
      root.add(m);
      ms.push(m);
    }
    const stopOrbit = orbit(g, [0, 0.6, 0.2], 7.5, 14, -60, 8);
    const off = g.stage.tick((dt) => { ms.forEach((m, i) => { m.rotation.y += dt * (0.3 + 0.1 * i); }); });
    return () => { stopOrbit(); off(); };
  });
}

async function debris(g: Game): Promise<void> {
  await show(g, '**debris_0..5** · rock and wreckage', async (root) => {
    const ms: Object3D[] = [];
    for (let i = 0; i < 6; i++) {
      const m = await model(`debris_${i}`);
      if (!m) continue;
      m.position.set((i % 3) * 2.8 - 2.8, (Math.floor(i / 3) - 0.5) * 2.6, 0);
      m.rotation.set(Math.PI / 2 + i, i * 0.7, 0);
      root.add(m);
      ms.push(m);
    }
    const stopOrbit = orbit(g, [0, 0, 0], 11, 32, -90, 3);
    const off = g.stage.tick((dt) => { ms.forEach((m, i) => { m.rotation.z += dt * (0.2 + 0.07 * i); m.rotation.y += dt * 0.15; }); });
    return () => { stopOrbit(); off(); };
  });
}

async function bridge(g: Game, view: 'window' | 'table'): Promise<void> {
  await show(g, `**bridge** · interior set (${view})`, async (root) => {
    const m = await model('bridge');
    if (m) root.add(m);
    // a slow drift inside the room (the camera stays well inside the 12 x 8 x 4 set)
    const from = view === 'window' ? new Vector3(-4.6, -2.3, 2.3) : new Vector3(3.6, 2.6, 2.0);
    const look = view === 'window' ? new Vector3(3.5, 0.4, 1.4) : new Vector3(-1.5, -0.6, 1.2);
    g.stage.disposeControls();
    g.stage.mode = '3d';
    let t = 0;
    const place = () => {
      const s = Math.sin(t * 0.25);
      g.stage.camera.position.set(from.x + s * 0.5, from.y + s * 0.6, from.z);
      g.stage.camera.up.set(0, 0, 1);
      g.stage.camera.lookAt(look);
    };
    place();
    const off = g.stage.tick((dt) => { t += dt; place(); });
    return () => { off(); };
  });
}

const ch: ChapterDef = {
  id: 'c93',
  act: 99,
  num: 93,
  title: 'Model showcase',
  subtitle: 'Blender assets in the engine',
  nodes: [],
  dev: true,
  beats: [
    { kind: 'cinematic', id: 'lantern', run: lantern },
    { kind: 'cinematic', id: 'cutter', run: cutter },
    { kind: 'cinematic', id: 'meridian', run: meridian },
    { kind: 'cinematic', id: 'meridian-close', run: meridianClose },
    { kind: 'cinematic', id: 'anchor', run: anchor },
    { kind: 'cinematic', id: 'buoy', run: buoy },
    { kind: 'cinematic', id: 'debris', run: debris },
    { kind: 'cinematic', id: 'bridge-window', run: (g) => bridge(g, 'window') },
    { kind: 'cinematic', id: 'bridge-table', run: (g) => bridge(g, 'table') },
  ],
};
export default ch;
