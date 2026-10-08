// Prologue: "Where did everything go?" (GDD §6.2). Ilse's recording and her nine numbers, the
// arrival, the lattice of light, the first burn, the first pulse (the routine pulse T, animated as
// P R(θ) P⁻¹ so the area never changes on the way), and two checks the player builds: straight lines
// stay straight and even spacing stays even; one point does not move. Nothing is named yet.
import { DoubleSide, Group, Matrix4, Mesh, MeshBasicMaterial, RingGeometry, Vector3, type Object3D } from 'three';
import type { ChapterDef, Game, PuzzleDef, V3 } from '../../../game/types';
import { BuoyField } from '../../../gfx/buoys';
import { Arrow } from '../../../gfx/arrow';
import { Dot, Pad, glowSprite } from '../../../gfx/markers';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { music } from '../../../audio/music';
import { fadeBlack, letterbox, NumberBoard, stamp, titleCard } from '../../../kit/cine';
import { makeAnchor, makeLantern } from '../../common/set';
import { loadModel, type Ship } from '../../../gfx/models';
import { BurnChain } from '../../../kit/flight';
import { near } from '../../../kit/handle';
import { pin } from '../../../game/caseboard';
import { h } from '../../../ui/ui';
import { T, Tpartial, PROLOGUE_WHITE, PROLOGUE_CYAN } from '../../truth';
import { GAME_TITLE } from '../../meta';
import { S } from './script';
import { apply, lineThrough, nearAnchor, relayChain, STEP_COPIES } from './logic';

export { lineThrough };

const WHITE = '#e8f1ff';
const CYAN = '#59e1ff';
const SHIP0: V3 = [-4, -3, 0];
const W0 = PROLOGUE_WHITE.map((p) => [p[0], p[1], 0] as V3);
const C0 = PROLOGUE_CYAN.map((p) => [p[0], p[1], 0] as V3);
/** The routine pulse in 3-D at angle θ (z untouched): P R(θ) P⁻¹. */
const pulse3 = (theta: number): Matrix4 => {
  const M = Tpartial(theta);
  return new Matrix4().set(M[0][0], M[0][1], 0, 0, M[1][0], M[1][1], 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
};

// ------------------------------------------------------------------ the set shared by the cinematic beats

interface Set0 { buoys: BuoyField; ship: Ship; lamp: Object3D; ghosts: Group }
let set: Set0 | null = null;

function markRefs(b: BuoyField): void {
  b.highlight(W0.map((p) => b.indexOf(p)), WHITE, 0.9);
  b.highlight(C0.map((p) => b.indexOf(p)), CYAN);
}

/** Faint rings at the reference buoys' spots before the pulse. Rings, not dots: after the pulse other
 *  buoys sit on those spots. The lit buoys themselves wait for the next scan. */
function oldSpots(): Group {
  const grp = new Group();
  const geo = new RingGeometry(0.17, 0.21, 32);
  for (const [pts, color] of [[W0, WHITE], [C0, CYAN]] as const) {
    for (const q of pts) {
      const m = new Mesh(geo, new MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: DoubleSide, depthWrite: false }));
      m.position.set(q[0], q[1], 0.01);
      grp.add(m);
    }
  }
  return grp;
}

/** Still this run's set? A teardown (Esc → Restart, map, title) clears the world under a cinematic. */
const live = (g: Game, s: Set0) => s.buoys.object.parent === g.stage.world;

function ensureSet(g: Game, pulsed: boolean): Set0 {
  if (set && live(g, set)) return set;
  const buoys = new BuoyField(g.stage, { extent: 16 });
  g.stage.world.add(buoys.object);
  const ship = makeLantern(g.stage, 0.16);
  g.stage.world.add(ship.object);
  ship.object.position.set(...(pulsed ? apply(T, SHIP0) : SHIP0));
  ship.object.position.z = 0.3;
  ship.face([1, 0.75, 0]);
  // after the pulse, thrusters three and four stay dark (a fresh ship starts at full power)
  if (pulsed) void ship.ready.then(() => ship.exhausts.forEach((e, i) => { e.power = i >= 2 ? 0 : 0.15; }));
  void makeAnchor(g.stage, 0.45);
  // Ilse's lamp: a faint warm light at the one point no pulse can move
  const lamp = glowSprite('#ffe9c4', 0.9, 0.35);
  lamp.position.set(0, 0, 0.05);
  g.stage.world.add(lamp);
  const ghosts = oldSpots();
  g.stage.world.add(ghosts);
  // after the pulse the reference buoys stay unlit until the player scans (c00-p2): the prediction comes first
  ghosts.visible = pulsed;
  if (pulsed) buoys.set(T);
  else markRefs(buoys);
  set = { buoys, ship, lamp, ghosts };
  return set;
}

