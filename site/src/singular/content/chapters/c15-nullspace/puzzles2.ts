// Chapter 15 puzzles 5–7: which sets can be landing sets (and why the violet line is at right angles
// to every row), the salvage arm's elbow, and the damaged spare arm.
import { CircleGeometry, Color, DoubleSide, Mesh, MeshBasicMaterial } from 'three';
import type { PuzzleDef, PuzzleCtx, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { InfLine, Parallelogram, PlanePatch } from '../../../gfx/shapes';
import { Knob, RightAngle } from '../../../kit/geom';
import { StepWorksheet, TileOrder } from '../../../kit/steps';
import { Slider, VectorInput } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { burst } from '../../../gfx/fx';
import { C2 } from '../../truth';
import {
  ARM, ARM7, HANDLE, IMPOSTORS, NULL_DIR, P5_DECOYS, P5_ESCAPES, P5_TILES, PIPE, SET_IDS, SET_NAMES, SET_SHORT,
  armClear, armGap, armJoints, armMotors, escapes, fmtN, fmtV, gripperAt, inSet, len, offReach7, p5OrderOk, p6Won,
  p7Won, snapToSet, stillCommand, testResult, toSet, winTol, type Diff, type P3, type SetId, type TestOp,
} from './logic';
import { GlowLine, Probe, Room, Sheet } from './space';
import { S } from './script';
import { matVec } from '../../../math/la';

const d = (p: PuzzleCtx) => p.difficulty as Diff;
const PALE = '#9fd8ff';

// ------------------------------------------------------------------ p5 [D] What counts as a landing set?

export const p5: PuzzleDef = {
  id: 'c15-p5',
  title: 'What kind of set can be a landing set?',
  goal: 'Five candidate sets. For each **impostor**, put the green and red test arrows **in** the set and build an arrow that **escapes** it: their sum, or a stretch of the green one.',
  subgoals: ['Break the three impostors', 'Show the violet line is at right angles to every row'],
  hints: [
    'Pick a candidate, drag the green arrow $\\mathbf u$ (and the red $\\mathbf v$) onto it, then press **Add** or **Stretch**. An escaping arrow ends off the set.',
    'The shifted plane: any sum escapes, and a stretch by 0 gives the origin, which it misses. The two axes: one arrow on each. The quarter: stretch by −1.',
    'Each dot product is row times $(1, 1, -1)$: $1 + 0 - 1$, $0 + 1 - 1$, $1 + 1 - 2$.',
  ],
  par: 9,
  view: '3d',
  onWin: S.p5Win,
  setup(p) {
    const room = new Room(p, { extent: 3, scale: 0.95 });
    void p.g.stage.view3D({ target: [0.2, 0.3, 1.3], distance: 13, azimuth: -55, elevation: 20, ms: 0 });
    const st = p.g.stage;
    const snap = p.snap() ?? 0.25;
    // the five candidates
    const vis: Record<SetId, { show(v: boolean): void }> = {} as Record<SetId, { show(v: boolean): void }>;
    {
      const plane = new Sheet(room, [1, 1, -1], { color: PALE, size: 6, opacity: 0.12 });
      vis.plane = { show: (v) => { plane.patch.object.visible = v; } };
      const line = new GlowLine(room, NULL_DIR, { half: 4 });
      vis.line = { show: (v) => line.setOpacity(v ? 1 : 0) };
      const sh = room.own(new PlanePatch(st, room.w([0, 0, 1]), [1, 1, -1], { color: PALE, size: 6 * room.s, opacity: 0.12 }));
      vis.shifted = { show: (v) => { sh.object.visible = v; } };
      const ax = room.own(new FatLine(st, [room.w([-3.4, 0, 0]), room.w([3.4, 0, 0])], { color: PALE, width: 5, intensity: 1.4, opacity: 0.85 }));
      const ay = room.own(new FatLine(st, [room.w([0, -3.4, 0]), room.w([0, 3.4, 0])], { color: PALE, width: 5, intensity: 1.4, opacity: 0.85 }));
      vis.axes = { show: (v) => { ax.object.visible = v; ay.object.visible = v; } };
      const q = room.own(new Parallelogram(st, [3 * room.s, 0, 0], [0, 3 * room.s, 0], { color: PALE, opacity: 0.18, origin: room.w([0, 0, 0]) }));
      vis.quarter = { show: (v) => { q.object.visible = v; } };
    }
    const origin = new Dot(room.w([0, 0, 0]), { color: C.white, size: 0.07 });
    p.add(origin);
    let cur: SetId = 'shifted';
    let rowsUp = false;
    // the stage-2 timer and the arrow grow can outlive this puzzle (Skip, Reset): stop at disposal
    let gone = false;
    p.onDispose(() => { gone = true; });
    let op: TestOp = 'add';
    let k = -1;
    const status: Record<SetId, 'open' | 'broken' | 'held'> = { plane: 'open', line: 'open', shifted: 'open', axes: 'open', quarter: 'open' };
    const r = p.readout('Test');
    // test arrows
    let u: P3 = [0, 0, 1], v: P3 = [1, 0, 2];
    const ua = room.arrow(u, { color: C.v, label: '$\\mathbf u$' });
    const va = room.arrow(v, { color: C.w, label: '$\\mathbf v$' });
    const res = room.arrow([0, 0, 0], { color: C.result, label: '' });
    res.setOpacity(0);
    const gap = new FatLine(st, [[0, 0, 0], [0, 0, 0]], { color: C.white, width: 1.6, opacity: 0.8, dashed: true, dashSize: 0.1, gapSize: 0.08 });
    p.add(gap); gap.setOpacity(0);
    const resTag = new Label('', [0, 0, 0], { className: 'act5-pt', offset: [0, -24] });
    p.add(resTag); resTag.show(false);
    const fit = (x: V3) => snapToSet(cur, x, snap);
    const pu = new Probe(p, room, u, { color: C.v, snap: null, limit: 3.2, fit, size: 0.07, onMove: (x) => { u = x; drawUV(); }, onEnd: () => p.move() });
    const pv = new Probe(p, room, v, { color: C.w, snap: null, limit: 3.2, fit, size: 0.07, onMove: (x) => { v = x; drawUV(); }, onEnd: () => p.move() });
    const drawUV = () => {
      room.setArrow(ua, u); room.setArrow(va, v);
      ua.setOpacity(len(u) > 1e-6 ? 1 : 0);
      va.setOpacity(op === 'add' && len(v) > 1e-6 ? 1 : 0);
      pv.knob.object.visible = op === 'add';
      pv.knob.setEnabled(op === 'add' && !rowsUp);
      res.setOpacity(0); gap.setOpacity(0); resTag.show(false);
      r.row('u', '$\\mathbf u$', fmtV(u), C.v);
      r.row('v', '$\\mathbf v$', op === 'add' ? fmtV(v) : '·', C.w);
    };
    // chips, op and stretch
    const chips = SET_IDS.map((id) => {
      const b = button('', () => choose(id), { cls: 'small ghost' });
      b.innerHTML = inline(SET_SHORT[id]);
      return { id, b };
    });
    const paintChips = () => chips.forEach(({ id, b }) => {
      b.classList.toggle('on', id === cur);
      b.classList.toggle('broken', status[id] === 'broken');
      b.classList.toggle('holds', status[id] === 'held');
    });
    const choose = (id: SetId) => {
      cur = id;
      SET_IDS.forEach((s) => vis[s].show(s === id));
      u = fit(u); v = fit(v);
      pu.set(u); pv.set(v);
      drawUV();
      r.row('set', 'candidate', SET_NAMES[id]);
      paintChips();
    };
    const opBtns = (['add', 'stretch'] as TestOp[]).map((o) => {
      const b = button(o === 'add' ? 'Add: u + v' : 'Stretch: k u', () => { op = o; opBtns.forEach((x, i) => x.setAttribute('aria-pressed', String((['add', 'stretch'] as TestOp[])[i] === op))); drawUV(); test(); }, { cls: 'small' });
      return b;
    });
    const kSlider = new Slider({ label: 'stretch $k$', min: -2, max: 2, step: d(p) === 'commander' ? 0.1 : 0.5, value: k, onInput: (x) => { k = x; } });
    const test = async () => {
      p.move();
      const out = testResult(op, u, v, k);
      room.setArrow(res, out);
      res.setOpacity(len(out) > 1e-6 ? 1 : 0);
      await res.grow(320);
      resTag.at(room.w(out));
      resTag.show(true);
      r.row('r', op === 'add' ? '$\\mathbf u + \\mathbf v$' : '$k\\mathbf u$', fmtV(out), C.result);
      if (escapes(cur, op, u, v, k)) {
        const back = toSet(cur, out);
        gap.setPoints([room.w(out), room.w(back)]);
        gap.setOpacity(len(out.map((c, i) => c - back[i])) > 0.05 ? 0.85 : 0);
        resTag.set(len(out) < 1e-9 ? '✕ the origin is not in the set' : '✕ escapes the set');
        resTag.el.classList.remove('g');
        sfx.miss();
        void burst(p.g.stage, room.w(out), '#ffb347', 36, 2, false);
        if (IMPOSTORS.includes(cur) && status[cur] !== 'broken') {
          status[cur] = 'broken';
          sfx.success();
          paintChips();
          const left = IMPOSTORS.filter((s) => status[s] !== 'broken').length;
          p.bark('lantern', left ? `Broken: ${SET_NAMES[cur]}. ${left} to go.` : 'All three impostors broken.');
          if (!left) { p.subgoal(0); window.setTimeout(() => { if (!gone) void toRows(); }, p.g.headless ? 10 : 1300); }
        }
      } else {
        resTag.set('✓ still in the set');
        resTag.el.classList.add('g');
        sfx.snap();
        if (!inSet(cur, u) || (op === 'add' && !inSet(cur, v))) p.bark('lantern', 'Put both test arrows in the set first.');
        else if (!IMPOSTORS.includes(cur) && status[cur] === 'open') { status[cur] = 'held'; paintChips(); }
      }
    };
    const testBox = h('div', { class: 'act5-chips' }, ...chips.map((c) => c.b));
    p.dock().append(testBox, h('div', { class: 'act5-btns' }, ...opBtns), kSlider.el);
    choose('shifted');

    // ---- stage 2: rows and the violet line ([D])
    let ws: StepWorksheet | null = null;
    let tiles: TileOrder | null = null;
    let tilesOk = d(p) !== 'commander';
    const marks: RightAngle[] = [];
    const toRows = async () => {
      if (rowsUp || gone) return;
      rowsUp = true;
      SET_IDS.forEach((s) => vis[s].show(s === 'line'));
      [ua, va, res].forEach((a) => a.setOpacity(0));
      gap.setOpacity(0); resTag.show(false);
      pu.knob.object.visible = false; pv.knob.object.visible = false;
      pu.knob.setEnabled(false); pv.knob.setEnabled(false);
      ['u', 'v', 'set', 'r'].forEach((k) => r.hideRow(k));
      r.note('Each row of $C_2$ against the violet line $(1, 1, -1)$: multiply matching parts and add.');
      p.setGoal('Why is the violet line a landing set too? Its arrows are the starts that land on the origin. Show that each **row** of $C_2$ reads 0 against $(1, 1, -1)$.');
      const rows = C2.map((row, i) => room.arrow(row, { color: [C.v, C.w, C.u][i], label: `$\\text{row } ${i + 1}$` }));
      await Promise.all(rows.map((a) => a.grow(600)));
      if (gone) return;
      const mount = h('div', {});
      p.dock().replaceChildren(mount);
      const startWs = () => {
        ws = new StepWorksheet(p, {
          mount,
          steps: C2.map((row, i) => ({
            prompt: `Row ${i + 1}, $(${row.join(', ')})$, dotted with $(1, 1, -1)$:`,
            answer: 0,
            mistakes: [[row[0] + row[1] + row[2], 'The last entry of $(1, 1, -1)$ is $-1$: subtract the third part.']] as [number, string][],
          })),
          onDone: () => done(),
        });
      };
      if (!tilesOk) {
        const tmount = h('div', {});
        mount.appendChild(tmount);
        tiles = new TileOrder(p, {
          mount: tmount, tiles: P5_TILES, decoys: P5_DECOYS, title: 'First: why the starts sent to the origin keep every sum and every stretch', submitLabel: 'Check',
          onSubmit: (o) => {
            p.move();
            if (p5OrderOk(o)) { tilesOk = true; sfx.success(); tmount.remove(); startWs(); }
            else { sfx.miss(); p.bark('lantern', 'Start from two inputs sent to the origin, show the sum and the stretch, then conclude.'); }
          },
        });
      } else startWs();
    };
    const done = () => {
      C2.forEach((row) => {
        const m = new RightAngle(p, room.w([0, 0, 0]), row.map((x) => x * room.s) as V3, NULL_DIR.map((x) => x * room.s) as V3, 0.3, { color: C.white });
        marks.push(m);
      });
      sfx.success();
      p.subgoal(1);
      p.win();
    };
    const doEscape = async (id: 'shifted' | 'axes' | 'quarter', fast: boolean) => {
      choose(id);
      const e = P5_ESCAPES[id];
      op = e.op; k = e.k; kSlider.set(k, false);
      opBtns.forEach((x, i) => x.setAttribute('aria-pressed', String((['add', 'stretch'] as TestOp[])[i] === op)));
      if (fast) { u = e.u; v = e.v; pu.set(u); pv.set(v); drawUV(); }
      else { await Promise.all([pu.moveTo(e.u, 500), pv.moveTo(e.v, 500)]); u = e.u; v = e.v; drawUV(); }
      await test();
    };
    return {
      async showMe() {
        for (const id of IMPOSTORS as ('shifted' | 'axes' | 'quarter')[]) { if (status[id] !== 'broken') { await doEscape(id, false); await wait(400); } }
        await toRows();
        if (tiles && !tilesOk) { tiles.set(['t1', 't2', 't3', 't4']); (tiles.el.querySelector('.btn.primary') as HTMLButtonElement).click(); }
        await wait(200);
        await ws?.showMe(400);
      },
      async solve() {
        for (const id of IMPOSTORS as ('shifted' | 'axes' | 'quarter')[]) if (status[id] !== 'broken') await doEscape(id, true);
        await toRows();
        if (tiles && !tilesOk) { tiles.set(['t1', 't2', 't3', 't4']); (tiles.el.querySelector('.btn.primary') as HTMLButtonElement).click(); }
        ws?.solve();
      },
      async wrong() {
        // the misconception: testing the true landing plane and expecting it to break
        choose('plane'); op = 'add'; u = [1, 0, 1]; v = [0, 1, 1]; pu.set(u); pv.set(v); drawUV(); await test();
      },
    };
  },
};

// ------------------------------------------------------------------ p6 Move the elbow, not the hand

export const p6: PuzzleDef = {
  id: 'c15-p6',
  title: 'Can the arm move without moving the hand?',
  goal: 'The gripper holds the hatch handle; the elbow is jammed on a pipe. Type a **motor command**, then **run** it until the elbow is clear. The gripper must stay on the handle.',
  subgoals: ['A command that keeps the gripper still', 'Run it until the elbow clears the pipe'],
  hints: [
    'Motor 1 pushes the gripper along $(1, 0)$, motor 2 along $(0, 1)$, motor 3 along $(1, 1)$. The gripper moves by $A\\mathbf c$ per unit of run.',
    'You want $A\\mathbf c = \\mathbf 0$: motor 1 + motor 2 − motor 3 cancels. The same arrow that went to the origin in the two-decimal model.',
    'Command $(1, 1, -1)$, run it forward to 1.',
  ],
  par: 3,
  view: '2d',
  onWin: S.p6Win,
  setup(p) {
    p.grid({ base: 0.12, main: 0.35, axis: 0.5 });
    p.g.stage.view2D({ center: [2.1, 1.2], height: 6.5, ms: 0 });
    const st = p.g.stage;
    const tol = winTol(d(p));
    // the pipe and the handle
    const pipeMat = new MeshBasicMaterial({ color: new Color('#5b6577'), transparent: true, opacity: 0.85, side: DoubleSide });
    const pipe = new Mesh(new CircleGeometry(PIPE.r, 48), pipeMat);
    pipe.position.set(PIPE.c[0], PIPE.c[1], -0.01);
    const ringPts: V3[] = Array.from({ length: 65 }, (_, i) => [PIPE.c[0] + PIPE.r * Math.cos((i / 64) * Math.PI * 2), PIPE.c[1] + PIPE.r * Math.sin((i / 64) * Math.PI * 2), 0.01]);
    const ring = new FatLine(st, ringPts, { color: '#ffb347', width: 2.2, intensity: 1.3 });
    const pipeTag = new Label('coolant pipe', [PIPE.c[0], -0.42, 0], { className: 'act5-note' });
    const handle = new FatLine(st, [[HANDLE[0] - 0.05, HANDLE[1] + 0.28, 0], [HANDLE[0] + 0.05, HANDLE[1] - 0.28, 0]], { color: '#c8d0e0', width: 7, intensity: 1.2 });
    const handleTag = new Label('hatch handle', [HANDLE[0] + 0.85, HANDLE[1] + 0.32, 0], { className: 'act5-note' });
    p.add(pipe, ring, pipeTag, handle, handleTag);
    p.onDispose(() => { pipe.geometry.dispose(); pipeMat.dispose(); });
    // the arm: three telescoping segments, tip to tail, coloured like the columns they push along
    const segs = [C.v, C.w, C.u].map((c) => new Arrow([0, 0, 0], [1, 0, 0], { color: c, width: 0.07 }));
    const joints = [0, 1, 2].map(() => new Dot([0, 0, 0], { color: '#c8d0e0', size: 0.075 }));
    const base = new Dot([0, 0, 0], { color: '#8f9bb3', size: 0.14, label: 'base', labelOffset: [0, 30] });
    const claw = new FatLine(st, [[0, 0, 0], [0, 0, 0]], { color: '#e8f1ff', width: 3, intensity: 1.4 });
    const slip = new FatLine(st, [[0, 0, 0], [0, 0, 0]], { color: C.white, width: 1.6, opacity: 0.85, dashed: true, dashSize: 0.08, gapSize: 0.06 });
    p.add(...segs, ...joints, base, claw, slip);
    let cmd: P3 = [0, 0, 0];
    let t = 0;
    const r = p.readout('Salvage arm');
    const draw = () => {
      const m = armMotors(cmd, t);
      const J = armJoints(m);
      segs.forEach((s, i) => { s.set([J[i][0], J[i][1], 0.02], [J[i + 1][0], J[i + 1][1], 0.02]); s.setOpacity(Math.hypot(J[i + 1][0] - J[i][0], J[i + 1][1] - J[i][1]) > 1e-3 ? 1 : 0); });
      joints.forEach((j, i) => j.at([J[i + 1][0], J[i + 1][1], 0.04]));
      const g = gripperAt(m);
      claw.setPoints([[g[0] - 0.16, g[1] + 0.12, 0.03], [g[0], g[1], 0.03], [g[0] - 0.16, g[1] - 0.12, 0.03]]);
      const off = Math.hypot(g[0] - HANDLE[0], g[1] - HANDLE[1]);
      slip.setPoints([[g[0], g[1], 0.03], [HANDLE[0], HANDLE[1], 0.03]]);
      slip.setOpacity(off > 0.03 ? 0.85 : 0);
      const clear = armClear(m);
      ring.setColor(clear ? '#8f9bb3' : '#ffb347', clear ? 1 : 1.3);
      r.row('c', 'command $\\mathbf c$', fmtV(cmd));
      r.row('ac', 'gripper moves by $A\\mathbf c$', fmtV(matVec(ARM, cmd)), stillCommand(cmd) ? C.good : undefined);
      r.row('m', 'motors', fmtV(m));
      r.row('g', 'gripper', off > 0.03 ? `off the handle by ${fmtN(off)}` : 'on the handle', off > 0.03 ? '#ffb347' : C.good);
      r.row('e', 'elbow', clear ? 'clear of the pipe' : 'against the pipe', clear ? C.good : '#ffb347');
    };
    const input = new VectorInput({ dim: 3, values: cmd, label: '\\mathbf c =', step: 1, onChange: (v) => { cmd = v as P3; draw(); }, onSubmit: () => { p.move(); checkCmd(); } });
    const run = new Slider({ label: 'run', min: -2, max: 2, step: d(p) === 'commander' ? 0.05 : 0.1, value: 0, onInput: (x) => { t = x; draw(); } });
    let cmdOk = false;
    const checkCmd = () => {
      if (stillCommand(cmd) && !cmdOk) { cmdOk = true; p.subgoal(0); }
    };
    const check = () => {
      checkCmd();
      if (p6Won(cmd, t, tol)) {
        if (!p.won) { p.subgoal(1); sfx.success(); void burst(st, [HANDLE[0], HANDLE[1], 0], C.good, 40, 2, true); p.win(); }
        return;
      }
      const m = armMotors(cmd, t);
      const g = gripperAt(m);
      const off = Math.hypot(g[0] - HANDLE[0], g[1] - HANDLE[1]);
      if (off > tol) { sfx.miss(); p.bark('lantern', `The gripper left the handle by ${fmtN(off)}. That command moves the hand.`); }
      else if (!armClear(m)) p.bark('lantern', `The elbow is ${fmtN(Math.max(0, armGap(m) - 0.08 - PIPE.r))} from clear. Keep running.`);
    };
    run.el.querySelector('input')!.addEventListener('change', () => { p.move(); check(); });
    p.dock().append(h('div', { class: 'act5-row' }, h('span', { class: 'k' }, 'Command'), input.el), run.el,
      h('div', { class: 'act5-msg', html: inline('Each unit of run adds $\\mathbf c$ to the three motors.') }));
    draw();
    return {
      async showMe() {
        cmd = [1, 1, -1]; input.set(cmd); checkCmd(); draw();
        await wait(300);
        await animate(1200, (k) => { t = k; run.set(t, false); draw(); }, ease.inOut);
        t = 1; run.set(1, false); draw(); check();
      },
      solve() { cmd = [1, 1, -1]; input.set(cmd); t = 1; run.set(1, false); draw(); check(); },
      wrong() { cmd = [0, 0, 1]; input.set(cmd); t = 1; run.set(1, false); draw(); check(); },
    };
  },
};

// ------------------------------------------------------------------ p7 [S] A damaged arm

export const p7: PuzzleDef = {
  id: 'c15-p7',
  title: 'What can the damaged arm not do?',
  style: 'mastery',
  goal: 'The spare arm\'s motors push along $(1, 2)$, $(2, 4)$ and $(3, 6)$. Drag the marker to a point it **cannot reach**. Then type **two different** commands that keep its gripper still.',
  subgoals: ['A point the arm cannot reach', 'Two still-commands that are not multiples of each other'],
  hints: [
    'All three columns lie on the line through $(1, 2)$: every reach is on it. Put the marker off that line.',
    'Motor 1 cancels motor 2 at two to one: $-2(1, 2) + (2, 4) = \\mathbf 0$. Motor 1 cancels motor 3 at three to one.',
    '$(-2, 1, 0)$ and $(-3, 0, 1)$.',
  ],
  par: 4,
  view: '2d',
  onWin: S.p7Win,
  setup(p) {
    p.grid({ base: 0.12, main: 0.35, axis: 0.5 });
    p.g.stage.view2D({ center: [1.7, 2.5], height: 9.6, ms: 0 });
    const st = p.g.stage;
    const reach = new InfLine(st, [0, 0, 0], [1, 2, 0], { color: C.result, width: 2.5, opacity: 0.55, dashed: true });
    const reachTag = new Label('every reach of the spare arm', [1.55, 3.1, 0], { className: 'act5-pt y', offset: [-130, 0] });
    const cols = [[1, 2], [2, 4], [3, 6]].map((c, i) => new Arrow([0, 0, 0], [c[0], c[1], 0.02 + i * 0.01], { color: [C.v, C.w, C.u][i], width: 0.05 - i * 0.01, label: `$\\mathbf a_${i + 1}$` }));
    p.add(reach, reachTag, ...cols);
    p.onDispose(() => reach.dispose());
    let target: V3 = [1, 2, 0];
    let c: P3 = [0, 0, 0], e: P3 = [0, 0, 0];
    const flags = [false, false];
    const r = p.readout('Spare arm');
    const gap = new FatLine(st, [[0, 0, 0], [0, 0, 0]], { color: C.white, width: 1.6, dashed: true, dashSize: 0.1, gapSize: 0.07 });
    p.add(gap);
    const marker = new Knob(p, target, {
      color: C.white, label: 'target', snap: p.snap() ?? null,
      onMove: (q) => { target = q; draw(); },
      onEnd: () => check(),
    });
    const draw = () => {
      const t = [target[0], target[1]];
      const k = (t[0] * 1 + t[1] * 2) / 5;
      gap.setPoints([[t[0], t[1], 0.02], [k, 2 * k, 0.02]]);
      gap.setOpacity(offReach7(t) ? 0.85 : 0);
      r.row('t', 'target', fmtV(t));
      r.row('o', 'off the reach line by', fmtN(Math.abs(2 * t[0] - t[1]) / Math.sqrt(5)), offReach7(t) ? C.good : undefined);
      r.row('c', '$A\\mathbf c$', fmtV(matVec(ARM7, c)), stillCommand(c, ARM7) ? C.good : undefined);
      r.row('e', '$A\\mathbf d$', fmtV(matVec(ARM7, e)), stillCommand(e, ARM7) ? C.good : undefined);
    };
    const check = () => {
      if (offReach7([target[0], target[1]]) && !flags[0]) { flags[0] = true; p.subgoal(0); marker.setColor(C.good); }
      const both = stillCommand(c, ARM7) && stillCommand(e, ARM7);
      if (both && !flags[1]) {
        if (p7Won([target[0], target[1]], c, e) || (!flags[0] && p7Won([3, 1], c, e))) { flags[1] = true; p.subgoal(1); }
        else p.bark('lantern', 'Those two commands are one direction. Find one that is not a multiple of the other.');
      }
      if (flags[0] && flags[1] && !p.won) { sfx.success(); p.win(); }
    };
    const ic = new VectorInput({ dim: 3, values: c, label: '\\mathbf c =', step: 1, onChange: (v) => { c = v as P3; draw(); }, onSubmit: () => { p.move(); check(); } });
    const ie = new VectorInput({ dim: 3, values: e, label: '\\mathbf d =', step: 1, onChange: (v) => { e = v as P3; draw(); }, onSubmit: () => { p.move(); check(); } });
    p.dock().append(h('div', { class: 'act5-vecs act5-small' }, ic.el, ie.el), h('div', { class: 'act5-btns' }, button('Check commands', () => { p.move(); check(); }, { cls: 'small' })));
    draw();
    return {
      async showMe() {
        await marker.moveTo([3, 1, 0], 700); target = [3, 1, 0]; draw(); check();
        c = [-2, 1, 0]; ic.set(c); e = [-3, 0, 1]; ie.set(e); draw(); check();
      },
      solve() { marker.at([3, 1, 0]); target = [3, 1, 0]; c = [-2, 1, 0]; ic.set(c); e = [-3, 0, 1]; ie.set(e); draw(); check(); },
      wrong() { marker.at([2, 4, 0]); target = [2, 4, 0]; c = [-2, 1, 0]; ic.set(c); e = [-4, 2, 0]; ie.set(e); draw(); check(); },
    };
  },
};


