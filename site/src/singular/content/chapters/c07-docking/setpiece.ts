// SP-II · Docking (GDD §6.4, Act II set piece). Uses Act I (three thrusters, one burn from dials) and
// Act II (cross product for the roll axis, a line through the door's centre along its normal, the
// skew-line gap to the nearest debris track). Four stages, one puzzle.
import { Quaternion, Vector3 } from 'three';
import type { PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { burst } from '../../../gfx/fx';
import { makeLantern } from '../../common/set';
import { C } from '../../../core/theme';
import { animate, ease } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { h, inline, button } from '../../../ui/ui';
import { Slider, VectorInput } from '../../../ui/widgets';
import { Knob, RightAngle } from '../../../kit/geom';
import { cross, dot, vadd, vscale } from '../../../math/la';
import { until } from '../c06-volume/stage';
import { Bead, DoorWall, FlatRing, PathLine, lab, v3 } from './parts';
import {
  DOOR_CENTRE, DOOR_E1, DOOR_E2, DOOR_N, DOOR_P, SP_CLEAR, SP_DEB_D, SP_DEB_P, SP_DIALS, SP_GAP, SP_S0, SP_SHIP, SP_START, SP_TS,
  THRUSTERS, along, axisOk, burnOf, dist, footT, fmt, num, pathOk, spBurnWon, spGapAt, spMeasured,
} from './logic';
import { S } from './script';

const DEBRIS = '#c9b08f';
const unit = (v: readonly number[]): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

export const setPiece: PuzzleDef = {
  id: 'c07-sp',
  title: 'Docking: can we bring the Lantern in through the door?',
  goal: '**Roll** the *Lantern* so its axis lies along the door\'s normal. **Lay** the approach path through the door\'s centre. **Check** it clears the nearest debris track by more than 1.5. **Burn** to the path\'s start with the three thrusters.',
  subgoals: ['Roll: the axis along the door\'s normal', 'Lay the path through the centre', 'Clear the debris track by more than 1.5', 'One burn to the start of the path'],
  hints: [
    'The roll axis must read 0 against both door edges: their cross product $(Q - P)\\times(R - P) = (6, 3, 2)$.',
    'Put the anchor on the centre ring; then slide the bead until the link to the debris track is at a right angle to both. The gap is $\\tfrac{15}{7} \\approx 2.14$.',
    'The burn is $(-1, -1, 0) = -1(1, 0, 1) - 1(0, 1, 1) + 1(0, 0, 2)$: dials $-1$, $-1$, 1.',
  ],
  par: 7,
  view: '3d',
  onWin: S.spWin,
  async setup(p) {
    await p.g.stage.view3D({ target: [1.4, 1.0, 0.3], distance: 19, azimuth: -20, elevation: 22, ms: 0 });
    const lvl = p.difficulty;
    const door = new DoorWall(p, { wall: 0.35, wallSize: 5.5 });
    const ring = new FlatRing(p, v3(DOOR_CENTRE), v3(DOOR_N), { r: 0.2 });
    // the nearest debris track, with pieces drifting along it
    new PathLine(p, v3(SP_DEB_P), v3(SP_DEB_D), { color: DEBRIS, t0: -0.75, t1: 0.75, opacity: 0.6, dashed: true });
    lab(p, 'debris track', v3(along(SP_DEB_P, SP_DEB_D, 0.55)), { className: 'small', color: DEBRIS });
    const rocks = [0, 1, 2].map(() => { const d = new Dot([0, 0, 0], { color: DEBRIS, size: 0.12, glow: 0.4 }); p.add(d); return d; });
    let clock = 0;
    p.tick((dt) => { clock += dt; rocks.forEach((rk, i) => { const t = ((clock * 0.04 + i / 3) % 1) * 1.4 - 0.7; rk.at(along(SP_DEB_P, SP_DEB_D, t) as V3); }); });
    // the Lantern, holding farther out than the path start, on the door's outer side
    const ship = makeLantern(p.g.stage, 0.15);
    p.add(ship);
    ship.object.position.set(...v3(SP_SHIP));
    ship.face([1, 0.4, 0.2]);
    ship.setThrust(0.2);
    // the door's two edges from P
    const e1 = new Arrow(v3(DOOR_P), v3(vadd(DOOR_P, DOOR_E1)), { color: C.v, width: 0.03 });
    const e2 = new Arrow(v3(DOOR_P), v3(vadd(DOOR_P, DOOR_E2)), { color: C.w, width: 0.03 });
    p.add(e1, e2);
    const r = p.readout('Docking');
    const box = h('div', { style: 'display:flex;flex-direction:column;gap:8px;min-width:300px' });
    p.dock().appendChild(box);
    let stage = 0;
    let fast = false;
    const anim = (ms: number, fn: (k: number) => void, e = ease.inOut): Promise<void> => (fast ? (fn(1), Promise.resolve()) : animate(ms, fn, e));
    const note = (md: string) => h('div', { style: 'font-size:13.5px;color:var(--ink-2);max-width:340px', html: inline(md) });

    // ---------------------------------------------------------------- stage 1: roll
    let axis: V3 = [0, 0, 1];
    const axisArrow = new Arrow(v3(SP_SHIP), v3(vadd(SP_SHIP, [0, 0, 1.5])), { color: C.result, width: 0.035 });
    p.add(axisArrow);
    const showAxis = () => {
      const u = unit(axis);
      axisArrow.set(v3(SP_SHIP), v3(vadd(SP_SHIP, vscale(u, 1.6))));
      r.row('a1', 'axis reads against $Q - P$', num(dot(axis, DOOR_E1)), Math.abs(dot(axis, DOOR_E1)) < 1e-9 ? C.good : C.v);
      r.row('a2', 'axis reads against $R - P$', num(dot(axis, DOOR_E2)), Math.abs(dot(axis, DOOR_E2)) < 1e-9 ? C.good : C.w);
    };
    const faceQ = (dir: V3): Quaternion => { const q0 = ship.object.quaternion.clone(); ship.face(dir); const q1 = ship.object.quaternion.clone(); ship.object.quaternion.copy(q0); return q1; };
    const roll = async () => {
      if (stage !== 0) return;
      p.move();
      if (!axisOk(axis)) {
        sfx.miss();
        p.bark('lantern', `That axis reads ${num(dot(axis, DOOR_E1))} against Q − P and ${num(dot(axis, DOOR_E2))} against R − P. It must read 0 against both edges.`);
        return;
      }
      stage = 1;
      sfx.thrust(1.2); ship.setThrust(0.7);
      const q0 = ship.object.quaternion.clone(), q1 = faceQ(v3(vscale(DOOR_N, -1)));
      await anim(1400, (k) => ship.object.quaternion.slerpQuaternions(q0, q1, k));
      ship.setThrust(0.2);
      axisArrow.setOpacity(0.35);
      p.subgoal(0);
      stage2();
    };
    const stage1 = () => {
      const input = new VectorInput({ dim: 3, values: axis, label: '\\text{axis} =', step: 1, onChange: (v) => { axis = v3(v); showAxis(); }, onSubmit: () => void roll() });
      const row = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center' }, input.el, button('Roll', () => void roll(), { cls: 'primary small' }));
      if (lvl === 'cadet') row.append(button('Raise from the edges', () => { axis = v3(cross(DOOR_E1, DOOR_E2)); input.set(axis); showAxis(); sfx.snap(); }, { cls: 'small' }));
      box.replaceChildren(h('div', { class: 'kicker' }, 'Step 1 · Roll'), note('The yellow arrow is the roll axis. It must lie along the door\'s normal: at a right angle to **both** door edges, {g|Q − P} and {r|R − P}.'), row);
      showAxis();
      return input;
    };
    const axisInput = stage1();

    // ---------------------------------------------------------------- stage 2: lay the path
    let anchor: V3 = [0.8, 0.2, 0.3 + 0.2];
    anchor = v3(DoorWall.onWall(new Vector3(...anchor)).toArray());
    let pathLine: PathLine | null = null;
    let knob: Knob | null = null;
    let startRing: FlatRing | null = null;
    const lay = () => {
      if (stage !== 1 || !pathOk(anchor)) return;
      stage = 2;
      p.subgoal(1);
      knob?.setEnabled(false);
      pathLine?.setColor(C.v, 2);
      ring.setColor(C.good); void ring.pulse();
      startRing = new FlatRing(p, v3(SP_START), v3(DOOR_N), { r: 0.24, color: C.v });
      lab(p, 'path start', v3(vadd(SP_START, [0.3, 0.2, 0.35])), { className: 'small', color: C.v });
      r.row('path', 'approach path', `centre $+\\,s\\,(6, 3, 2)$`, C.v);
      stage3();
    };
    const stage2 = () => {
      pathLine = new PathLine(p, anchor, v3(DOOR_N), { color: C.v, t0: 0, t1: SP_S0 * 1.35, opacity: 0.8 });
      knob = new Knob(p, anchor, {
        color: C.result, size: 0.09,
        constrain: (q) => { const w = DoorWall.onWall(q); return dist([w.x, w.y, w.z], DOOR_CENTRE) < (lvl === 'cadet' ? 0.3 : 0.18) ? new Vector3(...v3(DOOR_CENTRE)) : w; },
        onMove: (q) => { anchor = q; pathLine!.set(anchor, v3(DOOR_N), 0, SP_S0 * 1.35); },
        onEnd: () => { if (pathOk(anchor)) lay(); else p.bark('lantern', `The path meets the door at ${fmt(anchor.map((x) => Math.round(x * 100) / 100))}. The centre is (1/3, 2/3, 1).`); },
      });
      box.replaceChildren(h('div', { class: 'kicker' }, 'Step 2 · Lay the path'), note('Drag the yellow **anchor** on the door\'s glass. The path runs from it along the normal. Put it through the door\'s **centre**.'));
    };

    // ---------------------------------------------------------------- stage 3: the debris gap
    let tb = 0.02;
    const link = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 0]], { color: C.result, width: 2.6, dashed: true, intensity: 1.3, opacity: 0 });
    p.add(link);
    p.onDispose(() => link.dispose());
    const gapLab = lab(p, '', [0, 0, 0], { className: 'small', color: C.result });
    gapLab.show(false);
    const m1 = new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 1, 0], 0.18);
    const m2 = new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 1, 0], 0.18);
    m1.show(false); m2.show(false);
    let bead: Bead | null = null;
    let slider: Slider | null = null;
    const showGap = () => {
      const a = along(DOOR_CENTRE, DOOR_N, tb) as V3;
      const s = footT(a, SP_DEB_P, SP_DEB_D);
      const b = along(SP_DEB_P, SP_DEB_D, s) as V3;
      link.setPoints([a, b]); link.setOpacity(0.9);
      const g = spGapAt(tb);
      gapLab.show(true);
      gapLab.at([(a[0] + b[0]) / 2 + 0.2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2 + 0.2]);
      gapLab.set(num(Math.round(g * 100) / 100));
      const at = spMeasured(tb);
      m1.set(a, unit(DOOR_N), unit([b[0] - a[0], b[1] - a[1], b[2] - a[2]])); m1.show(at);
      m2.set(b, unit(SP_DEB_D), unit([a[0] - b[0], a[1] - b[1], a[2] - b[2]])); m2.show(at);
      r.row('gap', 'gap to the debris track', at ? `15/7 ≈ ${SP_GAP.toFixed(2)}` : num(Math.round(g * 100) / 100), at ? C.good : C.result);
    };
    const measure = () => {
      if (stage !== 2 || !spMeasured(tb)) return;
      stage = 3;
      p.subgoal(2);
      sfx.snap();
      link.setColor(C.good, 1.6);
      r.row('gap', 'gap to the debris track', `15/7 ≈ ${SP_GAP.toFixed(2)} > ${SP_CLEAR}: clear`, C.good);
      stage4();
    };
    const stage3 = () => {
      const magnet = lvl === 'cadet' ? 0.04 : 0.02;
      bead = new Bead(p, v3(DOOR_CENTRE), v3(DOOR_N), tb, { color: C.v, min: 0, max: SP_S0, magnet: { at: SP_TS[0], within: magnet }, onMove: (t) => { tb = t; slider!.set(Math.round(t * 1000) / 1000, false); showGap(); }, onEnd: () => { p.move(); measure(); } });
      slider = new Slider({ label: 'bead on our path', min: 0, max: SP_S0, step: 0.005, value: tb, onInput: (x) => { tb = Math.abs(x - SP_TS[0]) < magnet ? SP_TS[0] : x; bead!.at(v3(DOOR_CENTRE), v3(DOOR_N), tb); showGap(); } });
      slider.el.querySelector('input')!.addEventListener('change', () => { p.move(); measure(); });
      box.replaceChildren(h('div', { class: 'kicker' }, 'Step 3 · Check the debris'), note('Slide the green bead along our path. The link drops straight to the debris track. Find the **smallest** gap: it must be more than **1.5**.'), slider.el);
      showGap();
    };

    // ---------------------------------------------------------------- stage 4: one burn
    const dials = [0, 0, 0];
    const cols = [C.v, C.w, C.u];
    const legs = THRUSTERS.map((_, i) => { const a = new Arrow(v3(SP_SHIP), v3(SP_SHIP), { color: cols[i], width: 0.035 }); a.setOpacity(0); p.add(a); return a; });
    const res = new Arrow(v3(SP_SHIP), v3(SP_SHIP), { color: C.result, width: 0.045 });
    res.setOpacity(0);
    p.add(res);
    const showBurn = () => {
      let at = v3(SP_SHIP);
      THRUSTERS.forEach((t, i) => { const nx = v3(vadd(at, vscale(t, dials[i]))); legs[i].set(at, nx); legs[i].setOpacity(Math.abs(dials[i]) > 1e-9 ? 0.85 : 0); at = nx; });
      res.set(v3(SP_SHIP), at); res.setOpacity(0.9);
      r.row('burn', 'burn $a(1,0,1) + b(0,1,1) + c(0,0,2)$', fmt(burnOf(dials)), C.result);
      r.row('miss', 'ends this far from the path start', num(Math.round(dist(vadd(SP_SHIP, burnOf(dials)), SP_START) * 100) / 100));
    };
    let won = false, busy = false;
    const fire = async () => {
      if (stage !== 3 || won || busy) return;
      busy = true;
      p.move();
      const end = v3(vadd(SP_SHIP, burnOf(dials)));
      sfx.thrust(1); ship.setThrust(0.9);
      const a0 = v3(SP_SHIP);
      await anim(1600, (k) => ship.object.position.set(a0[0] + (end[0] - a0[0]) * k, a0[1] + (end[1] - a0[1]) * k, a0[2] + (end[2] - a0[2]) * k));
      ship.setThrust(0.2);
      if (!spBurnWon(dials)) {
        sfx.miss();
        p.bark('lantern', `The burn ends at ${fmt(end.map((x) => Math.round(x * 100) / 100))}, ${num(Math.round(dist(end, SP_START) * 100) / 100)} from the path start. Returning.`);
        await anim(900, (k) => ship.object.position.set(end[0] + (a0[0] - end[0]) * k, end[1] + (a0[1] - end[1]) * k, end[2] + (a0[2] - end[2]) * k));
        busy = false;
        return;
      }
      p.subgoal(3);
      startRing?.setColor(C.good);
      // in along the normal, through the centre
      sfx.whoosh(1.4); ship.setThrust(0.5);
      const s0 = v3(SP_START), c0 = v3(DOOR_CENTRE);
      await anim(1700, (k) => ship.object.position.set(s0[0] + (c0[0] - s0[0]) * k, s0[1] + (c0[1] - s0[1]) * k, s0[2] + (c0[2] - s0[2]) * k));
      ship.setThrust(0);
      won = true;
      door.glow(true); void ring.pulse();
      p.g.stage.flash(0.12, 400);
      void burst(p.g.stage, c0, '#ffd9a0', 90, 3, false);
      sfx.success();
      p.win();
    };
    let dialSliders: Slider[] = [];
    const stage4 = () => {
      const step = lvl === 'cadet' ? 1 : lvl === 'navigator' ? 0.5 : 0.25;
      const names = ['$a$ · thruster $(1, 0, 1)$', '$b$ · thruster $(0, 1, 1)$', '$c$ · thruster $(0, 0, 2)$'];
      dialSliders = names.map((nm, i) => new Slider({ label: nm, min: -4, max: 4, step, value: 0, onInput: (x) => { dials[i] = x; showBurn(); } }));
      dialSliders.forEach((s) => s.el.querySelector('input')!.addEventListener('change', () => p.move()));
      box.replaceChildren(h('div', { class: 'kicker' }, 'Step 4 · One burn'), note('Set the three thruster dials so **one burn** takes the *Lantern* to the path start (the green ring). Then **Fire**.'),
        ...dialSliders.map((s) => s.el), button('Fire', () => void fire(), { cls: 'primary small', kbd: 'F' }));
      showBurn();
    };

    const run = async () => {
      axis = v3(DOOR_N); axisInput.set(axis); showAxis();
      await roll();
      anchor = v3(DOOR_CENTRE); knob?.at(anchor); pathLine?.set(anchor, v3(DOOR_N), 0, SP_S0 * 1.35); lay();
      tb = SP_TS[0]; bead?.at(v3(DOOR_CENTRE), v3(DOOR_N), tb); slider?.set(Math.round(tb * 1000) / 1000, false); showGap(); measure();
      SP_DIALS.forEach((x, i) => { dials[i] = x; dialSliders[i]?.set(x, false); }); showBurn();
      await fire();
    };
    return {
      async showMe() { await run(); await until(() => won); },
      async solve() { fast = true; await run(); await until(() => won); },
      async wrong() { fast = true; axis = [1, 2, 3]; await roll(); },
    };
  },
};