// ------------------------------------------------------------------ c00-p1 First burn

const firstBurn: PuzzleDef = {
  id: 'c00-p1',
  title: 'First burn',
  goal: 'Drag the **green** arrow onto the beacon. **Fire**.',
  hints: ['The beacon is 3 steps across and 2 steps up from the ship.', 'Put the arrow tip on the ring, then Fire.'],
  par: 1,
  onWin: S.burnWin,
  setup(p) {
    p.grid();
    const pad = new Pad(p.g.stage, [3, 2, 0], { label: 'beacon' });
    p.add(pad);
    const chain = new BurnChain(p, {
      free: [[1, 0, 0]],
      onArrive: (end) => { if (near(end, [3, 2, 0])) { void pad.hit(); p.win(); return 'win'; } return 'miss'; },
    });
    return {
      async showMe() { await chain.moveBurn(0, [3, 2, 0]); await chain.fire(); },
      async wrong() { chain.setBurn(0, [2, 3, 0]); await chain.fire(); },
    };
  },
};

// ------------------------------------------------------------------ c00-p2 Call it, then check

/** Client coordinates of a world point (for buoy picking during a drag). */
function screenOf(g: Game, q: Vector3): [number, number] {
  const s = g.stage.toScreen(q);
  const r = g.stage.renderer.domElement.getBoundingClientRect();
  return [s.x + r.left, s.y + r.top];
}

