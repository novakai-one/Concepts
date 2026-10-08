// Chapter 13 staging: the cold open at the Meridian's bow (LANTERN's frame plan as a hologram over the
// hull, the damage replayed honestly as P R(θ) P⁻¹), three more routine pulses that square the ground
// layer, the title card at the moment "singular" is earned, and the undo-planner install.
import { DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { Game, V3 } from '../../../game/types';
import { Grid2D } from '../../../gfx/grid';
import { Label } from '../../../gfx/label';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { isPlayerFn, pylib } from '../../../game/build';
import { GAME_TITLE } from '../../meta';
import { T, Tpartial } from '../../truth';
import { identity, type Mat } from '../../../math/la';
import { CamRig, Gone, check, meridianSet, type ArkSet } from './ark';
import { FramePlan } from './frames';
import { crewInverse, meqTol, P6_A } from './logic';
import { plan2, smoothAt } from './honest';
import { landingLineColour } from './puzzles';
import { S } from './script';

/** LANTERN's hologram of the bow frame plan over the hull: the as-built plan dashed, the frames now solid. */
export class PlanHologram {
  readonly group = new Group();
  readonly plan: FramePlan;
  readonly ghost: FramePlan;
  private readonly panel: Mesh<PlaneGeometry, MeshBasicMaterial>;
  readonly title: Label;
  constructor(g: Game, parent: Group, at: V3, scale: number, tilt: number) {
    this.group.position.set(...at);
    this.group.rotation.x = tilt;
    this.group.scale.setScalar(scale);
    this.panel = new Mesh(new PlaneGeometry(9, 5.4), new MeshBasicMaterial({ color: '#59e1ff', transparent: true, opacity: 0.05, side: DoubleSide, depthWrite: false }));
    this.panel.position.set(0.25, 0, -0.02);
    this.ghost = new FramePlan(g.stage, { color: '#8fa3c4', opacity: 0.6, fill: 0, dashed: true, width: 1.6 }, 0.004);
    this.plan = new FramePlan(g.stage, { color: C.accent, fill: 0.14 }, 0.01);
    this.title = new Label('Bow frame plan · as built (dashed) and now', [0.25, 3.2, 0], { className: 'small' });
    this.group.add(this.panel, this.ghost.object, this.plan.object, this.title.object);
    // nested labels are not removed with the world: dispose them with the group
    this.group.userData.dispose = () => this.title.dispose();
    this.ghost.set(identity(2));
    this.plan.set(T);
    parent.add(this.group);
  }
  setOpacity(a: number): void { this.panel.material.opacity = 0.05 * a; this.plan.setOpacity(a); this.ghost.setOpacity(a); this.title.show(a > 0.05); }
}

/** The routine pulse played honestly from angle a0 to a1 (P R(θ) P⁻¹, determinant 1 at every frame). */
async function pulseAlong(set: (M: Mat) => void, a0: number, a1: number, ms: number): Promise<void> {
  await animate(ms, (k) => set(Tpartial(a0 + (a1 - a0) * k)), ease.inOut);
  set(Tpartial(a1));
}

// ------------------------------------------------------------------ cold open

export async function coldOpen(g: Game): Promise<void> {
  try {
    await fadeBlack(g, true, 10);
    g.stage.clearWorld();
    g.mood('explore');
    const set = await meridianSet(g, { lantern: { at: [38, 12, 3], face: [-1, -0.25, 0.05], scale: 1.5 } });
    check(set);
    const cam = new CamRig(g, set, [62, -44, 20], [24, -2, 4]);
    cam.drift(0.4);
    const holo = new PlanHologram(g, set.root, [22, 2, 12], 1.7, 1.15);
    holo.plan.set(identity(2));
    holo.setOpacity(0);
    void fadeBlack(g, false, 1600);
    await letterbox(g, true, 600);
    check(set);
    void stamp(g, 'Colony ark *Meridian* · the bow', 4000);
    void cam.to([48, -40, 18], [22, 0, 6], 14000, ease.inOut);
    await g.say(S.open, {
      onLine: (_l, i) => {
        if (!set.alive()) return;
        if (i === 0) {
          sfx.open();
          void (async () => {
            await animate(700, (k) => holo.setOpacity(k), ease.out);
            await wait(300);
            sfx.whoosh(2);
            await pulseAlong((M) => holo.plan.set(M), 0, Math.PI / 2, 2400);
          })();
        }
      },
    });
    check(set);
    await titleCard(g, 'Chapter 13', 'How do we undo a move?', 3000);
    check(set);
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

// ------------------------------------------------------------------ three more routine pulses

export async function threePulses(g: Game): Promise<void> {
  g.stage.clearWorld();
  await g.stage.view2D({ center: [-0.2, 0], height: 10.5, ms: 400 });
  const grid = new Grid2D(g.stage, { base: 0.42, main: 0.55, axis: 0.45 });
  grid.set(T);
  const ghost = new FramePlan(g.stage, { color: '#8fa3c4', opacity: 0.55, fill: 0, dashed: true, width: 1.6 }, 0.004);
  const plan = new FramePlan(g.stage, {}, 0.01);
  const count = new Label('', [0, 4.2, 0], { color: C.white, size: 22 });
  g.stage.world.add(grid.object, ghost.object, plan.object, count.object);
  ghost.set(identity(2));
  plan.set(T);
  const setBoth = (M: Mat) => { grid.set(M); plan.set(M); };
  let job: Promise<void> = Promise.resolve();
  await g.say(S.three, {
    onLine: (_l, i) => {
      if (i !== 1) return;
      job = (async () => {
        for (let k = 1; k <= 3; k++) {
          count.set(`pulse ${k}`);
          void g.stage.shockwave([0, 0, 0], 900, 0.5);
          sfx.whoosh(0.9);
          await pulseAlong(setBoth, (Math.PI / 2) * k, (Math.PI / 2) * (k + 1), g.headless ? 10 : 1100);
          await wait(g.headless ? 5 : 250);
        }
        setBoth(identity(2));
        plan.setColor(C.good);
        count.set('back where it was built');
        sfx.success();
      })();
    },
  });
  await job;
}

// ------------------------------------------------------------------ the title card returns

export async function singularTitle(g: Game): Promise<void> {
  g.stage.clearWorld();
  await g.stage.view2D({ center: [0.5, 0.8], height: 10, ms: 300 });
  const grid = new Grid2D(g.stage, { base: 0.38, main: 0.55, axis: 0.45 });
  landingLineColour(grid);
  const ghost = new FramePlan(g.stage, { color: '#8fa3c4', opacity: 0.45, fill: 0, dashed: true, width: 1.4 }, 0.004);
  const plan = new FramePlan(g.stage, { color: C.orange }, 0.01);
  g.stage.world.add(grid.object, ghost.object, plan.object);
  ghost.set(identity(2));
  // the flattening, played honestly: every frame is (1 − t)I + t·Y turned by R(tθ), flat only at the end
  const st = plan2(P6_A)[0];
  sfx.collapse();
  if (st.kind === 'smooth') await animate(g.headless ? 10 : 1800, (k) => { const M = smoothAt(st, k); grid.set(M); plan.set(M); }, ease.inOut);
  grid.set(P6_A); plan.set(P6_A);
  g.mood('void');
  await titleCard(g, '', GAME_TITLE, g.headless ? 50 : 4600, 'A matrix that flattens space is called **singular**. It has no inverse.');
  g.mood('puzzle');
}

// ------------------------------------------------------------------ install: the undo planner squares the bow

async function plannedUndo(): Promise<{ mine: boolean; U: Mat }> {
  const crew = crewInverse(T)!;
  if (!isPlayerFn('inverse')) return { mine: false, U: crew };
  try {
    const U = await Promise.race([pylib.call<Mat | null>('inverse', T), new Promise<null>((r) => window.setTimeout(() => r(null), 8000))]);
    if (U && meqTol(U, crew, 1e-6)) return { mine: true, U };
  } catch { /* fall back to the backup */ }
  return { mine: false, U: crew };
}

export async function install(g: Game): Promise<void> {
  try {
    g.stage.clearWorld();
    g.mood('explore');
    const set: ArkSet = await meridianSet(g, { lantern: { at: [38, 12, 3], face: [-1, -0.25, 0.05], scale: 1.5 } });
    check(set);
    const cam = new CamRig(g, set, [50, -42, 18], [22, 0, 6]);
    cam.drift(0.35);
    const holo = new PlanHologram(g, set.root, [22, 2, 12], 1.7, 1.15);
    holo.plan.set(T);
    await letterbox(g, true, 500);
    const job = plannedUndo();
    await g.say(S.install);
    check(set);
    const { mine } = await job;
    check(set);
    holo.title.set(mine ? 'Undo planner · running your inverse' : 'Undo planner · running LANTERN backup');
    const said = g.say(mine ? S.installMine : S.installCrew);
    await wait(g.headless ? 10 : 900);
    // the jacks push every joint along the undo: P R(θ) P⁻¹ from θ = π/2 back to 0
    sfx.whoosh(2.2);
    await pulseAlong((M) => holo.plan.set(M), Math.PI / 2, 0, g.headless ? 10 : 2600);
    holo.plan.setColor(C.good);
    sfx.success();
    check(set);
    void cam.to([44, -30, 14], [20, 0, 3], 16000, ease.linear);
    await said; // the install line finishes before the next one opens
    await g.say(S.close);
    check(set);
    await letterbox(g, false, 500);
  } catch (e) { if (!(e instanceof Gone)) throw e; }
}

// ------------------------------------------------------------------ a scene setup: the bow with the hologram at a given move

/** The Meridian's bow with LANTERN's frame-plan hologram showing the move M, camera drifting. */
export function bowShot(M: Mat) {
  return async (g: Game): Promise<void> => {
    const set = await meridianSet(g, { lantern: { at: [38, 12, 3], face: [-1, -0.25, 0.05], scale: 1.5 } });
    if (!set.alive()) return; // the beat already moved on
    const cam = new CamRig(g, set, [52, -42, 18], [22, 0, 6]);
    cam.drift(0.4);
    const holo = new PlanHologram(g, set.root, [22, 2, 12], 1.7, 1.15);
    holo.plan.set(M);
    void cam.to([46, -38, 16], [21, 0, 6], 20000, ease.linear);
  };
}