const checkPuzzle: PuzzleDef = {
  id: 'c00-p2',
  title: 'Are they still in a line? Still evenly spaced?',
  goal: 'Call it first. Then **Scan** to light the white and cyan buoys. Lay the **ruler** through the three white buoys (drag its ends; they snap to buoys). Then lay the **step** arrow from the first cyan buoy to the next one.',
  subgoals: ['The white buoys: one straight line', 'The cyan buoys: one step fits every gap'],
  predict: {
    prompt: 'The pulse moved the buoys. The faint rings show where the white buoys were: in a straight line. Are they still?',
    choices: [{ id: 'line', text: 'Still in one straight line' }, { id: 'curve', text: 'Bent into a curve' }, { id: 'scatter', text: 'Scattered' }],
    answer: 'line',
    reveal: 'They are still in one straight line, and the cyan buoys are still evenly spaced. The pulse moved the buoys, but **in a way that keeps straight lines straight and even spacing even**.',
  },
  hints: ['Press **Scan** to light the white and cyan buoys. Put the ruler\'s ends on the two outer white buoys.', 'The step arrow starts on the first cyan buoy. Put its tip on the next cyan buoy along.'],
  par: 3,
  onWin: S.lineWin,
  setup(p) {
    // framed a little high, so the old white spots stay clear of the prediction card at the top
    p.g.stage.view2D({ center: [-0.5, 2], height: 12, ms: 0 });
    p.grid({ main: 0, base: 0.1, axis: 0 });
    // wide enough that the sheared field still fills the corners of the frame
    const b = new BuoyField(p.g.stage, { extent: 20 });
    b.set(T);
    p.add(b);
    // the old spots only: the lit buoys wait for the scan, so the prediction is made blind
    p.add(oldSpots());
    let scanned = false;
    const scanBtn = h('button', { class: 'btn small', type: 'button' }, 'Scan');
    const scan = () => {
      if (scanned) return;
      scanned = true;
      markRefs(b);
      sfx.discover();
      scanBtn.disabled = true;
      scanBtn.textContent = 'Scanned';
      // a prediction not made before the scan is not asked for after it
      const card = p.g.ui.scene.querySelector<HTMLElement>('.predict-card');
      const body = card?.querySelector<HTMLElement>('.predict-body');
      if (card && body && !body.hidden) card.hidden = true;
    };
    scanBtn.addEventListener('click', scan);
    p.dock().appendChild(scanBtn);
    const whites = W0.map((q) => apply(T, q));
    const cyans = C0.map((q) => apply(T, q));
    const flags = [false, false];
    const tick = (i: number) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); } if (flags[0] && flags[1]) p.win(); };
    // the ruler
    const ends: V3[] = [apply(T, [-2, -2]), apply(T, [-1, 2])];
    const ruler = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: WHITE, width: 2.5, intensity: 1.3, opacity: 0.85 });
    const dots = ends.map((e) => new Dot(e, { color: WHITE, size: 0.11 }));
    p.add(ruler.object, ...dots);
    p.onDispose(() => ruler.dispose());
    const draw = () => {
      const a = new Vector3(...ends[0]), c = new Vector3(...ends[1]);
      const d = c.clone().sub(a).normalize().multiplyScalar(40);
      ruler.setPoints([[a.x - d.x, a.y - d.y, 0.02], [c.x + d.x, c.y + d.y, 0.02]]);
    };
    draw();
    const snapToBuoy = (q: Vector3) => { const i = b.pick(...screenOf(p.g, q), 40); return i >= 0 ? new Vector3(...b.pos(i)) : q; };
    dots.forEach((dot, k) => {
      p.g.drag.add({
        target: dot.mesh, getPos: () => new Vector3(...ends[k]), constrain: snapToBuoy,
        onStart: scan,
        onMove: (q) => { ends[k] = [q.x, q.y, 0]; dot.at(ends[k]); draw(); },
        onEnd: () => { scan(); p.move(); sfx.snap(); if (lineThrough(ends[0], ends[1], whites)) { ruler.setColor(WHITE, 2); tick(0); } },
      });
    });
    // the step arrow and its copies: four cyan buoys, three gaps, so the step and two copies
    const step = new Arrow(cyans[0], [cyans[0][0] + 0.6, cyans[0][1] - 0.8, 0], { color: CYAN, handle: true, label: 'step' });
    const copies = Array.from({ length: STEP_COPIES }, () => new Arrow(cyans[0], cyans[0], { color: CYAN, opacity: 0.6, width: 0.035 }));
    p.add(step, ...copies);
    const relay = () => {
      const chain = relayChain([step.from.x, step.from.y, step.from.z], [step.to.x, step.to.y, step.to.z]);
      copies.forEach((c, k) => c.set(...chain[k + 1]));
    };
    relay();
    p.g.drag.add({
      target: step.grab, getPos: () => step.to.clone(), constrain: snapToBuoy,
      onStart: scan,
      onMove: (q) => { step.setTo([q.x, q.y, 0]); relay(); sfx.tick(q.y); },
      onEnd: () => { scan(); p.move(); if (near([step.to.x, step.to.y, 0], cyans[1], 0.1)) { copies.forEach((c) => void c.pulse()); tick(1); } },
    });
    return {
      async showMe() {
        scan();
        const from = ends.map((e) => [...e] as V3);
        await animate(800, (k) => {
          for (let j = 0; j < 2; j++) {
            const to = whites[j === 0 ? 0 : 2];
            ends[j] = [from[j][0] + (to[0] - from[j][0]) * k, from[j][1] + (to[1] - from[j][1]) * k, 0];
            dots[j].at(ends[j]);
          }
          draw();
        }, ease.inOut);
        tick(0);
        await step.moveTo(cyans[1], 700);
        relay();
        copies.forEach((c) => void c.pulse());
        tick(1);
      },
      wrong() {
        // a ruler through only two of the three: not a win
        ends[0] = whites[0]; ends[1] = apply(T, [0, 3]); draw();
        if (lineThrough(ends[0], ends[1], whites)) tick(0);
      },
    };
  },
};

// ------------------------------------------------------------------ c00-p3 What did not move?

const stillPuzzle: PuzzleDef = {
  id: 'c00-p3',
  title: 'What did not move?',
  goal: 'Toggle **before / after**. Then click the one point that is exactly where it was.',
  hints: ['Near the middle of the picture, each thin line joins a buoy to where it was. In that patch, find the one buoy with no line.', 'Look at the very middle of the picture. There is a faint light there, on a buoy with no line.'],
  par: 1,
  onWin: S.stillWin,
  setup(p) {
    p.g.stage.view2D({ center: [0, 0], height: 10, ms: 0 });
    p.grid({ main: 0, base: 0.1, axis: 0 });
    const b = new BuoyField(p.g.stage, { extent: 7 });
    b.set(T);
    p.add(b);
    const ghosts = new BuoyField(p.g.stage, { extent: 7, color: '#3a5a86', size: 0.035 });
    p.add(ghosts);
    // near the Anchor only: far buoys moved so far that their lines would cover the picture
    const segs: [V3, V3][] = b.base.flatMap((q, i) => (nearAnchor(q) ? [[[q[0], q[1], -0.01], [...b.pos(i).slice(0, 2), -0.01] as V3] as [V3, V3]] : []));
    // each buoy's old spot joined to its new spot
    const fs = new FatSegments(p.g.stage, segs, { color: '#6f8fbf', width: 1, opacity: 0.45 });
    p.add(fs.object);
    p.onDispose(() => fs.dispose());
    const lamp = glowSprite('#ffe9c4', 0.8, 0.4);
    lamp.position.set(0, 0, 0.05);
    p.add(lamp);
    // before / after toggle: animate the lattice back and forth (honest path: P R(θ) P⁻¹)
    let after = true;
    const toggle = h('button', { class: 'btn small', type: 'button' }, 'Show before');
    toggle.addEventListener('click', async () => {
      after = !after;
      toggle.textContent = after ? 'Show before' : 'Show after';
      sfx.whoosh(0.9);
      const a0 = after ? 0 : Math.PI / 2, a1 = after ? Math.PI / 2 : 0;
      await animate(900, (k) => b.set(Tpartial(a0 + (a1 - a0) * k)), ease.inOut);
    });
    p.dock().appendChild(toggle);
    const origin = b.indexOf([0, 0, 0]);
    let wrongCount = 0;
    // a wrong pick gets its own line from where it was, near the Anchor or not
    let missLine: FatSegments | null = null;
    p.onDispose(() => missLine?.dispose());
    const onClick = (e: PointerEvent) => {
      const i = b.pick(e.clientX, e.clientY, 22);
      if (i < 0 || p.won) return;
      p.move();
      if (i === origin) { b.highlight([i], CYAN); sfx.success(); p.win(); }
      else {
        wrongCount++;
        b.highlight([i], C.orange, 0.6);
        sfx.miss();
        const was = b.base[i];
        const seg: [V3, V3] = [[was[0], was[1], -0.005], apply(T, was)];
        seg[1][2] = -0.005;
        if (missLine) missLine.setSegments([seg]);
        else { missLine = new FatSegments(p.g.stage, [seg], { color: C.orange, width: 2, opacity: 0.9 }); p.add(missLine.object); }
        p.bark('lantern', `That buoy moved. It started at (${was[0]}, ${was[1]}).`);
        if (wrongCount === 3) p.bark('bram', 'Near the Anchor, in the middle. Look for the one with no line from where it was.');
      }
    };
    p.g.stage.renderer.domElement.addEventListener('pointerdown', onClick);
    p.onDispose(() => p.g.stage.renderer.domElement.removeEventListener('pointerdown', onClick));
    return {
      async showMe() { await wait(300); b.highlight([origin], CYAN); sfx.success(); p.win(); },
    };
  },
};

// ------------------------------------------------------------------ cinematics

async function coldOpen(g: Game): Promise<void> {
  // the holder doubles as this run's marker: a teardown clears the world and takes it with it
  const holder = new Group();
  holder.matrixAutoUpdate = false;
  g.stage.world.add(holder);
  const alive = () => holder.parent === g.stage.world;
  await fadeBlack(g, true, 10);
  if (!alive()) return;
  g.mood('void');
  void stamp(g, 'Colony ark MERIDIAN · three years ago', 4200);
  // the ark in nebula light; a pulse front sweeps across it and every box frame leans the same way
  const ark = await loadModel('meridian');
  if (!alive()) return;
  if (ark) { ark.rotation.x = Math.PI / 2; holder.add(ark); }
  void g.stage.view3D({ target: [0, 0, 0], distance: 85, azimuth: -120, elevation: 16, orbit: false, ms: 0 });
  await fadeBlack(g, false, 1800);
  if (!alive()) return;
  const board = new NumberBoard(g, 3, 3, { caption: 'Distress call · colony ark Meridian' });
  board.el.classList.add('corner');
  // R by columns (each spire is one column): cells in reading order are row-major
  const cells = ['0', '−1', '0', '1', '0', '0', '0', '0', '1'];
  const byColumn = [0, 3, 6, 1, 4, 7, 2, 5, 8];
  await g.say(S.call, {
    onLine: async (_l, i) => {
      if (!alive()) return;
      if (i === 3) byColumn.forEach((cell, k) => window.setTimeout(() => { board.set(cell, cells[cell]); sfx.tick(k % 3); }, 400 + k * 520));
      if (i === 2) {
        void g.stage.shockwave([0, 0, 0], 2400, 0.8);
        sfx.whoosh(2.4);
        void animate(2600, (k) => { holder.matrix.copy(pulse3((k * Math.PI) / 2)); holder.matrixWorldNeedsUpdate = true; }, ease.inOut);
      }
    },
  });
  if (!alive()) return;
  await board.hide();
  if (!alive()) return;
  await fadeBlack(g, true, 900);
  if (!alive()) return;
  holder.removeFromParent();
  await titleCard(g, '', GAME_TITLE, 2800);
}

async function arrive(g: Game): Promise<void> {
  g.mood('explore');
  const s = ensureSet(g, false);
  s.buoys.object.visible = false;
  s.ship.object.position.set(-11, -8, 0.3);
  s.ship.face([7, 5, 0]);
  await s.ship.ready;
  if (!live(g, s)) return;
  s.ship.setThrust(1);
  void g.stage.view3D({ target: [-6, -4.5, 0], distance: 9, azimuth: -150, elevation: 14, orbit: false, ms: 0 });
  await fadeBlack(g, false, 1600);
  if (!live(g, s)) return;
  await letterbox(g, true, 600);
  if (!live(g, s)) return;
  void titleCard(g, 'Prologue', 'Where did everything go?', 3600);
  const fly = s.ship.flyTo([SHIP0[0], SHIP0[1], 0.3], 7000);
  void g.stage.view3D({ target: [-2, -1.5, 0.5], distance: 13, azimuth: -125, elevation: 20, orbit: false, ms: 7000 });
  await g.say(S.arrive);
  await fly;
  if (!live(g, s)) return;
  s.ship.face([1, 0.75, 0]);
  await letterbox(g, false, 500);
}

async function seed(g: Game): Promise<void> {
  const s = ensureSet(g, false);
  s.buoys.set([[1, 0], [0, 1]]);
  s.buoys.object.visible = false;
  s.buoys.clearHighlights();
  s.ghosts.visible = false;
  // the player seeds the lattice (Space), or it seeds itself after a while
  const prompt = h('div', { class: 'cine-prompt' }, 'Press ', h('span', { class: 'kbd' }, 'Space'), ' to seed the lattice');
  g.ui.scene.appendChild(prompt);
  // the wait notices a teardown (runner.abort() clears ui.scene): it then stops listening and the beat ends here
  const aborted = await new Promise<boolean>((resolve) => {
    let settled = false;
    const done = (wasAborted: boolean) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', go);
      window.clearTimeout(t);
      watch.disconnect();
      resolve(wasAborted);
    };
    const go = (e?: KeyboardEvent) => {
      if (!prompt.isConnected) return done(true);
      if (e && e.key !== ' ') return;
      e?.preventDefault();
      done(false);
    };
    const watch = new MutationObserver(() => { if (!prompt.isConnected) done(true); });
    watch.observe(g.ui.scene, { childList: true });
    const t = window.setTimeout(() => go(), g.headless ? 50 : 9000);
    document.addEventListener('keydown', go);
    prompt.addEventListener('click', () => go());
  });
  if (aborted || !live(g, s)) return;
  prompt.remove();
  s.buoys.object.visible = true;
  s.buoys.object.scale.setScalar(0.001);
  sfx.warp();
  void g.stage.shockwave([SHIP0[0], SHIP0[1], 0], 1800, 0.5);
  void g.stage.view2D({ center: [0, 0], height: 15, ms: 2600 });
  await animate(2200, (k) => s.buoys.object.scale.setScalar(Math.max(0.001, k)), ease.out);
  if (!live(g, s)) return;
  await g.say(S.seed.slice(0, 2));
  if (!live(g, s)) return;
  markRefs(s.buoys);
  sfx.discover();
  await g.say(S.seed.slice(2));
}

async function pulse(g: Game): Promise<void> {
  const s = ensureSet(g, false);
  void g.stage.view2D({ center: [0, 0], height: 15, ms: 600 });
  s.buoys.set([[1, 0], [0, 1]]);
  markRefs(s.buoys);
  s.ghosts.visible = false;
  s.ship.object.position.set(SHIP0[0], SHIP0[1], 0.3);
  music.stop(0.6);
  await g.say(S.pulse, { noSkip: true });
  if (!live(g, s)) return;
  await wait(400);
  if (!live(g, s)) return;
  sfx.collapse();
  g.stage.flash(0.25, 500);
  g.stage.nudge(0.35);
  void g.stage.shockwave([0, 0, 0], 2400, 1.1);
  // the lights go out under the flash: where the reference buoys land is for the next scan (c00-p2).
  // Faint rings keep their old spots in view.
  s.buoys.clearHighlights();
  s.ghosts.visible = true;
  const start = s.ship.object.position.clone();
  await animate(2200, (k) => {
    const M = Tpartial((k * Math.PI) / 2);
    s.buoys.set(M);
    const q = apply(M, [start.x, start.y]);
    s.ship.object.position.set(q[0], q[1], 0.3);
    s.ship.object.rotation.z += 0.03 * (1 - k);
  }, ease.inOut);
  if (!live(g, s)) return;
  sfx.alarm();
  // thrusters three and four go dark
  s.ship.exhausts.forEach((e, i) => { e.power = i >= 2 ? 0 : 0.15; });
  await wait(900);
  if (!live(g, s)) return;
  g.mood('tension');
}

async function closing(g: Game): Promise<void> {
  const s = ensureSet(g, true);
  void g.stage.view2D({ center: [0, 0], height: 15, ms: 1200 });
  s.buoys.set(T);
  // the check is done: the reference buoys are lit where they landed, the rings show where they were
  markRefs(s.buoys);
  await g.say(S.close.slice(0, 4));
  if (!live(g, s)) return;
  sfx.discover();
  pin('linear', 'Why did everything move except the point under the Anchor?', 'c00');
  pin('nine', 'What do Ilse’s nine numbers mean?', 'c00');
  pin('light', 'What is the light at the point that never moves?', 'c00');
  g.toast('Three questions pinned', 'Case board');
  await g.say(S.close.slice(4));
}

const ch: ChapterDef = {
  id: 'c00',
  act: 0,
  num: 0,
  title: 'Where did everything go?',
  subtitle: 'The first pulse',
  nodes: ['N12'],
  palette: 'void',
  music: 'void',
  inShort: 'Something moved every point but one, all at once. Lines stayed straight, even spacing stayed even, and that one point did not move at all.',
  beats: [
    { kind: 'cinematic', id: 'call', run: coldOpen },
    { kind: 'cinematic', id: 'arrive', run: arrive },
    { kind: 'cinematic', id: 'seed', run: seed },
    { kind: 'puzzle', id: 'p1', puzzle: firstBurn },
    { kind: 'cinematic', id: 'pulse', run: pulse },
    { kind: 'scene', id: 'after', lines: S.after, view: '2d', setup: (g) => { ensureSet(g, true); } },
    { kind: 'puzzle', id: 'p2', puzzle: checkPuzzle },
    { kind: 'puzzle', id: 'p3', puzzle: stillPuzzle },
    { kind: 'scene', id: 'close', lines: [], setup: closing },
  ],
  script: S,
};

export default ch;
